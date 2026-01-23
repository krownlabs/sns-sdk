import { Contract, Provider, Signer } from 'ethers';
import { 
  AvailabilityResult,
  DomainRecord
} from '../types';
import { ISonicRegistry } from '../types/contracts';
import { Cache, generateAvailabilityCacheKey } from '../utils/cache';
import { retryWithBackoff } from '../utils/helpers';
import { normalizeDomainName, addTLD } from '../utils/validation';
import { 
  DomainNotFoundError, 
  PermissionError,
  NetworkError 
} from '../errors';
import SonicRegistryABI from '../contracts/abis/SonicRegistryV2.json';

export class SonicRegistry {
  private registryContract: ISonicRegistry;
  private cache: Cache<any>;

  constructor(
    provider: Provider,
    registryAddress: string,
    cacheEnabled: boolean = true,
    cacheTTL: number = 5 * 60 * 1000 // 5 minutes
  ) {
    this.registryContract = new Contract(registryAddress, SonicRegistryABI.abi, provider) as ISonicRegistry;
    this.cache = cacheEnabled ? new Cache(cacheTTL) : new Cache(0); // Disable cache if not enabled
  }

  /**
   * Check if a domain is available for registration
   */
  async isAvailable(domain: string): Promise<AvailabilityResult> {
    const normalizedDomain = normalizeDomainName(domain);
    const cacheKey = generateAvailabilityCacheKey(normalizedDomain);

    // Check cache first (with shorter TTL for availability)
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await retryWithBackoff(async () => {
        const available = await this.registryContract.available(normalizedDomain);
        
        if (available) {
          const availabilityResult: AvailabilityResult = {
            available: true
          };
          
          // Cache for shorter time since availability can change quickly
          this.cache.set(cacheKey, availabilityResult, 30 * 1000); // 30 seconds
          return availabilityResult;
        }

        // Domain is not available, get more details
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        
        if (tokenId.toString() === '0') {
          // This shouldn't happen if available() returned false, but handle it
          const availabilityResult: AvailabilityResult = {
            available: true
          };
          this.cache.set(cacheKey, availabilityResult, 30 * 1000);
          return availabilityResult;
        }

        const [owner, expiryTime, expired] = await Promise.all([
          this.registryContract.ownerOf(tokenId),
          this.registryContract.getExpiryTime(tokenId),
          this.registryContract.isExpired(tokenId)
        ]);

        const availabilityResult: AvailabilityResult = {
          available: false,
          reason: expired ? 'expired' : 'taken',
          expiryTime: Number(expiryTime),
          owner: owner
        };

        // Cache for shorter time
        this.cache.set(cacheKey, availabilityResult, 30 * 1000);
        return availabilityResult;
      });

      return result;
    } catch (error: any) {
      throw new NetworkError(`Failed to check availability for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Get domain expiry time
   */
  async getExpiryTime(domain: string): Promise<number> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        
        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(normalizedDomain);
        }

        const expiryTime = await this.registryContract.getExpiryTime(tokenId);
        return Number(expiryTime);
      });
    } catch (error: any) {
      if (error instanceof DomainNotFoundError) {
        throw error;
      }
      throw new NetworkError(`Failed to get expiry time for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Check if domain is expired
   */
  async isExpired(domain: string): Promise<boolean> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        
        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(normalizedDomain);
        }

        return await this.registryContract.isExpired(tokenId);
      });
    } catch (error: any) {
      if (error instanceof DomainNotFoundError) {
        throw error;
      }
      throw new NetworkError(`Failed to check expiry for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Get time until domain expires
   */
  async timeUntilExpiry(domain: string): Promise<number> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        
        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(normalizedDomain);
        }

        const timeLeft = await this.registryContract.timeUntilExpiry(tokenId);
        return Number(timeLeft);
      });
    } catch (error: any) {
      if (error instanceof DomainNotFoundError) {
        throw error;
      }
      throw new NetworkError(`Failed to get time until expiry for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Get domain owner
   */
  async getOwner(domain: string): Promise<string> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        
        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(normalizedDomain);
        }

        return await this.registryContract.ownerOf(tokenId);
      });
    } catch (error: any) {
      if (error instanceof DomainNotFoundError) {
        throw error;
      }
      throw new NetworkError(`Failed to get owner for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Get token ID for a domain
   */
  async getTokenId(domain: string): Promise<string> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        
        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(normalizedDomain);
        }

        return tokenId.toString();
      });
    } catch (error: any) {
      if (error instanceof DomainNotFoundError) {
        throw error;
      }
      throw new NetworkError(`Failed to get token ID for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Get domain name from token ID
   */
  async getDomainName(tokenId: string): Promise<string> {
    try {
      return await retryWithBackoff(async () => {
        const domainName = await this.registryContract.tokenIdToName(tokenId);
        
        if (!domainName) {
          throw new DomainNotFoundError(`Token ID ${tokenId}`);
        }

        return addTLD(domainName);
      });
    } catch (error: any) {
      if (error instanceof DomainNotFoundError) {
        throw error;
      }
      throw new NetworkError(`Failed to get domain name for token ID ${tokenId}: ${error.message}`, error);
    }
  }

  /**
   * Set resolver for a domain (requires domain ownership)
   */
  async setResolver(domain: string, resolverAddress: string, signer: Signer): Promise<string> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      const tokenId = await this.getTokenId(normalizedDomain);
      const owner = await this.getOwner(normalizedDomain);
      const signerAddress = await signer.getAddress();
      
      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new PermissionError(`Only domain owner can set resolver. Owner: ${owner}, Signer: ${signerAddress}`);
      }

      const contractWithSigner = this.registryContract.connect(signer) as ISonicRegistry;
      const tx = await contractWithSigner.setResolver(tokenId, resolverAddress);
      
      // Clear cache for this domain
      this.clearDomainCache(normalizedDomain);
      
      return tx.hash;
    } catch (error: any) {
      if (error instanceof DomainNotFoundError || error instanceof PermissionError) {
        throw error;
      }
      throw new NetworkError(`Failed to set resolver for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Get resolver address for a domain
   */
  async getResolver(domain: string): Promise<string> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        
        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(normalizedDomain);
        }

        return await this.registryContract.getResolver(tokenId);
      });
    } catch (error: any) {
      if (error instanceof DomainNotFoundError) {
        throw error;
      }
      throw new NetworkError(`Failed to get resolver for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Check if domain exists
   */
  async exists(domain: string): Promise<boolean> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        return tokenId.toString() !== '0';
      });
    } catch (error: any) {
      throw new NetworkError(`Failed to check existence for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Get basic domain info
   */
  async getDomainInfo(domain: string): Promise<DomainRecord> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        
        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(normalizedDomain);
        }

        const [owner, expiryTime, resolver, expired] = await Promise.all([
          this.registryContract.ownerOf(tokenId),
          this.registryContract.getExpiryTime(tokenId),
          this.registryContract.getResolver(tokenId),
          this.registryContract.isExpired(tokenId)
        ]);

        const domainRecord: DomainRecord = {
          name: addTLD(normalizedDomain),
          tokenId: tokenId.toString(),
          owner,
          resolver,
          expiryTime: Number(expiryTime),
          expired
        };

        return domainRecord;
      });
    } catch (error: any) {
      if (error instanceof DomainNotFoundError) {
        throw error;
      }
      throw new NetworkError(`Failed to get domain info for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * V2: Get custom image URI for a domain
   */
  async getCustomImage(domain: string): Promise<string> {
    const normalizedDomain = normalizeDomainName(domain);

    try {
      return await retryWithBackoff(async () => {
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);

        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(normalizedDomain);
        }

        const customImage = await this.registryContract.customImages(tokenId);
        return customImage || '';
      });
    } catch (error: any) {
      if (error instanceof DomainNotFoundError) {
        throw error;
      }
      throw new NetworkError(`Failed to get custom image for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * V2: Set custom image URI for a domain
   */
  async setCustomImage(domain: string, imageURI: string, signer: Signer): Promise<string> {
    const normalizedDomain = normalizeDomainName(domain);

    try {
      const tokenId = await this.getTokenId(normalizedDomain);
      const owner = await this.getOwner(normalizedDomain);
      const signerAddress = await signer.getAddress();

      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new PermissionError(`Only domain owner can set custom image. Owner: ${owner}, Signer: ${signerAddress}`);
      }

      const contractWithSigner = this.registryContract.connect(signer) as ISonicRegistry;
      const tx = await contractWithSigner.setCustomImage(tokenId, imageURI);

      // Clear cache for this domain
      this.clearDomainCache(normalizedDomain);

      return tx.hash;
    } catch (error: any) {
      if (error instanceof DomainNotFoundError || error instanceof PermissionError) {
        throw error;
      }
      throw new NetworkError(`Failed to set custom image for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * V2: Clear custom image for a domain (revert to default)
   */
  async clearCustomImage(domain: string, signer: Signer): Promise<string> {
    const normalizedDomain = normalizeDomainName(domain);

    try {
      const tokenId = await this.getTokenId(normalizedDomain);
      const owner = await this.getOwner(normalizedDomain);
      const signerAddress = await signer.getAddress();

      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new PermissionError(`Only domain owner can clear custom image. Owner: ${owner}, Signer: ${signerAddress}`);
      }

      const contractWithSigner = this.registryContract.connect(signer) as ISonicRegistry;
      const tx = await contractWithSigner.clearCustomImage(tokenId);

      // Clear cache for this domain
      this.clearDomainCache(normalizedDomain);

      return tx.hash;
    } catch (error: any) {
      if (error instanceof DomainNotFoundError || error instanceof PermissionError) {
        throw error;
      }
      throw new NetworkError(`Failed to clear custom image for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Clear cache for a specific domain
   */
  clearDomainCache(domain: string): void {
    const normalizedDomain = normalizeDomainName(domain);
    const availabilityCacheKey = generateAvailabilityCacheKey(normalizedDomain);
    this.cache.delete(availabilityCacheKey);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.stats();
  }
}