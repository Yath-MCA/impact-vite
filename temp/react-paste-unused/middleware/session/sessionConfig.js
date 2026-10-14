const runtimeWindow = typeof window !== 'undefined' ? window : { ENV: {} };

const env = (windowKey, viteKey, defaultVal) => {
  if (runtimeWindow.ENV && runtimeWindow.ENV[windowKey] !== undefined) {
    return runtimeWindow.ENV[windowKey];
  }
  return import.meta.env[viteKey] ?? defaultVal;
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return fallback;
};

export const sessionConfig = {
  pollIntervalMs: toNumber(env('SESSION_POLL_INTERVAL_MS', 'VITE_SESSION_POLL_INTERVAL_MS', 1000), 1000),
  pollTimeoutMs: toNumber(env('SESSION_POLL_TIMEOUT_MS', 'VITE_SESSION_POLL_TIMEOUT_MS', 45000), 45000),
  requestThrottleMinutes: toNumber(env('SESSION_REQUEST_THROTTLE_MINUTES', 'VITE_SESSION_REQUEST_THROTTLE_MINUTES', 30), 30),
  enableCollabBypass: toBoolean(env('SESSION_ENABLE_COLLAB_BYPASS', 'VITE_SESSION_ENABLE_COLLAB_BYPASS', false), false),
  skipVerifyOnPollGrant: toBoolean(env('SESSION_SKIP_VERIFY_ON_POLL_GRANT', 'VITE_SESSION_SKIP_VERIFY_ON_POLL_GRANT', true), true),
  landingRetryMax: toNumber(env('SESSION_LANDING_RETRY_MAX', 'VITE_SESSION_LANDING_RETRY_MAX', 3), 3),
  idleTimeoutMs: toNumber(env('SESSION_IDLE_TIMEOUT_MS', 'VITE_SESSION_IDLE_TIMEOUT_MS', 30 * 60 * 1000), 30 * 60 * 1000),
  editorPath: env('SESSION_EDITOR_PATH', 'VITE_SESSION_EDITOR_PATH', '/editor'),
  validateUrlPath: env('SESSION_VALIDATE_URL_PATH', 'VITE_SESSION_VALIDATE_URL_PATH', '/validateurl'),

  // impact-session-service (Phase 07 of session-service-master-plan.md) — additive to the
  // linksharing gateway above, not a replacement (Phase 20: Migration & Cutover).
  sessionServiceApiBase: env('SESSION_SERVICE_API_BASE', 'VITE_SESSION_SERVICE_API_BASE', 'http://localhost:8092'),
  sessionServiceWsBase: env('SESSION_SERVICE_WS_BASE', 'VITE_SESSION_SERVICE_WS_BASE', 'ws://localhost:8092')
};

export default sessionConfig;
