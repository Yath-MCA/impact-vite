var USER_CLIENT = localStorage.getItem('xmleditor:login_client_list');
var LINK_INFO = IS_LIVE_DOMAIN ? ({
    "$eq": "pubkit"
}) : (IS_ADMIN ? {
    "$eq": "pubkit"
} : {
    "$ne": "pubkit"
});
if (IS_BOOKS_USER) {
    if (/TNF/gi.test(WF_CLIENT_LIST)) LINK_INFO.$eq = "pubkittnf";
};
var visibleConfiguration = {
    "show_input_1": {
        show: ["#myGrid", '#filter_btn_div', "#fetch_db_btn_1", ".text-input"],
        hide: ["#config_show", '.config-form', '.crud-mainten', "#date-input-div", "#add_journal", "#custom-date", "#custom-range", "#filterForm"]
    },
    "dateInput": {
        show: ["#myGrid", '#filter_btn_div', "#date-input-div"],
        hide: ["#config_show", '.config-form', '.crud-mainten', "#fetch_db_btn_1", '.text-input', "#add_journal", "#custom-date", "#custom-range", "#filterForm"]
    },


    "ACTIVE_SESSION": {
        show: [''],
        hide: ["#filterForm"],
    },
    "COMPARE_REPORT": {
        show: [''],
        hide: ["#filterForm"]
    },
    "XML_FAIL": {
        show: [''],
        hide: ["#filterForm"]
    },
    "USER_MODIFY_COUNT": {
        show: ['.config-form', '#correction-report-type'],
        hide: ['#filterForm']
    },
    "HISTORY_DATA": {
        show: [''],
        hide: ["#filterForm"]
    },
    "ACTIVITY_DATA": {
        show: [''],
        hide: ["#filterForm"]
    },
    "DEACTIVATE_LINK": {
        show: [''],
        hide: ["#filterForm"]
    },
    "SEARCH_BY_DATE": {
        show: [''],
        hide: ['#filterForm'],
    },
    "SEARCH_QUERY": {
        show: ['#filterForm'],
        hide: ['#filter_bth_group'],
    },
    "PT_FINALIZE": {
        show: [''],
        hide: ['#filterForm'],
    },
    "FAIL_LIST": {
        show: ["#myGrid", '#filter_btn_div', "#date-input-div"],
        hide: ["#filterForm"]
    },
    "PUBKIT_STATUS": {
        show: [''],
        hide: ['#filterForm'],
    },
    "CHANGE_EMAIL": {
        show: [''],
        hide: ['#filterForm'],
    },
    "ADMIN_ACCESS": {
        show: [''],
        hide: ['#filterForm'],
    },
    "CRUD_MAINTEN": {
        show: ["#myGrid", '#filter_btn_div', "#date-input-div", '.crud-mainten'],
        hide: ['#fetch_db_btn_1', ".text-input", "#filterForm"],
    },
    "config_input": {
        show: ["#config_show", '.config-form'],
        hide: ["#myGrid", '#filter_btn_div', '.crud-mainten', "#fetch_db_btn_1", '.text-input', "#add_journal", "#custom-date", "#custom-range", "#date-input-div", "#filterForm"]
    },
    "client": {
        show: ['.config_data_shown'],
        hide: ['#filterForm', '.add_new_conf_item', '.pattern_report'],
    },
    "journal": {
        show: ["#add_journal", '.config_data_shown'],
        hide: ['#filterForm', '.add_new_conf_item', '.pattern_report'],
    },
    "generate_new": {
        show: [".add_new_conf_item"],
        hide: ['#fetch_db_btn_1', ".text-input", "#filterForm", ".config_data_shown", '.pattern_report'],
    },
    "pattern_data_report": {
        show: [".pattern_report"],
        hide: ['#fetch_db_btn_1', ".text-input", "#filterForm", ".config_data_shown", ".add_new_conf_item"],
    },
    "show_search_1": {
        show: [""],
        hide: ['#filter_bth_group', "#filterForm"],
    },
};
document.addEventListener('DOMContentLoaded', function (event) {
    try {
        if (document.referrer == "" || document.referrer == window.location.href) {
            if (!IS_LOCAL_HOST) {
                window.location.href = "login.html";
            }
        }
        AG_GRID.CONFIGS = {};

        if (IS_ADMIN) {
            $(`[data-fetch="CRUD_MAINTEN"]`).removeClass("d-none");
        }

        setTimeout(function () {
            $("#loader-wrapper").css("visibility", "hidden");
            $("#loader").css("opacity", "0");
            AG_GRID.FIRE_ONCE("DASH_BOARD", []);
            $("#menu-toggle").click(function (e) {
                e.preventDefault();
                $("#wrapper").toggleClass("toggled");
            });
            $('.list-sub-group-div')
                .on('hide.bs.collapse', function (e) {
                    expand_collapse(e);
                })
                .on('show.bs.collapse', function (e) {
                    expand_collapse(e);
                });

        }, 2500);

        $(document).ready(function () {
            const dateElements = document.querySelectorAll('#start-date,#end-date,#single-date');
            dateElements.forEach((el) => {
                var target = typeof el == "string" ? document.getElementById(el) : el;
                SET_MIN_MAX_DATE(target, {
                    start: /start/gi.test(target.id)
                });
                target.onchange = updateDateRange;
            });
            $("a.list-group-item-action").click(function (e) {
                try {
                    handle_active_list(this);
                    var reportValue = this.getAttribute("data-report");
                    var reportModule = this.getAttribute("data-fetch");
                    if (reportModule == "SEARCH_QUERY") {
                        AG_GRID['loadTemplate'](e);
                    } else if (reportModule) {
                        var concat_fun = reportModule.concat('_', 'FETCH_QUERY');
                        if (concat_fun && AG_GRID[concat_fun]) {
                            AG_GRID[concat_fun](e);
                        }
                    } else if (reportValue) {
                        if (/COMPARE_REPORT|ACTIVE_SESSION|XML_FAIL|SIGN_OFF_REPORT|ADMIN_ACCESS/gi.test(reportValue)) {
                            AG_GRID.FETCH_QUERY(reportValue, {});
                        } else if (/USER_MODIFY_COUNT/gi.test(reportValue)) {
                            AG_GRID.SWIFT_REPORT(reportValue, {});
                        }
                    }
                } catch (err) {
                    console.warn(err.message);
                }
            });
            $(".list-sub-group[data-toggle='collapse']").click(function (e) {
                try {
                    if (this.nextElementSibling) {
                        let entry = this.nextElementSibling;
                        if (entry)
                            handle_active_list(entry);
                    }
                } catch (err) {
                    console.warn(err.message);
                }
            });
            $("#fetch_db_btn_1").click(function (e) {
                try {
                    AG_GRID.ShowLoadingIcon("ShowLoading");
                    var target = document.querySelector(".collapse.show .active");
                    var reportModule = target ? target.getAttribute(target.hasAttribute("data-fetch") ? "data-fetch" : "data-report") : null;
                    if (!target || !reportModule) {
                        AG_GRID.CURRENT_GRID_OPTION.api.setRowData([]);
                        AG_GRID.ShowLoadingIcon("hideOverlay");
                        return false;
                    }
                    var concat_fun = reportModule.concat('_', 'FETCH_QUERY');
                    if (AG_GRID[concat_fun]) {
                        AG_GRID[concat_fun](e);
                    } else {
                        AG_GRID.FETCH_QUERY(reportModule, {});
                    }
                } catch (err) {
                    console.warn(err.message);
                }
            });
            $("#add_journal").click(function (e) {
                try {
                    AG_GRID.ShowLoadingIcon("ShowLoading");
                    var sel_client = document.getElementById("config_client");
                    if (sel_client && Render_Config) {
                        Render_Config.add_journal(sel_client.value);
                    }
                } catch (err) {
                    console.warn(err.message);
                }
            });
            $("#add_mainten").click(async function (e) {
                try {
                    showMaintenanceForm();
                } catch (err) {
                    console.warn("Error scheduling maintenance:", err.message);
                }
            });

            $('#config_client,#config_journal,#corr_report_type').on('change', function (e) {
                var current = document.querySelector("a.list-group-item.active");
                var report = current.getAttribute("data-fetch");
                var IsClientEvt = e.currentTarget.id == "config_client";
                var IsJournalEvt = e.currentTarget.id == "config_journal";
                var isCorrReportEvt = e.currentTarget.id == "corr_report_type";
                if (/USER_MODIFY_COUNT/gi.test(report)) {
                    if (IsClientEvt || isCorrReportEvt) MODULE_GRID_UMC.USER_MODIFY_COUNT_FETCH_QUERY(e);
                } else if (/journal|client/gi.test(report)) {
                    if (IsClientEvt) Render_Config.client_change(e);
                    if (IsJournalEvt) Render_Config.journal_change(e);
                }
            });

        });
    } catch (err) {
        console.warn(err.message);
    }
});

