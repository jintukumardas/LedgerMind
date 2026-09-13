import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { blockchainClient } from '../blockchain/client.js';
import { fetchIntents, indexedBlock } from '../graph/client.js';
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
    const limit = parsed.limit || 10;
    const offset = parsed.offset || 0;

    // Default to the configured payer when no filter is given, matching the
    // previous behaviour.
    const payer =
      parsed.payer ??
      (parsed.agent ? undefined : blockchainClient.getPayerWallet().address);

    const rows = await fetchIntents({
      payer,
      agent: parsed.agent,
      state: parsed.state,
      first: limit,
      skip: offset,
    });

    const now = Math.floor(Date.now() / 1000);
    const intents: PaymentIntentInfo[] = rows.map((r) => {
      // The subgraph records Revoked authoritatively but cannot know "now",
      // so expiry is derived here.
      const expired = Number(r.endTime) <= now;
      const state =
        r.state === 'Active' && expired ? 'Expired' : r.state;

      // Contract balance = funded - spent - withdrawn.
      const balance =
        BigInt(r.toppedUp) - BigInt(r.spent) - BigInt(r.withdrawn);

      return {
        address: r.id,
        payer: r.payer.id,
        agent: r.agent.id,
        token: r.token,
        limits: {
          totalCap: r.totalCap,
          perTxCap: r.perTxCap,
          spent: r.spent,
          start: Number(r.startTime),
          end: Number(r.endTime),
        },
        state: state as 'Active' | 'Revoked' | 'Expired',
        balance: (balance > 0n ? balance : 0n).toString(),
        metadataURI: r.metadataURI,
      };
    });

    return {
      success: true,
      intents,
      total: intents.length,
      offset,
      limit,
      source: {
        indexer: 'the-graph',
        network: 'sei-atlantic',
        indexedBlock: await indexedBlock().catch(() => null),
      },
      filters: {
        payer: parsed.payer,
        agent: parsed.agent,
        state: parsed.state,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
