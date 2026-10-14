import {
    findReferenceLinkLeaf,
    resolveReferenceLinkField
} from '../reference/link_adapter.js';

class RefBridgeCrossRef {
    static CROSSREF_VALID_KEYS = [
        'DOI', 'author', 'issue', 'page', 'title', 'subtitle', 'type', 'volume', 'issn',
        'container-title', 'group-title', 'short-container-title', 'publisher'
    ];

    static CROSSREF_ASSIGN_KEY = {
        'container-title': {
            'journal-article': 'journal',
            book: 'journal'
        },
        'short-container-title': {
            'journal-article': 'journal_short'
        },
        'group-title': {
            'posted-content': 'journal'
        }
    };

    static DEFAULT_POST_PARAMS_DOI = {
        format: 'json',
        endpoint: 'search/doi',
        method: 'fetchdoi'
    };

    static FLAT_DOI_KEY_HANDLE = 'author,container-title,page,volume,issue,title,ISSN,publisher,type,DOI,statusCode';

    static FLAT_DOI_ASSIGN_KEY = {
        'container-title': 'journal',
        DOI: 'doi',
        statusCode: 'status',
        ISSN: 'issn'
    };

    static logCrossRefError(globalObject, functionName, err) {
        if (typeof globalObject.ErrorLogTrace === 'function') {
            globalObject.ErrorLogTrace(`RefBridgeCrossRef.${functionName}`, err.message);
        }
    }

    static createCrossRefConfigState() {
        return {
            initiated: false,
            config: {
                PID: null,
                POST_PARAMS_DOI: {
                    ...RefBridgeCrossRef.DEFAULT_POST_PARAMS_DOI
                }
            }
        };
    }

    static loadCrossRefConfig(globalObject, state = RefBridgeCrossRef.createCrossRefConfigState()) {
        if (state.initiated) return state;

        const getConfigItem = globalObject.GET_CONFIG_ITEM;
        if (typeof getConfigItem !== 'function') {
            return state;
        }

        try {
            const configObj = getConfigItem('cross_ref_api', {
                CONVERT_JSON: true,
                children: false,
                attr: true,
                hex2string: true,
                keyUpperCase: true
            });
            Object.assign(state.config, configObj || {});
            state.initiated = true;
        } catch (err) {
            RefBridgeCrossRef.logCrossRefError(globalObject, 'loadCrossRefConfig', err);
        }

        return state;
    }

    static getCrossRefPostParams(state = RefBridgeCrossRef.createCrossRefConfigState()) {
        return state.config.POST_PARAMS_DOI || {
            ...RefBridgeCrossRef.DEFAULT_POST_PARAMS_DOI
        };
    }

    static resolveCrossRefEndpoint(globalObject, apiPath = '') {
        if (!apiPath) return apiPath;

        const isLocalHost = globalObject.IS_LOCAL_HOST;
        if (!isLocalHost) return apiPath;

        const backendDomain = globalObject.BACKEND_DOMAIN;
        if (!backendDomain) return apiPath;

        const segments = String(apiPath).split('/');
        const lastItem = segments[segments.length - 1];
        const origin = /^https?:\/\//i.test(backendDomain) ? backendDomain : `https://${backendDomain}`;
        return `${origin}/impactapinew/${lastItem}`;
    }

    static getFirstCrossRefItem(response) {
        if (response && response.message && response.message.items && response.message.items.length) {
            return response.message.items[0];
        }
        if (Array.isArray(response) && response.length) return response[0];
        if (response && typeof response === 'object' &&
            (response.DOI || response.doi || response.title || response.author ||
                (response.created && typeof response.created === 'object'))) {
            return response;
        }
        return null;
    }

    static isBlankDoiValue(value) {
        return value == null || String(value).trim().toLowerCase() === 'null' || String(value).trim() === '';
    }

    static readDoiField(source = {}, key) {
        const aliasKeys = {
            DOI: ['DOI', 'doi'],
            doi: ['doi', 'DOI'],
            issn: ['issn', 'ISSN'],
            ISSN: ['ISSN', 'issn']
        };
        const keys = aliasKeys[key] || [key];
        for (const candidate of keys) {
            if (!RefBridgeCrossRef.isBlankDoiValue(source[candidate])) return source[candidate];
        }
        if (source.created && typeof source.created === 'object') {
            for (const candidate of keys) {
                if (!RefBridgeCrossRef.isBlankDoiValue(source.created[candidate])) {
                    return source.created[candidate];
                }
            }
        }
        return undefined;
    }

    static normalizeDoiFieldValue(key, value) {
        if (Array.isArray(value) && key !== 'author') {
            value = value.length > 0 ? value[0] : '';
        }
        return RefBridgeCrossRef.isBlankDoiValue(value) ? '' : value;
    }

    static extractCrossRefYear(publishedData) {
        const clean = (val) => {
            const str = String(val).trim();
            return str.includes('-') ? str.split('-')[0] : str;
        };

        if (Array.isArray(publishedData)) {
            if (publishedData.length > 0) {
                const first = publishedData[0];
                if (Array.isArray(first)) return RefBridgeCrossRef.extractCrossRefYear(first);
                if (typeof first === 'string' || typeof first === 'number') {
                    return clean(String(first));
                }
            }
            return 'XXXX';
        }

        if (publishedData && publishedData['date-parts'] &&
            Array.isArray(publishedData['date-parts']) && publishedData['date-parts'].length > 0) {
            let year = publishedData['date-parts'][0];
            while (Array.isArray(year) && year.length > 0) {
                year = year[0];
            }
            if (year != null && year !== '') return String(year);
        }

        if (publishedData != null && publishedData !== '') {
            return clean(String(publishedData));
        }

        return 'XXXX';
    }

    static findFlatDoiYear(jsonObj = {}) {
        const yearKeys = ['created', 'published-print', 'published-online'];
        for (const key of yearKeys) {
            const parts = jsonObj[key] && jsonObj[key]['date-parts'];
            const year = parts && parts[0];
            if (year != null && year !== '') {
                return RefBridgeCrossRef.extractCrossRefYear(Array.isArray(year) ? year : [year]);
            }
        }
        return null;
    }

    static filterCrossRefData(response) {
        try {
            const first = RefBridgeCrossRef.getFirstCrossRefItem(response);
            if (!first) return {};

            const type = RefBridgeCrossRef.normalizeDoiFieldValue('type', RefBridgeCrossRef.readDoiField(first, 'type'));
            const filtered = {};

            for (let i = 0; i < RefBridgeCrossRef.CROSSREF_VALID_KEYS.length; i++) {
                const key = RefBridgeCrossRef.CROSSREF_VALID_KEYS[i];
                let tempKey = key;

                if (RefBridgeCrossRef.CROSSREF_ASSIGN_KEY[key] && RefBridgeCrossRef.CROSSREF_ASSIGN_KEY[key][type]) {
                    tempKey = RefBridgeCrossRef.CROSSREF_ASSIGN_KEY[key][type];
                }

                filtered[tempKey] = RefBridgeCrossRef.normalizeDoiFieldValue(key, RefBridgeCrossRef.readDoiField(first, key));
            }

            if (filtered.subtitle) {
                filtered.title = filtered.title ? `${filtered.title}: ${filtered.subtitle}` : filtered.subtitle;
            }

            const yearInput = first.published || first.date || first.created || first['published-print'] || first['published-online'];
            filtered.year = RefBridgeCrossRef.extractCrossRefYear(yearInput);

            if (filtered.type && typeof filtered.type === 'string') {
                filtered.type = filtered.type.replace(/-/g, '_');
            }

            return filtered;
        } catch (err) {
            return {};
        }
    }

    static mapFilterFetchToBridgeShape(filtered = {}) {
        return {
            type: filtered.type || '',
            doi: filtered.DOI || filtered.doi || '',
            author: filtered.author || [],
            issue: filtered.issue || '',
            page: filtered.page || '',
            title: filtered.title || '',
            volume: filtered.volume || '',
            issn: filtered.issn || filtered.ISSN || '',
            journal: filtered.journal || filtered['container-title'] || filtered['short-container-title'] || filtered['group-title'] || '',
            publisher: filtered.publisher || '',
            status: filtered.statusCode || filtered.status || '',
            year: filtered.year != null ? String(filtered.year) : ''
        };
    }

    static parseFlatDoiApiResponse(jsonObj = {}) {
        if (!jsonObj || typeof jsonObj !== 'object') return null;

        const fetchData = {};
        let hasData = false;

        RefBridgeCrossRef.FLAT_DOI_KEY_HANDLE.split(',').forEach((key) => {
            const assignKey = RefBridgeCrossRef.FLAT_DOI_ASSIGN_KEY[key] || key;
            const value = RefBridgeCrossRef.normalizeDoiFieldValue(key,
                RefBridgeCrossRef.readDoiField(jsonObj, key));
            if (value !== '') {
                fetchData[assignKey] = value;
                hasData = true;
            }
        });

        if (!hasData && !RefBridgeCrossRef.getFirstCrossRefItem(jsonObj)) return null;

        const year = RefBridgeCrossRef.findFlatDoiYear(jsonObj);
        if (year != null) fetchData.year = year;

        return hasData ? fetchData : null;
    }

    static normalizeCrossRefResponse(response) {
        const filtered = RefBridgeCrossRef.filterCrossRefData(response);
        if (filtered && Object.keys(filtered).length) {
            return RefBridgeCrossRef.mapFilterFetchToBridgeShape(filtered);
        }

        const flat = RefBridgeCrossRef.parseFlatDoiApiResponse(response);
        if (flat && Object.keys(flat).length) {
            return RefBridgeCrossRef.mapFilterFetchToBridgeShape({
                ...flat,
                DOI: flat.doi,
                statusCode: flat.status,
                ISSN: flat.issn
            });
        }

        const first = RefBridgeCrossRef.getFirstCrossRefItem(response);
        if (!first) return {};

        const pick = (key) => {
            const value = first[key];
            return Array.isArray(value) && key !== 'author' ? (value[0] || '') : value;
        };
        const type = String(pick('type') || '').replace(/-/g, '_');

        return {
            type,
            doi: pick('DOI') || pick('doi') || '',
            author: pick('author') || [],
            issue: pick('issue') || '',
            page: pick('page') || '',
            title: pick('title') || '',
            volume: pick('volume') || '',
            issn: pick('ISSN') || pick('issn') || '',
            journal: pick('container-title') || pick('short-container-title') || pick('group-title') || pick('journal') || '',
            publisher: pick('publisher') || '',
            status: pick('statusCode') || pick('status') || '',
            year: RefBridgeCrossRef.extractCrossRefYear(first.published || first.date || first.created ||
                first['published-print'] || first['published-online'])
        };
    }

    static recordCrossRefResponse(globalObject, response, options = {}) {
        const commonfn = globalObject.commonfn;
        const getJson = globalObject.GET_JSON;
        const apiUpdateInsert = globalObject.API_UPDATE_INSERT;

        if (!commonfn || typeof commonfn.callajax !== 'function' ||
            typeof getJson !== 'function' || !apiUpdateInsert) {
            return false;
        }

        try {
            const defaultKeys = getJson('default');
            const jsonData = Object.assign({
                tbl: 'UserPreference',
                response: response.restext,
                parse_res: options.parse_res || '',
                query: response.query,
                status: response.r,
                recordtype: options.type || 'fetch_plainText'
            }, typeof defaultKeys === 'object' && defaultKeys !== null ? defaultKeys : {});

            commonfn.callajax(jsonData, 'senddoidb', apiUpdateInsert);
            return true;
        } catch (err) {
            RefBridgeCrossRef.logCrossRefError(globalObject, 'recordCrossRefResponse', err);
            return false;
        }
    }
}

class RefBridge {
    constructor(options = {}) {
        this.globalObject = options.globalObject || (typeof window !== 'undefined' ? window : globalThis);
        this._crossRefConfig = RefBridgeCrossRef.createCrossRefConfigState();
        this.defaultFieldOrder = [
            'surname', 'given-names', 'collab', 'etal', 'article-title', 'chapter-title',
            'source', 'year', 'volume', 'issue', 'fpage', 'lpage', 'publisher-name',
            'publisher-loc', 'edition', 'supplement', 'ext-link', 'pub-id', 'uri', 'object-id', 'comment'
        ];
        this.missingTextMap = {
            'surname|author surname': 'surname',
            'given name|given-name|given names': 'given-names',
            'editor(s) name|editors name|editor name|contributor': 'editor',
            'author name or institution name|collab|institution name': 'collab',
            'article title': 'article-title',
            'chapter title': 'chapter-title',
            'journal title|source|book title': 'source',
            'year of publication|publication year|year': 'year',
            'volume|vol': 'volume',
            'issue number|issue': 'issue',
            'first page|page start|fpage|start page|page range|page number|opening page': 'fpage',
            'page range|page number': 'lpage',
            'last page|page end|lpage|end page number|closing page number|end page|closing page': 'lpage',
            'publisher name|publisher': 'publisher-name',
            'publisher location|publisher loc|location': 'publisher-loc',
            'edition': 'edition',
            'supplement|supplemental': 'supplement',
            'doi number|doi|url|uri': 'ext-link',
            'accessed date|access date|comment|comments': 'comment'
        };

        this.authorPersonGroupTokens = new Set(['surname', 'given-names', 'string-name']);
        this.authorFieldTokens = new Set([
            ...this.authorPersonGroupTokens,
            'collab',
            'etal'
        ]);
        this.editorFieldTokens = new Set(['editor-surname', 'editor-given-names', 'editor-suffix']);
        this.translatorFieldTokens = new Set([
            'translator-surname', 'translator-given-names', 'translator-suffix'
        ]);
        this.richTitleFieldTokens = new Set([
            'article-title',
            'chapter-title',
            'source',
            'collab',
            'publisher-name',
            'publisher-loc',
            'surname',
            'given-names',
            'editor-surname',
            'editor-given-names'
        ]);
        this._abbreviationLookup = null;

        this.payloadKeyMap = {};
        this.journalAbbBank = {};
        this.track = null;
        this._importPromise = this._importDependencies();
        this.FONT_SELECTOR = 'span.font, span[data-name="font"]';
        this.ALLOWED_ATTRS = ['class', 'data-name', 'font', 'data-fontvalue', 'gid', 'pi-value'];
    }
    async _importDependencies() {
        if (typeof debug !== 'undefined' && debug && typeof debug.log === 'function') {
            debug.log('index:_importDependencies');
        }
        try {
            const {
                referenceTokenPayloadMap
            } = await import('../reference/common.js');

            this.payloadKeyMap = Object.fromEntries(
                Object.entries(referenceTokenPayloadMap)
                .filter(([, key]) => key)
                .map(([token, key]) => [key, token])
            );
            const {
                default: ReferenceTrack
            } = await import('../reference/track.js');
            const track = ReferenceTrack.create();
            this.assignTrackHelpers(track);
        } catch (err) {
            if (typeof this.globalObject.ErrorLogTrace === 'function') {
                this.globalObject.ErrorLogTrace('RefBridge._importDependencies', err.message);
            }
        }
    }

    assignTrackHelpers(track = {}) {
        this.track = track;
        const live = typeof window !== 'undefined' ? window.refBridge : null;
        if (live && live !== this) live.track = track;
    }

    async _ensureReady() {
        if (typeof debug !== 'undefined' && debug && typeof debug.log === 'function') {
            debug.log('index:_ensureReady');
        }
        try {
            await this._importPromise;
        } catch (err) {
            if (typeof this.globalObject.ErrorLogTrace === 'function') {
                this.globalObject.ErrorLogTrace('RefBridge._ensureReady', err.message);
            }
        }
    }

    runApplyUpdate(mode, {
        mixed,
        source,
        fields = [],
        values = {},
        originalValues = {},
        originalInlineFormats = {},
        refType = 'journal',
        authors = [],
        hadAuthorEtal = false
    } = {}) {
        if (!this.track || typeof this.track.applyUpdate !== 'function') {
            if (typeof this.globalObject.ErrorLogTrace === 'function') {
                this.globalObject.ErrorLogTrace('RefBridge.applyUpdate', 'track missing');
            }
            return {
                changed: false,
                missing: true
            };
        }
        const mappedValues = {
            ...(values || {})
        };
        if (mappedValues.lpage != null) {
            mappedValues.lpage = this.expandOrTrimPageRange(mappedValues.fpage, mappedValues.lpage, refType);
        }
        const mappedOriginalValues = {
            ...(originalValues || {})
        };
        const mappedFields = (fields || []).map((field) => {
            const mapped = {
                ...field,
                rich: !!(field && (field.rich || this.isSummernoteRichLeafToken(field.token)))
            };
            if (!field || field.formatMode !== 'plain-inline-font') return mapped;
            const next = mappedValues[field.token] != null ? mappedValues[field.token] : field.value;
            const html = this.projectFieldInlineHtml(field, next);
            if (html == null) return mapped;
            mappedValues[field.token] = html;
            const preferredInlineFormat = originalInlineFormats[field.token] || field.inlineFormat;
            if (preferredInlineFormat && preferredInlineFormat.originalHtml &&
                mappedOriginalValues[field.token] == null) {
                mappedOriginalValues[field.token] = preferredInlineFormat.originalHtml;
            }
            return {
                ...mapped,
                rich: true,
                original: (preferredInlineFormat && preferredInlineFormat.originalHtml) || field.original,
                value: html
            };
        });
        const result = this.track.applyUpdate({
            mode,
            mixed,
            source,
            fields: mappedFields,
            values: mappedValues,
            originalValues: mappedOriginalValues,
            refType,
            authors,
            trim: this.getContributorTrim(refType, 'author'),
            forceEtal: !!this.normalizeSpace(values.etal),
            hadAuthorEtal: !!hadAuthorEtal
        });

        const documentTemplateForTracking = this.getDocumentTemplate(source, refType);
        const originalDelimiters = documentTemplateForTracking.delimiters || {};
        const originalWrapText = documentTemplateForTracking.wrapText || {};
        // Explicit here (not left to applyDelimiterTracking's/applyPunctuationWrapTracking's own
        // defaults) since this is the one place that already knows `mode` — edit and query both
        // track for now; a future mode that needs to differ can branch on `mode` right here
        // without touching track.js or {mode}.js.
        const boundaryTrackingOptions = {
            oldValueTrackingDel: true,
            newValuesTrackingInsert: true
        };
        // Wrap tracking must run before delimiter tracking: isolateWrapNode splits a leaf's own
        // immediate-sibling Text node to carve out just the wrap-length slice, leaving the rest
        // (real delimiter content, often sharing that same merged node -- true for any document
        // built from HTML string parsing) untouched. If applyDelimiterTracking ran first it would
        // replace that whole shared span with <del>/<insert> elements, leaving no Text node left
        // for wrap tracking to split.
        const wrapChanged = this.applyPunctuationWrapTracking(mixed, originalWrapText, refType, boundaryTrackingOptions);
        const delimitersChanged = this.applyDelimiterTracking(mixed, originalDelimiters, boundaryTrackingOptions);
        // Runs last: relocation reads the mixed-citation's final adjacent-sibling structure, which
        // wrap/delimiter tracking may have just altered (replacing shared Text nodes with
        // <del>/<insert> elements).
        const orphansRelocated = this.relocateOrphanFieldsToEnd(mixed, refType);

        return {
            ...result,
            changed: !!result.changed || delimitersChanged || wrapChanged || orphansRelocated
        };
    }

    // Author/editor name changes are not covered by runApplyUpdate's generic field loop (it
    // explicitly skips surname/given-names/string-name) or by the trim/etal tracking below it --
    // this is the only place a contributor row's current name is compared against its original
    // document name. Matches by originIndex (set by parseContributorsFromGroup at document-parse
    // time and threaded through the UI's data-origin-index round-trip), never by name or position,
    // so pure reordering (not offered in edit/query mode) can never be mistaken for an edit.
    //
    // Split into two calls around runApplyUpdate on purpose: this method only touches rows that
    // are still present in the rebuilt group (matched/added), so it must run BEFORE trim's del
    // pass so trim's del-wrap on a newly-added-but-trimmed author wins over this method's insert
    // wrap, not the other way around. appendRemovedContributorRows appends brand-new del-only
    // rows for contributors dropped entirely -- it must run AFTER trim, since trim's own slicing
    // math counts existing .string-name nodes and an appended row would throw that count off.
    applyContributorTracking(rebuiltMixed, sourceRef, {
        authors = [],
        editors = [],
        mode = 'edit'
    } = {}) {
        if (!this.track || typeof this.track.compareField !== 'function') return;
        if (!rebuiltMixed || !rebuiltMixed.ownerDocument) return;
        this.forEachContributorRole(rebuiltMixed, sourceRef, {
            authors,
            editors
        }, ({
            groupEl,
            currentList,
            originalByIndex,
            rows
        }) => {
            currentList.forEach((person, rowIndex) => {
                const row = rows[rowIndex];
                if (!row) return;
                const originIndex = person.originIndex;
                if (originIndex == null) {
                    [
                        ['surname', person.surname],
                        ['given-names', person.givenname]
                    ].forEach(([token, text]) => {
                        if (!this.normalizeSpace(text)) return;
                        const leaf = row.querySelector(`.${token}`);
                        if (!leaf) return;
                        this.track.writeLeafAction(leaf, {
                            action: 'insert',
                            text,
                            rich: false
                        });
                    });
                    return;
                }
                const original = originalByIndex.get(originIndex);
                if (!original) return;
                [
                    ['surname', person.surname, original.surnameEl, original.surname],
                    ['given-names', person.givenname, original.givenEl, original.givenname]
                ].forEach(([token, currentText, originalLeaf, originalText]) => {
                    const leaf = row.querySelector(`.${token}`);
                    if (!leaf) return;
                    const resolved = originalLeaf ?
                        this.resolveTrackedLeafOriginal(originalLeaf, token) : null;
                    const resolvedOriginal = resolved != null ? resolved : originalText;
                    const compared = this.track.compareField({
                        mode,
                        kind: 'input',
                        token,
                        original: resolvedOriginal,
                        current: currentText,
                        leaf: originalLeaf
                    });
                    if (compared.action === 'none') return;
                    this.track.writeLeafAction(leaf, {
                        action: compared.action,
                        text: compared.text,
                        original: resolvedOriginal,
                        rich: false
                    });
                });
            });
        });
    }

    // Del-only rows for contributors dropped entirely. Needs refType/delimiters/delimitersLast
    // (unlike applyContributorTracking, which only ever writes into leaves inside rows that
    // already exist) so a removed row appended between/after kept rows gets the same separator
    // a visible row would -- see resolveContributorInterDelim, the same lookup createPersonGroup
    // itself uses for the rows it builds.
    appendRemovedContributorRows(rebuiltMixed, sourceRef, {
        authors = [],
        editors = [],
        refType = 'journal',
        delimiters = {},
        delimitersLast = {}
    } = {}) {
        if (!rebuiltMixed || !rebuiltMixed.ownerDocument) return;
        const doc = rebuiltMixed.ownerDocument;
        this.forEachContributorRole(rebuiltMixed, sourceRef, {
            authors,
            editors
        }, ({
            role,
            groupEl,
            currentList,
            originalList
        }) => {
            const currentOriginIndexes = new Set(
                currentList.map((person) => person.originIndex).filter((value) => value != null)
            );
            const removed = originalList.filter((person) => !currentOriginIndexes.has(person.originIndex));
            if (!removed.length) return;
            const ctx = this.resolveContributorGroupContext(refType, role, delimiters, delimitersLast);
            removed.forEach((person, index) => {
                if (groupEl.childElementCount || index > 0) {
                    const sep = this.resolveContributorInterDelim(ctx, false);
                    if (sep) groupEl.appendChild(doc.createTextNode(sep));
                }
                this.appendDelOnlyStringName(groupEl, person, doc);
            });
        });
    }

    forEachContributorRole(rebuiltMixed, sourceRef, {
        authors = [],
        editors = []
    } = {}, callback) {
        const roles = [
            ['author', authors],
            ['editor', editors]
        ];
        roles.forEach(([role, rawList]) => {
            const currentList = Array.isArray(rawList) ? rawList : [];
            // querySelectorAll here too (see parseDocumentContributors) so originIndex stays
            // consistent with whatever was assigned when the dialog opened -- a role split across
            // several separate person-group spans must be walked the same way both times.
            const sourceGroups = sourceRef && sourceRef.querySelectorAll ?
                sourceRef.querySelectorAll(`.mixed-citation .person-group[person-group-type="${role}"]`) : null;
            const effectiveSourceGroups = (sourceGroups && sourceGroups.length) ? sourceGroups :
                (role === 'author' && sourceRef && sourceRef.querySelector && sourceRef.querySelector('.mixed-citation .string-name, .mixed-citation .surname') ? [sourceRef.querySelector('.mixed-citation')] : null);
            const originalList = effectiveSourceGroups ?
                this.parseContributorsFromGroup(effectiveSourceGroups, {
                    includeLeaves: true
                }) : [];
            if (!currentList.length && !originalList.length) return;
            let groupEl = rebuiltMixed.querySelector(`.person-group[person-group-type="${role}"]`);
            if (!groupEl && originalList.length) {
                // The rebuild omits the person-group entirely when the current list for this role
                // is empty (e.g. every editor was cleared) -- create an empty one here so the
                // removal still gets tracked with del-only rows instead of the whole group and its
                // contributors silently vanishing with no audit trail at all.
                groupEl = rebuiltMixed.ownerDocument.createElement('span');
                groupEl.className = 'person-group';
                groupEl.setAttribute('data-name', 'person-group');
                groupEl.setAttribute('person-group-type', role);
                rebuiltMixed.appendChild(groupEl);
            }
            if (!groupEl) return;
            const originalByIndex = new Map(originalList.map((person) => [person.originIndex, person]));
            const rows = Array.from(groupEl.querySelectorAll(':scope > .string-name'));
            callback({
                role,
                groupEl,
                currentList,
                originalList,
                originalByIndex,
                rows
            });
        });
    }

    getContributorTrim(refType, groupName = 'author') {
        const defaults = {
            count: 99,
            after: 99,
            insert: 'et al.',
            style: '‡ref_etal',
            delim: ', ',
            name: groupName,
            missing: ''
        };
        const style = this.getStylePattern(refType);
        if (!style) return defaults;
        const trimEl = this.findStyleChildByName(style, ['trim', 'trim_ellipse'], groupName);
        if (!trimEl) return defaults;
        return {
            count: parseInt(trimEl.getAttribute('count'), 10) || 99,
            after: parseInt(trimEl.getAttribute('after'), 10) || 99,
            insert: trimEl.getAttribute('insert') || 'et al.',
            style: trimEl.getAttribute('style') || '‡ref_etal',
            delim: trimEl.getAttribute('delim') != null ? trimEl.getAttribute('delim') : ', ',
            name: trimEl.getAttribute('name') || groupName,
            missing: trimEl.getAttribute('missing') || ''
        };
    }

