'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface StoredTransaction {
  hash: string;
  type: 'creation' | 'payment' | 'funding' | 'agent_usage';
  description: string;
  timestamp: number;
  amount?: number;
  token?: string;
  from?: string;
  to?: string;
}

const STORAGE_KEY = 'ledgermind_recent_transactions';
const MAX_STORED_TRANSACTIONS = 20;

export function useRecentTransactions() {
  const [recentTransactions, setRecentTransactions] = useState<StoredTransaction[]>([]);
  const { address } = useAccount();

  // Load transactions from localStorage on mount
  useEffect(() => {
    if (!address) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
      if (stored) {
        const transactions = JSON.parse(stored);
        setRecentTransactions(transactions);
      }
    } catch (error) {
      console.error('Failed to load recent transactions:', error);
    }
  }, [address]);

  // Save transactions to localStorage
  const saveTransactions = (transactions: StoredTransaction[]) => {
    if (!address) return;
    
    try {
      // Keep only the most recent transactions
      const limited = transactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_STORED_TRANSACTIONS);
      
      localStorage.setItem(`${STORAGE_KEY}_${address.toLowerCase()}`, JSON.stringify(limited));
      setRecentTransactions(limited);
    } catch (error) {
      console.error('Failed to save recent transactions:', error);
    }
  };

  // Add a new transaction
  const addTransaction = (transaction: Omit<StoredTransaction, 'timestamp'>) => {
    const newTransaction: StoredTransaction = {
      ...transaction,
      timestamp: Date.now(),
    };

    const updated = [newTransaction, ...recentTransactions];
    saveTransactions(updated);
  };

  // Update transaction status (useful for pending -> confirmed)
  const updateTransaction = (hash: string, updates: Partial<StoredTransaction>) => {
    const updated = recentTransactions.map(tx => 
      tx.hash === hash ? { ...tx, ...updates } : tx
    );
    saveTransactions(updated);
  };

  // Remove old transactions
  const cleanOldTransactions = () => {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const filtered = recentTransactions.filter(tx => tx.timestamp > oneWeekAgo);
    saveTransactions(filtered);
  };

  // Get formatted transactions for display
  const getFormattedTransactions = () => {
    return recentTransactions.map(tx => ({
      id: tx.hash,
      hash: tx.hash,
      type: tx.type,
      status: 'confirmed' as const,
      amount: tx.amount || 0,
      token: tx.token || 'SEI',
      from: tx.from || '',
      to: tx.to || '',
      timestamp: new Date(tx.timestamp),
      description: tx.description,
      gasUsed: 0,
      blockNumber: 0,
      isVerified: true,
      confirmations: 1,
    }));
  };

  return {
    recentTransactions,
    addTransaction,
    updateTransaction,
    cleanOldTransactions,
    getFormattedTransactions,
  };
}