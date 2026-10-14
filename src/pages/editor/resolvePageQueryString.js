/**
 * Resolve the page query string for classic search URLs and HashRouter hashes.
 * Prefer location.search when present; else query after '?' in location.hash.
 *
 * @param {string} [search] location.search (e.g. '?docid=x' or '')
 * @param {string} [hash] location.hash (e.g. '#/editor?docid=x')
 * @returns {string} raw query without leading '?'
 */
export function resolvePageQueryString(search, hash) {
  const s = String(search || '');
  if (s.startsWith('?') && s.length > 1) return s.slice(1);
  if (s.length > 0 && !s.startsWith('?')) return s;

  const h = String(hash || '');
  const q = h.indexOf('?');
  if (q >= 0) return h.slice(q + 1);
  return '';
}

/**
 * Parse a raw query string into a plain object.
 * @param {string} [pageQuery]
 * @returns {Record<string, string>}
 */
export function parsePageQueryParams(pageQuery) {
  const params = {};
  const query = String(pageQuery || '');
  if (!query) return params;

  if (typeof URLSearchParams !== 'undefined') {
    // Use entries() — URLSearchParams.forEach can throw
    // "callback is no longer runnable" across Vite/classic realms.
    for (const [key, value] of new URLSearchParams(query).entries()) {
      params[key] = value;
    }
    return params;
  }

  const pairs = query.includes('&') ? query.split('&') : [query];
  pairs.forEach((pair) => {
    const parts = pair.split('=');
    if (parts.length === 2) {
      try {
        params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
      } catch {
        params[parts[0]] = parts[1];
      }
    }
  });
  return params;
}
