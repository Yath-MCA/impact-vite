/**
 * EditReferenceTextModule — structure-preserving reference leaf edit
 * with author/editor analysis and row layout
 * (Edit Field → Preview → Suggestion).
 */


class EditReferenceTextModule extends BaseModule {
    constructor(name = 'EditReferenceTextModule', errorTracker, options = {}) {
        super(name, errorTracker, options);
        this._id = 'EditReferenceTextDialog';
        this.canUnmountComponentWhileClose = true;
        this.editMode = false;
        this.editState = null;
        this.trackManager = null;
        this.formModified = false;
        this._eventsBound = false;
        this._pendingRef = null;
        this._summernoteIds = new Set();
        this._activeFieldKey = null;
        this._boundPanel = null;
        this._bindModuleMethods();
    }

    _bindModuleMethods() {
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((key) => {
            if (key !== 'constructor' && typeof this[key] === 'function') {
                this[key] = this[key].bind(this);
            }
        });
    }

    initializeElements() {
        const map = EditReferenceTextModule.SELECTORS;
        this.elements = {
            pubTypeInput: this.Panel.querySelector(map.pubTypeInput),
            activeEditor: this.Panel.querySelector(map.activeEditor),
            editIdleHint: this.Panel.querySelector(map.editIdleHint),
            editCollapse: this.Panel.querySelector(map.editCollapse),
            fieldApplyBtn: this.Panel.querySelector(map.fieldApplyBtn),
            fieldRevertBtn: this.Panel.querySelector(map.fieldRevertBtn),
            suggestionChips: this.Panel.querySelector(map.suggestionChips),
            personShapeInfo: this.Panel.querySelector(map.personShapeInfo),
            stagedInserts: this.Panel.querySelector(map.stagedInserts),
            addAuthorBtn: this.Panel.querySelector(map.addAuthorBtn),
            addEditorBtn: this.Panel.querySelector(map.addEditorBtn),
            addEtalBtn: this.Panel.querySelector(map.addEtalBtn),
            previewHost: this.Panel.querySelector(map.previewHost),
            citationPreviewList: this.Panel.querySelector(map.citationPreviewList),
            citationPreviewEmpty: this.Panel.querySelector(map.citationPreviewEmpty),
            citationPreviewHeading: this.Panel.querySelector(map.citationPreviewHeading),
            syncCitationsChk: this.Panel.querySelector(map.syncCitationsChk),
            syncCitationsLabel: this.Panel.querySelector(map.syncCitationsLabel),
            tabCitation: this.Panel.querySelector(map.tabCitation),
            tabSuggestion: this.Panel.querySelector(map.tabSuggestion),
            paneCitation: this.Panel.querySelector(map.paneCitation),
            paneSuggestion: this.Panel.querySelector(map.paneSuggestion),
            belowTabs: this.Panel.querySelector(map.belowTabs),
            fireBtn: this.Panel.querySelector(map.fireBtn),
            cancelBtn: this.Panel.querySelector(map.cancelBtn),
            closeIcon: this.Panel.querySelector('.closeIcons')
        };
    }

    setupEventListeners() {
        // Remount (canUnmountComponentWhileClose) creates a new Panel — rebind when Panel changes
        if (this._eventsBound && this._boundPanel === this.Panel) return;
        const {
            fireBtn,
            cancelBtn,
            closeIcon,
            fieldApplyBtn,
            fieldRevertBtn,
            suggestionChips,
            stagedInserts,
            activeEditor,
            previewHost,
            addAuthorBtn,
            addEditorBtn,
            addEtalBtn,
            belowTabs
        } = this.elements;

        if (previewHost) {
            previewHost.addEventListener('click', this.onPreviewClick);
            previewHost.addEventListener('keydown', this.onPreviewKeydown);
        }
        if (belowTabs) belowTabs.addEventListener('click', this.onBelowTabClick);
        if (suggestionChips) suggestionChips.addEventListener('click', this.onSuggestionChipClick);
        if (stagedInserts) stagedInserts.addEventListener('click', this.onStagedInsertClick);
        if (activeEditor) {
            activeEditor.addEventListener('input', this.onFieldInput);
            activeEditor.addEventListener('keydown', this.onFieldKeydown);
        }
        if (fieldApplyBtn) fieldApplyBtn.addEventListener('click', this.handleFieldApply);
        if (fieldRevertBtn) fieldRevertBtn.addEventListener('click', this.handleFieldRevert);
        if (addAuthorBtn) addAuthorBtn.addEventListener('click', this.onAddAuthorClick);
        if (addEditorBtn) addEditorBtn.addEventListener('click', this.onAddEditorClick);
        if (addEtalBtn) addEtalBtn.addEventListener('click', this.onAddEtalClick);
        if (fireBtn) fireBtn.addEventListener('click', this.handleFire);
        if (cancelBtn) cancelBtn.addEventListener('click', this.handleCancel);
        if (closeIcon) closeIcon.addEventListener('click', this.handleCancel);

        this.syncSuggestionTabVisibility();
        this._boundPanel = this.Panel;
        this._eventsBound = true;
    }

    isSuggestionTabAllowed() {
        // return (typeof IS_UAT_DOMAIN !== 'undefined' && IS_UAT_DOMAIN) || (typeof IS_LOCAL_HOST !== 'undefined' && IS_LOCAL_HOST);
        return false;
    }

    /**
     * Suggestion tab only on UAT / local; hide nav item and force Citation elsewhere.
     */
    syncSuggestionTabVisibility() {
        const allowed = this.isSuggestionTabAllowed();
        const {
            tabSuggestion,
            paneSuggestion
        } = this.elements || {};

        const navItem = tabSuggestion && tabSuggestion.closest ? tabSuggestion.closest('.nav-item') : null;

        if (navItem) navItem.classList.toggle('d-none', !allowed);

        else if (tabSuggestion) tabSuggestion.classList.toggle('d-none', !allowed);

        if (!allowed) {
            if (paneSuggestion) {
                paneSuggestion.classList.add('d-none');
                paneSuggestion.classList.remove('active');
            }
            this.activateBelowTab('citation');
        }
    }

    onBelowTabClick(e) {
        const btn = e.target.closest && e.target.closest('[data-ref-tab]');
        if (!btn || !this.elements.belowTabs || !this.elements.belowTabs.contains(btn)) return;
        const which = btn.getAttribute('data-ref-tab');
        if (which === 'suggestion' && !this.isSuggestionTabAllowed()) return;
        if (which === 'citation' || which === 'suggestion') {
            this.activateBelowTab(which);
        }
    }

    /**
     * Show Citation Preview or Suggestion pane under the reference Preview.
     * @param {'citation'|'suggestion'} which
     */
    activateBelowTab(which) {
        let target = which;
        if (target === 'suggestion' && !this.isSuggestionTabAllowed()) {
            target = 'citation';
        }
        const isCite = target === 'citation';
        const {
            tabCitation,
            tabSuggestion,
            paneCitation,
            paneSuggestion
        } = this.elements || {};

        if (tabCitation) {
            tabCitation.classList.toggle('active', isCite);
            tabCitation.setAttribute('aria-selected', isCite ? 'true' : 'false');
        }
        if (tabSuggestion) {
            tabSuggestion.classList.toggle('active', !isCite);
            tabSuggestion.setAttribute('aria-selected', isCite ? 'false' : 'true');
        }
        if (paneCitation) {
            paneCitation.classList.toggle('active', isCite);
            paneCitation.classList.toggle('d-none', !isCite);
        }
        if (paneSuggestion) {
            paneSuggestion.classList.toggle('active', !isCite);
            paneSuggestion.classList.toggle('d-none', isCite);
        }
    }

    onAddAuthorClick() {
        this.stagePersonInsert('author');
    }

    onAddEditorClick() {
        this.stagePersonInsert('editor');
    }

    onAddEtalClick() {
        this.stageEtalInsert();
    }

    onFieldInput() {
        try {
            // Draft only — preview updates on field Apply
            this.syncActiveEditorToState();
            this.formModified = true;
        } catch (err) {
            this.trackError('onFieldInput', err.message);
        }
    }

