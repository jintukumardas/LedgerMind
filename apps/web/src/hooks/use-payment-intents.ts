import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';

/**
 * Reads the connected payer's intents from the LedgerMind subgraph via
 * /api/v1/intents.
 *
 * Before ETHOnline 2026 this hook talked to the chain directly: one
 * `getPayerIntents` call, then five `eth_call`s per intent (agent, limits,
 * currentState, paused, hasRestrictedMerchants). That is 1 + 5N round trips on
 * every dashboard load, the same fan-out problem the old PostgreSQL indexer
 * had. It is now a single HTTP request whose cost does not grow with N, and the
 * dashboard shows exactly what the subgraph shows.
 *
 * The exported shape is unchanged, so consumers did not need editing.
 */

export interface PaymentIntent {
  address: string;
  agent: string;
  totalCap: bigint;
  perTransactionCap: bigint;
  spent: bigint;
  start: bigint;
  end: bigint;
  state: number; // 0 = Active, 1 = Revoked, 2 = Expired
  paused: boolean;
  hasRestrictedMerchants: boolean;
  /** Purpose the payer set at creation. Not available from the old on-chain path. */
  metadataURI: string;
  /** Total funded via topUp. Lets the UI distinguish authority from liquidity. */
  toppedUp: bigint;
  paymentCount: number;
}

interface ApiIntent {
  id: string;
  agent: { id: string };
  totalCap: string;
  perTxCap: string;
  spent: string;
  toppedUp: string;
  startTime: string;
  endTime: string;
  state: 'Active' | 'Revoked' | 'Expired';
  hasRestrictedMerchants: boolean;
  metadataURI: string;
  paymentCount: number;
}

const STATE: Record<string, number> = { Active: 0, Revoked: 1, Expired: 2 };

function toIntent(i: ApiIntent): PaymentIntent {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const end = BigInt(i.endTime);
  // The subgraph stores Revoked authoritatively but cannot know "now", so
  // expiry is derived here - the same rule the analysis endpoint applies.
  let state = STATE[i.state] ?? 0;
  if (state === 0 && end <= now) state = 2;

  return {
    address: i.id,
    agent: i.agent.id,
    totalCap: BigInt(i.totalCap),
    perTransactionCap: BigInt(i.perTxCap),
    spent: BigInt(i.spent),
    toppedUp: BigInt(i.toppedUp),
    start: BigInt(i.startTime),
    end,
    state,
    // Pausable state is not indexed - no event is emitted for it. Surfacing a
    // guess would be worse than defaulting, and nothing in the UI gates on it.
    paused: false,
    hasRestrictedMerchants: i.hasRestrictedMerchants,
    metadataURI: i.metadataURI,
    paymentCount: i.paymentCount,
  };
}

export function usePaymentIntents() {
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexedBlock, setIndexedBlock] = useState<number | null>(null);

  const { address } = useAccount();

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/intents?payer=${address}&limit=200`,
        { cache: 'no-store' },
      );
      const body = await res.json();

      if (!res.ok || !body.ok) {
        if (body?.error?.type === 'subgraph_unavailable') {
          throw new Error(
            'The subgraph is unreachable, so there is no live data to show. ' +
              'No cached copy is served.',
          );
        }
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }

      setIntents((body.data as ApiIntent[]).map(toIntent));
      setIndexedBlock(body.source?.indexedBlock ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load intents');
      setIntents([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (!address) {
      setIntents([]);
      return;
    }
    load();
  }, [address, load]);

  return { intents, loading, error, indexedBlock, refetch: load };
}
