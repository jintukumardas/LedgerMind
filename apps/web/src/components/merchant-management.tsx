'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Store, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Calendar,
  TrendingUp,
  PieChart,
  BarChart3,
  ShoppingBag,
  Coffee,
  GraduationCap,
  Home,
  Car,
  ShoppingCart
} from 'lucide-react';
import { usePaymentIntents } from '@/hooks/use-payment-intents';
import { useTransactionHistory } from '@/hooks/use-transaction-history';
import { ipfsService } from '@/lib/ipfs';
import { formatUnits } from 'viem';

interface Merchant {
  id: string;
  name: string;
  address: string;
  category: string;
  icon: string;
  totalSpent: number;
  transactionCount: number;
  lastPayment?: Date;
  monthlyBudget?: number;
}

const merchantCategories = [
  { value: 'grocery', label: 'Grocery Store', icon: ShoppingCart },
  { value: 'coffee', label: 'Coffee Shop', icon: Coffee },
  { value: 'education', label: 'Education/Tutor', icon: GraduationCap },
  { value: 'rent', label: 'Rent/Housing', icon: Home },
  { value: 'transport', label: 'Transportation', icon: Car },
  { value: 'retail', label: 'Retail/Shopping', icon: ShoppingBag },
  { value: 'other', label: 'Other', icon: Store },
];

const predefinedMerchants: Omit<Merchant, 'totalSpent' | 'transactionCount'>[] = [
  {
    id: 'grocery-demo',
    name: 'Demo Grocery Store',
    address: '0x742d35Cc6Af09C8B8B4f0C07A9bCa8Fb2E9e9189',
    category: 'grocery',
    icon: '🛒',
    monthlyBudget: 800,
  },
  {
    id: 'coffee-demo',
    name: 'Daily Coffee Shop',
    address: '0x1234567890123456789012345678901234567890',
    category: 'coffee',
    icon: '☕',
    monthlyBudget: 150,
  },
  {
    id: 'tutor-demo',
    name: 'Math Tutor',
    address: '0x9876543210987654321098765432109876543210',
    category: 'education',
    icon: '📚',
    monthlyBudget: 400,
  },
  {
    id: 'rent-demo',
    name: 'Apartment Rent',
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    category: 'rent',
    icon: '🏠',
    monthlyBudget: 2000,
  },
  {
    id: 'investment-demo',
    name: 'Investment Fund',
    address: '0xfedcbafedcbafedcbafedcbafedcbafedcbafed',
    category: 'other',
    icon: '💰',
    monthlyBudget: 1000,
  },
];

