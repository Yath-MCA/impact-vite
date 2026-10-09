var USER_MAIL = localStorage.getItem('xmleditor:login_username'),
    WF_ROLE = localStorage.getItem('xmleditor:login_workflow_role'),
    WF_CLIENT_LIST = localStorage.getItem('xmleditor:login_client_list');
const superAdmin = WF_ROLE == "superadmin";
if (WF_CLIENT_LIST) WF_CLIENT_LIST = WF_CLIENT_LIST.split(",");
var label1 = "",
    start1, end1,
    ServerDateTime = "",
    IS_BOOKS_USER = /TNF|OSO|OXMEDO|OHO/gi.test(WF_CLIENT_LIST),
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
    },
    search_box = null,
    search_box_2 = null,
    is_doi_search = null,
    is_menu_search = null,
    is_date_search = null,
    IS_PROD_USER = WF_ROLE == "production",
    gridOptions = {},
    MasterChartOptions = {},
    ACTIVE = "active",
    IsFloatFilterVisible = true,
    LIVE_DEBUG = false,
    GET_ROLES = function(Obj, Option = {}) {
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
    },
    getKey = function(z, Option = {
        getColId: false
    }) {
        return z.field && !Option.getColId ? z.field : z.colId;
    };
// Function to create a performance observer
function setupPerformanceObserver() {
    try {
        const po = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'resource') {
                    // Logs server timing data for resource entries (including AJAX)
                    console.log('Resource Timing', entry);
                }
            }
        });

        // Start observing for resource timing entries
        po.observe({
            type: 'resource',
            buffered: true
        });
    } catch (e) {
        // Do nothing if the browser doesn't support this API
        console.error('PerformanceObserver is not supported:', e);
    }
}
// Call setupPerformanceObserver to start monitoring
setupPerformanceObserver();


