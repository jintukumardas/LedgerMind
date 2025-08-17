import { NextRequest, NextResponse } from 'next/server';

// This would typically use OpenAI, Claude, or another LLM API
// For demo purposes, we'll create intelligent responses based on context

export async function POST(request: NextRequest) {
  try {
    const { message, agentName, agentCapabilities, userAddress, context } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Generate contextual response based on agent capabilities and user message
    const response = await generateIntelligentResponse(
      message, 
      agentName, 
      agentCapabilities, 
      userAddress,
      context
    );

    return NextResponse.json({
      success: true,
      response
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}

async function generateIntelligentResponse(
  message: string,
  agentName: string,
  capabilities: string[],
  userAddress: string,
  context: string
): Promise<string> {
  const lowerMessage = message.toLowerCase();
  
  // Advanced pattern matching for blockchain-specific queries
  if (lowerMessage.includes('gas') || lowerMessage.includes('fee')) {
    return `⛽ **Gas & Fees Information**

Current Sei network conditions:
• Estimated gas fee: ~0.001 SEI per transaction
• USDC transfer gas: ~0.002 SEI
• Payment intent creation: ~0.005 SEI

💡 **Tip**: Keep at least 0.01 SEI in your wallet for transaction fees. I can help you optimize gas usage by batching operations or timing transactions during low-traffic periods.`;
  }

  if (lowerMessage.includes('security') || lowerMessage.includes('safe') || lowerMessage.includes('risk')) {
    return `🔒 **Security & Risk Management**

As ${agentName}, I prioritize security:

**Transaction Security:**
• All payments verified on-chain before execution
• Multi-signature support for large amounts
• Automatic slippage protection
• Smart contract audit verification

**Your Safety:**
• Never share private keys with agents
• Always verify transaction details before signing
• Use payment intents for controlled spending
• Monitor unusual transaction patterns

Would you like me to perform a security audit of a specific transaction or address?`;
  }

  if (lowerMessage.includes('defi') || lowerMessage.includes('yield') || lowerMessage.includes('liquidity')) {
    if (capabilities.includes('DeFi Operations') || capabilities.includes('Yield Optimization')) {
      return `🏦 **DeFi Operations & Yield Strategies**

I can help you navigate DeFi opportunities on Sei:

**Available Strategies:**
• Liquidity provision on DEXs (5-15% APY)
• Yield farming with vetted protocols
• Automated rebalancing strategies
• Risk-adjusted portfolio optimization

**Current Opportunities:**
• USDC-SEI pools: ~8.5% APY
• Lending protocols: ~6.2% APY
• Governance token staking: ~12% APY

⚠️ **Risk Assessment**: All strategies include smart contract risk. I can analyze protocols before you commit funds.

Which DeFi operation interests you most?`;
    }
  }

  if (lowerMessage.includes('nft') || lowerMessage.includes('token') || lowerMessage.includes('trading')) {
    if (capabilities.includes('NFT Trading') || capabilities.includes('Trading & Analytics')) {
      return `🖼️ **NFT & Token Trading**

I can assist with trading operations:

**NFT Analysis:**
• Floor price monitoring
• Rarity assessment and valuation
• Market trend analysis
• Optimal buy/sell timing

**Token Trading:**
• Price movement predictions
• Volume analysis and patterns
• Arbitrage opportunity detection
• Portfolio rebalancing suggestions

**Current Market Status:**
• High volatility detected in memecoin sector
• NFT collections showing 15% weekly growth
• DEX volume up 23% from last week

What type of trading analysis would you like me to perform?`;
    }
  }

  if (lowerMessage.includes('smart contract') || lowerMessage.includes('audit') || lowerMessage.includes('code')) {
    if (capabilities.includes('Smart Contract Audit') || capabilities.includes('Security Analysis')) {
      return `👨‍💻 **Smart Contract Analysis**

I can analyze smart contracts for:

**Security Checks:**
• Reentrancy vulnerabilities
• Integer overflow/underflow
• Access control issues
• Logic flaws and edge cases

**Code Quality:**
• Gas optimization opportunities
• Best practice compliance
• Documentation completeness
• Upgrade mechanism safety

**Audit Reports:**
• Detailed vulnerability assessment
• Risk severity classification
• Remediation recommendations
• Compliance verification

Provide a contract address or code snippet for analysis!`;
    }
  }

  // Market analysis and general trading
  if (lowerMessage.includes('price') || lowerMessage.includes('market') || lowerMessage.includes('chart')) {
    return `📈 **Market Analysis & Price Insights**

Current market overview:

**Sei Network (SEI):**
• 24h Volume: $12.4M
• Price trend: Bullish (+3.2%)
• Support level: $0.45
• Resistance: $0.58

**USDC Stability:**
• Maintaining $1.00 peg
• High liquidity across DEXs
• Reliable for payment operations

**Market Sentiment:**
• Fear & Greed Index: 65 (Greed)
• Institutional interest: Growing
• DeFi TVL on Sei: $89M (+8% weekly)

Would you like deeper analysis on any specific token or market trend?`;
  }

  // Educational responses
  if (lowerMessage.includes('learn') || lowerMessage.includes('explain') || lowerMessage.includes('what is')) {
    return `🎓 **Blockchain Education**

I'm ${agentName}, here to help you understand blockchain concepts!

**Core Concepts:**
• Wallets store your private keys and manage assets
• Smart contracts are programs that run automatically
• DeFi protocols enable financial services without banks
• Payment intents provide controlled spending mechanisms

**Sei Blockchain Features:**
• Fast finality (~380ms)
• Low transaction costs
• EVM compatibility
• Built-in orderbook matching

**Security Best Practices:**
• Never share your seed phrase
• Verify contract addresses before interacting
• Start with small amounts when testing
• Use hardware wallets for large holdings

What specific topic would you like me to explain in detail?`;
  }

  // Default intelligent response
  const personalizedResponse = `Hello! I'm ${agentName}, and I understand you're asking about "${message}".

Based on my capabilities in ${capabilities.slice(0, 2).join(' and ')}, I can help you with:

${capabilities.slice(0, 4).map(cap => `• ${cap}`).join('\n')}

Your connected wallet (${userAddress?.slice(0, 10)}...) is ready for blockchain operations. I'm designed to provide secure, efficient solutions for your specific needs.

Could you tell me more about what you'd like to accomplish? I can provide detailed guidance and execute transactions safely within your specified limits.`;

  return personalizedResponse;
}