import {
  type FormatId,
  FORMAT_IDS,
  formatSpec,
  type ItemResult,
  type PostResult,
} from '@app/contracts';
import type { StyleSpec } from '../../domain/style/styleSpec.js';
import { execute, type Provider } from '../resilience/executor.js';
import { ProviderError } from '../resilience/errors.js';
import type { RetryPolicy } from '../resilience/policy.js';
import type { ImageProvider } from '../ports/imageProvider.js';
import type { TextProvider } from '../ports/textProvider.js';
import type { Compositor } from '../ports/compositor.js';
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
  readonly compositor: Compositor;
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
  const copy = await execute(
    [
      asProvider('openrouter copy', (signal) =>
        deps.text.copy({ product: input.product, style, signal }),
      ),
    ],
    deps.policy,
  );
  // Bound the composite + store stage with the same policy timeout, so a wedged
  // sharp render or disk write can't leave the item (and the job) hanging.
  const posts = await execute(
    [
      asProvider('composite+store', async () => {
        const formats = await deps.compositor.render(generated.image, copy);
        return storePosts(input.id, formats, deps.store);
      }),
    ],
    deps.policy,
  );
  return { id: input.id, providerUsed: generated.providerUsed, copy, posts };
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

function storePosts(
  id: string,
  formats: Record<FormatId, Buffer>,
  store: ImageStore,
): Promise<PostResult[]> {
  return Promise.all(
    FORMAT_IDS.map(async (format): Promise<PostResult> => {
      const stored = await store.save(`${id}-${format}`, formats[format], 'image/png');
      const { width, height } = formatSpec(format);
      return { format, url: stored.url, width, height };
    }),
  );
}
