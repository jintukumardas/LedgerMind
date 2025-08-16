import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePaymentIntents, PaymentIntent } from '@/hooks/use-payment-intents';
import { formatAddress, formatTokenAmount } from '@/lib/utils';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function IntentCard({ intent }: { intent: PaymentIntent }) {
  const isExpired = intent.end < BigInt(Math.floor(Date.now() / 1000));
  const isActive = intent.state === 0; // 0 = Active
  const spentPercentage = intent.totalCap > 0 ? Number(intent.spent * BigInt(100) / intent.totalCap) : 0;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{formatAddress(intent.address)}</CardTitle>
            <CardDescription>Agent: {formatAddress(intent.agent)}</CardDescription>
          </div>
          <Badge variant={isActive && !isExpired ? "default" : "secondary"}>
            {isActive && !isExpired ? "Active" : isExpired ? "Expired" : intent.state === 1 ? "Revoked" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Cap</p>
            <p className="font-medium">{formatTokenAmount(intent.totalCap)} USDC</p>
          </div>
          <div>
            <p className="text-muted-foreground">Per Transaction</p>
            <p className="font-medium">{formatTokenAmount(intent.perTransactionCap)} USDC</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Spent</span>
            <span className="font-medium">
              {formatTokenAmount(intent.spent)} / {formatTokenAmount(intent.totalCap)} USDC
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {spentPercentage.toFixed(1)}% of budget used
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Start: {new Date(Number(intent.start) * 1000).toLocaleDateString()} • 
          End: {new Date(Number(intent.end) * 1000).toLocaleDateString()}
          {isExpired && <span className="text-destructive ml-2">• Expired</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function PaymentIntentsList() {
  const { intents, loading, error, refetch } = usePaymentIntents();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Payment Intents</CardTitle>
          <CardDescription>Manage and monitor your AI agent payment intents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading payment intents...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Payment Intents</CardTitle>
          <CardDescription>Manage and monitor your AI agent payment intents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Your Payment Intents</CardTitle>
            <CardDescription>Manage and monitor your AI agent payment intents</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {intents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No payment intents found</p>
            <p className="text-sm text-muted-foreground">
              Create your first payment intent to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {intents.map((intent) => (
              <IntentCard key={intent.address} intent={intent} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}