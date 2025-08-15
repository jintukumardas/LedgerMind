'use client';

import { ArrowRight, Wallet, Settings, Bot, Receipt } from 'lucide-react';

const steps = [
  {
    icon: Wallet,
    title: 'Connect Wallet',
    description: 'Connect your Sei wallet and deposit USDC for agent spending',
  },
  {
    icon: Settings,
    title: 'Set Constraints',
    description: 'Define spending limits, time bounds, and merchant allowlists',
  },
  {
    icon: Bot,
    title: 'Agent Spends',
    description: 'Your AI agent makes payments within the defined constraints',
  },
  {
    icon: Receipt,
    title: 'View Receipts',
    description: 'Monitor all payments with verifiable, auditable receipts',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started with AI agent payments in four simple steps
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center relative">
              {/* Step number */}
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-4">
                {index + 1}
              </div>
              
              {/* Icon */}
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-8 h-8 text-foreground" />
              </div>
              
              {/* Content */}
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.description}</p>
              
              {/* Arrow (except for last step) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-full w-full">
                  <ArrowRight className="w-6 h-6 text-muted-foreground mx-auto" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}