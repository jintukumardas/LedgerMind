'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AgentChat } from './agent-chat';
import { AgentRegistrationForm } from './agent-registration-form';
import { 
  Bot, 
  Star, 
  Users, 
  DollarSign, 
  Plus, 
  Search, 
  Filter,
  MessageCircle,
  ExternalLink,
  TrendingUp,
  Shield,
  Zap,
  AlertTriangle,
  Info
} from 'lucide-react';

interface AgentInfo {
  address: string;
  name: string;
  description: string;
  capabilities: string[];
  pricePerUse: number;
  rating: number;
  totalUses: number;
  owner: string;
  logoUri?: string;
  isActive: boolean;
  createdAt: Date;
  totalEarned: number;
  monthlyUses: number;
}

// Mock data for demonstration - in real app this would come from blockchain
const mockAgents: AgentInfo[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    name: 'PaymentBot Pro',
    description: 'Advanced payment processing agent with multi-chain support and automated risk management. Handles complex payment flows and merchant integrations.',
    capabilities: ['USDC Payments', 'Payment Intents', 'Risk Analysis', 'Multi-chain', 'Merchant APIs'],
    pricePerUse: 5,
    rating: 4.8,
    totalUses: 1247,
    owner: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    totalEarned: 6235,
    monthlyUses: 312,
  },
  {
    address: '0x2345678901234567890123456789012345678901',
    name: 'DeFi Assistant',
    description: 'Specialized in DeFi operations including yield farming, liquidity provision, and token swaps. Optimizes your DeFi strategies automatically.',
    capabilities: ['DeFi Protocols', 'Yield Optimization', 'Token Swaps', 'Liquidity Management'],
    pricePerUse: 8,
    rating: 4.6,
    totalUses: 892,
    owner: '0xdef123def123def123def123def123def123def1',
    isActive: true,
    createdAt: new Date('2024-02-01'),
    totalEarned: 7136,
    monthlyUses: 156,
  },
  {
    address: '0x3456789012345678901234567890123456789012',
    name: 'NFT Trading Agent',
    description: 'Expert NFT trader that analyzes market trends, executes trades, and manages your NFT portfolio with advanced analytics.',
    capabilities: ['NFT Trading', 'Market Analysis', 'Portfolio Management', 'Trend Prediction'],
    pricePerUse: 12,
    rating: 4.9,
    totalUses: 567,
    owner: '0x321fed321fed321fed321fed321fed321fed321f',
    isActive: true,
    createdAt: new Date('2024-01-20'),
    totalEarned: 6804,
    monthlyUses: 89,
  },
  {
    address: '0x4567890123456789012345678901234567890123',
    name: 'Balance Checker',
    description: 'Simple but reliable agent for checking wallet balances across multiple chains and tokens. Perfect for basic portfolio monitoring.',
    capabilities: ['Balance Checking', 'Multi-chain', 'Token Detection', 'Portfolio Tracking'],
    pricePerUse: 2,
    rating: 4.3,
    totalUses: 2156,
    owner: '0x456789456789456789456789456789456789456789',
    isActive: true,
    createdAt: new Date('2024-01-10'),
    totalEarned: 4312,
    monthlyUses: 445,
  },
  {
    address: '0x5678901234567890123456789012345678901234',
    name: 'Security Auditor',
    description: 'Advanced security agent that audits smart contracts, checks for vulnerabilities, and provides security recommendations.',
    capabilities: ['Smart Contract Audit', 'Security Analysis', 'Vulnerability Detection', 'Risk Assessment'],
    pricePerUse: 25,
    rating: 4.7,
    totalUses: 234,
    owner: '0x789abc789abc789abc789abc789abc789abc789a',
    isActive: true,
    createdAt: new Date('2024-02-10'),
    totalEarned: 5850,
    monthlyUses: 23,
  },
];

