import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseLangResponseText } from '../../src/pages/editor/parseLangFile.js';

describe('parseLangResponseText', () => {
  it('parses comment + trailing-comma en assignment', () => {
    const text = `/*
      copyright
    */
en = {
  "a": 1,
};`;
    expect(parseLangResponseText(text, 'en')).toEqual({ a: 1 });
  });

  it('parses compact fr assignment', () => {
    expect(parseLangResponseText('fr={ "b": 2 }', 'fr')).toEqual({ b: 2 });
  });

  it('parses real packed en.js', () => {
    const enPath = resolve('src/legacy/js/lang/en.js');
    const text = readFileSync(enPath, 'utf8');
    const lang = parseLangResponseText(text, 'en');
    expect(lang).toBeTypeOf('object');
    expect(lang.common.ok).toBe('OK');
    expect(lang.editor).toMatch(/IMPACT/);
  });
});
