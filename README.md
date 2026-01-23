# Sonic Name Service (SNS) SDK V2

JavaScript/TypeScript SDK for easy integration with Sonic Name Service - the decentralized domain name system for the Sonic blockchain.

> **🎉 Version 2.0 is here!** This major update brings bulk operations, ENS-compatible contenthash, custom NFT images, and enhanced text record management.

## Features

- 🚀 **Simple Integration** - Easy-to-use API for domain resolution and management
- 🔄 **Unified Interface** - Single point of access for all SNS functionality
- ⚡ **Performance Optimized** - Built-in caching and retry mechanisms
- 🛡️ **Type Safe** - Full TypeScript support with comprehensive type definitions
- 🔗 **Batch Operations** - Efficiently resolve multiple domains or addresses
- 📝 **Record Management** - Support for address, content, and text records
- 🎯 **Error Handling** - Detailed error types and clear error messages

### 🆕 What's New in V2

- 📦 **Bulk Operations** - Register or renew up to 20 domains in a single transaction
- 🌐 **ENS-Compatible Contenthash** - Full IPFS/Swarm support following ENSIP-7 standard
- 🎨 **Custom NFT Images** - Set custom avatars/images for domain NFTs
- ✨ **Batch Text Records** - Set multiple text records at once for gas efficiency
- 👤 **Primary Names** - Enhanced reverse resolution with primary name system
- 📱 **Social Records Helper** - Convenient methods for Twitter, GitHub, Discord, Telegram
- 🔄 **Upgradeable Contracts** - Built on OpenZeppelin UUPS proxy pattern
- 💎 **ERC-4906 Metadata** - Real-time NFT marketplace updates
- 👑 **ERC-2981 Royalties** - Built-in royalty support for secondary sales

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

### V2: Bulk Operations

#### `registerBulk(domains: Array<{ name: string; years: number }>, signer: Signer): Promise<string>`
Register multiple domains in a single transaction (up to 20 domains).

```typescript
const txHash = await sns.registerBulk([
  { name: 'domain1', years: 1 },
  { name: 'domain2', years: 2 },
  { name: 'domain3', years: 1 }
], wallet);
```

#### `renewBulk(renewals: Array<{ domain: string; years: number }>, signer: Signer): Promise<string>`
Renew multiple domains in a single transaction.

```typescript
const txHash = await sns.renewBulk([
  { domain: 'mydomain1.s', years: 1 },
  { domain: 'mydomain2.s', years: 2 }
], wallet);
```

#### `calculateBulkPrice(domains: Array<{ name: string; years: number }>): Promise<BulkPriceResult>`
Calculate total price for bulk registration.

```typescript
const result = await sns.calculateBulkPrice([
  { name: 'domain1', years: 1 },
  { name: 'domain2', years: 2 }
]);
console.log(result.totalPriceInEther); // "10.0"
console.log(result.breakdown);          // Per-domain price breakdown
```

### V2: Contenthash (IPFS/Swarm)

#### `getContenthash(domain: string): Promise<string>`
Get ENS-compatible contenthash for a domain.

```typescript
const contenthash = await sns.getContenthash('mydomain.s');
// Returns bytes in ENSIP-7 format
```

#### `setContenthash(domain: string, hash: string, signer: Signer): Promise<string>`
Set contenthash for a domain (supports IPFS/Swarm).

```typescript
// IPFS example
const txHash = await sns.setContenthash('mydomain.s', '0xe3010170...', wallet);
```

### V2: Enhanced Text Records

#### `getTexts(domain: string, keys: string[]): Promise<Record<string, string>>`
Get multiple text records at once.

```typescript
const records = await sns.getTexts('mydomain.s', [
  'email', 'url', 'avatar', 'description'
]);
console.log(records.email); // "alice@example.com"
```

#### `setTextBatch(domain: string, records: Record<string, string>, signer: Signer): Promise<string>`
Set multiple text records in a single transaction.

```typescript
const txHash = await sns.setTextBatch('mydomain.s', {
  'email': 'alice@example.com',
  'com.twitter': '@alice',
  'com.github': 'alice',
  'url': 'https://alice.com'
}, wallet);
```

#### `getSocials(domain: string): Promise<SocialRecords>`
Get social media records for a domain.

```typescript
const socials = await sns.getSocials('mydomain.s');
console.log(socials.twitter);  // Twitter handle
console.log(socials.github);   // GitHub username
console.log(socials.discord);  // Discord username
console.log(socials.telegram); // Telegram username
```

### V2: Primary Names

#### `setPrimaryName(domain: string, signer: Signer): Promise<string>`
Set a domain as your primary name (replaces reverse records).

```typescript
const txHash = await sns.setPrimaryName('mydomain.s', wallet);
```

