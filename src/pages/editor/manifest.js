/**
 * Slice A + CSS paths relative to src/pages/editor/
 * (except common/* → src/pages/common/, vendor lib/* → src/assets/).
 */

export const EDITOR_VENDOR_JS_PATHS = [
  'lib/moment.min.js',
  'lib/tippy.min.js',
];

/** Optional third-party CSS under src/assets (empty until needed). */
export const EDITOR_VENDOR_CSS_PATHS = [];

export const E6_COMMON_PATHS = [
  // skip js/index.js — gulp leftovers; use initial_helpers/legacyGlobals.js
  'initial_helpers/_initialGlobalVaribale.js',
  'initial_helpers/_editorLayout.js',
  'initial_helpers/_initialAlertmessageLoader.js',
  'initial_helpers/_initalLoadingDialog.js',
  'initial_helpers/_initialPageLoader.js',
  'initial_helpers/_initialScriptLoader.js',
  'js/initializer.js',
  'js/editor_open.js',
  'js/commonfn.js',
  'js/demo.js',
  'js/dialogModules/dialogsHandle.js',
  'js/dialogModules/ErrorMail_Module.js',
  'js/dialogModules/Download_Module.js',
  'js/dialogModules/AlertNew.js',
];

const QUERY_COMMENT_SYSTEM = [
  'modules/shared/query-comment-system/bootstrap.js',
  'modules/shared/query-comment-system/QueryBaseModule.js',
  'modules/shared/query-comment-system/AttachmentModule.js',
  'modules/shared/query-comment-system/QueryPanelModule.js',
  'modules/shared/query-comment-system/QueryRestoreModule.js',
  'modules/shared/query-comment-system/QueryTemplates.js',
  'modules/shared/query-comment-system/QueryUtils.js',
  'modules/shared/query-comment-system/QueryDialogModule.js',
  'modules/shared/query-comment-system/register.js',
];

export const E6_MAIN_PATHS = [
  'js/editor_sync_scrollspy.js',
  'js/editor_page_events_fn.js',
  'js/commonEvtHandler.js',
  ...QUERY_COMMENT_SYSTEM,
  'js/editorBootInit.js',
];

function uniqueInOrder(paths) {
  const seen = new Set();
  const out = [];
  for (const p of paths) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

export const EDITOR_JS_PATHS = uniqueInOrder([
  ...E6_COMMON_PATHS,
  ...E6_MAIN_PATHS,
]);

/**
 * Pack/boot CSS order:
 * 1) vendor (optional)
 * 2) editor page: main + editorLayout
 * 3) common: media_query + preloader
 * `common/…` resolves under src/pages/common/.
 */
export const EDITOR_PAGE_CSS_PATHS = [
  '_CSS_UI/main.css',
  '_CSS_UI/editorLayout.css',
];

export const EDITOR_COMMON_CSS_PATHS = [
  'common/styles/media_query.css',
  'common/styles/preloader.css',
];

export const EDITOR_CSS_PATHS = [
  ...EDITOR_VENDOR_CSS_PATHS,
  ...EDITOR_PAGE_CSS_PATHS,
  ...EDITOR_COMMON_CSS_PATHS,
];
