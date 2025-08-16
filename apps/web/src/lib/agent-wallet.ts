import { ethers } from 'ethers';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { seiTestnet } from 'viem/chains';

// Get agent private key from environment or use a default demo key
const AGENT_PRIVATE_KEY = process.env.NEXT_PUBLIC_AGENT_PRIVATE_KEY || '0x2c8b4c4c7c8b4c4c7c8b4c4c7c8b4c4c7c8b4c4c7c8b4c4c7c8b4c4c7c8b4c4c';

export class AgentWallet {
  private account: ReturnType<typeof privateKeyToAccount>;
  private walletClient: ReturnType<typeof createWalletClient>;
  
  constructor() {
    this.account = privateKeyToAccount(AGENT_PRIVATE_KEY as `0x${string}`);
    this.walletClient = createWalletClient({
      account: this.account,
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
      throw error;
    }
  }

  async getBalance(): Promise<bigint> {
    const balance = await this.walletClient.getBalance({
      address: this.account.address
    });
    return balance;
  }
}

// Export singleton instance
export const agentWallet = new AgentWallet();