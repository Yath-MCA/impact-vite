class TooltipModule {
    static XREF_DATA_NAMES = ['xref', 'related-object'];
    static LINK_DATA_NAMES = ['uri', 'ext-link', 'email'];
    static SHOW_XREF_TYPES = ['endnote', 'footnote', 'fn', 'bibr', 'fig', 'table', 'section', 'video', 'audio', 'end-note', 'chapter', 'section', 'box-text', 'supplementary-material', 'part'];
    static BLOCK_TAGS = ['div', 'p', 'th', 'td', 'thead', 'tr'];

    constructor(name, errorTracker, options = {}) {
        this.LAST_ARRAY = [];
        this.Panel = document.getElementById("xToolTip");
        this.errorTracker = errorTracker;
    }

    trackError(fnName, message) {
        try {
            if (typeof ErrorLogTrace === 'function') {
                ErrorLogTrace(fnName, message);
            } else {
                console.warn(fnName, message);
            }
        } catch (err) {
            console.warn(fnName, message);
        }
    }
    isValidXrefType(type) {
        return TooltipModule.SHOW_XREF_TYPES.includes(type);
    }
    isXrefDataName(name) {
        return TooltipModule.XREF_DATA_NAMES.includes(name);
    }

    /** Classify hover node before insert/sup unwrap (matches legacy order). */
    classifyHoverNode(node, eTag, eName) {
        let isLink = eTag === 'span' && TooltipModule.LINK_DATA_NAMES.includes(eName);
        if (isLink) {
            const dataLink = node.getAttribute('data-link');
            isLink = !(dataLink && dataLink === 'remove');
        }
        return {
            isLink,
            isOrcid: eTag === 'div' && node.hasAttribute('contrib-id'),
            isDelete: !!(node.$.closest('del') || node.getAttribute('data-remove')),
            root: node.$.closest('div.body') || node.$.closest('div.book-body')
        };
    }

    shouldAbortBeforeUnwrap(node, eTag, {
        isLink,
        isOrcid,
        isDelete,
        root
    }) {
        const invalidContext = !node || TooltipModule.BLOCK_TAGS.includes(eTag) || !root;
        return (invalidContext && !isLink && !isOrcid) || isDelete;
    }

    /**
     * If hover landed on insert/sup wrapping an xref, resolve to the anchor.
     * Parent tag from the original hover node is intentionally not refreshed.
     */
    unwrapInsertOrSup(node, eTag, eName, parent, parentTag) {
        if ((eTag === 'insert' || eTag === 'sup') && (node.find('a').$.length || parentTag === 'a')) {
            node = parentTag === 'a' ? parent : node.findOne('a');
            if (!node) return null;
            return {
                node,
                eTag: node.getName(),
                eName: node.getAttribute('data-name')
            };
        }
        return {
            node,
            eTag,
            eName
        };
    }

    getPopupType(node) {
        return node.getAttribute('ref-type') || node.getAttribute('data-role') || '';
    }

    getPopupRid(node, {
        isLink,
        isOrcid
    }) {
        const attr = isLink ? 'xlink:href' : isOrcid ? 'contrib-id' : 'rid';
        return node.getAttribute(attr);
    }

    needsCiteListRefresh(e) {
        if (!this.Panel) return true;
        return (
            (IS_JOURNAL && /mouse/gi.test(e.name)) || this.Panel.childNodes.length === 0 || /http|www/gi.test(this.Panel.childNodes[0].textContent)
        );
    }

    escapeTooltipHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /** Resolve float/ref text from live editor DOM when CitationNewModule is unavailable (Track View). */
    formatDomTooltipEntry(el, id) {
        let text = '';
        const mixed = el.querySelector('.mixed-citation, [data-name="mixed-citation"]');
        const caption = el.querySelector('.caption, [data-name="caption"]');
        const label = el.querySelector('.label, [data-name="label"]');
        if (mixed) {
            text = mixed.textContent || '';
        } else if (caption) {
            text = `${label ? label.textContent : ''} ${caption.textContent || ''}`.trim();
        } else if (label) {
            text = label.textContent || '';
        } else {
            text = el.textContent || '';
        }
        text = text.replace(/\s+/g, ' ').trim();
        if (text.length > 220) text = `${text.slice(0, 217)}...`;
        return `<span class="hide" data-rid="${this.escapeTooltipHtml(id)}">${this.escapeTooltipHtml(text)}</span>`;
    }

    /**
     * Ensure #xToolTip has entries for the given rids (Track View DOM fallback).
     * Appends only missing ids so later hovers still work after the first paint.
     */
    ensureDomRefTips(rArr) {
        try {
            if (!this.Panel || !GlobalEditor || !GlobalEditor.document) return;
            const doc = GlobalEditor.document.$;
            const missing = [];

            for (const rawId of rArr) {
                if (!rawId) continue;
                const id = String(rawId).split(/\r|\n|\s/)[0];
                if (!id) continue;
                if (this.Panel.querySelector(`[data-rid*="${id.replace(/"/g, '')}"]`)) continue;

                let el = null;
                try {
                    el = doc.getElementById(id);
                } catch (err) {
                    el = null;
                }
                if (!el) continue;
                missing.push(this.formatDomTooltipEntry(el, id));
            }

            if (!missing.length) return;
            this.Panel.append(document.createRange().createContextualFragment(missing.join('')));
        } catch (err) {
            console.warn(err.message);
            this.trackError('ensureDomRefTips', err.message);
        }
    }

    hasCitationCreateCiteList() {
        return (
            typeof CitationNewModule !== 'undefined' &&
            CitationNewModule &&
            CitationNewModule['M_FUN'] &&
            typeof CitationNewModule['M_FUN'].CreateCiteList === 'function'
        );
    }
    /** Build/refresh panel content; return rid list (possibly expanded via SiblingXref). */
    preparePopupPanel(node, e, eType, rArr, isRef) {
        if (isRef) {
            if (this.hasCitationCreateCiteList()) {
                if (this.needsCiteListRefresh(e)) {
                    CitationNewModule['M_FUN'].CreateCiteList(GlobalEditor.getData(), true);
                    return this.SiblingXref(node, eType, rArr);
                }
                return rArr;
            }
            // Track View: no CitationNewModule — build tips from live editor DOM by rid
            const expanded = this.SiblingXref(node, eType, rArr);
            this.ensureDomRefTips(expanded);
            return expanded;
        }
        this.generateToolTip();
        return rArr;
    }

    getHeight(x, y) {
        try {
            let topBot = {};
            const I_CKE_FRAME = GlobalEditor.window.getFrame();
            const I_CLIENTREACT = I_CKE_FRAME.getClientRect(true);

            const TOP_PX = y + I_CLIENTREACT.top;
            const LEFT_PX = x + I_CLIENTREACT.left;

            const PAGE_HEIGHT = document.documentElement.clientHeight;
            const PAGE_WIDTH = document.documentElement.clientWidth;

            const TIP_HEIGHT = this.Panel.offsetTop + this.Panel.offsetHeight;
            const TIP_WIDTH = this.Panel.offsetLeft + this.Panel.offsetWidth;

            const BOTTOM_PX = PAGE_HEIGHT - this.Panel.offsetTop;
            const RIGHT_PX = LEFT_PX - this.Panel.offsetWidth;

            const IS_ABOVE = PAGE_HEIGHT < TIP_HEIGHT;
            const IS_RIGHT = PAGE_WIDTH < TIP_WIDTH;

            return {
                top: IS_ABOVE ? 'auto' : `${TOP_PX + 15}px`,
                bottom: IS_ABOVE ? `${BOTTOM_PX + 15}px` : 'auto',
                left: IS_RIGHT ? `${RIGHT_PX}px` : `${LEFT_PX}px`
            };
        } catch (err) {
            console.warn(err.message);
            this.trackError('TOOL_TIP', err.message);
            return {};
        }
    }

    show(e, arr) {
        try {
            this.Panel.querySelectorAll('.show').forEach((entry) => {
                entry.classList.remove('show');
                entry.classList.add('hide');
            });

            arr.forEach((id) => {
                const split = id.split(/\r|\n|\s/);
                id = split.length > 1 ? split[0] : id;

                const entry = this.Panel.querySelector(`[data-rid*="${id}"]`);
                if (entry) {
                    entry.classList.remove('hide');
                    entry.classList.add('show');
                }
            });

            const I_CKE_FRAME = GlobalEditor.window.getFrame();
            const I_CLIENTREACT = I_CKE_FRAME.getClientRect(true);

            const TEMP_T_PX = `${e.data.$.clientY + I_CLIENTREACT.top}`;
            const TEMP_L_PX = `${e.data.$.clientX + I_CLIENTREACT.left}`;
            const NEW_SIZE = this.getHeight(e.data.$.clientX, e.data.$.clientY);
            const CKE = iGetElmById('cke_1_contents');

            const IS_MAXIMIZE = CKE ? CKE.classList.contains('maxiview') : false;

            this.Panel.classList.remove('hide', 'invisible');
            this.Panel.style.cssText = `
                left: ${NEW_SIZE.left};
                top: ${NEW_SIZE.top};
                bottom: ${NEW_SIZE.bottom};
            `;
            this.Panel.classList[IS_MAXIMIZE ? 'add' : 'remove']('maxiview');
            this.Panel.classList.add('show');
        } catch (err) {
            this.trackError('TOOL_TIP_SHOW', err.message);
            console.warn(err.message);
        }
    }

    hide() {
        try {
            if (this.Panel.classList.contains("hide")) return;

            this.Panel.classList.remove('show');
            this.Panel.classList.add('hide');

            this.Panel.querySelectorAll('.show').forEach((entry) => {
                entry.classList.remove('show');
                entry.classList.add('hide');
            });
        } catch (err) {
            this.trackError('TOOL_TIP', err.message);
            console.warn(err.message);
        }
    }

    append(Arr) {
        try {
            if (commonMethods.compareArray(this.LAST_ARRAY, Arr) && this.Panel.childElementCount === Arr.length) return;

            this.LAST_ARRAY = Arr;
            this.Panel.innerHTML = '';

            const toolTipData = document.createRange().createContextualFragment(Arr.join(''));
            this.Panel.append(toolTipData);
        } catch (err) {
            this.trackError('TOOL_TIP', err.message);
            console.warn(err.message);
        }
    }

    IsElmNode(i) {
        return i.$.nodeType === Node.ELEMENT_NODE;
    }

    IsTxtNode(i) {
        return i.$.nodeType === Node.TEXT_NODE;
    }

    TxLength(i) {
        return i.$.textContent.length;
    }

    IsXrefNode(i) {
        return this.IsElmNode(i) ? i.getName() === 'a' : false;
    }

    IsExistRid(m, rArr) {
        return rArr.includes(m.hasAttribute('rid') ? m.getAttribute('rid') : false);
    }

    SiblingXref(a, b, rArr) {
        try {
            let [next, prev, loop] = [a.getNext(), a.getPrevious(), 0];

            [next, prev].forEach((item, index) => {
                while (
                    item != null &&
                    ((this.IsTxtNode(item) && this.TxLength(item) < 10) ||
                        (this.IsElmNode(item) && this.IsXrefNode(item))) &&
                    loop < 6
                ) {
                    loop++;
                    let temp = (
                        this.IsTxtNode(item) ||
                        (this.IsElmNode(item) && this.IsExistRid(item, rArr))
                    ) ? item[index === 0 ? 'getNext' : 'getPrevious']() : item;

                    if (temp == null) return;

                    temp = this.IsTxtNode(temp) ?
                        (temp[index === 0 ? 'getNext' : 'getPrevious']()) :
                        (temp);

                    if (temp == null) return;

                    if (
                        temp != null &&
                        this.IsXrefNode(temp) &&
                        temp.$.hasAttribute('rid')
                    ) {
                        let tempArr = ['fig', 'table'];
                        let x = temp.getAttribute('rid');
                        let y = temp.getAttribute('ref-type');

                        let IsFloat = tempArr.includes(x);
                        let IsSibilingFloat = tempArr.includes(y);
                        let CanAdd = false;

                        if (IsFloat && IsSibilingFloat) CanAdd = true;
                        else if (b === y) CanAdd = true;

                        if (x && CanAdd) {
                            x = x.split(' ');
                            rArr = [...x, ...rArr];
                            rArr = rArr.filter(Boolean);
                            item = temp[index === 0 ? 'getNext' : 'getPrevious']();

                            if (item == null) return;
                        }
                    } else if (item == null || item === undefined || loop < 6) {
                        break;
                    }
                }
            });

            return rArr;
        } catch (err) {
            console.warn(err.message);
            this.trackError('SiblingXref', err.message);
            return rArr;
        }
    }

    IsPopUpTime(target, e) {
        try {
            debug.log("--IsPopUpTime--");

            let node = target || e.data.getTarget();
            let eTag = node.getName();
            const parent = node.getParent();
            const parentTag = parent.getName();
            let eName = (node.hasAttribute('data-name') ? node : parent).getAttribute('data-name');

            const kind = this.classifyHoverNode(node, eTag, eName);
            if (this.shouldAbortBeforeUnwrap(node, eTag, kind)) return;

            const unwrapped = this.unwrapInsertOrSup(node, eTag, eName, parent, parentTag);
            if (!unwrapped) return;
            ({
                node,
                eTag,
                eName
            } = unwrapped);

            const isRef = eTag === 'a' && (node.hasAttribute('ref-type') || node.hasAttribute('rid'));
            // parentTag is from the pre-unwrap hover node (legacy)
            if ((!node || parentTag === 'del' || !isRef) && !kind.isLink && !kind.isOrcid) return;

            const eType = this.getPopupType(node);
            const rid = this.getPopupRid(node, kind);
            if (!rid) return;

            const rArr = rid.split(' ').filter(Boolean);
            const canShow =
                (eTag === 'a' && this.isXrefDataName(eName) && TooltipModule.SHOW_XREF_TYPES.includes(eType)) ||
                kind.isLink ||
                kind.isOrcid;

            if (!canShow) return;

            this.show(e, this.preparePopupPanel(node, e, eType, rArr, isRef));
        } catch (err) {
            this.trackError('IsPopUpTime', err.message);
            console.warn(err.message);
        }
    }

    forceRefreshPanel(updatedData = '') {
        try {
            if (!this.Panel) this.Panel = document.getElementById("xToolTip");
            if (typeof this.hide === 'function') this.hide();
            this.LAST_ARRAY = [];

            this.generateToolTip();

            if (
                typeof CitationNewModule !== 'undefined' &&
                CitationNewModule &&
                CitationNewModule.M_FUN &&
                typeof CitationNewModule.M_FUN.CreateCiteList === 'function'
            ) {
                const data = updatedData || (typeof GlobalEditor !== 'undefined' && GlobalEditor && typeof GlobalEditor.getData === 'function' ? GlobalEditor.getData() : '');
                CitationNewModule.M_FUN.CreateCiteList(data, true);
            }
        } catch (err) {
            console.error('Error in forceRefreshPanel:', err);
            this.trackError('forceRefreshPanel', err.message);
        }
    }

    generateToolTip() {
        try {
            const selector = 'span.uri, span.email, span.ext-link, div.contrib[contrib-id]';
            const elements = GlobalEditor.document.find(selector).toArray();

            // Build tooltip content
            const tooltipContent = elements.map(elm => {
                const isHref = elm.getAttribute('data-link') !== 'remove';
                const isOrcid = elm.hasAttribute('contrib-id');
                let link = '';

                if (isHref && !isOrcid) {
                    link = elm.getAttribute('xlink:href') || '';
                } else if (isOrcid) {
                    link = elm.getAttribute('contrib-id') || '';
                } else {
                    link = elm.getAttribute('rid') || '';
                }

                // Return formatted HTML string
                return link ? `<span class="hide" data-rid="${link}">${link}</span>` : '';
            }).join('');

            // Create fragment and append to the panel
            const frag = this.getFragment(tooltipContent);
            $(this.Panel).html("").append(frag);
        } catch (err) {
            console.error('Error in generateToolTip:', err);
            this.trackError('generateToolTip', err.message);
        }
    }


    getFragment(template) {
        const temp = document.createElement('template');
        temp.innerHTML = template.trim();
        return temp.content;
    }
}

export default TooltipModule;