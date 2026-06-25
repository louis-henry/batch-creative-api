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
      expect(spec.width).toBeGreaterThan(0);
      expect(spec.height).toBeGreaterThan(0);
    }
  });

  it('uses the documented canvas sizes', () => {
    expect(formatSpec('square')).toEqual({ width: 1080, height: 1080 });
    expect(formatSpec('story')).toEqual({ width: 1080, height: 1920 });
    expect(formatSpec('banner')).toEqual({ width: 1500, height: 500 });
  });
});
