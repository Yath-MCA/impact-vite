import { ROLE_IDS } from '../api/roleCatalog.js';
import {
  DEFAULT_EDITOR_ROLE,
  LOCAL_STORAGE_KEYS
} from './sessionConstants.js';

export function resolveEmailId(resData = {}, { selectedEmail } = {}) {
  if (selectedEmail) return selectedEmail;
  const emailto = resData.emailto;
  if (Array.isArray(emailto)) {
    if (emailto.length === 1) return emailto[0];
    return resData.username || resData.mail_id || resData.MAIL_ID || emailto[0] || '';
  }
  return emailto || resData.username || resData.mail_id || resData.MAIL_ID || '';
}

export function isCollabEnabled(resData = {}) {
  const client = String(resData.client || '').toLowerCase();
  const collaborative = String(resData.collaborative || '').toLowerCase();
  return client === 'oso' && collaborative === 'yes';
}

export function resolveUserColor(resData = {}, emailId, isCollab) {
  const status = String(resData.status || '').toLowerCase();
  const isActive = !status || status === 'active' || status === '1';
  if (!isActive) return 0;

  if (isCollab && Array.isArray(resData.emailto)) {
    const index = resData.emailto.indexOf(emailId);
    return index >= 0 ? index + 1 : 55;
  }
  return resData.sharedcolor ?? 99;
}

export function formatTrackRoleName(roleName) {
  return `Co ${roleName || ''}`.trimEnd();
}

export function shouldValidateMultiUser(resData = {}) {
  const status = String(resData?.status || resData?.raw?.status || '').toLowerCase();
  const isActive = status === 'active';
  return Array.isArray(resData?.emailto) && resData.emailto.length > 1 && isActive;
}

export function validateEmailInput(value, emailto) {
  return new Promise((resolve) => {
    if (!value || !String(value).trim()) {
      resolve('Email address is required.');
      return;
    }

    const lowercaseValue = String(value).toLowerCase().trim();
    const isValidEmail = Array.isArray(emailto)
      ? emailto.map((email) => String(email).toLowerCase()).includes(lowercaseValue)
      : String(emailto || '').toLowerCase() === lowercaseValue;

    if (isValidEmail) {
      resolve();
    } else {
      resolve('The provided email is not valid or has not been configured in the system.');
    }
  });
}

export function applySelectedEmailToResData(resData, email) {
  if (!resData || !email) return resData;
  return {
    ...resData,
    emailto: email,
    username: email,
    mail_id: email,
    MAIL_ID: email
  };
}

/**
 * Single canonical merge of docData + validate response.
 * docData fields take precedence over validate resData.
 */
export function normalizeSessionSource(docData = {}, validateResponse = null, options = {}) {
  const resData = validateResponse?.data ?? validateResponse ?? {};
  const merged = { ...resData, ...docData };

  const docId = merged.docid || merged.docId || merged.identifier || '';
  const emailId = resolveEmailId(merged, options);
  const roleId = merged.roleid || merged.role || merged.ROLE_ID || '';
  const roleName = merged.rolename || merged.ROLENAME || ROLE_IDS[roleId]?.name || '';
  const isCollab = isCollabEnabled(merged);
  const userColor = resolveUserColor(merged, emailId, isCollab);

  return {
    docId,
    apikey: merged.apikey || '',
    emailId,
    roleId,
    roleName,
    isCollab,
    userColor,
    client: merged.client || '',
    identifier: merged.identifier || '',
    dtd: merged.dtd || '',
    linkinfo: merged.linkinfo || '',
    type: merged.type || '',
    projecttitle: merged.projecttitle || '',
    vendor: merged.vendor || '',
    shorttitle: merged.shorttitle || '',
    collaborative: merged.collaborative,
    raw: merged
  };
}

/** Gateway / linksharing session context (pure). */
export function toSessionContext(src, overrides = {}) {
  return {
    docId: src.docId,
    client: src.client,
    username: src.emailId || '',
    role: src.roleId,
    rolename: src.roleName,
    roleid: src.roleId,
    identifier: src.identifier,
    dtd: src.dtd,
    linkinfo: src.linkinfo,
    type: src.type,
    projecttitle: src.projecttitle,
    vendor: src.vendor,
    shorttitle: src.shorttitle,
    collaborative: src.collaborative,
    ...overrides
  };
}

/** Legacy localStorage key/value pairs (pure, testable without DOM). */
export function toLegacyLocalStorageWrites(src) {
  const writes = [{ key: LOCAL_STORAGE_KEYS.APP_KEY, value: 'xmleditor' }];

  if (src.apikey) {
    writes.push({ key: LOCAL_STORAGE_KEYS.API_KEY, value: String(src.apikey) });
  }

  if (!src.docId) {
    return writes;
  }

  const docId = src.docId;
  const userId = src.raw._id || src.raw.userid || src.raw.USER_ID || '';

  writes.push(
    { key: `${LOCAL_STORAGE_KEYS.SHARED_PREFIX}${docId}`, value: JSON.stringify(src.raw) },
    { key: `${LOCAL_STORAGE_KEYS.USERNAME_PREFIX}${docId}`, value: String(src.emailId || '') },
    {
      key: `${LOCAL_STORAGE_KEYS.USER_ROLE_PREFIX}${docId}`,
      value: String(
        src.raw.role || src.raw.roleid || src.raw.ROLE_ID || src.roleId || DEFAULT_EDITOR_ROLE
      )
    },
    { key: `${LOCAL_STORAGE_KEYS.USER_COLOR_PREFIX}${docId}`, value: String(src.userColor) },
    {
      key: `${LOCAL_STORAGE_KEYS.COLLAB_ENABLED_PREFIX}${docId}`,
      value: src.isCollab ? 'true' : 'false'
    }
  );

  if (userId) {
    writes.push({ key: `${LOCAL_STORAGE_KEYS.USER_ID_PREFIX}${docId}`, value: String(userId) });
  }

  return writes;
}

export function applyLegacyLocalStorage(writes) {
  if (typeof localStorage === 'undefined') return;
  for (const { key, value } of writes) {
    localStorage.setItem(key, value);
  }
}
