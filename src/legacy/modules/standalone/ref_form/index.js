/**
 * DEV REMARK
 * Date: 2026-03-17
 * Client: OXMEDO
 * Update: Refactored usage of ensureGroup for backGroup and rGroup creation in resolveRefTargets. Ensures DRY and consistent element creation.

 * Update: Refactored reference title node creation to use commonMethods.setAttr with GlobalAttributes['title'] for DRYness and maintainability.
 */



/*
    TODO
    ? #1: add/remove last page
    ? add/remove et al.,
        If newly inserted ref - handle tracking also
        ? MultiRefModule.getEtAl
    ? doi/url add/remove handling
        tracking
        xml retain and delete

*/


// Module constants/config/templates
// Shared DOM/helper utilities
// Open/query context helpers
// Insert/update operation helpers
// Citation/reference DOM update helpers
// Dialog lifecycle
// Form/data conversion helpers
// User edit/update events
// Submit/cancel/post-submit handlers
// Validation helpers


// Global JSON storage
const GlobalAttributes = {
    /* beautify preserve:start */
    "surname": { 'class': "surname", 'data-name': "surname" },
    "label": { 'class': "label", 'data-name': "label" },
    "etal": { 'class': "etal", 'data-name': "etal" },
    "given-names": { 'class': "given-names", 'data-name': "given-names" },
    "mixed-citation": { 'class': "mixed-citation", 'data-name': "mixed-citation", 'publication-type': "journal" },
    "person-group": { 'class': "person-group", 'data-name': "person-group", 'person-group-type': "author" },
    "string-name": { 'class': "string-name", 'data-name': "string-name" },
    "ref": { 'class': "ref", 'data-name': "ref", 'data-role': "ref", "publication-type": "journal", "data-enter-af-fi": "yes" },
    "pub-id": { 'class': "pub-id", 'data-name': "pub-id", 'pub-id-type': "uri", 'data-wsc-ignore': "" },
    "ext-link": { 'class': "ext-link", 'data-name': "ext-link", 'data-wsc-ignore': "", "ext-link-type": "", "xmlns:xlink": "http://www.w3.org/1999/xlink", "xlink:href": "" },
    "etal-pi": { 'class': "pistart", 'data-name': "pistart", 'data-pi': "PI", "contenteditable": "false", "data-pistart": "." },
    "back": { 'class': "back", 'data-name': "back" },
    "ref-list": { 'class': "ref-list", 'data-name': "ref-list", "data-enter-af-fi": "yes" },
    "title": { 'class': "title", 'data-name': "title" },
    /* beautify preserve:end */
};


const templateStringCollection = {
    // ? query related
    "query_template": `<span label={{label}} class="queryview">{{{querydata}}}</span>`,
    "query_res_template": `<span label={{label}} class="query-res">{{{querydata}}}</span>`,
    // ? common templates
    "new_author_row_form": `<div class='row form-group' {{{attr}}}><div class='col-4'><input type='text' autocomplete='off' value='{{ surname }}' id='{{ idPrefix }}surname_{{ index }}' class='inputDiv form-control form-control-sm'></div> <div class='col-4'> <input type='text' autocomplete='off' value='{{ givenname }}' class='inputDiv form-control form-control-sm' id='{{ idPrefix }}givenname_{{ index }}'> </div> <div class='col-1'> <button type='submit' class='btn btn-sm btnAuGroup' id='{{ idPrefix }}add_{{ index }}'><i class='fa fa-plus'></i></button> </div> <div class='col-1'> <button type='submit' class='btn btn-sm btnAuGroup' id='{{ idPrefix }}minus_{{ index }}'><i class='fa fa-minus'></i></button> </div> <div class='col-1'> <button type='submit' class='btn btn-sm btnAuGroup' id='{{ idPrefix }}up_{{ index }}'><i class='fa fa-arrow-up'></i></button> </div> <div class='col-1'> <button type='submit' class='btn btn-sm btnAuGroup' id='{{ idPrefix }}down_{{ index }}'><i class='fa fa-arrow-down'></i></button> </div> </div>`,

    "string-name": `<span class="string-name" data-name="string-name" data-new="s"></span>`,
    "surname": `<span class="surname" data-name="surname" title="S N">{{text}}</span>`,
    "given-names": `<span class="given-names" data-name="given-names" title="F N">{{text}}</span>`,
    "collab": `<span class="collab" data-name="collab" title="collab">{{text}}</span>`,
    "volume": `<span class="volume" data-name="volume" title="Vol">{{text}}</span>`,
    "year": `<span class="year" data-name="year" title="">{{text}}</span>`,
    "etal": `<span class="etal" data-name="etal" title="">{{text}}</span>`,
    "issue": `<span class="issue" data-name="issue" title="Issue">{{text}}</span>`,
    "lpage": `<span class="lpage" data-name="lpage" title="last page">{{text}}</span>`,
    "fpage": `<span class="fpage" data-name="fpage" title="first page">{{text}}</span>`,
    "url": `<span class="uri" data-name="uri" >{{text}}</span>`,
    "ext-link": `<span class="ext-link" data-name="ext-link">{{text}}</span>`,
    "pub-id": `<span class="pub-id" data-name="pub-id" 'pub-id-type': "uri">{{text}}</span>`,
    "article-title": `<span class="article-title" data-name="article-title">{{{text}}}</span>`,
    "source": `<span class="source" data-name="source">{{{text}}}</span>`,
    "suppl": `<span class="supplement" data-name="supplement">{{text}}</span>`,
    // ? books related
    "publisher-loc": `<span class="publisher-loc" data-name="publisher-loc" title="">{{text}}</span>`,
    "publisher-name": `<span class="publisher-name" data-name="publisher-name" title="">{{text}}</span>`,
    "edition": `<span class="edition" data-name="edition" title="edition">{{text}}</span>`,
    "chapter-title": `<span class="chapter-title" data-name="chapter-title" title="chapter-title">{{text}}</span>`,
    // ? others
    "comment": `<span class="comment" data-name="comment" title="comment">{{text}}</span>`,
    "accessDate": `<span class="accessDate" data-name="accessDate" title="">{{text}}</span>`,
    "dummy3": `<span class="" data-name="" title="">{{text}}</span>`,
    "label": `<span class="label" data-name="label" data-value="{{text}}">{{text}}</span>`,
    "mixed": `<span class="mixed-citation" data-name="mixed-citation" publication-type="journal">{{{text}}}</span>`,
    "a": `{{op}}<a class="xref" data-name="xref" data-role="bibr" href="#{{rid}}" ref-type="bibr" rid="{{rid}}" fid="{{id}}">{{{text}}}</a>{{cp}}`,
    "sup": `<sup class="sup" data-name="sup">{{op}}<a class="xref" data-name="xref" data-role="bibr" href="#{{rid}}" ref-type="bibr" rid="{{rid}}" fid="{{id}}">{{text}}</a>{{cp}}</sup>`,
    "ref_json": function(_id, _type) {
        return {
            class: "ref",
            "data-name": "ref",
            "data-role": "ref",
            "id": _id,
            "data-new": "s",
            "data-ins-type": _type,

        };
    },
    "editorSection": `<div id="refeditorrepeat"><div class="p-2 mb-2 rounded contributor-box d-flex align-items-center"><h3 class="font-weight-bold text-sm mb-0">Contributors/Editors</h3></div></div>`
};
const elMapping = {
    'ALL_ELM': {
        ".mixed-citation": "#preview",
        ".person-group": "#refauthorrepeat",
        ".year": "#year",
        ".source": "#source",
        ".article-title": "#title",
        ".comment": "#comment",
        ".ext-link": "#ext-link",
        ".pub-id": "#ext-link",
        ".collab": "#collab",
        ".etal": "#etal",
        ".fpage": "#fpage",
        ".lpage": "#lpage",
        ".volume": "#volume",
        ".supplement": "#suppl",
        ".issue": "#issue",
        ".edition": "#edition",
        ".publisher-loc": "#publisher-loc",
        ".publisher-name": "#publisher-name",
        ".chapter-title": "#chapter-title",
        // ? ADDING SUR_NAME_GIVEN_NAME
        ".surname": "#surname",
        ".given-names": "#givenname"
    },
    'ELM_MISS_TEXT_MAPPING': {
        //? skip text
        // "if applicable": "#Reply_qry_edit_ref",
        // "if any": "#Reply_qry_edit_ref",
        // ? all elements
        "surname": "‡ref_auSurname",
        "given name": "‡ref_auGivenName",
        "editor\\(s\\) name|editors name|editor name|contributor": "editor",
        "author name or institution name|collab": "‡ref_auCollab",
        "article title": "‡ref_titleArticle",
        "year of publication": "‡ref_pubdateYear",
        "journal title": "‡ref_titleJournal",
        "volume": "‡ref_volumeNumber",
        "supplement": "‡ref_supplement",
        "issue number": "‡ref_issueNumber",
        "page range": "‡ref_pageFirst",
        "doi number|doi": "‡ref_idDOI",
        "URL": "‡ref_URL",
        "book title": "‡ref_titleBook",
        "edition": "‡ref_edition",
        "publisher location|location": "‡ref_publisherLocation",
        "publisher name|publisher": "‡ref_publisherName",
        "chapter title": "‡ref_titleChapter",
        "year": "‡ref_pubdateYear",
        "issue": "‡ref_issueNumber",
        "page number|page range": "‡ref_pageFirst",
        "end page number|closing page number": "‡ref_pageLast",

        "accessed date|access date": "‡ref_accessDate",
        "conference name": "‡ref_conferenceName",
        "conference date": "‡ref_conferenceDate",
        "conference place": "‡ref_conferencePlace",
        "thesis title": "‡ref_titleThesis",
        "translate": "‡ref_titleTransThesis",
        "website title": "‡ref_titleWebsite",
        "inventor suffix": "‡ref_inventorSuffix",
        "inventor prefix": "‡ref_inventorPrefix",
        "assignee collab": "‡ref_assigneeCollab",
        "patent title": "‡ref_titlePatent",
        "published date": "‡ref_pubdateMonth",
        // "closing page number": "‡ref_pageLast",
        // "doi": "‡M_SCOPE.REF_IDDOI"
    },
    'ELM_ID_MAPPING': {
        // ? types of journals
        // ? CE_G-Mapping
        "journal": "Journal-Ref",
        "book": "Book-Ref",
        "ed-book": "EditedBook-Ref",
        "conf": "confpaper",
        "thesis": "thesis",
        "web": "website",
        "patent": "patent",
        // ? elements common
        "person-group": "author",
        "editor": "editor",
        "given": "‡ref_auGivenName",
        "surename": "‡ref_auSurname",
        "suffix": "‡ref_auSuffix",
        "collab": "‡ref_auCollab",
        "year": "‡ref_pubdateYear",
        "etal": "‡ref_etal",
        "fpage": "‡ref_pageFirst",
        "lpage": "‡ref_pageLast",
        "suppl": "‡ref_supplement",
        // ! same key value for book & journal
        "source": "",
        //? ‡ref_titleJournal
        // "source_book": "‡ref_titleBook",
        //? journal-based
        "volume": "‡ref_volumeNumber",
        "issue": "‡ref_issueNumber",
        "title": "‡ref_titleArticle",
        "ext-link": "‡ref_idDOI",
        "url": "‡ref_URL",
        "comment": "‡ref_accessDate",
        //? book-based
        "chapter-title": "‡ref_titleChapter",
        "edition": "‡ref_edition",
        "publisher-loc": "‡ref_publisherLocation",
        "publisher-name": "‡ref_publisherName",
        //  "ed-given": "‡ref_edGivenName",
        //  "ed-surname": "‡ref_edSurname",


        "#Reply_qry_edit_ref": "#Reply_qry_edit_ref",
        "#Update_cmd_edit_ref": "#Update_cmd_edit_ref",
        "#edit_all_field": "#edit_all_field"
    },
    'API_MAPPING': {
        "doi": "ext-link",
        "journal": "source",
    },
    'Ignore_Sibiling': {
        "Prev": ["person-group"],
        "Next": []
    },
    'Handling_Delim_Except': {
        //? while error on keying  - missing ceg -config
        "issue": ")."
    },
    'DTD_BASED': {
        "title": {
            "journal": "article-title",
            "book": "chapter-title",
            "ed-book": "chapter-title"
        },
        "source": {
            "journal": "source",
            "book": "source",
            "ed-book": "source"
        }
    },
    "replace_key_alert_value": {
        '.surname': 'author\'s surname',
        '.year': "year of publication"
    },
    'ADD_COMMON_ATTR': {
        "ext-link": {},
        "url": {},
        "pub-id": {},
    },
    'Dynamic_Key_Value': {
        "journal": {
            "source": "‡ref_titleJournal"
        },
        "webpage": {
            "source": "‡ref_titleJournal"
        },
        "book": {
            "source": "‡ref_titleBook"
        },
        "ed-book": {
            "source": "‡ref_titleBook"
        }
    },
    'Update_MSG': {
        "Reply_qry_edit_ref": "Skipping the query",
        "insert_edit_ref": "Updated",
        "Update_cmd_edit_ref": "Updated with response",
        "error": "Error while update reference. Kindly use query respond field.",
        "restrict": "These ### elements are not allowed as per journals"
    },
    'MOVED_ELM': {
        "journal": {
            "#entry_row_2": "#page_group"
        },
        "webpage": {
            "#entry_row_2": "#page_group"
        },
        "book": {
            "#publisher_group": "#page_group"
        },
        "ed-book": {
            "#publisher_group": "#page_group"
        }
    },
    'SET_LABEL': {
        'initLoop': [],
        'showLoop': ['title', 'source']
    },
    'FORMATTING_ITEMS': [".article-title"],
    'UPDATE_CITE_ELM': [".year", ".surname"],
    "SET_TITLE": {
        "headerTitle": {
            "QUERY": "Update Missing Elements",
            "EDIT": "Edit Reference",
            "NEW": "Insert New Reference"
        },
        "Reply_qry_edit_ref": {
            "QUERY": "Respond to the query",
            "EDIT": "Additional comments",
            "NEW": "Additional comments"
        },
        "lab_cmd_qry": {
            "QUERY": "Respond to the query",
            "EDIT": "Additional comments",
            "NEW": "Additional comments"
        }
    }
};
const hintAlertMessages = {
    'Author_limitExceed': {
        "text": `As per the journal&rsquo;s specifications, references with more than {{count}} author names should be followed by 'et al.'. The current reference already includes the 'et al.' element (checkbox below the author names), indicating that the {{after}}-author limit has been reached. Consequently, the addition of a new author is not permissible.`
    },
    'et_al_optional': {
        'text': `The reference you are adding already includes {{current}} author names, which is the limit set by the journal&rsquo;s specifications. Do you want to proceed with adding &ldquo;et al.&rdquo; to indicate additional contributors after the {{after}} author's name?`,
    },
    'remove_author_remove_et_al': {
        'text': `According to this journal requirement, references must display a minimum of {{count}} author names. If you need to remove an author, please ensure that you eliminate 'et al.' (uncheck the box below author names) (or) input the appropriate author name in the vacant field as per the specifications.`
    },
    'add_et_al_add_author': {
        'text': `As per the journal specification, the reference must have a minimum of {{current}} author names to enable et al., please add the appropriate author names to match the specification.`
    },
    'add_et_al_remove_author': {
        'text': `The reference you are adding lists {{current}} author names, exceeding the author limit specified by the journal. According to the journal&rsquo;s guidelines, only the first {{after}} authors&rsquo; names, followed by 'et al.,' will be displayed, and any additional authors will be removed from the reference.`
    },
    "change_year_cite": {
        'text': "You have modified the year of publication in a reference. As a result, this alteration will be consistently applied to the relevant in-text citations present throughout your document. Kindly ensure that these adjustments are accurately reviewed and confirmed."
    },
    "change_full_cite": {
        'text': "You have modified the {{text}} in the reference. As a result, this alteration will be consistently applied to the relevant in-text citations present throughout your document. Kindly ensure that these adjustments are accurately reviewed and confirmed."
    },
    'empty_field': {
        'text': `Kindly make sure to provide the appropriate details in the manadatory field as per the specification`
    },
    'change_radio': {
        'text': `Are you sure you want to dismiss all changes?`
    },
    "empty_doi_content": {
        'text': 'Please enter the DOI ID to fetch the reference from online databases and click "Insert" to insert the reference.'
    },
    "empty_plain_txt_content": {
        'text': 'Please paste the reference text in the textbox provided to insert the reference.'
    },
    "annatation_txt_content": {
        'text': 'Please paste the Annotation Note text in the textbox provided to insert the reference.'
    },
    "empty_citation": {
        'text': 'The citation text field cannot be left empty.'
    },
    "doi_fetch_error": {
        'text': "Data not available in database."
    },
    'empty_au_field': {
        'text': `Kindly make sure to provide the appropriate author name in the vacant field as per the specification`
    },
    'module_wip': {
        'text': "This features (Insert/Delete Reference) is currently unavailable for this journal specification."
    },
    "EDIT_OR_INS_REF": {
        "type": "warning",
        "title": "Warning",
        "text": 'Would you like to edit the existing reference or add a new one? Please confirm your choice below',
        "button1": "Edit Reference",
        "button2": "Cancel",
        "button3": "Insert New Reference",
        "param": true,
        "Options": {
            hide: true
        }
    },
    'WARN_POST_TOASTER': {
        "type": "info",
        "title": "",
        'text': "Please note that journal/book type references cannot be edited directly, as this may affect their style due to the underlying structure. To enable editing, the reference is loaded into a form that can be viewed in the right panel.",
        "button1": "OK",
        "button2": "",
        "param": true,
        "Options": {
            hide: true
        }
    }
};



// Handle clicks on labels
$('.btn-group').on('click', 'label', function(e) {
    if (hasDisabledClass(this, e)) return;
});

const ref_logError = (functionName, error) => {
    console.warn(`Error in ${functionName}: ${error.message}`);
    ErrorLogTrace(`MultiRefModule ${functionName}`, error.message);
}

// non-journal mode → add "book"/"ed-book", but only for non-CMS18 book styles -- CMS18 books are
// handled by the new reference module (referenceDialog/RefBridge) instead, so MultiRefModule must
// not also offer to edit them (same refstyle check as ref_bridge's resolveSourcePolicy() and
// reference/context.js's isCms18RefStyle()).
function resolveMultiRefAllowedTypes(isJournal, sharedKey) {
    const key = sharedKey || {};
    const isCms18RefStyle = String(key.refstyle || '').toLowerCase().replace(/\s+/g, '') === 'cms18';
    return !isJournal && !!key.refstyle && !isCms18RefStyle ? ["journal", "book", "ed-book"] : ["journal"];
}

function getSiblingsWithSameDataName(el, dataName) {
    var siblings = [];

    try {
        if (!el || !el.parentElement) return siblings;

        if (!dataName) {
            dataName = el.getAttribute("data-name");
            if (!dataName) return siblings;
        }

        Array.prototype.forEach.call(el.parentElement.children, function(node) {
            if (
                node !== el &&
                node.getAttribute &&
                node.getAttribute("data-name") === dataName
            ) {
                siblings.push(node);
            }
        });

    } catch (error) {
        // optional: debug.log(error);
    }

    return siblings;
}



const lastAuthorDelim = function(node, Options = {}, self) {
    self = MultiRefModule;
    const initials = self.M_CONFIG.STYLE_PATTERN.querySelector('initials[style="‡ref_auGivenName"]');
    const Initial_Pun = initials && initials.getAttribute("punctuation") || "";
    const IsInitZeroLength = Initial_Pun.length == 0;
    let {
        check,
        move,
        TAR_ID,
        process
    } = Options;
    try {
        const isCollab = process == 'collab';
        let gn = node.querySelector(".given-names");
        let del = gn.querySelector("del");
        let isDeleted = node.hasAttribute("data-delete") || node.hasAttribute("data-remove");
        let addTrack = false;
        if (gn) {
            var target = check ? gn : del ? del : null;
            var group = node.closest(check ? ".string-name" : ".person-group");
            if (isCollab) group = node.closest(".person-group");
            if (target && target.textContent.endsWith(".") && IsInitZeroLength) {
                let next = group.nextSibling;
                if (next) {
                    if (next.nodeType == 3 && next.nodeValue == " ") {
                        if (!move) {
                            next.nodeValue = ". ";
                            target.textContent = target.textContent.slice(0, -1);
                        } else if (isCollab) {
                            addTrack = true;
                        }
                    } else if (move && next.nodeType == 1) {
                        addTrack = true;
                    }

                    if (addTrack) {
                        let trimEl = del ? del : target;
                        trimEl.textContent = trimEl.textContent.slice(0, -1);
                        group.after(".");
                        self.M_FUN.UpdateDelimTrack("author", group.nextSibling, {
                            attr: {
                                "data-delim": "delete"
                            }
                        });
                    }
                }
            }
        }
    } catch (err) {
        ref_logError('lastAuthorDelim', err);
    }
}

const formGroupList = (Options = {}, self) => {
    self = MultiRefModule;
    let {
        del,
        input_wo_dis,
        au_div,
        container
    } = Options;
    try {
        const baseSelector = container ? container : (au_div ? '.authGroup_div_border' : '#refauthorrepeat');
        const selector = `${baseSelector} .form-group${del ? '[data-delete]' : ''}${input_wo_dis ? ' input:not(.disabled)' : ''}`;
        return self.Panel.querySelectorAll(selector);
    } catch (err) {
        ref_logError('formGroupList', err);
    }
};

function getContributorRowScope(node) {
    try {
        const container = node && node.closest ? node.closest("#refeditorrepeat,#refauthorrepeat") : null;
        const isEditor = !!(container && container.id === "refeditorrepeat");

        if (isEditor) {
            return {
                container,
                personGroupType: "editor",
                idPrefix: "editor_",
                previewSelector: '.person-group[person-group-type="editor"]'
            };
        }

        return {
            container,
            personGroupType: "author",
            idPrefix: "",
            previewSelector: '.person-group[person-group-type="author"]'
        };
    } catch (err) {
        ref_logError('getContributorRowScope', err);
        return {
            container: null,
            personGroupType: "author",
            idPrefix: "",
            previewSelector: '.person-group[person-group-type="author"]'
        };
    }
}

function getContributorRows(root, Options = {}) {
    try {
        root = root || MultiRefModule.Panel;
        if (!root || !root.querySelectorAll) return [];

        const containers = (Options.container || "#refauthorrepeat,#refeditorrepeat").split(",").map(selector => selector.trim()).filter(Boolean);
        const rowSelector = containers.map(selector => `${selector} .form-group${Options.del ? '[data-delete]' : ''}${Options.input_wo_dis ? ' input:not(.disabled)' : ''}`).join(",");

        return root.querySelectorAll(rowSelector);
    } catch (err) {
        ref_logError('getContributorRows', err);
        return [];
    }
}

function getContributorTemplateOptions(Options = {}, personGroupType) {
    try {
        const isEditor = personGroupType === "editor";
        return Object.assign({}, Options, {
            idPrefix: isEditor ? "editor_" : ""
        });
    } catch (err) {
        ref_logError('getContributorTemplateOptions', err);
        return Options;
    }
}

function createContributorRowTemplate(self = MultiRefModule, personGroupType = "author", Options = {}) {
    try {
        const templateOptions = getContributorTemplateOptions(Options, personGroupType);
        return self.GetTemplate("new_author_row_form", templateOptions);
    } catch (err) {
        ref_logError('createContributorRowTemplate', err);
        return "";
    }
}

function getContributorPreviewGroup(previewDiv, personGroupType) {
    try {
        if (!previewDiv) return null;
        return previewDiv.querySelector(`.person-group[person-group-type="${personGroupType}"]`);
    } catch (err) {
        ref_logError('getContributorPreviewGroup', err);
        return null;
    }
}

function ensureEditorContributorSection(Panel_ELm, self = MultiRefModule, Options = {}) {
    try {
        if (!Panel_ELm) return null;

        const $parent = $(Panel_ELm).parent();
        let $editorContainer = $parent.find("#refeditorrepeat");

        if (!$editorContainer.length) {
            $editorContainer = $(templateStringCollection.editorSection);
            $(Panel_ELm).after($editorContainer);
        }

        if (Options.clearRows) {
            $editorContainer.find(".form-group").remove();
        }

        if (Options.addEmptyRow && !$editorContainer.find(".form-group").length) {
            const fragment = createContributorRowTemplate(self, "editor", {
                index: 0,
                surname: "",
                givenname: "",
                attr: "person-group-type='editor' data-new='s'"
            });
            $editorContainer.append(fragment);
        }
        if (Options.queryMatched) {
            $editorContainer.find(".form-group").attr("data-query-matched", "true");
        }
        self.M_FUN.ATTACH_LISTENERS({
            container: "#refeditorrepeat"
        });
        return $editorContainer[0];
    } catch (err) {
        ref_logError('ensureEditorContributorSection', err);
        return null;
    }
}

function handleEditorContributorQueryMatch(text, Panel_ELm, self = MultiRefModule, mFunScope = MultiRefModule.M_FUN) {
    try {
        if (!text || !hasKeyIncludes(text, "editor\\(s\\) name|editors name|editor name|contributor")) return false;
        ensureEditorContributorSection(Panel_ELm, self, {
            addEmptyRow: true,
            queryMatched: true
        });
        if (!self.M_SCOPE.MISS_ELM_IDs.includes("editor")) self.M_SCOPE.MISS_ELM_IDs.push("editor");
        self.M_SCOPE.IsMatch = true;
        const editorInputs = self.Panel.querySelectorAll("#refeditorrepeat .form-group input");
        editorInputs.forEach(input => {
            mFunScope.HighLightInput(input);
        });
        return true;
    } catch (err) {
        ref_logError('handleEditorContributorQueryMatch', err);
        return false;
    }
}

const hasDisabledClass = (target, e) => {
    try {
        if (target && (
                target.classList.contains('disabled') ||
                target.hasAttribute('disabled') ||
                (target.parentElement && (
                    target.parentElement.classList.contains('disabled') ||
                    target.parentElement.hasAttribute('disabled')
                ))
            )) {
            console.log('Click event ignored due to disabled state');
            if (typeof e.preventDefault == "function") e.preventDefault();
            //  if (IS_LOCAL_HOST) debugger;
            // Find the currently checked radio and ensure its label remains active
            let focus = target.closest(".btn-group").querySelector(".active");
            if (focus)
                setTimeout((focus) => {
                    focus.classList.add("active");
                    autoFocus();
                }, 50, focus);
            return true;
        }
        return false;
    } catch (err) {
        ref_logError('hasDisabledClass', err);
        return false;
    }
};


const handleEnabledDisbale = (root, canDisable) => {
    try {
        root.prop('disabled', canDisable)
            .attr('disabled', canDisable ? 'disabled' : null)
            .toggleClass('disabled', canDisable)
            .parent()
            .prop('disabled', canDisable)
            .attr('disabled', canDisable ? 'disabled' : null)
            .toggleClass('disabled', canDisable);

        // Handle changes on radio buttons
        root.on('change', function(e) {
            if (hasDisabledClass(this, e)) return;

        });
    } catch (err) {
        ref_logError('makeSelector', err);
    }
}

const makeSelector = (targetVal, returnDOM, name = 'INS_REF_RADIO') => {
    try {
        const selector = `input[name='${name}']${targetVal ? `[value='${targetVal}']` : ''}`;
        // Return the appropriate query result based on returnList
        debug.log("==> " + selector + " <==");
        return returnDOM == 1 ? document.querySelector(selector) : returnDOM == 2 ? $(document).find(selector) : selector;
    } catch (err) {
        ref_logError('makeSelector', err);
    }
};

const canDisableTypeChangeBtns = (refType, canDisable, Options = {}, isInsMode, self) => {
    self = MultiRefModule;
    isInsMode = self.M_SCOPE.INSERT_MODE;
    try {
        if (isInsMode) {
            var root = makeSelector(null, 2, "ref_type");
            handleEnabledDisbale(root, refType == 'plain_text' ? !1 : canDisable);
        }
    } catch (err) {
        ref_logError('disableTypeChangeBtns', err);
    }
}

const dispatchEventFunc = function(target, options = {}) {
    try {
        const clickEvent = new Event('click', {
            bubbles: true,
            cancelable: true
        });

        if (target.type === "radio") target.checked = true;

        options.fireParent ?
            target.parentElement.dispatchEvent(clickEvent) :
            target.dispatchEvent(clickEvent);
    } catch (err) {
        ref_logError('dispatchEventFunc', err);
    }
}

// Common function to handle reference type changes
const handleReferenceTypeChange = (refType, model, e = {}, self) => {
    self = MultiRefModule;
    let {
        INSERT_MODE,
        CURRENT_MODEL
    } = self.M_SCOPE;
    try {
        // Find the appropriate insert radio button based on reference type
        self._refType = refType;
        const isOther = refType === 'other';
        const IsPlain = CURRENT_MODEL == "plain_text";
        const targetValue = (isOther || IsPlain) ? 'plain_text' : (e.force || model) ? model : 'doi_form';
        const targetRadio = makeSelector(targetValue, 1);
        var root = makeSelector(null, 2);
        //  if (IS_LOCAL_HOST) debugger;
        if (targetRadio) {
            if (!isOther && !e.force) handleEnabledDisbale(root, isOther);
            // Check if the element or its parent has the 'disabled' class
            if (hasDisabledClass(targetRadio, e)) {
                console.log('Click event ignored due to disabled class');
                if (typeof e.preventDefault == "function") e.preventDefault();
                // Ignore the click event and return null
                return null;
            }
            dispatchEventFunc(targetRadio, {
                fireParent: !0
            });
            handleEnabledDisbale(root, e.force ? e.force : isOther);
            if (!INSERT_MODE) {
                root = makeSelector(null, 2, "ref_type");
                handleEnabledDisbale(root, !0);
                syncReferenceTypeButtonGroup(refType, {}, self);
            }
        }
    } catch (err) {
        ref_logError('handleReferenceTypeChange', err);
    }
};

const syncReferenceTypeButtonGroup = (refType, Options = {}, self) => {
    self = MultiRefModule;
    try {
        if (!self.Panel || !refType) return;

        let value = refType === "webpage" ? "other" : refType;

        if (/^(book|ed-book)$/i.test(value) && typeof self.enableBookTypes === "function") {
            self.enableBookTypes();
        }

        const group = self.Panel.querySelector("#ref_type_btngroup");
        if (!group) return;

        group.querySelectorAll("label").forEach(label => {
            const input = label.querySelector("input[name='ref_type']");
            const isActive = !!(input && input.value === value);
            label.classList.toggle("active", isActive);
            if (input) input.checked = isActive;
        });

        if (self.ELEMENTS && self.ELEMENTS.formGroupDiv) {
            self.ELEMENTS.formGroupDiv.setAttribute("data-current-form", value);
        }
    } catch (err) {
        ref_logError('syncReferenceTypeButtonGroup', err);
    }
};

function applyRefFormModeChrome(refType, self = MultiRefModule) {
    try {
        if (!self.Panel) return;

        const {
            EDIT_MODE,
            FROM_QRY,
            QRY_2_EDIT
        } = self.M_SCOPE;
        const isLockedMode = EDIT_MODE || FROM_QRY || QRY_2_EDIT;
        const methodGroup = self.Panel.querySelector("#ins_ref_method_group");
        const typeOptions = self.Panel.querySelector("#type_options_form");
        const typeGroup = self.Panel.querySelector("#ref_type_btngroup");

        if (methodGroup) methodGroup.classList.toggle("ds-none", isLockedMode);
        if (typeOptions) typeOptions.classList.remove("ds-none");
        if (!typeGroup) return;

        const currentValue = refType === "webpage" ? "other" : refType;
        typeGroup.querySelectorAll("label").forEach(label => {
            const input = label.querySelector("input[name='ref_type']");
            const isActive = !!(input && input.value === currentValue);

            label.classList.toggle("ds-none", isLockedMode && !isActive);
            label.classList.toggle("disabled", isLockedMode);
            if (input) input.disabled = isLockedMode;
        });
    } catch (err) {
        ref_logError('applyRefFormModeChrome', err);
    }
}

const resetField = (field) => {
    try {
        field.removeAttribute("data-delete");
        field.classList.remove("disabled");
        field.querySelectorAll('.inputDiv').forEach(input => input.value = "");
    } catch (err) {
        ref_logError('resetField', err);
    }
};


function AddAuthor(self) {
    self = MultiRefModule;
    try {
        var totalForm = formGroupList({}),
            formsWithDelete = formGroupList({
                'del': true
            });
        if (totalForm.length == formsWithDelete.length) {
            let lastForm = totalForm[totalForm.length - 1];
            if (lastForm) {
                $(lastForm).find("input").addClass("disabled");
                let addButtons = $(lastForm).find("[id^='add_']");
                if (addButtons) addButtons.removeAttr("disabled").click().attr("disabled", "disabled");
            }
        }
    } catch (err) {
        ref_logError('AddAuthor', err);
    }
}

function bindContributorRowControls(Options = {}, self) {
    self = MultiRefModule;
    /* beautify preserve:start */
    let { EDIT_MODE, INSERT_MODE, FROM_QRY, FORCE_OPEN } = self.M_SCOPE;
    /* beautify preserve:end */
    try {
        const canEnable = EDIT_MODE || INSERT_MODE || FROM_QRY;
        const formGroups = getContributorRows(self.Panel, {
            container: Options.container
        });
        formGroups.forEach((group, idx, arr) => {
            const addButton = group.querySelector('[id^="add_"],[id^="editor_add_"]');
            const removeButton = group.querySelector('[id^="minus_"],[id^="editor_minus_"]');
            const upButton = group.querySelector('[id^="up_"],[id^="editor_up_"]');
            const downButton = group.querySelector('[id^="down_"],[id^="editor_down_"]');
            const scopedRows = Array.from(group.parentElement.querySelectorAll(".form-group"));
            const scopedIndex = scopedRows.indexOf(group);
            const isDelete = group.hasAttribute("data-delete");
            const isFirst = scopedIndex === 0;
            const isLast = scopedIndex === scopedRows.length - 1;

            // If the form group is marked for deletion, disable most buttons
            if (isDelete || !canEnable) {
                if (addButton) addButton.classList.toggle('disabled', (!canEnable ? !0 : scopedRows.length <= 1));
                if (removeButton) removeButton.classList.add('disabled');
                if (upButton) upButton.classList.add('disabled');
                if (downButton) downButton.classList.add('disabled');
            } else {
                // Enable/Disable the "up" button based on whether it's the first group
                if (upButton) upButton.classList.toggle('disabled', isFirst);

                // Enable/Disable the "down" button based on whether it's the last group
                if (downButton) downButton.classList.toggle('disabled', isLast);

                // addButton.classList.toggle('disabled', !1);
                // Always enable the "add" button (remove 'disabled' if present)
                if (addButton) addButton.classList.remove('disabled');
            }
            [addButton, removeButton, upButton, downButton].forEach((btn) => {
                if (btn) btn.onclick = self.M_FUN['REF_AU_EDIT'];
            });
        });
    } catch (err) {
        ref_logError('bindContributorRowControls', err);
    }
}

function GET_LAST_LAB(rLast, lab, self) {
    self = MultiRefModule;
    try {
        let last_lab = rLast.querySelector('.label');
        // Ensure format is retrieved
        let labelFormat = self.M_CONFIG['data-label-format'] || iREF_SCOPE.Reference && iREF_SCOPE.Reference['data-label-format'] || '';
        // Default empty
        let labelPrefix = self.M_CONFIG['data-label-prefix'] || '';

        // Handle numbered format correctly
        if (last_lab) {
            let lastLabelText = last_lab.textContent.trim();
            if (labelFormat === "numbered_with_dot" && lastLabelText.includes(".")) {
                lab = lab + '.';
            } else if (labelFormat === "numbered_with_squre_bracket" && lastLabelText.match(/\[\d+\]$/)) {
                lab = `[${lab}]`;
            }
        }

        // Handle prefix-suffix safely
        if (labelPrefix.includes("|")) {
            let [prefix, suffix] = labelPrefix.split("|");
            lab = prefix + lab + suffix;
        }

        return lab;
    } catch (err) {
        ref_logError('GET_LAST_LAB', err);
    }
}


