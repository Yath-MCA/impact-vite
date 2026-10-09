/*jslint white:true, for:true */
/*global scope, title */
console.log('validate');
const GET_COVER_IMG_URL = function(name, client) {
    return `${BUCKET_URL}_SUPPORT_FILES/${client.toLocaleUpperCase()}/cover/${name}.png`;
};
var [USER_INFO, URL_PARAMETER, redirect_url, DOC_ID, DOC_DTD] = [{}, {}, "", "", ""];
var INACTIVE_LINK_STATUSES = ["signoff", "deactive"];
var NEW_SESSION_ID = Math.floor(10000000 + Math.random() * 90000000);
var Request_ID = Math.floor(100000000 + Math.random() * 900000000);
var LANDING_AUTH_TRIGGER_MODE = "on_the_fly";
var LANDING_DWELL_EVENTS_ENABLED = false;

var [SHARED_KEY, RES_DATA, ERR_KEY, VALIDATE_BTN, _IsActive, _IsSignOff, IS_JOURNAL] = [null, null, null, null, true, false, false],
pendingValidateAfterDocView = false,
    pendingCommitResData = null,
    pendingAuthResponse = null,
    landingAuthReadyAt = null,
    landingAuthActionRecorded = false,
    landingDwellEnterTs = null,
    landingDwellEventSent = false,
    landingAuthCompleted = false,
    // Per-client Pubkit landing analytics URLs (fill when Pubkit provides paths; empty = skip Pubkit POST).
    LANDING_ANALYTICS_ENDPOINTS = {
        plos: "",
        lww: "",
        oup: "",
        medknow: "",
        default: ""
    },
    ALERT_BROWSER = {
        "safari_old": "Currently IMPACT is not optimized for use with the latest version of the Safari browser; therefore, we recommend using Chrome instead.",
        "Safari": `Currently, IMPACT is not optimized for use with the latest version of Safari. We recommend you instead use Chrome to open and proof your proof while we update IMPACT to be compatible with the latest version of Safari.`,
        "notSupport": "The version of the browser you are using is no longer supported. Please upgrade to supported browser",
    },
    ALERT_MESSAGE = {
        'Land_Page_SESSION_OUT': {
            "type": "info",
            "title": "Session Ended",
            'text': 'Due to inactivity, your session got expired. Please click &ldquo;AGREE & CONTINUE&rdquo; to start a new session.',
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Land_Page_FILE_DELETED': {
            "title": "File Deleted",
            "type": "info",
            'text': `The proofing link is expired. If you have not downloaded your proof, please contact &ldquo;<a class="font-weight-bold email-text" href="mailto:{{MAIL}}">{{TEXT}}</a>&rdquo;.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: false
            }
        },
        'Land_Page_SIGN_OFF': {
            "type": "info",
            "title": "Approved",
            'text': `The proof link has been approved, and the {{DOC_TYPE}} is now accessible in read-only mode.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Land_Page_EXPIRED': {
            "type": "info",
            "title": "Expired",
            // ? MOCK 19_FEB_2024 - YA - OUP_J_ LP_002
            'text': `The link you have used has expired and is invalid. If you need help, please contact our support team.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: false
            }
        },
        'Land_Page_INVALID': {
            "type": "error",
            "title": "Invalid Link",
            // ? MOCK 19_FEB_2024 - YA - OUP_J_ LP_002
            'text': `The link seems to be invalid or broken. Please verify the URL and try again. If the problem persists, kindly contact our support team for assistance.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Land_Page_Link_Opened': {
            "type": "error",
            "title": "Request Denied!",
            'text': `Link has been already opened in another tab. Please check`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Land_Page_NOT_SUPPORT_BROW': {
            "type": "warning",
            "title": "Unsupported Browser",
            'text': `The browser version you are using is no longer supported. Please upgrade to a supported version or switch to another supported browser. A list of supported browsers and versions is available at the bottom of the screen.`,
            "button1": "",
            "button2": "",
            "param": true,
            "Options": {
                hide: false
            }
        },
        'Land_Page_TRY_AGAIN': {
            "type": "error",
            "title": "Request denied",
            'text': `Please try after some time.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Land_Page_TRY_AGAIN_1': {
            "type": "error",
            "title": "Request denied",
            'text': `Unable to process your request. Kindly try after some time.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Land_Page_Send_Req': {
            "type": "warning",
            "title": "",
            'text': `Oops! This session is either open with another user, or your session was closed without logging out correctly. Please press &lsquo;Send Request&rsquo; to regain access, or press &lsquo;Cancel&rsquo; to exit the tool.`,
            "button1": "Send Request",
            "button2": "Cancel",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Land_Page_Access_Denied': {
            "type": "error",
            "title": "Request Denied",
            'text': `You don&rsquo;t have access to the proof link for the following reason: %1%`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'SCH_MAINTENANCE': {
            'text': "Kindly note that we will be experiencing server downtime due to scheduled maintenance from <span class='font-weight-bold'>{{T1}}&#x000a0;{{T1A}}</span> to <span class='font-weight-bold'>{{T2}}&#x000a0;{{T2A}}</span> (in your local time)."
        },
        'SECURITY_INVALID_IP': {
            "type": "error",
            "title": "Access denied",
            'text': `Your IP address and system do not have permission to access the IMPACT link. Please reach out to the PLOS team for assistance.`,
            "button1": "",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        }
    },
    [OPEN_TIME, oPage_DOCID, CHECK_OPAGE] = [Date.now(), "", false];

var STORAGE_LANDING_TAB_ID_KEY = "xmleditor:landing:tabid";
var STORAGE_LANDING_TAB_ID = sessionStorage.getItem(STORAGE_LANDING_TAB_ID_KEY) || ((new Date().getTime()) + "_" + Math.random());

const HIDDEN_TIMEOUT = IS_LOCAL_HOST ? 5 * 60 * 1000 : 10 * 60 * 1000;
const HIDDEN_AT_KEY = "landing:hidden_at";
const ACCUMULATED_HIDDEN_KEY = "landing:accumulated_hidden";

function resetAccumulatedHiddenTime() {
    try {
        sessionStorage.removeItem(ACCUMULATED_HIDDEN_KEY);
        sessionStorage.removeItem(HIDDEN_AT_KEY);
    } catch (err) {
        console.warn('Error resetting accumulated hidden time:', err.message);
    }
}
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        sessionStorage.setItem(HIDDEN_AT_KEY, Date.now().toString());
        return;
    }
    const hiddenAt = sessionStorage.getItem(HIDDEN_AT_KEY);
    if (!hiddenAt) {
        return;
    }
    const hiddenDuration = Date.now() - parseInt(hiddenAt);
    sessionStorage.removeItem(HIDDEN_AT_KEY);
    let accumulatedHidden = parseInt(sessionStorage.getItem(ACCUMULATED_HIDDEN_KEY) || "0");
    accumulatedHidden += hiddenDuration;
    sessionStorage.setItem(ACCUMULATED_HIDDEN_KEY, accumulatedHidden.toString());
    const elapsed = accumulatedHidden;
    const remaining = HIDDEN_TIMEOUT - elapsed;
    if (IS_LOCAL_HOST) {
        setInterval(() => {
            console.log(`Accumulated hidden: ${Math.floor(elapsed / 1000)}s. ` + `Refresh in ${Math.max(0, Math.ceil(remaining / 1000))}s`);
        }, 1000);
    }
    if (accumulatedHidden > HIDDEN_TIMEOUT) {
        sessionStorage.removeItem(ACCUMULATED_HIDDEN_KEY);
        location.reload();
    }
});
sessionStorage.setItem(STORAGE_LANDING_TAB_ID_KEY, STORAGE_LANDING_TAB_ID);

function isCollatorRole(resData) {
    try {
        var role = (resData && resData.rolename) || (SHARED_KEY && SHARED_KEY.rolename) || "";
        return String(role).toLowerCase() === "collator";
    } catch (err) {
        return false;
    }
}

function getAccumulatedHiddenMs() {
    try {
        var accumulated = parseInt(sessionStorage.getItem(ACCUMULATED_HIDDEN_KEY) || "0", 10) || 0;
        if (document.hidden) {
            var hiddenAt = sessionStorage.getItem(HIDDEN_AT_KEY);
            if (hiddenAt) {
                accumulated += Math.max(0, Date.now() - parseInt(hiddenAt, 10));
            }
        }
        return Math.max(0, accumulated);
    } catch (err) {
        return 0;
    }
}

function startLandingDwellTracking() {
    try {
        if (landingDwellEnterTs == null) {
            landingDwellEnterTs = Date.now();
        }
    } catch (err) {
        console.warn(err.message);
    }
}

function getLandingVisibleMs() {
    try {
        if (landingDwellEnterTs == null) {
            return 0;
        }
        return Math.max(0, Date.now() - landingDwellEnterTs - getAccumulatedHiddenMs());
    } catch (err) {
        return 0;
    }
}

