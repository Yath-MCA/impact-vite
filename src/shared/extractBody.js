export function extractBodyHtml(html) {
  if (!html) return '';
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (match) return match[1].trim();
  return html.trim();
}
