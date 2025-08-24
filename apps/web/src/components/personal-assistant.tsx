'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePaymentIntents } from '@/hooks/use-payment-intents';
import { useTransactionHistory } from '@/hooks/use-transaction-history';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Sparkles,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Loader2,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  data?: any; // For structured data responses
}

interface PersonalAssistantProps {
  className?: string;
}

export function PersonalAssistant({ className }: PersonalAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: `👋 Hi! I'm your personal LedgerMind assistant.

🚧 **Development Mode** - This is a prototype with simulated AI responses. Full AI integration coming soon!

I can help you with:
• 📊 Payment intent management
• 💳 Transaction history analysis  
• 📈 Spending pattern insights
• ⚡ Account status and balances

Choose what you'd like to do:`,
      timestamp: new Date(),
    }
  ]);
  
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick action suggestions
  const quickActions = [
    { id: 'balance', label: '💰 Check Balance', query: 'Check my balance' },
    { id: 'intents', label: '📊 Show Intents', query: 'Show my payment intents' },
    { id: 'recent', label: '🕒 Recent Transactions', query: 'Show recent transactions' },
    { id: 'analysis', label: '📈 Spending Analysis', query: 'Analyze my spending patterns' },
  ];
  
  const { isConnected, address } = useAccount();
  const { toast } = useToast();
  const { intents: paymentIntents, loading: intentsLoading, refetch: refetchIntents } = usePaymentIntents();
  const { transactions, isLoading: txLoading, refetch: refetchTransactions } = useTransactionHistory();

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

  const generateAssistantResponse = async (userMessage: string): Promise<{ content: string; data?: any }> => {
    const lowerMessage = userMessage.toLowerCase();
    
    try {
      // Payment Intent Queries
      if (lowerMessage.includes('intent') || lowerMessage.includes('spending') || lowerMessage.includes('allowance')) {
        if (lowerMessage.includes('status') || lowerMessage.includes('show') || lowerMessage.includes('list')) {
          const activeIntents = paymentIntents.filter(intent => intent.state === 0); // 0 = Active
          const totalSpent = paymentIntents.reduce((sum, intent) => sum + Number(intent.spent), 0);
          const totalAllowance = paymentIntents.reduce((sum, intent) => sum + Number(intent.totalCap), 0);
          
          return {
            content: `📊 **Your Payment Intents Summary**

**Active Intents:** ${activeIntents.length}
**Total Allowance:** $${(totalAllowance / 1e6).toLocaleString()} USDC
**Amount Spent:** $${(totalSpent / 1e6).toLocaleString()} USDC
**Remaining:** $${((totalAllowance - totalSpent) / 1e6).toLocaleString()} USDC

${activeIntents.length > 0 ? `**Active Intents:**
${activeIntents.map(intent => 
  `• ${intent.agent}: $${(Number(intent.spent) / 1e6).toFixed(2)}/$${(Number(intent.totalCap) / 1e6).toFixed(2)} ($${(Number(intent.perTransactionCap) / 1e6).toFixed(2)}/tx max)`
).join('\n')}` : '🔍 No active payment intents found.'}

${activeIntents.length > 0 ? 'Use "pause [agent name]" to temporarily disable an intent.' : 'Create a new intent to start making controlled payments.'}`,
            data: { intents: paymentIntents, summary: { totalSpent, totalAllowance } }
          };
        }
        
        if (lowerMessage.includes('pause') || lowerMessage.includes('stop')) {
          const activeIntents = paymentIntents.filter(intent => intent.state === 0);
          return {
            content: `⏸️ **Pause Payment Intent**

To pause a payment intent, I need to know which one. Your active intents:

${activeIntents.map(intent => 
  `• **${intent.agent}** - $${(Number(intent.spent) / 1e6).toFixed(2)}/$${(Number(intent.totalCap) / 1e6).toFixed(2)} spent`
).join('\n')}

Which intent would you like to pause? You can also visit the Intent Management section for full control.`
          };
        }
      }

      // Transaction History Queries
      if (lowerMessage.includes('transaction') || lowerMessage.includes('history') || lowerMessage.includes('recent') || lowerMessage.includes('payment')) {
        if (lowerMessage.includes('recent') || lowerMessage.includes('last') || lowerMessage.includes('latest')) {
          const recentTx = transactions.slice(0, 5);
          const totalAmount = recentTx.reduce((sum, tx) => sum + tx.amount, 0);
          
          return {
            content: `📝 **Recent Transaction History**

**Last 5 Transactions:** (Total: $${totalAmount.toFixed(2)} USDC)

${recentTx.map(tx => 
  `• **${tx.type}** - $${tx.amount} ${tx.token}
  ${tx.to ? `To: ${tx.to}` : ''}
  ${formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
  ${tx.status === 'confirmed' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'}`
).join('\n\n')}

Want to see more details? Ask "show full transaction history" or "analyze my spending patterns".`,
            data: { transactions: recentTx, totalAmount }
          };
        }
        
        if (lowerMessage.includes('analyze') || lowerMessage.includes('pattern') || lowerMessage.includes('spending')) {
          const completedTx = transactions.filter(tx => tx.status === 'confirmed');
          const totalSpent = completedTx.reduce((sum, tx) => sum + tx.amount, 0);
          const avgTransaction = totalSpent / completedTx.length || 0;
          
          // Group by type
          const byType = completedTx.reduce((acc, tx) => {
            acc[tx.type] = (acc[tx.type] || 0) + tx.amount;
            return acc;
          }, {} as Record<string, number>);
          
          return {
            content: `📈 **Spending Analysis**

**Total Spent:** $${totalSpent.toFixed(2)} USDC
**Transaction Count:** ${completedTx.length}
**Average Transaction:** $${avgTransaction.toFixed(2)} USDC

**Spending by Category:**
${Object.entries(byType).map(([type, amount]) => 
  `• **${type}**: $${amount.toFixed(2)} (${((amount/totalSpent)*100).toFixed(1)}%)`
).join('\n')}

**Insights:**
${avgTransaction > 100 ? '💡 You tend to make larger transactions - consider creating payment intents with higher per-transaction limits.' : ''}
${completedTx.length > 20 ? '🔄 High transaction frequency detected - payment intents could streamline your payments.' : ''}
${totalSpent > 1000 ? '⚠️ Significant spending volume - ensure you have proper tracking and limits in place.' : ''}`,
            data: { totalSpent, avgTransaction, byType, completedTx: completedTx.length }
          };
        }
      }

      // Balance and Status Queries
      if (lowerMessage.includes('balance') || lowerMessage.includes('wallet') || lowerMessage.includes('funds')) {
        const response = await fetch('/api/agent/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userAddress: address })
        });
        
        if (response.ok) {
          const data = await response.json();
          const seiBalance = parseFloat(data.balances.SEI);
          const usdcBalance = parseFloat(data.balances.USDC);
          
          return {
            content: `💰 **Wallet Balance Overview**

**Current Balances:**
• SEI: ${data.balances.SEI} SEI ${seiBalance < 0.01 ? '⚠️ (Low - need for gas)' : '✅'}
• USDC: $${data.balances.USDC} USDC ${usdcBalance < 10 ? '⚠️ (Consider funding)' : '✅'}

**Payment Intent Capacity:**
• Available for new intents: $${data.balances.USDC} USDC
• Current intent spending: $${(paymentIntents.reduce((sum, intent) => sum + Number(intent.spent), 0) / 1e6).toFixed(2)} USDC

**Recommendations:**
${seiBalance < 0.01 ? '• Fund SEI for transaction gas fees' : ''}
${usdcBalance < 100 ? '• Consider adding USDC for more payment flexibility' : ''}
${usdcBalance > 1000 ? '• Excellent balance for creating multiple payment intents' : ''}`,
            data: { balances: data.balances, recommendedActions: [] }
          };
        }
      }

      // Help and Commands
      if (lowerMessage.includes('help') || lowerMessage.includes('what can') || lowerMessage.includes('command')) {
        return {
          content: `🤖 **Personal Assistant Commands**

**Payment Intent Management:**
• "Show my payment intents"
• "What's my spending allowance?"
• "Pause [agent name] intent"

**Transaction Analysis:**
• "Show recent transactions"
• "Analyze my spending patterns"
• "What did I spend this month?"

**Account Overview:**
• "Check my balance"
• "Wallet status"
• "Account summary"

**Insights & Analytics:**
• "Show spending trends"
• "Compare this month to last month"
• "Most used merchants"

**Quick Actions:**
• "Refresh data" - Updates all information
• "Create new intent" - Guides you through setup
• "Export transactions" - Download your history

I can understand natural language! Try asking questions like "How much have I spent on groceries?" or "Are any of my intents close to their limits?"`
        };
      }

      // Refresh Data
      if (lowerMessage.includes('refresh') || lowerMessage.includes('update') || lowerMessage.includes('reload')) {
        await Promise.all([refetchIntents(), refetchTransactions()]);
        return {
          content: `🔄 **Data Refreshed Successfully!**

Updated information:
• Payment Intents: ${paymentIntents.length} total
• Transactions: ${transactions.length} total
• Account status: Connected ✅

All your latest blockchain data has been synchronized. Ask me anything about your updated information!`
        };
      }

      // Default intelligent response
      return {
        content: `I understand you're asking about "${userMessage}". I'm your personal LedgerMind assistant specializing in:

• 📊 Payment intent management and analysis
• 💳 Transaction history and spending insights  
• 💰 Balance monitoring and recommendations
• 📈 Financial pattern analysis

Try asking me:
• "Show my recent payments"
• "How much can I still spend?"
• "What are my most expensive transactions?"
• "Help me manage my intents"

What specific information about your account would you like to know?`
      };

    } catch (error) {
      console.error('Assistant response error:', error);
      return {
        content: `I encountered an issue processing your request. This might be due to:

• Network connectivity problems
• Temporary data sync issues
• Blockchain query timeout

Please try again, or ask me something else. I'm here to help with your payment intents and transaction history!`
      };
    }
  };

  const handleQuickAction = async (query: string) => {
    setShowQuickActions(false);
    
    // Add user message for the quick action
    addMessage({
      type: 'user',
      content: query,
    });

    await processQuery(query);
  };

  const processQuery = async (userMessage: string) => {
    setIsLoading(true);

    try {
      // Simulate thinking time
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      // Get assistant response
      const { content, data } = await generateAssistantResponse(userMessage);
      
      // Add assistant response
      addMessage({
        type: 'assistant',
        content,
        data
      });

    } catch (error) {
      console.error('Assistant error:', error);
      addMessage({
        type: 'system',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to use the personal assistant",
        variant: "destructive",
      });
      return;
    }

    const userMessage = currentMessage.trim();
    setCurrentMessage('');
    setShowQuickActions(false);
    
    // Add user message
    addMessage({
      type: 'user',
      content: userMessage,
    });

    await processQuery(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (message: ChatMessage) => {
    if (message.type === 'user') return <User className="h-4 w-4" />;
    if (message.type === 'assistant') return <Sparkles className="h-4 w-4" />;
    return <MessageCircle className="h-4 w-4" />;
  };

  if (isMinimized) {
    return (
      <Card className={`fixed bottom-4 right-4 w-80 shadow-lg z-50 ${className}`}>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsMinimized(false)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm">Personal Assistant</CardTitle>
                <CardDescription className="text-xs">Click to expand</CardDescription>
              </div>
            </div>
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-md shadow-lg ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Personal Assistant</CardTitle>
              <CardDescription className="text-sm">
                Your LedgerMind helper
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
              Beta
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 p-0"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col space-y-4 p-4">
        {/* Messages Area */}
        <div className="h-96 overflow-y-auto space-y-3 pr-2">
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
                  : message.type === 'assistant'
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                  : 'bg-gray-500 text-white'
              }`}>
                {getMessageIcon(message)}
              </div>
              
              <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block p-3 rounded-lg max-w-[90%] ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white ml-auto'
                    : message.type === 'assistant'
                    ? 'bg-muted'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing your data...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Quick Actions */}
          {showQuickActions && isConnected && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">Quick Actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action.query)}
                    className="text-xs h-8"
                    disabled={isLoading}
                  >
                    {action.label}
                  </Button>
                ))}
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
            placeholder={isConnected ? "Ask about your intents & transactions..." : "Connect wallet to chat"}
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
              Connect your wallet to access your personal assistant
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}