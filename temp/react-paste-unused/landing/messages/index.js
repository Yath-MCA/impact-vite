import { interpolateMessageEntry } from '../../../services/alerts/interpolateAlertText.js';
import { showAlertMessage } from '../../../services/alerts/showAlertMessage.js';
import { LANDING_MESSAGES } from './landingMessages.js';
import { LandingMessageKey } from './landingMessageKeys.js';

function cloneEntry(entry) {
  return JSON.parse(JSON.stringify(entry));
}

/**
 * Unique landing getter — never use LANDING_MESSAGES[key] outside this module.
 * @returns {object|null} cloned, interpolated entry
 */
export function getLandingMessage(key, vars = {}) {
  const entry = LANDING_MESSAGES[key];
  if (!entry) {
    console.warn(`[landing/messages] unknown key: ${key}`);
    return null;
  }
  return interpolateMessageEntry(cloneEntry(entry), vars);
}

/**
 * Unique landing shower.
 * @returns {Promise<{ isConfirmed: boolean, isDismissed?: boolean }>}
 */
export function showLandingMessage(key, vars = {}, swalOverrides = {}) {
  const entry = getLandingMessage(key, vars);
  if (!entry) {
    return Promise.resolve({ isConfirmed: false, isDismissed: true });
  }
  return showAlertMessage(entry, {}, swalOverrides);
}

export { LandingMessageKey, LANDING_MESSAGES };
