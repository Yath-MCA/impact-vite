import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  moduleInitialized,
  moduleOpened,
  moduleClosed,
  buttonClicked,
  inputInteracted,
  errorRecorded
} from './modulesSlice.js';

/**
 * React-facing API for a single module instance's Redux-backed lifecycle
 * state, replacing legacy BaseModule's direct ModuleRuntimeStore calls
 * (getRuntimeStore/dispatchRuntimeAction/getRuntimeState/etc.).
 */
export function useModuleLifecycle(moduleId, moduleName) {
  const dispatch = useDispatch();
  const state = useSelector((s) => s.modules.modules.byId[moduleId] ?? null);

  const init = useCallback((dialogType) => {
    dispatch(moduleInitialized({ id: moduleId, name: moduleName, dialogType }));
  }, [dispatch, moduleId, moduleName]);

  const open = useCallback(() => {
    dispatch(moduleOpened({ id: moduleId }));
  }, [dispatch, moduleId]);

  const close = useCallback(() => {
    dispatch(moduleClosed({ id: moduleId }));
  }, [dispatch, moduleId]);

  const recordStat = useCallback((type, extra = {}) => {
    if (type === 'buttonClicked') {
      dispatch(buttonClicked({ id: moduleId, ...extra }));
      return;
    }
    if (type === 'inputInteracted') {
      dispatch(inputInteracted({ id: moduleId, ...extra }));
    }
  }, [dispatch, moduleId]);

  const recordError = useCallback((functionName, message) => {
    dispatch(errorRecorded({ id: moduleId, functionName, message }));
  }, [dispatch, moduleId]);

  return { state, init, open, close, recordStat, recordError };
}
