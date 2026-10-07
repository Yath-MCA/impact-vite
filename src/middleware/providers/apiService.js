/**
 * @file apiService.js
 * @description Global API service with all REST endpoints
 * Based on existing FetchService with all API endpoints
 */

import axios from 'axios';
import { isLocalHost } from '../session/runtimeFlags.js';

// Global configuration variables (injected at build time or from environment)
const runtimeWindow = typeof window !== 'undefined' ? window : { location: { href: '' }, ENV: {} };
const DOMAIN_URL = runtimeWindow.location?.href + "";
const IS_LOCAL_HOST = isLocalHost(DOMAIN_URL);
const IS_LOCAL_LIVE = Boolean(DOMAIN_URL.includes("web_live"));

/**
 * Runtime ENV helper — prefers window.ENV (populated by public/env.js at runtime)
 * then falls back to import.meta.env.VITE_* (build-time .env files),
 * then uses the supplied default value.
 * This lets env/env.local.js → public/env.js drive all config without needing .env files.
 */
const _runtimeEnv = (windowKey, viteKey, defaultVal) =>
(runtimeWindow.ENV && runtimeWindow.ENV[windowKey] !== undefined
  ? runtimeWindow.ENV[windowKey]
  : import.meta.env[viteKey] ?? defaultVal);

// Environment variables — read from window.ENV first (runtime), then VITE_ (build-time)
const IS_LIVE_DOMAIN = _runtimeEnv('IS_LIVE_DOMAIN', 'VITE_IS_LIVE_DOMAIN', false);
const IS_DEV_DOMAIN = _runtimeEnv('IS_DEV_DOMAIN', 'VITE_IS_DEV_DOMAIN', false);
const IS_UAT_DOMAIN = _runtimeEnv('IS_UAT_DOMAIN', 'VITE_IS_UAT_DOMAIN', false);
const IS_LOCAL_DOMAIN = _runtimeEnv('IS_LOCAL_DOMAIN', 'VITE_IS_LOCAL_DOMAIN', false);

const BACKEND_DOMAIN = _runtimeEnv('BACKEND_DOMAIN', 'VITE_BACKEND_DOMAIN', 'localhost:8080');
const API_KEY = _runtimeEnv('API_KEY', 'VITE_API_KEY', '');
const User_API_KEY = _runtimeEnv('User_API_KEY', 'VITE_User_API_KEY', '');
const APP_KEY = _runtimeEnv('APP_KEY', 'VITE_APP_KEY', '');
const API_PATH = _runtimeEnv('API_PATH', 'VITE_API_PATH', '/api/');
const DOMAIN_ROOT = _runtimeEnv('DOMAIN_ROOT', 'VITE_DOMAIN_ROOT', '/');
const BUCKET_URL = _runtimeEnv('BUCKET_URL', 'VITE_BUCKET_URL', '');
const VERSION = _runtimeEnv('VERSION', 'VITE_VERSION', '1.0.0');

// Oracle domain
const ORACLE_DOMAIN = "https://productbackend-uat.company.co";
const NG_WEB_URL = `https://www.company.co/`;