#### `clearPrimaryName(signer: Signer): Promise<string>`
Clear your primary name.

```typescript
const txHash = await sns.clearPrimaryName(wallet);
```

#### `getPrimaryName(address: string): Promise<string>`
Get the primary name for an address.

```typescript
const primaryName = await sns.getPrimaryName('0x742d35Cc6aF66C59D32365bb44bB3eaA6b8F7e15');
console.log(primaryName); // "alice.s"
```

### V2: Custom NFT Images

#### `getCustomImage(domain: string): Promise<string>`
Get custom image URI for a domain.

```typescript
const imageURI = await sns.getCustomImage('mydomain.s');
```

#### `setCustomImage(domain: string, imageURI: string, signer: Signer): Promise<string>`
Set a custom image for your domain NFT.

```typescript
// IPFS image
const txHash = await sns.setCustomImage(
  'mydomain.s',
  'ipfs://QmX...',
  wallet
);

// HTTP image
const txHash = await sns.setCustomImage(
  'mydomain.s',
  'https://example.com/my-avatar.png',
  wallet
);
```

#### `clearCustomImage(domain: string, signer: Signer): Promise<string>`
Clear custom image and revert to default SVG.

```typescript
const txHash = await sns.clearCustomImage('mydomain.s', wallet);
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

### Sonic Mainnet (V2)
- **Registry**: `0x0A6e0e2a41CD0a4BfB119b2e8183791E21600a7E`
- **Registrar**: `0x0D9ECE9d71F038444BDB4317a058774867af39eB`
- **Resolver**: `0x105E9Bfb2f06F4809B0c323Fb8299d813793742e`

These addresses are automatically used by the SDK. If you need to use custom addresses, pass them in the configuration.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Website**: [sonicname.services](https://sns.krownlabs.app)
- **X**:       [@krownlabs](https://x.com/krownlabs)
- **Discord**: [Join our Discord](https://discord.gg/KTU4krfhrG)

## Migration Guide: V1 → V2

### Breaking Changes

The V2 SDK is mostly backward compatible with V1, but there are a few important changes:

#### 1. Contract Addresses Updated
V2 uses new upgraded contracts. Update your contract addresses if you're using custom addresses:

```typescript
const sns = new SNS({
  provider,
  registryAddress: '0x...', // V2 registry address
  registrarAddress: '0x...', // V2 registrar address
  resolverAddress: '0x...' // V2 resolver address
});
```

#### 2. Reverse Records → Primary Names
The old `setReverse()` method still works but is deprecated. Use `setPrimaryName()` instead:

```typescript
// ❌ V1 (deprecated)
await sns.setReverse('mydomain.s', wallet);

// ✅ V2 (recommended)
await sns.setPrimaryName('mydomain.s', wallet);
```

#### 3. Enhanced Domain Records
The `DomainRecord` type now includes additional V2 fields:

```typescript
const info = await sns.getDomainInfo('mydomain.s');

// V2 additions:
info.contenthash   // ENS-compatible contenthash
info.customImage   // Custom NFT image URI
```

### New Features to Adopt

#### Bulk Operations
Save gas by registering/renewing multiple domains at once:

```typescript
// Register 3 domains in one transaction
await sns.registerBulk([
  { name: 'domain1', years: 1 },
  { name: 'domain2', years: 2 },
  { name: 'domain3', years: 1 }
], wallet);
```

#### Contenthash for IPFS/Swarm
Store decentralized content hashes:

```typescript
// Set IPFS contenthash
await sns.setContenthash('mydomain.s', '0xe3010170...', wallet);
```

#### Batch Text Records
Update multiple text records efficiently:

```typescript
await sns.setTextBatch('mydomain.s', {
  'email': 'alice@example.com',
  'com.twitter': '@alice',
  'com.github': 'alice'
}, wallet);
```

#### Custom NFT Images
Personalize your domain NFTs:

```typescript
await sns.setCustomImage('mydomain.s', 'ipfs://QmX...', wallet);
```

## Changelog

### v2.0.0 (2026-01)
- 🎉 **MAJOR UPDATE**: Full V2 contract support
- ✨ Bulk registration and renewal operations
- 🌐 ENS-compatible contenthash support (IPFS/Swarm)
- 🎨 Custom NFT images for domains
- 📝 Batch text record operations
- 👤 Primary name system (enhanced reverse resolution)
- 📱 Social media records helper methods
- 🔄 UUPS upgradeable contract support
- 💎 ERC-4906 metadata updates
- 👑 ERC-2981 royalty support

### v1.1.0
- Enhanced type definitions
- Improved error handling
- Performance optimizations

### v1.0.0
- Initial release
- Basic resolution and registration functionality
- Batch operations support
- Comprehensive error handling
- TypeScript support