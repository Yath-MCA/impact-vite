var USER_MAIL = localStorage.getItem('xmleditor:login_username'),
    WF_ROLE = localStorage.getItem('xmleditor:login_workflow_role'),
    WF_CLIENT_LIST = localStorage.getItem('xmleditor:login_client_list');
if (WF_CLIENT_LIST) WF_CLIENT_LIST = WF_CLIENT_LIST.split(",");
var BOOK_CLIENTS = ["TNF", "OSO", "OXMEDO", "OHO", "LSE"];
var IS_BOOKS_USER = WF_CLIENT_LIST && WF_CLIENT_LIST.some(client => BOOK_CLIENTS.includes(client.toUpperCase()));
var isBooksReadOnlyUser = USER_MAIL == "books-readonly@nkw.pub";
var label1 = "",
    AU_KEY = Object.keys(ROLE_IDS)[0],
    IS_DASH_BOARD = Boolean(DOMAIN_URL.includes("dashboard")),
    IS_REPORT_BOARD = Boolean(DOMAIN_URL.includes("report")),
    webPage = {
        "OUP": "validateurloup",
        "NIHR": "validateurlnihr",
        "LWW": "validateurllww",
        "BRILL": "validateurlbrill",
        "PLOS": "validateurlplos",
        "INTELLECT": "validateurlintellect",
        "OSO": "validateurloso",
        "TNF": "validateurltnf",
        "default": "validateurl"
    };

window.addEventListener('load', (event) => {});
var gridOptions = {};
var MasterChartOptions = {};
var [ACTIVE] = ["active"];
var [IsFloatFilterVisible, LIVE_DEBUG] = [true, false];
var GET_ROLES = function(Obj, Option = {}) {
    try {
        let return_data = Object.entries(Obj)
            .filter(function([key, value]) {
                if (Option.active) return value == (ACTIVE);
                else return value != (ACTIVE);
            })
            .map(([key, value]) => key);
        return return_data;
    } catch (err) {
        console.warn(err.message);
    }
};
let getKey = function(z, Option = {
    getColId: false
}) {
    return z.field && !Option.getColId ? z.field : z.colId;
};
var [search_box, search_box_2, is_doi_search] = [null, null, null];
document.addEventListener('DOMContentLoaded', function(event) {
    try {
        var FetchAllBtn = document.getElementById("over_all"),
            filterPackageBtn = document.getElementById("package_all");
        user = document.getElementById('dash_username');
        if (user) {
            user.textContent = getuserinfo(USER_MAIL);
            // ROLE_IDS[USER_ROLE]['name'];
            user.title = USER_MAIL;
            $('[data-toggle="tooltip"]').tooltip();
        }
        // Check if the FetchAll button exists and assign an onclick event handler
        if (FetchAllBtn) {
            FetchAllBtn.onclick = () => {
                AG_GRID.SWIFT_REPORT('DASH_BOARD', {
                    isSearch: false
                });
            };
        }
        if (filterPackageBtn) {
            filterPackageBtn.onclick = () => {
                AG_GRID.SWIFT_REPORT('DASH_BOARD', {
                    filterPackage: true,
                    isSearch: false
                });
            };
        }
        search_box = document.getElementById('search_input');
        if (search_box) {
            search_box.addEventListener('changed', externalFilterChanged);
            search_box.addEventListener('paste', externalFilterChanged);
            search_box.addEventListener('input', externalFilterChanged);
        }
        let jo_list_div = document.getElementById('journal_name_div'),
            client_names = localStorage.getItem('xmleditor:login_client_list'),
            jo_list_search,
            jo_list_reset,
            jo_list_fetch,
            jo_list_items_div,
            direct_search_doi;
        if (jo_list_div) {
            try {
                var get_entry = function(name, ind, clientName) {
                    let entry = "";
                    if (!clientName) clientName = Object.keys(journal_list).find(key => journal_list[key].includes(name)) || "IMP";
                    try {
                        return entry = `<div class="form-check" id="${clientName}_${ind}"><input class="form-check-input" type="checkbox" onclick="setTimeout(($this)=>{AG_GRID.SWIFT_REPORT('DASH_BOARD',{from:'checkbox', evt: $this})},2500, this);" value="${name}" id="jo_${ind}"><label class="form-check-label" for="jo_${ind}">${name}</label></div>`;
                    } catch (error) {
                        entry = "";
                    } finally {
                        return entry;
                    }
                };
                var Collection = Array.from(client_names.split(",")).map((client, index) => {
                    return journal_list[client.toLocaleUpperCase()] ? journal_list[client.toLocaleUpperCase()].split(",").sort() : [];
                }).reduce((r, e) => (r.push(...e), r), []).sort().map((journal, idx) => {
                    return get_entry(journal, idx);
                });
                let frag = document.createRange().createContextualFragment(Collection.join(""));
                jo_list_items_div = jo_list_div.querySelector('.dropdown-menu form .list-items-div');
                jo_list_items_div.append(frag);
                jo_list_search = document.querySelector('.list-item-search');
                jo_list_reset = document.querySelector('.list-item-reset');
                jo_list_fetch = document.getElementById('journal_list_fetch_data');
                direct_search_doi = document.getElementById('direct_search_doi');

                function search_reset(e) {
                    try {
                        let target = e.currentTarget,
                            event_name = e.type || e.name,
                            select = jo_list_items_div.querySelectorAll(".form-check-label"),
                            length = select.length,
                            canShow = !0;
                        for (var i = length - 1; i >= 0; i--) {
                            if (event_name == "input") {
                                var find = new RegExp(`${target.value}`, 'gi');
                                canShow = target.value ? find.test(select[i].textContent) : !0;
                            }
                            select[i].parentElement.classList[canShow ? 'remove' : 'add']('d-none');
                        }
                    } catch (err) {
                        console.warn(err.message);
                    }
                }
                if (jo_list_search) jo_list_search.oninput = search_reset;
                if (jo_list_reset) jo_list_reset.onclick = search_reset;
                if (direct_search_doi) {
                    direct_search_doi.onkeydown = function(e) {
                        if (!e.repeat && e.key == "Enter" && !!e.target.value) {
                            AG_GRID.SWIFT_REPORT("DASH_BOARD", {
                                value: e.target.value.trim(),
                                isSearch: true
                            });
                            return false;
                        }
                    };
                }
            } catch (err) {
                console.warn(err.message);
                //ErrorLogTrace('journal_list_creation', err.message);
            }
        }

        var FIRE_INITIAL_REPORT = function() {
            try {
                if (/TNF|OSO|OXMEDO|OHO|LSE/gi.test(client_names) || IS_BOOKS_USER) {
                    AG_GRID.SWIFT_REPORT("DASH_BOARD", {
                        Init: true
                    });
                    if (jo_list_items_div.childElementCount == 1) {
                        jo_list_items_div.querySelector("input[type='checkbox']").checked = true;
                        jo_list_div.classList.add("d-none");
                    }
                } else AG_GRID.fire("DASH_BOARD", []);
            } catch (err) {
                console.warn(err.message);
            }
        };
        var TIMER = setInterval(() => {
            if (AG_GRID.initiated) {
                FIRE_INITIAL_REPORT();
                clearInterval(TIMER);
            } else {
                AG_GRID.Init();
            }
        }, 500);

    } catch (err) {
        console.warn(err.message);
    }
});
commonfn['updatedpdfres'] = function(response) {
    console.log(JSON.stringify(response));
    Swal.fire({
        "title": response.r == 1 ? "Success" : "Error",
        "text": ALERT_MESSAGE[response.r == 1 ? "PACKAGE" : "GeneratePDF_Last_Error"].text,
        "icon": response.r == 1 ? 'success' : "error",
        showDenyButton: false,
        showCancelButton: true,
    });
};
var NEW_COLLECTION = {},
    DOI_RECORD = "",
    DATE_BEFORE_MANIPULATION = 1679875203000,
    LINKS_DETAILS_ROLE = {},
    journal_list = {
        "OUP": 'CLINID,INFDIS,OFIDIS,CROCOL,JPPHAR,MUTAGE,FAMPRJ,IJPPHA,JBREIM,EORTHO,JPIDSJ,PCHEAL,JPHSRE,ABMEDI,JCAGAS,NICTOB,TBMEDI,IMMADV,DISCIM,SCHBUL,CARCIN,ECCOJC,ONCOLO,STCLTM,STMCLS,EXBOTJ,CLEXIM,DNARES,INTIMM,SLEEPO,IBDJNL,JBCRES,SBOPEN,SLEEPJ,JCBIOL,ANNWEH,BEHECO,CRIMIN,JHERED,JPECOL,AUKJNL,CONDOR,JMAMMA,TRANAS,JEENTO,AESAME,AMTEST,ISDIVE,JMENTO,BIOLIN,BOTLIN,ZOOLIN,CAMECO,EMPHEA,FQSAFE,HEAPRO,JOAAAC,LIFMED,LIFMET,WORKAR,MSPECI,ENVENT,IJNPPY,JANSCI,OCCMED,PROCEL,SYSBIO,CZOOLO,JHUMAN,JISESA,JOPART,PPMGOV,JOLEVO,INSILC,ARISOC,CHRIBI,SSJAPJ,JMPHIL,INTPOR,CLRECJ,EURSOJ,MELUSJ,SOCPRO,ANALYS,GRUINT,FORSCI,ENGHIS,ENVLAW,FRENCH,FRESTU,HISRES,JOFORE,REFLAW,STALAW,WHQUAR,CAMRES,ECOPOL,EJILAW,JAAREL,JALSCI,JPORGA,AJCLAW,ANFRON,ANNBOT,AOBPLA,APPLIJ,BICSTU,JIPMAN,OXJLSJ,THEOLJ,SOCHIS,JVCULT,MONIST,NEUONC,LITMAG,MTSPEC,PARLIJ,PETHIC,CLEANE,DESIGN,ELTJ.J,ESCRIT,FREBUL,GERHIS,HISCOL,CHEMSE,INTTEC,JLAJ,LEXICO,LITTHE,MIND.J,NOAJNL,NOPRAC,POLICE,SOCREL,PAST.J,JMTHER,EARLYJ,INDLAW,IJCLAW,ALECON,MODJUD,MTPERS,ADAPTA,AESTHJ,EVOLUT,EVLETT,AJCPAT,AMJHSP,ARBINT,GERONB,GERONT,LABMED,PPAREP,AJHYPE,ARISUP,CLPROB,CWWRIT,EVOLIN,GERONA,JHINDU,RPSPPR,GERONI,GERONI',
        "LWW": 'EJGH,IJRR,MD,GOX,EDE,INF,EJCP,PG,MR,PG,ACD,BPMJ,CAEN,IJRR,JPOB,NR,BPHARM,CAD,CD,EJEM,ICP,NMC,PGEN,AS9,CCX,CRD,EE9,HPC,ON9,JV9,PA9,MAT,JW9,CIR,CR9,BS9,AUD,TPA,HAE,MD9,DCR,XCS,TXD,PCC,CCM,ANE,IA9,IOP,GOX,JMQ,PQS,XAA',
        "NIHR": 'HTA,PGfAR,HSDR,EME,PHR',
        "PLOS": 'PWAT,PONE,PGEN',
        "BRILL": 'PUAN',
        "INTELLECT": 'FSPC',
        "TNF": "TNF",
        "LSE": "LSE",
        "OSO": "OSO",
        "OHO": "OHO",
    },
    ALLOWED_KEY = ["_id", "client", "identifier", "docid", "type", "emailto", "role", "rolename", "time_c", "status", "remark"];

