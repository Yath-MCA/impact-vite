console.log('editor-open.js');



commonMethods.get_user_info = function(el) {
    return {
        user: this.get_user_name(el),
        role: this.get_role_name(el),
        timestamp: this.get_time(el),
        changeTimestamp: this.get_time(el, true),
        sameUserRole: this.IS_SAME_USER_AND_ROLE(el)
    };
};

commonMethods.get_user_name = (el, options = {}) => {
    try {
        return (el && el.getAttribute('data-username') || el.getAttribute('data-user-name')) || "";
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('get_user_name', err.message);
        return "";
    }
};

commonMethods.get_role_name = (el, options = {}) => {
    try {
        if (!el) return false;
        var attrName = options.role_attr;
        return attrName ? el.getAttribute(attrName) : (el.getAttribute('data-rolename') || el.getAttribute('data-role')) || "";

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('get_role_name', err.message);
        return "";
    }
};

commonMethods.get_time = (el, changeTime = false) => {
    try {
        if (!el) return new Date().getTime();

        // If chnageTime == true → force-return data-last-change-time
        if (changeTime === true) {
            return el.getAttribute('data-last-change-time') || new Date().getTime();
        }

        // Normal flow
        return (
            el.getAttribute('data-time') ||
            el.getAttribute('data-last-change-time') ||
            el.getAttribute('data-timec') ||
            new Date().getTime()
        );

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('get_time', err.message);
        return new Date().getTime();
    }
};


commonMethods.IS_SAME_USER_AND_ROLE = (node, options = {}) => {
    try {

        if (!node) return false;

        // Normalize node input
        const normalizedNode = node.$ || node[0] || node;

        // Early return if node is invalid or not an element
        if (!normalizedNode || normalizedNode.nodeType !== 1) {
            return false;
        }

        // Get user and role info
        const roleName = commonMethods.get_role_name(normalizedNode, options);
        const userName = commonMethods.get_user_name(normalizedNode, options);

        // ? Extract role name without parentheses if present for track module valication
        const trimmedRole = roleName.includes('(') ? roleName.trim().slice(1, -1) : roleName;

        // Compare user and role
        //|| USER_INFO.ROLE_NAME === roleName
        return (USER_INFO.TRACK_ROLE_NAME === roleName || USER_INFO.TRACK_ROLE_NAME === trimmedRole) && USER_INFO.MAIL_ID === userName;

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('IS_SAME_USER_AND_ROLE', err.message);
    }
};
// Utility: format timestamp
function formatTime(ts = Date.now()) {
    const d = new Date(ts);
    return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
        // e.g. "26-Sep-2025 11:35:20 am"
    }).replace(",", "");
}

commonfn.timerCall = {};

