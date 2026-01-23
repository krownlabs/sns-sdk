import { NetworkConfig } from '../types';

export const DEFAULT_ADDRESSES = {
  REGISTRY: '0x0A6e0e2a41CD0a4BfB119b2e8183791E21600a7E',
  REGISTRAR: '0x0D9ECE9d71F038444BDB4317a058774867af39eB',
  RESOLVER: '0x105E9Bfb2f06F4809B0c323Fb8299d813793742e'
};

export const SONIC_MAINNET: NetworkConfig = {
  chainId: 146, // Sonic mainnet chain ID
  name: 'Sonic',
  contracts: {
    registry: DEFAULT_ADDRESSES.REGISTRY,
    registrar: DEFAULT_ADDRESSES.REGISTRAR,
    resolver: DEFAULT_ADDRESSES.RESOLVER
  }
};

export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  [SONIC_MAINNET.chainId]: SONIC_MAINNET
};

export function getNetworkConfig(chainId: number): NetworkConfig | null {
  return SUPPORTED_NETWORKS[chainId] || null;
}

export function isNetworkSupported(chainId: number): boolean {
  return chainId in SUPPORTED_NETWORKS;
}