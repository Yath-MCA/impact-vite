/**
 * QueryPanelModule - Handles panel UI for queries/comments
 */
class QueryPanelModule {
    constructor(name, errorTracker = {}, config) {
        this.name = name;
        this.parent = window.queryModule;
        this.panel = null;
        this.elements = {};
        this.currentView = 'queries';
        // this.initialize();
        this.toastMode = {
            // or "stack"
            toastMode: "stack",
            // or "top-left"
            toastPosition: "bottom-right"
        };
        // NEW: Caching system
        this._renderCache = {
            lastRenderTime: 0,
            // id → html string
            queryHtmlMap: new Map(),
            // id → html string
            commentHtmlMap: new Map(),
            // Track previously rendered IDs
            lastQueryIds: new Set(),
            lastCommentIds: new Set(),
            // 120 seconds in milliseconds
            cacheWindow: 120000
        };


        this._bindMethods();
        this._boundHandleTabClick = this.handleTabClick.bind(this);

        const intervalId = setInterval(() => {
            if (IS_TRACK_VIEW && typeof this.initialize === "function") {
                if (typeof window.InitialLoadDialog !== "undefined" && window.InitialLoadDialog.FullyLoaded) {
                    this.initialize();
                    // stop once initialized
                    clearInterval(intervalId);
                }
            } else {
                // stop if not applicable
                clearInterval(intervalId);
            }
        }, 500);

    }

    _ensureParent() {
        if (!this.parent && window.queryModule) {
            this.parent = window.queryModule;
        }
        return this.parent;
    }

    _bindMethods() {

        const methodsToBind = [
            'handleSaveReply',
            'handleClearReply',
            'handleUpdateReply',
            'handleDeleteReply',
            'handleAttachFile',
            'handleFileChange',
            'assignVariablesEventLoop',
        ];

        methodsToBind.forEach(method => {
            if (this[method]) {
                this[method] = this[method].bind(this);
            }
        });
    }

    /**
     * ✅ Check if we're within cache window
     * @returns {boolean} true if last render was within cache window
     */
    _isWithinCacheWindow() {
        const now = Date.now();
        const timeSinceLastRender = now - this._renderCache.lastRenderTime;
        return timeSinceLastRender < this._renderCache.cacheWindow;
    }

    /**
     * ✅ Get changed items by comparing with cached IDs
     * @param {Array} currentItems - Current items to render
     * @param {Set} cachedIds - Previously rendered IDs
     * @returns {Array} Only items that are new or modified
     */
    _getChangedItems(currentItems, cachedIds) {
        return currentItems.filter(item => {
            return !cachedIds.has(item.id);
        });
    }

    /**
     * ✅ Update cache with rendered items
     * @param {Array} items - Items that were rendered
     * @param {String} type - 'query' or 'comment'
     */
    _updateCache(items, type) {
        const isComment = type === 'comment';
        const htmlMap = isComment ? this._renderCache.commentHtmlMap : this._renderCache.queryHtmlMap;
        const idSet = isComment ? this._renderCache.lastCommentIds : this._renderCache.lastQueryIds;

        items.forEach(item => {
            const html = this.templates.renderItemWithMode(item, isComment);
            htmlMap.set(item.id, html);
            idSet.add(item.id);
        });

        this._renderCache.lastRenderTime = Date.now();
    }

    /**
     * ✅ Invalidate cache for specific type
     * @param {String} type - 'query', 'comment', or null for all
     */
    _invalidateCache(type = null) {
        if (type === 'query' || type === null) {
            this._renderCache.queryHtmlMap.clear();
            this._renderCache.lastQueryIds.clear();
        }
        if (type === 'comment' || type === null) {
            this._renderCache.commentHtmlMap.clear();
            this._renderCache.lastCommentIds.clear();
        }
        this._renderCache.lastRenderTime = 0;
    }

    _invalidateCachedItem(itemId, isComment = false) {
        const htmlMap = isComment ? this._renderCache.commentHtmlMap : this._renderCache.queryHtmlMap;
        const idSet = isComment ? this._renderCache.lastCommentIds : this._renderCache.lastQueryIds;
        htmlMap.delete(itemId);
        idSet.delete(itemId);
    }

    /**
     * ✅ Render single item and update DOM
     * @param {String} itemId - Item ID to render
     * @param {Boolean} isComment - true for comment, false for query
     * @returns {Boolean} true if successfully rendered
     */
    _renderSingleItem(itemId, isComment) {
        const item = this.parent.getQuery(itemId);
        if (!item) {
            console.warn(`Item ${itemId} not found`);
            return false;
        }

        // Get appropriate container
        const container = isComment ?
            this.elements.query.commentList :
            this.elements.query.queryList;

        if (!container) {
            console.warn(`Container for ${isComment ? 'comments' : 'queries'} not found`);
            return false;
        }

        // Find existing element
        const existingEl = container.querySelector(`[data-query-id="${itemId}"]`);
        const html = this.templates.renderItemWithMode(item, isComment);
        const newEl = this._createRenderableElement(html, itemId);

        if (!newEl) {
            if (existingEl) existingEl.remove();
            return false;
        }

        if (existingEl) {
            existingEl.replaceWith(newEl);
        } else {
            container.querySelectorAll('.empty-state').forEach(el => el.remove());
            container.appendChild(newEl);
        }

        // Update cache
        const htmlMap = isComment ?
            this._renderCache.commentHtmlMap :
            this._renderCache.queryHtmlMap;
        const idSet = isComment ?
            this._renderCache.lastCommentIds :
            this._renderCache.lastQueryIds;

        htmlMap.set(itemId, html);
        idSet.add(itemId);
        this._renderCache.lastRenderTime = Date.now();

        // Setup event listeners for this item
        this.setupPanelEventListeners();
        this.parent.downloadFileNameVisibility();

        return true;
    }

