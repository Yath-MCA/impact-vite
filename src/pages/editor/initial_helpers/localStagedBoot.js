/**
 * Localhost-only staged editor boot with boolean gates.
 * Flip gates (or hash query) to stop after shell / setContent / helpers / modules.
 *
 * Defaults all true when enabled. Honored only if IS_LOCAL_HOST (or ENV force).
 *
 * Query (hash): #/editor?docid=…&localBoot=1&setContent=0&loadModulesEsm=0
 */

const DEFAULT_GATES = {
  enabled: true,
  loadUiShell: true,
  loadSliceA: true,
  waitUiReady: true,
  loadInitialHelpers: true,
  setContent: false,
  loadComponentsEsm: false,
  loadModulePacks: false,
  loadModulesEsm: false,
  loadContextEsm: false,
};

function parseBool(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  const s = String(raw).toLowerCase();
  if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
  if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
  return fallback;
}

function hashOrSearchParams() {
  if (typeof window === 'undefined') return new URLSearchParams();
  const hash = String(window.location.hash || '');
  const qi = hash.indexOf('?');
  if (qi >= 0) return new URLSearchParams(hash.slice(qi + 1));
  return new URLSearchParams(window.location.search || '');
}

function isLocalHost() {
  if (typeof window === 'undefined') return false;
  if (window.IS_LOCAL_HOST === true) return true;
  if (window.ENV?.FORCE_LOCAL_EDITOR_BOOT === true) return true;
  try {
    return /localhost/i.test(String(window.location?.href || ''));
  } catch {
    return false;
  }
}

/**
 * Resolve LOCAL_EDITOR_BOOT from window / ENV / query.
 * Returns null when staged mode should not run.
 */
export function resolveLocalEditorBoot() {
  if (!isLocalHost()) return null;

  const params = hashOrSearchParams();
  const envCfg =
    (typeof window !== 'undefined' &&
      (window.LOCAL_EDITOR_BOOT || window.ENV?.LOCAL_EDITOR_BOOT)) ||
    {};

  const localBootParam = params.get('localBoot');
  const enabled = parseBool(
    localBootParam != null ? localBootParam : envCfg.enabled,
    DEFAULT_GATES.enabled
  );
  if (!enabled) return null;

  const gates = { ...DEFAULT_GATES, ...envCfg, enabled: true };
  for (const key of Object.keys(DEFAULT_GATES)) {
    if (key === 'enabled') continue;
    if (params.has(key)) {
      gates[key] = parseBool(params.get(key), gates[key]);
    }
  }

  if (typeof window !== 'undefined') {
    window.LOCAL_EDITOR_BOOT = gates;
  }
  return gates;
}

function logBanner(gates) {
  const on = Object.entries(gates)
    .filter(([k, v]) => k !== 'enabled' && v === true)
    .map(([k]) => k);
  const off = Object.entries(gates)
    .filter(([k, v]) => k !== 'enabled' && v === false)
    .map(([k]) => k);
  console.info(
    '[localStagedBoot] enabled',
    { on, off, gates }
  );
}

async function runGate(name, enabled, fn) {
  if (!enabled) {
    console.info(`[localStagedBoot] skip ${name}`);
    return;
  }
  console.info(`[localStagedBoot] → ${name}`);
  await fn();
  console.info(`[localStagedBoot] ✓ ${name}`);
}

async function waitUiReady(timeoutMs = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      const body =
        document.getElementById('Body') ||
        document.querySelector('[data-page-id="editor"]');
      if (body) {
        resolve(body);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('waitUiReady timed out — #Body not found'));
        return;
      }
      setTimeout(check, 50);
    }
    check();
  });
}

async function waitForEditorThenSetContent(timeoutMs = 60000) {
  const started = Date.now();
  const ed = await new Promise((resolve, reject) => {
    function check() {
      const editor =
        window.GlobalEditor ||
        (window.CKEDITOR &&
          window.CKEDITOR.instances &&
          window.CKEDITOR.instances.maineditor);
      if (editor && editor.document && editor.document.$) {
        resolve(editor);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(
          new Error(
            'setContent gate: editor instanceReady timed out (continue with later gates skipped if you flip flags)'
          )
        );
        return;
      }
      setTimeout(check, 100);
    }
    check();
  });

  if (window.SET_DATA && typeof window.SET_DATA.init === 'function') {
    // Document HTML may already be flowing through editor_open; no forced empty setData.
    console.info('[localStagedBoot] SET_DATA.init available (shell path owns content)');
    return ed;
  }
  if (ed && typeof ed.setData === 'function') {
    console.info('[localStagedBoot] GlobalEditor ready for setData');
  }
  return ed;
}

/**
 * @param {object} gates LOCAL_EDITOR_BOOT
 * @param {object} api stage implementations from boot.js
 */
export async function runLocalStagedBoot(gates, api) {
  logBanner(gates);

  await runGate('loadUiShell', gates.loadUiShell, () => api.loadUiShell());
  await runGate('waitUiReady', gates.waitUiReady, () => waitUiReady());  
  await runGate('loadInitialHelpers', gates.loadInitialHelpers, () =>
    api.loadInitialHelpers()
  );
  await runGate('loadSliceA', gates.loadSliceA, () => api.loadSliceA());
  await runGate('setContent', gates.setContent, () =>
    waitForEditorThenSetContent().catch((err) => {
      // Editor often becomes ready only after user/doc open — soft-fail this gate.
      console.warn('[localStagedBoot]', err.message || err);
    })
  );
  await runGate('loadComponentsEsm', gates.loadComponentsEsm, () =>
    api.loadComponentsEsm()
  );
  await runGate('loadModulePacks', gates.loadModulePacks, () =>
    api.loadModulePacks()
  );
  await runGate('loadModulesEsm', gates.loadModulesEsm, () =>
    api.loadModulesEsm()
  );
  await runGate('loadContextEsm', gates.loadContextEsm, () =>
    api.loadContextEsm()
  );

  console.info('[localStagedBoot] done');
}
