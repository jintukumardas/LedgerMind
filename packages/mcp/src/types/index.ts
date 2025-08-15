
export interface ReceiptBlob {
  tool: string;
  inputHash: string;
  outputHash: string;
  signer: string;
  nonce: string;
  cost?: string;
  timestamp: number;
  chainId: number;
  txHash?: string;
  context?: any;
}

export interface PaymentIntentInfo {
  address: string;
  payer: string;
  agent: string;
  token: string;
  limits: {
    totalCap: string;
    perTxCap: string;
    spent: string;
    start: number;
    end: number;
  };
  state: 'Active' | 'Revoked' | 'Expired';
  balance: string;
  metadataURI: string;
}

export interface PaymentReceipt {
  intentAddress: string;
  txHash: string;
  merchant: string;
  amount: string;
  token: string;
  receiptHash: string;
  receiptURI: string;
  timestamp: number;
  blockNumber: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface Config {
  rpcUrl: string;
  chainId: number;
  factoryAddress: string;
  usdcAddress: string;
  privateKeyPayer: string;
  privateKeyAgent?: string;
  ipfsApiUrl?: string;
  ipfsApiKey?: string;
  ipfsApiSecret?: string;
  database: DatabaseConfig;
  port: number;
  nodeEnv: string;
}