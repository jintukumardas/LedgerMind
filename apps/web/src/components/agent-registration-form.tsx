'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, 
  Upload, 
  X, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  DollarSign,
  Code,
  Shield,
  Zap,
  MessageCircle,
  Star,
  Globe,
  Loader2
} from 'lucide-react';

interface AgentRegistrationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface AgentFormData {
  name: string;
  description: string;
  detailedDescription: string;
  capabilities: string[];
  pricePerUse: number;
  category: string;
  aiModelEndpoint: string;
  apiKey: string;
  logoUri: string;
  websiteUrl: string;
  githubUrl: string;
  documentationUrl: string;
  supportEmail: string;
  tags: string[];
  isOpenSource: boolean;
  privacyPolicy: string;
  termsOfService: string;
  agreeToTerms: boolean;
  testingInstructions: string;
}

const AGENT_CATEGORIES = [
  { value: 'payment', label: 'Payment Processing', icon: DollarSign },
  { value: 'defi', label: 'DeFi Operations', icon: Zap },
  { value: 'security', label: 'Security & Auditing', icon: Shield },
  { value: 'trading', label: 'Trading & Analytics', icon: Star },
  { value: 'development', label: 'Smart Contract Development', icon: Code },
  { value: 'communication', label: 'Communication & Support', icon: MessageCircle },
  { value: 'general', label: 'General Purpose', icon: Bot },
  { value: 'other', label: 'Other', icon: Globe },
];

const CAPABILITY_SUGGESTIONS = [
  'USDC Payments', 'Payment Intents', 'Multi-chain Support', 'Risk Analysis',
  'DeFi Protocols', 'Yield Optimization', 'Token Swaps', 'Liquidity Management',
  'Smart Contract Audit', 'Security Analysis', 'Vulnerability Detection',
  'NFT Trading', 'Market Analysis', 'Portfolio Management', 'Trend Prediction',
  'Balance Checking', 'Transaction History', 'Wallet Management',
  'Cross-chain Bridge', 'Gas Optimization', 'MEV Protection',
  'Automated Trading', 'Price Alerts', 'Technical Analysis',
  'Code Generation', 'Contract Deployment', 'Testing Automation'
];

