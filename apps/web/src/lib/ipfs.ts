import { PinataSDK } from "pinata";

export interface IPFSFile {
  name: string;
  content: string;
}

class IPFSService {
  private pinata: PinataSDK | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializePinata();
  }

  private initializePinata() {
    try {
      const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
      
      if (jwt) {
        this.pinata = new PinataSDK({
          pinataJwt: jwt,
        });
        this.isConfigured = true;
        console.log('Pinata IPFS service initialized');
      } else {
        console.warn('Pinata JWT not configured, falling back to localStorage');
        this.isConfigured = false;
      }
    } catch (error) {
      console.error('Failed to initialize Pinata:', error);
      this.isConfigured = false;
    }
  }

  async uploadToIPFS(data: any): Promise<string> {
    try {
      if (this.isConfigured && this.pinata) {
        // Use real Pinata IPFS
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const file = new File([blob], `merchants-${Date.now()}.json`, { type: 'application/json' });

        const upload = await this.pinata.upload.public.file(file);

        console.log('Successfully uploaded to IPFS via Pinata:', upload.cid);
        return upload.cid;
      } else {
        // Fallback to localStorage for demo/development
        const jsonString = JSON.stringify(data);
        const hash = `Qm${this.generateFakeHash()}`;
        
        localStorage.setItem(`ipfs_${hash}`, jsonString);
        console.log('Fallback: Stored in localStorage with simulated hash:', hash);
        return hash;
      }
    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadFromIPFS(hash: string): Promise<any> {
    try {
      if (this.isConfigured && this.pinata && !hash.startsWith('Qm' + '1')) {
        // Use real Pinata IPFS
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Successfully downloaded from IPFS via Pinata:', hash);
        return data;
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem(`ipfs_${hash}`);
        if (!stored) {
          throw new Error('Data not found in localStorage fallback');
        }
        
        const data = JSON.parse(stored);
        console.log('Fallback: Retrieved from localStorage:', hash);
        return data;
      }
    } catch (error) {
      console.error('IPFS download failed:', error);
      throw new Error(`Failed to download from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadMerchants(merchants: any[]): Promise<string> {
    const merchantData = {
      version: '1.0',
      timestamp: Date.now(),
      merchants: merchants,
      app: 'ledgermind'
    };
    
    return this.uploadToIPFS(merchantData);
  }

  async downloadMerchants(hash: string): Promise<any[]> {
    const data = await this.downloadFromIPFS(hash);
    return data.merchants || [];
  }

  async listUserFiles(): Promise<any[]> {
    try {
      if (this.isConfigured && this.pinata) {
        // Simplified for now - return empty array
        return [];
      } else {
        return [];
      }
    } catch (error) {
      console.error('Failed to list IPFS files:', error);
      return [];
    }
  }

  async deleteFile(hash: string): Promise<boolean> {
    try {
      if (this.isConfigured && this.pinata) {
        // Simplified for now - just return true
        console.log('Delete file from IPFS (simulated):', hash);
        return true;
      } else {
        localStorage.removeItem(`ipfs_${hash}`);
        return true;
      }
    } catch (error) {
      console.error('Failed to delete IPFS file:', error);
      return false;
    }
  }

  private generateFakeHash(): string {
    // Generate a fake IPFS-like hash for localStorage fallback
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  isUsingRealIPFS(): boolean {
    return this.isConfigured;
  }
}

export const ipfsService = new IPFSService();