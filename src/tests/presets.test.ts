import { describe, it, expect } from 'vitest';
import { CURVEFORGE_PRESETS } from '../domain/presets/preset-library';
import { buildMeteoraDbcConfigParams } from '../blockchain/meteora/config-builder';

describe('CurveForge Reference Presets Audit', () => {
  it('verifies all reference presets compile cleanly through Meteora SDK config builder', () => {
    expect(CURVEFORGE_PRESETS.length).toBeGreaterThanOrEqual(5);

    for (const preset of CURVEFORGE_PRESETS) {
      console.log(`Checking preset: ${preset.id}`);
      try {
        const configParams = buildMeteoraDbcConfigParams(preset);
        expect(configParams).toBeDefined();
        expect(configParams.curve).toBeDefined();
        expect(configParams.curve.length).toBe(preset.curve.checkpoints.length - 1);
        expect(configParams.sqrtStartPrice).toBeDefined();
        expect(configParams.migrationQuoteThreshold).toBeDefined();
        console.log(`✓ ${preset.id} built successfully`);
      } catch (err: any) {
        console.error(`✗ ${preset.id} failed:`, err.message);
        throw err;
      }
    }
  });
});
