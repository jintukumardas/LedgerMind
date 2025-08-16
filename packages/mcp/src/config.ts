import { config as loadEnv } from 'dotenv';
import { Config, DatabaseConfig } from './types/index.js';

loadEnv();

function getEnvVar(name: string, required: boolean = true, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && required && !defaultValue) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || defaultValue || '';
}

const database: DatabaseConfig = {
  host: getEnvVar('DATABASE_HOST', false, 'localhost'),
  port: parseInt(getEnvVar('DATABASE_PORT', false, '5432')),
  database: getEnvVar('DATABASE_NAME', false, 'ledgermind'),
  user: getEnvVar('DATABASE_USER', false, 'postgres'),
  password: getEnvVar('DATABASE_PASSWORD', false, ''),
};

export const config: Config = {
  rpcUrl: getEnvVar('SEI_RPC_HTTP', true, 'https://evm-rpc-testnet.sei-apis.com'),
  chainId: parseInt(getEnvVar('SEI_CHAIN_ID', false, '1328')),
  factoryAddress: getEnvVar('FACTORY_ADDRESS'),
  usdcAddress: getEnvVar('USDC_ADDRESS', true, '0x4fCF1784B31630811181f670Aea7A7bEF803eaED'),
  privateKeyPayer: getEnvVar('PRIVATE_KEY_PAYER'),
  privateKeyAgent: getEnvVar('PRIVATE_KEY_AGENT', false),
  ipfsApiUrl: getEnvVar('IPFS_API_URL', false, 'https://ipfs.infura.io:5001'),
  ipfsApiKey: getEnvVar('IPFS_API_KEY', false),
  ipfsApiSecret: getEnvVar('IPFS_API_SECRET', false),
  database,
  port: parseInt(getEnvVar('PORT', false, '3001')),
  nodeEnv: getEnvVar('NODE_ENV', false, 'development'),
};

export default config;