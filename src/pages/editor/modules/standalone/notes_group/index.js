/***********
 * https://claude.site/artifacts/3103a867-c819-4e32-bfed-d925b5a40070
 * 
 * * FIRE_INSERT
 *  * This function handles the insertion of footnotes or endnotes into the document.
    * * 1. It first takes a snapshot of the current state of the editor.
    *   2. It retrieves the content from the summernote editor.
    *   3. It checks if the content is valid (not empty).
    *   4. It determines the type of note (footnote or endnote) and whether it should be numbered.
    *   5. It retrieves or creates the appropriate note group in the document.
    *   6. It generates a unique ID for the new note entry.
    *   7. It inserts the citation into the text and the note entry into the note group.
    *   8. If the note group already exists, it renumbers the notes.
    *   9. Finally, it finalizes the insertion by saving the snapshot and closing the module or dialog.
    *   order of operations:
    * *  FIRE_INSERT
            getFnGroupInfo
                openNotesDialogWithAlert
                FIRE_CHECK_ROOT_DIV
                calculateNewIndex
            booksBaseResults
                paraManager.findChapterByBaseId
            generateUniqueId
                checkIdExists
            insertCitation(id, lab, nType);
                GetTemplate
            insertNoteEntry(fnGroup, id, lab, caption_Text, nType, labels);

            FIRE_RE_NUMBER(nType, findRoot, fnGroup, Id_Prefix);

            finalizeInsertion();
                
 *
 */

/* <div class="mDialog ds-none wo-editor-access" id="NotesGroupDialog"> */



class NotesGroupModule extends BaseModule {
    constructor(name, errorTracker, options = {}) {
        super(name, errorTracker, options);
        this.initializeProperties();
        this.bindMethods();
        // this.lazyInitialize();
        this.initiated = true;
        this.updateMessage_Templates();
    }
    initializeProperties() {
        this.templateList = {};
        this.canUnmountComponentWhileClose = true;
        this.PrefixArr = {
            "footnotes": {
                "true": 'fn',
                "false": 'unfn'
            },
            "endnotes": {
                "true": 'en',
                "false": 'unen'
            },
            "endNotes": {
                "true": 'en',
                "false": 'unen'
            }
        };
        this.formatter = new RangeFormatter({});
        this.reNumber = new CheckOrder("fn");
        this.TOASTER_MESSAGE = {
            'FN_INS_ReNUM': {
                'text': 'The citation has been added to the text and notes list, and have been renumbered successfully.'
            },
            'FN_INS': {
                'text': 'The citation has been added to the text and notes list the notes list successfully.'
            },
            'MISS_CITE_FN': {
                'text': `<br><br>Renumbering is not excuted due to a missing citations [{{miss_cite}}] in the article. Kindly include the missing citations to initiate an automatic renumbering of the notes.`
            },

            'FN_INS_DEL': {
                'text': 'The footnote has been {{action}} to/from the text and the notes list successfully.'
            },

            'FN_INS_DEL_RENUMBER': {
                'text': 'The footnote has been {{action}} to/from the text and the notes list, and has been renumbered successfully.'
            },

        };
    }

    bindMethods() {
        const methodsToBind = [
            'AssignVar_EventLoop', 'initLoop', 'showLoop', 'FIRE_CHANGE', 'FIRE_DELETE',
            'FIRE_CHECK_ROOT_DIV', 'FIRE_INSERT', 'FIRE_RE_NUMBER', 'FIRE_CHECK'
        ];
        methodsToBind.forEach(method => {
            if (this[method]) {
                this[method] = this[method].bind(this);
            }
        });

    }

    getTrackingCode({
        action,
        nType,
        isXref,
        isCiteDelete,
        isNoteDelete
    }) {
        const isEndnote = /en|endnote|end-note/i.test(nType || '');
        if (action === 'insert') return isEndnote ? 'notes-02' : 'notes-01';
        if (action === 'delete') {
            if (isXref && isCiteDelete && !isNoteDelete) return isEndnote ? 'notes-05' : 'notes-04';
            else return 'notes-03';
        }
    }

    setupSummerNote() {
        try {
            this.summernote_selector = "#notes-body";
            this._summernote = this._summernote || new SummernoteManager(this);
            this._summernote.bindTarget(this.summernote_selector);
            this.SUMMERNOTE_CONFIG = this._summernote.buildConfig();
        } catch (error) {
            this.logError('setupSummerNote', error);
        }
    }

    AssignVar_EventLoop() {
        try {
            const KEY_WITH_ID = {
                PANEL_BODY: ".dialog-body",
                NOTES_AREA: "#notes-body",
                NUM_CHK: "#numberCheck",
                SUBMIT_BTN: ".submit_btn",
                FN_BTN: "#footnotes",
                EN_BTN: "#endnotes",
            };
            Object.entries(KEY_WITH_ID).forEach(([key, value]) => {
                this.elements[key] = this.Panel.querySelector(value);
            });
            this.summernote_selector = "#notes-body";
            if (this._summernote) this._summernote.bindTarget(this.summernote_selector);
            this.elements.SUBMIT_BTN.onclick = this.FIRE_INSERT;
            this.elements.FN_BTN.onclick = this.elements.EN_BTN.onclick = this.FIRE_CHANGE;
        } catch (err) {
            this.trackError('AssignVar_EventLoop', err);
        }
    }

    initLoop() {
        try {
            this.AutoInitiated = true;
            this.M_CONFIG.SHOW_CONTEXT_GROUP = IsContextMenu('notesGroup');
            const groupConfig = this.G_FUN.GET_CONFIG_ITEM('[name="notesGroup"]', {
                CONVERT_JSON: true,
                attr: true,
                children: true,
                keyUpperCase: false
            });
            Object.assign(this.M_CONFIG, groupConfig);
            this.reNumber.setRenumberPolicy(groupConfig);
            const OBJ = this.G_FUN.GET_CONFIG_ITEM("notes", {
                CONVERT_JSON: true,
                children: true,
                attr: true,
                hex2string: true,
                keyUpperCase: false,
                fromTemplate: true
            });
            Object.assign(this.templateList, OBJ);
            this.FullyLoaded = true;
            this.isOHO = commonMethods.getClientCode({
                format: "upper"
            }) == "OHO";
            this.isOSO = commonMethods.getClientCode({
                format: "upper"
            }) == "OSO";
            this.isTNF = commonMethods.getClientCode({
                format: "upper"
            }) == "TNF";
            this.isLSE = commonMethods.getClientCode({
                format: "upper"
            }) == "LSE";
            this.isOXMEDO = commonMethods.getClientCode({
                format: "upper"
            }) == "OXMEDO";
            // BITS.dtd clients (TNF|LSE): chapter notes live under chapter .back
            this.isBitsFnGroup = this.isTNF || this.isLSE;

            const oasisChapterEnd = `.book-body .fn-group[content-type],
                                    .book-part .fn-group`.trim();
            const bitsChapterEnd = `.book-body .book-part[book-part-type] .back .fn-group`;

            this._collection = {};

            this._state = {
                ...this._state,
                selector: {
                    "default": `div.fn-group`,
                    "book-end": `
                            .book-back .book-part[book-part-type="endNotes"],
                            .book-back .book-part[book-part-type="backmatter"] [content-type="endnotes"],
                            .book-back .book-part[book-part-type] [content-type="endnotes"]`.trim(),

                    "chapter-end": this.isBitsFnGroup ? bitsChapterEnd : oasisChapterEnd,
                    // Relative to CUR_CHAPTER — BITS path only
                    "chapter-end-local": this.isBitsFnGroup ? `.back .fn-group` : null
                },
                currentSelector: ''
            };

            this._state.followedBy = IS_JOURNAL ? "default" : "chapter-end";
            this._state.currentSelector = this._state.selector[IS_JOURNAL ? 'default' : 'chapter-end'];
            this._state.contentType = "footnotes";


        } catch (err) {
            this.trackError('InitLoop', err);
        }
    }
    openNotesDialogWithAlert() {

        if (typeof queryDialog != "undefined") {
            window.queryDialog.open(null, "comment", {
                ignore_first_alert: true
            });
            setTimeout(() => {
                if (AlertNewDialog && AlertNewDialog.fire) {
                    AlertNewDialog.fire("BOOK_END_NOTE");
                }
            }, 150);
        }
    }

