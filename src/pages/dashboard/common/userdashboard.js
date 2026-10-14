var myuserUniqueId = '';
var FILLTER = false;
var socket = null;
var UPLOAD_INFO = {};
var messageObjconc = {};
var mylocalhost = IS_LOCAL_HOST ? '0' : '1';
var message = {};
var userName;
var group = '';
var Roleslist = {};
var Listofclients = {
    bits: {},
    jats: {},
    docbook: {}
};
var reviewerstbl = {};
var ExternalModels = ['model-workflow.html'];
var uniquenumber = new Date().getTime() + '-' + getramdon() + '-' + getramdon() + '-' + getramdon();
var serverdataactive = {};
var SERVER_DATA = {};
var FileuplloadFlag = false;
var projectid = '';
var DOC_ID = null;

var USER_LIST = {};
var MISSING_DATA = {};
var OLD_RECORD = [];


function getuniqueid() {
    return new Date().getTime() + '-' + getramdon() + '-' + getramdon() + '-' + getramdon();
}
commonfn['setDatauser'] = function (response) {
    var uniquenumber = 'table-' + new Date().getTime() + '-' + new Date().getTime();
    roledata = response.data;
    for (var i = 0; i < roledata.length; i++) {
        USER_LIST[roledata[i]['_id']] = roledata[i]['displayName'];
    }
};
commonfn['timervalidation'] = function (response) {
    var currentdate = moment().format('DD-MM-YYYY hh:mm:ss');
    var enddate = response.data[0].endtime;
    if (Date.parse(currentdate) >= Date.parse(enddate)) {
        console.log(localStorage.getItem('xmleditor:projectid'), localStorage.getItem('xmleditor:eventindex'));
        projectprocess(localStorage.getItem('xmleditor:projectid'), localStorage.getItem('xmleditor:eventindex'));
        swal("error!", "Your Project Time is UP...!", "error")
            .then((value) => {
                window.location.reload(true);
            });
    } else {
        console.log("DateStart: " + currentdate + " is less than " + enddate);
        //window.location.href = "login.html";
    }
};
commonfn['getdocid'] = function (response, args) {
    if (response.data.length == 0) {
        alert('Unable to find the document id');
        return;
    }
    response = response.data[0];
    if (response['docid'] == undefined) {
        alert('Unable to find the document id');
        return;
    }
    // for the common function
    DOC_ID = response['docid'];
    getreviewersdetails(response['docid']);
    $('#workflowdocid').val(response['docid']);
    $('#model-workflow').modal('show');
};
commonfn['loadworkflowpost'] = function (response) {
    if (response.data.length == 0) {
        alert('No workflow available...');
        return;
    }
    var template = '<option disabled selected value> -- select an option -- </option>{{#data}}<option value="{{_id}}">{{workflow}}</option>{{/data}}';
    var html = Mustache.to_html(template, response);
    $('#workflow').html(html);
};
commonfn['loadworkflowrolepost'] = function (response) {
    for (var i = 0; i < response.data.length; i++) {
        var roleval = response.data[i]['role'];
        response.data[i]['rolename'] = Roleslist[roleval]['name'];
        if (reviewerstbl[roleval] != undefined) {
            // Roleslist[roleval]['roleemail']=reviewerstbl[roleval];
            response.data[i]['roleemail'] = reviewerstbl[roleval];
        }
    }
    var template = '<option disabled selected value> -- select an option -- </option>{{#data}}<option value="{{role}}">{{rolename}}</option>{{/data}}';
    var html = Mustache.to_html(template, response);
    $('#role').html(html);

    template = '{{#data}}<div class="form-group"><div class="row"><div class="col-1"><i class="far fa-user"></i></div><div class="col-11"><input type="email" class="form-control" aria-describedby="emailHelp" placeholder="{{rolename}}" name="{{role}}" value="{{roleemail}}"></div></div></div>{{/data}}';
    var ehtml = Mustache.to_html(template, response);
    $('#model-email-form').html(ehtml);
    //for(var prop in Roleslist){
    //  html += Mustache.to_html(template, Roleslist[prop]);
    //}
};
commonfn['loadtaskspost'] = function (response) {
    console.log(JSON.stringify(response));
    var template = '{{#data}}<option value="{{_id}}">{{name}}</option>{{/data}}';
    var html = Mustache.to_html(template, response);
    $('#task').html(html);
};
commonfn['loadrevieweremailspost'] = function (response) {
    if (response.data.length == 0) {
        return;
    }
    reviewerstbl = response.data[0];
    // console.log("reviewers data --- " + JSON.stringify(reviewerstbl));
};
commonfn['redirecteditor'] = function (response, args) {
    console.log("print args--" + args['math']);
    if (response.data.length == 0) {
        alert('Unable to find the document id');
        return;
    }
    response = response.data[0];
    if (response['docid'] == undefined) {
        alert('Unable to find the document id');
        return;
    }
    // $('#model-workflow').find('#docid').val(response['docid']);
    console.log('xmleditor:shared:' + response['docid']);

    if ((args['math'] != undefined) && (args['math'] == 1)) {
        localStorage.setItem('xmleditor:shared:' + response['docid'], JSON.stringify({
            'math': 1,
            'usertype': 0
        }));
        // window.open("editorlatex5.html?docid="+response['docid']+'&asoid='+args['asoid'],'_blank');
    } else {
        localStorage.setItem('xmleditor:shared:' + response['docid'], JSON.stringify({
            'math': 0,
            'usertype': 0
        }));
        // window.open("editor6.html?docid="+response['docid']+'&asoid='+args['asoid'],'_blank');
    }
    if (args['docid'] == 'Na1b452b9-ba67-4ddc-88a2-ffeae593b567' || args['docid'] == 'N685c6658-becb-4ed9-86c9-0ae0e554f220' || args['docid'] == 'N6ba6545b-c44e-4d24-bc7f-e9aeacdf9322' || args['docid'] == 'N36a82787-665e-44db-a63a-43ded2979c3a') {
        window.open("editor7.html?docid=" + response['docid'], '_blank');
    } else {
        window.open("editor6.html?docid=" + response['docid'], '_blank');
    }
};
commonfn['GetFolderList'] = function (response, args) {
    var data = response.data;
    console.log(data);
    if (data.length == 0) {
        return;
    }
    var file_sn = data[0].file_sn + '';
    if (file_sn.length == 0) {
        console.log("Unable to find the file");
        return;
    }
    // remove .zip from file name
    file_sn = file_sn.substring(0, (file_sn.length - 4));

    var jsondata = {
        "tbl": "Fileslist",
        '_id': args['_id'],
        'docid': file_sn,
        '_r': ["5af956974b4bb40a34648f8e"]
    };
    console.log(jsondata);
    commonfn['callajax'](jsondata, 'dummypost', API_UPDATE_INSERT, args);
    args['docid'] = file_sn;
    var jsondata = {
        "fname": file_sn,
        "xslt": "jatstoxhtml.xsl"
    };
    jsondata['fname'] = file_sn;
    console.log(jsondata);
    commonfn['callajax'](jsondata, 'POSTXSLTProcess', API_PATH + "xsltprocess", args);
};
commonfn['POSTXSLTProcess'] = function (response, args) {
    window.open("editor.html?docid=" + args['docid'], '_blank');
};
commonfn['Refreshfolder'] = function (response) {
    alert('Update is successfull..');
};
commonfn['updatedpdfres'] = function (response) {
    console.log(JSON.stringify(response));
};
commonfn['getprojectprocess'] = function (response) {
    var jsondata = {
        "tbl": "tasksdef",
        "find": {
            "workflow": response.data[0].workflow
        },
        "sort": {},
        "filter": ["name", "id", "role", "tat", "next", "workflow", "user", "email", "nextworkflow"]
    };
    commonfn['callajax'](jsondata, 'getworkflowtask', API_GET_DOCS_AUTH, response);
};
commonfn['getworkflowtask'] = function (response, workflowdata) {
    var workflow = workflowdata.data[0].projectprocess;
    var eventindex = localStorage.getItem('xmleditor:eventindex');
    if (eventindex == "undefined") {
        eventindex = 0;
    } else {
        eventindex = parseInt(localStorage.getItem('xmleditor:eventindex'));
        eventindex += 1;
    }
    for (var workflowindx = 0; workflowindx < workflow.length; workflowindx++) {
        if (response.data[eventindex]) {
            if (response.data[eventindex]._id == workflow[workflowindx].eventid) {
                var starttime = moment().format('DD-MM-YYYY hh:mm:ss');
                var endtime = moment().add(workflow[workflowindx].tat, 'hours').format('DD-MM-YYYY hh:mm:ss');
                workflow[workflowindx].starttime = starttime;
                workflow[workflowindx].endtime = endtime;
                var jsondata = {
                    "tbl": "Fileslist",
                    "find": {
                        "_id": workflowdata.data[0].project
                    },
                    "update": {
                        "userid": workflow[workflowindx].userid[0],
                        "starttime": starttime,
                        "endtime": endtime,
                        "eventindex": eventindex
                    }
                };

                commonfn['callajax'](jsondata, 'getData', API_FIND_UPDATE_INSERT);
                // var jsondata = { "tbl": "ProjectProcess", "find": { "project": projectid }, "update": { "projectprocess": workflow } };                
                // commonfn['callajax'](jsondata, 'getStatus', API_FIND_UPDATE_INSERT, "mappinglist.html");
            }
        }
    }
    if (workflow.length <= eventindex) {
        var jsondata_1 = {
            "tbl": "Fileslist",
            "find": {
                "_id": workflowdata.data[0].project
            },
            "update": {
                "userid": "",
                "starttime": "",
                "endtime": "",
                "eventindex": ""
            }
        };
        commonfn['callajax'](jsondata_1, 'getData', API_FIND_UPDATE_INSERT);
    }
};
commonfn['deleterecordpost'] = function (response) {
    console.log('RECORD_DELETED==>' + response);
    /* swal("Success!", "Record Deleted Successfully", "success").then((value) => { 
        //window.location.reload(true);
    }); */
};
commonfn['Saveprojectpost'] = function (response, args) {
    //    $('#projinput').hide();
    console.log("Project saved.");
    console.log(JSON.stringify(response));
    console.log(uniquenumber);
    Getuserfiles();
    // To add project id in ProjectProcess table
    /*var data = { "tbl": "ProjectProcess", "project": response.id, "_r": ["5af956974b4bb40a34648f8e"], "_w": ["5af956974b4bb40a34648f8e"]  };
    var url = API_UPDATE_INSERT;
    commonfn['callajax'](data, 'getData', url);
           var jsondata = {};
           var jsondata={'tbl':'cronjobs',"cron" : 0, "function" : "unzipsavedb", "zipfile" :$('#docid').val()+".zip", "params" : { "asoid" : args[0], "_r" : ["5af956974b4bb40a34648f8e"], "_w" : ["5af956974b4bb40a34648f8e"], "tbl" : "rfiles" }};
           commonfn['callajax'](jsondata,'cronpost', API_PATH+"updateorinsert");*/
};
commonfn['GET_LAST_SAVE_TIME'] = function (response) {
    console.log(JSON.stringify(response));
    response;
};
const GET_TIME = function (docid) {
    var json = {
        "tbl": "Fileslist",
        "find": {
            "recent": 1,
            "docid": docid
        },
        "length": 1,
        "sort": {
            'time_c': -1
        }
    };
    commonfn['callajax'](json, 'GET_LAST_SAVE_TIME', API_GET_DOCS);
};
var couter = 2;
var VALID_COLLECTION = [];
commonfn['Displayfiles'] = function (response) {
    /* if (response.data[0]) {
        localStorage.setItem('xmleditor:projectid', response.data[0]._id);
        localStorage.setItem('xmleditor:eventindex', response.data[0].eventindex);
    } */
    var fileslist = response.data;
    for (var i = 0; i < fileslist.length; i++) {
        var singlefile = fileslist[i];
        var IS_REMOVED = false;
        SERVER_DATA[singlefile['_id']] = singlefile;
        singlefile['uid'] = USER_LIST[singlefile['uid']];
        var shareStringDate = singlefile.time_c.$numberLong;
        var isOlderYear = moment(new Date().getTime()).diff(parseInt(shareStringDate), 'months') > 10;
        var IsDelete = singlefile['_deltime'] ? true : false;
        var IsIgnore = singlefile['asoid'] ? true : false || singlefile['projectname'] ? false : true;
        if ((isOlderYear) && !IsDelete) {
            OLD_RECORD.push(singlefile['_id']);
            if (isOlderYear && !IsDelete) {
                setTimeout(function (id) {
                    //deleteRecord('Fileslist',id)
                }, 3000 * (couter), singlefile['_id']);
                couter++;
            }
            fileslist.splice(i, 1);
            IS_REMOVED = true;
        }
        if ((!singlefile['projecttitle'] || singlefile['asoid']) && (!IS_REMOVED)) {
            fileslist.splice(i, 1);
            OLD_RECORD.push(singlefile['_id']);
            IS_REMOVED = true;
        }
        if ('003c72e3-d849-4be1-8c45-1449b22a8f1' == singlefile.docid || '978036742326124' == singlefile.identifier) {
            // alert('CHECK')
        }
        if (!IS_REMOVED) {
            VALID_COLLECTION.push(singlefile);
        }
        var CanDelete = moment(new Date().getTime()).diff(parseInt(shareStringDate), 'months') > 36;
        if (CanDelete) {
            //deleteRecord('Fileslist', singlefile['_id']);
        }
        //console.log(singlefile.docid);
    }
    if ($.fn.dataTable && $.fn.dataTable.isDataTable('#userList')) {
        modelpopup(document.getElementById('closeBut'));
        //modal.style.display = "none";
        $('#userList').dataTable().fnDestroy();
        $.fn.dataTable.moment("DD-MMM-YYYY HH:MM:SS");
    }
    console.log('Displayfiles' + VALID_COLLECTION.length);

    var DATA_TABLE = $('#userList').DataTable({
        data: VALID_COLLECTION,
        'createdRow': function (row, data, dataIndex) {
            $(row).attr('id', data.docid);
        },
        'columns': [{
            'data': null,
            'render': function (data, type, row) {
                return row.client ? row.client : (row.clientname ? (row.clientname == 'bits' ? 'Books' : 'Journals') : 'NA');
            }
        },
        {
            'data': 'name',
            'render': function (data, type, full, meta) {
                let title = full.dtd == 'JATS' ? (full.projectname ? full.projectname : (full.titleinfo ? full.titleinfo.projectname : 'NA')) :
                    (full.projectname ? full.projectname : (full.projecttitle ? full.projecttitle : (full.doctitle ? full.doctitle : 'NA')));
                return '<a href="javascript:Openeditor(\'' + full._id + '\')">' + title + '</a>' + ' <a href="javascript:openLandingPage(\'' + full._id + '\')">OpenLandingPage</a>';
            }
        },
        /* {
            'data': 'name',
            'render': function(data, type, full, meta) {
                let title = full.dtd == 'JATS' ? (full.projectname ? full.projectname : (full.titleinfo ? full.titleinfo.projectname : 'NA')) :
                    (full.projectname ? full.projectname : (full.projecttitle ? full.projecttitle : (full.doctitle ? full.doctitle : 'NA')));
                return '<a href="javascript:Openeditor(\'' + full._id + '\')">' + title + '</a>';
            }
        }, */
        {
            'data': 'name',
            'render': function (data, type, full, meta) {
                return '<a href="javascript:Openeditor(\'' + full.docid + '\')">' + full.docid + '</a>';
            }
        },

        {
            'data': 'time_c.$numberLong',
            // 'render': isoDateReviver
            'render': function (data, type, row, meta) {
                if (true) {
                    return isoDateReviver(data, type, row);
                } else if (row.docid && row.dtd) {
                    return $.ajax({
                        url: API_GET_DOCS,
                        data: {
                            'jsondata': {
                                "tbl": "Fileslist",
                                "find": {
                                    "recent": 1,
                                    "docid": row[docid]
                                },
                                "length": 1,
                                "sort": {
                                    'time_c': -1
                                }
                            }
                        },
                        type: "post",
                        dataType: "JSON",
                        async: true,
                        contentType: "application/json",
                    }).done(function (data) {
                        console.log(data);
                        return data.toString();
                    });
                } else {
                    return "NA";
                }
            }
        },
        {
            'data': 'status',
            'render': function (data, type, row) {
                return row.status ? row.status : 'NA';
            }
        },
        {
            'data': 'Start',
            'render': function (data, type, full, meta) {
                return '<a href="javascript:openLandingPage(\'' + full._id + '\')">Start</a>';
            }
        },
        {
            'data': 'Delete',
            'render': function (data, type, full, meta) {
                return '<div class="icon"><a href="javascript:deleteRecord(\'Fileslist\', \'' + full._id + '\')"><i class="ion ion-trash-a"></i></a></div>';
            }
        }
        ],
        pageLength: 50,
        "order": [
            [2, "desc"]
        ],
        "columnDefs": [{
            "targets": [5],
            "visible": IS_ADMIN,
            "searchable": false
        }]

    });
    //? https://www.datatables.net/reference/event/#select


    $('#userList tbody').on('click', 'td', function (e) {
        var idx = DATA_TABLE.row(this).index();
        console.log(idx);
        // note that you could actually pass in 'this' as the row selector!
        //DATA_TABLE.cell(idx, 0) .data('Updated').draw();
        if (this._DT_CellIndex.column == 3 && this.parentElement.id) {
            setTimeout((docid) => {
                CHECK_FOLDER(docid);
            }, (1000), this.parentElement.id);
        }
    });
    $('#userList').on('draw', function (e) {
        console.log('Redraw occurred at: ' + new Date().getTime());
    });
    $('#userList').on('draw.dt', function (e) {
        console.log('Redraw occurred at: ' + new Date().getTime());
        //DATA_TABLE.rows({search: 'applied'}).every(function(rowIdx, tableLoop, rowLoop) {});
    });

    function CHECK_FOLDER(docid) {
        $.ajax({
            type: 'HEAD',
            url: BUCKET_URL + docid,
            success: function () {
                //console.log('Page found.' + docid);
                $('#userList tr#' + docid).css('background-color', 'green');
            },
            error: function () {
                //console.warn('Page not found.' + docid);
                $('#userList tr#' + docid).css('background-color', 'yellow');
            }
        });
    }

};
commonfn['cronpost'] = function (response) {
    console.log("unzip cron updated");
    Getuserfiles();
};
$(document).ready(function () {
    // get all active documents
    Getuserfiles();
    $.widget.bridge('uibutton', $.ui.button);
    // $('.fliter').select2();
    function endtimechecking() {
        var jsondata = {
            "tbl": "Fileslist",
            "find": {
                "_id": localStorage.getItem('xmleditor:projectid')
            },
            "length": 1000,
            "sort": {},
            "filter": ["name", "id", "uid", "date", "unique", "status", "output", "tokenid", "math", UPLOAD_INFO.dtd, "userid"]
        };
        console.log(jsondata);
        commonfn['callajax'](jsondata, 'timervalidation', API_GET_DOCS_AUTH);
    }
    // UI for Mathtype
    /*     $('#mathml').prop('checked', false);
        $('#latex').prop('checked', false);
        $('#math').change(function() {
            if (this.checked) {
                $('div.mathbuttons').css('display', 'inline-block');
            } else {
                $('div.mathbuttons').css('display', 'none');
                $('#mathml').prop('checked', false);
                $('#latex').prop('checked', false);
            }
        }); */
    localStorage.setItem('xmleditor:userRole', "5b53536b4c4a803e9a5abf70");
    var BodyElement = $('body');
    // for (var i = 0; i < ExternalModels.length; i++) {
    //     $.get('snippet/' + ExternalModels[i], function (data) { BodyElement.append(data); });
    // }    
    // loadrole();
    //roleLoad();
    //loadworkflow();

    uploadPlugin(0, "#d-zone1");


    var temp = localStorage.getItem('xmleditor:login_username').replace(/@\w+\.\w+(\.\w+)?/g, "");
    var rg = /(^\w{1}|\s\w{1}|\.\w{1})/gi;
    var disName = temp.replace(rg, function (toReplace) {
        return toReplace.toUpperCase().replace('.', ' ');
    });
    $('#idname').text(disName);
    //console.log(disName);

});

