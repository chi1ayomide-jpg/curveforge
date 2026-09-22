import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
} from '@solana/web3.js';
import {
  DynamicBondingCurveClient,
  deriveDbcPoolAddress,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { CurveConfiguration } from '../../domain/curve/curve-types';
import { buildMeteoraDbcConfigParams } from './config-builder';

export interface PoolProgressSummary {
  poolAddress: string;
  quoteProgressPercent: number;
  baseProgressPercent: number;
  quoteReserve: string;
  isGraduated: boolean;
  rawConfigKey: string;
}

export class MeteoraDbcAdapter {
  private client: DynamicBondingCurveClient;
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
    this.client = DynamicBondingCurveClient.create(connection, 'confirmed');
  }

  public getClient(): DynamicBondingCurveClient {
    return this.client;
  }

  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Derives deterministic virtual pool PDA address
   */
  public derivePoolAddress(quoteMint: PublicKey, baseMint: PublicKey, configKey: PublicKey): PublicKey {
    return deriveDbcPoolAddress(quoteMint, baseMint, configKey);
  }

  /**
   * Fetches real-time on-chain pool state and curve progress
   */
  public async getPoolProgress(poolAddress: PublicKey): Promise<PoolProgressSummary> {
    const poolState = await this.client.state.getPool(poolAddress);
    if (!poolState) {
      throw new Error(`Meteora DBC Pool not found at ${poolAddress.toBase58()}`);
    }
    const quoteProgress = await this.client.state.getPoolQuoteTokenCurveProgress(poolAddress);
    const baseProgress = await this.client.state.getPoolBaseTokenCurveProgress(poolAddress);

    return {
      poolAddress: poolAddress.toBase58(),
      quoteProgressPercent: Math.min(100, Math.max(0, quoteProgress)),
      baseProgressPercent: Math.min(100, Math.max(0, baseProgress)),
      quoteReserve: poolState.poolState.quoteReserve.toString(),
      isGraduated: quoteProgress >= 100,
      rawConfigKey: poolState.poolState.config.toBase58(),
    };
  }

  /**
   * Builds the transaction to create an on-chain DBC Configuration Account
   */
  public async buildCreateConfigTx(
    payer: PublicKey,
    configKeypair: Keypair,
    config: CurveConfiguration
  ): Promise<Transaction> {
    const curveParams = buildMeteoraDbcConfigParams(config);
    const quoteMint = new PublicKey(config.quote.mint);

    const tx = await this.client.partner.createConfig({
      config: configKeypair.publicKey,
      feeClaimer: payer,
      leftoverReceiver: payer,
      payer,
      quoteMint,
      ...curveParams,
    });

    tx.feePayer = payer;
    // Sign with new config account keypair
    tx.partialSign(configKeypair);
    return tx;
  }

  /**
   * Builds the transaction to launch the Virtual Pool with token metadata
   */
  public async buildCreatePoolTx(
    payer: PublicKey,
    configKey: PublicKey,
    baseMintKeypair: Keypair,
    name: string,
    symbol: string,
    uri: string
  ): Promise<Transaction> {
    const tx = await this.client.creator.createPool({
      baseMint: baseMintKeypair.publicKey,
      config: configKey,
      name,
      symbol,
      uri,
      payer,
      poolCreator: payer,
    });

    tx.feePayer = payer;
    // Sign with baseMint keypair
    tx.partialSign(baseMintKeypair);
    return tx;
  }

  /**
   * Builds the transaction to trigger graduation into Meteora DAMM v2
   */
  public async buildMigrateToDammV2Tx(
    payer: PublicKey,
    poolAddress: PublicKey,
    dammConfig: PublicKey
  ): Promise<Transaction> {
    const { transaction, firstPositionNftKeypair, secondPositionNftKeypair } =
      await this.client.migration.migrateToDammV2({
        payer,
        pool: poolAddress,
        dammConfig,
      });
    transaction.feePayer = payer;
    transaction.partialSign(firstPositionNftKeypair, secondPositionNftKeypair);
    return transaction;
  }
}
