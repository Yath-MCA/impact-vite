/* global CKEDITOR, ContextHelpers, ErrorLogTrace */

const ADD_EDIT_AFFILIATION_VOID_ELEMENTS = {
    AREA: true,
    BASE: true,
    BR: true,
    COL: true,
    EMBED: true,
    HR: true,
    IMG: true,
    INPUT: true,
    LINK: true,
    META: true,
    PARAM: true,
    SOURCE: true,
    TRACK: true,
    WBR: true
};

const ADD_EDIT_AFFILIATION_MODULE_ID = 'addEditAffiliationDialog';

function isAddEditAffiliationProtectedElement(element) {
    if (!element || element.nodeType !== 1) return false;
    const dataClass = element.getAttribute('data-class') || '';
    const dataName = element.getAttribute('data-name') || '';
    const dataRole = element.getAttribute('data-role') || '';
    return element.getAttribute('contenteditable') === 'false' ||
        element.hasAttribute('data-pi') ||
        element.hasAttribute('data-remove') ||
        element.hasAttribute('data-delete') ||
        /ckcomments/i.test(dataClass) ||
        /^(AQ|query)$/i.test(dataName) ||
        /query|comment/i.test(dataRole);
}

function hasAddEditAffiliationField(root) {
    if (!root || root.nodeType !== 1 || isAddEditAffiliationProtectedElement(root)) return false;

    function containsEditableValue(node, isRoot) {
        if (node.nodeType === 3) return Boolean((node.nodeValue || '').trim());
        if (node.nodeType !== 1 || isAddEditAffiliationProtectedElement(node)) return false;
        if (!isRoot && node.childNodes.length === 0 &&
            !ADD_EDIT_AFFILIATION_VOID_ELEMENTS[node.tagName]) return true;
        return Array.from(node.childNodes).some((child) => containsEditableValue(child, false));
    }

    return containsEditableValue(root, true);
}

function resolveAffiliationElement(element) {
    if (!element) return { native: null, wrapped: null };

    const ascendant = element.getAscendant ? element.getAscendant((candidate) => {
        return candidate && candidate.hasClass && candidate.hasClass('aff');
    }, true) : null;

    if (ascendant && ascendant.$) {
        return { native: ascendant.$, wrapped: ascendant };
    }

    const nativeElement = element.$ || element;
    const affiliation = nativeElement && nativeElement.closest ? nativeElement.closest('div.aff, [data-name="aff"]') : null;
    if (!affiliation) return { native: null, wrapped: null };

    if (element.$ === affiliation) {
        return { native: affiliation, wrapped: element };
    }

    const wrapped = typeof CKEDITOR !== 'undefined' && CKEDITOR.dom && CKEDITOR.dom.element ? new CKEDITOR.dom.element(affiliation) : affiliation;
    return { native: affiliation, wrapped };
}

const ADD_EDIT_AFFILIATION_MODULE_CONFIG = {
    name: 'AddEditAffiliationModule',
    type: 'lazy',
    path: './add_edit_affiliation/index.js',
    templatePath: './add_edit_affiliation/template.html',
    dependencies: [],
    supportingFiles: [{
        name: 'messages',
        type: 'onthefly',
        when: 'initLoop',
        path: './add_edit_affiliation/messages.json',
        variable: 'ADD_EDIT_AFFILIATION_MESSAGES'
    }],
    wrapping: true,
    group_name: 'AuthorGroupModule',
    groupOrder: 206,
    commands: [{
        name: 'addEditAffiliation',
        action: 'add_edit_affiliation',
        label: 'Edit Affiliation',
        icon: '../assets/images/svg/ContextMenu/Edit.svg',
        order: 206
    }],

    executeCommand: async function(editor, item, moduleConfig, params) {
        try {
            const { element, selection } = params || {};
            await window.openAddEditAffiliationDialog('edit', element, selection);
        } catch (error) {
            const message = error && error.message ? error.message : String(error);
            if (typeof ErrorLogTrace === 'function') {
                ErrorLogTrace('addEditAffiliation.executeCommand', message);
            }
        }
    },

    contextMenuHandler: function(element, selection) {
        try {
            if (!element || !selection) return {};

            if (window.paraLock && typeof window.paraLock._isElementLocked === 'function') {
                const locked = window.paraLock._isElementLocked(element, {
                    check_closest: true,
                    alertKey: 'ErrorLockedParaEdit'
                });
                if (locked) return {};
            }

            const target = resolveAffiliationElement(element);
            if (!target.native || target.native.hasAttribute('data-remove') ||
                target.native.hasAttribute('data-delete') || !hasAddEditAffiliationField(target.native)) {
                debug.log("addEditAffiliation.contextMenuHandler: empty");
                return {};
            }

            return { addEditAffiliation: CKEDITOR.TRISTATE_OFF };
        } catch (error) {
            const message = error && error.message ? error.message : String(error);
            if (typeof ErrorLogTrace === 'function') {
                ErrorLogTrace('addEditAffiliation.contextMenuHandler', message);
            }
            return {};
        }
    }
};

async function openAddEditAffiliationDialog(mode, element, selection) {
    try {
        const target = resolveAffiliationElement(element);
        if (!target.native || !target.wrapped) return false;
        if (selection) selection.selectElement(target.wrapped);

        let dialog = window[ADD_EDIT_AFFILIATION_MODULE_ID];
        if (!dialog || typeof dialog.show !== 'function') {
            const moduleSystem = await ContextHelpers.waitForModuleSystem();
            dialog = await moduleSystem.getModule(ADD_EDIT_AFFILIATION_MODULE_ID, {
                autoRegister: ADD_EDIT_AFFILIATION_MODULE_CONFIG
            });
            window[ADD_EDIT_AFFILIATION_MODULE_ID] = dialog;
        }
        if (!dialog || typeof dialog.show !== 'function') return false;
        await dialog.show(mode === 'insert' ? 'insert' : 'edit', target.wrapped);
        return true;
    } catch (error) {
        const message = error && error.message ? error.message : String(error);
        if (typeof ErrorLogTrace === 'function') {
            ErrorLogTrace('addEditAffiliation.openDialog', message);
        }
        return false;
    }
}

window.openAddEditAffiliationDialog = openAddEditAffiliationDialog;

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(
        ADD_EDIT_AFFILIATION_MODULE_ID,
        ADD_EDIT_AFFILIATION_MODULE_CONFIG,
        {}
    );
});
