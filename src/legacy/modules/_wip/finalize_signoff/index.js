/**
 * FinalizeSignOffModule — migrated from FinalizeSignOff.js
 * Flow phases: precheck → confirm → commit → post → exit
 * Commit path: legacy multi-AJAX (default) or saveWithLogout / saveWithFinalize when capabilities allow.
 */

class FinalizeSignOffModule extends BaseModule {
    constructor(name = 'FinalizeSignOffModule', errorTracker = null, options = {}) {
        super(name, errorTracker, options);
        this._id = 'FinalizingDialog';
        this.canUnmountComponentWhileClose = true;
        this.IsDisable_OffLine = true;
        this._state = {};
        this.elements = {};
        this.flowPhase = null;
        this._commitDone = {};
        this._deps = null;
        this._bindModuleMethods();
        this._importPromise = this._importDependencies();
        window.FinalizeDialog = this;
        debug.log(`initilze-${this.name}`);
    }

    async _importDependencies() {
        const {
            _importDependencies: loadFinalizeDeps
        } = await import('./deps.js');
        this._deps = await loadFinalizeDeps();
    }

    async _ensureReady() {
        await this._importPromise;
    }

    _bindModuleMethods() {
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach((key) => {
            if (key !== 'constructor' && typeof this[key] === 'function') {
                this[key] = this[key].bind(this);
            }
        });
    }

    /**
     * Flow runner — orchestrates phases without changing role business rules.
     * @param {string} phase
     * @param {Object} [ctx]
     */
    async runFlow(phase, ctx = {}) {
        try {
            await this._ensureReady();
            this.flowPhase = phase;
            const handlers = {
                precheck: () => this.flowPrecheck(ctx),
                confirm: () => this.flowConfirm(ctx),
                commit: () => this.flowCommit(ctx),
                post: () => this.flowPost(ctx),
                exit: () => this.flowExit(ctx)
            };
            if (!handlers[phase]) {
                ErrorLogTrace('runFlow', `Unknown phase: ${phase}`);
                return;
            }
            return await handlers[phase]();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('runFlow', err.message);
        }
    }

    async flowPrecheck(ctx = {}) {
        // showLoop owns full precheck + stage render; keep entry for flow API
        await this.showLoop(ctx.param1, ctx.param2, ctx.param3);
        this.flowPhase = 'confirm';
    }

    async flowConfirm() {
        // UI stage + button handlers already bound in showLoop; phase marker only
        this.flowPhase = 'confirm';
    }

    async flowCommit(Options = {
        redirect: true
    }) {
        this.flowPhase = 'commit';
        await this.CloseSharedStatus(Options);
    }

    async flowPost(ctx = {}) {
        this.flowPhase = 'post';
        if (ctx.response) {
            await this.closesharedpost(ctx.response);
        }
    }

    async flowExit() {
        this.flowPhase = 'exit';
        this.reDirectReadOnly();
    }

    getCapabilities(overrides) {
        return this._deps.getFinalizeCapabilities(overrides);
    }

    postInitializeModule() {
        debug.log("--finalize-postInitializeModule--");
        try {
            const self = this;
            if (!this.initiated && typeof this.init == "function" && InitialLoadDialog.FullyLoaded) {
                this.init();
            } else setTimeout(() => self.postInitializeModule(), 1500);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('postInitializeModule', err.message);
        }
    }
    initLoop() {
        try {
            debug.log("--finalize-initLoop--");
            const self = this;
            [self.IsDisable_OffLine, self.CanReDirect, self.CanReDirectCount] = [true, false, 0];
            self.elements = {
                bodyTop: self.Panel.querySelector('#dialogtop'),
                bodyCenter: self.Panel.querySelector('#dialogcenter'),
                footer: self.Panel.querySelector('.dialog-footer'),
                headerImage: self.Panel.querySelector('#headerImage'),
                headerTitle: self.Panel.querySelector('.headerTitle'),
                bodyText: self.Panel.querySelector('#bodyText'),
                bodySpinner: self.Panel.querySelector('#bodySpinner'),
                actionButtons: self.Panel.querySelectorAll('.dialog-footer button')
            };
            self._state = {
                templateList: {},
                auKey: '',
                finalize: {},
                survey: {},
                saveUniqueData: [],
                isPrimaryAuthor: !USER_INFO.IS_CO_ROLE,
                openAqCount: 0,
                workFlow: null,
                isEditorComesFirst: false,
                isEditorOnly: false,
                docType: IS_JOURNAL ? 'article' : 'book/chapters',
                trackPDF: API_PATH + `filedownloadwithdb?docid=${DOC_ID}_trackPDF` + '--' + USER_INFO.ROLE_ID,
                querySelector: '[data-class="ckcommentsfull"][data-status]:not([data-status="note"],[data-status="comment"])',
                icons: {
                    default: 'assets/images/svg/mainPage/Finalize.svg',
                    coRole: 'assets/images/svg/mainPage/Submit.svg'
                },
                stages: null,
                collaborativeStages: null,
                displayRows: null,
                citationAlerts: null,
                missingStageKey: null
            };

            // ? 23_JUNE_2023_FOR_CO_ROLE
            var change_btn = function() {
                try {
                    var UI_BTN = document.getElementById("finalize");
                    if (UI_BTN) {
                        let img = UI_BTN.querySelector('img');
                        if (img) $(img).attr("src", self._state.icons.coRole);
                    } else {
                        setTimeout(change_btn, 1500);
                    }
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('finalize_change_btn', err.message);
                }
            };

            if (!self._state.isPrimaryAuthor) {
                change_btn();
            }


            //  ? FETCH_STORE_CONFIG_FROM_FILES
            const options = {
                    CONVERT_JSON: true,
                    attr: true,
                    hex2string: false,
                    children: false
                },
                forSignUp = {
                    coRoleMail: {
                        hex2string: true
                    }
                },
                configItems = ["sign_off", "survey"];

            // Ensure _state.survey and _state.finalize are initialized if not already

            if (!this._state.survey) {
                this._state.survey = {};
            }
            if (!this._state.finalize) {
                this._state.finalize = {};
            }

            configItems.forEach(item => {
                const isSignOff = item === "sign_off";

                // Merge the options and forSignUp configurations dynamically
                const config = this.G_FUN.GET_CONFIG_ITEM(`item[name="${item}"]`, {
                    ...options,
                    ...(isSignOff ? forSignUp : {})
                });

                Object.assign((isSignOff ? this._state.finalize : this._state.survey), config);
            });

            // ? SEAN REQUEST  - 16_JUNE_2023 - YA
            this._state.auKey = "";
            // ? SRINI REQUEST  - 01_MAR_2023 - YA
            this.TRIGGER = document.getElementById("finalize");

            if (this.TRIGGER && USER_INFO.ROLE_ID == ROLE_IDS.CO || IS_LOCAL_HOST) {
                if (typeof CROSS_LINKS_VALIDATION != "undefined" && typeof CROSS_LINKS_VALIDATION.show == "function" && IS_JOURNAL) {
                    this.TRIGGER.removeAttribute("onclick");
                    this.TRIGGER.onclick = CROSS_LINKS_VALIDATION.show;
                } else {
                    console.warn("IT WILL ASSIGN");
                }
            } else if (!this.TRIGGER) {
                console.warn("RE_LOOP");
            }

            if (!self._state.isPrimaryAuthor) {
                let js_on = GET_JSON('get_shared_author_info');
                if (!SHARED_KEY.linkfrom) commonfn.callajax(js_on, 'get_shared_author_post', API_GET_DOCS, self);
                let js_on_key = {
                    "tbl": "pubkitapistatus",
                    "find": {
                        "doi": SHARED_KEY.identifier,
                        "docid": DOC_ID,
                        "status": "200",
                        "statusCode": 200,
                        "r": 1,
                        "message": "SUCCESS",
                        "urls": {
                            $exists: true
                        }
                    },
                    "length": 10
                };
                commonfn.callajax(js_on_key, 'get_org_author_link_post', API_GET_DOCS, self);
            }

            // ? 23_AUG_223
            var CHECK_WORK_RULE = setInterval(() => {
                if (!J_CONFIG) window.J_CONFIG = I_CONFIG.querySelector(`[short="${SHORT_II_TITLE}"]`);
                if (J_CONFIG) {
                    let value1 = J_CONFIG.getAttribute("editor-comes-first");
                    let value2 = J_CONFIG.getAttribute("editor-only");
                    if (value1 == "true") self._state.isEditorComesFirst = USER_INFO.IS_EDITOR_COMES_FIRST = true;
                    if (value2 == "true") self._state.isEditorOnly = USER_INFO.IS_EDITOR_ONLY = true;
                    // As per Siva's request, this condition is added for future extensibility based on DB configuration.
                    // Currently, TNF has only one configuration (unlike Journals).
                    // Date: 20-12-2025 
                    // Ticket : https://mantis.newgen.co/view.php?id=3438874
                    if (SHARED_KEY.client == 'TNF' && SHARED_KEY.wflow == 'editorfirst' && USER_INFO.ROLE_NAME == 'Editor') {
                        self._state.isEditorComesFirst = USER_INFO.IS_EDITOR_COMES_FIRST = true;
                    }
                    clearInterval(CHECK_WORK_RULE);
                }
            }, 1500);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Finalize_initLoop', err.message);
        }
        this.FullyLoaded = true;
        this.AutoInitiated = true;
    }

