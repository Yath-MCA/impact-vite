import { describe, expect, it } from 'vitest';
import { applyLegacyApiPaths } from '../../src/pages/editor/legacyApiPaths.js';

describe('legacyApiPaths', () => {
  it('builds API_GET_DOCS from API_PATH', () => {
    const g = { API_PATH: '/xmleditor/' };
    applyLegacyApiPaths(g);
    expect(g.API_GET_DOCS).toBe('/xmleditor/getdocs');
    expect(String(g.API_GET_DOCS).endsWith('getdocs')).toBe(true);
  });

  it('does not overwrite an existing API_* value', () => {
    const g = {
      API_PATH: '/xmleditor/',
      API_GET_DOCS: '/custom/getdocs',
    };
    applyLegacyApiPaths(g);
    expect(g.API_GET_DOCS).toBe('/custom/getdocs');
  });
});
