import { describe, it, expect } from 'vitest';
import { batchOptionsSchema, batchResultSchema } from './batch.js';

describe('batchOptionsSchema', () => {
  it('applies defaults when fields are omitted', () => {
    expect(batchOptionsSchema.parse({})).toEqual({ concurrency: 4, chaos: false });
  });

  it('accepts concurrency at the bounds and rejects outside them', () => {
    expect(batchOptionsSchema.safeParse({ concurrency: 1 }).success).toBe(true);
    expect(batchOptionsSchema.safeParse({ concurrency: 16 }).success).toBe(true);
    expect(batchOptionsSchema.safeParse({ concurrency: 0 }).success).toBe(false);
    expect(batchOptionsSchema.safeParse({ concurrency: 17 }).success).toBe(false);
  });
});

describe('batchResultSchema', () => {
  const post = { format: 'square' as const, url: '/o/a.png', width: 1080, height: 1080 };
  const succeeded = {
    id: 'a',
    providerUsed: 'gemini',
    copy: { headline: 'Hi', subtext: '', cta: 'Shop' },
    posts: [post],
  };

  it('accepts a partial-success result with both buckets populated', () => {
    const result = {
      jobId: 'job-1',
      status: 'running' as const,
      succeeded: [succeeded],
      failed: [{ id: 'b', reason: 'provider exhausted' }],
    };
    expect(batchResultSchema.safeParse(result).success).toBe(true);
  });

  it('rejects an item id that appears in both succeeded and failed', () => {
    const result = {
      jobId: 'job-1',
      status: 'done' as const,
      succeeded: [succeeded],
      failed: [{ id: 'a', reason: 'should not also be here' }],
    };
    expect(batchResultSchema.safeParse(result).success).toBe(false);
  });
});
