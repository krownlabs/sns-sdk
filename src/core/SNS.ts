import { Provider, Signer, Contract } from 'ethers';
import { 
  SNSConfig,
  ResolutionResult,
  ReverseResolutionResult,
  AvailabilityResult,
  PriceResult,
  DomainRecord,
  RegistrationOptions,
  BatchResolutionResult,
  BatchReverseResolutionResult,
} from '../types';
import { ISonicResolver } from '../types/contracts';
import { SonicResolver } from './resolver';
import { SonicRegistry } from './registry';
import { SonicRegistrar } from './registrar';
import { DEFAULT_ADDRESSES } from '../contracts/addresses';
import { 
  validateDomainName, 
  validateAddress, 
  validateYears,
  normalizeDomainName,
  addTLD,
  removeTLD
} from '../utils/validation';
import { 
  ConfigurationError,
  ValidationError,
  NetworkError,
  PermissionError
} from '../errors';
import { chunkArray } from '../utils/helpers';
import SonicResolverABI from '../contracts/abis/SonicResolver.json';

export class SNS {
  private provider: Provider;
  private resolver: SonicResolver;
  private registry: SonicRegistry;
  private registrar: SonicRegistrar;
  private resolverContract: ISonicResolver;
  private config: Required<SNSConfig>;

  constructor(config: SNSConfig) {
    // Validate required config
    if (!config.provider) {
      throw new ConfigurationError('Provider is required');
    }

    // Set defaults
    this.config = {
      provider: config.provider,
      registryAddress: config.registryAddress || DEFAULT_ADDRESSES.REGISTRY,
      registrarAddress: config.registrarAddress || DEFAULT_ADDRESSES.REGISTRAR,
      resolverAddress: config.resolverAddress || DEFAULT_ADDRESSES.RESOLVER,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTTL: config.cacheTTL || 5 * 60 * 1000, // 5 minutes
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000
    };

    this.provider = this.config.provider;

    // Initialize components
    this.resolver = new SonicResolver(
      this.provider,
      this.config.registryAddress,
      this.config.resolverAddress,
      this.config.cacheEnabled,
      this.config.cacheTTL
    );

    this.registry = new SonicRegistry(
      this.provider,
      this.config.registryAddress,
      this.config.cacheEnabled,
      this.config.cacheTTL
    );

    this.registrar = new SonicRegistrar(
      this.provider,
      this.config.registrarAddress,
      this.config.cacheEnabled,
      this.config.cacheTTL
    );

    this.resolverContract = new Contract(
      this.config.resolverAddress,
      SonicResolverABI.abi,
      this.provider
    ) as ISonicResolver;
  }

  // =============================================================================
  // RESOLUTION METHODS
  // =============================================================================

