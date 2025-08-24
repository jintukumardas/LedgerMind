'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { networkManager, SEI_TESTNET_CONFIG } from '@/lib/network';
import { useToast } from '@/hooks/use-toast';

export function useNetwork() {
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const currentChainId = useChainId();
  const { toast } = useToast();

  const isOnSeiTestnet = currentChainId === SEI_TESTNET_CONFIG.chainId;
  const networkName = networkManager.getNetworkName(currentChainId);

  const switchToSeiTestnet = useCallback(async (showToast = true) => {
    setIsSwitchingNetwork(true);
    
    try {
      await networkManager.switchToSeiTestnet();
      
      if (showToast) {
        toast({
          title: "Network Switched",
          description: "Successfully switched to Sei Testnet",
        });
      }
      
      return true;
    } catch (error: any) {
      console.error('Network switch failed:', error);
      
      if (showToast) {
        let errorMessage = "Failed to switch to Sei Testnet";
        let actionMessage = "";

        if (error.message.includes('MetaMask not detected')) {
          errorMessage = "MetaMask Required";
          actionMessage = "Please install MetaMask browser extension to use this application.";
        } else if (error.message.includes('User rejected')) {
          errorMessage = "Network Switch Cancelled";
          actionMessage = "You cancelled the network switch. Please try again to use LedgerMind on Sei Testnet.";
        } else if (error.message.includes('already pending')) {
          errorMessage = "Network Switch in Progress";
          actionMessage = "Please check MetaMask and approve the pending network switch request.";
        } else if (error.message.includes('resource unavailable')) {
          errorMessage = "MetaMask Busy";
          actionMessage = "MetaMask is processing another request. Please wait and try again.";
        } else {
          actionMessage = "Please check your MetaMask connection and try again. If the issue persists, you may need to add Sei Testnet manually.";
        }

        toast({
          title: errorMessage,
          description: actionMessage,
          variant: "destructive",
        });
      }
      
      return false;
    } finally {
      setIsSwitchingNetwork(false);
    }
  }, [toast]);

  const addSeiTestnet = useCallback(async () => {
    setIsCheckingNetwork(true);
    
    try {
      await networkManager.addSeiTestnetToMetaMask();
      
      toast({
        title: "Network Added",
        description: "Sei Testnet has been added to MetaMask",
      });
      
      return true;
    } catch (error: any) {
      console.error('Failed to add network:', error);
      
      let errorMessage = "Failed to Add Network";
      let actionMessage = "Could not add Sei Testnet to MetaMask";

      if (error.message.includes('User rejected')) {
        errorMessage = "Network Addition Cancelled";
        actionMessage = "You cancelled adding Sei Testnet. Click 'Add to MetaMask' to try again.";
      } else if (error.message.includes('already exists')) {
        errorMessage = "Network Already Added";
        actionMessage = "Sei Testnet is already in your MetaMask. Try switching networks instead.";
      }

      toast({
        title: errorMessage,
        description: actionMessage,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsCheckingNetwork(false);
    }
  }, [toast]);

  // Auto-switch to Sei Testnet on mount if not already connected
  useEffect(() => {
    const autoSwitchNetwork = async () => {
      if (typeof window === 'undefined' || !window.ethereum) return;
      
      // Only auto-switch if we're not already on Sei Testnet
      if (!isOnSeiTestnet && currentChainId) {
        // Wait a bit for wallet connection to stabilize
        setTimeout(async () => {
          try {
            await switchToSeiTestnet(false); // Don't show success toast for auto-switch
          } catch (error) {
            // Silent fail for auto-switch
            console.log('Auto-switch to Sei Testnet failed, user will need to switch manually');
          }
        }, 1000);
      }
    };

    autoSwitchNetwork();
  }, [currentChainId, isOnSeiTestnet, switchToSeiTestnet]);

  return {
    currentChainId,
    isOnSeiTestnet,
    networkName,
    isCheckingNetwork,
    isSwitchingNetwork,
    switchToSeiTestnet,
    addSeiTestnet,
  };
}