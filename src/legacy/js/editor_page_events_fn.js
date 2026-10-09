console.log("editor-open-evetns");
var [lastrun, _CanClose, COM_QUERY_DIRTY, Glistofids] = [null, null, "", false, false, {}];

function _getLinkSessionInstance() {
    const Cls = window.LinkSessionModule || window.LinkSessionService;
    return Cls && typeof Cls.getInstance === 'function' ? Cls.getInstance() : null;
}

/** @deprecated Prefer module; kept for any late callers before globals settle. */
function getStorageTabIdKey() {
    const mod = _getLinkSessionInstance();
    return mod && typeof mod.getTabIdKey === 'function' ? mod.getTabIdKey() : 'xmleditor:tabid';
}

function syncEditorStorageAfterDocIdInit(docid) {
    const mod = _getLinkSessionInstance();
    if (mod && typeof mod.syncEditorStorageAfterDocIdInit === 'function') {
        return mod.syncEditorStorageAfterDocIdInit(docid);
    }
}

function getCurrentTabId() {
    const mod = _getLinkSessionInstance();
    if (mod && typeof mod.getCurrentTabId === 'function') {
        return mod.getCurrentTabId();
    }
    return String(sessionStorage.getItem(getStorageTabIdKey()) || '').trim();
}

function getCurrentSessionId() {
    const mod = _getLinkSessionInstance();
    if (mod && typeof mod.getCurrentSessionId === 'function') {
        return mod.getCurrentSessionId();
    }
    return String(typeof getSessionId === 'function' ? (getSessionId() || '') : '').trim();
}

function updateEditorSessionStorage(sessionId, docid, lastSavedTime, sessionStartTime) {
    const mod = _getLinkSessionInstance();
    if (mod && typeof mod.updateEditorSessionStorage === 'function') {
        return mod.updateEditorSessionStorage(sessionId, docid, lastSavedTime, sessionStartTime);
    }
}



if (typeof restoreSessionStorage === "function") {
    restoreSessionStorage();
}
syncEditorStorageAfterDocIdInit();

window.addEventListener("xmleditor:docid-initialized", function(event) {
    var docid = event && event.detail ? event.detail.docid : "";
    if (typeof restoreSessionStorage === "function") {
        restoreSessionStorage(docid);
    }
    syncEditorStorageAfterDocIdInit(docid);
});