    // Ported from the legacy shortenRange() in src/_deprecated/ref_form/index.js:2937 (read-only
    // reference, not imported). That function took one pre-joined "145-149"-style range string;
    // this codebase carries fpage/lpage as separate values, so this wrapper joins them the same
    // way before applying identical digit logic, then returns only the transformed lpage portion.
    expandOrTrimPageRange(fpage, lpage, refType) {
        const rule = this.getPageElideRule(refType);
        if (!rule) return lpage;
        const isLastPageTrim = rule.trim === 'lastpage';
        const isLastPageExpand = rule.expand === 'lastpage';
        if (!isLastPageTrim && !isLastPageExpand) return lpage;

        const start = String(fpage == null ? '' : fpage).trim();
        const end = String(lpage == null ? '' : lpage).trim();
        if (!start || !end) return lpage;

        const startMatch = start.match(/(\D*)(\d+)/);
        const endMatch = end.match(/(\D*)(\d+)/);
        if (!startMatch || !endMatch) return lpage;

        const startPrefix = startMatch[1];
        const startNumStr = startMatch[2];
        const endPrefix = endMatch[1];
        const endNumStr = endMatch[2];

        const startNum = parseInt(startNumStr, 10);
        const endNum = parseInt(endNumStr, 10);
        if (endNum <= startNum) return lpage;

        if (isLastPageTrim) {
            let i = 0;
            while (i < startNumStr.length && i < endNumStr.length && startNumStr.charAt(i) === endNumStr.charAt(i)) {
                i += 1;
            }
            return endPrefix + endNumStr.substring(i);
        }

        if (isLastPageExpand) {
            return endPrefix !== '' ? endPrefix + endNumStr : startPrefix + endNumStr;
        }

        return lpage;
    }

    findStyleChildByName(style, tagNames = [], name) {
        if (!style) return null;
        const wanted = new Set(tagNames.map((t) => String(t).toLowerCase()));
        const nodes = style.querySelectorAll ? Array.from(style.querySelectorAll('*')) : [];
        return nodes.find((el) => {
            const tag = String(el.localName || el.tagName || '').toLowerCase();
            return wanted.has(tag) && el.getAttribute('name') === name;
        }) || null;
    }

    applyContributorTrim(people = [], trim = {}, options = {}) {
        const list = (Array.isArray(people) ? people : []).slice();
        const count = parseInt(trim.count, 10);
        const after = parseInt(trim.after, 10);
        const forceEtal = !!options.forceEtal;
        const countValid = Number.isFinite(count) && count > 0 && count < 99;
        const afterValid = Number.isFinite(after) && after > 0 && after < 99;
        // MultiRef shouldUseEtal: truncate when length >= count
        const overLimit = countValid && list.length >= count;

        if (!overLimit && !forceEtal) {
            return {
                visiblePeople: list,
                etalText: null,
                truncated: false
            };
        }

        let visiblePeople = list;
        let truncated = false;
        if (overLimit && afterValid) {
            visiblePeople = list.slice(0, after);
            truncated = list.length > after;
        } else if (overLimit) {
            truncated = true;
        }

        return {
            visiblePeople,
            etalText: trim.insert || 'et al.',
            truncated: truncated || forceEtal
        };
    }

    getContributorGroup(refType, groupName = 'author') {
        const style = this.getStylePattern(refType);
        const fallback = {
            first: ['surname', 'givenname'],
            rest: ['surname', 'givenname']
        };
        if (!style || !style.querySelector) return fallback;
        const groupEl = style.querySelector(`group[name="${groupName}"]`);
        if (!groupEl) return fallback;
        return {
            first: this.parseContributorNameOrder(groupEl.getAttribute('first')),
            rest: this.parseContributorNameOrder(
                groupEl.getAttribute('rest') || groupEl.getAttribute('first')
            )
        };
    }

    parseContributorNameOrder(raw) {
        const order = String(raw || '')
            .split(',')
            .map((item) => item.trim())
            .map((styleId) => {
                const token = this.styleIdToToken(styleId);
                if (/given/.test(token) || /GivenName/i.test(styleId)) return 'givenname';
                if (/surname/i.test(token) || /Surname/i.test(styleId)) return 'surname';
                if (/suffix/i.test(styleId)) return 'suffix';
                return '';
            })
            .filter(Boolean);
        return order.length ? order : ['surname', 'givenname'];
    }

    resolveContributorGroupContext(refType, groupType = 'author', delimiters = {}, delimitersLast = {}) {
        let styleIds;
        if (groupType === 'editor') {
            styleIds = {
                surname: '‡ref_edSurname',
                givenname: '‡ref_edGivenName',
                suffix: 'suffix'
            };
        } else if (groupType === 'translator') {
            styleIds = {
                surname: '‡ref_trSurname',
                givenname: '‡ref_trGivenName',
                suffix: 'suffix'
            };
        } else {
            styleIds = {
                surname: '‡ref_auSurname',
                givenname: '‡ref_auGivenName',
                suffix: 'suffix'
            };
        }
        return {
            groupType,
            nameOrder: this.getContributorGroup(refType, groupType),
            trim: this.getContributorTrim(refType, groupType),
            styleIds,
            delimiters,
            delimitersLast,
            boundaryStyleId: this.getContributorGroupBoundaryStyleId(refType, groupType)
        };
    }

    // Shared by createPersonGroup (between visible/omitted rows during a rebuild) and
    // appendRemovedContributorRows (between a kept row and a del-only removed row, or between
    // two removed rows) -- one source of truth for the delimiter placed between two contributor
    // rows of the same role, so both call sites can never drift out of sync with each other.
    resolveContributorInterDelim(ctx, isBeforeLast) {
        const pairKey = `${ctx.groupType}->${ctx.groupType}`;
        if (isBeforeLast && Object.prototype.hasOwnProperty.call(ctx.delimitersLast, pairKey)) {
            return ctx.delimitersLast[pairKey];
        }
        if (Object.prototype.hasOwnProperty.call(ctx.delimiters, pairKey)) {
            return ctx.delimiters[pairKey];
        }
        return ', ';
    }

    getContributorGroupBoundaryStyleId(refType, groupType = 'author', boundary = 'first') {
        const style = this.getStylePattern(refType);
        if (!style || !style.querySelector) return groupType;
        const groupMap = this.getGroupFirstMap(style);
        return this.resolveDelimiterBoundaryId(groupType, groupMap, boundary) || groupType;
    }

    resolveAfterContributorGroupDelimiter(groupType, nextToken, nextStyleId, delimiters = {}, refType = 'journal') {
        const boundaryStyleId = this.getContributorGroupBoundaryStyleId(refType, groupType);
        const boundaryToken = this.styleIdToToken(boundaryStyleId) || groupType;
        const candidates = [
            [groupType, nextToken, groupType, nextStyleId],
            [groupType, nextToken, groupType, nextToken],
            [boundaryToken, nextToken, boundaryStyleId, nextStyleId],
            [boundaryToken, nextToken, boundaryStyleId, nextToken]
        ];
        for (let i = 0; i < candidates.length; i += 1) {
            const [first, next, firstStyleId, nextResolvedStyleId] = candidates[i];
            const value = this.resolveDelimiter(first, next, delimiters, firstStyleId, nextResolvedStyleId);
            const styleKey = firstStyleId && nextResolvedStyleId ? `${firstStyleId}->${nextResolvedStyleId}` : '';
            const tokenKey = `${first}->${next}`;
            if (Object.prototype.hasOwnProperty.call(delimiters, styleKey) ||
                Object.prototype.hasOwnProperty.call(delimiters, tokenKey)) {
                return value;
            }
        }
        return this.resolveDelimiter(groupType, nextToken, delimiters, groupType, nextStyleId);
    }

    // Mirrors resolveAfterContributorGroupDelimiter for the reverse boundary: a plain field
    // immediately followed by a contributor group (e.g. source/chapter-title -> editor). Without
    // this, renderCitationSlots fell through to a plain resolveDelimiter() call keyed on the
    // group's literal pseudo-token ('editor'), which usually doesn't match how the CEG-derived
    // table keys real entries (it resolves group names to the group's actual boundary styleId) --
    // so the lookup missed and silently fell back to a bare space.
    resolveBeforeContributorGroupDelimiter(prevToken, prevStyleId, groupType, delimiters = {}, refType = 'journal') {
        const boundaryStyleId = this.getContributorGroupBoundaryStyleId(refType, groupType, 'next');
        const boundaryToken = this.styleIdToToken(boundaryStyleId) || groupType;
        const candidates = [
            [prevToken, groupType, prevStyleId, groupType],
            [prevToken, groupType, prevToken, groupType],
            [prevToken, boundaryToken, prevStyleId, boundaryStyleId],
            [prevToken, boundaryToken, prevToken, boundaryStyleId]
        ];
        for (let i = 0; i < candidates.length; i += 1) {
            const [first, next, firstStyleId, nextResolvedStyleId] = candidates[i];
            const value = this.resolveDelimiter(first, next, delimiters, firstStyleId, nextResolvedStyleId);
            const styleKey = firstStyleId && nextResolvedStyleId ? `${firstStyleId}->${nextResolvedStyleId}` : '';
            const tokenKey = `${first}->${next}`;
            if (Object.prototype.hasOwnProperty.call(delimiters, styleKey) ||
                Object.prototype.hasOwnProperty.call(delimiters, tokenKey)) {
                return value;
            }
        }
        return this.resolveDelimiter(prevToken, groupType, delimiters, prevStyleId, groupType);
    }

    attachMixedCitationResult(result = {}) {
        const mixed = result.refNode && result.refNode.querySelector ?
            result.refNode.querySelector('.mixed-citation') :
            null;
        return {
            ...result,
            mixedCitation: mixed,
            mixedCitationHtml: mixed ? mixed.outerHTML : ''
        };
    }

    hasContributorGroup(refType, groupName) {
        const style = this.getStylePattern(refType);
        return !!(style && style.querySelector && style.querySelector(`group[name="${groupName}"]`));
    }

    static create(options = {}) {
        return new RefBridge(options);
    }

    resolveSourcePolicy(refType) {
        const type = String(refType || 'journal').toLowerCase();
        const sharedKey = this.globalObject.SHARED_KEY || {};
        const refstyle = String(sharedKey.refstyle || '').toLowerCase().replace(/\s+/g, '');
        const isBook = /book/.test(type);

        if (isBook && refstyle === 'cms18') return 'config-first';
        if (isBook) return 'document-first';
        return 'default';
    }

    prepareTemplate(context = {}) {
        const refNode = this.unwrapNode(context.refNode);
        const initialRefType = context.refType || this.getRefType(refNode) || 'journal';
        const documentTemplate = context.documentTemplate || this.getDocumentTemplate(refNode, initialRefType);
        const existingFields = context.existingFields || documentTemplate.fields || [];
        const mixed = refNode && refNode.querySelector ?
            refNode.querySelector('.mixed-citation') :
            null;
        const peekFields = [].concat(existingFields || [],
            (context.configTemplate && context.configTemplate.fields) || []);
        const promotedType = this.resolvePromotedRefType({
            refType: initialRefType,
            mixed,
            fields: peekFields
        });
        const policy = this.resolveSourcePolicy(promotedType);
        const configTemplate = promotedType !== initialRefType ?
            this.getConfigTemplate(promotedType) :
            (context.configTemplate || this.getConfigTemplate(promotedType));
        const missingFields = this.resolveMissingElements(context.queryText || context.queryNode, promotedType);
        const merged = this.mergeTemplateSources(configTemplate, {
            ...documentTemplate,
            fields: existingFields
        }, policy);
        const fields = this.mergeMissingFields(merged.fields, missingFields, merged.fields);
        const values = {};

        fields.forEach((field) => {
            values[field.token] = field.value != null ? field.value : '';
        });
        if (documentTemplate.values && typeof documentTemplate.values === 'object') {
            Object.keys(documentTemplate.values).forEach((token) => {
                const raw = documentTemplate.values[token];
                if (raw != null && String(raw).trim() !== '') {
                    values[token] = String(raw);
                }
            });
        }
        // Built from documentTemplate.fields directly — before mergeTemplateSources/policy ever
        // runs — so a 'config-first' policy picking the config copy of a field can never cause
        // these to be lost the way field.original can be lost on the merged field object itself.
        const originalValues = {};
        const originalInlineFormats = {};
        (documentTemplate.fields || []).forEach((field) => {
            if (!field || !field.token) return;
            if (field.original != null) originalValues[field.token] = field.original;
            if (field.inlineFormat) originalInlineFormats[field.token] = field.inlineFormat;
        });
        this.syncAuthorPersonGroupOriginalsFromSource(refNode, {
            originalValues
        });

        return {
            mode: context.mode || 'insert',
            ref: refNode,
            refType: promotedType,
            sourcePolicy: policy,
            fields,
            orderTokens: (configTemplate.fields || []).map((field) => field && field.token).filter(Boolean),
            slotOrder: configTemplate.slotOrder || [],
            missingFields,
            delimiters: merged.delimiters || {},
            delimitersLast: merged.delimitersLast || {},
            abbreviation: merged.abbreviation || null,
            groupSlots: merged.groupSlots || [],
            personGroups: merged.personGroups || {},
            templateCatalog: merged.templateCatalog || [],
            values,
            originalValues,
            originalInlineFormats,
            warnings: merged.warnings || [],
            authors: documentTemplate.authors || [],
            editors: documentTemplate.editors || [],
            translators: documentTemplate.translators || [],
            contributorTrim: {
                author: this.getContributorTrim(promotedType, 'author'),
                editor: this.getContributorTrim(promotedType, 'editor'),
                translator: this.getContributorTrim(promotedType, 'translator')
            },
            hasTranslatorGroup: this.hasContributorGroup(promotedType, 'translator'),
            hasEditorGroup: promotedType === 'ed-book' || (documentTemplate.editors || []).some((person) => this.normalizeSpace(person && (person.surname || person.givenname)))
        };
    }

