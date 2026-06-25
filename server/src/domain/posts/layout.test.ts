import { describe, it, expect } from 'vitest';
import { FORMAT_IDS, formatSpec } from '@app/contracts';
import { computeCopyLayout, type Rect } from './layout.js';

const within = (r: Rect, w: number, h: number, margin: number): boolean =>
  r.x >= margin && r.y >= margin && r.x + r.width <= w - margin && r.y + r.height <= h - margin;

describe('computeCopyLayout', () => {
  it('keeps every copy element inside the safe margin for all formats', () => {
    for (const id of FORMAT_IDS) {
      const { width: w, height: h } = formatSpec(id);
      const layout = computeCopyLayout(id);
      expect(within(layout.headline, w, h, layout.margin)).toBe(true);
      expect(within(layout.subtext, w, h, layout.margin)).toBe(true);
      expect(within(layout.cta, w, h, layout.margin)).toBe(true);
    }
  });

  it('stacks headline, subtext, and cta without overlapping', () => {
    const { headline, subtext, cta } = computeCopyLayout('story');
    expect(headline.y + headline.height).toBeLessThanOrEqual(subtext.y);
    expect(subtext.y + subtext.height).toBeLessThanOrEqual(cta.y);
  });

  it('gives all elements the same content width', () => {
    const { headline, subtext, cta, margin } = computeCopyLayout('square');
    const expectedWidth = formatSpec('square').width - margin * 2;
    expect(headline.width).toBe(expectedWidth);
    expect(subtext.width).toBe(expectedWidth);
    expect(cta.width).toBe(expectedWidth);
  });

  it('derives the margin as 6% of the shorter side', () => {
    // square: round(1080 * 0.06) = 65; banner: round(500 * 0.06) = 30
    expect(computeCopyLayout('square').margin).toBe(65);
    expect(computeCopyLayout('banner').margin).toBe(30);
  });
});
