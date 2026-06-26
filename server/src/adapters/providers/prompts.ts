import type { StyleSpec } from '../../domain/style/styleSpec.js';

export function buildImagePrompt(style: StyleSpec): string {
  const palette = style.palette.length > 0 ? ` Color palette: ${style.palette.join(', ')}.` : '';
  return (
    `Place the provided product naturally into a new scene matching this style: ` +
    `${style.descriptor}.${palette} Photorealistic, professional product photography. ` +
    `Keep the product itself unchanged, sharp, and the clear focal point of the composition.`
  );
}

export function buildPostPrompt(style: StyleSpec): string {
  return (
    `Write a social-media post (Instagram/Facebook style) for the product in this image, ` +
    `matching the visual style "${style.descriptor}". Return JSON with: a short punchy ` +
    `"title" (<=80 chars), an engaging "caption" of 1–2 sentences (<=400 chars), and ` +
    `"hashtags" — an array of 3–6 relevant hashtags, each starting with #.`
  );
}

export function buildStylePrompt(): string {
  return (
    `Analyze the reference image(s) and describe their shared visual style in one vivid ` +
    `sentence (mood, lighting, composition, materials). Return JSON: ` +
    `{ "descriptor": string, "palette": string[] } where palette is up to 6 hex colors.`
  );
}

export function buildJudgePrompt(style: StyleSpec): string {
  return (
    `Rate from 0 to 1 how well this image matches the style "${style.descriptor}" while ` +
    `keeping the product faithful and prominent. Return JSON: { "score": number }.`
  );
}
