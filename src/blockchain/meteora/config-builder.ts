import {
  ActivationType,
  BaseFeeMode,
  buildCurveWithCustomSqrtPrices,
  CollectFeeMode,
  createSqrtPrices,
  DammV2BaseFeeMode,
  DammV2DynamicFeeMode,
  MigratedCollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenDecimal,
  TokenType,
  TokenAuthorityOption,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { CurveConfiguration } from '../../domain/curve/curve-types';

export function toMeteoraTokenDecimal(dec: number): TokenDecimal {
  if (dec === 6) return TokenDecimal.SIX;
  if (dec === 9) return TokenDecimal.NINE;
  return TokenDecimal.SIX;
}

export function buildMeteoraDbcConfigParams(config: CurveConfiguration) {
  const baseDec = toMeteoraTokenDecimal(config.token.tokenBaseDecimal);
  const quoteDec = toMeteoraTokenDecimal(config.token.tokenQuoteDecimal);

  // Convert checkpoint prices to sqrtPrices using SDK helper
  const sqrtPrices = createSqrtPrices(
    config.curve.checkpoints,
    baseDec,
    quoteDec
  );

  // Map fee mode
  let baseFeeMode = BaseFeeMode.FeeSchedulerLinear;
  if (config.fee.baseFeeMode === 'FeeSchedulerExponential') {
    baseFeeMode = BaseFeeMode.FeeSchedulerExponential;
  } else if (config.fee.baseFeeMode === 'RateLimiter') {
    baseFeeMode = BaseFeeMode.RateLimiter;
  }

  const baseFeeParams: any = {
    baseFeeMode,
  };

  if (config.fee.scheduler && config.fee.baseFeeMode !== 'Fixed') {
    baseFeeParams.feeSchedulerParam = {
      startingFeeBps: config.fee.scheduler.startingFeeBps,
      endingFeeBps: config.fee.scheduler.endingFeeBps,
      numberOfPeriod: config.fee.scheduler.numberOfPeriod,
      totalDuration: config.fee.scheduler.totalDurationSeconds,
    };
  } else {
    // Fixed fee representation in Meteora DBC SDK (must be 0 when startingFee == endingFee)
    baseFeeParams.feeSchedulerParam = {
      startingFeeBps: config.fee.fixedFeeBps,
      endingFeeBps: config.fee.fixedFeeBps,
      numberOfPeriod: 0,
      totalDuration: 0,
    };
  }

  const curveConfig = buildCurveWithCustomSqrtPrices({
    token: {
      tokenType: config.token.tokenType === 'Token2022' ? TokenType.Token2022 : TokenType.SPLToken,
      tokenBaseDecimal: baseDec,
      tokenQuoteDecimal: quoteDec,
      tokenAuthorityOption: TokenAuthorityOption.PartnerUpdateAuthority,
      totalTokenSupply: Number(config.token.totalTokenSupply) / Math.pow(10, config.token.tokenBaseDecimal),
      leftover: Math.max(100, Number(config.token.leftover) / Math.pow(10, config.token.tokenBaseDecimal)),
    },
    fee: {
      baseFeeParams,
      dynamicFeeEnabled: config.fee.dynamicFee.enabled,
      collectFeeMode: config.fee.collectFeeMode === 'QuoteToken' ? CollectFeeMode.QuoteToken : CollectFeeMode.OutputToken,
      creatorTradingFeePercentage: config.fee.creatorTradingFeePercentage,
      poolCreationFee: config.fee.poolCreationFeeSol,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.Customizable,
      migrationFee: {
        feePercentage: config.migration.migrationFeePercentage,
        creatorFeePercentage: config.migration.creatorMigrationFeePercentage,
      },
      migratedPoolFee: {
        collectFeeMode: MigratedCollectFeeMode.QuoteToken,
        dynamicFee: DammV2DynamicFeeMode.Enabled,
        poolFeeBps: 100,
        baseFeeMode: DammV2BaseFeeMode.FeeTimeSchedulerLinear,
      },
    },
    liquidityDistribution: {
      partnerLiquidityPercentage: 0,
      partnerPermanentLockedLiquidityPercentage: config.migration.partnerPermanentLockedLiquidityPercentage,
      creatorLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: config.migration.creatorPermanentLockedLiquidityPercentage,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
    sqrtPrices,
    liquidityWeights: config.curve.liquidityWeights,
  });

  return curveConfig;
}

export function generateMeteoraSdkScript(config: CurveConfiguration): string {
  return `import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { 
  DynamicBondingCurveClient, 
  buildCurveWithCustomSqrtPrices, 
  createSqrtPrices,
  TokenDecimal,
  TokenType,
  BaseFeeMode,
  MigrationOption,
  MigrationFeeOption
} from '@meteora-ag/dynamic-bonding-curve-sdk';

// Meteora DBC Program ID: dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN
async function main() {
  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  const payer = Keypair.fromSecretKey(/* Uint8Array from payer keypair */);
  const client = DynamicBondingCurveClient.create(connection, 'confirmed');

  const baseDec = ${config.token.tokenBaseDecimal === 9 ? 'TokenDecimal.NINE' : 'TokenDecimal.SIX'};
  const quoteDec = ${config.token.tokenQuoteDecimal === 9 ? 'TokenDecimal.NINE' : 'TokenDecimal.SIX'};
  const configKeypair = Keypair.generate();

  const sqrtPrices = createSqrtPrices(
    ${JSON.stringify(config.curve.checkpoints)},
    baseDec,
    quoteDec
  );

  const curveConfig = buildCurveWithCustomSqrtPrices({
    token: {
      tokenType: TokenType.${config.token.tokenType},
      tokenBaseDecimal: baseDec,
      tokenQuoteDecimal: quoteDec,
      totalTokenSupply: ${Number(config.token.totalTokenSupply) / Math.pow(10, config.token.tokenBaseDecimal)},
      leftover: ${Math.max(100, Number(config.token.leftover) / Math.pow(10, config.token.tokenBaseDecimal))},
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.${config.fee.baseFeeMode === 'FeeSchedulerExponential' ? 'FeeSchedulerExponential' : 'FeeSchedulerLinear'},
        feeSchedulerParam: {
          startingFeeBps: ${config.fee.baseFeeMode !== 'Fixed' && config.fee.scheduler ? config.fee.scheduler.startingFeeBps : config.fee.fixedFeeBps},
          endingFeeBps: ${config.fee.baseFeeMode !== 'Fixed' && config.fee.scheduler ? config.fee.scheduler.endingFeeBps : config.fee.fixedFeeBps},
          numberOfPeriod: ${config.fee.baseFeeMode !== 'Fixed' && config.fee.scheduler ? config.fee.scheduler.numberOfPeriod : 0},
          totalDuration: ${config.fee.baseFeeMode !== 'Fixed' && config.fee.scheduler ? config.fee.scheduler.totalDurationSeconds : 0},
        },
      },
      dynamicFeeEnabled: ${config.fee.dynamicFee.enabled},
      creatorTradingFeePercentage: ${config.fee.creatorTradingFeePercentage},
      poolCreationFee: ${config.fee.poolCreationFeeSol},
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.Customizable,
      migrationFee: {
        feePercentage: ${config.migration.migrationFeePercentage},
        creatorFeePercentage: ${config.migration.creatorMigrationFeePercentage},
      },
    },
    liquidityDistribution: {
      partnerPermanentLockedLiquidityPercentage: ${config.migration.partnerPermanentLockedLiquidityPercentage},
      creatorPermanentLockedLiquidityPercentage: ${config.migration.creatorPermanentLockedLiquidityPercentage},
    },
    sqrtPrices,
    liquidityWeights: ${JSON.stringify(config.curve.liquidityWeights)},
  });

  console.log('Sending createConfig transaction to Meteora DBC...');
  const tx = await client.partner.createConfig({
    config: configKeypair.publicKey,
    payer: payer.publicKey,
    feeClaimer: payer.publicKey,
    leftoverReceiver: payer.publicKey,
    quoteMint: new PublicKey('${config.quote.mint}'),
    ...curveConfig,
  });

  tx.partialSign(configKeypair);
  const txSig = await connection.sendTransaction(tx, [payer, configKeypair]);
  console.log('Config account successfully created. Tx:', txSig);
  console.log('Config Public Key:', configKeypair.publicKey.toBase58());
}

main().catch(console.error);
`;
}

