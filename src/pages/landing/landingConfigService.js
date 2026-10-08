import axios from 'axios';

/**
 * Resolves per-client landing branding beyond bundled landing-meta.json.
 *
 * 1. Embedded LANDING_CONFIG on urlvalidity branding
 * 2. Optional sqlite wrapper URL
 * 3. json-fallback (null config)
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
 * @param {string} clientKey
 * @param {object} [branding]
 * @returns {Promise<{ source: string, config: object|null }>}
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
