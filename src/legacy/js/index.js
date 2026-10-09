// https://claude.ai/chat/2f4727ac-9fc8-4993-8abd-580fa89ff414

/* beautify preserve:start */
var IS_ADMIN = false;
var adminUser = localStorage.getItem('xmleditor:admin');
if (adminUser == "superadmin") {
    IS_ADMIN = true;
}
var ADMIN_USER_IDs = ["sivakumars", "yasar.mohideen", "durairajan.gnanam"];
var newDiv = document.createElement('div');
var newSpan = document.createElement('span');
var DOMAIN_URL = window.location.href + "";
var IS_LOCAL_HOST = Boolean(DOMAIN_URL.includes("localhost"));
var IS_LOCAL_LIVE = Boolean(DOMAIN_URL.includes("impactweb_live"));

/* IS BOOLEAN VALUE  */
var IS_LIVE_DOMAIN = ${{ IS_LIVE_DOMAIN }}$;
var IS_DEV_DOMAIN = ${{ IS_DEV_DOMAIN }}$;
var IS_UAT_DOMAIN = ${{ IS_UAT_DOMAIN }}$;
/* IS BOOLEAN VALUE  */

var BACKEND_DOMAIN = `${{ BACKEND_DOMAIN }}$`;
var API_KEY = `${{ API_KEY }}$`;
var User_API_KEY = `${{ User_API_KEY }}$`;
var APP_KEY = `${{ APP_KEY }}$`;
var API_PATH = `${{ API_PATH }}$`;
var DOMAIN_ROOT = `${{ DOMAIN_ROOT }}$`;
var BUCKET_URL = `${{ BUCKET_URL }}$`;
var VERSION = `${{ VERSION }}$`;
var ORACLE_DOMAIN = "https://impactonlinebackend-uat.newgen.co";
var NG_WEB_URL = `https://www.newgen.co/`;
var API_LINK_SHARE = API_PATH + "linksharing";
var API_URL_VALIDITY = API_PATH + "urlvalidity";
var API_UPDATE_INSERT = API_PATH + "updateorinsert";
var API_GET_USERS = API_PATH + "getusers";
var API_GET_DOCS = API_PATH + "getdocs";
var API_GET_FILTER_DOCS = API_PATH + "findwithfilter";
var API_GET_DOCS_AUTH = API_PATH + "getdocsauth";
var API_GET_ADMINDOCS = API_PATH + "getadmindocs";
var API_UPDATE_USERS = API_PATH + "updateuser";
var API_FILE_DOWNLOAD = API_PATH + "filedownload";
var API_FIND_UPDATE_INSERT = API_PATH + "findupdateorinsert";
var API_DEL_RECORD = API_PATH + "deletedoc";
var API_FORM_TO_FILE_FIELD = API_PATH + "formfieldtofile";
var API_SAVE_WITH_LOGOUT = API_PATH + "savewithlogout";
/** WIP: backend orchestrates finalize subprocesses; FE uses when IMPACT_SAVE_WITH_FINALIZE_READY */
var API_SAVE_WITH_FINALIZE = API_PATH + "savewithfinalize";
var API_SAVE_MATH_IMAGE = API_PATH + "savemathimage";
var API_SAVE_SVG_PNG = API_PATH + "fromsvgtopng";
var API_SHARE_INVITE = API_PATH + "shareandinvite";
var API_GENERIC_SEND_MAIL = API_PATH + "genericsendemail";
var API_KAFKA_PROD = API_PATH + "kafkaproducer";
var API_PUBKIT_CLSE_TASK = API_PATH + "pukitapiclosetask";
var API_UPLOAD_SINGLE = API_PATH + "filesupload";
var API_UPLOAD_MULTI = API_PATH + "filesuploadmultiple";

var API_ZIP_DOWNLOAD = API_PATH + "zipfileswithdiranddownload";
var API_ZIP_DOWNLOAD_RECURSIVE = API_PATH + "zipfolderwithrecursively";
var API_BATCH_CONVERT = API_PATH + "batchfileexcuteprocess";
var API_CK_RESTORE = API_PATH + "ckrestore";
var MY_TOPIC = (IS_LOCAL_HOST ? "XMLTOPDFLIVENEW4" : "IMPACTLIVETOPIC");
var API_URL_VALIDATION = API_PATH + "urlvalidation";
var API_FILE_VALIDATION = API_PATH + "fileorfoldercheck";
var API_FILE_APPEND = API_PATH + "fileappendcontent";
var API_CROSS_REF_API = API_PATH + "onlinecrossrefplaintext";
var API_ANYSTYLE_CROSS_REF_API = API_PATH + "anystylecrossrefplaintext";
var API_PUBKIT_STATUS = API_PATH + "pubkitapistatus";
var API_PUBKIT_CLOSE = API_PATH + "pubkitapistatusclose";
var API_CHATBOT_AI = API_PATH + "chatbotai";
var CONVERSION_PORT = {
    // "default": API_BATCH_CONVERT,
    // "impact-ops-dev.newgen.co:8081": API_BATCH_CONVERT_DEV
};
var LOCAL_CONNECT_SERVER = {
    "LOCAL": 'localhost:8080',
    "BUCKET_URL": "http://localhost/xmleditor/",
    "SERVER": `${{ BACKEND_DOMAIN }}$`
};
var DEFAULT_ROLE = '5b53536b4c4a803e9a5abf70';
var ROLE_IDS = {

    "5b53536b4c4a803e9a5abf70": { name: "Author", pubkit_name: "author", SelectorAttribute: "showForAU", Restrict_Selector: "ForAU", shortname: "AU", backup: "5b53536b4c4a803e9a5abf70_AU", Stage: "Proofing", next_mail: "PE_email,editor_email,collator_email", next_role: "PE_role,editor_role,collator_role", tour: { OUP: "role-wise", LWW: "default" } },
    "5b534e334c4a803e9a5abf4c": { name: "Editor", pubkit_name: "editor", SelectorAttribute: "showForED", Restrict_Selector: "ForED", shortname: "ED", backup: "5b534e334c4a803e9a5abf4c_ED", Stage: "ED Review", next_mail: "collator_email", next_role: "collator_role", tour: { OUP: "role-wise", LWW: "default" } },
    "5bcf15b1cf510152afba028a": { name: "Collator", pubkit_name: "collator", SelectorAttribute: "showForCO", Restrict_Selector: "ForCO", shortname: "CO", backup: "5bcf15b1cf510152afba028a_CO", Stage: "Collation", tour: { OUP: "role-wise", LWW: "default" } },
    "5bd1c4e2cf51015102014427": { name: "Copyeditor", pubkit_name: "copyEditor", SelectorAttribute: "showForCE", Restrict_Selector: "ForCE", shortname: "CE", backup: "5bd1c4e2cf51015102014427_CE", Stage: "CE Review", tour: { OUP: "default", LWW: "default" } },
    "5b534dc54c4a803e9a5abf41": { name: "Project Manager", pubkit_name: "pm", SelectorAttribute: "showForPM", Restrict_Selector: "ForPM", shortname: "PM", backup: "5b534dc54c4a803e9a5abf41_PM", Stage: "PM Review", tour: { OUP: "default", LWW: "default" } },
    "5b534e5b4c4a803e9a5abf4f": { name: "Journal Manager", pubkit_name: "jm", SelectorAttribute: "showForJM", Restrict_Selector: "ForJM", shortname: "JM", backup: "5b534e5b4c4a803e9a5abf4f_JM", Stage: "JM Review", tour: { OUP: "default", LWW: "default" } },
    "5bcf11635e7186178a22eee0": { name: "Proofreader", pubkit_name: "proofReader", SelectorAttribute: "showForPR", Restrict_Selector: "ForPR", shortname: "PR", backup: "5bcf11635e7186178a22eee0_PR", Stage: "Proof Reading", tour: { OUP: "default", LWW: "default" } },
    "XML": { name: "XML", Stage: "XML", shortname: "XML" },
    "5b534de04c4a803e9a5abf45": { name: "Production Editor", pubkit_name: "pe", SelectorAttribute: "showForPE", Restrict_Selector: "ForPE", shortname: "PE", backup: "5b534de04c4a803e9a5abf45_PE", Stage: "PE Review", next_mail: "collator_email", next_role: "collator_role", tour: { OUP: "default", LWW: "default" } },
    "5bcf11635e7186178a22iii1": { name: "Import", SelectorAttribute: "showForIM", Restrict_Selector: "ForIM", shortname: "IM", backup: "5bcf11635e7186178a22iii1_IM", Stage: "Import" },
    "5bcf1252cf510152afba0203": { name: "Freelancer Cleanup", SelectorAttribute: "showForFC", Restrict_Selector: "ForFC", shortname: "FC", backup: "5bcf1252cf510152afba0203_FC", Stage: "Cleanup" }
};

