/**
 * RETIRED from active WIP path (2026-10-07).
 * Class-based stack lives in index.js + panelEvents/List/Sync/Actions.
 * Kept in tree for reference only — do not import from index.js.
 *
 * Legacy: ShowTracking core installer — attached M_FUN / initLoop / showLoop.
 * Migrated from src/js/dialogModules/ShowTracking_Module.js.
 */
import './support/trackCodes.js';

const MAX_ITERATIONS = 25;

function resolveTrackEntryGroup(dialog) {
    if (!dialog) return null;

    const ibox = dialog.IBOX || (dialog.IBOX = {});
    if (ibox.EntryGroup && ibox.EntryGroup.isConnected) {
        return ibox.EntryGroup;
    }

    const panel = dialog.Panel && dialog.Panel.isConnected ?
        dialog.Panel :
        document.getElementById(dialog._id || "trackDialogModule");
    if (panel) dialog.Panel = panel;

    const entryGroup = (panel && panel.querySelector("[data-id='trackListGroup']")) ||
        document.getElementById("trackListGroup");

    if (entryGroup) {
        ibox.EntryGroup = entryGroup;
    }

    return entryGroup || null;
}

/**
 * @param {object} trackDialog BaseModule / dialog instance (must already have Panel for #trackDialogModule)
 */
