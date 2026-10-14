/**
 * QcValidationCore — shared Internal Validation logic (no dialog lifecycle).
 * Messages bag loads via supportingFiles → window.QC_VALIDATION_MESSAGES (no JSON import).
 */
class QcValidationCore {
    constructor() {
        this._Id = this._id = 'qualityCheckerDialog';

        this.canUnmountComponentWhileClose = true;

        this.Initiated = false;
        this.FullyLoaded = false;
        this.Showed = false;
        this.CAN_INIT_DEFAULT = true;
        this.process_items_list = [];
        this.process_items_by_tab = {
            missing_citation: [],
            dtd_error: [],
            text_related: [],
            citation_order: [],
            comments_queries: []
        };
        this.QC_TABS = ['missing_citation', 'citation_order', 'dtd_error', 'text_related', 'comments_queries'];
        this.QC_ISSUE_TABS = ['missing_citation', 'dtd_error', 'text_related', 'citation_order', 'comments_queries'];
        /** Review-path order for scroll sync auto-advance (no wrap). */
        this.QC_REVIEW_ORDER = ['missing_citation', 'citation_order', 'dtd_error', 'text_related', 'comments_queries'];
        /** Last active review-path key; survives close/unmount so reopen can restore. */
        this._lastQcReviewTab = null;
        this._qcTabState = {};
        this._qcScrollAdvanceCooldown = false;
        this._qcScrollAdvanceProgrammatic = false;
        /** Arrival-edge latch after a sync switch: 'top' | 'bottom' | null */
        this._qcScrollSyncLatch = null;
        /**
         * Messages bag: resolved by getModuleMessages from supportingFiles
         * name `messages` → window.QC_VALIDATION_MESSAGES (or this._moduleMessages if set).
         */
        this._moduleMessages = null;
        this.duplicate_items_list = [];
        this.available_citation_list = [];
        this.last_remark_response = [];
        this.templateList = {};
        this.SELECTOR = [{
                "Affiliation / Corresponding": {
                    selector: ".article-meta div.aff,.article-meta div.corresp, .article-meta div.fn",
                    mandatory_class_list: ["aff", "fn", "corresp"],
                    ignore: {
                        "closest": ["[contrib-type='editor']"]
                    },
                    row_id: "ag_01",
                    col_id: "ag_col_02",
                    process: "citation_checking",
                    tab: "missing_citation",
                    check_duplicate_ids: true
                }
            },
            {
                Figures: {
                    selector: 'div.body div[class="fig"][position="float"]:not([data-remove])',
                    mandatory_class_list: ["fig"],
                    row_id: "fg_01",
                    col_id: "fg_col_02",
                    process: "citation_checking",
                    tab: "missing_citation",
                    check_duplicate_ids: true
                }
            },
            {
                Tables: {
                    selector: 'div.body div[class="table-wrap"][position="float"]:not([data-remove])',
                    mandatory_class_list: ["table-wrap"],
                    row_id: "tg_01",
                    col_id: "tg_col_02",
                    process: "citation_checking",
                    tab: "missing_citation",
                    check_duplicate_ids: true
                }
            },
            {
                References: {
                    selector: "div.ref:not([data-remove])",
                    mandatory_class_list: ["ref"],
                    row_id: "rg_01",
                    col_id: "rg_col_02",
                    process: "citation_checking",
                    tab: "missing_citation",
                    check_duplicate_ids: true,
                    ignore: {
                        // Triggers custom logic
                        "closest": ["Bibliography"]
                    }
                }
            },
            {
                "Table Footnotes": {
                    selector: 'div.table-wrap-foot div.fn[data-label]:not([data-remove]):not([data-delete])',
                    mandatory_class_list: ["fn"],
                    row_id: "tbl_fn_01",
                    col_id: "tbl_fn_col_02",
                    process: "citation_checking",
                    tab: "missing_citation",
                    check_duplicate_ids: true
                }
            },
            {
                "Foot/End Notes": {
                    selector: "div.fn-group div.fn:not([data-remove])",
                    mandatory_class_list: ["fn"],
                    row_id: "fn_en_01",
                    col_id: "fn_en_col_02",
                    process: "citation_checking",
                    tab: "missing_citation",
                    check_duplicate_ids: true,
                    ignore: {
                        "textContent": ["How to cite this article", "How to cite this chapter", "How to cite this book"]
                    }
                }
            },
            {
                "Verify Duplicate Ids": {
                    selector: ".p,.ref:not([data-remove])",
                    mandatory_class_list: ["p", 'ref'],
                    row_id: "rg_02",
                    col_id: "rg_col_03",
                    process: "duplicate_ids",
                    tab: "dtd_error"
                }
            },
            {
                "Broken Xref Targets": {
                    selector: "a.xref[rid]:not([data-remove]):not([data-delete])",
                    mandatory_class_list: ["xref"],
                    row_id: "xref_broken_01",
                    col_id: "xref_broken_col_01",
                    process: "xref_destination",
                    tab: "dtd_error"
                }
            },
            {
                "Unused Destinations": {
                    selector: 'div.fig[position="float"]:not([data-remove]),div.table-wrap[position="float"]:not([data-remove]),div.ref:not([data-remove]),div.fn-group div.fn:not([data-remove]),div.table-wrap-foot div.fn[data-label]:not([data-remove])',
                    mandatory_class_list: ["fig", "table-wrap", "ref", "fn"],
                    row_id: "xref_unused_01",
                    col_id: "xref_unused_col_01",
                    process: "unused_destination",
                    tab: "dtd_error",
                    ignore: {
                        "closest": ["Bibliography"],
                        "textContent": ["How to cite this article", "How to cite this chapter", "How to cite this book"]
                    }
                }
            },
            {
                "Double Spaces in Tags": {
                    selector: "insert.ice-ins:not([data-remove]), del.ice-del:not([data-remove])",
                    mandatory_class_list: ["ice-ins", "ice-del"],
                    row_id: "ds_01",
                    col_id: "ds_col_02",
                    process: "double_space",
                    tab: "text_related"
                }
            },
            {
                "Reference Citations": {
                    selector: 'a.xref[data-role="bibr"]:not([data-remove]):not([data-delete])',
                    mandatory_class_list: ["xref"],
                    row_id: "cite_ord_bibr_01",
                    col_id: "cite_ord_bibr_col_01",
                    process: "citation_order_bibr",
                    tab: "citation_order"
                }
            },
            {
                "Foot/End Notes": {
                    selector: 'a.xref[data-role="fn"]:not([data-remove]):not([data-delete]),a.xref[data-role="en"]:not([data-remove]):not([data-delete]),a.xref[data-role="endnote"]:not([data-remove]):not([data-delete]),a.xref[data-role="end-note"]:not([data-remove]):not([data-delete]),a.xref[data-role="endNotes"]:not([data-remove]):not([data-delete])',
                    mandatory_class_list: ["xref"],
                    row_id: "cite_ord_notes_01",
                    col_id: "cite_ord_notes_col_01",
                    process: "citation_order_notes",
                    tab: "citation_order"
                }
            },
            {
                "Collation pending": {
                    selector: '[data-class="ckcommentsfull"][data-collation-status]',
                    mandatory_class_list: ["ckcommentsfull"],
                    row_id: "collation_pending_01",
                    col_id: "collation_pending_col_01",
                    process: "collation_pending",
                    tab: "comments_queries"
                }
            },
            /*, {
                "Equations": {
                    selector: `div.disp-formula span.label:not([track-lab-type="remove"]`,
                    mandatory_class_list: ["disp-formula"],
                    row_id: "eg_01",
                    col_id: "eg_col_02"
                }
            } , {
                "Boxes": {
                    selector: ".boxed-text span.label",
                    mandatory_class_list: ["boxed-text"],
                    row_id: "bg_01",
                    col_id: "bg_col_02"
                }
            }, {
                "Sections": {
                    _selector: `div.sec[data-levels]:not([sec-type="Back_Matter"],[sec-type="supplementary-material"])`,
                    selector: `div.dummyclass`,
                    mandatory_class_list: [],
                    row_id: "sg_01",
                    col_id: "sg_col_02"
                }
            } */
        ];
        this._bindQcMethods();
    }

    _bindQcMethods() {
        let proto = Object.getPrototypeOf(this);
        while (proto && proto !== Object.prototype) {
            Object.getOwnPropertyNames(proto).forEach((key) => {
                if (key !== 'constructor' && typeof this[key] === 'function' && !Object.prototype.hasOwnProperty.call(this, key)) {
                    this[key] = this[key].bind(this);
                }
            });
            proto = Object.getPrototypeOf(proto);
        }
    }

    showBefore() {
        return true;
    }

    initIntervalTimer() {
        const interValTimer = setInterval(() => {
            if (typeof FinalizeDialog !== 'undefined') {
                if (typeof FinalizeDialog.TRIGGER != "undefined" && FinalizeDialog.TRIGGER.nodeType == 1) {
                    FinalizeDialog.TRIGGER.setAttribute("onclick", "openQcValidationDialog()");
                    clearInterval(interValTimer);
                }
            }
        }, 1000);
    }

    logError(functionName, error) {
        console.warn(`Error in ${functionName}: ${error.message}`);
        ErrorLogTrace(`QcValidationCore.${functionName}`, error.message);
    }

    /**
     * Thin BaseModule message API wrappers for Track (Core without subclassing).
     * Call sites keep qc* names; implementation lives on BaseModule.
     */
    getModuleLangCode() {
        return BaseModule.prototype.getModuleLangCode.call(this);
    }

    getModuleMessages() {
        return BaseModule.prototype.getModuleMessages.call(this);
    }

    getModuleSupportingFiles() {
        return BaseModule.prototype.getModuleSupportingFiles.call(this);
    }

    resolveMsgPath(obj, path) {
        return BaseModule.prototype.resolveMsgPath.call(this, obj, path);
    }

    getLangBag(lang) {
        return BaseModule.prototype.getLangBag.call(this, lang);
    }

    getModuleLangOverride(path) {
        return BaseModule.prototype.getModuleLangOverride.call(this, path);
    }

    moduleMsg(path, vars, fallback) {
        return BaseModule.prototype.moduleMsg.call(this, path, vars, fallback);
    }

    moduleSectionTitle(title) {
        return BaseModule.prototype.moduleSectionTitle.call(this, title);
    }

    isLabelSuppliedByGlobal(key) {
        return BaseModule.prototype.isLabelSuppliedByGlobal.call(this, key);
    }

    applyMessagesJsonLabels(options) {
        return BaseModule.prototype.applyMessagesJsonLabels.call(this, options);
    }

    /** @deprecated use getModuleLangCode — QC compatibility alias */
    getQcLangCode() {
        return this.getModuleLangCode();
    }

    /** @deprecated use getLangBag — QC compatibility alias */
    getQcMessages(lang) {
        return this.getLangBag(lang);
    }

    /** @deprecated use resolveMsgPath — QC compatibility alias */
    resolveQcMsgPath(obj, path) {
        return this.resolveMsgPath(obj, path);
    }

    /** @deprecated use getModuleLangOverride — QC compatibility alias */
    getQcLangOverride(path) {
        return this.getModuleLangOverride(path);
    }

    /** @deprecated use isLabelSuppliedByGlobal — QC compatibility alias */
    isQcLabelSuppliedByGlobal(key) {
        return this.isLabelSuppliedByGlobal(key);
    }

    /**
     * Lookup message (compat): delegates to BaseModule.moduleMsg.
     * @param {string} path
     * @param {object} [vars]
     * @param {string} [fallback]
     * @returns {string}
     */
    qcMsg(path, vars = {}, fallback) {
        return this.moduleMsg(path, vars, fallback);
    }

    /** SELECTOR section title — delegates to BaseModule.moduleSectionTitle. */
    qcSectionTitle(title) {
        return this.moduleSectionTitle(title);
    }

    /**
     * Apply labels.* / data-lang-lab chrome — delegates to BaseModule.applyMessagesJsonLabels.
     * @param {object} [options]
     */
    applyQcStaticLabels(options = {}) {
        return this.applyMessagesJsonLabels(options);
    }

    /**
     * Track / Core: language-bag labels only (no IMPACT.lang first pass).
     * Editor QcValidationModule overrides to bridge BaseModule.setAllLabels.
     */
    setAllLabels(options = {}) {
        this.applyQcStaticLabels(options);
    }

    similar(str1, str2) {
        try {
            const minLength = Math.min(str1.length, str2.length);
            const maxLength = Math.max(str1.length, str2.length);
            let matchCount = 0;

            for (let i = 0; i < minLength; i++) {
                if (str1[i] === str2[i]) matchCount++;
            }

            return (matchCount / maxLength * 100).toFixed(2) + '%';
        } catch (err) {
            this.logError('similar', err);
        }
    }

    similarity(str1, str2) {
        try {
            const [longer, shorter] = str1.length >= str2.length ? [str1, str2] : [str2, str1];
            const longerLength = longer.length;
            if (longerLength === 0) return 1.0;
            return (longerLength - this.editDistance(longer, shorter)) / parseFloat(longerLength);
        } catch (err) {
            this.logError('similarity', err);
        }
    }

    editDistance(s1, s2) {
        try {
            s1 = s1.toLowerCase();
            s2 = s2.toLowerCase();
            const costs = [];

            for (let i = 0; i <= s1.length; i++) {
                let lastValue = i;
                for (let j = 0; j <= s2.length; j++) {
                    if (i === 0) {
                        costs[j] = j;
                    } else if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        }
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
                if (i > 0) costs[s2.length] = lastValue;
            }
            return costs[s2.length];
        } catch (err) {
            this.logError('editDistance', err);
        }
    }

    // Common utility functions
    getElementSibling(element, direction = 'next') {
        try {
            const siblingProperty = direction === 'next' ? 'nextSibling' : 'previousSibling';
            let node = element.$[siblingProperty];

            while (node) {
                // Skip text nodes and comments - only return element nodes
                // Element node
                if (node.nodeType === 1) {
                    return new CKEDITOR.dom.element(node);
                }
                node = node[siblingProperty];
            }
            return null;
        } catch (e) {
            this.logError(`getElementSibling - ${direction}`, e);
            return null;
        }
    }

    // Convenience wrapper methods for backward compatibility
    getPreviousElementSibling(element) {
        return this.getElementSibling(element, 'previous');
    }

    getNextElementSibling(element) {
        return this.getElementSibling(element, 'next');
    }
    normalizeWhitespace(text) {
        return text
            // Replace &nbsp; (Unicode: \u00A0)
            .replace(/\u00A0/g, ' ')
            .replace(/\s/g, ' ');
    }

    endsWithWhitespace(text) {
        return /\s$/.test(text) || /\u00A0$/.test(text);
    }

