// ? 1996636: Funding Section and IMPACT message
class PlaceHolderModule {
    constructor(options) {
        this.options = options || {};
        this.originalCache = null;
        this.templateDelimiterState = null;
        this._editorEventsBound = false;
        this.initializeValues(this.options);
        this.bindEditorEvents();
    }

    initializeValues(options) {
        options = options || {};
        this.initiated = false;
        this.defaultRegex = /Insert|Here/gi;
        this.alertOneRegex = /keyword|SurName|GivenName|Term|Definition/gi;
        this.KWD_RESTRICT_CLASS = ['kwd', 'term', 'def', 'definition'];
        this.templateAliases = ['GivenName SurName', 'SurName GivenName', 'Degree'];
        this.templates = {
            'kwd': 'keyword',
            'surname': 'SurName',
            'given-names': 'GivenName',
            'alt-text': 'To aid accessibility, please provide an alt-text description of your figure here.',
            'term': 'Term',
            'def': 'Definition',
            'corresp': "Type_Here",
            "fund": 'Insert funding details here'
        };
        this.rules = {
            kwd: {
                label: 'keywords',
                cmd: 'KEYWORDS_delete'
            },
            def: {
                label: 'Abbreviations',
                cmd: 'ABBREVIATIONS_delete'
            },
            term: {
                label: 'Abbreviations',
                cmd: 'ABBREVIATIONS_delete'
            }
        };
        this.selector = Object.assign({
            tc: '.TrackChangesList',
            prefix: ' : ',
            text_find: '',
            TC_OLD_CLASS: '',
            TC_ROOT_ID: "",
            TC_INNER_ID: "",
            TC_UL_ID: "",
        }, options.selector || {});
        this.Template_List = [];
        this.group_selector = options.group_selector || ".contrib-group, .kwd-group, .author-notes, .fig, .name, .def-item, .def-list";
        this.node_selector = options.node_selector || ".kwd, .corresp, .fn, .given-names, .surname, .degrees, .alt-text, .term, .def, .p";
    }

    bindEditorEvents() {
        var self = this;
        if (self._editorEventsBound) return;
        self._editorEventsBound = true;

        document.addEventListener('DOMContentLoaded', function() {
            CKEDITOR.on('instanceReady', function(ev) {
                self.captureInitialTemplateDelimiterState();
            });
        });
    }
}

