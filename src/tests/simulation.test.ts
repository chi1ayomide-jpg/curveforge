import { describe, it, expect } from 'vitest';
import { compileCurve } from '../domain/curve/curve-builder';
import { CURVEFORGE_PRESETS } from '../domain/presets/preset-library';
import { SimulationEngine } from '../domain/simulation/simulation-engine';
import { SCENARIOS } from '../domain/simulation/scenario-runner';

describe('Deterministic Simulation Engine', () => {
  const equityPreset = CURVEFORGE_PRESETS.find((p) => p.id === 'equity-discovery')!;
  const compiled = compileCurve(equityPreset);

  it('executes a single buy trade deterministically', () => {
    const engine = new SimulationEngine(equityPreset, compiled);
    const result1 = engine.executeBuy(1000, 1, 0);

    engine.reset();
    const result2 = engine.executeBuy(1000, 1, 0);

    expect(result1.inputAmount).toBe(1000);
    expect(result1.priceAfter).toBeGreaterThan(result1.priceBefore);
    expect(result1.outputAmount).toBe(result2.outputAmount);
    expect(result1.priceAfter).toBe(result2.priceAfter);
    expect(result1.feeAmount).toBe(result2.feeAmount);
  });

  it('correctly crosses multiple segments when a large buy order is executed', () => {
    const engine = new SimulationEngine(equityPreset, compiled);
    // Submit a 120,000 USDC buy which spans segments (segment 0 capacity is ~74,367 USDC)
    const result = engine.executeBuy(120000, 1, 0);

    expect(result.segmentsCrossed).toBeGreaterThan(0);
    expect(result.priceAfter).toBeGreaterThan(equityPreset.curve.startPrice);
    expect(result.progressPercent).toBeGreaterThan(15);
  });

  it('simulates the Graduation Rush scenario and reaches graduation threshold', () => {
    const engine = new SimulationEngine(equityPreset, compiled);
    const quoteThreshold = Number(equityPreset.curve.targetMigrationQuoteThreshold) / 1e6;
    const trades = SCENARIOS.GRADUATION_RUSH.generateTrades(quoteThreshold);

    const simResult = engine.runSimulation(trades);

    expect(simResult.isGraduated).toBe(true);
    expect(simResult.graduationTradeIndex).not.toBeNull();
    expect(simResult.finalProgressPercent).toBe(100);
    expect(simResult.finalPrice).toBeCloseTo(equityPreset.curve.migrationPrice, 1);
  });

  it('verifies that fee scheduler decays fees over time', () => {
    const engine = new SimulationEngine(equityPreset, compiled);

    // Trade at t = 0 (high initial fee, 5%)
    const tradeEarly = engine.executeBuy(100, 1, 0);
    engine.reset();

    // Trade at t = 3600 (decayed fee, 0.3%)
    const tradeLate = engine.executeBuy(100, 1, 3600);

    expect(tradeEarly.feeAmount).toBeGreaterThan(tradeLate.feeAmount);
    expect(tradeLate.feeAmount).toBeCloseTo(100 * 0.003, 3);
  });
});
