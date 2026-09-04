# LedgerMind Setup Guide

This guide will help you get LedgerMind running locally without dependency conflicts.

## 🚀 Quick Setup

### Option 1: Automated Installation

```bash
./install.sh
```

### Option 2: Manual Installation

#### 1. Install Smart Contract Dependencies

```bash
# Install Foundry if you haven't already
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install contract dependencies
forge install --no-git
```

#### 2. Install MCP Server Dependencies

```bash
cd packages/mcp
npm install
cd ../..
```

#### 3. Install Frontend Dependencies

```bash
cd apps/web
npm install
cd ../..
```

## 🔧 Environment Configuration

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Configure your environment**:
   ```bash
   # Required: Blockchain Configuration
   SEI_RPC_HTTP=https://evm-rpc-testnet.sei-apis.com
   SEI_CHAIN_ID=1328
   PRIVATE_KEY_DEPLOYER=your_deployer_private_key
   PRIVATE_KEY_PAYER=your_payer_private_key  
   PRIVATE_KEY_AGENT=your_agent_private_key

   # Contract addresses (will be filled after deployment)
   FACTORY_ADDRESS=
   USDC_ADDRESS=0x4fCF1784B31630811181f670Aea7A7bEF803eaED
   ```

## 🏗️ Deployment

### 1. Deploy Smart Contracts

```bash
# Deploy to Sei testnet
# Reads PRIVATE_KEY_DEPLOYER from .env rather than taking it on the
# command line, so the key never enters shell history.
forge script script/Deploy.s.sol \
  --rpc-url $SEI_RPC_HTTP \
  --interactives 1 \
  --broadcast

# Update .env with the deployed FACTORY_ADDRESS
```

### 2. Configure MCP Server for Claude Code

```bash
cd packages/mcp
npm run build

# The server loads credentials from .env at the repo root.
# Do NOT pass keys with --env: they are written to the MCP client's
# config file in plaintext and land in your shell history.
claude mcp add ledgermind -- node "$PWD/dist/index.js"

# Verify connection
claude mcp list
```

**Key handling**: `packages/mcp/src/config.ts` reads `PRIVATE_KEY_PAYER` and
`PRIVATE_KEY_AGENT` via `dotenv` from `.env`, which is gitignored. Keep them
there and nowhere else. A key that reaches a shell command has already leaked
into `~/.zsh_history`.

> **Known limitation.** These are still plaintext env vars on disk, not a
> hardware-backed store. Replacing them with a Ledger Key Ring backend was
> planned for ETHOnline 2026 but not shipped — `wallet-cli ring init` requires
> a physical Ledger device, which was unavailable. See `AI_USAGE.md`.

### 3. Start Frontend

```bash
cd apps/web
npm run dev
```

Visit `http://localhost:3000` to access the dashboard!

## 🐛 Troubleshooting

### Dependency Conflicts

If you encounter dependency resolution errors:

1. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

2. **Delete node_modules and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   rm -rf packages/*/node_modules packages/*/package-lock.json
   rm -rf apps/*/node_modules apps/*/package-lock.json
   ./install.sh
   ```

3. **Use legacy peer deps** (if needed):
   ```bash
   cd packages/mcp && npm install --legacy-peer-deps
   cd ../../apps/web && npm install --legacy-peer-deps
   ```

### Smart Contract Issues

1. **Gas estimation failed**:
   ```bash
   forge script script/Deploy.s.sol --gas-estimate-multiplier 200
   ```

2. **Network timeout**:
   ```bash
   forge script script/Deploy.s.sol --slow --timeout 60000
   ```

### Frontend Build Issues

1. **Memory issues**:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

2. **Clear Next.js cache**:
   ```bash
   rm -rf .next && npm run build
   ```

## 🌐 Production Deployment

### Vercel (Frontend)

1. Fork the repository
2. Connect to Vercel
3. Set root directory to `apps/web`
4. Configure environment variables:
   ```
   NEXT_PUBLIC_CHAIN_ID=1328
   NEXT_PUBLIC_RPC_URL=https://evm-rpc-testnet.sei-apis.com
   NEXT_PUBLIC_FACTORY_ADDRESS=your_deployed_factory_address
   NEXT_PUBLIC_USDC_ADDRESS=0x4fCF1784B31630811181f670Aea7A7bEF803eaED
   ```

### Railway/Render (MCP Server)

1. Connect your repository
2. Set root directory to `packages/mcp`
3. Configure build command: `npm install && npm run build`
4. Configure start command: `npm start`
5. Set environment variables as shown above

## 📖 Next Steps

- Read the [README.md](README.md) for detailed project information
- Check the [DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment
- Visit the [documentation](apps/web/src/app/docs/page.tsx) for API reference
- Join our [Discord community](https://discord.gg/ledgermind) for support

## 🆘 Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/jintukumardas/ledgermind/issues)
- **Discord**: [Join community](https://discord.gg/ledgermind)
- **Email**: team@ledgermind.ai

---

**Happy building! 🚀**