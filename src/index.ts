import { SNS } from './core/SNS';

// Main SDK class
export { SNS } from './core/SNS';

// Core components (for advanced usage)
export { SonicResolver } from './core/resolver';
export { SonicRegistry } from './core/registry';
export { SonicRegistrar } from './core/registrar';

// Types
export type {
  ISonicRegistry,
  ISonicResolver, 
  ISonicRegistrar,
  SNSConfig,
  DomainRecord,
  ResolutionResult,
  ReverseResolutionResult,
  AvailabilityResult,
  PriceResult,
  RegistrationOptions,
  BatchResolutionResult,
  BatchReverseResolutionResult,
  SubdomainInfo,
  TextRecord,
  CacheEntry,
  ValidationResult,
  NetworkConfig,
  EventFilter,
  DomainEvent,
  DomainName,
  TokenId,
  EthereumAddress
} from './types';

// Contract addresses and network configs
export {
  DEFAULT_ADDRESSES,
  SONIC_MAINNET,
  SUPPORTED_NETWORKS,
  getNetworkConfig,
  isNetworkSupported
} from './contracts/addresses';

// Utilities
export {
  validateDomainName,
  validateAddress,
  validateYears,
  validateTextKey,
  normalizeDomainName,
  addTLD,
  removeTLD,
  isValidHex,
  isDomainExpired,
  timeUntilExpiry,
  formatDuration
} from './utils/validation';

export {
  sleep,
  retryWithBackoff,
  weiToEther,
  etherToWei,
  calculateBasePrice,
  getDiscount,
  calculatePrice,
  chunkArray,
  debounce,
  formatTimeRemaining,
  generateRandomString,
  isBigInt,
  toBigInt,
  formatBigInt,
  isNetworkError,
  isContractError,
  extractRevertReason,
  withTimeout
} from './utils/helpers';

export {
  Cache,
  generateResolutionCacheKey,
  generateReverseResolutionCacheKey,
  generateAvailabilityCacheKey,
  generateRecordsCacheKey,
  generatePricingCacheKey
} from './utils/cache';

// Constants
export {
  TLD,
  PRICING,
  DISCOUNT_TIERS,
  TIME_CONSTANTS,
  VALIDATION_RULES,
  CACHE_CONFIG,
  RETRY_CONFIG,
  TEXT_RECORD_KEYS,
  EVENT_TOPICS
} from './utils/constants';

// Errors
export {
  SNSError,
  ValidationError,
  DomainNotFoundError,
  DomainExpiredError,
  DomainUnavailableError,
  InsufficientPaymentError,
  NetworkError,
  ContractError,
  ConfigurationError,
  PermissionError,
  ResolverError,
  TimeoutError,
  ErrorCodes,
  isSNSError,
  wrapError
} from './errors';

// Default export
export default SNS;