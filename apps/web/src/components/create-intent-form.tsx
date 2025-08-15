'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { parseUnits } from 'viem';

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

export function CreateIntentForm() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const [formData, setFormData] = useState({
    agent: '',
    totalCap: '',
    perTxCap: '',
    days: '7',
    merchants: '',
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

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

    try {
      const totalCapWei = parseUnits(formData.totalCap, 6);
      const perTxCapWei = parseUnits(formData.perTxCap, 6);
      const now = Math.floor(Date.now() / 1000);
      const endTime = now + (parseInt(formData.days) * 24 * 60 * 60);
      
      const merchants = formData.merchants
        .split(',')
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0) as `0x${string}`[];

      const salt = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;

      const params = {
        token: USDC_ADDRESS,
        agent: formData.agent as `0x${string}`,
        totalCap: totalCapWei,
        perTxCap: perTxCapWei,
        start: BigInt(now),
        end: BigInt(endTime),
        merchants,
        metadataURI: `Payment Intent for AI Agent ${formData.agent}`,
        salt,
      };

      writeContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'createIntent',
        args: [params],
      });

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalCap">Total Cap (USDC)</Label>
              <Input
                id="totalCap"
                type="number"
                step="0.01"
                placeholder="1000"
                value={formData.totalCap}
                onChange={(e) => handleInputChange('totalCap', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="perTxCap">Per Transaction Cap (USDC)</Label>
              <Input
                id="perTxCap"
                type="number"
                step="0.01"
                placeholder="100"
                value={formData.perTxCap}
                onChange={(e) => handleInputChange('perTxCap', e.target.value)}
                required
              />
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
            <div className="text-sm text-muted-foreground">
              Transaction Hash: {hash}
            </div>
          )}

          {isConfirmed && (
            <div className="text-sm text-green-600">
              Payment intent created successfully!
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