/**
 * ShowTracking (trackDialog) ModuleSystem registration — class-based WIP stack.
 */

const SHOW_TRACKING_MODULE_ID = 'trackDialogModule';
const SHOW_TRACKING_MODULE_CONFIG = {
    name: 'ShowTrackingModule',
    type: 'ondemand',
    path: './show_tracking/index.js',
    templatePath: './show_tracking/template.html',
    dependencies: [],
    wrapping: true,
    trackView: true,

    group_name: 'trackDialogModule',
    groupOrder: 200,
    commands: [],
    supportingFiles: [{
        name: 'support_data',
        type: 'onthefly',
        when: 'initLoop',
        path: './show_tracking/support_data.json',
        variable: 'TP_SUPPORT_CONFIG'
    }, {
        name: 'support_data_alias',
        type: 'onthefly',
        when: 'initLoop',
        path: './show_tracking/support_data.json',
        variable: 'SHOW_TRACKING_SUPPORT_DATA'
    }, {
        name: 'messages',
        type: 'onthefly',
        when: 'initLoop',
        path: './show_tracking/messages.json',
        variable: 'SHOW_TRACKING_MESSAGES'
    }]
};

async function getTrackDialog() {
    if (window.trackDialog && window.trackDialog._simplePathActive != null) {
        return window.trackDialog;
    }
    if (typeof moduleSystem === 'undefined') {
        throw new Error('moduleSystem not ready for ShowTracking');
    }
    const mod = await moduleSystem.getModule(SHOW_TRACKING_MODULE_ID);
    window.trackDialog = mod;
    return mod;
}

async function ensureTrackDialogReady() {
    try {
        const dialog = await getTrackDialog();
        if (dialog && typeof dialog.applySupportConfig === 'function') {
            dialog.applySupportConfig();
        }
        if (dialog && typeof dialog.init === 'function' && !dialog.FullyLoaded) {
            await Promise.resolve(dialog.init({}));
        }
        return dialog;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('ensureTrackDialogReady', err.message);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof ContextHelpers !== 'undefined' && ContextHelpers.registerOnReady) {
        ContextHelpers.registerOnReady(SHOW_TRACKING_MODULE_ID, SHOW_TRACKING_MODULE_CONFIG);
    }
});

window.getTrackDialog = getTrackDialog;
window.ensureTrackDialogReady = ensureTrackDialogReady;
