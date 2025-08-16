'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Github } from 'lucide-react';
import Link from 'next/link';

export function CTA() {
  return (
    <section className="py-24 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Join the future of AI agent commerce with secure, transparent payment intents on Sei blockchain
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" asChild>
            <Link href="/dashboard">
              Launch Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          
          <Button variant="outline" size="lg" asChild>
            <Link href="https://github.com/jintukumardas/ledgermind" target="_blank">
              <Github className="mr-2 h-4 w-4" />
              View on GitHub
            </Link>
          </Button>
        </div>
        
        <div className="mt-12 text-sm text-muted-foreground">
          <p>
            Built with ❤️ for the{' '}
            <Link href="https://dorahacks.io/hackathon/aiaccelathon/detail" className="text-primary hover:underline">
              Sei AI Accelathon
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}