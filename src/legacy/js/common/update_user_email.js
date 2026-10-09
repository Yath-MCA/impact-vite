var MODULE_GRID_UE = {};
(function() {
document.addEventListener('DOMContentLoaded', function(event) {
    MODULE_GRID_UE = {
        GRID_OPTION: {
            "DEFAULT_columnDefs": {},
            "DEFAULT_FILED": {},
            "DEFAULT_ORDER": {
                "CHANGE_EMAIL": {
                    columnDefs_order: ["identifier", "username", "rolename", "status", "emailto", "take_action", "add_action", "remove_action" ,  "time_c"],
                    columnDefs_order_remove: [],
                    GRID_ADD_OPTIONS: {
                        paginationPageSize: 100,
                        paginationAutoPageSize: false,
                        suppressPaginationPanel: false,
                        suppressScrollOnNewData: true
                    }
                }
            },
            "CHANGE_EMAIL": {
                columnDefs: [{
                        headerName: "Role Name",
                        field: "rolename"
                    },{
                        headerName: "User Email",
                        field: "emailto",
                        valueGetter: (params) => {
                            if (!params.data) return "";
                            return params.data.emailto;
                        }
                    },
                    {
                        headerName: "Update/Replace Email",
                        field: "take_action",
                        valueGetter: (params) => {
                            try {
                                if (!params.data) return "";
                                return params.data.status == "active" ? `Click to Update Email` : "";
                            } catch (err) {
                                // console.log([params.data, params.data.status]);
                            }
                        }
                    },
                    {
                        headerName: "Add/New Email",
                        field: "add_action",
                        valueGetter: (params) => {
                            try {
                                if (!params.data) return "";
                                return params.data.status == "active" ? `Click to Add Email` : "";
                            } catch (err) {
                                // console.log([params.data, params.data.status]);
                            }
                        }
                    },
                    {
                        headerName: "Remove/Delete Email",
                        field: "remove_action",
                        valueGetter: (params) => {
                            try {
                                if (!params.data) return "";
                                return params.data.status == "active" ? `Click to Remove Email` : "";
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
            CHANGE_EMAIL: "DD-MMM-YYYY, h:mm:ss a"
        },
        SUB_HEAD: {
            CHANGE_EMAIL: " Active/Deactive Links"
        },
        GET_ACTION_JSON: function(data, Options,self, current) {
            self = this;
            current = MODULE_GRID_UE;
            try {
                let updatedemail;
                let email_arr = [];
                if(data.username.includes(',')){
                    email_arr = data.username.split(',');
                    email_arr[email_arr.indexOf(Options.oldemail)] = Options.newemail;
                    updatedemail = email_arr.join(',');
                }else{
                    updatedemail = Options.newemail;
                    email_arr = [Options.newemail];
                }
                return {
                    "tbl": "",
                    "find": {
                        "identifier": data['identifier'],
                        "docid": data['docid'],
                        "_id": data['id'],
                        "status": "active"
                    },
                    "length": 50,
                    "update": {
                            "emailtolist" : updatedemail,
                            "username" : updatedemail,
                            "emailto" : email_arr,
                            "oldemail": Options.oldemail
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
        ADD_ACTION_JSON: function(data, Options,self, current) {
            self = this;
            current = MODULE_GRID_UE;
            try {
                let updatedemail;
                let email_arr = [];
                if(data.username.includes(',')){
                    email_arr = data.username.split(',');
                    email_arr.push(Options.newemail);
                    updatedemail = email_arr.join(',');
                }else{
                    //updatedemail = Options.newemail;
                    //email_arr = [Options.newemail];
                    email_arr = data.emailto;
                    email_arr.push(Options.newemail);
                    updatedemail = email_arr.join(',');
                }
                return {
                    "tbl": "",
                    "find": {
                        "identifier": data['identifier'],
                        "docid": data['docid'],
                        "_id": data['id'],
                        "status": "active"
                    },
                    "length": 50,
                    "update": {
                            "emailtolist" : updatedemail,
                            "username" : updatedemail,
                            "emailto" : email_arr,
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
                ErrorLogTrace('ADD_ACTION_JSON', err.message);
            }
        },
        REMOVE_ACTION_JSON: function(data, Options,self, current) {
            self = this;
            current = MODULE_GRID_UE;
            try {
                let updatedemail;
                let email_arr = [];
                if(data.username.includes(',')){
                    email_arr = data.username.split(',');
                    let filteredEmail = email_arr.filter((e) => e !== Options.delemail);
                    email_arr = filteredEmail;
                    updatedemail = email_arr.join(',');
                }
                return {
                    "tbl": "",
                    "find": {
                        "identifier": data['identifier'],
                        "docid": data['docid'],
                        "_id": data['id'],
                        "status": "active"
                    },
                    "length": 50,
                    "update": {
                            "emailtolist" : updatedemail,
                            "username" : updatedemail,
                            "emailto" : email_arr,
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
                ErrorLogTrace('REMOVE_ACTION_JSON', err.message);
            }
        },
        DE_ACT_RES: function(response, Options = {}, self, current) {
            self = this;
            current = MODULE_GRID_UE;
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
            reportModel = 'CHANGE_EMAIL';
            current = MODULE_GRID_UE;
            try {
                AG_GRID.ShowLoadingIcon("ShowLoading");
                // ? https://docs.google.com/document/d/1Berwzk0ikBxPLjKVZ08IxWpTGxj-v65SnO19_dDCHqo/edit
                // let JSON_DATA =  Options.modifiyType == "Replace" ? MODULE_GRID_UE.GET_ACTION_JSON(data,Options) : MODULE_GRID_UE.ADD_ACTION_JSON(data,Options);

                let JSON_DATA =  Options.modifiyType == "Replace" ? MODULE_GRID_UE.GET_ACTION_JSON(data,Options) : Options.modifiyType == "Remove" ? MODULE_GRID_UE.REMOVE_ACTION_JSON(data,Options) : MODULE_GRID_UE.ADD_ACTION_JSON(data,Options);
            
                //let JSON_DATA = MODULE_GRID_UE.GET_ACTION_JSON(data,Options),
                let END_API = API_PATH + "findupdateorinsert",
                    SEND_JSON = JSON.parse(JSON.stringify(JSON_DATA));
                    SEND_JSON['tbl'] = "Shareandinvite";
                    // SEND_JSON = 'Shareandinvite,Fileslist'.split(",").map(tbl => {
                    //     let clonedObject = JSON.parse(JSON.stringify(JSON_DATA));
                    //     clonedObject['tbl'] = tbl;
                    //     return clonedObject;
                    // });
                if (SEND_JSON.length > 0)
                    commonfn['callajax'](SEND_JSON, 'DE_ACT_RES', END_API, current);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('CONCURRENT_API_HIT', err.message);
            }
        },
        CONCURRENT_API_HIT: async function(params, Options = {}, self, reportModel, current) {
            self = this;
            reportModel = 'CHANGE_EMAIL';
            current = MODULE_GRID_UE;
            try {
                let JSON_DATA = MODULE_GRID_UE.GET_ACTION_JSON(params, Options);
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
        VALIDATE_EMAIL_ID : function (email, Options = {}, self, reportModel, current) {
            self = this;
            reportModel = 'CHANGE_EMAIL';
            current = MODULE_GRID_UE;
            try {
                const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
 
                if (emailPattern.test(email)) {
                    return true;
                } else return false;
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('VALIDATE_EMAIL_ID', err.message);
            }
        },
        CHANGE_EMAIL_CELL_DOUBLE_CLICK: async function(params, self, reportModel, current) {
            self = this;
            reportModel = 'CHANGE_EMAIL';
            current = MODULE_GRID_UE;
            let email_obj = {} ;
            if(Array.isArray(params.data.emailto)){
                params.data.emailto.forEach(email => {
                    email_obj[email] = email.toString();
                });
            }
            let new_email,old_email;
            try {
                let [IS_ACT, COL_ID] = [params.data.status == 'active', params.event.target.getAttribute('col-id')];
                if (COL_ID == "take_action") {
                    const {
                        value: text
                    } = await Swal.fire({
                        title: "Update User Email Address",
                        html: `
                            <label for="swal-input2" class="swal2-label">Select Old Email below</label>
                            <select id="swal-input2" class="swal2-select" style="width:-webkit-fill-available;margin-bottom:20px">
                                <option disabled selected value>Select an existing user email</option>
                                ${Object.entries(email_obj).map(([key, value]) => 
                                    `<option value="${value}">${value}</option>`
                                ).join('')}
                            </select>
                            
                            <label for="swal-input1" style="margin-top:20px" class="swal2-label">Enter New Email Address</label>
                            <input id="swal-input1" style="width:-webkit-fill-available;height:1.95em;border:1px solid #d9d9d9;border-radius:4px;padding:8px;box-sizing:border-box;" class="swal2-input" placeholder="Enter new email address...">
                        `,
                        showCancelButton: true,
                        preConfirm: () => {
                            const newEmail = document.getElementById("swal-input1").value;
                            const oldEmail = document.getElementById("swal-input2").value;
                            
                            if (!current.VALIDATE_EMAIL_ID(oldEmail) || !current.VALIDATE_EMAIL_ID(newEmail)) {
                                Swal.showValidationMessage("Invalid Input! Please check it");
                                return false;
                            }
                            
                            return {
                                newEmail: newEmail,
                                oldEmail: oldEmail
                            };
                        }
                    });
                    if (text) {
                        current.SINGLE_API_HIT(params.data, {
                            modifiyType: 'Replace',
                            oldemail: text.oldEmail,
                            newemail: text.newEmail
                        });
                        console.log("Trigger replace function for email id");
                    }
                }else if (COL_ID == "add_action") {
                    const {
                        value: text
                    } = await Swal.fire({
                        title: "Add User Email Address",
                        input: "email",
                        inputLabel: "New email address",
                        inputPlaceholder: "Enter your email address",
                        showCancelButton: true,
                        });
                    if (text) {
                        current.SINGLE_API_HIT(params.data, {
                            modifiyType: 'New',
                            newemail: text
                        });
                        console.log("Trigger new function for email id");
                    }
                }else if(COL_ID == "remove_action"){
                    const {
                        value: text
                    } = await Swal.fire({
                        title: "Remove User Email Address",
                        html: `
                            <label for="swal-input2" class="swal2-label">Select Email to remove below</label>
                            <select id="swal-input2" class="swal2-select" style="width:-webkit-fill-available;margin-bottom:20px">
                                <option disabled selected value>Select an existing user email</option>
                                ${Object.entries(email_obj).map(([key, value]) => 
                                    `<option value="${value}">${value}</option>`
                                ).join('')}
                            </select>
                        
                        `,
                        showCancelButton: true,
                        preConfirm: () => {
                            const delEmail = document.getElementById("swal-input2").value;
                            
                            if (!current.VALIDATE_EMAIL_ID(delEmail)) {
                                Swal.showValidationMessage("Invalid Input! Please check it");
                                return false;
                            }
                            if(params.data.emailto.length <= 1){
                                Swal.showValidationMessage("One email exist! Not able to remove");
                                return false;
                            }
                            return {
                                delEmail: delEmail,
                            };
                        }
                    });
                    if (text) {
                        current.SINGLE_API_HIT(params.data, {
                            modifiyType: 'Remove',
                            delemail: text.delEmail
                        });
                        console.log("Trigger remove function for email id");
                    }
                }
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('CHANGE_EMAIL_CELL_DOUBLE_CLICK', err.message);
            }

        },
        CHANGE_EMAIL_FETCH_QUERY: function(e = {}, jsondata = {}, reportModel, self) {
            self = this;
            reportModel = 'CHANGE_EMAIL';
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
                            ],
                            "status": "active"
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
            self = MODULE_GRID_UE;
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
            MODULE_GRID_UE.InitLoop();
        })();
    });
})();