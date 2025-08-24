'use client';

import { createConfig, getQuote, ChainId, executeRoute, Route, getChains, getTokens } from '@lifi/sdk';

export interface CrossChainTransaction {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  userAddress: string;
  recipient?: string;
}

export interface TransactionPreference {
  priority: 'fastest' | 'cheapest' | 'balanced';
  maxSlippage?: number;
  allowSwitchChain?: boolean;
}

export interface CrossChainQuote {
  route: Route;
  estimatedTime: number;
  estimatedGas: string;
  fees: {
    total: string;
    breakdown: Array<{
      name: string;
      amount: string;
      token: string;
    }>;
  };
}

class LiFiService {
  private isInitialized: boolean = false;
  private isMainnet: boolean = false;

  constructor() {
    this.checkEnvironment();
    if (this.isMainnet) {
      createConfig({
        integrator: 'ledgermind',
      });
      this.isInitialized = true;
    }
  }

  private checkEnvironment() {
    // Only enable LiFi on mainnet chains
    const currentChainId = typeof window !== 'undefined' 
      ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1328') 
      : 1328;
    
    // LiFi only supports mainnet chains - disable on testnets
    const mainnetChains = [1, 137, 42161, 10, 56, 43114, 250, 100]; // Major mainnet chains
    this.isMainnet = mainnetChains.includes(currentChainId);
    
    if (!this.isMainnet) {
      console.warn('LiFi cross-chain functionality is only available on mainnet');
    }
  }

