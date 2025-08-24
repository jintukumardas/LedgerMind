'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTransactionHistory } from '@/hooks/use-transaction-history';
import { parseUnits } from 'viem';
import { getExplorerUrl, formatTransactionHash } from '@/lib/explorer';
import { ExternalLink } from 'lucide-react';

const FACTORY_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"name": "token", "type": "address"},
          {"name": "agent", "type": "address"},
          {"name": "totalCap", "type": "uint256"},
          {"name": "perTxCap", "type": "uint256"},
          {"name": "start", "type": "uint64"},
          {"name": "end", "type": "uint64"},
          {"name": "merchants", "type": "address[]"},
          {"name": "metadataURI", "type": "string"},
          {"name": "salt", "type": "bytes32"}
        ],
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "createIntent",
    "outputs": [{"name": "intent", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
const SEI_ADDRESS = '0x0000000000000000000000000000000000000000'; // Use zero address for native SEI

interface CreateIntentFormProps {
  onIntentCreated?: () => void;
}

export function CreateIntentForm({ onIntentCreated }: CreateIntentFormProps) {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const { addTransaction } = useTransactionHistory();
  const chainId = useChainId();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const [formData, setFormData] = useState({
    agent: '',
    totalCap: '',
    perTxCap: '',
    days: '7',
    merchants: '',
    token: 'USDC', // Default to USDC
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      // Record the transaction in history
      addTransaction({
        hash: hash,
        type: 'creation',
        description: `Created Payment Intent: $${formData.totalCap} USDC`,
        amount: 0, // Intent creation doesn't cost USDC
        token: 'SEI',
        from: address || '',
        to: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '',
      });
      
      const explorerUrl = getExplorerUrl(chainId, hash);
      toast.success("Payment Intent Created!", `Transaction: ${formatTransactionHash(hash)}`);
      
      // Show another toast with explorer link
      toast({
        title: "View Transaction",
        description: "Click to view in explorer",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(explorerUrl, '_blank')}
            className="gap-1"
          >
            View TX <ExternalLink className="h-3 w-3" />
          </Button>
        )
      });
      
      // Reset form
      setFormData({
        agent: '',
        totalCap: '',
        perTxCap: '',
        days: '7',
        merchants: '',
        token: 'USDC',
      });
      
      // Trigger refresh of intents list
      if (onIntentCreated) {
        onIntentCreated();
      }
    }
  }, [isConfirmed, hash, chainId, toast, onIntentCreated]);

  const validateForm = () => {
    const errors = [];
    
    if (!formData.agent || !formData.agent.match(/^0x[a-fA-F0-9]{40}$/)) {
      errors.push("Agent address must be a valid Ethereum address");
    }
    
    if (!formData.totalCap || parseFloat(formData.totalCap) <= 0) {
      errors.push("Total cap must be greater than 0");
    }
    
    if (!formData.perTxCap || parseFloat(formData.perTxCap) <= 0) {
      errors.push("Per transaction cap must be greater than 0");
    }
    
    if (parseFloat(formData.perTxCap) > parseFloat(formData.totalCap)) {
      errors.push("Per transaction cap cannot exceed total cap");
    }
    
    if (!formData.days || parseInt(formData.days) < 1 || parseInt(formData.days) > 365) {
      errors.push("Duration must be between 1 and 365 days");
    }
    
    if (formData.merchants) {
      const merchantAddresses = formData.merchants.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0);
      for (const addr of merchantAddresses) {
        if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
          errors.push(`Invalid merchant address: ${addr}`);
          break;
        }
      }
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!FACTORY_ADDRESS) {
      toast({
        title: "Configuration error",
        description: "Factory address not configured",
        variant: "destructive",
      });
      return;
    }

    // Validate form data
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors[0],
        variant: "destructive",
      });
      return;
    }

    try {
      const isNativeSEI = formData.token === 'SEI';
      
      // Prevent native SEI token creation since the contract doesn't support it
      if (isNativeSEI) {
        toast({
          title: "Native SEI Not Supported",
          description: "Payment intents currently only support ERC-20 tokens like USDC",
          variant: "destructive",
        });
        return;
      }
      
      const decimals = isNativeSEI ? 18 : 6; // SEI has 18 decimals, USDC has 6
      const tokenAddress = isNativeSEI ? SEI_ADDRESS : USDC_ADDRESS;
      
      const totalCapWei = parseUnits(formData.totalCap, decimals);
      const perTxCapWei = parseUnits(formData.perTxCap, decimals);
      const now = Math.floor(Date.now() / 1000);
      const endTime = now + (parseInt(formData.days) * 24 * 60 * 60);
      
      const merchants = formData.merchants
        .split(',')
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0) as `0x${string}`[];

      const salt = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;

      const params = {
        token: tokenAddress,
        agent: formData.agent as `0x${string}`,
        totalCap: totalCapWei,
        perTxCap: perTxCapWei,
        start: BigInt(now),
        end: BigInt(endTime),
        merchants,
        metadataURI: `Payment Intent for AI Agent ${formData.agent} (${formData.token})`,
        salt,
      };

      writeContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'createIntent',
        args: [params],
      });

      // Show initial notification
      toast.success("Transaction Submitted", "Creating your payment intent...");

    } catch (err) {
      console.error('Error creating intent:', err);
      toast({
        title: "Error",
        description: "Failed to create payment intent",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Payment Intent</CardTitle>
          <CardDescription>
            Connect your wallet to create a new payment intent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please connect your wallet first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Payment Intent</CardTitle>
        <CardDescription>
          Set up spending limits and constraints for your AI agent
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="agent">Agent Address</Label>
            <Input
              id="agent"
              placeholder="0x..."
              value={formData.agent}
              onChange={(e) => handleInputChange('agent', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="token">Token Type</Label>
            <select
              id="token"
              value={formData.token}
              onChange={(e) => handleInputChange('token', e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              required
            >
              <option value="USDC">USDC (Stablecoin)</option>
              {/* <option value="SEI">SEI (Native Token)</option> */}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.token === 'USDC' ? 
                'USDC stablecoin with 6 decimals precision' : 
                'Native SEI token with 18 decimals precision'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalCap">Total Cap ({formData.token})</Label>
              <Input
                id="totalCap"
                type="number"
                step={formData.token === 'SEI' ? '0.000001' : '0.01'}
                placeholder={formData.token === 'SEI' ? '10' : '1000'}
                value={formData.totalCap}
                onChange={(e) => handleInputChange('totalCap', e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.token === 'SEI' ? 'Maximum SEI tokens the agent can spend' : 'Maximum USDC the agent can spend'}
              </p>
            </div>
            <div>
              <Label htmlFor="perTxCap">Per Transaction Cap ({formData.token})</Label>
              <Input
                id="perTxCap"
                type="number"
                step={formData.token === 'SEI' ? '0.000001' : '0.01'}
                placeholder={formData.token === 'SEI' ? '1' : '100'}
                value={formData.perTxCap}
                onChange={(e) => handleInputChange('perTxCap', e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.token === 'SEI' ? 'Maximum SEI per transaction' : 'Maximum USDC per transaction'}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="days">Duration (Days)</Label>
            <Input
              id="days"
              type="number"
              min="1"
              max="365"
              value={formData.days}
              onChange={(e) => handleInputChange('days', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="merchants">Merchant Addresses (Optional)</Label>
            <Input
              id="merchants"
              placeholder="0x..., 0x... (comma-separated)"
              value={formData.merchants}
              onChange={(e) => handleInputChange('merchants', e.target.value)}
            />
          </div>

          <Button 
            type="submit" 
            disabled={isPending || isConfirming}
            className="w-full"
          >
            {isPending ? 'Confirming...' : isConfirming ? 'Creating...' : 'Create Intent'}
          </Button>

          {hash && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Transaction: {formatTransactionHash(hash)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(getExplorerUrl(chainId, hash), '_blank')}
                className="h-auto p-1 hover:text-primary"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}

          {isConfirmed && (
            <div className="text-sm text-green-600 font-medium">
              ✅ Payment intent created successfully!
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600">
              Error: {error.message}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}