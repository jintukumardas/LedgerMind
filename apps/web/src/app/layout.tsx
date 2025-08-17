import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Header } from '@/components/header';
import { cn } from '@/lib/utils';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LedgerMind - AI Agent Payment Intents',
  description: 'Secure, on-chain spending accounts for AI agents with transparent audit trails',
  keywords: ['AI agents', 'blockchain', 'payment intents', 'Sei', 'USDC', 'smart contracts'],
  authors: [{ name: 'LedgerMind Team' }],
  openGraph: {
    title: 'LedgerMind - AI Agent Payment Intents',
    description: 'Secure, on-chain spending accounts for AI agents with transparent audit trails',
    type: 'website',
    locale: 'en_US',
    siteName: 'LedgerMind',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LedgerMind - AI Agent Payment Intents',
    description: 'Secure, on-chain spending accounts for AI agents with transparent audit trails',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        inter.className,
        'min-h-screen bg-background font-sans antialiased'
      )}>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}