    showLoopSetUp() {

        this._state.editor = GlobalEditor;
        this._state.editorDoc = GlobalEditor.document;
        this._state.editorBody = GlobalEditor.document.$.body;

        if (!IS_JOURNAL) {
            var bookEndNotesSec = this._state.editorDoc.findOne(this._state.selector['book-end']);
            var bookDefaultSec = this._state.editorDoc.findOne(this._state.selector['default']);
            if (bookEndNotesSec) {
                this._state.isBookEndNotes = true;
                this._state.currentSelector = this._state.selector['book-end'];
                this._state._bookEndNotesSec = bookEndNotesSec;
                let notesType = bookEndNotesSec.getAttribute("book-part-type") || bookEndNotesSec.getAttribute('content-type') || "endnotes";
                this._state.followedBy = (notesType == "endNotes") ? "chapter-split-book-end" : "book-end";
                this._state.contentType = notesType;
            } else if (bookDefaultSec) {

            }

        }
    }

    showBefore() {

        this.showLoopSetUp();
        return true;
    }


    showLoop() {
        console.log(`Module ${this._name} opened`);
        try {
            if (typeof paraManager == "undefined") {
                Initialize_Para_Id();
            }
            this.AssignVar_EventLoop();

            if (!this.trackManager) this.trackManager = window._trackManager;

            const {
                FN_BTN,
                EN_BTN,
                NUM_CHK
            } = this.elements;

            if (!FN_BTN || !EN_BTN || !NUM_CHK) {
                throw new Error("Required UI elements are missing.");
            }

            if (this._summernote) this._summernote.bindTarget(this.elements.NOTES_AREA || this.summernote_selector, {
                resetCache: true
            });
            $(this.summernote_selector).summernote(this.SUMMERNOTE_CONFIG);

            const firstGroup = this._state.editorDoc.findOne(this._state.currentSelector);

            let firstTitle = "";
            let firstType = "";
            let citeType = "";

            if (firstGroup) {
                const titleEl = firstGroup.findOne(".title");
                const firstItem = firstGroup.findOne(".fn");

                firstTitle = titleEl && titleEl.$ ? getTxt(titleEl.$) : "";
                // BITS chapter .fn-group often lacks content-type; keep footnotes default
                firstType = firstGroup.getAttribute("content-type") || (this.isBitsFnGroup ? "footnotes" : "");
                citeType = firstItem.getAttribute("fn-type");

            }

            Object.assign(this._collection, {
                firstTitle,
                firstType,
                citeType
            });

            if (IS_JOURNAL || this._collection.firstType === "footnotes") {
                FN_BTN.click();
                EN_BTN.classList.add("ds-none");
                this._state.type = "footnotes";
            } else {
                EN_BTN.click();
                FN_BTN.classList.add("ds-none");
                this._state.type = IS_JOURNAL ? "endnotes" : this._collection.firstType ? this._collection.firstType : "endNotes";
            }
            if (this._state.isBookEndNotes) {

            }

            NUM_CHK.checked = true;
            NUM_CHK.parentElement.classList.add("ds-none");

        } catch (err) {
            this.trackError('ShowLoop', err);
        }
    }

    FIRE_CHANGE(evt) {
        try {
            if (!evt.target.classList.contains('active')) {
                this.elements.FN_BTN.classList.toggle("active");
                this.elements.EN_BTN.classList.toggle("active");
            }
        } catch (err) {
            this.trackError('FIRE_CHANGE', err);
        }
    }
    findLastSection(findRoot) {
        const sections = findRoot.querySelectorAll('div.sec');
        return sections.length > 0 ? sections[sections.length - 1] : null;
    }


    FIRE_CHECK_ROOT_DIV(findRoot, type = this._state.type) {
        try {
            const NOTE_OBJ = {
                frag: true,
                id: 'fn-group-1',
                id1: GENERATE_ID(),
                dom: true,
                sub: type
            };


            let rGroup = findRoot.querySelector('div.ref-list');
            let backGroup = findRoot.querySelector('div.back');
            const body = findRoot.querySelector('div.body');

            var lastSec;
            //  LWW - MEDKNOW - THOMSON
            let isRefHeader = false;
            if (!IS_JOURNAL) {
                const {
                    baseId
                } = this.booksBaseResults();

                const existingCount = this._state.editorBody.querySelectorAll(`[class="fn-group"]`).length + 1;
                NOTE_OBJ.id = `${baseId}-fn-group-${existingCount}`;

                // TODO - RENUMBER ALL fn-group id based on index
                // TODO - This only for chapter endnotes
                // TODO - This is not for book endnotes - Need to develop a new logic for book endnotes
                if (this._state.isBookEndNotes) {

                    // var existingSec = this._state._bookEndNotesSec.querySelectorAll('div.sec');

                    var titleEl = EDITOR_CURSOR & EDITOR_CURSOR.CUR_CHAPTER && EDITOR_CURSOR.CUR_CHAPTER.querySelector('div.title') || "";
                    var titleText = titleEl && titleEl.textContent ? titleEl.textContent : '';
                    var title = ((titleEl.hasAttribute("data-label") ? titleEl.getAttribute("data-label") : "") + titleText) || '';
                    if (title) {
                        NOTE_OBJ.title = title.trim();
                    }

                } else {
                    if (!backGroup) {
                        const backNode = this.newElm("div", {
                            setAtt: {
                                "class": "back",
                                "data-name": "back",
                                "id": s4()
                            }
                        });

                        if (body) {
                            body.after(backNode);
                            backGroup = backNode;
                            // Update backGroup after creating
                        }
                    }
                }
            } else {
                //  Find last section
                const sections = findRoot.querySelectorAll('div.sec');
                lastSec = sections.length > 0 ? sections[sections.length - 1] : null;


                if (IS_JOURNAL && lastSec) {
                    const title = lastSec.querySelector(".title");
                    // (Maybe not <title> tag, but class "title")
                    const listItems = lastSec.querySelectorAll(".list-item");

                    const itemHaveInterest = Array.from(listItems).some(item =>
                        item.textContent.includes("▪") ||
                        item.textContent.toLowerCase().includes("of special interest") ||
                        item.textContent.toLowerCase().includes("of outstanding interest")
                    );

                    const isRefTitle = title && /reference|references and recommended reading/gi.test(title.textContent.toLowerCase());

                    isRefHeader = itemHaveInterest || isRefTitle;
                }
            }

            const fnGroup = this.GetTemplate("root", NOTE_OBJ);
            var {
                firstTitle
            } = this._collection;
            if (fnGroup) {
                if (firstTitle) fnGroup.querySelector(".title").textContent = firstTitle;
                if (rGroup) {
                    if (lastSec && isRefHeader) {
                        rGroup.before(lastSec);
                        lastSec.before(fnGroup);
                    } else {
                        rGroup.before(fnGroup);
                    }
                } else if (backGroup) {
                    backGroup.append(fnGroup);
                } else {
                    findRoot.append(fnGroup);
                    // Fallback if nothing exists
                }
            }
            return fnGroup;
        } catch (err) {
            this.trackError('FIRE_CHECK_ROOT_DIV', err);
        }
    }

