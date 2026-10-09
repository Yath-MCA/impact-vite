const EDIT_REFERENCE_TEXT_MODULE_ID = 'editReferenceTextDialog';
const EDIT_REFERENCE_TEXT_MODULE_CONFIG = {
    name: 'EditReferenceTextModule',
    type: 'lazy',
    path: './edit_reference_text/index.js',
    templatePath: './edit_reference_text/template.html',
    dependencies: [],
    supportingFiles: [{
        name: 'messages',
        type: 'onthefly',
        when: 'initLoop',
        path: './edit_reference_text/messages.json',
        variable: 'EDIT_REFERENCE_TEXT_MESSAGES'
    }],
    wrapping: true,
    group_name: 'ReferenceGroup',
    groupOrder: 205,
    commands: [{
        name: 'editRefText',
        action: 'edit_ref_text',
        label: 'Edit Reference Text',
        icon: '../assets/images/svg/ContextMenu/Edit.svg',
        order: 205,
        canShowValidation: {
            client_key: 'editRefText'
        }
    }],
    executeCommand: async function(editor, item, moduleConfig, params) {
        try {
            const {
                element,
                selection
            } = params;
            if (!element) return;

            const ref = element.getAscendant ?
                element.getAscendant(function(el) {
                    return el && el.hasClass && el.hasClass('ref');
                }, true) :
                null;

            let target = ref || element;
            // If ascent landed on a child, climb to div.ref via DOM
            if (target && target.$ && !target.hasClass('ref')) {
                const ascent = target.$.closest ? target.$.closest('div.ref') : null;
                if (ascent && typeof CKEDITOR !== 'undefined') {
                    target = new CKEDITOR.dom.element(ascent);
                }
            }

            if (selection && target) {
                selection.selectElement(target);
            }

            const ensureInstance = async () => {
                if (window[EDIT_REFERENCE_TEXT_MODULE_ID] &&
                    typeof window[EDIT_REFERENCE_TEXT_MODULE_ID].show === 'function') {
                    return window[EDIT_REFERENCE_TEXT_MODULE_ID];
                }
                const ms = await ContextHelpers.waitForModuleSystem();
                const mod = await ms.getModule(EDIT_REFERENCE_TEXT_MODULE_ID, {
                    autoRegister: EDIT_REFERENCE_TEXT_MODULE_CONFIG
                });
                window[EDIT_REFERENCE_TEXT_MODULE_ID] = mod;
                return mod;
            };

            const dialog = await ensureInstance();
            if (!dialog || typeof dialog.show !== 'function') return;

            await dialog.show('edit', target);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('editRefText.executeCommand', err.message);
        }
    },
    contextMenuHandler: function(element, selection, elementPath, editor, subItems) {
        try {
            if (!element || !selection) return {};

            if (window.paraLock && typeof window.paraLock._isElementLocked === 'function') {
                const isLocked = window.paraLock._isElementLocked(element, {
                    check_closest: true,
                    alertKey: 'ErrorLockedParaEdit'
                });
                if (isLocked) return {};
            }

            const ref = element.getAscendant ?
                element.getAscendant(function(el) {
                    return el && el.hasClass && el.hasClass('ref');
                }, true) :
                null;

            let refEl = null;
            if (ref && ref.$) {
                refEl = ref.$;
            } else if (element.$ && element.$.closest) {
                refEl = element.$.closest('div.ref');
            }

            if (!refEl) return {};

            if (refEl.hasAttribute('data-remove') || refEl.hasAttribute('data-delete')) {
                return {};
            }

            const mixed = refEl.querySelector('.mixed-citation');
            if (!mixed) return {};

            // Show whenever structured mixed-citation exists (including cases
            // where full MultiRef Edit is gated: plain_text, other, etc.)
            const hasLeaf = mixed.querySelector(
                '.surname, .given-names, .collab, .article-title, .chapter-title, .source, .year, .volume, .issue, .fpage, .lpage, .publisher-name, .publisher-loc, .edition, .comment, .ext-link, .pub-id, .uri, .etal, .supplement'
            );
            if (!hasLeaf) return {};

            return {
                editRefText: CKEDITOR.TRISTATE_OFF
            };
        } catch (err) {
            console.warn(err.message);
            return {};
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(EDIT_REFERENCE_TEXT_MODULE_ID, EDIT_REFERENCE_TEXT_MODULE_CONFIG, {});
});