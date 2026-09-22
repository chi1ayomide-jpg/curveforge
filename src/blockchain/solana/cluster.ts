/**
 * Solana Cluster Configuration & Explorer Link Generators
 */

export type SolanaCluster = 'devnet' | 'mainnet-beta';

export interface ClusterConfig {
  name: string;
  cluster: SolanaCluster;
  defaultRpcUrl: string;
  wsUrl?: string;
}

export const CLUSTERS: Record<SolanaCluster, ClusterConfig> = {
  devnet: {
    name: 'Solana Devnet',
    cluster: 'devnet',
    defaultRpcUrl: 'https://api.devnet.solana.com',
  },
  'mainnet-beta': {
    name: 'Solana Mainnet-Beta',
    cluster: 'mainnet-beta',
    defaultRpcUrl: 'https://api.mainnet-beta.solana.com',
  },
};

export function getExplorerUrl(
  addressOrTx: string,
  type: 'address' | 'tx',
  cluster: SolanaCluster = 'devnet'
): string {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://explorer.solana.com/${type}/${addressOrTx}${clusterParam}`;
}

export function getExplorerAddressUrl(address: string, cluster: SolanaCluster = 'devnet'): string {
  return getExplorerUrl(address, 'address', cluster);
}

export function getExplorerTxUrl(txSig: string, cluster: SolanaCluster = 'devnet'): string {
  return getExplorerUrl(txSig, 'tx', cluster);
}

