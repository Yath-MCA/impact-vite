var SHARE_USER_IDs = ['yasar.mohideen', 'durairajan.gnanam', 'divya.krishnamurthy', 'karthickeyan.a', 'karthickeyanarumugham'];
var IgnoreRepeatedErrors = {"OneTime": ["WORK_FLOW", "editor_initialize_events"]};
var ErrorShareSubject = new Map();
var hostname = window.location.hostname;
// 'validateurllww.html' or 'validateurloup.html'
var path = decodeURIComponent(window.location.pathname);
var WEB_PAGE = hostname + path;

const getVersion = function () {
    var scripts = document.getElementsByTagName("script");
    let temp = null;
    let IsBoolean = false;
    Array.from(scripts).forEach((url) => {
        if (url.src.indexOf('assets') < 0 || url.src.indexOf('editor') < 0) return;
        Array.from(url.src.split('/')).forEach((split, ind, arr) => {
            if (arr[ind - 1] == 'assets') {
                temp = iVersion = split;
                IsBoolean = false;
            }
        });
    });
    return temp;
};
String.prototype.replaceAllSplit = function (search, replacement) {
    var target = this;
    var loop = 0;
    while (target.indexOf(search)) {
        target = target.split(search).join(replacement);
        if (loop > 10) {
            break;
        } else loop++;
    }
    return target;
};
iVersion = `${{VERSION}}$`;
commonfn['ErrorShareMailPost'] = function(response) {
    debug.log(JSON.stringify(response));
};
commonfn['ErrorudpateDBpost'] = function (response) {
    debug.log(JSON.stringify(response));
};
commonfn['checkIsExistErrorLogResponce'] = function (response, MailInfo) {
    console.log(JSON.stringify(response));
    var IsCheck = false;
    if (response.data.length) {
        let data = response.data[response.data.length - 1];
        let time = parseInt(data.time_c.$numberLong ? (data.time_c.$numberLong) : data.time_c.numberLong);
        let DateDiff = (moment().diff(moment(time), 'days')) > 3;
        IsCheck = (moment().diff(moment(time), 'minutes')) > 10;
        debug.log(moment().diff(moment(time), 'minutes'));
        // ? Ignore repeated workflow error repeated doc_id and handle more 3 days
        IsCheck = IsCheck ? IgnoreRepeatedErrors.OneTime.includes(data.module) && data.docid == DOC_ID && !DateDiff ? false : true : false;
        if (/QUERY_SPAN|ORG_QUERY_SPAN|RESTORE_QUERY/gi.test(data.module) && IsCheck) {
            IsCheck = false;
        }
    } else IsCheck = true;
    if (IsCheck) SEND_MAIL(MailInfo);
};
const ErrorListLocal = function () {
    try {
        return 'xmleditor:' + DOC_ID + ':ErrorList';
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('ErrorListLocal', err.message);
    }
};


var interVal = 0;
window.ONE_LINE_ENV_INFO = "";

if (!window.IMPACT) {
    window.IMPACT = {
        USER_ENV_INFO: {}
    };
    interVal = setInterval(function () {
        if (typeof window.browserInfo !== "undefined") {
            var result = globalValues();
            if (result) clearInterval(interVal);
        }
    }, 1500);
}


function globalValues() {
    try {
        window.IMPACT.USER_ENV_INFO = browserInfo;
        var TempInfo = window.IMPACT.USER_ENV_INFO;
        var browserVersion = TempInfo.browser + ' ' + TempInfo.version;
        var gadgetInfo = TempInfo.os + '_' + TempInfo.osVersion;

        window.ONE_LINE_ENV_INFO = gadgetInfo + "_" + browserVersion + "_" + TempInfo.screenSize;
        return true;
    } catch (err) {
        console.warn("Error in globalValues:", err);
        return false;
    }
}

var [Error_Count, IS_ALERT_LOCAL] = [0, false];
var stack = 'Impact Trace:';
window.OBJ_SEN_REC_ID = window.OBJ_SEN_REC_ID || {};
var CanSendLocalMail = false;

