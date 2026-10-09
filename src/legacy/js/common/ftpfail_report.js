var MODULE_GRID_UMC = {};
(function() {
    document.addEventListener('DOMContentLoaded', function(event) {
        MODULE_GRID_UMC = {
            GRID_OPTION: {
                isOverall: false,
                "DEFAULT_columnDefs": {},
                "DEFAULT_FILED": {},
                "DEFAULT_ORDER": {
                    "FTP_FAIL": {
                        columnDefs_order: ["client_group", "doi", "docid", "status","stage_internal","ftpfailmsg","ftpfail","time_c"],
                        columnDefs_order_remove: [],
                        GRID_ADD_OPTIONS: {
                            paginationPageSize: 100,
                            paginationAutoPageSize: false,
                            suppressPaginationPanel: false,
                            suppressScrollOnNewData: true
                        }
                    }
                },
                "FTP_FAIL": {
                    columnDefs: [{
                            field: "client_group",
                            headerName: 'Client',
                            resizable: true,
                            rowGroup: true,
                            hide: true,
                            valueGetter: (params) => {
                                if (!params.data) return "";
                                return params.data.client;
                            }
                        },
                        {
                            field: "identifier",
                            headerName: 'Doi',
                            resizable: true,
                            valueGetter: (params) => {
                            if (!params.data) return "";
                            return params.data.identifier;
                            }
                        },
                        {
                            field: "docid",
                            headerName: 'Docid',
                            resizable: true,
                            valueGetter: (params) => {
                            if (!params.data) return "";
                            return params.data.docid;
                            }
                        },
                        {
                            field: "status",
                            headerName: 'Status',
                            resizable: true,
                            valueGetter: (params) => {
                            if (!params.data) return "";
                            return params.data.status;
                            }
                        },
                        {
                            field: "stage_internal",
                            colId: "stage_internal",
                            headerName: 'Package Status',
                            resizable: true,
                            cellClass: params => {
                                if (!params.data) return null;
                                return params.data.ftpfail ? 'ftpFail' : 'ftpPass';
                            },
                            valueGetter: (params) => {
                            if (!params.data) return "";
                            return params.data.ftpfail ? "Package not Sent" : "";
                            }
                        },
                        {
                        headerName: "FTP Failed Message",
                        field: "ftpfailmsg",
                        valueGetter: (params) => {
                            if (!params.data) return "";
                            return params.data.ftpfailmsg;
                        }
                        },
                        {
                            headerName: "FTP Failed Time",
                            field: "ftpfail",
                            filter: 'agDateColumnFilter',
                            filterParams: filterParams,
                            comparator: dateComparator,
                            valueGetter: (params) => {
                                try {
                                    if (!params.data) return;
                                    return AG_GRID.GET_TIME_C(params,{
                                        key: "ftpfail"
                                    });
                                } catch (err) {

                                }
                            },
                            sort: 'asc'
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
                    ]
                }
            },
            TIME_FORMAT: {
                FTP_FAIL: "DD-MMM-YYYY, h:mm:ss a"
            },
            SUB_HEAD: {
                FTP_FAIL: "FTP Fail Records"
            },
            FTP_FAIL_FILTER_REPORT: function(data, reportModel, self, thisModule) {
                self = this;
                reportModel = 'FTP_FAIL';
                thisModule = MODULE_GRID_UMC;
                console.log("FROM FILTER REPORTS");
                // if(thisModule.GRID_OPTION.isOverall){
                //    return MODULE_GRID_UMC.FTP_FAIL_OVERALL_REPORT(data, reportModel, self, thisModule);
                // }else{
                //    return MODULE_GRID_UMC.FTP_FAIL_ROLEWISE_REPORT(data, reportModel, self, thisModule);
                // }
                return data;
            },
            FTP_FAIL_CELL_DOUBLE_CLICK: function(params, self, reportModel, current) {
            self = this;
            reportModel = 'FTP_FAIL';
            current = MODULE_GRID_UE;
            console.log("inside double clik");
            let [DE_ACT, COL_ID] = [params.data.status == 'deactive', params.event.target.getAttribute('col-id')];
            if (COL_ID == "stage_internal" && params.data.status == "signoff" && params.event.target.classList.contains("ftpFail")) {
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
            },
            FTP_FAIL_FETCH_QUERY: function(e = {}, jsondata = {}, reportModel, self, current) {
                self = this;
                reportModel = 'FTP_FAIL';
                current = MODULE_GRID_UMC;
                try {
                    jsondata = {
                        "tbl": "Fileslist",
                        "find": {
                             "ftpfail": {
                                "$exists": true
                            },
                        },
                        "length": 1000,
                        "filter": []
                    };
                    AG_GRID.HIT_API_RETURN(jsondata, API_GET_DOCS, reportModel);
                    return jsondata;
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('FETCH_QUERY_JSON', err.message);
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