/**
 * Parse LangConfig XHR responseText (en.js / fr.js style).
 * Handles copyright block comments, `lang = { ... };`, and trailing commas.
 *
 * @param {string} responseText
 * @param {string} [langKey='en'] expected assignment name (DEFAULT)
 * @returns {object}
 */
export function parseLangResponseText(responseText, langKey = 'en') {
  const key = String(langKey || 'en');
  let text = String(responseText || '');
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');
  text = text.trim();

  const assign = new RegExp('^' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*=\\s*');
  if (!assign.test(text)) {
    throw new Error('Lang file missing "' + key + ' =" assignment');
  }
  text = text.replace(assign, '').trim();
  if (text.endsWith(';')) text = text.slice(0, -1).trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('Lang file missing object literal');
  }
  const literal = text.slice(start, end + 1);
  // Object literal may include trailing commas — not valid JSON.parse.
  return new Function('return (' + literal + ');')();
}
