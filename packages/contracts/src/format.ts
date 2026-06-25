import { z } from 'zod';

/** The three social post formats the product is rendered into. */
export const FORMAT_IDS = ['square', 'story', 'banner'] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

export interface FormatSpec {
  readonly w: number;
  readonly h: number;
}

export const FORMATS: Record<FormatId, FormatSpec> = {
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
  banner: { w: 1500, h: 500 },
};

export const formatIdSchema = z.enum(FORMAT_IDS);

export function formatSpec(id: FormatId): FormatSpec {
  return FORMATS[id];
}
