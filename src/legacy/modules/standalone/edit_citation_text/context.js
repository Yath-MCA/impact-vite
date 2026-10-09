const EDIT_CITATION_TEXT_MODULE_ID = 'editCitationTextDialog';

/**
 * Prefetch role config JSON for context menu (module may still be lazy).
 * Source of truth: assets/{iVersion}/modules/edit_citation_text/xref_role_config.json
 */
function prefetchEditCitationRoleConfig() {
    try {
        if (typeof window === 'undefined') return Promise.resolve(null);
        if (!window.ContextHelpers || typeof window.ContextHelpers.loadModuleResource !== 'function') {
            return Promise.resolve(null);
        }
        const roleConfig = EDIT_CITATION_TEXT_MODULE_CONFIG.supportingFiles
            .find((file) => file && file.name === 'role_configuration');
        if (!roleConfig) return Promise.resolve(null);

        return window.ContextHelpers.loadModuleResource(roleConfig)
            .catch((err) => {
                console.warn('editCiteText role config prefetch failed:', err && err.message);
                return null;
            });
    } catch (err) {
        console.warn('editCiteText role config prefetch failed:', err && err.message);
        return Promise.resolve(null);
    }
}

/**
 * Same gate as EditCitationTextModule.resolveRoleConfig (works before class load).
 * Fail closed until JSON is loaded onto window.EDIT_CITATION_TEXT_XREF_ROLE_CONFIG.
 * @returns {object|null}
 */
function resolveEditCitationRoleConfig(xref) {
    try {
        if (window.EditCitationTextModule &&
            typeof window.EditCitationTextModule.resolveRoleConfig === 'function') {
            return window.EditCitationTextModule.resolveRoleConfig(xref);
        }

        const el = xref && (xref.$ || xref);
        if (!el || el.nodeType !== 1) return null;
        if (el.hasAttribute && el.hasAttribute('data-remove')) return null;

        const map = window.EDIT_CITATION_TEXT_XREF_ROLE_CONFIG || {};
        if (!map || !Object.keys(map).length) return null;

        const roleKey = String(
            el.getAttribute('data-role') || el.getAttribute('ref-type') || ''
        ).trim();

        let hit = null;
        if (roleKey && map[roleKey]) {
            hit = {
                name: roleKey,
                cfg: map[roleKey]
            };
        }
        if (!hit) {
            const entries = Object.keys(map).map((name) => ({
                name,
                cfg: map[name]
            }));
            hit = entries.find((e) => {
                const sel = e.cfg && e.cfg.selector;
                if (!sel || typeof el.matches !== 'function') return false;
                return sel.split(',').some((part) => {
                    try {
                        return el.matches(part.trim());
                    } catch (err) {
                        return false;
                    }
                });
            });
        }
        if (!hit || !hit.cfg || !hit.cfg.enable) return null;

        const rid = String(el.getAttribute('rid') || '').trim();
        if (hit.cfg.requireSingleRid && /\s/.test(rid)) return null;

        return {
            role: hit.name,
            ...hit.cfg
        };
    } catch (err) {
        return null;
    }
}

const EDIT_CITATION_TEXT_MODULE_CONFIG = {
    name: 'EditCitationTextModule',
    type: 'lazy',
    path: './edit_citation_text/index.js',
    templatePath: './edit_citation_text/template.html',
    dependencies: [],
    supportingFiles: [{
        name: "role_configuration",
        type: "onthefly",
        when: "initLoop",
        path: "./edit_citation_text/xref_role_config.json",
        variable: "EDIT_CITATION_TEXT_XREF_ROLE_CONFIG"
    }, {
        name: "messages",
        type: "onthefly",
        when: "initLoop",
        path: "./edit_citation_text/messages.json",
        variable: "EDIT_CITATION_TEXT_MESSAGES"
    }],
    wrapping: true,
    group_name: 'citeGroup',
    groupOrder: 130,
    commands: [{
        name: 'editCiteText',
        action: 'edit_cite_text',
        label: 'Edit Citation Text',
        icon: '../assets/images/svg/ContextMenu/Edit.svg',
        order: 134,
        canShowValidation: {
            client_key: 'editCiteText'
        }
    }],
    executeCommand: async function(editor, item, moduleConfig, params) {
        try {
            const {
                element,
                selection
            } = params;
            if (!element) return;

            const xref = element.getAscendant ?
                element.getAscendant(function(el) {
                    return el && el.hasClass && el.hasClass('xref');
                }, true) :
                null;

            const target = xref || element;
            if (selection && target) {
                selection.selectElement(target);
            }

            const ensureInstance = async () => {
                if (window[EDIT_CITATION_TEXT_MODULE_ID] &&
                    typeof window[EDIT_CITATION_TEXT_MODULE_ID].show === 'function') {
                    return window[EDIT_CITATION_TEXT_MODULE_ID];
                }
                const ms = await ContextHelpers.waitForModuleSystem();
                const mod = await ms.getModule(EDIT_CITATION_TEXT_MODULE_ID, {
                    autoRegister: EDIT_CITATION_TEXT_MODULE_CONFIG
                });
                window[EDIT_CITATION_TEXT_MODULE_ID] = mod;
                return mod;
            };

            await prefetchEditCitationRoleConfig();
            const dialog = await ensureInstance();
            if (!dialog || typeof dialog.show !== 'function') return;

            await dialog.show('edit', target);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('editCiteText.executeCommand', err.message);
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

            const xref = element.getAscendant ?
                element.getAscendant(function(el) {
                    return el && el.hasClass && el.hasClass('xref');
                }, true) :
                null;

            if (!xref) return {};

            const roleCfg = resolveEditCitationRoleConfig(xref);
            if (!roleCfg) return {};

            const cmd = {
                editCiteText: CKEDITOR.TRISTATE_OFF
            };
            if (roleCfg.menuLabel && subItems && typeof subItems === 'object') {
                try {
                    if (EDIT_CITATION_TEXT_MODULE_CONFIG.commands && EDIT_CITATION_TEXT_MODULE_CONFIG.commands[0]) {
                        EDIT_CITATION_TEXT_MODULE_CONFIG.commands[0].label = roleCfg.menuLabel;
                    }
                } catch (labelErr) {
                    /* ignore */
                }
            }
            return cmd;
        } catch (err) {
            console.warn(err.message);
            return {};
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    prefetchEditCitationRoleConfig();
    ContextHelpers.registerOnReady(EDIT_CITATION_TEXT_MODULE_ID, EDIT_CITATION_TEXT_MODULE_CONFIG, {
        isBooksOnly: true
    });
});