function getJournalsList() {
    let Arr = Array.from(document.querySelectorAll(".form-check-input:checked")).map(entry => entry.value);
    return Arr.length > 0 ? Arr.join("|") : "";
}

var AG_GRID = {
    GRID_OPTION: {
        DASH_BOARD: {},
        TEST_2: {},
        TEST_3: {},
    },
    TIME_FORMAT: {
        DEFAULT: "DD-MMM-YYYY",
        DASH_BOARD: "DD-MMM-YYYY",
        TEST_2: "DD-MMM-YYYY, h:mm:ss a",
        TEST_3: "DD-MMM-YYYY, h:mm:ss a",
        TIME: "h:mm:ss a"
    },
    SUB_HEAD: {
        DEFAULT: "",
        DASH_BOARD: " Shared Links",
        TEST_2: "",
        TEST_3: ""
    },
    CURRENT_GRID_OPTION: {},
    CURRENT_GRID_COLLECTION_OLD: {},
    CURRENT_TYPE: null,
    initiated: false,
    FETCH_DOI: {},
    paginationBar: null,
    Init: function(_ = AG_GRID) {
        try {
            //07-08-2023
            this.KEY = "CompanyName=NEWGEN\x20KNOWLEDGE\x20WORKS\x20PRIVATE\x20LIMITED,LicensedGroup=Multi,LicenseType=MultipleApplications,LicensedConcurrentDeveloperCount=1,LicensedProductionInstancesCount=1,AssetReference=AG-034980,SupportServicesEnd=12_January_2024_[v2]_MTcwNTAxNzYwMDAwMA==3af86aedefc01b4b95bbafb254463768";
            agGrid.LicenseManager.setLicenseKey(this.KEY);
            _["GRID_OPTION"] = {
                "DEFAULT_columnDefs": {
                    "client": {
                        field: "client",
                        headerName: 'Client',
                        resizable: true,
                        // filter: 'agTextColumnFilter',
                        headerClass: 'fixed-size-header',
                        minWidth: 90,
                        maxWidth: 110
                    },
                    "journal": {
                        field: "journal",
                        headerName: 'Journal',
                        resizable: true,
                        hide: IS_BOOKS_USER,
                        valueGetter: (params) => {
                            try {
                                if (!params.data) return;
                                let [titleInfo, JT] = [params.data.titleinfo, ""];
                                if (titleInfo.cover) {
                                    JT = titleInfo.cover;
                                } else if (titleInfo.projectname) {
                                    JT = titleInfo.projectname.split("_")[0];
                                }
                                return JT;
                            } catch (err) {
                                console.log([params.data, params.data.status]);
                            }
                        }
                    },
                    "identifier": {
                        field: "identifier",
                        headerName: IS_BOOKS_USER ? "ISBN / iTitle" : 'DOI',
                        resizable: true,
                        //filter: 'agTextColumnFilter',
                        headerClass: 'fixed-size-header',
                        minWidth: 250
                    },
                    "status": {
                        field: "status",
                        headerName: 'Status',
                        valueGetter: (params) => {
                            try {
                                if (!params.data) return;
                                return params.data.status ? params.data.status.toUpperCase() : null;
                            } catch (err) {

                            }
                        },
                    },
                    "username": {
                        field: "username",
                        headerName: 'User',
                        resizable: true,
                        headerClass: 'fixed-size-header',
                        valueGetter: (params) => {
                            try {
                                if (!params.data) return;
                                return get_user_info(params.data);
                            } catch (err) {

                            }
                        }
                    },
                    "docid": {
                        field: "docid",
                        headerName: 'DOC ID',
                        resizable: true,
                    },
                    "type": {
                        field: "type",
                        headerName: 'Type',
                        width: 120
                    },
                    "workflow": {
                        field: "workflow",
                        colId: "link_workflow",
                        headerName: 'WorkFlow',
                        maxWidth: 135,
                        valueGetter: (params) => {
                            if (!params.data) return;
                            var obj = {
                                "pubkituat": "PUBKIT_UAT",
                                "pubkit": "PUBKIT_LIVE"
                            };
                            let temp = params.data.linkinfo ? obj[params.data.linkinfo] : 'Internal';
                            return temp;
                        }
                    },
                    "role": {
                        field: "role",
                        headerName: 'Role',
                        //filter: 'agTextColumnFilter',
                        valueGetter: (params) => {
                            if (!params.data || !params.data.role) return "";
                            return ROLE_IDS[params.data.role] ? ROLE_IDS[params.data.role].name : "";
                        },
                        width: 110
                    }
                },
                "DEFAULT_FILED": {
                    // if we had column groups, we could provide default group items here
                    multiSortKey: 'ctrl',
                    defaultColGroupDef: {},
                    defaultColDef: {
                        sortable: true,
                        flex: 0,
                        filter: true,
                        floatingFilter: false,
                        resizable: true,
                        enableRowGroup: true,
                        enablePivot: true,
                        enableValue: true,
                        tooltipComponent: CustomTooltip,
                        menuTabs: ["generalMenuTab", "filterMenuTab"]

                    },
                    // ? https://www.ag-grid.com/javascript-data-grid/component-overlay
                    loadingCellRenderer: CustomLoadingCellRenderer,
                    loadingCellRendererParams: {
                        loadingMessage: 'One moment please...',
                    },
                    loadingOverlayComponent: CustomLoadingOverlay,
                    loadingOverlayComponentParams: {
                        loadingMessage: 'One moment please...',
                    },
                    noRowsOverlayComponent: CustomNoRowsOverlay,
                    noRowsOverlayComponentParams: {
                        noRowsMessageFunc: () => 'No records found at: ' + new Date(),
                    },
                    // ? https://www.ag-grid.com/javascript-data-grid/component-tooltip/
                    tooltipShowDelay: 0,
                    tooltipHideDelay: 2000,
                    detailRowAutoHeight: true,
                    sideBar: {
                        toolPanels: ['columns', 'filters'],
                        defaultToolPanel: 'columns',
                        hiddenByDefault: true,
                    },
                    debounceVerticalScrollbar: true,
                    rowGroupPanelShow: "always",
                    pivotPanelShow: false,
                    pagination: true,
                    paginationAutoPageSize: false,
                    paginationPageSize: 100,
                    allowContextMenuWithControlKey: true,
                    enableRangeSelection: true,
                    rowSelection: 'multiple',
                    animateRows: true,
                    cacheQuickFilter: true,
                    // 07-08-2023
                    enableCharts: false,
                    isExternalFilterPresent: isExternalFilterPresent,
                    doesExternalFilterPass: doesExternalFilterPass,
                    onGridReady: (params) => {
                        params.api.sizeColumnsToFit();
                        window.addEventListener('resize', function() {
                            setTimeout(function() {
                                AG_GRID["CURRENT_GRID_OPTION"].api.paginationSetPageSize(this.window.innerHeight < 670 ? 10 : 20);
                            });
                        });
                        var defaultSortModel = [];
                        params.columnApi.applyColumnState({
                            state: defaultSortModel
                        });
                        this.paginationBar = document.querySelector(".ag-paging-panel");
                        // 07-08-2023
                    },
                    onFilterChanged: params => {

                        if (this.numberOfRows == 0)
                            params.api.showNoRowsOverlay();
                        else
                            params.api.hideOverlay();
                    },
                    onCellDoubleClicked: params => {
                        let [DE_ACT, COL_ID] = [params.data.status == 'deactive', params.event.target.getAttribute('col-id')];
                        let page = webPage[params.data.client] ? webPage[params.data.client] : webPage['default'];
                        console.log(params.data);
                        if (COL_ID == "identifier") {
                            console.log('cell was clicked', params);
                            if (params.data.signouttime || DE_ACT) {
                                Swal.fire({
                                    title: '',
                                    text: `The user document link is already ${DE_ACT ? 'expired/deactivated' : 'signed off'} and will be open with read-only mode.`,
                                    "icon": 'warning',
                                    showDenyButton: false,
                                    showCancelButton: true,
                                }).then((result) => {
                                    if (result.isConfirmed) {
                                        if (params.data.currenturl && params.data.key) {
                                            window.open(`${params.data.currenturl + page}.html?key=${params.data.key}`);
                                        }
                                    } else if (result.isDenied) {}
                                });
                                // ?  04_JAN_2023-YA VALIDATION FOR NEWLY CONFIGURED
                            } else if ((params.data.order && params.data.roles_orders && params.data.roles_orders.filter((obj) => obj.status == ACTIVE).length > 0) || (!params.data.order && params.data.roles_signoff && Object.values(params.data.roles_signoff).includes(ACTIVE))) {
                                Swal.fire({
                                    title: '',
                                    text: `Previous stage not closed. Do you want open with read-only mode?`,
                                    "icon": 'warning',
                                    showDenyButton: false,
                                    showCancelButton: true,
                                }).then((result) => {
                                    if (result.isConfirmed) {
                                        if (params.data.currenturl && params.data.key && IS_UAT_DOMAIN) {
                                            window.open(`${params.data.currenturl + page}.html?key=${params.data.key}`);
                                        }
                                    } else if (result.isDenied) {}
                                });
                            } else if (params.data.status == ACTIVE) {
                                if (params.data.currenturl && params.data.key) {
                                    window.open(`${params.data.currenturl + page}.html?key=${params.data.key}`);
                                } else {
                                    if (IS_UAT_DOMAIN && IS_ADMIN) {
                                        let local_mail = localStorage.getItem('xmleditor:login_username');
                                        if (!local_mail) localStorage.setItem('xmleditor:login_username', USER_MAIL);
                                        window.open(`${params.data.currenturl + editor}?docid=${params.data.docid}`);
                                    } else {
                                        Swal.fire('', 'Some primary key missing. Contact Support Team', 'info');
                                    }
                                }
                            }
                        } else if (COL_ID == "stage_internal" && params.data.status == "signoff" && params.event.target.classList.contains("ftpFail")) {
                            Swal.fire({
                                title: '',
                                text: `Do you want to regenerate the package?`,
                                "icon": 'warning',
                                showDenyButton: false,
                                showCancelButton: true,
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    if (params.data.currenturl && params.data.key) {
                                        let JSON_DATA = AG_GRID.PACKAGE_JSON(params);
                                        // let CONVERT_PORT_API = CONVERSION_PORT[window.location.host] ? CONVERSION_PORT[window.location.host] : CONVERSION_PORT['default'];
                                        commonfn['callajax'](JSON_DATA, 'updatedpdfres', API_BATCH_CONVERT);
                                    }
                                } else if (result.isDenied) {

                                }
                            });
                        }
                    }
                },
                "DEFAULT_ORDER": {
                    "DASH_BOARD": {
                        columnDefs_order: ["client", "identifier__tooltip", "docid", "proof_to_auth", "proof_close_auth", "stage_internal", "proof_to_coll", "proof_close_coll", "status"],
                        columnDefs_order_remove: []
                    },

                    "TEST_2": {
                        columnDefs_order: ["identifier__get", "client__get", "docid", "username__get", "xmlmissing"],
                        columnDefs_order_remove: []
                    },
                    "TEST_3": {
                        columnDefs_order: ["identifier__get", "client__get", "docid", "username__get", "xmlmissing"],
                        columnDefs_order_remove: []
                    },
                },
                "DASH_BOARD": {
                    // each entry here represents one column
                    columnDefs: [{
                            colId: "proof_to_auth",
                            headerName: 'Proof Sent',
                            filter: 'agDateColumnFilter',
                            filterParams: filterParams,
                            hide: IS_BOOKS_USER,
                            comparator: dateComparator,
                            //sort: 'desc',
                            valueGetter: (params) => {
                                try {
                                    if (!params.data) return;
                                    if (!ROLE_IDS[params.data.role][params.data._id]) {
                                        getTimeFormat(params.data);
                                    }
                                    /* beautify preserve:start */
                                let date = ((ROLE_IDS[Object.keys(ROLE_IDS)[0]][params.data._id]?.['SHARED']) || (ROLE_IDS[params.data.role][params.data._id]?.['SHARED']) || '');
                                return date;
                                /* beautify preserve:end */
                                } catch (err) {
                                    console.warn(err.message);
                                    console.log(params.data);
                                }
                            }
                        },
                        {
                            colId: "proof_close_auth",
                            headerName: 'Proof Completed',
                            initialSort: 'desc',
                            filter: 'agDateColumnFilter',
                            filterParams: filterParams,
                            hide: IS_BOOKS_USER,
                            comparator: dateComparator,
                            valueGetter: (params) => {
                                try {
                                    if (!params.data) return;
                                    if ('N0c1e4817-00f5-4c2b-9d19-20b2495a0e55' == params.data._id) {
                                        console.log('row');
                                    }
                                    /* beautify preserve:start */
                                let date = ROLE_IDS[AU_KEY][params.data._id]?.['SIGN_OUT'] || '';
                                return date;
                                /* beautify preserve:end */
                                } catch (err) {
                                    console.warn(err.message);
                                    console.log(params.data);
                                }
                            },
                        },
                        {
                            colId: "stage_internal",
                            headerName: 'Current Stage',
                            //filter: 'agTextColumnFilter',
                            // comparator: stageComparator,
                            //chartDataType: 'series',
                            // field: 'function',
                            cellClass: params => {
                                if (!params.data) return null;
                                return params.data.ftpfail ? 'ftpFail' : 'ftpPass';
                            },
                            valueGetter: (params) => {
                                try {
                                    if (!params.data) return null;
                                    let [row, stage, IsActive] = [params.data, "Nil", (params.data.status == ACTIVE)];
                                    if (IsActive) stage = ROLE_IDS[row.role]['Stage'];
                                    if (((ROLE_IDS.CO == row.role && row.roles_orders) || !!row.nextrole) && !params.data.roles_signoff) {
                                        let HaveActiveOtherRole = params.data['roles_orders'] ? params.data['roles_orders'].filter((obj) => obj.status == ACTIVE)[0] : null;
                                        // ? NEW RECORD FORMAT
                                        if (row.nextrole && !IsActive) {
                                            // ? EXCEPT COLLATOR ROLE
                                            stage = ROLE_IDS[row.nextrole.role]['Stage'];
                                        } else if (row.roles_orders) {
                                            // ? COLLATOR ROLE
                                            if (!IsActive) {
                                                stage = `Package ${params.data.ftpfail ? 'not' : ""} sent`;
                                            } else if (HaveActiveOtherRole) {
                                                stage = ROLE_IDS[HaveActiveOtherRole.role]['Stage'];
                                            }
                                        }
                                    } else {
                                        // ? OLD RECORD 
                                        stage = GET_STAGE(params);
                                    }
                                    return stage;
                                } catch (err) {
                                    console.log(err.message);
                                    console.log(params.data);
                                }
                            }
                        },
                        {
                            colId: "proof_to_coll",
                            headerName: 'Collection Sent',
                            hide: true,
                            //initialSort: 'asc',
                            filter: 'agDateColumnFilter',
                            filterParams: filterParams,
                            comparator: dateComparator,
                            valueGetter: (params) => {
                                try {
                                    if (!params.data) return;
                                    /* beautify preserve:start */
                                return ROLE_IDS[ROLE_IDS.CO][params.data._id]?.['SHARED'] || '';
                                /* beautify preserve:end */
                                } catch (err) {
                                    console.log(err.message);
                                    console.log(params.data);
                                }
                            },
                        },
                        {
                            colId: "proof_close_coll",
                            headerName: 'Collection Completed',
                            filter: 'agDateColumnFilter',
                            filterParams: filterParams,
                            comparator: dateComparator,
                            valueGetter: (params) => {
                                try {
                                    if (!params.data) return;
                                    /* beautify preserve:start */
                                return ROLE_IDS[ROLE_IDS.CO][params.data._id]?.['SIGN_OUT'] || '';
                                /* beautify preserve:end */
                                } catch (err) {
                                    console.log(err.message);
                                    console.log(params.data);
                                }
                            },
                        }
                    ]
                },
                "TEST_2": {
                    columnDefs: [{
                        headerName: "XML Status",
                        field: "xmlmissing",
                        resizable: true,
                        headerClass: 'fixed-size-header'
                    }]
                },
                "TEST_3": {
                    columnDefs: [{
                        headerName: "XML Status",
                        field: "xmlmissing",
                        resizable: true,
                        headerClass: 'fixed-size-header'
                    }]
                }
            };
            if (IS_DASH_BOARD) {
                if (IS_ADMIN) {
                    _["GRID_OPTION"]["DEFAULT_ORDER"]["DASH_BOARD"]['columnDefs_order_remove'].push("proof_to_coll", "proof_close_coll");
                }
                if (IS_BOOKS_USER) _["GRID_OPTION"]["DEFAULT_ORDER"]["DASH_BOARD"]['columnDefs_order'].splice(1, 0, "journal");
            }
            let reports = _["GRID_OPTION"];
            var default_field = _["GRID_OPTION"]["DEFAULT_FILED"];
            var ListReports = _["GRID_OPTION"]["DEFAULT_ORDER"];
            var ListReportsKeys = Object.keys(ListReports);
            var default_column = _["GRID_OPTION"]["DEFAULT_columnDefs"];
            for (const key in default_column) {
                if (key == "identifier") {
                    // ? TOOLTIP
                    default_column[key + "__tooltip"] = {
                        tooltipField: 'identifier',
                        tooltipComponentParams: {
                            color: '#ececec'
                        }
                    };
                    Object.assign(default_column[key + "__tooltip"], default_column[key]);
                }
                if (key.match(/identifier|client|username/)) {
                    // ? GET_METHOD
                    default_column[key + "__get"] = {
                        valueGetter: AG_GRID.GET_IDENTIFIER
                    };
                    Object.assign(default_column[key + "__get"], default_column[key]);
                }
            }
            for (const key in reports) {
                if (key.match(/DASH_BOARD|ACTIVE_SESSION|XML_FAIL|SIGN_OFF_REPORT|SEARCH_DATA|LINK_CREATED/)) {
                    let [column, order, remove, new_column] = [(reports[key]["columnDefs"]), (reports["DEFAULT_ORDER"][key]['columnDefs_order']), (reports["DEFAULT_ORDER"][key]['columnDefs_order_remove']), {}];
                    if (order) {
                        order.forEach((seq, idx, arr) => {
                            if ((column[idx] && column[idx].colId != seq && column[idx].field != seq) || (!column[idx])) {
                                let ObjectValues = default_column[seq];
                                if (ObjectValues) {
                                    // ? hiding
                                    if (key.match(/DASH_BOARD/) && !IS_ADMIN && seq == "docid") {
                                        ObjectValues.hide = true;
                                    }
                                    column.push(ObjectValues);
                                }
                            }
                        });
                        // ? sorting
                        if (remove) {
                            new_column = column.filter(function(el) {
                                return remove.indexOf(getKey(el)) == -1;
                            });
                        }
                        if (Object.keys(new_column).length != Object.keys(column).length && Object.keys(new_column).length != 0) column = new_column;
                        const sort_order = order.map(x => x.split("__")[0]);
                        column = column.sort(function(a, b) {
                            let [a_ind, b_ind] = [sort_order.indexOf(getKey(a)), sort_order.indexOf(getKey(b))];
                            return a_ind - b_ind;
                        });
                        console.log(column);
                        _["GRID_OPTION"][key]["columnDefs"] = column;
                    }
                }
            }
            for (const key in default_field) {
                for (const event in _["GRID_OPTION"]) {
                    if (ListReportsKeys.includes(event)) {
                        _["GRID_OPTION"][event][key] = default_field[key];
                    }
                }
            }
            for (const event in ListReports) {
                let CHECK = ListReports[event];
                if (CHECK && CHECK["GRID_ADD_OPTIONS"]) {
                    CHECK = CHECK["GRID_ADD_OPTIONS"];
                    for (const key in CHECK) {
                        _["GRID_OPTION"][event][key] = CHECK[key];
                    }
                }
            }
            _.initiated = true;
        } catch (err) {
            console.warn(err.message);
        }
    },
    FETCH_DETAILS: function(params, _ = AG_GRID) {
        try {} catch (err) {
            console.warn(err.message);
        }
    },
    PACKAGE_JSON: function(params, _ = AG_GRID) {
        try {
            return {
                "docid": params.data.docid,
                "ext": "html",
                "topic": "XMLTOPDFLIVENEW4",
                "consteps": "1",
                "process": "xml",
                "platform": "htmltoxml",
                "fileson": [
                    params.data.docid + "_updated.html"
                ],
                "files": [
                    params.data.docid + "_updated.html"
                ],
                "shorttitle": params.data.titleinfo.cover,
                "outputfile": params.data.docid + ".zip",
                "username": params.data.emailtolist,
                "client": params.data.client,
                "role": params.data.role,
                "rolename": params.data.rolename,
                "identifier": params.data.identifier,
                "session_id": null,
                "dtd": params.data.dtd,
                "type": params.data.type,
                "vendor": params.data.vendor

            };
        } catch (err) {
            console.warn(err.message);
            //ErrorLogTrace('FETCH_DETAILS', err.message);
        }
    },
    ROW_FILTER: function(params) {
        try {
            console.log(params.data);
        } catch (err) {
            console.warn(err.message);
        }
    },
    GetFragment: function(_String) {
        try {
            return document.createRange().createContextualFragment(_String);
        } catch (err) {
            console.warn(err.message);
        }
    },
    PageCoutLayout: function(Options, _ = AG_GRID) {
        try {
            var template = `<div ref="eStatusBarRight" class="ag-status-bar-left" role="status"><div class="ag-status-name-value"><span>Record limit : <select onchange="onPageSizeChanged()" id="page-size"><option value="10">10</option><option value="50">50</option><option value="100" selected>100</option><option value="500">500</option><option value="1000">1000</option></select></span></div></div>`;
            this.paginationBar = document.querySelector(".ag-paging-panel");
            if (!this.paginationBar) {
                setTimeout((_) => {
                    _.PageCoutLayout();
                }, 444, _);
                return;
            }
            this.paginationBar.firstChild.before(this.GetFragment(template));
            this.paginationLimit = document.querySelector("#page-size");
            if (this.paginationLimit) {
                console.log("paginationLimit_Before");
                this.paginationLimit.onchange = function() {
                    try {
                        console.log("paginationLimit");
                        setTimeout((_, Value) => {
                            _.CURRENT_GRID_OPTION.api.paginationSetPageSize(Number(Value));
                            console.log("paginationLimit fired  " + Value);
                        }, 999, _, this.value);
                    } catch (err) {
                        console.warn(err.message);
                    }
                };
            }
        } catch (err) {
            console.warn(err.message);
        }
    },
    ShowLoadingIcon: function(Type, Options, _ = AG_GRID) {
        try {
            function onBtShowLoading() {
                gridOptions.api.showLoadingOverlay();
            }

            function onBtShowNoRows() {
                gridOptions.api.showNoRowsOverlay();
            }

            function onBtHide() {
                gridOptions.api.hideOverlay();
            }
            // ? https://www.ag-grid.com/javascript-data-grid/component-overlay/
            var rowCount = AG_GRID.CURRENT_GRID_OPTION.api.paginationGetRowCount();
            if (_.CURRENT_GRID_OPTION.api) {
                console.log(Type);
                if (Type == "ShowLoading") {
                    _.CURRENT_GRID_OPTION.api.showLoadingOverlay();
                } else {
                    _.CURRENT_GRID_OPTION.api[rowCount == 0 ? 'showNoRowsOverlay' : 'hideOverlay']();
                }
            } else console.warn(Type);
        } catch (err) {
            console.warn(err.message);
        }
    },
    fire: function(Type, Data, Options, _ = AG_GRID) {
        try {
            var eGridDiv = document.getElementById("myGrid");
            if (Object.keys(_.CURRENT_GRID_OPTION).length > 0) {
                _.CURRENT_GRID_OPTION.api.destroy();
            }
            _.CURRENT_TYPE = Type;
            _.CURRENT_GRID_OPTION = _["GRID_OPTION"][Type];
            _.CURRENT_GRID_COLLECTION_OLD[new Date().getTime()] = Data;
            new agGrid.Grid(eGridDiv, _.CURRENT_GRID_OPTION);
            _.CURRENT_GRID_OPTION.api.setRowData(Data);
            _.PageCoutLayout();
        } catch (err) {
            console.warn(err.message);
        }
    },
    MANIPULATE_DATES: function(date, Count, Options = {
        Date: true,
        Month: false,
        Before: true,
        After: false,
        GetTime: true
    }) {
        try {
            date = !date ? new Date() : date;
            let Value = date[Options.Month ? "getMonth" : "getDate"](),
                init_year = date.getFullYear(),
                beforeAfterValue = Value;
            if (Options.Before) {
                if (Value < Count) {
                    date.setFullYear(init_year - 1);
                } else {
                    beforeAfterValue = Value - Count;
                }
            } else beforeAfterValue = Value + Count;
            date[Options.Month ? "setMonth" : "setDate"](beforeAfterValue);
            return !Options.GetTime ? date : date.getTime();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('MANIPULATE_DATES', err.message);
        }
    },
    HIT_API_RETURN: function(queryJSON, endPoint, reportModel, _ = AG_GRID) {
        try {
            commonfn['GET_RECORD'] = function(response, opt) {
                console.log('GET_RECORD');
                console.log(JSON.stringify(response));
                AG_GRID.fire(opt, response.data);
                setTimeout(() => {
                    AG_GRID.ShowLoadingIcon("hideOverlay");
                }, 2500);
            };
            commonfn['callajax'](queryJSON, 'GET_RECORD', endPoint, reportModel);
            console.log("HIT_API_RETURN");
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('HIT_API_RETURN', err.message);
        }
    },
    FETCH_REPORT_QUERY: function(reportModel, options = {}, _ = AG_GRID) {
        try {

            function buildStatusCondition(options, isBooksReadOnlyUser) {
                if (isBooksReadOnlyUser) {
                    return {
                        "$in": ["signoff"]
                    };
                }
                if (options.isSearch) {
                    return {
                        "$ne": "deactive"
                    };
                }
                if (options.filterPackage) {
                    return {
                        "$in": ["signoff"]
                    };
                }
                return {
                    "$nin": ["deactive", "signoff"]
                };
            }

            function buildDoiRegex(value) {
                if (!value) return null;
                let findDoi = value
                    .split(",")
                    .map(item => `^${item}$|^${item}|${item}$`)
                    .join("|");
                if ([' ', ',', '.'].some(char => findDoi.endsWith(char))) {
                    findDoi = findDoi.slice(0, -1);
                }
                return {
                    "$regex": findDoi,
                    "$options": "i"
                };
            }

            function buildBaseFind(linkInfo, statusCondition, wfClientList) {
                return {
                    "pubkitres": {
                        "$exists": false
                    },
                    "linkinfo": linkInfo,
                    "role": ROLE_IDS.CO,
                    "client": {
                        "$in": wfClientList || []
                    },
                    "corole": {
                        "$exists": false
                    },
                    "status": statusCondition
                };
            }

            let END_POINT = API_GET_DOCS;
            let LINK_INFO = IS_LIVE_DOMAIN ? {
                "$eq": "pubkit"
            } : (IS_ADMIN ? {
                "$ne": "pubkit"
            } : {
                "$eq": "pubkit"
            });
            let jsondata = {};
            if (reportModel === "DASH_BOARD") {
                const statusCondition = buildStatusCondition(options, isBooksReadOnlyUser);
                const baseFind = buildBaseFind(LINK_INFO, statusCondition, WF_CLIENT_LIST);
                jsondata = {
                    "tbl": "Shareandinvite",
                    "length": options.isSearch ? 1000 : 5000,
                    "find": baseFind,
                    "sort": {
                        "time_c": -1
                    },
                    "filter": ["docid", "status", "emailto", "dtd", "apikey", "role", "key", "taskid"]
                };

                if (isBooksReadOnlyUser) {
                    delete baseFind['pubkitres'];
                    jsondata.length = 100;
                }
                if (IS_BOOKS_USER) {
                    LINK_INFO = {
                        "$in": ["pubkit", "pubkittnf"]
                    };
                    jsondata.find.linkinfo = LINK_INFO;
                }

                const journal_name_list = getJournalsList();

                if (options.value || journal_name_list) {
                    if (journal_name_list.length > 0 && !IS_BOOKS_USER) {
                        jsondata["titleinfo.cover"] = {
                            "$regex": journal_name_list,
                            "$options": "i"

                        };
                    }
                    const doiRegex = buildDoiRegex(options.value);
                    if (doiRegex) {
                        jsondata.find.identifier = doiRegex;
                    }
                }
            }

            setTimeout((data, endpoint, report) => {
                _.HIT_API_RETURN(data, endpoint, report);
            }, 750, jsondata, END_POINT, reportModel);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('FETCH_REPORT_QUERY', err.message);
        }
    },
    SWIFT_REPORT: function(e, Options = {}, _ = AG_GRID) {
        try {
            DOI_RECORD = "";
            _.ShowLoadingIcon("ShowLoading");
            var Report_Type = ((e.target && (typeof e.target.getAttribute == "function")) ? (e.target.getAttribute("data-report")) : e);
            if (!Report_Type) Report_Type = $('option:selected', $(this)).attr("data-report");
            if (!Report_Type || Options.from == "checkbox" && document.querySelectorAll(".form-check-input:checked").length == 0) {
                _.CURRENT_GRID_OPTION.api.setRowData([]);
                AG_GRID.ShowLoadingIcon("hideOverlay");
                return false;
            }
            _.FETCH_REPORT_QUERY(Report_Type, Options);
            document.querySelectorAll("button[data-show='default'],[data-show='default']").forEach(element => {
                element.classList[Report_Type == "DASH_BOARD" ? "remove" : "add"]("d-none");
            });
            let subHead = document.getElementById("_subhead");
            if (subHead) subHead.textContent = _.SUB_HEAD[Report_Type];
            if (_.CURRENT_GRID_OPTION.api.getDisplayedRowCount() > 0)
                _.ShowLoadingIcon("ShowLoading");
        } catch (err) {
            console.warn(err.message);
        }
    },
    GET_TIME_C: function(params, _ = AG_GRID) {
        try {
            if (!params.data) return "";
            let time_stamp = params.data["time_c"];
            // ? HANDLING TIMESTAMP - SAVE
            if (params.data.timestamp || params.data.session_start_time || (params.data.session_end_time && params.data.session_end_time != "0")) {
                time_stamp = params.data.timestamp ? params.data.timestamp : params.data.session_end_time != "0" && params.data.end_session_key ? params.data.session_end_time : params.data.session_start_time;
            } else if (time_stamp && time_stamp['$numberLong']) {
                time_stamp = time_stamp['$numberLong'];
            }
            var format = _.TIME_FORMAT[_.CURRENT_TYPE ? _.CURRENT_TYPE : "DEFAULT"];
            let time_date = moment(parseInt(time_stamp)).format(format);
            if (time_date == "Invalid date") {
                console.log(time_date);
            }
            return time_date;
        } catch (err) {
            console.warn(err.message);
        }
    },
    GET_DATE_TIME: function(params, _ = AG_GRID) {
        try {
            if (!params.data) return "";
            let _id = params.column.colId;
            let time_stamp = params.data[_id];
            if (["null", null].includes(time_stamp)) return "";
            else if ("0" == time_stamp && "last_saved_time" == _id) {
                time_stamp = params.data["session_start_time"];
            }
            var format = _.TIME_FORMAT[_.CURRENT_TYPE ? _.CURRENT_TYPE : "DEFAULT"];
            let time_date = moment(parseInt(time_stamp)).format(format);
            if (time_date == "Invalid date") {
                console.log(time_date);
                return "";
            } else return time_date;
        } catch (err) {
            console.warn(err.message);
        }
    },
    FILLETER_SESSION: function(collection, _ = AG_GRID) {
        try {
            Array.from(collection).forEach(element => {});
        } catch (err) {
            console.warn(err.message);
        }
    },
    GET_IDENTIFIER: function(params, _ = AG_GRID) {
        try {
            if (!params.data) return "Nil";
            var [doc_id, ROW_ID, COL_ID] = [params.data["docid"], params["node"]["id"], params.colDef.field];
            if (params.data[COL_ID] || (_.FETCH_DOI[doc_id] && Object.keys(_.FETCH_DOI[doc_id]).length > 0)) {
                if (params.data[COL_ID]) return params.data[COL_ID];
                if (_.FETCH_DOI[doc_id][COL_ID] && _.FETCH_DOI[doc_id][COL_ID].length > 0) {
                    return _.FETCH_DOI[doc_id][COL_ID];
                }
            } else {
                if (typeof _.FETCH_DOI[doc_id] == "undefined") {
                    _.FETCH_DOI[doc_id] = {};
                }
                commonfn['GET_DOI'] = function(response, opt) {
                    console.log('GET_DOI');
                    if (opt.col_id == "username") console.log(JSON.stringify(response));
                    if (response.data.length > 0) {
                        var data = response.data[0];
                        var cell = document.querySelector(`[row-id="${opt.row_id}"] [col-id="${opt.col_id}"]`);
                        var VALUE = data[opt.col_id];
                        if (cell && VALUE) {
                            if (opt.col_id == "username") console.log(data);
                            cell.textContent = VALUE;
                        }
                        if (VALUE) {
                            params.data[opt.col_id] = VALUE;
                            _.FETCH_DOI[data.docid][opt.col_id] = VALUE;
                            if (opt.col_id == "identifier") {
                                var client = document.querySelector(`[row-id="${opt.row_id}"] [col-id="client"]`);
                                if (client) {
                                    params.data["client"] = data["client"];
                                    _.FETCH_DOI[data.docid]["client"] = data["client"];
                                    client.textContent = data["client"];
                                }
                            }
                        }
                    }
                };
                let jsondata = {
                    "tbl": "Shareandinvite",
                    "find": {
                        "docid": doc_id
                    },
                    "length": 5000,
                    "sort": {},
                };
                if (COL_ID == "client") {
                    return "Nil";
                } else if (COL_ID == "identifier") {
                    jsondata.find["identifier"] = {
                        "$exists": true
                    };
                } else {
                    let last_save = params.data.last_saved_time;
                    if (last_save == "0") {
                        return "Nil";
                    }
                    last_save = last_save.slice(0, 6);
                    jsondata.tbl = "Fileslist";
                    jsondata.find["roleorg"] = {
                        "$exists": false
                    };
                    jsondata.find["timestamp"] = {
                        $regex: "^" + last_save
                    };
                }
                //db.getCollection('rFileslist').find({"docid":"N7504abe6-fac7-4753-9dd4-5ceffb096c46","roleorg": {"$exists": false},"timestamp":{$regex: /^167646/}})                
                //console.log(params["node"]["id"]);
                if (doc_id == "N7504abe6-fac7-4753-9dd4-5ceffb096c46") {
                    console.log(jsondata);
                }
                setTimeout((jsondata, Obj) => {
                    commonfn['callajax'](jsondata, 'GET_DOI', API_GET_DOCS, Obj);
                }, 2500, jsondata, {
                    row_id: ROW_ID,
                    col_id: COL_ID
                });
                return "Nil";
            }
        } catch (err) {
            console.warn(err.message);
        }
    }
};

