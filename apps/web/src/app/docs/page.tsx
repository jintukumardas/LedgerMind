'use client';

import React from 'react';
import Link from 'next/link';

// Note: Metadata moved to layout or parent component since this is now a client component

export default function Docs() {
  const [activeSection, setActiveSection] = React.useState('quick-start');
  
  const sections = {
    'quick-start': {
      title: '🚀 Quick Start',
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Quick Start Guide</h2>
          <p className="text-muted-foreground">
            Get started with LedgerMind in minutes. Follow these steps to deploy smart contracts, 
            run the MCP server, and create your first payment intent.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">1. Set up environment variables</h3>
              <pre className="text-sm bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`# Copy environment template
cp .env.example .env

# Configure your keys
PRIVATE_KEY_PAYER=your_payer_private_key
PRIVATE_KEY_AGENT=your_agent_private_key
FACTORY_ADDRESS=0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7
USDC_ADDRESS=0x4fCF1784B31630811181f670Aea7A7bEF803eaED`}
              </pre>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">2. Deploy smart contracts to Sei</h3>
              <pre className="text-sm bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`# Install dependencies
npm install

# Deploy contracts to Sei testnet
npm run deploy:testnet

# Verify deployment
npm run verify:testnet`}
              </pre>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">3. Configure MCP server</h3>
              <pre className="text-sm bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`# Start the MCP server
cd packages/mcp
npm run dev

# Server will run on http://localhost:3001
# Connect your AI tool to this endpoint`}
              </pre>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">4. Create payment intents</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Use the dashboard or MCP tools to create your first payment intent:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Set spending limits (total and per-transaction)</li>
                <li>• Choose authorized agent address</li>
                <li>• Configure merchant allowlist (optional)</li>
                <li>• Set expiration time</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    'mcp-integration': {
      title: '🤖 MCP Integration',
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">MCP Integration Guide</h2>
          <p className="text-muted-foreground">
            Learn how to integrate LedgerMind with Claude, Cursor, and other MCP-compatible AI tools.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">Configure MCP settings</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Add LedgerMind to your Claude Desktop configuration:
              </p>
              <pre className="text-sm bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`{
  "mcpServers": {
    "ledgermind": {
      "command": "node",
      "args": ["path/to/ledgermind/packages/mcp/build/index.js"],
      "env": {
        "PRIVATE_KEY_PAYER": "your_payer_key",
        "PRIVATE_KEY_AGENT": "your_agent_key",
        "FACTORY_ADDRESS": "0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7"
      }
    }
  }
}`}
              </pre>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">Available tools and methods</h3>
              <ul className="text-sm space-y-2">
                <li><code className="bg-gray-200 px-2 py-1 rounded">create_intent</code> - Create new payment intents</li>
                <li><code className="bg-gray-200 px-2 py-1 rounded">execute_payment</code> - Execute payments through intents</li>
                <li><code className="bg-gray-200 px-2 py-1 rounded">list_intents</code> - List payment intents for an agent</li>
                <li><code className="bg-gray-200 px-2 py-1 rounded">get_intent_details</code> - Get detailed intent information</li>
                <li><code className="bg-gray-200 px-2 py-1 rounded">revoke_intent</code> - Revoke active payment intents</li>
              </ul>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">Receipt generation</h3>
              <p className="text-sm text-muted-foreground">
                All payments automatically generate receipts with transaction hashes, 
                amounts, recipients, and timestamps for audit purposes.
              </p>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">Error handling</h3>
              <p className="text-sm text-muted-foreground">
                The MCP server provides detailed error messages for common issues like 
                insufficient balance, exceeded limits, and network problems.
              </p>
            </div>
          </div>
        </div>
      )
    },
    'smart-contracts': {
      title: '🔒 Smart Contracts', 
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Smart Contracts</h2>
          <p className="text-muted-foreground">
            Deep dive into the PaymentIntent and Factory contracts, including security features and gas optimization.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">Contract architecture</h3>
              <ul className="text-sm space-y-1">
                <li>• <strong>PaymentIntentFactory</strong>: Creates and manages payment intents</li>
                <li>• <strong>PaymentIntent</strong>: Individual spending contracts with limits</li>
                <li>• <strong>ERC20 Integration</strong>: Supports USDC and other ERC-20 tokens</li>
                <li>• <strong>CREATE2</strong>: Deterministic contract addresses</li>
              </ul>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">Security mechanisms</h3>
              <ul className="text-sm space-y-1">
                <li>• <strong>Access Control</strong>: Only payer and agent can interact</li>
                <li>• <strong>Spending Limits</strong>: Total and per-transaction caps</li>
                <li>• <strong>Time Bounds</strong>: Start and end times for intents</li>
                <li>• <strong>Merchant Allowlist</strong>: Optional recipient restrictions</li>
                <li>• <strong>Reentrancy Protection</strong>: ReentrancyGuard implementation</li>
                <li>• <strong>Pausable</strong>: Emergency pause functionality</li>
              </ul>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">Deployment guide</h3>
              <pre className="text-sm bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`# Compile contracts
forge build

# Deploy to Sei testnet
forge script script/Deploy.s.sol --rpc-url $SEI_RPC_HTTP --broadcast

# Verify on explorer
forge verify-contract <address> contracts/PaymentIntentFactory.sol:PaymentIntentFactory --etherscan-api-key $API_KEY`}
              </pre>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">Testing framework</h3>
              <pre className="text-sm bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`# Run all tests
forge test

# Run with gas reporting
forge test --gas-report

# Run specific test file
forge test --match-contract PaymentIntentTest`}
              </pre>
            </div>
          </div>
        </div>
      )
    },
    'api-reference': {
      title: '🌐 API Reference',
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">API Reference</h2>
          <p className="text-muted-foreground">
            Complete API documentation for the MCP server, including all available tools and their parameters.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">Tool definitions</h3>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-3">
                  <h4 className="font-medium">create_intent</h4>
                  <p className="text-xs text-muted-foreground">Create a new payment intent with spending limits</p>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`{
  "token": "0x4fCF1784B31630811181f670Aea7A7bEF803eaED",
  "agent": "0x...",
  "total_cap": "1000000000", // 1000 USDC in wei
  "per_tx_cap": "100000000",  // 100 USDC in wei
  "start": 1640995200,
  "end": 1672531200,
  "merchants": ["0x..."],
  "metadata_uri": "ipfs://...",
  "salt": "random_salt",
  "deposit_amount": "500000000"
}`}
                  </pre>
                </div>
                
                <div className="border-l-4 border-green-500 pl-3">
                  <h4 className="font-medium">execute_payment</h4>
                  <p className="text-xs text-muted-foreground">Execute a payment through an intent</p>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`{
  "intent_address": "0x...",
  "merchant": "0x...",
  "amount": "25000000", // 25 USDC in wei
  "receipt_uri": "Payment for services"
}`}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">Request/response schemas</h3>
              <p className="text-sm text-muted-foreground">
                All API calls follow the MCP protocol standards with JSON-RPC 2.0 formatting.
                Responses include success status, transaction hashes, and error details.
              </p>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">Authentication</h3>
              <p className="text-sm text-muted-foreground">
                Authentication is handled through private key configuration in environment variables.
                The MCP server uses these keys to sign transactions on behalf of the user.
              </p>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-semibold mb-2">Rate limiting</h3>
              <p className="text-sm text-muted-foreground">
                No explicit rate limiting is implemented, but Sei network gas costs 
                provide natural rate limiting for transaction frequency.
              </p>
            </div>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Documentation</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-2">
              {Object.entries(sections).map(([key, section]) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    activeSection === key 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-card hover:bg-muted'
                  }`}
                >
                  <div className="font-medium text-sm">{section.title}</div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-lg border p-6">
              {sections[activeSection as keyof typeof sections].content}
            </div>
          </div>
        </div>
        
        <div className="mt-12 p-6 rounded-lg border bg-muted/50">
          <h2 className="text-2xl font-semibold mb-4">External Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              href="https://docs.sei.io/evm" 
              className="p-4 rounded border bg-card hover:shadow-md transition-shadow"
              target="_blank"
            >
              <h4 className="font-medium mb-2">📖 Sei EVM Documentation</h4>
              <p className="text-sm text-muted-foreground">
                Learn about Sei&apos;s EVM implementation and development tools
              </p>
            </Link>
            
            <Link 
              href="https://modelcontextprotocol.io/docs" 
              className="p-4 rounded border bg-card hover:shadow-md transition-shadow"
              target="_blank"
            >
              <h4 className="font-medium mb-2">🔗 MCP Protocol Docs</h4>
              <p className="text-sm text-muted-foreground">
                Official Model Context Protocol documentation and specifications
              </p>
            </Link>
            
            <Link 
              href="https://github.com/jintukumardas/ledgermind" 
              className="p-4 rounded border bg-card hover:shadow-md transition-shadow"
              target="_blank"
            >
              <h4 className="font-medium mb-2">💻 GitHub Repository</h4>
              <p className="text-sm text-muted-foreground">
                View the complete source code and contribute to the project
              </p>
            </Link>
            
            <Link 
              href="https://seitrace.com" 
              className="p-4 rounded border bg-card hover:shadow-md transition-shadow"
              target="_blank"
            >
              <h4 className="font-medium mb-2">🔍 Sei Explorer</h4>
              <p className="text-sm text-muted-foreground">
                Monitor transactions and contract interactions on Sei network
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}