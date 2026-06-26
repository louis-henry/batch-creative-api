import type { ItemResult } from '@app/contracts';
import type { StyleSpec } from '../../domain/style/styleSpec.js';
import { execute, type Provider } from '../resilience/executor.js';
import { ProviderError } from '../resilience/errors.js';
import type { RetryPolicy } from '../resilience/policy.js';
import type { ImageProvider } from '../ports/imageProvider.js';
import type { TextProvider } from '../ports/textProvider.js';
import type { ImageStore } from '../ports/imageStore.js';
import type { Logger } from '../ports/logger.js';

export interface ProductInput {
  readonly id: string;
  readonly product: Buffer;
  readonly refs: readonly Buffer[];
}

export interface ProcessItemDeps {
  readonly imageProviders: readonly ImageProvider[];
  readonly text: TextProvider;
  readonly store: ImageStore;
  readonly policy: RetryPolicy;
  readonly chaos?: boolean;
  readonly judgeThreshold?: number;
  readonly logger?: Logger;
}

const asProvider = <T>(name: string, run: (signal: AbortSignal) => Promise<T>): Provider<T> => ({
  name,
  run,
});

export async function processItem(
  input: ProductInput,
  style: StyleSpec,
  deps: ProcessItemDeps,
): Promise<ItemResult> {
  const generated = await generateImage(input, style, deps);
  const post = await execute(
    [
      asProvider('openrouter post', (signal) =>
        deps.text.writePost({ product: input.product, style, signal }),
      ),
    ],
    deps.policy,
  );
  // Bound the store write with the same policy timeout, so a wedged disk write
  // can't leave the item (and the job) hanging.
  const stored = await execute(
    [asProvider('store', () => deps.store.save(input.id, generated.image, 'image/png'))],
    deps.policy,
  );
  return { id: input.id, providerUsed: generated.providerUsed, imageUrl: stored.url, post };
}

interface Generated {
  image: Buffer;
  providerUsed: string;
}

function generateImage(
  input: ProductInput,
  style: StyleSpec,
  deps: ProcessItemDeps,
): Promise<Generated> {
  // The winning run returns its own provenance, so no shared mutable state can be
  // overwritten by a timed-out/abandoned provider.
  const providers = deps.imageProviders.map(
    (provider, index): Provider<Generated> => ({
      name: provider.name,
      run: async (signal) => {
        if (deps.chaos === true && index === 0) {
          // Non-retryable so failover to the secondary is immediate in the demo.
          throw new ProviderError(`${provider.name} disabled by chaos flag`, { retryable: false });
        }
        const image = await provider.generate({
          product: input.product,
          refs: input.refs,
          style,
          signal,
        });
        await gateOnQuality(image, style, deps, signal);
        return { image, providerUsed: provider.name };
      },
    }),
  );
  return execute(providers, deps.policy);
}

/**
 * Ties failover to quality: a low *score* is a retryable failure. A failed judge
 * *call* (transient outage) is best-effort and passes the gate, rather than
 * discarding an otherwise-good image.
 */
async function gateOnQuality(
  image: Buffer,
  style: StyleSpec,
  deps: ProcessItemDeps,
  signal: AbortSignal,
): Promise<void> {
  if (deps.judgeThreshold === undefined) return;
  let score: number;
  try {
    ({ score } = await deps.text.judge({ image, style, signal }));
  } catch (error) {
    // Best-effort: a judge outage must not discard a good image — but make the
    // degraded gate observable rather than silently disabling quality control.
    deps.logger?.warn({ err: error }, 'judge call failed; passing quality gate');
    return;
  }
  if (score < deps.judgeThreshold) {
    throw new ProviderError(`quality ${score.toFixed(2)} below ${deps.judgeThreshold}`, {
      retryable: true,
    });
  }
}
