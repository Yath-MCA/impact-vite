import { showAlertMessage } from '../../../shared/alerts/showAlertMessage.js';
import { LANDING_MESSAGES } from './landingMessages.js';
import { LandingMessageKey } from './landingMessageKeys.js';

function interpolate(text, vars = {}) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : `{{${key}}}`
  );
}

export function getLandingMessage(key, vars = {}) {
  const entry = LANDING_MESSAGES[key];
  if (!entry) {
    console.warn(`[landing/messages] unknown key: ${key}`);
    return null;
  }
  return {
    ...entry,
    text: interpolate(entry.text, vars),
    title: interpolate(entry.title, vars),
  };
}

export function showLandingMessage(key, vars = {}, swalOverrides = {}) {
  const entry = getLandingMessage(key, vars);
  if (!entry) {
    return Promise.resolve({ isConfirmed: false, isDismissed: true });
  }
  return showAlertMessage(entry, {}, swalOverrides);
}

export { LandingMessageKey, LANDING_MESSAGES };