if (typeof globalThis.commonfn === "undefined") {
    globalThis.commonfn = {};
}

window.COLLAB_CLIENTS = ["oso", "oxmedo"];

window.hasCollabClient = function (client) {

    try {

        var key = client;

        if (!key && window.SHARED_KEY && window.SHARED_KEY.client) {
            key = window.SHARED_KEY.client;
        }

        if (!key || !window.COLLAB_CLIENTS || !window.COLLAB_CLIENTS.length) {
            return false;
        }

        key = String(key).toLowerCase();

        return window.COLLAB_CLIENTS.indexOf(key) !== -1;

    } catch (err) {

        console.warn(err.message);
        ErrorLogTrace("hasCollabClient", err.message);

        return false;
    }

};

window.isCollabEnabled = function (docId) {

    try {

        var key = docId || window.DOC_ID || window.SHARED_KEY && window.SHARED_KEY.docid;

        if (!key) {
            return false;
        }

        var localOverride = localStorage.getItem(`xmleditor:collabEnabled:${key}`) === "true";
        var sharedKey = window.SHARED_KEY || {};
        var sharedDocId = sharedKey.docid || window.DOC_ID;
        var sharedEnabled = String(sharedKey.collaborative || "").toLowerCase() === "yes";

        return localOverride || (String(sharedDocId || "") === String(key || "") && sharedEnabled);

    } catch (err) {

        console.warn(err.message);
        ErrorLogTrace("isCollabEnabled", err.message);

        return false;
    }

};

window.isCollabSessionEnabled = function (docId, client, collaborative) {

    try {

        return !!(
            window.isCollabEnabled &&
            window.isCollabEnabled(docId) &&
            window.hasCollabClient &&
            window.hasCollabClient(client) &&
            String(collaborative || "").toLowerCase() === "yes"
        );

    } catch (err) {

        console.warn(err.message);
        ErrorLogTrace("isCollabSessionEnabled", err.message);

        return false;
    }

};

window.getSessionIdKey = (docid) => {
    const Cls = window.LinkSessionModule || window.LinkSessionService;
    const mod = Cls && typeof Cls.getInstance === 'function' ? Cls.getInstance() : null;
    if (mod && typeof mod.getSessionIdKey === 'function') {
        return mod.getSessionIdKey(docid);
    }
    return `xmleditor:sessionid:${String(docid || '').trim()}`;
};

window.getSessionId = function (docid) {
    const Cls = window.LinkSessionModule || window.LinkSessionService;
    const mod = Cls && typeof Cls.getInstance === 'function' ? Cls.getInstance() : null;
    if (mod && typeof mod.readSessionId === 'function') {
        return mod.readSessionId(docid);
    }
    docid = docid || window.DOC_ID;
    var scopeKey = 'xmleditor:sessionid:' + String(docid || '').trim();
    var backupKey = 'xmleditor:sessionbackup:' + String(docid || '').trim();
    var scope_results = sessionStorage.getItem(scopeKey);
    var backup_results = localStorage.getItem(backupKey) || '{}';
    var backupSession = null;
    try {
        var backupJson = JSON.parse(backup_results);
        backupSession = backupJson[scopeKey];
    } catch (e) {
        console.warn('Invalid backup JSON', e);
    }
    return scope_results || backupSession || null;
};

/**
 * Thin window alias for dual-guard getdocs verify.
 * Delegates to LinkSessionCore.confirmSessionOnServer when the module is loaded.
 */
window.confirmLinkSessionOnServer = async function confirmLinkSessionOnServer(expected) {
    const Cls = window.LinkSessionModule || window.LinkSessionService || window.LinkSessionEditor;
    const mod = Cls && typeof Cls.getInstance === 'function' ? Cls.getInstance() : null;
    if (mod && typeof mod.confirmSessionOnServer === 'function') {
        return mod.confirmSessionOnServer(expected || {});
    }
    console.warn('[confirmLinkSessionOnServer] LinkSession module not available');
    if (typeof IS_LOCAL_HOST !== 'undefined' && IS_LOCAL_HOST) {
        if (typeof ErrorLogTrace === 'function') {
            ErrorLogTrace('confirmLinkSessionOnServer', 'module_unavailable_local_bypass');
        }
        return { ok: true, reason: 'local_module_unavailable_bypass' };
    }
    return { ok: false, reason: 'getdocs_unavailable' };
};
// ? ATV|HAE|CIR|HCG|HCI|HCQ|HCV|HHF|HYP|RES|STR
window.LWW_AHA_JOURNALS = {
    HAE: 1,
    ATV: 1,
    CIR: 1,
    HCG: 1,
    HCI: 1,
    HCQ: 1,
    HCV: 1,
    HHF: 1,
    HYP: 1,
    RES: 1,
    STR: 1
};
const IS_TRACK_VIEW = ((DOMAIN_URL.match(/TrackView/)) ? (true) : (false));
const IS_COMMEND_VIEW = ((DOMAIN_URL.match(/CommentView/)) ? (true) : (false));
const IS_EDITOR_PAGE = ((DOMAIN_URL.match(/(editor[0-9])/) && !IS_TRACK_VIEW) ? (true) : (false));
// ? IF - THIS FALSE WILL BASED ON USER ROLE
var CAN_SAFARI_CHECK_LOCAL = ((IS_LOCAL_HOST) ? true : false);

// ? ALERT WILL BE NORMAL ALERT OR CONSOLE
const CAN_THROUGH_ALERT = true;

