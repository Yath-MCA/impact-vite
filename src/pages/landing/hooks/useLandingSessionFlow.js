import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionConfig } from '../../../services/session/sessionConfig.js';
import {
  loginFromLanding,
  continueBlockedSession,
  pollAndResolve
} from '../../../services/session/sessionGateway.js';
import { buildSessionContextFromDocData } from '../../../services/core/editorSessionStorage.js';
import {
  closeSessionDialogs,
  promptSendAccessRequest,
  promptVerifyFailed,
  showSessionWaiting,
  showSessionDenied,
  showSessionError,
  showSessionTryAgain,
  showSessionTryAgainLater
} from '../sessionDialogs.js';

const INITIAL_UI = {
  phase: 'idle',
  message: '',
  showSendRequest: false,
  showWaiting: false,
  waitingSeconds: 0
};

export default function useLandingSessionFlow(docData) {
  const navigate = useNavigate();
  const [ui, setUi] = useState(INITIAL_UI);
  const [sessionCtx, setSessionCtx] = useState(null);
  const [lastCheckResponse, setLastCheckResponse] = useState(null);
  const mountedRef = useRef(true);
  const waitTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const waitingDialogRef = useRef(null);
  const sessionCtxRef = useRef(null);
  const lastCheckResponseRef = useRef(null);

  sessionCtxRef.current = sessionCtx;
  lastCheckResponseRef.current = lastCheckResponse;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      waitingDialogRef.current?.close();
      waitingDialogRef.current = null;
      closeSessionDialogs();
    };
  }, []);

  const buildContext = useCallback((data, overrides = {}) => {
    return buildSessionContextFromDocData(data, overrides);
  }, []);

  const goToEditor = useCallback(() => {
    closeSessionDialogs();
    navigate(sessionConfig.editorPath);
  }, [navigate]);

  const resetIdle = useCallback(() => {
    setUi({ ...INITIAL_UI });
  }, []);

  const confirmSendRequest = useCallback(async () => {
    const ctx = sessionCtxRef.current;
    const checkResponse = lastCheckResponseRef.current;
    if (!ctx || !checkResponse) return;

    setUi((prev) => ({ ...prev, phase: 'requesting', message: 'Sending access request…' }));

    try {
      const result = await continueBlockedSession(ctx, checkResponse);
      if (!mountedRef.current) return;

      if (result.status === 'try_again') {
        setUi({ ...INITIAL_UI, phase: 'idle', message: '' });
        await showSessionTryAgain();
        if (mountedRef.current) resetIdle();
        return;
      }

      if (result.status === 'granted') {
        setUi({ ...INITIAL_UI, phase: 'redirecting', message: 'Access granted. Opening editor…' });
        goToEditor();
        return;
      }

      if (result.status === 'verify_failed') {
        const nextCtx = result.ctx || ctx;
        const nextCheck = result.checkResponse || checkResponse;
        setSessionCtx(nextCtx);
        sessionCtxRef.current = nextCtx;
        setLastCheckResponse(nextCheck);
        lastCheckResponseRef.current = nextCheck;
        const send = await promptVerifyFailed(
          result.message || 'Session verification failed. You can send an access request.',
          { allowSendRequest: true }
        );
        if (!mountedRef.current) return;
        if (send) {
          await confirmSendRequest();
          return;
        }
        resetIdle();
        return;
      }

      if (result.status === 'waiting') {
        setSessionCtx(result.ctx);
        sessionCtxRef.current = result.ctx;
        const totalSeconds = Math.ceil(result.waitMs / 1000);
        setUi({
          phase: 'waiting',
          message: 'Waiting for approval…',
          showSendRequest: false,
          showWaiting: false,
          waitingSeconds: totalSeconds
        });

        waitingDialogRef.current?.close();
        waitingDialogRef.current = showSessionWaiting({
          seconds: totalSeconds,
          message: 'Waiting for approval…'
        });

        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
          if (!mountedRef.current) return;
          setUi((prev) => {
            const next = Math.max(0, (prev.waitingSeconds || 0) - 1);
            waitingDialogRef.current?.updateSeconds(next);
            return { ...prev, waitingSeconds: next };
          });
        }, 1000);

        await new Promise((resolve) => {
          waitTimerRef.current = setTimeout(resolve, result.waitMs);
        });
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        waitingDialogRef.current?.close();
        waitingDialogRef.current = null;
        if (!mountedRef.current) return;

        const pollResult = await pollAndResolve(result.ctx);
        if (!mountedRef.current) return;

        if (pollResult.status === 'granted') {
          setUi({ ...INITIAL_UI, phase: 'redirecting', message: 'Access granted. Opening editor…' });
          goToEditor();
          return;
        }

        if (pollResult.status === 'denied') {
          setUi({ ...INITIAL_UI });
          await showSessionDenied(pollResult.message || 'Access denied.');
          if (mountedRef.current) resetIdle();
          return;
        }

        if (pollResult.status === 'verify_failed') {
          const nextCtx = pollResult.ctx || result.ctx;
          setSessionCtx(nextCtx);
          sessionCtxRef.current = nextCtx;
          const send = await promptVerifyFailed(
            'Session verification failed after approval. You can send another request.',
            { allowSendRequest: true }
          );
          if (!mountedRef.current) return;
          if (send) {
            await confirmSendRequest();
            return;
          }
          resetIdle();
          return;
        }

        const retry = await promptSendAccessRequest();
        if (!mountedRef.current) return;
        if (retry) {
          await confirmSendRequest();
          return;
        }
        resetIdle();
        return;
      }

      setUi({ ...INITIAL_UI });
      await showSessionTryAgainLater();
      if (mountedRef.current) resetIdle();
    } catch (err) {
      if (!mountedRef.current) return;
      setUi({ ...INITIAL_UI });
      await showSessionTryAgainLater();
      if (mountedRef.current) resetIdle();
    }
  }, [goToEditor, resetIdle]);

  const startLogin = useCallback(async ({ remarks, username, docDataOverride } = {}) => {
    closeSessionDialogs();
    setUi({ ...INITIAL_UI, phase: 'checking', message: 'Starting session…' });

    try {
      // docDataOverride lets a caller pass freshly-resolved data (e.g. the
      // multi-user email selection in useLandingUserValidation) instead of
      // relying on this hook's docData prop, which may not have re-rendered
      // with the update yet by the time startLogin runs synchronously.
      const result = await loginFromLanding(docDataOverride || docData, { buildContext, remarks, username });
      if (!mountedRef.current) return;

      if (result.status === 'granted') {
        setUi({ ...INITIAL_UI, phase: 'redirecting', message: 'Opening editor…' });
        goToEditor();
        return;
      }

      if (result.status === 'blocked') {
        setSessionCtx(result.ctx);
        sessionCtxRef.current = result.ctx;
        setLastCheckResponse(result.checkResponse || null);
        lastCheckResponseRef.current = result.checkResponse || null;
        setUi({
          phase: 'blocked',
          message: 'Another active session is using this document.',
          showSendRequest: false,
          showWaiting: false,
          waitingSeconds: 0
        });

        const send = await promptSendAccessRequest();
        if (!mountedRef.current) return;
        if (send) {
          await confirmSendRequest();
          return;
        }
        resetIdle();
        return;
      }

      if (result.status === 'verify_failed') {
        setSessionCtx(result.ctx || null);
        sessionCtxRef.current = result.ctx || null;
        setLastCheckResponse(result.checkResponse || null);
        lastCheckResponseRef.current = result.checkResponse || null;
        const allowSend = Boolean(result.checkResponse);
        setUi({
          phase: 'verify_failed',
          message: 'Session verification failed.',
          showSendRequest: false,
          showWaiting: false,
          waitingSeconds: 0
        });

        const send = await promptVerifyFailed(
          'Session verification failed. Please try again or request access if another user holds the document.',
          { allowSendRequest: allowSend }
        );
        if (!mountedRef.current) return;
        if (send && allowSend) {
          await confirmSendRequest();
          return;
        }
        resetIdle();
        return;
      }

      if (result.status === 'denied') {
        setUi({ ...INITIAL_UI });
        await showSessionDenied(result.message || 'Access denied.');
        if (mountedRef.current) resetIdle();
        return;
      }

      setUi({ ...INITIAL_UI });
      await showSessionError();
      if (mountedRef.current) resetIdle();
    } catch (err) {
      if (!mountedRef.current) return;
      setUi({ ...INITIAL_UI });
      await showSessionError();
      if (mountedRef.current) resetIdle();
    }
  }, [buildContext, confirmSendRequest, docData, goToEditor, resetIdle]);

  const isBusy = useMemo(
    () => ['checking', 'requesting', 'waiting', 'redirecting'].includes(ui.phase),
    [ui.phase]
  );

  return {
    ui,
    isBusy,
    startLogin,
    confirmSendRequest
  };
}
