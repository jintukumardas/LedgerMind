import { ethers } from "ethers";
import dotenv from "dotenv";
import { getOnChainTools } from "@goat-sdk/wallet-evm";
import { erc20Plugin } from "@goat-sdk/plugin-erc20";
import { Chain } from "@goat-sdk/core";

dotenv.config();

// Contract addresses from deployment
const FACTORY_ADDRESS = "0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7";
const USDC_ADDRESS = "0x4fCF1784B31630811181f670Aea7A7bEF803eaED";
const SEI_RPC_URL = "https://evm-rpc-testnet.sei-apis.com";

// Sei testnet chain configuration
const seiTestnet: Chain = {
  type: "evm",
  id: 1328,
  name: "Sei EVM Testnet",
  rpcUrls: {
    default: {
      http: [SEI_RPC_URL]
    }
  },
  nativeCurrency: {
    decimals: 18,
    name: "SEI",
    symbol: "SEI"
  },
  blockExplorers: {
    default: { name: "SeiTrace", url: "https://seitrace.com" }
  }
};

// Payment Intent Factory ABI (minimal for demonstration)
const FACTORY_ABI = [
  "function createIntent(address agent, uint256 totalCap, uint256 perTransactionCap, uint256 duration, address[] calldata allowedMerchants) external returns (address)",
  "function executePayment(address intent, address recipient, uint256 amount) external",
  "function getAgentIntents(address agent) external view returns (address[])"
];

export class LedgerMindAgent {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private factory: ethers.Contract;
  private goatTools: any;

