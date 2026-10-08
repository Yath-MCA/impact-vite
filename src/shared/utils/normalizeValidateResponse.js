/**
 * Normalize / assert urlvalidity API payloads for the validate-first slice.
 */

function pickCode(response) {
  const raw =
    response?.code ??
    response?.errorCode ??
    response?.ErrorCode ??
    response?.statusCode ??
    response?.StatusCode ??
    response?.status ??
    response?.Status ??
    '';
  return String(raw).toLowerCase().replace(/[\s-]+/g, '_');
}

function pickMessage(response, fallback) {
  return (
    response?.message ||
    response?.Message ||
    response?.error ||
    response?.Error ||
    response?.msg ||
    fallback
  );
}

function makeError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

/**
 * Throws typed errors for known failure modes.
 * Codes: invalid | expired | deactive | file_deleted | signoff
 */
export function assertValidateAccess(response) {
  if (response == null || typeof response !== 'object') {
    throw makeError('invalid', 'The link seems to be invalid or broken.');
  }

  const code = pickCode(response);
  const explicitFail =
    response.success === false ||
    response.ok === false ||
    response.Status === false ||
    response.valid === false;

  const message = pickMessage(response, 'Unable to validate your proof link.');

  if (code === 'signoff' || code === 'sign_off' || code === 'signed_off') {
    throw makeError('signoff', message, {
      docid: response.docid || response.docId || response.data?.docid,
    });
  }
  if (
    code === 'file_deleted' ||
    code === 'filedeleted' ||
    code === 'missing' ||
    code === 'file_missing'
  ) {
    throw makeError('file_deleted', message);
  }
  if (code === 'expired' || code === 'deactive' || code === 'inactive') {
    throw makeError(code === 'deactive' ? 'deactive' : 'expired', message);
  }
  if (code === 'invalid' || code === 'error' || code === 'fail' || code === 'failed') {
    throw makeError('invalid', message);
  }

  if (explicitFail) {
    if (/expir|deactiv|inactive/i.test(message)) {
      throw makeError('expired', message);
    }
    if (/delete|missing|not found/i.test(message)) {
      throw makeError('file_deleted', message);
    }
    throw makeError('invalid', message);
  }

  return response;
}

/**
 * Flatten validate payload for UI / later landing stash.
 */
export function normalizeValidateResponse(response) {
  const data =
    response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
      ? response.data
      : response?.doc && typeof response.doc === 'object'
        ? response.doc
        : response || {};

  return {
    docid: String(data.docid ?? data.docId ?? data.DOCID ?? ''),
    title: String(data.title ?? data.docname ?? data.DOCNAME ?? data.name ?? ''),
    rolename: String(data.rolename ?? data.roleName ?? data.ROLE ?? ''),
    client: String(data.client ?? data.clientname ?? data.CLIENT ?? ''),
    raw: response,
  };
}

const PENDING_KEY = 'xmleditor:pendingValidate';

export function setPendingValidateResponse(response) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(response));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getPendingValidateResponse() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