    getCurrentFilterState() {
        const activeFilter = document.querySelector('.queryCount.NG_Color[data-shown]');
        if (activeFilter && activeFilter.dataset && activeFilter.dataset.shown) {
            return String(activeFilter.dataset.shown).toLowerCase() === "open" ? "open" : "all";
        }

        const queryShown = this.elements && this.elements.query && this.elements.query.queryList ?
            this.elements.query.queryList.getAttribute('data-shown') : "";
        const commentShown = this.elements && this.elements.query && this.elements.query.commentList ?
            this.elements.query.commentList.getAttribute('data-shown') : "";
        const shown = queryShown || commentShown || "all";
        return String(shown).toLowerCase() === "open" ? "open" : "all";
    }

    renderItemPreserveFilter(itemId, type = false) {
        const shown = this.getCurrentFilterState();
        const didRender = this.renderItem(itemId, type);
        this.filterQueries(shown);
        return didRender;
    }

    updateItemFilterStatus(itemId, type = false) {
        try {
            if (!this.elements.query) {
                this.setupPanels();
            }

            const isComment = this._normalizeType(type);
            const container = isComment ?
                this.elements.query.commentList :
                this.elements.query.queryList;
            const item = this.parent.getQuery(itemId);
            const row = container && container.querySelector(`[data-query-id="${itemId}"]`);

            if (!item || !row) return false;

            const status = this.parent && typeof this.parent.resolvePanelFilterStatus === "function" ?
                this.parent.resolvePanelFilterStatus(item) :
                (item.status || "");

            row.classList.remove("qcp-filter-open", "qcp-filter-closed", "qcp-filter-deleted");
            row.classList.add(`qcp-filter-${status || "open"}`);

            const labelEl = row.querySelector(".data-label");
            if (labelEl) {
                labelEl.setAttribute("data-status", item.status || status || "");
                if (this.parent && this.parent._state && this.parent._state.isCollator && item.collationStatus) {
                    labelEl.setAttribute("data-collation-status", item.collationStatus || "");
                }
            }

            const statusIconEl = row.querySelector(".status-icon");
            if (statusIconEl && this.templates && typeof this.templates.getStatusIcon === "function") {
                statusIconEl.setAttribute("src", this.templates.getStatusIcon(item.status || status || "", item));
                statusIconEl.setAttribute("alt", item.status || status || "");
            }

            this.filterQueries(this.getCurrentFilterState());
            return true;
        } catch (err) {
            console.error("queryPanel updateItemFilterStatus failed:", err);
            return false;
        }
    }

    scheduleRenderItemPreserveFilter(itemId, type = false, delay = 250) {
        if (!this._renderTimers) {
            this._renderTimers = new Map();
        }

        const key = `${type || "query"}:${itemId}`;
        if (this._renderTimers.has(key)) {
            clearTimeout(this._renderTimers.get(key));
        }

        const timer = setTimeout(() => {
            this._renderTimers.delete(key);
            this.renderItemPreserveFilter(itemId, type);
        }, delay);

        this._renderTimers.set(key, timer);
        return timer;
    }

    /**
     * ✅ Render list with smart caching
     * @param {Array} items - Items to render
     * @param {String} type - 'query' or 'comment' for cache tracking
     * @param {HTMLElement} container - Target container
     * @param {String} emptyMessage - Empty state message
     */
    _renderList(items, type, container, emptyMessage) {
        if (!container) return;

        const isComment = type === 'comment';
        const cachedIds = isComment ? this._renderCache.lastCommentIds : this._renderCache.lastQueryIds;
        const htmlMap = isComment ? this._renderCache.commentHtmlMap : this._renderCache.queryHtmlMap;

        // Determine if we should use cache or do full render
        const useCache = this._isWithinCacheWindow() && cachedIds.size > 0;
        let itemsToRender = items;
        let isIncrementalUpdate = false;

        if (useCache) {
            // Get only changed items
            itemsToRender = this._getChangedItems(items, cachedIds);
            isIncrementalUpdate = itemsToRender.length > 0;

            // Check for deleted items
            const currentIds = new Set(items.map(i => i.id));
            const deletedIds = Array.from(cachedIds).filter(id => !currentIds.has(id));

            if (deletedIds.length > 0) {
                // Remove deleted items from DOM
                deletedIds.forEach(id => {
                    const el = container.querySelector(`[data-query-id="${id}"]`);
                    if (el) el.remove();
                    cachedIds.delete(id);
                    htmlMap.delete(id);
                });
                isIncrementalUpdate = true;
            }

            // If no changes at all, skip rendering
            if (!isIncrementalUpdate) {
                this.parent.downloadFileNameVisibility();
                return;
            }
        } else {
            // Full re-render: clear cache and container
            this._invalidateCache(type);
            container.innerHTML = '';
        }

        // Render items (either changed or all)
        if (itemsToRender.length === 0 && !useCache) {
            // Empty state for full render
            container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
        } else if (itemsToRender.length > 0) {
            // Render changed/new items
            const html = itemsToRender
                .map(item => this.templates.renderItemWithMode(item, isComment))
                .join('')
                .trim();

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            if (useCache && isIncrementalUpdate) {
                // Incremental: append or update
                Array.from(tempDiv.children).forEach(newEl => {
                    const itemId = newEl.getAttribute('data-query-id');
                    const existingEl = container.querySelector(`[data-query-id="${itemId}"]`);

                    if (existingEl) {
                        existingEl.replaceWith(newEl);
                    } else {
                        container.appendChild(newEl);
                    }
                });
            } else {
                // Full render
                container.innerHTML = html;
            }

            // Update cache with rendered items
            this._updateCache(itemsToRender, type);
        }

        // Final cleanup: ensure cache reflects current state
        const currentIds = new Set(items.map(i => i.id));
        Array.from(cachedIds).forEach(id => {
            if (!currentIds.has(id)) {
                cachedIds.delete(id);
                htmlMap.delete(id);
            }
        });
    }

