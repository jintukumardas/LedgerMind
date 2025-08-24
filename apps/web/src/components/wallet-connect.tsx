'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { formatAddress } from '@/lib/utils';
import { NetworkStatus } from '@/components/network-status';
import { Wallet, LogOut } from 'lucide-react';

export function WalletConnect() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Fix hydration issues by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="w-full h-16 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Connected: {formatAddress(address)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => disconnect()}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </Button>
        </div>
        <NetworkStatus />
      </div>
    );
  }

  const handleConnect = async () => {
    const preferredConnector = connectors.find(c => c.name === 'MetaMask') || connectors[0];
    if (preferredConnector) {
      try {
        await connect({ connector: preferredConnector });
      } catch (error: any) {
        console.error('Connection failed:', error);
        // Error handling is managed by wagmi and will show in UI
      }
    }
  };

  const hasMetaMask = connectors.some(c => c.name === 'MetaMask');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Button
          onClick={handleConnect}
          disabled={isPending}
          className="gap-2 w-full"
        >
          <Wallet className="h-4 w-4" />
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </Button>
        
        {!hasMetaMask && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            <strong>MetaMask not detected.</strong> Please install MetaMask browser extension for the best experience with LedgerMind.
          </div>
        )}
      </div>
      
      {/* Show network info even when not connected */}
      <NetworkStatus />
    </div>
  );
}