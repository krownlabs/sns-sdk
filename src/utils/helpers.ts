import { formatEther, parseEther } from 'ethers';
import { RETRY_CONFIG, DISCOUNT_TIERS, PRICING } from './constants';

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempts: number = RETRY_CONFIG.DEFAULT_ATTEMPTS,
  delay: number = RETRY_CONFIG.DEFAULT_DELAY
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === attempts - 1) {
        throw lastError;
      }

      const backoffDelay = delay * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, i);
      await sleep(backoffDelay);
    }
  }

  throw lastError!;
}

/**
 * Convert wei to ether string
 */
export function weiToEther(wei: bigint): string {
  return formatEther(wei);
}

/**
 * Convert ether string to wei
 */
export function etherToWei(ether: string): bigint {
  return parseEther(ether);
}

/**
 * Calculate base price for a domain based on length
 */
export function calculateBasePrice(domainName: string): bigint {
  const length = domainName.length;
  
  if (length === 3) return BigInt(PRICING.THREECHAR);
  if (length === 4) return BigInt(PRICING.FOURCHAR);
  if (length === 5) return BigInt(PRICING.FIVECHAR);
  return BigInt(PRICING.SIXPLUSCHAR);
}

/**
 * Get discount percentage for registration years
 */
export function getDiscount(years: number): number {
  const tier = DISCOUNT_TIERS.find(t => t.yearCount === years);
  return tier ? tier.discount : 0;
}

/**
 * Calculate total price with discount
 */
export function calculatePrice(domainName: string, years: number): {
  basePrice: bigint;
  totalBasePrice: bigint;
  discount: number;
  discountAmount: bigint;
  finalPrice: bigint;
} {
  const basePrice = calculateBasePrice(domainName);
  const totalBasePrice = basePrice * BigInt(years);
  const discount = getDiscount(years);
  
  if (discount === 0) {
    return {
      basePrice,
      totalBasePrice,
      discount: 0,
      discountAmount: 0n,
      finalPrice: totalBasePrice
    };
  }

  const discountAmount = (totalBasePrice * BigInt(discount)) / 10000n;
  const finalPrice = totalBasePrice - discountAmount;

  return {
    basePrice,
    totalBasePrice,
    discount,
    discountAmount,
    finalPrice
  };
}

/**
 * Chunk an array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Convert seconds to human readable time
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  
  const years = Math.floor(seconds / (365 * 24 * 60 * 60));
  const days = Math.floor((seconds % (365 * 24 * 60 * 60)) / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (years > 0) {
    return `${years} year${years !== 1 ? 's' : ''} ${days} day${days !== 1 ? 's' : ''}`;
  } else if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

/**
 * Generate a random string for testing
 */
export function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // First character must be a letter
  result += chars.charAt(Math.floor(Math.random() * 26));
  
  for (let i = 1; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Check if a value is a valid BigInt
 */
export function isBigInt(value: any): value is bigint {
  return typeof value === 'bigint';
}

/**
 * Safely convert a value to BigInt
 */
export function toBigInt(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string') return BigInt(value);
  throw new Error('Cannot convert value to BigInt');
}

/**
 * Format a BigInt as a readable string with commas
 */
export function formatBigInt(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code;
  
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    code === 'NETWORK_ERROR' ||
    code === 'TIMEOUT'
  );
}

/**
 * Check if an error is a contract error
 */
export function isContractError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code;
  
  return (
    message.includes('revert') ||
    message.includes('execution reverted') ||
    code === 'CALL_EXCEPTION' ||
    code === 'UNPREDICTABLE_GAS_LIMIT'
  );
}

/**
 * Extract revert reason from error
 */
export function extractRevertReason(error: any): string | null {
  if (!error) return null;
  
  const message = error.message || '';
  
  // Try to extract reason from various error formats
  const patterns = [
    /execution reverted: (.+)/,
    /reverted with reason string '(.+)'/,
    /VM execution error\. (.+)/,
    /"message":"(.+)"/
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Create a promise that times out after specified milliseconds
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
}