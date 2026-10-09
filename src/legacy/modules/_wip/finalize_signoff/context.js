/**
 * FinalizeSignOff module registration — ModuleSystem cutover from dialogModules/FinalizeSignOff.js
 */

const FINALIZE_MODULE_ID = 'FinalizingDialog';
const FINALIZE_MODULE_CONFIG = {
    name: 'FinalizeSignOffModule',
    type: 'onthefly',
    path: './finalize_signoff/index.js',
    templatePath: './finalize_signoff/template.html',
    dependencies: [],

    supportingFiles: [{
        name: "FinalizingDialog",
        type: "lazy",
        when: "initLoop",
        path: "./finalize_signoff/messages.json",
        variable: "FINALIZE_DIALOG_MESSAGES"
    }],
    wrapping: true,
    group_name: 'FinalizingDialog',
    groupOrder: 1170,
    commands: []
};

async function getFinalizeDialog() {
    if (window.FinalizeDialog) {
        return window.FinalizeDialog;
    }

    if (typeof moduleSystem === 'undefined') {
        throw new Error('moduleSystem not ready for FinalizeSignOff');
    }

    const mod = await moduleSystem.getModule(FINALIZE_MODULE_ID);
    window.FinalizeDialog = mod;
    return mod;
}

async function openFinalizeDialog() {
    try {
        // Prevent re-opening if dialog is already visible — just focus it
        if (window.FinalizeDialog && window.FinalizeDialog.Panel && !window.FinalizeDialog.Panel.classList.contains('ds-none')) {
            const panel = window.FinalizeDialog.Panel;
            panel.focus();
            const headerDiv = panel.querySelector('.dia_header_div');
            if (headerDiv) headerDiv.click();
            window.focus();
            return window.FinalizeDialog;
        }

        const dialog = await getFinalizeDialog();
        if (dialog && typeof dialog.show === 'function') {
            dialog.show();
        }
        return dialog;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('openFinalizeDialog', err.message);
        return null;
    }
}

function bindWorkFlowReturn() {
    commonfn.Work_Flow_Return = function (response, Options) {
        try {
            Options = Options || { redirect: false };
            const mod = window.FinalizeDialog;
            if (!mod) return;
            if (!mod._state) {
                mod._state = {};
            }
            if (!response || !response.data || response.data.length == 0) {
                const index = SHARE_USER_IDs.indexOf(USER_INFO.MAIL_ID_PREFIX);
                if (index > 2 && (USER_INFO.ROLE_ID != ROLE_IDS.CO) && SHARED_KEY.apikey) {
                    setTimeout(function () {
                        ErrorLogTrace('WORK_FLOW', 'Work_Flow_Missing');
                    }, 5 * 60 * 1000);
                }
                mod._state.workFlow = { data: [] };
                mod.CloseSharedStatus(Options);
                return;
            }
            mod._state.workFlow = response;
            mod.CloseSharedStatus(Options);
        } catch (err) {
            ErrorLogTrace('Work_Flow_Return', err.message);
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    bindWorkFlowReturn();
    if (typeof ContextHelpers !== 'undefined' && ContextHelpers.registerOnReady) {
        ContextHelpers.registerOnReady(FINALIZE_MODULE_ID, FINALIZE_MODULE_CONFIG);
    }
});

window.getFinalizeDialog = getFinalizeDialog;
window.openFinalizeDialog = openFinalizeDialog;
