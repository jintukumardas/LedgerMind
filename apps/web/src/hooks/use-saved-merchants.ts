'use client';

import { useState, useEffect } from 'react';
import { ipfsService } from '@/lib/ipfs';

export interface SavedMerchant {
  id: string;
  name: string;
  address: string;
  category: string;
  icon?: string;
  isIPFS?: boolean;
  ipfsHash?: string;
}

const MERCHANTS_STORAGE_KEY = 'ledgermind_saved_merchants';

// Predefined merchants for demo
const predefinedMerchants: SavedMerchant[] = [
  {
    id: 'grocery-demo',
    name: 'Demo Grocery Store',
    address: '0x742d35Cc6Af09C8B8B4f0C07A9bCa8Fb2E9e9189',
    category: 'grocery',
    icon: '🛒',
  },
  {
    id: 'coffee-demo',
    name: 'Daily Coffee Shop',
    address: '0x1234567890123456789012345678901234567890',
    category: 'coffee',
    icon: '☕',
  },
  {
    id: 'tutor-demo',
    name: 'Math Tutor',
    address: '0x9876543210987654321098765432109876543210',
    category: 'education',
    icon: '📚',
  },
  {
    id: 'rent-demo',
    name: 'Apartment Rent',
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    category: 'rent',
    icon: '🏠',
  },
];

export function useSavedMerchants() {
  const [merchants, setMerchants] = useState<SavedMerchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);

  // Load merchants from localStorage and IPFS on mount
  useEffect(() => {
    const loadMerchants = async () => {
      try {
        // First, check for IPFS hash in localStorage
        const storedHash = localStorage.getItem('merchants_ipfs_hash');
        if (storedHash) {
          setIpfsHash(storedHash);
          try {
            const ipfsMerchants = await ipfsService.downloadMerchants(storedHash);
            const combined = [...predefinedMerchants];
            ipfsMerchants.forEach((merchant: SavedMerchant) => {
              if (!combined.find(m => m.address.toLowerCase() === merchant.address.toLowerCase())) {
                combined.push({ ...merchant, isIPFS: true, ipfsHash: storedHash });
              }
            });
            setMerchants(combined);
            return;
          } catch (ipfsError) {
            console.warn('Failed to load from IPFS, falling back to localStorage:', ipfsError);
          }
        }

        // Fallback to localStorage
        const saved = localStorage.getItem(MERCHANTS_STORAGE_KEY);
        if (saved) {
          const parsedMerchants = JSON.parse(saved);
          const combined = [...predefinedMerchants];
          parsedMerchants.forEach((merchant: SavedMerchant) => {
            if (!combined.find(m => m.address.toLowerCase() === merchant.address.toLowerCase())) {
              combined.push(merchant);
            }
          });
          setMerchants(combined);
        } else {
          setMerchants(predefinedMerchants);
        }
      } catch (error) {
        console.error('Error loading saved merchants:', error);
        setMerchants(predefinedMerchants);
      } finally {
        setIsLoading(false);
      }
    };

    loadMerchants();
  }, []);

  // Save merchants to localStorage and optionally IPFS
  const saveMerchants = async (newMerchants: SavedMerchant[], saveToIPFS = false) => {
    try {
      // Only save user-added merchants (not predefined ones)
      const userMerchants = newMerchants.filter(m => !predefinedMerchants.find(p => p.id === m.id));
      
      if (saveToIPFS && userMerchants.length > 0) {
        try {
          const hash = await ipfsService.uploadMerchants(userMerchants);
          localStorage.setItem('merchants_ipfs_hash', hash);
          setIpfsHash(hash);
          
          // Mark merchants as saved to IPFS
          const merchantsWithIPFS = newMerchants.map(m => 
            userMerchants.find(um => um.id === m.id) 
              ? { ...m, isIPFS: true, ipfsHash: hash }
              : m
          );
          setMerchants(merchantsWithIPFS);
          return hash;
        } catch (ipfsError) {
          console.warn('IPFS save failed, falling back to localStorage:', ipfsError);
        }
      }
      
      // Save to localStorage
      localStorage.setItem(MERCHANTS_STORAGE_KEY, JSON.stringify(userMerchants));
      setMerchants(newMerchants);
    } catch (error) {
      console.error('Error saving merchants:', error);
    }
  };

  const addMerchant = (merchant: Omit<SavedMerchant, 'id'>) => {
    const newMerchant: SavedMerchant = {
      ...merchant,
      id: Date.now().toString(),
    };
    const updatedMerchants = [...merchants, newMerchant];
    saveMerchants(updatedMerchants);
    return newMerchant;
  };

  const updateMerchant = (id: string, updates: Partial<SavedMerchant>) => {
    const updatedMerchants = merchants.map(merchant =>
      merchant.id === id ? { ...merchant, ...updates } : merchant
    );
    saveMerchants(updatedMerchants);
  };

  const deleteMerchant = (id: string) => {
    // Don't allow deleting predefined merchants
    if (predefinedMerchants.find(m => m.id === id)) {
      return false;
    }
    const updatedMerchants = merchants.filter(merchant => merchant.id !== id);
    saveMerchants(updatedMerchants);
    return true;
  };

  const getMerchantByAddress = (address: string): SavedMerchant | undefined => {
    return merchants.find(m => m.address.toLowerCase() === address.toLowerCase());
  };

  const getMerchantsByCategory = (category: string): SavedMerchant[] => {
    return merchants.filter(m => m.category === category);
  };

  // IPFS functionality (placeholder for now)
  const saveToIPFS = async (merchant: SavedMerchant): Promise<string> => {
    // Placeholder for IPFS integration
    // This would use a service like Pinata or web3.storage
    console.log('IPFS save would happen here for merchant:', merchant);
    return 'QmPlaceholderIPFSHash' + Date.now();
  };

  const loadFromIPFS = async (ipfsHash: string): Promise<SavedMerchant | null> => {
    // Placeholder for IPFS integration
    console.log('IPFS load would happen here for hash:', ipfsHash);
    return null;
  };

  const saveAllToIPFS = async (): Promise<string | null> => {
    const userMerchants = merchants.filter(m => !predefinedMerchants.find(p => p.id === m.id));
    if (userMerchants.length === 0) return null;
    
    try {
      const hash = await ipfsService.uploadMerchants(userMerchants);
      localStorage.setItem('merchants_ipfs_hash', hash);
      setIpfsHash(hash);
      return hash;
    } catch (error) {
      console.error('Failed to save to IPFS:', error);
      return null;
    }
  };

  return {
    merchants,
    isLoading,
    ipfsHash,
    addMerchant,
    updateMerchant,
    deleteMerchant,
    getMerchantByAddress,
    getMerchantsByCategory,
    saveToIPFS,
    loadFromIPFS,
    saveAllToIPFS,
  };
}