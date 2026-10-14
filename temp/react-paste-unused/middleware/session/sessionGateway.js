import { apiService, API_ENDPOINTS } from '../api/apiService.js';
import { devLog } from '../../shared/utils/devLogger.js';
import { sessionConfig } from './sessionConfig.js';
import { LOCAL_STORAGE_KEYS, REQUEST_STATUS, SESSION_REMARKS } from './sessionConstants.js';
import { isLocalHost } from './runtimeFlags.js';
import {
  buildCheckPayload,
  buildVerifyQuery,
  buildUpdateReqStatusTimePayload,
  buildStaleCleanupPayload,
  buildPollPayload,
  buildClosePayload,
  isActiveSessionRecord,
  minutesSince,
  generateSessionId,
  generateRequestId,
  getSessionStartTime
} from './sessionPayloads.js';

import { commitSessionForEditor, persistMaintenanceStart, stripIdleSessionSignOffAlert } from '../core/editorSessionStorage.js';

import {
  isCheckErrorResponse,
  isConflictShapedCheckResponse,
  shouldRetryLandingVerify
} from './sessionCheckClassify.js';

import {recoverDbPayload} from "./payload.jsx"


function enrichLinkSharePayload(payload, ctx) {
  const next = { ...payload };
  if (ctx.username && !next.username) next.username = ctx.username;
  if (ctx.role && !next.role) next.role = ctx.role;
  if (ctx.rolename && !next.rolename) next.rolename = ctx.rolename;
  if (ctx.collaborative === '1' || ctx.collaborative === true) {
    next.collaborative = '1';
  }
  delete next._w;
  delete next._r;
  return next;
}

async function postLinkShare(payload, ctx) {
  return apiService.makeRequest(API_ENDPOINTS.LINK_SHARE, enrichLinkSharePayload(payload, ctx));
}

async function postGetDocs(query) {
  return apiService.makeRequest(API_ENDPOINTS.GET_DOCS, query);
}

