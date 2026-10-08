import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../../src/shared/utils/sanitizeHtml.js';

describe('sanitizeHtml', () => {
  it('strips script tags and event handlers', () => {
    const out = sanitizeHtml('<p onclick="alert(1)">Hi</p><script>x()</script>');
    expect(out).toContain('Hi');
    expect(out).not.toMatch(/script/i);
    expect(out).not.toMatch(/onclick/i);
  });

  it('returns empty string for non-strings', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });
});
