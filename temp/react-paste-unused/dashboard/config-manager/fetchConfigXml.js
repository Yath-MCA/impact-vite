import axios from 'axios';

/** Shared XML config loads — dedupes StrictMode remount storms for the same path. */
const xmlInflight = new Map();

/**
 * Load config XML once per path while in flight.
 * Returns a plain result so remounts can safely re-read the body
 * (Response bodies are single-consume).
 */
export function fetchConfigXml(path) {
  const existing = xmlInflight.get(path);
  if (existing) return existing;

  const request = axios.get(path, {
    responseType: 'text',
    validateStatus: () => true
  })
    .then((response) => {
      const ok = response.status >= 200 && response.status < 300;
      const text = ok ? response.data || '' : '';
      return {
        ok,
        status: response.status,
        text
      };
    })
    .finally(() => {
      xmlInflight.delete(path);
    });

  xmlInflight.set(path, request);
  return request;
}