    onFieldKeydown(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.handleFieldApply(e);
        }
    }

    onPreviewClick(e) {
        const seg = e.target.closest && e.target.closest('.ref-preview-seg');
        if (!seg || !this.elements.previewHost.contains(seg)) return;
        const fieldKey = seg.getAttribute('data-field-key');
        const insertId = seg.getAttribute('data-insert-id');
        if (fieldKey) this.openFieldInEditor(fieldKey);
        else if (insertId) this.openPendingInsertEditor(insertId);
    }

    onPreviewKeydown(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const seg = e.target.closest && e.target.closest('.ref-preview-seg');
        if (!seg) return;
        e.preventDefault();
        const fieldKey = seg.getAttribute('data-field-key');
        const insertId = seg.getAttribute('data-insert-id');
        if (fieldKey) this.openFieldInEditor(fieldKey);
        else if (insertId) this.openPendingInsertEditor(insertId);
    }

    onSuggestionChipClick(e) {
        const chip = e.target.closest && e.target.closest('.ref-chip[data-field-key]');
        if (!chip) return;
        const key = chip.getAttribute('data-field-key');
        this.activateSuggestionPlaceholder(key);
        this.openFieldInEditor(key);
    }

    onStagedInsertClick(e) {
        const removeBtn = e.target.closest && e.target.closest('[data-remove-insert]');
        if (removeBtn) {
            const id = removeBtn.getAttribute('data-remove-insert');
            this.removePendingInsert(id);
            return;
        }
        const chip = e.target.closest && e.target.closest('.ref-chip[data-insert-id]');
        if (!chip) return;
        const id = chip.getAttribute('data-insert-id');
        this.openPendingInsertEditor(id);
    }

    ensureDirtyAlertConfig() {
        if (typeof ALERT_MESSAGE === 'undefined' || !ALERT_MESSAGE) return;
        if (ALERT_MESSAGE.EDIT_REF_TEXT_DIRTY) return;
        ALERT_MESSAGE.EDIT_REF_TEXT_DIRTY = {
            type: 'warning',
            title: 'Unsaved field edit',
            text: 'Update or Revert the current field before editing another, or Stay to keep editing.',
            button1: 'Update',
            button2: 'Stay',
            button3: 'Revert',
            param: true,
            Options: {
                hide: true
            }
        };
    }

    isActiveEditDirty() {
        if (!this.editState || !this._activeFieldKey) return false;
        const key = this._activeFieldKey;
        if (key.indexOf('pending_') === 0) {
            const id = key.replace(/^pending_/, '');
            const ins = (this.editState.pendingInserts || []).find((p) => p.id === id);
            if (!ins || ins.kind !== 'person') return false;
            const s = ins.surname || '';
            const g = ins.given || '';
            const ps = ins._previewSurname != null ? ins._previewSurname : '';
            const pg = ins._previewGiven != null ? ins._previewGiven : '';
            return s !== ps || g !== pg;
        }
        const field = (this.editState.fields || []).find((f) => f.key === key);
        if (!field) return false;
        const staged = field.stagedValue != null ? field.stagedValue : '';
        const committed = field._previewValue != null ? field._previewValue : (field.original || '');
        if (field.allowHtml || field.richText) {
            return this.normalizeHtml(staged) !== this.normalizeHtml(committed);
        }
        return String(staged) !== String(committed);
    }

    async resolveDirtyBeforeSwitch(nextOpenFn) {
        if (typeof nextOpenFn !== 'function') return;
        if (!this._activeFieldKey) {
            nextOpenFn();
            return;
        }
        this.syncActiveEditorToState();
        if (!this.isActiveEditDirty()) {
            nextOpenFn();
            return;
        }
        this.ensureDirtyAlertConfig();
        if (typeof AlertNewDialog === 'undefined' || typeof AlertNewDialog.fire !== 'function') {
            if (typeof TOASTER_ALERT === 'function') {
                TOASTER_ALERT('Finish or revert the field in Edit Field before applying', {
                    type: 'warning'
                });
            }
            return;
        }
        try {
            const result = await AlertNewDialog.fire('EDIT_REF_TEXT_DIRTY');
            if (!result || result.isDenied) return;
            if (result.button3) this.handleFieldApply();
            else if (result.isConfirmed) this.handleFieldRevert();
            else return;
            nextOpenFn();
        } catch (err) {
            this.trackError('resolveDirtyBeforeSwitch', err.message);
        }
    }

    // -------------------------------------------------------------------------
    // Resolve / pattern helpers (existing)
    // -------------------------------------------------------------------------

    resolveRefNode(refNode) {
        try {
            if (refNode) {
                const el = refNode.$ || refNode;
                if (el && el.nodeType === 1) {
                    if (el.classList && el.classList.contains('ref')) return el;
                    const ascent = el.closest ? el.closest('div.ref') : null;
                    if (ascent) return ascent;
                }
            }
            if (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION.NODE) {
                const n = IMPACT_SELECTION.NODE.$ || IMPACT_SELECTION.NODE;
                if (n && n.nodeType === 1) {
                    if (n.classList && n.classList.contains('ref')) return n;
                    const ascent = n.closest ? n.closest('div.ref') : null;
                    if (ascent) return ascent;
                }
            }
            if (typeof GlobalEditor !== 'undefined' && GlobalEditor.getSelection) {
                const start = GlobalEditor.getSelection().getStartElement();
                if (start) {
                    const div = start.getAscendant('div', true);
                    if (div && div.hasClass && div.hasClass('ref')) return div.$;
                    if (div && div.$) {
                        const ascent = div.$.closest ? div.$.closest('div.ref') : null;
                        if (ascent) return ascent;
                    }
                }
            }
        } catch (err) {
            this.trackError('resolveRefNode', err.message);
        }
        return null;
    }

    getFieldTokenByElement(el) {
        if (!el || !el.classList) return null;
        const tokens = Object.keys(EditReferenceTextModule.TOKEN_LABELS);
        for (let i = 0; i < tokens.length; i += 1) {
            if (el.classList.contains(tokens[i])) return tokens[i];
        }
        return null;
    }

    getOrderedLeafNodes(mixed) {
        if (!mixed || !mixed.querySelectorAll) return [];
        const nodes = Array.from(mixed.querySelectorAll(EditReferenceTextModule.LEAF_SELECTOR));
        return nodes.sort((a, b) => {
            if (a === b) return 0;
            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1;
        });
    }

    getDelimiterBetween(first, second) {
        if (!first || !second || !first.ownerDocument) return '';
        try {
            const range = first.ownerDocument.createRange();
            range.setStartAfter(first);
            range.setEndBefore(second);
            return (range.toString() || '').replace(/\s+/g, ' ');
        } catch (err) {
            this.trackError('getDelimiterBetween', err.message);
            return '';
        }
    }

    extractPatternFromMixed(mixed) {
        const leaves = this.getOrderedLeafNodes(mixed);
        const tokens = leaves.map((el) => this.getFieldTokenByElement(el)).filter(Boolean);
        const delimiters = [];
        for (let i = 0; i < leaves.length - 1; i += 1) {
            delimiters.push(this.getDelimiterBetween(leaves[i], leaves[i + 1]));
        }
        const pubType = ((mixed && mixed.getAttribute('publication-type')) || '').toLowerCase();
        const roleInfo = this.getReferenceRoleInfo(mixed, pubType);
        const authorAnalysis = this.analyzePersonGroup(mixed, 'author', roleInfo);
        const editorAnalysis = this.analyzePersonGroup(mixed, 'editor', roleInfo);
        const authorList = (authorAnalysis && authorAnalysis.names) ? authorAnalysis.names.slice() : [];
        const editorList = (editorAnalysis && editorAnalysis.names) ? editorAnalysis.names.slice() : [];
        return {
            tokens,
            delimiters,
            signature: `${tokens.join('|')}||${delimiters.join('|')}`,
            uniqueTokens: [...new Set(tokens)],
            publicationType: pubType,
            authorList,
            editorList,
            bookAuthorRole: this.classifyBookAuthorRole(mixed, pubType, editorAnalysis, roleInfo),
            roleInfo
        };
    }

    collectSameTypePatterns(pubType, refNode) {
        if (!pubType) return [];
        const root = (refNode && refNode.closest && refNode.closest('.ref-list')) || document;
        const selector = `.mixed-citation[publication-type="${pubType.replace(/"/g, '\\"')}"]`;
        return Array.from(root.querySelectorAll(selector))
            .map((mixed) => this.extractPatternFromMixed(mixed))
            .filter((p) => p.tokens && p.tokens.length > 0);
    }

    pickDominantPattern(patterns, currentMixed) {
        if (!patterns || !patterns.length) {
            return this.extractPatternFromMixed(currentMixed);
        }
        const freq = new Map();
        patterns.forEach((p) => {
            const key = p.signature;
            const item = freq.get(key) || {
                count: 0,
                pattern: p
            };
            item.count += 1;
            freq.set(key, item);
        });
        let selected = null;
        freq.forEach((item) => {
            if (!selected || item.count > selected.count) selected = item;
        });
        const currentPattern = this.extractPatternFromMixed(currentMixed);
        const ties = Array.from(freq.values()).filter((item) => item.count === selected.count);
        if (ties.length > 1) {
            const sameAsCurrent = ties.find((item) => item.pattern.signature === currentPattern.signature);
            if (sameAsCurrent) return sameAsCurrent.pattern;
        }
        return selected ? selected.pattern : currentPattern;
    }

    // -------------------------------------------------------------------------
    // Author / editor analysis
    // -------------------------------------------------------------------------

    classifyAuthorShape(count, hasEtal) {
        if (hasEtal && count >= 1) return 'multi_etal';
        if (count <= 0) return 'empty';
        if (count === 1) return 'single';
        if (count === 2) return 'dual';
        return 'multi';
    }

    isBookPubType(pubType) {
        const type = (pubType || '').toLowerCase();
        return !!EditReferenceTextModule.BOOK_PUB_TYPES[type];
    }

    getFirstChapterTitleOrSource(mixed) {
        if (!mixed || !mixed.querySelectorAll) return null;
        const nodes = Array.from(mixed.querySelectorAll('.chapter-title, .source'));
        nodes.sort((a, b) => (
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1
        ));
        return nodes[0] || null;
    }

    isBeforeChapterTitleOrSource(nameEl, mixed) {
        const marker = this.getFirstChapterTitleOrSource(mixed);
        if (!nameEl || !marker || nameEl === marker) return false;
        return !!(nameEl.compareDocumentPosition(marker) & Node.DOCUMENT_POSITION_FOLLOWING);
    }

    getInferredStringNameRole(nameEl, mixed, pubType) {
        if (!nameEl || !mixed || !this.isBookPubType(pubType)) return null;
        if (!this.getFirstChapterTitleOrSource(mixed)) return null;
        const explicitGroup = nameEl.closest && nameEl.closest('.person-group[person-group-type]');
        if (explicitGroup) return null;
        return this.isBeforeChapterTitleOrSource(nameEl, mixed) ? 'author' : 'editor';
    }

    getReferenceRoleInfo(mixed, pubType) {
        const info = {
            isBook: this.isBookPubType(pubType),
            marker: this.getFirstChapterTitleOrSource(mixed),
            inferredAuthorNames: [],
            inferredEditorNames: [],
            inferredRoleByName: new Map()
        };
        if (!mixed || !mixed.querySelectorAll || !info.isBook || !info.marker) return info;
        Array.from(mixed.querySelectorAll('.string-name')).forEach((sn) => {
            const role = this.getInferredStringNameRole(sn, mixed, pubType);
            if (!role) return;
            info.inferredRoleByName.set(sn, role);
            if (role === 'editor') info.inferredEditorNames.push(sn);
            else info.inferredAuthorNames.push(sn);
        });
        return info;
    }

    normalizeTemplateToken(token) {
        const map = {
            'article-title': 'article',
            'chapter-title': 'chap',
            'ext-link': 'extlink',
            'publisher-name': 'pubname',
            'publisher-loc': 'publoc',
            'given-names': 'given',
            'string-name': 'name'
        };
        return map[token] || token;
    }

    getTemplateItemsFromMixed(mixed, roleInfo) {
        if (!mixed || !mixed.querySelectorAll) return [];
        const pubType = (mixed.getAttribute('publication-type') || '').toLowerCase();
        roleInfo = roleInfo || this.getReferenceRoleInfo(mixed, pubType);
        const nodes = [];
        Array.from(mixed.querySelectorAll('.string-name, ' + EditReferenceTextModule.LEAF_SELECTOR)).forEach((el) => {
            if (!el || !el.classList) return;
            if ((el.classList.contains('surname') || el.classList.contains('given-names')) &&
                el.closest && el.closest('.string-name')) return;
            nodes.push(el);
        });
        nodes.sort((a, b) => (
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1
        ));

        const items = [];
        nodes.forEach((el) => {
            if (el.classList.contains('string-name')) {
                const inferredRole = roleInfo.inferredRoleByName && roleInfo.inferredRoleByName.get(el);
                const role = inferredRole || this.getPersonGroupTypeForName(el);
                const last = items[items.length - 1];
                if (!last || last.token !== role) {
                    items.push({
                        token: role,
                        el
                    });
                }
                return;
            }
            const token = this.getFieldTokenByElement(el);
            if (!token || EditReferenceTextModule.PERSON_TOKENS[token]) return;
            items.push({
                token: this.normalizeTemplateToken(token),
                el
            });
        });
        return items;
    }

    makeTemplateSignature(mixed, roleInfo) {
        if (!mixed) return '';
        const pubType = (mixed.getAttribute('publication-type') || '').toLowerCase();
        const tokens = this.getTemplateItemsFromMixed(mixed, roleInfo).map((item) => item.token);
        return [pubType].concat(tokens).filter(Boolean).join('_');
    }

    getTemplateTokensFromSignature(signature) {
        const parts = String(signature || '').split('_').filter(Boolean);
        if (!parts.length) return [];
        return parts.slice(1);
    }

    getTemplateTokenForFieldToken(token) {
        if (EditReferenceTextModule.PERSON_TOKENS[token]) return token;
        return this.normalizeTemplateToken(token);
    }

    isExactOneTokenExpansion(currentTokens, peerTokens, token) {
        const current = currentTokens || [];
        const peer = peerTokens || [];
        if (!token || peer.length !== current.length + 1) return false;
        let skipped = false;
        let currentIndex = 0;
        for (let i = 0; i < peer.length; i += 1) {
            if (!skipped && peer[i] === token) {
                skipped = true;
                continue;
            }
            if (peer[i] !== current[currentIndex]) return false;
            currentIndex += 1;
        }
        return skipped && currentIndex === current.length;
    }

    areTemplateTokensAligned(currentTokens, peerTokens) {
        const current = currentTokens || [];
        const peer = peerTokens || [];
        if (current.length !== peer.length) return false;
        for (let i = 0; i < current.length; i += 1) {
            if (current[i] !== peer[i]) return false;
        }
        return true;
    }

    buildRefListTemplateCatalog(refNode) {
        const root = (refNode && refNode.closest && refNode.closest('.ref-list')) || document;
        const currentMixed = refNode && refNode.querySelector ? refNode.querySelector('.mixed-citation') : null;
        const pubType = currentMixed ? (currentMixed.getAttribute('publication-type') || '') : '';
        const selector = pubType ?
            `.mixed-citation[publication-type="${pubType.replace(/"/g, '\\"')}"]` :
            '.mixed-citation';
        const entries = [];
        Array.from(root.querySelectorAll(selector)).forEach((mixed) => {
            const roleInfo = this.getReferenceRoleInfo(mixed, mixed.getAttribute('publication-type') || '');
            const signature = this.makeTemplateSignature(mixed, roleInfo);
            if (!signature) return;
            entries.push({
                mixed,
                signature,
                tokens: this.getTemplateTokensFromSignature(signature),
                pattern: this.extractPatternFromMixed(mixed),
                roleInfo,
                ref: mixed.closest ? mixed.closest('.ref') : null
            });
        });
        return entries;
    }

    findAlignedPeerForMissingToken(token, currentSignature, templateCatalog, currentRef) {
        const wanted = this.getTemplateTokenForFieldToken(token);
        const currentTokens = this.getTemplateTokensFromSignature(currentSignature);
        const matches = (templateCatalog || []).filter((entry) => (
            entry &&
            entry.ref !== currentRef &&
            this.isExactOneTokenExpansion(currentTokens, entry.tokens || [], wanted)
        ));
        if (!matches.length) return null;
        return matches[0];
    }

    findAlignedPeerForPersonGrowth(groupType, currentAnalysis, templateCatalog, currentRef, currentSignature, mode) {
        const local = currentAnalysis && currentAnalysis[groupType] ? currentAnalysis[groupType] : null;
        const localCount = local ? local.count || 0 : 0;
        const localHasEtal = !!(local && local.hasEtal);
        const currentTokens = this.getTemplateTokensFromSignature(currentSignature);
        return (templateCatalog || []).find((entry) => {
            if (!entry || entry.ref === currentRef) return false;
            const peerTokens = entry.tokens || [];
            const sameStructure = this.areTemplateTokensAligned(currentTokens, peerTokens);
            const roleExpansion = mode === 'person' &&
                this.isExactOneTokenExpansion(currentTokens, peerTokens, groupType);
            const etalExpansion = mode === 'etal' &&
                this.isExactOneTokenExpansion(currentTokens, peerTokens, 'etal');
            if (!sameStructure && !roleExpansion && !etalExpansion) return false;
            const pattern = entry.pattern || {};
            const peerList = groupType === 'editor' ? pattern.editorList : pattern.authorList;
            const peerCount = (peerList || []).length;
            if (mode === 'etal') {
                const peerAnalysis = this.analyzePersonGroup(entry.mixed, groupType, entry.roleInfo);
                return peerAnalysis && peerAnalysis.hasEtal && !localHasEtal && localCount > 0;
            }
            return peerCount > localCount;
        }) || null;
    }

    computeAlignedPersonSuggestions(currentAnalysis, templateCatalog, currentRef, currentSignature) {
        const authorPeer = this.findAlignedPeerForPersonGrowth(
            'author', currentAnalysis, templateCatalog, currentRef, currentSignature, 'person'
        );
        const editorPeer = this.findAlignedPeerForPersonGrowth(
            'editor', currentAnalysis, templateCatalog, currentRef, currentSignature, 'person'
        );
        const authorEtalPeer = this.findAlignedPeerForPersonGrowth(
            'author', currentAnalysis, templateCatalog, currentRef, currentSignature, 'etal'
        );
        const editorEtalPeer = this.findAlignedPeerForPersonGrowth(
            'editor', currentAnalysis, templateCatalog, currentRef, currentSignature, 'etal'
        );
        return {
            authorPeer,
            editorPeer,
            etalPeer: authorEtalPeer || editorEtalPeer,
            etalGroupType: authorEtalPeer ? 'author' : (editorEtalPeer ? 'editor' : null),
            canAddAuthor: !!authorPeer,
            canAddEditor: !!editorPeer,
            canAddEtal: !!(authorEtalPeer || editorEtalPeer)
        };
    }

    getCurrentTemplateSignatureWithPending(type) {
        if (!this.editState || !this.editState.mixed) return '';
        const base = this.makeTemplateSignature(this.editState.mixed, this.editState.roleInfo);
        if (!base || !type) return base;
        const parts = base.split('_');
        const insertAfter = Math.max(parts.lastIndexOf('source'), parts.lastIndexOf('chap'));
        if (insertAfter >= 0) parts.splice(insertAfter + 1, 0, type);
        else parts.push(type);
        return parts.join('_');
    }

    findExactTemplateForSuggestion(type) {
        if (!this.editState || !type) return null;
        const wanted = this.getCurrentTemplateSignatureWithPending(type);
        if (!wanted) return null;
        const catalog = this.editState.templateCatalog || [];
        const currentRef = this.editState.ref;
        const matches = catalog.filter((entry) => (
            entry && entry.signature === wanted && entry.ref !== currentRef
        ));
        if (!matches.length) return null;
        return matches[0];
    }

    /**
     * Detect editor role from text after author/person-group when XML
     * lacks person-group-type=editor. Markers: (Editor), (Eds.), etc.
     */
    detectEditorRoleHint(mixed) {
        if (!mixed) return false;
        const markers = EditReferenceTextModule.EDITOR_ROLE_MARKERS;
        const group = this.getPersonGroupEl(mixed, 'author') ||
            mixed.querySelector('.person-group');
        let probe = '';
        if (group) {
            let node = group.nextSibling;
            let steps = 0;
            while (node && steps < 8) {
                if (node.nodeType === 3) probe += node.textContent || '';
                else if (node.nodeType === 1) {
                    const tag = (node.tagName || '').toLowerCase();
                    if (tag === 'insert' || tag === 'delete' || tag === 'del') {
                        probe += node.textContent || '';
                    } else if (node.classList && (
                            node.classList.contains('year') ||
                            node.classList.contains('article-title') ||
                            node.classList.contains('source') ||
                            node.classList.contains('chapter-title')
                        )) {
                        break;
                    } else {
                        probe += node.textContent || '';
                    }
                }
                if (probe.length > 80) break;
                node = node.nextSibling;
                steps += 1;
            }
        }
        if (!probe) {
            const text = (mixed.textContent || '').slice(0, 400);
            probe = text;
        }
        return markers.some((m) => probe.toLowerCase().indexOf(m.toLowerCase()) !== -1);
    }

    classifyBookAuthorRole(mixed, pubType, editorAnalysis, roleInfo) {
        const isBook = this.isBookPubType(pubType);
        if (editorAnalysis && editorAnalysis.count > 0) return 'edited';
        if (roleInfo && roleInfo.inferredEditorNames && roleInfo.inferredEditorNames.length) return 'edited';
        if (this.detectEditorRoleHint(mixed)) return 'edited';
        if (isBook) return 'contributed';
        return 'unknown';
    }

    getPatternTokenIndexes(tokens) {
        const indexes = {};
        (tokens || []).forEach((token, idx) => {
            if (!indexes[token]) indexes[token] = [];
            indexes[token].push(idx);
        });
        return indexes;
    }

    findNearestPatternNeighbor(tokens, startIdx, direction, currentPresent) {
        const step = direction < 0 ? -1 : 1;
        for (let i = startIdx + step; i >= 0 && i < tokens.length; i += step) {
            const token = tokens[i];
            if (currentPresent[token]) {
                return {
                    token,
                    patternIndex: i
                };
            }
        }
        return null;
    }

    countPatternFrequency(patterns, signature) {
        return (patterns || []).filter((p) => p && p.signature === signature).length;
    }

    scoreSuggestionPlacement(candidate) {
        let score = candidate.confidence || 0;
        if (candidate.prevToken) score += 3;
        if (candidate.nextToken) score += 3;
        if (candidate.prevToken && candidate.nextToken) score += 2;
        const span = candidate.prevPatternIndex != null && candidate.nextPatternIndex != null ?
            candidate.nextPatternIndex - candidate.prevPatternIndex :
            20;
        score -= Math.max(0, span - 2);
        return score;
    }

    resolveMissingTokenPlacement(token, sameTypePatterns, currentTokens) {
        const currentPresent = {};
        (currentTokens || []).forEach((t) => {
            currentPresent[t] = true;
        });

        let best = null;
        (sameTypePatterns || []).forEach((pattern) => {
            const tokens = pattern && pattern.tokens ? pattern.tokens : [];
            const indexes = this.getPatternTokenIndexes(tokens)[token] || [];
            indexes.forEach((patternIndex) => {
                const prev = this.findNearestPatternNeighbor(tokens, patternIndex, -1, currentPresent);
                const next = this.findNearestPatternNeighbor(tokens, patternIndex, 1, currentPresent);
                const beforeDelim = pattern.delimiters && pattern.delimiters[patternIndex - 1] != null ?
                    pattern.delimiters[patternIndex - 1] :
                    ' ';
                const afterDelim = pattern.delimiters && pattern.delimiters[patternIndex] != null ?
                    pattern.delimiters[patternIndex] :
                    ' ';
                const candidate = {
                    beforeDelim,
                    afterDelim,
                    prevToken: prev ? prev.token : null,
                    nextToken: next ? next.token : null,
                    patternIndex,
                    prevPatternIndex: prev ? prev.patternIndex : null,
                    nextPatternIndex: next ? next.patternIndex : null,
                    confidence: this.countPatternFrequency(sameTypePatterns, pattern.signature)
                };
                candidate._score = this.scoreSuggestionPlacement(candidate);
                if (!best || candidate._score > best._score) best = candidate;
            });
        });

        if (!best) return null;
        delete best._score;
        return best;
    }

    findSuggestionInsertIndex(fields, placement) {
        const list = fields || [];
        if (placement && placement.prevToken) {
            for (let i = list.length - 1; i >= 0; i -= 1) {
                if (list[i] && list[i].token === placement.prevToken && list[i].el) {
                    let insertAt = i + 1;
                    while (insertAt < list.length) {
                        const field = list[insertAt];
                        const fp = field && field.suggestionPlacement;
                        if (!field || !field.virtual || !fp || fp.prevToken !== placement.prevToken) break;
                        if ((fp.patternIndex || 0) > (placement.patternIndex || 0)) break;
                        insertAt += 1;
                    }
                    return insertAt;
                }
            }
        }
        if (placement && placement.nextToken) {
            for (let i = 0; i < list.length; i += 1) {
                if (list[i] && list[i].token === placement.nextToken && list[i].el) {
                    let insertAt = i;
                    while (insertAt > 0) {
                        const field = list[insertAt - 1];
                        const fp = field && field.suggestionPlacement;
                        if (!field || !field.virtual || !fp || fp.nextToken !== placement.nextToken) break;
                        if ((fp.patternIndex || 0) < (placement.patternIndex || 0)) break;
                        insertAt -= 1;
                    }
                    return insertAt;
                }
            }
        }
        return list.length;
    }

    spliceSuggestionDelimiter(delimiters, index, placement, fieldCountBeforeInsert) {
        const list = delimiters || [];
        const beforeDelim = placement && placement.beforeDelim != null ? placement.beforeDelim : ' ';
        const afterDelim = placement && placement.afterDelim != null ? placement.afterDelim : ' ';

        if (fieldCountBeforeInsert <= 0) return list;
        if (index <= 0) {
            list.splice(0, 0, afterDelim);
            return list;
        }
        if (index >= fieldCountBeforeInsert) {
            list.splice(index - 1, 0, beforeDelim);
            return list;
        }
        list.splice(index - 1, 1, beforeDelim, afterDelim);
        return list;
    }

    /**
     * Add virtual fields for non-person tokens only when a same-parent peer
     * has an exact current-signature + missing-token template.
     */
    appendPeerGapVirtuals(ordered, sameTypePatterns, pubType, templateCatalog, currentSignature, currentRef) {
        const list = (ordered && ordered.fields) || [];
        const delimiters = (ordered && ordered.delimiters) || [];
        const present = new Set(list.map((f) => f.token));
        const currentTokens = list.map((f) => f.token).filter(Boolean);
        const personTokens = EditReferenceTextModule.PERSON_TOKENS;
        const alignedSuggestions = {};
        EditReferenceTextModule.SIMPLE_FIELDS.forEach((def) => {
            const token = def && def.key;
            if (!token) return;
            if (token === 'etal') return;
            if (personTokens[token]) return;
            if (present.has(token)) return;
            const alignedPeer = this.findAlignedPeerForMissingToken(
                token, currentSignature, templateCatalog, currentRef
            );
            if (!alignedPeer) return;
            const simpleDef = this.getSimpleFieldDefByToken(token);
            const placementPatterns = alignedPeer.pattern ? [alignedPeer.pattern] : sameTypePatterns;
            const suggestionPlacement = this.resolveMissingTokenPlacement(token, placementPatterns, currentTokens);
            const insertIndex = this.findSuggestionInsertIndex(list, suggestionPlacement);
            const virtualField = {
                el: null,
                key: `suggested_peer_${token}`,
                label: this.getFieldLabel(token, pubType),
                token,
                groupType: null,
                original: '',
                originalText: '',
                stagedValue: '',
                textarea: !!(simpleDef && simpleDef.textarea),
                richText: !!(simpleDef && simpleDef.richText),
                allowHtml: !!(simpleDef && (simpleDef.allowHtml || simpleDef.richText)),
                sourceItalic: false,
                updateAttribute: !!(simpleDef && simpleDef.updateAttribute),
                virtual: true,
                suggested: true,
                previewPlaceholder: false,
                suggestionPlacement,
                templateEntry: alignedPeer
            };
            list.splice(insertIndex, 0, virtualField);
            this.spliceSuggestionDelimiter(delimiters, insertIndex, suggestionPlacement, list.length - 1);
            present.add(token);
            alignedSuggestions[token] = alignedPeer;
        });
        return {
            fields: list,
            delimiters,
            alignedSuggestions
        };
    }

    extractNamePattern(stringNameEl) {
        if (!stringNameEl) {
            return {
                tokens: ['surname', 'given-names'],
                delimiters: [' '],
                signature: 'surname|given-names|| '
            };
        }
        const kids = Array.from(stringNameEl.querySelectorAll('.surname, .given-names'));
        kids.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1));
        const tokens = kids.map((el) => (el.classList.contains('surname') ? 'surname' : 'given-names'));
        const delimiters = [];
        for (let i = 0; i < kids.length - 1; i += 1) {
            delimiters.push(this.getDelimiterBetween(kids[i], kids[i + 1]) || ' ');
        }
        if (!tokens.length) {
            return {
                tokens: ['surname', 'given-names'],
                delimiters: [' '],
                signature: 'surname|given-names|| '
            };
        }
        return {
            tokens,
            delimiters,
            signature: `${tokens.join('|')}||${delimiters.join('|')}`
        };
    }

    getPersonGroupEl(mixed, type) {
        if (!mixed) return null;
        return mixed.querySelector(`.person-group[person-group-type="${type}"]`) ||
            (type === 'author' ? mixed.querySelector('.person-group:not([person-group-type="editor"])') : null);
    }

    analyzePersonGroup(mixed, type, roleInfo) {
        roleInfo = roleInfo || this.getReferenceRoleInfo(mixed, mixed && mixed.getAttribute('publication-type'));
        const group = this.getPersonGroupEl(mixed, type);
        const stringNames = group ?
            Array.from(group.querySelectorAll(':scope > .string-name, :scope .string-name')) : [];
        // Prefer direct children when available
        const directNames = group ?
            Array.from(group.children).filter((c) => c.classList && c.classList.contains('string-name')) : [];
        const oppositeRole = type === 'editor' ? 'author' : 'editor';
        const inferredRoleByName = roleInfo.inferredRoleByName || new Map();
        const names = (directNames.length ? directNames.slice() : stringNames.slice()).filter((sn) => (
            inferredRoleByName.get(sn) !== oppositeRole
        ));
        const inferredNames = type === 'editor' ?
            (roleInfo.inferredEditorNames || []) :
            (roleInfo.inferredAuthorNames || []);
        inferredNames.forEach((sn) => {
            if (names.indexOf(sn) === -1) names.push(sn);
        });
        names.sort((a, b) => (
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1
        ));

        const etalInGroup = group ?
            group.querySelector('.etal') :
            null;
        const etalAfter = names.length ?
            (names[names.length - 1].parentNode ?
                Array.from(names[names.length - 1].parentNode.children).find((c) => c.classList && c.classList.contains('etal')) :
                null) :
            null;
        const etalEl = etalInGroup || etalAfter;
        const hasEtal = !!etalEl;
        const shape = this.classifyAuthorShape(names.length, hasEtal);

        const namePatterns = names.map((sn) => this.extractNamePattern(sn));
        const interDelims = [];
        for (let i = 0; i < names.length - 1; i += 1) {
            interDelims.push(this.getDelimiterBetween(names[i], names[i + 1]) || ', ');
        }
        let etalDelim = ' ';
        if (hasEtal && names.length) {
            etalDelim = this.getDelimiterBetween(names[names.length - 1], etalEl) || ' ';
        }

        const dominantInner = this.pickDominantNamePattern(namePatterns);

        return {
            type,
            group,
            count: names.length,
            hasEtal,
            shape,
            names,
            etalEl,
            namePattern: dominantInner,
            interNameDelimiter: interDelims[0] || ', ',
            interNameDelimiters: interDelims,
            etalDelimiter: etalDelim,
            etalText: etalEl ? (etalEl.textContent || 'et al.') : 'et al.'
        };
    }

    pickDominantNamePattern(patterns) {
        if (!patterns || !patterns.length) {
            return {
                tokens: ['surname', 'given-names'],
                delimiters: [' '],
                signature: 'surname|given-names|| '
            };
        }
        const freq = new Map();
        patterns.forEach((p) => {
            const key = p.signature;
            const item = freq.get(key) || {
                count: 0,
                pattern: p
            };
            item.count += 1;
            freq.set(key, item);
        });
        let selected = null;
        freq.forEach((item) => {
            if (!selected || item.count > selected.count) selected = item;
        });
        return selected ? selected.pattern : patterns[0];
    }

    collectPersonNamePatternsAcrossRefs(pubType, refNode, type) {
        if (!pubType) return [];
        const root = (refNode && refNode.closest && refNode.closest('.ref-list')) || document;
        const selector = `.mixed-citation[publication-type="${pubType.replace(/"/g, '\\"')}"]`;
        const patterns = [];
        Array.from(root.querySelectorAll(selector)).forEach((mixed) => {
            const roleInfo = this.getReferenceRoleInfo(mixed, pubType);
            const analysis = this.analyzePersonGroup(mixed, type, roleInfo);
            if (analysis.namePattern) patterns.push(analysis.namePattern);
            if (analysis.interNameDelimiter) {
                patterns._inter = patterns._inter || [];
                patterns._inter.push(analysis.interNameDelimiter);
            }
        });
        return patterns;
    }

    resolveDominantPersonPattern(pubType, refNode, type, localAnalysis) {
        const across = this.collectPersonNamePatternsAcrossRefs(pubType, refNode, type);
        const namePat = this.pickDominantNamePattern(
            across.length ? across : (localAnalysis.namePattern ? [localAnalysis.namePattern] : [])
        );
        let inter = localAnalysis.interNameDelimiter || ', ';
        if (across._inter && across._inter.length) {
            const freq = new Map();
            across._inter.forEach((d) => freq.set(d, (freq.get(d) || 0) + 1));
            let best = null;
            freq.forEach((count, d) => {
                if (!best || count > best.count) best = {
                    d,
                    count
                };
            });
            if (best) inter = best.d;
        }
        return {
            namePattern: namePat,
            interNameDelimiter: inter
        };
    }

    isFullyItalicWrapped(el) {
        if (!el || !el.childNodes || !el.childNodes.length) return false;
        const nonSpaceText = Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim() !== '');
        if (nonSpaceText.length) return false;
        const children = Array.from(el.children || []);
        if (!children.length) return false;
        return children.every((child) => /^(i|em|italic)$/i.test(child.tagName || ''));
    }

    /**
     * Current/visible leaf value for dialog Preview + Edit Field.
     * Prefer <insert>; exclude <del>/<delete> so re-edit does not show old text.
     */
    findLeafInsertNode(el) {
        if (!el) return null;
        const host = this.isFullyItalicWrapped(el) ?
            (Array.from(el.children || [])[0] || el) :
            el;
        const direct = Array.from(host.children || []).find((c) => (c.tagName || '').toLowerCase() === 'insert');
        if (direct) return direct;
        if (el.querySelector) return el.querySelector('insert');
        return null;
    }

    getVisibleLeafText(el) {
        if (!el) return '';
        const ins = this.findLeafInsertNode(el);
        if (ins) return ins.textContent || '';
        try {
            const clone = el.cloneNode(true);
            if (clone.querySelectorAll) {
                clone.querySelectorAll('del, delete').forEach((n) => n.remove());
            }
            return clone.textContent || '';
        } catch (err) {
            return el.textContent || '';
        }
    }

    getVisibleLeafHtml(el) {
        if (!el) return '';
        const ins = this.findLeafInsertNode(el);
        if (ins) return ins.innerHTML || '';
        try {
            const clone = el.cloneNode(true);
            if (clone.querySelectorAll) {
                clone.querySelectorAll('del, delete').forEach((n) => n.remove());
            }
            const remainingIns = clone.querySelector && clone.querySelector('insert');
            if (
                remainingIns &&
                clone.children &&
                clone.children.length === 1 &&
                clone.firstElementChild === remainingIns
            ) {
                return remainingIns.innerHTML || '';
            }
            return clone.innerHTML || '';
        } catch (err) {
            return el.innerHTML || '';
        }
    }

    getSimpleFieldDefByToken(token) {
        return EditReferenceTextModule.SIMPLE_FIELDS.find((def) => def.key === token) || null;
    }

    getPersonGroupTypeForName(stringNameEl) {
        if (!stringNameEl || !stringNameEl.closest) return 'author';
        const pg = stringNameEl.closest('.person-group');
        if (!pg) return 'author';
        const t = (pg.getAttribute('person-group-type') || 'author').toLowerCase();
        return t === 'editor' ? 'editor' : 'author';
    }

    /**
     * Scan mixed-citation leaves; tag author/editor name fields separately.
     */
    scanLeafFields(mixed, roleInfo) {
        const fields = [];
        if (!mixed || !mixed.querySelectorAll) return fields;
        roleInfo = roleInfo || this.getReferenceRoleInfo(mixed, mixed.getAttribute('publication-type') || '');

        const authorNames = [];
        const editorNames = [];

        Array.from(mixed.querySelectorAll('.string-name')).forEach((sn) => {
            const inferredRole = roleInfo.inferredRoleByName && roleInfo.inferredRoleByName.get(sn);
            const gType = inferredRole || this.getPersonGroupTypeForName(sn);
            if (gType === 'editor') editorNames.push(sn);
            else authorNames.push(sn);
        });

        const pushNameFields = (list, groupType, labelPrefix) => {
            list.forEach((sn, idx) => {
                const n = list.length > 1 ? ` ${idx + 1}` : '';
                const nameParts = Array.from(sn.querySelectorAll('.surname, .given-names'));
                nameParts.sort((a, b) => (
                    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1
                ));

                if (nameParts.length) {
                    nameParts.forEach((part) => {
                        const isSurname = part.classList && part.classList.contains('surname');
                        const token = isSurname ? 'surname' : 'given-names';
                        const visibleText = this.getVisibleLeafText(part);
                        const visibleHtml = this.getVisibleLeafHtml(part);
                        fields.push({
                            el: part,
                            key: `${groupType}_${token}_${idx}`,
                            label: `${labelPrefix} ${isSurname ? 'Surname' : 'Given names'}${n}`,
                            token,
                            groupType,
                            nameIndex: idx,
                            original: visibleHtml,
                            originalText: visibleText,
                            stagedValue: visibleHtml,
                            allowHtml: true,
                            textarea: false,
                            virtual: false
                        });
                    });
                    return;
                }

                // Bare string-name (no surname/given children) — keep as its own segment
                const bareVal = this.getVisibleLeafText(sn).replace(/\s+/g, ' ').trim();
                if (!bareVal) return;
                fields.push({
                    el: sn,
                    key: `${groupType}_string-name_${idx}`,
                    label: `${labelPrefix}${n}`,
                    token: 'string-name',
                    groupType,
                    nameIndex: idx,
                    original: bareVal,
                    originalText: bareVal,
                    stagedValue: bareVal,
                    allowHtml: false,
                    textarea: false,
                    virtual: false
                });
            });
        };

        pushNameFields(authorNames, 'author', 'Author');
        pushNameFields(editorNames, 'editor', 'Editor');

        EditReferenceTextModule.SIMPLE_FIELDS.forEach((def) => {
            const nodes = mixed.querySelectorAll(def.selector);
            if (!nodes.length) return;
            // Skip etal that lives inside person-group — still editable as leaf
            const list = def.multi ? Array.from(nodes) : [nodes[0]];
            const pubType = mixed.getAttribute('publication-type') || '';
            list.forEach((el, idx) => {
                const suffix = list.length > 1 ? ` ${idx + 1}` : '';
                const visibleText = this.getVisibleLeafText(el);
                const allowHtml = !!(def.allowHtml || def.richText);
                const visibleHtml = allowHtml ? this.getVisibleLeafHtml(el) : visibleText;
                fields.push({
                    el,
                    key: `${def.key}_${idx}`,
                    label: `${this.getFieldLabel(def.key, pubType)}${suffix}`,
                    token: def.key,
                    groupType: null,
                    original: allowHtml ? visibleHtml : visibleText,
                    originalText: visibleText,
                    stagedValue: allowHtml ? visibleHtml : visibleText,
                    textarea: !!def.textarea,
                    richText: !!def.richText,
                    allowHtml,
                    sourceItalic: def.key === 'source' ? this.isFullyItalicWrapped(el) : false,
                    updateAttribute: !!def.updateAttribute,
                    virtual: false
                });
            });
        });

        return fields;
    }

    getFieldLabel(token, pubType) {
        const byType = EditReferenceTextModule.LABEL_BY_PUBTYPE;
        const typeKey = (pubType || '').toLowerCase();
        if (typeKey && byType[typeKey] && byType[typeKey][token]) {
            return byType[typeKey][token];
        }
        return EditReferenceTextModule.TOKEN_LABELS[token] || token;
    }

    getFieldHelp(token, pubType) {
        const typeKey = (pubType || '').toLowerCase();
        const byType = EditReferenceTextModule.HELP_BY_PUBTYPE;
        if (typeKey && byType[typeKey] && byType[typeKey][token]) {
            return byType[typeKey][token];
        }
        const byToken = EditReferenceTextModule.HELP_BY_TOKEN;
        if (byToken && byToken[token]) return byToken[token];
        return '';
    }

    /**
     * Bootstrap form-inline control (div wrapper — not nested <form>).
     * Help <small> only when `help` is non-empty.
     * @returns {{ form: HTMLElement, input: HTMLElement }}
     */
    makeInput(options = {}) {
        const {
            id,
            label: labelText,
            value = '',
            type = 'text',
            help = '',
            placeholder = '',
            dataAttrs = {},
            suggested = false,
            rows = 2,
            allowHtml = false
        } = options;

        // Use div, not <form>: #ref_active_editor already lives inside #editRefTextBody
        const form = document.createElement('div');
        form.className = 'ref-edit-form';

        const group = document.createElement('div');
        group.className = 'form-group mb-0';

        const label = document.createElement('label');
        label.setAttribute('for', id);
        label.textContent = labelText || '';
        if (suggested) {
            const badge = document.createElement('span');
            badge.className = 'suggested-tag';
            badge.textContent = 'Suggested';
            // label.appendChild(badge);
        }

        let input, isUrl = /uri|ext-link|pub-id/gi.test(id);
        if (allowHtml) {
            input = document.createElement('div');
            input.className = 'form-control form-control-sm bg-white pt-1 ref-html-editor';
            input.setAttribute('role', 'textbox');
            input.setAttribute('aria-multiline', 'true');
            input.setAttribute('contenteditable', 'true');
            input.tabIndex = 0;
            input.innerHTML = this.sanitizeHtml(value != null ? value : '');
        } else if (type === 'textarea' || isUrl) {
            input = document.createElement('textarea');
            input.rows = rows;
            input.className = 'form-control form-control-sm bg-white pt-1';
        } else {
            input = document.createElement('input');
            input.type = type || 'text';
            input.className = 'form-control form-control-sm';
            input.autocomplete = 'off';
        }

        input.id = id;
        if (!allowHtml) input.value = value != null ? value : '';
        if (placeholder && !allowHtml) input.placeholder = placeholder;

        Object.keys(dataAttrs || {}).forEach((k) => {
            if (dataAttrs[k] == null) return;
            input.dataset[k] = dataAttrs[k];
        });

        if (allowHtml) {
            input.dataset.rowSize = '1';
        } else if (/year|surname|given-names/i.test(id)) {
            // Force single-row height for these fields (no vertical resize)
        } else {
            input.dataset.rowSize = '1';
        }

        group.appendChild(label);
        group.appendChild(input);

        if (help) {
            const helpId = `${id}_help`;
            input.setAttribute('aria-describedby', helpId);
            const small = document.createElement('small');
            small.id = helpId;
            small.className = 'text-muted';
            small.textContent = help;
            group.appendChild(small);
        }

        // form.appendChild(group);
        return {
            form,
            group,
            input
        };
    }

    /**
     * Order scanned fields in this mixed-citation's document order and rebuild
     * live delimiters between consecutive field elements (preserves ", and ").
     * Peer-dominant patterns must not rearrange existing person leaves.
     */
    orderFieldsFromDocument(fields, mixed) {
        const scanned = fields || [];
        const byEl = new Map();
        scanned.forEach((f) => {
            if (f && f.el) byEl.set(f.el, f);
        });

        const ordered = [];
        const seen = new Set();
        const leaves = this.getOrderedLeafNodes(mixed);
        leaves.forEach((el) => {
            const field = byEl.get(el);
            if (!field || seen.has(field)) return;
            ordered.push(field);
            seen.add(field);
        });

        // Bare string-name fields (not in LEAF_SELECTOR) — insert in document order
        const extras = scanned.filter((f) => f && f.el && !seen.has(f));
        extras.sort((a, b) => {
            if (!a.el || !b.el) return 0;
            return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1;
        });
        extras.forEach((field) => {
            if (seen.has(field)) return;
            let insertAt = ordered.length;
            for (let i = 0; i < ordered.length; i += 1) {
                const other = ordered[i];
                if (!other.el || !field.el) continue;
                if (field.el.compareDocumentPosition(other.el) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    insertAt = i;
                    break;
                }
            }
            ordered.splice(insertAt, 0, field);
            seen.add(field);
        });

        // Virtual / no-el fields keep relative scan order at end (filled later by peer gaps)
        scanned.forEach((f) => {
            if (!f || seen.has(f)) return;
            if (f.el) return;
            ordered.push(f);
            seen.add(f);
        });

        const delimiters = [];
        for (let i = 0; i < ordered.length - 1; i += 1) {
            const a = ordered[i];
            const b = ordered[i + 1];
            if (a && a.el && b && b.el) {
                delimiters[i] = this.getDelimiterBetween(a.el, b.el);
            } else {
                delimiters[i] = ' ';
            }
        }
        return {
            fields: ordered,
            delimiters
        };
    }

    buildOrderedFields(fields, pattern, pubType) {
        if (!pattern || !pattern.tokens || !pattern.tokens.length) {
            return {
                fields,
                delimiters: []
            };
        }

        const buckets = {};
        fields.forEach((field) => {
            if (!buckets[field.token]) buckets[field.token] = [];
            buckets[field.token].push(field);
        });

        const cursor = {};
        const ordered = [];

        pattern.tokens.forEach((token, idx) => {
            cursor[token] = cursor[token] || 0;
            const pool = buckets[token] || [];
            const item = pool[cursor[token]];
            if (item) {
                ordered.push(item);
                cursor[token] += 1;
                return;
            }
            const simpleDef = this.getSimpleFieldDefByToken(token);
            // Do not auto-suggest surname/given as flat virtuals (use Add author instead)
            if (token === 'surname' || token === 'given-names') return;

            ordered.push({
                el: null,
                key: `suggested_${token}_${idx}`,
                label: this.getFieldLabel(token, pubType),
                token,
                groupType: null,
                original: '',
                originalText: '',
                stagedValue: '',
                textarea: !!(simpleDef && simpleDef.textarea),
                richText: !!(simpleDef && simpleDef.richText),
                allowHtml: !!(simpleDef && (simpleDef.allowHtml || simpleDef.richText)),
                sourceItalic: false,
                updateAttribute: !!(simpleDef && simpleDef.updateAttribute),
                virtual: true,
                suggested: true
            });
        });

        fields.forEach((field) => {
            if (!ordered.includes(field)) ordered.push(field);
        });

        const delimiters = [];
        for (let i = 0; i < ordered.length - 1; i += 1) {
            delimiters[i] = pattern.delimiters[i] != null ? pattern.delimiters[i] : ' ';
        }

        return {
            fields: ordered,
            delimiters
        };
    }

    // -------------------------------------------------------------------------
    // UI builders (Preview / Suggestion / Edit Field)
    // -------------------------------------------------------------------------

    destroySummernotes() {
        if (!this._summernoteIds.size || typeof window.$ === 'undefined' || !$.fn || !$.fn.summernote) return;
        this._summernoteIds.forEach((id) => {
            const elm = document.getElementById(id);
            if (!elm) return;
            try {
                $(elm).off('summernote.change', this.onFieldInput);
                if ($(elm).next('.note-editor').length) $(elm).summernote('destroy');
            } catch (err) {
                this.trackError('destroySummernotes', err.message);
            }
        });
        this._summernoteIds.clear();
    }

    clearActiveEditor() {
        this.destroySummernotes();
        const host = this.elements.activeEditor;
        if (host) host.innerHTML = '';
        this._activeFieldKey = null;
        this.setEditFieldExpanded(false);
        this.highlightActivePreviewSegment();
    }

    setEditFieldExpanded(expanded) {
        const {
            editIdleHint,
            editCollapse
        } = this.elements;
        if (editIdleHint) {
            editIdleHint.classList.toggle('ds-none', !!expanded);
        }
        if (editCollapse) {
            editCollapse.classList.toggle('show', !!expanded);
        }
        this.setFieldActionState(!!expanded);
    }

    setFieldActionState(hasActive) {
        const {
            fieldApplyBtn,
            fieldRevertBtn
        } = this.elements;
        [fieldApplyBtn, fieldRevertBtn].forEach((btn) => {
            if (!btn) return;
            btn.disabled = !hasActive;
            btn.classList.toggle('disabled', !hasActive);
        });
    }

    commitActiveToPreview() {
        if (!this.editState || !this._activeFieldKey) return;
        const key = this._activeFieldKey;
        if (key.indexOf('pending_') === 0) {
            const id = key.replace(/^pending_/, '');
            const ins = (this.editState.pendingInserts || []).find((p) => p.id === id);
            if (ins && ins.kind === 'person') {
                ins._previewSurname = ins.surname || '';
                ins._previewGiven = ins.given || '';
            }
            return;
        }
        const field = (this.editState.fields || []).find((f) => f.key === key);
        if (field) {
            field._previewValue = field.stagedValue != null ? field.stagedValue : (field.original || '');
            field.previewPlaceholder = false;
        }
    }

    handleFieldApply() {
        try {
            if (!this._activeFieldKey) return;
            this.syncActiveEditorToState();
            this.commitActiveToPreview();
            this.formModified = true;
            this.clearActiveEditor();
            this.refreshSuggestionUi();
            this.updatePreview();
            this.updateFooterApplyState();
            this.updateSyncCitationsCheckboxState();
        } catch (err) {
            this.trackError('handleFieldApply', err.message);
        }
    }

    handleFieldRevert() {
        try {
            if (!this.editState || !this._activeFieldKey) return;
            const key = this._activeFieldKey;

            if (key.indexOf('pending_') === 0) {
                const id = key.replace(/^pending_/, '');
                const ins = (this.editState.pendingInserts || []).find((p) => p.id === id);
                if (ins && ins.kind === 'person') {
                    ins.surname = ins._previewSurname || '';
                    ins.given = ins._previewGiven || '';
                }
            } else {
                const field = (this.editState.fields || []).find((f) => f.key === key);
                if (field) {
                    field.stagedValue = field.original || '';
                    field._previewValue = field.original || '';
                    field.previewPlaceholder = false;
                }
            }

            this.clearActiveEditor();
            this.formModified = this.isDirty();
            this.refreshSuggestionUi();
            this.updatePreview();
            this.updateFooterApplyState();
            this.updateSyncCitationsCheckboxState();
        } catch (err) {
            this.trackError('handleFieldRevert', err.message);
        }
    }

    makeChip(field, opts = {}) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ref-chip';
        if (field.suggested || field.virtual) chip.classList.add('suggested');
        if (opts.active) chip.classList.add('active');
        if (opts.staged) chip.classList.add('staged');
        chip.setAttribute('data-field-key', field.key);
        const label = document.createElement('span');
        label.className = 'chip-label';
        const previewVal = this.getFieldDisplayValue(field);
        const short = (previewVal || '').replace(/<[^>]+>/g, '').trim();
        label.textContent = short ?
            `${field.label}: ${short.slice(0, 28)}${short.length > 28 ? '…' : ''}` :
            field.label;
        chip.appendChild(label);
        if (field.suggested || field.virtual) {
            const badge = document.createElement('span');
            badge.className = 'suggested-tag';
            badge.textContent = 'Suggested';
            // chip.appendChild(badge);
        }
        return chip;
    }

    getFieldDisplayValue(field) {
        if (!field) return '';
        return this.getPreviewCommittedValue(field);
    }

    getPreviewCommittedValue(field) {
        if (!field) return '';
        if (field._previewValue != null) return field._previewValue;
        if (field.stagedValue != null && field.stagedValue !== '') return field.stagedValue;
        return field.original || '';
    }

    getSuggestionPlaceholderText(field) {
        if (!field) return '';
        const label = field.label || this.getFieldLabel(field.token, this.editState && this.editState.pubType);
        return `new ${label}`;
    }

    activateSuggestionPlaceholder(fieldKey) {
        if (!this.editState || !fieldKey) return;
        const field = (this.editState.fields || []).find((f) => f.key === fieldKey);
        if (!field || !field.virtual) return;
        if (this.hasMeaningfulValue(field, this.getPreviewCommittedValue(field))) return;
        field.previewPlaceholder = true;
        this.updatePreview();
    }

    getPreviewRenderValue(field) {
        const value = this.getPreviewCommittedValue(field);
        if (this.hasMeaningfulValue(field, value)) return value;
        if (field && field.virtual && field.previewPlaceholder) {
            return this.getSuggestionPlaceholderText(field);
        }
        return value;
    }

    /**
     * Suggestion chips = missing non-person tokens from pattern analysis.
     * When non-person fields already match, chips stay empty and static
     * Add author/editor (delimiter known from personPatterns) remain primary.
     */
    buildSuggestionChips() {
        const host = this.elements.suggestionChips;
        if (!host || !this.editState) return;
        host.innerHTML = '';
        const personTokens = EditReferenceTextModule.PERSON_TOKENS;
        const suggested = (this.editState.fields || []).filter((f) => {
            if (!(f.virtual || f.suggested)) return false;
            if (personTokens[f.token]) return false;
            return true;
        });
        if (!suggested.length) {
            // Static Add author/editor cover person growth — no empty-state noise
            return;
        }
        suggested.forEach((field) => {
            host.appendChild(this.makeChip(field, {
                active: field.key === this._activeFieldKey
            }));
        });
    }

    /**
     * Show/hide static Add author|editor|etal from peer analysis + book role.
     */
    updateStaticAddButtons() {
        const {
            addAuthorBtn,
            addEditorBtn,
            addEtalBtn
        } = this.elements;
        const pa = this.editState && this.editState.personAnalysis;
        const role = this.editState && this.editState.bookAuthorRole;
        const canAddAuthor = !!(this.editState && this.editState.canAddAuthor);
        const canAddEditor = !!(this.editState && this.editState.canAddEditor);
        const canAddEtal = !!(this.editState && this.editState.canAddEtal);

        if (!pa) {
            if (addAuthorBtn) addAuthorBtn.classList.toggle('ds-none', canAddEditor || !canAddAuthor);
            if (addEditorBtn) addEditorBtn.classList.toggle('ds-none', role !== 'edited' && !canAddEditor);
            if (addEtalBtn) addEtalBtn.classList.add('ds-none');
            return;
        }

        // Contributed / unknown: Add author only when peers attest multi-author
        // Edited: Add editor instead of Add author
        if (role === 'edited' || canAddEditor) {
            if (addAuthorBtn) addAuthorBtn.classList.add('ds-none');
            if (addEditorBtn) addEditorBtn.classList.remove('ds-none');
        } else {
            if (addAuthorBtn) addAuthorBtn.classList.toggle('ds-none', !canAddAuthor);
            if (addEditorBtn) {
                const hasEditorGroup = pa.editor && pa.editor.count > 0;
                addEditorBtn.classList.toggle('ds-none', !hasEditorGroup);
            }
        }

        const pendingEtal = (this.editState.pendingInserts || []).some((p) => p.kind === 'etal');
        if (addEtalBtn) {
            addEtalBtn.classList.toggle('ds-none', !canAddEtal || pendingEtal);
        }
    }

    buildPersonShapeInfo() {
        const host = this.elements.personShapeInfo;
        if (!host || !this.editState || !this.editState.personAnalysis) return;
        const {
            author,
            editor
        } = this.editState.personAnalysis;
        const fmt = (a) => {
            if (!a) return '';
            return `<span class="ref-shape-badge">${a.type}: ${a.shape} (${a.count}${a.hasEtal ? '+etal' : ''})</span>`;
        };
        host.innerHTML = fmt(author) + fmt(editor);
    }

    buildStagedInsertChips() {
        const host = this.elements.stagedInserts;
        if (!host || !this.editState) return;
        host.innerHTML = '';
        const inserts = this.editState.pendingInserts || [];
        if (!inserts.length) return;
        inserts.forEach((ins) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'ref-chip staged';
            chip.setAttribute('data-insert-id', ins.id);
            if (this._activeFieldKey === `pending_${ins.id}`) chip.classList.add('active');
            const label = document.createElement('span');
            label.className = 'chip-label';
            if (ins.kind === 'person') {
                label.textContent = `New ${ins.groupType}: ${ins.surname || ''} ${ins.given || ''}`.trim();
            } else if (ins.kind === 'etal') {
                label.textContent = `Et al. (${ins.groupType})`;
            } else {
                label.textContent = ins.label || ins.kind;
            }
            chip.appendChild(label);
            const rm = document.createElement('span');
            rm.setAttribute('data-remove-insert', ins.id);
            rm.textContent = '×';
            rm.title = 'Remove';
            chip.appendChild(rm);
            host.appendChild(chip);
        });
    }

    refreshSuggestionUi() {
        this.buildSuggestionChips();
        this.buildStagedInsertChips();
        this.updateStaticAddButtons();
    }

    highlightActivePreviewSegment() {
        const host = this.elements.previewHost;
        if (!host) return;
        host.querySelectorAll('.ref-preview-seg.active').forEach((el) => el.classList.remove('active'));
        if (!this._activeFieldKey) return;
        let sel = null;
        if (this._activeFieldKey.indexOf('pending_') === 0) {
            const id = this._activeFieldKey.replace(/^pending_/, '');
            sel = host.querySelector(`.ref-preview-seg[data-insert-id="${id}"]`);
        } else {
            const segs = host.querySelectorAll('.ref-preview-seg[data-field-key]');
            for (let i = 0; i < segs.length; i += 1) {
                if (segs[i].getAttribute('data-field-key') === this._activeFieldKey) {
                    sel = segs[i];
                    break;
                }
            }
        }
        if (sel) sel.classList.add('active');
    }

    escapeAttr(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    wrapPreviewSegment(token, innerHtml, attrs = {}) {
        const className = `${token} ref-preview-seg`.trim();
        let attrStr = ` class="${className}" data-name="${this.escapeAttr(token)}" tabindex="0"`;
        Object.keys(attrs).forEach((k) => {
            if (attrs[k] == null || attrs[k] === '') return;
            attrStr += ` ${k}="${this.escapeAttr(attrs[k])}"`;
        });
        return `<span${attrStr}>${innerHtml}</span>`;
    }

    async openFieldInEditor(fieldKey) {
        if (!this.editState) return;
        const field = (this.editState.fields || []).find((f) => f.key === fieldKey);
        if (!field) return;

        const doOpen = () => this.mountFieldInEditor(fieldKey);
        if (this._activeFieldKey && this._activeFieldKey !== fieldKey) {
            await this.resolveDirtyBeforeSwitch(doOpen);
            return;
        }
        doOpen();
    }

    mountFieldInEditor(fieldKey) {
        if (!this.editState) return;
        const field = (this.editState.fields || []).find((f) => f.key === fieldKey);
        if (!field) return;

        this.destroySummernotes();
        this._activeFieldKey = fieldKey;

        this.setEditFieldExpanded(true);
        const host = this.elements.activeEditor;
        if (!host) return;
        host.innerHTML = '';

        const pubType = this.editState.pubType || '';
        const inputId = `ref_field_${field.key}`;
        const startVal = field._previewValue != null ?
            field._previewValue :
            (field.stagedValue != null ? field.stagedValue : (field.original || ''));
        field.stagedValue = startVal;

        // Person leaves keep Author/Editor prefix labels from scan
        const label = (field.groupType && EditReferenceTextModule.PERSON_TOKENS[field.token]) ?
            field.label :
            this.getFieldLabel(field.token, pubType);

        const tallTokens = EditReferenceTextModule.TALL_TEXTAREA_TOKENS;
        const rows = (tallTokens && tallTokens[field.token]) ? 5 : (field.richText ? 3 : 2);

        const {
            group,
            input
        } = this.makeInput({
            id: inputId,
            label,
            value: startVal,
            type: field.textarea ? 'textarea' : 'text',
            help: this.getFieldHelp(field.token, pubType),
            placeholder: (field.suggested || field.virtual) ? 'Suggested value' : '',
            dataAttrs: {
                fieldKey: field.key
            },
            suggested: !!(field.suggested || field.virtual),
            rows,
            allowHtml: !!(field.allowHtml && !field.richText)
        });

        host.appendChild(group);
        field.inputId = inputId;
        field.label = label;

        if (field.richText) this.initSummernoteInput(field, inputId);
        else {
            input.focus();
            if (typeof input.select === 'function') input.select();
        }

        this.highlightActivePreviewSegment();
        this.refreshSuggestionUi();
    }

    async openPendingInsertEditor(insertId) {
        if (!this.editState) return;
        const ins = (this.editState.pendingInserts || []).find((p) => p.id === insertId);
        if (!ins || ins.kind !== 'person') return;

        const pendingKey = `pending_${insertId}`;
        const doOpen = () => this.mountPendingInsertEditor(insertId);
        if (this._activeFieldKey && this._activeFieldKey !== pendingKey) {
            await this.resolveDirtyBeforeSwitch(doOpen);
            return;
        }
        doOpen();
    }

    mountPendingInsertEditor(insertId) {
        if (!this.editState) return;
        const ins = (this.editState.pendingInserts || []).find((p) => p.id === insertId);
        if (!ins || ins.kind !== 'person') return;

        this.destroySummernotes();
        this._activeFieldKey = `pending_${insertId}`;

        this.setEditFieldExpanded(true);
        const host = this.elements.activeEditor;
        if (!host) return;
        host.innerHTML = '';

        const surnameStart = ins._previewSurname != null ? ins._previewSurname : (ins.surname || '');
        const givenStart = ins._previewGiven != null ? ins._previewGiven : (ins.given || '');
        ins.surname = surnameStart;
        ins.given = givenStart;

        const groupLabel = (ins.groupType || 'author').charAt(0).toUpperCase() + (ins.groupType || 'author').slice(1);
        const pubType = this.editState.pubType || '';

        const surnameId = `pending_${insertId}_surname`;
        const {
            group: sForm,
            input: sInput
        } = this.makeInput({
            id: surnameId,
            label: `${groupLabel} Surname (new)`,
            value: surnameStart,
            type: 'text',
            help: this.getFieldHelp('surname', pubType),
            dataAttrs: {
                insertId,
                insertKey: 'surname'
            }
        });
        host.appendChild(sForm);

        const givenId = `pending_${insertId}_given`;
        const {
            group: gForm
        } = this.makeInput({
            id: givenId,
            label: `${groupLabel} Given names (new)`,
            value: givenStart,
            type: 'text',
            help: this.getFieldHelp('given-names', pubType),
            dataAttrs: {
                insertId,
                insertKey: 'given'
            }
        });
        host.appendChild(gForm);

        sInput.focus();
        this.highlightActivePreviewSegment();
        this.refreshSuggestionUi();
    }

    discardActiveDraft() {
        if (!this.editState || !this._activeFieldKey) return;
        const key = this._activeFieldKey;
        if (key.indexOf('pending_') === 0) {
            const id = key.replace(/^pending_/, '');
            const ins = (this.editState.pendingInserts || []).find((p) => p.id === id);
            if (ins && ins.kind === 'person') {
                ins.surname = ins._previewSurname || '';
                ins.given = ins._previewGiven || '';
            }
            return;
        }
        const field = (this.editState.fields || []).find((f) => f.key === key);
        if (field) {
            field.stagedValue = field._previewValue != null ? field._previewValue : (field.original || '');
        }
    }

    syncActiveEditorToState() {
        if (!this.editState) return;

        // Sync field inputs currently in active editor
        const host = this.elements.activeEditor;
        if (!host) return;

        host.querySelectorAll('[data-field-key]').forEach((input) => {
            const key = input.getAttribute('data-field-key');
            const field = (this.editState.fields || []).find((f) => f.key === key);
            if (!field) return;
            let val = field.allowHtml && !field.richText ? (input.innerHTML || '') : (input.value || '');
            if (field.richText && typeof window.$ !== 'undefined' && $.fn && $.fn.summernote) {
                try {
                    if ($(input).next('.note-editor').length) {
                        if (this._summernote) this._summernote.bindTarget(input);
                        val = $(input).summernote('code') || '';
                    }
                } catch (err) {}
            }
            field.stagedValue = val;
            field.inputId = input.id;
        });

        host.querySelectorAll('[data-insert-id]').forEach((input) => {
            const id = input.getAttribute('data-insert-id');
            const key = input.getAttribute('data-insert-key');
            const ins = (this.editState.pendingInserts || []).find((p) => p.id === id);
            if (!ins || !key) return;
            ins[key] = input.value || '';
        });
    }

    initSummernoteInput(field, inputId) {
        if (!field || !field.richText || !inputId) return;
        if (typeof window.$ === 'undefined' || !$.fn || !$.fn.summernote) return;
        const input = document.getElementById(inputId);
        if (!input) return;
        try {
            const tempConfig = Object.assign({
                tabsize: 2,
                height: 45,
                focus: false
            }, this.SUMMERNOTE_CONFIG || {});
            if (this._summernote) this._summernote.bindTarget(input, {
                resetCache: true
            });
            $(input).summernote(tempConfig);
            $(input).summernote('code', field.stagedValue || field.original || '');
            $(input).on('summernote.change', this.onFieldInput);
            this._summernoteIds.add(inputId);
        } catch (err) {
            this.trackError('initSummernoteInput', err.message);
        }
    }

    stagePersonInsert(groupType) {
        if (!this.editState) return;
        // Edited books: force editor group when role is edited
        let type = groupType;
        if (this.editState.bookAuthorRole === 'edited' && type === 'author') {
            type = 'editor';
        }

        const analysis = this.editState.personAnalysis && this.editState.personAnalysis[type];
        const dominant = this.editState.personPatterns && this.editState.personPatterns[type];

        const namePattern = (dominant && dominant.namePattern) || (analysis && analysis.namePattern) || {
            tokens: ['surname', 'given-names'],
            delimiters: [' ']
        };

        const interDelim = (dominant && dominant.interNameDelimiter) || (analysis && analysis.interNameDelimiter) || ', ';
        const templateEntry = this.findExactTemplateForSuggestion(type);

        const id = `ins_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const pending = {
            id,
            kind: 'person',
            groupType: type,
            surname: '',
            given: '',
            _previewSurname: '',
            _previewGiven: '',
            namePattern,
            interNameDelimiter: interDelim,
            templateEntry
        };
        this.editState.pendingInserts = this.editState.pendingInserts || [];
        this.editState.pendingInserts.push(pending);
        this.formModified = true;
        this.refreshSuggestionUi();
        this.openPendingInsertEditor(id);
        this.updatePreview();
        this.updateFooterApplyState();
    }

    stageEtalInsert() {
        if (!this.editState) return;
        if (!this.editState.canAddEtal) return;
        const author = this.editState.personAnalysis && this.editState.personAnalysis.author;
        const editor = this.editState.personAnalysis && this.editState.personAnalysis.editor;
        let groupType = this.editState.etalGroupType || 'author';
        if (author && author.hasEtal && editor && !editor.hasEtal) groupType = 'editor';
        else if (author && author.hasEtal && (!editor || editor.hasEtal)) {
            if (typeof TOASTER_ALERT === 'function') {
                TOASTER_ALERT('Et al. already present', {
                    type: 'warning'
                });
            }
            return;
        } else if ((!author || author.count === 0) && editor && editor.count > 0) {
            groupType = 'editor';
        }

        const analysis = this.editState.personAnalysis[groupType];
        if (analysis && analysis.hasEtal) {
            if (typeof TOASTER_ALERT === 'function') {
                TOASTER_ALERT('Et al. already present for ' + groupType, {
                    type: 'warning'
                });
            }
            return;
        }

        const already = (this.editState.pendingInserts || []).some(
            (p) => p.kind === 'etal' && p.groupType === groupType
        );
        if (already) return;

        const id = `ins_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        this.editState.pendingInserts = this.editState.pendingInserts || [];
        this.editState.pendingInserts.push({
            id,
            kind: 'etal',
            groupType,
            text: (analysis && analysis.etalText) || 'et al.',
            delimiter: (analysis && analysis.etalDelimiter) || ' '
        });
        this.formModified = true;
        this.refreshSuggestionUi();
        this.updateApplyState();
    }

    removePendingInsert(id) {
        if (!this.editState || !this.editState.pendingInserts) return;
        this.editState.pendingInserts = this.editState.pendingInserts.filter((p) => p.id !== id);
        if (this._activeFieldKey === `pending_${id}`) this.clearActiveEditor();
        this.refreshSuggestionUi();
        this.updateApplyState();
    }

    // -------------------------------------------------------------------------
    // Values / dirty / preview
    // -------------------------------------------------------------------------

    getFieldInput(field) {
        if (!field || !field.inputId) return null;
        return document.getElementById(field.inputId);
    }

    sanitizeHtml(html) {
        if (!html) return '';
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        wrapper.querySelectorAll('script,style').forEach((node) => node.remove());
        wrapper.querySelectorAll('*').forEach((node) => {
            Array.from(node.attributes || []).forEach((attr) => {
                if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
            });
        });
        return wrapper.innerHTML;
    }

    normalizeHtml(html) {
        return this.sanitizeHtml(html || '').replace(/\s+/g, ' ').trim();
    }

    escapeHtml(txt) {
        const value = txt == null ? '' : String(txt);
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    getFieldValue(field) {
        if (!field) return '';
        const input = this.getFieldInput(field);
        if (input) {
            if (field.richText && typeof window.$ !== 'undefined' && $.fn && $.fn.summernote) {
                try {
                    if ($(input).next('.note-editor').length) {
                        if (this._summernote) this._summernote.bindTarget(input);
                        return $(input).summernote('code') || '';
                    }
                } catch (err) {
                    this.trackError('getFieldValue', err.message);
                }
            }
            if (field.allowHtml && !field.richText) return input.innerHTML != null ? String(input.innerHTML) : '';
            return input.value != null ? String(input.value) : '';
        }
        return field.stagedValue != null ? field.stagedValue : (field.original || '');
    }

    fieldHasChanged(field, currentValue) {
        if (!field || field.virtual) return false;
        if (field.allowHtml) {
            return this.normalizeHtml(currentValue) !== this.normalizeHtml(field.original || '');
        }
        return (currentValue || '') !== (field.original || '');
    }

    hasMeaningfulValue(field, value) {
        if (!field) return false;
        if (field.allowHtml) {
            const temp = document.createElement('div');
            temp.innerHTML = this.sanitizeHtml(value || '');
            return (temp.textContent || '').trim().length > 0;
        }
        return (value || '').trim().length > 0;
    }

    isDirty() {
        if (!this.editState) return false;
        const pending = this.editState.pendingInserts || [];
        if (pending.some((p) => {
                if (p.kind === 'etal') return true;
                if (p.kind === 'person') {
                    return !!(p._previewSurname || p._previewGiven);
                }
                return true;
            })) return true;
        return (this.editState.fields || []).some((field) => {
            const value = this.getPreviewCommittedValue(field);
            if (field.virtual) return this.hasMeaningfulValue(field, value);
            return this.fieldHasChanged(field, value);
        });
    }

    getPreviewFieldHtml(field, rawValue) {
        if (!rawValue) return '';
        if (field.allowHtml) return this.sanitizeHtml(rawValue);
        const escaped = this.escapeHtml(rawValue);
        if (field.token === 'source' && field.sourceItalic) {
            return `<em class="italic" data-name="italic">${escaped}</em>`;
        }
        return escaped;
    }

    getPreviewPlainTextFromHtml(html) {
        if (!html) return '';
        const temp = document.createElement('div');
        temp.innerHTML = this.sanitizeHtml(html || '');
        return temp.textContent || '';
    }

    normalizePreviewDelimiterAfterValue(renderedValue, renderedHtml, delimiter) {
        const delim = delimiter == null ? '' : String(delimiter);
        if (!delim) return delim;
        const text = renderedHtml ?
            this.getPreviewPlainTextFromHtml(renderedHtml) :
            (renderedValue == null ? '' : String(renderedValue));
        const trimmed = (text || '').replace(/\s+$/g, '');
        if (!trimmed) return delim;
        const last = trimmed.charAt(trimmed.length - 1);
        if (!/[.,:;]/.test(last)) return delim;
        return delim.charAt(0) === last ? delim.slice(1) : delim;
    }

    buildCurrentValueQueues() {
        const queues = {};
        const push = (token, value, html, field) => {
            queues[token] = queues[token] || [];
            queues[token].push({
                value,
                html,
                field
            });
        };
        (this.editState.fields || []).forEach((field) => {
            if (!field || field.virtual) return;
            const value = this.getPreviewRenderValue(field);
            if (!this.hasMeaningfulValue(field, value)) return;
            push(field.token, value, this.getPreviewFieldHtml(field, value), field);
        });
        return queues;
    }

    buildPendingNameHtml(ins) {
        const np = ins.namePattern || {
            tokens: ['surname', 'given-names'],
            delimiters: [' ']
        };
        const surname = ins._previewSurname || '';
        const given = ins._previewGiven || '';
        let html = '';
        np.tokens.forEach((tok, ti) => {
            const val = tok === 'surname' ? surname : given;
            if (!val) return;
            if (html && np.delimiters[ti - 1] != null) html += this.escapeHtml(np.delimiters[ti - 1]);
            else if (html) html += ' ';
            html += this.wrapPreviewSegment(tok, this.escapeHtml(val), {
                'data-insert-id': ins.id
            });
        });
        return html || this.wrapPreviewSegment('surname', '<em class="text-muted">new name</em>', {
            'data-insert-id': ins.id
        });
    }

    buildCurrentPersonHtmlQueues() {
        const grouped = {};
        (this.editState.fields || []).forEach((field) => {
            if (!field || field.virtual || !field.groupType || !EditReferenceTextModule.PERSON_TOKENS[field.token]) return;
            const idx = field.nameIndex || 0;
            const key = `${field.groupType}_${idx}`;
            grouped[key] = grouped[key] || {
                role: field.groupType,
                index: idx,
                parts: []
            };
            grouped[key].parts.push(field);
        });

        const queues = {};
        Object.keys(grouped).forEach((key) => {
            const group = grouped[key];
            group.parts.sort((a, b) => {
                if (!a.el || !b.el) return 0;
                return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1;
            });
            let html = '';
            group.parts.forEach((field) => {
                const value = this.getPreviewRenderValue(field);
                if (!this.hasMeaningfulValue(field, value)) return;
                if (html) html += ' ';
                html += this.wrapPreviewSegment(field.token, this.escapeHtml(value), {
                    'data-field-key': field.key
                });
            });
            if (!html) return;
            queues[group.role] = queues[group.role] || [];
            queues[group.role].push(html);
        });
        return queues;
    }

    pruneExtraTemplateNameSlot(sn) {
        if (!sn || !sn.parentNode) return;
        let prev = sn.previousSibling;
        while (prev && prev.nodeType === 3 && !/[A-Za-z0-9]/.test(prev.textContent || '')) {
            const remove = prev;
            prev = prev.previousSibling;
            remove.parentNode.removeChild(remove);
        }
        if (prev && prev.nodeType === 3 && /\b(and|&)\s*$/i.test(prev.textContent || '')) {
            prev.textContent = (prev.textContent || '').replace(/\s*(and|&)\s*$/i, '');
        }
        sn.parentNode.removeChild(sn);
    }

    renderTemplatePreviewHtml(templateEntry, pendingPerson) {
        if (!templateEntry || !templateEntry.mixed || !this.editState) return '';
        const clone = templateEntry.mixed.cloneNode(true);
        const pubType = clone.getAttribute('publication-type') || '';
        const roleInfo = this.getReferenceRoleInfo(clone, pubType);
        const valueQueues = this.buildCurrentValueQueues();
        const personQueues = this.buildCurrentPersonHtmlQueues();
        if (pendingPerson && pendingPerson.kind === 'person') {
            personQueues[pendingPerson.groupType] = personQueues[pendingPerson.groupType] || [];
            personQueues[pendingPerson.groupType].push(this.buildPendingNameHtml(pendingPerson));
        }

        Array.from(clone.querySelectorAll('.string-name')).forEach((sn) => {
            const inferredRole = roleInfo.inferredRoleByName && roleInfo.inferredRoleByName.get(sn);
            const role = inferredRole || this.getPersonGroupTypeForName(sn);
            const html = personQueues[role] && personQueues[role].length ?
                personQueues[role].shift() :
                null;
            if (!html) {
                this.pruneExtraTemplateNameSlot(sn);
                return;
            }
            sn.innerHTML = html;
        });

        Array.from(clone.querySelectorAll(EditReferenceTextModule.LEAF_SELECTOR)).forEach((el) => {
            if (!el || !el.classList) return;
            if ((el.classList.contains('surname') || el.classList.contains('given-names')) &&
                el.closest && el.closest('.string-name')) return;
            const token = this.getFieldTokenByElement(el);
            const item = token && valueQueues[token] && valueQueues[token].shift();
            if (!item) {
                while (el.firstChild) el.removeChild(el.firstChild);
                return;
            }
            el.innerHTML = item.html;
        });

        return clone.innerHTML || '';
    }

    buildTemplatePreviewHtml() {
        if (!this.editState) return '';
        const pendingPerson = (this.editState.pendingInserts || []).find((ins) => (
            ins && ins.kind === 'person' && ins.groupType
        ));
        if (!pendingPerson) return '';
        const templateEntry = pendingPerson.templateEntry || this.findExactTemplateForSuggestion(pendingPerson.groupType);
        if (!templateEntry) return '';
        pendingPerson.templateEntry = templateEntry;
        return this.renderTemplatePreviewHtml(templateEntry, pendingPerson);
    }

    buildPreviewHtml() {
        if (!this.editState) {
            return '<span class="text-muted">No preview available.</span>';
        }

        const templateHtml = this.buildTemplatePreviewHtml();
        if (templateHtml) return templateHtml;

        // Use committed preview values only (not live edit draft)
        const entries = (this.editState.fields || []).map((field, idx) => {
            const val = this.getPreviewRenderValue(field);
            const plain = field.allowHtml ? document.createElement('div') : null;
            if (plain) plain.innerHTML = this.sanitizeHtml(val);
            const textForCheck = field.allowHtml ? (plain.textContent || '') : val;
            return {
                idx,
                field,
                value: val,
                hasValue: (textForCheck || '').trim().length > 0,
                html: this.getPreviewFieldHtml(field, val)
            };
        }).filter((entry) => entry.hasValue);

        const delimiters = this.editState.delimiters || [];
        let html = '';

        entries.forEach((entry, i) => {
            const token = entry.field.token || 'field';
            html += this.wrapPreviewSegment(token, entry.html, {
                'data-field-key': entry.field.key
            });
            if (i === entries.length - 1) return;
            const from = entry.idx;
            const to = entries[i + 1].idx;
            let delim = '';
            for (let k = from; k < to; k += 1) {
                delim += delimiters[k] != null ? delimiters[k] : ' ';
            }
            if (!delim) delim = ' ';
            delim = this.normalizePreviewDelimiterAfterValue(entry.value, entry.html, delim);
            html += this.escapeHtml(delim);
        });

        (this.editState.pendingInserts || []).forEach((ins) => {
            if (ins.kind === 'person') {
                const delim = ins.interNameDelimiter || ', ';
                const np = ins.namePattern || {
                    tokens: ['surname', 'given-names'],
                    delimiters: [' ']
                };
                const surname = ins._previewSurname || '';
                const given = ins._previewGiven || '';
                let nameHtml = '';
                np.tokens.forEach((tok, ti) => {
                    const val = tok === 'surname' ? surname : given;
                    if (!val) return;
                    if (nameHtml && np.delimiters[ti - 1] != null) nameHtml += this.escapeHtml(np.delimiters[ti - 1]);
                    else if (nameHtml) nameHtml += ' ';
                    nameHtml += this.wrapPreviewSegment(tok, this.escapeHtml(val), {
                        'data-insert-id': ins.id
                    });
                });
                if (!nameHtml) {
                    nameHtml = this.wrapPreviewSegment('surname', '<em class="text-muted">new name</em>', {
                        'data-insert-id': ins.id
                    });
                }
                html += this.escapeHtml(delim) + nameHtml;
            } else if (ins.kind === 'etal') {
                html += this.escapeHtml(ins.delimiter || ' ');
                html += this.wrapPreviewSegment('etal', this.escapeHtml(ins.text || 'et al.'), {
                    'data-insert-id': ins.id
                });
            }
        });

        if (!html) return '<span class="text-muted">Type values to see preview.</span>';
        return html;
    }

    updatePreview() {
        const host = this.elements.previewHost;
        if (!host) return;
        host.innerHTML = this.buildPreviewHtml();
        this.highlightActivePreviewSegment();
    }

    updateFooterApplyState() {
        const {
            fireBtn
        } = this.elements;
        if (!fireBtn) return;
        const dirty = this.isDirty();
        fireBtn.classList.toggle('disabled', !dirty);
        fireBtn.disabled = !dirty;
    }

    updateApplyState() {
        this.updatePreview();
        this.updateFooterApplyState();
        this.updateSyncCitationsCheckboxState();
    }

    // -------------------------------------------------------------------------
    // Show / Apply
    // -------------------------------------------------------------------------

    showBefore(IsEdit, refNode) {
        try {
            const node = this.resolveRefNode(refNode);
            if (!node) {
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT('No reference selected', {
                        type: 'warning'
                    });
                }
                return false;
            }
            if (node.hasAttribute('data-remove') || node.hasAttribute('data-delete')) return false;
            const mixed = node.querySelector('.mixed-citation');
            if (!mixed) {
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT('Reference has no mixed-citation', {
                        type: 'warning'
                    });
                }
                return false;
            }
            this._pendingRef = node;
            return true;
        } catch (err) {
            this.trackError('showBefore', err.message);
            return false;
        }
    }

    showLoop(IsEdit, refNode) {
        try {
            this.editMode = !!IsEdit;
            this.formModified = false;
            this._activeFieldKey = null;

            if (!this.trackManager) {
                this.trackManager = window._trackManager || new trackManager(GlobalEditor);
            }

            this.initializeElements();
            this.setupEventListeners();

            const node = this._pendingRef || this.resolveRefNode(refNode);
            this._pendingRef = null;
            if (!node) {
                this.closeDialog();
                return;
            }

            const mixed = node.querySelector('.mixed-citation');
            if (!mixed) {
                this.closeDialog();
                return;
            }

            const pubType = mixed.getAttribute('publication-type') || '';
            const roleInfo = this.getReferenceRoleInfo(mixed, pubType);
            const templateCatalog = this.buildRefListTemplateCatalog(node);
            const fields = this.scanLeafFields(mixed, roleInfo);
            const sameTypePatterns = this.collectSameTypePatterns(pubType, node);
            // Preview/edit order = this ref's document order (not peer-dominant).
            const ordered = this.orderFieldsFromDocument(fields, mixed);
            const currentSignature = this.makeTemplateSignature(mixed, roleInfo);
            const authorLocal = this.analyzePersonGroup(mixed, 'author', roleInfo);
            const editorLocal = this.analyzePersonGroup(mixed, 'editor', roleInfo);
            const personAnalysis = {
                author: authorLocal,
                editor: editorLocal
            };
            const alignedPersonSuggestions = this.computeAlignedPersonSuggestions(
                personAnalysis, templateCatalog, node, currentSignature
            );
            const orderedWithSuggestions = this.appendPeerGapVirtuals(
                ordered, sameTypePatterns, pubType, templateCatalog, currentSignature, node
            );
            ordered.fields = orderedWithSuggestions.fields;
            ordered.delimiters = orderedWithSuggestions.delimiters;
            // Ensure delimiters cover any appended virtual fields
            while (ordered.delimiters.length < Math.max(0, ordered.fields.length - 1)) {
                ordered.delimiters.push(' ');
            }

            const personPatterns = {
                author: this.resolveDominantPersonPattern(pubType, node, 'author', authorLocal),
                editor: this.resolveDominantPersonPattern(pubType, node, 'editor', editorLocal)
            };

            const bookAuthorRole = this.classifyBookAuthorRole(mixed, pubType, editorLocal, roleInfo);
            const canAddAuthor = !!alignedPersonSuggestions.canAddAuthor;
            const canAddEditor = !!alignedPersonSuggestions.canAddEditor;

            this.editState = {
                ref: node,
                mixed,
                fields: ordered.fields,
                delimiters: ordered.delimiters,
                pubType,
                sameTypePatterns,
                roleInfo,
                templateCatalog,
                currentSignature,
                alignedSuggestions: orderedWithSuggestions.alignedSuggestions || {},
                alignedPersonSuggestions,
                canAddAuthor,
                canAddEditor,
                canAddEtal: !!alignedPersonSuggestions.canAddEtal,
                etalGroupType: alignedPersonSuggestions.etalGroupType || null,
                bookAuthorRole,
                personAnalysis,
                personPatterns,
                pendingInserts: []
            };

            debug.log('Edit state:', this.editState, 'Fields:', ordered.fields, 'Delimiters:', ordered.delimiters, 'Person patterns:', personPatterns);

            (this.editState.fields || []).forEach((field) => {
                const base = field.original || '';
                field.stagedValue = base;
                field._previewValue = base;
                // Refresh non-person labels for current pub-type (e.g. source → Journal Title)
                if (!field.groupType || !EditReferenceTextModule.PERSON_TOKENS[field.token]) {
                    const multiMatch = /(\s+\d+)$/.exec(field.label || '');
                    const suffix = multiMatch ? multiMatch[1] : '';
                    field.label = `${this.getFieldLabel(field.token, pubType)}${suffix}`;
                }
            });

            if (this.elements.pubTypeInput) {
                this.elements.pubTypeInput.value = pubType;
            }

            this.clearActiveEditor();
            this.syncSuggestionTabVisibility();
            this.activateBelowTab('citation');
            this.resetSyncCitationsCheckbox();
            this.buildPersonShapeInfo();
            this.refreshSuggestionUi();
            this.renderCitationPreview();
            this.updateApplyState();
        } catch (err) {
            console.warn(err.message);
            this.trackError('showLoop', err.message);
        }
    }

    getTrackingCode(isDel = false) {

        return {
            trackInsCode: EditReferenceTextModule.TRACK_CODE_EDIT,
            trackDelCode: EditReferenceTextModule.TRACK_CODE_LEGACY_DEL || 'ref-text-del-01'
        };
    }

    buildEditAttributes(markManual) {
        const keys = ['dt', 'drn', 'du', 'wsc_i_e'];
        const trackAttrs = (typeof commonMethods !== 'undefined' && commonMethods.Default) ?
            commonMethods.Default.getAttributes(keys) : {};

        const {
            trackInsCode,
            trackDelCode
        } = this.getTrackingCode();
        return {
            ...trackAttrs,
            'data-track-code': trackInsCode,
            ...(markManual ? {
                'data-override': 'true'
            } : {})
        };
    }

    /**
     * Surrounding italic/em wrapper on a leaf (e.g. source), or null.
     */
    getFormatWrapper(el) {
        if (!el || !this.isFullyItalicWrapped(el)) return null;
        const children = Array.from(el.children || []);
        return children.length ? children[0] : null;
    }

    /**
     * Content host for inside-leaf tracking: format wrapper if present, else the leaf.
     */
    getTrackContentHost(existEl) {
        return this.getFormatWrapper(existEl) || existEl;
    }

    applyTrackedChange(existEl, newText, prevText) {
        try {
            if (!this.trackManager) {
                this.trackManager = window._trackManager || new trackManager(GlobalEditor);
            }
            existEl = existEl.$ ? existEl.$ : (existEl[0] ? existEl[0] : existEl);
            if (!existEl || !existEl.parentNode) return;

            const host = this.getTrackContentHost(existEl);

            let oldText = prevText != null ? String(prevText) : '';
            const existingIns = this.getDirectChildByTag(host, 'insert');
            if (existingIns && !oldText) {
                oldText = existingIns.textContent || '';
            }

            while (host.firstChild) {
                host.removeChild(host.firstChild);
            }

            const insDom = this.trackManager.getInsNode();
            insDom.textContent = newText != null ? String(newText) : '';
            this.stampTrackCode(insDom);
            host.appendChild(insDom);

            if (oldText) {
                const delDom = this.trackManager.getDelNode();
                delDom.textContent = oldText;
                this.stampTrackCode(delDom);
                host.appendChild(delDom);
            }
        } catch (err) {
            this.trackError('applyTrackedChange', err.message);
        }
    }

    applyTrackedChangeHtml(existEl, newHtml, prevText) {
        try {
            if (!this.trackManager) {
                this.trackManager = window._trackManager || new trackManager(GlobalEditor);
            }
            existEl = existEl.$ ? existEl.$ : (existEl[0] ? existEl[0] : existEl);
            if (!existEl || !existEl.parentNode) return;

            const host = this.getTrackContentHost(existEl);

            let oldText = prevText != null ? String(prevText) : '';
            const existingIns = this.getDirectChildByTag(host, 'insert');
            if (existingIns && !oldText) {
                oldText = existingIns.textContent || '';
            }

            while (host.firstChild) {
                host.removeChild(host.firstChild);
            }

            const insDom = this.trackManager.getInsNode();
            insDom.innerHTML = this.sanitizeHtml(newHtml);
            this.stampTrackCode(insDom);
            host.appendChild(insDom);

            if (oldText) {
                const delDom = this.trackManager.getDelNode();
                delDom.textContent = oldText;
                this.stampTrackCode(delDom);
                host.appendChild(delDom);
            }
        } catch (err) {
            this.trackError('applyTrackedChangeHtml', err.message);
        }
    }

    getDirectChildByTag(parent, tagName) {
        if (!parent || !parent.children) return null;
        const want = (tagName || '').toLowerCase();
        return Array.from(parent.children).find((c) => (c.tagName || '').toLowerCase() === want) || null;
    }

    stampTrackCode(node) {
        if (!node || !node.setAttribute) return;
        const {
            trackInsCode,
            trackDelCode
        } = this.getTrackingCode();
        const finalCode = node.tagName.toLowerCase() === 'del' ? trackDelCode : trackInsCode;
        if (finalCode) {
            node.setAttribute('data-track-code', finalCode);
        }
    }

    /**
     * Wrap node content in <insert> inside the same outer element.
     */
    wrapContentsInInsert(outer) {
        if (!outer) return null;
        if (!this.trackManager) {
            this.trackManager = window._trackManager || new trackManager(GlobalEditor);
        }
        const ins = this.trackManager.getInsNode ?
            this.trackManager.getInsNode() :
            document.createElement('insert');
        while (outer.firstChild) {
            ins.appendChild(outer.firstChild);
        }
        this.stampTrackCode(ins);
        outer.appendChild(ins);
        return ins;
    }

    applyAttributes(node, attributes) {
        try {
            if (!node) return;
            if (this.trackManager && typeof this.trackManager.updateAttributesOnly === 'function') {
                this.trackManager.updateAttributesOnly(node, attributes, EditReferenceTextModule.PRESERVE_ATTRS);
            } else {
                Object.keys(attributes).forEach((key) => {
                    if (attributes[key] != null && attributes[key] !== '') {
                        node.setAttribute(key, attributes[key]);
                    }
                });
            }
            // Inside-leaf tracking: stamp direct child <insert> if present (legacy outer wrap unused).
            const childIns = this.getDirectChildByTag(node, 'insert');
            if (childIns && attributes['data-track-code']) {
                childIns.setAttribute('data-track-code', attributes['data-track-code']);
            }
        } catch (err) {
            this.trackError('applyAttributes', err.message);
        }
    }

    isHyperlinkField(field) {
        return !!(field && field.updateAttribute && /^(ext-link|pub-id|uri|email)$/.test(field.token || ''));
    }

    getHyperlinkBridge() {
        const win = typeof window !== 'undefined' ? window : {};
        const dialog = win.hyperLinkDialog || null;
        const cls = (typeof HyperlinkDialogModule !== 'undefined' && HyperlinkDialogModule) ||
            win.HyperlinkDialogModule ||
            (dialog && dialog.constructor) ||
            null;

        return {
            dialog,
            cls,
            getRefElemConfig(type, client) {
                if (cls && typeof cls.getRefElemConfig === 'function') {
                    return cls.getRefElemConfig(type, client);
                }
                return null;
            },
            classify(text) {
                if (dialog && typeof dialog.getLinkTypeFromText === 'function') {
                    return dialog.getLinkTypeFromText(text, 'reference', {
                        isUpdate: true
                    });
                }
                return null;
            }
        };
    }

    resolveReferenceLinkInfo(value) {
        try {
            const text = value != null ? String(value).trim() : '';
            const bridge = this.getHyperlinkBridge();
            const client = (typeof commonMethods !== 'undefined' && commonMethods.getClientCode) ?
                commonMethods.getClientCode({
                    format: 'upper'
                }) :
                'DEFAULT';
            const classified = bridge.classify(text) || {};
            let type = classified.type || null;

            if (!type) {
                const hasProtocol = /^(https?:\/\/|ftp:\/\/)/i.test(text);
                const isDoi = /^(https?:\/\/(dx\.)?doi\.org\/)?10\.\S+\/\S+/i.test(text);
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
                type = isEmail ?
                    'email' :
                    isDoi && hasProtocol ?
                    'doi-full' :
                    (isDoi ? 'doi-partial' : (hasProtocol ? 'reference-url' : 'body-url'));
            }

            const attrs = Object.assign({},
                bridge.getRefElemConfig(type, client) || {},
                classified.attributes || {}
            );

            if (!Object.keys(attrs).length) {
                if (type === 'email') {
                    attrs['data-name'] = 'email';
                    attrs.class = 'email';
                } else if (type === 'doi-partial') {
                    attrs['data-name'] = 'pub-id';
                    attrs.class = 'pub-id';
                    attrs['pub-id-type'] = 'doi';
                } else {
                    attrs['data-name'] = 'ext-link';
                    attrs.class = 'ext-link';
                    attrs['ext-link-type'] = 'uri';
                }
            }

            delete attrs['data-link'];
            delete attrs['data-track-code'];
            delete attrs.dt;
            delete attrs.dr;
            delete attrs.drn;
            delete attrs.du;
            delete attrs.wsc_i_e;
            delete attrs['data-rolename'];
            delete attrs['data-time'];
            delete attrs['data-username'];

            if (type !== 'doi-partial' && !attrs['xlink:href']) {
                attrs['xlink:href'] = text;
            }

            const token = attrs['data-name'] || attrs.class || (
                type === 'doi-partial' ? 'pub-id' : 'ext-link'
            );
            let displayValue = text;
            if (type === 'doi-partial' && token !== 'pub-id') {
                displayValue = /^https?:\/\//i.test(text) ? text : `https://doi.org/${text}`;
                if (!attrs['xlink:href']) attrs['xlink:href'] = displayValue;
            }

            attrs.class = token;
            attrs['data-name'] = token;

            return {
                type,
                token,
                attrs,
                displayValue
            };
        } catch (err) {
            this.trackError('resolveReferenceLinkInfo', err.message);
            return null;
        }
    }

    removeStaleReferenceLinkAttributes(node, nextAttributes = {}) {
        if (!node || !node.hasAttribute) return;
        ['ext-link-type', 'pub-id-type', 'xlink:href', 'href'].forEach((attr) => {
            if (Object.prototype.hasOwnProperty.call(nextAttributes, attr)) return;
            if (node.hasAttribute(attr)) node.removeAttribute(attr);
        });
    }

    applyReferenceLinkAttributes(node, linkInfo) {
        if (!node || !linkInfo || !linkInfo.attrs) return;
        const attrs = linkInfo.attrs;
        this.removeStaleReferenceLinkAttributes(node, attrs);
        Object.keys(attrs).forEach((key) => {
            if (attrs[key] != null && attrs[key] !== '') {
                node.setAttribute(key, attrs[key]);
            }
        });
    }

    createHyperlinkLeafElementForField(field, value) {
        const linkInfo = this.resolveReferenceLinkInfo(value);
        if (!linkInfo) return null;
        const el = document.createElement('span');
        this.applyReferenceLinkAttributes(el, linkInfo);

        if (!this.trackManager) {
            this.trackManager = window._trackManager || new trackManager(GlobalEditor);
        }
        const ins = (this.trackManager && typeof this.trackManager.getInsNode === 'function') ?
            this.trackManager.getInsNode() :
            document.createElement('insert');
        ins.textContent = linkInfo.displayValue || value || '';
        this.stampTrackCode(ins);
        el.appendChild(ins);

        if (field) field.token = linkInfo.token || field.token;
        if (field && linkInfo.displayValue != null) {
            field.original = linkInfo.displayValue;
            field.stagedValue = linkInfo.displayValue;
            field._previewValue = linkInfo.displayValue;
        }
        return el;
    }

    getInsertionAnchor(el) {
        // Semantic leaf is the outer wrapper; insert/del live inside it.
        return el || null;
    }

    insertAfter(newNode, refNode) {
        if (!newNode || !refNode || !refNode.parentNode) return;
        if (refNode.nextSibling) refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
        else refNode.parentNode.appendChild(newNode);
    }

    createLeafElementForField(field, value) {
        if (this.isHyperlinkField(field)) {
            const linkLeaf = this.createHyperlinkLeafElementForField(field, value);
            if (linkLeaf) return linkLeaf;
        }

        const el = document.createElement('span');
        const token = field && field.token ? field.token : 'field';
        el.className = token;
        el.setAttribute('data-name', token);
        if (!this.trackManager) {
            this.trackManager = window._trackManager || new trackManager(GlobalEditor);
        }
        const ins = (this.trackManager && typeof this.trackManager.getInsNode === 'function') ?
            this.trackManager.getInsNode() :
            document.createElement('insert');
        if (field && field.allowHtml) {
            ins.innerHTML = this.sanitizeHtml(value || '');
        } else {
            ins.textContent = value || '';
        }
        this.stampTrackCode(ins);

        // Surrounding italic wrapper (source): em outside insert, same as edit path
        if (field && field.token === 'source' && field.sourceItalic && !field.allowHtml) {
            const em = document.createElement('em');
            em.className = 'italic';
            em.setAttribute('data-name', 'italic');
            em.appendChild(ins);
            el.appendChild(em);
        } else {
            el.appendChild(ins);
        }
        return el;
    }

    /**
     * Append leaf at resolved position with prev/next delimiters only (no gap wipe).
     */
    appendLeafAtPosition(leaf, {
        prev,
        next,
        beforeDelim,
        afterDelim,
        mixed
    }) {
        if (!leaf) return;

        if (prev && prev.parentNode) {
            let ref = prev;
            if (beforeDelim) {
                const delimNode = document.createTextNode(beforeDelim);
                this.insertAfter(delimNode, ref);
                ref = delimNode;
            }
            this.insertAfter(leaf, ref);
            if (next && afterDelim && leaf.nextSibling === next) {
                this.insertAfter(document.createTextNode(afterDelim), leaf);
            }
            return;
        }

        if (next && next.parentNode) {
            const parent = next.parentNode;
            parent.insertBefore(leaf, next);
            if (afterDelim && leaf.nextSibling === next) {
                parent.insertBefore(document.createTextNode(afterDelim), next);
            }
            return;
        }

        if (mixed) {
            if (beforeDelim) mixed.appendChild(document.createTextNode(beforeDelim));
            mixed.appendChild(leaf);
        }
    }

    ensurePersonGroup(mixed, groupType) {
        let group = this.getPersonGroupEl(mixed, groupType);
        if (group) return group;
        group = document.createElement('span');
        group.className = 'person-group';
        group.setAttribute('data-name', 'person-group');
        group.setAttribute('person-group-type', groupType);
        const firstLeaf = mixed.querySelector(EditReferenceTextModule.LEAF_SELECTOR);
        if (firstLeaf && firstLeaf.parentNode === mixed) {
            mixed.insertBefore(group, firstLeaf);
        } else {
            mixed.insertBefore(group, mixed.firstChild);
        }
        return group;
    }

    createStringNameFromPattern(ins) {
        const sn = document.createElement('span');
        sn.className = 'string-name';
        sn.setAttribute('data-name', 'string-name');
        const np = ins.namePattern || {
            tokens: ['surname', 'given-names'],
            delimiters: [' ']
        };
        np.tokens.forEach((tok, i) => {
            if (i > 0) {
                const d = np.delimiters[i - 1] != null ? np.delimiters[i - 1] : ' ';
                sn.appendChild(document.createTextNode(d));
            }
            const leaf = document.createElement('span');
            leaf.className = tok;
            leaf.setAttribute('data-name', tok);
            leaf.textContent = tok === 'surname' ?
                (ins._previewSurname != null ? ins._previewSurname : (ins.surname || '')) :
                (ins._previewGiven != null ? ins._previewGiven : (ins.given || ''));
            sn.appendChild(leaf);
        });
        return sn;
    }

    resolveTemplatePersonPlacement(ins) {
        if (!ins || !ins.templateEntry || !ins.templateEntry.mixed || !this.editState || !this.editState.mixed) return null;
        const peerMixed = ins.templateEntry.mixed;
        const peerRoleInfo = ins.templateEntry.roleInfo || this.getReferenceRoleInfo(peerMixed, peerMixed.getAttribute('publication-type') || '');
        const peerNames = Array.from(peerMixed.querySelectorAll('.string-name')).filter((sn) => {
            const inferredRole = peerRoleInfo.inferredRoleByName && peerRoleInfo.inferredRoleByName.get(sn);
            const role = inferredRole || this.getPersonGroupTypeForName(sn);
            return role === ins.groupType;
        });
        if (!peerNames.length) return null;

        const firstPeerName = peerNames[0];
        const lastPeerName = peerNames[peerNames.length - 1];
        const peerLeaves = this.getOrderedLeafNodes(peerMixed).filter((el) => !(
            el.closest && el.closest('.string-name')
        ));
        const prevPeer = peerLeaves.slice().reverse().find((el) => (
            el.compareDocumentPosition(firstPeerName) & Node.DOCUMENT_POSITION_FOLLOWING
        ));
        const nextPeer = peerLeaves.find((el) => (
            lastPeerName.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
        ));
        if (!prevPeer && !nextPeer) return null;

        const prevToken = prevPeer ? this.getFieldTokenByElement(prevPeer) : null;
        const nextToken = nextPeer ? this.getFieldTokenByElement(nextPeer) : null;
        const fields = this.editState.fields || [];
        const prevField = prevToken ? fields.find((f) => f && f.el && f.token === prevToken) : null;
        const nextField = nextToken ? fields.find((f) => f && f.el && f.token === nextToken) : null;
        const beforeDelim = prevPeer ? this.getDelimiterBetween(prevPeer, firstPeerName) : '';
        const afterDelim = nextPeer ? this.getDelimiterBetween(lastPeerName, nextPeer) : '';

        return {
            prev: prevField ? this.getInsertionAnchor(prevField.el) : null,
            next: nextField ? this.getInsertionAnchor(nextField.el) : null,
            beforeDelim,
            afterDelim
        };
    }

    applyPendingPersonInsert(ins) {
        if (!this.editState || !this.editState.mixed) return false;
        const surname = ins._previewSurname != null ? ins._previewSurname : (ins.surname || '');
        const given = ins._previewGiven != null ? ins._previewGiven : (ins.given || '');
        ins.surname = surname;
        ins.given = given;
        if (!surname.trim() && !given.trim()) return false;

        const mixed = this.editState.mixed;
        const analysis = this.editState.personAnalysis[ins.groupType];
        const existingNames = analysis && analysis.names ? analysis.names.filter((n) => n.isConnected) : [];
        const sn = this.createStringNameFromPattern(ins);
        this.wrapContentsInInsert(sn);

        const templatePlacement = this.resolveTemplatePersonPlacement(ins);
        if (templatePlacement && (templatePlacement.prev || templatePlacement.next)) {
            this.appendLeafAtPosition(sn, {
                ...templatePlacement,
                mixed
            });
            return true;
        }

        const group = this.ensurePersonGroup(mixed, ins.groupType);

        if (existingNames.length) {
            const last = existingNames[existingNames.length - 1];
            const anchor = this.getInsertionAnchor(last);
            const delim = ins.interNameDelimiter || ', ';
            const delimNode = document.createTextNode(delim);
            this.insertAfter(delimNode, anchor);
            this.insertAfter(sn, delimNode);
        } else {
            group.appendChild(sn);
        }
        return true;
    }

    applyPendingEtalInsert(ins) {
        if (!this.editState || !this.editState.mixed) return false;
        const mixed = this.editState.mixed;
        const group = this.ensurePersonGroup(mixed, ins.groupType);
        const analysis = this.editState.personAnalysis[ins.groupType];
        if (analysis && analysis.hasEtal) return false;

        const etal = document.createElement('span');
        etal.className = 'etal';
        etal.setAttribute('data-name', 'etal');
        etal.textContent = ins.text || 'et al.';
        this.wrapContentsInInsert(etal);

        const names = analysis && analysis.names ? analysis.names.filter((n) => n.isConnected) : [];
        if (names.length) {
            const last = this.getInsertionAnchor(names[names.length - 1]);
            this.insertAfter(document.createTextNode(ins.delimiter || ' '), last);
            const delimNode = last.nextSibling;
            if (delimNode && delimNode.nodeType === 3) this.insertAfter(etal, delimNode);
            else this.insertAfter(etal, last);
        } else {
            group.appendChild(etal);
        }
        return true;
    }

    insertSuggestedField(field, index) {
        if (!field || !field.virtual || !this.editState || !this.editState.mixed) return false;
        const value = this.getPreviewCommittedValue(field);
        if (!this.hasMeaningfulValue(field, value)) return false;

        const fields = this.editState.fields || [];
        const delimiters = this.editState.delimiters || [];
        const mixed = this.editState.mixed;

        let prevAnchor = null;
        let nextAnchor = null;
        let prevFieldIndex = -1;
        let nextFieldIndex = fields.length;
        for (let i = index - 1; i >= 0; i -= 1) {
            if (fields[i] && fields[i].el && fields[i].el.isConnected) {
                prevAnchor = this.getInsertionAnchor(fields[i].el);
                prevFieldIndex = i;
                break;
            }
        }
        for (let i = index + 1; i < fields.length; i += 1) {
            if (fields[i] && fields[i].el && fields[i].el.isConnected) {
                nextAnchor = this.getInsertionAnchor(fields[i].el);
                nextFieldIndex = i;
                break;
            }
        }

        let beforeDelim = '';
        if (prevFieldIndex >= 0) {
            for (let i = prevFieldIndex; i < index; i += 1) {
                beforeDelim += delimiters[i] != null ? delimiters[i] : ' ';
            }
        } else {
            beforeDelim = delimiters[index - 1] != null ? delimiters[index - 1] : '';
        }

        let afterDelim = '';
        if (nextFieldIndex < fields.length) {
            for (let i = index; i < nextFieldIndex; i += 1) {
                afterDelim += delimiters[i] != null ? delimiters[i] : ' ';
            }
        } else {
            afterDelim = delimiters[index] != null ? delimiters[index] : '';
        }
        const leaf = this.createLeafElementForField(field, value);

        this.appendLeafAtPosition(leaf, {
            prev: prevAnchor,
            next: nextAnchor,
            beforeDelim,
            afterDelim,
            mixed
        });

        field.el = leaf;
        field.virtual = false;
        field.suggested = false;
        const committedValue = this.isHyperlinkField(field) ?
            this.getVisibleLeafText(leaf) :
            (field.allowHtml ? this.sanitizeHtml(value || '') : (value || ''));
        field.original = committedValue;
        field.originalText = leaf.textContent || '';
        field.stagedValue = field.original;
        field._previewValue = field.original;
        return true;
    }

    updateLeafText(field, newValue) {
        const el = field && field.el ? field.el : null;
        if (!el || !el.parentNode) return;

        if (this.isHyperlinkField(field)) {
            const linkInfo = this.resolveReferenceLinkInfo(newValue);
            if (linkInfo) {
                this.applyReferenceLinkAttributes(el, linkInfo);
                field.token = linkInfo.token || field.token;
                newValue = linkInfo.displayValue || newValue;
            }
        }

        if (field.allowHtml) {
            const cleanHtml = this.sanitizeHtml(newValue || '');
            const oldHtml = this.normalizeHtml(field.original || '');
            const newHtml = this.normalizeHtml(cleanHtml);
            if (newHtml === oldHtml) return;
            this.applyTrackedChangeHtml(el, cleanHtml, field.originalText || field.original || '');
            return;
        }

        const newText = newValue != null ? String(newValue) : '';
        const oldText = field.original || '';
        if (newText === oldText) return;
        this.applyTrackedChange(el, newText, oldText);
    }

    /**
     * Whether xref rid/href includes the given bibliography id.
     */
    xrefLinksToRid(xref, rid) {
        if (!xref || !rid) return false;
        const want = String(rid).trim();
        if (!want) return false;
        const rawRid = String(xref.getAttribute('rid') || '').trim();
        if (rawRid) {
            return rawRid.split(/\s+/).includes(want);
        }
        const href = String(xref.getAttribute('href') || xref.getAttribute('data-cke-saved-href') || '').trim();
        return href.replace(/^#/, '') === want;
    }

    /**
     * Collect bibliographic xrefs in the editor that point at this rid.
     * @returns {Array<{ el: Element, text: string }>}
     */
    collectDocumentCitationsForRid(rid) {
        const out = [];
        try {
            const want = String(rid || '').trim();
            if (!want) return out;
            if (typeof GlobalEditor === 'undefined' || !GlobalEditor.document || !GlobalEditor.document.$) {
                return out;
            }
            const root = GlobalEditor.document.$;
            Array.from(root.querySelectorAll('a.xref')).forEach((xref) => {
                if (!xref || xref.hasAttribute('data-remove')) return;
                const role = xref.getAttribute('data-role') || xref.getAttribute('ref-type') || '';
                if (role && role !== 'bibr') return;
                if (!this.xrefLinksToRid(xref, want)) return;
                const text = String(xref.textContent || '').replace(/\s+/g, ' ').trim();
                out.push({
                    el: xref,
                    text
                });
            });
        } catch (err) {
            this.trackError('collectDocumentCitationsForRid', err.message);
        }
        return out;
    }

    truncateCiteLabel(text, max = 120) {
        const clean = String(text || '').replace(/\s+/g, ' ').trim();
        if (!clean) return '(empty citation)';
        if (clean.length <= max) return clean;
        return `${clean.slice(0, max - 3)}...`;
    }

    /**
     * List document citations for the open reference (read-only).
     */
    renderCitationPreview() {
        try {
            const listHost = this.elements && this.elements.citationPreviewList;
            const emptyEl = this.elements && this.elements.citationPreviewEmpty;
            const heading = this.elements && this.elements.citationPreviewHeading;
            const tabCitation = this.elements && this.elements.tabCitation;
            if (!listHost) return;

            const rid = this.editState && this.editState.ref ?
                String(this.editState.ref.id || '').trim() :
                '';
            const cites = rid ? this.collectDocumentCitationsForRid(rid) : [];

            const label = cites.length ?
                `Citation Preview (${cites.length})` :
                'Citation Preview';
            if (heading) heading.textContent = label;
            if (tabCitation) tabCitation.textContent = label;

            listHost.innerHTML = '';
            if (!cites.length) {
                if (emptyEl) emptyEl.classList.remove('d-none');
                this.updateSyncCitationsCheckboxState();
                return;
            }
            if (emptyEl) emptyEl.classList.add('d-none');

            const ul = document.createElement('ul');
            ul.className = 'ref-citation-preview-ul';
            cites.forEach((cite, idx) => {
                const li = document.createElement('li');
                li.className = 'ref-citation-preview-item';
                li.setAttribute('data-cite-index', String(idx));
                li.title = cite.text || '';
                li.textContent = this.truncateCiteLabel(cite.text);
                ul.appendChild(li);
            });
            listHost.appendChild(ul);
            this.updateSyncCitationsCheckboxState();
        } catch (err) {
            this.trackError('renderCitationPreview', err.message);
        }
    }

    isSyncCitationsChecked() {
        const chk = this.elements && this.elements.syncCitationsChk;
        const label = this.elements && this.elements.syncCitationsLabel;
        if (!chk || !chk.checked) return false;
        if (chk.disabled) return false;
        if (label && label.classList.contains('d-none')) return false;
        return true;
    }

    resetSyncCitationsCheckbox() {
        const chk = this.elements && this.elements.syncCitationsChk;
        const label = this.elements && this.elements.syncCitationsLabel;
        if (chk) {
            chk.checked = false;
            chk.disabled = true;
        }
        if (label) label.classList.add('d-none');
    }

    /**
     * Show "Update linked citations" only when any author name and/or year
     * would sync and at least one document cite exists. Hidden otherwise.
     */
    updateSyncCitationsCheckboxState() {
        try {
            const chk = this.elements && this.elements.syncCitationsChk;
            const label = this.elements && this.elements.syncCitationsLabel;
            if (!chk) return;

            const rid = this.editState && this.editState.ref ?
                String(this.editState.ref.id || '').trim() :
                '';
            const cites = rid ? this.collectDocumentCitationsForRid(rid) : [];
            const canSync = cites.length > 0 && !!this.buildReferenceChangeDetails();

            chk.disabled = !canSync;
            if (!canSync) chk.checked = false;
            if (label) label.classList.toggle('d-none', !canSync);
        } catch (err) {
            this.trackError('updateSyncCitationsCheckboxState', err.message);
        }
    }

    /**
     * Build rid-scoped payload for citation text sync when any author surname /
     * bare string-name and/or year changed. Emits changed.surnames[] only.
     * @returns {{ rid: string, source: string, changed: object, pubType?: string, authorCount?: number }|null}
     */
    buildReferenceChangeDetails() {
        try {
            if (!this.editState || !this.editState.ref) return null;
            const ref = this.editState.ref;
            const rid = (ref.id || '').trim();
            if (!rid) return null;

            const fields = this.editState.fields || [];
            const changed = {};
            const surnames = [];

            const pushNameChange = (field) => {
                if (!field || field.virtual) return;
                const next = this.getPreviewCommittedValue(field);
                if (!this.fieldHasChanged(field, next)) return;
                const oldVal = String(field.originalText || field.original || '').replace(/\s+/g, ' ').trim();
                const nextText = field.allowHtml ? this.getPreviewPlainTextFromHtml(next) : next;
                const newVal = String(nextText || '').replace(/\s+/g, ' ').trim();
                if (!oldVal || !newVal || oldVal === newVal) return;
                surnames.push({
                    old: oldVal,
                    new: newVal,
                    nameIndex: field.nameIndex
                });
            };

            // Any author surname (Author 1, 2, …)
            fields.filter((f) => (
                f && !f.virtual &&
                f.token === 'surname' &&
                (f.groupType === 'author' || f.groupType == null)
            )).forEach(pushNameChange);

            // Bare string-name authors (e.g. untagged second author)
            fields.filter((f) => (
                f && !f.virtual &&
                f.token === 'string-name' &&
                (f.groupType === 'author' || f.groupType == null)
            )).forEach(pushNameChange);

            // Collab fallback when no surname/string-name changed
            if (!surnames.length) {
                const collabField = fields.find((f) => f && !f.virtual && f.token === 'collab');
                if (collabField) pushNameChange(collabField);
            }

            if (surnames.length) {
                changed.surnames = surnames;
            }

            const yearField = fields.find((f) => f && !f.virtual && f.token === 'year');
            if (yearField) {
                const next = this.getPreviewCommittedValue(yearField);
                if (this.fieldHasChanged(yearField, next)) {
                    const oldVal = String(yearField.originalText || yearField.original || '').replace(/\s+/g, ' ').trim();
                    const newVal = String(next || '').replace(/\s+/g, ' ').trim();
                    if (oldVal && newVal && oldVal !== newVal) {
                        changed.year = {
                            old: oldVal,
                            new: newVal
                        };
                    }
                }
            }

            if (!Object.keys(changed).length) return null;

            const authorSurnames = fields.filter((f) => (
                f && !f.virtual && f.token === 'surname' && f.groupType === 'author'
            ));
            const authorStringNames = fields.filter((f) => (
                f && !f.virtual && f.token === 'string-name' && f.groupType === 'author'
            ));
            const hadEtal = fields.some((f) => f && !f.virtual && f.token === 'etal');
            const mixed = this.editState.mixed;
            const pubType = (mixed && mixed.getAttribute('publication-type')) || '';

            return {
                rid,
                source: 'editReferenceText',
                changed,
                pubType,
                authorCount: (authorSurnames.length + authorStringNames.length) || undefined,
                hadEtal: hadEtal || undefined
            };
        } catch (err) {
            this.trackError('buildReferenceChangeDetails', err.message);
            return null;
        }
    }

    /**
     * Ensure Edit Citation Text module and run rid-scoped cite sync.
     * Uses moduleSystem (ContextHelpers), not moduleRegistry.
     */
    async notifyCitationSync(details) {
        try {
            if (!details || !details.rid || !details.changed) return;

            let mod = typeof window !== 'undefined' ? window.editCitationTextDialog : null;
            if (!mod || typeof mod.syncFromRefChange !== 'function') {
                let ms = null;
                if (typeof ContextHelpers !== 'undefined' && typeof ContextHelpers.waitForModuleSystem === 'function') {
                    ms = await ContextHelpers.waitForModuleSystem();
                } else if (typeof moduleSystem !== 'undefined') {
                    ms = moduleSystem;
                }

                if (ms && typeof ms.getModule === 'function') {
                    mod = await ms.getModule('editCitationTextDialog', {
                        autoRegister: {
                            name: 'EditCitationTextModule',
                            type: 'lazy',
                            path: './edit_citation_text/index.js',
                            templatePath: './edit_citation_text/template.html',
                            dependencies: [],
                            wrapping: true,
                            group_name: 'citeGroup'
                        }
                    });
                    if (mod && typeof window !== 'undefined') {
                        window.editCitationTextDialog = mod;
                    }
                }
            }

            if (mod && typeof mod.syncFromRefChange === 'function') {
                mod.syncFromRefChange(details);
            }
        } catch (err) {
            this.trackError('notifyCitationSync', err.message);
        }
    }

    async handleFire(e) {
        if (e && e.preventDefault) e.preventDefault();
        try {
            if (this.state === 0) return;
            if (!this.editState || !this.editState.ref) return;

            if (this._activeFieldKey) {
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT('Finish or revert the field in Edit Field before applying', {
                        type: 'warning'
                    });
                }
                return;
            }

            const {
                fireBtn
            } = this.elements;
            if (fireBtn && fireBtn.classList.contains('disabled')) return;

            const ref = this.editState.ref;
            const mixed = this.editState.mixed;
            if (!ref || !ref.parentNode || !mixed) {
                if (typeof TOASTER_ALERT === 'function') {
                    TOASTER_ALERT('Reference no longer available', {
                        type: 'error'
                    });
                }
                this.handleCancel();
                return;
            }

            const citationSyncDetails = this.buildReferenceChangeDetails();
            let anyChanged = false;

            this.editState.fields.forEach((field, idx) => {
                if (field.virtual) {
                    if (this.insertSuggestedField(field, idx)) anyChanged = true;
                    return;
                }
                const value = this.getPreviewCommittedValue(field);
                if (!this.fieldHasChanged(field, value)) return;
                if (!field.el || !field.el.parentNode) return;
                this.updateLeafText(field, value);
                anyChanged = true;
            });

            (this.editState.pendingInserts || []).forEach((ins) => {
                if (ins.kind === 'person') {
                    if (this.applyPendingPersonInsert(ins)) anyChanged = true;
                } else if (ins.kind === 'etal') {
                    if (this.applyPendingEtalInsert(ins)) anyChanged = true;
                }
            });

            if (!anyChanged) {
                this.handleCancel();
                return;
            }


            const attributes = this.buildEditAttributes(true);
            // this.applyAttributes(ref, attributes);
            this.applyAttributes(mixed, {
                // 'data-track-code': attributes['data-track-code'],
                'data-override': 'true'
            });

            if (citationSyncDetails && this.isSyncCitationsChecked()) {
                await this.notifyCitationSync(citationSyncDetails);
            }

            this.renderCitationPreview();

            if (typeof IMPACT_SELECTION !== 'undefined' && IMPACT_SELECTION._SNAPSHOT) {
                IMPACT_SELECTION._SNAPSHOT({
                    save: true,
                    unlock: true
                });
            }

            this.handleCancel();
        } catch (err) {
            console.warn(err.message);
            this.trackError('handleFire', err.message);
        }
    }

    handleCancel() {
        try {
            this.destroySummernotes();
            this.editState = null;
            this.formModified = false;
            this._activeFieldKey = null;
            this._eventsBound = false;
            this._boundPanel = null;
            this.closeDialog();
        } catch (err) {
            this.trackError('handleCancel', err.message);
        }
    }

    resetDialog() {
        try {
            this.destroySummernotes();
            this.editState = null;
            this.formModified = false;
            this._activeFieldKey = null;
            this._eventsBound = false;
            this._boundPanel = null;
            if (this.elements.pubTypeInput) this.elements.pubTypeInput.value = '';
            if (this.elements.suggestionChips) this.elements.suggestionChips.innerHTML = '';
            if (this.elements.stagedInserts) this.elements.stagedInserts.innerHTML = '';
            if (this.elements.personShapeInfo) this.elements.personShapeInfo.innerHTML = '';
            if (this.elements.previewHost) this.elements.previewHost.innerHTML = '';
            if (this.elements.citationPreviewList) this.elements.citationPreviewList.innerHTML = '';
            if (this.elements.citationPreviewEmpty) this.elements.citationPreviewEmpty.classList.remove('d-none');
            if (this.elements.citationPreviewHeading) {
                this.elements.citationPreviewHeading.textContent = 'Citation Preview';
            }
            if (this.elements.tabCitation) {
                this.elements.tabCitation.textContent = 'Citation Preview';
            }
            this.activateBelowTab('citation');
            this.resetSyncCitationsCheckbox();
            this.clearActiveEditor();
            if (this.elements.fireBtn) {
                this.elements.fireBtn.classList.add('disabled');
                this.elements.fireBtn.disabled = true;
            }
        } catch (err) {
            this.trackError('resetDialog', err.message);
        }
    }

    static create(errorTracker, options = {}) {
        return new EditReferenceTextModule('EditReferenceTextModule', errorTracker, options);
    }
}