    getConfigTemplate(refType) {
        const style = this.getStylePattern(refType);
        if (!style) return {
            fields: [],
            delimiters: {},
            delimitersLast: {},
            source: 'fallback'
        };

        const groupMap = this.getGroupFirstMap(style);
        const rawOrder = String(style.getAttribute('order') || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        const missing = this.expandGroupTokens(style.getAttribute('missing'), groupMap);
        const italic = this.parseStyleIdList(style.getAttribute('italic'));
        const bold = this.parseStyleIdList(style.getAttribute('bold'));
        const abbreviation = this.getReferenceAbbreviationConfig(style);
        const fields = [];
        const groupSlots = [];
        const slotOrder = [];

        rawOrder.forEach((styleId, rawIndex) => {
            const group = groupMap[styleId];
            const groupOrder = rawIndex * 100;
            if (group) {
                slotOrder.push({
                    token: styleId,
                    styleId,
                    order: groupOrder,
                    kind: 'group',
                    source: 'config'
                });
                groupSlots.push({
                    token: styleId,
                    styleId,
                    order: groupOrder,
                    source: 'config'
                });
                group.forEach((groupStyleId, groupIndex) => {
                    const token = this.styleIdToToken(groupStyleId);
                    if (!token) return;
                    fields.push({
                        token,
                        styleId: groupStyleId,
                        groupToken: styleId,
                        groupOrder,
                        label: this.labelForToken(token),
                        required: missing.includes(groupStyleId),
                        italic: italic.includes(groupStyleId),
                        bold: bold.includes(groupStyleId),
                        order: groupOrder + groupIndex,
                        source: 'config'
                    });
                });
                return;
            }

            const token = this.styleIdToToken(styleId);
            if (!token) return;
            slotOrder.push({
                token,
                styleId,
                order: groupOrder,
                kind: 'field',
                source: 'config'
            });
            fields.push({
                token,
                styleId,
                label: this.labelForToken(token),
                required: missing.includes(styleId),
                italic: italic.includes(styleId),
                bold: bold.includes(styleId),
                order: groupOrder,
                source: 'config'
            });
        });
        const delimiters = {};
        const delimitersLast = {};
        const delimRoot = style.querySelector && style.querySelector('delimiter');

        if (delimRoot && delimRoot.querySelectorAll) {
            Array.from(delimRoot.querySelectorAll('element')).forEach((el) => {
                const rawFirst = el.getAttribute('first') || '';
                const rawNext = el.getAttribute('next') || '';
                const firstId = this.resolveDelimiterBoundaryId(rawFirst, groupMap, 'first');
                const nextId = this.resolveDelimiterBoundaryId(rawNext, groupMap, 'next');
                const value = el.getAttribute('delim') || el.getAttribute('prefix') || el.getAttribute('suffix') || '';
                const lastValue = el.getAttribute('last');

                delimiters[`${firstId}->${nextId}`] = value;

                const tokenKey = `${this.styleIdToToken(firstId)}->${this.styleIdToToken(nextId)}`;
                if (!Object.prototype.hasOwnProperty.call(delimiters, tokenKey)) {
                    delimiters[tokenKey] = value;
                }
                if (rawFirst && rawNext) {
                    delimiters[`${rawFirst}->${rawNext}`] = value;
                }
                if (lastValue != null && lastValue !== '') {
                    delimitersLast[`${firstId}->${nextId}`] = lastValue;
                    if (!Object.prototype.hasOwnProperty.call(delimitersLast, tokenKey)) {
                        delimitersLast[tokenKey] = lastValue;
                    }
                    if (rawFirst && rawNext) {
                        delimitersLast[`${rawFirst}->${rawNext}`] = lastValue;
                    }
                }
            });
        }

        return {
            fields,
            groupSlots,
            slotOrder,
            delimiters,
            delimitersLast,
            abbreviation,
            source: 'config'
        };
    }

    getReferenceAbbreviationConfig(style) {
        if (!style || !style.getAttribute) return null;
        const expansionStyleId = this.normalizeSpace(style.getAttribute('abb_expansion'));
        const output = this.normalizeSpace(style.getAttribute('abb_out')).toUpperCase();
        if (!expansionStyleId || !output) return null;
        return {
            expansionStyleId,
            expansionToken: this.styleIdToToken(expansionStyleId),
            output
        };
    }

    parseStyleIdList(rawList) {
        return String(rawList || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    getGroupFirstMap(style) {
        const map = {};
        if (!style || !style.querySelectorAll) return map;

        Array.from(style.querySelectorAll('group')).forEach((el) => {
            const name = el.getAttribute('name');
            if (!name || map[name]) return;
            const first = String(el.getAttribute('first') || '')
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
            if (first.length) map[name] = first;
        });

        return map;
    }

    expandGroupTokens(rawList, groupMap) {
        return String(rawList || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
            .reduce((expanded, item) => {
                if (groupMap[item]) {
                    expanded.push(...groupMap[item]);
                } else {
                    expanded.push(item);
                }
                return expanded;
            }, []);
    }

    resolveDelimiterBoundaryId(rawId, groupMap, boundary) {
        const group = groupMap[rawId];
        if (!group || !group.length) return rawId;
        const ids = boundary === 'next' ? group : group.slice().reverse();
        const resolved = ids.find((id) => this.styleIdToToken(id));
        return resolved || rawId;
    }

    getDocumentTemplate(refNode, refType) {
        const ref = this.unwrapNode(refNode);
        const mixed = ref && ref.querySelector ? ref.querySelector('.mixed-citation') : null;
        if (!mixed) {
            return {
                fields: [],
                delimiters: {},
                source: 'document',
                authors: [],
                editors: [],
                translators: [],
                values: {}
            };
        }

        const contributors = this.parseDocumentContributors(mixed);
        const candidates = Array.from(mixed.querySelectorAll(this.getLeafSelector()))
            .filter((el) => !(el.closest && el.closest('.person-group')));
        // Real-world PLOS markup sometimes wraps a specific leaf (e.g. ext-link) inside a generic
        // one (e.g. comment) purely as a container, with no text of its own: <span
        // class="comment"><span class="ext-link">https://doi.org/...</span></span>. Both would
        // otherwise be discovered as separate fields carrying the same value, showing the same
        // text twice in the edit panel. When a matched leaf's only content IS another matched
        // leaf nested inside it, drop the wrapper and keep the more specific nested one.
        const leaves = candidates.filter((el) => {
            const nested = candidates.filter((other) => other !== el && el.contains(other));
            if (!nested.length) return true;
            const nestedSet = new Set(nested);
            return this.normalizeSpace(this.textExcludingNestedLeaves(el, nestedSet)) !== '';
        });
        const fields = leaves.map((el, index) => {
            const token = this.getTokenFromElement(el);
            return {
                ...this.buildDocumentLeafField(el, token, index),
                selector: `.${token}`,
                label: this.labelForToken(token),
                source: 'document'
            };
        }).filter((field) => field.token);

        const values = {};
        fields.forEach((field) => {
            values[field.token] = field.value != null ? field.value : '';
        });
        if (contributors.hasAuthorEtal) {
            values.etal = 'et al.';
        }

        const authorGroup = mixed.querySelector('.person-group[person-group-type="author"]');
        const collabEl = authorGroup && authorGroup.querySelector('.collab');
        if (collabEl) {
            const collabValue = this.getLeafFieldContent(collabEl, 'collab');
            if (this.normalizeSpace(collabValue) && !this.normalizeSpace(values.collab)) {
                values.collab = collabValue;
                if (!fields.some((f) => f.token === 'collab')) {
                    const collabField = {
                        ...this.buildDocumentLeafField(collabEl, 'collab', fields.length),
                        selector: '.collab',
                        label: this.labelForToken('collab'),
                        source: 'document'
                    };
                    fields.push(collabField);
                    values.collab = collabField.value;
                }
            }
        }

        return {
            fields,
            delimiters: this.getDocumentDelimiters(fields),
            wrapText: this.getDocumentWrapText(fields, refType),
            source: 'document',
            templateCatalog: this.buildTemplateCatalog(ref),
            groupSlots: this.getDocumentGroupSlots(mixed),
            authors: contributors.authors,
            editors: contributors.editors,
            translators: contributors.translators,
            values
        };
    }

    // Walks el's own text, skipping the subtree of any node present in nestedLeaves -- used to
    // decide whether a wrapper leaf (e.g. .comment) has any content beyond the more specific
    // leaf(s) nested inside it (e.g. .ext-link).
    textExcludingNestedLeaves(el, nestedLeaves) {
        if (!el || !el.childNodes) return '';
        let text = '';
        el.childNodes.forEach((node) => {
            if (node.nodeType === 3) {
                text += node.textContent || '';
                return;
            }
            if (node.nodeType === 1) {
                if (nestedLeaves.has(node)) return;
                text += this.textExcludingNestedLeaves(node, nestedLeaves);
            }
        });
        return text;
    }

    parseDocumentContributors(mixed) {
        if (!mixed || !mixed.querySelectorAll) {
            return {
                authors: [],
                editors: [],
                translators: [],
                hasAuthorEtal: false
            };
        }
        // querySelectorAll, not querySelector: real-world markup sometimes wraps each
        // contributor of a role in its own separate <span class="person-group"> instead of one
        // shared span with multiple .string-name children (e.g. "edited by <person-group>Robert
        // Audi</person-group> and <person-group>David Phillips</person-group>") -- a single
        // querySelector would silently see only the first one and drop every other contributor
        // of that role from the form entirely.
        const authorGroups = mixed.querySelectorAll('.person-group[person-group-type="author"]');
        const hasLooseAuthor = Array.from(mixed.querySelectorAll('.string-name, .surname'))
            .some((el) => !(el.closest && el.closest('.person-group')));
        const effectiveAuthorGroups = authorGroups.length ? authorGroups :
            (hasLooseAuthor ? [mixed] : []);
        return {
            authors: this.parseContributorsFromGroup(effectiveAuthorGroups),
            editors: this.parseContributorsFromGroup(
                mixed.querySelectorAll('.person-group[person-group-type="editor"]')
            ),
            translators: this.parseContributorsFromGroup(
                mixed.querySelectorAll('.person-group[person-group-type="translator"]')
            ),
            hasAuthorEtal: Array.from(authorGroups).some((group) => group.querySelector('.etal'))
        };
    }

    getDocumentGroupSlots(mixed) {
        if (!mixed || !mixed.children) return [];
        return Array.from(mixed.children)
            .map((el, index) => {
                if (!el.classList || !el.classList.contains('person-group')) return null;
                const token = el.getAttribute('person-group-type') || '';
                if (!token) return null;
                return {
                    token,
                    styleId: token,
                    order: index,
                    source: 'document'
                };
            })
            .filter(Boolean);
    }

    // Accepts either one <span class="person-group"> element or a NodeList/array of them (the
    // latter for markup that splits one role across several separate spans instead of a single
    // shared one -- see the comment in parseDocumentContributors). Either way, every group's
    // .string-name children are gathered in document order and re-indexed as one continuous list,
    // so originIndex stays a stable, role-wide position regardless of how many spans it came from.
    parseContributorsFromGroup(groupOrGroups, {
        includeLeaves = false
    } = {}) {
        const groups = Array.isArray(groupOrGroups) || (groupOrGroups && typeof groupOrGroups.forEach === 'function') ?
            Array.from(groupOrGroups) : [groupOrGroups];
        const stringNames = [];
        groups.forEach((group) => {
            if (!group || !group.querySelectorAll) return;
            if (group.classList && group.classList.contains('mixed-citation')) {
                const looseNames = Array.from(group.querySelectorAll('.string-name'))
                    .filter((el) => !(el.closest && el.closest('.person-group')));
                stringNames.push(...looseNames);
                return;
            }
            stringNames.push(...group.querySelectorAll('.string-name'));
        });
        return stringNames
            .map((stringName, index) => {
                const surnameEl = stringName.querySelector('.surname');
                const givenEl = stringName.querySelector('.given-names');
                const surnameFont = this.readPlainInlineFontMeta(surnameEl, 'surname');
                const givenFont = this.readPlainInlineFontMeta(givenEl, 'given-names');
                const person = {
                    index,
                    originIndex: index,
                    surname: surnameFont ? surnameFont.value : (surnameEl ? this.getLeafFieldContent(surnameEl, 'surname') : ''),
                    givenname: givenFont ? givenFont.value : (givenEl ? this.getLeafFieldContent(givenEl, 'given-names') : ''),
                    formatModeSurname: surnameFont ? surnameFont.formatMode : undefined,
                    inlineFormatSurname: surnameFont ? surnameFont.inlineFormat : undefined,
                    formatModeGiven: givenFont ? givenFont.formatMode : undefined,
                    inlineFormatGiven: givenFont ? givenFont.inlineFormat : undefined
                };
                if (includeLeaves) {
                    person.surnameEl = surnameEl || null;
                    person.givenEl = givenEl || null;
                }
                return person;
            })
            .filter((person) => this.normalizeSpace(person.surname) || this.normalizeSpace(person.givenname));
    }

    mergeTemplateSources(configTemplate = {}, documentTemplate = {}, policy = 'default') {
        const configFields = configTemplate.fields || [];
        const documentFields = documentTemplate.fields || [];
        const primary = policy === 'config-first' ? configFields :
            policy === 'document-first' ? documentFields :
            (documentFields.length ? documentFields : configFields);
        const secondary = primary === configFields ? documentFields : configFields;
        const fieldsByToken = new Map();

        primary.forEach((field, index) => {
            fieldsByToken.set(field.token, {
                ...field,
                order: field.order != null ? field.order : index,
                source: field.source || (primary === configFields ? 'config' : 'document')
            });
        });

        // A fallback field whose token never made it into `primary` (an "orphan" -- e.g. a
        // document-sourced `publisher-loc` when the active CEG style's `order` attribute never
        // lists it) is exactly what relocateOrphanFieldsToEnd() moves to the end of the citation
        // later, wrapped in <del>, for the same reason: the active style has no declared position
        // for it. Anchoring it "near its nearest neighbor" here (the prior behavior) could sandwich
        // it directly between two fields whose adjacency-based delimiter/group rendering (e.g. a
        // contributor-group boundary like source->editor) depends on them being real, adjacent
        // neighbors -- an orphan sitting in between resolves no CEG rule for either new boundary and
        // silently falls back to a bare space. Sorting every orphan after all declared-order fields
        // (in their own original relative sequence) avoids ever creating that false adjacency, and
        // matches where relocateOrphanFieldsToEnd is going to move them anyway.
        const maxPrimaryOrder = fieldsByToken.size ?
            Math.max(...Array.from(fieldsByToken.values()).map((value) => value.order)) :
            0;
        let orphanRunIndex = 0;
        secondary.forEach((field) => {
            if (!field || !field.token) return;
            if (fieldsByToken.has(field.token)) return;
            orphanRunIndex += 1;
            fieldsByToken.set(field.token, {
                ...field,
                order: maxPrimaryOrder + orphanRunIndex * 0.001,
                source: field.source || 'fallback'
            });
        });

        const fields = Array.from(fieldsByToken.values()).sort((a, b) => {
            const ao = a.order != null ? a.order : this.defaultFieldOrder.indexOf(a.token);
            const bo = b.order != null ? b.order : this.defaultFieldOrder.indexOf(b.token);
            return (ao === -1 ? Number.MAX_SAFE_INTEGER : ao) - (bo === -1 ? Number.MAX_SAFE_INTEGER : bo);
        });

        return {
            fields,
            groupSlots: [
                ...(documentTemplate.groupSlots || []),
                ...(configTemplate.groupSlots || [])
            ],
            slotOrder: configTemplate.slotOrder || [],
            delimiters: {
                ...(documentTemplate.delimiters || {}),
                ...(configTemplate.delimiters || {})
            },
            delimitersLast: {
                ...(documentTemplate.delimitersLast || {}),
                ...(configTemplate.delimitersLast || {})
            },
            personGroups: documentTemplate.personGroups || {},
            templateCatalog: documentTemplate.templateCatalog || [],
            abbreviation: configTemplate.abbreviation || documentTemplate.abbreviation || null,
            warnings: []
        };
    }

    buildReferencePreview(state = {}) {
        const orderFor = this.createSlotOrderResolver(state.slotOrder || (state.template && state.template.slotOrder) || []);
        const fields = (state.fields || []).slice().sort((a, b) => orderFor(a) - orderFor(b));
        const values = state.values || {};
        const originalValues = state.originalValues || {};
        // A field must never silently vanish from the preview just because its *current* value
        // is empty -- e.g. an orphan field whose value never made it into `values`, or a field a
        // user accidentally cleared. Fall back to its original document content instead of
        // dropping it, so nothing disappears from view before the reviewer submits.
        const previewValue = (field) => {
            const current = this.resolveFieldValue(field, values);
            if (String(current == null ? '' : current).trim() !== '') return current;
            const original = originalValues[field.token];
            return original != null ? original : current;
        };
        const visibleFields = fields.filter((field) => {
            const value = previewValue(field);
            return String(value == null ? '' : value).trim() !== '';
        });

        return visibleFields.map((field, index) => {
            const value = previewValue(field);
            const next = visibleFields[index + 1];
            const nextValue = next ? previewValue(next) : null;
            const delim = next ? this.resolveDelimiter(
                field.token, next.token, state.delimiters,
                this.resolveFieldStyleId(field, value, state.refType), this.resolveFieldStyleId(next, nextValue, state.refType)
            ) : '';
            return `${this.escapeText(value)}${delim}`;
        }).join('');
    }

    normalizePayload(payload = {}) {
        const source = payload && typeof payload === 'object' ? payload : {};
        const refType = String(source.type || source.refType || 'journal').toLowerCase();
        const authors = this.normalizeAuthors(source.author || source.authors || []);
        const editors = this.normalizeAuthors(source.editor || source.editors || []);
        const translators = this.normalizeAuthors(source.translator || source.translators || []);
        const values = {};
        const skipKeys = new Set([
            'type', 'refType', 'author', 'authors', 'editor', 'editors',
            'translator', 'translators', 'fields', 'values', 'etal'
        ]);

        Object.keys(source).forEach((key) => {
            if (skipKeys.has(key)) return;
            const token = this.payloadKeyToToken(key);
            if (!token) return;
            const raw = source[key];
            values[token] = raw == null ? '' : String(raw);
        });

        if (source.values && typeof source.values === 'object') {
            Object.keys(source.values).forEach((token) => {
                const raw = source.values[token];
                values[token] = raw == null ? '' : String(raw);
            });
        }

        if (source.etal === true || source.etal === 'true') {
            values.etal = 'et al.';
        } else if (typeof source.etal === 'string' && this.normalizeSpace(source.etal)) {
            values.etal = this.normalizeSpace(source.etal);
        }

        if (authors.length) {
            if (!this.normalizeSpace(values.surname)) values.surname = authors[0].surname;
            if (!this.normalizeSpace(values['given-names'])) values['given-names'] = authors[0].givenname;
        }
        if (editors.length) {
            if (!this.normalizeSpace(values['editor-surname'])) values['editor-surname'] = editors[0].surname;
            if (!this.normalizeSpace(values['editor-given-names'])) {
                values['editor-given-names'] = editors[0].givenname;
            }
        }

        return {
            refType,
            values,
            authors,
            editors,
            translators,
            payload: source
        };
    }

    payloadKeyToToken(key) {
        if (!key) return '';
        if (this.payloadKeyMap[key]) return this.payloadKeyMap[key];
        if (this.defaultFieldOrder.indexOf(key) !== -1) return key;
        if (key.indexOf('-') !== -1) return key;
        return '';
    }

    normalizeAuthors(list = []) {
        return (Array.isArray(list) ? list : [])
            .map((author, index) => ({
                index: author && author.index != null ? Number(author.index) : index,
                originIndex: author && author.originIndex != null ? Number(author.originIndex) : null,
                surname: this.normalizeSpace(author && (author.surname || author.family || '')),
                givenname: this.normalizeSpace(author && (author.givenname || author.given || author['given-names'] || '')),
                formatModeSurname: author && author.formatModeSurname,
                inlineFormatSurname: author && author.inlineFormatSurname,
                formatModeGiven: author && author.formatModeGiven,
                inlineFormatGiven: author && author.inlineFormatGiven
            }))
            .filter((author) => author.surname || author.givenname)
            .sort((a, b) => a.index - b.index);
    }

    stateFromPayload(payload = {}, options = {}) {
        const normalized = this.normalizePayload(payload);
        const template = this.prepareTemplate({
            mode: options.mode || 'insert',
            refType: normalized.refType,
            refNode: options.refNode || payload.refNode || payload.ref,
            queryNode: options.queryNode || payload.queryNode,
            queryText: options.queryText || payload.queryText,
            configTemplate: options.configTemplate || payload.configTemplate,
            documentTemplate: options.documentTemplate || payload.documentTemplate,
            documentRoot: options.documentRoot || payload.documentRoot
        });
        const values = {
            ...(template.values || {}),
            ...normalized.values
        };
        const renderedValues = this.applyReferenceAbbreviationOutput(values, template, normalized.refType);
        const fields = (template.fields || []).map((field) => ({
            ...field,
            styleId: field.styleId || this.defaultStyleIdForToken(field.token, normalized.refType),
            value: renderedValues[field.token] != null ? renderedValues[field.token] : field.value
        }));

        return {
            ...template,
            mode: options.mode || template.mode || 'insert',
            refType: normalized.refType,
            values: renderedValues,
            fields,
            authors: normalized.authors,
            editors: normalized.editors,
            translators: normalized.translators,
            refNode: this.unwrapNode(options.refNode || payload.refNode || payload.ref || template.ref),
            delimiters: template.delimiters || {},
            delimitersLast: template.delimitersLast || {},
            abbreviation: template.abbreviation || null,
            groupSlots: template.groupSlots || [],
            slotOrder: template.slotOrder || []
        };
    }

    buildReferenceFromPayload(payload = {}, options = {}) {
        return this.buildMixedCitation(payload, {
            ...options,
            mode: 'insert'
        });
    }

    defaultStyleIdForToken(token, refType = 'journal') {
        const type = String(refType || 'journal').toLowerCase();
        const map = {
            source: type === 'journal' ? '‡ref_titleJournal' : '‡ref_titleBook',
            year: '‡ref_pubdateYear'
        };
        return map[token] || token;
    }

    buildMixedCitation(payload = {}, options = {}) {
        const state = this.stateFromPayload(payload, {
            ...options,
            mode: options.mode || 'insert'
        });
        const built = this.buildReferenceDom(state, options);
        const preview = this.buildReferencePreview(state);
        return this.attachMixedCitationResult({
            refNode: built.refNode,
            html: built.refNode ? built.refNode.outerHTML : '',
            preview,
            state,
            reason: built.reason
        });
    }

    createNewReferenceElement(ownerDocument, options = {}) {
        if (!ownerDocument || typeof ownerDocument.createElement !== 'function') return null;
        const ref = ownerDocument.createElement('div');
        const rid = options.rid || 'CIT0001';
        const insertMethod = options.insertMethod ? String(options.insertMethod) : '';
        const citeLabel = this.normalizeSpace(options.citeLabel);

        ref.className = 'ref';
        ref.setAttribute('data-name', 'ref');
        ref.setAttribute('data-role', 'ref');
        ref.setAttribute('data-new', 's');
        ref.id = rid;
        if (insertMethod) {
            ref.setAttribute('data-ins-type', insertMethod);
        }
        if (citeLabel) {
            ref.setAttribute('data-cite-label', citeLabel);
        }
        return ref;
    }

    createReferenceNode(ownerDocument, tagName, attrs = {}) {
        if (!ownerDocument || typeof ownerDocument.createElement !== 'function') return null;
        const node = ownerDocument.createElement(tagName || 'span');
        const className = attrs.className != null ? attrs.className : attrs.class;
        if (className) node.className = String(className);
        Object.keys(attrs).forEach((key) => {
            if (key === 'class' || key === 'className') return;
            const value = attrs[key];
            if (value == null || value === false) return;
            node.setAttribute(key, String(value));
        });
        return node;
    }

    findInsertWrapper(ref) {
        if (!ref || typeof ref.querySelector !== 'function') return null;
        return ref.querySelector('insert[data-track-code="ref-01"]') || ref.querySelector('insert');
    }

    placeNumberedLabel(ref, labelText) {
        const wrap = this.findInsertWrapper(ref);
        if (!wrap || !ref.ownerDocument) return null;
        const existing = wrap.querySelector(':scope > .label') || wrap.querySelector('.label');
        if (existing) return existing;
        const label = this.createReferenceNode(ref.ownerDocument, 'span', {
            class: 'label',
            'data-name': 'label'
        });
        if (!label) return null;
        label.textContent = labelText == null ? '' : String(labelText);
        wrap.insertBefore(label, wrap.firstChild);
        return label;
    }

    buildPlainTextReference(input = {}, options = {}) {
        const text = this.normalizeSpace(
            typeof input === 'string' ? input : (input.text || input.plainText || '')
        );
        const refType = String(
            (typeof input === 'object' && (input.refType || input.type)) || options.refType || 'journal'
        ).toLowerCase();
        const ownerDocument = options.ownerDocument ||
            (typeof document !== 'undefined' ? document : null);
        if (!ownerDocument) {
            return this.attachMixedCitationResult({
                refNode: null,
                html: '',
                preview: '',
                reason: 'document-missing'
            });
        }
        if (!text) {
            return this.attachMixedCitationResult({
                refNode: null,
                html: '',
                preview: '',
                reason: 'plain-text-empty'
            });
        }

        const ref = this.createNewReferenceElement(ownerDocument, {
            rid: options.rid || 'CIT0001',
            insertMethod: 'plain_text',
            citeLabel: this.normalizeSpace(input && input.plainCite)
        });
        if (!ref) {
            return this.attachMixedCitationResult({
                refNode: null,
                html: '',
                preview: '',
                reason: 'document-missing'
            });
        }
        const mixed = this.createReferenceNode(ownerDocument, 'span', {
            class: 'mixed-citation',
            'data-name': 'mixed-citation',
            'publication-type': refType,
            'data-plain-text': 'true'
        });
        if (!mixed) {
            return this.attachMixedCitationResult({
                refNode: null,
                html: '',
                preview: '',
                reason: 'document-missing'
            });
        }
        mixed.innerHTML = text;
        mixed.querySelectorAll('script, style').forEach((node) => node.remove());
        mixed.querySelectorAll('*').forEach((node) => {
            Array.from(node.attributes || []).forEach((attr) => {
                if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
            });
        });
        const insertWrap = this.getInsertWrapper(ownerDocument);
        insertWrap.appendChild(mixed);
        ref.appendChild(insertWrap);

        return this.attachMixedCitationResult({
            refNode: ref,
            html: ref.outerHTML,
            preview: this.escapeText(text),
            state: {
                refType,
                plainText: text,
                values: {},
                fields: [],
                authors: []
            }
        });
    }

    buildEditReferenceDom(payloadOrState = {}, options = {}) {
        const state = payloadOrState.fields ?
            this.mergeAuthorsIntoState(payloadOrState) :
            this.stateFromPayload(payloadOrState, {
                ...options,
                mode: 'edit',
                refNode: options.refNode || payloadOrState.refNode || payloadOrState.ref
            });
        const sourceRef = this.unwrapNode(state.refNode || state.ref);
        if (!sourceRef || !sourceRef.querySelector) {
            return this.attachMixedCitationResult({
                refNode: null,
                html: '',
                preview: '',
                changed: false,
                reason: 'ref-missing'
            });
        }

        const clone = sourceRef.cloneNode(true);
        const mixed = clone.querySelector('.mixed-citation');
        if (!mixed) {
            return this.attachMixedCitationResult({
                refNode: clone,
                html: clone.outerHTML,
                preview: this.buildReferencePreview(state),
                changed: false,
                reason: 'mixed-citation-missing'
            });
        }

        const fields = this.getOperationFields(state, {
            includePersonGroupLeaves: true
        });
        const values = this.getOperationValues(state);
        const authors = (state.authors || []).filter((author) =>
            this.normalizeSpace(author.surname) || this.normalizeSpace(author.givenname)
        );
        const editors = (state.editors || []).filter((editor) =>
            this.normalizeSpace(editor.surname) || this.normalizeSpace(editor.givenname)
        );
        const translators = (state.translators || []).filter((person) =>
            this.normalizeSpace(person.surname) || this.normalizeSpace(person.givenname)
        );
        const sourceHasPersonGroup = !!sourceRef.querySelector('.person-group');
        const sourceAuthorNames = this.syncAuthorPersonGroupOriginalsFromSource(sourceRef, state);
        const hadAuthorEtal = sourceAuthorNames.hadAuthorEtal;
        const hadAuthorSurname = sourceAuthorNames.hadAuthorSurname;
        const hadAuthorGiven = sourceAuthorNames.hadAuthorGiven;
        state.hadAuthorEtal = hadAuthorEtal;
        state.hadAuthorSurname = hadAuthorSurname;
        state.hadAuthorGiven = hadAuthorGiven;
        const contributorCount = authors.length + editors.length + translators.length;
        const shouldRebuildContributors = sourceHasPersonGroup || contributorCount > 1 ||
            editors.length > 0 || translators.length > 0;
        const booksFullTemplate = this.isBooksGlobal();
        let changed = false;

        if (booksFullTemplate || (shouldRebuildContributors && contributorCount)) {
            const beforeHtml = mixed.innerHTML;
            const rebuilt = this.buildReferenceDom({
                ...state,
                authors,
                editors,
                translators,
                hadAuthorEtal,
                hadAuthorSurname,
                hadAuthorGiven,
                refType: state.refType || this.getRefType(sourceRef) || 'journal'
            }, {
                rid: clone.id || options.rid || 'CIT0001',
                ownerDocument: clone.ownerDocument,
                trackNew: false,
                isUpdate: true
            });
            const rebuiltMixed = rebuilt.refNode && rebuilt.refNode.querySelector('.mixed-citation');
            if (rebuiltMixed) {
                // Contributor name tracking runs before runApplyUpdate's trim/etal pass: trim
                // decides which authors stay visible vs. get del-wrapped for exceeding the CEG
                // after-count, and that decision must be the final word on those leaves. Running
                // name tracking first means a newly-added author that also gets trimmed away ends
                // up del-wrapped (correct: it's not visible), not insert-wrapped then silently
                // overwritten by trim.
                this.applyContributorTracking(rebuiltMixed, sourceRef, {
                    authors,
                    editors,
                    mode: state.mode || 'edit'
                });
                const tracked = this.runApplyUpdate('edit', {
                    mixed: rebuiltMixed,
                    source: sourceRef,
                    fields,
                    values,
                    originalValues: this.getOperationOriginalValues(state),
                    originalInlineFormats: this.getOperationOriginalInlineFormats(state),
                    refType: state.refType || this.getRefType(sourceRef) || 'journal',
                    authors,
                    hadAuthorEtal
                });
                if (tracked.missing) {
                    return this.attachMixedCitationResult({
                        refNode: clone,
                        html: clone.outerHTML,
                        preview: this.buildReferencePreview(state),
                        changed: false,
                        reason: 'track-missing',
                        state
                    });
                }
                this.appendRemovedContributorRows(rebuiltMixed, sourceRef, {
                    authors,
                    editors,
                    refType: state.refType || this.getRefType(sourceRef) || 'journal',
                    delimiters: this.getOperationDelimiters(state),
                    delimitersLast: this.getOperationDelimitersLast(state)
                });
                while (mixed.firstChild) mixed.removeChild(mixed.firstChild);
                while (rebuiltMixed.firstChild) mixed.appendChild(rebuiltMixed.firstChild);
                changed = mixed.innerHTML !== beforeHtml;
            }
        } else {
            if (authors.length === 1) {
                values.surname = authors[0].surname;
                values['given-names'] = authors[0].givenname;
            }
            fields.forEach((field) => {
                if (!field || !field.token || field.token === 'etal') return;
                if (this.authorPersonGroupTokens.has(field.token) &&
                    field.formatMode !== 'plain-inline-font') return;
                const value = this.resolveFieldValue(field, values);
                const newValue = this.valueForLeafWrite(field.token, value);
                let leaf = this.findLeafForToken(mixed, field.token);
                if (!leaf && this.hasLeafWriteContent(field.token, newValue)) {
                    leaf = this.createLeafNode(field, newValue, {
                        track: false,
                        isUpdate: true,
                        ownerDocument: mixed.ownerDocument || clone.ownerDocument,
                        refType: state.refType || this.getRefType(sourceRef) || 'journal'
                    });
                    mixed.appendChild(leaf);
                } else if (leaf) {
                    const rich = this.isRichLeafToken(field.token);
                    while (leaf.firstChild) leaf.removeChild(leaf.firstChild);
                    this.writeLeafValue(leaf, field, newValue, {
                        rich
                    });
                }
            });
            const tracked = this.runApplyUpdate('edit', {
                mixed,
                source: sourceRef,
                fields,
                values,
                originalValues: this.getOperationOriginalValues(state),
                originalInlineFormats: this.getOperationOriginalInlineFormats(state),
                refType: state.refType || this.getRefType(sourceRef) || 'journal',
                authors,
                hadAuthorEtal
            });
            if (tracked.missing) {
                return this.attachMixedCitationResult({
                    refNode: clone,
                    html: clone.outerHTML,
                    preview: this.buildReferencePreview(state),
                    changed: false,
                    reason: 'track-missing',
                    state
                });
            }
            const citationEl = sourceRef.querySelector('.mixed-citation');
            changed = !!tracked.changed || (mixed && citationEl && mixed.innerHTML !== citationEl.innerHTML);

        }

        return this.attachMixedCitationResult({
            refNode: clone,
            html: clone.outerHTML,
            preview: this.buildReferencePreview(state),
            changed,
            state
        });
    }

    buildQueryReferenceDom(payloadOrState = {}, options = {}) {
        const state = payloadOrState.fields ?
            this.mergeAuthorsIntoState(payloadOrState) :
            this.stateFromPayload(payloadOrState, {
                ...options,
                mode: 'query',
                refNode: options.refNode || payloadOrState.refNode || payloadOrState.ref
            });
        const sourceRef = this.unwrapNode(state.refNode || state.ref);
        if (!sourceRef || !sourceRef.querySelector) {
            return this.attachMixedCitationResult({
                refNode: null,
                html: '',
                preview: '',
                changed: false,
                reason: 'ref-missing'
            });
        }

        const fields = this.getOperationFields(state, {
            includePersonGroupLeaves: true
        });
        const values = this.getOperationValues(state);
        // A missing author's surname/given-names is flagged on `fields` via the plain scalar
        // tokens 'surname'/'given-names' (unlike editor/translator, author has no group-level
        // missing token) -- but those values live in state.authors[0], never in state.values, so
        // the hasMissingValue check below would never see a newly-filled author name without this
        // derivation. Mirrors the equivalent single-author special case in buildEditReferenceDom.
        if (Array.isArray(state.authors) && state.authors[0]) {
            if (!this.normalizeSpace(values.surname)) values.surname = state.authors[0].surname;
            if (!this.normalizeSpace(values['given-names'])) values['given-names'] = state.authors[0].givenname;
        }
        const hasMissingValue = fields.some((field) => field.missing && this.normalizeSpace(values[field.token]));
        // A missing editor/translator is flagged on `fields` as a group-level token
        // ('editor'/'translator'), not a scalar value -- the fill lives in
        // state.editors/translators, not state.values, so hasMissingValue above never sees it.
        // Without this check, filling in a query-flagged-missing contributor group always looked
        // like "nothing changed" and the fill was silently discarded. Author has no group-level
        // missing token today (see the separate values.surname/['given-names'] derivation above,
        // which covers the scalar-token case instead) -- 'author' is kept here defensively in
        // case a future missingTextMap pattern ever maps to it directly.
        const contributorRoleKeys = {
            author: 'authors',
            editor: 'editors',
            translator: 'translators'
        };
        const missingContributorRoleFilled = fields.some((field) => {
            if (!field.missing) return false;
            const roleKey = contributorRoleKeys[field.token];
            if (!roleKey) return false;
            const list = Array.isArray(state[roleKey]) ? state[roleKey] : [];
            return list.some((person) =>
                this.normalizeSpace(person && person.surname) || this.normalizeSpace(person && person.givenname));
        });
        const clone = sourceRef.cloneNode(true);
        const mixed = clone.querySelector('.mixed-citation');
        if (!mixed) {
            return this.attachMixedCitationResult({
                refNode: clone,
                html: clone.outerHTML,
                preview: this.buildReferencePreview(state),
                changed: false,
                reason: 'mixed-citation-missing'
            });
        }
        if (!hasMissingValue && !missingContributorRoleFilled && !this.authorEtalUnchecked(sourceRef, values)) {
            return this.attachMixedCitationResult({
                refNode: clone,
                html: clone.outerHTML,
                preview: this.buildReferencePreview(state),
                changed: false,
                state
            });
        }

        const sourceAuthorNames = this.syncAuthorPersonGroupOriginalsFromSource(sourceRef, state);
        state.hadAuthorEtal = sourceAuthorNames.hadAuthorEtal;
        state.hadAuthorSurname = sourceAuthorNames.hadAuthorSurname;
        state.hadAuthorGiven = sourceAuthorNames.hadAuthorGiven;
        while (mixed.firstChild) mixed.removeChild(mixed.firstChild);
        this.appendContentToMixed(mixed, state, {
            trackNew: false,
            isUpdate: true,
            ownerDocument: mixed.ownerDocument
        });
        const authors = (state.authors || []).filter((author) =>
            this.normalizeSpace(author.surname) || this.normalizeSpace(author.givenname)
        );
        const editors = (state.editors || []).filter((editor) =>
            this.normalizeSpace(editor.surname) || this.normalizeSpace(editor.givenname)
        );
        this.applyContributorTracking(mixed, sourceRef, {
            authors,
            editors,
            mode: 'query'
        });
        const tracked = this.runApplyUpdate('query', {
            mixed,
            source: sourceRef,
            fields,
            values,
            originalValues: this.getOperationOriginalValues(state),
            originalInlineFormats: this.getOperationOriginalInlineFormats(state),
            refType: state.refType || this.getRefType(sourceRef) || 'journal',
            authors,
            hadAuthorEtal: state.hadAuthorEtal
        });
        if (tracked.missing) {
            return this.attachMixedCitationResult({
                refNode: clone,
                html: clone.outerHTML,
                preview: this.buildReferencePreview(state),
                changed: false,
                reason: 'track-missing',
                state
            });
        }
        this.appendRemovedContributorRows(mixed, sourceRef, {
            authors,
            editors,
            refType: state.refType || this.getRefType(sourceRef) || 'journal',
            delimiters: this.getOperationDelimiters(state),
            delimitersLast: this.getOperationDelimitersLast(state)
        });

        return this.attachMixedCitationResult({
            refNode: clone,
            html: clone.outerHTML,
            preview: this.buildReferencePreview(state),
            changed: true,
            state
        });
    }

    mergeAuthorsIntoState(state = {}) {
        const authors = this.normalizeAuthors(
            state.authors || (state.payload && (state.payload.author || state.payload.authors)) || []
        );
        const editors = this.normalizeAuthors(
            state.editors || (state.payload && (state.payload.editor || state.payload.editors)) || []
        );
        const translators = this.normalizeAuthors(
            state.translators ||
            (state.payload && (state.payload.translator || state.payload.translators)) || []
        );
        return {
            ...state,
            authors,
            editors,
            translators
        };
    }

    buildReferenceDom(state = {}, options = {}) {
        const ownerDocument = options.ownerDocument ||
            (options.refList && options.refList.ownerDocument) ||
            (typeof document !== 'undefined' ? document : null);
        if (!ownerDocument) {
            return this.attachMixedCitationResult({
                refNode: null,
                reason: 'document-missing'
            });
        }

        const donorRef = this.unwrapNode(options.cloneFrom || options.refNode || options.ref);
        const donorMixed = this.unwrapNode(options.mixedCitation) || (donorRef && donorRef.querySelector ? donorRef.querySelector('.mixed-citation') : null);
        const rid = options.rid || (donorRef && donorRef.id) || 'CIT0001';
        const insertMethod = this.normalizeReferenceInsertMethod(state.insertMethod || options.insertMethod);
        const ref = this.createNewReferenceElement(ownerDocument, {
            rid,
            insertMethod
        });
        if (!ref) {
            return this.attachMixedCitationResult({
                refNode: null,
                reason: 'document-missing'
            });
        }
        const mixed = this.createReferenceNode(ownerDocument, 'span', {
            class: 'mixed-citation',
            'data-name': 'mixed-citation'
        });
        if (!mixed) {
            return this.attachMixedCitationResult({
                refNode: null,
                reason: 'document-missing'
            });
        }

        this.copySafeAttributes(donorRef, ref, {
            preserveClass: false,
            skip: ['class', 'data-name', 'data-role', 'data-new', 'data-ins-type']
        });
        ref.className = 'ref';

        this.copySafeAttributes(donorMixed, mixed, {
            preserveClass: false,
            skip: ['class', 'data-name', 'publication-type']
        });
        mixed.className = 'mixed-citation';
        if (!mixed.getAttribute('data-name')) mixed.setAttribute('data-name', 'mixed-citation');
        mixed.setAttribute(
            'publication-type',
            state.refType || (state.template && state.template.refType) || 'journal'
        );
        this.appendContentToMixed(mixed, state, {
            trackNew: !!options.trackNew,
            ownerDocument,
            isUpdate: !!options.isUpdate
        });
        if (state.mode === 'insert' && !options.isUpdate) {
            const insertWrap = this.getInsertWrapper(ownerDocument);
            insertWrap.appendChild(mixed);
            ref.appendChild(insertWrap);
        } else {
            ref.appendChild(mixed);
        }

        return this.attachMixedCitationResult({
            refNode: ref
        });
    }

    normalizeReferenceInsertMethod(method) {
        const value = this.normalizeSpace(method);
        return ['doi_form', 'plain_text', 'open_form'].includes(value) ? value : '';
    }

    getInsertWrapper(ownerDocument) {
        const doc = ownerDocument || (typeof document !== 'undefined' ? document : null);
        const root = this.globalObject || (typeof window !== 'undefined' ? window : globalThis);
        const trackManager = (typeof window !== 'undefined' && window._trackManager) ||
            (root && root._trackManager) ||
            (typeof window !== 'undefined' && window.Trackchangeapi) ||
            (root && root.Trackchangeapi);

        if (trackManager && typeof trackManager.getInsNode === 'function') {
            try {
                const node = trackManager.getInsNode(null, {
                    setAttrParams: {
                        'data-track-code': 'ref-01'
                    }
                });
                if (node) return node;
            } catch (err) {
                /* fall back to a minimal wrapper */
            }
        }

        const node = doc.createElement('insert');
        node.setAttribute('data-track-code', 'ref-01');
        return node;
    }

    appendContentToMixed(mixed, state = {}, options = {}) {
        const authors = (state.authors || []).filter((author) =>
            this.normalizeSpace(author.surname) || this.normalizeSpace(author.givenname)
        );
        const editors = (state.editors || []).filter((editor) =>
            this.normalizeSpace(editor.surname) || this.normalizeSpace(editor.givenname)
        );
        const translators = (state.translators || []).filter((person) =>
            this.normalizeSpace(person.surname) || this.normalizeSpace(person.givenname)
        );
        const fields = this.getOperationFields(state);
        const delimiters = this.getOperationDelimiters(state);
        const delimitersLast = this.getOperationDelimitersLast(state);
        const refType = state.refType || (state.template && state.template.refType) || 'journal';
        const values = this.applyReferenceAbbreviationOutput(
            this.getOperationValues(state),
            state.template || state,
            refType
        );
        const slots = this.planCitationSlots(fields, values, delimiters, {
            authors,
            editors,
            translators,
            refType,
            forceEtal: !!this.normalizeSpace(values.etal),
            hadAuthorEtal: !!state.hadAuthorEtal,
            hadAuthorSurname: !!state.hadAuthorSurname,
            hadAuthorGiven: !!state.hadAuthorGiven,
            fields,
            groupSlots: state.groupSlots || (state.template && state.template.groupSlots) || []
        }, {
            ...options,
            refType,
            delimitersLast,
            slotOrder: state.slotOrder || (state.template && state.template.slotOrder) || [],
            fields
        });
        this.renderCitationSlots(mixed, slots, delimiters, {
            ...options,
            delimitersLast,
            refType
        });
    }

    // Token -> config-declared styleId, for the one active CEG style. Document-sourced fields
    // (built by buildDocumentLeafField) only ever carry their bare token as styleId (e.g. 'fpage',
    // not '‡ref_pageLast'), because the document side has no idea which CEG style slot a leaf
    // corresponds to. Delimiter lookups need the real style id on *both* sides of a boundary to
    // ever hit a style-keyed <element first=".." next=".." delim=".."> entry instead of silently
    // falling back to the (possibly ambiguous, see below) token-keyed one.
    getConfigStyleIdForToken(refType, token) {
        if (!token) return '';
        const configTemplate = this.getConfigTemplate(refType);
        const field = (configTemplate.fields || []).find((candidate) => candidate.token === token);
        return field ? field.styleId : '';
    }

    // CMS-18 (and similar) CEG "order" configs list ‡ref_idDOI and ‡ref_URL as separate style
    // slots. Dialog path maps ‡ref_idDOI → token `doi` and ‡ref_URL → `ext-link` so both can
    // round-trip. resolveFieldStyleId still picks style from value shape when a shared link
    // token carries either form (legacy / mergeTemplateSources). For every other token, fall
    // back to the config-declared styleId (see getConfigStyleIdForToken) when the field's own
    // styleId is just its bare token -- otherwise a document-sourced neighbor field (e.g.
    // 'fpage' next to an ext-link) never resolves a real styleId, and resolveDelimiter() falls
    // through to the token-keyed table, which is exactly the ambiguous one dual idDOI/URL
    // entries collide on.
    // ? books full DOI url (tnf uri); journals pub-id - 18_SEP_26_DR
    resolveFieldStyleId(field = {}, value, refType = 'journal') {
        if (!field) return undefined;
        if (this.isLinkFieldToken(field.token)) {
            const descriptor = this.resolveReferenceLinkField({
                value,
                element: field.element,
                expectedType: field.token,
                isJournal: refType === 'journal'
            });
            if (!descriptor || !descriptor.value) return field.styleId;
            if (descriptor.token === 'doi') return '‡ref_idDOI';
            if (descriptor.token === 'ext-link') return '‡ref_URL';
            return field.styleId;
        }
        if (field.styleId && String(field.styleId).charAt(0) === '‡') return field.styleId;
        return this.getConfigStyleIdForToken(refType, field.token) || field.styleId;
    }

    planFlatCitationSlots(fields = [], values = {}, delimiters = {}, options = {}) {
        const doc = options.ownerDocument || (typeof document !== 'undefined' ? document : null);
        const refType = options.refType || 'journal';
        const orderFor = this.createSlotOrderResolver(options.slotOrder || []);
        const visibleFields = fields
            .slice()
            .sort((a, b) => orderFor(a) - orderFor(b))
            .filter((field) => this.normalizeSpace(this.resolveFieldValue(field, values)));

        return visibleFields.map((field) => {
            const value = this.resolveFieldValue(field, values);
            return {
                kind: 'field',
                token: field.token,
                styleId: this.resolveFieldStyleId(field, value, refType),
                node: this.createLeafNode(field, value, {
                    track: this.shouldTrackNewLeaf(field, {
                        ...options,
                        currentValue: value
                    }),
                    ownerDocument: doc,
                    refType,
                    href: field.token === 'ext-link' ? value : undefined,
                    isUpdate: !!options.isUpdate
                })
            };
        });
    }

    styleHasEditorSlot(groupSlots = []) {
        return (Array.isArray(groupSlots) ? groupSlots : []).some((slot) => slot && slot.token === 'editor');
    }

    placeEditorGroupAfterAuthor(emitted = [], options = {}) {
        if (!emitted || !emitted.length || options.styleHasEditorSlot) return emitted;
        const editorIndex = emitted.findIndex((slot) => slot && slot.kind === 'person-group' && slot.token === 'editor');
        const authorIndex = emitted.findIndex((slot) => slot && slot.kind === 'person-group' && slot.token === 'author');
        if (editorIndex < 0 || authorIndex < 0 || editorIndex === authorIndex + 1) return emitted;
        const [editorSlot] = emitted.splice(editorIndex, 1);
        const nextAuthorIndex = emitted.findIndex((slot) => slot && slot.kind === 'person-group' && slot.token === 'author');
        emitted.splice(nextAuthorIndex + 1, 0, editorSlot);
        return emitted;
    }

    getContributorGroupSlots(fields = [], contributors = {}, options = {}) {
        const configured = options.groupSlots || contributors.groupSlots || [];
        const slotOrder = this.getSlotOrderMap(options.slotOrder || contributors.slotOrder || []);
        const out = [];
        const seen = new Set();
        const add = (slot) => {
            if (!slot || !slot.token || seen.has(slot.token)) return;
            seen.add(slot.token);
            const configuredSlot = slotOrder.get(slot.token);
            out.push({
                token: slot.token,
                styleId: (configuredSlot && configuredSlot.styleId) || slot.styleId || slot.token,
                order: configuredSlot && configuredSlot.order != null ?
                    configuredSlot.order : (slot.order != null ? slot.order : this.getFieldOrder(slot.token)),
                source: slot.source || 'fallback'
            });
        };

        configured.forEach(add);

        const infer = (token, matcher) => {
            if (seen.has(token)) return;
            const matchingFields = fields.filter(matcher);
            if (!matchingFields.length) return;
            const order = Math.min(...matchingFields.map((field) => this.getFieldOrder(field.token, field.groupOrder != null ? field.groupOrder : field.order)));
            add({
                token,
                styleId: token,
                order,
                source: 'fallback'
            });
        };

        infer('author', (field) => this.authorPersonGroupTokens.has(field.token));
        infer('editor', (field) => this.editorFieldTokens.has(field.token));
        infer('translator', (field) => this.translatorFieldTokens.has(field.token));

        // People arrays drive groups; do not require surname/given-names field objects for anchors.
        if ((contributors.authors || []).length) {
            add({
                token: 'author',
                styleId: 'author',
                order: 0,
                source: 'people'
            });
        }
        if ((contributors.editors || []).length) {
            add({
                token: 'editor',
                styleId: 'editor',
                order: 0,
                source: 'people'
            });
        }
        if ((contributors.translators || []).length) {
            add({
                token: 'translator',
                styleId: 'translator',
                order: 0,
                source: 'people'
            });
        }

        return out.sort((a, b) => this.getFieldOrder(a.token, a.order) - this.getFieldOrder(b.token, b.order));
    }

    getSlotOrderMap(slotOrder = []) {
        const map = new Map();
        (Array.isArray(slotOrder) ? slotOrder : []).forEach((slot) => {
            if (!slot || !slot.token || map.has(slot.token)) return;
            map.set(slot.token, slot);
        });
        return map;
    }

    createSlotOrderResolver(slotOrder = []) {
        const slotOrderMap = this.getSlotOrderMap(slotOrder);
        return (item = {}) => {
            const configuredSlot = slotOrderMap.get(item.token);
            if (configuredSlot && configuredSlot.order != null) return configuredSlot.order;
            return this.getFieldOrder(item.token, item.order);
        };
    }

    planCitationSlots(fields = [], values = {}, delimiters = {}, contributors = {}, options = {}) {
        const authors = contributors.authors || [];
        const editors = contributors.editors || [];
        const translators = contributors.translators || [];
        const hasContributors = authors.length > 0 || editors.length > 0 || translators.length > 0;

        if (!hasContributors) {
            return this.planFlatCitationSlots(fields, values, delimiters, options);
        }

        const doc = options.ownerDocument || (typeof document !== 'undefined' ? document : null);
        const refType = contributors.refType || 'journal';
        const delimitersLast = options.delimitersLast || {};
        const orderFor = this.createSlotOrderResolver(options.slotOrder || contributors.slotOrder || []);
        const groupSlots = this.getContributorGroupSlots(fields, contributors, options);
        const groupAnchors = groupSlots.filter((slot) => (slot.token === 'author' && authors.length) || (slot.token === 'editor' && editors.length) || (slot.token === 'translator' && translators.length))
            .map((slot) => ({
                ...slot,
                kind: 'group-anchor'
            }));
        const sorted = fields
            .slice()
            .concat(groupAnchors)
            .sort((a, b) => {
                const ao = orderFor(a);
                const bo = orderFor(b);
                if (ao !== bo) return ao - bo;
                if (a.kind === 'group-anchor' && b.kind !== 'group-anchor') return -1;
                if (b.kind === 'group-anchor' && a.kind !== 'group-anchor') return 1;
                return 0;
            });
        const emitted = [];
        let authorGroupEmitted = false;
        let authorGroupHasEtal = false;
        let editorGroupEmitted = false;
        let translatorGroupEmitted = false;

        const pushAuthorGroup = () => {
            if (authorGroupEmitted || !authors.length) return;
            authorGroupEmitted = true;
            const node = this.buildContributorPersonGroup(authors, 'author', refType, {
                ownerDocument: doc,
                track: !!options.trackNew && !options.isUpdate,
                trackNew: !!options.trackNew,
                isUpdate: !!options.isUpdate,
                forceEtal: contributors.forceEtal,
                hadAuthorEtal: !!contributors.hadAuthorEtal,
                hadAuthorSurname: !!contributors.hadAuthorSurname,
                hadAuthorGiven: !!contributors.hadAuthorGiven,
                fields: options.fields || contributors.fields || fields,
                delimiters,
                delimitersLast
            });
            authorGroupHasEtal = !!(node.querySelector && node.querySelector('.etal'));
            emitted.push({
                kind: 'person-group',
                token: 'author',
                styleId: 'author',
                node
            });
        };

        const pushEditorGroup = () => {
            if (editorGroupEmitted || !editors.length) return;
            editorGroupEmitted = true;
            emitted.push({
                kind: 'person-group',
                token: 'editor',
                styleId: 'editor',
                node: this.buildContributorPersonGroup(editors, 'editor', refType, {
                    ownerDocument: doc,
                    track: !!options.trackNew && !options.isUpdate,
                    trackNew: !!options.trackNew,
                    isUpdate: !!options.isUpdate,
                    fields: options.fields || contributors.fields || fields,
                    delimiters,
                    delimitersLast
                })
            });
        };

        const pushTranslatorGroup = () => {
            if (translatorGroupEmitted || !translators.length) return;
            translatorGroupEmitted = true;
            emitted.push({
                kind: 'person-group',
                token: 'translator',
                styleId: 'translator',
                node: this.buildContributorPersonGroup(translators, 'translator', refType, {
                    ownerDocument: doc,
                    track: !!options.trackNew && !options.isUpdate,
                    trackNew: !!options.trackNew,
                    isUpdate: !!options.isUpdate,
                    fields: options.fields || contributors.fields || fields,
                    delimiters,
                    delimitersLast
                })
            });
        };

        sorted.forEach((field) => {
            if (field.kind === 'group-anchor') {
                if (field.token === 'author') pushAuthorGroup();
                if (field.token === 'editor') pushEditorGroup();
                if (field.token === 'translator') pushTranslatorGroup();
                return;
            }
            if (this.authorPersonGroupTokens.has(field.token)) {
                pushAuthorGroup();
                return;
            }
            if (field.token === 'etal') {
                const standaloneEtal = this.normalizeSpace(values.etal != null ? values.etal : field.value);
                if (authorGroupHasEtal || (contributors.forceEtal && authorGroupEmitted)) {
                    emitted.push({
                        kind: 'etal-slot',
                        token: 'etal',
                        styleId: field.styleId || '‡ref_etal',
                        node: null
                    });
                    return;
                }
                if (standaloneEtal) {
                    emitted.push({
                        kind: 'field',
                        token: 'etal',
                        styleId: field.styleId || '‡ref_etal',
                        node: this.createLeafNode(field, standaloneEtal, {
                            track: this.shouldTrackNewLeaf(field, {
                                ...options,
                                currentValue: standaloneEtal
                            }),
                            ownerDocument: doc,
                            refType,
                            isUpdate: !!options.isUpdate
                        })
                    });
                }
                return;
            }
            if (field.token === 'collab') {
                const value = values.collab != null ? values.collab : field.value;
                if (!this.normalizeSpace(value)) return;
                emitted.push({
                    kind: 'field',
                    token: 'collab',
                    styleId: field.styleId || '‡ref_auCollab',
                    node: this.createLeafNode(field, value, {
                        track: this.shouldTrackNewLeaf(field, {
                            ...options,
                            currentValue: value
                        }),
                        ownerDocument: doc,
                        refType,
                        isUpdate: !!options.isUpdate
                    })
                });
                return;
            }
            if (this.editorFieldTokens.has(field.token)) {
                pushEditorGroup();
                return;
            }
            if (this.translatorFieldTokens.has(field.token)) {
                pushTranslatorGroup();
                return;
            }
            const value = this.resolveFieldValue(field, values);
            if (!this.normalizeSpace(value)) return;
            emitted.push({
                kind: 'field',
                token: field.token,
                styleId: this.resolveFieldStyleId(field, value, refType),
                node: this.createLeafNode(field, value, {
                    track: this.shouldTrackNewLeaf(field, {
                        ...options,
                        currentValue: value
                    }),
                    ownerDocument: doc,
                    refType,
                    isUpdate: !!options.isUpdate
                })
            });
        });

        if (!authorGroupEmitted && authors.length) {
            pushAuthorGroup();
        }
        if (!editorGroupEmitted && editors.length) pushEditorGroup();
        if (!translatorGroupEmitted && translators.length) pushTranslatorGroup();
        this.placeEditorGroupAfterAuthor(emitted, {
            styleHasEditorSlot: this.styleHasEditorSlot(options.groupSlots || contributors.groupSlots || [])
        });

        return emitted;
    }

    // A leaf/group's own trailing text (e.g. an abbreviated given-name "R.") can already end in a
    // period; if the resolved delimiter that follows it also starts with one, the two would
    // concatenate literally into "R..". The element's period is data and must survive; the
    // delimiter's is style punctuation and is redundant once the element already terminates the
    // sentence, so drop only the delimiter's leading dot.
    collapseRedundantDelimiterDot(delim, precedingNode) {
        if (!delim || delim.charAt(0) !== '.' || !precedingNode) return delim;
        const text = precedingNode.textContent || '';
        return /\.\s*$/.test(text) ? delim.slice(1) : delim;
    }

    collapseRedundantDelimiterPrefix(delim, next) {
        if (!delim || !next || !next.node) return delim;
        const displayValue = String(next.node.textContent || '').trim();
        if (!displayValue) return delim;
        const limit = Math.min(delim.length, displayValue.length);
        for (let length = limit; length >= 4; length -= 1) {
            const suffix = delim.slice(-length);
            if (!/[A-Za-z0-9]/.test(suffix)) continue;
            if (suffix.toLowerCase() === displayValue.slice(0, length).toLowerCase()) {
                return delim.slice(0, -length);
            }
        }
        return delim;
    }

    renderCitationSlots(mixed, slots = [], delimiters = {}, options = {}) {
        const doc = options.ownerDocument || mixed.ownerDocument ||
            (typeof document !== 'undefined' ? document : null);
        const delimitersLast = options.delimitersLast || {};
        const refType = options.refType || 'journal';
        if (!mixed || !doc) return;

        slots.forEach((item, index) => {
            const wrapRule = item.node ? this.getPunctuationRule(refType, item.styleId) : null;
            const alreadyPresent = wrapRule ? this.isPunctuationAlreadyPresent(item.node, wrapRule) : {
                before: false,
                after: false
            };
            const rawText = item.node && wrapRule ? this.getLeafRawText(item.node, wrapRule) : '';
            const effectiveAddAfter = wrapRule ? this.getEffectiveAddAfter(wrapRule, rawText) : '';
            if (wrapRule && wrapRule.addBefore && !alreadyPresent.before) {
                mixed.appendChild(doc.createTextNode(wrapRule.addBefore));
            }
            if (item.node) mixed.appendChild(item.node);
            if (effectiveAddAfter && !alreadyPresent.after) {
                mixed.appendChild(doc.createTextNode(effectiveAddAfter));
            }
            const next = slots[index + 1];
            if (!next) {
                const terminalDelim = this.collapseRedundantDelimiterDot(
                    this.resolveDelimiter(item.token, '', delimiters, item.styleId, ''),
                    item.node
                );
                if (terminalDelim) mixed.appendChild(doc.createTextNode(terminalDelim));
                return;
            }
            if (next.kind === 'etal-slot') return;

            let delim = '';
            if (item.kind === 'person-group') {
                delim = this.resolveAfterContributorGroupDelimiter(
                    item.token,
                    next.token,
                    next.styleId,
                    delimiters,
                    refType
                );
            } else if (next.kind === 'person-group') {
                delim = this.resolveBeforeContributorGroupDelimiter(
                    item.token,
                    item.styleId,
                    next.token,
                    delimiters,
                    refType
                );
            } else {
                delim = this.resolveDelimiter(item.token, next.token, delimiters, item.styleId, next.styleId);
            }
            delim = this.collapseRedundantDelimiterDot(delim, item.node);
            delim = this.collapseRedundantDelimiterPrefix(delim, next);
            mixed.appendChild(doc.createTextNode(delim));
        });
    }

    appendFieldsWithPersonGroup(mixed, fields = [], values = {}, delimiters = {}, contributors = {}, options = {}) {
        const slots = this.planCitationSlots(fields, values, delimiters, contributors, options);
        this.renderCitationSlots(mixed, slots, delimiters, options);
    }

    buildContributorPersonGroup(people = [], groupType = 'author', refType = 'journal', options = {}) {
        const ctx = this.resolveContributorGroupContext(
            refType,
            groupType,
            options.delimiters || {},
            options.delimitersLast || {}
        );
        const fields = options.fields || [];
        const etalField = this.findOperationFieldByToken(fields, 'etal');
        const sourceEtalText = this.normalizeSpace(etalField && etalField.original) || 'et al.';
        const etalDelim = this.resolveDelimiter(
            groupType,
            'etal',
            ctx.delimiters,
            groupType,
            ctx.trim.style || '‡ref_etal'
        ) || ctx.trim.delim || ', ';

        // Edit/query: emit plain authors (and etal shell). applyUpdate owns insert/del.
        if (options.isUpdate && groupType === 'author') {
            const trimDecision = this.track && typeof this.track.decideTrimTrack === 'function' ?
                this.track.decideTrimTrack({
                    authors: people,
                    trim: this.getContributorTrim(refType, 'author')
                }) : {
                    omitted: [],
                    etalText: ''
                };
            let etalText = null;
            if (options.forceEtal || options.hadAuthorEtal) {
                etalText = sourceEtalText;
            } else if (trimDecision.etalText) {
                etalText = trimDecision.etalText;
            }
            return this.createPersonGroup(people, {
                ctx,
                ownerDocument: options.ownerDocument,
                track: false,
                trackSurname: false,
                trackGiven: false,
                trackEtal: false,
                etal: etalText,
                delEtal: '',
                etalDelim,
                omittedAuthors: []
            });
        }

        let trimDecision = {
            visible: people,
            omitted: [],
            etalText: '',
            trackEtalInsert: false
        };
        const peopleForGroup = people;
        const applied = this.applyContributorTrim(peopleForGroup, ctx.trim, {
            forceEtal: groupType === 'author' && !!options.forceEtal
        });
        const trackOpts = {
            trackNew: !!options.trackNew,
            isUpdate: !!options.isUpdate
        };
        let trackEtal;
        if (options.trackEtal != null) {
            trackEtal = !!options.trackEtal;
        } else {
            trackEtal = !!options.trackNew && (
                !options.isUpdate ||
                (!!applied.etalText && !options.hadAuthorEtal)
            );
            trackEtal = trackEtal || !!options.track;
        }

        const surnameToken = groupType === 'author' ? 'surname' :
            groupType === 'editor' ? 'editor-surname' : 'translator-surname';
        const givenToken = groupType === 'author' ? 'given-names' :
            groupType === 'editor' ? 'editor-given-names' : 'translator-given-names';
        const surnameField = this.findOperationFieldByToken(fields, surnameToken);
        const givenField = this.findOperationFieldByToken(fields, givenToken);
        const etalText = trimDecision.etalText || applied.etalText || null;
        const trackSurname = !!options.track || (
            !!options.isUpdate &&
            !!surnameField &&
            this.shouldTrackNewLeaf(surnameField, trackOpts) &&
            (groupType !== 'author' || !options.hadAuthorSurname)
        );
        const trackGiven = !!options.track || (
            !!options.isUpdate &&
            !!givenField &&
            this.shouldTrackNewLeaf(givenField, trackOpts) &&
            (groupType !== 'author' || !options.hadAuthorGiven)
        );

        return this.createPersonGroup(applied.visiblePeople, {
            ctx,
            ownerDocument: options.ownerDocument,
            track: options.track,
            trackSurname,
            trackGiven,
            trackEtal,
            etal: etalText,
            delEtal: '',
            etalDelim,
            omittedAuthors: trimDecision.omitted
        });
    }

    createPersonGroup(people = [], options = {}) {
        const doc = options.ownerDocument || (typeof document !== 'undefined' ? document : null);
        const ctx = options.ctx || this.resolveContributorGroupContext('journal', 'author', {}, {});
        const groupType = ctx.groupType || 'author';
        const nameOrder = ctx.nameOrder || {
            first: ['surname', 'givenname'],
            rest: ['surname', 'givenname']
        };
        const group = doc.createElement('span');
        group.className = 'person-group';
        group.setAttribute('data-name', 'person-group');
        group.setAttribute('person-group-type', groupType);

        const partToLeafToken = (part) => {
            if (part === 'givenname') return 'given-names';
            if (part === 'surname') return 'surname';
            return part;
        };

        const lookupInnerDelim = (prevPart, nextPart) => {
            const firstStyleId = ctx.styleIds[prevPart];
            const nextStyleId = ctx.styleIds[nextPart];
            if (firstStyleId && nextStyleId) {
                const styleKey = `${firstStyleId}->${nextStyleId}`;
                if (Object.prototype.hasOwnProperty.call(ctx.delimiters, styleKey)) {
                    return ctx.delimiters[styleKey];
                }
            }
            const firstToken = partToLeafToken(prevPart);
            const nextToken = partToLeafToken(nextPart);
            const tokenKey = `${firstToken}->${nextToken}`;
            if (Object.prototype.hasOwnProperty.call(ctx.delimiters, tokenKey)) {
                return ctx.delimiters[tokenKey];
            }
            return prevPart === 'givenname' || nextPart === 'givenname' ? ' ' : ', ';
        };

        const lookupInterDelim = (isBeforeLast) => this.resolveContributorInterDelim(ctx, isBeforeLast);

        people.forEach((person, index) => {
            const stringName = doc.createElement('span');
            stringName.className = 'string-name';
            stringName.setAttribute('data-name', 'string-name');

            const order = index === 0 ? nameOrder.first : nameOrder.rest;
            const parts = [];
            order.forEach((part) => {
                if (part === 'surname' && person.surname) {
                    parts.push({
                        part: 'surname',
                        value: person.surname
                    });
                }
                if (part === 'givenname' && person.givenname) {
                    parts.push({
                        part: 'givenname',
                        value: person.givenname
                    });
                }
                if (part === 'suffix' && person.suffix) {
                    parts.push({
                        part: 'suffix',
                        value: person.suffix
                    });
                }
            });

            if (!parts.length) {
                if (person.surname) parts.push({
                    part: 'surname',
                    value: person.surname
                });
                if (person.givenname) parts.push({
                    part: 'givenname',
                    value: person.givenname
                });
            }

            parts.forEach((part, partIndex) => {
                if (partIndex > 0) {
                    const sep = lookupInnerDelim(parts[partIndex - 1].part, part.part);
                    if (sep) stringName.appendChild(doc.createTextNode(sep));
                }
                let trackPart = !!options.track;
                if (index === 0 && !options.track) {
                    if (part.part === 'givenname' && options.trackGiven != null) {
                        trackPart = !!options.trackGiven;
                    } else if (part.part === 'surname' && options.trackSurname != null) {
                        trackPart = !!options.trackSurname;
                    }
                }
                stringName.appendChild(this.createLeafNode({
                    token: partToLeafToken(part.part),
                    formatMode: part.part === 'surname' ? person.formatModeSurname : (part.part === 'givenname' ? person.formatModeGiven : undefined),
                    inlineFormat: part.part === 'surname' ? person.inlineFormatSurname : (part.part === 'givenname' ? person.inlineFormatGiven : undefined)
                }, part.value, {
                    track: trackPart,
                    ownerDocument: doc
                }));
            });

            group.appendChild(stringName);
            if (index < people.length - 1) {
                const sep = lookupInterDelim(index + 2 === people.length);
                if (sep) group.appendChild(doc.createTextNode(sep));
            }
        });

        const omittedAuthors = Array.isArray(options.omittedAuthors) ? options.omittedAuthors : [];
        omittedAuthors.forEach((person, omittedIndex) => {
            if (people.length || omittedIndex > 0) {
                const sep = lookupInterDelim(false);
                if (sep) group.appendChild(doc.createTextNode(sep));
            }
            this.appendDelOnlyStringName(group, person, doc);
        });

        if (options.etal) {
            let delim = options.etalDelim != null ? options.etalDelim : ' ';
            if (this.isOupClient() && delim && delim.startsWith('.')) {
                const piSpan = doc.createElement('span');
                piSpan.className = 'etal-pi';
                piSpan.setAttribute('data-name', 'etal-pi');
                if (group.lastElementChild) {
                    group.lastElementChild.appendChild(piSpan);
                }
                delim = delim.substring(1);
            }
            if (delim) group.appendChild(doc.createTextNode(delim));
            group.appendChild(this.createLeafNode({
                token: 'etal'
            }, options.etal === true ? 'et al.' : options.etal, {
                track: !!(options.trackEtal != null ? options.trackEtal : options.track),
                ownerDocument: doc
            }));
        } else if (options.delEtal) {
            const delim = options.etalDelim != null ? options.etalDelim : ' ';
            if (delim) group.appendChild(doc.createTextNode(delim));
            const leaf = this.createLeafNode({
                token: 'etal'
            }, '', {
                ownerDocument: doc
            });
            while (leaf.firstChild) leaf.removeChild(leaf.firstChild);
            leaf.appendChild(this.createTrackNode('del', options.delEtal, doc));
            group.appendChild(leaf);
        }

        return group;
    }

    appendDelOnlyStringName(group, person = {}, doc) {
        if (!group || !doc) return;
        const parts = [];
        if (this.normalizeSpace(person.surname)) {
            parts.push({
                token: 'surname',
                value: person.surname
            });
        }
        if (this.normalizeSpace(person.givenname)) {
            parts.push({
                token: 'given-names',
                value: person.givenname
            });
        }
        if (!parts.length) return;
        const stringName = doc.createElement('span');
        stringName.className = 'string-name';
        stringName.setAttribute('data-name', 'string-name');
        parts.forEach((part, index) => {
            if (index > 0) stringName.appendChild(doc.createTextNode(' '));
            const leaf = this.createLeafNode({
                token: part.token
            }, '', {
                ownerDocument: doc
            });
            while (leaf.firstChild) leaf.removeChild(leaf.firstChild);
            leaf.appendChild(this.createTrackNode('del', part.value, doc));
            stringName.appendChild(leaf);
        });
        group.appendChild(stringName);
    }

    isOupClient() {
        return this.getReferenceClientCode() === 'oup';
    }

    getReferenceClientCode() {
        const cm = this.globalObject && this.globalObject.commonMethods;
        if (cm && typeof cm.getClientCode === 'function') {
            return String(cm.getClientCode({
                format: 'lower'
            }) || '').toLowerCase();
        }
        const key = (this.globalObject && this.globalObject.SHARED_KEY) || {};
        return String(key.client || key.CLIENT || '').toLowerCase();
    }

    applyInsertReference(state, options = {}) {
        const workingState = this.mergeAuthorsIntoState(state);
        const refList = options.refList || this.findRefList(options.documentRoot || this.getEditorDocumentRoot());
        const rid = options.rid || (refList ? this.getNextReferenceId(refList) : 'CIT0001');
        const built = this.buildReferenceDom(workingState, {
            ...options,
            rid,
            ownerDocument: (refList && refList.ownerDocument) || options.ownerDocument ||
                (typeof document !== 'undefined' ? document : null),
            trackNew: false
        });

        if (!built.refNode) {
            return this.attachMixedCitationResult({
                changed: false,
                reason: built.reason || 'build-failed',
                refNode: null,
                html: ''
            });
        }

        const shouldApply = options.apply !== false;
        if (shouldApply) {
            if (!refList) {
                return this.attachMixedCitationResult({
                    changed: false,
                    reason: 'ref-list-missing',
                    refNode: built.refNode,
                    html: built.refNode.outerHTML
                });
            }
            refList.appendChild(built.refNode);
        }

        return this.attachMixedCitationResult({
            changed: true,
            refNode: built.refNode,
            html: built.refNode.outerHTML
        });
    }

    applyEditReference(state, options = {}) {
        const workingState = this.mergeAuthorsIntoState(state);
        const sourceRef = this.unwrapNode(workingState.refNode || workingState.ref || (workingState.template && workingState.template.ref));
        const mixed = sourceRef && sourceRef.querySelector ? sourceRef.querySelector('.mixed-citation') : null;
        if (!mixed) {
            return this.attachMixedCitationResult({
                changed: false,
                reason: 'mixed-citation-missing',
                refNode: sourceRef || null,
                html: sourceRef ? sourceRef.outerHTML : ''
            });
        }

        const shouldApply = options.apply !== false;
        if (!shouldApply) {
            const built = this.buildEditReferenceDom(workingState, options);
            return this.attachMixedCitationResult({
                changed: !!built.changed,
                refNode: built.refNode,
                html: built.html,
                reason: built.reason
            });
        }

        const authors = (workingState.authors || []).filter((author) =>
            this.normalizeSpace(author.surname) || this.normalizeSpace(author.givenname)
        );
        const sourceHasPersonGroup = !!sourceRef.querySelector('.person-group');
        const shouldRebuildAuthors = sourceHasPersonGroup || authors.length > 1;
        const booksFullTemplate = this.isBooksGlobal();

        if (booksFullTemplate || (shouldRebuildAuthors && authors.length)) {
            const built = this.buildEditReferenceDom(workingState, options);
            if (!built.changed || !built.refNode) {
                return this.attachMixedCitationResult({
                    changed: false,
                    refNode: sourceRef,
                    html: sourceRef.outerHTML,
                    reason: built.reason
                });
            }
            const builtMixed = built.refNode.querySelector('.mixed-citation');
            if (builtMixed) {
                while (mixed.firstChild) mixed.removeChild(mixed.firstChild);
                while (builtMixed.firstChild) mixed.appendChild(builtMixed.firstChild);
            }
            return this.attachMixedCitationResult({
                changed: true,
                refNode: sourceRef,
                html: sourceRef.outerHTML
            });
        }

        const fields = this.getOperationFields(workingState, {
            includePersonGroupLeaves: true
        });
        const values = this.getOperationValues(workingState);
        if (authors.length === 1) {
            values.surname = authors[0].surname;
            values['given-names'] = authors[0].givenname;
        }
        const sourceAuthorNames = this.syncAuthorPersonGroupOriginalsFromSource(sourceRef, workingState);
        fields.forEach((field) => {
            if (!field || !field.token || field.token === 'etal') return;
            if (this.authorPersonGroupTokens.has(field.token) &&
                field.formatMode !== 'plain-inline-font') return;
            const value = this.resolveFieldValue(field, values);
            const newValue = this.valueForLeafWrite(field.token, value);
            if (!this.hasLeafWriteContent(field.token, newValue)) return;
            const leaf = field.element && field.element.parentNode ? field.element :
                this.findLeafForToken(mixed, field.token);
            if (!leaf) return;
            const rich = this.isRichLeafToken(field.token);
            while (leaf.firstChild) leaf.removeChild(leaf.firstChild);
            this.writeLeafValue(leaf, field, newValue, {
                rich
            });
        });
        const tracked = this.runApplyUpdate('edit', {
            mixed,
            source: sourceRef,
            fields,
            values,
            originalValues: this.getOperationOriginalValues(workingState),
            originalInlineFormats: this.getOperationOriginalInlineFormats(workingState),
            refType: workingState.refType || this.getRefType(sourceRef) || 'journal',
            authors,
            hadAuthorEtal: sourceAuthorNames.hadAuthorEtal
        });
        if (tracked.missing) {
            return this.attachMixedCitationResult({
                changed: false,
                reason: 'track-missing',
                refNode: sourceRef,
                html: sourceRef.outerHTML
            });
        }

        return this.attachMixedCitationResult({
            changed: !!tracked.changed,
            refNode: sourceRef,
            html: sourceRef.outerHTML
        });
    }

    applyQueryMissingUpdate(state, options = {}) {
        const workingState = this.mergeAuthorsIntoState(state);
        const sourceRef = this.unwrapNode(workingState.refNode || workingState.ref || (workingState.template && workingState.template.ref));
        const mixed = sourceRef && sourceRef.querySelector ? sourceRef.querySelector('.mixed-citation') : null;
        if (!mixed) {
            return this.attachMixedCitationResult({
                changed: false,
                reason: 'mixed-citation-missing',
                refNode: sourceRef || null,
                html: sourceRef ? sourceRef.outerHTML : ''
            });
        }

        const shouldApply = options.apply !== false;
        if (!shouldApply) {
            const built = this.buildQueryReferenceDom(workingState, options);
            return this.attachMixedCitationResult({
                changed: !!built.changed,
                refNode: built.refNode,
                html: built.html,
                reason: built.reason
            });
        }

        const fields = this.getOperationFields(workingState, {
            includePersonGroupLeaves: true
        });
        const values = this.getOperationValues(workingState);
        const hasMissingValue = fields.some((field) => field.missing && this.normalizeSpace(values[field.token]));
        if (!hasMissingValue && !this.authorEtalUnchecked(sourceRef, values)) {
            return this.attachMixedCitationResult({
                changed: false,
                refNode: sourceRef,
                html: sourceRef.outerHTML
            });
        }

        const sourceSnapshot = sourceRef.cloneNode(true);
        const sourceAuthorNames = this.syncAuthorPersonGroupOriginalsFromSource(sourceRef, workingState);
        workingState.hadAuthorEtal = sourceAuthorNames.hadAuthorEtal;
        workingState.hadAuthorSurname = sourceAuthorNames.hadAuthorSurname;
        workingState.hadAuthorGiven = sourceAuthorNames.hadAuthorGiven;
        while (mixed.firstChild) mixed.removeChild(mixed.firstChild);
        this.appendContentToMixed(mixed, workingState, {
            trackNew: false,
            isUpdate: true,
            ownerDocument: mixed.ownerDocument
        });
        const authors = (workingState.authors || []).filter((author) =>
            this.normalizeSpace(author.surname) || this.normalizeSpace(author.givenname)
        );
        const tracked = this.runApplyUpdate('query', {
            mixed,
            source: sourceSnapshot,
            fields,
            values,
            originalValues: this.getOperationOriginalValues(workingState),
            originalInlineFormats: this.getOperationOriginalInlineFormats(workingState),
            refType: workingState.refType || this.getRefType(sourceRef) || 'journal',
            authors,
            hadAuthorEtal: workingState.hadAuthorEtal
        });
        if (tracked.missing) {
            return this.attachMixedCitationResult({
                changed: false,
                reason: 'track-missing',
                refNode: sourceRef,
                html: sourceRef.outerHTML
            });
        }

        return this.attachMixedCitationResult({
            changed: true,
            refNode: sourceRef,
            html: sourceRef.outerHTML
        });
    }

    deleteReference(refOrId, options = {}) {
        const fn = this.globalObject.DEL_REF_FIRE;
        if (typeof fn !== 'function') return false;
        fn(refOrId, options);
        return true;
    }

    loadCrossRefConfig() {
        RefBridgeCrossRef.loadCrossRefConfig(this.globalObject, this._crossRefConfig);
        return this._crossRefConfig;
    }

    getCrossRefPostParams() {
        this.loadCrossRefConfig();
        return RefBridgeCrossRef.getCrossRefPostParams(this._crossRefConfig);
    }

    resolveCrossRefEndpoint(apiPath) {
        return RefBridgeCrossRef.resolveCrossRefEndpoint(this.globalObject, apiPath);
    }

    filterCrossRefData(response) {
        return RefBridgeCrossRef.filterCrossRefData(response);
    }

    parseFlatDoiApiResponse(jsonObj) {
        return RefBridgeCrossRef.parseFlatDoiApiResponse(jsonObj);
    }

    extractCrossRefYear(publishedData) {
        return RefBridgeCrossRef.extractCrossRefYear(publishedData);
    }

    fetchDoi(doi, options = {}) {
        const hasCallback = typeof options.callback === 'function' || typeof options.onSuccess === 'function';
        const endpoint = this.resolveCrossRefEndpoint(this.globalObject.API_CROSS_REF_API);

        if (!hasCallback) {
            return this.fetchCrossRefBibliography(doi, {
                ...options,
                endpoint,
                recordType: options.recordType || 'fetch_doi',
                postParams: this.getCrossRefPostParams(),
                onSuccess: (parsed) => this.handleLegacyDoiFetchSuccess(parsed, options),
                onError: (response) => this.handleLegacyDoiFetchError(response, options)
            });
        }

        return this.fetchCrossRefBibliography(doi, {
            ...options,
            endpoint,
            recordType: options.recordType || 'fetch_doi',
            postParams: this.getCrossRefPostParams()
        });
    }

    fetchPlainTextBibliography(text, options = {}) {
        const hasCallback = typeof options.callback === 'function' || typeof options.onSuccess === 'function';
        if (!hasCallback) return false;

        return this.fetchCrossRefBibliography(text, {
            ...options,
            endpoint: this.resolveCrossRefEndpoint(this.globalObject.API_ANYSTYLE_CROSS_REF_API),
            recordType: options.recordType || 'fetch_plainText'
        });
    }

    fetchCrossRefBibliography(content, options = {}) {
        const commonfn = this.globalObject.commonfn;
        const getJson = this.globalObject.GET_JSON;
        const endpoint = options.endpoint;
        const onSuccess = options.onSuccess || options.callback;

        if (!content || typeof onSuccess !== 'function' || !commonfn ||
            typeof commonfn.callajax !== 'function' || typeof getJson !== 'function' || !endpoint) {
            return false;
        }

        this.loadCrossRefConfig();

        const postParams = options.postParams || this.getCrossRefPostParams();

        const json = Object.assign({},
            getJson('cross_ref_url', {
                content
            }),
            postParams
        );

        const handlerName = '__refBridgeCrossRefReturn';
        const ctx = {
            bridge: this,
            onSuccess,
            onError: options.onError,
            record: options.record,
            recordType: options.recordType || 'fetch_doi'
        };
        ctx[handlerName] = (response, opt) => opt.bridge.handleCrossRefAjaxResponse(response, opt);

        commonfn.callajax(json, handlerName, endpoint, ctx);
        return true;
    }

    handleLegacyDoiFetchSuccess(parsed, options = {}) {
        const fetchData = this.parseFlatDoiApiResponse(parsed) || this.filterCrossRefData(parsed);
        const multiRef = this.globalObject.MultiRefModule;
        if (multiRef && multiRef.M_FUN && typeof multiRef.M_FUN.JSON_2_DIALOG === 'function') {
            multiRef.M_FUN.JSON_2_DIALOG(fetchData);
            return;
        }
        if (typeof options.onLegacySuccess === 'function') {
            options.onLegacySuccess(fetchData, parsed);
        }
    }

    handleLegacyDoiFetchError(response, options = {}) {
        const multiRef = this.globalObject.MultiRefModule;
        if (multiRef && multiRef.M_FUN && typeof multiRef.M_FUN.handleDoiFetchError === 'function') {
            multiRef.M_FUN.handleDoiFetchError(multiRef);
            return;
        }
        const api = this.globalObject.CROSS_REF_API;
        if (api && typeof api.handleApiError === 'function') {
            api.handleApiError(response);
            return;
        }
        if (typeof options.onError === 'function') {
            options.onError(response);
        }
    }

    handleCrossRefAjaxResponse(response, opt = {}) {
        const bridge = opt.bridge || this;
        const onSuccess = opt.onSuccess;
        const onError = opt.onError;


        try {
            const ok = response && response.r == 1 && (response.statusCode == 200 || response.restext);

            if (!ok || !response.restext || response.restext === 'Resource not found.') {
                if (typeof onError === 'function') onError(response);
                if (opt.record !== false) {
                    bridge.recordCrossRefResponse(response, {
                        type: opt.recordType,
                        parse_res: ''
                    });
                }
                TOASTER_ALERT('doi_fetch_error', {
                    type: 'info'
                });
                return;
            }

            let parsed = null;
            try {
                parsed = JSON.parse(response.restext);
            } catch (parseErr) {
                if (typeof onError === 'function') onError(response, parseErr);
                if (opt.record !== false) {
                    bridge.recordCrossRefResponse(response, {
                        type: opt.recordType,
                        parse_res: ''
                    });
                }
                return;
            }

            if (typeof onSuccess === 'function') onSuccess(parsed);
            if (opt.record !== false) {
                bridge.recordCrossRefResponse(response, {
                    type: opt.recordType,
                    parse_res: bridge.normalizeCrossRefResponse(parsed)
                });
            }
        } catch (err) {
            if (typeof onError === 'function') onError(response, err);
        }
    }

    recordCrossRefResponse(response, options = {}) {
        return RefBridgeCrossRef.recordCrossRefResponse(this.globalObject, response, options);
    }

    mapFilterFetchToBridgeShape(filtered = {}) {
        return RefBridgeCrossRef.mapFilterFetchToBridgeShape(filtered);
    }

    normalizeCrossRefResponse(response) {
        return RefBridgeCrossRef.normalizeCrossRefResponse(response);
    }

    checkReferenceSequence(options = {}) {
        const checkOrder = this.globalObject.CHECK_ORDER;
        const editor = options.editor || this.globalObject.GlobalEditor;
        if (!checkOrder || typeof checkOrder.FIRE_ONCE !== 'function' || !editor) return null;
        return checkOrder.FIRE_ONCE(editor, options);
    }

    hasNonEmptyPeople(list = []) {
        return (Array.isArray(list) ? list : []).some((person) =>
            this.normalizeSpace(person && person.surname) || this.normalizeSpace(person && person.givenname)
        );
    }

    getOperationFields(state = {}, options = {}) {
        const fields = state.fields || (state.template && state.template.fields) || [];
        const rawList = Array.isArray(fields) ? fields : [];
        const rawOrderTokens = state.orderTokens || (state.template && state.template.orderTokens) || [];
        const orderTokens = new Set((Array.isArray(rawOrderTokens) ? rawOrderTokens : []).map((token) => (
            token === 'pub-id' ? 'doi' : token
        )));
        const list = state.mode === 'insert' && orderTokens.size ? rawList.filter((field) => {
            const token = field && field.token === 'pub-id' ? 'doi' : field && field.token;
            return this.isTokenInStyleOrder(token, orderTokens);
        }) : rawList;
        if (options.includePersonGroupLeaves) return list;

        const hasAuthors = this.hasNonEmptyPeople(state.authors);
        const hasEditors = this.hasNonEmptyPeople(state.editors);
        const hasTranslators = this.hasNonEmptyPeople(state.translators);

        return list.filter((field) => {
            const token = field && field.token;
            if (!token) return false;
            if (hasAuthors && this.authorPersonGroupTokens.has(token)) return false;
            if (hasEditors && this.editorFieldTokens.has(token)) return false;
            if (hasTranslators && this.translatorFieldTokens.has(token)) return false;
            return true;
        });
    }

    getOperationValues(state = {}) {
        return state.values || (state.template && state.template.values) || {};
    }

    getOperationOriginalValues(state = {}) {
        return state.originalValues || (state.template && state.template.originalValues) || {};
    }

    getOperationOriginalInlineFormats(state = {}) {
        return state.originalInlineFormats || (state.template && state.template.originalInlineFormats) || {};
    }

    getOperationDelimiters(state = {}) {
        return state.delimiters || (state.template && state.template.delimiters) || {};
    }

    getOperationDelimitersLast(state = {}) {
        return state.delimitersLast || (state.template && state.template.delimitersLast) || {};
    }

    appendFieldsToMixed(mixed, fields = [], values = {}, delimiters = {}, options = {}) {
        const slots = this.planFlatCitationSlots(fields, values, delimiters, options);
        this.renderCitationSlots(mixed, slots, delimiters, options);
    }

    copySafeAttributes(source, target, options = {}) {
        if (!source || !target || !source.attributes) return;
        const skip = new Set(options.skip || []);
        Array.from(source.attributes).forEach((attr) => {
            const name = attr.name;
            if (!name || skip.has(name)) return;
            if (/^on/i.test(name)) return;
            if (!options.preserveClass && name === 'class') return;
            target.setAttribute(name, attr.value);
        });
    }

    createLeafNode(field, value, options = {}) {
        const doc = options.ownerDocument || this.getDocumentForField(field) ||
            (typeof document !== 'undefined' ? document : null);
        const token = field && field.token ? field.token : 'field';
        if (this.isLinkFieldToken(token)) {
            return this.createReferenceLinkLeaf(value, field, {
                ...options,
                ownerDocument: doc,
                token,
                isUpdate: !!options.isUpdate
            });
        }

        const leaf = this.createReferenceNode(doc, 'span', {
            class: token,
            'data-name': token
        });
        if (!leaf) return null;
        let formatType = null;
        let textTarget = leaf;
        if (field && field.italic && this.shouldEmitExplicitItalic(options.refType)) {
            formatType = 'italic';
            textTarget = this.createFormatNode('italic', doc);
        } else if (field && field.bold) {
            formatType = 'bold';
            textTarget = this.createFormatNode('bold', doc);
        }
        if (textTarget !== leaf) leaf.appendChild(textTarget);
        const rich = this.isRichLeafToken(token);
        const fontMode = !!(field && field.formatMode === 'plain-inline-font');
        if (options.track) {
            let trackValue = value;
            let richHtml = rich;
            if (fontMode) {
                const html = this.projectFieldInlineHtml(field, value);
                if (html == null) {
                    richHtml = false;
                } else {
                    trackValue = html;
                    richHtml = true;
                }
            } else if (richHtml) {
                trackValue = this.unwrapRedundantFormatWrapper(trackValue, formatType, doc);
            }
            textTarget.appendChild(this.createTrackNode('insert', trackValue, doc, {
                richHtml
            }));
        } else if (fontMode) {
            this.writeLeafValue(textTarget, field, value, {
                rich
            });
        } else if (rich) {
            const unwrapped = this.unwrapRedundantFormatWrapper(value, formatType, doc);
            textTarget.innerHTML = unwrapped == null ? '' : String(unwrapped);
        } else {
            textTarget.textContent = value;
        }
        return leaf;
    }

    resolveFieldValue(field = {}, values = {}) {
        return values[field.token] != null ? values[field.token] : field.value;
    }

    isBlankTrackedValue(token, value) {
        if (this.isRichLeafToken(token)) return !this.trimHtml(value);
        return !this.normalizeSpace(value);
    }

    authorEtalUnchecked(sourceRef, values = {}) {
        const had = !!(sourceRef && sourceRef.querySelector &&
            sourceRef.querySelector('.person-group[person-group-type="author"] .etal'));
        return had && !this.normalizeSpace(values.etal);
    }

    shouldTrackNewLeaf(field = {}, options = {}) {
        if (!options.trackNew) return false;
        if (options.isUpdate) return false;
        return !!(field.missing || field.virtual);
    }

    /**
     * Person-group leaves are excluded from document fields, so promote often leaves
     * surname/given/etal with empty original. Sync presence + original text from source DOM.
     */
    syncAuthorPersonGroupOriginalsFromSource(sourceRef, state = {}) {
        const authorGroup = sourceRef && sourceRef.querySelector ?
            (sourceRef.querySelector('.person-group[person-group-type="author"]') || sourceRef.querySelector('.mixed-citation')) :
            null;
        const firstName = authorGroup && authorGroup.querySelector ?
            authorGroup.querySelector('.string-name') :
            null;
        const surnameEl = firstName && firstName.querySelector ?
            firstName.querySelector('.surname') :
            null;
        const givenEl = firstName && firstName.querySelector ?
            firstName.querySelector('.given-names') :
            null;
        const etalEl = authorGroup && authorGroup.querySelector ?
            authorGroup.querySelector('.etal') :
            null;

        const surnameContent = surnameEl ? this.getLeafFieldContent(surnameEl, 'surname') : '';
        const givenContent = givenEl ? this.getLeafFieldContent(givenEl, 'given-names') : '';
        const etalContent = etalEl ? this.getLeafFieldContent(etalEl, 'etal') : '';

        const hadAuthorSurname = !!this.normalizeSpace(surnameContent);
        const hadAuthorGiven = !!this.normalizeSpace(givenContent);
        const hadAuthorEtal = !!etalEl;

        if (Array.isArray(state.fields)) {
            if (hadAuthorSurname) {
                const field = state.fields.find((item) => item && item.token === 'surname');
                if (field && !this.normalizeSpace(field.original)) {
                    field.original = surnameContent;
                }
            }
            if (hadAuthorGiven) {
                const field = state.fields.find((item) => item && item.token === 'given-names');
                if (field && !this.normalizeSpace(field.original)) {
                    field.original = givenContent;
                }
            }
            if (hadAuthorEtal) {
                const field = state.fields.find((item) => item && item.token === 'etal');
                if (field && !this.normalizeSpace(field.original)) {
                    field.original = this.normalizeSpace(etalContent) || 'et al.';
                }
            }
        }

        if (state.originalValues && typeof state.originalValues === 'object') {
            if (hadAuthorSurname && state.originalValues.surname == null) {
                state.originalValues.surname = surnameContent;
            }
            if (hadAuthorGiven && state.originalValues['given-names'] == null) {
                state.originalValues['given-names'] = givenContent;
            }
            if (hadAuthorEtal && state.originalValues.etal == null) {
                state.originalValues.etal = this.normalizeSpace(etalContent) || 'et al.';
            }
        }

        return {
            hadAuthorSurname,
            hadAuthorGiven,
            hadAuthorEtal
        };
    }

    isPersonGroupNameLeafToken(token = '') {
        return this.authorPersonGroupTokens.has(token) ||
            this.editorFieldTokens.has(token) ||
            this.translatorFieldTokens.has(token);
    }

    findOperationFieldByToken(fields = [], token = '') {
        if (!token) return null;
        const list = Array.isArray(fields) ? fields : [];
        return list.find((field) => field && field.token === token) || null;
    }

    leafHasInsertTrack(leaf) {
        if (!leaf || !leaf.querySelectorAll) return false;
        return Array.from(leaf.querySelectorAll('insert')).some((node) =>
            this.isSameUserTrackNode(node) ||
            String(node.getAttribute('data-track-code') || '') === 'ref-text-01'
        );
    }

    shouldEmitExplicitItalic(refType = 'journal') {
        const sharedKey = this.globalObject.SHARED_KEY || {};
        const dtd = String(sharedKey.dtd || sharedKey.DTD || '').toUpperCase();
        const isJournal = typeof this.globalObject.IS_JOURNAL === 'boolean' ?
            this.globalObject.IS_JOURNAL :
            String(refType || 'journal').toLowerCase() === 'journal';
        return !isJournal || dtd === 'BITS';
    }

    createFormatNode(type, ownerDocument) {
        const doc = ownerDocument || (typeof document !== 'undefined' ? document : null);
        const tag = type === 'bold' ? 'strong' : 'em';
        const node = doc.createElement(tag);
        node.className = type;
        node.setAttribute('data-name', type);
        return node;
    }

    // createLeafNode wraps a config-flagged-italic/bold rich field in its own format node, then
    // writes the field's rich value into it verbatim. When that value already carries its own
    // matching wrap (e.g. a title captured from the original document that was already
    // italicized), the two wraps nest -- <em class="italic"><em class="italic">...</em></em> --
    // instead of one. This strips a value's own outer wrap when it exactly matches the wrap
    // createLeafNode is about to apply, so only one survives.
    unwrapRedundantFormatWrapper(value, formatType, ownerDocument) {
        if (value == null || !formatType) return value;
        const doc = ownerDocument || (typeof document !== 'undefined' ? document : null);
        if (!doc || !doc.createElement) return value;
        const tag = formatType === 'bold' ? 'strong' : 'em';
        const container = doc.createElement('div');
        container.innerHTML = String(value);
        const only = container.childNodes.length === 1 ? container.firstChild : null;
        const isMatchingWrap = only && only.nodeType === 1 &&
            only.tagName.toLowerCase() === tag &&
            String(only.className || '').split(/\s+/).includes(formatType);
        return isMatchingWrap ? only.innerHTML : value;
    }

    isLinkFieldToken(token) {
        return token === 'ext-link' || token === 'uri' || token === 'doi' ||
            token === 'pub-id' || token === 'object-id';
    }

    resolveHyperlinkDialog() {
        const fromGlobal = this.globalObject && this.globalObject.hyperLinkDialog;
        if (fromGlobal && (typeof fromGlobal.resolveReferenceLink === 'function' ||
                typeof fromGlobal.getLinkTypeFromText === 'function')) return fromGlobal;
        if (typeof hyperLinkDialog !== 'undefined' && hyperLinkDialog &&
            (typeof hyperLinkDialog.resolveReferenceLink === 'function' ||
                typeof hyperLinkDialog.getLinkTypeFromText === 'function')) {
            return hyperLinkDialog;
        }
        return null;
    }

    resolveReferenceLinkField(input = {}) {
        return resolveReferenceLinkField({
            ...input,
            isJournal: input.isJournal !== undefined ? input.isJournal : this.resolveIsJournal()
        }, {
            globalObject: this.globalObject,
            hyperlinkDialog: this.resolveHyperlinkDialog()
        });
    }

    /**
     * Build reference DOI/URL leaf using hyperlink_module helpers when available.
     * Journals: partial DOI → pub-id. Books: expand to https://doi.org/ (attrs shape -- ext-link,
     * uri, etc. -- comes entirely from hyperlink_module's per-client REFERENCE_ELEMENTS config).
     * The dialog is always called with the raw value; the resolved shape (pub-id or not) then
     * decides both href (buildLinkAttributes' own expand logic) and the leaf's displayed text
     * below -- no separate pre-classification call needed here.
     */
    createReferenceLinkLeaf(value, field = {}, options = {}) {
        if (typeof debug !== 'undefined' && debug && typeof debug.log === 'function') {
            debug.log("createReferenceLinkLeaf");
        }
        const doc = options.ownerDocument || (typeof document !== 'undefined' ? document : null);
        const rawText = this.normalizeSpace(value);
        let descriptor = null;
        let orgValue = field.original || "";
        let isSameValue = value == orgValue;
        let {
            mode = options.isUpdate ? 'update' : 'insert', insertMethod = "doi_form"
        } = options;

        const activeReferenceDialog = this.globalObject.referenceDialog ||
            (typeof referenceDialog !== 'undefined' ? referenceDialog : null);
        if (activeReferenceDialog) {
            mode = activeReferenceDialog.stateBag && activeReferenceDialog.stateBag.mode || "insert";
        }

        try {
            descriptor = this.resolveReferenceLinkField({
                value: rawText,
                element: field.element,
                expectedType: options.token || field.token || 'ext-link',
                isUpdate: !!options.isUpdate,
                isJournal: this.resolveIsJournal()
            });
        } catch (err) {
            descriptor = null;
        }
        const attrs = {
            ...((descriptor && descriptor.attributes) || {})
        };
        const text = descriptor && descriptor.displayValue != null ? descriptor.displayValue : rawText;
        if (descriptor && descriptor.linkDataType && !attrs['data-link-type']) {
            attrs['data-link-type'] = descriptor.linkDataType;
        }

        if (!options.isUpdate && (mode == "insert" || isSameValue)) {
            delete attrs['data-track-code'];
            delete attrs['data-link'];
        }

        const className = attrs.class || attrs['data-name'] || options.token || 'ext-link';
        const leaf = doc.createElement('span');
        Object.keys(attrs).forEach((key) => {
            if (key === 'class') {
                leaf.className = attrs[key];
                return;
            }
            if (attrs[key] == null || attrs[key] === '') return;
            leaf.setAttribute(key, attrs[key]);
        });

        if (!leaf.getAttribute('data-name')) {
            leaf.setAttribute('data-name', className);
        }

        if (options.track) {
            leaf.appendChild(this.createTrackNode('insert', text, doc));
        } else {
            leaf.textContent = text;
        }
        return leaf;
    }

    createTrackNode(tag, value, ownerDocument, options = {}) {
        const doc = ownerDocument || (typeof document !== 'undefined' ? document : null);
        const trackCode = tag === 'del' ? 'ref-text-del-01' : 'ref-text-01';
        const node = this.createTrackManagerNode(tag, doc, {
            'data-track-code': trackCode
        }) || doc.createElement(tag);
        if (!node.getAttribute('data-track-code')) {
            node.setAttribute('data-track-code', trackCode);
        }
        if (options.richHtml) {
            node.innerHTML = value == null ? '' : String(value);
        } else {
            node.textContent = value;
        }
        return node;
    }

    createTrackManagerNode(tag, ownerDocument, attrs = {}) {
        const manager = this.resolveTrackManager();
        const method = tag === 'del' ? 'getDelNode' : 'getInsNode';
        if (!manager || typeof manager[method] !== 'function') return null;
        try {
            const node = manager[method](null, {
                setAttrParams: attrs
            });
            if (!node || !node.tagName) return null;
            if (String(node.tagName).toLowerCase() !== tag) return null;
            return ownerDocument && node.ownerDocument !== ownerDocument ?
                ownerDocument.importNode(node, true) :
                node;
        } catch (err) {
            return null;
        }
    }

    resolveTrackManager() {
        const root = this.globalObject || (typeof window !== 'undefined' ? window : globalThis);
        return (root && root._trackManager) ||
            (typeof window !== 'undefined' && window._trackManager) ||
            (root && root.trackManager) ||
            null;
    }

    resolveCommonMethods() {
        if (this.globalObject && this.globalObject.commonMethods) return this.globalObject.commonMethods;
        if (typeof globalThis !== 'undefined' && globalThis.commonMethods) return globalThis.commonMethods;
        if (typeof window !== 'undefined' && window.commonMethods) return window.commonMethods;
        return null;
    }

    isSameUserTrackNode(node) {
        const cm = this.resolveCommonMethods();
        if (cm && typeof cm.IS_SAME_USER_AND_ROLE === 'function') {
            try {
                return !!cm.IS_SAME_USER_AND_ROLE(node);
            } catch (err) {
                return false;
            }
        }
        return false;
    }

    getSameUserPendingFieldChange(leaf) {
        if (!leaf || !leaf.querySelector) return null;
        const insert = Array.from(leaf.querySelectorAll('insert')).find((node) => this.isSameUserTrackNode(node));
        const deleted = Array.from(leaf.querySelectorAll('del')).find((node) => this.isSameUserTrackNode(node));
        if (!insert || !deleted) return null;
        return {
            insert,
            deleted,
            insertedValue: this.getTrackNodeContent(insert, this.isRichLeafToken(this.getTokenFromElement(leaf))),
            deletedValue: this.getTrackNodeContent(deleted, this.isRichLeafToken(this.getTokenFromElement(leaf)))
        };
    }

    getTrackNodeContent(node, rich = false) {
        if (!node) return '';
        return rich ? String(node.innerHTML || '').trim() : this.normalizeSpace(node.textContent);
    }

    getDocumentForField(field) {
        const el = field && field.element;
        if (el && el.ownerDocument) return el.ownerDocument;
        if (typeof document !== 'undefined') return document;
        return null;
    }

    findRefList(root) {
        const dom = root || (typeof document !== 'undefined' ? document : null);
        return dom && dom.querySelector ? dom.querySelector('.ref-list') : null;
    }

    resolveRuntimeObject(name, fallback) {
        if (this.globalObject && this.globalObject[name] !== undefined) return this.globalObject[name];
        if (typeof globalThis !== 'undefined' && globalThis[name] !== undefined) return globalThis[name];
        return fallback;
    }

    mergeReferenceAttributes(base = {}, globalKey) {
        const globalAttrs = this.resolveRuntimeObject('GlobalAttributes', {}) || {};
        return {
            ...(globalAttrs[globalKey] || {}),
            ...base
        };
    }

    createReferenceContainer(doc, attrs = {}, text = '') {
        const node = doc.createElement('div');
        Object.keys(attrs).forEach((key) => {
            const value = attrs[key];
            if (value != null) node.setAttribute(key, String(value));
        });
        if (text) node.textContent = text;
        return node;
    }

    ensureReferenceGroup(dom, selector, attrs, targetSelector, options = {}) {
        let group = dom && dom.querySelector ? dom.querySelector(selector) : null;
        const doc = dom && dom.createElement ? dom : (dom && dom.ownerDocument ? dom.ownerDocument : null);
        if (group || !dom || !doc) return {
            group,
            created: false
        };

        group = this.createReferenceContainer(doc, attrs);
        const target = targetSelector && dom.querySelector ? dom.querySelector(targetSelector) : null;
        if (target && options.appendToTarget) {
            target.appendChild(group);
        } else if (target && target.parentNode) {
            target.insertAdjacentElement('afterend', group);
        } else if (dom.body && dom.body.appendChild) {
            dom.body.appendChild(group);
        } else if (dom.appendChild) {
            dom.appendChild(group);
        }
        return {
            group,
            created: true
        };
    }

    extractBookReferencePrefix(baseId) {
        const match = String(baseId || '').match(/^(workid-[A-Z0-9]+)/i);
        return match ? match[1] : '';
    }

    getBookReferenceBaseIds(options = {}) {
        const editorCursor = options.editorCursor || this.resolveRuntimeObject('EDITOR_CURSOR', {}) || {};
        const para = options.paraManager || this.resolveRuntimeObject('paraManager', {}) || {};
        const baseId = options.chapterBaseId || para.baseId || '';
        const forceDocument = options.scope === 'document';
        let prefixBaseId = '';
        if (forceDocument) {
            prefixBaseId = this.extractBookReferencePrefix(options.documentPrefix || baseId) || this.extractBookReferencePrefix(baseId);
        } else if (options.scope === 'chapter' && options.chapterBaseId) {
            prefixBaseId = options.chapterBaseId;
        } else if (editorCursor.CUR_CHAPTER_ID) {
            prefixBaseId = baseId;
        } else {
            prefixBaseId = this.extractBookReferencePrefix(baseId);
        }
        return {
            refListId: prefixBaseId ? `${prefixBaseId}-ref-list-1` : 'ref-list-1',
            refId: prefixLastNumericSegment(prefixBaseId ? `${prefixBaseId}-ref-001` : 'ref-001')
        };
    }

    _booksReferenceSelectors() {
        return {
            bookBack: '[data-name="book-back"], .book-back',
            refGroup: '[data-name="ref-group"], .ref-group',
            refList: '[data-name="ref-list"], .ref-list',
            bookPart: '[data-name="book-part"], .book-part, .chapter',
            back: '[data-name="back"], .back'
        };
    }

    _findBooksDocumentRefList(documentRoot) {
        const sel = this._booksReferenceSelectors();
        if (!documentRoot || !documentRoot.querySelector) return null;
        const bookBack = documentRoot.querySelector(sel.bookBack);
        if (!bookBack) return null;
        const group = bookBack.querySelector(sel.refGroup);
        return (group && group.querySelector(sel.refList)) ||
            bookBack.querySelector(sel.refList) ||
            null;
    }

    _findBooksChapterRefList(chapter) {
        const sel = this._booksReferenceSelectors();
        if (!chapter || !chapter.querySelector) return null;
        const backs = Array.from(chapter.querySelectorAll(sel.back)).filter((node) => {
            if (!node) return false;
            if (node.classList && node.classList.contains('book-back')) return false;
            if (node.getAttribute && node.getAttribute('data-name') === 'book-back') return false;
            return true;
        });
        for (let i = 0; i < backs.length; i += 1) {
            const back = backs[i];
            const group = back.querySelector(sel.refGroup);
            const list = (group && group.querySelector(sel.refList)) || back.querySelector(sel.refList);
            if (list) return list;
        }
        return null;
    }

    _resolveBooksChapterElement(contextRef, editorCursor) {
        const sel = this._booksReferenceSelectors();
        if (contextRef && typeof contextRef.closest === 'function') {
            const fromCtx = contextRef.closest(sel.bookPart);
            if (fromCtx) return fromCtx;
        }
        if (editorCursor && editorCursor.CUR_CHAPTER && editorCursor.CUR_CHAPTER.querySelector) {
            return editorCursor.CUR_CHAPTER;
        }
        return null;
    }

    _resolveBooksDocumentPrefix(documentRoot, refList) {
        const sel = this._booksReferenceSelectors();
        const bookBack = documentRoot && documentRoot.querySelector &&
            documentRoot.querySelector(sel.bookBack);
        if (bookBack) {
            const fromBack = this.extractBookReferencePrefix(bookBack.id);
            if (fromBack) return fromBack;
        }
        if (refList && refList.id) {
            const fromList = this.extractBookReferencePrefix(refList.id);
            if (fromList) return fromList;
        }
        const firstRef = refList && refList.querySelector && refList.querySelector('div.ref[id]');
        if (firstRef) {
            const fromRef = this.extractBookReferencePrefix(firstRef.id);
            if (fromRef) return fromRef;
        }
        const bookRoot = documentRoot && documentRoot.querySelector &&
            documentRoot.querySelector('.book, [data-name="book"]');
        return this.extractBookReferencePrefix(bookRoot && bookRoot.id);
    }

    _ensureBooksReferenceTitle(refList, insertedContainers) {
        if (!refList || refList.querySelector('div.title, [data-name="title"]')) return;
        const title = this.createReferenceContainer(
            refList.ownerDocument || document,
            this.mergeReferenceAttributes({
                class: 'title',
                'data-name': 'title',
                'data-enter-af-fi': 'yes'
            }, 'title'),
            'Reference'
        );
        refList.insertBefore(title, refList.firstChild);
        if (insertedContainers) insertedContainers.title = true;
    }

    _createBooksChapterRefHierarchy(chapter, ids) {
        const sel = this._booksReferenceSelectors();
        const insertedContainers = {
            back: false,
            refList: false,
            title: false
        };
        const doc = chapter.ownerDocument || document;

        let back = Array.from(chapter.querySelectorAll(sel.back)).find((node) =>
            node.getAttribute('data-name') !== 'book-back' &&
            !(node.classList && node.classList.contains('book-back'))
        ) || null;
        if (!back) {
            back = this.createReferenceContainer(doc, this.mergeReferenceAttributes({
                class: 'back',
                'data-name': 'back',
                'data-enter-af-fi': 'yes'
            }, 'back'));
            chapter.appendChild(back);
            insertedContainers.back = true;
        }

        let group = back.querySelector(sel.refGroup);
        if (!group) {
            group = this.createReferenceContainer(doc, {
                class: 'ref-group',
                'data-name': 'ref-group'
            });
            back.appendChild(group);
        }

        let refList = group.querySelector(sel.refList);
        if (!refList) {
            refList = this.createReferenceContainer(doc, this.mergeReferenceAttributes({
                class: 'ref-list',
                id: ids.refListId,
                'data-name': 'ref-list',
                'data-enter-af-fi': 'yes'
            }, 'ref-list'));
            group.appendChild(refList);
            insertedContainers.refList = true;
        }

        this._ensureBooksReferenceTitle(refList, insertedContainers);
        return {
            back,
            group,
            refList,
            insertedContainers
        };
    }

    _mapDocumentTargetToRefTargets(resolved, fallbackDom) {
        const refList = resolved && resolved.refList;
        return {
            DOM: (resolved && resolved.root) || fallbackDom,
            refList,
            refs: refList && refList.querySelectorAll ?
                Array.from(refList.querySelectorAll('div.ref[id]')) : [],
            identityOptions: {
                bookFallbackRefId: (resolved && resolved.idScope && resolved.idScope.firstRefId) || undefined
            },
            insertedContainers: {
                back: !!(resolved && resolved.created && resolved.created.back),
                refList: !!(resolved && resolved.created &&
                    (resolved.created.refList || resolved.created.group)),
                title: !!(resolved && resolved.created && resolved.created.title)
            }
        };
    }

    _resolveBooksRefTargetsLocal(documentRoot, options = {}) {
        const insertedContainers = {
            back: false,
            refList: false,
            title: false
        };
        const editorCursor = options.editorCursor || this.resolveRuntimeObject('EDITOR_CURSOR', {}) || {};
        const contextRef = options.contextRef && options.contextRef.nodeType ? options.contextRef : null;
        const sel = this._booksReferenceSelectors();

        let refList = this._findBooksDocumentRefList(documentRoot);
        let scope = null;
        let root = documentRoot;
        let chapter = null;

        if (refList) {
            scope = 'document';
            root = (typeof refList.closest === 'function' && refList.closest(sel.bookBack)) || documentRoot;
            this._ensureBooksReferenceTitle(refList, insertedContainers);
            const documentPrefix = this._resolveBooksDocumentPrefix(documentRoot, refList);
            const ids = this.getBookReferenceBaseIds({
                ...options,
                editorCursor,
                scope: 'document',
                documentPrefix
            });
            const fallbackId = (refList.querySelector && refList.querySelector('div.ref[id]')) ?
                undefined :
                ids.refId;
            return {
                DOM: root,
                refList,
                refs: refList.querySelectorAll ?
                    Array.from(refList.querySelectorAll('div.ref[id]')) : [],
                identityOptions: {
                    bookFallbackRefId: fallbackId || ids.refId
                },
                insertedContainers
            };
        }

        chapter = this._resolveBooksChapterElement(contextRef, editorCursor);
        if (!chapter) {
            return {
                DOM: documentRoot,
                refList: null,
                refs: [],
                identityOptions: {},
                insertedContainers
            };
        }

        root = chapter;
        refList = this._findBooksChapterRefList(chapter);
        const chapterBaseId = chapter.id || '';
        const ids = this.getBookReferenceBaseIds({
            ...options,
            editorCursor,
            scope: 'chapter',
            chapterBaseId
        });

        if (!refList) {
            const built = this._createBooksChapterRefHierarchy(chapter, ids);
            refList = built.refList;
            Object.assign(insertedContainers, built.insertedContainers);
        } else {
            this._ensureBooksReferenceTitle(refList, insertedContainers);
        }

        return {
            DOM: root,
            refList,
            refs: refList && refList.querySelectorAll ?
                Array.from(refList.querySelectorAll('div.ref[id]')) : [],
            identityOptions: {
                bookFallbackRefId: ids.refId
            },
            insertedContainers
        };
    }

    resolveRefTargets(documentRoot, options = {}) {
        const isJournal = this.resolveIsJournal(options);
        let DOM = documentRoot || this.getEditorDocumentRoot() ||
            (typeof document !== 'undefined' ? document : null);
        const insertedContainers = {
            back: false,
            refList: false,
            title: false
        };

        if (!DOM || !DOM.querySelector) {
            return {
                DOM,
                refList: null,
                refs: [],
                identityOptions: {},
                insertedContainers
            };
        }

        if (isJournal) {
            const refList = this.findRefList(DOM);
            return {
                DOM,
                refList,
                refs: refList && refList.querySelectorAll ?
                    Array.from(refList.querySelectorAll('div.ref[id]')) : [],
                identityOptions: {},
                insertedContainers
            };
        }

        const editorCursor = options.editorCursor || this.resolveRuntimeObject('EDITOR_CURSOR', {}) || {};
        const contextRef = options.contextRef && options.contextRef.nodeType ?
            options.contextRef :
            null;
        const para = options.paraManager || this.resolveRuntimeObject('paraManager', null);

        if (para && typeof para.resolveDocumentTarget === 'function') {
            try {
                const resolved = para.resolveDocumentTarget('reference', {
                    documentRoot: DOM,
                    contextElement: contextRef ||
                        (editorCursor && editorCursor.CUR_CHAPTER) ||
                        null,
                    create: true
                });
                if (resolved && resolved.refList) {
                    return this._mapDocumentTargetToRefTargets(resolved, DOM);
                }
            } catch (err) {
                const message = err && err.message ? err.message : String(err);
                if (typeof ErrorLogTrace === 'function') {
                    ErrorLogTrace('DocumentManager.resolveDocumentTarget', message);
                } else if (typeof globalThis !== 'undefined' &&
                    typeof globalThis.ErrorLogTrace === 'function') {
                    globalThis.ErrorLogTrace('DocumentManager.resolveDocumentTarget', message);
                }
            }
        }

        return this._resolveBooksRefTargetsLocal(DOM, {
            ...options,
            editorCursor,
            contextRef
        });
    }

    getEditorDocumentRoot() {
        const editor = this.globalObject.GlobalEditor;
        return editor && editor.document && editor.document.$ ? editor.document.$ : null;
    }

    getNextReferenceId(refList) {
        const identity = this.getNextReferenceIdentity(refList);
        return identity && identity.rid ? identity.rid : 'CIT0001';
    }

    resolveIsJournal(options = {}) {
        if (typeof options.isJournal === 'boolean') return options.isJournal;
        const root = options.globalObject || this.globalObject || {};
        if (typeof root.IS_JOURNAL === 'boolean') return root.IS_JOURNAL;
        if (typeof IS_JOURNAL !== 'undefined') return !!IS_JOURNAL;
        return true;
    }

    bibIdFromIndex(index, isJournal = true) {
        const n = parseInt(index, 10);
        if (!Number.isFinite(n) || n <= 0) {
            return isJournal ? 'CIT0001' : prefixLastNumericSegment('ref-001');
        }
        if (!isJournal) {
            return prefixLastNumericSegment(`ref-${n}`);
        }
        const prefix = 'CIT000';
        if (n < 10) return `${prefix}${n}`;
        if (n < 100) return `${prefix.slice(0, -1)}${n}`;
        return `${prefix.slice(0, -2)}${n}`;
    }

    getNextIdFromPattern(baseId, seq) {
        const regularBaseId = stripLeadingZerosFromLastNumericSegment(String(baseId || ''));
        const match = regularBaseId.match(/^(.*-)(\d+)$/);
        if (!match) return prefixLastNumericSegment(`ref-00${seq || 1}`);
        const prefix = match[1];
        const lastPart = match[2];
        const nextVal = seq !== undefined ? Number(seq) : Number(lastPart) + 1;
        return prefixLastNumericSegment(prefix + String(nextVal).padStart(lastPart.length, '0'));
    }

    checkIdNotExists(dom, baseId, seq) {
        try {
            const root = this.globalObject || {};
            const isJournal = root.IS_JOURNAL != null ? root.IS_JOURNAL :
                (typeof IS_JOURNAL !== 'undefined' ? IS_JOURNAL : false);
            if (!isJournal && typeof IdGenerator !== 'undefined' && IdGenerator.forDocument) {
                const scope = (typeof EDITOR_CURSOR !== 'undefined' && EDITOR_CURSOR.CUR_CHAPTER) ||
                    (dom && dom.body) || dom || document.body;
                const result = IdGenerator.forDocument().nextId('ref', {
                    scope: scope,
                    dom: dom || document,
                    seq: seq
                });
                return prefixLastNumericSegment(result.id);
            }
        } catch (_err) {
            // fall through to legacy pattern
        }
        if (!dom || !baseId) return prefixLastNumericSegment(this.bibIdFromIndex(seq || 1, false));
        let nextId = this.getNextIdFromPattern(baseId, seq);
        let attempt = seq || 1;
        while (dom.querySelector && dom.querySelector(`#${nextId}`)) {
            attempt += 1;
            nextId = this.getNextIdFromPattern(baseId, attempt);
        }
        return nextId;
    }

    formatReferenceLabel(numericLab, options = {}) {
        const root = options.globalObject || this.globalObject || {};
        const iRef = root.iREF_SCOPE || (typeof iREF_SCOPE !== 'undefined' ? iREF_SCOPE : {});
        const refConfig = iRef.Reference || {};
        let lab = String(numericLab == null ? '' : numericLab);
        const labelFormat = options.labelFormat || refConfig['data-label-format'] || '';
        const labelPrefix = options.labelPrefix || refConfig['data-label-prefix'] || '';
        const lastRef = options.lastRef || null;
        const lastLabelEl = lastRef && lastRef.querySelector ? lastRef.querySelector('.label') : null;

        if (lastLabelEl) {
            const lastLabelText = lastLabelEl.textContent.trim();
            if (labelFormat === 'numbered_with_dot' && lastLabelText.includes('.')) {
                lab = `${lab}.`;
            } else if (labelFormat === 'numbered_with_squre_bracket' && /\[\d+\]$/.test(lastLabelText)) {
                lab = `[${lab}]`;
            }
        } else if (labelFormat === 'numbered_with_dot') {
            lab = `${lab}.`;
        } else if (labelFormat === 'numbered_with_squre_bracket') {
            lab = `[${lab}]`;
        }

        if (labelPrefix.includes('|')) {
            const parts = labelPrefix.split('|');
            const prefix = parts[0] || '';
            const suffix = parts[1] || '';
            lab = `${prefix}${lab}${suffix}`;
        }

        return lab;
    }

    getNextJournalReferenceIdentity(startIdx, dom, options = {}) {
        let idx = startIdx <= 0 ? 1 : startIdx;
        const queryDom = dom || this.getEditorDocumentRoot();
        const overall = options.overall != null ? options.overall : idx + 100;

        const getRef = (ind, offset) => {
            const id = this.bibIdFromIndex(ind + offset, true);
            const elm = queryDom && queryDom.querySelector ?
                queryDom.querySelector(`[id="${id}"]`) :
                null;
            return {
                id,
                elm: elm || null,
                missing: elm ? elm.hasAttribute('data-cite-missing') : null
            };
        };

        let findObj = getRef(idx, 0);
        let nextObj = getRef(idx, 1);
        let prevObj = getRef(idx, -1);
        let count = 0;
        let final = findObj;

        while (true) {
            if ((!findObj.elm && nextObj.missing)) {
                if (!prevObj.elm) idx -= 1;
                final = getRef(idx, 0);
                break;
            }
            if (findObj.elm && findObj.missing && !nextObj.elm) {
                idx += 1;
                final = getRef(idx, 0);
                break;
            }
            if (overall < count || (!findObj.elm && !nextObj.elm)) break;
            idx += 1;
            count += 1;
            findObj = getRef(idx, 0);
            nextObj = getRef(idx, 1);
            prevObj = getRef(idx, -1);
            final = findObj;
            if (overall < count || (!findObj.elm && !nextObj.elm)) break;
        }

        return {
            rid: final.id,
            label: String(idx)
        };
    }

    getNextBookReferenceIdentity(refList, dom, options = {}) {
        const docRoot = this.getEditorDocumentRoot();
        const overallRefs = Array.from(docRoot.querySelectorAll('div.ref[id]'));
        const refs = Array.from(refList.querySelectorAll('div.ref[id]'));
        const finalRefs = overallRefs.length > refs.length ? overallRefs : refs;

        let maxLab = 0;
        let maxSeq = 0;

        finalRefs.forEach((ref) => {
            const seqMatch = ref.id.match(/(\d+)$/);
            if (seqMatch) maxSeq = Math.max(maxSeq, parseInt(seqMatch[1], 10));

            const labelEl = ref.querySelector('.label');
            if (labelEl) {
                const num = parseInt(labelEl.textContent.trim().replace(/\D/g, ''), 10);
                if (!Number.isNaN(num)) maxLab = Math.max(maxLab, num);
            }
        });

        const lab = (maxLab || maxSeq || 0) + 1;
        const seq = (maxSeq || 0) + 1;

        const firstRefId = refs.length ? refs[0].id : null;
        const rid = firstRefId ?
            this.checkIdNotExists(dom, firstRefId, seq) :
            (options.bookFallbackRefId || this.bibIdFromIndex(seq, false));

        return {
            rid,
            label: String(lab),
            seq
        };
    }


    getNextReferenceIdentity(refList, options = {}) {
        if (!refList) {
            const isJournal = this.resolveIsJournal(options);
            return {
                rid: isJournal ? 'CIT0001' : this.bibIdFromIndex(1, false),
                label: '1',
                displayLabel: '1'
            };
        }

        const isJournal = this.resolveIsJournal(options);
        const dom = options.documentRoot || this.getEditorDocumentRoot() || refList.ownerDocument;
        const refs = Array.from(refList.querySelectorAll('div.ref[id]'));
        const lastRef = options.lastRef || (refs.length ? refs[refs.length - 1] : null);
        const startIdx = refs.length;

        const identity = isJournal ?
            this.getNextJournalReferenceIdentity(startIdx, dom, options) :
            this.getNextBookReferenceIdentity(refList, dom, options);

        const displayLabel = this.formatReferenceLabel(identity.label, {
            ...options,
            lastRef,
            globalObject: options.globalObject || this.globalObject
        });

        return {
            ...identity,
            displayLabel
        };
    }

    escapeClassSelector(token) {
        if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(token);
        return String(token || '').replace(/([^a-zA-Z0-9_-])/g, '\\$1');
    }

    buildCitationSyncDetails(state = {}) {
        const ref = state.ref || {};
        const rid = String(ref.id || state.rid || '').trim();
        if (!rid) return null;

        const changed = {};
        const surnames = [];
        (state.fields || []).forEach((field) => {
            if (!field || field.virtual) return;
            const token = field.token;
            const groupType = field.groupType || 'author';
            const oldValue = this.normalizeSpace(field.originalText || field.original);
            const newValue = this.normalizeSpace(field.value != null ? field.value : field._previewValue);
            if (!oldValue || !newValue || oldValue === newValue) return;
            if ((token === 'surname' || token === 'string-name') && groupType === 'author') {
                surnames.push({
                    old: oldValue,
                    new: newValue,
                    nameIndex: field.nameIndex
                });
            }
            if (token === 'year') {
                changed.year = {
                    old: oldValue,
                    new: newValue
                };
            }
        });
        if (surnames.length) changed.surnames = surnames;
        if (!Object.keys(changed).length) return null;

        return {
            rid,
            source: 'refBridge',
            changed,
            pubType: state.refType || state.pubType || ''
        };
    }

    resolveMissingElements(queryInput) {
        const text = this.queryInputToText(queryInput).toLowerCase();
        if (!text) return [];
        const seen = new Set();
        const fields = [];
        const matchesPart = (part) => {
            if (part === 'publisher' && /publisher\s+(location|loc|name)/.test(text)) return false;
            if (part === 'page number' && /(end|closing)\s+page\s+number/.test(text)) return false;
            return text.indexOf(part) !== -1;
        };

        Object.keys(this.missingTextMap).forEach((pattern) => {
            const token = this.missingTextMap[pattern];
            const matched = pattern.split('|').some(matchesPart);
            if (!matched || seen.has(token)) return;
            seen.add(token);
            fields.push({
                token,
                styleId: token,
                label: this.labelForToken(token),
                missing: true,
                source: 'default'
            });
        });

        return fields.sort((a, b) => this.getFieldOrder(a.token) - this.getFieldOrder(b.token));
    }

    mergeMissingFields(fields = [], missingFields = []) {
        const out = fields.slice();
        missingFields.forEach((missing) => {
            const existing = out.find((field) => field.token === missing.token);
            if (existing) {
                existing.missing = true;
                return;
            }
            out.push({
                ...missing,
                order: this.getFieldOrder(missing.token)
            });
        });
        return out.sort((a, b) => this.getFieldOrder(a.token, a.order) - this.getFieldOrder(b.token, b.order));
    }

    resolveDelimiter(first, next, delimiters = {}, firstStyleId, nextStyleId) {
        if (firstStyleId && nextStyleId != null) {
            const styleKey = `${firstStyleId}->${nextStyleId}`;
            if (Object.prototype.hasOwnProperty.call(delimiters, styleKey)) return delimiters[styleKey];
        }
        const key = `${first}->${next}`;
        if (Object.prototype.hasOwnProperty.call(delimiters, key)) return delimiters[key];
        return first && next ? ' ' : '';
    }

    getStylePattern(refType) {
        const doc = this.globalObject.iREF_SCOPE && this.globalObject.iREF_SCOPE.DOC;
        if (!doc || !doc.querySelector) return null;
        const key = this.refTypeToStyleName(refType);
        return doc.querySelector(`style[name="${key}"]`) || doc.querySelector(`style[name="${refType}"]`);
    }

    // Reads AddBefore/AddAfter and SingleQuoteEndPunc/RemoveEndPuncOnSingleQuote from the CEG
    // <punctuation> element. Callers use getEffectiveAddAfter() to apply the end-punc rule.
    getPunctuationRule(refType, styleId) {
        const style = this.getStylePattern(refType);
        if (!style || !styleId) return null;
        const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(styleId) : styleId;
        const el = style.querySelector(`punctuation[style="${escaped}"]`);
        if (!el) return null;
        const addBefore = el.getAttribute('AddBefore') || '';
        const addAfter = el.getAttribute('AddAfter') || '';
        const endPunc = el.getAttribute('SingleQuoteEndPunc') || '';
        const removeEndPunc = el.getAttribute('RemoveEndPuncOnSingleQuote') || '';
        if (!addBefore && !addAfter) return null;
        return {
            addBefore,
            addAfter,
            endPunc,
            removeEndPunc
        };
    }

    // Document-sourced fields only know their leaf token (e.g. 'chapter-title'), not the raw CEG
    // styleId (e.g. '‡ref_titleChapter') that getPunctuationRule keys on -- this resolves a rule by
    // token instead, for wrapText capture/tracking (see getDocumentWrapText/applyPunctuationWrapTracking).
    getPunctuationRuleForToken(refType, token) {
        const style = this.getStylePattern(refType);
        if (!style || !token) return null;
        const match = Array.from(style.querySelectorAll('punctuation')).find(
            (el) => this.styleIdToToken(el.getAttribute('style')) === token
        );
        if (!match) return null;
        const addBefore = match.getAttribute('AddBefore') || '';
        const addAfter = match.getAttribute('AddAfter') || '';
        const endPunc = match.getAttribute('SingleQuoteEndPunc') || '';
        const removeEndPunc = match.getAttribute('RemoveEndPuncOnSingleQuote') || '';
        if (!addBefore && !addAfter) return null;
        return {
            addBefore,
            addAfter,
            endPunc,
            removeEndPunc
        };
    }

    // Returns the leaf's semantic text value stripped of any embedded addBefore/addAfter wrap
    // characters, for use as the input to getEffectiveAddAfter's SingleQuoteEndPunc test.
    // Works for both fresh rebuild nodes (no embedded wrap) and legacy document-sourced nodes
    // (wrap chars encoded inside the textContent rather than as adjacent text nodes).
    getLeafRawText(leaf, rule) {
        let content = (leaf && leaf.textContent) ? leaf.textContent : '';
        if (!rule) return content;
        if (rule.addBefore && content.startsWith(rule.addBefore)) {
            content = content.slice(rule.addBefore.length);
        }
        // Strip only the very last character of addAfter (the closing quote, e.g. '\u201d').
        // We do not strip the full addAfter (e.g. '."') because that would incorrectly eat
        // a title that happens to end with a period.
        const closingChar = rule.addAfter ? rule.addAfter.slice(-1) : '';
        if (closingChar && content.endsWith(closingChar)) {
            content = content.slice(0, -1);
        }
        return content;
    }

    // Applies SingleQuoteEndPunc/RemoveEndPuncOnSingleQuote to compute the effective addAfter
    // for a given raw leaf text. If rawText ends with a SingleQuoteEndPunc pattern (e.g. '?'),
    // strips RemoveEndPuncOnSingleQuote matches (e.g. '.') from addAfter ('."' -> '"').
    // Returns rule.addAfter unchanged when no SingleQuoteEndPunc rule is configured or matches.
    getEffectiveAddAfter(rule, rawText) {
        if (!rule || !rule.addAfter) return '';
        if (!rule.endPunc || !rule.removeEndPunc) return rule.addAfter;
        try {
            const endPuncRe = new RegExp(`(?:${rule.endPunc})$`);
            if (!endPuncRe.test(rawText)) return rule.addAfter;
            const removeRe = new RegExp(rule.removeEndPunc, 'g');
            return rule.addAfter.replace(removeRe, '');
        } catch (e) {
            ErrorLogTrace('getEffectiveAddAfter', e);
            return rule.addAfter;
        }
    }

    isPunctuationAlreadyPresent(leafElement, rule) {
        if (!leafElement || !rule) return {
            before: false,
            after: false
        };
        const content = leafElement.textContent || '';
        const rawText = this.getLeafRawText(leafElement, rule);
        const effectiveAddAfter = this.getEffectiveAddAfter(rule, rawText);
        return {
            before: rule.addBefore && content.startsWith(rule.addBefore),
            after: effectiveAddAfter && content.endsWith(effectiveAddAfter)
        };
    }

    getPageElideRule(refType) {
        const style = this.getStylePattern(refType);
        if (!style) return null;
        const el = style.querySelector('elide[first="‡ref_pageFirst"][next="‡ref_pageLast"]');
        if (!el) return null;
        return {
            trim: el.getAttribute('trim') || '',
            expand: el.getAttribute('expand') || ''
        };
    }

    refTypeToStyleName(refType) {
        const map = {
            journal: 'Journal-Ref',
            book: 'Book-Ref',
            'ed-book': 'EditedBook-Ref'
        };
        return map[String(refType || '').toLowerCase()] || refType;
    }

    styleIdToToken(styleId) {
        const map = {
            '‡ref_auSurname': 'surname',
            '‡ref_auGivenName': 'given-names',
            '‡ref_auSuffix': 'suffix',
            '‡ref_auCollab': 'collab',
            '‡ref_etal': 'etal',
            '‡ref_edGivenName': 'editor-given-names',
            '‡ref_edSurname': 'editor-surname',
            '‡ref_edSuffix': 'editor-suffix',
            '‡ref_trGivenName': 'translator-given-names',
            '‡ref_trSurname': 'translator-surname',
            '‡ref_trSuffix': 'translator-suffix',
            '‡ref_titleArticle': 'article-title',
            '‡ref_titleChapter': 'chapter-title',
            '‡ref_titleJournal': 'source',
            '‡ref_titleBook': 'source',
            '‡ref_source': 'source',
            '‡ref_pubdateYear': 'year',
            '‡ref_year': 'year',
            '‡ref_volumeNumber': 'volume',
            '‡ref_volume': 'volume',
            '‡ref_issueNumber': 'issue',
            '‡ref_issue': 'issue',
            '‡ref_pageFirst': 'fpage',
            '‡ref_fpage': 'fpage',
            '‡ref_pageLast': 'lpage',
            '‡ref_lpage': 'lpage',
            '‡ref_publisherName': 'publisher-name',
            '‡ref_publisherLocation': 'publisher-loc',
            '‡ref_publisherLoc': 'publisher-loc',
            '‡ref_edition': 'edition',
            '‡ref_supplement': 'supplement',
            '‡ref_idDOI': 'doi',
            '‡ref_URL': 'ext-link',
            '‡ref_accessDate': 'comment'
        };
        return map[styleId] || '';
    }

    applyReferenceAbbreviationOutput(values = {}, template = {}, refType = 'journal') {
        const abbreviation = template && template.abbreviation;
        if (!abbreviation || abbreviation.output !== 'EXP') return values;
        if (String(refType || '').toLowerCase() !== 'journal') return values;
        if (abbreviation.expansionToken !== 'source') return values;

        const currentValue = values.source;
        const expanded = this.resolveFullJournalTitle(currentValue);
        if (expanded === currentValue) return values;
        return {
            ...values,
            source: expanded
        };
    }

    resolveFullJournalTitle(value) {
        const text = String(value == null ? '' : value);
        const key = this.normalizeAbbreviationLookupKey(text);
        if (!key) return value;
        const lookup = this.getAbbreviationLookup();
        return lookup && lookup.get(key) || value;
    }

    getAbbreviationLookup() {
        if (this._abbreviationLookup) return this._abbreviationLookup;

        const lookup = new Map();
        const text = this.getAbbreviationSourceText();
        String(text || '').split(/\r?\n/).forEach((line) => {
            const cleanLine = line.replace(/^[{\s]+|[}\s]+$/g, '');
            if (!cleanLine || /^Journal full name/i.test(cleanLine)) return;
            const columns = cleanLine.split('\t').map((item) => this.normalizeSpace(item)).filter(Boolean);
            if (columns.length < 2) return;

            const fullTitle = columns[0];
            columns.forEach((item) => {
                const key = this.normalizeAbbreviationLookupKey(item);
                if (key && !lookup.has(key)) lookup.set(key, fullTitle);
            });
        });

        this._abbreviationLookup = lookup;
        return lookup;
    }

    getAbbreviationSourceText() {
        const globalObject = this.globalObject || {};
        const injected = this.normalizeAbbreviationSource(globalObject.REFERENCE_ABBR_BANK) ||
            this.normalizeAbbreviationSource(globalObject.REF_ABBR_JSON_TEXT) ||
            this.normalizeAbbreviationSource(globalObject.REF_ABBR_TEXT) ||
            this.normalizeAbbreviationSource(globalObject.ABBR_JSON_TEXT);
        if (injected) return injected;
        if (typeof process !== 'undefined' && process.versions && process.versions.node) return '';

        const xhrCtor = globalObject.XMLHttpRequest ||
            (typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest : null);
        if (!xhrCtor) return '';

        const paths = [
            'src/clientconfig/journals/abbr.json',
            'clientconfig/journals/abbr.json'
        ];
        for (let i = 0; i < paths.length; i += 1) {
            try {
                const xhr = new xhrCtor();
                xhr.open('GET', paths[i], false);
                xhr.send(null);
                if ((xhr.status === 0 || xhr.status >= 200 && xhr.status < 300) && xhr.responseText) {
                    return xhr.responseText;
                }
            } catch (err) {
                /* try next path */
            }
        }
        return '';
    }

    normalizeAbbreviationSource(source) {
        if (source == null) return '';
        if (typeof source === 'string') return source;
        if (Array.isArray(source)) return source.map((item) => this.normalizeAbbreviationSource(item)).filter(Boolean).join('\n');
        if (typeof source === 'object') {
            if (typeof source.text === 'string') return source.text;
            if (typeof source.responseText === 'string') return source.responseText;
            if (typeof source.data === 'string') return source.data;
            if (typeof source.content === 'string') return source.content;
            return Object.values(source).map((item) => this.normalizeAbbreviationSource(item)).filter(Boolean).join('\n');
        }
        return String(source);
    }

    normalizeAbbreviationLookupKey(value) {
        return String(value == null ? '' : value)
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .toLowerCase()
            .replace(/[\s!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~\-–—]+/g, '');
    }

    getLeafSelector() {
        return '.surname, .given-names, .collab, .article-title, .chapter-title, .source, .year, .volume, .issue, .fpage, .lpage, .publisher-name, .publisher-loc, .edition, .comment, .ext-link, .pub-id, .uri, .object-id, .etal, .supplement';
    }

    getTokenFromElement(el) {
        if (!el) return '';
        const token = el.getAttribute('data-name') || String(el.className || '').split(/\s+/)[0] || '';
        if (!this.isLinkFieldToken(token)) return token;
        return this.resolveReferenceLinkField({
            element: el,
            expectedType: token
        }).token;
    }

    findLeafForToken(root, token) {
        if (this.isLinkFieldToken(token)) {
            return findReferenceLinkLeaf(root, token, {
                globalObject: this.globalObject,
                hyperlinkDialog: this.resolveHyperlinkDialog()
            });
        }
        return root.querySelector(`.${this.escapeClassSelector(token)}`);
    }

    // Style order lists ‡ref_URL as token ext-link; document/hyperlink leaves may still be uri.
    // Treat them as the same slot for orphan membership so uri is not standing-deleted.
    isTokenInStyleOrder(token, orderTokens) {
        if (!token) return false;
        const set = orderTokens instanceof Set ? orderTokens : new Set(orderTokens || []);
        if (set.has(token)) return true;
        if (token === 'uri' && set.has('ext-link')) return true;
        if (token === 'ext-link' && set.has('uri')) return true;
        return false;
    }

    getDocumentDelimiters(fields) {
        const out = {};
        for (let index = 0; index < fields.length - 1; index += 1) {
            const first = fields[index];
            const next = fields[index + 1];
            out[`${first.token}->${next.token}`] = this.getDelimiterBetween(first.element, next.element);
        }
        return out;
    }

    // Only emits an entry for a token that actually has a CEG <punctuation> rule -- a leaf's
    // adjacent text otherwise IS delimiter territory (applyDelimiterTracking's job), and walking
    // all the way to the next leaf here would swallow that delimiter text as if it were wrap.
    // When a rule exists, only the rule-length slice nearest the leaf is captured; parsed HTML
    // merges adjacent text runs into one node, so a bounded chain-walk plus a length-based peel is
    // what distinguishes "the wrap" from "the delimiter that happens to sit right next to it".
    getDocumentWrapText(fields, refType) {
        const out = {};
        (fields || []).forEach((field) => {
            if (!field || !field.token || !field.element) return;
            const rule = this.getPunctuationRuleForToken(refType, field.token);
            if (!rule) return;
            const fullBefore = rule.addBefore ? this.getAdjacentText(field.element, 'before') : '';
            const rawText = this.getLeafRawText(field.element, rule);
            const effectiveAddAfter = this.getEffectiveAddAfter(rule, rawText);
            const fullAfter = effectiveAddAfter ? this.getAdjacentText(field.element, 'after') : '';
            out[field.token] = {
                before: rule.addBefore ? fullBefore.slice(fullBefore.length - rule.addBefore.length) : '',
                after: effectiveAddAfter ? fullAfter.slice(0, effectiveAddAfter.length) : ''
            };
        });
        return out;
    }

    // Single sibling-chain walk shared by getDelimiterBetween and applyDelimiterTracking. Returns
    // the concatenated Text-node content strictly between `first` and `next`; with
    // `collectNodes: true` also returns those Text nodes themselves (for removal/replacement) so
    // callers that need both never have to walk the same chain twice.
    getTextBetween(first, next, options = {}) {
        if (!first || !next) return options.collectNodes ? {
            text: '',
            nodes: []
        } : '';
        let node = first.nextSibling;
        let text = '';
        const nodes = options.collectNodes ? [] : null;
        while (node && node !== next) {
            if (node.nodeType === 3) {
                text += node.nodeValue || '';
                if (nodes) nodes.push(node);
            }
            node = node.nextSibling;
        }
        return options.collectNodes ? {
            text,
            nodes
        } : text;
    }

    // Single-leaf sibling-chain walk, analogous to getTextBetween but for one leaf's own boundary
    // (used for CEG <punctuation AddBefore/AddAfter> tracking) -- stops at the first Element node
    // encountered (another leaf, or the edge of .mixed-citation) instead of a fixed `next` anchor.
    getAdjacentText(el, direction, options = {}) {
        if (!el) return options.collectNodes ? {
            text: '',
            nodes: []
        } : '';
        const forward = direction !== 'before';
        let node = forward ? el.nextSibling : el.previousSibling;
        let text = '';
        const nodes = options.collectNodes ? [] : null;
        while (node && node.nodeType !== 1) {
            if (node.nodeType === 3) {
                const value = node.nodeValue || '';
                text = forward ? text + value : value + text;
                if (nodes) forward ? nodes.push(node) : nodes.unshift(node);
            }
            node = forward ? node.nextSibling : node.previousSibling;
        }
        return options.collectNodes ? {
            text,
            nodes
        } : text;
    }

    getDelimiterBetween(first, next) {
        if (!first || !next || !first.parentNode) return ' ';
        return this.getTextBetween(first, next) || ' ';
    }

    // A leaf whose token is absent from the active CEG style's declared field order (e.g.
    // publisher-loc for Book-Ref) is real document content the style never accounted for -- it
    // has nowhere correct to render and no config-driven delimiter rule to compare against. Rather
    // than leave it in its arbitrary document position (or drop it, the prior bug), relocate it --
    // together with its own leading delimiter text, so the fragment stays reviewable as one unit --
    // to the end of the citation, wrapped in <del> to flag it for manual reviewer decision. This is
    // a standing flag, not a one-time diff: it reapplies on every submit for as long as the leaf
    // remains outside the style's order, with no <insert> counterpart (nothing to insert -- there is
    // no config-declared position for this content to move into).
    relocateOrphanFieldsToEnd(mixed, refType) {
        if (!mixed || !mixed.children) return false;
        const doc = mixed.ownerDocument;
        const configTemplate = this.getConfigTemplate(refType);
        // No real CEG style loaded (getStylePattern() found nothing, so getConfigTemplate() fell
        // back to its empty template) -- an empty orderTokens set here would make every leaf look
        // orphaned, which is a false positive: we simply have no declared order to compare against,
        // not evidence that nothing belongs. Skip relocation entirely in that case.
        if (!configTemplate.fields || !configTemplate.fields.length) return false;
        const orderTokens = new Set(configTemplate.fields.map((field) => field && field.token).filter(Boolean));
        const leaves = Array.from(mixed.querySelectorAll(this.getLeafSelector()))
            .filter((el) => !(el.closest && el.closest('.person-group')));
        const orphanLeaves = leaves.filter((leaf) => {
            const token = this.getTokenFromElement(leaf);
            return !!(token && !this.isTokenInStyleOrder(token, orderTokens));
        });
        let changed = false;

        orphanLeaves.forEach((leaf, index) => {
            if (!mixed.contains(leaf)) return;
            const token = this.getTokenFromElement(leaf);

            const delimNode = leaf.previousSibling && leaf.previousSibling.nodeType === 3 ? leaf.previousSibling : null;
            const delimText = delimNode ? (delimNode.nodeValue || '') : '';

            if (delimNode) mixed.removeChild(delimNode);
            mixed.removeChild(leaf);

            const wrapper = this.createTrackManagerNode('del', doc, {
                'data-track-code': 'ref-text-del-01'
            }) || doc.createElement('del');
            if (!wrapper.getAttribute('data-track-code')) wrapper.setAttribute('data-track-code', 'ref-text-del-01');
            if (delimText) wrapper.appendChild(doc.createTextNode(delimText));
            wrapper.appendChild(leaf);

            // The last orphan (in relocation order) becomes the true tail of the rebuilt
            // citation. Give it the same terminal punctuation a normally-declared last field
            // would get (mirrors renderCitationSlots' `!next` branch) so the citation still
            // ends correctly if this standing delete flag is ever rejected (orphan kept)
            // instead of accepted -- there being no <insert> counterpart to restore it, it must
            // already be complete on its own.
            if (index === orphanLeaves.length - 1) {
                // The orphan itself has no CEG-declared position, so it never has its own
                // "token->'' " terminal rule to look up (that's exactly why it's an orphan).
                // Reuse the style's actual last declared field's terminal rule instead -- the
                // citation's general closing-punctuation convention (almost always ".") applies
                // regardless of which field ends up last after relocation.
                const orderedFields = (configTemplate.fields || []).filter((field) => field && field.token);
                const lastOrderedField = orderedFields[orderedFields.length - 1];
                let terminalDelim = '';
                if (lastOrderedField) {
                    const lastStyleId = this.resolveFieldStyleId(lastOrderedField, null, refType);
                    terminalDelim = this.resolveDelimiter(
                        lastOrderedField.token, '', configTemplate.delimiters, lastStyleId, ''
                    );
                }
                terminalDelim = this.collapseRedundantDelimiterDot(terminalDelim, leaf);
                if (terminalDelim) wrapper.appendChild(doc.createTextNode(terminalDelim));
            }

            mixed.appendChild(wrapper);
            changed = true;
        });

        return changed;
    }

    // Boundary-based delimiter tracking: compares each adjacent-leaf-pair's delimiter text in the
    // freshly rebuilt mixed-citation against the same boundary's original text (from the source
    // document, keyed by adjacent token pair). Only touches boundaries that existed originally and
    // whose text actually changed — matches the leaf-level insert/del convention already used
    // elsewhere. oldValueTrackingDel/newValuesTrackingInsert default true (edit and query mode both).
    applyDelimiterTracking(mixed, originalDelimiters = {}, options = {}) {
        if (!mixed || !mixed.children) return false;
        const trackOld = options.oldValueTrackingDel !== false;
        const trackNew = options.newValuesTrackingInsert !== false;
        const doc = mixed.ownerDocument;
        let changed = false;

        const leaves = Array.from(mixed.children).filter((el) => this.getTokenFromElement(el));
        for (let i = 0; i < leaves.length - 1; i += 1) {
            const first = leaves[i];
            const next = leaves[i + 1];
            const key = `${this.getTokenFromElement(first)}->${this.getTokenFromElement(next)}`;
            const originalDelim = Object.prototype.hasOwnProperty.call(originalDelimiters, key) ?
                originalDelimiters[key] : null;
            if (originalDelim == null) continue;

            const {
                text: currentDelim,
                nodes: textNodes
            } = this.getTextBetween(first, next, {
                collectNodes: true
            });
            if (currentDelim === originalDelim) continue;

            textNodes.forEach((node) => mixed.removeChild(node));
            if (originalDelim) {
                mixed.insertBefore(
                    trackOld ? this.createTrackNode('del', originalDelim, doc) : doc.createTextNode(originalDelim),
                    next
                );
            }
            if (currentDelim) {
                mixed.insertBefore(
                    trackNew ? this.createTrackNode('insert', currentDelim, doc) : doc.createTextNode(currentDelim),
                    next
                );
            }
            changed = true;
        }
        return changed;
    }

    // Punctuation-wrap analogue of applyDelimiterTracking: compares each leaf's own
    // before/after boundary text (already rendered by renderCitationSlots via
    // getPunctuationRule) against the document's original boundary text, and wraps only the
    // boundary text nodes that differ. Never touches the leaf's own innerHTML/textContent.
    // Peels exactly `wrapLen` characters off the near edge of a leaf's adjacent text and isolates
    // them into their own Text node via splitText, leaving whatever text precedes/follows (real
    // delimiter content, possibly sharing the same merged node -- true whenever the DOM came from
    // HTML string parsing, which coalesces adjacent character data into one node, e.g. any
    // existing stored citation) completely untouched. Returns the isolated node, or null if there
    // is nothing there to isolate.
    isolateWrapNode(leaf, side, wrapLen) {
        if (wrapLen <= 0) return null;
        const nodes = side === 'before' ?
            (leaf.previousSibling && leaf.previousSibling.nodeType === 3 ? [leaf.previousSibling] : []) :
            (leaf.nextSibling && leaf.nextSibling.nodeType === 3 ? [leaf.nextSibling] : []);
        if (!nodes.length) return null;
        const node = nodes[0];
        const len = (node.nodeValue || '').length;
        const clampedLen = Math.min(wrapLen, len);
        if (side === 'before') {
            const splitAt = len - clampedLen;
            return splitAt > 0 ? node.splitText(splitAt) : node;
        }
        if (clampedLen < len) node.splitText(clampedLen);
        return node;
    }

    applyPunctuationWrapTracking(mixed, originalWrapText = {}, refType = 'journal', options = {}) {
        if (!mixed || !mixed.children) return false;
        const trackOld = options.oldValueTrackingDel !== false;
        const trackNew = options.newValuesTrackingInsert !== false;
        const doc = mixed.ownerDocument;
        let changed = false;

        const leaves = Array.from(mixed.children).filter((el) => this.getTokenFromElement(el));
        leaves.forEach((leaf) => {
            const token = this.getTokenFromElement(leaf);
            if (!Object.prototype.hasOwnProperty.call(originalWrapText, token)) return;
            const rule = this.getPunctuationRuleForToken(refType, token);
            if (!rule) return;
            const alreadyPresent = this.isPunctuationAlreadyPresent(leaf, rule);
            const original = originalWrapText[token] || {};

            const rawText = this.getLeafRawText(leaf, rule);
            const effectiveAddAfter = this.getEffectiveAddAfter(rule, rawText);

            ['before', 'after'].forEach((side) => {
                const isBeforeSide = side === 'before';
                const alreadyInContent = isBeforeSide ? alreadyPresent.before : alreadyPresent.after;
                if (alreadyInContent) return;
                const ruleText = isBeforeSide ? rule.addBefore : effectiveAddAfter;
                if (!ruleText) return;
                const originalText = original[side] || '';
                const wrapNode = this.isolateWrapNode(leaf, side, ruleText.length);
                const currentText = wrapNode ? (wrapNode.nodeValue || '') : '';
                if (currentText === originalText) return;

                const anchor = side === 'before' ? leaf : (wrapNode ? wrapNode.nextSibling : leaf.nextSibling);
                if (wrapNode) mixed.removeChild(wrapNode);
                if (originalText) {
                    mixed.insertBefore(
                        trackOld ? this.createTrackNode('del', originalText, doc) : doc.createTextNode(originalText),
                        anchor
                    );
                }
                if (currentText) {
                    mixed.insertBefore(
                        trackNew ? this.createTrackNode('insert', currentText, doc) : doc.createTextNode(currentText),
                        anchor
                    );
                }
                changed = true;
            });
        });

        return changed;
    }

    buildTemplateCatalog(refNode) {
        const root = refNode && refNode.closest ? refNode.closest('.ref-list') : null;
        if (!root || !root.querySelectorAll) return [];
        return Array.from(root.querySelectorAll('.mixed-citation')).map((mixed) => ({
            refType: this.getRefType(mixed),
            fields: this.getDocumentTemplate({
                querySelector: () => mixed
            }, this.getRefType(mixed)).fields
        }));
    }

    getRefType(refNode) {
        const ref = this.unwrapNode(refNode);
        const mixed = ref && ref.matches && ref.matches('.mixed-citation') ? ref :
            ref && ref.querySelector ? ref.querySelector('.mixed-citation') : null;
        return mixed ? (mixed.getAttribute('publication-type') || '') : '';
    }

    getVisibleText(el) {
        if (!el) return '';
        const insert = el.querySelector && el.querySelector('insert');
        if (insert) return this.normalizeSpace(insert.textContent);
        const clone = el.cloneNode ? el.cloneNode(true) : null;
        if (clone && clone.querySelectorAll) clone.querySelectorAll('del, delete').forEach((node) => node.remove());
        return this.normalizeSpace((clone || el).textContent);
    }

    isRichLeafToken(token) {
        return !!(token && this.richTitleFieldTokens && this.richTitleFieldTokens.has(token));
    }

    isSummernoteRichLeafToken(token) {
        return token === 'article-title' || token === 'chapter-title' || token === 'source';
    }

    buildDocumentLeafField(el, token, order) {
        const content = this.getLeafFieldContent(el, token);
        const fontMeta = this.readPlainInlineFontMeta(el, token);
        const value = fontMeta ? fontMeta.value : content;
        const trackedOriginal = this.resolveTrackedLeafOriginal(el, token);
        const original = trackedOriginal != null ? trackedOriginal :
            (fontMeta ? fontMeta.original :
                (this.isSummernoteRichLeafToken(token) ? this.getRichLeafOriginalHtml(el) : content));
        const field = {
            token,
            styleId: token,
            value,
            original,
            element: el,
            order
        };
        if (fontMeta) {
            field.formatMode = fontMeta.formatMode;
            field.inlineFormat = fontMeta.inlineFormat;
        }
        return field;
    }

    readPlainInlineFontMeta(el, token) {
        if (!el || !token || this.isSummernoteRichLeafToken(token)) return null;
        try {
            if (!this.hasPreservableInlineFont(el)) return null;
            const inlineFormat = this.captureInlineFormat(el.innerHTML);
            if (!inlineFormat || !inlineFormat.originalHtml) return null;
            const visible = this.normalizeSpace(inlineFormat.originalText);
            if (!visible) return null;
            return {
                formatMode: 'plain-inline-font',
                inlineFormat,
                value: visible,
                original: visible
            };
        } catch (err) {
            if (typeof this.globalObject.ErrorLogTrace === 'function') {
                this.globalObject.ErrorLogTrace('captureInlineFormat', err && err.message);
            }
            return null;
        }
    }

    projectFieldInlineHtml(field, nextPlainText) {
        const next = nextPlainText == null ? '' : String(nextPlainText);
        try {
            return this.projectInlineFormat(field && field.inlineFormat, next);
        } catch (err) {
            if (typeof this.globalObject.ErrorLogTrace === 'function') {
                this.globalObject.ErrorLogTrace('projectInlineFormat', err && err.message);
            }
            return null;
        }
    }

    writeLeafValue(el, field, value, options = {}) {
        if (!el) return;
        const next = value == null ? '' : String(value);
        if (field && field.formatMode === 'plain-inline-font') {
            const html = this.projectFieldInlineHtml(field, next);
            if (html == null) {
                el.textContent = next;
                return;
            }
            el.innerHTML = html;
            return;
        }
        const rich = options.rich != null ? options.rich : this.isRichLeafToken(field && field.token);
        if (rich) el.innerHTML = next;
        else el.textContent = next;
    }

    isBooksGlobal() {
        if (typeof this.globalObject.IS_JOURNAL === 'boolean') return !this.globalObject.IS_JOURNAL;
        if (typeof IS_JOURNAL !== 'undefined') return !IS_JOURNAL;
        return false;
    }

    getLeafInnerHtml(el) {
        if (!el) return '';
        const insert = el.querySelector && el.querySelector('insert');
        if (insert) return String(insert.innerHTML || '').trim();
        const clone = el.cloneNode ? el.cloneNode(true) : null;
        if (clone && clone.querySelectorAll) clone.querySelectorAll('del, delete').forEach((node) => node.remove());
        return String((clone || el).innerHTML || '').trim();
    }

    getRichLeafOriginalHtml(el) {
        if (!el) return '';
        const deleted = el.querySelector && (el.querySelector('del') || el.querySelector('delete'));
        if (deleted) return String(deleted.innerHTML || '').trim();
        return this.getLeafInnerHtml(el);
    }

    // Resolves field.original for a leaf that already carries a pending <insert>/<del> pair from a
    // prior edit round, per the identity-aware rules in
    // docs/superpowers/specs/2026-09-12-identity-aware-tracked-original-design.md. Returns null when
    // there is no insert/del at all, so callers fall through to their existing untracked-leaf logic
    // unchanged. isSameUserTrackNode already returns false when identity cannot be determined at
    // all (no track manager, no commonMethods, or missing data-username/data-rolename) -- that
    // "unknown" case deliberately falls into the different-user branch below, since reverting a
    // visible value back to a stale original the current reader may not know about is the more
    // dangerous default.
    resolveTrackedLeafOriginal(el, token) {
        if (!el || !el.querySelector) return null;
        const insert = el.querySelector('insert');
        const deleted = el.querySelector('del') || el.querySelector('delete');
        if (!insert && !deleted) return null;

        const rich = this.isSummernoteRichLeafToken(token);

        if (!deleted) {
            // insert-only: a pure pending addition, nothing to revert to.
            return this.isSameUserTrackNode(insert) ? '' : this.getTrackNodeContent(insert, rich);
        }

        const identityNode = deleted || insert;
        if (this.isSameUserTrackNode(identityNode)) {
            return this.getTrackNodeContent(deleted, rich);
        }
        return insert ? this.getTrackNodeContent(insert, rich) : this.getTrackNodeContent(deleted, rich);
    }

    trimHtml(value) {
        return String(value == null ? '' : value).trim();
    }

    getLeafFieldContent(el, token) {
        if (this.isSummernoteRichLeafToken(token)) return this.getLeafInnerHtml(el);
        if (this.isLinkFieldToken(token)) {
            return this.resolveReferenceLinkField({
                element: el,
                expectedType: token
            }).value;
        }
        const visible = this.getVisibleText(el);
        return visible;
    }

    normalizeSpace(value) {
        return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    }

    valueForLeafWrite(token, value) {
        if (this.isRichLeafToken(token)) return value == null ? '' : String(value);
        return this.normalizeSpace(value);
    }

    hasLeafWriteContent(token, value) {
        if (this.isRichLeafToken(token)) return String(value == null ? '' : value).trim() !== '';
        return !!this.normalizeSpace(value);
    }

    escapeText(value) {
        return String(value == null ? '' : value).replace(/[&<>]/g, (ch) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        } [ch]));
    }

    labelForToken(token) {
        return String(token || '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (ch) => ch.toUpperCase());
    }

    getFieldOrder(token, explicitOrder) {
        if (explicitOrder != null) return explicitOrder;
        const index = this.defaultFieldOrder.indexOf(token);
        return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    }

    queryInputToText(input) {
        if (!input) return '';
        if (typeof input === 'string') return input;
        if (typeof input.getAttribute === 'function') {
            const userCommentText = input.getAttribute('data-user-comment-box');
            if (userCommentText) return userCommentText;
        }
        if (typeof input.querySelector === 'function') {
            const userCommentNode = input.querySelector('[data-user-comment-box]');
            const userCommentText = userCommentNode && userCommentNode.getAttribute('data-user-comment-box');
            if (userCommentText) return userCommentText;
        }
        const textContent = input.textContent ? String(input.textContent).trim() : '';
        if (textContent) return textContent;
        if (input.$ && typeof input.$.getAttribute === 'function') {
            const userCommentText = input.$.getAttribute('data-user-comment-box');
            if (userCommentText) return userCommentText;
        }
        if (input.$ && typeof input.$.querySelector === 'function') {
            const userCommentNode = input.$.querySelector('[data-user-comment-box]');
            const userCommentText = userCommentNode && userCommentNode.getAttribute('data-user-comment-box');
            if (userCommentText) return userCommentText;
        }
        const wrappedTextContent = input.$ && input.$.textContent ? String(input.$.textContent).trim() : '';
        if (wrappedTextContent) return wrappedTextContent;
        return '';
    }

    unwrapNode(node) {
        return node && node.$ ? node.$ : node;
    }

    callLegacy(globalName, methodName, state, options) {
        const legacy = this.globalObject[globalName];
        if (!legacy || !legacy.M_FUN || typeof legacy.M_FUN[methodName] !== 'function') return false;
        legacy.M_FUN[methodName](state, options);
        return true;
    }

    shouldPromoteToEdBook({
        refType,
        mixed,
        fields
    } = {}) {

        const type = String(refType || '').toLowerCase();
        if (type !== 'book' && type !== 'ed-book') return false;
        if (type === 'ed-book') return true;
        const hasDom = !!(mixed && mixed.querySelector && mixed.querySelector('.chapter-title'));
        const hasField = [].concat(fields || []).some((f) => f && f.token === 'chapter-title');
        return hasDom || hasField;
    }

    resolvePromotedRefType(args = {}) {

        const type = String(args.refType || '').toLowerCase() || 'journal';
        if (type === 'ed-book') return 'ed-book';
        return this.shouldPromoteToEdBook(args) ? 'ed-book' : type;
    }


    /*  */

    escapeText(txt) {
        const value = txt == null ? '' : String(txt);
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    codePoints(str) {
        return Array.from(str == null ? '' : String(str));
    }

    isFontSpan(el) {
        if (!el || el.nodeType !== 1) return false;
        if ((el.tagName || '').toLowerCase() !== 'span') return false;
        const dataName = (el.getAttribute('data-name') || '').toLowerCase();
        return el.classList.contains('font') || dataName === 'font';
    }

    unwrap(el) {
        const parent = el.parentNode;
        if (!parent) {
            el.remove();
            return;
        }
        while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
    }

    sanitizeInPlace(root) {
        root.querySelectorAll('script, style').forEach((node) => node.remove());
        const elements = Array.from(root.querySelectorAll('*')).reverse();
        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            if (isFontSpan(el)) {
                Array.from(el.attributes || []).forEach((attr) => {
                    if (ALLOWED_ATTRS.indexOf(attr.name.toLowerCase()) === -1) {
                        el.removeAttribute(attr.name);
                    }
                });
            } else {
                unwrap(el);
            }
        }
    }

    toSanitizedRoot(elementOrHtml) {
        const root = document.createElement('div');
        if (elementOrHtml && elementOrHtml.nodeType === 1) {
            root.appendChild(elementOrHtml.cloneNode(true));
        } else {
            root.innerHTML = elementOrHtml == null ? '' : String(elementOrHtml);
        }
        this.sanitizeInPlace(root);
        return root;
    }

    findFontSpan(root) {
        if (isFontSpan(root)) return root;
        return root.querySelector ? root.querySelector(FONT_SELECTOR) : null;
    }

    collectTextNodes(root) {
        const nodes = [];

        function walk(node) {
            if (node.nodeType === 3) {
                nodes.push(node);
                return;
            }
            const children = Array.from(node.childNodes);
            for (let i = 0; i < children.length; i++) {
                walk(children[i]);
            }
        }
        walk(root);
        return nodes;
    }

    getWholeFieldFontSpan(root) {
        const children = Array.from(root.childNodes).filter((n) => {
            if (n.nodeType === 3) return (n.textContent || '').length > 0;
            return n.nodeType === 1;
        });
        if (children.length !== 1 || !this.isFontSpan(children[0])) return null;
        const wrap = children[0];
        const fieldText = root.textContent || '';
        if (!fieldText || (wrap.textContent || '') !== fieldText) return null;
        return wrap;
    }

    regionForIndex(index, prefixLen, middleEnd) {
        if (index < prefixLen) return 'prefix';
        if (index < middleEnd) return 'middle';
        return 'suffix';
    }

    splitTextNodesByRegion(root, prefixLen, middleEnd) {
        const labeled = [];
        const nodes = this.collectTextNodes(root);
        let cpOffset = 0;
        for (let n = 0; n < nodes.length; n++) {
            const node = nodes[n];
            const pts = this.codePoints(node.textContent || '');
            if (!pts.length) {
                labeled.push({
                    node: node,
                    region: 'middle'
                });
                continue;
            }
            const slices = [];
            let i = 0;
            while (i < pts.length) {
                const region = this.regionForIndex(cpOffset + i, prefixLen, middleEnd);
                let j = i + 1;
                while (j < pts.length && this.regionForIndex(cpOffset + j, prefixLen, middleEnd) === region) {
                    j++;
                }
                slices.push({
                    region: region,
                    text: pts.slice(i, j).join('')
                });
                i = j;
            }
            cpOffset += pts.length;
            if (slices.length === 1) {
                labeled.push({
                    node: node,
                    region: slices[0].region
                });
                continue;
            }
            const parent = node.parentNode;
            if (!parent) continue;
            for (let s = 0; s < slices.length; s++) {
                const tn = document.createTextNode(slices[s].text);
                parent.insertBefore(tn, node);
                labeled.push({
                    node: tn,
                    region: slices[s].region
                });
            }
            parent.removeChild(node);
        }
        return labeled;
    }

    commonPrefixSuffix(aPts, bPts) {
        let prefix = 0;
        while (prefix < aPts.length && prefix < bPts.length && aPts[prefix] === bPts[prefix]) {
            prefix++;
        }
        let suffix = 0;
        while (suffix < aPts.length - prefix && suffix < bPts.length - prefix && aPts[aPts.length - 1 - suffix] === bPts[bPts.length - 1 - suffix]) {
            suffix++;
        }
        return {
            prefix: prefix,
            suffix: suffix
        };
    }

    pruneEmptyFontSpans(root, keepSpan) {
        const spans = Array.from(root.querySelectorAll(FONT_SELECTOR));
        spans.reverse();
        for (let i = 0; i < spans.length; i++) {
            const span = spans[i];
            if (span === keepSpan) continue;
            if ((span.textContent || '') === '') {
                this.unwrap(span);
            }
        }
    }

    climbOutOfSideFonts(node, root, wholeFieldSpan, toward) {
        let current = node;
        while (current.parentNode && current.parentNode !== root) {
            const parent = current.parentNode;
            if (parent === wholeFieldSpan) break;
            if (toward === 'suffix' ? current.previousSibling : current.nextSibling) break;
            if (!this.isFontSpan(parent)) break;
            current = parent;
        }
        return current;
    }

    insertMiddleText(root, labeled, nextMiddle, wholeFieldSpan) {
        if (!nextMiddle) return;
        const insertNode = document.createTextNode(nextMiddle);
        let firstSuffix = null;
        let lastPrefix = null;
        for (let i = 0; i < labeled.length; i++) {
            if (labeled[i].region === 'suffix' && !firstSuffix) firstSuffix = labeled[i].node;
            if (labeled[i].region === 'prefix') lastPrefix = labeled[i].node;
        }
        if (firstSuffix && firstSuffix.parentNode) {
            const anchor = this.climbOutOfSideFonts(firstSuffix, root, wholeFieldSpan, 'suffix');
            if (anchor.parentNode) {
                anchor.parentNode.insertBefore(insertNode, anchor);
                return;
            }
        }
        if (lastPrefix && lastPrefix.parentNode) {
            const anchor = this.climbOutOfSideFonts(lastPrefix, root, wholeFieldSpan, 'prefix');
            if (anchor.parentNode) {
                anchor.parentNode.insertBefore(insertNode, anchor.nextSibling);
                return;
            }
        }
        if (wholeFieldSpan) {
            wholeFieldSpan.appendChild(insertNode);
            return;
        }
        root.appendChild(insertNode);
    }

    hasPreservableInlineFont(elementOrHtml) {
        try {
            if (elementOrHtml == null || elementOrHtml === '') return false;
            const root = this.toSanitizedRoot(elementOrHtml);
            return !!this.findFontSpan(root);
        } catch (_err) {
            return false;
        }
    }

    captureInlineFormat(originalHtml) {
        try {
            const root = this.toSanitizedRoot(originalHtml);
            return {
                originalHtml: root.innerHTML,
                originalText: root.textContent || ''
            };
        } catch (_err) {
            const text = originalHtml == null ? '' : String(originalHtml);
            return {
                originalHtml: '',
                originalText: text
            };
        }
    }

    projectInlineFormat(snapshot, nextPlainText) {
        const next = nextPlainText == null ? '' : String(nextPlainText);
        try {
            if (!snapshot || typeof snapshot !== 'object') {
                return this.escapeText(next);
            }
            const originalHtml = snapshot.originalHtml == null ? '' : String(snapshot.originalHtml);
            const originalText = snapshot.originalText == null ? '' : String(snapshot.originalText);
            if (next === originalText) {
                return originalHtml;
            }

            const root = this.toSanitizedRoot(originalHtml);
            const origPts = codePoints(originalText);
            const nextPts = this.codePoints(next);
            if (origPts.join('') !== (root.textContent || '')) {
                return this.escapeText(next);
            }

            const {
                prefix,
                suffix
            } = this.commonPrefixSuffix(origPts, nextPts);
            const middleEnd = origPts.length - suffix;
            const nextMiddle = nextPts.slice(prefix, nextPts.length - suffix).join('');
            const wholeFieldSpan = this.getWholeFieldFontSpan(root);

            const labeled = this.splitTextNodesByRegion(root, prefix, middleEnd);
            for (let i = 0; i < labeled.length; i++) {
                if (labeled[i].region === 'middle' && labeled[i].node.parentNode) {
                    labeled[i].node.parentNode.removeChild(labeled[i].node);
                }
            }
            this.insertMiddleText(root, labeled, nextMiddle, wholeFieldSpan);
            this.pruneEmptyFontSpans(root, wholeFieldSpan);
            return root.innerHTML;
        } catch (_err) {
            return this.escapeText(next);
        }
    }

}

const refBridge = RefBridge.create();

function createCrossRefLegacyShim(bridge) {
    return {
        M_SCOPE: {
            initiated: false,
            VALID_KEYS: [],
            ASSIGN_KEY: {}
        },
        M_CONFIG: {
            PID: null,
            POST_PARAMS_DOI: {
                format: 'json',
                endpoint: 'search/doi',
                method: 'fetchdoi'
            }
        },
        init() {
            bridge.loadCrossRefConfig();
            this.M_SCOPE.initiated = true;
        },
        fetchQueryUrl() {},
        sendRecordDb(response, options = {}) {
            return bridge.recordCrossRefResponse(response, options);
        },
        filterFetchData(response) {
            return bridge.filterCrossRefData(response);
        },
        extractYear(publishedData) {
            return bridge.extractCrossRefYear(publishedData);
        },
        apiFetchReturn(response) {
            let fetchData = {};
            try {
                if (response.statusCode === 200 && response.restext !== 'Resource not found.') {
                    const jsonObj = JSON.parse(response.restext);
                    fetchData = bridge.parseFlatDoiApiResponse(jsonObj) ||
                        bridge.filterCrossRefData(jsonObj) || {};
                    const multiRef = bridge.globalObject.MultiRefModule;
                    if (multiRef && multiRef.M_FUN &&
                        typeof multiRef.M_FUN.JSON_2_DIALOG === 'function') {
                        multiRef.M_FUN.JSON_2_DIALOG(fetchData);
                    }
                } else if (bridge.globalObject.MultiRefModule &&
                    bridge.globalObject.MultiRefModule.M_FUN &&
                    typeof bridge.globalObject.MultiRefModule.M_FUN.handleDoiFetchError === 'function') {
                    bridge.globalObject.MultiRefModule.M_FUN.handleDoiFetchError(
                        bridge.globalObject.MultiRefModule
                    );
                }
            } catch (err) {
                if (typeof bridge.globalObject.ErrorLogTrace === 'function') {
                    bridge.globalObject.ErrorLogTrace('CROSS_REF_API.apiFetchReturn', err.message);
                }
            } finally {
                bridge.recordCrossRefResponse(response, {
                    type: 'fetch_doi',
                    parse_res: fetchData
                });
            }
        },
        handleApiError(response) {
            const multiRef = bridge.globalObject.MultiRefModule;
            if (multiRef && multiRef.M_FUN &&
                typeof multiRef.M_FUN.handleDoiFetchError === 'function') {
                multiRef.M_FUN.handleDoiFetchError(multiRef);
            }
        },
        doiFetch(doi, options = {}) {
            return bridge.fetchDoi(doi, options);
        },
        logError(functionName, error) {
            if (typeof bridge.globalObject.ErrorLogTrace === 'function') {
                bridge.globalObject.ErrorLogTrace(`CROSS_REF_API.${functionName}`, error.message);
            }
        }
    };
}

if (typeof window !== 'undefined') {
    window.refBridge = window.refBridge || refBridge;
    window.CROSS_REF_API = window.CROSS_REF_API || createCrossRefLegacyShim(refBridge);
}

export {
    RefBridge
};
export default RefBridge;

/* END */