document.addEventListener('DOMContentLoaded', function(event) {
    try {
        var GridDiv = document.getElementById("data_div");
        if (GridDiv) {
            GridDiv.classList[IS_ADMIN ? "add" : "remove"]("admin");
        }
        let user = document.getElementById('dash_username');
        if (user) {
            user.textContent = getuserinfo(USER_MAIL);
            // ROLE_IDS[USER_ROLE]['name'];
            user.title = USER_MAIL;
            $('[data-toggle="tooltip"]').tooltip();
            user.ondblclick = function() {
                document.querySelectorAll("[data-report],[data-admin],[name='customRadioInline']").forEach(element => {
                    if (element.hasAttribute("data-admin") && IS_ADMIN) {
                        element.classList.toggle("d-none");
                    }
                });
                GridDiv.classList.toggle("admin");
            };
        }
        search_box = document.getElementById('search_input');
        search_box_2 = document.getElementById('search_input_2');
        [search_box, search_box_2].forEach((input, idx, arr) => {
            if (input) {
                if (idx == 0) {
                    input.addEventListener('changed', externalFilterChanged);
                    input.addEventListener('paste', externalFilterChanged);
                    input.addEventListener('input', externalFilterChanged);
                } else if (idx == 1) {
                    input.onkeydown = function(e) {
                        if (!e.repeat && e.key == "Enter") {
                            AG_GRID.SWIFT_REPORT("HISTORY_DATA");
                        }
                    };
                }
            }
        });
        var FIRE_INITIAL_REPORT = function() {
            try {
                AG_GRID.FIRE_ONCE("DASH_BOARD", []);
                // if (IS_PROD_USER) {
                //     AG_GRID.SWIFT_REPORT("DASH_BOARD", {
                //         Init: true
                //     });
                // } else AG_GRID.fire("DASH_BOARD", []);
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
        document.querySelectorAll("[data-report],[data-admin],[name='customRadioInline']").forEach(element => {
            try {
                if (/BUTTON/gi.test(element.tagName) && element.hasAttribute("data-report")) {
                    element.onclick = AG_GRID.SWIFT_REPORT;
                } else if (element.tagName == "INPUT" && element.type == "radio") {
                    // ? https://github.com/vitalets/bootstrap-datepicker
                    // ? https://github.com/uxsolutions/bootstrap-datepicker
                    // ? https://uxsolutions.github.io/bootstrap-datepicker/?markup=input&format=&weekStart=&startDate=&endDate=&startView=0&minViewMode=0&maxViewMode=4&todayBtn=false&clearBtn=false&language=en&orientation=auto&multidate=&multidateSeparator=&keyboardNavigation=on&forceParse=on#sandbox
                    element.onclick = function(e) {
                        try {
                            let isDate = e.target.id.match(/date_search/);
                            search_box_2.classList[isDate ? "add" : "remove"]("d-none");
                            document.getElementById("date_search_div").classList[isDate ? "remove" : "add"]("d-none");
                            INITIATE_DATE_PICKER();
                        } catch (err) {
                            console.warn(err.message);
                        }
                    };
                }
                if (element.hasAttribute("data-admin") && IS_ADMIN) {
                    element.classList.remove("d-none");
                }
            } catch (err) {
                console.warn(err.message);
            }
        });
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
commonfn['GET_CELL_DATA'] = function(response, params) {
    try {
        var allRows = response.data;
        let entry = NEW_COLLECTION[params.data.docid];
        if (!entry || (entry && Object.keys(entry).length == 0)) {
            allRows = SET_TREE_HIERARCHY(allRows, "FileList", params);
            let current_row = AG_GRID.CURRENT_GRID_COLLECTION.filter(function(el) {
                return Object.keys(el).length >= ALLOWED_KEY.length;
            }).concat(allRows);
            NEW_COLLECTION[params.data.docid] = current_row;
            AG_GRID.CURRENT_GRID_OPTION.api.setRowData(current_row);
            setTimeout((params) => {
                let trigger = document.querySelector(`[row-index='${params.rowIndex}'] [ref='eExpanded']`);
                if (trigger) trigger.click();
            }, 550, params);
        }
    } catch (err) {
        console.warn(err.message);
    }
};
var NEW_COLLECTION = {},
    DOI_RECORD = "",
    DATE_BEFORE_MANIPULATION = 1679875203000,
    LINKS_DETAILS_ROLE = {},
    ALLOWED_KEY = ["_id", "client", "identifier", "docid", "type", "emailto", "role", "rolename", "time_c", "status", "remark"],
    SET_TREE_HIERARCHY = function(data, Type, secondaryKey, params, Options = {}) {
        try {
            var OBJ = AG_GRID.GRID_OPTION.DEFAULT_ORDER[AG_GRID.CURRENT_TYPE];
            var DEFAULT_KEYS = OBJ.columnDefs_order;
            var ACTIVE_OBJ = {
                get_type: function(record, _ = ACTIVE_OBJ) {
                    try {
                        return record["recordtype"] || record["type"] || "";
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('get_type', err.message);
                    }
                },
                get_message_either_error: function(Obj, _ = ACTIVE_OBJ) {
                    try {
                        return Obj["error"] || Obj["message"] || "";
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('get_message_either_error', err.message);
                    }
                },
                "__autosavedlist": function(record, _ = ACTIVE_OBJ) {
                    try {
                        let type = _.get_type(record);
                        let JSON_OBJ = {
                            "documentversion": "Restore Version",
                            "openhtml": "Opened Original File",
                            "removeattributeissue": "Attribute Missing",
                            "autosave": "Auto Save",
                            "save": "Save",
                            "unknown": "Unknown Record"
                        };
                        return JSON_OBJ[type] ? JSON_OBJ[type] : JSON_OBJ["unknown"];
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('__autosavedlist', err.message);
                    }
                },
                "__notes": function(record, _ = ACTIVE_OBJ) {
                    try {
                        let type = _.get_type(record);
                        return "Files Attached - " + (type.length > 0 ? type : "");
                    } catch (err) {
                        console.warn(err.message);
                        //ErrorLogTrace('__notes', err.message);
                    }
                },
                "__pubkitclose": function(record, _ = ACTIVE_OBJ) {
                    try {
                        let result = _.get_message_either_error(record.pubkitresclose ? JSON.parse(record.pubkitresclose) : record);
                        return "Pubkit - " + result;
                    } catch (err) {
                        console.warn(err.message);
                        //ErrorLogTrace('__pubkitclose', err.message);
                    }
                },
                "__pubkitstatus": function(record, _ = ACTIVE_OBJ) {
                    try {
                        let result = _.get_message_either_error(record.pubkitres ? JSON.parse(record.pubkitres) : record);
                        return "Pubkit - " + result;
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('__pubkitstatus', err.message);
                    }
                },
                "__sessionlist": function(record, _ = ACTIVE_OBJ) {
                    try {
                        return "Session " + (record.end_session_key ? " Closed" : " Opened");
                    } catch (err) {
                        console.warn(err.message);
                    }
                },
                "__sharedlist": "Link Shared",
                "__viewhistory": "Landing Page Opened",
                "__signoffstatus": function(record, _ = ACTIVE_OBJ) {
                    try {
                        if (!!record.message)
                            return "Finalized - " + record.message;
                        else
                            return "Finalized";
                    } catch (err) {
                        console.warn(err.message);
                    }
                },
                get_info_time_compare: function(record, parentObj, key) {
                    try {
                        if (!record.identifier) record.identifier = parentObj.identifier;
                        let doi = parentObj.identifier;
                        const asArray = Object.entries(LINKS_DETAILS_ROLE[doi]);
                        var result = asArray.filter(function(json) {
                            let time = typeof record.time_c == "number" ? record.time_c : parseInt(record.time_c.$numberLong);
                            let diff_time = moment(time).diff(json[1].end, 'seconds');
                            let less_than_seconds = false;
                            if ("__pubkitclose" == key && diff_time >= 0 && diff_time <= 10) {
                                console.log(diff_time);
                                less_than_seconds = true;
                            }
                            return json[1].start <= time && (time <= json[1].end || json[1].end == 0 || less_than_seconds);
                        });
                        return result[0] ? result[0][1] : {};
                    } catch (err) {
                        console.warn(err.message);
                    }
                }
            };
            // Array of objects with potential duplicate _id values   
            var tempData = [];

            data.sort(function(a, b) {
                try {
                    return a.time_c.$numberLong - b.time_c.$numberLong;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('data.sort', err.message);
                }
            }).forEach((record, indx, arr) => {
                try {
                    if (!LINKS_DETAILS_ROLE[record.identifier]) {
                        LINKS_DETAILS_ROLE[record.identifier] = {};
                    }
                    let IS_AUTHOR_ROLE = record.role == ROLE_IDS["AU"];
                    let [start, idx] = [(new Date().getTime()), 0];
                    if (!IS_AUTHOR_ROLE && record["__viewhistory"] && record["__viewhistory"].length > 0) {
                        record["__viewhistory"].sort(function(a, b) {
                            return a.time_c.$numberLong - b.time_c.$numberLong;
                        });
                        let author_closeTime = LINKS_DETAILS_ROLE[record.identifier][ROLE_IDS["AU"]];
                        if (author_closeTime && author_closeTime.end) {
                            author_closeTime = author_closeTime.end;
                        } else {
                            LINKS_DETAILS_ROLE[record.identifier][ROLE_IDS["AU"]] = {
                                start: parseInt(record.time_c.$numberLong) - 5,
                                end: parseInt(record.time_c.$numberLong) - 1
                            };
                            author_closeTime = LINKS_DETAILS_ROLE[record.identifier][ROLE_IDS["AU"]]["end"];
                        }
                        let temp_Time = parseInt(record["__viewhistory"][idx].time_c.$numberLong);
                        while (temp_Time < author_closeTime) {
                            idx++;
                            temp_Time = parseInt(record["__viewhistory"][idx].time_c.$numberLong);
                        }
                        start = (temp_Time - 1);
                    } else start = parseInt(record.time_c.$numberLong);
                    LINKS_DETAILS_ROLE[record.identifier][record.role] = {
                        "start": start,
                        "end": record.signouttime && record.signouttime.$numberLong ? parseInt(record.signouttime.$numberLong) : 0
                    };
                } catch (err) {
                    console.warn(err.message);
                }
            });
            data.forEach((record, indx, arr) => {
                try {
                    for (const history_key in record) {
                        let history = record[history_key];
                        if (!record.username) {
                            record.username = get_user_info(record, "111");
                        }
                        if (history_key.indexOf("__") > -1) {
                            if ((indx != 0 && arr[arr.length - 1][history_key].length == record[history_key].length) || ["__viewhistory"].includes(history_key)) {
                                continue;
                            }
                            history.forEach((json, index, array) => {
                                let [SessionOut, newJson] = [false, {}];
                                if ("__sessionlist" == history_key) {
                                    json["_id"] = json["_id"]["$oid"];
                                    json["time_c"] = parseInt(json["session_start_time"]);
                                    if (record.role == json["role"] && !json["username"]) {
                                        json["username"] = get_user_info(record, "222");
                                    }
                                    if (record.time_c > json.time_c) {
                                        return;
                                    }
                                    // ? 04_APR_2023 - SESSION OUT HANDLING
                                    let end = parseInt(json["session_end_time"]);
                                    if (end > 0) {
                                        newJson = Object.assign({}, json);
                                        newJson.end_session_key = true;
                                        newJson["time_c"] = parseInt(json["session_end_time"]);
                                        newJson["_id"] = json["_id"] + "_111";
                                        SessionOut = true;
                                    }
                                } else if ("__viewhistory" == history_key) {
                                    json["username"] = json["user"] ? json["user"].toString() : "";
                                    json["role"] = json["userrole"];
                                }
                                if (!["__sharedlist", "__viewhistory"].includes(history_key)) {
                                    if ("__pubkitclose" == history_key) {
                                        console.log(history_key);
                                    }
                                    let findDiff = ACTIVE_OBJ.get_info_time_compare(json, record, history_key);
                                    if (Object.keys(findDiff).length > 0)
                                        Object.assign(json, findDiff);
                                }
                                let canManipulate = DATE_BEFORE_MANIPULATION > parseInt(record.time_c.$numberLong);
                                DEFAULT_KEYS.forEach((keys, inx, ar) => {
                                    if (!!json["fileid"])
                                        DOI_RECORD = json["fileid"];
                                    if (!json[keys]) {
                                        if (record[keys]) {
                                            if (!["username", "time_c", "role"].includes(keys)) {
                                                json[keys] = record[keys];
                                            } else if (canManipulate) {
                                                if (["role"].includes(keys)) {
                                                    if ("__autosavedlist" == history_key) {
                                                        let role = json.roleid ? json.roleid.replace(/_[A-z]+/, "") : "";
                                                        json[keys] = role ? ROLE_IDS[role] ? ROLE_IDS[role].name : "" : "";
                                                    }
                                                } else if (["username"].includes(keys)) {
                                                    if ("__viewhistory" == history_key) {
                                                        json[keys] = json["user"] ? json["user"].toString() : "";
                                                    } else if (!json["username"]) {
                                                        json["username"] = get_user_info(record, "333");
                                                    }
                                                } else {
                                                    json[keys] = "";
                                                    console.warn(keys + "==> keys missing");
                                                }
                                            } else json[keys] = "";
                                        } else if (keys == "username") {
                                            json[keys] = get_user_info(record, record.roleabstracttaskid);
                                        } else if (keys == "activity") {
                                            let IsFun = typeof ACTIVE_OBJ[history_key] == "function";
                                            json["activity"] = IsFun ? ACTIVE_OBJ[history_key](json) : ACTIVE_OBJ[history_key];
                                            if (SessionOut && Object.keys(newJson).length > 0) {
                                                newJson["activity"] = IsFun ? ACTIVE_OBJ[history_key](newJson) : ACTIVE_OBJ[history_key];
                                            }
                                            try {
                                                if (json["username"].length == 0) {
                                                    if (json["activity"] != "Link Shared")
                                                        json["username"] = get_user_info(record, record.roleabstracttaskid);
                                                    else {
                                                        return;
                                                    }
                                                }
                                                if (json["role"].length == 0) {
                                                    json["role"] = record.role;
                                                }
                                                if (json["activity"].indexOf("Finalized") > -1 && !json["currenturl"]) {
                                                    json["currenturl"] = record["currenturl"];
                                                }
                                                if (json["activity"].indexOf("Finalized") > -1 && !json["key"]) {
                                                    json["key"] = record["key"];
                                                    data.forEach((record1, indx1, arr1) => {
                                                        if (record1["rolename"].toLowerCase() == "author") {
                                                            if (!json["aukey"]) {
                                                                json["aukey"] = record1["key"];
                                                            }
                                                        } else if (record1["rolename"].toLowerCase() == "collator") {
                                                            if (!json["cokey"]) {
                                                                json["cokey"] = record1["key"];
                                                            }
                                                        } else if (record1["rolename"].toLowerCase() == "editor") {
                                                            if (!json["edkey"]) {
                                                                json["edkey"] = record1["key"];
                                                            }
                                                        }
                                                    });
                                                }
                                                if (json["activity"].indexOf("Finalized") > -1 && !json["projectname"]) {
                                                    json["projectname"] = record["titleinfo"].projectname;
                                                }
                                            } catch (e) {

                                            }
                                        } else {
                                            console.warn(keys + "<==keys missing");
                                        }
                                    }
                                });
                                if (Type == "LINK_CREATED" && json["activity"].toLowerCase().indexOf("link shared") == -1) {

                                } else {
                                    if (json["username"].length == 0 && json["activity"] == "Link Shared") {

                                    } else {
                                        tempData.push(json);
                                        if (SessionOut && Object.keys(newJson).length > 0) {
                                            for (const [key, value] of Object.entries(json)) {
                                                if (!newJson[key]) newJson[key] = value;
                                            }
                                            tempData.push(newJson);
                                        }
                                    }
                                }
                            });
                        }
                    }
                    record["activity"] = "PubKit - Link Shared";
                    tempData.push(record);
                } catch (err) {
                    console.warn(err.message);
                }
            });
            // console.log(tempData.length);
            const uniqueDataMap = new Map(tempData.map(item => [item["_id"], item]));
            // Convert the Map values back into an array, effectively removing duplicates
            const uniqueDataArray = [...uniqueDataMap.values()];
            // uniqueDataArray now holds the filtered objects with unique _id values
            console.log("before==>" + uniqueDataArray.length);
            const isBothNotEmpty = newData1.length > 0 && uniqueDataArray.length > 0;
            if (isBothNotEmpty && Type != "LINK_CREATED") {
                ["docid", "client", "identifier"].forEach(key => {
                    if (uniqueDataArray[0][key])
                        newData1[0][key] = uniqueDataArray[0][key];
                });
                uniqueDataArray.unshift(newData1[0]);
                newData1 = [];
            }
            console.log(uniqueDataArray.length);
            return uniqueDataArray;
        } catch (err) {
            console.warn(err.message);
        }
    };
var AG_GRID = {
    GRID_OPTION: {
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
                headerName: 'DOI',
                resizable: true,
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
                        console.log([params.data, params.data.status]);
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
            paginationAutoPageSize: true,
            paginationPageSize: 15,
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
                /* beautify preserve:start */

                /* beautify preserve:end */
                if (this.numberOfRows == 0)
                    params.api.showNoRowsOverlay();
                else
                    params.api.hideOverlay();
            },
            onCellDoubleClicked: params => {
                // ! TO ASK BISWAJIT - WHY COMMEND
                let [DE_ACT, COL_ID] = [params.data.status == 'deactive', params.event.target.getAttribute('col-id')];
                let callback = AG_GRID.CURRENT_TYPE.concat("_", "CELL_DOUBLE_CLICK");
                console.log(params.data);
                if (AG_GRID && typeof AG_GRID[callback] == "function") {
                    AG_GRID[callback](params);
                    return;
                }
                if (params.event.target.getAttribute('col-id') != "identifier") return;
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
                                let page = webPage[params.data.client] ? webPage[params.data.client] : webPage['default'];
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
                                if (params.data.currenturl && params.data.key) {}
                            } else if (result.isDenied) {}
                        });
                    } else if (params.data.status == ACTIVE) {
                        let page = webPage[params.data.client] ? webPage[params.data.client] : webPage['default'];
                        if (params.data.currenturl && params.data.key) {
                            window.open(`${params.data.currenturl + page}.html?key=${params.data.key}`);
                        } else {
                            Swal.fire('', 'Some primary key missing. Contact Support Team', 'info');
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
                columnDefs_order: ["client", "journal", "identifier__tooltip", "docid", "proof_to_auth", "proof_close_auth", "proof_close_coll", "stage_internal", "status", "comparestatus"],
                columnDefs_order_remove: []
            },
            "ACTIVE_SESSION": {
                columnDefs_order: ["client__get", "identifier__get", "docid", "session_start_time", "last_saved_time", "duration", "username__get"],
                columnDefs_order_remove: []
            },
            "XML_FAIL": {
                columnDefs_order: ["client__get", "identifier__get", "docid", "username__get", "xmlmissing"],
                columnDefs_order_remove: []
            },
            "SIGN_OFF_REPORT": {
                columnDefs_order: ["client", "identifier", "docid", "role", "emailtolist", "signouttime"],
                columnDefs_order_remove: []
            },
            "LINK_CREATED": {
                columnDefs_order: ["client", "type", "identifier", "username", "role", "time_c", "activity", "coldownload"],
                columnDefs_order_remove: [],
                GRID_ADD_OPTIONS: {
                    paginationPageSize: 100,
                    paginationAutoPageSize: false,
                    suppressPaginationPanel: false,
                    suppressScrollOnNewData: true
                }
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
            columnDefs: [{
                    colId: "proof_to_auth",
                    headerName: 'Proof Sent',
                    filter: 'agDateColumnFilter',
                    filterParams: filterParams,
                    comparator: dateComparator,
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
                                if (row.nextrole && !IsActive) {
                                    stage = ROLE_IDS[row.nextrole.role]['Stage'];
                                } else if (row.roles_orders) {
                                    if (!IsActive) {
                                        stage = `Package ${params.data.ftpfail ? 'not' : ""} sent`;
                                    } else if (HaveActiveOtherRole) {
                                        stage = ROLE_IDS[HaveActiveOtherRole.role]['Stage'];
                                        if (HaveActiveOtherRole.rolename == "Editor 2") {
                                            stage = "ED2 Review";
                                        }
                                    }
                                }
                            } else {
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
                },
                {
                    field: "comparestatus",
                    // colId: "comparestatus",
                    headerName: 'Compare Status',
                    chartDataType: 'category',
                    cellClass: params => {
                        if (!params.data) return null;
                        // ? Error | Note | Success | Warning
                        return params.data.comparestatus ? "compare".concat("-", params.data.comparestatus.toLowerCase()) : '';
                    }
                }
            ],
            rowClassRules: {
                'compare-pass': params => params.api.getValue('comparestatus', params.node) == "Success",
                'compare-fail': params => params.api.getValue('comparestatus', params.node) == "Error",
                'compare-warn': params => params.api.getValue('comparestatus', params.node) == "Warning",
                'compare-noti': params => params.api.getValue('comparestatus', params.node) == "Notification",
                'pubkit-fail': params => params && params.data && params.data.pubkitres ? true : false
                // 'active': params => params.api.getValue('status', params.node) == "ACTIVE",
            },
        },
        "ACTIVE_SESSION": {
            columnDefs: [{
                    headerName: "Start Time",
                    field: "session_start_time",
                    filter: 'agDateColumnFilter',
                    filterParams: filterParams,
                    comparator: dateComparator,
                    valueGetter: (params) => {
                        if (!params.data) return "";
                        return AG_GRID.GET_DATE_TIME(params);
                    }
                },
                {
                    headerName: "Last Access",
                    initialSort: 'desc',
                    field: "last_saved_time",
                    filter: 'agDateColumnFilter',
                    filterParams: filterParams,
                    comparator: dateComparator,
                    valueGetter: (params) => {
                        if (!params.data) return "";
                        return AG_GRID.GET_DATE_TIME(params);
                    }
                },
                {
                    headerName: "Duration (in Min.)",
                    field: "duration",
                    filter: 'agTextColumnFilter',
                    headerClass: 'fixed-size-header',
                    cellRenderer: function(params) {
                        if (!params.data) return "";
                        if (!!params.data && params.data.last_saved_time != "0") {
                            if (parseInt(params.data.last_saved_time) >= parseInt(params.data.session_start_time)) {
                                var differenceSec = (parseInt(params.data.last_saved_time) - parseInt(params.data.session_start_time));
                                var differenceMin = parseInt(parseInt(differenceSec) / 60000) + ":" + parseInt((parseInt(differenceSec) % 60000) / 1000).toLocaleString('en-US', {
                                    minimumIntegerDigits: 2,
                                    useGrouping: false
                                });
                                return differenceMin;
                            }
                        } else {
                            return "";
                        }
                    }
                }
            ]
        },
        "XML_FAIL": {
            columnDefs: [{
                headerName: "XML Status",
                field: "xmlmissing",
                resizable: true,
                headerClass: 'fixed-size-header'
            }]
        },
        "SIGN_OFF_REPORT": {
            columnDefs: [{
                    field: "emailtolist",
                    headerName: 'User'
                },
                {
                    field: "signouttime",
                    headerName: 'Finalize Date',
                    headerValueGetter: (params) => 'Finalize Date',
                    //filter: 'agDateColumnFilter',
                    filterParams: filterParams,
                    comparator: dateComparator,
                    valueGetter: (params) => {
                        if (!params.data) return "";
                        return getOnlyDate(params.data.signouttime.$numberLong);
                    },
                    cellRenderer: function(params) {
                        if (!params.data) return "";
                        if (!params.data && !!params.value)
                            return params.value;
                        if (!!params.data)
                            return getOnlyDate(params.data.signouttime.$numberLong);
                    },
                    sort: 'desc'
                },
                {
                    field: "signouttime",
                    headerName: 'Finalize Time',
                    headerValueGetter: (params) => 'Finalize Time',
                    filter: 'agDateColumnFilter',
                    filterParams: filterParams,
                    comparator: dateComparator,
                    valueGetter: (params) => {
                        if (!params.data) return "";
                        return getOnlyTime(params.data.signouttime.$numberLong);
                    },
                    cellRenderer: function(params) {
                        if (!params.data) return "";
                        if (!params.data && !!params.value)
                            return params.value;
                        if (!!params.data)
                            return getOnlyTime(params.data.signouttime.$numberLong);
                    },
                    sort: 'desc'
                }
            ]
        },
        "LINK_CREATED": {
            columnDefs: [{
                    headerName: "Time",
                    field: "time_c",
                    filter: 'agDateColumnFilter',
                    filterParams: filterParams,
                    comparator: dateComparator,
                    valueGetter: (params) => {
                        try {
                            if (!params.data) return;
                            return AG_GRID.GET_TIME_C;
                        } catch (err) {

                        }
                    },
                    sort: 'asc'
                },
                {
                    headerName: "Activity",
                    field: "activity",
                    resizable: true,
                    filter: 'agTextColumnFilter',
                    headerClass: 'fixed-size-header'
                },
                {
                    headerName: "Link",
                    field: "coldownload",
                    resizable: true,
                    filter: 'agTextColumnFilter',
                    headerClass: 'fixed-size-header',
                    cellRenderer: function(params) {
                        if (!params.data) return "Nil";
                        let DE_ACT = params.data.status == 'deactive';
                        console.log(params.data);
                        return `<a href="#" onclick='OpenLink("` + DE_ACT + `","` + params.data.signouttime + `","` + params.data.client + `","` + params.data.currenturl + `","` + params.data.key + `","` + params.data.order + `","` + params.data.roles_orders + `","` + params.data.roles_signoff + `");'>Open link</a>`;
                    }
                }
            ]
        },
        "TEST_3": {
            columnDefs: [{
                headerName: "XML Status",
                field: "xmlmissing",
                resizable: true,
                headerClass: 'fixed-size-header'
            }]
        }
    },
    TIME_FORMAT: {
        DEFAULT: "DD-MMM-YYYY",
        DASH_BOARD: "DD-MMM-YYYY",
        ACTIVE_SESSION: "DD-MMM-YYYY, h:mm:ss a",
        XML_FAIL: "DD-MMM-YYYY, h:mm:ss a",
        SIGN_OFF_REPORT: "DD-MMM-YYYY, h:mm:ss a",
        LINK_CREATED: "DD-MMM-YYYY, h:mm:ss a",
        COMPARE_REPORT: "DD-MMM-YYYY, h:mm:ss a",
        TEST_3: "DD-MMM-YYYY, h:mm:ss a",
        TIME: "h:mm:ss a"
    },
    SUB_HEAD: {
        DEFAULT: "",
        DASH_BOARD: " Shared Links",
        ACTIVE_SESSION: " Current Active Session",
        XML_FAIL: " XML Generate Fail List",
        SIGN_OFF_REPORT: " Finalize Links",
        LINK_CREATED: " Created Links",
        COMPARE_REPORT: "Compare Report",
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
            // ? 07-08-2023
            this.KEY = "CompanyName=NEWGEN\x20KNOWLEDGE\x20WORKS\x20PRIVATE\x20LIMITED,LicensedGroup=Multi,LicenseType=MultipleApplications,LicensedConcurrentDeveloperCount=1,LicensedProductionInstancesCount=1,AssetReference=AG-034980,SupportServicesEnd=12_January_2024_[v2]_MTcwNTAxNzYwMDAwMA==3af86aedefc01b4b95bbafb254463768";
            agGrid.LicenseManager.setLicenseKey(this.KEY);
            if (IS_DASH_BOARD) {
                if (IS_BOOKS_USER) {
                    _["GRID_OPTION"]["DEFAULT_ORDER"]["DASH_BOARD"]['columnDefs_order'].splice(1, 1);
                }
            }
            let reports = _["GRID_OPTION"],
                default_field = _["GRID_OPTION"]["DEFAULT_FILED"],
                ListReports = _["GRID_OPTION"]["DEFAULT_ORDER"],
                ListReportsKeys = Object.keys(ListReports),
                default_column = _["GRID_OPTION"]["DEFAULT_columnDefs"],
                get_key = "__get";
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
                    if (!key.includes(get_key)) {
                        default_column[key + get_key] = {
                            valueGetter: AG_GRID.GET_IDENTIFIER
                        };
                        Object.assign(default_column[key + get_key], default_column[key]);
                    }
                }
            }
            for (const key in reports) {
                if (key.match(/DASH_BOARD|ACTIVE_SESSION|XML_FAIL|SIGN_OFF_REPORT|_DATA|_LINK|_EMAIL|SEARCH_|LINK_CREATED|COMPARE_REPORT|_COUNT|ADMIN_ACCESS/)) {
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
    FIRE_ONCE: function(model, Data, Options, _ = AG_GRID) {

        let eGridDiv = document.getElementById("myGrid");
        _.CURRENT_GRID_COLLECTION_OLD[new Date().getTime()] = Data;
        try {

            if (Object.keys(_.CURRENT_GRID_OPTION).length > 0) {
                if (_.CURRENT_GRID_OPTION && _.CURRENT_GRID_OPTION.api) {
                    _.CURRENT_GRID_OPTION.api.destroy();
                }
            }

            _.CURRENT_TYPE = model;
            _.CURRENT_GRID_OPTION = _["GRID_OPTION"][model];

            if (model == "SEARCH_QUERY") {
                AG_GRID.MAKE_GRID_API(Data);
                new agGrid.Grid(eGridDiv, _.CURRENT_GRID_OPTION);
            } else {

                if (model == "COMPARE_REPORT") {
                    PREPARE_C_REPORT(Data, _);
                } else if ((model == "HISTORY_DATA" || model == "LINK_CREATED")) {
                    _.CURRENT_GRID_OPTION.rowData = _.CURRENT_GRID_COLLECTION = SET_TREE_HIERARCHY(Data, model);
                    new agGrid.Grid(eGridDiv, _.CURRENT_GRID_OPTION);
                    _.CURRENT_GRID_COLLECTION_OLD[new Date().getTime()] = _.CURRENT_GRID_COLLECTION;
                } else {
                    let callback, setRawData;
                    if (typeof model == "string") {
                        callback = model.concat("_", 'FILTER_REPORT');
                        setRawData = true;
                        if (typeof AG_GRID[callback] == "function") {
                            let data = AG_GRID[callback](Data);
                            _.CURRENT_GRID_COLLECTION = data;
                            _.CURRENT_GRID_OPTION.rowData = data;
                            setRawData = false;
                        }
                    }
                    new agGrid.Grid(eGridDiv, _.CURRENT_GRID_OPTION);
                    if (setRawData) _.CURRENT_GRID_OPTION.api.setRowData(Data);
                }
            }
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
            let Value = date[Options.Month ? "getMonth" : "getDate"]();
            let beforeAfterValue = Options.Before ? Value - Count : Value + Count;
            date[Options.Month ? "setMonth" : "setDate"](beforeAfterValue);
            return !Options.GetTime ? date : date.getTime();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('MANIPULATE_DATES', err.message);
        }
    },
    HIT_API_RETURN: function(dataInput, endPoint, reportModel, _ = AG_GRID) {
        try {
            commonfn['GET_RECORD'] = function(response, opt) {
                console.log('GET_RECORD');
                console.log(JSON.stringify(response));
                AG_GRID.FIRE_ONCE(opt, response.data);
                // 07-08-2023
                if (response.data.length > 0) {
                    setTimeout(() => {
                        AG_GRID.ShowLoadingIcon("hideOverlay");
                    }, IS_LOCAL_HOST ? 5500 : 1500);
                }
                _.ShowLoadingIcon(response.data.length > 0 ? "ShowLoading" : "hideOverlay");
            };
            commonfn['callajax'](dataInput, 'GET_RECORD', endPoint, reportModel);
            console.log("HIT_API_RETURN");
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('HIT_API_RETURN', err.message);
        }
    },
    FETCH_QUERY: function(reportModel, Options = {}, _ = AG_GRID) {
        try {
            var END_POINT = API_GET_DOCS,
                jsondata = {},
                LINK_INFO = IS_LIVE_DOMAIN ? ({
                    "$eq": "pubkit"
                }) : (IS_ADMIN ? {
                    "$eq": "pubkit"
                } : {
                    "$ne": "pubkit"
                });
            start1 = getStartOfDay($('#start-date') ? $('#start-date').val() : new Date().getTime());
            end1 = getEndOfDay($('#end-date') ? $('#end-date').val() : new Date().getTime());
            var time_obj = {
                $gte: start1,
                $lt: end1
            };
            if (IS_BOOKS_USER) {
                if (/TNF/gi.test(WF_CLIENT_LIST)) LINK_INFO.$eq = "pubkittnf";
                jsondata["linkstatus"] = {
                    $eq: IS_UAT_DOMAIN ? "UAT" : "LIVE"
                };
            }
            if (reportModel == "ACTIVE_SESSION") {
                var dateTime = new Date().getTime();
                var subtractTime = new Date(dateTime - (30 * 60000)).getTime().toString();
                jsondata = {
                    "tbl": "linksharing",
                    "find": {
                        $or: [{
                                "docstatus": "1",
                                "last_saved_time": {
                                    $eq: "0"
                                },
                                "session_start_time": {
                                    $gte: subtractTime
                                }
                            },
                            {
                                "docstatus": "1",
                                "last_saved_time": {
                                    $gte: subtractTime
                                }
                            }
                        ]
                    },
                    "length": 5000,
                    "sort": {},
                    "filter": ["docid", "docstatus", "session_id", "session_start_time", "session_end_time", "last_saved_time", "remarks", "requeststatus", "request_send_time"]
                };
                if (IS_ADMIN) {}
                if (IS_LOCAL_HOST) {}
                console.log(jsondata);
            } else if (/DASH_BOARD|XML_FAIL|SIGN_OFF_REPORT|COMPARE_REPORT/gi.test(reportModel)) {
                let [IS_DASH, IS_LINKS, IS_COMPARE_REPORT] = [("DASH_BOARD" == reportModel), ("LINK_CREATED" == reportModel), ("COMPARE_REPORT" == reportModel)];
                jsondata = {
                    "tbl": "Shareandinvite",
                    "length": 5000,
                    "find": {},
                    "sort": {},
                    "filter": ["docid", "status", "emailto", "dtd", "apikey", "role", "key", "taskid"]
                };
                if (IS_DASH || IS_LINKS || IS_COMPARE_REPORT) {
                    jsondata["find"] = {
                        "pubkitres": {
                            "$exists": false
                        },
                        "linkinfo": LINK_INFO
                    };
                    if (IS_LINKS) {
                        is_date_search = true;
                        jsondata.length = 5000;
                        if (is_date_search) {
                            jsondata["find"] = {
                                "linkinfo": "pubkit",
                                "client": {
                                    $exists: true
                                },
                                "time_c": time_obj
                            };
                        }
                        jsondata["filter"] = ["docid"];
                        END_POINT = (( /* FETCH_FROM_LIVE ? API_LIVE_PATH : */ API_PATH) + "getdocstatus");
                    } else {
                        jsondata["find"] = {
                            "time_c": time_obj,
                            "role": ROLE_IDS.CO,
                            "linkinfo": (IS_LOCAL_HOST || IS_DEV_DOMAIN) ? {
                                "$eq": "pubkit"
                            } : LINK_INFO,
                            "client": {
                                "$in": WF_CLIENT_LIST ? WF_CLIENT_LIST : []
                            },
                            "corole": {
                                "$exists": false
                            }
                        };
                    }
                    if (IS_COMPARE_REPORT) {
                        jsondata["filter"] = ["comparestatus", "client", "time_c"];
                        END_POINT = API_GET_ADMINDOCS;
                    }
                } else if (["XML_FAIL", "SIGN_OFF_REPORT"].includes(reportModel)) {
                    is_date_search = true;
                    if (is_date_search) {
                        jsondata["find"] = {
                            "linkinfo": LINK_INFO,
                            "status": "signoff",
                            "client": {
                                $exists: true
                            },
                            "time_c": time_obj
                        };
                    } else {
                        jsondata["find"] = {
                            "linkinfo": LINK_INFO,
                            "status": "signoff"
                        };
                    }
                    if ("XML_FAIL" == reportModel) {
                        Object.assign(jsondata["find"], {
                            "ftp": {
                                "$exists": false
                            },
                            "ftpfail": {
                                "$exists": true
                            },
                            "emailto": {
                                "$in": [ROLE_IDS.CO]
                            },
                            "xmlmissing": 0
                        });
                    } else if ("SIGN_OFF_REPORT" == reportModel) {
                        Object.assign(jsondata["find"], {
                            "pubkitres": {
                                "$exists": false
                            },
                            "corole": {
                                "$exists": false
                            },
                            "signouttime": {
                                "$exists": true
                            }
                        });
                    }
                    jsondata["find"]["client"] = {
                        "$in": WF_CLIENT_LIST ? WF_CLIENT_LIST : []
                    };
                }
            }
            setTimeout((data, endpoint, report) => {
                _.HIT_API_RETURN(data, endpoint, report);
            }, 1500, jsondata, END_POINT, reportModel);
        } catch (err) {
            console.warn(err.message);
            // ErrorLogTrace('FETCH_QUERY', err.message);
        }
    },
    SWIFT_REPORT: function(e, Options = {}, _ = AG_GRID) {
        try {
            DOI_RECORD = "";
            _.ShowLoadingIcon("ShowLoading");
            if (e.target) handle_active_list(e.target);
            var Report_Type = ((e.target && (typeof e.target.getAttribute == "function")) ? (e.target.getAttribute("data-report")) : e);
            if (!Report_Type) Report_Type = $('option:selected', $(this)).attr("data-report");
            if (!Report_Type) {
                _.CURRENT_GRID_OPTION.api.setRowData([]);
                AG_GRID.ShowLoadingIcon("hideOverlay");
                return false;
            }
            const concat_fun = Report_Type.concat('_', 'FETCH_QUERY'),
                subHead = document.getElementById("_subhead"),
                value = _.SUB_HEAD[Report_Type] ? _.SUB_HEAD[Report_Type] : "Dashboard";
            if (subHead) subHead.textContent = value;
            if (Report_Type == "HISTORY_DATA") {
                $(".reportselect").val("");
            }
            if (_.CURRENT_GRID_OPTION.api.getDisplayedRowCount() > 0)
                _.ShowLoadingIcon("ShowLoading");
            if (AG_GRID[concat_fun]) {
                AG_GRID[concat_fun](e);
            } else {
                _.FETCH_QUERY(Report_Type, Options);
            }
            document.querySelectorAll("button[data-show='default'],[data-show='default']").forEach(element => {
                element.classList[Report_Type == "DASH_BOARD" ? "remove" : "add"]("d-none");
            });
        } catch (err) {
            console.warn(err.message);
        }
    },
    GET_TIME_C: function(params, Options = {}, _ = AG_GRID) {
        try {
            if (!params.data) return "";
            let time_stamp = params.data[Options.key ? Options.key : "time_c"];
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
                        };
                        if (VALUE) {
                            params.data[opt.col_id] = VALUE;
                            _.FETCH_DOI[data.docid][opt.col_id] = VALUE;
                            if (opt.col_id == "identifier") {
                                var client = document.querySelector(`[row-id="${opt.row_id}"] [col-id="client"]`);
                                if (client) {
                                    params.data["client"] = data["client"];
                                    _.FETCH_DOI[data.docid]["client"] = data["client"];
                                    client.textContent = data["client"];;
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
        //AG_GRID["CURRENT_GRID_OPTION"].api.exportDataAsExcel(getParams(FILE_NAME))
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

function TimeComparator(date1, date2, compareTime = true) {
    var format = compareTime ? 'HH:mm:ss a' : 'DD-MM-YYYY';
    // Handle "Nil" values by converting them to a fixed date or time
    if (date1 === "Nil") date1 = moment(1970).format(format);
    if (date2 === "Nil") date2 = moment(1970).format(format);

    // Parse the dates using moment.js
    const date1Moment = moment(date1, format);
    const date2Moment = moment(date2, format);

    // Compare the moments
    if (date1Moment.isValid() && date2Moment.isValid()) {
        if (date1Moment.isBefore(date2Moment)) {
            console.log(`${date1} is before ${date2}`);
            return -1;
        } else if (date1Moment.isAfter(date2Moment)) {
            console.log(`${date1} is after ${date2}`);
            return 1;
        } else {
            console.log(`${date1} is the same ${date2}`);
            return 0;
        }
    } else {
        console.log(`Invalid date format`);
        return 0;
    }
}

function dateComparator(date1, date2, compareTime = false) {
    // Handle "Nil" values by converting them to a fixed date
    var format = compareTime ? 'HH:mm:ss a' : 'DD-MM-YYYY';
    if (date1 === "Nil") date1 = moment(1970).format(format);
    if (date2 === "Nil") date2 = moment(1970).format(format);

    const date1Number = Date.parse(date1);
    const date2Number = Date.parse(date2);

    // Compare the dates
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

function get_user_info(record, key) {
    try {
        let tempName = null;
        if (!record.username) {
            ["emailtolist", "couseremail", "emailto"].forEach(key => {
                if (record[key] && !tempName) {
                    record.username = tempName = record[key];
                }
            });
        } else tempName = record.username;
        return tempName ? tempName : key ? key : "---";
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('get_user_info', err.message);
    }
};

function CharttDataRendered(params) {
    params.api.createRangeChart({
        chartContainer: document.querySelector("#myChart"),
        cellRange: {
            rowStartIndex: 0,
            rowEndIndex: 500,
            columns: ["comparestatus", "client", "status"],
        },
        suppressChartRanges: true,
        chartType: "groupedColumn",
        aggFunc: "sum",
    });
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

function OverAllSum(params, param1) {
    var sum = 1000;
    const values = params.values;
    sum = values.reduce((a, b) => a + b, 0);
    return sum;
}

function myCustomSumFunction(values) {
    var sum = 1000;
    values.forEach(function(value) {
        sum += Number(value);
    });
    return sum;
}

function priceValueGetter(params) {
    let sum = 0;
    if (params.data) {
        const entries = Object.entries(params.data);
        for (let [key, value] of entries) {
            if (/week/gi.test(key)) {
                sum += value;
            }
        }
    }
    return sum;
}

function numberFormatter(params) {
    if (!params.value || params.value === 0) return "0";
    return "" + Math.round(params.value * 100) / 100;
}