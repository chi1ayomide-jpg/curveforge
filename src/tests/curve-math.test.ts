import { describe, it, expect } from 'vitest';
import {
  priceToSqrtPriceX64,
  sqrtPriceX64ToPrice,
  computeQuoteForSegment,
  computeBaseForSegment,
  calculatePriceImpact,
  Q64,
} from '../domain/curve/curve-math';
import { compileCurve } from '../domain/curve/curve-builder';
import { CURVEFORGE_PRESETS } from '../domain/presets/preset-library';

describe('Curve Math & Piecewise Constant Product Formulas', () => {
  it('correctly converts price to Q64.64 sqrt price and back with high precision', () => {
    const testPrices = [0.00000005, 0.001, 1.0, 4.5, 100.0];
    const baseDecimals = 6;
    const quoteDecimals = 6;

    for (const p of testPrices) {
      const sqrtX64 = priceToSqrtPriceX64(p, baseDecimals, quoteDecimals);
      expect(sqrtX64).toBeGreaterThan(0n);
      const recovered = sqrtPriceX64ToPrice(sqrtX64, baseDecimals, quoteDecimals);
      // Tolerance within 0.01%
      expect(Math.abs(recovered - p) / p).toBeLessThan(0.0001);
    }
  });

  it('verifies that Δy and Δx obey constant product bounds across a segment', () => {
    const p1 = priceToSqrtPriceX64(1.0, 6, 6);
    const p2 = priceToSqrtPriceX64(2.0, 6, 6);
    const L = 1_000_000_000n * Q64;

    const quoteRequired = computeQuoteForSegment(L, p1, p2);
    const baseAvailable = computeBaseForSegment(L, p1, p2);

    expect(quoteRequired).toBeGreaterThan(0n);
    expect(baseAvailable).toBeGreaterThan(0n);

    // If upper price <= lower price, capacity is 0
    expect(computeQuoteForSegment(L, p2, p1)).toBe(0n);
    expect(computeBaseForSegment(L, p2, p1)).toBe(0n);
  });

  it('compiles all built-in CurveForge presets into valid piecewise segments', () => {
    for (const preset of CURVEFORGE_PRESETS) {
      const compiled = compileCurve(preset);
      expect(compiled.segments.length).toBe(preset.curve.liquidityWeights.length);
      expect(compiled.totalQuoteCapacity).toBeGreaterThan(0n);
      expect(compiled.totalBaseCapacity).toBeGreaterThan(0n);
      expect(compiled.startPrice).toBe(preset.curve.startPrice);
      expect(compiled.graduationPrice).toBe(preset.curve.migrationPrice);
    }
  });

  it('calculates price impact accurately', () => {
    expect(calculatePriceImpact(1.0, 1.05)).toBeCloseTo(5.0, 2);
    expect(calculatePriceImpact(2.0, 3.0)).toBeCloseTo(50.0, 2);
    expect(calculatePriceImpact(1.0, 0.95)).toBeCloseTo(-5.0, 2);
  });
});
