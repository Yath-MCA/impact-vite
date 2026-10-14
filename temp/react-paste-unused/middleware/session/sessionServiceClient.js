/**
 * REST client for the new impact-session-service (Phase 06/07 of
 * session-service-master-plan.md). Additive to sessionGateway.js's legacy
 * linksharing poll flow — never a replacement (Phase 20: Migration & Cutover).
 * Every function returns { ok, ... } / { ok: false, message }, mirroring
 * sessionGateway.js's never-throw convention.
 */
import axios from 'axios';
import { sessionConfig } from './sessionConfig.js';

const axiosStatusConfig = {
  validateStatus: () => true
};

async function postJson(path, body) {
  try {
    const response = await axios.post(`${sessionConfig.sessionServiceApiBase}${path}`, body, {
      headers: { 'Content-Type': 'application/json' },
      ...axiosStatusConfig
    });
    if (response.status < 200 || response.status >= 300) {
      const payload = response.data && typeof response.data === 'object' ? response.data : null;
      return { ok: false, status: response.status, message: payload?.message || 'Session service request failed.' };
    }
    const data = response.status === 204 || response.status === 202 ? null : response.data ?? null;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, message: 'Session service unreachable.' };
  }
}

async function getJson(path) {
  try {
    const response = await axios.get(`${sessionConfig.sessionServiceApiBase}${path}`, axiosStatusConfig);
    if (response.status < 200 || response.status >= 300) {
      return { ok: false, status: response.status, message: 'Session service request failed.' };
    }
    const data = response.data;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, message: 'Session service unreachable.' };
  }
}

export function openSession(docId, { mode, userId, clientName } = {}) {
  return postJson(`/api/session/${encodeURIComponent(docId)}/open`, { mode, userId, clientName });
}

export function sendHeartbeat(docId, userId) {
  return postJson(`/api/session/${encodeURIComponent(docId)}/heartbeat`, { userId });
}

export function closeSession(docId, userId, reason) {
  return postJson(`/api/session/${encodeURIComponent(docId)}/close`, { userId, reason });
}

export function requestAccess(docId, requesterUserId) {
  return postJson(`/api/session/${encodeURIComponent(docId)}/request`, { requesterUserId });
}

export function respondToAccess(docId, { decision, requesterUserId, remark } = {}) {
  return postJson(`/api/session/${encodeURIComponent(docId)}/respond`, { decision, requesterUserId, remark });
}

export function getSessionHistory(docId) {
  return getJson(`/api/session/${encodeURIComponent(docId)}/history`);
}
