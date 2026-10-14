/**
 * PiModule — migrated from ProcessingInstruction_GeneratePDF_Module.js
 */
class PiModule extends BaseModule {
    constructor(name = 'PiModule', errorTracker = null, options = {}) {
        super(name, errorTracker, options);
        this._id = 'PI_MODULE';
        this.canUnmountComponentWhileClose = true;
        this.Shown_FirstTime = true;
        this.LAST_GENERATION_ARR = [];

        // this.EDIT: false,
        // this.EDIT_ID: null
        this._bindModuleMethods();
        this._state = {
            editMode: false,
            editId: null
        };
    }


    reStoreDefault() {
        try {
            Array.from(this.Panel.querySelectorAll('.listEntry, .label-item, .edit-item')).forEach((list) => {
                if (list.classList.contains('listEntry')) {
                    list.removeAttribute('checked');
                    list.removeAttribute('disabled');
                } else if (list.className.match(/label-item|edit-item/)) {
                    list.remove();
                }
            });
            if (this.elements && this.elements.SAVE_BTN) {
                this.elements.SAVE_BTN.setAttribute('disabled', '');
            }
            this._state = {
                editMode: false,
                editId: null
            };

        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('reStoreDefault', err.message);
        }
    }
    getEl(node) {
        try {
            this.Panel.querySelectorAll('.label-item').forEach((el) => {
                const pi_id = el.id.split('_')[0];
                node.querySelectorAll(`[pi_id="${pi_id}"]`).forEach((pi) => pi.remove());
                const PI_Node = document.createElement('span');
                commonMethods.setAttr(PI_Node, {
                    class: 'format',
                    'data-name': 'format',
                    'data-user-pi-box': el.textContent.toLocaleLowerCase(),
                    pi_id: pi_id,
                    text: '&nbsp;'
                });
                node.appendChild(PI_Node);
            });
        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('getPI_Nodes', err.message);
        }
    }
    fire() {
        try {
            const {
                editMode,
                editId
            } = this._state;
            if (editMode && editId) {
                const P_I = GlobalEditor.document.getById(editId).$;
                const Clone_PI = P_I.cloneNode(true);
                this.getEl(Clone_PI);
                $(Clone_PI).attr({
                    'data-track-code': 'pi-02',
                    'data-username': USER_INFO.MAIL_ID,
                    'data-rolename': USER_INFO.ROLE_NAME,
                    'data-time': Date.now()
                });

                $(P_I).replaceWith(Clone_PI);
            } else {
                const ELM_PI = new CKEDITOR.dom.element('span');
                const uniqueId = s4();
                ELM_PI.setAttributes({
                    'data-class': 'pi_info',
                    'data-label': 'PI',
                    'id': uniqueId
                });
                this.getEl(ELM_PI.$);
                GlobalEditor.insertElement(ELM_PI);
                var el = GlobalEditor.document.getById(uniqueId);
                if (el) el.setAttribute('data-track-code', 'pi-01');

            }
            this.reStoreDefault();
            this.closeDialog();
        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('fire', err.message);
        }
    }
    addClickRule() {
        try {
            const IsNoChecked = this.Panel.querySelectorAll('.listEntry[checked]').length === 0;
            Array.from(this.Panel.querySelectorAll('.listEntry')).forEach((sibling) => {
                if (!sibling.hasAttribute('checked')) {
                    const IsMultiParent = sibling.parentElement.hasAttribute('multiselector');
                    const IsChildCheck = IsMultiParent && sibling.parentElement.querySelectorAll('[checked]').length !== 0;
                    sibling[IsNoChecked ? 'removeAttribute' : ((!IsChildCheck) ? 'setAttribute' : 'removeAttribute')]('disabled', '');
                }
            });
            this['elements'].SAVE_BTN[IsNoChecked ? 'setAttribute' : 'removeAttribute']('disabled', '');
        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('addClickRule', err.message);
        }
    }
    removeItem(list) {
        try {
            list.removeAttribute('checked');
            const editItem = document.getElementById(list.id + '_edit_par');
            const labelItem = document.getElementById(list.id + '_label');
            if (labelItem) labelItem.remove();
            if (editItem) editItem.remove();
            this.addClickRule();
        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('removeItem', err.message);
        }
    }

    _bindModuleMethods() {
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((key) => {
            if (key !== 'constructor' && typeof this[key] === 'function') {
                this[key] = this[key].bind(this);
            }
        });
    }