function readShareKeyFromLocalStorage(docId) {
  if (!docId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEYS.SHARED_PREFIX}${docId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const sharedDocId = String(parsed.docid || parsed.docId || '');
    if (sharedDocId && sharedDocId !== String(docId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function hasUsableShareKey(ctx) {
  if (!ctx?.docId) return false;
  if (ctx.client || ctx.username || ctx.rolename) return true;
  return Boolean(readShareKeyFromLocalStorage(ctx.docId));
}

function withLocalhostVerifyBypass(failed, ctx) {
  if (!failed || failed.ok) return failed;
  if (!isLocalHost()) return failed;
  if (!hasUsableShareKey(ctx)) return failed;

  const remarks =
    failed.reason === 'no_active_row'
      ? 'localhost_bypass:no_linkshare_row'
      : `localhost_bypass:verify_failed:${failed.reason || 'unknown'}`;

  devLog.warn('[verifySession]', remarks, failed.reason);
  return {
    ...failed,
    ok: true,
    bypassed: true,
    remarks
  };
}

export async function recoverEditorSessionByDocId(docId) {
  if (!docId) {
    return {
      ok: false,
      reason: 'no_doc_id',
      message: 'Missing document id.'
    };
  }

  try {
    const paylod = recoverDbPayload(docId);    
    const response = await postGetDocs(paylod);
    const rows = Array.isArray(response?.data)
      ? response.data
      : response?.data
        ? [response.data]
        : [];

    if (!rows.length) {
      return {
        ok: false,
        reason: 'no_document',
        message: 'Document session data was not found.'
      };
    }

    return {
      ok: true,
      docData: rows[0]
    };
  } catch {
    return {
      ok: false,
      reason: 'network_error',
      message: 'Unable to recover document session.'
    };
  }
}

export async function verifySession(ctx) {
  
  if (!ctx?.docId || !ctx?.sessionId) {
    return withLocalhostVerifyBypass({ ok: false, reason: 'missing_expected_fields' }, ctx);
  }

  let response;
  try {
    response = await postGetDocs(buildVerifyQuery(ctx));
  } catch {
    return withLocalhostVerifyBypass({ ok: false, reason: 'network_error' }, ctx);
  }

  const rows = Array.isArray(response?.data) ? response.data : [];

  if (rows.length === 0) {
    return withLocalhostVerifyBypass({ ok: false, reason: 'no_active_row', rows }, ctx);
  }
  if (rows.length > 1) {
    return withLocalhostVerifyBypass({ ok: false, reason: 'multiple_active', rows }, ctx);
  }

  const row = rows[0];
  if (!isActiveSessionRecord(row, ctx)) {
    return withLocalhostVerifyBypass({ ok: false, reason: 'record_mismatch', row, rows }, ctx);
  }

  return { ok: true, row, rows, bypassed: false };
}

export async function checkSession(ctx) {
  const sessionId = ctx.sessionId || generateSessionId();
  const sessionStartTime = ctx.sessionStartTime || getSessionStartTime();
  const payload = buildCheckPayload({
    ...ctx,
    sessionId,
    sessionStartTime,
    remarks: ctx.remarks || SESSION_REMARKS.USER_ACCEPT_OPEN_DOC
  });

  const response = await postLinkShare(payload, ctx);
  return {
    response,
    sessionId,
    sessionStartTime
  };
}

export async function sendAccessRequest(ctx, checkResponse) {
  const now = Date.now();
  const requestId = ctx.requestId || generateRequestId();
  const requeststatus = checkResponse?.requeststatus;
  const requestSendTime = checkResponse?.request_send_time;
  const requestid = checkResponse?.requestid;
  const throttle = sessionConfig.requestThrottleMinutes;

  if (String(requeststatus) === REQUEST_STATUS.PENDING) {
    if (minutesSince(requestSendTime) > throttle) {
      const sessionStartTime = String(now);
      const response = await postLinkShare(
        buildStaleCleanupPayload({ ...ctx, sessionId: ctx.sessionId, sessionStartTime }),
        ctx
      );
      return { type: 'stale_cleanup', response, requestId, sessionStartTime };
    }
    return { type: 'try_again', reason: 'pending_within_throttle' };
  }

  if (
    String(requeststatus) === REQUEST_STATUS.REJECTED &&
    requestid != null && requestid !== 0 && requestid !== '0' &&
    requestSendTime != null && requestSendTime !== 0 && requestSendTime !== '0'
  ) {
    if (minutesSince(requestSendTime) > throttle) {
      const response = await postLinkShare(
        buildUpdateReqStatusTimePayload({
          ...ctx,
          requestId,
          requestSendTime: String(now),
          oldrequestid: String(requestid),
          oldrequest_send_time: String(requestSendTime)
        }),
        ctx
      );
      return { type: 'resend', response, requestId };
    }
    return { type: 'try_again', reason: 'rejected_within_throttle' };
  }

  const response = await postLinkShare(
    buildUpdateReqStatusTimePayload({
      ...ctx,
      requestId,
      requestSendTime: String(now)
    }),
    ctx
  );
  return { type: 'new_request', response, requestId };
}

export async function pollAccessRequest(ctx) {
  const sessionStartTime = ctx.grantSessionStartTime || ctx.sessionStartTime || getSessionStartTime();
  const payload = buildPollPayload({
    ...ctx,
    sessionStartTime
  });
  const response = await postLinkShare(payload, ctx);
  return { response, sessionStartTime };
}

function isCollabBypassEligible(ctx) {
  if (!sessionConfig.enableCollabBypass) return false;
  const collaborative = ctx?.collaborative;
  return collaborative === '1' || collaborative === true || String(collaborative).toLowerCase() === 'yes';
}

export async function retryLandingSessionCheck(ctx, options = {}) {
  const maxAttempts = Math.max(
    1,
    Number(options.maxAttempts ?? sessionConfig.landingRetryMax ?? 3) || 3
  );
  let lastVerify = { ok: false, reason: 'no_active_row' };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { response } = await checkSession({
      ...ctx,
      remarks: SESSION_REMARKS.LANDING_RETRY
    });

    if (isCheckErrorResponse(response)) {
      lastVerify = { ok: false, reason: 'check_error_response', response };
      continue;
    }

    lastVerify = await verifySession({
      docId: ctx.docId,
      sessionId: ctx.sessionId,
      sessionStartTime: ctx.grantSessionStartTime || ctx.sessionStartTime,
      rolename: ctx.rolename,
      username: ctx.username
    });

    if (lastVerify.ok) {
      return { ok: true, verify: lastVerify, attempts: attempt };
    }

    if (!shouldRetryLandingVerify(lastVerify.reason)) {
      return { ok: false, verify: lastVerify, attempts: attempt };
    }
  }

  return { ok: false, verify: lastVerify, attempts: maxAttempts };
}

export async function completeGrant(ctx, options = {}) {
  const skipVerify = options.skipVerify === true;

  if (!skipVerify) {
    let verify = await verifySession({
      docId: ctx.docId,
      sessionId: ctx.sessionId,
      sessionStartTime: ctx.grantSessionStartTime || ctx.sessionStartTime,
      rolename: ctx.rolename,
      username: ctx.username
    });

    if (!verify.ok && shouldRetryLandingVerify(verify.reason) && options.skipRetry !== true) {
      const retried = await retryLandingSessionCheck(ctx, options);
      if (!retried.ok) {
        return { ok: false, verify: retried.verify || verify };
      }
      verify = retried.verify;
    } else if (!verify.ok) {
      return { ok: false, verify };
    }
  }

  persistMaintenanceStart();
  commitSessionForEditor({
    docId: ctx.docId,
    sessionId: ctx.sessionId,
    redirectUrl: typeof window !== 'undefined' ? stripIdleSessionSignOffAlert(window.location.href) : '',
    validateResponse: options.validateResponse
  });

  return { ok: true };
}

export async function loginFromLanding(docData, options = {}) {
  const overrides = {};
  if (options.username) overrides.username = options.username;
  if (options.remarks) overrides.remarks = options.remarks;
  const baseCtx = options.buildContext(docData, overrides);
  const { response, sessionId, sessionStartTime } = await checkSession(baseCtx);
  const ctx = { ...baseCtx, sessionId, sessionStartTime };
  const r = response?.r;

  if (response == null) {
    return { status: 'error', ctx, message: 'Empty session check response.' };
  }

  if (r == 1 || (r == 0 && isCollabBypassEligible(ctx) && isConflictShapedCheckResponse(response))) {
    const grant = await completeGrant(ctx, { skipVerify: false });
    if (grant.ok) return { status: 'granted', ctx };
    return { status: 'verify_failed', ctx, verify: grant.verify, checkResponse: response };
  }

  if (r == 0) {
    if (isCheckErrorResponse(response) || !isConflictShapedCheckResponse(response)) {
      return {
        status: 'error',
        ctx,
        checkResponse: response,
        message: response?.message || response?.error || 'Unable to start session.'
      };
    }
    return { status: 'blocked', ctx, checkResponse: response };
  }

  if (r == 2) {
    return { status: 'denied', ctx, message: response?.remarks || 'NIL' };
  }

  return { status: 'unknown', ctx, checkResponse: response };
}

export async function continueBlockedSession(ctx, checkResponse) {
  const sendResult = await sendAccessRequest(ctx, checkResponse);

  if (sendResult.type === 'try_again') {
    return { status: 'try_again', reason: sendResult.reason };
  }

  if (sendResult.type === 'stale_cleanup') {
    if (sendResult.response?.r == 1) {
      const nextCtx = {
        ...ctx,
        sessionStartTime: sendResult.sessionStartTime,
        grantSessionStartTime: sendResult.sessionStartTime
      };
      const grant = await completeGrant(nextCtx, { skipVerify: false });
      if (grant.ok) return { status: 'granted', ctx: nextCtx };
      return { status: 'verify_failed', ctx: nextCtx, verify: grant.verify };
    }
    return { status: 'error', message: 'Unable to recover stale session request.' };
  }

  if (sendResult.response?.r != 1) {
    return { status: 'error', message: 'Unable to send access request.' };
  }

  return {
    status: 'waiting',
    ctx: { ...ctx, requestId: sendResult.requestId },
    waitMs: sessionConfig.pollTimeoutMs
  };
}

export async function pollAndResolve(ctx) {
  const { response } = await pollAccessRequest(ctx);
  const r = response?.r;

  if (r == 1) {
    const grant = await completeGrant(
      { ...ctx, grantSessionStartTime: ctx.sessionStartTime },
      { skipVerify: sessionConfig.skipVerifyOnPollGrant }
    );
    if (grant.ok) return { status: 'granted', ctx };
    return { status: 'verify_failed', ctx, verify: grant.verify };
  }

  if (r == 2) {
    return { status: 'denied', message: response?.remarks || 'NIL' };
  }

  return { status: 'try_again' };
}

/**
 * Editor manual logout — POST linksharing process=close.
 * @returns {Promise<{ ok: boolean, response?: object, message?: string }>}
 */
export async function closeSessionFromEditor(ctx = {}) {
  if (!ctx.docId) {
    return { ok: false, message: 'Missing document id for logout.' };
  }

  try {
    const response = await postLinkShare(buildClosePayload(ctx), ctx);
    if (response?.r == 1) {
      return { ok: true, response };
    }
    return {
      ok: false,
      response,
      message: response?.remarks || 'Unable to close session.'
    };
  } catch (err) {
    return {
      ok: false,
      message: err?.message || 'Unable to close session.'
    };
  }
}
