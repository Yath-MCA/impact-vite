import { describe, expect, it } from 'vitest';
import {
  applyEditorLegacyHelpers,
  isValidVariable,
} from '../../src/pages/editor/editorLegacyHelpers.js';

describe('editorLegacyHelpers', () => {
  it('isValidVariable rejects nullish and empty', () => {
    expect(isValidVariable(null)).toBe(false);
    expect(isValidVariable('')).toBe(false);
    expect(isValidVariable('x')).toBe(true);
  });

  it('assigns helpers on target global', () => {
    const g = {};
    applyEditorLegacyHelpers(g);
    expect(typeof g.isValidVariable).toBe('function');
    expect(g.IS_TRACK_VIEW).toBe(false);
  });
});
