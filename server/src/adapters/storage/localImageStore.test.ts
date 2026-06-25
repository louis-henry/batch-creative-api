import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalImageStore } from './localImageStore.js';

const tempStore = async (
  publicBaseUrl: string,
): Promise<ReturnType<typeof createLocalImageStore>> =>
  createLocalImageStore({ directory: await mkdtemp(join(tmpdir(), 'imgstore-')), publicBaseUrl });

describe('localImageStore', () => {
  it('writes the image and returns a sanitized public url', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'imgstore-'));
    const store = createLocalImageStore({ directory: dir, publicBaseUrl: 'https://x/o' });
    const data = Buffer.from('PNGDATA');

    const stored = await store.save('post/a 1', data, 'image/png');

    expect(stored.key).toBe('post_a_1.png'); // path separators and spaces neutralized
    expect(stored.url).toBe('https://x/o/post_a_1.png');
    expect(await readFile(join(dir, stored.key))).toEqual(data);
  });

  it('falls back to .bin for unknown content types', async () => {
    const store = await tempStore('https://x');
    const stored = await store.save('k', Buffer.from('x'), 'application/zip');
    expect(stored.key).toBe('k.bin');
  });
});
