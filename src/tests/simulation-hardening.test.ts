import { describe, it, expect, beforeEach } from 'vitest';
import { compileCurve, CompiledCurve } from '../domain/curve/curve-builder';
import { CURVEFORGE_PRESETS } from '../domain/presets/preset-library';
import { SimulationEngine } from '../domain/simulation/simulation-engine';
import { computeQuoteForSegment } from '../domain/curve/curve-math';
import { CurveConfiguration } from '../domain/curve/curve-types';

describe('Rigorous Simulation Hardening Pass (TEST A - TEST I)', () => {
  let equityPreset: CurveConfiguration;
  let compiled: CompiledCurve;
  let engine: SimulationEngine;

  beforeEach(() => {
    const basePreset = CURVEFORGE_PRESETS.find((p) => p.id === 'equity-discovery')!;
    equityPreset = {
      ...basePreset,
      token: { ...basePreset.token },
      quote: { ...basePreset.quote },
      curve: { ...basePreset.curve, checkpoints: [...basePreset.curve.checkpoints], liquidityWeights: [...basePreset.curve.liquidityWeights] },
      fee: { ...basePreset.fee, baseFeeMode: 'Fixed', fixedFeeBps: 100 },
      migration: { ...basePreset.migration },
    };
    compiled = compileCurve(equityPreset);
    engine = new SimulationEngine(equityPreset, compiled);
  });

  // TEST A: Trade remains inside segment 1 (index 0)
  it('TEST A: Trade remains inside segment 1', () => {
    const seg0QuoteCapacity = Number(
      computeQuoteForSegment(
        compiled.liquidityPerSegment[0],
        compiled.sqrtPricesX64[0],
        compiled.sqrtPricesX64[1]
      )
    ) / 1e6;

    // Trade 1,000 USDC, which is far below seg0 capacity (~74,367 USDC)
    const quoteIn = 1000;
    expect(quoteIn).toBeLessThan(seg0QuoteCapacity);

    const result = engine.executeBuy(quoteIn, 1, 0);

    expect(result.type).toBe('BUY');
    expect(result.segmentsCrossed).toBe(0);
    expect(result.priceAfter).toBeGreaterThan(equityPreset.curve.startPrice);
    expect(result.priceAfter).toBeLessThan(equityPreset.curve.checkpoints[1]);
    expect(result.outputAmount).toBeGreaterThan(0);
    expect(result.feeAmount).toBeCloseTo(10, 2); // 1% of 1000 = 10 USDC
    expect(result.graduated).toBe(false);
  });

  // TEST B: Trade exactly reaches segment 1 boundary
  it('TEST B: Trade exactly reaches segment 1 boundary', () => {
    const seg0QuoteCapacityAtoms = computeQuoteForSegment(
      compiled.liquidityPerSegment[0],
      compiled.sqrtPricesX64[0],
      compiled.sqrtPricesX64[1]
    );
    // Because fee is 1% (100 bps), netQuote = grossQuote * 99 / 100
    // So grossQuote needed = (seg0QuoteCapacityAtoms * 10000) / 9900
    const grossQuoteNeededAtoms = (seg0QuoteCapacityAtoms * 10000n) / 9900n;
    const grossQuoteNeeded = Number(grossQuoteNeededAtoms) / 1e6;

    const result = engine.executeBuy(grossQuoteNeeded, 1, 0);

    // Should reach the boundary of segment 1 (price ~ 1.30)
    expect(result.priceAfter).toBeCloseTo(equityPreset.curve.checkpoints[1], 1);
    expect(result.segmentsCrossed).toBe(1);
    expect(result.cumulativeQuoteReserve).toBeCloseTo(Number(seg0QuoteCapacityAtoms) / 1e6, 0);
  });

  // TEST C: Trade crosses segment 1 -> 2
  it('TEST C: Trade crosses segment 1 -> 2', () => {
    // A trade of 100,000 USDC exceeds segment 0 (~74k USDC) and pushes into segment 1 ($1.30 - $2.20)
    const result = engine.executeBuy(100_000, 1, 0);

    expect(result.segmentsCrossed).toBe(1);
    expect(result.priceAfter).toBeGreaterThan(equityPreset.curve.checkpoints[1]);
    expect(result.priceAfter).toBeLessThan(equityPreset.curve.checkpoints[2]);
    expect(result.graduated).toBe(false);
  });

  // TEST D: Trade crosses segment 1 -> 2 -> 3
  it('TEST D: Trade crosses segment 1 -> 2 -> 3', () => {
    // 200,000 USDC crosses segments 0 and 1, entering segment 2 ($2.20 - $4.50)
    const result = engine.executeBuy(200_000, 1, 0);

    expect(result.segmentsCrossed).toBe(2);
    expect(result.priceAfter).toBeGreaterThan(equityPreset.curve.checkpoints[2]);
    expect(result.priceAfter).toBeLessThanOrEqual(equityPreset.curve.checkpoints[3]);
  });

  // TEST E: Trade exceeds configured curve (liquidity limit/migration stop)
  it('TEST E: Trade exceeds configured curve (liquidity limit/migration stop)', () => {
    // Target threshold is 250,000 USDC. Input 400,000 USDC.
    const result = engine.executeBuy(400_000, 1, 0);

    expect(result.graduated).toBe(true);
    expect(result.progressPercent).toBe(100);
    expect(result.priceAfter).toBeCloseTo(equityPreset.curve.migrationPrice, 1);
    // Cumulative reserve should have reached threshold (within integer rounding precision)
    expect(result.cumulativeQuoteReserve).toBeCloseTo(250_000, 0);
  });

  // TEST F: Reverse-direction trade (executeSell)
  it('TEST F: Reverse-direction trade (executeSell) restores price and quote liquidity', () => {
    // Step 1: Initial buy moves price up
    const buyResult = engine.executeBuy(10_000, 1, 0);
    expect(buyResult.priceAfter).toBeGreaterThan(buyResult.priceBefore);
    const tokensBought = buyResult.outputAmount;
    expect(tokensBought).toBeGreaterThan(0);

    // Step 2: Partial sell moves price back down
    const halfTokens = tokensBought / 2;
    const partialSell = engine.executeSell(halfTokens, 2, 0);
    expect(partialSell.type).toBe('SELL');
    expect(partialSell.priceAfter).toBeLessThan(buyResult.priceAfter);
    expect(partialSell.outputAmount).toBeGreaterThan(0);
    expect(partialSell.feeAmount).toBeGreaterThan(0);

    // Step 3: Complete sell of remaining tokens
    const remainingTokens = tokensBought - halfTokens;
    const finalSell = engine.executeSell(remainingTokens, 3, 0);
    expect(finalSell.priceAfter).toBeLessThan(partialSell.priceAfter);
    // Price should be restored very close to original start price (1.00)
    expect(finalSell.priceAfter).toBeCloseTo(equityPreset.curve.startPrice, 1);

    // Step 4: Selling when pool is back at base floor returns 0 output safely without crashing
    const floorSell = engine.executeSell(100, 4, 0);
    expect(floorSell.outputAmount).toBe(0);
    expect(floorSell.priceAfter).toBeCloseTo(equityPreset.curve.startPrice, 1);
  });

  // TEST G: Large trade (high slippage)
  it('TEST G: Large trade creates substantial price impact reflecting slippage', () => {
    const smallTrade = engine.executeBuy(100, 1, 0);
    engine.reset();

    const largeTrade = engine.executeBuy(150_000, 1, 0);

    // Small trade price impact should be minimal (< 1%)
    expect(smallTrade.priceImpactPercent).toBeLessThan(1);
    // Large trade price impact should be massive (> 50%)
    expect(largeTrade.priceImpactPercent).toBeGreaterThan(50);
    expect(largeTrade.effectivePrice).toBeGreaterThan(largeTrade.priceBefore);
  });

  // TEST H: Very small trade (micro swap)
  it('TEST H: Very small trade (micro swap) executes without underflow or NaN', () => {
    // Micro swap: 0.001 USDC (1000 atoms)
    const microTrade = engine.executeBuy(0.001, 1, 0);

    expect(Number.isNaN(microTrade.effectivePrice)).toBe(false);
    expect(Number.isNaN(microTrade.outputAmount)).toBe(false);
    expect(microTrade.outputAmount).toBeGreaterThan(0);
    expect(microTrade.priceAfter).toBeGreaterThanOrEqual(microTrade.priceBefore);
  });

  // TEST I: Non-integer decimal trade amounts
  it('TEST I: Non-integer decimal trade amounts scale correctly to atomic integers', () => {
    const fractionalQuote = 1234.567891;
    const result = engine.executeBuy(fractionalQuote, 1, 0);

    expect(Number.isNaN(result.outputAmount)).toBe(false);
    expect(Number.isNaN(result.priceAfter)).toBe(false);
    expect(result.inputAmount).toBe(fractionalQuote);
    expect(result.cumulativeQuoteReserve).toBeCloseTo(fractionalQuote * 0.99, 1);
  });
});
