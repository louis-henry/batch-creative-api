import type { FormatId } from '@app/contracts';
import { formatSpec } from '@app/contracts';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where each copy element is drawn, in pixels, for a given format. */
export interface CopyLayout {
  margin: number;
  headline: Rect;
  subtext: Rect;
  cta: Rect;
}

const MARGIN_RATIO = 0.06;
const HEADLINE_RATIO = 0.12;
const SUBTEXT_RATIO = 0.07;
const CTA_RATIO = 0.08;

/**
 * Anchors the copy block to the bottom of the canvas (headline, then subtext,
 * then CTA), inset by a margin. Proportions scale with canvas height so each
 * format stays balanced. Pure and deterministic.
 */
export function computeCopyLayout(format: FormatId): CopyLayout {
  const { w, h } = formatSpec(format);
  const margin = Math.round(Math.min(w, h) * MARGIN_RATIO);
  const width = w - margin * 2;
  const gap = Math.round(margin / 2);

  const ctaH = Math.round(h * CTA_RATIO);
  const subtextH = Math.round(h * SUBTEXT_RATIO);
  const headlineH = Math.round(h * HEADLINE_RATIO);

  const ctaY = h - margin - ctaH;
  const subtextY = ctaY - gap - subtextH;
  const headlineY = subtextY - gap - headlineH;

  return {
    margin,
    headline: { x: margin, y: headlineY, width, height: headlineH },
    subtext: { x: margin, y: subtextY, width, height: subtextH },
    cta: { x: margin, y: ctaY, width, height: ctaH },
  };
}