function workFlowClick(e) {
    var workflow = (e.id == 'project_book') ? 'book' : 'journal';
    var IsBook = (e.id == 'project_book') ? true : false;
    var dtd = document.getElementById('clientdtd');
    var client = document.getElementById('clientname');
    dtd.value = (IsBook ? 'BITS' : 'JATS');
    console.log(e.id);
    client.value = 0;
    client.querySelectorAll('option').forEach((opt, ind, arr) => {
        opt[(IsBook && [4, 5].includes(ind) || ind == 0 || !IsBook && ![4, 5].includes(ind)) ? 'removeAttribute' : 'setAttribute']('disabled', '');
    });
};

function userLoad() {
    var jsondata = {
        "tbl": "user",
        "find": {},
        "sort": {},
        "filter": ["displayName", "email", "status"]
    };
    commonfn.callajax(jsondata, 'setDatauser', API_GET_USERS);
}
userLoad();

function Editrecord(dbid) {
    $("#projinput, #projinputupdate").show();
    $("#projinputsave").hide();
    serverdataactive = SERVER_DATA[dbid];
    $("#projectname").val(serverdataactive['name']);
    $('#projinputupdate').attr('data-id', dbid);
}
// function Shownewprojectshow() {
//     uniquenumber = getuniqueid();
//     $("#projinput").show();
//     $("#projinputupdate").hide();
// }
function UpdateProject() {
    var Formdata = formDataToJson('newprojectform');
    Formdata['tbl'] = 'Fileslist';
    Formdata['status'] = serverdataactive['status'];
    Formdata['_id'] = $('#projinputupdate').attr('data-id');
    Formdata["_r"] = ["5af956974b4bb40a34648f8e"];
    Formdata["_w"] = ["5af956974b4bb40a34648f8e"];
    commonfn['callajax'](Formdata, 'Saveprojectpost', API_UPDATE_INSERT);
}
// ? default setup
function formDataToJson(formname) {
    // ? todo prototype
    var formDataJson = {};
    var selectm = {};
    $.each($('#' + formname).serializeArray(), function (i, el) {
        var formtype = el.name.split('_');
        switch (formtype[0]) {
            case 'date':
                formDataJson[el.name] = el.value;
                break;
            case 'num':
                formDataJson[el.name] = (el.value * 1);
                break;
            case 'selectm':
                if (selectm[el.name] == undefined) {
                    selectm[el.name] = [];
                }
                selectm[el.name].push(el.value);
                formDataJson[el.name] = selectm[el.name];
                break;
            default:
                formDataJson[el.name] = el.value;
                break;
        }
    });
    return formDataJson;
}

