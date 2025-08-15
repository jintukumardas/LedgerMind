import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation - LedgerMind',
  description: 'Learn how to integrate LedgerMind with your AI agents',
};

export default function Docs() {
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Documentation</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-xl font-semibold mb-4">🚀 Quick Start</h3>
            <p className="text-muted-foreground mb-4">
              Get started with LedgerMind in minutes. Deploy smart contracts, run the MCP server, and create your first payment intent.
            </p>
            <div className="space-y-2 text-sm">
              <p>• Set up environment variables</p>
              <p>• Deploy smart contracts to Sei</p>
              <p>• Configure MCP server</p>
              <p>• Create payment intents</p>
            </div>
          </div>
          
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-xl font-semibold mb-4">🤖 MCP Integration</h3>
            <p className="text-muted-foreground mb-4">
              Learn how to integrate LedgerMind with Claude, Cursor, and other MCP-compatible AI tools.
            </p>
            <div className="space-y-2 text-sm">
              <p>• Configure MCP settings</p>
              <p>• Available tools and methods</p>
              <p>• Receipt generation</p>
              <p>• Error handling</p>
            </div>
          </div>
          
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-xl font-semibold mb-4">🔒 Smart Contracts</h3>
            <p className="text-muted-foreground mb-4">
              Deep dive into the PaymentIntent and Factory contracts, including security features and gas optimization.
            </p>
            <div className="space-y-2 text-sm">
              <p>• Contract architecture</p>
              <p>• Security mechanisms</p>
              <p>• Deployment guide</p>
              <p>• Testing framework</p>
            </div>
          </div>
          
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-xl font-semibold mb-4">🌐 API Reference</h3>
            <p className="text-muted-foreground mb-4">
              Complete API documentation for the MCP server, including all available tools and their parameters.
            </p>
            <div className="space-y-2 text-sm">
              <p>• Tool definitions</p>
              <p>• Request/response schemas</p>
              <p>• Authentication</p>
              <p>• Rate limiting</p>
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
              href="https://github.com/your-org/ledgermind" 
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