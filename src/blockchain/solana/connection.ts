import { Connection } from '@solana/web3.js';
import { CLUSTERS, SolanaCluster } from './cluster';

class ConnectionManager {
  private currentCluster: SolanaCluster = 'devnet';
  private connection: Connection;
  private customRpcUrl: string | null = null;

  constructor() {
    this.connection = new Connection(CLUSTERS[this.currentCluster].defaultRpcUrl, 'confirmed');
  }

  public getCluster(): SolanaCluster {
    return this.currentCluster;
  }

  public setCluster(cluster: SolanaCluster, customRpc?: string): void {
    this.currentCluster = cluster;
    this.customRpcUrl = customRpc || null;
    const url = customRpc || CLUSTERS[cluster].defaultRpcUrl;
    this.connection = new Connection(url, 'confirmed');
  }

  public getConnection(): Connection {
    return this.connection;
  }

  public getRpcUrl(): string {
    return this.customRpcUrl || CLUSTERS[this.currentCluster].defaultRpcUrl;
  }
}

export const connectionManager = new ConnectionManager();
