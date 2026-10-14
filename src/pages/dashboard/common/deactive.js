var MODULE_GRID_DL = {};
document.addEventListener('DOMContentLoaded', function(event) {
    MODULE_GRID_DL = {
        GRID_OPTION: {
            "DEFAULT_columnDefs": {},
            "DEFAULT_FILED": {},
            "DEFAULT_ORDER": {
                "DEACTIVATE_LINK": {
                    columnDefs_order: ["identifier", "username", "rolename", "status", "take_action", "time_c"],
                    columnDefs_order_remove: [],
                    GRID_ADD_OPTIONS: {
                        paginationPageSize: 100,
                        paginationAutoPageSize: false,
                        suppressPaginationPanel: false,
                        suppressScrollOnNewData: true
                    }
                }
            },
            "DEACTIVATE_LINK": {
                columnDefs: [{
                        headerName: "Role Name",
                        field: "rolename"
                    },
                    {
                        headerName: "Take Action",
                        field: "take_action",
                        valueGetter: (params) => {
                            try {
                                if (!params.data) return "";
                                return params.data.status == "active" ? `Click to Deactivate` : "";
                            } catch (err) {
                                // console.log([params.data, params.data.status]);
                            }
                        }
                    },
                    {
                        headerName: "Link Created",
                        field: "time_c",
                        valueGetter: AG_GRID.GET_TIME_C
                    }
                ]
            }
        },
        TIME_FORMAT: {
            DEACTIVATE_LINK: "DD-MMM-YYYY, h:mm:ss a"
        },
        SUB_HEAD: {
            DEACTIVATE_LINK: " Active/Deactive Links"
        },
        GET_ACTION_JSON: function(data, Options) {
            try {
                Options = Options ? Options : {
                    canReactive: false,
                    reason: ""
                };
                return {
                    "tbl": "",
                    "find": {
                        "identifier": data['identifier'],
                        "docid": data['docid'],
                        "status": Options.canReactive ? "deactive" : "active"
                    },
                    "length": 50,
                    "update": {
                        "status": Options.canReactive ? "active" : "deactive",
                        "deactivetime": new Date().getTime(),
                        "deactivereason": Options.reason || "",
                        "deactiveuser": USER_MAIL || ""
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
        DE_ACT_RES: function(response, Options = {}, self, current) {
            self = this;
            current = MODULE_GRID_DL;
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
        SINGLE_API_HIT: function(data, Options = {}, self, reportModel, current) {
            self = this;
            reportModel = 'DEACTIVATE_LINK';
            current = MODULE_GRID_DL;
            try {
                AG_GRID.ShowLoadingIcon("ShowLoading");
                // ? https://docs.google.com/document/d/1Berwzk0ikBxPLjKVZ08IxWpTGxj-v65SnO19_dDCHqo/edit
                let JSON_DATA = MODULE_GRID_DL.GET_ACTION_JSON(data, Options),
                    END_API = API_PATH + "findupdatemultiplecollection",
                    SEND_JSON = 'Shareandinvite,Fileslist'.split(",").map(tbl => {
                        let clonedObject = JSON.parse(JSON.stringify(JSON_DATA));
                        clonedObject['tbl'] = tbl;
                        return clonedObject;
                    });
                if (SEND_JSON.length > 0)
                    commonfn['callajax'](SEND_JSON, 'DE_ACT_RES', END_API, current);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('CONCURRENT_API_HIT', err.message);
            }
        },
        CONCURRENT_API_HIT: async function(params, Options = {}, self, reportModel, current) {
            self = this;
            reportModel = 'DEACTIVATE_LINK';
            current = MODULE_GRID_DL;
            try {
                let JSON_DATA = MODULE_GRID_DL.GET_ACTION_JSON(params, Options);
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
        DEACTIVATE_LINK_CELL_DOUBLE_CLICK: async function(params, self, reportModel, current) {
            self = this;
            reportModel = 'DEACTIVATE_LINK';
            current = MODULE_GRID_DL;
            try {
                let [IS_ACT, COL_ID] = [params.data.status == 'active', params.event.target.getAttribute('col-id')];
                if (COL_ID == "take_action") {
                    const {
                        value: text
                    } = await Swal.fire({
                        input: "textarea",
                        title: `Do you want to ${IS_ACT?'deactivate':'active'} the doi?`,
                        text: "Enter you EMP ID and Reason",
                        inputPlaceholder: "Type your reason here...",
                        inputAttributes: {
                            "aria-label": "Type your reason here"
                        },
                        showCancelButton: true,
                        inputValidator: (value) => {
                            return new Promise((resolve) => {
                                if (value) {
                                    resolve();
                                } else {
                                    resolve("You need to write reason!");
                                }
                            });
                        }
                    });
                    if (text) {
                        current.SINGLE_API_HIT(params.data, {
                            reactive: !IS_ACT,
                            reason: text
                        });
                    }
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('DEACTIVATE_LINK_CELL_DOUBLE_CLICK', err.message);
            }

        },
        DEACTIVATE_LINK_FETCH_QUERY: function(e = {}, jsondata = {}, reportModel, self) {
            self = this;
            reportModel = 'DEACTIVATE_LINK';
            try {
                if (/button/gi.test(e.target.tagName)) {} else {
                    return debug.log("click btn");
                }
                var END_POINT = API_GET_DOCS,
                    jsondata = {
                        "tbl": "Shareandinvite",
                        "length": 10,
                        "find": {
                            $or: [{
                                    "identifier": {
                                        $regex: show_input_1.value == "" ? "null" : show_input_1.value,
                                        $options: 'i'
                                    }
                                },
                                {
                                    "docid": {
                                        $regex: show_input_1.value == "" ? "null" : show_input_1.value,
                                        $options: 'i'
                                    }
                                }
                            ]
                        },
                        "status": {
                            $exists: true
                        },
                        "filter": []
                    };
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
            self = MODULE_GRID_DL;
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
        }
    };
    (function() {
        MODULE_GRID_DL.InitLoop();
    })();
});