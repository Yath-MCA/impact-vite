import { describe, expect, it } from 'vitest';
import { EDITOR_CSS_PATHS, EDITOR_JS_PATHS } from '../../src/pages/editor/manifest.js';

describe('editor manifest', () => {
  it('has unique js paths and includes editorBootInit once', () => {
    expect(new Set(EDITOR_JS_PATHS).size).toBe(EDITOR_JS_PATHS.length);
    expect(EDITOR_JS_PATHS.filter((p) => p.includes('demo.js')).length).toBe(1);
    expect(EDITOR_JS_PATHS.some((p) => p.endsWith('editorBootInit.js'))).toBe(true);
    expect(EDITOR_JS_PATHS.some((p) => p.endsWith('editor_open.js'))).toBe(true);
  });

  it('lists e6_main css once each', () => {
    expect(EDITOR_CSS_PATHS).toEqual([
      'static/css/main.css',
      'static/css/media_query.css',
      'static/css/editorLayout.css',
    ]);
  });
});
