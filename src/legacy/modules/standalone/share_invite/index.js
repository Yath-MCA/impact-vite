/**
 * ShareInviteModule � share proof link via email (lazy-loaded dialog).
 */
class ShareInviteModule extends BaseModule {
    constructor(name = 'ShareInviteModule', subFolder = 'reference', options = {}) {
        super(name, subFolder, options);
        this._id = 'shareInviteDialogModule';
        this.templateList = {};
        this.SharedCount = typeof d2 === 'function' ? d2() : 0;

        this.IsDisable_OffLine = true;
        this.canUnmountComponentWhileClose = true;
        this.elements = {};
        this._state = {
            emailValidation: {
                mailIdRegex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                limit: 20
            },
            tooltips: [{
                id: 'share_to_ad',
                content: 'impact.notification@newgen.co',
                placement: 'right'
            }]
        };
        this.toEmailHelper = null;
        this._bindMethods();
        this._apiService = new FetchService();
    }

    getConfigurationItem(key, options) {
        return this.G_FUN.GET_CONFIG_ITEM(key, options) || {};
    }

    isContextMenuEnabled(groupName) {
        return typeof IsContextMenu === 'function' ? IsContextMenu(groupName) : true;
    }

    _bindMethods() {
        const methods = [
            'initLoop', 'showLoop', '_refreshDomBindings',
            'removeToEmail', 'fire', 'PostShareMail', 'reset', 'getSharedCount', 'SHARE_DOCUMENT',
            'SHARE_DOC_RESPONSE', '_initializeSummernote', '_updateShareButtonState'
        ];
        methods.forEach((method) => {
            if (this[method]) this[method] = this[method].bind(this);
        });
    }

    _getMailRegex() {
        if (this.G_SCOPE && this.G_SCOPE.Mail_ID_REGEX) {
            return this.G_SCOPE.Mail_ID_REGEX;
        }
        return this._state.emailValidation.mailIdRegex;
    }

    _loadShareInviteConfig() {
        try {
            return this.getConfigurationItem('shareInvite', {
                CONVERT_JSON: true,
                attr: true,
                hex2string: true,
                children: false
            }) || {};
        } catch (err) {
            return {};
        }
    }

    _refreshDomBindings() {
        const previousHelper = this.toEmailHelper;
        const previousInput = previousHelper && previousHelper.inputElement || this.elements.InputMail || null;

        if (!this.Panel) {
            this.Panel = document.getElementById(this._id);
        }
        if (!this.Panel) return;
        this.elements.InputMail = this.Panel.querySelector('#InputMail');
        this.elements.ToMailRow = this.Panel.querySelector('#share_to_mail_row');
        this.elements.SubjectValue = this.Panel.querySelector('#subject_value');
        this.elements.ROLE_GROUP = this.Panel.querySelector('#rolelist');
        this.elements.ROLE_OPT = this.Panel.querySelector('#role_list_opt');
        this.elements.SUBMIT_GROUP = this.Panel.querySelector('.dialog-footer');
        this.elements.ShareBtnOpt = this.Panel.querySelector('#Submit_share');
        this.elements.CancelBtnOpt = this.Panel.querySelector('#Cancel_share');
        this.elements.CommentDOM = this.Panel.querySelector('#sharecmt_text');
        this.elements.CommentValue = this.Panel.querySelector('.note-editable');


        if (this.G_SCOPE && this.G_SCOPE.Mail_ID_REGEX) {
            this._state.emailValidation.mailIdRegex = this.G_SCOPE.Mail_ID_REGEX;
        }

        if (this.elements.ShareBtnOpt) {
            this.elements.ShareBtnOpt.onclick = this.fire;
        }
        if (this.elements.CancelBtnOpt) {
            this.elements.CancelBtnOpt.onclick = this.closeDialog;
        }
        if (previousHelper && previousInput && previousInput !== this.elements.InputMail) {
            previousHelper.detachEvents();
            this.toEmailHelper = null;
        } else if (previousHelper && previousInput === this.elements.InputMail) {
            this.toEmailHelper = previousHelper;
        }

        if (this.elements.InputMail && !this.toEmailHelper) {
            this.toEmailHelper = new emailInputHelper(this.elements.InputMail, {
                emailRegex: this._state.emailValidation.mailIdRegex,
                limit: this._state.emailValidation.limit,
                chipClass: 'share_to_mail',
                excludedEmails: [USER_INFO && USER_INFO.MAIL_ID || ''],
                excludedWarningKey: 'OwnEmailSkipped',
                chipLabelFormatter: (email) => (email || '').split('@')[0],
                onChange: (emails) => this._updateShareButtonState(emails)
            });
            if (previousHelper && previousInput && previousInput !== this.elements.InputMail) {
                previousHelper.detachEvents();
                this.toEmailHelper = null;
            } else if (previousHelper && previousInput === this.elements.InputMail) {
                this.toEmailHelper = previousHelper;
            }

            if (this.elements.InputMail && !this.toEmailHelper) {
                this.toEmailHelper = new emailInputHelper(this.elements.InputMail, {
                    emailRegex: this._state.emailValidation.mailIdRegex,
                    limit: this._state.emailValidation.limit,
                    chipClass: 'share_to_mail',
                    excludedEmails: [USER_INFO & USER_INFO.MAIL_ID || ''],
                    excludedWarningKey: 'OwnEmailSkipped',
                    chipLabelFormatter: (email) => (email || '').split('@')[0],
                    onChange: (emails) => this._updateShareButtonState(emails)
                });
            }
        }
    }

