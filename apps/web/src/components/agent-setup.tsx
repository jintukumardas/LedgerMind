'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Settings, Copy, ExternalLink, FileText, MessageCircle, HelpCircle, Zap, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AgentSetup() {
  const [activeTab, setActiveTab] = useState<'flow' | 'mcp' | 'partners'>('flow');
  const { toast } = useToast();

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: description,
    });
  };

  const tabs = [
    {
      id: 'flow' as const,
      title: 'Payment Flow Guide',
      icon: HelpCircle,
      description: 'Step-by-step guide to using LedgerMind payment intents',
      badge: 'Guide'
    },
    {
      id: 'mcp' as const,
      title: 'MCP Integration',
      icon: Settings,
      description: 'Connect with Claude Desktop, Cursor, and other MCP-compatible tools',
      badge: 'Ready'
    },
    {
      id: 'partners' as const,
      title: 'Partner SDKs',
      icon: Bot,
      description: 'Working integrations with GOAT SDK, Cambrian, and other partners',
      badge: 'Functional'
    }
  ];

  const mcpConfig = `{
  "mcpServers": {
    "ledgermind": {
      "command": "node",
      "args": ["path/to/ledgermind/packages/mcp/build/index.js"],
      "env": {
        "PRIVATE_KEY_PAYER": "your_payer_private_key",
        "PRIVATE_KEY_AGENT": "your_agent_private_key",
        "FACTORY_ADDRESS": "0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7",
        "USDC_ADDRESS": "0x4fCF1784B31630811181f670Aea7A7bEF803eaED"
      }
    }
  }
}`;

  const partnerCode = `// GOAT SDK + Cambrian Integration (WORKING)
import { createCambrianAgent } from '@ledgermind/cambrian-integration';
import { LedgerMindAgent } from '@ledgermind/agent-goat';

// Create Cambrian agent
const agent = createCambrianAgent({
  privateKey: process.env.PRIVATE_KEY_AGENT,
  name: "MyPaymentAgent",
  description: "Autonomous payment agent"
});

// Initialize GOAT SDK integration  
const goatAgent = new LedgerMindAgent(process.env.PRIVATE_KEY_AGENT);
await goatAgent.initialize(); // Now includes working GOAT tools

// Create payment intent with spending limits
await agent.createPaymentIntent({
  totalCapUSDC: 1000,    // Max $1000 total
  perTxCapUSDC: 100,     // Max $100 per transaction
  durationDays: 7,       // Valid for 7 days
  merchants: ["0x..."]   // Optional: restrict to specific merchants
});

// Execute autonomous workflow
const result = await agent.executeAutonomousWorkflow(
  { totalCapUSDC: 500, perTxCapUSDC: 50, durationDays: 3 },
  400, // Initial funding amount
  [
    { recipient: "0x742d35cc6E09C8B8D4F0C07A9bCa8Fb2E9e91891", 
      amountUSDC: 25, 
      description: "Service payment" 
    }
  ]
);`;

  return (
    <section className="py-24 px-6 sm:px-12 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Agent Integration Hub
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Complete setup guide and working SDK integrations for AI agent payments
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 rounded-lg bg-muted p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.title}</span>
                <Badge variant={tab.badge === 'Ready' || tab.badge === 'Functional' ? 'default' : 'secondary'} className="text-xs">
                  {tab.badge}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mx-auto max-w-6xl">
          
          {/* Payment Flow Guide */}
          {activeTab === 'flow' && (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="h-5 w-5" />
                    <CardTitle>How Payment Intents Work</CardTitle>
                  </div>
                  <CardDescription>
                    Understanding the complete flow from setup to payment execution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    
                    {/* Flow Steps */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-6 rounded-lg border bg-blue-50 border-blue-200">
                        <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                          1
                        </div>
                        <h3 className="font-semibold mb-2">Create Intent</h3>
                        <p className="text-sm text-muted-foreground">
                          Set spending limits, duration, and optional merchant restrictions
                        </p>
                      </div>
                      
                      <div className="text-center p-6 rounded-lg border bg-green-50 border-green-200">
                        <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                          2
                        </div>
                        <h3 className="font-semibold mb-2">Fund Intent</h3>
                        <p className="text-sm text-muted-foreground">
                          Transfer USDC tokens to the intent contract for agent spending
                        </p>
                      </div>
                      
                      <div className="text-center p-6 rounded-lg border bg-purple-50 border-purple-200">
                        <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                          3
                        </div>
                        <h3 className="font-semibold mb-2">Agent Pays</h3>
                        <p className="text-sm text-muted-foreground">
                          AI agent executes payments within defined limits and constraints
                        </p>
                      </div>
                    </div>

                    {/* Detailed Process */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">💰 Funding Process</h3>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                              <strong>Who funds:</strong> The payer (you) who created the intent
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                              <strong>What to fund:</strong> USDC tokens (6 decimals) to the intent contract
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                              <strong>How much:</strong> Any amount up to the total cap (e.g., $500 for a $1000 cap intent)
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                              <strong>Where:</strong> Transfer USDC directly to the intent contract address
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Auto-funding */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">⚡ Auto-funding Feature</h3>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm mb-2">
                          <strong>NEW:</strong> Our system now includes auto-funding! If an agent has USDC in their wallet, 
                          they can automatically fund payment intents when needed.
                        </p>
                        <div className="text-xs text-blue-700 space-y-1">
                          <div>• Agent checks their USDC balance before payment</div>
                          <div>• If intent has insufficient funds, agent auto-funds it</div>
                          <div>• Adds a 10 USDC buffer for future transactions</div>
                          <div>• All happens seamlessly in one transaction flow</div>
                        </div>
                      </div>
                    </div>

                    {/* Common Issues */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">🔧 Troubleshooting</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium text-red-600 mb-2">❌ "Insufficient balance" error</h4>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• Intent contract needs USDC funding</li>
                            <li>• Agent needs USDC for auto-funding</li>
                            <li>• Check USDC balance vs payment amount</li>
                          </ul>
                        </div>
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium text-green-600 mb-2">✅ Success indicators</h4>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• Transaction hash appears in log</li>
                            <li>• Intent balance updates in dashboard</li>
                            <li>• Receipt generated with details</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Demo */}
              <Card>
                <CardHeader>
                  <CardTitle>💡 Try It Now</CardTitle>
                  <CardDescription>
                    Use the dashboard to create your first payment intent and test the flow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <Button asChild>
                      <a href="/dashboard">Go to Dashboard</a>
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Create intent → Fund with USDC → Test AI payment
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* MCP Integration */}
          {activeTab === 'mcp' && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <CardTitle>MCP Integration Setup</CardTitle>
                </div>
                <CardDescription>
                  Configure LedgerMind as an MCP server for Claude Desktop, Cursor, and other compatible tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">1. Install Dependencies</h3>
                  <div className="rounded-lg bg-muted p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Install packages</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('cd packages/mcp && npm install && npm run build', 'Installation command copied')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre className="text-sm overflow-x-auto">
                      <code>cd packages/mcp && npm install && npm run build</code>
                    </pre>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">2. Configure Claude Desktop</h3>
                  <p className="text-sm text-muted-foreground">
                    Add this configuration to your Claude Desktop settings file:
                  </p>
                  <div className="rounded-lg bg-muted p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">claude_desktop_config.json</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(mcpConfig, 'MCP configuration copied')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre className="text-sm overflow-x-auto">
                      <code>{mcpConfig}</code>
                    </pre>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">3. Available Tools</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: 'create_intent', desc: 'Create payment intents with limits' },
                      { name: 'execute_payment', desc: 'Execute payments through intents' },
                      { name: 'list_intents', desc: 'List all payment intents' },
                      { name: 'top_up_intent', desc: 'Add funds to existing intents' },
                      { name: 'revoke_intent', desc: 'Revoke active payment intents' }
                    ].map((tool) => (
                      <div key={tool.name} className="rounded-lg border p-3">
                        <code className="text-sm font-medium text-primary">{tool.name}</code>
                        <p className="text-xs text-muted-foreground mt-1">{tool.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-4 border-t">
                  <Button variant="outline" asChild>
                    <a href="/docs#mcp-integration" className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Full Documentation</span>
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a 
                      href="https://docs.sei.io/learn/mcp-server" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Sei MCP Docs</span>
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Partner SDKs */}
          {activeTab === 'partners' && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <CardTitle>Partner SDK Integrations</CardTitle>
                  <Badge variant="default">All Functional</Badge>
                </div>
                <CardDescription>
                  Working, tested integrations with hackathon partner SDKs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">🚀 Working Integrations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-lg border p-4 bg-green-50 border-green-200">
                      <Zap className="h-8 w-8 text-green-600 mb-2" />
                      <h4 className="font-medium text-green-800 mb-2">GOAT SDK</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• ✅ ERC-20 token transfers</li>
                        <li>• ✅ Wallet management</li>
                        <li>• ✅ Balance checking</li>
                        <li>• ✅ Sei testnet support</li>
                      </ul>
                    </div>
                    <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
                      <Bot className="h-8 w-8 text-blue-600 mb-2" />
                      <h4 className="font-medium text-blue-800 mb-2">Cambrian Agent</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• ✅ Autonomous workflows</li>
                        <li>• ✅ Chat interface</li>
                        <li>• ✅ Intent management</li>
                        <li>• ✅ Multi-step execution</li>
                      </ul>
                    </div>
                    <div className="rounded-lg border p-4 bg-purple-50 border-purple-200">
                      <Settings className="h-8 w-8 text-purple-600 mb-2" />
                      <h4 className="font-medium text-purple-800 mb-2">Enhanced MCP</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• ✅ Resource support</li>
                        <li>• ✅ API documentation</li>
                        <li>• ✅ Network status</li>
                        <li>• ✅ Contract info</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">📦 Ready-to-Use Code</h3>
                  <p className="text-sm text-muted-foreground">
                    All these integrations are fully functional and ready to use:
                  </p>
                  <div className="rounded-lg bg-muted p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Working SDK Integration Example</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(partnerCode, 'Partner SDK code copied')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre className="text-sm overflow-x-auto">
                      <code>{partnerCode}</code>
                    </pre>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">🔗 Live Package Locations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">📁 Local Packages</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• <code>packages/mcp/</code> - Enhanced MCP server</li>
                        <li>• <code>packages/agent-goat/</code> - GOAT SDK integration</li>
                        <li>• <code>packages/cambrian/</code> - Cambrian agent runtime</li>
                      </ul>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">🌐 External Links</h4>
                      <ul className="text-sm space-y-1">
                        <li>
                          <a href="https://github.com/goat-sdk/goat" target="_blank" className="text-blue-600 hover:underline">
                            • GOAT SDK Repository
                          </a>
                        </li>
                        <li>
                          <a href="https://www.cambrian.wtf/" target="_blank" className="text-blue-600 hover:underline">
                            • Cambrian Platform
                          </a>
                        </li>
                        <li>
                          <a href="https://docs.sei.io/learn/mcp-server" target="_blank" className="text-blue-600 hover:underline">
                            • Sei MCP Documentation
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">All Integrations Tested & Working</span>
                  </div>
                  <p className="text-sm text-green-700">
                    These aren't mockups or placeholders - they're fully functional integrations that execute real on-chain transactions on Sei testnet.
                  </p>
                </div>

                <div className="flex items-center space-x-4 pt-4 border-t">
                  <Button asChild>
                    <a href="/dashboard" className="flex items-center space-x-2">
                      <Zap className="h-4 w-4" />
                      <span>Test Live Integration</span>
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a 
                      href="https://github.com/jintukumardas/ledgermind" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View Source Code</span>
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}