    deleteAll({
        TEXT_GROUP,
        NODE_ID,
        NOTE_GROUP,
        isCiteDelete,
        isNoteDelete
    }) {
        try {
            const selector = [`[id="${NODE_ID}"]`, `a[rid="${NODE_ID}"]`].join(',');

            const _findRoot = TEXT_GROUP && TEXT_GROUP.$ ? TEXT_GROUP.$ : TEXT_GROUP;
            const _noteGroup = NOTE_GROUP && NOTE_GROUP.$ ? NOTE_GROUP.$ : NOTE_GROUP;

            const list1 = Array.from(TEXT_GROUP.querySelectorAll(selector) || []);
            const list2 = _noteGroup ? Array.from(_noteGroup.querySelectorAll(selector)) : [];

            const seen = new WeakSet();
            const deletedIds = [];

            [...list1, ...list2].forEach(element => {
                if (seen.has(element)) return;
                seen.add(element);

                const isXref = element.classList.contains('xref');
                deletedIds.push(element.id || element.getAttribute("rid"));

                this.handleNodeDeletion(element, isXref, {
                    isCiteDelete,
                    isNoteDelete
                });

            });

            return {
                deletedCount: deletedIds.length,
                deletedIds
            };
        } catch (err) {
            this.trackError('deleteItem', err);
            return {
                deletedCount: 0,
                deletedIds: [],
                error: err
            };
        }
    }


    handleNodeDeletion(node, isXref, deleteOptions = {}) {
        try {

            const isSameUserOrRole =
                commonMethods.IS_SAME_USER_AND_ROLE(node) ||
                commonMethods.IS_SAME_USER_AND_ROLE(node.closest("insert")) ||
                (node.hasAttribute("data-new") && commonMethods.IS_SAME_USER_AND_ROLE(node.querySelector("insert")));

            if (isSameUserOrRole) {
                commonMethods.removeEl(node);
            } else if (node.tagName !== 'DEL' && !node.hasAttribute("data-delete")) {
                this.markForDeletion(node, isXref, deleteOptions);
            }
        } catch (err) {
            this.trackError('handleNodeDeletion', err);
        }
    }

    markForDeletion(node, isXref, deleteOptions = {}) {
        if (!this.trackManager) this.trackManager = window._trackManager;

        const {
            currentSelector,
            isBookEndNotes
        } = this._state;
        const {
            isCiteDelete,
            isNoteDelete
        } = deleteOptions;

        try {
            const ridOrId = node.getAttribute(isXref ? 'rid' : 'id');

            const attributes = {
                'data-delete': 's',
                [isXref ? 'data-del-rid' : 'del_id']: ridOrId
            };

            const removeAttr = ['data-cke-saved-href', 'href', 'rid', 'data-role', 'ref-type', 'id'];

            commonMethods.SET_REMOVE_ATTR(node, attributes, removeAttr);

            const paramsObj = {
                [isXref ? 'nodeOnly' : 'childOnly']: true
            };

            const parentEl = node.parentElement;
            const hasParentPara = parentEl && parentEl.getAttribute && parentEl.getAttribute('class') === 'p';

            // const paramNode = isBookEndNotes && !isXref ? parentEl : node;
            let paramNode = isXref ? node : (hasParentPara ? parentEl : node);

            // Resolve nType from xref ref-type or module state
            let nType = '';
            if (isXref) {
                nType = node.getAttribute('ref-type') || '';
            } else {
                // For note entries, try to get fn-type from the node
                nType = node.getAttribute('fn-type') || this._state.type || '';
            }

            // Get tracking code and pass to getDelNode
            const trackCode = this.getTrackingCode({
                action: 'delete',
                nType,
                isXref,
                isCiteDelete,
                isNoteDelete
            });
            if (trackCode) {
                paramsObj.setAttrParams = {
                    'data-track-code': trackCode
                };
            }

            this.trackManager.getDelNode(paramNode, paramsObj);

        } catch (err) {
            this.trackError('markForDeletion', err);
        }
    }

    async fallBackAsInsertAsNote(queryId = null) {
        const additionalAttr = `data-insert-from='note-dialog'`;
        const caption_Text = this.getSummerNoteContent();
        const preSaveResults = {
            hasContent: caption_Text.length > 0,
            htmlData: caption_Text,
            textData: caption_Text,
            htmlLength: caption_Text.length,
            textLength: caption_Text.length,
            unchanged: false,
            canSave: true,
            canClose: false,
            domEl: null
        };

        const results = await window.queryModule.operationInsertOrUpdate({
            name: this.name
        }, queryId, preSaveResults, {
            from: "insert_notes",
            process: "comment",
            addAttr: additionalAttr
        }, {
            domEl: null,
            addAttr: additionalAttr
        });
        console.log(results);
    }

    _normalizeContentType(contentType) {
        if (!contentType) return '';
        const lower = String(contentType);
        if (lower === 'endnotes' || lower === 'endnote') return 'endnotes';
        if (lower === 'footnotes' || lower === 'footnote') return 'footnotes';
        return lower;
    }

    _findXref(type, index = 0) {
        if (!EDITOR_CURSOR.CUR_CHAPTER) return null;
        const chapXrefs = EDITOR_CURSOR.CUR_CHAPTER.querySelectorAll(`.xref[ref-type="${type}"]`);
        if (!chapXrefs || index >= chapXrefs.length) return null;

        const rid = chapXrefs[index].getAttribute("rid");
        const fnXref = this._state.editorBody.querySelector(`.fn[id="${rid}"]`);
        if (fnXref) {
            const sec = fnXref.closest(".sec,.fn-group");
            if (sec) return sec;
        }
        return this._findXref(type, index + 1);
    }

