/* 
const APPLY_STYLE_MODULE_ID = 'ApplyStyleDialog';
const APPLY_STYLE_MODULE_CONFIG = {
    name: 'ApplyStyleModule',
    type: 'ondemand',
    path: './apply_style/index.js',
    templatePath: './apply_style/template.html',
    dependencies: [],
    wrapping: true,
    group_name: 'ApplyStyleDialog',
    groupOrder: 1160,
    commands: [],
    onEditorReady(editor) {
        if (window.APPLY_STYLE_MODULE && typeof window.APPLY_STYLE_MODULE.editorListener === 'function') {
            window.APPLY_STYLE_MODULE.editorListener(editor);
        } else {
            moduleSystem.getModule('ApplyStyleDialog').then((mod) => {
                window.APPLY_STYLE_MODULE = mod;
                if (mod && typeof mod.editorListener === 'function') mod.editorListener(editor);
            });
        }
    }
};
async function openApplyStyleDialog() {
    try {
        if (window.APPLY_STYLE_MODULE && typeof window.APPLY_STYLE_MODULE.show === 'function') {
            window.APPLY_STYLE_MODULE.show();
            return;
        }
        if (typeof moduleSystem === 'undefined') return;
        const mod = await moduleSystem.getModule('ApplyStyleDialog');
        window.APPLY_STYLE_MODULE = mod;
        if (mod && typeof mod.show === 'function') mod.show();
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('openApplyStyleDialog', err.message);
    }
}

function analyzeTitleLabels(heasdsList) {
    try {
        const mapped = Array.from(heasdsList).map((node) => {
            try {
                const titleNode = $(node).children('.title')[0];
                const label = $(titleNode).attr('data-label');
                const hasUsername = $(titleNode).is('[data-username]') || $(node).is('[data-username]');
                const skip = !label && hasUsername;

                const isRoman = commonMethods.isRomanNumeral(label);
                const isAlpha = /^[a-zA-Z]+$/.test(label || '');
                const isNumeric = /^\d+$/.test(label || '');
                // Determine pattern type
                let pattern = "numeric";
                if (isRoman) {
                    pattern = "roman";
                } else if (isAlpha) {
                    pattern = "alphabetical";
                }

                return {
                    node: titleNode,
                    label,
                    skip,
                    isRoman,
                    isAlpha,
                    isNumeric,
                    pattern
                };
            } catch (innerErr) {
                console.warn('Error mapping node:', innerErr.message);
                return {
                    node: null,
                    label: null,
                    skip: true,
                    isRoman: false,
                    isAlpha: false,
                    isNumeric: false,
                    pattern: "numeric"

                };
            }
        });

        const allHaveLabels = mapped.every(item => item.skip || !!item.label);

        const labeledCount = mapped.filter(item => item.skip || !!item.label).length;
        const majorityLabeled = labeledCount > mapped.length / 2;


        const allAreRoman = mapped.every(item => item.skip || item.isRoman);
        const allAreAlpha = mapped.every(item => item.skip || item.isAlpha);


        const patternCount = mapped.reduce((acc, item) => {
            if (!item.skip && item.label) {
                acc[item.pattern] = (acc[item.pattern] || 0) + 1;
            }
            return acc;
        }, {});

        let majorPattern = "numeric";
        let maxCount = 0;
        for (const [pat, count] of Object.entries(patternCount)) {
            if (count > maxCount) {
                maxCount = count;
                majorPattern = pat;
            }
        }

        return {
            mapped,
            allHaveLabels,
            isRoman: allAreRoman,
            isAlpha: allAreAlpha,
            majorityLabeled,
            pattern: majorPattern
        };
    } catch (err) {
        console.warn('analyzeTitleLabels failed:', err.message);
        ErrorLogTrace('analyzeTitleLabels', err.message);
        return {
            mapped: [],
            allHaveLabels: false,
            majorityLabeled: false,
            isRoman: false,
            isAlpha: false,
            pattern: "numeric"
        };
    }
}

var get_lab_text = function(root, Options = {}) {
    try {
        if (Options.title) return getTxt(root.querySelector(".title")) || ""
        return getTxt(root.querySelector('.label')) || $(root).children('.title').attr('data-label') || "";
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('get_lab_text', err.message);
    }
}
var getPrefixBooks = function(SEC, CUR_LEVEL) {
    var returnObject = {
        first_level_lab: "",
        chapter_lab: "",
        prefix: "",
        lab_count: 0,
        all_count: 0
    }
    try {
        let chap_root = SEC.closest('.book-part'),
            titleGroup = chap_root.querySelector('.book-part-meta .title-group'),
            chap_label = get_lab_text(titleGroup),
            first_lvl_arr = CUR_LEVEL == 1 ? chap_root.querySelectorAll(`div.body div.sec[data-levels="${CUR_LEVEL}"]`) : SEC.querySelectorAll(`div.sec[data-levels="${CUR_LEVEL}"]`),
            sibling_lvl_arr = CUR_LEVEL == 1 ? [] : SEC.parentElement.querySelectorAll(`div.sec[data-levels="${CUR_LEVEL}"]`),
            first_lvl_div = first_lvl_arr[0],
            first_lvl_lab = get_lab_text(first_lvl_div),
            prefix = "";
        if (chap_label && first_lvl_lab) {
            if (chap_label != first_lvl_lab) {
                let chap_split = "";
                let head_lab_split = first_lvl_lab.split(".");
                let isPrefixThere = head_lab_split.length > 1;
                if (/[a-zA-Z]/gi.test(chap_label)) {
                    if (/\s/.test(chap_label)) chap_split = chap_label.split(" ");
                    if (chap_split[chap_split.length - 1] == head_lab_split[0]) {
                        // ? Chapter lable = Part 1, head label = 1.1
                        prefix = head_lab_split[0];
                    }
                } else prefix = isPrefixThere ? head_lab_split[0] : "";
            }
        }
        // ? finally assigning
        returnObject.root = chap_root;
        returnObject.sub_levels = first_lvl_arr;
        returnObject.first_level_lab = first_lvl_lab;
        returnObject.chapter_lab = chap_label;
        returnObject.prefix = prefix;
        returnObject.all_count = first_lvl_arr.length;
        returnObject.lab_count = Array.from(first_lvl_arr).reduce((accumulator, sec) => {
            if (!returnObject[CUR_LEVEL]) returnObject[CUR_LEVEL] = {}
            let lab = get_lab_text(sec);
            returnObject[CUR_LEVEL][sec.id] = {
                lab: lab,
                label: lab,
                title: get_lab_text(sec, {
                    title: !0
                })
            }
            return accumulator + (lab ? 1 : 0);
        }, 0);
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('getPrefixBooks', err.message);
    } finally {
        return returnObject;
    }
}
async function headLvlMod(type, editor, $this = window.this) {

    if (window.paraLock && window.paraLock.getLockedElementsByOthers) {
        const lockedInfo = window.paraLock.getLockedElementsByOthers();
        if (lockedInfo.byOthers.length > 0) {
            TOASTER_ALERT('ErrorReStoreForCollab', {
                type: 'warning'
            });
            return;
        }
    }

    // ? Apply Style/ Head level Change Start 
    var headlvlAppend = function(node, nodeList, level) {
        // ? node = Curr Node || nodeList = Appending Collation || level = Head-level
        Array.from(nodeList).forEach(elm => {
            if (/sec/gi.test(elm.className) && level == (elm.getAttribute('data-levels'))) {
                // ? here append subheads in same div
                $(node).append(elm);
            }
        });
    };
    var ChangeLvlSubhead = function(node) {
        Array.from(node).forEach((elm, idx, arr) => {
            if (elm.className != undefined && elm.className == 'sec') {
                var [oLvl, childCollection, _childHeadLvl] = [$(elm).attr('data-levels'), $(elm).children(), $(elm).find('div.sec')];
                var nlvl = parseInt(oLvl) - 1;
                $(elm).attr({
                    'old-lvl': oLvl,
                    'data-levels': nlvl
                }).find('div.title').attr({
                    'old-lvl': oLvl,
                    'data-levels': nlvl
                });
                if (childCollection.length > 0 && _childHeadLvl.length > 0) {
                    ChangeLvlSubhead(childCollection);
                }
            }
        });
    };
    // ? Start Here
    if (!editor) editor = GlobalEditor;
    AutoSaveBool = false;
    var _curSel = editor.getSelection().getStartElement(),
        hSec = _curSel.$.closest('div.sec'),
        hWhile = 0;
    while ((hSec.className != 'sec')) {
        // ? Get Ascent div element here until title
        hSec = hSec.closest('div');
        if (hWhile == 10) {
            break;
        } else {
            hWhile++;
        }
    }
    // if (IS_LOCAL_HOST) debugger;
    var [hSecId, gData, REPLACE_DIV, REPLACE_DIV_ID] = [hSec.getAttribute('id'), editor.getData(), false, false];
    if (EDITOR_CURSOR.CUR_CHAPTER) {
        gData = EDITOR_CURSOR.CUR_CHAPTER_DATA;
        REPLACE_DIV = true;
        REPLACE_DIV_ID = EDITOR_CURSOR.CUR_CHAPTER.id;
    }
    $($this.iDOM).html('').append(gData);
    var _curElm = $this.iDOM.querySelector('[id="' + hSecId + '"]'),
        _curElmLvl = parseInt(_curElm.getAttribute('data-levels')),
        _parElm = _curElm.parentNode,
        _parElmLvl = parseInt(_parElm.getAttribute('data-levels')),
        _nxtElm = $(_curElm).nextAll(),
        _prvElm = $(_curElm).prev(),
        _childElm = $(_curElm).children(),
        _childHeadElm = $(_curElm).find('div.sec'),
        _nElm = document.createElement('div'),
        _nLvl;
    // ? TODO  _childHeadElm update later for DOC_DTD wise
    // ? Here move the elements as per request    
    if (type == UP || type == DOWN) {
        if (type == UP) {
            if (_nxtElm.length > 0) {
                // ? node = Curr Node || nodeList = Appending Collation || level = Head level t cross-check
                headlvlAppend(_curElm, _nxtElm, _curElmLvl);
            }
            if (_childElm.length > 0) {
                // ? Changing the sub head level attribute
                ChangeLvlSubhead(_childElm);
            }
            _nLvl = _parElmLvl;
        } else {
            _nLvl = _curElmLvl + 1;
            // ? node = Curr Node || nodeList = Appending Collation || level = Head level to cross-check
            if (_childElm.length > 0 && _childHeadElm.length > 0) {
                headlvlAppend(_nElm, _childElm, _nLvl);
            }
        }
        // ? bug fixed at 22-mar-2022
        $(_curElm).attr({
            'old-lvl': _curElmLvl,
            'data-levels': _nLvl,
            'data-head-level': 'changed',
            'data-track-code': 'head-style-01',
            'data-username': USER_INFO.MAIL_ID,
            'data-rolename': ((USER_INFO.IS_CO_ROLE ? 'Co-' : '') + USER_INFO.ROLE_NAME),
            'data-time': (new Date()).getTime()
        }).children('div.title').attr({
            'old-lvl': _curElmLvl,
            'data-levels': _nLvl
        });
        if (type == UP) {
            $(_curElm).insertAfter(_parElm);
        } else {
            $(_nElm).prepend(_curElm);
            $(_prvElm).append(_nElm.innerHTML);
        }
    } else if (type == ADD || type == DELETE) {
        let _confirm = (await IMPACT_ALERT((type == ADD) ? 'headleveladd001' : 'headleveldel002'));
        if (_confirm) {
            if (type == ADD) {
                let first_Child_Id = $(_parElm).find('div.sec:eq(0)').attr('id');
                let Is_first_Child = (first_Child_Id == hSecId) ? (true) : (false);
                let _mySting = CreateStringHead(_curElmLvl, Is_first_Child);
                $(_mySting).insertBefore($(_curElm));
            } else if (type == DELETE) {

            }
        }
    }
    var divList = [],
        prefix = "",
        suffix = "";
    if (!$this._IsNumberHeadBool) $this._IsNumberHeadBool = $this.iDOM.querySelectorAll($this.M_SCOPE.LABEL_SELECTOR).length > 0 ? true : false;
    if (!IS_JOURNAL) {
        let rObj = getPrefixBooks(_parElm, 1);
        prefix = rObj.prefix;
        divList = rObj.sub_levels;
        $this._IsNumberHeadBool = prefix ? !0 : !1;
    }
    if ($this._IsNumberHeadBool) {
        // ? YA 22_MAR_-23 -NUMBER HEADING LABEL HANDLE
        if (IS_JOURNAL) divList = $this.iDOM.querySelectorAll('div.body div.sec[data-levels="1"]:not([sec-type="Back_Matter"],[sec-type="supplementary-material"])');
        prefix = (prefix.length > 0 ? prefix + (prefix.indexOf(".") > -1 ? '' : '.') : prefix);
        $this.RE_STRUCTURE(divList, prefix  ); // , suffix 
    }
    _IsDirty = false;
    SET_DATA.setNewData($this.iDOM, {
        DOM_Empty: true,
        reGenerateAll: true,
        replace_div: REPLACE_DIV,
        replace_div_id: REPLACE_DIV_ID
    }, hSecId);
    AutoSaveBool = true;
    editor.focus();
}

function registerApplyStyleContextMenu() {
    if (typeof CKEDITOR === 'undefined') return;
    CKEDITOR.on('instanceReady', (ev) => {
        if (!ev.editor.contextMenu) return;
        ev.editor.contextMenu.addListener(function(element, selection, elementPath) {
            const editor = selection.root ? selection.root.editor : ev.editor;
            if (window.paraLock && typeof window.paraLock._isElementLocked === 'function') {
                const isLocked = window.paraLock._isElementLocked(element, {
                    check_closest: true,
                    alertKey: 'ErrorLockedParaEdit'
                });
                if (isLocked) return {};
            }
            const mod = window.APPLY_STYLE_MODULE;
            if (!mod || !mod.M_CONFIG || !mod.M_CONFIG.SHOW_CONTEXT_GROUP || !EDITOR_CURSOR.IS_HEAD_TITLE) return;
            const CUR_SEC = element.$.closest('div.sec');
            if (!CUR_SEC) return;
            const HEAD_GROUP_R = {};
            const CURSOR_LVL = parseInt(CUR_SEC.getAttribute('data-levels'));
            if (CUR_SEC.hasAttribute('data-levels') && !$(CUR_SEC).parent().hasClass('abstract')) {
                editor.addMenuItems({
                    ADD_LVL: {
                        label: 'Add Section',
                        command: 'STYLE_FIRE_ADD',
                        group: 'headgroup',
                        icon: '../assets/images/svg/ContextMenu/Add.svg',
                        order: 111
                    },
                    HIGH_LVL: {
                        label: 'Head ' + (CURSOR_LVL - 1),
                        command: 'STYLE_FIRE_UP',
                        group: 'headgroup',
                        icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
                        order: 112
                    },
                    CUR_LVL: {
                        label: 'Head ' + CURSOR_LVL,
                        command: 'STYLE_FIRE_CUR_LVL',
                        group: 'headgroup',
                        icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
                        order: 113
                    },
                    LOW_LVL: {
                        label: 'Head ' + (CURSOR_LVL + 1),
                        command: 'STYLE_FIRE_DOWN',
                        group: 'headgroup',
                        icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
                        order: 114
                    },
                    DEL_LVL: {
                        label: 'Delete Section',
                        command: 'STYLE_FIRE_DELETE',
                        group: 'headgroup',
                        icon: '../assets/images/svg/ContextMenu/MoveAfter.svg',
                        order: 115
                    }
                });
                HEAD_GROUP_R.CUR_LVL = CKEDITOR.TRISTATE_DISABLED;
                if (CURSOR_LVL != 1) HEAD_GROUP_R.HIGH_LVL = CKEDITOR.TRISTATE_OFF;
                if (CURSOR_LVL < mod.M_CONFIG.HEAD_LIMIT) HEAD_GROUP_R.LOW_LVL = CKEDITOR.TRISTATE_OFF;
            }
            return HEAD_GROUP_R;
        });
    });
}
document.addEventListener('DOMContentLoaded', () => {
    registerApplyStyleContextMenu();
    ContextHelpers.registerOnReady(APPLY_STYLE_MODULE_ID, APPLY_STYLE_MODULE_CONFIG);
});

*/