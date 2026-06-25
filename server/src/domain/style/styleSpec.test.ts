import { describe, it, expect } from 'vitest';
import { buildStyleSpec } from './styleSpec.js';

describe('buildStyleSpec', () => {
  it('trims the descriptor and rejects an empty one', () => {
    expect(buildStyleSpec({ descriptor: '  warm minimal studio  ' }).descriptor).toBe(
      'warm minimal studio',
    );
    expect(() => buildStyleSpec({ descriptor: '   ' })).toThrow();
  });

  it('clamps the palette to at most five colors', () => {
    const palette = ['#000', '#111', '#222', '#333', '#444', '#555', '#666'];
    expect(buildStyleSpec({ descriptor: 'x', palette }).palette).toHaveLength(5);
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

  it('keeps an explicitly provided seed', () => {
    expect(buildStyleSpec({ descriptor: 'x', seed: 42 }).seed).toBe(42);
  });
});
