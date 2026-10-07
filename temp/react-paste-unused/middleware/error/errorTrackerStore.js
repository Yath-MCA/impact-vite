import { getDocId, getSharedKey, getUserInfo, getWindowRef } from '../services/error/errorContext.js';
import { insertErrorLog } from '../services/error/errorLogsApi.js';
import { formatStackHtml } from '../services/error/errorMailHtml.js';
import {
  exportErrorReportCsv as buildCsv,
  renderErrorReportTable as buildReportHtml
} from './errorReportHtml.js';

const UNSCOPED_PERSIST_KEY = 'global_error_tracking';
const MAX_STORED_ERRORS = 5000;
const MAX_ERRORS_PER_MODULE = 100;

const IGNORE_LIST = {
  modules: ['system'],
  functions: [
    'lazyInitialization',
    'initialization_failed',
    'initializeModule',
    'loadModuleClass',
    'loadModuleImmediately',
    'loadModuleInstance',
    'registerModule'
  ],
  messages: [/ref_form/i, /loadModuleClass/i]
};

function scopedPersistKey(docId) {
  return `${UNSCOPED_PERSIST_KEY}_${docId || ''}`;
}

function isIgnored(moduleName, functionName, message) {
  if (IGNORE_LIST.modules.includes(moduleName)) return true;
  if (IGNORE_LIST.functions.includes(functionName)) return true;
  return IGNORE_LIST.messages.some((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(message);
    return String(message || '').includes(pattern);
  });
}

