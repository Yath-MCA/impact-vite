/**
 * Minimal ADD_DEFAULT_KEYS + GET_JSON ported from skipped index.js
 * for editor open / LoadingConfig (expand cases when console shows gaps).
 */

function g() {
  return typeof globalThis !== 'undefined' ? globalThis : window;
}

export function getSessionId(docid) {
  const glob = g();
  const Cls = glob.LinkSessionModule || glob.LinkSessionService;
  const mod =
    Cls && typeof Cls.getInstance === 'function' ? Cls.getInstance() : null;
  if (mod && typeof mod.readSessionId === 'function') {
    return mod.readSessionId(docid);
  }
  docid = docid || glob.DOC_ID;
  const scopeKey = 'xmleditor:sessionid:' + String(docid || '').trim();
  const fromSession = sessionStorage.getItem(scopeKey);
  if (fromSession) return fromSession;
  try {
    const backupKey = 'xmleditor:sessionbackup:' + String(docid || '').trim();
    const backup = JSON.parse(localStorage.getItem(backupKey) || '{}');
    if (backup[scopeKey]) return backup[scopeKey];
  } catch {
    /* ignore */
  }
  return null;
}

export function ADD_DEFAULT_KEYS(keys, iJSON, addKeys = [], removeKeys = []) {
  const glob = g();
  iJSON = iJSON ? iJSON : {};
  try {
    const defaultKeys = [
      'client',
      'docid',
      'username',
      'role',
      'rolename',
      'roleid',
      'identifier',
      'session_id',
      'dtd',
      'linkinfo',
      'type',
      'projecttitle',
    ];
    let finalKeys = [];

    if (typeof keys === 'string' && /defaults|default/gi.test(keys)) {
      finalKeys = [...defaultKeys];
    } else if (Array.isArray(keys)) {
      finalKeys = [...keys];
    }

    if (finalKeys.includes('client') && !finalKeys.includes('vendor')) {
      finalKeys.push('vendor');
    }
    if (finalKeys.includes('client') && !finalKeys.includes('shorttitle')) {
      finalKeys.push('shorttitle');
    }

    if (addKeys && addKeys.length > 0) {
      finalKeys.push(...addKeys.filter((k) => !finalKeys.includes(k)));
    }
    (removeKeys || []).forEach((key) => {
      const idx = finalKeys.indexOf(key);
      if (idx >= 0) finalKeys.splice(idx, 1);
    });

    const SHARED_KEY = glob.SHARED_KEY || {};
    const USER_INFO = glob.USER_INFO || {};

    Array.from(finalKeys).forEach((key) => {
      switch (key) {
        case 'doi':
          iJSON[key] = SHARED_KEY.identifier;
          break;
        case 'identifier':
        case 'client':
        case 'dtd':
        case 'type':
        case 'taskid':
        case 'roletaskid':
        case 'division':
        case 'projecttitle':
        case 'docid':
        case 'fileid':
        case 'vendor':
        case 'linkinfo':
          iJSON[key] = SHARED_KEY[key];
          break;
        case 'role':
          iJSON[key] = SHARED_KEY[key]
            ? SHARED_KEY[key]
            : USER_INFO.ROLE_ID;
          break;
        case 'roleid':
          iJSON[key] = USER_INFO.ROLE_ID
            ? USER_INFO.ROLE_ID
            : SHARED_KEY.role
              ? SHARED_KEY.role
              : 'null';
          break;
        case 'rolename':
          iJSON[key] = USER_INFO.TRACK_ROLE_NAME
            ? USER_INFO.TRACK_ROLE_NAME
            : SHARED_KEY[key]
              ? SHARED_KEY[key]
              : 'null';
          break;
        case 'userid':
          iJSON[key] = USER_INFO.USER_ID
            ? USER_INFO.USER_ID
            : SHARED_KEY[key]
              ? SHARED_KEY[key]
              : 'null';
          break;
        case 'status':
          iJSON[key] = 'active';
          break;
        case 'username':
          iJSON[key] = USER_INFO.MAIL_ID;
          break;
        case 'session_id':
          iJSON.session_id = getSessionId();
          break;
        case 'journal':
        case 'shorttitle':
          iJSON[key] = glob.IS_JOURNAL
            ? (SHARED_KEY && SHARED_KEY.shortitle) ||
              (SHARED_KEY &&
                SHARED_KEY.titleinfo &&
                SHARED_KEY.titleinfo.cover) ||
              SHARED_KEY.cover ||
              SHARED_KEY.shorttitle ||
              glob.SHORT_II_TITLE ||
              ''
            : '';
          break;
        case '_r':
        case '_w':
          iJSON[key] = ['5af956974b4bb40a34648f8e'];
          break;
        default:
          break;
      }
    });
  } catch (err) {
    console.warn(err && err.message);
    if (typeof glob.ErrorLogTrace === 'function') {
      glob.ErrorLogTrace('ADD_DEFAULT_KEYS', err && err.message);
    }
  }
  return iJSON;
}

