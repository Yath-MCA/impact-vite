/**
 * Validate shared-mail proof links (browser check → urlvalidity → thin landing).
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiLoader, FiXCircle } from 'react-icons/fi';
import { apiService, API_ENDPOINTS } from '../../middleware/providers/apiService';
import { checkBrowserCompatibility } from '../../middleware/browserCompatibility.js';
import {
  assertValidateAccess,
  normalizeValidateResponse,
  setPendingValidateResponse,
} from '../../shared/utils/normalizeValidateResponse.js';
import { LandingMessageKey, showLandingMessage } from './messages/index.js';

const LandingUI = lazy(() => import('./LandingUI.jsx'));

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

function ValidateUrlView({ accessKey }) {
  const [status, setStatus] = useState('loading');
  const [statusLabel, setStatusLabel] = useState('Validating your link…');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [docData, setDocData] = useState(null);
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let landingTimer;

    async function run() {
      if (!accessKey) {
        setStatus('error');
        setError(
          'No validation key was provided. Please use the complete link from your email.'
        );
        await showLandingMessage(LandingMessageKey.INVALID);
        return;
      }

      const browserInfo = checkBrowserCompatibility();
      if (typeof window !== 'undefined') {
        window.browserInfo = browserInfo;
      }

      if (!browserInfo.isAllowed || !browserInfo.isCompatible) {
        await showLandingMessage(LandingMessageKey.UNSUPPORTED_BROWSER);
        if (!cancelled) {
          setStatus('error');
          setError('Unsupported browser');
        }
        return;
      }

      try {
        setStatus('loading');
        setProgress(15);
        setStatusLabel('Connecting to server…');

        setProgress(40);
        setStatusLabel('Validating link…');

        const response = await getOrCreateValidateRequest(accessKey);
        if (cancelled) return;

        setProgress(75);
        setStatusLabel('Checking access…');

        assertValidateAccess(response);
        setPendingValidateResponse(response);

        const flat = normalizeValidateResponse(response);
        if (cancelled) return;

        setDocData(flat);
        setProgress(100);
        setStatus('success');
        setStatusLabel('Link validated!');

        landingTimer = setTimeout(() => {
          if (!cancelled) setShowLanding(true);
        }, 800);
      } catch (err) {
        if (cancelled) return;

        if (err?.code === 'file_deleted') {
          await showLandingMessage(LandingMessageKey.FILE_DELETED);
        } else if (err?.code === 'expired' || err?.code === 'deactive') {
          await showLandingMessage(LandingMessageKey.EXPIRED);
        } else if (err?.code === 'invalid') {
          await showLandingMessage(LandingMessageKey.INVALID);
        } else {
          await showLandingMessage(LandingMessageKey.TRY_AGAIN_LATER);
        }

        setError(err.message || 'Unable to validate your proof link.');
        setStatus('error');
      }
    }

    run();

    return () => {
      cancelled = true;
      if (landingTimer) clearTimeout(landingTimer);
    };
  }, [accessKey]);

  if (showLanding && docData) {
    return (
      <Suspense
        fallback={
          <div className="tw:min-h-screen tw:flex tw:items-center tw:justify-center">
            <FiLoader
              className="tw:h-8 tw:w-8 tw:animate-spin tw:text-primary"
              aria-label="Loading landing"
            />
          </div>
        }
      >
        <LandingUI docData={docData} />
      </Suspense>
    );
  }

  const iconBg =
    status === 'success' ? '#10b981' : status === 'error' ? '#ef4444' : '#ff8635';

  return (
    <div className="tw:min-h-screen tw:flex tw:items-center tw:justify-center tw:bg-gradient-to-br tw:from-slate-50 tw:via-white tw:to-orange-50 tw:px-4">
      <div className="tw:w-full tw:max-w-md">
        <div className="tw:rounded-2xl tw:border tw:border-slate-200 tw:bg-white tw:p-8 tw:shadow-sm">
          <div className="tw:mb-8 tw:text-center">
            <div
              className="tw:mx-auto tw:mb-4 tw:flex tw:h-16 tw:w-16 tw:items-center tw:justify-center tw:rounded-2xl"
              style={{ backgroundColor: iconBg }}
            >
              {status === 'loading' && (
                <FiLoader className="tw:h-8 tw:w-8 tw:animate-spin tw:text-white" aria-label="Loading" />
              )}
              {status === 'success' && <FiCheckCircle className="tw:h-8 tw:w-8 tw:text-white" />}
              {status === 'error' && <FiXCircle className="tw:h-8 tw:w-8 tw:text-white" />}
            </div>
            <h1 className="tw:mb-2 tw:text-2xl tw:font-bold tw:tracking-tight tw:text-slate-900">
              {status === 'loading' && 'Validating Link'}
              {status === 'success' && 'Link Validated'}
              {status === 'error' && 'Validation Failed'}
            </h1>
            <p className="tw:text-slate-600">
              {status === 'loading' && statusLabel}
              {status === 'success' && 'Redirecting to your proof…'}
              {status === 'error' && error}
            </p>
          </div>

          {status === 'loading' && (
            <div className="tw:space-y-3">
              <div className="tw:h-2 tw:overflow-hidden tw:rounded-full tw:bg-slate-200">
                <div
                  className="tw:h-full tw:bg-primary tw:transition-all tw:duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="tw:flex tw:justify-between tw:text-sm tw:text-slate-500">
                <span>{statusLabel}</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="tw:space-y-4">
              <div className="tw:rounded-md tw:border tw:border-green-200 tw:bg-green-50 tw:p-4">
                <p className="tw:text-sm tw:text-green-800">
                  {docData?.title ? (
                    <>
                      Document: <strong>{docData.title}</strong>
                    </>
                  ) : (
                    'Access verified — opening landing…'
                  )}
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="tw:space-y-4">
              <div className="tw:rounded-md tw:border tw:border-red-200 tw:bg-red-50 tw:p-4">
                <p className="tw:text-sm tw:text-red-800">Unable to open this proof link.</p>
              </div>
              <div className="tw:flex tw:gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="tw:inline-flex tw:flex-1 tw:items-center tw:justify-center tw:rounded-md tw:overflow-hidden tw:bg-primary tw:px-4 tw:py-2.5 tw:font-semibold tw:text-white tw:hover:bg-primary-dark"
                >
                  Try Again
                </button>
                <a
                  href="#/"
                  className="tw:inline-flex tw:flex-1 tw:items-center tw:justify-center tw:rounded-md tw:overflow-hidden tw:border tw:border-slate-300 tw:bg-white tw:px-4 tw:py-2.5 tw:font-semibold tw:text-slate-700 tw:no-underline tw:hover:border-primary tw:hover:text-primary"
                >
                  Go Home
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ValidateUrlPage() {
  const [searchParams] = useSearchParams();
  const { client: _client } = useParams();
  const key = searchParams.get('key');

  return <ValidateUrlView accessKey={key} />;
}
