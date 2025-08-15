import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { blockchainClient } from '../blockchain/client.js';
import { ipfsService } from '../services/ipfs.js';
import { ReceiptBlob } from '../types/index.js';
import { config } from '../config.js';

const ExecutePaymentSchema = z.object({
  intent: z.string().describe('Payment intent contract address'),
  merchant: z.string().describe('Merchant address to pay'),
  amount: z.string().describe('Payment amount in wei'),
  receipt_blob: z.object({
    tool: z.string(),
    inputHash: z.string(),
    outputHash: z.string(),
    signer: z.string(),
    nonce: z.string(),
    cost: z.string().optional(),
    timestamp: z.number(),
    chainId: z.number(),
    txHash: z.string().optional(),
    context: z.any().optional(),
  }).describe('MCP action transcript to hash and store'),
});

export const executePaymentTool: Tool = {
  name: 'execute_payment',
  description: 'Execute a payment from an intent to a merchant within limits',
  inputSchema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        description: 'Payment intent contract address',
      },
      merchant: {
        type: 'string',
        description: 'Merchant address to pay',
      },
      amount: {
        type: 'string',
        description: 'Payment amount in wei',
      },
      receipt_blob: {
        type: 'object',
        description: 'MCP action transcript to hash and store',
        properties: {
          tool: { type: 'string' },
          inputHash: { type: 'string' },
          outputHash: { type: 'string' },
          signer: { type: 'string' },
          nonce: { type: 'string' },
          cost: { type: 'string' },
          timestamp: { type: 'number' },
          chainId: { type: 'number' },
          txHash: { type: 'string' },
          context: {},
        },
        required: ['tool', 'inputHash', 'outputHash', 'signer', 'nonce', 'timestamp', 'chainId'],
      },
    },
    required: ['intent', 'merchant', 'amount', 'receipt_blob'],
  },
};

export async function handleExecutePayment(args: any): Promise<any> {
  const parsed = ExecutePaymentSchema.parse(args);
  
  try {
    const agentWallet = blockchainClient.getAgentWallet();
    if (!agentWallet) {
      throw new Error('Agent wallet not configured. Set PRIVATE_KEY_AGENT environment variable.');
    }
    
    // Get intent contract with agent wallet
    const intent = blockchainClient.getIntentContract(parsed.intent, agentWallet);
    
    // Verify agent is authorized
    const intentAgent = await intent.agent();
    if (intentAgent.toLowerCase() !== agentWallet.address.toLowerCase()) {
      throw new Error(`Agent ${agentWallet.address} is not authorized for this intent. Expected: ${intentAgent}`);
    }
    
    // Check intent state
    const state = await intent.state();
    if (state !== 0) { // 0 = Active
      const states = ['Active', 'Revoked', 'Expired'];
      throw new Error(`Intent is not active. Current state: ${states[state] || 'Unknown'}`);
    }
    
    // Prepare receipt blob
    const receiptBlob: ReceiptBlob = {
      ...parsed.receipt_blob,
      chainId: config.chainId,
      timestamp: Math.floor(Date.now() / 1000),
    };
    
    // Hash and store receipt
    const { hash: receiptHash, uri: receiptURI } = await ipfsService.pinReceipt(receiptBlob);
    
    console.log('Executing payment:', {
      intent: parsed.intent,
      merchant: parsed.merchant,
      amount: blockchainClient.formatUnits(BigInt(parsed.amount)),
      receiptHash,
      receiptURI,
    });
    
    // Execute the payment
    const tx = await intent.execute(
      parsed.merchant,
      BigInt(parsed.amount),
      receiptHash,
      receiptURI
    );
    
    const receipt = await tx.wait();
    
    // Update receipt blob with transaction hash
    receiptBlob.txHash = tx.hash;
    await ipfsService.pinReceipt(receiptBlob); // Re-pin with txHash
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      receiptHash,
      receiptURI,
      amount: parsed.amount,
      merchant: parsed.merchant,
      message: `Payment executed successfully: ${blockchainClient.formatUnits(BigInt(parsed.amount))} tokens to ${parsed.merchant}`,
    };
  } catch (error) {
    console.error('Failed to execute payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}