import { LOCAL_STORAGE_KEYS } from '../session/sessionConstants.js';
import { normalizeSessionSource, toSessionContext } from '../session/sessionSource.js';
import { recoverEditorSessionByDocId } from '../session/sessionGateway.js';
import { saveLegacyLocalStorageData } from './editorSessionStorage.js';

export function readShareKeyFromLocalStorage(docId) {
  if (!docId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEYS.SHARED_PREFIX}${docId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const sharedDocId = String(parsed.docid || parsed.docId || '');
    if (sharedDocId && sharedDocId !== String(docId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function toCtxFromDocData(docData, validateResponse = null) {
  const sessionSource = normalizeSessionSource(docData, validateResponse);
  return toSessionContext(sessionSource);
}

export async function resolveShareKeyContext(docId) {
  if (!docId) {
    return { ok: false, source: 'none', message: 'Missing document id.' };
  }

  const local = readShareKeyFromLocalStorage(docId);
  if (local) {
    return {
      ok: true,
      source: 'localStorage',
      ctx: toCtxFromDocData({ ...local, docid: docId })
    };
  }

  const recovery = await recoverEditorSessionByDocId(docId);
  if (!recovery.ok) {
    return {
      ok: false,
      source: 'none',
      message: recovery.message || 'Unable to resolve shareKey context.'
    };
  }

  const docData = { ...recovery.docData, docid: docId };
  saveLegacyLocalStorageData(docData);

  return {
    ok: true,
    source: 'getdocs',
    ctx: toCtxFromDocData(docData)
  };
}
