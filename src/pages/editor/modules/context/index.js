/**
 * Context layer ESM — stores + ContextHelpers.
 * Load after window.moduleSystem exists; before context.js registrations.
 */
import './store/module-runtime-store.js';
import './store/template-store.js';
import ContextHelpers from './helpers/context-helpers.js';

export { default as ModuleRuntimeStore } from './store/module-runtime-store.js';
export { default as ModuleTemplateStore } from './store/template-store.js';
export { default as ContextHelpers, shouldAllowModuleRegistration } from './helpers/context-helpers.js';

export async function ensureContextHelpersEsm() {
  if (typeof window === 'undefined') return ContextHelpers;
  if (!window.ContextHelpers) {
    window.ContextHelpers = ContextHelpers;
  }
  if (!window.ModuleRuntimeStore) {
    throw new Error('ModuleRuntimeStore missing after context helpers ESM');
  }
  if (!window.ModuleTemplateStore) {
    throw new Error('ModuleTemplateStore missing after context helpers ESM');
  }
  return window.ContextHelpers;
}
