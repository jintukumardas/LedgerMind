#!/bin/bash

set -e

echo "🚀 Installing LedgerMind dependencies..."

# Install Foundry dependencies
echo "📦 Installing Foundry dependencies..."
forge install --no-git

# Install MCP server dependencies
echo "📦 Installing MCP server dependencies..."
cd packages/mcp
npm install
cd ../..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd apps/web
npm install
cd ../..

echo "✅ All dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure your environment"
echo "2. Deploy smart contracts: forge script script/Deploy.s.sol --rpc-url \$SEI_RPC_HTTP --private-key \$PRIVATE_KEY_DEPLOYER --broadcast"
echo "3. Start MCP server: cd packages/mcp && npm run dev"
echo "4. Start frontend: cd apps/web && npm run dev"