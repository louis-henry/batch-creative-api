import type { BatchResult, ItemFailure, ItemResult } from '@app/contracts';

export type ItemView =
  | { id: string; status: 'pending' }
  | { id: string; status: 'done'; result: ItemResult }
  | { id: string; status: 'failed'; failure: ItemFailure };

/** Projects the N submitted items onto the latest job snapshot for the UI. */
export function deriveItems(count: number, job: BatchResult | undefined): ItemView[] {
  const succeeded = new Map((job?.succeeded ?? []).map((r) => [r.id, r]));
  const failed = new Map((job?.failed ?? []).map((f) => [f.id, f]));

  return Array.from({ length: count }, (_, i): ItemView => {
    const id = `item-${i}`;
    const result = succeeded.get(id);
    if (result) return { id, status: 'done', result };
    const failure = failed.get(id);
    if (failure) return { id, status: 'failed', failure };
    return { id, status: 'pending' };
  });
}

export function downloadName(itemId: string): string {
  return `${itemId}.png`;
}
