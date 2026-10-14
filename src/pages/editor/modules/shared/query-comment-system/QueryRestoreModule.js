    /**
     * QueryRestoreModule - Handles query restoration from backups
    
     * Unified Query Restore Manager
     * Combines QueryRestoreModule and QueryRestoreManager into a single, robust solution
     * Handles query validation, restoration, and backup management
     */
    class QueryRestoreModule {
        static _backupLoaded = false;
        static _loadedDocId = null;
        static _sharedContexts = null;
        static _managerInitialized = false;

        static invalidateCacheIfDocChanged(docId) {
            if (QueryRestoreModule._loadedDocId && QueryRestoreModule._loadedDocId !== docId) {
                QueryRestoreModule._backupLoaded = false;
                QueryRestoreModule._loadedDocId = null;
                QueryRestoreModule._sharedContexts = null;
                QueryRestoreModule._managerInitialized = false;
            }
        }

        constructor(editorInstance, docId, config) {
            config = config || {};

            // Core dependencies
            this.editor = editorInstance || GlobalEditor;
            this.docId = docId || new URLSearchParams(window.location.search).get("docid");
            QueryRestoreModule.invalidateCacheIfDocChanged(this.docId);
            this.parent = null;
            this.baseUrl = BUCKET_URL + this.docId + '/';

            // Configuration
            this.config = {
                autoRestore: config.autoRestore !== false,
                autoRestoreInterval: config.autoRestoreInterval || 30000,
                enableLogging: config.enableLogging !== false,
                specialElements: config.specialElements || ['.ref', '.contrib', '.article-title', '.alt-title', '.caption', '.kwd'],


                cacheExpiry: config.cacheExpiry || 600000,
                stateMonitorInterval: config.stateMonitorInterval || 2000,
                validationDelay: config.validationDelay || 500
            };

            // Merge additional config
            for (var key in config) {
                if (config.hasOwnProperty(key) && !this.config.hasOwnProperty(key)) {
                    this.config[key] = config[key];
                }
            }

            // Document storage contexts
            this.contexts = {
                original: {
                    document: null,
                    domCache: null,
                    queries: new Map(),
                    counts: {}
                },
                aqBackup: {
                    document: null,
                    domCache: null,
                    queries: new Map(),
                    counts: {}
                },
                aqOriginal: {
                    document: null,
                    domCache: null,
                    queries: new Map(),
                    counts: {}
                },
                current: {
                    counts: {}
                }
            };

            // Meta statistics
            this.stats = {
                missing: 0,
                restored: 0,
                fixed: 0,
                processed: 0,
                lastValidation: null
            };

            // Selectors
            this.selectors = {
                allQueries: '[data-class="ckcommentsfull"]:not([data-ignore-comment]):not([data-deleted]):not([data-status="comment"])',
                aqSpan: '[data-name="AQ"]',
                aqSpanWithRole: '[data-name="AQ"][data-role="Query to Author"]',
                responseSpan: '[data-name="response"]'
            };

            // State flags
            this.isInitialized = false;
            this.isValidating = false;
            this.validationTimeout = null;

            if (QueryRestoreModule._managerInitialized &&
                QueryRestoreModule._loadedDocId === this.docId) {
                this._applySharedContexts();
                this.isInitialized = true;
                return;
            }
        }

        _applySharedContexts() {
            if (!QueryRestoreModule._sharedContexts ||
                QueryRestoreModule._loadedDocId !== this.docId) {
                return;
            }
            ['original', 'aqBackup', 'aqOriginal'].forEach((key) => {
                if (QueryRestoreModule._sharedContexts[key]) {
                    this.contexts[key] = QueryRestoreModule._sharedContexts[key];
                }
            });
        }

        _saveSharedContexts() {
            QueryRestoreModule._loadedDocId = this.docId;
            QueryRestoreModule._backupLoaded = true;
            QueryRestoreModule._sharedContexts = {
                original: this.contexts.original,
                aqBackup: this.contexts.aqBackup,
                aqOriginal: this.contexts.aqOriginal
            };
        }

        _updateSharedContextKey(key) {
            if (!this.contexts[key] || !this.contexts[key].domCache) {
                return;
            }
            QueryRestoreModule._loadedDocId = this.docId;
            QueryRestoreModule._backupLoaded = true;
            if (!QueryRestoreModule._sharedContexts) {
                QueryRestoreModule._sharedContexts = {};
            }
            QueryRestoreModule._sharedContexts[key] = this.contexts[key];
        }

        /**
         * Wait for the editor to be ready
         */
        async waitForEditor() {
            return new Promise((resolve) => {
                const checkEditor = () => {
                    if (typeof GlobalEditor !== 'undefined' && GlobalEditor && GlobalEditor.document && GlobalEditor.document.$) {
                        this.editor = GlobalEditor;
                        this.editorDocBody = this.editor.document.$;
                        resolve(this.editor);
                    } else {
                        setTimeout(checkEditor, 100);
                    }
                };
                checkEditor();
            });
        }
        /**
         * Initialize the manager - loads documents and sets up listeners
         */
        async initialize() {

            await this.waitForEditor();

            try {

                if (this.isInitialized) {
                    this.log('Manager already initialized', 'warn');
                    return;
                }

                if (QueryRestoreModule._managerInitialized &&
                    QueryRestoreModule._loadedDocId === this.docId) {
                    this._applySharedContexts();
                    this.isInitialized = true;
                    this.log('Reusing initialized restore manager state', 'info');
                    return;
                }

                this.log('Initializing Query Restore Manager...');

                await this.loadBackupDocuments();
                this.captureBackupQueries();
                this.validateAndRestoreQueries();
                this.updateAllCounts();

                if (this.config.autoRestore) {
                    this.setupAutoRestore();
                }

                this.isInitialized = true;
                QueryRestoreModule._managerInitialized = true;
                this.log('Initialization complete', 'success');
            } catch (error) {
                this.log('Initialization failed: ' + error.message, 'error');
                throw error;
            }
        }


        /**
         * ✅ Refresh domCache when user makes changes
         */
        async refreshAqBackup() {
            const ok = await this.loadBackupDocuments('aqBackup', true);
            if (ok) {
                this.log('✅ aqBackup refreshed successfully', 'success');
                this.captureBackupQueries('aqBackup', true);
                this.updateAllCounts();
            }
        }

        /**
         * Load backup documents from server
         * @param {string} [targetKey] - Optional. If provided, loads only this key (e.g. 'aqBackup')
         * @param {boolean} [force=false] - Force reload even if recently loaded
         */
        async loadBackupDocuments(targetKey = null, force = false) {
            QueryRestoreModule.invalidateCacheIfDocChanged(this.docId);

            if (!force && !targetKey &&
                QueryRestoreModule._backupLoaded &&
                QueryRestoreModule._loadedDocId === this.docId) {
                this._applySharedContexts();
                this.log('Backup documents already loaded, skipping fetch', 'info');
                return true;
            }

            const timestamp = Date.now();
            const urls = {
                original: `${this.baseUrl}${this.docId}.html?t=${timestamp}`,
                aqBackup: `${this.baseUrl}${this.docId}_AQ.html?t=${timestamp}`,
                aqOriginal: `${this.baseUrl}${this.docId}_AQ_original.html?t=${timestamp}`
            };

            const delay = (ms) => new Promise(res => setTimeout(res, ms));
            let loadedCount = 0;
            const now = Date.now();

            // 🔹 Only pick one if targetKey specified
            const targetEntries = targetKey ? [
                    [targetKey, urls[targetKey]]
                ].filter(([k, u]) => u) :
                Object.entries(urls);

            for (const [key, url] of targetEntries) {
                const ctx = this.contexts[key] || {};

                if (!force && ctx.domCache) {
                    this.log(`Skipped already loaded backup: ${key}`, 'info');
                    loadedCount++;
                    continue;
                }

                try {
                    const startTime = Date.now();
                    const html = await $.ajax({
                        url,
                        type: 'GET',
                        dataType: 'text',
                        cache: false,
                        timeout: 10000
                    });

                    const $dom = $('<div>').html(html);
                    await delay(50);

                    this.contexts[key] = {
                        ...ctx,
                        url,
                        html,
                        domCache: $dom[0],
                        lastFetch: now,
                        loadedAt: now,
                    };

                    const fetchTime = Date.now() - startTime;
                    this.log(`✅ ${key} reloaded (${fetchTime}ms)`, 'success');
                    loadedCount++;
                    this._updateSharedContextKey(key);
                } catch (err) {
                    this.log(`⚠️ Failed to load ${key}: ${err.message}`, 'warn');
                }
            }

            if (!targetKey && loadedCount === targetEntries.length) {
                this._saveSharedContexts();
            }

            this.log(`Loaded ${loadedCount}/${targetEntries.length} backup documents`);
            return loadedCount === targetEntries.length;
        }

        /**
         * Capture queries from backup documents
         * @param {string|null} targetKey - Optional. Capture only from specific source (e.g. 'aqBackup')
         */
        captureBackupQueries(targetKey = null) {
            const self = this;
            const sources = targetKey ? [targetKey] : ['original', 'aqBackup', 'aqOriginal'];

            sources.forEach(source => {
                const ctx = self.contexts[source];
                if (!ctx || !ctx.domCache) {
                    self.log(`⚠️ No domCache found for ${source}`, 'warn');
                    return;
                }

                if (!ctx.queries) ctx.queries = new Map();

                const elements = Array.from(ctx.domCache.querySelectorAll(self.selectors.allQueries));

                elements.forEach(el => {
                    const id = el.getAttribute('id');
                    if (!id) return;

                    const currentQuery = ctx.queries.get(id);
                    if (currentQuery && self.getQueryElementScore(currentQuery.element) >= self.getQueryElementScore(el)) {
                        return;
                    }

                    ctx.queries.set(id, {
                        id,
                        label: el.getAttribute('data-label') || '',
                        html: el.outerHTML,
                        element: el,
                        source,
                        status: el.getAttribute('data-status') || 'open',
                        metadata: self.extractMetadata(el),
                        capturedAt: Date.now()
                    });
                });

                self.log(`✅ Captured ${ctx.queries.size} queries from ${source}`, 'info');
            });

            // 🧾 Summary
            if (!targetKey) {
                const o = this.contexts.original && this.contexts.original.queries ? this.contexts.original.queries.size : 0;
                const b = this.contexts.aqBackup && this.contexts.aqBackup.queries ? this.contexts.aqBackup.queries.size : 0;
                const a = this.contexts.aqOriginal && this.contexts.aqOriginal.queries ? this.contexts.aqOriginal.queries.size : 0;
                this.log(`📊 Query Summary → Original: ${o}, aqBackup: ${b}, aqOriginal: ${a}`, 'success');
            }
        }


        /**
         * Extract query content
         */
        extractQueryContent(element) {
            var aqSpan = element.querySelector(this.selectors.aqSpan);
            return {
                author: aqSpan ? aqSpan.getAttribute('data-user') : null,
                content: aqSpan ? aqSpan.getAttribute('data-user-comment-box') : null,
                role: aqSpan ? aqSpan.getAttribute('data-role') : null,
                timestamp: aqSpan ? aqSpan.getAttribute('data-timec') : null,
                hasContent: aqSpan ? !!aqSpan.hasChildNodes() : false
            };
        }

        /**
         * Extract responses
         */
        extractResponses(element) {
            var responses = element.querySelectorAll(this.selectors.responseSpan);
            return Array.from(responses).map(function(r) {
                return {
                    author: r.getAttribute('data-username'),
                    content: r.getAttribute('data-user-comment-box'),
                    timestamp: r.getAttribute('data-time'),
                    fileId: r.getAttribute('data-file-id'),
                    fileName: r.getAttribute('data-file-on')
                };
            });
        }

        /**
         * Update counts for all contexts
         */
        updateAllCounts() {
            var self = this;
            var sources = ['original', 'aqBackup', 'aqOriginal'];

            sources.forEach(function(source) {
                var ctx = self.contexts[source];
                ctx.counts = {
                    total: 0,
                    open: 0,
                    closed: 0,
                    pending: 0
                };

                ctx.queries.forEach(function(query) {
                    ctx.counts.total++;
                    var status = query.status ? query.status.toLowerCase() : '';
                    if (status === 'resolved' || status === 'closed') {
                        ctx.counts.closed++;
                    } else if (status === 'pending') {
                        ctx.counts.pending++;
                    } else {
                        ctx.counts.open++;
                    }
                });
            });

            // Update current context counts
            if (this.parent && this.parent._state && this.parent._state.queries) {
                var currentQueries = this.parent._state.queries;
                var currentCounts = {
                    total: 0,
                    open: 0,
                    closed: 0,
                    pending: 0
                };

                currentQueries.forEach(function(query) {
                    currentCounts.total++;
                    var status = query.status ? query.status.toLowerCase() : '';
                    if (status === 'resolved' || status === 'closed') {
                        currentCounts.closed++;
                    } else if (status === 'pending') {
                        currentCounts.pending++;
                    } else {
                        currentCounts.open++;
                    }
                });

                this.contexts.current.counts = currentCounts;

                // Calculate missing queries
                var currentQueryIds = new Set(currentQueries.keys());
                this.stats.missing = 0;
                this.contexts.original.queries.forEach(function(query, id) {
                    if (!currentQueryIds.has(id)) {
                        self.stats.missing++;
                    }
                });
            }

            this.log('Counts updated', 'info', {
                original: this.contexts.original.counts,
                aqBackup: this.contexts.aqBackup.counts,
                current: this.contexts.current.counts,
                missing: this.stats.missing
            });
        }

        /**
         * Main validation and restoration process
         */
        async validateAndRestoreQueries(force = false, options = {}) {


            if (this.isValidating) {
                this.log('Validation already in progress', 'warn');
                return;
            }

            // 🟢 Skip validation if query dialog or reply form is open to avoid conflicts
            var qDialog = (typeof window !== "undefined" && window.queryDialog) ||
                (this.parent && this.parent.dialogModule) || null;
            var isReplyOpen = !!document.querySelector('.reply-container[style*="display: block"]');

            if ((qDialog && qDialog.state === 1) || isReplyOpen) {
                this.log('Validation skipped: Query dialog or reply form is currently open', 'warn');
                return;
            }

            this.isValidating = true;
            this.stats.lastValidation = Date.now();
            const startTime = Date.now();


            try {

                this.log('Starting validation and restoration...');

                const now = Date.now();
                const needsFresh = force || (now - this.contexts.aqBackup.lastFetch) > this.config.cacheExpiry;

                if (needsFresh) {
                    await this.loadBackupDocuments(null, force);
                }

                var editorDoc = this.editor.document.$;


                // First, clean up duplicates
                var duplicatesRemoved = this.cleanupAllDuplicateAQSpans();
                if (duplicatesRemoved > 0) {
                    this.log('Cleaned up ' + duplicatesRemoved + ' duplicate AQ spans');
                }

                // Get all queries with priority: aqBackup > aqOriginal > original
                var allQueries = this.getAllQueriesWithPriority();
                this.log('Processing ' + allQueries.size + ' unique queries');

                // Optimization: For large query sets, validation will run in background chunks
                if (allQueries.size > 100) {
                    this.log('Large query set (' + allQueries.size + ') - validation will run in background chunks.', 'info');
                }


                // Process each query
                this.stats.processed = 0;
                this.stats.restored = 0;
                this.stats.fixed = 0;

                var self = this;
                for (var entry of allQueries) {
                    // 🟢 Performance optimization: 
                    // Stage 1: Process first 25 immediately.
                    // Stage 2: After 25, yield every 5 queries to keep the UI smooth.
                    if (allQueries.size > 25 && self.stats.processed >= 25 && (self.stats.processed - 25) % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 2500));
                    }

                    var queryId = entry[0];
                    var query = entry[1];
                    var result = await this.processQuery(query, editorDoc);
                    self.stats.processed++;
                    if (result.restored) self.stats.restored++;
                    if (result.fixed) self.stats.fixed++;
                }

                if (this.stats.processed == allQueries.size) {

                    // Final cleanup check
                    setTimeout(function() {
                        var remaining = self.cleanupAllDuplicateAQSpans();
                        if (remaining > 0) {
                            self.log('Found ' + remaining + ' remaining duplicates after validation', 'warn');
                        }
                    }, 1000);

                    // Regenerate query list
                    if (typeof SET_DATA !== 'undefined') {
                        // SET_DATA.reGenerateAllInit(null, { querylist: true });
                    }

                    var duration = Date.now() - startTime;
                    this.log('Validation complete in ' + duration + 'ms', 'success', {
                        processed: this.stats.processed,
                        restored: this.stats.restored,
                        fixed: this.stats.fixed
                    });
                }
            } catch (error) {
                this.log('Validation failed: ' + error.message, 'error');
                throw error;
            } finally {
                this.isValidating = false;
            }
        }

        /**
         * Get all queries with priority ordering
         */
        getAllQueriesWithPriority() {
            var allQueries = new Map();
            var sources = ['original', 'aqOriginal', 'aqBackup'];

            // Priority order: original < aqOriginal < aqBackup (latest wins)
            for (var i = 0; i < sources.length; i++) {
                var source = sources[i];
                var ctx = this.contexts[source];
                var self = this;

                ctx.queries.forEach(function(query, id) {
                    var newQuery = {};
                    for (var key in query) {
                        if (query.hasOwnProperty(key)) {
                            newQuery[key] = query[key];
                        }
                    }
                    newQuery.source = source;
                    allQueries.set(id, newQuery);
                });
            }

            return allQueries;
        }

        /**
         * Process individual query
         */
        async processQuery(query, editorDoc) {
            var result = {
                restored: false,
                fixed: false
            };
            var editorQuery = this.getBestQueryElementById(editorDoc, query.id);

            if (!editorQuery) {
                // Query is missing - restore it
                await this.restoreMissingQuery(query, editorDoc);
                result.restored = true;
            } else {
                // Query exists - validate and fix
                var issues = this.validateExistingQuery(query, editorQuery);
                if (issues.length > 0) {
                    this.fixQueryIssues(query, editorQuery, issues);
                    result.fixed = true;
                }
            }

            return result;
        }

        /**
         * Validate existing query for issues
         */
        validateExistingQuery(originalQuery, editorQuery) {
            var issues = [];
            var aqSpans = editorQuery.querySelectorAll(this.selectors.aqSpan);
            var responseSpans = editorQuery.querySelectorAll(this.selectors.responseSpan);

            // Check for duplicate AQ spans
            if (aqSpans.length > 1) {
                issues.push('duplicate_aq_spans');
            }

            // Check for missing AQ span
            if (aqSpans.length === 0) {
                issues.push('missing_query_span');
            }

            // Check for invalid AQ span
            if (aqSpans.length === 1) {
                var aqSpan = aqSpans[0];
                var hasContent = aqSpan.hasChildNodes() || aqSpan.getAttribute('data-user-comment-box');
                var hasRole = aqSpan.getAttribute('data-role') === 'Query to Author';

                if (!hasContent || !hasRole) {
                    issues.push('invalid_query_span');
                }
            }

            var editorStatus = this.getResolvedQueryStatus(editorQuery, responseSpans);
            var rawEditorStatus = this.normalizeQueryStatus(editorQuery.getAttribute('data-status'));
            if (rawEditorStatus !== editorStatus) {
                issues.push('status_mismatch');
            }

            // Check for backup response gaps only. Editor status remains authoritative.
            var backupQuery = null;
            if (this.contexts.aqBackup.domCache) {
                backupQuery = this.contexts.aqBackup.domCache.querySelector(`[id="${originalQuery.id}"]`);
            }

            if (backupQuery) {
                var backupResponses = backupQuery.querySelectorAll(this.selectors.responseSpan);
                if (backupResponses.length > responseSpans.length) {
                    issues.push('missing_responses');
                }
            }

            return issues;
        }

        normalizeQueryStatus(status) {
            var normalized = (status || '').toLowerCase();
            return normalized === 'closed' ? 'closed' : 'open';
        }

        getResolvedQueryStatus(queryEl, responseSpans) {
            var responses = responseSpans || queryEl.querySelectorAll(this.selectors.responseSpan);
            if (responses.length > 0) {
                return 'closed';
            }

            return this.normalizeQueryStatus(queryEl && queryEl.getAttribute('data-status'));
        }

        /**
         * Fix identified issues - replace from aqBackup if any issue
         */
        fixQueryIssues(originalQuery, editorQuery, issues) {
            this.log('Fixing issues for query ' + originalQuery.label + ':', 'info', issues);

            // If any issues exist, replace entire element from aqBackup
            // if (issues.length > 0) {
            //     this.replaceEntireQueryElement(originalQuery, editorQuery);
            // }
            var self = this;
            issues.forEach(function(issue) {
                switch (issue) {
                    case 'duplicate_aq_spans':
                        self.removeDuplicateAQSpans(editorQuery);
                        break;
                    case 'missing_query_span':
                        self.restoreQuerySpan(originalQuery, editorQuery);
                        break;
                    case 'invalid_query_span':
                        self.restoreQueryContent(originalQuery, editorQuery);
                        break;
                    case 'missing_responses':
                        self.updateQueryResponses(originalQuery, editorQuery);
                        break;
                    case 'status_mismatch':
                        self.updateQueryStatus(originalQuery, editorQuery);
                        break;
                }
            });
        }

        /**
         * Replace entire query element with aqBackup version and original position metadata
         */
        replaceEntireQueryElement(originalQuery, editorQuery) {

            this.log('Replacing query element from aqBackup: ' + originalQuery.label);

            // Get query element from aqBackup
            var sourceQuery = null;
            if (this.contexts.aqBackup.domCache) {
                sourceQuery = this.contexts.aqBackup.domCache.querySelector(`[id="${originalQuery.id}"]`);
            }

            if (!sourceQuery) {
                this.log('Could not find query ' + originalQuery.label + ' in aqBackup', 'warn');
                return;
            }

            // Get position metadata from original
            var positionMetadata = null;
            var originalQuery_element = null;
            if (this.contexts.original.domCache) {
                originalQuery_element = this.contexts.original.domCache.querySelector(`[id="${originalQuery.id}"]`);
                if (originalQuery_element) {
                    positionMetadata = this.extractMetadata(originalQuery_element);
                }
            }

            // Clean and clone the backup query
            var cleanedQuery = this.cleanQueryElement(sourceQuery.cloneNode(true));

            // Replace the editor query with cleaned backup
            try {
                editorQuery.parentNode.replaceChild(cleanedQuery, editorQuery);

                // Update originalQuery with original position metadata
                if (positionMetadata) {
                    originalQuery.metadata = positionMetadata;
                    this.log('Updated query metadata from original for ' + originalQuery.label);
                }

                // this.syncWithParentModule(originalQuery);
                if (window.queryPanel && typeof window.queryPanel.render) {
                    window.queryPanel.render();
                }
                this.log('Query ' + originalQuery.label + ' replaced from aqBackup', 'success');
            } catch (error) {
                this.log('Failed to replace query ' + originalQuery.label + ': ' + error.message, 'error');
            }
        }

        /**
         * Restore missing query with intelligent fallback and validation
         */
        async restoreMissingQuery(query, editorDoc) {
            this.log('Restoring missing query: ' + query.label);

            // Step 1: Determine which element to restore
            const queryToRestore = this.selectQuerySourceForRestore(query);

            if (!queryToRestore) {
                this.log('Could not find query ' + query.label + ' in any backup source', 'warn');
                return;
            }

            // Step 2: Get position metadata from original document
            const positionMetadata = this.getPositionMetadata(query.id);
            const insertPosition = positionMetadata || query.metadata;

            // Step 3: Clean and insert
            const cleanedQuery = this.cleanQueryElement(queryToRestore.cloneNode(true));
            const insertionPoint = this.findInsertionPointWithFallback(insertPosition.position, editorDoc, query.id);

            if (insertionPoint) {
                this.insertQueryAtPoint(cleanedQuery, insertionPoint);

                if (this.parent && this.parent.panelModule && typeof this.parent.panelModule.render === 'function') {
                    this.parent.panelModule.render(true);
                }

                this.log('Query ' + query.label + ' restored successfully');
            } else {
                this.log('Could not find insertion point for query ' + query.label, 'warn');
            }
        }

        /**
         * Select the best query source for restoration
         * Priority: aqBackup (if valid) > aqOriginal (if valid) > original
         */
        selectQuerySourceForRestore(query) {
            if (!query || !query.id) {
                this.log('Invalid query object passed to selectQuerySourceForRestore', 'error');
                return null;
            }

            var PRIORITY_CONTEXTS = ['aqBackup', 'aqOriginal', 'original'];
            var queryToRestore = null;

            for (var i = 0; i < PRIORITY_CONTEXTS.length; i++) {
                var contextName = PRIORITY_CONTEXTS[i];
                var ctx = this.contexts && this.contexts[contextName];
                if (!ctx || !ctx.domCache) continue;

                var candidate = this.getBestQueryElementById(ctx.domCache, query.id);
                if (!candidate) continue;

                // Validate only for aqOriginal and original
                if (/original|aqOriginal/i.test(contextName)) {
                    if (!this.isValidQueryForRestore(candidate)) {
                        this.log('Query invalid in ' + contextName + ', trying next source', 'warn');
                        continue;
                    }
                }

                queryToRestore = candidate;
                if (contextName !== 'original') {
                    this.log('Using query from ' + contextName + ' for ' + query.label, 'info');
                }
                break;
            }

            if (!queryToRestore) {
                this.log('Could not find valid query source for ' + query.label, 'warn');
            }

            return queryToRestore;
        }


        /**
         * Validate if a query element from aqBackup is suitable for restoration
         * Returns false if: closed status without responses, or missing AQ spans
         */
        isValidQueryForRestore(queryElement) {
            if (!queryElement.hasAttribute('data-status')) {
                // No status = assume valid
                return true;
            }

            const status = queryElement.getAttribute('data-status');
            const isClosed = /closed/i.test(status);
            const aqSpans = queryElement.querySelectorAll(this.selectors.aqSpan);
            const responseSpans = queryElement.querySelectorAll(this.selectors.responseSpan);

            // Invalid if: closed with no responses
            if (isClosed && responseSpans.length === 0) {
                this.log('Query has closed status but no responses - marking as invalid', 'warn');
                return false;
            }

            // Invalid if: no AQ spans at all
            if (aqSpans.length === 0) {
                this.log('Query missing AQ spans - marking as invalid', 'warn');
                return false;
            }

            return true;
        }

        /**
         * Extract position metadata from original document
         */
        getPositionMetadata(queryId) {
            if (!this.contexts.original || !this.contexts.original.domCache) {
                return null;
            }

            const originalQueryElement = this.contexts.original.domCache.querySelector(`[id="${queryId}"]`);
            return originalQueryElement ? this.extractMetadata(originalQueryElement) : null;
        }

        /**
         * Find insertion point with intelligent fallback strategies
         */
        findInsertionPointWithFallback(position, editorDoc, queryId) {
            // Try standard insertion point first
            var insertionPoint = this.findInsertionPoint(position, editorDoc);
            if (insertionPoint) {
                return insertionPoint;
            }

            // Strategy 1: Use parentDataName
            if (position.parentDataName) {
                var parent = editorDoc.querySelector('[data-name="' + position.parentDataName + '"]');
                if (parent) {
                    return this.findPositionInParent(parent, position);
                }
            }

            // Strategy 2: Use special container if available
            if (position.specialContainer) {
                var containerAppendPoint = this.findSpecialContainerAppendPoint(editorDoc, position);
                if (containerAppendPoint) {
                    return containerAppendPoint;
                }
            }

            // Strategy 3: Use parentWithId if direct parentId failed
            if (position.parentWithId && position.parentWithId !== position.parentId) {
                var parentWithId = editorDoc.getElementById(position.parentWithId);
                if (parentWithId) {
                    return {
                        element: parentWithId,
                        position: 'append'
                    };
                }
            }

            // Strategy 4: Try sibling text matching
            if (position.previousSiblingText || position.nextSiblingText) {
                var siblingMatch = this.findBySiblingTextMatch(editorDoc, position);
                if (siblingMatch) {
                    return siblingMatch;
                }
            }

            // No valid insertion point found
            return null;
        }

        /**
         * Find special container append point with hierarchy logic
         */
        findSpecialContainerAppendPoint(editorDoc, position) {
            if (!position.specialContainer) return null;

            var container = position.specialContainer;
            var selector = container.selector;
            var containerId = container.id;

            // Strategy 1: Find by container ID if available
            if (containerId) {
                var containerEl = editorDoc.getElementById(containerId);
                if (containerEl) {
                    this.log('Found special container by ID: ' + containerId, 'info');
                    return {
                        element: containerEl,
                        position: 'append'
                    };
                }
            }

            // Strategy 2: Find by container selector with class match
            if (container.class) {
                var elements = editorDoc.querySelectorAll(selector);
                for (var i = 0; i < elements.length; i++) {
                    var el = elements[i];
                    if (el.className && el.className.indexOf(container.class.split(' ')[0]) !== -1) {
                        this.log('Found special container by class: ' + container.class, 'info');
                        return {
                            element: el,
                            position: 'append'
                        };
                    }
                }
            }

            // Strategy 3: Find by selector only
            var generalContainer = editorDoc.querySelector(selector);
            if (generalContainer) {
                this.log('Found special container by selector: ' + selector, 'info');
                return {
                    element: generalContainer,
                    position: 'append'
                };
            }

            // Strategy 4: Handle kwd special case - look for kwd-group
            if (selector === '.kwd' || selector.indexOf('kwd') !== -1) {
                var kwdGroup = editorDoc.querySelector('[class*="kwd-group"]');
                if (kwdGroup) {
                    this.log('Found kwd-group container for keywords', 'info');
                    return {
                        element: kwdGroup,
                        position: 'append'
                    };
                }
            }

            return null;
        }

        /**
         * Find insertion point by matching sibling text
         */
        findBySiblingTextMatch(editorDoc, position) {
            var allElements = editorDoc.querySelectorAll('[data-class="ckcommentsfull"]');

            for (var i = 0; i < allElements.length; i++) {
                var el = allElements[i];
                var prevSib = el.previousElementSibling;
                var nextSib = el.nextElementSibling;

                var prevMatch = false;
                var nextMatch = false;

                if (position.previousSiblingText && prevSib) {
                    var prevText = (prevSib.textContent || '').substring(0, 50);
                    prevMatch = prevText.indexOf(position.previousSiblingText.substring(0, 20)) !== -1;
                }

                if (position.nextSiblingText && nextSib) {
                    var nextText = (nextSib.textContent || '').substring(0, 50);
                    nextMatch = nextText.indexOf(position.nextSiblingText.substring(0, 20)) !== -1;
                }

                if (prevMatch || nextMatch) {
                    return {
                        element: el,
                        position: 'after'
                    };
                }
            }

            return null;
        }

        getBestQueryElementById(root, queryId) {
            if (!root || !queryId) return null;

            var escapedId = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(queryId) : queryId.replace(/"/g, '\\"');
            var matches = Array.from(root.querySelectorAll('[id="' + escapedId + '"][data-class="ckcommentsfull"]'));
            if (matches.length === 0 && root.getElementById) {
                var byId = root.getElementById(queryId);
                if (byId && byId.getAttribute && byId.getAttribute("data-class") === "ckcommentsfull") {
                    matches.push(byId);
                }
            }

            if (matches.length === 0) return null;

            var self = this;
            matches.sort(function(a, b) {
                return self.getQueryElementScore(b) - self.getQueryElementScore(a);
            });

            return matches[0];
        }

        getQueryElementScore(queryElement) {
            if (!queryElement || !queryElement.querySelectorAll) return 0;

            var status = (queryElement.getAttribute("data-status") || "").toLowerCase();
            var responseCount = queryElement.querySelectorAll(this.selectors.responseSpan + ',[data-name="Response"]').length;
            var aqSpan = queryElement.querySelector(this.selectors.aqSpanWithRole) || queryElement.querySelector(this.selectors.aqSpan);
            var hasQueryText = !!(aqSpan && aqSpan.getAttribute("data-user-comment-box"));

            var score = 0;
            if (responseCount > 0) score += 1000 + (responseCount * 50);
            if (status === "closed" || status === "resolved") score += 100;
            if (hasQueryText) score += 20;
            if (queryElement.parentElement) score += 5;
            return score;
        }

        /**
         * Extract comprehensive metadata from query element with enhanced position detection
         */
        extractMetadata(element) {
            if (!element) return null;

            var parent = element.parentElement;
            var siblings = parent ? Array.from(parent.children) : [];
            var index = siblings.indexOf(element);
            var prevSibling = element.previousElementSibling;
            var nextSibling = element.nextElementSibling;

            // Detect special container presence
            var specialSelectors = [
                '.contrib',
                '.aff',
                '.author-notes',
                '.contrib-group',
                '.kwd',
                '.ref'
            ];
            var specialContainer = null;
            for (var i = 0; i < specialSelectors.length; i++) {
                var found = $(element).closest(specialSelectors[i]);
                if (found && found.length) {
                    specialContainer = {
                        selector: specialSelectors[i],
                        tag: found.prop("tagName").toLowerCase(),
                        class: found.attr("class") || null,
                        id: found.attr("id") || null
                    };
                    break;
                }
            }

            // Detect if root (no parent)
            var isRoot = !parent;

            // Fetch parentWithId if parent is 'closed' or lacks ID
            var parentWithId = null;
            if (parent) {
                var current = parent;
                while (current && !parentWithId) {
                    if (current.id && current.id.trim() !== "") {
                        parentWithId = current.id;
                        break;
                    }
                    current = current.parentElement;
                }
            }

            // Check if parent has data-status="closed"
            var parentStatus = parent ? parent.getAttribute('data-status') : null;
            var isParentClosed = parentStatus && parentStatus.toLowerCase() === "closed";

            return {
                status: element.getAttribute('data-status'),
                position: {
                    parentId: parent ? parent.id : null,
                    parentClass: parent ? parent.className : null,
                    parentDataName: parent ? parent.getAttribute('data-name') : null,
                    index: index,
                    previousSiblingId: prevSibling ? prevSibling.id : null,
                    nextSiblingId: nextSibling ? nextSibling.id : null,
                    previousSiblingText: prevSibling ? (prevSibling.textContent ? prevSibling.textContent.substring(0, 50) : null) : null,
                    nextSiblingText: nextSibling ? (nextSibling.textContent ? nextSibling.textContent.substring(0, 50) : null) : null,
                    isRoot: isRoot,
                    parentWithId: parentWithId,
                    isParentClosed: isParentClosed,
                    specialContainer: specialContainer
                },
                query: this.extractQueryContent(element),
                responses: this.extractResponses(element)
            };
        }

        /**
         * Find insertion point for query
         */
        findInsertionPoint(position, editorDoc) {
            // Try parent ID
            if (position.parentId) {
                var parent = editorDoc.getElementById(position.parentId);
                if (parent) {
                    return this.findPositionInParent(parent, position);
                }
            }

            // Try parent data-name
            if (position.parentDataName) {
                var parent = editorDoc.querySelector('[data-name="' + position.parentDataName + '"]');
                if (parent) {
                    return this.findPositionInParent(parent, position);
                }
            }

            // Try siblings
            if (position.previousSiblingId) {
                var sibling = editorDoc.getElementById(position.previousSiblingId);
                if (sibling) return {
                    element: sibling,
                    position: 'after'
                };
            }

            if (position.nextSiblingId) {
                var sibling = editorDoc.getElementById(position.nextSiblingId);
                if (sibling) return {
                    element: sibling,
                    position: 'before'
                };
            }

            return null;
        }

        /**
         * Find position within parent element
         */
        findPositionInParent(parent, position) {
            var siblings = Array.from(parent.children);

            // Try to match by sibling IDs
            if (position.previousSiblingId) {
                var prevSibling = siblings.find(function(s) {
                    return s.id === position.previousSiblingId;
                });
                if (prevSibling) return {
                    element: prevSibling,
                    position: 'after'
                };
            }

            if (position.nextSiblingId) {
                var nextSibling = siblings.find(function(s) {
                    return s.id === position.nextSiblingId;
                });
                if (nextSibling) return {
                    element: nextSibling,
                    position: 'before'
                };
            }

            // Try index
            if (position.index < siblings.length) {
                return {
                    element: siblings[position.index],
                    position: 'before'
                };
            }

            // Append to parent if no specific position found
            return {
                element: parent,
                position: 'append'
            };
        }

        /**
         * Insert query at specified point
         */
        insertQueryAtPoint(queryElement, insertionPoint) {
            var element = insertionPoint.element;
            var position = insertionPoint.position;

            switch (position) {
                case 'before':
                    element.parentNode.insertBefore(queryElement, element);
                    break;
                case 'after':
                    element.parentNode.insertBefore(queryElement, element.nextSibling);
                    break;
                case 'append':
                    element.appendChild(queryElement);
                    break;
            }
        }

        /**
         * Sync query with parent module
         */
        syncWithParentModule(query) {
            if (!this.parent) return;

            var normalized = {
                id: query.id,
                label: query.id,
                status: query.metadata.status,
                content: query.metadata.query.content,
                author: query.metadata.query.author,
                responses: query.metadata.responses,
                restored: true,
                restoredFrom: query.source,
                restoredAt: Date.now()
            };

            if (this.parent.addQuery) {
                this.parent.addQuery(normalized);
            } else if (this.parent._state && this.parent._state.queries) {
                this.parent._state.queries.set(normalized.id, normalized);
            }

            if (this.parent.updateCounts) {
                this.parent.updateCounts();
            }

            if (this.parent.emit) {
                this.parent.emit('query-restored', {
                    query: normalized
                });
            }
        }


        /**
         * Clean query element before restoration
         */
        cleanQueryElement(element) {

            return element;

            // Remove duplicate AQ spans
            var aqSpans = element.querySelectorAll(this.selectors.aqSpan);
            if (aqSpans.length > 1) {
                for (var i = 1; i < aqSpans.length; i++) {
                    aqSpans[i].remove();
                }
            }

            // Remove malformed spans
            var allSpans = element.querySelectorAll('span[data-name]');
            allSpans.forEach(function(span) {
                var dataName = span.getAttribute('data-name');
                if (dataName !== 'AQ' && dataName !== 'Response') {
                    span.remove();
                }
            });

            // Ensure element has an ID
            if (!element.hasAttribute('id')) {
                element.setAttribute('id', 'query_' + Date.now());
            }

            return element;
        }

        /**
         * Remove duplicate AQ spans
         */
        removeDuplicateAQSpans(editorQuery) {
            var aqSpans = editorQuery.querySelectorAll(this.selectors.aqSpan);
            if (aqSpans.length <= 1) return;

            // Find the best span to keep (highest score)
            var bestSpan = null;
            var bestScore = -1;

            aqSpans.forEach(function(span) {
                var score = 0;
                if (span.getAttribute('data-user-comment-box')) score += 10;
                if (span.getAttribute('data-role') === 'Query to Author') score += 5;
                if (span.getAttribute('data-timec')) score += 3;
                if (span.hasChildNodes()) score += 2;
                if (span.getAttribute('data-user')) score += 1;

                if (score > bestScore) {
                    bestScore = score;
                    bestSpan = span;
                }
            });

            // Remove all except the best
            aqSpans.forEach(function(span) {
                if (span !== bestSpan) span.remove();
            });
        }

        /**
         * Clean up all duplicate AQ spans in document
         */
        cleanupAllDuplicateAQSpans() {
            var editorDoc = this.editor.document.$;
            var allQueries = editorDoc.querySelectorAll(this.selectors.allQueries);
            var duplicatesFound = 0;
            var self = this;

            duplicatesFound += this.cleanupDuplicateQueryElementsById(editorDoc);

            allQueries.forEach(function(query) {
                var aqSpans = query.querySelectorAll(self.selectors.aqSpan);
                if (aqSpans.length > 1) {
                    duplicatesFound++;
                    self.removeDuplicateAQSpans(query);
                }
            });

            return duplicatesFound;
        }

        cleanupDuplicateQueryElementsById(editorDoc) {
            if (!editorDoc) return 0;

            var groups = {};
            var self = this;
            var allQueries = Array.from(editorDoc.querySelectorAll(this.selectors.allQueries));

            allQueries.forEach(function(query) {
                var id = query.getAttribute("id");
                if (!id) return;
                if (!groups[id]) groups[id] = [];
                groups[id].push(query);
            });

            var removed = 0;
            Object.keys(groups).forEach(function(id) {
                var group = groups[id];
                if (!group || group.length <= 1) return;

                group.sort(function(a, b) {
                    return self.getQueryElementScore(b) - self.getQueryElementScore(a);
                });

                var winner = group[0];
                group.slice(1).forEach(function(query) {
                    if (query !== winner && query.parentNode) {
                        query.parentNode.removeChild(query);
                        removed++;
                    }
                });
            });

            return removed;
        }

        /**
         * Restore query span
         */
        restoreQuerySpan(originalQuery, editorQuery) {
            if (editorQuery.querySelector(this.selectors.aqSpan)) {
                this.log('AQ span already exists for query ' + originalQuery.label, 'info');
                return;
            }

            // Get source AQ span with priority
            var sourceAQ = null;
            var sources = ['aqBackup', 'aqOriginal', 'original'];

            for (var i = 0; i < sources.length; i++) {
                var source = sources[i];
                if (this.contexts[source].domCache) {
                    var backupQuery = this.contexts[source].domCache.querySelector(`[id="${originalQuery.id}"]`);
                    if (backupQuery) {
                        sourceAQ = backupQuery.querySelector(this.selectors.aqSpanWithRole);
                        if (sourceAQ) break;
                    }
                }
            }

            if (sourceAQ) {
                var clonedAQ = sourceAQ.cloneNode(true);
                editorQuery.insertBefore(clonedAQ, editorQuery.firstChild);
                this.log('Restored AQ span for query ' + originalQuery.label);
            } else {
                this.log('Could not find AQ span for query ' + originalQuery.label, 'warn');
            }
        }

        /**
         * Restore query content
         */
        restoreQueryContent(originalQuery, editorQuery) {
            var editorAQ = editorQuery.querySelector(this.selectors.aqSpan);
            if (!editorAQ) {
                this.restoreQuerySpan(originalQuery, editorQuery);
                return;
            }

            // Get source AQ with priority
            var sourceAQ = null;
            var sources = ['aqBackup', 'aqOriginal', 'original'];

            for (var i = 0; i < sources.length; i++) {
                var source = sources[i];
                if (this.contexts[source].domCache) {
                    var backupQuery = this.contexts[source].domCache.querySelector(`[id="${originalQuery.id}"]`);
                    if (backupQuery) {
                        sourceAQ = backupQuery.querySelector(this.selectors.aqSpanWithRole);
                        if (sourceAQ) break;
                    }
                }
            }

            if (sourceAQ) {
                // Copy attributes and content
                var attrs = Array.from(sourceAQ.attributes);
                attrs.forEach(function(attr) {
                    editorAQ.setAttribute(attr.name, attr.value);
                });
                editorAQ.innerHTML = sourceAQ.innerHTML;
                this.log('Restored content for query ' + originalQuery.label);
            }
        }

        /**
         * Update query status
         */
        updateQueryStatus(originalQuery, editorQuery) {
            var finalStatus = this.getResolvedQueryStatus(editorQuery);
            editorQuery.setAttribute('data-status', finalStatus);
            this.log('Normalized status for query ' + originalQuery.label + ' to ' + finalStatus);
        }

        /**
         * Update query responses
         */
        updateQueryResponses(originalQuery, editorQuery) {
            var backupQuery = null;
            if (this.contexts.aqBackup.domCache) {
                backupQuery = this.contexts.aqBackup.domCache.querySelector(`[id="${originalQuery.id}"]`);
            }

            if (!backupQuery) return;

            var backupResponses = backupQuery.querySelectorAll(this.selectors.responseSpan);
            var editorResponses = editorQuery.querySelectorAll(this.selectors.responseSpan);

            // Remove existing responses
            editorResponses.forEach(function(response) {
                response.remove();
            });

            // Add all responses from backup
            backupResponses.forEach(function(response) {
                var clonedResponse = response.cloneNode(true);
                editorQuery.appendChild(clonedResponse);
            });

            this.updateQueryStatus(originalQuery, editorQuery);
            this.log('Updated ' + backupResponses.length + ' responses for query ' + originalQuery.id);
        }


        /**
         * Setup auto-restore with event listeners
         */
        setupAutoRestore() {
            var self = this;
            /*
            // Periodic validation
            setInterval(function () {
                if (!self.isValidating) {
                    self.validateAndRestoreQueries();
                }
            }, this.config.autoRestoreInterval);
    
            // Event listeners
            if (this.parent && this.parent.events) {
                this.parent.events.addEventListener('query-deleted', function () {
                    self.updateAllCounts();
                });
    
                this.parent.events.addEventListener('query-created', function () {
                    self.captureBackupQueries();
                    self.updateAllCounts();
                });
    
                this.parent.events.addEventListener('query-status-changed', function () {
                    self.updateAllCounts();
                });
            }
            */
            this.log('Auto-restore enabled');
        }

        /**
         * Logging utility
         */
        log(message, level, data) {
            if (!this.config.enableLogging) return;

            level = level || 'info';
            data = data || null;

            var prefix = '[QueryRestore]';
            var timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            var formattedMsg = prefix + ' [' + timestamp + '] ' + message;

            switch (level) {
                case 'error':
                    console.error(formattedMsg, data || '');
                    break;
                case 'warn':
                    // console.warn(formattedMsg, data || '');
                    break;
                case 'success':
                    // console.log('✅ ' + formattedMsg, data || '');
                    break;
                default:
                    // console.log(formattedMsg, data || '');
            }
        }

        // Public API methods
        getCounts(source) {
            if (this.contexts[source] && this.contexts[source].counts) {
                return this.contexts[source].counts;
            }
            return {};
        }

        getStats() {
            var stats = {};
            for (var key in this.stats) {
                if (this.stats.hasOwnProperty(key)) {
                    stats[key] = this.stats[key];
                }
            }
            return stats;
        }

        getQueries(source) {
            if (this.contexts[source] && this.contexts[source].queries) {
                return Array.from(this.contexts[source].queries.values());
            }
            return [];
        }

        async forceValidation() {
            // return await this.validateAndRestoreQueries();
        }
    }