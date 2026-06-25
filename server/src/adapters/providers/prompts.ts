import type { StyleSpec } from '../../domain/style/styleSpec.js';

export function buildImagePrompt(style: StyleSpec): string {
  const palette = style.palette.length > 0 ? ` Color palette: ${style.palette.join(', ')}.` : '';
  return (
    `Place the provided product naturally into a new scene matching this style: ` +
    `${style.descriptor}.${palette} Photorealistic professional product photography. ` +
    `Keep the product itself unchanged, sharp, and prominent. Leave clear negative ` +
    `space in the lower third for a text overlay.`
  );
}

export function buildCopyPrompt(style: StyleSpec): string {
  return (
    `You write punchy social-media ad copy. Given the product image and the visual ` +
    `style "${style.descriptor}", return JSON with a headline (<=60 chars), a one-line ` +
    `subtext (<=120 chars), and a call to action (<=24 chars).`
  );
}

export function buildJudgePrompt(style: StyleSpec): string {
  return (
    `Rate from 0 to 1 how well this image matches the style "${style.descriptor}" while ` +
    `keeping the product faithful and prominent. Return JSON: { "score": number }.`
  );
}
