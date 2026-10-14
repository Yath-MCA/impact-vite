/**
 * Navigation + scroll-spy synchronization module.
 *
 * Owns bidirectional sync between:
 * - CKEditor scroll/caret context
 * - TOC/Floats panel
 * - PDF section
 * - PDF thumbnail section
 * - PDF prev/next/page input controls
 *
 * Event Flow:
 * 1. User action (editor scroll, TOC click, thumbnail click, PDF control click)
 * 2. `postNavigation(...)` delegates to `EDITOR_NAV_SYNC.navigate(...)`
 * 3. Resolve target element/id -> derive page id from map/index
 * 4. Sync PDF view + thumbnail + page controls
 * 5. Focus editor target (when applicable)
 * 6. Sync TOC/floats active state
 *
 * Debug:
 * - Enable: `window.EDITOR_NAV_SYNC_DEBUG = true`
 * - Disable: `window.EDITOR_NAV_SYNC_DEBUG = false`
 *
 * Smoke Test:
 * - Run `window.runEditorNavSyncSmokeTest()` in browser console.
 */


$(document)
    .on('mouseenter mouseleave', "#toc_list li>span, #lof_list li>span", function (e) {

        $(this).toggleClass('hover');
    }).ready(function (e) {
        if (IS_TRACK_VIEW) {
            return;
        }
        $(document).on('click', '.lof-items[title][id]', function (e) {
            try {
                // Nested float/supp rows use inline postNavigation — skip section toggle.
                if ($(e.target).closest('ul.nested span.impact[data-id]').length) {
                    return;
                }

                let tar = $(e.target).hasClass('impact') ? (e.target) : ($(e.target).parents('span.impact')[0]);
                if (!tar) return debug.log("target missing");

                let next = null;
                let floatTemp = null;
                let IsNextActive = false;
                // if($(e.target).hasClass('impact')){tar = e.target;}else {tar = $(e.target).parents('span.impact')[0];}
                next = tar[tar.nextElementSibling ? 'nextElementSibling' : 'previousElementSibling'];
                floatTemp = tar.querySelector('.FloatsCount');

                if (next && floatTemp) {
                    if (parseInt(floatTemp.textContent)) {
                        IsNextActive = next.classList.contains('active') ? true : false;
                        next.classList[IsNextActive ? ('remove') : ('add')]('active');
                        let span = next.parentElement.querySelector('span.fa');
                        let li = next.parentElement.querySelector('li');
                        //if(li) li.scrollIntoView(true);//?Commended by Durai for scroll unwanted
                        if (span && li) {
                            span.className = `fa fa-angle-${IsNextActive ? 'right' : 'down'}`;
                            // ? 01-SEP-22 SIVA UPDATE YA
                            let root_div = li.closest('.nested');
                            if (root_div && !root_div.querySelector('span.active')) {
                                li.querySelector('span').click();
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('lof_items_click', err.message);
            }
        });
    });

function _postNav_ResolveElementAndId(curElm, Area, myEleId) {
    if (!window.EDITOR_NAV_SYNC || typeof window.EDITOR_NAV_SYNC.resolveElementAndId !== 'function') {
        return {
            curElm: curElm,
            myEleId: myEleId,
            IsFront: false,
            IsQuery: false,
            Temp_Id: "",
            IsEditorClick: ('editor' == Area)
        };
    }
    return window.EDITOR_NAV_SYNC.resolveElementAndId(curElm, Area, myEleId);
}

function _postNav_SyncPDFAndView(resolved, Area) {
    if (!window.EDITOR_NAV_SYNC || typeof window.EDITOR_NAV_SYNC.syncPDFAndView !== 'function') return;
    window.EDITOR_NAV_SYNC.syncPDFAndView(resolved, Area);
}

function _postNav_HandleEditorFocus(resolved, Area) {
    if (!window.EDITOR_NAV_SYNC || typeof window.EDITOR_NAV_SYNC.handleEditorFocus !== 'function') return;
    window.EDITOR_NAV_SYNC.handleEditorFocus(resolved, Area);
}

function _postNav_ResolveTocId(resolved, Area) {
    if (!window.EDITOR_NAV_SYNC || typeof window.EDITOR_NAV_SYNC.resolveTocId !== 'function') return resolved ? resolved.myEleId : null;
    return window.EDITOR_NAV_SYNC.resolveTocId(resolved, Area);
}

function _postNav_UpdateTocUi(myEleId, IsFront, Area) {
    if (!window.EDITOR_NAV_SYNC || typeof window.EDITOR_NAV_SYNC.updateTocUi !== 'function') return;
    window.EDITOR_NAV_SYNC.updateTocUi(myEleId, IsFront, Area);
}


var romanpages = {},
    pagenames = {},
    PDF_THUMBNAIL = {
        // Batch size (pages/thumbnails) appended per DOM operation.
        // Keep small to avoid heavy layout work for 100-250 page books.
        SIZE: 5,
        FULL: [],
        SPLIT: [],
        _LOADER: {
            // set when user opens the thumbnail panel (or panel already visible)
            userActivated: false,
            isLoading: false,
            paused: false,
            completed: false,
            nextSplitIndex: 0,
            retryCount: 0,
            scrollBound: false,
            clickBound: false,
            scrollerEl: null,
            scrollHandler: null,
            clickHandler: null
        },
        IMG_ROOT: {
            "default": "/supporting/",
            "Hiti": "/supporting/lowres/",
            "TNF": "/supporting/"
        },
        DIV: document.getElementById('img-list'),
        INIT: function (Page) {
            try {
                this.DIV = document.getElementById('img-list');
                // Reset for new document/session.
                this.FULL = [];
                this.SPLIT = [];
                this._LOADER.completed = false;
                this._LOADER.paused = false;
                this._LOADER.isLoading = false;
                this._LOADER.userActivated = false;
                this._LOADER.nextSplitIndex = 0;
                this._LOADER.retryCount = 0;
                // Avoid re-inserting old DOM.
                if (this.DIV) this.DIV.innerHTML = "";
                this.GENERATE(Page);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('PDF_THUMBNAIL_INIT', err.message);
            }
        },
        SPLIT_APPEND: function (_ = PDF_THUMBNAIL) {
            try {
                // Build split batches (no DOM append here).
                // DOM append is controlled by LAZY_LOAD + scroll triggers.
                _.SPLIT = [];
                for (var i = 0; i < _.FULL.length; i += _.SIZE) {
                    _.SPLIT.push(_.FULL.slice(i, i + _.SIZE));
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('SPLIT_APPEND', err.message);
            }
        },
        _getThumbnailSectionEl: function () {
            return document.getElementById("iPdfThumbnail_Section");
        },
        _isThumbnailVisible: function () {
            const sec = this._getThumbnailSectionEl();
            return !!(sec && !sec.classList.contains("ds-none") && sec.offsetParent !== null);
        },
        _getScrollerEl: function () {
            const sec = this._getThumbnailSectionEl();
            if (!sec) return null;
            return sec.querySelector(".pdf-thumb-section") || sec;
        },
        _isNearBottom: function () {
            const el = this._LOADER.scrollerEl || this._getScrollerEl();
            if (!el) return false;
            return (el.scrollTop + el.clientHeight) >= (el.scrollHeight - 60);
        },
        onThumbnailToggle: function (isVisible) {
            // Called from `_editorLayout.js` when user toggles hamburger.
            this._LOADER.userActivated = isVisible ? true : this._LOADER.userActivated;
            this._LOADER.paused = !isVisible;
            if (isVisible) {
                this._attachScrollListener();
                this._loadInitialIfNeeded();
                if (this._LOADER.userActivated && !this._LOADER.completed && this._isNearBottom()) {
                    this._loadNextBatch();
                }
            }
        },
        pauseLoading: function () {
            this._LOADER.paused = true;
        },
        resumeLoading: function () {
            this._LOADER.paused = false;
        },
        _loadInitialIfNeeded: function (_ = PDF_THUMBNAIL) {
            try {
                if (!this.SPLIT || this.SPLIT.length === 0) return;
                if (this._LOADER.completed) return;
                if (this._LOADER.paused) return;
                // defer until thumbnail panel is visible
                if (!this._isThumbnailVisible()) return;

                // For books (`!IS_JOURNAL`), defer any DOM inserts until the user explicitly opens the panel.
                if (!IS_JOURNAL && !this._LOADER.userActivated) return;

                const totalThumbs = this.FULL?.length || (this.SPLIT.length * this.SIZE);
                let initialPages;
                if (IS_JOURNAL) {
                    // Journal initial cap: show up to 20 thumbnails, but never block if fewer exist.
                    initialPages = Math.min(totalThumbs, 20);
                    if (totalThumbs < 3) initialPages = totalThumbs;
                } else {
                    // After user activates the panel, render only the first small batch.
                    initialPages = Math.min(totalThumbs, this.SIZE);
                }

                const targetLimit = Math.min(Math.ceil(initialPages / this.SIZE), this.SPLIT.length);

                while (this._LOADER.nextSplitIndex < targetLimit) {
                    const idx = this._LOADER.nextSplitIndex;
                    this.APPEND(this.SPLIT[idx]);
                    this._LOADER.nextSplitIndex = idx + 1;
                    if (this._LOADER.nextSplitIndex >= this.SPLIT.length) {
                        this._LOADER.completed = true;
                        this._detachScrollListener();
                        break;
                    }
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('PDF_THUMBNAIL_LOAD_INITIAL', err.message);
            }
        },
        _attachScrollListener: function () {
            if (this._LOADER.scrollBound) return;
            const scrollerEl = this._getScrollerEl();
            if (!scrollerEl) return;

            this._LOADER.scrollerEl = scrollerEl;
            this._LOADER.scrollHandler = () => {
                // Always respect paused + visibility.
                if (this._LOADER.paused) return;
                if (!this._isThumbnailVisible()) return;
                if (this._LOADER.completed) return;
                if (this._LOADER.isLoading) return;
                if (!IS_JOURNAL && !this._LOADER.userActivated) return;

                if (!this._isNearBottom()) return;
                this._loadNextBatch();
            };

            scrollerEl.addEventListener("scroll", this._LOADER.scrollHandler, { passive: true });
            this._LOADER.scrollBound = true;
        },
        _detachScrollListener: function () {
            try {
                if (!this._LOADER.scrollBound) return;
                const el = this._LOADER.scrollerEl;
                if (el && this._LOADER.scrollHandler) {
                    el.removeEventListener("scroll", this._LOADER.scrollHandler);
                }
            } catch (e) {
                // no-op
            } finally {
                this._LOADER.scrollBound = false;
                this._LOADER.scrollHandler = null;
            }
        },
        _loadNextBatch: function () {
            try {
                if (!this.SPLIT || this.SPLIT.length === 0) return;
                if (this._LOADER.completed) return;
                if (this._LOADER.paused) return;
                if (!this._isThumbnailVisible()) return;
                if (!IS_JOURNAL && !this._LOADER.userActivated) return;
                if (this._LOADER.isLoading) return;

                this._LOADER.isLoading = true;
                // Append exactly 1 batch per trigger to keep each DOM operation bounded.
                let appended = 0;
                const maxAppendBatches = 1;
                try {
                    while (this._LOADER.nextSplitIndex < this.SPLIT.length && appended < maxAppendBatches) {
                        if (this._LOADER.paused || !this._isThumbnailVisible()) break;
                        const nextIdx = this._LOADER.nextSplitIndex;
                        this.APPEND(this.SPLIT[nextIdx]);
                        this._LOADER.nextSplitIndex = nextIdx + 1;
                        appended++;

                        if (this._LOADER.nextSplitIndex >= this.SPLIT.length) {
                            this._LOADER.completed = true;
                            this._detachScrollListener();
                            break;
                        }

                        if (!this._isNearBottom()) break;
                    }
                } finally {
                    this._LOADER.isLoading = false;
                }
            } catch (err) {
                this._LOADER.isLoading = false;
                console.warn(err.message);
                ErrorLogTrace('PDF_THUMBNAIL_LOAD_NEXT_BATCH', err.message);
            }
        },
        LAZY_LOAD: function (_ = PDF_THUMBNAIL) {
            try {
                // If thumbnails haven't finished generating yet, retry a few times.
                if (!this.SPLIT || this.SPLIT.length === 0) {
                    this._LOADER.retryCount = (this._LOADER.retryCount || 0) + 1;
                    if (this._LOADER.retryCount <= 10) {
                        setTimeout(() => this.LAZY_LOAD(), 300);
                    }
                    return;
                }

                // Ensure DOM container exists.
                this.DIV = document.getElementById("img-list");
                if (!this.DIV) return;

                // Scroll listener activates loading when user scrolls near the bottom.
                this._attachScrollListener();

                // Journal can load immediately; books must wait for explicit hamburger activation.
                this._LOADER.userActivated = IS_JOURNAL ? true : false;

                // Initial batch (max 10 thumbnails) is appended only when panel is visible.
                this._loadInitialIfNeeded();
                if (this._LOADER.userActivated && !this._LOADER.completed && this._isNearBottom()) {
                    this._loadNextBatch();
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('PDF_THUMBNAIL_LAZY_LOAD', err.message);
            }
        },
        CHECK_ACTIVE: function (_ = PDF_THUMBNAIL) {
            try {
                this.DIV = document.getElementById('img-list');
                if (!this.DIV.querySelector('a>img.active')) {
                    // Prefer marking the thumbnail that matches the currently displayed PDF page.
                    let targetImg = null;
                    try {
                        const pdfCurEl = document.getElementById('pdf_curPage');
                        const currPageInput = document.getElementById('currpageno');

                        const cur =
                            (pdfCurEl && pdfCurEl.textContent && pdfCurEl.textContent.trim()) ||
                            (currPageInput && currPageInput.value && currPageInput.value.trim()) ||
                            (typeof SYNC_CLICK_EVENT !== "undefined" && typeof SYNC_CLICK_EVENT.getCurrentPageNumber === "function"
                                ? SYNC_CLICK_EVENT.getCurrentPageNumber()
                                : null);

                        if (cur != undefined && cur != null && cur !== '') {
                            const byId = document.getElementById(String(cur));
                            if (byId && this.DIV && this.DIV.contains(byId)) targetImg = byId;
                        }
                    } catch (e) {
                        // no-op
                    }

                    if (!targetImg) targetImg = this.DIV.querySelector('a>img');
                    if (targetImg) targetImg.classList.add('active');
                } else { }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('PDF_CHECK_ACTIVE', err.message);
            }
        },
        APPEND: function (ARR, _ = PDF_THUMBNAIL) {
            try {
                if (!ARR) return;
                this.DIV = this.DIV || document.getElementById('img-list');
                if (!this.DIV) return;
                // ARR is an array of page HTML strings (no nested arrays expected anymore).
                var arr = Array.isArray(ARR[0]) ? ARR[0].join('') : ARR.join('');
                // One DOM insert per batch to keep layout work minimal.
                this.DIV.insertAdjacentHTML('beforeend', arr);
                this.CHECK_ACTIVE();
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('PDF_THUMBNAIL_APPEND', err.message);
            }
        },
        GENERATE: function (Page, _ = PDF_THUMBNAIL) {
            try {
                var FOLDER = !IS_JOURNAL && _.IMG_ROOT[window.location.host] ? _.IMG_ROOT[window.location.host] : _.IMG_ROOT['default'];
                if (SHARED_KEY["client"] == 'Hiti') {
                    FOLDER = _.IMG_ROOT['Hiti'];
                }
                if (SYNC_CLICK_EVENT.PAGE_NO_REGEX == undefined) {
                    SYNC_CLICK_EVENT.Init();
                }
                $.each(Page, function (indexInArray, valueOfElement) {
                    $.each(valueOfElement, function (ind, value) {
                        // ? Hanlde roman pages also.
                        if (value != undefined) {
                            let url = BUCKET_URL + DOC_ID + FOLDER + value;
                            if (indexInArray == 0) {
                                ind = SYNC_CLICK_EVENT.PAGE_NO_REGEX.exec(value)[1];
                            }
                            if (indexInArray != 0 && !value.match(/[ivx]+/) || indexInArray == 0) {
                                _.FULL.push('<li class="list-group-item"><a href="#" class="im"><img id="' + ind + '" src="' + url + '" href="#" alt="page' + ind + '" class="img-fluid-thumbil" tabindex="0" onclick="postNavigation(this, \'thumbil\')"></a></li><li class="list-group-item font-small-id text-center mt-n1">' + ind + '</li>');
                            }
                        }
                    });
                });
                // Build batches only; actual DOM inserts happen in LAZY_LOAD + scroll.
                this.SPLIT_APPEND(this);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('PDF_THUMBNAIL_GENERATE', err.message);
            }
        }
    };

const ZOOM_CONFIG = {
    MIN: 58,
    MAX: 400,
    STEP: 20
};


const ROTATION_DEGREES = {
    '0': '90',
    '90': '180',
    '180': '270',
    '270': '0'
};

// Centralized index for pagemap.json to keep page<->element sync fast and predictable.
var PAGE_MAP_INDEX = {
    elementToPage: {},
    pageToElements: {},
    numericPages: [],
    romanPages: [],
    isMetaKey: function (key) {
        return ['pagestart', 'pageend'].includes(key) || /_start$/i.test(key);
    },
    isValidPageToken: function (pageToken) {
        if (pageToken == null || pageToken == undefined) return false;
        return /^[0-9]+$/i.test(pageToken) || commonMethods.isRomanNumeral(String(pageToken));
    },
    rebuild: function (map) {
        this.elementToPage = {};
        this.pageToElements = {};
        this.numericPages = [];
        this.romanPages = [];

        if (!map || typeof map !== 'object') return;

        var numericSeen = {};
        var romanSeen = {};

        Object.entries(map).forEach(([key, value]) => {
            if (!key || this.isMetaKey(key)) return;
            var pageToken = String(value || '').trim();
            if (!this.isValidPageToken(pageToken)) return;

            if (!this.pageToElements[pageToken]) this.pageToElements[pageToken] = [];
            this.pageToElements[pageToken].push(key);
            this.elementToPage[key] = pageToken;

            if (/^[0-9]+$/i.test(pageToken)) {
                if (!numericSeen[pageToken]) {
                    numericSeen[pageToken] = true;
                    this.numericPages.push(parseInt(pageToken, 10));
                }
            } else if (!romanSeen[pageToken]) {
                romanSeen[pageToken] = true;
                this.romanPages.push(pageToken);
            }
        });

        this.numericPages.sort(function (a, b) { return a - b; });
    },
    getPageByElementId: function (id) {
        if (!id) return null;
        return this.elementToPage[id] || null;
    },
    getFirstElementIdByPage: function (pageToken, options) {
        if (pageToken == null || pageToken == undefined) return null;
        options = options || {};

        var key = String(pageToken);
        var list = this.pageToElements[key] || [];
        if (!list.length) return null;

        // Prefer non-BLANK anchors when possible.
        var ordered = list.slice().sort(function (a, b) {
            var aBlank = /BLANK/i.test(a) ? 1 : 0;
            var bBlank = /BLANK/i.test(b) ? 1 : 0;
            return aBlank - bBlank;
        });

        var doc = options.editorDoc || null;
        for (var i = 0; i < ordered.length; i++) {
            var id = ordered[i];
            if (!doc || (doc.getElementById && doc.getElementById(id))) {
                return id;
            }
        }

        return ordered[0] || null;
    }
};

var SYNC_CLICK_EVENT = {
    IsFront: false,
    loop: 0,
    quryClass: 'ckcommentsfull',
    IsQuery: false,
    IsEditorClick: false,
    temp_id: '',
    curPage: null,
    initiated: false,
    Area_Arr: ['img-fluid-thumbil', 'btn-header', 'form-control text-center', 'thumbilArrow'],
    PATTERN: /(page)[a-z0-9]+/g,
    PAGE_NO_REGEX: new RegExp("page(.*?)\.png"),
    NEW_PAGE: null,
    TEMP_PAGE: null,
    currentZoom: 100,
    TIMER: null,
    PDF_PAGE: document.getElementById("pageimagedisplay"),
    PDF_PARENT: document.querySelector("#pageimagedisplayparent img"),
    ZOOM_OUT: document.getElementById("pdf_zoomout"),
    ZOOM_IN: document.getElementById("pdf_zoomin"),
    PREV_PAGE: document.getElementById("leftpagebut"),
    NEXT_PAGE: document.getElementById("rightpagebut"),
    ROTATE_PAGE: document.getElementById("pdf_rotate"),
    ClickElm_Obj: {
        'currpageno': "CUR_PAGE_INPUT",
        'leftpagebut': "LEFT_PAGE_INPUT",
        'rightpagebut': "RIGHT_PAGE_INPUT",
        "pdf_zoomin": "PDF_ZOOM_IN_BTN",
        "pdf_zoomout": "PDF_ZOOM_OUT_BTN",
        "pdf_rotate": "PAGE_ROTATE_BTN",
        "pdf_fitnpage": "PDF_FIT_PAGE_BTN",
        "pdf_fitwith": "PDF_FIT_WIDTH_BTN",
    },
    getFloatId: function (node, index) {
        try {
            if (!this.initiated) this.Init();
            if (!node || !node.querySelector) return null;

            if (node.classList && node.classList.contains('supplementary-material')) {
                const title = node.querySelector('.caption .title');
                return title && title.id ? title.id : null;
            }

            let find = node.querySelector(`${index < 2 ? (index == 0 ? TAB_CAP : FIG_CAP) : ('.title')}`);
            return find ? find.id : null;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getFloatId', err.message);
        }
    }, handleNavigation(e, isLeft) {
        try {
            if (this.isDisabled(e.currentTarget)) return;
            const currentPage = this.getCurrentPageNumber();
            const pageNum = currentPage.toString();
            const direction = isLeft ? -1 : 1;
            const newPage = this.getNextPage(pageNum, direction);
            if (newPage) {
                this.updatePage(newPage, e.currentTarget);
                this.updateNavigationButtons(newPage.toString());
            } else {
                this.showAlert();
            }
        } catch (err) {
            this.logError("handleNavigation", err);
        }
    },
    pdf: function (myPage, Area) {
        try {
            if (!this.initiated) this.Init();
            if (!myPage) return;
            if (!IS_TRACK_VIEW && myPage != undefined && this.curPage != myPage) {
                //rotate page when next/prev - RJ_11_Mar_25
                if ($(this.PDF_PAGE).data('rotate') !== undefined) {
                    $(this.PDF_PAGE).removeAttr('data-rotate');
                }
                $(this.PDF_PAGE).attr('src', BUCKET_URL + DOC_ID + '/supporting/' + (romanpages[myPage] ? romanpages[myPage] : pagenames[myPage]) + '?' + new Date().getTime());
                // ? 10_AUG_23-RJ(OUP_J_NP_031);
                $(this.CUR_PAGE_INPUT).val(myPage).attr('placeholder', myPage);
                $('#pdf_curPage').html(myPage);
                $('#lastpage, #pdft_pageend').html(PAGE_ID_MAP.pageend);
                // ?Thumbil setup
                $('ul[id="img-list"]').find('img.active').removeClass('active');
                $('ul[id="img-list"]').find('#' + myPage).addClass('active');
                if (!Area || Area && !['thumbil'].includes(Area)) {
                    let first = $('#img-list >li >a #' + myPage)[0];
                    if (first) first.scrollIntoView(true);
                }
                //Enable/Disable prev/next pdf page button - 07_JAN-23_AN
                $(this.PREV_PAGE).css('opacity', PAGE_ID_MAP.pagestart == myPage ? '.5' : '1')[PAGE_ID_MAP.pagestart == myPage ? 'attr' : 'removeAttr']('disabled', true);
                $(this.NEXT_PAGE).css('opacity', PAGE_ID_MAP.pageend == myPage ? '.5' : '1')[PAGE_ID_MAP.pageend == myPage ? 'attr' : 'removeAttr']('disabled', true);

            }
            if (this.curPage != myPage) {

            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('pdf', err.message);
        }
    },

    /**
     * Extracts the PDF page number from an editor element.
     * @param {Object} elm - Editor element (CKEditor element or DOM node)
     * @returns {string|number|null} Page number or null if not found
     */
    getPDF_PageNo: function (elm) {
        try {
            if (!elm) return null;
            // Try to extract from id attribute
            let id = elm.getAttribute ? elm.getAttribute('id') : (elm.id || null);
            if (id && /^page\d+$/.test(id)) {
                return id.replace('page', '');
            }
            // Try to extract from src attribute (for images)
            let src = elm.getAttribute ? elm.getAttribute('src') : (elm.src || null);
            if (src) {
                let match = src.match(/page(\d+)\.png/i);
                if (match) return match[1];
            }
            // Try to extract from data-id attribute
            let dataId = elm.getAttribute ? elm.getAttribute('data-id') : (elm['data-id'] || null);
            if (dataId && /^page\d+$/.test(dataId)) {
                return dataId.replace('page', '');
            }
            // Fallback: check parent
            if (elm.parentElement) {
                return this.getPDF_PageNo(elm.parentElement);
            }
            return null;
        } catch (err) {
            console.warn('getPDF_PageNo error:', err.message);
            return null;
        }
    },

    getNextPage(currentPage, direction) {
        // Handles both numeric and Roman navigation, including wrapping
        try {
            const romanKeys = Object.keys(romanpages);
            const numericKeys = Object.keys(pagenames);
            if (this.isRomanNumeral(currentPage)) {
                const currentIndex = romanKeys.indexOf(currentPage);
                if (currentIndex === -1) return null;
                const newIndex = currentIndex + direction;
                if (newIndex >= 0 && newIndex < romanKeys.length) {
                    return romanKeys[newIndex];
                }
                // Wrap between Roman and numeric
                if (direction === -1 && currentIndex === 0 && numericKeys.length > 0) {
                    return numericKeys[numericKeys.length - 1];
                } else if (direction === 1 && currentIndex === romanKeys.length - 1 && numericKeys.length > 0) {
                    return numericKeys[0];
                }
                return null;
            } else {
                const currentNum = parseInt(currentPage);
                let newNum = currentNum + direction;
                if (newNum <= 0 && romanKeys.length > 0) {
                    return romanKeys[romanKeys.length - 1];
                }
                if (!pagenames[newNum] && direction === -1) {
                    newNum = newNum - 1;
                }
                if (pagenames[newNum]) {
                    return newNum.toString();
                }
                return null;
            }
        } catch (err) {
            this.logError("getNextPage", err);
            return null;
        }
    },
    Handle_Blank_Page: function (Id, PAGE_ID_MAP, Area) {
        try {
            var IdsArr = [];
            Object.entries(PAGE_ID_MAP).forEach(([key, value]) => {
                if (value == Id) {
                    var while_count = 0;
                    while (key.indexOf("BLANK") > -1) {
                        Id = ("rightpagebut" == Area ? parseInt(Id) + 1 : parseInt(Id) - 1);
                        key = commonMethods.getKeyByValue(PAGE_ID_MAP, Id.toString());
                        while_count++;
                        if (while_count > 10 || !key) {
                            break;
                        }
                    }
                    IdsArr.push(key);
                }
            });
            return [Id.toString(), IdsArr];
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Handle_Blank_Page', err.message);
        }
    },
    IsExitingNodewithMap: function (id, PAGE_ID_MAP, Area) {
        try {
            if (!id) return;

            var fastHit = PAGE_MAP_INDEX.getFirstElementIdByPage(id, {
                editorDoc: GlobalEditor && GlobalEditor.document ? GlobalEditor.document.$ : null
            });
            if (fastHit) {
                PAGE_ID_MAP[id + '_start'] = fastHit;
                return fastHit;
            }

            if (PAGE_ID_MAP[id + '_start'] != undefined) {
                return PAGE_ID_MAP[id + '_start'];
            }
            var [reTurn, IdsArr] = [this.Handle_Blank_Page(id, PAGE_ID_MAP, Area), []];
            [id, IdsArr] = reTurn;
            var querySyntax = IdsArr.filter(Boolean).map(el => '#' + el).join(',');
            var FirstElm = $(GlobalEditor.document.$).find(querySyntax);
            //console.log(FirstElm);
            let ID = null;
            if (FirstElm.length > 0) {
                PAGE_ID_MAP[id + '_start'] = FirstElm[0].id;
                ID = FirstElm[0].id;
            }
            if (ID && GlobalEditor.document.getById(ID) == null) {
                PAGE_ID_MAP[FirstElm] = 'x_' + parseInt(id);
                this.IsExitingNodewithMap(id, PAGE_ID_MAP, Area);
            } else if (ID) {
                return ID;
            } else {
                return false;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('IsExitingNodewithMap', err.message);
        }
    },
    removeActiveClass: function (node) {
        try {
            if (!this.initiated) this.Init();
            Array.prototype.filter.call(node, function (elem) {
                elem.querySelectorAll('.active').forEach(el => {
                    el.classList.remove('active');
                });
                elem.querySelectorAll('span.fa').forEach(el => {
                    el.setAttribute('class', 'fa fa-angle-right');
                });
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('removeActiveClass', err.message);
        }
    },
    checkForQueryAsFirstElement: function (element) {
        try {
            if (!element) return false;
            let children = element.getChildren();
            for (let i = 0; i < children.count(); i++) {
                let child = children.getItem(i);
                if (child.type === CKEDITOR.NODE_TEXT) {
                    if (child.getText().trim() === '') {
                        continue;
                    } else {
                        return false;
                    }
                }
                if (child.type === CKEDITOR.NODE_ELEMENT) {
                    if (child.hasAttribute('data-class') &&
                        child.getAttribute('data-class') === 'ckcommentsfull') {
                        return true;
                    }
                    // Check if it's a wrapper element containing the query
                    let queryChild = child.findOne('[data-class="ckcommentsfull"]');
                    if (queryChild) {
                        return this.isQueryFirstInWrapper(child);
                    }
                    return false;
                }
            }
            return false;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CheckQueryinFigure', err.message);
        }
    },
    isQueryFirstInWrapper: function (wrapperElement) {
        let children = wrapperElement.getChildren();
        for (let i = 0; i < children.count(); i++) {
            let child = children.getItem(i);
            if (child.type === CKEDITOR.NODE_TEXT && child.getText().trim() === '') {
                continue;
            }
            if (child.type === CKEDITOR.NODE_ELEMENT) {
                if (child.hasAttribute('data-class') &&
                    child.getAttribute('data-class') === 'ckcommentsfull') {
                    return true;
                }
                return false;
            }
            if (child.type === CKEDITOR.NODE_TEXT && child.getText().trim() !== '') {
                return false;
            }
        }

        return false;
    },
    setElmFocus: function (id) {
        try {
            if (!this.initiated) this.Init();
            var [sel, rng, element] = [GlobalEditor.getSelection(), GlobalEditor.createRange(), GlobalEditor.document.getById(id)];
            // rng = GlobalEditor.createRange(),element = GlobalEditor.document.getById(id);
            if (!element || !sel) return;
            if (element.hasClass('fig')) {
                element = element.findOne(FIG_CAP);
            } else if (element.hasClass('table-wrap')) {
                element = element.findOne(TAB_CAP);
            } else if (element.hasClass('supplementary-material') || element.getAttribute('data-name') === 'supplementary-material') {
                element = element.findOne('.caption .title') || element.findOne('.caption') || element;
            } else if (element.hasClass('caption')) {
                element = element.findOne('.title') || element;
            } else if (['sec', 'ref-list'].includes(element.getAttribute('class'))) {
                element = element.findOne('.title');
            }
            /*
                if (element.findOne('[data-pi]')) {
                    element = element.findOne('[data-pi]');
                };
                06_OCT_SIVA\SRINI UPDATES
                POSITION_BEFORE_END to POSITION_BEFORE_START
            */
            //rng.setStartAt(element, CKEDITOR.POSITION_BEFORE_START);
            //rng.setEndAt(element, CKEDITOR.POSITION_BEFORE_START);
            // Srini Points Fixed by DR
            // ? 3352481: Figure Caption insertion
            if (element) {
                let targetElement = element;
                let hasQueryAsFirstElement = this.checkForQueryAsFirstElement(targetElement);
                if (hasQueryAsFirstElement) {
                    let queryElement = targetElement.findOne('[data-class="ckcommentsfull"]');
                    if (queryElement) {
                        let elementToPositionAfter = this.findDirectChildContainingQuery(queryElement, targetElement);
                        if (elementToPositionAfter) {
                            rng.moveToPosition(elementToPositionAfter, CKEDITOR.POSITION_AFTER_END);
                            sel.selectRanges([rng]);
                            GlobalEditor.focus();
                            return;
                        }
                    }
                } else {
                    rng.moveToElementEditStart(targetElement);
                    sel.selectRanges([rng]);
                    GlobalEditor.focus();
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('setElmFocus', err.message + id);
        }
    },
    isSameElement: function (element1, element2) {
        if (!element1 || !element2) return false;
        if (element1.getAttribute && element2.getAttribute) {
            let id1 = element1.getAttribute('id');
            let id2 = element2.getAttribute('id');
            if (id1 && id2) {
                return id1 === id2;
            }
        }
    },
    findDirectChildContainingQuery: function (queryElement, parentElement) {
        if (!queryElement || !parentElement) return null;
        let currentElement = queryElement;
        while (currentElement && !this.isSameElement(currentElement.getParent(), parentElement)) {
            currentElement = currentElement.getParent();
            if (!currentElement) break;
        }
        return currentElement && this.isSameElement(currentElement.getParent(), parentElement) ? currentElement : queryElement;
    },
    toc: function (click_id, Area) {
        try {
            if (!this.initiated) this.Init();
            _postNav_UpdateTocUi(click_id, this.IsFront, Area);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('toc', err.message);
        }
    },
    trigger: function (elm, Area, click_id) {
        try {
            if (!this.initiated) this.Init();
            postNavigation(elm, Area, click_id);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('trigger', err.message);
        }
    },
    GET_ROMAN_NUMBER: function (num, IsLeft, _ = SYNC_CLICK_EVENT) {
        try {
            let Integer = IsLeft ? deromanize(num) - 1 : deromanize(num) + 1;
            return romanize(Integer).toLocaleLowerCase();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_ROMAN_NUMBER', err.message);
        }
    },
    GET_VALID_PAGE: function (Page, IsLeft, _ = SYNC_CLICK_EVENT) {
        try {
            Page = _.GET_ROMAN_NUMBER(Page, IsLeft);
            let [min_count, max_count] = [0, 10];
            while (!romanpages[Page]) {
                min_count++;
                Page = _.GET_ROMAN_NUMBER(Page, IsLeft);
                if (min_count > max_count) {
                    Page = null;
                    break;
                }
            }
            return Page;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_ROMAN_NUMBER', err.message);
        }
    },
    initializeElements: function () {
        const self = this;
        const elements = {};
        for (const [id, key] of Object.entries(this.ClickElm_Obj)) {
            const element = document.getElementById(id);
            if (element) {
                self[key] = element;
            }
        }
        return {
            container: document.getElementById('img-list'),
            display: document.getElementById("pageimagedisplay"),
            parent: document.querySelector("#pageimagedisplayparent img"),
            zoomOut: document.getElementById("pdf_zoomout"),
            zoomIn: document.getElementById("pdf_zoomin"),
            zoomDropdown: document.getElementById("zoom_dropdown"),
            prevPage: document.getElementById("leftpagebut"),
            nextPage: document.getElementById("rightpagebut"),
            rotate: document.getElementById("pdf_rotate"),
            pageInput: document.getElementById("currpageno"),
            tocList: document.querySelector('#toc_list'),
            lofList: document.querySelector('#lof_list')
        };
    },
    /**
     * Initialize event listeners for controls
     */
    initializeEventListeners: function () {
        const {
            pageInput,
            zoomIn,
            zoomOut,
            zoomDropdown,
            rotate,
            prevPage,
            nextPage
        } = this.elements;

        pageInput.onkeypress = (e) => this.handlePageInput(e);
        zoomIn.onclick = (evt) => this.handleZoom(evt, true);
        zoomOut.onclick = (evt) => this.handleZoom(evt, false);
        zoomDropdown.onchange = (evt) => this.handleZoomDropdown(evt);
        rotate.onclick = (evt) => this.handleRotation(evt);
        prevPage.onclick = (evt) => this.handleNavigation(evt, true);
        nextPage.onclick = (evt) => this.handleNavigation(evt, false);
    },
    showAlert() {
        try {
            TOASTER_ALERT('wrongpage', {
                type: 'warning'
            });
            this.elements.pageInput.value = this.getCurrentPageNumber();
        } catch (err) {
            this.logError("handlePageInput", err);
        }
    },
    handlePageInput(e) {
        try {
            if (e.key !== 'Enter' || e.which !== 13) return;

            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                const inputValue = this.elements.pageInput.value.trim();

                // Check if the input is a valid page number (either numeric or Roman)
                if (this.isRomanNumeral(inputValue)) {
                    // Handle Roman numeral input
                    if (romanpages[inputValue.toLowerCase()]) {
                        this.elements.pageInput.value = inputValue.toLowerCase();
                        postNavigation(this.elements.pageInput, 'pdfButton');
                        this.updateNavigationButtons(inputValue.toLowerCase());
                    } else this.showAlert();
                } else {
                    // Handle numeric input
                    const numericPage = parseInt(inputValue, 10);
                    if (pagenames[numericPage]) {
                        this.elements.pageInput.value = numericPage;
                        postNavigation(this.elements.pageInput, 'pdfButton');
                        this.updateNavigationButtons(numericPage.toString());
                    } else this.showAlert();
                }
            }, 250);
        } catch (err) {
            this.logError("handlePageInput", err);
        }
    },

    handleNavigation(e, isLeft) {
        try {
            if (this.isDisabled(e.currentTarget)) return;

            const currentPage = this.getCurrentPageNumber();
            const pageNum = currentPage.toString();

            if (this.isRomanNumeral(pageNum)) {
                this.handleRomanNavigation(pageNum, isLeft, e.currentTarget);
            } else {
                this.handleNumericNavigation(pageNum, isLeft, e.currentTarget);
            }
        } catch (err) {
            this.logError("handleNavigation", err);
        }
    },
    handleNumericNavigation(pageNum, isLeft, target) {
        try {
            const romanKeys = Object.keys(romanpages);
            const numericKeys = Object.keys(pagenames);
            const currentNum = parseInt(pageNum);
            let newPage = isLeft ? currentNum - 1 : currentNum + 1;

            // Handle wrapping to Roman numerals when going left past first numeric page
            if (newPage <= 0 && romanKeys.length > 0) {
                const lastRomanPage = romanKeys[romanKeys.length - 1];
                if (romanpages[lastRomanPage]) {
                    this.updatePage(lastRomanPage, target);
                    this.updateNavigationButtons(lastRomanPage);
                } else this.showAlert();
                return;
            }

            // Handle wrapping to first numeric page when going right from last Roman numeral
            if (!pagenames[newPage] && isLeft) {
                // Try one more page back
                newPage = newPage - 1;
            }

            // Validate the new page exists
            if (pagenames[newPage]) {
                this.updatePage(newPage, target);
                this.updateNavigationButtons(newPage.toString());
            } else this.showAlert();
        } catch (err) {
            this.logError("handleNumericNavigation", err);
        }
    },

    handleRomanNavigation(pageNum, isLeft, target) {
        try {
            const romanKeys = Object.keys(romanpages);
            const currentIndex = romanKeys.indexOf(pageNum);

            if (currentIndex === -1) {
                this.logError("handleRomanNavigation", new Error("Invalid Roman numeral page"));
                return;
            }

            const newIndex = isLeft ? currentIndex - 1 : currentIndex + 1;

            // Handle navigation within Roman numerals
            if (newIndex >= 0 && newIndex < romanKeys.length) {
                const newPage = romanKeys[newIndex];
                this.updatePage(newPage, target);
                this.updateNavigationButtons(newPage);
                return;
            }

            // Handle wrapping between Roman and numeric pages
            if (isLeft && currentIndex === 0) {
                // Wrap to last numeric page
                const lastNumericPage = Object.keys(pagenames).at(-1);
                this.updatePage(lastNumericPage, target);
                this.updateNavigationButtons(lastNumericPage);
            } else if (!isLeft && currentIndex === romanKeys.length - 1) {
                // Wrap to first numeric page
                const firstNumericPage = "1";
                this.updatePage(firstNumericPage, target);
                this.updateNavigationButtons(firstNumericPage);
            }
        } catch (err) {
            this.logError("handleRomanNavigation", err);
        }
    },
    handleZoom(e, isZoomIn) {
        try {
            if (this.isDisabled(this.elements[isZoomIn ? 'zoomIn' : 'zoomOut'])) return;

            this.currentZoom = isZoomIn ?
                Math.min(this.currentZoom + ZOOM_CONFIG.STEP, ZOOM_CONFIG.MAX) :
                Math.max(this.currentZoom - ZOOM_CONFIG.STEP, ZOOM_CONFIG.MIN);

            this.updateZoomControls();
            this.syncZoomDropdown();
        } catch (err) {
            this.logError("handleZoom", err);
        }
    },
    // 3350491 Fit to Page - May_06_2025 - RJ
    handleZoomDropdown(e) {
        try {
            const selectedValue = e.target.value;

            if (selectedValue === 'fit') {
                const containerWidth = this.elements.parent.parentElement.offsetWidth;
                const imageWidth = this.elements.display.naturalWidth;
                const fitZoom = Math.floor((containerWidth / imageWidth) * 100);

                this.currentZoom = Math.max(ZOOM_CONFIG.MIN, Math.min(fitZoom, ZOOM_CONFIG.MAX));
            } else if (e.target[e.target.selectedIndex].accessKey === "fittoheight") {
                // need to change from html val
                this.currentZoom = parseInt(selectedValue, 10);
            } else {
                this.currentZoom = parseInt(selectedValue, 10);
            }

            this.updateZoomControls();
        } catch (err) {
            this.logError("handleZoomDropdown", err);
        }
    },
    syncZoomDropdown() {
        try {
            const {
                zoomDropdown
            } = this.elements;

            // Find closest matching option
            const options = Array.from(zoomDropdown.options);
            let bestMatch = options[0];

            // Check for exact matches first
            const exactMatch = options.find(option =>
                option.value !== 'fit' && parseInt(option.value, 10) === this.currentZoom
            );

            if (exactMatch) {
                bestMatch = exactMatch;
            } else {
                // If no exact match, find the closest option
                let minDiff = Number.MAX_VALUE;

                options.forEach(option => {
                    // Skip fit option
                    if (option.value === 'fit') return;

                    const diff = Math.abs(parseInt(option.value, 10) - this.currentZoom);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestMatch = option;
                    }
                });
            }

            zoomDropdown.value = bestMatch.value;
        } catch (err) {
            this.logError("syncZoomDropdown", err);
        }
    },
    handleRotation(e) {
        try {
            if (this.isDisabled(e.currentTarget)) return;

            const currentDegree = e.currentTarget.getAttribute('data-rotate');
            const newDegree = ROTATION_DEGREES[currentDegree];

            this.elements.display.setAttribute('data-rotate', newDegree);
            e.currentTarget.setAttribute('data-rotate', newDegree);
        } catch (err) {
            this.logError("handleRotation", err);
        }
    },

    updateZoomControls() {
        try {
            // const pdfParent = document.querySelector('.pdf-parent'); // Adjust selector as needed
            // if (!pdfParent) return;

            this.elements.parent.style.maxWidth = `${this.currentZoom}%`;

            this.updateButtonState(this.elements.zoomOut, this.currentZoom > ZOOM_CONFIG.MIN);
            this.updateButtonState(this.elements.zoomIn, this.currentZoom < ZOOM_CONFIG.MAX);
        } catch (err) {
            this.logError("updateZoomControls", err);
        }
    },

    updateNavigationButtons(pageNumber) {
        try {
            const romanKeys = Object.keys(romanpages);
            const numericKeys = Object.keys(pagenames);

            if (this.isRomanNumeral(pageNumber)) {
                const currentIndex = romanKeys.indexOf(pageNumber);
                if (currentIndex === -1) return;

                // For Roman numerals:
                // - Prev is enabled if either there are previous Roman numerals OR there are numeric pages to go back to
                // - Next is enabled if either there are more Roman numerals OR there are numeric pages to go forward to
                const hasPrevious = currentIndex > 0 || numericKeys.length > 0;
                const hasNext = currentIndex < romanKeys.length - 1 || numericKeys.length > 0;

                this.updateButtonState(this.elements.prevPage, hasPrevious);
                this.updateButtonState(this.elements.nextPage, hasNext);
            } else {
                const numericPage = parseInt(pageNumber);
                if (isNaN(numericPage)) return;

                // For numeric pages:
                // - Prev is enabled if either current page > 1 OR there are Roman numerals to go back to
                // - Next is enabled if either there are more numeric pages OR there are Roman numerals to go forward to
                const isFirstPage = numericPage === 1;
                const isLastPage = numericPage === parseInt(numericKeys[numericKeys.length - 1]);

                const hasPrevious = !isFirstPage || romanKeys.length > 0;
                const hasNext = !isLastPage || romanKeys.length > 0;

                this.updateButtonState(this.elements.prevPage, hasPrevious);
                this.updateButtonState(this.elements.nextPage, hasNext);
            }
        } catch (err) {
            this.logError("updateNavigationButtons", err);
        }
    },

    // Helper methods
    isDisabled(element) {
        try {
            return element.hasAttribute('disabled') || element.parentNode.hasAttribute('disabled');
        } catch (err) {
            this.logError("isDisabled", err);
        }
    },

    updateButtonState(button, isEnabled) {
        try {
            if (!button) return;
            button.style.opacity = isEnabled ? '1' : '0.5';
            if (isEnabled) {
                button.removeAttribute('disabled');
            } else {
                button.setAttribute('disabled', 'true');
            }
        } catch (err) {
            this.logError("updateButtonState", err);
        }
    },

    getCurrentPageNumber(value) {
        try {
            const pageSrc = value ? value.toString() : this.elements.display.getAttribute('src');
            const match = pageSrc.match(/page(\d+)/) || pageSrc.match(/page([IVXLCDM]+)/i);
            return match ? match[1] : '1';
        } catch (err) {
            this.logError("getCurrentPageNumber", err);
        }
    },

    isRomanNumeral(str) {
        try {
            return /^[ivxlcdm]+$/i.test(str);
        } catch (err) {
            this.logError("isRomanNumeral", err);
        }
    },

    updatePage(newPage, target) {
        try {
            this.elements.pageInput.value = newPage;
            postNavigation(target, 'pdfButton');
        } catch (err) {
            this.logError("updatePage", err);
        }
    },
    Init() {
        try {
            this.elements = this.initializeElements();
            this.initializeEventListeners();

            this.PAGE_KEYS = Object.keys(pagenames).map(key => parseInt(key, 10));

            this.ROMAN_PAGE_KEYS = Object.keys(romanpages).map(key => parseInt(key, 10));

            $(this.ZOOM_OUT, this.PREV_PAGE).css('opacity', '.5').attr('disabled', true);

            this.initiated = true;
        } catch (err) {
            this.logError("Init", err);
        }
    },
    logError(functionName, error) {
        console.warn(`Error in ${functionName}: ${error.message}`);
        ErrorLogTrace(` SYNC CLICK PDF  ${functionName}`, error.message);
    },

};

async function pagemap(data) {
    try {
        PAGE_ID_MAP = data;
        PAGE_MAP_INDEX.rebuild(PAGE_ID_MAP);
        $.each(data, function (k, v) {
            try {
                // ? 24_NOV_22 - YA - IF GREATER THAN LAST PAGE / WRONG PAGE NUMBER FILTER
                if (v.match(/[0-9]+/)) {
                    if (parseInt(PAGE_ID_MAP['pageend']) >= parseInt(v)) {
                        pagenames[v] = `page${v}.png`;
                    }
                } else if (commonMethods.isRomanNumeral(v)) {
                    //romanpages[v] = `page${v}.png`;
                    debug.log(v + "-->" + deromanize(v));
                    if (!romanpages[v]) romanpages[v] = `page${v}.png`;
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('pagemap', err.message);
            }
        });

        function PDF_THUMBNAIL_RENDER() {
            if (typeof PDF_THUMBNAIL !== "undefined") {
                PDF_THUMBNAIL.INIT([romanpages, pagenames]);
            }
            if (typeof SYNC_CLICK_EVENT !== "undefined") {
                SYNC_CLICK_EVENT.pdf(PAGE_ID_MAP.pagestart);
            }
            console.log(`${PAGE_ID_MAP.pagestart} ==> file exists`);
        }

        const url = BUCKET_URL + DOC_ID + '/supporting/page' + PAGE_ID_MAP.pagestart + '.png';

        function checkThumbnailWithRetry(retries, delay = 1500) {
            $.ajax({
                url: url,
                type: 'HEAD',
                success: function () {
                    PDF_THUMBNAIL_RENDER();
                },
                error: function () {
                    // console.warn('file does not exist');
                    if (retries > 0) {
                        setTimeout(() => checkThumbnailWithRetry(retries - 1, delay), delay);
                    } else PDF_THUMBNAIL_RENDER();
                }
            });
        }
        // Initial call: 3 retries, 1 second delay
        checkThumbnailWithRetry(3, 1000);

    } catch (err) {
        ErrorLogTrace('pagemap', err.message);
        console.warn(err.message);
    }
}

/* Navigation sync + scroll-spy moved to: src/js/editor_sync_scrollspy.js */


class EditorNavigationSyncModule {
    constructor() {
        if (typeof window.POST_NAV_CACHE === "undefined") {
            window.POST_NAV_CACHE = { id: null, area: null };
        }
    }

    _isDebug() {
        return window.EDITOR_NAV_SYNC_DEBUG === true;
    }

    _log(step, payload) {
        if (!this._isDebug()) return;
        try {
            console.log('[EDITOR_NAV_SYNC]', step, payload || '');
        } catch (err) {
            // no-op
        }
    }

    resolveElementAndId(curElm, Area, myEleId) {
        var label = '_postNav_ResolveElementAndId';
        // console.time(label);
        try {
            var result = {
                curElm: curElm,
                myEleId: myEleId,
                IsFront: false,
                IsQuery: false,
                Temp_Id: "",
                IsEditorClick: ('editor' == Area)
            };
            let elm;
            if (!curElm) return result;
            result.IsQuery = (curElm.getAttribute && curElm.getAttribute('data-class') == 'ckcommentsfull');

            if (result.IsEditorClick && result.IsQuery) {
                var loop = 0;
                result.curElm = curElm.parentElement;
                while (result.curElm && !result.curElm.hasAttribute('id')) {
                    result.curElm = result.curElm.parentElement;
                    if (++loop > 10) break;
                }
            }

            if (!result.curElm) return result;

            if (typeof result.curElm == 'object' && result.curElm.nodeType === Node.ELEMENT_NODE) {
                if ($(result.curElm).parents('.front').length || result.curElm.id == DOC_ROOT_ID) result.IsFront = true;

                if ((result.curElm.className.includes('impact')) && (!result.curElm.getAttribute('data-id'))) return result;
                if (!GlobalEditor || !GlobalEditor.document) return result;

                result.myEleId = (result.curElm.hasAttribute('data-id')) ? result.curElm.getAttribute('data-id') : result.curElm.id;

                if (result.curElm.hasAttribute('class') && result.curElm.getAttribute('class').match(/img-fluid-thumbil|btn-header|thumbilArrow|form-control/)) {
                    result.Temp_Id = (Area.match(/pdfButton|thumbilArrow|form-control/)) ? (document.getElementById('currpageno').value) : (result.curElm.id);
                    result.myEleId = SYNC_CLICK_EVENT.IsExitingNodewithMap(result.Temp_Id, PAGE_ID_MAP, Area);
                    elm = GlobalEditor.document.getById(result.myEleId);
                    result.curElm = (elm) ? (elm.$) : null;
                }

                elm = GlobalEditor.document.getById(result.myEleId);

                if (!elm && (result.myEleId || result.Temp_Id) && GlobalEditor.document.$) {
                    var pageNodes = GlobalEditor.document.$.querySelectorAll('[pageid]');
                    for (var i = 0; i < pageNodes.length; i++) {
                        var pageAttr = pageNodes[i].getAttribute('pageid');
                        if (!pageAttr) continue;

                        var pageTokens = pageAttr.split(',').map(function (val) { return val.trim(); });
                        if (pageTokens.includes(String(result.myEleId)) || pageTokens.includes(String(result.Temp_Id))) {
                            elm = new CKEDITOR.dom.element(pageNodes[i]);
                            break;
                        }
                    }
                }
                if ((!result.IsFront) && elm != null) {

                    result.tempPageId = SYNC_CLICK_EVENT.getPDF_PageNo(elm);
                    result.curElm = (elm) ? (elm.$) : null;

                } else if (PAGE_ID_MAP[result.myEleId]) {
                    // If curElm is null, try to incrementally check next page by Temp_Id
                    let tempId = PAGE_ID_MAP[result.myEleId];
                    const pageEnd = PAGE_ID_MAP.pageend;
                    let found = false;
                    while (tempId && tempId !== pageEnd) {
                        // Find the key in PAGE_ID_MAP whose value is tempId
                        let nextKey = Object.keys(PAGE_ID_MAP).find(key => PAGE_ID_MAP[key] == tempId);
                        if (!nextKey) break;
                        // Try to get element by this key
                        elm = GlobalEditor && GlobalEditor.document ? GlobalEditor.document.getById(nextKey) : null;
                        if (elm && elm.$) {
                            result.curElm = elm.$;
                            result.myEleId = nextKey;
                            result.Temp_Id = tempId;
                            found = true;
                            break;
                        }
                        // Increment tempId (as number) with wrapping logic
                        if (curElm && curElm.id === 'leftpagebut') {
                            // Wrap to last page if increment exceeds pageEnd
                            let nextNum = parseInt(tempId, 10) - 1;
                            if (nextNum > parseInt(pageEnd, 10)) {
                                tempId = pageEnd;
                            } else {
                                tempId = nextNum.toString();
                            }
                        } else if (curElm && curElm.id === 'rightpagebut') {
                            // Wrap to first page if decrement below pagestart
                            let prevNum = parseInt(tempId, 10) + 1;
                            let pageStart = PAGE_ID_MAP.pagestart;
                            if (prevNum < parseInt(pageStart, 10)) {
                                tempId = pageStart;
                            } else {
                                tempId = prevNum.toString();
                            }
                        } else {
                            tempId = (parseInt(tempId, 10) + 1).toString();
                        }
                    }
                }
            } else if (typeof result.curElm == 'string') {
                result.myEleId = result.curElm;
            }

            return result;
        } finally {
            // console.timeEnd(label);
        }
    }

    syncPDFAndView(resolved, Area) {
        var label = '_postNav_SyncPDFAndView';
        // console.time(label);
        try {
            if (typeof ImpactView == "undefined") return;

            var mapPageById = PAGE_ID_MAP[resolved.myEleId] || PAGE_MAP_INDEX.getPageByElementId(resolved.myEleId);
            var mapPageByTemp = resolved.tempPageId ? (PAGE_ID_MAP[resolved.tempPageId] || PAGE_MAP_INDEX.getPageByElementId(resolved.tempPageId)) : null;

            var pdfId = (resolved.IsFront && !mapPageById) ?
                PAGE_ID_MAP.pagestart :
                (mapPageById ?
                    mapPageById :
                    (resolved.myEleId == false ? resolved.Temp_Id : mapPageByTemp));

            this._log('syncPDFAndView', {
                area: Area,
                elementId: resolved.myEleId,
                pageId: pdfId,
                isFront: resolved.IsFront
            });

            SYNC_CLICK_EVENT.pdf(pdfId, Area);

            if (resolved.curElm && /pdf/gi.test(ImpactView.getView())) {
                ImpactView.setView('pdf');
            }
        } finally {
            // console.timeEnd(label);
        }
    }

    handleEditorFocus(resolved, Area) {
        var label = '_postNav_HandleEditorFocus';
        // console.time(label);
        try {
            if (!resolved.curElm || !GlobalEditor || !GlobalEditor.document) return;

            var IS_ROOT = (resolved.curElm.id == DOC_ROOT_ID);
            if (['toc', 'thumbil', 'pdfButton'].includes(Area) || IS_ROOT) {
                var ROOT_FIND_QRY = I_CONFIG.querySelector('root').getAttribute('title');
                let elm = IS_ROOT ? GlobalEditor.document.findOne(ROOT_FIND_QRY) : GlobalEditor.document.getById(resolved.myEleId);

                if (elm != null) {
                    if (typeof elm.scrollIntoView === 'function') elm.scrollIntoView(true);
                    SYNC_CLICK_EVENT.setElmFocus(resolved.myEleId);
                }
            }
        } finally {
            // console.timeEnd(label);
        }
    }

    resolveTocId(resolved, Area) {
        var label = '_postNav_ResolveTocId';
        // console.time(label);
        try {
            if (Area === 'toc' || !resolved.curElm || resolved.IsFront) return resolved.myEleId;

            var [e, checkRule] = [GlobalEditor.elementPath(), false];
            var root = e ? (e.blockLimit != null ? e.blockLimit.$ : (e.lastElement ? e.lastElement.$ : null)) : null;

            if (e && root && !['body', 'fn'].includes(root.className)) {
                var finalId = resolved.myEleId;
                var suppNode = $(resolved.curElm).closest('.supplementary-material');
                if (suppNode.length) {
                    const title = suppNode[0].querySelector('.caption .title');
                    if (title && title.id) return title.id;
                }

                Array.from(getTocTitle).forEach((cls, ind) => {
                    if (checkRule) return;
                    var checkParent = $(resolved.curElm).parents(`.${cls}`);
                    var hasClass = resolved.curElm.classList.contains(cls);

                    if (checkParent.length != 0 || hasClass) {
                        checkRule = true;
                        let elm = checkParent.length != 0 ? checkParent[0] : resolved.curElm;
                        finalId = SYNC_CLICK_EVENT.getFloatId(elm, ind);
                    }
                });
                return finalId;
            } else if (e && root && ['body', 'fn'].includes(root.className)) {
                return true;
            }

            return resolved.myEleId;
        } finally {
            // console.timeEnd(label);
        }
    }

    updateTocUi(myEleId, IsFront, Area) {
        var label = '_postNav_UpdateTocUi';
        // console.time(label);
        try {
            var myList = document.querySelectorAll('#toc_list, #lof_list');
            if (!myEleId || IsFront) {
                SYNC_CLICK_EVENT.removeActiveClass(myList);
                return;
            }

            var $myEntry = $(myList).find('[data-id="' + myEleId + '"]');
            var $myNxt = $myEntry.next();

            if ($myEntry.length === 0) return;

            if (!$myEntry.hasClass('active')) {
                SYNC_CLICK_EVENT.removeActiveClass(myList);
                if ($myNxt.hasClass('nested')) $myNxt.addClass('active');

                $myEntry.addClass('active').find('span.fa').attr('class', 'fa fa-angle-down active');

                $myEntry.parents('ul.nested').addClass('active').each(function () {
                    $(this).parents().each(function () {
                        if (this.classList.contains('toc-items')) {
                            var arrowElm = this.querySelector('span span.fa');
                            if (arrowElm) arrowElm.setAttribute('class', 'fa fa-angle-down');
                        }
                    });
                });

                if ($myEntry.parents('.lof-items').length > 0) {
                    $myEntry.parents('.lof-items').find('span.fa').attr('class', 'fa fa-angle-down active');
                }

                if (['editor', 'thumbil', 'pdfButton'].includes(Area) && $myEntry[0]) {
                    if (typeof $myEntry[0].scrollIntoView === 'function') $myEntry[0].scrollIntoView(true);
                }
            } else if ($myEntry.hasClass('active') && Area == 'toc' && $myEntry[0].parentNode.hasAttribute('data-level')) {
                $myNxt.removeClass('active');
                $myEntry.removeClass('active').find('span.fa').attr('class', 'fa fa-angle-right');
            }
        } finally {
            // console.timeEnd(label);
        }
    }

    navigate(curElm, Area, myEleId) {
        if (!curElm) return;

        var overallLabel = 'postNavigation_Total';
        console.time(overallLabel);

        var navId = (typeof curElm === 'string') ? curElm : (curElm.id || myEleId);
        this._log('navigate:start', { area: Area, navId: navId, myEleId: myEleId });
        if (window.POST_NAV_CACHE.id === navId && window.POST_NAV_CACHE.area === Area && !['toc', 'pdfButton'].includes(Area)) {
            this._log('navigate:skip-cache', { area: Area, navId: navId });
            console.timeEnd(overallLabel);
            return;
        }

        window.POST_NAV_CACHE.id = navId;
        window.POST_NAV_CACHE.area = Area;

        try {
            if (typeof ImpactView == "undefined") return;

            // Cleanup tooltip for icon/button based triggers.
            if (curElm && curElm.nextElementSibling && curElm.nextElementSibling.classList.contains("tooltip")) {
                curElm.nextElementSibling.remove();
            }

            var resolved = this.resolveElementAndId(curElm, Area, myEleId);
            if (!resolved.curElm && typeof curElm !== 'string') return;

            this._log('navigate:resolved', {
                area: Area,
                resolvedId: resolved.myEleId,
                isFront: resolved.IsFront,
                tempPageId: resolved.tempPageId || null
            });

            this.syncPDFAndView(resolved, Area);
            if (!resolved.curElm) return;

            this.handleEditorFocus(resolved, Area);

            var tocId = this.resolveTocId(resolved, Area);
            this.updateTocUi(tocId, resolved.IsFront, Area);
            this._log('navigate:done', { area: Area, tocId: tocId });
        } catch (err) {
            console.warn('[postNavigation] Error:', err.message);
            if (typeof ErrorLogTrace === 'function') ErrorLogTrace('postNavigation', err.message);
        } finally {
            console.timeEnd(overallLabel);
        }
    }
}



window.EDITOR_NAV_SYNC = window.EDITOR_NAV_SYNC || new EditorNavigationSyncModule();

window.runEditorNavSyncSmokeTest = function () {
    var report = {
        hasModule: !!window.EDITOR_NAV_SYNC,
        hasPostNavigation: typeof postNavigation === 'function',
        hasPageMapIndex: typeof PAGE_MAP_INDEX !== 'undefined',
        hasPageMap: typeof PAGE_ID_MAP !== 'undefined' && !!PAGE_ID_MAP,
        hasEditor: typeof GlobalEditor !== 'undefined' && !!GlobalEditor,
        hasTocList: !!document.querySelector('#toc_list'),
        hasFloatsList: !!document.querySelector('#lof_list'),
        hasThumbSection: !!document.querySelector('#iPdfThumbnail_Section'),
        hasPdfSection: !!document.querySelector('.pdf-section'),
        hasPrevBtn: !!document.getElementById('leftpagebut'),
        hasNextBtn: !!document.getElementById('rightpagebut')
    };

    var ok = Object.keys(report).every(function (key) { return report[key] === true; });
    console.log('[EDITOR_NAV_SYNC] Smoke Test', { ok: ok, report: report });
    return { ok: ok, report: report };
};

function postNavigation(curElm, Area, myEleId) {
    window.EDITOR_NAV_SYNC.navigate(curElm, Area, myEleId);
}
