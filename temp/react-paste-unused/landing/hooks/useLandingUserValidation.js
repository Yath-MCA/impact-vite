import { useCallback, useRef, useState } from 'react';
import { SESSION_REMARKS } from '../../../services/session/sessionConstants.js';
import {
  applySelectedEmailToResData,
  shouldValidateMultiUser
} from '../../../services/session/sessionSource.js';
import {
  getPendingValidateResponse,
  saveLegacyLocalStorageData,
  setPendingValidateResponse
} from '../../../services/core/editorSessionStorage.js';
import { setUserInfo, toLegacyUserInfo } from '../../../services/core/userInfoEntry.js';
import { normalizeSessionSource } from '../../../services/session/sessionSource.js';
import { promptValidateUserEmail } from '../sessionDialogs.js';
import { shouldRunPlosAuth } from '../landingAccess.js';

async function runPlosAuthenticationFlow(resData, options) {
  const { AuthenticationFlow } = await import('../plos/authenticationFlow.js');
  const flow = new AuthenticationFlow(resData, options);
  try {
    const result = await flow.run();
    const next =
      result.status === 'passed' || result.status === 'otp_complete'
        ? 'passed'
        : 'failed';
    return { ...result, status: next };
  } catch {
    return { status: 'failed' };
  }
}

/**
 * Post-urlvalidity user validation: multi-user email, PLOS auth (PLOS only), auto-login on email entry.
 */
export default function useLandingUserValidation({
  docData,
  validateResponse,
  startLogin
}) {
  const [plosAuthStatus, setPlosAuthStatus] = useState('idle');
  const resolvedEmailRef = useRef(null);

  const runUserValidation = useCallback(async () => {
    if (!docData) return { ok: false, reason: 'missing_doc' };

    let workingDoc = { ...docData };
    let showValidateEmailButton = false;
    let plosAuthRequired = false;
    const needsPlosAuth = shouldRunPlosAuth(workingDoc, validateResponse, workingDoc.client);

    if (shouldValidateMultiUser(workingDoc)) {
      const email = await promptValidateUserEmail(workingDoc.emailto);
      if (!email) {
        return { ok: false, showValidateEmailButton: true, reason: 'email_cancelled' };
      }

      workingDoc = applySelectedEmailToResData(workingDoc, email);
      resolvedEmailRef.current = email;

      const pending = getPendingValidateResponse();
      if (pending?.data) {
        pending.data = applySelectedEmailToResData({ ...pending.data }, email);
        setPendingValidateResponse(pending);
      }

      saveLegacyLocalStorageData(workingDoc);
      const src = normalizeSessionSource(workingDoc, validateResponse || pending, {
        selectedEmail: email
      });
      setUserInfo(toLegacyUserInfo(src));

      if (!shouldRunPlosAuth(workingDoc, validateResponse, workingDoc.client)) {
        await startLogin({
          remarks: SESSION_REMARKS.USER_ENTER_VALID_EMAIL,
          username: email,
          docDataOverride: workingDoc
        });
        return { ok: true, autoLogin: true, docData: workingDoc };
      }
    }

    if (needsPlosAuth || shouldRunPlosAuth(workingDoc, validateResponse, workingDoc.client)) {
      plosAuthRequired = true;
      setPlosAuthStatus('running');
      const authResult = await runPlosAuthenticationFlow(validateResponse?.data || workingDoc, {
        docId: workingDoc.docid,
        userEmail: resolvedEmailRef.current || workingDoc.username,
        onShowAcceptButton: () => {},
        onAuthSuccess: () => {}
      });
      const next = authResult.status === 'passed' ? 'passed' : 'failed';
      setPlosAuthStatus(next);
      if (authResult.status !== 'passed') {
        return { ok: false, reason: 'plos_auth_failed', plosAuthRequired };
      }
    }

    return {
      ok: true,
      docData: workingDoc,
      showValidateEmailButton,
      plosAuthRequired
    };
  }, [docData, validateResponse, startLogin]);

  return {
    runUserValidation,
    resolvedEmail: resolvedEmailRef.current,
    plosAuthStatus
  };
}
