import { applyLegacyGlobals } from './legacyGlobals.js';
import {
  loadScriptOnce,
  loadStylesheetOnce,
  loadCkeditorOnce,
} from './loadEditorAssets.js';
import {
  EDITOR_JS_PATHS,
  EDITOR_VENDOR_JS_PATHS,
  EDITOR_VENDOR_CSS_PATHS,
  EDITOR_PAGE_CSS_PATHS,
  EDITOR_COMMON_CSS_PATHS,
  EDITOR_MODULE_PACK_SCRIPTS,
} from '../manifest.js';
import {
  resolveLocalEditorBoot,
  runLocalStagedBoot,
} from './localStagedBoot.js';

import initialGlobalUrl from '@editor/initial_helpers/_initialGlobalVaribale.js?url';
import editorLayoutUrl from '@editor/initial_helpers/_editorLayout.js?url';
import alertMessageLoaderUrl from '@editor/initial_helpers/_initialAlertmessageLoader.js?url';
import loadingDialogUrl from '@editor/initial_helpers/_initalLoadingDialog.js?url';
import pageLoaderUrl from '@editor/initial_helpers/_initialPageLoader.js?url';
import scriptLoaderUrl from '@editor/initial_helpers/_initialScriptLoader.js?url';
import initializerUrl from '@editor/js/initializer.js?url';
import editorOpenUrl from '@editor/js/editor_open.js?url';
import commonfnUrl from '@editor/js/commonfn.js?url';
import demoUrl from '@editor/js/demo.js?url';
import dialogsHandleUrl from '@editor/js/dialogModules/dialogsHandle.js?url';
import errorMailModuleUrl from '@editor/js/dialogModules/ErrorMail_Module.js?url';
import downloadModuleUrl from '@editor/js/dialogModules/Download_Module.js?url';
import alertNewUrl from '@editor/js/dialogModules/AlertNew.js?url';
import syncScrollspyUrl from '@editor/js/editor_sync_scrollspy.js?url';
import pageEventsFnUrl from '@editor/js/editor_page_events_fn.js?url';
import commonEvtHandlerUrl from '@editor/js/commonEvtHandler.js?url';
import editorBootInitUrl from '@editor/js/editorBootInit.js?url';

import mainCss from '@editor/_CSS_UI/main.css?url';
import layoutCss from '@editor/_CSS_UI/editorLayout.css?url';
import mediaCss from '@common/styles/media_query.css?url';
import preloaderCss from '@common/styles/preloader.css?url';

const JS_URL_BY_PATH = {
  'initial_helpers/_initialGlobalVaribale.js': initialGlobalUrl,
  'initial_helpers/_editorLayout.js': editorLayoutUrl,
  'initial_helpers/_initialAlertmessageLoader.js': alertMessageLoaderUrl,
  'initial_helpers/_initalLoadingDialog.js': loadingDialogUrl,
  'initial_helpers/_initialPageLoader.js': pageLoaderUrl,
  'initial_helpers/_initialScriptLoader.js': scriptLoaderUrl,
  'js/initializer.js': initializerUrl,
  'js/editor_open.js': editorOpenUrl,
  'js/commonfn.js': commonfnUrl,
  'js/demo.js': demoUrl,
  'js/dialogModules/dialogsHandle.js': dialogsHandleUrl,
  'js/dialogModules/ErrorMail_Module.js': errorMailModuleUrl,
  'js/dialogModules/Download_Module.js': downloadModuleUrl,
  'js/dialogModules/AlertNew.js': alertNewUrl,
  'js/editor_sync_scrollspy.js': syncScrollspyUrl,
  'js/editor_page_events_fn.js': pageEventsFnUrl,
  'js/commonEvtHandler.js': commonEvtHandlerUrl,
  'js/editorBootInit.js': editorBootInitUrl,
};

const PAGE_CSS_URL_BY_PATH = {
  '_CSS_UI/main.css': mainCss,
  '_CSS_UI/editorLayout.css': layoutCss,
  'common/styles/media_query.css': mediaCss,
  'common/styles/preloader.css': preloaderCss,
};

