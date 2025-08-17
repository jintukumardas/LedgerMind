'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { WalletConnect } from '@/components/wallet-connect';
import { CreateIntentForm } from '@/components/create-intent-form';
import { PaymentIntentsList } from '@/components/payment-intents-list';
import { AgentDemo } from '@/components/agent-demo';
import { AgentSetup } from '@/components/agent-setup';
import { AgentMarketplace } from '@/components/agent-marketplace';
import { TransactionHistory } from '@/components/transaction-history';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePaymentIntents } from '@/hooks/use-payment-intents';
import { formatTokenAmount } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Bot, 
  History, 
  Settings, 
  Users 
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'marketplace' | 'history' | 'integrations'>('dashboard');
  const { isConnected } = useAccount();
  const { intents, refetch } = usePaymentIntents();
  
  // Calculate stats from real data
  const activeIntents = intents.filter(intent => {
    const isExpired = intent.end < BigInt(Math.floor(Date.now() / 1000));
    return intent.state === 0 && !isExpired; // 0 = Active state
  }).length;
  
  const totalSpent = intents.reduce((sum, intent) => sum + intent.spent, BigInt(0));
  const totalTransactions = intents.length; // This could be more accurate with transaction count

  const tabs = [
    {
      id: 'dashboard' as const,
      title: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview and payment intents'
    },
    {
      id: 'agents' as const,
      title: 'AI Agents',
      icon: Bot,
      description: 'Execute real AI payments'
    },
    {
      id: 'marketplace' as const,
      title: 'Agent Marketplace',
      icon: Users,
      description: 'Discover and use agents'
    },
    {
      id: 'history' as const,
      title: 'Transaction History',
      icon: History,
      description: 'View all transactions'
    },
    {
      id: 'integrations' as const,
      title: 'Integrations',
      icon: Settings,
      description: 'Setup guides and SDKs'
    }
  ];

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">LedgerMind Dashboard</h1>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 rounded-lg bg-muted p-1 mb-8">
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
              {tab.id === 'agents' && (
                <Badge variant="default" className="text-xs ml-1">
                  Live
                </Badge>
              )}
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <>
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
          </>
        )}
        
        {activeTab === 'agents' && <AgentDemo />}
        {activeTab === 'marketplace' && <AgentMarketplace />}
        {activeTab === 'history' && <TransactionHistory />}
        {activeTab === 'integrations' && <AgentSetup />}
      </div>
    </div>
  );
}