function ERROR_TEST() {
    try {
        console.log(jsondata);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('SEND_ERROR_MAIL', err.message);
    }
}
const ERROR_ON_ERROR_MAIL = function (trackOrder, stackTemp, ErrMessage) {
    try {
        var url = decodeURIComponent(window.location);
        var DATA_ROW = `<tr><td class="align-top">URL:</td><td class="">${url}</td></tr><tr><td class="align-top">Impact Trace Order</td><td class="" style="color: #1000ff";>${trackOrder?(trackOrder.replaceAllSplit('Impact Trace:', '')):''}</td></tr><tr><td class="align-top">Error Message</td><td class="" style="color: red";>${ErrMessage?ErrMessage:''}</td></tr><tr><td class="align-top">Stack Order</td><td class="" style="color: blueviolet;font-size:10pt;" >${stackTemp?stackTemp:''}</td></tr>`;
        return GET_MAIL_TABLE_FORMAT(DATA_ROW, "");
    } catch (err) {
        console.warn(err.message);
        // ErrorLogTrace('ERROR_ON_ERROR_MAIL', err.message);
        return `<tr><td class="align-top">URL:</td><td class="">${url}</td></tr>`;
    }
};
const GET_MAIL_TABLE_FORMAT = function(userData, errData) {
    var version = `${{VERSION}}$`;
    /* 
       <tr class="align-top"><td>Browser Details:</td><td class="ml-2">${browser_version?browser_version:'Nil'}</td></tr>
        <tr class="align-top"><td>Screen-size</td><td class="ml-1">${TempInfo&&TempInfo.screenResolution?TempInfo.screenResolution:'Nil'}</td></tr>
        <tr class="align-top"><td>Gadget:</td><td class="ml-1">${gadget_info?gadget_info:'Nil'}</td></tr>
    */
    try {
        let ENV_INFO = "";
        if (IS_UAT_DOMAIN) {
            ENV_INFO = `<tr class="align-top"><td>Browser Details:</td><td class="ml-2">${ONE_LINE_ENV_INFO?ONE_LINE_ENV_INFO:'Nil'}</td></tr>`;
        }
        return `<p>Dear Team,</p><p>Sorry for the trouble. The file automatically sent to the Newgen Technical team for investigating the error. They will get back to you soon.</p><table><tbody>${userData?userData:''}<tr><td class="align-top">Impact Version:</td><td class="" style="color: blue";>${version}</td></tr>${ENV_INFO}<tr><td class="align-top">Domain :</td><td class="" style="color: #800000";>${WEB_PAGE}</td></tr>${errData?errData:''}</tbody></table>`;
    } catch (err) {
        console.warn(err.message);
        return "";
    }
};

