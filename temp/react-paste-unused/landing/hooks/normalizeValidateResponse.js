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

export const INACTIVE_LINK_STATUSES = ['signoff', 'deactive'];

export function classifyValidateAccess(response) {
  const resData = response?.data ?? response ?? {};
  const r = response?.r ?? resData.r;
  const status = String(resData.status || '').toLowerCase();
  const expired = Boolean(resData.fdel);
  const docid = resData.docid || resData.identifier || '';

  if (r === 0) {
    return { ok: false, code: 'denied', message: 'Access denied. Please contact support.', docid };
  }
  if (r === 4) {
    return {
      ok: false,
      code: 'ip_blocked',
      message: 'Your IP address does not have permission to access this link.',
      docid
    };
  }
  if (status === 'signoff') {
    if (expired) {
      return { ok: false, code: 'file_deleted', message: 'This proof link has expired.', docid, expired: true };
    }
    return {
      ok: false,
      code: 'signoff',
      message: 'This proof has been signed off and is available in read-only mode.',
      docid,
      expired: false
    };
  }
  if (status === 'deactive') {
    return { ok: false, code: 'deactive', message: 'This proof link has been deactivated.', docid };
  }
  if (status === 'expired' || expired) {
    return { ok: false, code: 'expired', message: 'This proof link has expired.', docid, expired: true };
  }
  return { ok: true, docid, resData };
}

export function assertValidateAccess(response) {
  const result = classifyValidateAccess(response);
  if (result.ok) return result;
  const err = new Error(result.message);
  err.code = result.code;
  err.docid = result.docid;
  err.expired = result.expired;
  throw err;
}
