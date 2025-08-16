import { useEffect, useState, useCallback } from 'react';
import { useAccount, usePublicClient, useChainId } from 'wagmi';
import { getContract } from 'viem';

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;

const FACTORY_ABI = [
  {
    "inputs": [{"name": "payer", "type": "address"}],
    "name": "getPayerIntents",
    "outputs": [{"name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const INTENT_ABI = [
  {
    "inputs": [],
    "name": "agent",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "limits",
    "outputs": [
      {"name": "totalCap", "type": "uint256"},
      {"name": "perTxCap", "type": "uint256"},
      {"name": "spent", "type": "uint256"},
      {"name": "start", "type": "uint64"},
      {"name": "end", "type": "uint64"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "state",
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentState",
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export interface PaymentIntent {
  address: string;
  agent: string;
  totalCap: bigint;
  perTransactionCap: bigint;
  spent: bigint;
  start: bigint;
  end: bigint;
  state: number; // 0 = Active, 1 = Revoked, 2 = Expired
}

export function usePaymentIntents() {
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { address } = useAccount();
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!address || !publicClient || !FACTORY_ADDRESS) {
      console.log('Missing requirements:', { address, publicClient: !!publicClient, FACTORY_ADDRESS });
      return;
    }

    const fetchIntents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching intents for address:', address);
        console.log('Factory address:', FACTORY_ADDRESS);
        
        // Get factory contract
        const factory = getContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          client: publicClient,
        });

        // Get intent addresses for this payer
        const intentAddresses = await factory.read.getPayerIntents([address]);
        console.log('Found intent addresses:', intentAddresses);
        
        if (intentAddresses.length === 0) {
          setIntents([]);
          setLoading(false);
          return;
        }
        
        // Fetch details for each intent
        const intentPromises = intentAddresses.map(async (intentAddress) => {
          console.log('Fetching details for intent:', intentAddress);
          const intent = getContract({
            address: intentAddress,
            abi: INTENT_ABI,
            client: publicClient,
          });

          const [agent, limits, state] = await Promise.all([
            intent.read.agent(),
            intent.read.limits(),
            intent.read.currentState(),
          ]);

          return {
            address: intentAddress,
            agent,
            totalCap: limits[0],
            perTransactionCap: limits[1],
            spent: limits[2],
            start: limits[3],
            end: limits[4],
            state: Number(state),
          };
        });

        const intentDetails = await Promise.all(intentPromises);
        console.log('Intent details:', intentDetails);
        setIntents(intentDetails);
      } catch (err) {
        console.error('Failed to fetch payment intents:', err);
        setError(`Failed to load payment intents: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchIntents();
  }, [address, publicClient]);

  const refetch = useCallback(() => {
    if (!address || !publicClient || !FACTORY_ADDRESS) {
      return;
    }

    const fetchIntents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Refetching intents for address:', address);
        
        const factory = getContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          client: publicClient,
        });

        const intentAddresses = await factory.read.getPayerIntents([address]);
        
        if (intentAddresses.length === 0) {
          setIntents([]);
          setLoading(false);
          return;
        }
        
        const intentPromises = intentAddresses.map(async (intentAddress) => {
          const intent = getContract({
            address: intentAddress,
            abi: INTENT_ABI,
            client: publicClient,
          });

          const [agent, limits, state] = await Promise.all([
            intent.read.agent(),
            intent.read.limits(),
            intent.read.currentState(),
          ]);

          return {
            address: intentAddress,
            agent,
            totalCap: limits[0],
            perTransactionCap: limits[1],
            spent: limits[2],
            start: limits[3],
            end: limits[4],
            state: Number(state),
          };
        });

        const intentDetails = await Promise.all(intentPromises);
        setIntents(intentDetails);
      } catch (err) {
        console.error('Failed to refetch payment intents:', err);
        setError(`Failed to reload payment intents: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchIntents();
  }, [address, publicClient]);

  return {
    intents,
    loading,
    error,
    refetch,
  };
}