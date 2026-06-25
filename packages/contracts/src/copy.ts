import { z } from 'zod';

/** Overlay copy for a post. Bounds keep text legible within the layout. */
export const copySchema = z.object({
  headline: z.string().min(1).max(60),
  subtext: z.string().max(120),
  cta: z.string().min(1).max(24),
});

export type Copy = z.infer<typeof copySchema>;
