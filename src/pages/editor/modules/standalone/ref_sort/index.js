// <div class="mDialog ds-none wo-editor-access" id="RefSortingDialog">

class RefSortingModule extends BaseModule {
    constructor(name, errorTracker, options = {}) {
        super(name, errorTracker, options);
        this.initializeProperties();
        this.bindMethods();
        this.initiated = true;
    }

    initializeProperties() {
        this.templateList = {};
        this.canUnmountComponentWhileClose = true;
        this.PrefixArr = {};
        this.formatter = new RangeFormatter({});
        // this.reNumber = new CheckOrder("fn");
        this.TOASTER_MESSAGE = {
            ref_sort_error: {
                text: "Failed to re-order the references list. Please provide your corrections using the comments feature in the pop-up text box open behind this window."
            },
            ref_sort_success: {
                text: "The references list has been re-ordered successfully."
            },
            ref_sort_nochange: {
                text: "The reference list is already sorted. Reordering may not be necessary."
            },
        };
        // { [refId]: 'auto' | 'manual' }
        this.SORT_TRACKER = {};
        this.ORIGINAL_INFO = {};
    }

    bindMethods() {
        const methodsToBind = ['AssignVar_EventLoop', 'initLoop', 'showLoop', 'FIRE_MANUAL_SORT', 'FIRE_AUTO_SORTING', 'FIRE_UPDATE'];
        methodsToBind.forEach(method => {
            if (this[method])
                this[method] = this[method].bind(this);
            else debug.log("method missing", method, this._id);
        });

    }
    AssignVar_EventLoop() {
        try {
            const KEY_WITH_ID = {
                PANEL_BODY: ".dialog-body",
                LIST_ROOT: "#REF_LIST_SORT",
                SUBMIT_BTN: ".submit_btn",
                AUTO_SORT: "#auto_sort_btn"
            };

            Object.entries(KEY_WITH_ID).forEach(([key, value]) => {
                this.elements[key] = this.Panel.querySelector(value);
            });
            this.elements.SUBMIT_BTN.onclick = this.FIRE_UPDATE;
            this.elements.AUTO_SORT.onclick = this.FIRE_AUTO_SORTING;

        } catch (err) {
            this.trackError('AssignVar_EventLoop', err);
        }
    }

    initLoop() {
        try {
            this.AutoInitiated = true;
            this.M_CONFIG.SHOW_CONTEXT_GROUP = IsContextMenu('REF_SORT_DIALOG');

            this.FullyLoaded = true;

            this.IMS = IMPACT_SELECTION;
            this.FINDER = 'div.ref-list';
            this.refRoot = this.RESOLVE_REF_ROOT();
            if (ALERT_MESSAGE) {
                Object.assign(ALERT_MESSAGE, this.TOASTER_MESSAGE);
            }
            // New logic: Get cloned original and fetch file
            // this.FETCH_ORIGINAL_CLONE();

            // const OBJ = this.G_FUN.GET_CONFIG_ITEM("notes", {
            //     CONVERT_JSON: true,
            //     children: true,
            //     attr: true,
            //     hex2string: true,
            //     keyUpperCase: false,
            //     fromTemplate: true
            // });
            Object.assign(this.templateList, {
                spinner: `<div class="spinner-border iSpin_border" role="status" id="bodySpinner" aria-label="Processing"></div>`
            });

            this.SETUP_ORIGINAL_FILE_URL();
        } catch (err) {
            this.trackError('InitLoop', err);
        }
    }