function multiformDataToJson(formname) {
    console.log("inside multiform-" + formname);
    var formDataJson = formDataToJson(formname);
    var formData = new FormData();
    for (var eachdata in formDataJson) {
        // console.log("------" + eachdata + "------" + formDataJson[eachdata]);
        formData.append(eachdata, formDataJson[eachdata]);
    }
    $.each($('#' + formname).find("input[type='file']"), function (i, tag) {
        $.each($(tag)[0].files, function (i, file) {
            console.log(tag.name);
            formData.append(tag.name, file);
        });
    });
    return formData;
}

function Downloadfilefromredshift(dbrowid, fileformat) {
    window.open('https://jaws.newgen.co:8080/rs/downloadFile?tokenid=' + SERVER_DATA[dbrowid]['tokenid'] + '&filter=' + fileformat, '_blank');
}
const getClienttype = function () {
    let type_j = document.getElementById('project_book');
    let type_b = document.getElementById('project_journal');
    let returnValue = type_j.checked ? type_j.value : (type_b.checked ? type_b.value : null);
    if (!returnValue) {
        var temp = prompt('fill the Client Type "Books" either "Journals"', "Journals");
        if (temp != 'Journals') {
            temp = prompt('fill the Client Type "Books" either "Journals"', "Books");
        }
        returnValue = temp;
    }
    UPLOAD_INFO.type = returnValue;
    return returnValue;

};
const getClient = function () {
    var returnValue = null;
    var clientName = document.getElementById('clientname').value;
    returnValue = clientName != "0" ? clientName : null;
    if (!returnValue) {
        var temp = prompt('fill the Client "LWW", "OUP" either "TandF"', "LWW");
        returnValue = temp;
    }
    UPLOAD_INFO.client = returnValue;
    return returnValue;
};

