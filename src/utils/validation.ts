import { ValidationResult } from '../types';
import { VALIDATION_RULES, TLD, TIME_CONSTANTS } from './constants';

/**
 * Validates a domain name according to SNS rules
 */
export function validateDomainName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name || typeof name !== 'string') {
    errors.push('Domain name must be a non-empty string');
    return { valid: false, errors };
  }

  // Remove TLD if present for validation
  const cleanName = name.toLowerCase().replace(TLD, '');
  
  // Check length
  if (cleanName.length < VALIDATION_RULES.MIN_LENGTH) {
    errors.push(`Domain name must be at least ${VALIDATION_RULES.MIN_LENGTH} characters long`);
  }
  
  if (cleanName.length > VALIDATION_RULES.MAX_LENGTH) {
    errors.push(`Domain name cannot exceed ${VALIDATION_RULES.MAX_LENGTH} characters`);
  }

  // Check valid characters
  if (!VALIDATION_RULES.VALID_CHARS.test(cleanName)) {
    errors.push('Domain name can only contain lowercase letters, numbers, and hyphens');
  }

  // Check double hyphens
  if (VALIDATION_RULES.NO_DOUBLE_HYPHEN.test(cleanName)) {
    errors.push('Domain name cannot contain consecutive hyphens');
  }

  // Check starts with letter
  if (!VALIDATION_RULES.STARTS_WITH_LETTER.test(cleanName)) {
    errors.push('Domain name must start with a letter');
  }

  // Check ends with letter or number
  if (!VALIDATION_RULES.ENDS_WITH_LETTER_OR_NUMBER.test(cleanName)) {
    errors.push('Domain name must end with a letter or number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates an Ethereum address
 */
export function validateAddress(address: string): ValidationResult {
  const errors: string[] = [];
  
  if (!address || typeof address !== 'string') {
    errors.push('Address must be a non-empty string');
    return { valid: false, errors };
  }

  // Check if it's a valid Ethereum address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    errors.push('Invalid Ethereum address format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates registration years
 */
export function validateYears(years: number): ValidationResult {
  const errors: string[] = [];
  
  if (!Number.isInteger(years) || years <= 0) {
    errors.push('Years must be a positive integer');
  }
  
  if (years > TIME_CONSTANTS.MAX_REGISTRATION_YEARS) {
    errors.push(`Cannot register for more than ${TIME_CONSTANTS.MAX_REGISTRATION_YEARS} years`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates text record key
 */
export function validateTextKey(key: string): ValidationResult {
  const errors: string[] = [];
  
  if (!key || typeof key !== 'string') {
    errors.push('Text record key must be a non-empty string');
    return { valid: false, errors };
  }

  if (key.length > 64) {
    errors.push('Text record key cannot exceed 64 characters');
  }

  // Allow alphanumeric, dots, and hyphens for keys like "com.twitter"
  if (!/^[a-zA-Z0-9.-]+$/.test(key)) {
    errors.push('Text record key can only contain letters, numbers, dots, and hyphens');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Normalizes a domain name by removing TLD and converting to lowercase
 */
export function normalizeDomainName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  return name.toLowerCase().replace(TLD, '');
}

/**
 * Adds TLD to a domain name if not already present
 */
export function addTLD(name: string): string {
  const normalized = normalizeDomainName(name);
  return `${normalized}${TLD}`;
}

/**
 * Removes TLD from a domain name if present
 */
export function removeTLD(name: string): string {
  return normalizeDomainName(name);
}

/**
 * Checks if a string is a valid hex string
 */
export function isValidHex(hex: string): boolean {
  return /^0x[a-fA-F0-9]+$/.test(hex);
}

/**
 * Checks if a domain name has expired
 */
export function isDomainExpired(expiryTime: number, graceTime: number = TIME_CONSTANTS.GRACE_PERIOD): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (expiryTime + graceTime) <= now;
}

/**
 * Calculates time until domain expires
 */
export function timeUntilExpiry(expiryTime: number): number {
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = expiryTime - now;
  return Math.max(0, timeLeft);
}

/**
 * Formats time duration to human readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}