/**
 * LinkSessionRequestModule — editor incoming-request dialog (accept / reject / auto-accept).
 * Session API logic stays in LinkSessionService (LinkSessionCore).
 */

const LINK_REQUEST_DIALOG_SOURCE = 'link_request_dialog';

function getService() {
    const Svc = window.LinkSessionService || window.LinkSessionModule;
    return Svc && typeof Svc.getInstance === 'function' ? Svc.getInstance() : null;
}

class LinkSessionRequestModule extends BaseModule {
    constructor(name = 'LinkSessionRequestModule', errorTracker = null, options = {}) {
        super(name, 'link_session_request', options);
        this._id = 'LinkSessionRequestDialog';
        this.canUnmountComponentWhileClose = true;
        this.LinkSessionRequestActive = false;
        this._requestCountdownId = null;
        this._bindModuleMethods();
    }

    _bindModuleMethods() {
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((key) => {
            if (key !== 'constructor' && typeof this[key] === 'function') {
                this[key] = this[key].bind(this);
            }
        });
    }

    initLoop() {
        try {
            
            this.FullyLoaded = true;
            this.AutoInitiated = true;
            this.Before_closeDialog = () => {
                this.clearRequestDialogTimers();
                return true;
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkSessionRequestModule.initLoop', err.message);
        }
    }

    showLoop() {
        try {
            this.LinkSessionRequestActive = true;
            const msg = this.Panel.querySelector('#link_session_message');
            if (msg && typeof ALERT_MESSAGE !== 'undefined' && ALERT_MESSAGE.request_dialog) {
                msg.innerHTML = ALERT_MESSAGE.request_dialog.text;
            }

            this.Accept = this.Panel.querySelector('#confirmok');
            this.Reject = this.Panel.querySelector('#confirmcancel');

            if (this.Accept) {
                this.Accept.onclick = () => this.handleConfirmDialog('confirm');
            }
            if (this.Reject) {
                this.Reject.onclick = () => this.handleConfirmDialog('cancel');
            }
            const myModal = $(this.Panel);
            clearTimeout(myModal.data('hideInterval'));
            if (this._requestCountdownId) {
                clearInterval(this._requestCountdownId);
                this._requestCountdownId = null;
            }

            $('#seconds-timer').html('');

            let dialogDisplaySeconds = 30;
            const countdownId = setInterval(function () {
                if (dialogDisplaySeconds > 0) {
                    $('#seconds-timer').html(dialogDisplaySeconds);
                    dialogDisplaySeconds -= 1;
                } else {
                    clearInterval(countdownId);
                }
            }, 1000);
            this._requestCountdownId = countdownId;


            myModal.data('hideInterval', setTimeout(() => {
                this.clearRequestDialogTimers();
                this.handleDialogAutoAccept();
            }, 30000));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkSessionRequestModule.showLoop', err.message);
        }
    }

    clearRequestDialogTimers() {
        try {
            const panel = this.Panel || document.getElementById('LinkSessionRequestDialog');
            const myModal = panel ? $(panel) : null;
            if (myModal) {
                clearTimeout(myModal.data('hideInterval'));
                myModal.removeData('hideInterval');
            }
            if (this._requestCountdownId) {
                clearInterval(this._requestCountdownId);
                this._requestCountdownId = null;
            }
            this.LinkSessionRequestActive = false;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkSessionRequestModule.clearRequestDialogTimers', err.message);
        }
    }

    request_dialog() {
        try {
            this.show();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkSessionRequestModule.request_dialog', err.message);
        }
    }

    async handleConfirmDialog(type) {
        try {
            const service = getService();
            if (!service) {
                console.warn('[LinkSessionRequestModule] service unavailable');
                return;
            }
            if (type === 'confirm') {
                _CanClose = true;
                const payload = service.getJsonOrBuild('updatestatus_reqstatus', {
                    docstatus: '4',
                    requeststatus: '3',
                    source: LINK_REQUEST_DIALOG_SOURCE
                });
                const response = await service.postLinkShare(payload);
                console.log(JSON.stringify(response));
                if (response.r == 1) {
                    RE_DIRECT_CUR_SESSION(response);
                }
            } else {
                this.handleRejectRequest(service);
            }

            this.clearRequestDialogTimers();
            if (typeof this.closeDialog === 'function') {
                this.closeDialog();
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkSessionRequestModule.handleConfirmDialog', err.message);
        }
    }

    handleRejectRequest(service) {
        let timerInterval;
        let response = "";
        this.clearRequestDialogTimers();
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
                const inputEl = modal.querySelector('input');
            // Track input value as user types
                inputEl.addEventListener('input', (e) => {
                    response = e.target.value;
                });

                timerInterval = setInterval(() => {
                    const timerElement = modal.querySelector('b');
                    if (timerElement) {
                        timerElement.textContent = (Swal.getTimerLeft() / 1000).toFixed(0);
                    }
                }, 100);
            },
            willClose: () => {
                clearInterval(timerInterval);
            }
        }).then(async (result) => {
            const vText = result.value;
            const keyText = response.length > 0 ? response : null;
            const remark = (result.isConfirmed)
            ? (vText !== "" ? vText : null)
            : ((result.dismiss === Swal.DismissReason.timer) ? keyText : keyText);

            const payload = service.getJsonOrBuild('updatereqstatus', {
                remarks: remark,
                source: LINK_REQUEST_DIALOG_SOURCE
            });
            const rejectResponse = await service.postLinkShare(payload);
            console.log(JSON.stringify(rejectResponse));
            if (rejectResponse.r == 1) {
                console.log("updated close");
            }
            if (remark == null) {
                AlertNewDialog.fire('info', '', "REQ_MSG_NULL", 'OK', '');
            }
        });
    }


    async handleDialogAutoAccept() {
        try {
            const service = getService();
            const isClosed = this.state == 0;
            if (!service || isClosed) {
                this.clearRequestDialogTimers();
                return;
            }
            this.clearRequestDialogTimers();
            _CanClose = true;
            const payload = service.getJsonOrBuild('updatestatus_reqstatus', {
                docstatus: '3',
                requeststatus: '3',
                source: LINK_REQUEST_DIALOG_SOURCE
            });
            const response = await service.postLinkShare(payload);
            console.log(JSON.stringify(response));
            if (response.r == 1) {
                RE_DIRECT_CUR_SESSION(response);
            }
            if (typeof this.closeDialog === 'function') {
                this.closeDialog();
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkSessionRequestModule.handleDialogAutoAccept', err.message);
        }
    }

    async postInitializeModule() {
        window.LinkSessionRequestDialog = this;
        window.LinkShareDialog = this;
        if (window.LinkSessionPorts) {
            window.LinkSessionPorts.request = this;
        }
        window.confirmok = (type) => this.handleConfirmDialog(type);
    }
}

export default LinkSessionRequestModule;
