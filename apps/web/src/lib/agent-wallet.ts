import { ethers } from 'ethers';
import { createWalletClient, createPublicClient, http } from 'viem';
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
        address: intentAddress,
        abi: INTENT_ABI,
        functionName: 'execute',
        args: [merchant, amount, receiptHash, receiptURI],
      });

      return hash;
    } catch (error) {
      console.error('Agent payment execution failed:', error);
      
      // Add more context to the error for better debugging
      if (error instanceof Error) {
        const enhancedError = new Error(error.message);
        enhancedError.name = error.name;
        enhancedError.stack = error.stack;
        // Add additional context
        (enhancedError as any).intentAddress = intentAddress;
        (enhancedError as any).merchant = merchant;
        (enhancedError as any).amount = amount.toString();
        (enhancedError as any).agentAddress = this.getAddress();
        throw enhancedError;
      }
      
      throw error;
    }
  }

  async getBalance(): Promise<bigint> {
    const balance = await this.walletClient.getBalance({
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
        args: [intentAddress, amount]
      });

      return hash;
    } catch (error) {
      console.error('Failed to fund payment intent:', error);
      throw error;
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