    _setShareButtonEnabled(enabled) {
        const btn = this.elements.ShareBtnOpt || (this.Panel && this.Panel.querySelector('#Submit_share'));
        if (!btn) return;
        this.elements.ShareBtnOpt = btn;
        btn.classList.toggle('disabled', !enabled);
        if (enabled) {
            btn.removeAttribute('disabled');
            btn.disabled = false;
        } else {
            btn.setAttribute('disabled', 'disabled');
            btn.disabled = true;
        }
    }

    initLoop() {
        try {
            this.IsShared = false;
            this._refreshDomBindings();

            this.templateList = Object.assign(this.templateList, this._loadShareInviteConfig());

            if (IS_ADMIN && (IS_UAT_DOMAIN || IS_DEV_DOMAIN || IS_LOCAL_HOST)) {
                const roleList = [];
                for (const [key, value] of Object.entries(ROLE_IDS)) {
                    if (value.SelectorAttribute) {
                        roleList.push(`<option value="${key}">${value.name}</option>`);
                    }
                }
                if (roleList.length > 0) {
                    this.elements.ROLE_OPT.append(document.createRange().createContextualFragment(roleList.join('')));
                }
            }

            commonfn.SHARE_DOC_RESPONSE = this.SHARE_DOC_RESPONSE;
            this.AutoInitiated = true;
            this.FullyLoaded = true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareInvite-initLoop', err.message);
        }
    }

    showLoop() {
        try {
            this._refreshDomBindings();
            this.reset();


            if (USER_INFO.IS_ADMIN) {
                this.elements.ROLE_GROUP.classList.remove('ds-none');
                this.elements.SUBMIT_GROUP.classList.add('mt-2');
            }
            this.elements.ROLE_OPT.value = USER_INFO.ROLE_ID;
            this.getSharedCount();


            this._initializeSummernote();
            // this.initTippyTooltips(this._state.tooltips);
            this._updateShareButtonState();


        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareInvite-showLoop', err.message);
        }
    }

    _initializeSummernote() {
        this.setupSummerNote();

        if (this.elements.CommentDOM && typeof $ !== 'undefined' && $.fn.summernote) {
            const config = this.SUMMERNOTE_CONFIG || this.G_CONFIG.SUMMER_CONFIG || {};
            if (this._summernote) this._summernote.bindTarget(this.elements.CommentDOM, {
                resetCache: true
            });
            if (this._summernote) this._summernote.bindTarget(this.elements.CommentDOM, {
                resetCache: true
            });
            $(this.elements.CommentDOM).summernote(config);
            this.elements.CommentValue = this.Panel.querySelector('.note-editable');
        }
    }

