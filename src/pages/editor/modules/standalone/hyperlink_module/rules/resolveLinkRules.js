/**
 * Pure merge helpers for hyperlink link-rules.json.
 * Builds one client instance at resolve time — no pre-expansion of every client.
 */

export const EMERGENCY_DEFAULT = {
  'body-url': 'extUri',
  'reference-url': 'extUri',
  'doi-full': 'extDoi',
  'doi-partial': 'extDoi',
  email: 'email'
};

const ATTR_ALIASES = {
  doiPartialExtDoi: 'extDoi',
  doiPartialUri: 'uri'
};

/**
 * Map JSON area tokens to REFERENCE_ELEMENT_ATTRS keys.
 * @param {string} token
 * @returns {string}
 */
export function normalizeAreaToken(token) {
  if (!token || typeof token !== 'string') return 'extUri';
  return ATTR_ALIASES[token] || token;
}

/**
 * Gate special-case PI by optional journals allowlist.
 * @param {{ builder?: string, journals?: string[] }|null|undefined} specialCase
 * @param {string} [journalCode]
 * @returns {boolean}
 */
export function isSpecialCaseAllowed(specialCase, journalCode) {
  if (!specialCase || typeof specialCase !== 'object') return false;
  const list = specialCase.journals;
  if (!Array.isArray(list) || list.length === 0) return true;
  const code = String(journalCode || '').toUpperCase();
  return list.map((j) => String(j).toUpperCase()).includes(code);
}

/**
 * Merge DEFAULT (+ DEFAULT_JOURNAL) with sparse client overrides for one call.
 * @param {object|null|undefined} raw - Parsed link-rules.json
 * @param {{ clientCode?: string, dtd?: string, isJournal?: boolean }} [options]
 * @returns {object} area → token (plus optional special-case object); never includes `dtd`
 */
export function resolveClientInstance(raw, options = {}) {
  const { clientCode, dtd = 'JATS', isJournal = false } = options;
  const baseSource = (raw && raw.DEFAULT) || EMERGENCY_DEFAULT;
  let base = { ...baseSource };
  if (isJournal && raw && raw.DEFAULT_JOURNAL) {
    base = { ...base, ...raw.DEFAULT_JOURNAL };
  }
  if (!raw || !raw.clients || !clientCode) return base;

  const upper = String(clientCode).toUpperCase();
  const entry = raw.clients[upper] || raw.clients[clientCode];
  if (!entry) return base;

  if (entry.dtd && String(entry.dtd).toUpperCase() !== String(dtd).toUpperCase()) {
    return base;
  }

  const { dtd: _dtd, ...overrides } = entry;
  return { ...base, ...overrides };
}
