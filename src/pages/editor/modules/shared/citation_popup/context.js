
const CITATION_POPUP_MODULE_ID = 'CITATION_POPUP';
const CITATION_POPUP_MODULE_CONFIG = {
    name: 'CitationPopupDialog',
    type: 'lazy',
    path: './citation_popup/index.js',
    templatePath: '',
    dependencies: [],
    wrapping: true,
    trackView: true,

    commands: [],
    onDoubleClick: function (evt, editor, editable) {
        const I = {
            element: evt.data.element,
            dom: evt.data.element.$,
            domParent: evt.data.element.$.parentElement,
            tag: evt.data.element.$.tagName,
            IsInsert: evt.data.element.$.tagName == "INSERT",
            data_name: evt.data.element.$.getAttribute('data-name'),
            class_name: evt.data.element.$.getAttribute('class'),
            dataname_Par: evt.data.element.$.parentElement.getAttribute('data-name')
        };
        if (typeof CITATION_POPUP != "undefined") CITATION_POPUP.GotoCaption(I);
    },
    // executeCommand: function (editor, editable) { },
    contextMenuHandler: function (element, selection, elementPath, editor) {
        if (!element || !selection) return {};
    }
};

function executeMethod_CitePop(funcName, ...args) {
    try {
        // window.CITATION_POPUP = await moduleRegistry.getModule("CitationPopupDialog");
        if (typeof window.CITATION_POPUP[funcName] !== 'function') {
            throw new Error(`Method ${funcName} not found`);
        }
        window.CITATION_POPUP[funcName].apply(this, args);
    } catch (error) {
        window.CITATION_POPUP.trackError(`executeMethod(${funcName})`, error);
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(CITATION_POPUP_MODULE_ID, CITATION_POPUP_MODULE_CONFIG);
});
