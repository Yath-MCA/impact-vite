// Hand-maintained snapshot of the impactweb -> impact_react_vite EDITOR MODULE migration.
// This tracks legacy editor modules/plugins/handlers, not the Session Service backend
// (see migrationStatusData.js for that, separate axis).
// Source: a manual survey of impactweb/src/modules/{standalone,shared}, impactweb/ckeditor/plugins,
// and impactweb/src/js/{common,dialogModules} against impact_react_vite/src, run 2026-09-06.
// Update this file when a module's real-world port status changes — it is not fed by a live scan.

import { STATUS } from './migrationStatusData';

export const EDITOR_MODULE_STATUS_UPDATED_AT = '2026-09-13';

export const MODULE_PLUMBING_CAVEAT =
  'ModuleManager/ModuleContext exist and work, but currently only back 4 placeholder demo ' +
  'modules (settings, styles, media, inspector) defined inline in EditorPage.jsx -- none of the ' +
  'legacy modules below are registered there yet. A file existing under a matching path does not ' +
  'mean it is wired into the live editor.';

export const editorModuleCategories = [
  {
    category: 'Standalone Modules',
    legacyPath: 'impactweb/src/modules/standalone/',
    items: [
      { name: 'abstract_words', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'authenticator', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'document_restore', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'edit_citation_text', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'edit_reference_text', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'figures', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'guide_tour', status: STATUS.AUTHORITATIVE, path: 'src/features/editor/tour/useGuidedTour.js', note: 'Fully ported via react-joyride, wired into EditorPage.jsx.' },
      { name: 'hyperlink_module', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'id_generation', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'image_annotate', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'image_gray_scale', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'insert_symbol', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'link_share', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'math_group', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'notes_group', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'para_bits', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'para_id', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'pi_module', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'ref_interest_level', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'ref_sort', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'reference', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'share_invite', status: STATUS.PARTIAL, path: 'src/features/editor/components/ShareInviteDialog.jsx', note: 'v1: recipient chips (EmailChipsInput) + apiService.shareAndInvite. No co-role metadata or self-email validation (deferred per 2026-09-13 design doc).' },
      { name: 'supplementary_material', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'support_mail', status: STATUS.PARTIAL, path: 'src/features/editor/components/ContactSupportDialog.jsx', note: 'v1: subject/message/CC/attachment/browser-info via apiService.sendEmail. Plain textarea, not Summernote (deferred per 2026-09-13 design doc).' },
      { name: 'tables', status: STATUS.NOT_STARTED, path: null, note: '' }
    ]
  },
  {
    category: 'Shared Modules',
    legacyPath: 'impactweb/src/modules/shared/',
    items: [
      { name: 'alert', status: STATUS.AUTHORITATIVE, path: 'src/services/alerts/', note: 'Actively used app-wide, wired via registerEditorAlertBridge.js.' },
      { name: 'browser-compatible', status: STATUS.AUTHORITATIVE, path: 'src/services/core/browserCompatibility.js', note: 'Gates the app router (BrowserCompatibilityGate.jsx).' },
      { name: 'citation_popup', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'link_session', status: STATUS.PARTIAL, path: 'src/services/session/sessionCheckClassify.js', note: 'Conflict/error classification ported, scoped to landing/session-claim flow only.' },
      { name: 'link_session_request', status: STATUS.PARTIAL, path: 'src/services/session/tabPresence.js', note: 'Functionality folded into sessionGateway.js / claimValidateTab rather than a discrete module.' },
      { name: 'link_session_send', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'qc_validation', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'query-comment-system', status: STATUS.DRAFTED, path: 'src/features/editor/components/Queries.jsx', note: 'UI shells exist and render; not verified against full legacy feature set.' },
      { name: 'ref_bridge', status: STATUS.NOT_STARTED, path: null, note: '' },
      { name: 'tooltip', status: STATUS.NOT_STARTED, path: null, note: '' }
    ]
  },
  {
    category: 'CKEditor Initialization',
    legacyPath: 'impactweb/src/js/editorBootInit.js',
    items: [
      { name: 'CKEditor boot sequence', status: STATUS.PARTIAL, path: 'src/shared/utils/loadCKEditor.js', note: 'Only injects the CKEditor 4 <script> tag and resolves on load (36 lines) -- does not replicate legacy\'s phased boot orchestration (editorShell -> tier1 -> query -> tier2 -> trackFollowUp, ~439 lines).' }
    ]
  },
  {
    category: 'Paragraph Lock Sync (paraLockSync)',
    legacyPath: 'impactweb/ckeditor/plugins/paraLockSync/',
    items: [
      { name: 'paraLockSync CKEditor plugin', status: STATUS.NOT_STARTED, path: null, note: 'No plugin port and no socket sync exist in impact_react_vite.' },
      { name: 'Editor collaboration socket', status: STATUS.NOT_STARTED, path: null, note: 'sessionSocketClient.js exists but is for the unrelated Session Service backend migration (see the table above) -- not editor/paraLock collaboration.' }
    ]
  },
  {
    category: 'Legacy Event/Handler Layer',
    legacyPath: 'impactweb/src/js/{common,dialogModules}/',
    items: [
      { name: 'ckeditorEventsModule.js', status: STATUS.NOT_STARTED, path: null, note: '821 lines in legacy; no equivalent found.' },
      { name: 'commonEvtHandler.js', status: STATUS.NOT_STARTED, path: null, note: '5,681 lines in legacy -- the single largest unmigrated surface in this app.' },
      { name: 'dialogsHandle.js', status: STATUS.NOT_STARTED, path: null, note: '959 lines in legacy; no equivalent found.' },
      { name: 'dialogModules/* family', status: STATUS.NOT_STARTED, path: null, note: 'Citation_Module, ApplyStyle, Ref_common, WebSpellCheck_Module, ParaMergeSplit_LIST, ShowTracking_Module, etc. -- zero ports found.' }
    ]
  }
];