    _collectToEmails() {
        const emails = [];
        const regex = this._getMailRegex();
        const root = this.Panel || document.getElementById(this._id);

        if (root) {
            root.querySelectorAll('.share_to_mail').forEach((element) => {
                const email = (element.getAttribute('data-email') || '').trim();
                if (email && !emails.includes(email)) {
                    emails.push(email);
                }
            });
        }

        const pending = (this.elements.InputMail && this.elements.InputMail.value || '').trim();
        if (pending) {
            if (regex.test(pending) && !emails.includes(pending)) {
                emails.push(pending);
            } else {
                pending.split(/[,;]/).map((s) => s.trim()).filter(Boolean).forEach((part) => {
                    if (regex.test(part) && !emails.includes(part)) {
                        emails.push(part);
                    }
                });
            }
        }

        return emails;
    }

    _removeAllToEmails() {
        this.Panel.querySelectorAll('.share_to_mail').forEach((element) => {
            element.remove();
        });
    }

    _updateShareButtonState(helperEmails = null) {
        const root = this.Panel || document.getElementById(this._id);
        const hasChips = !!(root && root.querySelectorAll('.share_to_mail:not(.share_to_mail_summary)').length);
        const emails = Array.isArray(helperEmails) ? helperEmails : this._collectToEmails();
        const input = this.elements.InputMail;
        const pending = (input && input.value || '').trim();
        const regex = this._getMailRegex();
        const pendingInvalid = !hasChips && pending !== '' && !regex.test(pending) &&
            !pending.split(/[,;]/).some((part) => regex.test(part.trim()));

        let allowed = emails.length > 0 && !pendingInvalid;


        this._setShareButtonEnabled(allowed);
    }

    fire() {
        try {
            this.IsShared = false;

            if (this.toEmailHelper) {
                this.toEmailHelper.flushInput();
            }

            const shareMails = this._collectToEmails();
            const normalizedMails = Array.from(new Set((shareMails || []).map((mail) => (mail || '').trim()).filter(Boolean)));
            const mailCsv = normalizedMails.join(',');

            if (!normalizedMails.length) {
                TOASTER_ALERT('InvalidMail', {
                    type: 'warning'
                });
                return false;
            }

            if (!USER_INFO.IS_ADMIN) {
                const selfMail = (USER_INFO.MAIL_ID || '').toLowerCase();
                if (normalizedMails.some((e) => e.toLowerCase() === selfMail)) {
                    TOASTER_ALERT('InvalidMail', {
                        type: 'warning'
                    });
                    return false;
                }
            }

            let shareRole = USER_INFO.ROLE_ID;
            const IsRoleBase = !SHARED_KEY.apikey ? false : true;

            let CommentVal = '';
            if (this.elements.CommentValue && this.elements.CommentValue.innerHTML !== '') {
                CommentVal = this.GetTemplate('comment', {
                    commentText: this.elements.CommentValue.innerHTML
                });
            }

            if (IS_ADMIN || commonMethods.IsVisibleElm(this.elements.ROLE_OPT)) {
                shareRole = this.elements.ROLE_OPT.value;
            }

            const Co_Role_Signature = this.GetTemplate('coroleSignature', {});
            if (IS_LOCAL_HOST && !normalizedMails.length) {
                shareRole = USER_INFO.ROLE_ID;
            }

            const jsonData = {
                autoshare: false,
                rolebase: IsRoleBase,
                emailto: normalizedMails,
                emailtolist: mailCsv,
                username: mailCsv,
                role: shareRole,
                rolesign: Co_Role_Signature,
                Comments: CommentVal,
                emailBody: this.templateList[IsRoleBase && this.templateList.coroleShare !== '' ? 'coroleShare' : 'defaultShare']
            };

            if (SHARED_KEY.vendor) jsonData.vendor = SHARED_KEY.vendor;

            this.SHARE_DOCUMENT(jsonData);

            const mailInfo = shareMails.join(',');
            setTimeout((info) => {
                if (!this.IsShared) {
                    this.PostShareMail({
                        r: 2,
                        mail: info
                    });
                }
            }, 5000, mailInfo);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareInvite-ShareMail', err.message);
        }
    }

