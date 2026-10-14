const DOCUMENT_RESTORE_MODULE_ID = 'DocumentRestoreDialog';
const DOCUMENT_RESTORE_MODULE_CONFIG = {
    name: 'DocumentRestoreModule',
    type: 'lazy',
    path: './document_restore/index.js',
    templatePath: 'document_restore/template.html',
    dependencies: [],
    wrapping: true,


    group_name: "DocumentRestoreDialog",
    groupOrder: 999,
    commands: [{
        name: 'RESTORE_VERSION',
        action: 'restore',
        label: "Restore Version",
        icon: '../assets/images/svg/ContextMenu/Add.svg',
        order: 999,
        ignore_menu: true
    }],

    // UI element triggers - automatically bound by ContextHelpers
    uiTriggers: [
        // {
        //     selector: '#restoreHTML',
        //     action: 'restore'
        // }
    ],

    onContentDomUpdate: function(editor, editable) {},

    /**
     * Unified handler for both context menu and UI triggers
     * @param {Object} editor - CKEditor instance (null for UI triggers)
     * @param {Object} item - Command/trigger item with action property
     * @param {Object} config - Module config
     * @param {Object} params - Additional parameters including fromUI flag
     */
    executeCommand: async function(editor, item, config, params) {
        if (item.action === 'restore') {
            await ContextHelpers.openModuleUI(
                DOCUMENT_RESTORE_MODULE_ID,
                DOCUMENT_RESTORE_MODULE_CONFIG,
                'DocumentRestoreDialog'
            );
        }
    },

    contextMenuHandler: function(element, selection, elementPath, editor) {
        if (!element || !selection) return {};
    }
};


function callbackRestore() {
    if (window.DocumentRestoreDialog && typeof window.DocumentRestoreDialog.show == "function") {
        window.DocumentRestoreDialog.show();
    } else {
        GlobalEditor.execCommand("RESTORE_VERSION");
    }
}

$(document).ready(function() {
    $('#restoreHTML').on('click', async function(evt) {

        evt.preventDefault();

        debug.log("--restoreHTML--");

        callbackRestore();

    });
});
document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(DOCUMENT_RESTORE_MODULE_ID, DOCUMENT_RESTORE_MODULE_CONFIG);
});