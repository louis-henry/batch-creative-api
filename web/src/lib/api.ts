import type { BatchResult } from '@app/contracts';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8787';

export interface BatchOptions {
  concurrency: number;
  chaos: boolean;
}

export async function createBatch(
  products: File[],
  refs: File[],
  options: BatchOptions,
): Promise<string> {
  const form = new FormData();
  products.forEach((file) => form.append('products', file));
  refs.forEach((file) => form.append('refs', file));
  form.append('concurrency', String(options.concurrency));
  form.append('chaos', String(options.chaos));

  const res = await fetch(`${API_URL}/batch`, { method: 'POST', body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `request failed (${String(res.status)})`);
  }
  return ((await res.json()) as { jobId: string }).jobId;
}

export async function fetchJob(jobId: string): Promise<BatchResult> {
  const res = await fetch(`${API_URL}/batch/${jobId}`);
  if (!res.ok) throw new Error(`could not load job (${String(res.status)})`);
  return (await res.json()) as BatchResult;
}

/**
 * Downloads via a blob, not an `<a download>`: the `download` attribute is
 * ignored for cross-origin URLs (the API serves images from another origin).
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('download failed');
  const blobUrl = URL.createObjectURL(await res.blob());
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}