  async getQuote(
    transaction: CrossChainTransaction, 
    preference: TransactionPreference
  ): Promise<CrossChainQuote> {
    if (!this.isMainnet) {
      throw new Error('Cross-chain functionality is only available on mainnet (Experimental Feature)');
    }
    
    if (!this.isInitialized) {
      throw new Error('LiFi service not initialized');
    }

    try {
      const quote = await getQuote({
        fromChain: transaction.fromChain,
        toChain: transaction.toChain,
        fromToken: transaction.fromToken,
        toToken: transaction.toToken,
        fromAmount: transaction.fromAmount,
        fromAddress: transaction.userAddress,
        toAddress: transaction.recipient || transaction.userAddress,
      });
      
      if (!quote) {
        throw new Error('No routes found for this cross-chain transaction');
      }
      
      // Calculate estimated time from quote
      const estimatedTime = this.calculateEstimatedTime(quote);
      
      // Calculate total fees from quote
      const totalFees = this.calculateQuoteFees(quote);

      return {
        route: quote as unknown as Route,
        estimatedTime,
        estimatedGas: totalFees.total,
        fees: {
          total: totalFees.total,
          breakdown: totalFees.breakdown
        }
      };

    } catch (error) {
      console.error('Failed to get LiFi quote:', error);
      throw new Error(`Cross-chain quote failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeTransaction(
    route: Route,
    userAddress: string,
    signer: any
  ): Promise<{ txHash: string; status: string }> {
    if (!this.isMainnet) {
      throw new Error('Cross-chain functionality is only available on mainnet (Experimental Feature)');
    }
    
    if (!this.isInitialized) {
      throw new Error('LiFi service not initialized');
    }

    try {
      // Note: executeRoute requires specific configuration and wallet integration
      // This is a simplified implementation for the experimental feature
      console.log('Executing cross-chain transaction (experimental):', route);
      
      // In a real implementation, this would:
      // 1. Configure wallet/signer properly
      // 2. Handle step-by-step execution
      // 3. Monitor transaction status
      // 4. Handle approvals and confirmations
      
      throw new Error('Cross-chain execution not yet implemented - requires mainnet and additional wallet integration');

    } catch (error) {
      console.error('Failed to execute cross-chain transaction:', error);
      throw new Error(`Cross-chain execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSupportedChains(): Promise<Array<{ id: number; name: string; nativeToken: string }>> {
    if (!this.isMainnet) {
      return [];
    }
    
    try {
      const chains = await getChains();
      return chains.map(chain => ({
        id: chain.id,
        name: chain.name,
        nativeToken: chain.nativeToken?.symbol || 'ETH'
      }));
    } catch (error) {
      console.error('Failed to get supported chains:', error);
      // Fallback to major mainnet chains
      return [
        { id: 1, name: 'Ethereum', nativeToken: 'ETH' },
        { id: 137, name: 'Polygon', nativeToken: 'MATIC' },
        { id: 42161, name: 'Arbitrum', nativeToken: 'ETH' },
        { id: 10, name: 'Optimism', nativeToken: 'ETH' },
      ];
    }
  }

  async getSupportedTokens(chainId: number): Promise<Array<{ address: string; symbol: string; name: string; decimals: number }>> {
    if (!this.isMainnet) {
      return [];
    }
    
    try {
      // Simplified token response for experimental feature
      // In real implementation, this would use the proper LiFi API
      const commonTokens = [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
        { address: '0xA0b86a33E6441b1B7dd4b8dd4Bd99eDbe8D57d29', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      ];
      
      // Return appropriate tokens based on chain
      switch (chainId) {
        case 1: // Ethereum
          return commonTokens;
        case 137: // Polygon
          return [
            { address: '0x0000000000000000000000000000000000000000', symbol: 'MATIC', name: 'Polygon', decimals: 18 },
            { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
          ];
        default:
          return [];
      }
    } catch (error) {
      console.error('Failed to get supported tokens:', error);
      return [];
    }
  }

  private getRouteOrder(priority: TransactionPreference['priority']): 'CHEAPEST' | 'FASTEST' | 'RECOMMENDED' {
    switch (priority) {
      case 'cheapest':
        return 'CHEAPEST';
      case 'fastest':
        return 'FASTEST';
      case 'balanced':
      default:
        return 'RECOMMENDED';
    }
  }

  private calculateEstimatedTime(quote: any): number {
    try {
      // Extract execution duration from quote
      if (quote.executionDuration) {
        return Math.ceil(quote.executionDuration / 60); // Convert to minutes
      }
      
      // Fallback based on quote data or default
      return quote.steps?.length > 1 ? 10 : 5; // Multi-step = longer time
    } catch (error) {
      return 5; // Default 5 minutes
    }
  }

  private calculateQuoteFees(quote: any): { total: string; breakdown: Array<{ name: string; amount: string; token: string }> } {
    const breakdown: Array<{ name: string; amount: string; token: string }> = [];
    let totalUSD = 0;

    try {
      // Extract gas costs from quote
      if (quote.gasCostUSD) {
        const gasAmount = parseFloat(quote.gasCostUSD);
        totalUSD += gasAmount;
        breakdown.push({
          name: 'Gas Fees',
          amount: gasAmount.toFixed(2),
          token: 'USD'
        });
      }

      // Extract bridge/protocol fees
      if (quote.feeCostUSD) {
        const feeAmount = parseFloat(quote.feeCostUSD);
        totalUSD += feeAmount;
        breakdown.push({
          name: 'Bridge/Protocol Fee',
          amount: feeAmount.toFixed(2),
          token: 'USD'
        });
      }

      // If no fee data, use minimum estimate
      if (totalUSD === 0) {
        totalUSD = 2.0; // Minimum $2 estimate for cross-chain
        breakdown.push({
          name: 'Estimated Total Fee',
          amount: '2.00',
          token: 'USD'
        });
      }

    } catch (error) {
      // Fallback if quote parsing fails
      totalUSD = 2.0;
      breakdown.push({
        name: 'Estimated Total Fee',
        amount: '2.00',
        token: 'USD'
      });
    }

    return {
      total: totalUSD.toFixed(2),
      breakdown
    };
  }

  isSupported(): boolean {
    return this.isInitialized;
  }
}

export const lifiService = new LiFiService();