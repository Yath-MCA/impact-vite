import { describe, expect, it } from 'vitest';
import {
  EDITOR_CSS_PATHS,
  EDITOR_JS_PATHS,
  EDITOR_VENDOR_JS_PATHS,
  EDITOR_PAGE_CSS_PATHS,
  EDITOR_COMMON_CSS_PATHS,
} from '../../src/pages/editor/manifest.js';

describe('editor manifest', () => {
  it('has unique js paths and includes editorBootInit once', () => {
    expect(new Set(EDITOR_JS_PATHS).size).toBe(EDITOR_JS_PATHS.length);
    expect(EDITOR_JS_PATHS.filter((p) => p.includes('demo.js')).length).toBe(1);
    expect(EDITOR_JS_PATHS.some((p) => p.endsWith('editorBootInit.js'))).toBe(true);
    expect(EDITOR_JS_PATHS.some((p) => p.endsWith('editor_open.js'))).toBe(true);
  });

  it('loads initial helpers from initial_helpers/', () => {
    expect(
      EDITOR_JS_PATHS.some((p) => p === 'initial_helpers/_initialGlobalVaribale.js')
    ).toBe(true);
    expect(EDITOR_JS_PATHS.some((p) => p.startsWith('slice_a/_initial'))).toBe(
      false
    );
  });

  it('lists vendor libs then page CSS then common CSS', () => {
    expect(EDITOR_VENDOR_JS_PATHS).toEqual([
      'lib/moment.min.js',
      'lib/tippy.min.js',
    ]);
    expect(EDITOR_PAGE_CSS_PATHS).toEqual([
      '_CSS_UI/main.css',
      '_CSS_UI/editorLayout.css',
    ]);
    expect(EDITOR_COMMON_CSS_PATHS).toEqual([
      'common/styles/media_query.css',
      'common/styles/preloader.css',
    ]);
    expect(EDITOR_CSS_PATHS).toEqual([
      '_CSS_UI/main.css',
      '_CSS_UI/editorLayout.css',
      'common/styles/media_query.css',
      'common/styles/preloader.css',
    ]);
  });
});
