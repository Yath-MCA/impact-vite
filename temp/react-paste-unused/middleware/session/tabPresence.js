/**
 * Hybrid same-browser tab lock for validateurl / docId.
 * - Primary: localStorage heartbeat ownership
 * - Fast path: BroadcastChannel
 * - Interop: legacy openpages / page_available storage keys
 */
import {
  SESSION_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  TAB_PRESENCE
} from './sessionConstants.js';

const MSG = {
  PROBE: 'probe',
  OCCUPIED: 'occupied',
  ACQUIRED: 'acquired',
  RELEASED: 'released'
};

let heartbeatTimer = null;
let channel = null;
let storageHandler = null;
let pageHideHandler = null;
let heldDocId = null;
let heldKey = null;
let listenerOpts = null;

function now() {
  return Date.now();
}

function lockKey(docId) {
  return `${LOCAL_STORAGE_KEYS.TAB_LOCK_PREFIX}${docId}`;
}

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

export function ensureLandingTabId() {
  if (typeof sessionStorage === 'undefined') return 'server';
  let id = sessionStorage.getItem(SESSION_STORAGE_KEYS.LANDING_TAB_ID);
  if (!id) {
    id = `${now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_STORAGE_KEYS.LANDING_TAB_ID, id);
  }
  return id;
}

function isLiveLock(lock, tabId) {
  if (!lock || !lock.tabId) return false;
  if (lock.tabId === tabId) return true;
  const hb = Number(lock.heartbeat || lock.ts || 0);
  return now() - hb < TAB_PRESENCE.STALE_TTL_MS;
}

function sameTarget(aDoc, aKey, bDoc, bKey) {
  const sameDoc = aDoc && bDoc && String(aDoc) === String(bDoc);
  const sameKey = aKey && bKey && String(aKey) === String(bKey);
  return Boolean(sameDoc || sameKey);
}

function getChannel() {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(TAB_PRESENCE.CHANNEL);
    channel.onmessage = (event) => {
      handleChannelMessage(event.data);
    };
  }
  return channel;
}

function postChannel(payload) {
  try {
    getChannel()?.postMessage(payload);
  } catch {
    // ignore
  }
}

function writeOpenPagesProbe({ docId, key, tabId }) {
  if (typeof localStorage === 'undefined') return;
  writeJson(localStorage, LOCAL_STORAGE_KEYS.OPEN_PAGES, {
    docid: docId || '',
    key: key || '',
    tabId,
    ts: now()
  });
}

function writePageAvailableReply({ docId, key, requestTabId, responderTabId }) {
  if (typeof localStorage === 'undefined') return;
  writeJson(localStorage, LOCAL_STORAGE_KEYS.PAGE_AVAILABLE, {
    docid: docId || '',
    key: key || '',
    requestTabId,
    responderTabId,
    ts: now()
  });
}

function readLock(docId) {
  if (typeof localStorage === 'undefined' || !docId) return null;
  return readJson(localStorage, lockKey(docId));
}

function writeLock({ docId, key, tabId }) {
  const existing = readLock(docId);
  const resolvedKey = key || existing?.key || '';
  const payload = {
    tabId,
    key: resolvedKey,
    ts: now(),
    heartbeat: now()
  };
  writeJson(localStorage, lockKey(docId), payload);
  return payload;
}

function clearLockIfOwner(docId, tabId) {
  const lock = readLock(docId);
  if (lock && lock.tabId === tabId) {
    localStorage.removeItem(lockKey(docId));
  }
}

/** Ownership / identity for probe replies — prefer LS lock as source of truth. */
function resolveOwnership(tabId) {
  const listenerDoc = listenerOpts?.getDocId?.() || '';
  const listenerKey = listenerOpts?.getKey?.() || '';
  const docId = listenerDoc || heldDocId || '';
  const lock = docId ? readLock(docId) : null;
  const weOwn =
    (lock && lock.tabId === tabId && isLiveLock(lock, tabId)) ||
    (heldDocId && (!lock || lock.tabId === tabId));

  return {
    weOwn: Boolean(weOwn),
    myDoc: docId || lock?.docId || '',
    myKey: listenerKey || heldKey || lock?.key || ''
  };
}

function beat() {
  if (!heldDocId || typeof localStorage === 'undefined') return;
  const tabId = ensureLandingTabId();
  const lock = readLock(heldDocId);
  if (lock && lock.tabId !== tabId) return;
  writeLock({ docId: heldDocId, key: heldKey || lock?.key || '', tabId });
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(beat, TAB_PRESENCE.HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function handleChannelMessage(data) {
  if (!data || typeof data !== 'object') return;
  const tabId = ensureLandingTabId();
  if (data.tabId === tabId) return;

  const { weOwn, myDoc, myKey } = resolveOwnership(tabId);

  if (data.type === MSG.PROBE) {
    if (!myDoc && !myKey) return;
    if (!sameTarget(myDoc, myKey, data.docId, data.key)) return;
    if (!weOwn) return;

    postChannel({
      type: MSG.OCCUPIED,
      docId: myDoc || data.docId,
      key: myKey || data.key,
      tabId,
      requestTabId: data.tabId
    });
    writePageAvailableReply({
      docId: myDoc || data.docId,
      key: myKey || data.key,
      requestTabId: data.tabId,
      responderTabId: tabId
    });
    return;
  }

  if (data.type === MSG.ACQUIRED && weOwn) {
    if (sameTarget(myDoc, myKey, data.docId, data.key) && data.tabId !== tabId) {
      listenerOpts?.onForeignClaim?.(data);
    }
  }
}

function onStorageEvent(e) {
  const tabId = ensureLandingTabId();
  const { weOwn, myDoc, myKey } = resolveOwnership(tabId);

  if (e.key === LOCAL_STORAGE_KEYS.OPEN_PAGES) {
    const parsed = e.newValue ? (() => {
      try {
        return JSON.parse(e.newValue);
      } catch {
        return null;
      }
    })() : null;
    if (!parsed) return;
    if (!parsed.tabId || parsed.tabId === tabId) return;
    if (!sameTarget(myDoc, myKey, parsed.docid, parsed.key)) return;
    if (!weOwn) return;
    writePageAvailableReply({
      docId: myDoc || parsed.docid,
      key: myKey || parsed.key,
      requestTabId: parsed.tabId,
      responderTabId: tabId
    });
  }
}

/**
 * Start listening so this tab can answer probes while holding a link.
 */
export function startTabPresenceListener(options = {}) {
  listenerOpts = options;
  getChannel();

  if (typeof window !== 'undefined' && !storageHandler) {
    storageHandler = onStorageEvent;
    window.addEventListener('storage', storageHandler);
  }

  if (typeof window !== 'undefined' && !pageHideHandler) {
    pageHideHandler = () => {
      if (heldDocId) {
        releaseValidateTab({ docId: heldDocId });
      }
    };
    window.addEventListener('pagehide', pageHideHandler);
  }
}

/**
 * Stop heartbeat and DOM listeners but keep LS lock (same-tab navigate to editor).
 * Editor must call claimValidateTab soon to renew heartbeat.
 */
export function pauseTabPresence() {
  stopHeartbeat();
  if (typeof window !== 'undefined') {
    if (storageHandler) {
      window.removeEventListener('storage', storageHandler);
      storageHandler = null;
    }
    if (pageHideHandler) {
      window.removeEventListener('pagehide', pageHideHandler);
      pageHideHandler = null;
    }
  }
  if (channel) {
    try {
      channel.close();
    } catch {
      // ignore
    }
    channel = null;
  }
  listenerOpts = null;
  // keep heldDocId / heldKey so claim can see we still "own" in-memory;
  // LS lock remains until stale TTL or explicit release
}

/**
 * Stop listeners and release ownership for the held doc.
 */
export function stopTabPresence() {
  pauseTabPresence();
  if (heldDocId) {
    const docId = heldDocId;
    const tabId = ensureLandingTabId();
    clearLockIfOwner(docId, tabId);
    postChannel({ type: MSG.RELEASED, docId, tabId, key: heldKey });
    heldDocId = null;
    heldKey = null;
  }
}

/**
 * Probe other tabs, then acquire heartbeat lock if free.
 * @returns {Promise<{ ok: boolean, reason?: 'occupied' }>}
 */
export async function claimValidateTab({ docId, key } = {}) {
  if (!docId && !key) {
    return { ok: true };
  }

  const tabId = ensureLandingTabId();
  startTabPresenceListener(listenerOpts || {
    getDocId: () => heldDocId || docId,
    getKey: () => heldKey || key
  });

  // Already our lock — renew
  if (docId) {
    const existing = readLock(docId);
    if (existing && existing.tabId === tabId) {
      heldDocId = docId;
      heldKey = key || existing.key || '';
      writeLock({ docId, key: heldKey, tabId });
      startHeartbeat();
      return { ok: true };
    }
    if (existing && isLiveLock(existing, tabId) && existing.tabId !== tabId) {
      return { ok: false, reason: 'occupied' };
    }
  }

  let occupied = false;

  const onProbeReply = (event) => {
    const data = event.data;
    if (!data || data.type !== MSG.OCCUPIED) return;
    if (data.requestTabId && data.requestTabId !== tabId) return;
    if (data.tabId === tabId) return;
    if (sameTarget(docId, key, data.docId, data.key)) {
      occupied = true;
    }
  };

  const ch = getChannel();
  if (ch) {
    ch.addEventListener('message', onProbeReply);
  }

  const storageProbeHandler = (e) => {
    if (e.key !== LOCAL_STORAGE_KEYS.PAGE_AVAILABLE || !e.newValue) return;
    let parsed;
    try {
      parsed = JSON.parse(e.newValue);
    } catch {
      return;
    }
    if (parsed.requestTabId !== tabId) return;
    if (parsed.responderTabId === tabId) return;
    if (sameTarget(docId, key, parsed.docid, parsed.key)) {
      occupied = true;
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', storageProbeHandler);
  }

  writeOpenPagesProbe({ docId, key, tabId });
  postChannel({ type: MSG.PROBE, docId, key, tabId });

  await new Promise((resolve) => {
    setTimeout(resolve, TAB_PRESENCE.PROBE_WAIT_MS);
  });

  if (ch) {
    ch.removeEventListener('message', onProbeReply);
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', storageProbeHandler);
  }

  // Re-check lock after wait (race)
  if (docId) {
    const again = readLock(docId);
    if (again && again.tabId !== tabId && isLiveLock(again, tabId)) {
      occupied = true;
    }
  }

  if (occupied) {
    return { ok: false, reason: 'occupied' };
  }

  if (docId) {
    writeLock({ docId, key: key || heldKey || '', tabId });
    heldDocId = docId;
    heldKey = key || heldKey || readLock(docId)?.key || '';
    startHeartbeat();
    postChannel({ type: MSG.ACQUIRED, docId, key: heldKey, tabId });
  }

  return { ok: true };
}

/**
 * Release lock only if this tab owns it.
 */
export function releaseValidateTab({ docId } = {}) {
  const tabId = ensureLandingTabId();
  const target = docId || heldDocId;
  if (!target) return;

  clearLockIfOwner(target, tabId);
  postChannel({ type: MSG.RELEASED, docId: target, tabId, key: heldKey });

  if (heldDocId === target) {
    stopHeartbeat();
    heldDocId = null;
    heldKey = null;
  }
}

/** Test helpers */
export function __resetTabPresenceForTests() {
  stopHeartbeat();
  heldDocId = null;
  heldKey = null;
  listenerOpts = null;
  if (channel) {
    try {
      channel.close();
    } catch {
      // ignore
    }
    channel = null;
  }
  storageHandler = null;
  pageHideHandler = null;
}
