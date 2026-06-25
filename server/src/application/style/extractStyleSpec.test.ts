import { describe, it, expect } from 'vitest';
import { extractStyleSpec } from './extractStyleSpec.js';
import type { TextProvider } from '../ports/textProvider.js';

const text = (over: Partial<TextProvider> = {}): TextProvider => ({
  name: 'openrouter',
  describeStyle: () => Promise.resolve({ descriptor: 'sunlit linen', palette: ['#fff', '#eee'] }),
  copy: () => Promise.resolve({ headline: 'H', subtext: 'S', cta: 'C' }),
  judge: () => Promise.resolve({ score: 1 }),
  ...over,
});

describe('extractStyleSpec', () => {
  it('builds a StyleSpec from the analysis', async () => {
    const spec = await extractStyleSpec(text(), [Buffer.from('R')], new AbortController().signal);
    expect(spec.descriptor).toBe('sunlit linen');
    expect(spec.palette).toEqual(['#fff', '#eee']);
    expect(typeof spec.seed).toBe('number');
  });

  it('clamps an oversized palette via buildStyleSpec', async () => {
    const spec = await extractStyleSpec(
      text({
        describeStyle: () =>
          Promise.resolve({ descriptor: 'x', palette: ['1', '2', '3', '4', '5', '6', '7'] }),
      }),
      [],
      new AbortController().signal,
    );
    expect(spec.palette).toHaveLength(5);
  });
});
