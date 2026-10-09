var MODULE_GRID_SQRY = {};
const SEARCH_QUERY_COLLECTION_KEYS = [
    "rCKFulltext",
    "rErrorLogs",
    "rFileslist",
    "rParaLockSync",
    "rPasteLogs",
    "rSandBox",
    "rServerMaintenance",
    "rShareandinvite",
    "rSurveyFeedback",
    "rUser",
    "rUserPreference",
    "rUseraccess",
    "rUsernotes",
    "radmin_config_activity",
    "rattachmentlist",
    "rbkzipdeliterations",
    "rcalendar",
    "rchatbotai",
    "rcommon",
    "rdocmodifieddata",
    "rdocviewhistory",
    "rdoiinfo",
    "remaildraft",
    "rfdelbackupiterations",
    "rfdeliterations",
    "rfiles",
    "rfilesaveerror",
    "rftpiterations",
    "rftprecords",
    "rgeneratetoken",
    "rhtmltoxmlerror",
    "rhtmltoxmlparsingerror",
    "rimpactapistatusrecord",
    "rlinksharing",
    "rmathreport",
    "rnull",
    "rpackvalid",
    "rpubkitapistatus",
    "rpubkitapistatusclose",
    "rpubkitfdeliterations",
    "rquery_snapshot",
    "rreferenceapi",
    "rsignoffstatus",
    "rsplchar",
    "rurlvalidres",
    "rusedSymbol",
    "rworkflow",
    "rwriteMailTeam",
    "rwsc_addWord",
    "rwsc_ignoreAllWord"
];

function getSearchQueryCollections() {
    return SEARCH_QUERY_COLLECTION_KEYS
        .map(key => key.startsWith("r") ? key.slice(1) : key)
        .filter(Boolean);
}

function addFilterRow() {
    const row = document.createElement('div');
    row.className = 'row mb-2';
    row.innerHTML = `
    <div class="col-md-5">
      <input type="text" class="form-control" name="filterKey[]" placeholder="Field (e.g. awards.award)">
    </div>
    <div class="col-md-6">
      <input type="text" class="form-control" name="filterValue[]" placeholder='Value, /regex/, exists'>
    </div>
    <div class="col-md-1">
      <button type="button" class="btn btn-danger w-100" onclick="this.closest('.row').remove()">X</button>
    </div>`;
    document.getElementById('filtersArea').appendChild(row);
    console.log("row added.");
}


function submitFilterForm() {
    const form = document.getElementById("filterForm");
    const formData = new FormData(form);

    const collection = formData.get("collection");
    const limit = parseInt(formData.get("limit"), 25);
    const sortField = formData.get("sortField");
    const sortOrder = parseInt(formData.get("sortOrder"));

    const filterKeys = formData.getAll("filterKey[]");
    const filterValues = formData.getAll("filterValue[]");

    const query = {};

    filterKeys.forEach((key, i) => {
        let val = filterValues[i];
        if (!key.trim()) return;

        // Handle existence checks
        if (val.startsWith("exists") || val.startsWith("$exists")) {
            const existsVal = val.split(":")[1];
            query[key] = {
                $exists: existsVal === "true"
            };
        }
        // Handle comparison operators
        else if (/^\$(gt|lt|gte|lte|eq|ne):/.test(val)) {
            const [operator, operand] = val.split(":");
            let value = operand;

            // Convert to number or date if the key name suggests so
            if (key.toLowerCase().includes("time") || key.toLowerCase().includes("date")) {
                value = value ? parseInt(value) : new Date().getTime();
            } else if (!isNaN(operand)) {
                value = Number(operand);
            }

            query[key] = {
                [operator]: value
            };
        } else if (/^\/.*\/$/.test(val)) {
            query[key] = new RegExp(val.slice(1, -1), "i");
        } else if (/^(>=|<=|>|<)(\d+)$/.test(val)) {
            // convert >1980 into $gt: 1980
            const [, op, num] = val.match(/(>=|<=|>|<)(\d+)/);
            const mongoOp = {
                ">": "$gt",
                "<": "$lt",
                ">=": "$gte",
                "<=": "$lte"
            }[op];
            query[key] = { [mongoOp]: parseFloat(num) };
        } else {
            query[key] = val;
        }
    });

    const finalQuery = {
        tbl: collection,
        find: query,
        sort: { [sortField]: sortOrder },
        length: limit
    };

    console.log("Mongo Query:", JSON.stringify(finalQuery));
    var END_POINT = API_GET_DOCS;
    AG_GRID.HIT_API_RETURN(finalQuery, END_POINT, "SEARCH_QUERY");
    // TODO: Send finalQuery to server or handle as needed
}

