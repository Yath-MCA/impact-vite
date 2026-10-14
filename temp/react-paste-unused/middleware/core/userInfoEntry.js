import { ADMIN_CONFIG, ROLE_IDS } from '../api/roleCatalog.js';
import { formatTrackRoleName } from '../session/sessionSource.js';

let currentUserInfo = null;

export function setUserInfo(info) {
  currentUserInfo = Object.freeze({ ...info });
  if (typeof window !== 'undefined') {
    window.USER_INFO = { ...currentUserInfo };
  }
}

export function getUserInfo() {
  return currentUserInfo;
}

export function clearUserInfo() {
  currentUserInfo = null;
  if (typeof window !== 'undefined') {
    window.USER_INFO = {};
  }
}

function resolveRoleMeta(roleId, roleName) {
  const meta = ROLE_IDS[roleId] || {};
  const resolvedName = roleName || meta.name || '';
  const shortname = meta.shortname || '';
  return { meta, resolvedName, shortname };
}

/** Legacy USER_INFO object from normalized session source (pure). */
export function toLegacyUserInfo(src) {
  const { meta, resolvedName, shortname } = resolveRoleMeta(src.roleId, src.roleName);
  const mailId = src.emailId || '';
  const mailIdPrefix = mailId ? mailId.split('@')[0].trim() : '';
  const isCoRole = shortname === 'CO' || resolvedName === 'Collator';
  const isAuthor = shortname === 'AU' || resolvedName === 'Author';
  const isAdmin =
    (mailIdPrefix && ADMIN_CONFIG.ADMIN_USER_IDs.includes(mailIdPrefix)) ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('xmleditor:admin') === 'superadmin');

  const tourMeta = meta.tour;
  const tour = typeof tourMeta === 'object' ? tourMeta.OUP || tourMeta.LWW || '1' : tourMeta || '1';

  return {
    MAIL_ID: mailId,
    USER_ID: src.raw._id || src.raw.userid || src.raw.USER_ID || '',
    HAS_COLLAB_WORKFLOW: src.isCollab,
    MAIL_ID_PREFIX: mailIdPrefix,
    ROLE_ID: src.roleId,
    ROLE_NAME: resolvedName,
    SELECTOR_BKUP_FOLDER: meta.backup || '',
    SELECTOR_SHOW_HIDE: meta.SelectorAttribute || '',
    IS_CO_ROLE: isCoRole,
    TRACK_ROLE_NAME: formatTrackRoleName(resolvedName),
    IS_AUTHOR: isAuthor,
    IS_ADMIN: isAdmin,
    TOUR: tour
  };
}
