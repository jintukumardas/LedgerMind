import { ethers } from 'ethers';
import { config } from '../config.js';

// ABI for PaymentIntentFactory
export const FACTORY_ABI = [
  "function createIntent((address token, address agent, uint256 totalCap, uint256 perTxCap, uint64 start, uint64 end, address[] merchants, string metadataURI, bytes32 salt) params) external returns (address intent)",
  "function predictIntent(address payer, bytes32 salt) external view returns (address)",
  "function getImplementation() external view returns (address)",
  "function getPayerIntents(address payer) external view returns (address[])",
  "function getAgentIntents(address agent) external view returns (address[])",
  "function totalIntents() external view returns (uint256)",
  "event IntentCreated(address indexed payer, address indexed intent, address indexed agent, bytes32 salt)"
] as const;

// ABI for PaymentIntent
export const INTENT_ABI = [
  "function execute(address merchant, uint256 amount, bytes32 receiptHash, string receiptURI) external",
  "function revoke(string reason) external",
  "function topUp(uint256 amount) external",
  "function withdrawRemainder(address to) external",
  "function updateMerchant(address merchant, bool allowed) external",
  "function state() external view returns (uint8)",
  "function payer() external view returns (address)",
  "function agent() external view returns (address)",
  "function token() external view returns (address)",
  "function limits() external view returns ((uint256 totalCap, uint256 perTxCap, uint256 spent, uint64 start, uint64 end))",
  "function isMerchantAllowed(address merchant) external view returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getRemainingCap() external view returns (uint256)",
  "function getTimeRemaining() external view returns (uint256)",
  "event Executed(address indexed agent, address indexed merchant, address indexed token, uint256 amount, bytes32 receiptHash, string receiptURI)",
  "event Revoked(address indexed by, string reason)",
  "event ToppedUp(uint256 amount)",
  "event Withdrawn(address indexed to, uint256 amount)",
  "event MerchantUpdated(address indexed merchant, bool allowed)"
] as const;

// ERC20 ABI
export const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)"
] as const;

export class BlockchainClient {
  private provider: ethers.JsonRpcProvider;
  private payerWallet: ethers.Wallet;
  private agentWallet?: ethers.Wallet;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.payerWallet = new ethers.Wallet(config.privateKeyPayer, this.provider);
    
    if (config.privateKeyAgent) {
      this.agentWallet = new ethers.Wallet(config.privateKeyAgent, this.provider);
    }
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getPayerWallet(): ethers.Wallet {
    return this.payerWallet;
  }

  getAgentWallet(): ethers.Wallet | undefined {
    return this.agentWallet;
  }

  getFactoryContract(): ethers.Contract {
    return new ethers.Contract(config.factoryAddress, FACTORY_ABI, this.payerWallet);
  }

  getIntentContract(address: string, signer?: ethers.Wallet): ethers.Contract {
    const useSigner = signer || this.payerWallet;
    return new ethers.Contract(address, INTENT_ABI, useSigner);
  }

  getTokenContract(address: string, signer?: ethers.Wallet): ethers.Contract {
    const useSigner = signer || this.payerWallet;
    return new ethers.Contract(address, ERC20_ABI, useSigner);
  }

  async getBlock(blockNumber?: number): Promise<ethers.Block> {
    const block = await this.provider.getBlock(blockNumber || 'latest');
    if (!block) {
      throw new Error(`Block not found: ${blockNumber || 'latest'}`);
    }
    return block;
  }

  async waitForTransaction(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.waitForTransaction(txHash);
  }

  parseUnits(value: string, decimals: number = 6): bigint {
    return ethers.parseUnits(value, decimals);
  }

  formatUnits(value: bigint, decimals: number = 6): string {
    return ethers.formatUnits(value, decimals);
  }

  keccak256(data: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  async getGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice || ethers.parseUnits('20', 'gwei');
  }

  async estimateGas(contract: ethers.Contract, method: string, args: any[]): Promise<bigint> {
    try {
      return await contract[method].estimateGas(...args);
    } catch (error) {
      console.warn(`Gas estimation failed for ${method}:`, error);
      return BigInt(500000); // Default fallback
    }
  }
}

export const blockchainClient = new BlockchainClient();