// Function to get the start of the day in milliseconds
function getStartOfDay(date) {
    let startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay.getTime();
}

// Function to get the end of the day in milliseconds
function getEndOfDay(date) {
    let endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime();
}

function updateDateRange(e) {
    var _target = document.getElementById('date-range');
    const customRangeDiv = document.getElementById('custom-range');
    const customDateDiv = document.getElementById('custom-date');
    const today = new Date();
    const isDateEvt = /start-date|end-date|single-date/gi.test(this.id);
    let startDate, endDate;
    var current = document.querySelector("a.list-group-item.active");
    var report = current.getAttribute("data-fetch");
    if (/custom-date|custom-range/gi.test(_target.value) && !isDateEvt) {
        let isCustomR = _target.value === 'custom-range';
        customRangeDiv.classList[isCustomR ? 'remove' : 'add']("d-none");
        customDateDiv.classList[isCustomR ? 'add' : 'remove']("d-none");
        return;
        // if (select.value === 'custom-range') {
        //     customRangeDiv.classList.remove("d-none");
        //     customDateDiv.classList.add("d-none");
        //     // SET_MIN_MAX_DATE('start-date,end-date');
        //     return;
        // } else if (select.value === 'single-date') {
        //     customRangeDiv.classList.add("d-none");
        //     customDateDiv.classList.remove("d-none");
        //     return;
        // }
    } else {
        if (isDateEvt) {
            if (/start-date|end-date/gi.test(this.id)) {
                startDate = document.getElementById('start-date').value;
                endDate = document.getElementById('end-date').value;
            } else if (this.id === "single-date") {
                startDate = this.value;
                endDate = this.value;
            }
            _target = this;
        } else {
            if (_target.value === 'today') {
                startDate = today;
                endDate = today;
            } else if (_target.value === 'yesterday') {
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 1);
                endDate = new Date(startDate);
            } else if (_target.value === 'last-month') {
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            } else if (_target.value === 'this-month') {
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today);
            } else if (_target.value === 'last-3-months') {
                startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                endDate = new Date(today);
            }
            customRangeDiv.classList.add("d-none");
            customDateDiv.classList.add("d-none");
        }
        var params = {
            startTime: getStartOfDay(startDate),
            endTime: getEndOfDay(endDate),
            target: _target,
            startDate: startDate,
            endDate: endDate
        };
        if (/SEARCH_BY_DATE/gi.test(report)) {
            MODULE_GRID_SFD.SEARCH_BY_DATE_FETCH_QUERY(params);
        } else if (/FAIL_LIST/gi.test(report) && MODULE_GRID_SAVE_FAIL_LIST && MODULE_GRID_SAVE_FAIL_LIST.FAIL_LIST_FETCH_QUERY) {
            MODULE_GRID_SAVE_FAIL_LIST.FAIL_LIST_FETCH_QUERY(params);
        } else if (/USER_MODIFY_COUNT/gi.test(report)) {
            MODULE_GRID_UMC.USER_MODIFY_COUNT_FETCH_QUERY(params);
        }
    }
    if (_target.value !== 'custom-range' && _target.value !== 'single-date') {
        if (typeof startDate.toLocaleDateString == "function") startDate = startDate.toLocaleDateString();
        if (typeof endDate.toLocaleDateString == "function") endDate = endDate.toLocaleDateString();
        console.log(`Start Date: ${startDate}<br>End Date: ${endDate}`);
    }
}

