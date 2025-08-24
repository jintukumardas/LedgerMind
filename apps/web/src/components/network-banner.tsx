'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/hooks/use-network';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';

export function NetworkBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { isConnected } = useAccount();
  const {
    isOnSeiTestnet,
    networkName,
    isSwitchingNetwork,
    switchToSeiTestnet,
  } = useNetwork();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || dismissed || !isConnected || isOnSeiTestnet) {
    return null;
  }

  return (
    <div className="bg-red-600 text-white py-3 px-4 sticky top-0 z-50 border-b border-red-700">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-200" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-medium">Wrong Network:</span>
            <span className="text-red-100">
              You're on <strong>{networkName}</strong>. Switch to Sei Testnet to use LedgerMind.
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => switchToSeiTestnet()}
            disabled={isSwitchingNetwork}
            size="sm"
            className="bg-white text-red-600 hover:bg-red-50 border border-white"
          >
            {isSwitchingNetwork ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Switching...
              </>
            ) : (
              'Switch Network'
            )}
          </Button>
          
          <Button
            onClick={() => setDismissed(true)}
            variant="ghost"
            size="sm"
            className="text-red-200 hover:text-white hover:bg-red-700 p-1"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
}