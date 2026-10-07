import { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle,ArrowRight } from 'lucide-react';
import { apiService, API_ENDPOINTS } from '../../../services/api/apiService';
import { useClient } from '../../../shared/providers/ClientProvider';
import { loadClientById } from '../../../shared/utils/clientLoader';
import { assertValidateAccess, normalizeValidateResponse } from '../../../shared/utils/normalizeValidateResponse';
import {
  clearDocScopedLocalData,
  setPendingValidateResponse,
  setValidateAccessKey
} from '../../../services/core/editorSessionStorage.js';
import { isLocalHost } from '../../../services/session/runtimeFlags.js';
import { checkBrowserCompatibility } from '../../../services/core/browserCompatibility.js';
import {
  fireMaintenanceAlert,
  initMaintenance
} from '../../../services/landing/maintenanceGuard.js';
import { initDownloadService } from '../../../services/download/index.js';
import { initErrorOps } from '../../../services/error/index.js';
import useAcceptButtonVisibility from '../hooks/useAcceptButtonVisibility.js';
import useLandingSessionFlow from '../hooks/useLandingSessionFlow.js';
import useLandingUserValidation from '../hooks/useLandingUserValidation.js';
import {
  claimValidateTab,
  pauseTabPresence,
  startTabPresenceListener
} from '../../../services/session/tabPresence.js';
import {
  LandingMessageKey,
  showLandingMessage
} from '../messages/index.js';
const LandingUI = lazy(() => import('./LandingUI'));

// ─── ValidateUrl constants ───────────────────────────────────────────────────

const IS_LOCAL = typeof window !== 'undefined' && isLocalHost();
const DEV_VALIDATE_KEY = import.meta.env.VITE_DEV_VALIDATE_KEY || '';

/** Shared across StrictMode remounts so urlvalidity is requested once per key. */
const validateKeyInflight = new Map();

function getOrCreateValidateRequest(key) {
  const cacheKey = String(key);
  const existing = validateKeyInflight.get(cacheKey);
  if (existing) return existing;

  const request = apiService
    .makeRequest(API_ENDPOINTS.URL_VALIDITY, { key: cacheKey })
    .finally(() => {
      validateKeyInflight.delete(cacheKey);
    });

  validateKeyInflight.set(cacheKey, request);
  return request;
}

// ─── ValidateUrl sub-component ───────────────────────────────────────────────

