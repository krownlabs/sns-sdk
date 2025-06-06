# Sonic Name Service (SNS) SDK

JavaScript/TypeScript SDK for easy integration with Sonic Name Service - the decentralized domain name system for the Sonic blockchain.

## Features

- 🚀 **Simple Integration** - Easy-to-use API for domain resolution and management
- 🔄 **Unified Interface** - Single point of access for all SNS functionality
- ⚡ **Performance Optimized** - Built-in caching and retry mechanisms
- 🛡️ **Type Safe** - Full TypeScript support with comprehensive type definitions
- 🔗 **Batch Operations** - Efficiently resolve multiple domains or addresses
- 📝 **Record Management** - Support for address, content, and text records
- 🎯 **Error Handling** - Detailed error types and clear error messages

## Installation

```bash
npm install sns-sdk ethers@^6.0.0
```

```bash
yarn add sns-sdk ethers@^6.0.0
```

> **Note**: This SDK requires ethers.js v6. If you're using ethers v5, please upgrade to v6.

## Quick Start

```typescript
import { SNS } from 'sns-sdk';
import { JsonRpcProvider } from 'ethers';

// Initialize the SDK
const provider = new JsonRpcProvider('https://rpc.soniclabs.com');
const sns = new SNS({ provider });

// Resolve a domain to an address
const address = await sns.resolve('krownlab.s');
console.log(address); // 0xc957215773a8b86c8d8bab235451e467caaf944c

// Reverse resolve an address to a domain
const domain = await sns.reverseResolve('0xc957215773a8b86c8d8bab235451e467caaf944c');
console.log(domain); // krownlab.s

// Check domain availability
const available = await sns.isAvailable('alice.s');
console.log(available); // true/false

// Get registration price
const price = await sns.getPrice('alice.s', 1); // 1 year
console.log(price.priceInEther); // "5.0"
```

## Configuration

```typescript
import { SNS } from 'sns-sdk';

const sns = new SNS({
  provider: provider,                    // Required: ethers.js provider
  registryAddress: '0x...',              // Optional: custom registry address
  registrarAddress: '0x...',             // Optional: custom registrar address  
  resolverAddress: '0x...',              // Optional: custom resolver address
  cacheEnabled: true,                    // Optional: enable caching (default: true)
  cacheTTL: 5 * 60 * 1000,               // Optional: cache TTL in ms (default: 5 min)
  retryAttempts: 3,                      // Optional: retry attempts (default: 3)
  retryDelay: 1000                       // Optional: retry delay in ms (default: 1s)
});
```

## API Reference

### Resolution Methods

#### `resolve(domain: string): Promise<string>`
Resolve a domain name to an Ethereum address.

```typescript
const address = await sns.resolve('krownlab.s');
```

#### `reverseResolve(address: string): Promise<string>`
Reverse resolve an address to a domain name.

```typescript
const domain = await sns.reverseResolve('0xc957215773a8b86c8d8bab235451e467caaf944c');
```

#### `getContent(domain: string): Promise<string>`
Get content hash for a domain.

```typescript
const contentHash = await sns.getContent('krownlab.s');
```

#### `getText(domain: string, key: string): Promise<string>`
Get text record for a domain.

```typescript
const github = await sns.getText('krownlab.s', 'github');
const x = await sns.getText('krownlab.s', 'x');
```

### Batch Operations

#### `resolveBatch(domains: string[]): Promise<BatchResolutionResult>`
Resolve multiple domains in batches.

```typescript
const result = await sns.resolveBatch(['krownlab.s', 'alice.s', 'bob.s']);
console.log(result.successful); // Successfully resolved domains
console.log(result.failed);     // Failed resolutions with errors
```

#### `reverseResolveBatch(addresses: string[]): Promise<BatchReverseResolutionResult>`
Reverse resolve multiple addresses in batches.

```typescript
const result = await sns.reverseResolveBatch([
  '0xc957215773a8b86c8d8bab235451e467caaf944c',
  '0x123...',
  '0x456...'
]);
```

### Domain Management

#### `isAvailable(domain: string): Promise<boolean>`
Check if a domain is available for registration.

```typescript
const available = await sns.isAvailable('newdomain.s');
```

#### `getPrice(domain: string, years: number): Promise<PriceResult>`
Get registration price for a domain.

```typescript
const price = await sns.getPrice('newdomain.s', 2); // 2 years
console.log(price.priceInEther);    // Price in S
console.log(price.discount);        // Discount percentage
console.log(price.discountAmount);  // Discount amount in wei
```

#### `register(domain: string, years: number, signer: Signer): Promise<string>`
Register a new domain.

```typescript
import { Wallet } from 'ethers';

const wallet = new Wallet('your-private-key', provider);
const txHash = await sns.register('newdomain.s', 1, wallet);
console.log(`Registration transaction: ${txHash}`);
```

#### `renew(domain: string, years: number, signer: Signer): Promise<string>`
Renew an existing domain.

```typescript
const txHash = await sns.renew('mydomain.s', 1, wallet);
```

### Record Management