function getLandingAnalyticsEndpoint(client) {
    try {
        var key = String(client || "").toLowerCase();
        var endpoints = LANDING_ANALYTICS_ENDPOINTS || {};
        return endpoints[key] || endpoints.default || "";
    } catch (err) {
        return "";
    }
}

function buildLandingDwellPayload(eventName) {
    var resData = pendingCommitResData || RES_DATA || SHARED_KEY || {};
    return {
        event: eventName,
        visibleMs: getLandingVisibleMs(),
        hiddenMs: getAccumulatedHiddenMs(),
        docid: resData.docid || DOC_ID || "",
        session_id: String(NEW_SESSION_ID || ""),
        identifier: resData.identifier || "",
        client: resData.client || "",
        role: resData.rolename || "",
        username: (USER_INFO && USER_INFO.MAIL_ID) || "",
        landingUrl: window.location.href,
        enterTs: landingDwellEnterTs,
        sentAt: Date.now()
    };
}

function persistLandingDwellUserPreference(payload) {
    try {
        if (typeof GET_JSON !== "function" || typeof API_UPDATE_INSERT === "undefined") {
            return;
        }
        var json_data = GET_JSON("default") || {};
        Object.assign(json_data, {
            tbl: "UserPreference",
            action: payload.event === "abandon" ? "Close" : "Continue",
            remark: "Landing Dwell",
            info: JSON.stringify({
                visibleMs: payload.visibleMs,
                hiddenMs: payload.hiddenMs,
                acknowledged: payload.acknowledged,
                event: payload.event
            }),
            recordtype: "landing_dwell",
            durationMs: payload.visibleMs
        });
        commonfn.callajax(json_data, "landing_dwell_record", API_UPDATE_INSERT);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("persistLandingDwellUserPreference", err.message);
    }
}

function postLandingDwellToPubkit(payload) {
    try {
        var endpoint = getLandingAnalyticsEndpoint(payload.client);
        if (!endpoint) {
            return;
        }
        var body = JSON.stringify(payload);
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function" && payload.event === "abandon") {
            var blob = new Blob([body], {
                type: "application/json"
            });
            navigator.sendBeacon(endpoint, blob);
            return;
        }
        if (typeof fetch === "function") {
            fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: body,
                keepalive: true,
                mode: "cors"
            }).catch(function(err) {
                console.warn("landing analytics pubkit post failed", err && err.message);
            });
            return;
        }
        commonfn.callajaxwithoutjsontype(payload, "landing_dwell_pubkit", endpoint);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("postLandingDwellToPubkit", err.message);
    }
}

function sendLandingDwellEvent(eventName) {
    try {
        if (!LANDING_DWELL_EVENTS_ENABLED) {
            return;
        }
        if (landingDwellEventSent || landingDwellEnterTs == null) {
            return;
        }
        landingDwellEventSent = true;
        var payload = buildLandingDwellPayload(eventName);
        // persistLandingDwellUserPreference(payload);
        // postLandingDwellToPubkit(payload);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("sendLandingDwellEvent", err.message);
    }
}

function bindLandingAbandonTracking() {
    try {
        if (!LANDING_DWELL_EVENTS_ENABLED) {
            return;
        }
        var onLeave = function() {
            if (!landingDwellEventSent && landingDwellEnterTs != null) {
                sendLandingDwellEvent("abandon");
            }
        };
        window.addEventListener("pagehide", onLeave);
        window.addEventListener("beforeunload", onLeave);
    } catch (err) {
        console.warn(err.message);
    }
}

function hideValidateAgreeButton() {
    try {
        if (VALIDATE_BTN) {
            VALIDATE_BTN.classList.add("d-none", "ds-none");
        }
    } catch (err) {
        console.warn(err.message);
    }
}

function showLandingReadyControls(resData, forceOpen) {
    try {
        if (landingAuthCompleted || window.landingAuthCompleted) {
            return;
        }
        // startLandingDwellTracking();
        showValidateButton(resData, forceOpen);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("showLandingReadyControls", err.message);
    }
}

function needsLandingAuth(resData, response) {
    try {
        var multiUser = shouldValidateMultiUser(resData);
        var isTokenOtpEnabled = canUseTokenOtpFlow(resData);
        if (multiUser) {
            return true;
        }
        if (isTokenOtpEnabled) {
            if (resData.temporaryAccess && canUserAccessFreely(resData, response || pendingAuthResponse || {
                    r: resData.r
                })) {
                return false;
            }
            return true;
        }
        return false;
    } catch (err) {
        return false;
    }
}

async function runDeferredLandingAuth(resData) {
    try {
        var response = pendingAuthResponse || {
            r: resData && resData.r
        };
        var isTokenOtpEnabled = canUseTokenOtpFlow(resData);
        var multiUser = shouldValidateMultiUser(resData);

        window.LANDING_AUTO_PROCEED_AFTER_AUTH = !isCollatorRole(resData);

        if (multiUser) {
            if (VALIDATE_BTN) {
                VALIDATE_BTN.classList.add("d-none");
            }
            var mailId = await validateUserEmail(resData);
            var reCheck = document.getElementById("eMailValidate");
            if (mailId) {
                USER_INFO.MAIL_ID = mailId;
                applySelectedUserEmail(resData, mailId);
                closeExistingSession(mailId);
                redirect_url = buildEditorRedirectUrl(resData);
                if (!isTokenOtpEnabled) {
                    pendingValidateAfterDocView = true;
                    updateDocViewHistory(resData);
                    return "pending_docview";
                }
                updateDocViewHistory(resData);
            } else {
                if (reCheck) {
                    reCheck.classList.remove("ds-none");
                }
                if (VALIDATE_BTN) {
                    VALIDATE_BTN.classList.add("d-none");
                }
                return "email_cancelled";
            }
        }

        if (isTokenOtpEnabled) {
            if (resData.temporaryAccess && canUserAccessFreely(resData, response)) {
                landingAuthCompleted = true;
                return "ready";
            }
            await handleTokenOtpAuthentication(resData);
            return "otp_started";
        }

        landingAuthCompleted = true;
        return "ready";
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("runDeferredLandingAuth", err.message);
        return "error";
    }
}

function getLandingDtd(resData) {
    try {
        return String((resData && resData.dtd) || (SHARED_KEY && SHARED_KEY.dtd) || DOC_DTD || "").toUpperCase();
    } catch (err) {
        return "";
    }
}

function isBitsDtd(resData) {
    return getLandingDtd(resData) === "BITS";
}

function isJatsDtd(resData) {
    return getLandingDtd(resData) === "JATS";
}

function shouldRunLandingAuthOnTheFly(resData) {
    return LANDING_AUTH_TRIGGER_MODE === "on_the_fly";
}

function getLandingAuthReadyElapsedMs() {
    try {
        if (landingAuthReadyAt == null) {
            return 0;
        }
        return Math.max(0, Date.now() - landingAuthReadyAt);
    } catch (err) {
        return 0;
    }
}

function recordLandingAuthAction(reason) {
    try {
        if (landingAuthActionRecorded) {
            return;
        }
        landingAuthActionRecorded = true;
        var resData = pendingCommitResData || RES_DATA || SHARED_KEY || {};
        var payload = {
            reason: reason,
            landingAuthReadyAt: landingAuthReadyAt,
            elapsedMs: getLandingAuthReadyElapsedMs(),
            docid: resData.docid || DOC_ID || "",
            dtd: getLandingDtd(resData),
            client: resData.client || "",
            role: resData.rolename || resData.role || ""
        };
        console.info("[LandingAuthTiming]", payload);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("recordLandingAuthAction", err.message);
    }
}

function getUrlParamValue(paramName) {
    try {
        var params = getUrlParameters(false);
        if (params && Object.prototype.hasOwnProperty.call(params, paramName)) {
            return params[paramName] || "";
        }
    } catch (err) {}
    return "";
}

function parseUrlParameters() {
    var params = {};
    try {
        var rawQuery = window.location.search ? window.location.search.substring(1) : "";
        if (!rawQuery) return params;

        var pairs = rawQuery.split('&');
        for (var i = 0; i < pairs.length; i++) {
            if (!pairs[i]) continue;
            var kv = pairs[i].split('=');
            var rawKey = kv[0] || "";
            if (!rawKey) continue;

            var rawVal = kv.length > 1 ? kv.slice(1).join('=') : "";
            var key = decodeURIComponent(rawKey.replace(/\+/g, " "));
            var value = decodeURIComponent(rawVal.replace(/\+/g, " "));
            params[key] = value;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('parseUrlParameters', err.message);
    }
    return params;
}

function getUrlParameters(useCache) {
    try {
        var shouldUseCache = useCache !== false;
        if (shouldUseCache && URL_PARAMETER && Object.keys(URL_PARAMETER).length > 0) {
            return URL_PARAMETER;
        }

        URL_PARAMETER = parseUrlParameters();
        return URL_PARAMETER;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getUrlParameters', err.message);
        return URL_PARAMETER || {};
    }
}

function getCurrentLandingKey() {
    return (URL_PARAMETER && URL_PARAMETER.key) ? URL_PARAMETER.key : getUrlParamValue("key");
}

function setOpenPagesSignal(docId) {
    try {
        localStorage.openpages = JSON.stringify({
            docid: docId || "",
            key: getCurrentLandingKey() || "",
            tabId: STORAGE_LANDING_TAB_ID,
            ts: OPEN_TIME
        });
    } catch (err) {}
}

function shortKey(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        // force 32-bit int
        hash |= 0;
    }
    // "rk_" prefix to avoid collisions
    return "rk_" + Math.abs(hash);
}

