import { buildStyleSpec, type StyleSpec } from '../../domain/style/styleSpec.js';
import type { TextProvider } from '../ports/textProvider.js';

/** One vision pass over the references yields the style applied to the whole batch. */
export async function extractStyleSpec(
  text: TextProvider,
  refs: readonly Buffer[],
  signal: AbortSignal,
): Promise<StyleSpec> {
  const analysis = await text.describeStyle({ refs, signal });
  return buildStyleSpec({ descriptor: analysis.descriptor, palette: analysis.palette });
}
