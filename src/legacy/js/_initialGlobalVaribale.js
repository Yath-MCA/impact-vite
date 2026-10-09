(function (global) {

    'use strict';

    /* ! DONT REMOVE */

    global.delDom = undefined;
    global.insDom = undefined;

    /* ! DONT REMOVE 

        IT WILL REFLECT IN WSC JS (Spell check in server js rendering)

    */

    global.DOC_INFO = new Map();

    global.IS_ONLINE = !!navigator.onLine;

    global._CanClose = false;

    global.AutoSaveBool = true;
    global.setDataBool = true;
    global._IsDirty = false;
    global.IS_JOURNAL = false;
    global.GlobalEditor = null;
    global.DOC_ID = null;
    global.DOC_DTD = null;
    global.content_file_sn = null;
    global.lite_userId = null;

    /* ===== Basic Constants ===== */

    global.BITS = 'bits';
    global.JATS = 'jats';
    global.LEFT_MOVE = 'left';
    global.RIGHT_MOVE = 'right';
    global.SWAP = 'swap';
    global.UP = 'up';
    global.DOWN = 'down';

    global.ADD = 'add';
    global.DELETE = 'delete';
    global.LINK = 'link';
    global.ACCEPT = 'lite-acceptone';
    global.REJECT = 'lite-rejectone';

    global.CUT = 'cut';
    global.PASTE = 'paste';
    global.P = 'p';

    global.I_rGEN_PDF = "i_track_pdf";
    global.I_rGEN_XML = "xml";
    global.EMPTY_SPAN = '<span style="display: none;">&nbsp;</span>';

    global.getTocTitle = [
        "table-wrap", "fig", "sec", "ack",
        "ref-list", "front", "book-part", "fn-group", "supplementary-material"
    ];

    global.SAVE_SPIN = '<div class="spinner-border iSpin_border" role="status"></div>';

    /* ===== Complex Globals ===== */

    global.DEMO_CLIENT = null;
    global.I_CONFIG = null;
    global.STYLE_CONFIG = null;
    global.SET_DATA = null;
    global.GENERATE = null;
    global.FIG_CAP = null;
    global.TAB_CAP = null;
    global.LOCAL_DATA = null;
    global.ImpactStyle = null;
    global.DOC_TYPE_CONFIG = null;
    global.SHORT_II_TITLE = null;
    global.SHORT_TITLE = null;
    global.I_CKE_FRAME = null;
    global.I_CLIENTREACT = null;

    global.IS_NEW_CONFIG = true;

    /* ===== Object Containers ===== */

    global.USER_INFO = {};
    global.userslist = {};
    global.Fileslist = {};
    global.PAGE_ID_MAP = {};
    if (typeof global.commonfn === "undefined") {
        global.commonfn = {};
    }
    global.MODULE_LIST = {};
    global.messageObjconc = {};
    global.pagenames = {};
    global.HeadLevelLabel = {};
    global.SHARED_KEY = {};
    global.ROLE_LIST_DB = {};

    /* ===== commonMethods ===== */

    global.commonMethods = {
        removeHiddenItems: {
            copy: '[data-pistart], [data-name="aff"][data-label], [data-name="fn"][data-label], [data-name="caption"][data-label]',
            clean: 'del, [style="display: none;"], .journal-meta, .article-meta .article-id, .article-meta .pub-date, .article-meta .history, .article-meta .permissions, .article-meta .volume, .article-meta .issue, .article-meta .fpage, .article-meta .lpage, .article-categories .subj-group[subj-group-type="category-taxonomy-collection"], .article-id, [data-class="ckcommentsfull"], [abstract-type="teaser"]',
            copy_clean: 'del, .pub-date, .history, .permissions, .volume, .issue, .fpage, .lpage'
        },

        invalidExtensions: /(\.exe|\.java|\.jar|\.mrc|\.msi|\.pif|\.sys|\.bat|\.cmd|\.sh|\.zsh|\.bash|\.dash|\.dll|\.dos|\.js|\.jse|\.scr|\.vb|\.vbe|\.vsmacros|\.com|\.ps1|\.ps1xml|\.ps2|\.ps2xml|\.psc1|\.psc2|\.msh1|\.msh1xml|\.msh2|\.msh2xml|\.ksh|\.csh|\.mshxml|\.msp|\.os2|\.prg|\.ws|\.scf|\.sct)$/i
    };

    /* ===== TRACK CONFIG ===== */

    global.TRACK_CONFIG = {
        insert: { class: "ice-ins ice-cts", "data-cid": "" },
        del: { class: "ice-del ice-cts", "data-cid": "" }
    };

    global.FORMAT_EQ_TEXT = {
        em: "italic",
        strong: "bold",
        u: "underline",
        s: "strike",
        sup: "superscript",
        sub: "subscript",
        sc: "smallcaps"
    };

    global.getMaxTextLength = {
        CrossCitation: { min: 95, max: 100 },
        ToolTip: { min: 105, max: 110 },
        toptitle: { min: 135, max: 140 },
        attach_file: {
            default: { min: 7, max: 15 },
            full: { min: 24, max: 30 },
            panel: { min: 14, max: 20 },
            ShowTrackPanel: { min: 37, max: 43 },
            panel_upload: { min: 15, max: 21 },
            dialog: { min: 35, max: 39 },
            floatPanel: { min: 20, max: 26 }
        }
    };

    global.browserKeyStrokes = {
        chrome: { superscript: 187, subscript: 187 },
        firefox: { superscript: 61, subscript: 61 }
    };

    global.SEARCH_KEY = {
        tab: ".table-wrap",
        fig: ".fig",
        k: ".kwd",
        kg: ".kwd-group",
        abbrg: ".def-list",
        abbr: ".def-item",
        abs: ".abstract",
        fng: ".fn-group",
        fn: ".fn",
        cor: ".corresp",
        an: ".author-notes",
        cg: ".contrib-group",
        df: ".disp-formula",
        if: ".inline-formula",
        ref: ".ref-list",
        ext: ".disp-quote"
    };

    global.getDataRecord = { "tbl": "Fileslist", "asyn": "1", "find": { "status": "active", "docid": "", "projecttitle": { "$exists": true } }, "length": 1, "sort": {}, "filter": ["projecttitle", "id", "status", "dtd", "client", "type"] };
    global.iREF_SCOPE = { type_base_order: { journal_article: ["author", "title", "journal", "year", "volume", "issue", "page", "doi"], book_content: ["author", "year", "journal", "source", "volume", "page"], webpage: [], conf: [], other: [] }, generic_classification: { jats: { journal_article: { author: { surname: "surname", fname: "given-names", etal: "etal" }, title: "article-title", journal: "source", year: "year", volume: "volume", issue: "issue", comment: "comment", page: { 0: "fpage", 1: "lpage" }, "pub-id": "pub-id", prefix: {}, sufix: {} }, book_content: { author: { surname: "surname", "given-name": "given-names", etal: "etal" }, year: { prefix: "(", suffix: ")" }, "article-title": "article-title", source: "source", volume: "volume", page: { fpage: "fpage", lpage: "lpage" } }, webpage: {}, conf: {}, other: {} } }, citation_order: "", IS_NAME_DATE: !1, J_First_ID: "CIT0000" };
    global.SPL_OBJS = { space: " ", comma: ",", dot: ".", dot_: ". ", hyphen: "-", ndash: "–", mdash: "—", apos: "'", lrp: "(", rrp: ")", doi: "doi:", Doi: "Doi:", colon: ":", semicolon: ";", semicolon_: "; ", pp: "pp. ", in: "In ", ellipse: ". . .", _and_: " and ", comma_: ", " };
    global.CitationConfig = {
        books: {
            Figure: { sentence: "Figure ", "ref-type": "fig", dircite: { single_prefix: "Figure ", double_prefix: "Figures ", doublesep: " and ", multiple_prefix: "Figures ", multiplesep: "–" }, indircite: { single_prefix: "Figure ", double_prefix: "Figures ", doublesep: " and ", multiple_prefix: "Figures ", multiplesep: "–", openwrap: "(", closewrap: ")" }, IdPatteren: "FIGn-fig" },
            Picture: { sentence: "Picture ", "ref-type": "fig", dircite: { single_prefix: "Picture ", double_prefix: "Pictures ", doublesep: " and ", multiple_prefix: "Pictures ", multiplesep: "–" }, indircite: { single_prefix: "Picture ", double_prefix: "Pictures ", doublesep: " and ", multiple_prefix: "Pictures ", multiplesep: "–", openwrap: "(", closewrap: ")" }, IdPatteren: "FIGn-fig" },
            Map: { sentence: "Map ", "ref-type": "fig", dircite: { single_prefix: "Map ", double_prefix: "Maps ", doublesep: " and ", multiple_prefix: "Maps ", multiplesep: "–" }, indircite: { single_prefix: "Map ", double_prefix: "Maps ", doublesep: " and ", multiple_prefix: "Maps ", multiplesep: "–", openwrap: "(", closewrap: ")" }, IdPatteren: "FIGn-fig" },
            Image: { sentence: "Imgae ", "ref-type": "fig", dircite: { single_prefix: "Imgae ", double_prefix: "Imgaes ", doublesep: " and ", multiple_prefix: "Imgaes ", multiplesep: "–" }, indircite: { single_prefix: "Imgae ", double_prefix: "Imgaes ", doublesep: " and ", multiple_prefix: "Imgaes ", multiplesep: "–", openwrap: "(", closewrap: ")" }, IdPatteren: "FIGn-fig" },
            Audio: { sentence: "Audio ", "ref-type": "fig", dircite: { single_prefix: "Audio ", double_prefix: "Audios ", doublesep: " and ", multiple_prefix: "Audios ", multiplesep: "–" }, indircite: { single_prefix: "Audio ", double_prefix: "Audios ", doublesep: " and ", multiple_prefix: "Audios ", multiplesep: "–", openwrap: "(", closewrap: ")" }, IdPatteren: "FIGn-fig" },
            video_clip: { sentence: "Video Clib", "ref-type": "fig", dircite: { single_prefix: "Video Clib ", double_prefix: "Video Clibs ", doublesep: " and ", multiple_prefix: "Video Clibs ", multiplesep: "–" }, indircite: { single_prefix: "Video Clib ", double_prefix: "Video Clibs ", doublesep: " and ", multiple_prefix: "Video Clibs ", multiplesep: "–", openwrap: "(", closewrap: ")" }, IdPatteren: "FIGn-fig" },
            Table: { sentence: "Table ", "ref-type": "table", dircite: { single_prefix: "Table ", double_prefix: "Tables ", doublesep: " and ", multiple_prefix: "Tables ", multiplesep: "–" }, indircite: { single_prefix: "Table ", double_prefix: "Tables ", doublesep: " and ", multiple_prefix: "Tables ", multiplesep: "–", openwrap: "(", closewrap: ")" }, IdPatteren: "table-wrap" },
            Sections: { sentence: "Section ", "ref-type": "section", dircite: { single_prefix: "Section ", double_prefix: "Sections ", doublesep: " and ", multiple_prefix: "Sections ", multiplesep: "–" }, indircite: { single_prefix: "Section ", double_prefix: "Sections ", doublesep: " and ", multiple_prefix: "Sections ", multiplesep: "–", openwrap: "(", closewrap: ")" }, IdPatteren: "sec-" },
            Reference: { sentence: "Reference ", "ref-type": "bibr", dircite: { separate: ", ", multiplesep: " and " }, indircite: { separate: ", ", multiplesep: " and ", openwrap: "(", closewrap: ")" }, IdPatteren: "ref" }
        }
    };

    /* ===== Session ===== */

    global.CONFIG_LOAD = false;
    global.NEW_SESSION_ID = Math.floor(10000000 + Math.random() * 90000000);
    global.OPEN_TIME = Date.now();
    global.BC = null;

})(window);
