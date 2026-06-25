import { describe, it, expect } from 'vitest';
import type { ItemResult } from '@app/contracts';
import { createInMemoryJobStore } from './inMemoryJobStore.js';

const item = (id: string): ItemResult => ({
  id,
  providerUsed: 'gemini',
  copy: { headline: 'h', subtext: '', cta: 'c' },
  posts: [],
});

describe('inMemoryJobStore', () => {
  it('accumulates successes and failures under a created job', () => {
    const store = createInMemoryJobStore();
    store.create('j');
    store.addSuccess('j', item('a'));
    store.addFailure('j', { id: 'b', reason: 'provider exhausted' });
    store.setStatus('j', 'done');
    expect(store.get('j')).toEqual({
      jobId: 'j',
      status: 'done',
      succeeded: [item('a')],
      failed: [{ id: 'b', reason: 'provider exhausted' }],
    });
  });

  it('returns undefined for an unknown job', () => {
    expect(createInMemoryJobStore().get('missing')).toBeUndefined();
  });

  it('throws when writing to an unknown job', () => {
    expect(() => createInMemoryJobStore().addSuccess('missing', item('a'))).toThrow(/unknown job/);
  });
});