function clearStalePageAvailableFlag(docId) {
    if (!docId) return;
    try {
        localStorage.removeItem('page_available_' + docId);
        localStorage.removeItem('page_available');
    } catch (err) {}
}



window.addEventListener('storage', function(e) {
    try {
        var parsedValue = null;
        if (typeof e.newValue === "string" && e.newValue !== "") {
            try {
                parsedValue = JSON.parse(e.newValue);
            } catch (jsonErr) {
                parsedValue = null;
            }
        }

        if (e.key == "openpages") {
            OPEN_TIME = Date.now();
            var reqDocId = parsedValue && parsedValue.docid ? parsedValue.docid : "";
            var reqKey = parsedValue && parsedValue.key ? parsedValue.key : "";
            var reqTabId = parsedValue && parsedValue.tabId ? parsedValue.tabId : "";
            var currentKey = getCurrentLandingKey();

            var isAnotherTab = reqTabId && reqTabId !== STORAGE_LANDING_TAB_ID;
            var isSameDoc = reqDocId && DOC_ID && reqDocId === DOC_ID;
            var isSameKey = reqKey && currentKey && reqKey === currentKey;

            if (isAnotherTab && (isSameDoc || isSameKey)) {
                localStorage.page_available = JSON.stringify({
                    docid: DOC_ID || "",
                    key: currentKey || "",
                    requestTabId: reqTabId,
                    responderTabId: STORAGE_LANDING_TAB_ID,
                    ts: OPEN_TIME
                });
            }
        }
        let temp_key = null;
        if (e.url.indexOf('validateurl') > -1) {
            temp_key = e.url.split('=')[1];
        } else {
            var oPage_IS_TRACK = ((e.url.match(/TrackView/)) ? (true) : (false));
            var oPage_IS_EDITOR = ((e.url.match(/(editor[0-9])/)) ? (true) : (false));
            if (oPage_IS_EDITOR) {
                if (e.url.split('?')[1].indexOf('docid') > -1) {
                    oPage_DOCID = e.url.split('=')[1];
                }
            }
        }
        if (e.key == "page_available") {
            var IsSameLink = false;
            if (DOC_ID == "") CHECK_OPAGE = true;

            if (parsedValue && parsedValue.requestTabId) {
                var currentKeyForReply = getCurrentLandingKey();
                var isTargetedToThisTab = parsedValue.requestTabId === STORAGE_LANDING_TAB_ID;
                var isFromAnotherTab = parsedValue.responderTabId && parsedValue.responderTabId !== STORAGE_LANDING_TAB_ID;
                var isSameKeyReply = parsedValue.key && currentKeyForReply && parsedValue.key === currentKeyForReply;
                var isSameDocReply = parsedValue.docid && DOC_ID && parsedValue.docid === DOC_ID;

                IsSameLink = isTargetedToThisTab && isFromAnotherTab && (isSameKeyReply || isSameDocReply);

                if (parsedValue.docid) {
                    oPage_DOCID = parsedValue.docid;
                }
                // &&OPEN_TIME==e.newValue
            } else if ((temp_key && temp_key == URL_PARAMETER.key) || (oPage_DOCID && oPage_DOCID == DOC_ID)) {
                IsSameLink = true;
            }

            if (IsSameLink) {
                console.warn('One more page already open');

                setTimeout(function() {
                    Invalid_Alertfn('Land_Page_Link_Opened');
                }, 1000);
            }
            // Only set the per-doc flag when a matching reply is confirmed.
            // Do not clear it on unrelated storage keys (that raced waitForExistingPageSignal).
            // Do not overwrite a prior "true" with false from a non-matching page_available.
            var flagDocId = oPage_DOCID || DOC_ID;
            if (flagDocId && IsSameLink) {
                localStorage['page_available_' + flagDocId] = true;
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('addEventListener-storage', err.message);
    }

}, false);




document.addEventListener('DOMContentLoaded', async function(event) {
    try {
        console.log("Ready function");
        if (!window.browserInfo) {
            fireEvent_browser_validation();
        }
        // Wait briefly if browserInfo hasn't initialized yet
        let retries = 5;
        while (!window.browserInfo && retries-- > 0) {
            // wait 100ms
            await new Promise(r => setTimeout(r, 100));
        }

        if (!window.browserInfo.isCompatible) {
            setTimeout(() => {
                console.log("lp--11");
                if (typeof isSweetAlertVisible == "function" && isSweetAlertVisible()) {
                    console.log('SweetAlert is showing');
                } else {
                    console.log('No SweetAlert visible');
                    Invalid_Alertfn('Land_Page_NOT_SUPPORT_BROW', {});
                }
            }, 2500);
            window.scrollTo(0, document.body.scrollHeight);
            return;
        }
        console.log("lp--22");

        if (!['undefined', 'defined'].includes(typeof AlertNewDialog)) AlertNewDialog.init();
        if (window.MAINTENANCE) {
            MAINTENANCE.Init({
                init: true,
                fire: true
            });
        }
        VALIDATE_BTN = document.getElementById('ValidateBtnOpt');
        bindLandingAbandonTracking();
        URL_PARAMETER = getUrlParameters(false);
        if (!URL_PARAMETER.key) {
            console.log("key missing.");
            Invalid_Alertfn(null, {
                url: URL_PARAMETER.key
            });
            return false;
        } else if (URL_PARAMETER.alert) {
            if (URL_PARAMETER.alert == "idle_session_sign_off") {
                AlertNewDialog.fire('Land_Page_SESSION_OUT');
            }
        }


        var jsondata = {
            "key": String(URL_PARAMETER.key)
        };
        var endPoint = API_URL_VALIDITY;
        var PostFun = 'validateuserpost';

        commonfn.callajaxwithoutjsontype(jsondata, PostFun, endPoint);
        document.querySelectorAll(`[title="Guided Tour"],[title="Video Tutorial"]`).forEach(elm => {
            elm.onclick = function(e) {
                let target = e.currentTarget;
                if (target)
                    user_click_record(/guide/gi.test(target.getAttribute("title")) ? "guided_tour" : "video_tour");
            };
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('addEventListener-DOMContentLoaded', err.message);

        try {
            var urlKey = shortKey(window.location.href);
            var limit = 3;
            var count = parseInt(localStorage.getItem(urlKey), 10) || 0;

            if (count < limit) {
                localStorage.setItem(urlKey, count + 1);
                window.location.reload();
            } else {
                console.warn("Reload limit reached for:", window.location.href);
                setTimeout(() => localStorage.removeItem(urlKey), 60 * 1000);
            }
        } catch (storageErr) {
            console.error("Reload safeguard failed:", storageErr.message);
        }
    }
});
commonfn.callajaxwithoutjsontype = function(jsondata, postfun, url, opt = '') {

    jsondata = JSON.stringify(jsondata);
    console.log("000==> common fn before calling ajax" + jsondata);
    $.ajax({
        url: url,
        data: {
            'jsondata': jsondata
        },
        type: "post",
        dataType: "json",
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        beforeSend: function(request) {
            request.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded;charset=UTF-8');
            request.setRequestHeader("appkey", APP_KEY);
            request.setRequestHeader("apikey", API_KEY);
        },
        success: function(response) {
            if (commonfn[postfun]) {
                commonfn[postfun](response, opt);
            } else if (opt && (opt[postfun] || (opt['M_FUN'] && opt['M_FUN'][postfun]))) {
                if (opt[postfun]) {
                    opt[postfun](response, opt);
                } else {
                    opt['M_FUN'][postfun](response, opt);
                }
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log(textStatus, errorThrown);
            if (['validateuserpost'].includes(postfun)) {
                //? Tomcat closed 19_MAY_2023 - DR
                //window.location.href = DOMAIN_ROOT + "servermaintenance.html?" + window.location.href;
                //? OUP_J_ LP_002 Fixed DR_04_08_2023
                Invalid_Alertfn(null, {
                    url: URL_PARAMETER.key
                });
                return false;
            } else {
                // ? 20_MAY_2023 - YA
                if (postfun === 'docviewpost') {
                    commonfn.docviewpost({
                        r: 0
                    }, opt);
                    return false;
                }
                Invalid_Alertfn(null, {
                    url: URL_PARAMETER.key
                });
            }
        }
    });
};
commonfn.callajax = function(jsondata, postfun, url, opt = '') {
    try {
        const collabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);
        try {
            if (SHARED_KEY && SHARED_KEY.role && USER_INFO.MAIL_ID) {
                if (!jsondata.username) jsondata.username = USER_INFO.MAIL_ID;
                if (!jsondata.role) jsondata.role = SHARED_KEY.role;
                if (!jsondata.rolename) jsondata.rolename = SHARED_KEY.rolename;
                if (jsondata.tbl == "linksharing") {
                    delete jsondata['_w'];
                    delete jsondata['_r'];

                    if (collabEnabled) jsondata.collaborative = "1";

                    if (SHARED_KEY.corole) {
                        if (jsondata.rolename && jsondata.rolename.indexOf("Co-") !== 0) {
                            jsondata.rolename = "Co-" + jsondata.rolename;
                        }
                    }
                }

            }
        } catch (err) {}
        jsondata = JSON.stringify(jsondata);
        $.ajax({
            url: url,
            data: {
                'jsondata': jsondata
            },
            type: "post",
            dataType: "JSON",
            contentType: "application/json",
            beforeSend: function(request) {
                request.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded;charset=UTF-8');
                request.setRequestHeader("appkey", APP_KEY);
                request.setRequestHeader("apikey", API_KEY);
            },
            success: function(response) {
                if (commonfn[postfun]) {
                    commonfn[postfun](response, opt);
                } else if (opt && (opt[postfun] || (opt['M_FUN'] && opt['M_FUN'][postfun]))) {
                    if (opt[postfun]) {
                        opt[postfun](response, opt);
                    } else {
                        opt['M_FUN'][postfun](response, opt);
                    }
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log("error calling: " + postfun);
                console.log(textStatus, errorThrown);
                if (['validateuserpost'].includes(postfun)) {
                    Invalid_Alertfn(null, {
                        url: URL_PARAMETER.key
                    });
                    return false;
                }
            }
        });
    } catch (err) {
        console.warn(err.message);
    }
};
commonfn.validateuserpost = async function(response) {
    try {
        console.log(JSON.stringify(response));

        const resData = response.data;
        if (resData.r == 0 || response.r == 0) {
            window.location.reload();
            return;
        }

        if (response.r) resData['r'] = response.r;
        if (response.enable) {
            resData['enable'] = response.enable;
        }

        if (resData.rolename !== "Collator") clearDocScopedLocalData(resData.docid);
        clearStalePageAvailableFlag(resData.docid);


        initializeGlobalVariables(resData);

        updateUserInfo(resData);
        updateUIWithDocumentInfo(resData);
        handleCoverImage(resData);


        // Give a short window for existing tabs to answer the openpages signal.
        var alreadyOpenInSameBrowser = await waitForExistingPageSignal(resData.docid, 800);
        if (alreadyOpenInSameBrowser) {
            Invalid_Alertfn('Land_Page_Link_Opened');
            return;
        }

        const linkStatus = resData.status;
        const isActive = isLinkActive(linkStatus);
        const isExpired = Boolean(resData.fdel);

        if (!handleLinkStatus(linkStatus, isExpired, resData)) {
            return;
        }

        if (!isActive || isExpired) {
            return false;
        }
        await processUserValidation(resData, response);

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('validateuserpost', err.message);
    }
};
commonfn.landing_dwell_record = function(response) {
    try {
        if (IS_LOCAL_HOST) {
            console.log('landing_dwell_record', response);
        }
    } catch (err) {
        console.warn(err.message);
    }
};
commonfn.docviewpost = function(response, args) {
    try {
        if (response && response.r == 1) {
            redirect_url = buildEditorRedirectUrl({
                docid: args && args[1],
                math: args && args[0]
            });
        } else if (!redirect_url) {
            redirect_url = buildEditorRedirectUrl({
                docid: args && args[1],
                math: args && args[0]
            });
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('docviewpost', err.message);
    } finally {
        completePendingValidateAfterDocView(args);
    }
};
commonfn.coverCheckPoint = function(response, opt) {
    try {
        console.log(JSON.stringify(response));
        if (response.r == 1) {
            if (typeof IMPACT.USER_ENV_INFO.isSafari != "undefined" && IMPACT.USER_ENV_INFO.isSafari) {
                console.log(this);
            }

            if (RES_DATA && RES_DATA.titleinfo && RES_DATA.titleinfo.cover) {
                let cover = GET_COVER_IMG_URL(RES_DATA.titleinfo.cover);
                let image = document.createElement('img');
                image.setAttribute('id', 'image000');
                image.setAttribute('class', 'card-img-left shadow');
                image.setAttribute('alt', 'cover');
                if (typeof IMPACT.USER_ENV_INFO.isSafari != "undefined" && IMPACT.USER_ENV_INFO.isSafari) {
                    console.log('COVER---> ' + cover);
                    console.log('coverDiv---> ' + coverDiv);
                }
                image.setAttribute('src', cover);
            }


            let coverDiv = document.querySelector('.cover_div');
            if (coverDiv) {
                coverDiv.classList.remove('d-none', 'ds-none');
                coverDiv.appendChild(image);
            }
            if (!INACTIVE_LINK_STATUSES.includes(RES_DATA.status)) {
                VALIDATE_BTN.classList.remove('d-none', 'ds-none');
            }
        } else {
            if ((!INACTIVE_LINK_STATUSES.includes(RES_DATA.status))) {
                VALIDATE_BTN.classList.remove('d-none', 'ds-none');
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('coverCheckPoint', err.message);
    }
};

commonfn.autoCloseMethod = function(response) {
    try {
        console.log('autoCloseMethod==>');
        console.log(JSON.stringify(response));
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('autoCloseMethod', err.message);
    }
};
commonfn.opensharedpost = function(response) {
    try {
        console.log("File Now Ready to Open");
        if (response.r == 0) {
            console.log(JSON.stringify(response));
        }
        let direct = sessionStorage.getItem('redirect');
        if (direct && direct.indexOf('validateurl') !== -1) {
            window.location.href = direct;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('opensharedpost', err.message);
    }
};

function isSweetAlertVisible() {
    /* 
    swal2-container swal2-center swal2-backdrop-show
        swal2-popup swal2-modal swal2-icon-error swal2-show 
    

    */
    // Check for the original SweetAlert overlay and modal
    const sweetOverlay = document.querySelector('.swal-overlay,.swal2-container');
    const sweetAlert = document.querySelector('.swal-overlay--show-modal, .swal2-show');
    // Check if both elements exist and are visible
    if (sweetOverlay && sweetAlert) {
        const overlayStyle = window.getComputedStyle(sweetOverlay);
        const alertStyle = window.getComputedStyle(sweetAlert);

        return overlayStyle.display !== 'none' &&
            overlayStyle.opacity !== '0' &&
            alertStyle.display !== 'none' &&
            alertStyle.opacity !== '0';
    }

    return false;
}

// Example usage with polling
function checkAlertStatus() {
    if (isSweetAlertVisible()) {
        console.log('SweetAlert is showing');
        // Your code for when alert is visible
        return true;
    } else {
        console.log('No SweetAlert visible');
        // Your code for when alert is not visible
        return false;
    }
}


function buildEditorRedirectUrl(source) {
    try {
        const data = source || SHARED_KEY || RES_DATA || {};
        const docid = String(data.docid || DOC_ID || '').trim();
        if (!docid) {
            return "";
        }
        const local_domain = (IS_LOCAL_HOST && DOMAIN_ROOT && !DOMAIN_ROOT.includes('dist')) ?
            '' :
            String(DOMAIN_ROOT || '');
        return local_domain + PAGE_ReDIRECT[0] + docid;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('buildEditorRedirectUrl', err.message);
        return "";
    }
}

function completePendingValidateAfterDocView(args) {
    try {
        if (!pendingValidateAfterDocView) {
            return;
        }
        pendingValidateAfterDocView = false;
        if (!redirect_url) {
            redirect_url = buildEditorRedirectUrl({
                docid: args && args[1],
                math: args && args[0]
            });
        }
        landingAuthCompleted = true;
        redirect();
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('completePendingValidateAfterDocView', err.message);
    }
}

function buildLandingSessionContext() {
    return {
        docId: DOC_ID,
        sessionId: NEW_SESSION_ID,
        requestId: Request_ID,
        resData: pendingCommitResData || RES_DATA || SHARED_KEY,
        rolename: SHARED_KEY && SHARED_KEY.rolename,
        username: USER_INFO && USER_INFO.MAIL_ID,
        redirectUrl: redirect_url,
        landingUrl: window.location.href,
        onResetHidden: resetAccumulatedHiddenTime,
        onCommitStorage: function(resData) {
            if (resData) {
                saveLocalStorageData(resData);
            }
        },
        onRedirect: async function(ctx) {
            if (!redirect_url) {
                redirect_url = buildEditorRedirectUrl();
            }
            const skipVerify = !!(ctx && (ctx.skipVerify || (ctx.grantOptions && (ctx.grantOptions.skipVerify || ctx.grantOptions.canforceClose))));
            return setItemsandReDirect(DOC_ID, NEW_SESSION_ID, window.location.href, redirect_url, {
                redirect: true,
                skipVerify: skipVerify
            });
        },
        onTryAgain: function(alertKey) {
            Invalid_Alertfn(alertKey || 'Land_Page_TRY_AGAIN');
        },
        onAccessDeniedWithRemarks: function(message) {
            AlertNewDialog.fire('Land_Page_Access_Denied', {
                find: '%1%',
                replace: message,
                hide: true,
                force: true
            });
        },
        onRequestError: function() {
            Invalid_Alertfn('Land_Page_TRY_AGAIN_1');
        },
        ui: {
            sendPrompt: function(response, ctx) {
                if (window.LinkSessionSendModule) {
                    return window.LinkSessionSendModule.prompt(response, ctx);
                }
                if (typeof ctx.onRequestError === 'function') {
                    return ctx.onRequestError(response, ctx);
                }
                return Promise.resolve();
            },
            showPollWaiting: function(ctx) {
                if (window.LinkSessionSendModule) {
                    return window.LinkSessionSendModule.showPollWaiting(ctx);
                }
                if (typeof ctx.onRequestError === 'function') {
                    return ctx.onRequestError(null, ctx);
                }
                return Promise.resolve();
            }
        }
    };
}

// Run deferred auth on Agree/Continue when email validation or OTP is still required.
function redirect() {
    try {

        var resData = pendingCommitResData || RES_DATA || SHARED_KEY;
        const hasNeedsAuth = needsLandingAuth(resData, pendingAuthResponse);
        if (resData && !(landingAuthCompleted || window.landingAuthCompleted) && hasNeedsAuth) {
            recordLandingAuthAction("accept_continue_click");
            runDeferredLandingAuth(resData).then(function(authResult) {
                if (authResult === "ready") {
                    landingAuthCompleted = true;
                    redirect();
                    return;
                }
                if (authResult === "email_cancelled" || authResult === "error") {
                    showLandingReadyControls(resData, true);
                }
            }).catch(function(err) {
                console.warn(err.message);
                ErrorLogTrace('redirect', err.message);
            });
            return;
        }

        sendLandingDwellEvent("continue");
        landingAuthCompleted = true;

        if (!redirect_url) {
            redirect_url = buildEditorRedirectUrl();
        }
        const service = window.LinkSessionModule && LinkSessionModule.getInstance();
        if (!service) {
            console.warn('LinkSessionModule not available, falling back to legacy check');
            var jsondata = {
                "tbl": "linksharing",
                "docid": DOC_ID,
                "session_id": NEW_SESSION_ID.toString(),
                "session_start_time": new Date().getTime().toString(),
                "process": "check",
                "remarks": "landing-page"
            };
            var sendParams = Object.assign({}, jsondata, ADD_DEFAULT_KEYS("defaults", {}, [], ['session_id']));
            sendParams["session_id"] = NEW_SESSION_ID.toString();
            commonfn.callajax(sendParams, 'checkaccess', API_LINK_SHARE);
            return;
        }

        const context = buildLandingSessionContext();
        service.accessFromLanding(context).catch(function(err) {
            console.warn(err.message);
            ErrorLogTrace('redirect', err.message);
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('redirect', err.message);
    }
}

function GetUrlParameter() {
    try {
        URL_PARAMETER = getUrlParameters(false);
        return true;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('GetUrlParameter', err.message);
    }
}

async function setItemsandReDirect(DOC_ID, NEW_SESSION_ID, url, re_direct, Options) {
    try {
        Options = !Options ? ({
            redirect: false
        }) : Options;
        clearXmleditorStorage(DOC_ID);

        var STORAGE_SESSION_ID_KEY = (typeof getSessionIdKey === "function") ?
            getSessionIdKey(DOC_ID) :
            `xmleditor:sessionid:${DOC_ID}`;
        var sessionIdStr = String(NEW_SESSION_ID == null ? '' : NEW_SESSION_ID);

        if (url.indexOf("idle_session_sign_off") > -1) {
            url = url.replace("&alert=idle_session_sign_off", "");
        }
        // Dual-guard step 1: write local/session (+ mirror backup) before getdocs verify
        if (typeof setSessionState === "function") {
            setSessionState("docid", DOC_ID, {
                mirror: true,
                docid: DOC_ID
            });
            setSessionState(STORAGE_SESSION_ID_KEY, sessionIdStr, {
                mirror: true,
                docid: DOC_ID
            });
            setSessionState("redirect", url, {
                mirror: true,
                docid: DOC_ID
            });
        } else {
            sessionStorage.setItem("docid", DOC_ID);
            sessionStorage.setItem(STORAGE_SESSION_ID_KEY, sessionIdStr);
            sessionStorage.setItem("redirect", url);
        }
        if (window.MAINTENANCE && MAINTENANCE.ON) {
            sessionStorage.setItem("MAINTENANCE_START", MAINTENANCE.START);
        }
        if (Options.redirect) {
            // Dual-guard step 2: re-verify client session_id is an active row before navigate
            if (!Options.skipVerify) {
                var confirmFn = typeof confirmLinkSessionOnServer === "function" ?
                    confirmLinkSessionOnServer :
                    null;
                if (!confirmFn) {
                    var Cls = window.LinkSessionModule || window.LinkSessionService;
                    var mod = Cls && typeof Cls.getInstance === "function" ? Cls.getInstance() : null;
                    if (mod && typeof mod.confirmSessionOnServer === "function") {
                        confirmFn = function(expected) {
                            return mod.confirmSessionOnServer(expected);
                        };
                    }
                }
                if (confirmFn) {
                    const verify = await confirmFn({
                        docId: DOC_ID,
                        sessionId: sessionIdStr,
                        source: 'landing',
                        retryTransient: true
                    });
                    try {
                        const logData = {
                            stage: 'landing_verify',
                            ok: !!(verify && verify.ok),
                            reason: verify && verify.reason,
                            docid: DOC_ID,
                            session_id: sessionIdStr
                        };
                        console.info('[LinkSessionGate]', logData);
                    } catch (logErr) {
                        if (typeof ErrorLogTrace === "function") {

                        }
                    }
                    if (!verify.ok) {
                        console.warn('[LandingPage] dual-guard verify failed', verify.reason, verify);

                        var verifyReason = verify && verify.reason ? String(verify.reason) : '';
                        var retryOk = false;
                        if (verifyReason === 'no_active_row' || verifyReason === 'record_mismatch') {
                            var retryCls = window.LinkSessionModule || window.LinkSessionService || window.LinkSessionCore;
                            var retrySvc = retryCls && typeof retryCls.getInstance === 'function' ?
                                retryCls.getInstance() :
                                null;
                            if (retrySvc && typeof retrySvc.retryLandingSessionCheck === 'function') {


                                try {
                                    console.info('[LinkSessionGate]', {
                                        stage: 'landing_retry_start',
                                        reason: verifyReason,
                                        docid: DOC_ID,
                                        session_id: sessionIdStr
                                    });
                                } catch (logStartErr) {}


                                var retryResult = await retrySvc.retryLandingSessionCheck({
                                    docId: DOC_ID,
                                    sessionId: sessionIdStr
                                });
                                if (retryResult && retryResult.ok) {
                                    sessionIdStr = String(retryResult.sessionId || sessionIdStr).trim();
                                    if (typeof setSessionState === 'function') {
                                        setSessionState(STORAGE_SESSION_ID_KEY, sessionIdStr, {
                                            mirror: true,
                                            docid: DOC_ID
                                        });
                                    } else {
                                        sessionStorage.setItem(STORAGE_SESSION_ID_KEY, sessionIdStr);
                                    }
                                    retryOk = true;
                                } else {
                                    verify = retryResult || verify;
                                }
                            }
                        }
                        if (!retryOk) {
                            if (typeof cleanupSessionStorageBackups === 'function') {
                                cleanupSessionStorageBackups(DOC_ID, 'single');
                            }
                            if (typeof clearEditorTabId === 'function') {
                                clearEditorTabId(DOC_ID);
                            }
                            if (typeof Invalid_Alertfn === 'function') {
                                Invalid_Alertfn('Land_Page_TRY_AGAIN');
                            }
                            return false;
                        }
                    }
                }
            }
            window.location.href = re_direct;
            console.log('redirect');
        }
        return true;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('setItemsandReDirect', err.message);
        return false;
    }
}
const ValidateUserSession = function(eMail) {
    try {
        let reCheck = document.getElementById('eMailValidate');
        if (eMail) {
            USER_INFO.MAIL_ID = eMail;
            // localStorage.setItem("xmleditor:username", eMail);
            VALIDATE_BTN.click();
        } else {
            reCheck.classList.remove('ds-none');
            VALIDATE_BTN.classList.add('d-none');
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('ValidateUserSession', err.message);
    }
};




/**
 * Updates alert message for LWW client AHA journals on sign-off
 * @param {string} alertKey - The alert message key
 * 
 * LWW Client AHA Journal List - Used for sign-off alert customization
 * ? 3463161: Finalization Timestamp display in Read-only link
 */

function updateLWWAHASignOffMessage(alertKey) {
    try {
        if (alertKey !== "Land_Page_SIGN_OFF") return;
        if (!SHARED_KEY) return;

        const titleinfo = SHARED_KEY.titleinfo || {};
        const lwwAhaJournals = window.LWW_AHA_JOURNALS || {};

        // Prefer shorttitle; fallback to titleinfo.cover
        const shortTitle = SHARED_KEY.shorttitle || titleinfo.cover;
        if (!shortTitle || !lwwAhaJournals[shortTitle]) return;

        const alertObj = ALERT_MESSAGE[alertKey];
        if (!alertObj || !alertObj.text) return;

        const appendText = "<br><br><b>Approved On:</b><br><br>{{sign_off_human_time}} (your local time)";
        if (alertObj.text.indexOf("{{sign_off_human_time}}") > -1) return;

        // Keep existing sentence intact and only append the timestamp block once.
        ALERT_MESSAGE[alertKey].text = alertObj.text + appendText;
    } catch (err) {
        console.warn('Error updating LWW AHA sign-off message:', err.message);
    }
}

function Invalid_Alertfn(alertKey, Options = {}) {
    try {
        iGetElmById('ValidateBtnOpt', {
            addClass: 'ds-none'
        });
        if (typeof AlertNewDialog === 'undefined') {
            setTimeout(function(Key, Opt) {
                Invalid_Alertfn(Key, Opt);
            }, 750, alertKey, Options);
            return;
        }

        alertKey = (alertKey == null ? 'Land_Page_INVALID' : alertKey);

        // Apply LWW AHA journal-specific customizations
        if (SHARED_KEY) {
            var client = SHARED_KEY.client;
            // Fallback to "OUP" if client is undefined/null
            const clientKey = client ? client.toUpperCase() : "OUP";
            const IsLww = clientKey === "LWW";
            const isAuthorRole = SHARED_KEY.rolename && SHARED_KEY.rolename.toLowerCase() === "author";
            if (IsLww && isAuthorRole && alertKey === "Land_Page_SIGN_OFF") {
                updateLWWAHASignOffMessage(alertKey);
            }
        }

        AlertNewDialog.fire(alertKey).then((result) => {
            if (result.isConfirmed) {
                if (Options.confirm == 'confirm_redirect') {
                    window.location = Options.redirect;
                } else {
                    console.log(Options);
                }
            }
        });
        if (alertKey.match(/INVALID/) != null || alertKey == null) {
            // ErrorLogTrace('InvalidKey', Options.url ? Options.url : DOMAIN_URL);
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Invalid_Alertfn', err.message);
    }
}

function CloseToOpen_Dev() {
    try {
        let tempjson = {
            "tbl": "Shareandinvite",
            "find": {
                "id": SHARED_KEY['_id']
            },
            "update": {
                "status": "active"
            }
        };
        commonfn.callajax(tempjson, 'opensharedpost', API_FIND_UPDATE_INSERT);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('CloseToOpen_Dev', err.message);
    }

}


function GuidedTourLanding() {
    const swalWithBootstrapButtons = Swal.mixin({
        customClass: {
            //confirmButton: 'btn-success-auto',
            cancelButton: 'btn btn-danger'
        },
        buttonsStyling: false
    });
    swalWithBootstrapButtons.fire({
        html: "The guided tour assists in familiarizing users with key features of the proofing system, enhancing navigation. Upon clicking the 'Agree and Continue' button located at the bottom of this page, you will gain access to the editor page for proofing and editing tasks. For first-time users, the system automatically guides the essential IMPACT features. You can activate this guidance by using the 'Guided Tour' button found at the top right corner of the editor page.",
        imageUrl: "assets/images/svg/landing/LandGT.png",
        width: '41em',
        imageWidth: 497,
        imageHeight: 155,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: "Close",
        imageAlt: "guidedtour"
    });
}


function isLinkActive(linkStatus) {
    return linkStatus && linkStatus == "active";
}

/**
 * Checks if a user has free access based on the API response
 * Handles multiple temporaryAccess formats and access conditions
 * 
 * @param {Object} response - The API response object
 * @returns {Boolean} - Returns true if user has free access, false otherwise
 */
function canUserAccessFreely(resData, response) {
    // Case 1: Standard access without security (r=1)
    if (response.r === 1) {
        // return true;
    }


    // Case 2: Check for temporary access
    if (resData.hasOwnProperty('temporaryAccess') && resData.temporaryAccess) {
        const {
            $numberLong
        } = resData.temporaryAccess;
        const currentTime = new Date();

        // Try parsing as JSON format first
        try {
            let accessData;

            // Check if it's already a JSON object or a JSON string
            if (typeof $numberLong === 'string') {
                // Handle string format
                if ($numberLong.startsWith('{')) {
                    // Try to parse as JSON string
                    accessData = JSON.parse($numberLong);
                } else {
                    // Handle legacy format (direct timestamp string)
                    const accessTime = new Date(parseInt($numberLong));
                    const hoursDifference = (currentTime - accessTime) / (1000 * 60 * 60);
                    return hoursDifference < 4;
                }
            } else {
                // Already an object
                accessData = resData.temporaryAccess;
            }

            // Process the JSON access data
            // Case 2.1: If expiry exists and has value, validate against current time
            if (accessData.hasOwnProperty('expiry') && accessData.expiry) {
                const expiryTime = new Date(parseInt(accessData.expiry.$numberLong));
                return currentTime < expiryTime;
            }
            // Case 2.2: If no expiry or empty expiry, check 4-hour window from create_at
            else if (accessData.hasOwnProperty('create_at') && accessData.create_at) {
                const createTime = new Date(parseInt(accessData.create_at.$numberLong));
                const hoursDifference = (currentTime - createTime) / (1000 * 60 * 60);
                return hoursDifference < 4;
            }
            // Case 2.3: No valid timestamp found in JSON
            return false;

        } catch (error) {
            // If parsing failed, try to handle as a direct timestamp string
            try {
                const accessTime = new Date(parseInt($numberLong));
                // Verify we got a valid date
                if (!isNaN(accessTime.getTime())) {
                    const hoursDifference = (currentTime - accessTime) / (1000 * 60 * 60);
                    return hoursDifference < 4;
                }
            } catch (e) {
                // Invalid date format, no access
                return false;
            }
        }
    }

    // Case 3: No free access for other response codes (r=2,3,4) or invalid temporaryAccess
    // User needs to complete security requirements
    return false;
}


async function processUserValidation(resData, response) {

    // ? 3362545: PLOS - Multiple Author Email Address in Access Code Authentication

    try {
        const {
            r,
            m
        } = response;

        if (r === 0 || r === 4) {
            return Invalid_Alertfn(
                r === 4 ? 'SECURITY_INVALID_IP' : 'Land_Page_Access_Denied',
                r === 4 ? {} : {
                    find: "%1%",
                    replace: m
                }
            );
        }

        pendingCommitResData = resData;
        pendingAuthResponse = response;
        landingAuthCompleted = false;
        landingAuthReadyAt = Date.now();
        landingAuthActionRecorded = false;

        var isMultiUser = shouldValidateMultiUser(resData);
        if (!isMultiUser) {
            updateDocViewHistory(resData);
        }

        var forceOpen = !!(resData.temporaryAccess && canUserAccessFreely(resData, response));
        var isOtpRequired = canUseTokenOtpFlow(resData) && !forceOpen;
        if (shouldRunLandingAuthOnTheFly(resData) && (isMultiUser || isOtpRequired)) {
            recordLandingAuthAction(isMultiUser ? "email_verification_auto" : "otp_access_auto");
            var authResult = await runDeferredLandingAuth(resData);
            if (authResult === "ready") {
                redirect();
                return;
            }
            if (authResult === "email_cancelled" || authResult === "error") {
                showLandingReadyControls(resData, true);
            }
            return;
        }

        showLandingReadyControls(resData, forceOpen || resData.r == 1);

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('processUserValidation', err.message);
    }
}

function applySelectedUserEmail(resData, mailId) {
    try {
        if (!resData || !mailId) return resData;

        if (Array.isArray(resData.emailto) && resData.emailto.length > 1 && !resData.emailto_all) {
            resData.emailto_all = resData.emailto.slice();
        }

        resData.emailto = [mailId];
        resData.emailtolist = mailId;
        resData.username = mailId;

        RES_DATA = SHARED_KEY = resData;

        if (resData.docid) {
            localStorage.setItem(`xmleditor:username:${resData.docid}`, mailId);
            setSharedDataWithQuotaFallback(resData.docid, resData);
        }

        return resData;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('applySelectedUserEmail', err.message);
        return resData;
    }
}

function canUseTokenOtpFlow(resData) {
    const isTokenOtpEnabled = String((resData && resData.enable) || "").toLowerCase() === "tokenotp";
    const pageHref = String(window.location && window.location.href ? window.location.href : "").toLowerCase();
    const isPLOSUrl = pageHref.includes("plos");
    return isTokenOtpEnabled && isPLOSUrl;
}

async function handleTokenOtpAuthentication(resData) {
    try {
        const AuthFlowClass = window.AuthenticationFlow || (typeof AuthenticationFlow !== "undefined" ? AuthenticationFlow : null);
        if (typeof AuthFlowClass !== "function") {
            console.warn('AuthenticationFlow is not available; skipping token OTP initialization.');
            ErrorLogTrace('handleTokenOtpAuthentication', 'AuthenticationFlow is not defined');
            return false;
        }

        window.authFlow = new AuthFlowClass(resData, {});
        const landingForm = document.getElementById('formLanding');
        authFlow.initializeAuthentication(landingForm).then(result => {
            if (result) {
                console.log('Authentication process initiated');
            } else {
                console.log('Authentication failed or OTP flow initiated');
            }
            if (IS_LOCAL_HOST) {
                // setTimeout(() => {}, 2500);
            }
        }).catch(error => {
            console.error('Authentication error:', error.message);
            return false;
        });
    } catch (error) {
        console.error('Error in token OTP authentication:', error);
        ErrorLogTrace('handleTokenOtpAuthentication', error.message);
    }

}



function initializeGlobalVariables(resData) {
    RES_DATA = SHARED_KEY = resData;
    DOC_ID = resData.docid;
    DOC_DTD = resData.dtd;
    USER_INFO.MAIL_ID = resData.emailto || URL_PARAMETER.username;
    if (Array.isArray(resData.emailto)) {
        if (resData.emailto.length == 1) {
            USER_INFO.MAIL_ID = resData.emailto[0];
        } else {}
    }
    setOpenPagesSignal(DOC_ID);
}

function isLandPageLinkOpened(docId) {
    if (!docId) return false;
    var hasPageAvailableFlag = localStorage['page_available_' + docId] === "true";
    return hasPageAvailableFlag || (docId === oPage_DOCID && CHECK_OPAGE);
}

function waitForExistingPageSignal(docId, timeoutMs) {
    if (!docId) return Promise.resolve(false);
    localStorage.removeItem('page_available_' + docId);
    return new Promise(function(resolve) {
        var maxWait = timeoutMs || 700;
        var startedAt = Date.now();
        var checker = setInterval(function() {
            var found = isLandPageLinkOpened(docId);
            if (found || (Date.now() - startedAt) >= maxWait) {
                clearInterval(checker);
                resolve(found);
            }
        }, 80);
    });
}

function shouldValidateMultiUser(resData, isActive) {
    isActive = resData.status == "active";
    return Array.isArray(resData.emailto) && resData.emailto.length > 1 && isActive;
}

async function validateUserEmail(resData) {
    try {
        resetAccumulatedHiddenTime();
        if (window.Swal && typeof Swal.fire === "function") {
            const result = await Swal.fire({
                title: 'Validate user',
                input: 'email',
                inputPlaceholder: 'Enter your email address',
                showCancelButton: true,
                allowOutsideClick: false,
                inputValidator: (value) => validateEmailInput(value, resData.emailto)
            });

            if (result.isDismissed || !result.value) {
                // User cancelled or entered nothing
                return null;
            }

            const userEmail = result.value;
            return userEmail;
        }

        console.warn('SweetAlert2 is not available; using browser prompt for email validation.');
        var promptValue = window.prompt('Enter your email address');
        if (!promptValue) {
            return null;
        }
        var validationMessage = await validateEmailInput(promptValue, resData.emailto);
        if (validationMessage) {
            window.alert(validationMessage);
            return null;
        }
        return promptValue;

    } catch (error) {
        console.error('Error in email validation:', error);
        return false;
    }
}


function validateEmailInput(value, emailto) {
    return new Promise((resolve) => {
        if (!value || !value.trim()) {
            // alert message
            resolve('Email address is required.');
            return;
        }

        const lowercaseValue = value.toLowerCase();

        // Handle both array and single string cases, converting emailto to lowercase too
        const isValidEmail = Array.isArray(emailto) ?
            emailto.map(email => email.toLowerCase()).includes(lowercaseValue) :
            emailto.toLowerCase() === lowercaseValue;

        if (isValidEmail) {
            // valid → no error
            resolve();
        } else {
            resolve('The provided email is not valid or has not been configured in the system.');
        }
    });
}



function updateUserInfo(resData) {
    if (!resData.emailto) {
        resData.emailto = USER_INFO.MAIL_ID;
    }
}

function updateUIWithDocumentInfo(resData) {
    try {
        if (resData.apikey || resData.docid) {
            const titleInfo = resData.titleinfo;
            const tempAuthor = titleInfo.authorgroup && titleInfo.authorgroup !== "null" ? titleInfo.authorgroup : '';
            const {
                articletitle,
                journaltitle
            } = resData.xmltohtmlres || {};
            const showDocTitle = {
                JATS: "Journal Title",
                BITS: "Book Title"
            };
            const showDocType = {
                JATS: "Article Title",
                BITS: "Chapter Title"
            };
            const doctitle = titleInfo.doctitle || articletitle || "";
            const projecttitle = resData.projecttitle || "";
            $('#title1').html(projecttitle);

            $('#authorname').html(tempAuthor);
            $('#doi').html(titleInfo.identifier);
            $('#vmaintitle').html(showDocTitle[DOC_DTD]);

            if (resData.dtd == "JATS") {
                $('#headerlabel').html(showDocType[DOC_DTD]);
                $('#title2').html(doctitle);
            } else {
                if (doctitle && doctitle.trim() !== "" && doctitle.trim() !== projecttitle.trim()) {
                    $('#headerlabel').html(showDocType[DOC_DTD]);
                    $('#title2').html(doctitle);
                } else {
                    $('#headerlabel,#title2').addClass("ds-none");
                }
            }

            updateDynamicElements(resData, titleInfo);
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('updateUIWithDocumentInfo', err.message);
    }
}

function updateDynamicElements(resData, titleInfo) {
    try {
        const helpDeskObj = GET_SENDER_RECEIVER_ID('HELP_DESK', resData.client);
        const {
            MAIL,
            TEXT
        } = helpDeskObj;
        var finalSendMail = MAIL;
        if (MAIL != TEXT) {
            finalSendMail = TEXT;
        }
        const dynamicObject = {
            "support_mail_id": {
                href: `mailto:${finalSendMail}?subject=${titleInfo.identifier}&body=Hi IMPACT,`
            },
            "video_tour": {
                href: `videotour.html?client=${resData.client}&role=${resData.role}&docid=${resData.docid}`
            },
            "UKUS": {
                text: {
                    "UK (LWW)": "optimise",
                    "US (LWW)": "optimize"
                }
            }
        };

        for (const [key, value] of Object.entries(dynamicObject)) {
            const element = document.getElementById(key);
            if (element && value.href) {
                element.setAttribute('href', value.href);
            } else if (element && value.text && resData.division) {
                element.textContent = value.text[resData.division] || value.text[resData.division.match(/UK/) ? "UK (LWW)" : "US (LWW)"];
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('updateDynamicElements', err.message);
    }
}

function handleCoverImage(resData) {
    try {
        const titleInfo = resData.titleinfo;
        if (titleInfo.cover) {
            const xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        updateCoverImage(titleInfo, resData);
                    } else if (this.status == 404) {
                        showLandingReadyControls(resData);
                    }
                }
            };
            xhttp.open('GET', GET_COVER_IMG_URL(titleInfo.cover, resData.client), true);
            xhttp.send();
        } else if (resData.dtd) {
            showLandingReadyControls(resData);
        }

    } catch (err) {
        console.warn(err.message);
        // ErrorLogTrace('handleCoverImage', err.message);
    }
}

function updateCoverImage(titleInfo, resData) {
    try {
        const coverDiv = document.querySelector(".cover_div");
        if (!coverDiv) return;

        const coverUrl = GET_COVER_IMG_URL(titleInfo.cover, resData.client);

        const image = Object.assign(document.createElement("img"), {
            id: "image000",
            className: "card-img-left shadow",
            alt: "cover",
            src: coverUrl
        });

        coverDiv.classList.remove("ds-none");
        coverDiv.appendChild(image);

        showLandingReadyControls(resData);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("updateCoverImage", err.message);
    }
}

function showValidateButton(resData, forceOpen = false) {
    try {
        // startLandingDwellTracking();
        if (!INACTIVE_LINK_STATUSES.includes(resData.status) && (!localStorage['page_available_' + DOC_ID] || localStorage['page_available_' + DOC_ID] !== "true")) {
            if (resData.r == 1 || forceOpen) {
                if (VALIDATE_BTN) {
                    VALIDATE_BTN.classList.remove('d-none', 'ds-none');
                }
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('showValidateButton', err.message);
    }
}

function handleLinkStatus(linkStatus, isExpired, resData) {
    try {
        if (linkStatus && INACTIVE_LINK_STATUSES.includes(linkStatus)) {
            VALIDATE_BTN.classList.add('d-none');
            let redirectUrl = '';
            let _IsSignOff = false;

            if (linkStatus === INACTIVE_LINK_STATUSES[0]) {
                _IsSignOff = true;
                if (RES_DATA.docid && RES_DATA.dtd) {
                    redirectUrl = DOMAIN_ROOT + PAGE_ReDIRECT[1] + RES_DATA.docid;
                }
            } else if (linkStatus === INACTIVE_LINK_STATUSES[1]) {
                redirectUrl = DOMAIN_ROOT + "index.html";
            }

            let status = "SIGN_OFF";
            if (_IsSignOff && isExpired) {
                status = "FILE_DELETED";
            } else if (!_IsSignOff) {
                status = "EXPIRED";
            }
            const caseType = `Land_Page_${status}`;
            Invalid_Alertfn(caseType, {
                confirm: (_IsSignOff && !isExpired) ? "confirm_redirect" : false,
                redirect: redirectUrl
            });

            // Setting localdata - TrackView not open 30_SEP_2024
            saveLocalStorageData(resData);
            setItemsandReDirect(DOC_ID, NEW_SESSION_ID, window.location.href, redirectUrl, {
                redirect: false
            });
            return false;
        } else {
            closeExistingSession();
            return true;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('handleLinkStatus', err.message);
    }
}

function closeExistingSession(email = null) {
    try {
        const isCollabEnabled = SHARED_KEY.collaborative == "yes" || typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);
        if (isCollabEnabled) {
            // stop here, don't call ajax
            return;
        }
        const jsonData = {
            tbl: "linksharing",
            docid: DOC_ID,
            find: {
                docid: DOC_ID,
                docstatus: "1"
            }
        };


        if (email) {
            // ensure find exists
            jsonData.find.username = email;
            jsonData.find.role = SHARED_KEY.role;

            jsonData.username = email;
            jsonData.role = SHARED_KEY.role;
        }
        commonfn.callajax(jsonData, "autoCloseCheckPoint", API_GET_DOCS);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('closeExistingSession', err.message);
    }
}

function shouldRetainXmleditorStorageKey(key, retainDocId) {
    const retainPatterns = ['apikey', 'appkey', 'login'];
    if (retainPatterns.some(pattern => key.toLowerCase().includes(pattern))) {
        return true;
    }
    const normalizedDocId = String(retainDocId || '').trim();
    if (!normalizedDocId) {
        return false;
    }
    const docSuffix = ':' + normalizedDocId;
    if (key.endsWith(docSuffix)) {
        return true;
    }
    if (key === 'xmleditor:shared:' + normalizedDocId) {
        return true;
    }
    if (key === 'xmleditor:sessionbackup:' + normalizedDocId) {
        return true;
    }
    return false;
}

function clearXmleditorStorage(retainDocId) {
    try {

        const keysToRemove = Object.keys(localStorage).filter(key => {
            if (!key.startsWith('xmleditor')) {
                return false;
            }

            return !shouldRetainXmleditorStorageKey(key, retainDocId);
        });
        keysToRemove.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("clearXmleditorStorage", err.message);
    }
}

function isQuotaExceededError(err) {
    if (!err) return false;
    return err.name === "QuotaExceededError" ||
        err.code === 22 ||
        err.code === 1014 ||
        /quota/i.test(err.message || "");
}

function clearOldXmleditorSharedStorage(currentDocId) {
    try {
        const keepKey = currentDocId ? `xmleditor:shared:${currentDocId}` : "";
        const keysToRemove = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (!key.startsWith("xmleditor:shared:")) continue;
            if (keepKey && key === keepKey) continue;
            keysToRemove.push(key);
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
        return keysToRemove.length;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("clearOldXmleditorSharedStorage", err.message);
        return 0;
    }
}


function buildCompactSharedData(resData) {
    const titleinfo = resData && resData.titleinfo && typeof resData.titleinfo === "object" ? {
        projectname: resData.titleinfo.projectname || "",
        cover: resData.titleinfo.cover || "",
        identifier: resData.titleinfo.identifier || "",
        authorgroup: resData.titleinfo.authorgroup || ""
    } : {};

    return {
        docid: resData && resData.docid ? resData.docid : "",
        dtd: resData && resData.dtd ? resData.dtd : "",
        apikey: resData && resData.apikey ? resData.apikey : "",
        client: resData && resData.client ? resData.client : "",
        role: resData && resData.role ? resData.role : "",
        rolename: resData && resData.rolename ? resData.rolename : "",
        emailto: resData && resData.emailto ? resData.emailto : "",
        sharedcolor: resData && resData.sharedcolor ? resData.sharedcolor : "",
        collaborative: resData && resData.collaborative ? resData.collaborative : "",
        status: resData && resData.status ? resData.status : "",
        fdel: resData && resData.fdel ? resData.fdel : "",
        shorttitle: resData && resData.shorttitle ? resData.shorttitle : "",
        projectname: resData && resData.projectname ? resData.projectname : "",
        titleinfo: titleinfo
    };
}

function setSharedDataWithQuotaFallback(docid, fullData) {
    const storageKey = `xmleditor:shared:${docid}`;
    const fullString = JSON.stringify(fullData);
    const compactString = JSON.stringify(buildCompactSharedData(fullData));

    try {
        localStorage.setItem(storageKey, fullString);
        sessionStorage.removeItem(storageKey);
        localStorage.removeItem(`${storageKey}:compact`);
        return {
            mode: "full",
            key: storageKey
        };
    } catch (err) {
        if (!isQuotaExceededError(err)) {
            throw err;
        }

        // Clear old offline cache and unused data on quota exceeded
        clearDocScopedLocalData(docid);

        try {
            localStorage.setItem(storageKey, fullString);
            sessionStorage.removeItem(storageKey);
            localStorage.removeItem(`${storageKey}:compact`);
            return {
                mode: "full-after-cleanup",
                key: storageKey
            };
        } catch (retryErr) {
            if (!isQuotaExceededError(retryErr)) {
                throw retryErr;
            }

            try {
                localStorage.setItem(storageKey, compactString);
                localStorage.setItem(`${storageKey}:compact`, "true");
            } catch (compactErr) {
                if (isQuotaExceededError(compactErr)) {
                    sessionStorage.setItem(storageKey, fullString);
                    localStorage.removeItem(storageKey);
                    localStorage.setItem(`${storageKey}:source`, "session");
                    return {
                        mode: "session-fallback",
                        key: storageKey
                    };
                }
                throw compactErr;
            }

            sessionStorage.setItem(storageKey, fullString);
            localStorage.setItem(`${storageKey}:source`, "compact");
            return {
                mode: "compact",
                key: storageKey
            };
        }
    }
}

function saveLocalStorageData(resData) {
    try {
        const {
            docid,
            apikey,
            emailto,
            role,
            sharedcolor,
            collaborative,
            status
        } = resData || {};

        if (!(apikey || (docid && emailto))) {
            console.log("API key missing.");
            Invalid_Alertfn(null, {
                url: apikey
            });
            return;
        }

        // Proactively clear old cache data to prevent quota exceeded errors
        clearDocScopedLocalData(docid);

        // Save common keys
        localStorage.setItem("xmleditor:appkey", "xmleditor");
        localStorage.setItem("xmleditor:apikey", apikey);
        setSharedDataWithQuotaFallback(docid, resData);

        // Determine email and collab state
        const allowedClient = typeof window.hasCollabClient === "function" && window.hasCollabClient(resData && resData.client);
        const isCollab = allowedClient && typeof collaborative === "string" && collaborative.toLowerCase() === "yes";
        const originalEmailList = Array.isArray(resData.emailto_all) ? resData.emailto_all : emailto;
        const emailId = (Array.isArray(emailto) && emailto.length > 1) ? USER_INFO.MAIL_ID : emailto;

        // Compute user color (index as color when collab is active)
        const isActive = isLinkActive(status);
        let finalUserColor = 0;
        if (isActive) {
            if (isCollab && Array.isArray(originalEmailList)) {
                const index = originalEmailList.indexOf(emailId);
                // fallback if not found
                finalUserColor = index >= 0 ? index + 1 : 55;
            } else {
                finalUserColor = sharedcolor || 99;
            }
        }
        // ? Map remaining values in one pass
        const mappings = {
            username: emailId,
            userRole: role || DEFAULT_ROLE,
            usercolor: finalUserColor,
            collabEnabled: isCollab ? "true" : "false"
        };

        if (resData && resData._id) {
            mappings.userid = resData._id;
        }
        for (const [key, value] of Object.entries(mappings)) {
            localStorage.setItem(`xmleditor:${key}:${docid}`, value);
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("saveLocalStorageData", err.message);
    }
}

function updateDocViewHistory(resData) {
    const jsondata = ADD_DEFAULT_KEYS("default");
    jsondata['tbl'] = 'docviewhistory';
    jsondata['session_id'] = NEW_SESSION_ID.toString();
    commonfn.callajaxwithoutjsontype(jsondata, 'docviewpost', API_UPDATE_INSERT, [resData.math, resData.docid, resData.editor]);
}