  constructor(privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(SEI_RPC_URL);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, this.wallet);
  }

  async initialize() {
    try {
      // Initialize GOAT SDK tools
      this.goatTools = await getOnChainTools({
        wallet: this.wallet,
        plugins: [
          erc20Plugin({
            tokens: [
              {
                decimals: 6,
                symbol: "USDC",
                name: "USD Coin",
                address: USDC_ADDRESS,
                chain: seiTestnet
              }
            ]
          })
        ]
      });
      
      console.log(`Agent initialized with GOAT SDK tools`);
      console.log(`Agent address: ${this.wallet.address}`);
      const network = await this.provider.getNetwork();
      console.log(`Connected to Sei network: ${network.name} (${network.chainId})`);
      
      // List available tools
      if (this.goatTools) {
        const tools = Object.keys(this.goatTools);
        console.log(`Available GOAT tools: ${tools.join(', ')}`);
      }
    } catch (error) {
      console.warn("Failed to initialize GOAT SDK tools:", error);
      console.log("Continuing with basic functionality...");
    }
  }

  /**
   * Create a payment intent for the agent
   */
  async createPaymentIntent(
    totalCapUSDC: number,
    perTransactionCapUSDC: number,
    durationDays: number,
    allowedMerchants: string[] = []
  ): Promise<string> {
    try {
      // Convert USDC amounts (6 decimals)
      const totalCap = ethers.parseUnits(totalCapUSDC.toString(), 6);
      const perTransactionCap = ethers.parseUnits(perTransactionCapUSDC.toString(), 6);
      const duration = durationDays * 24 * 60 * 60; // Convert days to seconds

      console.log(`Creating payment intent:`, {
        agent: this.wallet.address,
        totalCapUSDC,
        perTransactionCapUSDC,
        durationDays,
        allowedMerchants: allowedMerchants.length
      });

      const tx = await this.factory.createIntent(
        this.wallet.address,
        totalCap,
        perTransactionCap,
        duration,
        allowedMerchants
      );

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not available");
      }
      console.log(`Payment intent created! Transaction: ${receipt.hash}`);
      
      // Get the intent address from events (simplified)
      return receipt.hash; // In real implementation, parse the event to get intent address
    } catch (error) {
      console.error("Failed to create payment intent:", error);
      throw error;
    }
  }

  /**
   * Execute a USDC payment through the payment intent system
   */
  async payWithUSDC(recipient: string, amountUSDC: number, intentAddress?: string): Promise<string> {
    try {
      const amount = ethers.parseUnits(amountUSDC.toString(), 6);
      
      if (intentAddress) {
        // Use payment intent for constrained spending
        const tx = await this.factory.executePayment(intentAddress, recipient, amount);
        const receipt = await tx.wait();
        if (!receipt) {
          throw new Error("Transaction receipt not available");
        }
        console.log(`USDC payment executed through intent: ${receipt.hash}`);
        return receipt.hash;
      } else {
        // Direct USDC transfer using GOAT SDK
        console.log(`Paying ${amountUSDC} USDC to ${recipient}`);
        
        if (this.goatTools && this.goatTools.transfer) {
          try {
            const result = await this.goatTools.transfer({
              to: recipient,
              amount: amountUSDC.toString(),
              token: "USDC"
            });
            console.log(`Direct USDC payment executed: ${result.hash}`);
            return result.hash;
          } catch (error) {
            console.error("GOAT SDK transfer failed:", error);
            throw new Error("Direct USDC transfers failed - consider using payment intents");
          }
        } else {
          throw new Error("GOAT SDK not available - use payment intents for secure transfers");
        }
      }
    } catch (error) {
      console.error("Failed to execute USDC payment:", error);
      throw error;
    }
  }

  /**
   * Execute a native SEI payment (for gas or direct transfers)
   */
  async payWithSEI(recipient: string, amountSEI: number): Promise<string> {
    try {
      const amount = ethers.parseEther(amountSEI.toString());
      
      console.log(`Paying ${amountSEI} SEI to ${recipient}`);
      
      const tx = await this.wallet.sendTransaction({
        to: recipient,
        value: amount
      });

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not available");
      }
      console.log(`SEI payment executed: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      console.error("Failed to execute SEI payment:", error);
      throw error;
    }
  }

  /**
   * Get agent's payment intents
   */
  async getMyIntents(): Promise<string[]> {
    try {
      const intents = await this.factory.getAgentIntents(this.wallet.address);
      console.log(`Agent has ${intents.length} payment intents`);
      return intents;
    } catch (error) {
      console.error("Failed to get agent intents:", error);
      throw error;
    }
  }

  /**
   * Check balances
   */
  async getBalances() {
    try {
      const seiBalance = await this.provider.getBalance(this.wallet.address);
      const usdcContract = new ethers.Contract(
        USDC_ADDRESS,
        ["function balanceOf(address) view returns (uint256)"],
        this.provider
      );
      const usdcBalance = await usdcContract.balanceOf(this.wallet.address);

      return {
        SEI: ethers.formatEther(seiBalance),
        USDC: ethers.formatUnits(usdcBalance, 6),
        address: this.wallet.address
      };
    } catch (error) {
      console.error("Failed to get balances:", error);
      throw error;
    }
  }
}

// Example usage
export async function createAgent(privateKey?: string): Promise<LedgerMindAgent> {
  const agentKey = privateKey || process.env.PRIVATE_KEY_AGENT;
  
  if (!agentKey) {
    throw new Error("Agent private key not provided. Set PRIVATE_KEY_AGENT environment variable.");
  }

  const agent = new LedgerMindAgent(agentKey);
  await agent.initialize();
  
  return agent;
}

// CLI interface for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  async function main() {
    try {
      const agent = await createAgent();
      
      // Show balances
      const balances = await agent.getBalances();
      console.log("Agent balances:", balances);
      
      // Example: Create a payment intent
      // await agent.createPaymentIntent(1000, 100, 7); // $1000 total, $100 per tx, 7 days
      
      // Example: Make a payment
      // await agent.payWithSEI("0x...", 0.1); // Send 0.1 SEI
      
    } catch (error) {
      console.error("Agent error:", error);
      process.exit(1);
    }
  }
  
  main();
}