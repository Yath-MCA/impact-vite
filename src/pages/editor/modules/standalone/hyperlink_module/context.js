debug.log("hyperLinkDialog");

/**
 * True when the node sits inside the role's restricted-by-elements selector
 * (USER_INFO.SELECTOR_RESTRICT from client config).
 * Missing / false / "null" / empty selector means not restricted.
 */
function isHyperlinkInRestrictedElement(element) {
    try {
        var selector = (typeof USER_INFO !== "undefined" && USER_INFO) ? USER_INFO.SELECTOR_RESTRICT : null;
        if (!selector || selector === false || selector === "null" || String(selector).trim() === "") {
            return false;
        }
        var node = null;
        if (element && element.$) {
            node = element.$;
        } else if (element && element.nodeType === 1) {
            node = element;
        } else if (element && typeof element.closest === "function") {
            node = element;
        }
        if (!node || typeof node.closest !== "function") {
            return false;
        }
        return !!node.closest(selector);
    } catch (err) {
        console.warn("isHyperlinkInRestrictedElement:", err && err.message);
        return false;
    }
}
window.isHyperlinkInRestrictedElement = isHyperlinkInRestrictedElement;

$(document).ready(function() {
    $('#applylinkmenu').on('click', async function(event) {
        event.preventDefault();
        GlobalEditor.execCommand("SHOW_LINK");
    });
});

// NEW CODE - integrated into module registration:
// The above is now handled by the uiEvents configuration in the module registration

// Initialize STATIC_MODULE and LINK_DIALOG config
if (!window.STATIC_MODULE) window.STATIC_MODULE = {};
Object.assign(window.STATIC_MODULE, {
    LINK_DIALOG: {
        CLASS_ARRAY: ['email', 'link', 'uri', 'ext-link', 'pub-id'],
        CLASS_FIND: 'span.uri,span.ext-link,span.email,span.pub-id',
        URL_PREFIXES: ['http://', 'https://', 'ftp://'],
        LINK_DOMAINS: ['.com', '.net', '.org', '.info', '.edu', '.gov', '.co'],
        LINK_TYPES: ['uri', 'doi', 'ftp', 'gen', 'orcid', 'pmcid', 'pmid', 'supplement_link'],
        RESTRICT_AREAS: [
            '.contrib-group', '.title-group', '.kwd-group', '.person-group',
            '.article-categories', '.subj-group', '.title', '.author-notes',
            'strong', 'em', 'sub', 'sup', 'sc'
        ]
    }
});

