import {
  CurveConfiguration,
  CurveSegment,
} from './curve-types';
import {
  priceToSqrtPriceX64,
  sqrtPriceX64ToPrice,
  deriveSegmentLiquidity,
  computeQuoteForSegment,
  computeBaseForSegment,
} from './curve-math';

export interface CompiledCurve {
  segments: CurveSegment[];
  totalQuoteCapacity: bigint;
  totalBaseCapacity: bigint;
  startPrice: number;
  graduationPrice: number;
  checkpoints: number[];
  sqrtPricesX64: bigint[];
  liquidityPerSegment: bigint[];
}

/**
 * Compiles a CurveConfiguration into fully derived segments, capacities,
 * and mathematical bounds.
 */
export function compileCurve(config: CurveConfiguration): CompiledCurve {
  const { curve, token } = config;
  const { checkpoints, liquidityWeights, targetMigrationQuoteThreshold } = curve;

  if (checkpoints.length < 2) {
    throw new Error('At least two checkpoints (start and migration price) are required');
  }
  if (checkpoints.length > 17) {
    throw new Error('Meteora DBC supports a maximum of 16 segments (17 checkpoints)');
  }

  // Ensure prices strictly increase
  for (let i = 1; i < checkpoints.length; i++) {
    if (checkpoints[i] <= checkpoints[i - 1]) {
      throw new Error(`Checkpoint prices must strictly increase. Checkpoint ${i} (${checkpoints[i]}) <= ${checkpoints[i - 1]}`);
    }
  }

  // Convert checkpoints to Q64.64 sqrt prices
  const sqrtPricesX64 = checkpoints.map((p) =>
    priceToSqrtPriceX64(p, token.tokenBaseDecimal, token.tokenQuoteDecimal)
  );

  // Derive virtual liquidity for each segment
  const liquidityPerSegment = deriveSegmentLiquidity(
    targetMigrationQuoteThreshold,
    sqrtPricesX64,
    liquidityWeights
  );

  const segments: CurveSegment[] = [];
  let totalQuote = 0n;
  let totalBase = 0n;

  for (let i = 0; i < liquidityWeights.length; i++) {
    const pLower = sqrtPricesX64[i];
    const pUpper = sqrtPricesX64[i + 1];
    const L = liquidityPerSegment[i];

    const quoteCap = computeQuoteForSegment(L, pLower, pUpper);
    const baseCap = computeBaseForSegment(L, pLower, pUpper);

    totalQuote += quoteCap;
    totalBase += baseCap;

    segments.push({
      index: i,
      startPrice: checkpoints[i],
      endPrice: checkpoints[i + 1],
      weight: liquidityWeights[i],
      sqrtPriceLower: pLower,
      sqrtPriceUpper: pUpper,
      baseCapacity: baseCap,
      quoteCapacity: quoteCap,
    });
  }

  return {
    segments,
    totalQuoteCapacity: totalQuote,
    totalBaseCapacity: totalBase,
    startPrice: checkpoints[0],
    graduationPrice: checkpoints[checkpoints.length - 1],
    checkpoints,
    sqrtPricesX64,
    liquidityPerSegment,
  };
}

/**
 * Samples N evenly spaced curve coordinates (Quote Invested vs Current Price)
 * for high-performance canvas/SVG charting.
 */
export interface CurveCoordinate {
  quoteInvested: number; // Quote tokens
  price: number;         // Price in quote
  baseCirculating: number; // Base tokens sold
  progressPercent: number; // 0 - 100%
  segmentIndex: number;
}

export function sampleCurveCoordinates(
  compiled: CompiledCurve,
  baseDecimals: number,
  quoteDecimals: number,
  stepsPerSegment = 20
): CurveCoordinate[] {
  const points: CurveCoordinate[] = [];
  const baseScale = Number(10n ** BigInt(baseDecimals));
  const quoteScale = Number(10n ** BigInt(quoteDecimals));

  let accumulatedQuote = 0n;
  let accumulatedBase = 0n;
  const totalQuoteCap = Number(compiled.totalQuoteCapacity) / quoteScale;

  // Add initial point
  points.push({
    quoteInvested: 0,
    price: compiled.startPrice,
    baseCirculating: 0,
    progressPercent: 0,
    segmentIndex: 0,
  });

  for (const segment of compiled.segments) {
    const deltaSqrt = segment.sqrtPriceUpper - segment.sqrtPriceLower;
    const stepSize = deltaSqrt / BigInt(stepsPerSegment);

    for (let s = 1; s <= stepsPerSegment; s++) {
      const currentSqrt = segment.sqrtPriceLower + stepSize * BigInt(s);
      const segQuote = computeQuoteForSegment(segment.weight > 0 ? compiled.liquidityPerSegment[segment.index] : 0n, segment.sqrtPriceLower, currentSqrt);
      const segBase = computeBaseForSegment(segment.weight > 0 ? compiled.liquidityPerSegment[segment.index] : 0n, segment.sqrtPriceLower, currentSqrt);

      const curQuoteTotal = Number(accumulatedQuote + segQuote) / quoteScale;
      const curBaseTotal = Number(accumulatedBase + segBase) / baseScale;
      const currentPrice = sqrtPriceX64ToPrice(currentSqrt, baseDecimals, quoteDecimals);

      points.push({
        quoteInvested: curQuoteTotal,
        price: currentPrice,
        baseCirculating: curBaseTotal,
        progressPercent: totalQuoteCap > 0 ? Math.min(100, (curQuoteTotal / totalQuoteCap) * 100) : 0,
        segmentIndex: segment.index,
      });
    }

    accumulatedQuote += segment.quoteCapacity;
    accumulatedBase += segment.baseCapacity;
  }

  return points;
}
