var MODULE_GRID_SFD = {};

// Function to get the start of the day in milliseconds
function getStartOfDay(date, Options = {}) {
    let {
        iso
    } = Options;
    let startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay[iso ? 'toISOString' : 'getTime']();
}

// Function to get the end of the day in milliseconds
function getEndOfDay(date, Options = {}) {
    let {
        iso
    } = Options;
    let endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay[iso ? 'toISOString' : 'getTime']();
}

function updateDateRange(e) {
    const select = document.getElementById('date-range');
    const customRangeDiv = document.getElementById('custom-range');
    const customDateDiv = document.getElementById('custom-date');

    const today = new Date();
    let startDate, endDate;
    if (/custom-date|custom-range/gi.test(select.value)) {
        if (select.value === 'custom-range') {
            customRangeDiv.classList.remove("d-none");
            customDateDiv.classList.add("d-none");
            SET_MIN_MAX_DATE('start-date,end-date');
            return;
        } else if (select.value === 'custom-date') {
            customRangeDiv.classList.add("d-none");
            customDateDiv.classList.remove("d-none");
            return;
        }
    } else {
        if (select.value === 'today') {
            startDate = today;
            endDate = today;
        } else if (select.value === 'yesterday') {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 1);
            endDate = new Date(startDate);
        } else if (select.value === 'last-month') {
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        } else if (select.value === 'this-month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today);
        } else if (select.value === 'last-3-months') {
            startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            endDate = new Date(today);
        }
        customRangeDiv.classList.add("d-none");
        customDateDiv.classList.add("d-none");
        MODULE_GRID_SFD.SEARCH_BY_DATE_FETCH_QUERY({
            startTime: getStartOfDay(startDate),
            endTime: getEndOfDay(endDate),
            target: select
        });
    }

    if (select.value !== 'custom-range' && select.value !== 'custom-date') {
        console.log(`Start Date: ${startDate.toLocaleDateString()}<br>End Date: ${endDate.toLocaleDateString()}`);
    }

}
document.addEventListener('DOMContentLoaded', function(event) {
    MODULE_GRID_SFD = {
        GRID_OPTION: {
            "DEFAULT_columnDefs": {},
            "DEFAULT_FILED": {},
            "DEFAULT_ORDER": {
                "SEARCH_BY_DATE": {
                    columnDefs_order: ["client", "identifier", "role", "signouttime", "signouttime_iso", "username", "docid"],
                    columnDefs_order_remove: [],
                    GRID_ADD_OPTIONS: {
                        paginationPageSize: 100,
                        paginationAutoPageSize: false,
                        suppressPaginationPanel: false,
                        suppressScrollOnNewData: true
                    }
                }
            },
            "SEARCH_BY_DATE": {
                columnDefs: [{
                        headerName: "Finalize Time",
                        field: "signouttime",
                        filter: 'agDateColumnFilter',
                        filterParams: filterParams,
                        comparator: TimeComparator,
                        sort: 'desc',
                        valueGetter: (params) => AG_GRID.GET_TIME_C(params, {
                            key: "signouttime"
                        })
                    },
                    {
                        field: "signouttime_iso",
                        headerName: 'ISO TIME',
                        resizable: true,
                        valueGetter: (params) => {
                            try {
                                if (!params.data || !params.data.signouttime_iso || !params.data.signouttime_iso.$date) return "";
                                return new Date(params.data.signouttime_iso.$date).toISOString();
                            } catch (err) {

                            }
                        }
                    },
                    {
                        field: "docid",
                        headerName: 'DOC ID',
                        resizable: true,
                        hide: true
                    }
                ]
            }
        },
        TIME_FORMAT: {
            SEARCH_BY_DATE: "h:mm:ss a"
        },
        SUB_HEAD: {
            SEARCH_BY_DATE: " Search Finalized Links"
        },
        DE_ACT_RES: function(response, self, current) {
            self = this;
            current = MODULE_GRID_SFD;
            try {
                console.log(JSON.stringify(response));
                AG_GRID.ShowLoadingIcon("hideOverlay");
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('DE_ACT_RES', err.message);
            }
        },
        SEARCH_BY_DATE_FETCH_QUERY: function(e = {}, jsondata = {}, reportModel, self, current) {
            self = this;
            reportModel = 'SEARCH_BY_DATE';
            current = MODULE_GRID_SFD;
            try {
                if (e.target && /button|input|select/gi.test(e.target.tagName)) {

                } else {
                    // document.getElementById('fetch_db_btn_1').onclick = self.SEARCH_BY_DATE_FETCH_QUERY
                    // document.getElementById('single-date').onchange = self.SEARCH_BY_DATE_FETCH_QUERY
                    return debug.log("click btn");
                }
                const chosenDate = document.getElementById('single-date').value;
                const startDate = new Date(chosenDate);
                const endDate = new Date(chosenDate);
                // startDate.setHours(0, 0, 0, 0);
                // endDate.setHours(23, 59, 59, 999);
                var startTime = getStartOfDay(startDate, {
                    iso: true
                });
                var endTime = getEndOfDay(endDate, {
                    iso: true
                });
                if (e.startTime && e.endTime) {
                    startTime = e.startTime;
                    endTime = e.endTime;
                }
                console.log(chosenDate, startDate, endDate);
                jsondata = {
                    "tbl": "Shareandinvite"
                };
                jsondata.length = 5000;
                jsondata["find"] = {
                    "identifier": {
                        "$exists": true
                    },
                    "status": {
                        $eq: "signoff"
                    },
                    "role": {
                        $ne: "5bcf15b1cf510152afba028a"
                    },
                    "signouttime": {
                        $gte: startTime,
                        $lt: endTime
                    }
                };
                jsondata["sort"] = {
                    'signouttime': -1
                };
                jsondata["filter"] = [];
                AG_GRID.HIT_API_RETURN(jsondata, API_GET_DOCS, reportModel);
                return jsondata;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('FETCH_QUERY_JSON', err.message);
            }
        },
        ShowLoop: function(InputDate, self) {
            self = MODULE_GRID_SFD;
            try {

                // Select all date input elements
                const dateElements = document.querySelectorAll('#start-date, #end-date, #single-date');

                // Add an event listener for the 'change' event to each date input
                dateElements.forEach((element) => {
                    var target = typeof element == "string" ? document.getElementById(element) : element;
                    target.onchange = self.SEARCH_BY_DATE_FETCH_QUERY;
                    SET_MIN_MAX_DATE(target);
                    // element.addEventListener('change', (e) => {
                    //     const startDate = document.getElementById('start-date').value;
                    //     const endDate = document.getElementById('end-date').value;
                    //     const singleDate = document.getElementById('single-date').value;
                    //     const target = e.currentTarget;

                    //     // Your logic here (e.g., check if both start date and end date are selected)
                    //     if (startDate && endDate) {
                    //         // Do something with the selected dates
                    //         console.log('Start date:', startDate);
                    //         console.log('End date:', endDate);
                    //     }
                    // });
                });

            } catch (err) {

            }
        },
        InitLoop: function(self) {
            self = MODULE_GRID_SFD;
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
        MODULE_GRID_SFD.InitLoop();
    })();

});