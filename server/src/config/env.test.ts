import { describe, it, expect } from 'vitest';
import { loadEnv } from './env.js';

const keys = { OPENROUTER_API_KEY: 'or', GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o' };

describe('loadEnv', () => {
  it('applies defaults for PORT, PUBLIC_BASE_URL, and CHAOS', () => {
    const env = loadEnv(keys);
    expect(env.PORT).toBe(8787);
    expect(env.CHAOS).toBe(false);
    expect(env.PUBLIC_BASE_URL).toBe('http://localhost:8787');
  });

  it('coerces PORT to a number and parses CHAOS to a boolean', () => {
    const env = loadEnv({ ...keys, PORT: '3000', CHAOS: 'true' });
    expect(env.PORT).toBe(3000);
    expect(env.CHAOS).toBe(true);
  });

  it('throws naming the missing key when a required value is absent', () => {
    expect(() => loadEnv({ GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o' })).toThrow(
      /OPENROUTER_API_KEY/,
    );
  });

  it('rejects an invalid PORT', () => {
    expect(() => loadEnv({ ...keys, PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadEnv({ ...keys, PORT: '-1' })).toThrow(/PORT/);
    expect(() => loadEnv({ ...keys, PORT: '0' })).toThrow(/PORT/);
  });

  it('rejects a malformed PUBLIC_BASE_URL', () => {
    expect(() => loadEnv({ ...keys, PUBLIC_BASE_URL: 'not-a-url' })).toThrow(/PUBLIC_BASE_URL/);
  });
});