    RESOLVE_REF_ROOT(rootDom = null) {
        try {
            const IMS = this.IMS || IMPACT_SELECTION || {};
            const EC = typeof EDITOR_CURSOR !== 'undefined' ? EDITOR_CURSOR : {};
            const documentRefList = GlobalEditor.document.findOne(this.FINDER) ? GlobalEditor.document.findOne(this.FINDER).$ : null;
            const selectedNode = IMS.NODE ? (IMS.NODE.$ || IMS.NODE) : null;
            const selectedRefList = selectedNode && selectedNode.closest ? selectedNode.closest(this.FINDER) : null;
            let refList = null;

            if (typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL) {
                return this.RESOLVE_SORTABLE_REF_LIST(documentRefList);
            }

            if (rootDom) {
                refList = rootDom.matches && rootDom.matches(this.FINDER) ? rootDom : rootDom.querySelector(this.FINDER);
                return this.RESOLVE_SORTABLE_REF_LIST(refList);
            }

            if (EC.CUR_CHAPTER) {
                if (selectedRefList && EC.CUR_CHAPTER.contains(selectedRefList)) {
                    refList = selectedRefList;
                } else {
                    refList = EC.CUR_CHAPTER.querySelector(this.FINDER);
                }
                return this.RESOLVE_SORTABLE_REF_LIST(refList);
            }

            if (selectedRefList) {
                return this.RESOLVE_SORTABLE_REF_LIST(selectedRefList);
            }

            return this.RESOLVE_SORTABLE_REF_LIST(documentRefList);
        } catch (err) {
            this.trackError('RESOLVE_REF_ROOT', err);
            return GlobalEditor.document.findOne(this.FINDER).$;
        }
    }

    RESOLVE_SORTABLE_REF_LIST(refList) {
        try {
            if (!refList) return null;

            if (this.GET_DIRECT_REFS(refList).length > 0) {
                return refList;
            }

            const selectedNode = this.IMS && this.IMS.NODE ? (this.IMS.NODE.$ || this.IMS.NODE) : null;
            const selectedRef = selectedNode && selectedNode.closest ? selectedNode.closest('div.ref') : null;
            const selectedChildList = selectedRef && selectedRef.closest ? selectedRef.closest(this.FINDER) : null;
            if (selectedChildList && refList.contains(selectedChildList) && this.GET_DIRECT_REFS(selectedChildList).length > 0) {
                return selectedChildList;
            }

            return Array.from(refList.querySelectorAll(this.FINDER)).find(list => this.GET_DIRECT_REFS(list).length > 0) || refList;
        } catch (err) {
            this.trackError('RESOLVE_SORTABLE_REF_LIST', err);
            return refList;
        }
    }

    GET_DIRECT_REFS(refList) {
        try {
            return Array.from(refList ? refList.children : []).filter(el => el.matches && el.matches('div.ref'));
        } catch (err) {
            this.trackError('GET_DIRECT_REFS', err);
            return [];
        }
    }

    ENSURE_PARENT_ID(parentRefList, fallbackIndex = 0) {
        try {
            if (!parentRefList) return '';

            let parentId = parentRefList.id || parentRefList.getAttribute('data-id') || '';
            if (!parentId) {
                parentId = `ref-list-${Date.now()}-${fallbackIndex}`;
                parentRefList.setAttribute('data-id', parentId);
            }
            return parentId;
        } catch (err) {
            this.trackError('ENSURE_PARENT_ID', err);
            return '';
        }
    }

    FIND_REF_LIST_BY_PARENT_ID(parentId) {
        try {
            if (!parentId) return this.refRoot;

            const allRefLists = Array.from(GlobalEditor.document.$.querySelectorAll(this.FINDER));
            return allRefLists.find(list => list.id === parentId || list.getAttribute('data-id') === parentId) || this.refRoot;
        } catch (err) {
            this.trackError('FIND_REF_LIST_BY_PARENT_ID', err);
            return this.refRoot;
        }
    }

    GET_PANEL_ITEMS() {
        try {
            return Array.from(this.Panel.querySelectorAll('#REF_LIST_SORT .sort-item'));
        } catch (err) {
            this.trackError('GET_PANEL_ITEMS', err);
            return [];
        }
    }

