const MODULE_GRID_CRUD_MAINTEN = {};

// Log API response and show success alert
commonfn.console_maintan_result = function (response, showtext = "") {
    console.log("API Response:", response);
    if (response.r === 1) {
        Swal.fire({
            icon: 'success',
            title: 'Maintenance Scheduled',
            text: showtext
        });
    }
};

function getDefaultStartDateTime() {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    now.setHours(7, 30, 0, 0);

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${mins}`;
}

// Build duration <select> options (1–4 hours)
function buildDurationOptions() {
    return [1, 2, 3, 4]
        .map(h => `<option value="${h}"${h === 2 ? ' selected' : ''}>${h} Hour${h > 1 ? 's' : ''}</option>`)
        .join('');
}

function getMaintenanceTimestamp(value) {
    if (value == null || value === '') return NaN;

    if (typeof value === 'object' && value.$numberLong) {
        const longValue = Number(value.$numberLong);
        return Number.isFinite(longValue) ? longValue : NaN;
    }

    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;

    const parsedValue = Date.parse(value);
    return Number.isFinite(parsedValue) ? parsedValue : NaN;
}

function getMaintenanceEndTimestamp(data = {}) {
    const endDateTime = data.endDateTime != null ? data.endDateTime : data.endtime;
    return getMaintenanceTimestamp(
        endDateTime != null ? endDateTime : data.endtime_iso
    );
}

function getMaintenanceDisplayStatus(params = {}) {
    const data = params.data || {};
    const rawStatus = (data.status || '').toString().trim();
    const endTimestamp = getMaintenanceEndTimestamp(data);

    if (rawStatus === 'active' && Number.isFinite(endTimestamp) && endTimestamp < Date.now()) {
        return 'expired';
    }

    if (rawStatus) return rawStatus;

    if (Number.isFinite(endTimestamp)) {
        return endTimestamp < Date.now() ? 'expired' : 'active';
    }

    return '';
}

function getMaintenanceRowFindClause(rowData = {}) {
    const priorityKeys = ['id', 'docid', '_id', 'starttime'];

    for (const key of priorityKeys) {
        if (rowData[key] != null && rowData[key] !== '') {
            return { [key]: rowData[key] };
        }
    }

    return {};
}

async function handleMaintenanceChangeStatus(rowData) {
    const currentStatus = rowData.status || 'active';
    const statusOptions = ['active', 'deactive'].filter(status => status !== currentStatus);

    const radioInputs = statusOptions.map(status => `
        <div class="form-check">
            <input class="form-check-input" type="radio" name="maintenanceStatusRadio" id="maintenance-status-${status}" value="${status}">
            <label class="form-check-label" for="maintenance-status-${status}">
                ${status.charAt(0).toUpperCase() + status.slice(1)}
            </label>
        </div>
    `).join('');

    const result = await Swal.fire({
        title: 'Change Maintenance Status',
        html: `
            <div class="mb-3">
                <p>Current status: <strong>${currentStatus}</strong></p>
                <p>Select new status:</p>
                ${radioInputs}
            </div>
            <div class="mb-3">
                <label for="maintenance-status-reason" class="form-label">Enter your EMP ID and Reason:</label>
                <textarea id="maintenance-status-reason" class="form-control" rows="3" placeholder="Type your reason here..."></textarea>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Change Status',
        preConfirm: () => {
            const selectedStatus = document.querySelector('input[name="maintenanceStatusRadio"]:checked')?.value;
            const reason = document.getElementById('maintenance-status-reason').value.trim();

            if (!selectedStatus) {
                Swal.showValidationMessage('Please select a status');
                return false;
            }

            if (!reason) {
                Swal.showValidationMessage('You need to write a reason!');
                return false;
            }

            return { selectedStatus, reason };
        }
    });

    if (!result.isConfirmed || !result.value) return;

    const { selectedStatus, reason } = result.value;
    const updateData = {
        status: selectedStatus,
        changestatustime: new Date().getTime(),
        changestatusreason: reason,
        changestatususer: USER_MAIL || ''
    };

    commonfn.callajax(
        {
            tbl: 'ServerMaintenance',
            find: getMaintenanceRowFindClause(rowData),
            length: 1,
            update: updateData
        },
        'console_maintan_result',
        API_FIND_UPDATE_INSERT,
        `Maintenance status changed to ${selectedStatus}`
    );
}

