import { applyLegacyGlobals } from './legacyGlobals.js';
import {
  loadScriptOnce,
  loadStylesheetOnce,
  loadCkeditorOnce,
} from './loadEditorAssets.js';
import {
  EDITOR_CSS_PATHS,
  EDITOR_JS_PATHS,
  EDITOR_VENDOR_JS_PATHS,
  EDITOR_VENDOR_CSS_PATHS,
} from '../manifest.js';

import momentUrl from '@assets/lib/moment.min.js?url';
import tippyUrl from '@assets/lib/tippy.min.js?url';

import initialGlobalUrl from '@editor/initial_helpers/_initialGlobalVaribale.js?url';
import editorLayoutUrl from '@editor/initial_helpers/_editorLayout.js?url';
import alertMessageLoaderUrl from '@editor/initial_helpers/_initialAlertmessageLoader.js?url';
import loadingDialogUrl from '@editor/initial_helpers/_initalLoadingDialog.js?url';
import pageLoaderUrl from '@editor/initial_helpers/_initialPageLoader.js?url';
import scriptLoaderUrl from '@editor/initial_helpers/_initialScriptLoader.js?url';
import initializerUrl from '@editor/slice_a/initializer.js?url';
import editorOpenUrl from '@editor/slice_a/editor_open.js?url';
import commonfnUrl from '@editor/slice_a/commonfn.js?url';
import demoUrl from '@editor/slice_a/demo.js?url';
import dialogsHandleUrl from '@editor/slice_a/dialogModules/dialogsHandle.js?url';
import errorMailModuleUrl from '@editor/slice_a/dialogModules/ErrorMail_Module.js?url';
import downloadModuleUrl from '@editor/slice_a/dialogModules/Download_Module.js?url';
import alertNewUrl from '@editor/slice_a/dialogModules/AlertNew.js?url';
import syncScrollspyUrl from '@editor/slice_a/editor_sync_scrollspy.js?url';
import pageEventsFnUrl from '@editor/slice_a/editor_page_events_fn.js?url';
import commonEvtHandlerUrl from '@editor/slice_a/commonEvtHandler.js?url';
import qcsBootstrapUrl from '@editor/modules/shared/query-comment-system/bootstrap.js?url';
import qcsQueryBaseUrl from '@editor/modules/shared/query-comment-system/QueryBaseModule.js?url';
import qcsAttachmentUrl from '@editor/modules/shared/query-comment-system/AttachmentModule.js?url';
import qcsQueryPanelUrl from '@editor/modules/shared/query-comment-system/QueryPanelModule.js?url';
import qcsQueryRestoreUrl from '@editor/modules/shared/query-comment-system/QueryRestoreModule.js?url';
import qcsQueryTemplatesUrl from '@editor/modules/shared/query-comment-system/QueryTemplates.js?url';
import qcsQueryUtilsUrl from '@editor/modules/shared/query-comment-system/QueryUtils.js?url';
import qcsQueryDialogUrl from '@editor/modules/shared/query-comment-system/QueryDialogModule.js?url';
import qcsRegisterUrl from '@editor/modules/shared/query-comment-system/register.js?url';
import editorBootInitUrl from '@editor/slice_a/editorBootInit.js?url';

import mainCss from '@editor/_CSS_UI/main.css?url';
import layoutCss from '@editor/_CSS_UI/editorLayout.css?url';
import mediaCss from '@common/styles/media_query.css?url';
import preloaderCss from '@common/styles/preloader.css?url';

const VENDOR_JS_URL_BY_PATH = {
  'lib/moment.min.js': momentUrl,
  'lib/tippy.min.js': tippyUrl,
};

const VENDOR_CSS_URL_BY_PATH = {};

