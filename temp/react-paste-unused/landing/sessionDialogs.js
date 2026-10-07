/**
 * Landing session SweetAlert dialogs (legacy LinkSessionSend-style popups).
 * Landing is outside editor ModuleContext — use Swal + landing message catalog.
 */
import { close, Swal } from '../../shared/plugins/sweetalert/index.js';
import { validateEmailInput } from '../../services/session/sessionSource.js';
import {
  LandingMessageKey,
  showLandingMessage
} from './messages/index.js';

export function closeSessionDialogs() {
  close();
}

/**
 * @returns {Promise<boolean>} true if user confirmed Send Request
 */
export async function promptSendAccessRequest() {
  const result = await showLandingMessage(LandingMessageKey.SEND_REQUEST);
  return Boolean(result?.isConfirmed);
}

/**
 * @returns {Promise<boolean>} true if user chose Send Request
 */
export async function promptVerifyFailed(_message, { allowSendRequest = false } = {}) {
  if (allowSendRequest) {
    const result = await showLandingMessage(LandingMessageKey.SEND_REQUEST);
    return Boolean(result?.isConfirmed);
  }
  await showLandingMessage(LandingMessageKey.TRY_AGAIN_LATER);
  return false;
}

/**
 * Opens a non-dismissible waiting popup with a live countdown.
 * Call closeSessionDialogs() when poll finishes.
 *
 * @returns {{ updateSeconds: (n: number) => void, close: () => void }}
 */
export function showSessionWaiting({ seconds = 45, message = 'Waiting for approval…' } = {}) {
  let remaining = Math.max(0, Number(seconds) || 0);

  const renderHtml = (secs) =>
    `<p class="mb-2">${message}</p><p id="session-wait-timer" class="text-2xl font-bold text-blue-600">${secs}s</p>`;

  Swal.fire({
    title: 'Access request sent',
    html: renderHtml(remaining),
    icon: 'info',
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  return {
    updateSeconds(next) {
      remaining = Math.max(0, Number(next) || 0);
      const el = typeof document !== 'undefined'
        ? document.getElementById('session-wait-timer')
        : null;
      if (el) el.textContent = `${remaining}s`;
    },
    close() {
      close();
    }
  };
}

export function showSessionDenied(message) {
  return showLandingMessage(LandingMessageKey.ACCESS_DENIED, {
    find: '%1%',
    replace: message || 'NIL'
  });
}

export function showSessionTryAgain() {
  return showLandingMessage(LandingMessageKey.TRY_AGAIN);
}

export function showSessionTryAgainLater() {
  return showLandingMessage(LandingMessageKey.TRY_AGAIN_LATER);
}

export function showSessionError() {
  return showLandingMessage(LandingMessageKey.TRY_AGAIN_LATER);
}

/** Multi-user collab: prompt user to enter configured email (legacy validateUserEmail). */
export async function promptValidateUserEmail(emailto) {
  const result = await Swal.fire({
    title: 'Validate user',
    input: 'email',
    inputPlaceholder: 'Enter your email address',
    showCancelButton: true,
    allowOutsideClick: false,
    inputValidator: (value) => validateEmailInput(value, emailto)
  });

  if (result.isDismissed || !result.value) {
    return null;
  }

  return String(result.value).trim();
}