function ValidateUrlView({ accessKey, clientParam, alertParam }) {
  const navigate = useNavigate();
  const { loadClientConfig } = useClient();
  const [status, setStatus] = useState('loading');
  const [statusLabel, setStatusLabel] = useState('Validating your link…');
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [docData, setDocData] = useState(null);
  const [validateResponse, setValidateResponse] = useState(null);
  const [showLanding, setShowLanding] = useState(false);
  const [userGate, setUserGate] = useState({
    ready: false,
    showValidateEmailButton: false,
    retryButtonLabel: 'VALIDATE EMAIL',
    autoLogin: false
  });
  const userValidationDoneRef = useRef(false);
  const runUserValidationRef = useRef(null);
  const loadClientConfigRef = useRef(loadClientConfig);
  loadClientConfigRef.current = loadClientConfig;

  const effectiveKey = accessKey || (IS_LOCAL && DEV_VALIDATE_KEY ? DEV_VALIDATE_KEY : null);

  const { ui, isBusy, startLogin } = useLandingSessionFlow(docData);
  const { runUserValidation, plosAuthStatus } = useLandingUserValidation({
    docData,
    validateResponse,
    startLogin
  });
  runUserValidationRef.current = runUserValidation;

  const applyUserValidationResult = useCallback((result) => {
    // runUserValidation may resolve/enrich docData (e.g. multi-user email
    // selection) in a local copy — without this, that copy is discarded and
    // a later manual "Accept" click uses stale docData (see
    // useLandingUserValidation.js's runUserValidation for where it's built).
    if (result.docData) {
      setDocData(result.docData);
    }

    if (result.autoLogin) {
      setUserGate({
        ready: false,
        showValidateEmailButton: false,
        retryButtonLabel: 'VALIDATE EMAIL',
        autoLogin: true
      });
      return;
    }

    if (result.reason === 'plos_auth_failed') {
      setUserGate({
        ready: false,
        showValidateEmailButton: true,
        retryButtonLabel: 'RETRY VERIFICATION',
        autoLogin: false
      });
      return;
    }

    setUserGate({
      ready: Boolean(result.ok && !result.showValidateEmailButton),
      showValidateEmailButton: Boolean(result.showValidateEmailButton),
      retryButtonLabel: 'VALIDATE EMAIL',
      autoLogin: false
    });
  }, []);

  const revalidateByKey = useCallback(async (key) => {
    if (!key) return false;
    try {
      const response = await apiService.makeRequest(API_ENDPOINTS.URL_VALIDITY, {
        key: String(key)
      });
      assertValidateAccess(response);
      setPendingValidateResponse(response);
      const flatDocData = normalizeValidateResponse(response);
      setValidateResponse(response);
      setDocData(flatDocData);
      return true;
    } catch {
      return false;
    }
  }, []);

  const landingActive =
    showLanding &&
    Boolean(docData) &&
    userGate.ready &&
    !userGate.autoLogin &&
    !userGate.showValidateEmailButton;

  const { showAcceptButton } = useAcceptButtonVisibility({
    landingActive,
    onRevalidate: useCallback(
      () => revalidateByKey(effectiveKey),
      [effectiveKey, revalidateByKey]
    )
  });

  const handleValidateEmail = useCallback(async () => {
    const result = await runUserValidationRef.current?.();
    if (!result) return;
    userValidationDoneRef.current = true;
    applyUserValidationResult(result);
  }, [applyUserValidationResult]);

  useEffect(() => {
    if (!showLanding || !docData || userValidationDoneRef.current) return undefined;

    let cancelled = false;

    (async () => {
      const result = await runUserValidationRef.current?.();
      if (cancelled || !result) return;

      userValidationDoneRef.current = true;
      applyUserValidationResult(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [showLanding, docData?.docid, applyUserValidationResult]);

  useEffect(() => {
    let cancelled = false;
    let landingTimer;
    let redirectTimer;
    let progressInterval;

    async function validateByKey(key) {
      try {
        const browserInfo = checkBrowserCompatibility();
        if (!browserInfo.isAllowed || !browserInfo.isCompatible) {
          await showLandingMessage(LandingMessageKey.UNSUPPORTED_BROWSER);
        }

        await initMaintenance({ init: true });
        fireMaintenanceAlert();
        initDownloadService();
        initErrorOps();

        if (alertParam === 'idle_session_log_out') {
          await showLandingMessage(LandingMessageKey.SESSION_OUT);
        }

        setStatus('loading');
        setProgress(10);
        setStatusLabel('Connecting to server…');

        setProgress(30);
        setStatusLabel('Validating link…');

        const response = await getOrCreateValidateRequest(key);
        if (cancelled) return;

        setProgress(70);
        setStatusLabel('Checking access…');

        assertValidateAccess(response);

        setPendingValidateResponse(response);
        setValidateResponse(response);

        const flatDocData = normalizeValidateResponse(response);
        if (cancelled) return;

        if (String(flatDocData.rolename) !== 'Collator') {
          clearDocScopedLocalData(flatDocData.docid);
        }

        const claim = await claimValidateTab({
          docId: flatDocData.docid,
          key
        });
        if (cancelled) return;

        if (!claim.ok) {
          setStatus('error');
          setError('Link has been already opened in another tab. Please check');
          await showLandingMessage(LandingMessageKey.LINK_OPENED);
          return;
        }

        setValidateAccessKey(key);

        startTabPresenceListener({
          getDocId: () => flatDocData.docid,
          getKey: () => key
        });

        setDocData(flatDocData);
        setProgress(100);
        setStatus('success');
        setStatusLabel('Link validated!');

        landingTimer = setTimeout(() => {
          if (!cancelled) setShowLanding(true);
        }, 800);
      } catch (err) {
        if (cancelled) return;
        if (err?.code === 'signoff') {
          setError(err.message);
          setStatus('error');
          const result = await showLandingMessage(LandingMessageKey.SIGN_OFF);
          if (result?.isConfirmed && err.docid) {
            navigate(`/editor?mode=readonly&docid=${encodeURIComponent(err.docid)}`);
          }
          return;
        }
        if (err?.code === 'file_deleted') {
          await showLandingMessage(LandingMessageKey.FILE_DELETED);
        } else if (err?.code === 'expired' || err?.code === 'deactive') {
          await showLandingMessage(LandingMessageKey.EXPIRED);
        }
        setError(err.message || 'Unable to validate your proof link.');
        setStatus('error');
      }
    }

    async function validateByClient(clientId) {
      try {
        setStatus('loading');
        setProgress(0);
        setStatusLabel(`Loading configuration for "${clientId}"…`);

        await new Promise((resolve) => {
          progressInterval = setInterval(() => {
            setProgress((prev) => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                progressInterval = null;
                resolve();
                return 90;
              }
              return prev + 10;
            });
          }, 100);
        });

        if (cancelled) return;

        const config = await loadClientById(clientId);
        if (cancelled) return;

        loadClientConfigRef.current(clientId);

        setProgress(100);
        setStatus('success');
        setStatusLabel('Redirecting…');

        redirectTimer = setTimeout(() => {
          if (cancelled) return;
          if (config.features?.dashboard) navigate('/dashboard');
          else if (config.features?.editor) navigate('/editor');
          else navigate('/');
        }, 1500);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setStatus('error');
      }
    }

    if (effectiveKey) {
      validateByKey(effectiveKey);
    } else if (clientParam) {
      validateByClient(clientParam);
    } else {
      setStatus('error');
      setError('No validation key or client ID was provided. Please use the complete link provided in your email.');
    }

    return () => {
      cancelled = true;
      if (landingTimer) clearTimeout(landingTimer);
      if (redirectTimer) clearTimeout(redirectTimer);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [effectiveKey, clientParam, alertParam, navigate]);

  useEffect(() => {
    return () => {
      pauseTabPresence();
    };
  }, [docData?.docid]);

  if (showLanding && docData) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" aria-label="Loading landing" />
          </div>
        }
      >
        <LandingUI
          docData={docData}
          showAcceptButton={showAcceptButton}
          showValidateEmailButton={userGate.showValidateEmailButton}
          retryButtonLabel={userGate.retryButtonLabel}
          onValidateEmail={handleValidateEmail}
          plosAuthStatus={plosAuthStatus}
          ui={ui}
          isBusy={isBusy}
          startLogin={startLogin}
        />
      </Suspense>
    );
  }

  // Progress / validation card
  const iconBg = status === 'success' ? '#10b981' : status === 'error' ? '#ef4444' : '#3b82f6';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: iconBg }}>
              {status === 'loading' && <Loader2 className="w-8 h-8 text-white animate-spin" />}
              {status === 'success' && <CheckCircle2 className="w-8 h-8 text-white" />}
              {status === 'error' && <XCircle className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {status === 'loading' && 'Validating Link'}
              {status === 'success' && 'Link Validated'}
              {status === 'error' && 'Validation Failed'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {status === 'loading' && statusLabel}
              {status === 'success' && 'Redirecting to your proof…'}
              {status === 'error' && error}
            </p>
          </div>

          {/* Progress bar */}
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-600 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{statusLabel}</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-green-800 dark:text-green-300 text-sm">
                  {docData?.title
                    ? <>Document: <strong>{docData.title}</strong></>
                    : 'Access verified — continue to the landing page to start your session.'}

                </p>
              </div>
              <button onClick={() => setShowLanding(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                <span>Continue to Landing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-red-800 dark:text-red-300 text-sm">
                  Unable to open this proof link.
                </p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Try Again
                </button>
                <button onClick={() => navigate('/')}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                  Go Home
                </button>
              </div>
            </div>
          )}

          {/* Key / Client info */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{effectiveKey ? 'Access Key' : 'Client ID'}:</span>
              <span className="font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded truncate max-w-[220px]">
                {effectiveKey ? `${effectiveKey.slice(0, 16)}…` : clientParam}
                {effectiveKey && !accessKey && IS_LOCAL && <span className="ml-1 text-xs text-orange-600 dark:text-orange-400">(test)</span>}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function ValidateUrlPage() {
  const [searchParams] = useSearchParams();
  const { client } = useParams();

  const key = searchParams.get('key');
  const alertParam = searchParams.get('alert');

  return <ValidateUrlView accessKey={key} clientParam={client} alertParam={alertParam} />;
}