export function AgentMarketplace() {
  const [agents, setAgents] = useState<AgentInfo[]>(mockAgents);
  const [filteredAgents, setFilteredAgents] = useState<AgentInfo[]>(mockAgents);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'uses' | 'newest'>('rating');
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { isConnected, address } = useAccount();
  const { toast } = useToast();

  // Fetch registered agents from API
  const fetchRegisteredAgents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agent/register');
      if (response.ok) {
        const data = await response.json();
        const registeredAgents = data.agents.map((agent: any) => ({
          ...agent,
          createdAt: new Date(agent.createdAt),
        }));
        
        // Combine mock agents with registered agents
        setAgents([...mockAgents, ...registeredAgents]);
      }
    } catch (error) {
      console.error('Failed to fetch registered agents:', error);
      toast({
        title: "Failed to load some agents",
        description: "Some recently registered agents may not appear.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch agents on component mount
  useEffect(() => {
    fetchRegisteredAgents();
  }, []);

  useEffect(() => {
    let filtered = agents.filter(agent => 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.capabilities.some(cap => cap.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Sort agents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'price':
          return a.pricePerUse - b.pricePerUse;
        case 'uses':
          return b.totalUses - a.totalUses;
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return 0;
      }
    });

    setFilteredAgents(filtered);
  }, [agents, searchTerm, sortBy]);

  const handleAgentPayment = (agentAddress: string, amount: number, txHash: string) => {
    // Update agent stats
    setAgents(prev => prev.map(agent => 
      agent.address === agentAddress 
        ? { 
            ...agent, 
            totalUses: agent.totalUses + 1,
            totalEarned: agent.totalEarned + amount,
            monthlyUses: agent.monthlyUses + 1
          }
        : agent
    ));

    toast({
      title: "Agent Payment Successful",
      description: `Paid $${amount} USDC for agent service`,
    });
  };

  const handleAddAgent = () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to register an agent",
        variant: "destructive",
      });
      return;
    }
    setShowAddAgent(true);
  };

  const getPriceColor = (price: number) => {
    if (price <= 5) return 'text-green-600';
    if (price <= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (selectedAgent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setSelectedAgent(null)}
          >
            ← Back to Marketplace
          </Button>
          <Badge variant="outline">
            Chat Session Active
          </Badge>
        </div>
        
        <AgentChat 
          agent={selectedAgent}
          onPayment={(amount, txHash) => handleAgentPayment(selectedAgent.address, amount, txHash)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Development Phase Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Development Phase - Demo Agents</h3>
              <p className="text-blue-800 text-sm mb-3">
                This marketplace is currently in development. The agents shown below are for demonstration purposes and use real blockchain transactions on Sei testnet.
              </p>
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Available Demo Features:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Payment Agent:</strong> Process USDC payments with smart contract intents</li>
                  <li>• <strong>Personal Assistant:</strong> Manage your crypto transactions and balances</li>
                  <li>• <strong>Merchant Management:</strong> Add and track your regular payment destinations</li>
                  <li>• <strong>Real Chain Data:</strong> All transactions are recorded on Sei blockchain</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Agent Marketplace</h2>
          <p className="text-muted-foreground">
            Discover and interact with AI agents for blockchain operations
          </p>
        </div>
        <Button onClick={handleAddAgent} className="gap-2">
          <Plus className="h-4 w-4" />
          Register Agent
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents by name, description, or capabilities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="rating">Sort by Rating</option>
                <option value="price">Sort by Price</option>
                <option value="uses">Sort by Usage</option>
                <option value="newest">Sort by Newest</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold">{agents.length}</p>
              </div>
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Usage</p>
                <p className="text-2xl font-bold">{agents.reduce((sum, agent) => sum + agent.totalUses, 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">
                  {(agents.reduce((sum, agent) => sum + agent.rating, 0) / agents.length).toFixed(1)}
                </p>
              </div>
              <Star className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">
                  ${agents.reduce((sum, agent) => sum + agent.totalEarned, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <Card key={agent.address} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      {agent.owner === address && (
                        <Badge variant="secondary" className="text-xs">
                          Your Agent
                        </Badge>
                      )}
                      {new Date().getTime() - agent.createdAt.getTime() < 24 * 60 * 60 * 1000 && (
                        <Badge variant="default" className="text-xs bg-green-500">
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{agent.rating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">
                        ({agent.totalUses} uses)
                      </span>
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={`${getPriceColor(agent.pricePerUse)} border-current`}
                >
                  ${agent.pricePerUse}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <CardDescription className="text-sm line-clamp-3">
                {agent.description}
              </CardDescription>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Capabilities:</p>
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.slice(0, 3).map((capability) => (
                    <Badge key={capability} variant="secondary" className="text-xs">
                      {capability}
                    </Badge>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{agent.capabilities.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Monthly Uses</p>
                  <p className="font-medium">{agent.monthlyUses}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Earned</p>
                  <p className="font-medium">${agent.totalEarned.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  className="flex-1 gap-1"
                  onClick={() => setSelectedAgent(agent)}
                  disabled={!isConnected}
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Agent Details",
                      description: `Owner: ${agent.owner.slice(0, 10)}...`,
                    });
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              
              {!isConnected && (
                <p className="text-xs text-muted-foreground text-center">
                  Connect wallet to interact
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Agents Found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters to find agents.
            </p>
            <Button onClick={() => setSearchTerm('')}>
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Comprehensive Agent Registration Modal */}
      {showAddAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Register New Agent
              </CardTitle>
              <CardDescription>
                Deploy your AI agent to the marketplace and start earning USDC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AgentRegistrationForm 
                onSuccess={() => {
                  setShowAddAgent(false);
                  fetchRegisteredAgents(); // Refresh agents list
                }}
                onCancel={() => setShowAddAgent(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}