    _createRenderableElement(html, itemId = "") {
        if (typeof html !== "string" || !html.trim()) {
            if (itemId) console.warn(`Skipping render for item ${itemId}: empty template output`);
            return null;
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html.trim();

        const newEl = tempDiv.firstElementChild;
        if (!newEl) {
            if (itemId) console.warn(`Skipping render for item ${itemId}: no element output`);
            return null;
        }

        return newEl;
    }

    /**
     * ✅ Main render function with smart caching and selective rendering
     * @param {Boolean} reload - Force full reload of queries from DOM
     * @param {Boolean|String} renderType - false/null (both), true/'comment' (comments only), 'query' (queries only)
     * 
     * Usage:
     // Smart render both with caching
     *   render()
     // Full reload of both
     *   render(true)
     // Smart render comments only
     *   render(false, true)
     // Smart render queries only
     *   render(false, 'query')
     // Full reload comments only
     *   render(true, 'comment')
     */
    render(reload = false, renderType = false) {
        this._ensureParent();
        if (!this.templates && this.parent && this.parent.templates) {
            this.templates = this.parent.templates;
        }
        if (!this.templates || !this.templates.renderItemWithMode) {
            setTimeout(() => this.render(reload, renderType), 500);
            return;
        }

        // Single DRY state sanitizer: prune stale transient items + dedupe clones.
        if (this.parent && typeof this.parent.sanitizeStateItems === 'function') {
            this.parent.sanitizeStateItems({
                removeOnlyGeneratedIds: true,
                prune: true,
                dedupe: true
            });
        }

        // Normalize renderType parameter
        const renderQueries = !renderType || renderType === 'query' || renderType === false;
        const renderComments = !renderType || renderType === 'comment' || renderType === true;

        // Full reload: clear cache and reload from DOM for specified types
        if (reload) {
            if (renderQueries) {
                this._invalidateCache('query');
                this.parent._state.queries.clear();
            }
            if (renderComments) {
                this._invalidateCache('comment');
                this.parent._state.comments.clear();
            }
            this.parent.loadQueriesFromDOM();
        }

        // Render queries if specified
        if (renderQueries) {
            const queryItems = this.parent.getAllQueries();
            const sortedQueries = this.parent.sortItems(queryItems, 'query', false);

            this._renderList(
                sortedQueries,
                'query',
                this.elements.query.queryList,
                "No queries found"
            );
        }

        // Render comments if specified
        if (renderComments) {
            const commentItems = Array.from(this.parent._state.comments.values());
            const sortedComments = this.parent.sortItems(commentItems, 'comment', true);

            this._renderList(
                sortedComments,
                'comment',
                this.elements.query.commentList,
                "No comments found"
            );
        }

        // Setup event listeners
        this.setupPanelEventListeners();
        this.parent.downloadFileNameVisibility();

        // Show success toast only on full reload
        if (reload) {
            this.showToast('Panel was refreshed successfully', 'success');
        }

        this.parent.currentQuery = null;
    }

    /**
     * ✅ Normalize type parameter
     * @param {Boolean|String} type - 'query'/'comment' or true/false
     * @returns {Boolean} true for comment, false for query
     */
    _normalizeType(type) {
        if (typeof type === 'string') {
            return type.toLowerCase() === 'comment';
        }
        return type === true;
    }

    /**
     * ✅ Render or update a single item (query or comment)
     * @param {String} itemId - Item ID to render
     * @param {Boolean|String} type - 'query'/'comment' or true/false (true = comment, false = query)
     * @returns {Boolean} Success status
     * 
     * Usage:
     // Render single query
     *   renderItem('query_123', false)
     // Render single query
     *   renderItem('query_123', 'query')
     // Render single comment
     *   renderItem('comment_456', true)
     // Render single comment
     *   renderItem('comment_456', 'comment')
     */
    renderItem(itemId, type = false) {
        try {
            if (!this.elements.query) {
                this.setupPanels();
            }

            // ✅ Normalize type parameter
            const isComment = this._normalizeType(type);

            const item = this.parent.getQuery(itemId);
            if (!item) {
                console.warn(`Item ${itemId} not found`);
                return false;
            }

            // Always update only the changed row (create, reply, or update).
            // Full _renderList is reserved for render()/refresh(true), deletes, filters, etc.
            this._renderSingleItem(itemId, isComment);

            this.setupPanelEventListeners();
            this.parent.downloadFileNameVisibility();

            return true;
        } catch (error) {
            console.error("queryPanel renderItem failed:", error);
            return false;
        }
    }

    /**
     * ✅ Remove item from rendering
     * @param {String} itemId - Item ID to remove
     * @param {Boolean|String} type - 'query'/'comment' or true/false (true = comment, false = query)
     * 
     * Usage:
     // Remove query
     *   removeItem('query_123', false)
     // Remove query
     *   removeItem('query_123', 'query')
     // Remove comment
     *   removeItem('comment_456', true)
     // Remove comment
     *   removeItem('comment_456', 'comment')
     */
    removeItem(itemId, type = false) {
        // ✅ Normalize type parameter
        const isComment = this._normalizeType(type);

        const container = isComment ?
            this.elements.query.commentList :
            this.elements.query.queryList;

        if (!container) return false;

        const element = container.querySelector(`[data-query-id="${itemId}"]`);
        if (element) {
            element.remove();

            // Update cache
            const idSet = isComment ?
                this._renderCache.lastCommentIds :
                this._renderCache.lastQueryIds;
            const htmlMap = isComment ?
                this._renderCache.commentHtmlMap :
                this._renderCache.queryHtmlMap;

            idSet.delete(itemId);
            htmlMap.delete(itemId);

            this._updateAllLabels(isComment);
            this.setupPanelEventListeners();
            this.parent.downloadFileNameVisibility();
            return true;
        }

        return false;
    }

    /**
     * ✅ Update labels for all items of a specific type
     * Called when new items added or items deleted
     * @param {Boolean} isComment - true for comments, false for queries
     */
    _updateAllLabels(isComment) {
        const allItems = isComment ?
            Array.from(this.parent._state.comments.values()) :
            this.parent.getAllQueries();

        const sortedItems = this.parent.sortItems(allItems, isComment ? 'comment' : 'query', isComment);
        const container = isComment ?
            this.elements.query.commentList :
            this.elements.query.queryList;

        if (!container || !sortedItems) return false;

        // Update DOM with new labels
        sortedItems.forEach((item, index) => {
            const el = container.querySelector(`[data-query-id="${item.id}"]`);
            if (el) {
                // Update label in header
                const labelEl = el.querySelector('.data-label');
                if (labelEl) {
                    labelEl.textContent = item.label;
                    labelEl.setAttribute('data-status', item.status);
                }
            }
        });

        return true;
    }

    /**
     * ✅ Batch update labels for all queries and comments
     * Use when multiple items added/removed
     */
    _updateAllTypeLabels() {
        // Update all query labels
        this._updateAllLabels(false);
        // Update all comment labels
        this._updateAllLabels(true);
    }

    /**
     * ✅ Get cache statistics
     * @returns {Object} Cache info
     */
    getCacheStats() {
        const now = Date.now();
        const timeSinceLastRender = now - this._renderCache.lastRenderTime;

        return {
            cachedQueries: this._renderCache.queryHtmlMap.size,
            cachedComments: this._renderCache.commentHtmlMap.size,
            lastQueryIds: Array.from(this._renderCache.lastQueryIds),
            lastCommentIds: Array.from(this._renderCache.lastCommentIds),
            lastRenderTime: new Date(this._renderCache.lastRenderTime).toISOString(),
            timeSinceLastRender: `${(timeSinceLastRender / 1000).toFixed(2)}s`,
            isWithinCacheWindow: this._isWithinCacheWindow(),
            cacheWindowMs: this._renderCache.cacheWindow
        };
    }

    // ========== Existing Methods ==========

    setReplyMode(mode) {
        this.globalReplyMode = mode;
        this.globalQuickReplyMode = mode === 'quick';
        this.refreshReplyInterfaces();
    }

    toggleQuickReplyMode() {
        this.globalQuickReplyMode = !this.globalQuickReplyMode;
        this.globalReplyMode = this.globalQuickReplyMode ? 'quick' : 'default';
        this.refreshReplyInterfaces();
    }

    getReplyMode() {
        return {
            current: this.globalReplyMode,
            quickModeEnabled: this.globalQuickReplyMode
        };
    }

    refreshReplyInterfaces() {
        this.render();
    }

    async initialize() {
        if (this._panelInitStarted) {
            return;
        }
        this._panelInitStarted = true;

        // Wait for the existing structure to be ready
        const checkContainer = setInterval(() => {
            this._ensureParent();
            const tocSection = document.getElementById('iTOC_Section');
            const leftPanelBody = document.getElementById('leftPanel_Body');
            const readyForQueries = this.parent && this.parent.loadQueriesFromDOM && this.parent.editorDocBody;
            var canProceed = !!(this.parent && this.parent.templates);
            if (canProceed && tocSection && leftPanelBody && readyForQueries) {
                this.templates = this.parent.templates;
                clearInterval(checkContainer);


                const parent = this && this.parent;
                const state = parent && parent._state;
                const queries = state && state.queries;
                const isCollator = parent && parent.isCollator;

                if (isCollator) {

                }


                this.container = tocSection;
                this.setupPanels();
                this.enhanceExistingStructure();
                this.parent.loadQueriesFromDOM();
                this.render();

                if (queries && queries.size > 0) {
                    this.switchPanel('query');
                }

            } else if (IS_TRACK_VIEW && this.parent && typeof this.parent.loadQueriesFromDOM === 'function') {
                this.parent.loadQueriesFromDOM();
                clearInterval(checkContainer);
            }
        }, 100);

        const checkModule = setInterval(async () => {
            this._ensureParent();
            if (this.parent && this.parent.attachmentModule) {
                this.attachmentModule = this.parent.attachmentModule;
                clearInterval(checkModule);

                // Setup attachment callbacks for dialog
                // this.setupAttachmentCallbacks();
            }
        }, 500);

    }


    setupPanels() {
        // Cache existing panel elements
        this.elements.panels = {
            toc: document.getElementById('toc_panel'),
            query: document.getElementById('query_panel'),
            comment: document.getElementById('comment_panel')
        };

        // Cache tab buttons
        this.elements.tabs = {
            toc: document.getElementById('btn_toc'),
            query: document.getElementById('btn_qry'),
            comment: document.getElementById('btn_cts'),
        };

        // Get query and comment specific containers
        this.elements.query = {
            // Query panel elements
            queryList: document.querySelector('#query_panel .query-list'),
            queryBody: document.querySelector('#query_panel .query-body'),
            commentList: document.querySelector('#comment_panel .comment-list'),


            // Count elements
            queryCount: document.getElementById("qTotal"),
            openCount: document.getElementById("qOpen"),
            commentCount: document.getElementById("cTotal"),
            commentOpenCount: document.getElementById("cOpen"),

            // Tab buttons - these were missing
            tabButtons: [
                document.getElementById("btn_toc"),
                document.getElementById("btn_qry"),
                document.getElementById("btn_cts"),
                ...document.querySelectorAll(".queryCount")
                // Remove nulls
            ].filter(Boolean),

            // Refresh button - needs to be created or found
            // refreshBtn: document.getElementById("qcp-refresh") || this.createRefreshButton(),
            addCmdBtn: document.getElementById("addcmt")
        };
    }

    createRefreshButton() {
        // Create refresh button if it doesn't exist
        const btn = document.createElement('button');
        btn.id = 'qcp-refresh';
        btn.className = 'btn btn-sm';
        btn.innerHTML = '<i class="fa fa-refresh"></i>';
        btn.title = 'Refresh';

        // Try to insert it in the header
        const header = document.querySelector('.toc-query-header');
        if (header) {
            // header.appendChild(btn);
        }

        // return btn;
    }

    enhanceExistingStructure() {
        // Add query-body div if missing
        if (!this.elements.query.queryBody) {
            const queryGroupTab = document.getElementById('queryGroupTab');
            if (queryGroupTab) {
                const queryList = queryGroupTab.querySelector('.query-list');
                // if (queryList && !queryList.querySelector('.query-body')) {
                //     queryList.innerHTML = '<div class="query-body"></div>';
                //     this.elements.query.queryBody = queryList.querySelector('.query-body');
                // }
            }
        }

        // Override existing onclick handlers
        this.overrideTabHandlers();
    }

    overrideTabHandlers() {
        // Replace Show_TOC_Query_Panel with enhanced version

    }



    getActivePanel() {
        return this.activePanel;
    }

    updateCounts(counts) {

        if (this.elements.query.queryCount) {
            this.elements.query.queryCount.textContent = counts.total;
        }
        if (this.elements.query.openCount) {
            this.elements.query.openCount.textContent = counts.open;
        }
        if (this.elements.query.commentCount) {
            this.elements.query.commentCount.textContent = counts.comments;
        }
        if (this.elements.query.commentOpenCount) {
            this.elements.query.commentOpenCount.textContent = counts.commentsOpen != null ? counts.commentsOpen : 0;
        }

        // Update tab badges / filter control data-value
        const qryBadge = this.elements.tabs.query && this.elements.tabs.query.querySelector('.badge, #qAllCountDiv');
        const ctsBadge = this.elements.tabs.comment && this.elements.tabs.comment.querySelector('.badge, #cTotal');
        const qAll = document.getElementById('qAllCountDiv');
        const qOpen = document.getElementById('qOpenCountDiv');
        const cAll = document.getElementById('cAllCountDiv');
        const cOpen = document.getElementById('cOpenCountDiv');

        if (qryBadge) qryBadge.setAttribute('data-value', counts.total);
        if (ctsBadge) ctsBadge.setAttribute('data-value', counts.comments);
        if (qAll) qAll.setAttribute('data-value', counts.total);
        if (qOpen) qOpen.setAttribute('data-value', counts.open);
        if (cAll) cAll.setAttribute('data-value', counts.comments);
        if (cOpen) cOpen.setAttribute('data-value', counts.commentsOpen != null ? counts.commentsOpen : 0);
    }




    filterQueries(showType, element = null) {
        const {
            query
        } = this.elements;

        const normalized = String(showType || "all").toLowerCase();
        const shown = normalized === "open" ? "open" : "all";

        if (showType != null && showType !== "") {
            if (query && query.queryList) query.queryList.setAttribute('data-shown', shown);
            if (query && query.commentList) query.commentList.setAttribute('data-shown', shown);

            const queryPanel = document.getElementById('query_panel');
            const commentPanel = document.getElementById('comment_panel');
            if (queryPanel) queryPanel.setAttribute('data-shown', shown);
            if (commentPanel) commentPanel.setAttribute('data-shown', shown);

            // Keep All/Open highlight in sync on both count rows
            document.querySelectorAll('.queryCount[data-shown]').forEach((el) => {
                el.classList.toggle('NG_Color', String(el.dataset.shown || '').toLowerCase() === shown);
            });
        } else if (element) {
            $(element).addClass('NG_Color');
        }
    }


    // Inside your class
    handleTabClick(e) {
        try {
            const target = e.target.closest('[data-view], [data-panel]');
            const fileterBtn = e.target.closest('.queryCount');

            if (e.target.id === "addcmt" || e.target.closest("#addcmt")) {
                if (typeof IS_TRACK_VIEW !== "undefined" && IS_TRACK_VIEW) {
                    // Track View: no create
                    return;
                }
                const dialog = this.parent.dialogModule || window.queryDialog;
                if (dialog && typeof dialog.open === "function") {
                    dialog.open();
                }
            } else if (target) {
                this.switchView(target.dataset.view || target.dataset.panel);
            } else if (fileterBtn) {
                this.filterQueries(fileterBtn.dataset.shown, fileterBtn);
            }
        } catch (err) {
            console.error('Error handling tab click:', err);
            // optionally report to tracking
        }
    }
    switchPanel(panelType) {

        const {
            panels,
            tabs
        } = this.elements;

        // Remove active class from all panels and tabs
        $.each(panels, (_, el) => $(el).removeClass('active'));
        $.each(tabs, (_, el) => $(el).removeClass('active'));

        // ? Activate selected ones
        $(panels[panelType]).addClass('active');
        $(tabs[panelType]).addClass('active');

        this.activePanel = panelType;

        // ? Refresh content for query/comment panels
        if (['query', 'comment'].includes(panelType)) {
            typeof this.refreshPanelContent === "function" && this.refreshPanelContent(panelType);
            typeof this.parent.downloadFileNameVisibility === "function" && this.parent.downloadFileNameVisibility();
        }
    }


    switchView(view) {
        const {
            query
        } = this.elements;
        this.currentView = view;

        // Update tab buttons
        query.tabButtons.forEach(btn => {
            btn.classList.toggle(
                'active',
                btn.dataset.view === view || btn.dataset.panel === view
            );
        });
        this.switchPanel(view);
    }

    syncWithEditor(queryId) {
        return this.parent.setCursorOnEditor(queryId);
    }

    async handlePanelClick(e) {
        const target = e.target;

        const queryId = target.closest('.query-item') && target.closest('.query-item').dataset.queryId;
        if (!queryId) return;

        if (target.closest('.reply-form')) {
            debug.log("evt return");
        }

        // Track View: open readonly thread dialog (no reply/edit chrome)
        if (typeof IS_TRACK_VIEW !== "undefined" && IS_TRACK_VIEW) {
            const query = this.parent && typeof this.parent.getQuery === "function" ? this.parent.getQuery(queryId) : null;
            const process = query && (query.status === "comment" || /^C/i.test(query.label || "")) ? "comment" : "query";
            const dialog = (this.parent && this.parent.dialogModule) || window.queryDialog;
            if (dialog && typeof dialog.open === "function") {
                dialog.open(queryId, process, {
                    readonly: true
                });
            }
            return;
        }

        // Reply button
        if (target.closest('.reply-btn, .close-btn')) {
            // this.syncWithEditor(queryId);
            this.showReplyForm(queryId);
            return;
        }

        // Edit button
        if (target.closest('.edit-btn')) {
            // this.syncWithEditor(queryId);
            this.showReplyForm(queryId);
            return;
        }


        // quick reply button
        if (target.closest('.quick-reply-btn')) {
            var btn = target.closest('.quick-reply-btn');
            this.quickButtonHandler(btn, queryId);
            return;
        }

        var isLocked = !this.syncWithEditor(queryId);
        if (isLocked) return console.warn("query was locked");

        this.syncWithEditor(queryId);
    }



    checkSiblingTextAreaIsOpen() {
        // Find all visible reply containers
        const openContainers = [...document.querySelectorAll('.textarea-container')]
            .filter(c => window.getComputedStyle(c).display === 'block');

        if (!openContainers.length) return false;

        let hasContent = false;

        for (const container of openContainers) {
            const queryItem = container.closest(".query-item");
            const queryId = queryItem.dataset.queryId;

            const saveResults = this.parent.getCurrentFormContent(container, queryId);

            if (saveResults.hasContent) {
                hasContent = true;
            } else {
                // Close empty reply container
                this.showReplyForm(queryId);
            }
        }

        if (hasContent) {
            // at least one has input
            return true;
        }

        // No content anywhere -> focus last textarea before closing
        const lastContainer = openContainers[openContainers.length - 1];
        const lastTextarea = lastContainer.querySelector('.reply-textarea');
        if (lastTextarea) {
            lastTextarea.focus();
            return true;
        }
        return false;
    }



    async quickButtonHandler(btn, queryId) {

        if (this.checkSiblingTextAreaIsOpen()) {
            return;
        }

        this.syncWithEditor(queryId);

        const buttonText = btn.dataset.text;
        const buttonTextLower = buttonText.toLowerCase();

        const queryContainer = btn.closest('.query-item');
        const replyContainer = queryContainer.querySelector('.reply-container');
        const form = replyContainer.querySelector('.reply-form');
        const textareaContainer = form.querySelector('.textarea-container');
        const textarea = textareaContainer.querySelector('.reply-textarea');
        const actionContainer = queryContainer.querySelector(".query-actions");


        $(".quick-reply-btn", replyContainer).prop("disabled", true);
        if (btn.parentElement && btn.parentElement.style.display == "block") return;

        // ? Check if this requires textarea (free-text presets e.g. TS Notes, Add Comment)
        if (this.parent && typeof this.parent.isFreeTextQuickReplyButton === "function" ?
            this.parent.isFreeTextQuickReplyButton(buttonText) :
            (buttonTextLower.includes('add') || buttonTextLower.includes('instruction'))) {
            // ? Show textarea for custom input
            textareaContainer.style.display = 'block';
            textarea.placeholder = `Enter your ${buttonTextLower}...`;
            textarea.focus();

            // Hide quick reply buttons temporarily
            btn.parentElement.style.display = 'none';

            if (actionContainer) {
                const replyBtn = actionContainer.querySelector(".reply-btn");
                const closeBtn = actionContainer.querySelector(".close-btn");

                // already present, do nothing
                if (closeBtn) return;

                if (replyBtn) {
                    this.updateButton(replyBtn, 'close');
                } else {
                    const closeButton = this.templates.renderActionBtn("close", true);
                    if (closeButton && closeButton.nodeType === 1) {
                        actionContainer.appendChild(closeButton);
                    }
                }
            }

            this.setupReplyHandlers(queryId, replyContainer);
        } else {
            var queryId = queryContainer.dataset.queryId;
            // Direct quick reply - submit immediately
            await this.submitQuickReply(queryId, buttonText);

            // Close the reply form after successful submission
            const closeBtn = queryContainer.querySelector('.close-btn');
            if (closeBtn) {
                closeBtn.click();
            }
        }
    }

    showReplyForm(queryId) {

        if (!this.elements || !this.elements.panels) return;

        // 1️⃣ Get main panels
        var queryPanel = this.elements.panels.query;
        var commentPanel = this.elements.panels.comment;

        // 2️⃣ Find the query item by data-query-id
        var selectors = '[data-query-id="' + queryId + '"]';
        var queryItem = null;

        if (queryPanel) queryItem = queryPanel.querySelector(selectors);
        if (!queryItem && commentPanel) queryItem = commentPanel.querySelector(selectors);
        if (!queryItem) {
            this.render(true);
            return console.warn('query/ comment missing');
        }

        // 3️⃣ Ensure reply container exists
        var replyContainer = queryItem.querySelector(".reply-container");
        if (!replyContainer) {
            replyContainer = document.createElement("div");
            replyContainer.className = "reply-container";
            queryItem.appendChild(replyContainer);
        }

        // 4️⃣ Find reply-related button
        var replyBtn = queryItem.querySelector(".reply-btn, .close-btn, .edit-btn");

        // 5️⃣ Determine whether reply form is already open
        var isOpen = replyContainer.style.display === "block";

        // 6️⃣ Toggle
        if (isOpen) {
            this.closeReplyForm(queryId, replyContainer, replyBtn);
        } else {
            var canProceed = true;
            if (this.parent.showBeforeloop) {
                canProceed = this.parent.showBeforeloop(queryId);
            }
            if (canProceed) {
                this.openReplyForm(queryId, replyContainer, replyBtn);
            }
        }
    }

    getActionFromButton(btn) {
        if (!btn || !btn.classList) return null;

        // Check class names first (preferred)
        if (btn.classList.contains("reply-btn")) return "reply";
        if (btn.classList.contains("edit-btn")) return "edit";
        if (btn.classList.contains("close-btn")) return "close";
        if (btn.classList.contains("delete-btn")) return "delete";

        // Fallback: use title attribute if class not found
        var title = btn.getAttribute("title");
        return title ? title.toLowerCase() : null;
    }

    async openReplyForm(queryId, container, btn) {
        var query = this.parent ? this.parent.getQuery(queryId) : null;

        var rSameUserRole = (query && query.lastResponse && query.lastResponse.sameUserRole) || false;
        var sameUserRole = (query && query.sameUserRole && query.responses.length == 0) || false;

        this.parent._state._mode = this.getActionFromButton(btn);
        // this.parent._state._mode = (sameUserRole || rSameUserRole) ? "edit" : 'reply';

        // Render form HTML
        var formHTML = (this.templates && typeof this.templates.renderReplyForm === "function") ?
            this.templates.renderReplyForm(query) :
            "";

        container.innerHTML = formHTML;
        container.style.display = "block";

        // Remove response if same user role (edit mode)
        if ((sameUserRole || rSameUserRole) && container.parentElement) {
            var responseEl = container.parentElement.querySelector(".response-item");
            var originalEl = container.parentElement.querySelector(".query-body");
            const proceesEl = responseEl ? responseEl : originalEl;
            if (proceesEl && proceesEl.parentNode) {
                proceesEl.parentNode.removeChild(proceesEl);
            }
        }


        // Update button and bind reply handlers
        this.updateButton(btn, "close");
        if (typeof this.setupReplyHandlers === "function") {
            this.setupReplyHandlers(queryId, container);
        }

        if (this.parent && this.parent._state) {
            this.parent._state._currentOpen = query;
        }
    }

    // ✅ Simplified closeReplyForm
    async closeReplyForm(queryId, container, btn) {
        var self = this;
        var {
            canProceed,
            getCurrentFormContent,
            getQuery
        } = this.parent;

        return await canProceed({
            getCurrentFormContent: getCurrentFormContent.bind(this.parent),
            container: container,
            queryId: queryId,
            action: 'close',
            onSuccess: function() {
                var query = getQuery(queryId);
                var rSameUserRole = (query && query.lastResponse && query.lastResponse.sameUserRole) || false;
                var sameUserRole = (query && query.sameUserRole && query.responses.length == 0) || false;
                var optBtn = (sameUserRole || rSameUserRole) ? "edit" : "reply";

                self.updateButton(btn, optBtn);
                const renderType = query.status === 'comment' ? 'comment' : 'query';
                self.renderItem(query.id, renderType);

                // Close and clear the reply form
                if (window.jQuery && container) {
                    $(container).hide().empty();
                } else if (container) {
                    container.style.display = "none";
                    container.innerHTML = "";
                }
                self.parent._state._mode = "null";
                self.parent.currentQuery = null;
            }
        });
    }



    updateButton(btn, type) {
        const isClose = type === 'close';
        const removeClass = isClose ? 'reply-btn' : 'close-btn';
        const addClass = isClose ? 'close-btn' : 'reply-btn';

        $(btn).html(`<img src="${this.templates.getStatusIcon(type)}" alt="${type}">`)
            .removeClass(removeClass)
            .addClass(addClass);
    }

    setFocusOnTextarea(container) {
        setTimeout(() => {
            const textarea = container.querySelector('.reply-textarea, .dialog-reply-input');
            if (textarea && commonMethods.IsVisibleElm(textarea)) textarea.focus();
        }, 240);
    }

    setupReplyHandlers(queryId, container) {
        const form = container.querySelector('.reply-form');
        const textInput = form.querySelector('.reply-textarea');
        const query = this.parent.getQuery(queryId);

        // 🔹 Detect primary/secondary action buttons dynamically
        const actionButtons = form.querySelectorAll('.default-action-buttons button');
        actionButtons.forEach(btn => {

            if (btn.classList.contains('save-reply')) {
                btn.addEventListener('click', (e) => {
                    if (btn.disabled || btn.classList.contains('is-processing')) return;
                    btn.disabled = true;
                    btn.classList.add('is-processing');
                    this.handleSaveReply(queryId, container).finally(() => {
                        btn.disabled = false;
                        btn.classList.remove('is-processing');
                    });
                }, {
                    once: true
                });
            } else if (btn.classList.contains('update-reply')) {
                btn.addEventListener('click', (e) => {
                    if (btn.disabled || btn.classList.contains('is-processing')) return;
                    btn.disabled = true;
                    btn.classList.add('is-processing');
                    this.handleUpdateReply(queryId, container).finally(() => {
                        btn.disabled = false;
                        btn.classList.remove('is-processing');
                    });
                }, {
                    once: true
                });
            } else if (btn.classList.contains('clear-reply')) {
                btn.addEventListener('click', () => this.handleClearReply(queryId, container), {
                    once: true
                });
            }

        });

        // textInput.addEventListener('paste', e => this.parent.HandlingPaste(e.currentTarget));
        this.parent.handlingEvtPaste(textInput);
        this.setFocusOnTextarea(container);
        // Setup attachments after rendering
        setTimeout(() => {
            const attachMod = this.attachmentModule || (this.parent && this.parent.attachmentModule);
            if (attachMod && typeof attachMod.setupUniqueAttachments === 'function') {
                attachMod.setupUniqueAttachments(queryId, container, 'panel');
            }
        }, 100);
    }



    /**
     * Process reply submission or deletion
     */
    async _processReply(queryId, container, isUpdate = false) {
        try {
            const saveInfo = this.parent.getCurrentFormContent(container, queryId);
            const results = await this.parent.operationInsertOrUpdate(this, queryId, saveInfo, {
                btn: container.querySelector(".save-reply"),
                container: container
            });
            const isComment = saveInfo.query && saveInfo.query.status === 'comment';
            if (!results.success) {
                var alerKey = 'Insert_Empty_Query';
                if (queryId) alerKey = isComment ? 'Insert_Empty_Comment' : 'Insert_Empty_Query';
                TOASTER_ALERT(alerKey, {
                    type: 'error'
                });
            }
            // operationInsertOrUpdate / handleResponseUpdates already call renderItem
            return results;
            /*
            const { query, hasContent, htmlData } = saveInfo || {};
            const { sameUserRole = false, id } = query && query.lastResponse || {};
            const canClose = query && query.status && query.status.toLowerCase() === "open";
            const { _attachStore } = this.parent._state;
 
            if (!hasContent) {
                if (!sameUserRole) {
                    this.setFocusOnTextarea(container);
                    return debug.log("Empty reply not allowed");
                } else if (sameUserRole && isUpdate) {
                    // ? Delete the last response if it's from same user and update mode
                    await this.confirmDelete(queryId, "one");
                    return;
                }
            }
 
            // Proceed only if content or attachments exist
            const { pendingUploads = [], pendingDeleted = [], pendingDeletedAll = false } = _attachStore || {};
            if (htmlData || pendingUploads.length > 0 || pendingDeleted.length > 0 || pendingDeletedAll) {
                await this.submitReplyWithAttachments(
                    queryId,
                    htmlData,
                    sameUserRole,
                    id,
                    canClose
                );
            }
            */
        } catch (err) {
            debug.error("Reply processing failed", err);
            this.showToast('Failed to send reply', 'error');
        }
    }


    /** 🔹 Save handler */
    async handleSaveReply(queryId, container) {
        debug.log("handleSaveReply");
        return this._processReply(queryId, container, false);
    }

    async handleUpdateReply(queryId, container) {
        debug.log("handleUpdateReply");
        return this._processReply(queryId, container, true);
    }

    /** 🔹 Clear handler */
    handleClearReply(queryId, container) {
        debug.log("handleClearReply");
        try {
            $(container).find('.attachment-preview,.attachment-preview-item').remove();
            void this.parent.getCurrentFormContent(container, queryId, {
                reset: true
            });
        } catch (err) {
            // ErrorLogTrace("handleClearReply", err.message);
            throw err;
        }
    }


    // Add these helper methods to QueryPanelModule
    async submitQuickReply(queryId, replyText) {
        try {

            // Check if this closes the query
            const closeQuery = !!replyText;

            var results = await this.parent.addResponse(queryId, {
                content: replyText,
                closeQuery: closeQuery
            });

            const query = this.parent.getQuery(queryId);
            const renderType = query && query.status === "comment" ? "comment" : "query";
            if (typeof this.renderItem === "function") {
                this.renderItem(queryId, renderType);
            } else {
                this.refresh();
            }

            // Show success message
            this.showToast(`Reply "${replyText}" sent successfully`);
            return results;
        } catch (err) {
            console.error('Failed to submit quick reply:', err);
            this.showToast('Failed to send reply', 'error');
            throw err;
        }
    }


    refresh(hardReload = false) {
        if (hardReload) this.parent.loadQueriesFromDOM();
        this.render();
    }

    setupPanelEventListeners() {

        if (!this.elements.query) {
            this.setupPanels();
        }

        if (!this.elements.query) {
            return;
        }

        const {
            panels,
            query,
            tabs
        } = this.elements;

        const tabButtons = [...(query.tabButtons || []), query.addCmdBtn].filter(Boolean);

        tabButtons.forEach(btn => {
            if (!btn || btn.dataset.clickEvtReady === 'true') {
                return;
            }
            btn.removeEventListener('click', this._boundHandleTabClick);
            btn.addEventListener('click', this._boundHandleTabClick);
            btn.removeAttribute('onclick');
            btn.setAttribute('data-click-evt', 'ready');
            btn.dataset.clickEvtReady = 'true';
        });

        $(document)
            .off('click.query-item')
            .on('click.query-item', '.query-item', (e) => {
                // the clicked .query-item
                const queryItem = e.currentTarget;
                this.handlePanelClick(e);
            });

        $(document)
            .off('click.query-filter')
            .on('click.query-filter', '.queryCount[data-shown]', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const filterBtn = e.currentTarget;
                this.filterQueries(filterBtn.dataset.shown, filterBtn);
            });

        $(window)
            .off('resize.trimFileName')
            .on('resize.trimFileName', () => {
                if (this.parent && typeof this.parent.downloadFileNameVisibility === 'function') {
                    this.parent.downloadFileNameVisibility();
                }
            });

        setTimeout(() => {
            if (this.parent && typeof this.parent.downloadFileNameVisibility === 'function') {
                this.parent.downloadFileNameVisibility();
            }
        }, 500);

        // Parent event listeners — create/update already call renderItem via
        // handleResponseUpdates; do not soft-refresh the full list here.
        if (this.parent && this.parent.events && !this._parentCountListenerBound) {
            this._parentCountListenerBound = true;
            this.parent.events.addEventListener('counts-updated', e => this.updateCounts(e.detail));
        }

    }


