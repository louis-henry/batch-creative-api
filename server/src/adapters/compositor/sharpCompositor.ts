import sharp from 'sharp';
import { type Copy, type FormatId, FORMAT_IDS, formatSpec } from '@app/contracts';
import { computeCopyLayout } from '../../domain/posts/layout.js';
import type { Compositor } from '../../application/ports/compositor.js';

const FONT = 'font-family="Helvetica, Arial, sans-serif"';

export function createSharpCompositor(): Compositor {
  return {
    async render(base, copy): Promise<Record<FormatId, Buffer>> {
      const entries = await Promise.all(
        FORMAT_IDS.map(async (id) => [id, await renderFormat(base, copy, id)] as const),
      );
      return Object.fromEntries(entries) as Record<FormatId, Buffer>;
    },
  };
}

function renderFormat(base: Buffer, copy: Copy, format: FormatId): Promise<Buffer> {
  const { width, height } = formatSpec(format);
  const overlay = Buffer.from(buildOverlaySvg(format, copy));
  return sharp(base)
    .resize(width, height, { fit: 'cover' })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

interface TextSpec {
  x: number;
  y: number;
  size: number;
  weight: string;
  fill: string;
  value: string;
}

/** Bottom scrim for legibility plus the copy laid out via `computeCopyLayout`. */
function buildOverlaySvg(format: FormatId, copy: Copy): string {
  const { width, height } = formatSpec(format);
  const layout = computeCopyLayout(format);
  const headlineSize = Math.round(layout.headline.height * 0.6);
  const subtextSize = Math.round(layout.subtext.height * 0.6);
  const ctaSize = Math.round(layout.cta.height * 0.46);
  const scrimTop = Math.round(height * 0.45);

  return [
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`,
    `<defs><linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0" stop-color="#000" stop-opacity="0"/>`,
    `<stop offset="1" stop-color="#000" stop-opacity="0.6"/></linearGradient></defs>`,
    `<rect x="0" y="${scrimTop}" width="${width}" height="${height - scrimTop}" fill="url(#scrim)"/>`,
    text({
      x: layout.headline.x,
      y: layout.headline.y + headlineSize,
      size: headlineSize,
      weight: '700',
      fill: '#fff',
      value: copy.headline,
    }),
    text({
      x: layout.subtext.x,
      y: layout.subtext.y + subtextSize,
      size: subtextSize,
      weight: '400',
      fill: '#f0f0f0',
      value: copy.subtext,
    }),
    `<rect x="${layout.cta.x}" y="${layout.cta.y}" rx="${Math.round(layout.cta.height / 2)}" width="${ctaWidth(layout.cta.width, ctaSize, copy.cta, layout.cta.height)}" height="${layout.cta.height}" fill="#fff"/>`,
    text({
      x: layout.cta.x + layout.cta.height / 2,
      y: layout.cta.y + layout.cta.height / 2 + ctaSize / 3,
      size: ctaSize,
      weight: '600',
      fill: '#111',
      value: copy.cta,
    }),
    `</svg>`,
  ].join('');
}

function text(spec: TextSpec): string {
  return `<text x="${spec.x}" y="${spec.y}" ${FONT} font-size="${spec.size}" font-weight="${spec.weight}" fill="${spec.fill}">${escapeXml(spec.value)}</text>`;
}

function ctaWidth(maxWidth: number, fontSize: number, cta: string, pad: number): number {
  return Math.min(maxWidth, Math.round(cta.length * fontSize * 0.62) + pad);
}

const XML_ENTITIES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
};

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => XML_ENTITIES[c] ?? c);
}
