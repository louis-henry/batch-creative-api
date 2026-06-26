/**
 * A reusable visual style derived once from the reference images and applied to
 * every product in a batch, so the whole set looks coherent.
 */
export interface StyleSpec {
  readonly descriptor: string;
  readonly palette: readonly string[];
  readonly seed: number;
}

export interface StyleSpecInput {
  descriptor: string;
  palette?: string[];
  seed?: number;
}

const MAX_PALETTE = 5;

export function buildStyleSpec(input: StyleSpecInput): StyleSpec {
  const descriptor = input.descriptor.trim();
  if (descriptor.length === 0) {
    throw new Error('StyleSpec requires a non-empty descriptor');
  }
  return {
    descriptor,
    palette: (input.palette ?? []).slice(0, MAX_PALETTE),
    seed: input.seed ?? stableSeed(descriptor),
  };
}

/**
 * FNV-1a 32-bit hash: the same descriptor always yields the same seed, so a
 * batch is reproducible without persisting anything. Masked to a non-negative
 * signed int32 because providers (Gemini's `generationConfig.seed`) type it as
 * INT32 and reject anything above 2^31-1.
 */
function stableSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash & 0x7fffffff;
}
