'use client';

export const SEI_TESTNET_CONFIG = {
  chainId: 1328,
  chainName: 'Sei Testnet',
  nativeCurrency: {
    name: 'SEI',
    symbol: 'SEI',
    decimals: 18,
  },
  rpcUrls: [
    'https://evm-rpc-testnet.sei-apis.com',
    'https://evm-rpc.sei-apis.com'
  ],
  blockExplorerUrls: [
    'https://seitrace.com'
  ],
  iconUrls: [
    'https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png'
  ]
};

export const SEI_MAINNET_CONFIG = {
  chainId: 531,
  chainName: 'Sei Network',
  nativeCurrency: {
    name: 'SEI',
    symbol: 'SEI',
    decimals: 18,
  },
  rpcUrls: [
    'https://evm-rpc.sei-apis.com'
  ],
  blockExplorerUrls: [
    'https://seitrace.com'
  ],
  iconUrls: [
    'https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png'
  ]
};

export class NetworkManager {
  private static instance: NetworkManager;
  
  private constructor() {}
  
  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  async switchToSeiTestnet(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not detected');
    }

    try {
      // Try to switch to Sei Testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${SEI_TESTNET_CONFIG.chainId.toString(16)}` }],
      });
      
      console.log('Successfully switched to Sei Testnet');
      return true;
    } catch (switchError: any) {
      // Network not added to MetaMask
      if (switchError.code === 4902) {
        return await this.addSeiTestnetToMetaMask();
      }
      
      console.error('Failed to switch to Sei Testnet:', switchError);
      throw new Error(`Failed to switch network: ${switchError.message}`);
    }
  }

  async addSeiTestnetToMetaMask(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not detected');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${SEI_TESTNET_CONFIG.chainId.toString(16)}`,
          chainName: SEI_TESTNET_CONFIG.chainName,
          nativeCurrency: SEI_TESTNET_CONFIG.nativeCurrency,
          rpcUrls: SEI_TESTNET_CONFIG.rpcUrls,
          blockExplorerUrls: SEI_TESTNET_CONFIG.blockExplorerUrls,
          iconUrls: SEI_TESTNET_CONFIG.iconUrls,
        }],
      });

      console.log('Successfully added Sei Testnet to MetaMask');
      return true;
    } catch (addError: any) {
      console.error('Failed to add Sei Testnet to MetaMask:', addError);
      throw new Error(`Failed to add network: ${addError.message}`);
    }
  }

  async switchToSeiMainnet(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not detected');
    }

    try {
      // Try to switch to Sei Mainnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${SEI_MAINNET_CONFIG.chainId.toString(16)}` }],
      });
      
      console.log('Successfully switched to Sei Mainnet');
      return true;
    } catch (switchError: any) {
      // Network not added to MetaMask
      if (switchError.code === 4902) {
        return await this.addSeiMainnetToMetaMask();
      }
      
      console.error('Failed to switch to Sei Mainnet:', switchError);
      throw new Error(`Failed to switch network: ${switchError.message}`);
    }
  }

  async addSeiMainnetToMetaMask(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not detected');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${SEI_MAINNET_CONFIG.chainId.toString(16)}`,
          chainName: SEI_MAINNET_CONFIG.chainName,
          nativeCurrency: SEI_MAINNET_CONFIG.nativeCurrency,
          rpcUrls: SEI_MAINNET_CONFIG.rpcUrls,
          blockExplorerUrls: SEI_MAINNET_CONFIG.blockExplorerUrls,
          iconUrls: SEI_MAINNET_CONFIG.iconUrls,
        }],
      });

      console.log('Successfully added Sei Mainnet to MetaMask');
      return true;
    } catch (addError: any) {
      console.error('Failed to add Sei Mainnet to MetaMask:', addError);
      throw new Error(`Failed to add network: ${addError.message}`);
    }
  }

  async getCurrentChainId(): Promise<number | null> {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null;
    }

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return parseInt(chainId, 16);
    } catch (error) {
      console.error('Failed to get current chain ID:', error);
      return null;
    }
  }

  async isOnSeiTestnet(): Promise<boolean> {
    const currentChainId = await this.getCurrentChainId();
    return currentChainId === SEI_TESTNET_CONFIG.chainId;
  }

  async isOnSeiMainnet(): Promise<boolean> {
    const currentChainId = await this.getCurrentChainId();
    return currentChainId === SEI_MAINNET_CONFIG.chainId;
  }

  async isOnSeiNetwork(): Promise<boolean> {
    return (await this.isOnSeiTestnet()) || (await this.isOnSeiMainnet());
  }

  getNetworkName(chainId: number): string {
    switch (chainId) {
      case SEI_TESTNET_CONFIG.chainId:
        return 'Sei Testnet';
      case SEI_MAINNET_CONFIG.chainId:
        return 'Sei Mainnet';
      case 1:
        return 'Ethereum Mainnet';
      case 137:
        return 'Polygon';
      case 42161:
        return 'Arbitrum One';
      case 10:
        return 'Optimism';
      default:
        return `Chain ${chainId}`;
    }
  }
}

export const networkManager = NetworkManager.getInstance();

// Window ethereum interface extension for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}