import { Pool, PoolConfig } from 'pg';
import { config } from '../config.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseClient {
  private pool: Pool;

  constructor() {
    const poolConfig: PoolConfig = {
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(poolConfig);
    
    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async initialize(): Promise<void> {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');
      
      console.log('Initializing database schema...');
      await this.query(schema);
      console.log('Database schema initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Intent operations
  async insertIntent(data: {
    address: string;
    payer: string;
    agent: string;
    token: string;
    totalCap: string;
    perTxCap: string;
    startTime: number;
    endTime: number;
    metadataURI?: string;
    salt?: string;
    txHash: string;
    blockNumber: number;
  }): Promise<void> {
    const query = `
      INSERT INTO intents (
        address, payer, agent, token, total_cap, per_tx_cap, 
        start_time, end_time, metadata_uri, salt, tx_hash, block_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (address) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await this.query(query, [
      data.address,
      data.payer,
      data.agent,
      data.token,
      data.totalCap,
      data.perTxCap,
      data.startTime,
      data.endTime,
      data.metadataURI || null,
      data.salt || null,
      data.txHash,
      data.blockNumber,
    ]);
  }

  async insertMerchants(intentAddress: string, merchants: string[]): Promise<void> {
    if (merchants.length === 0) return;

    const values = merchants.map((_, i) => `($1, $${i + 2}, true)`).join(', ');
    const query = `
      INSERT INTO merchants (intent_address, merchant, allowed)
      VALUES ${values}
      ON CONFLICT (intent_address, merchant) DO UPDATE SET
        allowed = EXCLUDED.allowed,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await this.query(query, [intentAddress, ...merchants]);
  }

  async insertReceipt(data: {
    intentAddress: string;
    txHash: string;
    merchant: string;
    amount: string;
    token: string;
    receiptHash: string;
    receiptURI?: string;
    timestamp: number;
    blockNumber: number;
    gasUsed?: number;
  }): Promise<void> {
    const query = `
      INSERT INTO receipts (
        intent_address, tx_hash, merchant, amount, token, 
        receipt_hash, receipt_uri, timestamp, block_number, gas_used
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (tx_hash) DO NOTHING
    `;
    
    await this.query(query, [
      data.intentAddress,
      data.txHash,
      data.merchant,
      data.amount,
      data.token,
      data.receiptHash,
      data.receiptURI || null,
      data.timestamp,
      data.blockNumber,
      data.gasUsed || null,
    ]);
  }

  async updateIntentSpent(address: string, newSpent: string): Promise<void> {
    const query = `
      UPDATE intents 
      SET spent = $2, updated_at = CURRENT_TIMESTAMP
      WHERE address = $1
    `;
    
    await this.query(query, [address, newSpent]);
  }

  async insertRevocation(data: {
    intentAddress: string;
    revokedBy: string;
    reason?: string;
    txHash: string;
    blockNumber: number;
    timestamp: number;
  }): Promise<void> {
    // Insert revocation record
    const revokeQuery = `
      INSERT INTO revocations (
        intent_address, revoked_by, reason, tx_hash, block_number, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await this.query(revokeQuery, [
      data.intentAddress,
      data.revokedBy,
      data.reason || null,
      data.txHash,
      data.blockNumber,
      data.timestamp,
    ]);

    // Update intent state
    const updateQuery = `
      UPDATE intents 
      SET state = 1, updated_at = CURRENT_TIMESTAMP
      WHERE address = $1
    `;
    
    await this.query(updateQuery, [data.intentAddress]);
  }

  async insertTopUp(data: {
    intentAddress: string;
    amount: string;
    txHash: string;
    blockNumber: number;
    timestamp: number;
  }): Promise<void> {
    const query = `
      INSERT INTO top_ups (
        intent_address, amount, tx_hash, block_number, timestamp
      ) VALUES ($1, $2, $3, $4, $5)
    `;
    
    await this.query(query, [
      data.intentAddress,
      data.amount,
      data.txHash,
      data.blockNumber,
      data.timestamp,
    ]);
  }

  async insertWithdrawal(data: {
    intentAddress: string;
    toAddress: string;
    amount: string;
    txHash: string;
    blockNumber: number;
    timestamp: number;
  }): Promise<void> {
    const query = `
      INSERT INTO withdrawals (
        intent_address, to_address, amount, tx_hash, block_number, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await this.query(query, [
      data.intentAddress,
      data.toAddress,
      data.amount,
      data.txHash,
      data.blockNumber,
      data.timestamp,
    ]);
  }

  // Query operations
  async getIntentsByPayer(payer: string, limit: number = 10, offset: number = 0): Promise<any[]> {
    const query = `
      SELECT * FROM intent_summary 
      WHERE payer = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.query(query, [payer, limit, offset]);
    return result.rows;
  }

  async getIntentsByAgent(agent: string, limit: number = 10, offset: number = 0): Promise<any[]> {
    const query = `
      SELECT * FROM intent_summary
      WHERE agent = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.query(query, [agent, limit, offset]);
    return result.rows;
  }

  async getReceiptsByIntent(intentAddress: string, limit: number = 10, offset: number = 0): Promise<any[]> {
    const query = `
      SELECT * FROM receipts
      WHERE intent_address = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.query(query, [intentAddress, limit, offset]);
    return result.rows;
  }

  async getIntentDetails(address: string): Promise<any | null> {
    const query = `
      SELECT * FROM intent_summary WHERE address = $1
    `;
    
    const result = await this.query(query, [address]);
    return result.rows[0] || null;
  }

  async updateLastProcessedBlock(blockNumber: number): Promise<void> {
    const query = `
      INSERT INTO indexer_state (key, value) 
      VALUES ('last_block', $1)
      ON CONFLICT (key) DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    // First ensure the table exists
    await this.query(`
      CREATE TABLE IF NOT EXISTS indexer_state (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await this.query(query, [blockNumber.toString()]);
  }

  async getLastProcessedBlock(): Promise<number> {
    const query = `SELECT value FROM indexer_state WHERE key = 'last_block'`;
    
    try {
      const result = await this.query(query);
      return result.rows[0] ? parseInt(result.rows[0].value) : 0;
    } catch {
      return 0;
    }
  }
}

export const dbClient = new DatabaseClient();