const JS_URL_BY_PATH = {
  'initial_helpers/_initialGlobalVaribale.js': initialGlobalUrl,
  'initial_helpers/_editorLayout.js': editorLayoutUrl,
  'initial_helpers/_initialAlertmessageLoader.js': alertMessageLoaderUrl,
  'initial_helpers/_initalLoadingDialog.js': loadingDialogUrl,
  'initial_helpers/_initialPageLoader.js': pageLoaderUrl,
  'initial_helpers/_initialScriptLoader.js': scriptLoaderUrl,
  'slice_a/initializer.js': initializerUrl,
  'slice_a/editor_open.js': editorOpenUrl,
  'slice_a/commonfn.js': commonfnUrl,
  'slice_a/demo.js': demoUrl,
  'slice_a/dialogModules/dialogsHandle.js': dialogsHandleUrl,
  'slice_a/dialogModules/ErrorMail_Module.js': errorMailModuleUrl,
  'slice_a/dialogModules/Download_Module.js': downloadModuleUrl,
  'slice_a/dialogModules/AlertNew.js': alertNewUrl,
  'slice_a/editor_sync_scrollspy.js': syncScrollspyUrl,
  'slice_a/editor_page_events_fn.js': pageEventsFnUrl,
  'slice_a/commonEvtHandler.js': commonEvtHandlerUrl,
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
  'slice_a/editorBootInit.js': editorBootInitUrl,
};

const CSS_URL_BY_PATH = {
  '_CSS_UI/main.css': mainCss,
  '_CSS_UI/editorLayout.css': layoutCss,
  'common/styles/media_query.css': mediaCss,
  'common/styles/preloader.css': preloaderCss,
};

async function canLoad(url) {
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

function cssBasenames() {
  return EDITOR_CSS_PATHS.map((p) => p.split('/').pop());
}

async function loadVendorCssDev() {
  for (const p of EDITOR_VENDOR_CSS_PATHS) {
    const href = VENDOR_CSS_URL_BY_PATH[p];
    if (!href) throw new Error(`Missing vendor CSS url for ${p}`);
    await loadStylesheetOnce(href);
  }
}

async function loadVendorJsDev() {
  for (const p of EDITOR_VENDOR_JS_PATHS) {
    const src = VENDOR_JS_URL_BY_PATH[p];
    if (!src) throw new Error(`Missing vendor JS url for ${p}`);
    await loadScriptOnce(src);
  }
}

async function bootFromUrlInject() {
  await loadVendorCssDev();
  for (const p of EDITOR_CSS_PATHS) {
    if (EDITOR_VENDOR_CSS_PATHS.includes(p)) continue;
    const href = CSS_URL_BY_PATH[p];
    if (!href) throw new Error(`Missing CSS url for ${p}`);
    await loadStylesheetOnce(href);
  }
  await loadVendorJsDev();
  for (const p of EDITOR_JS_PATHS) {
    const src = JS_URL_BY_PATH[p];
    if (!src) throw new Error(`Missing JS url for ${p}`);
    await loadScriptOnce(src);
  }
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
  const version = String(window.VERSION || 'dev');
  const commonUrl = `/assets/${version}/js/e6_common.min.js`;
  const mainUrl = `/assets/${version}/js/e6_main.min.js`;
  const usePack = shouldPreferEditorPack() && (await canLoad(commonUrl));

  if (usePack) {
    for (const p of EDITOR_VENDOR_CSS_PATHS) {
      const name = p.split('/').pop();
      await loadStylesheetOnce(`/assets/${version}/vendor/${name}`);
    }
    for (const name of cssBasenames()) {
      if (EDITOR_VENDOR_CSS_PATHS.some((p) => p.endsWith(name))) continue;
      await loadStylesheetOnce(`/assets/${version}/css/${name}`);
    }
    for (const p of EDITOR_VENDOR_JS_PATHS) {
      const name = p.split('/').pop();
      await loadScriptOnce(`/assets/${version}/vendor/${name}`);
    }
    await loadScriptOnce(commonUrl);
    await loadScriptOnce(mainUrl);
    return;
  }

  await bootFromUrlInject();
}
