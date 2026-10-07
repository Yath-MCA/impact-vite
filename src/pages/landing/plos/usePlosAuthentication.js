import { useCallback, useRef, useState } from 'react';
import { AuthenticationFlow } from './authenticationFlow.js';

export default function usePlosAuthentication() {
  const [status, setStatus] = useState('idle');
  const flowRef = useRef(null);

  const runPlosAuth = useCallback(async (resData, { docId, userEmail, onAuthSuccess, onShowAcceptButton } = {}) => {
    setStatus('running');
    const flow = new AuthenticationFlow(resData, {
      docId,
      userEmail,
      onAuthSuccess,
      onShowAcceptButton
    });
    flowRef.current = flow;
    try {
      const result = await flow.run();
      const next =
        result.status === 'passed' || result.status === 'otp_complete'
          ? 'passed'
          : 'failed';
      setStatus(next);
      return { ...result, status: next };
    } catch {
      setStatus('failed');
      return { status: 'failed' };
    }
  }, []);

  return { status, runPlosAuth };
}