function GET_STAGE(params) {
    try {
        // ? for Stage purpose
        var [row, roles_Obj, stage, row_id, IsActive] = [params.data, (params.data['roles_signoff']), '', null, (params.data.status == ACTIVE)];
        // ? NEW_FORMAT_RECORD_WITH_NEXT_ROLE_STAGE
        row_id = ROLE_IDS[row.role][row._id];
        if (row_id == undefined) {
            getTimeFormat(params.data);
            row_id = ROLE_IDS[row.role][row._id];
        }
        if (["10.1093/pch/pxac103"].includes(row.identifier) && IS_LOCAL_HOST) {
            console.log("DEBUG___" + row.identifier);
        }
        if (row_id && row_id['Stage']) {}
        if (IsActive) {
            stage = ROLE_IDS[row.role]['Stage'];
        }
        if (roles_Obj) {
            // ? https://stackoverflow.com/questions/61229242/how-to-filter-json-object-javascript
            // ? https://stackblitz.com/edit/js-9qbhhc?file=index.js
            let HaveActive = Object.values(roles_Obj).includes(ACTIVE);
            if (ROLE_IDS.CO == row.role) {
                if (roles_Obj[AU_KEY] == ACTIVE && IsActive) {
                    stage = ROLE_IDS[AU_KEY]['Stage'];
                } else if (!IsActive) {
                    stage = `Package ${params.data.ftpfail ? 'not' : ""} sent`;
                }
            } else {
                let temp_key = GET_ROLES(roles_Obj, {
                    active: !HaveActive
                }).sort(stageComparator)[0];
                stage = ROLE_IDS[roles_Obj[AU_KEY] != ACTIVE ? temp_key : AU_KEY]['Stage'];
                if (!HaveActive) {
                    // TODO CHECK WHICH SCENARIO
                    console.warn("NON_ACTIVE_" + row.identifier);
                }
            }
        }
        ROLE_IDS[row.role][row._id]['Stage'] = row['Stage'] = stage;
        return stage;
    } catch (error) {
        console.warn(error.message);
    }
}

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
var getDate = function(timeStamp, type) {
    try {
        var format = type ? type : AG_GRID.TIME_FORMAT[AG_GRID.CURRENT_TYPE ? AG_GRID.CURRENT_TYPE : "DEFAULT"];
        return moment(parseInt(timeStamp)).format(format);
    } catch (err) {
        console.warn(err.message);
    }
};
var getOnlyDate = function(timeStamp, type) {
    try {
        var format = type ? type : AG_GRID.TIME_FORMAT[AG_GRID.DEFAULT ? AG_GRID.DEFAULT : "DEFAULT"];
        return moment(parseInt(timeStamp)).format(format);
    } catch (err) {
        console.warn(err.message);
    }
};
var getOnlyTime = function(timeStamp, type) {
    try {
        var format = type ? type : AG_GRID.TIME_FORMAT[AG_GRID.TIME ? AG_GRID.TIME : "TIME"];
        return moment(parseInt(timeStamp)).format(format);
    } catch (err) {
        console.warn(err.message);
    }
};

