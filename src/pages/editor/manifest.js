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

/** Gulp `module_main` → packed `modules/module_main.min.js` (order matters). */
export const MODULE_MAIN_PATHS = [
  'modules/components/Error_Report_Table_Builder.js',
  'modules/components/UserActionRecord_Handler.js',
  'modules/components/ModuleStore.js',
  'modules/components/IdGenerator.js',
  'modules/components/BitsIdGenerator.js',
  'modules/components/JatsIdGenerator.js',
  'modules/components/DocBookIdGenerator.js',
  'modules/components/Renumber_Handler.js',
  'modules/components/trackManager.js',
  'modules/components/FileUploadModule.js',
  'modules/components/SummernoteManager.js',
  'modules/components/emailInputHelper.js',
  // BaseModule + UnifiedModuleSystem load as ESM from boot (not classic concat).
  'modules/module_main.js',
];

/**
 * Gulp `global_context_common` → `modules/global_context_common.min.js`.
 * Trailing globs are expanded by the packer (sorted).
 */
export const GLOBAL_CONTEXT_COMMON_PATHS = [
  'modules/context/store/module-runtime-store.js',
  'modules/context/store/template-store.js',
  'modules/context/helpers/context-helpers.js',
  'modules/shared/**/context.js',
];

/** Gulp `global_context_editor` → `modules/global_context_editor.min.js`. */
export const GLOBAL_CONTEXT_EDITOR_PATHS = [
  'modules/standalone/**/context.js',
];

/**
 * Boot load order after e6_main (classic scripts under /assets/{VERSION}/modules/).
 */
export const EDITOR_MODULE_PACK_SCRIPTS = [
  'module_main.min.js',
  'global_context_common.min.js',
  'global_context_editor.min.js',
];

/**
 * Gulp `single_module` copy rules (relative to src/pages/editor/modules/).
 * Packer emits under public/assets/{VERSION}/modules/{moduleName}/…
 */
export const SINGLE_MODULE_INCLUDE_GLOBS = [
  'standalone/**/index.js',
  'standalone/**/*.js',
  'shared/**/*.js',
  'standalone/**/template.html',
  'shared/**/template.html',
  'standalone/**/*.json',
  'shared/**/*.json',
];

export const SINGLE_MODULE_EXCLUDE_GLOBS = [
  'shared/index.js',
  'shared/**/context.js',
  'shared/browser-compatible/**',
  'shared/query-comment-system/**',
  'shared/link_session/ports.js',
  'shared/link_session/LinkSessionCore.js',
  'shared/link_session/localHostSession.js',
  'shared/link_session/LinkSessionEditor.js',
  'shared/link_session/LinkSessionModule.js',
  'shared/link_session/bootstrap.js',
  'shared/link_session_send/index.js',
];

export const SINGLE_MODULE_TEMPLATE_GLOBS = [
  'standalone/**/template.html',
  'shared/**/template.html',
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
