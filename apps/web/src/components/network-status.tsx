'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNetwork } from '@/hooks/use-network';
import { AlertTriangle, CheckCircle, Plus, RefreshCw, Wifi } from 'lucide-react';

export function NetworkStatus() {
  const [mounted, setMounted] = useState(false);
  const {
    currentChainId,
    isOnSeiTestnet,
    networkName,
    isCheckingNetwork,
    isSwitchingNetwork,
    switchToSeiTestnet,
    addSeiTestnet,
  } = useNetwork();

  // Fix hydration issues by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-500">Checking network...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentChainId) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">Connect your wallet to check network</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isOnSeiTestnet) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">Connected to Sei Testnet</span>
              <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                Ready
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <CardTitle className="text-base text-red-900">Wrong Network</CardTitle>
        </div>
        <CardDescription className="text-red-700">
          You're connected to <strong>{networkName}</strong>. LedgerMind requires Sei Testnet.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => switchToSeiTestnet()}
            disabled={isSwitchingNetwork}
            size="sm"
            className="flex-1"
          >
            {isSwitchingNetwork ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Switching...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Switch to Sei Testnet
              </>
            )}
          </Button>
          
          <Button
            onClick={addSeiTestnet}
            disabled={isCheckingNetwork}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {isCheckingNetwork ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add to MetaMask
              </>
            )}
          </Button>
        </div>
        
        <div className="mt-3 p-3 bg-white rounded border border-red-200">
          <h4 className="text-sm font-medium text-red-900 mb-2">Why Sei Testnet?</h4>
          <ul className="text-xs text-red-700 space-y-1">
            <li>• Fast transactions with low fees</li>
            <li>• Safe testing environment with test tokens</li>
            <li>• Full compatibility with LedgerMind payment intents</li>
            <li>• All smart contracts deployed on Sei</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}