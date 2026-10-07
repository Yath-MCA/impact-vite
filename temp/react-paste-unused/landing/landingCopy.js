import landingMeta from '../../config/landing-meta.json';

const DEFAULT_SUPPORT_EMAIL = 'impact.helpdesk@newgen.co';

function filterLines(list) {
  return (list ?? []).map((line) => String(line).trim()).filter(Boolean);
}

/**
 * Resolve landing copy for a urlvalidity client key (oup, lww, plos, …).
 * Disclaimer and third-party plugin text are shared. Notes never fall back to default.
 */
export function getClientCopy(clientName, meta = landingMeta) {
  const copy = meta.copy || {};
  const common = copy.common || {};
  const clients = copy.clients || {};
  const fallback = clients.default || {};
  const own = clients[clientName] || {};
  const instructions = filterLines(own.instructions);

  return {
    welcome: own.welcome || fallback.welcome || '',
    subtitle: own.subtitle || fallback.subtitle || '',
    title: own.title || fallback.title || 'Instructions',
    instructions: instructions.length ? instructions : filterLines(fallback.instructions),
    notes: filterLines(own.notes),
    supportEmail: own.supportEmail || fallback.supportEmail || DEFAULT_SUPPORT_EMAIL,
    disclaimer: common.disclaimer || '',
    thirdPartyPlugins: common.thirdPartyPlugins || null
  };
}