EditReferenceTextModule.TRACK_CODE_EDIT = 'ref-text-01';
EditReferenceTextModule.TRACK_CODE_LEGACY_DEL = 'ref-text-del-01';
EditReferenceTextModule.PRESERVE_ATTRS = [
    'class', 'data-name', 'data-role', 'id', 'publication-type',
    'person-group-type', 'pub-id-type', 'ext-link-type', 'xlink:href',
    'xmlns:xlink', 'data-ins-type', 'data-enter-af-fi'
];

EditReferenceTextModule.SIMPLE_FIELDS = [{
        key: 'collab',
        selector: '.collab',
        label: 'Collab',
        multi: true,
        allowHtml: true
    },
    {
        key: 'etal',
        selector: '.etal',
        label: 'Et al.',
        multi: true
    },
    {
        key: 'article-title',
        selector: '.article-title',
        label: 'Article title',
        multi: false,
        textarea: true,
        richText: true
    },
    {
        key: 'chapter-title',
        selector: '.chapter-title',
        label: 'Chapter title',
        multi: false,
        textarea: true,
        richText: true
    },
    {
        key: 'source',
        selector: '.source',
        label: 'Source',
        multi: false,
        textarea: true,
        richText: true
    },
    {
        key: 'year',
        selector: '.year',
        label: 'Year',
        multi: false
    },
    {
        key: 'volume',
        selector: '.volume',
        label: 'Volume',
        multi: false
    },
    {
        key: 'issue',
        selector: '.issue',
        label: 'Issue',
        multi: false
    },
    {
        key: 'fpage',
        selector: '.fpage',
        label: 'First page',
        multi: false
    },
    {
        key: 'lpage',
        selector: '.lpage',
        label: 'Last page',
        multi: false
    },
    {
        key: 'supplement',
        selector: '.supplement',
        label: 'Supplement',
        multi: false
    },
    {
        key: 'publisher-loc',
        selector: '.publisher-loc',
        label: 'Publisher location',
        multi: false,
        allowHtml: true
    },
    {
        key: 'publisher-name',
        selector: '.publisher-name',
        label: 'Publisher name',
        multi: false,
        allowHtml: true
    },
    {
        key: 'edition',
        selector: '.edition',
        label: 'Edition',
        multi: false
    },
    {
        key: 'comment',
        selector: '.comment',
        label: 'Comment',
        multi: true,
        textarea: true,
        allowHtml: true
    },
    {
        key: 'ext-link',
        selector: '.ext-link',
        label: 'Ext link text',
        multi: true,
        textarea: true,
        richText: false,
        updateAttribute: true
    },
    {
        key: 'pub-id',
        selector: '.pub-id',
        label: 'Pub ID text',
        multi: true,
        textarea: true,
        richText: false,
        updateAttribute: true
    },
    {
        key: 'uri',
        selector: '.uri',
        label: 'URI text',
        multi: true,
        textarea: true,
        richText: false,
        updateAttribute: true
    }
];

