/**
 * Lightweight HTML sanitizer for landing welcome text.
 * Strips script/style tags and on* attributes. Not a full XSS suite.
 */
export function sanitizeHtml(dirty) {
  if (dirty == null || typeof dirty !== 'string') return '';
  let html = dirty;
  html = html.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/javascript:/gi, '');
  return html;
}