    PostShareMail(res) {
        try {
            if (res.r === 2) {
                TOASTER_ALERT('ErrorAutoShareMail', {
                    type: 'warning'
                });
                ErrorLogTrace('PostShareMail', 'Sharing mail timeout ' + res.mail);
            } else if (res.r !== 0) {
                TOASTER_ALERT('ShareInviteUser');
            }
            this.IsShared = true;
            this.closeDialog();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareInvite-PostShareMail', err.message);
        }
    }

    reset() {
        try {
            this._removeAllToEmails();
            this._setShareButtonEnabled(false);
            this.elements.InputMail.classList.remove('is-invalid', 'is-valid', 'highlight');
            this.elements.InputMail.value = '';
            this.elements.InputMail.placeholder = 'someone@domain.com';
            this.elements.SubjectValue.value = SHARED_KEY.identifier;
            const editable = this.Panel.querySelector('.note-editable');
            if (editable) editable.innerHTML = '';
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareInvite-reset', err.message);
        }
    }

    getSharedCount() {
        try {
            const temp_json = GET_JSON('Shareandinvite', {
                getCount: true
            });
            commonfn.getAllCount = (response) => {
                this.SharedCount = response.data.length + 1;
                debug.log('Total Shared Count ' + response.data.length + ' New Count ' + this.SharedCount);
            };
            commonfn.callajax(temp_json, 'getAllCount', API_GET_DOCS);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareInvite-getSharedCount', err.message);
        }
    }

    SHARE_DOC_RESPONSE(response, Options) {
        try {
            Options = Options || {
                autoshare: false,
                rolebase: false,
                writetoTeam: false
            };
            if (response.r === 0) {
                if (Options.autoshare) {
                    TOASTER_ALERT('ErrorAutoShareMail', {
                        type: 'warning'
                    });
                }
                ErrorLogTrace('SHARE_DOC_RESPONSE', 'Error while sharing mail');
            }
            const hasRecipients = (Array.isArray(Options.emailto) && Options.emailto.length > 0) ||
                !!(Options.emailtolist || Options.username);
            if (Options.rolebase || hasRecipients) {
                this.PostShareMail(response);
            }
            debug.log(JSON.stringify(response));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SHARE_DOC_RESPONSE', err.message);
        }
    }

    isCurrentUserCollator() {
        try {
            const roleId = String(USER_INFO && USER_INFO.ROLE_ID || SHARED_KEY && SHARED_KEY.role || '').trim();
            const roleName = String(
                USER_INFO && (USER_INFO.ROLE_NAME || USER_INFO.TRACK_ROLE_NAME) ||
                SHARED_KEY && SHARED_KEY.rolename ||
                ''
            ).toLowerCase();

            if (roleId && ROLE_IDS && ROLE_IDS[roleId] && String(ROLE_IDS[roleId].name || '').toLowerCase() === 'collator') {
                return true;
            }
            return roleName === 'collator' || roleName.indexOf('collator') !== -1;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareInvite-isCurrentUserCollator', err.message);
            return false;
        }
    }

    shouldPromoteCurrentSessionToCollaborative(options) {
        try {
            const sharedKey = SHARED_KEY || {};
            const clientAllowed = typeof window.hasCollabClient === 'function' && window.hasCollabClient(sharedKey.client);
            const alreadyCollaborative = String(sharedKey.collaborative || '').toLowerCase() === 'yes';
            const hasRecipients = Array.isArray(options.emailto) ? options.emailto.length > 0 : !!(options.emailto || options.emailtolist || options.username);

            return !!(
                clientAllowed &&
                options.rolebase &&
                hasRecipients &&
                !alreadyCollaborative &&
                !this.isCurrentUserCollator()
            );
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareInvite-shouldPromoteCurrentSessionToCollaborative', err.message);
            return false;
        }
    }

    isSuccessfulShareResponse(response) {
        try {
            const status = response && response.r != null ? response.r : response && response.data && response.data.r;
            return String(status) !== '0';
        } catch (err) {
            console.warn(err.message);
            return false;
        }
    }

    getCollabActivationReloadKey(docid) {
        return 'xmleditor:collabActivationReloaded:' + String(docid || '').trim();
    }

