import { describe, expect, it } from 'vitest';
import { applyLegacyGlobals } from '../../src/pages/editor/legacyGlobals.js';
import { FetchService } from '../../src/shared/httpService.js';

describe('applyLegacyGlobals', () => {
  it('exposes FetchService constructor on window', () => {
    applyLegacyGlobals();
    expect(typeof window.FetchService).toBe('function');
    expect(window.FetchService).toBe(FetchService);
  });
});
