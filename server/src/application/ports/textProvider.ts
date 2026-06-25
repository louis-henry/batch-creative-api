import type { Copy } from '@app/contracts';
import type { StyleSpec } from '../../domain/style/styleSpec.js';

export interface CopyRequest {
  readonly product: Buffer;
  readonly style: StyleSpec;
  readonly signal: AbortSignal;
}

export interface JudgeRequest {
  readonly image: Buffer;
  readonly style: StyleSpec;
  readonly signal: AbortSignal;
}

/** A normalized 0..1 quality score for product fidelity + style match. */
export interface JudgeResult {
  readonly score: number;
}

/** Generates ad copy and (optionally) judges output quality via an LLM. */
export interface TextProvider {
  readonly name: string;
  copy(request: CopyRequest): Promise<Copy>;
  judge(request: JudgeRequest): Promise<JudgeResult>;
}
