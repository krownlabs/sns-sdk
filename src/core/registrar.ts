import { Contract, Provider, Signer } from 'ethers';
import { 
  PriceResult,
  RegistrationOptions
} from '../types';
import { ISonicRegistrar } from '../types/contracts';
import { Cache, generatePricingCacheKey } from '../utils/cache';
import { retryWithBackoff, calculatePrice, weiToEther } from '../utils/helpers';
import { normalizeDomainName, validateDomainName, validateYears, validateAddress } from '../utils/validation';
import {
  ValidationError,
  DomainUnavailableError,
  InsufficientPaymentError,
  NetworkError,
  ContractError
} from '../errors';
import SonicRegistrarABI from '../contracts/abis/SonicRegistrarV2.json';

export class SonicRegistrar {
  private registrarContract: ISonicRegistrar;
  private cache: Cache<any>;

  constructor(
    provider: Provider,
    registrarAddress: string,
    cacheEnabled: boolean = true,
    cacheTTL: number = 5 * 60 * 1000 // 5 minutes
  ) {
    this.registrarContract = new Contract(registrarAddress, SonicRegistrarABI.abi, provider) as ISonicRegistrar;
    this.cache = cacheEnabled ? new Cache(cacheTTL) : new Cache(0); // Disable cache if not enabled
  }

