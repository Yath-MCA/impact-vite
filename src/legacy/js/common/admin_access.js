var MODULE_GRID_ADMIN = {};
var MODULE_GRID_PUBKIT_STATUS = {};
var MODULE_GRID_PUBKIT_FINAL = {};
var MODULE_GRID_SAVE_FAIL_LIST = {};


// Config-based SweetAlert factory function

async function showSweetAlert(config) {
    try {
        const result = await Swal.fire({
            title: config.title,
            html: config.html,
            showCancelButton: true,
            confirmButtonText: config.confirmText || 'Confirm',
            cancelButtonText: config.cancelText || 'Cancel',
            preConfirm: config.preConfirm || (() => true)
        });

        if (result.isConfirmed && config.onConfirm) {
            await config.onConfirm(result.value);
        }

        return result;
    } catch (error) {
        console.warn(error.message);
        return { isConfirmed: false };
    }
}

// Status change handler
async function handleChangeStatus(rowData) {
    const currentStatus = rowData.status;
    const statusOptions = ['active', 'signoff', 'deactive'].filter(status => status !== currentStatus);

    const radioInputs = statusOptions.map(status =>
        `<div class="form-check">
            <input class="form-check-input" type="radio" name="statusRadio" id="status-${status}" value="${status}">
            <label class="form-check-label" for="status-${status}">
                ${status.charAt(0).toUpperCase() + status.slice(1)}
            </label>
        </div>`
    ).join('');

    await showSweetAlert({
        title: 'Change Status',
        html: `
            <div class="mb-3">
                <p>Current status: <strong>${currentStatus}</strong></p>
                <p>Select new status:</p>
                ${radioInputs}
            </div>
            <div class="mb-3">
                <label for="reason-textarea" class="form-label">Enter your EMP ID and Reason:</label>
                <textarea id="reason-textarea" class="form-control" rows="3" placeholder="Type your reason here..."></textarea>
            </div>
        `,
        confirmText: 'Change Status',
        preConfirm: () => {
            const selectedStatus = document.querySelector('input[name="statusRadio"]:checked')?.value;
            const reason = document.getElementById('reason-textarea').value;

            if (!selectedStatus) {
                Swal.showValidationMessage('Please select a status');
                return false;
            }

            if (!reason) {
                Swal.showValidationMessage('You need to write a reason!');
                return false;
            }

            return { selectedStatus, reason };
        },
        onConfirm: (value) => {
            const { selectedStatus, reason } = value;
            MODULE_GRID_ADMIN.SINGLE_API_HIT(rowData, {
                canReactive: selectedStatus === 'active',
                reason: reason,
                newStatus: selectedStatus,
                currentStatus
            });
        }
    });
}
// Add event listeners to toggle between forms
$(document).on('change', 'input[name="emailAction"]', function () {
    const addEmailForm = $('#add-email-form');
    const changeEmailForm = $('#change-email-form');

    if ($(this).val() === 'add') {
        addEmailForm.show();
        changeEmailForm.hide();
    } else {
        addEmailForm.hide();
        changeEmailForm.show();
    }
});
// Email edit handler
async function handleEditEmail(rowData) {
    await showSweetAlert({
        title: 'Add / Edit User Email ID',
        html: `
        <div class="mb-3">
            <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" name="emailAction" id="add-email" value="add" checked>
                <label class="form-check-label" for="add-email">Add Email</label>
            </div>
            <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" name="emailAction" id="change-email" value="change">
                <label class="form-check-label" for="change-email">Change Email</label>
            </div>
        </div>
        
        <div id="add-email-form" class="mb-3">
            <label for="email-input" class="form-label">Email address:</label>
            <input type="email" class="form-control" id="email-input" value="${rowData.email || ''}" placeholder="user@example.com">
        </div>
        
        <div id="change-email-form" class="mb-3" style="display: none;">
            <label for="old-email-select" class="swal2-label mb-2">Select Old Email below</label>
            <select id="old-email-select" class="form-select mb-3" style="width:100%">
                <option disabled selected value>Select an existing user email</option>
                ${rowData.emailto ? Object.entries(rowData.emailto || {}).map(([key, value]) =>
            `<option value="${value}">${value}</option>`
        ).join('') : ''}
            </select>
            
            <label for="new-email-input" class="swal2-label mb-2">Enter New Email Address</label>
            <input id="new-email-input" class="form-control" placeholder="Enter new email address..." type="email">
        </div>
    `,
        confirmText: 'Save Email',
        preConfirm: () => {
            const action = document.querySelector('input[name="emailAction"]:checked').value;

            if (action === 'add') {
                const email = document.getElementById('email-input').value;

                if (!email) {
                    Swal.showValidationMessage('Please enter an email address');
                    return false;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    Swal.showValidationMessage('Please enter a valid email address');
                    return false;
                }

                return { action, newEmail };
            } else {
                const oldEmail = document.getElementById('old-email-select').value;
                const newEmail = document.getElementById('new-email-input').value;

                if (!oldEmail || oldEmail === 'Select an existing user email') {
                    Swal.showValidationMessage('Please select an existing email');
                    return false;
                }

                if (!newEmail) {
                    Swal.showValidationMessage('Please enter a new email address');
                    return false;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(newEmail)) {
                    Swal.showValidationMessage('Please enter a valid email address');
                    return false;
                }

                return { action, oldEmail, newEmail };
            }
        },
        onConfirm: (value) => {

            // Construct the update object
            var multipleUsers = rowData.username.split(',');
            var { newEmail, oldEmail, action } = value;
            var eMailArr = [], updatedEmail = "";
            var index = multipleUsers.indexOf(oldEmail);

            if (action == "change") {
                if (multipleUsers.length > 1) {
                    multipleUsers[index] = newEmail;
                    updatedEmail = eMailArr.join(',');
                } else {
                    updatedEmail = newEmail;
                    eMailArr = [newEmail];
                }
            } else if (action == "add") {

            }

            commonfn.console_update_mail_result = function (response, rowData) {
                console.log("API Response:", response);
                if (rowData && response.r == 1) {
                    Swal.fire({
                        title: 'Success!',
                        text: 'Email has been successfully updated.',
                        icon: 'success',
                        confirmButtonText: 'OK'
                    });
                }
            };

            // Call the backend API
            commonfn.callajax(
                {
                    "tbl": "Shareandinvite",
                    "find": {
                        "id": rowData.id,
                        "status": "active"
                    },
                    "length": 1,
                    "update": {
                        "emailtolist": updatedEmail,
                        "username": updatedEmail,
                        "emailto": eMailArr,
                        "oldemail": oldEmail
                    }
                },
                'console_update_mail_result',
                API_FIND_UPDATE_INSERT,
                rowData
            );
        }
    });



}

