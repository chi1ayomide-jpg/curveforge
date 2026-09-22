import { CurveConfiguration, SUPPORTED_QUOTE_TOKENS } from '../curve/curve-types';

export const CURVEFORGE_PRESETS: CurveConfiguration[] = [
  {
    id: 'equity-discovery',
    name: 'Tokenized Equity Discovery',
    symbol: 'xEQUITY',
    description: 'Reference preset for tokenized private assets and equity shares. Features a wide initial discovery floor with a steep cap-table protection segment and exponential fee decay.',
    category: 'equity',
    token: {
      tokenType: 'SPLToken',
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      totalTokenSupply: 10_000_000_000_000n, // 10,000,000 shares
      leftover: 0n,
    },
    quote: SUPPORTED_QUOTE_TOKENS.USDC,
    curve: {
      targetMigrationQuoteThreshold: 250_000_000_000n, // $250,000 USDC graduation
      startPrice: 1.0,  // $1.00
      migrationPrice: 4.5, // $4.50
      checkpoints: [1.0, 1.3, 2.2, 4.5],
      liquidityWeights: [4, 2, 1], // Deep initial floor, higher sensitivity near top
    },
    fee: {
      baseFeeMode: 'FeeSchedulerExponential',
      fixedFeeBps: 100,
      scheduler: {
        startingFeeBps: 500, // 5% initial fee decay
        endingFeeBps: 30,    // Decays to 0.30%
        numberOfPeriod: 60,
        totalDurationSeconds: 3600, // 1 hour decay
      },
      dynamicFee: { enabled: true },
      collectFeeMode: 'QuoteToken',
      creatorTradingFeePercentage: 30,
      poolCreationFeeSol: 0.05,
    },
    migration: {
      migrationOption: 'MET_DAMM_V2',
      migrationFeePercentage: 2,
      creatorMigrationFeePercentage: 50,
      partnerPermanentLockedLiquidityPercentage: 100,
      creatorPermanentLockedLiquidityPercentage: 0,
    },
  },
  {
    id: 'rwa-institutional-depth',
    name: 'RWA High-Depth Corridor',
    symbol: 'xRWA',
    description: 'Reference preset for Real World Assets and treasury instruments. Implements a high-density liquidity corridor designed to reduce slippage for large-order allocations.',
    category: 'rwa',
    token: {
      tokenType: 'SPLToken',
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      totalTokenSupply: 50_000_000_000_000n,
      leftover: 0n,
    },
    quote: SUPPORTED_QUOTE_TOKENS.USDC,
    curve: {
      targetMigrationQuoteThreshold: 500_000_000_000n, // $500,000 USDC
      startPrice: 0.98,
      migrationPrice: 1.05,
      checkpoints: [0.98, 1.00, 1.02, 1.05],
      liquidityWeights: [2, 10, 3], // Concentrated liquidity centered in $1.00 - $1.02
    },
    fee: {
      baseFeeMode: 'Fixed',
      fixedFeeBps: 20, // 0.20% fixed fee
      dynamicFee: { enabled: false },
      collectFeeMode: 'QuoteToken',
      creatorTradingFeePercentage: 50,
      poolCreationFeeSol: 0.05,
    },
    migration: {
      migrationOption: 'MET_DAMM_V2',
      migrationFeePercentage: 1,
      creatorMigrationFeePercentage: 50,
      partnerPermanentLockedLiquidityPercentage: 100,
      creatorPermanentLockedLiquidityPercentage: 0,
    },
  },
  {
    id: 'ai-agent-utility',
    name: 'Autonomous AI Agent Utility',
    symbol: 'AIBOT',
    description: 'Reference preset for autonomous AI agent infrastructure tokens. Features creator fee streaming to continuously fund inference API compute credits and a dynamic volatility accumulator.',
    category: 'ai_agent',
    token: {
      tokenType: 'SPLToken',
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 9,
      totalTokenSupply: 1_000_000_000_000_000n, // 1B tokens
      leftover: 1_000_000n,
    },
    quote: SUPPORTED_QUOTE_TOKENS.SOL,
    curve: {
      targetMigrationQuoteThreshold: 85_000_000_000n, // 85 SOL
      startPrice: 0.00000003,
      migrationPrice: 0.00000025,
      checkpoints: [0.00000003, 0.00000007, 0.00000014, 0.00000025],
      liquidityWeights: [1, 2, 3], // Progressive price acceleration
    },
    fee: {
      baseFeeMode: 'FeeSchedulerLinear',
      fixedFeeBps: 100,
      scheduler: {
        startingFeeBps: 300, // 3%
        endingFeeBps: 100,   // 1%
        numberOfPeriod: 30,
        totalDurationSeconds: 1800,
      },
      dynamicFee: { enabled: true },
      collectFeeMode: 'QuoteToken',
      creatorTradingFeePercentage: 80, // 80% fee stream to AI agent wallet
      poolCreationFeeSol: 0.05,
    },
    migration: {
      migrationOption: 'MET_DAMM_V2',
      migrationFeePercentage: 5,
      creatorMigrationFeePercentage: 70,
      partnerPermanentLockedLiquidityPercentage: 100,
      creatorPermanentLockedLiquidityPercentage: 0,
    },
  },
  {
    id: 'exponential-fair-launch',
    name: 'Exponential Fair Launch',
    symbol: 'FORGE',
    description: 'Reference multi-tier bonding curve with 4 progressive segments rewarding early community participants while scaling liquidity depth approaching migration.',
    category: 'community',
    token: {
      tokenType: 'SPLToken',
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 9,
      totalTokenSupply: 1_000_000_000_000_000n,
      leftover: 0n,
    },
    quote: SUPPORTED_QUOTE_TOKENS.SOL,
    curve: {
      targetMigrationQuoteThreshold: 100_000_000_000n, // 100 SOL
      startPrice: 0.00000002,
      migrationPrice: 0.00000035,
      checkpoints: [0.00000002, 0.00000005, 0.00000010, 0.00000020, 0.00000035],
      liquidityWeights: [2, 2, 1, 1],
    },
    fee: {
      baseFeeMode: 'Fixed',
      fixedFeeBps: 100, // 1%
      dynamicFee: { enabled: true },
      collectFeeMode: 'QuoteToken',
      creatorTradingFeePercentage: 50,
      poolCreationFeeSol: 0.05,
    },
    migration: {
      migrationOption: 'MET_DAMM_V2',
      migrationFeePercentage: 3,
      creatorMigrationFeePercentage: 50,
      partnerPermanentLockedLiquidityPercentage: 100,
      creatorPermanentLockedLiquidityPercentage: 0,
    },
  },
  {
    id: 'defi-liquidity-bootstrap',
    name: 'DeFi Protocol Bootstrap',
    symbol: 'PROTO',
    description: 'Reference architecture for protocol governance and utility tokens. Features deep early buy-side absorption transitioning to higher price discovery sensitivity approaching DAMM v2 migration.',
    category: 'custom',
    token: {
      tokenType: 'SPLToken',
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 6,
      totalTokenSupply: 100_000_000_000_000n, // 100,000,000 tokens
      leftover: 0n,
    },
    quote: SUPPORTED_QUOTE_TOKENS.USDC,
    curve: {
      targetMigrationQuoteThreshold: 150_000_000_000n, // 150,000 USDC
      startPrice: 0.005,
      migrationPrice: 0.04,
      checkpoints: [0.005, 0.012, 0.024, 0.04],
      liquidityWeights: [3, 2, 1],
    },
    fee: {
      baseFeeMode: 'FeeSchedulerLinear',
      fixedFeeBps: 50,
      scheduler: {
        startingFeeBps: 200,
        endingFeeBps: 50,
        numberOfPeriod: 20,
        totalDurationSeconds: 1200,
      },
      dynamicFee: { enabled: true },
      collectFeeMode: 'QuoteToken',
      creatorTradingFeePercentage: 40,
      poolCreationFeeSol: 0.05,
    },
    migration: {
      migrationOption: 'MET_DAMM_V2',
      migrationFeePercentage: 2,
      creatorMigrationFeePercentage: 50,
      partnerPermanentLockedLiquidityPercentage: 100,
      creatorPermanentLockedLiquidityPercentage: 0,
    },
  },
  {
    id: 'constant-product-classic',
    name: 'Constant Product Benchmark',
    symbol: 'CPAMM',
    description: 'Reference single-segment pure constant-product curve ($x \\cdot y = k$). Provides a baseline benchmark for standard token distribution.',
    category: 'custom',
    token: {
      tokenType: 'SPLToken',
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 9,
      totalTokenSupply: 1_000_000_000_000_000n,
      leftover: 0n,
    },
    quote: SUPPORTED_QUOTE_TOKENS.SOL,
    curve: {
      targetMigrationQuoteThreshold: 75_000_000_000n, // 75 SOL
      startPrice: 0.00000005,
      migrationPrice: 0.00000025,
      checkpoints: [0.00000005, 0.00000025],
      liquidityWeights: [1],
    },
    fee: {
      baseFeeMode: 'Fixed',
      fixedFeeBps: 100,
      dynamicFee: { enabled: false },
      collectFeeMode: 'QuoteToken',
      creatorTradingFeePercentage: 50,
      poolCreationFeeSol: 0.05,
    },
    migration: {
      migrationOption: 'MET_DAMM_V2',
      migrationFeePercentage: 0,
      creatorMigrationFeePercentage: 0,
      partnerPermanentLockedLiquidityPercentage: 100,
      creatorPermanentLockedLiquidityPercentage: 0,
    },
  },
];

export const PRESETS = CURVEFORGE_PRESETS;
export const TOKENIZED_EQUITY_PRESET = CURVEFORGE_PRESETS[0];

