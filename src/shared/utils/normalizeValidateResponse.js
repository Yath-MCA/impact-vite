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
    const resData = response?.data ?? response ?? {};
  const docid = resData.docid || resData.identifier || resData.docId || '';
  const articletitle = resData.xmltohtmlres?.articletitle || '';
  const journaltitle = resData.xmltohtmlres?.journaltitle || '';
  const booktitle = resData.xmltohtmlres?.booktitle || '';
  const projecttitle = resData.projecttitle || '';
  const title =
    articletitle ||
    booktitle ||
    projecttitle ||
    journaltitle ||
    resData.title ||
    '';

  return {
    docid,
    title,
    doi: resData.doi || resData.DOI || resData.xmltohtmlres?.doi || '',
    client: resData.client || 'default',
    projecttitle,
    identifier: resData.identifier || docid,
    dtd: resData.dtd || '',
    type: resData.type || '',
    linkinfo: resData.linkinfo || '',
    vendor: resData.vendor || '',
    shorttitle: resData.shorttitle || '',
    username: resData.username || resData.mail_id || resData.MAIL_ID || '',
    role: resData.role || resData.roleid || resData.ROLE_ID || '',
    rolename: resData.rolename || resData.ROLENAME || '',
    roleid: resData.roleid || resData.ROLE_ID || '',
    branding: resData.branding || resData.client_metadata || resData.client_config || null,
    cover: resData.titleinfo?.cover,
    projectname: resData.titleinfo?.projectname,
    journaltitle,
    articletitle,
    booktitle,
    authorgroup: resData.xmltohtmlres?.authorgroup || '',
    figcount: resData.xmltohtmlres?.figcount || 0,
    tablecount: resData.xmltohtmlres?.tablecount || 0,
    Query: resData.xmltohtmlres?.Query || 0,
    Equation: resData.xmltohtmlres?.Equation || 0,
    collaborative: resData.collaborative,
    apikey: resData.apikey || '',
    emailto: resData.emailto,
    status: resData.status || '',
    r: resData.r,
    enable: resData.enable,
    temporaryAccess: resData.temporaryAccess,
    raw: resData
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
