import { Metadata } from 'next';
import { Hero } from '@/components/hero';
import { Features } from '@/components/features';
import { HowItWorks } from '@/components/how-it-works';
import { CTA } from '@/components/cta';

export const metadata: Metadata = {
  title: 'LedgerMind - AI Agent Payment Intents',
  description: 'Safe, on-chain spending accounts for AI agents with transparent audit trails',
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <HowItWorks />
      <CTA />
    </main>
  );
}