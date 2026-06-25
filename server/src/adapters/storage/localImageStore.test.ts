import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createLocalImageStore } from './localImageStore.js';

const tempDir = (): Promise<string> => mkdtemp(join(tmpdir(), 'imgstore-'));

describe('localImageStore', () => {
  it('writes the image and returns a sanitized, content-addressed url', async () => {
    const dir = await tempDir();
    const store = createLocalImageStore({ directory: dir, publicBaseUrl: 'https://x/o' });
    const data = Buffer.from('PNGDATA');

    const stored = await store.save('post/a 1', data, 'image/png');

    expect(stored.key).toMatch(/^post_a_1-[0-9a-f]{12}\.png$/); // separators/spaces neutralized
    expect(stored.url).toBe(`https://x/o/${stored.key}`);
    expect(await readFile(join(dir, stored.key))).toEqual(data);
  });

  it('keeps a hostile key inside the directory', async () => {
    const dir = await tempDir();
    const store = createLocalImageStore({ directory: dir, publicBaseUrl: 'https://x' });

    const stored = await store.save('../../etc/passwd', Buffer.from('x'), 'image/png');

    expect(stored.key).not.toMatch(/[/\\]/);
    expect(stored.key).not.toContain('..');
    expect(resolve(dir, stored.key).startsWith(resolve(dir))).toBe(true);
  });

  it('gives distinct content distinct files, and is idempotent for identical content', async () => {
    const dir = await tempDir();
    const store = createLocalImageStore({ directory: dir, publicBaseUrl: 'https://x' });

    const a = await store.save('k', Buffer.from('one'), 'image/png');
    const b = await store.save('k', Buffer.from('two'), 'image/png');
    const aAgain = await store.save('k', Buffer.from('one'), 'image/png');

    expect(a.key).not.toBe(b.key); // different content → no silent overwrite
    expect(a.key).toBe(aAgain.key); // same content → same file
  });

  it('rejects a key with no alphanumeric characters', async () => {
    const store = createLocalImageStore({ directory: await tempDir(), publicBaseUrl: 'https://x' });
    await expect(store.save('  /  ', Buffer.from('x'), 'image/png')).rejects.toThrow(
      /alphanumeric/,
    );
  });

  it('falls back to .bin for unknown content types', async () => {
    const store = createLocalImageStore({ directory: await tempDir(), publicBaseUrl: 'https://x' });
    const stored = await store.save('k', Buffer.from('x'), 'application/zip');
    expect(stored.key).toMatch(/\.bin$/);
  });
});