function GET_NEW_ID(idx, dom, Options) {
    try {
        Options = Options ? Options : {
            cur_id: ""
        };
        if (idx <= 0) idx++;
        var get_ref = function(ind, n) {
            try {
                var tempDom = IS_JOURNAL ? dom : GlobalEditor.document.$;
                var id = (ind + n).toString().getBibId();
                var elm = tempDom.querySelector(`[id="${id}"]`);
                return {
                    id: id,
                    elm: elm ? elm : null,
                    missing: elm ? elm.hasAttribute("data-cite-missing") : null
                };
            } catch (err) {
                ref_logError('get_ref', err);
            }
        };
        // let [find, next, prev, count, org_idx] = [(idx).toString().getBibId(), (idx + 1).toString().getBibId(), (idx - 1).toString().getBibId(), 0, idx];
        var whileIf = true;
        let [findObj, nextObj, prevObj, count, final, org_idx] = [get_ref(idx, 0), get_ref(idx, 1), get_ref(idx, -1), 0, {}, idx];
        final = findObj;
        while (whileIf) {
            if ((!findObj.elm && nextObj.missing)) {
                if (!prevObj.elm) idx = idx - 1;
                final = get_ref(idx, 0);
                break;
            } else if (findObj.elm && findObj.missing && !nextObj.elm) {
                idx = idx + 1;
                final = get_ref(idx, 0);
                break;
            }
            if ((Options.overall < (count)) || (!findObj.elm && !nextObj.elm)) break;
            idx++;
            count++;
            [findObj, nextObj, prevObj] = [get_ref(idx, 0), get_ref(idx, 1), get_ref(idx, -1)];
            final = findObj;
            if (Options.overall < (count) || (!findObj.elm && !nextObj.elm)) break;
        }

        return {
            lab: idx,
            id: IS_JOURNAL ? final.id : prefixLastNumericSegment(final.id)
        };
    } catch (err) {
        ref_logError('GET_NEW_ID', err);
    }
}

function getTextContentCount(htmlString) {
    // Create a temporary element to hold the HTML string
    let tempDiv = document.createElement('div');
    // Set the HTML content
    tempDiv.innerHTML = htmlString;

    // Use textContent to get only the text inside, ignoring the tags like <br>
    // Get text and trim leading/trailing spaces
    let textContent = tempDiv.textContent.trim();

    // Return the length of the text content (number of characters)
    return textContent.length;
}


function unwrapElementsSummerNote(valueString, Options = {}, self) {
    self = MultiRefModule;
    try {
        if (valueString == "" || !valueString) {
            valueString = self.Panel.querySelector(".note-editor.note-frame.panel.panel-default .note-editable.panel-body").innerHTML;
        }
        const newParagraph = document.createElement('p');
        newParagraph.innerHTML = valueString;
        const elements = newParagraph.querySelectorAll('p,div,span[data-name],*');
        elements.forEach((el) => {
            // Check if the tag name is not 'b', 'i', 'sup', or 'sub'
            if (!['B', 'I', 'SUP', 'SUB', "EM", "SC", "STRONG"].includes(el.tagName)) {
                // Unwrap the element by moving its children to the parent
                commonMethods.iunWrap(el, {});
            }
        });
        let contents = newParagraph.innerHTML;
        return contents;
    } catch (err) {
        ref_logError('unwrapElementsSummerNote', err);
        return valueString;
    }
}

// Helper function to extract text from value or DOM element
function extractText(value, inputField) {
    try {
        if (typeof value === "object" && value.nodeType === 1) {
            return getTxt(value, {
                Get_innerHTML: inputField.id === "title"
            });
        }
        return value;
    } catch (err) {
        ref_logError('extractText', err);
    }
}

// Helper function to apply formatting using Summernote or another rich text editor
function applyFormatting(key, inputField, txt, self) {
    let {
        CUR_REF
    } = self.M_SCOPE;
    try {

        if (typeof inputField == "string") inputField = self.Panel.querySelector(`[id='${inputField}']`);
        if ((typeof key == "boolean" || self.M_CONFIG.FORMATTING_ITEMS.includes(key))) {
            let canEnable = !self.M_SCOPE.FROM_QRY || self.M_SCOPE.FROM_QRY && inputField.id == "title" && txt.length == 0 ? !0 : !1;
            if (canEnable) {
                const $existingEditor = $(self.Panel).find('.click2edit');
                if ($existingEditor.data('summernote')) {
                    // Destroy the existing instance
                    $existingEditor.summernote('destroy');
                }
                $(self.Panel).find('.click2edit,.note-editor,.note-frame panel').remove();

                if (!IS_JOURNAL && CUR_REF) {
                    var refEl = CUR_REF.querySelector(key);
                    if (refEl) txt = getTxt(refEl, {
                        Get_innerHTML: true
                    });
                }
                self.M_FUN.FIRE_SUMMER_NOTE(inputField, txt);
                return true;
            }
        }
        return false;
    } catch (err) {
        ref_logError('applyFormatting', err);
    }
}

// Main function with extracted modular logic
function handleTextFormatting(key, value, inputField, Options = {}, self) {
    self = MultiRefModule;
    try {
        // Extract the text based on the value type
        const txt = extractText(value, inputField);
        // Update the input field value
        inputField.value = txt;

        // Apply formatting if necessary
        return applyFormatting(key, inputField, txt, self);
    } catch (err) {
        ref_logError('handleTextFormatting', err);
    }
}

function handleInvalidPosition(position, CURRENT_MODEL) {
    try {
        if (position.new_ref_empty || position.cite_empty) {
            let key;
            if (position.new_ref_empty) {
                if (CURRENT_MODEL === "plain_text") {
                    key = "empty_plain_txt_content";
                } else if (CURRENT_MODEL === "open_form") {
                    key = "empty_field";
                } else {
                    key = "empty_doi_content";
                }
            } else {
                key = "empty_citation";
            }
            TOASTER_ALERT(key, {
                type: "warning"
            });
        } else if (!position.valid) {
            TOASTER_ALERT("CiteWarningAlert", {
                type: "warning"
            });
        }
    } catch (err) {
        ref_logError('handleInvalidPosition', err);
    }
}

// Shared functions



function closeDialogAndFinalize(self) {
    self = MultiRefModule;
    // self.refreshPanelDefault();
    self.closeDialog();
    AutoSaveBool = true;
}

// Combined and refactored INSERT_FIRE_ONCE and FIRE_UPDATE functions
function handleReferenceOperation(e, options = {}, self = MultiRefModule) {
    /* beautify preserve:start */
    const { M_SCOPE, M_FUN, ELEMENTS, G_FUN } = self;
    const { openwrap, closewrap, CURRENT_MODEL, OPEN_FROM, NEW_EDIT_CITE, NEW_CITE, EDIT_MODE, FROM_QRY, QRY_2_EDIT, CUR_QRY, CLONE_REF, INSERT_MODE } = M_SCOPE;
    const IMS = IMPACT_SELECTION;
    /* beautify preserve:end */
    // const isInsertOperation = !options.get_rid && !EDIT_MODE;
    const isInsertOperation = INSERT_MODE && !options.get_rid;
    const isRefOnly = options && options.ref_only === true;
    try {
        AutoSaveBool = false;
        if (isInsertOperation) {
            if (!validateFormFields(CURRENT_MODEL)) return;
            if (!validateCursorPosition(CURRENT_MODEL, isRefOnly)) return;
        }
        // *  3357606: LWW - Reference Bullet Style
        const {
            'data-interest-level': dataInterestLevelAlias
        } = iREF_SCOPE.Reference || {};

        if (self.M_CONFIG.INTEREST_LEVEL || dataInterestLevelAlias) {
            var current_type = getAnnotationType();
            if (current_type != "none") {
                var {
                    NOTE
                } = M_SCOPE.LAST_ANNOTATION || {};
                const err_key = "annatation_txt_content";

                if (!NOTE || (NOTE && $("<span>").append(NOTE).text().trim().length < 10)) {
                    TOASTER_ALERT(err_key, {
                        type: "warning"
                    });
                    return;
                }
            }
        }

        const isNameDate = iREF_SCOPE.IS_NAME_DATE;
        const isPlainText = CURRENT_MODEL === "plain_text";
        const isPlainForm = CURRENT_MODEL === "open_form";
        Object.assign(self.M_SCOPE, {
            IsNewlyAdd: isInsertOperation ? true : false,
            DOM: GlobalEditor.document.$
        });
        var results;
        commonMethods.cleanTranslatorExtensions(self.M_SCOPE.DOM);

        if (isInsertOperation) {
            results = performInsertOperation(self.M_SCOPE.DOM, isPlainText, options);
        } else {
            results = performUpdateOperation(e);
        }

        if (self.M_CONFIG.INTEREST_LEVEL || dataInterestLevelAlias) processCitationGroups();

        return results;

    } catch (err) {
        ref_logError(isInsertOperation ? "INSERT_REF_FIRE" : "FIRE_UPDATE", err);
    }
}

function validateCursorPosition(CURRENT_MODEL, isRefOnly = false) {
    try {
        const position = ref_cursor_Validation(null, {
            cursor_validation: true
        });

        // Ref-only mode → ONLY check new_ref_empty
        if (isRefOnly) {
            if (position.new_ref_empty) {
                handleInvalidPosition(position, CURRENT_MODEL);
                return false;
            }
            debug.log("valid cursor location (ref-only)");
            return true;
        }

        // Normal mode → full validation
        if (!position.valid || position.new_ref_empty || position.cite_empty) {
            handleInvalidPosition(position, CURRENT_MODEL);
            return false;
        }

        debug.log("valid cursor location");
        return true;
    } catch (err) {
        ref_logError('validateCursorPosition', err);
        return false;
    }
}


function doiTextValidation(CURRENT_MODEL, self) {
    var canInsert = true,
        key = "";
    self = MultiRefModule;
    try {
        if (/doi_form/gi.test(CURRENT_MODEL) && self.M_SCOPE.INSERT_MODE) {
            if (self.ELEMENTS.DoiTxtVal.value == "" || self.ELEMENTS.DoiTxtVal.classList.contains("is-invalid")) {
                canInsert = false;
                key = "empty_doi_content";
            }
        }
    } catch (err) {
        ref_logError("doiTextValidation", err);
        canInsert = false;
        key = "empty_doi_content";
    } finally {
        return {
            canUpdate: canInsert,
            replaceVal: "",
            findVal: "",
            keyVal: key
        };
    }
}

function validateFormFields(CURRENT_MODEL, self) {
    self = MultiRefModule;
    try {
        var finalStage = {};
        const {
            'data-interest-level': dataInterestLevelAlias
        } = iREF_SCOPE.Reference || {};

        const err_key = "annatation_txt_content";
        if (/doi_form|open_form/gi.test(CURRENT_MODEL)) {
            const [stageZero, stageOne, stageTwo] = [doiTextValidation(CURRENT_MODEL), self.M_FUN.AUTHOR_GROUP_VALIDATION(), self.M_FUN.MANDATORY_ELM_VALIDATION()];
            if (!stageZero.canUpdate || !stageOne.canUpdate || !stageTwo.canUpdate) {
                finalStage = stageZero.canUpdate ? stageOne.canUpdate ? stageTwo : stageOne : stageZero;
            }
        }
        if (dataInterestLevelAlias) {

            var {
                INTEREST_TYPE,
                NOTE_TXT
            } = getAnnotationType(true);

            if (INTEREST_TYPE != "none" && NOTE_TXT && $("<span>").append(NOTE_TXT).text().trim().length < 10) {
                finalStage.keyVal = err_key;
            }
        }

        if (finalStage && finalStage.keyVal) {
            AlertNewDialog.fire("warning", "Warning", finalStage.keyVal, "OK", "", true, {
                override: false,
                replace: finalStage.replaceVal,
                find: finalStage.findVal,
                current: finalStage.current,
                after: finalStage.after
            });
            return false;
        }
        return true;
    } catch (err) {
        ref_logError("validateFormFields", err);
    }

}




// Utility to ensure a group exists, create if missing
function ensureGroup(DOM, selector, tag, attrs, appendToSelector) {
    let group = DOM.querySelector(selector);
    if (!group) {
        // Use commonMethods.setAttr for node creation and attribute assignment
        let node = commonMethods.setAttr(tag, attrs);
        if (appendToSelector) {
            let parent = DOM.querySelector(appendToSelector);
            if (parent) parent.append(node);
        } else {
            let body = DOM.querySelector('div.body,div.book-body');
            if (body) body.after(node);
        }
        group = DOM.querySelector(selector);
    }
    return group;
}

var getNextId = (paramsId, newId) => {

    if (!paramsId) return paramsId;

    const regularParamsId = stripLeadingZerosFromLastNumericSegment(paramsId);
    const match = regularParamsId.match(/^(.*-)(\d+)$/);

    if (!match) return paramsId;

    const prefix = match[1];
    const lastPart = match[2];

    const nextVal = newId !== undefined ?
        Number(newId) :
        Number(lastPart) + 1;

    const finalPrefix = IS_JOURNAL ? prefix : prefixLastNumericSegment(prefix);

    return finalPrefix + String(nextVal).padStart(lastPart.length, "0");
};

function checkIdNotExists(DOM, baseId, seq) {

    let nextId = getNextId(baseId, seq);

    while (DOM.querySelector(`#${nextId}`)) {
        seq++;
        nextId = getNextId(baseId, seq);
    }

    return nextId;
}

function failedRefTargetsResult(DOM) {
    return {
        DOM: DOM || null,
        ref_list_coll: [],
        ref_root: null,
        bookIdSeq: null,
        ok: false
    };
}

function resolveRefTargets(DOM, selector) {
    try {
        const {
            CUR_CHAPTER,
            CUR_CHAPTER_ID
        } = EDITOR_CURSOR;
        const {
            documentSections = {}, baseId
        } = paraManager || {};

        let bookIdSeq = null;
        let isRefGroupInChapterEnd = false;

        if (!IS_JOURNAL && CUR_CHAPTER) {
            const refLists = CUR_CHAPTER.querySelectorAll("div.ref-list");
            isRefGroupInChapterEnd = refLists && refLists.length > 0;
        }

        const isBookEnd = !isRefGroupInChapterEnd;

        let ref_list_coll = DOM.querySelectorAll(selector);
        let backGroup = DOM.querySelector("div.back,div.book-back");
        let body = DOM.querySelector("div.body,div.book-body");
        let ref_root = DOM.querySelector(".ref-list");

        // -----------------------------
        // Build base ids
        // -----------------------------
        const extractPrefix = id => {
            const match = id && id.match(/^(workid-[A-Z0-9]+)/);
            return match ? match[1] : null;
        };

        if (isRefGroupInChapterEnd) {
            DOM = CUR_CHAPTER;
            ref_list_coll = DOM.querySelectorAll('div.ref-list');
            ref_root = DOM.querySelector("div.ref-list");
            body = DOM.querySelector("div.body");
            backGroup = DOM.querySelector("div.back");
        } else {

        }

        // -----------------------------
        // Restrict DOM to current chapter
        // -----------------------------

        if (!IS_JOURNAL) {

            const refContainer = ref_root;

            const hasRefs = refContainer && refContainer.querySelectorAll("[data-name='ref']").length > 0;
            const prefixBaseId = CUR_CHAPTER_ID ? baseId : extractPrefix(baseId);


            const nRefGroupId = prefixBaseId ? `${prefixBaseId}-ref-list-1` : "ref-list-1";
            const nRefId = prefixLastNumericSegment(prefixBaseId ? `${prefixBaseId}-ref-001` : "ref-001");

            // -----------------------------
            // Detect missing ref-list
            // -----------------------------
            isRefGroupInChapterEnd = !DOM.querySelector("div.ref-list");

            // -----------------------------
            // Ensure back group
            // -----------------------------
            backGroup = ensureGroup(
                DOM,
                "div.back,div.book-back",
                "div", {
                    "data-enter-af-fi": "yes",
                    ...GlobalAttributes["back"]
                },
                "div.book-part-meta"
            );

            // -----------------------------
            // Ensure ref-list group
            // -----------------------------
            ref_root = ensureGroup(
                DOM,
                "div.ref-list",
                "div", {
                    id: nRefGroupId,
                    "data-enter-af-fi": "yes",
                    ...GlobalAttributes["ref-list"]
                },
                "div.back,div.book-back"
            );

            // Refresh collections after ensure
            ref_list_coll = DOM.querySelectorAll(selector);

            let indexVal = 1;
            let IdSeq = 1;
            let finalId = nRefId;

            // -----------------------------
            // Empty ref-list case
            // -----------------------------
            if (isRefGroupInChapterEnd || ref_list_coll.length === 0) {

                if (!ref_root.querySelector("div.title")) {
                    const rTitle = commonMethods.setAttr(
                        "div", {
                            ...GlobalAttributes["title"],
                            id: s4(),
                            "data-enter-af-fi": "yes"
                        }, {
                            text: "Reference"
                        }
                    );

                    $(ref_root).prepend(rTitle);
                } else {
                    debug.log("Title already exists in ref-list");
                }

            } else {

                const allRef = Array.from(ref_list_coll);

                const labelElements = ref_root.querySelectorAll(`${selector} span.label`);

                const onlyNum = Array.from(labelElements).reduce((arr, elm) => {
                    const ref = elm.closest("div.ref");

                    if (!ref || !ref.id) return arr;

                    const num = parseInt(
                        elm.textContent.trim().replace(/\D/g, ""),
                        10
                    );

                    if (!isNaN(num)) arr.push(num);

                    return arr;
                }, []);

                const onlySeqID = allRef
                    .map(elm => parseInt(elm.id.split("-").pop(), 10))
                    .filter(num => !isNaN(num));

                indexVal =
                    onlyNum.length > 0 ?
                    Math.max(...onlyNum) + 1 :
                    1;

                IdSeq =
                    onlySeqID.length > 0 ?
                    Math.max(...onlySeqID) + 1 :
                    1;

                const firstRefId =
                    allRef.length > 0 ?
                    allRef[0].id :
                    null;

                finalId = checkIdNotExists(DOM, firstRefId, IdSeq);
            }

            bookIdSeq = {
                lab: indexVal,
                id: finalId
            };
        }

        return {
            DOM,
            ref_list_coll,
            ref_root,
            bookIdSeq,
            ok: true
        };

    } catch (err) {
        ref_logError("resolveRefTargets", err);
        return failedRefTargetsResult(DOM);
    }
}

function resolveNewRefId(ref_list_coll, ref_root, bookIdSeq) {
    const checkid = (bookIdSeq && bookIdSeq.id) || "";
    const refListCount = GlobalEditor.document.find(".ref-list").count();
    const isIdExists = checkid && GlobalEditor.document.find(`[id="${checkid}"]`).count() !== 0;
    const refsCount = GlobalEditor.document.find(".ref").count();

    // Otherwise generate a new one
    return GET_NEW_ID(refsCount, ref_root, {
        new_id: 0
    });
}

function buildNewRefNode(self, CURRENT_MODEL, isPlainText, Options, new_rid, new_label, last_ref) {

    const INS_DOM = self.trackManager.getInsNode(null, {
        setAttrParams: {
            'data-track-code': 'ref-01'
        }
    });

    const newRef = commonMethods.setAttr("div", self.templateList.ref_json(new_rid, CURRENT_MODEL), {});

    // Append INS_DOM to newRef and set ID
    $(newRef).append(INS_DOM).attr("id", new_rid);


    const {
        PlainTextBox,
        previewDiv
    } = self.ELEMENTS;

    // Determine newRef based on CURRENT_MODEL
    const newRefMix = /plain_text|plain_form/gi.test(CURRENT_MODEL) ?
        applyGlobalAttributes("span", "mixed-citation", {
            text: isPlainText ? PlainTextBox.value : (Options.plain_root || "")
        }) :
        previewDiv.querySelector(".mixed-citation");

    // Set publication type if _refType is "other"
    if (self._refType && self._refType === "other") {
        newRefMix.setAttribute('publication-type', "other");
    }

    // Prepare list of elements to append
    let appendList = [newRefMix];
    if (!iREF_SCOPE.IS_NAME_DATE) {
        // Prepare the initial element
        const labelTemplate = self.GetTemplate("label", {
            text: GET_LAST_LAB(last_ref, new_label),
            frag: true
        });
        // Use splice to insert labelTemplate at the beginning
        appendList.splice(0, 0, labelTemplate);
    }
    // Append elements to INS_DOM
    $(INS_DOM).append(...appendList);

    return newRef;
}

function buildCitationData(params) {
    try {
        const {
            self,
            DOM,
            IMS,
            isPlainText,
            IsSupFormat,
            openwrap,
            closewrap,
            NEW_EDIT_CITE,
            NEW_CITE,
            citeId,
            new_rid,
            new_label,
            newRef
        } = params;

        IMS.getInfo(GlobalEditor);

        const bookmark = IMS.CUR_SEL.createBookmarks(true);
        const bmFind = bookmark[0].startNode;
        const cur_post = DOM.querySelector(`[id="${bmFind}"]`);

        const Sibling = checkSiblingsBoolean(cur_post),
            isEdit = IMS.SEL_TEXT.length > 0,
            op = Sibling.IsXref ? "" : openwrap,
            cp = Sibling.IsXref ? "" : closewrap,
            IsEditLabel = Object.keys(NEW_EDIT_CITE).length > 0;

        IMS.CURSOR_AFTER_BEFORE_CHARACTER();
        const {
            insert_prefix,
            insert_suffix
        } = IMS.RG_INFO;

        let anchorEl = null;
        let citeHtml = "";

        if (iREF_SCOPE.IS_NAME_DATE) {
            if (isPlainText) {
                citeHtml = IsEditLabel && NEW_EDIT_CITE.string ?
                    NEW_EDIT_CITE.string :
                    NEW_CITE.FINAL_OUT[0].indirect.string;
            } else {
                let output = new namedCitation([new_rid], {
                    new: true,
                    rid: new_rid,
                    ref: newRef
                });
                citeHtml = output.FINAL_OUT[0] ?
                    output.FINAL_OUT[0][IMS.ISstartOfBlock ? "direct" : "indirect"].string :
                    op + _getBibCitation(newRef, new_rid, citeId) + cp;
            }
            citeHtml = insert_prefix + citeHtml + insert_suffix;
            anchorEl = citeHtml;
        } else {
            anchorEl = self.GetTemplate(IsSupFormat ? "sup" : "a", {
                rid: new_rid,
                frag: false,
                id: citeId,
                text: new_label,
                op: op,
                cp: cp
            });
        }

        return {
            anchorEl,
            citeHtml
        };
    } catch (error) {
        ref_logError('buildCitationData', error);
    }

}

function applyInterestLevelInsert(self, anchorEl, newRef, CURRENT_MODEL, INSERT_MODE) {
    try {
        let results = {};
        if (self.M_CONFIG.INTEREST_LEVEL) {
            var notePara = self.ELEMENTS.previewDiv.querySelector(".note");
            results = Handle_InsertOperation(anchorEl, newRef, notePara, CURRENT_MODEL, INSERT_MODE);

            if (results.anchorEl) anchorEl = results.anchorEl;
            if (results.newRef) newRef = results.newRef;
        }

        return {
            anchorEl,
            newRef,
            results
        };
    } catch (error) {
        ref_logError('applyInterestLevelInsert', error);
    }

}

function insertReferenceNode(params) {
    try {
        const {
            ref_root,
            newRef,
            CURSOR_POS_REF,
            citeHtml,
            isRefOnly
        } = params;
        if (iREF_SCOPE.IS_NAME_DATE) {
            if (citeHtml) {
                var newLab = $(document.createElement("span")).append(citeHtml).find("a").html();
                if (newLab) newRef.setAttribute("data-cite-label", newLab);
            }
            if (CURSOR_POS_REF) {
                $(CURSOR_POS_REF).after(newRef);
                TOASTER_ALERT(isRefOnly ? 'REF_INSERT_ONLY' : 'REF_INSERT');
            } else {
                $(ref_root).append(newRef);
                // ? 1996643: Inserting references pop-up
                AlertNewDialog.fire('success', "Success", 'REF_INSERT_WITH_RE_ORDER_NOTE', 'OK', '', true, {
                    override: true
                });
            }
            // ? Name and Date Ref - here add new id into id array || Ref Re-Order purpose
            if (!ref_root.hasAttribute('data-list-order')) {
                ref_root.setAttribute('data-list-order', Array.from(ref_root.querySelectorAll('div.ref')).map((item) => {
                    return (item.getAttribute(item.hasAttribute("del_id") ? "del_id" : 'id'));
                }));
            }
        } else {
            $(ref_root).append(newRef);
            CHECK_ORDER.FIRE_ONCE(GlobalEditor, {
                reNumber: true,
                alert: true,
                ins_ref: true
            });
        }
    } catch (error) {
        ref_logError('insertReferenceNode', error);
    }
}

function finalizeInsertOperation() {
    try {
        IMPACT_SELECTION._SNAPSHOT({
            save: true,
            unlock: true
        });

        if (IS_JOURNAL) {
            CitationNewModule.M_FUN.CreateCiteList(GlobalEditor.getData(), true);
        }
        closeDialogAndFinalize();
    } catch (error) {
        ref_logError('finalizeInsertOperation', error);
    }

}

function performInsertOperation(DOM, isPlainText, Options = {}, self) {
    self = MultiRefModule;
    /* beautify preserve:start */
    const { M_SCOPE, G_FUN } = self;
    const { openwrap, closewrap, CURRENT_MODEL, OPEN_FROM, NEW_EDIT_CITE, NEW_CITE, EDIT_MODE, FROM_QRY, INSERT_MODE } = M_SCOPE;
    const IMS = IMPACT_SELECTION;
    /* beautify preserve:end */

    try {

        const {
            'data-interest-level': dataInterestLevelAlias
        } = iREF_SCOPE.Reference || {};

        const IsSupFormat = iREF_SCOPE.Reference["text-format"] == "sup";
        const citeId = s4();
        const selector = iREF_SCOPE.IS_NAME_DATE ? "div.ref" : "div.ref:not([data-remove])";

        const targets = resolveRefTargets(DOM, selector);
        if (!targets || targets.ok === false) {
            ref_logError('performInsertOperation', new Error('resolveRefTargets failed'));
            return;
        }
        DOM = targets.DOM;
        const ref_list_coll = targets.ref_list_coll;
        const ref_root = targets.ref_root;
        const idObj = resolveNewRefId(ref_list_coll, ref_root, targets.bookIdSeq);

        if (Options.get_rid) return idObj.id;
        // if(IS_LOCAL_HOST) debugger;
        const last_ref = ref_list_coll[ref_list_coll.length - 1];
        const [new_label, new_rid] = [idObj.lab, idObj.id];
        const CURSOR_POS_REF = OPEN_FROM.CONTEXT_MENU ? DOM.querySelector(`[id="${OPEN_FROM.CLICK_REF_ID}"].ref`) : null;
        let newRef = buildNewRefNode(self, CURRENT_MODEL, isPlainText, Options, new_rid, new_label, last_ref);

        const isRefOnly = Options && Options.ref_only === true;
        let results = {};
        let anchorEl = null;
        let citeHtml = "";
        IMPACT_SELECTION._SNAPSHOT({
            lock: true,
            save: true
        });
        if (!isRefOnly) {

            var citeData = buildCitationData({
                self,
                DOM,
                IMS,
                isPlainText,
                IsSupFormat,
                openwrap,
                closewrap,
                NEW_EDIT_CITE,
                NEW_CITE,
                citeId,
                new_rid,
                new_label,
                newRef
            });
            anchorEl = citeData.anchorEl;
            citeHtml = citeData.citeHtml;

            if (self.M_CONFIG.INTEREST_LEVEL || dataInterestLevelAlias) {
                const adjusted = applyInterestLevelInsert(self, anchorEl, newRef, CURRENT_MODEL, INSERT_MODE);
                anchorEl = adjusted.anchorEl;
                newRef = adjusted.newRef;
                results = adjusted.results;
            }
        }

        if (!isRefOnly && results.alert) {
            // no-op
        } else {
            if (!isRefOnly) {
                GlobalEditor.insertHtml(anchorEl);
            }
            insertReferenceNode({
                ref_root,
                newRef,
                CURSOR_POS_REF,
                citeHtml,
                isRefOnly
            });
        }

        finalizeInsertOperation();
    } catch (err) {
        ref_logError('performInsertOperation', err);
    }
}

function performUpdateOperation(e, self) {
    self = MultiRefModule;
    /* beautify preserve:start */
    const { previewDiv, query_reply, AnnateInput } = self.ELEMENTS;
    const { QUERY_TO_EDIT, SHOW_QUERY_RESPONSE, UPDATE_CITATIONS } = self.M_FUN;
    let { M_CONFIG } = self;
    let { EDIT_MODE, CURRENT_MODEL, REF_ID, CUR_REF, UPDATE_CROSS_CITE, CUR_QRY, FROM_QRY, QRY_2_EDIT } = self.M_SCOPE;
    /* beautify preserve:end */
    try {
        const target = e.currentTarget;
        const isNewElmUpdate = M_CONFIG.NewElm && Object.keys(M_CONFIG.NewElm).length > 0;
        const queryList = previewDiv.querySelectorAll('[data-class="ckcommentsfull"]') || [];

        let msg = M_CONFIG.Update_MSG[target.id];
        let isForceClose = false;
        const generatedQueryResponse = isNewElmUpdate && (FROM_QRY || QRY_2_EDIT) ? buildMissingElementResponseContent(M_CONFIG.NewElm, self.Panel) : "";
        if (isNewElmUpdate && generatedQueryResponse) msg = generatedQueryResponse;

        if (target.id === "Reply_qry_edit_ref") {
            SHOW_QUERY_RESPONSE(null);
            return;
        }

        if (target.id === "edit_all_field") {
            QUERY_TO_EDIT();
            self.M_SCOPE.FORCE_CLOSE_QUERY = true;
            return;
        }
        const isEditModeLevel = AnnateInput.value !== "" || getAnnotationType();
        var isEditWithComments = false;
        if (target.id === "insert_edit_ref" && query_reply.value !== "") {
            msg = query_reply.value;
            isForceClose = true;
            if (EDIT_MODE) {

                isEditWithComments = true;
            }
        }
        if (!isForceClose && !validateFormFields(CURRENT_MODEL)) return false;

        var step1 = FROM_QRY && queryList.length > 0;
        var step2 = EDIT_MODE && QRY_2_EDIT;

        if (step1 || step2 || isEditWithComments) {
            updateQueryResponse(queryList, msg, isNewElmUpdate);
        } else {
            middlewareUpdate({});
        }

    } catch (err) {
        ref_logError('performUpdateOperation', err);
    }
}

function middlewareUpdate(results, self) {
    return runPostSubmitUpdate(results, self);
}

function runPostSubmitUpdate(results, self) {
    self = MultiRefModule;
    try {
        /* beautify preserve:start */
        const { previewDiv, query_reply, AnnateInput } = self.ELEMENTS;
        const { QUERY_TO_EDIT, SHOW_QUERY_RESPONSE, UPDATE_CITATIONS } = self.M_FUN;
        let { EDIT_MODE, CURRENT_MODEL, REF_ID, CUR_REF, UPDATE_CROSS_CITE } = self.M_SCOPE;
        /* beautify preserve:end */

        IMPACT_SELECTION._SNAPSHOT({
            save: true
        });

        const ckRef = REF_ID ? GlobalEditor.document.getById(REF_ID).$ : null;
        const normalizedComments = moveRefCommentsOutsideMixedCitation(previewDiv);
        const newMixedCitation = previewDiv.querySelector(".mixed-citation");
        const newComments = normalizedComments.length ? normalizedComments : previewDiv.querySelectorAll('[data-class="ckcommentsfull"]');

        updateReferences(ckRef, CUR_REF, newMixedCitation.cloneNode(true), newComments, getReferenceAnnotationElement(newMixedCitation));

        if (iREF_SCOPE.IS_NAME_DATE && UPDATE_CROSS_CITE) {
            UPDATE_CITATIONS();
        }

        if (EDIT_MODE) {}

        IMPACT_SELECTION._SNAPSHOT({
            unlock: true,
            save: true
        });

        closeDialogAndFinalize();

    } catch (err) {
        ref_logError('performUpdateOperation', err);
    }
}


function moveRefCommentsOutsideMixedCitation(refOrPreviewRoot) {
    try {
        if (!refOrPreviewRoot || !refOrPreviewRoot.querySelector) return [];

        let root = refOrPreviewRoot;
        let mixedCitation = root.matches && root.matches(".mixed-citation") ?
            refOrPreviewRoot :
            refOrPreviewRoot.querySelector(".mixed-citation");

        if (!mixedCitation) return [];

        if (refOrPreviewRoot === mixedCitation && mixedCitation.parentElement) {
            root = mixedCitation.parentElement;
        } else if (!mixedCitation.parentElement) {
            root = mixedCitation.ownerDocument.createElement("div");
            root.append(mixedCitation);
        }

        const movedIds = {};
        let insertAfter = mixedCitation;

        Array.from(mixedCitation.querySelectorAll('[data-class="ckcommentsfull"]')).forEach(comment => {
            const commentId = comment.id || "";
            const trackedWrapper = comment.closest("insert");
            const commentNode = trackedWrapper && mixedCitation.contains(trackedWrapper) ? trackedWrapper : comment;
            const duplicateOutside = commentId ? Array.from(root.querySelectorAll('[data-class="ckcommentsfull"]')).find(item => {
                return item.id === commentId && item !== comment && !mixedCitation.contains(item);
            }) : null;

            if ((commentId && movedIds[commentId]) || duplicateOutside) {
                commentNode.remove();
                return;
            }

            insertAfter.insertAdjacentElement("afterend", commentNode);
            insertAfter = commentNode;
            if (commentId) movedIds[commentId] = true;
        });

        return Array.from(root.querySelectorAll('[data-class="ckcommentsfull"]')).filter(comment => !mixedCitation.contains(comment));
    } catch (err) {
        ref_logError('moveRefCommentsOutsideMixedCitation', err);
        return [];
    }
}

function appendMixedCitationWithCommentsToPreview(mixedCitation, previewDiv) {
    try {
        if (!mixedCitation || !previewDiv) return;

        const normalizedComments = moveRefCommentsOutsideMixedCitation(mixedCitation.parentElement);
        const appendedComments = {};

        previewDiv.append(mixedCitation.cloneNode(true));

        Array.from(normalizedComments || []).forEach(comment => {
            const trackedWrapper = comment.closest("insert");
            const commentNode = trackedWrapper && mixedCitation.parentElement.contains(trackedWrapper) ? trackedWrapper : comment;
            const commentId = comment.id || "";

            if (commentId && appendedComments[commentId]) return;
            previewDiv.append(commentNode.cloneNode(true));
            if (commentId) appendedComments[commentId] = true;
        });
    } catch (err) {
        ref_logError('appendMixedCitationWithCommentsToPreview', err);
    }
}

function isRefQueryCommentElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    return element.matches('[data-class="ckcommentsfull"]') ||
        !!element.querySelector('[data-class="ckcommentsfull"]');
}

function getReferenceAnnotationElement(mixedCitation) {
    try {
        let annotationElm = mixedCitation ? mixedCitation.nextElementSibling : null;
        while (annotationElm && isRefQueryCommentElement(annotationElm)) {
            annotationElm = annotationElm.nextElementSibling;
        }
        return annotationElm;
    } catch (err) {
        ref_logError('getReferenceAnnotationElement', err);
        return null;
    }
}

function getRefFieldLabel(key, state, panel) {
    try {
        const target = state && state.target;
        const label = target && target.closest ? target.closest(".form-group") && target.closest(".form-group").querySelector("label") : null;
        const labelText = label ? label.textContent : "";
        return (labelText || (target && (target.title || target.placeholder)) || key || "").trim();
    } catch (err) {
        ref_logError('getRefFieldLabel', err);
        return key || "";
    }
}

function getMissingElementResponseValue(state) {
    try {
        if (!state) return "";

        const target = state.target;
        if (target) {
            if (typeof target.value == "string" && target.value.trim() !== "") return target.value.trim();
            if (typeof target.innerHTML == "string" && target.innerHTML.trim() !== "") return target.innerHTML.trim();
            if (typeof target.textContent == "string" && target.textContent.trim() !== "") return target.textContent.trim();
        }

        if (state.template) {
            if (typeof state.template.innerHTML == "string" && state.template.innerHTML.trim() !== "") return state.template.innerHTML.trim();
            if (typeof state.template.textContent == "string" && state.template.textContent.trim() !== "") return state.template.textContent.trim();
        }

        return "";
    } catch (err) {
        ref_logError('getMissingElementResponseValue', err);
        return "";
    }
}

function collectEditorContributorResponseContent(Panel) {
    try {
        if (!Panel) return "";

        return Array.from(Panel.querySelectorAll("#refeditorrepeat .form-group")).map(row => {
            const surname = row.querySelector('input[id^="editor_surname_"]');
            const given = row.querySelector('input[id^="editor_givenname_"]');
            const values = [
                surname && surname.value ? surname.value.trim() : "",
                given && given.value ? given.value.trim() : ""
            ].filter(Boolean);

            return values.join(" ");
        }).filter(Boolean).join("\n");
    } catch (err) {
        ref_logError('collectEditorContributorResponseContent', err);
        return "";
    }
}

