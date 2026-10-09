var MODULE_GRID_UMC = {};
(function() {
    document.addEventListener('DOMContentLoaded', function(event) {
        MODULE_GRID_UMC = {
            GRID_OPTION: {
                isOverall: false,
                "DEFAULT_columnDefs": {},
                "DEFAULT_FILED": {},
                "DEFAULT_ORDER": {
                    "USER_MODIFY_COUNT": {
                        columnDefs_order: ["client_group", "doi", "docid", "journal", "rolename", "time_c", "insert", "delete", "format", "cmd","query", "correction"],
                        columnDefs_order_remove: [],
                        GRID_ADD_OPTIONS: {
                            paginationPageSize: 100,
                            paginationAutoPageSize: false,
                            suppressPaginationPanel: false,
                            suppressScrollOnNewData: true
                        }
                    }
                },
                "USER_MODIFY_COUNT": {
                    columnDefs: [{
                            field: "client_group",
                            headerName: 'Client',
                            resizable: true,
                            rowGroup: true,
                            hide: true,
                            valueGetter: (params) => {
                                if (!params.data) return "";
                                return params.client;
                            }
                        },
                        {
                            field: "identifier",
                            headerName: 'Doi',
                            resizable: true
                        }, {
                            field: "docid",
                            headerName: 'Docid',
                            resizable: true
                        }, {
                            field: "journal",
                            headerName: 'Journal',
                            resizable: true
                        },
                        {
                            field: "rolename",
                            headerName: 'Role',
                            resizable: true
                        },
                        {
                            headerName: "Time",
                            field: "time_c",
                            filter: 'agDateColumnFilter',
                            filterParams: filterParams,
                            comparator: dateComparator,
                            valueGetter: (params) => {
                                try {
                                    if (!params.data) return;
                                    return AG_GRID.GET_TIME_C(params);
                                } catch (err) {

                                }
                            },
                            sort: 'asc'
                        },
                        {
                            field: "insert",
                            headerName: 'Insert',
                            resizable: true
                        },
                        {
                            field: "delete",
                            headerName: 'Delete',
                            resizable: true
                        },
                        {
                            field: "format",
                            headerName: 'Formatting',
                            resizable: true
                        },
                        {
                            field: "cmd",
                            headerName: 'Comments',
                            resizable: true
                        },
                        {
                            field: "query",
                            headerName: 'Queries',
                            resizable: true
                        },
                        {
                            field: "correction",
                            headerName: 'Total Corrections',
                            resizable: true,
                            valueGetter: (params) => {
                                try {
                                    if (!params.data) return;
                                    return MODULE_GRID_UMC.TotalCorrections(params.data);
                                } catch (err) {
                                    console.warn(err.message);
                                }
                            }
                        }
                    ]
                }
            },
            TIME_FORMAT: {
                USER_MODIFY_COUNT: "DD-MMM-YYYY, h:mm:ss a"
            },
            SUB_HEAD: {
                USER_MODIFY_COUNT: " User Correction Count"
            },
            USER_MODIFY_COUNT_FILTER_REPORT: function(data, reportModel, self, thisModule) {
                self = this;
                reportModel = 'USER_MODIFY_COUNT';
                thisModule = MODULE_GRID_UMC;
                if(thisModule.GRID_OPTION.isOverall){
                   return MODULE_GRID_UMC.USER_MODIFY_COUNT_OVERALL_REPORT(data, reportModel, self, thisModule);
                }else{
                   return MODULE_GRID_UMC.USER_MODIFY_COUNT_ROLEWISE_REPORT(data, reportModel, self, thisModule);
                }
            },
            USER_MODIFY_COUNT_ROLEWISE_REPORT: function(data, reportModel, self, thisModule) {
                self = this;
                reportModel = 'USER_MODIFY_COUNT';
                thisModule = MODULE_GRID_UMC;
                try {
                    var arr = thisModule.GRID_OPTION.DEFAULT_ORDER.USER_MODIFY_COUNT.columnDefs_order,
                        staticObj = {
                            "insert": "Insert",
                            "delete": "Delete",
                            "format": "forMat",
                            "cmd": "Comment",
                            "query":"Query",
                            "newref": "Ref"
                        };
                    data.forEach((entry, indx, arr) => {
                        if (entry.info) {
                            for (const key in staticObj) {
                                if (staticObj.hasOwnProperty(key)) {
                                    console.log(`${key}: ${staticObj[key]}`);
                                    entry[key] = entry.info[staticObj[key]];
                                }
                            }
                        }
                    });
                    return data;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('FILTER_REPORT', err.message);
                }
            },
            USER_MODIFY_COUNT_OVERALL_REPORT: function(data, reportModel, self, thisModule) {
                self = this;
                reportModel = 'USER_MODIFY_COUNT';
                thisModule = MODULE_GRID_UMC;
                try {
                    var arr = thisModule.GRID_OPTION.DEFAULT_ORDER.USER_MODIFY_COUNT.columnDefs_order,
                        staticObj = {
                            "insert": "Insert",
                            "delete": "Delete",
                            "format": "forMat",
                            "cmd": "Comment",
                            "query": "Query",
                            "newref": "Ref"
                        };
                    
                    // Create a map to group documents by identifier/docid
                    const groupedMap = new Map();
                    
                    // First, group the data by identifier or docid
                    data.forEach((entry) => {
                        const key = entry.identifier || entry.docid;
                        
                        // Skip if no identifier/docid
                        if (!key) return;
                        
                        if (!groupedMap.has(key)) {
                            // Create a new object with basic document info
                            const newEntry = {
                                // Copy all properties from original entry
                                ...entry,
                                insert: 0,
                                delete: 0,
                                format: 0,
                                cmd: 0,
                                query: 0,
                                newref: 0
                            };
                            groupedMap.set(key, newEntry);
                        }
                        
                        // Get the current grouped entry
                        const groupedEntry = groupedMap.get(key);
                        
                        // Sum up the fields from the info object
                        if (entry.info) {
                            for (const key in staticObj) {
                                if (staticObj.hasOwnProperty(key)) {
                                    const infoKey = staticObj[key];
                                    infoKey == "Query" ? groupedEntry[key] = entry.info[infoKey] || 0 : groupedEntry[key] += (entry.info[infoKey] || 0);
                                }
                            }
                        }
                    });
                    
                    // Convert the map back to an array
                    return Array.from(groupedMap.values());
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('FILTER_REPORT', err.message);
                }
            },
            USER_MODIFY_COUNT_FETCH_QUERY: function(e = {}, jsondata = {}, reportModel, self, current) {
                self = this;
                reportModel = 'USER_MODIFY_COUNT';
                current = MODULE_GRID_UMC;
                try {
                    if (e.target && /button|input|select/gi.test(e.target.tagName)) {

                    } else {
                        return debug.log("click btn");
                    }
                    const chosenDate = document.getElementById('start-date').value;
                    const eDate = document.getElementById('end-date').value;
                    const startDate = new Date(chosenDate);
                    const endDate = new Date(eDate);
                    var startTime = getStartOfDay(startDate);
                    var endTime = getEndOfDay(endDate);
                    var daysCount = moment(e.endDate).diff(moment(e.startDate), 'days');
                    console.log("DAYS DIFF: " + daysCount);
                    if (daysCount > 31) {
                        Swal.fire({
                            title: 'Warning',
                            text: `Choose a date range upto a month or less.`,
                            "icon": 'warning'
                        });
                        return;
                    }
                    if (e.startTime && e.endTime) {
                        startTime = e.startTime;
                        endTime = e.endTime;
                    }
                    if(corr_report_type.value == "overall"){
                        current.GRID_OPTION.isOverall = true;
                    }else if(corr_report_type.value == "role_wise"){
                        current.GRID_OPTION.isOverall = false;
                    }
                    console.log(chosenDate, startDate, endDate);
                    if (config_client.value == "null") {
                        Swal.fire({
                            title: 'Warning',
                            text: `Kindly choose client`,
                            "icon": 'warning'
                        });
                        return;
                    }
                    if(corr_report_type.value == "null"){
                        Swal.fire({
                            title: 'Warning',
                            text: `Kindly choose report type`,
                            "icon": 'warning'
                        });
                        return;
                    }
                    jsondata = {
                        "tbl": "docmodifieddata",
                        "find": {
                            "client": {
                                "$in": (config_client && config_client.value ? [config_client.value.toLocaleUpperCase()] : WF_CLIENT_LIST ? WF_CLIENT_LIST : [])
                            // ? Collator role excluding - 02_Nov_24-RJ
                            },
                            "time_c": {
                                $gte: startTime,
                                $lt: endTime
                            }
                        },
                        "length": 5000,
                        "sort": {
                            time_c: 1
                        },
                        "filter": []
                    };
                    AG_GRID.HIT_API_RETURN(jsondata, API_GET_DOCS, reportModel);
                    return jsondata;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('FETCH_QUERY_JSON', err.message);
                }
            },
            TotalCorrections: function(data) {
                try {
                    let totalCorr;
                    if (!data.info) return;
                    if(MODULE_GRID_UMC.GRID_OPTION.isOverall){
                        totalCorr = data.insert + data.delete + data.cmd + data.query + data.format;
                    }else{
                        totalCorr = data.info.Insert + data.info.Delete + data.info.Comment + data.info.Query + data.info.forMat;
                    }
                    return totalCorr;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('module_grid_TotalCorrections', err.message);
                }
            },
            ShowLoop: function(InputDate, self) {
                self = MODULE_GRID_UMC;
                try {


                } catch (err) {

                }
            },
            InitLoop: function(self) {
                self = MODULE_GRID_UMC;
                try {
                    for (const [main_key, main_value] of Object.entries(self)) {
                        if (typeof main_value == "object") {
                            for (const [sub_key, sub_value] of Object.entries(main_value)) {
                                if (/string|function/gi.test(typeof sub_value)) {
                                    if (AG_GRID[main_key]) {
                                        AG_GRID[main_key][sub_key] = sub_value;
                                        console.log(AG_GRID[main_key][sub_key]);
                                    }
                                } else if (typeof sub_value == "object" && Object.values(sub_value).length != 0) {
                                    for (const [sub_sub_key, sub_sub_value] of Object.entries(sub_value)) {
                                        if ("columnDefs" == sub_sub_key) {
                                            AG_GRID[main_key][sub_key] = sub_value;
                                            console.log(AG_GRID[main_key][sub_key]);
                                        } else {
                                            if (AG_GRID[main_key][sub_key]) {
                                                console.log(sub_sub_key);
                                                AG_GRID[main_key][sub_key][sub_sub_key] = sub_sub_value;
                                                debug.log(AG_GRID[main_key][sub_key][sub_sub_key]);
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
            }
        };
        (function() {
            MODULE_GRID_UMC.InitLoop();
        })();
    });
})();