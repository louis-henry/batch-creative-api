import pLimit from 'p-limit';
import type { ItemFailure } from '@app/contracts';
import type { StyleSpec } from '../../domain/style/styleSpec.js';
import { execute } from '../resilience/executor.js';
import { extractStyleSpec } from '../style/extractStyleSpec.js';
import { processItem, type ProcessItemDeps, type ProductInput } from './processItem.js';
import type { JobStore } from '../ports/jobStore.js';

export interface RunBatchDeps extends ProcessItemDeps {
  readonly jobStore: JobStore;
  readonly concurrency: number;
}

// Summarizes the constituent causes so the failure panel shows real reasons
// (HTTP status, timeout, schema) instead of a bare "all N providers failed".
function reasonOf(error: unknown): string {
  if (error instanceof AggregateError) {
    const messages = error.errors.map((e) => (e instanceof Error ? e.message : String(e)));
    return [...new Set(messages)].join('; ') || error.message;
  }
  return error instanceof Error ? error.message : 'unknown error';
}

export async function runBatch(
  jobId: string,
  products: readonly ProductInput[],
  refs: readonly Buffer[],
  deps: RunBatchDeps,
): Promise<void> {
  deps.jobStore.setStatus(jobId, 'running');
  const style = await resolveStyle(jobId, products, refs, deps);
  if (!style) return;

  const limit = pLimit(deps.concurrency);
  await Promise.all(products.map((product) => limit(() => runOne(jobId, product, style, deps))));
  deps.jobStore.setStatus(jobId, 'done');
}

async function runOne(
  jobId: string,
  product: ProductInput,
  style: StyleSpec,
  deps: RunBatchDeps,
): Promise<void> {
  try {
    deps.jobStore.addSuccess(jobId, await processItem(product, style, deps));
  } catch (error) {
    // Full error (with causes/status) logged server-side; client reason stays
    // message-only (no `cause`) per docs/governance/security.md.
    deps.logger?.warn({ jobId, id: product.id, err: error }, 'batch item failed');
    deps.jobStore.addFailure(jobId, toFailure(product.id, error));
  }
}

/** Style is needed by every item — if it can't be read, the whole batch fails. */
async function resolveStyle(
  jobId: string,
  products: readonly ProductInput[],
  refs: readonly Buffer[],
  deps: RunBatchDeps,
): Promise<StyleSpec | undefined> {
  try {
    return await execute(
      [{ name: 'openrouter style', run: (signal) => extractStyleSpec(deps.text, refs, signal) }],
      deps.policy,
    );
  } catch (error) {
    deps.logger?.warn({ jobId, err: error }, 'style read failed; failing batch');
    for (const product of products) deps.jobStore.addFailure(jobId, toFailure(product.id, error));
    deps.jobStore.setStatus(jobId, 'done');
    return undefined;
  }
}

function toFailure(id: string, error: unknown): ItemFailure {
  return { id, reason: reasonOf(error) };
}
