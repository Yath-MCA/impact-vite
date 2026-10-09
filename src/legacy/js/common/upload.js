var UPLOAD_INFO = {};
var myDropzone, DOC_ID, UniqueId, zoneId = "d-zone1";
var mylocalhost = IS_LOCAL_HOST ? '0' : '1';

function getramdon() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4();
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}
var unique_number = new Date().getTime() + '-' + getramdon() + '-' + getramdon() + '-' + getramdon();
const getClient_Type = function() {
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
const getClient = function() {
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

const getProName = function() {
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
const getDTD = function() {
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
commonfn['Saveprojectpost'] = function(response, args) {
    console.log("Project saved.");
    console.log(JSON.stringify(response));

};

function SaveProject(IsXML) {
    let conFollwedBy = UPLOAD_INFO.client == 'TandF' ? 'inddtoxmlwithpng' : 'xmltohtml';
    let convertFileExt = IsXML ? 'xml' : 'indd';
    if (IsXML) {
        var Formdata = UPLOAD_INFO;
        Formdata['tbl'] = 'Fileslist';
        Formdata['status'] = 'active';
        Formdata['docid'] = DOC_ID;
        Formdata['bucketpath'] = BUCKET_URL;
        Formdata["_r"] = ["5af956974b4bb40a34648f8e"];
        Formdata["_w"] = ["5af956974b4bb40a34648f8e"];
        console.log(Formdata);
        commonfn['callajax'](Formdata, 'Saveprojectpost', API_UPDATE_INSERT, [unique_number]);
    } else {
        var jsondata = {
            'docid': DOC_ID,
            "ext": convertFileExt,
            "topic": MY_TOPIC,
            "username": UniqueId,
            "platform": conFollwedBy,
            "files": [],
            "fileson": [],
            "client": (UPLOAD_INFO.client) ? (UPLOAD_INFO.client) : (getClient()),
            "type": (UPLOAD_INFO.type) ? (UPLOAD_INFO.type) : (getClient_Type()),
            "dtd": (UPLOAD_INFO.dtd) ? (UPLOAD_INFO.dtd) : (getDTD()),
            "projectname": "",
        };
        jsondata["files"].push(DOC_ID + '.' + convertFileExt);
        jsondata["fileson"].push(DOC_ID + '.' + convertFileExt);
        jsondata["type"] = (UPLOAD_INFO.type) ? (UPLOAD_INFO.type) : (getClient_Type());
        jsondata["dtd"] = (UPLOAD_INFO.dtd) ? (UPLOAD_INFO.dtd) : (getDTD());
        jsondata["projectname"] = (UPLOAD_INFO.projectname) ? (UPLOAD_INFO.projectname) : (getProName());
        console.log(jsondata);
        commonfn['callajax'](jsondata, 'updatedpdfres', API_KAFKA_PRODCER);
    }
}


var InitiateDropZone = {
    DESTROY: function() {
        try {
            // Find existing Dropzone instances
            Dropzone.instances.forEach(instance => {
                if (instance.element) {
                    // Destroy the existing instance
                    instance.destroy();
                }
            });
        } catch (error) {

        }
    },
    FIRE_ONCE: function(template) {
        var existingDOM = document.body.querySelector("#form-upload");
        if (existingDOM) {
            existingDOM.remove();
        }
        this.DESTROY();
        $('.modal-body.upload').append(template);
        var previewNode = document.querySelector("#upload-template");
        var previewTemplate = previewNode.parentNode.innerHTML;
        previewNode.id = "";
        previewNode.parentNode.removeChild(previewNode);
        // Make the whole body a dropzone
        myDropzone = new Dropzone(document.body, {
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
            clickable: "#uploadZoneBtn"
        });
        var cancelBtn = document.querySelector("#uploadCancel");
        if (document.querySelector("#actions")) {
            document.querySelector("#actions .start").onclick = function() {
                myDropzone.enqueueFiles(myDropzone.getFilesWithStatus(Dropzone.ADDED));
            };
        }
        if (cancelBtn) {
            cancelBtn.onclick = function() {
                myDropzone.removeAllFiles(true);
                // removes all listeners attached with Emitter.on()
                myDropzone.off();
            };
        }

        myDropzone.on("addedfile", function(file) {
            // Hookup the start button
            if (file.previewElement.querySelector(".start")) {
                file.previewElement.querySelector(".start").onclick = function() {
                    myDropzone.enqueueFile(file);
                };
            }
        });
        // Update the total progress bar
        myDropzone.on("totaluploadprogress", function(progress) {
            document.querySelector("#total-progress .progress-bar").style.width = progress + "%";
        });
        myDropzone.on("sending", function(file, xhr, data) {
            data.append("status", "active");
            data.append("sopt", "openstorage");
            // Show the total progress bar when upload starts
            document.querySelector("#total-progress").style.opacity = "1";
            // And disable the start button
            file.previewElement.querySelector(".start").setAttribute("disabled", "disabled");
        });
        // Hide the total progress bar when nothing's uploading anymore
        myDropzone.on("queuecomplete", function(progress) {
            document.querySelector("#total-progress").style.opacity = "0";
            document.querySelector("#active").style.opacity = "0";
            FileuploadFlag = true;
        });
        myDropzone.on("success", function(file, response) {
            var obj = JSON.parse(response);
            var UniqueId = guid();
            // console.log(obj.docinfo);
            console.log(JSON.stringify(response));
            if (obj.docinfo) {
                UPLOAD_INFO = JSON.parse(obj.docinfo);
            }
            DOC_ID = obj.docid;
            $("#loadingid").show();
            localStorage.setItem('userUniqueId', UniqueId);
            let IsXMLProcess = mylocalhost == 'undefined' || UPLOAD_INFO.client != 'TandF' ? true : false;
            SaveProject(IsXMLProcess);
            $("#loadingid").hide();
            if (obj.r == 1) {
                Swal.fire("", "Process done successfully.", "success")
                    .then((value) => {
                        window.location.reload(true);
                    });
            } else {
                Swal.fire("", "File has some error. Please check with technical team.", "error");
                cancelBtn.click();
            }
        });

    }
};

document.addEventListener('DOMContentLoaded', function(event) {
    (function($, template) {
        $(document.body).append(template);
        $('#uploadPackage').on('shown.bs.modal', function() {
            this.classList.remove("fade");
            this.classList.add("show");
            InitiateDropZone.FIRE_ONCE(`<form class="form" action="#" method="post" id="form-upload">
                        <div class="fv-row">
                            <div class="dropzone" id="">
                                    <div class="table table-striped" class="files" id="previews">
                                    <div id="upload-template" class="file-row">
                                        <div><span class="preview"><img data-dz-thumbnail /></span></div>
                                        <div><p class="name h5" data-dz-name></p><strong class="error text-danger" data-dz-errormessage></strong></div>
                                        <div><p class="size" data-dz-size></p><div class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-bar progress-bar-success" style="width:0%;" data-dz-uploadprogress></div></div></div>
                                        <div class="mt-2">
                                            <button class="btn btn-primary start d-none"><i class="fa fa-upload"></i><span>Start</span></button>
                                            <button data-dz-remove class="btn btn-warning cancel"><i class="fa fa-times-circle-o"></i><span>Cancel</span></button>
                                            <button data-dz-remove class="btn btn-danger delete"><i class="fa fa-trash-o"></i><span>Delete</span></button>
                                        </div>
                                    </div>
                                    </div>
                                <div>
                                    <p class="size" data-dz-size></p>
                                    <span class="fileupload-process d-none"><div id="total-progress" class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-bar progress-bar-success" style="width:0%;" data-dz-uploadprogress=""></div></div></span>
                                    <span id="d-zone1" name="title"></span>
                                </div>
                                <div class="dz-message needsclick">
                                    <i class="ki-duotone ki-file-up fs-3x text-primary"><span class="path1"></span><span class="path2"></span></i>
                                    <div class="ms-4">
                                        <span class="fs-7 fw-semibold text-gray-500 d-none">Upload up to 10 files</span>
                                        <span style="" id="d-zone1" name="title"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>`);

        });
    })(jQuery, `<div class="modal fade show" id="uploadPackage" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="uploadLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title text-center" id="uploadLabel">New Upload</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body upload" id="">
                    <h6 class="fs-5 fw-bold text-gray-900 mb-1">Drop files here or click to upload.</h6>                    
                </div>
                <div class="modal-footer">
                    <button class="btn start d-none"><i class="glyphicon glyphicon-upload"></i><span>Start</span></button>
                    <button type="button" class="btn btn-secondary" data-dismiss="modal" id="uploadCancel">Cancel</button>
                    <button type="button" class="btn btn-primary" id="uploadZoneBtn">Upload</button>
                </div>
            </div>
        </div>
    </div>`);
});