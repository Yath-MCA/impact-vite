/**
 * Slice A + CSS paths relative to src/pages/editor/
 * (except common/* → src/pages/common/, lib|fonts/* → src/assets/).
 *
 * Vendor inventory is maintained HERE only. Boot loads packed
 * /assets/{VERSION}/vendor/{basename} — do not duplicate lists in boot.js.
 *
 * Skip jquery/bootstrap (already provided by src/main.js).
 * Omit paths that are not present under src/assets yet (jquery-ui, fontawesome).
 */

function nonEmpty(paths) {
  return paths.filter((p) => typeof p === 'string' && p.trim().length > 0);
}

export const EDITOR_VENDOR_JS_PATHS = nonEmpty([
  'lib/popper/popper.min.js',
  'lib/sweetalert2/sweetalert2.all.min.js',
  'lib/moment.min.js',
  'lib/mustache.min.js',
  'lib/tippy.min.js',
  'lib/axios.min.js',
  'lib/bootstrap/js/bootstrap-dropdownhover.js',
  'lib/bootstrap-tour/js/bootstrap-tour-standalone.js',
  'lib/Sortable.min.js',
  'lib/summernote/0.8.2/summernote.min.js',
]);

export const EDITOR_VENDOR_CSS_PATHS = nonEmpty([
  'lib/summernote/0.8.2/summernote.css',
  'lib/bootstrap-tour/css/bootstrap-tour-standalone.css',
  'lib/mathlive/mathlive-static.css',
]);

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
 * 1) vendor
 * 2) editor page: main + editorLayout
 * 3) common: media_query + preloader
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