// ! OBJ_SEN_REC_ID || GET_SENDER_RECEIVER_ID('')
const MAIL_DETAIL = {
    /*
     btoa('Hello, world')
     atob('SGVsbG8sIHdvcmxk')
     impactsupport@newgen.co = aW1wYWN0c3VwcG9ydEBuZXdnZW4uY28=
     impactsupport@nkw.pub == aW1wYWN0c3VwcG9ydEBua3cucHVi
     impacthelpdesk@newgen.co = aW1wYWN0aGVscGRlc2tAbmV3Z2VuLmNv
     impacthelpdesk@nkw.pub = aW1wYWN0aGVscGRlc2tAbmt3LnB1Yg==
     impact@newgen.co = aW1wYWN0QG5ld2dlbi5jbw==
     impact@nkw.pub = aW1wYWN0QG5rdy5wdWI=
     impact.helpdesk@newgen.co  = aW1wYWN0LmhlbHBkZXNrQG5ld2dlbi5jbw==
     impact.helpdesk.tnf@newgen.co  = aW1wYWN0LmhlbHBkZXNrLnRuZkBuZXdnZW4uY28=
     impact.notification@newgen.co = aW1wYWN0Lm5vdGlmaWNhdGlvbkBuZXdnZW4uY28=
     impact.notification.oup@newgen.co = aW1wYWN0Lm5vdGlmaWNhdGlvbi5vdXBAbmV3Z2VuLmNv
     impact.notification.lse@newgen.co = impact.helpdesk.lse@newgen.co
     apps@newgen.co = YXBwc0BuZXdnZW4uY28=
     impactinternal@nkw.pub == aW1wYWN0aW50ZXJuYWxAbmt3LnB1Yg==
     sivakumars@newgen.co == c2l2YWt1bWFyc0BuZXdnZW4uY28=
     yasar.mohideen@nkw.pub,durairajan.gnanam@nkw.pub,sivakumars@newgen.co == eWFzYXIubW9oaWRlZW5Abmt3LnB1YixkdXJhaXJhamFuLmduYW5hbUBua3cucHViLHNpdmFrdW1hcnNAbmV3Z2VuLmNv
     yasar.mohideen@nkw.pub,durairajan.gnanam@nkw.pub==eWFzYXIubW9oaWRlZW5Abmt3LnB1YixkdXJhaXJhamFuLmduYW5hbUBua3cucHVi
    */

    "HELP_DESK": {
        "DEFAULT": {
            "TEXT": "aW1wYWN0LmhlbHBkZXNrQG5ld2dlbi5jbw==",
            "MAIL": "aW1wYWN0Lm5vdGlmaWNhdGlvbkBuZXdnZW4uY28="
        },
        "TNF": {
            "TEXT": "aW1wYWN0LmhlbHBkZXNrLnRuZkBuZXdnZW4uY28=",
            "MAIL": "aW1wYWN0LmhlbHBkZXNrLnRuZkBuZXdnZW4uY28="
        },
        "OSO": {
            "TEXT": "aW1wYWN0Lm5vdGlmaWNhdGlvbi5vdXBAbmV3Z2VuLmNv",
            "MAIL": "aW1wYWN0Lm5vdGlmaWNhdGlvbi5vdXBAbmV3Z2VuLmNv"
        },
        // "LSE": { mail id not created yet
        //     "TEXT": "aW1wYWN0LmhlbHBkZXNrLmxzZUBuZXdnZW4uY28=",
        //     "MAIL": "aW1wYWN0LmhlbHBkZXNrLmxzZUBuZXdnZW4uY28="
        // },
    },
    "SHARE_LINK": {
        "DEFAULT": {
            "TEXT": "aW1wYWN0LmhlbHBkZXNrQG5ld2dlbi5jbw==",
            "MAIL": "aW1wYWN0Lm5vdGlmaWNhdGlvbkBuZXdnZW4uY28="
        },
        "TNF": {
            "TEXT": "aW1wYWN0LmhlbHBkZXNrQG5ld2dlbi5jbw==",
            "MAIL": "aW1wYWN0Lm5vdGlmaWNhdGlvbkBuZXdnZW4uY28="
        }
    },
    "PUBKIT_TOKEN_EMAIL": "c2l2YWt1bWFyc0BuZXdnZW4uY28=",
    "PUBKIT_TOKEN_PASS": "Rm5ldEluZGlhQDEyMw==",
    "ADMIN_USERS_EMAIL": ["eWFzYXIubW9oaWRlZW4=", "ZHVyYWlyYWphbi5nbmFuYW0=", "c2l2YWt1bWFycw=="],
    "QA_USERS_EMAIL": ["a2FydGhpY2tleWFuLmE=", "ZGl2eWEua3Jpc2huYW11cnRoeQ=="],
    "Error_Mail": {
        from: {
            "live": "aW1wYWN0Lm5vdGlmaWNhdGlvbkBuZXdnZW4uY28=",
            "default": "aW1wYWN0Lm5vdGlmaWNhdGlvbkBuZXdnZW4uY28="
        },
        to: {
            "live": "c2l2YWt1bWFyc0BuZXdnZW4uY28=",
            "default": "c2l2YWt1bWFyc0BuZXdnZW4uY28="
        },
        bcc: {
            "live": "eWFzYXIubW9oaWRlZW5Abmt3LnB1YixkdXJhaXJhamFuLmduYW5hbUBua3cucHVi",
            "default": "eWFzYXIubW9oaWRlZW5Abmt3LnB1YixkdXJhaXJhamFuLmduYW5hbUBua3cucHVi"
        }
    }
};
// ! https://stackoverflow.com/questions/13815640/a-proper-wrapper-for-console-log-with-correct-line-number
var myuserUniqueId = "",
    IS_TEST_ENV = ((IS_LOCAL_HOST) ? true : false),
    iVersion = `${{ VERSION }}$`;

if (IS_TEST_ENV || IS_UAT_DOMAIN || IS_LOCAL_HOST) {
    window.debug = {
        log: window.console.log.bind(window.console),
        error: window.console.error.bind(window.console, 'error: %s'),
        info: window.console.info.bind(window.console),
        warn: window.console.warn.bind(window.console),
        table: window.console.warn.bind(window.table)
    };
} else {
    var __no_op = function () { };
    window.debug = {
        log: __no_op,
        error: __no_op,
        warn: __no_op,
        info: __no_op,
        table: __no_op
    };
}

(function setKeyofRole(Obj) {
    Obj = Obj ? Obj : ROLE_IDS;
    try {
        for (var key in Obj) {
            if (Obj.hasOwnProperty(key)) {
                let short_name = Obj[key].shortname;
                Obj[short_name] = key;
            }
        }
    } catch (err) {
        console.warn(err.message);
        setTimeout(() => setKeyofRole(Obj), 2000);
    }
})(ROLE_IDS);

/****************START************** */
// HttpService.js
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
     * Creates headers with default values and any additional headers
     * @param {Object} additionalHeaders - Optional additional headers to include
     * @returns {Headers} - Headers object with all required headers
     */
    createHeaders(additionalHeaders = {}) {
        return new Headers({
            ...this.config.defaultHeaders,
            'appkey': this.config.appKey,
            'apikey': this.config.apiKey,
            ...additionalHeaders
        });
    }

    /**
     * Builds the full URL for the API request
     * @param {string} endpoint - The API endpoint
     * @returns {string} - The complete URL
     */
    buildUrl(endpoint, apiPath) {
        if (apiPath) return apiPath;

        // If endpoint already looks like a full URL, return it as is
        if (/^https?:\/\//i.test(endpoint)) {
            return endpoint;
        }

        return `${this.config.baseURL}${endpoint}`;
    }

    createDefaultPayload(type = "default", baseData = {}) {
        // Common payload creation logic
        const payload = {
            ...baseData,
            version: '1.0',
            ...(!baseData.find && ADD_DEFAULT_KEYS(type))
        };

        // Add any environment-specific data
        if (typeof RES_DATA !== 'undefined' && RES_DATA.role) {
            payload.rolename = ROLE_IDS[RES_DATA.role]['name'];
        }
        // Explicitly retain roleid from baseData
        if ("roleid" in baseData) {
            payload.roleid = baseData.roleid;
        }

        if ("remove" in baseData && baseData.remove === "_w") {
            delete payload._w;
            delete payload._r;
        }

        // Add any additional default keys based on type
        /*
        switch (type) {
            case "otp":
                payload.otpType = "email";
                payload.channel = "web";
                break;
            case "verify":
                payload.verifyType = "token";
                break;
        }
        */

        return payload;
    }


    /**
     * Prepares the request body
     * @param {Object} data - The data to be sent in the request
     * @returns {string} - The prepared request body
     */
    prepareRequestBody(data, options) {
        const finalData = options.isPayloadLogic ? this.createDefaultPayload("default", data) : data;

        delete finalData['_r'];
        delete finalData['_w'];

        const stringData = JSON.stringify(finalData);
        return `jsondata=${encodeURIComponent(stringData)}`;
    }

    /**
     * Makes an HTTP request with the specified parameters
     * @param {string} endpoint - The API endpoint to call
     * @param {Object} data - The data to send in the request
     * @param {Object} options - Additional fetch options (optional)
     * @returns {Promise} - Promise that resolves with the fetch response
     */
    async makeRequest(endpoint, data, options = {}) {
        const defaultOptions = {
            method: 'POST',
            headers: this.createHeaders(options.headers),
            body: this.prepareRequestBody(data, options)
        };
        const fetchOptions = {
            ...defaultOptions,
            ...options,
            headers: options.headers ? this.createHeaders(options.headers) : defaultOptions.headers
        };
        try {
            return fetch(this.buildUrl(endpoint, options.apiPath), fetchOptions)
                .then(response => {
                    // Check if response is ok
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    // Parse response based on content type
                    const contentType = response.headers.get('content-type');

                    if (contentType && contentType.includes('application/json')) {
                        return response.json();
                    } else if (contentType && contentType.includes('text/')) {
                        return response.json();
                    } else {
                        return response.json();
                    }
                })
                .then(data => {
                    // Success - return the parsed data
                    // console.log('Request successful:', data);
                    return data;
                })
                .catch(error => {
                    // Handle both network errors and HTTP errors
                    // console.error('makeRequest error:', error);
                    // Re-throw for caller to handle
                    throw error;
                });
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }
}
/*******END**************** */

/*******START**************** */
function isValidVariable(variable) {
    return variable !== null &&
        variable !== undefined &&
        variable !== "" &&
        variable !== "null" &&
        variable !== "undefined";
}

function getramdon() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function s4() {
    let new_rand = getramdon();
    try {
        let loop = 10,
            i = 0;
        while (i < loop && !isNaN(new_rand.charAt(0))) {
            new_rand = getramdon();
            i++;
        }
        return new_rand;
    } catch (error) {
        console.log(error.message);
        return "i" + new_rand;
    }
}

