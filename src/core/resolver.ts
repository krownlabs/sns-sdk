import { Contract, Provider } from 'ethers';
import { 
  ResolutionResult, 
  ReverseResolutionResult, 
  DomainRecord
} from '../types';
import { ISonicRegistry, ISonicResolver } from '../types/contracts';
import { Cache, generateResolutionCacheKey, generateReverseResolutionCacheKey } from '../utils/cache';
import { retryWithBackoff } from '../utils/helpers';
import { normalizeDomainName, addTLD } from '../utils/validation';
import { 
  DomainNotFoundError, 
  DomainExpiredError, 
  ResolverError,
  NetworkError 
} from '../errors';
import SonicRegistryABI from '../contracts/abis/SonicRegistry.json';
import SonicResolverABI from '../contracts/abis/SonicResolver.json';

export class SonicResolver {
  private registryContract: ISonicRegistry;
  private resolverContract: ISonicResolver;
  private cache: Cache<any>;

  constructor(
    provider: Provider,
    registryAddress: string,
    resolverAddress: string,
    cacheEnabled: boolean = true,
    cacheTTL: number = 5 * 60 * 1000 // 5 minutes
  ) {
    this.registryContract = new Contract(registryAddress, SonicRegistryABI.abi, provider) as ISonicRegistry;
    this.resolverContract = new Contract(resolverAddress, SonicResolverABI.abi, provider) as ISonicResolver;
    this.cache = cacheEnabled ? new Cache(cacheTTL) : new Cache(0); // Disable cache if not enabled
  }

  /**
   * Resolve a domain name to an Ethereum address
   */
  async resolve(domain: string): Promise<ResolutionResult> {
    const normalizedDomain = normalizeDomainName(domain);
    const cacheKey = generateResolutionCacheKey(normalizedDomain);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await retryWithBackoff(async () => {
        // Get token ID from domain name
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        
        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(normalizedDomain);
        }

        // Get expiry time and check if expired
        const expiryTime = await this.registryContract.getExpiryTime(tokenId);
        const expired = await this.registryContract.isExpired(tokenId);

        if (expired) {
          throw new DomainExpiredError(normalizedDomain, Number(expiryTime));
        }

        // Get address from resolver
        let address = '';
        try {
          address = await this.resolverContract.resolveAddress(tokenId);
        } catch (error) {
          // Address might not be set, continue without it
        }
        
        if (!address || address === '0x0000000000000000000000000000000000000000') {
          throw new ResolverError(`No address set for domain ${normalizedDomain}`);
        }

        const resolutionResult: ResolutionResult = {
          address,
          tokenId: tokenId.toString(),
          name: addTLD(normalizedDomain),
          expired: false,
          expiryTime: Number(expiryTime)
        };

        // Cache the result
        this.cache.set(cacheKey, resolutionResult);
        
        return resolutionResult;
      });

