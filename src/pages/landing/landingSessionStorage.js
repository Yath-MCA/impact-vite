export function getSessionIdKey(docId) {
  return `xmleditor:sessionid:${docId || ''}`;
}

export function writeSessionDualGuardKeys({ docId, sessionId, redirectUrl }) {
  const idKey = getSessionIdKey(docId);
  const sessionIdStr = String(sessionId ?? '');
  sessionStorage.setItem('docid', String(docId));
  sessionStorage.setItem(idKey, sessionIdStr);
  sessionStorage.setItem('redirect', String(redirectUrl || ''));
  const backupKey = `xmleditor:sessionbackup:${docId}`;
  let backup = {};
  try {
    backup = JSON.parse(localStorage.getItem(backupKey) || '{}') || {};
  } catch {
    backup = {};
  }
  backup.docid = String(docId);
  backup[idKey] = sessionIdStr;
  backup.redirect = String(redirectUrl || '');
  localStorage.setItem(backupKey, JSON.stringify(backup));
}

export function saveLegacyShareLocalStorage(resData) {
  if (!resData) return { ok: false, reason: 'missing' };
  const { docid, apikey, emailto, role } = resData;
  if (!(apikey || (docid && emailto))) return { ok: false, reason: 'missing_apikey_or_email' };
  localStorage.setItem('xmleditor:appkey', 'xmleditor');
  localStorage.setItem('xmleditor:apikey', apikey || '');
  localStorage.setItem(`xmleditor:shared:${docid}`, JSON.stringify(resData));
  const emailId = Array.isArray(emailto) ? emailto[0] : emailto;
  if (emailId) localStorage.setItem(`xmleditor:username:${docid}`, emailId);
  if (role != null) localStorage.setItem(`xmleditor:userRole:${docid}`, String(role));
  return { ok: true, docid };
}

export async function commitLandingStorageAndVerify({
  docId,
  sessionId,
  redirectUrl,
  resData,
  skipVerify = false,
  confirmFn,
}) {
  if (resData) saveLegacyShareLocalStorage(resData);
  writeSessionDualGuardKeys({ docId, sessionId, redirectUrl });
  if (skipVerify) return { ok: true, skipped: true };
  if (typeof confirmFn !== 'function') {
    return { ok: false, reason: 'missing_confirmFn' };
  }
  const result = await confirmFn({ docId, sessionId });
  return result && result.ok ? { ok: true } : { ok: false, reason: result?.reason || 'verify_failed' };
}