// API Endpoints
export const API_ENDPOINTS = {
  USER_LOGIN: API_PATH + "userlogin",
  LINK_SHARE: API_PATH + "linksharing",
  URL_VALIDITY: API_PATH + "urlvalidity",
  UPDATE_INSERT: API_PATH + "updateorinsert",
  GET_USERS: API_PATH + "getusers",
  GET_DOCS: API_PATH + "getdocs",
  GET_DOCS_AUTH: API_PATH + "getdocsauth",
  GET_ADMINDOCS: API_PATH + "getadmindocs",
  UPDATE_USERS: API_PATH + "updateuser",
  FILE_DOWNLOAD: API_PATH + "filedownload",
  FIND_UPDATE_INSERT: API_PATH + "findupdateorinsert",
  DEL_RECORD: API_PATH + "deletedoc",
  FORM_TO_FILE_FIELD: API_PATH + "formfieldtofile",
  SAVE_MATH_IMAGE: API_PATH + "savemathimage",
  SAVE_SVG_PNG: API_PATH + "fromsvgtopng",
  SHARE_INVITE: API_PATH + "shareandinvite",
  GENERIC_SEND_MAIL: API_PATH + "genericsendemail",
  KAFKA_PROD: API_PATH + "kafkaproducer",
  PUBKIT_CLSE_TASK: API_PATH + "pukitapiclosetask",
  UPLOAD_SINGLE: API_PATH + "filesupload",
  UPLOAD_MULTI: API_PATH + "filesuploadmultiple",
  SUPPL_UPLOAD_MULTI: API_PATH + "supplfilesupload",
  ZIP_DOWNLOAD: API_PATH + "zipfileswithdiranddownload",
  ZIP_DOWNLOAD_RECURSIVE: API_PATH + "zipfolderwithrecursively",
  BATCH_CONVERT: API_PATH + "batchfileexcuteprocess",
  CK_RESTORE: API_PATH + "ckrestore",
  URL_VALIDATION: API_PATH + "urlvalidation",
  FILE_VALIDATION: API_PATH + "fileorfoldercheck",
  FILE_APPEND: API_PATH + "fileappendcontent",
  CROSS_REF_API: API_PATH + "onlinecrossrefplaintext",
  ANYSTYLE_CROSS_REF_API: API_PATH + "anystylecrossrefplaintext",
  PUBKIT_STATUS: API_PATH + "pubkitapistatus",
  PUBKIT_CLOSE: API_PATH + "pubkitapistatusclose",
  CHATBOT_AI: API_PATH + "chatbotai",
  VERIFY_CAPTCHA: API_PATH + "verifycaptcha",
  GENERATE_OTP: API_PATH + "generatetokenotpandsendemail",
  VERIFY_ACCESS_CODE: API_PATH + "verifyaccesscode"
};

// Role definitions
export const ROLE_IDS = {
  "5b53536b4c4a803e9a5abf70": {
    name: "Author",
    pubkit_name: "author",
    SelectorAttribute: "showForAU",
    Restrict_Selector: "ForAU",
    shortname: "AU",
    backup: "5b53536b4c4a803e9a5abf70_AU",
    Stage: "Proofing",
    next_mail: "PE_email,editor_email,collator_email",
    next_role: "PE_role,editor_role,collator_role",
    tour: { OUP: "role-wise", LWW: "default" }
  },
  "5b534e334c4a803e9a5abf4c": {
    name: "Editor",
    pubkit_name: "editor",
    SelectorAttribute: "showForED",
    Restrict_Selector: "ForED",
    shortname: "ED",
    backup: "5b534e334c4a803e9a5abf4c_ED",
    Stage: "ED Review",
    next_mail: "collator_email",
    next_role: "collator_role",
    tour: { OUP: "role-wise", LWW: "default" }
  },
  "5bcf15b1cf510152afba028a": {
    name: "Collator",
    pubkit_name: "collator",
    SelectorAttribute: "showForCO",
    Restrict_Selector: "ForCO",
    shortname: "CO",
    backup: "5bcf15b1cf510152afba028a_CO",
    Stage: "Collation",
    tour: { OUP: "role-wise", LWW: "default" }
  },
  "5bd1c4e2cf51015102014427": {
    name: "Copyeditor",
    pubkit_name: "copyEditor",
    SelectorAttribute: "showForCE",
    Restrict_Selector: "ForCE",
    shortname: "CE",
    backup: "5bd1c4e2cf51015102014427_CE",
    Stage: "CE Review",
    tour: { OUP: "default", LWW: "default" }
  },
  "5b534dc54c4a803e9a5abf41": {
    name: "Project Manager",
    pubkit_name: "pm",
    SelectorAttribute: "showForPM",
    Restrict_Selector: "ForPM",
    shortname: "PM",
    backup: "5b534dc54c4a803e9a5abf41_PM",
    Stage: "PM Review",
    tour: { OUP: "default", LWW: "default" }
  },
  "5b534e5b4c4a803e9a5abf4f": {
    name: "Journal Manager",
    pubkit_name: "jm",
    SelectorAttribute: "showForJM",
    Restrict_Selector: "ForJM",
    shortname: "JM",
    backup: "5b534e5b4c4a803e9a5abf4f_JM",
    Stage: "JM Review",
    tour: { OUP: "default", LWW: "default" }
  },
  "5bcf11635e7186178a22eee0": {
    name: "Proofreader",
    pubkit_name: "proofReader",
    SelectorAttribute: "showForPR",
    Restrict_Selector: "ForPR",
    shortname: "PR",
    backup: "5bcf11635e7186178a22eee0_PR",
    Stage: "Proof Reading",
    tour: { OUP: "default", LWW: "default" }
  },
  XML: {
    name: "XML",
    Stage: "XML",
    shortname: "XML"
  },
  "5b534de04c4a803e9a5abf45": {
    name: "Production Editor",
    pubkit_name: "pe",
    SelectorAttribute: "showForPE",
    Restrict_Selector: "ForPE",
    shortname: "PE",
    backup: "5b534de04c4a803e9a5abf45_PE",
    Stage: "PE Review",
    next_mail: "collator_email",
    next_role: "collator_role",
    tour: { OUP: "default", LWW: "default" }
  },
  "5bcf11635e7186178a22iii1": {
    name: "Import",
    SelectorAttribute: "showForIM",
    Restrict_Selector: "ForIM",
    shortname: "IM",
    backup: "5bcf11635e7186178a22iii1_IM",
    Stage: "Import"
  }
};

