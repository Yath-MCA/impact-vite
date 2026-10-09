var newData1 = [];
commonfn['VALIDATE_PACKAGE'] = function (response) {
    try {
        let newJson = {};
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
document.addEventListener('DOMContentLoaded', function (event) {
    window.MODULE_GRID_HD = {
        GRID_OPTION: {
            "DEFAULT_columnDefs": {},
            "DEFAULT_FILED": {},
            "DEFAULT_ORDER": {
                "HISTORY_DATA": {
                    columnDefs_order: ["client", "identifier", "username", "role", "time_c", "activity", "coldownload"],
                    columnDefs_order_remove: [],
                    GRID_ADD_OPTIONS: {
                        paginationPageSize: 100,
                        paginationAutoPageSize: false,
                        suppressPaginationPanel: false,
                        suppressScrollOnNewData: true
                    }
                }
            },
            "HISTORY_DATA": {
                columnDefs: [{
                    headerName: "Time",
                    field: "time_c",
                    filter: 'agDateColumnFilter',
                    filterParams: filterParams,
                    comparator: dateComparator,
                    valueGetter: AG_GRID.GET_TIME_C,
                    sort: 'asc'
                },
                {
                    headerName: "Activity",
                    field: "activity",
                    resizable: true,
                    filter: 'agTextColumnFilter',
                    headerClass: 'fixed-size-header',
                    cellRenderer: function (params) {
                        if (!params.data) return "";
                        if (!!params.data.activity) {
                            if (params.data.activity.toLowerCase().indexOf("task could not") > -1) {
                                return "<span style='color: red;'>" + params.data.activity + " (Error)</span>";
                            } else {
                                return params.data.activity;
                            }
                        }
                    }
                },
                {
                    headerName: "Download",
                    field: "coldownload",
                    resizable: true,
                    width: 160,
                    cellRenderer: function (params) {
                        if (!params.data) return "";

                        const {
                            activity = "",
                            timestamp,
                            rolename = "",
                            status,
                            aukey,
                            docid,
                            roleid,
                            client,
                            identifier = "",
                            signouttime,
                            currenturl,
                            order,
                            projectname,
                            roles_signoff,
                            roles_orders,
                            edkey,
                            cokey
                        } = params.data;

                        const isSaveActivity = /auto save|save/i.test(activity);
                        const isImportRole = rolename.toLowerCase() === "import";
                        const isFinalized = activity.toLowerCase().includes("finalized");
                        const randomStr = () => Math.floor(new Date().valueOf() * Math.random());

                        if (isSaveActivity) {
                            const date = new Date(parseInt(timestamp));
                            const pad = (n) => n.toString().padStart(2, '0');
                            const dateStr = `${date.getFullYear()}${pad(date.getMonth())}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

                            const identifierParts = identifier.split("/");
                            const fileNamePart = `${client}_${identifierParts.at(-2)}_${identifierParts.at(-1)}_${dateStr}.html`;

                            return `<a target="_blank" href="${BACKEND_DOMAIN}/impactapinew/filedownload?appkey=xmleditor&file_sn=${docid}_${timestamp}.html&docid=${docid}/backup/${roleid}&file_on=${fileNamePart}" title="Download file">Download file</a>`;
                        }


                        if (isImportRole) {
                            // ? As suggest by Siva, For downloading package and docid - Always call oracle api from UAT only 
                            const inputPackageDownload = `<a target="_blank" href="${ORACLE_DOMAIN}/impactapinew/oracleobjectstoragedownload?input=${docid}" title="Download input package">Download Input package</a>`;
                            const outputPackageDownload = `<a target="_blank" href="${ORACLE_DOMAIN}/impactapinew/oracleobjectstoragedownloaddirectory?docid=${docid}" title="Download output package">Download Output package</a>`;

                            return `${inputPackageDownload}, ${outputPackageDownload}`;
                        }

                        if (isFinalized) {
                            const isDeactive = status === "deactive";
                            let key = "";

                            switch (rolename.toLowerCase()) {
                                case "author":
                                    key = aukey;
                                    break;
                                case "editor":
                                    key = edkey;
                                    break;
                                case "collator":
                                    key = cokey;
                                    break;
                            }

                            const openLink = `<a href="#" onclick='OpenLink("${isDeactive}", "${signouttime}", "${client}", "${currenturl}", "${key}", "${order}", "${roles_orders}", "${roles_signoff}")'>Open link</a>`;
                            const downloadZip = `<a target="_blank" href="https://${BACKEND_DOMAIN}/impactapinew/filedownload?appkey=xmleditor&file_sn=${docid}/${projectname}.zip&file_on=${projectname}_${randomStr()}.zip" title="Download package">Download package</a>`;

                            return `${openLink}, ${downloadZip}`;
                        }

                        return "";
                    }

                }
                ]
            }

        },
        TIME_FORMAT: {
            HISTORY_DATA: "DD-MMM-YYYY, h:mm:ss a"
        },
        SUB_HEAD: {
            HISTORY_DATA: " Document History"
        },
        HISTORY_DATA_FETCH_QUERY: function (jsondata = {}, reportModel) {
            reportModel = 'HISTORY_DATA';
            try {
                var END_POINT = API_GET_DOCS,
                    jsondata = {
                        "tbl": "Shareandinvite"
                    };
                jsondata.length = 500;
                let active = document.querySelector(".list-group-item.active"),
                    find_key = "identifier",
                    find_object = {
                        "manuscript_no": "manuscriptno",
                        "doi": "identifier",
                        "mail": "emailtolist"
                    };
                if (active.hasAttribute("data-key")) {
                    let tempKey = find_object[active.getAttribute("data-key")];
                    find_key = tempKey ? tempKey : find_key;
                }
                jsondata["find"] = {
                    "client": {
                        $exists: true
                    },
                    "pubkitres": {
                        "$exists": false
                    },
                    [find_key]: {
                        $regex: show_input_1.value == "" ? "null" : show_input_1.value,
                        $options: 'i'
                    }
                };
                jsondata["filter"] = [""];
                END_POINT = (API_PATH + "getdocstatus");
                setTimeout((data, endpoint, report) => {
                    AG_GRID.HIT_API_RETURN(data, endpoint, report);
                }, 950, jsondata, END_POINT, reportModel);
                // package data
                var jsondata1 = {
                    "tbl": "packvalid",
                    "length": 1000,
                    "find": {
                        "packagename": {
                            "$regex": show_input_1.value == "" ? "null" : show_input_1.value,
                            "$options": "i"
                        }
                    },
                    "sort": {},
                    "filter": ["id"]
                };
                commonfn['callajax'](jsondata1, 'VALIDATE_PACKAGE', API_GET_DOCS);
                return jsondata;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('HISTORY_DATA_FETCH_QUERY', err.message);
            }
        },
        InitLoop: function (self) {
            self = MODULE_GRID_HD;
            try {
                for (const [main_key, main_value] of Object.entries(self)) {
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
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('module_grid_InitLoop', err.message);
            }
        }
    };
    (function () {
        MODULE_GRID_HD.InitLoop();
    })();
});