const HYPERLINK_MODULE_ID = 'hyperLinkDialog';
const HYPERLINK_MODULE_CONFIG = {
    name: 'HyperlinkModule',
    type: 'lazy',
    path: './hyperlink_module/index.js',
    templatePath: './hyperlink_module/template.html',
    dependencies: [],
    wrapping: true,
    supportingFiles: [{
        name: 'link_rules',
        type: 'onthefly',
        when: 'initLoop',
        path: './hyperlink_module/rules/link-rules.json',
        variable: 'HYPERLINK_LINK_RULES'
    }],

    group_name: 'linkGroup',
    groupOrder: 175,
    commands: [{
            name: 'SHOW_LINK',
            action: 'show_link',
            label: "Apply Link",
            icon: '../assets/images/svg/ContextMenu/Add.svg',
            order: 175,
            ignore_menu: true
        },
        {
            name: 'EDIT_RE_LINK',
            action: 'edit_re_link',
            label: "Edit Link",
            icon: '../assets/images/svg/ContextMenu/Add.svg',
            order: 176
        },
        {
            name: 'REMOVE_LINK',
            label: 'Remove Link',
            icon: '../assets/images/svg/ContextMenu/Delete.svg',
            action: 'remove',
            order: 177
        },
        {
            name: 'REMOVE_LINK_W_TEXT',
            label: 'Remove Link With Text',
            icon: '../assets/images/svg/ContextMenu/Delete.svg',
            action: 'removetxt',
            order: 177
        }
    ],
    onContentDomUpdate: function(editor, editable) {
        // Handle content DOM changes specific to this module
        console.log('Content updated for linkGroup module');
        // Re-scan for references, update internal state, etc.
        // Attach multiple event listeners
        // ! 3384855: Client Request - Single click open of URLs 12_MAY_2025 YA
        const eventName = 'click';
        editable.attachListener(editable, eventName, (evt) => {
            debug.log(`Event: ${eventName} triggered in from editor`);
            const eventType = evt.name;
            const element = evt.data.getTarget();
            const linkTypes = ['email', 'link', 'uri', 'ext-link', 'pub-id'];
            // Find the ancestor for applicable events
            if (['click'].includes(eventType)) {
                const ancestor = commonMethods.getAscent(element, '[data-name]', linkTypes);
                if (isHyperlinkInRestrictedElement(ancestor || element)) {
                    return;
                }
                var ancestorName = ancestor ? ancestor.getName() : null;
                var elementName = element.getName();

                if (ancestorName !== elementName) {
                    if (elementName === 'insert' && ancestor) {
                        handleLinkAction(ancestor);
                    } else {
                        debug.log('Mouseover ancestor:', ancestorName, 'Mouseover element:', elementName);
                    }
                } else {
                    handleLinkAction(ancestor);
                }
            }
        });
    },
    /**
     * Called on every selection change from UnifiedModuleSystem
     * Simple Option C: Close dialog if selection becomes invalid
     * @param {Object} editor - CKEditor instance
     * @param {Object} selection - CKEditor selection
     * @param {Object} elementPath - CKEditor elementPath
     */
    onSelectionChange: function(editor, selection, elementPath) {
        const hyperLinkDialog = window.hyperLinkDialog;
        if (!hyperLinkDialog || hyperLinkDialog.state !== 1) return;

        // Skip during confirmation flow
        if (hyperLinkDialog.isHTTPorEmail) return;

        // Only run validation to update lastValidation for context menu
        const validation = hyperLinkDialog.validateSelection(null, hyperLinkDialog.editMode);
        hyperLinkDialog.lastValidation = validation;

        // If selection is invalid for current mode, close dialog
        if (!validation.isValid) {
            hyperLinkDialog.closeDialog();
            hyperLinkDialog.resetDialog();
        }
    },
    executeCommand: async function(editor, item, moduleConfig, params) {
        console.log("Custom execution for:", item.name);
        const IMS = IMPACT_SELECTION;
        const {
            element,
            selection,
            elementPath
        } = params;

        if (item.action == "show_link") {
            window.hyperLinkDialog.show();
            return;
        }

        selection.selectElement(element);

        const attributesToRemove = {
            relink: ['data-link', 'old_href', 'data-time', 'data-username'],
            remove: ['href', 'xlink:href']
        };

        const ohref = element.getAttribute(element.hasAttribute('old_href') ? 'old_href' : 'xlink:href') || "";
        const IsSameUser = commonMethods.IS_SAME_USER_AND_ROLE(element);
        const canReLink = element.getAttributes()['data-link'] === "remove";
        const isRemove = item.action === 'remove';
        const isRemoveTxt = item.action === 'removetxt';

        if (canReLink || isRemove || isRemoveTxt) {

            var canAssignAttr = true;
            const isNew = element.getAttribute('data-link') == "new";
            const hrefVal = element.getAttribute('old_href');
            const key = isRemoveTxt ? "remove" : (isRemove ? "remove" : "relink");
            const removeAttr = attributesToRemove[key];
            const assignAttr = (isRemove || isRemoveTxt) ? {
                "data-link": isRemoveTxt ? "removetxt" : "remove",
                "old_href": ohref,
                "default": ["dt", "drn", "du"],
                "data-track-code": isRemoveTxt ? "link-04" : "link-03"
            } : {
                "xlink:href": hrefVal,
                "data-track-code": "link-02"
            };

            if (isRemove && isNew && IsSameUser) {
                canAssignAttr = false;

                // STEP 1 — find first ancestor with data-link (including self)
                var topLink = element.getAscendant(function(el) {
                    return el && el.hasAttribute && el.hasAttribute('data-link');
                    // include self
                }, true);

                // unwrap this element only (not ancestor)
                var domEl = topLink.$;
                var domElParent = domEl.parentNode;
                var children = Array.prototype.slice.call(domEl.childNodes);
                domEl.after.apply(domEl, children);
                domEl.remove();

                // STEP 2 — unwrap all nested spans with data-link
                var inner = domElParent.querySelectorAll('span[data-link]');
                for (var i = 0; i < inner.length; i++) {
                    var child = inner[i];
                    var kids = Array.prototype.slice.call(child.childNodes);
                    child.after.apply(child, kids);
                    child.remove();
                }
            }

            if (canAssignAttr) {
                commonMethods.SET_REMOVE_ATTR(element, assignAttr, removeAttr);
            }

            IMS._SNAPSHOT({
                save: true,
                unlock: true
            });
            GlobalEditor.focus();
        } else {
            window.hyperLinkDialog.show('edit');
        }

    },
    contextMenuHandler: function(element, selection, elementPath, editor, subItems) {
        debug.log("--hyperLinkDialog--");
        // Only show menu items when appropriate
        if (!element || !selection) return {};

        var link_Class_Arr = ['uri', 'email', 'ext-link'];
        var restrict_cls = ['history', 'permissions'];
        var linkName = element.getAttribute('data-name') || element.$.className;
        var isLink = link_Class_Arr.includes(linkName) && element.hasAttribute('xlink:href');

        var el = (elementPath.block != null) ? elementPath.block.$ : elementPath.blockLimit.$;

        // Disable for restricted cases
        var isEmailInCorresp = el.className.startsWith("corresp") && element.$.className === "email";
        var isRestrictMenu = restrict_cls.includes(elementPath.blockLimit.$.className);
        const attrs = element.getAttributes();
        const canReLink = attrs['data-link'] === "remove";
        if (isRestrictMenu) return {};
        if (isHyperlinkInRestrictedElement(element)) return {};
        if (!isLink && !canReLink) return {};

        // Attribute-based flags


        const isRemoveTxt = attrs['data-link'] === "removetxt";
        const isNew = !canReLink && !isRemoveTxt;

        const menuItem = editor.getMenuItem('EDIT_RE_LINK');
        if (menuItem && menuItem.label)
            menuItem.label = canReLink ? 'Re Link' : 'Edit Link';

        // ---- Menu state logic ----
        if (canReLink) {
            return {
                EDIT_RE_LINK: CKEDITOR.TRISTATE_OFF,
                REMOVE_LINK_W_TEXT: CKEDITOR.TRISTATE_OFF
            };
        } else if (isLink && !canReLink && !isRemoveTxt) {
            // Enable all
            return {
                EDIT_RE_LINK: CKEDITOR.TRISTATE_OFF,
                REMOVE_LINK: CKEDITOR.TRISTATE_OFF,
                REMOVE_LINK_W_TEXT: CKEDITOR.TRISTATE_OFF
            };
        } else return {};
    }
};

