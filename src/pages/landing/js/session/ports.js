/*jslint white:true, for:true */
/*global window, LinkSessionCore, ErrorLogTrace */

/**
 * Link session UI ports — send (landing) and request (editor) sub-modules register here.
 */
window.LinkSessionPorts = window.LinkSessionPorts || {
    send: null,
    request: null
};

function getRequestDialog(self) {
    if (self && typeof self.request_dialog === 'function') {
        return self;
    }
    if (window.LinkSessionPorts && window.LinkSessionPorts.request) {
        return window.LinkSessionPorts.request;
    }
    return window.LinkSessionRequestDialog || window.LinkShareDialog;
}

function openRequestDialog(self, options) {
    options = options || {};
    const maxAttempts = options.maxAttempts || 20;
    const intervalMs = options.intervalMs || 250;
    let attempts = 0;
    let loadRequested = false;

    function requestDialogModuleLoad() {
        if (loadRequested ||
            !window.moduleRegistry ||
            typeof window.moduleRegistry.getModule !== 'function') {
            return;
        }
        loadRequested = true;
        window.moduleRegistry.getModule('LinkSessionRequestModule').catch(function(err) {
            const message = err && err.message ? err.message : String(err || 'request dialog load failed');
            if (typeof LinkSessionCore !== 'undefined' && typeof LinkSessionCore.logErrorStatic === 'function') {
                LinkSessionCore.logErrorStatic('openRequestDialog', message);
            } else if (typeof ErrorLogTrace === 'function') {
                ErrorLogTrace('openRequestDialog', message);
            }
        });
    }

    function tryOpen() {
        const dialog = getRequestDialog(self);
        if (dialog && typeof dialog.request_dialog === 'function') {
            dialog.request_dialog();
            return;
        }
        requestDialogModuleLoad();
        attempts += 1;
        if (attempts < maxAttempts) {
            setTimeout(tryOpen, intervalMs);
        } else {
            console.warn('[LinkSession] request dialog unavailable after retries');
            if (typeof LinkSessionCore !== 'undefined' && typeof LinkSessionCore.logErrorStatic === 'function') {
                LinkSessionCore.logErrorStatic('openRequestDialog', 'request dialog unavailable after retries');
            } else if (typeof ErrorLogTrace === 'function') {
                ErrorLogTrace('openRequestDialog', 'request dialog unavailable after retries');
            }
        }
    }
    tryOpen();
}

window.getRequestDialog = getRequestDialog;
window.openRequestDialog = openRequestDialog;