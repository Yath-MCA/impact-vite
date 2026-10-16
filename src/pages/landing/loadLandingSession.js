import { applyLandingSessionGlobals } from './landingSessionGlobals.js';
import { loadScriptOnce } from './loadScriptOnce.js';

import portsUrl from './js/session/ports.js?url';
import moduleUrl from './js/session/LinkSessionModule.js?url';

let loading = null;

export async function loadLandingSessionOnce() {
  if (window.LinkSessionModule && typeof window.LinkSessionModule.getInstance === 'function') {
    return;
  }
  if (loading) return loading;
  loading = (async () => {
    applyLandingSessionGlobals();
    if (typeof window.$ === 'undefined') {
      throw new Error('jQuery required for LinkSessionCore.postRequest');
    }
    await loadScriptOnce(portsUrl);
    // Core is ESM (export default for editor island); classic script tags throw.
    await import('./js/session/LinkSessionCore.js');
    if (typeof window.LinkSessionCore !== 'function') {
      throw new Error('LinkSessionCore missing after ESM import');
    }
    await loadScriptOnce(moduleUrl);
    if (!window.LinkSessionModule) {
      throw new Error('LinkSessionModule missing after script load');
    }
  })();
  try {
    await loading;
  } finally {
    loading = null;
  }
}
