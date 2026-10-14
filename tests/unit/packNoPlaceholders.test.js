import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { E6_COMMON_PATHS, E6_MAIN_PATHS } from '../../src/pages/editor/manifest.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const legacyRoot = path.join(root, 'src/legacy');

describe('Slice A sources', () => {
  it('have no gulp ${{ placeholders', () => {
    const paths = [...E6_COMMON_PATHS, ...E6_MAIN_PATHS];
    const hits = [];
    for (const rel of paths) {
      const abs = path.join(legacyRoot, rel);
      const text = fs.readFileSync(abs, 'utf8');
      if (/\$\{\{/.test(text)) hits.push(rel);
    }
    expect(hits).toEqual([]);
  });
});