export function installShowTrackingCore(trackDialog) {
    if (!trackDialog || trackDialog._showTrackingCoreInstalled) return trackDialog;
    try {

        trackDialog['M_FUN'] = {
            setLastActive_Id: function(_ = trackDialog) {
                try {
                    const {
                        M_FUN,
                        IBOX,
                        M_SCOPE
                    } = _;
                    M_FUN.refreshArray();

                    const activeEl = IBOX.EntryGroup && IBOX.EntryGroup.querySelector("div.active");
                    if (activeEl) {
                        M_SCOPE.FINAL_ACT_ID = activeEl.parentElement && activeEl.parentElement.getAttribute("data-id");
                        console.log(M_SCOPE.FINAL_ACT_ID);
                    }
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace("setLastActive", err.message);
                }
            },

            refreshArray: function(_ = trackDialog) {
                try {
                    const {
                        IBOX,
                        M_SCOPE
                    } = _;
                    M_SCOPE.EntryArr = (IBOX.EntryGroup && IBOX.EntryGroup.querySelectorAll(M_SCOPE.Find)) || [];
                    M_SCOPE.TrackCount = M_SCOPE.EntryArr.length;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace("refreshArray", err.message);
                }
            },

            getActive: function(_ = trackDialog) {
                try {
                    const {
                        M_FUN,
                        IBOX
                    } = _;
                    M_FUN.refreshArray();

                    return (
                        (IBOX.EntryGroup && IBOX.EntryGroup.querySelector("div.active")) ||
                        (IBOX.EntryGroup && IBOX.EntryGroup.querySelector("div.track-entry-div:not([style])"))
                    );
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace("getActive", err.message);
                }
            },
            setTrackingLinkInfo: function(ckElement, msg_json, entry_info, _ = trackDialog) {
                try {
                    // Prefer data-track-code (link-01…04); fall back to data-link value
                    const trackCode = ckElement.getAttribute('data-track-code');
                    const filterCfg = (_ && _.M_SCOPE && _.M_SCOPE.filterConfig) || (window.TP_SUPPORT_CONFIG && window.TP_SUPPORT_CONFIG.new_tracking_code) || {};
                    const newCfg = trackCode && filterCfg[trackCode] ? filterCfg[trackCode] : null;

                    if (newCfg && newCfg.hint) {
                        Object.assign(entry_info, {
                            Text: getTxt(ckElement),
                            linkInfo: newCfg.hint,
                            topRowtag: newCfg.topRowtag || '',
                            topRowInfoShow: newCfg.topRowInfoShow || '',
                            topRowCSS: newCfg.topRowCSS || '',
                            disableAction: newCfg.disableAction || ''
                        });
                        return entry_info;
                    }

                    const trackType = ckElement.getAttribute('data-link') || 'default';
                    const isRemove = trackType === 'remove';
                    const sectionKey = isRemove ? 'ice-reformat' : 'ice-format';
                    const section = msg_json[sectionKey];

                    if (!trackType || !msg_json && msg_json.IsLink && msg_json.IsLink.Info && msg_json.IsLink.Info[trackType]) {
                        throw new Error(`Invalid trackType or missing msg_json.IsLink.Info for "${trackType}"`);
                    }

                    Object.assign(entry_info, {
                        Text: getTxt(ckElement),
                        linkInfo: msg_json.IsLink.Info[trackType],
                        topRowtag: section && section.topRowtag ? section.topRowtag : '',
                        topRowInfoShow: section && section.topRowInfoShow ? section.topRowInfoShow : '',
                        topRowInfoShowCSS: section && section.topRowInfoShowCSS ? section.topRowInfoShowCSS : ''
                    });

                    return entry_info;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('setTrackingLinkInfo', err.message);
                }
            },
            setTrackingMathInfo: function(ckElement, msg_json, entry_info, _ = trackDialog) {
                try {
                    debug.log("---math-tracking---");
                    let IsNew = /insert/gi.test(ckElement.tagName);
                    let tag = ckElement.tagName;
                    let findRoot = ckElement.parentElement.closest("[math-type],[data-math]");
                    let parent = findRoot ? findRoot : ckElement.parentElement;

                    var pTag = parent.tagName,
                        rootElm = IsNew ? parent : ckElement,
                        IsInline = /span/gi.test(IsNew ? pTag : tag),
                        IsDisplay = /div/gi.test(IsNew ? pTag : tag),
                        IsEdited = rootElm.getAttribute("data-math") == "edit",
                        type = rootElm.getAttribute("data-math") || null,
                        Label = rootElm.querySelector(".label") || null, //[track-lab-type]
                        IsEditLabel = Label && Label.hasAttribute('track-lab-type') ? true : false,
                        tLabVal = Label ? Label.getAttribute('track-lab-type') : null || null,
                        key = "",
                        tempText = [],
                        IsAllBool = IsNew || IsEditLabel || type ? true : false,
                        rowKey = IsAllBool ? 'insert' : 'del';
                    if (type) {
                        key = (IsEdited ? "edit" : (IsDisplay ? (Label ? 'withLab' : 'withoutLab') : "inline"));
                    }
                    if (IsEditLabel) {
                        key = (tLabVal == 'new') ? 'insertLab' : 'removeLab';
                    }
                    if (key) {
                        tempText.push(msg_json.IsEq.Info[key]);
                        entry_info.Text = `[${tempText.join(', ').replace(/_([^_]*)$/, ' and $1')}]`;
                        entry_info.topRowtag = msg_json[rowKey].topRowtag;
                        entry_info.topRowInfoShow = msg_json[rowKey].topRowInfoShow;
                        entry_info.topRowCSS = msg_json[rowKey].topRowCSS;
                        return entry_info;
                    }
                    /* 
                                selector for edit = [data-math='edit']
                                selector for new = insert[class^='ice-ins ']
        
                                <div data-name="disp-formula" id="Mcef5" math-type="" data-math="new">
                                <span data-name="inline-formula" math-type="" data-mathnew="new" id="IN0001"  data-math="edit" org-math-src="$$Cr$$">
                                    <insert>
                                        <span class="TEX" data-name="TEX" id="d1p140" contenteditable="false">$$Cr\sqrt{24}$$</span>
                                        <span data-name="inline-graphic" xlink:href="ANALYS_anad099_M0001.pdf" self-close="yes">
                                            <math><mi>C</mi><mi>r</mi><msqrt><mn>24</mn></msqrt></math>
                                        </span>
                                        <span class="label" data-name="label" data-value="(1)" contenteditable="false"></span>
                                    </insert>
                                </span>
                                */
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('setTrackingMathInfo', err.message);
                }
            },
            getDateTime: function(entry, Options, _ = trackDialog) {
                try {
                    Options = !Options ? ({
                        action: false
                    }) : (Options);
                    let stamp = (typeof entry == "string") ? (Number(entry)) : (Number(entry.getAttribute(Options.action ? 'data-action-time' : 'data-time')));
                    return [moment(stamp).format("DD-MMM-YYYY"), moment(stamp).format("hh:mm A")];
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('getDateTime', err.message);
                }
            },
            getDisplayName: function(id, _ = trackDialog) {
                try {
                    if (!id) return "";
                    return classCase(id.replace(/(\.\w+)?@\w+\.\w+(\.\w+)?/g, ""));
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('getDisplayName', err.message);
                    return "";
                }
            },
            Reset_Btns_Count: function(_ = trackDialog) {
                try {
                    _['M_FUN'].refreshArray();
                    var [ActEntry, curInd, IsDisable] = [null, null, ''];
                    var {
                        TrackCount,
                        EntryArr,
                        TagArr
                    } = _['M_SCOPE'];
                    const {
                        EntryGroup,
                        ACT_BTN,
                        RJT_BTN
                    } = _['IBOX'];

                    if (TrackCount > 0) {
                        let tempEntry = _['M_FUN'].getActive();
                        ActEntry = (tempEntry != null) ? (tempEntry.parentElement) : null;
                        curInd = (ActEntry != null) ? (Array.from(EntryArr).indexOf(ActEntry)) : null;
                        IsDisable = tempEntry ? ActEntry.getAttribute('data-action-disable') : '';
                    }
                    ['TrackinsCount', 'TrackdelCount', 'TrackformatCount', 'overallCount', 'tp_curIndex', 'btnPrevTrack', 'btnNextTrack'].forEach((id, Ind) => {
                        let OptBtn = _.iGetElmById(id);
                        if (OptBtn) {
                            // ? here update the counts on show listed in below panel
                            if (Ind < 5) {
                                var count = TrackCount != 0 ? (Ind < 3 ? (getFindPatternCount(EntryGroup, TagArr[Ind])) : (Ind == 3 ? (TrackCount) : (curInd + 1))) : 0;
                                OptBtn.textContent = count;
                            } else if (Ind >= 5) {
                                var svgState = TrackCount == 0 ? (0) : ((Ind == 5 && curInd == 0) || (Ind == 6 && (curInd + 1) == TrackCount)) ? 0 : 1;
                                _['M_FUN'].change_Btns_State(OptBtn, svgState);
                            }
                            //if(_['M_SCOPE'].TrackCount == 0 && Ind<=4) OptBtn.textContent=commonMethods.Add_leading_zero(0);
                        }
                    });
                    // ? Handling the Accept/Reject enable/disable bases on state
                    if (IS_TRACK_VIEW) return;
                    let isSameUser = commonMethods.IS_SAME_USER_AND_ROLE(ActEntry);
                    [ACT_BTN, RJT_BTN].forEach((elm, Index) => {
                        if (!elm) return;
                        const {
                            show,
                            showSameUser
                        } = _['M_CONFIG'][elm.id];

                        // ? YA-28_DEC_22 - DISABLE ACT/RJT SAME-USER- SIVA_POINT#07

                        let state = (ActEntry && ActEntry.hasAttribute('data-action') || isSameUser) ? 0 : 1;
                        // if (ROLE_IDS.CO == USER_INFO.ROLE_ID && state == 0) state = 1;                            

                        // Get role-based visibility configuration
                        let roleShow = _['M_CONFIG'][elm.id][USER_INFO.SELECTOR_SHOW_HIDE];

                        // Update state based on specific conditions
                        if (show === "false" || roleShow === "false" || _['M_SCOPE'].TrackCount === 0) state = 0;
                        if (showSameUser && isSameUser && !ActEntry.hasAttribute('data-action')) state = 1;

                        // Disable state if element ID is in the IsDisable list
                        if (IsDisable && IsDisable.length > 0) {
                            IsDisable.split(',').forEach(id => {
                                if (id === elm.id) state = 0;
                            });
                        }

                        _['M_FUN'].change_Btns_State(elm, state);
                    });
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('ShowTrackModules', err.message);
                }
            },
            change_Btns_State: function(node, state, _ = trackDialog) {
                try {
                    if (!node) return;
                    if (['btnPrevTrack', 'btnNextTrack'].includes(node.id)) {
                        let new_src = _.M_SCOPE.img_prefix + node.id.slice(3, 7) + (state == 0 ? "_0" : "") + '.svg';
                        node.children[0].setAttribute("src", new_src);
                    }
                    node[state == 0 ? ('setAttribute') : ('removeAttribute')]('disabled', 'disabled');
                    node.classList[state == 0 ? ('add') : ('remove')]('disabled');
                    debug.log(`Button ${node.id} is now ${state == 0 ? 'disabled' : 'enabled'}.`);
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('change_Btns_State', err.message);
                }
            },
            orderList: function(e, mFun, self) {
                self = trackDialog;
                mFun = self.M_FUN;
                try {
                    if (!self.M_SCOPE.SORT_COUNT) self.M_SCOPE.SORT_COUNT = 0;
                    self.M_SCOPE.SORT_COUNT++;
                    let target = e.currentTarget;
                    const items = Array.from(self.M_SCOPE.EntryArr);
                    const container = self.IBOX.EntryGroup;
                    var attribute = "data-id",
                        current = self.M_FUN.getActive();

                    if (target.getAttribute("data-order") == "id") {
                        attribute = "data-index";
                    }
                    // Add index attribute if data-index is not available
                    items.forEach((item, index) => !item.hasAttribute('data-index') && item.setAttribute('index', index));

                    if (e.type == "doubleclick" || self.M_SCOPE.SORT_COUNT % 3 === 0) attribute = "data-tag";
                    // Sort items based on data-index or index attribute
                    const sortedItems = Array.from(items).sort((a, b) => {
                        const indexA = a.getAttribute(attribute);
                        const indexB = b.getAttribute(attribute);
                        // Check if attribute values are non-numeric
                        if (!isNaN(indexA) && !isNaN(indexB)) {
                            // Both are numeric; subtract directly
                            return indexA - indexB;
                        } else {
                            // At least one is a string; use localeCompare
                            return indexA.localeCompare(indexB);
                        }
                    });
                    sortedItems.forEach(item => container.appendChild(item));
                    target.setAttribute("data-order", attribute == "data-index" ? "index" : "id");
                    target.querySelector("span").textContent = (attribute == "data-index" ? "Position" : "Time");
                    if (current) current.scrollIntoViewIfNeeded(true);
                    mFun.updateTrackView("set", {
                        sort: true
                    });
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('orderList', err.message);
                }
            },
            updateTrackView: function(call, inputs = {}, mFun, self) {
                self = trackDialog;
                mFun = self.M_FUN;
                const key = 'track_dialog_cache';
                try {
                    debug.log("updateTrackView ==> " + call);
                    const sort_target = document.getElementById("sort_list"),
                        select = document.getElementById("TrackSelectOpt");
                    const dataSession = sessionStorage.getItem(key) || "{}";
                    const parseSession = JSON.parse(dataSession) || {};
                    if (call === "set") {
                        // Handle sort if inputs.sort is a boolean and sort_target exists
                        if (typeof inputs.sort === "boolean" && sort_target) {
                            inputs.sort = {
                                "order": sort_target.getAttribute("data-order"),
                                "text": sort_target.querySelector("span").textContent
                            };
                        }
                        if (typeof inputs.user === "boolean" && select) {
                            inputs.user = select.value;
                        }

                        Object.assign(parseSession, inputs);
                        // Serialize the inputs object into a JSON string
                        const dataString = JSON.stringify(parseSession);
                        // Store the JSON string in session storage
                        sessionStorage.setItem(key, dataString);

                    } else /* if (call === "get") */ {
                        // Retrieve the JSON string from session storage
                        const dataString = sessionStorage.getItem(key);

                        // Check if data exists in session storage
                        if (dataString) {
                            // Deserialize the JSON string into an object
                            const data = JSON.parse(dataString);
                            // Apply stored sort information if available
                            if (data.sort && sort_target) {
                                if (data.sort.order) sort_target.setAttribute("data-order", data.sort.order);
                                if (data.sort.text) sort_target.querySelector("span").textContent = data.sort.text;
                                // TODO: Fire any relevant events after setting sort values

                            }

                            // Set the selected user option
                            if (data.user && select) {
                                select.value = data.user;
                            }
                            // Handle entry selection
                            if (data.entry && self['IBOX']) {
                                const {
                                    id,
                                    index
                                } = data.entry;
                                const entryList = Array.from(self['IBOX'].EntryGroup.querySelectorAll(`[data-id="${id}"]`));
                                let selectedEntry = entryList[0];
                                // If there are multiple entries, use the one with the given index
                                if (entryList.length > 1 && entryList[index]) {
                                    selectedEntry = entryList[index];
                                }
                                // Select the entry
                                if (selectedEntry) {
                                    mFun.selectEntry(selectedEntry);
                                }
                            }
                        } else {
                            console.log('No data found in session storage.');
                        }
                    }
                } catch (error) {
                    console.error('An error occurred:', error.message);
                    ErrorLogTrace('updateTrackView', error.message); // Ensure ErrorLogTrace is defined if used
                }
            },
            OnChange: function(e, _ = trackDialog) {
                try {
                    // ? 2729362 Display contributor role as Reviewer name
                    // ? Reset track state
                    _["M_SCOPE"].myTrackCount = 0;
                    _["M_SCOPE"].btn_trick = false;

                    // ? Load selected filter and track entries
                    const selectedValue = this.value;
                    const myHistory = _["IBOX"].EntryGroup.querySelectorAll(_["M_SCOPE"].FindAll);

                    // ? Helper — match "query" labels
                    const isQueryMatch = function(span, val) {
                        return /query/i.test(span && span.textContent) && /query/i.test(val);
                    };

                    // ? LWW_J_RAQ_061 | LWW_J_RAQ_062 
                    // ? EDITOR INSERTED QUERIES SHOULD BE LISTED IN QUERIES SELECT OPTION

                    // ? Apply combined filter (type filter + user filter)
                    _['M_FUN'].applyCombinedFilter();

                    // ? Auto-select first entry
                    const firstEntry = _["IBOX"].EntryGroup.querySelector(_["M_SCOPE"].Find);
                    if (firstEntry) firstEntry.click();

                    _["M_FUN"].Reset_Btns_Count();

                    // ? Show/hide secondary option (OptionsListOpt2)
                    const find = document.getElementById("OptionsListOpt2");
                    const shouldShowOpt = /query|note/i.test(selectedValue);

                    // ? 02_AUG_2023_YA 
                    if (find) {
                        if (shouldShowOpt) {
                            find.classList.add("invisible");
                        } else {
                            find.classList.remove("invisible");
                        }
                    }

                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace("OnChange", err.message);
                }
            },
            applyTypeFilter: function(_ = trackDialog) {
                try {
                    const radioFilter = document.querySelector('input[name="trackTypeFilter"]:checked');
                    const dropSelect = document.getElementById('TrackTypeSelectOpt');

                    const radioValue = radioFilter ? radioFilter.value : 'all';
                    const dropValue = dropSelect ? dropSelect.value : 'all';

                    // Store current filter values
                    _['M_SCOPE'].TrackTypeFilter = radioValue;
                    _['M_SCOPE'].dropListFilter = dropValue;

                    // Apply filter to entries
                    const entries = _['IBOX'].EntryGroup.querySelectorAll(_['M_SCOPE'].FindAll);
                    entries.forEach(entry => {
                        const entryTag = entry.getAttribute('data-tag') || '';
                        const dropListAttr = entry.querySelector('[data-drop-list]');
                        const dropListValue = dropListAttr ? dropListAttr.getAttribute('data-drop-list') : '';

                        // Check tag filter
                        const tagMatch = radioValue === 'all' || entryTag === radioValue;
                        // Check drop-list filter
                        const dropMatch = dropValue === 'all' || dropListValue.includes(dropValue);

                        if (tagMatch && dropMatch) {
                            entry.removeAttribute('data-type-filtered');
                        } else {
                            entry.setAttribute('data-type-filtered', 'hidden');
                        }
                    });

                    // Trigger combined filter with user filter
                    _['M_FUN'].applyCombinedFilter();
                    _['M_FUN'].Reset_Btns_Count();
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('applyTypeFilter', err.message);
                }
            },
            applyCombinedFilter: function(_ = trackDialog) {
                try {
                    const selectedUser = document.getElementById('TrackSelectOpt').value;
                    const entries = _['IBOX'].EntryGroup.querySelectorAll(_['M_SCOPE'].FindAll);

                    entries.forEach(entry => {
                        const isTypeFiltered = entry.getAttribute('data-type-filtered') === 'hidden';

                        // Check user filter (reuse existing logic from OnChange)
                        const role = commonMethods.get_role_name(entry);
                        const user = commonMethods.get_user_name(entry);
                        const combine_user = `${user}${role}`;
                        const span = entry.querySelector("[data-id] > span");
                        const hasNote = entry.querySelector('[data-status="comment"]');
                        const isQueryMatch = span && /query/i.test(span.textContent) && /query/i.test(selectedUser);

                        let userMatch = selectedUser === 'allusers';
                        if (!userMatch) {
                            if (selectedUser === 'comment' && hasNote) userMatch = true;
                            else if (combine_user === selectedUser) userMatch = true;
                            else if (isQueryMatch) userMatch = true;
                            // Partial matching: only when selectedUser has no role suffix (no parentheses)
                            else if (!selectedUser.includes('(') && selectedUser.includes(user)) userMatch = true;
                            // Reverse partial match: combine_user contains selected value (for partial role matches)
                            else if (combine_user.includes(selectedUser)) userMatch = true;
                        }

                        // Final visibility
                        if (isTypeFiltered || !userMatch) {
                            entry.setAttribute('style', 'display:none!important');
                        } else {
                            entry.removeAttribute('style');
                        }
                    });

                    _['M_FUN'].updateTrackView('set', {
                        user: selectedUser,
                        sort: true
                    });
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('applyCombinedFilter', err.message);
                }
            },
            onTypeFilterChange: function(e, _ = trackDialog) {
                _['M_FUN'].applyTypeFilter();
                // Auto-select first visible entry
                const firstEntry = _['IBOX'].EntryGroup.querySelector(_['M_SCOPE'].Find);
                if (firstEntry) firstEntry.click();
            },
            IsFormatWithInsert: function(curItem, trackELm, Options = {}, _ = trackDialog) {
                try {
                    let temp = curItem.$,
                        tempParent = temp.parentElement,
                        ChildWithFormat = temp.querySelector('[data-css]') || temp.querySelector('[data-link]') || temp.querySelector('.ice-ins'),
                        replaceText = temp.hasAttribute('data-group-action'),
                        ParentWithFormat = tempParent ? (tempParent.hasAttribute('data-css') || tempParent.hasAttribute('data-link')) : null,
                        IsCheck = false;
                    if (ChildWithFormat || replaceText || (temp.textContent === (ParentWithFormat && ParentWithFormat.textContent || ''))) {
                        IsCheck = true;
                        let tempElm = ChildWithFormat ? ChildWithFormat : tempParent;
                        tempElm = replaceText ? curItem : tempElm;
                        let [tempId, AppendDom] = [tempElm.getAttribute('data-time'), _.GetFragment(Options.dom)];

                        const tempIdShort = tempId.slice(0, -1); // Remove the last digit from tempId
                        const {
                            tag,
                            time
                        } = Options.pair || {};

                        // Base selector
                        let selector = `[data-id^='${tempIdShort}']:not(.data-action), [data-id='${tempId}']:not(.data-action)`;

                        // Add additional conditions for `tag` and `time` if they are valid
                        if (tag && time) selector += `, [data-tag='${tag}'][data-time='${time}']:not(.data-action)`;

                        // Query the elements based on the dynamically built selector
                        const items = trackELm
                            .closest(".track-history")
                            .querySelectorAll(selector);

                        Array.from(items).forEach(el => {
                            if (!el.querySelector('#userAction')) {
                                el.querySelector('.track-entry-div').append(AppendDom);
                                el.setAttribute('data-action', Options.type);
                            }
                        });
                        if (ChildWithFormat && Options.attr) {
                            curItem.findOne('[data-css]').setAttributes(Options.attr);
                        }
                    }
                    return IsCheck;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('IsFormatWithInsert', err.message);
                }
            },
            FormattingAction: function(selector, index, updateNode, Keys, self) {
                self = trackDialog;
                var isManipulationDone = false;
                try {
                    var elm = GlobalEditor.document.find(selector).getItem(index);
                    if (!elm) {
                        if (typeof updateNode == "string") {}
                        let key = 'data-action-time',
                            time = Keys[key];
                        elm = GlobalEditor.document.findOne(`[${key}=${time}]`);
                    }
                    // ? https://jsbin.com/cuhakiw/edit?js,output
                    if (!elm) return;
                    // Check if the element exists
                    if (elm && elm.$) {
                        var domElm = elm.$;
                        var wrapperTag = domElm.tagName.toLowerCase();
                        var wrapperAttr = domElm.attributes;
                        // Start with the immediate parent of the element
                        let element = domElm;
                        let parentWithCss = domElm.parentElement;
                        let topLevelParentWithCss = null;
                        let loop = 1;
                        // Traverse up the DOM tree to find the top-level parent with 'data-css' attribute
                        while (parentWithCss) {
                            if (loop == 30) break;
                            else loop++;
                            if (parentWithCss.hasAttribute('data-css')) {
                                // Check if the parent has only one child and that child is the element
                                if (parentWithCss.childNodes.length === 1 && parentWithCss.childNodes[0] === element) {
                                    topLevelParentWithCss = parentWithCss;
                                } else break;
                            }
                            element = parentWithCss; // Move up to the parent element
                            parentWithCss = parentWithCss.parentElement;
                        }
                        // If no parent with 'data-css' is found, return without doing anything
                        if (!topLevelParentWithCss) return;

                        // Create a new element of the same type as the parent with 'data-css'
                        const newWrapper = document.createElement(wrapperTag);
                        // Copy all attributes from the parent to the new wrapper
                        Array.from(wrapperAttr).forEach(attr => {
                            newWrapper.setAttribute(attr.name, attr.value);
                        });
                        // Wrap the original element with the new wrapper
                        topLevelParentWithCss.before(newWrapper);
                        domElm.after(...domElm.childNodes);
                        if (domElm.childNodes.length == 0) domElm.remove();
                        newWrapper.appendChild(topLevelParentWithCss);
                        isManipulationDone = true;
                    }
                    GlobalEditor.updateElement();
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('FormattingAction', err.message);
                } finally {
                    return isManipulationDone;
                }
            },
            GET_SHOW_SPAN_TRACK: function(elm, _ = trackDialog) {
                /* 
                    ? 09_DEC_22 - YA
                    ! FUNCTION - SET/REMOVE ATTRIBUTES WITH RENAME ELEMENT TAG
                */
                try {
                    let node = elm.clone(true, true);
                    node.renameNode('span');
                    node.removeAttribute("class");
                    node.setAttribute("data-content", node.getText());
                    node.$.innerHTML = "";
                    return node;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('GET_SHOW_TRACK', err.message);
                }
            },
            RefreshList: function(id, _ = trackDialog) {
                try {
                    var last_Index = $('.track-history').children().last().index();
                    var TrackEntry = $('.track-history').find('[data-id="' + id + '"]');
                    var cur_Index = TrackEntry.index(),
                        gotoTrack = null,
                        IsLast = (last_Index == cur_Index) ? true : false;
                    if (TrackEntry.length > 1) {
                        cur_Index = (cur_Index != 0) ? (IsLast ? (cur_Index - 1) : (cur_Index + 1)) : (cur_Index);
                    }
                    // ? Entry remove from list
                    gotoTrack = TrackEntry[(IsLast) ? ('prev') : ('next')]();
                    while (gotoTrack[0].hasAttribute('style')) {
                        gotoTrack = TrackEntry[(IsLast) ? ('prev') : ('next')]();
                    }
                    $(TrackEntry).remove();
                    // ? Set Active class list
                    _['M_FUN'].selectEntry(gotoTrack[0]);
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('RefreshList', err.message);
                }

            },
            GOTO_ENTRY: function(e, _ = trackDialog) {
                try {
                    if (this.hasAttribute('disabled')) return true;
                    var [goNextEntry, ACTIVE] = [((this.id == 'btnNextTrack') ? true : false), _['M_FUN'].getActive()];
                    if (ACTIVE) {
                        let curInd = Array.from(_['M_SCOPE'].EntryArr).indexOf(ACTIVE.parentElement);
                        //? Find location ckeditor
                        _['M_FUN'].selectEntry(_['M_SCOPE'].EntryArr[goNextEntry ? (curInd + 1) : (curInd - 1)]);
                    }
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('ShowTrackModules', err.message);
                }
            },
            selectEntry: function(e, Options = {}, mFun, self) {
                self = trackDialog;
                mFun = self.M_FUN;
                try {
                    let target = ((typeof e != "undefined" && e.type == "click") ? e.currentTarget : e);
                    if (!target) return;
                    let queryElm = target.querySelector('.query-item,.t-user');
                    let IsCmtQry = queryElm ? (queryElm.textContent.match(/query/gi) || (queryElm.hasAttribute("data-status")) || target.textContent.match(/query|comment/gi)) ? true : false : false;
                    var TrackId = target.getAttribute('data-id');
                    self['M_SCOPE'].FINAL_ACT_ID = TrackId;
                    console.log("==>" + TrackId);
                    var TrackFind = `[data-time='${TrackId}'],[data-timec='${TrackId}']`;
                    var myTrackEle;
                    if (IsCmtQry) {
                        if (queryElm.hasAttribute("data-query-id")) {
                            TrackId = queryElm.getAttribute("data-query-id");
                        } else {
                            TrackId = queryElm.getAttribute('data-id');
                            if (!TrackId && target.querySelector('[data-id]')) {
                                TrackId = target.querySelector('[data-id]').getAttribute('data-id');
                            }
                        }
                        let find_all = `${TrackFind},[id='${TrackId}']`;
                        myTrackEle = GlobalEditor.document.findOne(find_all);
                    } else {
                        var getInd = Array.from(self['IBOX'].EntryGroup.querySelectorAll(`[data-id="${TrackId}"]`)).indexOf(target);
                        var FindColl = GlobalEditor.document.find(TrackFind);
                        var count = FindColl.count() - 1;
                        if (getInd > count) getInd = count;
                        myTrackEle = FindColl.getItem(getInd);
                    }
                    if (!Options.session) {
                        mFun.updateTrackView("set", {
                            entry: {
                                id: TrackId,
                                index: getInd
                            },
                            sort: true,
                            user: true
                        });
                    }
                    if (myTrackEle && !Options.ignore_editor_focus) {
                        if (myTrackEle.$ && $(myTrackEle.$).parents('.kwd-group').length != 0) {
                            myTrackEle = GlobalEditor.document.findOne(TrackFind);
                        } else if (myTrackEle.$ && $(myTrackEle.$).parents('.ref').length != 0) {
                            let temp_ref = $(myTrackEle.$).parents('.ref').attr('id');
                            //myTrackEle = GlobalEditor.document.findOne('#'+temp_ref+ '.label');
                        }
                        if (myTrackEle && myTrackEle.$) {
                            GlobalEditor.getSelection().selectElement(myTrackEle);
                            myTrackEle.scrollIntoView(true);

                            // ? goto hidden element location

                            let IsSelection = GlobalEditor.getSelection().getSelectedText();
                            if (!IsSelection || ((myTrackEle.$.hasAttribute('data-action') && IsSelection && IsSelection.length == 0))) {
                                // ? YA_02_DEC_2023 MATH_UPDATE

                                if (myTrackEle.$.parentElement) {
                                    myTrackEle.$.parentElement.scrollIntoView(true);
                                }
                                var range = GlobalEditor.createRange();
                                range.setStartAt(myTrackEle, CKEDITOR.POSITION_BEFORE_START);
                                var next = range.getNextEditableNode();
                                if (next) {
                                    range.setStart(next, 0);
                                    // range.setEnd(next, 1);
                                    GlobalEditor.getSelection().selectRanges([range]);
                                }
                            }
                        }
                        //GlobalEditor.focus();
                    }
                    // console.log(myTrackEle.$.outerHTML);
                    $(target).parent().find('div.d-flex.track-entry-div.active').removeClass('active');
                    $(target).children().first().addClass('active');
                    self['M_FUN'].Reset_Btns_Count();
                    target.scrollIntoViewIfNeeded(true);
                } catch (err) {
                    ErrorLogTrace('selectEntry', err.message);
                    console.warn(err.message);
                }
            },
            Date2TimeStamp: function(date, _ = trackDialog) {
                try {
                    // ? 2022-06-30 || "26-02-2012";
                    // Check if it's already in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
                    if (date.indexOf("T") !== -1) {
                        return new Date(date).getTime().toString();
                    }

                    // Handle DD-MMM-YYYY format (fallback)
                    if (date.indexOf("-") != -1) {
                        date = date.split("-");
                        var newDate = new Date(date[0], date[1] - 1, date[2]);
                        return newDate.getTime().toString();
                    }

                    return date; // Return as is if it's not in a recognizable format
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('Date2TimeStamp', err.message + date);
                }
            },
            get_time: function(e, _ = trackDialog) {
                try {
                    return e.dataset.time ? e.dataset.time : (e.dataset.timec ? _['M_FUN'].Date2TimeStamp(e.dataset.timec) : (SHARED_KEY && SHARED_KEY.time_c && SHARED_KEY.time_c.$numberLong ? SHARED_KEY.time_c.$numberLong : ''));
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('get_time', err.message);
                }
            },
            sorter: function(a, b, _ = trackDialog) {
                try {
                    // ? https://stackoverflow.com/questions/14131008/how-to-sort-out-elements-by-their-value-in-data-attribute-using-js
                    let [time_1, time_2] = [_['M_FUN'].get_time(a), _['M_FUN'].get_time(b)];
                    return time_1.localeCompare(time_2);
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('trackDialog.sorter', err.message);
                }
            },
            filterBy: function(data, filters = {}) {
                // Set up the specific defaults that will show everything:
                const defaults = {};
                // Merge any filters with the defaults
                filters = Object.assign({}, defaults, filters);
                // ? Filter based on that filters object:
                return data.filter(laur => {
                    return (laur.yearFrom >= filters.yearFrom) && (laur.yearTo <= filters.yearTo);
                });
            },
            getActionInfo: function(Entry, $this, $m_fun) {
                $this = trackDialog;
                $m_fun = this;
                var [ATTR, STRING, hasAction, closeRoot] = ['', '', Entry.hasAttribute('data-action'), Entry.closest('[data-action]') ? Entry.closest('[data-action]') : false];
                var closeInsert = closeRoot ? (closeRoot.tagName == "INSERT" ? true : false) : false;
                //  TC HAVE INSIDE DEL TAGS - 09_AUG_2024 - LIVE_BUGS
                let IsTC = Entry.closest(".pop_up,.oldStructure,.TrackChangesList") ? true : false;
                // ? Here Apply formatting and hyperlink for new text reject handle
                if (!hasAction && closeInsert) {
                    Entry = Entry.closest('[data-action]');
                    hasAction = true;
                }
                if (hasAction && !IsTC) {
                    var DATE_TIME = $this['M_FUN'].getDateTime(Entry, {
                            action: true
                        }),
                        ACTION_BY = $this['M_FUN'].getDisplayName(Entry.getAttribute('data-action-user') || Entry.getAttribute('data-action-By')) || "",
                        ACTION = Entry.getAttribute('data-action');
                    ATTR = `data-action="${ACTION}"`;
                    STRING = `<div class="d-flex" id="userAction"><span class="">${ACTION} by ${ACTION_BY}</span><span class="middle">${DATE_TIME[0]}</span><span class="">${DATE_TIME[1]}</span></div>`;
                }
                return [ATTR, STRING];
            },
            get_entry_info: function(node, Options = {}, self = trackDialog, mFunScope = trackDialog.M_FUN) {
                const result = {};

                // Define attribute configurations for dynamic processing
                const attributeConfig = {
                    // Basic attributes
                    IsSplit: 'data-split-child',
                    IsListStyle: 'data-list-style',
                    IsStyle: 'data-style',
                    IsHeadStyle: 'data-head-level',
                    IsInsertPara: 'data-insert-para',
                    IsMerge: 'data-para-merge',
                    IsCellAlign: 'data-cell-action',
                    IsReplaceText: 'data-group-action',
                    IsLink: 'data-link',

                    // Ref and Notes specific attributes with `assign` for custom naming
                    refAttributes: {
                        selector: '.ref',
                        assign: 'IsRef',
                        mappings: {
                            IsNewRef: 'data-new',
                            IsSorting: 'data-sort',
                            IsDelRef: ['data-delete', 'data-remove'],
                            NewRefType: 'data-ins-type',
                            InterestLevelChanged: 'data-interest-level'
                        }
                    },
                    notesAttributes: {
                        selector: '.fn',
                        assign: 'IsNotes',
                        mappings: {
                            IsNewNotes: 'data-new',
                            IsDelNotes: ['data-delete', 'data-remove']
                        }
                    },
                    // Complex IsNewFloat logic
                    IsNewFloat: {
                        complexCheck: true,
                        check: (entry) => Boolean(
                            entry.getAttribute('data-figure') === 'new' ||
                            entry.getAttribute('data-table') === 'new' ||
                            entry.closest('[data-figure="new"], [data-table="new"]') ||
                            entry.querySelector('[data-figure="new"], [data-table="new"]')
                        )
                    }
                };

                function updateConfigStatus(key, value, config_msg, result) {
                    if (config_msg[key]) {
                        config_msg[key]['IsPass'] = value;
                    }

                    if (value === true) {
                        for (const otherKey in config_msg) {
                            if (otherKey !== key && config_msg[otherKey] && config_msg[otherKey].IsPass) {
                                config_msg[otherKey].IsPass = false;
                            }
                        }

                        result.IsComment = false;
                        result.IsNewQuery = false;
                        result.IsQuery = false;
                    }
                }

                function processAttributeConfig(entry, attributeConfig, result, config_msg, Options) {
                    for (const [key, attribute] of Object.entries(attributeConfig)) {
                        let assignKey = key;

                        // if (shouldSkipResult(result)) continue;

                        if (typeof attribute === 'string') {
                            const value = entry.hasAttribute(attribute);
                            result[key] = value;
                            if (Options.action) updateConfigStatus(key, value, config_msg, result);

                        } else if (attribute.selector) {
                            const targetElement = entry.closest(attribute.selector);
                            assignKey = attribute.assign || key;
                            const isTargetFound = Boolean(targetElement);

                            result[assignKey] = isTargetFound;
                            if (Options.action) updateConfigStatus(assignKey, isTargetFound, config_msg, result);

                            if (!isTargetFound) {
                                for (const prop of Object.keys(attribute.mappings)) {
                                    result[prop] = false;
                                    if (Options.action) updateConfigStatus(prop, false, config_msg, result);
                                }
                                continue;
                            }

                            for (const [prop, attr] of Object.entries(attribute.mappings)) {
                                let value = false;

                                if (Array.isArray(attr)) {
                                    value = attr.some(attrName => targetElement.hasAttribute(attrName));
                                } else if (attr === 'data-interest-level' && entry.hasAttribute(attr)) {
                                    value = entry.getAttribute(attr);
                                } else if (attr === 'data-ins-type') {
                                    value = targetElement.getAttribute(attr) || null;
                                } else {
                                    value = targetElement.hasAttribute(attr);
                                }

                                result[prop] = value;
                                if (Options.action) updateConfigStatus(prop, value, config_msg, result);
                            }

                        } else if (attribute.complexCheck) {
                            const value = attribute.check(entry);
                            result[key] = value;
                            if (Options.action) updateConfigStatus(key, value, config_msg, result);
                        }
                    }
                }
                try {
                    const entry = node.$ || node;

                    // ? Basic properties
                    Object.assign(result, {
                        ckCloneNode: typeof node.clone === 'function' ? node.clone(true) : null,
                        CloneNode: entry.cloneNode(true, true) || null,
                        dom_node: entry,
                        disableAction: "",
                        parent: entry.parentElement,
                        tagName: entry.tagName.toLowerCase(),
                        cloneNodeTag: entry.tagName.toLowerCase(),
                        cloneNodeTagIsSpan: entry.tagName.toLowerCase() === 'span',
                        IsIns: entry.tagName.toLowerCase() === 'insert',
                        IsDel: entry.tagName.toLowerCase() === 'del',
                        IsInsDel: /insert|del/i.test(entry.tagName) || /insert|del/i.test(entry.getAttribute('data-action-old-tag')),
                        IsforMat: ['ice-reformat', 'ice-format'].includes(entry.getAttribute('data-css')),
                        ignore: false,
                        username: resolveTrackEntryUsername(entry) || entry.getAttribute('data-role') || '',
                        Rolename: entry.hasAttribute('data-rolename') ? ` (${entry.getAttribute('data-rolename')})` : "",
                        Type: entry.getAttribute('data-css') || entry.getAttribute('class'),
                        IsNewConcept: entry.hasAttribute('data-cite') || entry.hasAttribute('data-track-value'),
                        IsCite: Boolean(entry.querySelector('.xref') || entry.closest('.xref')),
                        IsReplaceImage: entry.classList.contains('replaceImage') && entry.querySelector('img'),
                        IsEq: entry.querySelectorAll('span.TEX').length > 0 || entry.querySelector('math') || /formula/gi.test(entry.className),
                        IsComment: entry.querySelectorAll('[data-class="ckcommentsfull"][data-status="comment"]').length > 0,
                        IsNewQuery: /insert/i.test(entry.tagName) && Array.from(entry.querySelectorAll('[data-class="ckcommentsfull"]')).some(el => ["open", "closed"].includes((el.getAttribute("data-status") || "").toLowerCase())),
                        IsQuery: !/insert|del/i.test(entry.tagName) && entry.hasAttribute('data-user-comment-box') && entry.parentElement.getAttribute('data-status') !== 'comment'
                    });

                    // const config_msg = self.M_SCOPE.trackInfoMessages || {};
                    const config_msg = Object.assign({}, self.M_SCOPE.trackInfoMessages || {});

                    // Unified processing for dynamic attributes and `Options.action`                        
                    processAttributeConfig(entry, attributeConfig, result, config_msg, Options);


                    // Check if this is a "NewFloat" entry
                    if (result.IsNewFloat) {
                        const tempInsertNode = entry.querySelector('insert') || entry.closest('insert');
                        if (tempInsertNode) {
                            result.username = tempInsertNode.getAttribute('data-username');
                            result.RoleName = ` (${tempInsertNode.getAttribute('data-rolename')})`;
                            result.DateTime = tempInsertNode.getAttribute('data-time');
                        }
                    }
                    const getTimeFromEntry = (entry) => {
                        const defaultTime = new Date().getTime();
                        try {
                            const el = result.IsNewFloat && entry.querySelector('insert') ? entry.querySelector('insert') : entry;
                            const {
                                timec,
                                time
                            } = el.dataset;

                            return (timec || time) ? this.Date2TimeStamp(timec || time) : defaultTime;
                        } catch (err) {
                            return defaultTime;
                        }
                    };

                    // if (IS_LOCAL_HOST) debugger;
                    // Extract timestamp from entry
                    const timeStamp = getTimeFromEntry(entry);
                    result.Time = moment(Number(timeStamp)).format('hh:mm A');
                    result.Date = moment(Number(timeStamp)).format('DD-MMM-YYYY');
                    result.DateTime = timeStamp;
                    var isCollator = ROLE_IDS.CO == USER_INFO.ROLE_ID ? true : false;


                    // Additional static options assignments to `config_msg`
                    if (Options.action) {

                        Object.assign(config_msg, {
                            IsReplaceImage: Object.assign({}, config_msg.IsReplaceImage, {
                                IsPass: result.IsReplaceImage
                            }),

                            IsEq: Object.assign({}, config_msg.IsEq, {
                                IsPass: (
                                    (result.IsEq && !result.IsIns) ||
                                    entry.querySelector('math') ||
                                    entry.hasAttribute('track-lab-type')
                                )
                            })
                        });

                        // SPL_ACTION processing
                        self.M_SCOPE.IsNestedInsert = Boolean(entry.querySelector('insert'));
                        self.SPL_ACTION.forEach(root => {
                            if (config_msg[root] && config_msg[root].IsPass && !result.splTrack) {
                                const {
                                    getInfo,
                                    Info,
                                    Ignore,
                                    isDeleted
                                } = config_msg[root];
                                result.splTrack = {
                                    key: root,
                                    getInfo: getInfo,
                                    info: Info,
                                    type: "",
                                    Ignore: Ignore || false,
                                    isDeleted: isDeleted || false
                                };

                            }
                        });
                    }

                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('get_current_entry_info', err.message);
                } finally {
                    return result;
                }
            },
            lww_reject_comfirmation: async function(action, entryTag) {

                // ? 3475736	Reject Button usage alert

                try {
                    const messages = {
                        del: "Are you sure you want to reject this deletion and restore the deleted content?",
                        for: "Are you sure you want to reject the formatting changes for this selection?",
                        insert: "Are you sure you want to remove the inserted text in this selection?"
                    };

                    const getConfirmationMessage = (entryTag) => messages[entryTag] || messages.insert;

                    const isLWWClient = commonMethods.getClientCode({
                        format: "upper"
                    }) === "LWW";
                    const localKey = `xmleditor:${DOC_ID}_rejectConfirmationShown_${entryTag}`;
                    const message = getConfirmationMessage(entryTag);

                    if (!isLWWClient || !message) return true;

                    const isAuthor = USER_INFO.ROLE_ID === '5b53536b4c4a803e9a5abf70';
                    const isReject = action === 'Rejected';

                    if (!isAuthor || !isReject) return true;

                    const hasSeen = localStorage.getItem(localKey);
                    if (hasSeen) return true;

                    const result = await AlertNewDialog.fire('warning', 'Confirm', message, 'Yes', 'No');
                    if (!result.isConfirmed) return false;

                    localStorage.setItem(localKey, 'true');
                    return true;

                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('lww_reject_comfirmation', err.message);
                    return true; // Default to allowing the action if there's an error
                }
            },
            newTrackAction: async function(e, self, mFunScope) {
                self = trackDialog;
                mFunScope = trackDialog.M_FUN;
                try {
                    if (this.hasAttribute('disabled')) return true;
                    var ACTION_DOM = self.iDOM;
                    var Action = (this.id == 'btnAcceptTrack') ? 'Accepted' : 'Rejected',
                        IsAccept = (Action == 'Accepted') ? true : false,
                        list_Entry = mFunScope.getActive(),
                        listPar_Entry = list_Entry.parentElement,
                        Entry_Tag = listPar_Entry.getAttribute('data-tag'),
                        Entry_id = listPar_Entry.getAttribute('data-id'),
                        Entry_UserName = listPar_Entry.getAttribute('data-username');

                    const canProceed = await mFunScope.lww_reject_comfirmation(Action, Entry_Tag);
                    if (!canProceed) return true;

                    self._SNAPSHOT({
                        lock: true,
                        save: true
                    });
                    let [FindQuerySyn, Entry_Index, editorElement, IsComment_Id] = [null, null, null, null];
                    let [IsShowSpanTrack, IMP_DIRECT_REPLACE] = [false, false];
                    // ? end of assign variables
                    FindQuerySyn = "[data-time='" + Entry_id + "']";
                    Entry_Index = Array.from(self['IBOX'].EntryGroup.querySelectorAll("[data-id='" + Entry_id + "']")).indexOf(list_Entry.parentElement);
                    editorElement = GlobalEditor.document.find(FindQuerySyn).getItem(Entry_Index);
                    if (!editorElement) {
                        // ? 09_MAY_2023 - YA
                        debug.log([FindQuerySyn, Entry_Index]);
                        return ErrorLogTrace('newTrackAction', "editorElement not found =" + Entry_Index + "-" + FindQuerySyn);
                    }
                    // ? 13_NOV_2022 - YA - RETAIN ID ALSO FOR CLONE NODE FROM CK_NODE FUNCTION
                    var ENTRY_INFO = mFunScope.get_entry_info(editorElement),
                        {
                            IsNotes,
                            IsNewNotes,
                            IsRef,
                            IsNewRef,
                            IsNewQuery,
                            IsComment,
                            IsQuery,
                            IsReplaceImage,
                            IsEq,
                            IsLink,
                            IsSplit,
                            IsInsertPara,
                            IsNewFloat,
                            IsListStyle,
                            IsStyle,
                            IsHeadStyle,
                            IsMerge,
                            IsCellAlign,
                            IsReplaceText,
                            ckCloneNode,
                            cloneNodeTag,
                            disableAction
                        } = ENTRY_INFO;
                    if (IsComment) {
                        IsComment_Id = editorElement.find('[data-class="ckcommentsfull"]').$[0].id;
                        ckCloneNode.find('[data-class="ckcommentsfull"]').$[0].id = IsComment_Id;
                    }
                    // ?  Assign accepted format attributes cloned node
                    var CurrentTime = new Date().getTime() + "";
                    // ?  get action user details
                    let ActionKeys = {
                            "data-action-time": CurrentTime,
                            "data-action-user": USER_INFO.MAIL_ID,
                            "data-action": Action,
                            "data-action-old-tag": cloneNodeTag
                        },
                        PostMethod = {
                            Can_reGen_CMD_QRY: false,
                            Can_reGen_All: false,
                            Can_setData: false,
                            Can_Remove: false,
                            CanReplaceParent: false,
                            Can_Check_format: false
                        },
                        ActionTime = mFunScope.getDateTime(CurrentTime),
                        ActionBy = mFunScope.getDisplayName(USER_INFO.MAIL_ID),
                        actionString = (`<div class="d-flex justify-content-between" id="userAction" title=""><span class="">${Action} by ${ActionBy}</span><span class="middle">${ActionTime[0]}</span><span class="">${ActionTime[1]}</span></div>`);
                    // ? Append in track dialog
                    ckCloneNode.setAttributes(ActionKeys);
                    if (!list_Entry.querySelector('#userAction')) {
                        list_Entry.append(self.GetFragment(actionString));
                        listPar_Entry.setAttribute('data-action', Action);
                    }
                    const FOR_DEFOR = function() {
                        try {
                            if ((!IsAccept && Entry_Tag.match(/for/)) || (IsAccept && Entry_Tag.match(/for-re/))) {
                                ckCloneNode.setAttributes({
                                    "data-action-hidden": "No"
                                });
                                ckCloneNode.renameNode('span');
                            }
                            if (!IsAccept && Entry_Tag.match(/for-re/)) {
                                let oCLass = ckCloneNode.$.getAttribute('data-class-old'),
                                    oTag = ckCloneNode.$.getAttribute('data-tag-old');
                                ckCloneNode.setAttributes({
                                    "data-name": oCLass
                                });
                                //ckCloneNode.removeAttributes(['data-class-old','data-tag-old']);
                                ckCloneNode.renameNode(oTag);
                            }
                        } catch (err) {
                            console.warn(err.message);
                            ErrorLogTrace('FOR_DEFOR', err.message);
                        }
                    };
                    const Image_Replace_Track = function(editElem, idom) {
                        try {
                            let oSubtype = ckCloneNode.$.getAttribute('old-mime-subtype');
                            let oHref = ckCloneNode.$.getAttribute('old-href');
                            let clone_img = ckCloneNode.$.querySelector('img');
                            let attrId = $(editElem.$).parent().attr('id');
                            PostMethod.Can_setData = PostMethod.Can_reGen_All = true;
                            if (!IsAccept) {
                                ckCloneNode.setAttributes({
                                    "mime-subtype": oSubtype,
                                    "xlink\:href": oHref
                                });
                                if (oSubtype == "null") {
                                    ckCloneNode.removeAttribute('mime-subtype');
                                }
                                //?command Track view replace image not shown DR_20_01_2023
                                // ckCloneNode.$.classList.remove('replaceImage')
                                self.G_FUN.SET_REMOVE_ATTR(clone_img, {
                                    "src": clone_img.getAttribute('old-src')
                                }, ['title']);
                            } else {}
                            let imgAnna = $(idom).find('#' + attrId).find('[data-class="ckcommentsfull"]>[data-annotate]');
                            if (imgAnna.length > 0) {
                                imgAnna.each(function(idx, el) {
                                    if (!IsAccept) $(el).removeAttr('data-ignore-comment');
                                    else $(el).parents('insert').remove();
                                });
                            }

                        } catch (err) {
                            console.warn(err.message);
                            ErrorLogTrace('Image_Replace_Track', err.message);
                        }
                    };
                    const new_float = function() {
                        try {
                            if (!IsAccept) {
                                ckCloneNode.setAttributes({
                                    "data-action-hidden": "Yes"
                                });
                                ckCloneNode.$.querySelectorAll('span[data-class="ckcommentsfull"]').forEach(element => {
                                    PostMethod.Can_setData = true;
                                    ckCloneNode.setAttributes({
                                        "data-action-hidden": "Yes"
                                    });
                                    ckCloneNode.renameNode('span');
                                });

                            }
                        } catch (err) {
                            console.warn(err.message);
                            ErrorLogTrace('new_float', err.message);
                        }
                    };
                    // ? Set Data on Manipulate
                    self.Set_DOM_Data(null, {
                        DOM: true
                    });
                    var domElement = ACTION_DOM.querySelectorAll(FindQuerySyn)[Entry_Index];
                    // ? do action related conditions
                    if (Entry_Tag.match(/insert|del/) && !IsReplaceImage && !IsLink && !IsSplit && !IsInsertPara && !IsNewFloat && !IsListStyle && !IsStyle && !IsHeadStyle && !IsMerge && !IsCellAlign) {
                        // ?  09_DEC_22 - YA - DIRECT REPLACE ON EDITOR
                        IMP_DIRECT_REPLACE = true;
                        editorElement.setAttributes(ActionKeys);
                        ACTION_DOM = GlobalEditor.document;
                        let nObj = {
                            "data-action-hidden": "Yes"
                        };
                        if ((!IsAccept && Entry_Tag.match(/insert/)) || (IsAccept && Entry_Tag.match(/del/))) {
                            editorElement.setAttributes(nObj);
                            PostMethod.Can_reGen_All = PostMethod.Can_reGen_CMD_QRY = true;
                        }
                        // ? 13_OCT_2023 - FIND_REPLACE_ACCEPT_REJECT
                        if (IsReplaceText) {
                            let [next, prev, sibling, sibling_Tag] = [editorElement.getNext(), editorElement.getPrevious(), null, null];
                            [next, prev].forEach(node => {
                                if (node && node.$ && node.$.nodeType == 1 && node.hasAttribute("data-group-action") && !node.hasAttribute("data-action")) {
                                    sibling = node;
                                    sibling_Tag = node.getName();
                                }
                            });
                            if (sibling) {
                                ActionKeys["data-action-old-tag"] = sibling_Tag;
                                sibling.setAttributes(ActionKeys);
                                if ((!IsAccept && sibling_Tag.match(/insert/gi)) || (IsAccept && sibling_Tag.match(/del/gi))) {
                                    sibling.setAttributes(nObj);
                                }
                                mFunScope.IsFormatWithInsert(editorElement, list_Entry, {
                                    type: Action,
                                    dom: actionString,
                                    pair: {
                                        tag: sibling_Tag,
                                        time: sibling.getAttribute("data-time")
                                    }
                                });
                            }
                        }
                        if ((IsAccept && Entry_Tag.match(/insert/)) || (!IsAccept && Entry_Tag.match(/del/))) {
                            IsShowSpanTrack = false;
                        }
                        if (!IsEq && !IsReplaceText) {
                            mFunScope.IsFormatWithInsert(editorElement, list_Entry, {
                                type: Action,
                                dom: actionString,
                                attr: ActionKeys
                            });
                        } else if (IsReplaceText) {}
                    } else if (Entry_Tag.match(/for|for-re/) && !IsLink && !IsSplit && !IsInsertPara && !IsNewFloat && !IsListStyle && !IsStyle && !IsHeadStyle && !IsMerge && !IsCellAlign) {
                        FOR_DEFOR();
                        PostMethod.Can_Check_format = true;
                    } else if (IsReplaceImage && !IsNewFloat) {
                        Image_Replace_Track(editorElement, self.iDOM);
                    } else if (IsNewFloat) {
                        new_float();
                    } else if (IsLink) {
                        hyperLinkDialog.RemoveReject(editorElement, {
                            remove: false,
                            action: Action
                        });
                        // ? Update Accpt/Reject Btn State
                        setTimeout(() => {
                            mFunScope.updateTrackView("restore");
                        }, 250);
                        IMP_DIRECT_REPLACE = false;
                        return;
                    } else if (IsEq) {} else if (IsInsertPara) {
                        if (!IsAccept) {
                            // ? MAC_CHROME_88_10-_MAY_22_AN
                            ckCloneNode.setAttributes({
                                "data-action-hidden": "Yes"
                            });
                            //$(ckCloneNode.$).contents().empty();
                            // ? 12_MAY_2023 - YA
                            ckCloneNode.find("insert").toArray().forEach(node => {
                                node.setAttributes(ActionKeys);
                            });
                        }
                        mFunScope.IsFormatWithInsert(editorElement, list_Entry, {
                            type: Action,
                            dom: actionString
                        });
                    } else if (IsSplit) {
                        if (!IsAccept) {
                            var clone_Id = editorElement.getAttribute('id');
                            ckCloneNode.renameNode('span');
                            ckCloneNode.removeAttributes(['data-name', 'class', 'content-type']);
                            ckCloneNode.setAttributes({
                                'data-split-child': 'no',
                                'id': clone_Id
                            });
                            // ? moved from bottom
                            var ParentId = domElement.getAttribute('data-parent-id');
                            var ChildId = domElement.getAttribute('id');
                            if (!!ParentId && !!ChildId) {
                                // ? Adding space before/after
                                $(self.iDOM.querySelector(`#${ParentId}`)).append(' ', self.iDOM.querySelector(`#${ChildId}`));
                                PostMethod.Can_setData = false;
                                PostMethod.Can_Remove = true;
                                PostMethod.CanReplaceParent = true;
                                PostMethod.CanReplaceParent_Id = ParentId;
                            }
                        }
                    } else if (IsMerge) {
                        if (!IsAccept) {
                            // ? CH_107 & BUG  T&F_B_ SR_077 - YA 
                            var [cloneId, parId, cloneNode2] = [editorElement.getAttribute('merge-id'), ckCloneNode.getAttribute('data-id'), ckCloneNode.clone(true)];
                            // var parId = ckCloneNode.getAttribute('data-id');
                            // var ckCloneNode2 = editorElement.clone(true);
                            cloneNode2.renameNode('div');
                            // ? updated abs para merge
                            let $node = $(ckCloneNode.$);
                            let Obj = {};

                            // Assign only if attribute exists
                            let contentType = $node.attr('data-content-type');
                            if (contentType) Obj["content-type"] = contentType;

                            let id = $node.attr('data-old-id');
                            if (id) Obj["id"] = id;

                            // If either data-old-name or data-old-class exists, use it for both
                            let nameOrClass = $node.attr('data-old-name') || $node.attr('data-old-class');
                            if (nameOrClass) {
                                Obj["data-name"] = nameOrClass;
                                Obj["class"] = nameOrClass;
                            }

                            // Handle para-id_old and target-id_old
                            let paraIdOld = $node.attr('data-para-id_old');
                            if (paraIdOld) Obj["data-para-id"] = paraIdOld;

                            let targetIdOld = $node.attr('data-target-id_old');
                            if (targetIdOld) Obj["data-target-id"] = targetIdOld;


                            let remove_attr = ['data-content-type', 'data-old-name', 'data-old-class', 'data-old-id'];
                            const isSameUser = commonMethods.IS_SAME_USER_AND_ROLE(ckCloneNode);
                            if (isSameUser) remove_attr.push("data-para-merge", "merge-id", "data-time", "data-username", "data-id", "data-action-time", "data-action-By", "data-action-user", "data-action", "data-action-old-tag");
                            self['G_FUN'].SET_REMOVE_ATTR(cloneNode2.$, Obj, remove_attr);
                            /* $(cloneNode2.$).attr("content-type", $(ckCloneNode.$).attr('data-content-type')).removeAttr('data-content-type').attr("data-name", $(ckCloneNode.$).attr('data-old-name')).removeAttr('data-old-name').attr("class", $(ckCloneNode.$).attr('data-old-class')).removeAttr('data-old-class').attr("id", $(ckCloneNode.$).attr('data-old-id')).removeAttr('data-old-id'); */
                            var IsPrev = ckCloneNode.getAttribute('data-para-merge') == 'prev';
                            let space_elm = cloneNode2.$.querySelector(`[data-space-id="${cloneNode2.$.id}"]`);
                            if (space_elm) space_elm.remove();
                            $(cloneNode2.$)[IsPrev ? 'insertAfter' : 'insertBefore'](editorElement.$.parentElement);
                            PostMethod.Can_setData = PostMethod.Can_reGen_All = false;
                            PostMethod.Can_Remove = true;
                            // TODO NEED TO CHECK MATH RENDERING and PARA_GROUP ICONS
                        }
                    } else if (IsCellAlign) {
                        if (!IsAccept) {
                            let orgAlign = ckCloneNode.getAttribute('data-org-align');
                            ckCloneNode.removeAttribute('data-cell-action');
                            ckCloneNode.setAttributes({
                                'align': orgAlign,
                            });
                        }
                    }
                    let updateNode = null;
                    if (IMP_DIRECT_REPLACE) {
                        // ? 09_DEC_2022_OUP_J_ SR_094_geac025_QA_MAC_Safari 16
                        let GroupActionTime = ckCloneNode.getAttribute('data-time');
                        if (IsShowSpanTrack) {
                            let cloneNodeShow = mFunScope.GET_SHOW_SPAN_TRACK(ckCloneNode);
                            $(editorElement.$).after(cloneNodeShow.$);
                            self.G_FUN.iunWrap(editorElement.$);
                            ACTION_DOM.find(`[data-group-action][data-time="${GroupActionTime}"]`).toArray().forEach(el => {
                                if (true) {
                                    let temp_elm = mFunScope.GET_SHOW_SPAN_TRACK(el);
                                    $(el.$).after(temp_elm.$);
                                }
                                el.remove();
                            });
                        }
                    } else {
                        updateNode = ckCloneNode.$ ? ckCloneNode.$.outerHTML : ckCloneNode;
                        $(domElement).replaceWith(updateNode);
                    }

                    if (self['M_SCOPE'].IsLoopReturn) {
                        // ? return here within inner actions
                        self['M_SCOPE'].IsLoopReturn = false;
                        return;
                    }
                    if (IsComment && PostMethod.Can_reGen_CMD_QRY) {
                        var temp = ACTION_DOM.querySelector(`[data-hid="${IsComment_Id}"]`);
                        if (temp) temp.setAttribute("data-action", Action);

                        PostMethod.Can_setData = IMP_DIRECT_REPLACE ? false : true;
                    } else if (IsRef) {
                        let temp_ref = editorElement.$.closest('.ref'),
                            AcceptRejectXref = false;
                        if (temp_ref) {
                            if (!IsAccept) {
                                if (IsNewRef && editorElement.findOne('.mixed-citation')) {
                                    // ? handle newly inserted ref
                                    if (temp_ref.hasAttribute('data-new')) {
                                        DEL_REF_FIRE(temp_ref.id, {
                                            FROM_TRACK: true,
                                            DOM: self.iDOM,
                                            IS_DOM_MANIPULATE: false
                                        });
                                    } else if (temp_ref.hasAttribute('data-remove')) {
                                        CitationNewModule['M_FUN'].Revert_Del_Cite(temp_ref.getAttribute('del_id'));
                                    }
                                    PostMethod.Can_setData = true;
                                    PostMethod.Can_reGen_All = false;
                                } else {
                                    // ? edit reference elements
                                    AcceptRejectXref = !0;
                                }
                            } else {
                                // ? accepted
                                AcceptRejectXref = !0;
                            }
                            if (AcceptRejectXref && ACTION_DOM && typeof ACTION_DOM.find == "function") {
                                // ? add attributes all related cites
                                ACTION_DOM.find(`a[rid*="${temp_ref.id}"][data-old-cite]`).toArray().forEach((cite) => {
                                    cite.setAttributes(ActionKeys);
                                    if (!IsAccept) {
                                        let oldVal = cite.getAttribute("data-old-cite"),
                                            curVal = cite.getText(),
                                            isEtAlItalic = cite.getHtml().includes("italic");
                                        cite.setAttribute("data-reject-cite", curVal);
                                        // TODO: create citation from class module
                                        //cite.setText(oldVal);
                                        if (isEtAlItalic) oldVal = oldVal.replace("et al.", "<em class='italic' data-name='italic'>et al.</em>");
                                        cite.setHtml(oldVal);
                                    }
                                });

                                // ? also do action pair of ins/del
                                if (editorElement.hasAttribute("data-edit")) {
                                    let attr = editorElement.getAttribute("data-edit"),
                                        tempId = "";
                                    editorElement.getParent().find(`[data-edit="${attr}"]`).toArray().forEach((elm) => {
                                        elm.setAttributes(ActionKeys);
                                        if (!editorElement.equals(elm)) {
                                            tempId = elm.getAttribute("data-time");
                                        }
                                    });
                                    if (tempId) {
                                        Array.from(list_Entry.parentElement.parentElement.querySelectorAll("[data-id='" + tempId + "']")).forEach(el => {
                                            if (!el.querySelector('#userAction')) {
                                                el.querySelector('.track-entry-div').append(self.GetFragment(actionString));
                                                el.setAttribute('data-action', Action);
                                            }
                                        });
                                    }
                                }

                            }
                        }
                    }
                    if (PostMethod.Can_setData && !IMP_DIRECT_REPLACE) {
                        SET_DATA.setNewData(self.iDOM, {
                            DOM_Empty: PostMethod.Can_reGen_All,
                            reGenerateAll: PostMethod.Can_reGen_All,
                            cleanHTML: false
                        });
                    } else if (!PostMethod.Can_setData && !IMP_DIRECT_REPLACE) {
                        // ? 09-Jun-22
                        if (PostMethod.Can_Remove) {
                            // ? handle para-merge - handle 
                            $(editorElement.$).remove();
                            if (PostMethod.CanReplaceParent) {
                                // ? split para reject
                                let _id = PostMethod.CanReplaceParent_Id;
                                $(GlobalEditor.document.getById(_id).$).replaceWith(self.iDOM.querySelector(`#${_id}`));
                            }
                        } else {
                            $(editorElement.$).replaceWith(updateNode);
                            if (PostMethod.Can_Check_format) {
                                mFunScope.FormattingAction(FindQuerySyn, Entry_Index, updateNode, ActionKeys);
                            }
                        }
                    }
                    if (PostMethod.Can_reGen_All) {
                        // ? T&F_B_ SR_092  12_NOV_22 -Wind 10_Chrome 107 - YA
                        SET_DATA.reGenerateAllInit();
                    }
                    let next = listPar_Entry.nextElementSibling ? listPar_Entry.nextElementSibling : listPar_Entry,
                        isRefAction = false;
                    if (IsRef && !PostMethod.Can_reGen_All) {
                        $(self['IBOX'].EntryGroup).addClass('d-flex justify-content-center align-items-center').html('').append(self.templateList.SPIN);
                        trackDialog.showLoop(trackDialog['M_SCOPE'].FINAL_ACT_ID);
                        isRefAction = true;
                    }
                    setTimeout(() => mFunScope.selectEntry(next), 100);
                    if (isRefAction) {
                        setTimeout(() => {
                            mFunScope.updateTrackView("restore");
                        }, 250);
                    }

                    // ? AFTER ACCEPT/REJECT = UPDATE LAST COLLECTION
                    self['M_SCOPE'].OldListCollection = self.iDOM.querySelectorAll(self['M_SCOPE'].TrackFindQuery);
                    self._SNAPSHOT({
                        unlock: true,
                        save: true
                    });
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('newTrackAction', err.message);
                }
            },
            handle_Space_Character: function(EntryInfo, Options = {}, $this) {
                $this = trackDialog;

                const {
                    whitespaceOnlyRegex,
                    trackInfoMessages
                } = $this['M_SCOPE'];
                const {
                    Text,
                    IsNewConcept,
                } = EntryInfo;

                // Full list of Unicode space characters to check
                const allSpaceChars = [
                    '', ' ', '\u00A0', '\u2002', '\u2003', '\u2004', '\u2005', '\u2006',
                    '\u2007', '\u2008', '\u2009', '\u200A', '\u202F', '\u200B', '\u2060', '\u205F',
                    '\u00AD'
                ];

                // Mapping Unicode spaces to human-readable names
                const spaceNames = {
                    '\u0020': '[Character Space]',
                    '\u00A0': '[Character Space]',
                    '\u2002': '[En Space]',
                    '\u2003': '[Em Space]',
                    '\u2004': '[Three-Per-Em Space]',
                    '\u2005': '[Four-Per-Em Space]',
                    '\u2006': '[Six-Per-Em Space]',
                    '\u2007': '[Figure Space]',
                    '\u2008': '[Punctuation Space]',
                    '\u2009': '[Thin Space]',
                    '\u200A': '[Hair Space]',
                    '\u202F': '[Narrow No-Break Space]',
                    '\u200B': '[Zero Width Space]',
                    '\u2060': '[Word Joiner]',
                    '\u205F': '[Medium Mathematical Space]',
                    '\u00AD': '[Soft Hyphen]'
                };

                try {
                    function getSpaceNames(str) {
                        return [...str].map(char => spaceNames[char] || '[Unknown Space]').join(', ');
                    }

                    // Example handling
                    if (allSpaceChars.includes(Text) || whitespaceOnlyRegex.test(Text)) {
                        let temp = trackInfoMessages.IsCharacterSpace;
                        EntryInfo.Text = getSpaceNames(Text); // Replace with readable names
                        EntryInfo.topRowCSS = temp.topRowCSS;
                    }
                    return EntryInfo;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('handle_Space_Character', err.message);
                    return EntryInfo;
                }
            },

            All_Count_Details_Current_User: function(Options = {}, $this, $m_fun) {
                // ? 2839604: Impact dashboard
                $this = trackDialog;
                $m_fun = this;
                /* beautify preserve:start */
                            const Count = { Eq: 0, Ref: 0, Merge: 0, Split: 0, Style: 0, Query: 0, Insert: 0, Delete: 0, forMat: 0, Comment: 0, NewFloat: 0, ListStyle: 0, HeadStyle: 0, InsertPara: 0, ReplaceText: 0 },
                                Text = {},
                                node_Collection = {};
                            /* beautify preserve:end */
                try {
                    let selector = $this.M_SCOPE.TrackFindQuery.concat(",", "span[data-action]"),
                        collection = GlobalEditor.document.find(selector).toArray(),
                        prefix = "Is";
                    Array.from(collection).forEach((item, ind, arr) => {
                        var actionInfo = {},
                            el = item.$,
                            IsSameUser = commonMethods.IS_SAME_USER_AND_ROLE(el),
                            IsAQ = el.dataset.name == "AQ";
                        if (IsSameUser || IsAQ) {
                            actionInfo = $m_fun.get_entry_info(el, {
                                returnJson: true
                            });
                        } else {
                            if (IsAQ) {}
                        }
                        if (Object.keys(actionInfo).length == 0) {
                            return debug.log("empty");
                        }
                        /* beautify preserve:start */
                                    let { IsInsDel, IsIns, IsReplaceImage, CloneNode, IsRef, IsNewFloat, IsDelRef, IsNewRef, IsComment, IsQuery, IsEq, IsSplit, IsStyle, IsMerge, IsListStyle, IsInsertPara, IsHeadStyle, IsCellAlign } = actionInfo;
                                    /* beautify preserve:end */
                        // ? Dynamically update the Count based on nodeAttributes
                        for (const key in Count) {
                            if (actionInfo[key] || actionInfo[prefix + key]) {
                                Count[key]++;

                                // ! console purpose
                                if (!node_Collection[key]) node_Collection[key] = [];
                                node_Collection[key].push(el);
                            }
                        }
                        if (IsInsDel || IsReplaceImage) {
                            let keys = (IsIns || IsReplaceImage) ? 'Insert' : 'Delete';
                            Count[keys]++;
                            if (IsRef && actionInfo.parent.className.includes("label")) {
                                // ? label renumbering
                                Count[keys]--;
                            }
                            // ! console purpose
                            if (!Text[keys]) Text[keys] = [];
                            Text[keys].push((CloneNode.textContent));
                            if (!node_Collection[keys]) node_Collection[keys] = [];
                            node_Collection[keys].push(el);
                        }
                        if (IsRef) {
                            if (IsDelRef || IsNewRef) {

                            } else if (IsComment || IsQuery || IsInsDel || CloneNode.hasAttribute('data-user-comment-box')) {
                                // ? ref count minus - inside ref corrections
                                Count.Ref--;
                                node_Collection['Ref'].pop();
                            }
                        } else if ((IsSplit || IsStyle || IsMerge || IsListStyle || IsInsertPara || IsHeadStyle || IsCellAlign)) {
                            if (IsEq) {
                                Count.Eq--;
                                node_Collection['Eq'].pop();
                            }
                            if (IsSplit || IsStyle || IsMerge || IsHeadStyle || IsListStyle || IsCellAlign) {
                                Count.forMat++;
                            }
                        } else if (IsComment) {
                            Count.Insert--;
                        }
                    });
                    debug.log(Count, Text, node_Collection);
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('All_Count_Details_Current_User', err.message);
                } finally {
                    return Count;
                }
            },
            generate_Track_Items: function(data, Options, self, $m_fun) {
                self = trackDialog;
                $m_fun = trackDialog.M_FUN;
                try {
                    Options = Options ? Options : ({
                        init: false
                    });

                    if (IS_JOURNAL) Update_Duplicate_TimeStamps();

                    self.SPL_ACTION = ["IsComment", "IsReplaceImage", "IsNew_AU_Note", "IsNewFloat", "IsNewQuery", 'IsQuery', "IsSplit", "IsListStyle", 'IsInsertPara', 'IsMerge', 'IsHeadStyle', 'IsStyle', 'IsEq', 'IsLink', 'IsCellAlign'];
                    self.SPL_ACTION_STYLE = ["IsListStyle", 'IsHeadStyle', 'IsStyle'];

                    if (!Options.init) {
                        self.Set_DOM_Data(data, {
                            DOM: true
                        });
                    }

                    if (IS_TEST_ENV) {
                        self['M_SCOPE'].TrackFindQuery = self['M_SCOPE'].TrackFindQuery.concat(",", "span[data-action]");
                    }
                    const entryGroup = resolveTrackEntryGroup(self);
                    if (!entryGroup) {
                        console.warn("generate_Track_Items: trackListGroup not ready");
                        return;
                    }
                    var FIND = self.iDOM.querySelectorAll(self['M_SCOPE'].TrackFindQuery);
                    if (self['M_SCOPE'].OldListCollection.length > 0 && entryGroup.childElementCount != 0) {
                        // ? https://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript
                        let array1 = Array.from(self['M_SCOPE'].OldListCollection);
                        let array2 = Array.from(FIND);
                        if (array1.length === array2.length && array1.every((value, index) => value.outerHTML === array2[index].outerHTML)) {
                            // DOM unchanged, but still reconcile filters and focus
                            this.applyTypeFilter();
                            this.applyCombinedFilter();
                            const lastFocusId = Options.lastFocusId || self['M_SCOPE'].FINAL_ACT_ID;
                            if (lastFocusId && self.M_SCOPE.TrackCount > 0) {
                                const focusOptions = {
                                    session: true
                                };
                                if (Options.ignore_editor_focus) {
                                    focusOptions.ignore_editor_focus = true;
                                }
                                self.M_FUN.focusLastItem(lastFocusId, focusOptions);
                            }
                            return;
                        }
                    }
                    self.M_SCOPE.OldListCollection = FIND;
                    self.M_SCOPE.userListdup = {};
                    self.M_SCOPE.StringArr = [];
                    self.M_SCOPE.RepeatedTimes = {
                        find: [],
                        reTry: 1,
                        stamp: {}
                    };
                    self.M_SCOPE.dropList = []; // Reset for new collection
                    if (Options.RepeatedTimes) {
                        Object.assign(self.M_SCOPE.RepeatedTimes, Options.RepeatedTimes);
                    }
                    // ? get last active
                    this.setLastActive_Id();
                    self.M_SCOPE.Last_Item = null;
                    Array.from(FIND).forEach((item, ind, arr) => {
                        let stringItem = ForEach_Entry(item, ind);
                        self['M_SCOPE'].StringArr.push(stringItem);
                    });
                    var fragList = self.GetFragment(self['M_SCOPE'].StringArr.join(''));
                    entryGroup.classList.remove('d-flex', 'justify-content-center', 'align-items-center');
                    entryGroup.innerHTML = '';
                    entryGroup.append(fragList);
                    // Populate drop-list dropdown with unique values
                    if (self.M_SCOPE.dropList) {
                        if (self.M_SCOPE.dropList.length === 0) {
                            const els = self.Panel.querySelectorAll(".t-text-ins.d-flex");
                            const seen = new Set();

                            for (var i = 0; i < els.length; i++) {
                                var txt = (els[i].textContent || "").trim();

                                // must start with "[" and end with "]"
                                if (txt.startsWith("[") && txt.endsWith("]")) {
                                    var inner = txt.substring(1, txt.length - 1);

                                    // normalize: remove trailing numbers like "New Comment 1" → "New Comment"
                                    var normalized = inner.replace(/\s*\d+$/, "");
                                    // skip if contains any digit inside (after normalization)
                                    if (!/\d/.test(normalized)) {
                                        seen.add(normalized);

                                        // set attribute on the element itself
                                        els[i].setAttribute("data-drop-list", normalized);
                                    }
                                }
                            }

                            self.M_SCOPE.dropList = Array.from(seen);
                        }

                        const dropSelect = document.getElementById('TrackTypeSelectOpt');
                        if (dropSelect) {
                            // Keep only the "All" option
                            dropSelect.innerHTML = '<option value="all" selected>All Drop-List Types</option>';
                            // Add unique values
                            self.M_SCOPE.dropList.forEach(value => {
                                const option = document.createElement('option');
                                option.value = value;
                                option.textContent = value;
                                dropSelect.appendChild(option);
                            });
                        }
                    }
                    // Get saved filter values: prefer sessionStorage, then DOM, then default
                    const trackViewCache = JSON.parse(sessionStorage.getItem('track_dialog_cache') || '{}');
                    const sessionUser = trackViewCache.user;
                    const trackSelect = document.getElementById('TrackSelectOpt');
                    const domUser = trackSelect && trackSelect.value;
                    const savedUserFilter = sessionUser || domUser || 'allusers';
                    let savedTypeFilter = 'all';
                    const typeFilterEl = document.querySelector('input[name="trackTypeFilter"]:checked');
                    if (typeFilterEl && typeFilterEl.value) {
                        savedTypeFilter = typeFilterEl.value;
                    }


                    this.refreshArray();
                    if (IS_TRACK_VIEW) {
                        this.Reset_Btns_Count();
                    }
                    // ? 02_AUG_2023_YA - UPDATE
                    let LIST_USER = Object.values(self['M_SCOPE'].userListdup),
                        newList = LIST_USER.join("");
                    $('#TrackSelectOpt').html('').append(`<option data-default-order="0" value="allusers" selected>All Users</option>${newList}`);

                    // Restore user filter if option exists in new dropdown
                    const userSelect = document.getElementById('TrackSelectOpt');
                    if (userSelect && savedUserFilter !== 'allusers') {
                        const optionExists = Array.from(userSelect.options).some(opt => opt.value === savedUserFilter);
                        if (optionExists) {
                            userSelect.value = savedUserFilter;
                        }
                    }
                    [`option[value*='Query']`, `option[value*='note']`].forEach((key, idx, arr) => {
                        let opt = document.querySelector(`#TrackSelectOpt ${key}`);
                        if (opt && opt.parentElement) {
                            if (idx == 0) opt.textContent = "Queries";
                            opt.parentElement.item(idx).after(opt);
                        }
                    });
                    // ? 28_OCT_22 - YA
                    entryGroup.querySelectorAll(self['M_SCOPE'].Find).forEach((el, idx, arr) => {
                        /* 03_AUG_2023 ? REMOVE DUPLICATES */
                        if (el) {
                            el.onclick = $m_fun.selectEntry;
                            let current = el.querySelector(`[data-status="comment"][data-id]`);
                            let next = arr[idx + 1] ? arr[idx + 1].querySelector(`[data-status="comment"][data-id]`) : null;
                            if (current && next) {
                                if (next.dataset.id && next.dataset.id == current.dataset.id) {
                                    if (arr[idx + 1].parentElement) {
                                        arr[idx + 1].parentElement.removeChild(arr[idx + 1]);
                                    } else {
                                        arr[idx + 1].remove();
                                        debug.log("---REMOVED---");
                                    }
                                }
                            }
                        }
                    });

                    if (self.M_SCOPE.RepeatedTimes.find.length > 0 && self.M_SCOPE.RepeatedTimes.reTry < 10) {
                        let selector = commonMethods.Duplicate_Array(self.M_SCOPE.RepeatedTimes.find);
                        GlobalEditor.document.find(selector.join(",")).toArray().forEach((element, idx, arr) => {
                            // ? https://stackoverflow.com/questions/7687884/add-10-seconds-to-a-date
                            let dt = parseInt(element.getAttribute("data-time"));
                            let time = new Date(dt);
                            let tag = element.getName().toLocaleUpperCase();
                            let count = self.M_SCOPE.RepeatedTimes.stamp[dt][tag] || 1;
                            if (!self.M_SCOPE.RepeatedTimes.stamp[dt][tag + '_ignore_first_item']) {
                                self.M_SCOPE.RepeatedTimes.stamp[dt][tag + '_ignore_first_item'] = true;
                                return debug.log("first_item");
                            }
                            let seconds = (5 * (idx + 1));
                            time.setSeconds(time.getSeconds() + seconds);
                            let ndt = time.getTime();
                            while (self.M_SCOPE.RepeatedTimes.stamp[ndt] && self.M_SCOPE.RepeatedTimes.stamp[ndt][tag]) {
                                ndt += 1;
                            }
                            self.M_SCOPE.RepeatedTimes.stamp[ndt] = {
                                [tag]: 0
                            };
                            element.setAttribute("data-time", ndt);
                        });
                        self.M_SCOPE.RepeatedTimes.reTry += 1;
                        console.log("repeated-timestamp-items==>" + self.M_SCOPE.RepeatedTimes.find.length + "<==unique selector count==>" + selector.length);
                        GlobalEditor.updateElement();
                        // ✅ Pass RepeatedTimes inside Options and reuse it
                        Object.assign(Options, {
                            RepeatedTimes: self.M_SCOPE.RepeatedTimes
                        });
                        // Pass lastFocusId for selection reconciliation after retry
                        const lastFocusId = Options.lastFocusId || self['M_SCOPE'].FINAL_ACT_ID;
                        Object.assign(Options, {
                            lastFocusId
                        });
                        setTimeout(() => {
                            this.generate_Track_Items(GlobalEditor.getData(), Options);
                        }, 1500);
                    } else {
                        // Reapply current filters only when NOT doing deferred retry
                        this.applyTypeFilter();
                        this.applyCombinedFilter();
                        // Reconcile selection after filters applied
                        const lastFocusId = Options.lastFocusId || self['M_SCOPE'].FINAL_ACT_ID;
                        if (lastFocusId && self.M_SCOPE.TrackCount > 0) {
                            // Preserve ignore_editor_focus from original options
                            const focusOptions = {
                                session: true
                            };
                            if (Options.ignore_editor_focus) {
                                focusOptions.ignore_editor_focus = true;
                            }
                            self.M_FUN.focusLastItem(lastFocusId, focusOptions);
                        }
                    }
                } catch (err) {
                    let err_last = self['M_SCOPE'].Last_Item ? self['M_SCOPE'].Last_Item.outerHTML : '';
                    var err_html = err.message + err_last;
                    console.warn(err.message);
                    ErrorLogTrace('generate_Track_Items', err_html);
                }
            },
            focusLastItem: function(last_id, options = {}, self) {
                self = trackDialog;

                /* beautify preserve:start */
                            let { EntryGroup } = self['IBOX'];
                            let { FINAL_ACT_ID } = self['M_SCOPE'];
                            /* beautify preserve:end */

                try {
                    // Update FINAL_ACT_ID if not set
                    FINAL_ACT_ID = FINAL_ACT_ID || last_id;
                    self['M_SCOPE'].FINAL_ACT_ID = FINAL_ACT_ID; // Update self['M_SCOPE'].FINAL_ACT_ID

                    // Find the last active entry
                    const child = EntryGroup.children;
                    let index = null;

                    if (FINAL_ACT_ID) {
                        const last = EntryGroup.querySelector(`[data-id="${FINAL_ACT_ID}"]`);
                        index = Array.from(self['M_SCOPE'].EntryArr).indexOf(last);
                    }

                    // Default index to 0 if not found
                    index = (index === -1) ? 0 : index;

                    // Select the entry
                    self['M_FUN'].selectEntry(child[index], options);
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('setLastActive', err.message);
                }
            },
            CheckTrackElement: function(node, newSting, _ = trackDialog) {
                try {
                    var [prefix, suffix, nodePar, Sting] = [node.previousSibling, node.nextSibling, node.parentElement, ""];
                    // suffix = node.nextSibling,nodePar = node.parentElement,Sting = "";
                    if (newSting != null) {
                        newSting = (typeof newSting == "object" ? newSting[0] : newSting);
                    }
                    if ((prefix && prefix.nodeType == 3 && prefix.wholeText.length != 0 && suffix == null) || (prefix == null && suffix && prefix.nodeType == 3 && suffix.wholeText.length != 0)) {
                        $(nodePar)[((prefix == null) ? ('before') : ('after'))](node);
                        if (newSting != null) Sting += newSting.outerHTML;
                    } else if (prefix && (prefix.nodeType == 3 && prefix.length != 0 || prefix.nodeType == 1) && suffix && (suffix.nodeType == 3 && suffix.length != 0 || suffix.nodeType == 1)) {
                        if (newSting == null) newSting = node;
                        Sting += '</insert>' + newSting.outerHTML + '<insert ';
                        $.each(nodePar.attributes, function() {
                            Sting += this.name + '="' + this.value + '" ';
                        });
                        Sting += '>';
                    }
                    var sIndex = (nodePar.outerHTML).indexOf(node.outerHTML),
                        eIndex = node.outerHTML.length + sIndex;
                    var newOuter = (nodePar.outerHTML).slice(0, sIndex) + Sting + (nodePar.outerHTML).slice(eIndex);
                    nodePar.outerHTML = newOuter;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('CheckTrackElement', err.message);
                }
            },
            CHECK_NESTED_INSERT: function(node, _ = trackDialog) {
                try {
                    // ? 19_MAR_2024_YA - FEEDBACK 'ice-no-decoration'
                    var attr_json = function(entry) {
                        try {
                            return {
                                username: entry && entry.getAttribute('data-username') || null,
                                time: entry && entry.getAttribute('data-time') || null,
                                ice_no: entry && entry.classList.contains("ice-no-decoration")
                            };
                        } catch (err) {
                            console.warn(err.message);
                            ErrorLogTrace('attr_json', err.message);
                        }
                    };
                    var check_can_remove = function(elm, parent) {
                        parent = elm.parentElement;
                        try {
                            let nodeValues = attr_json(elm),
                                ParentValues = attr_json(elm.parentElement);
                            if (!nodeValues.username && !nodeValues.time && ((ParentValues.username && ParentValues.time) || ParentValues.ice_no)) {
                                elm.after(...elm.childNodes);
                                if (parent && elm.parentElement) {
                                    parent.removeChild(elm);
                                } else elm.remove();
                            }
                        } catch (err) {
                            console.warn(err.message);
                            ErrorLogTrace('check_can_remove', err.message);
                        }
                    };
                    if (node.classList.contains("ice-no-decoration")) {
                        // ? nested loop
                        var nested = node.querySelector('insert.ice-no-decoration'),
                            loopMax = 10,
                            count = 0;
                        while (nested) {
                            check_can_remove(nested);
                            nested = nested.querySelector('insert.ice-no-decoration');
                            if (loopMax < count) break;
                            else count++;
                        }
                        check_can_remove(node);
                    }
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('CHECK_NESTED_INSERT', err.message);
                }
            },
            CheckMultiInsertElem: function(Arr, _ = trackDialog) {
                try {
                    // ? 19_MAR_2024_YA - FEEDBACK 'ice-no-decoration'
                    Array.from(Arr).forEach(element => {
                        _.M_FUN.CHECK_NESTED_INSERT(element);
                    });
                    Arr = GlobalEditor.document.$.body.querySelectorAll('insert>insert');
                    $.each(Arr, function(index, Element) {
                        if (Element.querySelectorAll('insert').length > 0) {
                            _['M_FUN'].CheckTrackElement(Element, null);
                        }
                        let user = Element.getAttribute('data-username'),
                            time = Element.getAttribute('data-time'),
                            parent = Element.parentElement,
                            par_user = parent && parent.getAttribute('data-username') || null,
                            par_time = parent && parent.getAttribute('data-time') || null;
                        let lTime = (time > par_time) ? (time) : (par_time);
                        if (user == par_user || !user) {
                            // ? if Same user
                            /* 29-Apr-2022 
                                <insert><insert data-ice-class="77921" class="ice-no-decoration">ccessed)</insert></insert>
                            */
                            if (Element.querySelector('[data-class="ckcommentsfull"]')) {
                                /*
                                <insert class="ice-ins ice-cts-6"><span data-hid="ebc6" data-high="note">comment </span>
                                <insert ><span data-class="ckcommentsfull" data-label="C5" data-status="note" id="Nebc6"><span &#x00A0;</span></span></insert></insert>  */
                                // ? If query/comment 
                                Element.parentElement.after(Element);
                            } else {
                                if (user) Element.parentElement.setAttribute('data-time', lTime);
                                Element.outerHTML = Element.innerHTML;
                            }
                        } else if (par_user && user) {
                            // ? multi user
                            _['M_FUN'].CheckTrackElement(Element, null);
                        }
                    });
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('CheckMultiInsertElem', err.message);
                }
            },
            getAttachInfo_Track: function(element, _ = trackDialog) {
                try {
                    return {
                        fileId: element.getAttribute('data-file-id') || "",
                        filesn: element.getAttribute('data-file-sn').split(',') || [],
                        fullName: element.getAttribute('data-file-on').split(',') || [],
                        shortName: element.getAttribute('data-file-on').getAttachFileName('panel') || ""
                    };
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('getAttachInfo_Track', err.message);
                }
            },
            getDownloadString_Track: function(attachInfo, label, _ = trackDialog) {
                try {
                    let attach_event = `onclick="trackDialog['M_FUN'].download_attach_track(this)"`;
                    var download_items = function(attach) {
                        try {
                            let tempArr = [];
                            Array.from(attach.fullName).forEach((file, idx, ary) => {
                                let shortname = file.getAttachFileName('ShowTrackPanel');
                                tempArr.push(
                                    `<div class="d-flex align-items-center list-entry" data-file-name="${file}" data-db-id="${attach.filesn[idx]}"><span class="download  ds-none" ${attach_event} title="Download"><img class="note_img list-item" src="assets/images/svg/query_panel/qpDownload.svg"></span><div class=" showFileName" title="${file}" ${attach_event}>${shortname}</div></div>`);
                            });
                            return tempArr.join('');
                        } catch (err) {
                            console.warn(err.message);
                            ErrorLogTrace('download_items', err.message);
                        }
                    };

                    let file_count = commonMethods.Add_leading_zero(attachInfo.filesn.length);
                    let file_string = download_items(attachInfo);
                    let temp = `<div class="attachment_container track" data-label="${label}" data-attach-id="${attachInfo.fileId}"><div  class="attachment_header_track mt-1"><span class="zip" ${attach_event} title="Download"><img alt="DownloadIcon" class="note_img topIcon" src="assets/images/svg/query_panel/qpDownload.svg"></span><span class="ml-1 align-self-center">All Attachments <span class="attach_count">(${file_count})</span></span><span onclick="trackDialog['M_FUN'].ShowMoreLess(this)" tabindex="0" class="${file_count == 1 ? 'ds-none' : ''} showHide ml-3"><img class="note_img list-item" src="assets/images/svg/query_panel/qpExpandOpen.svg" title="Expand"></span></div><div class="attach_listGroup_track mt-1 pl-2 ${file_count == 1 ? '' : 'ds-none'}" data-file-id="${attachInfo.fileId}">${file_string}</div></div>`;
                    return temp;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('track_getDownloadString_Track', err.message);
                }
            },
            ShowMoreLess: function(ths, _ = trackDialog) {
                try {
                    let ShowMoreLessText = ['<img alt="ExpandOpenIcon" class="note_img list-item" src="assets/images/svg/query_panel/qpExpandOpen.svg" title="Expend">', '<img class="note_img list-item" src="assets/images/svg/query_panel/qpExpandClose.svg" title="Close" alt="ExpandCloseIcon">'];
                    let IsDown = ths.firstElementChild.src.indexOf('Open') > -1 ? true : false;
                    let root = ths.closest('.attachment_container');
                    root.querySelector('.attach_listGroup').classList[IsDown ? 'remove' : 'add']('ds-none');
                    ths.innerHTML = ShowMoreLessText[IsDown ? 1 : 0];
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('ShowMoreLess', err.message);
                }
            },
            download_attach_track: function(ths, _ = trackDialog) {
                try {
                    if (!navigator.onLine) {
                        // alert(ALERT_MESSAGE['OffLine_Error_show']);
                        // TOASTER_ALERT('OffLine_Error_show',{type:'warning'});
                        return false;
                    }
                    let IsDownloadAll = ths.className.match(/zip/);
                    let attach_root = ths.closest('.attachment_container');
                    let attach_id = attach_root.getAttribute('data-attach-id');
                    let label = attach_root.getAttribute('data-label');
                    let item = ths.closest('.list-entry');
                    let file_db_id = item && item.getAttribute('data-db-id');
                    let file_name = item && item.getAttribute('data-file-name');
                    let enc_filename = encodeURIComponent(file_name); //SpclChar filename encoded - 20/05/24-RJ 
                    let og_name = [];
                    let split = SHARED_KEY.identifier.split('/');
                    let reNameFile = split[split.length - 1] + '_' + label + '_' + (IsDownloadAll ? 'attachments' : enc_filename);
                    var iURL = null;
                    if (IsDownloadAll) {
                        let tempArray = [];
                        Array.from(attach_root.querySelectorAll('.list-entry')).map(function(el) {
                            tempArray.push(el.getAttribute('data-db-id'));
                            og_name.push(el.getAttribute('data-file-name'));
                        });
                        file_name = tempArray.join(',');
                        //og_name = og_name.join(','); //Siva Request sending as Arr - 30/05/24 RJ
                        iDownloadMethod.zip_download('attach_download', {
                            "list": file_name,
                            "name": reNameFile,
                            "org_name_list": og_name
                        });
                    } else {
                        iURL = API_PATH + 'filedownload?appkey=xmleditor&file_sn=' + file_db_id + '&docid=' + DOC_ID + '&file_on=' + reNameFile;
                        iDownloadMethod.httpRequest(BUCKET_URL + DOC_ID + '/attachments/' + file_db_id, iURL, true);
                    }
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('download_attach_track', err.message);
                }
            },
            cursor_sync_with_dialog_entry: function(elm, Options = {}, _ = trackDialog) {
                try {
                    debug.log(elm);
                    let cursor_elm = elm.closest(_.M_SCOPE.TrackFindQuery);
                    let area = IS_TRACK_VIEW ? document.querySelector('.trackView') : _.Panel;
                    let showCount = area.querySelectorAll('div.entry:not([style])').length;
                    if (showCount < 2) return;
                    if (cursor_elm && cursor_elm.hasAttribute("data-time")) {
                        let [time, c_time] = [cursor_elm.getAttribute("data-time"), cursor_elm.getAttribute("data-last-change-time")];
                        if (time && (_['M_SCOPE'].FINAL_ACT_ID != time)) {
                            this.last_click = time;
                            let entry = area.querySelector(`[data-id="${time}"]`);
                            if (!entry) area.querySelector(`[data-id="${c_time}"]`);
                            if (entry) _['M_FUN'].selectEntry(entry);
                        }
                    }
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('sync_with_dialog_entry', err.message);
                }
            },
            refreshPanel(options = {}, self) {
                self = trackDialog;
                try {
                    var _last_id_ = self['M_SCOPE'].FINAL_ACT_ID;
                    options = options || {};
                    options.lastFocusId = _last_id_;
                    this.generate_Track_Items(GlobalEditor.getData(), options);
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('refreshPanel', err.message);
                }
            }
        };
        trackDialog['M_SCOPE'] = {
            StringArr: [],
            EntryArr: [],
            userList: [],
            userListdup: {},
            OldListCollection: [],
            btn_trick: false,
            TrackCount: 0,
            myTrackCount: 0,
            IsNestedInsert: false,
            FINAL_ACT_ID: null,
            img_prefix: 'assets/images/svg/track/',
            IsLoopReturn: false,
            RepeatedTimes: {
                find: [],
                reTry: 1,
                stamp: {}
            },
            TagArr: ["insert", "del", "for"],
            TrackTypeFilter: 'all',
            TrackTypeSelect: 'all',
            dropListFilter: 'all',
            FindAll: `div.d-flex.entry[data-username]`,
            Find: `div.d-flex.entry[data-username]:not([style])`,
            FindActive: `div.d-flex.entry[data-username]:not([style]) div.active`,
            query_select: `<option value="Query to Author">Query To Author</option>`,
            query_select_new: `<option data-default-order="1" value="Query to Author">Queries</option>`,
            command_select: `<option data-default-order="2" value="comment">Comments</option>`,
            ALL_ELMS_INFO: {
                'dialog-body': {
                    key: "DIA_BODY",
                    event: {
                        "": ""
                    }
                },
                'btnPrevTrack': {
                    key: "PRV_BTN",
                    event: {
                        initLoop: {
                            "onclick": "GOTO_ENTRY"
                        }
                    }
                },
                'btnNextTrack': {
                    key: "NXT_BTN",
                    event: {
                        initLoop: {
                            "onclick": "GOTO_ENTRY"
                        }
                    }
                },
                'btnAcceptTrack': {
                    key: "ACT_BTN",
                    event: {
                        initLoop: {
                            "onclick": "newTrackAction"
                        }
                    }
                },
                'btnRejectTrack': {
                    key: "RJT_BTN",
                    event: {
                        initLoop: {
                            "onclick": "newTrackAction"
                        }
                    }
                },
                'trackListGroup': {
                    key: "EntryGroup",
                    event: {
                        "": ""
                    }
                },
                'overallCount': {
                    key: "overallCount",
                    event: {
                        "": ""
                    }
                },
                'TrackSelectOpt': {
                    key: "TRK_SELECT",
                    event: {
                        initLoop_showLoop: {
                            "onchange": "OnChange"
                        }
                    }
                },
                'sort_list': {
                    key: "LIST_ORDER",
                    event: {
                        initLoop_showLoop: {
                            "onclick": "orderList",
                            "dblclick": "orderList",
                        }
                    }
                },
                'TrackTypeFilter': {
                    key: "TYPE_FILTER_RADIO",
                    event: {
                        initLoop_showLoop: {
                            "onchange": "onTypeFilterChange"
                        }
                    }
                },
                'TrackTypeSelectOpt': {
                    key: "TYPE_FILTER_SELECT",
                    event: {
                        initLoop_showLoop: {
                            "onchange": "onTypeFilterChange"
                        }
                    }
                },
                'OptionsList': {
                    key: "OPT_LIST",
                    event: {
                        "": ""
                    }
                }
            },
            whitespaceOnlyRegex: /^[\s\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]$/,
            TrackFindQuery: `insert[class^='ice-ins '],
                                        del[class^='ice-del '],
                                        [data-css^='ice-format'],
                                        [data-css^='ice-reformat'],
                                        span.graphic.replaceImage,
                                        [data-math='edit'],
                                        span[track-lab-type],
                                        a.xref[data-cite],
                                        span.label[data-track-value],
                                        span[data-link],
                                        [data-split-child],
                                        [data-insert-para],
                                        [data-figure='new']:not(.caption),
                                        [data-table='new']:not(.caption):not(table),
                                        [data-list-style],
                                        [data-style],
                                        [data-head-level],
                                        [data-para-merge],
                                        [data-class='ckcommentsfull'][data-status] > span[data-name]:first-of-type,
                                        .label[data-username][data-interest-level],
                                        .table-wrap:not([data-table='new']) td[data-cell-action],
                        [data-track-code]`,
            trackInfoMessages: {},
            DIS_ACT: {
                'both': 'btnRejectTrack,btnAcceptTrack',
                'accept': 'btnAcceptTrack',
                'reject': 'btnRejectTrack',
            },
            filterConfig: {}
        };


        trackDialog.retryConfigLoader = function() {
            if (this.reTryLoaderIncreament >= 10) {
                return;
            }

            setTimeout(() => {
                this.reTryLoaderIncreament++;
                this.retryConfigLoader();
            }, 2500);
        };

        trackDialog.configLoader = function() {
            var self = this;
            return new Promise((resolve, reject) => {
                try {
                    const config = window.TP_SUPPORT_CONFIG || window.SHOW_TRACKING_SUPPORT_DATA || null;
                    if (!config) {
                        // Fallback to legacy meta path during transition
                        $.getJSON(`assets/${iVersion}/meta/ShowTracking_support_data.json`)
                            .done((loaded) => {
                                window.TP_SUPPORT_CONFIG = self.TRACK_DATA = loaded;
                                if (self.TRACK_DATA['new_tracking_code']) {
                                    self['M_SCOPE']['filterConfig'] = self.TRACK_DATA['new_tracking_code'];
                                }
                                if (self.TRACK_DATA['existing_config_msg']) {
                                    self['M_SCOPE']['trackInfoMessages'] = self.TRACK_DATA['existing_config_msg'];
                                }
                                self.configLoaded = true;
                                resolve(loaded);
                            })
                            .fail((jqXHR, textStatus, errorThrown) => {
                                console.warn('Config load failed:', textStatus, errorThrown);
                                if (typeof self.retryScriptLoader === 'function') self.retryScriptLoader();
                                reject(errorThrown);
                            });
                        return;
                    }
                    window.TP_SUPPORT_CONFIG = self.TRACK_DATA = config;
                    if (self.TRACK_DATA['new_tracking_code']) {
                        self['M_SCOPE']['filterConfig'] = self.TRACK_DATA['new_tracking_code'];
                    }
                    if (self.TRACK_DATA['existing_config_msg']) {
                        self['M_SCOPE']['trackInfoMessages'] = self.TRACK_DATA['existing_config_msg'];
                    }
                    debug.log('CONFIG FILE LOAD (supportingFiles) . . .');
                    self.configLoaded = true;
                    resolve(config);
                } catch (err) {
                    reject(err);
                }
            });
        };

        trackDialog.initPostMethod = function() {
            var self = this;
            try {
                self.Set_DOM_Data(null, {
                    DOM: true
                });
                self['M_FUN'].generate_Track_Items(null, {
                    init: true
                });
            } catch (error) {

            }

        };
        trackDialog.initLoop = async function(data, self = trackDialog) {
            debug.log('Track Dialog Initiated');
            try {
                if (!window.InitialLoadDialog || !window.InitialLoadDialog.FullyLoaded) {
                    return setTimeout(trackDialog.initLoop, 1500);
                }

                if (!self.initiated) {
                    if (IS_TRACK_VIEW && data && data.eventFrom == "init") {

                    } else {
                        self.init();
                    }
                }


                await self.configLoader();

                // ? default variables and key-items
                // Update_Duplicate_TimeStamps();
                let Obj = GET_CONFIG_ITEM(`[name='trackDialogModule']`, {
                    CONVERT_JSON: true,
                    children: true,
                    keyUpperCase: false
                });



                if (IS_LOCAL_HOST) {
                    var newDropDown = `<li class="d-flex align-items-center mt-2 ds-none" id="OptionsListOpt4">
                                                    <div>
                                                    <span class="f14">Filter:</span>
                                                    <span class="input-group-sm ml-2 f14" id="track_type_select">
                                                        <select class="custom-select" id="TrackTypeSelectOpt" data-drop-list="yes" aria-label="Filter By Drop List Value">
                                                            <option value="all" selected="">All Drop-List Types</option>
                                                        </select>
                                                    </span>
                                                    </div>
                                                    <div class="track-filter-radio d-flex align-items-center ml-3" id="TrackTypeFilter">
                                                    <label class="radio-inline mr-2"><input type="radio" name="trackTypeFilter" value="all" checked> All</label>
                                                    <label class="radio-inline"><input type="radio" name="trackTypeFilter" value="insert"> Ins</label>
                                                    <label class="radio-inline mr-2"><input type="radio" name="trackTypeFilter" value="del"> Del</label>
                                                    <label class="radio-inline mr-2"><input type="radio" name="trackTypeFilter" value="for">Forma</label>                                            
                                                </div>
                            </li>`;

                    $("#OptionsListOpt2").after(newDropDown);

                }

                self['M_CONFIG'] = Object.assign(self['M_CONFIG'], Obj);
                for (const [findKey, ValueObj] of Object.entries(self['M_SCOPE']['ALL_ELMS_INFO'])) {
                    // ? ASSIGN_M_SCOPE
                    let ELM = self['IBOX'][ValueObj['key']] = self.Panel.querySelector("[data-id='" + findKey + "']") || document.getElementById(findKey);
                    if (!ELM) {
                        console.log("NOT FOUND ELM " + findKey);
                        continue;
                    }
                    // ? VISIBLE || ACTION FROM CONFIG
                    if (self['M_CONFIG'][findKey]) {
                        let [canShow, roleShow, TrackViewBool] = [(self['M_CONFIG'][findKey]['show']), (self['M_CONFIG'][findKey][USER_INFO.SELECTOR_SHOW_HIDE]), (self['M_CONFIG'][findKey]['showTrackView'])];
                        if (IS_TRACK_VIEW && TrackViewBool == "false") {
                            ELM.remove();
                            if (self['M_CONFIG'][findKey]['findshowTrackPage'] == "true") {
                                ELM = self['IBOX'][ValueObj['key']] = document.getElementById(findKey);
                            }
                        } else {
                            if (canShow == "true" && !roleShow) {

                            } else if ((canShow == "false") || (roleShow == "false")) {
                                self['M_FUN'].change_Btns_State(ELM, 0);
                            }
                        }
                    }
                    // ? EVENT TRIGGER
                    for (const [When, eObj] of Object.entries(ValueObj['event'])) {
                        // ? If EVENT WILL FIRE BASED ON SCENARIO
                        if (When.match(/initloop/gi)) {
                            // ? ASSIGN EVENT - DEFAULT - ELEMENTS
                            for (const [event, ifunction] of Object.entries(eObj)) {
                                if (ifunction == '') return;
                                else if (typeof self['M_FUN'][ifunction] == "function") {
                                    ELM[event] = self['M_FUN'][ifunction];
                                } else if (typeof self[ifunction] == "function") {
                                    ELM[event] = self[ifunction];
                                }
                            }
                        }
                    }
                }
                if (!IS_TRACK_VIEW) {
                    var gFind = GlobalEditor.document.$.body.querySelectorAll('insert>insert');
                    if (gFind.length != 0) {
                        self._SNAPSHOT({
                            lock: true,
                            save: true
                        });
                        self['M_FUN'].CheckMultiInsertElem(gFind);
                        self._SNAPSHOT({
                            unlock: true,
                            save: false
                        });
                    }
                }

                self.Set_DOM_Data(null, {
                    DOM: true
                });
                self['M_FUN'].generate_Track_Items(null, {
                    init: true
                });

                // if (IS_TRACK_VIEW) {}
                $('[data-toggle="tooltip"]').tooltip({
                    boundary: 'scrollParent',
                    fallbackPlacement: 'flip'
                });
                self.templateList = {
                    SPIN: '<span id="spinner_ref" class="spinner-border iSpin_border" role="status"><span class="sr-only"></span></span>',
                };



            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('trackDialog.initLoop', err.message);
            }
        };
        trackDialog.showLoop = function(_last_id, param2, param3, _ = trackDialog) {
            try {
                if (!_.FullyLoaded) _.init();
                if (!resolveTrackEntryGroup(_)) {
                    if (!_._trackEntryGroupRetryPending) {
                        _._trackEntryGroupRetryPending = true;
                        setTimeout(() => {
                            _._trackEntryGroupRetryPending = false;
                            _.showLoop(_last_id, param2, param3, _);
                        }, 250);
                    }
                    console.warn("trackDialog.showLoop: trackListGroup not ready");
                    return;
                }
                _['M_SCOPE'].IsLoopReturn = false;

                // SEAN UPDTE FOR BOOKS
                _.mergeDelSequences();

                _['M_FUN'].generate_Track_Items(GlobalEditor.getData(), {
                    lastFocusId: _last_id
                });
                _['M_FUN'].Reset_Btns_Count();
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('trackDialog_showLoop', err.message);
            }
        };
        /**
         * Get del node from element (direct or wrapped)
         */
        trackDialog._getDelNode = function(element) {
            debug.log("_getDelNode");
            try {
                if (!element) return null;

                const name = element.getName().toLowerCase();

                // Element is already a del node
                if (name === "del") return element;

                // Check for parent del (traverse up)
                const ascentDel = element.getAscendant({
                    del: 1
                }, true);
                if (ascentDel) return ascentDel;

                // Check for inner del (traverse down)
                const innerDel = element.findOne("del");
                return innerDel || null;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('_getDelNode', err.message);
                return null;
            }
        };

        /**
         * Get previous and next sibling nodes
         */
        trackDialog._getAdjacentNodes = function(element) {
            debug.log("_getAdjacentNodes");
            try {
                return {
                    prev: element.getPrevious(),
                    next: element.getNext()
                };
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('_getAdjacentNodes', err.message);
                return null;
            }
        };

        /**
         * Find matching del target (prev takes priority over next)
         */
        trackDialog._findMatchingDelTarget = function(prev, next) {
            debug.log("-----_findMatchingDelTarget");
            try {
                const isPrevDel = prev && prev.type == 1 && prev.getName().toLowerCase() === "del";
                const isNextDel = next && next.type == 1 && next.getName().toLowerCase() === "del";

                if (isPrevDel) return prev;
                if (isNextDel) return next;

                return null;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('_findMatchingDelTarget', err.message);
                return null;
            }
        };

        /**
         * Merge element into del node
         */
        trackDialog._mergeIntoDelNode = function(targetDel, sourceElement, isPrev) {
            debug.log("-----_mergeIntoDelNode");
            try {
                if (isPrev) {
                    // Append into previous del
                    $(targetDel.$).append(sourceElement.$);
                } else {
                    // Prepend into next del
                    $(targetDel.$).prepend(sourceElement.$);
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('_findMatchingDelTarget', err.message);
                return null;
            }
        };

        /**
         * Unwrap inner del elements if applicable
         */
        trackDialog._unwrapInnerDel = function(element, delNode) {
            try {
                const elementName = element.getName().toLowerCase();
                const isWrapper = /^(sup|a|strong|sub|em|sc|i|b)$/.test(elementName);
                const hasInnerDel = !!element.$.querySelector("del");

                // Unwrap del from sup/a wrappers
                if (isWrapper && hasInnerDel) {
                    commonMethods.iunWrap(element.$, {
                        selector: "del"
                    });
                }
                // Unwrap the del node itself if it's a direct del
                else if (delNode === element) {
                    commonMethods.iunWrap(element.$, {});
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('_unwrapInnerDel', err.message);
            }
        };
        /**
         * Process collection of elements and merge/unwrap del nodes
         */
        trackDialog.processElementCollection = function(collection = []) {
            debug.log("-----processElementCollection");
            try {
                collection.forEach((element) => {
                    if (!element) return;

                    const delNode = this._getDelNode(element);
                    if (!delNode) return;

                    const {
                        prev,
                        next
                    } = this._getAdjacentNodes(element);
                    const targetDel = this._findMatchingDelTarget(prev, next);

                    // Merge into adjacent del
                    const isPrevDel = prev && prev.type == 1 && prev.getName().toLowerCase() == "del";
                    if (targetDel) {
                        this._mergeIntoDelNode(targetDel, element, isPrevDel);

                        // Unwrap inner del elements
                        this._unwrapInnerDel(element, delNode);
                    }
                });
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('processElementCollection', err.message);
            }
        };

        /**
         * Get consecutive del elements (del+del) with same user and role
         */
        trackDialog.getConsecutiveDelElements = function(container) {
            try {
                const allDels = container.find("del").toArray();
                const groupedDels = [];

                for (let i = 0; i < allDels.length - 1; i++) {
                    const currentDel = allDels[i];
                    const nextDel = allDels[i + 1];

                    // Check if they have same user and role
                    if (!this._hasSameUserRole(currentDel, nextDel)) continue;

                    // Check if they are consecutive (direct siblings or separated by allowed wrappers)
                    if (this._isConsecutive(currentDel, nextDel)) {
                        groupedDels.push(nextDel);
                    }
                }

                return groupedDels;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('_isConsecutive', err.message);
                return [];
            }
        };

        /**
         * Check if two del elements are consecutive
         * Allows separation by sup, a, span, etc. but not text or other elements
         */
        trackDialog._isConsecutive = function(del1, del2) {
            try {
                let current = del1;

                // Walk from first del to second del
                while (current) {
                    const next = current.getNext();

                    if (!next) break;

                    // If next is the second del, they are consecutive
                    if (next.equals(del2)) return true;

                    // If next contains the second del, check if it's only wrapper
                    if (this._containsDelOnly(next, del2)) return true;

                    // If next is text node with content, break (not consecutive)
                    if (next.type === CKEDITOR.NODE_TEXT && next.getText().trim()) break;

                    // If next is a wrapper (sup, a, span), continue walking inside
                    if (this._isAllowedWrapper(next)) {
                        current = next;
                        continue;
                    }

                    // Any other element breaks the sequence
                    break;
                }

                return false;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('_isConsecutive', err.message);
            }
        };
        /**
         * Check if element only contains the specified del
         */
        trackDialog._containsDelOnly = function(element, targetDel) {
            try {
                if (element.type !== CKEDITOR.NODE_ELEMENT) return false;

                const children = Array.from(element.$.childNodes);
                var delNode = element.$.querySelector("del");
                var hasTarget = false;
                if (delNode && targetDel && targetDel.$) {
                    hasTarget = delNode === targetDel.$;
                }
                const hasOtherContent = children.some(child => {
                    if (child.nodeType === 3 && child.textContent.trim()) return true; // Text node with content
                    if (child.nodeType === 1 && !child.querySelector("del")) return true; // Non-del element
                    return false;
                });

                return hasTarget && !hasOtherContent;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('_containsDelOnly', err.message);
                return false;
            }
        };
        /**
         * Check if element is an allowed wrapper (sup, a, span, etc)
         */
        trackDialog._isAllowedWrapper = function(element) {
            try {
                if (element.type !== CKEDITOR.NODE_ELEMENT) return false;

                const allowedWrappers = ["sup", "sub", "a", "span", "strong", "em", "i", "b", "sc"];
                const name = element.getName().toLowerCase();

                return allowedWrappers.includes(name);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('_isAllowedWrapper', err.message);
                return false;
            }
        };

        /**
         * Check if two del elements have same user and role attributes
         */
        trackDialog._hasSameUserRole = function(del1, del2) {
            try {
                const user1 = del1.getAttribute("data-username");
                const role1 = del1.getAttribute("data-rolename");

                const user2 = del2.getAttribute("data-username");
                const role2 = del2.getAttribute("data-rolename");

                return user1 === user2 && role1 === role2;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('_hasSameUserRole', err.message);
                return false;
            }
        };
        /**
         * Main handler for del tracking
         */
        trackDialog.mergeDelSequences = function(node = null, IMS = IMPACT_SELECTION) {

            return debug.log("-----mergeDelSequences");;

            IMS._SNAPSHOT({
                lock: true
            });
            const selector = "sup del, a del, sub del, em del, strong del, sc del";

            try {
                if (!node) node = GlobalEditor && GlobalEditor.document && GlobalEditor.document.getById('xmlcontentroot');
                if (!node) return;

                // Process del inside sup/a first
                const wrappedDels = node.find(selector).toArray().map((el) => {

                    // Priority list
                    const order = ['sup', 'sub', 'a', 'em', 'strong', 'sc'];

                    for (let tag of order) {
                        let node = el.getAscendant(tag, true);

                        if (node && node.type == 1 && node.getName().toLowerCase() == "sup" && !!el.getAscendant("a", true)) {
                            node = el.getAscendant("a", true);
                        }

                        if (node) return node;
                    }

                    return null; // or el if you prefer

                }) || [];

                debug.log("-----array", wrappedDels);
                this.processElementCollection(wrappedDels);

                // Then process all del elements
                const consecutiveDels = this.getConsecutiveDelElements(node) || [];

                debug.log("-----consecutiveDels", consecutiveDels);
                this.processElementCollection(consecutiveDels);

            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('mergeDelSequences', err.message);
            } finally {
                IMS._SNAPSHOT({
                    unlock: true,
                    save: true
                });
            }
        };

        trackDialog._showTrackingCoreInstalled = true;
        window.trackDialog = trackDialog;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('installShowTrackingCore', err.message);
    }
    return trackDialog;
}

var getFindPatternCount = function(Group, pattern) {
    try {
        return Group.querySelectorAll('div[data-username][data-tag^="' + pattern + '"]:not([style]):not([data-type-filtered])').length;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getFindPatternCount', err.message);
    }
};

function Update_Duplicate_TimeStamps() {
    try {
        // Find qualifying elements
        const elements = findQualifyingElements();

        // Get initial timestamps and track duplicates
        let dateTimes = elements.map(el => el.getAttribute("data-time"));
        const duplicatesBefore = countDuplicates(dateTimes);
        console.log("Duplicates before updates:", duplicatesBefore);

        // Initialize tracking collections
        const occurrences = getOccurrences(dateTimes);
        const usedDateTimes = new Set(dateTimes);

        // Process elements to update timestamps
        updateDuplicateTimestamps(elements, occurrences, usedDateTimes);

        // Log results
        dateTimes = elements.map(el => el.getAttribute("data-time"));
        const duplicatesAfter = countDuplicates(dateTimes);
        console.log("Duplicates after updates:", duplicatesAfter);

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('UpdateTimeStamps', err.message);
    }
}

// Helper Functions
function findQualifyingElements() {
    try {
        return GlobalEditor.document
            .find('[data-username][data-cid]')
            .toArray()
            .filter(element => {
                const hasRequiredAttributes = element.getAttribute("data-time") && element.getAttribute("data-username");

                if (!hasRequiredAttributes) return false;

                const isOutsideTrackChanges = !(element.$ && element.$.closest && element.$.closest(".TrackChangesList"));

                return isOutsideTrackChanges;
            });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('findQualifyingElements', err.message);
    }
}

function countDuplicates(array) {
    const occurrences = getOccurrences(array);
    return Object.values(occurrences).filter(count => count > 1).length;
}

function getOccurrences(array) {
    return array.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}

function insAndDelShareSameTimestamp(elements, timestamp) {
    try {
        const insExists = elements.some(el =>
            el.tagName === "INS" && el.getAttribute("data-time") === timestamp
        );
        const delExists = elements.some(el =>
            el.tagName === "DEL" && el.getAttribute("data-time") === timestamp
        );
        return insExists && delExists;
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('insAndDelShareSameTimestamp', err.message);
        return false;
    }
}

function generateUniqueTimestamp(baseTime, usedDateTimes) {
    try {
        let newValue = parseInt(baseTime, 10) + 1;
        let iterations = 0;

        while (usedDateTimes.has(newValue.toString())) {
            newValue++;
            iterations++;

            if (iterations >= MAX_ITERATIONS) {
                break;
            }
        }

        return newValue.toString();
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('generateUniqueTimestamp', err.message);
    }
}

function updateDuplicateTimestamps(elements, occurrences, usedDateTimes) {
    try {
        elements.forEach(element => {
            const dateTime = element.getAttribute("data-time");

            if (!dateTime || insAndDelShareSameTimestamp(elements, dateTime)) {
                return;
            }

            if (occurrences[dateTime] <= 1) {
                return;
            }

            const newTimestamp = generateUniqueTimestamp(dateTime, usedDateTimes);
            element.setAttribute("data-time", newTimestamp);
            usedDateTimes.add(newTimestamp);
            occurrences[dateTime]--;
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('updateDuplicateTimestamps', err.message);
    }
}

function convertAttributeModetoTextMode(node) {
    let xrefValues = [];

    node.querySelectorAll('a.xref').forEach(el => {
        if (el) {
            // Extract the reference text inside <a>
            const refText = el.textContent.trim();
            const level = el.getAttribute('data-interest-level');
            // Get data-interest-level attribute and determine special character
            const specialChar = level === 'special' ? '■' : level === 'outstanding' ? '■■' : '';
            // Store the modified value in the array
            xrefValues.push(`${refText}${specialChar}`);
            // Replace the content inside the insert tag
            el.textContent = `${refText}${specialChar}`;
        }
    });

    return xrefValues;
}

// ─────────────────────────────────────────────────────────────────────────────
// ForEach_Entry — refactored
//
// Structure
//   _tpl              pure HTML template builders (no side-effects)
//     .entryRoot()    outer wrapper div
//     .headerRow()    user name + date row
//     .contentRow()   text pill row
//     .formatRow()    format/link extra row
//     .actionRow()    "Actioned by" footer row
//     .queryView()    full query/comment view (IS_TRACK_VIEW branch)
//
//   _resolveText()    picks the correct Text for this entry type
//   _resolveDisable() reads data-disable-action-code / legacy attrs from DOM
//   _applyRowMeta()   writes topRowtag / topRowCSS / topRowInfoShow to EntryInfo
//   _registerUser()   adds user to the userList / userListdup maps
//   _shouldSkip()     pure skip-guard, returns true if entry must be ignored
//
//   ForEach_Entry()   orchestrates the above; no inline HTML
// ─────────────────────────────────────────────────────────────────────────────

// ── Template helpers ─────────────────────────────────────────────────────────

const _tpl = {

    /**
     * Outer entry wrapper.
     * @param {object} ei  EntryInfo
     * @param {number} idx iteration index
     * @param {string} actionAttr  first element of getActionInfo() tuple
     */
    entryRoot(ei, idx, actionAttr) {
        const uidAttr = ei.srPanelUniqueId ?
            ` data-sr-panel-unique-id="${ei.srPanelUniqueId}"` :
            '';
        return (
            `<div class="d-flex entry"` +
            ` data-action-disable="${ei.disableAction}"` +
            ` data-order="index"` +
            ` data-index="${idx}"` +
            ` data-tag="${ei.topRowtag}"` +
            ` data-rolename="${ei.Rolename}"` +
            ` data-id="${ei.DateTime}"` +
            ` data-username="${ei.username}"` +
            uidAttr +
            ` ${actionAttr}>` +
            `<div class="d-flex flex-column track-entry-div">`
        );
    },

    /**
     * User name + date header row.
     * @param {object} ei EntryInfo
     */
    headerRow(ei) {
        const infoShow = (ei.topRowtag && ei.topRowInfoShow) ?
            `<span class="t-type text-track ${ei.topRowtag}">${ei.topRowInfoShow}</span>` :
            "";
        return (
            `<div class="d-flex justify-content-between">` +
            `<div class="pb-1 flex-grow-1">` +
            `<span data-toggle="tooltip" title="${ei.user_short_name}" class="t-user">${ei.displayname}</span>` +
            infoShow +
            `</div>` +
            `<div class="ml-auto t-date pb-1">` +
            `<span data-toggle="tooltip" title="${ei.Time}">${ei.Date}</span>` +
            `</div></div>`
        );
    },

    /**
     * Text pill row (main content).
     * @param {object} ei       EntryInfo
     * @param {string} extra    extra attrs string (query/comment case)
     */
    contentRow(ei, extra = "") {
        return (
            `<div class="d-flex" ${extra}>` +
            `<span class="${ei.topRowCSS} d-flex"` +
            ` data-toggle="tooltip" title="${ei.Text}"` +
            ` tabindex="0">${ei.stripTxt}</span>` +
            `</div>`
        );
    },

    /**
     * Format / hyperlink extra row (only when IsforMat or IsLink).
     * @param {object} ei     EntryInfo
     * @param {Element} entry raw DOM entry
     */
    formatRow(ei, entry, newConfig, dialog) {
        const name = entry.hasAttribute("data-name-old") ?
            entry.getAttribute("data-name-old") :
            entry.getAttribute("data-name");

        const info = newConfig.hint || ei.linkInfo || "";
        const label = ei.IsforMat ?
            (ei.Type.indexOf("ice-reformat") === 0 ? "Not " + name : name) :
            info;

        const hasDropData = newConfig.hint || "";

        // Ensure dropList exists
        if (!dialog.M_SCOPE.dropList) {
            dialog.M_SCOPE.dropList = [];
        }

        // Add only if not already present
        if (hasDropData && !dialog.M_SCOPE.dropList.includes(hasDropData)) {
            dialog.M_SCOPE.dropList.push(hasDropData);
        }

        const attrData = hasDropData ? `data-drop-list="[${label}]"` : "";

        return `<div class="d-flex" ${attrData}>
                <span class="${ei.topRowCSS} format">[${label}]</span>
</div>`;
    },

    /**
     * "Actioned by" footer row + closing tags.
     * @param {string} actionString second element of getActionInfo() tuple
     */
    actionRow(actionString) {
        return actionString + '</div></div>';
    },

    /**
     * Full query / comment view (IS_TRACK_VIEW + isQryCmd).
     * @param {object} splTrack
     */
    queryView(splTrack) {
        return (splTrack.AppendItems || []).join('');
    }
};


// ── Sub-functions ─────────────────────────────────────────────────────────────

/**
 * Resolve a track-panel username for shells that omit data-username
 * (e.g. soft-deleted comments that only carry data-deleted-by).
 */
function resolveTrackEntryUsername(entry) {
    try {
        if (!entry || typeof entry.getAttribute !== 'function') return '';
        const direct = entry.getAttribute('data-username') ||
            entry.getAttribute('data-user-name') ||
            entry.getAttribute('data-deleted-by') ||
            '';
        if (direct) return direct;
        const child = typeof entry.querySelector === 'function' ?
            entry.querySelector('[data-username]') :
            null;
        if (child) {
            const fromChild = child.getAttribute('data-username');
            if (fromChild) return fromChild;
        }
        const wrap = typeof entry.closest === 'function' ?
            entry.closest('insert, del') :
            null;
        if (wrap) {
            return wrap.getAttribute('data-username') ||
                wrap.getAttribute('data-user-name') ||
                '';
        }
        return '';
    } catch (err) {
        if (typeof _logTrackHelperError === 'function') {
            _logTrackHelperError('resolveTrackEntryUsername', err);
        }
        return '';
    }
}

/**
 * Skip comment/query stub rows in the track panel.
 * Track View: only comment-* / query-* track-codes (legacy keys still feed queryView).
 * Editor: those track-codes and legacy IsComment / IsNewQuery stubs on non-ice nodes.
 * Editor retains IsQuery ([Query Responsed] / [Query Responsed N]).
 * Plain ice insert/del rows (e.g. Inserted [New Comment N]) are never skipped here.
 */
function shouldSkipCommentQueryStubInTrackView(entry, splTrack, trackCode) {
    try {
        const code = trackCode ||
            (entry && typeof entry.getAttribute === 'function' && entry.getAttribute('data-track-code')) ||
            '';
        const isCommentQueryCode = /^(comment|query)-/i.test(String(code));
        const key = splTrack && splTrack.key;
        const isLegacyCommentQueryKey = ['IsComment', 'IsNewQuery'].includes(key);
        const isTrackView = typeof IS_TRACK_VIEW !== 'undefined' && IS_TRACK_VIEW;
        const tag = entry && entry.tagName ? String(entry.tagName).toLowerCase() : '';
        const isIceInsDel = tag === 'insert' || tag === 'del';

        if (isTrackView) {
            return isCommentQueryCode;
        }
        if (isIceInsDel) {
            return false;
        }
        return isCommentQueryCode || isLegacyCommentQueryKey;
    } catch (err) {
        return false;
    }
}

/**
 * Soft-deleted comment/query tracks (comment-03 / query-04 / data-deleted*).
 */
function isDeletedCommentOrQueryTrack(entry, splTrack) {
    try {
        const code = (entry && typeof entry.getAttribute === 'function' ?
            entry.getAttribute('data-track-code') :
            '') || '';
        if (code === 'comment-03' || code === 'query-04') return true;
        const key = splTrack && splTrack.key;
        if (!['IsComment', 'IsNewQuery', 'IsQuery'].includes(key)) return false;
        if (!entry) return false;
        if (entry.hasAttribute && entry.hasAttribute('data-deleted-by')) return true;
        if (entry.hasAttribute && entry.hasAttribute('data-deleted')) return true;
        if (typeof entry.closest === 'function' && entry.closest('[data-deleted-by]')) return true;
        return false;
    } catch (err) {
        return false;
    }
}

/**
 * True when this node (or its closest ckcommentsfull) is a soft-deleted comment/query shell.
 */
function isSoftDeletedCommentOrQueryShell(entry) {
    try {
        if (!entry || typeof entry.getAttribute !== 'function') return false;
        let shell = entry;
        if (entry.getAttribute('data-class') !== 'ckcommentsfull' && typeof entry.closest === 'function') {
            shell = entry.closest('[data-class="ckcommentsfull"]') || entry;
        }
        if (!shell || typeof shell.getAttribute !== 'function') return false;
        const code = shell.getAttribute('data-track-code') || '';
        if (code === 'comment-03' || code === 'query-04') return true;
        if (shell.hasAttribute && shell.hasAttribute('data-deleted-by')) return true;
        if (shell.hasAttribute && shell.hasAttribute('data-deleted')) return true;
        return false;
    } catch (err) {
        return false;
    }
}

/**
 * insert/del that only wraps a soft-deleted ckcommentsfull (no other tracked text).
 */
function isWrapperOfDeletedCommentOrQuery(entry) {
    try {
        if (!entry || typeof entry.getAttribute !== 'function') return false;
        const tag = (entry.tagName || '').toLowerCase();
        if (tag !== 'insert' && tag !== 'del') return false;
        if (typeof entry.querySelector !== 'function') return false;
        const child = entry.querySelector('[data-class="ckcommentsfull"]');
        if (!child || child === entry) return false;
        if (!isSoftDeletedCommentOrQueryShell(child)) return false;

        const clone = entry.cloneNode(true);
        clone.querySelectorAll('[data-class="ckcommentsfull"]').forEach((node) => node.remove());
        const hasTextOutsideComment = String(clone.textContent || '')
            .replace(/[\s\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\u200B\u2060]/g, '') !== '';
        if (hasTextOutsideComment) return false;
        if (clone.querySelector('*')) return false;
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Soft-deleted comment/query always unlist. Other deleted specials: hide for
 * non-collator editors only.
 */
function shouldHideDeletedSpecialTrack(splTrack, entry, Options) {
    try {
        Options = Options || {};
        if (!splTrack || !splTrack.isDeleted) return false;
        if (isDeletedCommentOrQueryTrack(entry, splTrack) || isSoftDeletedCommentOrQueryShell(entry)) {
            return true;
        }
        const isEditorPage = Options.isEditorPage !== undefined ? Options.isEditorPage : (typeof IS_EDITOR_PAGE !== 'undefined' ? IS_EDITOR_PAGE : false);
        const isCollator = !!Options.isCollator;
        if (!isEditorPage || isCollator) return false;
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Decide whether this entry should be silently skipped.
 */
function _shouldSkip(EntryInfo, isCollator) {
    if (EntryInfo.ignore || !EntryInfo.username) return true;
    const node = EntryInfo.dom_node || EntryInfo.CloneNode;
    if (isSoftDeletedCommentOrQueryShell(node)) return true;
    if (EntryInfo.isDeleted && !IS_TRACK_VIEW && !isCollator) {
        return true;
    }
    return false;
}

/**
 * Skip nested [data-track-code] when parent insert/del already has the same code
 * (avoids dual Show Tracking rows; attributes stay on both nodes).
 */
function _hasParentSameTrackCode(entry) {
    try {
        if (!entry || typeof entry.getAttribute !== 'function') return false;
        const code = entry.getAttribute('data-track-code');
        if (!code) return false;
        const parent = entry.parentElement;
        if (!parent || typeof parent.closest !== 'function') return false;
        const wrap = parent.closest('insert, del');
        if (!wrap || wrap === entry) return false;
        return wrap.getAttribute('data-track-code') === code;
    } catch (err) {
        return false;
    }
}

/**
 * Skip insert/del wrappers that only mirror a child ckcommentsfull track-code.
 * Those wrappers produce empty Query to Author rows (track-entry-div with no content).
 * Matches even when the child has not yet been stamped with the same canonical code.
 */
function _isMirroredTrackCodeWrapper(entry) {
    try {
        if (!entry || typeof entry.getAttribute !== 'function') return false;
        const tag = (entry.tagName || '').toLowerCase();
        if (tag !== 'insert' && tag !== 'del') return false;
        if (!entry.getAttribute('data-track-code') || typeof entry.querySelector !== 'function') return false;

        const child = entry.querySelector('[data-class="ckcommentsfull"]');
        if (!child || child === entry) return false;

        const childCode = child.getAttribute('data-track-code');
        const wrapCode = entry.getAttribute('data-track-code');
        // Same code, or child not stamped yet while wrapper still carries a mirrored code
        return !childCode || childCode === wrapCode;
    } catch (err) {
        return false;
    }
}

/**
 * Populate displayname, user_short_name and add to userList/userListdup.
 */
function _registerUser(EntryInfo, M_SCOPE, iDOM) {
    EntryInfo.displayname = classCase(EntryInfo.username.replace(/(\.\w+)?@\w+\.\w+(\.\w+)?/g, "")) + EntryInfo.Rolename;
    EntryInfo.user_short_name = EntryInfo.username.split('@')[0] || EntryInfo.username;

    if (M_SCOPE.userListdup[EntryInfo.username]) return;

    M_SCOPE.userList.push(EntryInfo.username);
    const user = EntryInfo.username;
    let orderId = "";

    if (user.indexOf("@") > 0) {
        const findUser = iDOM.querySelector(`[data-username="${user}"]`);
        if (findUser) orderId = `data-user-order="${findUser.getAttribute("data-userid")}" `;
    }

    M_SCOPE.userListdup[user + EntryInfo.Rolename] =
        `<option ${orderId} value="${user + EntryInfo.Rolename}" ` +
        `data-rolename="${EntryInfo.Rolename}">${EntryInfo.displayname}</option>`;
}

/**
 * Copy topRowtag / topRowCSS / topRowInfoShow from a config object onto EntryInfo.
 */
function _applyRowMeta(EntryInfo, cfgObj) {
    if (!EntryInfo || !cfgObj) return;
    EntryInfo.topRowtag = cfgObj.topRowtag;
    EntryInfo.topRowCSS = cfgObj.topRowCSS;
    EntryInfo.topRowInfoShow = cfgObj.topRowInfoShow;
    if (cfgObj.disableAction) EntryInfo.disableAction = cfgObj.disableAction;
}

/**
 * Resolve the display Text for standard (non-splTrack) entries.
 * Mutates EntryInfo.Text (and sometimes .disableAction).
 *
 * @param {Element}  Entry
 * @param {object}   EntryInfo
 * @param {object}   config_msg
 * @param {object}   temp_JSON     config_msg entry keyed by tagName/css/class
 * @param {object}   M_SCOPE
 * @returns {string|undefined}  'SKIP' signals the caller should return early
 */
function _resolveText_standard(Entry, EntryInfo, config_msg, temp_JSON, M_SCOPE) {
    const {
        CloneNode,
        IsNewConcept,
        IsInsDel,
        IsNewFloat,
        IsRef,
        IsNotes,
        IsNewRef,
        IsNewNotes,
        IsDelRef,
        IsDelNotes,
        IsCite
    } = EntryInfo;

    // Nested-insert with TEX span — use only plain text nodes
    if (CloneNode && CloneNode.querySelector('span.TEX') && !IsNewConcept && M_SCOPE.IsNestedInsert) {
        EntryInfo.Text = [].reduce.call(CloneNode.childNodes, (acc, n) =>
            acc + (n.nodeType === 3 ? n.textContent : ''), '');
        return;
    }

    if (IsNewConcept) {
        // ? concept: always use insert config, lock both actions
        temp_JSON = config_msg.insert;
        EntryInfo.Text = Entry.hasAttribute('data-track-value') ?
            Entry.getAttribute('data-value') :
            CloneNode.textContent;
        EntryInfo.disableAction = M_SCOPE.DIS_ACT['both'];
        return;
    }

    if (IsInsDel) {
        if (IsNewFloat) return 'SKIP'; // handled upstream

        if (IsRef || IsNotes) {
            // ? label children inside a ref are renumbering artefacts — skip silently
            if (EntryInfo.parent.className === 'label') return 'SKIP';
            console.log('ref/Notes');

            const tempNote = Entry.closest(IsRef ? '.ref' : '.fn');
            if (tempNote) {
                const cfgInfo = config_msg[IsRef ? 'IsRef' : 'IsNotes'].Info;
                const key = (IsNewRef || IsNewNotes) ? "new" : (IsDelRef || IsDelNotes) ? "remove" : "";
                EntryInfo.Text = (cfgInfo && key && cfgInfo[key]) ?
                    cfgInfo[key] :
                    CloneNode.textContent;
                if (key) EntryInfo.disableAction = M_SCOPE.DIS_ACT['both'];
            }
            return;
        }

        if (IsCite) {
            convertAttributeModetoTextMode(CloneNode);
            EntryInfo.disableAction = M_SCOPE.DIS_ACT['both'];
            EntryInfo.Text = CloneNode.textContent;
            return;
        }

        // ? plain insert/del text
        EntryInfo.Text = CloneNode.textContent || Entry.getAttribute('data-content');
        return;
    }

    // ? format span (ice-format / ice-reformat) and everything else
    EntryInfo.Text = CloneNode.textContent || '';
}

/**
 * Resolve Text + row-meta for splTrack entries.
 * Mutates EntryInfo in place.
 *
 * @returns {string|undefined}  'SKIP' signals caller to return early
 */
function _resolveText_splTrack(Entry, EntryInfo, splTrack, cur_action_idx, config_msg, M_SCOPE) {
    if (EntryInfo.IsInsDel && EntryInfo.IsNewFloat) return 'SKIP';

    // Let getInfo() override everything if it's a function
    if (typeof splTrack.getInfo === 'function') {
        const tracked = splTrack.getInfo(Entry, config_msg, EntryInfo);
        if (tracked && typeof tracked === 'object') {
            Object.assign(EntryInfo, tracked);
        }
    } else if (typeof splTrack.info === 'string') {
        EntryInfo.Text = splTrack.info;
    } else if (typeof splTrack.info === 'object' && EntryInfo.IsNewFloat) {
        EntryInfo.Text = splTrack.info[Entry.className];
        EntryInfo.disableAction = M_SCOPE.DIS_ACT['both'];
    }

    if (cur_action_idx === -1) {
        console.log('error'); // splTrack key missing from SPL_ACTION
        return;
    }

    // ── IsEq: only disable action based on text match ──────────────────────
    if (splTrack.key === "IsEq") {
        const EQ_DISABLE_KEYS = ['withLab', 'insertLab', 'inline', 'withoutLab', 'removeLab', 'edit'];
        for (const [k, v] of Object.entries(config_msg.IsEq.Info)) {
            if (EQ_DISABLE_KEYS.includes(k) && EntryInfo.Text && v === EntryInfo.Text.slice(1, -1)) {
                EntryInfo.disableAction = M_SCOPE.DIS_ACT['both'];
            }
        }
        return;
    }

    // ── All other SPL_ACTION keys: apply insert/ice-format row meta ─────────
    const insertObj = config_msg[cur_action_idx > 3 ? "ice-format" : "insert"];
    _applyRowMeta(EntryInfo, insertObj);

    if (['IsQuery', 'IsComment', 'IsNewQuery'].includes(splTrack.key)) {
        _handle_QueryComment(Entry, EntryInfo, splTrack, config_msg, M_SCOPE);
        return;
    }

    if (["IsStyle", "IsHeadStyle", "IsListStyle"].includes(splTrack.key)) {
        EntryInfo.disableAction = M_SCOPE.DIS_ACT['both'];
        if (splTrack.key === "IsHeadStyle") {
            EntryInfo.Text = 'Heading ' + $(EntryInfo.CloneNode).attr('data-levels');
        }
        return;
    }

    if (splTrack.key === "IsCellAlign") {
        EntryInfo.disableAction = M_SCOPE.DIS_ACT['reject'];
        return;
    }

    // ── suppmat: attribute-value driven config ──────────────────────────────
    if (splTrack.key === "IsSuppMat") {
        const suppCfg = config_msg[EntryInfo.trackType]; // trackType = data-track-type value
        if (suppCfg) {
            EntryInfo.Text = suppCfg.hint;
            EntryInfo.disableAction = M_SCOPE.DIS_ACT['reject'];
            _applyRowMeta(EntryInfo, suppCfg);
        }
    }
}

/**
 * Handle the query/comment row-meta and IS_TRACK_VIEW renderCommon call.
 * Extracted from the IsQuery/IsComment/IsNewQuery branch inside splTrack.
 */
function _handle_QueryComment(Entry, EntryInfo, splTrack, config_msg, M_SCOPE) {
    const cloneNode = EntryInfo && EntryInfo.CloneNode;
    const fallbackText = [
            EntryInfo && EntryInfo.Text,
            splTrack && typeof splTrack.info === "string" ? splTrack.info : null,
            cloneNode && cloneNode.textContent,
            Entry && Entry.textContent
        ]
        .find(text => typeof text === "string" && text.length > 0);

    EntryInfo.Text = typeof fallbackText === "string" ? fallbackText : "";

    if (EntryInfo.topRowtag && EntryInfo.topRowtag.match(/for/)) {
        EntryInfo.topRowInfoShow = "";
        EntryInfo.topRowtag = "qry";
    }

    if (cloneNode && cloneNode.querySelector('[data-annotate]')) {
        EntryInfo.disableAction = M_SCOPE.DIS_ACT['both'];
    }

    if (IS_TRACK_VIEW) {
        if (splTrack.key === "IsComment" && !M_SCOPE.userListdup["comment"]) {
            M_SCOPE.userListdup["comment"] = M_SCOPE.command_select;
        }

        const findRoot = cloneNode && cloneNode.tagName === "SPAN" ? EntryInfo.parent : cloneNode;
        const list = findRoot && typeof findRoot.querySelectorAll === "function" ?
            findRoot.querySelectorAll('span[data-user-comment-box]') : [];
        const targetEntry = EntryInfo.tagName === "insert" ? list[0] : Entry;
        const parentId = targetEntry && targetEntry.parentElement && targetEntry.parentElement.id;

        if (!parentId) return; // guard: prevent invalid renderCommon call

        if (window.queryModule && window.queryModule.templates &&
            typeof window.queryModule.templates.renderCommon === "function") {
            splTrack.AppendItems = [window.queryModule.templates.renderCommon(parentId, null, true)];
        }
    }

    // append query number inside the closing bracket of Text
    const idx = EntryInfo.Text.lastIndexOf("]");
    const span = (cloneNode && cloneNode.querySelector('[data-label]')) || EntryInfo.parent;
    const label = span && span.dataset && typeof span.dataset.label === "string" ?
        span.dataset.label.replace(/\D/g, "") : "";
    if (idx > -1 && label) {
        EntryInfo.Text =
            EntryInfo.Text.substr(0, idx) +
            ` ${label}` +
            EntryInfo.Text.substr(idx);
    }

    EntryInfo.disableAction = M_SCOPE.DIS_ACT['both'];
}

/**
 * Read disableAction from the CloneNode's own attributes
 * (data-disable-action-code or legacy data-reject/accept/both-action="false").
 * Only runs when EntryInfo.disableAction is still empty.
 */
function _resolveDisable(EntryInfo, M_SCOPE) {
    if (EntryInfo.disableAction) return;

    for (const attr of EntryInfo.CloneNode.attributes) {
        let key = null;

        if (attr.name === "data-disable-action-code") {
            key = attr.value && attr.value.trim();
        } else if (attr.value === "false") {
            if (attr.name.includes("data-reject-action")) key = "rej";
            else if (attr.name.includes("data-accept-action")) key = "ace";
            else if (attr.name.includes("data-both-action")) key = "both";
        }

        if (key && M_SCOPE.DIS_ACT[key]) {
            EntryInfo.disableAction = M_SCOPE.DIS_ACT[key];
            break;
        }
    }
}


// ── Main function ─────────────────────────────────────────────────────────────

function ForEach_Entry(entry, idx, Options = {}, self, $m_fun) {
    self = trackDialog;
    $m_fun = self.M_FUN;
    self['M_SCOPE'].Last_Item = entry;

    const isCollator = ROLE_IDS.CO === USER_INFO.ROLE_ID;
    let myEntry = "";
    let EntryInfo = {};

    // ? 13_JULY_2024_YA 2839604: Impact dashboard
    try {
        const config_msg = Object.assign({}, self.M_SCOPE.trackInfoMessages || {});
        const config_code = Object.assign({}, self.M_SCOPE.filterConfig || {});

        // ── 1. Gather entry metadata ─────────────────────────────────────────
        EntryInfo = $m_fun.get_entry_info(entry, {
            action: true
        });

        if (EntryInfo.CloneNode.hasAttribute('data-ignore-code') && EntryInfo.CloneNode.getAttribute('data-ignore-code') === 'panel') {
            debug.log("return by ignore item");
            return myEntry = "";
        }

        // insert/del that only mirrors child ckcommentsfull track-code → empty qry row; keep child
        if (_isMirroredTrackCodeWrapper(entry)) {
            debug.log("return by mirrored track-code wrapper");
            return myEntry = "";
        }

        if (isSoftDeletedCommentOrQueryShell(entry)) {
            debug.log("return by soft-deleted comment/query shell");
            return myEntry = "";
        }
        if (isWrapperOfDeletedCommentOrQuery(entry)) {
            debug.log("return by wrapper of deleted comment/query");
            return myEntry = "";
        }

        // Nested child with same data-track-code as parent insert/del → parent row only
        // Exception: if parent is a mirrored query wrapper, keep the child (source of truth)
        if (_hasParentSameTrackCode(entry)) {
            const parentWrap = entry.parentElement && typeof entry.parentElement.closest === 'function' ?
                entry.parentElement.closest('insert, del') : null;
            if (parentWrap && _isMirroredTrackCodeWrapper(parentWrap)) {
                debug.log("keep child; parent is mirrored track-code wrapper");
            } else {
                debug.log("return by parent same data-track-code");
                return myEntry = "";
            }
        }

        // ── 2. Track repeated timestamps for insert/del ──────────────────────
        if (EntryInfo.IsInsDel) {
            const dt = parseInt(EntryInfo.DateTime);
            const stamp = self.M_SCOPE.RepeatedTimes.stamp;
            if (!stamp[dt] || !stamp[dt][entry.tagName]) {
                stamp[dt] = {
                    [entry.tagName]: 1
                };
            } else {
                stamp[dt][entry.tagName] += 1;
                self.M_SCOPE.RepeatedTimes.find.push(`[data-time="${dt}"]`);
            }
        }

        // ── 3. Mark ignore from child data-delete attrs ──────────────────────
        if (entry.childElementCount !== 0) {
            $.each(entry.children, (_i, child) => {
                if (child.hasAttribute('data-delete')) EntryInfo.ignore = true;
            });
        }

        // ── 4. Ignore by parent context ──────────────────────────────────────
        if (EntryInfo.parent) {
            const {
                parent
            } = EntryInfo;
            if (parent.className.indexOf('impactdeltag') !== -1 && parent.tag === 'DEL') {
                entry.remove();
                EntryInfo.ignore = true;
            } else if (
                parent.className.indexOf('format') !== -1 ||
                parent.hasAttribute('data-delete') ||
                (entry.textContent === '' && EntryInfo.Type && !['graphic replaceImage'].includes(EntryInfo.Type))
            ) {
                if (parent.hasAttribute('data-delete')) {
                    const isRef = parent.className.indexOf('ref') > -1;
                    const isNote = parent.className.indexOf('fn') > -1;
                    const isFig = parent.className.indexOf('fig') > -1;
                    const isTbl = parent.className.indexOf('table-wrap') > -1;
                    var ignore = isRef || isNote || isFig || isTbl;
                    EntryInfo.ignore = ignore ? true : false;
                }
            }
        }
        // ── 5. Ignore: comment box rules ─────────────────────────────────────
        if (entry.hasAttribute('data-user-comment-box')) {
            const isInsert = !!(
                EntryInfo.parent &&
                EntryInfo.parent.parentElement &&
                EntryInfo.parent.parentElement.tagName === "INSERT"
            );
            const status = (entry.parentElement.getAttribute('data-status') || "").toLowerCase();
            EntryInfo.ignore = (status === "open" && !isInsert);
            if (Array.from(entry.parentElement.children).indexOf(entry) > 0 && !isInsert) {
                EntryInfo.ignore = true;
            }
        }

        // ── 6. Skip guard ────────────────────────────────────────────────────
        if (_shouldSkip(EntryInfo, isCollator)) return debug.log("entry return");

        // ── 6b. Stamp panel unique id once (never rewrite) ───────────────────
        try {
            if (entry && entry.nodeType === 1) {
                let uid = entry.getAttribute('data-sr-panel-unique-id');
                if (!uid) {
                    uid = 'srp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
                    entry.setAttribute('data-sr-panel-unique-id', uid);
                }
                EntryInfo.srPanelUniqueId = uid;
            }
        } catch (err) {
            console.warn(err.message);
        }

        // ── 7. Strip format spans from clone ────────────────────────────────
        EntryInfo.CloneNode.querySelectorAll('span[class*="format"]').forEach(el => el.remove());

        // ── 8. Register user in dropdown list ───────────────────────────────
        _registerUser(EntryInfo, self['M_SCOPE'], self.iDOM);

        const newTrackType = EntryInfo.CloneNode.hasAttribute('data-track-code');
        const trackCode = newTrackType ? EntryInfo.CloneNode.getAttribute('data-track-code') : null;
        const newTrackConfig = newTrackType ? (config_code[trackCode] || {}) : {};

        if (/trackView/gi.test(newTrackConfig.ignore) && IS_TRACK_VIEW) {
            return "";
        }
        if (shouldSkipCommentQueryStubInTrackView(entry, EntryInfo.splTrack, trackCode)) {
            debug.log("return by comment/query stub skip");
            return "";
        }

        // ── 9. splTrack early exits ──────────────────────────────────────────
        const {
            splTrack
        } = EntryInfo;

        if (splTrack) {
            if (splTrack.Ignore) return debug.log("return by ignore item");
            if (splTrack.isDeleted && IS_EDITOR_PAGE && !isCollator) return debug.log("return by deleted item");
        }


        // ── 10. Collator span tag normalisation ──────────────────────────────
        // ! 30-Apr-2022 Collator view issue
        if (EntryInfo.IsInsDel && EntryInfo.tagName === 'span') {
            EntryInfo.tagName = entry.getAttribute('data-action-old-tag').toLocaleLowerCase();
        }
        if (Object.keys(newTrackConfig).length > 0) {

            EntryInfo.Text = EntryInfo.Text || getTxt(EntryInfo.CloneNode);
            _applyRowMeta(EntryInfo, newTrackConfig);

            // Track View query/comment shells need AppendItems from renderCommon;
            // new_tracking_code path skips _resolveText_splTrack, so fill them here.
            if (IS_TRACK_VIEW && splTrack && ['IsNewQuery', 'IsQuery', 'IsComment'].includes(splTrack.key)) {
                _handle_QueryComment(entry, EntryInfo, splTrack, config_msg, self['M_SCOPE']);
            }

        } else {

            // ── 11. Resolve Text + row meta ──────────────────────────────────────
            const cur_action_idx = splTrack ? self.SPL_ACTION.indexOf(splTrack.key) : -1;
            const temp_JSON = config_msg[
                EntryInfo.IsInsDel ? EntryInfo.tagName :
                EntryInfo.IsforMat ? entry.getAttribute('data-css') :
                entry.className
            ];

            if (temp_JSON && !splTrack) {
                const skip = _resolveText_standard(entry, EntryInfo, config_msg, temp_JSON, self['M_SCOPE']);
                if (skip === 'SKIP') return console.log("NEW FLOAT / label skip");
                _applyRowMeta(EntryInfo, temp_JSON);
                EntryInfo = $m_fun.handle_Space_Character(EntryInfo);

            } else if (splTrack) {
                const skip = _resolveText_splTrack(entry, EntryInfo, splTrack, cur_action_idx, config_msg, self['M_SCOPE']);
                if (skip === 'SKIP') return console.log("NEW FLOAT");

            } else if (EntryInfo.InterestLevelChanged) {
                const actKey = `interest-level-${entry.getAttribute('data-level') || "edit"}`;
                const action = config_msg.IsRef.Info[actKey];
                if (action) EntryInfo.Text = action;
                EntryInfo.disableAction = self['M_SCOPE'].DIS_ACT['both'];
                _applyRowMeta(EntryInfo, config_msg.insert);
            }

        }


        // ── 12. Safety net ───────────────────────────────────────────────────
        if (!EntryInfo || typeof EntryInfo !== 'object') EntryInfo = {};
        if (!EntryInfo.Text) EntryInfo.Text = '';

        // ? skip disp-formula equation citation renumbering
        if (!EntryInfo.Text && EntryInfo.tagName && EntryInfo.tagName.toLowerCase() === "a" && EntryInfo.username === "disp-formula") {
            delete self.M_SCOPE && self.M_SCOPE.userListdup && self.M_SCOPE.userListdup[EntryInfo.username];
            return ""; // TODO: handle equation citation renumbering properly
        }

        // ── 13. Resolve disable from DOM attrs ───────────────────────────────
        _resolveDisable(EntryInfo, self['M_SCOPE']);

        // ── 14. Truncate display text ────────────────────────────────────────
        EntryInfo.stripTxt = EntryInfo.Text.length > 35 ?
            EntryInfo.Text.slice(0, 30) + '...' :
            EntryInfo.Text;

        // ── 15. Build HTML from templates ────────────────────────────────────
        const [actionAttr, actionStr] = $m_fun.getActionInfo(entry);
        const isQryCmd = splTrack && ['IsNewQuery', 'IsQuery', 'IsComment'].includes(splTrack.key);

        myEntry = _tpl.entryRoot(EntryInfo, idx, actionAttr);

        if (isQryCmd && IS_TRACK_VIEW) {
            // Fallback if AppendItems still empty (guard against blank track-entry-div)
            if (!(splTrack.AppendItems && splTrack.AppendItems.length) &&
                typeof _handle_QueryComment === 'function') {
                _handle_QueryComment(entry, EntryInfo, splTrack, config_msg, self['M_SCOPE']);
            }
            myEntry += _tpl.queryView(splTrack);
            // No stub fallback in Track View — revision card only
            if (!(splTrack.AppendItems && splTrack.AppendItems.length)) {
                debug.log("return by trackView comment/query without renderCommon");
                return "";
            }
        } else {
            const qryExtra = isQryCmd ? `data-status="comment" data-id="${EntryInfo.parent.id}" data-query-id="${EntryInfo.parent.id}"` : "";
            myEntry += _tpl.headerRow(EntryInfo);
            myEntry += _tpl.contentRow(EntryInfo, qryExtra);
        }

        const hintCode = newTrackConfig && EntryInfo.CloneNode &&
            EntryInfo.CloneNode.getAttribute && EntryInfo.CloneNode.getAttribute('data-track-code');
        const skipHintInTrackView = IS_TRACK_VIEW && hintCode &&
            /^(comment|query)-/i.test(hintCode);
        if (!skipHintInTrackView &&
            (EntryInfo.IsforMat || (splTrack && splTrack.key === 'IsLink') || (newTrackConfig && newTrackConfig.hint))) {
            myEntry += _tpl.formatRow(EntryInfo, entry, newTrackConfig, self);
        }

        myEntry += _tpl.actionRow(actionStr);

    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('ForEach_Entry', err.message);
        myEntry = "";
    } finally {
        return Options.returnJson ? EntryInfo : myEntry;
    }
}

// ── back-up function ─────────────────────────────────────────────────────────────

// ForEach_Entry: function (Entry, idx, Options = {}, $this, $m_fun) {
//                     $this = trackDialog;
//                     $m_fun = this;
//                     $this['M_SCOPE'].Last_Item = Entry;
//                     var isCollator = ROLE_IDS.CO == USER_INFO.ROLE_ID ? true : false;
//                     var myEntry = "",
//                         EntryInfo = {};
//                     // ? 13_JULY_2024_YA 2839604: Impact dashboard
//                     try {
//                         const isSameUser = commonMethods.IS_SAME_USER_AND_ROLE(Entry);
//                         // let config_msg = $this['M_SCOPE'].trackInfoMessages;
//                         const config_msg = Object.assign({}, $this.M_SCOPE.trackInfoMessages) || {};
//                         EntryInfo = $m_fun.get_entry_info(Entry, {
//                             action: true
//                         });
//                         if (EntryInfo.IsInsDel) {
//                             let dt = parseInt(EntryInfo.DateTime);
//                             let IsExist = $this.M_SCOPE.RepeatedTimes.stamp[dt];
//                             if (!IsExist || !IsExist[Entry.tagName]) {
//                                 $this.M_SCOPE.RepeatedTimes.stamp[dt] = {
//                                     [Entry.tagName]: 1
//                                 };
//                             } else if (IsExist && IsExist[Entry.tagName]) {
//                                 $this.M_SCOPE.RepeatedTimes.stamp[dt][Entry.tagName] += 1;
//                                 $this.M_SCOPE.RepeatedTimes.find.push(`[data-time="${dt}"]`);
//                             }
//                         }
//                         if (Entry.childElementCount != 0) {
//                             // ? ignore unwanted items author group
//                             $.each(Entry.children, function (indexInArray, valueOfElement) {
//                                 if (valueOfElement.hasAttribute('data-delete')) {
//                                     EntryInfo.ignore = true;
//                                 }
//                             });
//                         }
//                         // ? Ignore selective items
//                         if (EntryInfo.parent) {
//                             if ((EntryInfo.parent.className.indexOf('impactdeltag') != -1) && (EntryInfo.parent.tag == 'DEL')) {
//                                 Entry.remove();
//                                 EntryInfo.ignore = true;
//                             } else if (EntryInfo.parent.className.indexOf('format') != -1 || EntryInfo.parent.hasAttribute('data-delete') || Entry.textContent == '' && EntryInfo.Type && !['graphic replaceImage'].includes(EntryInfo.Type)) {
//                                 let IsKWD = EntryInfo.parent.className.indexOf('kwd') > -1 && EntryInfo.parent.hasAttribute('data-delete');
//                                 EntryInfo.ignore = IsKWD ? false : true;
//                             }
//                         }
//                         // ? return the ignore items
//                         if (Entry.hasAttribute('data-user-comment-box')) {
//                             // ? UPDATE - SHOW ONLY CLOSED QUERY ITEMS
//                             const isInsert = EntryInfo.parent && EntryInfo.parent.parentElement && EntryInfo.parent.parentElement.tagName == "INSERT" || false;
//                             EntryInfo.ignore = (Entry.parentElement.getAttribute('data-status') || "").toLowerCase() === "open" && !isInsert;
//                             if (Array.from(Entry.parentElement.children).indexOf(Entry) > 0 && !isInsert) {
//                                 EntryInfo.ignore = true;
//                             }
//                         }
//                         // ? Ignore comment if attribute has data-ignore-comment - 12-DEC-22_AN
//                         const shouldSkipEntry = (EntryInfo, Entry) => {
//                             const isIgnored = EntryInfo.ignore;
//                             const isDeleted = EntryInfo.isDeleted;
//                             const hasNoUser = !EntryInfo.username;

//                             const isDeletedOrIgnored = isDeleted && !IS_TRACK_VIEW && !isCollator;

//                             return isIgnored || hasNoUser || isDeletedOrIgnored;
//                         };

//                         // Usage
//                         if (shouldSkipEntry(EntryInfo, Entry)) {
//                             return debug.log("entry return");
//                         }

//                         EntryInfo.CloneNode.querySelectorAll('span[class*="format"]').forEach((el, ind, arr) => {
//                             el.remove();
//                         });
//                         // ?  set user name details in dropdown
//                         // ? Strip domain from user id for display
//                         EntryInfo.displayname = classCase(EntryInfo.username.replace(/(\.\w+)?@\w+\.\w+(\.\w+)?/g, "")) + EntryInfo.Rolename;
//                         // ? Add user list in select node
//                         EntryInfo.user_short_name = EntryInfo.username && EntryInfo.username.split('@')[0] ? EntryInfo.username.split('@')[0] : EntryInfo.username;
//                         if (!$this['M_SCOPE'].userListdup[EntryInfo.username]) {
//                             $this['M_SCOPE'].userList.push(EntryInfo.username);
//                             let [findUser, user, orderId] = [null, EntryInfo.username, ""];
//                             if (user.indexOf("@") > 0) {
//                                 findUser = $this.iDOM.querySelector(`[data-username="${user}"]`);
//                                 if (findUser) {
//                                     orderId = `data-user-order="${findUser.getAttribute("data-userid")}" `;
//                                 }
//                             } else {

//                             }
//                             $this['M_SCOPE'].userListdup[user + EntryInfo.Rolename] = `<option ${orderId} value="${user + EntryInfo.Rolename}" data-rolename="${EntryInfo.Rolename}">${EntryInfo.displayname}</option>`;
//                         }
//                         // ? Define tag and  class and text types
//                         // if (IS_LOCAL_HOST) debugger;
//                         let {
//                             splTrack
//                         } = EntryInfo;

//                         if (splTrack) {
//                             if (splTrack.Ignore) return debug.log("return by ingore item");
//                             if (splTrack.isDeleted && IS_EDITOR_PAGE && !isCollator) return debug.log("return by deleted item");
//                         }

//                         var cur_action_idx = splTrack ? $this.SPL_ACTION.indexOf(splTrack.key) : -1;
//                         // ! 30-Apr-2022 Collator view issue
//                         if (EntryInfo.IsInsDel && EntryInfo.tagName == 'span') {
//                             EntryInfo.tagName = Entry.getAttribute('data-action-old-tag').toLocaleLowerCase();
//                         }
//                         let temp_JSON = config_msg[EntryInfo.IsInsDel ? EntryInfo.tagName : (EntryInfo.IsforMat ? (Entry.getAttribute('data-css')) : (Entry.className))];
//                         if (temp_JSON && !splTrack) {
//                             // ? to show text
//                             if (!!EntryInfo.CloneNode && EntryInfo.CloneNode.querySelector('span.TEX') && !EntryInfo.IsNewConcept && $this['M_SCOPE'].IsNestedInsert) {
//                                 EntryInfo.Text = [].reduce.call(EntryInfo.CloneNode.childNodes, function (a, b) {
//                                     return a + (b.nodeType === 3 ? b.textContent : '');
//                                 }, '');
//                             } else if (EntryInfo.IsNewConcept) {
//                                 temp_JSON = config_msg.insert;
//                                 EntryInfo.Text = Entry.hasAttribute('data-track-value') ? Entry.getAttribute('data-value') : EntryInfo.CloneNode.textContent;
//                                 EntryInfo.disableAction = $this['M_SCOPE'].DIS_ACT['both'];
//                             } else if (EntryInfo.IsInsDel) {
//                                 // ? Handling the new float
//                                 if (EntryInfo.IsNewFloat) {
//                                     return console.log("NEW FLOAT");
//                                 } else if (EntryInfo.IsRef || EntryInfo.IsNotes) {
//                                     let {
//                                         IsRef,
//                                         IsNotes,
//                                         IsNewNotes,
//                                         IsNewRef,
//                                         IsDelRef,
//                                         IsDelNotes
//                                     } = EntryInfo;
//                                     // ? Handling the Reference inserted and citation renumbering
//                                     if (EntryInfo.parent.className == 'label') {
//                                         // EntryInfo.disableAction=_.DIS_ACT['rej'];
//                                         // EntryInfo.Text = EntryInfo.CloneNode.textContent;
//                                         return;
//                                     } else console.log('ref/Notes');

//                                     // ? display text panel
//                                     // if (IS_LOCAL_HOST) debugger;
//                                     let tempNote = Entry.closest(IsRef ? '.ref' : '.fn');

//                                     if (tempNote) {
//                                         let temp = config_msg[IsRef ? 'IsRef' : 'IsNotes'].Info;
//                                         let key = (IsNewRef || IsNewNotes) ? "new" : (IsDelRef || IsDelNotes) ? "remove" : "";
//                                         if (temp && key && temp[key]) {
//                                             EntryInfo.Text = temp[key];
//                                         } else EntryInfo.Text = EntryInfo.CloneNode.textContent;
//                                         if (key) { // isSameUser ||
//                                             // ! 3344699	LWW - Client Requirement- Rejecting the same user's corrections
//                                             EntryInfo.disableAction = $this['M_SCOPE'].DIS_ACT['both'];
//                                         } else {

//                                         }
//                                     }
//                                 } else if (EntryInfo.IsCite) {

//                                     convertAttributeModetoTextMode(EntryInfo.CloneNode);
//                                     EntryInfo.disableAction = $this['M_SCOPE'].DIS_ACT['both'];
//                                     EntryInfo.Text = EntryInfo.CloneNode.textContent;

//                                 } else if (!EntryInfo.IsNewConcept && !$this['M_SCOPE'].IsNestedInsert) {
//                                     EntryInfo.Text = EntryInfo.CloneNode.textContent || Entry.getAttribute('data-content');
//                                 } else EntryInfo.Text = EntryInfo.CloneNode.textContent || Entry.getAttribute('data-content');
//                             } else {
//                                 // ? handle multiple items repeated
//                                 EntryInfo.Text = EntryInfo.CloneNode.textContent || '';
//                             }
//                             EntryInfo.topRowCSS = temp_JSON.topRowCSS;
//                             EntryInfo.topRowtag = temp_JSON.topRowtag;
//                             EntryInfo.topRowInfoShow = temp_JSON.topRowInfoShow;
//                             // ? add class for empty space
//                             // ? YA_28_DEC_22 - SIVA_POINT#10 - non-breaking-space also handle
//                             // ? 3385029: Display of space names in the Review panel
//                             EntryInfo = $m_fun.handle_Space_Character(EntryInfo);
//                             /*
//                             if ((['', ' ', ' '].includes(EntryInfo.Text) || $this['M_SCOPE'].whitespaceOnlyRegex.test(EntryInfo.Text)) && !EntryInfo.IsNewConcept) {
//                                 let temp = config_msg.IsCharacterSpace;
//                                 EntryInfo.Text = temp.Info;
//                                 EntryInfo.topRowCSS = temp.topRowCSS;
//                             }*/
//                         } else if (splTrack) {
//                             var getInfo = splTrack.getInfo;
//                             if (EntryInfo.IsInsDel && EntryInfo.IsNewFloat) {
//                                 // ? Handling the new float
//                                 return console.log("NEW FLOAT");
//                             }
//                             if (typeof getInfo === 'function') {
//                                 let trackedInfo = getInfo(Entry, config_msg, EntryInfo);
//                                 if (trackedInfo && typeof trackedInfo === 'object') {
//                                     EntryInfo = trackedInfo;
//                                 }
//                             } else if (typeof splTrack.info == "string") {
//                                 EntryInfo.Text = splTrack.info;
//                             } else if (typeof splTrack.info === 'object') {
//                                 if (EntryInfo.IsNewFloat) {
//                                     EntryInfo.Text = splTrack.info[Entry.className];
//                                     EntryInfo.disableAction = $this['M_SCOPE'].DIS_ACT['both'];
//                                 }
//                             }
//                             // ? Replace Image and new comment track
//                             if (cur_action_idx > -1) {
//                                 if (!["IsEq"].includes(splTrack.key)) {
//                                     let insertObj = config_msg[cur_action_idx > 3 ? "ice-format" : "insert"];
//                                     EntryInfo.topRowtag = insertObj.topRowtag;
//                                     EntryInfo.topRowCSS = insertObj.topRowCSS;
//                                     EntryInfo.topRowInfoShow = insertObj.topRowInfoShow;
//                                     if (['IsQuery', 'IsComment', 'IsNewQuery'].includes(splTrack.key)) {
//                                         if (EntryInfo.topRowtag.match(/for/)) {
//                                             EntryInfo.topRowInfoShow = "";
//                                             EntryInfo.topRowtag = "qry";
//                                         }
//                                         if (!!EntryInfo.CloneNode.querySelector('[data-annotate]')) EntryInfo.disableAction = $this['M_SCOPE'].DIS_ACT['both'];
//                                         if (IS_TRACK_VIEW) {
//                                             if (splTrack.key == "IsComment" && !$this['M_SCOPE'].userListdup["comment"]) {
//                                                 // ? 28_JUNE_23_YA_NEED_SEAN_APPROVAL
//                                                 $this['M_SCOPE'].userListdup["comment"] = $this['M_SCOPE'].command_select;
//                                             }
//                                             let findRoot = EntryInfo.CloneNode.tagName == "SPAN" ? EntryInfo.parent : EntryInfo.CloneNode;
//                                             let list = findRoot.querySelectorAll('span[data-user-comment-box]');


//                                             if (window.queryModule && window.queryModule.templates) {

//                                                 if (typeof window.queryModule.templates.renderCommon === "function") {

//                                                     var targetEntry = EntryInfo.tagName === "insert" ? list[0] : Entry;
//                                                     var parentElement = targetEntry && targetEntry.parentElement;
//                                                     var parentId = parentElement && parentElement.id;

//                                                     if (!parentId) return; // prevent invalid render call

//                                                     var stringData = window.queryModule.templates.renderCommon(parentId, null, true);
//                                                     splTrack.AppendItems = [stringData];
//                                                 }
//                                             }


//                                         }
//                                         let idx = EntryInfo.Text.lastIndexOf("]");
//                                         let span = EntryInfo.CloneNode.querySelector('[data-label]') ? EntryInfo.CloneNode.querySelector('[data-label]') : EntryInfo.parent;
//                                         if (idx > -1) EntryInfo.Text = EntryInfo.Text.substr(0, idx) + ` ${span.dataset.label.replace(/\D/g, "")}` + EntryInfo.Text.substr(idx);
//                                         EntryInfo.disableAction = $this['M_SCOPE'].DIS_ACT['both'];
//                                     } else if (["IsStyle", "IsHeadStyle", "IsListStyle"].includes(splTrack.key)) {
//                                         EntryInfo.disableAction = $this['M_SCOPE'].DIS_ACT['both'];
//                                         if ("IsHeadStyle" == splTrack.key) {
//                                             EntryInfo.Text = 'Heading ' + $(EntryInfo.CloneNode).attr('data-levels');
//                                         }
//                                     } else if (["IsCellAlign"].includes(splTrack.key)) {
//                                         EntryInfo.disableAction = $this['M_SCOPE'].DIS_ACT['rej'];
//                                     }
//                                 } else if (["IsEq"].includes(splTrack.key)) {
//                                     //  ! DISABLE ACTION
//                                     for (const [key, value] of Object.entries(config_msg.IsEq.Info)) {
//                                         if (['withLab', 'insertLab', 'inline', 'withoutLab', 'removeLab', 'edit'].includes(key) && EntryInfo.Text && value == EntryInfo.Text.slice(1, -1)) {
//                                             //console.log([value, EntryInfo.Text.slice(1,-1)]);
//                                             EntryInfo.disableAction = $this['M_SCOPE'].DIS_ACT['both'];
//                                         }
//                                     }
//                                 }
//                             } else console.log('error');
//                         } else if (EntryInfo.InterestLevelChanged) {
//                             EntryInfo.disableAction = $this['M_SCOPE'].DIS_ACT['both'];
//                             var act_key = `interest-level-${Entry.getAttribute('data-level') || "edit"}`;
//                             var action = config_msg.IsRef.Info[act_key];
//                             if (action) EntryInfo.Text = action;
//                             EntryInfo.topRowCSS = config_msg.insert.topRowCSS;
//                             EntryInfo.topRowtag = config_msg.insert.topRowtag;
//                             EntryInfo.topRowInfoShow = config_msg.insert.topRowInfoShow;
//                         }
//                         if (!EntryInfo || typeof EntryInfo !== 'object') {
//                             EntryInfo = {};
//                         }
//                         if (!EntryInfo.Text) EntryInfo.Text = '';
//                         if (EntryInfo && !EntryInfo.Text && EntryInfo.tagName && EntryInfo.tagName.toLowerCase() === "a" && EntryInfo.username === "disp-formula") {
//                             if ($this.M_SCOPE && $this.M_SCOPE.userListdup) {
//                                 delete $this.M_SCOPE.userListdup[EntryInfo.username];
//                             }
//                             // TODO: handle equation citation renumbering properly
//                             return "";
//                         }

//                         // ? disable btn action from entry itself


//                         if (!EntryInfo.disableAction) {
//                             for (const attr of EntryInfo.CloneNode.attributes) {
//                                 if (attr.value === "false") {
//                                     let key = null;

//                                     if (attr.name.includes("data-reject-action")) key = "rej";
//                                     else if (attr.name.includes("data-accept-action")) key = "ace";
//                                     else if (attr.name.includes("data-both-action")) key = "both";

//                                     if (key) {
//                                         EntryInfo.disableAction = $this['M_SCOPE'].DIS_ACT[key];
//                                         break; // stop after first match
//                                     }
//                                 }
//                             }
//                         }

//                         // ? set stripping text if more than 35 characters
//                         EntryInfo.stripTxt = (EntryInfo.Text.length > 35) ? (EntryInfo.Text.slice(0, 30) + '...') : EntryInfo.Text;
//                         // if (EntryInfo.Text < 5 && IS_LOCAL_HOST) debug.log(EntryInfo.Text, Entry);
//                         // ? fetch action by
//                         EntryInfo.action = $m_fun.getActionInfo(Entry);
//                         myEntry = `<div class="d-flex entry" data-order="index" data-index=${idx} data-action-disable="${EntryInfo.disableAction}" data-tag="${EntryInfo.topRowtag}" data-rolename="${EntryInfo.Rolename}" data-id="${EntryInfo.DateTime}" data-username="${EntryInfo.username}" ${EntryInfo.action[0]}><div class="d-flex flex-column track-entry-div">`;
//                         // ? Handle here for Comments and query
//                         var isQryCmd = splTrack && ['IsNewQuery', 'IsQuery', 'IsComment'].indexOf(splTrack.key) !== -1;
//                         if (isQryCmd && IS_TRACK_VIEW) {
//                             myEntry += splTrack.AppendItems.join('');
//                         } else {
//                             let extra = "";
//                             let infoShow = EntryInfo.topRowtag && EntryInfo.topRowInfoShow ? `<span class="t-type text-track ${EntryInfo.topRowtag}">${EntryInfo.topRowInfoShow}</span>` : "";
//                             if (isQryCmd) {
//                                 extra = `data-status="comment" data-id="${EntryInfo.parent.id}"`;
//                             }
//                             myEntry += `<div class="d-flex justify-content-between"><div class="pb-1 flex-grow-1"><span data-toggle="tooltip" title="${EntryInfo.user_short_name}" class="t-user">${EntryInfo.displayname}</span>${infoShow}</div><div class="ml-auto t-date pb-1"><span  data-toggle="tooltip" title="${EntryInfo.Time}">${EntryInfo.Date}</span></div></div><div class="d-flex" ${extra}><span class="${EntryInfo.topRowCSS} d-flex" data-toggle="tooltip" title="${EntryInfo.Text}" tabindex="0">${EntryInfo.stripTxt}</span></div>`;
//                         }
//                         if (EntryInfo.IsforMat || splTrack && splTrack.key == 'IsLink') {
//                             /* ||cur_action_idx==0 */
//                             // ? here handle formatting adding/remove
//                             let name = Entry.hasAttribute('data-name-old') ? (Entry.getAttribute('data-name-old')) : (Entry.getAttribute('data-name'));
//                             let tempStyle = EntryInfo.IsforMat ? ((EntryInfo.Type.indexOf('ice-reformat') == 0) ? ('Not ' + name) : (name)) : (EntryInfo.linkInfo);
//                             myEntry += `<div class="d-flex"><span class="${EntryInfo.topRowCSS} format">[${tempStyle}]</span></div>`;
//                         }
//                         myEntry += EntryInfo.action[1] + '</div></div>';
//                         // return myEntry;
//                         //console.log([ind,Entry]);
//                     } catch (err) {
//                         console.warn(err.message);
//                         ErrorLogTrace('ForEach_Entry', err.message);
//                         myEntry = "";
//                     } finally {
//                         return Options.returnJson ? EntryInfo : myEntry;
//                     }
//                 },