function log_out_dash() {
    window.location.href = DOMAIN_ROOT + 'login.html';
}
var SetSignOffTime = function(row) {
    try {
        let Obj = row['roles_signoff'];
        if (Obj) {
            for (const role in Obj) {
                if (Obj[role] != ACTIVE) {
                    if (!ROLE_IDS[role][row._id]) {
                        ROLE_IDS[role][row._id] = {
                            'SIGN_OUT': ""
                        };
                    }
                    let DateValue = (Obj[role].$numberLong ? Obj[role].$numberLong : "");
                    ROLE_IDS[role][row._id]['SIGN_OUT'] = DateValue ? getDate(DateValue) : DateValue;
                }
            }
        } else if (row['roles_orders']) {
            row['roles_orders'].forEach((obj) => {
                let role = obj['role'];
                Object.entries(obj).forEach(([key, value]) => {
                    if (key == 'status' && value != ACTIVE) {
                        if (!ROLE_IDS[role][row._id]) {
                            ROLE_IDS[role][row._id] = {
                                'SIGN_OUT': ""
                            };
                        }
                        let DateValue = (obj.status ? obj.status.$numberLong ? obj.status.$numberLong : obj.status : "");
                        ROLE_IDS[role][row._id]['SIGN_OUT'] = DateValue ? getDate(DateValue) : DateValue;
                    }
                });
                console.log('-------------------');
            });
        }
    } catch (err) {
        console.warn(err.message + '_' + row._id);
    }
};
const getTimeFormat = function(row) {
    try {
        let TEMP = {
            'name': ROLE_IDS[row.role]['name'],
            "SHARED": row.time_c ? getDate(row.time_c.$numberLong) : ('')
        };
        SetSignOffTime(row);
        if (row.signouttime) {
            TEMP["SIGN_OUT"] = getDate(row.signouttime.$numberLong);
        }
        if (ROLE_IDS[row.role][row._id] && ROLE_IDS[row.role][row._id]['Stage']) {
            TEMP["Stage"] = ROLE_IDS[row.role][row._id]['Stage'];
        }
        ROLE_IDS[row.role][row._id] = TEMP;
    } catch (err) {
        console.warn(err.message);
        console.log(row.signouttime);

    }
};

