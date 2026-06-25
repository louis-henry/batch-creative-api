import type { Copy, FormatId } from '@app/contracts';

/** Renders a generated base image into the three formats with copy overlaid. */
export interface Compositor {
  render(base: Buffer, copy: Copy): Promise<Record<FormatId, Buffer>>;
}