// Temporary access handler
async function handleTempAccess(rowData) {
    await showSweetAlert({
        title: 'Select Temporary Access Duration',
        html: `
            <div class="mb-3">
                <select id="temp-access-duration" class="form-select">
                    <option value="300000">5 mintues</option>
                    <option value="21600000">6 hours</option>
                    <option value="43200000">12 hours</option>
                    <option value="86400000">1 day</option>
                    <option value="259200000">3 days</option>
                    <option value="Infinity">Infinity</option>
                </select>
            </div>
            <div class="mb-3">
                <label for="reason-textarea" class="form-label">Enter your EMP ID and Reason:</label>
                <textarea id="reason-textarea" class="form-control" rows="3" placeholder="Type your reason here..."></textarea>
            </div>
        `,
        confirmText: 'Grant Access',
        preConfirm: () => {
            const select = document.getElementById('temp-access-duration');
            const reason = document.getElementById('reason-textarea').value;

            if (!reason) {
                Swal.showValidationMessage('You need to write a reason!');
                return false;
            }

            return {
                value: select.value,
                text: select.options[select.selectedIndex].text,
                reason: reason
            };
        },
        onConfirm: (result) => {
            const current_time = new Date().getTime();

            // Construct the update object
            const updateData = {
                expiry: result.value === "Infinity" ? result.value : current_time + parseInt(result.value),
                create_at: current_time,
                creater_mail: USER_MAIL || "",
                reason: result.reason
            };

            // Call the backend API
            commonfn.callajax(
                {
                    "tbl": "Shareandinvite",
                    "find": { "id": rowData.id },
                    "length": 1,
                    "update": { "temporaryAccess": updateData }
                },
                'console_open_access_result',
                API_FIND_UPDATE_INSERT,
                rowData
            );
        }
    });
}

