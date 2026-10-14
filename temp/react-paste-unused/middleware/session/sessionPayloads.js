import {
  DOC_STATUS,
  REQUEST_STATUS,
  SESSION_REMARKS,
  SESSION_PROCESS
} from './sessionConstants.js';

export function generateSessionId() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

export function generateRequestId() {
  return String(Math.floor(100000000 + Math.random() * 900000000));
}

export function getSessionStartTime() {
  return String(Date.now());
}

export function buildBaseLinkSharePayload(ctx = {}) {
  const payload = {
    tbl: 'linksharing',
    docid: ctx.docId || ctx.docid || '',
    client: ctx.client || '',
    username: ctx.username || '',
    role: ctx.role || ctx.roleid || '',
    rolename: ctx.rolename || '',
    roleid: ctx.roleid || ctx.role || '',
    identifier: ctx.identifier || '',
    dtd: ctx.dtd || '',
    linkinfo: ctx.linkinfo || '',
    type: ctx.type || '',
    projecttitle: ctx.projecttitle || '',
    vendor: ctx.vendor || '',
    shorttitle: ctx.shorttitle || ''
  };

  if (ctx.collaborative !== undefined && ctx.collaborative !== null && ctx.collaborative !== '') {
    payload.collaborative = ctx.collaborative;
  }

  return payload;
}

function omitEmptyStrings(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== '')
  );
}

export function buildCheckPayload(ctx) {
  const payload = {
    ...buildBaseLinkSharePayload(ctx),
    process: SESSION_PROCESS.CHECK,
    session_id: String(ctx.sessionId),
    session_start_time: String(ctx.sessionStartTime || getSessionStartTime()),
    remarks: ctx.remarks || SESSION_REMARKS.USER_ACCEPT_OPEN_DOC
  };
  if (ctx.tabid) payload.tabid = String(ctx.tabid);
  return omitEmptyStrings(payload);
}

export function buildVerifyQuery(ctx) {
  return {
    tbl: 'linksharing',
    docid: ctx.docId,
    find: {
      docid: ctx.docId,
      rolename: ctx.rolename,
      username: ctx.username,
      docstatus: DOC_STATUS.ACTIVE,
      session_end_time: '0'
    },
    length: 10,
    filter: [
      'docid', 'docstatus', 'session_id', 'session_start_time',
      'session_end_time', 'requeststatus', 'request_send_time', 'requestid'
    ]
  };
}

export function buildUpdateReqStatusTimePayload(ctx) {
  const payload = {
    ...buildBaseLinkSharePayload(ctx),
    process: SESSION_PROCESS.UPDATE_REQSTATUS_TIME,
    requeststatus: REQUEST_STATUS.PENDING,
    request_send_time: String(ctx.requestSendTime || Date.now()),
    requestid: String(ctx.requestId)
  };
  if (ctx.oldrequestid) payload.oldrequestid = String(ctx.oldrequestid);
  if (ctx.oldrequest_send_time) payload.oldrequest_send_time = String(ctx.oldrequest_send_time);
  return omitEmptyStrings(payload);
}

export function buildStaleCleanupPayload(ctx) {
  return omitEmptyStrings({
    ...buildBaseLinkSharePayload(ctx),
    process: SESSION_PROCESS.UPDATE_DOCSTATUS_REQSTATUS_INSERT_TIME,
    session_id: String(ctx.sessionId),
    session_start_time: String(ctx.sessionStartTime || getSessionStartTime()),
    docstatus: DOC_STATUS.STALE,
    requeststatus: REQUEST_STATUS.STALE
  });
}

export function buildPollPayload(ctx) {
  return omitEmptyStrings({
    ...buildBaseLinkSharePayload(ctx),
    process: SESSION_PROCESS.GET_REQUESTSTATUS_PROCESS,
    session_id: String(ctx.sessionId),
    requestid: String(ctx.requestId),
    session_start_time: String(ctx.sessionStartTime || getSessionStartTime())
  });
}

/** Editor manual logout — closes active linksharing session. */
export function buildClosePayload(ctx = {}) {
  const payload = {
    ...buildBaseLinkSharePayload(ctx),
    process: SESSION_PROCESS.CLOSE,
    session_end_time: String(ctx.sessionEndTime || Date.now()),
    remarks: ctx.remarks || SESSION_REMARKS.USER_MANUAL_LOGOUT
  };
  if (ctx.sessionId) payload.session_id = String(ctx.sessionId);
  return omitEmptyStrings(payload);
}

export function isActiveSessionRecord(record, expected) {
  if (!record || !expected?.sessionId) return false;

  const serverSessionId = String(record.session_id || '').trim();
  const sessionEndTime = String(record.session_end_time || '').trim();
  const serverDocId = String(record.docid || '').trim();
  const expectedSessionId = String(expected.sessionId).trim();
  const expectedDocId = String(expected.docId || '').trim();

  if (serverDocId && expectedDocId && serverDocId !== expectedDocId) return false;
  if (sessionEndTime && sessionEndTime !== '0') return false;
  if (String(record.docstatus || '') !== DOC_STATUS.ACTIVE) return false;
  if (serverSessionId && serverSessionId !== expectedSessionId) return false;

  if (expected.sessionStartTime) {
    const serverStart = String(record.session_start_time || '').trim();
    const expectedStart = String(expected.sessionStartTime).trim();
    if (serverStart && expectedStart && serverStart !== expectedStart) return false;
  }

  return true;
}

export function minutesSince(timestamp) {
  if (timestamp == null || timestamp === '' || timestamp === 0 || timestamp === '0') {
    // Treat missing/corrupt timestamps as older than any throttle window.
    return Number.POSITIVE_INFINITY;
  }
  const value = parseInt(timestamp, 10);
  if (!Number.isFinite(value)) return Number.POSITIVE_INFINITY;
  return (Date.now() - value) / 60000;
}
