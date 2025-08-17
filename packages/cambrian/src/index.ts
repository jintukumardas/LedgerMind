import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { seiTestnet } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

// Contract addresses
const FACTORY_ADDRESS = "0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7" as const;
const USDC_ADDRESS = "0x4fCF1784B31630811181f670Aea7A7bEF803eaED" as const;

// ABIs
const PAYMENT_INTENT_ABI = [
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
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const FACTORY_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"name": "token", "type": "address"},
          {"name": "agent", "type": "address"},
          {"name": "totalCap", "type": "uint256"},
          {"name": "perTxCap", "type": "uint256"},
          {"name": "start", "type": "uint64"},
          {"name": "end", "type": "uint64"},
          {"name": "merchants", "type": "address[]"},
          {"name": "metadataURI", "type": "string"},
          {"name": "salt", "type": "bytes32"}
        ],
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "createIntent",
    "outputs": [{"name": "intent", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export interface AgentConfig {
  privateKey: string;
  name?: string;
  description?: string;
}

export interface PaymentIntentParams {
  totalCapUSDC: number;
  perTxCapUSDC: number;
  durationDays: number;
  merchants?: string[];
  metadataURI?: string;
}

export interface PaymentRequest {
  recipient: string;
  amountUSDC: number;
  description?: string;
}

export class CambrianAgent {
  private account: ReturnType<typeof privateKeyToAccount>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient: ReturnType<typeof createWalletClient>;
  public readonly name: string;
  public readonly description: string;
  
  constructor(config: AgentConfig) {
    this.account = privateKeyToAccount(config.privateKey as `0x${string}`);
    this.name = config.name || `Agent-${this.account.address.slice(-6)}`;
    this.description = config.description || "Cambrian agent for LedgerMind payments";
    
    this.publicClient = createPublicClient({
      chain: seiTestnet,
      transport: http()
    });
    
    this.walletClient = createWalletClient({
      account: this.account,
      chain: seiTestnet,
      transport: http()
    });
  }

  getAddress(): string {
    return this.account.address;
  }

  async getBalances() {
    const [seiBalance, usdcBalance] = await Promise.all([
      this.publicClient.getBalance({ address: this.account.address }),
      this.publicClient.readContract({
        address: USDC_ADDRESS,
        abi: [
          {
            "inputs": [{"name": "account", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'balanceOf',
        args: [this.account.address]
      })
    ]);

    return {
      address: this.account.address,
      SEI: Number(seiBalance) / 1e18,
      USDC: Number(usdcBalance) / 1e6
    };
  }

  /**
   * Create a new payment intent for this agent
   */
  async createPaymentIntent(params: PaymentIntentParams): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const endTime = now + (params.durationDays * 24 * 60 * 60);
    
    const createParams = {
      token: USDC_ADDRESS,
      agent: this.account.address,
      totalCap: parseUnits(params.totalCapUSDC.toString(), 6),
      perTxCap: parseUnits(params.perTxCapUSDC.toString(), 6),
      start: BigInt(now),
      end: BigInt(endTime),
      merchants: params.merchants || [],
      metadataURI: params.metadataURI || `Payment Intent for ${this.name}`,
      salt: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`
    };

    const hash = await this.walletClient.writeContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'createIntent',
      args: [createParams]
    });

    console.log(`${this.name}: Created payment intent (tx: ${hash})`);
    return hash;
  }

  /**
   * Execute a payment through a payment intent
   */
  async executePayment(intentAddress: string, payment: PaymentRequest): Promise<string> {
    const amount = parseUnits(payment.amountUSDC.toString(), 6);
    const receiptHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;
    const receiptURI = payment.description || `Payment from ${this.name} - ${Date.now()}`;

    // First check intent balance
    const intentBalance = await this.publicClient.readContract({
      address: intentAddress as `0x${string}`,
      abi: PAYMENT_INTENT_ABI,
      functionName: 'getBalance'
    });

    if (intentBalance < amount) {
      throw new Error(`Insufficient intent balance. Has ${Number(intentBalance) / 1e6} USDC, needs ${payment.amountUSDC} USDC`);
    }

    const hash = await this.walletClient.writeContract({
      address: intentAddress as `0x${string}`,
      abi: PAYMENT_INTENT_ABI,
      functionName: 'execute',
      args: [payment.recipient as `0x${string}`, amount, receiptHash, receiptURI]
    });

    console.log(`${this.name}: Executed payment of ${payment.amountUSDC} USDC to ${payment.recipient} (tx: ${hash})`);
    return hash;
  }

  /**
   * Fund a payment intent with USDC
   */
  async fundIntent(intentAddress: string, amountUSDC: number): Promise<string> {
    const amount = parseUnits(amountUSDC.toString(), 6);

    const hash = await this.walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: [
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
      ],
      functionName: 'transfer',
      args: [intentAddress as `0x${string}`, amount]
    });

    console.log(`${this.name}: Funded intent ${intentAddress} with ${amountUSDC} USDC (tx: ${hash})`);
    return hash;
  }

  /**
   * Autonomous agent workflow: create intent, fund it, and execute payments
   */
  async executeAutonomousWorkflow(
    intentParams: PaymentIntentParams,
    fundingAmount: number,
    payments: PaymentRequest[]
  ): Promise<{
    intentTx: string;
    fundingTx: string;
    paymentTxs: string[];
  }> {
    console.log(`${this.name}: Starting autonomous payment workflow...`);
    
    // 1. Create payment intent
    const intentTx = await this.createPaymentIntent(intentParams);
    
    // Wait a bit for the transaction to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Fund the intent (assuming we have the intent address from events)
    // In a real implementation, we'd parse the event to get the intent address
    console.log(`${this.name}: Would fund intent with ${fundingAmount} USDC`);
    // const fundingTx = await this.fundIntent(intentAddress, fundingAmount);
    
    // 3. Execute payments
    const paymentTxs: string[] = [];
    for (const payment of payments) {
      console.log(`${this.name}: Would execute payment of ${payment.amountUSDC} USDC to ${payment.recipient}`);
      // const paymentTx = await this.executePayment(intentAddress, payment);
      // paymentTxs.push(paymentTx);
      
      // Wait between payments
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`${this.name}: Completed autonomous workflow!`);
    return {
      intentTx,
      fundingTx: "0x0", // Placeholder
      paymentTxs
    };
  }

  /**
   * Chat interface for the agent
   */
  async processMessage(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('balance')) {
      const balances = await this.getBalances();
      return `My current balances:\n- SEI: ${balances.SEI.toFixed(4)}\n- USDC: ${balances.USDC.toFixed(2)}\n- Address: ${balances.address}`;
    }
    
    if (lowerMessage.includes('create') && lowerMessage.includes('intent')) {
      return "I can create payment intents! Please specify:\n- Total cap (USDC)\n- Per transaction cap (USDC)\n- Duration (days)\n- Allowed merchants (optional)";
    }
    
    if (lowerMessage.includes('pay') || lowerMessage.includes('send')) {
      return "I can execute payments through payment intents! Please provide:\n- Recipient address\n- Amount (USDC)\n- Intent address to use";
    }
    
    if (lowerMessage.includes('help')) {
      return `Hi! I'm ${this.name}, a Cambrian agent for LedgerMind payments.\n\nI can:\n- Check my balances\n- Create payment intents\n- Execute payments\n- Fund payment intents\n- Run autonomous workflows\n\nJust ask me what you'd like to do!`;
    }
    
    return `${this.name}: I understand you said "${message}". I'm designed for payment operations on Sei blockchain. Type "help" to see what I can do!`;
  }
}

// Factory function for creating agents
export function createCambrianAgent(config: AgentConfig): CambrianAgent {
  return new CambrianAgent(config);
}

// Example usage and testing
if (import.meta.url === `file://${process.argv[1]}`) {
  async function main() {
    const agentKey = process.env.PRIVATE_KEY_AGENT;
    if (!agentKey) {
      throw new Error("Set PRIVATE_KEY_AGENT environment variable");
    }

    const agent = createCambrianAgent({
      privateKey: agentKey,
      name: "LedgerMind Demo Agent",
      description: "Demo agent for Sei AI Accelathon"
    });

    console.log(`Initialized ${agent.name} at ${agent.getAddress()}`);
    
    // Check balances
    const balances = await agent.getBalances();
    console.log("Balances:", balances);
    
    // Test chat interface
    const messages = [
      "Hello!",
      "What's my balance?",
      "How do I create an intent?",
      "Help me make a payment"
    ];
    
    for (const message of messages) {
      console.log(`User: ${message}`);
      const response = await agent.processMessage(message);
      console.log(`${agent.name}: ${response}\n`);
    }
  }
  
  main().catch(console.error);
}