#### `setAddress(domain: string, address: string, signer: Signer): Promise<string>`
Set the address record for a domain.

```typescript
const txHash = await sns.setAddress(
  'mydomain.s', 
  '0x742d35Cc6aF66C59D32365bb44bB3eaA6b8F7e15',
  wallet
);
```

#### `setText(domain: string, key: string, value: string, signer: Signer): Promise<string>`
Set a text record for a domain.

```typescript
// Set email
await sns.setText('mydomain.s', 'email', 'alice@example.com', wallet);

// Set social media
await sns.setText('mydomain.s', 'x', 'alice_crypto', wallet);
await sns.setText('mydomain.s', 'github', 'alice', wallet);
```

#### `setContent(domain: string, content: string, signer: Signer): Promise<string>`
Set content hash for a domain.

```typescript
const txHash = await sns.setContent('mydomain.s', 'ipfs://Qm...', wallet);
```

### Utility Methods

#### `getDomainInfo(domain: string): Promise<DomainRecord>`
Get comprehensive information about a domain.

```typescript
const info = await sns.getDomainInfo('krownlab.s');
console.log(info.owner);      // Domain owner address
console.log(info.expiryTime); // Expiry timestamp
console.log(info.expired);    // Whether domain is expired
console.log(info.address);    // Resolved address
```

#### `validateDomain(domain: string): ValidationResult`
Validate a domain name according to SNS rules.

```typescript
const validation = sns.validateDomain('my-domain');
console.log(validation.valid);  // true/false
console.log(validation.errors); // Array of error messages
```

## Error Handling

The SDK provides detailed error types for better error handling:

```typescript
import { 
  SNS, 
  DomainNotFoundError, 
  DomainExpiredError,
  ValidationError,
  NetworkError 
} from 'sns-sdk';

try {
  const address = await sns.resolve('nonexistent.s');
} catch (error) {
  if (error instanceof DomainNotFoundError) {
    console.log('Domain not found');
  } else if (error instanceof DomainExpiredError) {
    console.log('Domain has expired');
  } else if (error instanceof ValidationError) {
    console.log('Invalid domain name');
  } else if (error instanceof NetworkError) {
    console.log('Network error occurred');
  }
}
```

## Pricing

Domain pricing is based on length and registration duration:

- **3 characters**: 15 S per year
- **4 characters**: 10 S per year  
- **5 characters**: 7.5 S per year
- **6+ characters**: 5 S per year

### Multi-year Discounts

- **2 years**: 5% discount
- **3 years**: 10% discount
- **4 years**: 15% discount
- **5 years**: 20% discount

## Text Record Keys

Common text record keys supported:

```typescript
import { TEXT_RECORD_KEYS } from 'sns-sdk';

// Standard keys
TEXT_RECORD_KEYS.EMAIL      // 'email'
TEXT_RECORD_KEYS.WEBSITE    // 'website'
TEXT_RECORD_KEYS.AVATAR     // 'avatar'
TEXT_RECORD_KEYS.BANNER     // 'banner'
TEXT_RECORD_KEYS.BIO        // 'bio'

// Social media
TEXT_RECORD_KEYS.X          // 'x'
TEXT_RECORD_KEYS.GITHUB     // 'github'
TEXT_RECORD_KEYS.DISCORD    // 'discord'
TEXT_RECORD_KEYS.INSTAGRAM  // 'instagram'
TEXT_RECORD_KEYS.TELEGRAM   // 'telegram'
```

## Advanced Usage

### Custom Network Configuration

```typescript
import { SNS, getNetworkConfig } from 'sns-sdk';

// Get network config for a specific chain ID
const config = getNetworkConfig(146); // Sonic mainnet
if (config) {
  const sns = new SNS({
    provider,
    registryAddress: config.contracts.registry,
    registrarAddress: config.contracts.registrar,
    resolverAddress: config.contracts.resolver
  });
}
```

### Cache Management

```typescript
// Clear all caches
sns.clearCache();

// Get cache statistics
const stats = sns.getCacheStats();
console.log(stats.resolver.size); // Number of cached resolver entries
console.log(stats.registry.size); // Number of cached registry entries
```

### Custom Retry Configuration

```typescript
import { retryWithBackoff } from 'sns-sdk';

// Custom retry logic
const result = await retryWithBackoff(
  async () => await sns.resolve('domain.s'),
  5,    // attempts
  2000  // delay in ms
);
```

## Contract Addresses

### Sonic Mainnet
- **Registry**: `0x3D9D5ACc7dBACf1662Bc6D1ea8479F88B90b3cfb`
- **Registrar**: `0xc50DBB6F0BAab19C6D0473B225f7F58e4a2d440b`
- **Resolver**: `0x90DB11399F3577BeFbF5B8E094BcaD35DA348Fc9`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Website**: [sonicname.services](https://sonicname.services)
- **X**:       [@krownlabs](https://x.com/krownlabs)
- **Discord**: [Join our Discord](https://discord.gg/KTU4krfhrG)

## Changelog

### v1.0.0
- Initial release
- Basic resolution and registration functionality
- Batch operations support
- Comprehensive error handling
- TypeScript support