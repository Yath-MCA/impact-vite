import { applyLegacyGlobals } from './legacyGlobals.js';
import { loadScriptOnce, loadStylesheetOnce, loadCkeditorOnce } from './loadEditorAssets.js';
import { EDITOR_CSS_PATHS, EDITOR_JS_PATHS } from './manifest.js';

import initialGlobalUrl from '@legacy/js/_initialGlobalVaribale.js?url';
import editorLayoutUrl from '@legacy/js/_editorLayout.js?url';
import alertMessageLoaderUrl from '@legacy/js/_initialAlertmessageLoader.js?url';
import loadingDialogUrl from '@legacy/js/_initalLoadingDialog.js?url';
import pageLoaderUrl from '@legacy/js/_initialPageLoader.js?url';
import scriptLoaderUrl from '@legacy/js/_initialScriptLoader.js?url';
import initializerUrl from '@legacy/js/initializer.js?url';
import editorOpenUrl from '@legacy/js/editor_open.js?url';
import commonfnUrl from '@legacy/js/commonfn.js?url';
import demoUrl from '@legacy/js/demo.js?url';
import dialogsHandleUrl from '@legacy/js/dialogModules/dialogsHandle.js?url';
import errorMailModuleUrl from '@legacy/js/dialogModules/ErrorMail_Module.js?url';
import downloadModuleUrl from '@legacy/js/dialogModules/Download_Module.js?url';
import alertNewUrl from '@legacy/js/dialogModules/AlertNew.js?url';
import syncScrollspyUrl from '@legacy/js/editor_sync_scrollspy.js?url';
import pageEventsFnUrl from '@legacy/js/editor_page_events_fn.js?url';
import commonEvtHandlerUrl from '@legacy/js/commonEvtHandler.js?url';
import qcsBootstrapUrl from '@legacy/modules/shared/query-comment-system/bootstrap.js?url';
import qcsQueryBaseUrl from '@legacy/modules/shared/query-comment-system/QueryBaseModule.js?url';
import qcsAttachmentUrl from '@legacy/modules/shared/query-comment-system/AttachmentModule.js?url';
import qcsQueryPanelUrl from '@legacy/modules/shared/query-comment-system/QueryPanelModule.js?url';
import qcsQueryRestoreUrl from '@legacy/modules/shared/query-comment-system/QueryRestoreModule.js?url';
import qcsQueryTemplatesUrl from '@legacy/modules/shared/query-comment-system/QueryTemplates.js?url';
import qcsQueryUtilsUrl from '@legacy/modules/shared/query-comment-system/QueryUtils.js?url';
import qcsQueryDialogUrl from '@legacy/modules/shared/query-comment-system/QueryDialogModule.js?url';
import qcsRegisterUrl from '@legacy/modules/shared/query-comment-system/register.js?url';
import editorBootInitUrl from '@legacy/js/editorBootInit.js?url';

import mainCss from '@legacy/static/css/main.css?url';
import mediaCss from '@legacy/static/css/media_query.css?url';
import layoutCss from '@legacy/static/css/editorLayout.css?url';

const JS_URL_BY_PATH = {
  'js/_initialGlobalVaribale.js': initialGlobalUrl,
  'js/_editorLayout.js': editorLayoutUrl,
  'js/_initialAlertmessageLoader.js': alertMessageLoaderUrl,
  'js/_initalLoadingDialog.js': loadingDialogUrl,
  'js/_initialPageLoader.js': pageLoaderUrl,
  'js/_initialScriptLoader.js': scriptLoaderUrl,
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
  'modules/shared/query-comment-system/QueryRestoreModule.js': qcsQueryRestoreUrl,
  'modules/shared/query-comment-system/QueryTemplates.js': qcsQueryTemplatesUrl,
  'modules/shared/query-comment-system/QueryUtils.js': qcsQueryUtilsUrl,
  'modules/shared/query-comment-system/QueryDialogModule.js': qcsQueryDialogUrl,
  'modules/shared/query-comment-system/register.js': qcsRegisterUrl,
  'js/editorBootInit.js': editorBootInitUrl,
};

const CSS_URL_BY_PATH = {
  'static/css/main.css': mainCss,
  'static/css/media_query.css': mediaCss,
  'static/css/editorLayout.css': layoutCss,
};

async function canLoad(url) {
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

async function bootFromUrlInject() {
  for (const p of EDITOR_CSS_PATHS) {
    const href = CSS_URL_BY_PATH[p];
    if (!href) throw new Error(`Missing CSS url for ${p}`);
    await loadStylesheetOnce(href);
  }
  for (const p of EDITOR_JS_PATHS) {
    const src = JS_URL_BY_PATH[p];
    if (!src) throw new Error(`Missing JS url for ${p}`);
    await loadScriptOnce(src);
  }
}

export async function bootEditor() {
  applyLegacyGlobals();
  await loadCkeditorOnce();
  const version = String(window.VERSION || 'dev');
  const commonUrl = `/assets/${version}/js/e6_common.min.js`;
  const mainUrl = `/assets/${version}/js/e6_main.min.js`;
  const usePack = await canLoad(commonUrl);

  if (usePack) {
    for (const name of ['main.css', 'media_query.css', 'editorLayout.css']) {
      await loadStylesheetOnce(`/assets/${version}/css/${name}`);
    }
    await loadScriptOnce(commonUrl);
    await loadScriptOnce(mainUrl);
    return;
  }

  await bootFromUrlInject();
}
