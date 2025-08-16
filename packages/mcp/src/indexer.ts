import { ethers } from 'ethers';
import { blockchainClient, FACTORY_ABI, INTENT_ABI } from './blockchain/client.js';
import { dbClient } from './database/client.js';
import { config } from './config.js';

// Simple logger for indexer
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`)
};

export class EventIndexer {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  
  constructor() {
    // Bind methods to preserve context
    this.processEvents = this.processEvents.bind(this);
    this.stop = this.stop.bind(this);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Indexer is already running');
      return;
    }

    console.log('Starting event indexer...');
    
    try {
      await dbClient.initialize();
      this.isRunning = true;
      
      // Process events immediately
      await this.processEvents();
      
      // Then process every 10 seconds
      this.intervalId = setInterval(this.processEvents, 10000);
      
      console.log('Event indexer started successfully');
    } catch (error) {
      console.error('Failed to start indexer:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping event indexer...');
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log('Event indexer stopped');
  }

  private async processEvents(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      const provider = blockchainClient.getProvider();
      const currentBlock = await provider.getBlockNumber();
      const lastProcessed = await dbClient.getLastProcessedBlock();
      
      // Start from last processed block + 1, or from block where factory was deployed
      const fromBlock = Math.max(lastProcessed + 1, currentBlock - 1000); // Limit to last 1000 blocks
      const toBlock = currentBlock;
      
      if (fromBlock > toBlock) {
        return; // No new blocks to process
      }

      console.log(`Processing blocks ${fromBlock} to ${toBlock}`);

      // Get factory contract for parsing logs
      const factory = blockchainClient.getFactoryContract();

      // Process IntentCreated events
      await this.processIntentCreatedEvents(factory, fromBlock, toBlock);

      // Process all intent events (we need to query all known intents)
      await this.processIntentEvents(fromBlock, toBlock);

      // Update last processed block
      await dbClient.updateLastProcessedBlock(toBlock);

    } catch (error) {
      console.error('Error processing events:', error);
    }
  }

  private async processIntentCreatedEvents(
    factory: ethers.Contract, 
    fromBlock: number, 
    toBlock: number
  ): Promise<void> {
    try {
      const filter = factory.filters.IntentCreated();
      const logs = await factory.queryFilter(filter, fromBlock, toBlock);

      for (const log of logs) {
        try {
          const event = factory.interface.parseLog(log);
          if (!event) {
            logger.warn('Failed to parse log event');
            continue;
          }
          const { payer, intent, agent, salt } = event.args;

          // Get intent details
          const intentContract = blockchainClient.getIntentContract(intent);
          const [token, limits, metadataURI] = await Promise.all([
            intentContract.token(),
            intentContract.limits(), 
            intentContract.metadataURI().catch(() => ''), // May not exist
          ]);

          // Get block info
          const block = await blockchainClient.getBlock(log.blockNumber);

          await dbClient.insertIntent({
            address: intent,
            payer,
            agent,
            token,
            totalCap: limits.totalCap.toString(),
            perTxCap: limits.perTxCap.toString(),
            startTime: Number(limits.start),
            endTime: Number(limits.end),
            metadataURI,
            salt,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });

          // Get allowed merchants
          // Note: This requires querying merchant events or checking allowlist
          // For now, we'll handle merchants when they're updated via events

          console.log(`Indexed intent created: ${intent}`);

        } catch (error) {
          console.error(`Error processing IntentCreated event in tx ${log.transactionHash}:`, error);
        }
      }
    } catch (error) {
      console.error('Error querying IntentCreated events:', error);
    }
  }

  private async processIntentEvents(fromBlock: number, toBlock: number): Promise<void> {
    // Get all known intents from database
    const allIntents = await this.getAllKnownIntents();
    
    for (const intentAddress of allIntents) {
      try {
        await this.processIntentEventsByAddress(intentAddress, fromBlock, toBlock);
      } catch (error) {
        console.error(`Error processing events for intent ${intentAddress}:`, error);
      }
    }
  }

  private async getAllKnownIntents(): Promise<string[]> {
    try {
      const result = await dbClient.query('SELECT address FROM intents');
      return result.rows.map((row: any) => row.address);
    } catch (error) {
      console.error('Error getting known intents:', error);
      return [];
    }
  }

  private async processIntentEventsByAddress(
    intentAddress: string, 
    fromBlock: number, 
    toBlock: number
  ): Promise<void> {
    const intentContract = blockchainClient.getIntentContract(intentAddress);
    
    try {
      // Process Executed events
      const executedFilter = intentContract.filters.Executed();
      const executedLogs = await intentContract.queryFilter(executedFilter, fromBlock, toBlock);
      
      for (const log of executedLogs) {
        try {
          const event = intentContract.interface.parseLog(log);
          if (!event) {
            logger.warn('Failed to parse executed event log');
            continue;
          }
          const { agent, merchant, token, amount, receiptHash, receiptURI } = event.args;
          
          const block = await blockchainClient.getBlock(log.blockNumber);
          const tx = await blockchainClient.getProvider().getTransaction(log.transactionHash);
          const receipt = await blockchainClient.waitForTransaction(log.transactionHash);

          await dbClient.insertReceipt({
            intentAddress,
            txHash: log.transactionHash,
            merchant,
            amount: amount.toString(),
            token,
            receiptHash,
            receiptURI,
            timestamp: block.timestamp,
            blockNumber: log.blockNumber,
            gasUsed: receipt?.gasUsed ? Number(receipt.gasUsed) : undefined,
          });

          // Update spent amount in intent
          const limits = await intentContract.limits();
          await dbClient.updateIntentSpent(intentAddress, limits.spent.toString());

          console.log(`Indexed payment: ${blockchainClient.formatUnits(amount)} to ${merchant}`);

        } catch (error) {
          console.error(`Error processing Executed event in tx ${log.transactionHash}:`, error);
        }
      }

      // Process Revoked events
      const revokedFilter = intentContract.filters.Revoked();
      const revokedLogs = await intentContract.queryFilter(revokedFilter, fromBlock, toBlock);
      
      for (const log of revokedLogs) {
        try {
          const event = intentContract.interface.parseLog(log);
          if (!event) {
            logger.warn('Failed to parse revoked event log');
            continue;
          }
          const { by, reason } = event.args;
          
          const block = await blockchainClient.getBlock(log.blockNumber);

          await dbClient.insertRevocation({
            intentAddress,
            revokedBy: by,
            reason,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: block.timestamp,
          });

          console.log(`Indexed revocation: ${intentAddress} by ${by}`);

        } catch (error) {
          console.error(`Error processing Revoked event in tx ${log.transactionHash}:`, error);
        }
      }

      // Process ToppedUp events
      const toppedUpFilter = intentContract.filters.ToppedUp();
      const toppedUpLogs = await intentContract.queryFilter(toppedUpFilter, fromBlock, toBlock);
      
      for (const log of toppedUpLogs) {
        try {
          const event = intentContract.interface.parseLog(log);
          if (!event) {
            logger.warn('Failed to parse topped up event log');
            continue;
          }
          const { 0: amount } = event.args; // ToppedUp(uint256 amount)
          
          const block = await blockchainClient.getBlock(log.blockNumber);

          await dbClient.insertTopUp({
            intentAddress,
            amount: amount.toString(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: block.timestamp,
          });

          console.log(`Indexed top-up: ${blockchainClient.formatUnits(amount)} for ${intentAddress}`);

        } catch (error) {
          console.error(`Error processing ToppedUp event in tx ${log.transactionHash}:`, error);
        }
      }

      // Process Withdrawn events
      const withdrawnFilter = intentContract.filters.Withdrawn();
      const withdrawnLogs = await intentContract.queryFilter(withdrawnFilter, fromBlock, toBlock);
      
      for (const log of withdrawnLogs) {
        try {
          const event = intentContract.interface.parseLog(log);
          if (!event) {
            logger.warn('Failed to parse withdrawn event log');
            continue;
          }
          const { to, amount } = event.args;
          
          const block = await blockchainClient.getBlock(log.blockNumber);

          await dbClient.insertWithdrawal({
            intentAddress,
            toAddress: to,
            amount: amount.toString(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: block.timestamp,
          });

          console.log(`Indexed withdrawal: ${blockchainClient.formatUnits(amount)} to ${to}`);

        } catch (error) {
          console.error(`Error processing Withdrawn event in tx ${log.transactionHash}:`, error);
        }
      }

    } catch (error) {
      console.error(`Error querying events for intent ${intentAddress}:`, error);
    }
  }
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const indexer = new EventIndexer();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await indexer.stop();
    await dbClient.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await indexer.stop();
    await dbClient.close();
    process.exit(0);
  });

  // Start indexer
  indexer.start().catch((error) => {
    console.error('Failed to start indexer:', error);
    process.exit(1);
  });
}