function d2() {
    return Math.floor(Math.random() * 90 + 10);
}

function d4() {
    return Math.floor(1000 + Math.random() * 9000);
}

function getuniqueid() {
    return new Date().getTime() + '-' + getramdon() + '-' + getramdon() + '-' + getramdon();
}

function guid() {
    return getramdon() + getramdon() + '-' + getramdon() + '-' + getramdon() + '-' + getramdon() + '-' + getramdon();
}
const IsAdmin = function () {
    try {
        if (ADMIN_USER_IDs.includes(USER_INFO.MAIL_ID.split('@')[0].trim()) && !SHARED_KEY.apikey) {
            localStorage.setItem('xmleditor:admin', 'superadmin');
            USER_INFO.IS_ADMIN = true;
        } else {
            localStorage.removeItem('xmleditor:admin');
            USER_INFO.IS_ADMIN = false;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('IsAdmin', err.message);
    }
};
window.setDOC_INFO = function (KEY) {
    try {
        var MAP_VALUE_Arr = ["titleinfo", "projecttitle", "identifier", "docid", "client", "dtd", "type", "division", "emailto", "apikey"];
        for (const [key, value] of Object.entries(KEY)) {
            if (MAP_VALUE_Arr.includes(key)) {
                let nKey = key.toLocaleUpperCase().toString();
                DOC_INFO.set(nKey, value);
            }
        }
        DOC_DTD = KEY.dtd;
        IS_JOURNAL = Boolean(DOC_DTD.includes('JATS'));
        window.DOC_ROOT_ID = "xmlcontentroot";
        window.DOC_ROOT_SELECTOR = ((IS_JOURNAL ? "#" : ".") + DOC_ROOT_ID);
        window.DOC_TYPE = IS_JOURNAL ? "proof" : "book";
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('setDOC_INFO', err.message);
    }
};
/*******END**************** */



function diff_human_time(date1) {
    try {
        //?OUP_J_DV_002 Based on Testcase_DR 19-10-2022
        var diff = ["year", "month", "day", "hour", "minute", "second", "milliseconds"];
        for (var i = 0; i < diff.length; i++) {
            // if (moment().diff(date1, diff[i]) == 1) {
            //     return moment().diff(date1, diff[i]) + " " + diff[i] + " ago";
            // } else if (moment().diff(date1, diff[i]) > 1 && i != 6) {
            //     return moment().diff(date1, diff[i]) + " " + diff[i] + "s ago";
            // } else if (i == 6) {
            //? Message change as per Srini call DR_09_01_23
            //     return "less than few seconds ago";
            // }
            //? Message change as per Srini call code shorted DR_09_01_23
            var DIFF = moment().diff(date1, diff[i]);
            // debug.log(DIFF);
            if (DIFF == 1 || DIFF > 1 && i != 6) return DIFF + " " + diff[i] + (DIFF > 1 ? "s" : "") + (" ago");
            else if (i == 6) return "less than few seconds ago";
        }
    } catch (err) {
        ErrorLogTrace('diff_human_time', err.message);
        console.warn(err.message);
    }
}



function clearDocScopedLocalData(currentDocId) {
    try {
        if (!currentDocId) return 0;

        const keysToRemove = [];
        const docId = String(currentDocId);
        const docSuffix = `:${docId}`;
        const sharedPrefix = `xmleditor:shared:${docId}`;
        const canonicalBackupKey = `xmleditor:sessionbackup:${docId}`;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            const isDocScopedXmleditorKey = key.startsWith("xmleditor:") && key.endsWith(docSuffix);
            const isDocScopedSharedKey = key === sharedPrefix || key.startsWith(`${sharedPrefix}:`);
            const isDocScopedBackupKey = key === canonicalBackupKey;
            const isDocScopedOfflineKey = key === `${docId}_offline_html`;

            if (isDocScopedXmleditorKey || isDocScopedSharedKey || isDocScopedBackupKey || isDocScopedOfflineKey) {
                keysToRemove.push(key);
            }
        }

        let removedCount = 0;
        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
                removedCount++;
            } catch (err) {
                console.warn(`Failed to remove key ${key}:`, err.message);
            }
        });

        if (removedCount > 0) {
            console.log(`Cleared ${removedCount} doc-scoped cache/offline entries from localStorage for ${docId}`);
        }
        return removedCount;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("clearDocScopedLocalData", err.message);
        return 0;
    }
}


const getSessionBackupKey = (docid) => `xmleditor:sessionbackup:${String(docid || '').trim()}`;

function normalizeSessionDocId(docid) {
    try {
        if (docid && typeof docid === "object" && docid.type) {
            docid = "";
        }
        const directDocId = String(docid || '').trim();
        if (directDocId) return directDocId;

        const globalDocId = String((typeof DOC_ID !== "undefined" ? DOC_ID : "") || '').trim();
        if (globalDocId) return globalDocId;


        const urlParams = new URLSearchParams(window.location.search || "");
        return String(urlParams.get("docid") || "").trim();
    } catch (err) {
        return String(docid || DOC_ID || '').trim();
    }
}

function safeParseStorageJson(rawValue) {
    try {
        if (!rawValue || typeof rawValue !== "string") return null;
        return JSON.parse(rawValue);
    } catch (err) {
        console.warn("Invalid session backup JSON:", err.message);
        return null;
    }
}

function getSessionBackupKeysByRecency() {
    const out = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith("xmleditor:sessionbackup:")) continue;
            const data = safeParseStorageJson(localStorage.getItem(key));
            const ts = data && data.__meta && data.__meta.savedAt ? Number(data.__meta.savedAt) : 0;
            out.push({
                key,
                ts
            });
        }
    } catch (err) {
        console.warn(err.message);
    }
    out.sort((a, b) => b.ts - a.ts);
    return out.map(item => item.key);
}

function getSessionTabStorageKey(docid) {
    try {
        if (typeof getStorageTabIdKey === "function") return getStorageTabIdKey(docid);
    } catch (err) { }
    const normalizedDocId = String(docid || '').trim();
    return "xmleditor:tabid";
}

/** Tab ids must stay per-tab; never mirror/restore across tabs or same-doc open guard breaks. */
function isSessionTabIdentityKey(key) {
    const k = String(key || '');
    if (!k) return false;
    if (k === 'xmleditor:tabid' || k === 'xmleditor:landing:tabid') return true;
    try {
        if (typeof getStorageTabIdKey === 'function' && k === String(getStorageTabIdKey() || '')) return true;
    } catch (err) { }
    return false;
}

function buildSessionBackupAllowlist(docid) {
    const normalizedDocId = normalizeSessionDocId(docid);
    const keys = new Set([
        "docid",
        "redirect",
        "xmleditor:isRefresh",
        "session_last_saved_time",
        normalizedDocId ? `xmleditor:${normalizedDocId}:isRefresh` : "",
    ]);

    try {
        if (typeof getSessionIdKey === "function") {
            keys.add(getSessionIdKey(normalizedDocId));
            keys.add(getSessionIdKey());
        }
    } catch (err) { }

    try {
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (/^xmleditor:sessionid:/i.test(key))) {
                keys.add(key);
            }
        }
    } catch (err) { }

    return Array.from(keys).filter((key) => key && !isSessionTabIdentityKey(key));
}

function isLikelyDocId(docid) {
    try {
        if (!docid) return false;
        const value = String(docid || '').trim();
        if (!value) return false;
        if (/^\[object\s.+\]$/i.test(value)) return false;
        if (/^N[a-z0-9-]{8,}$/i.test(value)) return true;
        return value.length >= 8;
    } catch (err) {
        return false;
    }
}

function setSessionState(key, value, opts = {}) {
    try {
        if (!key) return;
        const safeValue = String(value == null ? '' : value);
        sessionStorage.setItem(key, safeValue);
        if (!opts || opts.mirror !== true) return;

        const normalizedDocId = normalizeSessionDocId(opts.docid);
        if (!isLikelyDocId(normalizedDocId)) return;
        backupSessionStorage(normalizedDocId);
    } catch (err) {
        console.warn(err.message);
    }
}

/**
 * Restore sessionStorage from localStorage backup JSON
 * Tries with current DOC_ID first, then falls back to any available backup
 * Important: editor entrypoints only. Do not call from LandingPage.
 */