    closeshared_corole_post(response) {

        const self = this;

        try {
            if (response.r == 0) {
                ErrorLogTrace('MULTI RECORD', 'SignOff');
            } else {
                console.log('status updated');
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('closeshared_corole_post', err.message);
        }
    }

    task_close_pubkit_post(response) {

        const self = this;

        try {
            if (response.r == 0) {
                ErrorLogTrace('Pubkit_SignOff', response.m);
            }
            self.reDirectReadOnly();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('task_close_pubkit_post', err.message);
        }
    }

    fire_pubkit_post(response) {

        const self = this;

        try {
            if (response.r == 0) {
                ErrorLogTrace('fire_pubkit_after', response.m);
            }
            debug.log(JSON.stringify(response));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('fire_pubkit_post', err.message);
        }
    }

    get_shared_author_post(response) {

        const self = this;

        try {
            debug.log(JSON.stringify(response));
            if (response.r == 0 || response.data.length == 0) {
                // ErrorLogTrace('get_shared_author_post', (response.r == 0 ? response.m : "NO_RECORD_FOR_AUTHOR_MAIL"));
                return;
            }
            if (!SHARED_KEY.linkfrom) {
                SHARED_KEY.linkfrom = (response.data[0].emailtolist ? response.data[0].emailtolist : response.data[0].emailto);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('get_shared_author_post', err.message);
        }
    }

    get_org_author_link_post(response) {

        const self = this;

        try {
            debug.log(JSON.stringify(response));
            if (response.r == 0 || response.data.length == 0) {
                if (IS_LIVE_DOMAIN) ErrorLogTrace('get_org_author_link_post', (response.r == 0 ? response.m : "NO_RECORD_FOR_CORRES_AUTHOR"));
                return;
            }
            let [DATA, _NAME] = [response.data[0], ROLE_IDS[USER_INFO.ROLE_ID].pubkit_name];
            if (DATA && DATA.urls[0] && _NAME) {
                let LINK = DATA.urls[0][_NAME];
                if (LINK) {
                    debug.log("LINK==>FOUND");
                } else if (DATA.urls.length > 1) {
                    let tempObj = ObjectFilter(DATA.urls, "role", _NAME);
                    if (tempObj) {
                        LINK = tempObj.link;
                        debug.log("LINK==>FOUND_NEW");
                    }
                }
                if (LINK) {
                    self._state.auKey = LINK;
                }
            } else {
                ErrorLogTrace('get_org_author_link_post', "NO_RECORD_AUTHOR_01");
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('get_org_author_link_post', err.message);
        }
    }

    reply_author_post(response) {

        const self = this;

        try {
            if (response.r == 0) {
                ErrorLogTrace('reply_author_post', response.m);
            }
            debug.log(JSON.stringify(response));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('reply_author_post', err.message);
        }
    }

    autoshareformpost(response) {

        const self = this;

        try {
            console.log(JSON.stringify(response));
            if (response["statusCode"] != 202) {
                TOASTER_ALERT('ErrorAutoShareMail', {
                    type: 'warning'
                });
                ErrorLogTrace('SignOff_Autoshareformpost', 'Send Auto Mail');
            }
            self.reDirectReadOnly();
        } catch (err) {
            console.warn(err.message);
            self.reDirectReadOnly();
            ErrorLogTrace('autoshareformpost', err.message);
        }
    }

    updateSignOffTime(response) {

        const self = this;

        try {
            if (response.r == 0) {
                console.log('no records found in database');
                //ErrorLogTrace('signOffTime_Update', 'SignOff');
            } else console.log('SignOff Time Updated');
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('updateSignOffTime', err.message);
        }
    }

    getPubKitConfigJSON() {

        const self = this;

        try {
            /*? 08-Apr-22 updates from both test and live env related token and url */
            var returnData = {

                /* ? 30-Mar-22 updates from Pubkit Team */
                "abstract_task_id": parseInt(SHARED_KEY.roleabstracttaskid),
                "identifier": SHARED_KEY.identifier,
                "task_id": parseInt(SHARED_KEY.roletaskid),
                /* ? 27-Apr-22 updates for Client Update  shared to Pubkit */
                "trackPDF": self._state.trackPDF,
                "docid": DOC_ID,
                "info": {}
            };

            // ? 25_APR_2025 - YA - FOR THOMSON/MEDKNOW
            // ? 3392484: Medknow - fileid for pubkit request - 14_JUN_2025_YA
            // ? OSO - required projectid in pubkit request - 17_APR_2026 - SIVA

            var userData = self.userTrackData("pubkit");
            var defaultValues = GET_JSON("default");
            Object.assign(returnData, defaultValues, {
                fileid: SHARED_KEY.fileid,
                info: userData,
                ...(SHARED_KEY.projectid ? {
                    projectid: SHARED_KEY.projectid
                } : {})
            });
            return returnData;

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getSignOffPubKitConfig', err.message);
        }
    }

    updateCollabTable(rows, bodyData = {}, retries = 10, delay = 200) {

        const self = this;
        try {
            const {
                header,
                footer,
                icon,
                btn1,
                btn2
            } = bodyData;
            var tableTemplate =
                `<div class="collabStatusContent">
                <p class="tab_header">${header}</p>
                <div class="collabTableWrap">
                    <table border="1" cellspacing="0" cellpadding="4" class="collabTable">
                        <thead><tr><th>Email&rsquo;s Address</th><th>Last Access Date</th><th>Has Submitted</th><th>Role</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <p class="tab_footer">${footer}</p>
            </div>`;
            this.StageRenderBody(icon, "Collaborative users status", false, tableTemplate);
            if (btn1 && btn2) this.StageRenderFooter([btn1, btn2]);
        } catch (error) {
            console.warn("updateCollabTable:", error.message);
        }
    }

    filterSaveData(response = {}) {

        const self = this;

        try {
            const seen = new Set();
            var uniqueData = [];
            if (response.r == 1 || response.data) {
                uniqueData = response.data.reduce((acc, item) => {
                    const key = `${item.username}_${item.role}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        acc.push({
                            username: item.username,
                            roleid: item.roleid,
                            rolename: item.rolename,
                            role: item.role,
                            time_c: item.time_c,
                            corole: !!item.corole,
                            uniqueKey: key
                        });
                    }
                    return acc;
                }, []);
            }
            this._state.saveUniqueData = uniqueData;
        } catch (err) {
            console.warn(err.message);
            this._state.saveUniqueData = [];
        }
    }

    refreshCollaborativeStatus(response = {}) {

        const self = this;

        try {
            const filterSaveData = this._state.saveUniqueData || [];
            if (!filterSaveData.length) {
                setTimeout(() => this.refreshCollaborativeStatus(response), 500);
                return;
            }

            // Locked info (for "Reviewing" state)
            let lockedInfo = {
                total: 0,
                elements: [],
                byOthers: [],
                byCurrentUser: [],
                users: [],
                byOthersEmailList: []
            };
            if (window.paraLock && window.paraLock.getLockedElementsByOthers) {
                lockedInfo = window.paraLock.getLockedElementsByOthers();
            }

            const sharedItems = Array.isArray(response.data) ? response.data : [];
            const format = "DD-MMM-YYYY, h:mm:ss a";
            const LiveCouser = [];
            const rows = sharedItems.flatMap(entry => {
                const {
                    emailto = [], emailtolist, finalized_by = [], rolename, role, corole, couseremail, time_c, status
                } = entry;

                const localTime = time_c ?
                    moment(parseInt(time_c.$numberLong || time_c)).format(format) :
                    "";

                // Fixed: More robust handling of authorList creation
                let authorList = [];
                if (Array.isArray(emailto) && emailto.length) {
                    authorList = emailto;
                } else if (typeof emailtolist === "string" && emailtolist.trim()) {
                    authorList = emailtolist.split(",").map(email => email.trim()).filter(email => email);
                } else if (typeof emailto === "string" && emailto.trim()) {
                    authorList = emailto.split(",").map(email => email.trim()).filter(email => email);
                }

                // Fixed: Additional safety check before filter
                const otherAuthors = Array.isArray(authorList) && authorList.length ?
                    authorList.filter(e => e && e !== USER_INFO.MAIL_ID) : [];

                const showRole = rolename && corole ? `Co ${rolename}` : rolename || "";
                const coRoleData = couseremail ? `(shared by ${couseremail} on ${localTime})` : "";
                if (couseremail && status != "active") {
                    LiveCouser.push({
                        sharedBy: couseremail,
                        username: emailto,
                        status
                    });
                }

                // ? Lookup for finalized authors
                const finalizedMap = finalized_by
                    .filter(f => f.status !== "active" && f.email && f.email.trim() !== "")
                    .reduce((acc, f) => {
                        acc[f.email] = f;
                        return acc;
                    }, {});

                return otherAuthors.map(authorId => {
                    let lastAccess = "";
                    let status = "Yet not accessed";

                    // Finalized state
                    const finalized = finalizedMap[authorId];
                    if (finalized) {
                        const ts = finalized.timestamp || finalized.time_c || null;
                        lastAccess = ts ? moment(parseInt(ts.$numberLong || ts)).format(format) : "-";
                        status = finalized.status === "signoff" ? "Reviewed" : "Reviewing";
                    }

                    // Saved activity override
                    const saved = filterSaveData.find(f => f.uniqueKey === `${authorId}Sho${role}`);
                    if (saved && saved.time_c) {
                        lastAccess = moment(parseInt(saved.time_c.$numberLong || saved.time_c)).format(format);

                        if (lockedInfo.byOthersEmailList.includes(authorId)) {
                            // actively locked by someone else
                            status = "Reviewing";
                        } else {
                            // accessed but not locked now
                            status = "Accessed";
                        }
                    }

                    return `<tr data-email="${authorId}">
                        <td>${authorId}</td>
                        <td>${lastAccess}</td>
                        <td>${status}</td>
                        <td>${showRole} ${coRoleData}</td>
                </tr>`.trim();
                });
            }).join("");



            const determineStageKey = (lockedInfo, liveCoUser) => {
                if (lockedInfo.byOthers.length) return "active";
                if (!liveCoUser.length) return "finalize";
                return "non_active";
            };

            const key = determineStageKey(lockedInfo, LiveCouser);
            var renderData = this._state.collaborativeStages[key];

            this._state.displayRows = rows;
            if (rows) {
                // let the retry logic handle DOM updates
                this.updateCollabTable(rows, renderData);
            }
        } catch (error) {
            console.warn("refreshCollaborativeStatus error:", error.message);
        }
    }

    StageRenderFooter(buttons, options = {}) {

        const self = this;

        try {
            const order = Array.from(self.elements.actionButtons).reverse();
            const allEmpty = buttons.every(b => !Object.keys(b).length);
            if (allEmpty) {
                self.elements.footer.classList.add("invisible");
                return;
            }
            self.elements.footer.classList.remove("invisible");
            buttons.forEach((btn, idx) => {
                const el = order[idx];
                if (!Object.keys(btn).length) {
                    el.classList.add("invisible");
                    return;
                }
                el.classList.remove("invisible");
                el.id = btn.id || "";
                el.title = btn.title || "";
                el.innerText = btn.text || "";
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("StageRenderFooter", err.message);
        }
    }


    _renderStageText(rawText, stageKey) {
        const self = this;
        const textParams = {
            docType: self._state.docType,
            openAQCount: self._state.openAqCount,
            role: self._state.isPrimaryAuthor ? "default" : "CO_ROLE"
        };
        let finalText = rawText;
        if (stageKey == "finalize_pass" && typeof rawText == "object") {
            finalText = rawText[DOC_DTD][textParams.role];
        }

        try {
            return Mustache.render(String(finalText || ""), textParams);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace(stageKey, err.message);
            return String(finalText || "");
        }
    }



    /**
     * Converts the raw, JSON-safe STAGES_DATA (loaded via supportingFiles as a lazy file)
     * into the self._state.stages shape that StageView/StageRenderBody consume, restoring
     * "function mode" for any stage whose text/title depends on runtime state.
     */
    _hydrateStages(rawStages) {
        const self = this;
        const stages = {};
        try {
            Object.entries(rawStages || {}).forEach(([key, cfg]) => {
                stages[key] = {
                    ...cfg,
                    title: self._renderStageText(cfg.title, key),
                    text: self._renderStageText(cfg.text, key)
                };
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("_hydrateStages", err.message);
        }
        return stages;
    }


    StageRenderBody(icon, title, spin, text, options = {}) {

        const self = this;

        try {
            // Header
            self.elements.headerTitle.textContent = title;
            if (icon) self.elements.headerImage.src = `assets/images/svg/alert/${icon}.svg`;
            // Body
            self.elements.bodyText.innerHTML = text;
            self.elements.bodySpinner.classList[spin ? "remove" : "add"]("ds-none");
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("StageRenderBody", err.message);
        }
    }

    /**
     * Disable standalone logout while Finalize owns focus; re-enable on cancel/close.
     * @param {boolean} enabled
     */
    setLogoutEnabled(enabled) {
        try {
            const btn = document.getElementById('log_out_btn');
            const group = document.getElementById('logoutGroup');
            if (btn) {
                btn.setAttribute('aria-disabled', String(!enabled));
                if (enabled) {
                    btn.removeAttribute('disabled');
                } else {
                    btn.setAttribute('disabled', 'disabled');
                }
            }
            if (group) {
                group.classList.toggle('is-disabled', !enabled);
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('setLogoutEnabled', err.message);
        }
    }

    /**
     * Re-enable logout when Finalize is dismissed.
     */
    async postCloseModule() {
        try {
            this.currentStage = '';
            this.setLogoutEnabled(true);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('postCloseModule_finalize', err.message);
        }
        return true;
    }

    StageView(StageKey, options = {}) {

        const self = this;

        try {
            const stage = self._state.stages[StageKey];
            if (!stage) return;
            self.currentStage = StageKey;
            this.setLogoutEnabled(false);
            // ⬇ destructure stage
            var {
                title = "", icon = "WARNING", text = "", spin = "", btn1 = {}, btn2 = {}
            } = stage;

            this.StageRenderBody(icon, title, spin, text);

            // Add query count attr if needed
            if (/query_open/.test(StageKey)) {
                self.elements.bodyText.setAttribute("data-count", self._state.openAqCount);
            } else {
                self.elements.bodyText.removeAttribute("data-count");
            }
            // Footer buttons
            const buttons = [btn1, btn2];
            this.StageRenderFooter(buttons);

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace("StageView", err.message);
        }
    }

    checkMissingCiteItems() {

        const self = this;

        try {
            const missingItems = GlobalEditor.document
                .find("[id][data-cite-delete-warn]")
                .toArray()
                .filter(Boolean);

            if (!missingItems.length) return [];

            // Mapping class substrings → readable type
            const TYPE_MAP = {
                "ref": "Reference",
                "fn": "Footnote",
                "fig": "Figure",
                "table-wrap": "Table",
                "eq": "Equation"
            };

            // Grouped result
            const grouped = {
                "Reference": [],
                "Footnote": [],
                "Figure": [],
                "Table": [],
                "Equation": []
            };

            const getLabel = (node, className, id) => {
                let label = node.getAttribute("data-label");

                if (!label) {
                    const child = node.findOne("[data-label], .label");
                    label = child ? (child.getAttribute("data-label") || child.getText()) : "";
                }

                if (iREF_SCOPE.IS_NAME_DATE && className === "ref") {
                    const result = new namedCitation([id]).CITE_COLLECTION[0].citation_txt_org;
                    label = $("<div>").append(result.indirect).text();
                }

                return label || "";
            };

            // Build grouped items
            missingItems.forEach((item) => {
                const className = item.getAttribute("class") || "";
                const id = item.getAttribute("id");
                const label = getLabel(item, className, id);

                let foundType = "unknown";
                for (const key in TYPE_MAP) {
                    if (className.includes(key)) {
                        foundType = TYPE_MAP[key];
                        break;
                    }
                }

                const selector = commonMethods.xrefSelectorBuilder(id);
                const cites = commonMethods.missingItemSelector(selector);
                if (cites.length > 0) {
                    const cleanLabel = label.replace(/\.$/, "");
                    if (cleanLabel) grouped[foundType].push(cleanLabel);
                } else {
                    item.removeAttribute("data-cite-delete-warn");
                }
            });

            // Build final alert in the format you requested
            const finalAlert = [];

            for (const key in grouped) {
                const values = grouped[key];
                if (!values.length) continue;

                const joinedVal = values.join(", ");
                const lowerKey = key.toLowerCase();

                // Ignore prefixes for figure + table items (use values ONLY)
                if (/^fig|^table/i.test(lowerKey)) {
                    finalAlert.push(joinedVal);
                    continue;
                }

                // For reference, footnote, equation → prefix label
                const label = values.length === 1 ? key : `${key}s`;
                finalAlert.push(`${label} ${joinedVal}`);
            }


            // Save the flattened final alerts (optional)
            self._state.citationAlerts = finalAlert;

            // Build the readable message for UI
            self.buildMissingMessage = function() {
                if (!finalAlert.length) return "";

                const readable =
                    finalAlert.length > 1 ?
                    finalAlert.slice(0, -1).join(", ") + " and " + finalAlert[finalAlert.length - 1] :
                    finalAlert[0];

                return `
                            The following item(s) are not cited anywhere in the document:<br>
                            <b>${readable}</b>.<br>
                            Please cite ${finalAlert.length > 1 ? "these items" : "this item"}
                            or delete ${finalAlert.length > 1 ? "them" : "it"} to proceed with finalizing.
                `;
            };

            // Create stage key if not present
            if (!self._state.missingStageKey) {
                self._state.missingStageKey = "missing_citation_stage_" + Date.now();
            }

            const stageKey = self._state.missingStageKey;

            // Insert stage only once
            if (!self._state.stages[stageKey]) {
                const newStage = {
                    "delete_cite_warn": {
                        title: "Missing Citation Validation",
                        icon: "WARNING",
                        text: () => self.buildMissingMessage(),
                        spin: false,
                        btn1: {
                            id: "Cancelfina",
                            title: "OK",
                            text: "OK"
                        },
                        btn2: {}
                    }
                };

                const entries = Object.entries(self._state.stages);
                entries.splice(1, 0, ...Object.entries(newStage));
                self._state.stages = Object.fromEntries(entries);
            }

            return finalAlert;

        } catch (error) {
            console.warn("checkMissingCiteItems error", error);
            return [];
        }
    }

    async showLoop(param1, param2, param3) {
        const self = this;

        try {
            await this._ensureReady();
            this.flowPhase = 'precheck';

            if (!self._state.stages) {
                if (!self.FINALIZE_DIALOG_MESSAGES || !self.FINALIZE_DIALOG_MESSAGES.stages) {
                    ErrorLogTrace('FinalizeDialog_showLoop', 'STAGES_DATA not loaded yet');
                    return;
                }
                self._state.stages = self._hydrateStages(self.FINALIZE_DIALOG_MESSAGES.stages);
                self._state.collaborativeStages = self._hydrateStages(self.FINALIZE_DIALOG_MESSAGES.collaborative_stages);
            }

            self.StageView("loading");
            var setStage = "finalize";
            const queryModule = window.queryModule;
            if (queryModule && !queryModule.restoreModule) {
                setTimeout(() => {
                    self.showLoop(param1, param2, param3);
                }, 333);
                return;
            }

            let isCountMismatch = false;
            let openQueryCount = [];

            if (queryModule && typeof queryModule.isCountMismatch === "function") {
                isCountMismatch = queryModule.isCountMismatch();
            }

            //  check query count mismatch
            if (isCountMismatch) {
                setStage = "query_mismatch";
                ErrorLogTrace('QUERY_COUNT_MISMATCH', "QUERY_COUNT_MISMATCH");

            } else {

                // 1️⃣ Check abstract validity
                var isAbstractValid = true;
                if (window.AbstractWordCounter) {
                    isAbstractValid = AbstractWordCounter.beforeCheckFinalize();
                    if (!isAbstractValid) {
                        self.currentStage = '';
                        self.setLogoutEnabled(true);
                        return;
                    }
                }

                // 2️⃣ Check query counts
                // 3️⃣ Check  open queries
                if (queryModule && typeof queryModule.getOpenQueries === "function") {
                    openQueryCount = queryModule.getOpenQueries(true);
                }
                self._state.openAqCount = openQueryCount.length;

                const nextRole = SHARED_KEY.nextrole && SHARED_KEY.nextrole.role;
                const resolved = this._deps.resolvePrecheckStage({
                    isCountMismatch: false,
                    abstractInvalid: false,
                    openQueryCount: openQueryCount.length,
                    isPrimaryAuthor: self._state.isPrimaryAuthor,
                    editorComesFirst: self._state.isEditorComesFirst,
                    editorOnly: self._state.isEditorOnly,
                    wflow: SHARED_KEY.wflow || '',
                    hasNextRole: !!nextRole,
                    nextRoleIsCo: nextRole === ROLE_IDS.CO,
                    isAuthor: !!USER_INFO.IS_AUTHOR,
                    isCollabEnabled: typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID),
                    missingCiteCount: 0
                });
                setStage = resolved.stage || "finalize";

                // 4️⃣ Collab status fetch when collaborative_status selected
                if (setStage === "collaborative_status") {
                    let js_on = GET_JSON('get_corole_info');
                    delete js_on.find.corole;

                    let save_js_on = Object.assign({}, js_on, {
                        tbl: 'Fileslist'
                    });
                    commonfn.callajax(save_js_on, 'filterSaveData', API_GET_DOCS, self);
                    commonfn.callajax(js_on, 'refreshCollaborativeStatus', API_GET_DOCS, self);
                    if (self.Panel) {
                        var container = self.Panel.querySelector(".dialog-container");
                        if (container) {
                            container.classList.remove("md-5");
                        }
                    }
                }
            }

            var results = self.checkMissingCiteItems();
            if (results.length > 0) {
                setStage = "delete_cite_warn";
            }

            //  Update stage view
            self.StageView(setStage);
            this.flowPhase = 'confirm';

            if (self._state.workFlow == null && SHARED_KEY.linkinfo != "pubkit") {
                self.Validateworkflow({
                    fetchworkflow: true,
                    redirect: false
                });
            }
            ['gotoquery', 'finaliz', 'Cancelfina', "logOff"].forEach((id) => {
                var ELM = document.getElementById(id);
                if (ELM == null) return false;
                ELM.onclick = function(e) {
                    try {
                        if (["gotoquery", "logOff"].includes(this.id)) {
                            if (this.id == "gotoquery") {
                                $('#btn_qry,#qOpenCountDiv').click();
                            } else {
                                // ? SAVE - LOG-OFF - RE_DIRECT
                                LOG_OUT.fire({
                                    no_warn_alert: true,
                                    source: "finalize_logout"
                                });
                            }
                            self.closeDialog();
                        } else if (['finaliz', 'Cancelfina'].includes(this.id)) {
                            if (this.id == 'finaliz') {
                                self.StageView("finalize_next");
                                const startCommit = () => {
                                    self.runFlow('commit', {
                                        redirect: true
                                    });
                                };
                                if (self._state.workFlow == null && SHARED_KEY.linkinfo != "pubkit") {
                                    self.Validateworkflow({
                                        fetchworkflow: true,
                                        redirect: true
                                    });
                                } else if ((self._state.workFlow && self._state.workFlow.data) || (SHARED_KEY.linkinfo == "pubkit")) {
                                    startCommit();
                                }
                            } else {
                                self.currentStage = '';
                                self.setLogoutEnabled(true);
                                self.Panel.classList.add('ds-none');
                            }
                        }
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('ELM.onclick', err.message);
                    }
                };
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FinalizeDialog_showLoop', err.message);
        }
    }

    showBefore(param1, param2, param3) {

        const self = this;

        try {
            if ((USER_INFO.ROLE_ID == ROLE_IDS.CO) && CROSS_LINKS_VALIDATION && !CROSS_LINKS_VALIDATION.Showed) {
                CROSS_LINKS_VALIDATION.show();
                return false;
            } else return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FinalizeDialog_showLoop', err.message);
        }
    }

    Validateworkflow(Options) {

        const self = this;

        try {
            if (!SHARED_KEY['identifier']) {
                return;
            }
            Options = !Options ? {
                fetchworkflow: true,
                redirect: false
            } : Options;
            var jsondata = {
                "tbl": "workflow",
                "find": {
                    "doi": SHARED_KEY['identifier'],
                    "status": "active",
                    "workflow": DOC_DTD
                },
                "length": 1,
                "sort": {
                    'time_c': -1
                },
                "filter": ["emailto", "doi", 'editor_email', 'collator_email', 'editor_role', 'collator_role']
            };
            commonfn.callajax(jsondata, 'Work_Flow_Return', API_GET_DOCS, Options);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Validateworkflow', err.message);
        }
    }

    userTrackData(flow = "all", Options = {}) {

        const self = this;

        /* 
            ? 3449869: Integration of IMPACT Correction Count in Pubkit - YA - 27-JAN-26
            ? 2839604: Impact dashboard

        */
        try {
            var DEFAULT_DATA = {
                Eq: 0,
                Ref: 0,
                Merge: 0,
                Split: 0,
                Style: 0,
                Query: 0,
                Insert: 0,
                Delete: 0,
                forMat: 0,
                Comment: 0,
                NewFloat: 0,
                ListStyle: 0,
                HeadStyle: 0,
                InsertPara: 0,
                ReplaceText: 0
            };

            var PUBKIT_KEYS = ["Query", "Insert", "Delete", "forMat", "Comment"];

            var data =
                (typeof trackDialog !== "undefined" &&
                    trackDialog.M_FUN &&
                    typeof trackDialog.M_FUN.All_Count_Details_Current_User === "function") ?
                trackDialog.M_FUN.All_Count_Details_Current_User() :
                DEFAULT_DATA;

            // 🔹 PUBKIT FLOW
            if (flow === "pubkit") {
                var result = {};
                for (var i = 0; i < PUBKIT_KEYS.length; i++) {
                    var k = PUBKIT_KEYS[i];
                    result[k] = data[k] || 0;
                }
                return result;
            }

            // 🔹 DEFAULT FLOW
            return Object.assign({}, DEFAULT_DATA, data);

        } catch (e) {
            return {};
        }
    }

    getAttachmentList() {

        const self = this;


        const attributes = ['data-db-id', 'data-file-id'];

        try {

            const getIdWithoutExt = (el) => {
                const dbId = el.getAttribute('data-db-id');
                const fileId = el.getAttribute('data-file-id');
                const hasExt = (str) => /\.[^/.]+$/.test(str);
                if (dbId && !hasExt(dbId)) {
                    return dbId;
                }
                if (fileId && !hasExt(fileId)) {
                    return fileId;
                }
                return null;
            };

            const itemArray = (selector) => {
                const list = GlobalEditor.document.find(selector).toArray();
                // prevent duplicates
                const loopItems = new Set();

                list.forEach(element => {
                    // Skip if parent has data-deleted attribute

                    const ancestor = commonMethods.getAscent(element, '[data-class]', ['ckcommentsfull']);
                    if (ancestor && ancestor.hasAttribute('data-deleted')) {
                        // skip this deleted comment
                        return;
                    }

                    const value = getIdWithoutExt(element);

                    if (value) loopItems.add(value);
                });
                return Array.from(loopItems);
            };

            const roleNames = [
                USER_INFO.TRACK_ROLE_NAME,
                USER_INFO.ROLE_NAME,
                "Co-" + USER_INFO.ROLE_NAME
            ];

            const roleSelector = roleNames
                .flatMap(role =>
                    attributes.map(attr =>
                        `[data-rolename="${role}"][${attr}]`
                    )
                )
                .join(', ');

            const overallSelector = attributes
                .map(attr => `[${attr}]`)
                .join(', ');

            if (USER_INFO.ROLE_ID === ROLE_IDS.CO) {

                const allItems = itemArray(overallSelector);
                const roleItems = itemArray(roleSelector);

                return {
                    attachmentslist: roleItems,
                    overallattachmentslist: allItems
                };
            }

            return {
                attachmentslist: itemArray(roleSelector)
            };

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('getAttachmentList', err.message);

            return {
                attachmentslist: []
            };
        }
    }

    async CloseSharedStatus(Options) {
        const self = this;

        /* 
        ! DB - LINK-SHARE ? change doc_status 1 to 0;
        ! DB - SHARE_INVITE ? change status active to sign-off;
        Flow commit: legacy multi-AJAX OR combined saveWithLogout / saveWithFinalize
        */
        try {
            await this._ensureReady();
            if (!Options || !Options.redirect) {
                return;
            }

            this.flowPhase = 'commit';
            const caps = this.getCapabilities(Options.capabilities);
            const mode = this._deps.resolveCommitMode(caps);
            let done = {
                ...(Options._backendDone || {}),
                ...(this._commitDone || {})
            };

            const isCollabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);
            const logoutProcess = isCollabEnabled ? "signoff" : "close";

            // Persist query snapshot before combine commit (FE-owned; not in combine API body)
            if (mode !== 'legacy' && !this._deps.shouldSkipCommitStep(caps, 'querySnapshot', done)) {
                try {
                    if (window.queryModule && typeof window.queryModule.persistFinalQuerySnapshot === "function") {
                        window.queryModule.persistFinalQuerySnapshot();
                    }
                } catch (snapErr) {
                    console.warn(snapErr.message || snapErr);
                    ErrorLogTrace('persistFinalQuerySnapshot', (snapErr && snapErr.message) ? snapErr.message : "snapshot save failed");
                }
                done.querySnapshot = true;
            }

            // --- Combined path: saveWithFinalize (v2) or saveWithLogout ---
            if (mode !== 'legacy' && !this._deps.shouldSkipCommitStep(caps, 'saveCloseShare', done)) {
                const combinedResult = await this.runCombinedFinalizeCommit({
                    caps,
                    mode,
                    process: logoutProcess,
                    Options
                });
                if (!combinedResult.success) {
                    this.StageView("finalize_retry");
                    return;
                }
                done = {
                    ...done,
                    ...combinedResult.done
                };
                this._commitDone = done;
                Options._shareResponse = combinedResult.shareResponse;

                // v2: single savewithfinalize owns commit sub-stack — go directly to post phase
                if (mode === 'saveWithFinalize') {
                    await this.closesharedpost(Options._shareResponse);
                    return;
                }
            } else if (mode === 'legacy' && !this._deps.shouldSkipCommitStep(caps, 'forceSaveClose', done)) {
                // stage 1 - closing session - log-out (legacy parity)
                await window.LOG_OUT.fire({
                    noWarnAlert: true,
                    noRedirect: true,
                    noAlert: true,
                    regenerate: 'package',
                    lockfile: true,
                    lockParaId: ["0"],
                    remarks: "signoff",
                    process: logoutProcess,
                    source: "finalize",
                    logoutEvent: "Finalize"
                });
                done.forceSaveClose = true;
                done.closeSession = true;
            }

            // stage 2 - updating correction count in db
            if (!this._deps.shouldSkipCommitStep(caps, 'correctionCount', done)) {
                var CORR_COUNT_OBJ = GET_JSON('set_correction_count', {});
                CORR_COUNT_OBJ.info = self.userTrackData();
                commonfn.callajax(CORR_COUNT_OBJ, 'UPDATE_COUNT', API_UPDATE_INSERT);
                done.correctionCount = true;
            }

            // stage 2.1 - legacy path only
            if (mode === 'legacy' && !this._deps.shouldSkipCommitStep(caps, 'querySnapshot', done)) {
                try {
                    if (window.queryModule && typeof window.queryModule.persistFinalQuerySnapshot === "function") {
                        window.queryModule.persistFinalQuerySnapshot();
                    }
                } catch (snapErr) {
                    console.warn(snapErr.message || snapErr);
                    ErrorLogTrace('persistFinalQuerySnapshot', (snapErr && snapErr.message) ? snapErr.message : "snapshot save failed");
                }
                done.querySnapshot = true;
            }

            // stage 3 - major/main ShareInvite sign-off (legacy / saveWithLogout only)
            if (!this._deps.shouldSkipCommitStep(caps, 'shareSignoff', done) && !this._deps.shouldSkipCommitStep(caps, 'saveCloseShare', done)) {
                console.log("Status Changed to SignOff");

                var SHARE_OBJ = GET_JSON('Shareandinvite', {
                    signoff: true
                });
                SHARE_OBJ.update = SHARE_OBJ.update || {};
                var attachmentsJson = self.getAttachmentList() || {
                    attachmentslist: []
                };
                Object.assign(SHARE_OBJ.update, attachmentsJson);
                commonfn.callajax(SHARE_OBJ, 'closesharedpost', API_FIND_UPDATE_INSERT, self);

                // step-4 — CLOSE OTHER ROLES UPDATE THE TIME_STAMP
                if (!this._deps.shouldSkipCommitStep(caps, 'updateSignOffTime', done)) {
                    if (ROLE_IDS.CO != USER_INFO.ROLE_ID && !USER_INFO.IS_CO_ROLE) {
                        var UPDATE_TIME_ON = GET_JSON('Shareandinvite', {
                            updateSignOffTime: true,
                            time: SHARE_OBJ.update['signouttime']
                        });
                        debug.log(UPDATE_TIME_ON);
                        commonfn.callajax(UPDATE_TIME_ON, 'updateSignOffTime', API_FIND_UPDATE_INSERT, self);
                    }
                    done.updateSignOffTime = true;
                }
            } else {
                // Backend already signed off ShareInvite — continue post phase
                this.flowPhase = 'post';
                await this.closesharedpost(Options._shareResponse || {
                    r: 1,
                    _fromCombined: true
                });
            }

            this._commitDone = done;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CloseSharedStatus', err.message);
        }
    }

    /**
     * Combined save+session(+share) for finalize via saveWithLogout or saveWithFinalize v2.
     */
    buildSaveWithFinalizeExtras(caps = {}) {
        const attachmentResult = this.getAttachmentList() || {
            attachmentslist: []
        };
        const isCollator = typeof USER_INFO !== 'undefined' && USER_INFO.ROLE_ID === ROLE_IDS.CO;
        const attachments = this._deps.resolveFinalizeAttachments(attachmentResult, isCollator);
        const fullTrack = this.userTrackData();
        const pubkitInfo = this.userTrackData('pubkit');
        const sharedId = (typeof SHARED_KEY !== 'undefined' && SHARED_KEY._id) ? SHARED_KEY._id : undefined;
        const trackPDF = this._state && this._state.trackPDF;

        let pubkitConfig = null;
        if (typeof SHARED_KEY !== 'undefined' && SHARED_KEY.roletaskid) {
            pubkitConfig = this.getPubKitConfigJSON();
        }

        return this._deps.buildSaveWithFinalizeExtras({
            sharedId,
            trackPDF,
            pubkitInfo,
            fullTrack,
            attachments,
            pubkitConfig
        });
    }

    async runCombinedFinalizeCommit({
        caps,
        mode,
        process,
        Options
    }) {
        try {
            await this._ensureReady();
            const attachmentsJson = this.getAttachmentList() || {
                attachmentslist: []
            };

            let extras;
            if (mode === 'saveWithFinalize') {
                extras = this.buildSaveWithFinalizeExtras(caps);
            } else {
                extras = {
                    correctionCount: !caps.correctionCount ? this.userTrackData() : undefined,
                    attachmentslist: attachmentsJson.attachmentslist,
                    signoff: true,
                    finalize: true
                };
            }

            const logoutOpts = {
                noWarnAlert: true,
                noRedirect: true,
                noAlert: true,
                regenerate: 'package',
                lockfile: true,
                lockParaId: ["0"],
                remarks: "signoff",
                process: process,
                source: "finalize",
                logoutEvent: "Finalize",
                useCombinedSave: true,
                useSaveWithFinalize: mode === 'saveWithFinalize',
                finalizeExtras: extras
            };

            let response;
            if (window.LOG_OUT && typeof window.LOG_OUT.saveWithFinalizeOrLogout === 'function') {
                response = await window.LOG_OUT.saveWithFinalizeOrLogout(logoutOpts);
            } else if (window.LOG_OUT && typeof window.LOG_OUT.saveWithLogout === 'function') {
                response = await window.LOG_OUT.saveWithLogout(logoutOpts);
            } else {
                response = await window.LOG_OUT.fire(logoutOpts);
            }

            const raw = (response && response.response) ? response.response : (response || {});

            if (response && (response.error || (!response.success && !response.saveSuccess && response.r !== 1 && !raw.save))) {
                const mappedFail = this._deps.mapCombinedResponseToDone(raw, caps);
                if (!mappedFail.success) {
                    return {
                        success: false,
                        done: mappedFail.done,
                        shareResponse: mappedFail.shareResponse
                    };
                }
            }

            const mapped = this._deps.mapCombinedResponseToDone(raw, caps);

            this._commitResponse = raw;

            if (mapped.shareResponse && mapped.shareResponse.key) {
                this._state = this._state || {};
                this._state.auKey = mapped.shareResponse.key;
            }

            return mapped;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('runCombinedFinalizeCommit', err.message);
            return {
                success: false,
                done: {},
                shareResponse: {
                    r: 0,
                    m: err.message
                }
            };
        }
    }

    coRoleFinalize() {

        const self = this;

        try {
            // <p>To access the proof, please <a href="{{au_key}}">click here</a>.</p>
            var MAIL_BODY = self.GetTemplate(self._state.finalize.coRoleMail, {
                frag: false,
                alert_msg: true,
                identifier: SHARED_KEY.identifier,
                projecttitle: SHARED_KEY.projecttitle,
                currenturl: SHARED_KEY.currenturl,
                au_key: self._state.auKey,
                // 27_JUNE_23_YA
                role: USER_INFO.ROLE_NAME,
                role1: USER_INFO.ROLE_NAME.toLocaleLowerCase(),
                usermail: USER_INFO.MAIL_ID_PREFIX
            });
            const sharedLinkFrom = SHARED_KEY && SHARED_KEY.linkfrom;
            let AuthorMail = "";
            if (Array.isArray(sharedLinkFrom)) {
                AuthorMail = sharedLinkFrom.filter(Boolean).join(",");
            } else if (typeof sharedLinkFrom === "string") {
                AuthorMail = sharedLinkFrom.split(",").map(email => email.trim()).filter(Boolean).join(",");
            } else if (sharedLinkFrom && typeof sharedLinkFrom === "object") {
                AuthorMail = Object.values(sharedLinkFrom).filter(Boolean).join(",");
            }

            if (!AuthorMail && IS_LOCAL_HOST) {
                AuthorMail = USER_INFO.MAIL_ID || "";
            }

            const senderInfo = (typeof OBJ_SEN_REC_ID !== "undefined" && OBJ_SEN_REC_ID) ? OBJ_SEN_REC_ID : {};
            const AuthorMailFrom = senderInfo.from || senderInfo.emailfrom || USER_INFO.MAIL_ID || "";
            if (!AuthorMailFrom || !AuthorMail) {
                ErrorLogTrace('coRoleFinalize', "Missing emailto/emailfrom for finalize mail");
                return;
            }

            var MailInfo = {
                "tbl": "emaildraft",
                "emailfrom": AuthorMailFrom,
                "emailto": AuthorMail,
                // ? SEAN UPDATE MAIL TEMPLATE 17_JUNE_2023 - USER_INFO.MAIL_ID CC EMPTY
                'emailCC': "",
                'emailBCC': "",
                "emailSubject": "Author Submitted - " + SHARED_KEY.identifier,
                "emailMessage": MAIL_BODY,
                "recordtype": "finalizebycorole"
            };
            Object.assign(MailInfo, GET_JSON("default"));
            if (IS_LOCAL_HOST) {
                let idx = SHARE_USER_IDs.indexOf(USER_INFO.MAIL_ID_PREFIX);
                if (idx < 3) {
                    MailInfo.emailto = MailInfo.emailBCC = USER_INFO.MAIL_ID;
                }
            }
            debug.log(MailInfo);
            commonfn.callajax(MailInfo, 'reply_author_post', API_GENERIC_SEND_MAIL, self);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('coRoleFinalize', err.message);
        }
    }

    async FIRE_SURVEY() {

        const self = this;

        try {
            this.closeDialog();

            const {
                "external-survey": externalSurvey,
                "internal-survey": internalSurvey,
                "survey-before-prompt": surveyBeforePrompt,
                "google-form": googleForm
            } = this._state.survey;

            const surveyConfig = {
                isCoRole: !this._state.isPrimaryAuthor,
                isInternalSurvey: internalSurvey === "true",
                shouldShowSurveyPrompt: surveyBeforePrompt === "true",
                isGoogleForm: googleForm === "true",
                canShowRoleWise: IsContextMenu("survey", {
                    check_co_role: !this._state.isPrimaryAuthor
                })
            };

            CHECK_REQUEST.cancel(CHECK_REQUEST.SCHEDULER);

            const openSurvey = () => {
                if (!surveyConfig.canShowRoleWise || (!externalSurvey && !surveyConfig.isInternalSurvey)) {
                    return true;
                }

                try {
                    // ? 3395509: LWW - UK - Author Survey - RJ - 25_Jun_2025
                    if (externalSurvey) {
                        var finalSurvey = externalSurvey;
                        const identifier = SHARED_KEY.identifier.split('/').pop();
                        if (SHARED_KEY.client == "LWW" && /UK/gi.test(SHARED_KEY.division)) {
                            finalSurvey = this._state.survey['external-survey-uk'];
                        }
                        // ? FILE ID REMOVED FROM URL PARAMS -  BUG FOR BOOK DIVISION - 03_APR_2023 - YA
                        const surveyUrl = surveyConfig.isGoogleForm ?
                            `${finalSurvey}?usp=pp_url&entry.2051340306=${identifier}` :
                            `${finalSurvey}`; // ?fileid=${identifier}

                        window.open(surveyUrl, '_blank');
                        return true;
                    }

                    if (surveyConfig.isInternalSurvey) {
                        SURVEY_FEEDBACK.fire({
                            postfun: "RE_DIRECT_CUR_SESSION"
                        });
                        return true;
                    }

                    return false;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('openSurvey', err.message);
                    return true;
                }
            };

            // Survey flow decision tree
            if (surveyConfig.canShowRoleWise && (externalSurvey || surveyConfig.isInternalSurvey)) {
                if (surveyConfig.shouldShowSurveyPrompt) {
                    const result = await AlertNewDialog.fire("SIGN_OFF_SURVEY");

                    if (result.isConfirmed) {
                        openSurvey();
                    }
                } else if (surveyConfig.isInternalSurvey) {
                    openSurvey();
                }
            }

            // Redirect in all cases
            RE_DIRECT_CUR_SESSION();

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FIRE_SURVEY', err.message);
        }
    }

    reDirectReadOnly() {

        const self = this;

        try {
            this.flowPhase = 'exit';
            if (!self.CanReDirect) {
                self.CanReDirectCount++;
                setTimeout(() => self.reDirectReadOnly(), 1750);
                if (IS_LOCAL_HOST) debug.log(self.CanReDirectCount);
                return;
            } else if (self.CanReDirectCount > 10) self.CanReDirect = true;
            setTimeout((self) => {
                self.StageView("finalize_pass");
            }, 2250, self);
            [_CanClose, _IsDirty] = [true, false];
            GlobalEditor.resetDirty();
            setTimeout(() => {
                self.FIRE_SURVEY();
            }, 5000);
        } catch (err) {
            [_CanClose, _IsDirty] = [true, false];
            console.warn(err.message);
            ErrorLogTrace('reDirectReadOnly', err.message);
            window.location.href = (sessionStorage.getItem("redirect") ? (sessionStorage.getItem("redirect")) : (NG_WEB_URL));
        }
    }

    ShareFromWorkflow(response) {

        const self = this;

        try {
            var [SendMailID, SendMailRole, result, assigned] = [null, null, null, false];
            if (response.data.length > 0) {
                result = response.data[0];
            }
            debug.log(result.PE_email, result.author_email, result.collator_email);
            if ( /* [ROLE_IDS.AU, ROLE_IDS.PE, ROLE_IDS.ED].includes(USER_INFO.ROLE_ID) */ USER_INFO.ROLE_ID) {
                let split_mail = ROLE_IDS[USER_INFO.ROLE_ID]["next_mail"].split(",");
                ROLE_IDS[USER_INFO.ROLE_ID]["next_role"].split(",").forEach((role, idx, arr) => {
                    if (result[role] && result[split_mail[idx]] && !assigned) {
                        SendMailRole = result[role];
                        SendMailID = result[split_mail[idx]];
                        assigned = true;
                    }
                });
            }
            if ((USER_INFO.ROLE_ID == ROLE_IDS.CO) || !SendMailID || !SendMailRole) {
                // ? 'Collator' other roles
                self.reDirectReadOnly();
                return;
            }
            (async () => {
                try {
                    let shareMod = window.shareInviteDialogModule || window.ShareInviteDialog;
                    if (typeof moduleSystem !== 'undefined' && moduleSystem.getModule) {
                        shareMod = await moduleSystem.getModule('shareInviteDialogModule');
                        window.ShareInviteDialog = shareMod;
                    }
                    const templateList = (shareMod && shareMod.templateList) || {};
                    let emailBody = templateList.defaultShare;
                    if (!emailBody && typeof GET_CONFIG_ITEM === 'function') {
                        emailBody = (GET_CONFIG_ITEM('shareInvite', {
                            CONVERT_JSON: true,
                            attr: true,
                            hex2string: true,
                            children: false
                        }) || {}).defaultShare;
                    }
                    var jsondata = shareMod.SHARE_DOCUMENT({
                        autoshare: true,
                        rolebase: false,
                        emailBody: emailBody
                    });
                    jsondata['emailto'] = SendMailID;
                    jsondata['role'] = SendMailRole;
                    jsondata['rolename'] = ROLE_IDS[SendMailRole]['name'];
                    console.log(JSON.stringify(jsondata));
                    if (IS_LOCAL_HOST) {
                        jsondata.emailto = jsondata.emailBCC = jsondata.emailCC = USER_INFO.MAIL_ID;
                    }
                    commonfn['callajax'](jsondata, 'autoshareformpost', API_SHARE_INVITE, self);
                } catch (innerErr) {
                    console.warn(innerErr.message);
                    ErrorLogTrace('ShareFromWorkflow', innerErr.message);
                    self.reDirectReadOnly();
                }
            })();
            return;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShareFromWorkflow', err.message);
            self.reDirectReadOnly();
        }
    }

    buildPostPhaseContext() {
        const workflow = this._state && this._state.workFlow;
        const workflowData = workflow && workflow.data;
        const noWorkflow = !workflow || !workflowData || workflowData.length === 0;
        const finalizeCfg = (this._state && this._state.finalize) || {};
        return {
            isPrimaryAuthor: !!(this._state && this._state.isPrimaryAuthor),
            isCollator: typeof USER_INFO !== 'undefined' && USER_INFO.ROLE_ID === ROLE_IDS.CO,
            hasPubkitTask: typeof SHARED_KEY !== 'undefined' && !!SHARED_KEY.roletaskid,
            hasWorkflow: !noWorkflow,
            noWorkflow,
            externalMail: !!finalizeCfg.externalMail
        };
    }

    applyRedirectKeyFromResponse(response = {}) {
        const shareKey = response.key ||
            (this._commitResponse && this._commitResponse.shareandinvite &&
                this._commitResponse.shareandinvite.key);
        if (shareKey) {
            this._state = this._state || {};
            this._state.auKey = shareKey;
        }
    }

    tryEarlyExitPostPhase(response = {}) {
        const caps = this.getCapabilities();
        const done = this._commitDone || {};
        if (!caps.useSaveWithFinalize) {
            return false;
        }
        if (!this._deps.isPostPhaseComplete(done, caps, this.buildPostPhaseContext())) {
            return false;
        }
        this.applyRedirectKeyFromResponse(response);
        this.reDirectReadOnly();
        return true;
    }

    runPostSignoffStatus(response) {
        commonfn.callajax(GET_JSON('signoffstatus', response), 'signoffstatus', API_UPDATE_INSERT);
    }

    runPostCoroleLinkSignoff() {
        const JS_ON = GET_JSON('Shareandinvite', {
            corole_link_signoff: true
        });
        commonfn.callajax(JS_ON, 'closeshared_corole_post', API_FIND_UPDATE_INSERT, this);
    }

    runPostPubkit() {
        const JS_PUBKIT = this.getPubKitConfigJSON();
        commonfn.callajax(JS_PUBKIT, 'task_close_pubkit_post', API_PUBKIT_CLSE_TASK, this);
        commonfn.callajax(GET_JSON('fire_pubkit'), 'fire_pubkit_post', API_UPDATE_INSERT, this);
    }

    runPostCollatorAttachments() {
        const isCollator = typeof USER_INFO !== 'undefined' && USER_INFO.ROLE_ID === ROLE_IDS.CO;
        const attachments = this._deps.resolveFinalizeAttachments(this.getAttachmentList() || {}, isCollator);
        const unique_data_files = attachments.shared_id_attachments || [];
        const json_data = {
            tbl: "attachmentlist",
            docid: DOC_ID,
            doi: SHARED_KEY.identifier,
            attachmentids: unique_data_files,
            role: USER_INFO.ROLE_ID,
            rolename: USER_INFO.ROLE_NAME,
            identifier: SHARED_KEY.identifier
        };
        console.log(json_data);
        commonfn.callajax(json_data, 'docattchmentlist', API_UPDATE_INSERT);
    }

    runPostWorkflowShare() {
        this.ShareFromWorkflow(this._state.workFlow);
    }

    runPostNonPubkitMail() {
        this.NON_PUBKIT_WORKFLOW();
    }

    runPostSignoffFailureAudit() {
        if (!SHARED_KEY.roletaskid) {
            return;
        }
        const jsondata = {
            tbl: "signoffstatus",
            docid: DOC_ID,
            role: USER_INFO.ROLE_ID,
            response: "failed",
            rolename: USER_INFO.ROLE_NAME,
            task_id: SHARED_KEY.roletaskid,
            abstract_task_id: SHARED_KEY.roleabstracttaskid,
            identifier: SHARED_KEY.identifier
        };
        commonfn.callajax(jsondata, 'signoff_post', API_UPDATE_INSERT);
    }

    async closesharedpost(response) {

        const self = this;

        try {
            await this._ensureReady();
            this.flowPhase = 'post';
            const caps = this.getCapabilities();
            const done = this._commitDone || {};
            const ctx = this.buildPostPhaseContext();
            console.log(["shared completion status updated", response]);

            commonfn.signoffstatus = function(signoffResponse) {
                if (signoffResponse.r == 0) ErrorLogTrace('signoffstatus', signoffResponse.m);
            };
            commonfn.docattchmentlist = function(docResponse) {
                console.log(JSON.stringify(docResponse));
            };
            commonfn.signoff_post = function(signoffPostResponse) {
                try {
                    if (signoffPostResponse.r == 0) ErrorLogTrace('signoff_post', signoffPostResponse.m);
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('signoff_post', err.message);
                }
            };

            if (response.r == 0) {
                this.StageView("finalize_retry");
                self.runPostSignoffFailureAudit();
                return;
            }

            if (this.tryEarlyExitPostPhase(response)) {
                return;
            }

            if (!self._state.isPrimaryAuthor) {
                if (!this._deps.shouldSkipCommitStep(caps, 'coRoleMail', done)) {
                    self.applyRedirectKeyFromResponse(response);
                    self.coRoleFinalize();
                }
                self.reDirectReadOnly();
                return debug.log("co role return");
            }

            const remaining = this._deps.resolveRemainingPostSteps(done, caps, ctx);

            if (remaining.includes('postSignoffStatus')) {
                self.runPostSignoffStatus(response);
            }
            if (remaining.includes('postCoroleLinkSignoff')) {
                self.runPostCoroleLinkSignoff();
            }

            if (ctx.hasPubkitTask && !ctx.isCollator) {
                if (remaining.includes('postPubkit')) {
                    self.runPostPubkit();
                } else {
                    self.applyRedirectKeyFromResponse(response);
                    self.reDirectReadOnly();
                }
            } else {
                if (ctx.isCollator || ctx.noWorkflow) {
                    if (remaining.includes('postCollatorAttachments')) {
                        self.runPostCollatorAttachments();
                    }
                    self.applyRedirectKeyFromResponse(response);
                    self.reDirectReadOnly();
                } else if (self._state.workFlow) {
                    if (remaining.includes('postWorkflowShare')) {
                        self.runPostWorkflowShare();
                    } else {
                        self.applyRedirectKeyFromResponse(response);
                        self.reDirectReadOnly();
                    }
                } else if (!ctx.isCollator) {
                    ErrorLogTrace('PUBKIT_CALL', "PUBKIT CALL FAIL");
                }
                if (remaining.includes('postNonPubkitMail')) {
                    self.applyRedirectKeyFromResponse(response);
                    self.runPostNonPubkitMail();
                }
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('closesharedpost', err.message);
            self.reDirectReadOnly();
        }
    }

    SEND_iMAIL_RETURN(response) {

        const self = this;

        try {
            if (response['r'] == 2) {
                let mess = 'Sharing mail timeout ' + response['mail'];
                ErrorLogTrace('InternalShareMail', mess);
            } else if (response['r'] != 0) {
                console.log(JSON.stringify(response));
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('SEND_MAIL_RETURN', err.message);
        }
    }

    NON_PUBKIT_WORKFLOW(Options = {}) {

        const self = this;
        try {
            // ! 02_MAR_2024 - TNF INTERNAL MAIL SHARING
            // ? 3454014: IMPACT Author submission notifications with read only link enable - YA - 27-JAN-26

            const {
                externalMail,
                mailBcc,
                mailBody
            } = this._state.finalize;

            if (externalMail) {
                // 1️ Resolve Target Emails (Decoded & Cleaned)
                const emailTo = atob(externalMail)
                    .split(",")
                    .map(email => email.trim())
                    .filter(Boolean)
                    .map(email => email.includes("@") ? email : `${email}@newgen.co`)
                    .join(",");

                // 2️ Prepare Email Body (Mustache)
                const template = commonMethods.hex2a(mailBody);
                const redirectKey = this._state.auKey || SHARED_KEY.key;
                const redirectUrl = sessionStorage.getItem("redirect") ||
                    (DOMAIN_ROOT + this._state.finalize.default + redirectKey);

                const renderMessage = Mustache.render(template, {
                    rolename: SHARED_KEY.rolename || "User",
                    projecttitle: SHARED_KEY.projecttitle || "Document",
                    au_key: redirectUrl
                });

                // 3️ Construct Mail Payload
                const configJson = GET_SENDER_RECEIVER_ID('SHARE_LINK');
                const emailFrom = (configJson && configJson.MAIL) || "";

                var MailObj = {
                    'tbl': 'writeMailTeam',
                    "find": {
                        "id": !IS_JOURNAL ? '6065ff5ee845a47ed65efc61' : '4c279c63-edd0-4b03-af59-533731427823'
                    },
                    'record_type': "InternalforTNF",
                    'emailto': emailTo,
                    'emailfrom': emailFrom,
                    "emailSubject": `Subject: Document finalized - ${SHARED_KEY.identifier} / ${SHARED_KEY.projecttitle}`,
                    "emailMessage": renderMessage,
                    'emailCC': ""
                };

                if (mailBcc) MailObj['emailBCC'] = atob(mailBcc);

                Object.assign(MailObj, GET_JSON("contact_support"));

                // 4️ Debug & Testing Overrides
                const isTester = ["karthickeyan.a", "karthickeyanarumugham", "testingperole"].includes(USER_INFO.MAIL_ID_PREFIX);

                if (IS_LOCAL_HOST || isTester) {
                    MailObj.emailto = isTester ? USER_INFO.MAIL_ID : "yasar.mohideen@nkw.pub";
                    MailObj.emailCC = isTester ? "yasar.mohideen@nkw.pub" : "";
                }

                debug.log(JSON.stringify(MailObj));

                commonfn.callajax(MailObj, 'SEND_iMAIL_RETURN', API_GENERIC_SEND_MAIL, self);
            }

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('NON_PUBKIT_WORKFLOW', err.message);
        }
    }
}

export default FinalizeSignOffModule;