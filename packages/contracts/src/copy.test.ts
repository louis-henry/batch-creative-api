import { describe, it, expect } from 'vitest';
import { copySchema } from './copy.js';

describe('copySchema', () => {
  const valid = { headline: 'Fresh drop', subtext: 'Made for the season', cta: 'Shop now' };

  it('accepts well-formed copy', () => {
    expect(copySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty headline and an empty cta', () => {
    expect(copySchema.safeParse({ ...valid, headline: '' }).success).toBe(false);
    expect(copySchema.safeParse({ ...valid, cta: '' }).success).toBe(false);
  });

  it('accepts copy exactly at the bounds but rejects one over', () => {
    expect(copySchema.safeParse({ ...valid, headline: 'x'.repeat(60) }).success).toBe(true);
    expect(copySchema.safeParse({ ...valid, headline: 'x'.repeat(61) }).success).toBe(false);
    expect(copySchema.safeParse({ ...valid, subtext: 'x'.repeat(120) }).success).toBe(true);
    expect(copySchema.safeParse({ ...valid, subtext: 'x'.repeat(121) }).success).toBe(false);
    expect(copySchema.safeParse({ ...valid, cta: 'x'.repeat(24) }).success).toBe(true);
    expect(copySchema.safeParse({ ...valid, cta: 'x'.repeat(25) }).success).toBe(false);
  });

  it('accepts single-character headline and cta (min bound)', () => {
    expect(copySchema.safeParse({ ...valid, headline: 'x', cta: 'y' }).success).toBe(true);
  });

  it('allows empty subtext but requires the field', () => {
    expect(copySchema.safeParse({ ...valid, subtext: '' }).success).toBe(true);
    expect(copySchema.safeParse({ headline: 'h', cta: 'c' }).success).toBe(false);
  });
});