function collectContributorPayloadRows(Panel, personGroupType = "author") {
    try {
        if (!Panel) return [];
        const selector = personGroupType === "editor" ? "#refeditorrepeat .form-group" : "#refauthorrepeat .form-group";
        const prefix = personGroupType === "editor" ? "editor_" : "";

        return Array.from(Panel.querySelectorAll(selector)).map((row, index) => {
            const surname = row.querySelector(`input[id^="${prefix}surname_"]`);
            const givenname = row.querySelector(`input[id^="${prefix}givenname_"]`);
            return {
                index,
                surname: surname && surname.value ? surname.value.trim() : "",
                givenname: givenname && givenname.value ? givenname.value.trim() : ""
            };
        }).filter(person => person.surname || person.givenname);
    } catch (err) {
        ref_logError('collectContributorPayloadRows', err);
        return [];
    }
}

function getRefFormInputValue(Panel, selector) {
    try {
        const input = Panel && Panel.querySelector(selector);
        if (!input) return "";
        if (typeof input.value == "string") return input.value.trim();
        return input.textContent ? input.textContent.trim() : "";
    } catch (err) {
        ref_logError('getRefFormInputValue', err);
        return "";
    }
}

function buildRefBridgePayloadFromForm(self, Options = {}) {
    self = self || MultiRefModule;
    try {
        const Panel = self.Panel;
        const currentType = Options.type ||
            Options.refType ||
            self.M_SCOPE.current_type ||
            self.M_SCOPE.currentType ||
            self.M_SCOPE.CURRENT_TYPE ||
            (self.ELEMENTS.formGroupDiv && self.ELEMENTS.formGroupDiv.getAttribute("data-current-form")) ||
            "journal";
        const etalInput = Panel && Panel.querySelector("#etal");
        const payload = {
            type: currentType === "other" ? "web" : currentType,
            authors: collectContributorPayloadRows(self.Panel, "author"),
            editors: collectContributorPayloadRows(self.Panel, "editor"),
            year: getRefFormInputValue(Panel, "#year"),
            source: getRefFormInputValue(Panel, "#source"),
            articleTitle: getRefFormInputValue(Panel, "#title"),
            chapterTitle: getRefFormInputValue(Panel, "#chapter-title"),
            publisherName: getRefFormInputValue(Panel, "#publisher-name"),
            publisherLoc: getRefFormInputValue(Panel, "#publisher-loc"),
            edition: getRefFormInputValue(Panel, "#edition"),
            doi: getRefFormInputValue(Panel, "#ext-link"),
            volume: getRefFormInputValue(Panel, "#volume"),
            issue: getRefFormInputValue(Panel, "#issue"),
            suppl: getRefFormInputValue(Panel, "#suppl"),
            collab: getRefFormInputValue(Panel, "#collab"),
            etal: etalInput ? !!etalInput.checked : false,
            fpage: getRefFormInputValue(Panel, "#fpage"),
            lpage: getRefFormInputValue(Panel, "#lpage")
        };

        Object.keys(payload).forEach(key => {
            if (Array.isArray(payload[key])) {
                if (!payload[key].length) delete payload[key];
            } else if (typeof payload[key] === "boolean") {
                return;
            } else if (payload[key] == null || payload[key] === "") {
                delete payload[key];
            }
        });

        return payload;
    } catch (err) {
        ref_logError('buildRefBridgePayloadFromForm', err);
        return {};
    }
}

function resolveRefBridge(self = MultiRefModule) {
    try {
        const root = typeof window !== "undefined" ? window : globalThis;
        if (root.refBridge) return root.refBridge;
        if (root.RefBridge && typeof root.RefBridge.create == "function") return root.RefBridge.create({
            globalObject: root
        });
        return null;
    } catch (err) {
        ref_logError('resolveRefBridge', err);
        return null;
    }
}

function buildReferencePreviewFromPayload(payload, self, Options = {}) {
    self = self || MultiRefModule;
    try {
        const bridge = resolveRefBridge(self);
        if (!bridge) return {
            refNode: null,
            mixedCitation: null,
            html: "",
            state: null,
            reason: "ref-bridge-missing"
        };

        const sourceRef = Options.refNode || Options.ref || self.M_SCOPE.CLONE_REF || self.M_SCOPE.CUR_REF;
        const builderOptions = Object.assign({}, Options, {
            refNode: sourceRef,
            apply: false
        });
        const result = self.M_SCOPE.FROM_QRY || self.M_SCOPE.QRY_2_EDIT ?
            bridge.buildQueryReferenceDom(payload, builderOptions) :
            bridge.buildEditReferenceDom(payload, builderOptions);
        const refNode = result && result.refNode ? result.refNode : null;
        const mixedCitation = refNode && refNode.querySelector ? refNode.querySelector(".mixed-citation") : null;

        return {
            refNode,
            mixedCitation,
            html: result && result.html ? result.html : (refNode ? refNode.outerHTML : ""),
            state: result && result.state ? result.state : null,
            reason: result && result.reason
        };
    } catch (err) {
        ref_logError('buildReferencePreviewFromPayload', err);
        return {
            refNode: null,
            mixedCitation: null,
            html: "",
            state: null,
            reason: "ref-bridge-error"
        };
    }
}

function buildMissingElementResponseContent(NewElm, Panel) {
    try {
        const editorResponse = collectEditorContributorResponseContent(Panel);
        const responseItems = Object.keys(NewElm || {}).map(key => {
            if (key === "editor") return "";
            const state = NewElm[key];
            const target = state && state.target;
            const template = state && state.template;
            const value = getMissingElementResponseValue(Object.assign({}, state, {
                target,
                template
            }));
            if (!value) return "";

            const label = getRefFieldLabel(key, state, Panel);
            return (label ? label + ": " : "") + value;
        }).filter(Boolean);

        if (editorResponse) responseItems.push("Contributors: " + editorResponse);

        return responseItems.join("\n");
    } catch (err) {
        ref_logError('buildMissingElementResponseContent', err);
        return "";
    }
}

async function waitFoQueryCommentsUpdates(queryId = null, options = {}) {
    var self = MultiRefModule;

    const {
        msg,
        elm,
        mixedCitation
    } = options;

    const preSaveResults = {
        hasContent: msg.length > 0,
        htmlData: msg,
        textData: msg,
        htmlLength: msg.length,
        textLength: msg.length,
        unchanged: false,
        canSave: true,
        canClose: false,
        domEl: elm
    };

    return await window.queryModule.operationInsertOrUpdate(null, queryId, preSaveResults, {
        from: self.name,
        process: "comment",
        appendEl: mixedCitation
    }, {
        domEl: elm,
        content: msg,
        closeQuery: options.closeQuery === true
    });
}

async function updateQueryResponse(queryList, msg, isNewElmUpdate, self = MultiRefModule) {
    const {
        M_SCOPE,
        ELEMENTS
    } = self;
    const {
        FROM_QRY,
        QRY_2_EDIT,
        CUR_QRY,
        EDIT_MODE
    } = M_SCOPE;
    const mixedCitation = ELEMENTS.previewDiv.querySelector(".mixed-citation");
    let results = {};

    try {
        moveRefCommentsOutsideMixedCitation(ELEMENTS.previewDiv);
        const activeQueryComment = resolveActiveQueryComment(ELEMENTS.previewDiv, CUR_QRY);
        if (activeQueryComment && window.queryModule && typeof window.queryModule.updateRefDOM2State == "function") {
            window.queryModule.updateRefDOM2State(activeQueryComment.id, activeQueryComment);
        }
        // --- Handle queries from QRY / EDIT ---
        if (FROM_QRY || QRY_2_EDIT) {
            if (queryList.length > 0) {
                for (const elm of queryList) {
                    // Append missing elements into citation
                    if (!mixedCitation.querySelector(`[id="${elm.id}"]`)) {
                        const trackedWrapper = elm.closest("insert");
                        const commentNode = trackedWrapper && ELEMENTS.previewDiv.contains(trackedWrapper) ? trackedWrapper : elm;
                        mixedCitation.insertAdjacentElement("afterend", commentNode);
                        window.queryModule.updateRefDOM2State(elm.id, elm);
                    }

                    // Process only matching current query
                    if (elm.id === CUR_QRY.id) {
                        results = await waitFoQueryCommentsUpdates(CUR_QRY.id, {
                            msg,
                            elm: activeQueryComment || elm,
                            closeQuery: isNewElmUpdate
                        });
                    }
                }
            } else if (activeQueryComment) {
                results = await waitFoQueryCommentsUpdates(CUR_QRY.id, {
                    msg,
                    elm: activeQueryComment,
                    closeQuery: isNewElmUpdate
                });
            } else {
                results = await waitFoQueryCommentsUpdates(null, {
                    mixedCitation,
                    msg
                });
            }
        }
        // --- Handle edit mode update ---
        else if (EDIT_MODE) {
            results = await waitFoQueryCommentsUpdates(null, {
                mixedCitation,
                msg
            });
        }

        // --- After getting results, call middleware ---
        await Promise.resolve(middlewareUpdate(results));

    } catch (err) {
        ref_logError("updateQueryResponse", err);
    }

    return results;
}

function resolveActiveQueryComment(previewDiv, curQry) {
    try {
        if (!previewDiv || !curQry || !curQry.id) return null;
        return previewDiv.querySelector(`[id="${curQry.id}"][data-class="ckcommentsfull"]`);
    } catch (err) {
        ref_logError('resolveActiveQueryComment', err);
        return null;
    }
}


function updateReferences(ckRef, curRef, newMixedCitation, newComments, annotationElm) {
    try {
        if (isRefQueryCommentElement(annotationElm)) annotationElm = null;
        const previewRoot = newMixedCitation && newMixedCitation.parentElement ? newMixedCitation.parentElement : document.createElement("div");
        if (newMixedCitation && !previewRoot.contains(newMixedCitation)) previewRoot.append(newMixedCitation);
        Array.from(newComments || []).forEach(comment => {
            if (!previewRoot.contains(comment)) previewRoot.append(comment);
        });
        newComments = moveRefCommentsOutsideMixedCitation(previewRoot);
        newMixedCitation = previewRoot.querySelector(".mixed-citation");
        if (curRef) moveRefCommentsOutsideMixedCitation(curRef);

        const curMixedCitation = curRef.querySelector(".mixed-citation");
        const labElm = curRef.querySelector(".label");

        if (curMixedCitation && newMixedCitation) {
            if (newMixedCitation.querySelector('[data-class="ckcommentsfull"]')) {
                var guardRoot = document.createElement("div");
                guardRoot.append(newMixedCitation);
                moveRefCommentsOutsideMixedCitation(guardRoot);
                newMixedCitation = guardRoot.querySelector(".mixed-citation");
                newComments = Array.from(newComments || []).concat(moveRefCommentsOutsideMixedCitation(guardRoot));
            }

            if (annotationElm) {
                var nextAnnotation = getReferenceAnnotationElement(curMixedCitation);
                if (nextAnnotation) $(nextAnnotation).replaceWith(annotationElm.cloneNode(true));
                else $(curMixedCitation).after(annotationElm.cloneNode(true));

                handleInterestLevelCommon({
                    evt: null,
                    target: labElm,
                    findTargets: () => [labElm]
                }, false);

            }
            curMixedCitation.replaceWith(newMixedCitation);

            newComments.forEach(comment => {
                const existingComment = comment.id ? Array.from(curRef.querySelectorAll('[data-class="ckcommentsfull"]')).find(item => item.id === comment.id) : null;
                if (existingComment && existingComment !== comment) existingComment.remove();
                if (newMixedCitation.querySelector(`#${comment.id}`)) {
                    debug.log("already found");
                    // TODO : NEED TO CHECK STATUS
                } else newMixedCitation.insertAdjacentElement("afterend", comment);
            });
        }
        ckRef.replaceWith(curRef);
    } catch (err) {
        ref_logError('updateReferences', err);
    }

}

function getCiteCollection(refId) {
    try {
        var selectors = commonMethods.xrefSelectorBuilder(refId);
        return GlobalEditor.document.find(selectors).toArray();
    } catch (err) {
        ref_logError('getCiteCollection', err);
        return [];
    }
}

function updateCitations(citeCollection, previewDiv, CLONE_REF, REF_ID, replace_key_alert_value) {
    const alertValues = new Set();

    citeCollection.forEach(cite => {
        try {
            const citeText = cite.getText();
            const {
                newAttr,
                oldAttr
            } = getCiteAttributes(cite);

            if (shouldUseNewLogic()) {
                updateCitationNewLogic(cite, citeText, CLONE_REF, REF_ID, previewDiv, newAttr, oldAttr);
            } else {
                updateCitationOldLogic(cite, citeText, previewDiv, replace_key_alert_value, alertValues);
            }
        } catch (err) {
            ref_logError('updateCitations', err);
        }
    });

    return [...alertValues].filter(Boolean);
}

function getCiteAttributes(cite) {
    return {
        newAttr: "data-old-cite",
        oldAttr: "data-cite-mod-year",
        isEdited: cite.hasAttribute("data-old-cite"),
        isOldEdited: cite.hasAttribute("data-cite-mod-year")
    };
}

function shouldUseNewLogic() {
    // This can be changed based on requirements
    return true;
}

function updateCitationNewLogic(cite, citeText, CLONE_REF, REF_ID, previewDiv, newAttr, oldAttr) {
    try {
        const cloneNode = CLONE_REF.cloneNode(true);
        const mixedCitation = previewDiv.querySelector(".mixed-citation");
        cloneNode.querySelector(".mixed-citation").innerHTML = mixedCitation ? mixedCitation.innerHTML : previewDiv.innerHTML;

        const gCite = new namedCitation([REF_ID], {
            new: true,
            ref: cloneNode
        });

        if (gCite.FINAL_OUT && gCite.FINAL_OUT[0]) {

            const insValue = processInsertValue(citeText, gCite.FINAL_OUT[0]);
            updateCiteAttributes(cite, citeText, insValue, newAttr, oldAttr);
            let string = gCite.FINAL_OUT[0].indirect.string;
            updateCiteHtml(cite, insValue, string.includes("italic"));
        }
    } catch (err) {
        ref_logError('updateCitationNewLogic', err);
    }
}

