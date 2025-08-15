'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 px-6 py-24 sm:px-12 lg:px-20">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
        <div className="h-[400px] w-[400px] rounded-full bg-gradient-to-r from-sei-red/20 to-purple-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="text-center">
          {/* Badge */}
          <div className="mx-auto mb-8 inline-flex items-center rounded-full border bg-muted/50 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm">
            <Zap className="mr-2 h-4 w-4 text-sei-red" />
            Built for Sei AI Accelathon 2025
          </div>

          {/* Main heading */}
          <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Safe{' '}
            <span className="gradient-text bg-gradient-to-r from-sei-red to-purple-600 bg-clip-text text-transparent">
              AI Agent
            </span>{' '}
            Payment Intents
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Give your AI agents secure, limited-scope spending accounts with transparent audit trails. 
            Built on Sei for instant finality and native USDC support.
          </p>

          {/* Feature highlights */}
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            <div className="flex items-center justify-center gap-2 rounded-lg border bg-card/50 p-4 backdrop-blur-sm">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Spending Limits</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-lg border bg-card/50 p-4 backdrop-blur-sm">
              <Bot className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">MCP Compatible</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-lg border bg-card/50 p-4 backdrop-blur-sm">
              <Zap className="h-5 w-5 text-sei-red" />
              <span className="text-sm font-medium">Instant Finality</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href="/dashboard">
                Launch Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
              <Link href="/docs">
                View Documentation
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">400ms</div>
              <div className="text-sm text-muted-foreground">Block Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">19/19</div>
              <div className="text-sm text-muted-foreground">Tests Passing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">5</div>
              <div className="text-sm text-muted-foreground">MCP Tools</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">100%</div>
              <div className="text-sm text-muted-foreground">Open Source</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}