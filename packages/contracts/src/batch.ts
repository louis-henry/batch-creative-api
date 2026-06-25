import { z } from 'zod';
import { copySchema } from './copy.js';
import { formatIdSchema } from './format.js';

/** Options a client can pass to tune a batch run. */
export const batchOptionsSchema = z.object({
  concurrency: z.number().int().min(1).max(16).default(4),
  chaos: z.boolean().default(false),
});
export type BatchOptions = z.infer<typeof batchOptionsSchema>;

export const postResultSchema = z.object({
  format: formatIdSchema,
  url: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type PostResult = z.infer<typeof postResultSchema>;

export const itemResultSchema = z.object({
  id: z.string(),
  providerUsed: z.string(),
  copy: copySchema,
  posts: z.array(postResultSchema),
});
export type ItemResult = z.infer<typeof itemResultSchema>;

export const itemFailureSchema = z.object({
  id: z.string(),
  reason: z.string(),
});
export type ItemFailure = z.infer<typeof itemFailureSchema>;

export const jobStatusSchema = z.enum(['pending', 'running', 'done']);
export type JobStatus = z.infer<typeof jobStatusSchema>;

/** Partial-success result: successes and failures reported side by side. */
export const batchResultSchema = z.object({
  jobId: z.string(),
  status: jobStatusSchema,
  succeeded: z.array(itemResultSchema),
  failed: z.array(itemFailureSchema),
});
export type BatchResult = z.infer<typeof batchResultSchema>;