  /**
   * Calculate registration price for a domain
   */
  async getPrice(domain: string, years: number): Promise<PriceResult> {
    const normalizedDomain = normalizeDomainName(domain);
    
    // Validate inputs
    const domainValidation = validateDomainName(normalizedDomain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    const yearsValidation = validateYears(years);
    if (!yearsValidation.valid) {
      throw new ValidationError(`Invalid years: ${yearsValidation.errors.join(', ')}`);
    }

    const cacheKey = generatePricingCacheKey(normalizedDomain, years);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await retryWithBackoff(async () => {
        const price = await this.registrarContract.calculatePrice(normalizedDomain, years);
        
        // Calculate breakdown using our helper
        const priceBreakdown = calculatePrice(normalizedDomain, years);
        
        const priceResult: PriceResult = {
          price: BigInt(price.toString()),
          priceInEther: weiToEther(BigInt(price.toString())),
          basePrice: priceBreakdown.basePrice,
          discount: priceBreakdown.discount,
          discountAmount: priceBreakdown.discountAmount
        };

        // Cache for longer since pricing is stable
        this.cache.set(cacheKey, priceResult, 30 * 60 * 1000); // 30 minutes
        
        return priceResult;
      });

      return result;
    } catch (error: any) {
      throw new NetworkError(`Failed to get price for ${normalizedDomain}: ${error.message}`, error);
    }
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
    const normalizedDomain = normalizeDomainName(domain);
    
    // Validate inputs
    const domainValidation = validateDomainName(normalizedDomain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    const yearsValidation = validateYears(years);
    if (!yearsValidation.valid) {
      throw new ValidationError(`Invalid years: ${yearsValidation.errors.join(', ')}`);
    }

    try {
      // Get price first
      const priceResult = await this.getPrice(normalizedDomain, years);
      
      // Check if domain is available (simplified approach)
      const contractWithSigner = this.registrarContract.connect(signer) as ISonicRegistrar;
      
      // Register domain
      const tx = await contractWithSigner.register(normalizedDomain, years, {
        value: priceResult.price
      });

      // Clear relevant caches
      this.clearDomainCache(normalizedDomain);
      
      return tx.hash;
    } catch (error: any) {
      // Parse contract errors
      if (error.message?.includes('Name taken')) {
        throw new DomainUnavailableError(normalizedDomain, 'already registered');
      }
      
      if (error.message?.includes('Incorrect payment')) {
        throw new InsufficientPaymentError('Required amount', 'Provided amount');
      }

      if (error.message?.includes('Invalid name')) {
        throw new ValidationError(`Domain name ${normalizedDomain} is invalid`);
      }

      throw new NetworkError(`Failed to register ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * V2: Register domain and fully configure it in a single transaction
   * Combines: register + setResolver + setAddress + setPrimaryName
   */
  async registerAndConfigure(
    domain: string,
    years: number,
    resolverAddress: string,
    setPrimary: boolean,
    signer: Signer
  ): Promise<string> {
    const normalizedDomain = normalizeDomainName(domain);

    // Validate inputs
    const domainValidation = validateDomainName(normalizedDomain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    const yearsValidation = validateYears(years);
    if (!yearsValidation.valid) {
      throw new ValidationError(`Invalid years: ${yearsValidation.errors.join(', ')}`);
    }

    const addressValidation = validateAddress(resolverAddress);
    if (!addressValidation.valid) {
      throw new ValidationError(`Invalid resolver address: ${addressValidation.errors.join(', ')}`);
    }

    try {
      // Calculate price
      const priceResult = await this.getPrice(normalizedDomain, years);

      const contractWithSigner = this.registrarContract.connect(signer) as ISonicRegistrar;

      // Register and configure in one transaction
      const tx = await contractWithSigner.registerAndConfigure(
        normalizedDomain,
        years,
        resolverAddress,
        setPrimary,
        { value: priceResult.price }
      );

      // Clear relevant caches
      this.clearDomainCache(normalizedDomain);

      return tx.hash;
    } catch (error: any) {
      if (error.message?.includes('Name taken')) {
        throw new DomainUnavailableError(normalizedDomain, 'already registered');
      }

      if (error.message?.includes('Incorrect payment')) {
        throw new InsufficientPaymentError('Required amount', 'Provided amount');
      }

      if (error.message?.includes('Invalid name')) {
        throw new ValidationError(`Invalid domain name: ${normalizedDomain}`);
      }

      if (error.message?.includes('Default resolver not set')) {
        throw new ContractError('Default resolver not configured in registrar contract');
      }

      if (error instanceof ValidationError || error instanceof DomainUnavailableError) {
        throw error;
      }

      throw new NetworkError(`Failed to register and configure ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Renew a domain
   */
  async renew(domain: string, years: number, signer: Signer): Promise<string> {
    const normalizedDomain = normalizeDomainName(domain);
    
    // Validate inputs
    const domainValidation = validateDomainName(normalizedDomain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    const yearsValidation = validateYears(years);
    if (!yearsValidation.valid) {
      throw new ValidationError(`Invalid years: ${yearsValidation.errors.join(', ')}`);
    }

    try {
      // Get renewal price
      const priceResult = await this.getRenewalPrice(normalizedDomain, years);
      
      const contractWithSigner = this.registrarContract.connect(signer) as ISonicRegistrar;
      
      // Renew domain
      const tx = await contractWithSigner.renew(normalizedDomain, years, {
        value: priceResult.price
      });

      // Clear relevant caches
      this.clearDomainCache(normalizedDomain);
      
      return tx.hash;
    } catch (error: any) {
      // Parse contract errors
      if (error.message?.includes('Domain not found')) {
        throw new DomainUnavailableError(normalizedDomain, 'not found');
      }
      
      if (error.message?.includes('Incorrect payment')) {
        throw new InsufficientPaymentError('Required amount', 'Provided amount');
      }

      throw new NetworkError(`Failed to renew ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Get renewal price for a domain
   */
  async getRenewalPrice(domain: string, years: number): Promise<PriceResult> {
    const normalizedDomain = normalizeDomainName(domain);
    
    // Validate inputs
    const domainValidation = validateDomainName(normalizedDomain);
    if (!domainValidation.valid) {
      throw new ValidationError(`Invalid domain name: ${domainValidation.errors.join(', ')}`);
    }

    const yearsValidation = validateYears(years);
    if (!yearsValidation.valid) {
      throw new ValidationError(`Invalid years: ${yearsValidation.errors.join(', ')}`);
    }

    const cacheKey = `renewal_${generatePricingCacheKey(normalizedDomain, years)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await retryWithBackoff(async () => {
        const price = await this.registrarContract.getRenewalPrice(normalizedDomain, years);
        
        // Calculate breakdown using our helper
        const priceBreakdown = calculatePrice(normalizedDomain, years);
        
        const priceResult: PriceResult = {
          price: BigInt(price.toString()),
          priceInEther: weiToEther(BigInt(price.toString())),
          basePrice: priceBreakdown.basePrice,
          discount: priceBreakdown.discount,
          discountAmount: priceBreakdown.discountAmount
        };

        // Cache for longer since pricing is relatively stable
        this.cache.set(cacheKey, priceResult, 30 * 60 * 1000); // 30 minutes
        
        return priceResult;
      });

      return result;
    } catch (error: any) {
      if (error.message?.includes('Domain not found')) {
        throw new DomainUnavailableError(normalizedDomain, 'not found');
      }
      throw new NetworkError(`Failed to get renewal price for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Check if a domain name is valid according to registrar rules
   */
  async isValidName(domain: string): Promise<boolean> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        return await this.registrarContract.isValidName(normalizedDomain);
      });
    } catch (error: any) {
      throw new NetworkError(`Failed to validate domain name ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Get base price for a domain based on length
   */
  async getBasePrice(domain: string): Promise<bigint> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      return await retryWithBackoff(async () => {
        const basePrice = await this.registrarContract.getBasePrice(normalizedDomain);
        return BigInt(basePrice.toString());
      });
    } catch (error: any) {
      throw new NetworkError(`Failed to get base price for ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Get discount percentage for registration years
   */
  async getDiscount(years: number): Promise<number> {
    try {
      return await retryWithBackoff(async () => {
        const discount = await this.registrarContract.getDiscount(years);
        return Number(discount);
      });
    } catch (error: any) {
      throw new NetworkError(`Failed to get discount for ${years} years: ${error.message}`, error);
    }
  }

  /**
   * Get pricing constants
   */
  async getPricingConstants(): Promise<{
    threeChar: bigint;
    fourChar: bigint;
    fiveChar: bigint;
    sixPlusChar: bigint;
    maxRegistrationYears: number;
  }> {
    try {
      return await retryWithBackoff(async () => {
        const [threeChar, fourChar, fiveChar, sixPlusChar, maxYears] = await Promise.all([
          this.registrarContract.THREECHAR(),
          this.registrarContract.FOURCHAR(),
          this.registrarContract.FIVECHAR(),
          this.registrarContract.SIXPLUSCHAR(),
          this.registrarContract.MAX_REGISTRATION_YEARS()
        ]);

        return {
          threeChar: BigInt(threeChar.toString()),
          fourChar: BigInt(fourChar.toString()),
          fiveChar: BigInt(fiveChar.toString()),
          sixPlusChar: BigInt(sixPlusChar.toString()),
          maxRegistrationYears: Number(maxYears)
        };
      });
    } catch (error: any) {
      throw new NetworkError(`Failed to get pricing constants: ${error.message}`, error);
    }
  }

  /**
   * Estimate gas for registration
   */
  async estimateRegistrationGas(domain: string, years: number, signer: Signer): Promise<bigint> {
    const normalizedDomain = normalizeDomainName(domain);
    
    try {
      const priceResult = await this.getPrice(normalizedDomain, years);
      const contractWithSigner = this.registrarContract.connect(signer) as ISonicRegistrar;
      
      // Use getFunction to get the specific function for gas estimation
      const registerFunction = contractWithSigner.getFunction('register');
      const gasEstimate = await registerFunction.estimateGas(
        normalizedDomain, 
        years, 
        { value: priceResult.price }
      );
      
      return BigInt(gasEstimate.toString());
    } catch (error: any) {
      throw new NetworkError(`Failed to estimate gas for registering ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * Estimate gas for renewal
   */
  async estimateRenewalGas(domain: string, years: number, signer: Signer): Promise<bigint> {
    const normalizedDomain = normalizeDomainName(domain);

    try {
      const priceResult = await this.getRenewalPrice(normalizedDomain, years);
      const contractWithSigner = this.registrarContract.connect(signer) as ISonicRegistrar;

      // Use getFunction to get the specific function for gas estimation
      const renewFunction = contractWithSigner.getFunction('renew');
      const gasEstimate = await renewFunction.estimateGas(
        normalizedDomain,
        years,
        { value: priceResult.price }
      );

      return BigInt(gasEstimate.toString());
    } catch (error: any) {
      throw new NetworkError(`Failed to estimate gas for renewing ${normalizedDomain}: ${error.message}`, error);
    }
  }

  /**
   * V2: Register multiple domains at once
   */
  async registerBulk(
    domains: Array<{ name: string; years: number }>,
    signer: Signer
  ): Promise<string> {
    // Validate inputs
    if (!domains || domains.length === 0) {
      throw new ValidationError('Domains array cannot be empty');
    }

    if (domains.length > 20) {
      throw new ValidationError('Cannot register more than 20 domains at once');
    }

    const names: string[] = [];
    const yearCounts: number[] = [];

    // Normalize and validate all domains
    for (const domain of domains) {
      const normalizedDomain = normalizeDomainName(domain.name);

      const domainValidation = validateDomainName(normalizedDomain);
      if (!domainValidation.valid) {
        throw new ValidationError(`Invalid domain name ${domain.name}: ${domainValidation.errors.join(', ')}`);
      }

      const yearsValidation = validateYears(domain.years);
      if (!yearsValidation.valid) {
        throw new ValidationError(`Invalid years for ${domain.name}: ${yearsValidation.errors.join(', ')}`);
      }

      names.push(normalizedDomain);
      yearCounts.push(domain.years);
    }

    try {
      // Calculate total price
      const totalPrice = await this.registrarContract.calculateBulkPrice(names, yearCounts);

      const contractWithSigner = this.registrarContract.connect(signer) as ISonicRegistrar;

      // Register all domains
      const tx = await contractWithSigner.registerBulk(names, yearCounts, {
        value: totalPrice
      });

      // Clear relevant caches
      for (const name of names) {
        this.clearDomainCache(name);
      }

      return tx.hash;
    } catch (error: any) {
      if (error.message?.includes('Name taken')) {
        throw new DomainUnavailableError('One or more domains', 'already registered');
      }

      if (error.message?.includes('Incorrect payment')) {
        throw new InsufficientPaymentError('Required amount', 'Provided amount');
      }

      if (error.message?.includes('Too many domains')) {
        throw new ValidationError('Too many domains in bulk operation');
      }

      throw new NetworkError(`Failed to register domains in bulk: ${error.message}`, error);
    }
  }

  /**
   * V2: Renew multiple domains at once
   */
  async renewBulk(
    renewals: Array<{ domain: string; years: number }>,
    signer: Signer
  ): Promise<string> {
    // Validate inputs
    if (!renewals || renewals.length === 0) {
      throw new ValidationError('Renewals array cannot be empty');
    }

    if (renewals.length > 20) {
      throw new ValidationError('Cannot renew more than 20 domains at once');
    }

    const tokenIds: string[] = [];
    const yearCounts: number[] = [];
    const normalizedDomains: string[] = [];

    // Get token IDs and validate all domains
    for (const renewal of renewals) {
      const normalizedDomain = normalizeDomainName(renewal.domain);
      normalizedDomains.push(normalizedDomain);

      const domainValidation = validateDomainName(normalizedDomain);
      if (!domainValidation.valid) {
        throw new ValidationError(`Invalid domain name ${renewal.domain}: ${domainValidation.errors.join(', ')}`);
      }

      const yearsValidation = validateYears(renewal.years);
      if (!yearsValidation.valid) {
        throw new ValidationError(`Invalid years for ${renewal.domain}: ${yearsValidation.errors.join(', ')}`);
      }

      // Get token ID from registry
      try {
        const tokenId = await this.registrarContract.registry();
        const registryContract = new Contract(tokenId, ['function nameToTokenId(string) view returns (uint256)'], this.registrarContract.runner || undefined);
        const tid = await registryContract.nameToTokenId(normalizedDomain);

        if (tid.toString() === '0') {
          throw new DomainUnavailableError(normalizedDomain, 'not found');
        }

        tokenIds.push(tid.toString());
      } catch (error: any) {
        throw new NetworkError(`Failed to get token ID for ${normalizedDomain}: ${error.message}`, error);
      }

      yearCounts.push(renewal.years);
    }

    try {
      // Calculate total price
      let totalPrice = BigInt(0);
      for (let i = 0; i < normalizedDomains.length; i++) {
        const price = await this.registrarContract.calculatePrice(normalizedDomains[i]!, yearCounts[i]!);
        totalPrice += BigInt(price.toString());
      }

      const contractWithSigner = this.registrarContract.connect(signer) as ISonicRegistrar;

      // Renew all domains
      const tx = await contractWithSigner.renewBulk(tokenIds, yearCounts, {
        value: totalPrice
      });

      // Clear relevant caches
      for (const domain of normalizedDomains) {
        this.clearDomainCache(domain);
      }

      return tx.hash;
    } catch (error: any) {
      if (error.message?.includes('Domain not found')) {
        throw new DomainUnavailableError('One or more domains', 'not found');
      }

      if (error.message?.includes('Incorrect payment')) {
        throw new InsufficientPaymentError('Required amount', 'Provided amount');
      }

      if (error.message?.includes('Too many domains')) {
        throw new ValidationError('Too many domains in bulk operation');
      }

      throw new NetworkError(`Failed to renew domains in bulk: ${error.message}`, error);
    }
  }

  /**
   * V2: Calculate total price for bulk registration
   */
  async calculateBulkPrice(
    domains: Array<{ name: string; years: number }>
  ): Promise<{ totalPrice: bigint; totalPriceInEther: string; breakdown: Array<{ name: string; price: bigint; priceInEther: string }> }> {
    if (!domains || domains.length === 0) {
      throw new ValidationError('Domains array cannot be empty');
    }

    const names: string[] = [];
    const yearCounts: number[] = [];

    // Normalize and validate all domains
    for (const domain of domains) {
      const normalizedDomain = normalizeDomainName(domain.name);

      const domainValidation = validateDomainName(normalizedDomain);
      if (!domainValidation.valid) {
        throw new ValidationError(`Invalid domain name ${domain.name}: ${domainValidation.errors.join(', ')}`);
      }

      const yearsValidation = validateYears(domain.years);
      if (!yearsValidation.valid) {
        throw new ValidationError(`Invalid years for ${domain.name}: ${yearsValidation.errors.join(', ')}`);
      }

      names.push(normalizedDomain);
      yearCounts.push(domain.years);
    }

    try {
      const totalPrice = await this.registrarContract.calculateBulkPrice(names, yearCounts);

      // Calculate breakdown for each domain
      const breakdown = await Promise.all(
        names.map(async (name, index) => {
          const price = await this.registrarContract.calculatePrice(name, yearCounts[index]!);
          return {
            name,
            price: BigInt(price.toString()),
            priceInEther: weiToEther(BigInt(price.toString()))
          };
        })
      );

      return {
        totalPrice: BigInt(totalPrice.toString()),
        totalPriceInEther: weiToEther(BigInt(totalPrice.toString())),
        breakdown
      };
    } catch (error: any) {
      throw new NetworkError(`Failed to calculate bulk price: ${error.message}`, error);
    }
  }

  /**
   * Clear cache for a specific domain
   */
  clearDomainCache(domain: string): void {
    const normalizedDomain = normalizeDomainName(domain);
    
    // Clear pricing cache for all possible year combinations
    for (let years = 1; years <= 5; years++) {
      const pricingCacheKey = generatePricingCacheKey(normalizedDomain, years);
      const renewalCacheKey = `renewal_${pricingCacheKey}`;
      this.cache.delete(pricingCacheKey);
      this.cache.delete(renewalCacheKey);
    }
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