    _findFnGroup({
        nType,
        createIfMissing = false
    } = {}) {

        const {
            currentSelector,
            isBookEndNotes,
            selector,
            contentType
        } = this._state;

        // Determine expected content-type based on nType
        const isEndnoteType = nType === 'en' || nType === 'endnote' || nType === 'end-note';
        const expectedContentType = isEndnoteType ? 'endnotes' : 'footnotes';

        const bookEndNoteType1 = isBookEndNotes && contentType == "endnotes";
        const bookEndNoteType2 = isBookEndNotes && contentType == "endNotes";

        const TEXT_GROUP = (IS_JOURNAL || bookEndNoteType1) ? this._state.editorBody : EDITOR_CURSOR.CUR_CHAPTER;

        // Find fn-group with matching content-type when nType is specified
        let NOTE_GROUP = (IS_JOURNAL || bookEndNoteType1) ? this._state.editorBody : EDITOR_CURSOR.CUR_CHAPTER;
        if (nType && TEXT_GROUP && bookEndNoteType1) {
            // Try to find specific fn-group by content-type
            const allGroups = TEXT_GROUP.querySelectorAll('div.fn-group');

            for (const group of allGroups) {
                const groupType = group.getAttribute('content-type');

                if (!isEndnoteType && allGroups.length === 1) {
                    NOTE_GROUP = allGroups[0];
                } else {
                    NOTE_GROUP = allGroups[0].parentElement;
                }
            }
            // Fallback for legacy docs: if no content-type match but only one group exists, use it
            // Only do this for footnotes (default assumption)
            // When nType is specified and multiple groups exist without match, return null
        } else if (bookEndNoteType2) {
            NOTE_GROUP = this._findXref(nType, 0);
        } else {
            // Within CUR_CHAPTER use local selector for BITS (full path is for document findOne)
            const chapterLocal = selector['chapter-end-local'];
            const lookupSel = (!isBookEndNotes && chapterLocal) ? chapterLocal : currentSelector;
            NOTE_GROUP = TEXT_GROUP && TEXT_GROUP.querySelector(lookupSel);
        }

        if (bookEndNoteType1 && NOTE_GROUP) {
            NOTE_GROUP = NOTE_GROUP.parentElement;
        }


        let isRootExists = Boolean(NOTE_GROUP);
        let INSERT_NOTE_GROUP;

        if (!isRootExists && createIfMissing && TEXT_GROUP) {
            const chapterLocal = selector['chapter-end-local'];
            const lookupSel = (!isBookEndNotes && chapterLocal) ? chapterLocal : currentSelector;
            NOTE_GROUP = this.FIRE_CHECK_ROOT_DIV(TEXT_GROUP, expectedContentType) || TEXT_GROUP.querySelector(lookupSel);
        }


        if (isBookEndNotes && nType && contentType == "endnotes") {
            const xrefSec = this._findXref(nType, 0);
            if (xrefSec) INSERT_NOTE_GROUP = xrefSec;
        }

        // Book fallback: only when nType not specified (allows type-agnostic lookup)
        if (!NOTE_GROUP && !nType && !IS_JOURNAL && TEXT_GROUP) {
            const chapterLocal = selector['chapter-end-local'];
            const allSelectors = [
                selector['book-end'],
                chapterLocal,
                selector['chapter-end'],
                selector.default
            ].filter(Boolean);
            for (const sel of allSelectors) {
                const temp = TEXT_GROUP.querySelector(sel);
                if (temp) {
                    NOTE_GROUP = temp;
                    this._state.currentSelector = sel;
                    break;
                }
            }
        }

        isRootExists = Boolean(NOTE_GROUP);

        if (!NOTE_GROUP && createIfMissing) {
            debug.warn("FnGroup not found in any selector combination");
            this.fallBackAsInsertAsNote();
            return {
                NOTE_GROUP: null,
                is_root_exists: false,
                TEXT_GROUP
            };
        }

        return {
            NOTE_GROUP,
            is_root_exists: isRootExists,
            TEXT_GROUP,
            INSERT_NOTE_GROUP
        };
    }

    _resolveBookRoots({
        xrefOrEl,
        curEl,
        selectionNode,
        isCiteDelete,
        isNoteDelete,
        isInsertCite,
        finderObject,
        TEXT_GROUP,
        NOTE_GROUP
    }) {

        if (!xrefOrEl) return {
            TEXT_GROUP,
            NOTE_GROUP
        };

        const contentType = this._normalizeContentType(this._state.contentType || '');
        const chapOrNoteGroup = xrefOrEl.closest(
            isCiteDelete ? finderObject.section : (isNoteDelete ? finderObject.chapter : finderObject.section)
        );

        const {
            editorBody,
            isBookEndNotes
        } = this._state;
        if (isBookEndNotes) {
            if (contentType === 'endNotes') {
                if (isCiteDelete) {
                    TEXT_GROUP = curEl.closest(finderObject.chapter) || TEXT_GROUP;
                    if (chapOrNoteGroup) NOTE_GROUP = chapOrNoteGroup;
                } else if (isNoteDelete) {
                    NOTE_GROUP = selectionNode.closest(finderObject.section) || NOTE_GROUP;
                    if (chapOrNoteGroup) TEXT_GROUP = chapOrNoteGroup;
                } else if (isInsertCite) {
                    TEXT_GROUP = curEl.closest(finderObject.chapter) || TEXT_GROUP;
                    NOTE_GROUP = selectionNode.closest(finderObject.section) || selectionNode.closest(finderObject.fnGroup) ||
                        NOTE_GROUP;
                }
            } else if (contentType === 'endnotes') {
                NOTE_GROUP = editorBody.querySelector(`.book-back`);
                TEXT_GROUP = editorBody.querySelector(`.book-body`);
                if (TEXT_GROUP) {
                    // ? for handling front matter footnotes
                    var exceptBack = TEXT_GROUP.parentElement;
                    if (exceptBack) TEXT_GROUP = exceptBack;
                }
            }
        } else if (!IS_JOURNAL && contentType === 'footnotes') {
            // ? footnotes (BITS: prefer chapter .back .fn-group)
            const fnSel = (this.isBitsFnGroup && this._state.selector['chapter-end-local']) ?
                this._state.selector['chapter-end-local'] :
                finderObject.fnGroup;
            if (isCiteDelete) {
                TEXT_GROUP = curEl.closest(finderObject.chapter) || TEXT_GROUP;
                TEXT_GROUP.querySelector(fnSel) && (NOTE_GROUP = TEXT_GROUP.querySelector(fnSel));
                if (chapOrNoteGroup) NOTE_GROUP = chapOrNoteGroup;
            } else if (isNoteDelete) {
                NOTE_GROUP = selectionNode.closest(finderObject.fnGroup) || NOTE_GROUP;
                if (chapOrNoteGroup) TEXT_GROUP = chapOrNoteGroup;
            } else if (isInsertCite) {
                TEXT_GROUP = curEl.closest(finderObject.chapter) || TEXT_GROUP;
                NOTE_GROUP = TEXT_GROUP.querySelector(fnSel) || NOTE_GROUP;
            }

        }
        return {
            TEXT_GROUP,
            NOTE_GROUP
        };
    }



