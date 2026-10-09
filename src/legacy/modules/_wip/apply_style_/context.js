const APPLY_STYLE_MODULE_ID = 'ApplyStyleDialog';
const APPLY_STYLE_MODULE_CONFIG = {
    name: 'ApplyStyleModule',
    type: 'ondemand',
    path: './apply_style/index.js',
    templatePath: './apply_style/template.html',
    dependencies: [],
    wrapping: true,
    group_name: 'ApplyStyleDialog',
    groupOrder: 1160,
    commands: [],
    supportingFiles: [{
        name: 'style_rules',
        type: 'onthefly',
        when: 'initLoop',
        path: './apply_style/style-rules.json',
        variable: 'APPLY_STYLE_RULES'
    }, {
        name: 'messages',
        type: 'onthefly',
        when: 'initLoop',
        path: './apply_style/messages.json',
        variable: 'APPLY_STYLE_MESSAGES'
    }]
};

const openApplyStyleDialog = ContextHelpers.createDebouncedOpen(async () => {
    await ContextHelpers.openDialog(APPLY_STYLE_MODULE_ID, APPLY_STYLE_MODULE_CONFIG, 'APPLY_STYLE_MODULE');
});

window.openApplyStyleDialog = openApplyStyleDialog;

/**
 * Load ApplyStyleModule (ondemand) and keep window.APPLY_STYLE_MODULE.
 * Same pattern as other standalone contexts that call getModule from context.js.
 */
async function ensureApplyStyleModule() {
    try {
        if (window.APPLY_STYLE_MODULE && typeof window.APPLY_STYLE_MODULE.editorListener === 'function') {
            return window.APPLY_STYLE_MODULE;
        }
        if (typeof ContextHelpers === 'undefined' || !ContextHelpers.waitForModuleSystem) {
            return window.APPLY_STYLE_MODULE || null;
        }
        const ms = await ContextHelpers.waitForModuleSystem();
        const mod = await ms.getModule(APPLY_STYLE_MODULE_ID, {
            autoRegister: APPLY_STYLE_MODULE_CONFIG
        });
        if (mod) {
            window.APPLY_STYLE_MODULE = mod;
        }
        return mod || null;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('ensureApplyStyleModule', err.message);
        return window.APPLY_STYLE_MODULE || null;
    }
}

/**
 * Wire editorListener from context (peer pattern). Menu enable states use style-rules via module.
 */
function registerApplyStyleContextMenu() {
    if (typeof CKEDITOR === 'undefined') return;

    CKEDITOR.on('instanceReady', (ev) => {
        const editor = ev.editor;
        if (!editor || !editor.contextMenu) return;

        ensureApplyStyleModule().then((mod) => {
            if (mod && typeof mod.editorListener === 'function') {
                mod.editorListener(editor);
            }
        });

        editor.contextMenu.addListener(function(element, selection, elementPath) {
            try {
                const ed = (selection && selection.root && selection.root.editor) || editor;

                if (window.paraLock && typeof window.paraLock._isElementLocked === 'function') {
                    const isLocked = window.paraLock._isElementLocked(element, {
                        check_closest: true,
                        alertKey: 'ErrorLockedParaEdit'
                    });
                    if (isLocked) return {};
                }

                const mod = window.APPLY_STYLE_MODULE;
                if (!mod) {
                    // Kick load for next open; avoid empty first paint forever
                    ensureApplyStyleModule();
                    return {};
                }

                let showGroup = mod.M_CONFIG && mod.M_CONFIG.SHOW_CONTEXT_GROUP;
                if (!showGroup && typeof IsContextMenu === 'function') {
                    showGroup = IsContextMenu('headgroup');
                    if (mod.M_CONFIG) mod.M_CONFIG.SHOW_CONTEXT_GROUP = showGroup;
                }
                if (!showGroup) return {};
                if (typeof EDITOR_CURSOR === 'undefined' || !EDITOR_CURSOR.IS_HEAD_TITLE) return {};

                const node = element && element.$ ? element.$ : null;
                if (!node || typeof node.closest !== 'function') return {};

                // Labels + TRISTATE from style-rules.json (CTX_TITLE_SEC / headingLevelChange)
                if (typeof mod.buildHeadgroupMenuItems !== 'function' ||
                    typeof mod.getHeadgroupMenuState !== 'function') {
                    return {};
                }

                const menuMeta = mod.buildHeadgroupMenuItems(node);
                if (!menuMeta) return {};

                ed.addMenuItems(menuMeta.items);
                return menuMeta.states;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('registerApplyStyleContextMenu.listener', err.message);
                return {};
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    registerApplyStyleContextMenu();
    ContextHelpers.registerOnReady(APPLY_STYLE_MODULE_ID, APPLY_STYLE_MODULE_CONFIG);
});
