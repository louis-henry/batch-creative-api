import { describe, it, expect } from 'vitest';
import type { ItemResult } from '@app/contracts';
import { createInMemoryJobStore } from './inMemoryJobStore.js';

const item = (id: string): ItemResult => ({
  id,
  providerUsed: 'gemini',
  imageUrl: `https://x/${id}`,
  post: { title: 'T', caption: 'C', hashtags: ['#x'] },
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

  it('returns a stable snapshot, not a live reference', () => {
    const store = createInMemoryJobStore();
    store.create('j');
    store.addSuccess('j', item('a'));
    const snapshot = store.get('j');
    store.addSuccess('j', item('b'));
    expect(snapshot?.succeeded).toHaveLength(1); // unchanged by the later write
  });

  it('isolates jobs from one another', () => {
    const store = createInMemoryJobStore();
    store.create('j1');
    store.create('j2');
    store.addSuccess('j1', item('a'));
    store.addSuccess('j2', item('b'));
    expect(store.get('j1')?.succeeded.map((i) => i.id)).toEqual(['a']);
    expect(store.get('j2')?.succeeded.map((i) => i.id)).toEqual(['b']);
  });

  it('returns undefined for an unknown job', () => {
    expect(createInMemoryJobStore().get('missing')).toBeUndefined();
  });

  it('throws when writing to an unknown job', () => {
    expect(() => createInMemoryJobStore().addSuccess('missing', item('a'))).toThrow(/unknown job/);
  });
});
