import { useCallback, useEffect, useRef, useState } from 'react';
import { getAcceptButtonTtlMs, computeAcceptButtonVisible } from './acceptButtonVisibility.js';

/**
 * Controls AGREE & CONTINUE visibility: 5-minute window + hide when tab hidden.
 * On tab visible again, calls onRevalidate to refresh urlvalidity.
 */
export default function useAcceptButtonVisibility({
  landingActive = false,
  onRevalidate
} = {}) {
  const [timerExpired, setTimerExpired] = useState(false);
  const [tabHidden, setTabHidden] = useState(
    typeof document !== 'undefined' ? document.hidden : false
  );
  const timerRef = useRef(null);
  const revalidatingRef = useRef(false);

  const resetAcceptTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimerExpired(false);
    if (!landingActive) return;
    timerRef.current = setTimeout(() => {
      setTimerExpired(true);
    }, getAcceptButtonTtlMs());
  }, [landingActive]);

  useEffect(() => {
    resetAcceptTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [landingActive, resetAcceptTimer]);

  useEffect(() => {
    const onVisibility = async () => {
      const hidden = document.hidden;
      setTabHidden(hidden);

      if (hidden) return;

      if (!landingActive || !onRevalidate || revalidatingRef.current) return;

      revalidatingRef.current = true;
      try {
        const ok = await onRevalidate();
        if (ok) {
          setTimerExpired(false);
          resetAcceptTimer();
        }
      } finally {
        revalidatingRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [landingActive, onRevalidate, resetAcceptTimer]);

  const showAcceptButton = computeAcceptButtonVisible({
    landingActive,
    timerExpired,
    tabHidden
  });

  return {
    showAcceptButton,
    timerExpired,
    tabHidden,
    resetAcceptTimer
  };
}