// Define a console recording function to log the response
commonfn.console_open_access_result = function (response, rowData) {
    console.log("API Response:", response);
    if (rowData && response.r == 1) {
        console.log("Updated Document Data:", rowData);
        let page = webPage[rowData.client] ? webPage[rowData.client] : webPage['default'];
        var openUrl = "";

        if (rowData.currenturl && rowData.key) {
            openUrl = `${rowData.currenturl + page}.html?key=${rowData.key}`;
        }
        // var timer = new Date(parseInt(rowData.temporaryAccess.expiry))        ;

        // Show success message with a button to open the URL
        Swal.fire({
            title: 'Access Granted!',
            text: `Temporary access has been granted.`,
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: 'Open Link',
            cancelButtonText: 'Close'
        }).then((result) => {
            if (result.isConfirmed && openUrl) {
                window.open(openUrl, '_blank');
            }
        });

    }
};



document.addEventListener('DOMContentLoaded', function (event) {

    MODULE_GRID_ADMIN = {
        GRID_OPTION: {
            "DEFAULT_columnDefs": {},
            "DEFAULT_FILED": {},
            "DEFAULT_ORDER": {
                "ADMIN_ACCESS": {
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
            "ADMIN_ACCESS": {
                columnDefs: [{
                    headerName: "Role Name",
                    field: "rolename"
                },
                {
                    headerName: "Take Action",
                    field: "take_action",
                    valueGetter: (params) => "Click for More Actions"
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
            ADMIN_ACCESS: "DD-MMM-YYYY, h:mm:ss a"
        },
        SUB_HEAD: {
            ADMIN_ACCESS: " Admin Access"
        },
        GET_ACTION_JSON: function (data, Options) {
            try {
                Options = Options ? Options : {
                    newStatus: "active",
                    reason: ""
                };
                return {
                    "tbl": "",
                    "find": {
                        "identifier": data['identifier'],
                        "docid": data['docid'],
                        "status": data.status,
                        "role": data.role
                    },
                    "length": 50,
                    "update": {
                        "status": Options.newStatus,
                        "changestatustime": new Date().getTime(),
                        "changestatusreason": Options.reason || "",
                        "changestatususer": USER_MAIL || ""
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

        SINGLE_API_HIT: function (data, Options = {}, self, reportModel, current) {
            self = this;
            reportModel = 'ADMIN_ACCESS';
            current = MODULE_GRID_ADMIN;
            if (IS_LOCAL_HOST) debugger;
            try {
                AG_GRID.ShowLoadingIcon("ShowLoading");
                // ? https://docs.google.com/document/d/1Berwzk0ikBxPLjKVZ08IxWpTGxj-v65SnO19_dDCHqo/edit
                let JSON_DATA = MODULE_GRID_ADMIN.GET_ACTION_JSON(data, Options),
                    END_API = API_PATH + "findupdatemultiplecollection",
                    SEND_JSON = 'Shareandinvite,Fileslist'.split(",").map(tbl => {
                        let clonedObject = JSON.parse(JSON.stringify(JSON_DATA));
                        clonedObject['tbl'] = tbl;
                        return clonedObject;
                    });

                if (SEND_JSON.length > 0) {
                    commonfn['API_RESPONSE'] = function (response, Options) {
                        try {
                            Swal.fire(
                                'Status Changed!',
                                `Status has been changed from ${Options.currentStatus} to ${Options.newStatus}.`,
                                'success'
                            );
                            document.getElementById('fetch_db_btn_1').click();
                            console.log(JSON.stringify(response));
                        } catch (err) {
                            console.warn(err.message);
                            ErrorLogTrace('API_RESPONSE', err.message);
                        }
                    };

                    commonfn['callajax'](SEND_JSON, 'API_RESPONSE', END_API, Options);
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('CONCURRENT_API_HIT', err.message);
            }
        },
        CONCURRENT_API_HIT: async function (params, Options = {}, self, reportModel, current) {
            self = this;
            reportModel = 'ADMIN_ACCESS';
            current = MODULE_GRID_ADMIN;
            try {
                let JSON_DATA = MODULE_GRID_ADMIN.GET_ACTION_JSON(params, Options);
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
        ADMIN_ACCESS_CELL_DOUBLE_CLICK: async function (params, self, reportModel, current) {
            self = this;
            reportModel = 'ADMIN_ACCESS';
            current = MODULE_GRID_ADMIN;
            try {
                let [IS_ACT, COL_ID] = [params.data.status == 'active', params.event.target.getAttribute('col-id')];
                if (COL_ID == "take_action") {

                    const rect = params.event.target.getBoundingClientRect();
                    var exists = document.getElementById('cell-dropdown-menu');
                    // Create the dropdown menu if it doesn't exist
                    if (!exists || (exists && exists.dataset.client != params.data.client)) {
                        if (exists) $(exists).remove();

                        const dropdownMenu = document.createElement('div');
                        dropdownMenu.id = 'cell-dropdown-menu';
                        dropdownMenu.className = 'dropdown-menu';
                        dropdownMenu.dataset.client = params.data.client;
                        // Build menu items - conditionally add temp-access option
                        let menuHTML = `
                            <a class="dropdown-item" href="#" data-action="change-status">Change Status</a>
                            <a class="dropdown-item" href="#" data-action="edit-email">Add / Edit User Mail Id</a>
                        `;

                        // Only show temp access option for PLOS clients
                        if (params.data.client === "PLOS") {
                            menuHTML += `<a class="dropdown-item" href="#" data-action="temp-access">Temporary Open Access (without access code)</a>`;
                        }

                        dropdownMenu.innerHTML = menuHTML;
                        document.body.appendChild(dropdownMenu);

                        // Add event listeners to dropdown items
                        dropdownMenu.addEventListener('click', function (e) {
                            if (e.target.hasAttribute('data-action')) {
                                const action = e.target.getAttribute('data-action');
                                const rowData = params.node.data;

                                // Handle different actions
                                switch (action) {
                                    case 'change-status':
                                        handleChangeStatus(rowData);
                                        break;
                                    case 'edit-email':
                                        handleEditEmail(rowData);
                                        break;
                                    case 'temp-access':
                                        handleTempAccess(rowData);
                                        break;
                                }

                                // Hide dropdown after selection
                                hideDropdown();
                            }
                            e.stopPropagation();
                        });
                    }

                    // Position and show the dropdown
                    const dropdownMenu = document.getElementById('cell-dropdown-menu');
                    dropdownMenu.style.position = 'absolute';
                    dropdownMenu.style.left = rect.left + 'px';
                    dropdownMenu.style.top = rect.bottom + 'px';
                    dropdownMenu.style.display = 'block';

                    // Hide the dropdown when clicking elsewhere
                    document.addEventListener('click', hideDropdown);

                    function hideDropdown() {
                        dropdownMenu.style.display = 'none';
                        document.removeEventListener('click', hideDropdown);
                    }
                } else if (COL_ID == "identifier") {

                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('ADMIN_ACCESS_CELL_DOUBLE_CLICK', err.message);
            }

        },
        ADMIN_ACCESS_FETCH_QUERY: function (e = {}, jsondata = {}, reportModel, self) {
            self = this;
            reportModel = 'ADMIN_ACCESS';
            try {
                if (/button/gi.test(e.target.tagName)) { } else {
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
        InitLoop: function (self) {
            self = MODULE_GRID_ADMIN;
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

    MODULE_GRID_PUBKIT_STATUS = {
        GRID_OPTION: {
            "DEFAULT_columnDefs": {},
            "DEFAULT_FILED": {},
            "DEFAULT_ORDER": {
                "PUBKIT_STATUS": {
                    columnDefs_order: ["identifier", "docid", "file_name", "urls", "message", "r", "pubkitres", "vendor", "statusCode", "time_c"],
                    columnDefs_order_remove: [],
                    GRID_ADD_OPTIONS: {
                        paginationPageSize: 100,
                        paginationAutoPageSize: false,
                        suppressPaginationPanel: false,
                        suppressScrollOnNewData: true
                    }
                }
            },
            "PUBKIT_STATUS": {
                columnDefs: [
                    {
                        headerName: "Identifier",
                        field: "identifier"
                    },
                    {
                        headerName: "DOCID",
                        field: "docid",
                        hide: true
                    },
                    {
                        headerName: "Project Name",
                        field: "file_name"
                    },
                    {
                        headerName: "URLs",
                        field: "urls",
                        hide: true,
                        valueGetter: (params) => {
                            const urls = params.data.urls;
                            if (Array.isArray(urls) && urls.length > 0) {
                                return urls
                                    // get role from each url
                                    .map(url => url.role)
                                    // remove undefined/null roles
                                    .filter(role => !!role)
                                    .join(", ");
                            }
                            return "";
                        }
                    },
                    {
                        headerName: "IMPACT Response",
                        field: "r",
                        valueGetter: (params) => params.data.r == 1 ? "Success" : "Fail"
                    },
                    {
                        headerName: "PUBKIT Response",
                        field: "pubkitres",
                        valueGetter: ({ data }) => {
                            try {
                                if (data.partner) return "";
                                const parsed = JSON.parse(data.pubkitres);
                                return parsed.message || parsed.error || "";
                            } catch {
                                return "";
                            }
                        }
                    },
                    {
                        headerName: "UNIPRR Response",
                        field: "vendor",
                        valueGetter: ({ data }) => {
                            try {
                                return data.partner ? data.message || "" : "";
                            } catch {
                                return "";
                            }
                        }
                    },
                    {
                        headerName: "Status Code",
                        field: "statusCode"
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
            PUBKIT_STATUS: "DD-MMM-YYYY, h:mm:ss a"
        },
        SUB_HEAD: {
            PUBKIT_STATUS: " Pubkit Status"
        },
        GET_ACTION_JSON: function (data, Options = {}) { },
        SINGLE_API_HIT: function (data, Options = {}, self, reportModel, current) { },
        CONCURRENT_API_HIT: async function (params, Options = {}, self, reportModel, current) { },
        PUBKIT_STATUS_CELL_DOUBLE_CLICK: async function (params, self, reportModel, current) { },
        PUBKIT_STATUS_FETCH_QUERY: function (e = {}, jsondata = {}, reportModel, self) {
            self = this;
            reportModel = 'PUBKIT_STATUS';
            try {
                if (/button/gi.test(e.target.tagName)) { } else {
                    return debug.log("click btn");
                }
                var END_POINT = API_GET_DOCS,
                    jsondata = {
                        "tbl": "pubkitapistatus",
                        "length": 10,
                        "find": {
                            $and: [
                                {
                                    $or: [
                                        {
                                            "identifier": {
                                                $regex: show_input_1.value === "" ? "null" : show_input_1.value,
                                                $options: "i"
                                            }
                                        },
                                        {
                                            "docid": {
                                                $regex: show_input_1.value === "" ? "null" : show_input_1.value,
                                                $options: "i"
                                            }
                                        }
                                    ]
                                },
                                {
                                    "status": { $exists: true }
                                },
                                {
                                    "statusCode": { $exists: true }
                                },
                                {
                                    "urls": { $exists: true }
                                },
                                {
                                    "pubkitres": { $exists: true }
                                }
                            ]
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
        InitLoop: function (self) {
            self = MODULE_GRID_PUBKIT_STATUS;
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

    MODULE_GRID_PUBKIT_FINAL = {
        GRID_OPTION: {
            "DEFAULT_columnDefs": {},
            "DEFAULT_FILED": {},
            "DEFAULT_ORDER": {
                "PT_FINALIZE": {
                    columnDefs_order: ["doi", "rolename", "pubkitresclose", "statusCode", "vendor", "time_c"],
                    columnDefs_order_remove: [],
                    GRID_ADD_OPTIONS: {
                        paginationPageSize: 100,
                        paginationAutoPageSize: false,
                        suppressPaginationPanel: false,
                        suppressScrollOnNewData: true
                    }
                }
            },
            "PT_FINALIZE": {
                columnDefs: [
                    {
                        headerName: "Identifier",
                        field: "doi"
                    },
                    {
                        headerName: "Role Name",
                        field: "rolename",
                        valueGetter: ({ data }) => {
                            const role = data.role;
                            if (!role) return "";
                            if (role.length > 20) {
                                return ROLE_IDS[role]?.name || "";
                            } else {
                                return role;
                            }
                        }
                    },
                    {
                        headerName: "PUBKIT Status",
                        field: "pubkitresclose",
                        valueGetter: ({ data }) => {
                            try {
                                const raw = data.pubkitresclose;
                                if (!raw) return "";
                                const parsed = JSON.parse(raw);
                                return parsed.message || "";
                            } catch (e) {
                                // fallback if JSON parse fails
                                return "";
                            }
                        }
                    },
                    {
                        headerName: "Status Code",
                        field: "statusCode"
                    },
                    {
                        headerName: "Vendor Info",
                        field: "vendor"
                    },
                    {
                        headerName: "Created At",
                        field: "time_c",
                        valueGetter: AG_GRID.GET_TIME_C
                    },
                    {
                        headerName: "Restore Time",
                        field: "filerestored",
                        valueGetter: AG_GRID.GET_TIME_C
                    }
                ]
            }
        },
        TIME_FORMAT: {
            PT_FINALIZE: "DD-MMM-YYYY, h:mm:ss a"
        },
        SUB_HEAD: {
            PT_FINALIZE: " Pubkit Finalize Status"
        },
        GET_ACTION_JSON: function (data, Options = {}) { },
        SINGLE_API_HIT: function (data, Options = {}, self, reportModel, current) { },
        CONCURRENT_API_HIT: async function (params, Options = {}, self, reportModel, current) { },
        PT_FINALIZE_CELL_DOUBLE_CLICK: async function (params, self, reportModel, current) { },
        PT_FINALIZE_FETCH_QUERY: function (e = {}, jsondata = {}, reportModel, self) {
            self = this;
            reportModel = 'PT_FINALIZE';
            try {
                if (/button/gi.test(e.target.tagName)) { } else {
                    return debug.log("click btn");
                }
                var END_POINT = API_GET_DOCS,
                    jsondata = {
                        "tbl": "pubkitapistatusclose",
                        "length": 10,
                        "find": {
                            $and: [
                                {
                                    $or: [
                                        {
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
                                {
                                    "pubkitresclose": { $exists: true }
                                },
                                {
                                    "statusCode": { $exists: true }
                                },
                            ]
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
        InitLoop: function (self) {
            self = MODULE_GRID_PUBKIT_FINAL;
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
    function fetchFileSizes(gridApi) {
        gridApi.forEachNode(async (node) => {
            const { docid, timestamp, roleid } = node.data;

            const url = BUCKET_URL + docid + '/backup/' + roleid + docid + '_' + timestamp + '.html';

            try {
                const response = await fetch(url, { method: 'HEAD' });

                if (response.ok) {
                    const size = parseInt(response.headers.get('Content-Length') || '0', 10);
                    node.setDataValue('file_size', size);
                } else {
                    node.setDataValue('file_size', '0 Error');
                }
            } catch (e) {
                node.setDataValue('file_size', '0 Error');
            }
        });
    }

    MODULE_GRID_SAVE_FAIL_LIST = {
        GRID_OPTION: {
            "DEFAULT_columnDefs": {},
            "DEFAULT_FILED": {},
            "DEFAULT_ORDER": {
                "FAIL_LIST": {
                    columnDefs_order: ["client", "identifier", "docid", "rolename", "time_c", "remarks", "filerestored", "timestamp"],
                    columnDefs_order_remove: [],
                    GRID_ADD_OPTIONS: {
                        paginationPageSize: 100,
                        paginationAutoPageSize: false,
                        suppressPaginationPanel: false,
                        suppressScrollOnNewData: true
                    }
                }
            },
            "FAIL_LIST": {
                columnDefs: [
                    {
                        headerName: "Client",
                        field: "client"
                    },
                    {
                        headerName: "Identifier",
                        field: "identifier"
                    },
                    {
                        headerName: "DOC ID",
                        field: "docid"
                    },
                    {
                        headerName: "Role Name",
                        field: "rolename",
                        valueGetter: ({ data }) => {
                            const role = data.role;
                            if (!role) return "";
                            if (role.length > 20) {
                                return ROLE_IDS[role] && ROLE_IDS[role].name || "";
                            } else {
                                return role;
                            }
                        }
                    },
                    {
                        headerName: "Created At",
                        field: "time_c",
                        valueGetter: AG_GRID.GET_TIME_C
                    },
                    {
                        headerName: "Remarks",
                        field: "remarks"
                    },
                    {
                        headerName: "Restore Time",
                        field: "filerestored",
                        valueGetter: AG_GRID.GET_TIME_C,
                        hide:true
                    },
                    {
                        headerName: "Time Stamp",
                        field: "timestamp"
                    },
                ]
            },
            onGridReady: (params) => {
                // fetchFileSizes(params.api);  // Start lazy loading after grid is ready
                console.log("-----onGridReady------");
            }
        },
        TIME_FORMAT: {
            FAIL_LIST: "DD-MMM-YYYY, h:mm:ss a"
        },
        SUB_HEAD: {
            FAIL_LIST: " Save Fail List"
        },
        GET_ACTION_JSON: function (data, Options = {}) { },
        SINGLE_API_HIT: function (data, Options = {}, self, reportModel, current) { },
        CONCURRENT_API_HIT: async function (params, Options = {}, self, reportModel, current) { },
        FAIL_LIST_CELL_DOUBLE_CLICK: async function (params, self, reportModel, current) {
            console.log("FAIL_LIST_CELL_DOUBLE_CLICK");
        },
        FAIL_LIST_FETCH_QUERY: function (e = {}, jsondata = {}, reportModel, self) {
            self = this;
            reportModel = 'FAIL_LIST';
            try {
                if (/button|select/gi.test(e.target.tagName)) { } else {
                    return debug.log("click btn");
                }
                const { startTime } = e || null;
                // 48 hours in milliseconds
                const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
                const cutoff = startTime ? startTime : Date.now() - FORTY_EIGHT_HOURS;

                var END_POINT = API_GET_DOCS,
                    jsondata = {
                        "tbl": "Fileslist",
                        "length": 1000,
                        "find": {
                            $or: [
                                {
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
                                },
                                {
                                    "filerestored": { "$exists": true },
                                    "time_c": { "$gt": cutoff }
                                }
                            ]

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
        InitLoop: function (self) {
            self = MODULE_GRID_SAVE_FAIL_LIST;
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

    (function () {
        MODULE_GRID_ADMIN.InitLoop();
        MODULE_GRID_PUBKIT_STATUS.InitLoop();
        MODULE_GRID_PUBKIT_FINAL.InitLoop();
        MODULE_GRID_SAVE_FAIL_LIST.InitLoop();
        if (superAdmin) {
            var entry = document.querySelector(`[data-fetch="CRUD_MAINTENANCE"]`);
            if (entry) entry.classList.remove("d-none");
        }
    })();
});