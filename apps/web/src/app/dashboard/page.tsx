import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - LedgerMind',
  description: 'Manage your AI agent payment intents',
};

export default function Dashboard() {
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Payment Intents Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-lg font-semibold mb-2">Active Intents</h3>
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-sm text-muted-foreground">Currently active</p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-lg font-semibold mb-2">Total Spent</h3>
            <p className="text-3xl font-bold text-primary">$0.00</p>
            <p className="text-sm text-muted-foreground">USDC spent</p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-lg font-semibold mb-2">Transactions</h3>
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-sm text-muted-foreground">Total payments</p>
          </div>
        </div>
        
        <div className="p-8 rounded-lg border bg-card text-center">
          <h2 className="text-xl font-semibold mb-4">Welcome to LedgerMind</h2>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to start creating secure payment intents for your AI agents.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 rounded border-2 border-dashed border-muted-foreground/25">
              <h3 className="font-medium mb-2">🔗 Connect Wallet</h3>
              <p className="text-sm text-muted-foreground">
                Connect your Sei wallet to begin managing payment intents
              </p>
            </div>
            
            <div className="p-4 rounded border-2 border-dashed border-muted-foreground/25">
              <h3 className="font-medium mb-2">💰 Create Intent</h3>
              <p className="text-sm text-muted-foreground">
                Set up spending limits and constraints for your AI agents
              </p>
            </div>
            
            <div className="p-4 rounded border-2 border-dashed border-muted-foreground/25">
              <h3 className="font-medium mb-2">🤖 Deploy Agent</h3>
              <p className="text-sm text-muted-foreground">
                Configure your AI agent to use the MCP payment tools
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}