    GET_PANEL_ORDER() {
        return this.GET_PANEL_ITEMS().map(el => el.getAttribute('ref-id')).filter(id => id);
    }
    /**
     * Setup original file URL for reference index checking only
     */
    SETUP_ORIGINAL_FILE_URL() {
        try {
            // Automatically targets the current page's query parameters
            const urlParams = new URLSearchParams(window.location.search);

            // Get the specific 'docid' value
            const docId = urlParams.get('docid') || DOC_ID;
            const BUCKET_URL = window.BUCKET_URL || '';

            if (docId && BUCKET_URL) {
                this.ORIGINAL_FILE_URL = BUCKET_URL + docId + "/" + docId + '.html';
                console.log('Original file URL set for reference checking:', this.ORIGINAL_FILE_URL);
            } else {
                console.warn('Missing DOC_ID or BUCKET_URL for original file URL');
                this.ORIGINAL_FILE_URL = null;
            }

            this.FETCH_ORIGINAL_REF_ORDER();

        } catch (err) {
            console.warn('Failed to setup original file URL:', err.message);
            this.ORIGINAL_FILE_URL = null;
        }
    }

    /**
     * Fetch original reference order for comparison only
     */
    async FETCH_ORIGINAL_REF_ORDER() {
        try {
            if (!this.ORIGINAL_FILE_URL) {
                console.warn('No original file URL available');
            }

            const response = await fetch(this.ORIGINAL_FILE_URL);

            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }

            const htmlContent = await response.text();

            // Create temporary element to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            // Find reference list
            const refList = this.RESOLVE_SORTABLE_REF_LIST(tempDiv.querySelector(this.FINDER));
            if (!refList) {
                console.warn('Reference list not found in original file');
            }

            // Extract reference IDs in original order
            const originalRefIds = this.GET_DIRECT_REFS(refList)
                .map(el => this.GET_RID(el))
                .filter(id => id);

            console.log('Original reference order fetched:', originalRefIds.length, 'references');

            this.ORIGINAL_INFO = {
                DOM: tempDiv.cloneNode(true),
                LIST: refList,
                IDS: originalRefIds
            };

        } catch (err) {
            console.warn('Failed to fetch original reference order:', err.message);
            return [];
        }
    }

    showLoop() {
        try {

            if (window.paraLock && window.paraLock.getLockedElementsByOthers) {
                const lockedInfo = window.paraLock.getLockedElementsByOthers();
                if (lockedInfo.byOthers.length > 0) {
                    TOASTER_ALERT('ErrorReStoreForCollab', {
                        type: 'warning'
                    });
                    return;
                }
            }

            this.SORT_TRACKER = {};
            this.instance = {};
            // Append Spinner
            const body = this.Panel.querySelector(".dialog-body");
            if (body && !body.querySelector("#bodySpinner")) {
                // body.insertAdjacentHTML("beforeend", this.templateList.spinner);
            }
            this.AssignVar_EventLoop();

            // Wait a tick so spinner renders
            setTimeout(() => {
                // This updates the list
                this.SHOW_LIST_DIALOG();
                this.DRAG_DROP_EVT_BIND();

                // Remove Spinner after list is rendered
                const spinner = body.querySelector("#bodySpinner");
                if (spinner) spinner.remove();

            }, 100);
            this._SNAPSHOT({
                lock: true,
                save: true
            });
        } catch (err) {
            this.trackError('ShowLoop', err);
        }
    }

    DRAG_DROP_EVT_BIND() {
        var $this = this;
        Sortable.create(document.getElementById('REF_LIST_SORT'), {
            // ? basic
            group: 'REF_LIST_SORT',
            animation: 100,
            ghostClass: 'impact-background-class',
            // ? Scroll start
            scroll: true,
            forceAutoscrollFallback: false,
            scrollSensitivity: 30,
            scrollSpeed: 10,
            bubbleScroll: true,
            filter: '.filtered',
            // ? Scroll end
            // ? Multi Drag
            // multiDrag: true, // Enable multi-drag
            // selectedClass: 'selected', // The class applied to the selected items
            // fallbackTolerance: 3, // So that we can select items on mobile
            //?  Enable swap plugin
            // swap: true, 
            // swapClass: 'highlight', // The class applied to the hovered swap item
            // Element is chosen
            onChoose: function( /**Event*/ evt) {
                // element index within parent
                evt.oldIndex;
                //console.log(evt.oldIndex);
            },
            // Element is unchosen
            onUnchoose: function( /**Event*/ evt) {
                // same properties as onEnd
            },
            // Element dragging started
            onStart: function( /**Event*/ evt) {
                // element index within parent
                evt.oldIndex;
                //console.log(evt.oldIndex);
            },
            // Element dragging ended
            onEnd: function( /**Event*/ evt) {
                // dragged HTMLElement
                var itemEl = evt.item;
                // target list
                evt.to;
                // previous list
                evt.from;
                // element's old index within old parent
                evt.oldIndex;
                // element's new index within new parent
                evt.newIndex;
                // element's old index within old parent, only counting draggable elements
                evt.oldDraggableIndex;
                // element's new index within new parent, only counting draggable elements
                evt.newDraggableIndex;
                // the clone element
                evt.clone;
                // when item is in another sortable: `"clone"` if cloning, `true` if moving
                evt.pullMode;
                //console.log('==> onEnd==> '+evt.oldIndex,evt.newIndex);
                // console.log(evt.oldDraggableIndex,evt.newDraggableIndex);

                // ?  handle drag after apply css based on css
                /* if (itemEl.hasAttribute('data-old-index')) {
                    itemEl.classList[itemEl.getAttribute('data-old-index') != evt.newIndex ? 'add' : 'remove']('drag');
                } else {
                    itemEl.setAttribute('data-old-index', evt.oldIndex);
                    itemEl.classList.add('drag');
                }
                if (itemEl.parentElement) {
                    Array.from(itemEl.parentElement.children).forEach((el) => {
                        newIdArr.push(el.getAttribute('ref-id'));
                    });
                } */

                $this.FIRE_MANUAL_SORT(evt);
            },
            // Changed sorting within list
            onUpdate: function( /**Event*/ evt) {
                // same properties as onEnd

                //console.log('==> onUpdate');
            },
            onSort: function( /**Event*/ evt) {
                // same properties as onEnd
            },
            // Attempt to drag a filtered element
            onFilter: function( /**Event*/ evt) {
                // HTMLElement receiving the `mousedown|tapstart` event.
                var itemEl = evt.item;
            },
            // Event when you move an item in the list or between lists
            onMove: function( /**Event*/ evt, /**Event*/ originalEvent) {
                // Example: https://jsbin.com/nawahef/edit?js,output
                // dragged HTMLElement
                evt.dragged;
                // DOMRect {left, top, right, bottom}
                evt.draggedRect;
                // HTMLElement on which have guided
                evt.related;
                // DOMRect
                evt.relatedRect;
                // Boolean that is true if Sortable will insert drag element after target by default
                evt.willInsertAfter;
                // mouse position
                originalEvent.clientY;
                // return false; — for cancel
                // return -1; — insert before target
                // return 1; — insert after target
                // return true; — keep default insertion point based on the direction
                // return void; — keep default insertion point based on the direction
            },
            // Called when dragging element changes position
            onChange: function( /**Event*/ evt) {
                // most likely why this event is used is to get the dragging element's current index
                var ee = evt.newIndex;
                // same properties as onEnd
            }
        });
    }


    SHOW_LIST_DIALOG() {
        const {
            LIST_ROOT
        } = this.elements;
        try {
            this.refRoot = this.RESOLVE_REF_ROOT();
            const parentId = this.ENSURE_PARENT_ID(this.refRoot);
            const itemsRefs = this.GET_DIRECT_REFS(this.refRoot);
            const currentEditorOrder = itemsRefs.map(el => this.GET_RID(el));

            // Build parent container mapping for each reference
            const refParentMap = {};

            const itemsListStrings = itemsRefs.map((el, index) => {
                const isDeleted = el.hasAttribute('data-remove');
                const isNew = el.hasAttribute('data-new');
                const id = this.GET_RID(el);
                const txtValue = stripHtmlText(getTxt(el.querySelector(GENERATE.getAttribute('refCap'))));
                const trimTxt = getWordsCap(txtValue, 'CrossCitation');

                refParentMap[id] = parentId;

                return `<div class="sort-item ${isNew ? 'new' : (isDeleted ? 'bg-danger filtered' : '')}" ref-id="${id}" data-orig-idx="${index}" data-current-idx="${index}" data-parent-id="${parentId}">${trimTxt}</div>`;
            });


            this.instance = {
                currentEditorList: itemsRefs,
                currentEditorOrder,
                refShowString: itemsListStrings,
                originalOrder: this.ORIGINAL_INFO.IDS || [],
                refParentMap,
                parentId
            };

            $(LIST_ROOT).html("").append(this.GetFragment(itemsListStrings.join('')));
        } catch (error) {
            this.trackError('SHOW_LIST_DIALOG', error);
        }
    }

    GET_RID(el, Options = {}) {
        try {
            return el.getAttribute(el.hasAttribute('del_id') ? 'del_id' : 'id');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_RID', err.message);
        }
    }

    /**
     * Common method for both manual and auto sorting - just reorder existing DOM elements
     * @param {Array} newOrder - Array of reference IDs in new order
     * @param {Object} sortTracker - Object mapping ref IDs to sort modes
     */
    APPLY_SORT_ORDER(newOrder, sortTracker = {}) {
        debug.log("-APPLY_SORT_ORDER-", Object.keys(sortTracker).length, "tracked changes");

        const {
            LIST_ROOT
        } = this.elements;
        const {
            refList
        } = this.instance;

        try {
            // Update sort tracker
            Object.assign(this.SORT_TRACKER, sortTracker);

            // Get the container element
            // Fallback to LIST_ROOT
            const container = this.Panel.querySelector("#REF_LIST_SORT") || LIST_ROOT;

            // Reorder existing DOM elements based on newOrder
            newOrder.forEach((id) => {
                const sortItem = this.Panel.querySelector(`[ref-id="${id}"]`);
                if (sortItem && container) {
                    // Move element to end in new order
                    container.appendChild(sortItem);
                }
            });
            this.GET_PANEL_ITEMS().forEach((el, index) => el.setAttribute('data-current-idx', index));

            // // Update collection state
            // const itemsRefs = Array.from(this.refRoot.querySelectorAll("div.ref"));
            // this.instance.currentEditorOrder = newOrder;
            // this.instance.currentEditorList = itemsRefs;
        } catch (err) {
            this.trackError('APPLY_SORT_ORDER', err);
        }
    }

    APPLY_SORT_WITH_TRACKING_UI(newOrder, sortMode = 'manual', draggedItem = null, significantMoveThreshold = 2) {
        const {
            currentEditorOrder
        } = this.instance;
        const isManualSort = sortMode === "manual";
        // Track processed swap pairs
        const processedSwaps = new Set();

        newOrder.forEach((id, newIndex) => {
            const panelRef = this.Panel.querySelector(`[ref-id="${id}"]`);
            const originalIndex = panelRef ? parseInt(panelRef.getAttribute('data-orig-idx')) : currentEditorOrder.indexOf(id);
            if (originalIndex !== newIndex) {
                this.SORT_TRACKER[id] = sortMode;

                // Update DOM element
                if (panelRef) {
                    panelRef.setAttribute('data-order', sortMode);

                    // Track sort mode for reference
                    if (isManualSort) {
                        if (draggedItem && panelRef === draggedItem) {
                            if (!draggedItem.hasAttribute('data-old-index')) {
                                draggedItem.setAttribute('data-old-index', originalIndex);
                            }
                            // Add visual feedback only if actually moved
                            if (originalIndex !== newIndex) {
                                draggedItem.classList.add('manual-sort');
                            }
                        }
                    } else {
                        // Auto-sort: Add visual feedback to items that actually changed position
                        const moveDistance = Math.abs(originalIndex - newIndex);
                        if (moveDistance > 0 && panelRef) {
                            // Check if this is a simple swap - only highlight one of the pair
                            const swapPartner = currentEditorOrder[newIndex];
                            const swapPartnerNewIndex = newOrder.indexOf(swapPartner);
                            const isSimpleSwap = swapPartnerNewIndex === originalIndex && moveDistance === 1;

                            if (isSimpleSwap) {
                                const swapKey = [id, swapPartner].sort().join('-');
                                if (!processedSwaps.has(swapKey)) {
                                    processedSwaps.add(swapKey);
                                    panelRef.classList.add('auto-sort');
                                }
                            } else if (moveDistance >= significantMoveThreshold) {
                                panelRef.classList.add('auto-sort');
                            }
                        }
                    }
                }
            }
        });

        if (!isManualSort) {
            // Apply the new order using existing method
            this.APPLY_SORT_ORDER(newOrder, this.SORT_TRACKER);
        }

        this.GET_PANEL_ITEMS().forEach((el, index) => el.setAttribute('data-current-idx', index));
        // const itemsRefs = Array.from(this.Panel.querySelectorAll("div.ref"));
        this.instance.currentEditorOrder = newOrder;
        // this.instance.currentEditorList = itemsRefs;
    }

    /** 
     * Simplified auto sort with configurable threshold
     */
    FIRE_AUTO_SORTING(significantMoveThreshold = 3) {
        debug.log("-FIRE_AUTO_SORTING-");

        try {
            const {
                currentEditorOrder
            } = this.instance;

            // Get sorted order using Citation class
            const citation = new namedCitation(currentEditorOrder);
            const sortedIds = citation.ALPHA_ASCEND.map(x => x.rid);

            // Apply with auto tracking - only highlight significant moves
            this.APPLY_SORT_WITH_TRACKING_UI(sortedIds, 'auto', null, significantMoveThreshold);

        } catch (err) {
            this.trackError('FIRE_AUTO_SORTING', err);
        }
    }

    /**
     * Simplified manual sort
     */
    FIRE_MANUAL_SORT(evt) {
        debug.log("-FIRE_MANUAL_SORT-");

        try {
            const itemEl = evt.item;
            const parentEl = itemEl.parentElement;

            if (!parentEl) return;

            // Get new order from DOM
            const newOrder = Array.from(parentEl.children)
                .filter(el => el.classList && el.classList.contains('sort-item'))
                .map(el => el.getAttribute('ref-id'));

            // Apply with manual tracking
            this.APPLY_SORT_WITH_TRACKING_UI(newOrder, 'manual', itemEl);

        } catch (err) {
            this.trackError('FIRE_MANUAL_SORT', err);
        }
    }


    FIRE_UPDATE() {
        debug.log("--FIRE_UPDATE--");
        try {
            // Check if anything changed by comparing each element's data-orig-idx vs current position
            const panelItems = this.GET_PANEL_ITEMS();
            const hasChanged = Array.from(panelItems).some((el, idx) => {
                const origIdx = parseInt(el.getAttribute('data-orig-idx'));
                return origIdx !== idx;
            });
            if (!hasChanged) {
                TOASTER_ALERT('ref_sort_nochange');
                return;
            }

            // Track modes used
            let usedModes = new Set();
            let self = this;
            const groupedOrder = {};

            panelItems.forEach((panelElm, newIndex) => {
                const parentId = panelElm.getAttribute('data-parent-id') || self.instance.parentId || '';
                if (!groupedOrder[parentId]) groupedOrder[parentId] = [];
                panelElm.setAttribute('data-current-idx', newIndex);
                groupedOrder[parentId].push({
                    id: panelElm.getAttribute('ref-id'),
                    newIndex,
                    panelElm
                });
            });

            // Reorder reference elements in editor, grouped by original parent .ref-list
            Object.entries(groupedOrder).forEach(([parentId, refs]) => {
                const targetContainer = self.FIND_REF_LIST_BY_PARENT_ID(parentId);
                refs.forEach(({
                    id,
                    newIndex,
                    panelElm
                }) => {
                    const elements = self.editor.document.find(`[id="${id}"],[del_id="${id}"]`).toArray();

                    elements.forEach((ref, ind) => {
                        if (!ref) return;

                        // Move element to the appropriate parent container
                        targetContainer.appendChild(ref.$);

                        // If it's a deleted element, just append and skip
                        if (ref.hasAttribute("del_id")) {
                            return;
                        }

                        const mode = self.SORT_TRACKER[id] || '';
                        const originalIndex = panelElm ? parseInt(panelElm.getAttribute('data-orig-idx')) : newIndex;
                        const isNew = ref.hasAttribute('data-new');

                        const isSameIndexOriginal = originalIndex === newIndex;

                        const isDragged = panelElm && panelElm.hasAttribute("data-old-index");

                        if (!isSameIndexOriginal && !isNew && isDragged) {
                            // ref.setAttribute('data-sort', mode);
                            usedModes.add(mode);
                            // Add tracking code for reordered reference (ref-sort-01)
                            ref.setAttribute('data-track-code', 'ref-sort-01');

                        } else {
                            ref.removeAttribute('data-sort');
                        }
                    });
                });
            });
            self.instance.currentEditorOrder = panelItems.map(el => el.getAttribute('ref-id'));

            // Show success alert
            let modeText = [...usedModes].map(m => m === 'auto' ? 'Automatically' : 'Manually').join(' & ');
            if (modeText) {
                // Swal.fire({
                //     icon: 'success',
                //     title: 'References Reordered',
                //     text: `Sorting applied: ${modeText}`,
                //     timer: 2000,
                //     showConfirmButton: false
                // });
                debug.log(modeText);
            }
            TOASTER_ALERT('ref_sort_success');
        } catch (err) {
            TOASTER_ALERT('ref_sort_error');
            this.trackError('FIRE_UPDATE', err);
            if (typeof queryDialog != "undefined") {
                this.closeDialog();
                window.queryDialog.open(null, "comment");
            }
        } finally {
            this.closeDialog();
            this._SNAPSHOT({
                unlock: true,
                save: true
            });
        }
    }

    FIRE_REVERT_ORDER() {
        debug.log("-FIRE_REVERT_ORDER-");
        const {
            LIST_ROOT
        } = this.elements;
        const from_original_Ids = this.instance.originalOrder;
        const refMap = Object.fromEntries(this.instance.currentEditorList.map(el => [this.GET_RID(el), el]));

        const configText = GENERATE.getAttribute('refCap');
        const parentId = this.instance.parentId || this.ENSURE_PARENT_ID(this.refRoot);
        const list = from_original_Ids.map((id, index) => {
            const el = refMap[id];
            const isDeleted = el.hasAttribute('data-remove');
            const isNew = el.hasAttribute('data-new');
            const txtValue = stripHtmlText(getTxt(el.querySelector(configText)));
            const trimTxt = getWordsCap(txtValue, 'CrossCitation');

            el.removeAttribute('data-order');
            el.classList.remove('manual-sort', 'auto-sort');
            delete this.SORT_TRACKER[id];

            return `<div class="sort-item ${isNew ? 'new' : (isDeleted ? 'bg-danger filtered' : '')}" ref-id="${id}" data-orig-idx="${index}" data-current-idx="${index}" data-parent-id="${parentId}">${trimTxt}</div>`;
        });

        this.instance.refIds = from_original_Ids;
        this.instance.currentEditorOrder = from_original_Ids;
        this.instance.currentEditorList = from_original_Ids.map(id => refMap[id]);
        this.instance.refShowString = list;

        $(LIST_ROOT).html("").append(this.GetFragment(list.join('')));
    }

}


export default RefSortingModule;