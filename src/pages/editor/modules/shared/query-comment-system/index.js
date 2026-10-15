/**
 * QCS ESM island entry — load after ensureModuleRuntimeEsm().
 * Keeps window.queryModule / queryDialog / queryPanel bridges for classic consumers.
 */

import { QueryBaseModule } from './QueryBaseModule.js';
import { getQueryDialogModuleConfig } from './QueryDialogModule.js';
import { QueryPanelModule } from './QueryPanelModule.js';
import { QueryRestoreModule } from './QueryRestoreModule.js';
import { QueryTemplates } from './QueryTemplates.js';
import { AttachmentModule } from './AttachmentModule.js';
import { QueryUtils } from './QueryUtils.js';
import { CONTEXTS, applyGlobalHighlightStyle } from './bootstrap.js';

let initPromise = null;

function isTrackView() {
  return typeof window !== 'undefined' && window.IS_TRACK_VIEW === true;
}

/**
 * Register / construct querySystem and assign window.queryModule.
 * Idempotent — concurrent callers share one promise.
 */
export async function initQueryCommentSystem() {
  if (typeof window !== 'undefined' && window.queryModule) {
    return window.queryModule;
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const registry =
      typeof window !== 'undefined' ? window.moduleRegistry : undefined;

    if (registry && typeof registry.registerDirectModule === 'function') {
      try {
        await registry.registerDirectModule({
          name: 'querySystem',
          moduleClass: QueryBaseModule,
          type: 'onthefly',
          templatePath: '',
          dependencies: [],
          trackView: false,
        });
        const mod = await registry.getModule('querySystem');
        if (typeof window !== 'undefined') {
          window.queryModule = mod;
        }
        return mod;
      } catch (err) {
        console.warn(
          '[QCS] registerDirectModule failed, falling back to direct construct:',
          err && err.message
        );
      }
    }

    if (isTrackView() || typeof window !== 'undefined') {
      const mod = new QueryBaseModule('querySystem');
      if (typeof window !== 'undefined') {
        window.queryModule = mod;
      }
      return mod;
    }

    return null;
  })();

  try {
    return await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

/** Thin re-entry for editorBootInit / readonly (window.ensureQueryModule). */
export async function ensureQueryModule() {
  return initQueryCommentSystem();
}

export {
  QueryBaseModule,
  getQueryDialogModuleConfig,
  QueryPanelModule,
  QueryRestoreModule,
  QueryTemplates,
  AttachmentModule,
  QueryUtils,
  CONTEXTS,
  applyGlobalHighlightStyle,
};

export default initQueryCommentSystem;
