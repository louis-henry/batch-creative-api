import { z } from 'zod';

/**
 * Overlay copy for a post. Length bounds are sized for the copy layout boxes;
 * the fit is not enforced against `computeCopyLayout` — treat them as guidance.
 */
export const copySchema = z.object({
  headline: z.string().min(1).max(60),
  subtext: z.string().max(120),
  cta: z.string().min(1).max(24),
});

export type Copy = z.infer<typeof copySchema>;
