var IS_EXIST = function(array1, key, eqValue, returnEntry = false, findId = false) {
    try {
        if (eqValue.indexOf("CIT") > -1 && !findId) eqValue = parseInt(eqValue.replace(/[^\d.]/g, "")).toString();
        return array1[returnEntry ? 'filter' : 'some']((Entry, index1, arr) => {
            return Entry[key] == eqValue;
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('IS_EXIST', err.message);
    }
};
var get_new_id = function(index) {
    try {
        return 'CIT' + ((index + 1).toString()).lpad("0", 4);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('get_new_id', err.message);
    }
};
document.addEventListener("DOMContentLoaded", function(event) {
    window.CHECK_ORDER = {
        get: {
            ref: "id",
            xref: "rid",
        },
        glob_selector: [".ref:not([data-remove])", 'a.xref[data-role]:not([data-remove])'],
        find_only_bibr: ['a.xref[data-role="bibr"]:not([data-remove])'],
        float_role: ['fig', 'table'],
        valid_role: ['bibr', 'fig', 'table'],
        ignore_role: ['app', 'aff', 'corresp', 'table-fn', 'sec'],
        ref: [],
        unlinkedRef: [],
        deletedRef: [],
        xref: [],
        history: {},
        instance_id: null,
        reOrder: false,
        get_new_id: get_new_id,
        reset: function() {
            try {
                this.ref = [];
                this.unlinkedRef = [];
                this.xref = [];
                this.deletedRef = [];
                this.reOrder = false;
                this.instance_id = new Date().getTime();
                if (this.instance_id) this.history[this.instance_id] = {
                    reset: true,
                    forLoop: false,
                    check_seq: false
                };
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('reset', err.message);
            }
        },
        unit: {
            insert_new: function(Options = {}, $this) {
                $this = this;
                if ($this._.xref.length == 0) {
                    $this._.fire();
                }
                var parentNode;
                let cite = Array.from(parentNode.querySelectorAll('.xref')),
                    rlen = $this._.ref.length,
                    clen = cite.length,
                    time = new Date(),
                    newid = get_new_id(rlen),
                    lab = rlen + 1,
                    cite_loc = ['after', 'before'],
                    r_template = GetFragment(`<div class="ref" data-new="" id="${newid}"><span class="label" data-value="${lab}">${lab}</span><span>${time}</span>.</div>`),
                    x_template = GetFragment(`<a class="xref" rid="${newid}" href="#${newid}">${lab}</a>,`);
                let random_ref = $this._.ref[Math.floor(Math.random() * rlen)],
                    random_cite = cite[Math.floor(Math.random() * clen)],
                    random_place = cite_loc[Math.floor(Math.random() * cite_loc.length)];
                //random_ref.element.after(r_template.firstElementChild);
                let appendGroup = parentNode.querySelector(".ref-list");
                appendGroup.appendChild(r_template.firstElementChild);
                random_cite[random_place]((cite_loc[0] == random_place ? ',' : ''), x_template.firstElementChild, (cite_loc[0] == random_place ? '' : ','));
                console.log("references inserted");
                $this._.fire();
            },
            delete_: function(Options = {}, $this) {
                $this = this;
                alert("WORKING PROGRESS");
                console.log("references deleted");
            },
            append_commends: function(selector) {
                selector = selector ? selector : [`sup insert`];
                try {
                    var replace_selector = selector;
                    replace_selector.forEach((selector, index, array) => {
                        GlobalEditor.document.find(selector).toArray().forEach((el, idx, arr) => {
                            let sup = el.getAscendant("sup", !0),
                                parent = el.getParent(),
                                IsInsert = parent.getName() == "insert",
                                IsOnlyChild = parent.getChildCount() == 1;
                            if (IsInsert && IsOnlyChild && sup) {
                                parent.insertBefore(sup);
                            } else {
                                /* 
                                <insert class="ice-ins ice-cts-1" data-cid="4" data-userid="1" data-rolename="Author" data-username="caitriona.goggin1@hse.ie" data-changedata="" data-time="1721851627062" data-last-change-time="1721853009305"><sup class="sup" data-name="sup"><a class="xref" data-name="xref" data-role="bibr" ref-type="bibr" rid="CIT0020" ztxt="16,24" data-del-val="16" data-cke-saved-href="#CIT0016" href="#CIT0016">
                                                <insert class="ice-ins ice-cts-2" data-changedata="" data-cid="76" data-last-change-time="1722528755728" data-time="1722528755734" data-userid="2" data-username="collation@nkw.pub" data-rolename="Collator">20</insert>
                                            </a><span data-class="ckcommentsfull" data-label="C6" data-status="note" id="Ne9ac"><span data-name="Response" data-role="Author" data-user-comment-box="Citation number should be 20" data-time="1721853009286" data-username="caitriona.goggin1@hse.ie" data-rolename="Author">&nbsp;</span></span>​​​​​​​</sup></insert>
                                


                                            <insert class="ice-ins ice-cts-1" data-cid="11" data-userid="1" data-rolename="Author" data-username="caitriona.goggin1@hse.ie" data-changedata="" data-time="1721850858441" data-last-change-time="1721853051208"><sup class="sup" data-name="sup"><a class="xref" data-name="xref" data-role="bibr" ref-type="bibr" rid="CIT0021" fid="f105" data-cke-saved-href="#CIT0021" href="#CIT0021">21</a><span data-class="ckcommentsfull" data-label="C7" data-status="note" id="Ndb6b"><span data-name="Response" data-role="Author" data-user-comment-box="Citation number should be 21" data-time="1721853051188" data-username="caitriona.goggin1@hse.ie" data-rolename="Author">&nbsp;</span></span></sup></insert>
                                */
                                if (!IsOnlyChild && IsInsert) {
                                    console.log(parent);
                                }
                            }
                        });
                    });
                } catch (err) {
                    console.error(err.message);
                } finally {
                    console.log("===finally====");
                }
            },
            revert_xref_attribute_based: function() {
                try {
                    const xref_selector = `a[ref-type='bibr'][data-del-val]`;
                    const ref_label_selector = `.ref-list div.ref[oid] span.label`;

                    // === 1. Handle xrefs ===
                    GlobalEditor.document.find(xref_selector).toArray().forEach(el => {
                        const elNode = el.$;
                        const updateVal = elNode.getAttribute("data-del-val");

                        if (!updateVal) return;

                        const rid = updateVal.getBibId ? updateVal.getBibId() : "";
                        if (!rid) return;

                        // Generate expanded rid if it contains dash
                        let finalRid = rid;
                        if (updateVal.isContainsDash && updateVal.isContainsDash()) {
                            finalRid = updateVal.expandNumbers()
                                .map(num => 'CIT' + String(num).lpad("0", 4))
                                .join(" ")
                                .trim();
                        }

                        // Set text content
                        const textTarget = elNode.querySelector("sup") || elNode;
                        if (textTarget) {
                            textTarget.textContent = updateVal;
                        }

                        // Update attributes
                        commonMethods.SET_REMOVE_ATTR(elNode, {
                            rid: finalRid,
                            href: finalRid
                        }, ['data-cke-saved-href', 'data-del-val']);
                    });

                    // === 2. Handle ref labels inside .ref-list ===
                    GlobalEditor.document.find(ref_label_selector).toArray().forEach(el => {
                        const labelNode = el.$;
                        const parent = labelNode.closest("div.ref");

                        if (!parent) return;

                        const oid = parent.getAttribute("oid");
                        if (oid) {
                            parent.removeAttribute("oid");
                            parent.setAttribute("id", oid);
                        }
                    });

                } catch (err) {
                    console.error("Error in revert_to_renumber_xref:", err.message);
                } finally {
                    console.log("===finally: revert_to_renumber_xref===");
                }
            },
            fromCiteIdex: function(startFrom = 30) {
                try {
                    const startFrom = 30;
                    let currentNumber = startFrom;
                    const citations = [...GlobalEditor.document.$.querySelectorAll('a.xref[ref-type="bibr"]')];

                    citations.forEach((aTag) => {
                        const ridAttr = aTag.getAttribute('rid');
                        if (!ridAttr) return;

                        const ridList = ridAttr.trim().split(/\s+/);

                        // Skip if any rid is less than CIT0030
                        const hasRidBelow = ridList.some(rid => {
                            const match = /^CIT(\d{4})$/.exec(rid);
                            return match && parseInt(match[1], 10) < startFrom;
                        });
                        if (hasRidBelow) return console.log(" return", ridList);

                        const oldText = aTag.textContent.trim();
                        const oldRid = ridAttr;

                        const newRids = [];
                        const newNums = [];

                        for (let i = 0; i < ridList.length; i++) {
                            const newId = `CIT${String(currentNumber).padStart(4, '0')}`;
                            newRids.push(newId);
                            newNums.push(currentNumber);
                            currentNumber++;
                        }

                        // IEEE-style label
                        let newLabel = newNums.length === 1 ?
                            `${newNums[0]}` :
                            `${newNums[0]}–${newNums[newNums.length - 1]}`;

                        const ins = window._trackManager.getInsNode();
                        ins.textContent = newLabel;

                        aTag.setAttribute("data-del-val", oldRid);
                        aTag.setAttribute("ztxt", oldText);
                        aTag.setAttribute("rid", newRids.join(" "));
                        aTag.setAttribute("href", `#${newRids.join(" ")}`);
                        aTag.innerHTML = '';
                        aTag.appendChild(ins);
                    });

                } catch (error) {

                }
            },
            revert_xref_original_doc_based: function() {
                try {
                    const para_selector = 'div.p, span.p';
                    const xref_selector = 'a.xref[ref-type="bibr"]';
                    const ref_label_selector = '.ref-list div.ref[oid] span.label';

                    // === 1. Restore xrefs inside paragraphs ===
                    const originalParas = {};
                    queryRestore.contexts.original.domCache.querySelectorAll(para_selector).forEach(para => {
                        if (para.id) originalParas[para.id] = para;
                    });

                    GlobalEditor.document.find(para_selector).toArray().forEach(paraEl => {
                        const para = paraEl.$;
                        const paraId = para.id;
                        const orgPara = originalParas[paraId];

                        if (!paraId || !orgPara) return;

                        const curXrefs = para.querySelectorAll(xref_selector);
                        const orgXrefs = orgPara.querySelectorAll(xref_selector);

                        curXrefs.forEach((curXref, idx) => {
                            const orgXref = orgXrefs[idx];
                            if (orgXref) {
                                curXref.replaceWith(orgXref.cloneNode(true));
                            }
                        });
                    });

                    // === 2. Restore ref labels inside .ref-list ===
                    const curLabels = GlobalEditor.document.find(ref_label_selector).toArray();
                    curLabels.forEach(curEl => {
                        const curLabel = curEl.$;
                        const curParent = curLabel.parentElement;
                        const oid = curParent.getAttribute("oid");

                        if (oid) {
                            const orgLabel = queryRestore.contexts.original.domCache.querySelector(
                                `.ref-list [id="${oid}"] span.label`
                            );

                            if (orgLabel) {
                                curLabel.replaceWith(orgLabel.cloneNode(true));
                                curParent.removeAttribute("oid");
                                curParent.setAttribute("id", oid);
                            }
                        }
                    });

                } catch (err) {
                    console.error("Error in revert_from_original_doc_xref:", err.message);
                } finally {
                    console.log("===finally: revert_from_original_doc_xref===");
                }
            }

        },
        fn: {
            forLoop: function(el, Options = {}, $this) {
                $this = this;
                try {
                    const elKey = el.className,
                        findKey = $this._.get[el.className],
                        tempVal = el.getAttribute(findKey),
                        IS_XREF = (/xref/).test(elKey),
                        split = tempVal.split(" ");
                    split.forEach((rid) => {
                        let tempCheck = IS_EXIST($this._[elKey], 'Orginal', rid);
                        let lab = parseInt(rid.replace(/[^\d.]/g, "")).toString();
                        if (IS_XREF) {
                            if (!tempCheck) {
                                $this._[elKey].push({
                                    Orginal: lab,
                                    OrginalID: "",
                                    Renumbered: "",
                                    index: 0,
                                    id: "",
                                });
                            }
                        } else {
                            lab = (el.querySelector(".label") ? el.querySelector(".label").textContent.replace(/[^\d]/g, "") : "");
                            let entry = IS_EXIST($this._['xref'], "Orginal", lab, true);
                            if (!tempCheck) {
                                $this._[elKey].push({
                                    label: lab,
                                    element: el,
                                    SeqNo: -1
                                });
                            }
                            if (entry.length > 0) {
                                entry[0]["OrginalID"] = el.id.trim();
                            } else if (entry.length == 0) {
                                $this._.unlinkedRef.push(lab ? lab : el.id.trim());
                                $this._['xref'].push({
                                    Orginal: lab,
                                    OrginalID: el.id.trim(),
                                    Renumbered: '',
                                    index: 0,
                                    id: ''
                                });

                            }
                        }
                    });
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('forLoop', err.message);
                }
            },
            check_seq: function(editorDoc, Options = {}, $this) {
                $this = this;
                debug.log("CHECK_SEQ . . .");
                try {
                    $this._.xref.forEach((el, index) => {
                        el["Renumbered"] = parseInt(index) + 1;
                        el["index"] = index;
                    });
                    $this._.xref.forEach((xref, index) => {
                        $this._.ref.forEach((ref, ind) => {
                            if (ref["label"] == xref["Orginal"]) {
                                ref["SeqNo"] = xref["index"];
                            }
                        });
                    });
                    $this._.proper_sequence = $this._.ref.every((item, index, array) => {
                        return ((item.SeqNo == index) && (parseInt(item.label) == (index + 1)));
                    });
                    Object.assign($this._.history[$this._.instance_id], {
                        'proper_sequence': $this._.proper_sequence,
                        'check_seq': !0,
                        'unlinkedRef': $this._.unlinkedRef
                    });
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('check_seq', err.message);
                }
            },
            reorder_fire: function(editorDoc, Options = {}, $this) {
                $this = this;
                debug.log("<---REORDER_START--->");
                let {
                    reNumber,
                    fromRefDel
                } = Options;
                try {
                    if (reNumber && !$this._.proper_sequence) {
                        let findKey = '.ref',
                            appendGroup = editorDoc.findOne(".ref-list");
                        //console.log(parentNode.querySelectorAll(".ref").length);
                        $this._.ref = $this._.ref.sort(function(a, b) {
                            return a.SeqNo - b.SeqNo;
                        });

                        editorDoc.find(findKey).toArray().forEach((ref, index, array) => {
                            if (ref.hasAttribute('data-remove')) {
                                $this._.deletedRef.push(ref);
                            }
                            ref.remove();
                        });
                        $this._.ref.forEach(el => {
                            debug.log("--appending---" + el["element"].id);
                            $(appendGroup.$).append(el["element"]);
                        });


                        // ? REFERENCE LIST RE-NUMBERING
                        editorDoc.find(findKey).toArray().forEach((ref, index, array) => {
                            let data_json = IS_EXIST($this._.xref, 'OrginalID', ref.$.id, true, true),
                                newId = get_new_id(index);
                            debug.log(newId);
                            if (!data_json[0]) return false;
                            data_json[0]["id"] = newId;
                            if (data_json[0]['Orginal'] == data_json[0]['Renumbered']) return debug.log('no difference');
                            UPDATE_LABEL(ref.$, {
                                new_id: newId,
                                new_lab: data_json[0]["Renumbered"]
                            });
                        });

                        // ? REFERENCE CITATION RE-NUMBERING
                        editorDoc.find($this._.find_only_bibr).toArray().forEach((elm, index, array) => {
                            if (elm.getParent().getName() == "del") return;
                            let cite_text = elm.getText(),
                                cite_rid = elm.getAttribute("rid"),
                                cite_new_txt = "",
                                cite_new_txt_1 = "",
                                cite_new_rid = "";
                            if (cite_text.length > 0) {
                                Array.from(cite_rid.split(' ')).forEach((txt, ind, arr) => {
                                    var data_json = IS_EXIST($this._.xref, 'Orginal', txt, true);
                                    if (!data_json[0]) return false;
                                    cite_new_rid = cite_new_rid.concat(' ', data_json[0]["id"]);
                                    cite_new_txt_1 = cite_new_txt_1.concat(' ', data_json[0]["Renumbered"]);
                                });
                                let tempTxt = cite_new_txt_1.trim().split(` `).map(x => +x).sort(function(a, b) {
                                    return a - b;
                                });
                                cite_new_txt = this._.formatter.formatRanges(tempTxt);
                                cite_new_rid = cite_new_rid.trim();
                                if (IS_LOCAL_HOST) elm.scrollIntoView();
                                if (cite_new_txt.length > 0 && cite_rid != cite_new_rid) {
                                    this.updateCitation(elm, cite_new_txt, cite_new_rid);
                                }
                            }
                        });

                        $this._.deletedRef.forEach(ref => {
                            let del_rid = ref.getAttribute('del_id'),
                                node = null;
                            debug.log("-deleted-ref-appending---" + del_rid);
                            if (del_rid && editorDoc.getById(del_rid)) {
                                node = editorDoc.getById(del_rid);
                            } else {
                                node = appendGroup.getLast();
                            }
                            if (node) ref.insertAfter(node);
                        });
                        $this._.history[$this._.instance_id]['can_reorder'] = !0;
                    }

                    // ? LAST-PASS: compress already-renumbered consecutive cite groups
                    // this.compressConsecutiveCitations(editorDoc, $this);
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('reorder_fire', err.message);
                }
            },
            compressConsecutiveCitations(editorDoc, $this) {
                /*
                    Allow comma-only separators, including bracket/parenthesis boundaries.
                    Examples: ",", " , ", "], [", "), (" 
                */
                try {

                    const selector = ($this && $this._ && $this._.find_only_bibr) ?
                        $this._.find_only_bibr.join(",") :
                        'a.xref[data-role="bibr"]:not([data-remove])';

                    const config = ($this && $this.config && $this.config.indircite) ?
                        $this.config.indircite : {};

                    const formatter = new RangeFormatter({
                        consecutiveThreshold: config.consecutiveThreshold || 3,
                        double_sep: config.double_sep || config.separate || ',',
                        range_sep: config.range_sep || '–',
                        last_sep: config.last_sep || config.multiplesep || ','
                    });

                    const threshold = formatter.options.consecutiveThreshold || 3;
                    const MAX_DESCENDANT_SCAN = 120;
                    const debugConsecutiveCitations = !!(
                        config.debugConsecutiveCitations ||
                        window.DEBUG_CONSECUTIVE_CITATIONS
                    );
                    const debugLog = (...args) => {
                        if (debugConsecutiveCitations) {
                            console.log('[compressConsecutiveCitations]', ...args);
                        }
                    };

                    const findAnchorInContainer = (node) => {

                        if (!node || node.nodeType !== 1) {
                            return null;
                        }

                        if (node.tagName && node.tagName.toLowerCase() === 'a') {
                            return node;
                        }

                        if (typeof document === 'undefined' ||
                            typeof document.createTreeWalker !== 'function') {
                            return typeof node.querySelector === 'function' ?
                                node.querySelector(selector) :
                                null;
                        }

                        const walker = document.createTreeWalker(
                            node,
                            NodeFilter.SHOW_ELEMENT
                        );

                        let current = walker.currentNode;
                        let scanned = 0;

                        while (current && scanned < MAX_DESCENDANT_SCAN) {

                            if (current !== node &&
                                current.tagName &&
                                current.tagName.toLowerCase() === 'a' &&
                                typeof current.matches === 'function' &&
                                current.matches(selector)) {
                                return current;
                            }

                            current = walker.nextNode();
                            scanned++;
                        }

                        return null;
                    };

                    const getCitationAnchor = (node) => {

                        if (!node || node.nodeType !== 1) {
                            return null;
                        }

                        let anchor = findAnchorInContainer(node);

                        if (!anchor) {
                            return null;
                        }

                        if (anchor.hasAttribute('data-remove')) {
                            return null;
                        }

                        if (anchor.closest &&
                            (anchor.closest('del') || anchor.closest('.article-meta'))) {
                            return null;
                        }

                        if (typeof anchor.matches === 'function') {
                            return anchor.matches(selector) ? anchor : null;
                        }

                        return anchor.getAttribute('data-role') === 'bibr' ? anchor : null;
                    };

                    const normalizeSeparator = (text) => {

                        if (text == null) {
                            return '';
                        }

                        const normalized = String(text)
                            .replace(/\s+/g, ' ')
                            .trim();

                        if (!normalized) {
                            return '';
                        }

                        if (/^\s*,\s*$/.test(normalized)) {
                            return ',';
                        }

                        if (/^\]\s*,\s*\[$/.test(normalized)) {
                            return '],[';
                        }

                        if (/^\)\s*,\s*\($/.test(normalized)) {
                            return '),(';
                        }

                        return normalized;
                    };

                    const isAllowedBetween = (text) => {

                        const normalized = normalizeSeparator(text);

                        return normalized === ',' ||
                            normalized === '],[' ||
                            normalized === '),(';
                    };

                    const getLeadingTextBeforeAnchor = (container, anchor) => {

                        if (!container || !anchor || container === anchor) {
                            return '';
                        }

                        let text = '';

                        const walk = (parent) => {

                            const children = parent.childNodes || [];

                            for (let i = 0; i < children.length; i++) {
                                const child = children[i];

                                if (child === anchor) {
                                    return true;
                                }

                                if (child.nodeType === 3) {
                                    text += child.nodeValue || '';
                                    continue;
                                }

                                if (child.nodeType === 1) {
                                    if (child.contains && child.contains(anchor)) {
                                        return walk(child);
                                    }

                                    text += child.textContent || '';
                                }
                            }

                            return false;
                        };

                        walk(container);

                        return text;
                    };

                    const getTrailingTextAfterAnchor = (container, anchor) => {

                        if (!container || !anchor || container === anchor) {
                            return '';
                        }

                        let text = '';
                        let foundAnchor = false;

                        const walk = (parent) => {

                            const children = parent.childNodes || [];

                            for (let i = 0; i < children.length; i++) {
                                const child = children[i];

                                if (!foundAnchor) {
                                    if (child === anchor) {
                                        foundAnchor = true;
                                        continue;
                                    }

                                    if (child.nodeType === 1 &&
                                        child.contains &&
                                        child.contains(anchor)) {
                                        walk(child);
                                        continue;
                                    }

                                    continue;
                                }

                                if (child.nodeType === 3) {
                                    text += child.nodeValue || '';
                                } else if (child.nodeType === 1) {
                                    text += child.textContent || '';
                                }
                            }
                        };

                        walk(container);

                        return text;
                    };



                    const normalizeDash = (str) => {

                        return String(str || '')
                            .replace(/[–—−]/g, '-');
                    };

                    // ----------------------------------------
                    // Expand:
                    // "1,2-4" => [1,2,3,4]
                    // "23-26,27" => [23,24,25,26,27]
                    // ----------------------------------------
                    const extractCitationNumbers = (text) => {

                        if (!text) {
                            return [];
                        }

                        text = normalizeDash(text);

                        const parts = text.split(',');

                        const nums = [];

                        parts.forEach((part) => {

                            part = part.trim();
                            part = part.replace(/^[\[\(]+|[\]\)]+$/g, '').trim();

                            // range
                            const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);

                            if (rangeMatch) {

                                let start = parseInt(rangeMatch[1], 10);
                                let end = parseInt(rangeMatch[2], 10);

                                if (Number.isFinite(start) &&
                                    Number.isFinite(end)) {

                                    if (start > end) {
                                        const temp = start;
                                        start = end;
                                        end = temp;
                                    }

                                    for (let i = start; i <= end; i++) {
                                        nums.push(i);
                                    }
                                }

                                return;
                            }

                            // single number
                            const singleMatch = part.match(/\d+/);

                            if (singleMatch) {

                                const n = parseInt(singleMatch[0], 10);

                                if (Number.isFinite(n)) {
                                    nums.push(n);
                                }
                            }
                        });

                        return nums;
                    };

                    const collectRid = (anchor) => {

                        let rid = '';

                        if (anchor && anchor.getAttribute) {
                            rid = anchor.getAttribute('rid') || '';
                        }

                        return rid
                            .trim()
                            .split(/\s+/)
                            .filter(Boolean);
                    };

                    const anchors = editorDoc
                        .find(selector)
                        .toArray()
                        .map(function(x) {
                            return x.$;
                        })
                        .filter(Boolean);

                    const parents = Array.from(
                        new Set(
                            anchors.map(function(a) {
                                return a.parentNode;
                            }).filter(Boolean)
                        )
                    );

                    parents.forEach((parent) => {

                        let node = parent.firstChild;

                        while (node) {

                            const nodeAnchor = getCitationAnchor(node);

                            if (!nodeAnchor) {
                                node = node.nextSibling;
                                continue;
                            }

                            const runAnchors = [nodeAnchor];

                            let runLabels = extractCitationNumbers(
                                node.textContent
                            );

                            let lastAnchor = nodeAnchor;
                            let lastAnchorContainer = node;

                            let scan = node.nextSibling;

                            while (scan) {

                                let betweenText = getTrailingTextAfterAnchor(
                                    lastAnchorContainer,
                                    lastAnchor
                                );
                                let betweenNode = scan;

                                while (betweenNode &&
                                    betweenNode.nodeType === 3) {

                                    betweenText += betweenNode.nodeValue || '';

                                    betweenNode = betweenNode.nextSibling;
                                }

                                const betweenAnchor = getCitationAnchor(betweenNode);

                                if (!betweenNode || !betweenAnchor) {
                                    break;
                                }

                                betweenText += getLeadingTextBeforeAnchor(
                                    betweenNode,
                                    betweenAnchor
                                );

                                if (!isAllowedBetween(betweenText)) {
                                    debugLog('separator-rejected', {
                                        betweenText,
                                        normalizedSeparator: normalizeSeparator(betweenText)
                                    });
                                    break;
                                }

                                runAnchors.push(betweenAnchor);

                                runLabels = runLabels.concat(
                                    extractCitationNumbers(
                                        betweenNode.textContent
                                    )
                                );

                                lastAnchor = betweenAnchor;
                                lastAnchorContainer = betweenNode;

                                scan = betweenNode.nextSibling;
                            }

                            if (runAnchors.length < 2) {
                                debugLog('skip-single-anchor-run');
                                node = node.nextSibling;
                                continue;
                            }

                            const isRunRefTypeConsistent = runAnchors.every(function(anchor) {
                                return anchor.getAttribute('data-role') === 'bibr' &&
                                    anchor.getAttribute('ref-type') === 'bibr' &&
                                    collectRid(anchor).length > 0;
                            });

                            if (!isRunRefTypeConsistent) {
                                debugLog('skip-inconsistent-run', {
                                    runAnchorsLength: runAnchors.length
                                });
                                node = node.nextSibling;
                                continue;
                            }

                            // remove invalid
                            runLabels = runLabels.filter(Number.isFinite);

                            // dedupe + sort
                            runLabels = Array.from(new Set(runLabels))
                                .sort(function(a, b) {
                                    return a - b;
                                });

                            if (runLabels.length < threshold) {
                                debugLog('skip-threshold', {
                                    runLabels,
                                    threshold
                                });
                                node = node.nextSibling;
                                continue;
                            }

                            // check consecutive
                            let hasConsecutive = false;

                            for (let i = 1; i < runLabels.length; i++) {

                                if (runLabels[i] === runLabels[i - 1] + 1) {
                                    hasConsecutive = true;
                                    break;
                                }
                            }

                            if (!hasConsecutive) {
                                debugLog('skip-non-consecutive-run', {
                                    runLabels
                                });
                                node = node.nextSibling;
                                continue;
                            }

                            const newText = formatter.formatRanges(runLabels);

                            const ridParts = runAnchors.flatMap(function(a) {
                                return collectRid(a);
                            });

                            const seen = new Set();

                            const newRid = ridParts.filter(function(v) {

                                if (seen.has(v)) {
                                    return false;
                                }

                                seen.add(v);

                                return true;

                            }).join(' ');

                            if (newText && newRid) {

                                const firstAnchor = runAnchors[0];
                                const currentRid = (firstAnchor.getAttribute('rid') || '').trim().replace(/\s+/g, ' ');
                                const normalizedNewRid = newRid.trim().replace(/\s+/g, ' ');
                                const currentText = ((firstAnchor.querySelector('insert') || firstAnchor.querySelector('sup') || firstAnchor).textContent || '').trim();
                                const normalizedNewText = newText.trim();
                                const hasCitationChanged = currentRid !== normalizedNewRid || currentText !== normalizedNewText;
                                debugLog('merge-decision', {
                                    runAnchorsLength: runAnchors.length,
                                    runLabels,
                                    hasCitationChanged,
                                    currentRid,
                                    normalizedNewRid
                                });

                                if (hasCitationChanged) {
                                    this.updateCitation(
                                        firstAnchor,
                                        newText,
                                        newRid
                                    );
                                }

                                const stop = lastAnchor.nextSibling;

                                let removeNode = firstAnchor.nextSibling;

                                while (removeNode &&
                                    removeNode !== stop) {

                                    const next = removeNode.nextSibling;

                                    removeNode.remove();

                                    removeNode = next;
                                }

                                node = stop;

                                continue;
                            }

                            node = node.nextSibling;
                        }
                    });

                } catch (err) {

                    console.warn(err.message);

                    ErrorLogTrace(
                        'compressConsecutiveCitations',
                        err.message
                    );
                }
            },
            updateCitation(element, newText, newRid) {
                try {

                    element = element[0] || element.$ || element;

                    const insertElement = element.querySelector('insert');
                    const ascent_insert = element.closest('insert');
                    let targetElement = insertElement || element.querySelector('sup') || element;

                    const lastChangeTime = {
                        'data-last-change-time': new Date().getTime()
                    };

                    const insElAttrs = window._trackManager.getInsNode(null, {
                        returnAttrOnly: true
                    });
                    const isSameUser = insertElement && commonMethods.IS_SAME_USER_AND_ROLE(insertElement);

                    const attributes = {
                        rid: newRid,
                        href: newRid,
                        ...(insertElement && isSameUser ? lastChangeTime : insertElement ? insElAttrs : {})
                    };

                    const removeAttr = ['data-cke-saved-href'];

                    // New logic for handling old text and data-del-val attribute
                    const oldText = element.getAttribute("data-del-val") || "";
                    const isSameText = newText === oldText;

                    if (isSameText) {
                        removeAttr.push("data-del-val");
                    } else {
                        if (ascent_insert && commonMethods.IS_SAME_USER_AND_ROLE(ascent_insert)) {
                            // ignore same user renumbering labels
                        } else {
                            attributes["data-del-val"] = oldText || element.textContent;
                        }
                    }

                    if (targetElement) {

                        targetElement.textContent = newText;

                        if (targetElement.tagName.toLocaleLowerCase() !== 'a') {
                            targetElement = targetElement.closest('a');
                        }

                        if (targetElement) {
                            commonMethods.SET_REMOVE_ATTR(targetElement, attributes, removeAttr);
                        }
                    }
                } catch (err) {
                    ErrorLogTrace('updateCitation', err.message);
                }
            }

        },
        POST_CHECK: function() {
            try {
                GlobalEditor.document.find("a[data-del-val]").toArray().forEach((a) => {
                    var text = a.getText(),
                        ins = a.findOne("insert[data-del-val]");
                    if (ins && text == ins.getAttribute("data-del-val")) {
                        ins.removeAttribute("data-del-val");
                    }
                    if (text == a.getAttribute("data-del-val")) {
                        console.log(a.getAttribute("data-del-val"));
                        a.removeAttribute("data-del-val");
                    } else {
                        console.log(a.getAttribute("data-del-val"), text);
                    }
                });
            } catch (err) {
                ErrorLogTrace('POST_CHECK', err.message);
            }
        },
        RETURN_VALID_CITE: function(root, selector) {
            try {
                return root.find(selector).toArray().map(el => {

                    let _role = el.getAttribute('data-role');

                    const isInArticleMeta = !!window.EDITOR_UTILS.getAscendant(el, {
                        className: true,
                        value: "article-meta"
                    });

                    if (/bibr$|fig$|table$/gi.test(_role) && el.getParent().getName() != "del" && !el.getAscendant('del') && !isInArticleMeta) return el;

                }).filter(Boolean);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('RETURN_VALID_CITE', err.message);
            }
        },
        FIRE_ONCE: function(editor, Options = {}, editorDoc, $this) {

            const _collabEnabled = window.paraLock && window.paraLock._isEnabled;
            const {
                byOthers
            } = _collabEnabled ? window.paraLock.getLockedElementsByOthers() : {
                byOthers: [],
                total: []
            };
            if (byOthers.length > 0) {
                TOASTER_ALERT('ErrorReStoreForCollab', {
                    type: 'warning'
                });
                return;
            }


            debug.log("CHECK_ORDER INITING . . .");
            $this = this.fn._ = this.unit._ = this;
            editorDoc = editor.document;
            this.config = iREF_SCOPE.Reference;
            this.formatter = new RangeFormatter(this.config.indircite);
            try {
                this.reset();
                // ? fetching citation and references data
                $this._r_que = editorDoc.find(this.glob_selector[0]).toArray();
                $this._x_que = this.RETURN_VALID_CITE(editorDoc, this.glob_selector[1]);
                $this._collection = $this._x_que.concat($this._r_que);
                $this._collection.forEach((el, index, array) => {
                    let _role = el.getAttribute("data-role");
                    if ($this.float_role.includes(_role)) {
                        // ? "#".concat('F1 F2'.split(" ").join(",#")) ==> '#F1,#F2'
                        // ! "[id='a'], [id='b'], [id='c']"
                        let rid = el.getAttribute("rid")
                            .split(" ")
                            .map(id => `[id='${id}']`)
                            .join(", ");

                        if (rid.length == 1) return;
                        editorDoc.find(rid).toArray().forEach((float, ind, arr) => {
                            // float.find($this.find_only_bibr.join(",")).toArray()
                            $this.RETURN_VALID_CITE(float, $this.find_only_bibr.join(",")).forEach((node, n, ar) => {
                                $this.fn.forLoop(node.$);
                            });
                        });
                    } else if ((el.hasAttribute("data-role") && $this.valid_role.includes(_role)) || el.$.classList.contains('ref')) {
                        $this.fn.forLoop(el.$);
                    }
                });
                $this.history[this.instance_id]['forLoop'] = !0;
                $this.fn.check_seq(editorDoc, Options);
                if (Options.reNumber) {
                    if ($this.unlinkedRef.length == 0 || Options.force) {
                        $this.fn.reorder_fire(editorDoc, Options);
                    } else if ($this.unlinkedRef.length > 0) {}
                }
                // ? LWW - BULLET LEVEL

                const {
                    'data-interest-level': dataInterestLevelAlias
                } = iREF_SCOPE.Reference || {};

                if (dataInterestLevelAlias) {
                    processCitationGroups();
                }

                debug.log($this.history[$this.instance_id]);
                let {
                    alert,
                    del_ref,
                    ins_cite,
                    del_cite,
                    paste,
                    ins_ref
                } = Options, {
                    can_reorder,
                    check_seq,
                    proper_sequence,
                    unlinkedRef
                } = $this.history[$this.instance_id], alert_key = "", addText = "";
                if (alert) {
                    // ? IF RE-ORDERED REF LIST
                    if (can_reorder && (ins_ref || del_ref || ins_cite || del_cite)) {
                        //  ? del_ref ==> Handle command listener *case 'DELETE_REF_CMD':*
                        alert_key = (ins_ref || del_ref) ? (ins_ref ? 'REF_INS_ReNUM' : 'REF_CITE_DEL_ReNUM') : ((ins_cite) ? "REF_CITE_INS_ReNUM" : "REF_CITE_DEL_ReNUM");
                    } else if (!can_reorder) {
                        // ? del_ref ==> Handle command listener *case 'DELETE_REF_CMD':*
                        if (ins_ref) {
                            alert_key = 'REF_INSERT', addText = (!proper_sequence) ? "COMMON_CITE_MISS" : "";
                        } else if (ins_cite || del_cite) {
                            alert_key = (ins_cite) ? ('CITE_INSERT_COMMON') : ("REF_CITE_DEL"), addText = (!proper_sequence) ? "COMMON_CITE_MISS" : "";
                        }
                        if (del_ref && alert_key == "" && !proper_sequence) {
                            alert_key = 'REF_DELETE', addText = "COMMON_CITE_MISS";
                        }
                    }
                    if (alert_key) {
                        AlertNewDialog.fire('success', "Success", alert_key, 'OK', '', true, {
                            override: true,
                            AddHtml: addText,
                            miss_cite: unlinkedRef.join(",")
                        });
                    }
                }
                if (Options.stringData) {
                    $this.history[$this.instance_id]['data'] = editor.getData();
                    return $this.history[$this.instance_id]['data'];
                } else return $this.history[$this.instance_id];

            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('CHECK_ORDER_fire', err.message);
            }
        }
    };
});