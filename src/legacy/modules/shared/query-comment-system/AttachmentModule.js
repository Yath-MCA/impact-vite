    // ========================================
    // ATTACHMENT MODULE - CORE ENHANCEMENTS
    // ========================================

    class AttachmentModule {
        constructor(e = {}, t = {}) {
            this.parent = window.queryModule;
            this._config = this._getDefaultConfig();
            this._stores = new Map();

            this._callbacks = new Map();
            this.args = {
                ...e,
                ...t
            };
            this._bindMethods();
            this.initialize();
            if (IS_TRACK_VIEW) {} else {
                this._fileUploader = new FileUploadModule(API_UPLOAD_MULTI);
            }
        }

        _getDefaultConfig() {
            return {
                fileRules: {
                    MAX_SINGLE_FILE_SIZE_MB: 100,
                    MAX_MULTI_FILE_SIZE_MB: 500,
                    invalidExtensions: commonMethods.invalidExtensions || /\.(exe|bat|cmd|sh|dll)$/i
                },
                uploadEndpoint: API_UPLOAD_MULTI,
                subfolder: "attachments",
                recordtype: "Query",
                previewSelector: ".attachment-preview",
                allowMultiple: true
            };
        }

        _bindMethods() {
            const methods = [
                'handleFileChange', 'handleFileInput', 'uploadFiles',
                'displayPreview', 'removePreview', 'removeAttachment',
                'validateFile', 'getStore', 'clearStore', 'handleDownload',
                'handleDownloadAll', 'handleDelete', 'handleDeleteAll'
            ];
            methods.forEach(method => {
                if (this[method]) {
                    this[method] = this[method].bind(this);
                }
            });
        }

        async initialize() {
            console.log("AttachmentModule initialized");
            this.setupGlobalListeners();
        }

        setupGlobalListeners() {
            // Attach button handler
            $(document).on('click', '.attach-btn', (e) => {
                const $container = $(e.currentTarget).closest('.dialog-input-group, .reply-form, .dialog-content');
                const $fileInput = $container.find('.file-input');
                if ($fileInput.length) {
                    $fileInput.trigger('click');
                }
            });

            // Remove preview handler
            $(document).on('click', '.remove-attachment', (e) => {
                this.handleRemovePreview(e);
            });

            // Delete single attachment handler
            $(document).on('click', '.delete-attachment-btn', (e) => {
                this.handleDeleteAttachment(e, false);
            });

            // Delete all attachments handler
            $(document).on('click', '.delete-all-attachment-btn', (e) => {
                this.handleDeleteAttachment(e, true);
            });

            // Download single attachment handler
            $(document).on('click', '.download-btn', (e) => {
                this.handleDownloadAttachment(e, false);
            });

            // Download all attachments handler
            $(document).on('click', '.download-all-btn', (e) => {
                this.handleDownloadAttachment(e, true);
            });

            const self = this;
            $(document).on('mouseenter mouseleave click', '.response-toggle img', function(evt) {
                self.handleResponseIcon(evt);
            });


            // Toggle show/hide attachments list
            $(document).on('click', '.attachments-container .showHide', (e) => {
                e.preventDefault();
                const $btn = $(e.currentTarget);
                const $container = $btn.closest('.attachments-container');
                const $list = $container.find('.attachments-list');

                const isVisible = !$list.hasClass('d-none');

                if (isVisible) {
                    $list.addClass('d-none');
                    $btn.attr('title', 'Expand');
                    $btn.find('img').attr({
                        src: 'assets/images/svg/query_panel/qpExpandOpen.svg',
                        title: 'Expand'
                    });
                } else {
                    $list.removeClass('d-none');
                    $btn.attr('title', 'Collapse');
                    $btn.find('img').attr({
                        src: 'assets/images/svg/query_panel/qpExpandClose.svg',
                        title: 'Collapse'
                    });
                }
            });


        }

        /**
         * Setup file input for a specific context (dialog or panel)
         * @param {HTMLElement} inputElement - The file input element
         * @param {string} storeId - Unique identifier for the store
         * @param {Object} options - Configuration options
         */
        setupFileInput(inputElement, storeId, options = {}) {
            if (!inputElement) return;

            const config = {
                ...this._config,
                ...options
            };
            const store = this.getStore(storeId, options.initialData);

            // Unbind previous handlers and bind new one
            $(inputElement).off('change.attachment').on('change.attachment', (e) => {
                this.handleFileChange(e, storeId, config);
            });

            return store;
        }
        _ensureParent() {
            if (!this.parent && window.queryModule) {
                this.parent = window.queryModule;
            }
            return this.parent;
        }
        /**
         * Setup attachments for a specific query in dialog or panel
         * @param {string} queryId - Query identifier
         * @param {HTMLElement} container - Container element (dialog or panel)
         * @param {string} context - 'dialog' or 'panel'
         */
        setupUniqueAttachments(queryId, container, context = 'dialog') {
            this._ensureParent();
            const fileInput = container.querySelector('.file-input');
            if (!fileInput) return;

            const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            const storeId = `${context}_${queryId || 'new_' + uniqueSuffix}`;
            const query = this.parent.getQuery(queryId);

            const rSameUserRole = (query && query.lastResponse && query.lastResponse.sameUserRole) || false;
            const sameUserRole = (query && query.sameUserRole && query.responses.length == 0) || false;

            let existingItems = [];
            const currentItem = (sameUserRole) ? query : rSameUserRole ? query.lastResponse : null;
            if (currentItem) existingItems = currentItem.attachments || [];
            const isResponseTarget = !!(rSameUserRole && !sameUserRole && query && query.lastResponse);

            const initialData = {
                queryId,
                responseId: isResponseTarget && currentItem ? currentItem.id : null,
                targetType: isResponseTarget ? "response" : "query",
                existingItems,
                context
            };

            this.setupFileInput(fileInput, storeId, {
                initialData,
                allowMultiple: true
            });
            fileInput.setAttribute("data-store-id", storeId);
            container.setAttribute("data-store-id", storeId);

            // ✅ FIX: Only render existing items if there are any, and ensure they're properly synced
            if (existingItems.length > 0) {
                const store = this.getStore(storeId);
                const attachContainer = container.querySelector(".dialog-input-group") ||
                    container.querySelector(".reply-form") ||
                    container;
                this.renderExistingAttachments(attachContainer, existingItems, storeId);
            }

            this.parent.currentStoreId = this.currentStoreId = storeId;

        }

        _getEffectiveExistingCount(store) {
            if (!store) return 0;
            if (store.pendingDeletedAll) return 0;
            const existing = (store.existingItems || []).length;
            const deleted = (store.pendingDeleted || []).length;
            return existing - deleted;
        }

        async handleFileChange(e, storeId, config = {}) {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            const store = this.getStore(storeId);
            const validFiles = [];

            // Validate each file
            for (const file of files) {
                const validation = this.validateFile(file, files.length);
                if (validation.valid) {
                    validFiles.push(file);
                } else {
                    this._showError(validation.error);
                }
            }

            if (validFiles.length === 0) {
                e.target.value = '';
                return;
            }

            // Add to pending uploads
            validFiles.forEach(file => {
                store.pendingUploads.push({
                    file: file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    addedAt: Date.now()
                });
            });

            // Display previews
            const showHeader = store.queryId == null || this._getEffectiveExistingCount(store) === 0;
            const previewContainer = this._findPreviewContainer(e.target, config, {
                count: validFiles.length,
                showHeader: showHeader,
                storeId: storeId
            });
            if (previewContainer) {
                validFiles.forEach(file => {
                    this.displayPreview(file, previewContainer, storeId);
                });
            }

            if (this.parent && this.parent.downloadFileNameVisibility) {
                this.parent.downloadFileNameVisibility();
            }

            // Trigger callback
            this._triggerCallback('files-added', {
                storeId: storeId,
                files: validFiles,
                store: store
            });

            // Clear input
            e.target.value = '';
        }

        /**
         * Validate file before upload
         */
        validateFile(file, fileCount = 1) {
            const rules = this._config.fileRules;

            // Check file extension
            if (rules.invalidExtensions.test(file.name)) {
                return {
                    valid: false,
                    error: 'Upload_Invalid_Err'
                };
            }

            // Check single file size
            const maxSingleSize = rules.MAX_SINGLE_FILE_SIZE_MB * 1024 * 1024;
            if (file.size > maxSingleSize) {
                return {
                    valid: false,
                    error: 'Single_Upload_Size_Err'
                };
            }

            // Check total size for multiple files
            if (fileCount > 1) {
                const maxMultiSize = rules.MAX_MULTI_FILE_SIZE_MB * 1024 * 1024;
                if (file.size * fileCount > maxMultiSize) {
                    return {
                        valid: false,
                        error: 'Multi_Upload_Size_Err'
                    };
                }
            }

            return {
                valid: true
            };
        }

        /**
         * Display file preview
         */
        displayPreview(file, container, storeId) {
            if (!container) return;

            const previewHtml = this._generatePreviewHtml(file, storeId);
            $(container).append(previewHtml);

            this._triggerCallback('preview-added', {
                file: file,
                storeId: storeId,
                container: container
            });
        }

        /**
         * Render existing attachments
         */
        renderExistingAttachments(container, attachments = [], storeId, extras = {}) {
            try {
                attachments = Array.isArray(attachments) ? attachments : [];
                if (!attachments.length) return '';

                // resolve readOnly
                let readOnly = typeof extras.readOnly === 'boolean' ? extras.readOnly : false;

                // ? FIX: Get the store to check for pending deletions
                const store = storeId ? this.getStore(storeId) : null;
                const pendingDeleted = (store && store.pendingDeleted) || [];
                const pendingDeletedAll = (store && store.pendingDeletedAll) || false;

                // Skip entries without usable file_sn; then apply pending-delete filter
                let filteredAttachments = attachments.filter((att) => {
                    const sn = att && (att.file_sn != null ? String(att.file_sn).trim() : '');
                    return !!sn;
                });
                if (pendingDeletedAll) {
                    filteredAttachments = [];
                } else if (pendingDeleted.length > 0) {
                    const deletedFileSnSet = new Set(pendingDeleted.map(d => d && d.file_sn).filter(Boolean));
                    filteredAttachments = filteredAttachments.filter(att => !deletedFileSnSet.has(att.file_sn));
                }

                if (!filteredAttachments.length) return '';

                // resolve container
                let attachmentContainer;
                if (container) {
                    attachmentContainer =
                        container.querySelector('.attachments-container') ||
                        this._createAttachmentContainer(container, filteredAttachments.length, readOnly);
                    if (attachmentContainer && storeId) {
                        attachmentContainer.setAttribute("data-store-id", storeId);
                    }
                } else {
                    readOnly = !storeId;
                    attachmentContainer = this._createAttachmentContainer(null, filteredAttachments.length, readOnly);
                    if (attachmentContainer && storeId) {
                        attachmentContainer.setAttribute("data-store-id", storeId);
                    }
                }

                if (!attachmentContainer) return '';

                // generate HTML (skip any entry that still fails to produce markup)
                const html = filteredAttachments
                    .map(att => {
                        try {
                            return this._generateExistingAttachmentHtml(att, storeId, readOnly) || '';
                        } catch (err) {
                            console.warn('AttachmentModule._generateExistingAttachmentHtml:', err && err.message);
                            return '';
                        }
                    })
                    .join('');

                // find list container
                const listContainer =
                    attachmentContainer.querySelector('.attachments-list') || attachmentContainer;

                // insert HTML
                listContainer.innerHTML = html || "";

                // if no storeId, return the HTML string
                if (storeId == null) {
                    return attachmentContainer.outerHTML || "";
                }
                return "";
            } catch (err) {
                console.warn('AttachmentModule.renderExistingAttachments:', err && err.message);
                if (typeof ErrorLogTrace === 'function') {
                    ErrorLogTrace('AttachmentModule.renderExistingAttachments', err && err.message);
                }
                return '';
            }
        }


        /**
         * Generate HTML for new file preview
         */
        _generatePreviewHtml(file, storeId) {
            const size = this._formatFileSize(file.size);
            const name = this._escapeHtml(file.name);

            return `<div class="attachment-preview-item d-flex align-items-center m-1" 
                 data-store-id="${storeId}" 
                 data-filename="${name}">
                <i class="fa fa-paperclip mr-2"></i>
                <span class="flex-grow-1" title="${name}">${name}</span>
                <span class="text-muted small mr-2">${size}</span>
                <button class="btn btn-sm btn-link remove-attachment" 
                        data-filename="${name}" 
                        data-store-id="${storeId}">
                    <i class="fa fa-times"></i>
                </button>
            </div>
    `.trim();
        }

        /**
         * Generate HTML for existing attachment
         */
        _generateExistingAttachmentHtml(attachment, storeId, readOnly = false) {
            if (!attachment || typeof attachment !== 'object') return '';

            const fileSn = attachment.file_sn != null ? String(attachment.file_sn).trim() : '';
            if (!fileSn) return '';

            // String mode (null storeId) is always readonly chrome
            readOnly = !storeId;

            const rawName = attachment.file_on || attachment.name || fileSn;
            const nameText = this._escapeHtml(rawName);
            const nameAttr = this._escapeAttr(rawName);
            const safeSn = this._escapeAttr(fileSn);
            const safeOn = this._escapeAttr(attachment.file_on != null ? attachment.file_on : '');
            const safeId = this._escapeAttr(attachment.id != null ? attachment.id : '');
            const safeStoreId = this._escapeAttr(storeId != null ? storeId : '');

            return `
            <div class="attachment-item d-flex align-items-center mb-1 ${readOnly ? 'small' : ''}"
                 data-file-sn="${safeSn}"
                 data-file-on="${safeOn}"
                 data-attachment-id="${safeId}"
                 data-store-id="${safeStoreId}">
                <button class="btn btn-sm btn-link download-btn" title="Download"><i class="fa fa-download"></i></button>
                <span class="attachment-name flex-grow-1" title="${nameAttr}">${nameText}</span>
        ${readOnly ? '' : `<button class="btn btn-sm btn-link delete-attachment-btn ml-auto" title="Delete">
                                    <i class="fa fa-trash"></i>
        </button>`
                }
            </div>
    `.trim();
        }

        /**
         * Create attachment container if it doesn't exist
         */
        _createAttachmentContainer(parent, counts = 0, readOnly = false) {
            const showHide = `<span class="showHide" title="Expand"><img class="" src="assets/images/svg/query_panel/qpExpandClose.svg" title="Close" alt="CloseIcon"></span>`;
            const container = document.createElement('div');
            container.className = 'attachments-container mt-2';
            container.innerHTML = `
            <div class="attachments-header d-flex align-items-center mb-1 ${readOnly ? "small" : ""}">
                <button class="btn btn-sm btn-link download-all-btn" title="Download All"><i class="fa fa-download"></i></button>
                <span class="flex-grow-1">Attachments (<span class="attach-counts">${counts}</span>) ${showHide}</span>
        ${readOnly ? "" : `<button class="btn btn-sm btn-link delete-all-attachment-btn" title="Delete All"><i class="fa fa-trash"></i> Delete All</button>`}
            </div>
            <div class="attachments-list small"></div>
    `;
            if (parent) parent.appendChild(container);
            return container;
        }



        async handleDeleteAttachment(e, deleteAll = false) {
            e.preventDefault();

            try {
                const $btn = $(e.currentTarget);
                const $container = $btn.closest(".attachments-container");
                const queryId = $btn.closest("[data-query-id]").attr("data-query-id");

                if (!queryId) {
                    console.warn("handleDeleteAttachment: Missing queryId");
                    return;
                }

                const query = this.parent.getQuery(queryId);
                if (!query) {
                    console.warn("handleDeleteAttachment: Query not found for " + queryId);
                    return;
                }
                const $replyContainer = $('.reply-container[style*="display: block"]');
                const sameUserRole = query.sameUserRole === true && query.responses.length === 0;
                const isDirectlyDelete = ((!this.parent.currentQuery) || (window.queryDialog.state == 0 && $replyContainer.length == 0));

                //  Determine the current item (query or last response)
                var currentItem = null;
                if (sameUserRole) {
                    currentItem = query;
                } else if (query.lastResponse) {
                    currentItem = query.lastResponse;
                }

                if (!currentItem) {
                    console.warn("handleDeleteAttachment: No valid current item found.");
                    return;
                }

                const currentAttachments = currentItem.attachments || [];

                // Confirm deletion before proceeding
                const confirmed = await this.confirmDeletion(deleteAll);
                if (!confirmed) return;

                //  Common helper: DRY callback trigger
                const triggerAttachmentDeleted = function(opts) {
                    opts = opts || {};
                    var payload = {
                        deleteAll: deleteAll,
                        queryId: queryId,
                        storeId: opts.storeId || null,
                        store: opts.store || null
                    };
                    if (typeof this._triggerCallback === "function") {
                        this._triggerCallback("attachment-deleted", payload);
                    }
                }.bind(this);

                // ---------------------------------------
                // CASE 1: Direct delete (no open editor)
                // ---------------------------------------
                if (isDirectlyDelete) {
                    var updatedAttachments = [];

                    if (deleteAll) {
                        updatedAttachments = [];
                    } else {
                        const $item = $btn.closest(".attachment-item");
                        const fileSn = $item.attr("data-file-sn");
                        if (!fileSn) return;

                        updatedAttachments = currentAttachments.filter(function(att) {
                            return att.file_sn !== fileSn;
                        });
                    }

                    // Decide which parent method to call
                    var results = null;
                    if (sameUserRole) {
                        // ✅ FIX: Directly update query attachments in state for same-user-role case
                        results = await this._updateQueryAttachments(queryId, updatedAttachments);
                    } else {
                        const responseId = query.lastResponse ? query.lastResponse.id : null;
                        if (responseId && typeof this.parent.updateResponse === "function") {
                            results = await this.parent.updateResponse(queryId, responseId, {
                                attachments: updatedAttachments
                            });
                        }
                    }

                    if (results && results.success) {
                        console.log("🗑️ Attachments updated successfully for query: " + queryId);
                        if (this.parent.panelModule && typeof this.parent.panelModule.render === "function") {
                            this.parent.panelModule.render(true);
                        }
                    } else {
                        console.warn("handleDeleteAttachment: Update failed or returned invalid result.");
                    }

                    triggerAttachmentDeleted();
                    return results;
                }

                // ---------------------------------------
                // CASE 2: Edit / Reply mode (store-based)
                // ---------------------------------------
                const storeId =
                    $container.attr("data-store-id") ||
                    $btn.closest("[data-store-id]").attr("data-store-id") ||
                    this.parent.currentStoreId ||
                    this.currentStoreId;

                const $parent = $container.parent();
                const store = this.getStore(storeId);

                if (!store || this._getEffectiveExistingCount(store) === 0) {
                    console.warn("handleDeleteAttachment: No valid store or existing items.");
                    return;
                }

                if (deleteAll) {
                    store.pendingDeletedAll = true;
                    $parent.find(".attachments-header, .attachments-list, .attachment-preview, .attachment-preview-item").remove();
                    // FIX: Clear existing items from store when delete all is triggered
                    // store.existingItems = [];
                } else {
                    const $item = $btn.closest(".attachment-item");
                    const fileSn = $item.attr("data-file-sn");
                    if (!fileSn) return;

                    if (!store.pendingDeleted) {
                        store.pendingDeleted = [];
                    }
                    store.pendingDeleted.push({
                        file_sn: fileSn
                    });
                    // FIX: Remove from existingItems as well to reflect in state
                    // store.existingItems = store.existingItems.filter(item => item.file_sn !== fileSn);
                    $item.remove();
                }

                triggerAttachmentDeleted({
                    storeId: storeId,
                    store: store
                });

                // FIX: jQuery uses .length, not .count()
                const count =
                    $parent.find(".attachment-item").length +
                    $parent.find(".attachment-preview-item").length;

                // if ALL attachments removed → remove header + containers
                if (count === 0) {
                    $parent.find(".attachments-header, .attachments-list, .attachment-preview").remove();
                }


            } catch (error) {
                console.error("❌ Error in handleDeleteAttachment:", error);
                if (this.errorTracker && typeof this.errorTracker.logError === "function") {
                    this.errorTracker.logError("system", "handleDeleteAttachment", error);
                }
            }
        }


        /**
         * Ask for confirmation before deletion
         */
        async confirmDeletion(deleteAll) {
            const confirmKey = deleteAll ? "delete_attach_all" : "delete_attach_one";
            const result = await AlertNewDialog.fire(confirmKey);
            return result.isConfirmed === true;
        }

        /**
         *  Helper: Update query attachments in state
         * Ensures the query object is synced with the new attachment list after deletion
         */
        async _updateQueryAttachments(queryId, updatedAttachments) {
            try {
                const query = this.parent.getQuery(queryId);
                if (!query) return {
                    success: false,
                    error: "Query not found"
                };

                // Direct state update for the query
                if (query) {
                    query.attachments = updatedAttachments || [];
                }

                // If parent has updateQueryOrCommentItem, use it for API sync
                if (typeof this.parent.updateQueryOrCommentItem === "function") {
                    return await this.parent.updateQueryOrCommentItem(queryId, {
                        attachments: updatedAttachments
                    });
                }

                // Otherwise return success (state is updated directly)
                return {
                    success: true,
                    data: {
                        attachments: updatedAttachments
                    },
                    id: queryId
                };

            } catch (error) {
                console.error("Error updating query attachments:", error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        handleResponseIcon(evt, action) {
            // "mouseenter" | "mouseleave" | "click"
            action = evt.type;

            var img = evt.currentTarget;
            var container = img.closest('.responses-container,.reply-group-items');

            // Keep a base filename reference (e.g. "qpShowAllRes.svg")
            if (!img.dataset.baseSrc) {
                var cleanSrc = img.src.replace(/_?\d*\.svg$/, '') + '.svg';
                img.dataset.baseSrc = cleanSrc;
            }

            var baseSrc = img.dataset.baseSrc;
            var baseName = baseSrc.replace(/_?\d*\.svg$/, '');

            // 🔹 Handle actions
            if (action === 'mouseenter' && !container.classList.contains('expanded')) {
                img.src = baseName + '_2.svg';
            } else if (action === 'mouseleave' && !container.classList.contains('expanded')) {
                img.src = baseSrc;
            } else if (action === 'click') {
                var expanded = container.classList.toggle('expanded');
                var isShowIcon = baseName.indexOf('qpShowAllRes') !== -1;

                // toggle between qpShowAllRes <-> qpHide
                if (expanded) {
                    img.src = baseName.replace('qpShowAllRes', 'qpHide') + '.svg';
                    img.title = 'Collapse';
                } else {
                    img.src = isShowIcon ? baseSrc : baseName.replace('qpHide', 'qpShowAllRes') + '.svg';
                    img.title = 'Expand';
                }
            }
        }



        /**
         * Handle attachment download
         */
        async handleDownloadAttachment(e, downloadAll = false) {
            e.preventDefault();

            const $btn = $(e.currentTarget);
            const $container = $btn.closest('.attachments-container');

            if (downloadAll) {
                // Download all attachments as zip
                const $items = $container.find('.attachment-item');
                const fileSns = [];
                const fileOns = [];

                $items.each((i, item) => {
                    fileSns.push($(item).data('file-sn'));
                    fileOns.push($(item).data('file-on'));
                });

                if (fileSns.length === 0) return;

                const queryLabel = $container.closest('.query-item')
                    .find('.data-label').text() || 'attachments';
                const zipName = `${SHARED_KEY.identifier.split('/').pop()}_${queryLabel}_attachments`;

                iDownloadMethod.zip_download('attach_download', {
                    list: fileSns.join(','),
                    name: zipName,
                    org_name_list: fileOns
                });

            } else {
                // Download single attachment
                const $item = $btn.closest('.attachment-item');
                if (!$item.length) return;

                const fileSn = $item.data('file-sn');
                const fileOn = $item.data('file-on');
                const encodedName = encodeURIComponent(fileOn);

                const directUrl = `${BUCKET_URL}${DOC_ID}/attachments/${fileSn}`;
                const apiUrl = `${API_PATH}filedownload?appkey=xmleditor&file_sn=${fileSn}&docid=${DOC_ID}&file_on=${encodedName}`;

                iDownloadMethod.httpRequest(directUrl, apiUrl, true);
            }
        }

        prepareFileParams(storeId, options) {
            var store = this.getStore(storeId);
            var params = {
                subfolder: this._config.subfolder,
                recordtype: this._config.recordtype,
                ...options
            };

            var existing = store.existingItems || [];
            var deleted = store.pendingDeleted || [];
            var deletedAll = store.pendingDeletedAll || false;
            var pendingUploads = store.pendingUploads || [];

            // Set record ID if exists
            if (existing.length > 0 && existing[0].id) {
                params._id = existing[0].id;
            }

            // 🧩 CASE 1: All files deleted
            if (deletedAll) {
                store.existingItems = [];
                store.pendingDeletedAll = false;

                // If there are new uploads after deleteAll, params will be set by file upload logic
                // Otherwise, send empty arrays
                params.file_sn = [];
                params.file_on = [];
                params.ext = [];
            }
            // 🧩 CASE 2: Partial deletions
            else if (deleted.length > 0) {
                var remaining = existing.filter(function(item) {
                    if (!item.file_sn || item.file_sn.trim() === "") return false;
                    for (var i = 0; i < deleted.length; i++) {
                        if (deleted[i].file_sn === item.file_sn) return false;
                    }
                    return true;
                });

                store.existingItems = remaining;
                store.pendingDeleted = [];

                // Set params with remaining files (will be preserved during new uploads)
                params.file_sn = remaining.map(function(x) {
                    return x.file_sn;
                });
                params.file_on = remaining.map(function(x) {
                    return x.file_on;
                });
                params.ext = remaining.map(function(x) {
                    return x.file_sn ? x.file_sn.split(".").pop() : "";
                });
            }
            // 🧩 CASE 3: No deletion, but have existing files
            else if (existing.length > 0) {
                // Preserve existing files (ensure we filter any empty serial numbers that might be there)
                var validExisting = existing.filter(function(x) {
                    return x.file_sn && x.file_sn.trim() !== "";
                });

                params.file_sn = validExisting.map(function(x) {
                    return x.file_sn;
                });
                params.file_on = validExisting.map(function(x) {
                    return x.file_on;
                });
                params.ext = validExisting.map(function(x) {
                    return x.file_sn ? x.file_sn.split(".").pop() : "";
                });
            }

            // 🧩 CASE 4: No changes at all — skip API call
            if (pendingUploads.length === 0 && deleted.length === 0 && !deletedAll) {
                params._skipUpload = true;
            }

            return params;
        }


        /**
         * Upload files to server
         */
        async uploadFiles(storeId, options) {
            var store = this.getStore(storeId);
            var params = this.prepareFileParams(storeId, options);
            var existingBeforeUpload = (store.existingItems || []).slice();
            var pendingBeforeUpload = (store.pendingUploads || []).slice();
            var files = (store.pendingUploads || []).map(function(f) {
                return f.file;
            });

            //  Sanitize attachment arrays before request payload is built/sent.

            if (params && (params.file_sn || params.file_on || params.ext)) {
                var cleanedParams = this._filterEmptyEntries(
                    params.file_sn || [],
                    params.file_on || [],
                    params.ext || []
                );
                params.file_sn = cleanedParams.file_sn;
                params.file_on = cleanedParams.file_on;
                params.ext = cleanedParams.ext;
            }

            //  Skip API if nothing to upload
            if (params._skipUpload) {
                console.log("No new uploads or deletions. Store already updated.");
                return {
                    r: 1,
                    skipped: true,
                    message: "No changes to upload",
                    id: params._id || "",
                    file_sn: store.existingItems.map(x => x.file_sn),
                    file_on: store.existingItems.map(x => x.file_on)
                };
            }

            //  Continue with real upload if files exist
            try {
                var result = await this._fileUploader.makeRequest(files, params);

                // ✅ Filter empty entries from API response before processing
                if (result && result.r === 1 && result.file_sn && result.file_sn.length > 0) {
                    var cleanedData = this._filterEmptyEntries(
                        result.file_sn,
                        result.file_on || [],
                        result.ext || []
                    );
                    result.file_sn = cleanedData.file_sn;
                    result.file_on = cleanedData.file_on;
                    result.ext = cleanedData.ext;
                }

                if (!result || result.r !== 1) {
                    throw new Error(result && result.message ? result.message : "Attachment upload failed");
                }

                this._updateStoreWithResult(store, result, {
                    existingBeforeUpload: existingBeforeUpload,
                    pendingBeforeUpload: pendingBeforeUpload
                });
                store.pendingUploads = [];
                store.pendingDeleted = [];
                store.pendingDeletedAll = false;

                this._triggerCallback('upload-success', {
                    storeId: storeId,
                    result: result,
                    store: store
                });

                return result;
            } catch (error) {
                console.error("Upload failed:", error);
                this._triggerCallback('upload-error', {
                    storeId: storeId,
                    error: error,
                    store: store
                });
                throw error;
            }
        }

        /**
         * Helper: Remove empty strings and align arrays
         * 
            file_sn: ["", "Nc55c8b42...png", "Nb8ea2b63...txt"] ← has empty at [0]
            ext: ["", "png", "txt"] ← has empty at [0]
            file_on: ["attch (1).png", "new 3 (1).txt"] ← clean, no empty
            
            after
            
            [
                {
                    id: "Nee212e4c-a16f-4751-90c4-3ae4fd5f8841",
                    file_sn: "Nc55c8b42-b45c-4598-8a52-dca046376e9e.png",
                    // file_on[0]
                    file_on: "attch (1).png",
                    name: "attch (1).png"
                },
                {
                    id: "Nee212e4c-a16f-4751-90c4-3ae4fd5f8841",
                    file_sn: "Nb8ea2b63-a518-4cdd-87bd-37a673f994f1.txt",
                    // file_on[1]
                    file_on: "new 3 (1).txt",
                    name: "new 3 (1).txt"
                }
            ]
     
           
     
        */

        _filterEmptyEntries(file_sn, file_on, ext) {
            var cleaned_sn = [];
            var cleaned_on = [];
            var cleaned_ext = [];
            var snList = Array.isArray(file_sn) ? file_sn : [];
            var onList = Array.isArray(file_on) ? file_on : [];
            var extList = Array.isArray(ext) ? ext : [];
            // file_on may be dense even when file_sn contains empty placeholders
            var nameIdx = 0;

            for (var i = 0; i < snList.length; i++) {
                var normalizedSn = ((snList[i] || "") + "").trim();
                if (!normalizedSn) continue;

                var normalizedOn = ((onList[nameIdx] || onList[i] || "") + "").trim();
                var normalizedExt = ((extList[i] || "") + "").trim();

                if (!normalizedExt && normalizedSn.indexOf(".") !== -1) {
                    normalizedExt = normalizedSn.split(".").pop();
                }

                cleaned_sn.push(normalizedSn);
                cleaned_on.push(normalizedOn);
                cleaned_ext.push(normalizedExt);
                nameIdx++;
            }

            return {
                file_sn: cleaned_sn,
                file_on: cleaned_on,
                ext: cleaned_ext
            };
        }



        _updateStoreWithResult(store, result, context) {
            context = context || {};
            if (!result || !result.file_sn || !result.file_on) {
                if (result && result.r === 1 && (!result.file_sn || result.file_sn.length === 0)) {
                    store.existingItems = [];
                }
                this._syncStoreAttachmentsToState(store);
                return;
            }

            //  Data is already filtered, just map directly
            var resultItems = result.file_sn.map(function(sn, idx) {
                return {
                    id: result.id || "",
                    file_sn: sn,
                    file_on: result.file_on[idx] || "",
                    name: result.name ? result.name[idx] : result.file_on[idx] || ""
                };
            });

            var existingBeforeUpload = context.existingBeforeUpload || [];
            var pendingBeforeUpload = context.pendingBeforeUpload || [];
            var hasPendingUploads = pendingBeforeUpload.length > 0;
            var resultSnSet = new Set(resultItems.map(function(item) {
                return item.file_sn;
            }));
            var missingExisting = existingBeforeUpload.filter(function(item) {
                return item && item.file_sn && !resultSnSet.has(item.file_sn);
            });

            if (hasPendingUploads && missingExisting.length > 0) {
                store.existingItems = missingExisting.concat(resultItems);
            } else {
                store.existingItems = resultItems;
            }

            this._syncStoreAttachmentsToState(store);
        }

        _syncStoreAttachmentsToState(store) {

            if (!store || !store.queryId) return;

            const query = this.parent.getQuery(store.queryId);
            if (!query) return;

            const targetType = store.targetType || "query";
            if (targetType === "response" && store.responseId && Array.isArray(query.responses)) {
                const responseIndex = query.responses.findIndex(resp => resp && resp.id === store.responseId);
                if (responseIndex !== -1) {
                    query.responses[responseIndex].attachments = store.existingItems || [];
                    if (query.lastResponse && query.lastResponse.id === store.responseId) {
                        query.lastResponse.attachments = store.existingItems || [];
                    }
                    return;
                }

                if (query.lastResponse && query.lastResponse.id === store.responseId) {
                    query.lastResponse.attachments = store.existingItems || [];
                }
                return;
            }

            query.attachments = store.existingItems || [];
        }

        /**
         * Get attachments for a store
         */
        getAttachments(storeId) {
            const store = this.getStore(storeId);
            return {
                existing: store.existingItems || [],
                pending: store.pendingUploads || [],
                deleted: store.pendingDeleted || [],
                deletedAll: store.pendingDeletedAll
            };
        }

        /**
         * Check if store has pending changes
         */
        hasPendingChanges(storeId) {
            const store = this.getStore(storeId);
            return (store.pendingUploads && store.pendingUploads.length > 0) ||
                (store.pendingDeleted && store.pendingDeleted.length > 0) ||
                store.pendingDeletedAll;
        }


        /**
         * Get or create store
         */
        getStore(storeId, initialData = {}) {
            if (!this._stores.has(storeId)) {
                this._stores.set(storeId, {
                    id: storeId,
                    queryId: initialData.queryId || null,
                    responseId: initialData.responseId || null,
                    targetType: initialData.targetType || "query",
                    pendingUploads: [],
                    pendingDeleted: [],
                    pendingDeletedAll: false,
                    existingItems: initialData.existingItems || [],
                    metadata: initialData.metadata || {},
                    context: initialData.context || 'unknown',
                    createdAt: Date.now()
                });
            } else if (initialData && Object.keys(initialData).length > 0) {
                const store = this._stores.get(storeId);
                if (Object.prototype.hasOwnProperty.call(initialData, "queryId")) {
                    store.queryId = initialData.queryId || null;
                }
                if (Object.prototype.hasOwnProperty.call(initialData, "responseId")) {
                    store.responseId = initialData.responseId || null;
                }
                if (Object.prototype.hasOwnProperty.call(initialData, "targetType")) {
                    store.targetType = initialData.targetType || "query";
                }
                if (Object.prototype.hasOwnProperty.call(initialData, "context")) {
                    store.context = initialData.context || store.context;
                }
                if (Object.prototype.hasOwnProperty.call(initialData, "existingItems")) {
                    store.existingItems = initialData.existingItems || [];
                }
            }
            return this._stores.get(storeId);
        }

        /**
         * Handle preview removal (pending uploads)
         */
        handleRemovePreview(e) {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const filename = $btn.data('filename');
            const storeId = $btn.data('store-id');

            const store = this.getStore(storeId);
            store.pendingUploads = store.pendingUploads.filter(f => f.name !== filename);

            $btn.closest('.attachment-preview-item').remove();

            this._triggerCallback('preview-removed', {
                filename: filename,
                storeId: storeId,
                store: store
            });
        }

        /**
         * Clear store
         */
        clearStore(storeId, hardClear = true) {
            if (hardClear) {
                if (this._stores.has(storeId)) {
                    this._stores.delete(storeId);
                }

                if (this.currentStoreId === storeId) {
                    this.currentStoreId = null;
                }
            } else {
                const store = this.getStore(storeId);
                store.pendingUploads = [];
                // ✅ FIX: Also clear pending deletions when clearing store
                store.pendingDeleted = [];
                store.pendingDeletedAll = false;
                $('.dialog-input-group .attachment-preview').remove();
            }
        }

        /**
         * ✅ Helper: Clear pending deletion state after successful save
         */
        clearPendingDeletions(storeId) {
            const store = this.getStore(storeId);
            if (store) {
                store.pendingDeleted = [];
                store.pendingDeletedAll = false;
            }
        }

        /**
         * Register callback
         */
        registerCallback(event, callback) {
            if (!this._callbacks.has(event)) {
                this._callbacks.set(event, []);
            }
            this._callbacks.get(event).push(callback);
        }

        /**
         * Trigger callback
         */
        _triggerCallback(event, data) {
            if (this._callbacks.has(event)) {
                this._callbacks.get(event).forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Callback error for ${event}:`, error);
                    }
                });
            }
            // Update attachment counts after any event
            this._updateAttachmentCounts(data.storeId);
        }
        /**
         * Update attachment counts in UI
         */
        _updateAttachmentCounts(storeId) {
            if (!storeId) return;
            const store = this.getStore(storeId);
            // Use helper
            const effectiveExisting = this._getEffectiveExistingCount(store);
            const pending = (store.pendingUploads || []).length;
            // No double subtraction
            const totalCount = effectiveExisting + pending;

            // Update all count elements for this store
            const $containers = $(`[data-store-id="${storeId}"]`);
            const $spanCount = $containers.closest(".attachments-container,.attachment-preview").find('.attach-counts');

            if ($spanCount) $spanCount.text(totalCount);

            if (totalCount == 0 && $containers.hasClass('attachments-header-preview')) {
                $spanCount.closest('.attachment-preview').remove();
            }
        }


        /**
         * Find preview container
         */
        _findPreviewContainer(inputElement, config, {
            counts = 0,
            showHeader = false,
            storeId = ""
        }) {
            const $parent = $(inputElement).closest('.reply-form, .dialog-body, .query-item');
            let $preview = $parent.find(config.previewSelector || '.attachment-preview');

            const header = showHeader ? `<div class="attachments-header-preview d-flex align-items-center mb-1" data-store-id="${storeId}">
        ${true ? '' : `<button class="btn btn-sm download-all-btn" title="Download All"></button>`}
                            <span class="flex-grow-1 ml-2">Attachments (<span class="attach-counts">${counts}</span>)</span>
        ${true ? '' : `<button class="btn btn-sm delete-all-attachment-btn" title="Delete All"><i class="fa fa-trash"></i> Delete All</button>`}
    </div>` : '';

            if ($preview.length === 0) {
                const $inputContainer = $parent.find('.file-input');
                if ($inputContainer.length) {
                    $preview = $(`<div class="attachment-preview small mt-2">${header}</div>`);
                    const $attachmentsContainer = $inputContainer.next('.attachments-container');
                    if ($attachmentsContainer.length) {
                        $attachmentsContainer.after($preview);
                    } else {
                        $inputContainer.after($preview);
                    }
                }
            }
            if ($preview.length && storeId) {
                $preview.attr("data-store-id", storeId);
            }

            return $preview.length ? $preview[0] : null;
        }

        /**
         * Format file size
         */
        _formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }

        /**
         * Escape HTML text content (coerces null/undefined to empty string).
         */
        _escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text == null ? '' : String(text);
            return div.innerHTML;
        }

        /**
         * Escape a value for use inside a double-quoted HTML attribute.
         */
        _escapeAttr(text) {
            return this._escapeHtml(text)
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        /**
         * Show error message
         */
        _showError(message) {
            if (typeof AlertNewDialog !== 'undefined') {
                AlertNewDialog.fire('warning', 'Warning', message, 'OK', '');
            } else {
                alert(message);
            }
        }

    }