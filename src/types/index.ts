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
    texts?: Record<string, string>;
  };
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
  type: 'DomainRegistered' | 'DomainRenewed' | 'Transfer' | 'AddressSet' | 'ContentSet' | 'TextSet';
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