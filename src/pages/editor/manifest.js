/** Deduped e6_common + e6_main paths relative to @legacy (= temp/legacy/src). */

const E6_COMMON = [
  // skip js/index.js — gulp placeholders; use legacyGlobals.js instead
  'js/_initialGlobalVaribale.js',
  'js/_editorLayout.js',
  'js/_initialAlertmessageLoader.js',
  'js/_initalLoadingDialog.js',
  'js/_initialPageLoader.js',
  'js/_initialScriptLoader.js',
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

const E6_MAIN = [
  'js/editor_sync_scrollspy.js',
  'js/editor_page_events_fn.js',
  'js/commonEvtHandler.js',
  ...QUERY_COMMENT_SYSTEM,
  // demo.js already in E6_COMMON — omit
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

export const EDITOR_JS_PATHS = uniqueInOrder([...E6_COMMON, ...E6_MAIN]);

export const EDITOR_CSS_PATHS = [
  'static/css/main.css',
  'static/css/media_query.css',
  'static/css/editorLayout.css',
];