    showToast(message, type = 'success') {
        if (!IS_JOURNAL || IS_JOURNAL) return;
        // Default config: single toast, bottom-left position
        const toastMode = (this.config && this.config.toastMode) || "stack";
        const toastPosition = (this.config && this.config.toastPosition) || "bottom-right";
        const existingToasts = document.querySelectorAll('.toast-notification');

        // Track last shown toast and timestamp
        if (!this._lastToast) this._lastToast = {
            message: null,
            type: null,
            time: 0
        };

        const now = Date.now();
        const timeSinceLast = now - this._lastToast.time;

        // 🚫 Avoid duplicate consecutive messages within 2000 ms
        if (
            this._lastToast.message === message &&
            this._lastToast.type === type &&
            timeSinceLast < 2000
        ) {
            return;
        }

        // ✅ Update last toast info
        this._lastToast = {
            message,
            type,
            time: now
        };

        // If mode = 'single', remove any active toasts
        if (toastMode === "single" && existingToasts.length > 0) {
            existingToasts.forEach(t => t.remove());
        }

        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.textContent = message;

        // Compute position styles
        const vertical = toastPosition.includes('bottom') ? 'bottom' : 'top';
        const horizontal = toastPosition.includes('left') ? 'left' : 'right';

        toast.style.cssText = `
        position: fixed;
        ${vertical}: ${toastMode === "stack" ? 20 + existingToasts.length * 60 : 20}px;
        ${horizontal}: 20px;
        padding: 10px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107'};
        color: white;
        border-radius: 6px;
        z-index: 10000;
        box-shadow: 0 3px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        transition: opacity 0.5s;
    `;

        document.body.appendChild(toast);

        // Auto-remove after 2 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
                // Reset duplicate guard after removal in single mode
                if (toastMode === "single") this._lastToast = {
                    message: null,
                    type: null,
                    time: 0
                };
            }, 500);
        }, 3000);
    }



}