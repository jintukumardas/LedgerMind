import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { blockchainClient } from '../blockchain/client.js';
import { PaymentIntentInfo } from '../types/index.js';

const ListIntentsSchema = z.object({
  payer: z.string().optional().describe('Filter by payer address'),
  agent: z.string().optional().describe('Filter by agent address'), 
  state: z.enum(['Active', 'Revoked', 'Expired']).optional().describe('Filter by intent state'),
  limit: z.number().optional().describe('Maximum number of intents to return'),
  offset: z.number().optional().describe('Offset for pagination'),
});

export const listIntentsTool: Tool = {
  name: 'list_intents',
  description: 'List payment intents with optional filters',
  inputSchema: {
    type: 'object',
    properties: {
      payer: {
        type: 'string',
        description: 'Filter by payer address (optional)',
      },
      agent: {
        type: 'string', 
        description: 'Filter by agent address (optional)',
      },
      state: {
        type: 'string',
        enum: ['Active', 'Revoked', 'Expired'],
        description: 'Filter by intent state (optional)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of intents to return (optional, default: 10)',
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination (optional, default: 0)',
      },
    },
  },
};

export async function handleListIntents(args: any): Promise<any> {
  const parsed = ListIntentsSchema.parse(args);
  
  try {
    const factory = blockchainClient.getFactoryContract();
    const limit = parsed.limit || 10;
    const offset = parsed.offset || 0;
    
    let intentAddresses: string[] = [];
    
    if (parsed.payer) {
      // Get intents for specific payer
      const allIntents = await factory.getPayerIntents(parsed.payer);
      intentAddresses = allIntents.slice(offset, offset + limit);
    } else if (parsed.agent) {
      // Get intents for specific agent
      const allIntents = await factory.getAgentIntents(parsed.agent);
      intentAddresses = allIntents.slice(offset, offset + limit);
    } else {
      // Get all intents for the current payer
      const payerAddress = blockchainClient.getPayerWallet().address;
      const allIntents = await factory.getPayerIntents(payerAddress);
      intentAddresses = allIntents.slice(offset, offset + limit);
    }
    
    const intents: PaymentIntentInfo[] = [];
    
    for (const address of intentAddresses) {
      try {
        const intentInfo = await getIntentInfo(address);
        
        // Filter by state if specified
        if (parsed.state && intentInfo.state !== parsed.state) {
          continue;
        }
        
        intents.push(intentInfo);
      } catch (error) {
        console.warn(`Failed to fetch info for intent ${address}:`, error);
      }
    }
    
    return {
      success: true,
      intents,
      total: intents.length,
      offset,
      limit,
      filters: {
        payer: parsed.payer,
        agent: parsed.agent,
        state: parsed.state,
      },
    };
  } catch (error) {
    console.error('Failed to list payment intents:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

async function getIntentInfo(address: string): Promise<PaymentIntentInfo> {
  const intent = blockchainClient.getIntentContract(address);
  
  const [payer, agent, token, limits, state, balance] = await Promise.all([
    intent.payer(),
    intent.agent(),
    intent.token(),
    intent.limits(),
    intent.state(),
    intent.getBalance(),
  ]);
  
  const states = ['Active', 'Revoked', 'Expired'];
  
  // Try to get metadata URI - this might not be available on all contracts
  let metadataURI = '';
  try {
    metadataURI = await intent.metadataURI();
  } catch {
    // Metadata URI not available
  }
  
  return {
    address,
    payer,
    agent,
    token,
    limits: {
      totalCap: limits.totalCap.toString(),
      perTxCap: limits.perTxCap.toString(),
      spent: limits.spent.toString(),
      start: Number(limits.start),
      end: Number(limits.end),
    },
    state: states[state] as 'Active' | 'Revoked' | 'Expired',
    balance: balance.toString(),
    metadataURI,
  };
}