import { z } from 'zod';
import { socialPostSchema } from './post.js';

/** Options a client can pass to tune a batch run. */
export const batchOptionsSchema = z.object({
  concurrency: z.number().int().min(1).max(16).default(4),
  chaos: z.boolean().default(false),
});
export type BatchOptions = z.infer<typeof batchOptionsSchema>;

export const itemResultSchema = z.object({
  id: z.string(),
  providerUsed: z.string(),
  imageUrl: z.string().min(1),
  post: socialPostSchema,
});
export type ItemResult = z.infer<typeof itemResultSchema>;

export const itemFailureSchema = z.object({
  id: z.string(),
  reason: z.string(),
});
export type ItemFailure = z.infer<typeof itemFailureSchema>;

export const jobStatusSchema = z.enum(['pending', 'running', 'done']);
export type JobStatus = z.infer<typeof jobStatusSchema>;

/**
 * Partial-success result: successes and failures reported side by side. A given
 * item id lands in exactly one bucket; the refine enforces the buckets are
 * disjoint. (`pending`/`running` may carry partial results: the FE polls while
 * the batch is still running, so results accrue before `status` is `done`.)
 */
export const batchResultSchema = z
  .object({
    jobId: z.string(),
    status: jobStatusSchema,
    succeeded: z.array(itemResultSchema),
    failed: z.array(itemFailureSchema),
  })
  .superRefine((value, ctx) => {
    const failedIds = new Set(value.failed.map((f) => f.id));
    const overlap = value.succeeded.find((s) => failedIds.has(s.id));
    if (overlap) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `item "${overlap.id}" cannot be both succeeded and failed`,
      });
    }
  });
export type BatchResult = z.infer<typeof batchResultSchema>;
