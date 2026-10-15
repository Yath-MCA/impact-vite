import { describe, expect, it } from 'vitest';
import {
  EDITOR_CSS_PATHS,
  EDITOR_JS_PATHS,
  E6_MAIN_PATHS,
  EDITOR_VENDOR_JS_PATHS,
  EDITOR_VENDOR_CSS_PATHS,
  EDITOR_PAGE_CSS_PATHS,
  EDITOR_COMMON_CSS_PATHS,
} from '../../src/pages/editor/manifest.js';

describe('editor manifest', () => {
  it('has unique js paths and includes editorBootInit once', () => {
    expect(new Set(EDITOR_JS_PATHS).size).toBe(EDITOR_JS_PATHS.length);
    expect(EDITOR_JS_PATHS.filter((p) => p.includes('demo.js')).length).toBe(1);
    expect(EDITOR_JS_PATHS.some((p) => p.endsWith('editorBootInit.js'))).toBe(
      true
    );
    expect(EDITOR_JS_PATHS.some((p) => p.endsWith('editor_open.js'))).toBe(
      true
    );
  });

  it('keeps QCS out of classic e6_main (ESM island)', () => {
    expect(
      E6_MAIN_PATHS.some((p) => p.includes('query-comment-system'))
    ).toBe(false);
    expect(EDITOR_JS_PATHS.some((p) => p.includes('query-comment-system'))).toBe(
      false
    );
  });

  it('loads initial helpers from initial_helpers/ and app js from js/', () => {
    expect(
      EDITOR_JS_PATHS.some(
        (p) => p === 'initial_helpers/_initialGlobalVaribale.js'
      )
    ).toBe(true);
    expect(EDITOR_JS_PATHS.some((p) => p.startsWith('js/_initial'))).toBe(
      false
    );
    expect(EDITOR_JS_PATHS.some((p) => p === 'js/editor_open.js')).toBe(true);
  });

  it('keeps vendor inventory non-empty and without blanks or dual jquery/bootstrap', () => {
    expect(EDITOR_VENDOR_JS_PATHS.every((p) => p.trim().length > 0)).toBe(true);
    expect(EDITOR_VENDOR_CSS_PATHS.every((p) => p.trim().length > 0)).toBe(
      true
    );
    expect(EDITOR_VENDOR_JS_PATHS).toContain('lib/moment.min.js');
    expect(EDITOR_VENDOR_JS_PATHS).toContain('lib/tippy.min.js');
    expect(EDITOR_VENDOR_JS_PATHS).toContain('lib/axios.min.js');
    expect(EDITOR_VENDOR_JS_PATHS).not.toContain('lib/jquery/jquery.min.js');
    expect(EDITOR_VENDOR_JS_PATHS).not.toContain(
      'lib/bootstrap/js/bootstrap.bundle.min.js'
    );
    expect(EDITOR_VENDOR_CSS_PATHS).not.toContain(
      'lib/bootstrap/css/bootstrap.min.css'
    );
  });

  it('orders CSS as vendor then page then common', () => {
    expect(EDITOR_PAGE_CSS_PATHS).toEqual([
      '_CSS_UI/main.css',
      '_CSS_UI/editorLayout.css',
    ]);
    expect(EDITOR_COMMON_CSS_PATHS).toEqual([
      'common/styles/media_query.css',
      'common/styles/preloader.css',
    ]);
    expect(EDITOR_CSS_PATHS).toEqual([
      ...EDITOR_VENDOR_CSS_PATHS,
      ...EDITOR_PAGE_CSS_PATHS,
      ...EDITOR_COMMON_CSS_PATHS,
    ]);
  });
});
