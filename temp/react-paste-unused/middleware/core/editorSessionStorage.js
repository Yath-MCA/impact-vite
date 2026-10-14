import { LOCAL_STORAGE_KEYS, SESSION_STORAGE_KEYS } from '../session/sessionConstants.js';
import { getMaintenanceState } from '../landing/maintenanceGuard.js';
import {
  applyLegacyLocalStorage,
  normalizeSessionSource,
  toLegacyLocalStorageWrites,
  toSessionContext
} from '../session/sessionSource.js';
import { clearUserInfo, setUserInfo, toLegacyUserInfo } from './userInfoEntry.js';

/** In-memory validate payload until grant+verify succeeds (legacy pendingCommitResData). */
let pendingValidateResponse = null;

export function getPendingValidateResponse() {
  return pendingValidateResponse;
}

export function setPendingValidateResponse(response) {
  pendingValidateResponse = response ?? null;
}

export function clearPendingValidateResponse() {
  pendingValidateResponse = null;
}

/** Persist validate URL access key so editor can renew tab lock with key match. */
export function setValidateAccessKey(accessKey) {
  if (typeof sessionStorage === 'undefined') return;
  if (accessKey) {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.VALIDATE_KEY, String(accessKey));
  }
}

export function getValidateAccessKey() {
  if (typeof sessionStorage === 'undefined') return '';
  return sessionStorage.getItem(SESSION_STORAGE_KEYS.VALIDATE_KEY) || '';
}

export function clearValidateAccessKey() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(SESSION_STORAGE_KEYS.VALIDATE_KEY);
}

/** Remove idle-session alert from stored redirect URL (legacy LandingPage parity). */
export function stripIdleSessionSignOffAlert(url) {
  if (!url || url.indexOf('idle_session_log_out') === -1) return url;
  return url.replace('&alert=idle_session_log_out', '');
}

/** Clear handshake keys so a fresh validateurl can start after logout. */
export function clearEditorSessionHandshake({ clearValidateKey = false } = {}) {
  if (typeof sessionStorage === 'undefined') return;
  const docId = sessionStorage.getItem(SESSION_STORAGE_KEYS.DOC_ID);
  if (docId) {
    sessionStorage.removeItem(`${SESSION_STORAGE_KEYS.SESSION_ID_PREFIX}${docId}`);
  }
  sessionStorage.removeItem(SESSION_STORAGE_KEYS.DOC_ID);
  sessionStorage.removeItem(SESSION_STORAGE_KEYS.REDIRECT);
  clearUserInfo();
  if (clearValidateKey) {
    clearValidateAccessKey();
  }
}

export function getEditorSessionContextFromStorage() {
  if (typeof sessionStorage === 'undefined') {
    return { docId: '', sessionId: '', accessKey: '' };
  }
  const docId = sessionStorage.getItem(SESSION_STORAGE_KEYS.DOC_ID) || '';
  const sessionId = docId
    ? sessionStorage.getItem(`${SESSION_STORAGE_KEYS.SESSION_ID_PREFIX}${docId}`) || ''
    : '';
  const accessKey = getValidateAccessKey();
  return { docId, sessionId, accessKey };
}

