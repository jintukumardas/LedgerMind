import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTokenAmount(
  amount: string | bigint, 
  decimals: number = 6,
  maxDecimals: number = 2
): string {
  if (!amount) return '0';
  
  const value = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const quotient = value / divisor;
  const remainder = value % divisor;
  
  if (remainder === BigInt(0)) {
    return quotient.toString();
  }
  
  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmed = remainderStr.replace(/0+$/, '');
  const decimalPart = trimmed.slice(0, maxDecimals);
  
  return `${quotient}.${decimalPart}`;
}

export function formatTokenAmountWithSymbol(
  amount: string | bigint,
  tokenAddress: string,
  usdcAddress: string
): string {
  const isUSDC = tokenAddress.toLowerCase() === usdcAddress.toLowerCase();
  const isNativeSEI = tokenAddress === '0x0000000000000000000000000000000000000000';
  
  if (isUSDC) {
    return `$${formatTokenAmount(amount, 6)} USDC`;
  } else if (isNativeSEI) {
    return `${formatTokenAmount(amount, 18, 6)} SEI`;
  } else {
    return `${formatTokenAmount(amount, 18)} Token`;
  }
}

export function parseTokenAmount(amount: string, decimals: number = 6): bigint {
  if (!amount || amount === '0') return 0n;
  
  const [whole, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
  
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedDecimal);
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeRelative(timestamp: number): string {
  const now = Date.now();
  const then = timestamp * 1000;
  const diff = now - then;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (seconds > 0) return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  
  return 'Just now';
}

export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function getExplorerUrl(txHash: string, chainId: number = 1328): string {
  // Sei testnet explorer
  if (chainId === 1328) {
    return `https://seitrace.com/tx/${txHash}`;
  }
  
  // Sei mainnet explorer
  if (chainId === 1329) {
    return `https://seitrace.com/tx/${txHash}`;
  }
  
  return `https://seitrace.com/tx/${txHash}`;
}

export function getAddressExplorerUrl(address: string, chainId: number = 1328): string {
  // Sei testnet explorer
  if (chainId === 1328) {
    return `https://seitrace.com/address/${address}`;
  }
  
  // Sei mainnet explorer
  if (chainId === 1329) {
    return `https://seitrace.com/address/${address}`;
  }
  
  return `https://seitrace.com/address/${address}`;
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch(() => false);
}

export function generateSalt(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function validateAmount(amount: string): boolean {
  return /^\d+(\.\d+)?$/.test(amount) && parseFloat(amount) > 0;
}

export function getIntentState(state: number): 'Active' | 'Revoked' | 'Expired' {
  const states = ['Active', 'Revoked', 'Expired'] as const;
  return states[state] || 'Active';
}

export function getIntentStateColor(state: string): string {
  switch (state) {
    case 'Active':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'Revoked':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'Expired':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function calculateProgress(spent: string | bigint, totalCap: string | bigint): number {
  const spentValue = typeof spent === 'string' ? BigInt(spent) : spent;
  const totalValue = typeof totalCap === 'string' ? BigInt(totalCap) : totalCap;
  
  if (totalValue === 0n) return 0;
  
  return Number((spentValue * 100n) / totalValue);
}