Object.assign(PlaceHolderModule.prototype, {
    REMOVE_DEL: function(count = 0, self) {
        self = this;
        try {
            let CheckDelNode = GlobalEditor.document.find('.impactdeltag').$;
            if (CheckDelNode.length != 0) {
                $(CheckDelNode).find('del').remove();
            }
            if (count > 3) return;
            var loop_count = 1 + count;
            setTimeout(() => {
                self.REMOVE_DEL(loop_count);
            }, 150);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('REMOVE_DEL', err.message);
        }
    },
    FIRE_CLICK: function(ClickElm, ev, self, IMS) {
        IMS = IMPACT_SELECTION, self = PlaceHolder_Module;
        if (!self.initiated) self.Init();
        try {
            Array.from(GlobalEditor.document.find('.active, .highlightAff').$).forEach(el => {
                el.classList.remove('active', 'highlightAff');
            });
            // ? Open POP WINDOW
            if (ClickElm.$.closest('.contrib-group') || ClickElm.$.closest('.TrackChangesList')) {
                AuthorGroupNewModule.AuthorGroupClick(GlobalEditor);
                debug.log("==TC-Clicked===");
            }
            if (ClickElm != null && ClickElm.$.closest(self.group_selector)) {
                if (ClickElm.$.closest(self.node_selector) == null && /impactdeltag/gi.test(IMS.NODE_CLAS)) {
                    ClickElm = IMS.NODE;
                }
                if ((ClickElm.$.closest(self.node_selector))) {
                    ClickElm.$.normalize();
                    let next = ClickElm.getNext(),
                        pi_elm = /delimt|pistart/gi.test(ClickElm.$.className);
                    if (ClickElm.hasAttribute("lastpi")) {
                        let tempElm = ClickElm.getNextSourceNode().getFirst().getFirst();
                        if (tempElm.hasClass("given-names")) {
                            ClickElm = tempElm;
                        }
                    } else if (!!pi_elm && !!next) {
                        if (next.hasClass('kwd')) {
                            ClickElm = next;
                        } else if (/TrackChangesList/gi.test(next.$.className)) {
                            ClickElm = ClickElm.getPreviousSourceNode();
                        }
                    }
                    Array.from(ClickElm.$.closest(self.node_selector).childNodes).forEach((node, ind, arr) => {
                        let IsNewElm = self.Template_List.includes(node.nodeValue) || self.Template_List.includes(ClickElm.getText());
                        $(IMS.PARENT.find("[data-cke-bookmark]").$).remove();
                        if ((node.nodeType == Node.TEXT_NODE) && (node.parentElement.tagName != 'INSERT') && IsNewElm) {
                            //GlobalEditor.getSelection().selectNodeContents(ClickElm);
                            var sel = GlobalEditor.getSelection(),
                                rng = GlobalEditor.createRange(),
                                first = ClickElm.getFirst();
                            if (first) {
                                rng.setStart(ClickElm, 0);
                                rng.setEnd(first, first.getLength());
                                sel.selectRanges([rng]);
                                debug.log("selected");
                            }
                        }
                    });
                }
                let [tempGroup, tempElm] = [ClickElm.$.closest(self.group_selector), ClickElm.$.closest(self.node_selector)];
                // tempElm = (tempElm != null && tempElm.className == 'delimt' && tempElm.nextElementSibling.hasAttribute('data-name')) ? (tempElm.nextElementSibling) : (tempElm);
                if (tempElm) {
                    if (/delimt/gi.test(tempElm.className) && tempElm.nextElementSibling && tempElm.nextElementSibling.hasAttribute('data-name')) {
                        tempElm = tempElm.nextElementSibling;
                        // ? Def Active Issue -> RJ 28_Mar-24
                    }
                    if (/fig/gi.test(tempGroup.className) && /p/gi.test(tempElm.className)) {
                        // ? caption Active Issue -> YA_09_MAY_24
                        tempElm = null;
                    }
                    if (tempElm) tempElm.classList.add('active');
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_CLICK', err.message);
        }
    },
    FIRE_KEYUP: function(CharCode, evt, Options = {}, self, IMS) {
        IMS = IMPACT_SELECTION, self = PlaceHolder_Module;
        if (!self.initiated) self.Init();
        try {
            let ALT_GROUP_CLOSEST = IMS.NODE.$.closest(self.group_selector),
                ALT_NODE_CLOSEST = IMS.NODE.$.closest(self.node_selector);
            if (ALT_NODE_CLOSEST) {
                if (evt.data) {
                    if ((evt.data.$ && evt.data.$.keyCode == 13) || (evt.data.keyCode && evt.data.keyCode == 13)) {
                        if (IMS.ISEndOfBlock && ALT_GROUP_CLOSEST && /def|def-item/gi.test(ALT_GROUP_CLOSEST.dataset.name)) {
                            // ?  2171260 HAE Abbreviation return 11_MAY_2024_YA
                            if (window.Abbreviation_Module && typeof window.Abbreviation_Module.FIRE === 'function') {
                                window.Abbreviation_Module.FIRE("ADD");
                            } else if (typeof ErrorLogTrace === 'function') {
                                ErrorLogTrace('Abbreviation_Module.FIRE', 'unavailable');
                            }
                            debug.log('evt return');
                        }
                        if (ALT_GROUP_CLOSEST) {
                            debug.log('evt return');
                            evt.cancel();
                            return false;
                        }
                    }
                }
                if (Options.IsArrowMovement || Options.IsKeyMovement) {
                    self.FIRE_CLICK(IMS.NODE, evt);
                    self.REMOVE_DEL();
                }

            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_KEYUP', err.message);
            evt.cancel();
            return false;
        }
    },
    TC_Template: function(self) {
        self = this;
        let {
            TC_ROOT_ID,
            TC_OLD_CLASS,
            TC_INNER_ID,
            TC_UL_ID
        } = self.selector;
        try {
            return $(`<div id='${TC_ROOT_ID}' class='TrackChangesList'><span class='tc'>[TC]</span><div id='${TC_INNER_ID}' class='pop_up'><div id='${TC_OLD_CLASS}' class='oldStructure'></div><ul id='${TC_UL_ID}'></ul></div></div>`);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('TC_Template', err.message);
        }
    },
    TC_MSG: function(action, node, nodeGroup, NodeGroupClone, IsNew, self, selector) {
        debug.log("===TC_MSG===");
        self = this;
        selector = this.selector;
        let {
            TC_ROOT_ID,
            TC_OLD_CLASS,
            TC_INNER_ID,
            TC_UL_ID,
            prefix
        } = self.selector;
        try {
            action = action.toLowerCase();

            IsNew = action == ADD ? !IsNew : IsNew;
            node = (node.$ ? node.$ : (node[0] ? node[0] : node));
            // ? Get old  structure
            if ($(NodeGroupClone).find(selector['tc']).length == 0) {
                var oldStructure = Array.from(nodeGroup.querySelectorAll(selector['text_find'])).reduce(function(accumulator, node) {
                    // ? Get name text
                    let txt = (/pistart|delimt/gi.test(node.className)) ? (node.getAttribute('data-pistart')) : node.innerText;
                    if (!node.querySelector(".pistart") && /term|def/gi.test(node.className)) {
                        txt = txt + (/term/gi.test(node.className) ? ": " : "; ");
                    }
                    return accumulator + txt;
                }, prefix);
                // ? Append old Content
                $(NodeGroupClone.lastElementChild).after(self.TC_Template());
                if (oldStructure) $(NodeGroupClone).find("#" + TC_OLD_CLASS).html('').append(oldStructure);
            }
            const time = moment().format(),
                AG_GROUP = AuthorGroupNewModule, //? Get Shown tracking common Methods.
                temp_name = AG_GROUP.tempName(node), //? Get Template items.
                time_string = AG_GROUP.Get_Template('time', {
                    r_time: time,
                    m_time: time
                }),
                IsMove = [RIGHT_MOVE, LEFT_MOVE, DOWN, UP].includes(action) ? true : false, //Included UP,DOWN in TC - 28/5/24-RJ 
                IsPlaceHolder = AG_GROUP.place_holder[node.dataset.name].includes(temp_name) || null;
            let template_msg = ALERT_MESSAGE['tc_new_msg'][IsMove ? 'move' : action][self.KEY];
            if (typeof template_msg != 'string') template_msg = template_msg[IsPlaceHolder ? 'pl_hold' : 'text'];
            const mus_msg = Mustache.render(template_msg, {
                    action: action,
                    name: temp_name,
                    timestamp: time_string
                }),
                li = AG_GROUP.Get_Template('li', {
                    frag: true,
                    id: node.id,
                    action: action,
                    area: self.KEY
                });
            // ? append tc msg inside fragment
            li.firstChild.append(document.createRange().createContextualFragment(mus_msg));
            // ? finally append into  group
            $(NodeGroupClone).find("#" + TC_UL_ID).append(li);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('TC_MSG', err.message);
        }
    },
    get_frag: function(String) {
        try {
            return document.createRange().createContextualFragment(String);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('get_frag', err.message);
        }
    },
    GET_ASCENT: function() {
        try {
            //code goes here
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_ASCENT', err.message);
        }
    },
    FIRE: function(action, self, selector) {
        self = this;
        selector = this.selector;
        AutoSaveBool = false;
        GlobalEditor.updateElement();
        var actionNode = GlobalEditor.getSelection().getStartElement();
        if (!actionNode) return;
        actionNode = GetParentNde(actionNode);
        if (!actionNode.hasClass(self.KEY_CLASS ? self.KEY_CLASS : self.KEY))
            if (!actionNode.hasClass(selector.ROOT)) {
                actionNode = actionNode.getAscendant(function(el) {
                    if (el && typeof el.hasAttribute == "function" && el.hasAttribute("class")) {
                        return el.getAttribute("class").includes(self.KEY_CLASS ? self.KEY_CLASS : self.KEY);
                    }
                });
            }
        //?  Parent of root element 
        var divGroup = actionNode.getParent().$,
            divGroupClone = divGroup.cloneNode(true);
        divGroupClone = this.pre_callback(divGroupClone);
        var cur_ind = commonMethods.Get_Index(divGroupClone.children, actionNode.$),
            curNode = divGroupClone.children[cur_ind], // ? Current Node
            NxtNode = curNode.nextElementSibling, // ? Next Node
            PrvsNode = curNode.previousElementSibling, // ? Previous Node
            LastElm = divGroupClone.lastElementChild, // ? Last index find or not
            IsLastElmIsKey = LastElm.classList.contains(self.KEY_CLASS ? self.KEY_CLASS : self.KEY), // ? Last Element Key For Insert PI information.
            IsNewKey = curNode.hasAttribute('data-new');

        action = action.toUpperCase();

        if (action == "DELETE") {
            // ? delete node
            if (IsNewKey) curNode.remove();
            else {
                curNode.setAttribute('data-delete', '');
                window._trackManager.getDelNode(curNode, {
                    childOnly: true
                });
            }
        } else if (action == "ADD") {
            divGroupClone.lastElementChild[IsLastElmIsKey ? 'after' : 'before'](this.newItem());
            actionNode = [].slice.call(divGroupClone.querySelectorAll(selector.ROOT)).pop();
            //? Get Inserted Item.
        } else if (/up|down|right|left/gi.test(action)) {
            let IsDown = /down|right/gi.test(action) ? !0 : !1;
            //$(curNode)[IsDown ? 'insertAfter' : 'insertBefore']((IsDown) ? NxtNode : PrvsNode);
            ((IsDown) ? NxtNode : PrvsNode)[IsDown ? 'after' : 'before'](curNode);
        }
        divGroupClone = this.post_callback(divGroupClone);
        this.TC_MSG(action, actionNode, divGroup, divGroupClone, IsNewKey);
        divGroup.replaceWith(divGroupClone);
        Array.from(GlobalEditor.document.find('.active').$).forEach(el => {
            el.classList.remove('active');
        });
        var sel = GlobalEditor.getSelection(),
            rng = GlobalEditor.createRange();
        if (action == "ADD" && !!actionNode.id) {
            actionNode = GlobalEditor.document.getById(actionNode.id);
            if (selector.active) {
                let temp = actionNode.findOne(selector.active);
                if (temp) actionNode = temp;
            }
        }
        if (["ADD", "DELETE"].includes(action)) {
            IMPACT_SELECTION._SNAPSHOT({
                lock: true
            });
            rng.setStartAt(actionNode, action == "ADD" ? CKEDITOR.POSITION_BEFORE_START : CKEDITOR.POSITION_BEFORE_END);
            rng.setEndAt(actionNode, CKEDITOR.POSITION_BEFORE_END);
            sel.selectRanges([rng]);
            actionNode.scrollIntoView(true);
            GlobalEditor.focus();
            IMPACT_SELECTION._SNAPSHOT({
                unlock: true
            });
        }
        AutoSaveBool = true;
    },
    Init: function(self) {
        self = this;
        try {
            debug.log("PlaceHolder_Module_Init");
            self.Template_List = Array.from(new Set(
                (self.templateAliases || []).concat(Object.values(self.templates).filter(Boolean))
            ));
            self.initiated = true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('PlaceHolder_Module_Init', err.message);
        }
    },
    pre_callback: function(divGroup) {
        try {
            return divGroup;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('pre_callback', err.message);
            return divGroup;
        }
    },
    post_callback: function(divGroup) {
        try {
            return divGroup;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('post_callback', err.message);
            return divGroup;
        }
    },
    _getOriginalTemplateRoot: function() {
        try {
            if (this.originalCache) {
                return this.originalCache;
            }

            var restoreModule =
                (window.queryModule && window.queryModule.restoreModule) ||
                window.queryRestore ||
                window.queryRestoreManager;

            this.originalCache = restoreModule &&
                restoreModule.contexts &&
                restoreModule.contexts.original &&
                restoreModule.contexts.original.domCache ?
                restoreModule.contexts.original.domCache :
                null;

            return this.originalCache;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_getOriginalTemplateRoot', err.message);
            return null;
        }
    },
    _cloneDelimiterState: function(state) {
        try {
            return state ? JSON.parse(JSON.stringify(state)) : null;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_cloneDelimiterState', err.message);
            return null;
        }
    },
    _buildTemplateDelimiterState: function(originalRoot) {
        try {
            if (!originalRoot) return null;

            return {
                keyword: this._collectKeywordDelimiterSnapshots(originalRoot),
                abbreviation: this._collectAbbreviationDelimiterSnapshots(originalRoot)
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_buildTemplateDelimiterState', err.message);
            return null;
        }
    },
    captureInitialTemplateDelimiterState: function(originalRoot) {
        try {
            originalRoot = originalRoot || this._getOriginalTemplateRoot();
            this.originalCache = originalRoot || this.originalCache;
            this.templateDelimiterState = this._buildTemplateDelimiterState(originalRoot);
            return this._cloneDelimiterState(this.templateDelimiterState);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('captureInitialTemplateDelimiterState', err.message);
            return null;
        }
    },
    getTemplateDelimiterState: function() {
        try {
            if (!this.templateDelimiterState) {
                this.captureInitialTemplateDelimiterState();
            }

            return this._cloneDelimiterState(this.templateDelimiterState);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getTemplateDelimiterState', err.message);
            return null;
        }
    },
    _readPiValue: function(node) {
        try {
            if (!node) return "";

            var attrValue = (node.getAttribute && node.getAttribute('data-pistart')) || "";
            if (attrValue) return attrValue;

            var piNode = node.querySelector && node.querySelector('.pistart');
            if (piNode && piNode.getAttribute) {
                return piNode.getAttribute('data-pistart') || "";
            }

            return "";
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_readPiValue', err.message);
            return "";
        }
    },
    _createPiNode: function(className, value) {
        try {
            return $('<span>', {
                'class': className,
                'data-name': className,
                'contenteditable': 'false',
                'data-pi': 'PI',
                'data-pistart': value || ""
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_createPiNode', err.message);
            return $('<span>');
        }
    },
    _getDirectChildrenByClass: function(root, className) {
        try {
            if (!root || !root.children) return [];
            return Array.from(root.children).filter(function(child) {
                return child &&
                    child.nodeType === 1 &&
                    child.classList &&
                    child.classList.contains(className);
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_getDirectChildrenByClass', err.message);
            return [];
        }
    },
    _collectKeywordDelimiterSnapshots: function(originalRoot) {
        try {
            if (!originalRoot) return [];

            return Array.from(originalRoot.querySelectorAll('.kwd-group')).map(function(group) {
                var keywordItems = Array.from(group.children).filter(function(child) {
                    return child &&
                        child.nodeType === 1 &&
                        child.classList &&
                        child.classList.contains('kwd') &&
                        !child.hasAttribute('data-delete');
                });

                var between = [];
                var last = "";

                keywordItems.forEach(function(item, index) {
                    var nextNode = item.nextElementSibling;
                    var delimValue = "";

                    while (nextNode && nextNode.classList && /TrackChangesList/gi.test(nextNode.className)) {
                        nextNode = nextNode.nextElementSibling;
                    }

                    if (nextNode && nextNode.classList && nextNode.classList.contains('delimt')) {
                        delimValue = PlaceHolder_Module._readPiValue(nextNode);
                    }

                    if (!delimValue) {
                        delimValue = PlaceHolder_Module._readPiValue(item);
                    }

                    if (index === keywordItems.length - 1) {
                        last = delimValue || last;
                    } else {
                        between.push(delimValue || "");
                    }
                });

                return {
                    between: between,
                    last: last
                };
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_collectKeywordDelimiterSnapshots', err.message);
            return [];
        }
    },
    _collectAbbreviationDelimiterSnapshots: function(originalRoot) {
        try {
            if (!originalRoot) return [];

            var groups = Array.from(originalRoot.querySelectorAll('.def-list'));
            if (groups.length === 0 && originalRoot.querySelector('.def-item')) {
                groups = [originalRoot];
            }

            return groups.map(function(group) {
                var items = PlaceHolder_Module._getDirectChildrenByClass(group, 'def-item');
                if (items.length === 0 && group === originalRoot) {
                    items = Array.from(group.querySelectorAll('.def-item'));
                }

                var profiles = items
                    .filter(function(item) {
                        return item && !item.hasAttribute('data-delete');
                    })
                    .map(function(item) {
                        var termNode = item.querySelector('.term');
                        var defNode = item.querySelector('.def');
                        return {
                            termPI: PlaceHolder_Module._readPiValue(termNode),
                            defPI: PlaceHolder_Module._readPiValue(defNode)
                        };
                    });

                var nonEmptyDefValues = profiles
                    .map(function(item) {
                        return item.defPI || "";
                    })
                    .filter(Boolean);

                return {
                    profiles: profiles,
                    fallbackTermPI: (profiles[0] && profiles[0].termPI) || "",
                    fallbackBetweenDefPI: nonEmptyDefValues[0] || "",
                    lastDefPI: nonEmptyDefValues.length > 0 ? nonEmptyDefValues[nonEmptyDefValues.length - 1] : ""
                };
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_collectAbbreviationDelimiterSnapshots', err.message);
            return [];
        }
    },
    _normalizeKeywordPiToAttributes: function($root) {
        try {
            if (!$root || !$root.find) return;

            $root.find('.kwd-group .kwd').each(function() {
                var $item = $(this);
                var piValue = $item.attr('data-pistart') || $item.children('.pistart').first().attr('data-pistart') || "";

                if (piValue) {
                    $item.attr('data-pistart', piValue);
                } else {
                    $item.removeAttr('data-pistart');
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_normalizeKeywordPiToAttributes', err.message);
        }
    },
    _applyKeywordDelimiterSnapshots: function($root, snapshots) {
        try {
            if (!$root || !snapshots || snapshots.length === 0) return;

            $root.find('.kwd-group').each(function(groupIndex) {
                var snapshot = snapshots[groupIndex] || snapshots[snapshots.length - 1];
                if (!snapshot) return;

                var $group = $(this);
                var $keywordItems = $group.children('.kwd').filter(function() {
                    return !this.hasAttribute('data-delete');
                });

                if ($keywordItems.length === 0) return;

                $group.children('.delimt').remove();
                $keywordItems.each(function() {
                    $(this).children('.pistart').remove();
                });

                var fallbackBetween = snapshot.between.filter(Boolean).slice(-1)[0] ||
                    (window.Keyword_Module && typeof window.Keyword_Module.get_Delim === 'function' ? window.Keyword_Module.get_Delim() : "");
                var lastValue = snapshot.last || "";

                $keywordItems.each(function(index) {
                    var isLast = index === $keywordItems.length - 1;
                    var value = isLast ? lastValue : (snapshot.between[index] || fallbackBetween || "");

                    if (!value) return;

                    $(this).attr('data-pistart', value);
                    $(this).append(PlaceHolder_Module._createPiNode('pistart', value));
                    $(this).after(PlaceHolder_Module._createPiNode('delimt', value));
                });

                $keywordItems.filter(function() {
                    return !$(this).children('.pistart').length;
                }).removeAttr('data-pistart');
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_applyKeywordDelimiterSnapshots', err.message);
        }
    },
    _applyAbbreviationDelimiterSnapshots: function($root, snapshots) {
        try {
            if (!$root || !snapshots || snapshots.length === 0) return;

            var currentGroups = $root.find('.def-list').toArray();
            if (currentGroups.length === 0 && $root.find('.def-item').length > 0) {
                currentGroups = [$root[0]];
            }

            currentGroups.forEach(function(group, groupIndex) {
                var snapshot = snapshots[groupIndex] || snapshots[snapshots.length - 1];
                if (!snapshot) return;

                var $group = $(group);
                var $items = (group === $root[0] ? $group.find('.def-item') : $group.children('.def-item')).filter(function() {
                    return !this.hasAttribute('data-delete');
                });

                if ($items.length === 0) return;

                var profiles = snapshot.profiles || [];
                var fallbackTermPI = snapshot.fallbackTermPI || "";
                var fallbackBetweenDefPI = snapshot.fallbackBetweenDefPI || snapshot.lastDefPI || "";
                var lastDefPI = snapshot.lastDefPI || fallbackBetweenDefPI;

                $items.each(function(index) {
                    var isLast = index === $items.length - 1;
                    var profile = profiles[index] || profiles[profiles.length - 1] || {};
                    var termPI = profile.termPI || fallbackTermPI || "";
                    var defPI = isLast ?
                        (lastDefPI || profile.defPI || fallbackBetweenDefPI || "") :
                        (profile.defPI || fallbackBetweenDefPI || lastDefPI || "");

                    var $term = $(this).children('.term').first();
                    var $def = $(this).children('.def').first();

                    if ($term.length) {
                        if (termPI) $term.attr('data-pistart', termPI);
                        else $term.removeAttr('data-pistart');
                    }

                    if ($def.length) {
                        if (defPI) $def.attr('data-pistart', defPI);
                        else $def.removeAttr('data-pistart');
                    }
                });
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('_applyAbbreviationDelimiterSnapshots', err.message);
        }
    },
    prepareTemplateDataForGetData: function(dataValue) {
        try {
            if (!dataValue || typeof dataValue !== 'string') return dataValue;

            var $root = $('<div>').html(dataValue);
            var templateDelimiterState = this.getTemplateDelimiterState();

            this._normalizeKeywordPiToAttributes($root);

            if (templateDelimiterState) {
                this._applyKeywordDelimiterSnapshots($root, templateDelimiterState.keyword);
                this._applyAbbreviationDelimiterSnapshots($root, templateDelimiterState.abbreviation);
            }

            dataValue = $root.html();

            if (window.Abbreviation_Module && typeof window.Abbreviation_Module.revertPiStartForGetData === 'function') {
                dataValue = window.Abbreviation_Module.revertPiStartForGetData(dataValue);
            }

            return dataValue;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('prepareTemplateDataForGetData', err.message);
            return dataValue;
        }
    },
    Invoke: function(module, self) {
        self = this;
        try {
            if (!self.initiated) self.Init();
            if (typeof PlaceHolder_Module != "undefined") {
                ['TC_MSG', 'TC_Template', 'get_frag', 'FIRE', 'post_callback', 'pre_callback'].forEach(fn => {
                    if (PlaceHolder_Module[fn] && typeof module[fn] == "undefined") {
                        module[fn] = PlaceHolder_Module[fn];
                    }
                });
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Invoke', err.message);
        }
    },
    CHECK_PASTE_SELECTION: function(eRange, self, IMS) {
        IMS = IMPACT_SELECTION;
        self = PlaceHolder_Module;
        if (!self.initiated) self.Init();
        try {
            let sText = (IMS.SEL_TEXT || "").replace(/\n+/g, "");
            let sElm = IMS.NODE;
            if (!sElm || !sText) return false;

            let IsTempElm = self.Template_List.includes(sText);
            let range = GlobalEditor.createRange();

            if (IsTempElm && sElm && sElm.$.classList.contains("alt-text")) {
                sElm.setText("");
                range.setStartAt(sElm, CKEDITOR.POSITION_AFTER_START);
                GlobalEditor.getSelection().selectRanges([range]);
                return true;
            } else {
                return false;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CHECK_PASTE_SELECTION', err.message);
            return false;
        }
    }
});

var PlaceHolder_Module = new PlaceHolderModule();




class PlaceHolderModuleNew {
    constructor(options) {
        this.options = options || {};
        this.originalCache = null;
        this.templateDelimiterState = null;
        this._editorEventsBound = false;
        this.errorTracker = new EnhancedErrorTracker();
        this.moduleName = 'PlaceHolderModuleNew ';
        this.initializeValues(this.options);
        this.bindEditorEvents();
    }

    initializeValues(options) {
        options = options || {};
        this.initiated = false;
        this.defaultRegex = /Insert|Here/gi;
        this.alertOneRegex = /keyword|SurName|GivenName|Term|Definition/gi;
        this.RESTRICT_CLASS = ['kwd', 'term', 'def', 'definition'];
        this.templateAliases = ['GivenName SurName', 'SurName GivenName', 'Degree'];
        this.templates = {
            'kwd': 'keyword',
            'surname': 'SurName',
            'given-names': 'GivenName',
            'alt-text': 'To aid accessibility, please provide an alt-text description of your figure here.',
            'term': 'Term',
            'def': 'Definition',
            'corresp': "Type_Here",
            "fund": 'Insert funding details here'
        };
        this.rules = {
            kwd: {
                label: 'keywords',
                cmd: 'KEYWORDS_DELETE'
            },
            def: {
                label: 'Abbreviations',
                cmd: 'ABBREVIATIONS_DELETE'
            },
            term: {
                label: 'Abbreviations',
                cmd: 'ABBREVIATIONS_DELETE'
            }
        };
        this.selector = Object.assign({
            tc: '.TrackChangesList',
            prefix: ' : ',
            text_find: '',
            pl_find: "",
            pl_class: "",
            delim_class: '',
            delim_find: '',
            root_class: "",
            root_find: "",
            TC_OLD_CLASS: '',
            TC_ROOT_ID: "",
            TC_INNER_ID: "",
            TC_UL_ID: ""
        }, options.selector || {});




        this.isKwd = options.isKwd || false;
        this.isAbbr = options.isAbbr || false;
        this.isAbs = options.isAbs || false;

        this.config = Object.assign({}, options.config || {}, {
            xmlEndPeriod: "",
            xmlSeparator: "",
            xmlLastBefore: ""
        });

        this.captruredDelimiterState = false;

        this.html_TC = this.buildHtmlTC();


        this.Template_List = [];
        this.group_selector = options.group_selector || ".contrib-group, .kwd-group, .author-notes, .fig, .name, .def-item, .def-list";
        this.node_selector = options.node_selector || ".kwd, .corresp, .fn, .given-names, .surname, .degrees, .alt-text, .term, .def, .p";


        this.waitForInitialLoadDialog(() => {
            this.Init();
        }, this);
    }



    buildHtmlTC() {
        const s = this.selector;
        if (s.TC_ROOT_ID && s.TC_INNER_ID && s.TC_OLD_CLASS && s.TC_UL_ID) {
            return $(`<div id='${s.TC_ROOT_ID}' class='TrackChangesList'><span class='tc'>[TC]</span><div id='${s.TC_INNER_ID}' class='pop_up'><div id='${s.TC_OLD_CLASS}' class='oldStructure'></div><ul id='${s.TC_UL_ID}'></ul></div></div>`);
        }
        // fallback for incomplete selector
        return $('<div class="TrackChangesList"></div>');
    }
    bindEditorEvents() {
        var self = this;
        if (self._editorEventsBound) return;
        self._editorEventsBound = true;

    }
    Init(self) {
        self = this;
        try {
            self.Template_List = Array.from(new Set(
                (self.templateAliases || []).concat(Object.values(self.templates).filter(Boolean))
            ));
            self.initiated = true;
            self.migratePi2Attributes();

            if (this.isKwd) {
                let temp_endPeriod = (typeof SHORT_TITLE !== 'undefined' && SHORT_TITLE) ? GET_TYPE_CONFIG_QUERY('keywords', 'endperiod') : "false";
                (temp_endPeriod == "false" || temp_endPeriod === "") && (temp_endPeriod = false);

                self.config.separator = (typeof SHORT_TITLE !== 'undefined' && SHORT_TITLE) ? GET_TYPE_CONFIG_QUERY('keywords', 'seperator') : ', ';
                self.config.endPeriod = temp_endPeriod;
            } else if (this.isAbbr) {

            }
            self.captureInitialTemplateDelimiterState();
        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'Init', err.message);
        }
    }
    getNewSpanWithAttributes(tag, type, piText) {
        try {
            var span = commonMethods.setAttr(tag, {
                "class": type,
                "data-name": type,
                "contenteditable": "false",
                "data-pi": "PI",
                "data-pistart": piText
            });
            return span;
        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'getNewSpanWithAttributes', err.message);
        }

    }
    insertVisualDelimiter(item, piText, type = 'delimt') {
        try {
            var newSpan = this.getNewSpanWithAttributes("span", type, piText);
            if (type == "delimt") item.insertAdjacentElement('afterend', newSpan);
            else if (type == "pistart") item.appendChild(newSpan);
        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'InsertVisualDelimiter', err.message);
        }
    }

    migratePi2Attributes(editor) {
        try {
            if (!editor || !editor.document || !editor.document.$) return setTimeout(() => this.migratePi2Attributes(editor), 1500);


            const root = editor.document.$;
            const self = this;
            root.querySelectorAll(self.group_selector).forEach((_parent) => {

                var listOfItems = _parent.querySelectorAll(self.node_selector);
                var {
                    last,
                    first
                } = self.getLastItemOfArray(listOfItems);


                Array.from(listOfItems).forEach((item) => {
                    const piNodes = item.querySelectorAll('.pistart');

                    if (!piNodes.length) return;

                    let piText = item.getAttribute('data-pistart') || '';
                    piNodes.forEach((piNode) => {
                        if (!piText && piNode.hasAttribute('data-pistart')) {
                            piText = piNode.getAttribute('data-pistart') || '';
                        }
                        piNode.remove();
                    });

                    const nextSibling = item.nextElementSibling;
                    if (nextSibling) {
                        var isVisualDelimt = nextSibling.classList.contains('delimt');
                        if (isVisualDelimt) {
                            if (nextSibling.hasAttribute('data-pistart')) {
                                let piText1 = nextSibling.getAttribute('data-pistart');
                                if (piText1 !== piText) {
                                    this.errorTracker.logError(this.moduleName, 'migratePi2Attributes', `Mismatched PI text: ${piText1} !== ${piText}`);
                                }
                            }
                        } else if (piText) {
                            self.insertVisualDelimiter(item, piText, 'delimt');
                        }
                    }
                    if (piText) {
                        item.setAttribute('data-pistart', piText);
                    }
                });
            });
            this.PiStartMigrated = true;

        } catch (err) {
            this.errorTracker.logError(this.moduleName, 'migratePi2Attributes', err);
        }
    }
    captureInitialTemplateDelimiterState(self) {
        self = this;
        try {
            var OrignalVal = setInterval(() => {
                if (window.queryRestore && queryRestore.contexts && queryRestore.contexts.original && queryRestore.contexts.original.domCache) {
                    var orgDom = queryRestore.contexts.original.domCache;
                    var group = orgDom.querySelector(self.group_selector);

                    var listItems = group.querySelectorAll(self.node_selector);
                    if (listItems.length == 0) return debug.warn("No template nodes found in original DOM cache for delimiter state capture.");

                    var {
                        last,
                        first,
                        lastBefore
                    } = self.getLastItemOfArray(listItems);


                    self.config.xmlSeparator = first ? first.getAttribute('data-pistart') || "" : "";
                    self.config.xmlEndPeriod = last ? last.getAttribute('data-pistart') || "" : "";
                    self.config.xmlLastBefore = lastBefore ? lastBefore.getAttribute('data-pistart') || "" : "";


                    self.captruredDelimiterState = true;
                    clearInterval(OrignalVal);
                }
            }, 1500);

        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'captureInitialTemplateDelimiterState', err.message);
            return null;
        }
    }
    getLastItemOfArray(array) {
        try {
            const filteredArr = Array.from(array).filter(el => !el.hasAttribute('data-delete') && !el.hasAttribute('data-remove'));
            const firstItem = filteredArr[0] || null;
            const lastItem = filteredArr[filteredArr.length - 1] || null;
            const lastBeforeItem = filteredArr.length > 1 ? filteredArr[filteredArr.length - 2] : null;

            return {
                first: firstItem,
                last: lastItem,
                lastBefore: lastBeforeItem
            };
        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'getLastItemOfArray', err.message);
            return {
                first: null,
                last: null,
                lastBefore: null
            };
        }
    }
    revertPiStartForGetData(dataValue) {
        try {
            if (!dataValue || typeof dataValue !== 'string') return dataValue;
            const self = this;
            var $root = $('<div>').html(dataValue);
            const {
                xmlSeparator,
                xmlEndPeriod,
                separator,
                endPeriod
            } = self.config;


            $root.find(self.group_selector).each(function() {
                var $item = $(this);
                var listItems = $item.find(self.node_selector).toArray();
                var {
                    last,
                    first
                } = self.getLastItemOfArray(listItems);

                Array.from(listItems).forEach((el, idx, arr) => {
                    var piEl = el.querySelector('.pistart');
                    if (el.hasAttribute('data-delete')) {
                        if (piEl) piEl.remove();
                        return;
                    }
                    var piText = el.getAttribute('data-pistart') || separator || '';
                    if (last === el) {
                        piText = endPeriod || "";
                    }
                    if (piText) self.insertVisualDelimiter(el, piText, 'pistart');
                });
            });

            return $root.html();
        } catch (err) {
            this.errorTracker.logError(this.moduleName, 'revertPiStartForGetData', err);
            return dataValue;
        }
    }


    REMOVE_DEL(count = 0, self) {
        self = this;
        try {
            PlaceHolderModule.runPlaceholderRemoveDel(self, count);
        } catch (err) {
            console.warn(err.message);
            this.errorTracker.logError(this.moduleName, 'REMOVE_DEL', err.message);
        }
    }
    FIRE_CLICK(clickElm, ev, self, IMS) {
        IMS = IMPACT_SELECTION, self = this;
        if (!self.initiated) self.Init();
        try {
            PlaceHolderModule.runPlaceholderClick(clickElm, self, IMS);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_CLICK', err.message);
        }
    }
    FIRE_KEYUP(CharCode, evt, Options = {}, self, IMS) {
        IMS = IMPACT_SELECTION, self = this;
        if (!self.initiated) self.Init();
        try {
            return PlaceHolderModule.runPlaceholderKeyup(evt, Options, self, self.FIRE_CLICK.bind(self), self.REMOVE_DEL.bind(self));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_KEYUP', err.message);
            evt.cancel();
            return false;
        }
    }
    TC_Template(self) {
        self = this;
        let {
            TC_ROOT_ID,
            TC_OLD_CLASS,
            TC_INNER_ID,
            TC_UL_ID
        } = self.selector;
        try {
            return PlaceHolderModule.buildPlaceholderTrackChangesTemplate(self.selector);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('TC_Template', err.message);
        }
    }
    TC_MSG(action, node, nodeGroup, NodeGroupClone, IsNew, self, selector) {
        debug.log("===TC_MSG===");
        self = this;
        selector = this.selector;
        let {
            TC_ROOT_ID,
            TC_OLD_CLASS,
            TC_INNER_ID,
            TC_UL_ID,
            prefix
        } = self.selector;
        try {
            PlaceHolderModule.runPlaceholderTrackChangesMessage(action, node, nodeGroup, NodeGroupClone, IsNew, self, () => self.TC_Template());
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('TC_MSG', err.message);
        }
    }
    FIRE_CMD(cmd, node, self) {
        self = this;
        try {
            if (cmd && node) {
                const command = self.rules[cmd] ? self.rules[cmd].cmd : null;
                if (command) {
                    GlobalEditor.execCommand(command, {
                        node
                    });
                }
            }
        } catch (err) {}
    }
    waitForInitialLoadDialog(callback, self) {
        self = this;
        let retry = 0;
        const maxRetry = 20;

        const interval = setInterval(function() {
            try {
                if (
                    window.InitialLoadDialog &&
                    typeof window.InitialLoadDialog.FullyLoaded === "boolean" &&
                    window.InitialLoadDialog.FullyLoaded === true
                ) {
                    clearInterval(interval);
                    callback();
                    return;
                }

                retry++;
                if (retry >= maxRetry) {
                    clearInterval(interval);
                    console.warn("InitialLoadDialog not ready after retries");
                }

            } catch (err) {
                console.warn(err.message);
                clearInterval(interval);
            }

        }, 600);
    }


    static clearPlaceholderActiveState() {
        Array.from(GlobalEditor.document.find('.active, .highlightAff').$).forEach(el => {
            el.classList.remove('active', 'highlightAff');
        });
    }
    static shouldOpenPlaceholderPopup(clickElm) {
        return clickElm && clickElm.$ &&
            (clickElm.$.closest('.contrib-group') || clickElm.$.closest('.TrackChangesList'));
    }
    static getLastPiClickTarget(clickElm) {
        const nextSource = clickElm && typeof clickElm.getNextSourceNode === 'function' ? clickElm.getNextSourceNode() : null;
        const firstLevel = nextSource && typeof nextSource.getFirst === 'function' ? nextSource.getFirst() : null;
        return firstLevel && typeof firstLevel.getFirst === 'function' ? firstLevel.getFirst() : null;
    }
    static resolvePlaceholderClickElement(clickElm, context, ims) {
        if (!clickElm || !clickElm.$) return null;
        if (clickElm.$.closest(context.node_selector) == null && /impactdeltag/gi.test(ims.NODE_CLAS)) {
            clickElm = ims.NODE;
        }
        if (!clickElm || !clickElm.$ || !clickElm.$.closest(context.node_selector)) return clickElm;
        clickElm.$.normalize();
        const next = typeof clickElm.getNext === 'function' ? clickElm.getNext() : null;
        const isPiElement = /delimt|pistart/gi.test(clickElm.$.className);
        if (typeof clickElm.hasAttribute === 'function' && clickElm.hasAttribute("lastpi")) {
            const tempElm = PlaceHolderModule.getLastPiClickTarget(clickElm);
            if (tempElm && typeof tempElm.hasClass === 'function' && tempElm.hasClass("given-names")) {
                return tempElm;
            }
            return clickElm;
        }
        if (isPiElement && next) {
            if (typeof next.hasClass === 'function' && next.hasClass('kwd')) {
                return next;
            }
            if (next.$ && /TrackChangesList/gi.test(next.$.className) && typeof clickElm.getPreviousSourceNode === 'function') {
                return clickElm.getPreviousSourceNode();
            }
        }
        return clickElm;
    }
    static selectPlaceholderTemplateText(clickElm, context, ims) {
        if (!clickElm || !clickElm.$) return;
        const parentNode = clickElm.$.closest(context.node_selector);
        if (!parentNode) return;
        if (ims.PARENT && typeof ims.PARENT.find === 'function') {
            $(ims.PARENT.find("[data-cke-bookmark]").$).remove();
        }
        Array.from(parentNode.childNodes).forEach((node) => {
            const isNewElm = context.Template_List.includes(node.nodeValue) || context.Template_List.includes(clickElm.getText());
            if ((node.nodeType == Node.TEXT_NODE) && node.parentElement.tagName != 'INSERT' && isNewElm) {
                const sel = GlobalEditor.getSelection();
                const rng = GlobalEditor.createRange();
                const first = clickElm.getFirst();
                if (first) {
                    rng.setStart(clickElm, 0);
                    rng.setEnd(first, first.getLength());
                    sel.selectRanges([rng]);
                    debug.log("selected");
                }
            }
        });
    }
    static resolvePlaceholderActiveElement(clickElm, context) {
        if (!clickElm || !clickElm.$) return null;
        const tempGroup = clickElm.$.closest(context.group_selector);
        let tempElm = clickElm.$.closest(context.node_selector);
        if (!tempElm) return null;
        if (/delimt/gi.test(tempElm.className) && tempElm.nextElementSibling && tempElm.nextElementSibling.hasAttribute('data-name')) {
            tempElm = tempElm.nextElementSibling;
        }
        if (tempGroup && /fig/gi.test(tempGroup.className) && /p/gi.test(tempElm.className)) {
            return null;
        }
        return tempElm;
    }
    static runPlaceholderClick(clickElm, context, ims) {
        PlaceHolderModule.clearPlaceholderActiveState();
        if (PlaceHolderModule.shouldOpenPlaceholderPopup(clickElm)) {
            AuthorGroupNewModule.AuthorGroupClick(GlobalEditor);
            debug.log("==TC-Clicked===");
        }
        if (!clickElm || !clickElm.$ || !clickElm.$.closest(context.group_selector)) return;
        const resolvedClickElm = PlaceHolderModule.resolvePlaceholderClickElement(clickElm, context, ims);
        if (resolvedClickElm && resolvedClickElm.$ && resolvedClickElm.$.closest(context.node_selector)) {
            PlaceHolderModule.selectPlaceholderTemplateText(resolvedClickElm, context, ims);
        }
        const activeElm = PlaceHolderModule.resolvePlaceholderActiveElement(resolvedClickElm, context);
        if (activeElm) activeElm.classList.add('active');
    }
    static isPlaceholderEnterEvent(evt) {
        return !!(evt && evt.data && ((evt.data.$ && evt.data.$.keyCode == 13) || evt.data.keyCode == 13));
    }
    static runPlaceholderKeyup(evt, options, context, fireClickFn, removeDelFn) {
        const ims = IMPACT_SELECTION;
        const altGroupClosest = ims.NODE.$.closest(context.group_selector);
        const altNodeClosest = ims.NODE.$.closest(context.node_selector);
        if (!altNodeClosest) return;
        if (PlaceHolderModule.isPlaceholderEnterEvent(evt)) {
            if (ims.ISEndOfBlock && altGroupClosest && /def|def-item/gi.test(altGroupClosest.dataset.name)) {
                if (window.Abbreviation_Module && typeof window.Abbreviation_Module.FIRE === 'function') {
                    window.Abbreviation_Module.FIRE("ADD");
                } else if (typeof ErrorLogTrace === 'function') {
                    ErrorLogTrace('Abbreviation_Module.FIRE', 'unavailable');
                }
                debug.log('evt return');
            }
            if (altGroupClosest) {
                debug.log('evt return');
                evt.cancel();
                return false;
            }
        }
        if (options.IsArrowMovement || options.IsKeyMovement) {
            fireClickFn(ims.NODE, evt);
            removeDelFn();
        }
    }
    static runPlaceholderRemoveDel(context, count = 0) {
        let checkDelNode = GlobalEditor.document.find('.impactdeltag').$;
        if (checkDelNode.length != 0) {
            $(checkDelNode).find('del').remove();
        }
        if (count > 3) return;
        const loopCount = count + 1;
        setTimeout(() => {
            context.REMOVE_DEL(loopCount);
        }, 150);
    }
    static buildPlaceholderTrackChangesTemplate(selector) {
        const {
            TC_ROOT_ID,
            TC_OLD_CLASS,
            TC_INNER_ID,
            TC_UL_ID
        } = selector;
        return $(`<div id='${TC_ROOT_ID}' class='TrackChangesList'><span class='tc'>[TC]</span><div id='${TC_INNER_ID}' class='pop_up'><div id='${TC_OLD_CLASS}' class='oldStructure'></div><ul id='${TC_UL_ID}'></ul></div></div>`);
    }
    static buildPlaceholderOldStructure(nodeGroup, selector) {
        return Array.from(nodeGroup.querySelectorAll(selector.text_find)).reduce(function(accumulator, node) {
            let txt = (/pistart|delimt/gi.test(node.className)) ? node.getAttribute('data-pistart') : node.innerText;
            if (!node.querySelector(".pistart") && /term|def/gi.test(node.className)) {
                txt = txt + (/term/gi.test(node.className) ? ": " : "; ");
            }
            return accumulator + txt;
        }, selector.prefix);
    }
    static runPlaceholderTrackChangesMessage(action, node, nodeGroup, nodeGroupClone, isNew, context, templateFactory) {
        debug.log("===TC_MSG===");
        action = action.toLowerCase();
        isNew = action == ADD ? !isNew : isNew;
        node = (node.$ ? node.$ : (node[0] ? node[0] : node));
        if ($(nodeGroupClone).find(context.selector.tc).length == 0) {
            const oldStructure = PlaceHolderModule.buildPlaceholderOldStructure(nodeGroup, context.selector);
            $(nodeGroupClone.lastElementChild).after(templateFactory());
            if (oldStructure) $(nodeGroupClone).find("#" + context.selector.TC_OLD_CLASS).html('').append(oldStructure);
        }
        const time = moment().format();
        const AG_GROUP = AuthorGroupNewModule;
        const temp_name = AG_GROUP.tempName(node);
        const time_string = AG_GROUP.Get_Template('time', {
            r_time: time,
            m_time: time
        });
        const isMove = [RIGHT_MOVE, LEFT_MOVE, DOWN, UP].includes(action);
        const placeholdersByName = AG_GROUP.place_holder[node.dataset.name] || [];
        const isPlaceHolder = placeholdersByName.includes(temp_name) || null;
        let template_msg = ALERT_MESSAGE['tc_new_msg'][isMove ? 'move' : action][context.KEY];
        if (typeof template_msg != 'string') template_msg = template_msg[isPlaceHolder ? 'pl_hold' : 'text'];
        const mus_msg = Mustache.render(template_msg, {
            action: action,
            name: temp_name,
            timestamp: time_string
        });
        const li = AG_GROUP.Get_Template('li', {
            frag: true,
            id: node.id,
            action: action,
            area: context.KEY
        });
        li.firstChild.append(document.createRange().createContextualFragment(mus_msg));
        $(nodeGroupClone).find("#" + context.selector.TC_UL_ID).append(li);
    }
}



// KeywordModule and AbbreviationModule classes extending PlaceHolderModule
class keywordWithHolderModule extends PlaceHolderModule {
    constructor(options = {}) {
        super(Object.assign({
            isKwd: true,
            selector: {
                tc: '.TrackChangesList',
                prefix: 'Keywords : ',
                text_find: '.kwd, .delimt',
                pl_find: '.pistart',
                pl_class: 'pistart',
                delim_class: 'delimt',
                delim_find: '.delimt',
                ROOT: ".kwd",
                TC_OLD_CLASS: 'oldStructurekw',
                TC_ROOT_ID: "TrackChangesKW",
                TC_INNER_ID: "KWChanges",
                TC_UL_ID: "TrackChangesListKW",
            },


            contextmenu: "Keyword"

        }, options));



        this.KEY = 'kwd';
        this.html_TC = this.buildHtmlTC();
        this.SHOW_CONTEXT_GROUP = false;


        this.waitForInitialLoadDialog(() => {
            this.SHOW_CONTEXT_GROUP = IsContextMenu('Keyword');
        }, this);


        this.newItem = function() {
            try {
                return this.get_frag(`<span id=k${s4()} class="kwd impactdeltag" aria-label="KW" data-name="kwd" data-template="kwd" data-new>keyword</span>`);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('newItem-KWD', err.message);
            }
        };
    } // Add/override methods as needed
}

class abbreviationWithHolderModule extends PlaceHolderModule {
    constructor(options = {}) {
        super(Object.assign({
            isAbbr: true,
            selector: {
                tc: '.TrackChangesList',
                prefix: 'Abbreviations : ',
                text_find: '.term, .pistart, .def',
                active: ".term",
                ROOT: '.def-item',
                TC_OLD_CLASS: 'oldStructureabr',
                TC_ROOT_ID: "TrackChangesABR",
                TC_INNER_ID: "ABRChanges",
                TC_UL_ID: "TrackChangesListABR",
                piSelector: '.def .pistart, .term .pistart'
            }
        }, options));
        this.KEY = 'abbr';
        this.KEY_CLASS = 'def-item';
        this.html_TC = this.buildHtmlTC();
        this.newItem = function() {
            try {
                return this.get_frag(
                    '<div class="def-item impactdeltag" data-name="def-item" id="k' + s4() + '" data-new data-template="abr">' +
                    '<span class="term" data-name="term" data-new>Term</span>' +
                    '<div class="def" data-name="def" data-new>' +
                    '<div class="p" data-name="p">Definition</div>' +
                    '</div>' +
                    '</div>'
                );
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('newItem-ABR', err.message);
            }
        };
    }

}


const kwdConfig = {
    commands: [{
            name: 'KEYWORDS_ADD',
            label: "Add Keyword",
            icon: '../assets/images/svg/ContextMenu/Add.svg',
            command: 'KEYWORDS_ADD',
            group: 'KeywordsGroup',
            order: 91
        },
        {
            name: 'KEYWORDS_MOVE_BEFORE',
            label: "Move Left",
            icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
            command: 'KEYWORDS_MOVE_BEFORE',
            group: 'KeywordsGroup',
            order: 92
        },
        {
            name: 'KEYWORDS_MOVE_AFTER',
            label: "Move Right",
            icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
            command: 'KEYWORDS_MOVE_AFTER',
            group: 'KeywordsGroup',
            order: 93
        },
        {
            name: 'KEYWORDS_DELETE',
            label: "Delete Keyword",
            icon: '../assets/images/svg/ContextMenu/Delete.svg',
            command: 'KEYWORDS_DELETE',
            group: 'KeywordsGroup',
            order: 94
        }
    ],
    executeCommand: async function(editor, item, moduleConfig, params) {
        debug.log("kwd-executeCommand", item);

    },
    contextMenuHandler: function(element, selection, elementPath, editor) {

        debug.log("kwd-contextMenuHandler");
        // if (IS_LOCAL_HOST) debugger;

        const IMS = IMPACT_SELECTION;
        const IKEY = iKEY_EVENT_HANDLING;

        let MenuReturn = {};
        var MODULE = window.KeywordModule;

        if (MODULE && !MODULE.initiated) {
            MODULE.Init();
        } else {

            debug.warn("KeywordModule not fully loaded in contextMenuHandler");

            // return MenuReturn;
        }
        if (!MODULE.SHOW_CONTEXT_GROUP) {
            return MenuReturn;
        }


        let isKwd = IKEY.hasAnyClass(IMS.PARENTS_CLAS_LIST, ['kwd']);
        if (isKwd) {



        }



        return MenuReturn;
    }
};


document.addEventListener('DOMContentLoaded', () => {

    // window.KeywordFactoryModule = new keywordWithHolderModule();
    // window.AbbreviationFactoryModule = new abbreviationWithHolderModule();
    window.placeHolderModule = new PlaceHolderModule();

    if (IS_JOURNAL) {
        if (window.placeHolderModule && typeof window.placeHolderModule.waitForInitialLoadDialog === "function") {
            placeHolderModule.waitForInitialLoadDialog(() => {

                const intervalId = setInterval(async () => {

                    if (typeof moduleSystem !== "undefined") {

                        clearInterval(intervalId);

                        await moduleSystem.registerModule('KeywordModule', {
                            name: 'KeywordModule',
                            moduleClass: keywordWithHolderModule,
                            path: '',
                            type: 'lazy',
                            templatePath: '',
                            dependencies: [],
                            wrapping: true,


                            group_name: 'Keyword',
                            groupOrder: 75,
                            commands: kwdConfig.commands,
                            executeCommand: kwdConfig.executeCommand,
                            contextMenuHandler: kwdConfig.contextMenuHandler

                        });

                        // window.KeywordModule = await moduleRegistry.getModule("KeywordModule");

                    }
                }, 500);
            });
        }
    }

});