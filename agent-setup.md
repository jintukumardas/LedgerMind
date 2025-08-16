# AI Agent Setup Guide for LedgerMind

## Overview

Based on your deployment, you now have:
- **PaymentIntentFactory**: `0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7`
- **USDC Token**: `0x4fCF1784B31630811181f670Aea7A7bEF803eaED`
- **Sei Testnet**: Chain ID 1328

## Agent Address Setup

Your **agent address** is simply any Ethereum wallet address that you want to authorize for spending. This is NOT a contract - it's a regular wallet address that your AI agent will use to make payments.

### Steps to Get Your Agent Address:

1. **Generate a new wallet** for your agent:
   ```bash
   # Using cast (from foundry)
   cast wallet new
   
   # Or create in MetaMask and copy the address
   ```

2. **Fund the agent wallet** with SEI tokens for gas fees:
   - Send some SEI tokens to the agent address
   - The agent needs SEI for transaction fees

3. **Update your environment** with the agent private key:
   ```bash
   # Add to your .env file
   PRIVATE_KEY_AGENT=0x...your_agent_private_key
   ```

## Current Setup Status

✅ **Contracts Deployed**
- Factory: `0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7`
- USDC: `0x4fCF1784B31630811181f670Aea7A7bEF803eaED`

✅ **GOAT SDK Added**
- Core, EVM wallet, and ERC20 plugin installed
- Ready for AI agent integration

⏳ **Next Steps**
1. Generate agent wallet address
2. Create payment intent through dashboard
3. Configure AI agent with GOAT SDK

## Using the Dashboard

1. **Connect your wallet** to http://localhost:3000/dashboard
2. **Create Payment Intent**:
   - Agent Address: `0x...` (your generated agent address)
   - Total Cap: `1000` USDC
   - Per Transaction Cap: `100` USDC
   - Duration: `7` days
3. **Copy the intent ID** for your agent configuration

## Agent Integration with GOAT SDK

```typescript
import { getOnChainTools } from "@goat-sdk/wallet-evm";
import { ERC20Plugin } from "@goat-sdk/plugin-erc20";

const tools = await getOnChainTools({
  wallet: evmWallet, // Your agent wallet
  plugins: [new ERC20Plugin()],
});

// Agent can now make payments within the intent limits
```

## Native Token vs USDC Payments

### For USDC Payments:
- Use the payment intent system
- Agent pays through the smart contract
- Enforces spending limits and constraints

### For Native SEI Payments:
- Agent can send SEI directly
- No smart contract constraints
- Use for gas fees or direct transfers

## Example Agent Flow

1. **Agent receives payment request**
2. **Checks if payment is within intent limits**
3. **Uses GOAT SDK to execute payment**:
   ```typescript
   // For USDC through intent
   await executePayment({
     intentId: "0x...",
     recipient: "0x...",
     amount: "50000000" // 50 USDC (6 decimals)
   });
   
   // For native SEI
   await sendTransaction({
     to: "0x...",
     value: parseEther("1.0") // 1 SEI
   });
   ```

## Troubleshooting

**Q: What's my agent address?**
A: Any Ethereum wallet address you want to authorize. Generate a new one for security.

**Q: Do I need to deploy another contract?**
A: No! The factory contract is all you need. It creates individual payment intents.

**Q: How do I fund the agent?**
A: Send SEI tokens to the agent address for gas fees. USDC can be accessed through payment intents.

**Q: Can the agent spend both SEI and USDC?**
A: Yes! SEI for gas and direct payments, USDC through payment intents with constraints.