/** Textarea tokens that use 5 rows in Edit Field */
EditReferenceTextModule.TALL_TEXTAREA_TOKENS = {
    'source': true,
    'article-title': true,
    'chapter-title': true,
    'ext-link': true,
    'pub-id': true,
    'uri': true
};

EditReferenceTextModule.LEAF_SELECTOR = '.surname, .given-names, .collab, .etal, .article-title, .chapter-title, .source, .year, .volume, .issue, .fpage, .lpage, .supplement, .publisher-loc, .publisher-name, .edition, .comment, .ext-link, .pub-id, .uri';

EditReferenceTextModule.TOKEN_LABELS = {
    surname: 'Surname',
    'given-names': 'Given names',
    'string-name': 'Author name',
    collab: 'Collab',
    etal: 'Et al.',
    'article-title': 'Article title',
    'chapter-title': 'Chapter title',
    source: 'Source',
    year: 'Year',
    volume: 'Volume',
    issue: 'Issue',
    fpage: 'First page',
    lpage: 'Last page',
    supplement: 'Supplement',
    'publisher-loc': 'Publisher location',
    'publisher-name': 'Publisher name',
    edition: 'Edition',
    comment: 'Comment',
    'ext-link': 'Ext link text',
    'pub-id': 'Pub ID text',
    uri: 'URI text'
};

