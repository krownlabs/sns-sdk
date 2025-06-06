import { Contract, Provider, Signer } from 'ethers';
import { 
  PriceResult,
  RegistrationOptions
} from '../types';
import { ISonicRegistrar } from '../types/contracts';
import { Cache, generatePricingCacheKey } from '../utils/cache';
import { retryWithBackoff, calculatePrice, weiToEther } from '../utils/helpers';
import { normalizeDomainName, validateDomainName, validateYears } from '../utils/validation';
import { 
  ValidationError,
  DomainUnavailableError,
  InsufficientPaymentError,
  NetworkError 
} from '../errors';
import SonicRegistrarABI from '../contracts/abis/SonicRegistrar.json';

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