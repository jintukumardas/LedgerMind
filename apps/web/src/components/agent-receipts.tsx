'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAgentReceipts } from '@/hooks/use-agent-receipts';
import { formatTransactionHash } from '@/lib/explorer';
import { 
  Receipt, 
  Download, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  Activity,
  Brain,
  TrendingUp,
  Calendar,
  Trash2,
  FileText,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

export function AgentReceipts() {
  const {
    receipts,
    currentSession,
    isLoading,
    exportReceipts,
    getTotalSpent,
    clearAllReceipts,
  } = useAgentReceipts();

  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportReceipts();
    } catch (error) {
      console.error('Failed to export receipts:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedReceiptData = selectedReceipt 
    ? receipts.find(r => r.id === selectedReceipt) 
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-blue-600" />
            AI Agent Receipts & Decisions
            <Badge variant="outline" className="text-xs">
              Experimental
            </Badge>
          </h2>
          <p className="text-gray-600">
            Track AI agent decisions, transactions, and spending analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleExport} 
            disabled={isExporting || receipts.length === 0}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export All'}
          </Button>
          <Button 
            onClick={clearAllReceipts}
            variant="outline"
            size="sm"
            disabled={receipts.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{receipts.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold">${getTotalSpent()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold">${getTotalSpent('month')}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Session</p>
                <Badge variant={currentSession ? 'default' : 'secondary'}>
                  {currentSession ? 'Running' : 'None'}
                </Badge>
              </div>
              <Brain className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receipts List or Empty State */}
      {receipts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Agent Activity Yet</h3>
            <p className="text-gray-600 mb-4">
              Start using AI agents to see their decisions and transaction receipts here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Receipts List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Recent Sessions</h3>
            <div className="space-y-3">
              {receipts.map((receipt) => (
                <Card 
                  key={receipt.id} 
                  className={`cursor-pointer transition-all ${
                    selectedReceipt === receipt.id 
                      ? 'ring-2 ring-blue-500 border-blue-200' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedReceipt(receipt.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm">
                          Session {receipt.sessionId.split('_')[1]}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(receipt.timestamp, 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        ${receipt.totalCost}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-sm font-medium">{receipt.summary.totalTransactions}</div>
                        <div className="text-gray-500">Transactions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">{receipt.decisions.length}</div>
                        <div className="text-gray-500">Decisions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">{receipt.summary.successfulTransactions}</div>
                        <div className="text-gray-500">Successful</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Receipt Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Session Details</h3>
            {selectedReceiptData ? (
              <div className="space-y-4">
                {/* Session Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Session Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Cost:</span>
                        <span className="ml-2 font-medium">${selectedReceiptData.totalCost}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg Decision Time:</span>
                        <span className="ml-2 font-medium">
                          {Math.round(selectedReceiptData.summary.averageDecisionTime)}ms
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Success Rate:</span>
                        <span className="ml-2 font-medium">
                          {selectedReceiptData.summary.totalTransactions > 0 
                            ? Math.round((selectedReceiptData.summary.successfulTransactions / selectedReceiptData.summary.totalTransactions) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Gas Used:</span>
                        <span className="ml-2 font-medium">{selectedReceiptData.summary.totalGasUsed} SEI</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Transactions */}
                {selectedReceiptData.transactions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Transactions</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {selectedReceiptData.transactions.map((tx, index) => (
                          <div key={tx.hash} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              {tx.status === 'confirmed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                              {tx.status === 'pending' && <Clock className="h-4 w-4 text-yellow-600" />}
                              {tx.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                              <div>
                                <p className="text-sm font-medium">
                                  {tx.amount} {tx.token}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatTransactionHash(tx.hash)}
                                </p>
                              </div>
                            </div>
                            <Badge variant={
                              tx.status === 'confirmed' ? 'default' : 
                              tx.status === 'pending' ? 'secondary' : 'destructive'
                            }>
                              {tx.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Decisions */}
                {selectedReceiptData.decisions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        AI Decisions ({selectedReceiptData.decisions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 max-h-64 overflow-y-auto">
                      <div className="space-y-3">
                        {selectedReceiptData.decisions.map((decision) => (
                          <div key={decision.id} className="border-l-2 border-blue-200 pl-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{decision.description}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {decision.context.userPrompt}
                                </p>
                                <div className="flex items-center gap-2 mt-2 text-xs">
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(decision.metadata.confidence * 100)}% confidence
                                  </Badge>
                                  <span className="text-gray-500">
                                    {decision.metadata.executionTime}ms
                                  </span>
                                </div>
                              </div>
                              <Badge variant={decision.outcome.success ? 'default' : 'destructive'} className="text-xs">
                                {decision.outcome.success ? 'Success' : 'Failed'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* IPFS Backup Status */}
                {selectedReceiptData.ipfsHash && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Backed up to IPFS</span>
                        </div>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">
                    Select a session to view detailed receipts and AI decisions
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}