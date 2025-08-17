import { ethers } from 'ethers';
import { createWalletClient, createPublicClient, http, isAddress, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { seiTestnet } from 'viem/chains';

// Get agent private key from environment or use a default demo key
const AGENT_PRIVATE_KEY = process.env.NEXT_PUBLIC_AGENT_PRIVATE_KEY;

export class AgentWallet {
  private account: ReturnType<typeof privateKeyToAccount>;
  private walletClient: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  
  constructor() {
    // Normalize and validate the provided key, or fall back to a temporary random key
    const normalizedKey = normalizePrivateKey(AGENT_PRIVATE_KEY);
    this.account = privateKeyToAccount(normalizedKey);
    this.walletClient = createWalletClient({
      account: this.account,
      chain: seiTestnet,
      transport: http()
    });
    this.publicClient = createPublicClient({
      chain: seiTestnet,
      transport: http()
    });
  }

  getAddress(): string {
    return this.account.address;
  }

  getWalletClient() {
    return this.walletClient;
  }

  async executePaymentIntent(
    intentAddress: `0x${string}`,
    merchant: `0x${string}`,
    amount: bigint,
    receiptHash: `0x${string}`,
    receiptURI: string
  ) {
    // Validate addresses first
    if (!isAddress(intentAddress)) {
      throw new Error(`Invalid payment intent address: ${intentAddress}. Please check the address format.`);
    }
    
    if (!isAddress(merchant)) {
      throw new Error(`Invalid merchant address: ${merchant}. Please verify the recipient address is correct.`);
    }

    // Normalize addresses to checksum format
    const normalizedIntentAddress = getAddress(intentAddress);
    const normalizedMerchant = getAddress(merchant);

    const INTENT_ABI = [
      {
        "inputs": [
          {"name": "merchant", "type": "address"},
          {"name": "amount", "type": "uint256"},
          {"name": "receiptHash", "type": "bytes32"},
          {"name": "receiptURI", "type": "string"}
        ],
        "name": "execute",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ] as const;

    try {
      const hash = await this.walletClient.writeContract({
        address: normalizedIntentAddress,
        abi: INTENT_ABI,
        functionName: 'execute',
        args: [normalizedMerchant, amount, receiptHash, receiptURI],
        account: this.account,
        chain: seiTestnet,
      });

      return hash;
    } catch (error) {
      console.error('Agent payment execution failed:', error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        let userMessage = '';
        
        if (error.message.includes('insufficient funds')) {
          userMessage = 'Insufficient funds in the payment intent. Please fund the intent or check the balance.';
        } else if (error.message.includes('reverted')) {
          userMessage = 'Transaction was rejected by the smart contract. This might be due to spending limits or intent status.';
        } else if (error.message.includes('network')) {
          userMessage = 'Network connection issue. Please check your internet connection and try again.';
        } else if (error.message.includes('InvalidAddressError')) {
          userMessage = 'Invalid address format. Please verify the recipient address is correct.';
        } else if (error.message.includes('gas')) {
          userMessage = 'Transaction failed due to gas issues. Please ensure you have enough SEI for gas fees.';
        } else {
          userMessage = 'Payment execution failed. Please check the payment intent status and try again.';
        }
        
        const enhancedError = new Error(userMessage);
        enhancedError.name = 'PaymentExecutionError';
        // Store original error for debugging
        (enhancedError as any).originalError = error.message;
        (enhancedError as any).intentAddress = normalizedIntentAddress;
        (enhancedError as any).merchant = normalizedMerchant;
        (enhancedError as any).amount = amount.toString();
        (enhancedError as any).agentAddress = this.getAddress();
        throw enhancedError;
      }
      
      throw new Error('Unknown error occurred during payment execution. Please try again.');
    }
  }

  async getBalance(): Promise<bigint> {
    const balance = await this.publicClient.getBalance({
      address: this.account.address
    });
    return balance;
  }

  async getUSDCBalance(): Promise<bigint> {
    const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
    if (!USDC_ADDRESS) {
      throw new Error('USDC address not configured');
    }

    const ERC20_ABI = [
      {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ] as const;

    try {
      const balance = await this.publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [this.account.address]
      });
      return balance;
    } catch (error) {
      console.error('Failed to get USDC balance:', error);
      return BigInt(0);
    }
  }

  async fundPaymentIntent(intentAddress: `0x${string}`, amount: bigint): Promise<`0x${string}`> {
    const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
    if (!USDC_ADDRESS) {
      throw new Error('USDC address not configured');
    }

    // Validate intent address
    if (!isAddress(intentAddress)) {
      throw new Error(`Invalid payment intent address: ${intentAddress}. Please verify the address is correct.`);
    }

    // Normalize address
    const normalizedIntentAddress = getAddress(intentAddress);

    const ERC20_ABI = [
      {
        "inputs": [
          {"name": "to", "type": "address"},
          {"name": "amount", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ] as const;

    try {
      const hash = await this.walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [normalizedIntentAddress, amount],
        account: this.account,
        chain: seiTestnet,
      });

      return hash;
    } catch (error) {
      console.error('Failed to fund payment intent:', error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        let userMessage = '';
        
        if (error.message.includes('insufficient funds')) {
          userMessage = 'Insufficient USDC balance to fund the payment intent. Please add USDC to your wallet.';
        } else if (error.message.includes('allowance')) {
          userMessage = 'USDC transfer not approved. Please approve the USDC spending first.';
        } else if (error.message.includes('InvalidAddressError')) {
          userMessage = 'Invalid payment intent address. Please verify the address is correct.';
        } else if (error.message.includes('network')) {
          userMessage = 'Network connection issue. Please check your internet connection and try again.';
        } else {
          userMessage = 'Failed to fund payment intent. Please check your balance and try again.';
        }
        
        const enhancedError = new Error(userMessage);
        enhancedError.name = 'FundingError';
        (enhancedError as any).originalError = error.message;
        (enhancedError as any).intentAddress = normalizedIntentAddress;
        (enhancedError as any).amount = amount.toString();
        throw enhancedError;
      }
      
      throw new Error('Unknown error occurred while funding payment intent. Please try again.');
    }
  }
}

// Normalize/validate a private key. If missing/invalid, generate a temporary random key.
function normalizePrivateKey(key: string | undefined): `0x${string}` {
  const trimmed = (key ?? '').trim();
  // If provided without 0x, prepend it
  const withPrefix = /^0x/i.test(trimmed) ? trimmed : (trimmed ? `0x${trimmed}` : trimmed);
  // Valid format: 0x + 64 hex chars
  const isValid = /^0x[0-9a-fA-F]{64}$/.test(withPrefix);
  if (isValid) return withPrefix as `0x${string}`;

  // Fallback: generate a temporary random wallet (likely unfunded) to avoid crashing the UI
  const temp = ethers.Wallet.createRandom();
  console.warn('[AgentWallet] NEXT_PUBLIC_AGENT_PRIVATE_KEY is missing or invalid. Using a temporary random key. Set apps/web/.env.local with NEXT_PUBLIC_AGENT_PRIVATE_KEY to persist an agent address.');
  return temp.privateKey as `0x${string}`;
}

// Export singleton instance
export const agentWallet = new AgentWallet();