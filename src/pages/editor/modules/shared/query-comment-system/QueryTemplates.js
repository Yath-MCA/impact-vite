/**
 * QueryTemplates - Centralized template management for query UI
 */
class QueryTemplates {

    constructor(name, errorTracker = {}, config) {
        this.name = name;
        this.parent = window.queryModule;
        this.setupInitiated = false;
        this.tagsAsString = {
            "&quot;": '"',
            // double-escaped quote (\\&quot;)
            "\\\\&quot;": '"',
            "&lt;": "<",
            "&gt;": ">",
            "&amp;": "&",
            // encoded < (escaped hex)
            "\\x3C;": "<",
            // encoded > (escaped hex)
            "\\x3E;": ">",
        };
        this.tooltipConfig = {
            approved: "Resolved",
            verified: "Verified",
            resolved: "Resolved",
            pending: "Pending",
            closed: "Closed",
            deleted: "Deleted",
            "ts notes": "TypeSetting Notes",
        };
        if (IS_TRACK_VIEW && typeof this.initialize == "function") this.initialize();
    }
    _ensureParent() {
        if (!this.parent && window.queryModule) {
            this.parent = window.queryModule;
        }
        return this.parent;
    }

    setUpParentKeys() {
        this._ensureParent();
        if (!this.parent || !this.parent._state) {
            return false;
        }

        const {
            _state
        } = this.parent;

        this.roleConfig = _state.roleConfigResponses;
        this.currentUserRole = _state.currentUserRole;
        this.isCollator = _state.isCollator;
        this.setupInitiated = true;
        this.globalQuickReplyMode = this.isCollator ? true : _state.globalQuickReplyMode;
        this.quickReplyButtons = this.roleConfig && this.roleConfig.responses;
        // this.setReplyMode("quick");
        return true;
    }

    renderQuickReplyButtonRow(buttons) {
        const self = this;
        const list = buttons || this.quickReplyButtons || [];
        if (!list.length) return "";
        var tooltipAttr = (text) => {
            const tooltip = self.tooltipConfig && self.tooltipConfig[text.toLowerCase()] || text;
            return `data-toggle="tooltip" data-placement="bottom" title="${tooltip}"`;
        };
        return list.map(function(text) {
            return `<button type="button" class="quick-reply-btn btn btn-sm primary-btn" ${tooltipAttr(text)} data-text="${text}">${text}</button>`;
        }).join("");
    }

    shouldShowDialogQuickReply(mode) {
        if (!this.setupInitiated && !this.setUpParentKeys()) return false;
        if (mode === "view") return false;
        if (typeof IS_TRACK_VIEW !== "undefined" && IS_TRACK_VIEW) return false;
        const dialog = this.parent && this.parent.dialogModule;
        if (dialog && typeof dialog.isReadonlyMode === "function" && dialog.isReadonlyMode()) return false;
        // In verify mode, quick replies live in the dialog footer
        if (dialog && dialog._verifyMode) return false;
        return mode === "reply" && this.isCollator && this.globalQuickReplyMode;
    }

    /**
     * Verify-mode body shell: hidden textarea for TS Notes (buttons are in footer).
     */
    shouldShowVerifyInputShell(mode) {
        if (!this.setupInitiated && !this.setUpParentKeys()) return false;
        if (mode === "view") return false;
        const dialog = this.parent && this.parent.dialogModule;
        if (!dialog || !dialog._verifyMode) return false;
        if (dialog.isReadonlyMode && dialog.isReadonlyMode()) return false;
        if (typeof IS_TRACK_VIEW !== "undefined" && IS_TRACK_VIEW) return false;
        return mode === "reply" && this.isCollator && this.globalQuickReplyMode &&
            dialog.canShowVerifyQuickReplies(dialog.currentQuery, mode);
    }

    // ? Enhanced query rendering with role-specific buttons
    renderItemWithMode(item, isComment = false) {
        if (!this.setupInitiated && !this.setUpParentKeys()) {
            return "";
        }

        return this.renderCommon(item, isComment);
    }



    isQueryAvailableForRole(mainStatus, collationStatus) {
        if (this.isCollator) {
            // Collator works with closed queries that need verification
            return mainStatus === 'closed' && collationStatus === 'pending';
        } else {
            // Editor/Author works with open queries
            return mainStatus === 'open' || !mainStatus;
        }
    }