function processInsertValue(citeText, citation) {
    try {
        const hasOpenParen = /\(/gi.test(citeText);
        const hasEndParen = /\)/gi.test(citeText);
        const startsWithOpenParen = /^\(/.test(citeText);
        const {
            text
        } = citation[!startsWithOpenParen ? 'direct' : 'indirect'];
        let insValue = hasOpenParen || hasEndParen ? text : commonMethods.endsWithAny(text, {
            remove: true,
            start_remove: true
        });
        if (hasOpenParen || hasEndParen) {
            if (!hasEndParen) {
                insValue = commonMethods.endsWithAny(insValue, {
                    remove: true
                });
            }
        } else if (!hasOpenParen && !hasEndParen) {
            return insValue.replace(/[()]/g, '');
        }
        return insValue;
    } catch (err) {
        ref_logError('processInsertValue', err);
        return citeText;
    }
}

function updateCiteAttributes(cite, citeText, insValue, newAttr, oldAttr) {
    try {
        if (cite.hasAttribute(newAttr)) {
            if (insValue === cite.getAttribute(newAttr)) {
                cite.removeAttribute(newAttr);
            }
        } else {
            if (cite.hasAttribute(oldAttr)) {
                cite.removeAttribute(oldAttr);
            }
            cite.setAttribute(newAttr, citeText);
        }
    } catch (err) {
        ref_logError('updateCiteAttributes', err);
    }
}

function updateCiteHtml(cite, insValue, isEtAlItalic) {
    try {
        if (isEtAlItalic) {
            insValue = insValue.replace("et al.", "<em class='italic' data-name='italic'>et al.</em>");
        }
        cite.setHtml(insValue);
    } catch (err) {
        ref_logError('updateCiteHtml', err);
    }
}

function updateCitationOldLogic(cite, citeText, previewDiv, replace_key_alert_value, alertValues) {
    try {
        // Old logic implementation (can be refactored further if needed)
        // ...
    } catch (err) {
        ref_logError('updateCitationOldLogic', err);
    }
}

function showAlertDialog(alertValues, replace_key_alert_value) {
    try {
        const alertText = alertValues.join(" and ");
        AlertNewDialog.fire('warning', "Warning", "change_full_cite", 'OK', '', true, {
            override: false,
            text: alertText
        });
    } catch (err) {
        ref_logError('showAlertDialog', err);
    }
}


let checkIsElm = function(el, key, self) {
    self = MultiRefModule;
    try {
        let parent = el.parentElement;
        if (parent.tagName == 'INSERT' && parent.dataset.update == key) {
            self.M_SCOPE.reEdit = true;
            self.ELEMENTS.BODY.classList.add('edit');
            self.M_SCOPE.MISS_ELM_IDs.push(key);
        }
    } catch (err) {
        ref_logError('checkIsElm', err);
    }
};

function getTypeFromValue(value) {
    if (value.match(/\(([0-9]+){4}/g) || !(value.match(/\((.*)\)/g))) {
        return "direct";
    } else {
        return "indirect";
    }
}


function hasKeyIncludes(text, key) {
    // Case-insensitive regex
    const regex = new RegExp(key, "i");

    // Quick boolean check with includes
    const includesCheck = text.toLowerCase().includes(key.toLowerCase());

    // Regex match check
    const regexCheck = regex.test(text);

    // Return true if either check passes
    return includesCheck || regexCheck;
}

function childClasFinder(refClone) {
    try {
        const seen = {};
        if (refClone) {
            // Use native querySelectorAll since refClone is a DOM node
            refClone.querySelectorAll("*").forEach(function(el) {
                String(el.className || "").split(/\s+/).forEach(function(cls) {
                    if (cls) seen[cls] = true;
                });
            });
        }
        return Object.keys(seen);
    } catch (error) {
        return [];
    }
}

function openFromQuery(query, self) {
    self = MultiRefModule;
    try {
        const ref = query.closest('div.ref');
        const refClone = ref && ref.cloneNode(true);
        const uniqueClasses = childClasFinder(refClone);
        const isComment = query.getAttribute("data-status") === "comment";
        const classObj = self.M_CONFIG['ELM_MISS_TEXT_MAPPING'];
        let text = "";

        self.M_SCOPE.CUR_QRY = query;

        if (!ref || ref.hasAttribute("data-remove") || isComment) {
            return self.M_SCOPE.CanSkip ? true : false;
        }

        var pubNode = ref.querySelector('[publication-type]');
        var currentType = pubNode ? pubNode.getAttribute('publication-type') : null;

        var hasBookFields = ref.querySelector(".publisher-loc, .publisher-name");
        if (hasBookFields) {
            currentType = ref.querySelector(".chapter-title") ? "ed-book" : "book";
        }

        var withOutpersonGroup = ref.querySelector('.string-name') && !ref.querySelector('.person-group');

        if (!currentType || withOutpersonGroup) {
            return false;
        }

        var isAllowed = self.M_CONFIG.ALLOWED_TYPE.indexOf(currentType) !== -1;

        if (!isAllowed && !(window.IS_PLOS_DEMO && /book/i.test(currentType))) {
            return false;
        }

        self.M_SCOPE.REF_ID = ref.id;
        self.M_SCOPE.CLONE_REF = ref.cloneNode(true);
        self.M_SCOPE.CUR_REF = ref.cloneNode(true);

        ref.querySelectorAll('[data-user-comment-box][data-name="AQ"]').forEach((el) => {
            text += el.getAttribute('data-user-comment-box');
        });

        try {
            Object.keys(classObj).forEach((key) => {
                const hasKey = hasKeyIncludes(text, key);
                if (hasKey) {
                    const id = self.M_CONFIG['ReverseMapping'][classObj[key]];
                    if (id === "accessdate") {
                        debug.log("currently not available");
                    } else if (id === '#Reply_qry_edit_ref') {
                        self.M_SCOPE.CanSkip = true;
                        self.ELEMENTS.ReplyQryBtn.classList.remove('disabled');
                    } else if (id === "editor") {
                        self.M_SCOPE.IsMatch = true;
                        if (!self.M_SCOPE.MISS_ELM_IDs.includes("editor")) self.M_SCOPE.MISS_ELM_IDs.push("editor");
                    } else {
                        self.M_SCOPE.IsMatch = true;
                        const refElm = ref.querySelector(`.${id}`);
                        if (!refElm || refElm.textContent === '') {
                            self.M_SCOPE.MISS_ELM_IDs.push(id);
                        } else {
                            checkIsElm(refElm, id, self);
                        }
                        if (id === 'fpage') {
                            const parallelId = 'lpage';
                            if (refElm && refElm.textContent !== '') {
                                const elm1 = ref.querySelector(`.${parallelId}`);
                                if (elm1) checkIsElm(elm1, parallelId, self);
                                if ((!elm1 || elm1.textContent === '') && !self.M_SCOPE.reEdit) {
                                    self.M_SCOPE.MISS_ELM_IDs.push(parallelId);
                                }
                            } else if (!refElm) {
                                self.M_SCOPE.MISS_ELM_IDs.push(parallelId);
                            }
                        }
                    }
                }
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('openFromQuery', err.message);
        }



        if (IS_LOCAL_HOST) self.M_SCOPE.FORCE_OPEN = false;
        if (self.M_SCOPE.MISS_ELM_IDs.length === 0 && !self.M_SCOPE.CanSkip && !self.M_SCOPE.FORCE_OPEN) return false;

        self.M_SCOPE.FROM_QRY = true;
        // self.show(ref.id, {
        //     IGNORE_RESTORE: true,
        //     query,
        //     status: query.getAttribute("data-status")
        // }, null, self);
        return {
            IGNORE_RESTORE: true,
            FROM_QRY: true,
            query,
            status: query.getAttribute("data-status"),
            id: ref.id,
            current_type: currentType,
            refClasses: uniqueClasses
        };
    } catch (err) {
        ref_logError('openFromQuery', err);
        return null;
    }
}

function nXref(value, type, self) {
    self = MultiRefModule;
    try {
        const stringTemplate = self.M_SCOPE.NEW_CITE.FINAL_OUT[0][type].string;
        let result = value;

        if (type === "indirect") {
            if (value.startsWith("(")) result = value.slice(1);
            if (value.endsWith(")")) result = result.slice(0, -1);
        }

        const $div = $("<div>").html(stringTemplate);
        $div.find("a").text(result);
        return {
            text: value,
            string: $div.html()
        };
    } catch (err) {
        ref_logError('xRef', err);
    }
}

function EDIT_NEW_LABEL(e, Options = {}, self) {
    self = MultiRefModule;
    try {
        if (Object.keys(self.M_SCOPE.NEW_CITE).length == 0) return;
        const type = getTypeFromValue(e.target.value);
        const newObj = nXref(e.target.value, type);

        self.M_SCOPE.NEW_EDIT_CITE = newObj;

    } catch (err) {
        self.options.passiveSupported = false;
        ref_logError('EDIT_NEW_LABEL', err);
    }
}

function autoFocus(model, self) {
    self = MultiRefModule;
    model = model ? model : self.M_SCOPE.CURRENT_MODEL;
    try {
        let IsDOIForm = model == "doi_form";
        if (/doi_form|plain_text/gi.test(model)) {
            let inputFocus = self.ELEMENTS[IsDOIForm ? "DoiTxtVal" : "PlainTextBox"];
            if (inputFocus)
                if (typeof inputFocus.focus == "function") {
                    setTimeout((input) => {
                        input.focus();
                    }, 50, inputFocus);

                }
        }
    } catch (err) {
        ref_logError('autoFocus', err);
    }
}

MultiRefModule.handleKeyup = MultiRefModule.handleKeyupEvent = function(evt, self, mFunScope) {
    self = MultiRefModule;
    mFunScope = self.M_FUN;
    try {
        DIALOG_2_HTML(evt, {});
    } catch (err) {
        ref_logError('handleKeyupEvent', err);
    }
}

MultiRefModule.handleToolbarButtonClick = function(buttonName, evt, self) {
    self = MultiRefModule;
    try {
        setTimeout(() => {
            try {
                const panel = self.Panel || document.getElementById('MultiRefDialog');
                if (!panel) return;

                const toolbarButton = evt && evt.currentTarget ? evt.currentTarget : evt && evt.target;
                const noteEditor = toolbarButton && toolbarButton.closest ? toolbarButton.closest('.note-editor') : null;
                const editable = noteEditor ? noteEditor.querySelector('.note-editable') : panel.querySelector('.note-editor .note-editable');
                const target = noteEditor || editable;

                if (!target) return;

                DIALOG_2_HTML({
                    type: 'summernote-toolbar',
                    target,
                    currentTarget: target,
                    originalEvent: evt,
                    buttonName
                }, {});
            } catch (err) {
                ref_logError('handleToolbarButtonClick.defer', err);
            }
        }, 0);
    } catch (err) {
        ref_logError('handleToolbarButtonClick', err);
    }
}

function new_author_evt(self, mFunScope) {
    self = MultiRefModule;
    mFunScope = self.M_FUN;
    try {
        self.Panel.querySelectorAll('input[id^="surname_"],input[id^="givenname_"],#etal').forEach((inputFiled, idx, arr) => {
            inputFiled.classList.remove("disabled");
            inputFiled.removeAttribute("disabled");
            inputFiled.oninput = Debounce_Event((e) => DIALOG_2_HTML(e, {}));
        });
        self.M_FUN.ATTACH_LISTENERS();
    } catch (err) {
        ref_logError('new_author_evt', err);
    }
}

function reset_all_fields(self, FuncScope) {
    self = MultiRefModule;
    FuncScope = self.M_FUN;
    // if (IS_LOCAL_HOST) debugger;
    try {
        self.Panel.querySelectorAll('input.inputDiv,[type="checkbox"]').forEach(input => {
            if (input.id.startsWith('surname_') || input.id.startsWith('givenname_')) {
                if (input.id.endsWith('_0')) {
                    input.value = "";
                } else input.parentElement.removeChild(input);
            } else if (input.type == "text" || input.tag == "textarea") {
                input.value = "";
            } else if (input.type == "radio") {
                input.checked = false;
            }
        });
        self.ELEMENTS.previewDiv.innerHTML = "";
        self.ELEMENTS.PlainTextBox.value = "";
        self.ELEMENTS.PlainTextCite.value = "";
        self._refType = "journal";
        // ? 15_OCT_2024 - YA
        canDisableTypeChangeBtns(self.M_SCOPE.CURRENT_MODEL, !1, {});
    } catch (err) {
        ref_logError('reset_all_fields', err);
    }
}


function ref_cursor_Validation(e, Options = {}, self, FuncScope, IMS) {
    self = MultiRefModule;
    FuncScope = self.M_FUN;
    IMS = IMPACT_SELECTION;

    /* beautify preserve:start */
    let { OPEN_FROM, NEW_EDIT_CITE, NEW_CITE, TYPE, CURRENT_DATA, CURRENT_MODEL } = self.M_SCOPE;
    /* beautify preserve:end */
    let RESTRICT_CLASS = [];
    if (typeof CitationNewModule != "undefined") {
        if (CitationNewModule.initiated) CitationNewModule.init();
        if (CitationNewModule['M_SCOPE']) {
            RESTRICT_CLASS = CitationNewModule['M_SCOPE']['RESTRICT_CLASS'] || [];
        }
    }

    try {
        IMPACT_SELECTION.getInfo();
        var [IS_PLAIN_TXT, CITE_TET_IS_EMPTY, eCURSOR] = [CURRENT_MODEL == "plain_text", false, EDITOR_CURSOR];
        var myInput = (IS_PLAIN_TXT) ? (self.ELEMENTS.PlainTextBox.value) : (self.ELEMENTS.previewDiv.innerHTML),
            IsEmpty = myInput.length > 0 ? false : true,
            IsRestrict = IMS.NODE ? commonMethods.Duplicate_Array(IMS.PARENTS_CLAS_LIST, self["M_SCOPE"].Restrict_Class_Arr, {
                find: true,
                bool: true
            }) : false;
        var valid_location = eCURSOR.IS_CITATION_ALLOWED;

        if ([IMS.NODE_CLAS, IMS.PARENT_CLAS].some(i => RESTRICT_CLASS.includes(i)) || !!IsRestrict.length || IMS.IsMath) {
            valid_location = false;
        }

        if (self.G_CONFIG.IS_NAME_DATE) {

            if (eCURSOR.IS_BACK_PARA) valid_location = true;

            if (IS_PLAIN_TXT) {



                CITE_TET_IS_EMPTY = self.ELEMENTS.PlainTextCite.value.length > 0 ? false : true;

            }
        }
        if (window.paraLock && typeof window.paraLock._isElementLocked === "function") {
            const isLocked = window.paraLock._isElementLocked(IMS.NODE, {
                check_closest: true
            });
            if (isLocked) valid_location = false;
        }


        //self.ELEMENTS.alertArea.classList[valid_location ? ('add') : ('remove')]('d-none');
        if (Options.Pre_Check) {
            self.ELEMENTS.PlainTextCite.blur();
            self.Panel.querySelector(".dia_header_text").click();
            // GlobalEditor.focus();
            return;
        } else if (Options.cursor_validation) {
            return {
                new_ref_empty: IsEmpty,
                valid: valid_location,
                cite_empty: CITE_TET_IS_EMPTY
            };
        }
        if (self.G_CONFIG.IS_NAME_DATE && Object.keys(self['M_SCOPE'].NEW_CITE).length == 0) {
            let returnObj = handleReferenceOperation(null, {
                get_rid: true
            });
            let output = self['M_SCOPE'].NEW_CITE = new namedCitation([returnObj.rid], returnObj);
            debug.log(output);
            if (output.FINAL_OUT[0].indirect && IS_PLAIN_TXT) {}
        }
    } catch (err) {

        ref_logError('CheckCursor_Value', err);
    }
}
/*

| Input | `isLastPageTrim` | `isLastPageExpend` |
|-------|-----------------|-------------------|
| `100–199` | `99` | `199` |
| `234–256` | `56` | `256` |
| `198–234` | `234` | `234` |
| `A100–A134` | `A34` | `A134` |
| `A210–A256` | `A56` | `A256` |
| `A198–A234` | `A234` | `A234` |
| `100–B199` | `B199` | `B199` |
| `A10–B20` | `B20` | `B20` |
| `A210–B234` | `B234` | `B234` |
*/

function shortenRange(fullRange, isTrim = false, self) {
    self = MultiRefModule;
    var journal = self.M_CONFIG.refStyling_dom.journal;

    try {
        var elm = journal.querySelector(
            'elide[first="‡ref_pageFirst"][next="‡ref_pageLast"]'
        );

        var trimMode = elm ? elm.getAttribute("trim") : "";
        var expendMode = elm ? elm.getAttribute("expand") : "";

        var isLastPageTrim = trimMode === "lastpage";
        var isLastPageExpend = expendMode === "lastpage";

        var parts = fullRange.split(/[-–—]|\bthrough\b/gi);
        var start = parts[0];
        var end = parts[1];

        if (!end) return start;

        var startMatch = start.match(/(\D*)(\d+)/);
        var endMatch = end.match(/(\D*)(\d+)/);

        if (!startMatch || !endMatch) return fullRange;

        var startPrefix = startMatch[1];
        var startNumStr = startMatch[2];

        var endPrefix = endMatch[1];
        var endNumStr = endMatch[2];

        var startNum = parseInt(startNumStr, 10);
        var endNum = parseInt(endNumStr, 10);

        // safety check — only block on numeric ordering, not prefix mismatch
        if (endNum <= startNum) {
            return fullRange;
        }

        if (isLastPageTrim) {
            // strip shared leading digits from end number
            var i = 0;
            while (
                i < startNumStr.length &&
                i < endNumStr.length &&
                startNumStr.charAt(i) === endNumStr.charAt(i)
            ) {
                i++;
            }
            var shortenedEnd = endNumStr.substring(i);
            return endPrefix + shortenedEnd;
        }

        if (isLastPageExpend) {
            // if end has no prefix, prepend start's prefix
            var expandedEnd = endPrefix !== "" ?
                endPrefix + endNumStr :
                startPrefix + endNumStr;
            return expandedEnd;
        }

        return fullRange;

    } catch (err) {
        ref_logError('shortenRange', err);
    }
}
// Function to apply global attributes based on class name
function applyGlobalAttributes(element, className, Options) {
    let tag = element;
    if (typeof element == "string") element = document.createElement(tag);
    const attributes = GlobalAttributes[className];
    if (attributes) {
        return commonMethods.setAttr(element, attributes, Options);
    } else {
        console.warn(`Attributes for class '${className}' not found.`);
        return element;
    }
}

// Utility function to safely query input elements based on field type
function getInputElement(field, container) {
    try {
        const fieldMap = {
            '‡ref_auSurname': 'input[id^="surname_"],input[id^="editor_surname_"]',
            '‡ref_auGivenName': 'input[id^="givenname_"],input[id^="editor_givenname_"]',
            '‡ref_edSurname': 'input[id^="editor_surname_"]',
            '‡ref_edGivenName': 'input[id^="editor_givenname_"]'
        };
        if (container.nodeType == 1) return container.querySelector(fieldMap[field]) || null;
        else return null;
    } catch (err) {
        handleError('getInputElement', err);
        return null;
    }
}

// Utility function to create span elements and append them to the parent
function appendAuthorEl(parent, inputEl) {
    try {
        let dataName = inputEl.id.includes("surname") ? "surname" : "given-names";
        parent.appendChild(applyGlobalAttributes('span', dataName, {
            text: inputEl.value
        }));
    } catch (err) {
        handleError('appendSpanElement', err);
    }
}

// Main function to create spans based on the order
function createSpansFromOrder(nameOrder, formContainer, formIndex, self) {
    self = MultiRefModule;
    const stringName = applyGlobalAttributes('span', "string-name", {});
    try {
        const fieldsOrder = formIndex === 0 ? nameOrder.first.split(',').map(f => f.trim()) : nameOrder.rest.split(',').map(f => f.trim());

        // Get all input elements first
        const inputElements = fieldsOrder.map(field => {
            const fieldKey = field.replace("‡", "");
            if (formContainer[fieldKey]) {
                return {
                    value: formContainer[fieldKey],
                    id: field.replace("‡ref_au", "").toLowerCase()
                };
            } else {
                return getInputElement(field, formContainer);
            }
        });
        // ? Append elements and delimiters
        inputElements.forEach((inputElement, idx) => {
            if (inputElement) {
                appendAuthorEl(stringName, inputElement);
                if (idx < inputElements.length - 1 && inputElements[idx + 1]) {
                    const currentField = fieldsOrder[idx];
                    const nextField = fieldsOrder[idx + 1];
                    const delimiter = self.M_FUN.GET_DELIM(currentField, nextField);
                    if (delimiter !== undefined) {
                        stringName.append(delimiter);
                    }
                }
            }
        });
        return stringName;
    } catch (err) {
        handleError('createSpansFromOrder', err);
        return null;
    }
}

function buildEditorContributorTemplate(self = MultiRefModule) {
    try {
        const editorRows = Array.from(getContributorRows(self.Panel, {
            container: "#refeditorrepeat"
        })).filter(row => {
            return !row.hasAttribute("data-delete") && Array.from(row.querySelectorAll("input")).some(input => input.value.trim() !== "");
        });

        if (!editorRows.length) return null;

        const editorFormat = self.M_CONFIG.STYLE_PATTERN.querySelector('group[name="editor"]') || self.M_CONFIG.refStyling_dom.journal.querySelector('group[name="author"]');
        const personGroupHtml = applyGlobalAttributes('span', 'person-group');
        personGroupHtml.setAttribute("person-group-type", "editor");

        editorRows.forEach((formContainer, index, array) => {
            const editorSpans = createSpansFromOrder({
                first: editorFormat.getAttribute("first"),
                rest: editorFormat.getAttribute("rest")
            }, formContainer, index);

            if (editorSpans) {
                personGroupHtml.append(editorSpans);
                if (index + 1 !== array.length) {
                    const delimValue = self.M_FUN.GET_DELIM("author", "author", "", {
                        get_attr: (index + 2 === array.length) ? "last" : ""
                    });
                    personGroupHtml.append(delimValue);
                }
            }
        });

        return personGroupHtml;
    } catch (err) {
        ref_logError('buildEditorContributorTemplate', err);
        return null;
    }
}

// Refactored function to create the output HTML
function DIALOG_2_HTML(e, Options = {}, self, order) {
    self = MultiRefModule;

    if (self.M_SCOPE.FROM_QRY || self.M_SCOPE.EDIT_MODE) {
        self.M_FUN.HandleNewElement(e);
        return;
    }
    // if (IS_LOCAL_HOST) debugger;
    try {
        /* beautify preserve:start */
        const { refStyling_dom, DELIM, ReverseMapping, CURRENT_DATA, INTEREST_LEVEL } = self.M_CONFIG;
        const { journal } = refStyling_dom;
        const { count, after, insert, missing } = self.M_CONFIG["author_trim"];
        /* beautify preserve:end */

        /*
         * 3357606: LWW - Reference Bullet Style
         * handle if other fields updated - also update  preview
         *
         */
        Hande_Other_Input_Evt_bubbles(INTEREST_LEVEL);

        canDisableTypeChangeBtns(self.M_SCOPE.CURRENT_MODEL, !0, {});

        const refHtml = applyGlobalAttributes('div', 'ref');
        const mixedHtml = applyGlobalAttributes('span', 'mixed-citation');

        if (self._refType && self._refType == "other") mixedHtml.setAttribute('publication-type', "other");

        let prev = null;
        const formContainers = formGroupList();
        const create_authorGroup = () => {
            try {
                const authorFormat = journal.querySelector('group[name="author"]');
                const personGroupHtml = applyGlobalAttributes('span', 'person-group');

                var loopItems = Options.get_citation ? e.author : formContainers;

                const isEtalAddIndex = shouldUseEtal(count, after, loopItems);

                Array.from(loopItems).forEach((formContainer, index, array) => {
                    if (isEtalAddIndex && isEtalAddIndex == index) {
                        handleEtalCheckbox(self, personGroupHtml);
                    } else {
                        const authorSpans = createSpansFromOrder({
                            first: authorFormat.getAttribute("first"),
                            rest: authorFormat.getAttribute("rest")
                        }, formContainer, index);

                        if (authorSpans) {
                            personGroupHtml.append(authorSpans);
                            if (index + 1 !== array.length && isEtalAddIndex == null) {
                                let thirdParam = (index + 2 === array.length) ? {
                                    get_attr: "last"
                                } : {};
                                let delimValue = self.M_FUN.GET_DELIM("author", "author", "", thirdParam);
                                personGroupHtml.append(delimValue);
                            }
                        }
                    }
                });

                // Append etal to person-group when checkbox is checked (handles both auto-etal and manual toggle)
                appendEtalToPersonGroup(self, personGroupHtml);

                return personGroupHtml;
            } catch (err) {
                handleError('create_authorGroup', err);
                return null;
            }
        };

        const isKeyPresent = (orderItem) => {
            const json_key = ReverseMapping[orderItem];
            const input = self.Panel.querySelector(`#${json_key}`);
            if (Options.get_citation && e[json_key]) return e[json_key];
            if (orderItem === "author") return create_authorGroup();
            else if (json_key === "etal") {
                // Return null when checked because etal is now appended inside person-group
                // by appendEtalToPersonGroup in create_authorGroup
                if (input && input.checked) {
                    return null;
                }
                return null;
            } else if (json_key === "title") {
                if (Options.content) return Options.content;
                else return unwrapElementsSummerNote("");
            }
            if (input && input.value) return input.value;
            else return null;
        };
        order = journal.getAttribute('order').split(",").map(function(item) {
            return item.trim();
        }).filter(Boolean);
        // Pass A: which order styles currently have values
        var presentIds = new Set();
        order.forEach(function(item) {
            if (isKeyPresent(item)) presentIds.add(item);
        });
        // Pass B: apply all <remove> rules (style-only / AvilableStyle)
        order = applyCegRemoveRules(order, presentIds, journal);
        const lastItem = findLastPresentItem(order, isKeyPresent);

        order.forEach((item, index, array) => {
            const value = isKeyPresent(item);
            if (value) {
                appendItemToMixedHtml(item, value, prev, lastItem, mixedHtml, DELIM, missing, self);
                prev = item;
            } else if (ReverseMapping[item] === "etal") {
                const etAl = self.Panel.querySelector("#etal");
                if (etAl && etAl.checked) {
                    prev = item;
                }
                // When etal is checked but skipped (no value), still advance the delimiter chain
                // so year delimiter uses ‡ref_etal → ‡ref_pubdateYear instead of author → year
            }
        });
        refHtml.append(mixedHtml);
        if (self.M_SCOPE.CURRENT_MODEL == "plain_text" && Options.get_citation) {
            let newRefObj = performInsertOperation(GlobalEditor.document.$, !0, {
                get_rid: !0
            });
            return new namedCitation([newRefObj], {
                new: true,
                ref: refHtml.cloneNode(true)
            });
        } else {
            $(self.ELEMENTS.previewDiv).html("").append(refHtml);
            return refHtml;
        }
    } catch (err) {
        handleError('DIALOG_2_HTML', err);
        return null;
    }
}

// Utility function for error handling
function handleError(functionName, error) {
    console.warn(`${functionName}: ${error.message}`);
    ErrorLogTrace(functionName, error.message);
}

// Utility function to check if et al. should be used
function shouldUseEtal(count, after = null, arrayOrLength = []) {
    try {
        const countNum = parseInt(count, 10);
        const arrayLength = Array.isArray(arrayOrLength) ? arrayOrLength.length : parseInt(arrayOrLength, 10);

        if (!countNum || arrayLength < countNum) return null;

        const afterNum = after != null ? parseInt(after, 10) : null;
        const firstValidIndex = Array.from({
            length: arrayLength
        }, (_, index) => index + 1).find(i => i > afterNum);
        return firstValidIndex || null;
    } catch (error) {
        console.error('Error in shouldUseEtal:', error);
        // Or you can throw error or return something else as needed
        return null;
    }
}


// Utility function to handle et al. checkbox
function handleEtalCheckbox(self, personGroupHtml) {
    if (personGroupHtml && personGroupHtml.lastChild.nodeType === 3) {
        personGroupHtml.removeChild(personGroupHtml.lastChild);
    }
    if (self.M_SCOPE.CURRENT_MODEL !== "plain_text")
        self.Panel.querySelector(`#etal`).checked = true;
}

// Utility function to append etal span inside person-group during insert operations
function appendEtalToPersonGroup(self, personGroupHtml) {
    const etalCheckbox = self.Panel.querySelector("#etal");
    if (!etalCheckbox || !etalCheckbox.checked) return;
    if (personGroupHtml.querySelector(".etal")) return;

    const {
        insert
    } = self.M_CONFIG["author_trim"];
    if (!insert) return;

    // Remove trailing text delimiter if present (same logic as handleEtalCheckbox)
    if (personGroupHtml.lastChild && personGroupHtml.lastChild.nodeType === 3) {
        personGroupHtml.removeChild(personGroupHtml.lastChild);
    }

    // Get author→etal delimiter
    let delim = self.M_FUN.GET_DELIM("author", "‡ref_etal");

    // Handle OUP PI edge case: if client is OUP and delimiter starts with "."
    const isOUP = commonMethods.getClientCode({
        format: "lower"
    }) === "oup";
    if (isOUP && delim && delim.startsWith(".")) {
        // Create PI span for the leading dot
        const piSpan = applyGlobalAttributes("span", "etal-pi", {});
        if (personGroupHtml.lastElementChild) {
            personGroupHtml.lastElementChild.append(piSpan);
        }
        delim = delim.substring(1);
    }

    // Append delimiter as text node if present
    if (delim) {
        personGroupHtml.appendChild(document.createTextNode(delim));
    }

    // Append etal span
    const etalSpan = applyGlobalAttributes("span", "etal", {
        text: insert
    });
    personGroupHtml.appendChild(etalSpan);
}

// Utility function to find the last present item in the order
function findLastPresentItem(order, isKeyPresent) {
    for (let i = order.length - 1; i >= 0; i--) {
        if (isKeyPresent(order[i])) return order[i];
    }
    return null;
}

/**
 * Split a CEG style id list (comma-separated) into trimmed non-empty tokens.
 * @param {string|null|undefined} raw
 * @returns {string[]}
 */
function parseCegStyleIdList(raw) {
    if (raw == null || raw === '') return [];
    return String(raw).split(',').map(function(part) {
        return part.trim();
    }).filter(Boolean);
}

/**
 * Read all &lt;remove&gt; directives under a CEG style node.
 * Supports typo attribute AvilableStyle and corrected AvailableStyle.
 * @param {Element|null|undefined} styleNode
 * @returns {{ styleIds: string[], availableStyleIds: string[] }[]}
 */
function collectCegRemoveDirectives(styleNode) {
    if (!styleNode || !styleNode.querySelectorAll) return [];
    var nodes = styleNode.querySelectorAll('remove');
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var styleIds = parseCegStyleIdList(node.getAttribute('style'));
        if (!styleIds.length) continue;
        var availableRaw = node.getAttribute('AvilableStyle') || node.getAttribute('AvailableStyle') || '';
        out.push({
            styleIds: styleIds,
            availableStyleIds: parseCegStyleIdList(availableRaw)
        });
    }
    return out;
}

/**
 * Apply CEG &lt;remove&gt; rules to an order list (two-pass consumer helper).
 * - style only → always drop those ids
 * - style + AvilableStyle → drop style ids only when every AvilableStyle id is in presentIds
 * @param {string[]} order
 * @param {Set<string>|string[]} presentIds
 * @param {Element|null|undefined} styleNode
 * @returns {string[]}
 */
function applyCegRemoveRules(order, presentIds, styleNode) {
    var present = presentIds instanceof Set ? presentIds : new Set(presentIds || []);
    var toDrop = new Set();
    var directives = collectCegRemoveDirectives(styleNode);
    for (var d = 0; d < directives.length; d++) {
        var dir = directives[d];
        var shouldDrop = false;
        if (!dir.availableStyleIds.length) {
            shouldDrop = true;
        } else {
            shouldDrop = dir.availableStyleIds.every(function(id) {
                return present.has(id);
            });
        }
        if (shouldDrop) {
            dir.styleIds.forEach(function(id) {
                toDrop.add(id);
            });
        }
    }
    return (order || []).filter(function(item) {
        return item && !toDrop.has(item);
    });
}

/**
 * Style ids to hide in the form (unconditional &lt;remove style="…"&gt; only).
 * Conditional AvilableStyle removes stay editable; preview suppresses them when met.
 * @param {Element|null|undefined} styleNode
 * @returns {string[]}
 */
function collectUnconditionalCegRemoveStyles(styleNode) {
    var out = [];
    var directives = collectCegRemoveDirectives(styleNode);
    for (var i = 0; i < directives.length; i++) {
        if (directives[i].availableStyleIds.length) continue;
        out = out.concat(directives[i].styleIds);
    }
    return out;
}

function isDOIPattern(text) {
    return !!text && (
        /https?:\/\/doi\.org\//i.test(text) ||
        /\b10\.\d+/i.test(text)
    );
}

/**
 * Build a reference DOI/URL leaf from hyperlink classification.
 * Shared by insert Form Based (appendItemToMixedHtml) and HandleNewElement.
 * @returns {{ element: Element, type: string, isDOI: boolean, styleKey: string }|null}
 */
function buildReferenceLinkElement(value, options) {
    try {
        options = options || {};
        if (typeof hyperLinkDialog === 'undefined' ||
            typeof hyperLinkDialog.getLinkTypeFromText !== 'function') {
            ref_logError('buildReferenceLinkElement', new Error('hyperLinkDialog.getLinkTypeFromText unavailable'));
            return null;
        }
        const linkData = hyperLinkDialog.getLinkTypeFromText(value, 'reference', options) || {};
        const attributes = linkData.attributes || {};
        const type = String(linkData.type || '');
        const isDOI = /^doi-/i.test(type);
        const element = commonMethods.setAttr('span', attributes);
        element.textContent = value;
        return {
            element,
            type,
            isDOI,
            styleKey: isDOI ? '‡ref_idDOI' : '‡ref_URL'
        };
    } catch (err) {
        ref_logError('buildReferenceLinkElement', err);
        return null;
    }
}

const createSpanElement = (value, reverse, params) => {
    const key = (reverse === "title") ? 'append' : 'text';
    return commonMethods.setAttr(document.createElement('span'), params, {
        [key]: value
    });
};

// Utility function to append an item to the mixed HTML
function appendItemToMixedHtml(item, value, prev, lastItem, mixedHtml, DELIM, missing, self) {
    const {
        ReverseMapping
    } = self.M_CONFIG;
    let element;
    try {
        if (item === "author") {
            element = value;
        } else {
            const reverse = ReverseMapping[item];
            const dtdMapping = self.M_FUN.GET_DTD_MAP(reverse);
            const reverseItem = dtdMapping !== reverse ? dtdMapping : reverse;
            const IsExtLink = reverseItem === "ext-link";
            const key = (reverse === "title") ? 'append' : 'text';
            const params = {
                class: reverseItem,
                'data-name': reverseItem
            };

            if (IsExtLink) {
                const built = buildReferenceLinkElement(value);
                if (built && built.element) {
                    element = built.element;
                    if (!built.isDOI) item = built.styleKey;
                }
            } else {
                element = commonMethods.setAttr(document.createElement('span'), params, {
                    [key]: value
                });
            }

        }

        if (element) {
            const reverse = ReverseMapping[item];
            // Defensive guard: if etal, append inside person-group instead of mixed-citation
            if (reverse === "etal") {
                const personGroup = mixedHtml.querySelector(".person-group");
                if (personGroup) {
                    personGroup.appendChild(element);
                } else {
                    mixedHtml.appendChild(element);
                }
            } else {
                mixedHtml.appendChild(element);
            }
            appendDelimiters(item, prev, lastItem, mixedHtml, DELIM, element);
        } else if (missing.includes(item)) {
            const elem = document.querySelector(`#${item}`);
            if (elem) elem.classList.add('highlight');
        }
    } catch (err) {
        ref_logError('appendItemToMixedHtml', err);
    }
}


// Utility function to append delimiters
function appendDelimiters(item, prev, lastItem, mixedHtml, DELIM, element) {
    try {
        const delimSelector = `[first="${prev}"][next="${item}"]`;
        const lastDelimSelector = `[first="${item}"][next=""]`;
        const {
            DOI_PREFIX
        } = MultiRefModule.M_SCOPE;
        const isOUP = commonMethods.getClientCode({
            format: "lower"
        }) === "oup";
        const isDOI = item == "‡ref_idDOI";
        const isEtal = prev === '‡ref_etal';
        const isAuthor = prev === '‡ref_etal';
        var add = ". ";

        if (prev) {
            const delimElement = DELIM.querySelector(delimSelector);
            var delim = delimElement && delimElement.getAttribute('delim');

            if (delim) {
                // ? Special case for OUP client
                const startWithDot = delim.startsWith(".");
                const isOupLeadingDot = startWithDot && isEtal && isOUP;

                if (isDOI && element.textContent.indexOf(DOI_PREFIX) > -1) {
                    if (delim == '. doi: ' || delim == '. https://doi.org/') {
                        delim = add;
                    }
                }

                // ! 3328535: OUP - New PI for et al handling in references

                if (isOupLeadingDot) {
                    var piSpan = applyGlobalAttributes("span", "etal-pi", {});
                    // element.before();
                    if (element.previousElementSibling) {
                        element.previousElementSibling.append(piSpan);
                    }
                    delim = delim.substring(1);
                }

                if (startWithDot && element.textContent.endsWith(".")) {
                    // compareText_New(next_Item.nodeValue, finalSuffix)
                    delim = delim.substring(1);
                }

                // Normal case — just insert delim as text
                var textNode = document.createTextNode(delim);
                mixedHtml.insertBefore(textNode, element);
            }
        }

        if (lastItem === item) {
            const lastDelimElement = DELIM.querySelector(lastDelimSelector);
            if (lastDelimElement) {
                mixedHtml.appendChild(document.createTextNode(lastDelimElement.getAttribute('delim')));
            }
        }
    } catch (err) {
        ref_logError('appendDelimiters', err);
    }
}

function dataExists(e, TARGET_VAL, callback, self) {
    self = MultiRefModule;
    try {
        if (self.ELEMENTS.previewDiv.querySelectorAll("*").length > 0 || self.ELEMENTS.PlainTextBox.value.length > 0) {
            return AlertNewDialog.fire('warning', "", 'change_radio', 'Yes', 'No', true, {
                override: true
            }).then((result) => {
                if (result.isConfirmed) {
                    reset_all_fields();
                    self.Panel.querySelector(`[value="${TARGET_VAL}"]`).click();
                    if (callback != "undefined" && typeof callback == "function") callback();
                } else if (result.isDenied) {
                    // self.Panel.querySelector(`[value="${TARGET_VAL}"]`).click();
                    e.preventDefault();
                }
            });
        } else return false;
    } catch (err) {

    }
}
// Function to handle page value
function handlePageValue(pageValue, dialogPanel, Options = {}, self, mFunScope) {
    self = MultiRefModule;
    mFunScope = self.M_FUN;
    /* beautify preserve:start */
    const { json_2_dialog, json_2_html } = Options;
    let { TYPE, CURRENT_DATA, CURRENT_MODEL } = self.M_SCOPE;
    /* beautify preserve:end */

    let tempKey = pageValue;
    if (json_2_html) {
        if (/fpage|lpage/gi.test(pageValue)) {
            if (CURRENT_DATA["page"] == "" || !CURRENT_DATA["page"]) {
                return "";
            }
            pageValue = CURRENT_DATA["page"];
        } else return null;
    }

    const pageSplit = pageValue.split(/-|–|—/);
    const fpageInput = dialogPanel.querySelector('#fpage');
    const lpageInput = dialogPanel.querySelector('#lpage');

    if (json_2_dialog) {
        let fpage = pageSplit[0],
            lpage = "";
        if (pageSplit.length > 1 && lpageInput) {
            lpage = shortenRange(pageValue);
        }
        if (json_2_html && tempKey == "fpage") return fpage;
        if (json_2_dialog && fpageInput) fpageInput.value = fpage;

        if (json_2_dialog && lpageInput)
            lpageInput.value = lpage;
        if (json_2_html && tempKey == "lpage") return lpage;
    }
}

function resolveOpenContext(param1, Options = {}, self, mFunScope) {
    self = MultiRefModule;
    mFunScope = self.M_FUN;

    if (!self.Panel || !document.body.contains(self.Panel)) {
        self.Panel = document.getElementById(self._Id);
    }

    if (Options.FROM_QRY && !Options.IGNORE_RESTORE) {
        mFunScope.restoreDefault(Options);
    }

    let returnOptions = Options.FROM_QRY ? openFromQuery(param1) : null;

    if (returnOptions && returnOptions.id) {
        param1 = returnOptions.id;
    } else if (Options.FROM_QRY && !returnOptions) {
        self.closeDialog();
        if (typeof queryDialog != "undefined") {
            window.queryDialog.open(param1.id, null, {
                forceOpen: true
            });
        }
        return {
            shouldContinue: false
        };
    }

    Options = returnOptions ? returnOptions : Options ? Options : ({
        IGNORE_RESTORE: false,
        EDIT_MODE: false,
        FROM_QRY: false,
        INSERT_MODE: true,
        QRY_2_EDIT: false
    });

    return {
        shouldContinue: true,
        param1,
        Options,
        returnOptions,
        refClasses: returnOptions && returnOptions.refClasses ? returnOptions.refClasses : []
    };
}

function applyOpenTypeState(currentType, refClasses, self, mFunScope) {
    self = MultiRefModule;
    mFunScope = self.M_FUN;

    self._refType = currentType;
    syncReferenceTypeButtonGroup(currentType, {}, self);
    applyRefFormModeChrome(currentType, self);

    mFunScope.SET_TITLES();
    const _dynKeyMap = currentType && self.M_CONFIG['Dynamic_Key_Value'] && self.M_CONFIG['Dynamic_Key_Value'][currentType];
    for (const [key, value] of Object.entries(_dynKeyMap || {})) {
        self.M_CONFIG['ELM_ID_MAPPING'][key] = value;
        self.M_CONFIG['ReverseMapping'][value] = key;
        delete self.M_CONFIG['ReverseMapping'][''];
    }

    self.M_FUN.ASSIGN_CONFIG_INFO(currentType);
    mFunScope.SHOW_HIDE_INPUTS(currentType, refClasses);
}

function cacheRefFormElements(self) {
    self = MultiRefModule;

    self.ELEMENTS.Cancel = self.Panel.querySelector('#cancel_edit_ref');
    self.ELEMENTS.UpdateBtn = self.Panel.querySelector('#insert_edit_ref');
    self.ELEMENTS.ReplyQryBtn = self.Panel.querySelector('#Reply_qry_edit_ref');
    self.ELEMENTS.EditAllBtn = self.Panel.querySelector('#edit_all_field');
    self.ELEMENTS.UpdateByErrBtn = self.Panel.querySelector('#Update_cmd_edit_ref');
    self.ELEMENTS.previewDiv = self.Panel.querySelector('#preview');
    self.ELEMENTS.queryDiv = self.Panel.querySelector('#query_div');
    self.ELEMENTS.BODY = self.Panel.querySelector('[data-id="dialog-body"]');
    self.ELEMENTS.queryPreview = self.Panel.querySelector('#edit_query');
    self.ELEMENTS.query_respond_div = self.Panel.querySelector('#query_close_div');
    self.ELEMENTS.query_cmd_header = self.Panel.querySelector('[data-id="lab_cmd_qry"]');
    self.ELEMENTS.query_reply = self.Panel.querySelector('#query_respond');
    self.ELEMENTS.hints_div = self.Panel.querySelector('#hints_div');
    self.ELEMENTS.hint = self.Panel.querySelector('#hint');
    self.ELEMENTS.AnnateGroup = self.Panel.querySelector('[id="annotationsOptionsGroup"]');
    self.ELEMENTS.AnnateForm = self.Panel.querySelector('[id="annotations-form-group"]');
    self.ELEMENTS.AnnateInput = self.Panel.querySelector('[id="annotations-input"]');
    self.ELEMENTS.formGroupDiv = self.Panel.querySelector('[id="div_open_form"][data-current-form]');
    self.ELEMENTS.dataGroupShow = self.Panel.querySelector('[data-group-show]');
    self.ELEMENTS.PlainTextBox = self.Panel.querySelector('#plain_value');
    self.ELEMENTS.PlainTextCite = self.Panel.querySelector('#plain_text_cite');
    self.ELEMENTS.DoiTxtVal = self.Panel.querySelector('#doi_value');
    self.ELEMENTS.DoiValidateBtn = self.Panel.querySelector('#validate_doi_btn');
    self.ELEMENTS.InsertBtn = self.Panel.querySelector('#insert_ref');
    self.ELEMENTS.InsertRefOnlyBtn = self.Panel.querySelector('#insert_ref_wo_cite');
}

function bindPrimaryDialogEvents(self, mFunScope) {
    self = MultiRefModule;
    mFunScope = self.M_FUN;

    if (self.ELEMENTS.Cancel) self.ELEMENTS.Cancel.onclick = closeDialogAndFinalize;
    self.ELEMENTS.DoiValidateBtn.onclick = mFunScope.FETCH_DOI_DATA;
    self.ELEMENTS.InsertBtn.onclick = handleReferenceOperation;
    self.ELEMENTS.InsertRefOnlyBtn.onclick = function(e) {
        return handleReferenceOperation(e, {
            ref_only: true
        });
    };
}

function getDebouncedRefInputHandler(self, mFunScope) {
    self = MultiRefModule;
    mFunScope = self.M_FUN;

    if (!self._debouncedRefInputHandler) {
        self._debouncedRefInputHandler = Debounce_Event((e) => DIALOG_2_HTML(e, {}));
    }

    return self._debouncedRefInputHandler;
}

function bindInputEditEvents(self, mFunScope) {
    self = MultiRefModule;
    mFunScope = self.M_FUN;

    self.Panel.querySelectorAll("[name='INS_REF_RADIO']").forEach(input => {
        input.parentElement.onclick = mFunScope.Radio_Opt;
    });

    self.ELEMENTS.PlainTextCite.oninput = EDIT_NEW_LABEL;
    self.ELEMENTS.PlainTextBox.oninput =
        self.ELEMENTS.PlainTextBox.onchange =
        self.ELEMENTS.PlainTextBox.onpaste = Debounce_Event((e) => {
            $(self.Panel).find(".iSpin_border").removeClass("hide");
            mFunScope.PLAIN_TEXT_PASTE(e, {})
        });

    if (!self['G_CONFIG']['IS_NAME_DATE']) {
        self.ELEMENTS.PlainTextCite.classList.add("d-none");
        self.ELEMENTS.PlainTextCite.previousElementSibling.classList.add("d-none");
    }

    self.ELEMENTS.DoiTxtVal.oninput = mFunScope.Validate_DOI_Val;

    const refInputHandler = getDebouncedRefInputHandler(self, mFunScope);
    self.Panel.querySelectorAll('input.inputDiv').forEach((inputFiled, idx, arr) => {
        inputFiled.oninput = refInputHandler;
    });

    self.Panel.querySelectorAll("input[name='ref_type']").forEach(input => {
        input.parentElement.onclick = function(e) {
            try {
                var value = this.firstElementChild.value || this.getAttribute("value");

                if (self.ELEMENTS.formGroupDiv) self.ELEMENTS.formGroupDiv.setAttribute('data-current-form', value);

                handleReferenceTypeChange(value, self.ELEMENTS.dataGroupShow.getAttribute("data-group-show"), e);
                console.log('Reference type changed to:', value);


            } catch (err) {
                ref_logError('Event-onchange', err);
            }
        };
    });
}




(function(template, templateList, toasterMessages, mCONFIG) {

    // console.log("---------------------------");
    MultiRefModule.name = 'MultiRefModule';
    MultiRefModule.canUnmountComponentWhileClose = true;
    MultiRefModule.templateList = templateList || {};
    MultiRefModule.template = template;
    // ? 14_APR_2023 - YA - ALERT/TOASTER MESSAGE
    MultiRefModule.TOASTER_MESSAGE = toasterMessages || {};
    MultiRefModule.M_CONFIG = {};
    MultiRefModule.M_FUN = {};
    MultiRefModule.ELEMENTS = {};
    Object.assign(MultiRefModule.M_CONFIG, mCONFIG);
    MultiRefModule.AssignVar_EventLoop = function(Options = {}, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        try {
            cacheRefFormElements(self);
            bindPrimaryDialogEvents(self, mFunScope);
            bindInputEditEvents(self, mFunScope);

            /*
             * 3357606: LWW - Reference Bullet Style
             * chcking the values from config and show respeative group
             *
             */


            //  if (IS_LOCAL_HOST) debugger;
            if (iREF_SCOPE.Reference && iREF_SCOPE.Reference['data-interest-level'] || self.M_CONFIG['data-interest-level']) {

                self.M_CONFIG.INTEREST_LEVEL = true;

                // Initialize the event handling using your existing code
                const {
                    AnnateGroup,
                    AnnateForm,
                    AnnateInput
                } = self.ELEMENTS;

                if (AnnateGroup) AnnateGroup.classList.remove("ds-none");

                $('input[name="annotationOptions"]').change(function() {
                    const isNoneChecked = $('#annotationOptionNone').is(':checked');

                    if (AnnateForm) $(AnnateForm).toggleClass("ds-none", isNoneChecked);
                    let annotationType = getAnnotationType();
                    if (!isNoneChecked) {
                        self.Panel.querySelector("form").scrollIntoView({
                            behavior: 'smooth',
                            block: 'end'
                        });

                        // Focus the annotations field and set up event handlers
                        annotation_handle_key_event("show");
                        /* setTimeout(() => {
                            let $annotations = $('#annotations-input');
                            $annotations.focus();

                            // Attach event handlers with debounce
                            $annotations.off('input change paste').on('input change paste',
                                Debounce_Event((e) => {
                                    // Check if value is not empty
                                    if (e.target.value.trim() !== "") {
                                        handleAnnotationPreview(annotationType, e.target.value);
                                    }
                                })
                            );
                        }, 500); */


                    } else if (self.M_SCOPE.EDIT_MODE) {}
                    // Initial call to the handler function
                    if (annotationType) {
                        handleAnnotationPreview(annotationType, AnnateInput.value);
                    }
                });
            }

        } catch (err) {
            ref_logError('AssignVar_EventLoop', err);
        }
    };
    MultiRefModule.initLoop = async function(params1, params2, Options = {}, self) {
        self = MultiRefModule;
        try {
            let {
                citation,
                indircite
            } = iREF_SCOPE.Reference;

            self.M_SCOPE = Object.assign(self.M_SCOPE || {}, {
                DOI_PREFIX: 'https://doi.org/',
                URL_PREFIX: 'http://',
                TYPE: 'journal',
                OPEN_FROM: {
                    CONTEXT_MENU: false,
                    CLICK_REF_ID: null
                },
                Restrict_Class_Arr: ["uri", "disp-formula", "inline-formula", "email", "ext-link"],
                NEW_EDIT_CITE: {},
                NEW_CITE: {},
                CURRENT_MODEL: 'doi_form',
                CURRENT_DATA: {},
                openwrap: (citation && citation.openwrap) || (indircite && indircite.openwrap) || "",
                closewrap: (citation && citation.closewrap) || (indircite && indircite.closewrap) || ""
            });


            // Build allowed types based on condition
            const allowedTypes = resolveMultiRefAllowedTypes(IS_JOURNAL, SHARED_KEY);

            // Now assign config with correct ALLOWED_TYPE
            self.M_CONFIG = Object.assign(self.M_CONFIG || {}, {
                ALL_TYPE: ["journal", "book", "webpage"],
                ALLOWED_TYPE: allowedTypes,
                ReverseMapping: {},
                refStyling: {},
                refStyling_dom: {}
            });



            for (let x in self.M_CONFIG['ELM_ID_MAPPING']) {
                // ? _.ConfigReverseMapping[_.ConfigMapping[x]] = x;
                self.M_CONFIG['ReverseMapping'][self.M_CONFIG['ELM_ID_MAPPING'][x]] = x;
            }
            if (iREF_SCOPE['DOC']) {
                iREF_SCOPE['DOC'].querySelectorAll(`style[name]`).forEach(elm => {
                    let temp = elm.getAttribute("name");
                    let name = self.M_CONFIG['ReverseMapping'][temp];
                    self.M_CONFIG["refStyling_dom"][name] = elm;

                    debug.log(JSON.stringify(elm));

                    self.M_CONFIG["refStyling"][name] = self['G_FUN'].GET_CONFIG_ITEM(elm, {
                        CONVERT_JSON: true,
                        children: true,
                        attr: true,
                        hex2string: false,
                        keyUpperCase: false,
                        hierarchy: true
                    });
                });
            }


            // self.DevModule();
            self.debugModule = false;
            const {
                default: RefBridge
            } = await import('../ref_bridge/index.js');
        } catch (err) {
            ref_logError('MultiRefModule_initLoop', err);
        }
    };
    MultiRefModule.enableBookTypes = function(self) {
        self = MultiRefModule;
        try {
            const group = self.Panel.querySelector("[id='ref_type_btngroup']");
            const $group = $(group);

            // avoid duplicate insert
            if (group.querySelector("[value='book']")) return;

            const html = `<label class="btn btn-sm primary-btn" value="book"><input type="radio" name="ref_type" value="book"> Book</label>
                <label class="btn btn-sm primary-btn" value="ed-book"><input type="radio" name="ref_type" value="ed-book"> Book Chapter</label>`.trim();


            // insert before journal
            $group.find("[value='journal']").first().after(html);

            // modify "other" text safely
            const $other = $group.find("label[value='other']");
            let text = $other.contents().filter(function() {
                // text node
                return this.nodeType === 3;
            })[0];

            if (text) {
                text.nodeValue = text.nodeValue.replace("Book/", "");
                // keep leading space – do NOT trim()
            }
            self.AssignVar_EventLoop();

        } catch (err) {
            ref_logError('MultiRefModule_initLoop', err);
        }
    };

    MultiRefModule.DevModule = function(self) {
        self = MultiRefModule;
        try {
            if (!IS_LOCAL_HOST) return;
            if (self.M_SCOPE.CURRENT_MODEL == 'doi_form') {
                let collection = ['10.1016/S1474-4422(21)00368-9', '10.5664/jcsm.5186', '10.1021/acs.jafc.3c01332', '10.1023/a:1012772311177', '10.1038/nrendo.2015.128', '10.3390/ijms24010768', '10.1093/ps/83.1.69', '10.1016/j.nut.2021.111198', '10.1038/s41598-018-28948-z', '10.1152/physrev.00026.2001', '10.1038/s41598-019-48749-2', '10.1038/s41401-024-01250-7'];
                let random = Math.floor(Math.random() * collection.length);
                self.ELEMENTS.DoiTxtVal.value = collection[random];
            }
            setTimeout(function() {
                let _id = "CIT0001",
                    elm;
                if (typeof ImpactView != "undefined") ImpactView.setView('edit');
                if (typeof GlobalEditor != "undefined" && GlobalEditor && typeof GlobalEditor.document != "undefined") elm = GlobalEditor.document.getById(_id);
                if (!elm) return;
                if (elm && typeof elm.scrollIntoView != "undefined") {
                    elm.scrollIntoView(true);
                }
                // MultiRefModule.show(_id, {
                //     EDIT_MODE: false,
                //     INSERT_MODE: true
                // });
                /*
                let query = elm.findOne("[data-class='ckcommentsfull']");
                if (query) {
                    query.$.click();
                }
                */
            }, 5000);
        } catch (err) {
            ref_logError('MultiRefModule.DevMode', err);
        }
    };
    MultiRefModule.showBefore = function(param1, Options, param3, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        try {
            if (!self.trackManager) self.trackManager = window._trackManager || new trackManager(GlobalEditor);

            self.M_SCOPE.CURRENT_MODEL = "doi_form";
            if (iREF_SCOPE.Reference.notallowed && iREF_SCOPE.Reference.notallowed == "yes") {
                if (iREF_SCOPE.Reference.wip) {
                    TOASTER_ALERT("module_wip", {
                        type: "warning"
                    });
                }
                if (Options.FROM_QRY) {
                    setTimeout(() => {
                        if (typeof queryDialog != "undefined") {
                            window.queryDialog.open(param1.id, null, {
                                forceOpen: true
                            });
                        }
                    }, 1500);
                }
                return false;
            }
            return true;
        } catch (err) {
            ref_logError('MultiRefModule.showBefore', err);
            return true;
        }
    };
    MultiRefModule.showLoop = function(param1, Options = {}, param3, self, mFunScope) {

        if (typeof paraManager == "undefined") {
            Initialize_Para_Id();
        }

        /**
         * @ref current/show reference passing
         * @self assign the the current parent object
         */
        self = MultiRefModule;
        mFunScope = self.M_FUN;


        let openContext = resolveOpenContext(param1, Options, self, mFunScope);
        if (!openContext.shouldContinue) {
            return;
        }
        param1 = openContext.param1;
        Options = openContext.Options;
        let returnOptions = openContext.returnOptions;
        let refClasses = openContext.refClasses;

        const {
            'data-interest-level': dataInterestLevelAlias
        } = iREF_SCOPE.Reference || {};


        function updateCurrentMode() {
            try {

                var formEl = self.Panel.querySelector("[data-current-form]");
                var defaultType = formEl ?
                    formEl.getAttribute("data-current-form") :
                    "journal";

                // Detect client
                var client = commonMethods.getClientCode({
                    format: "upper"
                });

                var isPLOS = client === "PLOS";
                // non-journal mode → check refstyle key to determine if books are allowed
                var isBooksClient = !IS_JOURNAL;

                debug.log('Opened dialog ref type:' + defaultType);

                var isEditQueryMode = Options.EDIT_MODE && Options.FROM_QRY;

                // Normalize REF_ID
                var id = typeof param1 === "string" ?
                    param1 :
                    (param1 && param1.$ && param1.$.id) || (param1 && param1.id);

                self.M_SCOPE.REF_ID = id;

                // Normalize element
                var elem = typeof param1 === "string" ?
                    GlobalEditor.document.getById(param1) :
                    param1;

                if (!elem) {
                    debug.log("Reference element not found:", id);
                    return defaultType;
                }

                // Clone updater
                function updateClones(ref) {
                    var node = ref.$ ? ref.$ : ref;
                    if (!node) return;

                    self.M_SCOPE.CLONE_REF = node.cloneNode(true);
                    self.M_SCOPE.CUR_REF = node.cloneNode(true);
                }

                updateClones(elem);

                if (!self.M_SCOPE.CUR_REF) {
                    return defaultType;
                }

                var pubNode = self.M_SCOPE.CUR_REF.querySelector("[publication-type]");
                var currType = pubNode ?
                    pubNode.getAttribute("publication-type") :
                    defaultType;

                var isTypeMismatch = currType !== defaultType;

                if (isBooksClient && Options.INSERT_MODE) {
                    $('#insert_ref_wo_cite').removeClass('ds-none');
                    $('#insert_ref').text('Insert with Citation');
                }

                if (!isEditQueryMode) {

                    if (isTypeMismatch && ((!IS_LIVE_DOMAIN && isPLOS))) {

                    } else if (isBooksClient && !!SHARED_KEY.refstyle && /cms\s*18/i.test(SHARED_KEY.refstyle)) {
                        debug.log('OSO client - allowing type mismatch for insert mode');
                    } else {
                        return defaultType;
                    }
                } else {
                    // In edit query mode, if the current ref type is not allowed, fallback to defaultType
                }

                var refEl = self.M_SCOPE.CUR_REF;
                var hasBookFields = refEl.querySelector(".publisher-loc, .publisher-name");

                var editorRef = GlobalEditor.document.getById(id);
                var editorNode = editorRef && editorRef.$;

                if (hasBookFields && editorNode) {

                    var isEdBook = !!refEl.querySelector(".chapter-title");
                    currType = isEdBook ? "ed-book" : "book";

                    if (currType === defaultType) {

                        var pubTypeNode = editorNode.querySelector("[publication-type]");
                        if (pubTypeNode) {
                            pubTypeNode.setAttribute("publication-type", currType);
                        }

                        updateClones(editorRef);

                    } else {

                        var articleTitle = editorNode.querySelector(".article-title");

                        if (articleTitle && !editorNode.querySelector(".source")) {
                            articleTitle.setAttribute("class", "source");
                            articleTitle.setAttribute("data-name", "source");

                            updateClones(editorRef);
                        }
                    }

                    var formDiv = self.ELEMENTS.formGroupDiv;
                    if (formDiv) {
                        var currentForm = formDiv.getAttribute('data-current-form');

                        if (currentForm !== currType) {
                            formDiv.setAttribute('data-current-form', currType);
                        }
                    }
                }

                // OSO formatting rules
                if (isBooksClient) {

                    var items = self.M_CONFIG.FORMATTING_ITEMS || [];
                    var sourceIndex = items.indexOf(".source");
                    var isBookType = /^(book|ed-book)$/.test(currType);

                    if (isBookType) {
                        // Add   if not already present
                        if (sourceIndex === -1) {
                            items.push(".source");
                        }
                    } else {
                        // Remove if present
                        if (sourceIndex !== -1) {
                            items.splice(sourceIndex, 1);
                        }
                    }
                }

                return (isBooksClient || (isTypeMismatch && (!IS_LIVE_DOMAIN && isPLOS))) ?
                    currType :
                    defaultType;

            } catch (err) {
                ref_logError('MultiRefModule_updateCurrentMode', err);
                return 'journal';
            }
        }


        try {
            self.M_SCOPE.OPEN_FROM = {
                CONTEXT_MENU: param1 ? true : false,
                CLICK_REF_ID: param1
            };
            self._INSERT_MODE = self.M_SCOPE.INSERT_MODE = Options.INSERT_MODE ? true : false;

            self._EDIT_MODE = self.M_SCOPE.EDIT_MODE = Options.EDIT_MODE ? true : false;
            self._FROM_QRY = self.M_SCOPE.FROM_QRY = Options.FROM_QRY ? true : false;
            self._QRY_2_EDIT = self.M_SCOPE.QRY_2_EDIT = Options.QRY_2_EDIT ? true : false;
            self._UPDATE_CROSS_CITE = self.M_SCOPE.UPDATE_CROSS_CITE = false;

            if (!Options.IGNORE_RESTORE) mFunScope.restoreDefault(Options);


            /* beautify preserve:start */
            let { BODY, ReplyQryBtn, UpdateByErrBtn, query_respond_div, hints_div, UpdateBtn } = self.ELEMENTS;
            let { EDIT_MODE, INSERT_MODE, FROM_QRY, FORCE_OPEN } = self.M_SCOPE;
            let { NewElm, ErrorHandling, ALL_ELM, ELM_ID_MAPPING } = self.M_CONFIG;
            /* beautify preserve:end */

            let current_type = (returnOptions && returnOptions.current_type) || updateCurrentMode();
            applyOpenTypeState(current_type, refClasses, self, mFunScope);
            applyRefFormModeChrome(current_type, self);


            if (FROM_QRY || EDIT_MODE) {
                $(self.Panel).find("[id='insert_ref']").addClass("disabled ds-none");
                $(self.Panel).find("[id='insert_edit_ref']").removeClass("disabled ds-none");
                [self.ELEMENTS.ReplyQryBtn, self.ELEMENTS.UpdateBtn, self.ELEMENTS.UpdateByErrBtn, self.ELEMENTS.EditAllBtn].forEach((opt, idx, arr) => {
                    opt.onclick = handleReferenceOperation;
                });

                //string-name
                var _curRef = self.M_SCOPE.CUR_REF;
                if (!self.M_CONFIG.ALLOWED_TYPE.includes(current_type) || (_curRef && !_curRef.querySelector('.person-group') && _curRef.querySelector('.string-name'))) {
                    if (FROM_QRY) {
                        self.closeDialog();
                        if (Options.status && Options.query) {
                            if (typeof window.queryDialog != "undefined") {
                                window.queryDialog.open(param1.id, 'comment', {
                                    forceOpen: true
                                });
                            }
                        }
                    }
                    return debug.warn("person-group missing");
                } else {
                    // self.Panel.querySelector("#preview").innerHTML = mFunScope.Get_Empty_Skeleton() || "";
                    if (EDIT_MODE || FROM_QRY) {
                        //  if (IS_LOCAL_HOST) debugger;
                        handleReferenceTypeChange(current_type, "open_form", {
                            force: !0
                        });
                        //self.Panel.querySelector(`[value="open_form"]`).parentElement.click();
                        //$(self.Panel).find("[name='INS_REF_RADIO']").parent().addClass("disabled");

                        self.M_FUN.REF_2_FORM(current_type);
                        self.M_FUN.MANDATORY_ELM_VALIDATION();
                        if (FROM_QRY) $(ReplyQryBtn).removeClass("disabled ds-none");
                    }
                }


            } else if (INSERT_MODE) {
                $(self.Panel).find("[id='insert_edit_ref']").addClass("disabled ds-none");
                $(self.Panel).find("[id='insert_ref']").removeClass("disabled ds-none");
                if (IS_JOURNAL) {


                } else {
                    // ! BOOKS FORCE DISABLE ALL OTHER FEATURES
                    var elmNode;
                    if (!!SHARED_KEY.refstyle && IS_LOCAL_HOST) {
                        this.enableBookTypes();
                        elmNode = makeSelector("book", 1, "ref_type");
                    } else {
                        elmNode = makeSelector("other", 1, "ref_type");
                        //$(".btn-group.btn-group-toggle").closest(".form-group").addClass("ds-none");
                    }
                    if (elmNode && typeof elmNode.click == "function") {
                        elmNode.click();
                    }
                }
                autoFocus(self.M_SCOPE.CURRENT_MODEL);
                // ? handle new item to insert
                // mFunScope.NEW_AUTHOR_GROUP(self.M_SCOPE.CURRENT_MODEL);
                // ? PROCEED FURTHER - DOM
                // self.M_SCOPE.CURRENT_MODEL = INSERT_MODE ? "doi_form" : "plain_form";
            }


            // ? fetch and stoke global key information from configuration
            var _typeCheckRef = self.M_SCOPE.CUR_REF;
            if (["other"].includes(current_type)) {
                if (_typeCheckRef && _typeCheckRef.querySelector(".ext-link")) current_type = "webpage";
            } else if (/book/gi.test(current_type) && _typeCheckRef && _typeCheckRef.querySelectorAll('.chapter-title').length > 0) {
                current_type = "ed-book";
            }


            let trimAuthObj = self.M_CONFIG.STYLE_PATTERN.querySelector(`trim_Ellipse[name="author"]`) || self.M_CONFIG.STYLE_PATTERN.querySelector(`trim[name="author"]`);
            let trimAuthAttrs = trimAuthObj ? commonMethods.GET_ATTR(trimAuthObj) : {};

            self.M_CONFIG["author_trim"] = trimAuthAttrs ? {
                count: trimAuthAttrs.count || "",
                after: trimAuthAttrs.after || "",
                name: trimAuthAttrs.name || "author",
                insert: trimAuthAttrs.insert || "et al",
                style: trimAuthAttrs.style || trimAuthAttrs.RefEtalStyle || "‡ref_etal",
                missing: trimAuthAttrs.missing || trimAuthAttrs.EtalQuery || "",
                last: trimAuthAttrs.last || ""
            } : {};

            self.M_FUN.DISABLE_ITEMS_FIRE();


            const {
                after,
                count,
                name,
                insert,
                style
            } = this.M_CONFIG["author_trim"] || {};

            this.au_config = {};
            // OUP_J_IDRN_136 29_MAR_2025_YA CHANGE 99
            this.au_config._count = parseInt(count) || 99;
            this.au_config._after = parseInt(after) || 99;
            this.au_config._name = name || "author";
            this.au_config._insert = insert || "et al";
            this.au_config._style = style || "‡ref_etal";

            debug.log("--NEW-REF-OPENED---");

            if (self.M_CONFIG.INTEREST_LEVEL || dataInterestLevelAlias) handle_showLoop_Edit("show");

        } catch (err) {
            ref_logError('MultiRefModule_showLoop', err);
            if (self.M_SCOPE.FROM_QRY) {
                self.closeDialog();
                if (param1) {
                    if (typeof window.queryDialog != "undefined") {
                        var id = typeof string == typeof param1 ? param1 : Options.id;
                        window.queryDialog.open(id, 'comment', {
                            forceOpen: true
                        });
                    }
                }
            }
        }
    };
    MultiRefModule.M_FUN.transformGivenName = function(givenName, delimiter = '') {
        let processed = "";
        const isDelimiterEmpty = delimiter === "";
        try {
            // Handle initials with dots (e.g., "J.P.S.")
            if (/^[A-Z](\.[A-Z])+\.?$/.test(givenName)) {
                processed = givenName.replace(/\./g, delimiter);
            }
            // Handle hyphenated names (e.g., "Mary-Jane")
            else if (givenName.includes("-")) {
                processed = givenName
                    .split("-")
                    .map(part => part.charAt(0).toUpperCase() + delimiter)
                    .join("-");
            }
            // Handle names with dots (e.g., "A. B. C.")
            else if (givenName.includes(".")) {
                processed = givenName
                    .split(" ")
                    .map(part => part.charAt(0).toUpperCase() + delimiter)
                    .join("");
            }
            // Handle regular names (e.g., "John Doe")
            else {
                const parts = givenName.split(" ");
                if (parts.length === 1) {
                    processed = parts[0].charAt(0).toUpperCase() + delimiter;
                } else {
                    processed = parts
                        .map(part => part.charAt(0).toUpperCase() + delimiter)
                        .join("");
                }
            }

            // Trim end space if delimiter is ". "
            if (delimiter === ". ") {
                processed = processed.trimEnd();
            }
            // Remove any remaining spaces or dots if delimiter is empty
            if (isDelimiterEmpty) {
                processed = processed.replace(/[\.\s]/g, "");
            }
            return processed;
        } catch (err) {
            ref_logError('transformGivenName', err);
        }
    };
    MultiRefModule.M_FUN.applyPlainTextCrossRefParsed = function(parsed, self) {
        self = MultiRefModule;
        var finalText = 'NOLABEL XXXX';
        try {
            $(self.Panel).find('.iSpin_border').addClass('hide');
            var CiteText = null;
            var bridge = resolveRefBridge(self);
            var fetch_Data = null;

            if (bridge && parsed) {
                fetch_Data = bridge.filterCrossRefData(parsed);
            }

            if (fetch_Data && Object.keys(fetch_Data).length) {
                if (!fetch_Data.__author) {
                    fetch_Data = self.M_FUN.AU_STYLE_CONFIG(fetch_Data);
                }
                CiteText = DIALOG_2_HTML(fetch_Data, {
                    get_citation: true
                });
            } else {
                CiteText = false;
            }

            if (CiteText && CiteText.FINAL_OUT && CiteText.FINAL_OUT[0]) {
                self.M_SCOPE.NEW_CITE = CiteText;
                finalText = CiteText.FINAL_OUT[0].indirect.text;
            }
            if (!CiteText) self.ELEMENTS.PlainTextCite.focus();
        } catch (err) {
            ref_logError('applyPlainTextCrossRefParsed', err);
        } finally {
            self.ELEMENTS.PlainTextCite.value = finalText;
        }
    };

    MultiRefModule.M_FUN.handleDoiFetchError = function(self) {
        self = MultiRefModule;
        $(self.Panel).find('.iSpin_border').addClass('hide');
        if (typeof TOASTER_ALERT === 'function') {
            TOASTER_ALERT('doi_fetch_error', {
                type: 'info'
            });
        }
        $(self.Panel).find("[name='INS_REF_RADIO']").parent().removeClass('disabled');
    };

    MultiRefModule.M_FUN.PLAIN_TEXT_RES = function(response, Opt, self) {
        self = MultiRefModule;
        var finalText = 'NOLABEL XXXX';
        try {
            $(self.Panel).find('.iSpin_border').addClass('hide');
            var CiteText = null;
            if (response.r == 1 && (response.statusCode == 200 || response.restext)) {
                var data = null;
                var fetch_Data = null;
                var bridge = resolveRefBridge(self);

                try {
                    data = JSON.parse(response.restext);
                } catch (e) {
                    console.error('Invalid JSON in response.restext:', e);
                }

                if (data && bridge) {
                    fetch_Data = bridge.filterCrossRefData(data);

                    if (!fetch_Data.__author) {
                        fetch_Data = self.M_FUN.AU_STYLE_CONFIG(fetch_Data);
                    }

                    CiteText = DIALOG_2_HTML(fetch_Data, {
                        get_citation: true
                    });
                } else {
                    CiteText = false;
                }

            } else {
                CiteText = false;
            }

            debug.log(JSON.stringify(response));

            if (CiteText && CiteText.FINAL_OUT && CiteText.FINAL_OUT[0]) {
                self.M_SCOPE.NEW_CITE = CiteText;
                finalText = CiteText.FINAL_OUT[0].indirect.text;
            }
            if (!CiteText) self.ELEMENTS.PlainTextCite.focus();
        } catch (err) {
            ref_logError('PLAIN_TEXT_RES', err);
        } finally {
            var bridge = resolveRefBridge(self);
            if (bridge && typeof bridge.recordCrossRefResponse === 'function') {
                bridge.recordCrossRefResponse(response, {});
            }
            self.ELEMENTS.PlainTextCite.value = finalText;
        }
    };
    MultiRefModule.M_FUN.AU_STYLE_CONFIG = function(bibtext, self) {
        self = MultiRefModule;
        try {
            var author_list = (bibtext['author'] ? bibtext['author'] : []);
            var followedInitial = {
                punctuation: "",
                style: "‡ref_auGivenName"
            };
            var InitialAbbr = false;
            var get_temp_1 = self.M_CONFIG.refStyling['journal'];

            if (get_temp_1 && get_temp_1.initials) {
                followedInitial = get_temp_1.initials;
                if (followedInitial.style) InitialAbbr = /‡ref_auGivenName/gi.test(followedInitial.style) ? true : false;
            }
            // ? 25_OCT_22 - YA - LIVE ERROR
            var author_collection = author_list.map((item) => {
                let fname = item['given'] || item['fname'];
                if (InitialAbbr && fname) {
                    // fname = fname.split(" ").map((name) => name[0]).join(followedInitial.punctuation);
                    fname = self.M_FUN.transformGivenName(fname, followedInitial.punctuation);
                }
                return {
                    "ref_auSurname": item['family'] || item['surname'],
                    "ref_auGivenName": fname || ""
                };
            });
            // ?  26_OCT_22 - YA - ARRANGE AS PER STYLE PATTERN
            bibtext['__author'] = author_list;
            bibtext['author'] = author_collection;
            return bibtext;
        } catch (err) {
            ref_logError('REF_STYLE_CONFIG', err);
        }
    };
    MultiRefModule.M_FUN.GET_DELIM = function(first, next, key, Options = {}, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        /* beautify preserve:start */
        let { TYPE } = self.M_SCOPE;
        let { refStyling_dom, DELIM } = self.M_CONFIG;
        let { tag_key, get_attr } = Options;
        /* beautify preserve:end */
        if (key == "page") {
            first = "‡ref_pageFirst";
            next = "‡ref_pageLast";
        }
        try {
            var tag = tag_key ? tag_key : "element",
                attr = get_attr ? get_attr : "delim";
            var elm = DELIM.querySelector(`${tag}[first="${first}"][next="${next}"]`);

            return elm.hasAttribute(attr) ? elm.getAttribute(attr) : "";
        } catch (err) {
            ref_logError('MultiRefModule.M_FUN.GET_DELIM', err);
        }
    };
    MultiRefModule.M_FUN.DIALOG_2_JSON = function(event, dialogPanel, Options = {}, self, mFunScope) {
        // https://claude.site/artifacts/8b4c7375-3e8b-42a6-9ab1-589f72438544

        self = MultiRefModule;
        mFunScope = self.M_FUN;
        dialogPanel = dialogPanel ? dialogPanel : self.Panel;
        /* beautify preserve:start */
        let { CURRENT_DATA, CURRENT_MODEL } = self.M_SCOPE;
        /* beautify preserve:end */
        try {
            var key = event.target.id,
                value = event.target.value;
            if (key.startsWith('surname_') || key.startsWith('givenname_')) {
                const idx = parseInt(key.split('_')[1]);
                const type = key.startsWith('surname_') ? 'family' : 'given';
                if (!self.M_SCOPE.CURRENT_DATA.author) self.M_SCOPE.CURRENT_DATA.author = [];
                if (!self.M_SCOPE.CURRENT_DATA.author[idx]) self.M_SCOPE.CURRENT_DATA.author[idx] = {};
                self.M_SCOPE.CURRENT_DATA.author[idx][type] = value;
            } else if (key === 'fpage' || key === 'lpage') {
                const fpage = dialogPanel.querySelector('#fpage').value;
                const lpage = dialogPanel.querySelector('#lpage').value;
                const delim = mFunScope.GET_DELIM(null, null, "page");
                self.M_SCOPE.CURRENT_DATA.page = lpage ? `${fpage}${delim}${lpage}` : fpage;
            } else {
                let IsExists = CURRENT_DATA[key],
                    mapKey = commonMethods.getKeyByValue(self.M_CONFIG.API_MAPPING, key);
                if (mapKey) key = mapKey;
                if (IsExists || mapKey) self.M_SCOPE.CURRENT_DATA[key] = value;
                else {
                    console.log(self.M_CONFIG.API_MAPPING[key]);
                }
            }
            console.log([key, value]);
        } catch (err) {
            ref_logError('DIALOG_2_JSON', err);
        }
    };
    MultiRefModule.M_FUN.IS_DUPLICATE_ENTRY = function(Options = {}, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        try {
            let box_val = $(self.ELEMENTS.PlainTextBox).text(),
                input_value = self.ELEMENTS.DoiTxtVal.value,
                IsExists = false,
                IS_DUPLICATE = false;
            if (GlobalEditor)
                GlobalEditor.document.find(".ref").toArray().forEach((ref) => {
                    if ((box_val && ref.getText().indexOf(box_val) > -1) || (input_value && ref.getText().indexOf(input_value) > -1)) {
                        IsExists = true;
                    }
                });
            if (IsExists) {
                return AlertNewDialog.fire('warning', "Warning", 'REF_IS_EXITS', 'OK', 'Cancel', true, {
                    override: true
                }).then((result) => {
                    if (result.isConfirmed) {
                        IS_DUPLICATE = false;
                    } else if (result.isDenied) {
                        IS_DUPLICATE = true;
                    }
                    return IS_DUPLICATE;
                });
            } else return false;
        } catch (err) {
            ref_logError('IS_DUPLICATE_ENTRY', err);
            return false;
        }
    };
    MultiRefModule.M_FUN.JSON_2_DIALOG = async function(fetchData, Options = {}, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        /* beautify preserve:start */
        const { refStyling_dom, DELIM, ReverseMapping } = self.M_CONFIG;
        const { CURRENT_DATA, CURRENT_MODEL } = self.M_SCOPE;
        const { journal } = refStyling_dom;
        const { count, after, insert, missing } = self.M_CONFIG["author_trim"];
        /* beautify preserve:end */
        try {
            $(self.Panel).find(".iSpin_border").addClass("hide");
            if (fetchData.status === 404) {
                TOASTER_ALERT('doi_fetch_error', {
                    type: 'info'
                });
                return;
            } else {
                //  $(self.Panel).find("[name='INS_REF_RADIO']").attr("disabled");
                handleReferenceTypeChange("journal", "doi_form", {
                    force: !0
                });
            }
            if (!fetchData.__author) {
                fetchData = mFunScope.AU_STYLE_CONFIG(fetchData);
            }
            self.M_SCOPE.CURRENT_DATA = fetchData;
            var doi_txt = self.ELEMENTS.DoiTxtVal.value.trim();
            var get_local = sessionStorage.getItem(`doi_${doi_txt}`);
            var stringData = JSON.stringify(fetchData);
            if (!get_local || get_local.localeCompare(stringData)) {
                sessionStorage.setItem(`doi_${doi_txt}`, stringData);
            }
            for (var [key, value] of Object.entries(fetchData)) {
                // if (/doi|journal/gi.test(key)) {}
                if (self.M_CONFIG.API_MAPPING[key]) key = self.M_CONFIG.API_MAPPING[key];
                const input = self.Panel.querySelector(`#${key}`);
                if (key === 'author') {
                    var isEtalIndex = shouldUseEtal(count, after, value);
                    var hasValidEtalIndex = Number.isInteger(isEtalIndex) && isEtalIndex > -1;
                    var finalItems = hasValidEtalIndex ? value.slice(0, isEtalIndex - 1) : value;

                    if (hasValidEtalIndex) {
                        handleEtalCheckbox(self, null);
                    }
                    finalItems.forEach((author, idx) => {
                        // Skip if current index is beyond the et al index

                        if (isEtalIndex && isEtalIndex < idx) return;

                        if (CURRENT_MODEL === "plain_text") {
                            self.M_SCOPE.CURRENT_MODEL = self.ELEMENTS.dataGroupShow.getAttribute("data-group-show");
                        }

                        // Add a new author group
                        mFunScope.NEW_AUTHOR_GROUP(self.M_SCOPE.CURRENT_MODEL, {
                            index: idx,
                            surname: author.ref_auSurname,
                            given: author.ref_auGivenName,
                            evt: false
                        });

                    });

                    self.M_FUN.ATTACH_LISTENERS();
                } else if (key === 'page') {
                    handlePageValue(value, self.Panel, {
                        json_2_dialog: true
                    });
                } else if (input) {
                    input.value = value;
                    if (key === 'title') {
                        applyFormatting(true, input, value, self);
                    }
                } else {
                    console.log([key, value]);
                }
            }

            if (self.ELEMENTS.formGroupDiv) self.ELEMENTS.formGroupDiv.classList.remove("opacity");
            // createOutputHtml();
            DIALOG_2_HTML({}, {});
        } catch (err) {
            ref_logError('JSON_2_DIALOG', err);
            return false;
        }
    };
    MultiRefModule.M_FUN.FETCH_DOI_DATA = async function(e, Options = {}, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        var doi_txt;
        try {
            if (self.M_SCOPE.CURRENT_MODEL == 'doi_form') {
                if (await dataExists(e, self.M_SCOPE.CURRENT_MODEL, null)) {
                    return;
                }

                if (await mFunScope.IS_DUPLICATE_ENTRY()) {
                    return;
                }
            }
            $(self.Panel).find(".iSpin_border").removeClass("hide");
            fetchTimeInfo = new Map();
            fetchTimeInfo.set('start', new Date().getTime());
            doi_txt = self.ELEMENTS.DoiTxtVal.value.trim();
            var get_local = sessionStorage.getItem(`doi_${doi_txt}`);
            if (get_local && !["undefined", "", "null", undefined, null].includes(get_local)) {
                let parseData = JSON.parse(get_local);
                mFunScope.JSON_2_DIALOG(parseData);
            } else {
                if (doi_txt && doi_txt != undefined) {
                    var bridge = resolveRefBridge(self);
                    if (bridge && typeof bridge.fetchDoi === 'function') {
                        bridge.fetchDoi(doi_txt, {
                            onSuccess: function(parsed) {
                                var fetchData = bridge.parseFlatDoiApiResponse(parsed) ||
                                    bridge.filterCrossRefData(parsed) || {};
                                mFunScope.JSON_2_DIALOG(fetchData);
                            },
                            onError: function() {
                                mFunScope.handleDoiFetchError(self);
                            }
                        });
                    }
                }
            }
            if (typeof self.M_FUN.CheckCursor_InsertValue != "undefined")
                self.M_FUN.CheckCursor_InsertValue(null, {
                    cursor_validation: true
                });
        } catch (err) {
            ref_logError('DOI_FETCH', err + "\n" + doi_txt);
            canDisableTypeChangeBtns(self.M_SCOPE.CURRENT_MODEL, {
                force: !1
            });
        }
    };
    MultiRefModule.M_FUN.Validate_DOI_Val = function(e, Options = {}, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        let {
            DOI_Pattern_1,
            DOI_Pattern_2
        } = self['G_SCOPE'];
        try {

            //https://stackoverflow.com/questions/27910/finding-a-doi-in-a-document-or-page/1876427#1876427
            //https://regex101.com/r/OswtCy/1
            //https://www.crossref.org/blog/dois-and-matching-regular-expressions/


            var [doi, IsValid, IsEmpty] = [e.target.value.trim(), false, false];
            IsEmpty = (doi == '');
            if (doi != '') IsValid = new RegExp(DOI_Pattern_1).test(doi);
            if (!IsValid) IsValid = new RegExp(DOI_Pattern_2).test(doi);

            $(self.ELEMENTS.DoiValidateBtn)[IsEmpty ? 'addClass' : IsValid ? 'removeClass' : 'addClass']('disabled')[IsEmpty ? 'attr' : IsValid ? 'removeAttr' : 'attr']('disabled', '');
            $(self.ELEMENTS.DoiTxtVal)[IsEmpty ? 'removeClass' : IsValid ? 'addClass' : 'removeClass']('is-valid')[IsEmpty ? 'removeClass' : IsValid ? 'removeClass' : 'addClass']('is-invalid');
        } catch (err) {
            ref_logError('Validate_DOI_Val', err);
        }
    };
    MultiRefModule.M_FUN.PLAIN_TEXT_PASTE = function(e, Options = {}, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        // if (IS_LOCAL_HOST) debugger;
        try {
            let value = e.target.value.trim(),
                IsNamed = self['G_CONFIG']['IS_NAME_DATE'],
                IsEmpty = value == "";
            $(self.ELEMENTS.previewDiv).html("").append(value);

            if ((IsNamed && IsEmpty) || !IsNamed) {
                if (IsEmpty) self.ELEMENTS.PlainTextCite.value = "";
                $(self.Panel).find(".iSpin_border").addClass("hide");
                return;
            }
            (async function(e, Options) {
                try {
                    var target = e ? e.target : Options;
                    var textValue = target.value;
                    var bridge = resolveRefBridge(self);

                    if (bridge && typeof bridge.fetchPlainTextBibliography === 'function') {
                        bridge.fetchPlainTextBibliography(textValue, {
                            onSuccess: function(parsed) {
                                mFunScope.applyPlainTextCrossRefParsed(parsed, self);
                            },
                            onError: function() {
                                $(self.Panel).find('.iSpin_border').addClass('hide');
                                self.ELEMENTS.PlainTextCite.focus();
                            }
                        });
                        return;
                    }

                    var json = GET_JSON('cross_ref_url', {
                        content: textValue
                    });
                    var finalEndPoint = API_ANYSTYLE_CROSS_REF_API;

                    debug.log(JSON.stringify(json));

                    commonfn.callajax(json, 'PLAIN_TEXT_RES', finalEndPoint, self);

                } catch (err) {
                    ref_logError('fire_loop', err);
                }
            })(e, Options);

        } catch (err) {
            ref_logError('PLAIN_TEXT_PASTE', err);
        }
    };

    MultiRefModule.M_FUN.HandlingCiteInput = function(options = {}, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        try {

            if (options.swtichingTab) {
                if (self.isOSO) {

                    self.ELEMENTS.PlainTextCite.value = "";
                    // $("cite_input_group").addClass("ds-none");


                }
            }


        } catch (err) {
            ref_logError('HandlingCiteInput', err);
        }
    };
    MultiRefModule.M_FUN.Radio_Opt = function(e, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        /* beautify preserve:start */
        let { EDIT_MODE, INSERT_MODE, FROM_QRY, FORCE_OPEN } = self.M_SCOPE;
        /* beautify preserve:end */
        try {
            // If the element or its parent has a 'disabled' class, prevent click event
            // Check if the element or its parent has the 'disabled' class
            if (hasDisabledClass(e.currentTarget, e)) {
                console.log('Click event ignored due to disabled class');
                e.preventDefault();
                // Ignore the click event and return null
                return null;
            }
            var TARGET_VAL = e.target.value || null;
            const inputElement = e.target.querySelector("input");
            const CUR_MODEL = self.M_SCOPE.CURRENT_MODEL;

            if (inputElement && !TARGET_VAL) {
                TARGET_VAL = inputElement.value;
            }
            //  if (IS_LOCAL_HOST) debugger;
            var evtLoop = function() {
                try {
                    ACTION_RECORD.GET_COUNT();
                    console.log('Trigger_' + TARGET_VAL);
                    self.ELEMENTS.dataGroupShow.setAttribute("data-group-show", TARGET_VAL);
                    self.M_SCOPE.CURRENT_MODEL = TARGET_VAL;
                    let IsPlainForm = TARGET_VAL == "open_form";

                    if (self.ELEMENTS.formGroupDiv) self.ELEMENTS.formGroupDiv.classList[IsPlainForm ? "remove" : "add"]("opacity");

                    mFunScope.HandlingCiteInput({
                        swtichingTab: true,
                        model: TARGET_VAL
                    });

                    if (INSERT_MODE) {
                        autoFocus(TARGET_VAL);
                        mFunScope.NEW_AUTHOR_GROUP(TARGET_VAL, {
                            attr: `data-new=s data-insert-order=${ACTION_RECORD.INS_ORDER}`
                        });
                        applyFormatting(true, 'title', "", self);
                    }
                } catch (err) {
                    ref_logError('vtLoop', err);
                }
            };
            if (CUR_MODEL == TARGET_VAL) {
                autoFocus(TARGET_VAL);
            } else {
                if (dataExists(e, TARGET_VAL, evtLoop)) {

                } else evtLoop();
            }
        } catch (err) {
            // self.options.passiveSupported = false;
            ref_logError('ChangeInsertOpt', err);
        }
    };
    MultiRefModule.M_FUN.Get_Empty_Skeleton = function(Options = {}, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        try {
            const refElements = document.querySelectorAll('.ref-list .ref .mixed-citation');
            let maxChildCount = 0;
            let elementWithMaxChildren = null;
            refElements.forEach((element) => {
                // Clone the element to avoid modifying the original
                const clone = element.cloneNode(true);
                removeTextNodes_clearTextAndAttributes(clone);

                // Get the number of child elements
                const childCount = clone.children.length;
                // Update the element with the highest child count
                if (childCount > maxChildCount) {
                    maxChildCount = childCount;
                    // Assign the cloned element to the variable
                    elementWithMaxChildren = clone;
                }
            });
            return elementWithMaxChildren ? elementWithMaxChildren.innerHTML : "";
        } catch (err) {
            ref_logError('InsertEmpty', err);
        }
    };
    MultiRefModule.M_FUN.NEW_AUTHOR_GROUP = function(method, Options = {}, self) {
        self = MultiRefModule;
        /* beautify preserve:start */
        let { index, surname, given, evt, attr } = Options;
        let { EDIT_MODE, INSERT_MODE, FROM_QRY, FORCE_OPEN } = self.M_SCOPE;
        /* beautify preserve:end */
        try {
            if (EDIT_MODE) return;
            var Panel_El = self.Panel.querySelector('#refauthorrepeat'),
                isPlain = /open_form/gi.test(method),
                isDoi = /doi_form/gi.test(method),
                valid = (isPlain || isDoi && surname) ? !0 : !1;

            if (!index || index == 0)
                $(Panel_El.querySelectorAll(".form-group")).remove();

            if (valid) {
                $(Panel_El).append(createContributorRowTemplate(self, "author", {
                    "index": index ? index : 0,
                    "surname": surname ? surname : "",
                    "givenname": given ? given : "",
                    "attr": attr ? attr : ""
                }));
                if ((typeof evt == "boolean" && evt == true) || typeof evt == "undefined") {
                    self.M_FUN.ATTACH_LISTENERS();
                }
            }
            // if (isPlain) new_author_evt();
        } catch (err) {
            ref_logError('NEW_AUTHOR_GROUP', err);
        }
    };
    MultiRefModule.M_FUN.ASSIGN_CONFIG_INFO = function(current_type, Options = {}, self) {
        self = MultiRefModule;
        current_type = current_type ? current_type : self._refType;
        try {
            let key = self.M_CONFIG['ELM_ID_MAPPING'][current_type];
            self.M_CONFIG.STYLE_PATTERN = iREF_SCOPE['DOC'].querySelector(`style[name="${key}"]`);
            self.M_CONFIG.STYLE_ORDER = self.M_CONFIG.STYLE_PATTERN.getAttribute('order').split(',');
            self.M_CONFIG.DEFAULT_MISS_ELM = self.M_CONFIG.STYLE_PATTERN.getAttribute('missing').split(',');
            self.M_CONFIG.DELIM = self.M_CONFIG.STYLE_PATTERN.querySelector('delimiter');

        } catch (err) {
            ref_logError('ASSIGN_CONFIG_INFO', err);
        }
    };
    MultiRefModule.M_FUN.REF_2_FORM = function(current_type, Options = {}, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        /* beautify preserve:start */
        let { EditAllBtn, queryPreview, queryDiv,query_respond_div } = self.ELEMENTS;
        let { EDIT_MODE, INSERT_MODE, MISS_ELM_IDs, REF_ID, CLONE_REF, CUR_REF, reEdit, CanErrorUpdate, CanSkip, IsMatch, FROM_QRY, FORCE_OPEN } = self.M_SCOPE;
        let { NewElm, ErrorHandling, ALL_ELM, FORMATTING_ITEMS } = self.M_CONFIG;
        /* beautify preserve:end */

        try {
            var mappingEl = ALL_ELM,
                Query_List = [],
                Query_Data = [];
            for (let x in mappingEl) {
                // ? for loop update all filed cur ref values
                if (!x || !mappingEl[x]) return;
                let [element, Panel_ELm] = [CLONE_REF.querySelector(x), self.Panel.querySelector(mappingEl[x])];
                if (element) {
                    if (x == ".mixed-citation") {
                        // ? handle query here
                        // ? 13_MAY_2023 - HANDLE IF AVAILABLE OUTER MIXED_CITATION
                        [element, element.parentElement].forEach((node, idx) => {
                            node.querySelectorAll("[data-class='ckcommentsfull']").forEach(function(list, index) {
                                let [lab, IsNote] = [list.dataset.label, list.dataset.status == "note"];
                                list.querySelectorAll('span').forEach(function(query_item, i) {
                                    Query_List.push(self.GetTemplate((i == 0 ? 'query_template' : 'query_res_template'), {
                                        "querydata": query_item.dataset.userCommentBox,
                                        label: lab
                                    }));
                                    if (i == 0) Query_Data.push(query_item.dataset.userCommentBox);
                                });
                                // ? end of reference
                                // ? 22-SEP-22/13_MAY_2023 - UPDATE COMMENTS
                                if (idx == 1) {
                                    let currentComment = CUR_REF.querySelector(`[id="${list.id}"]`);
                                    if (currentComment && currentComment.closest(".mixed-citation")) currentComment.remove();
                                }
                            });
                        });
                        moveRefCommentsOutsideMixedCitation(element.parentElement);
                        // ? set ref html as review div
                        // Panel_ELm.innerHTML = element.innerHTML;
                        appendMixedCitationWithCommentsToPreview(element, Panel_ELm);
                        if (Query_List.length > 0) {
                            Query_List = self.G_FUN.Duplicate_Array(Query_List);
                            queryPreview.innerHTML = Query_List.join("");
                            queryDiv.classList.remove('ds-none');
                        } else {
                            queryDiv.classList.add('ds-none');
                        }
                    } else if (['.person-group', '.surname', '.given-names'].includes(x)) {
                        // ? author Group here
                        if (x === ".person-group") {

                            /**
                             * Helper: get person-group-type
                             */
                            function getPersonGroupType(node) {
                                var group = node.closest(".person-group");
                                return group ? group.getAttribute("person-group-type") : null;
                            }

                            /**
                             * Common renderer for author / editor rows
                             */
                            function renderPersonRows(listArray, personGroupType) {

                                return listArray.map(function(list, index) {

                                    var IsDelete = list.hasAttribute("data-delete");
                                    var IsNew = list.hasAttribute("data-new");

                                    var SurName = list.querySelector(
                                        IsNew ? ".surname.insert" : ".surname"
                                    );

                                    var OrderAttr =
                                        (SurName && SurName.hasAttribute("data-insert-order")) ?
                                        ' data-insert-order="' +
                                        SurName.getAttribute("data-insert-order") +
                                        '"' :
                                        "";

                                    var attr =
                                        (IsDelete ? " data-delete='s'" : IsNew ? " data-new='s'" : "") +
                                        OrderAttr +
                                        " person-group-type='" + personGroupType + "'";

                                    return createContributorRowTemplate(self, personGroupType, {
                                        index: index,
                                        surname: getTxt(
                                            list.querySelector(
                                                IsDelete ? ".surname.del" : ".surname"
                                            )
                                        ),
                                        givenname: getTxt(
                                            list.querySelector(
                                                IsDelete ? ".given-names.del" : ".given-names"
                                            )
                                        ),
                                        attr: attr
                                    });
                                });
                            }

                            /**
                             * ==============================
                             * AUTHORS (current group only)
                             * ==============================
                             * .filter(function (node) {
                                return getPersonGroupType(node) === "author";
                            });
                             */
                            var authorNameList = Array.from(element.querySelectorAll(".string-name"));

                            /**
                             * ==============================
                             * Render Rows
                             * ==============================
                             */
                            var finalAuthorRows = renderPersonRows(authorNameList, "author");
                            /**
                             * ==============================
                             * Append to Panel
                             * ==============================
                             */
                            $(Panel_ELm).append(finalAuthorRows.join(""));

                            if (self._refType === "ed-book") {
                                var finalEditorRows = [];
                                /**
                                 * Collect sibling person-groups
                                 */
                                var siblingGroups = getSiblingsWithSameDataName(element).filter(function(node) {
                                    return getPersonGroupType(node) === "editor";
                                });
                                /**
                                 * ==============================
                                 * EDITORS (sibling group only)
                                 * ==============================
                                 * .filter(function (node) {
                                        return getPersonGroupType(node) === "editor";
                                    })
                                 */

                                var editorNameList = siblingGroups.length ?
                                    Array.from(
                                        siblingGroups[0].querySelectorAll(".string-name")
                                    ) : [];

                                finalEditorRows = renderPersonRows(
                                    editorNameList,
                                    "editor"
                                );
                                if (finalEditorRows.length) {
                                    var editorContainer = ensureEditorContributorSection(Panel_ELm, self, {
                                        clearRows: true
                                    });

                                    $(editorContainer).append(finalEditorRows.join(""));

                                    // ? Add heading if not exists
                                    if ($(Panel_ELm).find(".author-box").length === 0) {
                                        $(Panel_ELm).prepend(`<div class="p-2 mb-2 rounded author-box"><h3 class="font-weight-bold text-sm mb-0">Authors</h3></div>`);
                                    }
                                } else if (self.M_SCOPE.EDIT_MODE) {
                                    ensureEditorContributorSection(Panel_ELm, self, {
                                        addEmptyRow: true
                                    });
                                }
                            }

                            /**
                             * Attach listeners
                             */
                            mFunScope.ATTACH_LISTENERS();
                        }

                    } else if (mappingEl[x]) {
                        // ? other all element update their respective filed
                        // debug.log("=====" + x + "=====");
                        if (Panel_ELm) {
                            if (Panel_ELm.type == 'checkbox') {
                                Panel_ELm.checked = element.hasAttribute("data-delete") ? false : true;
                            } else {
                                // ? handling formatting - YA - 12_SEP_2024
                                if (element) handleTextFormatting(x, element, Panel_ELm, {});
                            }
                            Panel_ELm[EDIT_MODE ? "removeAttribute" : "setAttribute"]('disabled', "s");
                            // ? if any input element hidden
                            if (Panel_ELm.closest('.ds-none')) {
                                //Panel_ELm.closest('.ds-none').classList.remove('ds-none');
                            }
                        } else {
                            debug.log(mappingEl[x]);
                        }
                    }
                } else {
                    // ? this case authorGroup - if not found in single instance
                    if (x == '.person-group') {
                        /*
                        let tempString = self.GetTemplate(('new_author_row_form'), {
                            "index": 0,
                            "surname": "",
                            "givenname": ""
                        });
                        $(Panel_ELm).append(tempString);
                        */
                        mFunScope.NEW_AUTHOR_GROUP(Panel_ELm);
                    } else if (Panel_ELm) {
                        // debug.log("==l==" + x + "==l==")
                        Panel_ELm.disabled = EDIT_MODE ? false : true;
                    }
                }
            }
            if (FROM_QRY) {
                query_respond_div.classList.add("ds-none");
                Query_Data.forEach((text, idx, arr) => {
                    // ? highlight items based on query text
                    handleEditorContributorQueryMatch(text, self.Panel.querySelector("#refauthorrepeat"), self, mFunScope);
                    let ClassObj = self.M_CONFIG['ELM_MISS_TEXT_MAPPING'];
                    for (let x in ClassObj) {
                        if (text.match(x)) {
                            let id = self.M_CONFIG['ReverseMapping'][ClassObj[x]];
                            if (id === "editor") {
                                continue;
                            }
                            let input = self.Panel.querySelector(`[id="${id}"]`);
                            if (input) mFunScope.HighLightInput(input);
                            if (id == "title") applyFormatting(!0, input, "", self);
                        }
                    }
                });
                // ? If all inputs are available - If also query present
                EditAllBtn.classList.remove("ds-none");
            } else {
                self.M_SCOPE.MISS_ELM_IDs.forEach(id => {
                    let input = self.Panel.querySelector(`[id="${id}"]`);
                    if (input) mFunScope.HighLightInput(input);
                });
                mFunScope.SHOW_HIDE_INPUTS(current_type);
            }
        } catch (err) {
            ref_logError('REF_2_FORM', err);
        }
    };
    MultiRefModule.M_FUN.SET_TITLES = function(Options = {}, self = MultiRefModule) {
        try {
            /* beautify preserve:start */
            let { FROM_QRY, INSERT_MODE, EDIT_MODE } = self.M_SCOPE;
            /* beautify preserve:end */
            let type = INSERT_MODE ? "NEW" : FROM_QRY ? "QUERY" : "EDIT";
            [`[data-id="headerTitle"]`, `[id="Reply_qry_edit_ref"]`, `[data-id="lab_cmd_qry"]`].forEach(query => {
                let node = self.Panel.querySelector(query);
                if (!node) return debug.log("----Invalid element + " + query);
                let config = self.M_CONFIG.SET_TITLE[(node.id ? node.id : (node.dataset.id ? node.dataset.id : ""))];
                let newValue = config[type];
                if (!config || !newValue) return;
                let IsDiv = node.tagName.match(/div/igm) ? true : false;
                if (newValue != node[(IsDiv) ? "innerHTML" : "textContent"]) {
                    node[(IsDiv) ? "innerHTML" : "textContent"] = newValue;
                }
                if (node.hasAttribute("title")) {
                    node.setAttribute("title", newValue);
                }
            });
        } catch (err) {
            ref_logError('SET_TITLE', err);
        }
    };
    MultiRefModule.UpdateLabels = function(el, key, value) {
        try {
            debug.log("===SET_ALL_LABELS===" + key + "===" + JSON.stringify(value));
            // ? HERE TITLE/SOURCE WILL BE SET WHILE SHOWING
            let type = this._refType ? this._refType : "journal";
            if (key && key.match(/title|source/) && value[type]) {
                return value[type] ? value[type] : "";
            } else return null;
        } catch (err) {
            ref_logError('MultiRefModule_SET_ALL_LABELS', err);
        }
    };
    MultiRefModule.M_FUN.restoreDefault = function(Options = {}, self) {
        self = MultiRefModule;
        /* beautify preserve:start */
        let { BODY, ReplyQryBtn, UpdateByErrBtn, query_respond_div, hints_div, UpdateBtn } = self.ELEMENTS;
        let { MISS_ELM_IDs, REF_ID, CLONE_REF, CUR_REF, reEdit, CanErrorUpdate, CanSkip, IsMatch, FROM_QRY, FORCE_OPEN } = self.M_SCOPE;
        let { NewElm, ErrorHandling, ALL_ELM } = self.M_CONFIG;
        /* beautify preserve:end */
        try {
            // Reset M_SCOPE properties
            Object.assign(self.M_SCOPE, {
                MISS_ELM_IDs: [],
                REF_ID: null,
                CLONE_REF: null,
                CUR_REF: null,
                reEdit: false,
                CanErrorUpdate: false,
                CanSkip: false,
                IsMatch: false,
                FROM_QRY: false,
                FORCE_OPEN: false,
                LAST_ANNOTATION: {},
                NEW_EDIT_CITE: {}
            });
            // Reset M_CONFIG properties
            Object.assign(self.M_CONFIG, {
                NewElm: {},
                ErrorHandling: {}
            });
            if (Options.init) return;
            // ? 23-SEP-24
            [BODY, ReplyQryBtn, UpdateByErrBtn, query_respond_div, hints_div].forEach((opt, idx, arr) => {
                opt.classList[[0, 1].includes(idx) ? 'remove' : 'add'](idx == 0 ? 'edit' : (idx == 1 ? 'disabled' : 'ds-none'));
            });
            let ClassObj = ALL_ELM;
            for (let x in ClassObj) {
                let Panel_Input = self.Panel.querySelector(ClassObj[x]);
                if (!Panel_Input) return;
                Panel_Input.classList.remove('disabled', 'highlight');
                Panel_Input.removeAttribute('disabled');
                if (Panel_Input.type == 'checkbox') Panel_Input.checked = false;
                else Panel_Input[Panel_Input.tagName == 'INPUT' ? 'value' : 'innerHTML'] = '';
            }
            UpdateBtn.classList.add('disabled');
            handleReferenceTypeChange("journal", "doi_form");
        } catch (err) {
            ref_logError('restoreDefault', err);
        }
    };
    MultiRefModule.M_FUN.GET_DTD_MAP = function(id, self) {
        self = MultiRefModule;
        /* beautify preserve:start */
        let { DTD_BASED } = self.M_CONFIG;
        /* beautify preserve:end */
        // ? 22-SEP-24 YA

        if (!id) return null;

        try {
            if (typeof id !== "string") {
                id = id.id;
            }
            if (Object.keys(DTD_BASED).includes(id) && DTD_BASED[id]) {
                return DTD_BASED[id][self._refType];
            }
            return id;
        } catch (err) {
            ref_logError('GET_DTD_MAP', err);
            return id;
        }
    };
    MultiRefModule.M_FUN.HandleNewElement = function(e, Options = {}, param, self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        /* beautify preserve:start */
        let { EDIT_MODE, INSERT_MODE, CLONE_REF, COMPARE_METHOD } = self.M_SCOPE;
        let { ADD_COMMON_ATTR, author_trim } = self.M_CONFIG;
        /* beautify preserve:end */

        var ID_STRING = ("<br>_TARGET-ID-->" + (e.target && e.target.id ? e.target.id : "null") + "_<br>||_M_SCOPE.REF_ID-->" + (CLONE_REF && CLONE_REF.id ? self.M_SCOPE.CLONE_REF.id : "null"));

        let reftype = self._refType || (CLONE_REF ? $(CLONE_REF).find("[publication-type]").attr("publication-type") || "" : "");

        try {
            let IS_NEW_KEY = false,
                TARGET = e.target,
                _TARGET_ID_ = e.target.id,
                TARGET_ID = e.target.id,
                TARGET_VAL = ((EDIT_MODE && (e.content || e.content == "")) ? e.content : e.target.value),
                IsEtal = "etal" == TARGET_ID,
                IsAuthor = /given|surname/gi.test(TARGET_ID),
                forceUpdate = false,
                canSkip = false;
            if (TARGET_ID == "query_respond") {
                // ? QUERY RESPONSE OPTION CLICK IGNORE EVENT
                self.ELEMENTS.UpdateBtn.classList[TARGET_VAL != "" ? "remove" : "add"]('disabled');
                TARGET.classList[TARGET_VAL != "" ? "remove" : "add"]('highlight');
                return;
            }

            if (_TARGET_ID_ == "" && e.target.closest(".note-editor")) {
                const noteEditor = e.target.closest(".note-editor");
                const $editor = noteEditor ? $(noteEditor).prev(".click2edit") : $(self.Panel).find(".click2edit").first();
                if (self._summernote) self._summernote.bindTarget($editor);
                TARGET_VAL = $editor.length ? $editor.summernote('code') : '';
                let field = (reftype === "journal") ? "title" : "source";
                _TARGET_ID_ = TARGET_ID = field;
            }

            const rowScope = getContributorRowScope(TARGET);
            const IsEditorContributor = rowScope.personGroupType === "editor";
            if (IsEditorContributor) {
                _TARGET_ID_ = TARGET_ID = "editor";
                TARGET_VAL = collectEditorContributorResponseContent(self.Panel);
                IsAuthor = false;
            }

            self.M_CONFIG['NewElm'][TARGET_ID] = {};
            mFunScope.Remove_New_Elm(TARGET_ID);
            if (TARGET_VAL == '') {
                if (EDIT_MODE) {
                    // ! 1798040
                    mFunScope.APPEND_DELETE_TXT(TARGET_ID, TARGET_VAL, TARGET, {});
                } else {
                    delete self.M_CONFIG['NewElm'][TARGET_ID];
                }
            } else if (TARGET_VAL != '') {
                var isAppend = false;
                if (EDIT_MODE) isAppend = mFunScope.APPEND_DELETE_TXT(TARGET_ID, TARGET_VAL, TARGET, {});
                if (isAppend) {
                    return debug.log('updated append ... ');
                }

                if (IsEtal && TARGET.checked == false) {
                    forceUpdate = canSkip = true;
                    debug.log("un-checked");
                }

                if (EDIT_MODE) debug.log("new element text inserted " + TARGET_VAL);

                TARGET_ID = mFunScope.GET_DTD_MAP(TARGET);

                let template_id = IsAuthor ? (/given/gi.test(TARGET_ID) ? "given-names" : "surname") : TARGET_ID;
                let Template = IsEditorContributor ? {
                    firstElementChild: buildEditorContributorTemplate(self)
                } : self.GetTemplate(template_id, {
                    "text": IsEtal ? author_trim.insert : TARGET_VAL,
                    frag: true
                });
                let finalElement = Template.firstElementChild;

                if (!canSkip && Template && Template.firstElementChild) {
                    if (Object.keys(ADD_COMMON_ATTR).includes(TARGET_ID)) {
                        const built = buildReferenceLinkElement(TARGET_VAL || '');
                        if (built && built.element) finalElement = built.element;
                    }

                    let source = {
                        "template": finalElement,
                        "target": TARGET,
                        "sourceId": _TARGET_ID_
                    };

                    if (INSERT_MODE) {
                        template_id = IsAuthor ? 'string-name' : TARGET_ID;
                        let split = TARGET_ID.split("_"),
                            index = split[1] ? split[1] : 0;
                        Object.assign(source, {
                            find: IsAuthor ? ".string-name" : ("." + template_id),
                            find_root: (IsAuthor || IsEtal) ? ".person-group" : ".preview",
                            idx: index,
                            append_root: self.GetTemplate(template_id, {
                                frag: true
                            })
                        });
                    }
                    if (TARGET_ID != _TARGET_ID_) {
                        let newObj = Object.assign({}, self.M_CONFIG['NewElm'][_TARGET_ID_]);
                        self.M_CONFIG['NewElm'][TARGET_ID] = Object.assign({}, newObj);
                        delete self.M_CONFIG['NewElm'][_TARGET_ID_];
                    }
                    Object.assign(self.M_CONFIG['NewElm'][TARGET_ID], source);
                    mFunScope.queueFreshPreviewRender(TARGET_ID);
                    mFunScope.HighLightInput(TARGET);
                } else if (!canSkip) {
                    // ? 26-SEP-22 SRINI UPDATE
                    self.M_FUN.SHOW_QUERY_RESPONSE(null, {
                        alert: "error"
                    });
                }
            }
            let [No_Update, NO_Error] = [(Object.keys(self.M_CONFIG['NewElm']).length == 0), Object.keys(self.M_CONFIG['ErrorHandling']).length == 0];
            // ? this option will show while error
            self.ELEMENTS.UpdateByErrBtn.classList[NO_Error ? "add" : "remove"]('ds-none');
            // ? this option will enable/disable based on condition
            self.ELEMENTS.UpdateBtn.classList[((!No_Update && NO_Error) || forceUpdate) ? "remove" : "add"]('disabled');
            // ? this option will enable/disable || show/hide based above both condition
            self.ELEMENTS.ReplyQryBtn.classList[No_Update && NO_Error ? "remove" : "add"](NO_Error ? 'disabled' : "ds-none");
            self.M_SCOPE.CanErrorUpdate = !NO_Error;
        } catch (err) {
            // ? 22-SEP-22 UPDATED YA
            console.warn(err.message + ID_STRING);
            ref_logError('HandleNewElement', err + ID_STRING);
            self.M_FUN.SHOW_QUERY_RESPONSE(null, {
                alert: "error"
            });
        }
    };
    MultiRefModule.M_FUN.Compare_Delimiter = function(Elm, newDelim, Options, _ = MultiRefModule) {
        try {
            let sibling = Elm[Options.sibling];
            if (sibling['nodeType'] == Node.TEXT_NODE) {
                let [txt, removeArr] = [sibling['textContent'],
                    []
                ];
                // let removeArr = [];
                for (var i = txt.length - 1; i >= 0; i--) {
                    //console.log(txt[i]);
                    for (var j = newDelim.length - 1; j >= 0; j--) {
                        // console.log(newDelim[i]);
                        if (newDelim[j] == txt[i]) {
                            removeArr.push(newDelim[j]);
                        }
                    }
                }
                let reverse = newDelim.split('').reverse().join('');
                removeArr.forEach((char, idx, arr) => {
                    reverse = reverse.replace(char, '');
                });
                return reverse.split('').reverse().join('');
            } else return false;
        } catch (err) {
            ref_logError('Compare_Delimiter', err);
        }
    };
    MultiRefModule.M_FUN.UpdateDelimTrack = function(key, Sibling, Options = {}, _ = MultiRefModule) {
        let {
            attr
        } = Options;
        try {
            if (Sibling['nodeType'] == Node.TEXT_NODE) {
                //  var del_dom = _.GetTemplate('default', {tag: 'del',frag: true});
                var del_dom = _.trackManager.getDelNode();
                if (attr) {
                    commonMethods.setAttr(del_dom, attr);
                } else del_dom.setAttribute("data-update", key);
                Sibling.after(del_dom);
                del_dom.appendChild(Sibling);
                //debug.log(Sibling.nextSibling);
            }
        } catch (err) {
            ref_logError('UpdateDelimTrack', err);
        }
    };
    MultiRefModule.M_FUN.getPrefixSuffix = function(Target, Options = {}, self = MultiRefModule) {
        try {
            let PREV = 'Prev';
            let NEXT = 'Next';
            let {
                ELM_ID_MAPPING,
                STYLE_ORDER,
                ALL_ELM
            } = self.M_CONFIG;

            let CEG_MAP_ID = Options.id ? Options.id : (ELM_ID_MAPPING[Target.id]);
            let new_Elm_Idx = STYLE_ORDER.indexOf(CEG_MAP_ID);

            let prevKey = null;
            let nextKey = null;
            let Obj = {
                prefix: '',
                suffix: ''
            };
            const stateKey = Options.stateKey || Target.id;
            const newElmState = Object.assign({}, self.M_CONFIG['NewElm'][stateKey] || {});
            const RefChecks = (id) => ({
                isDoi: id === "‡ref_idDOI",
                isUrl: id === "‡ref_URL",
                isAny: id === "‡ref_idDOI" || id === "‡ref_URL"
            });

            const commitNewElmState = function() {
                self.M_CONFIG['NewElm'][stateKey] = newElmState;
            };
            const resolvePreviewSelector = function(reverse, isDOI = false) {
                const selectors = Object.keys(ALL_ELM).filter((key) => self.M_CONFIG.ALL_ELM[key] === "#" + reverse);

                if (isDOI) {
                    selectors.push('.pub-id', '.ext-link');
                }

                return [...new Set(selectors)].join(',');
            };
            const hasInputValue = function(elm) {
                return !!(elm && typeof elm.value === 'string' && elm.value.length > 0);
            };
            const getInputValue = function(elm) {
                return elm && typeof elm.value === 'string' ? elm.value : '';
            };
            const getLastPreviewNode = function(selector) {
                if (!selector) return null;
                const previewNodes = self.ELEMENTS.previewDiv.querySelectorAll(selector);
                return previewNodes.length ? previewNodes[previewNodes.length - 1] : null;
            };
            const safeSibling = function(node, direction) {
                return node && node[direction] ? node[direction] : null;
            };
            const applySiblingState = function(direction, reverse) {
                if (self.M_SCOPE.FROM_QRY || self.M_SCOPE.EDIT_MODE) {
                    newElmState[direction] = reverse;
                }

                if (direction === PREV) {
                    newElmState.PrevSiblingObj = {
                        IsTrack: true
                    };
                    return;
                }

                newElmState.NextSiblingObj = {
                    IsTrack: true
                };
            };
            let {
                isDoi,
                isUrl,
                isAny
            } = RefChecks(CEG_MAP_ID);
            const buildCandidates = function(direction) {
                if (direction === PREV) {
                    return new_Elm_Idx > 0 ? self.M_CONFIG.STYLE_ORDER.slice(0, new_Elm_Idx).reverse() : [];
                }
                var addVal = isDoi ? 0 : 1;
                return new_Elm_Idx >= 0 ? self.M_CONFIG.STYLE_ORDER.slice(new_Elm_Idx + addVal) : [];
            };


            if (Options.author) {
                return self.M_CONFIG.DELIM.querySelector(`element[first="author"][next="author"]`);
            }
            if (new_Elm_Idx < 0) {
                newElmState.IS_LAST = true;
                newElmState.LAST_DELIM = ".";
                commitNewElmState();
                return Obj;
            }



            const prevCandidates = buildCandidates(PREV);
            for (const prevCandidate of prevCandidates) {
                prevKey = prevCandidate;
                let reverse = self.M_CONFIG['ReverseMapping'][prevKey];
                if (!reverse) continue;

                if (isAny) {
                    let targetVal = getInputValue(Target) || Target.textContent || "";
                    if (typeof hyperLinkDialog != "undefined") {
                        let linkData = hyperLinkDialog.getLinkTypeFromText(targetVal, "reference", {});
                        let {
                            attributes = {}, type = ""
                        } = linkData;
                        // doi-full|doi-partial|reference-url
                        if (/doi-full|reference-url/gi.test(type)) {
                            CEG_MAP_ID = "‡ref_URL";
                        }
                    }
                }

                let previewFind = self.M_FUN.GET_DTD_MAP(reverse);
                let prev = self.Panel.querySelector(`#${reverse}`);
                let prev_elm = getLastPreviewNode(`.${previewFind}`);
                const shouldUsePrevSibling = hasInputValue(prev) || self.M_CONFIG['Ignore_Sibiling'][PREV].includes(reverse);


                if (prev_elm && shouldUsePrevSibling) {
                    applySiblingState(PREV, reverse);
                    let delim_config = self.M_CONFIG.DELIM.querySelector(`element[first="${prevKey}"][next="${CEG_MAP_ID}"]`);
                    let delim = delim_config ? delim_config.getAttribute('delim') : "";
                    Obj.prefix = delim;
                    const prevSibling = safeSibling(prev_elm, 'nextSibling');
                    if (prevSibling) {
                        let is_node_type = prevSibling['nodeType'] == Node.TEXT_NODE;
                        if (prevSibling[is_node_type ? 'nodeValue' : 'textContent'].lastChar() == Obj.prefix.firstChar()) {
                            // Obj.prefix = Obj.prefix.slice(1);
                        }
                    }
                    break;
                }
            }
            // ? while loop for next elm
            // ? current and next element if null - this should last
            let IsLastElm = true;
            const nextCandidates = buildCandidates(NEXT);
            for (const nextCandidate of nextCandidates) {
                nextKey = nextCandidate;
                let {
                    isDoi,
                    isUrl,
                    isAny
                } = RefChecks(nextKey);
                let reverse = self.M_CONFIG['ReverseMapping'][nextKey];
                let nextInput = self.Panel.querySelector(`#${reverse}`);
                let panelRefVal = self.ELEMENTS.previewDiv.querySelector(`.${reverse}`);
                if (!panelRefVal || isAny) {
                    let find_key = resolvePreviewSelector(reverse, isAny);
                    if (find_key) panelRefVal = self.ELEMENTS.previewDiv.querySelector(find_key);
                }

                if (isDoi) {
                    var val = getInputValue(nextInput);
                    debug.log('DOI value:', val);
                    if (val.includes("http") || val.includes("www")) {
                        continue;
                    }
                }

                const shouldUseSibling = hasInputValue(nextInput) || self.M_CONFIG['Ignore_Sibiling'][NEXT].includes(reverse);
                if (panelRefVal && shouldUseSibling) {
                    IsLastElm = false;
                    applySiblingState(NEXT, reverse);

                    //? fetching the last delimiter
                    let delim_config = self.M_CONFIG.DELIM.querySelector(`element[first="${CEG_MAP_ID}"][next="${nextKey}"]`);
                    let delim = delim_config ? delim_config.getAttribute('delim') : "";
                    //let IsAvailable = (next_elm.previousSibling.nodeType == Node.TEXT_NODE&&next_elm.previousSibling.textContent==delim)?true:false;
                    // ? compare current vs from config delim
                    // let CompareDelim = next_elm?_.Compare_Delimiter(next_elm, delim, { 'sibling': 'previousSibling', key: Elm.id }):null;
                    Obj.suffix = /* CompareDelim ? CompareDelim : */ delim;
                    //? track handling - If existing not match with config delim - put on the del tag
                    const nextSibling = safeSibling(panelRefVal, 'previousSibling');
                    if ( /* _.M_SCOPE.FROM_QRY && CompareDelim == '' &&  */ nextSibling) {
                        let canTrack = true;
                        // if (txt_1 == txt.firstChar()) {
                        //     Obj.suffix = Obj.suffix.slice(0, -1);
                        //     canTrack = false;
                        // }
                        newElmState.NextSiblingObj = {
                            IsTrack: canTrack
                        };
                    }
                    break;
                }
            }
            if (IsLastElm) {
                // ? 23-SEP-22  IF LAST ELEMENT WILL UPDATE - DELIM GETTING || WILL SET DEFAULT "DOT"
                newElmState.IS_LAST = true;
                let suffix_elm = self.M_CONFIG.DELIM.querySelector(`element[first="${CEG_MAP_ID}"][next=""]`);
                let config_delim = self.M_CONFIG['Handling_Delim_Except'][Target.id];
                Obj.suffix = suffix_elm ? suffix_elm.getAttribute('delim') : (config_delim ? config_delim : ".");
                newElmState.LAST_DELIM = Obj.suffix;

            } else {
                newElmState.IS_LAST = false;
            }
            commitNewElmState();
            //? GETTING
            return Obj;
        } catch (err) {
            // ? 26-SEP-22 SRINI UPDATE
            ref_logError('getPrefixSuffix', err);
            MultiRefModule.M_FUN.SHOW_QUERY_RESPONSE(null, {
                alert: "error"
            });
        }
    };

    function findInsertedPreviewNode(key, self = MultiRefModule) {
        try {
            if (!self.ELEMENTS || !self.ELEMENTS.previewDiv || !key) return null;
            return self.ELEMENTS.previewDiv.querySelector(`[data-update="${key}"]`);
        } catch (err) {
            ref_logError('findInsertedPreviewNode', err);
            return null;
        }
    }

    function getBoundaryText(node) {
        if (!node) return "";
        if (node.nodeType == Node.TEXT_NODE) return node.textContent || "";
        return node.textContent || "";
    }

    function getFirstNonSpaceCharIndex(value) {
        value = value || "";
        for (let index = 0; index < value.length; index++) {
            if (!/\s/.test(value[index])) return index;
        }
        return -1;
    }

    function getLastNonSpaceChar(value) {
        value = value || "";
        for (let index = value.length - 1; index >= 0; index--) {
            if (!/\s/.test(value[index])) return value[index];
        }
        return "";
    }

    function isBoundaryDelimiterChar(value) {
        return !!value && !/[A-Za-z0-9\s]/.test(value);
    }

    function removeDuplicateBoundaryDelimiter(affix, boundaryText) {
        try {
            // If both are identical, return empty
            if (affix === boundaryText) return '';

            const duplicateChar = getLastNonSpaceChar(boundaryText);
            const affixIndex = getFirstNonSpaceCharIndex(affix);

            if (affixIndex === -1 || !isBoundaryDelimiterChar(duplicateChar)) return affix;
            if (affix[affixIndex] !== duplicateChar) return affix;

            // Remove duplicate char at affixIndex
            return affix.slice(0, affixIndex) + affix.slice(affixIndex + 1);
        } catch (err) {
            ref_logError('removeDuplicateBoundaryDelimiter', err);
            return affix;
        }
    }

    function normalizeDirectPreviewAffixes(prefix, suffix, insertedPreviewNode, templateOrNextNode) {
        try {
            if (!insertedPreviewNode) {
                return {
                    prefix,
                    suffix
                };
            }

            prefix = removeDuplicateBoundaryDelimiter(prefix, getBoundaryText(insertedPreviewNode.previousSibling));
            suffix = removeDuplicateBoundaryDelimiter(suffix, getBoundaryText(templateOrNextNode));

            return {
                prefix,
                suffix
            };
        } catch (err) {
            ref_logError('normalizeDirectPreviewAffixes', err);
            return {
                prefix,
                suffix
            };
        }
    }

    /**
     * Fresh EDIT preview: omit computed affixes when the same delimiter text
     * already exists in the mixed-citation (keep document delim; do not stamp a copy).
     */
    function omitExistingPreviewAffixes(options) {
        try {
            options = options || {};
            var prefix = options.prefix || '';
            var suffix = options.suffix || '';
            var insertedPreviewNode = options.insertedPreviewNode;
            var nextLeafOrBoundary = options.nextLeafOrBoundary;
            var norm = function(v) {
                return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
            };
            var boundaryBeforeNext = '';
            if (nextLeafOrBoundary) {
                if (nextLeafOrBoundary.nodeType == Node.TEXT_NODE) {
                    boundaryBeforeNext = nextLeafOrBoundary.textContent || '';
                } else if (nextLeafOrBoundary.previousSibling) {
                    boundaryBeforeNext = getBoundaryText(nextLeafOrBoundary.previousSibling);
                } else {
                    boundaryBeforeNext = getBoundaryText(nextLeafOrBoundary);
                }
            }
            if (suffix && norm(suffix) && norm(suffix) === norm(boundaryBeforeNext)) {
                suffix = '';
            }
            if (prefix && insertedPreviewNode && insertedPreviewNode.previousSibling) {
                var beforeInsert = getBoundaryText(insertedPreviewNode.previousSibling);
                if (norm(prefix) && norm(prefix) === norm(beforeInsert)) {
                    prefix = '';
                }
            }
            if (suffix && insertedPreviewNode && insertedPreviewNode.nextSibling) {
                var afterInsert = getBoundaryText(insertedPreviewNode.nextSibling);
                if (norm(suffix) && norm(suffix) === norm(afterInsert)) {
                    suffix = '';
                }
            }
            return {
                prefix: prefix,
                suffix: suffix
            };
        } catch (err) {
            ref_logError('omitExistingPreviewAffixes', err);
            return {
                prefix: (options && options.prefix) || '',
                suffix: (options && options.suffix) || ''
            };
        }
    }

    function resolvePreviewLinkLeaf(previewDiv, afterNode) {
        try {
            if (!previewDiv || !previewDiv.querySelectorAll) return null;
            var nodes = previewDiv.querySelectorAll('.pub-id, .ext-link, .uri');
            if (!nodes.length) return null;
            if (!afterNode) return nodes[0];
            for (var i = 0; i < nodes.length; i++) {
                var leaf = nodes[i];
                if (afterNode.contains && afterNode.contains(leaf)) continue;
                if (typeof Node !== 'undefined' && Node.DOCUMENT_POSITION_FOLLOWING != null) {
                    var pos = afterNode.compareDocumentPosition(leaf);
                    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return leaf;
                } else {
                    return leaf;
                }
            }
            return null;
        } catch (err) {
            ref_logError('resolvePreviewLinkLeaf', err);
            return null;
        }
    }


    function insertPendingPreviewTemplates(renderEntries, self = MultiRefModule) {
        try {
            if (!self.ELEMENTS || !self.ELEMENTS.previewDiv || !renderEntries || !renderEntries.length) return;

            const {
                STYLE_ORDER,
                ReverseMapping
            } = self.M_CONFIG;
            const freshKeys = self.M_SCOPE.FRESH_RENDER_KEYS || [];
            const previewDiv = self.ELEMENTS.previewDiv;
            const getRenderOrderId = function(key, value) {
                const target = value && value.target;
                return self.M_CONFIG.ELM_ID_MAPPING[key] ||
                    self.M_CONFIG.ELM_ID_MAPPING[value && value.sourceId] ||
                    (target && self.M_CONFIG.ELM_ID_MAPPING[target.id]) ||
                    key;
            };
            const findPreviewNode = function(orderId) {
                if (orderId === "editor") return getContributorPreviewGroup(previewDiv, "editor");

                const reverse = ReverseMapping[orderId];
                if (!reverse) return null;

                const mapped = self.M_FUN.GET_DTD_MAP(reverse);
                const selectors = [reverse, mapped].filter(Boolean).map(function(item) {
                    return "." + item;
                }).join(",");
                if (!selectors) return null;

                const nodes = previewDiv.querySelectorAll(selectors);
                return nodes.length ? nodes[nodes.length - 1] : null;
            };
            const findPreviousAnchor = function(orderId) {
                const currentIndex = STYLE_ORDER.indexOf(orderId);
                const candidates = currentIndex > 0 ? STYLE_ORDER.slice(0, currentIndex).reverse() : [];

                for (const candidate of candidates) {
                    const node = findPreviewNode(candidate);
                    if (node) return node.closest('insert') || node;
                }
                return null;
            };

            renderEntries.forEach(function(entry) {
                const key = entry[0];
                const value = entry[1];
                if (!value || !value.template || !freshKeys.includes(key)) return;

                const orderId = getRenderOrderId(key, value);
                const insertedWrapper = self.trackManager.getInsNode();
                let selector = `[data-update="${key}"],[data-edit="${key}"]`;
                if (key.startsWith("editor")) {
                    selector += ',[data-update^="editor"],[data-edit^="editor"]';
                }
                previewDiv.querySelectorAll(selector).forEach(el => {
                    commonMethods.removeEl(el);
                });
                insertedWrapper.setAttribute("data-update", key);
                insertedWrapper.append(value.template.cloneNode(true));

                const previousAnchor = findPreviousAnchor(orderId);
                if (previousAnchor) previousAnchor.insertAdjacentElement("afterend", insertedWrapper);
                else previewDiv.append(insertedWrapper);
            });
        } catch (err) {
            ref_logError('insertPendingPreviewTemplates', err);
        }
    }

    MultiRefModule.M_FUN.queueFreshPreviewRender = function(targetId, Options = {}, self = MultiRefModule) {
        try {
            if (!targetId) return;

            let {
                NewElm,
                STYLE_ORDER,
                ELM_ID_MAPPING
            } = self.M_CONFIG;

            const pendingKeys = Object.keys(NewElm || {});
            const resolveOrderId = function(key) {
                const state = NewElm[key] || {};
                const target = state.target;
                return ELM_ID_MAPPING[key] ||
                    ELM_ID_MAPPING[state.sourceId] ||
                    (target && ELM_ID_MAPPING[target.id]) ||
                    key;
            };
            const getStyleIndex = function(key) {
                const mapped = resolveOrderId(key);
                const index = STYLE_ORDER.indexOf(mapped);
                return index === -1 ? Number.MAX_SAFE_INTEGER : index;
            };

            pendingKeys.sort(function(a, b) {
                return getStyleIndex(a) - getStyleIndex(b);
            });

            pendingKeys.forEach(function(key) {
                self.M_FUN.Remove_New_Elm(key);
            });

            pendingKeys.forEach(function(key) {
                const state = NewElm[key];
                if (!state) return;

                delete state.delim;
                delete state.Prev;
                delete state.Next;
                delete state.PrevSiblingObj;
                delete state.NextSiblingObj;
                delete state.IS_LAST;
                delete state.LAST_DELIM;
            });

            self.M_SCOPE.FRESH_RENDER_KEYS = pendingKeys;
            try {
                self.M_FUN.UpdatePreview();
            } finally {
                self.M_SCOPE.FRESH_RENDER_KEYS = [];
            }
        } catch (err) {
            ref_logError('queueFreshPreviewRender', err);
        }
    };
    MultiRefModule.M_FUN.Remove_New_Elm = function(elmKey, Options = {}, self) {
        self = MultiRefModule;
        try {
            // Build selector depending on elmKey
            let selector;
            if (Options.selector) {
                selector = Options.selector;
            } else {
                if (elmKey === "editor") {
                    selector = `[data-edit^="editor"],[data-update^="editor"]`;
                } else {
                    selector = `[data-edit="${elmKey}"],[data-update="${elmKey}"]`;
                }
            }

            // Query elements
            let find_update = Options.collection ?
                Options.collection :
                self.ELEMENTS.previewDiv.querySelectorAll(selector);

            if (find_update.length > 0) {
                find_update.forEach(element => {
                    if (element.tagName === "DEL") {
                        element.after(...element.childNodes);
                    }
                    commonMethods.removeEl(element);
                });
            }
            //? https://developer.mozilla.org/en-US/docs/Web/API/Node/normalize - YA 08_JUNE_2023
            self.ELEMENTS.previewDiv.normalize();
        } catch (err) {
            ref_logError('Remove_New_Elm', err);
        }
    };
    MultiRefModule.M_FUN.PREVIEW_NODE_LAST = function(curElm, _ = MultiRefModule) {
        try {
            let [preview_last, ref_last, is_last_elm, loop_count, returnObj] = [curElm ? curElm : _.ELEMENTS.previewDiv.lastChild, _.M_SCOPE.CUR_REF.querySelector(".mixed-citation").lastChild, false, 0, {}];
            [preview_last, ref_last].forEach((last, idx, arr) => {
                while (Node.ELEMENT_NODE != last['nodeType'] && last.dataset.class == "ckcommentsfull") {
                    if (last.previousSibling.tagName == "INSERT") {
                        last = _.M_FUN.PREVIEW_NODE_LAST(last.previousSibling);
                    } else {
                        last = last.previousSibling;
                    }
                    if (loop_count > 25) break;
                    else loop_count++;
                    if (last) {
                        returnObj[idx] = last.classList;
                    }
                }
                if (last) {
                    returnObj[idx] = last.classList;
                }
            });
            return returnObj;
        } catch (err) {
            ref_logError('PREVIEW_NODE_LAST', err);
        }
    };
    MultiRefModule.M_FUN.rangeCompare = function(nextNode, JSON, _ = MultiRefModule) {
        try {
            var [compare_prefix, compare_suffix] = ["", ""];
            if (nextNode && nextNode['nodeType'] == Node.TEXT_NODE) {
                compare_prefix = text_compare(nextNode['textContent'], JSON.delim.prefix);
                compare_suffix = JSON.delim.suffix;
                if (JSON.IS_LAST) {
                    if (nextNode['textContent'] == compare_suffix) {
                        compare_suffix = "";
                    } else {

                    }
                } else {

                }
            } else {
                compare_prefix = [
                    [], JSON.delim.prefix
                ];
                compare_prefix = text_compare(nextNode['textContent'], JSON.delim.prefix);
                compare_suffix = JSON.delim.suffix;
            }
            return {
                start: compare_prefix[0].length,
                prefix: compare_prefix[1],
                suffix: compare_suffix
            };
        } catch (err) {
            ref_logError('rangeCompare', err);
        }
    };
    MultiRefModule.M_FUN.UpdatePreview = function(self, mFunScope) {
        self = MultiRefModule;
        mFunScope = self.M_FUN;
        /* beautify preserve:start */
        let { EDIT_MODE, INSERT_MODE } = self.M_SCOPE,
            { previewDiv } = self.ELEMENTS;
        /* beautify preserve:end */
        try {
            const getRenderOrderId = function(key, value) {
                const target = value && value.target;
                return self.M_CONFIG.ELM_ID_MAPPING[key] ||
                    self.M_CONFIG.ELM_ID_MAPPING[value && value.sourceId] ||
                    (target && self.M_CONFIG.ELM_ID_MAPPING[target.id]) ||
                    key;
            };
            const renderEntries = Object.entries(self.M_CONFIG['NewElm']).sort(function(a, b) {
                const firstIndex = self.M_CONFIG.STYLE_ORDER.indexOf(getRenderOrderId(a[0], a[1]));
                const nextIndex = self.M_CONFIG.STYLE_ORDER.indexOf(getRenderOrderId(b[0], b[1]));
                return (firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex) -
                    (nextIndex === -1 ? Number.MAX_SAFE_INTEGER : nextIndex);
            });

            function getSiblingElement(el, dir = 'next') {
                try {
                    if (!el) return null;

                    let sibling;
                    if (dir === 'next') {
                        sibling = el.nextSibling || (el.parentElement ? el.parentElement.nextSibling : null);
                    } else if (dir === 'prev') {
                        sibling = el.previousSibling || (el.parentElement ? el.parentElement.previousSibling : null);
                    }

                    return sibling || el;
                } catch (err) {
                    ref_logError('getSiblingElement', err);
                    return null;
                }
            }

            insertPendingPreviewTemplates(renderEntries, self);

            renderEntries.forEach(([key, value]) => {
                debug.log([key, value]);
                /* beautify preserve:start */
                let { delim, Prev, find, find_root, idx, append_root, template } = value;
                /* beautify preserve:end */
                const isFreshRender = self.M_SCOPE.FRESH_RENDER_KEYS && self.M_SCOPE.FRESH_RENDER_KEYS.includes(key);
                let insertedPreviewNode = null;
                if (isFreshRender) {
                    const target = value.target || self.Panel.querySelector("#" + (value.sourceId || key));
                    if (!target) return;
                    delim = mFunScope.getPrefixSuffix(target, {
                        stateKey: key,
                        id: getRenderOrderId(key, value)
                    }, self);
                    value = self.M_CONFIG['NewElm'][key];
                    if (!value || [undefined, null, "undefined", "null"].includes(delim)) return;
                    value.delim = delim;
                    Prev = value.Prev;
                    template = value.template;
                    insertedPreviewNode = findInsertedPreviewNode(key, self);
                    if (!insertedPreviewNode) return;
                }
                if (!delim) return;

                let FindPrev = null;
                let FindPrevAll = previewDiv.querySelectorAll("." + Prev);
                if (FindPrevAll && FindPrevAll.length > 0) {
                    FindPrev = FindPrevAll[FindPrevAll.length - 1];
                }
                let FindNext = previewDiv.querySelector(`.${value.Next}`);
                if (!FindNext && value.Next) {
                    let map_Id = mFunScope.GET_DTD_MAP(value.Next);
                    if (map_Id) {
                        FindNext = previewDiv.querySelector(`.${map_Id}`);
                    }
                }
                // Fresh path: DOI/URL may be pub-id while Next style still maps to ext-link
                if (insertedPreviewNode && /ext-link|pub-id|uri|url|doi/i.test(String(value.Next || ''))) {
                    const linkLeaf = resolvePreviewLinkLeaf(previewDiv, insertedPreviewNode);
                    if (linkLeaf) FindNext = linkLeaf;
                }

                if (FindPrev && FindPrev.closest('insert')) FindPrev = FindPrev.closest('insert');
                // Fresh path keeps FindNext as the leaf for omitExistingPreviewAffixes.
                // Non-fresh path still wants the previous sibling of that leaf for placement.
                let FindNextBoundary = FindNext;
                if (FindNext && !insertedPreviewNode) {
                    const parent = FindNext.closest('insert') ? FindNext.closest('insert') : FindNext;
                    FindNext = getSiblingElement(parent, 'prev');
                    FindNextBoundary = FindNext;
                }


                let new_Elm_with_Track = insertedPreviewNode || self.trackManager.getInsNode();
                if (!insertedPreviewNode) new_Elm_with_Track.setAttribute("data-update", key);
                // ? for Fetch and tracking

                // ? avoid keystroke multi-time
                if (!insertedPreviewNode) this.Remove_New_Elm(key);

                let prefix = "";
                let suffix = "";
                let checkDelim = null;
                let LoopNextPrev = null;
                let obj_pre_suf = {
                    prefix: "",
                    suffix: ""
                };

                if (FindPrev && !insertedPreviewNode) {
                    LoopNextPrev = getSiblingElement(FindPrev);
                    if (LoopNextPrev) checkDelim = this.rangeCompare(LoopNextPrev, value);
                } else if (insertedPreviewNode) {
                    checkDelim = obj_pre_suf;
                }

                if (INSERT_MODE && !checkDelim) checkDelim = obj_pre_suf;

                if (checkDelim) {
                    prefix = insertedPreviewNode ? delim.prefix : checkDelim.prefix;
                    suffix = insertedPreviewNode ? delim.suffix : checkDelim.suffix;
                    if (key == "lpage") {
                        if (prefix == "") prefix = "–";
                    }
                    if (insertedPreviewNode) {
                        const omitted = omitExistingPreviewAffixes({
                            prefix,
                            suffix,
                            insertedPreviewNode,
                            nextLeafOrBoundary: FindNextBoundary
                        });
                        prefix = omitted.prefix;
                        suffix = omitted.suffix;
                        const normalizedAffixes = normalizeDirectPreviewAffixes(prefix, suffix, insertedPreviewNode, FindNextBoundary ? FindNextBoundary : template);
                        prefix = normalizedAffixes.prefix;
                        suffix = normalizedAffixes.suffix;
                    }

                } else if (!checkDelim) return;

                // ? append prefix and suffix inside track
                if (insertedPreviewNode) {
                    insertedPreviewNode.replaceChildren(prefix, template, suffix);
                    return;
                } else {
                    new_Elm_with_Track.append(prefix, template, suffix);
                }
                if (FindPrev && FindPrev.closest('insert')) {
                    // ? <insert class="ice-ins ice-cts-3111">):<span class="fpage">2</span>. doi:–<span class="lpage">51</span>. doi:</insert>
                    FindPrev = FindPrev.closest('insert');
                    let lastChild = FindPrev.lastChild;
                    if (lastChild.nodeType == Node.TEXT_NODE) {
                        if (lastChild.textContent == delim.suffix || lastChild.textContent != delim.prefix || lastChild.textContent == delim.prefix) {
                            FindPrev.removeChild(lastChild);
                        }
                    }
                }
                if (FindNext && FindNext.closest('insert')) {
                    FindNext = FindNext.closest('insert');
                    let firstChild = FindNext.firstChild;
                    if (firstChild.nodeType == Node.TEXT_NODE) {
                        if (firstChild.textContent == delim.suffix) {
                            FindNext.removeChild(firstChild);
                        }
                    }
                }
                if (checkDelim && checkDelim.start > 0) {
                    // ? range method
                    // ? https://javascript.info/selection-range
                    // ? https://plnkr.co/edit/?p=preview&preview
                    let [range, lastFocus] = [new Range(), null];
                    if (!LoopNextPrev) return;
                    range.setStart(LoopNextPrev, checkDelim.start);
                    range.setEnd(LoopNextPrev, checkDelim.start);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                    range.insertNode(new_Elm_with_Track);
                    window.getSelection().removeAllRanges();
                    if (self.M_SCOPE.LAST_FOCUS.INPUT_ID) {
                        if (typeof commonMethods.setCaretPosition == "function") {
                            commonMethods.setCaretPosition(self.M_SCOPE.LAST_FOCUS.ELM);
                        }
                    }
                } else if (FindPrev) {
                    // ? final append the preview div
                    if (!LoopNextPrev) return;
                    if (suffix) {
                        this.UpdateDelimTrack(key, LoopNextPrev, {});
                    }
                    FindPrev.after(new_Elm_with_Track);
                }
                // ? move after del tag
                if (FindPrev && FindPrev.tagName == "DEL") {
                    FindPrev.nextElementSibling.after(FindPrev);
                }
            });
            // ? 24_MOV_2022 - YA - MULTIPLE UPDATE
            var [rev_coll, del_text] = [(Array.from(self.ELEMENTS.previewDiv.querySelectorAll("del[data-update]")).reverse()), []];
            rev_coll.forEach((el, idx, arr) => {
                if (del_text.includes(el.textContent)) {
                    el.remove();
                    // ? CURRENTLY HOLD
                } else {
                    del_text.push(el.textContent);
                }
            });
        } catch (err) {
            ref_logError('UpdatePreview', err);
        }
    };
    MultiRefModule.M_FUN.HighLightInput = function(elm, Options = {}, self) {
        self = MultiRefModule;
        try {
            elm = (typeof elm == "string") ? self.Panel.querySelector(elm) : elm;
            if (!elm) return debug.warn("invalid");
            let IsEmpty = elm.value == "";
            elm.classList[IsEmpty ? 'add' : 'remove']('highlight');
            if (self.M_SCOPE.FROM_QRY && IsEmpty) {
                elm.classList.remove('disabled');
                elm.disabled = false;
            }
            let [current_active, high_Elm] = [document.activeElement, self.Panel.querySelector('.highlight')];
            if (current_active) {
                let isActiveInsidePanel = self.Panel && self.Panel.contains(current_active);
                debug.log("--HighLightInput--");
                if (high_Elm && !isActiveInsidePanel) {
                    high_Elm.focus();
                    high_Elm.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                }
            }
        } catch (err) {
            ref_logError('HighLightInput', err);
        }
    };
    MultiRefModule.M_FUN.SHOW_QUERY_RESPONSE = function(elm, Options = {}, self = MultiRefModule) {
        try {
            let {
                query_respond_div,
                query_reply,
                ReplyQryBtn,
                UpdateBtn,
                hints_div
            } = self.ELEMENTS;

            let current_active = document.activeElement;
            let high_Elm = self.Panel.querySelectorAll('input');

            elm = query_reply;
            // ? 03_JAN_23 - YA
            elm.value = "";
            high_Elm.forEach(el => {
                if (el.classList.contains("highlight")) el.value = "";
                el.classList[elm.id == el.id ? "add" : "remove"]('highlight');
                el.classList[elm.id == el.id ? "remove" : "add"]('disabled');
            });

            // ? this condition - while need to show the alert


            query_respond_div.classList.remove("ds-none");
            self.scrollFocus(query_respond_div);
            ReplyQryBtn.classList.add("disabled");
            UpdateBtn.classList.add('disabled');
            if (Options.alert) {
                hints_div.classList.remove('ds-none');
                let warn_txt = self['M_CONFIG']['Update_MSG'][Options.alert];
                if (Options.txt) {
                    warn_txt = warn_txt.replace("###", Options.txt);
                }
                $(self.ELEMENTS.hint).html("").append(self.newElm("span", {
                    text: warn_txt,
                    addclass: 'warn'
                }));
                hints_div.scrollIntoView();
            }
            // ? 24_NOV_22 - YA - UPDATE LAST QUERY SAME - ID SAME USER
            if (self['M_SCOPE'].CUR_QRY && !self.M_SCOPE.EDIT_MODE) {
                let LAST_CMD = self['M_SCOPE'].CUR_QRY.lastElementChild;
                if (LAST_CMD && commonMethods.IS_SAME_USER_AND_ROLE(LAST_CMD)) {
                    elm.value = LAST_CMD.getAttribute("data-user-comment-box");
                }
            } else if (self.M_SCOPE.EDIT_MODE) {
                // TODO FEATURE WHILE OPEN FOR ALL ROLES
            }
            elm.focus();
        } catch (err) {
            ref_logError('ShowQuery_Response', err);
        }
    };
    MultiRefModule.M_FUN.applyPublisherOrder = function(publisherOrderList = [], _ = MultiRefModule) {
        try {

            if (!Array.isArray(publisherOrderList) || publisherOrderList.length < 2) return;

            // Sort by the STYLE_ORDER index
            publisherOrderList.sort((a, b) => a.index - b.index);

            // All publisher <div class="col"> share the same parent
            const parent = publisherOrderList[0].group.parentElement;
            if (!parent) return;

            // Re-append in sorted order
            publisherOrderList.forEach(item => {
                parent.appendChild(item.group);
            });
        } catch (err) {
            ref_logError('ShowQuery_Response', err);
        }
    };

    MultiRefModule.M_FUN.SHOW_HIDE_INPUTS = function(current_type, childNodesClass = [], self = MultiRefModule) {
        try {

            self.M_FUN.ASSIGN_CONFIG_INFO(current_type);

            const cfg = self.M_CONFIG;
            const EM = cfg.ELM_ID_MAPPING;
            const AT = cfg.ALLOWED_TYPE;
            const SO = cfg.STYLE_ORDER;

            const MOVED_ELM = cfg.MOVED_ELM;

            if (!AT.includes(current_type)) return false;

            var isJournal = current_type === "journal";
            var isBook = current_type === "book";
            var isEditedBook = current_type === "ed-book";

            let autoDisabledElms = [];
            let publisherOrderList = [];


            const hasTitle = ["article-title", "chapter-title"].some(cls => childNodesClass.includes(cls));

            const isBookChapter = isEditedBook || isBook && hasTitle;
            const clientBase = window.IS_PLOS_DEMO || !IS_JOURNAL;

            // ---------------------------------------------------------
            // 1 Collect autoDisabled (EM-mapped values not in SO)
            // ---------------------------------------------------------
            try {
                if (clientBase && (isEditedBook || isBook)) {
                    ['issue', 'fpage', 'lpage', 'publisher-loc', 'publisher-name'].forEach(function(key, idx) {
                        try {
                            const mapped = EM[key];
                            const isPublisher = idx > 2;

                            if (!mapped || (SO.indexOf(mapped) !== -1 && !isPublisher)) return;

                            const item = self.Panel.querySelector("#" + key + ", ." + key);
                            if (!item) return;

                            const group = item.closest(isPublisher ? ".col" : ".form-group");
                            if (!group) return;

                            if (isPublisher) {
                                publisherOrderList.push({
                                    key: key,
                                    group: group,
                                    index: SO.indexOf(mapped)
                                });
                            } else {
                                autoDisabledElms.push(group);
                            }
                        } catch (err) {
                            console.error("Error processing key:", key, err.message);
                        }
                    });
                    self.M_FUN.applyPublisherOrder(publisherOrderList);
                }
            } catch (err) {
                console.error("Error in autoDisabled collection:", err.message);
            }

            console.log("autoDisabled: =>" + JSON.stringify(autoDisabledElms));

            // ---------------------------------------------------------
            // 2 Get DOM elements only — filter out strings!
            // ---------------------------------------------------------
            const configBasedHide = [];
            const finalHide = [].concat(configBasedHide, autoDisabledElms);

            // ---------------------------------------------------------
            // 3 Apply show/hide logic
            // ---------------------------------------------------------
            try {
                finalHide.forEach(function(elm, idx) {
                    try {
                        if (!(elm instanceof Element)) return;

                        debug.log("SHOW_HIDE_INPUTS:", idx + "<==>" + elm.id);

                        var input = elm.querySelector("input");
                        var dataInput = elm.getAttribute("data-input");
                        var parent = (elm.hasAttribute("data-input") || elm.classList.contains("form-group")) ?
                            elm :
                            elm.parentElement;
                        var label = parent ? parent.querySelector("label") : null;

                        var isChapterInput = input && /chapter/.test(input.id || "");
                        var isTitleInput = input && /title|source/.test(input.id || "");

                        var shouldShowElm = (current_type === dataInput) || (isEditedBook && dataInput === "book");


                        // Rule 1: Book → always hide chapter field + label
                        if (isBook) {
                            if (isTitleInput) {
                                if (isChapterInput) {
                                    elm.classList.add("ds-none");
                                }
                                if (isBook) {
                                    if (label) {
                                        debug.log("SHOW_HIDE_INPUTS: show label for ==>" + label.innerHTML);
                                        label.classList.add("ds-none");
                                    }
                                }
                            }
                        }

                        // Rule 2: Element visibility
                        if (shouldShowElm) {
                            elm.classList.remove("ds-none");
                        } else {
                            elm.classList.add("ds-none");
                        }

                        // Rule 3: Label visibility (title override)
                        if (label && isTitleInput) {
                            if (shouldShowElm || (isEditedBook && isTitleInput)) {
                                if (isTitleInput && isEditedBook && !shouldShowElm) {
                                    debug.log("show title for default:", current_type);
                                }
                                label.classList.remove("ds-none");
                            } else {
                                label.classList.add("ds-none");
                                debug.log("SHOW_HIDE_INPUTS: show label for ==>" + label.innerHTML);
                            }
                        }
                    } catch (err) {
                        console.error("Error applying show/hide logic for element:", idx, err.message);
                    }
                });
            } catch (err) {
                console.error("Error in show/hide loop:", err.message);
            }

            // ---------------------------------------------------------
            // 4 Move elements based on type (if configured)
            // ---------------------------------------------------------
            try {
                if (MOVED_ELM[current_type]) {
                    for (const key in MOVED_ELM[current_type]) {
                        if (Object.prototype.hasOwnProperty.call(MOVED_ELM[current_type], key)) {
                            try {
                                const targetElm = self.Panel.querySelector(key);
                                const srcElm = self.Panel.querySelector(MOVED_ELM[current_type][key]);
                                if (targetElm && srcElm) {
                                    targetElm.append(srcElm);
                                }
                            } catch (err) {
                                console.error("Error moving element:", key, err.message);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error in element moving section:", err.message);
            }

        } catch (err) {
            ref_logError("SHOW_HIDE_INPUTS", err);
        }
    };


    MultiRefModule.M_FUN.FIRE_SUMMER_NOTE = function(Panel_ELm, txt, _ = MultiRefModule) {
        try {
            let tempConfig = Object.assign({
                tabsize: 2,
                height: 45,
                focus: false
            }, _.SUMMERNOTE_CONFIG);
            const $panelInput = $(Panel_ELm);
            const $existingEditor = $panelInput.prev(".click2edit");
            if ($existingEditor.data('summernote')) {
                $existingEditor.summernote('destroy');
            }
            $existingEditor.remove();
            $panelInput.addClass("ds-none").before(`<div class="click2edit">${txt}</div>`);
            const $editor = $panelInput.prev(".click2edit");
            if (_._summernote) _._summernote.bindTarget($editor, {
                resetCache: true
            });
            $editor.summernote(tempConfig);
        } catch (err) {
            ref_logError('FIRE_SUMMER_NOTE', err);
        }
    };
    MultiRefModule.M_FUN.DISABLE_ITEMS_FIRE = function(_ = MultiRefModule) {
        try {
            const RM = _.M_CONFIG.ReverseMapping;
            const SO = _.M_CONFIG.STYLE_ORDER;
            const SP = _.M_CONFIG.STYLE_PATTERN;

            // 1. auto-detect items to disable
            /*
            const autoDisabled = Object.keys(RM).filter(key =>
                key.startsWith("‡") &&
                !/name|suffix/i.test(key) &&
                !SO.includes(key)
            );
            console.log(autoDisabled);
            */
            const autoDisabled = [];
            // 2. config based disabled (from XML) — unconditional <remove style> only
            let manualDisabled = [];
            if (SP) {
                manualDisabled = collectUnconditionalCegRemoveStyles(SP);
            }

            // 3. combine
            const finalItemToHide = [...manualDisabled, ...autoDisabled];

            // 4. disable DOM items by ReverseMapping VALUE
            finalItemToHide.forEach(key => {
                // FIXED: use mapping value
                const cls = RM[key];

                if (!cls) return;

                const elem = _.Panel.querySelector(`#${cls}, .${cls}`);
                if (!elem) return;

                elem.disabled = true;
                elem.classList.remove("highlight");
                elem.blur();
            });

        } catch (err) {
            ref_logError("DISABLE_ITEMS_FIRE", err);
        }
    };
    MultiRefModule.M_FUN.QUERY_TO_EDIT = function(self = MultiRefModule) {
        // *************
        try {
            /* beautify preserve:start */
            let { ALL_ELM, STYLE_PATTERN, FORMATTING_ITEMS, ELM_ID_MAPPING } = self.M_CONFIG;
            /* beautify preserve:end */
            self.M_SCOPE.FROM_QRY = false;
            self.M_SCOPE.EDIT_MODE = true;
            self.M_SCOPE.QRY_2_EDIT = true;
            self.ELEMENTS.EditAllBtn.classList.add("ds-none");
            var ClassObj = ALL_ELM,
                // ? |edition|publisher-loc|publisher-name|chapter-title
                items = 'year|source|article-title|comment|ext-link|pub-id|collab|etal|fpage|lpage|volume|supplement|issue',
                separator = new RegExp(items, "gi"),
                remove_items = STYLE_PATTERN.querySelector('remove') ? STYLE_PATTERN.querySelector('remove').getAttribute('style') : "" || "";
            for (let x in ClassObj) {
                // ? for loop update all filed cur ref values
                if (!x || !ClassObj[x]) return;
                let [element, Panel_ELm, x_trim] = [self.M_SCOPE.CLONE_REF.querySelector(x), self.Panel.querySelector(ClassObj[x]), x.slice(1)];
                if (ClassObj[x]) {
                    // ? handling formatting - YA - 12_SEP_2024
                    if (element && Panel_ELm && handleTextFormatting(x, element, Panel_ELm, {})) {
                        /*
                        FORMATTING_ITEMS.includes(x) && element
                        let txt = getTxt(element, {
                            Get_innerHTML: Panel_ELm.id == "title"
                        });
                        Panel_ELm.value = txt;
                        _.M_FUN.FIRE_SUMMER_NOTE(Panel_ELm, txt);
                        */
                    } else if (separator.test(x_trim) || (items.indexOf(x_trim) > -1)) {
                        if (remove_items && remove_items.includes(ELM_ID_MAPPING[x_trim])) {

                        } else if (Panel_ELm) {
                            Panel_ELm.removeAttribute('disabled');
                            Panel_ELm.classList.remove("disabled");
                        }
                    } else if (/person-group/gi.test(x_trim)) {
                        self.M_FUN.ATTACH_LISTENERS();
                    } else console.log(x);
                }
            }
        } catch (err) {
            ref_logError('QUERY_TO_EDIT', err);
        }
    };
    // ? 3328535	OUP - New PI for et al handling in references
    MultiRefModule.getEtAl = (Options, self) => {
        self = MultiRefModule;
        let {
            suffix,
            prefix,
            getPrefix,
            getSuffix,
            IsNewItem,
            checkDelim
        } = Options;
        try {
            var newItem = {
                "data-new": "s"
            };

            var insertItem = self.trackManager.getInsNode();
            insertItem.append(self.M_CONFIG["author_trim"].insert);

            const etAlItem = applyGlobalAttributes("span", "etal", {});

            // Handle prefix/suffix from getPreSuffix if provided
            let finalPrefix = prefix;
            let finalSuffix = suffix;

            if (typeof getPrefix === "boolean" && getPrefix || typeof getSuffix === "boolean" && getSuffix) {
                const affixes = self.M_FUN.getPrefixSuffix(self.Panel.querySelector("#etal"));
                finalPrefix = affixes.prefix;
                finalSuffix = affixes.suffix;
            }

            // Add prefix and suffix if defined
            if (typeof finalPrefix !== "undefined" && (getPrefix || prefix)) {
                insertItem.prepend(finalPrefix);
            }
            if (typeof finalSuffix !== "undefined" && (getSuffix || suffix)) {
                if (checkDelim) {
                    var personGroup = self.ELEMENTS.previewDiv.querySelector('.person-group');
                    var next_Item = personGroup.nextSibling;
                    if (next_Item.nodeType == Node.TEXT_NODE) {
                        let newSuffix = compareText_New(next_Item.nodeValue, finalSuffix);
                        if (newSuffix != null) finalSuffix = newSuffix;
                        /* ! 3328535: OUP - New PI for et al handling in references 15_MAY_2025  */
                        if (finalSuffix == "." && commonMethods.getClientCode({
                                format: "lower"
                            }) == "oup") {
                            finalSuffix = applyGlobalAttributes("span", "etal-pi", {});
                        }
                    }
                }
                insertItem.append(finalSuffix);
            }

            const assignAttr = IsNewItem ? {
                ...newItem
            } : {};

            $(etAlItem).append(insertItem).attr(assignAttr);
            return etAlItem;
        } catch (err) {
            ref_logError('getEtAl', err);
        }
    };

    /*MANTIS https://mantis.newgen.co/view.php?id=1767974#c81402*/
    MultiRefModule.M_FUN.APPEND_DELETE_TXT = function(TAR_ID, TAR_VAL, TARGET, Options = {}, self) {
        self = MultiRefModule;

        /* beautify preserve:start */
        let { EDIT_MODE, INSERT_MODE, CLONE_REF } = self.M_SCOPE;
        var { area, replace } = Options;
        /* beautify preserve:end */

        let IsEtal = "etal" == TAR_ID;
        var isDoiPubid = TAR_ID == "ext-link";
        var isCollab = TAR_ID == "collab";
        let IsAuthor = TAR_ID.match(/surname|givenname/);
        try {
            let [ins_dom, del_dom, prev_html, idx_based, idx, is_new_item] = [null, null, "", false, 0, false];
            if (TAR_ID.indexOf("_") > -1) {
                let split = TAR_ID.split("_");
                TAR_ID = split[0];
                idx_based = true;
                idx = parseInt(split[1]);
            }
            let CheckInsertOrder = function(node) {
                try {
                    return node && node.hasAttribute("data-insert-order") ? node.getAttribute("data-insert-order") : null;
                } catch (err) {
                    ref_logError('CheckInsertOrder', err);
                }
            };
            let appendMethod = function(targetNode, frag, targetId, Options = {}) {
                try {
                    if (targetNode && frag) {
                        if (targetId) frag.setAttribute("data-edit", targetId);
                        targetNode.append(frag);
                    }
                } catch (err) {
                    ref_logError('appendMethod', err);
                }
            };
            let find_key = commonMethods.getKeyByValue(self.M_CONFIG.ALL_ELM, "#" + TAR_ID);
            if (isDoiPubid) find_key = find_key + ",.pub-id";
            let FindElm = self.ELEMENTS.previewDiv.querySelectorAll(find_key)[idx];
            let fromGroup = TARGET.closest(".form-group");
            let InsertOrder = CheckInsertOrder(fromGroup);
            if (INSERT_MODE) {
                if (!FindElm && IsAuthor) {


                }
            }
            replace = (self.M_CONFIG['FORMATTING_ITEMS'].includes(find_key) ? true : false);
            if (IsEtal && FindElm) TAR_VAL = FindElm.textContent;
            if (FindElm && !FindElm.closest("insert")) {
                // ? CHECK ELM IN PREVIEW/INSIDE EXISTING REF
                let PREV_DEL_DOM = FindElm.querySelector("del[data-edit]");
                if (replace) {
                    PREV_DEL_DOM = false;
                    prev_html = FindElm.innerHTML;
                    FindElm.innerHTML = "";
                } else {
                    debug.log(FindElm.innerHTML);
                    if (FindElm.hasChildNodes()) {
                        let children = FindElm.childNodes;
                        for (const node of children) {
                            if (Node.TEXT_NODE == node['nodeType']) {
                                prev_html += node.nodeValue;
                                if (!self.M_FUN.COMPARE_TEXT_STRING(TAR_VAL, prev_html)) {
                                    debug.warn("CHECK_TEXT");
                                }
                                FindElm.removeChild(node);
                            } else if (Node.ELEMENT_NODE == node['nodeType']) {
                                if (node.tagName == "INSERT") {
                                    if (node.hasAttribute("data-edit")) {
                                        FindElm.removeChild(node);
                                    }
                                    if (!InsertOrder && node.hasAttribute("data-insert-order")) {
                                        InsertOrder = CheckInsertOrder(node);
                                    }
                                } else if (node.tagName != "INSERT") {
                                    if (node.tagName == "DEL") {
                                        if (node.hasAttribute("data-delete")) {
                                            node.setAttribute("data-edit", node.getAttribute("data-delete"));
                                            node.removeAttribute("data-delete");
                                            PREV_DEL_DOM = node;
                                            if (!fromGroup.hasAttribute("data-delete") && FindElm.parentElement.hasAttribute("data-delete")) {
                                                FindElm.parentElement.removeAttribute("data-delete");
                                            }
                                        }
                                    } else {
                                        prev_html += node.outerHTML;
                                        if (/em/gi.test(node.tagName)) {
                                            FindElm.removeChild(node);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (PREV_DEL_DOM) {
                    prev_html = PREV_DEL_DOM.innerHTML;
                } else if (!PREV_DEL_DOM && (prev_html || IsEtal)) {
                    // ? deleting dom
                    let track = true;
                    if (IsEtal) {
                        track = FindElm.hasAttribute("data-new") ? false : true;
                        if (TARGET.checked == false) {
                            if (track) {
                                FindElm.setAttribute("data-delete", "s");
                            } else if (!track) {
                                FindElm.remove();
                            }
                        } else if (TARGET.checked == true) {
                            track = false;
                            FindElm.removeAttribute("data-delete");
                            let prev = FindElm.previousElementSibling;
                            if (prev.nodeType == Node.ELEMENT_NODE && prev.tagName.match(/del/gi) != null) {
                                this.Remove_New_Elm(null, {
                                    collection: [prev]
                                });
                            }
                        }
                        if (prev_html == "") prev_html = FindElm.innerHTML;
                    }
                    if (track) {
                        //  del_dom = self.GetTemplate('default', {tag: 'del',frag: true,data: prev_txt,order: InsertOrder});
                        //del_dom.firstElementChild.setAttribute("data-edit", TAR_ID);
                        //FindElm.append(del_dom.firstElementChild);
                        const del_dom = self.trackManager.getDelNode();

                        if (del_dom && FindElm && TAR_ID) {
                            if (prev_html) $(del_dom).append(prev_html);

                            appendMethod(FindElm, del_dom, TAR_ID);

                            if (IsEtal) {
                                const pi = FindElm.querySelector(".pistart");
                                if (pi) del_dom.append(pi);
                            }
                        }
                    }
                }
                // ? validation new and old text
                if (prev_html == TAR_VAL) {
                    // ? restore same value
                    if (IsEtal) {
                        //if (IS_LOCAL_HOST) debugger;
                        // ! 1798040
                        if (TARGET.checked == true) {
                            // ? 3328535: OUP - New PI for et al handling in references
                            const isTextEmpty = FindElm.textContent === "";
                            const hasPi = FindElm.querySelector(".pistart");

                            if (FindElm.innerHTML === "") {
                                FindElm.innerHTML = TAR_VAL;
                            } else if (hasPi && isTextEmpty) {
                                FindElm.prepend(TAR_VAL);
                            }
                        }
                    } else {
                        FindElm.querySelectorAll(`[data-edit="${TAR_ID}"]`).forEach(element => {
                            // element.parentElement.removeChild(element);
                            commonMethods.removeEl(element);
                        });
                        FindElm.innerHTML = TAR_VAL;
                    }
                } else if (prev_html != TAR_VAL) {
                    // ? inserting dom
                    //  ins_dom = self.GetTemplate('default', {tag: 'insert',frag: true,data: TAR_VAL,order: InsertOrder});
                    ins_dom = self.trackManager.getInsNode();
                    ins_dom.innerHTML = TAR_VAL;
                    appendMethod(FindElm, ins_dom, TAR_ID);
                }
            } else {
                if (IsEtal && TARGET.checked == true) {
                    //  let insertItem = self.GetTemplate('etal', {tag: 'insert',frag: true,data: self.M_CONFIG["author_trim"].insert,dom: true,FIRST_INS_DOM: true,order: ACTION_RECORD.INS_ORDER});
                    //  insertItem.setAttribute("data-new", "s");
                    //  if (IS_LOCAL_HOST) debugger;
                    let insertItem = self.getEtAl({
                        getSuffix: !0,
                        IsNewItem: !0,
                        checkDelim: !0
                    });
                    self.ELEMENTS.previewDiv.querySelector('.person-group').append(insertItem);
                    is_new_item = false;
                } else is_new_item = true;
            }
            if (IsAuthor || isCollab) {
                // ? AuthorGroup Delimiter validation

                const authorSelector = ".person-group .string-name:not([data-delete])";
                const delimSelector = `element[first="author"][next="author"]`;
                const delimAuthor = self.M_CONFIG.DELIM.querySelector(delimSelector);
                const authorCollection = self.ELEMENTS.previewDiv.querySelectorAll(authorSelector);
                const delimObject = {
                    last: delimAuthor.getAttribute("last") || "",
                    delim: delimAuthor.getAttribute("delim") || ""
                };

                Array.from(authorCollection).forEach((node, idx, arr) => {

                    let IsLastInd = ((idx + 1) == arr.length);
                    let IsLastBeforeInd = ((idx + 2) == arr.length);
                    let delimiter = node.nextSibling;
                    let separator = delimObject[IsLastBeforeInd ? "last" : "delim"];

                    // Create insert and delete nodes
                    const insEl = self.trackManager.getInsNode();
                    const delEl = self.trackManager.getDelNode();

                    if (isCollab && IsLastInd) {
                        return lastAuthorDelim(node, {
                            check: !0,
                            move: !0,
                            process: 'collab',
                            TAR_ID
                        });
                    }

                    if (IsLastInd) return;

                    if (Node.TEXT_NODE == delimiter && delimiter['nodeType']) {
                        if (delimiter['nodeValue'] != separator) {

                            // Set attributes and append content
                            $(insEl).attr("data-auto-insert", "delim").html("").append(separator);
                            $(delEl).attr("data-auto-delete", "delim").append(delimiter['nodeValue']);

                            // Insert the new nodes after the next sibling and remove the original sibling
                            node.nextSibling.after(insEl, delEl);
                            commonMethods.removeEl(node.nextSibling);
                        }
                    } else if (Node.ELEMENT_NODE == delimiter && delimiter['nodeType']) {
                        if (delimiter.tagName == "INSERT" && delimiter['textContent'] != separator) {
                            delimiter['textContent'] = separator;
                        }
                    }
                });
            } else if (TAR_ID.match(/ext-link|pub-id|url/)) {
                if (is_new_item) {
                    // debug.log('.. new item will handle logic');
                } else if (FindElm) {
                    // TODO: "data-track-code":"link-02" - for track panel
                    FindElm.setAttribute("xlink:href", TAR_VAL);
                }
            }
            // ? 31_AUG_2023_YA/ 10_JUL_2024_YA
            if (TAR_ID.match(/surname|year|etal/)) {
                // TODO: surname will handle future
                self.M_SCOPE.UPDATE_CROSS_CITE = true;
            }
            return !is_new_item;
        } catch (err) {
            ref_logError('APPEND_DELETE_TXT', err);
        }
    };
    MultiRefModule.M_FUN.GET_NAMES_FROM_CITE = function(text, getYear, Options = {}, self) {
        self = MultiRefModule;
        try {
            let regex = getYear ? (/D+/) : (/ and |\d+|\&|,|et al./);
            return text.split(regex).map(function(item) {
                item = item.trim();
                if (item.length > 1) {
                    return item;
                }
            }).filter(Boolean);
        } catch (err) {
            ref_logError('GET_NAMES_FROM_CITE', err);
        }
    };
    MultiRefModule.M_FUN.REPLACE_ITEMS = function(names, years, cite_text, Options = {}, self, $this) {
        self = MultiRefModule;
        $this = self.M_FUN;
        try {
            let cite_names = $this.GET_NAMES_FROM_CITE(cite_text),
                return_replace_obj = {};
            [names, years].forEach((element, elmIdx) => {
                Array.from(element).forEach((node, nodeIdx) => {
                    // ? for surname validate count ref vs cite
                    if (elmIdx == 0 && (nodeIdx + 1) > cite_names.length) return;
                    let cloneNode = node.cloneNode(true),
                        delTxt = "",
                        oTxt = "",
                        nTxt = "";
                    if (node.querySelector("del")) delTxt = node.querySelector("del").textContent;
                    $(cloneNode.querySelectorAll("del")).remove();
                    nTxt = cloneNode.textContent;
                    $(cloneNode.querySelectorAll("insert")).remove();
                    oTxt = cloneNode.textContent.length == 0 ? delTxt : cloneNode.textContent;
                    if (oTxt != nTxt) {
                        let index = cite_text.split(" ").indexOf(oTxt);
                        return_replace_obj[index] = {
                            new_txt: nTxt,
                            old_txt: oTxt
                        };
                    }
                });
            });
            debug.log(return_replace_obj);
            return return_replace_obj;
        } catch (err) {
            ref_logError('REPLACE_ITEMS', err);
        }
    };
    MultiRefModule.M_FUN.UPDATE_CITATIONS = function(param1, Options = {}, self, mFunScope) {
        self = MultiRefModule;
        const {
            previewDiv
        } = self.ELEMENTS;
        const {
            REF_ID,
            CLONE_REF
        } = self.M_SCOPE;
        const {
            replace_key_alert_value
        } = self.M_CONFIG;
        try {
            const citeCollection = getCiteCollection(REF_ID);
            const alertValues = updateCitations(citeCollection, previewDiv, CLONE_REF, REF_ID, replace_key_alert_value);
            showAlertDialog(alertValues, replace_key_alert_value);
        } catch (err) {
            this.logError('UPDATE_CITATIONS', err);
        }
    };
    MultiRefModule.M_FUN.ATTACH_LISTENERS = function(Options = {}, self) {

        self = MultiRefModule;
        /* beautify preserve:start */
        let { EDIT_MODE, INSERT_MODE, FROM_QRY } = self.M_SCOPE;
        /* beautify preserve:end */

        try {
            const refInputHandler = getDebouncedRefInputHandler(self, self.M_FUN);
            const collection = getContributorRows(self.Panel, {
                container: Options.container
            });

            bindContributorRowControls(Options);


            collection.forEach((form, index, array) => {

                const rowScope = getContributorRowScope(form);
                const scopedRows = Array.from(form.parentElement.querySelectorAll(".form-group"));
                const scopedIndex = scopedRows.indexOf(form);

                form.querySelectorAll('input').forEach((inputFiled, idx, arr) => {
                    if (!form.hasAttribute("data-delete")) {
                        if (inputFiled.tagName == "BUTTON") {} else {

                            if (EDIT_MODE || INSERT_MODE || FROM_QRY) {
                                if (FROM_QRY && !Options.container) {
                                    inputFiled.classList.add("disabled");
                                    return;
                                }
                                if (INSERT_MODE) {
                                    inputFiled.oninput = DIALOG_2_HTML;
                                } else {
                                    let isCheckBox = inputFiled.type == "checkbox";
                                    if (isCheckBox) {
                                        inputFiled.onchange = self.M_FUN.HandleNewElement;
                                    } else {
                                        inputFiled.oninput = refInputHandler;
                                    }
                                    if (isCheckBox || /etal|collab/gi.test(inputFiled.id)) {

                                    } else {
                                        let isSurname = /surname/gi.test(inputFiled.id);
                                        let new_id = rowScope.idPrefix.concat(isSurname ? "surname_" : "givenname_", scopedIndex);
                                        inputFiled.id = new_id;
                                    }
                                }
                                inputFiled.classList.remove("disabled");
                            } else {
                                inputFiled.classList.add("disabled");
                            }
                        }
                    } else {
                        if (inputFiled.tagName == "BUTTON") {
                            inputFiled.setAttribute("disabled", "s");
                        }
                    }
                });
            });

        } catch (err) {
            ref_logError('MultiRefModule_ATTACH_LISTENERS', err);
        }
    };
    MultiRefModule.M_FUN.REF_AU_EDIT = async function(evt, self = MultiRefModule) {
        // ! 1798040
        try {
            let elements = self.ELEMENTS || {},
                previewDiv = elements.previewDiv,
                UpdateBtn = elements.UpdateBtn;
            if (!previewDiv || !self.Panel) {
                return;
            }
            let formGroup = this.closest('.form-group');
            if (!formGroup || !formGroup.parentElement) {
                return;
            }

            const rowScope = getContributorRowScope(formGroup);
            const previewGroup = getContributorPreviewGroup(previewDiv, rowScope.personGroupType) || previewDiv.querySelector(".person-group");

            let formGroupParent = formGroup.parentElement,
                DelAuth = formGroupParent.querySelectorAll('[data-delete]'),
                DelCount = DelAuth.length,
                InsCount = formGroupParent.querySelectorAll('[data-new]').length,
                AuthCount = formGroupParent.childElementCount,
                formGroup_Idx = Array.from(formGroupParent.children).indexOf(formGroup),
                IsLastInd = ((formGroup_Idx + 1) == AuthCount),
                initials = self.M_CONFIG.STYLE_PATTERN ? self.M_CONFIG.STYLE_PATTERN.querySelector('initials[style="‡ref_auGivenName"]') : null,
                // Initial_Pun = initials.getAttribute("punctuation"),
                // insert_Order = formGroup.dataset.insertOrder,
                etAl = self.Panel.querySelector(`[id="etal"]`),
                collectionName = previewGroup ? previewGroup.querySelectorAll(".string-name") : [],
                CloneArray = Array.from(collectionName).map((el) => el.cloneNode(true)) || [],
                current_author = collectionName[formGroup_Idx] || null,
                next_delim = current_author ? current_author.nextSibling : null,
                prev_delim = current_author ? current_author.previousSibling : null;

            debug.log(this.id);
            if (this.id.match('minus_')) {
                if (formGroup.hasAttribute("data-new") || self._INSERT_MODE) {
                    // ? remove from dialog
                    if (AuthCount > 1) {
                        if (current_author) current_author.remove();
                        formGroupParent.removeChild(formGroup);
                    }
                    if (self._INSERT_MODE) {
                        resetField(formGroup);
                        DIALOG_2_HTML({}, {});
                    }
                } else {
                    formGroup.setAttribute("data-delete", "s");
                    $(formGroup).attr("data-delete", "s").find("input").addClass("disabled");
                    if (!current_author) return;
                    current_author.setAttribute("data-delete", "s");
                    var del_dom;
                    Array.from(current_author.childNodes).forEach((node, idx, arr) => {
                        //  let del_dom = self.GetTemplate('default', {tag: 'del',frag: true});
                        del_dom = self.trackManager.getDelNode();
                        del_dom.setAttribute("data-delete", "s");
                        //  TODO HANDLE GRAP DELIMITER FOR INSIDE SUR/GIVEN NAME INSIDE

                        if (node.nodeType == Node.ELEMENT_NODE) {
                            del_dom.append(...node.childNodes);
                            node.append(del_dom);
                        } else {
                            del_dom.append(node.nodeValue);
                            node.after(del_dom);
                            commonMethods.removeEl(node);
                        }
                    });
                    // ! 1798040
                    let delim = IsLastInd ? prev_delim : next_delim;
                    if (current_author && delim) {
                        // let del_dom_1 = self.GetTemplate('default', {tag: 'del',frag: true});
                        del_dom = self.trackManager.getDelNode();
                        del_dom.append(delim);
                        current_author[IsLastInd ? "before" : "after"](del_dom);
                    }
                }
                DelAuth = formGroupParent.querySelectorAll('[data-delete]');
                DelCount = DelAuth.length;
                if (rowScope.personGroupType === "author" && etAl && etAl.checked == true) {
                    // Handle rows in formGroupParent
                    Array.from(formGroupParent.children).forEach((row, idx) => {
                        if (row.hasAttribute("data-delete") && self.au_config._after > (idx + 1)) {
                            resetField(row);
                        }
                    });

                    // Handle et al condition
                    if (self.au_config._after > (AuthCount - DelCount)) {
                        DelAuth.forEach(field => {
                            if (field.querySelectorAll('.inputDiv').length > 0) {
                                resetField(field);
                            }
                        });

                        const result = await AlertNewDialog.fire('warning', "Warning", "remove_author_remove_et_al", 'OK', '', true, {
                            override: false,
                            count: self.au_config._after
                        });

                        debug.log(result.isConfirmed ? "===removed et al===" : "===retained et al===");
                    }
                }
                if (rowScope.personGroupType === "author") AddAuthor();
            } else if (this.id.match('up_') || this.id.match('down_')) {
                let IsUp = this.id.match('up_') ? true : false;
                let Sibling_Idx = IsUp ? formGroup_Idx - 1 : formGroup_Idx + 1;
                if (formGroupParent.firstElementChild == formGroup && IsUp || !IsUp && formGroupParent.lastElementChild == formGroup) return;
                // ? FORM_MOVEMENT
                formGroup[IsUp ? "previousElementSibling" : "nextElementSibling"][IsUp ? "before" : "after"](formGroup);
                // ? PREVIEW CONTENT MOVEMENT
                collectionName.forEach(function(node, idx, arr) {
                    if (idx == Sibling_Idx || idx == formGroup_Idx) {
                        // ? FOR TRACKING PURPOSE
                        if (idx == formGroup_Idx) node.replaceWith(CloneArray[Sibling_Idx]);
                        if (idx == Sibling_Idx) node.replaceWith(CloneArray[formGroup_Idx]);
                        if (self._INSERT_MODE) DIALOG_2_HTML({}, {});
                        else CloneArray[idx].setAttribute("data-swap", "s");
                    }
                });
                debug.log("== Swapping done ==");
            } else if (this.id.match('add_')) {
                const auConfig = self.au_config || {};
                const {
                    _count,
                    _after
                } = auConfig;
                var [CanInsertAuthor, CanInsertEtAl, showAlert] = [true, false, true], current_au_count = (AuthCount - DelCount);
                const newCount = current_au_count + 1;

                if (rowScope.personGroupType === "author" && etAl && etAl.checked == true) {
                    if ((DelCount != 0 && InsCount != DelCount) || (AuthCount < self.au_config._after)) {
                        showAlert = false;
                    }
                    if (showAlert) {
                        await AlertNewDialog.fire('warning', "Warning", "Author_limitExceed", 'OK', '', true, {
                            "override": false,
                            "Mustache": true,
                            "after": self.au_config._after,
                            "current": current_au_count,
                            "count": self.au_config._count
                        });
                        return;
                    }
                }
                // ! 1798040
                if (rowScope.personGroupType === "author" && shouldUseEtal(_count, _after, AuthCount)) {
                    console.log("======>" + current_au_count + "<======");
                    await AlertNewDialog.fire('warning', "Warning", "et_al_optional", 'Yes', 'No', true, {
                        override: false,
                        current: current_au_count,
                        after: _after
                    }).then((result) => {
                        [CanInsertAuthor, CanInsertEtAl] = result.isConfirmed ? [false, true] : [false, false];
                    });
                }
                ACTION_RECORD.GET_COUNT();
                let [prefix, suffix, insertItem] = ["", "", null];
                if (CanInsertAuthor) {
                    var add_new = createContributorRowTemplate(self, rowScope.personGroupType, {
                        "index": (formGroup_Idx + 1),
                        "surname": "",
                        "givenname": "",
                        frag: true,
                        "attr": `data-new=s data-insert-order=${ACTION_RECORD.INS_ORDER}`
                    });
                    // ? FORM_ADDING
                    formGroup.after(add_new.firstElementChild);
                    // ? PREVIEW CONTENT MOVEMENT
                    insertItem = CloneArray[formGroup_Idx];
                    if (insertItem) {
                        insertItem.removeAttribute("data-delete");
                        insertItem.querySelectorAll("span[data-name],del").forEach(span => {
                            if (span.tagName == "DEL") commonMethods.iunWrap(span);
                            else span.textContent = "";
                        });
                    }
                } else if (CanInsertEtAl) {
                    // **etal** handle here
                    // ? FORM UPDATE FILED
                    etAl.checked = true;
                    if (current_au_count > self.au_config._after) {
                        Array.from(formGroupParent.children).forEach((author, idx, arr) => {
                            if ((idx + 1) > self.au_config._after) {
                                author.querySelector('[id^="minus_"]').click();
                            }
                        });
                        collectionName = previewGroup ? previewGroup.querySelectorAll(".string-name") : [];
                    }
                    if (!self.M_SCOPE.INSERT_MODE && rowScope.personGroupType === "author") {
                        insertItem = self.getEtAl({
                            getSuffix: !0,
                            IsNewItem: !0,
                            checkDelim: !0
                        });
                    }
                }
                if (insertItem && !self.M_SCOPE.INSERT_MODE) {
                    insertItem.setAttribute("data-new", "s");
                    if (collectionName[collectionName.length - 1]) collectionName[collectionName.length - 1].after(insertItem);
                }
            }
            if (self.M_SCOPE.INSERT_MODE) {
                DIALOG_2_HTML();
            } else {
                if (rowScope.personGroupType === "author") self.M_FUN.AUTHOR_GROUP_DELIM();
                self.M_SCOPE.UPDATE_CROSS_CITE = true;
                UpdateBtn.classList.remove('disabled');
            }
            self.M_FUN.ATTACH_LISTENERS();
        } catch (err) {
            ref_logError('MultiRefModule_REF_AU_EDIT', err);
        }
    };
    MultiRefModule.M_FUN.transformClass_to_Id = function(inputString, Options = {}, self) {
        self = MultiRefModule;
        try {
            // Add the dot prefix if not present
            const elmKey = inputString.startsWith('.') ? inputString : `.${inputString}`;

            // Get the intermediate value from ALL_ELM
            const intermediateValue = self.M_CONFIG.ALL_ELM[elmKey];

            if (!intermediateValue) {
                // or throw new Error(`No mapping found for ${inputString}`);
                return null;
            }

            // Remove the # from intermediate value to match ELM_ID_MAPPING keys
            const mappingKey = intermediateValue.replace('#', '');

            // Get the final mapping
            const finalValue = self.M_CONFIG.ELM_ID_MAPPING[mappingKey];

            return finalValue || null;
        } catch (err) {
            ref_logError('transformClass_to_Id', err);
        }
    }
    MultiRefModule.M_FUN.AUTHOR_GROUP_DELIM = function(el, Options = {}, self) {
        self = MultiRefModule;
        try {
            let {
                ELM_ID_MAPPING,
                DELIM,
                ALL_ELM
            } = self.M_CONFIG;
            let {
                EDIT_MODE,
                INSERT_MODE,
                FROM_QRY,
                FORCE_OPEN
            } = self.M_SCOPE;

            let previewDiv = self.ELEMENTS && self.ELEMENTS.previewDiv,
                personGroup = previewDiv ? previewDiv.querySelector(".person-group") : null,
                // nameGroup = personGroup.querySelectorAll(".string-name"),
                nodeValueObj = function(node, prefix) {
                    // Validate prefix
                    if (!['prev', 'cur', 'nxt'].includes(prefix)) {
                        throw new Error('Prefix must be either "prev" or "cur"');
                    }

                    // Capitalize first letter of prefix for camelCase
                    //  const prefixCap = prefix.charAt(0).toUpperCase() + prefix.slice(1);

                    try {
                        return {
                            [`${prefix}tag`]: (node ? node.tagName : null),
                            [`${prefix}name`]: (node && node.dataset ? (node.dataset.name) : null) || null,
                            [`${prefix}IsSpan`]: (node && node.tagName ? (node.tagName.match(/span/gi) != null) : null) || null,
                            [`${prefix}IsDelNode`]: (node && node.tagName ? (node.tagName.match(/del/gi) != null) : null) || null,
                            [`${prefix}IsInsDel`]: (node && node.tagName ? (node.tagName.match(/insert|del/gi) != null) : null) || null,
                            [`${prefix}IsDelete`]: ((node && node.nodeType == Node.ELEMENT_NODE && node.hasAttribute("data-delete")) ? true : false) || null,
                            [`${prefix}IsAuName`]: (node && node.dataset && node.dataset.name ? (node.dataset.name.match(/string-name/gi) != null) : null) || null,
                            [`${prefix}IstAl`]: (node && node.dataset && node.dataset.name ? (node.dataset.name.match(/etal/gi) != null) : null) || null,
                            [`${prefix}NodeType`]: (node ? node.nodeType : null) || null,
                            [`${prefix}NodeValue`]: (node ? node.nodeValue : null) || null,
                            [`${prefix}Node`]: (node ? node : null) || null
                        };
                    } catch (err) {
                        ref_logError('returnObj', err);
                    }
                },
                delimAuthor = DELIM ? DELIM.querySelector(`element[first="author"][next="author"]`) : null,
                delimEtAlAuthorElm = DELIM ? DELIM.querySelector(`element[first="author"][next="‡ref_etal"]`) : null,
                delim_EtAl_Author = delimEtAlAuthorElm ? delimEtAlAuthorElm.getAttribute("delim") : "";

            if (!previewDiv || !personGroup || !delimAuthor) {
                return;
            }

            Array.from(personGroup.querySelectorAll("[data-delim]")).forEach((node) => {
                if (node.getAttribute("data-delim") == "new") node.remove();
                else {
                    self.G_FUN.iunWrap(node);
                }
            });


            Array.from(personGroup.children).forEach((node, idx, arr) => {
                if (idx == 0) return;
                let [IsLastAuthor, canTrack_Insert, canTrack_Del, addNewDelim] = [false, false, false, false];

                /* beautify preserve:start */
                const { curNodeType, curNodeValue, curIsAuName, curNode, curIsDelNode, curIsDelete, curIsInsDel, curIstAl, curIsSpan } = nodeValueObj(node, "cur");
                const { nxtNodeType } = nodeValueObj(arr[idx + 1], "nxt");
                const { prevNodeType, prevNodeValue, prevNode, prevIsAuName, prevIsDelNode, prevIsDelete, prevIsInsDel } = nodeValueObj(node.previousSibling, "prev");

                /* beautify preserve:end */

                if (curIsSpan && curIsAuName) {
                    // ? author-name/et al
                    IsLastAuthor = ((arr.length - 1) === idx) || ((arr.length - 2 == idx) && (arr[arr.length - 1].className == "etal"));
                }
                let [prefix, suffix] = [delimAuthor.getAttribute(IsLastAuthor ? "last" : "delim"), ""];
                //  if (prevNodeObj) {}
                if (prevNodeType == Node.TEXT_NODE) {
                    canTrack_Insert = (prefix != prevNodeValue) ? true : false;
                    if (curIsDelete && IsLastAuthor) {
                        canTrack_Del = true;
                        if (canTrack_Insert) canTrack_Insert = false;
                    }
                    if (curNode && curNode.querySelectorAll("del").length > 0) {
                        if (curIsAuName) {
                            let gn = curNode.querySelector(".given-names");
                            let sibling = gn ? (gn.nextElementSibling ? gn.nextElementSibling : gn.previousElementSibling) : null;
                            if (sibling && sibling.tagName == "DEL" && !curNode.hasAttribute("data-delete")) {
                                commonMethods.iunWrap(sibling);
                                // after delete `etal` alter retain author-name element and remove del wrap for delim-meter
                            }
                        }
                    } else if (curIstAl) {
                        canTrack_Insert = true;
                        addNewDelim = true;
                        const nextAuthorNode = node.parentElement && node.parentElement.nextElementSibling ? node.parentElement.nextElementSibling : null;
                        var {
                            nxtNodeType: etNext,
                            nxtname
                        } = nodeValueObj(nextAuthorNode, "nxt");
                        if (etNext == 1 && nxtname == "article-title") {
                            prefix = self.M_FUN.GET_DELIM("author", "‡ref_titleArticle") || "";
                        }
                    }
                } else if (prevNodeType == Node.ELEMENT_NODE) {
                    if (prevIsAuName && (!curIsDelNode)) {
                        addNewDelim = true;
                        if (curIsAuName && prevIsDelete && prevIsAuName && IsLastAuthor) {
                            // ? single author delete delim handling
                            lastAuthorDelim(prevNode);
                        }
                    } else if (curIsAuName && prevIsDelNode) {
                        if (curIsDelete) {
                            if (IsLastAuthor) {
                                // ? LAST AUTHOR HANDLE
                                lastAuthorDelim(curNode);
                            }
                        } else {
                            let prev = prevNode.previousElementSibling;
                            if (prev && prev.nodeType == 1 && prev.hasAttribute("data-delete")) {

                            } else commonMethods.iunWrap(prevNode);
                        }
                    }
                    if (curNode && curIstAl) {
                        if (!!curNode.nextElementSibling) {
                            let next = curNode.nextElementSibling;
                            if (next && next.nodeType == Node.ELEMENT_NODE) {

                            } else if (next && next.nodeType == Node.TEXT_NODE) {

                            }
                        } else if (!!curNode.parentElement) {
                            let parent = curNode.parentElement;
                            let next = parent ? parent.nextElementSibling : null;
                            let nextSibling = parent ? parent.nextSibling : null;
                            if (!next) {
                                return;
                            }
                            let nextClass = next.className || "";
                            const ceg_id = self.M_FUN.transformClass_to_Id(nextClass);
                            const mappedId = (nextClass && ELM_ID_MAPPING[nextClass]) || ceg_id || null;
                            if (mappedId) {
                                //  if (IS_LOCAL_HOST) debugger;
                                prefix = self.M_FUN.GET_DELIM("author", '‡ref_etal') || "";
                                suffix = self.M_FUN.GET_DELIM('‡ref_etal', mappedId) || " ";
                                if (nextSibling && nextSibling.nodeType == Node.TEXT_NODE) {
                                    // ? et next collab || article title comes
                                    let currentValue = nextSibling.nodeValue;
                                    if (currentValue !== suffix) {
                                        if (suffix.endsWith(currentValue)) {
                                            suffix = suffix.substring(0, suffix.length - currentValue.length);
                                        } else {
                                            let append = compareText_New(currentValue, suffix);
                                            if (append) suffix = append;
                                        }
                                    }
                                }
                                if (next && next.nodeType == Node.ELEMENT_NODE) {

                                }
                            }
                        }
                    } else if (prevIsInsDel || curIsDelNode) {}
                }
                if (canTrack_Insert || addNewDelim || canTrack_Del) {
                    ACTION_RECORD.GET_COUNT();

                    if (canTrack_Del) {
                        // ? remove previousSibling
                        commonMethods.removeEl(node.previousSibling);
                    } else {
                        // ? 06_AUG_2024 - YA  - existing delim mismatch with config
                        if (!prevIsDelNode && prevNodeValue) {
                            const trackType = (EDIT_MODE && curIstAl) ? "etal" : "author";
                            const options = (trackType === "author") ? {
                                attr: {
                                    "data-delim": "delete"
                                }
                            } : {};

                            self.M_FUN.UpdateDelimTrack(trackType, prevNode, options);

                        } else if (curNode && curIstAl && prevIsAuName && !prevNodeValue) {
                            lastAuthorDelim(prevNode, {
                                check: !0,
                                move: !0
                            });

                        } else if (prevIsDelete && prevIsAuName && curIsAuName) {
                            // ? single author remove and add dynamic ignore adding delim
                            return;
                        }
                    }
                    // ? adding insert/delete dom before node
                    var params = {
                        "data-delim": canTrack_Del ? "delete" : "new"
                    }

                    if (EDIT_MODE && curIstAl) {
                        // ? 19-2-29 - Regression testing EDE24-0438_QA_Live_16.02.26 - TC_IDR_111

                        if (prevIsDelete) return;
                        params['data-edit'] = "etal";
                    }

                    const methodName = canTrack_Del ? "getDelNode" : "getInsNode";
                    self.trackManager[methodName](node, {
                        beforeOnly: true,
                        setAttrParams: params,
                        appendInsfragString: prefix
                    });

                }
            });
        } catch (err) {
            ref_logError('AUTHOR_GROUP_DELIM', err);
        }
    };
    MultiRefModule.M_FUN.MANDATORY_ELM_VALIDATION = function(Options = {}, self = MultiRefModule) {
        let {
            DTD_BASED,
            ReverseMapping,
            FORMATTING_ITEMS
        } = self.M_CONFIG;
        try {
            // if (IS_LOCAL_HOST) debugger;
            self.M_FUN.ASSIGN_CONFIG_INFO();
            // ? updated for opening from query reply
            self.M_CONFIG.DEFAULT_MISS_ELM.forEach((id, idx, arr) => {
                // ? highlight mandatory items based on config
                if (['‡ref_auSurname', '‡ref_auGivenName'].includes(id)) return;
                let xId = ReverseMapping[id];
                let rInput, ignoreFormat = false;

                if (xId && DTD_BASED[xId] && DTD_BASED[xId][self._refType]) {
                    let I_D = DTD_BASED[xId][self._refType];
                    if (FORMATTING_ITEMS.some((className) => className.includes(I_D))) {
                        let textEditor = self.Panel.querySelector(".note-editor.note-frame.panel.panel-default");
                        if (textEditor) rInput = textEditor.querySelector(".note-editable.panel-body");
                        if (rInput) {
                            let txtlength = getTextContentCount(rInput.innerHTML);
                            textEditor.classList[(txtlength < 5) ? "add" : "remove"]("highlight");
                            ignoreFormat = true;
                        } else {
                            rInput = self.Panel.querySelector(`[id="${xId}"]`);
                        }
                    } else {
                        rInput = self.Panel.querySelector(`[id="${xId}"]`);
                    }
                } else {
                    rInput = self.Panel.querySelector(`[id="${xId}"]`);
                }

                if (rInput && !ignoreFormat) self.M_FUN.HighLightInput(rInput);
            });
            self.Panel.querySelectorAll(".highlight:not(.note-editor)").forEach(input => {
                self.M_FUN.HighLightInput(input);
            });
            return {
                canUpdate: self.Panel.querySelectorAll(".highlight").length == 0,
                replaceVal: "",
                findVal: "",
                keyVal: "empty_field"
            };
        } catch (err) {
            ref_logError('MANDATORY_ELM_VALIDATION', err);
        }
    };
    MultiRefModule.M_FUN.AUTHOR_GROUP_VALIDATION = function(Options = {}, _ = MultiRefModule) {
        try {

            if (!_.M_CONFIG["author_trim"]) {
                let trimAuthObj = _.M_CONFIG.STYLE_PATTERN.querySelector(`trim_Ellipse[name="author"]`) || _.M_CONFIG.STYLE_PATTERN.querySelector(`trim[name="author"]`);
                if (trimAuthObj) {
                    let trimAuthAttrs = commonMethods.GET_ATTR(trimAuthObj);
                    _.M_CONFIG["author_trim"] = {
                        count: trimAuthAttrs.count || "",
                        after: trimAuthAttrs.after || "",
                        name: trimAuthAttrs.name || "author",
                        insert: trimAuthAttrs.insert || "et al",
                        style: trimAuthAttrs.style || trimAuthAttrs.RefEtalStyle || "‡ref_etal",
                        missing: trimAuthAttrs.missing || trimAuthAttrs.EtalQuery || "",
                        last: trimAuthAttrs.last || ""
                    };
                }
            }

            let {
                after,
                count,
                name,
                insert,
                style
            } = _.M_CONFIG["author_trim"],

                canInsert = true, etAl = _.Panel.querySelector(`[id="etal"]`), etAlChecked = etAl.checked ? true : false,
                formGroupParent = _.Panel.querySelector(`[id="refauthorrepeat"]`), DelAuth = formGroupParent.querySelectorAll('[data-delete]'),
                InsCount = formGroupParent.querySelectorAll('[data-new]').length, AuthCount = formGroupParent.childElementCount, AuthList = formGroupParent.querySelectorAll('.form-group:not([data-delete])'),
                first_auth = AuthList[0],
                last_auth = AuthList[AuthList.length - 1],
                DelCount = DelAuth.length,
                AuthlimitCount = (parseInt(count)),
                AuthAfterCount = (parseInt(after)),
                alert_key = 'empty_au_field',
                replace_count = AuthlimitCount,
                current_count, current_au_count = function() {
                    try {
                        DelAuth = formGroupParent.querySelectorAll('[data-delete]');
                        AuthCount = formGroupParent.childElementCount;
                        if (_.Panel.querySelector(`[id="collab"]`).value.length != 0) {
                            if (AuthCount == 0) AuthCount += 1;
                        }
                        current_count = (AuthCount - DelCount);
                        return current_count;
                    } catch (err) {
                        ref_logError('MultiRefModule_current_au_count', err);
                    }
                };
            current_count = current_au_count();
            if (current_count > 0) {
                // _.Panel.querySelectorAll('#refauthorrepeat .form-group input:not(.disabled)')
                const collection = formGroupList({
                    input_wo_dis: !0
                });
                collection.forEach((input, index, array) => {
                    if (input.value.length == 0) {
                        canInsert = false;
                    }
                    _.M_FUN.HighLightInput(input);
                });
            } else canInsert = false;
            let [AddLoop, RemoveLoop] = [false, false];
            if (!etAlChecked && (AuthlimitCount > current_count) && !canInsert) {
                // ?  without etal and less than limit
                debug.log(alert_key);
            } else if (AuthlimitCount > current_count) {
                if (!canInsert && etAlChecked) {
                    alert_key = 'remove_author_remove_et_al';
                    replace_count = AuthAfterCount;
                } else if (!etAlChecked && canInsert) {
                    // ? upto limit author
                    /* if (_.ELEMENTS.previewDiv.querySelector(".etal")) {
                        AddLoop = true;
                        alert_key = 'empty_field';
                        //replace_count = AuthlimitCount; default
                        canInsert = false;
                    } */
                } else if (etAlChecked && canInsert && AuthAfterCount != current_count) {
                    replace_count = AuthlimitCount;
                    canInsert = false;
                    if (AuthAfterCount > current_count) {
                        AddLoop = true;
                        replace_count = AuthAfterCount;
                        alert_key = 'add_et_al_add_author';
                    } else if (AuthAfterCount < current_count) {
                        RemoveLoop = true;
                        alert_key = 'add_et_al_remove_author';
                    }
                } else {
                    if (etAlChecked && AuthAfterCount == current_count) {
                        debug.log("author count matched ");
                    } else {
                        debug.warn("another condition");
                        ref_logError('AUTHOR_GROUP_VALIDATION', "another condition");
                    }
                }
            }
            if (AddLoop) {
                let loopCount = 1;
                while (replace_count != current_au_count() && loopCount < 5) {
                    last_auth.querySelector('[id^="add_"]').click();
                    loopCount++;
                }
            }
            if (RemoveLoop) {
                Array.from(formGroupParent.children).forEach((author, idx, arr) => {
                    if ((idx + 1) > after) {
                        author.querySelector('[id^="minus_"]').click();
                    }
                });
            }
            /* if (!canInsert) AlertNewDialog.fire('warning', "Warning", alert_key, 'OK', '', true, {
                override: false,
                replace: replace_count,
                find: "##"
            }); */
            return {
                canUpdate: canInsert,
                replaceVal: replace_count,
                findVal: "##",
                keyVal: alert_key,
                current: current_count,
                after: after
            };
        } catch (err) {
            ref_logError('AUTHOR_GROUP_VALIDATION', err);
        }
    };
    MultiRefModule.M_FUN.COMPARE_TEXT_STRING = function(S1, S2, Options, _ = MultiRefModule) {
        try {
            // ? https://stackblitz.com/edit/js-bera8r?file=index.js
            var COUNT = commonMethods.Duplicate_Array(S1.split(" "), S2.split(" "), {
                find: true
            });
            if (COUNT.length == 0) {
                if (S1.indexOf(S2) > -1) {
                    return true;
                } else return false;
            } else return COUNT.length > 0 ? true : false;

        } catch (err) {
            ref_logError('COMPARE_TEXT_STRING', err);
        }
    };
}(``, templateStringCollection, hintAlertMessages, elMapping));

/**
 * Compares two strings and returns removed characters and remaining text
 * @param {string} text - The source text to compare
 * @param {string} delimiter - The delimiter text to compare against
 * @returns {[string[], string]} Array containing [removed characters, remaining text]
 */
function compareText_New(text, delimiter) {
    try {
        // Input validation
        if (typeof text !== 'string' || typeof delimiter !== 'string') {
            throw new TypeError('Both arguments must be strings');
        }

        // Initialize array to store matching characters
        const removedChars = [];

        // Convert strings to arrays for easier comparison
        const textChars = [...text].reverse();
        const delimChars = [...delimiter].reverse();

        // Find matching characters
        textChars.forEach((textChar, textIndex) => {
            delimChars.forEach((delimChar, delimIndex) => {
                if (delimChar === textChar) {
                    removedChars.push(delimChar);
                }
            });
        });

        // Create remaining text by removing matched characters
        let remainingText = delimiter;
        removedChars.forEach(char => {
            remainingText = remainingText.replace(char, '');
        });

        // Reverse the remaining text back to original direction
        remainingText = [...remainingText].reverse().join('');

        return remainingText;

    } catch (error) {
        console.warn(`Text comparison error: ${error.message}`);
        ErrorLogTrace('compareText_NEW', error.message);
        // Return empty results on error
        return null;
    }
}