import { describe, it, expect } from 'vitest';
import { validateCurveConfiguration } from '../domain/validation/curve-validator';
import { CURVEFORGE_PRESETS } from '../domain/presets/preset-library';

describe('Curve Configuration Validator', () => {
  it('validates all built-in presets successfully', () => {
    for (const preset of CURVEFORGE_PRESETS) {
      const result = validateCurveConfiguration(preset);
      expect(result.isValid).toBe(true);
      expect(result.issues.filter((i) => i.severity === 'error').length).toBe(0);
    }
  });

  it('rejects non-monotonic checkpoint prices', () => {
    const invalid = structuredClone(CURVEFORGE_PRESETS[0]);
    // Make price decrease: 1.0 -> 0.8
    invalid.curve.checkpoints = [1.0, 0.8, 2.0, 4.0];
    const result = validateCurveConfiguration(invalid);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('strictly greater'))).toBe(true);
  });

  it('rejects configurations exceeding Meteora 16 segments limit', () => {
    const invalid = structuredClone(CURVEFORGE_PRESETS[0]);
    // 18 checkpoints = 17 segments (exceeds max 16)
    invalid.curve.checkpoints = Array.from({ length: 18 }, (_, i) => 1.0 + i * 0.2);
    invalid.curve.liquidityWeights = Array.from({ length: 17 }, () => 1);
    const result = validateCurveConfiguration(invalid);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('maximum of 16 segments'))).toBe(true);
  });

  it('rejects excessive fee configurations over 99%', () => {
    const invalid = structuredClone(CURVEFORGE_PRESETS[0]);
    invalid.fee.fixedFeeBps = 10000; // 100%
    const result = validateCurveConfiguration(invalid);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('max 99%'))).toBe(true);
  });
});