    startsWithWhitespace(text) {
        const firstChar = text.charAt(0);
        return firstChar === ' ' || firstChar === '\u00A0' || /^\s/.test(text);
    }

    isOnlyWhitespace(text) {
        return this.normalizeWhitespace(text).trim() === '';
    }

    /** Query/comment chrome that must not drive double-space edges. */
    static get QUERY_COMMENT_CHROME_SELECTOR() {
        return [
            '[data-class="ckcommentsfull"]',
            '[data-name="Query_Start"]',
            '[data-name="Query_End"]',
            '[data-name="comment"]',
            '[data-name="Comment"]',
            '[data-name="AQ"]',
            '[data-name="response"]',
            '[data-name="Response"]',
            '.Query_Start',
            '.Query_End'
        ].join(',');
    }

    isQueryCommentChrome(node) {
        if (!node || node.nodeType !== 1) return false;
        try {
            const dataClass = node.getAttribute && node.getAttribute("data-class");
            if (dataClass === "ckcommentsfull") return true;
            const className =
                (typeof node.className === "string" && node.className) ||
                (node.getAttribute && node.getAttribute("class")) ||
                "";
            if (/\bQuery_Start\b|\bQuery_End\b/.test(className)) return true;
            const name = node.getAttribute && node.getAttribute("data-name");
            return (
                name === "Query_Start" ||
                name === "Query_End" ||
                name === "comment" ||
                name === "Comment" ||
                name === "AQ" ||
                name === "response" ||
                name === "Response"
            );
        } catch (err) {
            this.logError("isQueryCommentChrome", err);
            return false;
        }
    }

    stripQueryCommentChrome(root) {
        if (!root || typeof root.querySelectorAll !== "function") return root;
        const markers = root.querySelectorAll(QcValidationCore.QUERY_COMMENT_CHROME_SELECTOR);
        for (let i = markers.length - 1; i >= 0; i--) {
            const marker = markers[i];
            if (marker && marker.parentNode) {
                marker.parentNode.removeChild(marker);
            }
        }
        return root;
    }

    /**
     * Track-change text without query/comment chrome.
     * Markers often hold an intentional &nbsp; so the editor does not eat surrounding space.
     */
    getTrackTextExcludingComments(domNode) {
        if (!domNode) return "";
        try {
            if (typeof domNode.cloneNode !== "function" || typeof domNode.querySelectorAll !== "function") {
                return domNode.textContent || "";
            }
            const clone = domNode.cloneNode(true);
            this.stripQueryCommentChrome(clone);
            return clone.textContent || "";
        } catch (err) {
            this.logError("getTrackTextExcludingComments", err);
            return (domNode && domNode.textContent) || "";
        }
    }

    /**
     * Cleared parent block text: strip query/comment chrome + dels, keep insert text.
     * @returns {string|null} normalized text, or null if parent cannot be resolved
     */
    getParentClearText(domNode) {
        if (!domNode) return null;
        try {
            let parent = null;
            if (typeof domNode.closest === "function") {
                parent = domNode.closest('[data-name="p"],.p');
            }
            if (!parent) {
                parent = domNode.parentElement || domNode.parentNode || null;
            }
            if (!parent || typeof parent.cloneNode !== "function") return null;

            const clone = parent.cloneNode(true);
            this.stripQueryCommentChrome(clone);
            if (typeof clone.querySelectorAll === "function") {
                const dels = clone.querySelectorAll("del.ice-del,del,delete.ice-del");
                for (let i = dels.length - 1; i >= 0; i--) {
                    const del = dels[i];
                    if (del && del.parentNode) del.parentNode.removeChild(del);
                }
            }
            return this.normalizeWhitespace(clone.textContent || "");
        } catch (err) {
            this.logError("getParentClearText", err);
            return null;
        }
    }

    /** @returns {boolean|null} true/false if decidable; null if parent clear unavailable */
    parentClearHasDoubleSpace(domNode) {
        const clear = this.getParentClearText(domNode);
        if (clear == null) return null;
        return / {2,}/.test(clear);
    }

    isDomTrackChange(node) {
        if (!node || node.nodeType !== 1) return false;
        const tag = String(node.tagName || "").toLowerCase();
        const cls =
            (typeof node.className === "string" && node.className) ||
            (node.getAttribute && node.getAttribute("class")) ||
            "";
        if ((tag === "insert" || tag === "ins") && /\bice-ins\b/.test(cls)) return true;
        if ((tag === "del" || tag === "delete") && /\bice-del\b/.test(cls)) return true;
        return false;
    }

    /** Walk past query/comment chrome to the next meaningful text or track-change node. */
    getAdjacentMeaningfulSibling(domNode, direction) {
        if (!domNode) return null;
        const forward = direction === "next";
        let cur = forward ? domNode.nextSibling : domNode.previousSibling;
        while (cur) {
            if (cur.nodeType === 3) {
                if (cur.nodeValue != null && String(cur.nodeValue).length > 0) {
                    return cur;
                }
            } else if (cur.nodeType === 1) {
                if (!this.isQueryCommentChrome(cur)) {
                    return cur;
                }
            }
            cur = forward ? cur.nextSibling : cur.previousSibling;
        }
        return null;
    }

    isInsertTag(element) {

        if (!element) return false;

        const tagName = element.getName().toLowerCase();
        const classList = element.$.className ? element.$.className.split(/\s+/) : [];

        return (tagName === 'insert' || tagName === 'ins') && classList.includes('ice-ins');
    }

    checkAdjacentMeaningful(currentDom, adjacentNode, isNextNode = true) {
        try {
            if (!adjacentNode) return false;

            const currentText = this.getTrackTextExcludingComments(currentDom);

            if (adjacentNode.nodeType === 3) {
                const adjacentText = adjacentNode.nodeValue || "";
                if (isNextNode) {
                    return this.endsWithWhitespace(currentText) && this.startsWithWhitespace(adjacentText);
                }
                return this.endsWithWhitespace(adjacentText) && this.startsWithWhitespace(currentText);
            }

            if (adjacentNode.nodeType === 1 && this.isDomTrackChange(adjacentNode)) {
                const adjacentText = this.getTrackTextExcludingComments(adjacentNode);
                const isCurrentOnlyWhitespace = this.isOnlyWhitespace(currentText);
                const isAdjacentOnlyWhitespace = this.isOnlyWhitespace(adjacentText);
                if (isCurrentOnlyWhitespace && isAdjacentOnlyWhitespace) {
                    return true;
                }
                return (this.endsWithWhitespace(currentText) && this.startsWithWhitespace(adjacentText)) ||
                    (this.endsWithWhitespace(adjacentText) && this.startsWithWhitespace(currentText));
            }

            return false;
        } catch (e) {
            this.logError("checkAdjacentMeaningful", e);
            return false;
        }
    }

    checkAdjacentWhitespace(currentElement, adjacentNode, isNextNode = true) {
        return this.checkAdjacentMeaningful(
            currentElement && currentElement.$,
            adjacentNode,
            isNextNode
        );
    }

    checkAdjacentInsertTags(currentElement, adjacentElement) {
        try {
            if (!adjacentElement || !this.isInsertTag(adjacentElement)) {
                return false;
            }
            return this.checkAdjacentMeaningful(currentElement.$, adjacentElement.$, true) ||
                this.checkAdjacentMeaningful(currentElement.$, adjacentElement.$, false);
        } catch (e) {
            this.logError('checkAdjacentInsertTags', e);
            return false;
        }
    }

    checkDoubleSpaces(element) {
        try {
            // Parent clear-text gate: no real doubles in cleared .p → never flag
            const parentGate = this.parentClearHasDoubleSpace(element.$);
            if (parentGate === false) {
                return false;
            }

            const elementText = this.getTrackTextExcludingComments(element.$);
            const normalizedText = this.normalizeWhitespace(elementText);

            if (/ {2,}/.test(normalizedText)) {
                return true;
            }

            if (/\s\s/.test(elementText)) {
                return true;
            }

            const previousNode = this.getAdjacentMeaningfulSibling(element.$, "previous");
            if (this.checkAdjacentMeaningful(element.$, previousNode, false)) {
                return true;
            }

            const nextNode = this.getAdjacentMeaningfulSibling(element.$, "next");
            if (this.checkAdjacentMeaningful(element.$, nextNode, true)) {
                return true;
            }

            return false;
        } catch (err) {
            this.logError('checkDoubleSpaces', err);
            return false;
        }
    }

    handleArrayItems(arr) {
        // https://stackoverflow.com/questions/69702957/compare-each-item-in-an-array-of-objects
        try {
            for (let i = 0; i < arr.length; i++) {
                for (let j = i + 1; j < arr.length; j++) {
                    // Assuming 80% similarity threshold
                    if (this.similarity(arr[i], arr[j]) > 0.8) return true;
                }
            }
            return false;
        } catch (err) {
            this.logError('handleArrayItems', err);
        }
    }

    compareTest() {
        try {
            const str1 = "GBD 2017 Oral Disorders Collaborators; Bernabe, E., Marcenes, W., Hernandez, C. R., Bailey, J., Abreu, L. G., Alipour, V. et al. (2020) Global, Regional, and National Levels and Trends in Burden of Oral Conditions from 1990 to 2017: A Systematic Analysis for the Global Burden of Disease 2017 Study. J Dent Res, 99(4):362–373.";
            const str2 = "Bernabe, E., Marcenes, W., Hernandez, C. R., Bailey, J., Abreu, L. G. et al.; GBD 2017 Oral Disorders Collaborators. (2020) Global, regional, and national levels and trends in burden of oral conditions from 1990 to 2017: a systematic analysis for the Global Burden of Disease 2017 Study. Journal of Dental Research, 99, 362–373.";
            console.log(`Similarity: ${this.similarity(str1, str2) * 100}%`);
        } catch (err) {
            this.logError('compareTest', err);
        }
    }

    init_element_arg() {
        const panel = this.Panel;
        const containers = {};
        // Issue buckets (including Citation subs) — not the parent `citation` confirm tab.
        (this.QC_ISSUE_TABS || Object.keys(this.process_items_by_tab || {})).forEach((tab) => {
            containers[tab] = panel.querySelector(`.qc-tab-container[data-qc-tab="${tab}"]`);
        });
        this.args = {
            Containers: containers,
            Container: containers.missing_citation || panel.querySelector(".qc-tab-container") || panel.querySelector(".container"),
            SubmitBtn: panel.querySelector(".submit_btn"),
            CancelBtn: panel.querySelector(".cancel_btn"),
            ProgressBar: panel.querySelector(".progress"),
            InputComments: panel.querySelector("#internal_audit"),
            ForceSubmitGroup: panel.querySelector('[data-id="force-submit-group"]')
        };
    }

    /** Error count for a QC_TABS key (Citation subs are confirmed separately). */
    getTabErrorCount(tab) {
        return (this.process_items_by_tab[tab] || []).length;
    }

    getTabContainer(tab) {
        const key = tab || "missing_citation";
        // Live Panel only — cached args.Containers go stale when the dialog remounts.
        // Never fall back to the first .qc-tab-container (dumps other tabs into Missing Citation).
        if (!this.Panel || !document.body.contains(this.Panel)) {
            const liveDialog = document.getElementById(this._Id || this._id || "qualityCheckerDialog");
            if (liveDialog) {
                this.Panel = liveDialog;
            }
        }
        if (!this.Panel) return null;

        const live = this.Panel.querySelector(`.qc-tab-container[data-qc-tab="${key}"]`);
        if (live) {
            if (this.args && this.args.Containers) {
                this.args.Containers[key] = live;
            }
            return live;
        }
        return null;
    }

    /**
     * Build a validation section shell via createElement (avoids Mustache id-attr fragility).
     * @returns {{ row: HTMLElement, column: HTMLElement }}
     */
    createValidationEntry(title, rowId, colId) {
        const row = document.createElement("div");
        row.className = "d-flex flex-column p-1";
        if (rowId) row.setAttribute("id", rowId);

        const head = document.createElement("div");
        head.className = "pt-2 pb-2 item-head";
        const titleSpan = document.createElement("span");
        titleSpan.className = "qc-section-title";
        titleSpan.textContent = this.qcSectionTitle(title) || title || "";
        const sectionBadge = document.createElement("span");
        sectionBadge.className = "qc-section-badge";
        sectionBadge.setAttribute("aria-hidden", "true");
        head.appendChild(titleSpan);
        head.appendChild(sectionBadge);

        const column = document.createElement("div");
        column.className = "ml-2";
        if (colId) column.setAttribute("id", colId);

        const spinner = document.createElement("div");
        spinner.className = "spinner-border";
        spinner.setAttribute("role", "status");
        const sr = document.createElement("span");
        sr.className = "sr-only";
        sr.textContent = this.qcMsg("runtime.loading", {}, "Loading...");
        spinner.appendChild(sr);
        column.appendChild(spinner);

        row.appendChild(head);
        row.appendChild(column);
        return {
            row,
            column
        };
    }

