/** Ported from skipped src/legacy/js/index.js — built from API_PATH. */

const API_SUFFIXES = {
  API_LINK_SHARE: 'linksharing',
  API_URL_VALIDITY: 'urlvalidity',
  API_UPDATE_INSERT: 'updateorinsert',
  API_GET_USERS: 'getusers',
  API_GET_DOCS: 'getdocs',
  API_GET_FILTER_DOCS: 'findwithfilter',
  API_GET_DOCS_AUTH: 'getdocsauth',
  API_GET_ADMINDOCS: 'getadmindocs',
  API_UPDATE_USERS: 'updateuser',
  API_FILE_DOWNLOAD: 'filedownload',
  API_FIND_UPDATE_INSERT: 'findupdateorinsert',
  API_DEL_RECORD: 'deletedoc',
  API_FORM_TO_FILE_FIELD: 'formfieldtofile',
  API_SAVE_WITH_LOGOUT: 'savewithlogout',
  API_SAVE_WITH_FINALIZE: 'savewithfinalize',
  API_SAVE_MATH_IMAGE: 'savemathimage',
  API_SAVE_SVG_PNG: 'fromsvgtopng',
  API_SHARE_INVITE: 'shareandinvite',
  API_GENERIC_SEND_MAIL: 'genericsendemail',
  API_KAFKA_PROD: 'kafkaproducer',
  API_PUBKIT_CLSE_TASK: 'pukitapiclosetask',
  API_UPLOAD_SINGLE: 'filesupload',
  API_UPLOAD_MULTI: 'filesuploadmultiple',
  API_ZIP_DOWNLOAD: 'zipfileswithdiranddownload',
  API_ZIP_DOWNLOAD_RECURSIVE: 'zipfolderwithrecursively',
  API_BATCH_CONVERT: 'batchfileexcuteprocess',
  API_CK_RESTORE: 'ckrestore',
  API_URL_VALIDATION: 'urlvalidation',
  API_FILE_VALIDATION: 'fileorfoldercheck',
  API_FILE_APPEND: 'fileappendcontent',
  API_CROSS_REF_API: 'onlinecrossrefplaintext',
  API_ANYSTYLE_CROSS_REF_API: 'anystylecrossrefplaintext',
  API_PUBKIT_STATUS: 'pubkitapistatus',
  API_PUBKIT_CLOSE: 'pubkitapistatusclose',
  API_CHATBOT_AI: 'chatbotai',
};

/**
 * @param {object} g window/globalThis (must already have API_PATH)
 */
export function applyLegacyApiPaths(g) {
  const base = g.API_PATH || '/xmleditor/';
  for (const [name, suffix] of Object.entries(API_SUFFIXES)) {
    if (typeof g[name] === 'undefined') {
      g[name] = base + suffix;
    }
  }
  if (typeof g.ORACLE_DOMAIN === 'undefined') {
    g.ORACLE_DOMAIN = 'https://impactonlinebackend-uat.newgen.co';
  }
  if (typeof g.NG_WEB_URL === 'undefined') {
    g.NG_WEB_URL = 'https://www.newgen.co/';
  }
  if (typeof g.MY_TOPIC === 'undefined') {
    g.MY_TOPIC = g.IS_LOCAL_HOST ? 'XMLTOPDFLIVENEW4' : 'IMPACTLIVETOPIC';
  }
  if (typeof g.CONVERSION_PORT === 'undefined') {
    g.CONVERSION_PORT = {};
  }
  if (typeof g.LOCAL_CONNECT_SERVER === 'undefined') {
    g.LOCAL_CONNECT_SERVER = {
      LOCAL: 'localhost:8080',
      BUCKET_URL: g.BUCKET_URL || 'http://localhost/xmleditor/',
      SERVER: g.BACKEND_DOMAIN || '',
    };
  }
}
