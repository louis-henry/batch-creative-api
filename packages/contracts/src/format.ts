import { z } from 'zod';

/** The three social post formats the product is rendered into. */
export const FORMAT_IDS = ['square', 'story', 'banner'] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

export interface FormatSpec {
  readonly width: number;
  readonly height: number;
}

export const FORMATS: Record<FormatId, FormatSpec> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  banner: { width: 1500, height: 500 },
};

export const formatIdSchema = z.enum(FORMAT_IDS);

export function formatSpec(id: FormatId): FormatSpec {
  return FORMATS[id];
}