      return result;
    } catch (error: any) {
      if (error instanceof DomainNotFoundError || error instanceof DomainExpiredError) {
        throw error;
      }
      throw new NetworkError(`Failed to resolve domain ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Reverse resolve an address to a domain name
   */
  async reverseResolve(address: string): Promise<ReverseResolutionResult> {
    const normalizedAddress = address.toLowerCase();
    const cacheKey = generateReverseResolutionCacheKey(normalizedAddress);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await retryWithBackoff(async () => {
        // Get token ID from reverse record
        let tokenId: bigint;
        try {
          tokenId = await this.resolverContract.reverseRecords(normalizedAddress);
        } catch (error) {
          throw new DomainNotFoundError(`No reverse record found for address ${normalizedAddress}`);
        }
        
        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(`No reverse record found for address ${normalizedAddress}`);
        }

        // Get domain name from token ID
        const domainName = await this.registryContract.tokenIdToName(tokenId);
        
        if (!domainName) {
          throw new DomainNotFoundError(`No domain found for token ID ${tokenId}`);
        }

        // Get expiry time and check if expired
        const expiryTime = await this.registryContract.getExpiryTime(tokenId);
        const expired = await this.registryContract.isExpired(tokenId);

        const reverseResult: ReverseResolutionResult = {
          name: addTLD(domainName),
          tokenId: tokenId.toString(),
          address: normalizedAddress,
          expired,
          expiryTime: Number(expiryTime)
        };

        // Cache the result
        this.cache.set(cacheKey, reverseResult);
        
        return reverseResult;
      });

      return result;
    } catch (error: any) {
      if (error instanceof DomainNotFoundError) {
        throw error;
      }
      throw new NetworkError(`Failed to reverse resolve address ${normalizedAddress}: ${error.message}`, error);
    }
  }

  /**
   * Get content hash for a domain
   */
  async resolveContent(domain: string): Promise<string> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        
        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(normalizedDomain);
        }

        const expired = await this.registryContract.isExpired(tokenId);
        if (expired) {
          const expiryTime = await this.registryContract.getExpiryTime(tokenId);
          throw new DomainExpiredError(normalizedDomain, Number(expiryTime));
        }

        const content = await this.resolverContract.resolveContent(tokenId);
        return content || '';
      });
    } catch (error: any) {
      if (error instanceof DomainNotFoundError || error instanceof DomainExpiredError) {
        throw error;
      }
      throw new NetworkError(`Failed to resolve content for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Get text record for a domain
   */
  async resolveText(domain: string, key: string): Promise<string> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        
        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(normalizedDomain);
        }

        const expired = await this.registryContract.isExpired(tokenId);
        if (expired) {
          const expiryTime = await this.registryContract.getExpiryTime(tokenId);
          throw new DomainExpiredError(normalizedDomain, Number(expiryTime));
        }

        const textValue = await this.resolverContract.resolveText(tokenId, key);
        return textValue || '';
      });
    } catch (error: any) {
      if (error instanceof DomainNotFoundError || error instanceof DomainExpiredError) {
        throw error;
      }
      throw new NetworkError(`Failed to resolve text record ${key} for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Get all records for a domain
   */
  async getDomainRecord(domain: string): Promise<DomainRecord> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        const tokenId = await this.registryContract.nameToTokenId(normalizedDomain);
        
        if (tokenId.toString() === '0') {
          throw new DomainNotFoundError(normalizedDomain);
        }

        // Get basic domain info
        const [owner, expiryTime, resolverAddress] = await Promise.all([
          this.registryContract.ownerOf(tokenId),
          this.registryContract.getExpiryTime(tokenId),
          this.registryContract.getResolver(tokenId)
        ]);

        const expired = await this.registryContract.isExpired(tokenId);

        // Get resolver records if resolver is set
        let address = '';
        let content = '';
        
        if (resolverAddress && resolverAddress !== '0x0000000000000000000000000000000000000000') {
          try {
            const [resolvedAddress, resolvedContent] = await Promise.allSettled([
              this.resolverContract.resolveAddress(tokenId),
              this.resolverContract.resolveContent(tokenId)
            ]);
            
            if (resolvedAddress.status === 'fulfilled') {
              address = resolvedAddress.value || '';
            }
            
            if (resolvedContent.status === 'fulfilled') {
              content = resolvedContent.value || '';
            }
          } catch (error) {
            // Resolver records might not be set, continue without them
          }
        }

        const domainRecord: DomainRecord = {
          name: addTLD(normalizedDomain),
          tokenId: tokenId.toString(),
          owner,
          resolver: resolverAddress,
          address: address || undefined,
          content: content || undefined,
          expiryTime: Number(expiryTime),
          expired
        };

        return domainRecord;
      });
    } catch (error: any) {
      if (error instanceof DomainNotFoundError) {
        throw error;
      }
      throw new NetworkError(`Failed to get domain record for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Batch resolve multiple domains
   */
  async resolveBatch(domains: string[]): Promise<Array<{ domain: string; result?: ResolutionResult; error?: string }>> {
    const results = await Promise.allSettled(
      domains.map(async (domain) => {
        try {
          const result = await this.resolve(domain);
          return { domain, result };
        } catch (error: any) {
          return { domain, error: error.message };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { domain: domains[index]!, error: result.reason?.message || 'Unknown error' };
      }
    });
  }

  /**
   * Batch reverse resolve multiple addresses
   */
  async reverseResolveBatch(addresses: string[]): Promise<Array<{ address: string; result?: ReverseResolutionResult; error?: string }>> {
    const results = await Promise.allSettled(
      addresses.map(async (address) => {
        try {
          const result = await this.reverseResolve(address);
          return { address, result };
        } catch (error: any) {
          return { address, error: error.message };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { address: addresses[index]!, error: result.reason?.message || 'Unknown error' };
      }
    });
  }

  /**
   * Clear cache
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