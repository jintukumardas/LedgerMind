#!/bin/bash
set -e

echo "🚀 LedgerMind Quick Start Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if cast is available
if ! command -v cast &> /dev/null; then
    echo -e "${YELLOW}⚠️  Cast not found. Installing Foundry...${NC}"
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.bashrc
    foundryup
fi

echo -e "${BLUE}📋 Current Deployment Status:${NC}"
echo "✅ PaymentIntentFactory: 0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7"
echo "✅ USDC Token: 0x4fCF1784B31630811181f670Aea7A7bEF803eaED"
echo "✅ Sei Testnet: Chain ID 1328"

echo -e "\n${BLUE}🔑 Setting up Agent Wallet...${NC}"
if [ -z "$PRIVATE_KEY_AGENT" ]; then
    echo "Generating new agent wallet..."
    WALLET_OUTPUT=$(cast wallet new)
    AGENT_ADDRESS=$(echo "$WALLET_OUTPUT" | grep "Address:" | awk '{print $2}')
    AGENT_PRIVATE_KEY=$(echo "$WALLET_OUTPUT" | grep "Private key:" | awk '{print $3}')
    
    echo -e "${GREEN}✅ Agent wallet created!${NC}"
    echo "Address: $AGENT_ADDRESS"
    echo "Private Key: $AGENT_PRIVATE_KEY"
    
    # Add to .env file
    echo "" >> .env
    echo "# Agent Configuration" >> .env
    echo "PRIVATE_KEY_AGENT=$AGENT_PRIVATE_KEY" >> .env
    
    echo -e "${YELLOW}💰 Don't forget to fund your agent with SEI tokens for gas fees!${NC}"
    echo "Send SEI to: $AGENT_ADDRESS"
else
    AGENT_ADDRESS=$(cast wallet address $PRIVATE_KEY_AGENT)
    echo -e "${GREEN}✅ Using existing agent wallet: $AGENT_ADDRESS${NC}"
fi

echo -e "\n${BLUE}📦 Installing Dependencies...${NC}"
npm install

echo -e "\n${BLUE}🏗️  Building Project...${NC}"
npm run build

echo -e "\n${GREEN}🎉 Setup Complete!${NC}"
echo "================================"
echo ""
echo "🚀 Next Steps:"
echo "1. Fund your agent wallet with SEI tokens:"
echo "   Address: $AGENT_ADDRESS"
echo ""
echo "2. Start the dashboard:"
echo "   cd apps/web && npm run dev"
echo "   Visit: http://localhost:3000/dashboard"
echo ""
echo "3. Create a payment intent with:"
echo "   - Agent Address: $AGENT_ADDRESS"
echo "   - Total Cap: 1000 USDC"
echo "   - Per Transaction Cap: 100 USDC" 
echo "   - Duration: 7 days"
echo ""
echo "4. Test the AI agent:"
echo "   npm run agent:demo"
echo ""
echo "📚 Documentation:"
echo "   - agent-setup.md - Detailed agent configuration"
echo "   - DEPLOYMENT_GUIDE.md - Full deployment guide"