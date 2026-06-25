import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { FORMAT_IDS, formatSpec } from '@app/contracts';
import { createSharpCompositor } from './sharpCompositor.js';

const solidBase = (size: number): Promise<Buffer> =>
  sharp({ create: { width: size, height: size, channels: 3, background: '#888888' } })
    .png()
    .toBuffer();

describe('sharpCompositor', () => {
  it('renders every format at its exact canvas size', async () => {
    const base = await solidBase(1200);
    const out = await createSharpCompositor().render(base, {
      headline: 'Hello there',
      subtext: 'A line of supporting copy',
      cta: 'Shop now',
    });

    for (const id of FORMAT_IDS) {
      const meta = await sharp(out[id]).metadata();
      expect(meta.width).toBe(formatSpec(id).width);
      expect(meta.height).toBe(formatSpec(id).height);
      expect(meta.format).toBe('png');
    }
  });

  it('actually applies the overlay (output differs from a plain resize)', async () => {
    const base = await solidBase(1200);
    const plain = await sharp(base).resize(1080, 1080, { fit: 'cover' }).png().toBuffer();
    const out = await createSharpCompositor().render(base, {
      headline: 'H',
      subtext: 'S',
      cta: 'C',
    });
    expect(Buffer.compare(out.square, plain)).not.toBe(0);
  });

  it('renders valid output when subtext is empty', async () => {
    const base = await solidBase(600);
    const out = await createSharpCompositor().render(base, {
      headline: 'H',
      subtext: '',
      cta: 'Go',
    });
    expect((await sharp(out.square).metadata()).format).toBe('png');
  });

  it('escapes XML-special characters in copy so the SVG stays valid', async () => {
    const base = await solidBase(600);
    // If escaping failed, sharp would throw parsing the SVG overlay.
    const out = await createSharpCompositor().render(base, {
      headline: 'A & B <c>',
      subtext: `it's "quoted"`,
      cta: 'Go >',
    });
    expect((await sharp(out.square).metadata()).format).toBe('png');
  });
});
