import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ImageStore, StoredImage } from '../../application/ports/imageStore.js';

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Writes images under a directory and serves them at `publicBaseUrl`. Keys are
 * normalized to a single path segment so a caller can't escape the directory.
 */
export function createLocalImageStore(deps: {
  directory: string;
  publicBaseUrl: string;
}): ImageStore {
  return {
    async save(key, data, contentType): Promise<StoredImage> {
      const ext = EXTENSIONS[contentType] ?? 'bin';
      const fileName = `${safeKey(key)}.${ext}`;
      await mkdir(deps.directory, { recursive: true });
      await writeFile(join(deps.directory, fileName), data);
      return { key: fileName, url: `${deps.publicBaseUrl}/${fileName}` };
    },
  };
}

function safeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}
