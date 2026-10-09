/**
 * @deprecated Use src/modules/shared/link_session/ — LinkSessionModule extends BaseModule.
 * Template: src/modules/shared/link_session/template.html
 */
class LinkShareModule extends BaseModule {
    constructor(name = 'LinkShareModule', errorTracker = null, options = {}) {
        super(name, errorTracker, options);
        this._id = 'LinkShareDialog';
        this.canUnmountComponentWhileClose = true;
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
        const _ = this;
        try {
            _.Accept = _.Panel.querySelector('#confirmok');
            _.Reject = _.Panel.querySelector('#confirmcancel');
            const msg = _.Panel.querySelector('#link_share_message');
            if (msg && typeof ALERT_MESSAGE !== 'undefined' && ALERT_MESSAGE.request_dialog) {
                msg.innerHTML = ALERT_MESSAGE.request_dialog.text;
            }
            if (_.Accept) _.Accept.onclick = () => window.confirmok('confirm');
            if (_.Reject) _.Reject.onclick = () => window.confirmok('cancel');
            _.FullyLoaded = true;
            _.AutoInitiated = true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkShare-initLoop', err.message);
        }
    }

    showLoop() {
        const _ = this;
        try {
            const myModal = $(this.Panel);
            clearTimeout(myModal.data('hideInterval'));
            $('#seconds-timer').html('');
            let dialogDisplaySeconds = 30;
            setInterval(function() {
                if (dialogDisplaySeconds > 0) {
                    $('#seconds-timer').html(dialogDisplaySeconds);
                    dialogDisplaySeconds -= 1;
                }
            }, 1000);
            myModal.data('hideInterval', setTimeout(function() {
                window.modaltype = 'confirm';
                _CanClose = true;
                const payload = GET_JSON('linksharing', {
                    process: 'updatestatus_reqstatus',
                    docstatus: '3',
                    requeststatus: '3'
                });
                if (payload) payload.source = 'link_request_dialog';
                commonfn.callajax(payload, 'request_close_session', API_LINK_SHARE);
                _.closeDialog();
            }, 30000));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkShare-showLoop', err.message);
        }
    }

    request_dialog() {
        const _ = this;
        try {
            $('#modalBody').html(ALERT_MESSAGE.request_dialog.text);
            $('.btn-name').attr('getval', 'newrequest');
            $('#modalConfirm').modal({
                show: true,
                backdrop: 'static',
                keyboard: false
            });
            _.show();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('request_dialog', err.message);
        }
    }
}

export default LinkShareModule;
