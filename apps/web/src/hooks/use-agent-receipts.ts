'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ipfsService } from '@/lib/ipfs';

export interface AgentDecision {
  id: string;
  timestamp: Date;
  type: 'transaction' | 'analysis' | 'route_selection' | 'approval_request';
  description: string;
  context: {
    userPrompt: string;
    agentReasoning: string;
    alternatives?: Array<{
      option: string;
      reason: string;
      cost?: string;
    }>;
  };
  outcome: {
    action: string;
    parameters: Record<string, any>;
    success: boolean;
    error?: string;
  };
  metadata: {
    confidence: number; // 0-1
    executionTime: number; // ms
    gasUsed?: string;
    crossChain?: boolean;
    chains?: number[];
  };
}

export interface AgentReceipt {
  id: string;
  sessionId: string;
  timestamp: Date;
  totalCost: string; // USD
  transactions: Array<{
    hash: string;
    type: 'payment' | 'cross_chain' | 'approval';
    amount: string;
    token: string;
    chain: number;
    recipient: string;
    status: 'pending' | 'confirmed' | 'failed';
  }>;
  decisions: AgentDecision[];
  summary: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    averageDecisionTime: number;
    totalGasUsed: string;
  };
  ipfsHash?: string;
}

const STORAGE_KEY = 'ledgermind_agent_receipts';
const MAX_LOCAL_RECEIPTS = 50;

export function useAgentReceipts() {
  const [receipts, setReceipts] = useState<AgentReceipt[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { address } = useAccount();

  // Load receipts from localStorage on mount
  useEffect(() => {
    if (!address) return;
    
    loadReceipts();
  }, [address]);

  const loadReceipts = async () => {
    if (!address) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
      if (stored) {
        const parsedReceipts = JSON.parse(stored).map((receipt: any) => ({
          ...receipt,
          timestamp: new Date(receipt.timestamp),
          decisions: receipt.decisions.map((decision: any) => ({
            ...decision,
            timestamp: new Date(decision.timestamp),
          })),
          transactions: receipt.transactions.map((tx: any) => tx),
        }));
        setReceipts(parsedReceipts);
      }
    } catch (error) {
      console.error('Failed to load agent receipts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveReceipts = async (updatedReceipts: AgentReceipt[]) => {
    if (!address) return;
    
    try {
      // Keep only the most recent receipts locally
      const limited = updatedReceipts
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, MAX_LOCAL_RECEIPTS);
      
      localStorage.setItem(`${STORAGE_KEY}_${address.toLowerCase()}`, JSON.stringify(limited));
      setReceipts(limited);
      
      // Optionally save to IPFS for persistent storage
      if (ipfsService.isUsingRealIPFS()) {
        try {
          const ipfsHash = await ipfsService.uploadToIPFS({
            userAddress: address,
            receipts: limited,
            timestamp: Date.now(),
            version: '1.0'
          });
          console.log('Agent receipts backed up to IPFS:', ipfsHash);
        } catch (ipfsError) {
          console.warn('Failed to backup receipts to IPFS:', ipfsError);
        }
      }
    } catch (error) {
      console.error('Failed to save agent receipts:', error);
    }
  };

  const startNewSession = (): string => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSession(sessionId);
    return sessionId;
  };

  const addDecision = (decision: Omit<AgentDecision, 'id' | 'timestamp'>) => {
    if (!currentSession) return;
    
    const newDecision: AgentDecision = {
      ...decision,
      id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    // Find existing receipt for current session or create new one
    const existingReceiptIndex = receipts.findIndex(r => r.sessionId === currentSession);
    
    if (existingReceiptIndex >= 0) {
      const updated = [...receipts];
      updated[existingReceiptIndex] = {
        ...updated[existingReceiptIndex],
        decisions: [...updated[existingReceiptIndex].decisions, newDecision],
      };
      saveReceipts(updated);
    } else {
      // Create new receipt
      const newReceipt: AgentReceipt = {
        id: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: currentSession,
        timestamp: new Date(),
        totalCost: '0',
        transactions: [],
        decisions: [newDecision],
        summary: {
          totalTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0,
          averageDecisionTime: 0,
          totalGasUsed: '0',
        },
      };
      
      saveReceipts([newReceipt, ...receipts]);
    }
  };

  const addTransaction = (transaction: AgentReceipt['transactions'][0]) => {
    if (!currentSession) return;
    
    const updated = receipts.map(receipt => {
      if (receipt.sessionId === currentSession) {
        const updatedTransactions = [...receipt.transactions, transaction];
        const updatedSummary = calculateSummary(updatedTransactions, receipt.decisions);
        
        return {
          ...receipt,
          transactions: updatedTransactions,
          summary: updatedSummary,
          totalCost: updatedSummary.totalGasUsed, // Simplified, should calculate actual USD value
        };
      }
      return receipt;
    });
    
    saveReceipts(updated);
  };

  const updateTransactionStatus = (hash: string, status: 'pending' | 'confirmed' | 'failed') => {
    const updated = receipts.map(receipt => ({
      ...receipt,
      transactions: receipt.transactions.map(tx => 
        tx.hash === hash ? { ...tx, status } : tx
      ),
    })).map(receipt => ({
      ...receipt,
      summary: calculateSummary(receipt.transactions, receipt.decisions),
    }));
    
    saveReceipts(updated);
  };

  const calculateSummary = (
    transactions: AgentReceipt['transactions'], 
    decisions: AgentDecision[]
  ): AgentReceipt['summary'] => {
    const totalTransactions = transactions.length;
    const successfulTransactions = transactions.filter(tx => tx.status === 'confirmed').length;
    const failedTransactions = transactions.filter(tx => tx.status === 'failed').length;
    
    const totalExecutionTime = decisions.reduce((sum, d) => sum + d.metadata.executionTime, 0);
    const averageDecisionTime = decisions.length > 0 ? totalExecutionTime / decisions.length : 0;
    
    const totalGasUsed = transactions
      .filter(tx => tx.status === 'confirmed')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
      .toFixed(6);

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      averageDecisionTime,
      totalGasUsed,
    };
  };

  const exportReceipts = async (): Promise<string> => {
    const exportData = {
      userAddress: address,
      exportDate: new Date().toISOString(),
      receipts: receipts,
      version: '1.0',
    };

    if (ipfsService.isUsingRealIPFS()) {
      return await ipfsService.uploadToIPFS(exportData);
    } else {
      // Fallback to local download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledgermind-receipts-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return 'local_download';
    }
  };

  const getReceiptsByDateRange = (startDate: Date, endDate: Date): AgentReceipt[] => {
    return receipts.filter(receipt => 
      receipt.timestamp >= startDate && receipt.timestamp <= endDate
    );
  };

  const getTotalSpent = (timeframe: 'day' | 'week' | 'month' | 'all' = 'all'): string => {
    let filteredReceipts = receipts;
    
    if (timeframe !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filteredReceipts = getReceiptsByDateRange(startDate, now);
    }
    
    const total = filteredReceipts.reduce((sum, receipt) => 
      sum + parseFloat(receipt.totalCost || '0'), 0
    );
    
    return total.toFixed(6);
  };

  const clearAllReceipts = () => {
    setReceipts([]);
    setCurrentSession(null);
    if (address) {
      localStorage.removeItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
    }
  };

  return {
    receipts,
    currentSession,
    isLoading,
    startNewSession,
    addDecision,
    addTransaction,
    updateTransactionStatus,
    exportReceipts,
    getReceiptsByDateRange,
    getTotalSpent,
    clearAllReceipts,
  };
}