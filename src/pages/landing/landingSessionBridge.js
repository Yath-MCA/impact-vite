import { loadLandingSessionOnce } from './loadLandingSession.js';
import {
  commitLandingStorageAndVerify,
  saveLegacyShareLocalStorage,
} from './landingSessionStorage.js';

function newSessionId() {
  return String(Date.now()) + String(Math.floor(Math.random() * 1000));
}

export function buildLandingAcceptContext(docData, handlers = {}) {
  const resData = docData || {};
  const docId = String(resData.docid || resData.docId || '');
  const sessionId = handlers.sessionId || newSessionId();
  const editorHash = '#/editor';

  return {
    docId,
    sessionId,
    resData,
    rolename: resData.rolename,
    username: resData.emailto || resData.username,
    redirectUrl: editorHash,
    landingUrl: typeof window !== 'undefined' ? window.location.href : '',
    onCommitStorage: (data) => {
      saveLegacyShareLocalStorage(data || resData);
    },
    onRedirect: async (ctx) => {
      const skipVerify = !!(
        ctx.skipVerify ||
        ctx.grantOptions?.skipVerify ||
        ctx.grantOptions?.canforceClose
      );
      const mod = window.LinkSessionModule.getInstance();
      const result = await commitLandingStorageAndVerify({
        docId: ctx.docId || docId,
        sessionId: ctx.sessionId || sessionId,
        redirectUrl: editorHash,
        resData: ctx.resData || resData,
        skipVerify,
        confirmFn: (expected) => mod.confirmSessionOnServer(expected),
      });
      if (!result.ok) {
        handlers.onVerifyFailed?.(result);
        return;
      }
      window.location.hash = editorHash;
    },
    onTryAgain: (key) => handlers.onTryAgain?.(key),
    onRequestError: (err) => handlers.onError?.(err),
    onAccessDeniedWithRemarks: (msg) => handlers.onDenied?.(msg),
    ui: {
      sendPrompt: (response, ctx) =>
        handlers.onBlocked ? handlers.onBlocked(response, ctx) : Promise.resolve(),
      showPollWaiting: (ctx) =>
        handlers.onWaiting ? handlers.onWaiting(ctx) : Promise.resolve(),
    },
  };
}

export async function startLandingAccept(docData, handlers = {}) {
  await loadLandingSessionOnce();
  const mod = window.LinkSessionModule.getInstance();
  const ctx = buildLandingAcceptContext(docData, handlers);
  await mod.accessFromLanding(ctx);
  return { status: 'started', docId: ctx.docId, sessionId: ctx.sessionId };
}
