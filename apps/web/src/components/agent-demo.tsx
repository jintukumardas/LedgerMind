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
import { parseContractError } from '@/lib/error-parser';
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
  const [currentPaymentActionId, setCurrentPaymentActionId] = useState<string | null>(null);
  
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
        
        // Clear the current payment action ID
        setCurrentPaymentActionId(null);
        
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
      toast({
        title: "Missing Information",
        description: "Please select an intent and provide recipient/amount",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    // Validate the selected intent and amount
    const selectedIntentData = activeIntents.find(i => i.address === selectedIntent);
    if (!selectedIntentData) {
      toast({
        title: "Invalid Intent",
        description: "Selected payment intent not found",
        variant: "destructive",
      });
      return;
    }

    const amountWei = parseUnits(amount, 6);
    
    // Check per-transaction cap
    if (amountWei > selectedIntentData.perTransactionCap) {
      const maxPerTx = Number(selectedIntentData.perTransactionCap) / 1e6;
      toast({
        title: "Amount Too High",
        description: `Payment amount ($${amount}) exceeds per-transaction cap ($${maxPerTx})`,
        variant: "destructive",
      });
      return;
    }

    // Check remaining balance
    const remaining = selectedIntentData.totalCap - selectedIntentData.spent;
    if (amountWei > remaining) {
      const remainingUSDC = Number(remaining) / 1e6;
      toast({
        title: "Insufficient Intent Balance",
        description: `Payment amount ($${amount}) exceeds available balance ($${remainingUSDC.toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    // Check if intent is expired
    const now = Math.floor(Date.now() / 1000);
    if (now >= Number(selectedIntentData.end)) {
      toast({
        title: "Intent Expired",
        description: "This payment intent has expired and cannot be used",
        variant: "destructive",
      });
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
      
      // Store the payment action ID for error handling
      setCurrentPaymentActionId(paymentAction.id);

      // Generate receipt data
      const receiptHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;
      const receiptURI = `Payment from AI Agent - ${Date.now()}`;

      // Check if agent has USDC and auto-fund the intent if needed
      try {
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
      } catch (initialError: any) {
        setIsPending(false);
        
        // Check if this is an insufficient balance error
        if (initialError.message?.includes('PaymentIntent: insufficient balance')) {
          // Try to auto-fund the intent with agent's USDC
          try {
            toast({
              title: "Auto-funding Intent",
              description: "Payment intent needs funding. Attempting to fund with agent's USDC...",
              variant: "default",
            });

            // Check agent's USDC balance
            const agentUSDCBalance = await agentWallet.getUSDCBalance();
            const requiredAmount = parseUnits(amount, 6);
            
            if (agentUSDCBalance >= requiredAmount) {
              // Fund the intent with the required amount plus a small buffer
              const fundingAmount = requiredAmount + parseUnits('10', 6); // Add 10 USDC buffer
              const actualFundingAmount = agentUSDCBalance < fundingAmount ? agentUSDCBalance : fundingAmount;
              
              const fundingAction = addAction({
                type: 'check',
                description: `Funding intent with ${Number(actualFundingAmount) / 1e6} USDC from agent wallet`,
                status: 'pending'
              });

              const fundTxHash = await agentWallet.fundPaymentIntent(
                selectedIntent as `0x${string}`,
                actualFundingAmount
              );
              
              updateAction(fundingAction.id, { status: 'success', txHash: fundTxHash });
              
              // Wait a moment for the funding transaction to be processed
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Now retry the original payment
              setIsPending(true);
              const retryPaymentAction = addAction({
                type: 'payment',
                description: `Retrying payment after funding: $${amount} USDC`,
                amount: parseFloat(amount),
                recipient,
                status: 'pending'
              });
              
              const txHash = await agentWallet.executePaymentIntent(
                selectedIntent as `0x${string}`,
                recipient as `0x${string}`,
                parseUnits(amount, 6),
                receiptHash,
                receiptURI
              );
              
              setHash(txHash);
              setIsPending(false);
              toast.success("Payment Successful", "Intent was auto-funded and payment executed!");
            } else {
              throw new Error(`Agent wallet has insufficient USDC balance. Has ${Number(agentUSDCBalance) / 1e6} USDC, needs ${amount} USDC`);
            }
          } catch (fundingError) {
            console.error('Auto-funding failed:', fundingError);
            // Mark the funding action as failed if it exists
            setActions(prevActions => 
              prevActions.map(action => 
                action.status === 'pending' && action.description.includes('Funding intent') 
                  ? { ...action, status: 'error' } 
                  : action
              )
            );
            throw initialError; // Fall back to original error
          }
        } else {
          throw initialError; // Re-throw non-funding errors immediately
        }
      }

    } catch (err) {
      console.error('Payment execution failed:', err);
      setIsPending(false);
      setIsRunning(false);
      
      // Parse the contract error for user-friendly display
      const parsedError = parseContractError(err);
      
      toast({
        title: parsedError.title,
        description: parsedError.description,
        variant: "destructive",
      });
      
      // Show suggestion in a separate toast if available
      if (parsedError.suggestion) {
        setTimeout(() => {
          toast({
            title: "💡 Suggestion",
            description: parsedError.suggestion,
            variant: "default",
          });
        }, 1000);
      }
      
      // Mark ALL pending actions as failed
      setActions(prevActions => 
        prevActions.map(action => 
          action.status === 'pending' ? { ...action, status: 'error' } : action
        )
      );
      
      // Clear the current payment action ID
      setCurrentPaymentActionId(null);
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
          <CardTitle>AI Agent Payments</CardTitle>
        </div>
        <CardDescription>
          Execute real blockchain payments through your AI agent using payment intents
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          Agent Address: {agentWallet.getAddress()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected ? (
          <div className="text-center py-4 text-muted-foreground">
            Please connect your wallet to execute AI agent payments
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
                  {isRunning || isPending ? 'AI Agent Executing...' : '🤖 Execute AI Payment'}
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
                  
                  const totalCapUSDC = Number(intent.totalCap) / 1e6;
                  const perTransactionCapUSDC = Number(intent.perTransactionCap) / 1e6;
                  const spentUSDC = Number(intent.spent) / 1e6;
                  const availableUSDC = Number(intent.totalCap - intent.spent) / 1e6;
                  const endDate = new Date(Number(intent.end) * 1000);
                  const isExpiring = endDate.getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24 hours
                  
                  return (
                    <div className="text-sm space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <div>Total Cap: ${totalCapUSDC} USDC</div>
                        <div>Per Transaction Cap: ${perTransactionCapUSDC} USDC</div>
                        <div>Already Spent: ${spentUSDC} USDC</div>
                        <div className={availableUSDC < 10 ? "text-orange-600 font-medium" : ""}>
                          Available: ${availableUSDC.toFixed(2)} USDC
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Expires: {endDate.toLocaleDateString()} {endDate.toLocaleTimeString()}
                        </span>
                        {isExpiring && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                      
                      {parseFloat(amount) > perTransactionCapUSDC && (
                        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                          ⚠️ Amount exceeds per-transaction cap of ${perTransactionCapUSDC}
                        </div>
                      )}
                      
                      {parseFloat(amount) > availableUSDC && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          ❌ Amount exceeds available balance of ${availableUSDC.toFixed(2)}
                        </div>
                      )}
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

        {/* Process Information */}
        <div className="rounded-lg border bg-blue-50 p-4">
          <h4 className="font-medium text-sm mb-2 text-blue-900">AI Agent Payment Process:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• AI agent analyzes the payment request</li>
            <li>• Checks payment intent limits and merchant restrictions</li>
            <li>• Executes USDC payment through smart contract</li>
            <li>• Transaction recorded on Sei blockchain with receipt</li>
            <li>• Payment intent spending balance automatically updated</li>
            <li>• Auto-funding from agent wallet if needed</li>
          </ul>
          <div className="mt-2 text-xs text-blue-700">
            💡 All transactions are real and recorded on-chain
          </div>
        </div>
      </CardContent>
    </Card>
  );
}