/** Slice A paths that define ErrorLogTrace / core editor (before module packs). */
const SLICE_A_HELPER_PREFIXES = ['initial_helpers/', 'js/'];

function basename(relPosix) {
  const parts = String(relPosix).replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

function editorVersion() {
  return String(
    (typeof window !== 'undefined' && (window.VERSION || window.ENV?.VERSION)) ||
      'dev'
  );
}

function vendorUrl(relPosix) {
  return `/assets/${editorVersion()}/vendor/${basename(relPosix)}`;
}

async function canLoad(url) {
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

async function loadVendorsFromPack() {
  for (const p of EDITOR_VENDOR_CSS_PATHS) {
    await loadStylesheetOnce(vendorUrl(p));
  }
  for (const p of EDITOR_VENDOR_JS_PATHS) {
    await loadScriptOnce(vendorUrl(p));
  }
}

async function loadPageCssFromPack(version) {
  for (const p of [...EDITOR_PAGE_CSS_PATHS, ...EDITOR_COMMON_CSS_PATHS]) {
    await loadStylesheetOnce(`/assets/${version}/css/${basename(p)}`);
  }
}

async function loadPageCssDev() {
  for (const p of [...EDITOR_PAGE_CSS_PATHS, ...EDITOR_COMMON_CSS_PATHS]) {
    const href = PAGE_CSS_URL_BY_PATH[p];
    if (!href) throw new Error(`Missing CSS url for ${p}`);
    await loadStylesheetOnce(href);
  }
}

function shouldPreferEditorPack() {
  const env = (typeof window !== 'undefined' && window.ENV) || {};
  if (env.USE_EDITOR_PACK === true) return true;
  if (env.USE_EDITOR_PACK === false) return false;
  return Boolean(import.meta.env.PROD);
}

/**
 * Shared components (FileUploadModule, trackManager, …) — before BaseModule/UMS.
 */
export async function ensureComponentsEsm() {
  const { ensureComponentsEsm: ensure } = await import(
    '@editor/modules/components/index.js'
  );
  await ensure();
}

/**
 * ESM BaseModule + UnifiedModuleSystem (window bridge).
 * Requires ensureComponentsEsm() first.
 */
export async function ensureModuleRuntimeEsm() {
  const [{ default: BaseModule }, { initUnifiedModuleSystem }] =
    await Promise.all([
      import('@editor/modules/_runtime/BaseModule.js'),
      import('@editor/modules/_runtime/UnifiedModuleSystem.js'),
    ]);
  if (typeof window !== 'undefined') {
    window.BaseModule = BaseModule;
  }
  await initUnifiedModuleSystem();
}

/**
 * ContextHelpers + stores — after window.moduleSystem exists.
 */
export async function ensureContextHelpersEsm() {
  const { ensureContextHelpersEsm: ensure } = await import(
    '@editor/modules/context/index.js'
  );
  return ensure();
}

/**
 * Side-effect import all context.js files (registerOnReady).
 * Vite-dev: import.meta.glob. Prod/pack: native-import packed URLs.
 */
export async function ensureContextRegistrationsEsm() {
  const preferVite =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.DEV === true;

  if (preferVite && typeof import.meta.glob === 'function') {
    const importers = import.meta.glob([
      '../modules/shared/**/context.js',
      '../modules/standalone/**/context.js',
    ]);
    await Promise.all(Object.values(importers).map((load) => load()));
    return;
  }

  const version = editorVersion();
  const importPacked = (url) => new Function('u', 'return import(u)')(url);
  // Manifest-derived list is not available in browser; discover via pack tree
  // by fetching known shared/standalone module folders that ship context.js.
  // Prefer pre-built index if present; else fall back to Vite-packed paths from
  // a lightweight discovery endpoint pattern under modules/.
  const indexUrl = `/assets/${version}/modules/context/_context_index.json`;
  let paths = [];
  try {
    const res = await fetch(indexUrl, { cache: 'no-store' });
    if (res.ok) paths = await res.json();
  } catch {
    /* ignore */
  }
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error(
      `Missing packed context index ${indexUrl} — run npm run pack:editor`
    );
  }
  await Promise.all(
    paths.map((rel) =>
      importPacked(`/assets/${version}/modules/${String(rel).replace(/^\.\//, '')}`)
    )
  );
}

/** Helpers + all context.js registrations. */
export async function ensureContextEsm() {
  await ensureContextHelpersEsm();
  await ensureContextRegistrationsEsm();
}

/** QCS ESM island — after BaseModule runtime; sets window.queryModule + ensureQueryModule. */
export async function ensureQueryCommentIsland() {
  const { initQueryCommentSystem, ensureQueryModule } = await import(
    '@editor/modules/shared/query-comment-system/index.js'
  );
  if (typeof window !== 'undefined') {
    window.ensureQueryModule = ensureQueryModule;
  }
  return initQueryCommentSystem();
}

async function loadClassicModulePackScripts(version) {
  for (const name of EDITOR_MODULE_PACK_SCRIPTS) {
    const url = `/assets/${version}/modules/${name}`;
    if (!(await canLoad(url))) {
      throw new Error(
        `Missing packed module script ${url} — run npm run pack:editor`
      );
    }
    await loadScriptOnce(url);
  }
}

/**
 * Full module stack: components → classic module_main → runtime → context → QCS.
 */
export async function loadModulePacks(version) {
  const v = version ?? editorVersion();
  await ensureComponentsEsm();
  await loadClassicModulePackScripts(v);
  await ensureModuleRuntimeEsm();
  await ensureContextEsm();
  await ensureQueryCommentIsland();
}

async function loadSliceAFromPack(version) {
  const commonUrl = `/assets/${version}/js/e6_common.min.js`;
  const mainUrl = `/assets/${version}/js/e6_main.min.js`;
  await loadScriptOnce(commonUrl);
  await loadScriptOnce(mainUrl);
}

async function loadSliceAFromUrlInject() {
  for (const p of EDITOR_JS_PATHS) {
    const src = JS_URL_BY_PATH[p];
    if (!src) throw new Error(`Missing JS url for ${p}`);
    await loadScriptOnce(src);
  }
}

function buildStagedApi(version, usePack) {
  return {
    async loadUiShell() {
      await loadCkeditorOnce();
      await loadVendorsFromPack();
      if (usePack) await loadPageCssFromPack(version);
      else await loadPageCssDev();
    },
    async loadSliceA() {
      if (usePack) await loadSliceAFromPack(version);
      else await loadSliceAFromUrlInject();
    },
    async loadInitialHelpers() {
      // Slice A already includes initial_helpers + ErrorMail; nothing extra.
      console.info(
        '[localStagedBoot] initial_helpers already in Slice A — no extra scripts'
      );
    },
    async loadComponentsEsm() {
      await ensureComponentsEsm();
    },
    async loadModulePacks() {
      await loadClassicModulePackScripts(version);
    },
    async loadModulesEsm() {
      await ensureModuleRuntimeEsm();
      await ensureQueryCommentIsland();
    },
    async loadContextEsm() {
      await ensureContextEsm();
    },
  };
}

async function bootFromUrlInject() {
  await loadVendorsFromPack();
  await loadPageCssDev();
  await loadSliceAFromUrlInject();
  await loadModulePacks(editorVersion());
}

export async function bootEditor() {
  applyLegacyGlobals();

  const version = editorVersion();
  const commonUrl = `/assets/${version}/js/e6_common.min.js`;
  const usePack = shouldPreferEditorPack() && (await canLoad(commonUrl));

  const staged = resolveLocalEditorBoot();
  if (staged) {
    await runLocalStagedBoot(staged, buildStagedApi(version, usePack));
    return;
  }

  await loadCkeditorOnce();

  if (usePack) {
    await loadVendorsFromPack();
    await loadPageCssFromPack(version);
    await loadSliceAFromPack(version);
    await loadModulePacks(version);
    return;
  }

  await bootFromUrlInject();
}
