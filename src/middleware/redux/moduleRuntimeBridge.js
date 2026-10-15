/**
 * Bridge classic ModuleRuntimeStore-style actions → RTK modulesSlice.
 * Safe to call from BaseModule / editor ESM without a React Provider.
 */
import { store } from './store.js';
import {
  moduleInitialized,
  moduleOpened,
  moduleClosed,
  buttonClicked,
  inputInteracted,
  errorRecorded,
  moduleStatePatched,
} from './modulesSlice.js';

let wired = false;

function resolveId(payload = {}) {
  return payload.id || payload.dialogId || payload.moduleId || null;
}

/**
 * Map legacy `{ type: 'module/…', payload }` to an RTK action creator result.
 * @returns {object|null}
 */
export function mapLegacyModuleActionToRtk(action) {
  if (!action || !action.type) return null;
  const payload = action.payload || {};
  const id = resolveId(payload);
  if (!id && action.type !== 'module/statePatched') return null;

  switch (action.type) {
    case 'module/initialized':
      return moduleInitialized({
        id,
        name: payload.name || payload.moduleName || null,
        dialogType: payload.dialogType || null,
      });
    case 'module/opened':
      return moduleOpened({
        id,
        origin: payload.origin || null,
        actor: payload.actor || null,
      });
    case 'module/closed':
      return moduleClosed({
        id,
        origin: payload.origin || null,
        actor: payload.actor || null,
      });
    case 'module/buttonClicked':
      return buttonClicked({
        id,
        buttonId: payload.buttonId || 'unnamed',
      });
    case 'module/inputInteracted':
      return inputInteracted({ id });
    case 'module/errorRecorded':
      return errorRecorded({
        id,
        functionName: payload.functionName || null,
        message: payload.message || null,
      });
    case 'module/statePatched':
      return moduleStatePatched(payload);
    default:
      return null;
  }
}

/** Dispatch a legacy module runtime action into the shared RTK store. */
export function dispatchModuleRuntimeToRtk(action) {
  const rtkAction = mapLegacyModuleActionToRtk(action);
  if (!rtkAction) return false;
  store.dispatch(rtkAction);
  return true;
}

/**
 * Ensure the shared app store is evaluated once and exposed for classic code.
 * Idempotent — same configureStore instance as ReactApp Provider.
 */
export function ensureEditorReduxStore() {
  if (typeof window !== 'undefined') {
    window.__IMPACT_REDUX_STORE__ = store;
    wired = true;
  }
  return store;
}

export function getEditorReduxStore() {
  return store;
}

export function isEditorReduxStoreWired() {
  return wired || (typeof window !== 'undefined' && !!window.__IMPACT_REDUX_STORE__);
}

export { store };
