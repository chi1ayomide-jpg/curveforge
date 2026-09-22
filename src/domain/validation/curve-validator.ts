import { CurveConfiguration } from '../curve/curve-types';
import { priceToSqrtPriceX64 } from '../curve/curve-math';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

// Official Meteora Sqrt Price bounds:
// Min: 4295048016
// Max: 79226673521066979257578248091
const METEORA_MIN_SQRT_PRICE = 4295048016n;
const METEORA_MAX_SQRT_PRICE = 79226673521066979257578248091n;

export function validateCurveConfiguration(config: CurveConfiguration): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Checkpoints count validation
  const cp = config.curve.checkpoints;
  if (!cp || cp.length < 2) {
    issues.push({
      field: 'checkpoints',
      message: 'At least 2 price checkpoints (start and migration price) are required.',
      severity: 'error',
    });
  } else if (cp.length > 17) {
    issues.push({
      field: 'checkpoints',
      message: `Meteora DBC supports a maximum of 16 segments (17 checkpoints). Current count: ${cp.length}.`,
      severity: 'error',
    });
  }

  // Checkpoints monotonic increase & bounds
  if (cp && cp.length >= 2) {
    for (let i = 0; i < cp.length; i++) {
      if (cp[i] <= 0) {
        issues.push({
          field: `checkpoints[${i}]`,
          message: `Price at checkpoint ${i} must be greater than zero.`,
          severity: 'error',
        });
      }

      if (i > 0 && cp[i] <= cp[i - 1]) {
        issues.push({
          field: `checkpoints[${i}]`,
          message: `Price at checkpoint ${i} (${cp[i]}) must be strictly greater than previous price (${cp[i - 1]}).`,
          severity: 'error',
        });
      }

      try {
        const sqrtX64 = priceToSqrtPriceX64(
          cp[i],
          config.token.tokenBaseDecimal,
          config.token.tokenQuoteDecimal
        );
        if (sqrtX64 < METEORA_MIN_SQRT_PRICE) {
          issues.push({
            field: `checkpoints[${i}]`,
            message: `Starting price yields a square-root price below Meteora program minimum (${METEORA_MIN_SQRT_PRICE.toString()}).`,
            severity: 'error',
          });
        }
        if (sqrtX64 > METEORA_MAX_SQRT_PRICE) {
          issues.push({
            field: `checkpoints[${i}]`,
            message: `Migration price yields a square-root price above Meteora program maximum.`,
            severity: 'error',
          });
        }
      } catch (e: any) {
        issues.push({
          field: `checkpoints[${i}]`,
          message: `Sqrt price conversion failed: ${e.message}`,
          severity: 'error',
        });
      }
    }
  }

  // Weights validation
  const weights = config.curve.liquidityWeights;
  if (cp && cp.length >= 2) {
    if (!weights || weights.length !== cp.length - 1) {
      issues.push({
        field: 'liquidityWeights',
        message: `Liquidity weights array length (${weights?.length || 0}) must equal segments count (${cp.length - 1}).`,
        severity: 'error',
      });
    } else {
      for (let i = 0; i < weights.length; i++) {
        if (weights[i] <= 0) {
          issues.push({
            field: `liquidityWeights[${i}]`,
            message: `Weight for segment ${i} must be positive integer (> 0).`,
            severity: 'error',
          });
        }
      }
    }
  }

  // Target migration quote threshold
  if (config.curve.targetMigrationQuoteThreshold <= 0n) {
    issues.push({
      field: 'targetMigrationQuoteThreshold',
      message: 'Graduation quote threshold must be greater than zero.',
      severity: 'error',
    });
  }

  // Fee bounds validation
  const fee = config.fee;
  if (fee.fixedFeeBps < 0 || fee.fixedFeeBps > 9900) {
    issues.push({
      field: 'fee.fixedFeeBps',
      message: 'Trading fee must be between 0 and 9900 bps (max 99%).',
      severity: 'error',
    });
  }

  if (fee.scheduler) {
    if (fee.scheduler.startingFeeBps < 0 || fee.scheduler.startingFeeBps > 9900) {
      issues.push({
        field: 'fee.scheduler.startingFeeBps',
        message: 'Starting fee must be between 0 and 9900 bps.',
        severity: 'error',
      });
    }
    if (fee.scheduler.endingFeeBps < 0 || fee.scheduler.endingFeeBps > 9900) {
      issues.push({
        field: 'fee.scheduler.endingFeeBps',
        message: 'Ending fee must be between 0 and 9900 bps.',
        severity: 'error',
      });
    }
    if (fee.scheduler.totalDurationSeconds <= 0) {
      issues.push({
        field: 'fee.scheduler.totalDurationSeconds',
        message: 'Fee decay duration must be positive.',
        severity: 'error',
      });
    }
  }

  // Fee splits
  if (fee.creatorTradingFeePercentage < 0 || fee.creatorTradingFeePercentage > 100) {
    issues.push({
      field: 'fee.creatorTradingFeePercentage',
      message: 'Creator trading fee percentage must be between 0% and 100%.',
      severity: 'error',
    });
  }

  // Supply bounds
  if (config.token.totalTokenSupply <= 0n) {
    issues.push({
      field: 'token.totalTokenSupply',
      message: 'Total token supply must be greater than zero.',
      severity: 'error',
    });
  }

  if (config.token.leftover >= config.token.totalTokenSupply) {
    issues.push({
      field: 'token.leftover',
      message: 'Leftover reserve must be strictly less than total token supply.',
      severity: 'error',
    });
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  return {
    isValid: !hasErrors,
    issues,
  };
}

export const validateCurve = validateCurveConfiguration;

