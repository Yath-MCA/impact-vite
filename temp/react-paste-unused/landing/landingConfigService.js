import axios from 'axios';

/**
 * Resolves per-client landing page branding (theme/logo/favicon) beyond the
 * bundled landing-meta.json fallback.
 *
 * Fetch order:
 *   1. Existing Java urlvalidity endpoint — if the response already embeds a
 *      LANDING_CONFIG/landing_config branding payload, use it directly.
 *   2. New sqlite-backed endpoint on the graphql-wrapper dev server, called
 *      directly via axios.
 *   3. Neither available -> caller keeps rendering from landing-meta.json.
 */

const runtimeWindow = typeof window !== 'undefined' ? window : {};
const LANDING_CONFIG_WRAPPER_URL =
  runtimeWindow.ENV?.LANDING_CONFIG_WRAPPER_URL || 'http://localhost:4444';

function extractJavaEndpointConfig(branding) {
  const raw = branding?.LANDING_CONFIG ?? branding?.landing_config;
  if (!raw) return null;

  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

async function fetchFromSqliteWrapper(clientKey) {
  try {
    const response = await axios.get(
      `${LANDING_CONFIG_WRAPPER_URL}/api/landing-config/${encodeURIComponent(clientKey)}`,
      { timeout: 3000 }
    );
    return response.data ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {string} clientKey lower-cased client key (e.g. "oup", "lww")
 * @param {object} [branding] branding block from the urlvalidity response, if any
 * @returns {Promise<{ source: 'java-endpoint'|'sqlite'|'json-fallback', config: object|null }>}
 */
export async function resolveLandingConfigOverride(clientKey, branding) {
  const fromJavaEndpoint = extractJavaEndpointConfig(branding);
  if (fromJavaEndpoint) {
    return { source: 'java-endpoint', config: fromJavaEndpoint };
  }

  const fromSqlite = await fetchFromSqliteWrapper(clientKey);
  if (fromSqlite) {
    return { source: 'sqlite', config: fromSqlite };
  }

  return { source: 'json-fallback', config: null };
}
