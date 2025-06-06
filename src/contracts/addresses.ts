import { NetworkConfig } from '../types';

export const DEFAULT_ADDRESSES = {
  REGISTRY: '0x3D9D5ACc7dBACf1662Bc6D1ea8479F88B90b3cfb',
  REGISTRAR: '0xc50DBB6F0BAab19C6D0473B225f7F58e4a2d440b',
  RESOLVER: '0x90DB11399F3577BeFbF5B8E094BcaD35DA348Fc9'
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