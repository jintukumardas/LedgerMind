'use client';

import { Shield, Clock, List, Eye, Zap, Lock } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Spending Limits',
    description: 'Set total caps and per-transaction limits to control agent spending',
  },
  {
    icon: Clock,
    title: 'Time Constraints',
    description: 'Define start and end dates for automatic intent expiration',
  },
  {
    icon: List,
    title: 'Merchant Allowlists',
    description: 'Restrict payments to approved merchant addresses only',
  },
  {
    icon: Eye,
    title: 'Verifiable Receipts',
    description: 'Every payment links to the exact AI action that triggered it',
  },
  {
    icon: Zap,
    title: 'Instant Revocation',
    description: 'Stop agent spending immediately with full user control',
  },
  {
    icon: Lock,
    title: 'Secure by Design',
    description: 'Battle-tested smart contracts with comprehensive security measures',
  },
];

export function Features() {
  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Enterprise-Grade Features
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to safely enable AI agent payments with complete transparency and control
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}