/*  */



window.TablesMethodsGroup = {
    templates: {
        wrapper: '<div class="table-wrap-foot" data-name="table-wrap-foot"></div>',
        footnote: `<div class="fn" data-name="fn" id="{{id}}" {{{labelAttr}}} data-tbl-fn-label-type="{{labelType}}" data-new="new"><div class="p" data-name="p" id="{{pId}}">{{{body}}}</div></div>`,
        fnCite: `<a href="#{{id}}" class="xref" data-name="xref" data-role="table-fn" ref-type="table-fn" rid="{{id}}"><sup class="sup" data-name="sup">{{label}}</sup></a>`
    },
    CUED_FN_TYPES: ['alpha_lower', 'alpha_upper', 'number', 'arabic_roman', 'symbol', 'probability'],
    UNCUED_FN_TYPES: ['unnumber', 'abbrev', 'source'],
    xmlFlag: function(value) {
        if (value === true || value === 1) return true;
        return String(value == null ? '' : value).toLowerCase() === 'true';
    },
    wrapfooterFromScope: function() {
        try {
            const fromScope = (typeof iREF_SCOPE !== 'undefined' && iREF_SCOPE.Table && iREF_SCOPE.Table.wrapfooter) || null;
            if (fromScope && typeof fromScope === 'object') return fromScope;
        } catch (err) { /* no wrapfooter */ }
        try {
            const jc = (typeof J_CONFIG !== 'undefined' && J_CONFIG && J_CONFIG.Table && J_CONFIG.Table.wrapfooter) || null;
            if (jc && typeof jc === 'object') return jc;
        } catch (err2) { /* no wrapfooter */ }
        return {};
    },
    wrapfooterActive: function(wf) {
        const cfg = wf || {};
        const d = String(cfg.designators || '');
        return this.xmlFlag(cfg.show) || this.xmlFlag(cfg.ins_note) || this.xmlFlag(cfg.ins_footnote) ||
            this.xmlFlag(cfg.ins_abbrev) || this.xmlFlag(cfg.ins_source) || this.xmlFlag(cfg.ins_probability) ||
            d === 'arabic' || d === 'alphabets' || d === 'Alphabets' || d === 'symbol_1';
    },
    isAddTablefootnoteOn: function() {
        try {
            let node = null;
            if (typeof GET_CONFIG_ITEM === 'function') {
                node = GET_CONFIG_ITEM('[name="AddTablefootnote"]');
            }
            if (!node && typeof I_CONFIG !== 'undefined' && I_CONFIG && I_CONFIG.querySelector) {
                node = I_CONFIG.querySelector('[name="AddTablefootnote"]');
            }
            if (!node || !node.getAttribute) return false;
            const roleKey = (typeof window !== 'undefined' && window.USER_INFO && window.USER_INFO.SELECTOR_SHOW_HIDE) || 'show';
            const used = node.hasAttribute(roleKey) ? roleKey : 'show';
            return this.xmlFlag(node.getAttribute(used));
        } catch (err) {
            return false;
        }
    },
    isTblFnEnabled: function() {
        return this.isAddTablefootnoteOn() && this.wrapfooterActive(this.wrapfooterFromScope());
    },
    classifyLabelText: function(labelText) {
        const text = String(labelText || '').trim();
        if (!text) return 'unnumber';
        if (/^[a-z]$/.test(text)) return 'alpha_lower';
        if (/^[A-Z]$/.test(text)) return 'alpha_upper';
        if (/^[0-9]+$/.test(text)) return 'number';
        if (/^\*+$/.test(text)) return 'probability';
        if (/^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{1,3})$/i.test(text)) return 'arabic_roman';
        if (/^[\*\u2217\u2020\u2021\u00A7\u00B6#]+$/.test(text)) return 'symbol';
        return 'unnumber';
    },
    classifyParaText: function(text) {
        const value = String(text || '').trim();
        if (/^abbreviations?:/i.test(value)) return 'abbrev';
        if (/^sources?:/i.test(value)) return 'source';
        return 'unnumber';
    },
    classifyFnEl: function(fnEl) {
        if (!fnEl) return 'unnumber';
        const existing = fnEl.getAttribute('data-tbl-fn-label-type');
        const label = fnEl.getAttribute('data-label');
        if (existing === 'probability' || this.isProbabilityCue(label)) return 'probability';
        if (existing) return existing;
        if (label) return this.classifyLabelText(label);
        const para = fnEl.querySelector('.p');
        return this.classifyParaText(para && para.textContent);
    },
    isProbabilityCue: function(label) {
        return /^\*+$/.test(String(label || '').trim());
    },
    isCuedFn: function(fnEl) {
        return this.CUED_FN_TYPES.indexOf(this.classifyFnEl(fnEl)) !== -1;
    },
    citeListFns: function(tableWrap) {
        const foot = tableWrap && tableWrap.querySelector('.table-wrap-foot');
        if (!foot) return [];
        return Array.from(foot.querySelectorAll('div.fn')).filter((el) => {
            if (el.closest && el.closest('.table-wrap') !== tableWrap) return false;
            if (el.getAttribute('data-delete') || el.getAttribute('data-del')) return false;
            if (el.classList && el.classList.contains('del')) return false;
            if (el.closest && (el.closest('del') || el.closest('[data-delete]'))) return false;
            const t = this.classifyFnEl(el);
            if (this.UNCUED_FN_TYPES.indexOf(t) !== -1) return false;
            return !!(el.getAttribute('data-label') || this.CUED_FN_TYPES.indexOf(t) !== -1);
        });
    },
    isCiteTarget: function(node, tableWrap) {
        if (!node || !tableWrap || !tableWrap.contains(node)) return false;
        if (node.closest && node.closest('.table-wrap-foot')) return false;
        return !!(node.closest('.caption') || node.closest('td,th,table'));
    },
    isTblFnXref: function(node) {
        if (!node) return false;
        let el = node.nodeType != null ? node : (node.$ || node);
        if (el && el.nodeType === 3) el = el.parentElement || el.parentNode;
        if (!el || el.nodeType !== 1) return null;
        if (el.getAttribute && el.getAttribute('ref-type') === 'table-fn' && el.classList && el.classList.contains('xref')) {
            if (el.getAttribute('data-delete') || el.getAttribute('data-remove') || el.getAttribute('data-del')) return null;
            return el;
        }
        if (el.closest) {
            const a = el.closest('a.xref[ref-type="table-fn"]');
            if (!a) return null;
            if (a.getAttribute('data-delete') || a.getAttribute('data-remove') || a.getAttribute('data-del')) return null;
            return a;
        }
        return null;
    },
    isTblFnCommaSup: function(node) {
        if (!node) return false;
        let el = node.nodeType != null ? node : (node.$ || node);
        if (el && el.nodeType === 3) el = el.parentElement || el.parentNode;
        if (!el || el.nodeType !== 1) return false;
        if (el.tagName !== 'SUP') return false;
        return (el.textContent || '').trim() === ',';
    },
    _skipWhitespaceSibling: function(node, dir) {
        let cur = node;
        while (cur) {
            cur = dir === 'prev' ? cur.previousSibling : cur.nextSibling;
            if (!cur) return null;
            if (cur.nodeType === 3 && !(cur.textContent || '').trim()) continue;
            return cur;
        }
        return null;
    },
    tblFnXrefFromCommaCaret: function(node) {
        if (!node) return null;
        let el = node.nodeType != null ? node : (node.$ || node);
        if (el && el.nodeType === 3) el = el.parentElement || el.parentNode;
        if (!this.isTblFnCommaSup(el)) return null;
        const prev = this._skipWhitespaceSibling(el, 'prev');
        const next = this._skipWhitespaceSibling(el, 'next');
        return this.isTblFnXref(prev) || this.isTblFnXref(next) || null;
    },
    collectAdjacentTblFnXrefs: function(seed) {
        const seedXref = this.isTblFnXref(seed);
        if (!seedXref) return [];
        let left = seedXref;
        for (;;) {
            const comma = this._skipWhitespaceSibling(left, 'prev');
            if (!this.isTblFnCommaSup(comma)) break;
            const prevXref = this.isTblFnXref(this._skipWhitespaceSibling(comma, 'prev'));
            if (!prevXref) break;
            left = prevXref;
        }
        const out = [left];
        let cur = left;
        for (;;) {
            const comma = this._skipWhitespaceSibling(cur, 'next');
            if (!this.isTblFnCommaSup(comma)) break;
            const nextXref = this.isTblFnXref(this._skipWhitespaceSibling(comma, 'next'));
            if (!nextXref) break;
            out.push(nextXref);
            cur = nextXref;
        }
        return out;
    },
    citeAnchorCell: function(node) {
        let el = node;
        if (!el) return null;
        if (el.$) el = el.$;
        if (el.nodeType === 3) el = el.parentElement || el.parentNode;
        if (!el || el.nodeType !== 1 || !el.closest) return null;
        return el.closest('td, th, .caption');
    },
    /**
     * Edit-Citation seed resolve (reference-style: live selection first).
     * Does not read sticky window.tableNotes._lastPointerEl unless opts.pointerEl
     * is passed and lies in the same cell as the selection constraint.
     */
    resolveEditCiteSeed: function(opts) {
        opts = opts || {};
        const tryNode = (n) => this.isTblFnXref(n) || this.tblFnXrefFromCommaCaret(n);
        const cellOk = (xref) => {
            if (!xref) return null;
            const need = opts.requireCell;
            if (!need) return xref;
            const cell = this.citeAnchorCell(xref);
            if (cell && cell !== need) return null;
            return xref;
        };
        let found = cellOk(tryNode(opts.element));
        if (found) return found;
        if (opts.ckElement) {
            const ck = opts.ckElement;
            found = cellOk(tryNode(ck.$ || ck));
            if (found) return found;
            if (typeof ck.getAscendant === 'function') {
                const a = ck.getAscendant('a', true);
                found = cellOk(tryNode(a && a.$ ? a.$ : a));
                if (found) return found;
            }
        }
        found = cellOk(tryNode(opts.imsNode));
        if (found) return found;
        try {
            const editor = opts.editor;
            const sel = editor && editor.getSelection && editor.getSelection();
            const start = sel && sel.getStartElement && sel.getStartElement();
            found = cellOk(tryNode(start && start.$));
            if (found) return found;
            const range = sel && sel.getRanges && sel.getRanges()[0];
            const sc = range && range.startContainer;
            const scNode = sc && sc.$ ? sc.$ : sc;
            found = cellOk(tryNode(scNode));
            if (found) return found;
        } catch (selErr) { /* ignore */ }
        if (opts.pointerEl) {
            const ptrCell = this.citeAnchorCell(opts.pointerEl);
            if (!opts.requireCell || (ptrCell && ptrCell === opts.requireCell)) {
                found = cellOk(tryNode(opts.pointerEl));
                if (found) return found;
            }
        }
        return null;
    },
    resolveTblFnXref: function(node, ckElement, editor) {
        const tryNode = (n) => this.isTblFnXref(n);
        let found = tryNode(node);
        if (found) return found;
        found = this.tblFnXrefFromCommaCaret(node);
        if (found) return found;
        if (ckElement) {
            found = tryNode(ckElement.$ || ckElement);
            if (found) return found;
            found = this.tblFnXrefFromCommaCaret(ckElement.$ || ckElement);
            if (found) return found;
            if (typeof ckElement.getAscendant === 'function') {
                const a = ckElement.getAscendant('a', true);
                found = tryNode(a && a.$ ? a.$ : a);
                if (found) return found;
            }
        }
        try {
            const IMS = typeof IMPACT_SELECTION !== 'undefined' ? IMPACT_SELECTION : null;
            if (IMS && IMS.NODE) {
                const imsNode = IMS.NODE.$ || IMS.NODE;
                found = tryNode(imsNode) || this.tblFnXrefFromCommaCaret(imsNode);
                if (found) return found;
            }
        } catch (imsErr) { /* ignore */ }
        try {
            const notes = typeof window !== 'undefined' ? window.tableNotes : null;
            if (notes && notes._lastPointerEl) {
                found = tryNode(notes._lastPointerEl) || this.tblFnXrefFromCommaCaret(notes._lastPointerEl);
                if (found) return found;
            }
        } catch (ptrErr) { /* ignore */ }
        try {
            if (typeof IMPACT !== 'undefined' && IMPACT.USER_ENV_INFO && IMPACT.USER_ENV_INFO.isSafari && typeof IMP_SAFARI !== 'undefined' && IMP_SAFARI.CITE_EL) {
                found = tryNode(IMP_SAFARI.CITE_EL);
                if (found) return found;
            }
        } catch (safariErr) { /* ignore */ }
        try {
            const sel = editor && editor.getSelection && editor.getSelection();
            const start = sel && sel.getStartElement && sel.getStartElement();
            found = tryNode(start && start.$) || this.tblFnXrefFromCommaCaret(start && start.$);
            if (found) return found;
            const range = sel && sel.getRanges && sel.getRanges()[0];
            const sc = range && range.startContainer;
            const scNode = sc && sc.$ ? sc.$ : sc;
            found = tryNode(scNode) || this.tblFnXrefFromCommaCaret(scNode);
            if (found) return found;
        } catch (selErr) { /* ignore */ }
        return null;
    },
    applyCommandLabelsFromMessages: function() {
        try {
            const root = typeof window !== 'undefined' ? window.TABLE_NOTES_MESSAGES : null;
            const labels = (root && root.en && root.en.labels) || (root && root.labels) || {};
            const commands = this.commands || [];
            commands.forEach((cmd) => {
                if (!cmd || !cmd.langKey) return;
                const next = labels[cmd.langKey];
                if (next) cmd.label = next;
            });
            const editor = typeof GlobalEditor !== 'undefined' ? GlobalEditor : null;
            const menuItems = editor && editor._ && editor._.menuItems;
            if (menuItems) {
                commands.forEach((cmd) => {
                    if (cmd && cmd.name && menuItems[cmd.name] && cmd.label) {
                        menuItems[cmd.name].label = cmd.label;
                    }
                });
            }
        } catch (err) { /* keep fallback labels */ }
    },
    trackingProcess: (el, process) => {
        try {
            var setAtt = (node, ty, val = "new") => {
                node.addClass("Tracking");
                node.setAttribute(`data-${ty}`, val);
            };
            if (["Insert", "cell"].includes(process)) {
                setAtt(el, process);
            } else if (process == "column") {
                el.forEach(element => {
                    setAtt(element, process);
                });
            } else if (["cellHorizontalSplit", "cellVerticalSplit"].includes(process)) {

                const type = process.includes('Horizontal') ?
                    'Horizontal' :
                    'Vertical';

                setAtt(el, 'cell-split', type);

                if (el.hasAttribute("colname")) {

                    var row = el.getParent && el.getParent();

                    if (row) {

                        const cells = row.find('th,td').toArray();

                        cells.forEach(function(cell, index) {
                            cell.setAttribute('colname', 'col' + (index + 1));
                        });
                    }
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('TableMethods', err.message);
        }
    },
    processValidation: function(curEl, TableProp, ind) {
        let valid = false;
        const el = $(curEl[0].$);

        if (["ColInsertBefore", "ColInsertAfter"].includes(TableProp)) {
            valid = el.next().hasClass('Tracking') || el.prev().hasClass('Tracking');
        } else if (["RowInsertAfter", "RowInsertBefore"].includes(TableProp)) {
            const row = el.closest('tr');
            valid = row.next().hasClass('Tracking') || row.prev().hasClass('Tracking');
        }

        // Optionally return the result
        debug.log(curEl, TableProp, ind);
        return valid;
    },
    AlignCell: function(cell, position) {
        try {
            // Example: position = "cellRight" | "cellLeft" | "cellCenter"
            // "right", "left", "center"
            let align = position.replace(/^cell/, '').toLowerCase();
            let orgAlign = cell.hasAttribute('align') ? cell.getAttribute('align') : '';
            commonMethods.setAttr(cell, {
                "align": align,
                "data-cell-action": position,
                "data-track-code": "cell-align-01",
                "data-org-align": orgAlign,
                'default': ["dt", "du", "drn"]
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('TableAlignCell', err.message);
        }
    },
    operationHeader(node, action) {
        try {
            const tblElement = node.closest(".table-wrap,table");
            if (!tblElement) return;
            const tbody = tblElement.querySelector("tbody");
            if (!tbody) return;

            const tblRow = node.closest("tr");
            if (!tblRow) return;


            var thead = node.closest("thead") || tblElement.querySelector("thead");

            if (!thead) {
                thead = document.createElement("thead");
                thead.setAttribute("data-name", "thead");
                $(tbody).before(thead);
                return;
            }

            if (action === "RowtoHead") {
                const thRow = $(tblRow).find("td").wrapInner('<th />').contents().unwrap();
                $(thead).append(thRow);
                return;
            } else if (action === "HeadtoRow") {
                if (!thead || !tbody) return;
                $(tblRow).find("th").wrapInner('<td />').contents().unwrap();
                $(tbody.firstElementChild).before($(thead.childNodes));
                thead.remove();
                return;
            }

            // Handle "aboveheader" or "belowheader"
            if (!thead) return;

            const rowIndex = Array.from(thead.rows).indexOf(tblRow);
            const cloneItem = tblRow.cloneNode(true);
            const isAbove = action === "aboveheader";

            // Clear content in cloned row
            Array.from(cloneItem.cells).forEach(cell => {
                cell.innerHTML = "&#x00A0;";
            });
            commonMethods.setAttr(cloneItem, {
                "data-action": action,
                "default": ["dat", "dau", "dar", "drn"]
            });
            const targetIndex = isAbove ? rowIndex : rowIndex + 1;
            const rows = thead.rows;

            if (targetIndex >= rows.length) {
                thead.appendChild(cloneItem);
            } else {
                rows[targetIndex][isAbove ? 'before' : 'after'](cloneItem);
            }
        } catch (error) {
            console.error("Error in operationHeader:", error);
        }
    },
    getFrag(key, options = {}) {
        const {
            frag = true
        } = options;

        var finalString = (this.templates && this.templates[key]) ? this.templates[key] : key;

        let rendered = Mustache.render(finalString, options);

        return frag ? document.createRange().createContextualFragment(rendered) : rendered;
    },
    getCitation(_id, label, isNumbered, options = {}) {
        var pId = GENERATE_ID();
        var labelAttr = isNumbered && label ? `data-label='${label}'` : '';
        var body = options.body != null ? options.body : '<br>';
        var labelType = options.labelType || (isNumbered && label ? this.classifyLabelText(label) : this.classifyParaText(typeof body === 'string' ? body.replace(/<[^>]+>/g, ' ') : ''));
        var fragCite = isNumbered && label ? this.getFrag("fnCite", {
            id: _id,
            label,
            frag: false
        }) : '';
        var fragEntry = this.getFrag("footnote", {
            id: _id,
            pId,
            label,
            labelAttr,
            labelType,
            body,
            frag: false
        });
        return {
            fragCite,
            fragEntry,
            labelType
        };
    },

    getNewId(tableWrap, exitList) {
        const baseId = tableWrap && tableWrap.id || 'T1';
        // default pattern if nothing matches
        let pattern = 'fn';
        let index = 0;

        if (exitList.length) {
            const lastIteme = exitList[exitList.length - 1];
            const lastId = lastIteme && lastIteme.id || 'T1';
            const stripped = lastId.startsWith(baseId) ? lastId.slice(baseId.length) : lastId;

            // Match leading alphabets and trailing number
            const match = stripped.match(/^([A-Za-z]+)(\d+)$/);
            if (match) {
                // e.g., 'Fn'
                pattern = match[1];
                // e.g., 1
                index = parseInt(match[2], 10);
            }
        }

        let finalId;
        do {
            index++;
            finalId = `${baseId}${pattern}${index}`;
        } while (tableWrap.querySelector(`[id="${finalId}"]`));

        return {
            finalId,
            pattern
        };
    },

    _generateNewLabel(lastLabelOrList, designators) {
        const curOrder = this._getCurrentOrder(designators);
        const nextAfter = (index) => {
            const nIndex = index + 1;
            if (nIndex < curOrder.length) return curOrder[nIndex];
            const baseLength = curOrder.length || 1;
            const repeatIndex = nIndex % baseLength;
            const repeatCount = Math.floor(nIndex / baseLength) + 1;
            return String(curOrder[repeatIndex] || '').repeat(repeatCount);
        };

        if (Array.isArray(lastLabelOrList)) {
            let maxIndex = -1;
            lastLabelOrList.forEach((el) => {
                if (!el || !el.getAttribute) return;
                if (el.getAttribute('data-delete') || el.getAttribute('data-del')) return;
                const lab = el.getAttribute('data-label') || '';
                if (!lab || this.isProbabilityCue(lab)) return;
                const idx = curOrder.indexOf(lab);
                if (idx > maxIndex) maxIndex = idx;
            });
            if (maxIndex === -1) return curOrder[0];
            return nextAfter(maxIndex);
        }

        return curOrder[0];
    },

    shiftLabelsAfterDelete(tableWrap, deletedLabel, skipXref) {
        if (!tableWrap || deletedLabel == null || deletedLabel === '') return;
        const removed = String(deletedLabel);
        if (this.isProbabilityCue(removed)) return;
        const order = this._getCurrentOrder(this.inferLetterDesignators(tableWrap));
        const start = order.indexOf(removed);
        if (start < 0) return;
        Array.from(tableWrap.querySelectorAll('.fn[data-label]')).forEach((fn) => {
            if (fn.closest && fn.closest('.table-wrap') !== tableWrap) return;
            if (!this._liveFn(fn) || !this.isLetterFn(fn)) return;
            const lab = fn.getAttribute('data-label') || '';
            if (!lab || this.isProbabilityCue(lab)) return;
            const idx = order.indexOf(lab);
            if (idx <= start) return;
            const next = order[idx - 1];
            if (next == null) return;
            this._writeLetterLabel(tableWrap, fn, next, true, skipXref);
        });
    },

    isLetterFn: function(fnEl) {
        const type = this.classifyFnEl(fnEl);
        return type === 'alpha_lower' || type === 'alpha_upper' || type === 'number' || type === 'arabic_roman';
    },

    _liveFn: function(fn) {
        return !!(fn && !fn.getAttribute('data-delete') && !fn.getAttribute('data-del'));
    },

    _writeLetterLabel: function(tableWrap, fn, next, trackAsInsert, skipXref) {
        if (!fn || next == null) return;
        const prev = fn.getAttribute('data-label') || '';
        if (String(prev) === String(next)) return;
        fn.setAttribute('data-label', next);
        if (prev && trackAsInsert !== false) {
            const p = this._fnBodyP(fn);
            const existing = (p && p.getAttribute('data-org-label')) || fn.getAttribute('data-org-label') || '';
            if (p && !p.getAttribute('data-org-label')) {
                p.setAttribute('data-org-label', existing || prev);
            }
            if (fn.hasAttribute('data-org-label')) fn.removeAttribute('data-org-label');
        }
        if (fn.hasAttribute('data-tbl-fn-label-type')) {
            fn.setAttribute('data-tbl-fn-label-type', this.classifyLabelText(next));
        }
        const id = fn.id;
        if (!id || !tableWrap) return;
        Array.from(tableWrap.querySelectorAll('a.xref[ref-type="table-fn"][rid="' + id + '"]')).forEach((xref) => {
            if (skipXref && xref === skipXref) return;
            if (xref.closest && xref.closest('.table-wrap') !== tableWrap) return;
            if (xref.getAttribute('data-delete') || xref.getAttribute('data-del') || xref.getAttribute('data-remove')) return;
            if (prev && trackAsInsert !== false) {
                this._updateCitationWithTracking(xref, id, next, prev);
                return;
            }
            const sup = xref.querySelector('sup');
            if (sup) sup.textContent = next;
            else xref.textContent = next;
        });
    },

    letterSlotAtCaret: function(tableWrap, caret) {
        if (!tableWrap || !caret || !tableWrap.querySelectorAll) return null;
        const order = this._getCurrentOrder(this.inferLetterDesignators(tableWrap));
        const FOLLOWING = 4;
        const CONTAINED_BY = 16;
        let earliest = null;
        let earliestIdx = -1;
        const caretIsElement = caret.nodeType === 1;
        const xrefs = Array.from(tableWrap.querySelectorAll('a.xref[ref-type="table-fn"]'));
        for (let i = 0; i < xrefs.length; i++) {
            const xref = xrefs[i];
            if (xref.closest && xref.closest('.table-wrap') !== tableWrap) continue;
            if (xref.getAttribute('data-delete') || xref.getAttribute('data-del') || xref.getAttribute('data-remove')) continue;
            const fn = this._xrefNote(tableWrap, xref);
            if (!this._liveFn(fn) || !this.isLetterFn(fn)) continue;
            const lab = fn.getAttribute('data-label') || '';
            const labIdx = order.indexOf(lab);
            if (!lab || labIdx < 0) continue;
            if (caret === xref || (xref.contains && xref.contains(caret))) return lab;
            let pos = 0;
            try {
                pos = caret.compareDocumentPosition(xref);
            } catch (err) {
                pos = 0;
            }
            const following = (pos & FOLLOWING) && !(pos & CONTAINED_BY);
            const descendantOfCaret = !!(caretIsElement && caret.contains && caret.contains(xref) && caret !== xref);
            if (!following && !descendantOfCaret) continue;
            if (earliestIdx < 0 || labIdx < earliestIdx) {
                earliest = lab;
                earliestIdx = labIdx;
            }
        }
        return earliest;
    },

    shiftLabelsUpFrom: function(tableWrap, slotLabel) {
        if (!tableWrap || slotLabel == null || slotLabel === '') return;
        const slot = String(slotLabel);
        if (this.isProbabilityCue(slot)) return;
        const designators = this.inferLetterDesignators(tableWrap);
        const order = this._getCurrentOrder(designators);
        const start = order.indexOf(slot);
        if (start < 0) return;
        const ranked = Array.from(tableWrap.querySelectorAll('.fn[data-label]')).filter((fn) => {
            if (fn.closest && fn.closest('.table-wrap') !== tableWrap) return false;
            if (!this._liveFn(fn) || !this.isLetterFn(fn)) return false;
            const lab = fn.getAttribute('data-label') || '';
            return order.indexOf(lab) >= start;
        }).sort((a, b) => order.indexOf(b.getAttribute('data-label')) - order.indexOf(a.getAttribute('data-label')));
        ranked.forEach((fn) => {
            const next = this._generateNewLabel([fn], designators);
            if (next == null || next === (fn.getAttribute('data-label') || '')) return;
            this._writeLetterLabel(tableWrap, fn, next);
        });
    },

    placeLetterGroup: function(tableWrap, footWrap, newFn, fns) {
        const list = fns || Array.from(footWrap.querySelectorAll('.fn'));
        const letters = list.filter((fn) => this._liveFn(fn) && this.isLetterFn(fn));
        if (letters.indexOf(newFn) < 0) letters.push(newFn);
        const domLetters = letters.slice();
        const order = this._getCurrentOrder(this.inferLetterDesignators(tableWrap || footWrap));
        letters.sort((a, b) => {
            const ia = order.indexOf(this.fnLabelOf(a));
            const ib = order.indexOf(this.fnLabelOf(b));
            return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib);
        });
        let anchor = null;
        let seenLetter = false;
        list.forEach((el) => {
            if (anchor || !this._liveFn(el) || el === newFn) return;
            if (this.isLetterFn(el)) {
                seenLetter = true;
                return;
            }
            if (this.isProbabilityFn(el)) {
                anchor = el;
                return;
            }
            const type = this.classifyFnEl(el);
            if (seenLetter && (type === 'unnumber' || type === 'abbrev' || type === 'source')) anchor = el;
        });
        const rank = (el) => {
            const idx = order.indexOf(this.fnLabelOf(el));
            return idx < 0 ? order.length : idx;
        };
        const beforeAnchor = (el) => !!(anchor && el.parentNode && (anchor.compareDocumentPosition(el) & 2));
        const inPlace = domLetters.filter(beforeAnchor);
        let ordered = true;
        for (let i = 1; i < inPlace.length; i++) {
            if (rank(inPlace[i - 1]) > rank(inPlace[i])) ordered = false;
        }
        if (!anchor) {
            letters.forEach((el) => footWrap.appendChild(el));
            return;
        }
        if (!ordered) {
            const first = inPlace[0];
            const last = inPlace[inPlace.length - 1];
            const range = [];
            let node = first;
            while (node) {
                range.push(node);
                if (node === last) break;
                node = node.nextSibling;
            }
            const parent = first && first.parentNode;
            if (!parent || inPlace.some((el) => range.indexOf(el) < 0)) {
                letters.forEach((el) => anchor.before(el));
                return;
            }
            const fixed = range.filter((el) => inPlace.indexOf(el) < 0);
            const sortedLetters = inPlace.slice().sort((a, b) => rank(a) - rank(b));
            let letterAt = 0;
            let fixedAt = 0;
            const rebuilt = range.map((el) => (
                inPlace.indexOf(el) >= 0 ? sortedLetters[letterAt++] : fixed[fixedAt++]
            ));
            const after = last.nextSibling;
            rebuilt.forEach((el) => parent.insertBefore(el, after));
            inPlace.sort((a, b) => rank(a) - rank(b));
        }
        letters.filter((el) => !beforeAnchor(el)).forEach((el) => {
            const lab = rank(el);
            let host = null;
            for (let i = 0; i < inPlace.length; i++) {
                if (rank(inPlace[i]) > lab) {
                    host = inPlace[i];
                    break;
                }
            }
            if (host) {
                host.before(el);
                inPlace.splice(inPlace.indexOf(host), 0, el);
            } else {
                anchor.before(el);
                inPlace.push(el);
            }
        });
    },

    _updateCitationWithTracking(elem, newId, label, orgTxt) {
        if (!elem || !newId) return;

        const href = '#' + newId;
        elem.setAttribute("rid", newId);
        elem.setAttribute("href", href);
        elem.setAttribute("data-cke-saved-href", href);

        const host = (elem.querySelector && elem.querySelector('sup')) || elem.firstElementChild || elem;
        const prev = orgTxt != null && String(orgTxt) !== '' ? String(orgTxt) : '';
        const next = label != null ? String(label) : '';
        if (prev && prev !== next) {
            const tm = window._trackManager;
            let ins = null;
            if (tm && typeof tm.handlingLabelItems === 'function') {
                const newValue = tm.handlingLabelItems('insert', elem, next, prev);
                if (newValue && typeof newValue === 'object' && newValue.nodeType) ins = newValue;
            }
            if (!ins && tm && typeof tm.getInsNode === 'function') {
                ins = tm.getInsNode(null, {});
            }
            if (!ins || !ins.setAttribute) {
                ins = (elem.ownerDocument || document).createElement('insert');
            }
            ins.setAttribute('data-del-val', prev);
            ins.textContent = next;
            host.innerHTML = '';
            host.appendChild(ins);
            return;
        }
        host.textContent = next;
    },

    lockTblFnSnapshot(editor) {
        const g = editor || (typeof GlobalEditor !== 'undefined' ? GlobalEditor : null);
        if (!g || !g.fire) return;
        g.fire('saveSnapshot');
        g.fire('lockSnapshot', { dontUpdate: true });
    },
    unlockTblFnSnapshot(editor) {
        const g = editor || (typeof GlobalEditor !== 'undefined' ? GlobalEditor : null);
        if (!g || !g.fire) return;
        if (g.undoManager) {
            let n = 0;
            while (g.undoManager.locked && n < 12) {
                g.fire('unlockSnapshot');
                n += 1;
            }
        } else {
            g.fire('unlockSnapshot');
        }
        g.fire('saveSnapshot');
        if (g.undoManager && g.undoManager.refreshState) g.undoManager.refreshState();
    },
    operationNotesSection(action, el, defaultParams = {}, editor) {
        const {
            element,
            selection,
            elementPath
        } = defaultParams;
        editor = GlobalEditor || selection.root.editor;
        this.lockTblFnSnapshot(editor);
        debug.log("Operation Notes Section:");

        try {

            // if (!this._trackManager) this._trackManager = new trackManager(editor);

            const {
                wrapfooter
            } = iREF_SCOPE.Table;
            const {
                renumber,
                designators
            } = wrapfooter || {};

            const tableWrap = el.$.closest(".table-wrap");
            const _table = tableWrap.querySelector("table");
            let _table_note_wrap = tableWrap.querySelector(".table-wrap-foot");

            const isRemoveAction = /del|remove/gi.test(action);

            const tableWrapId = tableWrap.id;

            const getParaTag = el && el.getName();
            const parent = el && el.getParent();
            const parentClass = parent && parent.getAttribute("data-name");

            const isInsertPara = getParaTag == "insert" && parentClass == "p";

            const curEl = isInsertPara ? parent : el;

            const hasLabel = curEl.hasAttribute("data-label");
            const parentHasLabel = curEl.$.parentElement && curEl.$.parentElement.hasAttribute("data-label");


            var isNumbered = isRemoveAction ? (hasLabel || parentHasLabel) : /footnote/gi.test(action);

            const selector = `div.fn${isNumbered ? '[data-label]' : ':not([data-label])'} `;


            if (!_table_note_wrap && !isRemoveAction) {
                _table.after(this.getFrag("wrapper"));
                _table_note_wrap = tableWrap.querySelector(".table-wrap-foot");
            }

            var dom = selection.document.findOne("body").$ || editor.document.findOne("body").$;
            const exitList = Array.from(_table_note_wrap.querySelectorAll(selector));
            const {
                finalId,
                pattern
            } = this.getNewId(tableWrap, exitList);
            if (/ins|add/gi.test(action)) {
                let newLabel = isNumbered ? this._generateNewLabel(exitList) : null;
                var {
                    fragCite,
                    fragEntry
                } = this.getCitation(finalId, newLabel, isNumbered);
                this.placeFnEntry(tableWrap, _table_note_wrap, fragEntry);
                if (isNumbered) {
                    editor.insertHtml(fragCite);
                    this.handleRenumbering(tableWrap, pattern, 1);
                }
            } else if (isRemoveAction) {

                const blockElement = elementPath.block ? elementPath.block.$ : elementPath.blockLimit.$;

                var fnEntry = blockElement.closest(".fn");

                const hasRid = element.hasAttribute("rid");
                const parent = element.$.parentElement;
                const parentHasRid = parent && parent.hasAttribute("rid");


                if (hasRid || parentHasRid) {
                    // Get the <a> element that has the citation rid
                    const cite = hasRid ? element.$ : parent;
                    const citeId = cite.getAttribute("rid");

                    // Count how many citations point to this rid
                    const citeLen = tableWrap.querySelectorAll(`a.xref[ref-type="table-fn"][rid="${citeId}"]`).length;

                    // If fnEntry not already found, fallback to locating it via data-label
                    fnEntry = fnEntry || tableWrap.querySelector(`.fn[id="${citeId}"]`);

                    // Remove only the citation (not the note itself)
                    this.RemoveItem(tableWrap, fnEntry, cite, citeLen > 1);

                    if (fnEntry.hasAttribute("data-label") && !isNumbered) isNumbered = true;

                } else if (fnEntry && fnEntry.id) {
                    // If it's a full note block with ID, remove it normally
                    this.RemoveItem(tableWrap, fnEntry);
                }

                if (isNumbered) {
                    this.handleRenumbering(tableWrap, pattern, 1);
                }

            }

            if (dom) this.bookMarkRemove(dom);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("operationNotesSection_" + action, err.message);
        } finally {
            this.unlockTblFnSnapshot(editor);
        }
    },

    handleRenumbering(tableElement, labPattern) {
        try {
            const selector = {
                xref: `a.xref[ref-type="table-fn"]:not([data-delete])`,
                note: `[data-name="fn"][data-label]`
            };
            var toaster = {
                "UN_LINK": {
                    text: `Notes &ldquo;{{label}}&rdquo; is not linked with anyone the author. Would you like to delete the Affiliation? If yes, the details will be removed from the list.`
                },
            };
            const curOrderItems = this._getCurrentOrder(this.inferLetterDesignators(tableElement));

            const cite = this._collectCitations(tableElement, selector.xref, curOrderItems);
            const notes = this._mapNotesToCitations(tableElement, selector.note, cite, curOrderItems);
            const unlinked = cite.filter(c => !c.OrginalID);

            if (unlinked.length > 0) {
                const alt_txt = Mustache.render(toaster['UN_LINK']['text'], {
                    label: unlinked.map(u => u.Orginal).join(',')
                });
                AlertNewDialog.fire('warning', 'Warning', alt_txt, 'OK', '');
                return;
            }

            this._assignRenumberedLabels(cite, curOrderItems);
            this._updateNoteLabels(notes, cite);
            this._assignSeqNumbersToUnmapped(notes, cite.length);
            this._sortAndAppendNotes(tableElement, notes, selector.note);
            this._updateNoteIDs(tableElement, selector.note, labPattern, cite);
            this._updateCitations(tableElement, selector.xref, cite);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("reorder", err.message);
        }

    },
    _getCurrentOrder(design) {
        const cuedSymbols = ['\u2217', '\u2020', '\u2021', '\u00A7'];
        let designators;
        if (typeof design === 'string') {
            designators = design;
        } else if (design && typeof design === 'object' && design.designators != null) {
            designators = design.designators;
        } else {
            const tableScope = (typeof iREF_SCOPE !== 'undefined' && iREF_SCOPE && iREF_SCOPE.Table) || {};
            const wrapfooter = tableScope.wrapfooter || {};
            designators = wrapfooter.designators;
        }
        if (designators === "arabic") {
            return Array.from({
                length: 100
            }, (_, i) => String(i + 1));
        }
        if (designators === "alphabets") {
            return Array.from({
                length: 26
            }, (_, i) => String.fromCharCode(97 + i));
        }
        if (designators === "Alphabets") {
            return Array.from({
                length: 26
            }, (_, i) => String.fromCharCode(65 + i));
        }
        return cuedSymbols;
    },
    inferLetterDesignators: function(tableElement) {
        const tableScope = (typeof iREF_SCOPE !== 'undefined' && iREF_SCOPE && iREF_SCOPE.Table) || {};
        const configured = tableScope.wrapfooter && tableScope.wrapfooter.designators;
        if (configured) return configured;
        const used = [];
        const root = tableElement || document;
        Array.from((root.querySelectorAll && root.querySelectorAll('.fn[data-label]')) || []).forEach((el) => {
            const lab = el.getAttribute('data-label');
            if (lab && !this.isProbabilityCue(lab)) used.push(lab);
        });
        const cuedSymbols = ['\u2217', '\u2020', '\u2021', '\u00A7'];
        if (used.some((lab) => /^[a-z]$/.test(lab))) return 'alphabets';
        if (used.some((lab) => /^[A-Z]$/.test(lab))) return 'Alphabets';
        if (used.some((lab) => /^[0-9]+$/.test(lab))) return 'arabic';
        if (used.some((lab) => cuedSymbols.indexOf(String(lab)) !== -1)) return 'symbol_1';
        return 'alphabets';
    },
    _xrefNote: function(tableElement, elm) {
        const rid = elm && elm.getAttribute && elm.getAttribute('rid');
        if (!rid || !tableElement || !tableElement.querySelector) return null;
        return tableElement.querySelector('[id="' + rid + '"]');
    },
    probabilityStarCount: function(label) {
        const text = String(label || '').trim();
        return this.isProbabilityCue(text) ? text.length : 0;
    },
    isProbabilityFn: function(fnEl) {
        return this.classifyFnEl(fnEl) === 'probability';
    },
    fnLabelOf: function(fnEl) {
        return fnEl && fnEl.getAttribute ? (fnEl.getAttribute('data-label') || '') : '';
    },
    _fnBodyP: function(fnEl) {
        return fnEl && fnEl.querySelector ? fnEl.querySelector('.p') : null;
    },
    fnOrgLabelOf: function(fnEl) {
        if (!fnEl || !fnEl.getAttribute) return '';
        const p = this._fnBodyP(fnEl);
        const fromP = (p && p.getAttribute && p.getAttribute('data-org-label')) || '';
        if (fromP) return fromP;
        const fromFn = fnEl.getAttribute('data-org-label') || '';
        if (fromFn) return fromFn;
        return (p && p.getAttribute && p.getAttribute('delete-lab')) || '';
    },
    _stampFnDeleteLab: function(fnEl, prevCue) {
        const prev = String(prevCue == null ? '' : prevCue);
        if (!fnEl || !prev || this.isProbabilityCue(prev)) return;
        const p = this._fnBodyP(fnEl);
        if (p && p.setAttribute) p.setAttribute('delete-lab', prev);
    },
    liveProbabilityFns: function(footWrap) {
        if (!footWrap || !footWrap.querySelectorAll) return [];
        return Array.from(footWrap.querySelectorAll('.fn')).filter((fn) => {
            if (fn.getAttribute('data-delete') || fn.getAttribute('data-del')) return false;
            return this.isProbabilityFn(fn);
        });
    },
    placeProbabilityFn: function(footWrap, newFn, fns) {
        const newLen = this.probabilityStarCount(this.fnLabelOf(newFn));
        const live = fns.filter((fn) => {
            if (fn.getAttribute('data-delete') || fn.getAttribute('data-del')) return false;
            return this.isProbabilityFn(fn);
        });
        const later = live.find((fn) => this.probabilityStarCount(this.fnLabelOf(fn)) > newLen);
        if (later) {
            later.before(newFn);
            return;
        }
        const lastProb = live.filter((fn) => this.probabilityStarCount(this.fnLabelOf(fn)) <= newLen).pop();
        if (lastProb) {
            lastProb.after(newFn);
            return;
        }
        const lastCued = fns.filter((fn) => {
            if (fn.getAttribute('data-delete') || fn.getAttribute('data-del')) return false;
            return this.isCuedFn(fn) && !this.isProbabilityFn(fn);
        }).pop();
        if (lastCued) {
            lastCued.after(newFn);
            return;
        }
        let seenCued = false;
        let firstTail = null;
        let lastHead = null;
        fns.forEach((el) => {
            if (el.getAttribute('data-delete') || el.getAttribute('data-del')) return;
            const t = this.classifyFnEl(el);
            if (t === 'source') {
                if (!firstTail) firstTail = el;
                return;
            }
            if (this.isCuedFn(el)) {
                seenCued = true;
                return;
            }
            if (t === 'unnumber' || t === 'abbrev') {
                if (!seenCued) lastHead = el;
                else if (!firstTail) firstTail = el;
            }
        });
        if (firstTail) firstTail.before(newFn);
        else if (lastHead) lastHead.after(newFn);
        else footWrap.appendChild(newFn);
    },
    placeFnEntry: function(tableWrap, footWrap, fragEntry) {
        if (!footWrap) return;
        const doc = footWrap.ownerDocument || document;
        const temp = doc.createElement('div');
        if (typeof fragEntry === 'string') {
            temp.innerHTML = fragEntry;
        } else if (fragEntry) {
            const node = (fragEntry.ownerDocument && fragEntry.ownerDocument !== doc)
                ? doc.importNode(fragEntry, true)
                : fragEntry;
            temp.appendChild(node);
        }
        const newFn = temp.querySelector('.fn') || temp.firstElementChild;
        if (!newFn) return;
        const type = this.classifyFnEl(newFn);
        const fns = Array.from(footWrap.querySelectorAll('.fn'));
        if (type === 'probability') {
            this.placeProbabilityFn(footWrap, newFn, fns);
        } else if (type === 'source') {
            footWrap.appendChild(newFn);
        } else if (type === 'unnumber' || type === 'abbrev') {
            const lastUncued = fns.filter((fn) => {
                if (!footWrap.contains(fn)) return false;
                const t = this.classifyFnEl(fn);
                return t === 'unnumber' || t === 'abbrev';
            }).pop();
            if (lastUncued) lastUncued.after(newFn);
            else footWrap.insertBefore(newFn, footWrap.firstChild);
        } else if (this.isLetterFn(newFn)) {
            this.placeLetterGroup(tableWrap, footWrap, newFn, fns);
        } else {
            const sources = fns.filter((fn) => this.classifyFnEl(fn) === 'source');
            if (sources.length) sources[0].before(newFn);
            else footWrap.appendChild(newFn);
        }
        return footWrap.contains(newFn) ? newFn : undefined;
    },
    // STEP 1: Collect unique letter citations by footnote id (reading order)
    _collectCitations(tableElement, xrefSelector, curOrder) {
        const cite = [];
        const seen = {};
        const order = (curOrder || []).map(String);
        const pushXref = (elm) => {
            if (!elm || (elm.getAttribute && elm.getAttribute('data-delete'))) return;
            const fn = this._xrefNote(tableElement, elm);
            let token = fn && fn.getAttribute('data-label');
            let noteId = fn && fn.id ? fn.id.trim() : '';
            if (!token) {
                token = String($(elm).text() || '').split(',')[0].trim();
            }
            if (!token || this.isProbabilityCue(token)) return;
            if (order.length && order.indexOf(String(token)) === -1) return;
            const key = noteId || ('lab:' + token);
            if (seen[key]) return;
            seen[key] = true;
            cite.push({
                Orginal: String(token),
                OrginalID: noteId,
                Renumbered: '',
                index: 0,
                id: ''
            });
        };
        const scanRoot = (root) => {
            if (!root) return;
            $(root).find(xrefSelector).each((_, elm) => pushXref(elm));
        };
        scanRoot(tableElement.querySelector('.caption'));
        const table = tableElement.querySelector('table');
        if (table) {
            Array.from(table.rows || []).forEach((row) => {
                Array.from(row.cells || []).forEach((cell) => scanRoot(cell));
            });
        } else {
            scanRoot(tableElement);
        }
        return cite;
    },

    // STEP 2: Match notes to citations
    _mapNotesToCitations(tableElement, itemSelector, cite, curOrder) {
        const notes = [];
        $(tableElement).find(itemSelector).each((_, val) => {
            if (val.getAttribute('data-delete') || val.getAttribute('data-del')) return;
            let label = val.getAttribute('data-label');
            if (!label) {
                const sup = val.querySelector('sup');
                label = sup && sup.textContent || '';
                if (!sup) {
                    debug.log("---LABEL_MISSING---");
                    ErrorLogTrace('Renumbering', "LABEL_MISSING");
                }
            }

            notes.push({
                sup: label,
                element: val,
                SeqNo: -1
            });
            if (this.isProbabilityCue(label)) return;
            const noteId = val.id ? val.id.trim() : '';
            const match = cite.find((c) => noteId && c.OrginalID === noteId) ||
                cite.find((c) => !c.OrginalID && c.Orginal === label);
            if (match) {
                match.OrginalID = noteId;
            } else if (label && curOrder && curOrder.map(String).indexOf(String(label)) !== -1) {
                cite.push({
                    Orginal: label,
                    OrginalID: noteId,
                    Renumbered: '',
                    index: 0,
                    id: ''
                });
            }
        });
        return notes;
    },

    // STEP 4: Compact labels in citation reading order (first cite = a / 1).
    _assignRenumberedLabels(cite, curOrder) {
        const order = curOrder || [];
        (cite || []).forEach((item, index) => {
            item.Renumbered = order[index] != null ? String(order[index]) : String(index + 1);
            item.index = index;
        });
    },

    // STEP 5: Update note data-labels
    _updateNoteLabels(notes, cite) {
        notes.forEach((a) => {
            if (this.isProbabilityCue(a.sup)) return;
            const noteId = a.element && a.element.id ? a.element.id.trim() : '';
            const match = cite.find((c) => noteId && c.OrginalID === noteId) ||
                cite.find((c) => !c.OrginalID && c.Orginal === a.sup);
            if (match) {
                a.element.setAttribute('data-label', match.Renumbered);
                a.element.setAttribute('data-tbl-fn-label-type', this.classifyLabelText(String(match.Renumbered)));
                a.SeqNo = match.index;
            }
        });
    },

    // STEP 6: Assign seq numbers to unmatched
    _assignSeqNumbersToUnmapped(notes, start) {
        notes.filter(a => a.SeqNo === -1).forEach((a, i) => {
            a.SeqNo = start + i;
        });
    },

    // STEP 7: Sort and re-append footnotes
    _sortAndAppendNotes(tableElement, notes, itemSelector) {
        const footWrap = tableElement.querySelector('.table-wrap-foot');
        if (!footWrap) return;
        const allFns = Array.from(footWrap.querySelectorAll('.fn'));
        const labelledEls = notes.map((n) => n.element);
        const labelledBefore = Array.from(footWrap.querySelectorAll('.fn[data-label]'));
        const head = [];
        const tailUncued = [];
        const sources = [];
        let seenLabelled = false;
        allFns.forEach((el) => {
            const t = this.classifyFnEl(el);
            if (t === 'source') {
                sources.push(el);
                return;
            }
            if (labelledEls.indexOf(el) !== -1 || (el.hasAttribute('data-label') && this.isCuedFn(el))) {
                seenLabelled = true;
                return;
            }
            if (t === 'unnumber' || t === 'abbrev') {
                if (!seenLabelled) head.push(el);
                else tailUncued.push(el);
            }
        });
        const probSeen = [];
        const addProb = (el) => {
            if (!el || probSeen.indexOf(el) !== -1) return;
            if (el.getAttribute('data-delete') || el.getAttribute('data-del')) return;
            probSeen.push(el);
        };
        notes.forEach((n) => {
            const lab = n.sup || this.fnLabelOf(n.element);
            if (this.isProbabilityCue(lab) || this.isProbabilityFn(n.element)) addProb(n.element);
        });
        this.liveProbabilityFns(footWrap).forEach((el) => addProb(el));
        const prob = probSeen.map((el) => ({
            element: el,
            sup: this.fnLabelOf(el)
        }));
        prob.sort((a, b) => this.probabilityStarCount(a.sup) - this.probabilityStarCount(b.sup));
        const cued = notes.filter((n) => probSeen.indexOf(n.element) === -1);
        cued.sort((a, b) => a.SeqNo - b.SeqNo);
        $(tableElement).find(itemSelector).remove();
        head.forEach((el) => footWrap.appendChild(el));
        cued.forEach((a) => footWrap.appendChild(a.element));
        prob.forEach((a) => footWrap.appendChild(a.element));
        labelledBefore.forEach((el) => {
            if (footWrap.contains(el)) return;
            if (el.getAttribute('data-delete') || el.getAttribute('data-del')) return;
            const srcs = Array.from(footWrap.querySelectorAll('.fn')).filter((fn) => this.classifyFnEl(fn) === 'source');
            if (srcs.length) srcs[0].before(el);
            else footWrap.appendChild(el);
        });
        tailUncued.forEach((el) => footWrap.appendChild(el));
        sources.forEach((el) => footWrap.appendChild(el));
    },

    // STEP 8: Update footnote IDs
    _updateNoteIDs(tableElement, itemSelector, labPattern, cite) {
        const items = Array.from(tableElement.querySelectorAll(itemSelector));
        items.forEach((elm, index) => {
            const oldLabel = elm.getAttribute('data-label');
            if (this.isProbabilityCue(oldLabel)) return;
            const noteId = elm.id ? elm.id.trim() : '';
            const match = cite.find((c) => noteId && c.OrginalID === noteId);
            if (!match) return;
            const { newId } = this._getNextValidFootnote(tableElement, labPattern, index + 1, elm);
            if (!newId) return;
            elm.setAttribute('id', newId);
            match.id = newId;
        });
    },
    _updateCitations(tableElement, xrefSelector, cite) {
        Array.from(tableElement.querySelectorAll(xrefSelector)).forEach((elm) => {
            const rid = elm.getAttribute('rid') || '';
            const match = cite.find((c) => c.OrginalID === rid || c.id === rid);
            if (!match || !match.id) return;
            const vis = String((elm.textContent || '')).trim();
            const org = match.Orginal;
            if (String(match.Renumbered) !== vis || rid !== match.id) {
                this._updateCitationWithTracking(elm, match.id, match.Renumbered, org);
            }
        });
    },
    _getNextValidFootnote(tableElement, labPattern, startID, currentEl) {
        const maxRetries = 50;
        let attempts = 0;
        let n = startID;
        const prefix = (tableElement && tableElement.id) || 'T';
        while (attempts < maxRetries) {
            const newId = prefix + labPattern + n;
            const existingElement = tableElement.querySelector('[id="' + newId + '"]');
            if (!existingElement || existingElement === currentEl) {
                return { newId, startID: n };
            }
            n += 1;
            attempts += 1;
        }
        console.warn("Could not find a valid footnote ID after 50 attempts.");
        return { newId: null, startID: -1 };
    },
    bookMarkRemove(DOM) {
        DOM.querySelectorAll('span[id^="cke_bm"]').forEach(elem => elem.remove());
    },
    RemoveItem(tableWrap, noteEl, cite = null, removeCiteOnly = false) {
        try {
            debug.log("-RemoveItem-");
            if (noteEl && noteEl.closest) {
                const fromNote = noteEl.closest('.table-wrap');
                if (fromNote) tableWrap = fromNote;
            }
            if (!tableWrap || !noteEl) return;
            const _id = noteEl.id;
            const cites = cite && removeCiteOnly ? [cite] : tableWrap.querySelectorAll('a.xref[ref-type="table-fn"][rid="' + _id + '"]');
            let isRemoveWhole = false;
            let dataLabel = noteEl.getAttribute("data-label") || "";

            if (noteEl.hasAttribute("data-new")) {
                const insPara = noteEl.querySelectorAll(".p > insert");
                if (insPara.length === 1 && commonMethods.IS_SAME_USER_AND_ROLE(insPara[0])) {
                    isRemoveWhole = true;
                }
            }

            if (!dataLabel) {
                const para = noteEl.querySelector('.p');
                const firstChar = para && para.textContent.trim().charAt(0);
                const validPatterns = this._getCurrentOrder();
                if (validPatterns.includes(firstChar)) {
                    dataLabel = firstChar;
                }
            }

            if (isRemoveWhole) {
                commonMethods.removeEl(noteEl);
                cites.forEach(c => {
                    this._cleanCiteComma(c);
                    commonMethods.removeEl(c);
                });
            } else {
                if (!removeCiteOnly) {
                    window._trackManager.getDelNode(noteEl, {
                        childOnly: true
                    });
                    commonMethods.SET_REMOVE_ATTR(
                        noteEl, {
                            'data-del-id': _id,
                            'data-delete': "s",
                            'data-del-label': dataLabel
                        },
                        ["id", "data-cke-saved-href", "href", "data-new", "data-label", "data-org-label"]
                    );
                    const delP = this._fnBodyP(noteEl);
                    if (delP && delP.removeAttribute) delP.removeAttribute('data-org-label');
                }

                cites.forEach(c => {
                    window._trackManager.getDelNode(c, {
                        nodeOnly: true
                    });
                    this._cleanCiteComma(c, true);

                    commonMethods.SET_REMOVE_ATTR(
                        c, {
                            'data-del-rid': _id,
                            'data-remove': "s"
                        },
                        ["rid", "data-cke-saved-href", "href"]
                    );
                });

                debug.log(removeCiteOnly ? `Citation(s) soft-deleted only` : `Note and citations soft-deleted`);
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('TableMethods', err.message);
        }
    },
    _cleanCiteComma(cite, tracking = false) {
        const prev = cite.previousSibling;
        const next = cite.nextSibling;

        const isCommaSup = node => node && node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SUP' && node.textContent.trim() === ',';

        // Handle comma before (e.g., <sup>,</sup> before <a>)
        if (isCommaSup(prev)) {
            if (!tracking) {
                commonMethods.removeEl(prev);
            } else {
                const delNode = cite.parentElement;
                if (delNode && delNode.nodeType === Node.ELEMENT_NODE) {
                    delNode.insertBefore(prev.cloneNode(true), cite);
                    commonMethods.removeEl(prev);
                }
            }
        }

        // Handle comma after (e.g., <sup>,</sup> after <a>)
        if (isCommaSup(next)) {
            if (!tracking) {
                commonMethods.removeEl(next);
            } else {
                const delNode = cite.parentElement;
                if (delNode && delNode.nodeType === Node.ELEMENT_NODE) {
                    delNode.insertBefore(next.cloneNode(true), next.nextSibling);
                    commonMethods.removeEl(next);
                }
            }
        }
    },
    commands: [

        {
            name: 'AddTblHeadAbove',
            action: 'addHeaderAbove',
            label: "Insert Header Above",
            icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
            order: 661
        },
        {

            name: 'AddTblHeadBelow',
            action: 'addHeaderBelow',
            label: 'Insert Header Below',
            icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
            order: 662
        },
        {
            name: 'RemoveTableHeader',
            action: 'convert_header_2_row',
            label: 'Convert Header to Row',
            icon: '../assets/images/svg/ContextMenu/DeleteAffiliation.svg',
            order: 663
        },
        {
            name: 'AddTableRow',
            action: 'convert_row_2_header',
            label: 'Convert Row to Head',
            icon: '../assets/images/svg/ContextMenu/SwapGivenSurName.svg',
            order: 664
        },
        {
            name: 'AlignTblContent',
            label: 'Cell Align',
            icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
            getItems: true,
            order: 665,
            getItemsCallback: function() {
                return {
                    LeftCellAlign: CKEDITOR.TRISTATE_OFF,
                    CenterCellAlign: CKEDITOR.TRISTATE_OFF,
                    RightCellAlign: CKEDITOR.TRISTATE_OFF
                };
            }
        },
        {
            name: 'LeftCellAlign',
            label: 'Left',
            action: 'cellLeft',
            icon: '../assets/images/svg/ContextMenu/DeleteAffiliation.svg',
            order: 666
        },
        {
            name: 'CenterCellAlign',
            label: 'Center',
            action: 'cellCenter',
            icon: '../assets/images/svg/ContextMenu/DeleteAffiliation.svg',
            order: 667
        },
        {
            name: 'RightCellAlign',
            label: 'Right',
            action: 'cellRight',
            icon: '../assets/images/svg/ContextMenu/DeleteAffiliation.svg',
            order: 668
        },
        {
            name: 'InsTblFootnote',
            action: 'addTblFootnote',
            langKey: 'tblFnNewTitle',
            label: 'Insert Table Footnote',
            icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
            order: 669,
            canShowValidation: {
                client_key: "InsTblFootnote",
                journal_key: "ins_footnote"
            }
        },
        {
            name: 'InsTblNote',
            action: 'addTblNote',
            label: 'Insert Table Note',
            icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
            order: 670,
            canShowValidation: {
                client_key: "InsTblNote",
                journal_key: "ins_note"
            }
        },
        {
            name: 'DelTblFootnote',
            action: 'removefootnote',
            langKey: 'tblFnDeleteTitle',
            label: 'Delete the Footnote',
            icon: '../assets/images/svg/ContextMenu/DeleteAffiliation.svg',
            order: 671,
            canShowValidation: {
                client_key: "DelTblFootnote",
                journal_key: "del_footnote"
            }
        },
        {
            name: 'DelTblNote',
            action: 'removenote',
            label: 'Delete Table Note',
            icon: '../assets/images/svg/ContextMenu/DeleteAffiliation.svg',
            order: 672,
            canShowValidation: {}
        },
        {
            name: 'InsTblNoteCite',
            action: 'addTblNoteCite',
            langKey: 'tblFnCiteTitle',
            label: 'Insert Table Citation',
            icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
            order: 673,
            canShowValidation: {
                client_key: "InsTblNoteCite",
                journal_key: "ins_footnote_cite"
            }
        },
        {
            name: 'DelTblNoteCite',
            action: 'removeTblNoteCite',
            langKey: 'tblFnCiteDeleteTitle',
            label: 'Delete Footnote Citation',
            icon: '../assets/images/svg/ContextMenu/DeleteAffiliation.svg',
            order: 674,
            canShowValidation: {
                client_key: "DelTblNoteCite",
                journal_key: "del_footnote_cite"
            }
        },
        {
            name: 'EditTblNoteCite',
            action: 'editTblNoteCite',
            langKey: 'tblFnCiteEditTitle',
            label: 'Edit Footnote Citation',
            icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
            order: 675,
            canShowValidation: {
                client_key: "EditTblNoteCite",
                journal_key: "ins_footnote_cite"
            }
        }
    ],
};

const TABLES_MODULE_ID = 'tableNotes';
const TABLES_MODULE_CONFIG = {
    name: 'tableNotesModule',
    path: './tables/index.js',
    templatePath: './tables/template.html',
    type: 'ondemand',
    supportingFiles: [{
        name: 'messages',
        type: 'onthefly',
        when: 'initLoop',
        path: './tables/messages.json',
        variable: 'TABLE_NOTES_MESSAGES'
    }],

    group_name: "TableAddOnGroup",
    commands: window.TablesMethodsGroup.commands,

    // editor, item, moduleConfig
    executeCommand: async function(editor, callGroup, moduleConfig, params) {
        const {
            name,
            action
        } = callGroup;
        var defaultParams = params;
        defaultParams['SHOW_MENU_ITEMS'] = moduleConfig.SHOW_MENU_ITEMS;

        if (/cellRight|cellCenter|cellLeft/gi.test(action)) {
            TablesMethodsGroup.AlignCell(defaultParams.element, action);
        } else if (window.tableNotes && action === 'removeTblNoteCite') {
            await window.tableNotes.deleteCiteAtCaret({ closeDialog: false });
        } else if (window.tableNotes && /addTblNoteCite|editTblNoteCite|addTblFootnote|addTblNote|removefootnote|removenote/.test(action)) {
            const modeMap = {
                addTblNoteCite: 'citeInsert',
                editTblNoteCite: 'citeEdit',
                addTblFootnote: 'insertNew',
                addTblNote: 'insertNew',
                removefootnote: 'deleteFn',
                remotenote: 'deleteFn',
                removenote: 'deleteFn'
            };
            window.tableNotes._dialogMode = modeMap[action] || 'citeInsert';
            if (action === 'addTblNote') {
                window.tableNotes._insertUiType = 'note';
            } else if (action === 'addTblFootnote') {
                const wf = (typeof iREF_SCOPE !== 'undefined' && iREF_SCOPE.Table && iREF_SCOPE.Table.wrapfooter) || {};
                const d = String(wf.designators || '');
                if (d === 'arabic') window.tableNotes._insertUiType = 'numeric';
                else if (d === 'symbol_1') window.tableNotes._insertUiType = 'symbol';
                else if (d === 'alphabets' || d === 'Alphabets') window.tableNotes._insertUiType = 'alpha';
                else window.tableNotes._insertUiType = '';
            } else {
                window.tableNotes._insertUiType = '';
            }
            // Reference-style capture-at-open: always clear stale seed, then freeze wrap before show.
            if (action === 'editTblNoteCite' && typeof window.tableNotes.captureEditCiteSelection === 'function') {
                if (typeof window.tableNotes.clearEditCiteSelectionSnapshot === 'function') {
                    window.tableNotes.clearEditCiteSelectionSnapshot();
                }
                window.tableNotes.captureEditCiteSelection(defaultParams || {});
            } else if (typeof window.tableNotes.clearEditCiteSelectionSnapshot === 'function') {
                window.tableNotes.clearEditCiteSelectionSnapshot();
            }
            if (action === 'addTblNoteCite') {
                let el = defaultParams && defaultParams.element;
                if (el && el.$) el = el.$;
                if (el && el.nodeType === 3) el = el.parentElement;
                const wrap = el && el.closest ? el.closest('.table-wrap') : null;
                window.tableNotes._TABLE_WRAP = wrap;
                window.tableNotes._insertAnchor = el || wrap || null;
            }
            window.tableNotes.show();
        } else {
            TablesMethodsGroup.operationNotesSection(action, defaultParams.element, defaultParams);
        }
    },

    onContentDomUpdate: function(editor, editable) {
        if (!TablesMethodsGroup.isTblFnEnabled()) return;
        const events = ['click', 'mousedown', 'contextmenu'];
        const moduleId = 'tableNotes';
        events.forEach((eventName) => {
            editable.attachListener(editable, eventName, (evt) => {
                if (window[moduleId] && typeof window.tableNotes.handleEditorEvents === "function") {
                    window.tableNotes.handleEditorEvents(evt);
                }
            });
        });

    },
    contextMenuHandler: function(element, selection, elementPath, editor, subItems) {
        const [IMS, reTurnGroup] = [IMPACT_SELECTION, {}];
        try {
        if (typeof TablesMethodsGroup.applyCommandLabelsFromMessages === 'function') {
            TablesMethodsGroup.applyCommandLabelsFromMessages();
        }
        let nativeElEarly = element && element.$;
        if (nativeElEarly && nativeElEarly.nodeType === 3) nativeElEarly = nativeElEarly.parentElement;
        const tableWrapFromEl = nativeElEarly && nativeElEarly.closest && nativeElEarly.closest('.table-wrap');
        const IsTable = IsNodeContain(elementPath, SEARCH_KEY['tab'], false) || !!tableWrapFromEl;

        if (IsTable) {
            const tagList = ['TD', 'TH'];
            const blockElement = (elementPath.block ? elementPath.block.$ : (elementPath.blockLimit && elementPath.blockLimit.$)) || nativeElEarly;
            let curEntry = blockElement;
            if (curEntry && (curEntry.tagName === 'DIV' || curEntry.tagName === 'P' || curEntry.tagName === 'INSERT' || curEntry.tagName === 'DEL' || curEntry.tagName === 'SUP' || curEntry.tagName === 'A')) {
                curEntry = curEntry.closest ? (curEntry.closest('td,th,caption,.fn,.table-wrap') || curEntry.parentElement) : curEntry.parentElement;
            }
            if (!curEntry || !curEntry.closest) {
                curEntry = tableWrapFromEl || nativeElEarly;
            }
            if (!curEntry || !curEntry.closest) return reTurnGroup;

            const curEntryTag = curEntry.tagName;
            const curTable = curEntry.closest('div.table-wrap') || tableWrapFromEl;
            const IsTabBody = curEntry.closest('table') || (nativeElEarly && nativeElEarly.closest && nativeElEarly.closest('table'));
            const IsTabNoteGroup = curEntry.closest('.table-wrap-foot');
            const curRow = IsTabBody ?
                (tagList.includes(curEntryTag) ? curEntry.parentElement : curEntry.closest('tr')) :
                null;

            const nativeEl = nativeElEarly || (element && element.$);
            const IsCaption = !!(nativeEl && nativeEl.closest && nativeEl.closest('.table-wrap .caption, .table-wrap > .caption, .caption'));
            const captionInTable = IsCaption && nativeEl.closest('.table-wrap');
            const IsCiteZone = !!(IsTabBody || captionInTable);
            const xrefEl = TablesMethodsGroup.resolveTblFnXref
                ? TablesMethodsGroup.resolveTblFnXref(nativeEl, element, editor)
                : TablesMethodsGroup.isTblFnXref(nativeEl);
            const onTblFnXref = !!xrefEl;
            const wfOn = TablesMethodsGroup.isTblFnEnabled();

            if (IsTabBody) {
                if (curEntryTag === 'TD') {
                    reTurnGroup.AlignTblContent = CKEDITOR.TRISTATE_OFF;
                } else if (curTable && !curTable.querySelector("thead") && curRow && curRow.rowIndex === 0) {
                    reTurnGroup.AddTableRow = CKEDITOR.TRISTATE_OFF;
                }

                if (wfOn && onTblFnXref) {
                    if (subItems['DelTblNoteCite']) reTurnGroup.DelTblNoteCite = CKEDITOR.TRISTATE_OFF;
                    if (subItems['EditTblNoteCite']) reTurnGroup.EditTblNoteCite = CKEDITOR.TRISTATE_OFF;
                } else if (wfOn && subItems['InsTblNoteCite']) {
                    reTurnGroup.InsTblNoteCite = CKEDITOR.TRISTATE_OFF;
                }
            }

            if (wfOn && IsCiteZone && !onTblFnXref && subItems['InsTblFootnote']) {
                reTurnGroup.InsTblFootnote = CKEDITOR.TRISTATE_OFF;
            }
            if (wfOn && captionInTable && !onTblFnXref && subItems['InsTblNoteCite']) {
                reTurnGroup.InsTblNoteCite = CKEDITOR.TRISTATE_OFF;
            }
            if (wfOn && captionInTable && onTblFnXref) {
                if (subItems['DelTblNoteCite']) reTurnGroup.DelTblNoteCite = CKEDITOR.TRISTATE_OFF;
                if (subItems['EditTblNoteCite']) reTurnGroup.EditTblNoteCite = CKEDITOR.TRISTATE_OFF;
            }

            if (wfOn && IsTabNoteGroup) {
                var isLabelled = curEntry.hasAttribute("data-label") || (curEntry.closest && curEntry.closest('.fn') && curEntry.closest('.fn').hasAttribute('data-label'));
                if (subItems['InsTblFootnote']) {
                    reTurnGroup.InsTblFootnote = CKEDITOR.TRISTATE_OFF;
                }
                if (subItems['DelTblFootnote']) {
                    reTurnGroup[isLabelled ? 'DelTblFootnote' : 'DelTblNote'] = CKEDITOR.TRISTATE_OFF;
                }
            }
        }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('tableNotes.contextMenuHandler', err.message);
        }
        return reTurnGroup;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ContextHelpers.registerOnReady(TABLES_MODULE_ID, TABLES_MODULE_CONFIG);
});