import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ImageStore, StoredImage } from '../../application/ports/imageStore.js';

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const MAX_KEY_LENGTH = 64;

/**
 * Writes images under a directory and serves them at `publicBaseUrl`. Keys are
 * sanitized to a single safe path segment, and a content hash is appended so
 * distinct content never collides into one file (and identical re-saves are
 * idempotent) — sanitization alone is many-to-one and would silently overwrite.
 */
export function createLocalImageStore(deps: {
  directory: string;
  publicBaseUrl: string;
}): ImageStore {
  return {
    async save(key, data, contentType): Promise<StoredImage> {
      if (!/[a-zA-Z0-9]/.test(key)) {
        throw new Error('image key must contain at least one alphanumeric character');
      }
      const ext = EXTENSIONS[contentType] ?? 'bin';
      const digest = createHash('sha256').update(data).digest('hex').slice(0, 12);
      const fileName = `${safeKey(key).slice(0, MAX_KEY_LENGTH)}-${digest}.${ext}`;
      await mkdir(deps.directory, { recursive: true });
      await writeFile(join(deps.directory, fileName), data);
      return { key: fileName, url: `${deps.publicBaseUrl}/${fileName}` };
    },
  };
}

function safeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}