commonfn.CURRENT_STATUS_POST = function(response, force = false, callback = "") {
    try {
        let showAlert = response.data.length != 0 || force;
        if (!showAlert && response.data && response.data[0]) {
            showAlert = response.data[0].status == "signoff";
        }
        if (window.FinalizeDialog && typeof FinalizeDialog.currentStage != "undefined" && FinalizeDialog.currentStage != "") {
            return debug.log("Finalize in progress, skipping status check.");
        }
        if (showAlert) {
            if (typeof AlertNewDialog != "undefined" && typeof AlertNewDialog.fire == "function") {
                AlertNewDialog.fire('SIGN_OFF_ReDIRECT').then((result) => {
                    if (result.isConfirmed) {
                        window._CanClose = true;
                        window.open("editor6TrackView.html?docid=" + DOC_ID, '_self');
                    } else {
                        RE_DIRECT_CUR_SESSION();
                    }
                });
            } else {
                setTimeout(() => {
                    commonfn.CURRENT_STATUS_POST(response, force, callback);
                }, 500);
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('CURRENT_STATUS_POST_' + callback, err.message);
    }
};

commonfn.UPDATE_DB = function(response, opt) {
    try {
        debug.log("UPDATE_DB" + JSON.stringify(response));
        if (response.r == 1) {} else if (response.r == 0) {
            // ErrorLogTrace('UPDATE_DB', response.m);
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('UPDATE_DB', err.message);
    }
};
commonfn.update_linkshare = function(response, opt) {
    try {
        debug.log(JSON.stringify(response));
        if (response.r == 1) {
            debug.log('Updated');
        } else {
            console.log('No Record Found');
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('update_linkshare', err.message);
    }
};

/**
 * @param node the element
 * @param class to validate the class aginst node e.g = 'math'
 * @param CheckParent to validate the class aginst node parent
 */
var hasDataName = (node, clas, Option) => {
    try {
        Option = Option ? Option : ({
            parentOnly: false
        });
        if (!node || !clas) return false;
        var [IsTrue, IsParentTrue, IsChildTrue] = [false, false, false];
        /* var IsParentTrue = false;
        var IsChildTrue = false; */
        node = (node.$) ? (node.$) : (node[0] ? node[0] : node);
        //node = CheckParent?node.parentElement:node;
        if (Array.isArray(clas)) clas = clas.join(',');
        clas.split(',').forEach((clssname, ind, arr) => {
            let className = clssname.indexOf('.') == 0 ? clssname.substring(1) : clssname;
            let parent = node.parentElement;
            if (!IsChildTrue) IsChildTrue = node.hasAttribute('data-name') && node.getAttribute('data-name') === className || node.classList.contains(className);
            if (!IsParentTrue) IsParentTrue = parent.hasAttribute('data-name') && parent.getAttribute('data-name') === className || parent.classList.contains(className);
        });
        // ? Modifyed by Yath 11-Apr-22
        IsTrue = (Option.parentOnly) ? IsParentTrue : (IsChildTrue ? IsChildTrue : ( /* IsParentTrue ? IsParentTrue : */ false));
        // debug.log("result: " + clas, IsTrue);
        return IsTrue;
    } catch (e) {
        console.warn(e.message);
        ErrorLogTrace('hasDataName', e.message);
    }
};
/** 
    @param Area get query element
    @param hasAttr check attribute available
    @param IsBooleanReturn Return attrbiute equals to value 
*/
const GET_TYPE_CONFIG_QUERY = (Area, hasAttr, option = {
    IsBooleanReturn: false,
    journalBased: false
}) => {
    try {
        let {
            IsBooleanReturn,
            journalBased
        } = option;

        let CONFIG = journalBased && J_CONFIG ? J_CONFIG : I_CONFIG;
        let query;

        if (CONFIG && CONFIG.querySelector(Area)) {
            query = Area;
        }

        var root = CONFIG.querySelector(query);
        if (!root) return false;

        var returnCK = hasAttr ? root.hasAttribute(hasAttr) && root.getAttribute(hasAttr) : root;
        if ([true, false].includes(IsBooleanReturn)) {
            returnCK = root.getAttribute(hasAttr) == IsBooleanReturn.toString();
        }
        return returnCK;
    } catch (err) {
        console.warn(err.message + Area);
        ErrorLogTrace('GET_TYPE_CONFIG_QUERY', err.message);
    }
};

function IsNodeContain(ePath, searchKey, returnId) {
    // ? Here return node id for validation purpose.
    try {
        if (!ePath || !searchKey) {
            return false;
        }
        const getElmentId = (el) => {
            return (el[0]) ? (el[0].id) : (el.id);
        };
        var reBoolean = false;
        const SEL = GlobalEditor.getSelection().getStartElement();
        if (ePath.blockLimit || ePath.block || ePath.lastElement) {
            let elmRoot = ePath.block ? (ePath.block.$) : ((ePath.lastElement.$ ? ePath.lastElement.$ : ePath.blockLimit.$));
            let hasData = hasDataName(elmRoot, searchKey, false);
            let elmParent = hasData ? elmRoot : $(elmRoot).parents(searchKey);
            let check = commonMethods.IsArray(elmParent) && elmParent.length > 0 || hasData ? true : false;
            return (returnId) ? (getElmentId(elmParent)) : (check);
        } else if (SEL) {
            let node = SEL.$.closest(searchKey);
            return (returnId) ? (node) : (getElmentId(node));
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('IsNodeContain==> ' + searchKey, err.message);
    }
}
window.IsItemAllowed = (el, options = {}) => {
    const co_role_key = 'showForCoRole';
    let DISABLE_DOMAIN = false;
    const RETURN = {
        "true": true,
        "false": false
    };

    const {
        submenu,
        check_co_role,
        entry
    } = options;

    try {

        // 🌐 Domain restriction
        if (el.hasAttribute('disable_domain')) {
            const DOM_ARR = el.getAttribute('disable_domain');
            DOM_ARR.split(',').forEach(domain => {
                if (DOMAIN_ROOT && DOMAIN_ROOT.match(domain)) {
                    DISABLE_DOMAIN = true;
                }
            });
        }

        const ROLE_BASED = el.hasAttribute(USER_INFO.SELECTOR_SHOW_HIDE);
        if (el.hasAttribute('show')) {
            let tempKey = ROLE_BASED ? USER_INFO.SELECTOR_SHOW_HIDE : 'show';
            if (check_co_role && el.hasAttribute(co_role_key)) {
                tempKey = co_role_key;
            }
            return IS_TEST_ENV ? true : RETURN[el.getAttribute(tempKey)] && !DISABLE_DOMAIN;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('IsItemAllowed', err.message);

    }
}
window.IsContextMenu = (id, options = {}) => {
    const {
        submenu,
        check_co_role,
        entry
    } = options;

    try {
        // Reload Guard
        if (!I_CONFIG) {
            const storageKey = `xmleditor:shared:${SHARED_KEY.docid}:config_missing`;
            const MAX_RETRY = 3;

            let retryCount = parseInt(localStorage.getItem(storageKey) || "0", 10);
            retryCount++;

            if (retryCount >= MAX_RETRY) {
                localStorage.removeItem(storageKey);
                if (typeof window.Invalid_Access === "function") {
                    window.Invalid_Access();
                }

                return false;
            }

            localStorage.setItem(storageKey, retryCount.toString());
            if (IS_LOCAL_HOST) debugger;
            window.location.reload();
            return false;
        }

        // Reset guard if config exists
        localStorage.removeItem(`xmleditor:shared:${SHARED_KEY.docid}:config_missing`);

        let TempConfig = I_CONFIG.querySelector(`[name="${id}"]`);
        if (!TempConfig) return false;

        // 🔎 Sub-journal resolution
        const sub_Menu = TempConfig.querySelector("sub-journal");
        if (sub_Menu) {
            if (!SHORT_II_TITLE && SHARED_KEY && SHARED_KEY.titleinfo && SHARED_KEY.titleinfo.cover) {
                SHORT_II_TITLE = SHARED_KEY.titleinfo.cover;
            }

            const tempJ = I_CONFIG.querySelector(`[short="${SHORT_II_TITLE}"]`);
            if (tempJ && tempJ.getAttribute("sub-journal") === sub_Menu.getAttribute("type")) {
                TempConfig = sub_Menu;
            }
        }

        if (entry) return TempConfig || {};

        // Role-based logic
        const result = IsItemAllowed(TempConfig, options);
        if (result) return result;

        // Default: admin/test handling
        return IS_TEST_ENV ? true : false;

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('IsContextMenu', err.message);
        return false;
    }
};



function ShowTrackOnOff(ths) {
    try {
        var IsHide = ths.classList.contains('hide') ? (true) : (false),
            Img = ths.querySelector('img'),
            IsSrc = IsHide ? ('ON') : ('OFF');
        ths.classList[IsHide ? ('remove') : ('add')]('hide');
        GlobalEditor.document.$.body.classList[IsHide ? ('remove') : ('add')]('TrackOff');
        Img.src = `assets/images/svg/mainPage/MenuTrack${IsSrc}.svg`;
    } catch (err) {
        ErrorLogTrace('ShowTrackOnOff', err.message);
        console.log(err.message);
    }
}


function newEleTrack(type, sTime, oTime, delTxt) {
    if (oTime == undefined || oTime == null) {
        oTime = sTime ? sTime : (new Date()).getTime();
    }
    var cid = commonMethods.Get_CID();
    let sTemp = $('<' + type + '>', {
        // IMPACT RECORD THE ROLE DETAILS Formatting TAG BY DR 12-06-2024
        // ? 2729362	Display contributor role as Reviewer name
        attr: {
            class: TRACK_CONFIG[type]['class'] + '-' + lite_userId,
            'data-changedata': '',
            'data-cid': cid,
            'data-del-val': delTxt,
            'data-last-change-time': oTime,
            'data-time': sTime + Math.floor(Math.random() * 10),
            'data-userid': lite_userId,
            'data-username': USER_INFO.MAIL_ID,
            'data-rolename': USER_INFO.TRACK_ROLE_NAME
        }
    });
    return sTemp;
}

function GetTrackTag(ths, newText, delTxt, Options = {}) {
    try {
        var sTime = (new Date()).getTime(),
            oTime, tag, lDelTemp, lInsTemp, type;
        if ((ths == 'delDom') || (ths == 'insDom')) {
            if (delTxt == undefined) {
                (delTxt = 'dummy');
            }
            type = (ths.indexOf('del') == -1) ? ('insert') : ('del');
            lInsTemp = window.newEleTrack(type, sTime, oTime, delTxt);
            if (delTxt == 'dummy') {
                $(lInsTemp).removeAttr('data-del-val');
            }
            return lInsTemp;
        }
        if (((typeof ths) == 'object') && (newText && newText != 'delOnly')) {
            if ($(ths).parent().prop('tagName') != 'INSERT') {
                var tChild = $(ths).children();
                if (tChild.length > 0) {
                    // ? Here Adding more condition for Books Notes Renumbering
                    for (let i = 0; i < tChild.length; i++) {
                        let element = tChild[i],
                            _IsCheck = ['SUP', 'SPAN'].includes(element.tagName);
                        if (_IsCheck) {
                            let Attr = element.parentElement.getAttribute((element.tagName == 'SUP') ? ('ref-type') : ('fn-type'));
                            if (['endnote', 'footnote', 'table-fn', 'fn'].includes(Attr) && (element.firstElementChild)) {
                                element = element.firstElementChild;
                            }
                        }
                        tag = element.tagName;
                        if (tag == 'INSERT') {
                            // uName = element.getAttribute('data-username');
                            oTime = element.getAttribute('data-time');
                            // change time restore
                            delTxt = element.hasAttribute('data-del-val') ? (element.getAttribute('data-del-val')) : (delTxt);
                            if (delTxt != newText) {
                                lInsTemp = window.newEleTrack('insert', sTime, oTime, delTxt).text(newText);
                            } else {
                                lInsTemp = newText;
                            }
                        } else if (!IS_JOURNAL && _IsCheck || IS_JOURNAL) {
                            lInsTemp = window.newEleTrack('insert', sTime, oTime, delTxt).text(newText);
                        }
                    }
                } else {
                    lInsTemp = window.newEleTrack('insert', sTime, oTime, delTxt).text(newText);
                    if ($(ths).parent().prop('tagName') == 'INSERT') {
                        lInsTemp = $(lInsTemp).removeAttr('data-del-val');
                    }
                    // ? 14_APR_2023 - SIVA - REQUIREMENT FOR SEPARATE TRACKING FOR AUTO RENUMBER
                    if (Options.reorder || Options.type) {
                        lInsTemp.attr("data-auto-insert", Options.type ? Options.type : "reorder");
                    }
                }
            } else lInsTemp = newText;
            return lInsTemp;
        } else if (((typeof ths) == 'object') && (newText == 'delCite') || (newText == 'insCite')) {
            lInsTemp = window.newEleTrack('insert', sTime, oTime, delTxt);
            return lInsTemp;
        } else if (((typeof ths) == 'string') && (newText == 'del') || (newText == 'insert')) {
            lDelTemp = window.newEleTrack(newText, sTime, oTime, delTxt).append(ths);
            if (newText == 'insert') {
                $(lDelTemp).removeAttr('data-del-val');
            }
            return lDelTemp;
        } else if (((typeof ths) == 'object') && (newText == 'delOnly')) {
            delTxt = 'empty';
            var thsChild = (ths[0] != undefined) ? (ths[0].innerHTML) : (ths.innerHTML);
            lDelTemp = window.newEleTrack('del', sTime, oTime, delTxt);
            $(lDelTemp).append(thsChild);
            $(ths).html('').append($(lDelTemp).removeAttr('data-del-val'));
            let ins = $(ths).find('insert');
            if (ins.length > 0 && ins[0].hasAttribute('data-del-val')) {
                ins[0].parentElement.innerHTML = ins[0].getAttribute('data-del-val');
            }
            return ths;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('GetTrackTag', err.message);
    }
}

function GENERATE_ID(sec, int) {
    try {
        var Id;
        var count = null,
            countBool = false,
            new_id = null,
            tempCount = int != undefined ? int : 1;
        if (![undefined, null, "undefined", "null", ""].includes(sec)) {
            let find = `[data-levels="${sec}"]`,
                last = 0,
                splitLen = 0,
                lastId = null;
            count = GlobalEditor.document.find(`div.sec${IS_JOURNAL ? ('') : (find)}`);
            countBool = count.$.length > 0 ? true : false;
            if (countBool) {
                last = count.$.length - 1;
                lastId = count.$[last].id;
                splitLen = lastId.split('_').length;
                // new_id = parseInt(lastId.split('s')[1])+tempCount;
                //split_id = lastId.split('s')[1];
                new_id = (lastId.split('s')[1] + tempCount);
            } else {
                new_id = '001';
            }
            Id = (IS_JOURNAL) ? ('s' + (new_id + s4())) : (`sec${sec}-n` + d4());
        } else {
            Id = ('IMP2-' + s4());
        }
        var test = GlobalEditor.document.getById(Id);
        if (test != null) {
            if (sec == undefined) {
                GENERATE_ID();
            } else {
                tempCount++;
                Id = GENERATE_ID(sec, tempCount);
            }
        }
        return Id;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('GENERATE_ID', err.message);
    }
}


function showTrackReadOnly() {
    // ? Open Show Revision in new tab
    try {
        window.open("editor6TrackView.html?docid=" + DOC_ID, '_blank');
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('showTrackReadOnly', err.message);
    }
}

function Show_TOC_Query_Panel(div) {
    // ?  event from editor6 html file
    try {
        // $('.query-div').length;
        var _allCount = document.querySelectorAll(`.query-div ${'btn_qry' == div.id ? ('') : ('[data-status="note"]')}`).length;
        // ,'btn_cts'
        if (['btn_qry'].includes(div.id) && _allCount == 0) {
            return false;
        }
        if (!div.classList.contains('active')) {
            div.classList.add('active');
            $(div).siblings().removeClass('active');
            ['toc_panel', 'query_panel', 'comment_panel'].forEach((id, index, Arr) => {
                document.getElementById(id).classList[(div.getAttribute('data-panel') == id.split('_')[0]) ? ('add') : ('remove')]('active');
            });
            document.getElementById('btn_toc').classList[(div.id == 'btn_cts') ? ('add') : ('remove')]('rborder');
            if (div.id == 'btn_qry') {}
        }
    } catch (err) {
        ErrorLogTrace('Show_TOC_Query_Panel', err.message);
        console.warn(err.message);
    }
}

function ShowQueryByStatusInPanel(Area) {
    // ?  event from editor6 html file
    try {
        if (window.queryModule && window.queryModule.panelModule && typeof window.queryModule.panelModule.filterQueries === "function") {
            window.queryModule.panelModule.filterQueries(Area.getAttribute('data-shown'), Area);
            return;
        }

        var shown = Area.getAttribute('data-shown') == 'open' ? 'open' : 'all';
        Area.parentElement.querySelectorAll('.NG_Color').forEach((el) => {
            el.classList.remove('NG_Color');
        });
        Area.classList.add('NG_Color');
        document.querySelectorAll('.query-list,.comment-list,#query_panel,#comment_panel').forEach((el) => {
            el.setAttribute('data-shown', shown);
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('ShowQueryByStatusInPanel', err.message);
    }
}

function message_broadcast(message) {
    // ? 12-DEC_22 - MULTI TAB OPEN ACTION_PREVENT
    try {
        console.log("setting message");
        localStorage.setItem('message', JSON.stringify(message));
        localStorage.removeItem('message');

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('message_broadcast', err.message);
    }
}

function message_receive(ev) {
    try {
        //  ? ignore other keys
        if (ev.originalEvent.key != 'message') return;
        var message = JSON.parse(ev.originalEvent.newValue);
        // ? ignore empty msg or msg reset
        if (!message) return;
        console.log(message);
        // ? HANDLE MESSAGE COMMED BASE
        let SESS_ID = getSessionId();
        if (message.docid == DOC_ID) {
            if (message.comment == 'NEW_TAB_DIFF_BROW') {

            } else if (message.comment == 'NEW_TAB_OPEN_SAME_BROW') {
                _CanClose = true;
            } else if (message.comment == "CLOSE_REDIRECT_OLD_TAB") {
                // ? DIFFER BRWOSER - WE CAN REMOVE LOCAL ITEMS - IF SAME - IGNRE TO REMOVE
                RE_DIRECT_CUR_SESSION(null, {
                    remove: false
                });
            }
            // ? POST SHARE NEW SEESION WILL IN NEW TAB
            if (!message.session_id) {
                if (SESS_ID) {
                    let clone_msg = Object.assign({}, message, {});
                    clone_msg.comment = "GET_SESSION_ID";
                    clone_msg.session_info = JSON.stringify(sessionStorage);
                    clone_msg.uid = (new Date().getTime()) + Math.random();
                    /* 
                    'docid': DOC_ID,  "comment": "NEW_TAB_OPEN",  'uid': (new Date().getTime()) + Math.random(), "session_id": sessionStorage.getItem(getSessionIdKey(DOC_ID))
                    */
                    message_broadcast(clone_msg);
                }
                // ? SET SESSION STORAGE INFORMATION FROM ANOTHER TAB 
                if (message.comment == "GET_SESSION_ID") {
                    sessionStorage = Object.assign(sessionStorage, JSON.parse(message.session_info));
                }
            }
        } else {}
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('message_receive', err.message);
    }
}

function STOP_ALL_EVENT_TIMERS(Options = {}) {
    try {
        // Wait until dependencies are ready
        if (
            typeof IMPACT_SAVE === "undefined" ||
            typeof CHECK_REQUEST === "undefined" ||
            !GlobalEditor ||
            !GlobalEditor.document
        ) {
            setTimeout(function() {
                STOP_ALL_EVENT_TIMERS(Options);
            }, 1000);
            // <-- important, prevent running further until ready
            return;
        }

        // Cancel save timers
        if (typeof IMPACT_SAVE !== "undefined" && IMPACT_SAVE.cancel) {
            IMPACT_SAVE.cancel();
        }

        // Cancel request timers
        if (typeof CHECK_REQUEST !== "undefined") {

            if (typeof CHECK_REQUEST.StopAll === "function") {
                CHECK_REQUEST.StopAll();
            }
        }



        // Pause paraLock events (if available)
        if (typeof paraLock !== "undefined" && paraLock._pauseEvents) {
            paraLock._pauseEvents();
        }

        // Set editor as read-only
        if (GlobalEditor && typeof GlobalEditor.setReadOnly === "function") {
            // pass true explicitly
            GlobalEditor.setReadOnly(true);
        }

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace("STOP_ALL_EVENT_TIMERS", err.message);
    }
}



$(window).on('storage', message_receive);

$(window).click(function(e) {
    // ? Humbugger menu options
    if ((($('#iTOC_Section').attr('style')) == undefined) || (($('#iTOC_Section').attr('style')) == '')) {
        if (($('#viewoptn').attr("class")) != 'menu-items show') {
            if ($("#iEditorSection").is(".col-lg-6 .col-md-6 .col-sm-6 .col-12")) {
                $("#ck-menus").addClass("justify-content-lg-center");
            }
        }
    }
    let track_history = document.querySelector('.track-history');
    if (commonMethods.IsVisibleElm(track_history)) {
        let IsOverFlow = commonMethods.isOverflown(track_history);
        track_history.setAttribute("style", 'margin-right', IsOverFlow ? '-7px' : '0px');
    }
});
$(document)
    // ? console.info("done: " + e.type);
    .on('mouseenter mouseleave', "#filesaving, #GenaratePDF", function(e) {
        if ($(this).attr('data-time') != undefined || $(this).attr('data-time') != null) {
            var showTitle = (this.id == "filesaving") ? ('Click to save changes; Auto-save is ON; Last saved ') : ('Proof PDF Initiated ');
            // ? diffYMDHMS(parseInt($(this).attr('data-time')))
            var oTime = moment(parseInt($(this).attr('data-time'))).fromNow();
            $(this).attr('title', showTitle + oTime);
        } else {
            $(this).attr('title', (this.id == "filesaving") ? ('Save') : ('Regenerate Proof PDF'));
        }
        // ? TOC Move hover function
    })

    // ?console.info("done: " + e.type);
    .on('mouseenter mouseleave', "#ck-menus button", function(e) {
        $(this).parent().parent().siblings().find('.show').removeClass('show');
    })
    // ?console.info("done: " + e.type);
    .on('mouseenter', "#iuser_Name", function(e) {
        if ($(this).attr('title') == undefined) {
            $(this).attr('title', USER_INFO.ROLE_NAME);
        }
    })
    .on({
        mouseenter: function(e) {
            var newSrc, src = $(this).attr('src');
            if (this.hasAttribute('disabled') || this.parentNode.hasAttribute('disabled')) {
                return;
            }
            newSrc = (src.indexOf('2') == -1) ? src.replace(/\_0/, "").replace(/\./g, "\_2\.") : src;
            $(this).attr('src', newSrc);
        },
        mouseleave: function(e) {
            var newSrc, src = $(this).attr('src');
            if (this.hasAttribute('disabled') || this.parentNode.hasAttribute('disabled')) {
                // return;
            }
            if (($(this).hasClass('icons-new')) && ($(this).parent().hasClass('active'))) {
                newSrc = src;
            } else {
                newSrc = src.replace(/\_2\./g, "\.");
            }
            $(this).attr('src', newSrc);
        }
    }, '.small-icons-pdf-menu, .icons-new, .note_img, .n-class, .im-help-size, .n_Img, #userId_Logout, #userIdLogo, #final_img')
    .ready(function(e) {
        if (IS_TRACK_VIEW) {
            return;
        }
        $("#view-dialog").find('.view-drop-img-both').addClass('active');
        $('#closetc').on('click', function(e) {
            document.getElementById('popupdiv').classList.add('ds-none');
        });
        $('div.dropdown').on('click', function(evt) {
            evt.stopPropagation();
        });
        // ? View Options to change ck menu buttons Left side
        $("#btn-view, #view-dialog").click(function(e) {
            if ((($('#iTOC_Section').attr('style')) == undefined) || (($('#iTOC_Section').attr('style')) == '')) {
                if (($('#viewoptn').attr("class")) == 'menu-items show') {
                    if ($("#iEditorSection").is(".col-lg-6, .col-sm-6, .col-md-6, .col-6")) {
                        $("#ck-menus").addClass("justify-content-lg-center");
                    }
                } else {
                    $("#ck-menus").removeClass("justify-content-lg-center");
                }
            }
            var myck = $("#view-dialog").find('.view-drop-img-both');
            if (myck.hasClass('active')) {
                $('div.pop_up').removeClass('singleviewpopup');
            } else {
                $('div.pop_up').addClass('singleviewpopup');
            }
        });
        $('.dropdown-submenu a.test').on("click", function(e) {
            $(this).next('ul').toggle();
            e.stopPropagation();
            e.preventDefault();
        });
    });
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

            // Reply only for another tab with same document.
            var requestDocId = parsedValue && parsedValue.docid ? parsedValue.docid : null;
            var requestTabId = parsedValue && parsedValue.tabId ? parsedValue.tabId : null;
            var currentTabId = getCurrentTabId();
            if (requestDocId == DOC_ID && requestTabId && requestTabId !== currentTabId) {
                localStorage.page_available = JSON.stringify({
                    docid: DOC_ID,
                    requestTabId: requestTabId,
                    responderTabId: currentTabId,
                    ts: OPEN_TIME
                });
            }
        }
        if (e.key == "page_available" && !IS_TRACK_VIEW) {
            var isSameDocReply = false;

            if (parsedValue && parsedValue.docid == DOC_ID) {
                // Handle only replies meant for this exact tab.
                var thisTabId = getCurrentTabId();
                isSameDocReply = parsedValue.requestTabId === thisTabId && parsedValue.responderTabId && parsedValue.responderTabId !== thisTabId;
            } else if (e.url && e.url.indexOf('?') > -1 && e.url.split('?')[1].indexOf('docid') > -1) {
                // Backward compatibility for older non-JSON payloads.
                var Open_Page_DOC_ID = e.url.split('=')[1];
                if (Open_Page_DOC_ID && Open_Page_DOC_ID.indexOf('#') > -1) {
                    Open_Page_DOC_ID = Open_Page_DOC_ID.slice(0, -1);
                }
                isSameDocReply = Open_Page_DOC_ID == DOC_ID && e.url.lastIndexOf('TrackView') == -1;
            }

            if (isSameDocReply) {
                //&&(OPEN_TIME==e.newValue)
                console.warn('One more tab already open');
                let cur_sess_id = sessionStorage.getItem(getSessionIdKey(DOC_ID));
                message_broadcast({
                    'docid': DOC_ID,
                    "comment": "NEW_TAB_OPEN_SAME_BROW",
                    'uid': (new Date().getTime()) + Math.random(),
                    "session_id": cur_sess_id
                });
                let json = {
                    session_id: cur_sess_id,
                    r: 0,
                    same_browser: true
                };
                setTimeout(function(json) {
                    commonfn.new_session_post(json);
                }, 2500, json);
            } else {
                //  ? 13_DEC_22 - YA  - AFTER IDLE_SIGN_OUT_REFRESH
                let status = sessionStorage.getItem("status");
                if (sessionStorage.length > 0 && status == "idle_session_sign_off" && !IS_LOCAL_HOST) {
                    RE_DIRECT_CUR_SESSION(null, {
                        remove: false
                    });
                }
            }
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('addEventListener-storage', err.message);
    }
}, false);

window.onresize = function(e) {
    try {
        console.log(`"INNER_HEIGHT": ${window.innerHeight},"INNER_WIDTH": ${window.innerWidth}`);



    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('onresize', err.message);
    }
};
window.onbeforeunload = function(e) {
    try {
        // ? https://stackoverflow.com/questions/11835217/is-there-a-callback-for-cancelling-window-onbeforeunload
        const initialDialogLoading = typeof InitialLoadDialog !== "undefined" && InitialLoadDialog && !InitialLoadDialog.FullyLoaded;
        const editorReadyForUnload = typeof GlobalEditor !== "undefined" && GlobalEditor && typeof GlobalEditor.checkDirty === "function";
        const isEditorDirty = editorReadyForUnload ? GlobalEditor.checkDirty() : false;

        if (initialDialogLoading) {
            sessionStorage.setItem(`xmleditor:${DOC_ID}:isRefresh`, "1");
            return;
        }

        if (!_CanClose || isEditorDirty || _IsDirty) {
            if (IS_LOCAL_HOST) {
                console.log([!_CanClose || isEditorDirty || _IsDirty]);
                console.log("CHECK_DIRECT_CONSOLE");
            }
            setTimeout(function() {

                // commonfn.callajax(GET_JSON('linksharing', {process: "close"}), 'funreturn', API_LINK_SHARE);

                if (typeof IMPACT_SAVE !== "undefined" && IMPACT_SAVE && typeof IMPACT_SAVE.iSave === "function") {
                    IMPACT_SAVE.iSave({
                        forcesave: true,
                        noalert: true
                    });
                }
                //LOG_OUT.fire();
            }, 1000);
            return "Did you save your stuff?";
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('onbeforeunload', err.message);
    }
};
window.iGetFragment = (_String, Options = {}) => {
    /* 
        ! THIS FUNCTION THE RETURN DOM EITHER FRAGMENT ELEMENT
            ? 1) IF NO - PARAMETER CREATE FRAGMENT AND RETURN
            ? 2) IF PARAMETER COMES WITH TAG NAME - RETURN ELEMENT WITH APPEND WITH FRAG DATA
    */
    try {
        let frag = document.createRange().createContextualFragment(_String);
        if (Object.keys(Options).length == 0) {
            return frag;
        } else if (Options.tag) {
            let elm = document.createElement(Options.tag);
            elm.append(frag);
            return elm;
        } else return frag;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('iFragment', err.message);
    }
};

window.PasteFilter = {
    formatTagArr: ['bold', 'strong', 'b', 'em', 'italic', 'i', 'sup', 'u', 'sub', 'super', 'subscript', 'superscript', 'sc', 'smallcaps', 'underline'],
    excludeNode: ['caption', 'title'],
    retain: ['text-decoration', 'font-style', 'font-weight', 'vertical-align'],
    replace_info: {
        "font-weight": {
            class: "bold",
            tag: "strong"
        },
        "font-style": {
            class: "italic",
            tag: "em"
        },
        "text-decoration": {
            class: "underline",
            tag: "u"
        },
        "vertical-align": {
            "text-top": {
                class: "superscript",
                tag: "sup"
            },
            "super": {
                class: "superscript",
                tag: "sup"
            },
            "text-bottom": {
                class: "subscript",
                tag: "sub"
            },
            "sub": {
                class: "subscript",
                tag: "sub"
            }
        },
    },
    SPACE: ' ',
    replace_empty_values: ['&nbsp;&nbsp;', '  ', '  ', '\\n\\n', '\\n'],
    // 'br', remove br for retain
    remove_elm_tags: ['style', 'script'],
    empty_values: ['&nbsp;', '', ' '],
    tagsAsString: {
        "\\\\&quot;": '"',
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "\\x3C;": "<"
    },
    escape_entity: ['\\u[a-fA-F0-9]{4}', '\\x[a-fA-F0-9]{2}', '\\(?:[1-7][0-7]{0,2}|[0-7]{2,3})'],
    default_params: {
        event_from: null,
        plain_text: false,
        setData: false,
        e: {}
    },
    Handling_Formatting_From_Attributes: function(elem, Options = {}, _ = PasteFilter) {
        const {
            retainNode
        } = Options;
        try {
            if (elem.style.display != '' && elem.style.display == "none") {
                commonMethods.removeEl(elem);
            } else {
                var Styles = elem.getAttribute('style'),
                    StylesArr = [],
                    IsQuery = (_.Option && _.Option.event_from && /query/gi.test(_.Option.event_from));
                if (!Styles) return;
                Styles.split(";").forEach(el => {
                    if (!el) return;
                    var [property, value] = el.split(":");
                    property = property.trim();
                    var index = property.indexOf(`"`);
                    if (index > -1) property = property.slice(1);
                    if (_.retain.includes(property)) {
                        value = value.trim();
                        if (property == _.retain[2] && !isNaN(value)) {
                            if (Number(value) > 400) {
                                value = 'bold';
                            } else return;
                        } else if (_.retain.indexOf(property) > -1 && value.match(/normal|none|inherit/gi) != null) {
                            return;
                        }
                        // ? replace impact attributes
                        let iAttr = _.replace_info[property];
                        if (iAttr) {
                            debug.log(iAttr);
                            if (typeof iAttr.class != "undefined") {
                                debug.log(iAttr);
                            } else if (iAttr[value] && iAttr[value].class) {
                                debug.log(iAttr[value]);
                                iAttr = iAttr[value];
                            } else {
                                return;
                            }
                            if (iAttr.tag) {
                                let content = elem.innerHTML;
                                if (!elem.hasAttribute('style')) content = elem.outerHTML;
                                let newFrag = iGetFragment(content, {
                                    tag: iAttr.tag
                                });

                                // ? 23_MAR_2024_YA

                                if (elem.parentElement) {
                                    if (retainNode) {
                                        elem.innerHTML = "";
                                        elem.append(newFrag);
                                    } else {
                                        elem.after(newFrag);
                                        let next = elem.nextElementSibling;
                                        commonMethods.removeEl(elem);
                                        elem = next;
                                    }
                                } else {

                                }
                            } else if (iAttr.class) {
                                //elem.setAttribute("data-name", iAttr.class);
                            }
                        } else {
                            StylesArr.push(`${property}: ${value}`);
                        }
                    } else if (property) elem.style.removeProperty(property);
                });
                elem[StylesArr.length ? 'setAttribute' : 'removeAttribute']('style', StylesArr.join(';'));
            }
            _.checkRemoveAttribute(elem);
        } catch (err) {
            this.ErrorEvent = true;
            console.warn(err.message);
            ErrorLogTrace('Handling_Formatting_From_Attributes', err.message);
        }
    },
    check_NSNB: function(NODE, _ = PasteFilter) {
        try {
            var loop = 0;
            var IsElm = NODE.nodeType == 1 ? true : false;
            var value = IsElm ? NODE.outerHTML : NODE.nodeValue;
            this.replace_empty_values.forEach((item, idx, arr) => {
                while (value.indexOf(item) > 0) {
                    value = value.split(item).join(' ');
                    if (IsElm) NODE.innerHTML = value;
                    else NODE.nodeValue = value;
                    if (loop > 10) {
                        console.log('break_' + loop);
                        break;
                    } else loop++;
                }
            });
            if (value.indexOf('<!--') > -1 && value.indexOf('-->') > -1) {
                let dom = document.createElement('span');
                dom.innerHTML = value;
                if (this.empty_values.includes(dom.textContent) || dom.textContent != value || dom.firstChild.nodeType == 8 && dom.children.length == 0) {
                    value = '';
                }
            }
            return value;
        } catch (err) {
            this.ErrorEvent = true;
            console.warn(err.message);
            ErrorLogTrace('check_NSNB', err.message);
        }
    },
    IsCitationAvailable: false,
    Check_InnerHTML: function(NODE, _ = PasteFilter) {
        try {
            var IsEmtpy = this.empty_values.includes(NODE.innerHTML) || this.empty_values.includes(NODE.textContent);
            var [Parent, IsRemoved] = [NODE.parentElement, false];
            // ? 16_NOV_22 - 
            if (Parent && this.eventhandler != "copy") {
                NODE.outerHTML = IsEmtpy ? this.SPACE : this.check_NSNB(NODE);
                if (Parent.innerHTML == this.SPACE) {
                    if (Parent.parentElement) {
                        Parent.outerHTML = this.SPACE;
                    }

                }
            } else if (IsEmtpy) {
                commonMethods.removeEl(NODE);
                IsRemoved = true;
            }
        } catch (err) {
            this.ErrorEvent = true;
            console.warn(err.message + NODE.innerHTML);
            ErrorLogTrace('Check_InnerHTML', err.message + NODE.innerHTML);
        }
    },
    node2Text: function(el, _ = PasteFilter) {
        try {
            const tagLower = el.tagName.toLowerCase();
            const tagUpper = el.tagName.toUpperCase();
            const dataName = el.getAttribute('data-name');
            const parent = el.parentNode;
            const first = parent ? parent.firstElementChild : null;
            const last = parent ? parent.lastElementChild : null;

            // ? Handle special items for formulas
            if (/-formula/i.test(el.className) || el.closest(".disp-formula,.inline-formula") || tagLower == "br") {

                if (tagLower === "br") {
                    if ((first && el === first) || (last && el === last)) {
                        commonMethods.removeEl(el);
                    }
                    // Remove all attributes from <br>
                    while (el.attributes.length > 0) {
                        el.removeAttribute(el.attributes[0].name);
                    }
                }
                return;
            }

            if (tagUpper === "DEL") {
                commonMethods.removeEl(el);
                return;
            }

            // Remove user comment box span
            if (el.hasAttribute('data-user-comment-box') || el.getAttribute('data-class') === "ckcommentsfull") {
                commonMethods.removeEl(el);
                return;
            }

            // Handle special span with data-label or ckcommentsfull
            if (el.hasAttribute('data-label') || _.excludeNode.includes(dataName) || el.hasAttribute('data-levels')) {
                _.Check_InnerHTML(el);
                return;
            }

            // Remove form-related tags
            const formTags = ['input', 'label', 'select', 'button', 'fieldset', 'legend', 'datalist', 'output', 'option', 'optgroup', 'textarea', 'title'];

            if (formTags.includes(tagLower)) {
                if (tagLower === 'textarea') _.Check_InnerHTML(el);
                commonMethods.removeEl(el);
                return;
            }

            // Handle elements with data-css
            if (el.hasAttribute('data-css')) {
                const cssType = el.getAttribute('data-css');
                if (cssType === "ice-format") {
                    [...el.attributes].forEach(attr => el.removeAttribute(attr.name));
                } else if (cssType === "ice-reformat") {
                    _.Check_InnerHTML(el);
                }
                return;
            }


            // Handle formatting tags and tables
            if (_.formatTagArr.includes(tagLower) || ['table', 'td', 'tr', 'thead'].includes(tagLower)) {
                el.getAttribute('style') ? _.Handling_Formatting_From_Attributes(el) : _.checkRemoveAttribute(el);
                return;
            }
            if (/^(INSERT|SPAN|DIV)$/i.test(tagUpper)) {
                _.checkRemoveAttribute(el);
                _.Check_InnerHTML(el);
                return;
            }

            // Handle styled elements
            if (el.getAttribute('style')) {
                _.checkRemoveAttribute(el);
                return;
            }

            // Handle anchor tags with reference
            if (tagLower === 'a' && !['query'].includes(this.eventhandler) && !['copy'].includes(this.e.name)) {
                const valid = this.valid_xref();
                if (el.hasAttribute('rid') && valid) {
                    const r = s4();
                    commonMethods.SET_REMOVE_ATTR(el, {
                        "data-paste-id": r
                    }, ['zrid', 'ztxt']);

                    if (['query', 'copy'].includes(this.eventhandler) || ['copy'].includes(this.e.name)) return;

                    this.IsCitationAvailable = el.getAttribute('ref-type') === 'bibr';
                    this.Paste_Cite = {
                        id: r,
                        rid: el.getAttribute('rid'),
                        type: el.getAttribute('ref-type')
                    };
                } else {
                    _.Check_InnerHTML(el);
                }
                return;
            }

            // Default case
            _.checkRemoveAttribute(el);
            _.Check_InnerHTML(el);
        } catch (err) {
            this.ErrorEvent = true;
            console.warn(err.message);
            ErrorLogTrace('node2Text', err.message + el.innerHTML);
        }
    },
    checkRemoveAttribute: function(el, _ = PasteFilter) {
        try {
            if (el.getAttribute('style') !== null) {
                this.Handling_Formatting_From_Attributes(el);
            }
            let loop = 1,
                tag = el.tagName,
                dataName = el.dataset.name || null;
            // ? 01_AUG_2024 - SRINI REQUEST
            while (el.attributes.length > 0) {
                for (var i = 0; i < el.attributes.length; i++) {
                    var attrib = el.attributes[i],
                        IsXref = ['data-name', 'href', 'target', 'rel', 'xlink:href'].includes(attrib.name) && /^a/gi.test(tag),
                        IsFormat = (/strong|em|sup|sub|sc/gi.test(tag) || /strong|em|sup|sub|sc/gi.test(dataName)),
                        isValid = IsFormat || IsXref;
                    if ((!isValid || isValid && this.Option && this.Option.event_from == "query") && attrib.name != 'style') {
                        debug.log("remove attribute ==>" + attrib.name);
                        el.removeAttribute(attrib.name);
                    }
                }
                if (loop > 5) break;
                else loop++;
            }
            if (el.getAttribute('style') == null) _.Check_InnerHTML(el);
        } catch (err) {
            this.ErrorEvent = true;
            console.warn(err.message);
            ErrorLogTrace('checkRemoveAttribute', err.message);
        }
    },
    _lastTextChar: function(node) {
        try {
            const text = node ? (node.textContent || node.nodeValue || '') : '';
            const match = String(text).match(/\S\s*$/);
            return match ? match[0].trim().slice(-1) : '';
        } catch (err) {
            return '';
        }
    },
    _firstTextChar: function(node) {
        try {
            const text = node ? (node.textContent || node.nodeValue || '') : '';
            const match = String(text).match(/^\s*\S/);
            return match ? match[0].trim().charAt(0) : '';
        } catch (err) {
            return '';
        }
    },
    _endsWithWhitespace: function(node) {
        try {
            const text = node ? (node.textContent || node.nodeValue || '') : '';
            return /\s$/.test(String(text));
        } catch (err) {
            return false;
        }
    },
    _startsWithWhitespace: function(node) {
        try {
            const text = node ? (node.textContent || node.nodeValue || '') : '';
            return /^\s/.test(String(text));
        } catch (err) {
            return false;
        }
    },
    shouldInsertUnwrapSpace: function(el, _ = PasteFilter) {
        try {
            if (!el) return false;
            const prevChar = _._lastTextChar(el.previousSibling);
            const firstChildChar = _._firstTextChar(el.firstChild);
            const nextChar = _._firstTextChar(el.nextSibling);
            const closingPunctuation = /^[,.;:!?)]}”’"']$/;

            if (!prevChar || !firstChildChar) return false;
            if (_._endsWithWhitespace(el.previousSibling)) return false;
            if (_._startsWithWhitespace(el.firstChild)) return false;
            if (closingPunctuation.test(firstChildChar)) return false;
            if (closingPunctuation.test(nextChar)) return false;
            if (/^[([{“‘"']$/.test(prevChar)) return false;

            return /[\p{L}\p{N}]$/u.test(prevChar) && /^[\p{L}\p{N}]/u.test(firstChildChar);
        } catch (err) {
            return false;
        }
    },
    after_append_remove: function(el, canAddSpace = false, canAddLine = false, _ = PasteFilter) {
        try {
            const separator = canAddLine ? document.createElement("br") : (canAddSpace && _.shouldInsertUnwrapSpace(el) ? " " : "");
            el.after(separator, ...el.childNodes);
            commonMethods.removeEl(el);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('after_append_remove', err.message);
        }
    },
    table_2_text(table, _ = PasteFilter) {
        try {
            let formattedText = [];

            table.querySelectorAll("tr").forEach(row => {
                let rowText = [];
                row.querySelectorAll("td, th").forEach(cell => {
                    var parentCell = cell.parentElement;
                    if (cell.getAttribute('style') !== null) {
                        _.Handling_Formatting_From_Attributes(cell, {
                            retainNode: !0
                        });
                    }
                    // Retaining innerHTML instead of innerText
                    rowText.push(cell.innerHTML.trim());
                });
                // Pipe-separated format
                formattedText.push(rowText.join("<br/>"));
            });

            // Join rows with newline
            return formattedText.join("<br/>");
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('table_2_text', err.message);
        }
    },
    LoopMethod: function(element, _ = PasteFilter) {
        try {

            let table = element.querySelector("table");

            if (table) {
                let formattedText = this.table_2_text(table);
                $(table).replaceWith(formattedText);
            }

            var arr = Array.from(element.childNodes),
                reverArr = arr.reverse();
            reverArr.forEach((node, ind, arr) => {
                if (!node) return;
                if ([7, 4, 8, 10].includes(node.nodeType) || node.nodeType == 1 && _.remove_elm_tags.includes(node.tagName.toLocaleLowerCase())) {
                    commonMethods.removeEl(node);
                } else if (node.nodeType == 3) {
                    let trim = node.nodeValue.trim();
                    if (['' /* , ' ', '\\n', '\\n\\n' */ ].includes(trim) || trim.length == 0) {
                        commonMethods.removeEl(node);
                    } else _.check_NSNB(node);
                } else if (node.nodeType == 1) {
                    let root = node.parentElement ? node.parentElement : node;
                    if (root.childElementCount > 0) {
                        Array.from(root.querySelectorAll("*")).reverse().forEach((el, idx, Array) => {
                            _.node2Text(el);
                        });
                    } else {
                        _.LoopMethod(node);
                    }
                }
            });
        } catch (err) {
            this.ErrorEvent = true;
            console.warn(err.message);
            ErrorLogTrace('LoopMethod', err.message);
        }
    },
    css_to_text: function(el, _ = PasteFilter) {
        try {
            const IsLab = el.hasAttribute("data-label");
            const get_value = el.getAttribute(IsLab ? "data-label" : "data-pistart");

            if (el.classList.contains("delimt") && el.closest(".kwd-group")) return;

            const frag = document.createRange().createContextualFragment(get_value);
            const fragNode = frag.firstChild && frag.firstChild.nodeValue || "";

            const firstChild = el.firstChild;

            if (
                firstChild &&
                firstChild.nodeType === 1 &&
                firstChild.textContent === "" &&
                !firstChild.hasAttribute("data-pistart")
            ) {
                el.removeChild(firstChild);
            }

            if (IsLab) {
                const updatedFirstChild = el.firstChild;
                if (updatedFirstChild && updatedFirstChild.nodeType === 1) {
                    updatedFirstChild.textContent = fragNode.concat(" ", updatedFirstChild.textContent);
                } else {
                    el.insertAdjacentText("afterbegin", fragNode);
                }
            } else {
                let [prev, count] = [el.previousSibling, 0];
                while (prev && prev.nodeType === 1) {
                    prev = prev.lastChild;
                    count++;
                    if (!prev || count > 10) break;
                }
                if (prev) {
                    prev.textContent = (prev.textContent || "") + fragNode;
                } else {
                    el.before(frag);
                }
            }

            if (
                el.closest(".contrib") &&
                el.previousSibling && el.previousSibling.nodeType === 1 &&
                el.previousSibling.tagName === "A"
            ) {
                const name = el.closest(".contrib").querySelector(".name");
                if (name) name.append(el.previousSibling);
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('css_to_text', el && el.outerHTML + '>--->' + err.message);
        }
    },
    remove_empty: function(Options = {}, _ = PasteFilter) {
        try {
            if (["copy", "docStatics"].includes(this.e.name)) {
                let removeItem = commonMethods.removeHiddenItems.clean.split(",");
                removeItem.shift();
                Array.from([removeItem.join(","), commonMethods.removeHiddenItems.copy_clean, commonMethods.removeHiddenItems.copy]).forEach((find, index, array) => {
                    this.DOM.querySelectorAll(find).forEach((el, idx, arr) => {
                        if ([0, 1].includes(index)) {
                            // ? return journal front matter meta elements only need to remove || not in reference part (e.g. 'del, .pub-date, .history, .permissions, .volume, .issue, .fpage, .lpage')
                            if (index == 1 && el.closest(".ref") && el.tagName != "DEL") return;
                            commonMethods.removeEl(el);
                        } else {
                            _.css_to_text(el);
                        }
                    });
                });
                // ? LABEL SPLIT FROM TITLE 
                this.DOM.querySelectorAll('div.ref span.label').forEach(el => {
                    el.firstChild.textContent = el.firstChild.textContent.concat("", " ");
                });
            }
            var divs = this.DOM.querySelectorAll('span,div,p,td,th,a,input');
            Array.from(divs).reverse().forEach((el, idx, arr) => {
                if (/-formula/i.test(el.className) || el.closest(".disp-formula,.inline-formula")) {

                } else if (el.textContent === '') {
                    if (el.parentElement && el.parentElement.textContent === '') {
                        commonMethods.removeEl(el);
                    } else commonMethods.removeEl(el);
                } else {
                    if (el.tagName == "TD") {
                        debug.log(el.textContent, el.textContent.length);
                    }
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('remove_empty', err.message);
        }
    },
    remove_br: function(Options, self) {
        try {
            self = self || PasteFilter;
            var root = self.DOM;

            function isBR(el) {
                return el && el.tagName && el.tagName.toLowerCase() === 'br';
            }

            // remove leading <br>
            while (isBR(root.firstElementChild)) {
                root.removeChild(root.firstElementChild);
            }

            // remove trailing <br>
            while (isBR(root.lastElementChild)) {
                root.removeChild(root.lastElementChild);
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('remove_br', err.message);
        }
    },
    remove_span: function(Options = {}, _ = PasteFilter) {
        //? 07_JULY_2023
        // ? https://stackoverflow.com/questions/60243572/how-to-remove-span-tag-which-has-no-attribute-in-a-html-block-using-javascript-o
        try {
            let isAllowed = (tagLower) => _.formatTagArr.includes(tagLower) || ['table', 'td', 'tr', 'thead'].includes(tagLower);
            var loop = function(divs) {
                try {
                    Array.from(divs).reverse().forEach((el, idx, arr) => {
                        let tagLower = el.tagName.toLowerCase();
                        var notAllowed = !isAllowed(tagLower);

                        if (/SPAN|DIV|^P|^H|^A|^FONT/gi.test(el.tagName)) {
                            let Parent = el.parentElement;
                            if (el.attributes.length > 0) _.Handling_Formatting_From_Attributes(el);
                            if (Parent && el.attributes.length == 0) {
                                var canAddSpace = el.tagName == "SPAN";
                                var addAddNewLine = /DIV|^P|^H/gi.test(el.tagName);
                                _.after_append_remove(el, canAddSpace, addAddNewLine);
                            }
                        } else if (notAllowed) {
                            _.after_append_remove(el);
                        }
                    });
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('remove_span_loop', err.message);
                }
            };
            // ? https://stackoverflow.com/questions/50011892/how-to-select-an-element-that-has-no-attributes
            var [findEmpty, loop_count] = [this.DOM.querySelectorAll("*"), 0];
            while (findEmpty.length > 0) {
                loop(findEmpty);
                findEmpty = this.DOM.querySelectorAll("*");
                if (loop_count > 5) {
                    break;
                } else loop_count++;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('remove_span', err.message);
        }
    },
    GET_SET_CURSOR: function(el, Options = {}, _ = PasteFilter) {
        try {
            // ? GET POSTION
            let range, sel, caretPos = 0;
            let selection = document.getSelection();
            let {
                anchorNode,
                anchorOffset,
                focusNode,
                focusOffset
            } = selection;
            // ? SET || https://stackoverflow.com/questions/6249095/how-to-set-the-caret-cursor-position-in-a-contenteditable-element-div
            if (el != null) {
                if (el.tagName == 'INPUT') {
                    if (el.createTextRange) {
                        range = el.createTextRange();
                        range.move('character', caretPos);
                        range.select();
                    } else {
                        if (el.selectionStart) {
                            el.focus();
                            el.setSelectionRange(caretPos, caretPos);
                        } else
                            el.focus();
                    }
                } else {
                    // ? textare
                    range = document.createRange();
                    sel = window.getSelection();
                    range.setStart(Options.childNode ? Options.childNode : anchorNode, Options.caretPos ? Options.caretPos : anchorOffset);
                    range.collapse(true);
                    debug.warn("removeAllRanges");
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_SET_CURSOR', err.message);
        }
    },
    Update_Selection: function(filterData, _ = PasteFilter) {
        try {
            // ? https://stackoverflow.com/questions/3597116/insert-html-after-a-selection
            var sel, range;
            if (window.getSelection) {
                sel = window.getSelection();
                sel.deleteFromDocument();
                if (sel.getRangeAt && sel.rangeCount) {
                    range = window.getSelection().getRangeAt(0);
                    range.collapse(false);
                    // Range.createContextualFragment() would be useful here but is
                    // non-standard and not supported in all browsers (IE9, for one)
                    var el = document.createElement("div");
                    el.innerHTML = filterData;
                    var frag = document.createDocumentFragment(),
                        node, lastNode;
                    while (node == el.firstChild) {
                        lastNode = frag.appendChild(node);
                    }
                    range.insertNode(frag);
                }
            } else if (document.selection && document.selection.createRange) {
                sel = document.selection();
                sel.deleteFromDocument();
                range = document.selection.createRange();
                range.collapse(false);
                range.pasteHTML(filterData);
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Update_Selection', err.message);
        }
    },
    Get_Set_PasteData: function(event, Options = {}, _ = PasteFilter) {
        try {
            const clipboard = (window.clipboardData || (event && event.clipboardData)) || null;
            const clipboardTypes = clipboard && clipboard.types ? Array.from(clipboard.types) : [];
            const hasHtmlType = clipboardTypes.includes('text/html') || clipboardTypes.includes('Text') || clipboardTypes.includes('text');
            const Type = hasHtmlType ? 'text/html' : 'text/plain';
            var paste_Data = clipboard && typeof clipboard.getData === "function" ? clipboard.getData(Type) : "";
            debug.log(paste_Data);
            if (Options.setData) {
                if (clipboard && typeof clipboard.setData === "function") {
                    clipboard.setData(Options.Type, Options.setData);
                }
            } else return paste_Data;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Get_Set_PasteData', err.message);
        }
    },
    handle_Google_Docs_and_MS_Office: function(htmlString, Options = {}, _ = PasteFilter) {
        try {
            // ? handle google-docs - unwanted bold
            /***
             * ! handle ms-docs - list item (cleanWordHTML)
             * ? OUP_J_ CCP_965
             * TODO Handle label items also
             */
            const formattingMap = {
                font5: [],
                // underline
                font6: ['u'],
                // italic
                font7: ['i'],
                // bold
                font8: ['b'],
                // superscript
                font9: ['sup'],
                // subscript
                font10: ['sub'],
                font11: ['b', 'u'],
                font12: ['i', 'b'],
                font13: ['b'],
                font14: ['sup'],
                font15: ['sub'],
                font16: ['b', 'u'],
                font17: ['i', 'u'],
                font18: ['sub'],
                font19: ['sub'],
                font20: ['sub'],
                font21: ['sup'],
                font22: ['sup'],
                font23: ['sup'],
                xl65: ['b', 'i'],
                xl66: ['u', 'i'],
                xl67: ['b', 'u'],
                xl68: ['u', 'i'],
                xl69: ['u', 'b']
            };
            const msWordClass = ['MsoNormal', 'MsoListParagraphCxSpFirst', 'MsoListParagraphCxSpMiddle', 'MsoListParagraphCxSpLast'];

            // const parser = new DOMParser();
            // const doc = parser.parseFromString(htmlString, 'text/html');
            const container = document.createElement('div');
            container.innerHTML = htmlString;

            // Check if content is from MS Word by looking for any of the msWordClass elements
            let isFromMSWord = false;
            for (const className of msWordClass) {
                if (container.querySelector('.' + className)) {
                    isFromMSWord = true;
                    break;
                }
            }

            // Select all elements with class names starting with "MsoListParagraph"
            const msWordParas = Array.from(container.querySelectorAll('[class^="MsoListParagraph"]'));

            msWordParas.forEach(paragraph => {
                const children = Array.from(paragraph.childNodes);
                let collecting = false;
                const nodesToRemove = [];

                for (const node of children) {
                    if (node.nodeType === 8 && /\[if !supportLists\]/i.test(node.nodeValue)) {
                        collecting = true;
                        nodesToRemove.push(node);
                        continue;
                    }

                    if (collecting) {
                        nodesToRemove.push(node);
                        if (node.nodeType === 8 && /\[endif\]/i.test(node.nodeValue)) {
                            collecting = false;
                        }
                    }
                }

                // Remove all marked nodes
                nodesToRemove.forEach(node => commonMethods.removeEl(node));
            });

            var processHandle = function(node) {
                if (node.nodeType === 1) {
                    // Remove unwanted VML, Office, and span formatting and Word-specific <o:p> tags
                    // Remove VML/Office tags
                    const tagName = node.tagName.toUpperCase();
                    if (/^(V:|O:)/i.test(tagName) || tagName === 'O:P') {
                        nodesToRemove.push(node);
                    }

                    // Handle SPAN with MS Word styles
                    if (tagName === 'SPAN') {
                        const style = node.getAttribute('style') || '';
                        if (/mso-|v:shapes|mso-no-proof/i.test(style)) {
                            const parent = node.parentNode;
                            if (isFromMSWord && parent) {
                                // Move children before the span node
                                while (node.firstChild) {
                                    parent.insertBefore(node.firstChild, node);
                                }
                                // Now remove the empty span                                
                                commonMethods.removeEl(node);
                            } else {
                                nodesToRemove.push(node);
                            }
                        }
                    }

                }

            }
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_ALL, null, false);
            var nodesToRemove = [];
            while (walker.nextNode()) {
                // Remove comments like <!--[if gte vml 1]>...<![endif]-->
                const node = walker.currentNode;
                processHandle(node);
            }
            // Safely remove nodes that are not already removed
            nodesToRemove.forEach(node => {
                commonMethods.removeEl(node);
            });
            nodesToRemove = [];
            container.querySelectorAll('*').forEach(node => processHandle(node));
            // Safely remove nodes that are not already removed
            nodesToRemove.forEach(node => {
                commonMethods.removeEl(node);
            });

            // ? handle google-docs - unwanted bold
            /**
             * '\n<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-58035b6b-7fff-c082-9ada-ed444c943cce"><span style="font-size:12pt;font-family:Verdana,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">document </span></b>\n'
             * 
             * OUP_J_ CCP_019
             * OUP_J_ CCP_070
             * OUP_J_ CCP_325
             * OUP_J_ CCP_631
             * OUP_J_ CCP_682
             * ? <b style="font-weight:normal;" id="docs-internal-guid-58035b6b-7fff-c082-9ada-ed444c943cce">
             * ? remove above element
             *  ! moved above loop
             */

            var el = container.querySelector('[id^="docs-internal-guid"],google-sheets-html-origin');
            if (el) _.after_append_remove(el, false);

            /***
             * 
             * ! Handle ms-excel - need to work-out
             */

            // cleanAndFormat(container.body);

            const cleanedHTML = container.innerHTML;
            return cleanedHTML;

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('handle_Google_Docs_and_MS_Office', err.message);
            return htmlString;
        }
    },
    wrapWithTags: function(text, tags) {
        return tags.reduce((acc, tag) => `<${tag}>${acc}</${tag}>`, text);
    },

    cleanAndFormat: function(container) {
        container.querySelectorAll('td, font').forEach(node => {
            let classNames = [];

            if (node.className) {
                classNames.push(...node.className.trim().split(/\s+/));
            }

            if (node.tagName === 'FONT' && node.className) {
                const span = document.createElement('span');
                span.innerHTML = node.innerHTML;
                span.className = node.className;
                node.replaceWith(span);
            }
        });

        container.querySelectorAll('span[class], td[class]').forEach(el => {
            const originalClass = el.className.trim();
            const tags = formattingMap[originalClass];

            if (tags && tags.length > 0) {
                const rawText = el.textContent;
                el.innerHTML = wrapWithTags(rawText, tags);
                el.removeAttribute('class');
            }
        });

        // For inner <font class=...> with partial formatting
        container.querySelectorAll('font[class]').forEach(font => {
            const fontClass = font.className.trim();
            const tags = formattingMap[fontClass];

            if (tags && font.innerText.trim()) {
                const wrapped = document.createElement('span');
                wrapped.innerHTML = wrapWithTags(font.textContent, tags);
                font.replaceWith(wrapped);
            } else {
                // Remove <font> if no formatting
                const span = document.createElement('span');
                span.innerHTML = font.innerHTML;
                font.replaceWith(span);
            }
        });
    },
    fire: function(data, Option, _ = PasteFilter) {
        /* 
            LAST_UPDATE ==> 07_FEB_23-YA ==> PASTE IN QRY.CMD DIALOG
            https://javascript.info/selection-range
            https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
            https://developer.mozilla.org/en-US/docs/Web/API/Selection/deleteFromDocument
        */
        try {
            _.Option = Option = Option ? Option : (_.default_params);
            [_.eventhandler, _.e] = [Option.event_from, Option.e];
            _.DOM = document.getElementById('ccc') || document.createElement("span");
            if (!data) {
                data = _.Get_Set_PasteData(_.e, {
                    getData: true
                });
            }
            let sel = document.getSelection();
            let IsWindowSelection = sel.toString().length > 0 ? true : false;
            if (typeof data == "string") {
                if (data.match(/&lt|&gt|&quot|x3C/) && !["copy", "docStatics"].includes(this.e.name)) {
                    // ? 02-jul-22
                    // Step 2: Replace all known HTML entities
                    for (let tag in this.tagsAsString) {
                        data = data.replaceAllSplit(tag, this.tagsAsString[tag]);
                    }
                }

                var orgData = data;
                var returnData = _.handle_Google_Docs_and_MS_Office(orgData);
                var frag = document.createRange().createContextualFragment(returnData);
                $(_.DOM).html('').append(frag);
            }
            _.ErrorEvent = false;
            var reTurnData = "";
            if (Option.plain_text) {
                reTurnData = _.DOM.textContent.trim();
                // return  (IsWindowSelection) ? _.Update_Selection(text) :  text;
            }
            if (_.DOM.childNodes.length > 0) {
                //this.valid_xref();
                reTurnData = data;
                // ? 17_NOV_22 COPT - PASTE - DATA FILTTER METHOD -  YA
                if (["copy", "docStatics"].includes(_.e.name)) {
                    _.remove_empty();
                    reTurnData = _.DOM.innerHTML.trim();
                    if (!["docStatics"].includes(_.e.name)) _.DOM.innerHTML = '';
                } else {
                    // ? 31_JULY_2024_YA
                    Array.from(_.DOM.querySelectorAll(`insert,span[data-name="mixed-citation"]`)).forEach(node => {
                        let matcher = node.className ? node.className : node.hasAttribute("data-name") ? node.getAttribute("data-name") : "";
                        if (matcher && /ice-no-decoration|mixed-citation/gi.test(matcher)) {
                            _.after_append_remove(node);
                        }
                    });
                    // _.handle_Google_Docs_and_MS_Office();
                    _.check_user_base_issue();
                    _.LoopMethod(_.DOM);
                    _.remove_empty();
                    _.remove_span();
                    _.remove_br();
                    reTurnData = _.DOM.innerHTML.trim();


                    if (Option.event_from == "query") {
                        // Step 3: Replace quote pairs with smart quotes - 08_AUG_25_YA
                        let toggle = true;
                        reTurnData = reTurnData.replace(/"/g, () => {
                            if (toggle) {
                                toggle = false;
                                // left smart quote
                                return '\u201C';
                            } else {
                                toggle = true;
                                // right smart quote
                                return '\u201D';
                            }
                        });
                    }


                    //? Remove Char code 0-8 As per srini instruction DR_23_01_23/06_FEB_23_YA
                    for (let index = 0; index <= 8; index++) {
                        reTurnData = reTurnData.replaceAllSplit(String.fromCharCode(index.toString()), "");
                    }
                    _.DOM.innerHTML = '';
                    if ((typeof Option.record == "undefined") || (typeof Option.record == "boolean" && Option.record)) {
                        _.Record(data, reTurnData);
                    }
                }
                //Option = _.default_params;
                // return  IsWindowSelection ? _.Update_Selection(tempData) :  tempData;
            } /* else return  IsWindowSelection ? _.Update_Selection('') :  ''; */
            if (Option.setData && reTurnData.length > 0) {
                _.Update_Selection(reTurnData);
            }
            return reTurnData;
        } catch (err) {
            console.warn(err.message);
            _.Record(data, "");
            ErrorLogTrace('OnPaste_fire', err.message + " <br> " + data + " <br> " + JSON.stringify(Option));
        }
    },
    check_user_base_issue: function(_ = PasteFilter) {
        try {
            var loop_Method = function() {
                _.DOM.querySelectorAll("u,ins,span[style]").forEach(elm => {
                    let Parent = elm.parentElement;
                    if (elm.tagName == "span") {
                        elm.style.removeProperty(_.retain[0]);
                        return;
                    }
                    elm.after(...elm.childNodes);
                    commonMethods.removeEl(elm);
                    /* if (Parent && elm.parentElement) {
                        Parent.removeChild(elm);
                    } else elm.remove(); */
                });
            };
            let data = _.DOM.innerHTML;
            if (['fqs@zju.edu.cn'].includes(USER_INFO.MAIL_ID)) {
                loop_Method();
            }
            if ((/mailto:Curie/).test(data)) {
                loop_Method();
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('check_user_base_issue', err.message);
        }
    },
    valid_xref: function(_ = PasteFilter) {
        try {
            let missing = [];
            this.DOM.querySelectorAll('a.xref').forEach(el => {
                let rid = el.getAttribute('rid');
                if (rid) {
                    rid.split(' ').forEach(id => {
                        if (GlobalEditor && GlobalEditor.document && GlobalEditor.document.find(`[id="${id}"]`)) {
                            debug.log('element found');
                        } else missing.push('id');
                    });
                }
            });
            return missing.length > 0 && !iREF_SCOPE.IS_NAME_DATE ? false : true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('valid_xref', err.message);
        }
    },
    after_paste_check_citation: function(_id, _ = PasteFilter) {
        try {
            /** 
                @params {_id} for pasted xref id
            */
            _id = this.Paste_Cite ? this.Paste_Cite.id : null;
            /*
            this.A_DOM = document.getElementById('aaa');
            var gData = GlobalEditor.getData();
            let XREFS_LIST = GlobalEditor.document.find(`[data-paste-id="${_id}"]`).$.length;
            $(this.A_DOM).html('').append(gData);
            */
            if (this.IsCitationAvailable) {
                IMPACT_SELECTION._SNAPSHOT({
                    lock: true,
                    SAVE: true
                });
                //tempElm.classList.add('active'); tempElm is not defined
                /*
                let rData = CitationNewModule['M_FUN'].CHECK_REF_CITATION_SEQUENCE(this.A_DOM, ({
                    del_id: null,
                    reorder: true
                }));
                GlobalEditor.setData(rData);
                */
                CHECK_ORDER.FIRE_ONCE(GlobalEditor, {
                    reNumber: !0,
                    ins_cite: !1,
                    paste: !1,
                    alert: !0,
                    pre_alert: !0
                });
                IMPACT_SELECTION._SNAPSHOT({
                    unlock: true,
                    SAVE: true
                });
                setTimeout((_id) => {
                    IMPACT_SELECTION.setCursor(GlobalEditor, {
                        set_id: _id ? _id : null,
                        find_attr: 'data-paste-id'
                    });
                }, 100, _id);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('after_paste_check_citation', err.message);
        }
    },
    Paste_DB_Record: function(response, _ = PasteFilter) {
        var STRINGY = JSON.stringify(response);
        try {
            debug.log(JSON.stringify(response));
            if (response.r == 0) ErrorLogTrace('Paste_DB_Record_Response', STRINGY);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Paste_DB_Record', err.message + STRINGY);
        }
    },
    histroy: {},
    Record: function(rawData, filterData, Options = {}, _ = PasteFilter) {
        try {
            if (IS_LOCAL_HOST) return;
            if (this.histroy[filterData] && this.histroy[filterData] == rawData) return;
            else this.histroy[filterData] = rawData;
            let area = Options.area ? Options.area : ((this.Option && this.Option.query) ? 'QUERY' : 'EDITOR');
            var Paste_Json = {
                "tbl": "PasteLogs",
                // "docid": DOC_ID,
                raw_data: rawData,
                filter_data: filterData,
                Area: area,
                // user: USER_INFO.MAIL_ID,
                // "_r": ["5af956974b4bb40a34648f8e"],
                // "_w": ["5af956974b4bb40a34648f8e"],
                "status": this.ErrorEvent ? "error" : "pass"
            };
            // ! 25_MAR_2023 - HANDLE COMMON KEYS GLOBAL METHOD
            let tempObj = GET_JSON("default");
            Object.assign(Paste_Json, tempObj);
            commonfn.callajax(Paste_Json, 'Paste_DB_Record', API_UPDATE_INSERT, this);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Paste_Record', err.message);
        }
    },
    After_Cut_Paste_Event(EVENT, STRING_VALUE) {
        try {
            var DOC = document.createElement('span'),
                xRefArray = new Map();
            DOC.innerHTML = STRING_VALUE;
            if (DOC.querySelectorAll('a.xref').length) {
                // GlobalEditor.fire( 'lockSnapshot' );
                var lastXref = DOC.querySelectorAll('a.xref');
                Array.from(lastXref).forEach((el) => {
                    xRefArray.set(el.getAttribute('ref-type'), el.getAttribute('rid'));
                });
                var full = GlobalEditor.getData();
                xRefArray.forEach((value, key, Map) => {
                    if (key == "bibr") {
                        //? If Reference
                        if (EVENT == 'cut') {
                            if (iREF_SCOPE.IS_NAME_DATE) {
                                console.log('Here name and date');
                                if (value) {
                                    let Arr = $(full).find(`a[rid="${value}"]:not([data-remove])`);
                                    console.log(Arr);
                                    if (Arr.length == 1) {
                                        // TODO - CHECK TEST CASE - LATER
                                        DEL_REF_FIRE(value, {
                                            FROM_AFTER_CUT: true,
                                            IS_DOM_MANIPULATE: false
                                        });
                                    }
                                }
                                //  ? Here name and Reference nothing to do
                            } else if (!iREF_SCOPE.IS_NAME_DATE) {
                                // ?  If Numbered Refer Need Renumber
                                console.log('Here Numbered');
                                // TODO - CHECK TEST CASE - LATER
                            }
                        } else if (EVENT == PASTE) {

                        }
                    } else if (["endnote", 'footnote', 'table-fn'].includes(key)) {
                        if (!IS_JOURNAL) {
                            var ChildOne = null;
                            if (EVENT == PASTE) {
                                // ? handling new/old mote with number not also
                                var findClass = value.slice(0, (value.indexOf('un') == -1 ? 2 : 4)),
                                    newNode_Id = '';
                                ChildOne = parseInt(full.querySelector('div.fn[id^="' + findClass + '"] span.label').textContent);
                                Array.from(GlobalEditor.document.find(`a[rid="${value}"]`).$).forEach((el, ind, Arr) => {
                                    var Entry = GlobalEditor.document.findOne(`[id="${value}"]`).$,
                                        Clone = Entry.cloneNode(true),
                                        CloneTemp = Entry.cloneNode(true),
                                        IsNew = el.parentElement.tagName == 'INSERT' ? true : false;

                                    // ? if cut and paste
                                    [Clone, CloneTemp].forEach(el => {
                                        el.classList.remove('delete');
                                        el.removeAttribute('data-del-id');
                                        Array.from(el.children).forEach((node, ind, arr) => {
                                            if (node.tagName == 'DEL' || node.tagName == 'INSERT') {
                                                node.outerHTML = node.innerHTML;
                                            }
                                        });
                                    });
                                    if (ind == 0) {
                                        var InsElement = window._trackManager.getInsNode();
                                        // ? 'en'+s4
                                        newNode_Id = Clone.id.slice(0, (Clone.id.indexOf('un') == -1 ? 2 : 4)) + s4();
                                        Clone.id = newNode_Id;
                                        InsElement.innerHTML = CloneTemp.innerHTML;
                                        Clone.innerHTML = InsElement.outerHTML;
                                        //console.log(Clone.outerHTML);
                                        if (IsNew) {
                                            el.setAttribute('rid', newNode_Id);
                                            el.setAttribute('href', `#${newNode_Id}`);
                                            Entry.parentElement.insertBefore(Clone, Entry);
                                        } else {
                                            commonMethods.insertAfter(Clone, Entry);
                                            Arr[1].setAttribute('rid', newNode_Id);
                                            Arr[1].setAttribute('href', `#${newNode_Id}`);
                                        }
                                    }
                                });
                            }
                            var DOM = document.getElementById('bbb');
                            $(DOM).html('').append(full.outerHTML);
                            if (EVENT == 'cut') {
                                // NewFloatModule.removeNoteItem(key, value, DOM, EVENT);
                            } else {
                                // NewFloatModule.NotesReOrdering(key + 's', key, DOM, ChildOne, null);
                                SET_DATA.setNewData(DOM, {
                                    DOM_Empty: true,
                                    reGenerateAll: false
                                });
                            }
                        }
                    }
                });
            }
        } catch (errr) {
            console.warn(errr.message);
            ErrorLogTrace('After_Cut_Paste_Event', errr.message);
        }
    },
    test1: function(e, Options = {}, _ = PasteFilter) {
        _.e;
    }
};




/* 

https://claude.site/artifacts/e741684c-33f6-4505-bb97-d27c93492078
https://claude.site/artifacts/6d031afa-fba0-47f2-a92f-e32fb5ca9751
https://claude.site/artifacts/aa322376-7164-4a59-a6e1-9e091ea0df46

*/
// CKEditor Zoom Controller
window.CKEditorZoomController = {
    // Configuration
    config: {
        maxZoom: 150,
        minZoom: 50,
        step: 10,
        defaultZoom: 100
    },

    // Current zoom level
    currentZoom: 100,

    /**
     * Zoom in by step amount
     * @param {Object} editor - CKEditor instance
     */
    zoomIn(editor) {
        try {
            const newZoom = this.currentZoom + this.config.step;
            if (newZoom <= this.config.maxZoom) {
                this.currentZoom = newZoom;
                this.applyZoom(editor);
            }
        } catch (error) {
            console.warn('Zoom in error:', error.message);
            this.logError('zoomIn', error.message);
        }
    },

    /**
     * Zoom out by step amount
     * @param {Object} editor - CKEditor instance
     */
    zoomOut(editor) {
        try {
            const newZoom = this.currentZoom - this.config.step;
            if (newZoom >= this.config.minZoom) {
                this.currentZoom = newZoom;
                this.applyZoom(editor);
            }
        } catch (error) {
            console.warn('Zoom out error:', error.message);
            this.logError('zoomOut', error.message);
        }
    },

    /**
     * Set specific zoom level
     * @param {Object} editor - CKEditor instance
     * @param {number} zoomLevel - Zoom percentage (50-150)
     */
    setZoom(editor, zoomLevel) {
        try {
            if (zoomLevel >= this.config.minZoom && zoomLevel <= this.config.maxZoom) {
                this.currentZoom = zoomLevel;
                this.applyZoom(editor);
            }
        } catch (error) {
            console.warn('Set zoom error:', error.message);
            this.logError('setZoom', error.message);
        }
    },

    /**
     * Apply zoom transformation to editor
     * @param {Object} editor - CKEditor instance
     * @private
     */
    applyZoom(editor) {
        try {
            console.log('Applied zoom:', this.currentZoom + '%');

            const editorBody = editor.editable().$;
            const scaleValue = this.currentZoom / 100;

            // Modern transform property (covers most browsers)
            editorBody.style.transformOrigin = 'top left';
            editorBody.style.transform = `scale(${scaleValue})`;

            // Fallback for older browsers
            editorBody.style.webkitTransformOrigin = 'top left';
            editorBody.style.webkitTransform = `scale(${scaleValue})`;

            // IE fallback
            editorBody.style.zoom = scaleValue;

        } catch (error) {
            console.warn('Apply zoom error:', error.message);
            this.logError('applyZoom', error.message);
        }
    },

    /**
     * Reset zoom to default level
     * @param {Object} editor - CKEditor instance
     */
    resetZoom(editor) {
        this.currentZoom = this.config.defaultZoom;
        this.applyZoom(editor);
    },

    /**
     * Get current zoom percentage
     * @returns {number} Current zoom level
     */
    getCurrentZoom() {
        return this.currentZoom;
    },

    /**
     * Log error (placeholder for external error logging)
     * @param {string} method - Method name where error occurred
     * @param {string} message - Error message
     * @private
     */
    logError(method, message) {
        // Replace with your actual error logging function
        if (typeof ErrorLogTrace === 'function') {
            ErrorLogTrace(`CKEditorZoom_${method}`, message);
        }
    }
};

var FormattingHandler = {
    rule: {},
    data: {
        b: {
            element: "strong",
            "data-name": "bold"
        },
        i: {
            element: "em",
            "data-name": "italic"
        },
        u: {
            element: "u",
            "data-name": "underline"
        },
        sup: {
            element: "sup",
            "data-name": "superscript"
        },
        sub: {
            element: "sub",
            "data-name": "subscript"
        },
        sc: {
            element: "sc",
            "data-name": "sc"
        },
        str: {
            element: "s",
            "data-name": "strike"
        }
    },
    init() {
        try {
            Object.entries(this.data).forEach(([tag, json]) => {
                var tempObj = {};
                Object.entries(json).forEach(([name, value]) => {
                    if (name == 'element') {
                        tempObj[name] = value;
                    } else {
                        tempObj['attributes'] = {
                            'data-name': value,
                            'data-id': s4(),
                            'data-css': 'ice-format',
                            'data-username': USER_INFO.MAIL_ID,
                            'data-userid': USER_INFO.USER_ID,
                            'data-time': new Date().getTime() + '',
                            'data-changedata': '',
                            'data-last-change-time': new Date().getTime() + '',
                            'data-rolename': (USER_INFO.TRACK_ROLE_NAME)
                        };
                    }
                });
                FormattingHandler.rule[tag] = tempObj;
            });
        } catch (err) {
            ErrorLogTrace('FormattingHandler', err.message);
            console.log(err.message);
        }
    },
    reset() {
        try {
            var Group = [GlobalEditor.config.coreStyles_bold, GlobalEditor.config.coreStyles_italic, GlobalEditor.config.coreStyles_strike, GlobalEditor.config.coreStyles_subscript, GlobalEditor.config.coreStyles_superscript, GlobalEditor.config.coreStyles_smallcaps, GlobalEditor.config.coreStyles_underline],
                RetainGroup = ['data-name', 'data-css'];
            $.each(Group, function(ind, Entry) {
                var timeStamp = new Date().getTime();
                Object.assign(Entry["attributes"], {
                    "data-time": timeStamp,
                    "data-last-change-time": timeStamp,
                    "data-id": s4() + s4(),
                    "data-changedata": ""
                })
            });
            console.log('Formatting Id Reset');
        } catch (err) {
            console.log(err.message);
            ErrorLogTrace('reset', err.message);
        }
    },
    getFormatMeta(commandName) {
        try {
            if (!commandName) return null;
            var entries = Object.keys(this.data);
            for (var i = 0; i < entries.length; i++) {
                if (this.data[entries[i]]['data-name'] === commandName) {
                    return {
                        element: this.data[entries[i]].element,
                        dataName: commandName
                    };
                }
            }
            return null;
        } catch (err) {
            ErrorLogTrace('FormattingHandler.getFormatMeta', err.message);
            return null;
        }
    },
    elementMatchesFormat(el, commandName) {
        try {
            var meta = this.getFormatMeta(commandName);
            if (!meta || !el || el.nodeType !== 1) return false;
            var tag = el.tagName ? el.tagName.toLowerCase() : '';
            if (tag !== meta.element) return false;
            var dataName = el.getAttribute('data-name');
            if (dataName === meta.dataName) return true;
            return !!(el.classList && el.classList.contains(commandName));
        } catch (err) {
            ErrorLogTrace('FormattingHandler.elementMatchesFormat', err.message);
            return false;
        }
    },
    _getDomNode(ckOrDomNode) {
        if (!ckOrDomNode) return null;
        if (ckOrDomNode.$) return ckOrDomNode.$;
        if (ckOrDomNode.nodeType) return ckOrDomNode;
        return null;
    },
    _isIceInsertNode(el) {
        if (!el || el.nodeType !== 1) return false;
        var tag = el.tagName ? el.tagName.toLowerCase() : '';
        return tag === 'insert' && !!(el.classList && el.classList.contains('ice-ins'));
    },
    findIceInsertInRange(startContainer, startOffset) {
        try {
            var startNode = this._getDomNode(startContainer);
            if (!startNode) return null;
            if (this._isIceInsertNode(startNode)) return startNode;
            if (startNode.nodeType === 1 && typeof startOffset === 'number') {
                var atOffset = startNode.childNodes[startOffset];
                if (this._isIceInsertNode(atOffset)) return atOffset;
                if (startOffset > 0 && this._isIceInsertNode(startNode.childNodes[startOffset - 1])) {
                    return startNode.childNodes[startOffset - 1];
                }
            }
            if (startNode.nodeType === 3) startNode = startNode.parentElement;
            var el = startNode;
            while (el && el.nodeType === 1) {
                if (this._isIceInsertNode(el)) return el;
                el = el.parentElement;
            }
            return null;
        } catch (err) {
            ErrorLogTrace('FormattingHandler.findIceInsertInRange', err.message);
            return null;
        }
    },
    findIceInsertInSelection(editor) {
        try {
            if (!editor || !editor.getSelection) return null;
            var selection = editor.getSelection();
            if (!selection) return null;
            var ranges = selection.getRanges();
            if (!ranges || !ranges.length) return null;
            return this.findIceInsertInRange(ranges[0].startContainer, ranges[0].startOffset);
        } catch (err) {
            ErrorLogTrace('FormattingHandler.findIceInsertInSelection', err.message);
            return null;
        }
    },
    _formatElementOnlyWrapsIceTrack(formatEl) {
        try {
            if (!formatEl || formatEl.nodeType !== 1) return false;
            var hasMeaningfulChild = false;
            for (var c = 0; c < formatEl.childNodes.length; c++) {
                var child = formatEl.childNodes[c];
                if (child.nodeType === 3) {
                    if (child.textContent && child.textContent.trim()) return false;
                    continue;
                }
                if (child.nodeType !== 1) continue;
                hasMeaningfulChild = true;
                var childTag = child.tagName ? child.tagName.toLowerCase() : '';
                if (childTag !== 'insert') return false;
                if (!child.classList || !child.classList.contains('ice-ins')) return false;
            }
            return hasMeaningfulChild;
        } catch (err) {
            ErrorLogTrace('FormattingHandler._formatElementOnlyWrapsIceTrack', err.message);
            return false;
        }
    },
    _unwrapFormatElement(el) {
        try {
            if (!el || !el.parentNode) return false;
            var parent = el.parentNode;
            if (typeof commonMethods !== 'undefined' && commonMethods.iunWrap) {
                commonMethods.iunWrap(el, {});
                if (!el.parentNode) return true;
            }
            while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
            return true;
        } catch (err) {
            ErrorLogTrace('FormattingHandler._unwrapFormatElement', err.message);
            return false;
        }
    },
    _selectInsertElement(editor, insertEl) {
        try {
            if (!editor || !insertEl) return;
            var domEl = insertEl.$ || insertEl;
            if (!domEl || !domEl.parentNode) return;
            var sel = editor.getSelection && editor.getSelection();
            if (typeof CKEDITOR !== 'undefined' && CKEDITOR.dom && CKEDITOR.dom.element && sel && typeof editor.createRange === 'function') {
                var ckEl = insertEl.$ ? insertEl : new CKEDITOR.dom.element(domEl);
                var range = editor.createRange();
                range.selectNodeContents(ckEl);
                sel.selectRanges([range]);
            } else if (window.getSelection && document.createRange) {
                var nativeRange = document.createRange();
                nativeRange.selectNodeContents(domEl);
                var nativeSel = window.getSelection();
                nativeSel.removeAllRanges();
                nativeSel.addRange(nativeRange);
            }
            if (typeof editor.fire === 'function') {
                editor.fire('selectionChange');
            }
        } catch (err) {
            ErrorLogTrace('FormattingHandler._selectInsertElement', err.message);
        }
    },
    splitFormatParentAroundIceInsert(editor, commandName) {
        try {
            var insertEl = this.findIceInsertInSelection(editor);
            if (!insertEl) return false;

            var formatEl = insertEl.parentElement;
            if (!formatEl || !this.elementMatchesFormat(formatEl, commandName)) return false;

            var didSplit = false;
            if (this._formatElementOnlyWrapsIceTrack(formatEl)) {
                didSplit = this._unwrapFormatElement(formatEl);
            } else {
                var parent = formatEl.parentNode;
                if (!parent) return false;

                var afterEm = formatEl.cloneNode(false);
                var node = insertEl.nextSibling;
                while (node) {
                    var next = node.nextSibling;
                    afterEm.appendChild(node);
                    node = next;
                }

                parent.insertBefore(insertEl, formatEl.nextSibling);
                if (afterEm.hasChildNodes()) {
                    parent.insertBefore(afterEm, insertEl.nextSibling);
                }
                didSplit = true;
            }
            if (didSplit) {
                this._selectInsertElement(editor, insertEl);
            }
            return didSplit;
        } catch (err) {
            ErrorLogTrace('FormattingHandler.splitFormatParentAroundIceInsert', err.message);
            return false;
        }
    },
    remove_deformat_span(htmlString, Options = {}) {
        try {
            var dom = document.createElement("div");
            if (typeof htmlString == "string") {
                dom.innerHTML = htmlString;
            }
            /*
            <strong data-name="bold" data-id="fc64" data-css="ice-format" data-username="yasar.mohideen@newgen.co" data-userid="N1a2fa165-4570-435f-b058-3a046f2d577a" data-time="1689950382666" data-changedata="" data-last-change-time="1689950382666"></strong>
            <em class="italic" data-name="italic">N</em>
            <sub data-name="subscript" data-id="d770b39d" data-css="ice-format" data-username="yasar.mohideen@newgen.co" data-userid="N1a2fa165-4570-435f-b058-3a046f2d577a" data-time="1690022179816" data-changedata="" data-last-change-time="1690022179816"></sub>
            
            victim <i>issues</i>: Issue <b>competition </b>in the <sub>agenda </sub>setting <sup>process </sup>
            */
            dom.querySelectorAll(`span[data-name]`).forEach(item => {
                commonMethods.iunWrap(item, {});
            });
            return dom.innerHTML;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('remove_deformat_span', err.message);
            return htmlString;
        }
    },
    convert2ipt(node, Options = {}) {
        try {
            console.log("convert2ipt");
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('convert2ipt', err.message);
        }

    }
};


/**
 * Modern Logout System
 * Handles user logout with data protection and proper error handling
 */

class LogoutManager {
    constructor() {
        this.canRedirect = false;
        this.saveScheduler = null;
        this.logoutProgressTimer = null;
        this.EVENTS = Object.freeze({
            DEFAULT: "LOG-OUT",
            FINALIZE: "Finalize"
        });
        this.config = {
            REDIRECT_RETRY_DELAY: 444,
            SAVE_CHECK_INTERVAL: 950,
            POST_SAVE_DELAY: 1000,
            ENABLE_LOGOUT_PROGRESS: true
        };
        // Stage labels + horizontal bar progress for logout wait dialog.
        this.logoutProgressStages = Object.freeze({
            saving: {
                status: 'Saving content ...',
                bar: 30
            },
            profile: {
                status: 'Syncing profile ...',
                bar: 60
            },
            session: {
                status: 'Closing session ...',
                bar: 90
            },
            complete: {
                status: 'Completed',
                bar: 100
            }
        });
        this.logoutProgressBar = 0;
        this.apiService = new FetchService();
        this.boundHandleLogoutClick = this.handleLogoutClick.bind(this);
    }

    resolveLogoutEvent(options = {}) {
        return options.logoutEvent || this.EVENTS.DEFAULT;
    }

    resolveLogoutSource(options = {}) {
        const explicitSource = options && options.source;
        if (explicitSource) {
            return explicitSource;
        }

        const logoutSource = String((options && options.logoutSource) || '').toLowerCase();
        const sourceMap = {
            editor: 'editor_logout',
            editor_logout: 'editor_logout',
            logout: 'editor_logout',
            finalize: 'finalize_logout',
            finalize_logout: 'finalize_logout',
            link_request_dialog: 'link_request_dialog',
            request_dialog: 'link_request_dialog',
            link_send_dialog: 'link_send_dialog',
            send_dialog: 'link_send_dialog'
        };
        if (sourceMap[logoutSource]) {
            return sourceMap[logoutSource];
        }

        if (this.resolveLogoutEvent(options) === this.EVENTS.FINALIZE) {
            return 'finalize_logout';
        }

        return 'editor_logout';
    }

    isCollaborativeLogoutEnabled(payload = {}) {
        try {
            const docId = (payload && payload.docid) || (window.GET_DOC_ID ? window.GET_DOC_ID() : (typeof DOC_ID !== 'undefined' ? DOC_ID : ''));
            if (typeof window.isCollabEnabled === 'function' && window.isCollabEnabled(docId)) {
                return true;
            }
            if (typeof SHARED_KEY !== 'undefined' && SHARED_KEY &&
                String(SHARED_KEY.collaborative || '').toLowerCase() === 'yes') {
                return true;
            }
            if (typeof USER_INFO !== 'undefined' && USER_INFO && USER_INFO.HAS_COLLAB_WORKFLOW) {
                return true;
            }
        } catch (error) {
            this.logError('COLLABORATIVE_LOGOUT_CHECK', error.message);
        }
        return false;
    }

    enrichCollaborativeLogoutPayload(payload = {}) {
        if (payload && this.isCollaborativeLogoutEnabled(payload)) {
            payload.collaborative = '1';
        }
        return payload;
    }

    /**
     * True while Finalize dialog owns the UI (open stage or visible panel).
     */
    isFinalizeInProgress() {
        try {
            const fd = window.FinalizeDialog;
            if (!fd) return false;
            if (fd.currentStage && String(fd.currentStage).trim() !== '') {
                return true;
            }
            if (fd.Panel && !fd.Panel.classList.contains('ds-none')) {
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Initialize the logout system
     */
    init() {
        try {
            const logoutButton = document.getElementById('log_out_btn');
            if (!logoutButton) {
                throw new Error('Logout button not found');
            }

            if (!window.jQuery) {
                throw new Error('jQuery is required for logout click binding');
            }

            window.jQuery(logoutButton)
                .off('click.logoutManager')
                .on('click.logoutManager', this.boundHandleLogoutClick);
        } catch (error) {
            this.logError('LOG_OUT_INIT', error.message);
        }
    }

    handleLogoutClick(e) {
        const eventRef = e && (e.originalEvent || e);
        if (eventRef && eventRef.__logoutManagerHandled) return;
        if (eventRef) eventRef.__logoutManagerHandled = true;

        const logoutButton = document.getElementById('log_out_btn');
        if (logoutButton && (
                logoutButton.getAttribute('aria-disabled') === 'true' ||
                logoutButton.hasAttribute('disabled')
            )) {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            return;
        }

        this.handleLogout({
            source: 'editor_logout'
        });
    }

    /**
     * Main logout handler
     * @param {Object} options - Logout options
     * @param {boolean} options.noWarnAlert - Skip warning dialog
     * @param {boolean} options.noAlert - Skip alerts during save
     * @param {string} options.logoutEvent - Event label used for audit/error-mail context
     */

    async handleLogout(options = {}) {

        options.noWarnAlert = options.noWarnAlert || false;
        options.noAlert = options.noAlert || false;

        if (typeof window.paraLock !== "undefined" && window.paraLock._pauseEvents) {
            window.paraLock._pauseEvents();
        }

        try {
            if (!navigator.onLine) {
                this.showOfflineWarning();
                return;
            }

            const isFinalizeLogout = this.resolveLogoutEvent(options) === this.EVENTS.FINALIZE;

            // User-initiated logout must not compete with Finalize dialog
            if (!options.noWarnAlert && !isFinalizeLogout && this.isFinalizeInProgress()) {
                return Promise.resolve();
            }

            if (options.noWarnAlert) {
                if (!isFinalizeLogout) {
                    this.showLogoutProgress();
                }
                return await this.executeLogout(options);
            } else {
                const confirmed = await this.showConfirmationDialog();
                if (confirmed) {
                    this.showLogoutProgress();
                    options.logoutEvent = this.EVENTS.DEFAULT;
                    return await this.executeLogout(options);
                }
            }
            return Promise.resolve();
        } catch (error) {
            this.closeLogoutProgress();
            this.logError('LOGOUT_HANDLER', error.message);
            if (typeof window.paraLock !== "undefined" && window.paraLock._resumeEvents) {
                window.paraLock._resumeEvents();
            }
            return Promise.resolve();
        }
    }
    /**
     * Pause paraLock sync and cancel CHECK_REQUEST timers without closing the session.
     */
    pauseBackgroundSync() {
        try {
            if (typeof window.paraLock !== "undefined" && window.paraLock._pauseEvents) {
                window.paraLock._pauseEvents();
            }

            if (typeof CHECK_REQUEST !== "undefined" && typeof CHECK_REQUEST.cancel === "function") {
                CHECK_REQUEST.cancel(CHECK_REQUEST.SCHEDULER);
            }
        } catch (error) {
            this.logError('PAUSE_BACKGROUND_SYNC', error.message);
        }
    }
    /**
     * Execute the logout process
     * @param {Object} options - Execution options
     */
    async executeLogout(options = {}) {
        try {
            this.canRedirect = false;
            window._CanClose = false;

            const logoutEvent = this.resolveLogoutEvent(options);

            // Use combined save+logout only for local development (API not deployed to production yet)
            if (logoutEvent !== this.EVENTS.FINALIZE) {
                this.updateLogoutProgress('saving');
            }
            this.pauseBackgroundSync();
            const useCombined = logoutEvent == "LOG-OUT" || (logoutEvent === this.EVENTS.FINALIZE && options.useCombinedSave === true);

            if (useCombined && (IS_LOCAL_HOST || IS_UAT_DOMAIN)) {

                const result = logoutEvent === this.EVENTS.FINALIZE && options.useSaveWithFinalize ?
                    await this.saveWithFinalize(options) :
                    await this.saveWithLogout(options);

                // If saveWithLogout failed completely, abort
                if (result.error || (!result.success && !result.saveSuccess)) {
                    return result;
                }

                // Lock the editor
                this.lockEditor(logoutEvent);

                // Send error mail if available
                this.sendErrorMail(logoutEvent);
                this.transferUserActivityData(logoutEvent);

                // Handle redirect if full success
                if (result.success && result.logoutSuccess) {
                    if (!options.noRedirect) {
                        this.handleRedirect({
                            r: 1
                        }, options);
                    } else {
                        this.closeLogoutProgress();
                    }
                }

                return result;
            } else {
                // Legacy flow for Finalize and other non-combined events
                // Force save current work
                const saveResult = await this.forceSave(options);
                if (saveResult === false && logoutEvent !== this.EVENTS.FINALIZE) {
                    this.closeLogoutProgress();
                    return saveResult;
                }

                // Lock the editor
                this.lockEditor(logoutEvent);

                // Send error mail if available
                this.sendErrorMail(logoutEvent);
                this.transferUserActivityData(logoutEvent);

                // Wait for save completion and then logout
                return await this.waitForSaveCompletion(options);
            }

        } catch (error) {
            this.closeLogoutProgress();
            this.logError('EXECUTE_LOGOUT', error.message);
        }
    }

    /**
     * Lock the editor to prevent further changes
     */
    lockEditor(evt) {
        try {
            // Pause paraLock events (if available)
            if (typeof window.paraLock !== "undefined") {
                const isEnabled = window.paraLock && window.paraLock._isEnabled;
                if (isEnabled) {
                    if (window.paraLock._pauseEvents) {
                        window.paraLock._pauseEvents();
                    }
                    window.paraLock._sendToServer({
                        lock_paraId: ['0']
                    }, "close_session");

                }
            }

            // Set editor as read-only
            if (GlobalEditor && typeof GlobalEditor.setReadOnly === "function") {
                // pass true explicitly
                GlobalEditor.setReadOnly(true);
            }
        } catch (error) {
            this.logError('LOCK_EDITOR', error.message);
        }
    }

    /**
     * Force save current work
     * @param {Object} options - Save options
     */
    async forceSave(options = {}) {
        try {

            const timestamp = Date.now().toString();

            if (window.IMPACT_SAVE && window.IMPACT_SAVE.iSave) {
                return await window.IMPACT_SAVE.iSave({
                    forcesave: true,
                    forceSave: true,
                    noalert: options.noAlert || false,
                    regenerate: options.regenerate || false,
                    lockfile: options.lockfile || false,
                    timestamp
                });
            }
        } catch (error) {
            this.logError('FORCE_SAVE', error.message);
        }
    }

    /**
     * Combined save and logout operation
     * Gets save parameters from SaveModule, calls savewithlogout endpoint,
     * and handles all response scenarios
     * @param {Object} options - Logout options
     * @returns {Promise<Object>} Response with save and logout status
     */
    async saveWithLogout(options = {}) {
        try {
            // Get save data from SaveModule
            const saveData = window.IMPACT_SAVE.getSaveDataForLogout({
                noAlert: options.noAlert,
                regenerate: options.regenerate,
                lockfile: options.lockfile,
                timestamp: Date.now().toString()
            });

            if (!saveData) {
                throw new Error('Failed to prepare save data for logout');
            }

            // Add logout-specific parameters
            const payload = {
                ...saveData,
                recordtype: 'savewithlogout',
                process: options.process || 'close',
                remarks: options.remarks || '',
                session_end_time: new Date().getTime().toString(),
                source: this.resolveLogoutSource(options)
            };

            // Finalize extras (correction counts, attachments, signoff flags) when provided
            if (options.finalizeExtras && typeof options.finalizeExtras === 'object') {
                Object.assign(payload, options.finalizeExtras);
                if (options.finalizeExtras.finalize || options.logoutEvent === this.EVENTS.FINALIZE) {
                    payload.recordtype = options.useSaveWithFinalize ? 'savewithfinalize' : payload.recordtype;
                }
            }

            this.enrichCollaborativeLogoutPayload(payload);

            // Make combined API call
            const response = await this.apiService.makeRequest(
                API_SAVE_WITH_LOGOUT,
                payload, {}
            );

            // Handle response based on structure
            return this.handleSaveWithLogoutResponse(response, options);

        } catch (error) {
            this.logError('SAVE_WITH_LOGOUT', error.message);
            this.closeLogoutProgress();
            return {
                error: true,
                message: error.message
            };
        }
    }

    /**
     * Normalize savewithfinalize API shape for shared logout response handling.
     * @param {Object} response
     * @returns {Object}
     */
    normalizeSaveWithFinalizeResponse(response = {}) {
        if (!response || response.error) {
            return response;
        }
        const normalized = {
            ...response
        };
        if (!normalized.logout && normalized.session) {
            normalized.logout = normalized.session;
        }
        return normalized;
    }

    /**
     * WIP: Combined save + finalize subprocesses via savewithfinalize endpoint.
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    async saveWithFinalize(options = {}) {
        try {
            const saveData = window.IMPACT_SAVE.getSaveDataForLogout({
                noAlert: options.noAlert,
                regenerate: options.regenerate,
                lockfile: options.lockfile,
                timestamp: Date.now().toString()
            });

            if (!saveData) {
                throw new Error('Failed to prepare save data for finalize');
            }

            const payload = {
                ...saveData,
                recordtype: 'savewithfinalize',
                process: options.process || 'signoff',
                remarks: options.remarks || 'signoff',
                session_end_time: new Date().getTime().toString(),
                source: this.resolveLogoutSource(Object.assign({
                    logoutSource: 'finalize'
                }, options)),
                finalize: true,
                signoff: true
            };

            if (options.finalizeExtras && typeof options.finalizeExtras === 'object') {
                Object.assign(payload, options.finalizeExtras);
            }
            this.enrichCollaborativeLogoutPayload(payload);

            const endpoint = (typeof API_SAVE_WITH_FINALIZE !== 'undefined' && API_SAVE_WITH_FINALIZE) ?
                API_SAVE_WITH_FINALIZE :
                API_SAVE_WITH_LOGOUT;

            const response = await this.apiService.makeRequest(endpoint, payload, {});
            const normalized = this.normalizeSaveWithFinalizeResponse(response);

            return this.handleSaveWithLogoutResponse(normalized, {
                ...options,
                isSaveWithFinalize: true
            });
        } catch (error) {
            this.logError('SAVE_WITH_FINALIZE', error.message);
            return {
                error: true,
                message: error.message,
                success: false,
                saveSuccess: false,
                logoutSuccess: false
            };
        }
    }

    /**
     * Pick saveWithFinalize vs saveWithLogout based on options / capability flags.
     */
    async saveWithFinalizeOrLogout(options = {}) {
        if (options.useSaveWithFinalize || (typeof window !== 'undefined' && window.IMPACT_SAVE_WITH_FINALIZE_READY === true)) {
            return this.saveWithFinalize({
                ...options,
                useCombinedSave: true,
                useSaveWithFinalize: true
            });
        }
        return this.saveWithLogout({
            ...options,
            useCombinedSave: true
        });
    }

    /**
     * Handle savewithlogout response
     * @param {Object} response - API response
     * @param {Object} options - Logout options
     * @returns {Object} Processed result
     */
    handleSaveWithLogoutResponse(response, options = {}) {
        try {
            // Response Error: Common parsing/validation error
            if (response.error) {
                const errorMsg = response.error.m || 'Unknown error in savewithlogout';
                this.logError('SAVE_WITH_LOGOUT_ERROR', new Error(errorMsg));
                this.closeLogoutProgress();

                // Show error to user if not suppressed
                if (!options.noAlert) {
                    // Use existing error notification mechanism
                    console.error('Save and Logout Error:', errorMsg);
                }

                return {
                    success: false,
                    saveSuccess: false,
                    logoutSuccess: false,
                    error: errorMsg,
                    response
                };
            }

            const saveResult = response.save || {};
            const logoutResult = response.logout || response.session || {};
            const shareResult = response.shareandinvite || response.share || {};

            const saveSuccess = saveResult.r === 1;
            const logoutSuccess = logoutResult.r === 1;
            const shareSuccess = shareResult.r === 1;
            const finalizeSuccess = options.isSaveWithFinalize &&
                saveSuccess &&
                (logoutSuccess || shareSuccess || !!response.message);

            // Partial Success: Save OK but session/share finalize path failed
            if (saveSuccess && !logoutSuccess && options.isSaveWithFinalize && !shareSuccess) {
                this.logError('SAVE_WITH_FINALIZE_PARTIAL', new Error(
                    `Finalize path failed: ${logoutResult.message || shareResult.message || 'Unknown error'}`
                ));

                if (window.IMPACT_SAVE && typeof window.IMPACT_SAVE.handleSaveResponse === 'function') {
                    window.IMPACT_SAVE.handleSaveResponse(saveResult, options.regenerate);
                }

                return {
                    success: false,
                    saveSuccess: true,
                    logoutSuccess: false,
                    error: logoutResult.message || shareResult.message || 'Finalize path failed',
                    response
                };
            }

            // Partial Success: Save OK but logout failed (savewithlogout)
            if (saveSuccess && !logoutSuccess && !options.isSaveWithFinalize) {
                this.logError('SAVE_WITH_LOGOUT_PARTIAL', new Error(
                    `Logout failed: ${logoutResult.message || 'Unknown error'}`
                ));

                // Update save tracking from SaveModule
                if (window.IMPACT_SAVE && typeof window.IMPACT_SAVE.handleSaveResponse === 'function') {
                    window.IMPACT_SAVE.handleSaveResponse(saveResult, options.regenerate);
                }

                // Try fallback logout via closeSession
                return this.handlePartialLogoutSuccess(options, response);
            }

            // Full Success: save + session/logout or savewithfinalize path
            if ((saveSuccess && logoutSuccess) || finalizeSuccess) {
                // Update save tracking from SaveModule
                if (window.IMPACT_SAVE && typeof window.IMPACT_SAVE.handleSaveResponse === 'function') {
                    window.IMPACT_SAVE.handleSaveResponse(saveResult, options.regenerate);
                }

                // Cleanup session storage
                if (typeof cleanupSessionStorageBackups === 'function') {
                    cleanupSessionStorageBackups(DOC_ID, 'single');
                }

                this.canRedirect = true;
                window._CanClose = true;

                return {
                    success: true,
                    saveSuccess: true,
                    logoutSuccess: logoutSuccess || shareSuccess || finalizeSuccess,
                    saveFile: saveResult.file_sn,
                    response
                };
            }

            // Both failed
            this.logError('SAVE_WITH_LOGOUT_FAILED', new Error('Both save and logout failed'));
            this.closeLogoutProgress();

            return {
                success: false,
                saveSuccess: false,
                logoutSuccess: false,
                error: 'Save and logout both failed',
                response
            };

        } catch (error) {
            this.logError('HANDLE_SAVE_LOGOUT_RESPONSE', error.message);
            this.closeLogoutProgress();
            return {
                error: true,
                message: error.message
            };
        }
    }

    /**
     * Handle partial success (save OK, logout failed) - fallback to closeSession
     * @param {Object} options - Logout options
     * @param {Object} originalResponse - Original partial response
     * @returns {Promise<Object>} Final result
     */
    async handlePartialLogoutSuccess(options = {}, originalResponse = {}) {
        try {
            // Try traditional session close as fallback
            const fallbackResult = await this.closeSession(options);

            return {
                success: fallbackResult && fallbackResult.r === 1,
                saveSuccess: true,
                logoutSuccess: fallbackResult && fallbackResult.r === 1,
                fallbackUsed: true,
                originalResponse
            };
        } catch (error) {
            this.logError('PARTIAL_LOGOUT_FALLBACK', error.message);
            return {
                success: false,
                saveSuccess: true,
                logoutSuccess: false,
                fallbackFailed: true,
                error: error.message,
                originalResponse
            };
        }
    }

    /**
     * Send error mail notification
     */
    sendErrorMail(evt) {
        try {
            const eventName = evt || this.EVENTS.DEFAULT;
            if (window.moduleSystem && window.moduleSystem.sendErrorMail) {
                window.moduleSystem.sendErrorMail(eventName, {});
            }
        } catch (error) {
            this.logError('SEND_ERROR_MAIL', error.message);
        }
    }
    transferUserActivityData(evt) {
        try {
            const eventName = evt || this.EVENTS.DEFAULT;
            if (window.moduleSystem && window.moduleSystem.transferUserActivityData) {
                window.moduleSystem.transferUserActivityData(eventName, {});
            }
        } catch (error) {
            this.logError('transferUserActivityData', error.message);
        }
    }

    /**
     * Wait for save completion using Promise-based polling
     */
    waitForSaveCompletion(options = {}) {
        return new Promise((resolve, reject) => {
            const saveWaitTimeout = (window.IMPACT_SAVE && typeof window.IMPACT_SAVE.getLogoutSaveWaitTimeout === 'function') ?
                window.IMPACT_SAVE.getLogoutSaveWaitTimeout() :
                25000;

            const timeout = setTimeout(async () => {
                this.clearSaveScheduler();
                if (options.logoutEvent === this.EVENTS.FINALIZE) {
                    try {
                        await this.closeSession(options);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                    return;
                }
                reject(new Error('Save completion timeout'));
            }, saveWaitTimeout);

            this.saveScheduler = setInterval(async () => {
                try {
                    const hasSave = (window.IMPACT_SAVE && window.IMPACT_SAVE.state && window.IMPACT_SAVE.state.lastSaveReturn);

                    if (hasSave) {
                        clearTimeout(timeout);
                        this.clearSaveScheduler();

                        // Wait a bit then initiate session close
                        setTimeout(async () => {
                            await this.closeSession(options);
                            resolve();
                        }, this.config.POST_SAVE_DELAY);
                    }
                } catch (error) {
                    clearTimeout(timeout);
                    this.clearSaveScheduler();
                    reject(error);
                }
            }, this.config.SAVE_CHECK_INTERVAL);
        });
    }

    /**
     * Stop runtime schedulers once session close owns the flow.
     */
    stopSessionSchedulers(options = {}) {
        try {
            this.clearSaveScheduler();

            if (window.IMPACT_SAVE) {
                if (typeof window.IMPACT_SAVE.cancelScheduler === "function") {
                    window.IMPACT_SAVE.cancelScheduler();
                }

                if (typeof window.IMPACT_SAVE.stopAutoSave === "function") {
                    window.IMPACT_SAVE.stopAutoSave();
                }
            }

            if (typeof CHECK_REQUEST !== "undefined" && typeof CHECK_REQUEST.StopAll === "function") {
                CHECK_REQUEST.StopAll();
            }

            if (window.paraLock && window.paraLock._isEnabled) {
                if (typeof window.paraLock._pauseEvents === "function") {
                    window.paraLock._pauseEvents();
                }
                if (options.closeParaLockSession !== false && typeof window.paraLock._sendToServer === "function") {
                    window.paraLock._sendToServer({
                        lock_paraId: ['0']
                    }, "close_session");
                }
            }
        } catch (error) {
            this.logError('STOP_SESSION_SCHEDULERS', error.message);
        }
    }

    /**
     * Close the user session
     */
    async closeSession(options = {}) {
        try {
            options = options || {};


            let process = options.process || "close";
            let noRedirect = options.noRedirect || false;
            let remarks = options.remarks || "logout";
            let source = this.resolveLogoutSource(options);

            if (typeof GET_JSON === "function") {

                const sessionData = GET_JSON('linksharing', {
                    process: process,
                    remarks: remarks
                });
                if (sessionData && !sessionData.source) {
                    sessionData.source = source;
                }
                this.enrichCollaborativeLogoutPayload(sessionData);
                try {
                    var docId = window.GET_DOC_ID ? window.GET_DOC_ID() : (typeof DOC_ID !== 'undefined' ? DOC_ID : '');
                    console.info('[LinkSessionClose]', {
                        process: process,
                        source: source,
                        remarks: remarks,
                        session_id: sessionData && sessionData.session_id,
                        docid: docId
                    });
                    if (typeof ErrorLogTrace === 'function') {
                        /* ErrorLogTrace('LinkSessionClose', JSON.stringify({
                            process: process,
                            source: source,
                            remarks: remarks,
                            session_id: sessionData && sessionData.session_id,
                            docid: docId
                        })); */
                    }
                } catch (logErr) {}

                try {
                    const response = await this.apiService.makeRequest(API_LINK_SHARE, sessionData, {});
                    if (response.r == 1) {
                        this.stopSessionSchedulers(options);
                    }
                    if (typeof cleanupSessionStorageBackups === "function") {
                        cleanupSessionStorageBackups(DOC_ID, "single");
                    }
                    if (typeof clearEditorTabId === "function") {
                        clearEditorTabId(DOC_ID);
                    } else {
                        try {
                            sessionStorage.removeItem('xmleditor:tabid');
                        } catch (e) {}
                    }

                    if (noRedirect) {
                        this.closeLogoutProgress();
                        return response;
                    }

                    this.handleRedirect(response, {});
                    return response;

                } catch (error) {
                    this.closeLogoutProgress();
                    this.logError("linksharing", error);
                }
            }
        } catch (error) {
            this.closeLogoutProgress();
            this.logError('CLOSE_SESSION', error.message);
        }
    }

    /**
     * Handle post-logout redirect
     * @param {Object} response - Server response
     * @param {Object} options - Redirect options
     */
    handleRedirect(response = {}, options = {}) {
        try {
            if (response.r === 1) {
                console.log("Updated close log-out");
            }

            if (options.no_redirect) {
                this.closeLogoutProgress();
                return;
            }

            if (this.canRedirect && window.RE_DIRECT_CUR_SESSION) {
                this.closeLogoutProgress();
                window.RE_DIRECT_CUR_SESSION(response);
            } else {
                // Retry redirect after delay
                setTimeout(() => {
                    this.handleRedirect({}, options);
                }, this.config.REDIRECT_RETRY_DELAY);
            }
        } catch (error) {
            this.closeLogoutProgress();
            this.logError('HANDLE_REDIRECT', error.message);
        }
    }

    showLogoutProgress() {
        try {
            if (!this.config.ENABLE_LOGOUT_PROGRESS) return;
            // Finalize owns its own stage UI — do not overlay logout progress
            if (this.isFinalizeInProgress()) return;

            var host = document.getElementById('ModelDialogAppend') || document.body;
            var overlay = document.getElementById('logoutLoadingOverlay');
            var dialog = document.getElementById('logoutLoadingDialog');

            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'logoutLoadingOverlay';
                host.appendChild(overlay);
            }

            if (!dialog) {
                dialog = document.createElement('div');
                dialog.id = 'logoutLoadingDialog';
                dialog.className = 'container';
                dialog.innerHTML = [
                    '<div class="logout-progress-title">Logging out</div>',
                    '<ul id="logout-progress-steps" class="logout-progress-steps">',
                    '<li data-stage="saving"><span class="logout-step-check" aria-hidden="true"></span> Saving content</li>',
                    '<li data-stage="profile"><span class="logout-step-check" aria-hidden="true"></span> Syncing profile</li>',
                    '<li data-stage="session"><span class="logout-step-check" aria-hidden="true"></span> Closing session</li>',
                    '</ul>',
                    '<div class="logout-progress-track" aria-hidden="true">',
                    '<div id="logout-progress-fill" class="logout-progress-fill"></div>',
                    '</div>'
                ].join('');
                // Keep dialog as sibling of overlay so shared fixed centering CSS applies.
                host.appendChild(dialog);
            } else {
                // Reset checklist state for a fresh logout wait.
                var steps = dialog.querySelectorAll('#logout-progress-steps [data-stage]');
                for (var i = 0; i < steps.length; i++) {
                    steps[i].classList.remove('is-active', 'is-done');
                }
                var fillReset = dialog.querySelector('#logout-progress-fill');
                if (fillReset) fillReset.style.width = '0%';
            }

            overlay.classList.remove('ds-none');
            dialog.classList.remove('ds-none');
            this.logoutProgressBar = 0;
            this.updateLogoutProgress('saving');
        } catch (error) {
            this.logError('SHOW_LOGOUT_PROGRESS', error.message);
        }
    }

    /**
     * Update horizontal bar + tick step checkboxes one-by-one.
     * @param {string} stageKey - saving | profile | session | complete
     */
    updateLogoutProgress(stageKey) {
        try {
            if (!this.config.ENABLE_LOGOUT_PROGRESS) return;
            if (this.isFinalizeInProgress()) return;

            var stage = this.logoutProgressStages[stageKey];
            if (!stage) return;

            var dialog = document.getElementById('logoutLoadingDialog');
            if (!dialog) return;

            var stageOrder = ['saving', 'profile', 'session'];
            var activeIdx = stageKey === 'complete' ? stageOrder.length : stageOrder.indexOf(stageKey);
            var steps = dialog.querySelectorAll('#logout-progress-steps [data-stage]');

            for (var i = 0; i < steps.length; i++) {
                var step = steps[i];
                var key = step.getAttribute('data-stage');
                var idx = stageOrder.indexOf(key);
                var isActive = key === stageKey;
                var isDone = stageKey === 'complete' || (idx >= 0 && idx < activeIdx);

                step.classList.toggle('is-active', isActive && !isDone);
                step.classList.toggle('is-done', isDone);
            }

            var barValue = Math.max(this.logoutProgressBar || 0, stage.bar);
            this.logoutProgressBar = barValue;
            this.updateLogoutProgressBar(barValue);
        } catch (error) {
            this.logError('UPDATE_LOGOUT_PROGRESS', error.message);
        }
    }

    /**
     * Set horizontal progress fill width.
     * @param {number} percent - 0..100
     */
    updateLogoutProgressBar(percent) {
        try {
            var fill = document.getElementById('logout-progress-fill');
            if (!fill) return;
            fill.style.width = Math.max(0, Math.min(100, percent)) + '%';
        } catch (error) {
            this.logError('UPDATE_LOGOUT_PROGRESS_BAR', error.message);
        }
    }

    clearLogoutProgressTimer() {
        if (this.logoutProgressTimer) {
            clearInterval(this.logoutProgressTimer);
            this.logoutProgressTimer = null;
        }
    }

    closeLogoutProgress() {
        try {
            if (!this.config.ENABLE_LOGOUT_PROGRESS) return;
            this.clearLogoutProgressTimer();

            var dialog = document.getElementById('logoutLoadingDialog');
            var overlay = document.getElementById('logoutLoadingOverlay');

            if (dialog) {
                this.updateLogoutProgress('complete');
            }

            setTimeout(() => {
                if (dialog) dialog.classList.add('ds-none');
                if (overlay) overlay.classList.add('ds-none');
            }, 120);
        } catch (error) {
            this.logError('CLOSE_LOGOUT_PROGRESS', error.message);
        }
    }

    /**
     * Show confirmation dialog based on user role
     */
    async showConfirmationDialog() {
        try {
            const dialogKey = window.USER_INFO && window.USER_INFO.IS_CO_ROLE ? 'LogOutShow_corole' : 'LogOutShow';
            var maintenanceHtml =
                window.MAINTENANCE &&
                typeof window.MAINTENANCE.fire === "function" &&
                window.MAINTENANCE.fire({
                    returnText: true
                }) || '';


            if (window.AlertNewDialog && window.AlertNewDialog.fire) {
                const result = await window.AlertNewDialog.fire(dialogKey, {
                    hide: true,
                    force: true,
                    warnBlock: true,
                    warnHtml: maintenanceHtml
                });

                return result.isConfirmed;
            }

            // Fallback to native confirm
            return confirm('Are you sure you want to log out?');
        } catch (error) {
            this.logError('SHOW_CONFIRMATION', error.message);
            return false;
        }
    }

    /**
     * Show offline warning
     */
    showOfflineWarning() {
        try {
            if (window.TOASTER_ALERT) {
                window.TOASTER_ALERT('SignOutOffLine', {
                    type: 'warning'
                });
            } else {
                alert('You are currently offline. Please check your connection and try again.');
            }
        } catch (error) {
            this.logError('SHOW_OFFLINE_WARNING', error.message);
        }
    }

    /**
     * Clear the save scheduler
     */
    clearSaveScheduler() {
        if (this.saveScheduler) {
            clearInterval(this.saveScheduler);
            this.saveScheduler = null;
        }
    }

    /**
     * Log errors consistently
     * @param {string} context - Error context
     * @param {string} message - Error message
     */
    logError(context, message) {
        console.warn(`${context} ${message}`);

        if (window.ErrorLogTrace) {
            window.ErrorLogTrace(context, message);
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.clearSaveScheduler();
        this.clearLogoutProgressTimer();

        const logoutButton = document.getElementById('log_out_btn');
        if (logoutButton) {
            if (window.jQuery) {
                window.jQuery(logoutButton).off('click.logoutManager');
            }
        }
    }
}

// Create and initialize the logout manager
const logoutManager = new LogoutManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => logoutManager.init());
} else {
    logoutManager.init();
}

// Export for global access (maintaining backward compatibility)
window.LOG_OUT = {
    fire: (options) => logoutManager.handleLogout(options),
    Init: () => logoutManager.init(),
    logoutReDirect: (response, options) => logoutManager.handleRedirect(response, options),
    closeSession: (options) => logoutManager.closeSession(options),
    saveWithLogout: (options) => logoutManager.saveWithLogout(options),
    saveWithFinalize: (options) => logoutManager.saveWithFinalize(options),
    saveWithFinalizeOrLogout: (options) => logoutManager.saveWithFinalizeOrLogout(options),
    EVENTS: logoutManager.EVENTS,

    // Legacy properties for backward compatibility
    get CanReDirect() {
        return logoutManager.canRedirect;
    },
    set CanReDirect(value) {
        logoutManager.canRedirect = value;
    },

    get SAVE_SCHEDULER() {
        return logoutManager.saveScheduler;
    },
    set SAVE_SCHEDULER(value) {
        logoutManager.saveScheduler = value;
    }
};



/**
 * SaveModule - Handles document saving functionality with validation
 * Refactored as a modern ES6 class with clean separation of concerns
 * 
 * @class SaveModule
 * @version 2.0.0
 */

class SaveModule {
    constructor(options = {}) {

        this.config = {
            timerInterval: {
                "online": 40000,
                "offline": 10000,
                "reTry": 2000,
                "checkSpinner": 500
            },
            retryInterval: options.retryInterval || 1500,
            maxRetries: options.maxRetries || 10,
            spinnerCheckInterval: options.spinnerCheckInterval || 1000,
            ...options
        };

        // State management
        this.state = {
            dataValue: null,
            autoSaveCount: 0,
            offlineSaveCount: 0,
            lastSaveReturn: false,
            retryBoolean: true,
            lastSaveTimestamp: 0,
            lastRestoredTime: null,
            scheduler: null,
            spinScheduler: null,
            validationRetryTimer: null,
            validationRetryAttempts: 0
        };

        // History tracking
        this.saveHistory = [];

        this.editorReady = false;

        // Validation dependencies

        this.apiService = new FetchService();

        this._cjkValidator = null;
        this.contentValidator = null;

        // Initialize
        // this.initialize();
    }

    /**
     * Initialize the save module
     * @private
     */
    initialize() {
        try {
            // Get DOM elements
            this.saveButton = document.getElementById('filesaving');

            // Initialize save strings
            this.saveStrings = {
                default: `<a href="javascript:SaveModule.instance.save()"><div class="top-menu-icon-img"><img src="assets/images/svg/mainPage/SaveFile_0.svg" class="top-menu-icon" alt="Save"/></div></a>`,
                dirty: `<a href="javascript:SaveModule.instance.save()"><div class="top-menu-icon-img"><img src="assets/images/svg/mainPage/SaveFile.svg" class="top-menu-icon hideoverdisplay" alt="Save"/><img src="assets/images/svg/mainPage/SaveFile_2.svg" class="top-menu-icon showoverdisplay" alt="Save"/></div></a>`,
                spinner: '<div class="spinner-border iSpin_border" role="status"></div>'
            };

            // Setup callbacks
            this.setupCallbacks();

            this.setUpEditorInstance();

            // Store instance for global access
            SaveModule.instance = this;

            // Initialize content validator
            this._cjkValidator = new CJKValidator();
            this.contentValidator = new ContentValidatorBeforeSave();

            console.log('SaveModule initialized successfully');
        } catch (error) {
            this.logError('initialize', error);
        }
    }

    Init() {
        if (!IS_TRACK_VIEW) {
            this.initialize();
            this.startAutoSave(true);
        }
    }

    setUpEditorInstance() {

        const checkInterval = setInterval(() => {

            this.editor =
                window.GlobalEditor ||
                (window.CKEDITOR &&
                    window.CKEDITOR.instances &&
                    window.CKEDITOR.instances.maineditor) ||
                null;


            if (this.editor && this.editor.document) {
                // Stop checking once editor is ready
                clearInterval(checkInterval);

                // Set up document references
                this.globalDocument = this.editor.document;
                this.globalDocBody = this.globalDocument.getBody().$;
                this.editorReady = true;
                console.log("Editor instance found and set up.");
            }
            // check every 200ms
        }, 500);
    }


    /**
     * Setup callback functions for API responses
     * @private
     */
    setupCallbacks() {
        const self = this;

        // Save content response callback
        /*
        commonfn['SAVE_CONTENT_RESPONSE'] = function (response, isGenerateFiles) {
            self.handleSaveResponse(response, isGenerateFiles);
        };

        // Save time update callback  
        commonfn['SAVE_TIME_UPDATE_DB'] = function (response) {
            self.handleSaveTimeUpdate(response);
        };

        // Original file save callback
        commonfn['setOriginalfilebyRole'] = function (response) {
            self.handleOriginalFileSave(response);
        }; */
    }

    /**
     * Main save method
     * @param {Object} options - Save options
     * @returns {Promise<boolean>} Save success status
     * @public
     */
    async save(options = {}) {

        try {

            // Check current status
            /* 
            var canProceed = this.checkCurrentStatus('save');
            if (canProceed == false) return commonfn.CURRENT_STATUS_POST({
                data: []
            }, true, ''); 
            */

            // Set defaults
            const saveOptions = {
                roleOriginal: false,
                forceSave: false,
                noAlert: false,
                autoSave: false,
                offlineSave: false,
                regenerate: false,
                lockfile: false,
                ...options
            };

            saveOptions.autoSave = options.autoSave || options.autosave || false;
            saveOptions.forceSave = options.forceSave || options.forcesave || false;
            saveOptions.noAlert = options.noAlert || options.noalert || false;

            const sessionValidation = await this.validateSessionBeforeSave(saveOptions);
            if (!sessionValidation.isValid && !IS_LOCAL_HOST) {
                var messageParam = JSON.stringify({
                    options: saveOptions,
                    validation: sessionValidation
                });
                return false;
            }

            // Reset state
            this.state.lastSaveReturn = false;
            window._CanClose = false;

            // Wait for editor
            if (!this.editorReady) {
                this.setUpEditorInstance();
                this.retrySave(saveOptions);
                return false;
            }

            // Check if save is needed
            if (!this.shouldSave(saveOptions)) {
                this.handleNoSaveNeeded(saveOptions);
                return false;
            }

            console.log('Starting save process...');

            if (!(this.globalDocBody && this.globalDocBody.querySelectorAll)) {
                setTimeout(() => {
                    this.setUpEditorInstance();
                    this.save(options);
                }, 500);
                return;
            }

            // Validate content 
            // ! STAGE_0
            const validationResult = await this.validateContent(saveOptions);
            if (!validationResult.isValid) {
                this.handleValidationFailure(validationResult, saveOptions);
                return false;
            }

            // ! STAGE_1
            // if (IS_LOCAL_HOST) debugger;

            try {
                var equationCount = this.state.equationCount || 0;
                var isHeavyMath = this.state.isHeavyMath || false;
                var lastSaveTimestamp = this.state.lastSaveTimestamp || 0;

                if (SHARED_KEY && SHARED_KEY.xmltohtmlres && SHARED_KEY.xmltohtmlres.equation) {
                    equationCount = Number(SHARED_KEY.xmltohtmlres.equation);
                    isHeavyMath = equationCount > 15;
                    this.state.isHeavyMath = isHeavyMath;
                    this.state.equationCount = equationCount;
                }

                var ignoreFirstCheck = isHeavyMath && lastSaveTimestamp == 0;
                const stageTwoResults = await this.contentValidator.validateDocumentContent();

                var IGNORE_ALERT = (SHARED_KEY && SHARED_KEY.ignore_cjk_alert == true) || ignoreFirstCheck;

                if (IGNORE_ALERT) {
                    debug.log("ignoreFirstCheck alert:", isHeavyMath, lastSaveTimestamp, ignoreFirstCheck);
                } else if (!stageTwoResults.isValid) {
                    console.log(stageTwoResults);
                    validationResult.reason = "CJK_MISMATCH";
                    this.handleValidationFailure(validationResult, options);
                    return false;
                }

            } catch (err) {
                this.retrySave(options);
                return console.error("Validation error:", err.message);
            }

            // Clean data
            if (typeof SET_DATA !== 'undefined' && SET_DATA.CLEAN_DOM) {
                this.state.dataValue = SET_DATA.CLEAN_DOM(null, this.state.dataValue, {
                    returnString: true
                });
            }

            // Handle role original save
            if (saveOptions.roleOriginal) {
                return this.saveOriginalFile(saveOptions);
            }

            // Perform save
            if (this.isOnline()) {
                await this.performOnlineSave(saveOptions);
            } else {
                await this.performOfflineSave(saveOptions);
            }

            // Reset dirty state
            this.resetDirtyState();

            return true;

        } catch (error) {
            this.logError('save', error);
            return false;
        }
    }

    /**
     * Validate that the current tab still owns an active session before saving.
     *
     * This method is responsible for ensuring that the current browser tab still
     * owns an active editing session before an online save proceeds.
     *
     * Common scenarios:
     *  - First time document open: the current tab establishes a session ID and
     *    the server session record should match that ID.
     *  - Browser tab refresh: the stored session ID is reused from sessionStorage
     *    and validation succeeds if the renewed tab still owns the active session.
     *  - Browser tab crash / reopen: sessionStorage may be cleared, resulting in a
     *    new session ID and a stale tab if the original session still exists on
     *    the server.
     *  - Another session opened: if a different tab/browser claims the same doc
     *    and role, the stale tab will be blocked from saving.
     *  - Same browser, another tab: the duplicate tab may share a mirrored session
     *    ID, but if the server indicates the current tab no longer owns the active
     *    session, validation rejects the save.
     *
     * Result object remarks:
     *  - active_session: current tab owns the active session.
     *  - offline_save: validation skipped for offline save.
     *  - validation_skipped: required session APIs are not ready.
     *  - stale_session: current tab is no longer the active session owner.
     *  - local_session_bypass: validation failed but bypassed for local host.
     *  - validation_postponed: transient request error; save will retry later.
     *  - validation_error: non-transient validation failure.
     *
     * @param {Object} options - Save options
     * @returns {Promise<Object>} Session validation result
     * @private
     */
    async validateSessionBeforeSave(options = {}) {
        try {
            if (options.offlineSave || !this.isOnline()) {
                this.resetValidationRetryState();
                return {
                    isValid: true,
                    remark: 'offline_save',
                    message: 'Session validation skipped because save is offline.'
                };
            }
            var docIdResolved = '';
            try {
                docIdResolved = String(
                    (window.GET_DOC_ID && window.GET_DOC_ID()) ||
                    (typeof DOC_ID !== 'undefined' ? DOC_ID : '') ||
                    ''
                ).trim();
            } catch (docIdError) {
                docIdResolved = String(typeof DOC_ID !== 'undefined' ? DOC_ID : '').trim();
            }
            const instance = typeof LinkSessionCore.getInstance === 'function' ? LinkSessionCore.getInstance() : null;
            const verify = await instance.guardEditorSession();

            const sessionRecord = verify.row || (verify.rows && verify.rows[0]) || null;
            if (!docIdResolved && sessionRecord && sessionRecord.docid != null) {
                docIdResolved = String(sessionRecord.docid || '').trim();
            }
            const currentSessionId = getCurrentSessionId();
            const action = (typeof LinkSessionCore !== 'undefined' && LinkSessionCore.mapSaveValidationReason) ?
                LinkSessionCore.mapSaveValidationReason(verify) :
                (verify && verify.ok ?
                    'allow' :
                    (verify && (verify.reason === 'request_error' || verify.reason === 'getdocs_unavailable') ?
                        'postpone' :
                        'stale'));

            if (action === 'postpone') {
                const requestError = new Error((verify && verify.error) || 'Session validation request failed');
                return this.handleSessionValidationTransientFailure(options, requestError, verify && verify.reason);
            }

            if (action === 'stale' && !IS_LOCAL_HOST) {
                const serverSessionId = sessionRecord ? String(sessionRecord.session_id || '').trim() : '';
                console.warn(
                    '[SaveModule.validateSessionBeforeSave] Session validation failed via dual-guard.', {
                        client: currentSessionId,
                        server: serverSessionId,
                        docid: docIdResolved,
                        reason: verify.reason
                    }
                );
                this.resetValidationRetryState();
                await this.redirectStaleSession(sessionRecord);
                return {
                    isValid: false,
                    remark: verify.reason === 'multiple_active' ? 'multiple_active_sessions' : 'stale_session',
                    message: 'Current tab does not own an active editing session.',
                    sessionRecord: sessionRecord
                };
            }

            this.resetValidationRetryState();
            return {
                isValid: true,
                remark: (verify && verify.ok) ? 'active_session' : 'local_session_bypass',
                message: (verify && verify.ok) ?
                    'Current tab owns an active editing session.' : 'Session validation failed but was bypassed for local host.',
                sessionRecord: sessionRecord
            };


            // No second getdocs body — dual-guard helper required
            if (IS_LOCAL_HOST) {
                this.resetValidationRetryState();
                return {
                    isValid: true,
                    remark: 'local_helper_unavailable_bypass',
                    message: 'confirmLinkSessionOnServer unavailable; local host bypass.'
                };
            }

            this.resetValidationRetryState();
            const missingHelperError = new Error('confirmLinkSessionOnServer unavailable');
            return this.handleSessionValidationTransientFailure(options, missingHelperError);


            // Perform online session validation
        } catch (error) {
            if (this.isTransientRequestError(error)) {
                return this.handleSessionValidationTransientFailure(options, error);
            }

            this.logError('validateSessionBeforeSave', error);
            return {
                isValid: false,
                remark: 'validation_error',
                message: error && error.message ? error.message : 'Session validation failed.',
                errorName: error && error.name ? error.name : ''
            };
        }
    }

    /**
     * Handle transient session validation failures with bounded retries.
     * @param {Object} options - Original save options
     * @param {Error} error - Request error
     * @param {string} reason - Optional validation reason
     * @returns {Object} Validation result
     * @private
     */
    handleSessionValidationTransientFailure(options, error, reason) {
        this.state.validationRetryAttempts = (this.state.validationRetryAttempts || 0) + 1;
        const maxRetries = Number(this.config.maxRetries) || 5;
        const message = error && error.message ? error.message : 'Session validation request failed; save postponed.';

        if (this.state.validationRetryAttempts < maxRetries) {
            this.postponeSaveAfterValidationError(options, error);
            return {
                isValid: false,
                retry: true,
                remark: 'validation_postponed',
                message: message,
                errorName: error && error.name ? error.name : '',
                reason: reason,
                attempt: this.state.validationRetryAttempts,
                maxRetries: maxRetries
            };
        }

        this.resetValidationRetryState();
        this.logError('validateSessionBeforeSave', error);
        return {
            isValid: false,
            retry: false,
            remark: 'validation_error',
            message: message,
            errorName: error && error.name ? error.name : '',
            reason: reason,
            attempt: maxRetries,
            maxRetries: maxRetries
        };
    }

    /**
     * Check whether a request error is likely transient and safe to retry later.
     * @param {Error} error - Request error
     * @returns {boolean}
     * @private
     */
    isTransientRequestError(error) {
        const message = String(error && error.message ? error.message : error || '').toLowerCase();
        return error instanceof TypeError ||
            message.includes('failed to fetch') ||
            message.includes('networkerror') ||
            message.includes('load failed');
    }

    /**
     * Postpone save when session validation could not reach the server.
     * @param {Object} options - Original save options
     * @param {Error} error - Request error
     * @private
     */
    postponeSaveAfterValidationError(options, error) {
        console.warn('[SaveModule.validateSessionBeforeSave] Save postponed:', error);

        if (this.state.validationRetryTimer) {
            return;
        }

        this.state.validationRetryTimer = setTimeout(() => {
            this.state.validationRetryTimer = null;
            this.save(options);
        }, this.config.retryInterval);
    }

    /**
     * Clear pending validation retry timer.
     * @private
     */
    clearValidationRetryTimer() {
        if (this.state.validationRetryTimer) {
            clearTimeout(this.state.validationRetryTimer);
            this.state.validationRetryTimer = null;
        }
    }

    /**
     * Reset pending validation retry timer and attempt count.
     * @private
     */
    resetValidationRetryState() {
        this.clearValidationRetryTimer();
        this.state.validationRetryAttempts = 0;
    }
    fallbackRedirect(sessionRecord = null) {
        if (typeof RE_DIRECT_CUR_SESSION === 'function') {
            RE_DIRECT_CUR_SESSION(sessionRecord || {});
            return;
        }

        const redirectUrl = sessionStorage.getItem('redirect');
        if (redirectUrl) {
            window.location.href = redirectUrl;
        }
    }
    /**
     * Redirect a stale session away from the editor.
     * @param {Object} sessionRecord - Session row used for the decision
     * @private
     */
    async redirectStaleSession(sessionRecord) {
        try {
            this.cancelScheduler();
            window._CanClose = true;

            if (typeof AlertNewDialog !== 'undefined' && AlertNewDialog && typeof AlertNewDialog.fire === 'function') {
                try {
                    await AlertNewDialog.fire('expired_session_alert');
                } catch (alertError) {
                    this.logError('redirectStaleSessionAlert', alertError);
                }
            }
            STOP_ALL_EVENT_TIMERS();
            this.fallbackRedirect(sessionRecord);

        } catch (error) {
            this.logError('redirectStaleSession', error);
        }
    }

    /**
     * Validate document content
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation result
     * @private
     */
    async validateContent(options) {
        var self = this;
        return new Promise(function(resolve) {
            try {
                console.log("Validating content...");

                self.state.dataValue = self.prepareData();

                // Basic validation - check for empty content
                if (!self.state.dataValue || self.state.dataValue.length < 50) {
                    return resolve({
                        isValid: false,
                        reason: "EMPTY_CONTENT"
                    });
                }

                // Use ContentValidatorBeforeSave for comprehensive validation
                var hasDataNameElements = false;
                try {
                    // Check DOM body
                    var docHasDataName = false;
                    if (self && self.globalDocBody) {
                        var nodes = self.globalDocBody.querySelectorAll("[data-name]");
                        docHasDataName = nodes && nodes.length > 0;
                    }

                    // Check CKEditor instance
                    var editorHasDataName = false;
                    if (window.CKEDITOR &&
                        window.CKEDITOR.instances &&
                        window.CKEDITOR.instances.maineditor &&
                        window.CKEDITOR.instances.maineditor.document) {

                        var found = window.CKEDITOR.instances.maineditor.document.find("[data-name]");
                        if (found && typeof found.toArray === "function") {
                            var arr = found.toArray();
                            editorHasDataName = arr && arr.length > 0;
                        }
                    }

                    hasDataNameElements = docHasDataName || editorHasDataName;

                } catch (errorCheck) {
                    console.error("Error checking data-name elements:", errorCheck);
                }

                if (!hasDataNameElements) {
                    return resolve({
                        isValid: false,
                        reason: "MISSING_ATTRIBUTES"
                    });
                }

                // ✅ Passed all checks
                return resolve({
                    isValid: true,
                    reason: null
                });

            } catch (error) {
                self.logError("validateContent", error);
                return resolve({
                    isValid: false,
                    reason: "VALIDATION_ERROR",
                    error: error.message
                });
            }
        });
    }


    prepareData() {
        // Get data from editor
        if (typeof this.editor.getData === 'function') {
            return this.editor.getData();
        } else if (this && this.globalDocBody) {
            return this.globalDocBody.getInnerHTML();
        }
    }


    /**
     * Perform online save
     * @param {Object} options - Save options
     * @private
     */
    async performOnlineSave(options) {
        try {
            // Show spinner
            this.showSpinner();

            // Show toast notification
            if (!options.noAlert) {
                if (this.state.autoSaveCount === 0 && options.autoSave) {
                    this.showToast('AutoSave');
                }
            }

            // Update counters
            if (options.autoSave) {
                this.state.autoSaveCount++;
            }


            if (window.queryRestore && typeof window.queryRestore.validateAndRestoreQueries == "function") {

                var qCount = (window.queryRestore.contexts && window.queryRestore.contexts.original && window.queryRestore.contexts.original.queries) ? window.queryRestore.contexts.original.queries.size : 0;

                // If query count is high (>25) for non-journals, run in background after a delay
                // to ensure the save process proceeds immediately and is not blocked.
                if (IS_LOCAL_HOST) {

                } else {
                    if (!IS_JOURNAL && qCount > 25) {
                        setTimeout(() => {
                            window.queryRestore.validateAndRestoreQueries();
                        }, 2500);
                    } else {
                        window.queryRestore.validateAndRestoreQueries();
                    }
                }
            }

            // Prepare save data
            const saveData = this.prepareSaveData(options);

            // Add delay for regeneration
            var DELAY = 500;

            if ([I_rGEN_PDF, I_rGEN_XML].includes(options.regenerate)) {
                iDownloadMethod.changeSpinnerState(options.regenerate, true);
                DELAY = 1000;
            }

            await this.delay(DELAY);

            // Make API call

            const saveRequestStartedAt = Date.now();

            commonfn['saveResponse'] = (response, options) => {
                this.recordSaveResponseDuration(saveRequestStartedAt);
                this.handleSaveResponse(response, options.regenerate);

                // Update save time
                this.updateSaveTime();

                // Update UI
                this.updateSaveButton();

                console.log('Online save completed');
            }
            commonfn.callajax(saveData, "saveResponse", API_FORM_TO_FILE_FIELD, options);

        } catch (error) {
            this.logError('performOnlineSave', error);
            throw error;
        } finally {
            this.hideSpinner();
        }
    }

    /**
     * Record how long the latest online save took to receive a response.
     * @param {number} startedAt - Date.now() value captured before the request
     * @returns {number|null} Recorded elapsed milliseconds, or null when invalid
     * @public
     */
    recordSaveResponseDuration(startedAt) {
        const elapsed = Date.now() - Number(startedAt);

        if (!Number.isFinite(elapsed) || elapsed < 0) {
            return null;
        }

        if (!Array.isArray(this.saveHistory)) {
            this.saveHistory = [];
        }

        this.saveHistory.push({
            type: 'online-save-response',
            requestStartedAt: Number(startedAt),
            responseReceivedAt: Date.now(),
            responseDuration: elapsed
        });

        return elapsed;
    }

    /**
     * Get the logout wait timeout from observed save response timings.
     * @returns {number} Timeout in milliseconds
     * @public
     */
    getLogoutSaveWaitTimeout() {
        const fallbackTimeout = 25000;
        const extraWait = 5000;
        const history = Array.isArray(this.saveHistory) ? this.saveHistory : [];
        const maxDuration = history.reduce((max, record) => {
            const duration = Number(record && record.responseDuration);
            return Number.isFinite(duration) && duration > max ? duration : max;
        }, 0);

        if (!Number.isFinite(maxDuration) || maxDuration <= 0) {
            return fallbackTimeout;
        }

        const timeout = maxDuration + extraWait;
        return Number.isFinite(timeout) && timeout > 0 ? timeout : fallbackTimeout;
    }

    /**
     * Perform offline save
     * @param {Object} options - Save options
     * @private
     */
    async performOfflineSave(options) {
        try {
            // Show offline warning
            if (this.state.offlineSaveCount === 0) {
                this.showToast('Offline_Save', {
                    type: 'warning'
                });
            }

            this.state.offlineSaveCount++;

            // Save to localStorage
            if (typeof LOCAL_DATA !== 'undefined') {
                localStorage.setItem(LOCAL_DATA, this.state.dataValue);
            }

            console.log('Offline save completed');

        } catch (error) {
            this.logError('performOfflineSave', error);
            throw error;
        }
    }

    /**
     * Prepare save data for API
     * @param {Object} options - Save options
     * @returns {Object} Save data
     * @private
     */
    prepareSaveData(options) {

        const timestamp = this.getTimestamp();
        this.state.lastSaveTimestamp = timestamp;

        const baseData = GET_JSON("default") || {};

        const saveData = {
            tbl: "Fileslist",
            subfolder: DOC_ID,
            status: "active",
            sopt: "openstorage",
            recent: 1,
            timestamp: timestamp,
            filename: DOC_ID + '_updated',
            backup: "_updated",
            corole: USER_INFO.IS_CO_ROLE || false,
            recordtype: options.autoSave ? "autosave" : "save",
            count_info: this.getCountInfo(),
            last_restored: this.state.lastRestoredTime,
            order: SHARED_KEY && SHARED_KEY.order || 0,
            a: encodeURIComponent(this.state.dataValue),
            keyname: "a",
            ...baseData
        };

        // Add role info
        if (options.roleOriginal) {
            saveData.roleorg = USER_INFO.ROLE_ID;
        }

        // Add lock file flag
        if (options.lockFile || options.lockfile) {
            saveData.lockfile = true;
        }

        // Add role backup folder
        if (USER_INFO && USER_INFO.SELECTOR_BKUP_FOLDER) {
            saveData.roleid = USER_INFO.SELECTOR_BKUP_FOLDER;
        }

        if (!saveData["shorttitle"]) {
            var shortTitleData = ADD_DEFAULT_KEYS("default", {}, ['shorttitle']);
            saveData.shorttitle = shortTitleData.shorttitle;
        }

        // ? validate sending
        if (SHARED_KEY._id) saveData['shared_id'] = SHARED_KEY._id || '';

        // console.log(JSON.stringify($.extend({}, saveData, {a: ''})));
        return saveData;
    }

    /**
     * Get save data for logout combined call
     * @param {Object} options - Save options
     * @returns {Object} Prepared save data
     * @public
     */
    getSaveDataForLogout(options = {}) {
        try {
            return this.prepareSaveData({
                forceSave: true,
                noAlert: options.noAlert || false,
                regenerate: options.regenerate || false,
                lockfile: options.lockfile || false,
                timestamp: options.timestamp || Date.now().toString()
            });
        } catch (error) {
            this.logError('getSaveDataForLogout', error);
            return null;
        }
    }

    /**
     * Get count information for queries and track changes
     * @returns {Object} Count info
     * @private
     */
    getCountInfo() {
        var counts = {
            query: 0,
            insert: 0,
            del: 0
        };

        try {
            var doc = this && this.globalDocument;
            var find;

            if (doc && typeof doc.find === 'function') {
                find = doc.find;
                counts.query = find.call(doc, '[data-class="ckcommentsfull"][data-status="Open"]').count();
                counts.insert = find.call(doc, 'insert').count();
                counts.del = find.call(doc, 'del').count();
            }

        } catch (error) {
            if (typeof this.logError === 'function') {
                this.logError('getCountInfo', error);
            }
        }

        return counts;
    }

    /**
     * Start auto-save timer
     * @param {boolean} isBackOnline - Whether coming back online
     * @public
     */
    startAutoSave(isBackOnline = false) {
        try {
            // Cancel existing scheduler
            // this.cancelScheduler();

            // Save immediately if back online
            if (isBackOnline) {
                this.save({
                    forceSave: true,
                    noAlert: true
                });
            }

            // Get timer interval
            const interval = this.getTimerInterval();

            // Start scheduler
            this.state.scheduler = setInterval(() => {
                if (this.state.scheduler == null || typeof this.state.scheduler != 'number') {
                    return;
                }
                if ((SHARED_KEY && SHARED_KEY.apikey) || IS_TEST_ENV) {
                    this.save({
                        autoSave: true
                    });
                }
            }, interval);

            console.log('Auto-save started');

        } catch (error) {
            this.logError('startAutoSave', error);
        }
    }

    /**
     * Stop auto-save timer
     * @public
     */
    stopAutoSave() {
        this.cancelScheduler();
        console.log('Auto-save stopped');
    }

    /**
     * Handle save response
     * @param {Object} response - API response
     * @param {*} isGenerateFiles - Generate files flag
     * @private
     */
    handleSaveResponse(response, isGenerateFiles) {
        try {
            if (response.r === 0) {
                this.logError('SAVE_CONTENT_RESPONSE', new Error('FILE_NOT_SAVED'));
            } else if (response.r === 2) {
                this.logError('SAVE_CONTENT_RESPONSE', new Error('ALREADY_FINALIZED'));
                if (typeof commonfn.CURRENT_STATUS_POST === 'function') {
                    commonfn.CURRENT_STATUS_POST({
                        data: []
                    }, true, 'SAVE_CONTENT_RESPONSE');
                }
                return;
            }
            console.log('Save successful');
            _CanClose = true;
            _IsDirty = false;



            this.state.lastSaveReturn = true;
            this.state.lastRestoredTime = null;

            console.log("saved file successfully--" + JSON.stringify(response));
            // ? 29_MAY_2023/02_JUNE_2023 - YA

            if (this.state.autoSaveCount == 1) {
                MAINTENANCE.fire({
                    stage: "save"
                });
            }
            content_file_sn = response["file_sn"];
            if (isGenerateFiles) {
                try {
                    // ? &&SHARED_KEY.apikey error for api key missing
                    // ? DOWNLOAD AUTO FILES YA_AR 25-Nov-2021
                    // ? DOWNLOAD OutPut File list  DR_SK 01-Apr-2022
                    // ? API_KAFKA_PROD == Only for BOOKS PDF

                    var outputFile = DOC_ID + iDownloadMethod.Info[isGenerateFiles].file_suffix;
                    lastrun = isGenerateFiles;

                    var jsondata = {
                        'docid': DOC_ID,
                        "ext": "html",
                        "topic": MY_TOPIC,
                        "username": myuserUniqueId,
                        "platform": "htmltoxml",
                        // temp for jats
                        "consteps": '1',
                        "shorttitle": SHORT_TITLE,
                        "process": lastrun,
                        "outputfile": outputFile,
                        "files": [content_file_sn],
                        "fileson": [content_file_sn],
                        "domain": DOMAIN_ROOT
                    };

                    if (IS_DEV_DOMAIN || !IS_JOURNAL) {
                        jsondata["exepath"] = "IMPACT_DEV/HTMLtoXML/HTMLtoXML.exe";
                    }

                    debug.log(jsondata);

                    // ! 25_MAR_2023 - HANDLE COMMON KEYS GLOBAL METHOD
                    let tempObj = GET_JSON("default");
                    Object.assign(jsondata, tempObj);
                    commonfn['callajax'](jsondata, 'updatedpdfres', API_BATCH_CONVERT, isGenerateFiles);
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('IsGenerateFiles', err.message);
                }
            }
            // ? 06_JAN_23 - YA - AVOID UN_WANTED FOCUS
            // ? 01_FEB_23 VALIDATE QUERY COUNT
            if (typeof FinalizeDialog != "undefined") FinalizeDialog.CanReDirect = true;
            if (typeof LOG_OUT != "undefined") LOG_OUT.CanReDirect = true;
        } catch (error) {
            this.logError('handleSaveResponse', error);
        }
    }

    /**
     * Handle validation failure
     * @param {Object} validationResult - Validation result
     * @param {Object} options - Save options
     * @private
     */
    handleValidationFailure(validationResult, options) {

        var errorCode = validationResult && validationResult.reason || 'VALIDATION_ERROR';
        var recordType = {
            'MISSING_ATTRIBUTES': 'removeattributeissue',
            'EMPTY_CONTENT': 'emptycontent',
            'VALIDATION_ERROR': 'unknown',
            'CJK_MISMATCH': 'chinesemistch',
        }
        var issueType = recordType[errorCode] || 'unknown';

        console.warn('Validation failed:', errorCode);

        var loadDOM = document.getElementById('loadingDialog');
        if (loadDOM) loadDOM.classList.add('ds-none');

        const isCollator = USER_INFO.ROLE_ID === ROLE_IDS.CO;

        if (this.shouldOfferEmptyContentRestore(errorCode)) {
            this.showEmptyContentRestoreWarning(errorCode, isCollator);
            return;
        }

        this.proceedValidationFailure(errorCode, isCollator);
    }

    shouldOfferEmptyContentRestore(errorCode) {
        return errorCode === "EMPTY_CONTENT" && (IS_LOCAL_HOST || IS_UAT_DOMAIN);
    }

    proceedValidationFailure(errorCode, isCollator) {
        var fireMail = true;

        if (errorCode == "CJK_MISMATCH" && isCollator) {
            fireMail = false;
        } else {

            var linkShareClose = GET_JSON('linksharing', {
                process: "close"
            });
            commonfn['callajax'](linkShareClose, 'UPDATE_DB', API_LINK_SHARE, {
                no_redirect: true
            });
            /*
            var errData = GET_JSON("missing_attribute", {
                process: "update_db",
                recordtype: issueType
            });
            commonfn['callajax'](errData, 'UPDATE_DB', API_UPDATE_INSERT);
            */

            // Cancel save scheduler
            this.cancelScheduler();

            // Disable further saves
            this.state.retryBoolean = false;

            // Make editor read-only if critical
            this.setEditorReadOnly();
        }

        this.showDialogAlertwithMailSend(errorCode, isCollator, fireMail);
    }

    showEmptyContentRestoreWarning(errorCode, isCollator) {
        var self = this;
        var message = "Editor content looks empty. You can restore content from a saved version before continuing.";

        if (typeof AlertNewDialog === "undefined" || !AlertNewDialog || typeof AlertNewDialog.fire !== "function") {
            if (!this.openRestoreVersionDialog()) {
                this.proceedValidationFailure(errorCode, isCollator);
            }
            return;
        }

        var restorePrompt = AlertNewDialog.fire(
            'warning',
            'Loading Issue',
            message,
            'Restore Version',
            'Cancel',
            true, {
                override: false
            }
        );

        if (!restorePrompt || typeof restorePrompt.then !== "function") {
            return;
        }

        restorePrompt.then(function(result) {
            if (result && result.isDenied) {
                self.proceedValidationFailure(errorCode, isCollator);
                return;
            }

            if (!self.openRestoreVersionDialog()) {
                self.proceedValidationFailure(errorCode, isCollator);
            }
        });
    }

    openRestoreVersionDialog() {
        try {
            if (window.DocumentRestoreDialog && typeof window.DocumentRestoreDialog.show == "function") {
                window.DocumentRestoreDialog.show();
                return true;
            }

            if (typeof GlobalEditor !== "undefined" && GlobalEditor && typeof GlobalEditor.execCommand == "function") {
                GlobalEditor.execCommand("RESTORE_VERSION");
                return true;
            }
        } catch (error) {
            this.logError('openRestoreVersionDialog', error);
        }

        return false;
    }

    triggerAutoMail(errorCode, config) {
        if (window.SupportMailDialog != "undefined") {
            window.SupportMailDialog.errorMailWithFallback(errorCode, config);
        }
    }

    showDialogAlertwithMailSend(errorCode, isCollator, triggetMail = true) {
        var alertConfig = {};

        // ---------- Error mapping ----------
        if (errorCode === "CJK_MISMATCH") {
            alertConfig = {
                title: "East Asian Character Count Mismatch",
                messageKey: isCollator ? "CHINESE_CHAR" : "CHINSES_CONTACT_SUPPORT"
            };
        } else if (/MISSING_ATTRIBUTES|EMPTY_CONTENT|VALIDATION_ERROR/.test(errorCode)) {
            alertConfig = {
                title: "Loading Issue",
                messageKey: "FILE_NOT_SAVE"
            };
        }

        // ---------- Auto-mail trigger (explicitly ignored for CJK) ----------
        if (triggetMail === true && typeof this.triggerAutoMail === "function") {
            if (isCollator && errorCode === "CJK_MISMATCH") return;

            var msgObj = ALERT_MESSAGE && ALERT_MESSAGE[alertConfig.messageKey];

            alertConfig.subject = alertConfig.title;
            alertConfig.message = (msgObj && msgObj.text) || "";
            alertConfig.errorCode = errorCode;

            this.triggerAutoMail(errorCode, alertConfig);
        }

        // ---------- Dialog ----------
        AlertNewDialog.fire(
            'warning',
            alertConfig.title,
            alertConfig.messageKey,
            'OK',
            '',
            true, {
                override: false
            }
        ).then(function() {
            RE_DIRECT_CUR_SESSION({}, {
                readOnlyView: true
            });
        });
    }


    // ===== UTILITY METHODS =====


    /**
     * Check if online
     * @returns {boolean} Online state
     * @private
     */
    isOnline() {
        return window.navigator.onLine;
    }



    /**
     * Check if save is needed
     * @param {Object} options - Save options
     * @returns {boolean} Should save
     * @private
     */
    shouldSave(options) {

        if (options.forceSave || options.offlineSave || options.roleOriginal || options.regenerate) {
            return true;
        }

        return this.editor && this.editor.checkDirty ? this.editor.checkDirty() : true;
    }

    /**
     * Retry save after delay
     * @param {Object} options - Save options
     * @private
     */
    retrySave(options) {

        if (!this.state.retryBoolean) return;

        // Retry attempt tracking
        if (this.retryAttempt) {
            this.retryAttempt++;
        } else {
            this.retryAttempt = 1;
        }

        setTimeout(() => {
            this.save(options);
        }, this.config.retryInterval);
    }

    /**
     * Get timer interval based on online status
     * @returns {number} Interval in ms
     * @private
     */
    getTimerInterval() {
        const type = this.isOnline() ? 'online' : 'offline';
        return this.config.timerInterval[type] || 60000;
    }

    /**
     * Get timestamp
     * @returns {string} Timestamp
     * @private
     */
    getTimestamp() {
        return new Date().getTime().toString();
    }

    /**
     * Create delay promise
     * @param {number} ms - Milliseconds
     * @returns {Promise} Delay promise
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cancel scheduler
     * @private
     */
    cancelScheduler() {
        if (this.state.scheduler) {
            clearInterval(this.state.scheduler);
            clearTimeout(this.state.scheduler);
            this.state.scheduler = null;
        }

        // Cancel request timers
        if (typeof CHECK_REQUEST !== "undefined" && CHECK_REQUEST.cancel) {
            CHECK_REQUEST.cancel();
        }
    }

    /**
     * Show spinner
     * @private
     */
    showSpinner() {
        this.changeBtnState("spinner");
        // if (this.saveButton) {
        //     $(this.saveButton).html(this.saveStrings.spinner);
        // }
    }
    changeBtnState(key) {
        if (this.saveButton && this.saveStrings[key]) {
            $(this.saveButton).html(this.saveStrings[key]);
        }
    }

    /**
     * Hide spinner
     * @private
     */
    hideSpinner() {
        if (this.state.spinScheduler) {
            clearTimeout(this.state.spinScheduler);
        }

        this.state.spinScheduler = setTimeout(() => {
            if (this.saveButton && $(this.saveButton).find('.spinner-border').length) {
                this.changeBtnState("default");
                // $(this.saveButton).html(this.saveStrings.default);
            }
        }, this.config.spinnerCheckInterval);
    }

    /**
     * Update save button
     * @private
     */
    updateSaveButton() {
        if (this.saveButton) {
            $(this.saveButton).attr({
                'data-time': this.state.lastSaveTimestamp,
                'title': moment().calendar()
            });
        }
    }

    /**
     * Update save time in database
     * @private
     */
    updateSaveTime() {
        try {
            const data = GET_JSON('linksharing', {
                process: "save"
            });
            // Fire the request without awaiting
            this.apiService.makeRequest(API_LINK_SHARE, data, {})
                .then(response => {
                    if (response && response.r === 1) {
                        console.log("Save time updated successfully");
                    } else {
                        console.warn("Save time update failed");
                    }
                })
                .catch(error => this.logError('updateSaveTime', error));
        } catch (error) {
            this.logError('updateSaveTime', error);
        }
    }




    /**
     * Save original file by role
     * @param {Object} options - Save options
     * @returns {boolean} Success state
     * @private
     */
    saveOriginalFile(options) {
        try {
            const saveData = this.prepareSaveData(options);

            commonfn.callajax(
                saveData,
                'handleOriginalFileSave',
                API_FORM_TO_FILE_FIELD,
                this
            );

            console.log("Role original file saved");
            return true;
        } catch (error) {
            this.logError('saveOriginalFile', error);
            return false;
        }
    }

    /**
     * Handle original file save response
     * @param {Object} response - API response
     * @private
     */
    handleOriginalFileSave(response) {
        try {
            if (response.r === 0) {
                ErrorLogTrace('setOriginalfilebyRole', "FILVE_NOT_SAVE");
                /* this.showAlert({
                    reason: "FILVE_NOT_SAVE",
                    from: "roleOriginal"
                }); */
                this.iSave({
                    roleOriginal: true
                })
            } else {
                console.log("File stored successfully");
                this.Init();
            }

        } catch (error) {
            this.logError('handleOriginalFileSave', error);
        }
    }

    /**
     * Handle no save needed
     * @param {Object} options - Save options
     * @private
     */
    handleNoSaveNeeded(options) {
        if (!options.noAlert && !options.autoSave) {
            const lastSaveTime = moment(parseInt(this.saveButton && this.saveButton.getAttribute('data-time'))).fromNow();
            this.showToast('LastSave', {
                addText: lastSaveTime
            });
        }

        this.resetDirtyState();
        window._CanClose = true;
        if (options.forceSave || options.forcesave || options.regenerate) {
            if (window.IMPACT_SAVE && window.IMPACT_SAVE.state) {
                window.IMPACT_SAVE.state.lastSaveReturn = true;
            }
        }
    }

    /**
     * Set editor to read-only
     * @private
     */
    setEditorReadOnly() {
        if (this && this.editor && this.editor.setReadOnly == "function") {
            this.editor.setReadOnly()
        } else if (CKEDITOR && CKEDITOR.instances && CKEDITOR.instances.maineditor) {
            CKEDITOR.instances.maineditor.setReadOnly();
        }
    }

    /**
     * Reset dirty state
     * @private
     */
    resetDirtyState() {
        if (GlobalEditor && GlobalEditor.resetDirty) {
            GlobalEditor.resetDirty();
        }

        if (GlobalEditor && GlobalEditor.getCommand) {
            const cmd = GlobalEditor.getCommand('saveimpact');
            if (cmd && cmd.disable) {
                cmd.disable();
            }
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Message key
     * @param {Object} options - Toast options
     * @private
     */
    showToast(message, options = {}) {
        if (typeof TOASTER_ALERT !== 'undefined') {
            TOASTER_ALERT(message, options);
        }
    }

    /**
     * Check current status
     * @param {string} context - Context
     * @private
     */
    checkCurrentStatus(context) {
        if (SHARED_KEY.status == "signoff") {
            return false;
        }
        if (typeof CHECK_CURRENT_STATUS !== 'undefined') {
            CHECK_CURRENT_STATUS(context);
        }
    }

    /**
     * Log error
     * @param {string} method - Method name
     * @param {Error} error - Error object
     * @private
     */
    logError(method, error) {
        console.error(`[SaveModule.${method}]`, error);

        if (typeof ErrorLogTrace !== 'undefined') {
            ErrorLogTrace(method, error.message);
        }
    }

    /**
     * Check if can save offline data
     * @public
     */
    checkOfflineSave() {
        try {
            if (typeof AlertNewDialog !== 'undefined') {
                AlertNewDialog.fire('Save_OfflineData_Ask').then((result) => {
                    if (result.isConfirmed) {
                        this.save({
                            offlineSave: true
                        });
                        this.showToast('Save_OfflineData_Yes');
                    }

                    if (typeof LOCAL_DATA !== 'undefined') {
                        localStorage.removeItem(LOCAL_DATA);
                    }
                });
            }
        } catch (error) {
            this.logError('checkOfflineSave', error);
        }
    }

    /**
     * Compare save history counts
     * @public
     */
    compareSaveHistory() {
        try {
            console.log("Comparing save history...");

            const currentCount = this.getCountInfo();
            let lastRecord = null;

            for (const record of this.saveHistory) {
                if (!record || !Number.isFinite(Number(record.insert)) || !Number.isFinite(Number(record.del))) {
                    continue;
                }
                if (!lastRecord || this.compareRecords(record, lastRecord)) {
                    lastRecord = record;
                }
            }

            if (lastRecord && this.compareRecords(currentCount, lastRecord)) {
                console.log("Current count is highest:", currentCount);
            }

        } catch (error) {
            this.logError('compareSaveHistory', error);
        }
    }

    /**
     * Compare two save records
     * @param {Object} record1 - First record
     * @param {Object} record2 - Second record
     * @returns {boolean} True if record1 is higher
     * @private
     */
    compareRecords(record1, record2) {
        return record1.insert >= record2.insert && record1.del >= record2.del;
    }
    async iSave(params) {
        return await this.save(params);
    }
    cancel() {
        this.cancelScheduler();
    }
}



class CJKValidator {
    constructor() {
        this.validationResults = {
            document: null,
            elements: [],
            summary: null
        };

        this.elementSelectors = ".p, div:not(#xmlcontentroot):not(.p)";
        this.skipCleanElements = ['.TrackChangesList', '.pop_up', '.IsImpact', '.pistart'];
        this.logDetails = true;

        // Use the same Unicode pattern as ContentValidatorBeforeSave        
        // Primary pattern: CJK Unified Ideographs + Extensions + Compatibility
        this.UNICODE_Pattern = /[\u4E00-\u9FFF\u3400-\u4DBF\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29]|[\uD840-\uD868][\uDC00-\uDFFF]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|[\uD86A-\uD86C][\uDC00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D]/g;

        // Extended pattern: CJK Ideographs + Radicals + Strokes + Compatibility
        // EXCLUDED: \u3000-\u303F (CJK Symbols and Punctuation like 。「」【】〈〉《》『』)
        this.EXTENDED_CJK_PATTERN = /[\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2EFF\u2F00-\u2FDF\u31C0-\u31EF\uF900-\uFAFF]|[\uD840-\uD87E][\uDC00-\uDFFF]/g;

        // Optional: Pattern for CJK Punctuation (for debugging only)
        this.CJK_PUNCTUATION_PATTERN = /[\u3000-\u303F]/g;
    }

    /**
     * Debug helper: Get Unicode info for a character
     * @param {string} char - Single character
     * @returns {Object} Unicode info object
     */
    getCharUnicodeInfo(char) {
        if (!char) return null;

        const codePoint = char.codePointAt(0);
        const hex = 'U+' + codePoint.toString(16).toUpperCase().padStart(4, '0');

        // Determine character type based on Unicode range
        let type = 'unknown';
        let rangeName = 'Unknown';

        if (codePoint >= 0x4E00 && codePoint <= 0x9FFF) {
            type = 'cjk_ideograph';
            rangeName = 'CJK Unified Ideographs';
        } else if (codePoint >= 0x3400 && codePoint <= 0x4DBF) {
            type = 'cjk_extension_a';
            rangeName = 'CJK Extension A';
        } else if (codePoint >= 0x3000 && codePoint <= 0x303F) {
            type = 'cjk_punctuation';
            rangeName = 'CJK Symbols and Punctuation';
        } else if (codePoint >= 0x2E80 && codePoint <= 0x2EFF) {
            type = 'cjk_radical';
            rangeName = 'CJK Radicals Supplement';
        } else if (codePoint >= 0x2F00 && codePoint <= 0x2FDF) {
            type = 'kangxi_radical';
            rangeName = 'Kangxi Radicals';
        } else if (codePoint >= 0x31C0 && codePoint <= 0x31EF) {
            type = 'cjk_stroke';
            rangeName = 'CJK Strokes';
        } else if (codePoint >= 0xF900 && codePoint <= 0xFAFF) {
            type = 'cjk_compatibility';
            rangeName = 'CJK Compatibility Ideographs';
        } else if (codePoint >= 0x20000 && codePoint <= 0x2A6DF) {
            type = 'cjk_extension_b';
            rangeName = 'CJK Extension B';
        }

        const isCounted = type !== 'cjk_punctuation' && type !== 'unknown';

        return {
            char,
            codePoint,
            hex,
            type,
            rangeName,
            isCounted,
            message: isCounted ? '✅ Counted as CJK' : '❌ NOT counted (punctuation/symbol)'
        };
    }

    /**
     * Debug helper: Analyze all potential CJK characters in text
     * @param {string} text - Text to analyze
     * @returns {Object} Analysis result with detailed breakdown
     */
    debugCJK(text) {
        if (!text) {
            console.log('❌ No text provided for CJK debug');
            return {
                error: 'No text provided'
            };
        }

        console.log('\n🔍 ===== CJK DEBUG ANALYSIS =====');
        console.log('📝 Input text length:', text.length);

        // Find all potential CJK (including punctuation for debugging)
        const allCJKPattern = /[\u2E80-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]|[\uD840-\uD87E][\uDC00-\uDFFF]/g;
        const allMatches = text.match(allCJKPattern) || [];

        const ideographs = [];
        const punctuation = [];
        const other = [];

        allMatches.forEach(char => {
            const info = this.getCharUnicodeInfo(char);
            if (info.type === 'cjk_punctuation') {
                punctuation.push(info);
            } else if (info.isCounted) {
                ideographs.push(info);
            } else {
                other.push(info);
            }
        });

        console.log('\n📊 SUMMARY:');
        console.log(`   ✅ CJK Ideographs (COUNTED): ${ideographs.length}`);
        console.log(`   ❌ CJK Punctuation (NOT counted): ${punctuation.length}`);
        console.log(`   ⚠️ Other: ${other.length}`);

        if (ideographs.length > 0) {
            console.log('\n🟢 COUNTED CHARACTERS:');
            ideographs.forEach(info => {
                console.log(`   "${info.char}" ${info.hex} - ${info.rangeName}`);
            });
        }

        if (punctuation.length > 0) {
            console.log('\n🔴 EXCLUDED PUNCTUATION:');
            punctuation.forEach(info => {
                console.log(`   "${info.char}" ${info.hex} - ${info.rangeName}`);
            });
        }

        console.log('\n===== END DEBUG =====\n');

        return {
            totalFound: allMatches.length,
            countedIdeographs: ideographs.length,
            excludedPunctuation: punctuation.length,
            other: other.length,
            ideographs,
            punctuation,
            other,
            willCount: ideographs.length
        };
    }

    printCJKContext(text, pattern) {
        if (!text || !pattern) return;

        var match;
        var allMatches = [];

        pattern.lastIndex = 0;

        while ((match = pattern.exec(text)) !== null) {
            var char = match[0];

            // Skip spaces (normal + full-width)
            if (/^[\s\u3000]$/.test(char)) continue;

            var index = match.index;
            var start = Math.max(0, index - 10);
            var end = Math.min(text.length, index + 11);

            var before = text.substring(start, index);
            var after = text.substring(index + 1, end);

            // Get Unicode info for better debugging
            var unicodeInfo = this.getCharUnicodeInfo(char);

            console.log(`🔹 Found: "${char}" ${unicodeInfo.hex} (${unicodeInfo.rangeName})`);
            console.log(`   ↳ Index: ${index} | ${unicodeInfo.message}`);
            console.log(`   ↳ Context: "${before}[${char}]${after}"`);

            allMatches.push({
                char,
                index,
                before,
                after,
                unicode: unicodeInfo
            });
        }

        // console.log("✅ Total CJK characters found (context):", allMatches.length);
        return allMatches;
    }

    /**
     * Counts CJK characters in text using both patterns
     * @param {string} text - Text to analyze
     * @returns {number} Number of CJK characters
     */
    countCJK(text) {
        const unicodeMatches = text.match(this.UNICODE_Pattern) || [];
        const extendedMatches = text.match(this.EXTENDED_CJK_PATTERN) || [];

        // 🔹 Filter out whitespace or invisible characters
        const filteredExtended = extendedMatches.filter(ch => {
            // remove normal spaces, full-width spaces, and control characters
            return !/^[\s\u3000]$/.test(ch);
        });

        try {
            // if (IS_LOCAL_HOST) this.debugCJK(text);

            this.printCJKContext(
                text,
                new RegExp(
                    this.UNICODE_Pattern.source + "|" + this.EXTENDED_CJK_PATTERN.source,
                    "g"
                )
            );
        } catch (error) {

        }

        return unicodeMatches.length || filteredExtended.length;
    }

    /**
     * Clean DOM element by removing tracking elements and unwrapping data-hid elements
     * @param {Element|jQuery} container - Container to clean (modifies in place)
     * @param {boolean} removeSelectors - Whether to remove element selectors
     * @returns {Element|jQuery} Cleaned container
     * @private
     */
    _cleanElement(container, removeSelectors = false) {
        const $container = $(container);

        // Remove tracking elements
        $container.find(this.skipCleanElements.join(',')).remove();

        // Unwrap data-hid elements
        $container.find('[data-hid]').each(function() {
            $(this).replaceWith($(this).contents());
        });

        // Optionally remove element selectors
        if (removeSelectors) {
            // $container.find(this.elementSelectors).remove();
        }

        return container;
    }

    /**
     * Count insert and delete CJK characters in element
     * @param {Element} element - Element to analyze
     * @returns {Object} Counts object with insert and del properties
     * @private
     */
    _countInsertDelCharacters(element) {
        let insert = 0;
        let del = 0;

        // Count insert elements
        element.querySelectorAll("insert").forEach(node => {
            Array.from(node.childNodes).forEach(el => {
                if (el.nodeType === Node.ELEMENT_NODE) {
                    if (el.tagName.toLowerCase() === "del") {
                        del += this.countCJK(el.textContent);
                    } else {
                        insert += this.countCJK(el.textContent);
                    }
                } else if (el.nodeType === Node.TEXT_NODE) {
                    insert += this.countCJK(el.nodeValue);
                }
            });
        });

        // Count delete elements (excluding those inside insert)
        element.querySelectorAll("del").forEach(node => {
            node.querySelectorAll("insert").forEach(nested => nested.remove());
            del += this.countCJK(node.textContent);
        });

        return {
            insert,
            del
        };
    }

    /**
     * Get CJK count for an element with optional insert/del tracking
     * @param {Element} element - Element to analyze
     * @param {boolean} includeInsertDel - Whether to count insert/del separately
     * @returns {Object} Count object with overall, insert, del properties
     * @private
     */
    _getElementCJKCount(element, includeInsertDel = true) {
        const tempDiv = document.createElement("div");
        tempDiv.appendChild(element.cloneNode(true));

        // Clean the element using shared logic
        this._cleanElement(tempDiv);

        const overall = this.countCJK(tempDiv.textContent);

        if (!includeInsertDel) {
            return {
                overall,
                insert: 0,
                del: 0
            };
        }

        const {
            insert,
            del
        } = this._countInsertDelCharacters(tempDiv);
        return {
            overall,
            insert,
            del
        };
    }

    /**
     * Main validation entry point
     */
    validateDocument(originalRootDOM, updatedRootDOM, options = {}) {

        // if (IS_LOCAL_HOST) debugger;

        try {
            console.log('🔍 Step 1: Validating overall document...');

            const documentResult = this.validateOverallDocument(originalRootDOM, updatedRootDOM);

            this.validationResults = documentResult;

            if (this.logDetails) {
                // console.log('Document validation result:', documentResult);
            }

            if (!documentResult.isValid) {
                console.log('❌ Document discrepancy detected! Drilling down to element level...');
                const elementResults = this.validateElements(originalRootDOM, updatedRootDOM);
                this.validationResults.elements = elementResults;
                this.validationResults.summary = this.generateSummary();
            } else {
                /*console.log(' Document validation passed - no element-level check needed');
                 this.validationResults.summary = {
                    totalIssues: 0,
                    problematicElements: [],
                    message: 'All CJK character tracking is correct'
                }; */
            }

            return this.validationResults;

        } catch (error) {
            console.error('Validation error:', error);
            return {
                document: {
                    isValid: false,
                    status: 'ERROR',
                    message: error.message
                },
                elements: [],
                summary: {
                    totalIssues: -1,
                    error: error.message
                }
            };
        }
    }

    /**
     * Validate overall document CJK count
     */
    validateOverallDocument(originalRootDOM, updatedRootDOM) {
        try {
            const originalCount = this.getCountInDOM(originalRootDOM, true);
            const updatedCount = this.getCountInDOM(updatedRootDOM, false);

            return this.checkCJKCharacterCount(originalCount, updatedCount, {
                elementId: 'DOCUMENT_ROOT',
                elementType: 'document'
            });

        } catch (error) {
            return {
                isValid: false,
                status: 'ERROR',
                message: `Document validation failed: ${error.message}`,
                elementId: 'DOCUMENT_ROOT'
            };
        }
    }

    /**
     * Validate individual elements
     */
    validateElements(originalRootDOM, updatedRootDOM) {
        const results = [];

        try {
            const originalElements = this.getTargetElements(originalRootDOM);
            const updatedElements = this.getTargetElements(updatedRootDOM);

            console.log(`🔍 Found ${originalElements.length} original elements, ${updatedElements.length} updated elements`);

            const elementPairs = this.matchElements(originalElements, updatedElements);
            console.log(`🔗 Matched ${elementPairs.length} element pairs for comparison`);

            elementPairs.forEach((pair, index) => {
                const {
                    original,
                    updated,
                    elementId
                } = pair;

                if (original && updated) {
                    const originalCount = this._getElementCJKCount(original, false);
                    const updatedCount = this._getElementCJKCount(updated, true);

                    const result = this.checkCJKCharacterCount(originalCount, updatedCount, {
                        elementId: elementId || `element_${index}`,
                        elementType: original.tagName.toLowerCase(),
                        elementText: this._getElementPreview(updated),
                        elementDOM: updated
                    });

                    if (!result.isValid || result.ignoreReason) {
                        results.push(result);
                        this._logElementResult(result);
                    }
                } else {
                    results.push(this._createMissingElementResult(original, updated, elementId, index));
                }
            });

            return results;

        } catch (error) {
            console.error('Element validation error:', error);
            return [{
                isValid: false,
                status: 'ERROR',
                message: `Element validation failed: ${error.message}`,
                elementId: 'VALIDATION_ERROR'
            }];
        }
    }

    /**
     * Log element validation result
     * @param {Object} result - Validation result
     * @private
     */
    _logElementResult(result) {
        if (!this.logDetails) return;

        const prefix = result.isValid ? '✅ Ignored' : '❌ Issue found';
        console.log(`${prefix} in ${result.elementType}#${result.elementId}:`, {
            status: result.status,
            message: result.message,
            preview: result.elementText,
            nestedTagInfo: result.nestedTagInfo
        });
    }

    /**
     * Create result for missing elements
     * @param {Element} original - Original element
     * @param {Element} updated - Updated element  
     * @param {string} elementId - Element ID
     * @param {number} index - Element index
     * @returns {Object} Missing element result
     * @private
     */
    _createMissingElementResult(original, updated, elementId, index) {
        return {
            isValid: false,
            status: 'MISSING_ELEMENT',
            message: original ? 'Element deleted' : 'Element added',
            elementId: elementId || `missing_${index}`,
            elementType: (original || updated).tagName.toLowerCase()
        };
    }

    /**
     * Get target elements for validation with shared cleaning logic
     */
    getTargetElements(rootDOM) {
        const tempDOM = document.createElement("div");
        const textRoot = rootDOM.querySelector(this.elementSelectors) || rootDOM;

        $(tempDOM).append(textRoot.outerHTML);

        // Use shared cleaning logic
        this._cleanElement(tempDOM);

        return Array.from(tempDOM.querySelectorAll(this.elementSelectors));
    }

    /**
     * Match elements between original and updated documents
     */
    matchElements(originalElements, updatedElements) {
        const pairs = [];
        const updatedById = new Map();

        // Build map of updated elements by ID
        updatedElements.forEach(el => {
            const id = this._getElementId(el);
            if (id) updatedById.set(id, el);
        });

        // Match original elements
        originalElements.forEach((original, index) => {
            const id = this._getElementId(original);
            let updated = null;
            let elementId = id || `pos_${index}`;

            if (id && updatedById.has(id)) {
                updated = updatedById.get(id);
                updatedById.delete(id);
            } else {
                updated = updatedElements[index] || null;
                elementId = `pos_${index}`;
            }

            pairs.push({
                original,
                updated,
                elementId
            });
        });

        // Handle remaining updated elements
        updatedById.forEach((updated, id) => {
            pairs.push({
                original: null,
                updated,
                elementId: id
            });
        });

        return pairs;
    }

    /**
     * Get element ID from various attributes
     * @param {Element} element - Element to get ID from
     * @returns {string|null} Element ID or null
     * @private
     */
    _getElementId(element) {
        return element.id ||
            element.getAttribute('data-id') ||
            element.getAttribute('data-para-id') ||
            element.getAttribute('del_id') ||
            element.getAttribute('oid');
    }

    /**
     * Get element preview text for logging
     * @param {Element} element - Element to preview
     * @param {number} maxLength - Maximum preview length
     * @returns {string} Preview text
     * @private
     */
    _getElementPreview(element, maxLength = 50) {
        const text = element.textContent.trim();
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    /**
     * Get CJK count in DOM with shared logic
     */
    getCountInDOM(rootdom, isOriginal) {
        let countInfo = {
            overall: 0,
            insert: 0,
            del: 0
        };

        try {
            const tempDOM = document.createElement("div");
            const textRoot = isOriginal ? rootdom.querySelector(DOC_ROOT_SELECTOR) : rootdom;
            if (!textRoot) return countInfo;

            $(tempDOM).append(textRoot.outerHTML);

            // Use shared cleaning logic with selector removal
            this._cleanElement(tempDOM);

            countInfo.overall = this.countCJK(tempDOM.textContent);

            if (!isOriginal) {
                const {
                    insert,
                    del
                } = this._countInsertDelCharacters(tempDOM);
                countInfo.insert = insert;
                countInfo.del = del;
            }

            return countInfo;
        } catch (err) {
            console.warn('getCountInDOM error:', err.message);
            return countInfo;
        }
    }

    /**
     * Core validation logic with enhanced ignore conditions
     */
    checkCJKCharacterCount(originalCount, updatedCount, context = {}) {
        const {
            elementId = 'unknown', elementType = 'element', elementText = ''
        } = context;

        try {
            const expectedCount = updatedCount.overall - updatedCount.insert;
            const isBasicValid = originalCount.overall === expectedCount;
            const untracked = expectedCount - originalCount.overall;

            const shouldIgnoreDueToDeletions = !isBasicValid &&
                updatedCount.overall <= updatedCount.del &&
                untracked > 0;

            const hasNestedTags = this._detectNestedTagPatterns(context.elementDOM);
            const shouldIgnoreNestedTags = hasNestedTags.hasIssues && !isBasicValid;

            const {
                isValid,
                status,
                message,
                ignoreReason
            } = this._determineValidationResult(
                isBasicValid,
                shouldIgnoreDueToDeletions,
                shouldIgnoreNestedTags,
                untracked,
                hasNestedTags
            );

            const result = {
                isValid,
                status,
                message,
                elementId,
                elementType,
                elementText,
                original: originalCount,
                updated: updatedCount,
                untracked: Math.abs(untracked),
                expectedCount,
                shouldIgnoreDueToDeletions,
                shouldIgnoreNestedTags,
                nestedTagInfo: hasNestedTags,
                ignoreReason,
                formula: `${originalCount.overall} == (${updatedCount.overall} - ${updatedCount.insert}) → ${originalCount.overall} == ${expectedCount}`,
                deletionCheck: `overall(${updatedCount.overall}) <= del(${updatedCount.del}) = ${updatedCount.overall <= updatedCount.del}`,
                nestedTagCheck: hasNestedTags.hasIssues ? `Found patterns: ${hasNestedTags.patterns.join(', ')}` : 'No nested tag issues'
            };

            this._logValidationDetail(result, isBasicValid, untracked, shouldIgnoreDueToDeletions, shouldIgnoreNestedTags);
            return result;

        } catch (error) {
            return {
                isValid: false,
                status: 'ERROR',
                message: error.message,
                elementId,
                elementType
            };
        }
    }

    /**
     * Determine validation result based on conditions
     * @param {boolean} isBasicValid - Basic validation result
     * @param {boolean} shouldIgnoreDueToDeletions - Should ignore due to deletions
     * @param {boolean} shouldIgnoreNestedTags - Should ignore due to nested tags
     * @param {number} untracked - Untracked character count
     * @param {Object} hasNestedTags - Nested tag information
     * @returns {Object} Validation result components
     * @private
     */
    _determineValidationResult(isBasicValid, shouldIgnoreDueToDeletions, shouldIgnoreNestedTags, untracked, hasNestedTags) {
        if (isBasicValid) {
            return {
                isValid: true,
                status: 'VALID',
                message: 'CJK tracking correct',
                ignoreReason: null
            };
        }

        if (shouldIgnoreDueToDeletions) {
            return {
                isValid: true,
                status: 'IGNORED_DELETION_SCENARIO',
                message: `Ignored: ${Math.abs(untracked)} character discrepancy due to deletion scenario (overall ≤ del)`,
                ignoreReason: 'deletion_scenario'
            };
        }

        if (shouldIgnoreNestedTags) {
            return {
                isValid: true,
                status: 'IGNORED_NESTED_TAGS',
                message: `Ignored: ${Math.abs(untracked)} character discrepancy due to nested tag patterns (${hasNestedTags.patterns.join(', ')})`,
                ignoreReason: 'nested_tags'
            };
        }

        return {
            isValid: false,
            status: untracked > 0 ? 'UNTRACKED_ADDITIONS' : 'UNTRACKED_DELETIONS',
            message: `${Math.abs(untracked)} untracked CJK ${untracked > 0 ? 'additions' : 'deletions'}`,
            ignoreReason: null
        };
    }

    /**
     * Log detailed validation information
     * @param {Object} result - Validation result
     * @param {boolean} isBasicValid - Basic validation result
     * @param {number} untracked - Untracked count
     * @param {boolean} shouldIgnoreDueToDeletions - Deletion ignore flag
     * @param {boolean} shouldIgnoreNestedTags - Nested tag ignore flag
     * @private
     */
    _logValidationDetail(result, isBasicValid, untracked, shouldIgnoreDueToDeletions, shouldIgnoreNestedTags) {
        if (isBasicValid) return;

        console.log(`CJK Validation Detail for ${result.elementType}#${result.elementId}:`);
        console.log(`  Original: ${result.original.overall}, Expected: ${result.expectedCount}, Untracked: ${untracked}`);
        console.log(`  Updated: overall=${result.updated.overall}, insert=${result.updated.insert}, del=${result.updated.del}`);
        console.log(`  Deletion check: ${result.deletionCheck}`);
        console.log(`  Nested tag check: ${result.nestedTagCheck}`);
        console.log(`  Should ignore deletion: ${shouldIgnoreDueToDeletions}`);
        console.log(`  Should ignore nested: ${shouldIgnoreNestedTags}`);
        console.log(`  Final result: ${result.isValid ? 'VALID' : 'INVALID'} (${result.status})`);
        if (result.ignoreReason) {
            console.log(`  Ignore reason: ${result.ignoreReason}`);
        }
    }

    /**
     * Detect nested tag patterns that can cause validation issues
     */
    _detectNestedTagPatterns(elementDOM) {
        const patterns = [];
        const issues = [];

        if (!elementDOM) {
            return {
                hasIssues: false,
                patterns: [],
                issues: []
            };
        }

        try {
            const tagPatterns = [{
                    selector: 'insert del, insert > del',
                    pattern: 'insert>del',
                    description: 'insert tags containing delete tags'
                },
                {
                    selector: 'insert insert, insert > insert',
                    pattern: 'insert>insert',
                    description: 'nested insert tags'
                },
                {
                    selector: 'del insert, del > insert',
                    pattern: 'del>insert',
                    description: 'delete tags containing insert tags'
                },
                {
                    selector: 'del del, del > del',
                    pattern: 'del>del',
                    description: 'nested delete tags'
                },
                {
                    selector: 'insert del insert, del insert del, insert insert insert, del del del',
                    pattern: 'complex_nesting',
                    description: 'complex nested tag structures'
                }
            ];

            tagPatterns.forEach(({
                selector,
                pattern,
                description
            }) => {
                const elements = elementDOM.querySelectorAll(selector);
                if (elements.length > 0) {
                    patterns.push(pattern);
                    issues.push(`Found ${elements.length} ${description}`);
                }
            });

            // Check for adjacent conflicting tags
            const adjacentConflicts = this._countAdjacentConflicts(elementDOM);
            if (adjacentConflicts > 0) {
                patterns.push('adjacent_conflicts');
                issues.push(`Found ${adjacentConflicts} adjacent conflicting tag pairs`);
            }

            return {
                hasIssues: patterns.length > 0,
                patterns,
                issues,
                patternCount: patterns.length,
                detectedStructures: this._getDetectedStructures(elementDOM, adjacentConflicts)
            };

        } catch (error) {
            console.warn('Error detecting nested tag patterns:', error.message);
            return {
                hasIssues: false,
                patterns: [],
                issues: [`Error during pattern detection: ${error.message}`],
                error: true
            };
        }
    }

    /**
     * Count adjacent conflicting tags
     * @param {Element} elementDOM - Element to check
     * @returns {number} Number of adjacent conflicts
     * @private
     */
    _countAdjacentConflicts(elementDOM) {
        const allTags = elementDOM.querySelectorAll('insert, del');
        let adjacentConflicts = 0;

        for (let i = 0; i < allTags.length - 1; i++) {
            const current = allTags[i];
            const next = allTags[i + 1];
            if (current.nextSibling === next) {
                if ((current.tagName === 'INSERT' && next.tagName === 'DEL') ||
                    (current.tagName === 'DEL' && next.tagName === 'INSERT')) {
                    adjacentConflicts++;
                }
            }
        }
        return adjacentConflicts;
    }

    /**
     * Get detected structure counts
     * @param {Element} elementDOM - Element to analyze
     * @param {number} adjacentConflicts - Adjacent conflict count
     * @returns {Object} Structure counts
     * @private
     */
    _getDetectedStructures(elementDOM, adjacentConflicts) {
        return {
            insertContainsDel: elementDOM.querySelectorAll('insert del, insert > del').length,
            insertContainsInsert: elementDOM.querySelectorAll('insert insert, insert > insert').length,
            delContainsInsert: elementDOM.querySelectorAll('del insert, del > insert').length,
            delContainsDel: elementDOM.querySelectorAll('del del, del > del').length,
            complexNesting: elementDOM.querySelectorAll('insert del insert, del insert del, insert insert insert, del del del').length,
            adjacentConflicts
        };
    }

    /**
     * Generate summary of validation results
     */
    generateSummary() {
        const problematicElements = this.validationResults.elements.filter(el => !el.isValid);

        const categorizedElements = this._categorizeElements();
        const detailedBreakdowns = this._createDetailedBreakdowns(categorizedElements);

        return {
            totalIssues: problematicElements.length,
            elementsWithExtraCharacters: categorizedElements.extraCharacterElements.length,
            elementsWithMissingCharacters: categorizedElements.missingCharacterElements.length,
            elementsWithOtherIssues: categorizedElements.otherIssues.length,
            ignoredDeletionElements: categorizedElements.ignoredDeletionElements.length,
            ignoredNestedTagElements: categorizedElements.ignoredNestedTagElements.length,
            totalIgnoredElements: categorizedElements.ignoredDeletionElements.length + categorizedElements.ignoredNestedTagElements.length,
            ...detailedBreakdowns,
            documentStatus: this.validationResults.document && this.validationResults.document.status || 'UNKNOWN',
            message: this._generateDetailedMessage(categorizedElements)
        };
    }

    /**
     * Categorize elements by issue type
     * @returns {Object} Categorized elements
     * @private
     */
    _categorizeElements() {
        const problematicElements = this.validationResults.elements.filter(el => !el.isValid);

        return {
            extraCharacterElements: problematicElements.filter(el => el.status === 'UNTRACKED_ADDITIONS'),
            missingCharacterElements: problematicElements.filter(el => el.status === 'UNTRACKED_DELETIONS'),
            ignoredDeletionElements: this.validationResults.elements.filter(el => el.status === 'IGNORED_DELETION_SCENARIO'),
            ignoredNestedTagElements: this.validationResults.elements.filter(el => el.status === 'IGNORED_NESTED_TAGS'),
            otherIssues: problematicElements.filter(el => !['UNTRACKED_ADDITIONS', 'UNTRACKED_DELETIONS'].includes(el.status)),
            problematicElements
        };
    }

    /**
     * Create detailed breakdowns for each category
     * @param {Object} categorizedElements - Categorized elements object
     * @returns {Object} Detailed breakdowns
     * @private
     */
    _createDetailedBreakdowns(categorizedElements) {
        return {
            extraCharacterDetails: categorizedElements.extraCharacterElements.map(el => ({
                elementId: el.elementId,
                elementType: el.elementType,
                extraCharacterCount: el.untracked || 0,
                preview: el.elementText || '',
                formula: el.formula || '',
                deletionCheck: el.deletionCheck || '',
                nestedTagCheck: el.nestedTagCheck || '',
                characterDetails: this._analyzeExtraCharacters(el),
                location: this._getElementLocation(el)
            })),
            missingCharacterDetails: categorizedElements.missingCharacterElements.map(el => ({
                elementId: el.elementId,
                elementType: el.elementType,
                missingCharacterCount: el.untracked || 0,
                preview: el.elementText || '',
                formula: el.formula || '',
                deletionCheck: el.deletionCheck || '',
                nestedTagCheck: el.nestedTagCheck || '',
                location: this._getElementLocation(el)
            })),
            ignoredDeletionDetails: categorizedElements.ignoredDeletionElements.map(el => ({
                elementId: el.elementId,
                elementType: el.elementType,
                discrepancyCount: el.untracked || 0,
                preview: el.elementText || '',
                formula: el.formula || '',
                deletionCheck: el.deletionCheck || '',
                reason: 'Ignored due to deletion scenario (overall ≤ del)',
                location: this._getElementLocation(el)
            })),
            ignoredNestedTagDetails: categorizedElements.ignoredNestedTagElements.map(el => ({
                elementId: el.elementId,
                elementType: el.elementType,
                discrepancyCount: el.untracked || 0,
                preview: el.elementText || '',
                formula: el.formula || '',
                nestedTagCheck: el.nestedTagCheck || '',
                nestedTagInfo: el.nestedTagInfo || {},
                patterns: el.nestedTagInfo && el.nestedTagInfo.patterns || [],
                patternCount: el.nestedTagInfo && el.nestedTagInfo.patternCount || 0,
                reason: `Ignored due to nested tag patterns: ${(el.nestedTagInfo && el.nestedTagInfo.patterns || []).join(', ')}`,
                location: this._getElementLocation(el)
            })),
            problematicElements: categorizedElements.problematicElements.map(el => ({
                elementId: el.elementId,
                elementType: el.elementType,
                issue: el.status,
                untrackedCount: el.untracked || 0,
                preview: el.elementText || '',
                formula: el.formula || '',
                deletionCheck: el.deletionCheck || '',
                nestedTagCheck: el.nestedTagCheck || '',
                isExtraCharacter: el.status === 'UNTRACKED_ADDITIONS',
                isMissingCharacter: el.status === 'UNTRACKED_DELETIONS'
            }))
        };
    }

    /**
     * Analyze extra characters in an element
     */
    _analyzeExtraCharacters(element) {
        try {
            if (!element.updated || !element.original) {
                return {
                    analysis: 'Unable to analyze - missing element data'
                };
            }

            const originalCount = element.original.overall || 0;
            const updatedCount = element.updated.overall || 0;
            const insertCount = element.updated.insert || 0;
            const effectiveCount = updatedCount - insertCount;

            return {
                originalCharacters: originalCount,
                currentCharacters: updatedCount,
                insertCharacters: insertCount,
                effectiveCharacters: effectiveCount,
                extraCharacters: effectiveCount - originalCount,
                analysis: `Element originally had ${originalCount} CJK characters, now has ${effectiveCount} effective characters (${updatedCount} total - ${insertCount} tracked additions), resulting in ${effectiveCount - originalCount} untracked additions.`
            };
        } catch (error) {
            return {
                analysis: `Error analyzing characters: ${error.message}`,
                error: true
            };
        }
    }

    /**
     * Get element location information
     */
    _getElementLocation(element) {
        const location = {
            elementId: element.elementId,
            elementType: element.elementType,
            hasId: element.elementId && !element.elementId.startsWith('pos_'),
            isPositionBased: element.elementId && element.elementId.startsWith('pos_'),
            approximatePosition: null
        };

        if (location.isPositionBased) {
            const posMatch = element.elementId.match(/pos_(\d+)/);
            if (posMatch) {
                location.approximatePosition = parseInt(posMatch[1], 10) + 1;
            }
        }

        return location;
    }

    /**
     * Generate detailed message based on different types of issues
     */
    _generateDetailedMessage(categorizedElements) {
        const {
            extraCharacterElements,
            missingCharacterElements,
            otherIssues,
            ignoredDeletionElements,
            ignoredNestedTagElements
        } = categorizedElements;
        const totalIgnored = ignoredDeletionElements.length + ignoredNestedTagElements.length;

        if (extraCharacterElements.length === 0 && missingCharacterElements.length === 0 && otherIssues.length === 0) {
            const ignoredMessage = totalIgnored > 0 ?
                ` (${ignoredDeletionElements.length} deletion scenarios + ${ignoredNestedTagElements.length} nested tag patterns ignored)` : '';
            return `All elements have correct CJK tracking${ignoredMessage}`;
        }

        const messages = [];

        if (extraCharacterElements.length > 0) {
            messages.push(`${extraCharacterElements.length} element${extraCharacterElements.length > 1 ? 's' : ''} with untracked additional CJK characters`);
        }

        if (missingCharacterElements.length > 0) {
            messages.push(`${missingCharacterElements.length} element${missingCharacterElements.length > 1 ? 's' : ''} with untracked character deletions`);
        }

        if (otherIssues.length > 0) {
            messages.push(`${otherIssues.length} element${otherIssues.length > 1 ? 's' : ''} with other validation issues`);
        }

        let result = `Found ${messages.join(', ')}`;

        if (totalIgnored > 0) {
            const ignoredParts = [];
            if (ignoredDeletionElements.length > 0) {
                ignoredParts.push(`${ignoredDeletionElements.length} deletion scenario${ignoredDeletionElements.length > 1 ? 's' : ''}`);
            }
            if (ignoredNestedTagElements.length > 0) {
                ignoredParts.push(`${ignoredNestedTagElements.length} nested tag pattern${ignoredNestedTagElements.length > 1 ? 's' : ''}`);
            }
            result += ` (${ignoredParts.join(' + ')} ignored)`;
        }

        return result;
    }

    /**
     * Pretty print results with consolidated logging
     */
    printResults() {
        console.log('\n📊 CJK Validation Results Summary:');
        console.log('=====================================');

        var results = this.validationResults || {};
        var documentInfo = results.document || {};
        var summary = results.summary || {};

        console.log('Document Status: ' + (documentInfo.status || 'UNKNOWN'));
        console.log('Total Issues Found: ' + (summary.totalIssues || 0));
        console.log('Total Ignored: ' + (summary.totalIgnoredElements || 0));

        this._printSection(
            '🟢 IGNORED DELETION SCENARIOS:',
            summary.ignoredDeletionDetails || [],
            this._printIgnoredDeletionElement
        );

        this._printSection(
            '🟣 IGNORED NESTED TAG PATTERNS:',
            summary.ignoredNestedTagDetails || [],
            this._printIgnoredNestedElement
        );

        this._printSection(
            '🔴 ELEMENTS WITH EXTRA (UNTRACKED) CHARACTERS:',
            summary.extraCharacterDetails || [],
            this._printExtraCharacterElement
        );

        this._printSection(
            '🟡 ELEMENTS WITH MISSING (UNTRACKED DELETIONS) CHARACTERS:',
            summary.missingCharacterDetails || [],
            this._printMissingCharacterElement
        );

        this._printOtherIssues(summary);

        console.log('\n📋 SUMMARY: ' + (summary.message || 'Validation completed'));

        this._printActionGuide(summary);
    }

    /**
     * Print a section with elements using a formatter function
     * @param {string} title - Section title
     * @param {Array} elements - Elements to print
     * @param {Function} formatter - Function to format each element
     * @private
     */
    _printSection(title, elements, formatter) {
        if (!elements || !elements.length) return;

        console.log(`\n${title}`);
        console.log('='.repeat(title.length - 2));
        elements.forEach((el, index) => {
            formatter.call(this, el, index);
        });
    }

    /**
     * Print ignored deletion element details
     * @param {Object} el - Element details
     * @param {number} index - Element index
     * @private
     */
    _printIgnoredDeletionElement(el, index) {
        console.log(`${index + 1}. ${el.elementType.toUpperCase()}#${el.elementId}`);
        console.log(`   ✅ IGNORED: ${el.discrepancyCount} character discrepancy`);
        console.log(`   📍 Location: ${this._formatLocation(el.location)}`);
        console.log(`   📝 Preview: "${el.preview}"`);
        console.log(`   🧮 Formula: ${el.formula}`);
        console.log(`   🔍 Deletion Check: ${el.deletionCheck}`);
        console.log(`   💡 Reason: ${el.reason}`);
        console.log('');
    }

    /**
     * Print ignored nested tag element details
     * @param {Object} el - Element details
     * @param {number} index - Element index
     * @private
     */
    _printIgnoredNestedElement(el, index) {
        console.log(`${index + 1}. ${el.elementType.toUpperCase()}#${el.elementId}`);
        console.log(`   ✅ IGNORED: ${el.discrepancyCount} character discrepancy`);
        console.log(`   📍 Location: ${this._formatLocation(el.location)}`);
        console.log(`   📝 Preview: "${el.preview}"`);
        console.log(`   🧮 Formula: ${el.formula}`);
        console.log(`   🔗 Nested Patterns: ${el.patterns.join(', ')}`);
        console.log(`   🔍 Pattern Count: ${el.patternCount}`);
        console.log(`   💡 Reason: ${el.reason}`);

        if (el.nestedTagInfo && el.nestedTagInfo.issues && el.nestedTagInfo.issues.length > 0) {
            console.log(`   📋 Pattern Details:`);
            el.nestedTagInfo.issues.forEach(issue => {
                console.log(`      - ${issue}`);
            });
        }
        console.log('');
    }

    /**
     * Print extra character element details
     * @param {Object} el - Element details
     * @param {number} index - Element index
     * @private
     */
    _printExtraCharacterElement(el, index) {
        console.log(`${index + 1}. ${el.elementType.toUpperCase()}#${el.elementId}`);
        console.log(`   ⚠️  EXTRA CHARACTERS: ${el.extraCharacterCount} untracked CJK characters`);
        console.log(`   📍 Location: ${this._formatLocation(el.location)}`);
        console.log(`   📝 Preview: "${el.preview}"`);
        console.log(`   🧮 Formula: ${el.formula}`);
        console.log(`   🔍 Deletion Check: ${el.deletionCheck}`);
        console.log(`   🔗 Nested Tag Check: ${el.nestedTagCheck}`);

        if (el.characterDetails && !el.characterDetails.error) {
            console.log(`   📊 Details: ${el.characterDetails.analysis}`);
        }

        console.log('   🔍 RECOMMENDATION: Check this element for untracked additions');
        console.log('');
    }

    /**
     * Print missing character element details
     * @param {Object} el - Element details
     * @param {number} index - Element index
     * @private
     */
    _printMissingCharacterElement(el, index) {
        console.log(`${index + 1}. ${el.elementType.toUpperCase()}#${el.elementId}`);
        console.log(`   ⚠️  MISSING CHARACTERS: ${el.missingCharacterCount} untracked deletions`);
        console.log(`   📍 Location: ${this._formatLocation(el.location)}`);
        console.log(`   📝 Preview: "${el.preview}"`);
        console.log(`   🧮 Formula: ${el.formula}`);
        console.log(`   🔍 Deletion Check: ${el.deletionCheck}`);
        console.log(`   🔗 Nested Tag Check: ${el.nestedTagCheck}`);
        console.log('   🔍 RECOMMENDATION: Check this element for untracked deletions');
        console.log('');
    }

    /**
     * Print other validation issues
     * @param {Object} summary - Validation summary
     * @private
     */
    _printOtherIssues(summary) {
        const otherIssues = summary && summary.problematicElements && summary.problematicElements.filter(el =>
            !el.isExtraCharacter && !el.isMissingCharacter
        ) || [];

        if (otherIssues.length === 0) return;

        console.log('\n🔵 OTHER VALIDATION ISSUES:');
        console.log('============================');
        otherIssues.forEach((el, index) => {
            console.log(`${index + 1}. ${el.elementType.toUpperCase()}#${el.elementId}`);
            console.log(`   Issue: ${el.issue}`);
            console.log(`   Preview: "${el.preview}"`);
            console.log(`   🧮 Formula: ${el.formula}`);
            console.log(`   🔍 Deletion Check: ${el.deletionCheck}`);
            console.log(`   🔗 Nested Tag Check: ${el.nestedTagCheck}`);
            console.log('');
        });
    }

    /**
     * Print action guide
     * @param {Object} summary - Validation summary
     * @private
     */
    _printActionGuide(summary) {
        if (summary && summary.extraCharacterDetails && summary.extraCharacterDetails.length > 0 || summary && summary.totalIgnoredElements > 0) {
            console.log('\n🎯 ENHANCED VALIDATION LOGIC:');
            console.log('==============================');
            console.log('✅ IGNORE RULES:');
            console.log('   1. DELETION SCENARIOS: Elements ignored when:');
            console.log('      - Original count ≠ Expected count AND');
            console.log('      - Updated overall count ≤ Updated deletion count');
            console.log('');
            console.log('   2. NESTED TAG PATTERNS: Elements ignored when they contain:');
            console.log('      - insert>del: Insert tags containing delete tags');
            console.log('      - insert>insert: Nested insert tags');
            console.log('      - del>insert: Delete tags containing insert tags');
            console.log('      - del>del: Nested delete tags');
            console.log('      - complex_nesting: 3+ levels of nesting');
            console.log('      - adjacent_conflicts: Adjacent conflicting tag pairs');
            console.log('');

            if (summary && summary.extraCharacterDetails && summary.extraCharacterDetails.length > 0) {
                console.log('🔴 ACTION REQUIRED: Elements with extra characters need attention:');
                console.log('1. Focus on elements with EXTRA CHARACTERS first');
                console.log('2. Use element IDs or positions to locate them in your editor');
                console.log('3. Look for recently added CJK text that may not be properly tracked');
                console.log('4. Consider using track changes for all CJK character modifications');
                console.log('5. Avoid creating nested track change structures');
            }

            if (summary && summary.totalIgnoredElements > 0) {
                console.log(`\n🟢 INFO: ${summary.totalIgnoredElements} elements ignored:`);
                if (summary && summary.ignoredDeletionElements > 0) {
                    console.log(`   - ${summary.ignoredDeletionElements} deletion scenarios (safe discrepancies)`);
                }
                if (summary && summary.ignoredNestedTagElements > 0) {
                    console.log(`   - ${summary.ignoredNestedTagElements} nested tag patterns (complex structures)`);
                }
                console.log('   These elements have discrepancies but are considered safe due to their context');
            }
        }
    }

    /**
     * Format location information for display
     */
    _formatLocation(location) {
        if (location.hasId) {
            return `Element ID: ${location.elementId}`;
        } else if (location.isPositionBased && location.approximatePosition) {
            return `Approximate position: ${location.approximatePosition} (${location.elementType})`;
        } else {
            return `${location.elementType} (position-based matching)`;
        }
    }

    /**
     * Get elements with extra characters (public method for external use)
     */
    getElementsWithExtraCharacters() {
        if (!this.validationResults.summary) {
            console.warn('No validation results available. Run validateDocument() first.');
            return [];
        }

        return this.validationResults.summary.extraCharacterDetails || [];
    }

    /**
     * Get detailed analysis for a specific element with extra characters
     */
    getExtraCharacterAnalysis(elementId) {
        const extraElements = this.getElementsWithExtraCharacters();
        return extraElements.find(el => el.elementId === elementId) || null;
    }
}

/**
 * Enhanced ContentValidatorBeforeSave Class Module
 * Integrates hierarchical CJK validation while preserving existing alert system
 * 
 * @class ContentValidatorBeforeSave
 * @version 2.0.0
 * @author Development Team
 */

class ContentValidatorBeforeSave {
    constructor() {
        // Public properties
        this._apiService = new FetchService();
        this.docId = DOC_ID;
        this.base_url = `${BUCKET_URL}${this.docId}/`;
        this.editorReady = false;
        this._bindMethods();
        this.setUpEditorInstance();
    }

    /**
     * Binds methods to preserve context
     * @private
     */
    _bindMethods() {
        this.validateDocumentContent = this.validateDocumentContent.bind(this);
        // this.getCountInDOM = this.getCountInDOM.bind(this);
        // this.performDetailedCJKValidation = this.performDetailedCJKValidation.bind(this);
    }

    setUpEditorInstance() {

        const checkInterval = setInterval(() => {

            this.editor = window.GlobalEditor || (window.CKEDITOR && window.CKEDITOR.instances && window.CKEDITOR.instances.maineditor);

            if (this.editor && this.editor.document) {
                // Stop checking once editor is ready
                clearInterval(checkInterval);

                // Set up document references
                this.globalDocument = this.editor.document;
                this.globalDocBody = this.globalDocument.getBody().$;
                this.editorReady = true;
                console.log("Editor instance found and set up.");
            }
            // check every 200ms
        }, 500);
    }

    /**
     * Checks if GlobalEditor is ready for use
     * @returns {boolean}
     * @private
     */
    _isGlobalEditorReady(callback, interval = 300) {
        const ready = () => this.editorReady && this.globalDocBody && this.globalDocument;

        if (ready()) {
            return true;
        }

        this.setUpEditorInstance();

        const check = () => {
            if (ready()) {
                // editor is ready
                callback && callback();
                return true;
            }
            // retry
            setTimeout(check, interval);
        };

        setTimeout(check, interval);
        return false;
    }



    /**
     * Gets original document for comparison
     * @returns {Promise<Element>} Original document DOM
     * @private
     */
    async _getOriginalDocument() {
        try {
            if (this.originalDom) {
                return this.originalDom;
            }

            const parser = new DOMParser();
            const originalUrl = `${this.base_url}${this.docId}.html`;
            const originalRes = await fetch(originalUrl);
            this.originalDoc = await originalRes.text();
            this.originalDom = parser.parseFromString(this.originalDoc, 'text/html');

            return this.originalDom;
        } catch (error) {
            console.error('Error fetching original document:', error.message);
            return null;
        }
    }

    async validateDocumentContent(options = {}) {
        // if (IS_LOCAL_HOST) debugger;

        try {

            if (!await this._isGlobalEditorReady()) {
                debug.log('GlobalEditor not ready, retrying in 2.5s...');
                await this._delay(2500);
                return this.validateDocumentContent(options);
            } else debug.log('GlobalEditor ready ... ');

            const detailedResults = await this.performCJKValidation();

            return detailedResults;

        } catch (error) {

        }

    }

    /**
     * Enhanced CJK validation with hierarchical checking
     * @returns {Promise<Object>} Detailed validation results
     * @public
     */
    async performCJKValidation() {

        // if (IS_LOCAL_HOST) debugger;

        try {
            debug.log('Starting detailed hierarchical CJK validation...');

            // Get original document
            const originalDOM = await this._getOriginalDocument();
            if (!originalDOM) {
                throw new Error('Cannot fetch original document for comparison');
            }

            this._originalDOM = originalDOM;

            if (!this._cjkValidator) this._cjkValidator = new CJKValidator();


            // Perform hierarchical validation
            var docBody =
                (this && this.globalDocBody) ||
                (window.CKEDITOR &&
                    window.CKEDITOR.instances &&
                    window.CKEDITOR.instances.maineditor &&
                    window.CKEDITOR.instances.maineditor.document &&
                    window.CKEDITOR.instances.maineditor.document.$) ||
                null;

            var validationResults = this._cjkValidator.validateDocument(originalDOM, docBody);


            // Print detailed results for debugging
            // this._cjkValidator.printResults();

            debug.log('validationResults ready ... ');

            return validationResults;

        } catch (error) {
            console.error('Detailed CJK validation error:', error.message);
            ErrorLogTrace('DETAILED_CJK_VALIDATION', error.message);
            return {
                document: {
                    isValid: false,
                    status: 'ERROR',
                    message: error.message
                },
                elements: [],
                summary: {
                    totalIssues: -1,
                    error: error.message
                }
            };
        }


    }

}

window.IMPACT_SAVE = new SaveModule();