const getProName = function () {
    var returnValue = null;
    var name = document.getElementById('projectname').value;
    returnValue = name != '' ? name : null;
    if (!returnValue) {
        var temp = prompt('fill the Project', moment().format('lll'));
        returnValue = temp;
    }
    UPLOAD_INFO.projectname = returnValue;
    return returnValue;
};
const getDTD = function () {
    var returnValue = null;
    var dtd = document.getElementById('clientdtd').value;
    returnValue = dtd != 'default' ? dtd : null;
    if (!returnValue) {
        var temp = prompt('fill the DTD', "JATS");
        returnValue = temp;
    }
    UPLOAD_INFO.dtd = returnValue;
    return returnValue;
};

function SaveProject() {
    var projectInput = (UPLOAD_INFO.projectname) ? (UPLOAD_INFO.projectname) : (getProName());
    var dtdInput = (UPLOAD_INFO.dtd) ? (UPLOAD_INFO.dtd) : (getDTD());
    var clientInput = (UPLOAD_INFO.client) ? (UPLOAD_INFO.client) : (getClient());
    var docidInput = (UPLOAD_INFO.docid) ? (UPLOAD_INFO.docid) : (DOC_ID);
    var clientTypeInput = (UPLOAD_INFO.type) ? (UPLOAD_INFO.docid) : (getClienttype());
    // ? Feature developement
    var mathInput = 0;
    DOC_ID == DOC_ID == null ? docidInput : DOC_ID;
    /*if (projectInput.trim().length==0) {
        alert("Project Name should not be empty");
        projectInput.focus();
        return false;
    }        
    var Formdata = formDataToJson('newprojectform');
     Formdata['dashboard'] = (document.getElementById('projectname').value != '')?(false):(true);*/

    var Formdata = UPLOAD_INFO;
    Formdata['tbl'] = 'Fileslist';
    Formdata['status'] = 'active';
    Formdata['docid'] = DOC_ID;
    Formdata['bucketpath'] = BUCKET_URL;
    Formdata["_r"] = ["5af956974b4bb40a34648f8e"];
    Formdata["_w"] = ["5af956974b4bb40a34648f8e"];
    console.log(Formdata);
    commonfn['callajax'](Formdata, 'Saveprojectpost', API_UPDATE_INSERT, [uniquenumber]);
}
const new_workflow_filter = function () {
    Getuserfiles();
};
const log_out = function () {
    document.location.href = "login.html";
};