/**
 * Prefetch link-rules JSON (module may still be lazy).
 * Source: assets/{iVersion}/modules/hyperlink_module/rules/link-rules.json
 */
function prefetchHyperlinkLinkRules() {
    try {
        if (typeof window === 'undefined') return Promise.resolve(null);
        if (!window.ContextHelpers || typeof window.ContextHelpers.loadModuleResource !== 'function') {
            return Promise.resolve(null);
        }
        const file = HYPERLINK_MODULE_CONFIG.supportingFiles
            && HYPERLINK_MODULE_CONFIG.supportingFiles.find((f) => f && f.name === 'link_rules');
        if (!file) return Promise.resolve(null);
        return window.ContextHelpers.loadModuleResource(file).catch((err) => {
            console.warn('hyperlink link-rules prefetch failed:', err && err.message);
            return null;
        });
    } catch (err) {
        console.warn('hyperlink link-rules prefetch failed:', err && err.message);
        return Promise.resolve(null);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    prefetchHyperlinkLinkRules();
    ContextHelpers.registerOnReady(HYPERLINK_MODULE_ID, HYPERLINK_MODULE_CONFIG);
});

// Handle Link Action for Double Click
function handleLinkAction(element) {
    try {
        if (element) {
            const link = element.getAttribute('xlink:href');
            if (!link) return;
            const isMail = link.includes('@');

            // If the link doesn't include a protocol, add 'http://'
            const targetLink = !isMail && !link.includes('://') ? `http://${link}` : link;

            // Open mailto link if email, else open the regular link in a new window
            iOpenWindow(isMail ? `mailto:${targetLink}` : targetLink, '_blank');
        }
    } catch (err) {
        console.warn('Error in handleLinkAction:', err.message);
    }
}