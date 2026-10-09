import { describe, expect, it } from 'vitest';
import { resolveEditorVersion } from '../../scripts/resolveEditorVersion.js';

describe('resolveEditorVersion', () => {
  it('prefers env VERSION over package.json', () => {
    expect(resolveEditorVersion({ envVersion: '1.2.3', packageVersion: '0.0.0' })).toBe('1.2.3');
  });

  it('falls back to package.json version', () => {
    expect(resolveEditorVersion({ envVersion: '', packageVersion: '0.0.0' })).toBe('0.0.0');
  });

  it('trims and rejects blank env', () => {
    expect(resolveEditorVersion({ envVersion: '   ', packageVersion: '9.9.9' })).toBe('9.9.9');
  });
});
