const REFERENCE_MODULE_ID = 'referenceDialog';

const REFERENCE_SUPPORTING_FILES = [{
        name: 'messages',
        type: 'onthefly',
        when: 'initLoop',
        path: './reference/messages.json',
        variable: 'REFERENCE_MESSAGES'
    },
    {
        name: 'journal_abbr_bank',
        type: 'onthefly',
        when: 'initLoop',
        path: '/../meta/abbr.json',
        variable: 'REFERENCE_ABBR_BANK'
    }
];

if (typeof window !== 'undefined') {
    window.REFERENCE_SUPPORTING_FILES = REFERENCE_SUPPORTING_FILES;
}



// Prefers the shared Debounce_Event helper when present; falls back to a local debounce so this module works standalone
function resolveDebounce(fn, wait) {
    debug.log('context:resolveDebounce');
    if (typeof Debounce_Event === 'function') {
        return Debounce_Event(fn, wait);
    }
    let timer = null;
    return function debounced() {
        const args = arguments;
        const ctx = this;
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(ctx, args), wait || 900);
    };
}
async function handle_Delete_Ref(editor, TARGET) {
    const ID = TARGET.getId();
    const cur_seq = CHECK_ORDER.FIRE_ONCE(editor, {});
    const citeMissingBool = cur_seq.unlinkedRef.length > 0;
    const label = parseInt(ID.replace(/[^\d.]/g, "")).toString();
    const citeMissString = citeMissingBool ? cur_seq.unlinkedRef.filter(item => item !== label).join(",") : "";
    const IsLast = CitationNewModule['M_FUN'].CheckRefIsLast([ID]);

    const myConfirm = await IMPACT_ALERT('refdel001', {
        s_text: (IsLast || iREF_SCOPE.IS_NAME_DATE) ? 'text' : (citeMissingBool ? 'cite_miss' : 're_num'),
        miss_cite: citeMissString
    });

    if (myConfirm) {
        DEL_REF_FIRE(ID, {
            DIRECT_DEL: true
        });
    }
};

