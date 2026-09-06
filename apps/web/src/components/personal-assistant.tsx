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
      content: `I review the spending authority you have delegated to agents.

I read your payment intents, payments and daily rollups from the LedgerMind
subgraph on Sei Atlantic, then tell you what to change - which intents are
over-authorised, where capital is sitting idle, and which agents can pay
addresses you never approved.

Ask me anything, or start here:`,
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
    { id: 'review', label: 'Review my agents', query: 'Is my agent spending money sensibly? Anything I should worry about?' },
    { id: 'idle', label: 'Find idle capital', query: 'Is any of my money sitting idle in dead intents? How do I get it back?' },
    { id: 'exposure', label: 'Where am I exposed?', query: 'Which intents let an agent pay addresses I never approved?' },
    { id: 'budget', label: 'Budget remaining', query: 'How much can my agents still spend, and which has the most room?' },
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

  /**
   * Calls the LedgerMind analysis endpoint, which pulls this payer's intents,
   * payments and daily rollups from the subgraph and returns ranked findings
   * plus concrete actions.
   *
   * Before ETHOnline 2026 this function was ~210 lines of hardcoded strings
   * with invented market data (APYs, 24h volumes, gas prices). It never
   * queried anything. See the pre-ethonline-2026 tag.
   */
  const generateAssistantResponse = async (userMessage: string): Promise<{ content: string; data?: any }> => {
    if (!address) {
      return { content: 'Connect a wallet first so I know whose spending authority to review.' };
    }

    try {
      const res = await fetch('/api/v1/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payer: address, question: userMessage }),
      });

      const body = await res.json();

      if (!res.ok || !body.ok) {
        const type = body?.error?.type;
        if (type === 'subgraph_unavailable') {
          return {
            content:
              'The subgraph is unreachable, so I have no live data to reason over. ' +
              'I will not guess at balances - check SUBGRAPH_URL and try again.',
          };
        }
        if (type === 'not_configured') {
          return {
            content:
              'ANTHROPIC_API_KEY is not set on the server, so the analysis step ' +
              'cannot run. The subgraph data is still available via /api/v1/intents.',
          };
        }
        return { content: `Analysis failed: ${body?.error?.message ?? res.statusText}` };
      }

      const a = body.data;
      const parts: string[] = [];

      parts.push(`**${a.headline}**`);
      parts.push(`Risk: ${String(a.riskLevel).toUpperCase()}`);

      if (a.findings?.length) {
        parts.push('', '**What I found**');
        for (const f of a.findings) {
          parts.push(`- **${f.title}** - ${f.detail}`);
        }
      }

      if (a.actions?.length) {
        parts.push('', '**What to do**');
        for (const act of a.actions) {
          const recovers =
            act.recoversUsdc > 0 ? ` (recovers ${act.recoversUsdc} USDC)` : '';
          const target =
            act.target && act.target !== 'n/a'
              ? ` ${act.target.slice(0, 10)}...`
              : '';
          parts.push(
            `- ${act.action}${target} - ${act.rationale} [${act.urgency}]${recovers}`,
          );
        }
      }

      if (a.dataGaps?.length) {
        parts.push('', '**Gaps in the data**');
        for (const g of a.dataGaps) parts.push(`- ${g}`);
      }

      const blk = body.source?.indexedBlock;
      if (blk) {
        parts.push('', `_Indexed to block ${blk} on Sei Atlantic via The Graph._`);
      }

      return { content: parts.join('\n'), data: body };
    } catch (error) {
      console.error('Assistant response error:', error);
      return {
        content:
          'I could not reach the analysis endpoint. No cached answer is served, ' +
          'because showing stale spending data would be worse than showing none.',
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