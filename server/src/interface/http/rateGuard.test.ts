import { describe, it, expect } from 'vitest';
import { createRateGuard } from './rateGuard.js';

describe('createRateGuard', () => {
  it('allows up to the limit, then blocks within the window', () => {
    const guard = createRateGuard();
    const limit = { limit: 2, windowMs: 1000 };
    expect(guard.allow('k', limit, 0)).toBe(true);
    expect(guard.allow('k', limit, 100)).toBe(true);
    expect(guard.allow('k', limit, 200)).toBe(false);
  });

  it('frees a slot once the window passes', () => {
    const guard = createRateGuard();
    const limit = { limit: 1, windowMs: 1000 };
    expect(guard.allow('k', limit, 0)).toBe(true);
    expect(guard.allow('k', limit, 500)).toBe(false);
    expect(guard.allow('k', limit, 1001)).toBe(true); // first hit aged out
  });

  it('tracks keys independently', () => {
    const guard = createRateGuard();
    const limit = { limit: 1, windowMs: 1000 };
    expect(guard.allow('a', limit, 0)).toBe(true);
    expect(guard.allow('b', limit, 0)).toBe(true);
    expect(guard.allow('a', limit, 0)).toBe(false);
  });

  it('does not count rejected attempts toward the window', () => {
    const guard = createRateGuard();
    const limit = { limit: 1, windowMs: 1000 };
    expect(guard.allow('k', limit, 0)).toBe(true);
    expect(guard.allow('k', limit, 100)).toBe(false);
    // only the allowed hit at t=0 governs, so it frees at t>1000 regardless of the rejects
    expect(guard.allow('k', limit, 1001)).toBe(true);
  });
});
