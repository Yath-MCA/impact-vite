import { describe, expect, it } from 'vitest';
import { extractBodyHtml } from '../../src/shared/extractBody.js';

describe('extractBodyHtml', () => {
  it('returns inner body when full document provided', () => {
    const html = `<!DOCTYPE html><html><head><title>X</title></head><body><div id="x">Hi</div></body></html>`;
    expect(extractBodyHtml(html)).toContain('id="x"');
    expect(extractBodyHtml(html)).not.toContain('<head>');
  });

  it('returns fragment as-is when no body tag', () => {
    expect(extractBodyHtml('<section>Hi</section>')).toBe('<section>Hi</section>');
  });
});