export function AgentRegistrationForm({ onSuccess, onCancel }: AgentRegistrationFormProps) {
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    detailedDescription: '',
    capabilities: [],
    pricePerUse: 5,
    category: '',
    aiModelEndpoint: '',
    apiKey: '',
    logoUri: '',
    websiteUrl: '',
    githubUrl: '',
    documentationUrl: '',
    supportEmail: '',
    tags: [],
    isOpenSource: false,
    privacyPolicy: '',
    termsOfService: '',
    agreeToTerms: false,
    testingInstructions: ''
  });

  const [newCapability, setNewCapability] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);

  const { isConnected, address } = useAccount();
  const { toast } = useToast();

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Agent name is required';
      if (!formData.description.trim()) newErrors.description = 'Description is required';
      if (!formData.category) newErrors.category = 'Category is required';
      if (formData.pricePerUse < 0.01) newErrors.pricePerUse = 'Price must be at least $0.01';
    }

    if (step === 2) {
      if (!formData.detailedDescription.trim()) newErrors.detailedDescription = 'Detailed description is required';
      if (formData.capabilities.length === 0) newErrors.capabilities = 'At least one capability is required';
    }

    if (step === 3) {
      if (!formData.aiModelEndpoint.trim()) newErrors.aiModelEndpoint = 'AI model endpoint is required';
      if (!formData.supportEmail.trim()) newErrors.supportEmail = 'Support email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail)) {
        newErrors.supportEmail = 'Valid email is required';
      }
    }

    if (step === 4) {
      if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const addCapability = () => {
    if (newCapability.trim() && !formData.capabilities.includes(newCapability.trim())) {
      setFormData(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, newCapability.trim()]
      }));
      setNewCapability('');
    }
  };

  const removeCapability = (capability: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.filter(cap => cap !== capability)
    }));
  };

  const addSuggestedCapability = (capability: string) => {
    if (!formData.capabilities.includes(capability)) {
      setFormData(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, capability]
      }));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to register an agent",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Register agent via API
      const response = await fetch('/api/agent/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          ownerAddress: address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const result = await response.json();

      toast({
        title: "Agent Registered Successfully!",
        description: `${formData.name} has been deployed to the marketplace with address ${result.agent.address}`,
      });

      onSuccess();
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: "Failed to register agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepIcon = (step: number) => {
    if (step < currentStep) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (step === currentStep) return <div className="h-5 w-5 bg-blue-500 rounded-full" />;
    return <div className="h-5 w-5 bg-gray-300 rounded-full" />;
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className="flex items-center space-x-2">
              {getStepIcon(step)}
              <span className={`text-sm font-medium ${step <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                Step {step}
              </span>
            </div>
            {index < 3 && (
              <div className={`h-px w-12 mx-4 ${step < currentStep ? 'bg-green-500' : 'bg-gray-300'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Agent Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="PaymentBot Pro"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Short Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Advanced payment processing with multi-chain support"
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className={`w-full px-3 py-2 border border-input bg-background rounded-md text-sm ${errors.category ? 'border-red-500' : ''}`}
              >
                <option value="">Select a category</option>
                {AGENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-sm text-red-500 mt-1">{errors.category}</p>
              )}
            </div>

            <div>
              <Label htmlFor="pricePerUse">Price per Use (USDC) *</Label>
              <Input
                id="pricePerUse"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.pricePerUse}
                onChange={(e) => setFormData(prev => ({ ...prev, pricePerUse: parseFloat(e.target.value) || 0 }))}
                className={errors.pricePerUse ? 'border-red-500' : ''}
              />
              {errors.pricePerUse && (
                <p className="text-sm text-red-500 mt-1">{errors.pricePerUse}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="logoUri">Logo URL (optional)</Label>
              <Input
                id="logoUri"
                value={formData.logoUri}
                onChange={(e) => setFormData(prev => ({ ...prev, logoUri: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Capabilities & Features */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Capabilities & Features</h3>
          </div>

          <div>
            <Label htmlFor="detailedDescription">Detailed Description *</Label>
            <Textarea
              id="detailedDescription"
              value={formData.detailedDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, detailedDescription: e.target.value }))}
              placeholder="Provide a comprehensive description of what your agent does, its unique features, and use cases..."
              rows={4}
              className={errors.detailedDescription ? 'border-red-500' : ''}
            />
            {errors.detailedDescription && (
              <p className="text-sm text-red-500 mt-1">{errors.detailedDescription}</p>
            )}
          </div>

          <div>
            <Label>Agent Capabilities *</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newCapability}
                  onChange={(e) => setNewCapability(e.target.value)}
                  placeholder="Add a capability"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
                />
                <Button type="button" onClick={addCapability} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.capabilities.map((capability) => (
                    <Badge key={capability} variant="default" className="gap-1">
                      {capability}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => removeCapability(capability)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Suggested capabilities:</p>
                <div className="flex flex-wrap gap-1">
                  {CAPABILITY_SUGGESTIONS.filter(cap => !formData.capabilities.includes(cap)).slice(0, 12).map((capability) => (
                    <Badge 
                      key={capability} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => addSuggestedCapability(capability)}
                    >
                      + {capability}
                    </Badge>
                  ))}
                </div>
              </div>

              {errors.capabilities && (
                <p className="text-sm text-red-500">{errors.capabilities}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Tags (optional)</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Technical Configuration */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Technical Configuration</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="aiModelEndpoint">AI Model Endpoint *</Label>
              <Input
                id="aiModelEndpoint"
                value={formData.aiModelEndpoint}
                onChange={(e) => setFormData(prev => ({ ...prev, aiModelEndpoint: e.target.value }))}
                placeholder="https://api.openai.com/v1/chat/completions"
                className={errors.aiModelEndpoint ? 'border-red-500' : ''}
              />
              {errors.aiModelEndpoint && (
                <p className="text-sm text-red-500 mt-1">{errors.aiModelEndpoint}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                URL where your AI model can be accessed
              </p>
            </div>

            <div>
              <Label htmlFor="apiKey">API Key (encrypted)</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                API key for your AI model (stored encrypted)
              </p>
            </div>

            <div>
              <Label htmlFor="testingInstructions">Testing Instructions</Label>
              <Textarea
                id="testingInstructions"
                value={formData.testingInstructions}
                onChange={(e) => setFormData(prev => ({ ...prev, testingInstructions: e.target.value }))}
                placeholder="Provide instructions for users to test your agent..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supportEmail">Support Email *</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, supportEmail: e.target.value }))}
                  placeholder="support@example.com"
                  className={errors.supportEmail ? 'border-red-500' : ''}
                />
                {errors.supportEmail && (
                  <p className="text-sm text-red-500 mt-1">{errors.supportEmail}</p>
                )}
              </div>

              <div>
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  placeholder="https://myagent.com"
                />
              </div>

              <div>
                <Label htmlFor="githubUrl">GitHub Repository</Label>
                <Input
                  id="githubUrl"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, githubUrl: e.target.value }))}
                  placeholder="https://github.com/user/repo"
                />
              </div>

              <div>
                <Label htmlFor="documentationUrl">Documentation URL</Label>
                <Input
                  id="documentationUrl"
                  value={formData.documentationUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentationUrl: e.target.value }))}
                  placeholder="https://docs.myagent.com"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isOpenSource"
                checked={formData.isOpenSource}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isOpenSource: !!checked }))}
              />
              <Label htmlFor="isOpenSource">This is an open-source agent</Label>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Review & Submit</h3>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{formData.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">
                    {AGENT_CATEGORIES.find(cat => cat.value === formData.category)?.label}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <p className="font-medium">${formData.pricePerUse} USDC</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Capabilities:</span>
                  <p className="font-medium">{formData.capabilities.length} features</p>
                </div>
              </div>
              
              <div>
                <span className="text-muted-foreground text-sm">Description:</span>
                <p className="text-sm">{formData.description}</p>
              </div>
              
              {formData.capabilities.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">Capabilities:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.capabilities.slice(0, 5).map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                    {formData.capabilities.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{formData.capabilities.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <Label htmlFor="privacyPolicy">Privacy Policy URL</Label>
            <Input
              id="privacyPolicy"
              value={formData.privacyPolicy}
              onChange={(e) => setFormData(prev => ({ ...prev, privacyPolicy: e.target.value }))}
              placeholder="https://myagent.com/privacy"
            />
          </div>

          <div>
            <Label htmlFor="termsOfService">Terms of Service URL</Label>
            <Input
              id="termsOfService"
              value={formData.termsOfService}
              onChange={(e) => setFormData(prev => ({ ...prev, termsOfService: e.target.value }))}
              placeholder="https://myagent.com/terms"
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="agreeToTerms"
              checked={formData.agreeToTerms}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreeToTerms: !!checked }))}
              className={errors.agreeToTerms ? 'border-red-500' : ''}
            />
            <div className="space-y-1">
              <Label htmlFor="agreeToTerms" className="text-sm leading-tight">
                I agree to the marketplace terms and conditions, and confirm that my agent complies with all applicable laws and regulations. *
              </Label>
              {errors.agreeToTerms && (
                <p className="text-sm text-red-500">{errors.agreeToTerms}</p>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Before submitting:</p>
                <ul className="list-disc list-inside text-yellow-700 mt-1 space-y-1">
                  <li>Ensure your AI endpoint is accessible and responds correctly</li>
                  <li>Test your agent thoroughly with various inputs</li>
                  <li>Have sufficient USDC in your wallet for deployment gas fees</li>
                  <li>Review all information for accuracy</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handlePrev}>
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          
          {currentStep < 4 ? (
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.agreeToTerms}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering Agent...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4" />
                  Register Agent
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}