function attachLinksharingRemarks(iJSON, Options, LinkSessionCore) {
  if (
    LinkSessionCore &&
    typeof LinkSessionCore.attachProcessRemarks === 'function'
  ) {
    LinkSessionCore.attachProcessRemarks(
      iJSON,
      Options.process,
      iJSON.remarks || Options.remarks
    );
    return;
  }
  if (!Options.process) return;
  const remarkDefaults = {
    update_docstatus_reqstatus_insert_time: 'takeover',
    update_reqstatus_time: 'send_request',
    updaterequeststatus: 'accept_open',
    updatestatus_reqstatus: 'status_change',
    update_req_status: 'clear_rejected',
    getrequeststatus_process: 'poll',
    updatereqstatus: 'rejected_by_collator',
    close: 'close',
    save: 'save',
    update_session_end_time: 'clear_end_time',
  };
  const remarkFields = {
    update_docstatus_reqstatus_insert_time:
      'update_docstatus_reqstatus_insert_time_remarks',
    update_reqstatus_time: 'update_reqstatus_time_remarks',
    updaterequeststatus: 'updaterequeststatus_remarks',
    updatestatus_reqstatus: 'updatestatus_reqstatus_remarks',
    update_req_status: 'update_req_status_remarks',
    getrequeststatus_process: 'getrequeststatus_process_remarks',
    updatereqstatus: 'updatereqstatus_remarks',
    close: 'close_remarks',
    save: 'save_remarks',
    update_session_end_time: 'update_session_end_time_remarks',
  };
  const remarkText =
    iJSON.remarks || Options.remarks || remarkDefaults[Options.process];
  if (remarkText) {
    iJSON.remarks = remarkText;
    if (remarkFields[Options.process]) {
      iJSON[remarkFields[Options.process]] = remarkText;
    }
  }
}

/**
 * Minimal GET_JSON — open path + LoadingConfig-adjacent cases.
 * Unknown params warn + {} (do not silently return defaults).
 */