function classCase(Word) {
    try {
        var rg = /(^\w{1}|\s\w{1}|\.\w{1})/gi;
        Word = Word.replace(rg, function(toReplace) {
            return toReplace.toUpperCase().replace('.', ' ');
        });
        return Word;
    } catch (err) {
        console.warn(err.message);
    }
}

function getuserinfo(email) {
    try {
        return classCase(email.replace(/@\w+\.\w+(\.\w+)?/g, "")).replace('.', ' ');
    } catch (err) {
        console.log(err.message);
    }
}

function deselect() {
    AG_GRID["CURRENT_GRID_OPTION"].api.deselectAll();
}

function onBtExport() {
    try {
        var FILE_NAME = `IMPACT_${AG_GRID.CURRENT_TYPE}_${moment().format('YYYY_MM_DD_h:mm:ss_A')}.xlsx`;
        // ? https://www.ag-grid.com/javascript-data-grid/excel-export-multiple-sheets/
        const spreadsheets = [];
        spreadsheets.push(AG_GRID["CURRENT_GRID_OPTION"].api.getSheetDataForExcel());
        AG_GRID["CURRENT_GRID_OPTION"].api.exportMultipleSheetsAsExcel({
            data: spreadsheets,
            fileName: FILE_NAME,
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('onBtExport', err.message);
    }
}
var filterParams = {
    comparator: (filterLocalDateAtMidnight, cellValue) => {
        var dateAsString = cellValue;
        if (dateAsString == null) return -1;
        var dateParts = dateAsString.split('-');
        var cellDate = new Date(
            Number(dateParts[2]),
            Number("JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(dateParts[1]) / 3 + 1) - 1,
            Number(dateParts[0])
        );
        if (filterLocalDateAtMidnight.getTime() === cellDate.getTime()) return 0;
        if (cellDate < filterLocalDateAtMidnight) return -1;
        if (cellDate > filterLocalDateAtMidnight) return 1;
    },
    browserDatePicker: true,
};

function stageComparator(stage1, stage2) {
    let Order_Of_Stage = ["Authoring", "PE Review", "ED Review", "Proof Reading", "JM Review", "CE Review", 'PM Review', "Collation", "XML"];
    if (ROLE_IDS[stage1]) {
        stage1 = ROLE_IDS[stage1].Stage;
        stage2 = ROLE_IDS[stage2].Stage;
    }
    let [index1, index2] = [Order_Of_Stage.indexOf(stage1), Order_Of_Stage.indexOf(stage2)];
    if (index1 < index2) {
        return -1;
    }
    if (index1 > index2) {
        return 1;
    }
    return 0;
}

function dateComparator(date1, date2) {
    if (date1 == "Nil") date1 = moment(1970).format('DD-MM-YYYY');
    if (date2 == "Nil") date2 = moment(1970).format('DD-MM-YYYY');
    const date1Number = Date.parse(date1);
    const date2Number = Date.parse(date2);
    if (date1Number === null && date2Number === null) {
        return 0;
    }
    if (date1Number === null) {
        return -1;
    }
    if (date2Number === null) {
        return 1;
    }
    return date1Number - date2Number;
}
// eg 29/08/2004 gets converted to 20040829
function monthToComparableNumber(date) {
    if (date === undefined || date === null || date == 'NA') return null;
    else if (date.length !== 10) {
        date = moment(date).format('DD-MM-YYYY');
    } else if (!date) return null;
    const yearNumber = Number.parseInt(date.substring(6, 10));
    const monthNumber = Number.parseInt(date.substring(3, 5));
    const dayNumber = Number.parseInt(date.substring(0, 2));
    return yearNumber * 10000 + monthNumber * 100 + dayNumber;
}

function create_Chart() {
    var params = {
        chartType: 'column',
        cellRange: {
            columns: ['client', 'status', 'stage_internal'],
        },
        chartThemeOverrides: {
            common: {
                title: {
                    enabled: true,
                    text: 'Chart',
                },
                legend: {
                    enabled: true,
                },
            },
        },
        seriesChartTypes: [{
                colId: 'client',
                chartType: 'groupedColumn',
                secondaryAxis: true
            },
            {
                colId: 'status',
                chartType: 'groupedColumn',
                secondaryAxis: true
            },
        ],
        aggFunc: 'sum',
        suppressChartRanges: true,
        chartContainer: document.querySelector('#myGrid_Char'),
    };
    AG_GRID["CURRENT_GRID_OPTION"].api.createRangeChart(params);
}
var I_FILTER_TEXT = '';

function isExternalFilterPresent() {
    // if ageType is not everyone, then we are filtering
    return I_FILTER_TEXT !== '';
}

function externalFilterChanged(ths) {
    I_FILTER_TEXT = ths.target.value.trim().toUpperCase();
    AG_GRID["CURRENT_GRID_OPTION"].api.onFilterChanged();
}

function doesExternalFilterPass(rowNode) {
    try {
        var getCelValue = function(key, rowNode) {
            try {
                return AG_GRID["CURRENT_GRID_OPTION"].api.getValue(key, rowNode);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('getCelValue', err.message);
            }
        };
        var IsNullValue = function(value) {
            try {
                return [null, undefined, "null", "undefined", ""].includes(value);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('IsNullValue', err.message);
            }
        };
        var [cellValue, ReTurn] = ["", false];
        rowNode.beans.columnApi.columnModel.columnDefs.forEach(column => {
            // ? gettting all cell values
            let [key, colId_Key] = [getKey(column), getKey(column, {
                getColId: true
            })];
            let tempValue = getCelValue(key, rowNode);
            if (IsNullValue(tempValue) && colId_Key) {
                tempValue = getCelValue(colId_Key, rowNode);
            }
            if (IsNullValue(tempValue)) console.warn([tempValue, column.field]);
            else cellValue += tempValue;
        });
        if (cellValue.toUpperCase().indexOf(I_FILTER_TEXT) > -1) {
            return true;
        } else if (I_FILTER_TEXT == '') {
            return true;
        } else {
            return false;
        }

    } catch (err) {
        console.log(err.message);
        console.log(node.data);
    }
}

function FilterMethod(ths, Opt, girdOpt) {
    // ? https://www.ag-grid.com/javascript-data-grid/filter-set-api/
    // ? https://www.ag-grid.com/javascript-data-grid/filter-api/
    try {
        girdOpt = AG_GRID["CURRENT_GRID_OPTION"];
        let IsRest = ths.dataset.filter == "reset";
        let filterBy = ths.getAttribute('data-filter');
        ths.closest('#filter_bth_group').querySelectorAll('.active').forEach(el => {
            el.classList.remove(ACTIVE);
        });
        if (!IsRest) ths.classList.add(ACTIVE);
        else {
            document.getElementById('search_input').value = I_FILTER_TEXT = '';
            // 18-08-2023
            girdOpt.api.setFilterModel(null);
            AG_GRID["CURRENT_GRID_OPTION"].api.onFilterChanged();
        }
        // ? https://www.ag-grid.com/javascript-data-grid/filter-quick/
        girdOpt.api.setQuickFilter(IsRest ? '' : filterBy);
        girdOpt.api[girdOpt.api.getDisplayedRowCount() > 0 ? 'hideOverlay' : 'showNoRowsOverlay']();
    } catch (err) {
        console.warn(err.message);
    }
}

function resetHeaderOpt(ths, Opt, girdOpt) {
    try {
        girdOpt = AG_GRID["CURRENT_GRID_OPTION"];
        switch (ths.dataset.type) {
            case "column":
                // ?https://www.ag-grid.com/javascript-data-grid/column-state/#column-group-state
                girdOpt.columnApi.resetColumnGroupState();
                console.log('column state reset');
                break;
            case "fit_resize":
                // ? https://www.ag-grid.com/javascript-data-grid/column-sizing/
                AG_GRID["CURRENT_GRID_OPTION"].api.sizeColumnsToFit();
                break;
            case "auto_resize":
                const allColumnIds = [];
                girdOpt.columnApi.getAllColumns().forEach((column) => {
                    allColumnIds.push(column.getId());
                });
                AG_GRID["CURRENT_GRID_OPTION"].columnApi.autoSizeColumns(allColumnIds, Opt);
                break;
            case "OpenPanel":
                // ? https://www.ag-grid.com/javascript-data-grid/side-bar/#providing-parameters-to-tool-panels
                girdOpt.api.openToolPanel(ths.dataset.open);
                break;
            case "ClosePanel":
                girdOpt.api.closeToolPanel();
                console.log('column state reset');
                break;
            case "sideBarShowHide":
                // ? https://www.ag-grid.com/javascript-data-grid/side-bar/#sidebardef-configuration
                let bool = AG_GRID["CURRENT_GRID_OPTION"].api.isSideBarVisible();
                AG_GRID["CURRENT_GRID_OPTION"].api.setSideBarVisible(!bool);
                break;
            case "floatfilter":
            case "rowGroup":
                let IsFilterBtn = ths.dataset.type == 'floatfilter';
                let IsShow = IsFilterBtn ? girdOpt.defaultColDef.floatingFilter : girdOpt.rowGroupPanelShow == "always";
                if (IsFilterBtn) girdOpt.defaultColDef.floatingFilter = IsShow ? false : true, girdOpt.defaultColDef.filter = IsShow ? "agSetColumnFilter" : "agTextColumnFilter";
                else girdOpt.rowGroupPanelShow = IsShow ? "never" : "always";
                girdOpt.api.setColumnDefs(girdOpt.columnDefs);
                setTimeout(() => {
                    girdOpt.api.refreshHeader();
                }, 10);
                break;
            default:
                girdOpt.api.refreshHeader();
                break;
        }
    } catch (err) {
        console.warn(err.message);
    }
}

function onFirstDataRendered(params, CanShow) {
    // arbitrarily expand a row for presentational purposes
    if (params) MasterChartOptions = params;
    else if (Object.keys(MasterChartOptions).length > 0) params = MasterChartOptions;
    if (CanShow) {
        setTimeout(function() {
            params.api.getDisplayedRowAtIndex(0).setExpanded(true);
        }, 100);
        setTimeout(function() {
            // var createRangeChartParams = {
            //     cellRange: {
            //         rowStartIndex: 0,
            //         rowEndIndex: 10,
            //         columns: ['stage', 'client', "status"],
            //     },
            //     chartType: 'groupedColumn',
            //     aggFunc: 'count',
            // };
            // params.api.createRangeChart(createRangeChartParams);
            // ? https://www.ag-grid.com/javascript-data-grid/range-selection/#addcellrangerangeselection
            MasterChartOptions.api.selectAll();
            document.querySelector(`[col-id="master_client"]`).click();
            MasterChartOptions.api.chartService.createChartFromCurrentRange();

        }, 3000);
    }

}
// ? https://www.ag-grid.com/javascript-data-grid/filter-quick/


function onFilterTextBoxChanged() {
    gridOptions.api.setQuickFilter(
        document.getElementById('search_input').value
    );
}

function onPrintQuickFilterTexts() {
    gridOptions.api.forEachNode(function(rowNode, index) {
        console.log(
            'Row ' +
            index +
            ' quick filter text is ' +
            rowNode.quickFilterAggregateText
        );
    });
}
var c = console.log.bind(document);
// ! future development
// ? https://www.ag-grid.com/javascript-data-grid/component-tool-panel/
// ? https://www.ag-grid.com/javascript-data-grid/excel-export-multiple-sheets/#multiple-grids-to-multiple-sheets

function setFloatFilterVisible(girdOpt) {
    girdOpt = gridOptions;
    let IsTure = girdOpt.defaultColDef.floatingFilter;
    girdOpt.defaultColDef.floatingFilter = IsTure ? false : true, girdOpt.defaultColDef.filter = IsTure ? "agSetColumnFilter" : "agTextColumnFilter";
    girdOpt.api.setColumnDefs(gridOptions.columnDefs);
    setTimeout(() => {
        girdOpt.api.refreshHeader();
    }, 10);
}

function rowGroupPanelShowHide(girdOpt) {
    girdOpt = gridOptions;
    let IsShow = girdOpt.rowGroupPanelShow == "always";
    girdOpt.rowGroupPanelShow = IsShow ? "never" : "always";
    girdOpt.api.setColumnDefs(gridOptions.columnDefs);
    setTimeout(() => {
        girdOpt.api.refreshHeader();
    }, 10);
}
var COLLECTION = null;
var VALID_DATA = [];
commonfn['GET_NEW_RECORD'] = function(response) {
    try {
        console.log('GET_RECORD');
        console.log(Object.keys(response.data).length);
        COLLECTION = response.data;
        for (const [key, array] of Object.entries(COLLECTION)) {
            for (const [n, value] of Object.entries(array)) {
                if (value["__session"].length > 0 && value["__fileslist"].length > 0) {
                    console.log(value);
                    VALID_DATA.push(array);
                }
            }
        }
    } catch (err) {
        console.warn(err.message);
    }
};
var newData1 = [];
commonfn['VALIDATE_PACKAGE'] = function(response) {
    try {
        let [newJson] = [{}];
        console.log('GET_RECORD');
        console.log(Object.keys(response.data).length);
        COLLECTION = response.data;
        if (Object.keys(newJson).length == 0 && response.data.length > 0) {
            for (const [key, value] of Object.entries(response.data[0])) {
                if (!newJson[key]) newJson[key] = value;
            }
            newJson["client"] = "";
            newJson["identifier"] = "";
            /*if (newJson["m"].toLowerCase().indexOf("success") > -1)
                newJson["type"] = "Import success";
            else
                newJson["type"] = "Import failed";*/
            newJson["type"] = "Journals";
            newJson["role"] = "5bcf11635e7186178a22iii1";
            newJson["rolename"] = "Import";
            newJson["username"] = "IMPACT";
            newJson["activity"] = newJson["m"];
            newData1.push(newJson);
        }
    } catch (err) {
        console.warn(err.message);
    }
};

function OpenLink(DE_ACT, signouttime, client, currenturl, key, order, roles_orders, roles_signoff) {
    let page = webPage[client] ? webPage[client] : webPage['default'];
    if (currenturl && key) {
        window.open(`${currenturl + page}.html?key=${key}`);
    } else {
        Swal.fire('', 'Some primary key missing. Contact Support Team', 'info');
    }
}

function Downloadresults(filename) {
    var filepath = window.location.origin + "/content/" + filename;
    var link = document.createElement("a");
    link.download = filename;
    link.target = "_blank";
    link.href = filepath;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    link.parentElement.removeChild(link);
}