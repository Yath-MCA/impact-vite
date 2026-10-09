class CheckOrder {
    constructor(config = "bibr") {
        this.get = {
            fn: "id",
            ref: "id",
            xref: "rid",
        };
        this.global_xref = 'a.xref[data-role]:not([data-remove])';
        this.global_float_role = ['fig', 'table'];
        this.global_valid_role = ['bibr', 'fig', 'table', 'fn', "en"];
        this.global_ignore_role = ['app', 'aff', 'corresp', 'table-fn', 'sec'];

        // Default configuration
        this.default_config = {
            bibr: {
                _role: "bibr",
                id_prefix: "CIT",
                append_root: ".ref-list",
                find: {
                    xref: 'a.xref[data-role="bibr"]:not([data-remove])',
                    item: `.ref:not([data-remove])`,
                    item_all_item: `.ref`,
                    label: {
                        query: ".label",
                        textVal: true,
                    }
                },
                valid_role: ["bibr"],
                loop_role: ['fig', 'table']
            },
            fn: {
                _role: "fn",
                id_prefix: "fn",
                alert_txt: "notes",
                append_root: ".fn-group",
                find: {
                    xref: 'a.xref[data-role="fn"]:not([data-remove])',
                    item: `.fn:not([data-remove]):not([data-delete])`,
                    item_all_item: `.fn`,
                    label: {
                        query: ".label",
                        textVal: true,
                    }
                },
                retain_non_numeric_label: false,
                renumber_policy: {
                    item_id: false,
                    citation_rid: false,
                    label: true,
                    cite_text: true,
                    cite_lookup_by_text: true
                },
                valid_role: ['fn', 'endnote', 'end-note', 'footnote'],
                loop_role: []
            },
            fig: {
                _role: "fig",
                id_prefix: "fig",
                append_root: ".fig-list",
                find: {
                    xref: [`a[ref-type='fig']`],
                    // span.label
                    item: [`div.fig[id]`],
                    item_all_item: `.fig`,
                    label: {
                        query: ".caption[data-label]",
                        attrKey: "data-label"
                    }
                },
                renumber_policy: {
                    item_id: false,
                    citation_rid: false,
                    label: true,
                    cite_text: true,
                    cite_lookup_by_text: true
                },
                valid_role: ['fig'],
                loop_role: []
            },
            table: {
                _role: "table",
                id_prefix: "table-wrap",
                append_root: ".table-wrap",
                find: {
                    xref: [`a[ref-type='table']`],
                    // span.label
                    item: [`div.table-wrap[id]`],
                    item_all_item: `.table-wrap`,
                    label: {
                        query: ".caption[data-label]",
                        attrKey: "data-label"
                    }
                },
                renumber_policy: {
                    item_id: false,
                    citation_rid: false,
                    label: true,
                    cite_text: true,
                    cite_lookup_by_text: true
                },
                valid_role: ['table'],
                loop_role: []
            }
        };


        this.currentConfig = {};

        // Set the root_selector based on the config
        this.setCurrentConfig(config);
        this.formatter = new RangeFormatter({});
        this._trackManager = new trackManager(GlobalEditor) || window._trackManager;
    }

    logError(functionName, error) {
        console.warn(`Error in ${functionName}: ${error.message}`);
        ErrorLogTrace(`CheckOrder ${functionName}`, error.message);
    }

    setCurrentConfig(config) {
        try {
            if (typeof config === 'string') {
                // If config is a string, use it as a key for default_config
                this.currentConfig = this.default_config[config] || this.default_config.bibr;
            } else if (typeof config === 'object' && config !== null) {
                // If config is an object, merge it with the default config
                this.currentConfig = this.mergeConfigs(this.default_config.bibr, config);
            } else {
                // Default to bibr config
                this.currentConfig = this.default_config.bibr;
            }
        } catch (err) {
            this.logError('setCurrentConfig', err);
        }
    }

    mergeConfigs(defaultConfig, userConfig) {
        try {
            const mergedConfig = {
                ...defaultConfig
            };
            for (const [key, value] of Object.entries(userConfig)) {
                if (typeof value === 'object' && value !== null) {
                    mergedConfig[key] = this.mergeConfigs(mergedConfig[key] || {}, value);
                } else {
                    mergedConfig[key] = value;
                }
            }
            return mergedConfig;
        } catch (err) {
            this.logError('mergeConfigs', err);
        }
    }

    parsePolicyBool(value, defaultValue) {
        if (value === undefined || value === null || value === '') return defaultValue;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') return !/^(false|0|no|off)$/i.test(value.trim());
        return Boolean(value);
    }

    setRenumberPolicy(groupConfig = {}) {
        try {
            const has = (key) => groupConfig[key] !== undefined && groupConfig[key] !== null && groupConfig[key] !== '';
            const policy = this.currentConfig.renumber_policy || {};
            const next = {
                ...policy
            };

            if (has('renumberItemId')) next.item_id = this.parsePolicyBool(groupConfig.renumberItemId, false);
            if (has('renumberCitationRid')) next.citation_rid = this.parsePolicyBool(groupConfig.renumberCitationRid, false);
            if (has('renumberLabel')) next.label = this.parsePolicyBool(groupConfig.renumberLabel, true);
            if (has('renumberCiteText')) next.cite_text = this.parsePolicyBool(groupConfig.renumberCiteText, true);
            if (has('citeLookupByText')) next.cite_lookup_by_text = this.parsePolicyBool(groupConfig.citeLookupByText, true);

            this.currentConfig.renumber_policy = next;
        } catch (err) {
            this.logError('setRenumberPolicy', err);
        }
    }

    resolveRenumberPolicy() {
        if (IS_JOURNAL) {
            return {
                renumberItemId: true,
                renumberCitationRid: true,
                renumberLabel: true,
                renumberCiteText: true,
                citeLookupByText: false
            };
        }

        const cfg = this.currentConfig.renumber_policy || {};
        return {
            renumberItemId: this.parsePolicyBool(cfg.item_id, false),
            renumberCitationRid: this.parsePolicyBool(cfg.citation_rid, false),
            renumberLabel: this.parsePolicyBool(cfg.label, true),
            renumberCiteText: this.parsePolicyBool(cfg.cite_text, true),
            citeLookupByText: this.parsePolicyBool(cfg.cite_lookup_by_text, true)
        };
    }

    shouldRenumberItemId(element) {
        const policy = this.resolveRenumberPolicy();
        if (!policy.renumberItemId) return false;
        element = element && (element[0] || element.$ || element);
        // if (element && !element.hasAttribute('data-new')) return false;
        return true;
    }

    reset() {
        this.items = [];
        this.unlinked_items = [];
        this.xrefs = [];
        this.deleted_items = [];
        this.extra_items = [];
        this.invalid_entries = [];
        this.reOrder = false;
        this.instance_id = new Date().getTime();
        this.history = {
            [this.instance_id]: {
                reset: true,
                forLoop: false,
                check_seq: false
            }
        };
    }

    /**
     * Build validation report for check-only mode
     * @returns {Object} - { valid: boolean, errors: Array, stats: Object }
     */
    buildCheckReport() {
        const errors = this.invalid_entries.map(entry => ({
            type: entry.type,
            text: entry.text,
            rid: entry.rid
        }));

        // Build orphaned citations (xrefs without matching items)
        this.xrefs.forEach(xref => {
            const hasItem = this.items.some(item => item.label === xref.Original);
            if (!hasItem) {
                errors.push({
                    type: 'orphanedCite',
                    rid: xref.OriginalID,
                    label: xref.Original,
                    renumbered: xref.Renumbered
                });
            }
            const renumbered = String(xref.Renumbered || '').trim();
            if (!xref.OriginalID || !renumbered || !Number.isFinite(Number(renumbered))) {
                errors.push({
                    type: 'missingRenumberTarget',
                    rid: xref.OriginalID,
                    label: xref.Original,
                    renumbered: xref.Renumbered
                });
            }
        });

        // Build orphaned items (items without matching xrefs, including unlinked)
        this.items.forEach(item => {
            const hasXref = this.xrefs.some(xref => xref.Original === item.label);
            if (!hasXref) {
             errors.push({
                type: 'orphanedItem',
                id: (item && item.element && item.element.id) || (item && item.label),
                label: item && item.label,
                seqNo: item && item.SeqNo
            });

         }
     });

        // Add unlinked items as orphaned (notes without any body citations)
        this.unlinked_items.forEach(unlinkedLabel => {
            const alreadyReported = errors.some(e => e.type === 'orphanedItem' && e.label === unlinkedLabel);
            if (!alreadyReported) {
                errors.push({
                    type: 'orphanedItem',
                    id: unlinkedLabel,
                    label: unlinkedLabel,
                    unlinked: true
                });
            }
        });

        // Check sequence gaps
        // SeqNo is 0-based (index in citation order), expected label is 1-based
        if (!this.proper_sequence) {
            const sortedItems = [...this.items].sort((a, b) => a.SeqNo - b.SeqNo);
            sortedItems.forEach(item => {
                if (item.SeqNo !== -1) {
                    // 0-based SeqNo → 1-based label
                    const expectedLabel = item.SeqNo + 1;
                    const actualLabel = parseInt(item.label, 10);
                    if (actualLabel !== expectedLabel) {
                        errors.push({
                            type: 'sequenceGap',
                            expected: expectedLabel,
                            found: actualLabel,
                            seqNo: item.SeqNo,
                            id: (item && item.element && item.element.id),
                            label: item.label
                        });
                    }
                }
            });
        }

        // Check label mismatches: item's current label should match xref's assigned Renumbered
        this.xrefs.forEach(xref => {
            const item = this.items.find(i => i.label === xref.Original);
            if (item && xref.Renumbered) {
                const itemLabelNum = parseInt(item.label, 10);
                const renumberedNum = parseInt(xref.Renumbered, 10);
                if (itemLabelNum !== renumberedNum) {
                    errors.push({
                        type: 'labelMismatch',
                        id: (item && item.element && item.element.id),
                        expectedLabel: xref.Renumbered,
                        currentLabel: item.label,
                        originalLabel: xref.Original
                    });
                }
            }
        });

        // Add generic sequence error if proper_sequence is false but no specific gaps found
        // This can happen when items are in wrong order but labels appear sequential
        if (!this.proper_sequence && !errors.some(e => e.type === 'sequenceGap')) {
            errors.push({
                type: 'sequenceDisorder',
                message: 'Items are not in proper citation order',
                itemCount: this.items.length,
                xrefCount: this.xrefs.length
            });
        }

        // Build stats
        const stats = {
            totalCites: this.xrefs.length,
            totalItems: this.items.length,
            orphanedCites: errors.filter(e => e.type === 'orphanedCite').length,
            orphanedItems: errors.filter(e => e.type === 'orphanedItem').length,
            sequenceGaps: errors.filter(e => e.type === 'sequenceGap').length,
            labelMismatches: errors.filter(e => e.type === 'labelMismatch').length,
            invalidCitationLabels: errors.filter(e => e.type === 'invalidCitationLabel' || e.type === 'emptyCitationLabel').length,
            missingRenumberTargets: errors.filter(e => e.type === 'missingRenumberTarget').length,
            properSequence: this.proper_sequence,
            unlinkedItems: this.unlinked_items.length
        };

        return {
            valid: errors.length === 0 && this.proper_sequence,
            errors,
            stats
        };
    }

    revertOriginalXref() {
        try {
            const {
                xref: xrefSelector,
                item: itemSelector
            } = this.currentConfig.find;


        } catch (err) {
            this.logError('revertOriginalXref', err);
        }
    }

    handleXref(el, elKey, lab, rawValue = lab) {
        try {
            const normalizedLabel = String(lab || '').trim();
            if (!normalizedLabel || !Number.isFinite(Number(normalizedLabel))) {
                this.invalid_entries.push({
                    type: String(rawValue || '').trim() ? 'invalidCitationLabel' : 'emptyCitationLabel',
                    text: String(rawValue || '').trim(),
                    rid: el.getAttribute('rid') || ''
                });
                return;
            }

            lab = parseInt(normalizedLabel, 10).toString();
            const tempCheck = this.isExist(this[elKey], 'Original', lab);
            if (!tempCheck) {
                this[elKey].push({
                    Original: lab,
                    OriginalID: "",
                    Renumbered: "",
                    index: 0,
                    id: "",
                });
            }
        } catch (err) {
            this.logError('handleXref', err);
        }
    }

    handleItem(el, elKey, lab) {
        try {
            const labelElement = el.querySelector(".label");
            lab = labelElement ? labelElement.textContent : "";
            lab = lab.replace(/[^\d]/g, "");

            const entry = this.isExist(this.xrefs, "Original", lab);

            if (!this.isExist(this[elKey], 'label', lab)) {

                var rootEl = el.closest(this.currentConfig._role === "fn" ? ".sec,.fn-group" : ".ref-list");
                var rootId = rootEl && rootEl.id;

                this[elKey].push({
                    label: lab,
                    element: el,
                    SeqNo: -1,
                    parent: el.parentElement,
                    rootId: rootId,
                    rootEl: rootEl
                });
            }

            if (entry) {
                entry["OriginalID"] = el.id.trim();
            } else {
                this.unlinked_items.push(lab || el.id.trim());
                this.xrefs.push({
                    Original: lab,
                    OriginalID: el.id.trim(),
                    Renumbered: '',
                    index: 0,
                    id: ''
                });
            }
        } catch (err) {
            this.logError('handleItem', err);
        }
    }

    forLoop(el) {
        try {
            const elKey = el.className;
            const findKey = this.get[elKey];
            const IS_XREF = /xref/.test(elKey);
            const policy = this.resolveRenumberPolicy();
            const attrVal = el.getAttribute(findKey) || '';
            const tempVal = (IS_XREF && policy.citeLookupByText) ?
            el.textContent.trim() :
            attrVal;
            const split = tempVal.split(" ");
            split.forEach(rid => {
                let lab = rid.replace(/[^\d.]/g, "");
                if (IS_XREF) {
                    this.handleXref(el, "xrefs", lab, rid);
                } else {
                    this.handleItem(el, "items", lab);
                }
            });
        } catch (err) {
            debug.log(el);
            this.logError('forLoop', err);
        }
    }

    checkSeq() {
        try {
            this.xrefs.forEach((el, index) => {
                el.Renumbered = index + 1;
                el.index = index;
            });

            this.xrefs.forEach(xref => {
                this.items.forEach(item => {
                    if (item.label === xref.Original) {
                        item.SeqNo = xref.index;
                    }
                });
            });

            this.proper_sequence = this.items.every((item, index) =>
                item.SeqNo === index && parseInt(item.label) === (index + 1)
                );

            Object.assign(this.history[this.instance_id], {
                proper_sequence: this.proper_sequence,
                check_seq: true,
                unlinked_items: this.unlinked_items
            });
        } catch (err) {
            this.logError('checkSeq', err);
        }
    }

    reorderFire(ItemsRoot, citeRoot, Options = {}) {
        try {
            const editorDoc = GlobalEditor.document;
            const {
                reNumber
            } = Options;
            const {
                _role,
                find
            } = this.currentConfig;

            // Skip if no renumbering needed or sequence already correct
            if (!reNumber || this.proper_sequence) return;

            const findAllItems = find.item_all_item;

            // Sort notes by sequence number
            this.items.sort((a, b) => a.SeqNo - b.SeqNo);

            // Build a set of tracked elements for faster lookup
            const trackedElements = new Set([
                ...this.items.map(item => item.element),
                ...this.deleted_items
            ]);

            // Collect elements marked for deletion
            ItemsRoot.find(findAllItems).toArray().forEach((item, idx) => {
                let entry = null;

                const hasDeleteAttr = item.hasAttribute('data-remove') || item.hasAttribute('data-delete');

                if (hasDeleteAttr) {
                    const el = item.$;
                    // Avoid duplicates
                    if (!this.deleted_items.includes(el)) {

                        // Decide what to append based on context
                        entry = el.closest(".p") ? el.closest(".p") : el;

                        if (entry.hasAttribute("data-org-idx")) {
                            debug.log(`Element already has data-org-idx: ${entry.getAttribute("data-org-idx")}`);
                        } else {
                            entry.setAttribute("data-org-idx", idx);
                        }

                        this.deleted_items.push(entry);
                    }
                }

                // Remove from DOM if part of trackedElements
                if (entry && trackedElements.has(entry)) {
                    commonMethods.removeEl(entry);
                }
            });

            // Re-append sorted items in correct order
            try {
                this.items.forEach(el => {
                    const {
                        parent,
                        rootEl,
                        rootId,
                        element
                    } = el;
                    const node = parent.className == "p" ? parent : element;
                    if (rootEl) {
                        rootEl.appendChild(node);
                    } else {
                        if (IS_LOCAL_HOST) debugger;
                    }
                });
            } catch (err) {
                console.log(err.message);
            }


            // Renumber items and citations
            this.renumberItems(ItemsRoot, findAllItems);
            this.renumberCitations(citeRoot);

            // Append deleted items (if any)
            this.appendDeletedItems(ItemsRoot);

            // Update history state
            this.history[this.instance_id].can_reorder = true;

        } catch (err) {
            this.logError('reorderFire', err);
        }
    }


    getNext(id) {
        const parts = id.split("-");
        return parts
        .slice(0, -1)
        .concat(`${parseInt(parts.pop(), 10) + 1}`)
        .join("-");
    }

    renumberItems(editorDoc, findKey) {
        if (IS_LOCAL_HOST) {
            debugger;
        }
        try {
            const policy = this.resolveRenumberPolicy();
            this._item_que.forEach((item) => {
                const data_json = this.isExist(this.xrefs, 'OriginalID', item.$.id);
                if (!data_json) return;
                const newId = policy.renumberItemId ? this.getNewId(data_json.index, item.$.id) : item.$.id;
                data_json.id = newId;

                const isNotSameLab = String(data_json.Original) !== String(data_json.Renumbered);
                if (policy.renumberLabel && isNotSameLab) {

                    this.updateLabel(item.$, {
                        new_id: newId,
                        new_lab: data_json.Renumbered
                    });
                }
            });
        } catch (err) {
            this.logError('renumberItems', err);
        }
    }
    reWork() {
        try {
            GlobalEditor.document.find("a.xref[data-role='fn']").toArray().forEach((el) => {
                const $el = $(el.$);
                const supText = $el.find("sup.sup").text();
                const rid = supText.padStart(4, '0');
                console.log(supText, rid);
                $el.attr("rid", `fn${rid}`);
                if (supText == $el.attr("data-del-val")) {
                    $el.removeAttr("data-del-val");
                }
            });

        } catch (error) {

        }
    }
    renumberCitations() {

        // if (IS_LOCAL_HOST) {
        //     debugger;
        // }
        try {
            const policy = this.resolveRenumberPolicy();
            this._cite_que.forEach(elm => {
                const cite_rid = elm.getAttribute("rid");
                let cite_new_txt = "";
                let cite_new_rid = "";

                const ridParts = cite_rid ? cite_rid.split(' ') : [];
                if (policy.citeLookupByText && ridParts.length === 0) {
                    const visibleTxt = elm.getText().trim();
                    if (visibleTxt) ridParts.push(visibleTxt);
                }

                ridParts.forEach(txt => {
                    let data_json = this.isExist(this.xrefs, 'OriginalID', txt);
                    if (!data_json && !policy.renumberCitationRid) {
                        const lab = txt.replace(/[^\d.]/g, "");
                        data_json = this.isExist(this.xrefs, 'Original', lab);
                    }
                    if (!data_json) return;

                    cite_new_rid = cite_new_rid.concat(' ', data_json.id);
                    cite_new_txt = cite_new_txt.concat(' ', data_json.Renumbered);
                });
                const renumberedText = cite_new_txt.trim();
                if (!renumberedText) return;
                const tempTxt = renumberedText.split(" ").map(Number).sort((a, b) => a - b);
                cite_new_txt = this.formatter.formatRanges(tempTxt);
                cite_new_rid = cite_new_rid.trim();
                const currentTxt = (elm.findOne('sup') || elm).getText().trim();
                const finalRid = policy.renumberCitationRid ? cite_new_rid : (cite_rid || cite_new_rid);
                const needsUpdate = policy.renumberCitationRid ?
                (cite_new_txt && cite_rid !== cite_new_rid) :
                (policy.renumberCiteText && cite_new_txt && currentTxt !== cite_new_txt);
                if (needsUpdate) {
                    this.updateCitation(elm, cite_new_txt, finalRid);
                }
            });
        } catch (err) {
            this.logError('renumberCitations', err);
        }
    }

    appendDeletedItems(root) {
        try {
            this.deleted_items.forEach(item => {
                // Normalize the element (in case it's wrapped or raw)
                let element = item[0] || item.$ || item;

                // Check for child element with [del_id] and use that if available
                const elWithDelId = element.querySelector("[del_id]");
                const processEl = elWithDelId || element;

                const del_rid = processEl.getAttribute("del_id");
                // Try to get data-org-idx from element itself, otherwise from closest parent
                let del_idx = null;

                if (processEl) {
                    // First check the element itself
                    del_idx = processEl.getAttribute("data-org-idx");

                    // If not found, look up the DOM tree for the nearest ancestor with data-org-idx
                    if (del_idx === null) {
                        const parentWithIdx = processEl.closest("[data-org-idx]");
                        if (parentWithIdx) {
                            del_idx = parentWithIdx.getAttribute("data-org-idx");
                        }
                    }
                }



                // Normalize attributes: move `id` to `del_id` if not already present
                if (processEl.hasAttribute("id")) {
                    if (!processEl.hasAttribute("del_id")) {
                        processEl.setAttribute("del_id", processEl.getAttribute("id"));
                    }
                    processEl.removeAttribute("id");
                }

                // Try to find the original sibling using del_id, fallback to last in appendGroup
                let siblingNode = del_rid ? root.findOne(`[id="${del_rid}"]`) : null;

                // If del_idx is valid, override siblingNode with indexed child
                const appendGroup = element.closest(".sec,.fn-group");
                if (appendGroup) {
                    const children = appendGroup.children;

                    if (!siblingNode && del_idx !== null && !isNaN(del_idx)) {
                        const idx = parseInt(del_idx, 10);
                        // Defensive check: ensure index is within bounds
                        if (idx >= 0 && idx < children.length) {
                            // use array-style access, not getItem
                            siblingNode = children[idx];
                        }
                    }
                }

                if (!siblingNode && appendGroup) siblingNode = appendGroup.lastElementChild;

                if (siblingNode) {
                    // If a label with an insert exists and has odata-value, restore its text
                    const label = processEl.querySelector(".label");
                    const insertEl = label && label.querySelector("insert");

                    if (insertEl && label.hasAttribute("odata-value")) {
                        label.textContent = label.getAttribute("odata-value");
                    }

                    // Determine where to insert the restored element
                    const finalEl = (siblingNode.$ && siblingNode.$.closest(".p")) || siblingNode.$ || siblingNode;
                    if (finalEl) finalEl.after(element);
                    else debug.warn("deleted item remain at top of the group");
                }
            });

        } catch (err) {
            this.logError('appendDeletedItems', err);
        }
    }


    returnValidEl(root, selector, isItem) {
        try {
            const validRoles = [...this.currentConfig.valid_role, ...(this.currentConfig.loop_role || [])];
            const {
                retain_non_numeric_label,
                find
            } = this.currentConfig;

            try {

                const findArray = root.find(selector).toArray();
                const filterResults = findArray.filter(el => this.isValidElement(el, validRoles, retain_non_numeric_label, isItem));

                // Difference: items in findArray but not in filterResults
                const difference = findArray.filter(el => !filterResults.includes(el));

                if (!isItem) {
                    difference.forEach(el => {
                        const role = el.getAttribute('data-role') || el.getAttribute('ref-type');
                        const labelText = String(el.getText() || '').trim();
                        if (validRoles.includes(role) && !this.isInDeletedSection(el)) {
                            this.invalid_entries.push({
                                type: labelText ? 'invalidCitationLabel' : 'emptyCitationLabel',
                                text: labelText,
                                rid: el.getAttribute('rid') || ''
                            });
                        }
                    });
                }

                debug.log('filter:', findArray.length);
                debug.log('Valid:', filterResults.length);
                debug.log('Excluded:', difference.length);
                debug.log('Excluded elements:', difference);

                return filterResults;

            } catch (err) {
                this.logError('returnValidEl', err);
                return [];
            }
        } catch (err) {
            this.logError('returnValidEl', err);
        }
    }

    isValidElement(el, validRoles, retainNonNumeric, isItem) {
        try {
            let role;

            if (isItem) {
                role = el.getAttribute('data-name');
            } else {
                role = el.getAttribute('data-role') || el.getAttribute('ref-type');
            }

            const labelText = isItem ? this.getItemLabelText(el) : el.getText();

            const isValidLabel = retainNonNumeric ?
            !!(labelText && labelText.trim() !== "") :
            !!(labelText && labelText.trim() !== "" && !isNaN(labelText));

            const isDeletedItem = this.isInDeletedSection(el);
            const isValidRole = validRoles.includes(role);

            return isValidRole && isValidLabel && !isDeletedItem;
        } catch (err) {
            this.logError('isValidElement', err);
            return false;
        }
    }

    getItemLabelText(el) {
        const {
            query,
            textVal,
            attrKey
        } = this.currentConfig.find.label;
        const labelEl = el.findOne(query);
        return labelEl ? attrKey ? labelEl.getAttribute(attrKey) : labelEl.getText() : null;
    }

    isInDeletedSection(el) {
        return el.getParent().getName() === "del" || el.getAscendant('del') || el.getAscendant('del') || el.hasAttribute('data-remove') || el.hasAttribute('data-delete');
    }


    fireOnce(editor, options = {}, addParams = {}) {
        try {

            const {
                reNumber,
                cite_root,
                items_root,
                delId
            } = options;

            this.reset();

            let citeRoot, ItemRoot;
            let editorDoc = (editor && editor.document) || GlobalEditor.document;

            citeRoot = ItemRoot = editorDoc;

            if (!IS_JOURNAL) {
                const chapCount = paraManager.globalRegistry.countersByChapter.size;
                if (this.currentConfig._role === "fn") {
                    ItemRoot = editorDoc.getById(items_root.id);
                    citeRoot = cite_root.id ? editorDoc.getById(cite_root.id) : editorDoc.findOne('.xmlcontentroot');
                }
            }

            // Gather elements
            this._item_que = this.returnValidEl(ItemRoot, this.currentConfig.find.item, true);
            this._cite_que = this.returnValidEl(citeRoot, this.global_xref);
            this._collection = [...this._cite_que, ...this._item_que];

            this._collection.forEach(el => {
                this.forLoop(el.$);
                /* 
                const _role = el.getAttribute("data-role");
                if (this.currentConfig.valid_role.includes(_role)) {
                    this.forLoop(el.$);
                } 
                    */
            });
            this.history[this.instance_id].forLoop = true;
            this.checkSeq();

            // Check-only mode: return validation results without modifying
            if (options.checkOnly) {
                return this.buildCheckReport();
            }

            if (reNumber) {

                let results = {};

                // Run reorder if no unlinked items OR forced
                if (this.unlinked_items.length === 0 || options.force) {
                    results = this.reorderFire(ItemRoot, citeRoot, options);
                }

                // Only for Footnotes
                if (this.currentConfig._role === "fn") {

                    var alert_key = this.proper_sequence ? "FN_INS" : "FN_INS_ReNUM";
                    var alertParams = {
                        override: true
                    };

                    // Handle missing / unlinked cite items
                    if (this.unlinked_items.length > 0) {
                        alert_key = "FN_INS";
                        var misText = this.unlinked_items
                        .map(id => {
                            var item = editorDoc.$.querySelector("[id='" + id + "']");
                            if (!item) return id;

                                // label
                            var labelEl = item.querySelector(".label");
                            var label = labelEl ? labelEl.textContent : "";

                                // data-label
                            var dataLabel = item.getAttribute("data-label");

                                // inner text
                            var text = item.textContent ? item.textContent.trim() : "";

                                // return first non-empty
                            return (label && label.trim()) ||
                            (dataLabel && dataLabel.trim()) ||
                            (text && text.trim()) ||
                            id;
                        })
                        .filter(function(v) {
                            return v && String(v).trim() !== "";
                        });

                        Object.assign(alertParams, {
                            AddHtml: "MISS_CITE_FN",
                            miss_cite: misText.length > 0 ? misText : this.unlinked_items
                        });
                    }

                    AlertNewDialog.fire("success", "Success", alert_key, "OK", "", true, alertParams);
                }
            }

            if (options.alert) {
                this.handleAlert(options);
            }

            if (options.stringData) {
                this.history[this.instance_id].data = editor.getData();
                return this.history[this.instance_id].data;
            }

            return this.history[this.instance_id];
        } catch (err) {
            this.logError('fireOnce', err);
        }
    }

    handleAlert(Options) {
        const {
            ins_ref,
            del_ref,
            ins_cite,
            del_cite
        } = Options;
        const {
            can_reorder,
            proper_sequence,
            unlinked_items
        } = this.history[this.instance_id];
        let alert_key = "";
        let addText = "";

        if (can_reorder && (ins_ref || del_ref || ins_cite || del_cite)) {
            alert_key = ins_ref ? 'REF_INS_ReNUM' :
            del_ref ? 'REF_CITE_DEL_ReNUM' :
            ins_cite ? "REF_CITE_INS_ReNUM" : "REF_CITE_DEL_ReNUM";
        } else if (!can_reorder) {
            if (ins_ref) {
                alert_key = 'REF_INSERT';
                addText = !proper_sequence ? "COMMON_CITE_MISS" : "";
            } else if (ins_cite || del_cite) {
                alert_key = ins_cite ? 'CITE_INSERT_COMMON' : "REF_CITE_DEL";
                addText = !proper_sequence ? "COMMON_CITE_MISS" : "";
            } else if (del_ref && !proper_sequence) {
                alert_key = 'REF_DELETE';
                addText = "COMMON_CITE_MISS";
            }
        }

        AlertNewDialog.fire('success', "Success", alert_key, 'OK', '', true, {
            override: true,
            AddHtml: addText,
            miss_cite: unlinked_items.join(",")
        });
    }
    detectPattern(id, index) {
        // Common helper: preserves padding if present
        function nextNumber(oldNum, index) {
            const length = oldNum ? oldNum.length : 0;
            return length > 1 ?
            String(index + 1).padStart(length, "0") :
            String(index + 1);
        }

        const patterns = {
            workid: /^workid-[\w-]+book-(part|app)-\d+(?:-[\w-]+)*$/,
            bookPart: /^book-part-\d+-en\d+$/,
            enOnly: /^en\d+$/
        };

        if (patterns.workid.test(id)) {
            // Workid case
            const base = id.replace(/-fn-\d+$/, "");
            const suffixMatch = id.match(/-fn-(\d+)/);
            const nextNum = suffixMatch ?
            nextNumber(suffixMatch[1], index) :
            String(index + 1);
            return `${base}-fn-${nextNum}`;
        } else if (patterns.bookPart.test(id)) {
            // Book-part case
            const suffixMatch = id.match(/-en(\d+)/);
            const nextNum = suffixMatch ?
            nextNumber(suffixMatch[1], index) :
            String(index + 1);
            return id.replace(/-en\d+$/, `-en${nextNum}`);
        } else if (patterns.enOnly.test(id)) {
            // en-only case
            const suffixMatch = id.match(/en(\d+)/);
            const nextNum = suffixMatch ?
            nextNumber(suffixMatch[1], index) :
            String(index + 1);
            return `en${nextNum}`;
        } else {
            return `fn${index + 1}`;
        }
    }


    // Utility methods
    getNewId(index, existingId = "") {
        const {
            CUR_CHAPTER,
            CUR_CHAPTER_NO,
            CUR_CHAPTER_ID
        } = EDITOR_CURSOR;
        try {


            // if (IS_LOCAL_HOST) debugger;
            var prefixId = this.currentConfig.id_prefix || '';
            const paddedIndex = String(index + 1).padStart(4, '0');

            // (/oho|oso|oxmedo/gi.test(commonMethods.getClientCode({format: "upper"})))
            const isWorkIdFormatFollowed = /workid/gi.test(paraManager.baseId);
            if (this.currentConfig._role == "fn" && !IS_JOURNAL) {
                const item = GlobalEditor.document.findOne(".book-body .fn,.book-back .fn");
                const itemId = item && item.getId() || '';


                // const regex = /^(workid-[A-Z0-9]+-book-part-\d+)(-target-\d+)?(-(en|fn)(\d+))?$|^(book-part-\d+)(-(en|fn)(\d+))?$/;
                const regex = /^(workid-[A-Z0-9]+-book-part-\d+)(-target-\d+)?(-(en|fn)(\d+))?$|^(book-part-\d+)(-(en|fn)(\d+))?$|^(en\d+)$/;
                if (isWorkIdFormatFollowed) {
                    /*const chapter = CUR_CHAPTER.querySelector(".fn");
                     const chapterId = chapter && chapter.id || "";
                    if (chapterId && itemId && (chapterId != itemId)) {

                    } */
                    const itemMatch = itemId.match(regex);

                    if (paraManager && paraManager.baseId) {
                        var baseIdResults = paraManager.findChapterByBaseId(CUR_CHAPTER_ID);
                        const {
                            chapterBaseId
                        } = baseIdResults;
                        if (chapterBaseId) {
                            return `${chapterBaseId}-${prefixId}-${index + 1}`;
                        } else if (paraManager.isOHO || paraManager.isOSO) {
                            if (itemMatch[4] != prefixId) prefixId = itemMatch[4];
                            return `${paraManager.baseId}-${prefixId}-${index + 1}`;
                        } else if (paraManager.isTNF) {
                            if (itemMatch[8] != prefixId) prefixId = itemMatch[8];
                            return `${paraManager.baseId}-${prefixId}${index + 1}`;
                        }
                    } else {
                        var id = this._item_que[0].getId();
                        const regex = /(workid-[\w-]+book-part-\d+)/;
                        const match = id.match(regex);
                        return `${match[0]}-${prefixId}-${index + 1}`;
                    }
                } else {
                    // Handle book-part or en-only formats
                    return this.detectPattern(itemId, index);
                }

            }
            return `${prefixId}${paddedIndex}`;
        } catch (err) {
            this.logError('getNewId', err);
            return '';
        }
    }

    isExist(arr, key, value, returnBoolean = false, returnEntry = false) {
        try {
            const result = arr.filter(entry => entry[key] === value);
            if (returnBoolean) return result.length > 0;
            if (returnEntry) return result;
            return result[0] || null;
        } catch (err) {
            this.logError('isExist', err);
        }
    }

    GetFragment(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content;
    }

    updateLabel(element, options) {
        try {
            const {
                new_id,
                new_lab
            } = options;

            element = element[0] || element.$ || element;

            if (!element) return;

            const {
                query: labelQuery,
                attrKey
            } = this.currentConfig.find.label || {};
            const labelSpan = element.querySelector('span.label');
            const attrLabelEl = attrKey && labelQuery ? element.querySelector(labelQuery) : null;
            const labelEl = labelSpan || attrLabelEl;
            const originalId = element.id;
            const isNew = element.hasAttribute('data-new');

            if (this.shouldRenumberItemId(element)) {
                element.id = new_id;
                if (!element.hasAttribute('oid') && !isNew) {
                    element.setAttribute('oid', originalId);
                }
            }

            // Process new label
            let newLabel = new_lab.toString();

            if (!newLabel.endsWith('.')) {
                if (this.currentConfig._role === "bibr") {
                    let refNumber = iREF_SCOPE['DOC'] && iREF_SCOPE['DOC'].querySelector(`RefNumber,ref_number`);
                    if (refNumber || (labelSpan && labelSpan.textContent.endsWith('.'))) {
                        if (refNumber) {
                            const addBefore = refNumber.getAttribute('Addbefore');
                            if (addBefore && !newLabel.includes(addBefore)) {
                                newLabel = addBefore + newLabel;
                            }
                        }
                        const addAfter = refNumber ? refNumber.getAttribute(refNumber.hasAttribute('delim') ? 'delim' : 'Addafter') : '.';
                        if (addAfter && !newLabel.includes(addAfter)) {
                            newLabel += addAfter;
                        }
                    }
                } else if (this.currentConfig._role === "fn") {
                    const hasTrailingDot = this._item_que.some((item, ind) => {
                        const itemLabelEl = item.$.querySelector('span.label');
                        return itemLabelEl && itemLabelEl.textContent.trim().endsWith('.');
                    });

                    if (hasTrailingDot) {
                        newLabel += '.';
                    }
                }
            }

            if (!labelEl) return;

            // Update attrKey label (fig/table data-label) or span.label text
            if (attrKey) {
                const originalLabel = labelEl.getAttribute('odata-value') || labelEl.getAttribute(attrKey) || '';
                const trackValues = window.GetTrackTag ? window.GetTrackTag(labelEl, newLabel, originalLabel) : newLabel;
                const removeAttr = [];
                const attributes = {
                    [attrKey]: newLabel
                };

                if (!labelEl.hasAttribute('odata-value') && !isNew) {
                    attributes['odata-value'] = originalLabel;
                }
                if (originalLabel == newLabel) {
                    removeAttr.push("odata-value");
                }
                commonMethods.SET_REMOVE_ATTR(labelEl, attributes, removeAttr);

                if (!isNew && trackValues !== newLabel) {
                    labelEl.textContent = trackValues;
                } else if (isNew) {
                    labelEl.textContent = new_lab;
                }
            } else {
                // Update label span
                const digit = newLabel.length === 1 ? 'oDigit' : (newLabel.length === 2 ? 'tDigit' : 'hDigit');
                const originalLabel = labelSpan.getAttribute('odata-value') || labelSpan.textContent;
                const trackValues = window.GetTrackTag ? window.GetTrackTag(labelSpan, newLabel, originalLabel) : newLabel;
                const removeAttr = [];
                const attributes = {
                    'data-value': newLabel,
                    'data-val-class': digit
                };

                if (!labelSpan.hasAttribute('odata-value') && !isNew) {
                    attributes['odata-value'] = originalLabel;
                }

                if (originalLabel == newLabel) {
                    removeAttr.push("odata-value");
                }
                if (originalId === new_id) {
                    removeAttr.push("oid");
                }
                commonMethods.SET_REMOVE_ATTR(labelSpan, attributes, removeAttr);

                $(labelSpan).html('').append(isNew ? new_lab : trackValues);
            }

            return {
                id: originalId,
                lab: labelEl.getAttribute('odata-value') || (attrKey ? labelEl.getAttribute(attrKey) : labelSpan.textContent)
            };
        } catch (err) {
            this.logError('updateLabel', err);
        }
    }

    updateCitation(element, newText, newRid) {
        try {

            element = element[0] || element.$ || element;


            const insertElement = element.querySelector('insert');
            const ascent_insert = element.closest('insert');
            let targetElement = insertElement || element.querySelector('sup') || element;

            const lastChangeTime = {
                'data-last-change-time': new Date().getTime()
            };

            const insElAttrs = this._trackManager.getInsNode(null, {
                returnAttrOnly: true
            });
            const isSameUser = insertElement && commonMethods.IS_SAME_USER_AND_ROLE(insertElement);

            const attributes = {
                rid: newRid,
                ...(insertElement && isSameUser ? lastChangeTime : insertElement ? insElAttrs : {})
            };

            const removeAttr = ['data-cke-saved-href'];

            // New logic for handling old text and data-del-val attribute
            const oldText = element.getAttribute("data-del-val") || "";
            const isSameText = newText === oldText;

            if (isSameText) {
                removeAttr.push("data-del-val");
            } else {
                if (ascent_insert && commonMethods.IS_SAME_USER_AND_ROLE(ascent_insert)) {
                    // ignore same user renumbering labels
                } else {
                    attributes["data-del-val"] = (oldText || element.textContent).trim();
                }
            }

            if (targetElement) {

                targetElement.textContent = newText;

                if (targetElement.tagName.toLocaleLowerCase() == 'sup') {
                    targetElement = targetElement.closest('a');
                }

                if (targetElement) {
                    commonMethods.SET_REMOVE_ATTR(targetElement, attributes, removeAttr);
                }
            }
        } catch (err) {
            this.logError('updateCitation', err);
        }
    }

    /* 
    insertNew(parentNode, Options = {}) {
        try {
            if (this.xrefs.length === 0) {
                this.fireOnce();
            }

            const rlen = this.items.length;
            const newid = this.getNewId(rlen);
            const lab = rlen + 1;
            const time = new Date();

            const r_template = this.GetFragment(`<div class="ref" data-new="" id="${newid}"><span class="label" data-value="${lab}">${lab}</span><span>${time}</span>.</div>`);
            const x_template = this.GetFragment(`<a class="xref" rid="${newid}" href="#${newid}">${lab}</a>,`);

            const appendGroup = parentNode.querySelector(".ref-list");
            appendGroup.appendChild(r_template.firstElementChild);

            const cite = Array.from(parentNode.querySelectorAll('.xref'));
            const random_cite = cite[Math.floor(Math.random() * cite.length)];
            const random_place = ['after', 'before'][Math.floor(Math.random() * 2)];

            random_cite[random_place]((random_place === 'after' ? ',' : ''), x_template.firstElementChild, (random_place === 'after' ? '' : ','));

            debug.log("references inserted");
            this.fireOnce();
        } catch (err) {
            this.logError('insertNew', err);
        }
    }
 
    delete(Options = {}) {
        console.log("WORK IN PROGRESS: references deleted");
    }
   

    appendComments(selector = ["sup insert"]) {
        try {
            selector.forEach(sel => {
                GlobalEditor.document.find(sel).toArray().forEach(el => {
                    const sup = el.getAscendant("sup", true);
                    const parent = el.getParent();
                    const isInsert = parent.getName() === "insert";
                    const isOnlyChild = parent.getChildCount() === 1;

                    if (isInsert && isOnlyChild && sup) {
                        parent.insertBefore(sup);
                    } else if (!isOnlyChild && isInsert) {
                        console.log(parent);
                    }
                });
            });
        } catch (err) {
            this.logError('appendComments', err);
        }
    }
     */
}
