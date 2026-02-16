import { Contract, ContractTransactionResponse } from 'ethers';

// Interface for SonicRegistry contract methods only
export interface SonicRegistryMethods {
  nameToTokenId(name: string): Promise<bigint>;
  tokenIdToName(tokenId: bigint | string): Promise<string>;
  ownerOf(tokenId: bigint | string): Promise<string>;
  getExpiryTime(tokenId: bigint | string): Promise<bigint>;
  isExpired(tokenId: bigint | string): Promise<boolean>;
  timeUntilExpiry(tokenId: bigint | string): Promise<bigint>;
  available(name: string): Promise<boolean>;
  exists(tokenId: bigint | string): Promise<boolean>;
  getResolver(tokenId: bigint | string): Promise<string>;
  setResolver(tokenId: bigint | string, resolver: string): Promise<ContractTransactionResponse>;
  register(name: string, owner: string, duration: bigint | number): Promise<ContractTransactionResponse>;
  extend(tokenId: bigint | string, duration: bigint | number): Promise<ContractTransactionResponse>;
  // V2 additions
  setCustomImage(tokenId: bigint | string, imageURI: string): Promise<ContractTransactionResponse>;
  clearCustomImage(tokenId: bigint | string): Promise<ContractTransactionResponse>;
  customImages(tokenId: bigint | string): Promise<string>;
  GRACE_PERIOD(): Promise<bigint>;
  TLD(): Promise<string>;
}

// Interface for SonicResolver contract methods only
export interface SonicResolverMethods {
  // V1 methods (some kept for compatibility)
  resolveAddress(tokenId: bigint | string): Promise<string>;
  resolveContent(tokenId: bigint | string): Promise<string>;
  resolveText(tokenId: bigint | string, key: string): Promise<string>;
  reverseLookup(addr: string): Promise<string>;
  reverseRecords(addr: string): Promise<bigint>;
  setAddress(tokenId: bigint | string, addr: string): Promise<ContractTransactionResponse>;
  setContent(tokenId: bigint | string, content: string): Promise<ContractTransactionResponse>;
  setText(tokenId: bigint | string, key: string, value: string): Promise<ContractTransactionResponse>;
  setReverse(tokenId: bigint | string): Promise<ContractTransactionResponse>;
  createSubdomain(tokenId: bigint | string, label: string, owner: string): Promise<ContractTransactionResponse>;
  // V2 additions
  addr(tokenId: bigint | string): Promise<string>;
  contenthash(tokenId: bigint | string): Promise<string>;
  text(tokenId: bigint | string, key: string): Promise<string>;
  setContenthash(tokenId: bigint | string, hash: string): Promise<ContractTransactionResponse>;
  setTextBatch(tokenId: bigint | string, keys: string[], values: string[]): Promise<ContractTransactionResponse>;
  getTexts(tokenId: bigint | string, keys: string[]): Promise<string[]>;
  getSocials(tokenId: bigint | string): Promise<[string, string, string, string]>;
  setPrimaryName(tokenId: bigint | string): Promise<ContractTransactionResponse>;
  clearPrimaryName(): Promise<ContractTransactionResponse>;
  getPrimaryName(owner: string): Promise<string>;
  getPrimaryNameTokenId(owner: string): Promise<bigint>;
}

// Interface for SonicRegistrar contract methods only
export interface SonicRegistrarMethods {
  calculatePrice(name: string, years: number): Promise<bigint>;
  getRenewalPrice(name: string, years: number): Promise<bigint>;
  getBasePrice(name: string): Promise<bigint>;
  getDiscount(years: number): Promise<bigint>;
  isValidName(name: string): Promise<boolean>;
  register(name: string, years: number, overrides?: { value: bigint }): Promise<ContractTransactionResponse>;
  renew(name: string, years: number, overrides?: { value: bigint }): Promise<ContractTransactionResponse>;
  // V2 additions - bulk operations
  registerBulk(names: string[], yearCounts: number[], overrides?: { value: bigint }): Promise<ContractTransactionResponse>;
  renewBulk(tokenIds: (bigint | string)[], yearCounts: number[], overrides?: { value: bigint }): Promise<ContractTransactionResponse>;
  calculateBulkPrice(names: string[], yearCounts: number[]): Promise<bigint>;
  // V2 additions - register and configure
  registerAndConfigure(name: string, yearCount: number, resolverAddress: string, setPrimary: boolean, overrides?: { value: bigint }): Promise<ContractTransactionResponse>;
  THREECHAR(): Promise<bigint>;
  FOURCHAR(): Promise<bigint>;
  FIVECHAR(): Promise<bigint>;
  SIXPLUSCHAR(): Promise<bigint>;
  MAX_REGISTRATION_YEARS(): Promise<bigint>;
  registry(): Promise<string>;
}

// Type intersection for full contract types
export type ISonicRegistry = Contract & SonicRegistryMethods;
export type ISonicResolver = Contract & SonicResolverMethods;  
export type ISonicRegistrar = Contract & SonicRegistrarMethods;