    resolveNoteContext(options = {}) {
        try {
            const {
                mode = 'insert',
                    idPrefix,
                    nType,
                    createIfMissing = false,
                    isCiteDelete,
                    isNoteDelete,
                    isInsertCite,
                    NODE_ID: explicitNodeId
            } = options;


            if (!this.AutoInitiated) this.init();
            if (!this._state.editorBody | !IS_JOURNAL) this.showLoopSetUp();

            if (mode === 'insert') {

                const {
                    NOTE_GROUP,
                    is_root_exists,
                    TEXT_GROUP,
                    INSERT_NOTE_GROUP
                } = this._findFnGroup({
                    nType,
                    createIfMissing
                });

                if (!NOTE_GROUP) return null;

                const {
                    indexVal,
                    labels,
                    IdSeq
                } = this.calculateNewIndex(NOTE_GROUP, idPrefix);

                return {
                    NOTE_GROUP,
                    is_root_exists,
                    newIndex: indexVal,
                    IdSeq,
                    labels,
                    TEXT_GROUP,
                    INSERT_NOTE_GROUP
                };
            }

            if (mode === 'delete') {

                const selectionNode = IMPACT_SELECTION && IMPACT_SELECTION.NODE ? IMPACT_SELECTION.NODE.$ : null;
                let editorRoot = this._state.editorBody;

                const finderObject = {
                    chapter: '[book-part-type="chapter"]',
                    section: `.sec`,
                    fnGroup: ".fn-group"
                };

                const explicitNode = explicitNodeId && editorRoot ?
                    editorRoot.querySelector(`[id="${explicitNodeId}"], a[rid="${explicitNodeId}"]`) :
                    null;
                const curEl = explicitNode ||
                    (selectionNode && selectionNode.closest(".fn")) ||
                    (selectionNode && selectionNode.closest(".xref")) ||
                    (isInsertCite && selectionNode && selectionNode.closest("[id]"));

                if (!curEl) return null;

                // default for journals and normal chapter book end
                let NOTE_GROUP = editorRoot.querySelector(finderObject.fnGroup);
                let TEXT_GROUP = editorRoot;
                const NODE_ID = explicitNodeId || curEl.id || curEl.getAttribute("rid");

                if (!NODE_ID) return null;

                if (!IS_JOURNAL) {
                    const xrefOrElFinder = isCiteDelete ? `[id="${NODE_ID}"]` : `[rid="${NODE_ID}"]`;
                    const xrefOrEl = editorRoot.querySelector(xrefOrElFinder);
                    const roots = this._resolveBookRoots({
                        xrefOrEl,
                        curEl,
                        selectionNode,
                        isCiteDelete,
                        isNoteDelete,
                        isInsertCite,
                        finderObject,
                        TEXT_GROUP,
                        NOTE_GROUP
                    });
                    TEXT_GROUP = roots.TEXT_GROUP;
                    NOTE_GROUP = roots.NOTE_GROUP;

                    if (!NOTE_GROUP) {
                        const chapter = (xrefOrEl || curEl).closest(finderObject.chapter);
                        if (chapter) {
                            TEXT_GROUP = chapter;
                            NOTE_GROUP = chapter.querySelector(finderObject.fnGroup);
                        }
                    }
                } else if (!NOTE_GROUP) {
                    NOTE_GROUP = TEXT_GROUP.querySelector(finderObject.fnGroup);
                }

                if (!NOTE_GROUP) return null;

                const isNumber = !NODE_ID.includes("un");


                return {
                    NODE_ID,
                    NOTE_GROUP,
                    TEXT_GROUP,
                    curEl,
                    isNumber
                };
            }

            return null;
        } catch (err) {
            this.trackError('resolveNoteContext', err);
            return null;
        }
    }


    calculateNewIndex(fnGroup, Id_Prefix = 'fn') {
        /**
         * Extracts numbers from footnote labels and returns the next sequential number
         *
         * | `elm.textContent` | Extracted number |
         * | ----------------- | ---------------- |
         * | `11`              | `11`             |
         * | `(11)`            | `11`             |
         * | `[11.]`           | `11`             |
         * | `11.`             | `11`             |
         * | `*` or `†`        | `NaN` (ignored)  |
         */

        try {
            // Handle endnote/footnote content-type attribute
            var finalGroup = fnGroup;
            var attrValue = finalGroup.getAttribute("content-type") || finalGroup.getAttribute("book-part-type");

            // Only climb if no attribute value found and element has 'sec' class
            if (!attrValue && finalGroup.classList.contains("sec")) {
                var ancestor = finalGroup.closest("[content-type],[book-part-type]");
                if (ancestor) {
                    finalGroup = ancestor;
                    attrValue = ancestor.getAttribute("content-type") || ancestor.getAttribute("book-part-type");
                }
            }
            // Normalize and test for note types
            if (attrValue && /(endnote|end-note|footnote)/i.test(attrValue)) {
                if (fnGroup.querySelector(".label")) {
                    var labelEl = fnGroup.querySelector(".label");
                    var closestFn = labelEl && labelEl.closest(".fn");
                    var id = closestFn ? closestFn.id : '';
                    var find = `-${Id_Prefix}-`;
                    if (id.includes(find) == false && id.includes(`-fn-`) == true) {
                        Id_Prefix = "fn";
                    }
                }
            }

            const searchRoot = (!IS_JOURNAL && this._state.editorBody) ? this._state.editorBody : fnGroup;

            // ? Get all footnote label elements
            const selector = IS_JOURNAL ? `.fn[id*="${Id_Prefix}"] span.label` : `.fn[id] span.label`;
            const values = Array.from(searchRoot.querySelectorAll(selector))
                .filter(elm => {
                    const parentId = elm.closest('.fn').id || '';
                    return parentId.startsWith(Id_Prefix) || parentId.includes(`-${Id_Prefix}`);
                });

            // ? Extract only numbers from text content
            var onlyNum = values.map(elm => parseInt(elm.textContent.trim().replace(/[^\d]/g, ''), 10))
                .filter(num => !isNaN(num));

            // ? Extract sequence numbers from IDs
            var onlySeqID = values.map(elm => {
                    const parentId = elm.closest('.fn').id || '';
                    const suffix = parentId.match(/(\d+)$/);
                    return suffix ? parseInt(suffix[1], 10) : NaN;
                })
                .filter(num => !isNaN(num));

            // ? Get full label text
            const fullLabel = values.map(elm => elm.textContent.trim())
                .filter(text => !isNaN(parseFloat(text)));

            // ? Return next sequential number
            return {
                labels: fullLabel,
                indexVal: onlyNum.length > 0 ? Math.max(...onlyNum) + 1 : 1,
                IdSeq: onlySeqID.length > 0 ? Math.max(...onlySeqID) + 1 : 1
            };

        } catch (err) {
            this.trackError('calculateNewIndex', err);
            return {
                labels: [],
                indexVal: 1,
                IdSeq: 1
            };
        }
    }


    insertCitation(id, lab, nType, uniqueNoteId = null) {

        const supFrag_Xref = this.GetTemplate("sup_a", {
            id: id,
            text: lab,
            "ref-type": nType,
            WITH_IN_INS_DOM: false,
            frag: true
        });
        supFrag_Xref.firstElementChild.removeAttribute("id");

        // Add unique ID as data attribute if provided
        if (uniqueNoteId) {
            const xrefEl = supFrag_Xref.firstElementChild;
            xrefEl.setAttribute('data-note-uid', uniqueNoteId);
        }

        GlobalEditor.insertHtml(supFrag_Xref.firstElementChild.outerHTML);

        // Set data-track-code on the newly inserted xref
        const trackCode = this.getTrackingCode({
            action: 'insert',
            nType
        });
        if (trackCode && this._state.editorBody) {
            const xref = this._state.editorBody.querySelector(`.xref[rid="${id}"]`);
            if (xref) {
                const targetEl = xref.closest('insert') || xref;
                targetEl.setAttribute('data-track-code', trackCode);
            }
        }
    }