function ErrorShareMail(subject, trackOrder, errMessage, StackLines) {
    /* 
        !CanSendLocalMail ==> send mail from local boolean value
    
    */
    try {
        var [tempLocal, SHOW_ERROR] = [localStorage.getItem(ErrorListLocal()), [subject, trackOrder, "error"]];
        if (tempLocal != null) {
            ErrorShareSubject = new Map(JSON.parse(tempLocal));
        }
        if (!CanSendLocalMail && IS_LOCAL_HOST) {
            Error_Count++;
            if (Error_Count > 1) {
                if (!IS_TRACK_VIEW) {
                    //CAN_THROUGH_ALERT ? alert(SHOW_ERROR) : console.error(SHOW_ERROR);
                } else {
                    //CAN_THROUGH_ALERT ? alert(SHOW_ERROR) : console.error(SHOW_ERROR);
                }
                return false;
            }
            return;
        }
        var last_Err_Key = Array.from(ErrorShareSubject.keys())[ErrorShareSubject.size - 1],
            first_Err_Key = Array.from(ErrorShareSubject.keys())[0],
            last_Err_Time = ErrorShareSubject.get(last_Err_Key),
            Sub_Err_Time = moment(new Date().getTime()).diff(parseInt(ErrorShareSubject.get(subject)), 'minutes'),
            time_Diff = last_Err_Time != undefined ? moment(new Date().getTime()).diff(parseInt(last_Err_Time), 'minutes') : 0;
        if (last_Err_Key == subject && time_Diff < 5 || ErrorShareSubject.has(subject) && Sub_Err_Time < 5) {
            console.warn('Repeated error on the ' + subject);
            return false;
        } else if (last_Err_Key == subject && time_Diff > 5 || ErrorShareSubject.size == 0 || last_Err_Key != subject) {
            if (ErrorShareSubject.has(subject)) {
                ErrorShareSubject.delete(subject);
            }
            ErrorShareSubject.set(subject, new Date().getTime());
        }
        if (ErrorShareSubject.size > 5) {
            ErrorShareSubject.delete(first_Err_Key);
        }
        var err_fun = trackOrder != undefined ? trackOrder : null;
        var ErrorDB_Json = {
            "tbl": "ErrorLogs",
            "docid": DOC_ID,
            "module": subject,
            "iversion": `${{VERSION}}$`,
            "domain": hostname,
            // "browversion": browser_version,
            // "screensize": TempInfo.screenResolution,
            // "gadget": gadget_info,
            "function": err_fun,
            "errormsg": errMessage,
            "_r": ["5af956974b4bb40a34648f8e"],
            "_w": ["5af956974b4bb40a34648f8e"]
        };
        var IsValidate = (subject == 'Validate_URL') ? true : false;
        var getUserMail = function (IsValidate) {
            try {
                if (IsValidate) {
                    return (Array.isArray(SHARED_KEY.emailto) && SHARED_KEY.emailto.length == 1) ? SHARED_KEY.emailto[0] : SHARED_KEY.emailto;
                } else return USER_INFO.MAIL_ID;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('getUserMail', err.message);
            }
        };
        var mailBody = function () {
            try {
                IS_JOURNAL = IS_JOURNAL ? IS_JOURNAL : SHARED_KEY.dtd == 'JATS';
                //code goes here
                var eMail_Id = getUserMail(IsValidate);
                var errData = '',
                    userData = `<tr><td class="align-top">DOC ID:</td><td class="">${DOC_ID}</td></tr><tr><td class="align-top">User Id:</td><td class="">${eMail_Id}</td></tr><tr><td class="align-top" style="width: 15%;">Project Name:</td><td class="">${(IsValidate?((SHARED_KEY.projectname?SHARED_KEY.projectname:null)):SHARED_KEY.projectname?SHARED_KEY.projectname:null)}</td></tr><tr><td class="align-top" style="width: 15%;">Client Type:</td><td class="">${(IsValidate||IS_JOURNAL?'Journal':'Book')}</td></tr>`;
                if (trackOrder || errMessage || StackLines) {
                    errData += (trackOrder) ? `<tr><td class="align-top">Impact Trace Order</td><td class="" style="color: #1000ff";>${trackOrder.replaceAllSplit('Impact Trace:', '')}</td></tr>` : '';
                    errData += (errMessage) ? `<tr><td class="align-top">Error Message</td><td class="" style="color: red";>${errMessage}</td></tr>` : '';
                    errData += (StackLines) ? `<tr><td class="align-top">Stack Order</td><td class="" style="color: blueviolet;font-size:10pt;" >${StackLines}</td></tr>` : '';
                }
                if (subject != 'Validate_URL') {
                    userData += `<tr><td class="align-top">User Role:</td><td class="">${USER_INFO.ROLE_NAME}</td></tr>`;
                }
                // ! 25_MAR_2023 YA - HANDLE COMMON KEYS GLOBAL METHOD
                if (typeof GET_JSON == "function") {
                    let tempObj = GET_JSON("default");
                    Object.assign(ErrorDB_Json, tempObj);
                }
                var StringBody = GET_MAIL_TABLE_FORMAT(userData, errData);
                return StringBody;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('mailBody', err.message);
            }
        };
        var MAIL_BODY = mailBody();
        //? send mail api end point
        if (!OBJ_SEN_REC_ID.from)
            OBJ_SEN_REC_ID = GET_SENDER_RECEIVER_ID('Error_Mail');
        var MailInfo = {
            "tbl": "emaildraft",
            "emailfrom": OBJ_SEN_REC_ID.from,
            "emailto": OBJ_SEN_REC_ID.to,
            'emailBCC': OBJ_SEN_REC_ID.bcc,
            "emailSubject": subject,
            "find": {
                "id": "610a4cd05e311ebaf978ef78"
            },
            "docid": DOC_ID,
            "emailMessage": MAIL_BODY
        };
        checkIsExistErrorLog(subject, errMessage, MailInfo);
        // ? Send data to db record endpoint
        commonfn.callajax(ErrorDB_Json, 'ErrorudpateDBpost', API_UPDATE_INSERT);
        localStorage.setItem(ErrorListLocal(), JSON.stringify(Array.from(ErrorShareSubject.entries())));
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('ErrorShareMail', err.message);
    }
}

function checkIsExistErrorLog(module, errormsg, MailInfo) {
    try {
        let jsondata = {
            "tbl": "ErrorLogs",
            "find": {
                "module": module,
                "docid": DOC_ID,
                "username": USER_INFO.MAIL_ID,
                "errormsg": errormsg
            },
            "length": 10,
            "sort": {},
            "filter": ["docid", "module", "username", "client", "projectname", "errormsg", 'function', 'iversion', 'domain']
        };
        if (/QUERY_SPAN|ORG_QUERY_SPAN/gi.test(module)) {
            delete jsondata.find.username;
        }
        console.log(jsondata);
        commonfn['callajax'](jsondata, 'checkIsExistErrorLogResponce', API_GET_DOCS, MailInfo);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('checkIsExistErrorLog', err.message);
    }
}

