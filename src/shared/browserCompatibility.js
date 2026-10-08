/** Re-export canonical browser compatibility (DRY — do not duplicate logic here). */
export {
  BROWSER_REQUIREMENTS,
  detectOS,
  checkBrowserCompatibility,
  isBrowserSupported,
} from '../middleware/browserCompatibility.js';
