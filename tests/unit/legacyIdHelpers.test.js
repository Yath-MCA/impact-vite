import { describe, expect, it } from 'vitest';
import {
  applyLegacyIdHelpers,
  d4,
  guid,
} from '../../src/pages/editor/legacyIdHelpers.js';

describe('legacyIdHelpers', () => {
  it('d4 returns a 4-digit number', () => {
    const n = d4();
    expect(n).toBeGreaterThanOrEqual(1000);
    expect(n).toBeLessThanOrEqual(9999);
  });

  it('guid returns a hyphenated hex-like string', () => {
    const id = guid();
    expect(id).toMatch(/^[0-9a-f]+-[0-9a-f]+-[0-9a-f]+-[0-9a-f]+-[0-9a-f]+$/i);
  });

  it('applyLegacyIdHelpers exposes helpers on target', () => {
    const g = {};
    applyLegacyIdHelpers(g);
    expect(typeof g.guid).toBe('function');
    expect(typeof g.d4).toBe('function');
    expect(typeof g.getuniqueid).toBe('function');
  });
});
