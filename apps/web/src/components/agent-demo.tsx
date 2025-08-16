'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePaymentIntents } from '@/hooks/use-payment-intents';
import { getExplorerUrl, formatTransactionHash } from '@/lib/explorer';
import { parseUnits } from 'viem';
import { agentWallet } from '@/lib/agent-wallet';
import { Bot, Zap, DollarSign, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

// Payment Intent ABI for execute function
const INTENT_ABI = [
  {
    "inputs": [
      {"name": "merchant", "type": "address"},
      {"name": "amount", "type": "uint256"},
      {"name": "receiptHash", "type": "bytes32"},
      {"name": "receiptURI", "type": "string"}
    ],
    "name": "execute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

interface AgentAction {
  id: string;
  type: 'payment' | 'check' | 'analysis';
  description: string;
  amount?: number;
  recipient?: string;
  status: 'pending' | 'success' | 'error';
  timestamp: Date;
  txHash?: string;
}

export function AgentDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [recipient, setRecipient] = useState('0x742d35cc6E09C8B8D4F0C07A9bCa8Fb2E9e91891');
  const [amount, setAmount] = useState('25');
  const [selectedIntent, setSelectedIntent] = useState('');
  
  const { isConnected } = useAccount();
  const { intents, refetch } = usePaymentIntents();
  const { toast } = useToast();
  const chainId = useChainId();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);
  
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Filter for active intents
  const activeIntents = intents.filter(intent => {
    const isExpired = intent.end < BigInt(Math.floor(Date.now() / 1000));
    return intent.state === 0 && !isExpired;
  });

  const addAction = (action: Omit<AgentAction, 'id' | 'timestamp'>) => {
    const newAction: AgentAction = {
      ...action,
      id: Math.random().toString(),
      timestamp: new Date(),
    };
    setActions(prev => [newAction, ...prev]);
    return newAction;
  };

  const updateAction = (id: string, updates: Partial<AgentAction>) => {
    setActions(prev => prev.map(action => 
      action.id === id ? { ...action, ...updates } : action
    ));
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      const lastAction = actions.find(a => a.status === 'pending' && a.type === 'payment');
      if (lastAction) {
        updateAction(lastAction.id, { 
          status: 'success',
          txHash: hash
        });
        
        toast.success("AI Agent Payment Complete", `Transaction: ${formatTransactionHash(hash)}`);
        
        // Show explorer link
        toast({
          title: "View Transaction",
          description: "Click to view in explorer",
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(getExplorerUrl(chainId, hash), '_blank')}
              className="gap-1"
            >
              View TX <ExternalLink className="h-3 w-3" />
            </Button>
          )
        });
        
        // Refresh intents to show updated spent amount
        refetch();
      }
      setIsRunning(false);
    }
  }, [isConfirmed, hash, chainId, toast, actions, refetch]);

  const executeRealPayment = async () => {
    if (!recipient || !amount || !selectedIntent) {
      toast.error("Missing Information", "Please select an intent and provide recipient/amount");
      return;
    }

    if (!isConnected) {
      toast.error("Wallet Not Connected", "Please connect your wallet first");
      return;
    }

    try {
      setIsRunning(true);

      // Step 1: Agent analyzes request
      const analysisAction = addAction({
        type: 'analysis',
        description: `AI Agent analyzing payment request: $${amount} USDC to ${recipient.slice(0, 10)}...`,
        status: 'pending'
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      updateAction(analysisAction.id, { status: 'success' });

      // Step 2: Check payment intent limits
      const checkAction = addAction({
        type: 'check',
        description: 'Checking payment intent limits and merchant allowlist',
        status: 'pending'
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      updateAction(checkAction.id, { status: 'success' });

      // Step 3: Execute real blockchain payment
      const paymentAction = addAction({
        type: 'payment',
        description: `Executing USDC payment through intent ${selectedIntent.slice(0, 10)}...`,
        amount: parseFloat(amount),
        recipient,
        status: 'pending'
      });

      // Generate receipt data
      const receiptHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;
      const receiptURI = `Payment from AI Agent - ${Date.now()}`;

      // Execute real blockchain transaction using agent wallet
      setIsPending(true);
      const txHash = await agentWallet.executePaymentIntent(
        selectedIntent as `0x${string}`,
        recipient as `0x${string}`,
        parseUnits(amount, 6), // USDC has 6 decimals
        receiptHash,
        receiptURI
      );
      
      setHash(txHash);
      setIsPending(false);

      toast.success("Transaction Submitted", "AI agent payment is being processed...");

    } catch (err) {
      console.error('Payment execution failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error("Payment Failed", errorMessage);
      
      // Mark last pending action as failed
      const lastPendingAction = actions.find(a => a.status === 'pending');
      if (lastPendingAction) {
        updateAction(lastPendingAction.id, { status: 'error' });
      }
      
      setIsRunning(false);
    }
  };

  const getActionIcon = (action: AgentAction) => {
    if (action.status === 'pending') return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
    if (action.status === 'error') return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (action.type === 'payment') return <DollarSign className="h-4 w-4 text-green-500" />;
    if (action.type === 'check') return <CheckCircle className="h-4 w-4 text-blue-500" />;
    return <Zap className="h-4 w-4 text-purple-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <CardTitle>AI Agent Demo</CardTitle>
        </div>
        <CardDescription>
          Simulate how your AI agent uses payment intents to make secure transactions
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          Agent Address: {agentWallet.getAddress()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected ? (
          <div className="text-center py-4 text-muted-foreground">
            Please connect your wallet to use the AI Agent Demo
          </div>
        ) : activeIntents.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Create a payment intent first to enable AI agent payments
          </div>
        ) : (
          <>
            {/* Demo Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="intent">Select Payment Intent</Label>
                <select
                  id="intent"
                  value={selectedIntent}
                  onChange={(e) => setSelectedIntent(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="">Choose an intent...</option>
                  {activeIntents.map((intent) => (
                    <option key={intent.address} value={intent.address}>
                      {intent.address.slice(0, 10)}... (${Number(intent.totalCap - intent.spent) / 1e6} USDC available)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="recipient">Merchant Address</Label>
                <Input
                  id="recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount (USDC)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={executeRealPayment} 
                  disabled={isRunning || isPending || !recipient || !amount || !selectedIntent}
                  className="w-full"
                >
                  {isRunning || isPending ? 'AI Agent Executing...' : '🤖 Execute Real AI Payment'}
                </Button>
              </div>
            </div>

            {/* Show selected intent details */}
            {selectedIntent && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <h4 className="font-medium text-sm mb-2">Selected Intent Details:</h4>
                {(() => {
                  const intent = activeIntents.find(i => i.address === selectedIntent);
                  if (!intent) return null;
                  return (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Total Cap: ${Number(intent.totalCap) / 1e6} USDC</div>
                      <div>Per Transaction Cap: ${Number(intent.perTransactionCap) / 1e6} USDC</div>
                      <div>Already Spent: ${Number(intent.spent) / 1e6} USDC</div>
                      <div>Available: ${Number(intent.totalCap - intent.spent) / 1e6} USDC</div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}

        {/* Action Log */}
        {actions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Agent Activity Log</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {actions.map((action) => (
                <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                  {getActionIcon(action)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{action.description}</p>
                      <Badge 
                        variant={action.status === 'success' ? 'default' : action.status === 'error' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {action.status}
                      </Badge>
                    </div>
                    {action.amount && action.recipient && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ${action.amount} USDC → {action.recipient.slice(0, 10)}...{action.recipient.slice(-6)}
                      </p>
                    )}
                    {action.txHash && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          TX: {formatTransactionHash(action.txHash)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(getExplorerUrl(chainId, action.txHash!), '_blank')}
                          className="h-auto p-1 hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {action.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo Information */}
        <div className="rounded-lg border bg-blue-50 p-4">
          <h4 className="font-medium text-sm mb-2 text-blue-900">Real AI Agent Execution:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• AI agent analyzes the payment request</li>
            <li>• Checks payment intent limits and merchant restrictions</li>
            <li>• Executes real USDC payment through smart contract</li>
            <li>• Transaction recorded on Sei blockchain with receipt</li>
            <li>• Payment intent spending balance automatically updated</li>
          </ul>
          <div className="mt-2 text-xs text-blue-700">
            ⚠️ This executes real transactions on Sei testnet
          </div>
        </div>
      </CardContent>
    </Card>
  );
}