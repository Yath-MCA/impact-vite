//  src/js/dialogModules/docs/citation_workflow_md.md

debug.log("class Citation");
/**
 * 3446352: LWW - Batch 33 Configurations
* ★ NEW METHOD: Get separator between number and part label
* Handles the comma-space separator for AO9 pattern
* ✓ Single part label:     'figure 1A'          (separator = '')
✓ Multiple parts:        'figure 1, A and B'  (separator = ', ')
✓ Range:                 'figures 1A–3D'      (separator = '')
✓ Consecutive figures:   'figures 1–3'        (separator = '')

    3485070: LWW - Batch 36 Configurations

    * ANS, NPT, PEP:

    - Direct citation Figure with two Parts = Figure 1(B), (C)

*/
class namedCitation {
    constructor(order, Options = {}, $this) {
        try {
            if (Options.test) {
                Options = this.TEST_DEMO();
                order = ["CIT0001"];
            }
            $this = this;
            this.ID_ARR = order;
            this.Option = Options ? Options : ({
                new: false
            });
            // ? min and max author to be retain at el stage - 05_DEC_22 - POINT#2
            this.NAMED_REF = iREF_SCOPE.IS_NAME_DATE ? true : false;
            this.root_config = iREF_SCOPE.Reference;
            this.config = iREF_SCOPE.Reference.citation || iREF_SCOPE.Reference.dircite || iREF_SCOPE.Reference.indircite;
            this.Module = CitationNewModule;
            this.Split_Delimiter = / & | and | et al | et al. |\d+| et al., |, | \(/;
            this.AUTH_SELECTOR = {
                "journal": "[person-group-type='author'] .surname,  [person-group-type='author'] .anonymous, .collab",
                "book": "[person-group-type='author'] .surname,  [person-group-type='author'] .anonymous, .collab",
                "default": ".surname,  .anonymous,  .collab"
            };
            this.remove_Selector = `del:not([data-action="Rejected"]), insert[data-action="Rejected"], .font, .target, .PageID, .format, [data-class="ckcommentsfull"]`;

            // Name prefixes that should be ignored during sorting (sorted by length desc for proper matching)
            this.ignorePrefixes = [
                'van der', 'van de', 'van den', 'von der', 'von den', 'de la', 'de las', 'de los',
                'van', 'von', 'de', 'del', 'della', 'delle', 'di', 'da', 'dos', 'das',
                'le', 'la', 'les', 'du', 'des', 'ibn', 'bin', 'ben', 'al', 'el',
                'mac', 'mc', 'o\'', 'fitz', 'saint', 'st', 'ste', 'san', 'santa'
            ].sort((a, b) => b.length - a.length);

            // ? COMMAND BY YA - 20_FEB_23
            this.IsEdit = (Options.edit ? true : false);
            this.Edit_Collection = Options.edit ? Options.ids : [];
            // ? default
            this.TYPE = 'indircite';
            if (this.Module && this.Module.IBOX && this.Module.IBOX.bracketOpt) {
                if (!this.Module.IBOX.bracketOpt.checked) this.TYPE = 'dircite';
            }
            if (!this.NAMED_REF) this.config = Object.assign({}, iREF_SCOPE.Reference[this.TYPE], {
                sup: iREF_SCOPE.Reference['text-format'] == "sup" ? !0 : !1
            });
            this._OP = ( /* this.IsEdit ? "" : */ this.config['openwrap']);
            this._CP = ( /* this.IsEdit ? "" : */ this.config['closewrap']);
            this.FINAL_OUT = [];
            // ! HANDLE ALSO NUMBERED REF / CITATION 
            this.initialize();
            this.GET_CITATION();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Citation_constructor', err.message);
        }
    }
    initialize() {
        try {
            this.CITE_COLLECTION = this.Option && this.Option.json ? this.SET_NAME_YEAR_FROM_JSON() : this.SET_NAME_YEAR();
            if (!Array.isArray(this.CITE_COLLECTION)) this.CITE_COLLECTION = [];
            this.formatter = new RangeFormatter(this.config);
            this.SORTING();
            if (!this.NAMED_REF) this.GET_NUMBER_PATTERNS();
            else this.GET_CHRON_ASCEND();
            const self = this;
            this.Edit_Remove = this.Edit_Collection.map(function(item) {
                if (self.ID_ARR.indexOf(item) === -1 && self.CHECK_CITE_COUNT(item)) {
                    let tempOne = new namedCitation([item]);
                    return tempOne.CITE_COLLECTION[0].citation_txt_org.indirect;
                }
            }).filter(Boolean);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('initialize', err.message);
        }
    }
    CHECK_CITE_COUNT(id) {
        try {
            var selectors = commonMethods.xrefSelectorBuilder(id);
            return (GlobalEditor.document.find(selectors).toArray().length == 1) ? true : false;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CHECK_CITE_COUNT', err.message);
        }
    }
    GET_JSON_AUTHOR_NAME(author) {
        try {
            if (!author) return "";
            if (typeof author === "string") return author.trim();
            const collab = author.collab || author.organization || author.name || author.ref_auCollab;
            if (collab) return String(collab).trim();
            const surname = author.family || author.surname || author.ref_auSurname || "";
            return String(surname || "").trim();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_JSON_AUTHOR_NAME', err.message);
            return "";
        }
    }
    GET_JSON_YEAR(item) {
        try {
            if (!item) return "XXXX";
            if (item.year != null && String(item.year).trim()) return String(item.year).trim();
            const dateData = item.published || item.date || item.created || item['published-print'] || item['published-online'];
            if (dateData && Array.isArray(dateData['date-parts']) && dateData['date-parts'][0]) {
                const year = dateData['date-parts'][0][0];
                if (year != null && String(year).trim()) return String(year).trim();
            }
            if (Array.isArray(dateData) && dateData[0] != null) return String(Array.isArray(dateData[0]) ? dateData[0][0] : dateData[0]).trim();
            return "XXXX";
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_JSON_YEAR', err.message);
            return "XXXX";
        }
    }
    GET_JSON_RID(item, index) {
        try {
            const rid = item && (item.rid || item.id);
            if (rid) return String(rid);
            return "CIT" + String(index + 1).padStart(4, "0");
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_JSON_RID', err.message);
            return "CIT0001";
        }
    }
    SET_NAME_YEAR_FROM_JSON() {
        try {
            return Array.from(this.ID_ARR || []).map((item, index) => {
                const authorList = Array.isArray(item.author) ? item.author :
                    (Array.isArray(item.__author) ? item.__author : []);
                let names = authorList.map((author) => this.GET_JSON_AUTHOR_NAME(author)).filter(Boolean);
                if (!names.length && item.collab) names = [String(item.collab).trim()].filter(Boolean);
                const year = this.GET_JSON_YEAR(item);
                const rid = this.GET_JSON_RID(item, index);
                return {
                    year,
                    names: names.length ? names : ["NO LABEL"],
                    nameString: names.length ? names.join('') : "NO LABEL",
                    rid,
                    collection: [],
                    IS_PLAIN: [names.join(' '), year].filter(Boolean).join(' '),
                    label: String(index + 1)
                };
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SET_NAME_YEAR_FROM_JSON', err.message);
            return [];
        }
    }
    GET_ID(_Id) {
        // ? SETTER
        try {
            if (_Id == null) return _Id;
            const asStr = String(_Id);
            return (!IS_JOURNAL && asStr.indexOf('ref-') == -1) ? ('ref-' + asStr) : (_Id);
        } catch (err) {
            ErrorLogTrace('GET_ID', err.message);
            return _Id;
        }
    }
    GET_ID_FROM_INT(num) {
        try {
            let expend = num.expandNumbers();
            return expend.reduce((accumulator, currentValue) => accumulator + (' CIT' + ((currentValue).toString()).lpad("0", 4)), "").trim();
        } catch (err) {
            ErrorLogTrace('GET_ID_FROM_INT', err.message);
        }
    }
    // ? NUMBER REF-CITE HANDLE
    GET_NUMBER_PATTERNS() {
        try {
            this.NUM_WITH_PAREN.forEach((item, idx, arr) => {
                arr[idx] = {
                    rid: item.rid,
                    citation_txt_org: {
                        indirect: item.label,
                        direct: item.label,
                    },
                    citation_finalString: this.GET_STRING(item, {
                        method: "a"
                    })
                };
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_NUMBER_PATTERNS', err.message);
        }
    }
    CHECK_PART_YEAR(x, y) {
        try {
            let [x_year, y_year, y_part] = [
                x.PARSE_ID_2_INT(null),
                y.PARSE_ID_2_INT(null),
                y.replace(/\d/g, '')
            ];
            if (x_year == y_year) {
                //console.log('y_year-->' + y_part);
                return y_part;
            } else return false;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CHECK_PART_YEAR', err.message);
        }
    }
    IS_DASH_REF(ref, Options = {}) {
        try {
            return ref.textContent.indexOf("——") > -1 ? true : false;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('IS_DASH_REF', err.message);
        }
    }
    getAuthors(ref, selectors) {
        const mixedCitation = ref.querySelector('.mixed-citation');
        if (!mixedCitation) return [];

        // Get all name elements
        const allNames = Array.from(ref.querySelectorAll(selectors));

        // Check if this is a chapter citation
        const chapterTitle = ref.querySelector('.chapter-title');
        const bookTitle = ref.querySelector('.source');

        if (chapterTitle) {
            // This is a chapter in a book
            // Chapter authors appear before the chapter title
            const chapterTitleIndex = Array.from(mixedCitation.childNodes).indexOf(chapterTitle);

            return allNames.filter(nameElement => {
                // Find the nearest parent that's a direct child of mixed-citation
                let currentNode = nameElement;
                while (currentNode && currentNode.parentNode !== mixedCitation) {
                    currentNode = currentNode.parentNode;
                }

                if (!currentNode) return false;

                // Check if this name appears before the chapter title
                const nameIndex = Array.from(mixedCitation.childNodes).indexOf(currentNode);
                return nameIndex < chapterTitleIndex;
            });
        } else if (bookTitle) {
            // Regular book citation
            // Authors appear before the book title
            const titleIndex = Array.from(mixedCitation.childNodes).indexOf(bookTitle);

            return allNames.filter(nameElement => {
                // Find the nearest parent that's a direct child of mixed-citation
                let currentNode = nameElement;
                while (currentNode && currentNode.parentNode !== mixedCitation) {
                    currentNode = currentNode.parentNode;
                }

                if (!currentNode) return false;

                // Check if this name appears before the title
                const nameIndex = Array.from(mixedCitation.childNodes).indexOf(currentNode);
                return nameIndex < titleIndex;
            });
        }

        // If we can't determine the structure, return all names
        return allNames;
    }
    SET_NAME_YEAR() {
        // ? https://stackoverflow.com/questions/10003683/how-can-i-extract-a-number-from-a-string-in-javascript
        // ? https://stackblitz.com/edit/js-p4qxgc?file=index.js
        try {
            let Obj = [];
            debug.log('Start');
            Array.from(this.ID_ARR || []).forEach((id, idx, arr) => {
                if (id == null || (typeof id !== 'string' && typeof id !== 'number')) {
                    console.warn('SET_NAME_YEAR skip invalid id');
                    return;
                }
                const idStr = String(id);
                let [ID, Is_Plain_Txt, NAME_COLL] = [this.GET_ID(idStr), false, []];
                let ref = this.Option.new ? this.Option.ref : GlobalEditor.document.getById(ID);
                if (!ref) {
                    console.log('falied');
                    return;
                }
                if (ref.$) ref = ref.$;
                const mixedCitation = ref.querySelector(".mixed-citation");
                if (!mixedCitation) {
                    console.warn('SET_NAME_YEAR skip ref without mixed-citation');
                    return;
                }
                let [IsDashRef, tick_ref, type] = [false, ref, mixedCitation.getAttribute("publication-type")];
                let [AG_SELECTOR, AG_SELECTOR_DEFAULT, reTurnArr] = [this.AUTH_SELECTOR[this.AUTH_SELECTOR[type] ? type : "default"], this.AUTH_SELECTOR.default, []];
                if (["book", "ed-book"].includes(type) || !IS_JOURNAL) {
                    reTurnArr = [AG_SELECTOR, AG_SELECTOR_DEFAULT].map(function(selector, idx) {
                        return ref.querySelectorAll(selector).length;
                    });
                    if (reTurnArr[0] == 0 && reTurnArr[1] > 0) {
                        AG_SELECTOR = AG_SELECTOR_DEFAULT;
                    }
                }
                if (ref) {
                    IsDashRef = this.IS_DASH_REF(ref);
                    let cur_names_list = this.getAuthors(ref, AG_SELECTOR); //ref.querySelectorAll(AG_SELECTOR)
                    if (!IS_JOURNAL) {
                        if (cur_names_list.length == 0) cur_names_list = this.getAuthors(ref, AG_SELECTOR_DEFAULT); //ref.querySelectorAll(AG_SELECTOR_DEFAULT);
                        let chapTitle = ref.querySelector('.chapter-title'),
                            mixed_group = ref.querySelector('.mixed-citation');
                        if (chapTitle) {
                            var chapIndex = chapTitle ? Array.from(mixed_group.childNodes).indexOf(chapTitle) : 99;
                            cur_names_list = Array.from(cur_names_list).map(function(person) {
                                return Array.from(mixed_group.childNodes).indexOf(person.parentElement) < chapIndex ? person : null;
                            }).filter(Boolean);
                        }
                    }
                    if (cur_names_list.length != 0) {
                        NAME_COLL = NAME_COLL.concat(...cur_names_list);
                    }
                    if (ref.hasAttribute('data-authorgroup-replica-id')) {
                        let replica_id = ref.getAttribute('data-authorgroup-replica-id');
                        let Name_replica_Ref = ref.parentElement.querySelector(`#${replica_id}`);
                        if (Name_replica_Ref) {
                            let find = Name_replica_Ref.querySelectorAll(AG_SELECTOR);
                            if (find.length > 0) {
                                NAME_COLL[NAME_COLL.length == 0 ? "push" : "unshift"](find[0]);
                            }
                        }
                    }
                    if (NAME_COLL.length == 0) {
                        if ((ref.hasAttribute("data-new") || ref.hasAttribute("data-cite-label"))) {
                            let new_ref = this.GET_CITE_FOR_NEW_REF_PLAIN_TXT(ref);
                            if (new_ref) {
                                ref = new_ref;
                                Is_Plain_Txt = true;
                                ref.id = tick_ref.id;
                            }
                        }
                    }
                    // ? console.log(/(\d{4}?=.)|(\d{4})/.exec(key_year));
                    let [key_year, tRef] = ["XXXX", ref.cloneNode(true)];
                    if (tick_ref.id != ref.id) {
                        tRef = tick_ref.cloneNode(true);
                    }
                    $(tRef).find(this.remove_Selector).remove();
                    if (tRef.querySelector('.year')) {
                        key_year = tRef.querySelector('.year').textContent;
                    } else {
                        let [year_regex, yr] = [/\d{4}[\–]?[\d{2,4}]?/gi, ""];
                        if (tRef.hasAttribute("data-cite-label")) {
                            yr = tRef.getAttribute("data-cite-label").match(year_regex);
                        } else {
                            yr = tRef.textContent.match(year_regex);
                        }
                        if (yr != null) {
                            key_year = yr[0];
                        } else key_year = "XXXX";
                        //if (key_year.length < 4 /* || key_year.length > 5 */ ) key_year = "XXXX";
                    }
                    debug.log('Pass--' + ID + `---` + key_year);
                    //let NAME_COLL = ref.querySelectorAll(AG_SELECTOR);
                    let final_name_list = Array.from(NAME_COLL).map((el) => {
                        $(el).find(this.remove_Selector).remove();
                        return el.textContent;
                    }).filter(Boolean);
                    if (final_name_list.length == 0 && Is_Plain_Txt) {
                        // ? handle insert citation - plain text reference
                        final_name_list = Array.from(tRef.textContent.split(this.Split_Delimiter)).map((txt) => {
                            return !txt.match(/\d/) && txt.replace(/\(|\)|;|\./, '').trim();
                        }).filter(Boolean);
                    }
                    Obj.push({
                        year: key_year,
                        names: final_name_list.length > 0 ? final_name_list : ["NO LABEL"],
                        nameString: final_name_list.length > 0 ? final_name_list.join('') : "NO LABEL",
                        rid: ID,
                        collection: NAME_COLL,
                        IS_PLAIN: /* Is_Plain_Txt ? tRef.textContent : "" */ tRef.textContent,
                        label: idStr.PARSE_ID_2_INT()
                    });
                    //return Obj;
                } else {
                    console.log('falied');
                }
            });
            // console.log(Obj);
            return Obj;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SET_NAME_YEAR', err.message);
            return [];
        }
    }
    // Update your TEXT_COMPARE method
    TEXT_COMPARE(a, b) {
        try {
            const aFirstName = a.names && a.names.length > 0 ? a.names[0] : '';
            const bFirstName = b.names && b.names.length > 0 ? b.names[0] : '';

            return this.getSortableSurname(aFirstName)
                .localeCompare(this.getSortableSurname(bFirstName));
        } catch (err) {
            console.warn(err.message);
            return ('' + a.nameString).localeCompare(b.nameString);
        }
    }
    YEAR_COMPARE(a, b) {
        try {
            if (a.year < b.year) return -1;
            if (a.year > b.year) return 1;
            return 0;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('TEXT_COMPARE', err.message);
        }
    }
    SUB_SORTING(ArrList, Options) {
        try {
            // TODO YEAR WITH A AND B 05_DEC_22_MOM_POINT#1
            let that = this;
            return ArrList.sort(function(a, b) {
                if (Options.sort_by == "name") {
                    let reTurnVal = that.TEXT_COMPARE(a, b);
                    if (Options.with_compare == "year") {
                        if (a.year == b.year) {
                            return that.YEAR_COMPARE(a, b);
                        } else return 0;
                    } else return reTurnVal;
                } else if (Options.sort_by == "year") {
                    let reTurnVal = that.YEAR_COMPARE(a, b);
                    if (Options.with_compare == "name") {
                        if (a.nameString == b.nameString) {
                            return that.TEXT_COMPARE(a, b);
                        } else return 0;
                    } else return reTurnVal;
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SUB_SORTING', err.message);
        }
    }
    // ? getter
    SORTING_OLD() {
        try {
            // ? https://stackoverflow.com/questions/51165/how-to-sort-strings-in-javascript
            // ? https://stackoverflow.com/questions/28560801/javascript-sorting-array-by-multiple-criteria
            // ? We ascent sort it out
            // ? slice for duplicate for ordering the collection
            if ((this.CITE_COLLECTION || []).length > 1) {
                this.CHRON_ASCEND = this.SUB_SORTING(this.CITE_COLLECTION.slice(0).sort(this.YEAR_COMPARE), {
                    sort_by: "year",
                    with_compare: "name"
                });
                // ? here decent sort it out
                this.CHRON_DESCEND = this.SUB_SORTING(this.CITE_COLLECTION.slice(0).sort(this.YEAR_COMPARE).reverse(), {
                    sort_by: "year",
                    with_compare: "name"
                });
                this.ALPHA_ASCEND = this.SUB_SORTING(this.CITE_COLLECTION.slice(0).sort(this.TEXT_COMPARE), {
                    sort_by: "name",
                    with_compare: "year"
                });
                this.ALPHA_DESCEND = this.ALPHA_ASCEND;
                this.FOLLOW_AUTHOR = this.CHRON_ASCEND;
            } else {
                this.CHRON_ASCEND = this.ALPHA_ASCEND = this.CHRON_DESCEND = this.FOLLOW_AUTHOR = this.CITE_COLLECTION;
            }
            // ! NUMBER PATTERN
            this.NUM_WITH_PAREN = this.NUM_WITH_PAREN_SUP = this.NUM_WITHOUT_PAREN_SUP = this.CITE_COLLECTION;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SORTING', err.message);
        }
    }
    GET_TEMPLATE_STRING(key, Options = {}) {
        try {
            var list_of_string = {
                "a": `<a class="xref" data-name="xref" data-role=${this.root_config['ref-type']} ref-type=${this.root_config['ref-type']} rid="${Options.rid}" href="#${Options.rid}">${Options.data}</a>`,
                "et_al": `<em class="italic" data-name="italic">${Options.data}</em>`
            };
            var rString = list_of_string[key];
            //console.log(rString);
            return rString;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_TEMPLATE_STRING', err.message);
        }
    }
    GET_STRING(item, Options = {}, $this) {
        $this = this;
        try {
            if (Options.method == "a") {
                // <a class="xref" data-name="xref" data-role="bibr" ref-type="bibr" rid="CIT0026" href="#CIT0026">Larsson et al. 2016</a>
                let final_year = Options.year ? Options.year : item.year;
                //`<a class="xref" data-name="xref" data-role="bibr" ref-type="bibr" rid="${item.rid}" href="#${item.rid}">${Options.onlyYear ? final_year : item.citation_txt_org.direct}</a>`,
                //`<a class="xref" data-name="xref" data-role="bibr" ref-type="bibr" rid="${item.rid}" href="#${item.rid}">${Options.onlyYear ? final_year : item.citation_txt_org.indirect}</a>`
                return {
                    direct: $this.GET_TEMPLATE_STRING("a", {
                        rid: item.rid,
                        data: $this.NAMED_REF ? (Options.onlyYear ? final_year : item.citation_txt_org.direct) : item.label
                    }),
                    indirect: $this.GET_TEMPLATE_STRING("a", {
                        rid: item.rid,
                        data: $this.NAMED_REF ? (Options.onlyYear ? final_year : item.citation_txt_org.indirect) : item.label
                    })
                };
            } else if (Options.method == "etal") {
                let ET_AL = this.config['etal'];
                if (this.config['etal_format'] == "italic") {
                    return this.GET_TEMPLATE_STRING("et_al", {
                        data: ET_AL
                    });
                } else return ET_AL;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_STRING', err.message);
        }
    }
    GET_NAME_ORDER(NameArr, item, type = "", Options = {}) {
        try {
            //let list = [];
            //console.log([NameArr.length, this.config['max-author'], NameArr.length > this.config['max-author']]);
            NameArr = NameArr.filter(Boolean);
            if (NameArr.length > this.config['max-author'] || (item.IS_PLAIN.indexOf("et al") > -1)) {
                // ? more than author count config - MOM_06_DEC_22_POINT#1
                return NameArr[0].concat(" ", this.GET_STRING(null, {
                    method: "etal"
                }));
            } else {
                //  ? single and double author count also handle more than three
                if (NameArr.length > 2) {
                    // ? 18_JULY_2023
                    let sep = this.config['name_last_sep'] ? this.config['name_last_sep'] : ", |, and ";
                    let split = sep.split("|");
                    return NameArr.join2(split[0], split[1]);
                } else {
                    // ? 21_NOV_2023 - YA LWW_BATCH_07
                    let sep = this.config['name_sep'];
                    if ((this.TYPE == "indircite" || type == "indircite") && (!!this.config['indirect_name_sep'])) {
                        sep = this.config['indirect_name_sep'];
                    }
                    return NameArr.join(sep);
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_NAME_ORDER', err.message);
        }
    }
    GET_CHRON_ASCEND() {
        try {
            const loopArray = this && Array.isArray(this.CHRON_ASCEND) ? this.CHRON_ASCEND : [];
            loopArray.forEach((item, idx, arr) => {
                // ? 04_MAR_2024 - YA
                let name_loop = 1,
                    prevItem = (arr[idx - name_loop]),
                    dir_key_sep = this.config['name_year_sep_dir'] ? 'name_year_sep_dir' : 'name_year_sep';

                const indir_name = this.GET_NAME_ORDER(item.names, item, "indircite");
                const dir_name = this.GET_NAME_ORDER(item.names, item);

                arr[idx].rid = item.rid;
                arr[idx].citation_txt_org = {
                    indirect: `${indir_name.concat(this.config['name_year_sep'], item.year)}`,
                    direct: `${dir_name.concat(this.config[dir_key_sep], (this._OP + item.year + this._CP))}`,
                };
                if (idx != 0) {
                    let IsLastYearSame = (item.year == prevItem.year),
                        IsLastNameSame = (item.nameString == prevItem.nameString);
                    if (!IsLastNameSame) {
                        if (item.names.length > this.config['max-author']) {
                            // ? first name only same - reset of them different
                            IsLastNameSame = item.names[0] == prevItem.names[0];
                        }
                    }
                    if (IsLastNameSame && IsLastYearSame) {
                        console.log('NAME-YEAR  SAME -- ' + idx);
                    } else if (IsLastNameSame && !IsLastYearSame) {
                        console.log('NAME SAME || YEAR DIFF -- ' + idx);
                        // ? Initialize previous object and final object from previous item
                        let prevObj = prevItem.citation_txt_org,
                            prevObjFinal = prevItem.citation_finalString;

                        // Loop until citation_finalString of previous item is found
                        while (!prevItem.citation_finalString) {
                            name_loop++;
                            let prev_item = arr[idx - name_loop];
                            // ? If nameString of current item matches with previous item, update previous item and final object
                            if (item.nameString == prev_item.nameString || item.names[0] == prev_item.names[0]) {
                                prevItem = prev_item;
                                prevObjFinal = prev_item.citation_finalString;
                            }
                        }
                        // ? Check if year part label exists, if not use item's year
                        let IsPart_label_Year = this.CHECK_PART_YEAR(prevItem.year, item.year),
                            final_year = (IsPart_label_Year ? IsPart_label_Year : item.year),
                            split_txt = "",
                            split_xref = "",
                            xref = this.GET_STRING(item, {
                                onlyYear: true,
                                year: final_year,
                                method: "a"
                            });

                        // ? Concatenate indirect items with final year
                        prevObj.indirect = prevObj.indirect.concat(', ', final_year), prevObjFinal.indirect = prevObjFinal.indirect.concat(', ', xref.indirect);

                        // ? Split direct items and insert final year before last character
                        split_txt = prevObj.direct.split('');
                        split_txt.splice(-1, 0, ', ', final_year);
                        prevObj.direct = split_txt.join('');

                        // ? Split direct items of final object and insert final year before last character
                        split_xref = prevObjFinal.direct.split('');
                        split_xref.splice(-5, 0, ', ', final_year);
                        prevObjFinal.direct = split_xref = split_xref.join('').split(`" href=`).join(` ${item.rid}" href=`);

                        //console.log(prevObj);
                        debug.log(prevObjFinal);
                    } else if ((!IsLastNameSame && IsLastYearSame) || (!IsLastNameSame && !IsLastYearSame)) {
                        //console.log('YEAR SAME -- ' + idx);
                        arr[idx].citation_finalString =
                            this.GET_STRING(item, {
                                method: "a"
                            });
                    }
                } else {
                    arr[idx].citation_finalString =
                        this.GET_STRING(item, {
                            method: "a"
                        });
                }
            });
            //console.log(this.CHRON_ASCEND);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_CHRON_ASCEND', err.message);
        }
    }
    GET_CHRON_DESCAND() {
        try {

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_CHRON_TYPE_2', err.message);
        }
    }
    GET_ALPHABET_ORDER() {
        try {

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_ALPHABET_ORDER', err.message);
        }
    }
    GET_SUP_DOM(string, Options = {}) {
        try {
            let sup = document.createElement("sup"),
                {
                    outer,
                    append
                } = Options;
            $(sup).attr({
                class: "sup",
                "data-name": "sup"
            });
            if (append) {
                let elm = null;
                if (typeof append == "string") elm = document.createRange().createContextualFragment(append);
                sup.append(elm);
            }
            if (outer) {
                return sup.outerHTML;
            } else return sup;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_SUP', err.message);
        }
    }
    GET_FRAGMENT(_String, Options = {}, $this) {
        // ? https://jsbin.com/zevereyeku/3/edit?js,console
        $this = this;
        try {
            let {
                delVal,
                delRid,
                sup,
                hasSupAncestor
            } = Options, frag = ((typeof _String == "object" && _String.nodeType == 11) ? _String : document.createRange().createContextualFragment(_String));
            if ((sup || $this.config.sup) && !frag.querySelector("sup") && !delVal) {
                let sup = $this.GET_SUP_DOM();
                sup.append(...frag.childNodes);
                frag.append(sup);
            }
            if (delVal) {
                Array.from(frag.querySelectorAll("a")).forEach((item, idx, arr) => {
                    let insert = window._trackManager.getInsNode();
                    if (!hasSupAncestor) {
                        insert.append(...item.childNodes);
                        if (idx != 0) insert.dataset.cid = parseInt(insert.dataset.cid) + idx;
                        item.append(insert);
                    } else {

                    }
                    $(item).attr({
                        "ztxt": delVal,
                        "data-del-val": delVal,
                        "zrid": delRid
                    });
                    if (!delRid) item.removeAttribute("zrid");
                    let IsLast = idx == (arr.length - 1);
                    if (!IsLast) item.removeAttribute("data-del-val");
                });
            }
            return frag;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_FRAGMENT', err.message);
        }
    }
    GET_CITATION($this) {
        $this = this;
        try {
            let TYPE, arr_direct, arr_indirect, indirect_string, direct_string;
            if (this.NAMED_REF) {
                TYPE = this[this.config.type] ? this.config.type : 'CHRON_ASCEND';
                arr_direct = this[TYPE].map(function(a, b) {
                    return a.citation_finalString && a.citation_finalString.direct ? a.citation_finalString.direct : null;
                }).filter(Boolean);
                arr_indirect = this[TYPE].map(function(a, b) {
                    return a.citation_finalString && a.citation_finalString.indirect ? a.citation_finalString.indirect : null;
                }).filter(Boolean);
                //console.log(arr_indirect);
                // indirect_string = this._OP + arr_indirect.join(this.config['indirect_sep']) + this._CP;
                // direct_string = arr_direct.join(this.config['direct_sep']);
            } else {
                // ? this.NUM_WITH_PAREN = this.NUM_WITH_PAREN_SUP = this.NUM_WITHOUT_PAREN_SUP = this.CITE_COLLECTION;
                TYPE = this[this.config.sup] ? `NUM_${this.config.openwrap == "" ? 'WITHOUT' : 'WITH'}_PAREN_SUP` : 'NUM_WITH_PAREN';
                // ! HANDLE
                let numbers = Array.from(this.ID_ARR).map(x => x.PARSE_ID_2_INT()),
                    final_num = this.formatter.formatRanges(numbers);
                // ? 2743416 - 14_JUNE_2024
                if (final_num.isContainsDash() && this.config.range_sep) {
                    final_num = final_num.isContainsDash(null, null, this.config.range_sep);
                }
                arr_direct = arr_indirect = final_num.split(/, |,|; |;/).map(function(a, b) {
                    return $this.GET_TEMPLATE_STRING("a", {
                        rid: $this.GET_ID_FROM_INT(a),
                        data: a
                    });
                }).filter(Boolean);
            }
            // ? 20_MAR_2024_YA
            indirect_string = arr_indirect.join(this.config[this.NAMED_REF ? 'indirect_sep' : 'double_sep']);
            if (!this.IsEdit) indirect_string = this._OP + indirect_string + this._CP;
            direct_string = arr_direct.join(this.config[this.NAMED_REF ? 'direct_sep' : 'double_sep']);
            let createObj = function(key_string, Options = {}) {
                try {
                    let div = document.createElement("div"),
                        {
                            delVal,
                            delRid
                        } = $this.Option;
                    return {
                        text: $(div).html("").html(key_string).text(),
                        string: $this.config.sup ? $this.GET_SUP_DOM(key_string, {
                            append: key_string,
                            outer: !0
                        }) : key_string,
                        frag: $this.GET_FRAGMENT(key_string),
                        frag_append_insert: $this.GET_FRAGMENT(key_string, {
                            delVal: delVal ? delVal : null,
                            delRid: delRid ? delRid : null
                        })
                    };
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('createObj', err.message);
                }
            };
            this.FINAL_OUT.push({
                indirect: createObj(indirect_string),
                direct: createObj(direct_string)
            });
            debug.log(this);
        } catch (err) {
            console.log(err.message);
            ErrorLogTrace('GET_CITATION', err.message);
        }
    }
    TEST_DEMO() {
        try {
            var collection = [
                'de Albrecht (2017)',
                'var can Albrecht & Argueso (2017)',
                'Albrecht et al. (2017)',
                '(Albrecht, 2017)',
                '(Albrecht & Argueso, 2017)',
                '(Albrecht et al., 2017)',
                '(Sun et al., 2018;',
                ' Deng et al., 2020)',
                '(Lindner et al., 2012;',
                ' Li & Zhang, 2014)',
                '(Bohm et al., 2014;',
                ' Couto & Zipfel, 2016;',
                ' Tang et al., 2017)',
                ' Tang et al., 2017)',
                '(Bohm et al., 2014;',
                ' Couto & Zipfel, 2014;',
                ' Tang et al., 2017)',
                '(Bohm et al., 2014;',
                ' Couto, 2014;',
                ' Tang et al., 2017)',
            ];
            var elm = document.createElement("div");
            var item = collection[Math.floor(Math.random() * collection.length)];
            elm.textContent = item;
            let Obj = {
                new: true,
                ref: elm,
                cite: true
            };
            console.log(Obj);
            return Obj;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('TEST_DEMO', err.message);
        }

    }
    GET_CITE_FOR_NEW_REF_PLAIN_TXT(ref, Options = {}) {
        try {
            let label = ref.hasAttribute("data-cite-label") ? ref.getAttribute("data-cite-label") : "";
            let ref_div = document.createElement("div");
            if (label.length == 0) {
                var selectors = commonMethods.xrefSelectorBuilder(ref.id);
                let xref = GlobalEditor.document.findOne(selectors);
                if (xref) {
                    label = xref.$.textContent;
                }
            }
            if (label.length == 0) return false;
            else {
                ref_div.innerHTML = label;
                return ref_div;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_CITE_FOR_NEW_REF_PLAIN_TXT', err.message);
        }
    }
    /**
     * Get sortable surname by removing prefixes (your clean implementation)
     * @param {string} fullName - The full surname
     * @returns {string} - Sortable surname without prefix
     */
    getSortableSurname(fullName) {
        if (!fullName || typeof fullName !== 'string') {
            return '';
        }

        const lower = fullName.toLowerCase().trim();
        for (const prefix of this.ignorePrefixes) {
            if (lower.startsWith(prefix + ' ')) {
                // Remove prefix and return remaining surname
                return fullName.trim().slice(prefix.length + 1);
            }
        }
        // No prefix matched, return as is
        return fullName.trim();
    }

    /**
     * Enhanced text comparison that handles name prefixes correctly
     * @param {object} a - First citation object
     * @param {object} b - Second citation object
     * @returns {number} - Comparison result (-1, 0, 1)
     */
    TEXT_COMPARE_ENHANCED(a, b) {
        try {
            // Get the first author's surname for each citation
            const aFirstName = a.names && a.names.length > 0 ? a.names[0] : '';
            const bFirstName = b.names && b.names.length > 0 ? b.names[0] : '';

            // Extract sortable names
            const aSortable = this.extractSortableName(aFirstName);
            const bSortable = this.extractSortableName(bFirstName);

            // Primary sort by main surname (without prefix)
            const primaryComparison = aSortable.sortable.localeCompare(bSortable.sortable, 'en', {
                sensitivity: 'base',
                numeric: true,
                ignorePunctuation: true
            });

            // If main surnames are the same, sort by prefix
            if (primaryComparison === 0 && (aSortable.prefix || bSortable.prefix)) {
                const aPrefix = aSortable.prefix || '';
                const bPrefix = bSortable.prefix || '';
                const prefixComparison = aPrefix.localeCompare(bPrefix, 'en', {
                    sensitivity: 'base'
                });

                if (prefixComparison !== 0) {
                    return prefixComparison;
                }
            }

            // If still the same, fall back to full name string comparison
            if (primaryComparison === 0) {
                return ('' + a.nameString).localeCompare(b.nameString, 'en', {
                    sensitivity: 'base',
                    numeric: true
                });
            }

            return primaryComparison;
        } catch (err) {
            console.warn('TEXT_COMPARE_ENHANCED error:', err.message);
            ErrorLogTrace('TEXT_COMPARE_ENHANCED', err.message);
            // Fallback to original method
            return this.TEXT_COMPARE(a, b);
        }
    }

    /**
     * Enhanced sorting method that uses the improved text comparison
     */
    SUB_SORTING_ENHANCED(ArrList, Options) {
        try {
            const that = this;
            return ArrList.sort(function(a, b) {
                if (Options.sort_by === "name") {
                    let returnVal = that.TEXT_COMPARE_ENHANCED(a, b);
                    if (Options.with_compare === "year" && returnVal === 0) {
                        return that.YEAR_COMPARE(a, b);
                    }
                    return returnVal;
                } else if (Options.sort_by === "year") {
                    let returnVal = that.YEAR_COMPARE(a, b);
                    if (Options.with_compare === "name" && returnVal === 0) {
                        return that.TEXT_COMPARE_ENHANCED(a, b);
                    }
                    return returnVal;
                }
                return 0;
            });
        } catch (err) {
            console.warn('SUB_SORTING_ENHANCED error:', err.message);
            ErrorLogTrace('SUB_SORTING_ENHANCED', err.message);
            // Fallback to original method
            return this.SUB_SORTING(ArrList, Options);
        }
    }

    /**
     * Override the original SORTING method to use enhanced sorting
     */
    SORTING() {
        try {
            if ((this.CITE_COLLECTION || []).length > 1) {
                // Use enhanced sorting methods
                this.CHRON_ASCEND = this.SUB_SORTING_ENHANCED(
                    this.CITE_COLLECTION.slice(0).sort((a, b) => this.YEAR_COMPARE(a, b)), {
                        sort_by: "year",
                        with_compare: "name"
                    }
                );

                this.CHRON_DESCEND = this.SUB_SORTING_ENHANCED(
                    this.CITE_COLLECTION.slice(0).sort((a, b) => this.YEAR_COMPARE(a, b)).reverse(), {
                        sort_by: "year",
                        with_compare: "name"
                    }
                );

                this.ALPHA_ASCEND = this.SUB_SORTING_ENHANCED(
                    this.CITE_COLLECTION.slice(0), {
                        sort_by: "name",
                        with_compare: "year"
                    }
                );

                this.ALPHA_DESCEND = this.ALPHA_ASCEND.slice(0).reverse();
                this.FOLLOW_AUTHOR = this.CHRON_ASCEND;
            } else {
                this.CHRON_ASCEND = this.ALPHA_ASCEND = this.CHRON_DESCEND = this.FOLLOW_AUTHOR = this.CITE_COLLECTION;
            }

            // Number patterns remain the same
            this.NUM_WITH_PAREN = this.NUM_WITH_PAREN_SUP = this.NUM_WITHOUT_PAREN_SUP = this.CITE_COLLECTION;
        } catch (err) {
            console.warn('SORTING error:', err.message);
            ErrorLogTrace('SORTING', err.message);
        }
    }

    /**
     * Extract the sortable part of a surname by removing prefixes
     * @param {string} surname - The full surname
     * @returns {object} - Object with sortable name and original name
     */
    extractSortableName(surname) {
        if (!surname || typeof surname !== 'string') {
            return {
                sortable: '',
                original: surname || ''
            };
        }

        const trimmed = surname.trim();
        const match = trimmed.match(this.ignorePrefixes);

        if (match) {
            const prefix = match[1];
            const mainName = trimmed.substring(prefix.length).trim();
            return {
                sortable: mainName,
                original: trimmed,
                prefix: prefix
            };
        }

        return {
            sortable: trimmed,
            original: trimmed,
            prefix: null
        };
    }

    /**
     * Utility method to test the sorting with sample names
     */
    testNameSorting() {
        const testNames = [
            "Smith",
            "van der Berg",
            "de Silva",
            "von Neumann",
            "Anderson",
            "van Gogh",
            "de la Cruz",
            "MacDonald",
            "O'Connor",
            "ibn Rushd",
            "ben David",
            "Saint-Exupéry"
        ];

        console.log("Testing name sorting:");
        const sorted = testNames.map(name => ({
            names: [name],
            nameString: name
        })).sort((a, b) => this.TEXT_COMPARE_ENHANCED(a, b));

        sorted.forEach((item, index) => {
            const extracted = this.extractSortableName(item.names[0]);
            console.log(`${index + 1}. ${item.names[0]} (sorts as: "${extracted.sortable}"${extracted.prefix ? ', prefix: "' + extracted.prefix + '"' : ''})`);
        });
    }
}



class CitationforFloats {
    constructor(name, config) {
        this._name = name;
        this.config = config || window.iREF_SCOPE;
        this.citationType = 'dircite';
        this.checkedItems = {};
        this.brackets = {
            dircite: ["(", ")"],
            indircite: ["[", "]"]
        };
        this.initialize();
    }

    initialize() {
        // Fix the bug from original code
        // this._OP = this.config.Figure?.openwrap || this.config.Table?.openwrap || '';
        // this._CP = this.config.Figure?.closewrap || this.config.Table?.closewrap || '';
    }

    extractNumber(label) {
        if (IS_JOURNAL) {
            if (label) {
                const match = label.match(/\d+/);
                return match ? parseInt(match[0], 10) : "";
            }
            return "";
        } else {
            return label ? label.split(" ").pop() : "";
        }
    }


    isSingleFloatLogic() {
        // Extract this logic to avoid global dependencies
        // This would need to be passed in or configured differently

        //   single_item_label="prefix_only"
        try {

            const config = this.config.Figure || this.config.Table || {};
            const captionMeta = config.caption || {};
            const isPrefixOnly = captionMeta.single_item_label === "prefix_only";

            const shownedItemList = document.querySelectorAll(
                '.float-list-group:not(.ds-none,.d-none) .flex-column.row_entry'
            ).length;

            // Shorttitle-specific single-float behavior
            var subType = window.SHARED_KEY && window.SHARED_KEY.subtype || '';
            var shortTitle = window.SHARED_KEY && window.SHARED_KEY.shorttitle || '';
            var isAHA = subType === "AHA";
            const isSpecialShortTitle = isAHA || ['PXT', 'NOR', 'EDE', 'NNE'].includes(shortTitle) || isPrefixOnly;
            const isNotFirstTab = window.CitationNewModule && window.CitationNewModule.M_SCOPE && window.CitationNewModule.M_SCOPE.ACTIVE_TAB !== 0;

            return isSpecialShortTitle && isNotFirstTab && shownedItemList === 1;
        } catch (e) {
            return false;
        }
    }

    // Updated areConsecutive method - only check if figure numbers are consecutive
    // Part labels can be different and don't affect consecutiveness
    areConsecutive(items) {
        if (items.length < 2) return false;

        return items.every((item, index) => {
            if (index === 0) return true;

            const prevNum = this.extractNumber(items[index - 1].label);
            const currNum = this.extractNumber(item.label);

            // Only check if numbers are consecutive, ignore part labels
            return currNum === prevNum + 1;
        });
    }

    formatPartLabel(partLabel, citeConfig, option = {}) {

        if (!partLabel) return '';
        const {
            part_lab_case,
            part_lab_openwrap,
            part_lab_closewrap
        } = citeConfig || {};

        const caseResult = part_lab_case === 'lower' ?
            partLabel.toLowerCase() :
            part_lab_case === 'upper' ?
            partLabel.toUpperCase() :
            partLabel;


        const wrapResults = this.wrapPartLabel(caseResult, citeConfig);
        const finalResults = wrapResults
            .replace(/\bthrough\b/gi, "through")
            .replace(/\bto\b/gi, "to")
            .replace(/\band\b/gi, "and");

        debug.log(finalResults);

        return finalResults;
    }

    wrapPartLabel(partLabel, citeConfig) {

        if (!partLabel) return '';
        const {
            part_lab_openwrap,
            part_lab_closewrap
        } = citeConfig || {};
        const openWrapStr = part_lab_openwrap || '';
        const closeWrapStr = part_lab_closewrap || '';

        const trimmed = String(partLabel).trim();

        // If no wrapper configured, or wrapping-per-part is not enabled, return plain trimmed label
        const wrapEachPart = /true|yes/i.test(citeConfig && citeConfig.part_lab_wrap_each);
        if (!openWrapStr && !closeWrapStr) return trimmed;
        // if (!wrapEachPart) return trimmed;

        const hasConfiguredWrapper = openWrapStr && closeWrapStr;
        const isFullyWrapped = hasConfiguredWrapper && trimmed.startsWith(openWrapStr) && trimmed.endsWith(closeWrapStr);

        // Apply wrapper only when it's not already present
        if (!isFullyWrapped) {
            return `${openWrapStr}${trimmed}${closeWrapStr}`;
        }

        return trimmed;
    }



    createXrefLink(item, displayText, type) {
        // Replace any sequence of whitespace (tabs, newlines, multiple spaces) with a single space
        const normalizedText = displayText.replace(/\s+/g, ' ').trim();
        return `<a class="xref" data-name="xref" data-role="${type}" ref-type="${type}" rid="${item.rid}" href="#${item.rid}">${normalizedText}</a>`;
    }


    getBasePrefix(pattern, citeConfig) {

        const {
            ISstartOfBlock
        } = IMPACT_SELECTION;

        const IsDirectWithPara = ISstartOfBlock && this.citationType === "dircite";

        const beginParaPrefix = citeConfig.beginpara ? citeConfig.beginpara.trim() : "";
        const singlePrefix = citeConfig.single_prefix;
        const doublePrefix = citeConfig.double_prefix;


        let baseKey;

        if (IsDirectWithPara && beginParaPrefix) {
            // Add "s" to beginParaPrefix if double_prefix is requested
            baseKey = pattern === "double_prefix" ? `${beginParaPrefix}s ` : `${beginParaPrefix}`;
        } else {
            baseKey = pattern === "double_prefix" ? doublePrefix : singlePrefix;
        }

        return baseKey;
    }


    normalizeCitationPrefix(pattern, citeConfig) {
        var baseText = citeConfig[pattern];

        let match = null;
        if (this._selText) {
            match = this._selText.match(/\b(fig|figs|tab|tabs|img|imgs|pic|pics)\.?\b/i);
        }

        if (this._isEdit && match) {
            return match[0] + (baseText.endsWith(" ") ? " " : "");
        } else if (!this._isEdit && this.citationType === "dircite") {
            return this.getBasePrefix(pattern, citeConfig);
        }
        return baseText;
    }



    generateSingleCitation(item, citeConfig) {
        const {
            type,
            label
        } = item;
        const number = this.extractNumber(label);

        var baseText = this.normalizeCitationPrefix("single_prefix", citeConfig);

        // No part labels
        if (!item.partlabels || item.partlabels.length === 0) {
            var makeCite = baseText + number;
            if (this._singleFloat) {
                makeCite = baseText.trim();
            }
            return this.createXrefLink(item, makeCite, type);
        }

        const partLabelsStr = Array.isArray(item.partlabels) ? item.partlabels[0] : item.partlabels;

        var results = this.handlePartLabels(item, partLabelsStr, baseText, type, citeConfig);

        if (Array.isArray(results)) {
            results = this.applySeparatorLogic(results, citeConfig, true);
        }

        return results;
    }

    getNumberPartLabelSeparator(citeConfig, parts = []) {
        if (/true|yes/i.test(citeConfig.part_lab_wrap_each)) {
            return '';
        }

        if (parts.length == 2) {
            return citeConfig.number_part_label_double_sep || '';
        }
        return '';
    }


    handlePartLabels(item, partLabelsStr, baseText, type, citeConfig) {

        const bracket = [
            citeConfig.openwrap || "",
            citeConfig.closewrap || ""
        ];

        const number = this.extractNumber(item.label);
        const isSingleFloat = this._singleFloat;

        // No part label — return basic citation
        if (!partLabelsStr) {
            return this.createXrefLink(item, `${baseText}${number}`, type);
        }
        var results = "";
        var suffix = "";
        if (this.isSimplePartLabel(partLabelsStr)) {
            const partLabel = this.formatPartLabel(partLabelsStr, citeConfig);
            var makeCite = `${baseText}${isSingleFloat ? '' : number}${partLabel}`;
            const displayText = `${makeCite}${suffix}`;
            results = this.createXrefLink(item, displayText, type);
        } else {
            // Handle range connectors such as "through" or "to"
            if (/\bthrough\b|\bto\b/i.test(partLabelsStr)) {
                results = this.handleThroughRange(item, partLabelsStr, baseText, bracket, isSingleFloat, type, citeConfig);
            }

            // Handle multiple part labels separated by commas or "and"
            if (/[,\s]?and[,\s]?|,/.test(partLabelsStr)) {
                results = this.handleMultipleParts(item, partLabelsStr, baseText, bracket, isSingleFloat, type, citeConfig);
            }
        }
        return results;
    }

    isSimplePartLabel(partLabelsStr) {
        return partLabelsStr &&
            !partLabelsStr.includes(' and ') &&
            !partLabelsStr.includes(',') &&
            !/\bto\b/i.test(partLabelsStr) &&
            !/\bthrough\b/i.test(partLabelsStr);
    }
    // New method to handle part_lab_prefix_num = "yes"
    generateWithNumberPrefix(item, parts, baseText, bracket, isSingleFloat, type, citeConfig) {
        const number = this.extractNumber(item.label);
        const citations = parts.map((part, index) => {
            const formattedPart = this.formatPartLabel(part, citeConfig);

            if (isSingleFloat) {
                // For single float, wrap all parts in brackets
                if (index === 0) {
                    const displayText = `${baseText} ${number}${formattedPart}`;
                    return this.createXrefLink(item, displayText, type);
                } else if (index === parts.length - 1) {
                    const displayText = `${number}${formattedPart}`;
                    return this.createXrefLink(item, displayText, type);
                } else {
                    const displayText = `${number}${formattedPart}`;
                    return this.createXrefLink(item, displayText, type);
                }
            } else {
                // For regular case, each part gets the number prefix
                const displayText = `${index === 0 ? baseText : ''}${number}${formattedPart}`;
                return this.createXrefLink(item, displayText, type);
            }
        });

        return citations;
    }
    getRangeConnector(partLabelsStr, citeConfig = {}) {
        if (typeof partLabelsStr === 'string') {
            const match = partLabelsStr.match(/\b(through|to)\b/i);
            if (match) {
                return match[0];
            }
        }

        return (citeConfig && citeConfig.range_sep) ? citeConfig.range_sep : 'through';

    }

    handleThroughRange(item, partLabelsStr, baseText, bracket, isSingleFloat, type, citeConfig) {
        const connector = this.getRangeConnector(partLabelsStr, citeConfig);
        const parts = partLabelsStr.split(new RegExp(`\\b${connector}\\b`, 'i')).map(p => p.trim());
        if (parts.length !== 2) return '';

        const number = this.extractNumber(item.label);
        const part1 = this.formatPartLabel(parts[0], citeConfig);
        const part2 = this.formatPartLabel(parts[1], citeConfig);
        const prefixNum = /true|yes/gi.test(citeConfig.part_lab_prefix_num) ? String(number) : "";
        if (isSingleFloat) {
            const displayText = `${baseText} ${bracket[0]}${part1} ${connector} ${part2}${bracket[1]}`;
            return this.createXrefLink(item, displayText, type);
        } else {

            if (!baseText.endsWith(prefixNum)) baseText = baseText + prefixNum;

            const citation1 = this.createXrefLink(item, `${baseText} ${part1} `, type);
            const citation2 = this.createXrefLink(item, `${prefixNum}${part2} `, type);
            const results = `${citation1} ${connector} ${citation2}`;
            debug.log(results);
            return results;
        }
    }

    handleMultipleParts(item, partLabelsStr, baseText, bracket, isSingleFloat, type, citeConfig) {
        const parts = this.parseMultipleParts(partLabelsStr);
        const wrapEachPart = /true|yes/i.test(citeConfig.part_lab_wrap_each);
        var results;
        if (isSingleFloat && !wrapEachPart) {
            results = this.generateSingleWrapped(item, parts, baseText, bracket, isSingleFloat, type, citeConfig);
        } else {
            results = this.generateMultiplePart(item, parts, baseText, bracket, isSingleFloat, type, citeConfig);
        }
        return results;
    }

    parseMultipleParts(partLabelsStr) {
        const parts = [];
        const andParts = partLabelsStr.split(/\s*(?:and|&|,)\s*/);

        andParts.forEach(part => {
            if (part.includes(',')) {
                const commaParts = part.split(',').map(p => p.trim()).filter(p => p);
                parts.push(...commaParts);
            } else {
                parts.push(part.trim());
            }
        });

        // now filter out any leftover empty strings
        debug.log(JSON.stringify(parts));

        return parts.filter(Boolean);
    }

    generateSingleWrapped(item, parts, baseText, bracket, isSingleFloat, type, citeConfig) {
        const processedParts = parts.map(part => this.formatPartLabel(part, citeConfig));
        const partText = this.applySeparatorLogic(processedParts, citeConfig, true);
        const displayText = `${bracket[0]}${baseText}${partText}${bracket[1]}`;
        const results = this.createXrefLink(item, displayText, type);
        return results;
    }

    generateMultiplePart(item, parts, baseText, bracket, isSingleFloat, type, citeConfig) {
        const number = this.extractNumber(item.label);
        const wrapEachPart = /true|yes/i.test(citeConfig.part_lab_wrap_each);
        const prefixNum = /true|yes/gi.test(citeConfig.part_lab_prefix_num) ? String(number) : "";
        const partLabelSeparator = wrapEachPart ? '' : this.getNumberPartLabelSeparator(citeConfig, parts);
        const citations = parts.map((part, index) => {
            const option = wrapEachPart ? {
                full_wrap: true
            } : {
                open_wrap: index === 0,
                close_wrap: index === parts.length - 1,
                full_wrap: false
            };
            const formattedPart = this.formatPartLabel(part, citeConfig, option);
            const prefixText = baseText;
            let displayText = '';


            if (wrapEachPart && !isSingleFloat) {
                if (index === 0) {
                    displayText = `${prefixText}${number}${formattedPart}`;
                } else {
                    displayText = `${formattedPart}`;
                }
            } else if (isSingleFloat) {
                if (index === 0) {
                    displayText = `${prefixText} ${bracket[0]}${formattedPart}`;
                } else if (index === parts.length - 1) {
                    displayText = `${formattedPart}${bracket[1]}`;
                } else {
                    displayText = formattedPart;
                }
            } else {

                if (index > 0) {
                    displayText = prefixNum + formattedPart;
                } else {
                    displayText = prefixText + number + partLabelSeparator + formattedPart;
                }
            }

            return this.createXrefLink(item, displayText, type);
        });

        return citations;
        // return this.applySeparatorLogic(citations, citeConfig);
    }


    // Updated generateConsecutiveRangeCitation to handle different part labels
    generateConsecutiveRangeCitation(items, type, citeConfig) {
        const firstNum = this.extractNumber(items[0].label);
        const lastNum = this.extractNumber(items[items.length - 1].label);
        const rids = items.map(item => item.rid).join(' ');

        // Get part labels from first and last items
        let firstPartLabel = '';
        let lastPartLabel = '';

        if (items[0].partlabels) {
            const partLabelsStr = Array.isArray(items[0].partlabels) ? items[0].partlabels[0] : items[0].partlabels;
            firstPartLabel = this.formatPartLabel(partLabelsStr, citeConfig);
        }

        if (items[items.length - 1].partlabels) {
            const partLabelsStr = Array.isArray(items[items.length - 1].partlabels) ?
                items[items.length - 1].partlabels[0] :
                items[items.length - 1].partlabels;
            lastPartLabel = this.formatPartLabel(partLabelsStr, citeConfig);
        }

        const baseText = this.normalizeCitationPrefix("double_prefix", citeConfig);
        const displayText = `${baseText}${firstNum}${firstPartLabel}${citeConfig.range_sep}${lastNum}${lastPartLabel}`;
        const citation = this.createXrefLink({
            rid: rids
        }, displayText, type);

        return citation;
    }

    applySeparatorLogic(citations, citeConfig, isPartLabel = false) {

        if (!Array.isArray(citations) || citations.length === 0) return '';

        if (typeof citeConfig == "string") {
            const config = this.config[citeConfig] || this.config["Figure"];
            citeConfig = config[this.citationType];
        }

        let {
            double_sep = ', ', last_sep = ' and ', range_sep, part_lab_double_sep
        } = citeConfig;

        if (last_sep.includes('|')) {
            const split = last_sep.split('|');
            double_sep = split[0];
            last_sep = split[1];
        }

        if (isPartLabel) {
            last_sep = part_lab_double_sep || ', ';
            if (!double_sep) double_sep = ', ';
        }

        const count = citations.length;

        if (citations.length === 2 && last_sep && last_sep.startsWith(', ') && last_sep.includes('and')) {
            // removes the first character (",")
            last_sep = last_sep.slice(1);
        }

        if (count === 1) return citations[0];
        // No Oxford comma for 2 items
        if (count === 2) return citations.join(last_sep);

        var isConsecutive = citations.every((cite, index) => {
            if (index === 0) return true;
            const prevNum = citations[index - 1];
            const currNum = cite;
            // Only check if numbers are consecutive, ignore part labels
            return currNum === prevNum + 1;
        });

        if (isConsecutive) {
            return `${citations[0]}${range_sep}${citations[count - 1]}`;
        }

        const allButLast = citations.slice(0, -1).join(double_sep);
        const last = citations[count - 1];

        return `${allButLast}${last_sep}${last}`;

    }


    generateMultipleItemCitations(items, type, citeConfig) {

        const doublePrefix = this.normalizeCitationPrefix("double_prefix", citeConfig);

        const citations = items.map((item, index) => {
            const prefix = index === 0 ? doublePrefix : '';
            return this.handlePartLabels(item, item.partlabels, prefix, type, citeConfig);
        });

        const result = this.applySeparatorLogic(citations, citeConfig);

        // return `${ citeConfig.openwrap }${ result }${ citeConfig.closewrap }`;
        return result;
    }
    applyWrap(html, citeConfig) {
        return `${citeConfig?.openwrap || ''}${html}${citeConfig?.closewrap || ''}`;
    }
    // Updated logic to avoid consecutive ranges when all items have identical part labels
    generateSameTypeCitations(items) {
        if (items.length === 0) return '';

        const type = items[0].type;
        const configKey = type === 'fig' ? 'Figure' : 'Table';
        const config = this.config[configKey];
        const citeConfig = config[this.citationType];

        // Sort items by order
        items.sort((a, b) => a.order - b.order);

        var html;
        // Handle single item
        if (items.length === 1) {
            html = this.generateSingleCitation(items[0], citeConfig);
        } else {
            // Handle multiple items
            const isConsecutive = this.areConsecutive(items);
            const allHavePartLabel = this.allHavePartLabel(items);



            if (isConsecutive && items.length > 2 && !allHavePartLabel) {
                html = this.generateConsecutiveRangeCitation(items, type, citeConfig);
            } else {
                html = this.generateMultipleItemCitations(items, type, citeConfig);
            }
        }

        var finalResults = this.applyWrap(html, citeConfig);
        return finalResults;
    }

    allHavePartLabel(items) {
        // Need at least 3 items: first, middle, last
        if (items.length < 3) return false;

        const isValid = (item) =>
            typeof item.partlabels === 'string' && item.partlabels.trim() !== '';

        const firstHas = isValid(items[0]);
        const lastHas = isValid(items[items.length - 1]);

        const middleHas = items.slice(1, -1).some(isValid);

        return firstHas && lastHas && middleHas;
    }


    flattenNestedObject(nestedObj) {
        const flatObj = {};

        for (const key in nestedObj) {
            const inner = nestedObj[key];

            if (typeof inner === 'object' && inner !== null && !inner.rid) {
                // Nested object - flatten it
                Object.assign(flatObj, inner);
            } else {
                // Already flat entry
                flatObj[key] = inner;
            }
        }

        return flatObj;
    }

    generateCitations() {
        try {


            const itemsToProcess = Object.values(this.checkedItems);

            if (itemsToProcess.length === 0) return '';

            // Group items by type
            const grouped = itemsToProcess.reduce((acc, item) => {
                if (!acc[item.type]) {
                    acc[item.type] = [];
                }
                acc[item.type].push(item);
                return acc;
            }, {});

            // Generate citations for each type
            const results = Object.keys(grouped).map(type => {
                return this.generateSameTypeCitations(grouped[type]);
                // Remove empty citations
            }).filter(citation => citation);

            return results.join(' and ');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('generateCitations', err.message);
        }
    }

    getCitation(checkedItems, options = {}) {
        try {

            const IMS = IMPACT_SELECTION;
            IMS.getInfo();
            const {
                SEL_TEXT
            } = IMS;

            this._mode = SEL_TEXT.length > 0 ? "EDIT" : "INSERT";
            this._isEdit = this._mode === "EDIT";
            this._selText = SEL_TEXT;

            this.checkedItems = this.flattenNestedObject(checkedItems);
            this._singleFloat = this.isSingleFloatLogic();

            const getFrag = (html) => document.createRange().createContextualFragment(html);
            const insEl = window._trackManager.getInsNode();

            const buildResult = (type) => {

                const html = this.generateCitationsByType(type);
                const frag = getFrag(html);
                // clone for appending
                const fragClone = frag.cloneNode(true);
                const insClone = insEl.cloneNode(true);
                insClone.append(fragClone);

                return {
                    text: $('<div>').html(html).text(),
                    string: html,
                    frag,
                    frag_append_insert: insClone
                };
            };

            const results = {
                direct: buildResult('dircite'),
                indirect: buildResult('indircite')
            };

            // Calculate Edit_Remove for Floats
            if (this._isEdit && options.ids) {
                const self = this;
                const newIds = Object.keys(this.checkedItems);
                const oldIds = Array.isArray(options.ids) ? options.ids : options.ids.split(' ');

                results.Edit_Remove = oldIds.map(function(id) {
                    if (id && newIds.indexOf(id) === -1 && self.CHECK_CITE_COUNT(id)) {
                        // For floats, just return the label as the display text for removed items
                        const item = self.checkedItems[id] || {
                            label: id.replace(/fig|tab/gi, '')
                        };
                        return item.label;
                    }
                }).filter(Boolean);
            }

            if (typeof debug !== 'undefined') {
                debug.log(`Citation results: ${JSON.stringify(results)} `);
            }

            return results;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getCitation', err.message);
        }
    }

    CHECK_CITE_COUNT(id) {
        try {
            var selectors = commonMethods.xrefSelectorBuilder(id);
            return (GlobalEditor.document.find(selectors).$.length == 1) ? !0 : !1;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CHECK_CITE_COUNT', err.message);
        }
    }

    generateCitationsByType(citationType) {
        this.citationType = citationType;
        return this.generateCitations();
    }
}
/**
 * Citation Part Labels Manager
 * Handles extraction and management of part labels from figure citations
 */

/**
 * Citation Part Labels Manager
 * Handles extraction and management of part labels from figure citations
 */

class PartLabelsManager {
    constructor() {
        // Separator for joining output labels
        this.LABEL_SEPARATOR = ', ';
        // Regex to split input labels
        this.INPUT_SEPARATOR = /[,\s]?and[,\s]?|,/;
        this.RANGE_SEPARATORS = /[\u002D\u2013\u2014]|\bthrough\b|\bto\b/gi;
        this.RANGE_SEPARATORS_DASH = /[\u002D\u2013\u2014]/;
        this.WHITESPACE_REGEX = /\s+/;
        this.CLEAN_WRAP_REGEX = /[()\[\]]/g;
        this.NUMBERS_DOTS_REGEX = /[0-9.]/g;
        this.NON_DIGITS_REGEX = /\D/g;
    }

    /**
     * Main function to update part labels in the input box
     * @param {Object} options - Configuration options
     * @param {Object} self - Reference to CitationNewModule
     */
    updatePartLabels(options = {}, self) {
        try {
            debug.log("--updatePartLabels--");
            self = self || CitationNewModule;

            if (!this._isValidContext(self)) {
                return;
            }

            const selectionInfo = this._getSelectionInfo();
            const citationElements = this._extractCitationElements(selectionInfo);

            if (citationElements.length === 0) {
                return;
            }

            this._processCitationElements(citationElements, self);

        } catch (error) {
            this._handleError('updatePartLabels', error);
        }
    }

    // Private methods
    _isValidContext(self) {
        if (self && self.M_SCOPE && self.M_SCOPE.ACTIVE_TAB !== 0) {
            return true;
        }
        return false;
    }

    _getSelectionInfo() {
        if (typeof IMPACT_SELECTION !== 'undefined') {
            IMPACT_SELECTION.getInfo();

            if (IMPACT_SELECTION.RG_INFO &&
                IMPACT_SELECTION.RG_INFO.EL &&
                IMPACT_SELECTION.RG_INFO.EL.$ &&
                IMPACT_SELECTION.RG_INFO.EL.$.innerHTML) {
                return IMPACT_SELECTION.RG_INFO.EL.$.innerHTML;
            }
        }
        return '';
    }


    _extractCitationElements(selectionHTML) {
        if (!selectionHTML) return [];

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = selectionHTML;
        return Array.from(tempDiv.querySelectorAll('a[rid]'));
    }

    /**
     * Process all citation elements and update UI once with collected labels
     * @param {Array} elements - Citation elements to process
     * @param {Object} self - Reference to CitationNewModule
     */
    _processCitationElements(elements, self) {
        if (elements.length === 0) return;

        // Collect all part labels from citations
        const collectedLabels = this._collectAllPartLabels(elements, self);

        // Update UI once with all collected labels
        this._updateUIWithCollectedLabels(self, collectedLabels);
    }

    /**
     * Collect part labels from all citation elements
     * @param {Array} elements - Citation elements to process
     * @param {Object} self - Reference to CitationNewModule
     * @returns {Map} Map of rid to label information
     */
    _collectAllPartLabels(elements, self) {
        const labelMap = new Map();

        elements.forEach((element, idx, arr) => {

            const citationLabels = this._extractLabelsFromElement(element, self);
            debug.log(idx, JSON.stringify(citationLabels));
            // Merge labels into the map

            citationLabels.forEach((labelInfo, rid) => {
                if (labelMap.has(rid)) {
                    // Combine existing labels with new ones
                    const existing = labelMap.get(rid);
                    labelMap.set(rid, {
                        ...existing,
                        labels: [...existing.labels, ...labelInfo.labels]
                    });
                } else {
                    labelMap.set(rid, labelInfo);
                }
            });

        });
        debug.log(JSON.stringify(labelMap));
        return labelMap;
    }

    /**
     * Extract part labels directly from citation element
     * @param {Element} element - Citation element
     * @param {Object} self - Reference to CitationNewModule
     * @returns {Map} Map of rid to label information
     */
    _extractLabelsFromElement(element, self) {
        const labelMap = new Map();
        const rids = this._extractRids(element);

        if (rids.length === 0) return labelMap;

        const citationText = this._getCitationText(element);
        const extractedLabels = this._simple_parseLabelsText(citationText);
        const refType = element.getAttribute("ref-type");

        // Apply extracted labels to all rids in this citation
        rids.forEach(rid => {
            const labelElement = this._getLabelElement(self, rid);
            if (extractedLabels.length > 0) {
                labelMap.set(rid, {
                    labels: extractedLabels,
                    element: labelElement,
                    refType
                });
            }
        });
        if (IS_LOCAL_HOST) debugger;
        debug.log(JSON.stringify(labelMap));
        return labelMap;
    }

    /**
     * Parse and extract part labels from citation text
     * @param {string} text - Citation text
     * @returns {Array} Array of extracted part labels
     */
    _parseLabelsFromText(text) {
        if (!text || typeof text !== 'string') return [];

        // Clean up HTML entities and normalize text
        const cleanText = text
            // Replace non-breaking space
            .replace(/&#x00A0;/g, ' ')
            // Replace en-dash
            .replace(/&#x2013;/g, '–')
            // Remove brackets
            .replace(/[()\[\]]/g, '')
            .trim();

        // Extract the part after figure/fig prefix and number
        const citationMatch = cleanText.match(
            /(\b(?:Fig(?:s)?\.?|Figure(?:s)?\.?|Tab(?:s)?\.?|Table(?:s)?\.?|Img(?:s)?\.?|Image(?:s)?\.?|Pic(?:s)?\.?|Picture(?:s)?\.?|Map(?:s)?\.?)\b)\s*\.?\s*(\d+[a-zA-Z]*)/i
        );
        const partNumMatch = cleanText.match(/\d+([a-zA-Z].*?)$/);
        const partOnly = cleanText.match(/([a-zA-Z].*?)$/);
        if (!citationMatch && !partNumMatch && !partOnly) {
            return [];
        }

        // e.g., "1A", "3B-D", "5"

        const numberAndLabel = !citationMatch ? (partNumMatch ? partNumMatch[0] : partOnly[0]) : citationMatch[2];

        // Extract only the alphabetic part after the number
        const labelMatch = numberAndLabel.match(/\d+([a-zA-Z].*?)$/);
        if (!labelMatch && !citationMatch) {
            // If no number found, check if we have pure alphabetic labels
            if (partOnly && partOnly[1]) {
                return this._splitAndCleanLabels(partOnly[1]);
            }
            // No part labels, just a number
            return [];
        }

        // e.g., "A", "B-D", "A and B"
        const labelPart = labelMatch[1];
        return this._splitAndCleanLabels(labelPart);
    }


    _simple_parseLabelsText(text) {
        if (!text || typeof text !== 'string') return [];

        // Normalize & clean
        const cleanText = text
            .replace(/&#x00A0;/g, ' ')
            // normalize dash types
            .replace(/&#x2013;/g, '–')
            // remove brackets
            .replace(/[()\[\]]/g, '')
            .trim();

        // Step 1: Split on first space (e.g., "Figure 1A and B")       

        const parts = cleanText.split(/\s+/);
        const finalText = parts.length === 1 ? cleanText : parts.slice(1).join(' ');

        // Step 2: Remove leading digits (e.g., "1A and B" ? "A and B")
        const labelPart = finalText.replace(/\d+/g, '').trim();

        return this._splitAndCleanLabels(labelPart);
    }

    /**
     * Split label text using the separator regex and clean results
     * @param {string} labelText - Text containing labels
     * @returns {Array} Array of cleaned labels
     */
    _splitAndCleanLabels(labelText) {
        if (!labelText) return [];

        // Handle range patterns first (e.g., "A–O", "A through D")
        if (this.RANGE_SEPARATORS.test(labelText) || this.RANGE_SEPARATORS_DASH.test(labelText)) {
            // return this._parseRangeLabels(labelText);
            return [labelText];
        }

        // Split on "and" or commas
        const parts = labelText.split(this.INPUT_SEPARATOR);

        return parts
            .map(part => part.trim())
            .filter(part => part.length > 0 && /[A-Za-z]/.test(part))
            // Keep only letters
            .map(part => part.replace(/[^A-Za-z]/g, ''));
    }

    /**
     * Parse range labels like "A–O" or "A through D"
     * @param {string} rangeText - Text containing range
     * @returns {Array} Array of labels in the range
     */
    _parseRangeLabels(rangeText) {
        const rangeParts = rangeText.split(this.RANGE_SEPARATORS);
        if (rangeParts.length < 2) return [];

        const startLabel = rangeParts[0].replace(/[^A-Za-z]/g, '').trim();
        const endLabel = rangeParts[1].replace(/[^A-Za-z]/g, '').trim();

        if (!startLabel || !endLabel) return [startLabel, endLabel].filter(Boolean);

        // Generate range for single letters (A-Z)
        if (startLabel.length === 1 && endLabel.length === 1) {
            const start = startLabel.charCodeAt(0);
            const end = endLabel.charCodeAt(0);
            const labels = [];

            for (let i = start; i <= end; i++) {
                labels.push(String.fromCharCode(i));
            }
            return labels;
        }

        // For multi-character labels, just return start and end
        return [startLabel, endLabel];
    }

    /**
     * Update UI with all collected labels
     * @param {Object} self - Reference to CitationNewModule
     * @param {Map} collectedLabels - Map of rid to label information
     */
    _updateUIWithCollectedLabels(self, collectedLabels) {
        let hasAnyLabels = false;
        const checkedElements = new Set();

        collectedLabels.forEach((labelInfo, rid) => {
            const el = labelInfo.element;
            const labels = labelInfo.labels || [];

            if (labels.length > 0 && el) {
                const existingValue = (el.value || '').trim();
                const uniqueLabels = this._deduplicateLabels(labels);

                // Apply special logic if citeFloats is defined
                let joinedLabels;
                if (typeof citeFloats !== "undefined" && typeof citeFloats.applySeparatorLogic === "function") {
                    joinedLabels = citeFloats.applySeparatorLogic(
                        uniqueLabels,
                        labelInfo.refType || "empty"
                    );
                } else {
                    joinedLabels = uniqueLabels.join(this.LABEL_SEPARATOR);
                }

                // Merge existing value with new labels
                const finalValue = existingValue ?
                    `${existingValue}${this.LABEL_SEPARATOR}${joinedLabels}` :
                    joinedLabels;

                el.value = finalValue;
                checkedElements.add(el);
                hasAnyLabels = true;
            }
        });

        if (hasAnyLabels) {
            const checkedArray = Array.from(checkedElements);

            this._setUIVisibility(self, true);
            this._markElementsAsChecked(checkedArray);
            this._updateCheckbox(self, true);

            // Dispatch input event on the first updated input
            if (checkedArray.length > 0) {
                // this._dispatchInputEvent(checkedArray[0]);
            }
        }
    }

    /**
     * Dispatch input event on a part_label input box to notify listeners
     */
    _dispatchInputEvent(input) {
        if (input && input.value) {
            // Extract only alphabetic characters and get the last one
            const alphabets = input.value.replace(/[^a-zA-Z]/g, '');
            // Get last character
            const singleChar = alphabets.slice(-1);

            const createEvent = () => new InputEvent('input', {
                bubbles: true,
                data: singleChar,
                inputType: 'insertText'
            });

            // Dispatch immediately
            input.dispatchEvent(createEvent());

            // Dispatch again after 500ms as a fallback
            setTimeout(() => {
                input.dispatchEvent(createEvent());
            }, 500);
        }
    }
    /**
     * Extract rids from citation element
     * @param {Element} element - Citation element
     * @returns {Array} Array of rid strings
     */
    _extractRids(element) {
        const ridAttr = element.getAttribute('rid');
        return ridAttr ? ridAttr.split(' ').filter(rid => rid.trim()) : [];
    }

    /**
     * Get citation text content
     * @param {Element} element - Citation element
     * @returns {string} Citation text
     */
    _getCitationText(element) {
        return element.textContent || '';
    }

    /**
     * Get label element for a specific rid
     * @param {Object} self - Reference to CitationNewModule
     * @param {string} rid - Reference ID
     * @returns {Element} Label element or fallback object
     */
    _getLabelElement(self, rid) {
        return self.Panel && self.Panel.querySelector(`[data-entry-id="${rid}"] .part_label`) || {
            value: ""
        };
    }

    /**
     * Remove duplicate labels while preserving order
     * @param {Array} labels - Array of label strings
     * @returns {Array} Deduplicated labels
     */
    _deduplicateLabels(labels) {
        const seen = new Set();
        return labels.filter(label => {
            const trimmed = label.trim();
            if (seen.has(trimmed) || trimmed === '') {
                return false;
            }
            seen.add(trimmed);
            return true;
        });
    }

    /**
     * Set UI visibility
     * @param {Object} self - Reference to CitationNewModule
     * @param {boolean} show - Whether to show UI
     */
    _setUIVisibility(self, show) {
        const displayDiv = self.IBOX && self.IBOX.FloatShowDiv;
        if (displayDiv) {
            displayDiv.setAttribute('show-part-label', show ? 's' : '');
            $(displayDiv).find(".checked").removeAttr("checked");
        }
    }

    /**
     * Mark elements as checked for UI updates
     * @param {Array} elements - Label elements to mark
     */
    _markElementsAsChecked(elements) {
        elements.forEach(element => {
            if (element && element.closest) {
                const rowEntry = element.closest('.row_entry');
                if (rowEntry) {
                    rowEntry.classList.add('checked');
                }
            }
        });
    }

    /**
     * Update checkbox state
     * @param {Object} self - Reference to CitationNewModule
     * @param {boolean} checked - Checkbox state
     */
    _updateCheckbox(self, checked) {
        const checkbox = self.IBOX && self.IBOX.PartLabOpt;
        if (checkbox) {
            checkbox.checked = checked;
        }
    }

    /**
     * Update the label separator
     * @param {string} separator - New separator string
     */
    setLabelSeparator(separator) {
        this.LABEL_SEPARATOR = separator;
    }

    /**
     * Handle errors consistently
     * @param {string} functionName - Name of function where error occurred
     * @param {Error} error - The error object
     */
    _handleError(functionName, error) {
        console.warn(`Error in ${functionName}:`, error.message);
        if (typeof ErrorLogTrace === 'function') {
            ErrorLogTrace(functionName, error.message);
        }
    }

    // ========================================
    // UNUSED/LEGACY METHODS - Kept for compatibility
    // ========================================

    /**
     * LEGACY: Extracts part labels from citation text
     * @param {string|Array} labelInput - Input label text or array
     * @param {Object} options - Processing options
     * @returns {Object} Extracted label information
     */
    extractPartLabels(labelInput, options = {}) {
        try {
            const config = {
                set: false,
                ...options
            };
            const labelInfo = this._parseLabelInput(labelInput);
            const result = this._createLabelResult();

            if (this._isRangeLabel(labelInfo.text)) {
                this._processRangeLabel(labelInfo, result, config);
            } else {
                this._processSingleLabel(labelInfo, result, config);
            }

            return result;
        } catch (error) {
            this._handleError('extractPartLabels', error);
            return this._createLabelResult();
        }
    }

    /**
     * LEGACY: Process single citation (old method)
     */
    _processSingleCitation(element, self) {
        const rids = this._extractRids(element);
        if (rids.length === 0) return;

        const firstRid = rids[0];
        const lastRid = rids[rids.length - 1];

        const labelElements = this._getLabelElements(self, firstRid, lastRid);
        const citationText = this._getCitationText(element);

        if (this._shouldProcessAsRange(rids, citationText)) {
            this._processRangeCitation(citationText, labelElements);
        } else {
            this._processSingleLabelCitation(citationText, labelElements.first);
        }

        this._updateUI(self, labelElements);
    }

    /**
     * LEGACY: Get label elements for first and last rid
     */
    _getLabelElements(self, firstRid, lastRid) {
        const getElement = (rid) => self.Panel && self.Panel.querySelector(`[data-entry-id="${rid}"] .part_label`) || {
            value: ""
        };
        return {
            first: getElement(firstRid),
            last: getElement(lastRid)
        };
    }

    /**
     * LEGACY: Check if should process as range
     */
    _shouldProcessAsRange(rids, text) {
        return rids.length > 1 &&
            (this._containsRangeSeparator(text) || this._hasRangeKeyword(text));
    }

    /**
     * LEGACY: Check if contains range separator
     */
    _containsRangeSeparator(text) {
        return this.RANGE_SEPARATORS.test(text);
    }

    /**
     * LEGACY: Check if has range keyword
     */
    _hasRangeKeyword(text) {
        return /\bthrough\b|\bto\b/ / i.test(text);
    }

    /**
     * LEGACY: Process range citation
     */
    _processRangeCitation(text, labelElements) {
        const parsedText = this._parseTextComponents(text);
        const labelInfo = this.extractPartLabels(parsedText.numberPart);

        labelElements.first.value = labelInfo.range_label_1;
        labelElements.last.value = labelInfo.range_label_2;
    }

    /**
     * LEGACY: Process single label citation
     */
    _processSingleLabelCitation(text, labelElement) {
        const parsedText = this._parseTextComponents(text);
        const labelInfo = this.extractPartLabels(parsedText.numberPart);

        const currentValue = labelElement.value || '';
        const separator = currentValue.length > 0 ? ' ' : '';
        labelElement.value = currentValue + separator + labelInfo.single_label_1;
    }

    /**
     * LEGACY: Parse text components
     */
    _parseTextComponents(text) {
        // Remove brackets and parentheses before splitting
        const cleanedText = text.replace(this.CLEAN_WRAP_REGEX, '');
        const parts = cleanedText.split(this.WHITESPACE_REGEX);
        const hasPrefix = parts.length > 1;

        return {
            prefix: hasPrefix ? parts[0] : '',
            numberPart: hasPrefix ? parts[1] : "",
            isJoined: !hasPrefix
        };
    }

    /**
     * LEGACY: Update UI for individual elements
     */
    _updateUI(self, labelElements) {
        const hasLabels = labelElements.first.value || labelElements.last.value;

        if (hasLabels) {
            this._setUIVisibility(self, true);
            this._markElementsAsChecked(labelElements);
            this._updateCheckbox(self, true);
        }
    }

    /**
     * LEGACY: Parse label input
     */
    _parseLabelInput(labelInput) {
        if (typeof labelInput === 'string') {
            return {
                text: labelInput,
                isJoined: true,
                originalArray: null
            };
        }

        if (Array.isArray(labelInput) && labelInput.length > 0) {
            return {
                text: labelInput[labelInput.length > 1 ? 1 : 0],
                isJoined: labelInput.length === 1,
                originalArray: labelInput
            };
        }

        return {
            text: '',
            isJoined: true,
            originalArray: null
        };
    }

    /**
     * LEGACY: Create label result object
     */
    _createLabelResult() {
        return {
            single_label_1: '',
            range_label_1: '',
            range_label_2: '',
            newValue: ''
        };
    }

    /**
     * LEGACY: Check if is range label
     */
    _isRangeLabel(text) {
        if (!this._containsRangeSeparator(text)) {
            return false;
        }

        const parts = text.split(this.RANGE_SEPARATORS);
        return parts.length > 1 && parts[1].replace(this.NON_DIGITS_REGEX, '').length > 0;
    }

    /**
     * LEGACY: Process range label
     */
    _processRangeLabel(labelInfo, result, config) {
        const rangeParts = labelInfo.text.split(this.RANGE_SEPARATORS);
        result.range_label_1 = rangeParts[0].replace(this.NUMBERS_DOTS_REGEX, '');
        result.range_label_2 = rangeParts[1].replace(this.NUMBERS_DOTS_REGEX, '');

        if (config.set && config.newValue) {
            result.newValue = this._buildRangeValue(labelInfo, result, config);
        }
    }

    /**
     * LEGACY: Process single label
     */
    _processSingleLabel(labelInfo, result, config) {
        result.single_label_1 = labelInfo.text.replace(this.NUMBERS_DOTS_REGEX, '');

        if (config.set && config.newValue) {
            result.newValue = this._buildSingleValue(labelInfo, result, config);
        }
    }

    /**
     * LEGACY: Build range value
     */
    _buildRangeValue(labelInfo, result, config) {
        const prefix = labelInfo.isJoined ? '' : labelInfo.originalArray[0];
        const newValue = config.newValue[1];

        if (this._containsRangeSeparator(newValue)) {
            return this._buildDashRangeValue(prefix, newValue, result);
        } else if (newValue.includes(',')) {
            return this._buildCommaRangeValue(prefix, newValue, result);
        }

        return prefix + ' ' + newValue;
    }

    /**
     * LEGACY: Build dash range value
     */
    _buildDashRangeValue(prefix, newValue, result) {
        const parts = newValue.split(this.RANGE_SEPARATORS);
        const formattedParts = parts.map((part, index) => {
            const labelKey = index === 0 ? 'range_label_1' : 'range_label_2';
            return part + result[labelKey];
        });
        return prefix + ' ' + formattedParts.join('–');
    }

    /**
     * LEGACY: Build comma range value
     */
    _buildCommaRangeValue(prefix, newValue, result) {
        const parts = newValue.split(',');
        const formattedParts = parts.map((part, index, array) => {
            let labelKey = 'range_label_1';
            if (index === array.length - 1) {
                labelKey = 'range_label_2';
            } else if (index > 0) {
                // Fallback
                labelKey = 'range_label_0';
            }
            return part + (result[labelKey] || '');
        });
        return prefix + ' ' + formattedParts.join(',');
    }

    /**
     * LEGACY: Build single value
     */
    _buildSingleValue(labelInfo, result, config) {
        const prefix = labelInfo.isJoined ? '' : labelInfo.originalArray[0];
        return prefix + ' ' + config.newValue[1] + result.single_label_1;
    }
}

// Create singleton instance
const partLabelManager = new PartLabelsManager();

// Export functions for backward compatibility
const updatePartLabels_InputBox = (options, self) => {
    partLabelManager.updatePartLabels(options, self);
};

const Get_Set_Part_Label = (oldLabel, option) => {
    return partLabelManager.extractPartLabels(oldLabel, option);
};

// Export the class for advanced usage
window.PartLabelsManager = PartLabelsManager;
window.citationManager = partLabelManager;

// Polyfill for older browsers
if (!String.prototype.hasOnlyThrough) {
    String.prototype.hasOnlyThrough = function() {
        return /\bthrough\b|\bto\b/ / i.test(this);
    };
}

if (!String.prototype.isContainsDash) {
    String.prototype.isContainsDash = function() {
        return /[\u002D\u2013\u2014]/.test(this);
    };
}