import { describe, it, expect } from 'vitest';
import { FORMAT_IDS, FORMATS, formatIdSchema, formatSpec } from './format.js';

describe('format', () => {
  it('keeps FORMAT_IDS, the FORMATS map, and the schema in sync', () => {
    expect(Object.keys(FORMATS).sort()).toEqual([...FORMAT_IDS].sort());
    for (const id of FORMAT_IDS) {
      expect(formatIdSchema.safeParse(id).success).toBe(true);
    }
    expect(formatIdSchema.safeParse('portrait').success).toBe(false);
  });

  it('exposes positive dimensions for every format', () => {
    for (const id of FORMAT_IDS) {
      const spec = formatSpec(id);
      expect(spec.w).toBeGreaterThan(0);
      expect(spec.h).toBeGreaterThan(0);
    }
  });

  it('uses the documented canvas sizes', () => {
    expect(formatSpec('square')).toEqual({ w: 1080, h: 1080 });
    expect(formatSpec('story')).toEqual({ w: 1080, h: 1920 });
  });
});
