'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  DollarSign, 
  ExternalLink, 
  CheckCircle,
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  transactionHash?: string;
  amount?: number;
  status?: 'pending' | 'success' | 'error';
}

interface AgentInfo {
  address: string;
  name: string;
  description: string;
  capabilities: string[];
  pricePerUse: number;
  rating: number;
  totalUses: number;
  owner: string;
}

interface AgentChatProps {
  agent: AgentInfo;
  onPayment?: (amount: number, txHash: string) => void;
}

export function AgentChat({ agent, onPayment }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: `Connected to ${agent.name}. This agent specializes in: ${agent.capabilities.join(', ')}`,
      timestamp: new Date(),
    },
    {
      id: '2',
      type: 'agent',
      content: `Hello! I'm ${agent.name}. ${agent.description} How can I help you with your blockchain and payment needs today?`,
      timestamp: new Date(),
    }
  ]);
  
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isConnected, address } = useAccount();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const updateMessage = (id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  };

  const generateAgentResponse = async (userMessage: string): Promise<string> => {
    const lowerMessage = userMessage.toLowerCase();
    
    try {
      // Check for action-based responses first
      if (lowerMessage.includes('check balance') || lowerMessage.includes('show balance') || lowerMessage.includes('my balance')) {
        try {
          const response = await fetch('/api/agent/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userAddress: address,
              agentAddress: agent.address 
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            return `💰 **Your Current Balances:**

• SEI: ${data.balances.SEI} SEI
• USDC: ${data.balances.USDC} USDC
• Address: ${data.balances.address}

${data.balances.USDC < 10 ? '⚠️ Your USDC balance is low. Consider funding your wallet for transactions.' : '✅ You have sufficient funds for transactions.'}`;
          }
        } catch (error) {
          console.log('Balance check failed, using fallback response');
        }
        
        return `I can help you check balances! For your connected wallet ${address?.slice(0, 10)}..., I can check SEI and USDC balances, as well as payment intent statuses. Let me look that up for you...`;
      }

      if (lowerMessage.includes('create intent') || lowerMessage.includes('new intent') || lowerMessage.includes('payment intent')) {
        return `🔐 **Creating a Payment Intent**

I can help you create a secure payment intent! Please provide:

• **Total Cap**: Maximum total amount (e.g., 1000 USDC)
• **Per-Transaction Limit**: Max per payment (e.g., 100 USDC)  
• **Duration**: How long it's valid (e.g., 30 days)
• **Merchants**: Specific recipients (optional)

Example: "Create intent with 500 total, 50 per transaction, 14 days"

This creates a smart contract that allows controlled spending within your limits!`;
      }

      if (lowerMessage.includes('send payment') || lowerMessage.includes('pay ') || lowerMessage.includes('transfer ')) {
        return `💸 **Payment Processing**

I can execute secure payments! Please specify:

• **Recipient**: Wallet address or merchant
• **Amount**: How much USDC to send
• **Payment Method**: 
  - Direct transfer (immediate)
  - Through payment intent (with limits)

Example: "Send 25 USDC to 0x1234..."

All payments are secured and executed on Sei blockchain with full transparency.`;
      }

      if (lowerMessage.includes('help') || lowerMessage.includes('what can you do') || lowerMessage.includes('commands')) {
        return `🤖 **LedgerMind Agent Capabilities**

I'm an AI agent specialized in blockchain payments and transaction management:

**Core Functions:**
• 💰 Check wallet balances (SEI, USDC)
• 🔐 Create payment intents with spending limits
• 💸 Execute secure USDC payments
• 📊 Track transaction history
• ⚡ Auto-fund payment intents

**Available Commands:**
• "Check my balance"
• "Create payment intent with [details]"
• "Send [amount] USDC to [address]"
• "Show my payment intents"

**Security Features:**
• Smart contract-based execution
• Spending limit enforcement
• Transaction verification
• Receipt generation

How can I assist with your blockchain payments today?`;
      }

      // Use OpenAI/Claude-style response for general queries
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          agentName: agent.name,
          agentCapabilities: agent.capabilities,
          userAddress: address,
          context: 'blockchain_payment_agent'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.response;
      }
      
    } catch (error) {
      console.error('AI agent response error:', error);
    }

    // Fallback responses with more personality
    const fallbackResponses = [
      `I understand you're asking about "${userMessage}". As ${agent.name}, I specialize in ${agent.capabilities.slice(0, 2).join(' and ')}. Could you be more specific about what blockchain operation you'd like me to help with?`,
      
      `That's an interesting question! As a payment agent with expertise in ${agent.capabilities[0]}, I can help you with transactions, balance checks, and payment intent management. What specific task would you like to accomplish?`,
      
      `I'm ${agent.name}, ready to help with your request about "${userMessage}". My specialties include ${agent.capabilities.slice(0, 3).join(', ')}. How can I assist you with your blockchain payments today?`
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to chat with agents",
        variant: "destructive",
      });
      return;
    }

    const userMessage = currentMessage.trim();
    setCurrentMessage('');
    
    // Add user message
    addMessage({
      type: 'user',
      content: userMessage,
    });

    setIsTyping(true);
    setIsLoading(true);

    try {
      // Simulate thinking time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      // Get agent response
      const agentResponse = await generateAgentResponse(userMessage);
      
      setIsTyping(false);
      
      // Add agent response
      addMessage({
        type: 'agent',
        content: agentResponse,
      });

      // Check if this requires payment processing
      if (userMessage.toLowerCase().includes('execute') || 
          userMessage.toLowerCase().includes('send payment') ||
          userMessage.toLowerCase().includes('make payment')) {
        
        // Simulate payment execution
        setTimeout(() => {
          const paymentMessage = addMessage({
            type: 'system',
            content: `Processing payment request... This will cost $${agent.pricePerUse} USDC for agent usage.`,
            status: 'pending',
            amount: agent.pricePerUse,
          });

          // Simulate payment completion
          setTimeout(() => {
            const txHash = `0x${Math.random().toString(16).slice(2, 18)}...`;
            updateMessage(paymentMessage.id, {
              content: `Payment processed successfully! Agent executed your request.`,
              status: 'success',
              transactionHash: txHash,
            });

            if (onPayment) {
              onPayment(agent.pricePerUse, txHash);
            }

            toast({
              title: "Agent Payment Complete",
              description: `Paid $${agent.pricePerUse} USDC to ${agent.name}`,
            });
          }, 2000);
        }, 1000);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      addMessage({
        type: 'system',
        content: 'Error processing your message. Please try again.',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (message: ChatMessage) => {
    if (message.type === 'user') return <User className="h-4 w-4" />;
    if (message.type === 'agent') return <Bot className="h-4 w-4" />;
    if (message.status === 'pending') return <Loader2 className="h-4 w-4 animate-spin" />;
    if (message.status === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (message.status === 'error') return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <MessageCircle className="h-4 w-4" />;
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <CardDescription className="text-sm">
                {agent.capabilities.slice(0, 2).join(', ')}
                {agent.capabilities.length > 2 && `... +${agent.capabilities.length - 2} more`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              ${agent.pricePerUse}/use
            </Badge>
            <Badge variant="secondary" className="text-xs">
              ⭐ {agent.rating.toFixed(1)} ({agent.totalUses} uses)
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 p-4">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.type === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : message.type === 'agent'
                  ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white'
                  : 'bg-gray-500 text-white'
              }`}>
                {getMessageIcon(message)}
              </div>
              
              <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block p-3 rounded-lg max-w-[80%] ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white ml-auto'
                    : message.type === 'agent'
                    ? 'bg-muted'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {message.amount && (
                    <div className="mt-2 flex items-center space-x-2 text-xs">
                      <DollarSign className="h-3 w-3" />
                      <span>${message.amount} USDC</span>
                      {message.status && (
                        <Badge 
                          variant={message.status === 'success' ? 'default' : message.status === 'error' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {message.status}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {message.transactionHash && (
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 text-xs hover:text-primary"
                        onClick={() => {
                          // In real implementation, would open block explorer
                          toast({
                            title: "Transaction Hash",
                            description: message.transactionHash,
                          });
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View TX
                      </Button>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex items-center space-x-2 pt-2 border-t">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type your message..." : "Connect wallet to chat"}
            disabled={!isConnected || isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || !isConnected || isLoading}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!isConnected && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              Connect your wallet to start chatting with {agent.name}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}