import { Provider } from 'ethers';

// Export contract interfaces
export type { ISonicRegistry, ISonicResolver, ISonicRegistrar } from './contracts';

export interface SNSConfig {
  provider: Provider;
  registryAddress?: string;
  registrarAddress?: string;
  resolverAddress?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface DomainRecord {
  name: string;
  tokenId: string;
  owner: string;
  resolver: string;
  address?: string | undefined;
  content?: string | undefined;
  contenthash?: string | undefined; // V2: ENS-compatible contenthash
  customImage?: string | undefined; // V2: Custom NFT image URI
  texts?: Record<string, string> | undefined;
  expiryTime: number;
  expired: boolean;
}

export interface ResolutionResult {
  address: string;
  tokenId: string;
  name: string;
  expired: boolean;
  expiryTime: number;
}

export interface ReverseResolutionResult {
  name: string;
  tokenId: string;
  address: string;
  expired: boolean;
  expiryTime: number;
}

export interface AvailabilityResult {
  available: boolean;
  reason?: 'taken' | 'expired' | 'invalid';
  expiryTime?: number;
  owner?: string;
}

export interface PriceResult {
  price: bigint;
  priceInEther: string;
  basePrice: bigint;
  discount: number;
  discountAmount: bigint;
}

export interface RegistrationOptions {
  years: number;
  resolver?: string;
  records?: {
    address?: string;
    content?: string;
    contenthash?: string; // V2: ENS-compatible contenthash
    texts?: Record<string, string>;
  };
  customImage?: string; // V2: Custom NFT image URI
}

// V2: Bulk registration options
export interface BulkRegistrationOptions {
  domains: Array<{
    name: string;
    years: number;
  }>;
}

// V2: Bulk registration result
export interface BulkRegistrationResult {
  transactionHash: string;
  totalPrice: bigint;
  domains: Array<{
    name: string;
    tokenId?: string;
    success: boolean;
    error?: string;
  }>;
}

// V2: Social media records (convenience type)
export interface SocialRecords {
  twitter?: string;
  github?: string;
  discord?: string;
  telegram?: string;
}

export interface BatchResolutionResult {
  successful: Array<{
    input: string;
    result: ResolutionResult;
  }>;
  failed: Array<{
    input: string;
    error: string;
  }>;
}

export interface BatchReverseResolutionResult {
  successful: Array<{
    input: string;
    result: ReverseResolutionResult;
  }>;
  failed: Array<{
    input: string;
    error: string;
  }>;
}

export interface SubdomainInfo {
  label: string;
  owner: string;
  exists: boolean;
  parent: string;
}

export interface TextRecord {
  key: string;
  value: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  contracts: {
    registry: string;
    registrar: string;
    resolver: string;
  };
}

export interface EventFilter {
  fromBlock?: number;
  toBlock?: number;
  address?: string;
  topics?: Array<string | null>;
}

export interface DomainEvent {
  type: 'DomainRegistered' | 'DomainRenewed' | 'DomainReclaimed' | 'Transfer' | 'AddressSet' | 'ContentSet' | 'TextSet' | 'CustomImageSet' | 'PrimaryNameSet' | 'BulkRegistration' | 'BulkRenewal';
  domain: string;
  tokenId: string;
  owner: string;
  blockNumber: number;
  transactionHash: string;
  data?: any;
}

export type TLD = '.s';
export type DomainName = string;
export type TokenId = string;
export type EthereumAddress = string;