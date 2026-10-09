
$(document).ready(function () {
    var [email_DOM, password_DOM, BTN_DOM] = [document.getElementById('loginEmail'), document.getElementById('loginPwd'), document.getElementById("login-smt")];
    if (IS_LOCAL_HOST) {
        console.log("LOCAL_HOST");
        [email_DOM.value, password_DOM.value, BTN_DOM.disabled] = ["sivakumars@newgen.co", "test123", false];
        // password_DOM.value = "test123";
        // BTN_DOM.disabled = false;

        var ua = navigator.userAgent.toLowerCase();
        if (ua.indexOf('safari') != -1) {
            if (ua.indexOf('chrome') != -1) { } else {
                setTimeout(function (btn) {
                    btn.click();
                }, 1000, BTN_DOM);
            }
        }
    }
    if (window.location.pathname.includes("pubkit")) {
        var urlParams = new URLSearchParams(window.location.search);
        var entries = urlParams.entries();
        for (pair of entries) {
            argus[pair[0]] = pair[1];
        }
        console.log(argus);

        var jsondata = {
            "corporateLoginURL": "https://pubsub.newgen.co/reportsmicro/api/supportedservices/validatetoken?email=" + argus['email'] + "&token=" + argus['token']
        };
        var url = API_PATH + "corporatelogin";
        commonfn['callajax'](jsondata, 'corporateloginvalid', url);
        commonfn['corporateloginvalid'] = function (response) {
            console.log("corporateloginvalid");
            console.log(JSON.stringify(response));
            console.log(response.data);
            if (response.r == 1 && response.data.full_name != undefined) {
                localStorage.setItem('xmleditor:appkey', 'xmleditor');
                var jsondata = {
                    "email": argus['email']
                };
                var url = API_PATH + "userloginpubkit";
                commonfn['callajax'](jsondata, 'setlogin', url);
            } else {
                swal("Oops !", argus['email'] + " is not exists in Pubkit!", "error")
                    .then((value) => {
                        // window.location.reload(true);
                        window.location.href = "login.html";
                    });
            }
        };
    }


    $('#loginPwd').keypress(function (e) {
        var key = e.which;
        if (key == 13) {
            $('#login-smt').click();
            return false;
        }
    });
    // Login
    $('#login-smt').click(function (e) {
        $("#loadingid").show();
        ['emailvalidate', 'passwordvalidate', 'loginvalidate', 'incorrectemail'].forEach(id => {
            var element = document.getElementById(id);
            element.classList.add('d-none');
        });
        var email = document.getElementById('loginEmail').value;
        var password = document.getElementById('loginPwd').value;
        if ((email == '') || (!isEmail(email))) {
            var element = document.getElementById("emailvalidate");
            element.style.display = "block";
            $('#loginEmail').focus();
            $("#loadingid").hide();
            return false;
        } else if ((password == '')) {
            var element = document.getElementById("passwordvalidate");
            element.style.display = "block";
            $('#loginPwd').focus();
            $("#loadingid").hide();
            return false;
        } else {
            localStorage.setItem('xmleditor:appkey', 'xmleditor');
            var jsondata = {
                "email": email,
                "password": password
            };
            var url = API_PATH + "userlogin";
            console.log(jsondata, url);
            commonfn['callajax'](jsondata, 'setlogin', url);
        }
    });
});

function isEmail(email) {
    var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    return regex.test(email);
}

function isPassword(password) {
    var regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d$@$!%*#?&]{8,}$/;
    return regex.test(password);
}
commonfn.callajax = function (jsondata, postfun, url, opt = '') {
    try {
        jsondata = JSON.stringify(jsondata);
        var myasync = true;
        if (jsondata.impasyn != undefined) {
            myasync = false;
        }
        $.ajax({
            url: url,
            data: {
                'jsondata': jsondata
            },
            type: "post",
            dataType: "JSON",
            async: myasync,
            contentType: "application/json",
            success: function (response) {
                commonfn[postfun](response, opt);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log("error calling: " + postfun);
                console.log(textStatus, errorThrown);
            }
        });
    } catch (errcfn) {
        console.warn(errcfn.message);
        ErrorLogTrace('callajax', errcfn.message);
    }
};

commonfn['setlogin'] = function (response) {
    console.log(JSON.stringify(response));
    //07-08-2023
    if (!response.username) {
        var element = document.getElementById("incorrectemail");
        element.style.display = "block";
        $(element).removeClass('d-none');
        $("#loadingid").hide();
        return false;
    }
    if (response.cred == 0) {
        var element = document.getElementById("incorrectpassword");
        element.style.display = "block";
        $(element).removeClass('d-none');
        $("#loadingid").hide();
        return false;
    }
    if (response.username) {
        /* response.cred == 1 && */
        if (response.displayName != undefined || response.displayName != '') {
            $('#idname').text(response.displayName);
        } else {
            var Word = null;
            var rg = /(^\w{1}|\s\w{1}|\.\w{1})/gi;
            Word = response.username.replace(rg, function (toReplace) {
                return toReplace.toUpperCase().replace(/@\w+\.\w+(\.\w+)?/g, "").replace('.', ' ');
            });
            $('#idname').text(Word);
        }
        localStorage.setItem('xmleditor:appkey', 'xmleditor');
        localStorage.setItem('xmleditor:apikey', response.apikey ? response.apikey : User_API_KEY);
        localStorage.setItem('xmleditor:login_username', response.username);
        localStorage.setItem('xmleditor:login_displayname', response.displayName);
        // localStorage.setItem('xmleditor:login_createdid', response._id);
        localStorage.setItem('xmleditor:login_userid', response._id);
        if (response.client) localStorage.setItem("xmleditor:login_client", response.client);
        if (response._client_list) localStorage.setItem("xmleditor:login_client_list", response._client_list.join(","));
        if (response._workflow_role) localStorage.setItem("xmleditor:login_workflow_role", response._workflow_role);
        if (IS_LOCAL_HOST) {
            localStorage.setItem('xmleditor:userRole', '5b53536b4c4a803e9a5abf70');
            localStorage.setItem('xmleditor:username', response.username);
        }
        var NAME_USER = response.username,
            I_ADMIN = false,
            IS_QA = false,
            USER = btoa(NAME_USER.split('@')[0].trim());
        if (MAIL_DETAIL['ADMIN_USERS_EMAIL'].includes(USER)) {
            localStorage.setItem('xmleditor:admin', 'superadmin');
            localStorage.removeItem('xmleditor:qa');
            I_ADMIN = true;
        } else {
            if (MAIL_DETAIL['QA_USERS_EMAIL'].includes(USER)) {
                IS_QA = true;
                localStorage.setItem('xmleditor:qa', 'superqa');
            } else {
                localStorage.removeItem('xmleditor:qa');
            }
            localStorage.removeItem('xmleditor:admin');
        }
        // IS_LOCAL_HOST ? "admindashboard.html" : "filterdashboard.html"
        window.location.href = (I_ADMIN ? "admin" : "") + "dashboard.html";
    } else {
        var element = document.getElementById("loginvalidate");
        element.style.display = "block";
    }
    $("#loadingid").hide();
};

function changeHandler() {
    var element = document.getElementById("incorrectemail");
    var loginEmail = document.getElementById('loginEmail').value;
    var loginPwd = document.getElementById('loginPwd').value;
    element.style.display = "none";
    if (loginEmail == null || loginEmail == "" || loginPwd == null || loginPwd == "") {
        document.getElementById("login-smt").disabled = true;
    } else if (!isEmail(loginEmail)) {
        element.style.display = "block";
    } else {
        document.getElementById("login-smt").disabled = false;
    }
}