    insertNoteEntry(fnGroup, _Id, lab, caption_Text, nType, labelsList, attr = {}, uniqueNoteId = null) {

        const {
            currentSelector,
            isBookEndNotes,
            contentType
        } = this._state;

        const hasTrailingDot = labelsList && labelsList.some(label => label.trim().endsWith('.'));

        if (hasTrailingDot && lab != null) {
            lab = String(lab).trim();
            if (!lab.endsWith('.')) {
                lab += '.';
            }
        }

        const NOTE_ENTRY = this.GetTemplate("entry", {
            id1: GENERATE_ID(),
            lab: lab,
            id: _Id,
            text: caption_Text,
            FIRST_INS_DOM: true,
            frag: true,
            dom: true,
            nType: nType
        });


        // Add unique persistent ID and other attributes
        const combinedAttr = Object.assign({}, attr, {
            "data-new": "s",
            ...(uniqueNoteId && {
                "data-note-uid": uniqueNoteId
            })
        });
        commonMethods.setAttr(NOTE_ENTRY, combinedAttr);

        // Set data-track-code on the inner insert mark
        const trackCode = this.getTrackingCode({
            action: 'insert',
            nType
        });
        const insertEl = NOTE_ENTRY.querySelector('insert');
        if (insertEl && trackCode) insertEl.setAttribute('data-track-code', trackCode);

        var finalizeEl = NOTE_ENTRY;
        if (isBookEndNotes && contentType == "endNotes") {
            var para = this.newElm("div", {
                setAtt: {
                    "class": "p",
                    "data-name": "p",
                    "data-role": "",
                    "data-enter-af": "yes",
                    "id": s4()
                }
            });
            if (para) {
                para.append(NOTE_ENTRY);
            }
            finalizeEl = para;
        }

        fnGroup.append(finalizeEl);
    }

    finalizeInsertion() {
        try {
            this._SNAPSHOT({
                save: true,
                unlock: true
            });
            if (typeof this.closeModule == "function") this.closeModule();
            else if (typeof this.closeDialog == "function") this.closeDialog();
            else this.Panel.classList.add("ds-none");

            this.refreshPanelDefault();

        } catch (err) {
            this.trackError('finalizeInsertion', err);
        }
    }




    updateMessage_Templates() {
        try {

        } catch (err) {
            this.trackError('updateMessage_Templates', err);
        }
    }

    /**
     * Checks if an ID with the given pattern and index exists, and returns the next available index if it does.
     * @param {number} index - The starting index to check
     * @param {string} pattern - The ID pattern prefix
     * @returns {number} - The next available index
     */
    checkIdExists(index, pattern, padWidth = 4) {
        const {
            isBookEndNotes,
            type
        } = this._state;
        var findRoot = (!IS_JOURNAL || (isBookEndNotes && type == "endnotes")) ? this._state.editorBody : EDITOR_CURSOR.CUR_CHAPTER;
        const formatIndex = (value) => String(value).padStart(padWidth, '0');
        const idExists = (candidateId) => findRoot && findRoot.querySelector(`[id="${CSS.escape(candidateId)}"]`);
        const transformedId = (value) => prefixLastNumericSegment(`${pattern}${formatIndex(value)}`);

        let currentIndex = index;
        let isExists = idExists(`${pattern}${currentIndex}`) || idExists(`${pattern}${formatIndex(currentIndex)}`) || idExists(transformedId(currentIndex));

        // Find the next available index
        while (isExists) {
            currentIndex++;
            isExists = idExists(`${pattern}${currentIndex}`) ||
                idExists(`${pattern}${formatIndex(currentIndex)}`) ||
                idExists(transformedId(currentIndex));
        }

        return currentIndex;
    }

    /**
     * Generates a unique ID based on the provided prefix and index
     * @param {string} prefix - The ID prefix
     * @param {number} index - The starting index
     * @returns {string} - A unique ID
     */
    generateUniqueId(prefix, index, padWidth = 4) {
        const nextAvailableIndex = this.checkIdExists(index, prefix, padWidth);
        return prefixLastNumericSegment(`${prefix}${String(nextAvailableIndex).padStart(padWidth, '0')}`);
    }

    booksBaseResults() {
        const {
            CUR_CHAPTER,
            CUR_CHAPTER_NO,
            CUR_CHAPTER_ID
        } = EDITOR_CURSOR;
        var baseIdResults = paraManager.findChapterByBaseId(CUR_CHAPTER_ID);

        return baseIdResults;
    }

    generateId(fnGroup, idPrefix, newIndex, IdSeq, nType, IsNumber) {
        var _rid = (idPrefix + (newIndex.toString().padStart(4, '0')));
        const lab = (IsNumber ? newIndex : '');

        var id = _rid;
        try {
            if (typeof IdGenerator !== 'undefined' && IdGenerator.forDocument) {
                const scope = (typeof EDITOR_CURSOR !== 'undefined' && EDITOR_CURSOR.CUR_CHAPTER) ||
                    (fnGroup && fnGroup.closest && fnGroup.closest('[data-name="book-part"], .book-part')) ||
                    (this._state && this._state.editorBody) ||
                    document.body;
                const dom = (typeof GlobalEditor !== 'undefined' && GlobalEditor.document && GlobalEditor.document.$) ||
                    document;
                const seq = !IS_JOURNAL ? (IdSeq != null ? IdSeq : newIndex) : newIndex;
                const result = IdGenerator.forDocument().nextId('fn', {
                    scope: scope,
                    dom: dom,
                    seq: seq
                });
                id = _rid = prefixLastNumericSegment(result.id);
                return {
                    id,
                    rid: _rid
                };
            }
        } catch (err) {
            console.warn(err && err.message);
            if (typeof ErrorLogTrace === 'function') {
                ErrorLogTrace('generateId', (err && (err.message || err.code)) || 'generateId');
            }
        }

        if (!IS_JOURNAL) {

            const {
                baseId,
                originalChapterNumber,
                prefix,
                endNotes_baseId
            } = this.booksBaseResults();

            if (this.isOHO || this.isOSO || this.isOXMEDO) {
                if (baseId) {
                    _rid = id = this.generateUniqueId(`${endNotes_baseId ? endNotes_baseId : baseId}-fn-`, IdSeq);
                } else {
                    var id = fnGroup.querySelector(".label").parentElement.id;
                    const regex = /(workid-[\w-]+book-part-\d+)/;
                    const match = id.match(regex);
                    // id = `${match[0]}-fn-${newIndex}`;
                    _rid = id = this.generateUniqueId(`${match[0]}-fn-`, newIndex);

                }
            } else if (this.isTNF) {
                if (paraManager && paraManager.baseId) {
                    _rid = id = this.generateUniqueId(`${paraManager.baseId}-${idPrefix}`, newIndex);
                } else {
                    var id = fnGroup.querySelector(".label").parentElement.id;
                    const regex = /^(book-part-\d+-en\d+)$/;
                    const match = id.match(regex);
                    if (match) {
                        _rid = id = this.generateUniqueId(`${match[0]}-${idPrefix}`, newIndex);
                    } else {
                        console.error(`ID does not match the expected pattern: ${id}`);
                    }
                }
            }
        }
        return {
            id,
            rid: _rid
        };
    }
    resolveNoteType(nType, fnGroup, editorBody) {
        var finalType;
        if (fnGroup) {

            const getFootNoteEntries = (node) => {
                return [...new Set(
                    [...node.querySelectorAll('[fn-type]:not([data-new])')]
                    .filter(el => !(IS_JOURNAL && el.closest('.author-notes')))
                    .map(el => el.getAttribute("fn-type"))
                    .filter(Boolean)
                )];
            };

            // 1️ Try fnGroup first
            let typeResults = getFootNoteEntries(fnGroup);

            // 2️ Fallback to full editor body if empty
            if (typeResults.length === 0) {
                typeResults = getFootNoteEntries(this._state.editorBody);
            }

            // 3️ Pick first value (or empty)
            const firstType = typeResults[0] || "";
            finalType = firstType || "";

        }

        return finalType;
    }

