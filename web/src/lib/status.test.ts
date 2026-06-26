import { describe, it, expect } from 'vitest';
import type { BatchResult } from '@app/contracts';
import { deriveItems, downloadName } from './status.js';

const post = { format: 'square' as const, url: '/o/a.png', width: 1080, height: 1080 };
const result = (id: string) => ({
  id,
  providerUsed: 'gemini',
  copy: { headline: 'H', subtext: '', cta: 'C' },
  posts: [post],
});

const job: BatchResult = {
  jobId: 'j',
  status: 'running',
  succeeded: [result('item-0')],
  failed: [{ id: 'item-2', reason: 'provider exhausted' }],
};

describe('deriveItems', () => {
  it('maps each submitted item to done, failed, or pending', () => {
    const views = deriveItems(3, job);
    expect(views.map((v) => v.status)).toEqual(['done', 'pending', 'failed']);
  });

  it('treats everything as pending before any job snapshot', () => {
    expect(deriveItems(2, undefined).every((v) => v.status === 'pending')).toBe(true);
  });
});

describe('downloadName', () => {
  it('builds a per-format file name', () => {
    expect(downloadName('item-1', 'story')).toBe('item-1-story.png');
  });
});