function restoreSessionStorage(docid) {
    try {
        const normalizedDocId = normalizeSessionDocId(docid);
        const urlDocId = normalizeSessionDocId(new URLSearchParams(window.location.search || "").get("docid"));
        const candidateKeys = [];

        if (normalizedDocId && isLikelyDocId(normalizedDocId)) {
            candidateKeys.push(getSessionBackupKey(normalizedDocId));
        }
        if (urlDocId && !candidateKeys.includes(getSessionBackupKey(urlDocId))) {
            candidateKeys.push(getSessionBackupKey(urlDocId));
        }

        getSessionBackupKeysByRecency().forEach((key) => {
            if (!candidateKeys.includes(key)) candidateKeys.push(key);
        });

        for (let i = 0; i < candidateKeys.length; i++) {
            const backupData = localStorage.getItem(candidateKeys[i]);
            const backup = safeParseStorageJson(backupData);
            if (!backup || typeof backup !== "object") continue;

            Object.keys(backup).forEach((restoreKey) => {
                if (restoreKey === "__meta") return;
                if (isSessionTabIdentityKey(restoreKey)) return;
                const value = backup[restoreKey];
                if (typeof value === "string" && value.length > 0) {
                    sessionStorage.setItem(restoreKey, value);
                }
            });
            return true;
        }
    } catch (err) {
        console.warn('Error restoring sessionStorage:', err.message);
    }
    return false;
}


/**
 * Backup sessionStorage to localStorage as single JSON object
 * Includes docid in key for better session isolation
 */
function backupSessionStorage(docid) {
    try {
        if (window.location.pathname.includes("editor6") && !IS_LOCAL_HOST) {

            return;
        }

        const normalizedDocId = normalizeSessionDocId(docid);
        if (!normalizedDocId) return;

        const keysToBackup = buildSessionBackupAllowlist(normalizedDocId);

        const backup = {};
        keysToBackup.forEach((key) => {
            const value = sessionStorage.getItem(key);
            if (typeof value === "string" && value.length > 0) {
                backup[key] = value;
            }
        });

        if (Object.keys(backup).length > 0) {
            backup.__meta = {
                docid: normalizedDocId,
                savedAt: Date.now()
            };
            const backupJson = JSON.stringify(backup);
            localStorage.setItem(getSessionBackupKey(normalizedDocId), backupJson);
        }

    } catch (err) {
        console.warn('Error backing up sessionStorage:', err.message);
    }
}

function cleanupSessionStorageBackups(docid, mode = "single") {
    try {
        const normalizedDocId = normalizeSessionDocId(docid);
        if (mode === "all") {
            const allBackupKeys = getSessionBackupKeysByRecency();
            allBackupKeys.forEach((key) => localStorage.removeItem(key));
            return;
        }
        if (!normalizedDocId) return;
        localStorage.removeItem(getSessionBackupKey(normalizedDocId));
    } catch (err) {
        console.warn('Error cleaning up sessionStorage backup:', err.message);
    }
}