    FIRE_INSERT() {
        debug.log("inserting not trigger");
        if (window.paraLock && typeof window.paraLock._isElementLocked === "function") {
            const isLocked = window.paraLock._isElementLocked(IMPACT_SELECTION.NODE, {
                check_closest: true,
                alertKey: 'ErrorLockedParaEdit'
            });
            if (isLocked) return {
                success: false,
                reason: 'locked'
            };
        }

        this._SNAPSHOT({
            save: true,
            lock: true
        });

        try {

            function resolveFinalNoteGroup(ctx, bookEndNoteType1) {
                if (!ctx) return null;
                return bookEndNoteType1 ? ctx.INSERT_NOTE_GROUP : ctx.NOTE_GROUP;
            }


            const captionText = this.getSummerNoteContent();

            if (captionText.length < 3 || captionText === "<br>") {
                TOASTER_ALERT('empty_content', {
                    type: 'warning'
                });
                return {
                    success: false,
                    reason: 'empty_content'
                };
            }
            const {
                type,
                contentType,
                isBookEndNotes
            } = this._state;
            const isNumber = this.Panel.querySelector('#numberCheck').checked;
            const noteTypeKey = type;
            let idPrefix = (this.PrefixArr[noteTypeKey] && this.PrefixArr[noteTypeKey][isNumber]) || 'fn';
            let nType = this._collection.citeType || (IS_JOURNAL ? idPrefix : noteTypeKey.endsWith("s") ? noteTypeKey.slice(0, -1) : noteTypeKey);
            const bookEndNoteType1 = isBookEndNotes && contentType == "endnotes";

            const ctx = this.resolveNoteContext({
                mode: 'insert',
                idPrefix,
                nType,
                createIfMissing: true,
                isInsertCite: true
            });

            const FINAL_APPEND_GROUP = resolveFinalNoteGroup(ctx, bookEndNoteType1);

            if (!ctx || !FINAL_APPEND_GROUP) {
                debug.warn("No footnote group for type:", nType, "prefix:", idPrefix);
                return {
                    success: false,
                    reason: 'no_fn_group'
                };
            }

            const {
                is_root_exists,
                newIndex,
                IdSeq,
                labels,
                TEXT_GROUP,
                NOTE_GROUP
            } = ctx;

            const {
                id,
                rid
            } = this.generateId(NOTE_GROUP, idPrefix, newIndex, IdSeq, nType, isNumber);

            // Generate unique persistent ID for tracking
            const uniqueNoteId = `note-${Date.now()}-${s4()}`;

            const label = isNumber ? newIndex : "";

            const typeResults = this.resolveNoteType(nType, NOTE_GROUP, this._state.editorBody);
            if (typeResults && typeResults !== nType) nType = typeResults;

            debug.log("all set .. inserting was going on .... ");

            this.insertCitation(id, label, nType, uniqueNoteId);
            this.insertNoteEntry(FINAL_APPEND_GROUP, id, label, captionText, nType, labels, {}, uniqueNoteId);

            if (is_root_exists) {
                debug.log("renumbering triggering .... ");
                this.fireRenumber({
                    NOTE_GROUP,
                    NODE_ID: id,
                    DEL_ID: null,
                    TEXT_GROUP
                });
            }

            this.finalizeInsertion();

            return {
                success: true,
                id,
                NOTE_GROUP,
                inserted: true
            };
        } catch (err) {
            this.trackError('FIRE_INSERT', err);
            return {
                success: false,
                error: err
            };
        }
    }


    FIRE_DELETE(options = {}) {
        try {

            if (!this.AutoInitiated) this.init();
            if (!this._state.editorBody) this.showLoopSetUp();

            const nodeIds = Array.isArray(options.nodeIds) && options.nodeIds.length ?
                options.nodeIds :
                (options.NODE_ID ? [options.NODE_ID] : [null]);

            nodeIds.forEach(NODE_ID_OPTION => {
                const contextOptions = {
                    mode: 'delete',
                    ...options
                };

                if (NODE_ID_OPTION) contextOptions.NODE_ID = NODE_ID_OPTION;

                const rootInfo = this.resolveNoteContext(contextOptions);
                if (!rootInfo) return;

                const {
                    NODE_ID,
                    NOTE_GROUP,
                    TEXT_GROUP,
                    isNumber = true
                } = rootInfo;

                if (!NODE_ID || !NOTE_GROUP) return;

                const {
                    isCiteDelete,
                    isNoteDelete
                } = options;
                const result = this.deleteAll({
                    TEXT_GROUP,
                    NODE_ID,
                    NOTE_GROUP,
                    isCiteDelete,
                    isNoteDelete
                });

                if (isNumber && result.deletedCount > 0 && NOTE_GROUP.querySelectorAll(".fn").length >= 1) {
                    const addParams = {
                        ...options,
                        ...this._state
                    };
                    this.fireRenumber({
                        NOTE_GROUP: NOTE_GROUP,
                        DEL_ID: NODE_ID,
                        TEXT_GROUP: TEXT_GROUP,
                        addParams
                    });
                }

                if (!NOTE_GROUP.querySelector(".fn span.label") && IS_JOURNAL) {
                    NOTE_GROUP.remove();
                }
            });

        } catch (err) {
            this.trackError("FIRE_DELETE", err);
        }
    }