export function getValidateResponse() {
  if (pendingValidateResponse) return pendingValidateResponse;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEYS.VALIDATE_RESPONSE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Persist validate response only after session grant (or explicit force). */
export function setValidateResponse(response, { persist = false } = {}) {
  pendingValidateResponse = response ?? null;
  if (!persist || !response) return;
  sessionStorage.setItem(SESSION_STORAGE_KEYS.VALIDATE_RESPONSE, JSON.stringify(response));
}

/**
 * Legacy-compatible localStorage commit used by editor SharedKeyService / StorageService.
 */
export function saveLegacyLocalStorageData(resData) {
  if (!resData) return { ok: false, reason: 'missing_res_data' };

  const src = normalizeSessionSource(resData);
  const emailto = src.raw.emailto;

  if (!(src.apikey || (src.docId && emailto))) {
    return { ok: false, reason: 'missing_apikey_or_email' };
  }

  applyLegacyLocalStorage(toLegacyLocalStorageWrites(src));
  return { ok: true, docid: src.docId };
}

export function setSessionStartTime(docId, value) {
  if (typeof sessionStorage === 'undefined' || !docId || value == null) return;
  sessionStorage.setItem(`${SESSION_STORAGE_KEYS.SESSION_START_PREFIX}${docId}`, String(value));
}

export function getSessionStartTime(docId) {
  if (typeof sessionStorage === 'undefined' || !docId) return '';
  return sessionStorage.getItem(`${SESSION_STORAGE_KEYS.SESSION_START_PREFIX}${docId}`) || '';
}

export function getStoredEditorSession(docId) {
  if (typeof sessionStorage === 'undefined') {
    return {
      docId: '',
      sessionId: '',
      sessionStartTime: '',
      validateKey: '',
      validateResponse: null
    };
  }

  const resolvedDocId = docId || sessionStorage.getItem(SESSION_STORAGE_KEYS.DOC_ID) || '';
  const sessionId = resolvedDocId
    ? sessionStorage.getItem(`${SESSION_STORAGE_KEYS.SESSION_ID_PREFIX}${resolvedDocId}`) || ''
    : '';

  return {
    docId: resolvedDocId,
    sessionId,
    sessionStartTime: getSessionStartTime(resolvedDocId),
    validateKey: getValidateAccessKey(),
    validateResponse: getValidateResponse()
  };
}

export function commitSessionForEditor({
  docId,
  sessionId,
  sessionStartTime,
  redirectUrl,
  validateResponse,
  accessKey
} = {}) {
  const response = validateResponse || getValidateResponse();
  const resData = response?.data ?? response ?? null;

  if (response) {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.VALIDATE_RESPONSE, JSON.stringify(response));
    pendingValidateResponse = response;
  }

  if (resData) {
    const payload = { ...resData, docid: docId || resData.docid };
    const legacyResult = saveLegacyLocalStorageData(payload);
    if (legacyResult.ok) {
      const src = normalizeSessionSource(payload, response);
      setUserInfo(toLegacyUserInfo(src));
    }
  }

  const resolvedDocId = docId || resData?.docid || resData?.identifier;
  if (resolvedDocId && sessionId) {
    sessionStorage.setItem(
      `${SESSION_STORAGE_KEYS.SESSION_ID_PREFIX}${resolvedDocId}`,
      String(sessionId)
    );
    sessionStorage.setItem(SESSION_STORAGE_KEYS.DOC_ID, String(resolvedDocId));
  }

  if (resolvedDocId && sessionStartTime != null && sessionStartTime !== '') {
    setSessionStartTime(resolvedDocId, sessionStartTime);
  }

  if (accessKey) {
    setValidateAccessKey(accessKey);
  }

  if (redirectUrl) {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.REDIRECT, redirectUrl);
  }

  return { ok: true, docId: resolvedDocId };
}

export function persistMaintenanceStart() {
  if (typeof sessionStorage === 'undefined') return false;
  const state = getMaintenanceState();
  if (!state.ON && !state.active) return false;
  const numeric = Number(state.START ?? state.start);
  if (!Number.isFinite(numeric) || numeric <= 0) return false;
  sessionStorage.setItem(SESSION_STORAGE_KEYS.MAINTENANCE_START, String(numeric));
  return true;
}

/**
 * Clear stale per-doc localStorage for a non-Collator re-visit (legacy clearDocScopedLocalData).
 */
export function clearDocScopedLocalData(docId) {
  if (!docId || typeof localStorage === 'undefined') return 0;
  const suffix = `:${docId}`;
  const exactKeys = [
    `${LOCAL_STORAGE_KEYS.SHARED_PREFIX}${docId}`,
    `${LOCAL_STORAGE_KEYS.SHARED_PREFIX}${docId}:compact`,
    `${LOCAL_STORAGE_KEYS.SHARED_PREFIX}${docId}:source`,
    `${LOCAL_STORAGE_KEYS.USERNAME_PREFIX}${docId}`,
    `${LOCAL_STORAGE_KEYS.USER_ID_PREFIX}${docId}`,
    `${LOCAL_STORAGE_KEYS.USER_ROLE_PREFIX}${docId}`,
    `${LOCAL_STORAGE_KEYS.USER_COLOR_PREFIX}${docId}`,
    `${LOCAL_STORAGE_KEYS.COLLAB_ENABLED_PREFIX}${docId}`
  ];
  const toRemove = new Set(exactKeys);
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('xmleditor:') && key.endsWith(suffix)) {
      toRemove.add(key);
    }
  }
  toRemove.forEach((key) => localStorage.removeItem(key));
  return toRemove.size;
}

export function buildSessionContextFromDocData(docData, overrides = {}) {
  const src = normalizeSessionSource(docData, getValidateResponse());
  return toSessionContext(src, overrides);
}