    initLoop(param1) {
        const self = this;

        try {
            self['elements'] = {
                INPUT: self.Panel.querySelector('#inputDiv'),
                EDIT: self.Panel.querySelector('#inputEditDiv'),
                listGroup: self.Panel.querySelector('#PI_list'),
                SAVE_BTN: self.Panel.querySelector('.submit_btn'),
                CLR_BTN: self.Panel.querySelector('.cancel_btn')
            };

            Array.from(self.Panel.querySelectorAll('.listEntry')).forEach(el => {
                el.addEventListener('click', function() {
                    try {
                        if (this.hasAttribute('disabled')) return;
                        var elPar = el.parentElement,
                            id = this.id,
                            txtValue = this.textContent,
                            edit_id = id + '_edit',
                            edit_Par_id = id + '_edit_par',
                            label_id = id + '_label',
                            label_piVal = id + '_label_piVal',
                            IsEditable = elPar.id != 'Break_list';
                        if (!(this.hasAttribute('checked'))) {
                            this.setAttribute('checked', '');
                            var piValue = txtValue.split(' ').pop(),
                                split = txtValue.split(' '),
                                text = IsEditable ? (split.slice(0, -1).join(' ')) : (txtValue),
                                EditString = IsEditable ? (` <span id="${label_piVal}">${piValue}</span><i class="fas fa-times"></i>`) : ('<i class="fas fa-times"></i>');
                            const entry = self.GetFragment(`<span class="label-item" id="${label_id}">${text}${EditString}</span>`);

                            // ? append label and Edit area append
                            self['elements'].INPUT.appendChild(entry);

                            // ? Revert Trigger for remove
                            document.getElementById(label_id).querySelector('.fas').onclick = function() {
                                var listItem = document.getElementById(this.parentElement.id.split('_')[0]);
                                self.removeItem(listItem);
                            };
                            // ? here validate
                            if (IsEditable) {
                                var minVal = (this.getAttribute('SignAttr') == '=') ? ('0') : ('-25');
                                var eFrag = self.GetFragment(`<div class="edit-item d-flex" id="${edit_Par_id}">${text} <input id="${edit_id}" class="form-control form-control-sm editlabel" min="${minVal}" max="25" step="1" type="number" value='' onkeypress='return event.charCode >= 48 && event.charCode <= 57;'/></div>`);
                                if (this.hasAttribute('SignAttr')) {
                                    eFrag.querySelector('input').setAttribute('SignAttr', this.getAttribute('SignAttr'));
                                }
                                // ? append label and Edit area append
                                self.elements.EDIT.appendChild(eFrag);
                                let EDIT_OPT = document.getElementById(edit_id);
                                EDIT_OPT.value = (parseInt(piValue.slice((piValue.indexOf('=') != -1) ? 1 : 0)));
                                // ? onkeyup Input box
                                function ValueChange(e) {
                                    var Value = e.target.value,
                                        Val_len = Value.length,
                                        SignAtt = e.target.getAttribute('SignAttr'),
                                        IsPlus = (Val_len >= 1) ? (Value.slice(0, 1) != '-') : (false),
                                        IsZero = parseInt(Value) === 0,
                                        newValue = (SignAtt == '=') ? (SignAtt + Value) : (((IsPlus && !IsZero && SignAtt != null) ? ('+') : ('')) + Value);
                                    // ?  Append Edited Value
                                    document.getElementById(label_piVal).textContent = newValue;
                                    var IsEmpty = (newValue == '' || ['+', '-', ""].includes(newValue)) ? (true) : (false);

                                    // ! if empty value handle

                                    self.elements.SAVE_BTN[IsEmpty ? ('setAttribute') : ('removeAttribute')]('disabled', '');
                                }
                                EDIT_OPT.onkeyup = EDIT_OPT.onchange = ValueChange;
                            }
                            self.addClickRule();
                        } else {
                            self.removeItem(this);
                        }
                    } catch (err) {
                        console.warn(err.message);
                        ErrorShareMail('click', err.message);
                    }
                });
            });


            self.elements.SAVE_BTN.onclick = () => self.fire();
            self.SHOW_CONTEXT_GROUP = IsContextMenu('Insert_PI');
            self.FullyLoaded = true;
            self.AutoInitiated = true;

        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('initLoop', err.message);
        }
    }

    showLoop(param1, param2, param3) {

        const self = this;

        try {
            self.reStoreDefault();
            if (param2) {
                self._state = {
                    editMode: true,
                    editId: (param2.nodeType == Node.ELEMENT_NODE) ? (param2.id) : (param2)
                };
            }
            if (param1 != undefined) {
                for (var key in param1) {
                    let item = document.getElementById(key);
                    item.click();
                    var value = param1[key],
                        edit_id = key + '_edit',
                        label_piVal = key + '_label_piVal',
                        Val_len = value.length,
                        pi_val = (value.indexOf('=') != -1) ? (parseInt(value.slice(1))) : (parseInt(value)),
                        SignAtt = item.getAttribute('SignAttr'),
                        IsPlus = (Val_len >= 1) ? (pi_val.toLocaleString().slice(0, 1) != '-') : (false),
                        IsZero = parseInt(pi_val) === 0,
                        newValue = (SignAtt == '=') ? (SignAtt + pi_val) : (((IsPlus && !IsZero && SignAtt != null) ? ('+') : ('')) + pi_val);

                    //  ? Append Value

                    var [edit, lab] = [self.Panel.querySelector('[id="' + edit_id + '"]'), self.Panel.querySelector('[id="' + label_piVal + '"]')];
                    if (lab != null) lab.textContent = newValue;
                    if (edit != null) edit.value = pi_val;
                }
            }
        } catch (err) {
            console.warn(err.message);
            // ErrorShareMail('showLoop', err.message);
        }
    }
}

export default PiModule;