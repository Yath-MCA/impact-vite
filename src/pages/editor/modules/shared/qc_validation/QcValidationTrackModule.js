/**
 * QcValidationTrackModule — Track View Internal Validation (no BaseModule).
 * Mounts via legacy dialogModule from e6_common.
 * Dialog markup: shared template.html (fetched at bootstrap — do not inline a copy).
 * Messages: same supportingFiles as context.js → ContextHelpers.loadModuleResource.
 */
import QcValidationCore from './QcValidationCore.js';

/** Fallback if editor context.js did not run (Track does not load that script). */
const QC_MESSAGES_SUPPORTING_FILE = {
    name: 'messages',
    type: 'onthefly',
    when: 'initLoop',
    path: './qc_validation/messages.json',
    variable: 'QC_VALIDATION_MESSAGES'
};

class QcValidationTrackModule extends QcValidationCore {
    constructor() {
        super();
        this._Id = this._id = 'qualityCheckerDialog';
        this.dialog_template = '';
    }

    logError(functionName, error) {
        console.warn(`Error in ${functionName}: ${error.message}`);
        ErrorLogTrace(`QcValidationTrackModule.${functionName}`, error.message);
    }

    /** Track View: profile menu only — never rewire FinalizeDialog. */
    initLoop() {
        try {
            this.init_element_arg();

            this.templateList.entry =
                '<div class="d-flex flex-column p-1" id={{id}}><div class="pt-2 pb-2 item-head">{{txt1}}</div>' +
                '<div class="ml-2" id={{id_col}}><div class="spinner-border" role="status">' +
                '<span class="sr-only">Loading...</span></div></div></div>';
            this.templateList.showbtn = '<a class="nav-link" href="#" onclick="openQcValidationDialog();" id="validation_log"><img src="assets/images/svg/trackview/QC_LOGS.svg" class="mr-2 ml-2"></a>';

            if ((USER_INFO.ROLE_ID === ROLE_IDS.CO || IS_LOCAL_HOST) && !IS_EDITOR_PAGE) {
                const qcGroup = document.getElementById('qcValidationGroup');
                if (qcGroup && !document.getElementById('validation_log')) {
                    // const showBtn = this.GetFragment(this.templateList.showbtn);
                    $(qcGroup).append(this.templateList.showbtn);
                }
            }
            this.FullyLoaded = true;
            this.AutoInitiated = true;
        } catch (err) {
            this.logError('initLoop', err);
        }
    }

    showLoop() {
        super.showLoop();
    }
}

function resolveQcTemplateUrl() {
    const ver = (typeof iVersion !== 'undefined' && iVersion) ||
        (typeof VERSION !== 'undefined' && VERSION) ||
        '';
    const stamp = Date.now();
    return `./assets/${ver}/modules/qc_validation/template.html?_${stamp}`;
}

function getQcSupportingFiles() {
    if (typeof window !== 'undefined' && Array.isArray(window.QC_VALIDATION_SUPPORTING_FILES) &&
        window.QC_VALIDATION_SUPPORTING_FILES.length) {
        return window.QC_VALIDATION_SUPPORTING_FILES;
    }
    return [QC_MESSAGES_SUPPORTING_FILE];
}

/**
 * Load messages.json onto window.QC_VALIDATION_MESSAGES (same pipeline as editor).
 */
async function hydrateQcSupportingFiles(instance) {
    const files = getQcSupportingFiles();
    instance._supportingFiles = files;

    const helpers = typeof window !== 'undefined' ? window.ContextHelpers : null;
    if (!helpers || typeof helpers.loadModuleResource !== 'function') {
        console.warn('QC Track: ContextHelpers.loadModuleResource unavailable; messages bag empty');
        return;
    }

    const messagesEntry = files.find((f) => f && f.name === 'messages') || files[0];
    if (!messagesEntry) return;

    try {
        const bag = await helpers.loadModuleResource(messagesEntry);
        if (bag && typeof bag === 'object') {
            instance._moduleMessages = bag;
        }
    } catch (err) {
        console.warn('QC Track messages hydrate failed:', err && err.message);
    }
}

/**
 * Mount Track QC via dialogModule once globals exist.
 * Loads shared template.html (same file BaseModule uses on editor).
 */
export async function bootstrapQcValidationTrack() {
    if (typeof IS_TRACK_VIEW === 'undefined' || !IS_TRACK_VIEW) {
        return null;
    }
    if (typeof dialogModule === 'undefined') {
        return null;
    }
    if (typeof USER_INFO === 'undefined') {
        return null;
    }
    if (window.qualityCheckerDialog) {
        return window.qualityCheckerDialog;
    }

    const url = resolveQcTemplateUrl();
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`QC template fetch failed: ${response.status} ${url}`);
    }
    const html = (await response.text()).trim();
    if (!html) {
        throw new Error(`QC template empty: ${url}`);
    }

    const instance = new QcValidationTrackModule();
    instance.dialog_template = html;
    Object.assign(instance, new dialogModule(instance._Id, instance.dialog_template));
    await hydrateQcSupportingFiles(instance);
    if (typeof MODULE_LIST !== 'undefined') {
        MODULE_LIST[instance._Id] = instance;
    }
    window.qualityCheckerDialog = instance;
    if (typeof instance.init === 'function') {
        instance.init();
    } else if (typeof instance.initLoop === 'function') {
        instance.initLoop();
    }
    return instance;
}

export function openQcValidationDialog() {
    try {
        if (window.qualityCheckerDialog && typeof window.qualityCheckerDialog.show === 'function') {
            window.qualityCheckerDialog.show();
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('openQcValidationDialog', err.message);
    }
}

if (typeof window !== 'undefined') {
    window.openQcValidationDialog = openQcValidationDialog;
    window.QcValidationTrackModule = QcValidationTrackModule;
}

export default QcValidationTrackModule;