'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { WalletConnect } from '@/components/wallet-connect';
import { NetworkBanner } from '@/components/network-banner';
import { Home, FileText, BarChart3 } from 'lucide-react';

export function Header() {
  return (
    <>
      <NetworkBanner />
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/logo.png"
              alt="LedgerMind Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold gradient-text bg-gradient-to-r from-sei-red to-purple-600 bg-clip-text text-transparent">
              LedgerMind
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="gap-1">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard" className="gap-1">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/docs" className="gap-1">
                <FileText className="h-4 w-4" />
                Docs
              </Link>
            </Button>
          </nav>

          {/* Wallet Connect */}
          <div className="flex items-center space-x-2">
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
    </>
  );
}