import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { blockchainClient } from '../blockchain/client.js';

const RevokeIntentSchema = z.object({
  intent: z.string().describe('Payment intent contract address'),
  reason: z.string().optional().describe('Reason for revoking the intent'),
});

export const revokeIntentTool: Tool = {
  name: 'revoke_intent',
  description: 'Revoke a payment intent and prevent further executions',
  inputSchema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        description: 'Payment intent contract address',
      },
      reason: {
        type: 'string',
        description: 'Reason for revoking the intent (optional)',
      },
    },
    required: ['intent'],
  },
};

export async function handleRevokeIntent(args: any): Promise<any> {
  const parsed = RevokeIntentSchema.parse(args);
  
  try {
    const intent = blockchainClient.getIntentContract(parsed.intent);
    
    // Check if the caller is the payer
    const payer = await intent.payer();
    const callerAddress = blockchainClient.getPayerWallet().address;
    
    if (payer.toLowerCase() !== callerAddress.toLowerCase()) {
      throw new Error(`Only the payer (${payer}) can revoke this intent. Caller: ${callerAddress}`);
    }
    
    // Check current state
    const state = await intent.state();
    if (state !== 0) { // 0 = Active
      const states = ['Active', 'Revoked', 'Expired'];
      throw new Error(`Intent is already ${states[state] || 'Unknown'}. Cannot revoke.`);
    }
    
    const reason = parsed.reason || 'Revoked via MCP';
    
    console.log('Revoking intent:', {
      intent: parsed.intent,
      reason,
      payer: callerAddress,
    });
    
    const tx = await intent.revoke(reason);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      reason,
      message: `Payment intent revoked successfully. Reason: ${reason}`,
    };
  } catch (error) {
    console.error('Failed to revoke payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}