import { applyLandingSessionGlobals } from './landingSessionGlobals.js';
import { loadScriptOnce } from './loadScriptOnce.js';

import portsUrl from './js/session/ports.js?url';
import coreUrl from './js/session/LinkSessionCore.js?url';
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
    await loadScriptOnce(coreUrl);
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
