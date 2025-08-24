'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useCrossChainPreferences } from '@/hooks/use-cross-chain-preferences';
import { Settings, Zap, DollarSign, Shield, Info, AlertCircle } from 'lucide-react';

export function CrossChainPreferences() {
  const {
    preferences,
    updatePreferences,
    resetPreferences,
    getPriorityLabel,
    getSlippageLabel,
    isLoading,
  } = useCrossChainPreferences();

  const [tempSlippage, setTempSlippage] = useState((preferences.maxSlippage || 0.03) * 100);
  const [tempAutoAmount, setTempAutoAmount] = useState(preferences.maxAutoApprovalAmount);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cross-Chain Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSlippageChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
      setTempSlippage(numValue);
      updatePreferences({ maxSlippage: numValue / 100 });
    }
  };

  const handleAutoAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setTempAutoAmount(value);
      updatePreferences({ maxAutoApprovalAmount: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-blue-600" />
            Cross-Chain Transaction Preferences
            <Badge variant="outline" className="ml-auto">
              {preferences.enableCrossChain ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Configure how AI agents should handle cross-chain transactions and approvals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Enable Cross-Chain */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <Label className="text-sm font-medium">Enable Cross-Chain Transactions</Label>
              </div>
              <p className="text-xs text-gray-600">
                Allow AI agents to execute transactions across different blockchains
              </p>
            </div>
            <Switch
              checked={preferences.enableCrossChain}
              onCheckedChange={(checked) => updatePreferences({ enableCrossChain: checked })}
            />
          </div>

          {/* Transaction Priority */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-600" />
              <Label className="text-sm font-medium">Transaction Priority</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['fastest', 'balanced', 'cheapest'] as const).map((priority) => (
                <Button
                  key={priority}
                  variant={preferences.priority === priority ? 'default' : 'outline'}
                  size="sm"
                  className="h-auto p-3 text-left"
                  onClick={() => updatePreferences({ priority })}
                >
                  <div className="space-y-1">
                    <div className="font-medium capitalize">{priority}</div>
                    <div className="text-xs opacity-70">
                      {priority === 'fastest' && 'Higher fees, faster execution'}
                      {priority === 'balanced' && 'Optimal balance of speed and cost'}
                      {priority === 'cheapest' && 'Lowest fees, may be slower'}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Current: {getPriorityLabel(preferences.priority)}
            </p>
          </div>

          {/* Slippage Tolerance */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <Label className="text-sm font-medium">Maximum Slippage Tolerance</Label>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    type="number"
                    value={tempSlippage}
                    onChange={(e) => handleSlippageChange(e.target.value)}
                    min="0.1"
                    max="20"
                    step="0.1"
                    className="pr-8"
                    disabled={!preferences.enableCrossChain}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    %
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 3, 5].map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSlippageChange(preset.toString())}
                    disabled={!preferences.enableCrossChain}
                  >
                    {preset}%
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Higher slippage allows transactions during high volatility but may result in worse rates
            </p>
          </div>

          {/* Auto-Approval Settings */}
          <div className="space-y-4 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium">Auto-Approve Small Transactions</Label>
                </div>
                <p className="text-xs text-gray-600">
                  Let agents execute small transactions without asking for approval
                </p>
              </div>
              <Switch
                checked={preferences.autoApprove && preferences.enableCrossChain}
                onCheckedChange={(checked) => updatePreferences({ autoApprove: checked })}
                disabled={!preferences.enableCrossChain}
              />
            </div>
            
            {preferences.autoApprove && preferences.enableCrossChain && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Maximum Auto-Approval Amount (USD)</Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      $
                    </span>
                    <Input
                      type="number"
                      value={tempAutoAmount}
                      onChange={(e) => handleAutoAmountChange(e.target.value)}
                      min="0"
                      max="1000"
                      step="1"
                      className="pl-8"
                    />
                  </div>
                  <div className="flex gap-1">
                    {[5, 10, 25, 50].map((preset) => (
                      <Button
                        key={preset}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoAmountChange(preset.toString())}
                      >
                        ${preset}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  <AlertCircle className="h-3 w-3" />
                  Transactions above this amount will require your explicit approval
                </div>
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Allow Chain Switching</Label>
                <p className="text-xs text-gray-600">
                  Permit agents to switch between different blockchain networks
                </p>
              </div>
              <Switch
                checked={preferences.allowSwitchChain && preferences.enableCrossChain}
                onCheckedChange={(checked) => updatePreferences({ allowSwitchChain: checked })}
                disabled={!preferences.enableCrossChain}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={resetPreferences}
              size="sm"
            >
              Reset to Defaults
            </Button>
            <div className="text-xs text-gray-500">
              Settings are saved automatically
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Current Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <div className="text-gray-600">Status</div>
              <Badge variant={preferences.enableCrossChain ? 'default' : 'secondary'}>
                {preferences.enableCrossChain ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-gray-600">Priority</div>
              <div className="font-medium capitalize">{preferences.priority}</div>
            </div>
            <div className="space-y-1">
              <div className="text-gray-600">Max Slippage</div>
              <div className="font-medium">{getSlippageLabel(preferences.maxSlippage)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-gray-600">Auto-Approval</div>
              <div className="font-medium">
                {preferences.autoApprove && preferences.enableCrossChain 
                  ? `Up to $${preferences.maxAutoApprovalAmount}` 
                  : 'Disabled'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}