commonfn.callajax = function(jsondata, postfun, url, opt = '') {
    try {

        const exceptionList = ['onlinecrossrefplaintext', 'anystylecrossrefplaintext'];
        const isException = exceptionList.some(ex => url.includes(ex));

        const hasUrl = typeof url !== "undefined";
        const isLocalHost = location && location.hostname === "localhost";
        const isNotLocalString = !url.includes("local");

        if (hasUrl && isLocalHost && isNotLocalString && !isException) {
            return console.warn("Local API call skipped:", url);
        }

        if (!jsondata.username) jsondata.username = USER_INFO.MAIL_ID;
        if (!jsondata.role) jsondata.role = USER_INFO.ROLE_ID;
        if (!jsondata.rolename) jsondata.rolename = USER_INFO.ROLE_NAME;

        const collabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);
        if (jsondata.tbl == "linksharing" && collabEnabled) {
            jsondata.collaborative = "1";
            // jsondata.process = "signoff";
        }

        jsondata = JSON.stringify(jsondata);

        // --- Start time ---
        const startTs = Date.now();
        const startTime = formatTime(startTs);

        commonfn.timerCall[postfun] = {
            url,
            startTs,
            startTime,
            endTime: null,
            durationSec: null
        };

        $.ajax({
            url: url,
            data: {
                'jsondata': jsondata
            },
            type: "post",
            dataType: "JSON",
            contentType: "application/json",
            success: function(response) {
                const endTs = Date.now();
                const endTime = formatTime(endTs);

                const durationSec = ((endTs - commonfn.timerCall[postfun]['startTs']) / 1000).toFixed(2);

                commonfn.timerCall[postfun].endTime = endTime;
                commonfn.timerCall[postfun].durationSec = durationSec;

                // debug.log(`${postfun} | Start: ${startTime} | End: ${endTime} | Duration: ${durationSec} s`);

                if (commonfn[postfun]) {
                    commonfn[postfun](response, opt);
                } else if (opt && (opt[postfun] || (opt['M_FUN'] && opt['M_FUN'][postfun]))) {
                    if (opt[postfun]) {
                        opt[postfun](response, opt);
                    } else {
                        opt['M_FUN'][postfun](response, opt);
                    }
                } else if (typeof ErrorLogTrace == 'function' && postfun != 'fun_return') {
                    //ErrorLogTrace(postfun, 'post_fun_missing');
                    console.log(postfun);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                const endTs = Date.now();
                const endTime = formatTime(endTs);
                const durationSec = ((endTs - commonfn.timerCall[postfun]['startTs']) / 1000).toFixed(2);

                commonfn.timerCall[postfun].endTime = endTime;
                commonfn.timerCall[postfun].durationSec = durationSec;

                // console.log(` ${postfun} | Start: ${startTime} | End: ${endTime} | Duration: ${durationSec} s`);
                console.log("Error calling:", postfun, textStatus, errorThrown);
            }
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('callajax', err.message);
    }
};

commonfn.getProjectData = function(responce, opt) {
    try {
        const RESULT = responce.data[0];
        console.log(JSON.stringify(responce.data));
        if (RESULT) {
            if (!opt) {
                const sharedDocId = RESULT.docid || SHARED_KEY && SHARED_KEY.docid;
                if (!sharedDocId) {
                    ref_logError('getProjectData', 'Missing docid in shared project response');
                    return;
                }
                var TEMP_KEY = "xmleditor:shared:" + sharedDocId;
                SHARED_KEY = responce.data[0];
                localStorage.setItem(TEMP_KEY, JSON.stringify(SHARED_KEY));
                if (SHARED_KEY.dtd && SHARED_KEY.status == "active") {
                    setDOC_INFO(SHARED_KEY);
                    //CONFIG_XML(SHARED_KEY);
                    if (typeof LOADING_CONFIG != "undefined" && LOADING_CONFIG.canLoadEditor !== true) {
                        LOADING_CONFIG.Init(SHARED_KEY);
                    }
                    if (typeof EDITOR_INITIALIZE != "undefined" && typeof EDITOR_INITIALIZE.START == "function") {
                        EDITOR_INITIALIZE.START(SHARED_KEY);
                    } else if (typeof EDITOR_INITIALIZE != "undefined" && typeof EDITOR_INITIALIZE.RUN_READY_TO_OPEN == "function") {
                        EDITOR_INITIALIZE.RUN_READY_TO_OPEN(SHARED_KEY);
                    } else {
                        console.warn('EditorInitialize module unavailable. Unable to open editor.');
                    }
                } else {
                    // ? 29_APR_25_YA
                    if (IS_LOCAL_HOST) {
                        commonfn.CURRENT_STATUS_POST({
                            data: []
                        }, true, 'getProjectData');
                    }
                }
            } else if (opt) {
                if (RESULT.projectname) {
                    DOC_INFO.set('PROJECTNAME', RESULT.projectname);
                    SHARED_KEY.projectname = RESULT.projectname;
                    if (typeof opt.fnname == "function") {
                        opt.fnname(opt.param);
                    }
                }
            }
        } else {
            if (IS_LOCAL_HOST) {}
        }
    } catch (err) {
        console.warn(err.message);
        //ErrorLogTrace('getprojectdata', err.message);
    }
};
commonfn.open_html_record = function(response) {
    try {
        console.log(JSON.stringify(response));
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('open_html_record', err.message);
    }
};
commonfn.openhtml = function(response, Options = {}) {
    try {
        var [filename, modified_time, bk_up_file] = [DOC_ID + "_updated.html", 0, true];
        if (response.data && response.data.length > 0) {
            let tempData = response.data[0];
            if (IS_TRACK_VIEW) {
                filename = tempData.backup_fileName;
            } else {
                //filename = tempData.subfolder + "_" + tempData.timestamp + ".html";
            }
            modified_time = tempData['time_c']['$numberLong'];
            $('#filesaving').attr('data-time', modified_time);
        } else {
            // ? if ready only mode open before any save
            bk_up_file = false;
        }
        // ! 08-AUG-2022 Update
        // ! 28-MAR-2024 https://stackoverflow.com/questions/6802463/prevent-jquery-load-from-cache
        var track_file = BUCKET_URL + `${DOC_ID}/backup/${USER_INFO.SELECTOR_BKUP_FOLDER}/${filename}`,
            live_file = BUCKET_URL + DOC_ID + "/" + filename + "?_=" + (new Date()).getTime(),
            open_file = ((IS_TRACK_VIEW && bk_up_file) ? track_file : live_file);
        console.log("Loading ckeditor:" + open_file);
        // ? 27_APR_2023 - YA
        if (IS_LIVE_DOMAIN && !IS_TRACK_VIEW) {
            var json_data = GET_JSON('default');
            Object.assign(json_data, {
                recordtype: "openhtml",
                filename: filename,
                tbl: "common",
                responsecount: response.data.length,
                response: JSON.stringify(response.data)
            });
            // ? enable after discussion - 09_MAY_23 - YA
            setTimeout((jsonData) => {
                commonfn['callajax'](jsonData, 'open_html_record', API_UPDATE_INSERT);
            }, 4500, json_data);
        }
        // ? Open html file based on editor page
        $('#maineditor').load(open_file, function(data, statusTxt, xhr) {
            if (statusTxt == "success") {
                if (data == undefined || data == null || data == 'undefined' || data == 'null' || data == '' || data.length < 50) {
                    data = '';
                }

                editor_initialize_events(data);
                if (typeof InitialLoadDialog != "undefined") InitialLoadDialog.updateProgress(4);
            } else if (statusTxt == "error") {
                if (IS_LOCAL_HOST) {

                } else {
                    [_CanClose, _IsDirty] = [true, false];
                    if (typeof TOASTER_ALERT == 'function') TOASTER_ALERT('fileMissing', {
                        type: 'warning'
                    });
                    let RE_DIRECT = (sessionStorage.getItem("redirect") || (DOMAIN_ROOT + (I_CONFIG && I_CONFIG.querySelector("redirect").getAttribute("default"))));
                    if (RE_DIRECT) {
                        setTimeout((iURL) => {
                            window.location.href = iURL;
                        }, 2500, RE_DIRECT);
                    }
                    return false;
                }
                console.log("Error: " + xhr.status + ": " + xhr.statusText);
            }
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('openhtml', err.message);
    }
};
commonfn.guideduserupdate = function(response) {
    try {
        console.log("===update_guided_tour_status====");
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('guideduserupdate', err.message);
    }
};
/**
 * Handle guided tour logic based on user response
 * @param {Object} response - API response object
 */
commonfn.getguideduser = async function(response) {
    try {
        var data = (response && response.data) ? response.data : [];
        var canShow = data.length === 0 || (data[0] && data[0].guided === 0);

        if (canShow) {
            debug.log("Fire Guide Tour");

            // Load GuidedTour module safely
            window.GuidedTour = await window.moduleSystem.getModule("GuidedTour");

            if (typeof window.GuidedTour !== "undefined" && typeof window.GuidedTour.start === "function") {
                const started = await window.GuidedTour.start();
                if (started === false) {
                    sessionStorage.setItem("xmleditor:showtour", "true");
                }
            } else {
                sessionStorage.setItem("xmleditor:showtour", "true");
            }

            // TODO: update record to DB here after firing tour
        } else {
            USER_INFO.TOUR = data.length;
            debug.log("Already guided tour fired");
        }
    } catch (err) {
        console.warn("getguideduser error:", err.message);
        ErrorLogTrace("getguideduser", err.message);
    }
};

commonfn.CLOSE_TO_OPEN = function(response) {
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
        ErrorLogTrace('CLOSE_TO_OPEN', err.message);
    }
};

function getWords(str) {
    try {
        return str.split(/\s+/).slice(0, 5).join(" ");
    } catch (err) {
        ErrorLogTrace('getWords', err.message);
        console.warn(err.message);
    }
}

function getTxt(node, method) {
    try {
        if (node == undefined || node.length == 0) {
            return "";
        }
        const trackValidation = function(el) {
            try {
                let eTag = el.tagName;
                let IsAction = el.hasAttribute('data-action');
                let IsReject = IsAction ? el.getAttribute('data-action') == "Rejected" : false;
                if ('DEL' == eTag) {
                    // ? delete node if rejected
                    if (!IsAction || (!IsReject)) {
                        $(el).remove();
                    }
                } else if ('INSERT' == eTag) {
                    $.each(el.childNodes, function(ind, elm) {
                        if (!elm) return;
                        if (elm.nodeType == 1 && ((elm.getAttribute('data-class')) == 'ckcommentsfull')) {
                            $(elm).remove();
                        }
                    });
                    // ? insert node if rejected
                    if (IsReject) $(el).remove();
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('trackValidation', err.message);
            }
        };
        var TempDiv = $(node).clone();
        var myRun;
        // ? Get node elements
        if ((TempDiv.length != undefined || TempDiv.length != null) && TempDiv.length > 0) {
            TempDiv = TempDiv[0];
        }
        // ? Ignore Deleted, format and comments nodes
        if (TempDiv.childElementCount > 0) {
            $($(TempDiv).children()).each(function(ind, elem) {
                if (elem.className != undefined || elem.className != null) {
                    if (elem.className.indexOf('format') != -1 || ['font', 'PageID', 'target'].includes(elem.className)) {
                        $(elem).remove();
                    } else if (elem.tagName == 'DEL' || (elem.tagName == 'INSERT' && elem.childNodes.length > 0)) {
                        trackValidation(elem);
                    } else if (['name', 'given-names', 'surname', 'string-name', 'xref'].includes(elem.className)) {
                        // ? for JATS 1.2
                        elem.querySelectorAll('.pistart[data-pistart]').forEach(element => {
                            let temp = element.getAttribute('data-pistart');
                            element.innerHTML = temp;
                        });
                    }
                    if (method != undefined && method == 'sharedinfo') {
                        if (elem.className.match(/aff|x|TrackChangesList|pop_up/)) {
                            $(elem).remove();
                        } else if (elem.className == 'contrib') {
                            $(elem).find('.sup, .xref').remove();
                            Array.from(elem.querySelectorAll('.pistart')).forEach((node) => {
                                node.textContent = node.getAttribute('data-pistart');
                            });
                        }
                    }
                }
            });
        }
        let remove_Selector = 'del:not([data-action="Rejected"]), insert[data-action="Rejected"], .font, .target, .PageID, .format, [data-class="ckcommentsfull"]';
        $(TempDiv).find(remove_Selector).remove();

        if (method) {
            // ? UPDATED FOR UPDATE MISSING ELEMENT - 21_FEB_2023-YA
            if (method.Get_innerHTML) {
                myRun = TempDiv.innerHTML;
            } else myRun = TempDiv.textContent.trim();
        } else myRun = TempDiv.textContent.trim();
        return myRun;
    } catch (err) {
        ErrorLogTrace('getTxt', err.message);
        console.warn(err.message);
    }
}

function SET_TITLES(SHARED_KEY, Options) {
    // ? Initilize set titles
    try {
        Options = !Options ? ({
            restore: false
        }) : Options;
        let doc_title = ((SHARED_KEY.titleinfo && SHARED_KEY.titleinfo.doctitle) ? (SHARED_KEY.titleinfo.doctitle) : (SHARED_KEY.doctitle ? SHARED_KEY.doctitle : ''));
        $('#r-title').html(SHARED_KEY.projecttitle);
        $('#rTitleGroup').attr('title', SHARED_KEY.projecttitle);
        if (!IS_JOURNAL) {
            $('#r-label').html('Book Title');
            $('#l-label').html('Chapter Title');
        }
        let [temp_title, TITLE, reTry, getFromEditor] = ['', (I_CONFIG ? I_CONFIG.querySelector('root').getAttribute("title") : null), false, false];
        if ((GlobalEditor && GlobalEditor.document && TITLE) || (Options.restore && TITLE)) {
            let temp = Options.restore ? ($(Options.Data).find(TITLE)[0]) : (GlobalEditor.document.find(TITLE).$[0]);
            temp_title = getTxt(temp);
            if (temp_title != doc_title && temp_title != "") {
                doc_title = temp_title;
                getFromEditor = reTry = false;
            }
        } else reTry = getFromEditor = true;
        if (doc_title != "") {
            // ? Matching editor's article title - SIVA/RJ - 04_11_24
            // if (typeof doc_title.toTitleCase == "function") doc_title = doc_title.toTitleCase();
            $('#l-title').html(IS_TRACK_VIEW ? SHARED_KEY.identifier : doc_title);
            $('#lTitleGroup').attr('title', doc_title);
            reTry = false;
        } else reTry = true;
        if (reTry || getFromEditor) {
            setTimeout(() => {
                SET_TITLES(SHARED_KEY, Options);
            }, 1000);
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('SET_TITLES', err.message);
    }
}

function classCase(Word) {
    try {
        var rg = /(^\w{1}|\s\w{1}|\.\w{1})/gi;
        Word = Word.replace(rg, function(toReplace) {
            return toReplace.toUpperCase();
        });
        return Word;
    } catch (err) {
        ErrorLogTrace('classCase', err.message);
        console.warn(err.message);
    }
}

function getsetUserUniqueId() {
    try {
        myuserUniqueId = localStorage.getItem("userUniqueId");
        if (!myuserUniqueId) {
            myuserUniqueId = guid();
            localStorage.setItem('userUniqueId', myuserUniqueId);
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getsetUserUniqueId', err.message);
    }
}

function CHECK_CURRENT_STATUS(from) {
    try {
        var params = GET_JSON('Shareandinvite', {
            status: true
        }, "signoff");
        var cb = 'CURRENT_STATUS_POST';

        commonfn.callajax(params, cb, API_GET_DOCS);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('CHECK_CURRENT_STATUS', err.message);
    }
}

function CloseToOpen_Dev() {
    // ? For Developers Purpose Only....
    console.log("running:::Status Changed to Open");
    let tempjson = GET_JSON('Shareandinvite', {
        update: true
    }, {
        "status": "active"
    });
    debug.log(tempjson);
    commonfn['callajax'](tempjson, 'CLOSE_TO_OPEN', API_FIND_UPDATE_INSERT);
}

function ChangeRole_local(role, userId, isCoRole) {

    if (typeof IMPACT_SAVE != "undefined") {
        IMPACT_SAVE.iSave({
            forcesave: true,
            noalert: true
        });
    }


    if (typeof role === "undefined" || role === null) {
        role = "5b53536b4c4a803e9a5abf70";
    }

    if (typeof userId === "undefined") {
        userId = false;
    }

    if (typeof isCoRole === "undefined") {
        isCoRole = false;
    }

    // Store selected role in localStorage
    localStorage.setItem("xmleditor:userRole:" + DOC_ID, role);
    localStorage.setItem("xmleditor:userRole", role);

    //  If isCoRole = true → assign co-role metadata
    if (isCoRole === true) {
        if (typeof USER_INFO !== "undefined") {
            USER_INFO.IS_CO_ROLE = true;
            // optional: store current co-role too
            USER_INFO.CO_ROLE_ID = role;
        }
        if (typeof SHARED_KEY !== "undefined") {
            SHARED_KEY.corole = USER_INFO && USER_INFO.ROLE_ID ? USER_INFO.ROLE_ID : role;
        }
    }

    //  Handle user impersonation (if userId === true)
    if (userId === true && typeof USER_INFO !== "undefined") {
        var currentUser = USER_INFO.MAIL_ID.split('@')[0].trim();

        if (typeof ADMIN_USER_IDs !== "undefined" && ADMIN_USER_IDs.indexOf(currentUser) !== -1) {
            // Filter out the current user
            var otherAdmins = [];
            for (var i = 0; i < ADMIN_USER_IDs.length; i++) {
                if (ADMIN_USER_IDs[i] !== currentUser) {
                    otherAdmins.push(ADMIN_USER_IDs[i]);
                }
            }

            // Pick a random admin from remaining, or fallback to guest_user
            var altUser = otherAdmins.length > 0 ?
                otherAdmins[Math.floor(Math.random() * otherAdmins.length)] :
                "guest_user";

            localStorage.setItem("xmleditor:username:" + DOC_ID, altUser + "@newgen.co");
        }
    }

    //  Refresh local user info and reload page
    if (typeof fetchUserInfo === "function") {
        fetchUserInfo();
    }
    window.location.reload();
}


function fetchUserInfo() {
    /* 
        ! THIS SET_USER_DETAILS IN OBJECT AND STORED AT LOCALSTOREAGE
            ? 1) USER INFO, LIKE (MAIL, ROLE, ROL_ID, ROLE_IS, CONFIG-SELECTOR)
            ? 2) SET THE USER NAME AND ROLE AT EDITOR PAGE LEFT SIDE
            ? 3)
    */
    try {
        USER_INFO.MAIL_ID = localStorage.getItem(`xmleditor:username:${DOC_ID}`);
        if (USER_INFO.MAIL_ID) {
            var tempName = classCase(USER_INFO.MAIL_ID.replace(/@\w+\.\w+(\.\w+)?/g, "")),
                tempId = localStorage.getItem(`xmleditor:userRole:${DOC_ID}`),
                tempRole = "";
            if (!tempId) {
                if (SHARED_KEY.role) tempId = SHARED_KEY.role;
                else tempId = "5b53536b4c4a803e9a5abf70";
            }
            tempRole = ROLE_IDS[tempId].name;
            USER_INFO.DISNAME = (tempName.indexOf('.') != -1) ? tempName.replace('.', ' ') : tempName;
            USER_INFO.ROLE_ID = tempId;
            USER_INFO.ROLE_NAME = tempRole;
            USER_INFO.SELECTOR_BKUP_FOLDER = ROLE_IDS[USER_INFO.ROLE_ID].backup;
            USER_INFO.SELECTOR_SHOW_HIDE = ROLE_IDS[USER_INFO.ROLE_ID].SelectorAttribute;
            USER_INFO.IS_CO_ROLE = SHARED_KEY.corole ? true : false;

            window.USER_ICON = document.getElementById("iuser_Name");
            // ? CHECKING ROLE_NAME FOR EDITOR 2
            if (SHARED_KEY.rolename && SHARED_KEY.rolename.match(tempRole)) {
                USER_INFO.ROLE_NAME = SHARED_KEY.rolename;
            }
            USER_INFO.TRACK_ROLE_NAME = ((SHARED_KEY.corole ? "Co-" : "") + USER_INFO.ROLE_NAME);
            USER_INFO.IS_AUTHOR = Boolean(USER_INFO.ROLE_NAME == 'Author');

            let prefix = USER_INFO.MAIL_ID.split('@')[0].trim();
            $(USER_ICON).text(USER_INFO.DISNAME).attr('title', USER_INFO.ROLE_NAME);
            // ? UPDATED AS SRINI/DIVYA SUGGESTION
            const logoutTitle = `${USER_INFO.DISNAME} (${USER_INFO.ROLE_NAME})`;
            const logoutBtn = document.getElementById('log_out_btn');
            const logoutGroup = document.getElementById('logoutGroup');
            if (logoutGroup) logoutGroup.removeAttribute('title');
            if (logoutBtn) {
                logoutBtn.removeAttribute('title');
                if (typeof tippy === 'function') {
                    if (logoutBtn._tippy) {
                        logoutBtn._tippy.setContent(logoutTitle);
                    } else {
                        tippy(logoutBtn, {
                            content: logoutTitle,
                            arrow: false,
                            placement: 'bottom'
                        });
                    }
                }
            }
            if (SHARE_USER_IDs.includes(prefix) && IS_TRACK_VIEW) {
                USER_ICON.setAttribute('ondblclick', 'CloseToOpen_Dev();');
            }
            /*  05_OCT_22/26_AUG_23 ADDED/EDITED_BY_YA - FOR SRINI/SIVA POINTS  */
            const roleConfig = ROLE_IDS[USER_INFO.ROLE_ID];
            const restrictNode = roleConfig && I_CONFIG && I_CONFIG.querySelector(roleConfig.Restrict_Selector);

            USER_INFO.SELECTOR_RESTRICT = restrictNode ? restrictNode.getAttribute('selector') : false;
            USER_INFO.IS_HISTORY_EDITABLE = restrictNode && restrictNode.getAttribute('history-date-editable') === 'true';

            if (!I_CONFIG) {
                // ? IF CONFIG_NOT_LOADED
                setTimeout(fetchUserInfo, 500);
            }
        } else {
            USER_INFO.ROLE_NAME = 'Guest';
            USER_INFO.MAIL_ID = 'Guest User';
        }
        IsAdmin();
    } catch (err) {
        ErrorLogTrace('fetchUserInfo', err.message);
        console.warn(err.message);
    }
}
const IS_CHECK_ONLINE = function(Online, event) {
    try {
        IS_ONLINE = Online;
        if (IS_TRACK_VIEW) return;

        var opts = {
            type: Online ? 'info' : 'warning'
        };
        var isCollabEnabled = localStorage.getItem("xmleditor:collabEnabled:" + DOC_ID) === "true";
        // Toggle online/offline divs
        var onlineDiv = document.getElementById('onlineDiv');
        var offlineDiv = document.getElementById('offlineDiv');

        if (onlineDiv && onlineDiv.classList) {
            onlineDiv.classList[Online ? 'remove' : 'add']('ds-none');
        }
        if (offlineDiv && offlineDiv.classList) {
            offlineDiv.classList[Online ? 'add' : 'remove']('ds-none');
        }

        // External checks
        if (typeof CHECK_REQUEST !== "undefined") CHECK_REQUEST.CHECK_ONLINE();
        if (typeof mathModule !== "undefined") mathModule.CHECK_ONLINE(Online);

        // Offline branch
        if (!Online) {
            if (typeof iWSC !== "undefined" && iWSC.SpellCheckOnOff) {
                iWSC.SpellCheckOnOff(event, Online);
            }

            if (isCollabEnabled) {
                STOP_ALL_EVENT_TIMERS();
                opts.subKey = 'collaborative';
            }

            TOASTER_ALERT('offline', opts);

        } else if (localStorage.getItem(LOCAL_DATA) && !isCollabEnabled) {
            // Online branch with local data
            opts.subKey = 'withSave';
            TOASTER_ALERT('onLine', opts);
            if (typeof paraLock !== "undefined" && paraLock._resumeEvents) {
                paraLock._resumeEvents();
            }

        } else {
            // Plain online branch (no saved data)
            TOASTER_ALERT('onLine', opts);
            IMPACT_SAVE.startAutoSave(true);
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('IS_CHECK_ONLINE', err.message);
    }
};

function TOASTER_ALERT(Area, Options) {
    try {

        if (IS_LOCAL_HOST) {
            stack = '';
            console.log(traceOrder());
        }

        const ignoreTokens = [
            "Ignore_hyperlink_text",
            "Ignore_KeyEvent_NoteQry",
            "Ignore_KeyEvent_Math"
        ];

        const ignoreRegex = new RegExp(ignoreTokens.join("|"), "i");

        if (ignoreRegex.test(Area)) {
            GlobalEditor.focusManager.blur();
            GlobalEditor.getSelection().removeAllRanges();
        }


        if (Area == "Ignore_KeyEvent_NoteQry") {
            if (IMPACT_SELECTION && IMPACT_SELECTION.SEL_TEXT && IMPACT_SELECTION.SEL_TEXT.length > 0) {
                return;
            }
        }

        var ALERT = {
            success: {
                POS: "top-end",
                TIME: 3500
            },
            error: {
                POS: "center",
                TIME: 6e3
            },
            warning: {
                POS: "center",
                TIME: 6e3
            },
            question: {
                POS: "center",
                TIME: 6e3
            },
            info: {
                POS: "center",
                TIME: 6e3
            }
        };
        Options = Options || {
            type: "success",
            addText: "",
            position: "top-end",
            time: 3500,
            subKey: "",
            Mustache: false
        };
        Options.type = Options.type ? Options.type : 'success';
        Options.addText = (Options.addText ? Options.addText : '');
        Options.position = (Options.position ? Options.position : ALERT[Options.type]['POS']);
        Options.time = ((Options.TIME && typeof Options.TIME == "number") ? Options.TIME : ALERT[Options.type]['TIME']);
        Options.subKey = Options.subKey || "";
        let CanShowConfirmBtn = false;

        if (['warning', 'error'].includes(Options.type)) {
            CanShowConfirmBtn = true;
        }

        var BODY = document.getElementById('Body') || document.querySelector('body');

        if (!BODY.classList.contains('tour')) {
            // ? 13-SEP-22/04_AUG_2023 SUB_AREA ADDED FOR AUTHOR DIALOG
            var TEXT = ALERT_MESSAGE[Area]['text'];
            if (Options.subKey && ALERT_MESSAGE[Area][Options.subKey]) {
                TEXT = ALERT_MESSAGE[Area][Options.subKey];
            }
            if (Options.addText && Options.addText.length > 0) {
                TEXT = TEXT + Options.addText;
            }

            if (Options.Mustache || (TEXT.indexOf("{{") > -1 && TEXT.indexOf("}}") > -1)) {
                if (!Options.DOC_TYPE) Options.DOC_TYPE = (DOC_DTD == "JATS" ? 'article' : 'book/chapters');
                let reTurnObj = GET_SENDER_RECEIVER_ID('HELP_DESK');
                Options = Object.assign(Options, reTurnObj);
                TEXT = Mustache.render(TEXT, Options);
            }

            const Toast = Swal.mixin({
                position: Options.position,
                timer: Options.time,
                toast: true,
                // ? 19_DEC_22/24_FEB_23 - YA - SIVA/CLIENT REQUEST
                showConfirmButton: (Options.confirmBtn || CanShowConfirmBtn) ? true : false,
                showCancelButton: Options.cancelBtn ? true : false,
                timerProgressBar: (Options.notimer) ? false : true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                },
                customClass: {
                    "popup": "d-inline-flex",
                    "container": "w-auto"
                }
            });
            // ? https://stackoverflow.com/questions/52542982/sweetalert2-scrolls-to-initiating-element-after-close

            Toast.fire({
                icon: Options.type,
                html: TEXT,
                willOpen: () => {
                    if (![null, undefined, "null", "undefined"].includes(typeof GlobalEditor) && !!GlobalEditor) {
                        if (typeof GlobalEditor.getCommand == "function") {
                            var cmd = GlobalEditor.getCommand("maximize");
                            if (cmd) cmd.disable();
                        }
                    }
                },
                didClose: () => {
                    var iCKE = document.getElementById('cke_1_contents');
                    if (iCKE) {
                        var IsMaxiView = iCKE.classList.contains('maxiview');
                        if (![null, undefined, "null", "undefined"].includes(typeof GlobalEditor) && !!GlobalEditor) {
                            if (typeof GlobalEditor.getCommand == "function") {
                                var cmd = GlobalEditor.getCommand("maximize");
                                if (cmd && (IsMaxiView || cmd.state == 0)) cmd.enable();
                            }
                        }
                    }
                }
            });
        } else {
            setTimeout(function() {
                TOASTER_ALERT(Area, Options);
            }, 2500);
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('TOASTER_ALERT', Area + "--" + err.message);
    }
}

/**
 * For book (!IS_JOURNAL) opens with SHARED_KEY.multicontributor, convert the
 * single #proof_pdf control into a helpGroup-style dropdown (Book / Chapter Proof).
 * Both items reuse iDownloadMethod.click('proof_pdf') until distinct paths exist.
 * @returns {boolean} true when the dropdown was added
 */
function enhanceProofPdfMulticontributorMenu(sharedKey) {
    try {
        if (typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL) return false;
        if (!sharedKey || !sharedKey.multicontributor) return false;

        var li = document.getElementById('proof_pdf');
        if (!li || li.classList.contains('dropdown') || li.classList.contains('ds-none')) return false;
        if (document.getElementById('proofPdfDiv')) return false;

        var anchor = li.querySelector('a.nav-link');
        if (!anchor) return false;

        li.classList.add('dropdown');
        anchor.setAttribute('href', '#');
        anchor.setAttribute('role', 'button');
        anchor.setAttribute('data-toggle', 'dropdown');
        anchor.setAttribute('aria-haspopup', 'true');
        anchor.setAttribute('aria-expanded', 'false');

        var menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        menu.id = 'proofPdfDiv';
        menu.setAttribute('aria-labelledby', 'proofPdfDiv');

        var items = [{
            id: 'book_proof_btn',
            title: 'Download Book Proof',
            label: 'Book Proof'
        }, {
            id: 'chapter_proof_btn',
            title: 'Download Chapter Proof',
            label: 'Chapter Proof'
        }];

        items.forEach(function(item) {
            var link = document.createElement('a');
            link.className = 'dropdown-item';
            link.id = item.id;
            link.href = "javascript:iDownloadMethod.click('proof_pdf');";
            link.title = item.title;
            link.textContent = item.label;
            menu.appendChild(link);
        });

        li.appendChild(menu);
        return true;
    } catch (err) {
        console.warn(err.message);
        if (typeof ErrorLogTrace === 'function') {
            ErrorLogTrace('enhanceProofPdfMulticontributorMenu', err.message);
        }
        return false;
    }
}

function UI_CONFIGURATION(root, SHARED_KEY, Options = {}) {
    try {
        // ? 12_APR_2023
        var ACTION = function(Id, Options = {
            link: false
        }) {
            try {
                let Element = document.getElementById(Id);
                if (Element) {
                    if (Options.url) {
                        let url = `videotour.html?client=${SHARED_KEY.client}&role=${SHARED_KEY.role}`;
                        Element.setAttribute("href", url);
                    } else {
                        if (IS_LOCAL_HOST) Element.classList.add('ds-none');
                        else Element.remove();
                    }
                } else if (!IS_TRACK_VIEW) {
                    setTimeout((_Id) => {
                        ACTION(Id);
                    }, 2500, Id);
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('ACTION', err.message);
            }
        };
        if (I_CONFIG && SHARED_KEY.dtd) {
            let LOCAL_ROLE = localStorage.getItem(`xmleditor:userRole:${DOC_ID}`) || DEFAULT_ROLE;
            let ROLE_TEMP_ID = SHARED_KEY.role ? SHARED_KEY.role : USER_INFO.IS_ADMIN ? LOCAL_ROLE : LOCAL_ROLE;
            let selector = ROLE_IDS[ROLE_TEMP_ID].SelectorAttribute;
            // ? CO-ROLE SHARED LINK ENABLE/DISABLE
            var selectors = [`${root} [${selector}="false"]`, `${root} [showForCoRole="false"]`, `${root} [external-open]`];
            // ? 23_FEB_2024 YA TNF MOCK 
            if (Options.arr || IS_TRACK_VIEW) {
                selectors.push(Options.arr ? Options.arr : (IS_TRACK_VIEW ? `${root} [showTrackView="false"]` : ""));
            }
            var collection = selectors.map(function(selector) {
                return I_CONFIG.querySelectorAll(selector);
            }).filter(Boolean);
            collection.forEach((collection, index, arr) => {
                //  ? here return for co-shared link
                if (index == 1 && !SHARED_KEY.corole) return;
                Array.from(collection).forEach((elm, ind, Arr) => {
                    let elm_id = elm.getAttribute('name');
                    let subMenu = elm.querySelector("sub-journal");

                    /* 
                    AHA: HAE, HCG, HCI, HCQ, HCV, HHF, HYP, ATV, CIR, RES, STR, SK9
                    Non-AHA: ANE, XAA, IN9
                    Remaining journals - CE_Track PDF Not required
                    */

                    if (/sub-journal/gi.test(elm.tagName)) subMenu = elm;
                    if (subMenu) {
                        // * ? 2398446: HAE Journal test link  */

                        if (J_CONFIG && J_CONFIG.hasAttribute("sub-journal")) {
                            // Find all sub-journal elements
                            const subTypes = elm.querySelectorAll("sub-journal");
                            let subJournalType = J_CONFIG.getAttribute("sub-journal");

                            // Extract the common functionality into a function
                            function processSubJournal(subJournalElement) {
                                try {
                                    const attrVal = subJournalElement.getAttribute(selector);
                                    console.log(attrVal);
                                    if (attrVal === "false") {
                                        elm = subJournalElement;
                                        elm_id = elm.getAttribute('name');
                                    } else {
                                        debug.log("<=== enabled for sub journal configuration ===>");
                                        elm_id = "";
                                        return false;
                                    }
                                } catch (err) {
                                    console.warn(err.message);
                                    ErrorLogTrace('processSubJournal', err.message);
                                }
                            }
                            // Handle based on whether we have multiple sub-journals or just one
                            if (subTypes.length > 1) {
                                // Process multiple sub-journals
                                subTypes.forEach((subType, idx, arr) => {
                                    let stype = subType.getAttribute("type");
                                    console.log(idx, subJournalType, stype);
                                    if (subJournalType === stype) {
                                        processSubJournal(subType);
                                    }
                                });
                            } else {
                                // Handle single sub-journal case
                                const subMenu = subTypes[0] || null;
                                if (subMenu && subJournalType === subMenu.getAttribute("type")) {
                                    console.log(subJournalType, subMenu.getAttribute("type"));
                                    processSubJournal(subMenu);
                                }
                            }
                        }
                    } else if (elm.hasAttribute("type")) {
                        return debug.log("<=== enabled for journal configuration ===>");
                    }
                    debug.log(elm_id);
                    if (elm.hasAttribute("external-open")) {
                        return ACTION(elm_id, {
                            link: true,
                            url: elm.getAttribute("external-open"),
                            node: elm
                        });
                    }
                    let idx = SHARE_USER_IDs.indexOf(USER_INFO.MAIL_ID_PREFIX);
                    // ? here validate for ignore users
                    if (elm.hasAttribute('ignoreUsers') && idx > 0) return;
                    if (elm_id) {
                        var client = commonMethods.getClientCode({
                            format: "lower"
                        });

                        var isOSO = client === "oso";
                        var isSpellCheck = elm_id === "showSpellDiv";
                        var isUatOrDev = IS_UAT_DOMAIN || IS_DEV_DOMAIN;

                        var isOSOAuthor = USER_INFO && USER_INFO.IS_AUTHOR === true && isOSO;

                        // Special case: OSO Author in UAT/DEV clicking SpellCheck → stop
                        if (isOSOAuthor && isSpellCheck && isUatOrDev) return;


                        ACTION(elm_id, {});
                    } else {
                        if (subMenu && elm_id == "") {

                        } else ErrorLogTrace("ITEM MISSING", elm_id);
                    }
                    if (elm.hasAttribute('click_item')) {
                        let add_on_item_id = elm.hasAttribute('click_item');
                        if (add_on_item_id) {
                            ACTION(add_on_item_id);
                        } else {
                            // debug.log(elm.outerHTML);
                            ErrorLogTrace("ITEM MISSING", elm_id);
                        }
                    }
                });
            });

            // ? collaborative editing disabled
            const isCollabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);
            if (isCollabEnabled) {
                ACTION('restoreHTML', {});
                ACTION('showSpellDiv', {});
            }
        }
        // Book multicontributor: Proof PDF → Book / Chapter Proof dropdown (UI-only)
        enhanceProofPdfMulticontributorMenu(SHARED_KEY);
    } catch (err) {
        ErrorLogTrace('UI_CONFIGURATION', err.message);
        console.warn(err.message);
    }
}

function changeTrackTime() {
    try {
        if (GlobalEditor.document) {
            var myMovement = GlobalEditor.document.find('.time').$;
            $.each(myMovement, function(idx, elm) {
                if (elm.getAttribute('data-time') == null) {
                    elm.setAttribute('data-time', elm.innerText);
                }
                $(elm).html(moment(elm.getAttribute('data-time')).fromNow());
            });
        }
        setInterval(function() {
            changeTrackTime();
        }, 30 * 1000);
    } catch (err) {
        console.log(err.message);
        if (typeof ErrorLogTrace == 'function') ErrorLogTrace('changeTrackTime', err.message);
    }
}

function createNewTooltip(id, title) {
    try {
        var instance = tippy(document.querySelector(`[data-id="${id}"]`), {
            content: title,
            arrow: false,
            placement: 'right',
        });
        return instance;
    } catch (err) {
        debug.log(err.message);
        if (typeof ErrorLogTrace == 'function') ErrorLogTrace('createNewTooltip', err.message);
    }

}
commonMethods.normalizeHTML = function(container) {
    // Define constants
    // const EMPTY_SPAN = /<span[^>]*>(\s*)<\/span>/gi;
    let BR_WITH_ATTRS_NOT_CLOSED = null;
    const ESCAPED_ENTITY = /&amp;#x/g;
    const ENTITY = "&#x";
    const BR_WITH_ATTRS_SAFE = /<br\s+([^>]*)>/gi;

    try {
        // Only define this if supported
        BR_WITH_ATTRS_NOT_CLOSED = new RegExp('<br\\s+([^>]*)(?<!/)>', 'gi');
    } catch (e) {
        // Ignore: fallback will be used for unsupported browsers
    }

    var isSafariFallback = false;

    if (window.browserInfo && window.browserInfo.isSafari && window.browserInfo.majorVersion <= 14) {
        var version = parseFloat(window.browserInfo.version);
        if (!isNaN(version) && version <= 14.1) {
            isSafariFallback = true;
        }
    }

    try {

        let tempData = container.innerHTML;

        const replaceFn = typeof tempData.replaceAllregrex === 'function' ?
            tempData.replaceAllregrex.bind(tempData) :
            typeof tempData.replaceAllSplit === 'function' ?
            tempData.replaceAllSplit.bind(tempData) :
            (pattern, replacement) => tempData.replace(pattern, replacement);

        tempData = replaceFn(EMPTY_SPAN, '');
        tempData = replaceFn(ESCAPED_ENTITY, ENTITY);

        if (isSafariFallback || !BR_WITH_ATTRS_NOT_CLOSED) {
            // Fallback: safe BR normalization
            tempData = tempData.replace(BR_WITH_ATTRS_SAFE, (match, attrs) => {
                return match.endsWith('/>') ? match : `<br ${attrs.trim()} />`;
            });
        } else {
            // Use lookbehind in supported environments
            tempData = replaceFn(BR_WITH_ATTRS_NOT_CLOSED, '<br $1/>');
        }

        // Update the container's innerHTML
        container.innerHTML = tempData;

        return tempData;
    } catch (err) {
        console.error('normalizeHTML error:', err);
        return container.innerHTML;
    }
};

function ImpactSetDatafn(data, _) {
    _ = this;
    this.data = data;
    this.DOM = document.getElementById('SET_DATA_DOM');
    this.Editor = CKEDITOR.instances.maineditor;
    this.cursorGroup = this.Editor != null ? (this.Editor.elementPath()) : (null);
    this.curElement = (this.cursorGroup != null) ? (this.cursorGroup.block != null ? (this.cursorGroup.block.$) : (this.cursorGroup.blockLimit.$)) : (null);
    this.curElementId = this.curElement != null ? this.curElement.id : null;
    this.nTocList = new Array(100);
    this.tocBody = document.getElementById('toc_list');
    this.floatBody = document.getElementById('lof_list');
    this.tocBodyText = $(this.tocBody).prop('innerText');
    this._ = null;

    this.TOOLTIP_OBJ = {
        surname: "S N",
        "given-names": "F N",
        collab: "Collab",
        kwd: "KW",
        "article-title": "Article Title",
        volume: "Vol",
        fpage: "FP",
        lpage: "LP",
        source: {
            journal: "Journal Title",
            book: "Book Title"
        },
        year: "Year",
        comment: "COM",
        etal: "et al",
        suffix: "Suffix",
        prefix: "Prefix",
        season: "Season",
        isbn: "ISBN",
        issn: "ISSN",
        "conf-name": "Conference name",
        "conf-loc": "Conference location",
        "conf-sponsor": "Conference sponsor",
        "conf-date": "Conference date",
        month: "Month",
        day: "Day",
        patent: "Patent",
        "chapter-title": "Chapter Title",
        "publisher-loc": "Publisher location",
        "publisher-name": "Publisher name"
    };

    this.FLOAT_REGENERATE = 0;
    this.CLEAN_ERROR = 0;
    this.FROM_CONFIG = {};
    this.Templates = {
        img: `<img class="note_img {{class}}" src="assets/images/svg/query_panel/{{name}}.svg" alt={{tooltip}} title="{{tooltip}}">`,
    };
    this.SCOPE = {};
    this.vdot = '<p class="threedotv" id="paneldot"><img src="assets/images/svg/query_panel/qpDivider.svg" title="Expand"></p>';
    this.vdot_new = '<p class="threedotv" id="paneldot"><img src="assets/images/svg/query_panel/qpShowAllRes.svg" title="Expand" class="icons-new"></p>';
    this.COUNT_SELECTOR = {
        "AQ_TOTAL": `[data-label*="AQ"]`,
        "AQ_OPEN": '[data-status="Open"]',
        "OVER_ALL_AQ_CMD": '[data-class="ckcommentsfull"]:not([data-ignore-comment])',
        "OVER_ALL_CMD": '[data-class="ckcommentsfull"][data-status="note"]:not([data-ignore-comment])',
        "FLOATS_ALL": 'div[class="fig"][position="float"]:not([data-remove]), div[class="table-wrap"]:not([data-remove]),div.ref:not([data-remove]),div.sec:not([data-remove]),div.fn:not([data-remove])'
    };
    this.insert_comment_with_text = function(insertEl, self) {
        self = this;
        try {
            if (insertEl && insertEl.childNodes.length > 1) {
                // Get all child nodes of the original insert element (this includes text nodes and elements)
                const childNodes = Array.from(insertEl.childNodes);

                // Create a document fragment to hold the new structure
                const fragment = document.createDocumentFragment();

                // Iterate over each child node
                childNodes.forEach(child => {
                    // Create a new insert element with the same class attributes
                    const newInsert = document.createElement('insert');
                    for (let attr of insertEl.attributes) {
                        newInsert.setAttribute(attr.name, attr.value);
                    }

                    // Append the current child (text node or span) to the new insert element
                    newInsert.appendChild(child);

                    // Append the new insert element to the fragment
                    fragment.appendChild(newInsert);
                });
                // Replace the original content with the new structure
                insertEl.replaceWith(fragment);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('insert_comment_with_text', err.message);
        }
    };
    this.CLEAN_DOM = function(domRoot, dataString, options = {}) {
        const self = this;

        try {
            // Ensure a valid DOM root
            if (!domRoot) domRoot = document.getElementById("SET_DATA_DOM");
            if (!domRoot || typeof domRoot !== "object") {
                return typeof dataString === "string" ? dataString : "";
            }

            domRoot.innerHTML = "";

            // Retrieve source HTML
            let sourceHtml = "";
            if (typeof dataString === "string" && dataString.length > 0) {
                sourceHtml = dataString;
            } else if (typeof window !== "undefined" && typeof GlobalEditor !== "undefined" && GlobalEditor) {
                try {
                    if (typeof GlobalEditor.getData === "function") {
                        sourceHtml = GlobalEditor.getData() || "";
                    } else if (GlobalEditor.document && typeof GlobalEditor.document.getBody === "function") {
                        const body = GlobalEditor.document.getBody();
                        if (body && body.$) {
                            sourceHtml = body.$.innerHTML || "";
                        }
                    }
                } catch (editorErr) {
                    console.warn("CLEAN_DOM editor read failed:", editorErr.message);
                }
            }

            if (typeof sourceHtml !== "string") sourceHtml = "";
            sourceHtml = sourceHtml.trim();
            if (!sourceHtml) return typeof dataString === "string" ? dataString : "";

            domRoot.innerHTML = sourceHtml;

            // --- Helpers ---
            function parseStyles(styleString) {
                const result = {};
                if (!styleString) return result;
                styleString.split(";").forEach(rule => {
                    if (!rule) return;
                    const parts = rule.split(":");
                    if (parts.length === 2) {
                        const prop = parts[0].trim();
                        const val = parts[1].trim();
                        if (prop.length > 0 && val.length > 0) {
                            result[prop] = val;
                        }
                    }
                });
                return result;
            }

            function removeEl(el) {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            }

            // --- Cleanup selectors ---
            const selectors = [
                '[id^="cke_bm"]',
                'span[style]',
                'span[data-cke-bookmark]',
                'span[data-cke-highlight]',
                '.ref-list img',
                '.ref-list svg',
                '[data-user-comment-box]',
                '.immersive-translate-target-wrapper',
                '.notranslate'
            ];
            const selector = selectors.join(", ");

            Array.from(domRoot.querySelectorAll(selector)).forEach(el => {
                // Handle comment box
                if (el.hasAttribute("data-user-comment-box")) {
                    const insertEl = el.closest("insert");
                    if (insertEl) self.insert_comment_with_text(insertEl);
                    self.CHECK_ATTRIBUTE_VAL(el, "data-user-comment-box");
                    return;
                }

                // Remove bookmark IDs
                if (el.hasAttribute("id") && el.id.match(/cke_bm/)) {
                    el.removeAttribute("id");
                }

                // Handle inline styles / highlights
                if (el.hasAttribute("style") || el.hasAttribute("data-cke-highlight")) {
                    const styles = parseStyles(el.getAttribute("style"));
                    let canUnwrap = el.hasAttribute("data-cke-highlight");

                    if (styles["background-color"] === "#000044" && styles["color"] === "#ffffff") {
                        canUnwrap = true;
                    }
                    if (canUnwrap) {
                        $(el).replaceWith(el.childNodes);
                    }

                    if (styles["display"] === "none") {
                        if ((el.innerHTML === "&nbsp;") || ["", " ", "&nbsp;"].includes(el.textContent) || el.classList.contains("font")) {
                            if (IS_JOURNAL) removeEl(el);
                        }
                    }
                }

                // Skip translator wrappers
                if (el.classList.contains("immersive-translate-target-wrapper") || el.classList.contains("notranslate")) {
                    return;
                }

                // Remove unwanted images in ref-list
                if (el.tagName.match(/img|svg/i) && el.closest(".ref-list")) {
                    if (el.parentElement && el.parentElement.hasAttribute("data-name")) {
                        removeEl(el);
                    } else {
                        removeEl(el.parentElement || el);
                    }
                }
            });

            // --- Clean comment nodes and empty spans ---
            Array.from(domRoot.childNodes).forEach(node => {
                if (node.nodeType === Node.COMMENT_NODE) {
                    const val = node.nodeValue || "";
                    const isUTF = val.indexOf("utf") !== -1;
                    const isDTD = val.indexOf("DOCTYPE") !== -1;
                    const isRootId = val.indexOf(!IS_JOURNAL ? "book-type" : "article-type") !== -1;

                    if (isUTF || isDTD || isRootId) {
                        removeEl(node);
                    } else {
                        removeEl(node);
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.tagName === "SPAN" && (node.textContent === " " || node.textContent === "") && node.childElementCount === 0) {
                        removeEl(node);
                    }
                }
            });

            // --- Return cleaned HTML ---
            if (options.returnString) {
                return self.normalizeHTML(domRoot);
            }
        } catch (err) {
            this.CLEAN_ERROR++;
            console.warn(err.message);
            ErrorLogTrace("CLEAN_DOM", err.message);
            domRoot.innerHTML = dataString;
            return dataString;
        }
    };

    this.normalizeHTML = commonMethods.normalizeHTML;
    this.DataStringValidation = function(data) {
        const self = this;
        try {
            // Reset DOM
            self.DOM.innerHTML = "";
            self.DOM.innerHTML = data;

            // Clean DOM first
            self.CLEAN_DOM(self.DOM, data);

            const _NUMBERED_ = self.DOM.querySelectorAll(".ref .label").length > 0;
            let mTxt = "",
                nTxt = "";
            const myCite = self.DOM.querySelectorAll(
                'a.xref, .aff .sup, span.label, [data-type],[data-label], [data-class], ' +
                '.contrib-group .given-names, .contrib-group .surname, .article-meta .pistart, ' +
                '.delimt, [id^="cke_bm"], div.ref, .kwd, .disp-formula, .inline-formula, .caption[data-label]'
            );

            console.log("Data Validation Start");

            $(myCite).each(function() {
                const val = this;

                // Contributor names and keywords
                if (["surname", "given-names", "kwd"].includes(val.getAttribute("data-name"))) {
                    const dataName = self.TOOLTIP_OBJ[val.getAttribute("data-name")];
                    if (dataName) {
                        val.setAttribute("aria-label", dataName);
                        val.setAttribute("title", dataName);
                    }
                }
                // References
                else if (val.className === "ref") {
                    Array.from(val.querySelectorAll("*")).forEach(node => {
                        node.removeAttribute("aria-label");
                        const key = node.getAttribute("data-name");
                        let dataName = self.TOOLTIP_OBJ[key];
                        if (dataName) {
                            if (key === "source") {
                                const citation = val.querySelector(".mixed-citation");
                                const publicationType = citation ? citation.getAttribute("publication-type") : "";
                                const isJournal = val.querySelector(".article-title");
                                dataName = self.TOOLTIP_OBJ[key][publicationType === "book" ? "book" : (isJournal ? "journal" : "book")];
                            }
                            node.setAttribute("title", dataName);
                        }
                    });
                }

                // Delimiters and page start
                else if (["delimt", "pistart"].includes(val.className)) {
                    val.setAttribute("contenteditable", "false");
                }

                // Cross references
                else if (val.className === "xref") {
                    if (!val.hasAttribute("data-role") && $(val).parents(".contrib-group").length !== 0) {
                        val.setAttribute("data-role", "aff");
                        console.log("data-role attribute added");
                    }
                    if (val.hasAttribute("contenteditable")) {
                        val.removeAttribute("contenteditable");
                        console.log("contenteditable attribute removed");
                    }
                    if ($(val).attr("ref-type") === "bibr") {
                        mTxt = val.textContent;
                        if (((mTxt.indexOf("[") !== -1 || mTxt.indexOf("]") !== -1) && _NUMBERED_) && IS_JOURNAL) {
                            if (mTxt.charAt(mTxt.length - 1) === "]") {
                                const idx = mTxt.indexOf("]");
                                nTxt = mTxt.slice(0, idx) + mTxt.slice(idx + 1);
                                $(val).text(nTxt).after("]");
                                console.log("Moved closing bracket after xref");
                            }
                            if (mTxt.charAt(0) === "[" && _NUMBERED_) {
                                nTxt = mTxt.slice(1);
                                $(val).text(nTxt).before("[");
                                console.log("Moved opening bracket before xref");
                            }
                        }
                    }
                    if (val.hasAttribute("id") && val.id.match(/cke_bm/)) {
                        val.removeAttribute("id");
                    }
                }

                // Superscripts in affiliations
                else if (val.className === "sup" && val.parentNode.className === "aff") {
                    if (!$(val).attr("contenteditable")) {
                        $(val).attr("contenteditable", "false");
                        console.log("contenteditable attribute added");
                    }
                }

                // Labels in sections, figures, tables, etc.
                else if (val.className === "label" &&
                    val.parentNode && ["sec", "fig", "table-wrap", "title-group", "ref", "boxed-text"].includes(val.parentNode.className)) {
                    try {
                        const target = val.querySelector(".target");
                        if (target) target.remove();

                        const lab = val.textContent.trim();

                        if (val.nextElementSibling && ["title", "caption"].includes(val.nextElementSibling.className)) {
                            val.nextElementSibling.setAttribute("data-label", lab);
                            val.remove();
                            console.log("label attribute added");
                        } else if (val.parentNode && val.parentNode.className === "ref") {
                            if (!val.hasAttribute("data-value")) {
                                val.setAttribute("data-value", lab);
                            }
                        }

                        const label = val.getAttribute("data-label");
                        if (!label) return;

                        const match = label.match(/^([A-Z0-9]+)(Figure|Table|Plate|Scheme)/i);
                        if (!match) return;

                        const pageId = match[1];
                        const cleanLabel = label.replace(pageId, "").trim();

                        val.setAttribute("data-page-id", pageId);
                        val.setAttribute("data-label", cleanLabel);
                    } catch (err) {
                        console.error("normalizeCaptionLabel error:", err);
                    }
                }
            });

            console.log("Data Validation End");

            const rData = self.DOM.innerHTML;
            self.DOM.innerHTML = "";
            return rData;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("DataStringValidation", err.message);
        }
    };

    // ? fillter the toc list as per hierchery order
    this.NewGetToc = function(_parentId) {
        // ? filtter the child id with Parent Id and push html string Array
        try {
            return _.nTocList.filter(function(node) {
                    return (node._parent_id == _parentId[0] || node._parent_id == _parentId[1] || node._parent_id == _parentId[2]);
                })
                .map(function(node) {
                    var exists = _.nTocList.some(function(childNode) {
                        return (childNode._parent_id == node._rootId);
                    });
                    var subMenu = (exists) ? '<ul class="nested">' + _.NewGetToc([node._rootId]).join('') + '</ul>' : "";
                    var titleTool = stripHtmlText(node.title);
                    var myStrng = '<li class="toc-items" data-level="' + node.lvl + '"><span onclick="postNavigation(this, \'toc\')" data-id="' + node.title_id + '" class="impact" tabindex="0" >';
                    if (exists) {
                        myStrng += '<span class="fa fa-angle-right"></span>';
                    }
                    myStrng += node.title + '</span>' + subMenu + '</li>';
                    return myStrng;
                });
        } catch (err) {
            ErrorLogTrace('NewGetToc', err.message);
            console.warn(err.message);
        }
    };
    this.setLastActiveClass = function(id) {
        try {
            var myList = document.querySelectorAll('#toc_list, #lof_list'),
                myEntry = $(myList).find('[data-id="' + id + '"]'),
                myNxt = $(myEntry).next();
            $(myList).find('.active').removeClass('active');
            $(myList).find('span.fa').attr('class', 'fa fa-angle-right');
            if (myNxt.hasClass('nested')) {
                myNxt.addClass('active');
            }
            $(myEntry).addClass('active').find('span.fa').attr('class', 'fa fa-angle-down active');
            $.each($(myEntry).parents('ul.nested'), function(indexInArray, valueOfElement) {
                $(valueOfElement).addClass('active');
                $.each($(valueOfElement).parents(), function(index, Elm) {
                    // ? Change arrow for parent
                    if (Elm.classList.contains('toc-items')) {
                        Elm.firstChild.firstChild.setAttribute('class', 'fa fa-angle-down');
                    }
                });
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SetDatafn_setLastActiveClass', err.message);
        }
    };
    this.toclist = function(data, key, self) {
        self = this;
        const TOC_DOM = document.createElement('div'),
            _ABSTRUCT = 'div.abstract',
            _PART_CHILD_CHECK = 'div.book-part-meta',
            _PART_PAR_CHECK = 'div.book-part',
            _DIVCHECK = 'div.sec',
            PART = 'part',
            CHAPTER = 'chapter';
        try {
            TOC_DOM.innerHTML = data;
            TOC_DOM.querySelectorAll(key).forEach((node, idx, arr) => {
                var [_curLvl, mTitleId, mTitle, parId, childColl, _secId, mSec] = ["", "", "", "", "", "", {}];
                if ($(node).parents(_ABSTRUCT, 'boxed-text').length != 0 || IS_JOURNAL && $(node).parents('.boxed-text').length != 0 || node.getAttribute('content-type') == "footnotes") {
                    return;
                    // ? ignorable section
                }
                let _partLen = $(node).parents(_PART_PAR_CHECK).length;
                let _ChildPartLen = $(node).children(_PART_CHILD_CHECK).length;
                _curLvl = (node.className == 'sec') ? (node.getAttribute('data-levels')) : ((IS_JOURNAL) ? (node.getAttribute('data-name')) : (node.getAttribute('book-part-type')));
                if (!_curLvl) _curLvl = node.getAttribute('data-name');
                mTitleId = _secId = node.id;

                if ($(node).find('.title-group,.title').length == 0) {
                    return debug.log(node.id);
                }
                if (($(node).find('.title').attr('id') != undefined)) {
                    mTitleId = $(node).find('.title').attr('id');
                }
                if (!IS_JOURNAL && _curLvl == CHAPTER && ($(node).find('.title').attr('id') == undefined)) {
                    //? Siva Advice - Getting title Id for Chapters(BITS) - 03_OCT_24-RJ
                    mTitleId = $(node).find('.title-group').attr('id');
                }
                if ((JSON.stringify(_.nTocList).includes(mTitleId))) return;
                if (IS_JOURNAL) {
                    parId = (_curLvl != 1 && (!_curLvl.match(/^[a-z -]+$/))) ? (node.parentNode.id) : (0);
                    if (_curLvl == 1 && node.closest(".app") && parId == 0) {
                        // ? Handle appendix  - YA _ 24_APR_2023 - NIHR
                        parId = node.parentNode.id;
                    }
                } else {
                    var tocShowItems = ['preface', 'dedication', 'toc', 'app', 'def-list', 'ref-list', 'fn-group'];
                    let PAR_ID = $(node).parents(_PART_PAR_CHECK).attr('id');
                    // ? allow
                    if (_curLvl == PART || (_curLvl == CHAPTER)) {
                        if ((_curLvl == PART && _ChildPartLen > 0) || (_curLvl == CHAPTER && _partLen > 0)) {
                            parId = ((_curLvl == CHAPTER) ? PAR_ID : 0);
                        } else parId = 0;
                    } else if (((node.className == 'sec') && (_curLvl == 1)) || (tocShowItems.includes(node.className))) {
                        parId = _partLen == 0 ? 0 : PAR_ID;
                        // if (!(_partLen > 0)) {
                        //     parId = 0;
                        // }
                        if (node.className.match(/ref/) && node.parentElement.closest('.ref-list')) {
                            parId = node.parentElement.closest('.ref-list').id;
                        } else if (node.className.match(/sec|ref|fn-group/)) {
                            if (node.closest(".front-matter-part")) {
                                parId = node.parentElement.closest('.front-matter-part').id;
                            } else if (node.closest(".front-matter")) {
                                if (node.parentElement.parentElement.className.match(/preface|toc/)) {
                                    parId = node.parentElement.parentElement.id;
                                }
                            }
                        }
                    } else if ((node.className == 'sec') && (_curLvl != 1)) {
                        parId = $(node).parents(_DIVCHECK).attr('id');
                    } else {
                        parId = 0;
                    }
                    // ? Head Label Configuration
                    if (node.className == 'sec' && $(node).parents('div.body').length > 0) {
                        if ($(node).children('div.title')[0] == undefined) {
                            if (node.childElementCount == 1 && node.firstElementChild.className == 'sec') {
                                node.outerHTML = node.innerHTML;
                                return;
                            }
                        }
                    }
                }
                childColl = (IS_JOURNAL || ['ref-list', 'fn-group', 'sec', 'app', 'ack'].includes(node.className)) ? (node.children) : ($(node).children('.book-part-meta').children('.title-group').children());
                $.each(childColl, function(ind, element) {
                    // ? Add also label if available
                    if (element.className == 'title') {
                        var lab = element.getAttribute('data-label');
                        if (lab) mTitle += lab + ' ';
                        mTitle += getTxt(element);
                    }
                });
                if (_curLvl == PART || _curLvl == CHAPTER) {
                    let _uCase = mTitle.toLocaleUpperCase(),
                        templable = (_curLvl == PART) ? (PART) : (CHAPTER),
                        _IsLableMiss = _uCase.indexOf(templable.toUpperCase()) == -1,
                        _tempTile = templable.slice(0, 1).toLocaleUpperCase() + templable.slice(1, templable.length) + ' ' + mTitle,
                        _isIntro = ("'" + _uCase + "'".match(/introduction|conclusion/gi)) ? (true) : (false);
                    mTitle = (_IsLableMiss) ? ((!_isIntro) ? (_tempTile) : (mTitle)) : (mTitle);
                }
                // ? push JSON and process {lvl: "1", _parent_id: 0, _rootId: "sec1-038", title_id: "OPT2-855", title: "Trust Circle"}
                mSec.lvl = _curLvl;
                mSec._parent_id = parId;
                mSec._rootId = _secId;
                mSec.title_id = mTitleId;
                mSec.title = mTitle;
                if (mTitle.length == 0) return;
                if (!(JSON.stringify(_.nTocList).includes(mTitleId))) {
                    _.nTocList.push(mSec);
                }
            });

            const lastActive = this.tocBody.querySelector('.impact.active');
            const newString = this.NewGetToc(["0", 'ack', 'fn-group', 'ref-list']).join('');
            const newDOM = document.createElement('div');
            $(newDOM).append(newString);

            // Find all elements with `data-level="chapter"`
            const chapterElements = Array.from(newDOM.querySelectorAll('li[data-level="chapter"]'));

            // Check if there's exactly one such element
            if (chapterElements.length === 1) {
                const chapterElement = chapterElements[0];
                const nestedUl = chapterElement.querySelector('ul.nested');

                if (nestedUl) {
                    // Move the children of `ul.nested` to the parent of the `chapterElement`
                    Array.from(nestedUl.children).forEach(child => {
                        chapterElement.parentNode.insertBefore(child, chapterElement);
                    });
                }

                // Remove the `chapter` element
                chapterElement.parentNode.removeChild(chapterElement);
            }
            const newText = Array.from(newDOM.children, (el) => el.outerHTML.trim()).filter(Boolean).join('');
            const oldText = Array.from(this.tocBody.children, (el) => {
                el.querySelectorAll('.active').forEach(function(elm) {
                    elm.classList.remove('active');
                });
                return el.outerHTML.trim();
            }).filter(Boolean).join('');
            if (newText.length > 15 && newText != oldText) {
                $('#toc_list').html('').append(newDOM.innerHTML);
                if (lastActive != null) {
                    self.setLastActiveClass(lastActive.getAttribute('data-id'));
                }
                console.log('TOC List Updated ... ');
            }
            _IsDirty = false;
            //_.nTocList = [];
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('toclist', err.message);
            setTimeout(function() {
                self.toclist(data);
            }, 750);
        }
    };
    this.getTemplate = function(name, parameters, Option) {
        try {
            var output = Mustache.render(this.Templates[name], parameters);
            return output;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getTemplate', err.message);
        }
    };
    this.getTimeRecord = function(Entry, Options = {}) {
        try {
            let date_time = typeof Entry == 'object' ? (Entry.getAttribute(Options.attr_name ? Options.attr_name : Entry.hasAttribute('data-timec') ? 'data-timec' : 'data-time')) : Entry,
                parseStamp = Number(date_time),
                time = isNaN(parseStamp) ? '' : (moment(parseStamp).format("hh:mm A")),
                date = isNaN(parseStamp) ? date_time : (moment(parseStamp).format("DD-MMM-YYYY")),
                date_Time = date + " " + time,
                toggle_time = isNaN(parseStamp) ? `` : `data-toggle="tooltip" data-placement="${Options.place ? Options.place : 'bottom'}" title="${Options.datetime ? date_Time : time}"`;
            return {
                Time: time,
                ToolTip: toggle_time,
                Date: date,
                DateTime: date.concat(" ", time)
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getTimeRecord', err.message);
        }
    };
    // ? Genarate Floats start
    this.floatlist = function(data) {
        let el = null;
        try {
            var myId = "",
                mCaptn = "",
                mLable = "",
                that = this,
                ORDER_OBJ = {
                    'lofig': [],
                    'lotab': [],
                    'lounfig': [],
                    'lountab': []
                };
            $(this.COUNT_SELECTOR['FLOATS_ALL'], data).each(function(index, value) {
                el = this;
                if (['ref', 'sec', 'fn'].includes(value.getAttribute('data-name')) /* || !value.querySelector('.caption') */ ) return debug.log("return ==>" + value.className);
                // ? Define label text to show
                myId = $(this).attr('id');
                if (!value.querySelector('.caption[data-label]') && $(this).find('.label').length > 0 && !['table-wrap', 'fig'].includes(this.className)) {
                    mLable = getTxt($(this).find('.label'));
                } else {
                    let temp_label = "";
                    if (value.querySelector('.caption')) {
                        temp_label = value.querySelector('.caption').getAttribute('data-label');
                    }
                    mLable = temp_label ? (temp_label) : ("");
                }
                // ? 19-SEP-22 Updated for Both JATS_BITS
                if (($(this).find('.caption').length > 0)) {
                    let FindCaption = GENERATE.getAttribute((this.className == 'table-wrap' ? 'tabCap' : 'figCap'));
                    let caption = this.querySelector(FindCaption) || this.querySelector(".caption [data-name]") || this.querySelector(".caption");
                    mCaptn = getWords(getTxt(caption));
                    if (caption.id) myId = caption.id;
                    else {
                        myId = caption.id = s4();
                    }
                    //caption.id ? (myId = caption.id) : (myId = caption.id = s4());
                } else mCaptn = 'No caption available';
                if (mCaptn == '') {
                    if (value.closest('.abstract')) {
                        mCaptn = value.closest('.abstract').getAttribute('abstract-type').replace('-', ' ').firstLetterUpperCase();
                    } else mCaptn = 'No caption available';
                }
                if (myId.length == 0) return;
                let isExist = _.nTocList.some(item => item.title_id === myId);
                if (!isExist) {
                    _.nTocList.push({
                        title_id: myId,
                        title: mLable + ' ' + mCaptn
                    });
                }
                // ? Add text if caption not avaialable
                let tempSting = '<li class="lof-items"><span class="impact" onclick="postNavigation(this, \'toc\')" tabindex="0" data-id="' + myId + '" data-display="' + mLable + '" >' + mLable + ' ' + mCaptn + '</span></li>';
                let IsFig = this.className == 'fig';
                ORDER_OBJ[!!this.querySelector('.caption[data-label]') ? (IsFig ? 'lofig' : 'lotab') : (IsFig ? 'lounfig' : 'lountab')].push(tempSting);
            });
            let floatlastActive = this.floatBody.querySelector('.impact.active');
            Object.keys(ORDER_OBJ).forEach((_id_, idx, arr) => {
                let cur_div = document.getElementById(_id_);
                let root = cur_div.closest('.lof-items');
                let LIST_ARR = ORDER_OBJ[_id_];
                root.querySelector('.FloatsCount').textContent = LIST_ARR.length;
                root.classList[LIST_ARR.length == 0 && [2, 3].includes(idx) ? "add" : "remove"]("ds-none");
                $(cur_div).html('').append(LIST_ARR.join(''));
            });
            if (floatlastActive != undefined) {
                // ? cancelling while restoring
                that.setLastActiveClass(floatlastActive.getAttribute('data-id'));
            }
        } catch (err) {
            debug.warn(err.message);
            ErrorLogTrace('SetDatafn_floatlist', err.message);
            if (this.FLOAT_REGENERATE < 3) {
                setTimeout(function() {
                    SET_DATA.reGenerateAllInit(data, {
                        floatlist: true
                    });
                }, 1000);
            }
            this.FLOAT_REGENERATE++;
        }
    };
    this.reGenerateAllInit = function(data, Options, _) {
        _ = this;
        debug.log("SET DATA ReGenerateAllInit start==>" + new Date().toLocaleTimeString());
        if (IS_LOCAL_HOST) {
            stack = '';
            console.log(traceOrder());
        }
        try {
            if (!data) data = GlobalEditor.getData();
            Options = Options ? Options : ({
                init: false,
                toclist: true,
                floatlist: true,
                querylist: true
            });

            debug.log("<== reGenerateAllInit ===>");
            if (!GENERATE && !!I_CONFIG)
                GENERATE = I_CONFIG.querySelector(`[name=Generate_Items]`);
            if (GENERATE) {
                let TOC_Key = GENERATE.hasAttribute('toc') && GENERATE.getAttribute('toc'),
                    float_Key = GENERATE.getAttribute('float');
                if (Options.toclist) this.toclist(data, TOC_Key);
                if (typeof float_Key == "boolean" && float_Key != 'false' || Options.floatlist) this.floatlist(data);


                //  !  12-MAY-2022_YA UPDATE_TOOLTIP
                // this.FIRE_TOOLTIP();
                this.FIRE_TIPPY_TOOLTIP(_.nTocList);
                _.nTocList = [];
                //!  27-Apr-2022 _ YA _UPDATE _EVENT
                // this.pasteEvent_Init(_);

                if (typeof InitialLoadDialog != "undefined") InitialLoadDialog.updateProgress(6);
            } else {
                setTimeout(function() {
                    SET_DATA.reGenerateAllInit(data);
                }, 2500);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SetDatafn_reGenerateAllInit', err.message);
        }
    };
    this.FIRE_TOOLTIP = function(Options = {}) {
        // !  01-APR-2024_YA UPDATE_TOOLTIP
        try {
            let listOfItems = {
                // ? default
                'default|[data-toggle="tooltip"]:not(.impact)': {
                    boundary: "scrollParent",
                    fallbackPlacement: "flip"
                },
                // ? TOC FLOAT LIST
                'default_right|.impact[data-toggle="tooltip"]': {
                    boundary: "scrollParent",
                    fallbackPlacement: "flip",
                    placement: "right",
                    container: "body"
                }
            };
            for (var query in listOfItems) {
                if (listOfItems.hasOwnProperty(query)) {
                    query.split("|").forEach(find => {
                        let canFire = Options.selector ? false : true;
                        if (/default/gi.test(find)) {
                            if (Options.selector && Options.params && find.includes(Options.params)) {
                                find = Options.selector;
                                canFire = !0;
                            } else return;
                        }
                        if (canFire) $(find).tooltip(listOfItems[query]);
                    });
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_TOOLTIP', err.message);
        }
    };
    this.FIRE_TIPPY_TOOLTIP = function(tocList) {
        try {
            tocList.forEach((res) => {
                var domElm = document.querySelector(`[data-id="${res.title_id}"]`);
                // ? Alert Err - 15/6/24 - RJ
                // ? Null err - 20/06/24 - RJ
                if (domElm && domElm._tippy) {
                    return;
                } else {
                    createNewTooltip(res.title_id, res.title);
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_TIPPY_TOOLTIP', err.message);
        }
    };

    this.getCurPosition = function(edata, id, tag) {
        try {
            if ((id == undefined) && (this.cursorGroup != null)) {
                while (!this.curElement.hasAttribute('id') && this.curElement.parentElement != null) {
                    this.curElement = this.curElement.parentElement;
                    if (intCount == 5) break;
                    else intCount++;
                }
                if (this.curElement.hasAttribute('id')) id = this.curElement.id;
            }
            return id;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SetDatafn_getCurPosition', err.message);
        }
    };
    this.setCurPosition = function(id, tag) {
        try {
            console.log(id, tag);
            (function(_id, _tag) {
                setTimeout(function() {
                    IMPACT_SELECTION._SNAPSHOT({
                        lock: true
                    });
                    let sel = GlobalEditor.getSelection(),
                        rng, element;
                    if (_id != undefined && _id != null && _tag != undefined) {
                        element = GlobalEditor.document.findOne(_tag + '[data-time="' + _id + '"]');
                    } else if (_id != undefined && _id != null && _tag == undefined) {
                        element = GlobalEditor.document.findOne('[fid="' + _id + '"]');
                    } else if (_id == undefined && _tag == undefined) {
                        element = GlobalEditor.document.findOne('[id="' + _id + '"]');
                    }
                    if (!element) element = GlobalEditor.document.findOne('[id="' + _id + '"]');
                    if (!element) return console.warn('Selection Empty');
                    rng = GlobalEditor.createRange();
                    element.scrollIntoView(true);
                    rng.setStartAt(element, CKEDITOR.POSITION_BEFORE_START);
                    rng.setEndAt(element, CKEDITOR.POSITION_BEFORE_START);
                    sel.selectRanges([rng]);
                    GlobalEditor.focus();
                    IMPACT_SELECTION._SNAPSHOT({
                        unlock: true,
                        update: true
                    });
                    //element.removeAttribute('fid');
                }, 1500);
            })(id, tag);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SetDatafn_setCurPosition', err.message);
        }
    };
    this.setNewData = function(value, Options, id, tag) {
        try {
            if (!Options) {
                Options = {};
                Options.reGenerateAll = false;
                Options.DOM_Empty = false;
                Options.lock = false;
                Options.unlock = false;
            }
            if (typeof traceOrder == "function") {
                // console.log(traceOrder());
            } else {
                console.log('traceOrder == Missing');
            }
            if (value == undefined || value == null || value == 'undefined' || value == 'null' || value == '') {
                // need to show alert last operation, last attemp has been failure
                return;
            }
            var data = '';
            if (typeof value == "string") {
                data = value;
                this.DOM.innerHTML = '';
                this.DOM.innerHTML = data;
            } else data = value.innerHTML;
            if (setDataBool) {
                id = (id) ? (id) : (this.getCurPosition());
                var iEditor = CKEDITOR.instances.maineditor;
                if (Options.UndoDisable != undefined && !Options.UndoDisable) {
                    IMPACT_SELECTION._SNAPSHOT({
                        unlock: true
                    });
                }
                if (Options.replace_div && Options.replace_div_id) {
                    $(iEditor.document.getById(Options.replace_div_id).$).replaceWith(data);
                } else {
                    iEditor.setData(data);
                }
                let SNAPS = GlobalEditor.undoManager.snapshots;
                if (Options.UndoDisable) {
                    IMPACT_SELECTION._SNAPSHOT({
                        unlock: true
                    });
                    if (SNAPS.length > 1) {
                        SNAPS = SNAPS.slice(0, 1);
                    }
                    //To reset undo after restore version
                    GlobalEditor.resetUndo();
                    GlobalEditor.undoManager.reset();
                    //SNAPS[0].contents = GlobalEditor.getSnapshot();
                } else {
                    IMPACT_SELECTION._SNAPSHOT({
                        unlock: true,
                        save: true
                    });
                }
                console.log('Data Reset . . . . ');
                setDataBool = true;
                if (id != null) {
                    this.setCurPosition(id, tag);
                } else {
                    console.log('ID MISSSING TRIGGER MANUAL');
                    IMPACT_SELECTION.setCursor(iEditor);
                }
                if (Options.reGenerateAll) {
                    setTimeout(() => {
                        SET_DATA.reGenerateAllInit(iEditor.getData());
                    }, 1500);
                }
                if (Options.DOM_Empty) {
                    this.DOM.innerHTML = '';
                }
                commonMethods.cleanTranslatorExtensions(iEditor);
            } else {
                setTimeout(() => {
                    this.setNewData(value, Options, id, tag);
                }, 750);
            }
        } catch (err) {
            if (typeof TOASTER_ALERT != "undefined") {
                TOASTER_ALERT('ErrorImpact', {
                    type: 'warning'
                });
            }
            ErrorLogTrace('setNewData', err.message);
            console.warn(err.message);
            return;
        }
    };
    this.init = function(data, method) {
        try {
            if (data == undefined || data == null || data == 'undefined' || data == 'null') {
                return;
            }

            let sourceData = typeof data === 'string' ? data : String(data);
            let filterData = this.DataStringValidation(sourceData, true);

            if (filterData == undefined || filterData == null || filterData == 'undefined' || filterData == 'null' || filterData == '' || filterData.length < 50) {
                filterData = sourceData;
            }

            let compareindex = typeof sourceData === 'string' && typeof filterData === 'string' ? sourceData.localeCompare(filterData) : 0;
            let finalData = (compareindex != 0) ? filterData : sourceData;

            if (this.Editor && typeof this.Editor.setData === 'function') {
                this.Editor.setData(finalData);
                if (typeof InitialLoadDialog != "undefined") InitialLoadDialog.updateProgress(5);
            }
            this.reGenerateAllInit(finalData, {
                init: true,
                toclist: true,
                floatlist: true,
                querylist: true
            });
            console.log('Initial Data Loaded');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('init', err.message);
        }
    };
    this.CHECK_ATTRIBUTE_VAL = function(el, attr, Options = {}) {
        try {
            if (!this.CHECK_ATTRIBUTE_VAL_HISTORY) this.CHECK_ATTRIBUTE_VAL_HISTORY = {};
            let org_val = el.getAttribute(attr);
            if (!org_val || typeof PasteFilter == "undefined") return;
            let newValue = PasteFilter.fire(org_val, {
                event_from: 'shortcut',
                record: false,
                e: {
                    name: "check"
                }
            });
            if (newValue && newValue.trim().length != org_val.trim().length) {
                el.setAttribute(attr, newValue);
                let p_id = el.parentElement.id,
                    pass_param = p_id + "<br>" + org_val + "<br>" + newValue;

                /* PasteFilter.Record(org_val, newValue, {
                    area: "replace_filter_value"
                }); */
                if (!this.CHECK_ATTRIBUTE_VAL_HISTORY[org_val]) {
                    this.CHECK_ATTRIBUTE_VAL_HISTORY[org_val] = newValue;
                    //ErrorLogTrace('REPLACE_ATTRIBUTE_VAL', pass_param);
                }
                debug.log(newValue, org_val);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CHECK_ATTRIBUTE_VAL', err.message);
        }
    };
}

function editor_initialize_events(data) {
    try {
        var pathname = window.location.pathname;
        var configFileName = "config6.min.js";
        // Condition: choose config based on editor1.html
        if (pathname.indexOf("editor1") > -1) {
            configFileName = "config1.min.js";
        }

        // Build dynamic config path
        var _cusConfig = (IS_LOCAL_HOST ? "dist/" : "") + (`ckeditor-${VERSION}/${configFileName}?t=${new Date().getTime()}`);

        if (!CKEDITOR) {
            setTimeout(() => {
                editor_initialize_events(data);
            }, 1000);
            return false;
        }
        CKEDITOR.replace('maineditor', {
            on: {
                // instanceLoaded: function( ev ) {console.log('=====> instanceLoaded');},
                // currentInstance: function( ev ) {console.log('=====> currentInstance');},
                // instanceCreated: function( ev ) {console.log('=====> instanceCreated');},
                // reset: function( ev ) {console.log('=====> reset');},
                loaded: function(ev) {
                    ev.editor.dataProcessor.writer.sortAttributes = 0;
                    // console.log('=====> loaded');
                },
                instanceReady: function(ev) {
                    console.log('=====> instanceReady--001');
                    ev.editor.dataProcessor.writer.selfClosingEnd = '>';
                    ev.editor.dataProcessor.writer.sortAttributes = 0;
                    if (!IS_TRACK_VIEW) {
                        if (typeof trackManager !== "undefined") {
                            window._trackManager = new trackManager(ev.editor);
                        }
                        if (commonMethods && typeof commonMethods.cleanTranslatorExtensions === "function") {
                            commonMethods.cleanTranslatorExtensions(ev.editor);
                        }
                        if (!IS_JOURNAL) {
                            // avoid already append values
                            setTimeout(() => {
                                if (typeof HandleBookskwdGroupDelimeter == "function") {
                                    HandleBookskwdGroupDelimeter(ev.editor);
                                }
                            }, 5000);
                        }
                    }
                }
            },
            customConfig: DOMAIN_ROOT + _cusConfig,
            startupFocus: false
        });
        GlobalEditor = CKEDITOR.instances.maineditor;
        SET_DATA = new ImpactSetDatafn();
        if (window.EditorBootInit && typeof window.EditorBootInit.runEditorShellInits === 'function') {
            window.EditorBootInit.runEditorShellInits(data);
        } else if (!IS_TRACK_VIEW) {
            SET_DATA.init(data);
            if (typeof FormattingHandler != "undefined") FormattingHandler.init();
            if (typeof SYNC_CLICK_EVENT != "undefined") SYNC_CLICK_EVENT.Init();
            if (typeof IMPACT_SAVE != "undefined") IMPACT_SAVE.Init();
            if (window.MAINTENANCE) {
                let [starttime, Obj, timer] = [sessionStorage.getItem("MAINTENANCE_START"), {
                    init: true
                }, 5000];
                if (starttime) {
                    timer = 100;
                    Obj.start = starttime;
                    delete Obj.init;
                }
                setTimeout(() => {
                    window.MAINTENANCE.Init(Obj);
                }, timer);
            }
        } else {
            GlobalEditor.setData(data);
        }
    } catch (err) {
        console.warn(err.message);
        if (!USER_INFO.IS_ADMIN) ErrorLogTrace('editor_initialize_events', err.message);
    }
}
String.prototype.getAttachFileName = function(method) {
    try {
        var type = this.toLocaleString().substring(this.toLocaleString().lastIndexOf('.') + 1, this.toLocaleString().length);
        //type=(type.length>3)?(type.substr(type.length-4)):(type); // ? handle below  limit_count
        let _default = getMaxTextLength.attach_file['default'];
        let limit_count = method ? getMaxTextLength[method] ? getMaxTextLength[method] : (getMaxTextLength.attach_file ? getMaxTextLength.attach_file[method] : _default) : _default;
        let min = limit_count.min;
        if (this.length > limit_count.max) {
            if (type.length > 3) min--;
            return (this.slice(0, min) + '...' + type).toString();
        } else return this.toString();
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getAttachFileName', err.message);
    }
};
window.addEventListener('online', function(e) {
    IS_CHECK_ONLINE(navigator.onLine, e);
});
window.addEventListener('offline', function(e) {
    IS_CHECK_ONLINE(navigator.onLine, e);
});
document.onkeydown = function(e) {
    try {
        let [IsBlock, canShow] = [false, true];
        const keyCode = e.keyCode || e.which;
        if (keyCode == 123) {
            IsBlock = true;
        }
        if (e.ctrlKey && keyCode == 'S'.charCodeAt(0) || ((/s|a/gi.test(e.key)) && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey))) {
            debug.log("CTRL+S");
            IsBlock = true;
            canShow = false;
        }
        if (e.ctrlKey && e.shiftKey && keyCode == 'I'.charCodeAt(0)) {
            IsBlock = true;
        }
        if (e.ctrlKey && e.shiftKey && keyCode == 'C'.charCodeAt(0)) {
            IsBlock = true;
        }
        if (e.ctrlKey && e.shiftKey && keyCode == 'J'.charCodeAt(0)) {
            IsBlock = true;
        }
        if (e.ctrlKey && e.shiftKey && keyCode == 'U'.charCodeAt(0)) {
            IsBlock = true;
        }
        if (IsBlock) {
            if (!canShow) return false;
            if (typeof TOASTER_ALERT != "undefined") {
                TOASTER_ALERT('contextMenuClik', {
                    type: 'warning'
                });
                return false;
            }
        }
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'C', 'J', 'U'].includes(e.key))) {
            e.preventDefault();
        }
        if (IMPACT.USER_ENV_INFO.isFirefox && (e.ctrlKey || e.metaKey) && ['i', 'I', 'b', 'B'].includes(e.key)) {
            var target = e.target;
            if (target.hasAttribute("contenteditable") && target.getAttribute("contenteditable") == "true") {
                let evt = /b|B/gi.test(e.key) ? 'bold' : 'italic';
                document.execCommand(evt);
                e.preventDefault();
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('document.onkeydown', err.message);
    }
};

document.addEventListener("contextmenu", function(e) {
    if (!IS_LOCAL_HOST) {
        if (typeof TOASTER_ALERT == "function") {
            TOASTER_ALERT('contextMenuClik', {
                type: 'warning'
            });
        }
        e.preventDefault();
    }
});

// Fixed Debounce_Event function
Debounce_Event = function(func, timeout = 900) {
    try {
        let timer;
        // Use regular function, not arrow function
        return function(...args) {
            const context = this;
            clearTimeout(timer);
            timer = setTimeout(() => {
                func.apply(context, args);
            }, timeout);
        };
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('Debounce_Event', err.message);
    }
};

window.addEventListener('keydown', handleKey);


function handleKey(e) {
    /*
        ! THIS FUNCTION WILL BE TRIGGER ON KEY-BOARD TAB/ESC PRESS -
            ? TAB KEY -->  IF ANY MODULE OPEN -IT WILL ADD THE FOCUS ON ACTIVE ELEMENTS
            ? ESC KEY -->  IF ANY MODULE OPEN -IT WILL CLOSE THE MODULE
    */
    console.log("---handleKey---");
    try {
        var shift = e.shiftKey;
        var keyValidatrion = shift || e.keyCode === 27 || e.keyCode === 9 ? true : false;
        if (!keyValidatrion) return;


        let DockedPanel = document.querySelector('.mDialog:not(.ds-none)[data-el-docked]');
        let ModulePanel = document.querySelector('.mDialog:not(.ds-none):not([data-el-docked])');

        if (DockedPanel) {
            // console.log("Docked Dialog found:", DockedPanel);
        }

        if (!ModulePanel) {
            // No undocked dialog available
            return;
        }
        // debug.log("Active undocked dialog:", ModulePanel);

        if (e.keyCode === 27) {
            var Dialog = MODULE_LIST[ModulePanel.id];
            if (Dialog) {
                if (typeof Dialog.closeDialog == 'function') {
                    debug.log('Dialog.closeDialog');
                    Dialog.closeDialog();
                } else if (typeof Dialog.CloseReStoreDialog == 'function') {
                    // ? hyper and orchid dialog
                    debug.log('Dialog.CloseReStoreDialog');
                    Dialog.CloseReStoreDialog(true);
                } else if (typeof Dialog.hide == 'function') {
                    debug.log('Dialog.hide');
                    // ? alert dialog
                    Dialog.hide();
                }
            } else {

                if (moduleSystem && typeof moduleSystem.closeOpenModule == "function") {
                    moduleSystem.closeOpenModule(e);
                }

                // Check what's currently open
                const openDialogs = dialogStateManager.getActiveDialog();
                if (openDialogs && ModulePanel.id) {
                    window.closeSingleDialog(ModulePanel.id);
                }

            }
        } else if (e.keyCode === 9) {
            var ElmFocus = function(focus, focusable) {
                if (!focus) {
                    return;
                }
                return (Array.from(focusable).indexOf(focus));
            };
            const IsEnable = function(next, focusable) {
                return (!next.hasAttribute('disabled')) && (!next.classList.contains('disabled'));
            };
            const IsLastElm = function(next, focusable) {
                return ElmFocus(next, focusable) === (focusable.length - 1);
            };
            const IsShift = function(index, shiftBoolean) {
                return (shiftBoolean ? index - 1 : index + 1);
            };
            var selector = {
                new: 'input:not([readonly],.ds-none,.disabled),button:not(.note-btn):not([disabled]),select:not(.ds-none),textarea:not(.note-codable),div.note-editable',
                old: 'input,button,select,textarea'
            };
            // &&ModulePanel.id!="NoteDialog"
            if (!ModulePanel.classList.contains('ds-none')) {
                var focusable = ModulePanel.querySelectorAll(selector.new);
                if (focusable.length) {
                    var first = focusable[0];
                    var last = focusable[focusable.length - 1];

                    const getVisibleElm = function(ee, focusable) {
                        var tarGet = ee.target;
                        var cur_focus = Array.from(focusable).indexOf(tarGet);
                        var IsLast = (focusable.length === (cur_focus + 1) ? true : false);
                        var IsFirst = (focusable[0] == tarGet ? true : false);
                        var IsShiftKey = ee.shiftKey;
                        var step = IsShift(cur_focus, IsShiftKey);
                        var next = (IsFirst && IsShiftKey ? last : (focusable[`${(cur_focus == -1 || IsLast || !step ? (0) : (step))}`]));
                        //var curfocusIndex =   ElmFocus(next,focusable);
                        var stepCount = 0;
                        //console.log([next.tagName,next.id,focusable.length,focusable]);
                        if (next && next.id == "apply_link") {
                            // console.log(next);
                        }
                        var combineCheck = commonMethods.IsVisibleElm(next) && IsEnable(next);
                        while (!combineCheck) {
                            // console.log(stepCount);
                            // if(next==focusable[0]){
                            //     next = focusable[focusable.length - 1];
                            // }
                            var step = IsShift(ElmFocus(next, focusable), IsShiftKey);
                            var nextStep = (focusable[0] == next && IsShiftKey ? (focusable.length - 1) : (step == -1 || focusable.length == step ? 0 : step));
                            next = focusable[nextStep];
                            // next=focusable[(ElmFocus(next,focusable)+1)];
                            stepCount++;
                            if (stepCount > focusable.length) {
                                break;
                            }
                            if (focusable.length == (ElmFocus(next, focusable) + 1)) {
                                next = (IsShiftKey ? focusable[focusable.length - 2] : next);
                            }
                            combineCheck = commonMethods.IsVisibleElm(next) && IsEnable(next);
                        }
                        return next;
                    };
                    if (shift) {
                        // shift-tab pressed on first input in dialog
                        if (e.target === first) {
                            // last.focus();
                            // e.preventDefault();
                        }
                        var focusElm = getVisibleElm(e, focusable);
                        // debug.log(focusElm);
                        focusElm.focus();
                        e.preventDefault();
                    } else {
                        // tab pressed on last input in dialog
                        if (e.target === last) {
                            let focusElm = getVisibleElm(e, focusable);
                            focusElm.focus();
                            // debug.log(focusElm);
                            e.preventDefault();
                        } else {
                            /* var curFocus = Array.from(focusable).indexOf(e.target);
                            var next = (focusable[`${curFocus==-1?('0'):(curFocus+1)}`]);
                            var stepCount = 0;
                            //console.log(curFocus+1);
                            console.log([next.tagName,next.id,ElmFocus(focusable,next),focusable.length,focusable]);
                            while (!commonMethods.IsVisibleElm(next)){
                                next=focusable[curFocus+1+1];
                                curFocus++;
                                stepCount++;
                                if(stepCount>focusable.length){
                                    break;
                                }
                            }
                            //console.log([next,next.id,nxtFocus(focusable,next),focusable.length]);
                            if(focusable.length==ElmFocus(focusable,next)){
                                // break;
                                next=first;
                            }
                            if(next){
                                next.focus();
                                e.preventDefault();
                            } */
                            var focusElm = getVisibleElm(e, focusable);
                            if (focusElm) {
                                // debug.log(focusElm);
                                if (focusElm.closest(".note-editable")) {
                                    if (document.activeElement != focusElm) {
                                        document.activeElement.blur();
                                    }
                                }
                                focusElm.focus();
                                e.preventDefault();
                            }
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('handleKey', err.message);
    }
}