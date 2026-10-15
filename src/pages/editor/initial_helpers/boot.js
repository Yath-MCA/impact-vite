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
import qcsBootstrapUrl from '@editor/modules/shared/query-comment-system/bootstrap.js?url';
import qcsQueryBaseUrl from '@editor/modules/shared/query-comment-system/QueryBaseModule.js?url';
import qcsAttachmentUrl from '@editor/modules/shared/query-comment-system/AttachmentModule.js?url';
import qcsQueryPanelUrl from '@editor/modules/shared/query-comment-system/QueryPanelModule.js?url';
import qcsQueryRestoreUrl from '@editor/modules/shared/query-comment-system/QueryRestoreModule.js?url';
import qcsQueryTemplatesUrl from '@editor/modules/shared/query-comment-system/QueryTemplates.js?url';
import qcsQueryUtilsUrl from '@editor/modules/shared/query-comment-system/QueryUtils.js?url';
import qcsQueryDialogUrl from '@editor/modules/shared/query-comment-system/QueryDialogModule.js?url';
import qcsRegisterUrl from '@editor/modules/shared/query-comment-system/register.js?url';
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
  'modules/shared/query-comment-system/bootstrap.js': qcsBootstrapUrl,
  'modules/shared/query-comment-system/QueryBaseModule.js': qcsQueryBaseUrl,
  'modules/shared/query-comment-system/AttachmentModule.js': qcsAttachmentUrl,
  'modules/shared/query-comment-system/QueryPanelModule.js': qcsQueryPanelUrl,
  'modules/shared/query-comment-system/QueryRestoreModule.js':
    qcsQueryRestoreUrl,
  'modules/shared/query-comment-system/QueryTemplates.js': qcsQueryTemplatesUrl,
  'modules/shared/query-comment-system/QueryUtils.js': qcsQueryUtilsUrl,
  'modules/shared/query-comment-system/QueryDialogModule.js':
    qcsQueryDialogUrl,
  'modules/shared/query-comment-system/register.js': qcsRegisterUrl,
  'js/editorBootInit.js': editorBootInitUrl,
};

const PAGE_CSS_URL_BY_PATH = {
  '_CSS_UI/main.css': mainCss,
  '_CSS_UI/editorLayout.css': layoutCss,
  'common/styles/media_query.css': mediaCss,
  'common/styles/preloader.css': preloaderCss,
};

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

/** Vendors always come from packed public/assets — manifest is the only inventory. */
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

/**
 * ESM BaseModule + UnifiedModuleSystem (window bridge).
 * Must run after module_main.min.js (FileUploadModule, etc.) and before context packs.
 */
async function ensureModuleRuntimeEsm() {
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

/** module_main then ESM runtime then global_context_* (classic contexts). */
async function loadModulePacks(version) {
  for (const name of EDITOR_MODULE_PACK_SCRIPTS) {
    const url = `/assets/${version}/modules/${name}`;
    if (!(await canLoad(url))) {
      throw new Error(`Missing packed module script ${url} — run npm run pack:editor`);
    }
    await loadScriptOnce(url);
    if (name === 'module_main.min.js') {
      await ensureModuleRuntimeEsm();
    }
  }
  if (!EDITOR_MODULE_PACK_SCRIPTS.includes('module_main.min.js')) {
    await ensureModuleRuntimeEsm();
  }
}

async function bootFromUrlInject() {
  await loadVendorsFromPack();
  await loadPageCssDev();
  for (const p of EDITOR_JS_PATHS) {
    const src = JS_URL_BY_PATH[p];
    if (!src) throw new Error(`Missing JS url for ${p}`);
    await loadScriptOnce(src);
  }
  await loadModulePacks(editorVersion());
}

function shouldPreferEditorPack() {
  const env = (typeof window !== 'undefined' && window.ENV) || {};
  if (env.USE_EDITOR_PACK === true) return true;
  if (env.USE_EDITOR_PACK === false) return false;
  return Boolean(import.meta.env.PROD);
}

export async function bootEditor() {
  applyLegacyGlobals();
  await loadCkeditorOnce();
  const version = editorVersion();
  const commonUrl = `/assets/${version}/js/e6_common.min.js`;
  const mainUrl = `/assets/${version}/js/e6_main.min.js`;
  const usePack = shouldPreferEditorPack() && (await canLoad(commonUrl));

  if (usePack) {
    await loadVendorsFromPack();
    await loadPageCssFromPack(version);
    await loadScriptOnce(commonUrl);
    await loadScriptOnce(mainUrl);
    await loadModulePacks(version);
    return;
  }

  await bootFromUrlInject();
}
