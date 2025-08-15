import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { blockchainClient } from '../blockchain/client.js';

const TopUpIntentSchema = z.object({
  intent: z.string().describe('Payment intent contract address'),
  amount: z.string().describe('Amount to add in wei'),
});

export const topUpIntentTool: Tool = {
  name: 'top_up_intent',
  description: 'Add more funds to an existing payment intent',
  inputSchema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        description: 'Payment intent contract address',
      },
      amount: {
        type: 'string', 
        description: 'Amount to add in wei',
      },
    },
    required: ['intent', 'amount'],
  },
};

export async function handleTopUpIntent(args: any): Promise<any> {
  const parsed = TopUpIntentSchema.parse(args);
  
  try {
    const intent = blockchainClient.getIntentContract(parsed.intent);
    
    // Check if the caller is the payer
    const payer = await intent.payer();
    const callerAddress = blockchainClient.getPayerWallet().address;
    
    if (payer.toLowerCase() !== callerAddress.toLowerCase()) {
      throw new Error(`Only the payer (${payer}) can top up this intent. Caller: ${callerAddress}`);
    }
    
    // Check intent state
    const state = await intent.state();
    if (state !== 0) { // 0 = Active
      const states = ['Active', 'Revoked', 'Expired'];
      throw new Error(`Cannot top up intent in ${states[state] || 'Unknown'} state. Only Active intents can be topped up.`);
    }
    
    // Get token contract
    const tokenAddress = await intent.token();
    const token = blockchainClient.getTokenContract(tokenAddress);
    
    const topUpAmount = BigInt(parsed.amount);
    
    // Check allowance
    const allowance = await token.allowance(callerAddress, parsed.intent);
    
    if (allowance < topUpAmount) {
      // Approve token spending
      console.log(`Approving ${blockchainClient.formatUnits(topUpAmount)} tokens for intent`);
      const approveTx = await token.approve(parsed.intent, topUpAmount);
      await approveTx.wait();
    }
    
    console.log('Topping up intent:', {
      intent: parsed.intent,
      amount: blockchainClient.formatUnits(topUpAmount),
      payer: callerAddress,
    });
    
    // Top up the intent
    const tx = await intent.topUp(topUpAmount);
    const receipt = await tx.wait();
    
    // Get updated balance
    const newBalance = await intent.getBalance();
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      topUpAmount: parsed.amount,
      newBalance: newBalance.toString(),
      message: `Intent topped up successfully with ${blockchainClient.formatUnits(topUpAmount)} tokens. New balance: ${blockchainClient.formatUnits(newBalance)} tokens`,
    };
  } catch (error) {
    console.error('Failed to top up payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}