import { describe, expect, it } from 'vitest';
import { applyLegacyGlobals } from '../../src/pages/editor/initial_helpers/legacyGlobals.js';
import { FetchService } from '../../src/shared/httpService.js';

describe('applyLegacyGlobals', () => {
  it('exposes FetchService constructor on window', () => {
    applyLegacyGlobals();
    expect(typeof window.FetchService).toBe('function');
    expect(window.FetchService).toBe(FetchService);
  });

  it('exposes id helpers, API paths, ROLE_IDS, GET_JSON, and callajax', () => {
    window.$ = { ajaxSetup() {}, ajax() {} };
    window.jQuery = window.$;
    applyLegacyGlobals();
    expect(typeof window.guid).toBe('function');
    expect(typeof window.d4).toBe('function');
    expect(String(window.API_GET_DOCS || '').endsWith('getdocs')).toBe(true);
    expect(window.ROLE_IDS && window.ROLE_IDS.AU).toBeTruthy();
    expect(typeof window.ADD_DEFAULT_KEYS).toBe('function');
    expect(typeof window.GET_JSON).toBe('function');
    expect(typeof window.commonfn.callajax).toBe('function');
    expect(window.VERSION).toBeTruthy();
  });
});
