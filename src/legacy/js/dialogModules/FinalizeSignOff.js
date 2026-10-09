document.addEventListener('DOMContentLoaded', function(event) {
    try {
        commonfn.signoffstatus = function(response) {
            if (response.r == 0) ErrorLogTrace('signoffstatus', response.m);
        };
        commonfn.docattchmentlist = function(response) {
            console.log(JSON.stringify(response));
        };
        // ? if only pubkit check now by siva 13-Dec-2022
        commonfn.signoff_post = function(response, _) {
            try {
                if (response.r == 0) ErrorLogTrace('signoff_post', response.m);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('signoff_post', err.message);
            }
        };
        commonfn['UPDATE_COUNT'] = function(response) {
            console.log(JSON.stringify(response));
            if (response.r == 1) {
                console.log("updated close");
            }
        };
        commonfn.Work_Flow_Return = function(response, Options) {
            try {
                console.log('RESPONSE' + response.data);
                Options = Options ? Options : ({
                    redirect: false
                });
                if (response.data.length == 0) {
                    let index = SHARE_USER_IDs.indexOf(USER_INFO.MAIL_ID_PREFIX);
                    if (index > 2 && (USER_INFO.ROLE_ID != ROLE_IDS.CO) && SHARED_KEY.apikey) {
                        setTimeout(function() {
                            ErrorLogTrace('WORK_FLOW', 'Work_Flow_Missing');
                        }, 5 * 60 * 1000);
                    }
                    FinalizeDialog['M_SCOPE'].WORK_FLOW = {
                        "data": []
                    };
                    FinalizeDialog.CloseSharedStatus(Options);
                    return;
                }
                FinalizeDialog['M_SCOPE'].WORK_FLOW = response;
                FinalizeDialog.CloseSharedStatus(Options);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('Work_Flow_Return', err.message);
            }
        };
        var template_Obj = {
            Template: `<div class="mDialog ds-none wo-editor-access" id="FinalizingDialog" role="dialog" aria-modal="true" aria-labelledby="headerTitle" aria-describedby="bodyText">
        <div class="dialog-container md-5">
            <div class="dialog-content">
                <div class="dia_header_div">
                    <span class="dia_header_text" id="headerTitle" role="heading" aria-level="1" tabindex="0">Finalize and Submit</span>
                    <div class="ml-auto closeIcons" tabindex="0" title="Close" role="button" aria-label="Close dialog">
                        <img class="n_Img" src="assets/images/svg/dialogClose.svg" alt="Close">
                    </div>
                </div>
                <div class="d-flex flex-column dialog-body" data-id="dialog-body">
                    <div class="d-flex flex-column justify-content-center" id="dialogtop">
                        <div class="d-flex justify-content-center align-self-center">
                            <img id="headerImage" alt="Dialog Status Icon" class="d-flex align-self-center" style="width:40px;height:40px" src="assets/images/svg/alert/WARNING.svg">
                        </div>
                        <div class="d-flex align-self-center font-weight-bold headerTitle" tabindex="0" data-id="headerTitle" role="heading" aria-level="1"></div>
                    </div>
                    <div class="d-flex justify-content-center" id="dialogcenter">
                        <div id="bodyText" role="alert" aria-live="polite" aria-atomic="true">Author queries have not been answered. Please answer all queries before submission.</div>
                        <div class="spinner-border iSpin_border ds-none" role="status" id="bodySpinner" aria-label="Processing"></div>
                    </div>
                </div>
                <div class="ml-auto dialog-footer" data-id="dialog-footer">
                    <button type="button" id="" class="btn secondary-btn ml-auto" title="cancel" tabindex="0" aria-describedby="bodyText">Cancel</button>
                    <button type="button" id="" class="btn btn-sm primary-btn" tabindex="0" title="submit" aria-describedby="bodyText">Yes</button>
                </div>
            </div>
        </div>
            </div>`
        };
        window.FinalizeDialog = new dialogModule('FinalizingDialog', template_Obj.Template);
        FinalizeDialog.initLoop = function(param1, _ = FinalizeDialog) {
            try {
                _.templateList = {};
                [_.IsDisable_OffLine, _.CanReDirect, _.CanReDirectCount] = [true, false, 0];
                _['IBOX'] = {
                    BODY_TOP: _.Panel.querySelector('#dialogtop'),
                    BODY_CENT: _.Panel.querySelector('#dialogcenter'),
                    BODY_FOT: _.Panel.querySelector('.dialog-footer'),
                    HEAD_IMG: _.Panel.querySelector('#headerImage'),
                    HEAD_TITLE: _.Panel.querySelector('.headerTitle'),
                    BODY_TXT: _.Panel.querySelector('#bodyText'),
                    BODY_SPIN: _.Panel.querySelector('#bodySpinner'),
                    ACT_BTN: _.Panel.querySelectorAll('.dialog-footer button')
                };
                _['M_SCOPE'] = {
                    SAVE_UNIQUE_DATA: [],
                    IS_PRIMARY_AUTHOR: !USER_INFO.IS_CO_ROLE,
                    Open_AQ_Count: 0,
                    WORK_FLOW: null,
                    IS_EDITOR_COMES_FIRST: false,
                    IS_EDITOR_ONLY: false,
                    DOC_TYPE: IS_JOURNAL ? 'article' : 'book/chapters',
                    // TrackPDF: API_PATH + `filedownloadwithdb?docid=${DOC_ID}_trackPDF`,
                    TrackPDF: API_PATH + `filedownloadwithdb?docid=${DOC_ID}_trackPDF` + '--' + USER_INFO.ROLE_ID,
                    query_selector: '[data-class="ckcommentsfull"][data-status]:not([data-status="note"],[data-status="comment"])',
                    STAGES: {
                        loading: {
                            title: "Checking document",
                            icon: "INFO",
                            text: "...",
                            spin: true,
                            btn1: {},
                            btn2: {}
                        },
                        query_open: {
                            title: "",
                            icon: "WARNING",
                            text: function() {
                                try {
                                    /* 
                                    There are "2" author queries awaiting your response. Prior to finalizing the task, it is important to address all the raised queries in a suitable manner. To provide answers to the pending queries, kindly click on the "Reply to query" button, which will open the "Queries" section.
                                    */
                                    return `There are <span class="open_count">${FinalizeDialog.M_SCOPE.Open_AQ_Count}</span> author queries awaiting your response. Prior to finalizing the task, it is important to address all the raised queries in a suitable manner. To provide answers to the pending queries, kindly click on the "Reply to query" button, which will open the "Queries" section.`;
                                } catch (err) {
                                    console.warn(err.message);
                                    ErrorLogTrace('finalize_pass', err.message);
                                }
                            },
                            spin: "",
                            btn1: {
                                id: "gotoquery",
                                tabindex: '0',
                                title: "Reply to query",
                                text: "Reply to query"
                            },
                            btn2: {}
                        },
                        query_open_co_user: {
                            title: "",
                            icon: "WARNING",
                            text: function() {
                                try {
                                    /* 
                                    There are "2" author queries awaiting your response. If you wish to respond to the queries, please click the "Query Response" button. Otherwise, click the "Submit" button to send the article back to the corresponding author.
                                    There are "2" author queries awaiting your response. If you wish to respond to the queries, please click the "Query Response" button. Otherwise, click the "Submit" button to send the article back to the corresponding author.
                                    */
                                    return `There are <span class="open_count">${FinalizeDialog.M_SCOPE.Open_AQ_Count}</span> author queries awaiting your response. If you wish to respond to the queries, please click the "Query Response" button. Otherwise, click the "Submit" button to send the ${DOC_TYPE} back to the corresponding author.`;
                                } catch (err) {
                                    console.warn(err.message);
                                    ErrorLogTrace('query_open_co_user', err.message);
                                }
                            },
                            spin: "",
                            btn1: {
                                id: "finaliz",
                                title: "Submit",
                                text: "Submit"
                            },
                            btn2: {
                                id: "gotoquery",
                                tabindex: 0,
                                title: "Query Response",
                                text: "Query Response"
                            }
                        },
                        finalize: {
                            title: `Are you ready to finalize and submit your ${DOC_TYPE}?`,
                            icon: "WARNING",
                            text: `Please note that once you finalize, you will not be able to make any further changes. Click &ldquo;Yes&rdquo; to proceed with finalizing your ${DOC_TYPE}.`,
                            spin: "",
                            btn1: {
                                id: "finaliz",
                                title: "Confirm",
                                text: "Yes"
                            },
                            btn2: {
                                id: "Cancelfina",
                                title: "Cancel",
                                text: "Cancel"
                            }
                        },
                        finalize_next: {
                            title: "Processing . . . ",
                            icon: "WARNING",
                            text: "",
                            spin: true,
                            btn1: {},
                            btn2: {}
                        },
                        finalize_pass: {
                            title: "Success!",
                            icon: "SUCCESS",
                            text: function() {
                                const messages = {
                                    "JATS": {
                                        "default": "Your article has been successfully moved to the next stage.",
                                        "CO_ROLE": `The proof has been finalized and sent back to the corresponding author`
                                    },
                                    "BITS": {
                                        "default": "Your book/chapters has been successfully moved to the next stage.",
                                        "CO_ROLE": "Your book/chapters has been successfully moved to the next stage."
                                    }
                                };
                                try {
                                    var key = _.M_SCOPE.IS_PRIMARY_AUTHOR ? "default" : "CO_ROLE";
                                    return messages[DOC_DTD][key];
                                } catch (err) {
                                    console.warn(err.message);
                                    ErrorLogTrace('finalize_pass', err.message);
                                }
                            },
                            spin: false,
                            btn1: {
                                id: "Cancelfina",
                                title: "OK",
                                text: "OK"
                            },
                            btn2: {}
                        },
                        finalize_retry: {
                            title: "Retry . . .",
                            icon: "ERROR.svg",
                            text: "Error while processing the document. Please try after some time.",
                            spin: true,
                            btn1: {},
                            btn2: {}
                        },
                        query_mismatch: {
                            title: "",
                            icon: "ERROR",
                            text: "Your document Query count is mismatched and you are unable to proceed. Kindly contact the support team for assistance.",
                            spin: "",
                            btn1: {
                                id: "logOff",
                                title: "logOff",
                                text: "Click to Logoff"
                            },
                            btn2: {}
                        },
                        collaborative_status: {
                            title: "Processing . . . ",
                            icon: "WARNING",
                            text: "",
                            spin: true,
                            btn1: {},
                            btn2: {}
                        },
                    },
                    ICONS: {
                        "default": "assets/images/svg/mainPage/Finalize.svg",
                        "CO_ROLE": "assets/images/svg/mainPage/Submit.svg"
                    }
                };

                // ? 23_JUNE_2023_FOR_CO_ROLE
                var change_btn = function() {
                    try {
                        var UI_BTN = document.getElementById("finalize");
                        if (UI_BTN) {
                            let img = UI_BTN.querySelector('img');
                            if (img) $(img).attr("src", _.M_SCOPE.ICONS.CO_ROLE);
                        } else {
                            setTimeout(change_btn, 1500);
                        }
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('finalize_change_btn', err.message);
                    }
                };

                if (!_.M_SCOPE.IS_PRIMARY_AUTHOR) {
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

                // Ensure M_CONFIG.survey and M_CONFIG.finalize are initialized if not already

                if (!this.M_CONFIG.survey) {
                    this.M_CONFIG.survey = {};
                }
                if (!this.M_CONFIG.finalize) {
                    this.M_CONFIG.finalize = {};
                }

                configItems.forEach(item => {
                    const isSignOff = item === "sign_off";

                    // Merge the options and forSignUp configurations dynamically
                    const config = this.G_FUN.GET_CONFIG_ITEM(`item[name="${item}"]`, {
                        ...options,
                        ...(isSignOff ? forSignUp : {})
                    });

                    Object.assign((isSignOff ? this.M_CONFIG.finalize : this.M_CONFIG.survey), config);
                });

                // ? SEAN REQUEST  - 16_JUNE_2023 - YA
                this['M_CONFIG'].AU_KEY = "";
                // ? SRINI REQUEST  - 01_MAR_2023 - YA
                this.TRIGGER = document.getElementById("finalize");

                if (!_.M_SCOPE.IS_PRIMARY_AUTHOR) {
                    let js_on = GET_JSON('get_shared_author_info');
                    if (!SHARED_KEY.linkfrom) commonfn.callajax(js_on, 'get_shared_author_post', API_GET_DOCS, _);
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
                    commonfn.callajax(js_on_key, 'get_org_author_link_post', API_GET_DOCS, _);
                }

                // ? 23_AUG_223
                var CHECK_WORK_RULE = setInterval(() => {
                    if (!J_CONFIG) window.J_CONFIG = I_CONFIG.querySelector(`[short="${SHORT_II_TITLE}"]`);
                    if (J_CONFIG) {
                        let value1 = J_CONFIG.getAttribute("editor-comes-first");
                        let value2 = J_CONFIG.getAttribute("editor-only");
                        if (value1 == "true") _.M_SCOPE.IS_EDITOR_COMES_FIRST = USER_INFO.IS_EDITOR_COMES_FIRST = true;
                        if (value2 == "true") _.M_SCOPE.IS_EDITOR_ONLY = USER_INFO.IS_EDITOR_ONLY = true;
                        // As per Siva's request, this condition is added for future extensibility based on DB configuration.
                        // Currently, TNF has only one configuration (unlike Journals).
                        // Date: 20-12-2025 
                        // Ticket : https://mantis.newgen.co/view.php?id=3438874
                        if (SHARED_KEY.client == 'TNF' && SHARED_KEY.wflow == 'editorfirst' && USER_INFO.ROLE_NAME == 'Editor') {
                            _.M_SCOPE.IS_EDITOR_COMES_FIRST = USER_INFO.IS_EDITOR_COMES_FIRST = true;
                        }
                        clearInterval(CHECK_WORK_RULE);
                    }
                }, 1500);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('Finalize_initLoop', err.message);
            }
        };
        window.FinalizeDialog.closeshared_corole_post = function(response, _) {
            _ = FinalizeDialog;
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
        };
        window.FinalizeDialog.task_close_pubkit_post = function(response, _ = FinalizeDialog) {
            try {
                if (response.r == 0) {
                    ErrorLogTrace('Pubkit_SignOff', response.m);
                }
                _.reDirectReadOnly();
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('task_close_pubkit_post', err.message);
            }
        };
        window.FinalizeDialog.fire_pubkit_post = function(response, _ = FinalizeDialog) {
            try {
                if (response.r == 0) {
                    ErrorLogTrace('fire_pubkit_after', response.m);
                }
                debug.log(JSON.stringify(response));
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('fire_pubkit_post', err.message);
            }
        };
        window.FinalizeDialog.get_shared_author_post = function(response, _ = FinalizeDialog) {
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
        };
        window.FinalizeDialog.get_org_author_link_post = function(response, _ = FinalizeDialog) {
            try {
                debug.log(JSON.stringify(response));
                if (response.r == 0 || response.data.length == 0) {
                    // if (IS_LIVE_DOMAIN) ErrorLogTrace('get_org_author_link_post', (response.r == 0 ? response.m : "NO_RECORD_FOR_CORRES_AUTHOR"));
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
                        FinalizeDialog['M_CONFIG'].AU_KEY = LINK;
                    }
                } else {
                    ErrorLogTrace('get_org_author_link_post', "NO_RECORD_AUTHOR_01");
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('get_org_author_link_post', err.message);
            }
        };
        window.FinalizeDialog.reply_author_post = function(response, _ = FinalizeDialog) {
            try {
                if (response.r == 0) {
                    ErrorLogTrace('reply_author_post', response.m);
                }
                debug.log(JSON.stringify(response));
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('reply_author_post', err.message);
            }
        };
        window.FinalizeDialog.autoshareformpost = function(response, _ = FinalizeDialog) {
            try {
                console.log(JSON.stringify(response));
                if (response["statusCode"] != 202) {
                    TOASTER_ALERT('ErrorAutoShareMail', {
                        type: 'warning'
                    });
                    ErrorLogTrace('SignOff_Autoshareformpost', 'Send Auto Mail');
                }
                _.reDirectReadOnly();
            } catch (err) {
                console.warn(err.message);
                _.reDirectReadOnly();
                ErrorLogTrace('autoshareformpost', err.message);
            }
        };
        window.FinalizeDialog.updateSignOffTime = function(response, _ = FinalizeDialog) {
            try {
                if (response.r == 0) {
                    console.log('no records found in database');
                    //ErrorLogTrace('signOffTime_Update', 'SignOff');
                } else console.log('SignOff Time Updated');
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('updateSignOffTime', err.message);
            }
        };
        window.FinalizeDialog.getPubKitConfigJSON = function(_ = FinalizeDialog) {
            try {
                /*? 08-Apr-22 updates from both test and live env related token and url */
                var returnData = {

                    /* ? 30-Mar-22 updates from Pubkit Team */
                    "abstract_task_id": parseInt(SHARED_KEY.roleabstracttaskid),
                    "identifier": SHARED_KEY.identifier,
                    "task_id": parseInt(SHARED_KEY.roletaskid),
                    /* ? 27-Apr-22 updates for Client Update  shared to Pubkit */
                    "trackPDF": _['M_SCOPE'].TrackPDF,
                    "docid": DOC_ID,
                    "info": {}
                };

                // ? 25_APR_2025 - YA - FOR THOMSON/MEDKNOW
                // ? 3392484: Medknow - fileid for pubkit request - 14_JUN_2025_YA
                // ? OSO - required projectid in pubkit request - 17_APR_2026 - SIVA

                var userData = _.userTrackData("pubkit");
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
        };

        FinalizeDialog.updateCollabTable = function(rows, bodyData = {}, retries = 10, delay = 200) {
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
        };
        FinalizeDialog.filterSaveData = function(response = {}) {
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
                this['M_SCOPE']['SAVE_UNIQUE_DATA'] = uniqueData;
            } catch (err) {
                console.warn(err.message);
                this['M_SCOPE']['SAVE_UNIQUE_DATA'] = [];
            }
        };
        FinalizeDialog.normalizeCollaboratorEmail = function(email) {
            return String(email || "").trim().toLowerCase();
        };
        FinalizeDialog.collectSharedCollaboratorEmails = function(sharedItems = []) {
            const emails = new Set();
            const addEmail = (email) => {
                email = this.normalizeCollaboratorEmail(email);
                if (email) emails.add(email);
            };
            const addMany = (value) => {
                if (Array.isArray(value)) {
                    value.forEach(addEmail);
                } else if (typeof value === "string") {
                    value.split(",").forEach(addEmail);
                }
            };

            (Array.isArray(sharedItems) ? sharedItems : []).forEach(entry => {
                addMany(entry.emailto);
                addMany(entry.emailtolist);
                if (Array.isArray(entry.finalized_by)) {
                    entry.finalized_by.forEach(item => addEmail(item && item.email));
                }
            });

            return emails;
        };
        FinalizeDialog.collectLockedCollaboratorEmails = function(lockedInfo = {}) {
            const emails = new Set();
            const addEmail = (email) => {
                email = this.normalizeCollaboratorEmail(email);
                if (email) emails.add(email);
            };

            if (Array.isArray(lockedInfo.byOthersEmailList)) {
                lockedInfo.byOthersEmailList.forEach(addEmail);
            }
            if (Array.isArray(lockedInfo.byOthers)) {
                lockedInfo.byOthers.forEach(lock => {
                    if (!lock) return;
                    addEmail(lock.lockedBy || lock.user || lock.email || lock.username || lock.mail || lock.mailid);
                });
            }

            return emails;
        };
        FinalizeDialog.resolveCollaborativeStageKey = function(lockedInfo = {}, liveCoUser = [], sharedItems = []) {
            const sharedEmails = this.collectSharedCollaboratorEmails(sharedItems);
            const lockedEmails = this.collectLockedCollaboratorEmails(lockedInfo);
            const hasMatchingActiveLock = Array.from(lockedEmails).some(email => sharedEmails.has(email));

            if (hasMatchingActiveLock) return "active";
            if (!liveCoUser.length) return "finalize";
            return "non_active";
        };
        FinalizeDialog.refreshCollaborativeStatus = function(response = {}) {
            try {
                const filterSaveData = this['M_SCOPE']['SAVE_UNIQUE_DATA'] || [];
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
                const lockedEmails = this.collectLockedCollaboratorEmails(lockedInfo);
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
                        const saved = filterSaveData.find(f => f.uniqueKey === `${authorId}_${role}`);
                        if (saved && saved.time_c) {
                            lastAccess = moment(parseInt(saved.time_c.$numberLong || saved.time_c)).format(format);

                            if (lockedEmails.has(this.normalizeCollaboratorEmail(authorId))) {
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

                var keyObjects = {
                    "active": {
                        header: `The document can&rsquo;t be finalized right now because the following co-author(s) are currently working on it and haven&rsquo;t submitted their changes yet:`,
                        footer: `Please wait until all collaborators have completed their review before proceeding.`,
                        btn1: {
                            id: "Cancelfina",
                            title: "Close",
                            text: "Close"
                        },
                        btn2: {
                            id: "logOff",
                            title: "Logoff",
                            text: "Click to Logoff"
                        },
                        icon: "ERROR",
                    },
                    "non_active": {
                        header: `The document has been shared with the following co-author(s), but they haven&rsquo;t submitted their changes yet:`,
                        footer: `Since they are currently inactive, you may choose to finalize now or wait for their submission<br>Would you like to proceed with finalizing the document?`,
                        btn1: {
                            id: "finaliz",
                            title: "Confirm",
                            text: "Yes"
                        },
                        btn2: {
                            id: "Cancelfina",
                            title: "Cancel",
                            text: "Cancel"
                        },
                        icon: "WARNING"
                    },
                    "finalize": {
                        header: `Please note that once you finalize, you will not be able to make any further changes. Click &ldquo;Yes&rdquo; to proceed with finalizing your proof.<br>Below is the access log of co-authors along with their review status:`,
                        footer: ``,
                        btn1: {
                            id: "finaliz",
                            title: "Confirm",
                            text: "Yes"
                        },
                        btn2: {
                            id: "Cancelfina",
                            title: "Cancel",
                            text: "Cancel"
                        },
                        icon: "WARNING"
                    },
                    "finalize_co": {
                        header: `Please note that once you submit, you will not be able to make any further changes. Click &ldquo;Submit&rdquo; button to send the ${DOC_TYPE} back to the corresponding author.<br>Below is the access log of co-authors along with their review status:`,
                        footer: ``,
                        btn1: {
                            id: "finaliz",
                            title: "Submit",
                            text: "Submit"
                        },
                        btn2: {
                            id: "Cancelfina",
                            title: "Cancel",
                            text: "Cancel"
                        },
                        icon: "WARNING"
                    }
                };

                const key = this.resolveCollaborativeStageKey(lockedInfo, LiveCouser, sharedItems);
                var renderData = keyObjects[key];

                this['M_SCOPE']['DISPLAY_ROWS'] = rows;
                if (rows) {
                    // let the retry logic handle DOM updates
                    this.updateCollabTable(rows, renderData);
                }
            } catch (error) {
                console.warn("refreshCollaborativeStatus error:", error.message);
            }
        };
        FinalizeDialog.StageRenderFooter = function(buttons, options = {}, _ = FinalizeDialog) {
            try {
                const order = Array.from(_.IBOX.ACT_BTN).reverse();
                const allEmpty = buttons.every(b => !Object.keys(b).length);
                if (allEmpty) {
                    _.IBOX.BODY_FOT.classList.add("invisible");
                    return;
                }
                _.IBOX.BODY_FOT.classList.remove("invisible");
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
        };
        FinalizeDialog.StageRenderBody = function(icon, title, spin, text, options = {}, _ = FinalizeDialog) {
            try {
                // Header
                _.IBOX.HEAD_TITLE.textContent = title;
                if (icon) _.IBOX.HEAD_IMG.src = `assets/images/svg/alert/${icon}.svg`;

                // Body
                _.IBOX.BODY_TXT.innerHTML = typeof text === "function" ? text() : text;
                _.IBOX.BODY_SPIN.classList[spin ? "remove" : "add"]("ds-none");
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace("StageRenderBody", err.message);
            }
        };
        FinalizeDialog.StageView = function(StageKey, options = {}, _ = FinalizeDialog) {
            try {
                const stage = _.M_SCOPE.STAGES[StageKey];
                if (!stage) return;
                _.currentStage = StageKey;
                // ⬇ destructure stage
                var {
                    title = "", icon = "WARNING", text = "", spin = "", btn1 = {}, btn2 = {}
                } = stage;

                this.StageRenderBody(icon, title, spin, text);

                // Add query count attr if needed
                if (/query_open/.test(StageKey)) {
                    _.IBOX.BODY_TXT.setAttribute("data-count", _.M_SCOPE.Open_AQ_Count);
                } else {
                    _.IBOX.BODY_TXT.removeAttribute("data-count");
                }
                // Footer buttons
                const buttons = [btn1, btn2];
                this.StageRenderFooter(buttons);

            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace("StageView", err.message);
            }
        };

        FinalizeDialog.checkMissingCiteItems = function(self) {
            self = this || FinalizeDialog;

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
                self.M_SCOPE.CITATION_ALERTS = finalAlert;

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
                if (!self.M_SCOPE.MISSING_STAGE_KEY) {
                    self.M_SCOPE.MISSING_STAGE_KEY = "missing_citation_stage_" + Date.now();
                }

                const stageKey = self.M_SCOPE.MISSING_STAGE_KEY;

                // Insert stage only once
                if (!self.M_SCOPE.STAGES[stageKey]) {
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

                    const entries = Object.entries(self.M_SCOPE.STAGES);
                    entries.splice(1, 0, ...Object.entries(newStage));
                    self.M_SCOPE.STAGES = Object.fromEntries(entries);
                }

                return finalAlert;

            } catch (error) {
                console.warn("checkMissingCiteItems error", error);
                return [];
            }
        };

        FinalizeDialog.showLoop = function(param1, param2, param3, self) {
            self = self || FinalizeDialog;
            var setStage = "finalize";
            try {
                self.StageView("loading");

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

                    // 2 Check abstract validity
                    var isAbstractValid = true;
                    if (window.AbstractWordCounter) {
                        isAbstractValid = AbstractWordCounter.beforeCheckFinalize();
                        if (!isAbstractValid) return;
                    }


                    // 3 Check  open queries
                    if (queryModule && typeof queryModule.getOpenQueries === "function") {
                        openQueryCount = queryModule.getOpenQueries(true);
                    }
                    self.M_SCOPE.Open_AQ_Count = openQueryCount.length;
                    if (openQueryCount.length > 0) {
                        const editorComesFirst = self.M_SCOPE.IS_EDITOR_COMES_FIRST;
                        const editorOnly = self.M_SCOPE.IS_EDITOR_ONLY;
                        const isPrimaryAuthor = self.M_SCOPE.IS_PRIMARY_AUTHOR;

                        let is_editor_only_flow = false;
                        let is_editor_author_flow = false;

                        // Determine workflow type
                        if (SHARED_KEY.wflow) {
                            is_editor_only_flow = SHARED_KEY.wflow === "editoronly";
                            is_editor_author_flow = SHARED_KEY.wflow === "editorfirst";
                        } else if (SHARED_KEY.nextrole && SHARED_KEY.nextrole.role) {
                            const isNextCo = SHARED_KEY.nextrole.role === ROLE_IDS.CO;
                            is_editor_only_flow = isNextCo;
                            is_editor_author_flow = !isNextCo;
                        }

                        // Stage determination logic
                        if (is_editor_only_flow && editorOnly) {
                            // Editor-only flow
                            setStage = isPrimaryAuthor ? "query_open" : "query_open_co_user";

                        } else if (is_editor_author_flow && editorComesFirst) {
                            // Editor-first flow (Author workflow)
                            if (USER_INFO.IS_AUTHOR && isPrimaryAuthor) {
                                setStage = "query_open";
                            } else {
                                setStage = "query_open_co_user";
                            }
                        } else {
                            // Non-editor-first or fallback case
                            setStage = isPrimaryAuthor ? "query_open" : "query_open_co_user";
                        }
                    }
                    // 4 Check for locks by other collaborators
                    const isCollabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);
                    if (isCollabEnabled && self.M_SCOPE.IS_PRIMARY_AUTHOR && !(/query/gi.test(setStage))) {
                        setStage = "collaborative_status";
                        let js_on = GET_JSON('get_corole_info');
                        delete js_on.find.corole;

                        let save_js_on = Object.assign({}, js_on, {
                            tbl: 'Fileslist'
                        });
                        commonfn.callajax(save_js_on, 'filterSaveData', API_GET_DOCS, FinalizeDialog);
                        commonfn.callajax(js_on, 'refreshCollaborativeStatus', API_GET_DOCS, FinalizeDialog);
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

                if (self['M_SCOPE'].WORK_FLOW == null && SHARED_KEY.linkinfo != "pubkit") {
                    self.Validateworkflow({
                        fetchworkflow: true,
                        redirect: false
                    });
                }
                ['gotoquery', 'finaliz', 'Cancelfina', "logOff"].forEach((id) => {
                    var ELM = document.getElementById(id);
                    if (ELM == null) return false;
                    ELM.onclick = async function(e) {
                        try {
                            if (["gotoquery", "logOff"].includes(this.id)) {
                                if (this.id == "gotoquery") {
                                    $('#btn_qry,#qOpenCountDiv').click();
                                } else {
                                    // ? SAVE - LOG-OFF - RE_DIRECT
                                    await LOG_OUT.fire({
                                        noWarnAlert: true,
                                        source: "finalize_logout"
                                    });
                                }
                                FinalizeDialog.closeDialog();
                            } else if (['finaliz', 'Cancelfina'].includes(this.id)) {
                                if (this.id == 'finaliz') {
                                    FinalizeDialog.StageView("finalize_next");
                                    if (self['M_SCOPE'].WORK_FLOW == null && SHARED_KEY.linkinfo != "pubkit") {
                                        FinalizeDialog.Validateworkflow({
                                            fetchworkflow: true,
                                            redirect: true
                                        });
                                    } else if ((self['M_SCOPE'].WORK_FLOW && self['M_SCOPE'].WORK_FLOW.data) || (SHARED_KEY.linkinfo == "pubkit")) {
                                        FinalizeDialog.CloseSharedStatus({
                                            redirect: true
                                        });
                                    }
                                } else {
                                    // FinalizeDialog.Panel.classList.add('ds-none');
                                    FinalizeDialog.closeDialog();
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
        };
        FinalizeDialog.Before_closeDialog = function() {
            this.currentStage = '';
            return true;
        };
        FinalizeDialog.showBefore = function(param1, param2, param3, _ = FinalizeDialog) {
            try {
                if ((USER_INFO.ROLE_ID == ROLE_IDS.CO) && typeof qualityCheckerDialog != "undefined" && !qualityCheckerDialog.Showed) {
                    qualityCheckerDialog.show();
                    return false;
                } else return true;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('FinalizeDialog_showLoop', err.message);
            }
        };
        FinalizeDialog.Validateworkflow = function(Options, _ = FinalizeDialog) {
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
        };
        FinalizeDialog.userTrackData = function(flow = "all", Options = {}, _ = FinalizeDialog) {
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
        };

        FinalizeDialog.getAttachmentList = function(self = FinalizeDialog) {

            const attributes = ['data-db-id', 'data-file-id'];

            try {
                function getIdWithoutExt(el) {
                    const dbId = el.getAttribute('data-db-id');
                    const fileId = el.getAttribute('data-file-id');
                    const hasExt = str => /\.[^/.]+$/.test(str);
                    if (dbId && !hasExt(dbId)) {
                        return dbId;
                    }
                    if (fileId && !hasExt(fileId)) {
                        return fileId;
                    }
                    return null;
                }

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

                        const value = getIdWithoutExt(element);;

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
        };


        FinalizeDialog.CloseSharedStatus = async function(Options, self = FinalizeDialog) {
            /* 
            ! DB - LINK-SHARE ? change doc_status 1 to 0;
            ! DB - SHARE_INVITE ? change status active to sign-off;
            */
            try {
                if (!Options.redirect) {
                    return;
                }

                // stage 0 - updating correction count in db
                var CORR_COUNT_OBJ = GET_JSON('set_correction_count', {});
                CORR_COUNT_OBJ.info = self.userTrackData();
                commonfn.callajax(CORR_COUNT_OBJ, 'UPDATE_COUNT', API_UPDATE_INSERT);

                // stage 1 - closing session - log-out
                const isCollabEnabled = typeof window.isCollabEnabled === "function" && window.isCollabEnabled(DOC_ID);
                await window.LOG_OUT.fire({
                    noWarnAlert: true,
                    noRedirect: true,
                    noAlert: true,
                    regenerate: 'package',
                    lockfile: true,
                    lockParaId: ["0"],
                    remarks: "signoff",
                    process: isCollabEnabled ? "signoff" : "close",
                    source: "finalize",
                    logoutEvent: "Finalize"
                });

                // stage 2.1 - persist all query/comment snapshot before final signoff
                try {
                    if (window.queryModule && typeof window.queryModule.persistFinalQuerySnapshot === "function") {
                        window.queryModule.persistFinalQuerySnapshot();
                    }
                } catch (snapErr) {
                    console.warn(snapErr.message || snapErr);
                    ErrorLogTrace('persistFinalQuerySnapshot', (snapErr && snapErr.message) ? snapErr.message : "snapshot save failed");
                }

                // stage 2 - major/main
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


                // step-3: CLOSE OTHER ROLES UPDATE THE TIME_STAMP
                if (ROLE_IDS.CO != USER_INFO.ROLE_ID && !USER_INFO.IS_CO_ROLE) {
                    var UPDATE_TIME_ON = GET_JSON('Shareandinvite', {
                        updateSignOffTime: true,
                        time: SHARE_OBJ.update['signouttime']
                    });
                    debug.log(UPDATE_TIME_ON);
                    commonfn.callajax(UPDATE_TIME_ON, 'updateSignOffTime', API_FIND_UPDATE_INSERT, self);
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('CloseSharedStatus', err.message);
            }
        };
        FinalizeDialog.coRoleFinalize = function(self = FinalizeDialog) {
            try {
                // <p>To access the proof, please <a href="{{au_key}}">click here</a>.</p>

                const template = self.M_CONFIG.finalize.coRoleMail;
                var MAIL_BODY = self.GetTemplate(template, {
                    frag: false,
                    alert_msg: true,
                    identifier: SHARED_KEY.identifier,
                    projecttitle: SHARED_KEY.projecttitle,
                    currenturl: SHARED_KEY.currenturl,
                    au_key: self['M_CONFIG'].AU_KEY,
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
                // ? SEAN UPDATE MAIL TEMPLATE 17_JUNE_2023 - USER_INFO.MAIL_ID CC EMPTY
                var MailInfo = {
                    "tbl": "emaildraft",
                    "emailfrom": AuthorMailFrom,
                    "emailto": AuthorMail,
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
        };
        FinalizeDialog.FIRE_SURVEY = async function() {
            try {
                this.closeDialog();

                const {
                    "external-survey": externalSurvey,
                    "internal-survey": internalSurvey,
                    "survey-before-prompt": surveyBeforePrompt,
                    "google-form": googleForm
                } = this.M_CONFIG.survey;

                const surveyConfig = {
                    isCoRole: !this.M_SCOPE.IS_PRIMARY_AUTHOR,
                    isInternalSurvey: internalSurvey === "true",
                    shouldShowSurveyPrompt: surveyBeforePrompt === "true",
                    isGoogleForm: googleForm === "true",
                    canShowRoleWise: IsContextMenu("survey", {
                        check_co_role: !this.M_SCOPE.IS_PRIMARY_AUTHOR
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
                                finalSurvey = this.M_CONFIG.survey['external-survey-uk'];
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
        };
        FinalizeDialog.reDirectReadOnly = function(_ = FinalizeDialog) {
            try {
                if (!_.CanReDirect) {
                    _.CanReDirectCount++;
                    setTimeout(_.reDirectReadOnly, 1750);
                    if (IS_LOCAL_HOST) debug.log(_.CanReDirectCount);
                    return;
                } else if (_.CanReDirectCount > 10) _.CanReDirect = true;
                setTimeout((_) => {
                    FinalizeDialog.StageView("finalize_pass");
                }, 2250, _);
                [_CanClose, _IsDirty] = [true, false];
                GlobalEditor.resetDirty();
                setTimeout(() => {
                    FinalizeDialog.FIRE_SURVEY();
                }, 5000);
            } catch (err) {
                [_CanClose, _IsDirty] = [true, false];
                console.warn(err.message);
                ErrorLogTrace('reDirectReadOnly', err.message);
                window.location.href = (sessionStorage.getItem("redirect") ? (sessionStorage.getItem("redirect")) : (NG_WEB_URL));
            }
        };
        FinalizeDialog.ShareFromWorkflow = function(response, _ = FinalizeDialog) {
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
                    _.reDirectReadOnly();
                    return;
                }
                (async () => {
                    try {
                        let shareMod = await getShareInviteDialog();
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
                        commonfn['callajax'](jsondata, 'autoshareformpost', API_SHARE_INVITE, _);
                    } catch (innerErr) {
                        console.warn(innerErr.message);
                        ErrorLogTrace('ShareFromWorkflow', innerErr.message);
                        _.reDirectReadOnly();
                    }
                })();
                return;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('ShareFromWorkflow', err.message);
                _.reDirectReadOnly();
            }
        };

        FinalizeDialog.closesharedpost = function(response, self = FinalizeDialog) {
            try {
                console.log(["shared completion status updated", response]);

                //? File Attachment collator role backend response

                if (response.r == 0) {
                    FinalizeDialog.StageView("finalize_retry");

                    if (SHARED_KEY.roletaskid) {
                        // ? if only pubkit check now by siva 13-Dec-2022
                        var jsondata = {
                            "tbl": "signoffstatus",
                            "docid": DOC_ID,
                            "role": USER_INFO.ROLE_ID,
                            "response": "failed",
                            "rolename": USER_INFO.ROLE_NAME,
                            "task_id": SHARED_KEY.roletaskid,
                            "abstract_task_id": SHARED_KEY.roleabstracttaskid,
                            "identifier": SHARED_KEY.identifier
                        };
                        commonfn.callajax(jsondata, 'signoff_post', API_UPDATE_INSERT);
                    }
                    return;
                }


                if (!self.M_SCOPE.IS_PRIMARY_AUTHOR) {
                    self.coRoleFinalize();
                    self.reDirectReadOnly();
                    return debug.log("co role return");
                }


                commonfn.callajax(GET_JSON('signoffstatus', response), 'signoffstatus', API_UPDATE_INSERT);
                // ? co-role link auto sign-off method trigger
                let JS_ON = GET_JSON('Shareandinvite', {
                    corole_link_signoff: true
                });
                // ? MULTI UPDATE WIP
                commonfn.callajax(JS_ON, 'closeshared_corole_post', API_FIND_UPDATE_INSERT, self);
                let js_on = JS_ON;
                delete js_on.update;
                delete js_on.updateMany;

                // ? SINGLE DB UPDATE
                let IsCollator = USER_INFO.ROLE_ID == ROLE_IDS.CO;
                let NO_WORK_FLOW = (((!self['M_SCOPE'].WORK_FLOW) || (self['M_SCOPE'].WORK_FLOW.data && self['M_SCOPE'].WORK_FLOW.data.length == 0)) ? (true) : (false));

                if (SHARED_KEY.roletaskid && !IsCollator) {
                    let JS_ON = GET_JSON('fire_pubkit');
                    let JS_PUBKIT = self.getPubKitConfigJSON(self);

                    commonfn.callajax(JS_ON, 'fire_pubkit_post', API_UPDATE_INSERT, self);

                    commonfn.callajax(JS_PUBKIT, 'task_close_pubkit_post', API_PUBKIT_CLSE_TASK, self);

                } else {
                    if (IsCollator || NO_WORK_FLOW) {
                        //SHARED_KEY.roletaskid && 
                        if (IsCollator) {
                            //? As per Production requirment provide all uploaded details to Backend. DR_09_01_23
                            const data_files = new Set(
                                Array.from(GlobalEditor.document.$.querySelectorAll("[data-file-id], [data-db-id]"))
                                // Map to extract the ID
                                .map(Ele => Ele.dataset.fileId || Ele.dataset.dbId)
                                // Remove any falsy values (null, undefined, etc.)
                                .filter(Boolean)
                            );
                            // Convert Set back to an array if needed
                            const unique_data_files = Array.from(data_files);
                            var json_data = {
                                "tbl": "attachmentlist",
                                'docid': DOC_ID,
                                'doi': SHARED_KEY.identifier,
                                'attachmentids': unique_data_files,
                                "role": USER_INFO.ROLE_ID,
                                "rolename": USER_INFO.ROLE_NAME,
                                "identifier": SHARED_KEY.identifier
                            };
                            console.log(json_data);
                            commonfn.callajax(json_data, 'docattchmentlist', API_UPDATE_INSERT);
                        }
                        self.reDirectReadOnly();
                        // TODO AFTER COLLATOR 29-03-22 - don't call pubkit collator role signoff
                        /* if(SHARED_KEY.roletaskid) commonfn.callajax(JS_PUBKIT, 'task_close_pubkit_post', API_PUBKIT_CLSE_TASK);
                        else  FinalizeDialog.reDirectReadOnly(); */

                    } else if (self['M_SCOPE'].WORK_FLOW) {
                        self.ShareFromWorkflow(self['M_SCOPE'].WORK_FLOW);
                    } else {
                        // ? 03_APR_2023 - YA
                        if (!IsCollator) ErrorLogTrace('PUBKIT_CALL', "PUBKIT CALL FAIL");
                    }
                    FinalizeDialog.NON_PUBKIT_WORKFLOW();
                }

            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('closesharedpost', err.message);
                self.reDirectReadOnly();
            }
        };
        FinalizeDialog.SEND_iMAIL_RETURN = function(response, _ = FinalizeDialog) {
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
        };
        FinalizeDialog.NON_PUBKIT_WORKFLOW = function(Options = {}, self) {
            self = FinalizeDialog;
            try {
                // ! 02_MAR_2024 - TNF INTERNAL MAIL SHARING
                // ? 3454014: IMPACT Author submission notifications with read only link enable - YA - 27-JAN-26

                const {
                    externalMail,
                    mailBcc,
                    mailBody
                } = this.M_CONFIG.finalize;

                if (externalMail) {
                    // 1 Resolve Target Emails (Decoded & Cleaned)
                    const emailTo = atob(externalMail)
                        .split(",")
                        .map(email => email.trim())
                        .filter(Boolean)
                        .map(email => email.includes("@") ? email : `${email}@newgen.co`)
                        .join(",");

                    // 2 Prepare Email Body (Mustache)
                    const template = commonMethods.hex2a(mailBody);
                    const redirectUrl = sessionStorage.getItem("redirect") || (DOMAIN_ROOT + this.M_CONFIG.finalize.default+SHARED_KEY.key);

                    const renderMessage = Mustache.render(template, {
                        rolename: SHARED_KEY.rolename || "User",
                        projecttitle: SHARED_KEY.projecttitle || "Document",
                        au_key: redirectUrl
                    });

                    // 3️⃣ Construct Mail Payload
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

                    // 4️⃣ Debug & Testing Overrides
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
        };
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('DOMContentLoaded_LINK_SHARE', err.message);
    }
});