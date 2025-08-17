# 🤖 LedgerMind - Agent Payment Intents (API)

[![Sei Blockchain](https://img.shields.io/badge/Sei-Network-red?style=for-the-badge)](https://www.sei.io/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue?style=for-the-badge)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)

> **Safe, on-chain spending accounts for AI agents with transparent audit trails**

LedgerMind solves the trust problem in autonomous AI agent commerce by creating secure, limited-scope payment intents with full transparency and user control.

## ✨ **What's New in v2.0**

🎉 **Major Updates** - Complete rewrite with production-ready features:

- 🔥 **Real Blockchain Integration**: Live Sei testnet deployment with actual smart contracts
- 🤖 **Agent Marketplace**: Register, discover, and chat with AI agents 
- 💬 **Intelligent Agent Chat**: Context-aware AI responses with real payment execution
- 📊 **Personal Assistant**: Your AI helper for managing intents and transactions
- 🧾 **Advanced Transaction History**: Filtering, receipt verification, merchant management
- 🔐 **Enhanced Security**: Address validation, user-friendly error messages
- 📱 **Professional UI**: Polished interface with loading states and error handling

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
git clone https://github.com/jintukumardas/ledgermind.git
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
SEI_RPC_HTTP=https://evm-rpc-testnet.sei-apis.com
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
   NEXT_PUBLIC_RPC_URL=https://evm-rpc-testnet.sei-apis.com
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

## 🎨 **Features Overview**

### 🏪 **Agent Marketplace**
- **Agent Registration**: Complete 4-step wizard for registering AI agents
- **Agent Discovery**: Search and filter agents by capabilities, price, and rating
- **Live Chat**: Interactive chat with AI agents supporting real blockchain operations
- **Agent Analytics**: Track usage, earnings, and performance metrics

### 🤖 **Intelligent AI Integration**
- **Context-Aware Responses**: Agents understand blockchain context and user intents
- **Real Payment Execution**: Agents can execute actual USDC transactions through intents
- **Multi-Agent Support**: Support for different agent types (Payment, DeFi, Trading, Security)
- **Smart Error Handling**: User-friendly error messages with actionable guidance

### 📊 **Personal AI Assistant**
- **Account Management**: AI helper for managing your payment intents and transactions
- **Quick Actions**: One-click buttons for common operations (check balance, show intents)
- **Spending Analysis**: AI-powered insights into your transaction patterns
- **Natural Language**: Ask questions like "How much have I spent this month?"

### 💳 **Advanced Transaction Management**
- **Real Blockchain Data**: Live transaction history from Sei blockchain
- **Advanced Filtering**: Filter by type, status, token, and source (payment intent vs direct wallet)
- **Receipt Verification**: Full on-chain receipt verification with confirmations
- **Merchant Management**: Save and manage merchant addresses for easy identification

### 🔒 **Intent Management**
- **Comprehensive Controls**: Pause, resume, revoke, and edit payment intents
- **Real-time Status**: Live updates on intent status and spending limits
- **Smart Constraints**: Automatic validation of spending limits and time constraints
- **Batch Operations**: Manage multiple intents efficiently

### 🛡️ **Enhanced Security**
- **Address Validation**: Comprehensive address format and checksum validation
- **User-Friendly Errors**: Clear error messages instead of technical blockchain errors
- **Input Sanitization**: All inputs validated and sanitized before blockchain interaction
- **Safe Defaults**: Conservative defaults for new users

### 📱 **Professional UI/UX**
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Loading States**: Clear feedback during blockchain operations
- **Error Recovery**: Graceful error handling with retry options
- **Dark/Light Themes**: Support for user preferences

### 🔌 **MCP Integration**
- **Native Claude Support**: Deep integration with Claude Desktop and Claude Code
- **Tool Documentation**: Clear usage examples and parameter descriptions
- **Error Context**: Detailed error information for debugging
- **Security Guidance**: Built-in security best practices and warnings

## 🚀 **Usage Examples**

### Creating a Payment Intent (via Dashboard)
```typescript
// Set up a payment intent for $1000 total, $100 per transaction, valid for 30 days
const intent = await createPaymentIntent({
  agent: "0x742d35Cc6Af09C8B8B4f0C07A9bCa8Fb2E9e9189",
  totalCap: parseUSDC("1000"),
  perTransactionCap: parseUSDC("100"),
  duration: 30 * 24 * 60 * 60, // 30 days in seconds
  allowedMerchants: [] // Empty for any merchant
});
```

### Using MCP with Claude
```
User: "Create a payment intent for $500 total, $50 per transaction, valid for 7 days"

Claude: I'll create a payment intent with those specifications...
[Executes create_intent tool]
✅ Payment intent created at address 0x1234...
```

### Agent Marketplace Interaction
```
User: [Clicks "Chat" with PaymentBot Pro]
User: "Pay $25 USDC to 0x742d35Cc6Af09C8B8B4f0C07A9bCa8Fb2E9e9189"

Agent: I'll execute that payment through your payment intent...
[Executes payment via smart contract]
✅ Payment completed! Transaction: 0xabcd...
```

### Personal Assistant Query
```
User: [Clicks "📈 Spending Analysis" quick action]
