/**
 * Raw WebSocket client for impact-session-service (Phase 10/11). Native browser
 * WebSocket API — no new npm dependency needed, since the backend uses a plain
 * Spring WebSocketHandler (no STOMP), not SignalR/socket.io.
 *
 * Additive only: every connection failure degrades to "poll only" via
 * sessionGateway.js's existing flow — this module must never throw to its caller.
 */
import { sessionConfig } from './sessionConfig.js';

export function connectSessionSocket(docId, { onMessage } = {}) {
  let socket = null;
  let closedByCaller = false;

  try {
    socket = new WebSocket(`${sessionConfig.sessionServiceWsBase}/ws/session/${encodeURIComponent(docId)}`);
  } catch {
    return { ok: false, message: 'Unable to open session socket.', disconnect: () => {} };
  }

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      onMessage?.(parsed);
    } catch {
      // Malformed push message — ignore, the REST/history path remains authoritative.
    }
  };

  socket.onerror = () => {
    // Silent — the caller's poll fallback (sessionGateway.js) is unaffected.
  };

  return {
    ok: true,
    disconnect() {
      closedByCaller = true;
      try {
        socket.close();
      } catch {
        // ignore
      }
    },
    isClosedByCaller: () => closedByCaller
  };
}