function Getuserfiles() {
    var [anyChar, TODAY_START] = ['[A-z]+', (new Date(new Date(new Date().setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').getTime())];
    var [client_opt, linkType_opt, fromTime_opt] = [document.getElementById("client_select"), document.getElementById("upload_select"), document.getElementById("upload_from")];
    var [clientValue, linkType, fromTime] = [anyChar, "pubkit", TODAY_START];
    if (client_opt.value != "all") {
        clientValue = client_opt.value;
    }
    if (fromTime_opt.value != "today") {
        let [diffValue, diffType, valueOpt] = [1, "days", fromTime_opt.value];
        if (fromTime_opt.value == "week") {
            [diffValue, diffType] = [7, "days"];
        } else if (valueOpt == "onemonth") {
            [diffValue, diffType] = [31, "days"];
        } else if (valueOpt == "threemonth") {
            [diffValue, diffType] = [90, "days"];
        } else if (valueOpt == "all") {
            [diffValue, diffType] = [360, "days"];
        }
        fromTime = moment(TODAY_START).subtract(diffValue, diffType).valueOf();

    }
    console.log(moment(fromTime).format("llll"));
    var jsondata = {
        "tbl": "Fileslist",
        "find": {
            'key': {
                "$exists": true
            },
            "linkinfo": {
                "$exists": true
            },
            "client": {
                $regex: clientValue,
                $options: 'i'
            },
            "time_c": {
                $gte: fromTime
            }
        },
        "length": 50
    };
    if (linkType_opt.value != "nonpubkit") {
        if (linkType_opt.value == "pubkit") {
            jsondata.find.linkinfo = {
                $eq: linkType_opt.value
            };
        } else {
            jsondata.find.linkinfo = {
                "$exists": true
            };
        }

    }
    // ? https://stackoverflow.com/questions/8636617/how-to-get-start-and-end-of-day-in-javascript
    const user = localStorage.getItem('xmleditor:userid');
    if (localStorage.getItem('xmleditor:useradminstatus') == "User" && user) {
        jsondata.find = {
            "userid": user
        };
    }
    console.log(jsondata);
    $('#userList tbody').empty();
    VALID_COLLECTION = [];
    commonfn['callajax'](jsondata, 'Displayfiles', API_GET_DOCS_AUTH);
}
//Date Format   

function isoDateReviver(value, type, full) {
    var currentTime = new Date();
    // var currentTime = new Date(parseInt(value.substr(6)));
    var month = currentTime.getMonth() + 1;
    var day = currentTime.getDate();
    var year = currentTime.getFullYear();
    var date = day + "/" + month + "/" + year;
    var JS_ON = {
        "tbl": "Fileslist",
        "find": {
            "recent": 1,
            "docid": full.docid
        },
        "length": 1,
        "sort": {
            'time_c': -1
        },
        "filter": ["file_sn", "time_c"]
    };
    if (FILLTER && full.docid) {
        $.ajax({
            url: API_GET_DOCS,
            data: {
                'jsondata': JS_ON
            },
            type: "post",
            dataType: "JSON",
            async: true,
            contentType: "application/json",
            success: function (response) {
                console.log("suces calling: " + response);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log("error calling: ");
                console.log(textStatus, errorThrown);
            }
        }).done(function (data) {
            console.log(data);

        });
    } else {
        return moment(parseInt(value)).format('DD/MM/YYYY');;
    }
}

function DownloadfileAlert() {
    alert("You will receive an email shortly with download link");
}
//-----------------------------------workflow creation dialog----------------------------------------------
var args = {};

function ShowWorkflowModal(dbid) {
    reviewerstbl = {};
    $('#model-workflow-form')[0].reset();
    $('input').val('');
    args = SERVER_DATA[dbid];
    var jsondata = {
        "tbl": "files",
        "find": {
            "ext": "zip"
        },
        "sort": {},
        "length": 1,
        "filter": ["docid"]
    };
    commonfn['callajax'](jsondata, 'getdocid', API_GET_DOCS_AUTH, args);
}

function loadworkflow() {
    var jsondata = {
        "tbl": "workflow",
        "find": {},
        "length": 100,
        "sort": {},
        "filter": ["workflow", "id"]
    };
    commonfn['callajax'](jsondata, 'loadworkflowpost', API_GET_DOCS_AUTH);
}

function loadworkflowrole() {
    var jsondata = {
        "tbl": "tasksdef",
        "find": {
            "workflow": $('#workflow').val()
        },
        "length": 1000,
        "sort": {},
        "filter": ["role"]
    };
    commonfn['callajax'](jsondata, 'loadworkflowrolepost', API_GET_DOCS_AUTH);
}

/* - called in uispecific
function loadrole() {
  var jsondata = { "tbl": "role", "find": {}, "length":100,"sort": {}, "filter": ["name","id"] };
  commonfn['callajax'](jsondata, 'loadrolepost', API_PATH+"getdocsauth");
}
commonfn['loadrolepost'] = function (response) {
  for(var i=0;i<response.data.length;i++){
    response.data[i]['_id'] = response.data[i]['_id'];
    Roleslist[response.data[i]['_id']]=response.data[i];
  }
}*/
function loadtasks() {
    console.log("workflow value--" + $('#workflow').val() + "role value---" + $('#role').val());
    var jsondata = {
        "tbl": "tasksdef",
        "find": {
            "workflow": $('#workflow').val(),
            "role": $('#role').val()
        },
        "length": 100,
        "sort": {},
        "filter": ["name"]
    };
    commonfn['callajax'](jsondata, 'loadtaskspost', API_GET_DOCS_AUTH);
}

function getreviewersdetails(docid) {
    var jsondata = {
        "tbl": "reviewers",
        "find": {
            "docid": docid
        },
        "length": 1,
        "sort": {}
    };
    commonfn['callajax'](jsondata, 'loadrevieweremailspost', API_GET_DOCS_AUTH);
}

function Updaterecord(dbid, update) {
    var jsondata = {
        "tbl": "Fileslist",
        "status": 0,
        "_id": "dfsdadfsdaf"
    };
    jsondata['_id'] = dbid;
    jsondata['status'] = update;
    jsondata["_r"] = ["5af956974b4bb40a34648f8e"];
    jsondata["_w"] = ["5af956974b4bb40a34648f8e"];
    var url = API_UPDATE_INSERT;
    commonfn['callajax'](jsondata, 'Refreshfolder', url);
}
var args;

function Openeditor(dbrow) {
    args = SERVER_DATA[dbrow];
    console.log(1111);
    if (args) {
        console.log(JSON.stringify(args));
        if (args.docid) {
            window.open("editor6.html?docid=" + args['docid'], '_blank');
        }
    }
    // var jsondata = { "tbl": "Fileslist", "find": { "ext": "zip"}, "sort": {}, "length": 1, "filter": ["file_sn", "ext", "docid"] };
    // console.log(jsondata);
    // commonfn['callajax'](jsondata, 'redirecteditor', API_GET_DOCS_AUTH, args);
    //XSLT will be done at InDesign Export Script
    //var jsondata = {"tbl":"files","find":{"ext":"zip","asoid":args['asoid']},"sort":{},"filter":["file_sn","asoid","ext"]};
    //jsondata['find']['asoid']=args['asoid'];
    //console.log(jsondata);
    //commonfn['callajax'](jsondata,'GetFolderList', API_PATH+"getdocsauth", args);
}

function uploadPlugin(id1 = 0, divToBind = "document.body") {
    var cntl = '<div id="actions" class="row">' +
        '<div class="col-lg-7">' +
        '<span id = "addfiles" class="btn btn-success fileinput-button" style="margin-right: 18px;">' +
        '<i class="glyphicon glyphicon-plus"></i>' +
        '<span>Add files</span>' +
        '</span>' +
        '<button type="submit" class="btn btn-primary start" style="display:none;">' +
        '<i class="glyphicon glyphicon-upload"></i>' +
        '<span>Start upload</span></button>' +
        '<button type="reset" class="btn btn-warning cancel">' +
        '<i class="glyphicon glyphicon-ban-circle"></i>' +
        '<span>Cancel upload</span>' +
        '</button>' +
        '</div>' +
        '<div class="col-lg-5">' +
        '<span class="fileupload-process">' +
        '<div id="total-progress" class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
        '<div class="progress-bar progress-bar-success" style="width:0%;" data-dz-uploadprogress></div>' +
        '</div>' +
        '</span>' +
        '</div>' +
        '</div>' +
        '<div class="table table-bordered table-striped table-hover files" id="previews">' +
        '<div id="template" class="file-row">' +
        '<div>' +
        '<span class="preview"><img data-dz-thumbnail /></span>' +
        '</div>' +
        '<div>' +
        '<p class="name" data-dz-name></p>' +
        '<strong class="error text-danger" data-dz-errormessage></strong>' +
        '</div>' +
        '<div>' +
        '<p class="size" data-dz-size></p>' +
        '<div id= "active" class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
        '<div class="progress-bar progress-bar-success" style="width:0%;" data-dz-uploadprogress></div>' +
        '</div>' +
        '</div>' +
        '<div>' +
        '<button class="btn btn-primary start">' +
        '<i class="glyphicon glyphicon-upload"></i>' +
        '<span>Start</span>' +
        '</button>' +
        '<button data-dz-remove class="btn btn-warning cancel">' +
        '<i class="glyphicon glyphicon-ban-circle"></i>' +
        '<span>Cancel</span>' +
        '</button>' +
        '<button data-dz-remove class="btn btn-danger delete">' +
        '<i class="glyphicon glyphicon-trash"></i>' +
        '<span>Delete</span>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    $(divToBind).html(cntl);
    var previewNode = document.querySelector("#template");
    previewNode.id = "";
    var previewTemplate = previewNode.parentNode.innerHTML;
    previewNode.parentNode.removeChild(previewNode);
    // Make the whole body a dropzone
    myDropzone = new Dropzone(divToBind, {
        url: API_PATH + 'filesuploadandunzipwithconfigconv',
        params: {
            'tbl': 'Fileslist',
            '_r': ["5af956974b4bb40a34648f8e"],
            '_w': ["5af956974b4bb40a34648f8e"],
            'autoconversion': 'yes',
            'bucketpath': BUCKET_URL
        },
        headers: {
            "appkey": localStorage.getItem('xmleditor:appkey'),
            "apikey": localStorage.getItem('xmleditor:apikey')
        },
        thumbnailWidth: 80,
        thumbnailHeight: 80,
        parallelUploads: 20,
        previewTemplate: previewTemplate,
        timeout: 600000,
        // Make sure the files aren't queued until manually added
        autoQueue: true,
        // Define the container to display the previews
        previewsContainer: "#previews",
        // Define the element that should be used as click trigger to select files.
        clickable: ".fileinput-button"
    });
    myDropzone.on("addedfile", function (file) {
        // Hookup the start button
        file.previewElement.querySelector(".start").onclick = function () {
            myDropzone.enqueueFile(file);
        };
    });
    // Update the total progress bar
    myDropzone.on("totaluploadprogress", function (progress) {
        document.querySelector("#total-progress .progress-bar").style.width = progress + "%";
    });
    myDropzone.on("sending", function (file, xhr, data) {
        data.append("status", "active");
        data.append("sopt", "openstorage");
        // Show the total progress bar when upload starts
        document.querySelector("#total-progress").style.opacity = "1";
        // And disable the start button
        file.previewElement.querySelector(".start").setAttribute("disabled", "disabled");
    });
    // Hide the total progress bar when nothing's uploading anymore
    myDropzone.on("queuecomplete", function (progress) {
        document.querySelector("#total-progress").style.opacity = "0";
        document.querySelector("#active").style.opacity = "0";
        FileuplloadFlag = true;
    });
    myDropzone.on("success", function (file, response) {
        var obj = JSON.parse(response);
        console.log(obj.docinfo);
        if (obj.docinfo) {
            UPLOAD_INFO = JSON.parse(obj.docinfo);
        }
        DOC_ID = obj.docid;
        console.log("docid: " + DOC_ID);
        $('#docid').val(DOC_ID);
        $("#userinfo").html("<b style='color:green;'>File is uploaded and Unziped. Please wait Indesign conversion process started...</b>");

        //indesign conversion process
        console.log(JSON.stringify(response));
        $("#loadingid").show();
        var mygenid = guid();
        localStorage.setItem('userUniqueId', mygenid);
        myuserUniqueId = localStorage.getItem("userUniqueId");
        messageObjconc.username = myuserUniqueId;
        //socket.emit('setuseridentity', messageObjconc);
        let conFollwedBy = UPLOAD_INFO.client == 'TandF' ? 'inddtoxmlwithpng' : 'xmltohtml';
        let IsXMLProcess = mylocalhost == 'undefined' || UPLOAD_INFO.client != 'TandF' ? true : false;
        let convertFileExt = IsXMLProcess ? 'xml' : 'indd';
        //let conFollwedBy ='xmltohtml';
        //let convertFileExt = 'xml';
        if (!IsXMLProcess) {
            var jsondata = {
                'docid': DOC_ID,
                "ext": convertFileExt,
                "topic": MY_TOPIC,
                "username": myuserUniqueId,
                "platform": conFollwedBy
            };
            jsondata["files"] = [];
            jsondata["files"].push(DOC_ID + '.' + convertFileExt);
            jsondata["fileson"] = [];
            jsondata["fileson"].push(DOC_ID + '.' + convertFileExt);
            jsondata["client"] = (UPLOAD_INFO.client) ? (UPLOAD_INFO.client) : (getClient());
            jsondata["type"] = (UPLOAD_INFO.type) ? (UPLOAD_INFO.type) : (getClienttype());
            jsondata["dtd"] = (UPLOAD_INFO.dtd) ? (UPLOAD_INFO.dtd) : (getDTD());
            jsondata["projectname"] = (UPLOAD_INFO.projectname) ? (UPLOAD_INFO.projectname) : (getProName());
            console.log(jsondata);
            commonfn['callajax'](jsondata, 'updatedpdfres', API_KAFKA_PRODCER);
        } else if (obj.r == 1) {
            SaveProject();
            $('#projinput').hide();
            $("#loadingid").hide();
            swal("info !", "Process done successfully.", "success")
                .then((value) => {
                    window.location.reload(true);
                });
        } else {
            SaveProject();
            $("#loadingid").hide();
            $("#userinfo").html("<b style='color:red;'>File has some error. Please check with technical team.</b>");
            swal("info", "File has some error. Please check with technical team.", "error");
        }
    });
    //           myDropzone.on("error", function(file, errormessage, xhr){
    //         	    if(xhr) {
    //         	        var response = JSON.parse(xhr.responseText);
    //         	        alert(response.message);
    //         	    }
    //         	});
    // Setup the buttons for all transfers
    // The "add files" button doesn't need to be setup because the config
    // `clickable` has already been specified.
    document.querySelector("#actions .start").onclick = function () {
        myDropzone.enqueueFiles(myDropzone.getFilesWithStatus(Dropzone.ADDED));
    };
    document.querySelector("#actions .cancel").onclick = function () {
        myDropzone.removeAllFiles(true);
        // removes all listeners attached with Emitter.on()
        myDropzone.off();
    };
}

function openLandingPage(id, eventIndex) {
    if (Array.isArray(VALID_COLLECTION) && VALID_COLLECTION.length > 0) {
        // Find the matching entry
        const entry = VALID_COLLECTION.find(f => f._id == id);

        if (!entry) {
            console.warn(`No entry found for id: ${id}`);
            return;
        }

        const client = entry.client && entry.client.toLowerCase();
        const key = entry.key;

        if (client && key) {
            const makeUrl = `${DOMAIN_ROOT}${IS_LOCAL_HOST?'dist/':''}validateurl${client}.html?key=${encodeURIComponent(key)}`;
            window.open(makeUrl, "_blank");
        } else {
            console.warn(`Missing client or key for id: ${id}`);
        }
    }
}

// To start workflow
function projectprocess(project, eventindex) {
    projectid = project;
    localStorage.setItem('xmleditor:eventindex', eventindex);
    var jsondata = {
        "tbl": "ProjectProcess",
        "find": {
            "project": projectid
        },
        "sort": {},
        "filter": []
    };
    commonfn['callajax'](jsondata, 'getprojectprocess', API_GET_DOCS_AUTH);
}

function getramdon() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4();
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function getTenants() {
    console.log("Sending group message");
    var message;
    message = {
        'm': message
    };
    var messageObj = {
        'username': userName,
        'message': message,
        'toname': 'user476',
        'groupname': group,
        'appname': 'xmleditor'
    };
    messageObj.toname = localStorage.getItem('toname');
    messageObj.username = localStorage.getItem('xmleditor:username');
    // added
    messageObj.groupname = 'xmleditor';
    // console.log(messageObj);
    //socket.emit('listtenants', messageObj);
}

function deleteRecord(tblname, id) {
    if ((tblname.indexOf("r")) == 0) {
        tblname = tblname.substr(1);
    }
    var jsondata = {
        "tbl": tblname,
        "_id": id
    };
    var url = API_DEL_RECORD;
    console.log(JSON.stringify(jsondata));
    commonfn['callajax'](jsondata, 'deleterecordpost', url);
    $('#row' + id).remove();
}

function redirectPage(ths) {
    var _dir = ths.getAttribute('data-page');
    if (_dir == null || _dir == '' || _dir == undefined) {
        swal("Missing!", "Web Page Missing", "error");
        return false;
    }
    var reDirect = DOMAIN_ROOT + _dir + '.html';
    window.open(reDirect, '_blank');
}

function modelpopup(target) {
    document.getElementById('myModal').style.display = target.id != 'closeBut' ? "block" : "none";
}