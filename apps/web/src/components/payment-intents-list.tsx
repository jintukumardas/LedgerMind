import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePaymentIntents, PaymentIntent } from '@/hooks/use-payment-intents';
import { IntentManagement } from '@/components/intent-management';
import { formatAddress, formatTokenAmount } from '@/lib/utils';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Settings, Plus } from 'lucide-react';
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
          <div className="flex items-center space-x-2">
            <Badge variant={isActive && !isExpired ? "default" : "secondary"}>
              {isActive && !isExpired ? "Active" : isExpired ? "Expired" : intent.state === 1 ? "Paused" : intent.state === 2 ? "Revoked" : "Inactive"}
            </Badge>
          </div>
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
  const [currentPage, setCurrentPage] = useState(1);
  const [managingIntent, setManagingIntent] = useState<string | null>(null);
  const itemsPerPage = 5;
  
  // Calculate pagination
  const totalPages = Math.ceil(intents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentIntents = intents.slice(startIndex, endIndex);
  
  // Reset to first page when intents change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [intents.length, currentPage, totalPages]);

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
          <>
            <div className="space-y-4">
              {currentIntents.map((intent) => (
                <div key={intent.address} className="relative">
                  <IntentCard intent={intent} />
                  <div className="absolute top-4 right-4">
                    {intent.state !== 2 && !((intent.end < BigInt(Math.floor(Date.now() / 1000)))) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManagingIntent(intent.address)}
                        className="gap-1"
                      >
                        <Settings className="h-3 w-3" />
                        Manage
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, intents.length)} of {intents.length} intents
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Intent Management Modal */}
      {managingIntent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Manage Payment Intent</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setManagingIntent(null)}
                  className="gap-1"
                >
                  ✕ Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <IntentManagement intentAddress={managingIntent} />
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}