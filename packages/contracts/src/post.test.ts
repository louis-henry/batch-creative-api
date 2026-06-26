import { describe, it, expect } from 'vitest';
import { socialPostSchema } from './post.js';

const valid = {
  title: 'Fresh drop',
  caption: 'Made for the season.',
  hashtags: ['#new', '#style'],
};

describe('socialPostSchema', () => {
  it('accepts a well-formed post', () => {
    expect(socialPostSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty title or caption', () => {
    expect(socialPostSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
    expect(socialPostSchema.safeParse({ ...valid, caption: '' }).success).toBe(false);
  });

  it('accepts up to ten hashtags but rejects more', () => {
    expect(socialPostSchema.safeParse({ ...valid, hashtags: Array(10).fill('#x') }).success).toBe(
      true,
    );
    expect(socialPostSchema.safeParse({ ...valid, hashtags: Array(11).fill('#x') }).success).toBe(
      false,
    );
  });

  it('rejects an over-long title', () => {
    expect(socialPostSchema.safeParse({ ...valid, title: 'x'.repeat(81) }).success).toBe(false);
  });
});
