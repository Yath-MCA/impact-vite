/*jslint white:true, for:true */
/*global AlertNewDialog, Swal, ErrorLogTrace, LinkSessionModule, LinkSessionPorts */

/**
 * LinkSessionSendModule — Level 1 landing Send Request UI (prompt + poll Swal).
 * Payload/API logic stays in LinkSessionCore.
 */
const LinkSessionSendModule = {
    prompt(response, ctx) {
        try {
            if (typeof AlertNewDialog === 'undefined' || typeof AlertNewDialog.fire !== 'function') {
                if (ctx && typeof ctx.onRequestError === 'function') {
                    ctx.onRequestError(null, ctx);
                }
                return Promise.resolve();
            }
            const service = LinkSessionModule && LinkSessionModule.getInstance();
            if (!service) {
                console.warn('[LinkSessionSendModule] service not available for send prompt');
                if (ctx && typeof ctx.onRequestError === 'function') {
                    ctx.onRequestError(null, ctx);
                }
                return Promise.resolve();
            }
            return AlertNewDialog.fire('Land_Page_Send_Req').then((result) => {
                if (!result.isConfirmed) {
                    return;
                }
                return service.sendAccessRequest(response, ctx);
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkSessionSendModule.prompt', err.message);
            return Promise.resolve();
        }
    },

    showPollWaiting(ctx) {
        try {
            const service = LinkSessionModule && LinkSessionModule.getInstance();
            if (!service) {
                console.warn('[LinkSessionSendModule] service not available for poll');
                if (ctx && typeof ctx.onRequestError === 'function') {
                    ctx.onRequestError(null, ctx);
                }
                return Promise.resolve();
            }
            if (typeof Swal === 'undefined') {
                return service.pollRequestStatus(ctx);
            }

            let timerInterval;
            const swalWithBootstrapButtons = Swal.mixin({
                customClass: { confirmButton: 'btn-success-auto' },
                buttonsStyling: true
            });

            return swalWithBootstrapButtons.fire({
                title: 'IMPACT',
                html: 'The dialogue box will be closed in <b></b> seconds. Your request has been sent and is waiting for approval.',
                timer: 45000,
                allowOutsideClick: false,
                allowEscapeKey: false,
                timerProgressBar: true,
                didOpen: (modal) => {
                    Swal.showLoading();
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
                if (result.dismiss === Swal.DismissReason.timer) {
                    return service.pollRequestStatus(ctx);
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkSessionSendModule.showPollWaiting', err.message);
            return Promise.resolve();
        }
    }
};

window.LinkSessionSendModule = LinkSessionSendModule;
if (window.LinkSessionPorts) {
    window.LinkSessionPorts.send = LinkSessionSendModule;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkSessionSendModule;
}
