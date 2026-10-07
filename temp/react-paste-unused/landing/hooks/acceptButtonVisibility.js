const DEFAULT_ACCEPT_BUTTON_TTL_MS = 5 * 60 * 1000;

/** Resolve accept-button TTL (build-time env, runtime window.ENV, or ?acceptTtlMs= for E2E). */
export function getAcceptButtonTtlMs() {
  if (typeof window !== 'undefined') {
    const fromUrl = new URLSearchParams(window.location.search).get('acceptTtlMs');
    const urlTtl = Number(fromUrl);
    if (Number.isFinite(urlTtl) && urlTtl > 0) return urlTtl;

    if (window.ENV?.VITE_ACCEPT_BUTTON_TTL_MS != null) {
      const runtime = Number(window.ENV.VITE_ACCEPT_BUTTON_TTL_MS);
      if (Number.isFinite(runtime) && runtime > 0) return runtime;
    }
  }

  const configuredTtl = Number(import.meta.env?.VITE_ACCEPT_BUTTON_TTL_MS);
  if (Number.isFinite(configuredTtl) && configuredTtl > 0) {
    return configuredTtl;
  }

  return DEFAULT_ACCEPT_BUTTON_TTL_MS;
}

export const ACCEPT_BUTTON_TTL_MS = DEFAULT_ACCEPT_BUTTON_TTL_MS;

/**
 * Compute whether accept button should show from timer + visibility flags.
 */
export function computeAcceptButtonVisible({
  landingActive = false,
  timerExpired = false,
  tabHidden = false
} = {}) {
  if (!landingActive) return false;
  if (tabHidden) return false;
  if (timerExpired) return false;
  return true;
}