    getCurrentSessionId(docid) {
        try {
            if (typeof window.getSessionId === 'function') {
                return String(window.getSessionId(docid) || '').trim();
            }
            return String(sessionStorage.getItem('xmleditor:sessionid:' + String(docid || '').trim()) || '').trim();
        } catch (err) {
            console.warn(err.message);
            return '';
        }
    }

    async updateCurrentShareInviteCollaborativeFlag(docid) {
        try {
            if (!SHARED_KEY || typeof SHARED_KEY !== 'object') {
                return false;
            }

            const sharedInviteId = SHARED_KEY._id || SHARED_KEY.id || '';
            const payload = Object.assign({}, {
                "tbl": "Shareandinvite",
                "find": {
                    "docid": docid,
                    "_id": sharedInviteId
                },
                "update": {
                    "collaborative": "yes"
                }
            });

            if (!sharedInviteId) {
                delete payload.find._id;
            }

            const results = await this._apiService.makeRequest(API_FIND_UPDATE_INSERT, payload, {});
            return !!(results && results.r == 1);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareInvite-updateCurrentShareInviteCollaborativeFlag', err.message);
            return false;
        }
    }

    updateLocalCollaborativeState(docid) {
        try {
            if (!SHARED_KEY || typeof SHARED_KEY !== 'object') {
                return;
            }

            SHARED_KEY.collaborative = 'yes';
            USER_INFO.HAS_COLLAB_WORKFLOW = true;

            localStorage.setItem('xmleditor:shared:' + docid, JSON.stringify(SHARED_KEY));
            localStorage.setItem('xmleditor:collabEnabled:' + docid, 'true');
            localStorage.setItem('xmleditor:collabMode:' + docid, 'collaborative');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareInvite-updateLocalCollaborativeState', err.message);
        }
    }

    async saveBeforeCollaborativeReload() {
        try {
            const editorDirty = typeof GlobalEditor !== 'undefined' && GlobalEditor && typeof GlobalEditor.checkDirty === 'function' && GlobalEditor.checkDirty();
            const appDirty = typeof _IsDirty !== 'undefined' && _IsDirty;
            if (!editorDirty && !appDirty) {
                return true;
            }

            if (typeof IMPACT_SAVE !== 'undefined' && IMPACT_SAVE && typeof IMPACT_SAVE.iSave === 'function') {
                await IMPACT_SAVE.iSave({
                    forcesave: true,
                    noalert: true
                });
            }
            return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareInvite-saveBeforeCollaborativeReload', err.message);
            return false;
        }
    }

    async promoteCurrentSessionToCollaborative(options = {}) {
        const docid = String((SHARED_KEY && SHARED_KEY.docid) || DOC_ID || '').trim();
        if (!docid) {
            return false;
        }

        try {
            const saved = await this.saveBeforeCollaborativeReload();
            if (!saved) {
                return false;
            }

            const updated = await this.updateCurrentShareInviteCollaborativeFlag(docid);
            if (!updated) {
                return false;
            }

            this.updateLocalCollaborativeState(docid);
            const reloadKey = this.getCollabActivationReloadKey(docid);
            if (!sessionStorage.getItem(reloadKey)) {
                sessionStorage.setItem(reloadKey, '1');
                setTimeout(() => window.location.reload(), 300);
            }
            return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareInvite-promoteCurrentSessionToCollaborative', err.message);
            return false;
        }
    }

