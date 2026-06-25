import type { StyleSpec } from '../../domain/style/styleSpec.js';

export interface ImageRequest {
  readonly product: Buffer;
  readonly refs: readonly Buffer[];
  readonly style: StyleSpec;
  readonly signal: AbortSignal;
}

/** Places a product into a styled scene and returns the generated image bytes. */
export interface ImageProvider {
  readonly name: string;
  generate(request: ImageRequest): Promise<Buffer>;
}
