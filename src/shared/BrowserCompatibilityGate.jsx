/**
 * Optional route-level gate for a later landing wrap.
 * Validate-first slice runs the check inside ValidateUrlPage instead.
 */
import { useEffect, useState } from 'react';
import { checkBrowserCompatibility } from './browserCompatibility.js';
import { LandingMessageKey, showLandingMessage } from '../pages/landing/messages/index.js';

function BrowserCompatibilityGate({ children }) {
  const [isSupported, setIsSupported] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function validateBrowser() {
      const browserInfo = checkBrowserCompatibility();
      if (typeof window !== 'undefined') {
        window.browserInfo = browserInfo;
      }

      const supported = Boolean(browserInfo.isAllowed && browserInfo.isCompatible);
      if (!supported) {
        await showLandingMessage(LandingMessageKey.UNSUPPORTED_BROWSER);
      }

      if (!cancelled) {
        setIsSupported(supported);
      }
    }

    validateBrowser();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isSupported !== true) {
    return null;
  }

  return children;
}

export default BrowserCompatibilityGate;