function restoreSessionState(docid) {
    return restoreSessionStorage(docid);
}
// Backup sessionStorage before page unload
window.addEventListener('beforeunload', function () {
    backupSessionStorage();
});
var ADD_DEFAULT_KEYS = function (keys, iJSON, addKeys = [], removeKeys = []) {
    iJSON = iJSON ? iJSON : {};
    try {
        // Default keys to use
        let defaultKeys = ["client", "docid", "username", "role", "rolename", "roleid", "identifier", "session_id", "dtd", "linkinfo", "type", "projecttitle"];
        let finalKeys = [];

        // ? If keys is a string like "default" or not passed, use defaultKeys
        if (typeof keys === 'string' && /defaults|default/gi.test(keys)) {
            finalKeys = [...defaultKeys];
        } else if (Array.isArray(keys)) {
            // ? If keys is an array, use it
            finalKeys = [...keys];
        }

        //  ? Add "vendor" key only if "client" is present but "vendor" isn't

        if (finalKeys.includes("client") && !finalKeys.includes("vendor")) {
            finalKeys.push("vendor");
        }
        if (finalKeys.includes("client") && !finalKeys.includes("shorttitle")) {
            finalKeys.push("shorttitle");
        }

        // ? Add any additional keys passed
        if (addKeys.length > 0) {
            finalKeys.push(...addKeys.filter(k => !finalKeys.includes(k)));
        }
        removeKeys.forEach(key => {
            finalKeys.splice(finalKeys.indexOf(key), 1);
        });

        Array.from(finalKeys).forEach(key => {
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
                    iJSON[key] = SHARED_KEY[key] ? SHARED_KEY[key] : USER_INFO.ROLE_ID;
                    break;
                case 'roleid':
                    iJSON[key] = USER_INFO.ROLE_ID ? USER_INFO.ROLE_ID : SHARED_KEY['role'] ? SHARED_KEY['role'] : "null";
                    break;
                case 'rolename':
                    iJSON[key] = USER_INFO.TRACK_ROLE_NAME ? USER_INFO.TRACK_ROLE_NAME : SHARED_KEY[key] ? SHARED_KEY[key] : "null";
                    break;
                case 'userid':
                    iJSON[key] = USER_INFO.USER_ID ? USER_INFO.USER_ID : SHARED_KEY[key] ? SHARED_KEY[key] : "null";;
                    break;
                case 'status':
                    iJSON[key] = "active";
                    break;
                case 'username':
                    iJSON[key] = USER_INFO.MAIL_ID;
                    break;
                case 'session_id':
                    iJSON["session_id"] = getSessionId();
                    break;
                case 'journal':
                case 'shorttitle':
                    iJSON[key] = IS_JOURNAL
                        ? (
                            (SHARED_KEY && SHARED_KEY.shortitle) ||
                            (SHARED_KEY && SHARED_KEY.titleinfo && SHARED_KEY.titleinfo.cover) ||
                            SHORT_II_TITLE ||
                            ""
                        )
                        : "";
                    break;
                case '_r':
                case '_w':
                    iJSON[key] = ["5af956974b4bb40a34648f8e"];
                    break;
                default:
                    break;
            }
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('ADD_DEFAULT_KEYS', err.message);
    } finally {
        return iJSON;
    }
};
window.GET_JSON = function (params, Options = {}, addKeys, removeKeys = []) {
    try {
        var [TIME, iJSON] = [new Date().getTime(), {}];
        if (/defaults|default/gi.test(params)) {
            Object.assign(iJSON, ADD_DEFAULT_KEYS("default", iJSON, addKeys, removeKeys));
        } else {
            switch (params) {
                case 'query_snapshot':
                    var defaultData = ADD_DEFAULT_KEYS("default", {}, [], ["_r", "_w"]);
                    iJSON = {
                        "tbl": "query_snapshot",
                        "recordtype": "query_snapshot",
                        find: {
                            "docid": DOC_ID,
                            role: defaultData.role,
                            rolename: defaultData.rolename
                        },
                        update: Object.assign({}, defaultData, addKeys)
                    };
                    break;
                case 'set_correction_count':
                    iJSON = {
                        "tbl": "docmodifieddata",
                        "recordtype": "corr_count",
                    };
                    Object.assign(iJSON, ADD_DEFAULT_KEYS("default"));
                    break;
                case 'get_shared_author_info':
                case 'get_corole_info':
                case 'Shareandinvite':
                    iJSON = {
                        "tbl": "Shareandinvite",
                        "find": {
                            "id": SHARED_KEY['_id']
                        },
                        "length": 1000
                    };
                    if (params == "get_shared_author_info" || params == "get_corole_info") {
                        var isColeLink = params == "get_corole_info";
                        iJSON["find"] = {
                            role: USER_INFO.ROLE_ID,
                            docid: DOC_ID,
                            corole: {
                                $exists: isColeLink ? isColeLink : false
                            }
                        };
                        break;
                    }
                    if (Options.status) {
                        // ? Check Is Sign=Off or not
                        if (!addKeys) addKeys = "signoff";
                        iJSON.find.status = addKeys;
                    }
                    if (Options.update) {
                        // ? Close to Open the link
                        if (!addKeys) addKeys = {
                            "status": "active"
                        };
                        iJSON.update = addKeys;

                    }
                    if (Options.signoff || Options.corole_link_signoff) {
                        // ? Close to Open the link
                        if (!addKeys) addKeys = {
                            "status": "signoff",
                            "signouttime": TIME,
                            //"link-info": SHARED_KEY.linkinfo, //? No Need this key here as per siva request by DR
                        };
                        iJSON.update = addKeys;
                        Object.assign(iJSON, ADD_DEFAULT_KEYS(["_r", "_w"]));
                        // ! Auto sign-off all co shared link
                        // ? 05-JAN-2022
                        if (Options.corole_link_signoff) {
                            iJSON.find = {
                                "docid": DOC_ID,
                                "corole": USER_INFO.ROLE_ID,
                                "status": "active"
                            };
                            // TODO add role also
                            iJSON.updateMany = "1";
                        }
                    }
                    if (Options.filter) {
                        if (!addKeys) addKeys = ["emailto", "id", "uid", "time_c", "targettbl"];
                        delete iJSON.find['id'];
                        iJSON.docid = DOC_ID;
                        iJSON.filter = addKeys;
                    }
                    if (Options.getCount) {
                        iJSON.docid = DOC_ID;
                        iJSON.find = {
                            "docid": DOC_ID
                        };
                    }
                    if (Options.updateSignOffTime) {
                        // ? 22-May-22 update dashboard purpose
                        delete iJSON.find['id'];
                        iJSON.docid = DOC_ID;
                        iJSON.find = {
                            "docid": DOC_ID,
                            "status": "active",
                            "role": ROLE_IDS.CO,
                            "corole": {
                                "$exists": false
                            }
                        };
                        iJSON.update = {};
                        //? 04/05_JAN_23 YA - INTERNAL_DASHBOARD_VALIDATION_PURPOSE
                        Options.time = Options.time ? Options.time : TIME;
                        // ? 13_FEB_2023 - MODIFY
                        if (SHARED_KEY.roles_signoff) {
                            iJSON.update[`roles_signoff.` + USER_INFO.ROLE_ID] = Options.time;
                        } else if (SHARED_KEY.order) {
                            iJSON.find["roles_orders.role"] = USER_INFO.ROLE_ID;
                            iJSON.find["roles_orders.rolename"] = USER_INFO.ROLE_NAME;
                            iJSON.update['roles_orders.$.status'] = Options.time;
                        }
                    }
                    if (Options.attachmentslist) {
                        iJSON.update['attachmentslist'] = handleAttachmentList();
                    }

                    Object.assign(iJSON, ADD_DEFAULT_KEYS("default"));


                    break;
                case 'openhtml':
                    iJSON = {
                        "tbl": "Fileslist",
                        "find": {
                            "recent": 1,
                            "docid": DOC_ID
                        },
                        "length": 1,
                        "sort": {
                            'time_c': -1
                        },
                        "filter": ["file_sn", "time_c"]
                    };
                    if (IS_TRACK_VIEW) {
                        iJSON.find = {
                            "roleid": USER_INFO.SELECTOR_BKUP_FOLDER,
                            "docid": DOC_ID
                        };
                        // ? 29_OCT_22_YA_FF105_BUG_TRACK_VIEW
                        iJSON.extension = ".html";
                        iJSON.process = "openhtml";
                    }
                    break;
                case 'regeneratePDF':
                    iJSON = {
                        "tbl": "Fileslist",
                        "find": {
                            "docid": DOC_ID
                        },
                        "length": 1,
                        "sort": {
                            'time_c': -1
                        },
                        "filter": ["file_on", "preconv", "pdf"]
                    };
                    break;
                case 'guideTourStatus':
                    iJSON = {
                        "tbl": "User",
                        "find": {
                            "username": localStorage.getItem(`xmleditor:username:${DOC_ID}`)
                        },
                        "sort": {},
                        "filter": ["username", "displayname"]
                    };
                    if (Options.update) {
                        iJSON.update = {
                            "guided": 1
                        };
                    } else if (Options.find) {
                        iJSON.find.guided = {
                            "$exists": true
                        };
                    } else if (Options.reset) {
                        iJSON.update = {
                            "guided": 0
                        };
                    }
                    break;
                case 'getProjectInfo':
                case 'Chinesechar_Count':
                    iJSON = {
                        "tbl": "Fileslist",
                        "find": {
                            "status": 'active',
                            'docid': DOC_ID,
                            'projectname': {
                                "$exists": true
                            }
                        },
                        "length": 1,
                        "sort": {},
                        "filter": ["projectname", "id", "status", "dtd", "client", "type"]
                    };
                    if (Options.chinesechar) {
                        /* Chinesecount*/
                        iJSON['find'] = {
                            $or: [{
                                "Chinesecount": {
                                    "$exists": true
                                },
                                'docid': DOC_ID,
                            },
                            {
                                "Chineshcount": {
                                    "$exists": true
                                },
                                'docid': DOC_ID,
                            },
                            {
                                "xmltohtmlres": {
                                    "$exists": true
                                },
                                'docid': DOC_ID,
                            },
                            {
                                "xmltohtmlres.Chinesecount": {
                                    "$exists": true
                                },
                                'docid': DOC_ID,
                            },
                            {
                                "xmltohtmlres.Chineshcount": {
                                    "$exists": true
                                },
                                'docid': DOC_ID
                            }
                            ]
                        };
                        delete iJSON['find']['projectname'];
                    }
                    break;
                case 'linksharing':
                    iJSON = {
                        "tbl": "linksharing",
                        "docid": DOC_ID
                    };
                    if (Options.process) {
                        iJSON.process = Options.process;
                        if (['updatereqstatus', 'refresh', 'update_session_end_time', 'close', 'signoff'].includes(Options.process)) {
                            iJSON.session_id = sessionStorage.getItem(`xmleditor:sessionid:${String(DOC_ID || '').trim()}`);
                        }
                        if ('updatereqstatus' == Options.process) {
                            iJSON.remarks = Options.remarks;
                            iJSON.requeststatus = "4";
                        } else if (['update_session_end_time', 'close', 'signoff'].includes(Options.process)) {
                            iJSON.session_end_time = (Options.process == 'close') ? TIME.toString() : "0";
                        } else if ('scheduler' == Options.process) {
                            iJSON.docstatus = "1";
                            iJSON.requeststatus = "1";
                        } else if (['update_request_status', 'updaterequeststatus'].includes(Options.process)) {
                            iJSON.requeststatus = "2";
                        } else if ('updatestatus_reqstatus' == Options.process) {
                            iJSON.docstatus = Options.docstatus;
                            iJSON.requeststatus = Options.requeststatus;
                        } else if ('save' == Options.process) {
                            // ? YA_18_JAN_2024 
                            const { state } = IMPACT_SAVE || {};
                            const lastSaveTimestamp = state && state.lastSaveTimestamp;
                            iJSON.last_saved_time = lastSaveTimestamp || TIME.toString();
                        }
                    }
                    var addKeys = {};
                    if (USER_INFO.HAS_COLLAB_WORKFLOW) {
                        addKeys["collaborative"] = "1";
                    }


                    Object.assign(iJSON, ADD_DEFAULT_KEYS("default"), addKeys);

                    if (Options.remarks) {
                        iJSON.remarks = Options.remarks;
                    }

                    // Java $set uses process-specific *_remarks; mirror remarks into that key.
                    if (typeof LinkSessionCore !== 'undefined' && typeof LinkSessionCore.attachProcessRemarks === 'function') {
                        LinkSessionCore.attachProcessRemarks(iJSON, Options.process, iJSON.remarks || Options.remarks);
                    } else if (Options.process) {
                        var _remarkDefaults = {
                            update_docstatus_reqstatus_insert_time: 'takeover',
                            update_reqstatus_time: 'send_request',
                            updaterequeststatus: 'accept_open',
                            updatestatus_reqstatus: 'status_change',
                            update_req_status: 'clear_rejected',
                            getrequeststatus_process: 'poll',
                            updatereqstatus: 'rejected_by_collator',
                            close: 'close',
                            save: 'save',
                            update_session_end_time: 'clear_end_time'
                        };
                        var _remarkFields = {
                            update_docstatus_reqstatus_insert_time: 'update_docstatus_reqstatus_insert_time_remarks',
                            update_reqstatus_time: 'update_reqstatus_time_remarks',
                            updaterequeststatus: 'updaterequeststatus_remarks',
                            updatestatus_reqstatus: 'updatestatus_reqstatus_remarks',
                            update_req_status: 'update_req_status_remarks',
                            getrequeststatus_process: 'getrequeststatus_process_remarks',
                            updatereqstatus: 'updatereqstatus_remarks',
                            close: 'close_remarks',
                            save: 'save_remarks',
                            update_session_end_time: 'update_session_end_time_remarks'
                        };
                        var _remarkText = iJSON.remarks || Options.remarks || _remarkDefaults[Options.process];
                        if (_remarkText) {
                            iJSON.remarks = _remarkText;
                            if (_remarkFields[Options.process]) {
                                iJSON[_remarkFields[Options.process]] = _remarkText;
                            }
                        }
                    }

                    delete iJSON['_w'];
                    delete iJSON['_r'];
                    break;
                case 'signoffstatus':
                    iJSON = {
                        "tbl": "signoffstatus",
                        "status": Options.r,
                        'message': Options.m ? Options.m : ''
                    };
                    Object.assign(iJSON, ADD_DEFAULT_KEYS("default"));
                    break;
                case 'query_append':
                    iJSON = {
                        /* "client": SHARED_KEY.client,
                        "docid": DOC_ID,
                        "userid": USER_INFO.MAIL_ID,
                        "role": USER_INFO.ROLE_ID,
                        "identifier": SHARED_KEY.identifier, */
                        "filename": `${DOC_ID}_AQ.html`,
                        "findid": Options.findid,
                        "content": Options.content
                    };
                    Object.assign(iJSON, ADD_DEFAULT_KEYS("default"));
                    break;
                case 'cross_ref_url':
                    iJSON = {
                        "tbl": "referenceapi",
                        "query": Options.content,
                        "rows": "1"
                    };
                    Object.assign(iJSON, ADD_DEFAULT_KEYS("default"));
                    break;
                case 'chatbox_ai_url':
                    iJSON = {
                        "tbl": "chatbotai",
                        "message": Options.content
                    };
                    Object.assign(iJSON, ADD_DEFAULT_KEYS("default"));
                    break;
                case 'restore_document':
                    iJSON = {
                        'sopt': 'openstorage',
                        'docid': DOC_ID,
                        'roleid': USER_INFO.SELECTOR_BKUP_FOLDER
                    };
                    if (Options.process == "update_db") {
                        iJSON["tbl"] = "Fileslist";
                        iJSON['recordtype'] = Options.recordtype;
                        delete iJSON['sopt'];
                        if (Options['restoreversionfilename']) {
                            iJSON['keyname'] = Options.recordtype;
                            iJSON['filename'] = Options.restoreversionfilename;
                        }
                        Object.assign(iJSON, ADD_DEFAULT_KEYS("default"));
                    } else if (Options.process != "update_db") {
                        iJSON['process'] = Options.process;
                        if (Options.process == 'getfiles') {
                            iJSON["length"] = 1000;
                            iJSON["sort"] = {
                                'time_c': -1
                            };
                            iJSON["filter"] = [];
                        } else iJSON['timestamp'] = Options.filename;
                    }
                    break;
                case 'contact_support':
                    Object.assign(iJSON, ADD_DEFAULT_KEYS("default"));
                    break;
                case 'fire_pubkit':
                    // ? 09_APR_2023 - YA
                    iJSON = {
                        tbl: "pubkitapistatus",
                        message: "Task closure initiated by user"
                    };
                    Object.assign(iJSON, ADD_DEFAULT_KEYS("default", {}, ["doi", "taskid", "roletaskid"]));
                    break;
                case 'share_document':
                    Object.assign(iJSON, ADD_DEFAULT_KEYS("default", {}, ["status"]));
                    break;
                default:
                    Object.assign(iJSON, ADD_DEFAULT_KEYS(params));
                    break;
            }
        }
        return iJSON;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('GET_JSON', err.message);
    }
};

$.ajaxSetup({
    beforeSend: function (request) {
        request.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded;charset=UTF-8');
        request.setRequestHeader("appkey", localStorage.getItem('xmleditor:appkey'));
        request.setRequestHeader("apikey", localStorage.getItem('xmleditor:apikey'));
    },
    success: function (jqXHR, textStatus) {
        console.log(textStatus);
    },
    error: function (jqXHR, textStatus) {
        console.log(textStatus);
        if (jqXHR.status == 401) {
            location.reload(true);
        }
    },
    always: function () { }
});




commonfn.callajax = function (jsondata, postfun, url, opt = '') {
    try {
        const { _r, _w } = jsondata;
        delete jsondata._r;
        delete jsondata._w;
        Object.assign(jsondata, { _r, _w });
        jsondata = JSON.stringify(jsondata);
        $.ajax({
            url: url,
            data: {
                'jsondata': jsondata
            },
            type: "post",
            dataType: "JSON",

            contentType: "application/json",
            success: function (response) {
                if (commonfn[postfun]) {
                    commonfn[postfun](response, opt);
                } else if (opt && (opt[postfun] || (opt['M_FUN'] && opt['M_FUN'][postfun]))) {
                    opt[postfun] ? opt[postfun](response, opt) : opt['M_FUN'][postfun](response, opt);
                } else if (typeof ErrorLogTrace == 'function' && postfun != 'fun_return') {
                    console.log(postfun);
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log("error calling: " + postfun);
                console.log(textStatus, errorThrown);
            }
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('callajax', err.message);
    }
};

var START_TIME = (new Date().getTime());
var IS_READ_ONLY_MODE = false;
const PAGE_ReDIRECT = ['editor6.html?docid=', 'editor6TrackView.html?docid='];
window.MAINTENANCE = {
    ON: null,
    START: 0,
    END: 0,
    ALERT_START: 0,
    CASE: "SCHEDULED",
    CAN_SHOW_ALERT: false,
    debug: true,
    BEFORE_TIMER: (48 * 60),
    END_TIMER: (2 * 60),
    INITIATED: null,
    STAGE: {
        save: {
            cycle: "once",
            shown: false,
            diff_duration: 20,
            check: "minutes",
            from: function (milliseconds) {
                // ? https://stackoverflow.com/questions/7709803/javascript-get-minutes-between-two-dates
                if (!milliseconds) milliseconds = new Date().getTime();
                try {
                    let start_time = sessionStorage.getItem("session_start") || START_TIME;
                    let diff = (milliseconds - start_time);
                    let resultInMinutes = Math.round(diff / 60000);
                    debug.log(this.check + "  ==>  " + resultInMinutes);
                    return resultInMinutes;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('start_time_from', err.message);
                }
            }
        }
    },
    Init: function (Options = {}) {
        try {
            console.log("---MAINTENANCE---");
            if (typeof Mustache == "undefined") {
                console.log("---Mustache- undefined---");
                return setTimeout(() => {
                    MAINTENANCE.Init(Options);
                }, 1500);
            }
            let newTime = new Date().getTime();
            if (Options.start) {
                if (typeof Options.start == "string") Options.start = parseFloat(Options.start);
                if (!Options.start) return console.warn("--MAINTENANCE--OFF--INVALID DATE-TIME--");
                if (typeof Options.end == "string") Options.end = parseFloat(Options.end);
                this.START = Options.start;
                this.END = Options.end ? Options.end : moment(Options.start).add(this.END_TIMER, "minutes").valueOf();
                this.ON = true;
            }
            if (this.ON) {
                Options.showBefore = (Options.showBefore ? Options.showBefore : this.BEFORE_TIMER);
                if (this.START > newTime && this.END > newTime) {
                    debug.log("--MAINTENANCE--ON----");
                    if (!this.ALERT_START) {
                        this.ALERT_START = moment(this.START).subtract(Options.showBefore, "minutes").valueOf();
                    }
                    debug.log("ALERT START ==> " + moment(this.ALERT_START).format("llll"));
                    this.T1 = moment(this.START).format('DD-MMM-YYYY h:mm');
                    this.T1A = moment(this.START).format('A');
                    this.T2 = moment(this.END).format('DD-MMM-YYYY h:mm');
                    this.T2A = moment(this.END).format('A');
                    debug.log("START ==> " + this.T1);
                    this.RETURN_TEXT = Mustache.render(ALERT_MESSAGE.SCH_MAINTENANCE.text, {
                        T1: this.T1,
                        T1A: this.T1A,
                        T2: this.T2,
                        T2A: this.T2A
                    });
                    debug.log("RETURN_TEXT ==> " + this.RETURN_TEXT);
                    debug.log("END ==> " + this.T1);
                    console.log("this.RETURN_TEXT ==> " + this.RETURN_TEXT);
                    this.INITIATED = true;
                    if (Boolean(window.location.href.includes("validateurl"))) {
                        this.fire();
                    }
                    return this.INITIATED;
                } else {
                    debug.log("--MAINTENANCE--OFF----");
                    this.ON = false;
                    return this.ON;
                }
            } else {
                if (this.ON == null || Options.init) {
                    this.checkMaintenance_db();
                }
                this.ON = false;
                return this.ON;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('MAINTENANCE_Init', err.message);
        }
    },
    fire: function (Options = {}) {
        try {
            if (!this.INITIATED) this.Init(Options);
            if (this.ON && this.START) {
                if (!this.ALERT_START) {
                    this.ALERT_START = moment(this.START).subtract(this.BEFORE_TIMER, "minutes");
                }
                this.CAN_SHOW_ALERT = (((new Date().getTime()) - this.ALERT_START) >= 0);
                if (Options.stage && this.STAGE[Options.stage] && !this.STAGE[Options.stage].shown) {
                    if (this.STAGE[Options.stage].from() >= this.STAGE[Options.stage].diff_duration) {
                        this.STAGE[Options.stage].shown = this.CAN_SHOW_ALERT = true;
                    } else {
                        console.log(`maintenance alert will be shown next ${(this.STAGE[Options.stage].diff_duration) - (this.STAGE[Options.stage].from())} minutes`);
                        this.CAN_SHOW_ALERT = false;
                    }
                }
                if (this.debug && !this.CAN_SHOW_ALERT && IS_LOCAL_HOST) {
                    debug.warn("MANUAL ON");
                    this.CAN_SHOW_ALERT = true;
                }
                if (this.CAN_SHOW_ALERT) {
                    if (Options.returnText) {
                        return this.RETURN_TEXT;
                    } else {
                        if (IS_EDITOR_PAGE) {
                            TOASTER_ALERT('SCH_MAINTENANCE', {
                                type: 'info',
                                Mustache: true,
                                position: IS_EDITOR_PAGE ? "top-end" : "top",
                                T1: MAINTENANCE.T1,
                                T2: MAINTENANCE.T2,
                                T1A: MAINTENANCE.T1A,
                                T2A: MAINTENANCE.T2A
                            });
                            if (Options.stage) {
                                this.STAGE[Options.stage].shown = true;
                                this.CAN_SHOW_ALERT = false;
                            }
                        } else {
                            const Toast = Swal.mixin({
                                toast: true,
                                position: 'top',
                                showConfirmButton: false
                            });
                            Toast.fire({
                                icon: 'info',
                                html: this.RETURN_TEXT
                            });
                        }
                    }
                }
            } else {
                //this.checkMaintenance_db();
                return false;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('MAINTENANCE-fire', err.message);
        }
    },
    checkMaintenance_db: function () {
        try {
            var json = {
                "tbl": "ServerMaintenance",
                "find": {
                    // $or: [{
                    "status": "active",
                    "starttime": {
                        "$gt": new Date().getTime()
                    },

                    // }]
                },
                "length": 1,
                "sort": {
                    'starttime': 1
                }
            };
            debug.log(JSON.stringify(json));
            commonfn['callajax'](json, 'RETURN_CHECK_MAIN_DB', API_GET_DOCS, MAINTENANCE);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('checkMaintenance_db', err.message);
        }
    },
    RETURN_CHECK_MAIN_DB(response, Opt) {
        try {
            debug.log(JSON.stringify(response));
            if (response.data && response.data.length > 0) {
                let first = response.data[0];
                let startTime = first.starttime && first.starttime.$numberLong ? parseFloat(first.starttime.$numberLong) : parseFloat(first.starttime);
                let endTime = first.endtime && first.endtime.$numberLong ? parseFloat(first.endtime.$numberLong) : parseFloat(first.endtime);
                MAINTENANCE.Init({
                    start: startTime,
                    end: endTime
                });
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('RETURN_CHECK_MAIN_DB', err.message);
        }
    },
    addMaintenance() {
        try {

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('addMaintenance', err.message);
        }
    },
    removeMaintenance() {
        try {

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('removeMaintenance', err.message);
        }
    }
};
window.ACTION_RECORD = {
    INS_ORDER: 0,
    DEL_ORDER: 0,
    INITIATED: false,
    GET_COUNT: function () {
        try {
            if (!this.INITIATED || this.INS_ORDER == 0) this.Init();
            this.INS_ORDER = (this.INS_ORDER + 1);
            return this.INS_ORDER;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_COUNT', err.message);
        }
    },
    Init: function () {
        try {
            let array1 = GlobalEditor.document.find("[data-insert-order]").toArray().map(node => {
                return parseInt(node.getAttribute("data-insert-order"));
            }).sort();
            debug.log("-TRACK_MAXI--" + Math.max(...array1));
            this.INS_ORDER = array1.length > 0 ? (Math.max(...array1) + 1) : 0;
            this.INITIATED = true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Init', err.message);
        }
    }
};


function GET_SENDER_RECEIVER_ID(type, client, Options = {}) {
    try {
        let result = MAIL_DETAIL[type];
        if (typeof result == 'string') {
            return atob(result);
        } else {
            // ? 28_FEB_2024 TNF
            if (/SHARE_LINK|HELP_DESK/gi.test(type)) {
                if (!client) client = SHARED_KEY.client || RES_DATA.client;
                if (client) client = client.toLocaleUpperCase();
                let reObj = client && result[client] ? (result[client]) : (result["DEFAULT"]);
                let sendJson = {};
                Object.entries(reObj).forEach(([key, value]) => {
                    sendJson[key] = atob(value);
                });
                return sendJson;
            } else if ('Error_Mail' == type) {
                let obj = {
                    from: atob(result.from.default),
                    to: atob(IS_LIVE_DOMAIN ? result.to.live : result.to.default),
                    bcc: atob(IS_LIVE_DOMAIN ? result.bcc.live : result.bcc.default)
                };
                return obj;
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('GET_SENDER_RECEIVER_ID', err.message);
    }
}
var iGetElmById = function (_id, options) {
    try {
        const Elm = document.getElementById(_id);
        if (!Elm) {
            return;
        }
        if (options) {
            if (options.addClass) {
                Elm.classList.add(options.addClass);
            }
            if (options.append) {
                let value = options.append;
                let string2Frag = null;
                if (Array.isArray(value)) {
                    string2Frag = iGetFragment(value.join(''));
                } else if (typeof value == 'string') {
                    string2Frag = iGetFragment(value);
                }
                Elm.append(string2Frag);
            }
        }
        return Elm;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('iGetElmById', err.message);
    }
};
var Invalid_Access = function () {
    try {
        _CanClose = true;
        if (['undefined', 'defined'].includes(typeof AlertNewDialog)) setTimeout(Invalid_Access, 500);
        else {
            if (IS_LOCAL_HOST) {
                console.log("----Invalid_Access----");
                // window.open("login.html", "_blank");
                // location.reload();
            }
            AlertNewDialog.fire("REQ_DENIED").then((result) => {
                if (result.isConfirmed) {
                    var tempDirect = sessionStorage.getItem("redirect");
                    // window.location.href = (tempDirect ? (tempDirect) : (NG_WEB_URL));
                    if (tempDirect) window.location.href = IS_TEST_ENV ? "login.html" : tempDirect;
                }
            });
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Invalid_Access', err.message);
    }
};

function getTarget(editor, IMS) {
    if (typeof IMPACT !== 'undefined' && IMPACT.USER_ENV_INFO && IMPACT.USER_ENV_INFO.isSafari &&
        typeof IMP_SAFARI !== 'undefined' && IMP_SAFARI.TARGET) {
        return editor.document.getById(IMP_SAFARI.TARGET.closest('div').id);
    }
    return IMS && IMS.NODE ? IMS.NODE.getAscendant({
        div: 1
    }) : null;
};

function prefixLastNumericSegment(id, zeroPrefix = '000') {

    if (!id || typeof id !== 'string') return id;
    return id.replace(/^(.*-)(\d+)$/, (match, prefix, numeric) => {
        return prefix + zeroPrefix + numeric;
    });
}

function stripLeadingZerosFromLastNumericSegment(id, zeroPrefix = '000') {
    if (!id || typeof id !== 'string') return id;
    return id.replace(/^(.*-)(000\d+)$/, (match, prefix, numeric) => {
        return prefix + numeric.slice(zeroPrefix.length);
    });
}