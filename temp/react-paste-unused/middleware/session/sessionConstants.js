


export const SESSION_PROCESS = {
  CHECK: 'check',
  CLOSE: 'close',
  UPDATE_REQSTATUS_TIME: 'update_reqstatus_time',
  UPDATE_DOCSTATUS_REQSTATUS_INSERT_TIME: 'update_docstatus_reqstatus_insert_time',
  GET_REQUESTSTATUS_PROCESS: 'getrequeststatus_process'
};

/** Close-session remarks used by editor manual logout */
export const SESSION_REMARKS = {
  USER_MANUAL_LOGOUT: 'user_manual_logout',
  USER_ACCEPT_OPEN_DOC: 'user_accept_access_btn',
  USER_ENTER_VALID_EMAIL: 'user_enter_valid_email',
  LANDING_RETRY: 'landing_retry'
};

export const SESSION_GUARD_REMARKS = {
  MISSING_DOC_ID: 'guard_fail:missing_doc_id',
  MISSING_SHARE_KEY: 'guard_fail:missing_share_key',
  DOCID_MISMATCH: 'guard_fail:share_key_docid_mismatch',
  LOCALHOST_BYPASS_PREFIX: 'localhost_bypass:'
};


export const DOC_STATUS = {
  ACTIVE: '1',
  INACTIVE: '0',
  STALE: '8'
};

export const REQUEST_STATUS = {
  PENDING: '1',
  DELIVERED_TO_EDITOR: '2',
  RESOLVED: '3',
  REJECTED: '4',
  STALE: '7'
};

/** sessionStorage keys used by landing/editor handshake */
export const SESSION_STORAGE_KEYS = {
  VALIDATE_RESPONSE: 'xmleditor:validateuserpost',
  VALIDATE_KEY: 'xmleditor:validatekey',
  REDIRECT: 'redirect',
  SESSION_ID_PREFIX: 'xmleditor:sessionid:',
  SESSION_START_PREFIX: 'xmleditor:sessionstart:',
  DOC_ID: 'docid',
  LANDING_TAB_ID: 'xmleditor:landing:tabid',
  MAINTENANCE_START: 'MAINTENANCE_START'
};

/**
 * localStorage keys aligned with legacy saveLocalStorageData / StorageService.
 * SHARED_PREFIX + docId stores the full shared payload JSON.
 */
export const LOCAL_STORAGE_KEYS = {
  APP_KEY: 'xmleditor:appkey',
  API_KEY: 'xmleditor:apikey',
  SHARED_PREFIX: 'xmleditor:shared:',
  USERNAME_PREFIX: 'xmleditor:username:',
  USER_ID_PREFIX: 'xmleditor:userid:',
  USER_ROLE_PREFIX: 'xmleditor:userRole:',
  USER_COLOR_PREFIX: 'xmleditor:usercolor:',
  COLLAB_ENABLED_PREFIX: 'xmleditor:collabEnabled:',
  /** Heartbeat ownership lock for same-browser validateurl tabs */
  TAB_LOCK_PREFIX: 'xmleditor:tablock:',
  /** Legacy LandingPage probe / reply keys (interop) */
  OPEN_PAGES: 'openpages',
  PAGE_AVAILABLE: 'page_available',
  LOGIN_USERNAME: 'xmleditor:login_username',
  LOGIN_USERID: 'xmleditor:login_userid'
};

/** Same-browser tab presence timing / channel */
export const TAB_PRESENCE = {
  CHANNEL: 'impact:validateurl-tab',
  HEARTBEAT_MS: 2000,
  STALE_TTL_MS: 5000,
  PROBE_WAIT_MS: 400
};

export const DEFAULT_EDITOR_ROLE = 'Author';
