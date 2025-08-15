import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { config } from '../config.js';
import { ReceiptBlob } from '../types/index.js';

export class IPFSService {
  private client?: IPFSHTTPClient;

  constructor() {
    if (config.ipfsApiUrl) {
      const auth = config.ipfsApiKey && config.ipfsApiSecret ? 
        'Basic ' + Buffer.from(config.ipfsApiKey + ':' + config.ipfsApiSecret).toString('base64') : 
        undefined;

      this.client = create({
        url: config.ipfsApiUrl,
        headers: auth ? { authorization: auth } : undefined,
      });
    }
  }

  async pinReceipt(receiptBlob: ReceiptBlob): Promise<{ hash: string; uri: string }> {
    if (!this.client) {
      console.warn('IPFS client not configured, using mock hash');
      const mockHash = '0x' + Buffer.from(JSON.stringify(receiptBlob)).toString('hex').slice(0, 64);
      return {
        hash: mockHash,
        uri: `ipfs://Qm${mockHash.slice(2, 48)}`
      };
    }

    try {
      // Canonicalize the receipt blob
      const canonicalBlob = this.canonicalizeReceipt(receiptBlob);
      const buffer = Buffer.from(JSON.stringify(canonicalBlob));

      // Pin to IPFS
      const result = await this.client.add(buffer, {
        pin: true,
        cidVersion: 1,
      });

      const hash = '0x' + Buffer.from(JSON.stringify(canonicalBlob)).toString('hex');
      const hashBytes32 = hash.slice(0, 66); // Ensure 32 bytes

      return {
        hash: hashBytes32,
        uri: `ipfs://${result.cid}`
      };
    } catch (error) {
      console.error('Failed to pin receipt to IPFS:', error);
      throw new Error('Failed to store receipt');
    }
  }

  async getReceipt(cid: string): Promise<ReceiptBlob | null> {
    if (!this.client) {
      return null;
    }

    try {
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }
      
      const data = Buffer.concat(chunks);
      return JSON.parse(data.toString()) as ReceiptBlob;
    } catch (error) {
      console.error('Failed to retrieve receipt from IPFS:', error);
      return null;
    }
  }

  private canonicalizeReceipt(receiptBlob: ReceiptBlob): ReceiptBlob {
    // Ensure deterministic JSON serialization
    return {
      tool: receiptBlob.tool,
      inputHash: receiptBlob.inputHash,
      outputHash: receiptBlob.outputHash,
      signer: receiptBlob.signer,
      nonce: receiptBlob.nonce,
      cost: receiptBlob.cost || '0',
      timestamp: receiptBlob.timestamp,
      chainId: receiptBlob.chainId,
      txHash: receiptBlob.txHash,
      context: receiptBlob.context,
    };
  }

  generateReceiptHash(receiptBlob: ReceiptBlob): string {
    const canonicalBlob = this.canonicalizeReceipt(receiptBlob);
    const jsonString = JSON.stringify(canonicalBlob);
    return '0x' + Buffer.from(jsonString).toString('hex').slice(0, 64);
  }
}

export const ipfsService = new IPFSService();