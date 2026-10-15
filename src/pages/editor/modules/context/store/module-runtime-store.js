/**
 * ModuleRuntimeStore — facade over the shared RTK `modules` slice.
 * Keeps the classic getState/dispatch/subscribe API for BaseModule while
 * Redux Toolkit owns openIds, lastOpened/lastClosed, and timeline.
 */
import {
  dispatchModuleRuntimeToRtk,
  ensureEditorReduxStore,
  getEditorReduxStore,
} from '../../../../../middleware/redux/moduleRuntimeBridge.js';

function nowIso() {
  return new Date().toISOString();
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getDocumentMeta() {
  const global = typeof window !== 'undefined' ? window : globalThis;
  const sharedKey = global.SHARED_KEY || {};
  const userInfo = global.USER_INFO || {};
  return {
    docid: global.DOC_ID || sharedKey.docid || null,
    dtd: global.DOC_DTD || sharedKey.dtd || null,
    client: sharedKey.client || sharedKey.clientcode || null,
    role: userInfo.ROLE_ID || sharedKey.role || null,
  };
}

/** Project RTK modules slice (+ document meta) into the legacy store shape. */
function projectLegacyState() {
  const root = getEditorReduxStore().getState();
  const modules = root.modules || {
    runtime: {},
    modules: { byId: {}, openIds: [] },
    timeline: [],
  };
  return clone({
    runtime: modules.runtime || {},
    modules: modules.modules || { byId: {}, openIds: [] },
    document: getDocumentMeta(),
    timeline: modules.timeline || [],
  });
}

function createFacade() {
  ensureEditorReduxStore();
  const rtkStore = getEditorReduxStore();

  return {
    getState() {
      return projectLegacyState();
    },
    dispatch(action) {
      if (!action || !action.type) return action;
      dispatchModuleRuntimeToRtk(action);
      return action;
    },
    subscribe(listener) {
      if (typeof listener !== 'function') return function () {};
      return rtkStore.subscribe(() => {
        try {
          listener(projectLegacyState());
        } catch (err) {
          console.warn(
            'ModuleRuntimeStore listener failed:',
            err && err.message ? err.message : err
          );
        }
      });
    },
  };
}

const ModuleRuntimeStore = createFacade();

if (typeof window !== 'undefined') {
  window.ModuleRuntimeStore = ModuleRuntimeStore;
}

export default ModuleRuntimeStore;
export { ModuleRuntimeStore, nowIso };
