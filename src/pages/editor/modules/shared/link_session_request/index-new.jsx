/**
 * LinkSessionRequestModule — editor incoming-request dialog (accept / reject / auto-accept).
 * Session API logic stays in LinkSessionService (LinkSessionCore).
 */



const LinkSessionRequestModule = {


    timerId: null,
    countdownId: null,

    getPanel() {
        return document.getElementById("LinkSessionRequestDialog");
    },
    _bindModuleMethods() {
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((key) => {
            if (key !== 'constructor' && typeof this[key] === 'function') {
                this[key] = this[key].bind(this);
            }
        });
    },
    getService() {
        const Svc = window.LinkSessionService || window.LinkSessionModule;
        return Svc && typeof Svc.getInstance === "function"
        ? Svc.getInstance()
        : null;
    },


    show() {
        try {
            this.Panel = this.getPanel();
            this.Accept = this.Panel.querySelector('#confirmok');
            this.Reject = this.Panel.querySelector('#confirmcancel');
            const msg = this.Panel.querySelector('#link_session_message');
            if (msg && typeof ALERT_MESSAGE !== 'undefined' && ALERT_MESSAGE.request_dialog) {
                msg.innerHTML = ALERT_MESSAGE.request_dialog.text;
            }
            if (this.Accept) {
                this.Accept.onclick = () => this.handleConfirmDialog('confirm');
            }
            if (this.Reject) {
                this.Reject.onclick = () => this.handleConfirmDialog('cancel');
            }



            const myModal = $(this.Panel);
            clearTimeout(myModal.data('hideInterval'));
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
            myModal.data('hideInterval', setTimeout(() => {
                clearInterval(countdownId);
                this.handleDialogAutoAccept();
            }, 30000));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkSessionRequestModule.showLoop', err.message);
        }
    },

    request_dialog() {
        try {
            this.show();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkSessionRequestModule.request_dialog', err.message);
        }
    },

    handleConfirmDialog(type) {
        try {
            const service = this.getService();
            if (!service) {
                console.warn('[LinkSessionRequestModule] service unavailable');
                return;
            }
            if (type === 'confirm') {
                _CanClose = true;
                const payload = service.getJsonOrBuild('updatestatus_reqstatus', { docstatus: '4', requeststatus: '3' });
                commonfn.callajax(payload, 'request_close_session', API_LINK_SHARE);
            } else {
                this.handleRejectRequest(service);
            }
            if (typeof this.closeDialog === 'function') {
                this.closeDialog();
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkSessionRequestModule.handleConfirmDialog', err.message);
        }
    },

    handleRejectRequest(service) {
        let timerInterval;
        let response = "";
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
        }).then((result) => {
            const vText = result.value;
            const keyText = response.length > 0 ? response : null;
            const remark = (result.isConfirmed)
            ? (vText !== "" ? vText : null)
            : ((result.dismiss === Swal.DismissReason.timer) ? keyText : keyText);
            const payload = service.getJsonOrBuild('updatereqstatus', { remarks: remark });
            commonfn.callajax(payload, 'request_reject_post', API_LINK_SHARE);
            if (remark == null) {
                AlertNewDialog.fire('info', '', "REQ_MSG_NULL", 'OK', '');
            }
        });
    }


    handleDialogAutoAccept() {
        try {

            const service = this.getService();
            if (!service || this.state == 0) {
                return;
            }
            _CanClose = true;
            const payload = service.getJsonOrBuild('updatestatus_reqstatus', { docstatus: '3', requeststatus: '3' });
            commonfn.callajax(payload, 'request_close_session', API_LINK_SHARE);
            if (typeof this.closeDialog === 'function') {
                this.closeDialog();
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkSessionRequestModule.handleDialogAutoAccept', err.message);
        }
    },

    // async postInitializeModule() {
    //     window.LinkSessionRequestDialog = this;
    //     window.LinkShareDialog = this;
    //     if (window.LinkSessionPorts) {
    //         window.LinkSessionPorts.request = this;
    //     }
    //     window.confirmok = (type) => this.handleConfirmDialog(type);
    // }
}


window.LinkSessionRequestModule = LinkSessionRequestModule;

if (window.LinkSessionPorts) {
    window.LinkSessionPorts.request = LinkSessionRequestModule;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = LinkSessionRequestModule;
}