function generateUniqueId() {
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function formatTimestamp(date) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

function sanitizeStack(stack) {
  if (!stack) return 'No stack trace';
  return stack
    .split('\n')
    .slice(0, 5)
    .map((frame) => frame.trim())
    .join('\n');
}

/**
 * Short track from first stack frames (replaces legacy traceOrder / .caller walk).
 * Uses formatStackHtml so framing matches mail stack HTML.
 */
function buildTrack(moduleName, stack) {
  const html = formatStackHtml(moduleName, sanitizeStack(stack));
  return String(html || '')
    .split('<br>')
    .map((part) => part.replace(/^at\s+/, '').trim())
    .filter(Boolean)
    .join(' <- ');
}

function sanitizeContext(context) {
  if (typeof context !== 'object' || context == null) return {};

  const sanitized = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string') {
      sanitized[key] = value.length > 200 ? `${value.substring(0, 200)}...` : value;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = '[Object]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function getBrowserInfo() {
  const win = getWindowRef() || {};
  const info = win.browserInfo;
  if (!info || typeof info !== 'object') {
    return {
      userAgent: win.navigator?.userAgent || '',
      platform: win.navigator?.platform || '',
      language: win.navigator?.language || 'Unknown',
      screenSize: '',
      report: ''
    };
  }
  const os = info.os || '';
  const browser = `${info.browser || ''}_${info.version || ''}`;
  const screenSize = info.screenSize || '';
  return {
    userAgent: browser,
    platform: os,
    language: win.navigator?.language || 'Unknown',
    screenSize,
    report: `${os}_${browser}_${screenSize}`
  };
}

function getProjectInfo() {
  try {
    const win = getWindowRef() || {};
    const user = getUserInfo();
    const shared = getSharedKey();
    const params = new URLSearchParams(win.location?.search || '');
    return {
      docid: params.get('docid') || getDocId() || '',
      userRole: user.ROLE_NAME || '',
      userId: user.MAIL_ID_PREFIX || user.MAIL_ID || '',
      project: shared.projectname || ''
    };
  } catch {
    return {
      userId: 'anonymous',
      userRole: 'anonymous',
      project: 'anonymous',
      docid: ''
    };
  }
}

function getDomainLabel() {
  const win = getWindowRef() || {};
  return `${win.location?.hostname || ''}${win.location?.pathname || ''}`;
}

/**
 * Factory for the in-memory + localStorage error tracker (no React).
 */
export function createErrorTrackerStore() {
  const state = {
    modules: {}
  };

  function registerModule(moduleName) {
    if (!state.modules[moduleName]) {
      state.modules[moduleName] = {
        errors: [],
        lastErrorTimestamp: null
      };
    }
  }

  function getAllErrors() {
    return Object.values(state.modules)
      .flatMap((module) => module.errors)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  function resetErrors() {
    Object.values(state.modules).forEach((module) => {
      module.errors = [];
    });
  }

  function rebuildModuleErrorsFromSorted(sortedErrors) {
    resetErrors();
    sortedErrors.forEach((error) => {
      registerModule(error.moduleName);
      state.modules[error.moduleName].errors.push(error);
    });
  }

  function maintainGlobalErrorLimit() {
    const allErrors = getAllErrors();
    if (allErrors.length <= MAX_STORED_ERRORS) return;

    const sortedErrors = [...allErrors].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    const excessCount = allErrors.length - MAX_STORED_ERRORS;
    sortedErrors.splice(0, excessCount);
    rebuildModuleErrorsFromSorted(sortedErrors);
  }

  function persistErrors() {
    try {
      const key = scopedPersistKey(getDocId());
      localStorage.setItem(key, JSON.stringify(state.modules));
    } catch {
      console.error('Could not persist errors to local storage');
    }
  }

  function loadStoredErrors() {
    try {
      const scopedKey = scopedPersistKey(getDocId());
      const scoped = localStorage.getItem(scopedKey);
      if (scoped) {
        state.modules = JSON.parse(scoped) || {};
        return;
      }

      const unscoped = localStorage.getItem(UNSCOPED_PERSIST_KEY);
      if (unscoped) {
        // Copy once from unscoped into memory + scoped key; never write unscoped again.
        state.modules = JSON.parse(unscoped) || {};
        persistErrors();
      } else {
        state.modules = {};
      }
    } catch {
      state.modules = {};
    }
  }

  function consoleLog(errorEntry) {
    console.group(
      `%c ERROR: ${errorEntry.moduleName} - ${errorEntry.functionName}`,
      'color: red; font-weight: bold'
    );
    console.warn('Message:', errorEntry.message);
    console.log('Timestamp:', errorEntry.timestamp);
    console.log('Repeat Count:', errorEntry.repeatCount);
    if (Object.keys(errorEntry.context || {}).length) {
      console.log('Context:', errorEntry.context);
    }
    console.groupEnd();
  }

  function updateDB(errorEntry) {
    try {
      insertErrorLog({
        module: errorEntry.moduleName,
        errormsg: errorEntry.message,
        fnTrack: errorEntry.functionName,
        stack: errorEntry.stack,
        track: errorEntry.track,
        repeatCount: errorEntry.repeatCount,
        timestamp: errorEntry.timestamp
      });
    } catch (err) {
      console.error('Failed to sync error with database:', err);
    }
  }

  function logError(moduleName, functionName, error, context = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (isIgnored(moduleName, functionName, errorMessage)) return;

    registerModule(moduleName);

    const errorObj = error instanceof Error ? error : new Error(String(error));
    const moduleErrors = state.modules[moduleName].errors;
    const lastError = moduleErrors[moduleErrors.length - 1];
    const repeatCount =
      lastError &&
      lastError.message === errorObj.message &&
      lastError.functionName === functionName
        ? (lastError.repeatCount || 1) + 1
        : 1;

    const projectInfo = getProjectInfo();
    const errorEntry = {
      id: generateUniqueId(),
      timestamp: formatTimestamp(new Date()),
      moduleName,
      functionName,
      message: errorObj.message,
      stack: sanitizeStack(errorObj.stack),
      context: sanitizeContext(context),
      track: buildTrack(moduleName, errorObj.stack),
      repeatCount,
      browserInfo: getBrowserInfo(),
      userId: projectInfo.userId
    };

    if (moduleErrors.length >= MAX_ERRORS_PER_MODULE) {
      moduleErrors.shift();
    }

    moduleErrors.push(errorEntry);
    state.modules[moduleName].lastErrorTimestamp = new Date();

    maintainGlobalErrorLimit();
    persistErrors();
    updateDB(errorEntry);
    consoleLog(errorEntry);

    return errorEntry;
  }

  function getRecentErrors(moduleName, limit = 10) {
    if (moduleName) {
      return state.modules?.[moduleName]?.errors
        ? state.modules[moduleName].errors.slice(-limit).reverse()
        : [];
    }
    return getAllErrors().slice(-limit).reverse();
  }

  function renderErrorReportTable(options = {}) {
    const { moduleName, limit = 50 } = options;
    const errors = getRecentErrors(moduleName, limit);
    const win = getWindowRef() || {};
    return buildReportHtml({
      errors,
      projectInfo: getProjectInfo(),
      version: win.VERSION || '',
      domain: getDomainLabel()
    });
  }

  function exportErrorReportCsv(options = {}) {
    const { moduleName, limit = 50 } = options;
    return buildCsv(getRecentErrors(moduleName, limit));
  }

  function clearErrors(moduleName) {
    if (moduleName) {
      if (state.modules[moduleName]) {
        state.modules[moduleName].errors = [];
      }
    } else {
      resetErrors();
    }
    persistErrors();
  }

  loadStoredErrors();

  return {
    get modules() {
      return state.modules;
    },
    logError,
    getRecentErrors,
    renderErrorReportTable,
    exportErrorReportCsv,
    exportErrorReportCSV: exportErrorReportCsv,
    clearErrors
  };
}

/** Module-level singleton for Task 5 overlay wiring. */
export const errorTrackerStore = createErrorTrackerStore();

export default errorTrackerStore;
