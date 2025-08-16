// Sei Network Explorer URLs
const EXPLORER_URLS = {
  1328: 'https://seitrace.com', // Sei Testnet
  1329: 'https://seitrace.com', // Sei Mainnet
} as const;

export function getExplorerUrl(chainId: number, hash: string, type: 'tx' | 'address' = 'tx'): string {
  const baseUrl = EXPLORER_URLS[chainId as keyof typeof EXPLORER_URLS] || EXPLORER_URLS[1328];
  
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${hash}`;
    case 'address':
      return `${baseUrl}/address/${hash}`;
    default:
      return baseUrl;
  }
}

export function formatTransactionHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}