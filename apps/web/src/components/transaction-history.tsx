'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTransactionHistory, BlockchainTransaction } from '@/hooks/use-transaction-history';
import { ReceiptModal } from '@/components/receipt-modal';
import { getExplorerUrl, formatTransactionHash } from '@/lib/explorer';
import { 
  History, 
  ExternalLink, 
  Download, 
  Search, 
  Filter,
  DollarSign,
  Calendar,
  Bot,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  RefreshCw,
  Plus
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export function TransactionHistory() {
  const { 
    transactions, 
    isLoading, 
    error, 
    refetch,
    getTransactionById,
    isUsingCache,
    addTransactionToCache
  } = useTransactionHistory();
  
  const [filteredTransactions, setFilteredTransactions] = useState<BlockchainTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tokenFilter, setTokenFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all'); // payment_intent, ai_agent, wallet
  const [selectedTransaction, setSelectedTransaction] = useState<BlockchainTransaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [savedMerchants, setSavedMerchants] = useState<{address: string, name: string}[]>([
    { address: '0x742d35Cc6Af09C8B8B4f0C07A9bCa8Fb2E9e9189', name: 'Grocery Store' },
    { address: '0x1234567890123456789012345678901234567890', name: 'Coffee Shop' },
  ]);
  const [showMerchantDialog, setShowMerchantDialog] = useState(false);
  const [newMerchantName, setNewMerchantName] = useState('');
  const [newMerchantAddress, setNewMerchantAddress] = useState('');
  
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { toast } = useToast();

  useEffect(() => {
    let filtered = transactions.filter(tx => {
      const matchesSearch = 
        tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.agentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.to.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || tx.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
      const matchesToken = tokenFilter === 'all' || tx.token === tokenFilter;
      
      // Source filter logic
      let matchesSource = true;
      if (sourceFilter !== 'all') {
        if (sourceFilter === 'payment_intent' && !tx.intentAddress) matchesSource = false;
        if (sourceFilter === 'ai_agent' && tx.type !== 'agent_usage') matchesSource = false;
        if (sourceFilter === 'wallet' && (tx.intentAddress || tx.type === 'agent_usage')) matchesSource = false;
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesToken && matchesSource;
    });

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, typeFilter, statusFilter, tokenFilter, sourceFilter]);

  const getTransactionIcon = (tx: BlockchainTransaction) => {
    if (tx.status === 'pending') return <Clock className="h-4 w-4 text-yellow-500" />;
    if (tx.status === 'failed') return <AlertCircle className="h-4 w-4 text-red-500" />;
    
    switch (tx.type) {
      case 'payment':
        return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
      case 'funding':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'creation':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case 'agent_usage':
        return <Bot className="h-4 w-4 text-orange-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: BlockchainTransaction['status']) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const getTypeBadge = (type: BlockchainTransaction['type']) => {
    switch (type) {
      case 'payment':
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Payment</Badge>;
      case 'funding':
        return <Badge variant="outline" className="text-green-600 border-green-200">Funding</Badge>;
      case 'creation':
        return <Badge variant="outline" className="text-purple-600 border-purple-200">Creation</Badge>;
      case 'agent_usage':
        return <Badge variant="outline" className="text-orange-600 border-orange-200">Agent Usage</Badge>;
    }
  };

  const exportTransactions = () => {
    const csv = [
      ['Date', 'Type', 'Status', 'Amount', 'Token', 'From', 'To', 'Description', 'Transaction Hash'].join(','),
      ...filteredTransactions.map(tx => [
        format(tx.timestamp, 'yyyy-MM-dd HH:mm:ss'),
        tx.type,
        tx.status,
        tx.amount,
        tx.token,
        tx.from,
        tx.to,
        `"${tx.description}"`,
        tx.hash
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Transaction history exported to CSV",
    });
  };

  const handleViewReceipt = (tx: BlockchainTransaction) => {
    setSelectedTransaction(tx);
    setIsReceiptModalOpen(true);
  };

  const getMerchantName = (address: string) => {
    const merchant = savedMerchants.find(m => m.address.toLowerCase() === address.toLowerCase());
    return merchant ? merchant.name : null;
  };

  const handleSaveMerchant = () => {
    if (!newMerchantName.trim() || !newMerchantAddress.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please provide both merchant name and address",
        variant: "destructive",
      });
      return;
    }

    const existingMerchant = savedMerchants.find(m => 
      m.address.toLowerCase() === newMerchantAddress.toLowerCase()
    );

    if (existingMerchant) {
      // Update existing merchant
      setSavedMerchants(prev => prev.map(m => 
        m.address.toLowerCase() === newMerchantAddress.toLowerCase() 
          ? { ...m, name: newMerchantName.trim() }
          : m
      ));
      toast({
        title: "Merchant Updated",
        description: `Updated ${newMerchantAddress} to "${newMerchantName}"`,
      });
    } else {
      // Add new merchant
      setSavedMerchants(prev => [...prev, {
        address: newMerchantAddress.trim(),
        name: newMerchantName.trim()
      }]);
      toast({
        title: "Merchant Saved",
        description: `Added "${newMerchantName}" to saved merchants`,
      });
    }

    setNewMerchantName('');
    setNewMerchantAddress('');
    setShowMerchantDialog(false);
  };

  const viewReceipt = (tx: BlockchainTransaction) => {
    setSelectedTransaction(tx);
    setIsReceiptModalOpen(true);
  };

  const stats = {
    totalTransactions: transactions.length,
    totalSpent: transactions
      .filter(tx => tx.type === 'payment' && tx.status === 'confirmed')
      .reduce((sum, tx) => sum + tx.amount, 0),
    totalFunded: transactions
      .filter(tx => tx.type === 'funding' && tx.status === 'confirmed')
      .reduce((sum, tx) => sum + tx.amount, 0),
    agentUsage: transactions
      .filter(tx => tx.type === 'agent_usage' && tx.status === 'confirmed')
      .reduce((sum, tx) => sum + tx.amount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            Transaction History
          </h2>
          <p className="text-muted-foreground">
            Real blockchain transactions from your connected wallet with verifiable receipts
            {isUsingCache && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3" />
                Fast IPFS Cache
              </span>
            )}
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-red-800 text-sm font-medium">
                  Unable to load transaction history
                </p>
              </div>
              <p className="text-red-600 text-xs mt-1">
                {error.includes('fetch') ? 
                  'Network connection issue. Please check your internet connection and try again.' :
                  error.includes('Invalid') ?
                  'Invalid blockchain data detected. Please refresh or contact support.' :
                  'Something went wrong while fetching your transactions. Please try refreshing the page.'
                }
              </p>
              <Button 
                onClick={refetch} 
                variant="outline" 
                size="sm"
                className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={refetch} 
            variant="outline" 
            className="gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportTransactions} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{stats.totalTransactions}</p>
              </div>
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">${stats.totalSpent}</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Funded</p>
                <p className="text-2xl font-bold">${stats.totalFunded}</p>
              </div>
              <ArrowDownLeft className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Agent Usage</p>
                <p className="text-2xl font-bold">${stats.agentUsage}</p>
              </div>
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by hash, description, agent, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="payment">Payments</option>
                <option value="funding">Funding</option>
                <option value="creation">Creation</option>
                <option value="agent_usage">Agent Usage</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              
              <select
                value={tokenFilter}
                onChange={(e) => setTokenFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Tokens</option>
                <option value="USDC">USDC</option>
                <option value="SEI">SEI</option>
              </select>

              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Sources</option>
                <option value="payment_intent">Payment Intent</option>
                <option value="ai_agent">AI Agent</option>
                <option value="wallet">Direct Wallet</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMerchantDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Merchant
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            All transactions are recorded on-chain with verifiable receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Wallet Not Connected</h3>
              <p className="text-muted-foreground">
                Connect your wallet to view your real blockchain transaction history
              </p>
            </div>
          ) : isLoading ? (
            <div className="py-12 text-center">
              <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium mb-2">Loading Transactions</h3>
              <p className="text-muted-foreground">
                Fetching your transaction history from the blockchain...
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Transactions Found</h3>
              <p className="text-muted-foreground mb-4">
                {transactions.length === 0 
                  ? "No transactions found for your wallet address"
                  : "Try adjusting your search or filters"
                }
              </p>
              {transactions.length === 0 && (
                <Button onClick={refetch} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 border rounded-full flex items-center justify-center">
                      {getTransactionIcon(tx)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{tx.description}</h4>
                        {getTypeBadge(tx.type)}
                        {getStatusBadge(tx.status)}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{formatTransactionHash(tx.hash)}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(tx.timestamp, { addSuffix: true })}</span>
                        {tx.agentName && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Bot className="h-3 w-3" />
                              {tx.agentName}
                            </span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>From: {tx.from}</span>
                        <div className="flex items-center gap-1">
                          <span>To: </span>
                          {getMerchantName(tx.to) ? (
                            <span className="text-blue-600 font-medium">
                              {getMerchantName(tx.to)} ({tx.to})
                            </span>
                          ) : (
                            <span>{tx.to}</span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNewMerchantAddress(tx.to);
                              setShowMerchantDialog(true);
                            }}
                            className="h-4 w-4 p-0 ml-1 opacity-60 hover:opacity-100"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        {tx.blockNumber && (
                          <span>Block: {tx.blockNumber}</span>
                        )}
                        {tx.intentAddress && (
                          <span className="flex items-center gap-1 text-purple-600">
                            <ExternalLink className="h-3 w-3" />
                            Intent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium">
                        {tx.amount > 0 ? `$${tx.amount}` : 'Free'} {tx.amount > 0 ? tx.token : ''}
                      </div>
                      {tx.gasUsed && (
                        <div className="text-xs text-muted-foreground">
                          Gas: {tx.gasUsed.toLocaleString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-1">
                      {(tx.receiptHash || tx.receiptUri) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewReceipt(tx)}
                          className="h-8 w-8 p-0"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(getExplorerUrl(chainId, tx.hash), '_blank')}
                        className="h-8 w-8 p-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Modal */}
      <ReceiptModal
        transaction={selectedTransaction}
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedTransaction(null);
        }}
      />

      {/* Merchant Dialog */}
      {showMerchantDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add/Edit Merchant</CardTitle>
              <CardDescription>
                Save merchant information for easy identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="merchantName">Merchant Name</Label>
                <Input
                  id="merchantName"
                  value={newMerchantName}
                  onChange={(e) => setNewMerchantName(e.target.value)}
                  placeholder="e.g., Grocery Store, Coffee Shop"
                />
              </div>
              <div>
                <Label htmlFor="merchantAddress">Address</Label>
                <Input
                  id="merchantAddress"
                  value={newMerchantAddress}
                  onChange={(e) => setNewMerchantAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveMerchant} className="flex-1">
                  Save Merchant
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowMerchantDialog(false);
                    setNewMerchantName('');
                    setNewMerchantAddress('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading blockchain transactions...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}