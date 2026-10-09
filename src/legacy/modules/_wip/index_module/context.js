async function openIndexDialog() {
    try {
        if (window.IndexDialog && typeof window.IndexDialog.show === 'function') {
            window.IndexDialog.show();
            return;
        }
        if (typeof moduleSystem === 'undefined') {
            console.warn('moduleSystem not ready for index module');
            return;
        }
        const mod = await moduleSystem.getModule('IndexDialog');
        window.IndexDialog = mod;
        if (mod && typeof mod.show === 'function') {
            mod.show();
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('openIndexDialog', err.message);
    }
}

async function openIndexPreview() {
    try {
        if (typeof moduleSystem === 'undefined') return;
        const mod = window.IndexDialog || await moduleSystem.getModule('IndexDialog');
        window.IndexDialog = mod;
        if (mod && typeof mod.showPreview === 'function') {
            mod.showPreview();
        }
    } catch (err) {
        ErrorLogTrace('openIndexPreview', err.message);
    }
}

function callbackMarkIndexEntry() {
    if (window.IndexDialog && typeof window.IndexDialog.show === 'function') {
        window.IndexDialog.show();
    } else if (typeof GlobalEditor !== 'undefined' && GlobalEditor.execCommand) {
        GlobalEditor.execCommand('MARK_INDEX_ENTRY');
    } else {
        openIndexDialog();
    }
}

$(document).on('click', '#indexFileBtn a, #indexFileBtn, #markIndexEntryBtn', function(evt) {
    if (evt && typeof evt.preventDefault === 'function') {
        evt.preventDefault();
    }
    openIndexDialog();
});

$(document).on('click', '#indexPreviewBtn', function(evt) {
    if (evt && typeof evt.preventDefault === 'function') {
        evt.preventDefault();
    }
    openIndexPreview();
});

const INDEX_MODULE_ID = 'IndexDialog';
const INDEX_MODULE_CONFIG = {
    name: 'IndexModule',
    type: 'ondemand',
    path: './index_module/index.js',
    templatePath: './index_module/template.html',
    dependencies: [],
    wrapping: true,
    group_name: 'IndexDialog',
    groupOrder: 1200,
    commands: [{
        name: 'MARK_INDEX_ENTRY',
        action: 'index',
        label: 'Mark Index Entry',
        icon: '../assets/images/svg/ContextMenu/Add.svg',
        order: 1201
    }],
    contextMenuHandler: function(element, selection, elementPath, editor) {
        if (!element || !selection) return {};
        debug.log("index-contextMenuHandler");
        const IMS = IMPACT_SELECTION;
        var MenuReturn = {};
        if (["graphic", "ext-link", "ice-del"].some(cls => IMS.PARENTS_CLAS_LIST.some(c => c.includes(cls))))
            return MenuReturn;
        var contextData = getSectionData(element, selection, elementPath, editor) || {};
        var {
            sectionTxtLen
        } = contextData;

        if (sectionTxtLen > 0) {

            MenuReturn.MARK_INDEX_ENTRY = CKEDITOR.TRISTATE_OFF;

        }



        return MenuReturn;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(INDEX_MODULE_ID, INDEX_MODULE_CONFIG);
});