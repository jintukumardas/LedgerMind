'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient, useWaitForTransactionReceipt } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePaymentIntents } from '@/hooks/use-payment-intents';
import { formatTokenAmount } from '@/lib/utils';
import { parseUnits, formatUnits } from 'viem';
import { 
  Settings, 
  Edit, 
  Pause, 
  Play, 
  Trash2, 
  DollarSign,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface IntentManagementProps {
  intentAddress?: string;
}

export function IntentManagement({ intentAddress }: IntentManagementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();
  const [editValues, setEditValues] = useState({
    totalCap: '',
    perTransactionCap: '',
    duration: '',
    merchants: [] as string[],
    newMerchant: ''
  });

  const { intents, refetch } = usePaymentIntents();
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { toast } = useToast();

  const { isSuccess: isTransactionConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  // Handle transaction confirmation
  useEffect(() => {
    if (isTransactionConfirmed && pendingTxHash) {
      setIsUpdating(false);
      setPendingTxHash(undefined);
      
      toast({
        title: "Transaction Confirmed",
        description: "Payment intent has been updated successfully",
      });

      // Refetch data after confirmation
      setTimeout(() => {
        refetch();
      }, 1000);
    }
  }, [isTransactionConfirmed, pendingTxHash, refetch, toast]);

  // Find the specific intent or show all if no specific address provided
  const targetIntents = intentAddress 
    ? intents.filter(intent => intent.address === intentAddress)
    : intents.filter(intent => intent.agent.toLowerCase() === address?.toLowerCase());

  // ABI for intent management functions (matching actual PaymentIntent contract)
  const INTENT_ABI = [
    {
      "inputs": [],
      "name": "pause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unpause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"name": "reason", "type": "string"}],
      "name": "revoke",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"name": "merchant", "type": "address"},
        {"name": "allowed", "type": "bool"}
      ],
      "name": "updateMerchant",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"name": "merchant", "type": "address"}],
      "name": "isMerchantAllowed",
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "hasRestrictedMerchants",
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const;

  const startEditing = (intent: any) => {
    setEditValues({
      totalCap: formatUnits(intent.totalCap, 6),
      perTransactionCap: formatUnits(intent.perTransactionCap, 6),
      duration: Math.floor((Number(intent.end) - Math.floor(Date.now() / 1000)) / (24 * 60 * 60)).toString(),
      merchants: [],
      newMerchant: ''
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditValues({
      totalCap: '',
      perTransactionCap: '',
      duration: '',
      merchants: [],
      newMerchant: ''
    });
  };

  const pauseIntent = async (intentAddr: string) => {
    if (!walletClient || !isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to pause the intent",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdating(true);
      const hash = await walletClient.writeContract({
        address: intentAddr as `0x${string}`,
        abi: INTENT_ABI,
        functionName: 'pause',
        args: [],
      });

      setPendingTxHash(hash);
      
      toast({
        title: "Transaction Submitted",
        description: "Pausing payment intent...",
      });

    } catch (error) {
      console.error('Error pausing intent:', error);
      toast({
        title: "Failed to Pause Intent",
        description: error instanceof Error ? error.message : "Transaction failed - check if you have the right permissions",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const resumeIntent = async (intentAddr: string) => {
    if (!walletClient || !isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to resume the intent",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdating(true);
      const hash = await walletClient.writeContract({
        address: intentAddr as `0x${string}`,
        abi: INTENT_ABI,
        functionName: 'unpause',
        args: [],
      });

      setPendingTxHash(hash);
      
      toast({
        title: "Transaction Submitted",
        description: "Resuming payment intent...",
      });

    } catch (error) {
      console.error('Error resuming intent:', error);
      toast({
        title: "Failed to Resume Intent",
        description: error instanceof Error ? error.message : "Transaction failed - check if you have the right permissions",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const revokeIntent = async (intentAddr: string) => {
    if (!walletClient || !isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to revoke the intent",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdating(true);
      const hash = await walletClient.writeContract({
        address: intentAddr as `0x${string}`,
        abi: INTENT_ABI,
        functionName: 'revoke',
        args: ["Revoked by user"],
      });

      setPendingTxHash(hash);
      
      toast({
        title: "Transaction Submitted",
        description: "Revoking payment intent...",
      });

    } catch (error) {
      console.error('Error revoking intent:', error);
      toast({
        title: "Failed to Revoke Intent",
        description: error instanceof Error ? error.message : "Transaction failed - check if you have the right permissions",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateCaps = async (intentAddr: string) => {
    // This function is not available in the current contract
    toast({
      title: "Feature Not Available",
      description: "Updating caps is not currently supported by the smart contract",
      variant: "destructive",
    });
  };

  const updateDuration = async (intentAddr: string) => {
    // This function is not available in the current contract
    toast({
      title: "Feature Not Available",
      description: "Updating duration is not currently supported by the smart contract",
      variant: "destructive",
    });
  };

  const addMerchant = () => {
    if (editValues.newMerchant && !editValues.merchants.includes(editValues.newMerchant)) {
      setEditValues(prev => ({
        ...prev,
        merchants: [...prev.merchants, prev.newMerchant],
        newMerchant: ''
      }));
    }
  };

  const removeMerchant = (merchant: string) => {
    setEditValues(prev => ({
      ...prev,
      merchants: prev.merchants.filter(m => m !== merchant)
    }));
  };

  const getIntentStatusBadge = (intent: any) => {
    const isExpired = intent.end < BigInt(Math.floor(Date.now() / 1000));
    
    if (intent.state === 2) {
      return <Badge variant="destructive">Revoked</Badge>;
    } else if (intent.paused) {
      return <Badge variant="secondary">Paused</Badge>;
    } else if (isExpired) {
      return <Badge variant="outline">Expired</Badge>;
    } else {
      return <Badge variant="default">Active</Badge>;
    }
  };

  const getIntentStatusIcon = (intent: any) => {
    const isExpired = intent.end < BigInt(Math.floor(Date.now() / 1000));
    
    if (intent.state === 2) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    } else if (intent.paused) {
      return <Pause className="h-4 w-4 text-yellow-500" />;
    } else if (isExpired) {
      return <Clock className="h-4 w-4 text-gray-500" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Wallet Not Connected</h3>
          <p className="text-muted-foreground">
            Connect your wallet to manage your payment intents
          </p>
        </CardContent>
      </Card>
    );
  }

  if (targetIntents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Payment Intents</h3>
          <p className="text-muted-foreground">
            You don't have any payment intents to manage yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {targetIntents.map((intent) => {
        const totalCapUSDC = Number(formatUnits(intent.totalCap, 6));
        const perTxCapUSDC = Number(formatUnits(intent.perTransactionCap, 6));
        const spentUSDC = Number(formatUnits(intent.spent, 6));
        const availableUSDC = Number(formatUnits(intent.totalCap - intent.spent, 6));
        const endDate = new Date(Number(intent.end) * 1000);
        const isExpired = intent.end < BigInt(Math.floor(Date.now() / 1000));
        const canManage = intent.state !== 2 && !isExpired; // Not revoked and not expired

        return (
          <Card key={intent.address}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getIntentStatusIcon(intent)}
                  <div>
                    <CardTitle className="text-lg">
                      Payment Intent {intent.address.slice(0, 10)}...
                    </CardTitle>
                    <CardDescription>
                      Created: {format(new Date(Number(intent.start) * 1000), 'PPP')}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getIntentStatusBadge(intent)}
                  {canManage && false && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(intent)}
                      disabled={isUpdating || isEditing}
                      className="gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {!isEditing ? (
                <>
                  {/* Current Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Cap</p>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">${totalCapUSDC} USDC</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Per Transaction</p>
                      <div className="flex items-center space-x-1">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">${perTxCapUSDC} USDC</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Already Spent</p>
                      <span className="font-medium">${spentUSDC} USDC</span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Available</p>
                      <span className={`font-medium ${availableUSDC < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                        ${availableUSDC.toFixed(2)} USDC
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Expires</p>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className={isExpired ? 'text-red-600' : ''}>
                          {format(endDate, 'PPP p')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Allowed Merchants</p>
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          {intent.hasRestrictedMerchants ? "Specific merchants only" : "Any merchant"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Management Actions */}
                  {canManage && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      {!intent.paused ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => pauseIntent(intent.address)}
                          disabled={isUpdating}
                          className="gap-1"
                        >
                          {isUpdating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Pause className="h-3 w-3" />
                          )}
                          Pause
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resumeIntent(intent.address)}
                          disabled={isUpdating}
                          className="gap-1"
                        >
                          {isUpdating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          Resume
                        </Button>
                      )}
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => revokeIntent(intent.address)}
                        disabled={isUpdating}
                        className="gap-1"
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Revoke
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Edit Form */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Update Intent Settings</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="totalCap">Total Cap (USDC)</Label>
                        <Input
                          id="totalCap"
                          type="number"
                          value={editValues.totalCap}
                          onChange={(e) => setEditValues(prev => ({ ...prev, totalCap: e.target.value }))}
                          placeholder="1000"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="perTxCap">Per Transaction Cap (USDC)</Label>
                        <Input
                          id="perTxCap"
                          type="number"
                          value={editValues.perTransactionCap}
                          onChange={(e) => setEditValues(prev => ({ ...prev, perTransactionCap: e.target.value }))}
                          placeholder="100"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="duration">Extend Duration (Days)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={editValues.duration}
                        onChange={(e) => setEditValues(prev => ({ ...prev, duration: e.target.value }))}
                        placeholder="30"
                        className="w-full md:w-48"
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => updateCaps(intent.address)}
                        disabled={isUpdating || !editValues.totalCap || !editValues.perTransactionCap}
                        className="gap-1"
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        Update Caps
                      </Button>
                      
                      <Button
                        onClick={() => updateDuration(intent.address)}
                        disabled={isUpdating || !editValues.duration}
                        variant="outline"
                        className="gap-1"
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        Extend Duration
                      </Button>
                      
                      <Button
                        onClick={cancelEditing}
                        variant="ghost"
                        disabled={isUpdating}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}