import { describe, it, expect } from 'vitest';
import { buildStyleSpec } from './styleSpec.js';

describe('buildStyleSpec', () => {
  it('trims the descriptor and rejects an empty one', () => {
    expect(buildStyleSpec({ descriptor: '  warm minimal studio  ' }).descriptor).toBe(
      'warm minimal studio',
    );
    expect(() => buildStyleSpec({ descriptor: '   ' })).toThrow();
  });

  it('clamps the palette to the first five colors', () => {
    const palette = ['#000', '#111', '#222', '#333', '#444', '#555', '#666'];
    expect(buildStyleSpec({ descriptor: 'x', palette }).palette).toEqual([
      '#000',
      '#111',
      '#222',
      '#333',
      '#444',
    ]);
  });

  it('defaults the palette to empty when omitted', () => {
    expect(buildStyleSpec({ descriptor: 'x' }).palette).toEqual([]);
  });

  it('hashes the trimmed descriptor, so padding does not change the seed', () => {
    expect(buildStyleSpec({ descriptor: '  sunlit  ' }).seed).toBe(
      buildStyleSpec({ descriptor: 'sunlit' }).seed,
    );
  });

  it('derives a stable seed: same descriptor in, same seed out', () => {
    const a = buildStyleSpec({ descriptor: 'sunlit linen flatlay' });
    const b = buildStyleSpec({ descriptor: 'sunlit linen flatlay' });
    expect(a.seed).toBe(b.seed);
  });

  it('derives different seeds for different descriptors', () => {
    const a = buildStyleSpec({ descriptor: 'sunlit linen flatlay' }).seed;
    const b = buildStyleSpec({ descriptor: 'moody concrete studio' }).seed;
    expect(a).not.toBe(b);
  });

  it('derives seeds within signed int32 range (providers type seed as INT32)', () => {
    // Regression: an unsigned (>>> 0) seed could exceed 2^31-1 and Gemini rejects
    // it with a 400, silently forcing failover on ~half of all descriptors.
    const MAX_INT32 = 0x7fffffff;
    for (let i = 0; i < 250; i++) {
      const seed = buildStyleSpec({ descriptor: `neon city skyline variant ${String(i)}` }).seed;
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(MAX_INT32);
    }
  });

  it('keeps an explicitly provided seed, including 0', () => {
    expect(buildStyleSpec({ descriptor: 'x', seed: 42 }).seed).toBe(42);
    // 0 is falsy: this fails if `??` is ever weakened to `||`.
    expect(buildStyleSpec({ descriptor: 'x', seed: 0 }).seed).toBe(0);
  });
});