/** Pub-type overrides for Edit Field / chip labels */
EditReferenceTextModule.LABEL_BY_PUBTYPE = {
    journal: {
        source: 'Journal Title'
    },
    book: {
        source: 'Book Title'
    }
};

/** Optional help under makeInput — only rendered when set */
EditReferenceTextModule.HELP_BY_PUBTYPE = {};
EditReferenceTextModule.HELP_BY_TOKEN = {};

EditReferenceTextModule.SELECTORS = {
    pubTypeInput: '#ref_pubtype_ro',
    activeEditor: '#ref_active_editor',
    editIdleHint: '#ref_edit_idle_hint',
    editCollapse: '#ref_edit_collapse',
    fieldApplyBtn: '#ref_field_apply',
    fieldRevertBtn: '#ref_field_revert',
    suggestionChips: '#ref_suggestion_chips',
    personShapeInfo: '#ref_person_shape_info',
    stagedInserts: '#ref_staged_inserts',
    addAuthorBtn: '#ref_add_author',
    addEditorBtn: '#ref_add_editor',
    addEtalBtn: '#ref_add_etal',
    previewHost: '#ref_preview_host',
    citationPreviewList: '#ref_citation_preview_list',
    citationPreviewEmpty: '#ref_citation_preview_empty',
    citationPreviewHeading: '#ref_citation_preview_heading',
    syncCitationsChk: '#ref_sync_citations',
    syncCitationsLabel: '#ref_sync_citations_label',
    tabCitation: '#ref_tab_citation',
    tabSuggestion: '#ref_tab_suggestion',
    paneCitation: '#ref_pane_citation',
    paneSuggestion: '#ref_pane_suggestion',
    belowTabs: '#ref_below_tabs_section',
    fireBtn: '#fire_ref_text',
    cancelBtn: '#cancel_ref_text'
};

EditReferenceTextModule.PERSON_TOKENS = {
    surname: true,
    'given-names': true,
    'string-name': true
};

EditReferenceTextModule.BOOK_PUB_TYPES = {
    book: true,
    book_content: true,
    book_contributed: true,
    'book-chapter': true
};

EditReferenceTextModule.EDITOR_ROLE_MARKERS = [
    '(Editor)',
    '(Editors)',
    '(Ed.)',
    '(Eds.)',
    '(Ed)',
    '(Eds)'
];


export default EditReferenceTextModule;

/* END */