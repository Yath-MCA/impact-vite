/**
 * Resolve landing header/footer/favicon URLs from public assets.
 * Do not glob or bundle client logos — fetch only the files for this proof's client (and dtd).
 */

export const LOGO_PUBLIC_BASE = '/assets/logo/clients';
export const DEFAULT_IMPACT_LOGO_SRC = '/assets/logo/IMPACT_5_4.svg';

export function isJournalDtd(dtd) {
  return String(dtd || '').toLowerCase().includes('jats');
}

/** Bare filename → public clients folder; absolute path unchanged. */
export function resolveLogoSrc(name) {
  if (!name) return DEFAULT_IMPACT_LOGO_SRC;
  if (name.startsWith('/')) return name;
  return `${LOGO_PUBLIC_BASE}/${name}`;
}

/**
 * Prefer journal-* slots when dtd is JATS and those keys exist (e.g. TNF).
 * @param {object} logoConfig landing-meta.json logo.<client>
 * @param {'header-logo'|'footer-logo'|'favicon'} slot
 */
export function pickLogoSlot(logoConfig, slot, dtd) {
  if (!logoConfig) return undefined;
  const journalSlot = `journal-${slot}`;
  if (isJournalDtd(dtd) && logoConfig[journalSlot]?.name) {
    return logoConfig[journalSlot];
  }
  return logoConfig[slot];
}

export function resolveFaviconHref(logoConfig, dtd) {
  const slot = pickLogoSlot(logoConfig, 'favicon', dtd);
  return resolveLogoSrc(slot?.name);
}

export function listLandingLogoSrcs(logoConfig, dtd) {
  const header = pickLogoSlot(logoConfig, 'header-logo', dtd);
  const footer = pickLogoSlot(logoConfig, 'footer-logo', dtd);
  const favicon = pickLogoSlot(logoConfig, 'favicon', dtd);
  return [...new Set([
    resolveLogoSrc(header?.name),
    resolveLogoSrc(footer?.name),
    resolveLogoSrc(favicon?.name)
  ])];
}
