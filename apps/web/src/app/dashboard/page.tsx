'use client';

import { useAccount } from 'wagmi';
import { WalletConnect } from '@/components/wallet-connect';
import { CreateIntentForm } from '@/components/create-intent-form';
import { PaymentIntentsList } from '@/components/payment-intents-list';
import { AgentDemo } from '@/components/agent-demo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePaymentIntents } from '@/hooks/use-payment-intents';
import { formatTokenAmount } from '@/lib/utils';

export default function Dashboard() {
  const { isConnected } = useAccount();
  const { intents, refetch } = usePaymentIntents();
  
  // Calculate stats from real data
  const activeIntents = intents.filter(intent => {
    const isExpired = intent.end < BigInt(Math.floor(Date.now() / 1000));
    return intent.state === 0 && !isExpired; // 0 = Active state
  }).length;
  
  const totalSpent = intents.reduce((sum, intent) => sum + intent.spent, BigInt(0));
  const totalTransactions = intents.length; // This could be more accurate with transaction count

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Payment Intents Dashboard</h1>
          <WalletConnect />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Active Intents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{activeIntents}</p>
              <p className="text-sm text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">${formatTokenAmount(totalSpent)}</p>
              <p className="text-sm text-muted-foreground">USDC spent</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{totalTransactions}</p>
              <p className="text-sm text-muted-foreground">Payment intents created</p>
            </CardContent>
          </Card>
        </div>
        
        {isConnected ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <CreateIntentForm onIntentCreated={refetch} />
              <PaymentIntentsList />
            </div>
            
            {/* AI Agent Demo Section */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
              <AgentDemo />
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to LedgerMind</CardTitle>
              <CardDescription>
                Connect your wallet to start creating secure payment intents for your AI agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <WalletConnect />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded border-2 border-dashed border-muted-foreground/25 text-center">
                  <h3 className="font-medium mb-2">🔗 Connect Wallet</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your Sei wallet to begin managing payment intents
                  </p>
                </div>
                
                <div className="p-4 rounded border-2 border-dashed border-muted-foreground/25 text-center">
                  <h3 className="font-medium mb-2">💰 Create Intent</h3>
                  <p className="text-sm text-muted-foreground">
                    Set up spending limits and constraints for your AI agents
                  </p>
                </div>
                
                <div className="p-4 rounded border-2 border-dashed border-muted-foreground/25 text-center">
                  <h3 className="font-medium mb-2">🤖 Deploy Agent</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure your AI agent to use the MCP payment tools
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}