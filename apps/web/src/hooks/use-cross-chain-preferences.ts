'use client';

import { useState, useEffect } from 'react';
import { TransactionPreference } from '@/lib/lifi';

interface CrossChainPreferences extends TransactionPreference {
  autoApprove: boolean;
  maxAutoApprovalAmount: string; // in USD
  enableCrossChain: boolean;
}

const DEFAULT_PREFERENCES: CrossChainPreferences = {
  priority: 'balanced',
  maxSlippage: 0.03, // 3%
  allowSwitchChain: true,
  autoApprove: false,
  maxAutoApprovalAmount: '10', // $10 USD max auto-approval
  enableCrossChain: true,
};

const STORAGE_KEY = 'ledgermind_crosschain_preferences';

export function useCrossChainPreferences() {
  const [preferences, setPreferences] = useState<CrossChainPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedPreferences = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsedPreferences });
      }
    } catch (error) {
      console.error('Failed to load cross-chain preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save preferences to localStorage
  const updatePreferences = (newPreferences: Partial<CrossChainPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save cross-chain preferences:', error);
    }
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    } catch (error) {
      console.error('Failed to reset cross-chain preferences:', error);
    }
  };

  const shouldAutoApprove = (amountUSD: number): boolean => {
    if (!preferences.autoApprove || !preferences.enableCrossChain) {
      return false;
    }
    
    const maxAmount = parseFloat(preferences.maxAutoApprovalAmount);
    return amountUSD <= maxAmount;
  };

  const getPriorityLabel = (priority: TransactionPreference['priority']): string => {
    switch (priority) {
      case 'fastest':
        return 'Fastest Route (Higher Fees)';
      case 'cheapest':
        return 'Cheapest Route (Slower)';
      case 'balanced':
      default:
        return 'Balanced (Recommended)';
    }
  };

  const getSlippageLabel = (slippage?: number): string => {
    if (!slippage) return 'Default (3%)';
    const percentage = (slippage * 100).toFixed(1);
    return `${percentage}%`;
  };

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    shouldAutoApprove,
    getPriorityLabel,
    getSlippageLabel,
    isLoading,
  };
}