export const DEFAULT_ROLE = '5b53536b4c4a803e9a5abf70';

// Admin configuration
export const ADMIN_CONFIG = {
  ADMIN_USER_IDs: ["sivakumars", "yasar.mohideen", "durairajan.gnanam"],
  checkIsAdmin: () => {
    const adminUser = localStorage.getItem('xmleditor:admin');
    return adminUser === "superadmin";
  },
  checkIsSuperAdmin: (userId) => {
    return ADMIN_CONFIG.ADMIN_USER_IDs.includes(userId);
  }
};

// Kafka Topic
export const MY_TOPIC = IS_LOCAL_HOST ? "XMLTOPDFLIVENEW4" : "productLIVETOPIC";

// Local server config
export const LOCAL_CONNECT_SERVER = {
  LOCAL: 'localhost:8080',
  BUCKET_URL: IS_LOCAL_HOST ? "http://localhost/xmleditor/" : BUCKET_URL,
  SERVER: BACKEND_DOMAIN
};

/**
 * FetchService class for API calls
 */
class FetchService {
  constructor(baseConfig = {}) {
    this.config = {
      baseURL: API_PATH,
      appKey: APP_KEY,
      apiKey: API_KEY,
      defaultHeaders: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      ...baseConfig
    };
  }

  /**
   * Creates headers with default values
   */
  createHeaders(additionalHeaders = {}) {
    return {
      ...this.config.defaultHeaders,
      'appkey': this.config.appKey,
      'apikey': this.config.apiKey,
      ...additionalHeaders
    };
  }

  /**
   * Builds the full URL
   */
  buildUrl(endpoint, apiPath) {
    if (apiPath) return apiPath;
    if (/^https?:\/\//i.test(endpoint)) {
      return endpoint;
    }
    return `${this.config.baseURL}${endpoint}`;
  }

  /**
   * Creates default payload
   */
  createDefaultPayload(type = "default", baseData = {}) {
    const payload = {
      ...baseData,
      version: '1.0',
      timestamp: new Date().toISOString()
    };

    if ("roleid" in baseData) {
      payload.roleid = baseData.roleid;
    }

    return payload;
  }