    refreshTooltipPanelAfterRenumber() {
        try {
            const updatedData = typeof GlobalEditor !== 'undefined' && GlobalEditor && typeof GlobalEditor.getData === 'function' ? GlobalEditor.getData() : '';
            const tooltip = window.TOOLTIP_MODULE;
            if (tooltip && typeof tooltip.forceRefreshPanel === 'function') {
                tooltip.forceRefreshPanel(updatedData);
                return;
            }
            if (tooltip && typeof tooltip.hide === 'function') tooltip.hide();
            if (tooltip && typeof tooltip.generateToolTip === 'function') tooltip.generateToolTip();
            if (
                typeof CitationNewModule !== 'undefined' &&
                CitationNewModule &&
                CitationNewModule.M_FUN &&
                typeof CitationNewModule.M_FUN.CreateCiteList === 'function'
            ) {
                CitationNewModule.M_FUN.CreateCiteList(updatedData, true);
            }
        } catch (err) {
            this.trackError('refreshTooltipPanelAfterRenumber', err);
        }
    }
    fireRenumber({
        NOTE_GROUP,
        DEL_ID,
        NODE_ID,
        TEXT_GROUP,
        addParams
    }) {
        try {
            debug.log('FIRE_RE_NUMBER');

            const collabEnabled = window.paraLock && window.paraLock._isEnabled;
            const lockedInfo = collabEnabled ? window.paraLock.getLockedElementsByOthers() : {
                byOthers: [],
                total: 0
            };

            if (lockedInfo.byOthers.length > 0) {
                // TOASTER_ALERT('ErrorReStoreForCollab', { type: 'warning' });
                return {
                    success: false,
                    reason: 'lockedByOthers'
                };
            }

            const preflightReport = this.reNumber.fireOnce(GlobalEditor, {
                checkOnly: true,
                cite_root: TEXT_GROUP,
                items_root: NOTE_GROUP,
                delId: DEL_ID
            }, addParams);
            const sequenceOnlyErrors = ['sequenceGap', 'sequenceDisorder', 'labelMismatch'];
            const blockingErrors = preflightReport && Array.isArray(preflightReport.errors) ?
                preflightReport.errors.filter(error => !sequenceOnlyErrors.includes(error.type)) : [{
                    type: 'checkFailed',
                    message: 'Renumber preflight did not return a validation report'
                }];

            if (blockingErrors.length > 0) {
                const report = preflightReport || {
                    valid: false,
                    errors: blockingErrors,
                    stats: {}
                };
                debug.warn('Notes renumber blocked by preflight validation', blockingErrors);
                return {
                    success: false,
                    reason: 'renumberPreflightFailed',
                    report
                };
            }

            this.reNumber.fireOnce(GlobalEditor, {
                reNumber: true,
                cite_root: TEXT_GROUP,
                items_root: NOTE_GROUP,
                delId: DEL_ID
            }, addParams);

            this.refreshTooltipPanelAfterRenumber();

            return {
                success: true
            };
        } catch (err) {
            this.trackError('FIRE_RE_NUMBER', err);
            return {
                success: false,
                error: err
            };
        }
    }

    /**
     * Read-only verification method that checks citation/note integrity without making any modifications.
     * Uses CheckOrder with checkOnly mode for DRY validation logic.
     * Checks ONE note type at a time. For multiple types, call separately per type.
     * 
     * NOTE - Journal Limitation: CheckOrder scans entire document for journals (ignores items_root).
     * On documents with BOTH footnotes AND endnotes, results may include cross-type entries.
     * For accurate results on mixed journals, check one type at a time and interpret carefully.
     * Books work correctly with proper chapter scoping.
     * 
     * @param {Object} options - Configuration options
     * @param {string} options.scope - 'journal' | 'book-chapter' | 'book-all' - what to scan
     * @param {string} options.nType - 'fn' | 'en' | 'footnote' | 'endnote' - which note type to check (single type only)
     * @returns {Object} - { valid: boolean, errors: Array, stats: Object }
     */
    FIRE_CHECK(options = {}) {
        try {
            const {
                scope = 'journal', nType = 'fn'
            } = options;

            // Resolve scope for this type
            const scopes = this._resolveRenumberScopesForType(nType, scope);
            if (!scopes) {
                return {
                    valid: false,
                    errors: [{
                        type: 'missingGroup',
                        nType: nType,
                        message: `No note group found for type: ${nType}`
                    }],
                    stats: {}
                };
            }

            const {
                cite_root,
                items_root
            } = scopes;
            const isEndnoteCheck = nType === 'en' || nType === 'endnote' || nType === 'end-note';

            // Configure CheckOrder for this note type
            // Save original config to restore after check
            const originalConfig = this.reNumber.currentConfig;
            this.reNumber.setCurrentConfig('fn');

            // Extend valid_role to include 'en' for endnote checks (items have data-name="fn" regardless)
            // Note: valid_role applies to citations (xref), items use data-name filtering
            if (isEndnoteCheck && this.reNumber.currentConfig) {
                const currentValidRole = this.reNumber.currentConfig.valid_role || [];
                if (!currentValidRole.includes('en')) {
                    // Clone to avoid mutating shared default_config
                    this.reNumber.currentConfig = {
                        ...this.reNumber.currentConfig,
                        valid_role: [...currentValidRole, 'en']
                    };
                }
            }

            // Use CheckOrder with checkOnly mode - reuses all existing validation logic
            // including proper book ID handling, deleted item exclusion, etc.
            let checkResult;
            try {
                checkResult = this.reNumber.fireOnce(GlobalEditor, {
                    checkOnly: true,
                    cite_root: cite_root,
                    items_root: items_root
                });
            } finally {
                // Restore original config to prevent affecting subsequent operations
                this.reNumber.currentConfig = originalConfig;
            }

            // Handle fireOnce failure (returns undefined on error)
            if (!checkResult) {
                return {
                    valid: false,
                    errors: [{
                        type: 'checkFailed',
                        nType: nType,
                        message: `CheckOrder scan failed for type: ${nType}`
                    }],
                    stats: {}
                };
            }

            // For journals: CheckOrder scans all, so we need to interpret results carefully
            // The scan includes both fn and en, but valid_role filtering helps
            // Return the checkResult directly - caller interprets based on nType
            return {
                valid: checkResult.valid,
                errors: checkResult.errors || [],
                stats: checkResult.stats || {}
            };
        } catch (err) {
            this.trackError('FIRE_CHECK', err);
            return {
                valid: false,
                errors: [{
                    type: 'error',
                    message: err.message
                }],
                stats: {}
            };
        }
    }

    /**
     * Resolve renumber scopes for a specific note type and scope.
     * Helper for FIRE_CHECK to align with existing scope resolution logic.
     * @private
     */
    _resolveRenumberScopesForType(nType, scope) {
        const {
            isBookEndNotes
        } = this._state;
        const chapter = EDITOR_CURSOR && EDITOR_CURSOR.CUR_CHAPTER;

        // Get NOTE_GROUP for this type
        const {
            NOTE_GROUP,
            TEXT_GROUP
        } = this._findFnGroup({
            nType,
            createIfMissing: false
        });
        if (!NOTE_GROUP) return null;

        // Align TEXT_GROUP with scope
        let citeRoot;
        if (scope === 'journal') {
            citeRoot = this._state.editorBody;
        } else if (scope === 'book-chapter') {
            citeRoot = chapter || this._state.editorBody;
        } else {
            citeRoot = this._state.editorBody;
        }

        // Book endnotes: citations in chapter, items in book-back
        // nType can be 'fn', 'en', 'endnote', 'footnote' - check for endnote variants
        const isEndnoteType = nType === 'en' || nType === 'endnote' || nType === 'end-note';
        if (!IS_JOURNAL && isBookEndNotes && isEndnoteType) {
            citeRoot = chapter || citeRoot;
        }

        return {
            cite_root: citeRoot,
            items_root: NOTE_GROUP
        };
    }

}

export default NotesGroupModule;