document.addEventListener('DOMContentLoaded', function(event) {

    window.MODULE_GRID_UA = {
        GRID_OPTION: {
            "DEFAULT_columnDefs": {},
            "DEFAULT_FILED": {},
            "DEFAULT_ORDER": {
                "ACTIVITY_DATA": {
                    columnDefs_order: ["identifier", "username", "session_id", "role", "time_c", "recordtype", "action", "remark", "info"],
                    columnDefs_order_remove: [],
                    GRID_ADD_OPTIONS: {
                        paginationPageSize: 100,
                        paginationAutoPageSize: false,
                        suppressPaginationPanel: false,
                        suppressScrollOnNewData: true
                    }
                }
            },
            "ACTIVITY_DATA": {
                columnDefs: [{
                        headerName: "Time",
                        field: "time_c",
                        filter: 'agDateColumnFilter',
                        filterParams: filterParams,
                        comparator: dateComparator,
                        valueGetter: AG_GRID.GET_TIME_C,
                        sort: 'desc'
                    },
                    {
                        headerName: "Session",
                        field: "session_id",
                        // sort: 'asc',
                        hide: true
                    },
                    {
                        headerName: "Record",
                        field: "recordtype",
                        resizable: true,
                        filter: 'agTextColumnFilter',
                        headerClass: 'fixed-size-header',
                        hide: true
                    }, {
                        headerName: "Action",
                        field: "action",
                        resizable: true,
                        filter: 'agTextColumnFilter',
                        // headerClass: 'fixed-size-header',
                        valueGetter: (params) => {
                            try {
                                if (!params.data) return "";
                                return params.data.action ? params.data.action : "";
                            } catch (err) {
                                // console.log([params.data, params.data.status]);
                            }
                        },
                    }, {
                        headerName: "Remark",
                        field: "remark",
                        valueGetter: (params) => {
                            try {
                                if (!params.data) return "";
                                return params.data.dialog_name || params.data.remark || "";
                            } catch (err) {
                                return "";
                            }
                        },
                    }, {
                        headerName: "More Info",
                        field: "info",
                        // hide: true,
                        valueGetter: (params) => {
                            try {
                                if (!params.data) return "";
                                return params.data.info ? params.data.info : "";
                            } catch (err) {
                                // console.log([params.data, params.data.status]);
                            }
                        }
                    }
                ]
            }
        },
        TIME_FORMAT: {
            ACTIVITY_DATA: "DD-MMM-YYYY, h:mm:ss a"
        },
        SUB_HEAD: {
            ACTIVITY_DATA: " User Activity History"
        },
        MappingKey: {
            "open_close_dialog": 'open_close_dialog',
            "query_quick_answer": 'query_quick_answer',
            "guided_tour_image": 'guided_tour_image',
            "guided_tour": 'guided_tour',
            "pdf_download": 'pdf_download',
            "fetch_doi": 'fetch_doi',
            "fetch_plainText": 'fetch_plainText',
            "insert_symbol": 'insert_symbol',
            "findItems": 'find_list|replace_list',
            "video_tour": 'video_tour',
            "support_mail": 'support_mail',
            "user_action_history": 'user_action_history',
            "landing_dwell": 'landing_dwell'
        },
        extra_keys: {
            "open_close_dialog": null,
            "user_action_history": null,
            "query_quick_answer": null,
            "guided_tour": {
                'remark': "Guided Tour",
                'action': "Open",
                'info': "Click Here"
            },
            "pdf_download": null,
            "insert_symbol": {
                'remark': "Insert Symbol",
                'action': "Insert",
                'info': "Click Here"
            },
            "fetch_doi": {
                'remark': "Fetch DOI",
                'action': "Fetch",
                'info': "Click Here"
            },
            "fetch_plainText": {
                'remark': "Fetch Plain Text",
                'action': "Fetch",
                'info': "Click Here"
            },
            "findItems": null,
            "video_tour": null,
            "landing_dwell": {
                'remark': "Landing Dwell",
                'action': "Continue",
                'info': "Landing Page"
            }
        },
        GET_CLONE_ENTRY: function(originalObject, reportModel, self, thisModule) {
            self = this;
            reportModel = 'ACTIVITY_DATA';
            thisModule = MODULE_GRID_UA;
            try {
                // Array of keys to exclude
                const keysToExclude = ['docid', 'rolename', 'dtd', '_w', 'c', '_id', '_v', 'timeiso_c', 'timeiso_u', 'time_u', '_sb', '', 'type', 'division'];
                keysToExclude.push(...Object.keys(thisModule.MappingKey));
                // Function to exclude keys from object
                const excludeKeys = (obj, keys) => {
                    const newObj = {
                        ...obj
                    };
                    keys.forEach(key => delete newObj[key]);
                    return newObj;
                };
                // Destructure the object and exclude keys from the array
                const cleanedObject = excludeKeys(originalObject, keysToExclude);
                // console.log(cleanedObject);
                return cleanedObject;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('GET_CLONE_ENTRY', err.message);
            }
        },
        ACTIVITY_DATA_CELL_DOUBLE_CLICK: function(params, self, reportModel, current) {
            self = this;
            reportModel = 'ACTIVITY_DATA';
            current = MODULE_GRID_UA;
            try {
                function renderTable(data) {
                    var $tableBody = $("#jsonTable tbody");
                    $tableBody.empty();

                    function renderRow(key, value, isEvenRow) {
                        var $row = $("<tr>").addClass(isEvenRow ? "bg-light bg-gray-100" : "bg-gray-200 bg-light");
                        $row.append($("<td>").text(key).addClass("font-weight-bold font-semibold bg-gray-300 border"));
                        if (typeof value === "object") {
                            // Add json-table-cell class
                            $row.append($("<td>").append(renderObject(value)).addClass("border json-table-cell"));
                        } else {
                            // Add json-table-cell class
                            $row.append($("<td>").text(value).addClass("json-table-cell border"));
                        }
                        return $row;
                    }

                    function renderObject(obj) {
                        var $table = $("<table>").addClass("table table-sm table-striped table-auto border-collapse border border-gray-200");
                        var $tbody = $("<tbody>");
                        var isEvenRow = true;
                        for (var key in obj) {
                            var $row = renderRow(key, obj[key], isEvenRow);
                            isEvenRow = !isEvenRow;
                            $tbody.append($row);
                        }

                        $table.append($tbody);
                        return $table;
                    }
                    var isEvenRow = true;
                    for (var key in data) {
                        var $row = renderRow(key, data[key], isEvenRow);
                        isEvenRow = !isEvenRow;
                        $tableBody.append($row);
                    }
                }

                // Function to check if a string is a valid URL
                function isValidUrl(url) {
                    try {
                        new URL(url);
                        return true;
                    } catch (_) {
                        return false;
                    }
                }
                const getDateValue = function(time_iso) {
                    return time_iso ? new Date(time_iso).toLocaleString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true
                    }) : "";
                };

                function newViewHistory(originData) {
                    const originList = [originData];
                    const filteredArray = originList.map(item => {
                        const parts = (item.info || "").split("_");
                        const $textOnly = $(`<div>${parts[2] || ""}</div>`).text() || "";

                        // Build the base object
                        const obj = {
                            recordtype: item.recordtype,
                            action: item.action,
                            remark: item.remark || "",
                            dialog_name: item.dialog_name || item.dialog_id || "",
                            durationMs: item.durationMs,
                            isDirectClose: item.isDirectClose,
                            time_iso: getDateValue(item.time_iso)
                        };

                        // Add alert_title only if not empty
                        if (parts[1]) {
                            obj.alert_title = parts[1];
                        }

                        // Add alert_content only if not empty
                        if ($textOnly) {
                            obj.alert_content = $textOnly;
                        }

                        return obj;
                    });

                    return filteredArray;
                }

                if (params.event.target.getAttribute('col-id') == "info") {
                    var jsonInput = {};
                    for (const key in params.data) {
                        const value = params.data[key];
                        if (value != null && value != undefined) {
                            if (typeof value == "object") {
                                if (value.actual_duration) {
                                    let is_mill_seconds = value.actual_duration.toString().indexOf("000") > -1;
                                    jsonInput[value.name] = {
                                        "actual_duration": Math.floor(value.actual_duration / (is_mill_seconds ? 1000 : 1)),
                                        "view_duration": value.duration
                                    };
                                } else if (key == "view") {
                                    jsonInput["More Info"] = value;
                                }
                            } else {
                                if ('recordtype' == key && /open_close_dialog|user_action_history|attachments_flow/.test(value)) {
                                    jsonInput["Action"] = newViewHistory(params.data);
                                }
                            }
                        }
                    }
                    if (isValidUrl(jsonInput)) {
                        fetch(jsonInput)
                            .then(response => response.json())
                            .then(jsonData => renderTable(jsonData))
                            .catch(error => alert("Error fetching JSON from URL: " + error));
                    } else {
                        try {
                            if (typeof jsonInput == "string") var jsonData = JSON.parse(jsonInput);
                            else jsonData = jsonInput;
                            renderTable(jsonData);
                        } catch (error) {
                            alert("Invalid JSON format or URL!");
                        }
                    }
                    $('#myModal').modal();
                }
            } catch (err) {
                console.warn(err.message);
                // ErrorLogTrace('SEARCH_BY_DATE_CELL_DOUBLE_CLICK', err.message);
            }

        },
        ACTIVITY_DATA_FILTER_REPORT: function(data, reportModel, self, thisModule) {
            self = this;
            reportModel = 'ACTIVITY_DATA';
            thisModule = MODULE_GRID_UA;
            try {
                var outList = [],
                    outList_callback = function(source, key, value, canPush, deleteKeys = []) {
                        try {
                            let clone = self.GET_CLONE_ENTRY(source);
                            if (typeof value == "string") {
                                clone[key] = value;
                            } else {
                                Object.assign(clone, value);
                            }
                            deleteKeys.forEach(k => delete clone[k]);
                            if (canPush) outList.push(clone);
                            else return clone;
                        } catch (err) {
                            console.warn(err.message);
                            ErrorLogTrace('outList_callback', err.message);
                        }
                    };

                data.forEach((entry, indx, arr) => {
                    try {
                        // Handle new format: entry.history with nested action types
                        if (entry.recordtype === 'user_action_history' && entry.history) {
                            // Transform new format to compatible structure
                            Object.keys(entry.history).forEach(actionType => {
                                const actionData = entry.history[actionType];
                                if (typeof actionData === 'object' && !Array.isArray(actionData)) {
                                    // New format: actionType -> dialogName -> array
                                    Object.keys(actionData).forEach(dialogName => {
                                        const dialogEntries = actionData[dialogName];
                                        if (Array.isArray(dialogEntries)) {
                                            dialogEntries.forEach(subEntry => {
                                                // Add dialog_name for display in Remark column
                                                subEntry.dialog_name = dialogName;
                                                // Process as old format entry
                                                outList_callback(entry, 'action', subEntry, true, ['history']);
                                            });
                                        }
                                    });
                                } else if (Array.isArray(actionData)) {
                                    // Direct array format (like find/replace lists)
                                    actionData.forEach(subEntry => {
                                        outList_callback(entry, 'action', subEntry, true);
                                    });
                                }
                            });
                            // Skip old format processing for this entry
                            return;
                        }

                        let rowList = thisModule.MappingKey[entry.recordtype];
                        if (rowList) {
                            rowList.split("|").forEach(key => {
                                if (entry[key]) {
                                    if (typeof entry[key] == "object") {
                                        if (Array.isArray(entry[key])) {
                                            Array.from(entry[key]).forEach(sub_row => {
                                                if (typeof sub_row == "string") {
                                                    if (/_list/gi.test(key)) {
                                                        let temp_json = {
                                                            'action': /find/gi.test(key) ? "find" : "Replace",
                                                            'remark': sub_row
                                                        };
                                                        outList_callback(entry, 'action', temp_json, !0);
                                                    } else outList_callback(entry, 'action', sub_row, !0);
                                                } else if (typeof sub_row == "object") {
                                                    if (/guided_tour|insert_symbol/gi.test(rowList)) {
                                                        // ****************
                                                        let new_json = Object.assign({}, thisModule.extra_keys[rowList], {
                                                            "view": sub_row,
                                                            "time_c": (sub_row.time_c ? sub_row.time_c : new Date().getTime())
                                                        });
                                                        outList_callback(entry, 'action', new_json, !0);
                                                    } else {
                                                        ['action', 'remark'].forEach(sub_key => {
                                                            if (sub_row[sub_key]) {
                                                                outList_callback(entry, null, sub_row, !0);
                                                            }
                                                        });
                                                    }
                                                }

                                            });
                                        }
                                    } else {
                                        outList_callback(entry, 'action', entry[key], !0);
                                    }
                                } else if (/download/gi.test(key)) {
                                    entry['remark'] = entry.pdftype;
                                    entry['info'] = "Click Here";
                                    entry['view'] = {
                                        Status: entry.downloadstatus ? "Success" : "Fail",
                                        Page: entry.page + " Page"
                                    };
                                    outList_callback(entry, 'action', "Download", !0);
                                } else if (/fetch_/gi.test(key)) {
                                    /* 
                                    "response": bibtext,"query": doi,"endTimeStamp": timestamp,"startTimeStamp": startTime,"status": responceTxt,"ismissing": missString,
                                    */
                                    let from_assigned = thisModule.extra_keys[rowList] ? thisModule.extra_keys[rowList] : {},
                                        new_json = Object.assign({}, from_assigned, {
                                            "view": {
                                                "response": entry.response,
                                                "parse_response": entry.parse_res,
                                                "status": entry.status,
                                                "query": entry.query
                                            },
                                            "time_c": entry.time_c
                                        });
                                    outList_callback(entry, 'action', new_json, !0);
                                } else if (entry.action && entry.remark) {
                                    outList_callback(entry, 'action', entry.action, !0);
                                }
                            });
                        }
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('FILTER_REPORT', err.message);
                    }
                });
                let uniqueList = Array.from(new Set(outList.map(JSON.stringify))).map(JSON.parse);
                uniqueList.sort(function(a, b) {
                    try {
                        return a.time_c.$numberLong - b.time_c.$numberLong;
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('data.sort', err.message);
                    }
                });
                return uniqueList;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('FILTER_REPORT', err.message);
            }
        },
        ACTIVITY_DATA_FETCH_QUERY: function(e = {}, jsondata = {}, reportModel, self) {
            self = MODULE_GRID_UA;
            reportModel = 'ACTIVITY_DATA';
            try {
                if (/button/gi.test(e.target.tagName)) {

                } else {
                    if (IS_LOCAL_HOST) show_input_1.value = "skad388";
                    document.getElementById('fetch_db_btn_1').onclick = self.ACTIVITY_DATA_FETCH_QUERY;
                    return debug.log("click btn");
                }
                var END_POINT = API_GET_DOCS,
                    jsondata = {
                        "tbl": "UserPreference"
                    };
                jsondata.length = 50;
                let find_key = "identifier";
                let find_Value = Object.values(self.MappingKey).join("|");
                // if (IS_LOCAL_HOST) find_Value = find_Value.replace("open_close_dialog|", "") //"guided_tour|insert_symbol";
                jsondata["find"] = {
                    "recordtype": {
                        $regex: find_Value,
                        $options: 'i'
                    },
                    [find_key]: {
                        $regex: show_input_1.value == "" ? "null" : show_input_1.value,
                        $options: 'i'
                    }
                };
                jsondata["filter"] = ["docid"];
                setTimeout((data, endpoint, report) => {
                    AG_GRID.HIT_API_RETURN(data, endpoint, report);
                }, 1500, jsondata, END_POINT, reportModel);
                return jsondata;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('FETCH_QUERY_JSON', err.message);
            }
        },
        InitLoop: function(self) {
            self = MODULE_GRID_UA;
            try {
                for (const [main_key, main_value] of Object.entries(self)) {
                    if (main_key == "extra_keys") {
                        continue;
                    }
                    if (typeof main_value == "object") {
                        for (const [sub_key, sub_value] of Object.entries(main_value)) {
                            if (/string|function/gi.test(typeof sub_value)) {
                                if (AG_GRID[main_key]) {
                                    AG_GRID[main_key][sub_key] = sub_value;
                                }
                            } else if (typeof sub_value == "object" && Object.values(sub_value).length != 0) {
                                for (const [sub_sub_key, sub_sub_value] of Object.entries(sub_value)) {
                                    if ("columnDefs" == sub_sub_key) {
                                        AG_GRID[main_key][sub_key] = sub_value;
                                    } else {
                                        if (AG_GRID[main_key][sub_key]) {
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
                var template_dialog = `<div class="mt-n5 modal" id="myModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-scrollable mw-100" role="document">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title" id="exampleModalLabel">VIEWER</h5>
                      <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    </div>
                    <div class="modal-body">
                        <table id="jsonTable" class="table table-sm table-striped table-auto border-collapse border border-gray-200">
                            <thead class="thead-dark"><tr><th class="text-left ">Key</th><th class="text-left ">Value</th></tr></thead>
                            <tbody></tbody>
                        </table>
                    </div>
                  </div>
                </div>
              </div>`;
                $(document.body).append(template_dialog);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('module_grid_InitLoop', err.message);
            }
        }
    };
    (function() {
        MODULE_GRID_UA.InitLoop();
    })();
});