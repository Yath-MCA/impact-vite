import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  E6_COMMON_PATHS,
  E6_MAIN_PATHS,
  MODULE_MAIN_PATHS,
  GLOBAL_CONTEXT_COMMON_PATHS,
  GLOBAL_CONTEXT_EDITOR_PATHS,
  EDITOR_MODULE_PACK_SCRIPTS,
} from '../../src/pages/editor/manifest.js';
import {
  resolveEditorSource,
  expandEditorGlobs,
} from '../../scripts/pack-editor-assets.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function resolveList(relPaths) {
  const out = [];
  for (const raw of relPaths) {
    if (/[*?]/.test(raw)) out.push(...expandEditorGlobs([raw]));
    else out.push(raw);
  }
  return out;
}

describe('Slice A sources', () => {
  it('have no gulp ${{ placeholders', () => {
    const paths = [
      ...E6_COMMON_PATHS,
      ...E6_MAIN_PATHS,
      ...resolveList(MODULE_MAIN_PATHS),
      ...resolveList(GLOBAL_CONTEXT_COMMON_PATHS),
      ...resolveList(GLOBAL_CONTEXT_EDITOR_PATHS),
    ];
    const hits = [];
    for (const rel of paths) {
      const abs = resolveEditorSource(rel);
      if (!fs.existsSync(abs)) {
        hits.push(`MISSING:${rel}`);
        continue;
      }
      const text = fs.readFileSync(abs, 'utf8');
      if (/\$\{\{/.test(text)) hits.push(rel);
    }
    expect(hits).toEqual([]);
  });

  it('declares module pack boot order', () => {
    expect(EDITOR_MODULE_PACK_SCRIPTS).toEqual([
      'module_main.min.js',
      'global_context_common.min.js',
      'global_context_editor.min.js',
    ]);
  });

  it('resolves js, initial_helpers, and vendor lib paths', () => {
    const open = resolveEditorSource('js/editor_open.js');
    expect(open.replace(/\\/g, '/')).toContain(
      'src/pages/editor/js/editor_open.js'
    );
    expect(fs.existsSync(open)).toBe(true);

    const initial = resolveEditorSource(
      'initial_helpers/_initialGlobalVaribale.js'
    );
    expect(initial.replace(/\\/g, '/')).toContain(
      'src/pages/editor/initial_helpers/_initialGlobalVaribale.js'
    );
    expect(fs.existsSync(initial)).toBe(true);

    const moment = resolveEditorSource('lib/moment.min.js');
    expect(moment.replace(/\\/g, '/')).toContain('src/assets/lib/moment.min.js');
    expect(fs.existsSync(moment)).toBe(true);

    const fonts = resolveEditorSource('fonts/fontawesome/css/all.min.css');
    expect(fonts.replace(/\\/g, '/')).toContain(
      'src/assets/fonts/fontawesome/css/all.min.css'
    );
    expect(root).toBeTruthy();
  });
});
