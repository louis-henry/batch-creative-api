import { z } from 'zod';

/** A generated social post: the image plus its caption metadata. */
export const socialPostSchema = z.object({
  title: z.string().min(1).max(80),
  caption: z.string().min(1).max(400),
  hashtags: z.array(z.string()).max(10),
});

export type SocialPost = z.infer<typeof socialPostSchema>;