async function handleMaintenanceEditHour(rowData) {
    const startTime = rowData.starttime != null ? rowData.starttime : rowData.starttime_iso;
    const startTimestamp = getMaintenanceTimestamp(startTime != null ? startTime : Date.now());
    const currentEndTimestamp = getMaintenanceEndTimestamp(rowData);
    const currentDurationHours = Number.parseInt((rowData.durationtime || '').toString(), 10)
        || (Number.isFinite(startTimestamp) && Number.isFinite(currentEndTimestamp)
            ? Math.max(1, Math.round((currentEndTimestamp - startTimestamp) / (60 * 60 * 1000)))
            : 2);

    const result = await Swal.fire({
        title: 'Edit Maintenance Hours',
        html: `
            <div class="mb-3">
                <label for="maintenance-hours" class="form-label">Duration in hours</label>
                <input id="maintenance-hours" type="number" min="1" max="24" class="swal2-input" value="${currentDurationHours}">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Save Hours',
        preConfirm: () => {
            const hours = Number.parseInt(document.getElementById('maintenance-hours').value, 10);

            if (!Number.isInteger(hours) || hours < 1 || hours > 24) {
                Swal.showValidationMessage('Duration must be between 1 and 24 hours.');
                return false;
            }

            return { hours };
        }
    });

    if (!result.isConfirmed || !result.value) return;

    const { hours } = result.value;
    const baseStart = Number.isFinite(startTimestamp) ? startTimestamp : Date.now();
    const newEndTimestamp = moment(baseStart).add(hours, 'hours').valueOf();

    commonfn.callajax(
        {
            tbl: 'ServerMaintenance',
            find: getMaintenanceRowFindClause(rowData),
            length: 1,
            update: {
                endtime: newEndTimestamp,
                endtime_iso: new Date(newEndTimestamp).toISOString(),
                durationtime: `${hours}_h`
            }
        },
        'console_maintan_result',
        API_FIND_UPDATE_INSERT,
        `Maintenance duration updated to ${hours} hour${hours > 1 ? 's' : ''}`
    );
}

function showMaintenanceActionMenu(params) {
    if (getMaintenanceDisplayStatus({ data: params.data }) !== 'active') {
        return;
    }

    const rect = params.event.target.getBoundingClientRect();
    const existingMenu = document.getElementById('maintenance-cell-dropdown-menu');

    if (existingMenu) existingMenu.remove();

    const dropdownMenu = document.createElement('div');
    dropdownMenu.id = 'maintenance-cell-dropdown-menu';
    dropdownMenu.className = 'dropdown-menu show';
    dropdownMenu.style.position = 'absolute';
    dropdownMenu.style.left = `${rect.left}px`;
    dropdownMenu.style.top = `${rect.bottom}px`;
    dropdownMenu.style.display = 'block';

    dropdownMenu.innerHTML = `
        <a class="dropdown-item" href="#" data-action="change-status">Change Status</a>
        <a class="dropdown-item" href="#" data-action="edit-hour">Edit Hour</a>
    `;

    dropdownMenu.addEventListener('click', function (e) {
        const actionNode = e.target.closest('[data-action]');
        if (!actionNode) return;

        e.preventDefault();
        e.stopPropagation();

        const action = actionNode.getAttribute('data-action');
        const rowData = params.node.data;

        switch (action) {
            case 'change-status':
                handleMaintenanceChangeStatus(rowData);
                break;
            case 'edit-hour':
                handleMaintenanceEditHour(rowData);
                break;
        }

        hideMaintenanceDropdown();
    });

    document.body.appendChild(dropdownMenu);

    function hideMaintenanceDropdown() {
        const menu = document.getElementById('maintenance-cell-dropdown-menu');
        if (menu) menu.remove();
        document.removeEventListener('click', hideMaintenanceDropdown);
    }

    setTimeout(() => document.addEventListener('click', hideMaintenanceDropdown), 0);
}

// Show SweetAlert2 form — user picks start time, duration (1–4 h), and remark
async function showMaintenanceForm() {
    const defaultDateTime = getDefaultStartDateTime();

    const result = await Swal.fire({
        title: 'Schedule Maintenance',
        html: `
            <div class="mb-3">
                <label for="swal-datetime" class="form-label">Start Date &amp; Time (default: 7:30 AM)</label>
                <input id="swal-datetime" type="datetime-local" class="swal2-input" value="${defaultDateTime}">
            </div>
            <div class="mb-3">
                <label for="swal-duration" class="form-label">Duration</label>
                <select id="swal-duration" class="swal2-input">
                    ${buildDurationOptions()}
                </select>
            </div>
            <div class="mb-3">
                <label for="swal-remark" class="form-label">Reason / Remark</label>
                <input id="swal-remark" type="text" class="swal2-input">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Submit',
        preConfirm: () => {
            const dateTime = document.getElementById('swal-datetime').value || defaultDateTime;
            const duration = parseInt(document.getElementById('swal-duration').value, 10);
            const remark = document.getElementById('swal-remark').value.trim();

            if (!dateTime) {
                Swal.showValidationMessage('Please enter a valid date and time.');
                return false;
            }

            // Guard: enforce 1–4 h in case DOM is manipulated
            if (duration < 1 || duration > 4 || !Number.isInteger(duration)) {
                Swal.showValidationMessage('Duration must be between 1 and 4 hours.');
                return false;
            }

            return { dateTime, duration, remark };
        }
    });

    if (!result.isConfirmed || !result.value) return null;

    const { dateTime, duration, remark } = result.value;
    const startDateTime = new Date(dateTime).getTime();

    if (!Number.isFinite(startDateTime)) {
        await Swal.fire({ icon: 'error', title: 'Invalid Date', text: 'Please enter a valid date and time.' });
        return null;
    }

    const endDateTime = moment(startDateTime).add(duration, 'hours').valueOf();
    const text_alert = `From: ${moment(startDateTime).format('llll')} to ${moment(endDateTime).format('LT')}`;

    debug.log([startDateTime, endDateTime]);

    const maintenanceData = createMaintenanceRecord(startDateTime, endDateTime, duration, remark);
    commonfn['callajax'](maintenanceData, 'console_maintan_result', API_UPDATE_INSERT, text_alert);

    return { startDateTime, endDateTime, duration, remark };
}

