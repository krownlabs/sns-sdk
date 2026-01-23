/**
 * Base error class for SNS SDK
 */
export class SNSError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'SNSError';
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SNSError);
    }
  }
}

/**
 * Domain validation error
 */
export class ValidationError extends SNSError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Domain not found error
 */
export class DomainNotFoundError extends SNSError {
  constructor(domain: string) {
    super(`Domain '${domain}' not found`, 'DOMAIN_NOT_FOUND', { domain });
    this.name = 'DomainNotFoundError';
  }
}

/**
 * Domain expired error
 */
export class DomainExpiredError extends SNSError {
  constructor(domain: string, expiryTime: number) {
    super(`Domain '${domain}' has expired`, 'DOMAIN_EXPIRED', { domain, expiryTime });
    this.name = 'DomainExpiredError';
  }
}

/**
 * Domain unavailable error
 */
export class DomainUnavailableError extends SNSError {
  constructor(domain: string, reason?: string) {
    super(`Domain '${domain}' is not available${reason ? ': ' + reason : ''}`, 'DOMAIN_UNAVAILABLE', { domain, reason });
    this.name = 'DomainUnavailableError';
  }
}

/**
 * Insufficient payment error
 */
export class InsufficientPaymentError extends SNSError {
  constructor(required: string, provided: string) {
    super(`Insufficient payment. Required: ${required}, Provided: ${provided}`, 'INSUFFICIENT_PAYMENT', { required, provided });
    this.name = 'InsufficientPaymentError';
  }
}

/**
 * Network error
 */
export class NetworkError extends SNSError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

/**
 * Contract error
 */
export class ContractError extends SNSError {
  constructor(message: string, details?: any) {
    super(message, 'CONTRACT_ERROR', details);
    this.name = 'ContractError';
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends SNSError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

/**
 * Permission error
 */
export class PermissionError extends SNSError {
  constructor(message: string, details?: any) {
    super(message, 'PERMISSION_ERROR', details);
    this.name = 'PermissionError';
  }
}

/**
 * Resolver error
 */
export class ResolverError extends SNSError {
  constructor(message: string, details?: any) {
    super(message, 'RESOLVER_ERROR', details);
    this.name = 'ResolverError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends SNSError {
  constructor(operation: string, timeout: number) {
    super(`Operation '${operation}' timed out after ${timeout}ms`, 'TIMEOUT_ERROR', { operation, timeout });
    this.name = 'TimeoutError';
  }
}

/**
 * Error codes enum for easy reference
 */
export enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DOMAIN_NOT_FOUND = 'DOMAIN_NOT_FOUND',
  DOMAIN_EXPIRED = 'DOMAIN_EXPIRED',
  DOMAIN_UNAVAILABLE = 'DOMAIN_UNAVAILABLE',
  INSUFFICIENT_PAYMENT = 'INSUFFICIENT_PAYMENT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  RESOLVER_ERROR = 'RESOLVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

/**
 * Utility function to check if an error is a SNS error
 */
export function isSNSError(error: any): error is SNSError {
  return error instanceof SNSError;
}

/**
 * Utility function to wrap unknown errors
 */
export function wrapError(error: any, context?: string): SNSError {
  if (isSNSError(error)) {
    return error;
  }

  const message = error?.message || 'Unknown error occurred';
  const contextMessage = context ? `${context}: ${message}` : message;
  
  return new SNSError(contextMessage, 'UNKNOWN_ERROR', { originalError: error });
}