document.addEventListener('DOMContentLoaded', function (event) {
    MODULE_GRID_SQRY = {
        GRID_OPTION: {
            "DEFAULT_columnDefs": {},
            "DEFAULT_FILED": {},
            "DEFAULT_ORDER": {
                "SEARCH_QUERY": {
                    columnDefs_order: ["username__get"],
                    columnDefs_order_remove: [],
                    GRID_ADD_OPTIONS: {
                        paginationPageSize: 100,
                        paginationAutoPageSize: false,
                        suppressPaginationPanel: false,
                        suppressScrollOnNewData: true
                    }
                }
            },
            "SEARCH_QUERY": {
                columnDefs: []
            }
        },
        TIME_FORMAT: {
            SEARCH_QUERY: "DD-MMM-YYYY, h:mm:ss a"
        },
        SUB_HEAD: {
            SEARCH_QUERY: " Get Data from Database"
        },
        GET_ACTION_JSON: function (data, Options, self, current) {
            self = this;
            current = MODULE_GRID_SQRY;
            try {
                let updatedemail;
                let email_arr = [];
                if (data.username.includes(',')) {
                    email_arr = data.username.split(',');
                    email_arr[email_arr.indexOf(Options.oldemail)] = Options.newemail;
                    updatedemail = email_arr.join(',');
                } else {
                    updatedemail = Options.newemail;
                    email_arr = [Options.newemail];
                }
                return {
                    "tbl": "",
                    "find": {
                        "identifier": data['identifier'],
                        "docid": data['docid'],
                        "_id": data['id'],
                        "status": "active"
                    },
                    "length": 50,
                    "update": {
                        "emailtolist": updatedemail,
                        "username": updatedemail,
                        "emailto": email_arr,
                        "oldemail": Options.oldemail
                    },
                    "updateMany": "1",
                    "_r": [
                        "5af956974b4bb40a34648f8e"
                    ],
                    "_w": [
                        "5af956974b4bb40a34648f8e"
                    ]
                };
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('GET_ACTION_JSON', err.message);
            }
        },
        ADD_ACTION_JSON: function (data, Options, self, current) {
            self = this;
            current = MODULE_GRID_SQRY;
            try {
                let updatedemail;
                let email_arr = [];
                if (data.username.includes(',')) {
                    email_arr = data.username.split(',');
                    email_arr.push(Options.newemail);
                    updatedemail = email_arr.join(',');
                } else {
                    //updatedemail = Options.newemail;
                    //email_arr = [Options.newemail];
                    email_arr = data.emailto;
                    email_arr.push(Options.newemail);
                    updatedemail = email_arr.join(',');
                }
                return {
                    "tbl": "",
                    "find": {
                        "identifier": data['identifier'],
                        "docid": data['docid'],
                        "_id": data['id'],
                        "status": "active"
                    },
                    "length": 50,
                    "update": {
                        "emailtolist": updatedemail,
                        "username": updatedemail,
                        "emailto": email_arr,
                    },
                    "updateMany": "1",
                    "_r": [
                        "5af956974b4bb40a34648f8e"
                    ],
                    "_w": [
                        "5af956974b4bb40a34648f8e"
                    ]
                };
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('ADD_ACTION_JSON', err.message);
            }
        },
        DE_ACT_RES: function (response, Options = {}, self, current) {
            self = this;
            current = MODULE_GRID_SQRY;
            try {
                console.log(JSON.stringify(response));
                document.getElementById('fetch_db_btn_1').click();
                // var COLSE_TIMER = setTimeout(() => {
                //     AG_GRID.ShowLoadingIcon("hideOverlay");
                //     clearInterval(COLSE_TIMER);
                // }, 3500);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('DE_ACT_RES', err.message);
            }
        },
        SINGLE_API_HIT: function (data, Options = {}, self, reportModel, current) {
            self = this;
            reportModel = 'SEARCH_QUERY';
            current = MODULE_GRID_SQRY;
            try {
                AG_GRID.ShowLoadingIcon("ShowLoading");
                // ? https://docs.google.com/document/d/1Berwzk0ikBxPLjKVZ08IxWpTGxj-v65SnO19_dDCHqo/edit
                let JSON_DATA = Options.modifiyType == "Replace" ? MODULE_GRID_SQRY.GET_ACTION_JSON(data, Options) : MODULE_GRID_SQRY.ADD_ACTION_JSON(data, Options);
                //let JSON_DATA = MODULE_GRID_SQRY.GET_ACTION_JSON(data,Options),
                let END_API = API_PATH + "findupdateorinsert",
                    SEND_JSON = JSON.parse(JSON.stringify(JSON_DATA));
                SEND_JSON['tbl'] = "Shareandinvite";
                // SEND_JSON = 'Shareandinvite,Fileslist'.split(",").map(tbl => {
                //     let clonedObject = JSON.parse(JSON.stringify(JSON_DATA));
                //     clonedObject['tbl'] = tbl;
                //     return clonedObject;
                // });
                if (SEND_JSON.length > 0)
                    commonfn['callajax'](SEND_JSON, 'DE_ACT_RES', END_API, current);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('CONCURRENT_API_HIT', err.message);
            }
        },
        CONCURRENT_API_HIT: async function (params, Options = {}, self, reportModel, current) {
            self = this;
            reportModel = 'SEARCH_QUERY';
            current = MODULE_GRID_SQRY;
            try {
                let JSON_DATA = MODULE_GRID_SQRY.GET_ACTION_JSON(params, Options);
                AG_GRID.ShowLoadingIcon("ShowLoading");
                'Shareandinvite,Fileslist'.split(",").forEach((tbl, idx, arr) => {
                    let clonedObject = JSON.parse(JSON.stringify(JSON_DATA));
                    clonedObject['tbl'] = tbl;
                    commonfn['callajax'](clonedObject, 'DE_ACT_RES', API_FIND_UPDATE_INSERT, current);
                });
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('CONCURRENT_API_HIT', err.message);
            }
        },
        VALIDATE_EMAIL_ID: function (email, Options = {}, self, reportModel, current) {
            self = this;
            reportModel = 'SEARCH_QUERY';
            current = MODULE_GRID_SQRY;
            try {
                const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

                if (emailPattern.test(email)) {
                    return true;
                } else return false;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('VALIDATE_EMAIL_ID', err.message);
            }
        },
        SEARCH_QUERY_CELL_DOUBLE_CLICK: async function (params, self, reportModel, current) { },
        SEARCH_QUERY_FETCH_QUERY: function (e = {}, jsondata = {}, reportModel, self) {
            self = this;
            reportModel = 'SEARCH_QUERY';
            try {
                if (/button/gi.test(e.target.tagName)) { } else {
                    return debug.log("click btn");
                }
                return jsondata;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('FETCH_QUERY_JSON', err.message);
            }
        },
        InitLoop: function (self) {
            self = MODULE_GRID_SQRY;
            try {
                for (const [main_key, main_value] of Object.entries(self)) {
                    if (typeof main_value == "object") {
                        for (const [sub_key, sub_value] of Object.entries(main_value)) {
                            if (/string|function/gi.test(typeof sub_value)) {
                                if (AG_GRID[main_key]) {
                                    console.log(sub_key);
                                    AG_GRID[main_key][sub_key] = sub_value;
                                }
                            } else if (typeof sub_value == "object" && Object.values(sub_value).length != 0) {
                                for (const [sub_sub_key, sub_sub_value] of Object.entries(sub_value)) {
                                    if ("columnDefs" == sub_sub_key) {
                                        console.log(sub_sub_key);
                                        AG_GRID[main_key][sub_key] = sub_value;
                                    } else {
                                        if (AG_GRID[main_key][sub_key]) {
                                            console.log(sub_sub_key);
                                            AG_GRID[main_key][sub_key][sub_sub_key] = sub_sub_value;
                                        }
                                    }
                                }
                            }
                        }
                    } else if (/string|function/gi.test(typeof main_value)) {
                        if (main_key != "InitLoop") {
                            AG_GRID[main_key] = main_value;
                        }
                    }
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('module_grid_InitLoop', err.message);
            }
        },
        loadTemplate: function () {
            try {
                const collectionOptions = getSearchQueryCollections()
                    .map(name => `<option value="${name}">${name}</option>`)
                    .join('');

                var template = `<form id="filterForm">
                                    <div class="row mb-3">
                                        <div class="col-md-3">
                                        <label>Collection</label>
                                        <select class="form-control" name="collection">
                                            ${collectionOptions}
                                        </select>
                                        </div>
                                        <div class="col-md-3">
                                        <label>Limit</label>
                                        <select class="form-control" name="limit">
                                            <option>25</option><option>50</option><option>75</option>
                                            <option>100</option><option>150</option><option>200</option>
                                        </select>
                                        </div>
                                        <div class="col-md-3">
                                        <label>Sort Field</label>
                                        <input type="text" class="form-control" name="sortField" value="time_c">
                                        </div>
                                        <div class="col-md-3">
                                        <label>Sort Order</label>
                                        <select class="form-control" name="sortOrder">
                                            <option value="-1">Descending</option>
                                            <option value="1">Ascending</option>
                                        </select>
                                        </div>
                                    </div>
                                    <!-- Dynamic filter rows -->
                                    <div id="filtersArea"></div>
                                    <button type="button" class="btn btn-secondary mb-2" onclick="addFilterRow()">Add Filter</button>
                                    <button type="button" class="btn btn-primary" onclick="submitFilterForm()">Search</button>
                                    </form>`;
                if (!document.querySelector('#filterForm')) {
                    var frag = document.createRange().createContextualFragment(template);
                    document.querySelector("#filter_bth_group").after(frag);
                }
            } catch (error) { }
        },
        MAKE_GRID_API: function (response) {
            try {
                const headerNameCollection = {
                    "rolename": "Role",
                    "time_c": "Time",
                    "recordtype": "Record Type"
                };

                const defaultKeys = ["rolename", "recordtype"];
                const requiredKeys = ["org_input", "mathtype", "opentime", "wirisresponseopen", "wirisresponseclose", "closetime"];
                const additionalKeys = [
                    "identifier", "_id", "roleid", "username", "client", "session_id", "dtd", "type",
                    "division", "projecttitle", "_w", "_r", "shorttitle", "time_c",
                ];
                const hideKeys = ["mathid"];

                // Step 1: Collect unique keys from response if needed
                const dynamicKeys = [];
                if (Array.isArray(response)) {
                    response.forEach(item => {
                        Object.keys(item).forEach(key => {
                            if (!dynamicKeys.includes(key)) {
                                dynamicKeys.push(key);
                            }
                        });
                    });
                }

                // Step 2: Combine & filter keys
                const combinedKeys = [...new Set([
                    ...defaultKeys,
                    ...requiredKeys,
                    // ...dynamicKeys,
                    // ...additionalKeys
                ])].filter(key => !hideKeys.includes(key));

                // Optional: update default column order
                AG_GRID.GRID_OPTION.DEFAULT_ORDER['SEARCH_QUERY'] = {
                    columnDefs_order: combinedKeys,
                    columnDefs_order_remove: [],
                    GRID_ADD_OPTIONS: {
                        paginationPageSize: 100,
                        paginationAutoPageSize: false,
                        suppressPaginationPanel: false,
                        suppressScrollOnNewData: true
                    }
                };

                // Step 3: Build column definitions
                const columnDefs = combinedKeys.map(key => {
                    const isTimeField = key.includes("time");
                    const isWirisResponseField = key.includes("wirisresponse");

                    const colDef = {
                        field: key,
                        headerName: headerNameCollection[key] || key,
                        hide: hideKeys.includes(key)
                    };

                    if (isTimeField) {
                        colDef.valueGetter = AG_GRID.GET_TIME_C;
                        colDef.sort = "asc";
                    } else if (isWirisResponseField) {
                        colDef.valueGetter = params => {
                            const val = params.data?.[key];
                            return typeof val === "object" ? JSON.stringify(val) : val;
                        };
                    }

                    return colDef;
                });



                // Step 4: Assign to grid config
                Object.assign(AG_GRID.GRID_OPTION['SEARCH_QUERY'], {
                    columnDefs: columnDefs,
                    rowData: response
                });

            } catch (error) {
                console.error("Error in MAKE_GRID_API:", error);
            }
        }


    };
    (function () {
        MODULE_GRID_SQRY.InitLoop();
    })();

});
