import { describe, it, expect } from 'vitest';
import { buildImagePrompt } from './prompts.js';
import { buildStyleSpec } from '../../domain/style/styleSpec.js';

describe('buildImagePrompt', () => {
  it('includes the palette when the style has one', () => {
    const prompt = buildImagePrompt(
      buildStyleSpec({ descriptor: 'studio', palette: ['#111', '#eee'] }),
    );
    expect(prompt).toContain('Color palette: #111, #eee');
    expect(prompt).toContain('studio');
  });

  it('omits the palette line when the palette is empty', () => {
    const prompt = buildImagePrompt(buildStyleSpec({ descriptor: 'studio' }));
    expect(prompt).not.toContain('Color palette');
  });
});
