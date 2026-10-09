/*jslint white:true, for:true */
/*global commonfn, LinkSessionModule, LinkSessionCore, buildLandingSessionContext,
    RE_DIRECT_CUR_SESSION, setItemsandReDirect, DOC_ID, NEW_SESSION_ID, redirect_url,
    moment, API_LINK_SHARE, VALIDATE_LAST_SAVE */

function resolveLandingSessionContext() {
    const service = window.LinkSessionModule && LinkSessionModule.getInstance();
    let ctx = typeof buildLandingSessionContext === 'function' ?
        buildLandingSessionContext() :
        {};
    if (service && typeof service.mergeLandingCtxState === 'function') {
        ctx = service.mergeLandingCtxState(ctx);
    }
    return ctx;
}

function linkSessionLogError(functionName, err) {
    if (typeof LinkSessionCore !== 'undefined' && typeof LinkSessionCore.logErrorStatic === 'function') {
        LinkSessionCore.logErrorStatic(functionName, err);
        return;
    }
    const message = err && err.message != null ? err.message : String(err || '');
    if (typeof ErrorLogTrace === 'function') {
        ErrorLogTrace(functionName, message);
    } else {
        console.warn(`[${functionName}]`, message);
    }
}

/**
 * Link session commonfn registrations (landing + editor).
 */
commonfn['UPDATE_COUNT'] = function(response) {
    console.log(JSON.stringify(response));
    if (response.r == 1) {
        console.log("updated close");
    }
};
commonfn['request_reject_post'] = function(response) {
    console.log(JSON.stringify(response));
    if (response.r == 1) {
        console.log("updated close");
    }
};

commonfn['funreturn'] = function(response) {
    console.log(JSON.stringify(response));
    if (response.r == 1) {
        console.log("updated close");
    }
};
commonfn['CLOSESSION'] = function(response) {
    try {
        if (response.r == 1) {
            console.log("updated close log-out");
        }
    } catch (err) {
        console.warn(err.message);
        linkSessionLogError('CLOSESSION', err);
    }
};
commonfn['request_close_session'] = function(response) {
    try {
        console.log(JSON.stringify(response));
        if (response.r == 1) {
            RE_DIRECT_CUR_SESSION(response);
        }
    } catch (err) {
        console.warn(err.message);
        linkSessionLogError('request_close_session', err);
    }
};
commonfn['idle_session_close'] = function(response) {
    try {
        console.log(JSON.stringify(response));
        if (response.r == 1) {
            RE_DIRECT_CUR_SESSION(response);
        }
    } catch (err) {
        console.warn(err.message);
        linkSessionLogError('idle_session_close', err);
    }
};
commonfn.checkaccess = async function(response) {
    try {
        const service = window.LinkSessionModule && LinkSessionModule.getInstance();
        if (!service) {
            console.warn('LinkSessionModule not available');
            return;
        }
        await service.handleCheckResponse(response, resolveLandingSessionContext());
    } catch (err) {
        console.warn(err.message);
        linkSessionLogError('checkaccess', err);
    }
};
commonfn.update_open1 = async function(response) {
    try {
        const service = window.LinkSessionModule && LinkSessionModule.getInstance();
        if (service) {
            await service.handleUpdateOpen1(response, resolveLandingSessionContext());
            return;
        }
        if (response.r == 1) {
            await setItemsandReDirect(DOC_ID, NEW_SESSION_ID, window.location.href, redirect_url, {
                redirect: true
            });
        } else {
            console.log("no records found");
        }
    } catch (err) {
        console.warn(err.message);
        linkSessionLogError('update_open1', err);
    }
};
commonfn.updatereq_id = async function(response) {
    try {
        const service = window.LinkSessionModule && LinkSessionModule.getInstance();
        if (service) {
            await service.handleUpdateReqId(response, resolveLandingSessionContext());
            return;
        }
        console.log("updatereq_id:" + JSON.stringify(response));
    } catch (err) {
        console.warn(err.message);
        linkSessionLogError('updatereq_id', err);
    }
};
commonfn.getreqstatus = async function(response) {
    try {
        const service = window.LinkSessionModule && LinkSessionModule.getInstance();
        if (service) {
            await service.handleGetReqStatus(response, resolveLandingSessionContext());
            return;
        }
        console.log(JSON.stringify(response));
    } catch (err) {
        console.warn(err.message);
        linkSessionLogError('getreqstatus', err);
    }
};

commonfn.autoCloseCheckPoint = function(response, opt, force = false) {
    try {
        var RES_DATA = null;
        var RES_LAST_SAVE = 1111111;
        var RES_SESS_ID = false;
        var RES_START_TIME = false;
        if (response.data.length > 0) {
            RES_DATA = response.data[0];
            RES_LAST_SAVE = RES_DATA.last_saved_time;
            RES_SESS_ID = RES_DATA.session_id;
            RES_START_TIME = RES_DATA.session_start_time;
            if (RES_LAST_SAVE && RES_START_TIME || force) {
                VALIDATE_LAST_SAVE(RES_LAST_SAVE, RES_START_TIME, RES_SESS_ID, force);
            }
        }
    } catch (err) {
        console.warn(err.message);
        linkSessionLogError('autoCloseCheckPoint', err);
    }
};

function VALIDATE_LAST_SAVE(LAST_TIME_SAVE, START_TIME, SESS_ID, force = false) {
    try {
        var DIFF_TIME = moment(new Date().getTime()).diff(parseInt(LAST_TIME_SAVE), 'minutes');
        var STRT_TIME = moment(new Date().getTime()).diff(parseInt(START_TIME), 'minutes');
        if (DIFF_TIME > 30 && STRT_TIME > 30 || force) {
            var json_data = {
                "tbl": "linksharing",
                "docid": DOC_ID,
                "session_end_time": new Date().getTime().toString(),
                "process": "close",
                "remarks": "landing_validate_last_save",
                "source": "landing_validate_last_save"
            };
            if (SESS_ID) {
                json_data.session_id = SESS_ID;
            }
            try {
                console.info('[LinkSessionClose]', {
                    process: json_data.process,
                    source: json_data.source,
                    remarks: json_data.remarks,
                    session_id: json_data.session_id,
                    docid: json_data.docid
                });
                linkSessionLogError('LinkSessionClose', JSON.stringify({
                    process: json_data.process,
                    source: json_data.source,
                    remarks: json_data.remarks,
                    session_id: json_data.session_id,
                    docid: json_data.docid
                }));
            } catch (logErr) {}
            commonfn.callajax(json_data, 'autoCloseMethod', API_LINK_SHARE);
        }
    } catch (err) {
        console.warn(err.message);
        linkSessionLogError('VALIDATE_LAST_SAVE', err);
    }
}