    /**
     * After showLoop shell render, verify every SELECTOR col_id exists in the live Panel.
     * Recreates missing shells via createValidationEntry.
     */
    assertValidationColumns() {
        try {
            const panel = this.Panel;
            if (!panel || !Array.isArray(this.SELECTOR)) return;

            const missing = [];
            this.SELECTOR.forEach((item) => {
                for (const [title, value] of Object.entries(item)) {
                    if (!value || !value.col_id) continue;
                    console.log(`QcValidationCore.assertValidationColumns: checking ${value.process} / ${value.tab} / ${value.row_id} / ${value.col_id}`);
                    const colId = value.col_id;
                    const escaped =
                        typeof CSS !== "undefined" && CSS.escape ?
                        CSS.escape(colId) :
                        colId.replace(/([^\w-])/g, "\\$1");
                    let column =
                        panel.querySelector("#" + escaped) ||
                        panel.querySelector(`[id="${colId}"]`);

                    if (!column) {
                        missing.push(colId);
                        const tab = value.tab || "missing_citation";
                        const Container = this.getTabContainer(tab);
                        if (!Container) {
                            this.logError(
                                "assertValidationColumns",
                                new Error(`Validation container not found for ${colId}`)
                            );
                            continue;
                        }
                        if (value.row_id) {
                            const existingRow =
                                panel.querySelector("#" + (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value.row_id) : value.row_id)) ||
                                panel.querySelector(`[id="${value.row_id}"]`);
                            if (existingRow) existingRow.remove();
                        }
                        const {
                            row
                        } = this.createValidationEntry(title, value.row_id, colId);
                        Container.appendChild(row);
                        column =
                            Container.querySelector("#" + escaped) ||
                            Container.querySelector(`[id="${colId}"]`) ||
                            panel.querySelector("#" + escaped) ||
                            panel.querySelector(`[id="${colId}"]`);
                        if (!column) {
                            this.logError(
                                "assertValidationColumns",
                                new Error(`Validation column still missing after recreate: ${colId}`)
                            );
                        }
                    }
                }
            });

            if (missing.length > 0) {
                console.warn(
                    "QcValidationCore.assertValidationColumns: recreated missing columns:",
                    missing.join(", ")
                );
            }
        } catch (err) {
            this.logError("assertValidationColumns", err);
        }
    }

    resetProcessItems() {
        this.process_items_list = [];
        this.process_items_by_tab = {
            missing_citation: [],
            dtd_error: [],
            text_related: [],
            citation_order: [],
            comments_queries: []
        };
    }

    resetQcTabState(state = "pending") {
        this._qcTabState = {};
        this._qcTabPendingCounts = {};
        (this.QC_ISSUE_TABS || this.QC_TABS || []).forEach((tab) => {
            this._qcTabState[tab] = state;
            this._qcTabPendingCounts[tab] = 0;
        });

        (this.SELECTOR || []).forEach((item) => {
            Object.keys(item || {}).forEach((key) => {
                const value = item[key] || {};
                const tab = value.tab || "missing_citation";
                if (typeof this._qcTabPendingCounts[tab] !== "number") {
                    this._qcTabPendingCounts[tab] = 0;
                }
                this._qcTabPendingCounts[tab]++;
                this._qcTabState[tab] = state;
            });
        });
    }

    markQcTabState(tab, state) {
        if (!tab) return;
        if (!this._qcTabState) this._qcTabState = {};
        if (state === "done" && this._qcTabPendingCounts && this._qcTabPendingCounts[tab] > 0) {
            this._qcTabPendingCounts[tab]--;
            if (this._qcTabPendingCounts[tab] > 0) {
                this._qcTabState[tab] = "pending";
                return;
            }
        }
        this._qcTabState[tab] = state;
    }

    isQcTrackReadonly() {
        return typeof IS_TRACK_VIEW !== "undefined" && IS_TRACK_VIEW;
    }

    applyTrackReadonlyUi() {
        if (!this.isQcTrackReadonly() || !this.Panel) return;

        this.Panel.querySelectorAll(".qc-tab-confirm").forEach((el) => {
            el.classList.add("ds-none");
            const checkbox = el.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = false;
                checkbox.classList.remove("is-invalid");
            }
        });

        const forceGroup = (this.args && this.args.ForceSubmitGroup) || this.Panel.querySelector('[data-id="force-submit-group"]');
        if (forceGroup) forceGroup.classList.remove("ds-none");
    }

    recordIssue(item, tab) {
        const entry = Object.assign({}, item, {
            tab: tab || item.tab || "missing_citation"
        });
        this.process_items_list.push(entry);
        const bucket = this.process_items_by_tab[entry.tab];
        if (bucket) {
            bucket.push(entry);
        }
    }

    updateTabConfirmState() {
        try {
            const panel = this.Panel;
            if (!panel) return;

            if (this.isQcTrackReadonly()) {
                this.applyTrackReadonlyUi();
                this.updateTabStatusBadges();
                return;
            }

            (this.QC_TABS || []).forEach((tab) => {
                const hasErrors = this.getTabErrorCount(tab) > 0;
                const confirmWrap = panel.querySelector(`[data-qc-confirm="${tab}"]`);
                if (!confirmWrap) return;
                const checkbox = confirmWrap.querySelector('input[type="checkbox"]');
                const hint = confirmWrap.querySelector(".qc-confirm-hint");
                if (hasErrors) {
                    confirmWrap.classList.remove("ds-none");
                    if (hint) hint.classList.remove("ds-none");
                } else {
                    confirmWrap.classList.add("ds-none");
                    if (hint) hint.classList.add("ds-none");
                    if (checkbox) {
                        checkbox.checked = false;
                        checkbox.classList.remove("is-invalid");
                    }
                }
            });

            const forceGroup = (this.args && this.args.ForceSubmitGroup) || panel.querySelector('[data-id="force-submit-group"]');

            if (forceGroup) {
                forceGroup.classList["remove"]("ds-none");
            }

            const comments = this.args && this.args.InputComments;
            if (comments && this.process_items_list.length === 0) {
                comments.classList.remove("is-invalid");
            }

            this.updateTabStatusBadges();
        } catch (err) {
            this.logError("updateTabConfirmState", err);
        }
    }

    /** Count ignore items in a tab pane (honors collapsed data-ids). */
    countIgnoreItemsInTab(tab) {
        const container = this.getTabContainer(tab);
        if (!container) return 0;
        let count = 0;
        container.querySelectorAll("p.ignore-items").forEach((row) => {
            const idsAttr = row.getAttribute("data-ids");
            if (idsAttr) {
                count += idsAttr.split(",").filter(Boolean).length;
            } else if (row.getAttribute("data-id")) {
                count += 1;
            } else if ((row.textContent || "").trim()) {
                count += 1;
            }
        });
        return count;
    }

    /**
     * Resolve badge state for an issue tab: error > warn (ignore-only) > pass.
     * @returns {{ state: string, count: number }}
     */
    getTabBadgeState(tab) {
        if (this._qcTabState && this._qcTabState[tab] === "pending") {
            return {
                state: "pending",
                count: 0
            };
        }
        const errCount = this.getTabErrorCount(tab);
        if (errCount > 0) {
            return {
                state: "error",
                count: errCount
            };
        }
        const ignoreCount = this.countIgnoreItemsInTab(tab);
        if (ignoreCount > 0) {
            return {
                state: "warn",
                count: ignoreCount
            };
        }
        return {
            state: "pass",
            count: 0
        };
    }

    /** Apply pass / warn / error classes + text onto a .qc-tab-badge element. */
    applyTabBadge(badgeEl, state, count) {
        if (!badgeEl) return;
        badgeEl.className = "qc-tab-badge";
        badgeEl.textContent = "";
        if (state === "error") {
            badgeEl.classList.add("qc-tab-badge--error");
            badgeEl.textContent = String(count);
        } else if (state === "pending") {
            badgeEl.classList.add("qc-tab-badge--pending");
            badgeEl.textContent = "…";
        } else if (state === "warn") {
            badgeEl.classList.add("qc-tab-badge--warn");
            badgeEl.textContent = count > 0 ? String(count) : "!";
        } else if (state === "pass") {
            badgeEl.classList.add("qc-tab-badge--pass");
            badgeEl.textContent = "✓";
        }
    }

    /** Stamp top tabs + Citation subs with status badges; section heads get counts. */
    updateTabStatusBadges() {
        try {
            const panel = this.Panel;
            if (!panel) return;

            const issueTabs = this.QC_ISSUE_TABS || this.QC_TABS || [];
            const byTab = {};
            issueTabs.forEach((tab) => {
                byTab[tab] = this.getTabBadgeState(tab);
            });

            issueTabs.forEach((tab) => {
                const subLink = panel.querySelector(`.qc-citation-subs [data-qc-sub="${tab}"]`);
                if (subLink) {
                    let badge = subLink.querySelector(".qc-tab-badge");
                    if (!badge) {
                        badge = document.createElement("span");
                        badge.className = "qc-tab-badge";
                        badge.setAttribute("aria-hidden", "true");
                        subLink.appendChild(badge);
                    }
                    this.applyTabBadge(badge, byTab[tab].state, byTab[tab].count);
                }

                if (tab === "missing_citation" || tab === "citation_order") return;

                const topLink = panel.querySelector(`.qc-validation-tabs [data-qc-tab="${tab}"]`);
                if (topLink) {
                    let badge = topLink.querySelector(".qc-tab-badge");
                    if (!badge) {
                        badge = document.createElement("span");
                        badge.className = "qc-tab-badge";
                        badge.setAttribute("aria-hidden", "true");
                        topLink.appendChild(badge);
                    }
                    this.applyTabBadge(badge, byTab[tab].state, byTab[tab].count);
                }
            });

            // Citation parent: error if either sub has errors (sum); else warn if either ignore-only; else pass.
            const missing = byTab.missing_citation || {
                state: "pass",
                count: 0
            };
            const order = byTab.citation_order || {
                state: "pass",
                count: 0
            };
            let citationState = "pass";
            let citationCount = 0;
            if (missing.state === "error" || order.state === "error") {
                citationState = "error";
                citationCount = (missing.state === "error" ? missing.count : 0) +
                    (order.state === "error" ? order.count : 0);
            } else if (missing.state === "warn" || order.state === "warn") {
                citationState = "warn";
                citationCount = (missing.state === "warn" ? missing.count : 0) +
                    (order.state === "warn" ? order.count : 0);
            }
            const citationLink = panel.querySelector('.qc-validation-tabs [data-qc-tab="citation"]');
            if (citationLink) {
                let badge = citationLink.querySelector(".qc-tab-badge");
                if (!badge) {
                    badge = document.createElement("span");
                    badge.className = "qc-tab-badge";
                    badge.setAttribute("aria-hidden", "true");
                    citationLink.appendChild(badge);
                }
                this.applyTabBadge(badge, citationState, citationCount);
            }

            this.updateSectionStatusBadges();
        } catch (err) {
            this.logError("updateTabStatusBadges", err);
        }
    }

    /** Trailing count on .item-head: red for missing, orange for ignore-only. */
    updateSectionStatusBadges() {
        try {
            const panel = this.Panel;
            if (!panel) return;

            panel.querySelectorAll(".qc-tab-container .item-head").forEach((head) => {
                const column = head.nextElementSibling;
                let badge = head.querySelector(".qc-section-badge");
                if (!badge) {
                    badge = document.createElement("span");
                    badge.className = "qc-section-badge";
                    badge.setAttribute("aria-hidden", "true");
                    head.appendChild(badge);
                }
                badge.className = "qc-section-badge";
                badge.textContent = "";

                if (!column) return;

                const missingCount = column.querySelectorAll(".missing-items").length;
                if (missingCount > 0) {
                    badge.classList.add("qc-section-badge--error");
                    badge.textContent = String(missingCount);
                    return;
                }

                let ignoreCount = 0;
                column.querySelectorAll("p.ignore-items").forEach((row) => {
                    const idsAttr = row.getAttribute("data-ids");
                    if (idsAttr) {
                        ignoreCount += idsAttr.split(",").filter(Boolean).length;
                    } else if (row.getAttribute("data-id") || (row.textContent || "").trim()) {
                        ignoreCount += 1;
                    }
                });
                if (ignoreCount > 0) {
                    badge.classList.add("qc-section-badge--warn");
                    badge.textContent = String(ignoreCount);
                }
            });
        } catch (err) {
            this.logError("updateSectionStatusBadges", err);
        }
    }

    /**
     * Next tab/sub in the review path, or null at the end (no wrap).
     * @param {string} currentKey
     * @returns {string|null}
     */
    getNextQcTabKey(currentKey) {
        const order = this.QC_REVIEW_ORDER || this.QC_TABS || [];
        const idx = order.indexOf(currentKey);
        if (idx < 0 || idx >= order.length - 1) return null;
        return order[idx + 1];
    }

    /**
     * Previous tab/sub in the review path, or null at the start (no wrap).
     * @param {string} currentKey
     * @returns {string|null}
     */
    getPrevQcTabKey(currentKey) {
        const order = this.QC_REVIEW_ORDER || this.QC_TABS || [];
        const idx = order.indexOf(currentKey);
        if (idx <= 0) return null;
        return order[idx - 1];
    }

    /**
     * Normalize a tab/sub id to a QC_REVIEW_ORDER key (or null).
     * @param {string} tab
     * @param {string|null} [resolvedSubTab]
     * @returns {string|null}
     */
    normalizeQcReviewTab(tab, resolvedSubTab) {
        if (!tab) return null;
        let key = tab;
        if (tab === "missing_citation" || tab === "citation_order") {
            key = tab;
        } else if (tab === "citation") {
            key = resolvedSubTab || "missing_citation";
        }
        const order = this.QC_REVIEW_ORDER || [];
        return order.indexOf(key) >= 0 ? key : null;
    }

    rememberQcReviewTab(tab, resolvedSubTab) {
        const key = this.normalizeQcReviewTab(tab, resolvedSubTab);
        if (key) this._lastQcReviewTab = key;
    }

    /**
     * Read active top + Citation sub from live Panel → review-path key.
     * @returns {string|null}
     */
    getActiveQcReviewTab() {
        try {
            const panel = this.Panel;
            if (!panel) return this._lastQcReviewTab || null;

            const topActive = panel.querySelector(".qc-validation-tabs .nav-link.active");
            const topKey = topActive && topActive.getAttribute("data-qc-tab");
            if (!topKey) return this._lastQcReviewTab || null;

            if (topKey === "citation") {
                const subActive = panel.querySelector(".qc-citation-subs .nav-link.active");
                const sub = subActive && subActive.getAttribute("data-qc-sub");
                return this.normalizeQcReviewTab("citation", sub);
            }

            return this.normalizeQcReviewTab(topKey);
        } catch (err) {
            this.logError("getActiveQcReviewTab", err);
            return this._lastQcReviewTab || null;
        }
    }

    /** Keep _lastQcReviewTab in sync when user clicks Bootstrap tabs. */
    bindQcTabRememberHandlers() {
        try {
            const panel = this.Panel;
            if (!panel) return;

            const rememberFromDom = () => {
                const key = this.getActiveQcReviewTab();
                if (key) this._lastQcReviewTab = key;
            };

            if (typeof $ !== "undefined" && $.fn && typeof $(panel).on === "function") {
                $(panel).off("shown.bs.tab.qcRemember");
                $(panel).on(
                    "shown.bs.tab.qcRemember",
                    '.qc-validation-tabs [data-toggle="tab"], .qc-citation-subs [data-toggle="tab"]',
                    rememberFromDom
                );
                return;
            }

            if (panel._qcTabRememberClick) {
                panel.removeEventListener("click", panel._qcTabRememberClick, true);
            }
            const clickHandler = (e) => {
                const t = e.target && e.target.closest ?
                    e.target.closest(
                        '.qc-validation-tabs [data-toggle="tab"], .qc-citation-subs [data-toggle="tab"]'
                    ) :
                    null;
                if (!t) return;
                setTimeout(rememberFromDom, 0);
            };
            panel._qcTabRememberClick = clickHandler;
            panel.addEventListener("click", clickHandler, true);
        } catch (err) {
            this.logError("bindQcTabRememberHandlers", err);
        }
    }

    getQcTabScrollMetrics(container) {
        const scrollTop = (container && container.scrollTop) || 0;
        const clientHeight = (container && container.clientHeight) || 0;
        const scrollHeight = (container && container.scrollHeight) || 0;
        const threshold = 12;
        const noOverflow = scrollHeight <= clientHeight + 1;
        const atTop = scrollTop <= threshold;
        const atBottom = scrollTop + clientHeight >= scrollHeight - threshold;
        return {
            scrollTop,
            clientHeight,
            scrollHeight,
            noOverflow,
            atTop,
            atBottom,
            threshold
        };
    }

    /** Clear latch when user leaves arrival edge, or when both edges are true (no overflow). */
    releaseQcScrollLatchIfNeeded(container) {
        if (!this._qcScrollSyncLatch || !container) return;
        const {
            atTop,
            atBottom,
            noOverflow
        } = this.getQcTabScrollMetrics(container);
        if (noOverflow || (atTop && atBottom)) {
            this._qcScrollSyncLatch = null;
            return;
        }
        if (this._qcScrollSyncLatch === "top" && !atTop) {
            this._qcScrollSyncLatch = null;
        } else if (this._qcScrollSyncLatch === "bottom" && !atBottom) {
            this._qcScrollSyncLatch = null;
        }
    }

    /** Bind scroll + wheel sync (±1 tab) on each .qc-tab-container. */
    bindQcTabScrollSync() {
        try {
            const panel = this.Panel;
            if (!panel) return;

            panel.querySelectorAll(".qc-tab-container").forEach((el) => {
                if (el._qcScrollHandler) {
                    el.removeEventListener("scroll", el._qcScrollHandler);
                }
                if (el._qcWheelHandler) {
                    el.removeEventListener("wheel", el._qcWheelHandler);
                }

                let debounceTimer = null;
                const scrollHandler = (e) => {
                    debug.log("scrollHandler", e);
                    if (this._qcScrollAdvanceProgrammatic) return;
                    this.releaseQcScrollLatchIfNeeded(el);
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        this.handleQcTabScrollSync(el, null);
                    }, 150);
                };
                const wheelHandler = (e) => {
                    debug.log("wheelHandler", e.deltaY, e);
                    if (this._qcScrollAdvanceProgrammatic || this._qcScrollAdvanceCooldown) return;
                    const deltaY = e.deltaY || 0;
                    if (!deltaY) return;
                    this.releaseQcScrollLatchIfNeeded(el);
                    const {
                        noOverflow,
                        atTop,
                        atBottom
                    } = this.getQcTabScrollMetrics(el);
                    if (deltaY > 0 && (noOverflow || atBottom)) {
                        this.handleQcTabScrollSync(el, "next");
                    } else if (deltaY < 0 && (noOverflow || atTop)) {
                        this.handleQcTabScrollSync(el, "prev");
                    }
                };

                el._qcScrollHandler = scrollHandler;
                el._qcWheelHandler = wheelHandler;
                el.addEventListener("scroll", scrollHandler, {
                    passive: true
                });
                el.addEventListener("wheel", wheelHandler, {
                    passive: true
                });
            });
        } catch (err) {
            this.logError("bindQcTabScrollSync", err);
        }
    }

    /** @deprecated Use bindQcTabScrollSync */
    bindQcTabScrollAdvance() {
        return this.bindQcTabScrollSync();
    }

    /**
     * Sync tab with scroll/wheel: bottom → next, top → prev (exactly one step).
     * @param {HTMLElement} container
     * @param {'next'|'prev'|null} intent
     */
    handleQcTabScrollSync(container, intent) {
        try {
            if (!container || this._qcScrollAdvanceCooldown || this._qcScrollAdvanceProgrammatic) {
                return;
            }

            const metrics = this.getQcTabScrollMetrics(container);
            const {
                noOverflow,
                atTop,
                atBottom
            } = metrics;
            this.releaseQcScrollLatchIfNeeded(container);

            const key = container.getAttribute("data-qc-tab");
            const nextKey = this.getNextQcTabKey(key);
            const prevKey = this.getPrevQcTabKey(key);

            this.toggleScrollSyncHint(container, !!(atBottom && nextKey), !!(atTop && prevKey));

            let direction = intent;
            if (!direction) {
                // Scroll-driven: only when overflowing and at a single edge
                if (noOverflow || (atTop && atBottom)) return;
                if (atBottom && !atTop) direction = "next";
                else if (atTop && !atBottom) direction = "prev";
                else return;
            } else {
                if (direction === "next" && !(noOverflow || atBottom)) return;
                if (direction === "prev" && !(noOverflow || atTop)) return;
            }

            // Same-direction latch only: top blocks further next; bottom blocks further prev
            if (direction === "next" && this._qcScrollSyncLatch === "top" && atTop) return;
            if (direction === "prev" && this._qcScrollSyncLatch === "bottom" && atBottom) return;

            const targetKey = direction === "next" ? nextKey : prevKey;
            if (!targetKey) return;

            this._qcScrollAdvanceCooldown = true;
            this._qcScrollAdvanceProgrammatic = true;
            // Arrive at top when going forward, bottom when going back
            this._qcScrollSyncLatch = direction === "next" ? "top" : "bottom";
            this.toggleScrollSyncHint(container, false, false);
            this.activateQcTab(targetKey);

            const targetContainer = this.getTabContainer(targetKey);
            if (targetContainer) {
                if (direction === "next") {
                    targetContainer.scrollTop = 0;
                } else {
                    const maxTop = Math.max(0, (targetContainer.scrollHeight || 0) - (targetContainer.clientHeight || 0));
                    targetContainer.scrollTop = maxTop;
                }
            }

            const self = this;
            setTimeout(() => {
                self._qcScrollAdvanceProgrammatic = false;
            }, 80);
            setTimeout(() => {
                self._qcScrollAdvanceCooldown = false;
            }, 500);
        } catch (err) {
            this.logError("handleQcTabScrollSync", err);
        }
    }

    /** @deprecated Use handleQcTabScrollSync */
    handleQcTabScrollEnd(container) {
        return this.handleQcTabScrollSync(container, "next");
    }

    toggleScrollSyncHint(container, showNext, showPrev) {
        if (!container || !container.parentElement) return;
        let hint = container.parentElement.querySelector(":scope > .qc-scroll-next-hint");
        const show = !!(showNext || showPrev);
        if (show) {
            if (!hint) {
                hint = document.createElement("div");
                hint.className = "qc-scroll-next-hint";
                container.parentElement.insertBefore(hint, container.nextSibling);
            }
            if (showNext && showPrev) {
                hint.textContent = this.qcMsg("runtime.scroll_both", {}, "← Scroll for previous · Scroll for next →");
            } else if (showNext) {
                hint.textContent = this.qcMsg("runtime.scroll_next", {}, "Scroll for next →");
            } else {
                hint.textContent = this.qcMsg("runtime.scroll_prev", {}, "← Scroll for previous");
            }
            hint.classList.remove("ds-none");
        } else if (hint) {
            hint.classList.add("ds-none");
        }
    }

    /** @deprecated Use toggleScrollSyncHint */
    toggleScrollNextHint(container, show) {
        return this.toggleScrollSyncHint(container, !!show, false);
    }

    activateQcTab(tab) {
        try {
            const panel = this.Panel;
            if (!panel || !tab) return;

            let topTab = tab;
            let subTab = null;
            if (tab === "missing_citation" || tab === "citation_order") {
                topTab = "citation";
                subTab = tab;
            } else if (tab === "citation") {
                if ((this.process_items_by_tab.missing_citation || []).length > 0) {
                    subTab = "missing_citation";
                } else if ((this.process_items_by_tab.citation_order || []).length > 0) {
                    subTab = "citation_order";
                }
            }

            const link = panel.querySelector(`.qc-validation-tabs [data-qc-tab="${topTab}"]`);
            if (link && typeof $ !== "undefined" && $.fn && $.fn.tab) {
                $(link).tab("show");
            } else if (link) {
                link.click();
            }

            if (subTab) {
                const subLink = panel.querySelector(`.qc-citation-subs [data-qc-sub="${subTab}"]`);
                if (subLink && typeof $ !== "undefined" && $.fn && $.fn.tab) {
                    $(subLink).tab("show");
                } else if (subLink) {
                    subLink.click();
                }
            }

            this.rememberQcReviewTab(tab, subTab);
        } catch (err) {
            this.logError("activateQcTab", err);
        }
    }

    areErroredTabsConfirmed() {
        if (this.isQcTrackReadonly()) {
            return {
                ok: true
            };
        }

        const panel = this.Panel;
        if (!panel) return false;
        for (let i = 0; i < (this.QC_TABS || []).length; i++) {
            const tab = this.QC_TABS[i];
            if (this.getTabErrorCount(tab) === 0) continue;
            const checkbox = panel.querySelector(`#qc_confirm_${tab}`);
            if (!checkbox || !checkbox.checked) {
                return {
                    ok: false,
                    tab,
                    checkbox
                };
            }
        }
        return {
            ok: true
        };
    }

    initLoop() {
        try {

            this.init_element_arg();

            this.templateList.entry = '<div class="d-flex flex-column p-1" id={{id}}><div class="pt-2 pb-2 item-head">{{txt1}}</div><div class="ml-2" id={{id_col}}><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div></div>';


            if (USER_INFO.ROLE_ID === ROLE_IDS.CO || IS_LOCAL_HOST) {
                this.initIntervalTimer();
            }
            this.FullyLoaded = true;
            this.AutoInitiated = true;
        } catch (err) {
            this.logError('initLoop', err);
        }
    }

    handleInputComments(event) {
        try {
            const input = event.target;
            const isValid = input.value.length > 20;
            input.classList[isValid ? "remove" : "add"]("is-invalid");
        } catch (err) {
            this.logError('handleInputComments', err);
        }
    }

    showLoop() {
        try {
            const self = this;
            this.init_element_arg();
            const {
                ProgressBar,
                InputComments
            } = this.args;

            this.resetProcessItems();
            this.resetQcTabState("pending");
            this.available_citation_list = [];
            this.duplicate_items_list = [];

            // Clear issue-bucket containers (Citation subs + other tabs).
            (this.QC_ISSUE_TABS || Object.keys(this.process_items_by_tab || {})).forEach((tab) => {
                const tabContainer = this.getTabContainer(tab);
                if (tabContainer) tabContainer.innerHTML = "";
            });
            // Reset top-level confirms (including rolled-up Citation).
            (this.QC_TABS || []).forEach((tab) => {
                const confirmWrap = this.Panel.querySelector(`[data-qc-confirm="${tab}"]`);
                if (confirmWrap) {
                    confirmWrap.classList.add("ds-none");
                    const checkbox = confirmWrap.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        checkbox.checked = false;
                        checkbox.classList.remove("is-invalid");
                    }
                }
            });

            if (InputComments) {
                InputComments.value = "";
                InputComments.classList.remove("is-invalid");
            }
            this.updateTabConfirmState();

            try {
                if (typeof trackDialog != "undefined" && typeof trackDialog.mergeDelSequences == "function") {
                    // trackDialog.mergeDelSequences();
                }

            } catch (error) {}
            try {
                this.SELECTOR.forEach((item, index, array) => {
                    if (index === 0 && ProgressBar && ProgressBar.firstElementChild) {
                        ProgressBar.firstElementChild.setAttribute("aria-valuemax", array.length);
                    }

                    for (const [key, value] of Object.entries(item)) {
                        const tab = value.tab || "missing_citation";
                        const Container = this.getTabContainer(tab);
                        if (Container) {
                            const {
                                row
                            } = this.createValidationEntry(key, value.row_id, value.col_id);
                            Container.appendChild(row);
                        }

                        if (IS_LOCAL_HOST && value.process != "duplicate_ids") {
                            // continue;
                        }

                        new Promise((resolve) => {
                            setTimeout(() => {
                                self.checkItems(value);
                                if (ProgressBar && ProgressBar.firstElementChild) {
                                    const progress = ((index + 1) / array.length) * 100;
                                    $(ProgressBar.firstElementChild).css("width", `${progress}%`);
                                }
                                resolve();
                            }, 500 * index);
                        });
                    }
                });

                this.assertValidationColumns();

                this.Showed = true;
                this.handleTrackView();
                this.bindQcTabScrollSync();
                this.bindQcTabRememberHandlers();
                this.setAllLabels();
                if (
                    this._lastQcReviewTab &&
                    (this.QC_REVIEW_ORDER || []).indexOf(this._lastQcReviewTab) >= 0
                ) {
                    this.activateQcTab(this._lastQcReviewTab);
                }
            } catch (err) {
                this.logError('showLoop-forEach', err);
            }

            this.bindSubmitHandlers();

        } catch (err) {
            this.logError('showLoop', err);
        }
    }

    /**
     * Re-run only Comments & Queries (collation_pending) without wiping other QC tabs.
     * Used when collator verify closes while Internal Validation is still open.
     */
    refreshCommentsQueriesTab() {
        try {
            let panelInDom = false;
            try {
                panelInDom = !!(
                    this.Panel &&
                    typeof document !== "undefined" &&
                    document.body &&
                    typeof document.body.contains === "function" &&
                    document.body.contains(this.Panel)
                );
            } catch (_) {
                // Non-Node Panel (tests) or detached — keep existing Panel reference.
                panelInDom = !!this.Panel;
            }
            if (!this.Panel || !panelInDom) {
                try {
                    const live =
                        typeof document !== "undefined" &&
                        document.getElementById(this._Id || this._id || "qualityCheckerDialog");
                    if (live) this.Panel = live;
                } catch (_) {
                    /* ignore */
                }
            }
            if (!this.Panel) return false;

            this.activateQcTab("comments_queries");

            const tabContainer = this.getTabContainer("comments_queries");
            if (tabContainer) {
                tabContainer.innerHTML = "";
            }

            this.process_items_list = (this.process_items_list || []).filter(
                (item) => item && item.tab !== "comments_queries"
            );
            if (!this.process_items_by_tab) {
                this.process_items_by_tab = {};
            }
            this.process_items_by_tab.comments_queries = [];
            if (!this._qcTabPendingCounts) this._qcTabPendingCounts = {};
            this._qcTabPendingCounts.comments_queries = 1;
            this.markQcTabState("comments_queries", "pending");

            const confirmWrap = this.Panel.querySelector('[data-qc-confirm="comments_queries"]');
            if (confirmWrap) {
                confirmWrap.classList.add("ds-none");
                const checkbox = confirmWrap.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = false;
                    checkbox.classList.remove("is-invalid");
                }
            }

            (this.SELECTOR || []).forEach((item) => {
                for (const [title, value] of Object.entries(item)) {
                    if (!value || value.tab !== "comments_queries") continue;
                    const Container = this.getTabContainer("comments_queries");
                    if (Container) {
                        const {
                            row
                        } = this.createValidationEntry(title, value.row_id, value.col_id);
                        Container.appendChild(row);
                    }
                    this.checkItems(value);
                }
            });

            this.updateTabConfirmState();
            this.bindQcTabScrollSync();
            return true;
        } catch (err) {
            this.logError("refreshCommentsQueriesTab", err);
            return false;
        }
    }

    /** Bind submit / comments handlers once per show (Panel may remount). */
    bindSubmitHandlers() {
        try {
            if (!(IS_EDITOR_PAGE && USER_INFO.ROLE_ID === ROLE_IDS.CO)) return;
            if (!this.args) return;
            if (this.args.SubmitBtn) {
                this.args.SubmitBtn.onclick = this.fire.bind(this);
            }
            if (this.args.InputComments) {
                this.args.InputComments.oninput = this.handleInputComments.bind(this);
            }
        } catch (err) {
            this.logError("bindSubmitHandlers", err);
        }
    }

    handleTrackView() {
        try {
            var self = this;
            if (this.isQcTrackReadonly()) {
                var footer = this.Panel.querySelector(".dialog-footer");
                if (footer) footer.className = "ds-none";
                this.applyTrackReadonlyUi();
            }

            commonfn.show_remark = (e, t = {}) => {
                try {
                    const {
                        InputComments
                    } = this.args;

                    if (e.data && e.data.length > 0) {
                        const a = e.data[0];
                        self.last_remark_response = a;
                        if (InputComments) {
                            InputComments.value = a.remarks;
                        }
                    }
                    if (InputComments && IS_TRACK_VIEW) InputComments.setAttribute("disabled", "true");
                } catch (err) {
                    this.logError('show_qc_remark', err);
                }
            };

            const d = {
                tbl: "common",
                find: {
                    recordtype: "qualityCheckerDialog",
                    identifier: SHARED_KEY.identifier
                }
            };
            commonfn.callajax(d, "show_remark", API_GET_DOCS);
        } catch (err) {
            this.logError('handleTrackView', err);
        }
    }
    /**
     * Resolve element nav id from id / del_id / oid / data-id.
     * Never walks to parent. If missing, stamps data-id via GENERATE_ID().
     * @param {CKEDITOR.dom.element|HTMLElement} element
     * @returns {string}
     */
    resolveOrStampElementId(element) {
        if (!element) return "";

        const readAttr = (name) => {
            try {
                if (typeof element.getAttribute === "function") {
                    const v = element.getAttribute(name);
                    if (v != null && String(v).trim() !== "") return String(v).trim();
                }
                if (typeof element.hasAttribute === "function" && element.hasAttribute(name)) {
                    const v = element.getAttribute(name);
                    if (v != null && String(v).trim() !== "") return String(v).trim();
                }
                const node = element.$ || element;
                if (node && typeof node.getAttribute === "function") {
                    const v = node.getAttribute(name);
                    if (v != null && String(v).trim() !== "") return String(v).trim();
                }
            } catch (err) {
                /* ignore */
            }
            return "";
        };

        let id = "";
        try {
            if (typeof element.getId === "function") {
                id = element.getId() || "";
            }
        } catch (err) {
            id = "";
        }
        if (!id) id = readAttr("id");
        if (!id) id = readAttr("del_id");
        if (!id) id = readAttr("oid");
        if (!id) id = readAttr("data-id");

        if (id) return id;

        if (typeof GENERATE_ID !== "function") {
            return "";
        }

        const stamped = GENERATE_ID() || "";
        if (!stamped) return "";

        try {
            if (typeof element.setAttribute === "function") {
                element.setAttribute("data-id", stamped);
            } else {
                const node = element.$ || element;
                if (node && typeof node.setAttribute === "function") {
                    node.setAttribute("data-id", stamped);
                }
            }
        } catch (err) {
            this.logError("resolveOrStampElementId", err);
        }

        return stamped;
    }

    checkDuplicateIDsInCollection(elements, columnContainer) {
        const seen = {};
        const duplicates = [];

        elements.array.forEach(el => {
            const id = this.resolveOrStampElementId(el);

            if (!id) return;

            if (seen[id]) {
                duplicates.push(id);
            } else {
                seen[id] = true;
            }
        });

        // Render duplicates
        if (duplicates.length > 0) {
            duplicates.forEach(id => {
                const msg = this.qcMsg("runtime.duplicate_id_section", {
                    id
                }, `Duplicate ID "${id}" found in this section`);
                const html = `<p class="missing-items" data-id="${id}">${msg}</p>`;
                columnContainer.append(this.GetFragment(html));

                this.recordIssue({
                    label: this.qcMsg("runtime.duplicate_id_label", {
                        id
                    }, `Duplicate ID "${id}"`),
                    id
                }, "dtd_error");
            });

            return duplicates.length;
        }

        return 0;
    }

    getValidationEntryInfo(selectorInfo) {
        const fallback = {
            title: selectorInfo && selectorInfo.row_id ? selectorInfo.row_id : this.qcMsg("runtime.validation_item", {}, "Validation Item"),
            row_id: selectorInfo && selectorInfo.row_id,
            col_id: selectorInfo && selectorInfo.col_id,
            tab: (selectorInfo && selectorInfo.tab) || "missing_citation"
        };

        if (!selectorInfo || !Array.isArray(this.SELECTOR)) {
            return fallback;
        }

        for (const item of this.SELECTOR) {
            for (const [title, value] of Object.entries(item)) {
                if (value && value.col_id === selectorInfo.col_id) {
                    return {
                        title: this.qcSectionTitle(title),
                        row_id: value.row_id,
                        col_id: value.col_id,
                        tab: value.tab || "missing_citation"
                    };
                }
            }
        }

        return fallback;
    }

    ensureValidationColumn(selectorInfo) {
        const col_id = selectorInfo && selectorInfo.col_id;
        const panel = this.Panel;

        if (!panel || typeof panel.querySelector !== "function" || !col_id) {
            this.logError("checkItems", new Error("Validation panel is not available"));
            return null;
        }

        const escaped =
            typeof CSS !== "undefined" && CSS.escape ?
            CSS.escape(col_id) :
            col_id.replace(/([^\w-])/g, "\\$1");
        const findById = (root) =>
            (root && root.querySelector("#" + escaped)) ||
            (root && root.querySelector(`[id="${col_id}"]`)) ||
            null;

        let columnContainer = findById(panel);
        if (columnContainer) {
            return columnContainer;
        }

        const entryInfo = this.getValidationEntryInfo(selectorInfo);
        const tab = entryInfo.tab || (selectorInfo && selectorInfo.tab) || "missing_citation";
        const Container = this.getTabContainer(tab);

        if (!Container) {
            this.logError("checkItems", new Error(`Validation container not found for ${col_id}`));
            return null;
        }

        const rowId = entryInfo.row_id || (selectorInfo && selectorInfo.row_id);

        if (rowId) {
            const rowEscaped =
                typeof CSS !== "undefined" && CSS.escape ?
                CSS.escape(rowId) :
                rowId.replace(/([^\w-])/g, "\\$1");
            const existingRow =
                Container.querySelector("#" + rowEscaped) ||
                panel.querySelector("#" + rowEscaped) ||
                panel.querySelector(`[id="${rowId}"]`);
            if (existingRow) existingRow.remove();
        }

        const {
            row,
            column
        } = this.createValidationEntry(entryInfo.title, rowId, col_id);
        Container.appendChild(row);

        // Prefer lookup on the container that received the node, then panel
        columnContainer = findById(Container) || findById(panel) || column;

        if (!columnContainer || !panel.contains(columnContainer)) {
            // Last resort: recreate and append again
            if (row.parentNode) row.remove();
            const rebuilt = this.createValidationEntry(entryInfo.title, rowId, col_id);
            Container.appendChild(rebuilt.row);
            columnContainer = findById(Container) || findById(panel) || rebuilt.column;
        }

        if (!columnContainer || !panel.contains(columnContainer)) {
            this.logError("checkItems", new Error(`Validation column not found for ${col_id}`));
            return null;
        }

        return columnContainer;
    }

    runCitationCheck(element, id, label, selectorInfo, columnContainer, spinner) {
        let citations = this.selectorCountArray(id, true);

        if (citations.isEmpty) {
            if (spinner) spinner.remove();

            const shouldIgnore = selectorInfo.mandatory_class_list.includes(element.$.className) ?
                this.shouldIgnoreElement(element, selectorInfo) :
                true;

            if (!shouldIgnore) {
                this.recordIssue({
                    label,
                    id
                }, selectorInfo.tab || "missing_citation");
            }

            const text = shouldIgnore ?
                this.qcMsg("runtime.ignore_item", {}, "This item was ignored based on rules.").replace(/\.$/, "") :
                this.qcMsg("runtime.not_cited", {
                    label: label || ""
                }, `${label || ""} not cited anywhere in the document.`).replace(/\.$/, "");

            columnContainer.append(this.GetFragment(
                `<p class="${shouldIgnore ? "ignore" : "missing"}-items" data-id="${id}">${text}.</p>`
            ));
        }

        this.available_citation_list.push({
            label,
            id,
            count: citations.count
        });

        return citations.count;
    }

    /** Singular/plural ignore summary copy. */
    formatIgnoreSummaryText(count) {
        const n = Math.max(0, Number(count) || 0);
        if (n === 1) return this.qcMsg("runtime.ignore_one", {}, "1 item was ignored based on rules.");
        return this.qcMsg("runtime.ignore_many", {
            count: n
        }, `${n} items were ignored based on rules.`);
    }

    /** Append a clickable ignore row for an editor element (collapsed later per section). */
    appendIgnoredItemRow(columnContainer, id) {
        const safeId = this.escapeHtmlAttr(id || "");
        const text = this.qcMsg("runtime.ignore_item", {}, "This item was ignored based on rules.");
        columnContainer.append(this.GetFragment(
            `<p class="ignore-items" data-id="${safeId}">${text}</p>`
        ));
    }

    /**
     * Collapse identical p.ignore-items rows in a section into one summary with data-ids.
     * Does not merge with missing/pass rows. Leaves non-matching copy (e.g. name-date skip) alone.
     */
    collapseIdenticalIgnoreRows(columnContainer) {
        try {
            if (!columnContainer || typeof columnContainer.querySelectorAll !== "function") return;

            const rows = Array.from(columnContainer.querySelectorAll("p.ignore-items"));
            if (rows.length === 0) return;

            const groups = new Map();
            rows.forEach((row) => {
                const text = (row.textContent || "").trim();
                if (!text) return;
                if (!groups.has(text)) groups.set(text, []);
                groups.get(text).push(row);
            });

            groups.forEach((groupRows, text) => {
                // Only collapse the standard per-item ignore sentence (or already-collapsed summaries).
                const ignoreItem = this.qcMsg("runtime.ignore_item", {}, "This item was ignored based on rules.");
                const isStandard =
                    text === ignoreItem ||
                    text === this.formatIgnoreSummaryText(1) ||
                    /^\d+ item(?:s were| was) ignored based on rules\.$/.test(text);
                if (!isStandard) return;
                if (groupRows.length === 1 && groupRows[0].getAttribute("data-ids")) return;

                const ids = [];
                groupRows.forEach((row) => {
                    const multi = row.getAttribute("data-ids");
                    if (multi) {
                        multi.split(",").filter(Boolean).forEach((id) => ids.push(id));
                    } else {
                        const one = row.getAttribute("data-id");
                        if (one) ids.push(one);
                    }
                });

                if (ids.length === 0 && groupRows.length <= 1) return;

                const first = groupRows[0];
                const summaryText = this.formatIgnoreSummaryText(ids.length || groupRows.length);
                const safeIds = ids.map((id) => this.escapeHtmlAttr(id)).join(",");
                const firstId = this.escapeHtmlAttr(ids[0] || "");

                first.setAttribute("data-ids", safeIds);
                if (firstId) first.setAttribute("data-id", firstId);
                first.removeAttribute("data-id-cycle");
                first.textContent = summaryText;

                for (let i = 1; i < groupRows.length; i++) {
                    groupRows[i].remove();
                }
            });
        } catch (err) {
            this.logError("collapseIdenticalIgnoreRows", err);
        }
    }

    /** One summary ignore row for a list of ids (early all-ignored path). */
    appendCollapsedIgnoreSummary(columnContainer, ids) {
        const list = (ids || []).filter(Boolean);
        if (list.length === 0) return;
        const safeIds = list.map((id) => this.escapeHtmlAttr(id)).join(",");
        const firstId = this.escapeHtmlAttr(list[0]);
        const text = this.formatIgnoreSummaryText(list.length);
        columnContainer.append(this.GetFragment(
            `<p class="ignore-items" data-id="${firstId}" data-ids="${safeIds}">${text}</p>`
        ));
    }

    runDoubleSpaceCheck(element, id, columnContainer, spinner, tab) {
        if (spinner) spinner.remove();

        if (this.checkDoubleSpaces(element)) {
            const tagType = element.getName().toLowerCase() === "insert" ? "insert" : "delete";

            columnContainer.append(this.GetFragment(
                `<p class="missing-items" data-id="${id}">${this.qcMsg("runtime.double_space", { tagType }, `
                Double spaces found in $ {
                    tagType
                }
                tag.
                `)}</p>`
            ));

            this.recordIssue({
                label: `Double Space in ${tagType}`,
                id
            }, tab || "text_related");
            return true;
        }

        return false;
    }
    runDuplicateIDCheck(element, id, columnContainer, spinner, tab) {
        if (spinner) spinner.remove();

        const selector = `[id="${id}"]:not([data-remove])`;
        const refs = this.selectorCountArray(selector, false);

        if (refs.count > 1) {
            columnContainer.append(this.GetFragment(
                `<p class="missing-items" data-id="${id}">${this.qcMsg("runtime.duplicate_id_count", { id, count: refs.count }, `
                Duplicate ID "${id}"
                found($ {
                        refs.count
                    }
                    times).
                `)}</p>`
            ));

            this.recordIssue({
                label: `Duplicate Reference ID`,
                id
            }, tab || "dtd_error");

            return true;
        }

        return false;
    }

    runBrokenXrefCheck(element, columnContainer, spinner, tab) {
        if (spinner) spinner.remove();

        const ridAttr = element.getAttribute("rid");
        if (!ridAttr) return false;

        const xrefId = (element.getId && element.getId()) || ridAttr;
        const labelText = (element.$ && element.$.textContent) ?
            String(element.$.textContent).trim().replace(/\s+/g, " ").slice(0, 80) :
            "";
        let foundBroken = false;

        ridAttr.trim().split(/\s+/).forEach((ridPart) => {
            if (!ridPart) return;
            const dest = this.selectorCountArray(`[id="${ridPart}"]:not([data-remove])`, false);
            if (!dest || dest.isEmpty) {
                const sample = labelText || ridPart;
                columnContainer.append(this.GetFragment(
                    `<p class="missing-items" data-id="${xrefId}" data-rid="${ridPart}">${this.qcMsg("runtime.broken_xref", { sample, rid: ridPart }, `
                    Broken xref "${sample}"→
                    missing destination id "${ridPart}".
                    `)}</p>`
                ));
                this.recordIssue({
                    label: this.qcMsg("runtime.broken_xref_label", {
                        rid: ridPart
                    }, `Broken xref → ${ridPart}`),
                    id: xrefId,
                    rid: ridPart
                }, tab || "dtd_error");
                foundBroken = true;
            }
        });

        return foundBroken;
    }

    runUnusedDestinationCheck(element, id, label, columnContainer, spinner, tab) {
        if (spinner) spinner.remove();
        if (!id) return false;

        const citations = this.selectorCountArray(id, true);
        if (citations && citations.isEmpty) {
            const display = label || id;
            columnContainer.append(this.GetFragment(
                `<p class="missing-items" data-id="${id}">Unused destination "${display}" (no live xref).</p>`
            ));
            this.recordIssue({
                label: `Unused destination: ${display}`,
                id
            }, tab || "dtd_error");
            return true;
        }

        return false;
    }

    // ==========================================
    // Citation Order helpers + runners
    // ==========================================

    getDomNode(el) {
        return el && (el.$ || el);
    }

    getXrefNavId(domNode) {
        if (!domNode) return "";
        return domNode.getAttribute("id") ||
            domNode.getAttribute("rid") ||
            "";
    }

    getXrefCiteText(domNode) {
        if (!domNode) return "";
        return String(domNode.textContent || "").trim().replace(/\s+/g, " ");
    }

    normalizeCiteDisplay(text) {
        return String(text || "")
            .replace(/\s+/g, "")
            .replace(/[–—]/g, "-")
            .replace(/;/g, ",");
    }

    /**
     * Parse numeric cite text (e.g. "3", "1,3,6", "9-11", "9–11").
     * Returns null for non-numeric / name-date style text.
     */
    parseCiteNumbers(text) {
        const raw = String(text || "").trim();
        if (!raw) return null;
        if (/[a-zA-Z]/.test(raw)) return null;

        const nums = [];
        const parts = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        if (parts.length === 0) return null;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const rangeMatch = part.match(/^(\d+)\s*[–\-]\s*(\d+)$/);
            if (rangeMatch) {
                const start = Number(rangeMatch[1]);
                const end = Number(rangeMatch[2]);
                if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
                    return {
                        nums: [],
                        raw,
                        invalidRange: true
                    };
                }
                for (let n = start; n <= end; n++) nums.push(n);
            } else if (/^\d+$/.test(part)) {
                nums.push(Number(part));
            } else {
                return null;
            }
        }
        return {
            nums,
            raw
        };
    }

    isStrictlyAscending(nums) {
        if (!nums || nums.length < 2) return true;
        for (let i = 1; i < nums.length; i++) {
            if (!(nums[i] > nums[i - 1])) return false;
        }
        return true;
    }

    areXrefsClusterAdjacent(fromEl, toEl) {
        try {
            if (!fromEl || !toEl || fromEl === toEl) return false;
            const range = document.createRange();
            range.setStartAfter(fromEl);
            range.setEndBefore(toEl);
            if (!/^[\s,;\[\]\(\)]*$/.test(range.toString())) return false;

            const doc = fromEl.ownerDocument || document;
            const all = doc.querySelectorAll("a.xref");
            for (let i = 0; i < all.length; i++) {
                const x = all[i];
                if (x === fromEl || x === toEl) continue;
                if (fromEl.contains(x) || toEl.contains(x)) continue;
                const afterFrom = !!(fromEl.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING);
                const beforeTo = !!(toEl.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_PRECEDING);
                if (afterFrom && beforeTo) return false;
            }
            return true;
        } catch (err) {
            return false;
        }
    }

    clusterAdjacentXrefs(domNodes) {
        const clusters = [];
        let current = [];
        for (let i = 0; i < domNodes.length; i++) {
            const node = domNodes[i];
            if (current.length === 0) {
                current.push(node);
                continue;
            }
            const prev = current[current.length - 1];
            if (this.areXrefsClusterAdjacent(prev, node)) {
                current.push(node);
            } else {
                clusters.push(current);
                current = [node];
            }
        }
        if (current.length > 0) clusters.push(current);
        return clusters;
    }

    getCitationOrderFormatter() {
        if (!this._citationOrderFormatter) {
            this._citationOrderFormatter = new RangeFormatter({
                consecutiveThreshold: 3
            });
        }
        return this._citationOrderFormatter;
    }

    appendCitationOrderIssue(columnContainer, id, message, tab, clusterKey) {
        const safeId = this.escapeHtmlAttr(id || "");
        const clusterAttr = clusterKey ?
            ` data-unique-cluster="${this.escapeHtmlAttr(clusterKey)}"` :
            "";
        columnContainer.append(this.GetFragment(
            `<p class="missing-items" data-rid="${safeId}"${clusterAttr}>${message}</p>`
        ));
        this.recordIssue({
            label: message,
            id: id || "",
            clusterKey: clusterKey || undefined
        }, tab || "citation_order");
    }

    /** Stamp a shared data-unique-cluster key on every DOM xref in a cluster. */
    stampUniqueCluster(cluster) {
        let clusterKey = typeof GENERATE_ID === "function" ? (GENERATE_ID() || "") : "";
        if (!clusterKey) {
            clusterKey = "cluster-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
        }
        for (let i = 0; i < (cluster || []).length; i++) {
            const node = cluster[i];
            if (node && typeof node.setAttribute === "function") {
                node.setAttribute("data-unique-cluster", clusterKey);
            }
        }
        return clusterKey;
    }

    /**
     * Validate ascending + ranging for one sibling cluster of numeric xrefs.
     * @returns {boolean} true if any issue recorded
     */
    validateCiteNumberCluster(cluster, columnContainer, tab, labelPrefix) {
        const texts = [];
        const nums = [];
        let anyNumeric = false;
        let invalidRange = false;
        let firstId = "";

        for (let i = 0; i < cluster.length; i++) {
            const node = cluster[i];
            if (!firstId) firstId = this.getXrefNavId(node);
            const parsed = this.parseCiteNumbers(this.getXrefCiteText(node));
            if (!parsed) continue;
            anyNumeric = true;
            if (parsed.invalidRange) {
                invalidRange = true;
                texts.push(parsed.raw);
                continue;
            }
            texts.push(parsed.raw);
            for (let j = 0; j < parsed.nums.length; j++) {
                nums.push(parsed.nums[j]);
            }
        }

        if (!anyNumeric) return false;

        const prefix = labelPrefix || "Citation";
        const issues = [];
        const textsJoined = texts.join(", ");

        if (invalidRange) {
            issues.push(this.qcMsg("runtime.cite_invalid_range", {
                prefix,
                texts: textsJoined
            }, `${prefix} has an invalid numeric range: "${textsJoined}".`));
        }

        if (nums.length >= 2 && !this.isStrictlyAscending(nums)) {
            issues.push(this.qcMsg("runtime.cite_not_ascending", {
                prefix,
                texts: textsJoined
            }, `${prefix} cluster is not ascending: "${textsJoined}".`));
        }

        if (nums.length >= 2) {
            const formatter = this.getCitationOrderFormatter();
            const expected = formatter.formatRanges(nums.slice());
            const actual = texts.join(",");
            const normalizedActual = this.normalizeCiteDisplay(actual);
            const normalizedExpected = this.normalizeCiteDisplay(expected);
            if (expected && normalizedActual !== normalizedExpected) {
                issues.push(this.qcMsg("runtime.cite_ranging_mismatch", {
                    prefix,
                    actual,
                    expected
                }, `${prefix} ranging mismatch: found "${actual}", expected "${expected}".`));
            }
        }

        if (issues.length === 0) return false;

        const clusterKey = this.stampUniqueCluster(cluster);
        for (let i = 0; i < issues.length; i++) {
            this.appendCitationOrderIssue(columnContainer, firstId, issues[i], tab, clusterKey);
        }
        return true;
    }

    /**
     * Single jump-to-editor binder for QC issue rows (avoids repeated onclick copies).
     * @param {HTMLElement} columnContainer
     * @param {{ itemSelector?: string, skipSelector?: string }} [options]
     */
    bindIssueJumpClicks(columnContainer, options = {}) {
        if (!columnContainer || typeof columnContainer.querySelectorAll !== "function") return;
        const itemSelector = options.itemSelector || ".missing-items,.ignore-items,.qc-collation-row";
        const skipSelector = options.skipSelector || ".qc-open-verify";
        const self = this;

        columnContainer.querySelectorAll(itemSelector).forEach((item, idx) => {
            // Pass rows are informational only — never bind jumps.
            if (item.classList && item.classList.contains("passing-items")) return;
            if (item.classList && item.classList.contains("qc-collation-stats")) return;

            item.onclick = (e) => {
                try {
                    if (skipSelector && e.target && e.target.closest && e.target.closest(skipSelector)) {
                        return;
                    }

                    // Collapsed ignore rows: cycle through data-ids on each click.
                    const idsAttr = item.getAttribute("data-ids");
                    if (idsAttr) {
                        const ids = idsAttr.split(",").filter(Boolean);
                        if (ids.length > 0) {
                            let cycle = parseInt(item.getAttribute("data-id-cycle") || "0", 10) || 0;
                            const idVal = ids[cycle % ids.length];
                            item.setAttribute("data-id", idVal);
                            item.setAttribute("data-id-cycle", String((cycle + 1) % ids.length));
                        }
                    }

                    const selector = self.getTargetSelector(item, columnContainer);
                    if (!selector || typeof GlobalEditor === "undefined" || !GlobalEditor.document) return;
                    const findCollection = GlobalEditor.document.find(selector);
                    const element = findCollection.getItem(0) || findCollection.getItem(idx);
                    if (element) {
                        if (typeof element.scrollIntoView === "function") {
                            element.scrollIntoView({
                                block: "nearest",
                                inline: "nearest"
                            });
                        }
                        GlobalEditor.getSelection().selectElement(element);
                    }
                } catch (err) {
                    self.logError("bindIssueJumpClicks", err);
                }
            };
        });
    }

    wireCitationOrderClicks(columnContainer) {
        this.bindIssueJumpClicks(columnContainer, {
            itemSelector: ".missing-items,.ignore-items"
        });
    }

    runCitationOrderBibrCheck(selectorInfo, columnContainer, spinner) {
        debug.log("runCitationOrderBibrCheck");
        try {
            const tab = (selectorInfo && selectorInfo.tab) || "citation_order";

            if (typeof iREF_SCOPE !== "undefined" && iREF_SCOPE.IS_NAME_DATE) {
                if (spinner) spinner.remove();
                columnContainer.innerHTML =
                    '<p class="ignore-items">Skipped for name-date reference style.</p>';
                return;
            }

            const selector = (selectorInfo && selectorInfo.selector) || 'a.xref[data-role="bibr"]:not([data-remove]):not([data-delete])';
            const elements = this.selectorCountArray(selector, false);
            if (!elements || !elements.array || elements.array.length === 0) {
                columnContainer.innerHTML = `<p class="na-items">${this.qcMsg("runtime.not_available", {}, "Not available.")}</p>`;
                return;
            }

            if (spinner) spinner.remove();

            const domNodes = elements.array
                .map((el) => this.getDomNode(el))
                .filter((node) => {
                    if (!node || !node.getAttribute) return false;
                    if (node.hasAttribute("data-remove") || node.hasAttribute("data-delete")) return false;
                    return true;
                });

            const clusters = this.clusterAdjacentXrefs(domNodes);
            let anyIssue = false;

            for (let i = 0; i < clusters.length; i++) {
                if (this.validateCiteNumberCluster(clusters[i], columnContainer, tab, this.qcMsg("runtime.cite_prefix_ref", {}, "Reference citation"))) {
                    anyIssue = true;
                }
            }

            if (!anyIssue) {
                columnContainer.innerHTML = `<p class="passing-items">${this.qcMsg("runtime.all_ref_clusters_ok", {}, "All reference citation clusters are in ascending order.")}</p>`;
            }

            this.wireCitationOrderClicks(columnContainer);
        } catch (err) {
            this.logError("runCitationOrderBibrCheck", err);
        }
    }

    parseNoteLabelNumber(noteEl) {
        if (!noteEl) return null;
        let labelText = "";
        if (noteEl.hasAttribute && noteEl.hasAttribute("data-label")) {
            labelText = noteEl.getAttribute("data-label") || "";
        }
        if (!labelText) {
            const labelNode = noteEl.querySelector && noteEl.querySelector(".label");
            if (labelNode) labelText = String(labelNode.textContent || "").trim();
        }
        if (!labelText && typeof this.getLabel === "function") {
            labelText = this.getLabel(noteEl, "") || "";
        }
        const match = String(labelText).match(/(\d+)/);
        return match ? Number(match[1]) : null;
    }

    runCitationOrderNotesCheck(selectorInfo, columnContainer, spinner) {
        try {
            const tab = (selectorInfo && selectorInfo.tab) || "citation_order";
            const NOTE_ROLES = ["fn", "en", "endnote", "end-note", "endNotes"];
            const roleSelector = NOTE_ROLES
                .map((r) => `a.xref[data-role="${r}"]:not([data-remove]):not([data-delete])`)
                .join(",");
            const selector = (selectorInfo && selectorInfo.selector) || roleSelector;
            const elements = this.selectorCountArray(selector, false);

            if (!elements || !elements.array || elements.array.length === 0) {
                columnContainer.innerHTML = `<p class="na-items">${this.qcMsg("runtime.not_available", {}, "Not available.")}</p>`;
                return;
            }

            if (spinner) spinner.remove();

            const domNodes = elements.array
                .map((el) => this.getDomNode(el))
                .filter((node) => {
                    if (!node || !node.getAttribute) return false;
                    if (node.hasAttribute("data-remove") || node.hasAttribute("data-delete")) return false;
                    const role = node.getAttribute("data-role") || "";
                    return NOTE_ROLES.indexOf(role) !== -1;
                });

            let anyIssue = false;
            const ridMap = {};

            // Repeat citation: same note rid cited from more than one live location
            for (let i = 0; i < domNodes.length; i++) {
                const node = domNodes[i];
                const ridAttr = (node.getAttribute("rid") || "").trim();
                if (!ridAttr) continue;
                const rids = ridAttr.split(/\s+/).filter(Boolean);
                for (let r = 0; r < rids.length; r++) {
                    const rid = rids[r];
                    if (!ridMap[rid]) ridMap[rid] = [];
                    ridMap[rid].push(node);
                }
            }

            Object.keys(ridMap).forEach((rid) => {
                const xrefs = ridMap[rid];
                if (xrefs.length > 1) {
                    anyIssue = true;
                    this.appendCitationOrderIssue(
                        columnContainer,
                        this.getXrefNavId(xrefs[0]) || rid,
                        `Note "${rid}" is cited from ${xrefs.length} locations (expected one).`,
                        tab
                    );
                }
            });

            // Cite text must match target label; first-appearance order must be sequential
            const firstAppearanceLabels = [];
            const seenRids = {};

            for (let i = 0; i < domNodes.length; i++) {
                const node = domNodes[i];
                const ridAttr = (node.getAttribute("rid") || "").trim();
                if (!ridAttr) continue;
                const primaryRid = ridAttr.split(/\s+/).filter(Boolean)[0];
                if (!primaryRid) continue;

                const dest = this.selectorCountArray(
                    `[id="${primaryRid}"]:not([data-remove]):not([data-delete])`,
                    false
                );
                const target = dest && dest.array && dest.array[0] ?
                    this.getDomNode(dest.array[0]) :
                    null;
                if (!target) continue;

                const labelNum = this.parseNoteLabelNumber(target);
                const citeParsed = this.parseCiteNumbers(this.getXrefCiteText(node));

                if (citeParsed && !citeParsed.invalidRange && citeParsed.nums.length === 1 && labelNum != null) {
                    if (citeParsed.nums[0] !== labelNum) {
                        anyIssue = true;
                        this.appendCitationOrderIssue(
                            columnContainer,
                            this.getXrefNavId(node) || primaryRid,
                            this.qcMsg("runtime.note_cite_mismatch", {
                                raw: citeParsed.raw,
                                labelNum,
                                rid: primaryRid
                            }, `Note cite text "${citeParsed.raw}" does not match target label "${labelNum}" (${primaryRid}).`),
                            tab
                        );
                    }
                } else if (citeParsed && citeParsed.invalidRange) {
                    anyIssue = true;
                    this.appendCitationOrderIssue(
                        columnContainer,
                        this.getXrefNavId(node) || primaryRid,
                        this.qcMsg("runtime.note_cite_invalid_range", {
                            raw: citeParsed.raw
                        }, `Note cite has an invalid numeric range: "${citeParsed.raw}".`),
                        tab
                    );
                }

                if (!seenRids[primaryRid] && labelNum != null) {
                    seenRids[primaryRid] = true;
                    firstAppearanceLabels.push({
                        rid: primaryRid,
                        labelNum,
                        id: this.getXrefNavId(node) || primaryRid
                    });
                }
            }

            for (let i = 1; i < firstAppearanceLabels.length; i++) {
                const prev = firstAppearanceLabels[i - 1];
                const curr = firstAppearanceLabels[i];
                if (!(curr.labelNum > prev.labelNum)) {
                    anyIssue = true;
                    this.appendCitationOrderIssue(
                        columnContainer,
                        curr.id,
                        this.qcMsg("runtime.note_first_cite_order", {
                            curr: curr.labelNum,
                            prev: prev.labelNum
                        }, `Note first-cite order is not sequential: label ${curr.labelNum} appears after ${prev.labelNum}.`),
                        tab
                    );
                }
            }

            // Sibling note cite clusters: same ascending + ranging rules as bibr
            const clusters = this.clusterAdjacentXrefs(domNodes);
            for (let i = 0; i < clusters.length; i++) {
                if (clusters[i].length < 2) continue;
                if (this.validateCiteNumberCluster(clusters[i], columnContainer, tab, this.qcMsg("runtime.cite_prefix_note", {}, "Note citation"))) {
                    anyIssue = true;
                }
            }

            if (!anyIssue) {
                columnContainer.innerHTML =
                    `<p class="passing-items">${this.qcMsg("runtime.all_note_citations_ok", {}, "All foot/end note citations are sequential.")}</p>`;
            }

            this.wireCitationOrderClicks(columnContainer);
        } catch (err) {
            this.logError("runCitationOrderNotesCheck", err);
        }
    }

    // ==========================================
    // Comments & Queries — collation pending
    // ==========================================

    getEditorDocumentRoot() {
        try {
            if (typeof GlobalEditor !== "undefined" && GlobalEditor && GlobalEditor.document) {
                return GlobalEditor.document.$ || GlobalEditor.document;
            }
            if (typeof CKEDITOR !== "undefined" && CKEDITOR.instances && CKEDITOR.instances.maineditor) {
                const doc = CKEDITOR.instances.maineditor.document;
                return doc && (doc.$ || doc);
            }
        } catch (err) {
            this.logError("getEditorDocumentRoot", err);
        }
        return null;
    }

    escapeHtmlAttr(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    getCollationSummaryCounts() {
        const counts = {
            pending: 0,
            holding: 0,
            approved: 0,
            other: 0
        };
        try {
            const root = this.getEditorDocumentRoot();
            if (!root || typeof root.querySelectorAll !== "function") return counts;
            const nodes = root.querySelectorAll('[data-class="ckcommentsfull"][data-collation-status]');
            for (let i = 0; i < nodes.length; i++) {
                const status = String(nodes[i].getAttribute("data-collation-status") || "").trim().toLowerCase();
                if (status === "pending") counts.pending++;
                else if (status === "holding") counts.holding++;
                else if (status === "approved") counts.approved++;
                else if (status) counts.other++;
            }
        } catch (err) {
            this.logError("getCollationSummaryCounts", err);
        }
        return counts;
    }

    /**
     * Prefer queryModule.getCollationPendingQueries(); DOM fallback for pending|holding.
     * @returns {Array<{id:string,label:string,status:string,collationStatus:string}>}
     */
    resolveCollationPendingItems() {
        try {
            const qm = typeof window !== "undefined" ? window.queryModule : null;
            if (qm && qm._state && typeof qm.resolvePanelFilterStatus === "function") {
                try {
                    if (typeof qm.syncStateWithEditorElements === "function") {
                        qm.syncStateWithEditorElements();
                    }

                    const queryItems = qm._state.queries && typeof qm._state.queries.values === "function" ?
                        Array.from(qm._state.queries.values()) : [];
                    const commentItems = qm._state.comments && typeof qm._state.comments.values === "function" ?
                        Array.from(qm._state.comments.values()) : [];

                    return queryItems.concat(commentItems).filter((item) => {
                        if (!item) return false;
                        if (typeof qm._isDeletedItem === "function" && qm._isDeletedItem(item)) return false;
                        return qm.resolvePanelFilterStatus(item) === "open";
                    }).map((item) => {
                        const fromDom = item.editorEl && typeof item.editorEl.getAttribute === "function" ?
                            item.editorEl.getAttribute("data-collation-status") :
                            null;
                        const rawStatus = String(item.status || "").toLowerCase();
                        const isComment = rawStatus === "comment" || /^C/i.test(item.label || "");
                        return {
                            id: item.id || "",
                            label: item.label || item.id || "",
                            status: isComment ? "Comment" : "Query",
                            collationStatus: (fromDom != null && String(fromDom).trim() !== "") ?
                                String(fromDom).trim() : (item.collationStatus || "pending")
                        };
                    });
                } catch (err) {
                    this.logError("resolveCollationPendingItems-queryModule", err);
                }
            }

            const domItems = [];

            // DOM fallback: pending|holding; skip approved/deleted.
            try {
                const root = this.getEditorDocumentRoot();
                if (!root || typeof root.querySelectorAll !== "function") {
                    return domItems;
                } else {
                    const nodes = root.querySelectorAll('[data-class="ckcommentsfull"][data-collation-status]');
                    for (let i = 0; i < nodes.length; i++) {
                        const node = nodes[i];
                        if (node.hasAttribute("data-deleted") || node.hasAttribute("data-deleted-by")) continue;

                        const collation = String(node.getAttribute("data-collation-status") || "").trim();
                        if (!collation || /^approved$/i.test(collation)) continue;
                        if (!/pending|holding/i.test(collation)) continue;

                        const dataLabel = node.getAttribute && node.getAttribute("data-label");
                        const rawText = (node.textContent || "").replace(/\s+/g, " ").trim();
                        const safeLabel = dataLabel || rawText || node.getAttribute("id") || node.getAttribute("del_id") || "";

                        domItems.push({
                            id: node.getAttribute("id") || node.getAttribute("del_id") || "",
                            label: safeLabel,
                            status: node.getAttribute("data-status") || "",
                            collationStatus: collation
                        });
                    }
                }
            } catch (err) {
                this.logError("resolveCollationPendingItems-dom", err);
            }

            return domItems;
        } catch (err) {
            this.logError("resolveCollationPendingItems-api", err);
        }
        return [];
    }

    wireCollationPendingClicks(columnContainer) {
        this.bindIssueJumpClicks(columnContainer, {
            itemSelector: ".missing-items,.qc-collation-row",
            skipSelector: ".qc-open-verify"
        });

        if (!columnContainer || typeof columnContainer.querySelectorAll !== "function") return;
        columnContainer.querySelectorAll(".qc-open-verify").forEach((btn) => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    const id = btn.getAttribute("data-id") || "";
                    const qm = typeof window !== "undefined" ? window.queryModule : null;
                    if (qm && typeof qm.openVerifyDialog === "function") {
                        qm.openVerifyDialog(id || null, {
                            forceOpen: true,
                            reply: true
                        });
                    }
                } catch (err) {
                    this.logError("wireCollationPendingClicks-verify", err);
                }
            };
        });
    }

    runCollationPendingCheck(selectorInfo, columnContainer, spinner) {
        try {
            const tab = (selectorInfo && selectorInfo.tab) || "comments_queries";
            if (spinner) spinner.remove();

            // Ensure messages.json bag is available before qcMsg header rendering.
            // (qcMsg already has fallbacks, but this warms the cache for correct i18n.)
            try {
                if (typeof this.getModuleMessages === 'function') this.getModuleMessages();
            } catch (_) {
                /* ignore */
            }

            const pendingItems = this.resolveCollationPendingItems();
            const overallPending = pendingItems && pendingItems.length || 0;

            const summaryHtml =
                `<div class="qc-collation-stats ignore-items">` +
                `<span class="qc-stat"><strong>${this.qcMsg("runtime.stat_pending", {}, "Pending:")}</strong> ${overallPending}</span>` +
                `</div>`;

            if (!pendingItems || pendingItems.length === 0) {
                columnContainer.innerHTML =
                    summaryHtml +
                    `<p class="passing-items">${this.qcMsg("runtime.no_pending_collation", {}, "No pending collation items.")}</p>`;
                this.updateTabConfirmState();
                return;
            }

            const canVerify = !this.isQcTrackReadonly() &&
                typeof window !== "undefined" &&
                window.queryModule &&
                typeof window.queryModule.openVerifyDialog === "function";

            let tableHtml =
                '<table class="table table-sm table-bordered mb-2 qc-collation-table">' +
                `<thead><tr><th>${this.qcMsg("runtime.th_label", {}, "Label")}</th><th>${this.qcMsg("runtime.th_status", {}, "Status")}</th><th>${this.qcMsg("runtime.th_collation", {}, "Collation")}</th>` +
                (canVerify ? `<th>${this.qcMsg("runtime.th_action", {}, "Action")}</th>` : "") +
                "</tr></thead><tbody>";

            pendingItems.forEach((item) => {
                const id = item.id || "";
                const label = item.label || id || "";
                const status = item.status || "";
                const collation = item.collationStatus || "pending";
                const safeId = this.escapeHtmlAttr(id);
                const safeLabel = this.escapeHtmlAttr(label);
                // Make status display user-friendly (API/DOM values can be raw query/comment/etc).
                const statusDisplay =
                    /^query$/i.test(String(status)) ? 'Query' :
                    /^comment$/i.test(String(status)) ? 'Comment' :
                    status;
                const safeStatus = this.escapeHtmlAttr(statusDisplay);
                const safeCollation = this.escapeHtmlAttr(collation);

                tableHtml +=
                    `<tr class="missing-items qc-collation-row" data-id="${safeId}">` +
                    `<td>${safeLabel}</td>` +
                    `<td>${safeStatus}</td>` +
                    `<td>${safeCollation}</td>`;
                if (canVerify) {
                    tableHtml +=
                        `<td><button type="button" class="btn btn-sm primary-btn qc-open-verify" data-id="${safeId}">${this.qcMsg("runtime.open_verify", {}, "Open verify")}</button></td>`;
                }
                tableHtml += "</tr>";

                this.recordIssue({
                    label: this.qcMsg("runtime.collation_pending_label", {
                        label: label || id
                    }, `Collation pending: ${label || id}`),
                    id
                }, tab);
            });

            tableHtml += "</tbody></table>";
            columnContainer.innerHTML = summaryHtml + tableHtml;
            this.wireCollationPendingClicks(columnContainer);
            this.updateTabConfirmState();
        } catch (err) {
            this.logError("runCollationPendingCheck", err);
        }
    }

    // ==========================================
    // HELPER METHOD: shouldIgnoreBibliography
    // ==========================================
    shouldIgnoreBibliography(refNode) {
        if (!refNode || !refNode.closest) return false;

        // Step 1: Find closest .ref-list
        var refList = refNode.closest('.ref-list');
        if (!refList) return false;

        if (refList.parentElement && refList.parentElement.classList.contains('ref-list')) refList = refList.parentElement;

        // Step 2: Check if this ref-list has a title containing "Bibliography"
        const title = refList.querySelector('.title');

        if (title && title.textContent && title.textContent.indexOf('Bibliography') !== -1) {
            // ❌ Ignore (Bibliography section)
            return true;
        }

        // ✅ Proceed with validation
        return false;
    }

    // ==========================================
    // HELPER METHOD: shouldIgnoreElement (single ignore API)
    // ==========================================
    /**
     * Whether an element should be ignored for QC checks / missing-cite display.
     * Accepts CKEDITOR.dom.element or native DOM. Supports ignore.closest (fn|array),
     * ignore.querySelector, ignore.textContent. Bibliography string uses shouldIgnoreBibliography.
     */
    shouldIgnoreElement(element, selectorInfo) {
        try {
            if (!selectorInfo || !selectorInfo.ignore) return false;

            const node = element && (element.$ || element);
            if (!node) return false;

            const ignore = selectorInfo.ignore;

            if (ignore.closest !== undefined) {
                if (typeof ignore.closest === "function") {
                    if (ignore.closest(node) === true) return true;
                } else if (Array.isArray(ignore.closest)) {
                    for (let i = 0; i < ignore.closest.length; i++) {
                        const selector = ignore.closest[i];
                        if (selector === "bibliography" || selector === "Bibliography") {
                            if (this.shouldIgnoreBibliography(node)) return true;
                        } else if (typeof node.closest === "function" && node.closest(selector)) {
                            return true;
                        }
                    }
                }
            }

            if (Array.isArray(ignore.querySelector) && typeof node.querySelector === "function") {
                if (ignore.querySelector.some((sel) => node.querySelector(sel))) return true;
            }

            if (Array.isArray(ignore.textContent) && node.textContent) {
                const text = String(node.textContent);
                if (ignore.textContent.some((part) => text.includes(part))) return true;
            }

            return false;
        } catch (err) {
            this.logError("shouldIgnoreElement", err);
            return false;
        }
    }

    // ==========================================
    // UPDATED checkItems METHOD
    // ==========================================
    checkItems(selectorInfo) {
        let issueTab = selectorInfo && selectorInfo.tab || "missing_citation";
        try {
            const {
                process,
                selector,
                ignore,
                tab
            } = selectorInfo;


            issueTab = tab || "missing_citation";
            const isCitationChecking = process === "citation_checking";
            const isDoubleSpace = process === "double_space";
            const isDuplicateID = process === "duplicate_ids";
            const isBrokenXref = process === "xref_destination";
            const isUnusedDestination = process === "unused_destination";
            const isCitationOrderBibr = process === "citation_order_bibr";
            const isCitationOrderNotes = process === "citation_order_notes";
            const isCollationPending = process === "collation_pending";

            const columnContainer = this.ensureValidationColumn(selectorInfo);
            if (!columnContainer) {
                return;
            }

            const spinner = columnContainer.querySelector(".spinner-border");

            if (isCitationOrderBibr || isCitationOrderNotes || isCollationPending) {
                if (isCitationOrderBibr) {
                    this.runCitationOrderBibrCheck(selectorInfo, columnContainer, spinner);
                } else if (isCitationOrderNotes) {
                    this.runCitationOrderNotesCheck(selectorInfo, columnContainer, spinner);
                } else {
                    this.runCollationPendingCheck(selectorInfo, columnContainer, spinner);
                }
                this.updateTabConfirmState();
                return;
            }

            const elements = this.selectorCountArray(selector, false);

            if (elements.array.length === 0) {
                columnContainer.innerHTML = `<p class="na-items">${this.qcMsg("runtime.not_available", {}, "Not available.")}</p>`;
                this.updateTabConfirmState();
                return;
            }

            // Early exit if all items are ignored — one summary ignore row + optional pass header
            if ((isCitationChecking || isUnusedDestination) && ignore) {
                const allIgnored = elements.array.every(el => this.shouldIgnoreElement(el, selectorInfo));
                if (allIgnored) {
                    if (spinner) spinner.remove();
                    columnContainer.innerHTML = isCitationChecking ?
                        `<p class="passing-items">${this.qcMsg("runtime.all_cited", {}, "All items were cited.")}</p>` :
                        '';
                    const ignoredIds = [];
                    elements.array.forEach((el) => {
                        if (el.hasAttribute("data-remove") || el.hasAttribute("data-delete")) return;
                        ignoredIds.push(this.resolveOrStampElementId(el));
                    });
                    this.appendCollapsedIgnoreSummary(columnContainer, ignoredIds);
                    this.updateTabConfirmState();
                    this.bindIssueJumpClicks(columnContainer);
                    return;
                }
            }

            const IdsCollectionMap = new Map();
            const defaultValue = "NO-LABEL";
            let anyIssueFound = false;

            elements.array.forEach((element, index, array) => {
                if (element.hasAttribute("data-remove") || element.hasAttribute("data-delete")) return;

                const id = this.resolveOrStampElementId(element);

                let label = "";
                if (element.hasAttribute("data-qc-label")) {
                    label = element.getAttribute("data-qc-label");
                } else {
                    label = this.getLabel(element.$, defaultValue) || "";
                    if (label && isCitationChecking) element.setAttribute("data-qc-label", label);
                }

                const key = id || label;
                if (!key && !isBrokenXref) return;

                if (isCitationChecking) {
                    if (this.shouldIgnoreElement(element, selectorInfo)) {
                        if (spinner) spinner.remove();
                        this.appendIgnoredItemRow(columnContainer, id);
                        return;
                    }

                    this.runCitationCheck(element, id, label, selectorInfo, columnContainer, spinner);

                    if (index === array.length - 1 && columnContainer.querySelector(".spinner-border")) {
                        const spinnerEl = columnContainer.querySelector(".spinner-border");
                        if (spinnerEl) spinnerEl.remove();
                        const hasMissing = columnContainer.querySelector(".missing-items");
                        const hasIgnore = columnContainer.querySelector(".ignore-items");
                        if (!hasMissing && !hasIgnore) {
                            columnContainer.innerHTML = `<p class="passing-items">${this.qcMsg("runtime.all_cited", {}, "All items were cited.")}</p>`;
                        }
                    }
                } else if (isDoubleSpace) {
                    const found = this.runDoubleSpaceCheck(element, id, columnContainer, spinner, issueTab);
                    if (found) anyIssueFound = true;
                    if (!found && index === array.length - 1 && !anyIssueFound) {
                        columnContainer.innerHTML = `<p class="passing-items">${this.qcMsg("runtime.no_double_spaces", {}, "No double spaces found in insert or delete tags.")}</p>`;
                    }
                } else if (isDuplicateID) {
                    if (IdsCollectionMap.has(key)) {
                        const oldValue = IdsCollectionMap.get(key);
                        this.duplicate_items_list.push(
                            `<p class="missing-items" data-id="${id}">${label} and ${oldValue} have same id.</p>`
                        );
                    } else {
                        const storedValue = label === defaultValue ? `${defaultValue}_${index}` : label;
                        IdsCollectionMap.set(key, storedValue);
                    }

                    const found = this.runDuplicateIDCheck(element, id, columnContainer, spinner, issueTab);
                    if (found) anyIssueFound = true;

                    if (index === array.length - 1) {
                        if (this.duplicate_items_list.length > 0) {
                            const html = this.duplicate_items_list.join("");
                            columnContainer.append(this.GetFragment(html));
                            return;
                        }
                        if (!anyIssueFound) {
                            columnContainer.innerHTML = `<p class="passing-items">${this.qcMsg("runtime.no_duplicate_ids", {}, "No duplicate IDs found in this section.")}</p>`;
                        }
                    }
                } else if (isBrokenXref) {
                    const found = this.runBrokenXrefCheck(element, columnContainer, spinner, issueTab);
                    if (found) anyIssueFound = true;
                    if (index === array.length - 1 && !anyIssueFound) {
                        columnContainer.innerHTML = `<p class="passing-items">${this.qcMsg("runtime.all_xref_ok", {}, "All xref targets resolve.")}</p>`;
                    }
                } else if (isUnusedDestination) {
                    if (this.shouldIgnoreElement(element, selectorInfo)) {
                        if (spinner) spinner.remove();
                        return;
                    }
                    const found = this.runUnusedDestinationCheck(element, id, label, columnContainer, spinner, issueTab);
                    if (found) anyIssueFound = true;
                    if (index === array.length - 1 && !anyIssueFound) {
                        columnContainer.innerHTML = `<p class="passing-items">${this.qcMsg("runtime.all_destinations_ok", {}, "All destinations are referenced.")}</p>`;
                    }
                }
            });

            this.collapseIdenticalIgnoreRows(columnContainer);
            this.updateTabConfirmState();
            this.bindIssueJumpClicks(columnContainer);
        } catch (err) {
            this.logError("checkItems", err);
        } finally {
            this.markQcTabState(issueTab, "done");
            this.updateTabConfirmState();
        }
    }
    getTargetSelector(el, columnContainer) {
        const colId = (columnContainer && columnContainer.id) || "";
        const clusterKey = el.getAttribute && el.getAttribute("data-unique-cluster");
        if (/^cite_ord_/.test(colId) && clusterKey) {
            return `[data-unique-cluster="${clusterKey}"]`;
        }
        if (/xref_broken_col_01/.test(colId) || /^cite_ord_/.test(colId)) {
            const rid = el.getAttribute("data-rid");
            if (rid) return `[rid="${rid}"]`;
            const idVal = el.getAttribute("data-id");
            if (idVal) return `[id="${idVal}"],[data-id="${idVal}"]`;
            return null;
        }
        const val = el.getAttribute("data-id");
        return `[id="${val}"],[data-id="${val}"]`;
    }

    selectorCountArray(selector, isXref = false, options = {}) {
        try {

            const finalSelector = isXref ?
                commonMethods.xrefSelectorBuilder(selector) :
                selector;

            let elementsArray = [];

            if (isXref) {
                // missingItemSelector returns ARRAY of filtered cites
                elementsArray = commonMethods.missingItemSelector(finalSelector, {
                    exists: true
                }) || [];
            } else {
                // CKEditor returns NodeList → convert to array
                const el = CKEDITOR.instances.maineditor.document.find(finalSelector);
                elementsArray = el.toArray();
            }

            return {
                count: elementsArray.length,
                array: elementsArray,
                isEmpty: elementsArray.length === 0
            };

        } catch (err) {
            this.logError("selectorCountArray", err);
        }
    }

    getLabel(element, defaultVal = "NO-LABEL") {
        try {
            if (element.classList.contains("label") && element.closest(".disp-formula")) {
                return "EQ " + element.textContent;
            }
            if (element.hasAttribute("data-label")) {
                return element.getAttribute("data-label");
            }
            if (!element.querySelector(".caption[data-label]") && $(element).find(".label").length > 0) {
                return getTxt($(element).find(".label"));
            }
            if (element.querySelector(".caption")) {
                const captionLabel = element.querySelector(".caption").getAttribute("data-label");
                return captionLabel != null ? captionLabel : defaultVal;
            }
            if (element.querySelector(".mixed-citation") || element.classList.contains("ref")) {
                if (iREF_SCOPE.IS_NAME_DATE) {
                    if (element.id && typeof namedCitation == "function") {
                        var results = new namedCitation([element.id]);
                        if (results && results.CHRON_ASCEND && results.CHRON_ASCEND.length > 0) {
                            return results.CHRON_ASCEND[0].citation_txt_org.indirect;
                        }
                    } else {
                        return defaultVal;
                    }
                } else {
                    return getTxt($(element).find(".label"));
                }
            }
            return defaultVal;
        } catch (err) {
            this.logError('getLabel', err);
        }
    }
    storeRecord() {
        try {
            console.log("----store_record----");
            commonfn.internal_audit_record = (e, t = {}) => {
                try {
                    console.log(e);
                } catch (err) {
                    this.logError('internal_audit_record', err);
                }
            };
            var remarkValue = this.args.InputComments.value;
            var missingData = JSON.stringify(this.process_items_list);
            const tabSummary = {};
            const confirmedTabs = {};
            (this.QC_TABS || []).forEach((tab) => {
                tabSummary[tab] = this.getTabErrorCount(tab);
                const checkbox = this.Panel && this.Panel.querySelector(`#qc_confirm_${tab}`);
                confirmedTabs[tab] = !!(checkbox && checkbox.checked);
            });
            const recordData = Object.assign({}, GET_JSON("default"), {
                tbl: "common",
                recordtype: "qualityCheckerDialog",
                journal_short_title: SHORT_TITLE,
                journal_title: SHARED_KEY.projecttitle,
                remarks: remarkValue,
                missing_cite_ids: missingData,
                qc_tab_summary: JSON.stringify(tabSummary),
                qc_tab_confirmed: JSON.stringify(confirmedTabs)
            });

            if (!this.last_remark_response || Object.keys(this.last_remark_response).length === 0) {
                commonfn.callajax(recordData, "internal_audit_record", API_UPDATE_INSERT);
            } else if (this.last_remark_response.remarks != remarkValue) {
                recordData.find = {
                    _id: this.last_remark_response.id
                };
                recordData.update = {
                    "remarks": remarkValue,
                    "process_items_list": missingData,
                    "qc_tab_summary": JSON.stringify(tabSummary),
                    "qc_tab_confirmed": JSON.stringify(confirmedTabs)
                };
                commonfn.callajax(recordData, "internal_audit_record", API_FIND_UPDATE_INSERT);
            }

            this.closeDialog();

            if (IS_EDITOR_PAGE) {
                if (typeof window.openFinalizeDialog === 'function') {
                    window.openFinalizeDialog();
                } else if (window.FinalizeDialog && typeof FinalizeDialog.show === 'function') {
                    FinalizeDialog.show();
                }
            }
        } catch (err) {
            this.logError('storeRecord', err);
        }
    }

    async fire() {
        try {
            console.log("---fire---");
            const {
                InputComments
            } = this.args;
            let CloseDialog = false;
            if (this.process_items_list.length > 0) {
                const confirmState = this.areErroredTabsConfirmed();
                if (!confirmState.ok) {
                    this.activateQcTab(confirmState.tab);
                    if (confirmState.checkbox) {
                        confirmState.checkbox.focus();
                        confirmState.checkbox.classList.add("is-invalid");
                    }
                    console.log("return to dialog - tab confirm required");
                    return;
                }

                if (InputComments.value.length < 20) {
                    InputComments.focus();
                    InputComments.classList.add("is-invalid");
                    console.log("return to dialog");
                    return;
                } else CloseDialog = true;
            } else CloseDialog = true;


            // ? use pre-computed value from showLoop
            var canProceed = IS_EDITOR_PAGE && USER_INFO.ROLE_ID === ROLE_IDS.CO;
            if (typeof window.paraManager !== "undefined" && /OHO|OSO|OXMEDO/gi.test(commonMethods.getClientCode({
                    format: "upper"
                })) && canProceed) {
                if (this.books_new_elements_presented) {
                    CloseDialog = true;
                    if (this.books_new_elements_presented.length > 0) {
                        CloseDialog = false;
                        await window.paraManager.processNewElementsWithAlert(
                            this.books_new_elements_presented, {
                                finalize: true
                            }
                        );
                    }
                }

            }

            if (CloseDialog) {
                this.storeRecord();
                this.closeDialog();
                if (IS_EDITOR_PAGE) {
                    setTimeout(() => {
                        if (typeof window.openFinalizeDialog === 'function') {
                            window.openFinalizeDialog();
                        } else if (window.FinalizeDialog && typeof FinalizeDialog.show === 'function') {
                            FinalizeDialog.show();
                        }
                    }, 1000);
                }
            }
        } catch (err) {
            this.logError('fire', err);
        }
    }
}


export default QcValidationCore;