  /**
   * Resolve a domain name to an Ethereum address
   */
  async resolve(domain: string): Promise<string> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    const result = await this.resolver.resolve(domain);
    return result.address;
  }

  /**
   * Resolve a domain name with full details
   */
  async resolveWithDetails(domain: string): Promise<ResolutionResult> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.resolver.resolve(domain);
  }

  /**
   * Reverse resolve an address to a domain name
   */
  async reverseResolve(address: string): Promise<string> {
    const validation = validateAddress(address);
    if (!validation.valid) {
      throw new ValidationError(`Invalid address: ${validation.errors.join(', ')}`);
    }

    const result = await this.resolver.reverseResolve(address);
    return result.name;
  }

  /**
   * Reverse resolve an address with full details
   */
  async reverseResolveWithDetails(address: string): Promise<ReverseResolutionResult> {
    const validation = validateAddress(address);
    if (!validation.valid) {
      throw new ValidationError(`Invalid address: ${validation.errors.join(', ')}`);
    }

    return await this.resolver.reverseResolve(address);
  }

  /**
   * Get content hash for a domain
   */
  async getContent(domain: string): Promise<string> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.resolver.resolveContent(domain);
  }

  /**
   * Get text record for a domain
   */
  async getText(domain: string, key: string): Promise<string> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.resolver.resolveText(domain, key);
  }

  /**
   * Batch resolve multiple domains
   */
  async resolveBatch(domains: string[], chunkSize: number = 10): Promise<BatchResolutionResult> {
    const successful: Array<{ input: string; result: ResolutionResult }> = [];
    const failed: Array<{ input: string; error: string }> = [];

    const chunks = chunkArray(domains, chunkSize);

    for (const chunk of chunks) {
      const results = await this.resolver.resolveBatch(chunk);
      
      for (const result of results) {
        if (result.result) {
          successful.push({ input: result.domain, result: result.result });
        } else if (result.error) {
          failed.push({ input: result.domain, error: result.error });
        }
      }
    }

    return { successful, failed };
  }

  /**
   * Batch reverse resolve multiple addresses
   */
  async reverseResolveBatch(addresses: string[], chunkSize: number = 10): Promise<BatchReverseResolutionResult> {
    const successful: Array<{ input: string; result: ReverseResolutionResult }> = [];
    const failed: Array<{ input: string; error: string }> = [];

    const chunks = chunkArray(addresses, chunkSize);

    for (const chunk of chunks) {
      const results = await this.resolver.reverseResolveBatch(chunk);
      
      for (const result of results) {
        if (result.result) {
          successful.push({ input: result.address, result: result.result });
        } else if (result.error) {
          failed.push({ input: result.address, error: result.error });
        }
      }
    }

    return { successful, failed };
  }

  // =============================================================================
  // DOMAIN MANAGEMENT METHODS
  // =============================================================================

  /**
   * Check if a domain is available for registration
   */
  async isAvailable(domain: string): Promise<boolean> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    const result = await this.registry.isAvailable(domain);
    return result.available;
  }

  /**
   * Get detailed availability information
   */
  async getAvailability(domain: string): Promise<AvailabilityResult> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.registry.isAvailable(domain);
  }

  /**
   * Get registration price for a domain
   */
  async getPrice(domain: string, years: number = 1): Promise<PriceResult> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    const yearsValidation = validateYears(years);
    if (!yearsValidation.valid) {
      throw new ValidationError(`Invalid years: ${yearsValidation.errors.join(', ')}`);
    }

    return await this.registrar.getPrice(domain, years);
  }

  /**
   * Register a domain
   */
  async register(
    domain: string,
    years: number,
    signer: Signer,
    options?: RegistrationOptions
  ): Promise<string> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    const yearsValidation = validateYears(years);
    if (!yearsValidation.valid) {
      throw new ValidationError(`Invalid years: ${yearsValidation.errors.join(', ')}`);
    }

    // Register the domain first
    const txHash = await this.registrar.register(domain, years, signer, options);

    // If options include records to set, wait for registration and then set them
    if (options?.records) {
    }

    return txHash;
  }

  /**
   * Renew a domain
   */
  async renew(domain: string, years: number, signer: Signer): Promise<string> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    const yearsValidation = validateYears(years);
    if (!yearsValidation.valid) {
      throw new ValidationError(`Invalid years: ${yearsValidation.errors.join(', ')}`);
    }

    return await this.registrar.renew(domain, years, signer);
  }

  /**
   * Get renewal price for a domain
   */
  async getRenewalPrice(domain: string, years: number): Promise<PriceResult> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    const yearsValidation = validateYears(years);
    if (!yearsValidation.valid) {
      throw new ValidationError(`Invalid years: ${yearsValidation.errors.join(', ')}`);
    }

    return await this.registrar.getRenewalPrice(domain, years);
  }

  // =============================================================================
  // RECORD MANAGEMENT METHODS
  // =============================================================================

  /**
   * Set address record for a domain
   */
  async setAddress(domain: string, address: string, signer: Signer): Promise<string> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    const addressValidation = validateAddress(address);
    if (!addressValidation.valid) {
      throw new ValidationError(`Invalid address: ${addressValidation.errors.join(', ')}`);
    }

    try {
      const tokenId = await this.registry.getTokenId(domain);
      const owner = await this.registry.getOwner(domain);
      const signerAddress = await signer.getAddress();

      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new PermissionError(`Only domain owner can set address. Owner: ${owner}, Signer: ${signerAddress}`);
      }

      const contractWithSigner = this.resolverContract.connect(signer) as ISonicResolver;
      const tx = await contractWithSigner.setAddress(tokenId, address);
      
      return tx.hash;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof PermissionError) {
        throw error;
      }
      throw new NetworkError(`Failed to set address for ${domain}: ${error.message}`, error);
    }
  }

  /**
   * Set content hash for a domain
   */
  async setContent(domain: string, content: string, signer: Signer): Promise<string> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    try {
      const tokenId = await this.registry.getTokenId(domain);
      const owner = await this.registry.getOwner(domain);
      const signerAddress = await signer.getAddress();

      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new PermissionError(`Only domain owner can set content. Owner: ${owner}, Signer: ${signerAddress}`);
      }

      const contractWithSigner = this.resolverContract.connect(signer) as ISonicResolver;
      const tx = await contractWithSigner.setContent(tokenId, content);
      
      return tx.hash;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof PermissionError) {
        throw error;
      }
      throw new NetworkError(`Failed to set content for ${domain}: ${error.message}`, error);
    }
  }

  /**
   * Set text record for a domain
   */
  async setText(domain: string, key: string, value: string, signer: Signer): Promise<string> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    try {
      const tokenId = await this.registry.getTokenId(domain);
      const owner = await this.registry.getOwner(domain);
      const signerAddress = await signer.getAddress();

      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new PermissionError(`Only domain owner can set text records. Owner: ${owner}, Signer: ${signerAddress}`);
      }

      const contractWithSigner = this.resolverContract.connect(signer) as ISonicResolver;
      const tx = await contractWithSigner.setText(tokenId, key, value);
      
      return tx.hash;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof PermissionError) {
        throw error;
      }
      throw new NetworkError(`Failed to set text record for ${domain}: ${error.message}`, error);
    }
  }

  /**
   * Set reverse record (address -> domain)
   */
  async setReverse(domain: string, signer: Signer): Promise<string> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    try {
      const tokenId = await this.registry.getTokenId(domain);
      const owner = await this.registry.getOwner(domain);
      const signerAddress = await signer.getAddress();

      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new PermissionError(`Only domain owner can set reverse record. Owner: ${owner}, Signer: ${signerAddress}`);
      }

      const contractWithSigner = this.resolverContract.connect(signer) as ISonicResolver;
      const tx = await contractWithSigner.setReverse(tokenId);
      
      return tx.hash;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof PermissionError) {
        throw error;
      }
      throw new NetworkError(`Failed to set reverse record for ${domain}: ${error.message}`, error);
    }
  }

  // =============================================================================
  // V2: BULK OPERATIONS
  // =============================================================================

  /**
   * V2: Register multiple domains at once
   */
  async registerBulk(
    domains: Array<{ name: string; years: number }>,
    signer: Signer
  ): Promise<string> {
    // Validation is done in registrar.registerBulk
    return await this.registrar.registerBulk(domains, signer);
  }

  /**
   * V2: Renew multiple domains at once
   */
  async renewBulk(
    renewals: Array<{ domain: string; years: number }>,
    signer: Signer
  ): Promise<string> {
    // Validation is done in registrar.renewBulk
    return await this.registrar.renewBulk(renewals, signer);
  }

  /**
   * V2: Calculate total price for bulk registration
   */
  async calculateBulkPrice(
    domains: Array<{ name: string; years: number }>
  ): Promise<{ totalPrice: bigint; totalPriceInEther: string; breakdown: Array<{ name: string; price: bigint; priceInEther: string }> }> {
    return await this.registrar.calculateBulkPrice(domains);
  }

  // =============================================================================
  // V2: CONTENTHASH & ENHANCED TEXT RECORDS
  // =============================================================================

  /**
   * V2: Get contenthash (IPFS/Swarm) for a domain
   */
  async getContenthash(domain: string): Promise<string> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.resolver.getContenthash(domain);
  }

  /**
   * V2: Set contenthash for a domain
   */
  async setContenthash(domain: string, hash: string, signer: Signer): Promise<string> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    try {
      const tokenId = await this.registry.getTokenId(domain);
      const owner = await this.registry.getOwner(domain);
      const signerAddress = await signer.getAddress();

      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new PermissionError(`Only domain owner can set contenthash. Owner: ${owner}, Signer: ${signerAddress}`);
      }

      const contractWithSigner = this.resolverContract.connect(signer) as ISonicResolver;
      const tx = await contractWithSigner.setContenthash(tokenId, hash);

      return tx.hash;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof PermissionError) {
        throw error;
      }
      throw new NetworkError(`Failed to set contenthash for ${domain}: ${error.message}`, error);
    }
  }

  /**
   * V2: Get multiple text records at once
   */
  async getTexts(domain: string, keys: string[]): Promise<Record<string, string>> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.resolver.getTexts(domain, keys);
  }

  /**
   * V2: Set multiple text records at once
   */
  async setTextBatch(domain: string, records: Record<string, string>, signer: Signer): Promise<string> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    try {
      const tokenId = await this.registry.getTokenId(domain);
      const owner = await this.registry.getOwner(domain);
      const signerAddress = await signer.getAddress();

      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new PermissionError(`Only domain owner can set text records. Owner: ${owner}, Signer: ${signerAddress}`);
      }

      const keys = Object.keys(records);
      const values = Object.values(records);

      const contractWithSigner = this.resolverContract.connect(signer) as ISonicResolver;
      const tx = await contractWithSigner.setTextBatch(tokenId, keys, values);

      return tx.hash;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof PermissionError) {
        throw error;
      }
      throw new NetworkError(`Failed to set text records for ${domain}: ${error.message}`, error);
    }
  }

  /**
   * V2: Get social media records for a domain
   */
  async getSocials(domain: string): Promise<{ twitter: string; github: string; discord: string; telegram: string }> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.resolver.getSocials(domain);
  }

  // =============================================================================
  // V2: PRIMARY NAME (REPLACES REVERSE RECORDS)
  // =============================================================================

  /**
   * V2: Set domain as primary name for an address
   */
  async setPrimaryName(domain: string, signer: Signer): Promise<string> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    try {
      const tokenId = await this.registry.getTokenId(domain);
      const owner = await this.registry.getOwner(domain);
      const signerAddress = await signer.getAddress();

      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new PermissionError(`Only domain owner can set as primary name. Owner: ${owner}, Signer: ${signerAddress}`);
      }

      const contractWithSigner = this.resolverContract.connect(signer) as ISonicResolver;
      const tx = await contractWithSigner.setPrimaryName(tokenId);

      return tx.hash;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof PermissionError) {
        throw error;
      }
      throw new NetworkError(`Failed to set primary name for ${domain}: ${error.message}`, error);
    }
  }

  /**
   * V2: Clear primary name for the signer's address
   */
  async clearPrimaryName(signer: Signer): Promise<string> {
    try {
      const contractWithSigner = this.resolverContract.connect(signer) as ISonicResolver;
      const tx = await contractWithSigner.clearPrimaryName();

      return tx.hash;
    } catch (error: any) {
      throw new NetworkError(`Failed to clear primary name: ${error.message}`, error);
    }
  }

  /**
   * V2: Get primary name for an address
   */
  async getPrimaryName(address: string): Promise<string> {
    const validation = validateAddress(address);
    if (!validation.valid) {
      throw new ValidationError(`Invalid address: ${validation.errors.join(', ')}`);
    }

    return await this.resolver.getPrimaryName(address);
  }

  // =============================================================================
  // V2: CUSTOM NFT IMAGES
  // =============================================================================

  /**
   * V2: Get custom image URI for a domain
   */
  async getCustomImage(domain: string): Promise<string> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.registry.getCustomImage(domain);
  }

  /**
   * V2: Set custom image URI for a domain
   */
  async setCustomImage(domain: string, imageURI: string, signer: Signer): Promise<string> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    return await this.registry.setCustomImage(domain, imageURI, signer);
  }

  /**
   * V2: Clear custom image for a domain (revert to default)
   */
  async clearCustomImage(domain: string, signer: Signer): Promise<string> {
    const domainValidation = validateDomainName(domain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    return await this.registry.clearCustomImage(domain, signer);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get complete domain information
   */
  async getDomainInfo(domain: string): Promise<DomainRecord> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.resolver.getDomainRecord(domain);
  }

  /**
   * Check if domain exists
   */
  async exists(domain: string): Promise<boolean> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.registry.exists(domain);
  }

  /**
   * Get domain owner
   */
  async getOwner(domain: string): Promise<string> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.registry.getOwner(domain);
  }

  /**
   * Get domain expiry time
   */
  async getExpiryTime(domain: string): Promise<number> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.registry.getExpiryTime(domain);
  }

  /**
   * Check if domain is expired
   */
  async isExpired(domain: string): Promise<boolean> {
    const validation = validateDomainName(domain);
    if (!validation.valid) {
      throw new ValidationError(`Invalid domain name: ${validation.errors.join(', ')}`);
    }

    return await this.registry.isExpired(domain);
  }

  /**
   * Validate domain name
   */
  validateDomain(domain: string): { valid: boolean; errors: string[] } {
    return validateDomainName(domain);
  }

  /**
   * Normalize domain name
   */
  normalizeDomain(domain: string): string {
    return normalizeDomainName(domain);
  }

  /**
   * Add TLD to domain name
   */
  addTLD(domain: string): string {
    return addTLD(domain);
  }

  /**
   * Remove TLD from domain name
   */
  removeTLD(domain: string): string {
    return removeTLD(domain);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.resolver.clearCache();
    this.registry.clearCache();
    this.registrar.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      resolver: this.resolver.getCacheStats(),
      registry: this.registry.getCacheStats(),
      registrar: this.registrar.getCacheStats()
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<SNSConfig> {
    return { ...this.config };
  }
}