function SEND_MAIL(info) {
    try {
        if (CanSendLocalMail && IS_LOCAL_HOST || !IS_LOCAL_HOST) {
            commonfn.callajax(info, 'ErrorShareMailPost', API_GENERIC_SEND_MAIL);
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('SEND_ERROR_MAIL', err.message);
    }
}
var traceOrder = function (reset) {
    try {
        if (reset) stack = '';
        let f = traceOrder;
        let iter = 0;
        while (f) {
            // stack += '||' + (f.name!=''?f.name:'<anonymous>');
            if (iter > 10) {
                break;
            }
            let name = f.name;
            let isNull = (name == '') ? true : false;
            stack += (iter == 0 || iter == 1 && isNull) ? ('') : ((stack.trim().length > 14 ? ' || ' : ' ') + (isNull ? ' anonymous ' : name));
            f = f && f.caller ? f.caller : null;
            iter++;
        }
        return stack;
    } catch (err) {
        // console.warn(err.message);
        return stack;
    } finally {
        return stack;
    }
};

function checkRepeatedError(url) {
    try {
        // Get URL from search params if not provided
        url = url || decodeURIComponent(window.location.search.substring(1));
        const MINUTE_IN_MS = 5 * 60000;

        // Get current timestamp
        const currentTime = new Date().getTime();
        const storageKey = 'visitData_' + url;

        // Get stored data from localStorage
        const storedData = localStorage.getItem(storageKey);
        let visitData = storedData ? JSON.parse(storedData) : {
            count: 0,
            lastVisit: 0
        };

        // Calculate time difference
        const timeSinceLastVisit = currentTime - visitData.lastVisit;

        // If it's been more than a minute, reset count
        if (timeSinceLastVisit > MINUTE_IN_MS) {
            visitData.count = 1;
            visitData.lastVisit = currentTime;
            localStorage.setItem(storageKey, JSON.stringify(visitData));
            // Not repeated within 1 minute
            return false;
        }

        // If within one minute, increment count
        visitData.count += 1;
        visitData.lastVisit = currentTime;
        localStorage.setItem(storageKey, JSON.stringify(visitData));

        // Return true if count > 1 within one minute
        return visitData.count > 1;
    } catch (err) {
        return true;
    }
}
window.ErrorLogTrace = function (errModule, ErrMessage) {
    stack = '';
    if (arguments.length < 1) {
        //   throw new Error('Arguments errModule and anyVariable are expected');
        console.log('Arguments errModule and anyVariable are expected');
    }
    if (typeof errModule !== 'string') {
        //   throw new Error('The type of errModule is not match, please use string');
        console.log('The type of errModule is not match, please use string');
    }
    let oCallStackTrack = new Error();
    let traceTemp = traceOrder();
    let stackTemp = oCallStackTrack.stack.replace('Error', errModule + ' Stack:').replaceAllSplit('at ', '<br>at ').replaceAllSplit('<br><br>', '<br>');
    //console.log(errModule + ': ' + erring);
    console.log([traceTemp, stackTemp]);
    if (!OBJ_SEN_REC_ID.from)
        OBJ_SEN_REC_ID = GET_SENDER_RECEIVER_ID('Error_Mail');
    if (['checkIsExistErrorLog', 'SEND_ERROR_MAIL', 'ErrorShareMail', 'addTeamIdsMail', 'mailBody', 'ERROR_ON_ERROR_MAIL', 'GET_MAIL_TABLE_FORMAT'].includes(errModule) || SHARED_KEY == null) {
        var isRepeated = checkRepeatedError();
        if (isRepeated) return;
        var MAIL_BODY_1 = ERROR_ON_ERROR_MAIL(traceTemp, stackTemp, ErrMessage);
        var MailInfo = {
            "tbl": "emaildraft",
            "emailfrom": OBJ_SEN_REC_ID.from,
            "emailto": OBJ_SEN_REC_ID.to,
            "emailSubject": 'Error_Mail_ERROR'.concat("_", `${errModule?errModule: "Nil"}`),
            "find": {
                "id": "610a4cd05e311ebaf978ef78"
            },
            "docid": DOC_ID,
            "emailMessage": MAIL_BODY_1
        };
        commonfn.callajax(MailInfo, 'ErrorShareMailPost', API_GENERIC_SEND_MAIL);
    } else {
        ErrorShareMail(errModule, traceTemp, ErrMessage, stackTemp);
    }
    if (typeof IMPACT_SELECTION != "undefined" && typeof IMPACT_SELECTION._SNAPSHOT == "function" && GlobalEditor) {
        // ? 23-AUG-22 - IF Error through middle of any function unlock snap
        IMPACT_SELECTION._SNAPSHOT({
            unlock: true
        });
    }
};

function getStackTrace() {
    let f = arguments.callee;
    const ret = [];
    let item = {};
    let iter = 0;
    while (f = f.caller) {
        // Initialize
        item = {
            name: f.name || null,
            // Empty array = no arguments passed
            args: [],
            callback: f
        };
        // Function arguments
        if (f.arguments) {
            for (iter = 0; iter < f.arguments.length; iter++) {
                item.args[iter] = f.arguments[iter];
            }
        } else {
            // null = argument listing not supported
            item.args = null;
        }
        ret.push(item);
    }
    console.log(ret);
    return ret;
}