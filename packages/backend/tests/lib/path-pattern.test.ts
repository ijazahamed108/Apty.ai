import { describe, it, expect } from 'vitest';
import { matchesPathPattern } from '../../src/lib/path-pattern.js';

describe('matchesPathPattern', () => {
  it('matches wildcard pattern', () => {
    expect(matchesPathPattern('/any/path', '*')).toBe(true);
  });

  it('matches SQL LIKE prefix pattern', () => {
    expect(matchesPathPattern('/login/callback', '/login%')).toBe(true);
    expect(matchesPathPattern('/logout', '/login%')).toBe(false);
  });

  it('matches exact path', () => {
    expect(matchesPathPattern('/dashboard', '/dashboard')).toBe(true);
  });
});
