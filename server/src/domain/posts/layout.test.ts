import { describe, it, expect } from 'vitest';
import { FORMAT_IDS, formatSpec } from '@app/contracts';
import { computeCopyLayout, type Rect } from './layout.js';

const within = (r: Rect, w: number, h: number, margin: number): boolean =>
  r.x >= margin && r.y >= margin && r.x + r.width <= w - margin && r.y + r.height <= h - margin;

describe('computeCopyLayout', () => {
  it('keeps every copy element inside the safe margin for all formats', () => {
    for (const id of FORMAT_IDS) {
      const { w, h } = formatSpec(id);
      const layout = computeCopyLayout(id);
      expect(within(layout.headline, w, h, layout.margin)).toBe(true);
      expect(within(layout.subtext, w, h, layout.margin)).toBe(true);
      expect(within(layout.cta, w, h, layout.margin)).toBe(true);
    }
  });

  it('stacks headline above subtext above cta', () => {
    const { headline, subtext, cta } = computeCopyLayout('story');
    expect(headline.y).toBeLessThan(subtext.y);
    expect(subtext.y).toBeLessThan(cta.y);
  });

  it('gives all elements the same content width', () => {
    const { headline, subtext, cta, margin } = computeCopyLayout('square');
    const expectedWidth = formatSpec('square').w - margin * 2;
    expect(headline.width).toBe(expectedWidth);
    expect(subtext.width).toBe(expectedWidth);
    expect(cta.width).toBe(expectedWidth);
  });

  it('scales the margin with the format, so different shapes differ', () => {
    expect(computeCopyLayout('square').margin).not.toBe(computeCopyLayout('banner').margin);
  });
});