function remove_active(_id) {
    try {
        document.querySelectorAll(".list-group .active").forEach(items => {
            if (_id && items.id == _id) return;
            items.classList.remove("active");
        });
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('remove_active', err.message);
    }
}

function expand_collapse(e) {
    try {
        let target = e.target,
            icon_div = target.closest(".list-group").querySelector(`[href$="${target.id}"]`);
        icon_div.querySelector(".fa").className = e.type == "hide" ? "fa fa-plus" : "fa fa-minus";
        if (e.type != "hide") {
            var current_target = target.querySelector("[data-report],[data-fetch]"),
                reportModule = current_target ? current_target.getAttribute(current_target.hasAttribute("data-fetch") ? "data-fetch" : "data-report") : null,
                subHead = document.getElementById("_subhead"),
                value = AG_GRID.SUB_HEAD[reportModule] ? AG_GRID.SUB_HEAD[reportModule] : "Dashboard";
            if (subHead) subHead.textContent = value;
        }
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('expand_collapse', err.message);
    }
}

function handle_active_list(target) {
    try {
        if (/a|div/gi.test(target.tagName)) {
            remove_active();
            if (target.hasAttribute("data-show")) {
                if (target.querySelector("a")) target.querySelector("a").classList.add("active");
            } else target.classList.add("active");
        }
        var showInput = target.getAttribute("data-show"),
            fetchData = target.getAttribute("data-fetch"),
            value = null,
            newMethod = true;
        if (showInput) value = showInput;
        else if (fetchData) value = fetchData;
        if (newMethod) {
            let config = visibleConfiguration[value];
            if (config) {
                // Loop through the configuration object
                for (var action in config) {
                    if (config.hasOwnProperty(action)) {
                        // Loop through each selector in the current action array (show/hide)
                        config[action].forEach(function (selector) {
                            if (selector) {
                                var element = document.querySelector(selector);
                                if (element) {
                                    let updateClass = /filter_btn_div/gi.test(element.id) ? "invisible" : "d-none";
                                    element.classList[action === 'show' ? "remove" : "add"](updateClass);
                                }
                            }
                        });
                    }
                }
                if (/dateInput/gi.test(value)) {

                } else if (/config|USER_MODIFY_COUNT/gi.test(value)) {
                    var sel_client = document.getElementById("config_client"),
                        sel_journal = document.getElementById("config_journal");
                    if (sel_client.querySelectorAll("option").length == 0) {
                        $(sel_client, sel_journal).append(`<option selected value="null">Choose</option>`);
                        if (!!USER_CLIENT) {
                            let split = USER_CLIENT.split(',');
                            if (split.length > 1) {
                                split.forEach((client) => {
                                    $(sel_client).append($("<option class='config' />").val(client.toString().toLocaleLowerCase()).html(client.toString().toUpperCase()));
                                });
                            }
                            document.querySelectorAll("option.config").forEach(opt => {
                                Render_Config.fetch_config(opt.value);
                            });
                        }
                    }
                } else if (/generate_new|pattern_data_report/gi.test(value)) {
                    var fetchPageMap = {
                        "generate_new": {
                            "page": "config_generator.html",
                            "append": ".add_new_conf_item"
                        },
                        "pattern_data_report": {
                            "page": "pattern_report.html",
                            "append": ".pattern_report"
                        }
                    };

                    const config = fetchPageMap[value];
                    const pageUrl = config.page;
                    const appendSelector = config.append;

                    // ⛔ If append selector missing, block
                    if (!appendSelector || appendSelector.trim() === "") {
                        console.warn("No appendSelector. Skipping.");
                        return;
                    }

                    const $target = $(appendSelector);

                    // ⛔ If selector does not exist, block
                    if ($target.length === 0) {
                        console.warn("Append selector not found:", appendSelector);
                        return;
                    }

                    // ⛔ Prevent duplicate fetch — if div already has content, STOP here
                    if ($target.children().length > 0 || $target.text().trim().length > 0) {
                        console.log("Content already loaded. Skipping AJAX fetch.");

                        // Still hide loader if present
                        if (typeof loader !== 'undefined') {
                            $(loader).addClass('d-none');
                        }

                        return;
                    }

                    // If target is empty → go fetch
                    $.ajax({
                        url: pageUrl,
                        method: 'GET',
                        dataType: 'html',
                        success: function (html) {

                            // Append ONLY ONCE
                            $target.append(html);

                            if (typeof loader !== 'undefined') {
                                $(loader).addClass('d-none');
                            }
                        },
                        error: function (err) {
                            console.error('Error loading:', err);
                            if (typeof loader !== 'undefined') {
                                $(loader).addClass('d-none');
                            }
                            alert('Failed to load page.');
                        }
                    });



                }
            }
        } else {
            /* 
            var show_operation_tab = document.querySelector('.filter_fn_bth'),
                operation_date_span = document.querySelector('#date-input-div'),
                fetchBtn = document.getElementById('fetch_db_btn_1'),
                InputBox = document.querySelector('#show_input_1'),
                SingleDate = document.querySelector('#single-date'),
                grid_dev = document.getElementById("myGrid"),
                config_div = document.getElementById("config_show"),
                right_header = document.querySelector(".config-form"),
                IS_COUNT_REPORT = /USER_MODIFY_COUNT/gi.test(fetchData);
 
            if (showInput) value = showInput.getAttribute("data-show");
            if (/config/gi.test(value) || IS_COUNT_REPORT) {
                if (!IS_COUNT_REPORT) {
                    grid_dev.classList.add("d-none");
                    config_div.classList.remove("d-none");
                }
                right_header.classList.remove("d-none");
 
                var sel_client = document.getElementById("config_client"),
                    sel_journal = document.getElementById("config_journal");
                if (sel_client.querySelectorAll("option").length == 0) {
                    $(sel_client, sel_journal).append(`<option selected value="null">Choose</option>`);
                    if (!!USER_CLIENT) {
                        let split = USER_CLIENT.split(',');
                        if (split.length > 1) {
                            split.forEach((client) => {
                                $(sel_client).append($("<option class='config' />").val(client.toString().toLocaleLowerCase()).html(client.toString().toUpperCase()));
                            });
                        }
                        document.querySelectorAll("option.config").forEach(opt => {
                            Render_Config.fetch_config(opt.value);
                        });
                    }
                } else {
                    if (IS_COUNT_REPORT) {
 
                    } else if (Render_Config && !IS_COUNT_REPORT) {
                        if (/journal/gi.test(fetchData)) {
                            if (sel_client.value != "null") Render_Config.journal_append(sel_client.value);
                        } else {
                            Render_Config.client_change(sel_client.value);
                            sel_journal.setAttribute("disabled", "");
                        }
                    }
                }
                show_operation_tab.classList.remove("visible");
                show_operation_tab.classList.add("invisible");
                fetchBtn.classList.remove("d-none");
                operation_date_span.classList.add("d-none");
            }
            if (/dateInput|show_input_1/gi.test(value)) {
                grid_dev.classList.remove("d-none");
                config_div.classList.add("d-none");
 
                show_operation_tab.classList.add("visible");
                show_operation_tab.classList.remove("invisible");
                if (/dateInput/gi.test(value)) {
                    if (IS_COUNT_REPORT) {
 
                    } else {
                        right_header.classList.add("d-none");
                        SingleDate.classList.remove("d-none");
                    }
                    operation_date_span.classList.remove("d-none");
                    InputBox.classList.add("d-none")
                    fetchBtn.classList.add("d-none");
                    const dateElements = document.querySelectorAll('#start-date, #end-date, #single-date');
                    dateElements.forEach((el) => {
                        var target = typeof el == "string" ? document.getElementById(el) : el;
                        SET_MIN_MAX_DATE(target, {
                            start: /start/gi.test(el.id)
                        });
                        if (/SEARCH_BY_DATE/gi.test(fetchData)) {
                            target.onchange = MODULE_GRID_SFD.SEARCH_BY_DATE_FETCH_QUERY;
                        }
                    });
                } else {
                    InputBox.classList.remove("d-none");
                    fetchBtn.classList.remove("d-none");
                    SingleDate.classList.add("d-none");
                    operation_date_span.classList.add("d-none");
                }
            } 
                */
        }
        if (IS_LOCAL_HOST)
            document.querySelector('#show_input_1').value = "zsad062,eoae009";
    } catch (err) {
        console.warn(err.message);
        ErrorLogTrace('handle_active_list', err.message);
    }
}

function SET_MIN_MAX_DATE(DateInput, Options = {}) {
    try {
        DateInput = typeof DateInput == "string" ? DateInput.split(",") : [DateInput];
        DateInput.forEach(element => {
            if (typeof element == "string") element = document.getElementById(element);
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            // Format the current date as YYYY-MM-DD
            const todayFormatted = `${yyyy}-${mm}-${Options.start ? '01' : dd}`;
            // Set current date as default value
            element.value = todayFormatted;
            // Set minimum and maximum dates
            // January 1st of the current year
            element.min = `${yyyy - 1}-01-01`;
            // December 31st of the current year
            element.max = `${yyyy}-12-31`;
        });
    } catch (error) {

    }
}