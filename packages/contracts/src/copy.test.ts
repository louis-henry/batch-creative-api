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

  it('rejects copy that would overflow the layout', () => {
    expect(copySchema.safeParse({ ...valid, headline: 'x'.repeat(61) }).success).toBe(false);
    expect(copySchema.safeParse({ ...valid, subtext: 'x'.repeat(121) }).success).toBe(false);
    expect(copySchema.safeParse({ ...valid, cta: 'x'.repeat(25) }).success).toBe(false);
  });

  it('allows empty subtext but requires the field', () => {
    expect(copySchema.safeParse({ ...valid, subtext: '' }).success).toBe(true);
    expect(copySchema.safeParse({ headline: 'h', cta: 'c' }).success).toBe(false);
  });
});