  /**
   * Prepares the request body
   */
  prepareRequestBody(data, options) {
    const finalData = options.isPayloadLogic ?
      this.createDefaultPayload("default", data) : data;
    const stringData = JSON.stringify(finalData);
    return `jsondata=${encodeURIComponent(stringData)}`;
  }

  /**
   * Makes an HTTP request
   * @param {string} endpoint - URL or path (relative paths are prefixed with API_PATH)
   * @param {object} data     - Payload; serialised as jsondata=<encoded-JSON>
   * @param {object} options  - { method, headers, apiPath, isPayloadLogic, rawBody }
   */
  async makeRequest(endpoint, data, options = {}) {
    // Destructure known options so they don't bleed into axios config
    const {
      method = 'POST',
      headers: extraHeaders = {},
      apiPath,
      isPayloadLogic = false,
      rawBody,
      ...axiosConfig
    } = options;

    const requestConfig = {
      method,
      url: this.buildUrl(endpoint, apiPath),
      headers: this.createHeaders(extraHeaders),
      data: rawBody ?? this.prepareRequestBody(data, { isPayloadLogic }),
      ...axiosConfig
    };

    try {
      const response = await axios.request(requestConfig);
      return response.data;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  /**
   * Login — sends username/password via the standard jsondata payload
   * with all required auth headers (appkey, apikey, userapikey)
   */
  async userLogin(email, password) {
    return this.makeRequest(API_ENDPOINTS.USER_LOGIN, { email, password });
  }

  // Helper methods for common operations
  async getUsers(data = {}) {
    return this.makeRequest(API_ENDPOINTS.GET_USERS, data);
  }

  async getDocs(data = {}) {
    data.length = 2500;
    return this.makeRequest(API_ENDPOINTS.GET_DOCS, data);
  }

  async getAdminDocs(data = {}) {
    return this.makeRequest(API_ENDPOINTS.GET_ADMINDOCS, data);
  }

  async updateUser(data = {}) {
    return this.makeRequest(API_ENDPOINTS.UPDATE_USERS, data);
  }

  async deleteDoc(data = {}) {
    return this.makeRequest(API_ENDPOINTS.DEL_RECORD, data);
  }

  async uploadFile(data = {}) {
    return this.makeRequest(API_ENDPOINTS.UPLOAD_SINGLE, data);
  }

  async shareAndInvite(data = {}) {
    return this.makeRequest(API_ENDPOINTS.SHARE_INVITE, data);
  }

  async sendEmail(data = {}) {
    return this.makeRequest(API_ENDPOINTS.GENERIC_SEND_MAIL, data);
  }

  async getPubkitStatus(data = {}) {
    return this.makeRequest(API_ENDPOINTS.PUBKIT_STATUS, data);
  }

  async chatBotAI(data = {}) {
    return this.makeRequest(API_ENDPOINTS.CHATBOT_AI, data);
  }
}

// Create singleton instance
export const apiService = new FetchService();

// Make globally available
if (typeof window !== 'undefined') {
  window.apiService = apiService;
  window.API_ENDPOINTS = API_ENDPOINTS;
  window.ROLE_IDS = ROLE_IDS;
  window.ADMIN_CONFIG = ADMIN_CONFIG;
  window.IS_LOCAL_HOST = IS_LOCAL_HOST;
  window.IS_LOCAL_LIVE = IS_LOCAL_LIVE;
  window.IS_LIVE_DOMAIN = IS_LIVE_DOMAIN;
  window.IS_DEV_DOMAIN = IS_DEV_DOMAIN;
  window.IS_UAT_DOMAIN = IS_UAT_DOMAIN;
  window.BACKEND_DOMAIN = BACKEND_DOMAIN;
  window.API_KEY = API_KEY;
  window.APP_KEY = APP_KEY;
  window.API_PATH = API_PATH;
  window.BUCKET_URL = BUCKET_URL;
  window.VERSION = VERSION;
  window.MY_TOPIC = MY_TOPIC;
}

export default apiService;
