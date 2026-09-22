/**
 * CurveForge Mathematical Core
 * Implements exact piecewise constant-product AMM mechanics matching Meteora DBC.
 * Reference: https://docs.meteora.ag/core-products/dbc/formulas
 */

export const Q64 = 18446744073709551616n; // 2^64

/**
 * Converts a human readable price (quote tokens per 1 base token)
 * into a Q64.64 fixed-point square root price.
 */
export function priceToSqrtPriceX64(
  price: number,
  baseDecimals: number,
  quoteDecimals: number
): bigint {
  if (price <= 0) throw new Error('Price must be greater than zero');
  
  // Adjust price for token decimal differences:
  // on-chain price = (quoteAtoms / baseAtoms) = price * (10^quoteDecimals / 10^baseDecimals)
  const decimalFactor = Math.pow(10, quoteDecimals - baseDecimals);
  const adjustedPrice = price * decimalFactor;
  const sqrtP = Math.sqrt(adjustedPrice);
  
  // Multiply by 2^64
  // We use high-precision BigInt scaling
  const scale = 1_000_000_000_000n;
  const scaledSqrt = BigInt(Math.floor(sqrtP * 1_000_000_000_000));
  return (scaledSqrt * Q64) / scale;
}

/**
 * Converts a Q64.64 fixed-point square root price back to human readable price.
 */
export function sqrtPriceX64ToPrice(
  sqrtPriceX64: bigint,
  baseDecimals: number,
  quoteDecimals: number
): number {
  const scale = 1_000_000_000_000n;
  const scaled = (sqrtPriceX64 * scale) / Q64;
  const sqrtP = Number(scaled) / 1_000_000_000_000;
  const adjustedPrice = sqrtP * sqrtP;
  const decimalFactor = Math.pow(10, quoteDecimals - baseDecimals);
  return adjustedPrice / decimalFactor;
}

/**
 * Calculates the quote token capacity required to traverse a segment
 * Formula: Δy = L * (sqrt(P_upper) - sqrt(P_lower)) / 2^64
 */
export function computeQuoteForSegment(
  liquidity: bigint,
  sqrtPriceLower: bigint,
  sqrtPriceUpper: bigint
): bigint {
  if (sqrtPriceUpper <= sqrtPriceLower) return 0n;
  const deltaSqrt = sqrtPriceUpper - sqrtPriceLower;
  return (liquidity * deltaSqrt) / Q64;
}

/**
 * Calculates the base token capacity available across a segment
 * Formula: Δx = L * (sqrt(P_upper) - sqrt(P_lower)) / (sqrt(P_upper) * sqrt(P_lower)) * 2^64
 */
export function computeBaseForSegment(
  liquidity: bigint,
  sqrtPriceLower: bigint,
  sqrtPriceUpper: bigint
): bigint {
  if (sqrtPriceUpper <= sqrtPriceLower) return 0n;
  const deltaSqrt = sqrtPriceUpper - sqrtPriceLower;
  const denominator = (sqrtPriceUpper * sqrtPriceLower) / Q64;
  if (denominator === 0n) return 0n;
  return (liquidity * deltaSqrt) / denominator;
}

/**
 * Derives the base virtual liquidity L for each segment given total quote threshold
 * and relative weights.
 */
export function deriveSegmentLiquidity(
  targetTotalQuoteAtoms: bigint,
  checkpoints: bigint[],
  weights: number[]
): bigint[] {
  if (checkpoints.length < 2) throw new Error('At least 2 price checkpoints required');
  if (weights.length !== checkpoints.length - 1) {
    throw new Error('Weights count must equal checkpoints count - 1');
  }

  // Calculate sum of weighted sqrt price deltas
  let sumWeightedDelta = 0n;

  for (let i = 0; i < weights.length; i++) {
    const delta = checkpoints[i + 1] - checkpoints[i];
    if (delta <= 0n) {
      throw new Error('Checkpoints must be strictly monotonic');
    }
    sumWeightedDelta += delta * BigInt(weights[i]);
  }

  if (sumWeightedDelta === 0n) {
    throw new Error('Invalid curve checkpoints or zero price range');
  }

  // Base liquidity scale factor L_base = (targetTotalQuote * Q64) / sumWeightedDelta
  const baseL = (targetTotalQuoteAtoms * Q64) / sumWeightedDelta;

  return weights.map((w) => baseL * BigInt(w));
}

/**
 * Calculates current price after adding delta quote atoms into a segment
 * Formula: sqrt(P_new) = sqrt(P_current) + (Δy * 2^64) / L
 */
export function addQuoteToSegment(
  currentSqrtPrice: bigint,
  liquidity: bigint,
  quoteIn: bigint
): bigint {
  if (liquidity === 0n) return currentSqrtPrice;
  const deltaSqrt = (quoteIn * Q64) / liquidity;
  return currentSqrtPrice + deltaSqrt;
}

/**
 * Calculates base tokens received when moving from sqrt(P_current) to sqrt(P_new)
 */
export function getBaseOutputForQuoteIn(
  currentSqrtPrice: bigint,
  newSqrtPrice: bigint,
  liquidity: bigint
): bigint {
  return computeBaseForSegment(liquidity, currentSqrtPrice, newSqrtPrice);
}

/**
 * Calculates price impact percentage
 */
export function calculatePriceImpact(initialPrice: number, executionPrice: number): number {
  if (initialPrice <= 0) return 0;
  return ((executionPrice - initialPrice) / initialPrice) * 100;
}