// Build maintenance record; duration stored as e.g. "2_h"
function createMaintenanceRecord(startTime, endTime, durationHours, reason) {
    return {
        tbl: 'ServerMaintenance',
        starttime: startTime,
        endtime: endTime,
        starttime_iso: new Date(startTime).toISOString(),
        endtime_iso: new Date(endTime).toISOString(),
        reason,
        recordtype: 'maintenance',
        reminderalert: '48_h',
        durationtime: `${durationHours}_h`,
        type: 'Scheduled',
        status: 'active',
        remarks: 'Admin Dashboard',
        username: USER_MAIL || ''
    };
}

document.addEventListener('DOMContentLoaded', () => {
    Object.assign(MODULE_GRID_CRUD_MAINTEN, {
        GRID_OPTION: {
            DEFAULT_columnDefs: {},
            DEFAULT_FILED: {},
            DEFAULT_ORDER: {
                CRUD_MAINTEN: {
                    columnDefs_order: ['username', 'status', 'type', 'remarks', 'reason', 'take_action', 'time_c'],
                    columnDefs_order_remove: [],
                    GRID_ADD_OPTIONS: {
                        paginationPageSize: 100,
                        paginationAutoPageSize: false,
                        suppressPaginationPanel: false,
                        suppressScrollOnNewData: true
                    }
                }
            },
            CRUD_MAINTEN: {
                columnDefs: [
                    { headerName: 'Name', field: 'username' },
                    { headerName: 'Status', field: 'type' },
                    { headerName: 'Type', field: 'status', valueGetter: getMaintenanceDisplayStatus },
                    { headerName: 'Reason', field: 'reason' },
                    { headerName: 'Remark', field: 'remarks' },
                    { headerName: 'Take Action', field: 'take_action', valueGetter: () => 'Click for More Actions' },
                    {
                        headerName: 'Created',
                        field: 'time_c',
                        filter: 'agDateColumnFilter',
                        filterParams,
                        comparator: dateComparator,
                        sort: 'desc',
                        valueGetter: AG_GRID.GET_TIME_C
                    }
                ]
            }
        },

        TIME_FORMAT: {
            CRUD_MAINTEN: 'DD-MMM-YYYY, h:mm:ss a'
        },

        SUB_HEAD: {
            CRUD_MAINTEN: ' Admin Access'
        },

        GET_ACTION_JSON(data, Options = {}) {
            try {
                return {
                    tbl: 'ServerMaintenance',
                    find: { status: 'active' },
                    length: 50,
                    update: {
                        status: Options.newStatus,
                        changestatustime: new Date().getTime(),
                        changestatusreason: Options.reason || '',
                        changestatususer: USER_MAIL || ''
                    },
                    updateMany: '1',
                    _r: ['5af956974b4bb40a34648f8e'],
                    _w: ['5af956974b4bb40a34648f8e']
                };
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('GET_ACTION_JSON', err.message);
            }
        },

        async CRUD_MAINTEN_CELL_DOUBLE_CLICK(params) {
            try {
                const COL_ID = params.event.target.getAttribute('col-id');
                if (COL_ID === 'take_action') {
                    showMaintenanceActionMenu(params);
                } else if (COL_ID === 'status') {
                    console.log('Maintenance status clicked', params.data);
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('CRUD_MAINTEN_CELL_DOUBLE_CLICK', err.message);
            }
        },

        CRUD_MAINTEN_FETCH_QUERY(e = {}) {
            try {
                if (!/button/gi.test(e.target?.tagName)) {
                    debug.log('click btn');
                }

                const END_POINT = API_GET_DOCS;
                const jsondata = {
                    tbl: 'ServerMaintenance',
                    length: 100,
                    find: { status: { $exists: true } },
                    filter: []
                };

                setTimeout((data, endpoint, report) => {
                    AG_GRID.HIT_API_RETURN(data, endpoint, report);
                }, 1500, jsondata, END_POINT, 'CRUD_MAINTEN');

                return jsondata;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('FETCH_QUERY_JSON', err.message);
            }
        },

        InitLoop() {
            const self = MODULE_GRID_CRUD_MAINTEN;
            try {
                for (const [main_key, main_value] of Object.entries(self)) {
                    if (typeof main_value === 'object') {
                        for (const [sub_key, sub_value] of Object.entries(main_value)) {
                            if (/string|function/gi.test(typeof sub_value)) {
                                if (AG_GRID[main_key]) AG_GRID[main_key][sub_key] = sub_value;
                            } else if (typeof sub_value === 'object' && Object.values(sub_value).length !== 0) {
                                for (const [sub_sub_key, sub_sub_value] of Object.entries(sub_value)) {
                                    if (sub_sub_key === 'columnDefs') {
                                        AG_GRID[main_key][sub_key] = sub_value;
                                    } else if (AG_GRID[main_key]?.[sub_key]) {
                                        AG_GRID[main_key][sub_key][sub_sub_key] = sub_sub_value;
                                    }
                                }
                            }
                        }
                    } else if (/string|function/gi.test(typeof main_value) && main_key !== 'InitLoop') {
                        AG_GRID[main_key] = main_value;
                    }
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('module_grid_InitLoop', err.message);
            }
        }
    });

    MODULE_GRID_CRUD_MAINTEN.InitLoop();

    if (superAdmin) {
        const entry = document.querySelector('[data-fetch="CRUD_MAINTEN"]');
        if (entry) entry.classList.remove('d-none');
    }
});
