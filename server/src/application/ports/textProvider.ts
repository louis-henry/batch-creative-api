import type { SocialPost } from '@app/contracts';
import type { StyleSpec } from '../../domain/style/styleSpec.js';

export interface DescribeRequest {
  readonly refs: readonly Buffer[];
  readonly signal: AbortSignal;
}

/** A reusable style read from the reference images. */
export interface StyleAnalysis {
  readonly descriptor: string;
  readonly palette: string[];
}

export interface WritePostRequest {
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

/** LLM-backed text/vision tasks: style read, post copywriting, and quality judging. */
export interface TextProvider {
  readonly name: string;
  describeStyle(request: DescribeRequest): Promise<StyleAnalysis>;
  writePost(request: WritePostRequest): Promise<SocialPost>;
  judge(request: JudgeRequest): Promise<JudgeResult>;
}
