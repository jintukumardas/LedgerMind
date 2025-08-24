'use client';

import { useState, useEffect } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlockchainTransaction } from '@/hooks/use-transaction-history';
import { getExplorerUrl } from '@/lib/explorer';
import { 
  X, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  Download,
  Shield,
  Clock,
  DollarSign,
  Hash,
  Blocks
} from 'lucide-react';
import { format } from 'date-fns';
import { formatUnits } from 'viem';

interface ReceiptModalProps {
  transaction: BlockchainTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

interface TransactionDetails {
  blockHash: string;
  gasPrice: string;
  gasUsed: number;
  effectiveGasPrice: string;
  nonce: number;
  status: 'success' | 'reverted';
  logs: any[];
}

export function ReceiptModal({ transaction, isOpen, onClose }: ReceiptModalProps) {
  const [details, setDetails] = useState<TransactionDetails | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'failed' | 'pending'>('pending');
  
  const publicClient = usePublicClient();
  const chainId = useChainId();

  useEffect(() => {
    if (isOpen && transaction && publicClient) {
      verifyTransaction();
    }
  }, [isOpen, transaction, publicClient]);

  const verifyTransaction = async () => {
    if (!transaction || !publicClient) return;
    
    setIsVerifying(true);
    setVerificationStatus('pending');
    
    try {
      // Fetch detailed transaction data
      const [txReceipt, txData, currentBlock] = await Promise.all([
        publicClient.getTransactionReceipt({ hash: transaction.hash as `0x${string}` }),
        publicClient.getTransaction({ hash: transaction.hash as `0x${string}` }),
        publicClient.getBlockNumber()
      ]);

      const txDetails: TransactionDetails = {
        blockHash: txReceipt.blockHash,
        gasPrice: txData.gasPrice?.toString() || '0',
        gasUsed: Number(txReceipt.gasUsed),
        effectiveGasPrice: txReceipt.effectiveGasPrice?.toString() || '0',
        nonce: txData.nonce,
        status: txReceipt.status,
        logs: txReceipt.logs,
      };

      setDetails(txDetails);
      
      // Verify transaction integrity
      const confirmations = Number(currentBlock) - (transaction.blockNumber || 0);
      if (confirmations >= 1 && txReceipt.status === 'success') {
        setVerificationStatus('verified');
      } else if (txReceipt.status === 'reverted') {
        setVerificationStatus('failed');
      } else {
        setVerificationStatus('pending');
      }
      
    } catch (error) {
      console.error('Error verifying transaction:', error);
      setVerificationStatus('failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const downloadReceipt = () => {
    if (!transaction) return;
    
    const receiptData = {
      transactionHash: transaction.hash,
      type: transaction.type,
      amount: transaction.amount,
      token: transaction.token,
      from: transaction.from,
      to: transaction.to,
      timestamp: transaction.timestamp.toISOString(),
      blockNumber: transaction.blockNumber,
      gasUsed: transaction.gasUsed,
      status: transaction.status,
      verificationStatus,
      receiptHash: transaction.receiptHash,
      receiptUri: transaction.receiptUri,
      confirmations: transaction.confirmations,
      verified: verificationStatus === 'verified',
      chainId,
    };

    const blob = new Blob([JSON.stringify(receiptData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${transaction.hash.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                verificationStatus === 'verified' 
                  ? 'bg-green-100 text-green-600' 
                  : verificationStatus === 'failed'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-yellow-100 text-yellow-600'
              }`}>
                {isVerifying ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : verificationStatus === 'verified' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : verificationStatus === 'failed' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </div>
              <div>
                <CardTitle>Transaction Receipt</CardTitle>
                <CardDescription>
                  {verificationStatus === 'verified' && 'Verified on blockchain'}
                  {verificationStatus === 'failed' && 'Verification failed or transaction reverted'}
                  {verificationStatus === 'pending' && (isVerifying ? 'Verifying...' : 'Pending verification')}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Transaction Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Transaction Hash</h4>
                <div className="flex items-center space-x-2">
                  <code className="text-sm bg-muted px-2 py-1 rounded flex-1 break-all">
                    {transaction.hash}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transaction.hash, 'Transaction hash copied')}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Amount</h4>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-medium">
                    {transaction.amount > 0 ? `${transaction.amount} ${transaction.token}` : 'Free'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                <Badge 
                  variant={
                    transaction.status === 'confirmed' ? 'default' : 
                    transaction.status === 'failed' ? 'destructive' : 'secondary'
                  }
                >
                  {transaction.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Date & Time</h4>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{format(transaction.timestamp, 'PPP p')}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Block Number</h4>
                <div className="flex items-center space-x-2">
                  <Blocks className="h-4 w-4 text-muted-foreground" />
                  <span>{transaction.blockNumber?.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Confirmations</h4>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span>{transaction.confirmations}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Addresses</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">From</p>
                <div className="flex items-center space-x-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all">
                    {transaction.from}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transaction.from, 'Address copied')}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">To</p>
                <div className="flex items-center space-x-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all">
                    {transaction.to}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transaction.to, 'Address copied')}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Details */}
          {(transaction.receiptHash || transaction.receiptUri) && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Receipt Information</h4>
              {transaction.receiptHash && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Receipt Hash</p>
                  <div className="flex items-center space-x-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all">
                      {transaction.receiptHash}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(transaction.receiptHash!, 'Receipt hash copied')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {transaction.receiptUri && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Receipt URI</p>
                  <p className="text-sm bg-muted px-2 py-1 rounded">{transaction.receiptUri}</p>
                </div>
              )}
            </div>
          )}

          {/* Gas Information */}
          {details && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Gas Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Gas Used</p>
                  <p className="font-medium">{details.gasUsed.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gas Price</p>
                  <p className="font-medium">{formatUnits(BigInt(details.gasPrice), 9)} Gwei</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Transaction Fee</p>
                  <p className="font-medium">
                    {formatUnits(BigInt(details.gasUsed) * BigInt(details.effectiveGasPrice), 18)} SEI
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Verification Status */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Verification Status</h4>
              <Badge 
                variant={
                  verificationStatus === 'verified' ? 'default' : 
                  verificationStatus === 'failed' ? 'destructive' : 'secondary'
                }
              >
                {verificationStatus === 'verified' && '✅ Verified'}
                {verificationStatus === 'failed' && '❌ Failed'}
                {verificationStatus === 'pending' && '⏳ Pending'}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Transaction exists on Sei blockchain</p>
              <p>• Block confirmation: {transaction.confirmations} confirmations</p>
              <p>• Transaction status: {transaction.status}</p>
              {verificationStatus === 'verified' && (
                <p className="text-green-600">• All verification checks passed ✅</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getExplorerUrl(chainId, transaction.hash), '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View on Explorer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadReceipt}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Receipt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(transaction.hash, 'Transaction hash copied')}
              className="gap-2"
            >
              <Hash className="h-4 w-4" />
              Copy Hash
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}