export function MerchantManagement() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [newMerchant, setNewMerchant] = useState({
    name: '',
    address: '',
    category: 'other',
    monthlyBudget: '',
  });

  const { isConnected } = useAccount();
  const { intents } = usePaymentIntents();
  const { transactions } = useTransactionHistory();
  const { toast } = useToast();

  // Initialize with predefined merchants and calculate real spending data
  useEffect(() => {
    if (isConnected) {
      const merchantsWithData = predefinedMerchants.map(merchant => {
        // Calculate real spending data from blockchain transactions
        const merchantTransactions = transactions.filter(tx => 
          tx.to.toLowerCase() === merchant.address.toLowerCase() && 
          tx.type === 'payment' && 
          tx.status === 'confirmed'
        );
        
        const totalSpent = merchantTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        const transactionCount = merchantTransactions.length;
        const lastPayment = merchantTransactions.length > 0 
          ? merchantTransactions[0].timestamp // transactions are sorted by newest first
          : undefined;
        
        return {
          ...merchant,
          totalSpent,
          transactionCount,
          lastPayment,
        };
      });
      
      setMerchants(merchantsWithData);
    }
  }, [isConnected, transactions]);

  const handleAddMerchant = () => {
    if (!newMerchant.name || !newMerchant.address) {
      toast({
        title: "Invalid Input",
        description: "Please provide both merchant name and address",
        variant: "destructive",
      });
      return;
    }

    const merchant: Merchant = {
      id: Date.now().toString(),
      name: newMerchant.name,
      address: newMerchant.address,
      category: newMerchant.category,
      icon: merchantCategories.find(c => c.value === newMerchant.category)?.icon ? '🏪' : '🏪',
      totalSpent: 0,
      transactionCount: 0,
      monthlyBudget: newMerchant.monthlyBudget ? Number(newMerchant.monthlyBudget) : undefined,
    };

    setMerchants(prev => [...prev, merchant]);
    setNewMerchant({ name: '', address: '', category: 'other', monthlyBudget: '' });
    setShowAddForm(false);

    toast({
      title: "Merchant Added",
      description: `Added ${merchant.name} to your merchant list`,
    });
  };

  const handleDeleteMerchant = (id: string) => {
    setMerchants(prev => prev.filter(m => m.id !== id));
    toast({
      title: "Merchant Removed",
      description: "Merchant has been removed from your list",
    });
  };

  const getCategoryIcon = (category: string) => {
    const categoryInfo = merchantCategories.find(c => c.value === category);
    return categoryInfo?.icon || Store;
  };

  const getCategoryLabel = (category: string) => {
    const categoryInfo = merchantCategories.find(c => c.value === category);
    return categoryInfo?.label || 'Other';
  };

  const totalMonthlyBudget = merchants.reduce((sum, merchant) => sum + (merchant.monthlyBudget || 0), 0);
  const totalSpent = merchants.reduce((sum, merchant) => sum + merchant.totalSpent, 0);
  const budgetUtilization = totalMonthlyBudget > 0 ? (totalSpent / totalMonthlyBudget) * 100 : 0;

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Wallet Not Connected</h3>
          <p className="text-muted-foreground">
            Connect your wallet to manage your merchants and spending
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Store className="h-8 w-8" />
            Merchant Management
            <Badge variant="outline" className="text-sm">
              Experimental
            </Badge>
          </h2>
          <p className="text-muted-foreground">
            Manage your regular payment destinations and track spending patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {ipfsService.isUsingRealIPFS() ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>IPFS via Pinata</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Local Storage</span>
              </>
            )}
          </div>
          {ipfsService.isUsingRealIPFS() && (
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  const userMerchants = merchants.filter(m => !predefinedMerchants.find(p => p.id === m.id));
                  if (userMerchants.length > 0) {
                    const hash = await ipfsService.uploadMerchants(userMerchants);
                    toast({
                      title: "Saved to IPFS",
                      description: `Merchants saved with hash: ${hash.slice(0, 10)}...`,
                    });
                  } else {
                    toast({
                      title: "No Custom Merchants",
                      description: "Add custom merchants to save to IPFS",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Save Failed",
                    description: "Failed to save merchants to IPFS",
                    variant: "destructive",
                  });
                }
              }}
              className="gap-2"
            >
              📁 Save to IPFS
            </Button>
          )}
          <Button onClick={() => setShowAddForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Merchant
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Merchants</p>
                <p className="text-2xl font-bold">{merchants.length}</p>
              </div>
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Budget</p>
                <p className="text-2xl font-bold">${totalMonthlyBudget}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">${totalSpent}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Budget Used</p>
                <p className={`text-2xl font-bold ${budgetUtilization > 80 ? 'text-red-600' : budgetUtilization > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {budgetUtilization.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {merchantCategories.map(category => {
                const categoryMerchants = merchants.filter(m => m.category === category.value);
                const categorySpent = categoryMerchants.reduce((sum, m) => sum + m.totalSpent, 0);
                const percentage = totalSpent > 0 ? (categorySpent / totalSpent) * 100 : 0;
                
                if (categorySpent === 0) return null;
                
                return (
                  <div key={category.value} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      <span className="text-sm">{category.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">${categorySpent}</div>
                      <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Merchants by Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {merchants
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, 5)
                .map(merchant => {
                  const IconComponent = getCategoryIcon(merchant.category);
                  return (
                    <div key={merchant.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span className="text-sm">{merchant.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">${merchant.totalSpent}</div>
                        <div className="text-xs text-muted-foreground">{merchant.transactionCount} transactions</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Merchants List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Merchants</CardTitle>
          <CardDescription>
            Manage your regular payment destinations and track spending patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {merchants.length === 0 ? (
            <div className="py-12 text-center">
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Merchants Added</h3>
              <p className="text-muted-foreground mb-4">
                Add merchants to track your spending and create targeted payment intents
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                Add Your First Merchant
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {merchants.map(merchant => {
                const IconComponent = getCategoryIcon(merchant.category);
                const budgetPercentage = merchant.monthlyBudget 
                  ? (merchant.totalSpent / merchant.monthlyBudget) * 100 
                  : 0;

                return (
                  <Card key={merchant.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <IconComponent className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium">{merchant.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {getCategoryLabel(merchant.category)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMerchant(merchant)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMerchant(merchant.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Address:</span>
                          <span className="font-mono text-xs">
                            {merchant.address.slice(0, 6)}...{merchant.address.slice(-4)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Spent:</span>
                          <span className="font-medium">${merchant.totalSpent}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transactions:</span>
                          <span>{merchant.transactionCount}</span>
                        </div>

                        {merchant.monthlyBudget && (
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Budget:</span>
                              <span>${merchant.monthlyBudget}/month</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  budgetPercentage > 100 ? 'bg-red-500' : 
                                  budgetPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                              />
                            </div>
                            <div className="text-xs text-center text-muted-foreground">
                              {budgetPercentage.toFixed(1)}% used
                            </div>
                          </div>
                        )}

                        {merchant.lastPayment && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Last payment:</span>
                            <span>{merchant.lastPayment.toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Merchant Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add New Merchant</CardTitle>
              <CardDescription>
                Add a merchant to track spending and create payment intents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="merchantName">Merchant Name</Label>
                <Input
                  id="merchantName"
                  value={newMerchant.name}
                  onChange={(e) => setNewMerchant(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Local Coffee Shop"
                />
              </div>
              
              <div>
                <Label htmlFor="merchantAddress">Address</Label>
                <Input
                  id="merchantAddress"
                  value={newMerchant.address}
                  onChange={(e) => setNewMerchant(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="0x..."
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={newMerchant.category}
                  onChange={(e) => setNewMerchant(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  {merchantCategories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="monthlyBudget">Monthly Budget (Optional)</Label>
                <Input
                  id="monthlyBudget"
                  type="number"
                  value={newMerchant.monthlyBudget}
                  onChange={(e) => setNewMerchant(prev => ({ ...prev, monthlyBudget: e.target.value }))}
                  placeholder="500"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleAddMerchant} className="flex-1">
                  Add Merchant
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewMerchant({ name: '', address: '', category: 'other', monthlyBudget: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Merchant Modal */}
      {editingMerchant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Edit Merchant</CardTitle>
              <CardDescription>
                Update merchant information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="editMerchantName">Merchant Name</Label>
                <Input
                  id="editMerchantName"
                  value={editingMerchant.name}
                  onChange={(e) => setEditingMerchant(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="e.g., Local Coffee Shop"
                />
              </div>
              
              <div>
                <Label htmlFor="editMerchantAddress">Address</Label>
                <Input
                  id="editMerchantAddress"
                  value={editingMerchant.address}
                  onChange={(e) => setEditingMerchant(prev => prev ? { ...prev, address: e.target.value } : null)}
                  placeholder="0x..."
                />
              </div>
              
              <div>
                <Label htmlFor="editCategory">Category</Label>
                <select
                  id="editCategory"
                  value={editingMerchant.category}
                  onChange={(e) => setEditingMerchant(prev => prev ? { ...prev, category: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  {merchantCategories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="editMonthlyBudget">Monthly Budget (Optional)</Label>
                <Input
                  id="editMonthlyBudget"
                  type="number"
                  value={editingMerchant.monthlyBudget || ''}
                  onChange={(e) => setEditingMerchant(prev => prev ? { ...prev, monthlyBudget: e.target.value ? Number(e.target.value) : undefined } : null)}
                  placeholder="500"
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    if (editingMerchant) {
                      setMerchants(prev => prev.map(m => 
                        m.id === editingMerchant.id ? editingMerchant : m
                      ));
                      setEditingMerchant(null);
                      toast({
                        title: "Merchant Updated",
                        description: `Updated ${editingMerchant.name}`,
                      });
                    }
                  }} 
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setEditingMerchant(null)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}