    renderActionBtn(type, returnFrag = false, addAttr = '') {
        const title = type.charAt(0).toUpperCase() + type.slice(1);
        const stringVal = `
                <button class="${type}-btn btn btn-light" title="${title}" ${addAttr}>
                    <img src="${this.getStatusIcon(type)}" alt="${title}">
                </button>
        `.trim();

        if (returnFrag) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = stringVal;
            return tempDiv.firstElementChild || null;
        }

        return stringVal;
    }


    /* ------------------------------
    Header
    --------------------------------*/
    renderHeader(currentItem, statusIcon, canEdit, canDelete, isTrackView = false) {
        //if (IS_LOCAL_HOST) debugger;
        this._ensureParent();
        if (!this.parent || !this.parent.config) {
            return "";
        }
        const {
            deleteKeys
        } = this.parent.config;

        //  Skip deleteKey calculation if already deleted
        let deleteKey = deleteKeys.NONE;
        if (!currentItem.deletedBy && !isTrackView) {
            try {
                // if (IS_LOCAL_HOST) debugger;
                const hasKey = this.getDeleteKey(currentItem, canDelete, USER_INFO, this.parent.config, this.parent._state);
                if (hasKey) deleteKey = hasKey;
            } catch (error) {
                deleteKey = deleteKeys.NONE;
            }
        }

        const collatorAttr = (this.parent._state && this.parent._state.isCollator) ? `data-collation-status="${currentItem.collationStatus}"` : ``;

        const delAttr = `data-delete-key="${deleteKey}"`;
        const canDeleteFinal = deleteKey && deleteKey !== deleteKeys.NONE;

        return `<div class="panel-query-header">
                    <span class="data-label" data-status="${currentItem.status}" ${collatorAttr}>${currentItem.label}</span>
                    <img src="${statusIcon}" class="status-icon" alt="${currentItem.status}">
                        <div class="query-actions ml-auto">
                            ${!currentItem.deletedBy && IS_EDITOR_PAGE ? `
                                ${canEdit ? this.renderActionBtn("edit") : ""}
                                ${!canEdit && !this.globalQuickReplyMode ? this.renderActionBtn("reply") : ""}
                                ${canDeleteFinal ? this.renderActionBtn("delete", null, delAttr) : ""}
                            ` : ""}
                        </div>
                </div>
        `.trim();
    }


    getDeleteKey(currentItem, canDelete, userInfo, config, state) {
        const {
            deleteKeys
        } = config;
        const {
            status,
            collationStatus,
            lastResponse = {},
            responses = [],
            role = "",
            sameUserRole: itemSameUserRole = false
        } = currentItem;

        const normalizeRole = role => role.replace(/^Co-/i, "").replace(/ 2$/i, "");
        const rSameUserRole = (lastResponse && lastResponse.sameUserRole) || false;
        const sameUserRole = (itemSameUserRole && responses.length == 0) || false;

        const isComment = status === "comment";
        const itemConfig = config[isComment ? "comment" : "query"];

        const {
            SELECTOR_SHOW_HIDE,
            IS_CO_ROLE
        } = userInfo;
        const {
            currentUserRole
        } = state;
        const isUserCoRole = currentUserRole.includes("Co-");
        const cleanUserRole = normalizeRole(currentUserRole);
        const cleanCurrentRole = normalizeRole(role);

        const normalizedRoles = responses.length > 0 && responses.map(res => normalizeRole(res && res.role)) || [];
        const allSameRoleResponses = normalizedRoles.length > 0 && normalizedRoles.every(res => res === cleanUserRole);

        const insertBySameRole = cleanCurrentRole === cleanUserRole;
        const isCoRole = isUserCoRole || IS_CO_ROLE;
        const hasResponses = responses.length > 0;
        const isMultiRes = hasResponses ? responses.length > 1 : false;
        const isSingleRes = hasResponses ? responses.length === 1 : false;

        // Default
        let deleteKey = canDelete ? deleteKeys.SINGLE : deleteKeys.NONE;

        //  Queries
        if (!isComment) {
            if (allSameRoleResponses && (rSameUserRole || (!rSameUserRole && !isCoRole))) {
                deleteKey = deleteKeys.SINGLE;
            }
        }
        //  Comments
        else {
            if (insertBySameRole) {
                if (!hasResponses && (sameUserRole || (!isCoRole && !sameUserRole))) {
                    deleteKey = (!isCoRole && sameUserRole) ? deleteKeys.SINGLE : (!isCoRole && !sameUserRole) ? deleteKeys.OTHER_ALL : deleteKeys.SINGLE;
                } else if (allSameRoleResponses && (isMultiRes || isSingleRes)) {
                    if (isCoRole && rSameUserRole) {
                        deleteKey = deleteKeys.SINGLE;
                    } else {
                        deleteKey = rSameUserRole ? deleteKeys.ALL : deleteKeys.OTHER_ALL;
                    }
                }
            }
        }

        //  Super User (Editor / Co-Editor)
        if (itemConfig[SELECTOR_SHOW_HIDE] === "true") {
            const isParentEditorRole = /^editor( 2)?$/i.test(role);
            const hasEditorResponse = (
                normalizedRoles.length > 0 && normalizedRoles.some(r => r.includes("Editor"))
            ) || (!hasResponses && /editor$/i.test(cleanCurrentRole));
            const onlyOtherRoles = !hasEditorResponse;

            if ((onlyOtherRoles && hasResponses) || (!hasResponses && !hasEditorResponse)) {
                deleteKey = deleteKeys.OTHER_ALL;
            } else if (hasEditorResponse) {
                if (isComment) {
                    const hasEditor = isParentEditorRole || responses.some(res => res && /^editor( 2)?$/i.test(res.role));
                    if (isCoRole && isParentEditorRole && !hasResponses) {
                        deleteKey = deleteKeys.NONE;
                    } else if (isCoRole && rSameUserRole && hasResponses) {
                        deleteKey = deleteKeys.SINGLE;
                    } else if (!isCoRole) {
                        deleteKey = deleteKeys.ALL;
                    } else if (hasEditor) {
                        deleteKey = canDelete ? deleteKeys.SINGLE : deleteKeys.NONE;
                    }
                } else if (hasResponses) {
                    if (rSameUserRole || (!rSameUserRole && !isCoRole)) {
                        deleteKey = deleteKeys.SINGLE;
                    }
                }
            }
        }

        //  Final override if deleted
        if (currentItem.deletedBy) {
            deleteKey = deleteKeys.NONE;
        }

        return deleteKey;
    }

    /* ------------------------------
       Body
    --------------------------------*/
    renderBody(query, date, timerTip, userTip, isTrackView = false) {
        const queryAttachments = Array.isArray(query.attachments) ? query.attachments : [];
        const lastResponseAttachments = query && query.lastResponse && Array.isArray(query.lastResponse.attachments) ?
            query.lastResponse.attachments : [];
        const sameAttachmentSet =
            queryAttachments.length > 0 &&
            queryAttachments.length === lastResponseAttachments.length &&
            queryAttachments.every((att, index) => {
                const respAtt = lastResponseAttachments[index] || {};
                return att &&
                    respAtt &&
                    att.file_sn === respAtt.file_sn &&
                    att.file_on === respAtt.file_on;
            });
        const bodyAttachments = sameAttachmentSet ? [] : queryAttachments;

        return `
        <div class="query-body">
            <div class="query-meta d-flex">
                <span class="query-author" data-label="${query.label}" data-role="${query.role}" ${userTip}>${query.role}</span>
                <span class="query-time ml-auto" ${timerTip}>${date}</span>
            </div>
            <div class="query-content">${query.content}</div>
            ${this.renderAttachments(bodyAttachments, !query.sameUserRole, isTrackView)}
            ${this.renderResponses(query.responses, isTrackView)}
        </div>
        `.trim();
    }

    /* ------------------------------
       Reply container
    --------------------------------*/
    renderReplyContainer(query, canEdit, canDelete) {
        // condition: if quickReplyMode && last response was not current user → hide reply form               
        const showReply = this.globalQuickReplyMode && !canEdit;
        return `
        <div class="reply-container" style="display:${showReply ? 'block' : 'none'};">
            ${showReply ? this.renderReplyForm(query, canDelete) : ""}
        </div>`.trim();
    }

    /* *** */

    renderCommon(currentItem, isComment, isTrackView = false) {
        this._ensureParent();
        if (!this.parent) {
            return "";
        }

        isTrackView = !IS_EDITOR_PAGE || window.location.href.includes("TrackView");


        // Load from DOM if in Track View and cache is empty
        if (IS_TRACK_VIEW && this.parent && this.parent._state && this.parent._state.queries.size === 0 &&
            this.parent._state.comments.size === 0) {
            this.parent.loadQueriesFromDOM();
        }

        const queryOrComment = typeof currentItem === "string" ? this.parent.getQuery(currentItem) : currentItem;

        if (!currentItem || !queryOrComment) return "";

        // Status icon
        const statusIcon = this.getStatusIcon(queryOrComment.status, queryOrComment);

        // Extract response info
        const lastResponse = queryOrComment.lastResponse || {};
        let sameUserRole = false;
        let content = "";

        if (lastResponse && typeof lastResponse.sameUserRole !== "undefined") {
            sameUserRole = lastResponse.sameUserRole;
            content = lastResponse.content || "";
        } else if (typeof queryOrComment.sameUserRole !== "undefined" && queryOrComment.responses && queryOrComment.responses.length === 0) {
            sameUserRole = queryOrComment.sameUserRole;
            content = queryOrComment.content || "";
        }

        // Permissions
        const canEdit = sameUserRole === true;
        const canDelete = sameUserRole === true;

        // Time formatting
        const timeInfo = this.formatTime(queryOrComment.timestamp, queryOrComment.user);
        const {
            date,
            timerTip,
            userTip,
            userDeleteTip
        } = timeInfo;

        // Header
        const headerData = this.renderHeader(queryOrComment, statusIcon, canEdit, canDelete, isTrackView);

        // ---  Deleted item handling ---
        const {
            deletedBy,
            deletedAt,
            deletedRole
        } = queryOrComment;

        if (deletedBy && deletedAt) {
            // Return empty string if not collator
            if (!this.parent || !this.parent._state || !this.parent._state.isCollator) {
                return "";
            }
            const deletedTime = this.formatTime(deletedAt);
            const deletedText = `Deleted by ${deletedRole} on ${deletedTime.date}`;

            // Deleted body only (no replies/actions)
            const bodyData = `<div class="query-body deleted-info" data-deleted-by="${deletedBy}" ${userDeleteTip}><em>${deletedText}</em></div>`;

            return `<div class="query-item deleted qcp-filter-deleted"  data-query-id="${queryOrComment.id}" data-status="deleted">
                            ${headerData}
                            ${bodyData}
                        </div>
                    `.trim();
        }
        // ---  end deleted logic ---

        // Body + reply
        const bodyData = this.renderBody(queryOrComment, date, timerTip, userTip, isTrackView);
        const replyContainerData = isTrackView ? "" : this.renderReplyContainer(queryOrComment, canEdit, canDelete);

        const inner = `${headerData}${bodyData}${replyContainerData}`;

        const originalStatus = (queryOrComment.status || "").toLowerCase();
        let finalStatus = originalStatus;
        if (this.parent && typeof this.parent.resolvePanelFilterStatus === "function") {
            finalStatus = this.parent.resolvePanelFilterStatus(queryOrComment) || finalStatus;
        }
        const filterClass = `qcp-filter-${finalStatus || originalStatus || "open"}`;

        // Final markup
        return `<div class="query-item ${isTrackView ? "trackview" : ""} ${filterClass}" data-query-id="${queryOrComment.id}" data-status="${originalStatus}">${inner}</div>`.trim();
    }


    renderResponses(responses, isTrackView = false) {
        if (!responses || responses.length === 0) return '';

        const html = responses.map((response, index) => {
            const {
                timestamp,
                role,
                content,
                attachments = [],
                user,
                sameUserRole
            } = response;
            const {
                date,
                timerTip,
                userTip
            } = this.formatTime(timestamp, user);

            return `
                    <div class="response-item" data-index="${index}">
                        <div class="response-meta d-flex">
                            <span class="response-author" data-role="${role}" ${userTip}>${role}</span>
                            <span class="response-time ml-auto" ${timerTip}>${date}</span>
                        </div>
                        <div class="response-content">${content}</div>
                        ${this.renderAttachments(attachments, !sameUserRole, isTrackView)}
                    </div>
        `;
        });

        // 🔹 If there are 3+ responses, insert toggle just *before last response*
        if (responses.length >= 3) {
            const toggleIcon = `
                                <div class="response-toggle">
                                    <img src="assets/images/svg/query_panel/qpShowAllRes.svg" 
                                        alt="Expand responses" 
                                        title="Expand" 
                                        class="collapsed" />
                                </div>
        `;
            // Insert before last item
            html.splice(html.length - 1, 0, toggleIcon);
        }

        return `
                <div class="responses-container ${responses.length >= 3 ? "" : "expanded"}">
                    ${html.join('')}
                </div>
            `;
    }



    renderAttachments(attachments, readOnly = false, isTrackView = false) {

        attachments = Array.isArray(attachments) ? attachments : [];
        if (attachments.length === 0) return '';

        const attachmentId = attachments[0].id || '';
        const attachCount = attachments.length;
        // Reusable button template
        const renderButton = (cls, title, icon) => `<button class="${cls} btn btn-sm btn-light" title="${title}"><img src="assets/images/svg/query_panel/${icon}.svg"></button>`.trim();
        const showHide = isTrackView ? "" : `<span class="showHide" title="Expand"><img class="" src="assets/images/svg/query_panel/qpExpandOpen.svg" title="Expand" alt="CloseIcon"></span>`;

        // Each file row
        const items = attachments.map(att => {
            const fileName = att.file_on;
            const displayName = this.truncateFileName(fileName);

            return `<div class="attachment-item"
                    data-file-sn="${att.file_sn}"
                    data-file-on="${att.file_on}"
                    data-attachment-id="${att.id || ''}">
                    ${renderButton('download-btn', 'Download', 'qpDownload')}
                    <span class="attachment-name" title="${fileName}">${displayName}</span>
                    ${readOnly || isTrackView ? "" : renderButton('delete-attachment-btn ml-auto', 'Delete', 'qpTrash')}
    </div>`.trim();
        }).join('');

        // Header row (Download All / Delete All)
        const listClass = isTrackView ? "" : attachCount > 2 ? "d-none" : "";
        return `<div class="attachments-container" data-attachment-id="${attachmentId}">
                <div class="attachments-header">
                    ${renderButton('download-all-btn', 'Download All', 'qpDownload')}
                    <span class="attachment-name">Attachments (${attachments.length}) ${attachCount > 2 ? showHide : ""}</span>
                    ${readOnly || isTrackView ? "" : renderButton('delete-all-attachment-btn ml-auto', 'Delete All', 'qpTrash')}
                </div>
                <div class="attachments-list ${listClass}">${items}</div>
</div>`.trim();
    }

    renderReplyForm(query) {

        if (!this.setupInitiated && !this.setUpParentKeys()) {
            return "";
        }
        this._ensureParent();
        if (!this.parent) {
            return "";
        }
        query = query || {};
        const {
            status
        } = query;

        var rSameUserRole = (query && query.lastResponse && query.lastResponse.sameUserRole) || false;
        var sameUserRole = (query && query.sameUserRole && Array.isArray(query.responses) && query.responses.length == 0) || false;

        var {
            content = "", attachments = []
        } = sameUserRole ? query : rSameUserRole ? query.lastResponse : {};

        // Build quick reply buttons if:
        // - user is not same role
        // - and query is in 'open' state
        const isOpen = status === "open";
        const isComment = status === "comment";
        const isEditMode = rSameUserRole || sameUserRole;
        const isReplyMode = this.parent._state._mode == "reply";

        let canShowCollatorQuick = this.parent._state && this.parent._state.isCollator || false;

        const canShowQuickButtons = !isEditMode && (isOpen || canShowCollatorQuick);

        const quickButtons = canShowQuickButtons ?
            this.renderQuickReplyButtonRow() :
            "";



        // Decide label set based on sameUserRole
        const [primaryBtn, secondaryBtn] = isEditMode
            ?
            ['Update', 'Delete'] : ['Save', 'Clear'];


        return `<div class="reply-form">
                    <div class="quick-reply-buttons">${quickButtons}</div>
                    <div class="textarea-container" style="display:${(isEditMode || (isReplyMode && (isComment || !isOpen) && !canShowQuickButtons)) ? 'block' : 'none'};">
                        <div name="${query.id}_text" class="reply-textarea form-control form-control-sm mb-2" contenteditable="true">${(isEditMode) ? content : ""}</div>
                        <div class="default-action-buttons">
                            <button class="attach-btn btn btn-sm primary-btn">
                                <img src="assets/images/svg/query_panel/qpAttach.svg" width="16"> Attach
                            </button>
                            <button class="${secondaryBtn.toLowerCase()}-reply btn btn-sm primary-btn ml-auto">${secondaryBtn}</button>
                            <button class="${primaryBtn.toLowerCase()}-reply btn btn-sm primary-btn">${primaryBtn}</button>
                        </div>
                        ${isEditMode ? this.renderAttachments(attachments) : ""}
                    </div>
                    <input type="file" class="file-input" style="display:none;" multiple>
</div>`.trim();
    }


    /**
     * Decode any encoded HTML entities (used when reading back data-* attributes)
     */
    decodeTags(data = "") {
        if (!data) return "";
        for (const [encoded, decoded] of Object.entries(this.tagsAsString)) {
            // escape regex special characters
            const safeEncoded = encoded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const pattern = new RegExp(safeEncoded, "g");
            data = data.replace(pattern, decoded);
        }
        return data;
    }


    createNewItem(process = "comment", params = {}) {
        const {
            label,
            status,
            user,
            role,
            content = "",
            attachments = [],
            addAttr = ""
        } = params;
        const isComment = process === "comment" || process === "image_annotate";
        const timestamp = Date.now();
        const id = this.parent._current_process_uniqueId;

        // 🔒 Safely encode attribute values
        const safeAttr = str => String(str)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        const encodeContent = encodeURIComponent(content);

        const newValue = this.parent.verifyOnceContent(content);
        const safeContent = safeAttr(newValue);
        debug.log(newValue, safeContent);

        // Build attachment attributes (if any)
        let attachAttrs = "";
        if (attachments && attachments.length > 0) {
            const fileSn = attachments.map(a => a.file_sn || "").join("||");
            const fileOn = attachments.map(a => a.file_on || "").join("||");
            attachAttrs = `
            data-db-id="${attachments[0].id || ""}"
            data-file-sn="${fileSn}"
            data-file-on="${fileOn}"
        `.trim();
        }

        // Determine track code based on process type
        const trackCode = process === "image_annotate" ? "annotate-01" :
            isComment ? "comment-01" : "query-01";

        // Outer wrapper (query or comment container)
        const outerAttrs = [
            `data-class="ckcommentsfull"`,
            `data-label="${label}"`,
            `data-status="${isComment ? 'comment' : 'open'}"`,
            `id="${id}"`,
            `data-${isComment ? "comment" : "query"}="new"`,
            `data-track-code="${trackCode}"`
        ].filter(Boolean).join(" ");

        // Inner span (content + attachment info)
        const innerAttrs = [
            isComment ?
            `data-name="comment"` :
            `data-name="AQ" data-role="Query to Author"`,
            `data-${isComment ? "comment" : "query"}="new"`,
            attachAttrs,
            addAttr,
            `data-time="${timestamp}"`,
            `data-username="${user}"`,
            `data-rolename="${role}"`,
            `data-user-comment-box="${safeContent}"`
        ].filter(Boolean).join(" ");

        return `<span ${outerAttrs}><span ${innerAttrs}>&#x00A0;</span></span>`.trim();
    }




    buildDialogItems(currentItem, options = {}, self) {

        if (!currentItem) return "";

        self = self ? self : this ? this : window.queryModule.templates;

        self._ensureParent();

        const isReadonly = !!(options && (options.readonly || options.mode === "view"));
        const responses = Array.isArray(currentItem.responses) ? [...currentItem.responses] : [];
        const lastResponse = currentItem.lastResponse && typeof currentItem.lastResponse === "object" ? currentItem.lastResponse : null;

        // Edit/reply shell normally owns the last same-role message; keep it in the
        // thread for readonly view so the full conversation is visible.
        if (!isReadonly && lastResponse && lastResponse.sameUserRole && responses.length > 0) {
            responses.pop();
        }
        if (!isReadonly && responses.length === 0 && currentItem.sameUserRole) {
            return "";
        }

        const finalRender = [currentItem, ...responses];

        const items = finalRender.map((resp, idx) => {
            const roleName = resp.roleName || resp.role || "Role";
            const displayName = resp.displayName || roleName;
            const content = resp.content || "";
            const attachments = Array.isArray(resp.attachments) ? resp.attachments : [];


            // const attachmentsHTML = this.buildDialogAttachments(resp);
            // Track View readonly: string-mode render must not blank the whole thread
            let attachmentsHTML = "";
            if (attachments.length > 0 && self.parent && self.parent.attachmentModule &&
                typeof self.parent.attachmentModule.renderExistingAttachments === "function") {
                try {
                    attachmentsHTML = self.parent.attachmentModule.renderExistingAttachments(null, attachments, null) || "";
                } catch (err) {
                    console.warn("QueryTemplates.buildDialogItems attachments:", err && err.message);
                    if (typeof ErrorLogTrace === "function") {
                        ErrorLogTrace("QueryTemplates.buildDialogItems", err && err.message);
                    }
                    attachmentsHTML = "";
                }
            }

            return `<div class="reply-item" data-reply-id="${resp.id}" ${resp.status ? "" : "data-reply='yes'"}>
                        <div class="user-detail-info" data-role="${roleName}">${displayName || roleName}</div>
                        <div class="reply-content">${content}</div>
                        ${attachmentsHTML}
            </div>`;
        });
        // 🔹 If there are 3+ responses, insert toggle just *before last response*
        var addClass = "";
        if (responses.length >= 3) {
            const toggleIcon = `<div class="response-toggle"><img src="assets/images/svg/query_panel/qpShowAllRes.svg" alt="Expand responses" title="Expand" class="collapsed" /></div>`;
            // Insert before last item
            items.splice(items.length - 1, 0, toggleIcon);
        } else addClass = "expanded";

        return items ? `<div class="reply-group-items ${addClass}">${items.join("")}</div>` : "";
    }

    buildDialogInputForm(process = "comment", mode = "new", currentQuery = null) {
        this._ensureParent();
        // Readonly / Track View: no input shell, quick replies, or action toolbar
        if (mode === "view") return "";
        const dialog = this.parent && this.parent.dialogModule;
        if (dialog && typeof dialog.isReadonlyMode === "function" && dialog.isReadonlyMode()) {
            return "";
        }
        if (typeof IS_TRACK_VIEW !== "undefined" && IS_TRACK_VIEW) {
            return "";
        }
        const state = this.parent && this.parent._state;
        if (!state) {
            return "";
        }

        const isComment = process === "comment";
        const roleName = state.currentUserRole || "";

        const buttonConfig = {
            "new": "Insert",
            "edit": "Update",
            "reply": "Reply",
            "clear": "Clear"
        };
        const buttonText = buttonConfig[mode] || "Insert";

        let buttonTitle =
            mode === "edit" ?
            "Update the " :
            mode === "reply" ?
            "Reply to the " :
            "Insert the ";
        buttonTitle += isComment ? "Comment" : "Query";

        // Prefill for edit/reply
        let renderItem;
        if (currentQuery && mode !== "new") {
            const {
                lastResponse,
                sameUserRole,
                content
            } = currentQuery;
            if (mode === "edit") {
                if (sameUserRole) {
                    renderItem = currentQuery;
                } else if (lastResponse && lastResponse.sameUserRole) {
                    renderItem = lastResponse;
                }
            } else if (mode === "reply" && lastResponse && lastResponse.sameUserRole) {
                // renderItem = lastResponse;
            }
        }

        var contentValue = "";
        var attachmentsHTML = "";
        if (renderItem && renderItem.sameUserRole) {
            const {
                currentStoreId,
                renderExistingAttachments
            } = this.parent.attachmentModule;
            const storeId = currentStoreId || null;
            const safeAttachments = Array.isArray(renderItem.attachments) ? renderItem.attachments : [];
            attachmentsHTML = this.parent.attachmentModule.renderExistingAttachments(null, safeAttachments, storeId, {
                readOnly: false
            });
            contentValue = renderItem.content ? renderItem.content : "";
        }

        // Determine Cancel/Clear/Delete button label or hide
        let secondaryBtn = {
            title: "clear",
            text: "Clear",
            class: "clear-btn"
        };
        if (mode === "edit") {
            secondaryBtn = {
                title: "delete",
                text: "Delete",
                class: "delete-btn"
            };
        }

        const showDialogQuickReply = this.shouldShowDialogQuickReply(mode);
        const showVerifyInputShell = this.shouldShowVerifyInputShell(mode);

        const inputBlock = `
                <div class="form-group">
                    <div 
                        id="dialog-reply-input"
                        class="dialog-reply-input"
                        contenteditable="true"
                        role="textbox"
                        aria-multiline="true"
                        aria-label="${isComment ? "Comment" : "Query"} Content"
                        data-placeholder="Type something..."
                    >${contentValue}</div>
                </div>

                <div class="d-flex action-buttons mt-2">
                    <button class="attach-btn btn btn-sm secondary-btn"><img src="assets/images/svg/query_panel/qpAttach.svg" width="16" alt="Attach"> Attach</button>
                    <button type="button" title="${secondaryBtn.title}" class="btn btn-sm secondary-btn ${secondaryBtn.class} ml-auto">${secondaryBtn.text}</button>
                    <button type="submit" title="${buttonTitle}" class="btn btn-sm primary-btn save-btn">${buttonText}</button>
                </div>
                ${attachmentsHTML}
                <input type="file" class="file-input" style="display:none;" multiple>`;

        if (showVerifyInputShell) {
            return `
                <div class="user-detail-info" data-role="${roleName}">${roleName}</div>
                <div class="dialog-reply-form">
                    <div class="dialog-input-container" style="display:none;">
                        ${inputBlock}
                    </div>
                </div>
    `.trim();
        }

        if (showDialogQuickReply) {
            return `
                <div class="user-detail-info" data-role="${roleName}">${roleName}</div>
                <div class="dialog-reply-form">
                    <div class="quick-reply-buttons">${this.renderQuickReplyButtonRow()}</div>
                    <div class="dialog-input-container" style="display:none;">
                        ${inputBlock}
                    </div>
                </div>
    `.trim();
        }

        return `
                <div class="user-detail-info" data-role="${roleName}">${roleName}</div>
                ${inputBlock}
    `.trim();
    }



    renderQueryEditForm(query) {
        return `
            <form class="query-form">
                <div class="form-group">
                    <label>Query Label</label>
                    <input type="text" name="label" class="form-control" 
                           value="${query.label}" readonly>
                </div>
                <div class="form-group">
                    <label>Query Content</label>
                    <textarea name="content" class="query-textarea form-control">${query.content}</textarea>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" class="form-control">
                        <option value="Open" ${query.status === 'Open' ? 'selected' : ''}>Open</option>
                        <option value="Closed" ${query.status === 'Closed' ? 'selected' : ''}>Closed</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Attachments</label>
                    <input type="file" class="file-input" multiple>
                    <div class="attachment-list">
                        ${this.renderAttachments(query.attachments)}
                    </div>
                </div>
            </form>
    `.trim();
    }

    renderAttachmentItem(attachment) {
        return `
            <div class="attachment-item" data-attachment-id="${attachment.id}" 
                 data-file-name="${attachment.name}" data-file-size="${attachment.size}">
                <span class="attachment-name">${this.truncateFileName(attachment.name)}</span>
                <button class="remove-attachment-btn" title="Remove">×</button>
            </div>
    `;
    }

    // Utility methods
    getStatusIcon(status, queryOrComment) {
        const ICON_BASE = "assets/images/svg/query_panel/";
        const icons = {
            reply: "qpReply.svg",
            close: "qpClose.svg",
            delete: "qpDelete.svg",
            edit: "qpEdit.svg",
            res: "qpShowAllRes.svg",
            open: "qpOpen.svg",
            closed: "qpClosed.svg",
            note: "qpnote.svg",
            note_closed: "qpnote_closed.svg",
            note_deleted: "qpnote_deleted.svg",
            comment: "qpnote.svg"
        };

        queryOrComment = queryOrComment || {};
        const isComment = queryOrComment.status === "comment";
        const isDeleted = !!queryOrComment.deletedBy;
        if (isComment && (this.isCollator || isDeleted)) {
            if (isDeleted) {
                return ICON_BASE + icons['note_deleted'];
            } else if (this.isCollator) {
                let collationStatus = (queryOrComment.collationStatus || queryOrComment["data-collation-status"] || "").toLowerCase();
                if (/approved|verified|resolved|closed/gi.test(collationStatus)) {
                    return ICON_BASE + icons['note_closed'];
                } else {
                    return ICON_BASE + icons['note'];
                }
            }

        }

        return ICON_BASE + (icons[status] || icons[status && status.toLowerCase()] || icons['open']);

    }


    formatTime(timestamp, user) {
        let parseStamp;

        // Handle numeric timestamps (milliseconds)
        if (/^\d+$/.test(timestamp)) {
            parseStamp = Number(timestamp);
        }
        // Handle date strings like "2025-10-21"
        else if (typeof timestamp === "string" && timestamp.includes("-")) {
            parseStamp = new Date(timestamp).getTime();
        }
        // Fallback
        else {
            parseStamp = Date.now();
        }

        // Invalid or NaN safety
        if (isNaN(parseStamp)) {
            parseStamp = Date.now();
        }

        const momentDate = moment(parseStamp);
        const time = momentDate.format("hh:mm A");
        const date = momentDate.format("DD-MMM-YYYY");
        const userTip = user ? `data-toggle="tooltip" data-placement="right" title="${user}"` : '';
        const userDeleteTip = user ? `data-toggle="tooltip" data-placement="bottom" title="${user}"` : '';

        return {
            time,
            date,
            dateTime: `${date} ${time}`,
            timerTip: `data-toggle="tooltip" data-placement="bottom" title="${time}"`,
            userTip,
            userDeleteTip
        };
    }

    truncateFileName(filename, maxLength = 30) {
        if (typeof filename !== "string" || filename.length === 0) return "";
        if (filename.length <= maxLength) return filename;

        const extension = filename.substring(filename.lastIndexOf('.'));
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        const truncated = nameWithoutExt.substring(0, maxLength - extension.length - 3) + '...';

        return truncated + extension;
    }
}