    SHARE_DOCUMENT(Options = {}) {
        try {
            if (!this.templateList || !Object.keys(this.templateList).length) {
                this.templateList = Object.assign(this.templateList || {}, this._loadShareInviteConfig());
            }

            Options = Object.assign({
                autoshare: false,
                rolebase: false,
                writetoTeam: false,
                emailBody: '',
                emailto: [],
                emailtolist: '',
                username: '',
                role: '',
                FromMail: '',
                Comments: '',
                rolesign: ''
            }, Options);

            if (Options.Comments) Options.emailBody += Options.Comments;
            if (Options.rolesign) Options.emailBody += Options.rolesign;

            const {
                doctitle = '',
                    cover = SHORT_TITLE,
                    authorgroup = '',
                    doctype = '',
                    subject = '',
                    identifier = '',
                    projectname = '',
                    linkinfo = '',
                    xmltohtmlres = {}
            } = SHARED_KEY || {};

            const {
                doctitle: doc_title = '',
                cover: cover_image = SHORT_TITLE,
                authorgroup: author_group = ''
            } = SHARED_KEY.titleinfo || {};

            const {
                articletitle: doc_title_1 = '',
                authorgroup: author_group_1 = ''
            } = SHARED_KEY.xmltohtmlres || {};

            const normalizedEmailTo = Array.isArray(Options.emailto) ?
                Options.emailto.map((mail) => (mail || '').trim()).filter(Boolean) :
                String(Options.emailto || '').split(',').map((mail) => mail.trim()).filter(Boolean);
            const emailToList = Options.emailtolist || normalizedEmailTo.join(',');
            const username = Options.username || emailToList;

            const basicPayload = GET_JSON('share_document');
            ['username', 'session_id'].forEach((key) => {
                if (key in basicPayload) delete basicPayload[key];
            });

            const jsondata = {
                ...basicPayload,
                emailto: normalizedEmailTo,
                emailtolist: emailToList,
                username,
                role: Options.role ? Options.role : '' || '',
                tbl: 'emaildraft',
                emailfrom: Options.FromMail || GET_SENDER_RECEIVER_ID('SHARE_LINK').MAIL,
                emailCC: '',
                emailBCC: GET_SENDER_RECEIVER_ID('PUBKIT_TOKEN_EMAIL'),
                doctitle: doctitle || doc_title || doc_title_1 || '',
                doctype: doctype,
                titleinfo: {
                    doctitle: doctitle || doc_title || '',
                    subject: subject || '',
                    authorgroup: authorgroup || author_group || author_group_1 || '',
                    cover: cover || cover_image,
                    identifier: identifier,
                    projectname: projectname
                },
                xmltohtmlres,
                editor: DOMAIN_URL.match(/editor[0-9]+.html/g)[0],
                usertype: 2,
                currenturl: DOMAIN_ROOT,
                linkinfo: linkinfo,
                find: Options.emailBody ? {
                    emailMessage: Options.emailBody,
                    emailSubject: identifier
                } : {
                    id: !IS_JOURNAL ? '6065ff5ee845a47ed65efc61' : '4c279c63-edd0-4b03-af59-533731427823'
                }
            };

            this.getSharedCount();
            jsondata.sharedcolor = (20 + this.SharedCount) || (typeof d2 === 'function' ? d2() : 0);


            if (Options.rolebase) {
                jsondata.corole = USER_INFO.ROLE_ID;
                jsondata.couseremail = USER_INFO.MAIL_ID;
            }

            const promoteCurrentSession = this.shouldPromoteCurrentSessionToCollaborative(Options);
            if (USER_INFO.HAS_COLLAB_WORKFLOW || this.isOSO || promoteCurrentSession) {
                jsondata.collaborative = 'yes';
            }

            if (Options.autoshare) return jsondata;

            debug.log(JSON.stringify(jsondata));
            // commonfn.callajax(jsondata, 'SHARE_DOC_RESPONSE', API_SHARE_INVITE, Options);
            var self = this;
            void this._apiService.makeRequest(API_SHARE_INVITE, jsondata, {})
                .then(async (response) => {
                    this.SHARE_DOC_RESPONSE(response, Options);
                    if (promoteCurrentSession && this.isSuccessfulShareResponse(response)) {
                        await this.promoteCurrentSessionToCollaborative(Options);
                    }
                    self.IsShared = true;
                    self.closeDialog();
                })
                .catch((error) => {
                    console.warn(`Error in SHARE_DOCUMENT: ${error.message}`);
                    ErrorLogTrace('SHARE_DOCUMENT', error.message);
                    self.closeDialog();
                });

        } catch (err) {
            console.warn(`Error in SHARE_DOCUMENT: ${err.message}`);
            ErrorLogTrace('SHARE_DOCUMENT', err.message);
        }
    }
}

export default ShareInviteModule;