export function GET_JSON(params, Options = {}, addKeys, removeKeys = []) {
  const glob = g();
  try {
    const TIME = new Date().getTime();
    let iJSON = {};
    const DOC_ID = glob.DOC_ID;
    const USER_INFO = glob.USER_INFO || {};
    const SHARED_KEY = glob.SHARED_KEY || {};
    const ROLE_IDS = glob.ROLE_IDS || {};

    if (/defaults|default/gi.test(params)) {
      Object.assign(
        iJSON,
        ADD_DEFAULT_KEYS('default', iJSON, addKeys, removeKeys)
      );
      return iJSON;
    }

    switch (params) {
      case 'get_shared_author_info':
      case 'get_corole_info':
      case 'Shareandinvite': {
        iJSON = {
          tbl: 'Shareandinvite',
          find: { id: SHARED_KEY._id },
          length: 1000,
        };
        if (params === 'get_shared_author_info' || params === 'get_corole_info') {
          const isColeLink = params === 'get_corole_info';
          iJSON.find = {
            role: USER_INFO.ROLE_ID,
            docid: DOC_ID,
            corole: { $exists: isColeLink ? isColeLink : false },
          };
          break;
        }
        if (Options.status) {
          if (!addKeys) addKeys = 'signoff';
          iJSON.find.status = addKeys;
        }
        if (Options.update) {
          if (!addKeys) addKeys = { status: 'active' };
          iJSON.update = addKeys;
        }
        if (Options.signoff || Options.corole_link_signoff) {
          if (!addKeys) {
            addKeys = { status: 'signoff', signouttime: TIME };
          }
          iJSON.update = addKeys;
          Object.assign(iJSON, ADD_DEFAULT_KEYS(['_r', '_w']));
          if (Options.corole_link_signoff) {
            iJSON.find = {
              docid: DOC_ID,
              corole: USER_INFO.ROLE_ID,
              status: 'active',
            };
            iJSON.updateMany = '1';
          }
        }
        if (Options.filter) {
          if (!addKeys) addKeys = ['emailto', 'id', 'uid', 'time_c', 'targettbl'];
          delete iJSON.find.id;
          iJSON.docid = DOC_ID;
          iJSON.filter = addKeys;
        }
        if (Options.getCount) {
          iJSON.docid = DOC_ID;
          iJSON.find = { docid: DOC_ID };
        }
        if (Options.updateSignOffTime) {
          delete iJSON.find.id;
          iJSON.docid = DOC_ID;
          iJSON.find = {
            docid: DOC_ID,
            status: 'active',
            role: ROLE_IDS.CO,
            corole: { $exists: false },
          };
          iJSON.update = {};
          Options.time = Options.time ? Options.time : TIME;
          if (SHARED_KEY.roles_signoff) {
            iJSON.update[`roles_signoff.` + USER_INFO.ROLE_ID] = Options.time;
          } else if (SHARED_KEY.order) {
            iJSON.find['roles_orders.role'] = USER_INFO.ROLE_ID;
            iJSON.find['roles_orders.rolename'] = USER_INFO.ROLE_NAME;
            iJSON.update['roles_orders.$.status'] = Options.time;
          }
        }
        if (Options.attachmentslist && typeof glob.handleAttachmentList === 'function') {
          iJSON.update = iJSON.update || {};
          iJSON.update.attachmentslist = glob.handleAttachmentList();
        }
        Object.assign(iJSON, ADD_DEFAULT_KEYS('default'));
        break;
      }
      case 'openhtml':
        iJSON = {
          tbl: 'Fileslist',
          find: { recent: 1, docid: DOC_ID },
          length: 1,
          sort: { time_c: -1 },
          filter: ['file_sn', 'time_c'],
        };
        if (glob.IS_TRACK_VIEW) {
          iJSON.find = {
            roleid: USER_INFO.SELECTOR_BKUP_FOLDER,
            docid: DOC_ID,
          };
          iJSON.extension = '.html';
          iJSON.process = 'openhtml';
        }
        break;
      case 'guideTourStatus':
        iJSON = {
          tbl: 'User',
          find: {
            username: localStorage.getItem(`xmleditor:username:${DOC_ID}`),
          },
          sort: {},
          filter: ['username', 'displayname'],
        };
        if (Options.update) iJSON.update = { guided: 1 };
        else if (Options.find) iJSON.find.guided = { $exists: true };
        else if (Options.reset) iJSON.update = { guided: 0 };
        break;
      case 'getProjectInfo':
        iJSON = {
          tbl: 'Fileslist',
          find: {
            status: 'active',
            docid: DOC_ID,
            projectname: { $exists: true },
          },
          length: 1,
          sort: {},
          filter: ['projectname', 'id', 'status', 'dtd', 'client', 'type'],
        };
        break;
      case 'linksharing': {
        iJSON = { tbl: 'linksharing', docid: DOC_ID };
        if (Options.process) {
          iJSON.process = Options.process;
          if (
            [
              'updatereqstatus',
              'refresh',
              'update_session_end_time',
              'close',
              'signoff',
            ].includes(Options.process)
          ) {
            iJSON.session_id = sessionStorage.getItem(
              `xmleditor:sessionid:${String(DOC_ID || '').trim()}`
            );
          }
          if (Options.process === 'updatereqstatus') {
            iJSON.remarks = Options.remarks;
            iJSON.requeststatus = '4';
          } else if (
            ['update_session_end_time', 'close', 'signoff'].includes(
              Options.process
            )
          ) {
            iJSON.session_end_time =
              Options.process === 'close' ? TIME.toString() : '0';
          } else if (Options.process === 'scheduler') {
            iJSON.docstatus = '1';
            iJSON.requeststatus = '1';
          } else if (
            ['update_request_status', 'updaterequeststatus'].includes(
              Options.process
            )
          ) {
            iJSON.requeststatus = '2';
          } else if (Options.process === 'updatestatus_reqstatus') {
            iJSON.docstatus = Options.docstatus;
            iJSON.requeststatus = Options.requeststatus;
          } else if (Options.process === 'save') {
            const saveState =
              (glob.IMPACT_SAVE && glob.IMPACT_SAVE.state) || {};
            iJSON.last_saved_time =
              saveState.lastSaveTimestamp || TIME.toString();
          }
        }
        const collabExtra = {};
        if (USER_INFO.HAS_COLLAB_WORKFLOW) collabExtra.collaborative = '1';
        Object.assign(iJSON, ADD_DEFAULT_KEYS('default'), collabExtra);
        if (Options.remarks) iJSON.remarks = Options.remarks;
        attachLinksharingRemarks(iJSON, Options, glob.LinkSessionCore);
        delete iJSON._w;
        delete iJSON._r;
        break;
      }
      default:
        console.warn(
          '[legacyJsonHelpers] GET_JSON unknown params:',
          params,
          '— returning {}'
        );
        return {};
    }
    return iJSON;
  } catch (err) {
    console.warn(err && err.message);
    if (typeof glob.ErrorLogTrace === 'function') {
      glob.ErrorLogTrace('GET_JSON', err && err.message);
    }
    return {};
  }
}

export function applyLegacyJsonHelpers(glob) {
  if (typeof glob.getSessionId !== 'function') glob.getSessionId = getSessionId;
  if (typeof glob.ADD_DEFAULT_KEYS !== 'function') {
    glob.ADD_DEFAULT_KEYS = ADD_DEFAULT_KEYS;
  }
  if (typeof glob.GET_JSON !== 'function') {
    glob.GET_JSON = GET_JSON;
  }
}
