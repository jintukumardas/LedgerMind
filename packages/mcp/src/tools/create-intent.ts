import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { blockchainClient } from '../blockchain/client.js';
import { config } from '../config.js';

const CreateIntentSchema = z.object({
  token: z.string().describe('ERC-20 token address (e.g., USDC)'),
  agent: z.string().describe('Agent address allowed to spend'),
  total_cap: z.string().describe('Maximum total spending amount in wei'),
  per_tx_cap: z.string().describe('Maximum per-transaction spending amount in wei'),
  start: z.number().describe('Start time as Unix timestamp'),
  end: z.number().describe('End time as Unix timestamp'),
  merchants: z.array(z.string()).optional().describe('Array of allowed merchant addresses'),
  metadata_uri: z.string().optional().describe('IPFS URI for intent metadata'),
  salt: z.string().describe('Salt for CREATE2 address generation'),
  deposit_amount: z.string().optional().describe('Initial deposit amount in wei (defaults to 1 USDC if not provided)'),
});

export const createIntentTool: Tool = {
  name: 'create_intent',
  description: 'Create a new on-chain Payment Intent on Sei EVM and deposit funds',
  inputSchema: {
    type: 'object',
    properties: {
      token: {
        type: 'string',
        description: 'ERC-20 token address (e.g., USDC)',
      },
      agent: {
        type: 'string',
        description: 'Agent address allowed to spend',
      },
      total_cap: {
        type: 'string',
        description: 'Maximum total spending amount in wei',
      },
      per_tx_cap: {
        type: 'string',
        description: 'Maximum per-transaction spending amount in wei',
      },
      start: {
        type: 'number',
        description: 'Start time as Unix timestamp',
      },
      end: {
        type: 'number',
        description: 'End time as Unix timestamp',
      },
      merchants: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of allowed merchant addresses (optional)',
      },
      metadata_uri: {
        type: 'string',
        description: 'IPFS URI for intent metadata (optional)',
      },
      salt: {
        type: 'string',
        description: 'Salt for CREATE2 address generation',
      },
      deposit_amount: {
        type: 'string',
        description: 'Initial deposit amount in wei (defaults to 1 USDC if not provided)',
      },
    },
    required: ['token', 'agent', 'total_cap', 'per_tx_cap', 'start', 'end', 'salt'],
  },
};

export async function handleCreateIntent(args: any): Promise<any> {
  const parsed = CreateIntentSchema.parse(args);
  
  try {
    const factory = blockchainClient.getFactoryContract();
    const token = blockchainClient.getTokenContract(parsed.token);
    
    // Auto-fund with 1 USDC (1000000 wei for 6 decimals) if deposit_amount is not provided or is 0
    const defaultDepositAmount = '1000000'; // 1 USDC in wei (6 decimals)
    const depositAmountString = parsed.deposit_amount && parsed.deposit_amount !== '0' ? parsed.deposit_amount : defaultDepositAmount;
    const depositAmount = BigInt(depositAmountString);
    
    console.log(`Auto-funding enabled: Using ${blockchainClient.formatUnits(depositAmount)} USDC for initial deposit`);
    
    // Check token balance first
    const payer = blockchainClient.getPayerWallet();
    const balance = await token.balanceOf(payer.address);
    
    if (balance < depositAmount) {
      return {
        success: false,
        error: `Insufficient balance for auto-funding. Required: ${blockchainClient.formatUnits(depositAmount)} tokens, Available: ${blockchainClient.formatUnits(balance)} tokens`,
      };
    }
    
    // Check token allowance
    const allowance = await token.allowance(payer.address, config.factoryAddress);
    
    if (allowance < depositAmount) {
      // Approve token spending
      console.log(`Approving ${blockchainClient.formatUnits(depositAmount)} tokens for factory`);
      const approveTx = await token.approve(config.factoryAddress, depositAmount);
      await approveTx.wait();
    }
    
    // Create the payment intent
    const params = {
      token: parsed.token,
      agent: parsed.agent,
      totalCap: BigInt(parsed.total_cap),
      perTxCap: BigInt(parsed.per_tx_cap),
      start: BigInt(parsed.start),
      end: BigInt(parsed.end),
      merchants: parsed.merchants || [],
      metadataURI: parsed.metadata_uri || '',
      salt: blockchainClient.keccak256(parsed.salt),
    };
    
    console.log('Creating payment intent with params:', {
      ...params,
      totalCap: params.totalCap.toString(),
      perTxCap: params.perTxCap.toString(),
    });
    
    const tx = await factory.createIntent(params);
    const receipt = await tx.wait();
    
    // Extract the intent address from logs
    const intentCreatedEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === 'IntentCreated';
      } catch {
        return false;
      }
    });
    
    let intentAddress = '';
    if (intentCreatedEvent) {
      const parsedEvent = factory.interface.parseLog(intentCreatedEvent);
      intentAddress = parsedEvent?.args.intent;
    }
    
    // Fund the intent with initial deposit
    if (intentAddress && depositAmount > 0n) {
      console.log(`Funding intent ${intentAddress} with ${blockchainClient.formatUnits(depositAmount)} tokens`);
      const fundTx = await token.transfer(intentAddress, depositAmount);
      await fundTx.wait();
    }
    
    return {
      success: true,
      intentAddress,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      depositAmount: depositAmountString,
      autoFunded: !parsed.deposit_amount || parsed.deposit_amount === '0',
      message: `Payment intent created successfully at ${intentAddress}${(!parsed.deposit_amount || parsed.deposit_amount === '0') ? ' and auto-funded with 1 USDC' : ''}`,
    };
  } catch (error) {
    console.error('Failed to create payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}