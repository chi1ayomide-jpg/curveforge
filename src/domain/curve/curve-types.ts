/**
 * CurveForge Domain Types for Meteora Dynamic Bonding Curve (DBC)
 */

export type QuoteMintSymbol = 'SOL' | 'USDC' | 'USDG';

export interface QuoteTokenInfo {
  symbol: QuoteMintSymbol;
  name: string;
  mint: string; // Solana PublicKey base58
  decimals: number;
  icon: string;
  isNative: boolean;
}

export const SUPPORTED_QUOTE_TOKENS: Record<QuoteMintSymbol, QuoteTokenInfo> = {
  SOL: {
    symbol: 'SOL',
    name: 'Native SOL',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    icon: '◎',
    isNative: true,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    icon: '$',
    isNative: false,
  },
  USDG: {
    symbol: 'USDG',
    name: 'Global Dollar',
    mint: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
    decimals: 6,
    icon: '$G',
    isNative: false,
  },
};

export type BaseFeeModeType =
  | 'Fixed'
  | 'FeeSchedulerLinear'
  | 'FeeSchedulerExponential'
  | 'RateLimiter';

export interface FeeSchedulerConfig {
  startingFeeBps: number;
  endingFeeBps: number;
  numberOfPeriod: number;
  totalDurationSeconds: number;
}

export interface DynamicFeeConfig {
  enabled: boolean;
  variableFeeControl?: number;
  binStep?: number;
}

export interface CurveSegment {
  index: number;
  startPrice: number; // Quote units per 1 Base token
  endPrice: number;   // Quote units per 1 Base token
  weight: number;     // Virtual liquidity weight factor
  sqrtPriceLower: bigint; // Q64.64 or raw square-root representation
  sqrtPriceUpper: bigint;
  baseCapacity: bigint;   // Base token atoms available in this segment
  quoteCapacity: bigint;  // Quote token atoms required to cross this segment
}

export interface CurveConfiguration {
  id: string;
  name: string;
  symbol: string;
  description: string;
  category: 'equity' | 'rwa' | 'ai_agent' | 'community' | 'stable' | 'custom';
  token: {
    tokenType: 'SPLToken' | 'Token2022';
    tokenBaseDecimal: number;  // Default: 6
    tokenQuoteDecimal: number; // Default: 9 for SOL, 6 for USDC
    totalTokenSupply: bigint;  // Default: 1,000,000,000 atoms
    leftover: bigint;          // Retained base tokens post-graduation
  };
  quote: QuoteTokenInfo;
  curve: {
    targetMigrationQuoteThreshold: bigint; // Total quote atoms to graduate
    startPrice: number;                    // Initial token price in quote tokens
    migrationPrice: number;                // Final token price upon graduation
    checkpoints: number[];                 // Prices at checkpoint intervals (length = segments + 1)
    liquidityWeights: number[];            // Weights per segment (length = checkpoints.length - 1)
  };
  fee: {
    baseFeeMode: BaseFeeModeType;
    fixedFeeBps: number;                   // e.g. 100 for 1%
    scheduler?: FeeSchedulerConfig;
    dynamicFee: DynamicFeeConfig;
    collectFeeMode: 'QuoteToken' | 'BaseToken';
    creatorTradingFeePercentage: number;   // 0 - 100% of creator share
    poolCreationFeeSol: number;            // e.g. 0.05 SOL
  };
  migration: {
    migrationOption: 'MET_DAMM_V2';
    migrationFeePercentage: number;        // e.g. 5%
    creatorMigrationFeePercentage: number; // e.g. 50%
    partnerPermanentLockedLiquidityPercentage: number; // e.g. 100%
    creatorPermanentLockedLiquidityPercentage: number; // e.g. 0%
  };
}
