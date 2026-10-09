var [AFG, AG, DELETE_LINK] = ['AffiliationGroup', 'AuthorGroup', 'delete_link'];
const getConfig = (section, key) =>
    GET_TYPE_CONFIG_QUERY(section, key, {
        journalBased: true
    });
var AuthorGroupNewModule = {
    last_cursor_id: null,
    M_SCOPE: {
        LAB_CLONE_COPY: {},
        LAB_COLLECTION: {
            Alphabets: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
            ArabicNumber: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            FootNote_1: ['*', '†', '‡', '§', '‖', '¶', '#'],
            // ? †,‡,||,$,¶,**,††,‡‡,||||,$$,¶¶ - YA JANSCI - 01_JUN_2023 -- "*" IT WILL REMOVE AFTER AUTO GENERATION
            FootNote_2: ['*', '†', '‡', '‖', '$', '¶'],
            // ? *,†,‡,**,††,‡‡ ==> INTTEC - 07_JULY_23_YA
            FootNote_3: ['*', '†', '‡'],
            FootNote_4: ['*', '†', '‡', '§', '¶', '‖'],
            // ? Order: *,†,‡,||,$,¶,**,††,‡‡,||||,$$,¶¶ - YA JVCULT- 21_JUNNE-2023
            FootNote_5: ['*', '†', '‡', '‖', '§', '¶'],
            FootNote_6: ['*', '$', "†", "‡", "§", "¶", "‖"],
            CustomNote_1: [],
            CustomNote_2: ['*'],
            CustomNote_3: {
                current_address_prefix: '&#x00A4;',
                current_address: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
                contribution: ["☯", "‡"],
                membership: ["¶"],
                corresponding: ["*"],
                deceased: ["†"]
            },
        },
        IsAftercomma: false
    },
    Auto_ReNumber_AG_AFF: true,
    fragment: {},
    current_stack: {},
    template: {
        author: '',
        pi_string: '',
        aff: `<div class="aff highlightAff" data-name="aff" id="AF{{id}}" data-label="{{label}}" data-new="s">&#x00A0;</div>`,
        single_xref: `<a class="xref" data-name="xref" ref-type="aff" rid="AF0001"></a>`,
        xref_sup: `<a class="xref" data-name="xref" data-role="{{role}}" ref-type="{{type}}" rid="{{rid}}"><sup class="sup" data-name="sup">{{label}}</sup></a>`,
        sup: `<sup class="sup" data-name="sup">{{value}}</sup>`,
        corres: `<div class="corresp impactdeltag" data-name="corresp" id="c{{seq}}" data-new="s">type_here</div>`,
        fn: `<div class="fn" data-name="fn" id="fn-00{{seq}}" data-new="s" data-label="{{label}}"><div class="p impactdeltag" data-name="p" id="{{id}}">&#x00A0;</div></div>`,
        li: `<li data-id="{{id}}" data-action="{{action}}" data-view="0" data-time="{{time}}" data-username="{{user}}" data-area="{{area}}"></li>`,
        time: `<span class="time" data-time="{{m_time}}">{{r_time}}</span>`,
        "author-comment": '<span class="p" data-name="p" data-track-changes-ignore="ignore">{{{data}}}</span>',
        "prefix": '<span class="prefix" data-name="prefix" data-track-changes-ignore="ignore">{{data}}</span>',
        "suffix": '<span class="suffix" data-name="suffix" data-track-changes-ignore="ignore">{{data}}</span>',
        "name": '<span class="name" data-name="name" data-track-changes-ignore="ignore">{{data}}</span>',
        "degrees": '<span class="degrees" data-name="degrees" data-track-changes-ignore="ignore">{{data}}</span>'
    },
    place_holder: {
        "contrib": ['GivenName SurName', 'SurName GivenName'],
        "kwd": ['keyword'],
        // added for abbreviation TC pl_hldr - 16 Feb 2023 - RJ
        "def-item": ['termdefinition'],
        "aff": [" ", ""],
        "fn": [" ", ""],
        "p": [" ", ""],
        "all": ['GivenName SurName', 'SurName GivenName', 'keyword', 'Degree', 'GivenName', 'SurName']
    },
    html_TC: $("<div id='TrackChanges' class='TrackChangesList'><span class='tc'>[TC]</span></div><div id='AuthorAffTrackChanges' class='pop_up'><div id='oldStructure' class='oldStructure'></div> <ul id='TrackChangesList'></ul></div>"),
    Initiated: false,
    Aff_Types: {
        "aff": "AffLink",
        "fn": "NoteLink",
        "corres": "CorrLink"
    },
    validation_selector: ".article-meta div.aff,.article-meta div.corresp, .article-meta div.fn",
    Qry_Find: '[data-class="ckcommentsfull"]',
    TC_CLICK_COUNT: {},
    template_Generator: function(name, _ = AuthorGroupNewModule) {
        try {
            var C_Obj = GET_CONFIG_ITEM("author-group", {
                CONVERT_JSON: true,
                attr: true,
                hex2string: true,
                children: false,
                fromTemplate: true
            });
            _.template['author'] = C_Obj.author;
            // ? 03_DEC_2022 - YA -
            _.template['pi_string'] = C_Obj[(_.M_SCOPE.IS_SINGLE_AFF ? 'with_xref' : 'with_o_xref')];
            // ? default fragments converted dom
            ['seperator', 'givenname_sep', 'altername_start', 'altername_end', 'surname_sep', 'last_sep', 'contrib_sep', 'cross_link_sep'].forEach((item) => {
                _.fragment[item] = _.Get_Template('pi_string', {
                    value: _.M_SCOPE[item],
                    frag: true,
                    dom: true
                });
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('AuthorGroup_init', err.message);
        }
    },
    Get_Template: function(name, parameters, _ = AuthorGroupNewModule) {
        try {
            parameters.ignore = (!parameters.ignore ? false : true);
            parameters.frag = (!parameters.frag ? false : true);
            parameters.alert_msg = (!parameters.alert_msg ? false : true);
            var string = (parameters.alert_msg ? name : _.template[name]);
            // ? set default parameters s4()
            if (name == 'author') {
                parameters.id1 = s4();
                parameters.id2 = s4();
                if (_.M_SCOPE) {
                    // ? HANDLE AUTHOR MODULE - 15-SEP || command IsDegrees for Handled in Author Form Dialog by DR_31-12-22
                    // if (_.M_SCOPE.IsDegrees) {
                    //     parameters.degree = _.template['degree'];
                    // }
                    if (!parameters.IsLastName) {
                        /* parameters['au_pi'] = _.Get_Template('pi_string', {
                            value: _.M_SCOPE.contrib_sep,
                            ignore: true
                        }); */
                        // ? 03_DEC_2022 - YA
                        parameters['au_pi'] = _.fragment.seperator.outerHTML;
                    }
                }
            }
            /* else if ('pi_string'==name&&!parameters.ignore){string =  pi_string;} */
            var output = Mustache.render(string, parameters);
            if (parameters.frag) {
                var frag = document.createRange().createContextualFragment(output);
                output = (parameters.dom ? frag.firstElementChild : frag);
            }
            return output;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('AuthorGroup_init', err.message);
        }
    },
    // ? 03_DEC_2022 - YA- HANDLE SINGLE ON ARTICLE_WISE
    Update_Configuration: function(_ = AuthorGroupNewModule) {
        try {
            var list = GlobalEditor.document.find(".aff");
            if (list) {
                let array = list.toArray();
                if (!this.M_SCOPE.IS_SINGLE_AFF && array.length == 1) {
                    if (!list.$[0].hasAttribute("data-label"))
                        this.M_SCOPE.IS_SINGLE_AFF = AuthorEditDialog['M_CONFIG'].SINGLE_AFF = true;
                } else if (array.length > 1) {
                    this.M_SCOPE.IS_SINGLE_AFF = AuthorEditDialog['M_CONFIG'].SINGLE_AFF = false;
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Update_Configuration', err.message);
        }
    },
    getAuthorGroupView: function(parent, _ = AuthorGroupNewModule) {
        try {
            var outString = '';
            $(parent).find('.contrib, .name').removeAttr('id');
            $.each($(parent).children('.contrib'), function(idx, valueOfElement) {
                $.each(valueOfElement.children, function(index, Element) {
                    if (["name-alternatives", "name", "pistart", "degrees", "name"].includes(Element.className)) {
                        outString += ((Element.className != "pistart") ? getTxt(Element) : Element.getAttribute('data-pistart'));
                        /* if (Element.className != "pistart") {
                            outString += getTxt(Element);
                        } else {
                            outString += Element.getAttribute('data-pistart');
                        } */
                    } else if (Element.className == 'xref') {
                        var temp = Element.querySelector('.pistart');
                        var delim = ((temp) ? temp.getAttribute('data-pistart') : '');
                        outString += '<sup>' + Element.innerText + delim + '</sup>';
                    }
                });
            });
            return outString;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getAuthorGroupView', err.message);
        }
    },
    queryHandle: function(node, type, _ = AuthorGroupNewModule) {
        try {
            let Find_Obj = {
                author: ".contrib",
                aff: ".aff",
            };
            Array.from(node.querySelectorAll(this.Qry_Find), (el) => {
                let parent = node.closest(Find_Obj[type]);
                var [next, prev] = [parent.nextElementSibling, parent.previousElementSibling];
                if (next && next.dataset.name == node.dataset.name) {
                    next.append(el);
                } else if (prev && prev.dataset.name == node.dataset.name) {
                    prev.append(el);
                } else {
                    parent.parentElement.append(el);
                }
                /*if (type == 'author') {
                    
                    
                }  else if (type == 'aff') {
                    var nxt = node.nextElementSibling;
                    var prev = node.previousElementSibling;
                    if (nxt && nxt.className == 'aff') {
                        nxt.append(el);
                    } else if (prev && prev.className == 'aff') {
                        prev.append(el);
                    } else {
                        node.parentElement.append(el);
                    }
                } */
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('queryHandle', err.message);
        }
    },
    tempName: function(node, Options = {}, _ = AuthorGroupNewModule) {
        try {
            node = (typeof node == 'string') ? (GlobalEditor.document.getById(node).$) : node;
            var cloneNode = node.cloneNode(true);
            cloneNode.querySelectorAll('del').forEach(e => e.parentNode.removeChild(e));
            // ? updated for kwd groups 
            let IsContrib = ((node.dataset.name == 'contrib' || node.closest(".contrib")) ? true : false);
            let IsAbbr = (node.dataset.name == 'def-item') ? true : false;
            let selector = IsContrib ? cloneNode.querySelectorAll('.name span.surname, .name span.given-names') : node.childNodes;
            var next = Array.from(selector, ({
                textContent
            }) => textContent.trim()).filter(Boolean).join((IsContrib || IsAbbr) ? ' ' : '');
            //Space given for Abbr in msg - 30/05/24 - RJ
            console.log('tempName', next);
            return next;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('tempName', err.message);
        }
    },
    checkAuthorLink: function(parent, _deleteAuthorId, _ = AuthorGroupNewModule) {
        try {
            var [auth_name, Missing_xRef, that] = [
                [],
                [], this
            ];
            /* that = this;
            var Missing_xRef = []; */
            if (this.M_SCOPE.IS_SINGLE_AFF) return false;
            // ? checking the minimum one cross-ref should be link each author
            parent.querySelectorAll('.contrib, .aff').forEach(el => {
                if (el.hasAttribute('ref-type') && ['corresp', 'fn'].includes(el.getAttribute('ref-type'))) return;
                if (el.classList.contains('contrib') && el.querySelectorAll('.xref').length == 0) {
                    if (_deleteAuthorId && _deleteAuthorId == el.id) return;
                    auth_name.push(that.tempName(el.querySelector('.name')));
                } else if (el.classList.contains('aff')) {
                    if (parent.querySelectorAll(`[rid="${el.id}"]`).length == 0) Missing_xRef.push(el.getAttribute('data-label'));
                }
            });
            // ? for replace last comma 
            // TODO https://stackoverflow.com/questions/15069587/is-there-a-way-to-join-the-elements-in-an-js-array-but-let-the-last-separator-b
            if (auth_name.length > 0 || Missing_xRef.length > 0) {
                let missing_item = (auth_name.length > 0 ? auth_name : Missing_xRef);
                let error_msg = ALERT_MESSAGE['AG_AFF_GROUP'][auth_name.length > 0 ? 'ADD_AFF_AUT' : 'ADD_AFF_LINK'];
                missing_item = missing_item.join(', ').replace(/, ([^,]*)$/, ' and $1');
                let alt_txt = Mustache.render(error_msg, {
                    item: missing_item,
                    plural: auth_name.length > 1 ? `&rsquo;s` : ''
                });
                AlertNewDialog.fire('warning', 'Warning', alt_txt, 'OK', '');
                return true;
            } else return false;
        } catch (err) {
            console.log(err.message);
            ErrorLogTrace('checkAuthorLink', err.message);
        }
    },
    CheckOrderAuthGroup: function(parentNode, del_Node, _ = AuthorGroupNewModule) {
        let obj = {
            Count: 0,
            ToRemove: [],
            label: []
        };
        try {
            // Get unique affiliation IDs using Set            
            let arrAff = [...new Set($(parentNode).find('.aff').map((_, el) => el.id).get())];
            // Get unique xref IDs using Set
            let xrefIDList = [...new Set($(parentNode).find('.xref').map((_, el) => $(el).attr('rid').split(' ')).get().flat())];

            // If del_Node is defined, process xref IDs
            if (del_Node !== undefined) {

                // Remove the node with the same ID as del_Node
                $(parentNode).children().filter((_, node) => node.id === del_Node.id).remove();

                // Process and compare xrefIDs
                Array.from(del_Node.querySelectorAll('.xref'))
                    // Get 'rid' attributes
                    .map(el => el.getAttribute('rid'))
                    // Remove null/undefined
                    .filter(Boolean)
                    // Split rid into individual IDs
                    .flatMap(rid => rid.split(' '))
                    .forEach(y => {
                        if (!xrefIDList.includes(y)) {
                            obj.Count++;
                            obj.ToRemove.push(y);
                            // Cache the element to avoid repeated querying
                            const elm = parentNode.querySelector(`[id="${y}"]`);
                            if (elm) {
                                obj.label.push(elm.getAttribute('data-label'));
                            }
                        }
                    });
            }
            return obj;
        } catch (err) {
            console.log(err.message);
            ErrorLogTrace('CheckOrderAuthGroup', err.message);
            return obj;
        }
    },
    AG_N_TC: function(node, contribGrp, oldStructure, Options = {}, _ = AuthorGroupNewModule) {
        try {
            AutoSaveBool = false;

            if (!contribGrp) return;

            node = node && node.$ || node && node.$ && node.$[0] || node;

            const {
                action = null, area, area_sub, label, sub_item
            } = Options;
            const trackingCodes = {
                auth: {
                    [LEFT_MOVE]: 'author_move_01',
                    [RIGHT_MOVE]: 'author_move_01',
                    [DELETE]: 'author_delete_01'
                },
                aff: {
                    [LEFT_MOVE]: 'affiliation_move_01',
                    [RIGHT_MOVE]: 'affiliation_move_01',
                    [DELETE]: 'affiliation_delete_01'
                }
            };
            const trackingCode = trackingCodes[area] && trackingCodes[area][action];

            const $contribGrp = $(contribGrp);
            const hasTrackChangesList = $contribGrp.find(".TrackChangesList").length > 0;

            if (!hasTrackChangesList) {
                this.html_TC.insertAfter($contribGrp.find(".contrib").last());

                if (oldStructure != null) {
                    $contribGrp.find('#oldStructure').empty().append(oldStructure);
                }
            }

            const time = moment().format();
            const temp_name = this.tempName(node);
            const time_string = this.Get_Template('time', {
                r_time: time,
                m_time: time
            });

            const placeholderList = this.place_holder && this.place_holder[node.dataset.name] || [];
            const IsPlaceHolder = placeholderList.includes(temp_name);
            const IsMove = [RIGHT_MOVE, LEFT_MOVE].includes(action);

            // Get alert message
            const msgKey = IsMove ? 'move' : action;
            let template_msg = ALERT_MESSAGE && ALERT_MESSAGE.tc_new_msg && ALERT_MESSAGE.tc_new_msg[msgKey] && ALERT_MESSAGE.tc_new_msg[msgKey][area];

            if (!template_msg) {
                console.warn(`Missing alert message for action: ${msgKey}, area: ${area}`);
                return;
            }

            if (typeof template_msg !== 'string') {
                const keys = Object.keys(template_msg);
                template_msg = template_msg[
                    IsPlaceHolder ? 'pl_hold' : (area_sub || (keys.includes('text') ? 'text' : keys[0]))
                ];
            }

            if (!node.id) node.id = s4();

            const mus_msg = Mustache.render(template_msg, {
                action,
                name: temp_name,
                label,
                timestamp: time_string,
                sub_action: sub_item
            });

            const trackingTime = Date.now();
            const li = this.Get_Template('li', {
                frag: true,
                id: node.id,
                action,
                area,
                time: trackingTime,
                user: USER_INFO.MAIL_ID
            });

            if (trackingCode) {
                $(li.firstChild).attr({
                    'data-track-code': trackingCode,
                    'data-time': trackingTime,
                    'data-username': USER_INFO.MAIL_ID,
                    'data-rolename': USER_INFO.TRACK_ROLE_NAME
                });
            }
            li.firstChild.append(document.createRange().createContextualFragment(mus_msg));
            contribGrp.querySelector('#TrackChangesList').append(li);

        } catch (err) {
            console.error(err.message);
            ErrorLogTrace('AG_N_TC', `${err.message} ${JSON.stringify(Options)}`);
        }
    },
    /**
     * Validates and formats contributor tags for academic publications
     * @param {HTMLElement} contribGroup - The contributor group element
     * @param {Object} options - Configuration options
     * @param {Object} authorModule - Author module reference
     */
    xTagValidation: function(contribGroup, options = {}, authorModule = AuthorGroupNewModule) {
        debug.log("--xTagValidation--");
        try {
            const contribCollection = $(contribGroup).children('.contrib');
            const contribCount = contribCollection.length;
            const hasCollabElement = contribCollection.find(".collab").length > 0;

            /**
             * Process contributors for journal publications
             */
            function processJournalContributors(contribGroup, contribCollection, contribCount, hasCollabElement, options, authorModule) {
                function processOneContributor(element, index, count) {
                    const contributorInfo = analyzeContributor(element, index, count, hasCollabElement);
                    const queryArray = removeProcessingInstructions(element);

                    var usedRegenPi = false;
                    if (typeof AuthorRegenPiBridge !== 'undefined' && AuthorRegenPiBridge && AuthorRegenPiBridge.shouldUse(authorModule)) {
                        usedRegenPi = !!AuthorRegenPiBridge.applyToContrib(
                            element,
                            contributorInfo,
                            authorModule,
                            options,
                            index,
                            count
                        );
                    }
                    if (!usedRegenPi) {
                        processXrefElements(element, contributorInfo, options, authorModule);
                        addProcessingInstructionsToElements(element, contributorInfo, authorModule);
                    } else {
                        // RegenPi covers given-names / between-xrefs / between-contribs;
                        // keep surname / degrees / affix seps from the existing helper.
                        addProcessingInstructionsToElements(element, contributorInfo, authorModule, {
                            skipGivenNames: true
                        });
                    }
                    appendQueries(element, queryArray);
                }

                if (options && options.AuthorModule && options.Author_El) {
                    try {
                        if (contribGroup && contribGroup.parentElement) {
                            $(contribGroup.parentElement).find('.highlightAff').removeClass('highlightAff');
                        }
                    } catch (e) {
                        /* ignore highlight clear */
                    }

                    var previewIndex = (typeof options.previewIndex === 'number') ? options.previewIndex : 0;
                    var previewCount = (typeof options.contribCount === 'number') ? options.contribCount : contribCount;
                    processOneContributor(options.Author_El, previewIndex, previewCount);
                    return;
                }

                $.each(contribCollection, function(index, element) {
                    processOneContributor(element, index, contribCount);
                });
            }

            /**
             * Analyze contributor element to extract relevant information
             */
            function analyzeContributor(element, index, totalCount, hasCollabElement) {
                const xrefCount = element.querySelectorAll('a.xref').length;
                const isLastAuthor = index === totalCount - 1;
                const isLastBefore = hasCollabElement ? index === totalCount - 3 : index === totalCount - 2;

                let lastNameType = '';
                const nameElement = element.querySelector(".name");
                if (nameElement && nameElement.lastElementChild) {
                    lastNameType = nameElement.lastElementChild.getAttribute("data-name");
                }

                return {
                    isNewAuth: element.getAttribute("data-new") !== null,
                    xrefCount,
                    isCorresp: element.querySelectorAll('a[ref-type="corresp"]').length > 0,
                    hasDegrees: element.querySelectorAll('.degrees').length > 0,
                    hasPrefix: element.querySelectorAll('.prefix').length > 0,
                    hasSuffix: element.querySelectorAll('.suffix').length > 0,
                    hasAuthorComment: element.querySelectorAll('.author-comment').length > 0,
                    hasStringName: element.querySelectorAll('.name').length > 0,
                    hasAuthorCollab: element.querySelectorAll('.collab').length > 0,
                    isLastAuthor,
                    isLastBefore,
                    lastNameType
                };
            }

            /**
             * Remove processing instructions before processing
             */
            function removeProcessingInstructions(element) {
                const queryArray = [];
                const piSelectors = 'span.pistart, insert>span[data-class="ckcommentsfull"], span[data-class="ckcommentsfull"]';

                Array.from(element.querySelectorAll(piSelectors)).forEach(elm => {
                    const isInsert = elm.parentElement.tagName.match(/insert/gi) !== null;
                    let nodeToProcess = elm;

                    if (elm.dataset.class === 'ckcommentsfull') {
                        nodeToProcess = isInsert ? elm.parentElement : elm;
                        queryArray.push(nodeToProcess);
                        debug.log("--append--qry/cmd");
                    }

                    nodeToProcess.remove();
                });

                return queryArray;
            }

            /**
             * Process xref elements and add appropriate separators
             */
            function processXrefElements(element, contributorInfo, options, authorModule) {
                const xrefElements = element.querySelectorAll('a.xref');

                if (xrefElements.length === 0) {
                    addContributorSeparator(element, contributorInfo, authorModule);
                    return;
                }

                Array.from(xrefElements).forEach((xrefElement, index) => {
                    if (options.AuthorModule) {
                        element.append(xrefElement);
                    }

                    const isLastXref = index === contributorInfo.xrefCount - 1;
                    const isCorresp = checkCorrespondence(xrefElement);
                    const separatorVal = determineSeparator(contributorInfo, isLastXref, authorModule);
                    const canUseCrossLinkSeparator = shouldAllowCrossLinkSeparator(xrefElements, index, separatorVal, authorModule);

                    if (separatorVal && !isCorresp && canUseCrossLinkSeparator) {
                        if (xrefElement.textContent !== "" || xrefElement !== null) {
                            xrefElement.after(separatorVal.cloneNode(true));

                            const isLastPI = shouldSetLastPI(contributorInfo, isLastXref);
                            if (isLastPI) {
                                xrefElement.nextSibling.setAttribute("lastpi", "");
                            } else {
                                xrefElement.nextSibling.removeAttribute("lastpi");
                            }
                        }
                    }
                });
            }

            /**
             * For PLOS client, allow cross-link separator only between aff-to-aff xrefs
             * 3443592: PLOS - Addition of comma between symbols in affiliation Xref
             * 07-MAR-2026
             */
            function shouldAllowCrossLinkSeparator(xrefElements, index, separatorVal, authorModule) {
                const isPLOSClient = typeof SHARED_KEY !== 'undefined' && SHARED_KEY !== null && SHARED_KEY.client === 'PLOS';
                const isCrossLinkSeparator = separatorVal === authorModule.fragment.cross_link_sep;

                if (!isPLOSClient || !isCrossLinkSeparator) {
                    return true;
                }

                const currentXref = xrefElements[index];
                const nextXref = xrefElements[index + 1];

                return currentXref &&
                    nextXref &&
                    currentXref.getAttribute('data-role') === 'aff' &&
                    nextXref.getAttribute('data-role') === 'aff';
            }

            /**
             * Check if xref element has correspondence
             */
            function checkCorrespondence(xrefElement) {
                const nextSibling = xrefElement.nextElementSibling;
                return nextSibling !== null &&
                    nextSibling.getAttribute("ref-type") === "corresp" &&
                    nextSibling.innerText === '';
            }

            /**
             * Determine appropriate separator based on contributor info
             */
            function determineSeparator(contributorInfo, isLastXref, authorModule) {
                const {
                    isLastAuthor,
                    isLastBefore,
                    hasAuthorCollab
                } = contributorInfo;

                if (isLastXref && hasAuthorCollab && isLastBefore) {
                    return authorModule.fragment.last_sep;
                }
                if (isLastXref && !isLastAuthor && !hasAuthorCollab && isLastBefore) {
                    return authorModule.fragment.last_sep;
                }
                if (isLastXref && !isLastAuthor && !hasAuthorCollab) {
                    return authorModule.fragment.contrib_sep;
                }
                if (isLastXref && isLastAuthor) {
                    return null;
                }

                return authorModule.fragment.cross_link_sep;
            }

            /**
             * Determine if last PI attribute should be set
             */
            function shouldSetLastPI(contributorInfo, isLastXref) {
                const {
                    isLastAuthor,
                    isLastBefore,
                    hasAuthorCollab
                } = contributorInfo;

                return (isLastXref && !isLastAuthor && !hasAuthorCollab) ||
                    (hasAuthorCollab && isLastBefore) ||
                    (isLastXref && !isLastAuthor && !hasAuthorCollab && isLastBefore);
            }

            /**
             * Add contributor separator when no xref elements exist
             */
            function addContributorSeparator(element, contributorInfo, authorModule) {
                const {
                    isLastAuthor,
                    isLastBefore
                } = contributorInfo;

                let separator = '';
                if (!isLastAuthor && !isLastBefore) {
                    separator = authorModule.fragment.contrib_sep;
                } else if (isLastBefore) {
                    separator = authorModule.fragment.last_sep;
                }

                if (separator) {
                    element.append(separator.cloneNode(true));
                }
            }

            /**
             * Add processing instructions to name elements
             */
            function addProcessingInstructionsToElements(element, contributorInfo, authorModule, piOpts) {
                if (!element || !authorModule || !authorModule.fragment) return;
                piOpts = piOpts || {};

                const nameSelectors = [
                    '.surname',
                    '.given-names',
                    '.prefix',
                    '.suffix',
                    '.degrees',
                    '.author-comment'
                ].join(',');

                /* 
                <!-- 
                Beforecomma style → Brian T. Joyce, PhD;
                Aftercomma style → Brian T. Joyce PhD,
                -->
                */

                const nameElements = element.querySelectorAll(nameSelectors);
                const lastElementType = determineLastElementType(contributorInfo);
                const SurnameSepValue = authorModule.M_SCOPE.surname_sep
                const {
                    givenname_sep,
                    surname_sep,
                    altername_start,
                    altername_end,
                    seperator
                } = authorModule.fragment;
                const {
                    hasDegrees,
                    hasPrefix,
                    hasSuffix,
                    hasAuthorComment,
                    lastNameType
                } = contributorInfo;

                const hasAdddEl = hasPrefix || hasSuffix || hasDegrees || hasAuthorComment;

                Array.from(nameElements).forEach(node => {
                    const className = node && node.getAttribute('data-name');
                    if (!className) return;

                    var prevNode = node.previousElementSibling || null;
                    var prevClass = prevNode ? prevNode.className : null;

                    if (className === 'given-names') {
                        if (piOpts.skipGivenNames) return;
                        // Always append separator for given names
                        node.append(givenname_sep.cloneNode(true));

                    } else if (className === 'surname' && SurnameSepValue !== "" && hasAdddEl) {
                        node.append(surname_sep.cloneNode(true));

                    } else if (/^(prefix|suffix|degrees|author-comment)$/i.test(className) && prevNode) {
                        // If previous sibling is a wrapper "name", drill down to its last child
                        if (prevClass === "name") {
                            prevNode = prevNode.lastElementChild;
                            prevClass = prevNode ? prevNode.className : "";
                        }
                        // Only append separator if previous element is also one of the special classes
                        // Avoid duplicate separators if .pistart already exists
                        if (!prevNode.querySelector(".pistart")) {
                            prevNode.append(seperator.cloneNode(true));
                        }
                    }

                    // Optional PI logic (currently disabled)
                    // const boolAddPi = shouldAddProcessingInstruction(contributorInfo, className, lastElementType);
                    // if (boolAddPi) addAppropriateProcessingInstruction(node, className, authorModule);
                });

            }


            /**
             * Determine the last element type for processing instructions
             */
            function determineLastElementType(contributorInfo) {
                const {
                    hasDegrees,
                    hasAuthorComment,
                    lastNameType
                } = contributorInfo;

                if (hasDegrees && hasAuthorComment) {
                    return "author-comment";
                }
                if (hasDegrees && !hasAuthorComment) {
                    return "degrees";
                }

                return lastNameType;
            }

            /**
             * Determine if processing instruction should be added
             */
            function shouldAddProcessingInstruction(contributorInfo, className, lastElementType) {
                const {
                    isLastAuthor,
                    isLastBefore,
                    hasStringName
                } = contributorInfo;
                const isAfterComma = !AuthorGroupNewModule.M_SCOPE.IsAftercomma;

                const conditions = [
                    !isLastAuthor && !isLastBefore && lastElementType !== className,
                    isAfterComma && !isLastAuthor && lastElementType === className,
                    (isLastBefore || isLastAuthor) && lastElementType !== className,
                    lastElementType !== "name-alternatives" && hasStringName && lastElementType === className
                ];

                return conditions.some(condition => condition);
            }



            /**
             * Append queries to the end of contributor element
             */
            function appendQueries(element, queryArray) {
                $.each(queryArray.reverse(), function(i, node) {
                    const lastChild = $(element).children().last();
                    const lastXref = $(element).children('.xref').last();

                    if (lastXref.length > 0) {
                        $(lastXref).after(node);
                    } else if ($(lastChild).attr('class') === 'pistart') {
                        $(lastChild).before(node);
                    } else {
                        $(element).append(node);
                    }
                });
            }

            /**
             * Process contributors for book publications
             */
            function processBookContributors(contribGroup, contribCollection, contribCount) {
                const lastBeforeElement = $(_lastBefore);
                const lastBeforeLength = lastBeforeElement.next('span.x').length;

                // Add separators between contributors
                $.each(contribCollection, function(index, element) {
                    if (element.className === 'contrib' && index !== contribCount - 1) {
                        const nextSibling = element.nextElementSibling;

                        if (nextSibling.className !== 'x') {
                            $(element).after(that.Get_Template('pi_string', {
                                value: ' and '
                            }));
                        }

                        if (nextSibling.className === 'x' && nextSibling.nextElementSibling.className === 'x') {
                            $(nextSibling).remove();
                        }
                    }
                });

                // Reset x tag text content
                $(contribGroup).children('span.x').each(function(index, element) {
                    if (element.textContent !== SPL_OBJS.comma_) {
                        element.textContent = SPL_OBJS.comma_;
                    }
                });

                // Handle last before and last elements
                const lastBeforeNext = lastBeforeElement.next('span.x');
                if (lastBeforeNext.text() !== SPL_OBJS._and_) {
                    lastBeforeNext.text(SPL_OBJS._and_);
                }

                const lastNext = $(_last).next('span.x');
                if (lastNext.length > 0) {
                    lastNext.remove();
                }
            }
            if (IS_JOURNAL || !IS_JOURNAL) {
                processJournalContributors(contribGroup, contribCollection, contribCount, hasCollabElement, options, authorModule);
            } else {
                processBookContributors(contribGroup, contribCollection, contribCount);
            }
        } catch (error) {
            console.error('xTagValidation error:', error.message);
            ErrorLogTrace('xTagValidation', error.message);
        }
    },
    xTagValidation_old: function(_contribGrp, Options = {}, _ = AuthorGroupNewModule) {
        try {
            // ? AUTHOR_EDIT_MODULE_UPDATE 16-SEP-22
            let _contribColl = $(_contribGrp).children('.contrib');
            let [_len, that] = [_contribColl.length, this];
            let _Collab_El = (_contribColl.find(".collab").length != 0) ? (true) : (false);
            // ? For Journals
            if (IS_JOURNAL || !IS_JOURNAL) {
                $.each(_contribColl, function(ind, el) {
                    // ? Append xTag html sting last before node
                    if (Options.AuthorModule) {
                        // ? YA-BUG_FIX_105_FIRE-FOX_19_OCT_22 || OUP_J_AUG_023
                        $(_contribGrp.parentElement).find('.highlightAff').removeClass('highlightAff');
                        // ? GTE ONLY ONE CONTRIB FOR VALIDATE PI INFORMATION FROM AUTHOR_MODULE
                        if (el.id != Options.Author_El.id) {
                            return;
                        } else {
                            el = Options.Author_El;
                        }
                    }
                    var QueryArr = [],
                        _New_Auth = (el.getAttribute("data-new") != null) ? (true) : (false),
                        _Xreflen = el.querySelectorAll('a.xref').length,
                        _IsCorresp = el.querySelectorAll('a[ref-type = "corresp"]').length != 0 ? (true) : (false),
                        _degrees = (el.querySelectorAll('.degrees').length != 0) ? (true) : (false),
                        _prefix = (el.querySelectorAll('.prefix').length != 0) ? (true) : (false),
                        _suffix = (el.querySelectorAll('.suffix').length != 0) ? (true) : (false),
                        _author_comment = (el.querySelectorAll('.author-comment').length != 0) ? (true) : (false),
                        _string_name = (el.querySelectorAll('.string-name').length != 0) ? (true) : (false),
                        _author_collab = (el.querySelectorAll('.collab').length != 0) ? (true) : (false),
                        // IsAftercomma = (that.cur_pattern == "aftercomma") ? (true) : (false),  _ISsuranme,
                        IsLastAu = (ind == _len - 1) ? (true) : (false),
                        IsLastBefore = (_Collab_El) ? (ind == _len - 3) : (ind == _len - 2),
                        IsName_last = '',
                        _Last_xref = null;
                    if (el.querySelector(".name") != null) {
                        IsName_last = el.querySelector(".name").lastElementChild.getAttribute("data-name");
                    }
                    //TODO future update For US Journal 'LastBeforeDelimUseAND'
                    // ? Remove all PI Details Before process.
                    Array.from(el.querySelectorAll('span.pistart, insert>span[data-class="ckcommentsfull"],span[data-class="ckcommentsfull"]')).forEach(function(elm, i, arr) {
                        // ? For Query Placement Move.
                        let [Insert, node] = [(elm.parentElement.tagName.match(/insert/gi) != null), elm];
                        if (elm.dataset.class == 'ckcommentsfull') {
                            node = Insert ? elm.parentElement : elm;
                            QueryArr.push(node);
                            debug.log("--append--qry/cmd");
                        }
                        node.remove();
                    });
                    var x_ref_find = el.querySelectorAll('a.xref');
                    // ? Add Xref Element After the PI Details.
                    //const isEmpty = sel =>![Element.querySelectorAll('[ref-type="corresp"]')].some(el => el.innerHTML.trim() !== "");
                    if (x_ref_find.length > 0) {
                        Array.from(x_ref_find).forEach(function(elm, i, arr) {
                            if (Options.AuthorModule) {
                                // ? AUTHOR MODULE 16-SEP-22
                                el.append(elm);
                            }
                            _Last_xref = ((_Xreflen - 1) == i);
                            _IsCorresp = elm.nextElementSibling != null && elm.nextElementSibling.getAttribute("ref-type") == "corresp" && elm.nextElementSibling.innerText == '';
                            // ? xRef Tag || Remaining contrib except Last and Last before || Remaining Last before.
                            var pi_dom = (_Last_xref && (_author_collab && IsLastBefore)) ?
                                (that.fragment.last_sep) :
                                (_Last_xref && !IsLastAu && !_author_collab && IsLastBefore) ?
                                (that.fragment.last_sep) :
                                (_Last_xref && !IsLastAu && !_author_collab) ? ((that.fragment.contrib_sep)) :
                                (_Last_xref && IsLastAu) ? ("") : ((that.fragment.cross_link_sep));
                            let new_pi_dom = that.fragment.contrib_sep;
                            // ? last element pi validation
                            var Last_PI = ((_Last_xref && !IsLastAu && !_author_collab) || (_author_collab && IsLastBefore) || (_Last_xref && !IsLastAu && !_author_collab && IsLastBefore)) ? (true) : (false);
                            if (pi_dom != null && pi_dom != "" && !_IsCorresp) {
                                if ((elm.textContent != "" && !_.M_SCOPE.IS_SINGLE_AFF) || elm != null) {
                                    elm.after(pi_dom.cloneNode(true));
                                    /* if (Last_PI)  */
                                    elm.nextSibling[Last_PI ? 'setAttribute' : 'removeAttribute']("lastpi", "");
                                }
                            }
                        });
                    } else {
                        //? If Length condition is Zero.
                        let contrib_sep_dom = (!IsLastAu && !IsLastBefore) ? ((that.fragment.contrib_sep)) : (IsLastBefore) ? ((that.fragment.last_sep)) : ('');
                        if (contrib_sep_dom != '') el.append(contrib_sep_dom.cloneNode(true));
                    }
                    // ?Add PI For without A tag.
                    Array.from(el.querySelectorAll('.surname, .given-names, .string-name,.prefix, .suffix, .degrees, .author-comment'), (node) => {
                        // if (IS_LOCAL_HOST) debugger;
                        let _class = node.getAttribute('data-name'),
                            _LastElm = (_degrees && _author_comment) ? ("author-comment") : (_degrees && !_author_comment) ? ("degrees") : (IsName_last);
                        if (_class == 'given-names') {
                            //?Default PI add in given-name.
                            node.append(that.fragment.givenname_sep.cloneNode(true));
                        } else if ((!IsLastAu && !IsLastBefore && _LastElm != _class) || (!AuthorGroupNewModule.M_SCOPE.IsAftercomma && !IsLastAu && _LastElm == _class) || ((IsLastBefore || IsLastAu) && _LastElm != _class) || (_LastElm != "name-alternatives" && _string_name && _LastElm == _class)) {
                            //? OUP_J_AUG_003 PI Bug FIXED DR_11-03-2023
                            //?Except Last Node all need to add Pi information || 
                            //? If before comma Last Element Must need PI information. || 
                            //? Need to check the Order of Element and Last node PI.
                            /*
                            (_string_name && (_LastElm != "name-alternatives" && _LastElm == _class)) ?
                            node.append(that.fragment.altername_start.cloneNode(true)):
                                (_string_name && _class == 'string-name') ?
                                node.append(that.fragment.altername_end.cloneNode(true)) :
                                node.append(that.fragment.author_sep.cloneNode(true));

                            //node.append(that.fragment.author_sep.cloneNode(true));
                            */
                            if (_class == 'surname') {
                                if (_.M_SCOPE.surname_sep != "") node.append(that.fragment.surname_sep.cloneNode(true));
                            } else if (_class == 'string-name') {
                                node.prepend(that.fragment.altername_start.cloneNode(true));
                                node.append(that.fragment.altername_end.cloneNode(true));
                            } else {
                                node.append(that.fragment.author_sep.cloneNode(true));
                            }
                        }
                    });
                    // ? Here Append query end of contrib 
                    // YA 22_MAR_2 QUERY APPEND REVERSE ORDER - OUP_J_AUG_003
                    $.each(QueryArr.reverse(), function(i, node) {
                        let [last_child, XL] = [$(el).children().last(), $(el).children('.xref').last()];
                        // ,XL = $(Element).children('.xref').last()
                        if (XL.length > 0) {
                            $(XL).after(node);
                        } else {
                            if ($(last_child).attr('class') == 'pistart') {
                                $(last_child).before(node);
                            } else {
                                $(el).append(node);
                            }
                        }
                    });
                });
                // ? for Books
            } else {
                _lastBeforeLen = $(_lastBefore).next('span.x').length;
                // ? Append xTag html sting last before node
                $.each(_contribColl, function(indexInArray, valueOfElement) {
                    if ((valueOfElement.className == 'contrib') && (_len - 1) != indexInArray) {
                        let nSibi = valueOfElement.nextElementSibling;
                        if (nSibi.className != 'x') $(valueOfElement).after(that.Get_Template('pi_string', {
                            value: ' and '
                        }));
                        if (nSibi.className === 'x' && nSibi.nextElementSibling.className == 'x') $(nSibi).remove();
                    }
                });
                $.each($(_contribGrp).children('span.x'), function(indexInArray, valueOfElement) {
                    if (valueOfElement.textContent != SPL_OBJS.comma_) valueOfElement.textContent = SPL_OBJS.comma_;
                    // ? Reset text as comma
                });
                // ? reset x tag for last before node
                if ($(_lastBefore).next('span.x').text() != SPL_OBJS._and_) $(_lastBefore).next('span.x').text(SPL_OBJS._and_);
                if ($(_last).next('span.x').length != 0) $(_last).next('span.x').remove();
            }
        } catch (err) {
            console.log(err.message);
            ErrorLogTrace('xTagValidation', err.message);
        }
    },
    OrderNewLink: function(metaGroup, Options = {}, self) {
        self = AuthorGroupNewModule;
        try {
            metaGroup = metaGroup[0] !== undefined ? metaGroup[0] : metaGroup;

            var AFF_LAB_ARR = this.M_SCOPE.Indicate_aff;
            var ObjCorrFn = {};
            var xrefIndices = [];

            var contribGroup = GlobalEditor.document.findOne('.article-meta .contrib-group').$;
            var NotesGroup = GlobalEditor.document.findOne('.article-meta .author-notes').$;
            // ? Sorting purpose fetch corresponding/notes lit order

            // Map each note div with an order
            NotesGroup.querySelectorAll("div").forEach(function(item, idx) {
                ObjCorrFn[item.id] = {
                    order: 100 + idx
                };
            });

            // Process each xref element
            Array.from(metaGroup.querySelectorAll('.xref')).forEach(function(el) {
                var childSup = el.querySelector('sup');
                var nextEl = el.nextElementSibling;

                if (!el.hasAttribute('rid')) return;

                var rids = el.getAttribute('rid').split(" ");
                rids.forEach(function(rid, idx) {
                    var matchedLabelElement = GlobalEditor.document.getById(rid) ||
                        contribGroup.querySelector(`[id='${CSS.escape(rid)}']`) ||
                        notesGroup.querySelector(`[id='${CSS.escape(rid)}']`);

                    var label = matchedLabelElement ? matchedLabelElement.getAttribute("data-label") : null;

                    var orderIndex;
                    if (ObjCorrFn[rid] && ObjCorrFn[rid].order !== undefined) {
                        orderIndex = ObjCorrFn[rid].order;
                    } else if (label && !isNaN(label)) {
                        orderIndex = parseInt(label);
                    } else {
                        var labelIndex = AFF_LAB_ARR.indexOf(label);
                        if (labelIndex !== -1) {
                            orderIndex = labelIndex;
                        } else {
                            orderIndex = 999;
                        }
                    }

                    if (idx === 0 || !el.hasAttribute("data-xref-order")) {
                        el.setAttribute("data-xref-order", orderIndex);
                    }

                    if (nextEl && nextEl.nodeType === 1) {
                        const classList = nextEl.classList;
                        const isRole = classList.contains("role");
                        const isPiStart = classList.contains("pistart");

                        if (isRole || isPiStart) {
                            const orderAttr = isRole ? "data-role-order" : "data-pi-order";
                            nextEl.setAttribute(orderAttr, orderIndex);
                        }
                    }

                    xrefIndices.push(orderIndex);
                });
            });

            // Sort and append based on index
            xrefIndices.sort(function(a, b) {
                return a - b;
            });

            xrefIndices.forEach(function(index) {
                ["data-role-order", "data-xref-order", "data-pi-order"].forEach(function(attr) {
                    var element = metaGroup.querySelector('[' + attr + '="' + index + '"]');
                    if (element) metaGroup.appendChild(element);
                });
            });
            // ?  16-SEP-22 -AUTHOR MODULE RETURN THE LINK ORDER TO SHOW
            if (Options.AuthorModule) {
                // Placeholder for rSup.join(',') if needed
                return '';
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('OrderNewLink', err.message);
        }
    },
    AuthorGroupCorresNotes: function(ACTION, Type, parent, curNode, _ = AuthorGroupNewModule) {
        var [ReNumberDOM] = [null];
        try {
            AutoSaveBool = false;
            if (!this.AuthDOM && _.IS_DOM_MANIPULATE) this.AuthDOM = document.getElementById('AuthDOM');
            curNode = curNode.$ ? curNode.$ : curNode[0] ? curNode[0] : curNode;
            var CK_META = curNode.closest('.article-meta');
            if (_.IS_DOM_MANIPULATE) {
                $(this.AuthDOM).html('').append(CK_META.outerHTML);
                this.DOM_Auth(true);
                ReNumberDOM = this.AuthDOM;
            } else ReNumberDOM = GlobalEditor.document.$;
            var Obj = {
                MetaGroup: _.AuthDOM.querySelector('.article-meta'),
                ContribGrup: _.AuthDOM.querySelector('.contrib-group'),
                cur_id: curNode.id,
                cur_lab: curNode.dataset.label,
                node: _.AuthDOM.querySelector(`#${curNode.id}`),
                CK_DOM: CK_META,
                Coll: null,
                next: null,
                prev: null
            };
            Obj.next = Obj.node ? Obj.node.nextElementSibling : null;
            Obj.prev = Obj.node ? Obj.node.previousElementSibling : null;
            Obj.Coll = Obj.MetaGroup.querySelectorAll(`[data-name="${Type}"]`);
            if ([LEFT_MOVE, RIGHT_MOVE].includes(ACTION)) {
                let IsRight = RIGHT_MOVE == ACTION;
                let Sibiling = IsRight ? Obj.next : Obj.prev;
                $(Sibiling)[IsRight ? 'after' : 'before'](curNode);
            } else if (ACTION == DELETE) {
                // ? set data DOM and start process
                let xref = Obj.MetaGroup.querySelectorAll(`a.xref[data-role="${Type}"]`);
                let rid = [];
                Array.from(xref).forEach(elm => {
                    if (elm.hasAttribute('rid')) {
                        elm.getAttribute('rid').split(',').forEach(function(char, index, ar) {
                            if (char == Obj.cur_id) {
                                rid.push(char);
                                // elm.parentElement.removeChild(elm);
                                commonMethods.removeEl(elm);
                            }
                        });
                    }
                });
                this.xTagValidation(Obj.ContribGrup);
                if (!Obj.node.dataset.new) {
                    if (trackManager && typeof trackManager.getDelNode === "function") {
                        const options = {
                            childOnly: true
                        };
                        trackManager.getDelNode(Obj.node, options);
                    } else {
                        var rTemp = window.GetTrackTag(Obj.node, 'delOnly');
                        $(Obj.node).replaceWith(rTemp).attr('data-delete');
                    }
                } else {
                    // ? removed from the DOM
                    Obj.node.parentElement.removeChild(Obj.node);
                }
                _.current_stack.area_sub = rid.length > 0 ? 'w_link' : 'wo_link';
                _.current_stack.lab = Obj.cur_lab;
                this.LinkRenumbering(ReNumberDOM, ACTION, {
                    IsAuthorNote: true
                });
            } else if (ACTION == ADD) {
                let i = Obj.Coll.length + 1;
                let new_Elm_id = _.last_cursor_id = 'IMP2-' + s4();
                let lab = _.current_stack.lab = _.M_SCOPE.Indicate_fn[i - 1];
                var myEntry = _.Get_Template(Type, {
                    frag: true,
                    label: lab,
                    id: new_Elm_id,
                    seq: i
                });
                commonMethods.insertAfter(myEntry, (Obj.Coll.length == 0 ? Obj.node : Obj.Coll[Obj.Coll.length - 1]));
                Obj.node = _.current_stack.elm = Obj.MetaGroup.querySelectorAll(`[data-label="${lab}"]`);
            }
            AutoSaveBool = true;
            let oldStructure = _.getAuthorGroupView(Obj.ContribGrup.cloneNode(true));
            let sub = (_.current_stack.area_sub ? _.current_stack.area_sub : '');
            let tc_obj = {
                action: ACTION,
                area: 'auth_note',
                area_sub: sub,
                label: _.current_stack.lab
            };
            _.AG_N_TC(Obj.node, Obj.ContribGrup, oldStructure, tc_obj);
            if (_.IS_DOM_MANIPULATE) {
                Obj.CK_DOM.replaceWith(Obj.MetaGroup);
                this.setCursor();
                this.DOM_Auth(false);
                $(this.AuthDOM).html('');
            }
        } catch (err) {
            this.DOM_Auth(false);
            console.warn(err.message);
            ErrorLogTrace('CorresNotes', err.message);
        }
    },
    AuthorGroupClick: function(GlobalEditor, _ = AuthorGroupNewModule) {
        try {
            AutoSaveBool = false;
            const SelectedElement = GlobalEditor.getSelection().getStartElement();
            if (!SelectedElement) return;

            const $sel = $(SelectedElement.$);
            const trackListRoot = $sel.closest('.TrackChangesList');
            const $kwdGroup = $sel.closest('.kwd-group');

            if (trackListRoot.length > 0) {
                $('#AuthorAffTrackChangesShow').html("");

                const obj = {
                    output: '',
                    IsNew: false,
                    id: null
                };
                const ID_MATCH = {
                    TrackChanges: {
                        old: "oldStructure",
                        list: "TrackChangesList"
                    },
                    TrackChangesKW: {
                        old: "oldStructurekw",
                        list: "TrackChangesListKW"
                    },
                    TrackChangesABR: {
                        old: "oldStructureabr",
                        list: "TrackChangesListABR"
                    }
                };

                const $ID = trackListRoot.attr('id');
                const trackConfig = ID_MATCH[$ID];
                let $elements = null;

                if (trackConfig) {
                    let oldNode, listNode;

                    if (IS_JOURNAL) {
                        oldNode = GlobalEditor.document.getById(trackConfig.old);
                        listNode = GlobalEditor.document.getById(trackConfig.list);
                    } else if ($ID == 'TrackChangesKW') {
                        if ($kwdGroup) {
                            oldNode = $kwdGroup.find(`[id="${trackConfig.old}"]`);
                            listNode = $kwdGroup.find(`[id="${trackConfig.list}"]`);
                        }
                    }

                    if (!oldNode || !listNode) {
                        console.warn('TrackChanges node missing', {
                            rootId: $ID,
                            expectedOldId: trackConfig.old,
                            expectedListId: trackConfig.list,
                            hasOldNode: !!oldNode,
                            hasListNode: !!listNode
                        });
                        return;
                    }
                    try {
                        const wrapper = document.createElement("div");
                        wrapper.appendChild(parseEl(oldNode));
                        wrapper.appendChild(parseEl(listNode));
                        $elements = $(wrapper);
                    } catch (err) {
                        console.error("Wrapper construction failed:", err);
                    }
                } else {
                    return;
                }

                // Update relative times and placeholders
                $elements.find('.time').each((ind, node) => {
                    try {
                        const time = node.getAttribute('data-time');
                        const relative_time = moment(time).fromNow();
                        $(node).html(relative_time);

                        const parent = node.parentElement;
                        const DataSet = parent.dataset;
                        const id = DataSet.id;

                        if (!this.TC_CLICK_COUNT[id]) {
                            this.TC_CLICK_COUNT[id] = DataSet.view ? DataSet.view : 0;
                        }

                        if (id && DataSet.action === 'add') {
                            if (this.TC_CLICK_COUNT[id] > 0 && parent.textContent.match(/placeholder/)) {
                                const msgConfig = ALERT_MESSAGE && ALERT_MESSAGE.tc_new_msg && ALERT_MESSAGE.tc_new_msg[DataSet.action];
                                const msg = msgConfig ? msgConfig[DataSet.area + '_text'] : null;
                                var elm = GlobalEditor.document.findOne(`[data-id="${id}"],[id="${id}"]`);

                                if (msg && elm) {
                                    const fetch_text = this.tempName(elm.$);
                                    const placeholderList = this.place_holder[elm.$.dataset.name] || [];
                                    const IsPlaceHolder = placeholderList.includes(fetch_text);

                                    if (!IsPlaceHolder) {
                                        const time_string = this.Get_Template('time', {
                                            m_time: time,
                                            r_time: relative_time
                                        });
                                        obj.output = Mustache.render(msg, {
                                            name: fetch_text,
                                            timestamp: time_string
                                        });
                                        obj.IsNew = true;
                                        obj.id = id;
                                    }
                                }
                            }
                        }

                        ++this.TC_CLICK_COUNT[id];

                        if (obj.IsNew) {
                            if ($elements[0]) {
                                const target = $elements[0].querySelector('[data-id="' + obj.id + '"]');
                                if (target) {
                                    target.innerHTML = obj.output;
                                }
                            }

                            const ck_entry = GlobalEditor.document.findOne('li[data-id="' + obj.id + '"]');
                            if (ck_entry && ck_entry.$) {
                                ck_entry.$.innerHTML = obj.output;
                                // ck_entry.$.setAttribute("data-view", that.TC_CLICK_COUNT[obj.id]);
                            }

                            console.log(obj.output);
                        }
                    } catch (err) {
                        console.error("Relative time update failed:", err);
                    }
                });

                $('#AuthorAffTrackChangesShow').append($elements);
                document.getElementById('popupdiv').classList.remove('ds-none');
                checkDialogPosition('popupdiv');
            } else {
                document.getElementById('popupdiv').classList.add('ds-none');
            }

            // Highlight affiliations
            const [className, IsAuthorGroup] = [
                SelectedElement.$.className,
                $sel.parents('.contrib-group').length > 0
            ];

            GlobalEditor.fire("lockSnapshot");

            if (IsAuthorGroup && /contrib|name|xref|given-names|surname/gi.test(className)) {
                const parent = /name|xref|given-names|surname/gi.test(className) ? $sel.parents('.contrib')[0] : $sel[0];
                $(GlobalEditor.document.$).find('.highlightAff').removeClass('highlightAff');
                if (parent) {
                    parent.querySelectorAll('.xref').forEach(el => {
                        const ridAttr = el.getAttribute('rid');
                        if (ridAttr) {
                            ridAttr.split(" ").forEach(rid => {
                                GlobalEditor.document.getById(rid).addClass('highlightAff');
                            });
                        }
                    });
                }
            } else {
                $(GlobalEditor.document.$).find('.highlightAff').removeClass('highlightAff');
            }

            AutoSaveBool = true;
            GlobalEditor.fire("unlockSnapshot");
        } catch (err) {
            AutoSaveBool = true;
            console.warn(err.message);
            GlobalEditor.fire("unlockSnapshot");
            ErrorLogTrace('AuthorGroupClick', err.message);
        }
    },
    setCursor: function(iEditorDoc, Option, _ = AuthorGroupNewModule) {
        try {
            iEditorDoc = iEditorDoc ? iEditorDoc : GlobalEditor.document;
            setTimeout(function() {
                if (_.last_cursor_id) {
                    let range = GlobalEditor.createRange(),
                        node = iEditorDoc.getById(_.last_cursor_id);
                    if (!node) return;
                    node.scrollIntoView();
                    GlobalEditor.getSelection().selectElement(node);
                    range.setEnd(node.getLast(), 0);
                    GlobalEditor.getSelection().selectRanges([range]);
                    //iEditorDoc.getById(that.last_cursor_id).scrollIntoView();
                    GlobalEditor.focus();
                }
                _.last_cursor_id = null;
            }, 500);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('setCursor', err.message);
        }
    },
    DialogClose: function() {
        try {
            document.getElementById('TrackTCModule').classList.add('ds-none');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('DialogClose', err.message);
        }
    },
    count_loop: function(_name, n, Options = {}, _ = AuthorGroupNewModule) {
        try {
            let labObject = _.M_SCOPE.LAB_COLLECTION;
            for (let Count = 0; Count < n; Count++) {
                switch (_name) {
                    case "Alphabets":
                        // ? alphebts
                        let check1 = getAlphabateByIndex(Count);
                        if (labObject[_name].indexOf(check1) == -1) {
                            labObject[_name].push(check1);
                        }
                        break;
                    case "ArabicNumber":
                        // ? arabic numbers
                        if (labObject[_name].indexOf(Count + 1) == -1) {
                            labObject[_name].push(Count + 1);
                        }
                        break;
                    case "symbols":
                        // ? all other symbols
                        let key_name = Options.json_key;
                        let newValue = _.label_Symbol(_.M_SCOPE.LAB_CLONE_COPY["_" + key_name], Count);
                        if (labObject[key_name].indexOf(newValue) == -1) {
                            labObject[key_name].push(newValue);
                        }
                        break;
                    case "custom":
                        _.M_SCOPE.LAB_COLLECTION[_name].push(Options.customLab.repeat(Count));
                        break;
                    default:
                        break;
                }
            }
            //debug.log(labObject[Options.json_key ? Options.json_key : _name]);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('DialogClose', err.message);
        }
    },
    label_Generator: function(n, _ = AuthorGroupNewModule) {
        try {
            debug.log("label_Generator");
            if (IS_LOCAL_HOST) {
                // debugger;
            }
            if (!GlobalEditor && !GlobalEditor.document) {
                setTimeout(() => {
                    _.label_Generator();
                }, 2500);
                return;
            } else if (!n) n = GlobalEditor.document.find('.aff').$.length + 25;
            let [labObject, IsCustomLink, customLab] = [_.M_SCOPE.LAB_COLLECTION, false, ""];
            // ? 10_MAY_2023
            let _config_ = _.M_CONFIG.affiliation.designators;
            if (_config_ && _config_.match(/custom/)) {
                _.M_SCOPE.LAB_COLLECTION[_config_] = [];
                IsCustomLink = true;
                customLab = _config_.split("_").pop();
            }
            for (const [name, valuesArr] of Object.entries(_.M_SCOPE.LAB_COLLECTION)) {
                let autoList = (name.match(/FootNote/gi)) ? true : false;
                if (IsCustomLink && Count > 0 && labObject[_config_].length == 0) {
                    _.count_loop("custom", n, {
                        customLab: customLab
                    });
                }
                if (autoList) {
                    if (!_.M_SCOPE.LAB_CLONE_COPY["_" + name]) {
                        _.M_SCOPE.LAB_CLONE_COPY["_" + name] = [...valuesArr];
                    }
                }
                _.count_loop(autoList ? "symbols" : name, n, {
                    json_key: name
                });
            }
            // YA JANSCI - 29_AUG_2023 -- "*" IT WILL REMOVED AS PER STYLE
            _.M_SCOPE.LAB_COLLECTION.FootNote_2.shift();
            //debug.log(_.M_SCOPE);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('label_Generator', err.message);
        }
    },
    label_Symbol: function(Arr, n, _ = AuthorGroupNewModule) {
        try {
            let x = 0,
                y = 0,
                z = null,
                len = Arr.length;
            if (n >= len) {
                while (n >= y) {
                    x++;
                    $.each(Arr, function(ind, sym) {
                        if (n == y) {
                            z = sym;
                            return false;
                        } else y++;
                    });
                    if (y == 500 || n == y && z != null) break;
                }
                let out = Array(x + 1).join(z);
                return out;
            } else return Arr[n];
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('label_Symbol', err.message);
        }
    },
    DOM_Auth: function(CanShow, _ = AuthorGroupNewModule) {
        try {
            if (!this.AuthDOM) this.AuthDOM = document.getElementById('AuthDOM');
            if (!IS_LOCAL_HOST) return;
            this.AuthDOM.classList[CanShow ? 'add' : 'remove']('show');
            this.AuthDOM.classList[CanShow ? 'remove' : 'add']('ds-none');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('DOM_Auth', err.message);
        }
    },
    init: function(self = AuthorGroupNewModule) {
        try {
            if (!self.M_CONFIG) self.M_CONFIG = {};

            // Context menu check
            if (!IsContextMenu('AuthorGroupNewModule')) {
                Object.assign(self.M_CONFIG, {
                    SHOW_CONTEXT_GROUP: false,
                    SHOW_CONTEXT_GROUP_DIALOG: false,
                    SHOW_CONTEXT_GROUP_NOTES: false,
                    SHOW_CONTEXT_GROUP_AUTHOR: false,
                    SHOW_CONTEXT_GROUP_AFF: false
                });
                self.Initiated = true;
                return false;
            }

            // Ensure GlobalEditor is ready
            if (!GlobalEditor || !GlobalEditor.document) {
                setTimeout(() => {
                    AuthorGroupNewModule.init();
                }, 2500);
                return;
            }

            self.AuthDOM = document.getElementById('AuthDOM');

            // Scope setup
            self.M_SCOPE = {
                ...self.M_SCOPE,
                IS_SINGLE_AFF: getConfig('affiliation', 'single-aff') === 'true',
                IsDegrees: getConfig('author', 'degrees') === 'yes',
                seperator: getConfig('author', 'seperator'),
                givenname_sep: getConfig('author', 'givennamesep'),
                surname_sep: getConfig('author', 'surnameSep'),
                altername_start: "(",
                altername_end: ")",
                last_sep: getConfig('author', 'contrib-last-sep'),
                contrib_sep: getConfig('author', 'contribsep'),
                cross_link_sep: getConfig('author', 'crosslinksep'),
                IsAftercomma: getConfig('author', 'pattern') === 'aftercomma',
                Indicate_aff: self.M_SCOPE.LAB_COLLECTION[getConfig('affiliation', 'designators')],
                Indicate_fn: self.M_SCOPE.LAB_COLLECTION[getConfig('author-notes', 'author-notes-quees')]
            };

            // Config items
            ["author", "affiliation", "corresp", "author-notes"].forEach(key => {
                self.M_CONFIG[key] = GET_CONFIG_ITEM(key, {
                    CONVERT_JSON: true,
                    children: false,
                    attr: true,
                    hex2string: false,
                    keyUpperCase: false,
                    JOURNAL: true,
                    journalBased: true
                });
            });

            // Context flags
            self.M_CONFIG.SHOW_CONTEXT_GROUP = IsContextMenu('AuthorGroupModule');
            self.M_CONFIG.SHOW_CONTEXT_GROUP_DIALOG = IsContextMenu('AuthorEditDialog');
            self.M_CONFIG.SHOW_CONTEXT_GROUP_NOTES = IsContextMenu('Author_Notes');

            // Edit mode handling
            const editModeRaw = getConfig('author', 'add-edit');
            const notallowedAuthor = getConfig('author', 'notallowed');
            const modeCfg = (typeof AuthorEditModeConfig !== 'undefined' && AuthorEditModeConfig.resolveAuthorEditModeConfig) ?
                AuthorEditModeConfig.resolveAuthorEditModeConfig(editModeRaw, notallowedAuthor) : {
                    EDIT_MODE: notallowedAuthor === 'yes' ? 'off' : 'full',
                    SHOW_CONTEXT_GROUP_AUTHOR: notallowedAuthor !== 'yes',
                    XTAG_VALIDATION: notallowedAuthor !== 'yes',
                    LINK_RENUMBER: notallowedAuthor !== 'yes'
                };

            Object.assign(self.M_CONFIG, {
                EDIT_MODE: modeCfg.EDIT_MODE,
                XTAG_VALIDATION: modeCfg.XTAG_VALIDATION,
                LINK_RENUMBER: modeCfg.LINK_RENUMBER,
                SHOW_CONTEXT_GROUP_AUTHOR: modeCfg.SHOW_CONTEXT_GROUP_AUTHOR,
                SHOW_CONTEXT_GROUP_AFF: getConfig('affiliation', 'notallowed') !== 'yes'
            });

            this.Auto_ReNumber_AG_AFF = !!self.M_CONFIG.LINK_RENUMBER;

            // Final setup
            self.Update_Configuration();
            self.label_Generator();
            self.template_Generator();
            self.Initiated = true;
            self.IS_DOM_MANIPULATE = false;
            editor_Listener();

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('AuthorGroup_init', err.message);
        }
    },
    fire: async function(ELEMENT_AREA, ACTION, iEditor, iEditorDoc, self = AuthorGroupNewModule) {
        try {
            commonMethods.cleanTranslatorExtensions();
            [AutoSaveBool, iEditor, iEditorDoc] = [false, GlobalEditor, GlobalEditor.document];
            var [sel, _tempElm, _tempElmId, curElm, wc, contribGroup, oldStructure] = [iEditor.getSelection(), null, null, null, 0, null, null];
            if (IS_LOCAL_HOST) this.DOM_Auth(true);
            sel = sel.getStartElement();
            if ((!sel && !IMPACT.USER_ENV_INFO.isSafari) || (IMPACT.USER_ENV_INFO.isSafari && !IMP_SAFARI.TARGET)) return console.warn("selection missing");
            else _tempElm = IMPACT.USER_ENV_INFO.isSafari ? IMP_SAFARI.TARGET : sel.$;
            debug.log(sel);
            if (ELEMENT_AREA == AFG) {
                var IsAff = ACTION != DELETE_LINK && ACTION != LINK;
                // ? handle delete link selection /* if(ACTION==LINK) */
                while (!$(_tempElm).hasClass(IsAff ? ('aff') : ('contrib'))) {
                    _tempElm = _tempElm.parentNode;
                    wc = wc + 1;
                    if (wc == 10) break;
                    if (_tempElm == null) break;
                }
            } else _tempElm = _tempElm.closest(".contrib");
            if (ELEMENT_AREA == AFG && ACTION == ADD &&
                typeof window.openAddEditAffiliationDialog === 'function') {
                const dialogOpened = await window.openAddEditAffiliationDialog('insert', _tempElm);
                if (dialogOpened) return true;
            }
            if (_tempElm.id == "") _tempElm.id = "IMP2-" + s4();
            _tempElmId = this.last_cursor_id = _tempElm.id;
            let ReNumberDOM = null;
            if (self.IS_DOM_MANIPULATE) {
                $(this.AuthDOM).html('').append($(sel.$).parents('.article-meta').clone(true));
                curElm = this.AuthDOM.querySelector(`[id="${_tempElmId}"]`);
                contribGroup = curElm.closest('.contrib-group');
                ReNumberDOM = this.AuthDOM;
            } else {
                curElm = _tempElm;
                contribGroup = curElm.closest('.contrib-group');
                IMPACT_SELECTION._SNAPSHOT({
                    lock: true,
                    save: true
                });
                ReNumberDOM = iEditorDoc.$;
            }
            oldStructure = self.getAuthorGroupView(contribGroup.cloneNode(true));
            var finalMethodBool = true;
            if (ELEMENT_AREA == AFG) {
                debug.log('AffiliationGroup Ininted');
                finalMethodBool = await self.AffiliationGroup(curElm, contribGroup, ACTION);
                if (finalMethodBool) {
                    let sub = (self.current_stack.area_sub ? self.current_stack.area_sub : '');
                    let tc_obj = {
                        action: ACTION,
                        area: 'aff',
                        area_sub: sub
                    };
                    tc_obj.label = self.current_stack.lab;
                    if ([ADD].includes(ACTION)) {
                        curElm = self.current_stack.elm;
                    }
                    self.AG_N_TC(curElm, contribGroup, oldStructure, tc_obj);
                    self.Update_Configuration();
                }
            } else if (ELEMENT_AREA == AG) {

                console.log('AuthorGroup Ininted');

                const isAllowed = getConfig('author', 'notallowed') === 'no';
                const editOnlyAuthor = getConfig('author', 'add-edit') === 'dialog';
                const isDialogReady = typeof AuthorEditDialog !== 'undefined' && typeof AuthorEditDialog.show == "function";

                if (ACTION == "OpenDialog") {
                    AuthorEditDialog.show(curElm, {
                        mode: 'edit'
                    });
                    finalMethodBool = false;
                } else if (editOnlyAuthor && isDialogReady) {
                    const pendingAuthorLink = isAllowed ? self.checkAuthorLink(contribGroup) : false;
                    if (pendingAuthorLink) {
                        finalMethodBool = false;
                    } else {
                        if (ACTION == ADD) {
                            const dialogOpened = await AuthorEditDialog.show(curElm, {
                                mode: 'insert'
                            });
                            if (dialogOpened !== false) finalMethodBool = false;
                            else finalMethodBool = await self.AuthorGroup(curElm, ACTION);
                        } else {
                            finalMethodBool = await self.AuthorGroup(curElm, ACTION);
                        }
                    }
                } else {
                    finalMethodBool = await self.AuthorGroup(curElm, ACTION);
                }
                if (finalMethodBool) {
                    let sub = (self.current_stack.area_sub ? self.current_stack.area_sub : '');
                    let tc_obj = {
                        action: ACTION,
                        area: 'auth',
                        area_sub: sub
                    };
                    if (ACTION == ADD) curElm = self.current_stack.elm;
                    self.AG_N_TC(curElm, contribGroup, oldStructure, tc_obj);
                }
            }
            if (finalMethodBool) {
                var LinkawaitBool = true;
                if (IS_JOURNAL) {
                    if (this.Auto_ReNumber_AG_AFF && ![ADD, SWAP].includes(ACTION)) {
                        LinkawaitBool = await self.LinkRenumbering(ReNumberDOM, ACTION);
                    }
                    if (self.M_CONFIG.XTAG_VALIDATION && (LinkawaitBool || this.M_SCOPE.IS_SINGLE_AFF || [LINK, SWAP].includes(ACTION))) {
                        self.xTagValidation(contribGroup);
                    }
                }
                if (self.IS_DOM_MANIPULATE) {
                    //TODO Here Append the AuthDOM html into Editor
                    $(iEditorDoc.findOne('.article-meta').$).replaceWith(this.AuthDOM.innerHTML);
                    this.AuthDOM.innerHTML = '';
                } else {
                    IMPACT_SELECTION._SNAPSHOT({
                        unlock: true,
                        save: false
                    });
                }
                // TODO Handle here cursor location
                this.setCursor(iEditorDoc);
                AutoSaveBool = true;
                this.DOM_Auth(false);
            } else {
                AutoSaveBool = true;
                this.DOM_Auth(false);
            }
            if (!self.IS_DOM_MANIPULATE) {
                IMPACT_SELECTION._SNAPSHOT({
                    unlock: true,
                    save: false
                });
            }
        } catch (err) {
            this.DOM_Auth(false);
            console.warn(err.message);
            ErrorLogTrace('AuthorGroup_init', err.message);
        }
    },
    AffiliationGroup: async function(curElm, contribGroup, ACTION, _ = AuthorGroupNewModule) {
        if (!this.AuthDOM) this.AuthDOM = document.getElementById('AuthDOM');
        try {
            var arrAff = [],
                authorName = [];
            //? Handled Single Affiliation no author cross link labels As per Live Bug ntac261.
            if (contribGroup.querySelectorAll(".aff").length == 1 && !curElm.hasAttribute("data-label") && curElm.classList.contains("aff")) {
                curElm.setAttribute("data-label", _.M_SCOPE.Indicate_aff[0]);
                let sup_string = _.Get_Template('sup', {
                    value: _.M_SCOPE.Indicate_aff[0],
                    frag: false
                });
                contribGroup.querySelectorAll('a[ref-type = "aff"]').forEach(elm => {
                    elm.innerHTML = sup_string;
                    //elm.innerHTML == "<span></span>" ? elm.innerHTML = _.Get_Template('sup', {value: _.M_SCOPE.Indicate_aff[0],frag: false}) : elm;
                });
            }
            var Obj = {
                MetaGroup: curElm.closest('.article-meta'),
                next: curElm.nextElementSibling,
                prev: curElm.previousElementSibling,
                nameGroup: curElm.querySelector('.name'),
                coll: contribGroup.querySelectorAll('.aff'),
                last: [].slice.call(contribGroup.querySelectorAll('.aff')).pop(),
                last_lab: null,
                IsNewAuth: curElm.hasAttribute('data-new'),
                new_id: function() {
                    return (parseInt(this.last.id.replace('AF', '')) + 1).toString().lpad("0", 4);
                },
                Sel_Text: GlobalEditor.getSelection().getSelectedText()
            };
            Obj.last_lab = Obj.last.dataset.label;
            if (!isNaN(Obj.last_lab)) Obj.last_lab = parseInt(Obj.last_lab);
            Obj.next_lab = _.M_SCOPE.Indicate_aff[_.M_SCOPE.Indicate_aff.indexOf(Obj.last_lab) + 1];
            this.current_stack.action = ACTION;
            if ([ADD, DELETE, DELETE_LINK].includes(ACTION)) {
                const IsDelete = ACTION == DELETE,
                    IsLinkDelete = ACTION == DELETE_LINK;
                if (ACTION == ADD) {
                    let new_id = Obj.new_id();

                    commonMethods.insertAfter(this.Get_Template('aff', {
                        id: new_id,
                        label: Obj.next_lab
                    }), Obj.last);
                    this.current_stack.id = this.last_cursor_id = 'AF' + new_id;
                    this.current_stack.lab = Obj.next_lab;
                    this.current_stack.elm = Obj.last.nextElementSibling;
                    return true;
                } else if (IsDelete || IsLinkDelete) {

                    // ? DELETE || DELETE LINK 
                    let lab = this.current_stack.lab = (IsLinkDelete ? (Obj.Sel_Text) : (curElm.dataset.label));

                    if (IsLinkDelete) this.current_stack.action = 'link';

                    $(Obj.MetaGroup).find('.xref, .aff, .fn, .corresp').each(function(index, elm) {
                        let IsXref = elm.className == 'xref';
                        let text = (IsXref) ? (elm.textContent.trim()) : (elm.dataset.label);
                        if ((IsXref) && (text.split(',').indexOf(lab) != -1)) {
                            $.each(text.split(','), function(x, y) {
                                if (lab == y) {
                                    arrAff.push({
                                        Orginal: y
                                    });
                                    let contrib = elm.closest('.contrib');
                                    if (contrib) {
                                        if (!IsDelete && contrib.id != curElm.id) debug.log("--");
                                        else authorName.push(_.tempName(contrib));
                                    }
                                }
                            });
                        }
                        const isFnNote = _.IsAuthorNote = ['fn'].includes(elm.dataset.name);
                        if (lab == text) {
                            if (['aff', 'fn', 'corresp'].includes(elm.dataset.name)) {
                                _.current_stack.elm = elm.cloneNode(true);
                            }
                        } else if (IsLinkDelete && isFnNote && !elm.dataset.label) {
                            if (elm.textContent.trim().indexOf(lab) == 0 || IMPACT_SELECTION.NODE.getAttribute("rid") == elm.id) {
                                _.current_stack.elm = elm.cloneNode(true);
                            }
                        }
                    });
                    var CanDelete = false;
                    let Names = authorName.join(', ').replace(/, ([^,]*)$/, ' and $1');

                    const alery_key = (IsDelete ? (arrAff.length == 0 ? 'AffDelete001' : 'AffDelete002') : (arrAff.length > 1 && !IsLinkDelete ? 'AffDelete004' : 'AffDelete003'));

                    CanDelete = await IMPACT_ALERT(alery_key, {
                        name: Names,
                        label: lab,
                        pural: (arrAff.length > 1 ? "s" : "")
                    });
                    //this.current_stack.area_sub=((IsDelete && arrAff.length > 0) ?(arrAff.length == 1?'wo_link':'w_link'):'remove');
                    //this.current_stack.area_sub = (arrAff.length == 1 ? ('w_link') : (arrAff.length > 1) ? ('remove') : ('wo_link'));
                    this.current_stack.area_sub = (arrAff.length > 0 ? (arrAff.length == 1 ? ("w_link") : (IsDelete ? "w_link" : "remove")) : ("wo_link"));
                    if (CanDelete) {
                        if ((/wo_link|remove/gi.test(this.current_stack.area_sub)) || (_.current_stack.elm && this.current_stack.area_sub == 'w_link')) {
                            //? Remove only Xref Element
                            (IsDelete ? (Obj.MetaGroup) : curElm).querySelectorAll(`.xref[rid="${_.current_stack.elm.id}"]`).forEach(elm => {
                                // elm.parentElement.removeChild(elm);
                                commonMethods.removeEl(elm);
                            });
                            //Newly inserted affiliation delete issue - 29_DEC_22_AN
                            if (['w_link', 'wo_link'].includes(this.current_stack.area_sub)) {
                                _.queryHandle(curElm, 'aff');
                                Obj.MetaGroup.querySelector(`.aff[id="${_.current_stack.elm.id}"]`).remove();
                            }
                            return true;
                        }
                    } else return false;
                }
            } else if (ACTION == RIGHT_MOVE || ACTION == LEFT_MOVE) {
                const affiliations = Array.from(Obj.coll);
                const currentIndex = affiliations.indexOf(curElm);
                const moveIndex = ACTION == LEFT_MOVE ? currentIndex - 1 : currentIndex + 1;
                const moveSibling = affiliations[moveIndex];
                if (!moveSibling) return false;
                if (ACTION == LEFT_MOVE) {
                    curElm.parentNode.insertBefore(curElm, moveSibling);
                } else {
                    moveSibling.insertAdjacentElement('afterend', curElm);
                }
                this.current_stack.lab = curElm.dataset.label;
                return true;
            } else if (ACTION == LINK) {
                try {
                    debug.log('Link Start');
                    let xref_len = curElm.querySelectorAll('a').length;
                    let IsNewAuth = ((xref_len == 0) || ((curElm.getAttribute('data-new')) && (xref_len == 0))) ? (true) : (false);
                    var rid = Array.from(Obj.Sel_Text.split(','), (lab) => {
                        if (lab) {
                            var xref_find = Obj.MetaGroup.querySelector(`div[data-label="${lab}"]:not(.contrib)`);
                            if (xref_find) {
                                Obj.elm = xref_find;
                                return xref_find.id;
                            }
                        }
                    });
                    debug.log(rid);
                    let [lab_text, replace_node, string] = ["", null, []];
                    if (rid.length > 0 && !rid.includes(undefined)) {
                        // ? 16_MAR_2023 - YA = IF NEW LABEL INSIDE-OF SUP/A ELEMENT 
                        curElm.querySelectorAll("sup>insert,a>insert").forEach(elm => {
                            elm.closest(".contrib").append(elm);
                        });
                        if (!IsNewAuth) {
                            Array.from(curElm.childNodes).forEach(function(node, ind, arr) {
                                let [IsElmNode, ElmTag] = [node.nodeType == Node.ELEMENT_NODE, node.tagName];
                                if (node.nodeType == Node.TEXT_NODE || (IsElmNode && (ElmTag == 'INSERT'))) {
                                    if (node.textContent == ' ') return;
                                    lab_text = node.textContent;
                                    replace_node = node;
                                }
                            });
                        } else if (IsNewAuth) {
                            lab_text = Obj.Sel_Text;
                            let last_text = Obj.nameGroup.querySelector('.surname').textContent;
                            let StartString = last_text.length - (Obj.Sel_Text.length);
                            Obj.nameGroup.querySelector('.surname').textContent = last_text.slice(0, StartString);
                        }
                        if (lab_text.length > 0) {
                            // ? details for tc messages
                            this.current_stack.area_sub = 'add';
                            this.current_stack.lab = lab_text;
                            lab_text.split(',').forEach(function(char, index, ar) {
                                let find = GlobalEditor.document.$.querySelector(`div[data-label="${char}"]:not(.contrib)`);
                                if (find) string.push(_.Get_Template('xref_sup', {
                                    label: char,
                                    role: find.dataset.name,
                                    type: find.dataset.name,
                                    rid: find.id
                                }));
                            });
                            var fragment = document.createRange().createContextualFragment(string.join(''));
                            if (replace_node) replace_node.replaceWith(fragment);
                            else {
                                commonMethods.insertAfter(fragment, Obj.nameGroup);
                            }
                            if (this.Auto_ReNumber_AG_AFF && IS_JOURNAL) {
                                $(contribGroup).find('.contrib').each(function(x, y) {
                                    _.OrderNewLink(this);
                                });
                            }
                            return true;
                        } else return false;
                    } else if (rid.length == 0 || rid.includes(undefined)) {
                        AlertNewDialog.fire('warning', 'Warning', `Kindly provide the label from the affiliation list to the author group`, 'OK', '');
                    }
                } catch (err) {
                    console.log(err.message);
                    ErrorLogTrace('AffiliationGroup' + ACTION, err.message);
                }
            }
        } catch (err) {
            this.DOM_Auth(true);
            console.log(err.message);
            ErrorLogTrace('AffiliationGroup', err.message);
        }
    },
    AuthorGroup: async function(contrib, ACTION, _ = AuthorGroupNewModule) {
        if (!this.AuthDOM) this.AuthDOM = document.getElementById('AuthDOM');
        try {
            var Obj = {
                contribGrp: contrib.closest('.contrib-group'),
                articlemeta: contrib.closest('.article-meta'),
                coll: contrib.parentElement.querySelectorAll('.contrib'),
                cur_ind: Array.prototype.indexOf.call(contrib.parentElement.querySelectorAll('.contrib'), contrib),
                last_ind: null,
                last_elm: null
            };
            Obj.last_elm = [].slice.call(Obj.coll).pop();
            Obj.last_ind = Array.prototype.indexOf.call(Obj.coll, Obj.last_elm);
            Obj.IsLast = Obj.last_ind == Obj.cur_ind;
            var IsConfirm = false;
            // ? check missing xref value
            // ? https://stackblitz.com/edit/js-e6a4tf?file=index.js,index.html,style.css
            Obj.contribGrp.querySelectorAll('.xref').forEach(elm => {
                if (elm.querySelectorAll(".sup").length == 0 && elm.innerText != "") {
                    elm.firstChild.replaceWith(_.Get_Template('sup', {
                        value: elm.innerText,
                        frag: true
                    }));
                }
            });
            // TODO Here Append DOM
            console.log('AuthorGroup -- ' + ACTION);
            this.current_stack = {
                call: ACTION
            };
            const isAllowed = getConfig('author', 'notallowed') === 'yes';
            const editOnlyAuthor = getConfig('author', 'add-edit') === 'dialog';
            const allowedAuthoronly = isAllowed && editOnlyAuthor;


            let IsPending_Action = allowedAuthoronly ? null : this.checkAuthorLink(Obj.contribGrp, ACTION == DELETE ? contrib.id : null) || null;

            if (IsPending_Action) return debug.log("Link Missing");


            if (ACTION == DELETE) {
                // ? check author affiliation cross link alert modified by DR/YA
                // ? https://stackblitz.com/edit/js-w8pwr7?file=index.js
                let xrefID = '';
                let Validate = {
                    Count: 0,
                    ToRemove: [],
                    label: []
                };
                if (IS_JOURNAL && (!_.M_SCOPE.IS_SINGLE_AFF) && (contrib.querySelectorAll('.xref').length != 0)) {
                    xrefID = Array.from(contrib.querySelectorAll('.xref'), (el) => el.getAttribute('rid')).filter(Boolean).join(' ').split(' ');
                    Validate = _.CheckOrderAuthGroup(Obj.contribGrp.cloneNode(true), contrib.cloneNode(true), Obj.articlemeta.cloneNode(true)) || Validate;
                }
                var auth_name = _.tempName(contrib);
                if (Validate.Count > 0 || Validate.Count == 0) {
                    let msg = _.Get_Template(ALERT_MESSAGE['AG_AFF_GROUP'][Validate.Count == 0 ? 'DEL_AUTH' : 'DEL_AUTH_W_AFF'], {
                        name: auth_name,
                        label: Validate.label.join(','),
                        alert_msg: true
                    });
                    let ALRT_ID = `authorDelete00${Validate.Count == 0 ? '1' : '2'}`;
                    IsConfirm = await IMPACT_ALERT(ALRT_ID, {
                        p_text: msg,
                        //s_text: auth_name,
                        author: auth_name
                    });
                }
                if (!IsConfirm) return;
                _.queryHandle(contrib, 'author');
                // ? Delete the Author Name 
                $(contrib).remove();
                if (IsConfirm) {
                    let del_type = 'wo_link';
                    if (xrefID && xrefID.length > 0) {
                        del_type = 'w_link';
                        $.each(Validate.ToRemove, function(index, value) {
                            if (!!Obj.contribGrp.querySelector('[id="' + value + '"]')) {
                                Obj.contribGrp.querySelector('[id="' + value + '"]').remove();
                            }
                        });
                    }
                    this.current_stack.area_sub = del_type;
                    //that.AG_TC(Obj.contribGrp, oldStructure, ['AuthorGroupModule', ACTION, del_type, auth_name]);
                    return true;
                }
            } else if (ACTION == ADD) {
                commonMethods.insertAfter(_.Get_Template('author', {
                    IsLastName: Obj.IsLast
                }), contrib);
                this.current_stack.elm = contrib.nextElementSibling;
                return true;
            } else if (ACTION == SWAP) {
                let tempSurName = contrib.querySelector('.surname').innerHTML;
                $(contrib).find('.surname').html('').append(contrib.querySelector('.given-names').innerHTML);
                $(contrib).find('.given-names').html('').append(tempSurName);
                return true;
            } else if (ACTION == RIGHT_MOVE || ACTION == LEFT_MOVE) {
                let [_prevElm, _nextElm] = [contrib.previousElementSibling, contrib.nextElementSibling];
                const moveSibling = ACTION == LEFT_MOVE ? _prevElm : _nextElm;
                if (!moveSibling) return false;
                if (ACTION == LEFT_MOVE) {
                    Obj.contribGrp.insertBefore(contrib, _prevElm);
                } else Obj.contribGrp.insertBefore(_nextElm, contrib);
                return true;
            }
        } catch (err) {
            this.DOM_Auth(true);
            console.log(err.message);
            ErrorLogTrace('AuthorGroup_NEW', err.message);
        }
    },
    LinkRenumbering: async function(DOM, param, Options, _ = AuthorGroupNewModule) {
        if (!this.AuthDOM && _.IS_DOM_MANIPULATE) this.AuthDOM = document.getElementById('AuthDOM');
        Options = Options ? Options : ({
            IsAuthorNote: false
        });
        try {
            AutoSaveBool = false;
            var [parent, that, bool] = [null, this, true];
            let findGroup = Options.IsAuthorNote ? '.article-meta' : '.contrib-group';
            let findKey = Options.IsAuthorNote ? '.fn' : '.aff';
            let cur_order = that.M_SCOPE[Options.IsAuthorNote ? 'Indicate_fn' : 'Indicate_aff'];
            if (_.IS_DOM_MANIPULATE) {
                if (!DOM) {
                    var temp = GlobalEditor.document.getById($(findGroup).attr('id')).$;
                    $(this.AuthDOM).html('').append(temp);
                }
                DOM = this.AuthDOM;
                parent = this.AuthDOM.querySelector(findGroup);
            } else {
                parent = DOM.querySelector(findGroup);
            }
            var InsertNode = $(parent).find('.contrib').find('.ice-ins');
            var InsertNodeText = $(InsertNode).text();
            var InsertNodePar = InsertNode.parent();
            var AuthorCount = $(parent).find('.contrib').length;
            var XrefCount = $(parent).find('.contrib>.xref').length;
            var supCount = $(parent).find('.contrib .xref sup').length;
            var xInsref = InsertNode.length;
            // ? 23_JUL_2023_YA_MISSING_SUP_TAGS
            if (XrefCount > 0 && supCount != XrefCount) {
                var replaceTxtSymbol = {
                    "||": "‖"
                };
                parent.querySelectorAll(".contrib .xref").forEach(function(el, idx, arr) {
                    let [supFind, piFind] = [el.querySelector("sup"), el.querySelector("span.pistart[data-pistart]")];
                    if (!supFind) {
                        let [txt, symbolReplaced] = [el.textContent, false];
                        if (txt != "") {
                            if (replaceTxtSymbol[txt]) {
                                txt = replaceTxtSymbol[txt];
                                symbolReplaced = true;
                            }
                            let supDom = _.Get_Template('sup', {
                                value: txt,
                                frag: true,
                                dom: true
                            });
                            if ((supDom.textContent == el.textContent) || symbolReplaced) {
                                // ? https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceChildren
                                el.replaceChildren(supDom);
                            }
                        } else if (piFind) {
                            /* 
                                ! IBDJNL_OUP
                                <a class="xref" rid="AF0001"><span data-name="pistart" data-pi="PI" data-pistart="*"></span></a>
                            */


                        }
                    }
                });
            }
            if (xInsref > 0 && $(InsertNodePar).hasClass('contrib')) {
                //?OUP_J_AUG_033_Firefox_105 Renumbering Issue Fixed by DR
                InsertNodePar.each((ind, element) => {
                    if ($(element).parent().hasClass('contrib')) {
                        AlertNewDialog.fire('warning', 'Warning', `Please link the inserted label with affiliation "${InsertNodeText}".`, 'OK', '');
                        return debug.log("--unlinked labels found--");
                    }
                });
            }
            if (AuthorCount != XrefCount && (param != DELETE && param != DELETE_LINK)) {
                // ? AuthorCount != XrefCount && param != DELETE
                let authParent = $(parent).clone();
                if (that.checkAuthorLink(authParent[0] ? authParent[0] : authParent)) return debug.log("--checkAuthorLink--");
            }
            var FIND_OBJ = {
                xref: {
                    ".aff": `.xref[data-role="aff"] .sup`,
                    ".fn": `.xref[data-role="fn"] .sup`
                },
                id_prefix: {
                    ".aff": `AF`,
                    ".fn": `fn-`
                }
            };
            if (bool) {
                var aff = [],
                    cite = [];
                $(parent).find(FIND_OBJ['xref'][findKey]).each(function(index, elm) {
                    var IsExist = $.grep(cite, function(value, index) {
                        return value["Orginal"] == $(elm).text();
                    });
                    if (IsExist.length == 0) {
                        var split = $(elm).text().split(',');
                        $.each(split, function(x, y) {
                            let ind = isNaN(y) ? y : parseInt(y);
                            if ((cur_order.indexOf(ind) != -1 || that.M_SCOPE[Options.IsAuthorNote ? 'Indicate_fn' : 'Indicate_aff'].indexOf(ind) == -1) && ind != '') {
                                var IsExists = $.grep(cite, function(value, index) {
                                    return value["Orginal"] == y;
                                });
                                // ? Update Affiliation Order
                                if (IsExists.length == 0) cite.push({
                                    Orginal: y,
                                    OrginalID: '',
                                    Renumbered: '',
                                    index: 0,
                                    id: ''
                                });
                            }
                        });
                    }
                });
                var UnlinkedAff = [];
                cite = $.grep(cite, function(value, index) {
                    return value["Orginal"] != "";
                });
                $(parent).find(findKey).each(function(idx, val) {
                    var alab = val.getAttribute('data-label');
                    // ? 23_JUL_2023_YA
                    if (!alab) {
                        // ? IBDJNL LABEL WILL BE SUP TAG
                        let sup = val.querySelector('sup');
                        if (sup) {
                            alab = sup.textContent;
                        } else if (!sup) {
                            // TODO - LABLE WILL BE TEXT
                            debug.log("---LABEL_MISSING---");
                            ErrorLogTrace('LinkRenumbering', "LABEL_MISSING");

                        }
                    }
                    aff.push({
                        sup: alab,
                        element: val,
                        SeqNo: -1
                    });
                    var IsExists = $.grep(cite, function(value, index) {
                        return value["Orginal"] == alab;
                    });
                    if (IsExists.length == 0 && alab) {
                        UnlinkedAff.push(alab);
                        cite.push({
                            Orginal: alab,
                            OrginalID: val.id.trim(),
                            Renumbered: '',
                            index: 0,
                            id: ''
                        });
                    } else if (IsExists.length > 0) {
                        IsExists[0]["OrginalID"] = val.id.trim();
                    }
                });

                if (UnlinkedAff.length > 0) {
                    //?For any undefined null by variable
                    bool = await IMPACT_ALERT('Linkrenumber001', {
                        p_text: Mustache.render(ALERT_MESSAGE['AG_AFF_GROUP']['UN_LINK_AFF'], {
                            label: UnlinkedAff.join(',')
                        })
                    });
                }
                if (bool) {
                    $.each(cite, function(index, value) {
                        var sup = '';
                        if (!isNaN(value["Orginal"])) {
                            sup = parseInt(index) + 1;
                        } else sup = cur_order[index];
                        value["Renumbered"] = sup;
                        value["index"] = index;
                    });
                    $.each(cite, function(index, value) {
                        $.each(aff, function(index, val) {
                            if (val["sup"] == value["Orginal"]) {
                                var sel = $(val["element"]);
                                sel.attr('data-label', (value["Renumbered"]));
                                val["element"] = sel;
                                val["SeqNo"] = value["index"];
                            }
                        });
                    });
                    // ? Check Not Mapped affiliation
                    var NotMappedAff = $.grep(aff, function(val, index) {
                        return val["SeqNo"] == -1;
                    });
                    // ? assign new index id for new affiliation order
                    $.each(NotMappedAff, function(index, val) {
                        val["SeqNo"] = cite.length + index;
                    });
                    // ? https://stackoverflow.com/questions/13304543/javascript-sort-array-based-on-another-array
                    aff = aff.sort(function(a, b) {
                        return a.SeqNo - b.SeqNo;
                    });
                    $(parent).find(findKey).remove();
                    $.each(aff, function(index, val) {
                        let appendGroup = DOM.querySelector(Options.IsAuthorNote ? '.author-notes' : '.contrib-group');
                        // ? for also foot-note  indicator
                        $(appendGroup).append(val["element"]);
                    });
                    $(parent).find(findKey).each(function(index, elm) {
                        var selsup = $.grep(cite, function(val, index) {
                            return val["Renumbered"] == $(elm).attr('data-label');
                        });
                        let prefix = FIND_OBJ['id_prefix'][findKey];
                        let newId = prefix + ((index + 1).toString().lpad("0", 4));
                        $(elm).attr('id', newId);
                        if (selsup[0])
                            selsup[0]["id"] = newId;
                    });
                    $(parent).find(FIND_OBJ['xref'][findKey]).each(function(index, elm) {
                        if ($(elm).text().split(',').length > 0) {
                            $.each($(elm).text().split(','), function(x, y) {
                                var selsup = $.grep(cite, function(val, index) {
                                    return val["Orginal"] == y;
                                });
                                if (selsup.length > 0) {
                                    $(elm).text($(elm).text().replace(selsup[0]["Orginal"], selsup[0]["Renumbered"]));
                                    $(elm.parentElement).attr("rid", $(elm.parentElement).attr("rid").replace(selsup[0]["OrginalID"], selsup[0]["id"]));
                                }
                            });
                        }
                    });
                    $(parent).find('.contrib').each(function() {
                        that.OrderNewLink(this);
                    });
                }
            }
            if (_.IS_DOM_MANIPULATE) {
                if (!DOM) {
                    $(GlobalEditor.findOne(findGroup).$).replaceWith(this.AuthDOM.innerHTML);
                    this.AuthDOM.innerHTML = '';
                }
            }
            AutoSaveBool = true;
            return bool;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('LinkRenumbering', err.message);
        }
    }
};
const parseEl = (el) => {
    try {
        // If it's a jQuery-wrapped element with a DOM node
        if (el && el.$ && typeof el.$.cloneNode === "function") {
            return el.$.cloneNode(true);
        }
        // If it's a raw DOM node
        if (el && typeof el.cloneNode === "function") {
            return el.cloneNode(true);
        }
        // Fallback: jQuery clone, return raw node
        return $(el).clone(true)[0];
    } catch (err) {
        console.error("parseEl failed:", err);
        return document.createElement("div"); // safe fallback
    }
};
document.addEventListener('DOMContentLoaded', function(event) {
    CKEDITOR.on('instanceReady', function(ev) {
        if (ev.editor.contextMenu) {
            ev.editor.contextMenu.addListener(function(element, selection, elementPath) {
                if (EDITOR_CURSOR.IS_FRONT) {
                    debug.log("AUTHOR GROUP");
                    // GlobalEditor.insertText('==AUTHOR GROUP==');
                    let IS_AU_NOTES = IsNodeContain(elementPath, SEARCH_KEY['an'], false);
                    let IS_AU_GROUP = IsNodeContain(elementPath, SEARCH_KEY['cg'], false);
                    let fnBool = IsNodeContain(elementPath, SEARCH_KEY['fn'], false);
                    let CorresBool = IsNodeContain(elementPath, SEARCH_KEY['cor'], false);
                    var IMS = IMPACT_SELECTION,
                        self = AuthorGroupNewModule,
                        FRONT_RETURN = {};

                    if (!IS_AU_GROUP && !IS_AU_NOTES) {
                        return false;
                    }
                    if (!self.Initiated) {
                        self.init();
                    }
                    let {
                        SHOW_CONTEXT_GROUP,
                        SHOW_CONTEXT_GROUP_DIALOG,
                        SHOW_CONTEXT_GROUP_NOTES,
                        SHOW_CONTEXT_GROUP_AUTHOR,
                        SHOW_CONTEXT_GROUP_AFF,
                        affiliation
                    } = self.M_CONFIG;
                    if (!SHOW_CONTEXT_GROUP && !SHOW_CONTEXT_GROUP_DIALOG && SHOW_CONTEXT_GROUP_NOTES) {
                        return false;
                    }
                    var ELEM_TAG = element.getName(),
                        ELEM_ClS = element.$.getAttribute('data-name');
                    // Get the contributor element, handling different possible element structures
                    const contribGroup = (element.$).closest('.contrib-group');
                    const contribElement = (element.$ ? element.$ : element).closest('.contrib');
                    const IsEditor = (function() {
                        var hasEditorInGroup = contribGroup && contribGroup.querySelector('[contrib-type="editor"]');
                        var isEditorElement = contribElement && contribElement.getAttribute && contribElement.getAttribute('contrib-type') === 'editor';

                        if (!hasEditorInGroup && !isEditorElement) {
                            var hasAnyContribTypeInGroup = contribGroup && contribGroup.querySelector('[contrib-type]');
                            var hasAnyContribTypeInElement = contribElement && contribElement.getAttribute && contribElement.getAttribute('contrib-type');
                            return !(hasAnyContribTypeInGroup || hasAnyContribTypeInElement);
                        }

                        return false;
                    })();

                    if (IS_AU_NOTES && SHOW_CONTEXT_GROUP_NOTES && AuthorGroupNewModule.Initiated) {
                        if (CorresBool || fnBool) {
                            var curInd, curNode, parent, mFind, firstNode, lastNode, firstInd, lastInd, corDiv, fnDiv, AddMenu = false;
                            var AddMenuLab, curNodeType, newNodeType, oChild, mChildLen, LabelSuffix;

                            curNode = $(element.$);
                            curNode = (curNode.hasClass(fnBool ? 'fn' : 'corresp')) ? (curNode) : (curNode.parents(fnBool ? 'div.fn' : 'div.corresp'));
                            LabelSuffix = fnBool ? 'Author Notes' : 'Correspondence';
                            mFind = (fnBool) ? ('div.fn') : ('div.corresp');
                            parent = $(curNode).parent();
                            corDiv = $(parent).find('div.corresp:not([data-delete])');
                            fnDiv = $(parent).find('div.fn:not([data-delete])');
                            firstNode = $(parent).find(mFind).first();
                            lastNode = $(parent).find(mFind).last();
                            oChild = $(parent).find(mFind);
                            mChildLen = oChild.length;
                            curInd = Array.prototype.indexOf.call(oChild, curNode[0]);
                            firstInd = Array.prototype.indexOf.call(oChild, firstNode[0]);
                            lastInd = Array.prototype.indexOf.call(oChild, lastNode[0]);
                            if (fnDiv.length == 0) {

                                AddMenu = true;
                                AddMenuLab = (corDiv.length != 0) ? ('Add Author Notes') : ('Add Correspondence');
                            }
                            curNodeType = (CorresBool) ? ('corresp') : ('fn');
                            newNodeType = (fnBool) ? (corDiv.length == 0 ? ('corresp') : ('fn')) : (fnDiv.length == 0 ? ('fn') : ('corresp'));
                            GlobalEditor.addMenuItems({
                                ADD: {
                                    label: 'Add ' + LabelSuffix,
                                    onClick: function() {
                                        AuthorGroupNewModule.AuthorGroupCorresNotes(ADD, curNodeType, parent, curNode);
                                    },
                                    group: 'AuthorNotesGroup',
                                    icon: '../assets/images/svg/ContextMenu/Add.svg',
                                    order: 71
                                }
                                //?Comment for Unable to receive proper inputs from production Team Command by DURAI.
                                //DELETE: {label: 'Delete '+LabelSuffix,onClick: function() { AuthorGroupNewModule.AuthorGroupCorresNotes(DELETE,curNodeType,parent,curNode); },group: 'AuthorNotesGroup',icon:'../assets/images/svg/ContextMenu/Delete.svg',order: 74},
                                //eADD: {label: AddMenuLab,onClick: function() { AuthorGroupNewModule.AuthorGroupCorresNotes(ADD,newNodeType,parent,curNode); },group: 'AuthorNotesGroup',icon:'../assets/images/svg/ContextMenu/Add.svg',order: 75},
                                //MOVEBEFORE: {label: 'Move Before',onClick: function() { AuthorGroupNewModule.AuthorGroupCorresNotes(LEFT_MOVE,curNodeType,parent,curNode); },group: 'AuthorNotesGroup',icon:'../assets/images/svg/ContextMenu/MoveBefore.svg',order: 72},
                                //MOVEAFTER: {label: 'Move After',onClick: function() { AuthorGroupNewModule.AuthorGroupCorresNotes(RIGHT_MOVE,curNodeType,parent,curNode); },group: 'AuthorNotesGroup',icon:'../assets/images/svg/ContextMenu/MoveAfter.svg',order: 73},
                            });
                            if (AddMenu) FRONT_RETURN.eADD = CKEDITOR.TRISTATE_OFF;
                        }

                    } else if (SHOW_CONTEXT_GROUP && AuthorGroupNewModule.Initiated) {
                        if (SHOW_CONTEXT_GROUP_AUTHOR && !IsEditor) {
                            //? 20-May-22_YA_ADDED  - Menu will be show after fully config loaded AuthorGroupNewModule.Initiated
                            // ? Author Group listner
                            if (contribGroup) {
                                var _selTextLen = GlobalEditor.getSelection().getSelectedText().length;
                                var _curElm = element.$;
                                // ? set contrib group node
                                var _contrib = (IS_JOURNAL) ? ($(_curElm).parents('.contrib')) : (_curElm.parentNode.parentNode);
                                if ($(_contrib).hasClass('contrib')) {
                                    var [IsNameGrop, fIndexAG, lIndexAG, cuIndexAG, _contribGrp, xTag_len, xRefLen, labLength, contribLen, contribxRefLen, _deleteLink, _canLink] = [null, null, null, null, null, 0, 0, 0, 0, 0, true, false];
                                    // lIndexAG = null,  cuIndexAG = null, _contribGrp, xTag_len = 0, contribLen = 0, _deleteLink = true,  labLength = 0,  IsNameGrop = null,  xRefLen = 0,  _canLink = false; 
                                    _contribGrp = contribGroup;
                                    xTag_len = $(_contribGrp).find('.x').length;
                                    xRefLen = $(_contribGrp).find('.xref').length;
                                    contribxRefLen = $(_contrib).find('.xref').length;
                                    contribLen = $(_contribGrp).find('.contrib').length;
                                    labLength = $(_contribGrp).find('.contrib').find('a.xref').text().trim().split('').length;
                                    IsNameGrop = ($(element.$).parents('.name').length > 0) ? (true) : (element.hasClass("degrees") || element.hasClass("author-comment")) ? (true) : (false);
                                    var temp_ind_f = $(_contribGrp).find('.contrib').first().index(),
                                        temp_ind_cur = $(_contrib).index(),
                                        aLength = $(_contribGrp).find('.contrib').length;
                                    // ? last index
                                    lIndexAG = $(_contribGrp).find('.contrib').last().index();
                                    fIndexAG = (IS_JOURNAL || !IS_JOURNAL) ? (temp_ind_f) : (temp_ind_f - xTag_len);
                                    cuIndexAG = (IS_JOURNAL || !IS_JOURNAL) ? (temp_ind_cur) : (temp_ind_cur - xTag_len);
                                    if (aLength > 0) {
                                        // contribLen==1&&
                                        if ((labLength == 1) || _selTextLen != 1) {
                                            _deleteLink = false;
                                        }
                                        if ((_selTextLen != 0) && ((ELEM_TAG == 'insert') || ((['surname'].includes(ELEM_ClS)) && (contribxRefLen == 0)))) {
                                            _canLink = true;
                                            _deleteLink = false;
                                        }
                                        if (IsNameGrop) {
                                            if (!$(_contrib).attr('contrib-id')) {
                                                FRONT_RETURN.AddAuthorOrchid = CKEDITOR.TRISTATE_OFF;
                                            } else if (!!$(_contrib).attr('contrib-id')) {
                                                FRONT_RETURN.EditAuthorOrchid = CKEDITOR.TRISTATE_OFF;
                                            }
                                            FRONT_RETURN.AddAuthorName = CKEDITOR.TRISTATE_OFF;
                                            FRONT_RETURN.MoveBeforeName = cuIndexAG == fIndexAG ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF;
                                            FRONT_RETURN.MoveAfterName = cuIndexAG == lIndexAG ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF;
                                            FRONT_RETURN.SwapAuthorName = CKEDITOR.TRISTATE_OFF;
                                            FRONT_RETURN.DeleteAuthorName = aLength > 1 ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;
                                            FRONT_RETURN.LinkAffliliation = _canLink ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;
                                            // ? condition for delete link
                                        }
                                        if ((!self.M_SCOPE.IS_SINGLE_AFF) && (affiliation.designators != 'NA')) {
                                            FRONT_RETURN.LinkAffliliation = _canLink ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;
                                            FRONT_RETURN.DeleteAffliliationLink = _deleteLink ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;
                                        }
                                        // ? New Affilaition set Element
                                    }
                                    showNoteBool = true;
                                } else if ((element.$.classList.contains('aff') || element.$.closest('.aff'))) {
                                    if (typeof SHOW_CONTEXT_GROUP_AFF == "boolean" && SHOW_CONTEXT_GROUP_AFF == false) {

                                    } else {
                                        element = element.$.classList.contains('aff') ? element.$ : element.$.closest('.aff');
                                        var AFF_COUNT = element.parentElement.querySelectorAll('.aff').length;
                                        var myAff = element;
                                        var fIndexAFF = $(myAff).parent().find('.aff').first().index();
                                        var lIndexAFF = $(myAff).parent().find('.aff').last().index();
                                        var cuIndexAFF = $(myAff).index();
                                        FRONT_RETURN.AddAffiliation = CKEDITOR.TRISTATE_OFF;
                                        if (!self.M_SCOPE.IS_SINGLE_AFF) FRONT_RETURN.AffDeleteAffiliation = (AFF_COUNT > 1) ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;
                                        if (affiliation.autoReNumber == 'false') {
                                            FRONT_RETURN.AffMoveBefore = (cuIndexAFF == fIndexAFF) ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF;
                                            FRONT_RETURN.AffMoveAfter = (cuIndexAFF == lIndexAFF) ? CKEDITOR.TRISTATE_DISABLED : CKEDITOR.TRISTATE_OFF;
                                        }
                                    }
                                } else if (($(element.$).closest('.name').length > 0 && $(element.$).hasClass('ice-ins'))) {
                                    FRONT_RETURN.LinkAffliliation = CKEDITOR.TRISTATE_OFF;
                                }
                            }
                        }
                        if (SHOW_CONTEXT_GROUP_DIALOG && SHOW_CONTEXT_GROUP_AUTHOR) {
                            if (typeof AuthorEditDialog != "undefined" && !AuthorEditDialog.FullyLoaded) AuthorEditDialog.init();
                            if (contribElement && !IsEditor) {
                                FRONT_RETURN.OpenAuthorDialog = CKEDITOR.TRISTATE_OFF;
                            }
                        }
                    } else {}

                    return FRONT_RETURN;
                }
            });
        }
    });
});
var editor_Listener = function(editor) {
    try {
        if (!editor) editor = (GlobalEditor ? GlobalEditor : CKEDITOR.instances.maineditor);
        var menuGroup = editor._.menuGroups;
        var MENU_GROUP = {
            "AuthorGroup": {
                order: 50,
                cmd: [ADD, LEFT_MOVE, RIGHT_MOVE, DELETE, SWAP, "OpenDialog"]
            },
            "AffiliationGroup": {
                order: 60,
                cmd: [ADD, LEFT_MOVE, RIGHT_MOVE, DELETE, LINK, DELETE_LINK]
            },
            "AuthorNotesGroup": {
                order: 70,
                cmd: [ADD, LEFT_MOVE, RIGHT_MOVE, DELETE, SWAP]
            }
        };
        for (let menu in MENU_GROUP) {
            // debug.log(menu + ": " + JSON.stringify(MENU_GROUP[menu]));
            if (!menuGroup[menu]) {
                editor.addMenuGroup(menu, MENU_GROUP[menu].order);
            }
            MENU_GROUP[menu].cmd.forEach((evt, idx, arr) => {
                GlobalEditor.addCommand(menu + '_' + evt, {
                    // ? 03_JAN_22 - YA
                    exec: editor => {
                        AuthorGroupNewModule.fire(menu, evt);
                    }
                });
            });
        }

        GlobalEditor.addMenuItems({
            AddAuthorName: {
                label: "Add Author",
                icon: '../assets/images/svg/ContextMenu/AddAuthorName.svg',
                command: AG + '_' + ADD,
                group: 'AuthorGroup',
                order: 51
            },
            MoveBeforeName: {
                label: "Move Author Left",
                icon: '../assets/images/svg/ContextMenu/ShiftLeft.svg',
                command: AG + '_' + LEFT_MOVE,
                group: 'AuthorGroup',
                order: 54
            },
            MoveAfterName: {
                label: "Move Author Right",
                icon: '../assets/images/svg/ContextMenu/ShiftRight.svg',
                command: AG + '_' + RIGHT_MOVE,
                group: 'AuthorGroup',
                order: 55
            },
            SwapAuthorName: {
                label: "Swap Given Name/Surname",
                icon: '../assets/images/svg/ContextMenu/SwapGivenSurName.svg',
                command: AG + '_' + SWAP,
                group: 'AuthorGroup',
                order: 56
            },
            DeleteAuthorName: {
                label: "Delete Author with Links",
                icon: '../assets/images/svg/ContextMenu/DeleteAuthorName.svg',
                command: AG + '_' + DELETE,
                group: 'AuthorGroup',
                order: 57
            },
            OpenAuthorDialog: {
                label: "Edit Author",
                icon: '../assets/images/svg/ContextMenu/AddAuthorName.svg',
                command: AG + '_OpenDialog',
                group: 'AuthorGroup',
                order: 58
            },
            AddAffiliation: {
                label: "Add Affiliation",
                icon: '../assets/images/svg/ContextMenu/AddAffiliation.svg',
                command: AFG + '_' + ADD,
                group: AFG,
                order: 61
            },
            AffMoveBefore: {
                label: "Move Affilation Above",
                icon: '../assets/images/svg/ContextMenu/ShiftLeft.svg',
                command: AFG + '_' + LEFT_MOVE,
                group: AFG,
                order: 62
            },
            AffMoveAfter: {
                label: "Move Affiliation Below",
                icon: '../assets/images/svg/ContextMenu/ShiftRight.svg',
                command: AFG + '_' + RIGHT_MOVE,
                group: AFG,
                order: 63
            },
            AffDeleteAffiliation: {
                label: "Delete Affiliation",
                icon: '../assets/images/svg/ContextMenu/DeleteAffiliation.svg',
                command: AFG + '_' + DELETE,
                group: AFG,
                order: 64
            },
            LinkAffliliation: {
                label: "Link Affiliation",
                icon: '../assets/images/svg/ContextMenu/LinkAffiliation.svg',
                command: AFG + '_' + LINK,
                group: AFG,
                order: 65
            },
            DeleteAffliliationLink: {
                label: "Delete Affiliation Link",
                icon: '../assets/images/svg/ContextMenu/DeleteAffiliation.svg',
                command: AFG + '_' + DELETE_LINK,
                group: AFG,
                order: 66
            },
            LinkRenumbering: {
                label: "Link Renumbering",
                icon: '../assets/images/svg/ContextMenu/LinkRenumbering.svg',
                onClick: function() {
                    AuthorGroupNewModule.LinkRenumbering(GlobalEditor);
                },
                group: 'AffiliationGroup',
                order: 67
            }
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('AuthorGroupNewModule.editorListener', err.message);
    }
};