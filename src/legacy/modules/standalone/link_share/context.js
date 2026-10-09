/* 
async function openLinkShareDialog() {
    try {
        if (window.LinkShareDialog && typeof window.LinkShareDialog.show === 'function') {
            window.LinkShareDialog.show();
            return;
        }
        if (typeof moduleSystem === 'undefined') return;
        const mod = await moduleSystem.getModule('LinkShareDialog');
        window.LinkShareDialog = mod;
        if (mod && typeof mod.show === 'function') mod.show();
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('openLinkShareDialog', err.message);
    }
}

window.CHECK_REQUEST = {
    SCHEDULER: null,
    forceStop: false,
    TIMER_INTERVAL: SCHEDULER_TIMER['check_request'],
    INTERVAL_TYPE: { refresh: 'setTimeout', default: 'setTimeout', scheduler: 'setInterval' },
    POST_FN: { default: 'fun_return', refresh: 'fun_return', scheduler: 'new_request_post', update_request_status: 'open_new_request' },
    open_new_request(response, _ = CHECK_REQUEST) {
        try {
            if (response.r == 1) {
                if ((response.data.last_saved_time != 0) && (moment(new Date().getTime()).diff(parseInt(response.data.last_saved_time), 'minutes') > 15)) {
                    _CanClose = true;
                    commonfn.callajax(GET_JSON('linksharing', { process: 'updatestatus_reqstatus', docstatus: '2', requeststatus: '3' }), 'idle_session_close', API_LINK_SHARE);
                } else {
                    IMPACT_SAVE.iSave({ forcesave: true });
                    if (window.LinkShareDialog && typeof window.LinkShareDialog.request_dialog === 'function') {
                        window.LinkShareDialog.request_dialog();
                    } else {
                        openLinkShareDialog();
                    }
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('open_new_request', err.message);
        }
    },
    fun_return(response) {
        if (response.r == 1) console.log('updated close');
    },
    check_boolean: false,
    Idle_Alert_State: false,
    logout_with_alert() {
        try {
            _CanClose = true;
            sessionStorage.setItem('status', 'idle_session_sign_off');
            RE_DIRECT_CUR_SESSION(null, { remove: false, alert: 'idle_session_sign_off' });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('logout_with_alert', err.message);
        }
    },
    IDLE_CHECK_DURATION: 40,
    new_request_post(response, opt, _ = CHECK_REQUEST) {
        try {
            if (this.forceStop) return;
            if (response.r == 1) {
                commonfn.callajax(GET_JSON('linksharing', { process: 'updaterequeststatus' }), 'open_new_request', API_LINK_SHARE, this);
            } else {
                const lastSaveTimestamp = (IMPACT_SAVE && IMPACT_SAVE.state && IMPACT_SAVE.state.lastSaveTimestamp);
                if (!!lastSaveTimestamp || this.check_boolean) {
                    const NEW_TIME = new Date().getTime();
                    const PARSE_TIME = parseInt(lastSaveTimestamp);
                    if ((moment(NEW_TIME).diff(PARSE_TIME, 'minutes') > this.IDLE_CHECK_DURATION || this.check_boolean) && !this.Idle_Alert_State) {
                        this.Idle_Alert_State = true;
                        CHECK_REQUEST.cancel(this.SCHEDULER);
                        this.check_boolean = false;
                        if (GlobalEditor) GlobalEditor.setReadOnly(true);
                        AlertNewDialog.fire('idle_session_alert').then((result) => {
                            if (result.isConfirmed) {
                                IMPACT_SAVE.iSave({ forcesave: true, noalert: true });
                                if (GlobalEditor) GlobalEditor.setReadOnly(false);
                                CHECK_REQUEST.Init();
                            } else {
                                if (IS_LOCAL_HOST) return debug.warn('session_out');
                                _CanClose = true;
                                commonfn.callajax(GET_JSON('linksharing', { process: 'close' }), 'logout_with_alert', API_LINK_SHARE, CHECK_REQUEST);
                            }
                        });
                    }
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('new_request_post', err.message);
        }
    },
    check_request(json, post_fun, timer, _ = CHECK_REQUEST) {
        try {
            if (_.forceStop) return;
            if (!navigator.onLine) {
                CHECK_REQUEST.cancel(this.SCHEDULER);
                return;
            }
            if (!SHARED_KEY.apikey) return;
            _.SCHEDULER = setInterval(function (json, post_fun) {
                commonfn.callajax(json, post_fun, API_LINK_SHARE, _);
                commonMethods.cleanTranslatorExtensions();
            }, timer, json, post_fun);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('check_request', err.message);
        }
    },
    TIMER_METHOD(process, Options = {}, _ = CHECK_REQUEST) {
        try {
            if (_.forceStop) return;
            let method = _.INTERVAL_TYPE[process];
            let timer = _.TIMER_INTERVAL[method ? process : 'default'];
            let post_function = _.POST_FN[process] ? _.POST_FN[process] : _.POST_FN.default;
            if (!method) method = _.INTERVAL_TYPE.default;
            let json = GET_JSON('linksharing', { process: process });
            if (method == 'setInterval') _.check_request(json, post_function, timer);
            else {
                setTimeout(function (_json, post_fun) {
                    commonfn.callajax(_json, post_fun, API_LINK_SHARE, _);
                }, timer, json, post_function);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('TIMER_METHOD', err.message);
        }
    },
    CHECK_ONLINE(_ = CHECK_REQUEST) {
        try {
            if (_.forceStop) return;
            if (typeof this.SCHEDULER === 'number' && !window.navigator.onLine) {
                CHECK_REQUEST.cancel(this.SCHEDULER);
            } else if (typeof this.SCHEDULER !== 'number') this.TIMER_METHOD('scheduler');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CHECK_ONLINE', err.message);
        }
    },
    Init(_ = CHECK_REQUEST) {
        try {
            if (this.forceStop) return false;
            if (DOC_ID == null) this.TIMER_METHOD('update_session_end_time');
            else this.TIMER_METHOD('refresh');
            if (!SHARED_KEY.apikey) return false;
            this.TIMER_METHOD('scheduler');
            this.Idle_Alert_State = false;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CHECK_REQUEST-Init', err.message);
        }
    },
    StopAll(self = CHECK_REQUEST) {
        try {
            self.forceStop = true;
            self.cancel(self.SCHEDULER);
            self.Init = function () {};
            self.check_request = function () {};
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CHECK_REQUEST-StopAll', err.message);
        }
    },
    cancel(TIMER, _ = CHECK_REQUEST) {
        try {
            TIMER = TIMER ? TIMER : this.scheduler;
            clearTimeout(TIMER);
            clearInterval(TIMER);
            this.SCHEDULER = null;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('cancel', err.message);
        }
    }
};

commonfn.UPDATE_COUNT = commonfn.funreturn = commonfn.request_reject_post = function (response) {
    if (response.r == 1) console.log('updated close');
};

commonfn.CLOSESSION = function (response) {
    try {
        if (response.r == 1) console.log('updated close log-out');
    } catch (err) {
        ErrorLogTrace('CLOSESSION', err.message);
    }
};

commonfn.request_close_session = commonfn.idle_session_close = function (response) {
    try {
        if (response.r == 1) RE_DIRECT_CUR_SESSION(response);
    } catch (err) {
        ErrorLogTrace('request_close_session', err.message);
    }
};

window.RE_DIRECT_CUR_SESSION = function (response = {}, Options = { remove: true, readOnlyView: false }) {
    const tempDirect = sessionStorage.getItem('redirect');
    const default_redirect = window.FinalizeDialog && FinalizeDialog._state && FinalizeDialog._state.finalize && FinalizeDialog._state.finalize.default;
    let final = tempDirect || default_redirect || NG_WEB_URL;
    try {
        const LIST_OF_REMOVE = [localStorage, ['xmleditor:shared:', 'xmleditor:apikey', 'xmleditor:appkey'], ['wsc_autocorrect', 'wsc_ignoreAllCapsWords', 'wsc_ignoreDomainNames', 'wsc_ignoreWordsWithMixedCases', 'wsc_ignoreWordsWithNumbers', 'wsc_lang']];
        if (Options.remove) {
            LIST_OF_REMOVE.forEach((item) => {
                for (const key in item) {
                    if (key.includes && key.includes(DOC_ID)) localStorage.removeItem(key);
                }
            });
        }
        if (final.match(/validateurl/) && Options.alert) final = final + '&alert=' + Options.alert;
        _CanClose = _IsDirty = false;
        _IsDirty = false;
        if (CKEDITOR && CKEDITOR.instances && CKEDITOR.instances.maineditor) {
            CKEDITOR.instances.maineditor.resetDirty();
            CKEDITOR.instances.maineditor.setReadOnly();
        }
        window.location.href = final;
    } catch (err) {
        window.location.href = final;
    }
};

window.confirmok = function (type) {
    try {
        window.modaltype = type;
        if (type == 'confirm') {
            _CanClose = true;
            const payload = GET_JSON('linksharing', { process: 'updatestatus_reqstatus', docstatus: '4', requeststatus: '3' });
            if (payload) payload.source = 'link_request_dialog';
            commonfn.callajax(payload, 'request_close_session', API_LINK_SHARE);
        } else {
            Swal.fire({
                title: 'IMPACT',
                html: 'The dialogue box will be closed within <b></b> seconds! Please enter your reason for rejection.',
                timer: 10000,
                input: 'text',
                allowOutsideClick: false,
                allowEscapeKey: false,
                timerProgressBar: true,
                confirmButtonText: 'Submit',
                didOpen: (modal) => {
                    const timerInterval = setInterval(() => {
                        const timerElement = modal.querySelector('b');
                        if (timerElement) timerElement.textContent = (Swal.getTimerLeft() / 1000).toFixed(0);
                    }, 100);
                },
                willClose: () => clearInterval(timerInterval)
            }).then((result) => {
                const Remark = result.isConfirmed ? (result.value || null) : null;
                const payload = GET_JSON('linksharing', { process: 'updatereqstatus', remarks: Remark });
                if (payload) payload.source = 'link_request_dialog';
                commonfn.callajax(payload, 'request_reject_post', API_LINK_SHARE);
                if (Remark == null) AlertNewDialog.fire('info', '', 'REQ_MSG_NULL', 'OK', '');
            });
        }
        if (window.LinkShareDialog && typeof window.LinkShareDialog.closeDialog === 'function') {
            window.LinkShareDialog.closeDialog();
        }
    } catch (err) {
        ErrorLogTrace('confirmok', err.message);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof CHECK_REQUEST !== 'undefined' && typeof CHECK_REQUEST.Init === 'function') {
        CHECK_REQUEST.Init();
    }
    
    const intervalId = setInterval(async () => {
        if (typeof moduleSystem === 'undefined') return;
        clearInterval(intervalId);
        await moduleSystem.registerModule('LinkShareDialog', {
            name: 'LinkShareModule',
            type: 'ondemand',
            path: './link_share/index.js',
            templatePath: './link_share/template.html',
            dependencies: [],
            wrapping: true,
            group_name: 'LinkShareDialog',
            groupOrder: 1150,
            commands: []
        });
    }, 500);
});
 */