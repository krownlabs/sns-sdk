export const TLD = '.s';

export const PRICING = {
  THREECHAR: '15000000000000000000', // 15 S in wei
  FOURCHAR: '10000000000000000000',  // 10 S in wei
  FIVECHAR: '7500000000000000000',   // 7.5 S in wei
  SIXPLUSCHAR: '5000000000000000000' // 5 S in wei
};

export const DISCOUNT_TIERS = [
  { yearCount: 2, discount: 500 },   // 5%
  { yearCount: 3, discount: 1000 },  // 10%
  { yearCount: 4, discount: 1500 },  // 15%
  { yearCount: 5, discount: 2000 }   // 20%
];

export const TIME_CONSTANTS = {
  YEAR: 365 * 24 * 60 * 60, // 1 year in seconds
  GRACE_PERIOD: 30 * 24 * 60 * 60, // 30 days in seconds
  MAX_REGISTRATION_YEARS: 5
};

export const VALIDATION_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 64,
  VALID_CHARS: /^[a-z0-9-]+$/,
  NO_DOUBLE_HYPHEN: /--/,
  STARTS_WITH_LETTER: /^[a-z]/,
  ENDS_WITH_LETTER_OR_NUMBER: /[a-z0-9]$/
};

export const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_ENTRIES: 1000,
  CLEANUP_INTERVAL: 60 * 1000 // 1 minute
};

export const RETRY_CONFIG = {
  DEFAULT_ATTEMPTS: 3,
  DEFAULT_DELAY: 1000, // 1 second
  BACKOFF_MULTIPLIER: 2
};

export const TEXT_RECORD_KEYS = {
  X: 'x',
  DISCORD: 'discord',
  TELEGRAM: 'telegram',
  GITHUB: 'github',
  WEBSITE: 'website',
  INSTAGRAM: 'instagram',
  BIO: 'bio',
  AVATAR: 'avatar',
  BANNER: 'banner',
  EMAIL: 'email',
};

export const EVENT_TOPICS = {
  // Registry Events (from SonicRegistry contract)
  DOMAIN_REGISTERED_REGISTRY: '0xe0c248e83e4f44d5e9d4bff872183a4b9b61245851244cdf4ed25c0bd41141f8',
  DOMAIN_RENEWED: '0x9b87a00e30f1ac65d898f070f8a3488fe60517182d0a2098e1b4b93a54aa9bd6',
  TRANSFER: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  RESOLVER_SET: '0xa949d469e37bee76d0d9341dae642ba2f574dca8b5e6f277e8ff8d453ab543c2',
  
  // Registrar Events (from SonicRegistrar contract) 
  DOMAIN_REGISTERED_REGISTRAR: '0x87fd548bf5794610496e606965e724cec5c33f621c084067a46c43a81a1887e7',
  
  // Resolver Events (from SonicResolver contract)
  ADDRESS_SET: '0xcb8f0f32182a0f756b1e065dab832c24d2c48fa533912c33552252a7f25bf4ae',
  CONTENT_SET: '0x0424c7cdaa3c3bbc6b4ccb2c3ad3e12f9a8b7c2d0fc7ba52ac1b12b5b8e8b5a2',
  TEXT_SET: '0xed2050cfd1cc74b1a42fab0c1d06bee5c4bfc0e5e166feea7605ac8a53ddadd8',
  REVERSE_SET: '0xe097cd7f247f2e93ec387df31ac14559fd4107d61ed022afce9a5b8d3b494d86'
};