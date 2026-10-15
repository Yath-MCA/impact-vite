import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initQueryCommentSystem,
  ensureQueryModule,
  QueryBaseModule,
  getQueryDialogModuleConfig,
} from '../../src/pages/editor/modules/shared/query-comment-system/index.js';
import { E6_MAIN_PATHS } from '../../src/pages/editor/manifest.js';
import { readEditorVersionFromRepo } from '../../scripts/resolveEditorVersion.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('QCS ESM island', () => {
  it('exports initQueryCommentSystem from index', () => {
    expect(typeof initQueryCommentSystem).toBe('function');
    expect(typeof ensureQueryModule).toBe('function');
    expect(typeof QueryBaseModule).toBe('function');
    expect(typeof getQueryDialogModuleConfig).toBe('function');
    const cfg = getQueryDialogModuleConfig();
    expect(cfg.name).toBe('queryDialog');
    expect(cfg.moduleClass?.name).toBe('QueryDialogModule');
  });

  it('packed e6_main.min.js excludes QCS markers when present', () => {
    const version = readEditorVersionFromRepo(root);
    const packed = path.join(
      root,
      'public',
      'assets',
      version,
      'js',
      'e6_main.min.js'
    );
    if (!fs.existsSync(packed)) {
      expect(E6_MAIN_PATHS.some((p) => p.includes('query-comment'))).toBe(
        false
      );
      return;
    }
    const text = fs.readFileSync(packed, 'utf8');
    expect(text).not.toMatch(/query-comment-system/);
    expect(text).not.toMatch(/class QueryBaseModule/);
    expect(text).not.toMatch(/getQueryDialogModuleConfig/);
  });
});
