'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ipfsService } from '@/lib/ipfs';
import { BlockchainTransaction } from './use-transaction-history';

interface CachedTransactionData {
  version: string;
  userAddress: string;
  transactions: BlockchainTransaction[];
  lastUpdated: number;
  totalCount: number;
  cacheExpiry: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'ledgermind_tx_cache_hash';

export function useTransactionCache() {
  const [cachedTransactions, setCachedTransactions] = useState<BlockchainTransaction[]>([]);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [cacheError, setCacheError] = useState<string | null>(null);
  const [lastCacheUpdate, setLastCacheUpdate] = useState<number>(0);
  
  const { address } = useAccount();

  // Get cached transactions for current user
  const loadCachedTransactions = async (): Promise<BlockchainTransaction[]> => {
    if (!address) return [];

    setIsLoadingCache(true);
    setCacheError(null);

    try {
      // First, check localStorage for cache hash
      const cacheHashKey = `${STORAGE_KEY}_${address.toLowerCase()}`;
      const cacheHash = localStorage.getItem(cacheHashKey);
      
      if (!cacheHash) {
        console.log('No IPFS cache hash found for user');
        return [];
      }

      // Try to load from IPFS
      const cachedData: CachedTransactionData = await ipfsService.downloadFromIPFS(cacheHash);
      
      // Validate cache data
      if (!cachedData || cachedData.userAddress.toLowerCase() !== address.toLowerCase()) {
        console.log('Invalid cache data for user');
        return [];
      }

      // Check if cache is still valid
      const now = Date.now();
      if (now > cachedData.cacheExpiry) {
        console.log('Cache expired, will fetch fresh data');
        return [];
      }

      console.log(`Loaded ${cachedData.transactions.length} cached transactions from IPFS`);
      setCachedTransactions(cachedData.transactions);
      setLastCacheUpdate(cachedData.lastUpdated);
      
      return cachedData.transactions;

    } catch (error) {
      console.error('Failed to load cached transactions:', error);
      setCacheError(error instanceof Error ? error.message : 'Cache load failed');
      return [];
    } finally {
      setIsLoadingCache(false);
    }
  };

  // Save transactions to IPFS cache
  const saveTransactionsToCache = async (transactions: BlockchainTransaction[]): Promise<void> => {
    if (!address || transactions.length === 0) return;

    try {
      const now = Date.now();
      const cacheData: CachedTransactionData = {
        version: '1.0',
        userAddress: address,
        transactions,
        lastUpdated: now,
        totalCount: transactions.length,
        cacheExpiry: now + CACHE_DURATION,
      };

      // Upload to IPFS
      const ipfsHash = await ipfsService.uploadToIPFS(cacheData);
      
      // Store the hash in localStorage for quick access
      const cacheHashKey = `${STORAGE_KEY}_${address.toLowerCase()}`;
      localStorage.setItem(cacheHashKey, ipfsHash);
      
      setCachedTransactions(transactions);
      setLastCacheUpdate(now);
      
      console.log(`Saved ${transactions.length} transactions to IPFS cache:`, ipfsHash);
      
    } catch (error) {
      console.error('Failed to save transactions to cache:', error);
      setCacheError(error instanceof Error ? error.message : 'Cache save failed');
    }
  };

  // Check if cache is valid and recent
  const isCacheValid = (): boolean => {
    if (cachedTransactions.length === 0) return false;
    
    const now = Date.now();
    const cacheAge = now - lastCacheUpdate;
    
    return cacheAge < CACHE_DURATION;
  };

  // Update cache with new transaction
  const addTransactionToCache = async (transaction: BlockchainTransaction): Promise<void> => {
    const updatedTransactions = [transaction, ...cachedTransactions]
      .filter((tx, index, self) => index === self.findIndex(t => t.hash === tx.hash))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50); // Keep only last 50 transactions

    await saveTransactionsToCache(updatedTransactions);
  };

  // Clear cache for current user
  const clearCache = async (): Promise<void> => {
    if (!address) return;

    try {
      const cacheHashKey = `${STORAGE_KEY}_${address.toLowerCase()}`;
      const cacheHash = localStorage.getItem(cacheHashKey);
      
      if (cacheHash) {
        // Optionally delete from IPFS (currently just removes local reference)
        await ipfsService.deleteFile(cacheHash);
        localStorage.removeItem(cacheHashKey);
      }

      setCachedTransactions([]);
      setLastCacheUpdate(0);
      setCacheError(null);
      
      console.log('Cache cleared for user');
      
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  // Get cache stats
  const getCacheStats = () => {
    const now = Date.now();
    const cacheAge = lastCacheUpdate > 0 ? now - lastCacheUpdate : 0;
    const isValid = isCacheValid();
    const remainingTime = isValid ? CACHE_DURATION - cacheAge : 0;

    return {
      transactionCount: cachedTransactions.length,
      cacheAge,
      isValid,
      remainingTime,
      lastUpdate: lastCacheUpdate > 0 ? new Date(lastCacheUpdate) : null,
      isUsingIPFS: ipfsService.isUsingRealIPFS(),
    };
  };

  // Load cache on address change
  useEffect(() => {
    if (address) {
      loadCachedTransactions();
    } else {
      setCachedTransactions([]);
      setLastCacheUpdate(0);
      setCacheError(null);
    }
  }, [address]);

  return {
    cachedTransactions,
    isLoadingCache,
    cacheError,
    lastCacheUpdate,
    loadCachedTransactions,
    saveTransactionsToCache,
    addTransactionToCache,
    clearCache,
    isCacheValid,
    getCacheStats,
  };
}