function normalizeToken(str) {
    return String(str || "")
        .replace(/\s+/g, " ") // collapse spaces
        .replace(/^[\s.,;:'"‘’“”]+|[\s.,;:'"‘’“”]+$/g, "") // strip punctuation + quotes
        .trim()
        .toLowerCase();
}

function fromCustomDelim() {
    try {
        const defaults = REFERENCE_MESSAGES && REFERENCE_MESSAGES.free_text && REFERENCE_MESSAGES.free_text.default || [];
        return new Set(defaults.map(normalizeToken));
    } catch (err) {
        console.warn("REFERENCE_MESSAGES.free_text.default not available:", err.message);
        return new Set();
    }
}

function collectedCEGValues(mixed) {
    const known = new Set();
    try {
        const styleDoc = (typeof iREF_SCOPE !== "undefined" && iREF_SCOPE.DOC) || (mixed && mixed.ownerDocument);
        if (styleDoc && styleDoc.querySelectorAll) {
            styleDoc.querySelectorAll("element[delim], element[last]").forEach(el => {
                ["delim", "last"].forEach(attr => {
                    const raw = el.getAttribute(attr) || "";
                    const text = normalizeToken(raw);
                    if (text) known.add(text);
                });
            });
        }
    } catch (err) {
        console.warn(err.message);
    }
    return known;
}

window.REFERENCE_CEG_DELIM_VALUE = new Set();

function citationHasUnmanagedText(mixed) {
    if (!mixed || !mixed.querySelector) return false;
    if (mixed.querySelector("comment")) return true;

    if (window.REFERENCE_CEG_DELIM_VALUE.size === 0) {
        window.REFERENCE_CEG_DELIM_VALUE = collectedCEGValues(mixed);
    }

    const defaultDelimValue = fromCustomDelim();
    const combinedValue = new Set([...window.REFERENCE_CEG_DELIM_VALUE, ...defaultDelimValue]);

    const children = mixed.childNodes ? Array.from(mixed.childNodes) : [];
    const results = new Set();

    for (const node of children) {
        if (!node || node.nodeType !== 3) continue;

        const raw = String(node.nodeValue || "").replace(/\s+/g, " ").trim().toLowerCase();
        if (!raw || !/[a-z]/i.test(raw)) continue;

        const stripped = normalizeToken(raw);
        if (!combinedValue.has(stripped)) {
            results.add(stripped);
        }
    }

    if (results.size > 0) {
        console.log("Unmanaged text collected:", Array.from(results));
    }

    return Array.from(results);
}



// Keep in sync with context_edit_guard.js (this file cannot static-import; gulp concatenates it).
function findDuplicateSpanClasses(rootElem) {
    if (!rootElem || !rootElem.querySelectorAll) return [];

    const selectors = [
        ".mixed-citation",
        ".source",
        ".volume",
        ".publisher-loc",
        ".publisher-name",
        ".year",
        ".collab",
        ".article-title",
        ".fpage",
        ".lpage",
        ".issue",
        ".chapter-title",
        ".ext-link",
        ".edition",
        ".etal",
        ".pub-id",
        ".uri",
        `[person-group-type="author"]`,
        `[person-group-type="editor"]`,
    ];

    const duplicates = [];

    selectors.forEach(sel => {
        const count = rootElem.querySelectorAll(sel).length;
        if (count > 1) {
            duplicates.push(sel);
        }
    });

    return duplicates;
}

function resolveReferenceEditBlockReason({
    duplicates = [],
    unmanagedText = false,
    isPlaintext = false,
    pubType = '',
    allowedTypes = []
} = {}) {
    if (isPlaintext) return 'Edit Ref Menu unavailable: present/plain reference is not structured.';
    if (duplicates.length) {
        return `Edit Ref Menu unavailable: duplicate elements (${duplicates.join(', ')}).`;
    }
    if (unmanagedText) {
        return 'Edit Ref Menu unavailable: reference contains free text against Config xml.';
    }
    if (pubType && allowedTypes.indexOf(pubType) === -1) {
        return `Edit Ref Menu unavailable: publication type "${pubType}" is not allowed.`;
    }
    return null;
}

function resolveMixedCitationFromTarget(target, mixedGroup) {
    if (mixedGroup && mixedGroup.querySelector) return mixedGroup;
    if (!target) return null;
    if (target.matches && target.matches('.mixed-citation')) return target;
    if (target.closest) {
        const up = target.closest('.mixed-citation');
        if (up) return up;
        const ref = target.closest('.ref');
        if (ref && ref.querySelector) return ref.querySelector('.mixed-citation');
    }
    return target.querySelector ? target.querySelector('.mixed-citation') : null;
}

function insertMethodFromTarget(target) {
    const ref = target && target.closest ? target.closest('.ref') : null;
    const node = ref || target;
    return node && node.getAttribute ? (node.getAttribute('data-ins-type') || '') : '';
}

// Matches ref_bridge's resolveSourcePolicy() CMS18 check exactly -- this is the single place
// that decides whether the new reference module (vs. legacy MultiRefModule) should own a given
// book/ed-book reference.
function isCms18RefStyle(sharedKey) {
    const key = sharedKey || {};
    return String(key.refstyle || '').toLowerCase().replace(/\s+/g, '') === 'cms18';
}

// The new reference module only owns CMS18 book/ed-book references for now -- journals stay on
// the legacy MultiRefModule (ref_form) until migrated, so "journal" is deliberately never a
// default here (mirrors the opposite exclusion in ref_form/index.js's MultiRefModule.initLoop).
function resolveReferenceAllowedTypes(sharedKey, existingAllowedTypes) {
    const allowedTypes = Array.isArray(existingAllowedTypes) ? existingAllowedTypes.slice() : [];
    if (isCms18RefStyle(sharedKey)) {
        allowedTypes.push('book', 'ed-book', 'journal');
    }
    return allowedTypes;
}

function shouldOfferEditReference(input) {
    const opts = input || {};
    const insertMethod = opts.insertMethod || '';
    const pubType = String(opts.pubType || '');
    const allowedTypes = opts.allowedTypes || [];
    if (opts.hasDuplicates) return false;
    if (opts.isDelete || opts.isPlaintext || insertMethod === 'plain_text') return false;
    if (!opts.hasLeaf) return false;
    if (!pubType || allowedTypes.indexOf(pubType) === -1) return false;
    if (insertMethod === 'doi_form' || insertMethod === 'open_form') return true;
    return !opts.unmanagedText;
}

function notifyReferenceEditBlocked(reason) {
    if (!reason) return;
    const roleId = (typeof USER_INFO !== 'undefined' && USER_INFO && USER_INFO.ROLE_ID) || '';
    const collatorId = (typeof ROLE_IDS !== 'undefined' && ROLE_IDS && ROLE_IDS.CO) || '';
    const isCollator = collatorId && roleId === collatorId;
    if (isCollator) {
        /* 
        if(typeof AlertNewDialog !== 'undefined' && AlertNewDialog && typeof AlertNewDialog.fire === 'function'){
            AlertNewDialog.fire('warning', 'Warning', reason, 'OK', '', false, {
                override: true
            });
        }       
         */
        window.TOASTER_ALERT('ref_context_warning', {
            type: 'warning',
            text: reason
        });
        return;
    }
    console.warn(reason);
}

const REFERENCE_MODULE_CONFIG = {
    name: 'ReferenceModule',
    type: 'lazy',
    path: './reference/index.js',
    templatePath: 'reference/template.html',
    dependencies: [],
    supportingFiles: REFERENCE_SUPPORTING_FILES,
    wrapping: true,
    group_name: 'ReferenceGroup',
    groupOrder: 200,
    commands: [{
            name: 'REFERENCE_FORM_QRY',
            ignore_menu: true,
            action: 'query',
            label: 'Reference',
            icon: '../assets/images/svg/ContextMenu/Search.svg',
            order: 200
        },
        {
            name: 'REFERENCE_GOTO_CITE',
            action: 'gotoCite',
            label: 'Goto Citation',
            icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
            order: 201
        },
        {
            name: 'REFERENCE_FORM_OPEN',
            action: 'open',
            label: function referenceOpenLabel() {
                const suffix = (typeof iREF_SCOPE !== 'undefined' && iREF_SCOPE.IS_NAME_DATE) ? ' After' : '';
                return `Insert Reference${suffix}`;
            },
            icon: '../assets/images/svg/ContextMenu/Add.svg',
            order: 202
        },
        {
            name: 'REFERENCE_FORM_EDIT',
            action: 'edit',
            label: 'Edit Reference',
            icon: '../assets/images/svg/ContextMenu/Edit.svg',
            order: 203
        },
        {
            name: 'REFERENCE_DEL_ITEM',
            action: 'deleteRef',
            label: 'Delete Reference',
            icon: '../assets/images/svg/ContextMenu/Delete.svg',
            order: 204
        }
    ],
    executeCommand: async function executeReferenceCommand(editor, item, moduleConfig, params = {}) {
        debug.log('context:executeReferenceCommand');
        try {
            if (item.action === 'gotoCite') {
                const IMS = IMPACT_SELECTION;
                const TARGET = getTarget(editor, IMS);
                if (TARGET && typeof CITATION_POPUP !== 'undefined' && CITATION_POPUP) {
                    window.CITATION_POPUP.GotoCite(TARGET);
                }
                return;
            }

            if (item.action === 'deleteRef') {
                const IMS = IMPACT_SELECTION;
                const TARGET = getTarget(editor, IMS);
                if (TARGET) await handle_Delete_Ref(editor, TARGET);
                return;
            }

            const ensureInstance = async () => {
                if (window[REFERENCE_MODULE_ID] && typeof window[REFERENCE_MODULE_ID].show === 'function') {
                    return window[REFERENCE_MODULE_ID];
                }
                const ms = await ContextHelpers.waitForModuleSystem();
                const mod = await ms.getModule(REFERENCE_MODULE_ID, {
                    autoRegister: REFERENCE_MODULE_CONFIG
                });
                window[REFERENCE_MODULE_ID] = mod;
                return mod;
            };
            const dialog = await ensureInstance();
            const selectionNode = params.element || (typeof CommonUtils !== 'undefined' && CommonUtils.handleSelectionAndNode ?
                CommonUtils.handleSelectionAndNode(editor) : null);
            const id = typeof CommonUtils !== 'undefined' && CommonUtils.getNodeId ?
                CommonUtils.getNodeId(selectionNode) : (selectionNode && selectionNode.id);

            await dialog.show(item.action, {
                id,
                element: selectionNode,
                queryNode: params.queryNode || params.query || null
            });
        } catch (err) {
            console.warn(err.message);
            if (typeof referenceLogError === 'function') {
                referenceLogError('referenceDialog.executeCommand', err);
            } else if (typeof ErrorLogTrace === 'function') {
                ErrorLogTrace('referenceDialog.executeCommand', err.message);
            }
        }
    },
    contextMenuHandler: function referenceContextMenu(element, selection, elementPath, editor) {
        debug.log('context:referenceContextMenu');
        try {
            let MenuReturn = {};
            var IMS = IMPACT_SELECTION;

            var contextData = getSectionData(element, selection, elementPath, editor);
            var {
                mixedGroup,
                Count,
                editedBook,
                pubType,
                isPlaintext,
                isRefGroup,
                isDelete,
                isNotAllowed,
                target
            } = contextData;


            // ---------------------------------------------------------
            // ✔ Detect duplicate classes under target
            // ---------------------------------------------------------
            const haveDuplicateElemnts = findDuplicateSpanClasses(target);

            console.warn("Duplicate Elements Detected:", haveDuplicateElemnts);
            // ---------------------------------------------------------
            // ✔ Original logic starts here
            // ---------------------------------------------------------

            var allowedTypes = [];
            var isPlos = commonMethods.getClientCode({
                format: "upper"
            }) == "PLOS";

            if (typeof referenceDialog !== "undefined") {
                if (referenceDialog && referenceDialog.initiated == false) {
                    referenceDialog.init();
                }
                if (referenceDialog.M_CONFIG && referenceDialog.M_CONFIG.ALLOWED_TYPE) {
                    allowedTypes = referenceDialog.M_CONFIG.ALLOWED_TYPE;
                }
            }

            allowedTypes = resolveReferenceAllowedTypes(SHARED_KEY, allowedTypes);


            mixedGroup = resolveMixedCitationFromTarget(target, mixedGroup);
            var insertMethod = insertMethodFromTarget(target);
            if (mixedGroup && mixedGroup.getAttribute) {
                pubType = mixedGroup.getAttribute('publication-type') || pubType;
            }
            isPlaintext = isPlaintext || insertMethod === 'plain_text';

            if ((isRefGroup || IMS.IsRefGroup) && mixedGroup && !isNotAllowed) {

                MenuReturn.REFERENCE_FORM_OPEN = CKEDITOR.TRISTATE_OFF;

                if (!isDelete) {
                    MenuReturn.REFERENCE_GOTO_CITE = CKEDITOR.TRISTATE_OFF;
                    MenuReturn.REFERENCE_DEL_ITEM = CKEDITOR.TRISTATE_OFF;
                } else if (isDelete) {
                    MenuReturn.ADD_NEW_CMD = CKEDITOR.TRISTATE_OFF;
                }

                var results = citationHasUnmanagedText(mixedGroup) || [];
                var unmanagedText = results.length > 0;
                var structuredInsert = insertMethod === 'doi_form' || insertMethod === 'open_form';
                var hasLeaf = !!(mixedGroup.querySelector && mixedGroup.querySelector('.year, .article-title, .source, .person-group, .volume, .fpage, .publisher-name, .chapter-title'));
                var demoPurpose = /book/gi.test(pubType) && isPlos && !IS_LIVE_DOMAIN;
                var typesForEdit = allowedTypes.slice();

                if (demoPurpose && typesForEdit.indexOf(pubType) === -1) typesForEdit.push(pubType);
                const allowEdit = shouldOfferEditReference({
                    insertMethod: insertMethod,
                    pubType: pubType,
                    allowedTypes: typesForEdit,
                    hasLeaf: hasLeaf,
                    isPlaintext: isPlaintext,
                    isDelete: isDelete,
                    unmanagedText: unmanagedText,
                    hasDuplicates: haveDuplicateElemnts.length > 0
                });

                if (Count > 0 && allowEdit) {
                    MenuReturn.REFERENCE_FORM_EDIT = CKEDITOR.TRISTATE_OFF;
                }
                if (structuredInsert) unmanagedText = false;

                if (!isDelete && Count > 0) {
                    const editBlockedReason = resolveReferenceEditBlockReason({
                        duplicates: !allowEdit ? haveDuplicateElemnts : [],
                        unmanagedText,
                        isPlaintext,
                        pubType,
                        allowedTypes
                    });
                    if (editBlockedReason) notifyReferenceEditBlocked(editBlockedReason);
                }

                // Collaboration lock rules
                const collabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);

                let lockedInfo = {
                    byOthers: [],
                    total: 0
                };

                if (collabEnabled && window.paraLock && window.paraLock.getLockedElementsByOthers) {
                    lockedInfo = window.paraLock.getLockedElementsByOthers();
                    if (lockedInfo.byOthers.length > 0) {
                        if (iREF_SCOPE.IS_NAME_DATE) {
                            ["REFERENCE_DEL_ITEM ", "REFERENCE_FORM_OPEN "].forEach(key => {
                                if (MenuReturn[key]) delete MenuReturn[key];
                            });
                        }
                    }
                }
                return MenuReturn;
            }
            return MenuReturn;
        } catch (err) {
            console.warn(err.message);
            return {};
        }
    }
};

$(document).ready(function() {
    $('#insertRefmenu').on('click', async function(event) {
        event.preventDefault();
        if (!IS_JOURNAL && SHARED_KEY.refstyle && ['CMS18', 'CMS 18'].includes(SHARED_KEY.refstyle)) {
            if (typeof GlobalEditor !== 'undefined' && GlobalEditor.execCommand) {
                GlobalEditor.execCommand('REFERENCE_FORM_OPEN');
                return;
            }
            const ms = await ContextHelpers.waitForModuleSystem();
            const mod = window[REFERENCE_MODULE_ID] || await ms.getModule(REFERENCE_MODULE_ID, {
                autoRegister: REFERENCE_MODULE_CONFIG
            });
            window[REFERENCE_MODULE_ID] = mod;
            if (mod && typeof mod.show === 'function') {
                await mod.show('open', {});
            }
        }

    });
});

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(REFERENCE_MODULE_ID, REFERENCE_MODULE_CONFIG, {
        isCms18Only: true
    });
    debug.log(`${REFERENCE_MODULE_ID} registered`);

});