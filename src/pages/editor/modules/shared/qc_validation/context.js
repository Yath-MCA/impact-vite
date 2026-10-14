let qcRegisterPromise = null;

/** Shared with Track bootstrap — load via ContextHelpers / ensureSupportingFiles. */
const QC_VALIDATION_SUPPORTING_FILES = [{
    name: 'messages',
    type: 'onthefly',
    when: 'initLoop',
    path: './qc_validation/messages.json',
    variable: 'QC_VALIDATION_MESSAGES'
}];

if (typeof window !== 'undefined') {
    window.QC_VALIDATION_SUPPORTING_FILES = QC_VALIDATION_SUPPORTING_FILES;
}

async function registerQCValidationModule() {
    if (typeof IS_TRACK_VIEW !== 'undefined' && IS_TRACK_VIEW) {
        return window.qualityCheckerDialog;
    }

    if (window.qualityCheckerDialog) {
        return window.qualityCheckerDialog;
    }

    if (typeof moduleSystem !== 'undefined' && typeof moduleSystem.hasModule === 'function' &&
        moduleSystem.hasModule('qualityCheckerDialog')) {
        const existing = await moduleSystem.getModule('qualityCheckerDialog');
        if (existing) {
            window.qualityCheckerDialog = existing;
            return existing;
        }
    }

    if (qcRegisterPromise) {
        return qcRegisterPromise;
    }

    qcRegisterPromise = (async () => {
        const registered = await moduleSystem.registerModule('qualityCheckerDialog', {
            name: 'QualityValidationModule',
            type: 'onthefly',
            path: './qc_validation/index.js',
            templatePath: './qc_validation/template.html',
            dependencies: [],
            supportingFiles: QC_VALIDATION_SUPPORTING_FILES,
            wrapping: true,
            group_name: 'qualityCheckerDialog',
            groupOrder: 1111,
            ignore_menu: true,
            commands: []
        });

        const mod = (typeof moduleSystem.getModule === 'function') ?
            await moduleSystem.getModule('qualityCheckerDialog') :
            null;

        if (mod) {
            window.qualityCheckerDialog = mod;
            return mod;
        }

        return registered;
    })();

    try {
        return await qcRegisterPromise;
    } catch (err) {
        qcRegisterPromise = null;
        throw err;
    }
}

async function openQcValidationDialog(option = {}) {
    try {
        if (typeof IS_TRACK_VIEW !== 'undefined' && IS_TRACK_VIEW) {
            if (window.qualityCheckerDialog && typeof window.qualityCheckerDialog.show === 'function') {
                window.qualityCheckerDialog.show();
            }
            return;
        }

        if (window.qualityCheckerDialog && typeof window.qualityCheckerDialog.show === 'function') {
            window.qualityCheckerDialog.show();
            return;
        }

        if (typeof moduleSystem === 'undefined') {
            console.warn('moduleSystem not ready for QC validation');
            return;
        }

        const mod = await registerQCValidationModule();

        if (mod && typeof mod.show === 'function') {
            window.qualityCheckerDialog = mod;
            mod.show();
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('openQcValidationDialog', err.message);
    }
}


$(document).ready(function() {
    if (typeof IS_TRACK_VIEW !== 'undefined' && IS_TRACK_VIEW) {
        return;
    }

    $('#finalize').on('click', async function(evt) {
        evt.preventDefault();
        if (USER_INFO.ROLE_ID == ROLE_IDS.CO) {
            openQcValidationDialog();
        } else if (typeof window.openFinalizeDialog === 'function') {
            await window.openFinalizeDialog();
        } else if (window.FinalizeDialog && typeof FinalizeDialog.show === 'function') {
            FinalizeDialog.show();
        }
    });
});


document.addEventListener('DOMContentLoaded', () => {
    const intervalId = setInterval(async () => {
        if (typeof IS_TRACK_VIEW !== 'undefined' && IS_TRACK_VIEW) {
            clearInterval(intervalId);
            return;
        }

        if (typeof moduleSystem === 'undefined') return;
        if (typeof USER_INFO === 'undefined') return;

        clearInterval(intervalId);

        try {
            if (USER_INFO.ROLE_ID == ROLE_IDS.CO) {
                var qc_results = await registerQCValidationModule();
                // debug.log(qc_results);
            }
        } catch (err) {
            console.warn(err);
            ErrorLogTrace('registerQCValidationModule', err.message || String(err));
        }
    }, 500);
});