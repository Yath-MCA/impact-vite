import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  E6_COMMON_PATHS,
  E6_MAIN_PATHS,
} from '../../src/pages/editor/manifest.js';
import { resolveEditorSource } from '../../scripts/pack-editor-assets.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('Slice A sources', () => {
  it('have no gulp ${{ placeholders', () => {
    const paths = [...E6_COMMON_PATHS, ...E6_MAIN_PATHS];
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

  it('resolves slice_a, initial_helpers, and vendor lib paths', () => {
    const open = resolveEditorSource('slice_a/editor_open.js');
    expect(open.replace(/\\/g, '/')).toContain(
      'src/pages/editor/slice_a/editor_open.js'
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
    expect(root).toBeTruthy();
  });
});
