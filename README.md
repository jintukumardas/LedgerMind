# 🤖 LedgerMind - AI Agent Payment Intents

[![Sei Blockchain](https://img.shields.io/badge/Sei-Network-red?style=for-the-badge)](https://www.sei.io/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue?style=for-the-badge)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)

> **Safe, on-chain spending accounts for AI agents with transparent audit trails**

LedgerMind solves the trust problem in autonomous AI agent commerce by creating secure, limited-scope payment intents with full transparency and user control.

## 🎯 **Problem Statement**

AI agents need to make payments autonomously, but current solutions are either:
- **Unsafe**: Sharing private keys or unlimited allowances
- **Inefficient**: Requiring manual approval for every transaction  
- **Opaque**: No clear audit trail of agent actions

## 💡 **Our Solution**

**Agent Payment Intents** - Think "Stripe for AI Agents" with these key features:

- ✅ **Spending Limits**: Total caps and per-transaction limits
- ✅ **Time Constraints**: Start/end dates for automatic expiry
- ✅ **Merchant Allowlists**: Restrict payments to approved addresses
- ✅ **Verifiable Receipts**: Every payment links to the exact AI action that triggered it
- ✅ **Instant Revocation**: Full user control to stop agent spending
- ✅ **MCP Integration**: Native support for Claude, Cursor, and other AI tools

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Agent      │    │  Payment Intent  │    │   Merchant      │
│                 │    │  Smart Contract  │    │                 │
│ Claude/Cursor   │────┤                  ├────│ DeFi/Commerce   │
│ ElizaOS/GOAT    │    │ • Spending Caps  │    │ Service         │
│                 │    │ • Time Limits    │    │                 │
└─────────────────┘    │ • Allowlists     │    └─────────────────┘
                       │ • Audit Trail    │              
┌─────────────────┐    └──────────────────┘    ┌─────────────────┐
│   User/Payer    │                            │   IPFS/Arweave  │
│                 │                            │                 │
│ Controls Limits │                            │ Receipt Storage │
│ Reviews Receipts│                            │ Action Context  │ 
└─────────────────┘                            └─────────────────┘
```

## 🚀 **Quick Start**

### Prerequisites

- Node.js 20+
- Git
- A Sei wallet with testnet SEI and USDC

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/ledgermind.git
cd ledgermind
```

### 2. Install Dependencies

```bash
# Automated installation
./install.sh

# Or manual installation - see SETUP.md for details
```

### 3. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Required: Blockchain Configuration
SEI_RPC_HTTP=https://rpc-evm-atlantic-2.seitrace.com
PRIVATE_KEY_DEPLOYER=your_deployer_private_key
PRIVATE_KEY_PAYER=your_payer_private_key  
PRIVATE_KEY_AGENT=your_agent_private_key

# Contract addresses (will be filled after deployment)
FACTORY_ADDRESS=
USDC_ADDRESS=0x4fCF1784B31630811181f670Aea7A7bEF803eaED

# Optional: Enhanced Features  
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_API_KEY=your_infura_project_id
IPFS_API_SECRET=your_infura_secret
```

### 4. Deploy Smart Contracts

```bash
# Install Foundry dependencies
forge install

# Deploy to Sei testnet
forge script script/Deploy.s.sol --rpc-url $SEI_RPC_HTTP --private-key $PRIVATE_KEY_DEPLOYER --broadcast

# Update .env with deployed FACTORY_ADDRESS
```

### 5. Run the MCP Server

```bash
cd packages/mcp
npm install
npm run build
npm start
```

### 6. Launch the Frontend

```bash
cd apps/web
npm install  
npm run dev
```

Visit `http://localhost:3000` to access the dashboard!

## 🎮 **Usage Examples**

### Creating a Payment Intent

```typescript
// Via MCP (for AI agents)
const intent = await mcpClient.callTool('create_intent', {
  token: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED', // USDC
  agent: '0x...', // Agent wallet address
  total_cap: '1000000000', // 1000 USDC (6 decimals)
  per_tx_cap: '100000000',  // 100 USDC per transaction
  start: Math.floor(Date.now() / 1000),
  end: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  merchants: ['0x...', '0x...'], // Allowed merchant addresses
  salt: 'unique-salt',
  deposit_amount: '500000000' // 500 USDC initial deposit
});
```

### Executing a Payment

```typescript
// Agent makes a payment
await mcpClient.callTool('execute_payment', {
  intent: '0x...', // Intent contract address
  merchant: '0x...', // Merchant to pay
  amount: '50000000', // 50 USDC
  receipt_blob: {
    tool: 'purchase_api_credits',
    inputHash: 'sha256(...)',
    outputHash: 'sha256(...)', 
    signer: 'agent-wallet-address',
    nonce: 'unique-nonce',
    timestamp: Date.now(),
    chainId: 1328,
    context: { /* Full AI action context */ }
  }
});
```

## 🛠️ **Development**

### Project Structure

```
ledgermind/
├── contracts/              # Solidity smart contracts
│   ├── PaymentIntent.sol   # Core payment logic
│   ├── PaymentIntentFactory.sol # Factory pattern
│   └── interfaces/         # Contract interfaces
├── test/                   # Foundry tests (19 passing)
├── packages/mcp/           # Model Context Protocol server
│   ├── src/tools/         # MCP tools (5 implemented)
│   ├── src/blockchain/    # Blockchain client
│   ├── src/database/      # PostgreSQL indexer
│   └── src/services/      # IPFS and other services
├── apps/web/              # Next.js frontend dashboard
│   ├── src/app/          # App router pages
│   ├── src/components/   # Reusable UI components
│   └── src/lib/          # Utilities and configs
└── script/               # Deployment scripts
```

### Running Tests

```bash
# Smart contract tests
forge test -vv

# MCP server tests  
cd packages/mcp && npm test

# Frontend tests
cd apps/web && npm test
```

## 🌐 **Deployment**

### Vercel Deployment

1. **Fork this repository**
2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your forked repository
   - Set the root directory to `apps/web`

3. **Configure Environment Variables**:
   ```bash
   NEXT_PUBLIC_CHAIN_ID=1328
   NEXT_PUBLIC_RPC_URL=https://rpc-evm-atlantic-2.seitrace.com
   NEXT_PUBLIC_FACTORY_ADDRESS=your_deployed_factory_address
   NEXT_PUBLIC_USDC_ADDRESS=0x4fCF1784B31630811181f670Aea7A7bEF803eaED
   ```

4. **Deploy**: Vercel will automatically build and deploy your application

### Railway/Render Deployment (MCP Server)

Deploy the MCP server to Railway or Render:

```yaml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "cd packages/mcp && npm install && npm run build"

[deploy]
startCommand = "cd packages/mcp && npm start"
```

## 🔧 **Configuration**

### Sei Network Setup

Add Sei testnet to your wallet:

```json
{
  "chainId": "0x530",
  "chainName": "Sei Testnet",
  "rpcUrls": ["https://rpc-evm-atlantic-2.seitrace.com"],
  "nativeCurrency": {
    "name": "SEI",
    "symbol": "SEI", 
    "decimals": 18
  },
  "blockExplorerUrls": ["https://seitrace.com"]
}
```

### MCP Integration with Claude

Add to your Claude MCP settings:

```json
{
  "mcpServers": {
    "ledgermind": {
      "command": "node",
      "args": ["/path/to/ledgermind/packages/mcp/dist/index.js"],
      "env": {
        "SEI_RPC_HTTP": "https://rpc-evm-atlantic-2.seitrace.com",
        "FACTORY_ADDRESS": "your_deployed_factory_address",
        "PRIVATE_KEY_AGENT": "your_agent_private_key"
      }
    }
  }
}
```

## 🔐 **Security**

### Smart Contract Security

- ✅ **Reentrancy Protection**: Using OpenZeppelin's `ReentrancyGuard`
- ✅ **Access Control**: Strict payer/agent permission checks
- ✅ **Integer Overflow**: Solidity 0.8.26 built-in protection
- ✅ **Input Validation**: Comprehensive parameter validation
- ✅ **Pausability**: Emergency pause functionality

### Best Practices

- **Never share private keys**: Use separate agent wallets with limited scope
- **Set conservative limits**: Start with small amounts and short time periods
- **Use merchant allowlists**: Restrict payments to known, trusted addresses
- **Monitor regularly**: Check the dashboard for unexpected activity
- **Revoke when needed**: Stop agent spending immediately if needed

## 🏆 **Highlights**

- **Native Sei Integration**: Fast 400ms finality for instant agent payments
- **USDC Support**: Native USDC integration with Circle's CCTP v2
- **MCP Protocol**: First payment primitive designed for AI agents
- **Full Stack**: Smart contracts, indexer, frontend, and developer tools

### Innovation Impact

- **🎯 Addresses Real Problem**: Trust in autonomous agent commerce
- **🔧 Production Ready**: Comprehensive testing and error handling
- **🌍 Ecosystem Value**: Standards for the entire AI x crypto space
- **📈 Scalable**: Factory pattern supports unlimited payment intents

## 📜 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Sei Foundation**: For the incredible blockchain infrastructure
- **Anthropic**: For MCP and Claude integration capabilities  
- **Crossmint**: For GOAT SDK and wallet infrastructure
- **OpenZeppelin**: For battle-tested smart contract libraries
- **Foundry**: For the excellent development and testing framework

---

**Built with ❤️ for the AI x Crypto future**
