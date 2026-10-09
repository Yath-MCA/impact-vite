var AlertModule = {
    "template": `<div class="container ds-none" id="AlertModuleModule" tabindex="0">
                    <div id="body_container">
                        <div class="alertBody">
                            <div id="left_container" class=""><img class="alert_left_icon" alt="close" src="assets/images/svg/dialogClose.svg"></div>
                            <div id="right_container" class="">
                                    <div class="alertTitle"></div>
                                    <div class="alertContent"></div>
                                    <div id="warnDiv" class="warning-block ds-none"></div>
                            </div>
                        </div>
                        <div class="alertButton m-2">
                            <div class="d-flex justify-content-end p-2">
                                <button id="outline-danger" tabindex="-1" title="No, Cancel" class="btn btn-sm outline-danger-btn mr-2"></button>
                                <button id="danger" tabindex="0" title="Cancel" class="btn danger-btn btn-sm mr-2"></button>
                                <button id="sucess" tabindex="0" title="Ok" class="btn sucess-btn btn-sm"></button>
                            </div>                            
                        </div>
                    </div>
                </div>`,
    iPROMISE: null,
    AddHtml_AddText: function(txt, Options, _ = this) {
        let {
            AddText,
            AddHtml
        } = Options;
        try {
            let configVal = ALERT_MESSAGE[AddText ? AddText : AddHtml];
            return txt + (configVal ? configVal.text : (AddText ? AddText : AddHtml));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('AddHtml_AddText', err.message);
        }

    },
    CheckTimeOut: function(config, _) {
        try {
            _ = this;
            var TIMER = null;
            if (this.M_CONFIG.timeout[config]) {
                let config_json = this.M_CONFIG.timeout[config];
                let timer = config_json.timer;
                if (config_json.type == 'setInterval') {
                    TIMER = setInterval(() => {
                        if (timer > 0) {
                            $('#alert-timer').html(timer);
                            timer -= 1;
                        } else {
                            _.outdangerbtn.click();
                            clearInterval(TIMER);
                        }
                    }, config_json.delay);
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('CheckTimeOut', err.message);
        }
    },
    FullyLoaded: false,
    _Id: "AlertModuleModule",
    init: function() {
        if (!document.body) {
            setTimeout(() => {
                AlertModule.init();
            }, 2000);
        } else {
            if (!document.getElementById(this._Id) && this.template) {
                let fragment = document.createRange().createContextualFragment(this.template);
                let Model = document.getElementById('ModelDialogAppend');
                if (Model) Model.append(fragment);
                else document.body.append(fragment);
            }
            this.Module = document.getElementById(this._Id);
            this.Title = this.Module.querySelector('.alertTitle');
            this.Full_Body = this.Module.querySelector('#body_container');
            this.Body = this.Module.querySelector('.alertBody');
            this.alertRight = this.Module.querySelector('#right_container');
            this.alertLeft = this.Module.querySelector('#left_container');
            this.alert_LeftImg = this.Module.querySelector('.alert_left_icon');
            this.Content = this.Module.querySelector('.alertContent');
            this.warnDiv = this.Module.querySelector('.warning-block');
            // ? confirmation Yes
            this.sucessbtn = this.Module.querySelector('.sucess-btn');
            // ? Ok
            this.dangerbtn = this.Module.querySelector('.danger-btn');
            // ? confirmation cancel
            this.outdangerbtn = this.Module.querySelector('.outline-danger-btn');
            this.FullyLoaded = true;

        }
    },
    IsShown: function() {
        try {
            return commonMethods.IsVisibleElm(this.Module);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('IsShown', err.message);
        }
    },
    M_CONFIG: {
        ICONS: {
            "warning": "assets/images/svg/alert/WARNING.svg",
            "error": "assets/images/svg/alert/ERROR.svg",
            "info": "assets/images/svg/alert/INFO.svg",
            "success": "assets/images/svg/alert/SUCCESS.svg"
        },
        return_promise: {
            "danger": {
                isConfirmed: true,
                isDenied: false,
                value: 'sucess',
            },
            "outline-danger": {
                isConfirmed: false,
                isDenied: true,
                value: 'denied',
            },
            "sucess": {
                isConfirmed: true,
                isDenied: false,
                value: 'sucess',
            }
        },
        timeout: {
            "idle_session_alert": {
                // setTimeout
                "type": 'setInterval',
                "delay": 1000,
                "timer": 30
            }
        }
    },
    fire: function(acase, title, content, btn1, btn2, IsPromise, Options) {
        try {
            if (this.last_alert && typeof this.last_alert.override != "undefined" && this.last_alert.override == false && this.IsShown()) {
                return;
            }
            Options = Options ? Options : ((typeof title == "object") ? title : {
                hide: true,
                override: true
            });
            this.last_alert = Options;
            if (!this.FullyLoaded) this.init();
            // ? let fromConfig = ALERT_MESSAGE[content];
            // ? get message from common objects
            var btn3 = null;
            if (typeof this.init == 'undefined') this.init();
            if (typeof ALERT_MESSAGE != 'undefined' && typeof ALERT_MESSAGE[acase] != 'undefined') {
                this.tempConfig = acase;
                let temp_config = ALERT_MESSAGE[acase];
                acase = temp_config['type'];
                title = temp_config['title'];
                content = temp_config['text'];
                btn1 = temp_config['button1'];
                btn2 = temp_config['button2'];
                btn3 = temp_config['button3'] || null;
                IsPromise = temp_config['param'];
                Options = (Options.force ? Options : (temp_config['Options'] ? temp_config['Options'] : Options));
            } else {
                this.tempConfig = content;
                content = (content && typeof ALERT_MESSAGE != 'undefined' && typeof ALERT_MESSAGE[content] != 'undefined') ? ALERT_MESSAGE[content]['text'] : content;
            }
            if (Options.AddText || Options.AddHtml) {
                // ? 16-JAN-2023 - YA
                content = this.AddHtml_AddText(content, Options);
            }
            if (!$('body').find('.modal-backdrop').length) {
                $('body').append('<div class="modal-backdrop show"></div>');
            }
            // ? BODY DEFAULT VALUES SETTING
            [this.Title.textContent, this.Content.innerHTML, this.alert_LeftImg.src] = [title, content, this.M_CONFIG.ICONS[acase]];
            this.Title.classList[((title == '') ? 'add' : 'remove')]('ds-none');
            [this.Full_Body.className] = [acase];
            this.Add_BreakLine_WarningBox(content, Options);
            this.CheckTimeOut(this.tempConfig);
            this.Module.classList.remove('ds-none');
            // ? SHOW / HIDE BUTTONS BASED ON CONDITIONS
            this.sucessbtn.textContent = this.sucessbtn.title = this.dangerbtn.textContent = this.dangerbtn.title = btn1;
            this.outdangerbtn.textContent = this.outdangerbtn.title = btn2;
            if (['success', 'info'].includes(acase)) {
                this.sucessbtn.focus();
            } else {
                this[btn2 == '' ? 'dangerbtn' : 'outdangerbtn'].focus();
                if (btn2 != '') {
                    // ? SHOWING OUT_DANGER BUTTON
                    this.Full_Body.classList.add("out");
                }
                if (btn3 != null && btn3 != "") {
                    this.Full_Body.classList.add("outer");
                    this.dangerbtn.textContent = this.dangerbtn.title = btn3;
                }
                if ((btn1 == null || btn1 == "") && (btn2 == null || btn2 == "") && (btn3 == null || btn3 == "")) {
                    var footer = this.Module.querySelector(".alertButton");
                    if (footer) {
                        footer.classList.add("d-none");
                        this.Body.classList.add("mb-5");
                    }
                }
            }
            //  ? WIDTH AND HEIGHT HANDLING
            let IsExpend = !!content && content.length > 185 ? true : false;
            [this.Module.style.width, this.Content.style.width] = [`${IsExpend ? 40 : 30}%`, `${IsExpend ? 100 : 98}%`];
            this.alertLeft.style.lineHeight = (this.Full_Body.clientHeight > 60 ? 4.5 : 2.5);
            $('.modal-backdrop.show').css('opacity', '0.3').css('z-index', '99998');
            this.state = 1;
            var _ = this;
            return new Promise(function(resolve) {
                try {
                    [_.dangerbtn, _.outdangerbtn, _.sucessbtn].forEach((btn, idx, arr) => {
                        btn.onclick = function() {
                            try {
                                let returnObject = _.M_CONFIG.return_promise[btn.id];
                                if (_.Full_Body.classList.contains("outer") && btn.id == "sucess") {
                                    returnObject.button3 = true;
                                }
                                resolve(returnObject);
                                if (Options.hide || typeof Options.hide == "undefined") {
                                    _.hide();
                                }
                            } catch (err) {
                                console.warn(err.message);
                                ErrorLogTrace('btn.onclick', err.message);
                            }
                        };
                    });
                } catch (err) {
                    console.warn(err.message);
                    ErrorLogTrace('new Promise', err.message);
                }
            });
        } catch (err) {
            AlertModule.hide();
            console.warn(err.message);
            ErrorLogTrace('AlertModule', err.message);
        }
    },
    breakEntity: '##br##',
    Add_BreakLine_WarningBox: function(content, Options = {}, _ = AlertModule) {
        try {
            if (content == undefined) {
                _.warnDiv.classList.add("ds-none");
                return;
            } else if (!!content) {
                let [IsBreakHere, IsHtmlHere, IsWarningBox] = [false, false, Options.warnBlock];
                // ? 30_MAY_2023 - YA  - WARNING BOX  HANDLE
                if (Options["warnHtml"]) {
                    _.warnDiv.classList[(IsWarningBox ? "remove" : "add")]("ds-none");
                    _.warnDiv.innerHTML = ((IsWarningBox && Options["warnHtml"]) ? Options.warnHtml : "");
                }
                let CheckBreakHml = function() {
                    try {
                        IsBreakHere = content.indexOf(_.breakEntity) > -1 ? true : false;
                        IsHtmlHere = content.match(/<|>/) != null;
                    } catch (err) {
                        console.warn(err.message);
                        ErrorLogTrace('CheckBreakHml', err.message);
                    }
                };
                CheckBreakHml();
                if ((Options.find && Options.replace) || (IsHtmlHere && IsBreakHere)) {
                    _.Content.innerHTML = content.split(Options.find).join(Options.replace);
                    if (IsBreakHere) {
                        _.Content.innerHTML = content.split(_.breakEntity).join("<br/>");
                    }
                } else if (Options.replace) {
                    // 02_JULY_23_YA
                    ErrorLogTrace('replace_with_dynmic', content);
                }
                CheckBreakHml();
                // ? 20_NOV_2023_YA
                if (Options.Mustache || (content.indexOf("{{") > -1 && content.indexOf("}}") > -1)) {
                    if (!Options.DOC_TYPE) Options.DOC_TYPE = (DOC_DTD == "JATS" ? 'article' : 'book/chapters');
                    let reTurnObj = GET_SENDER_RECEIVER_ID('HELP_DESK');
                    Options = Object.assign(Options, reTurnObj);
                    content = _.Content.innerHTML = Mustache.render(content, Options);
                }
                if (IsBreakHere && !IsHtmlHere) {
                    var newDom = document.createElement('div');
                    var split = content.split(' ');
                    split.forEach((node, idx, arr) => {
                        let IsBreak = node == this.breakEntity;
                        let add_prefix = idx === 0 ? '' : ' ';
                        newDom.appendChild(
                            document[IsBreak ? 'createElement' : 'createTextNode'](
                                IsBreak ? 'br' : (add_prefix + node)
                            )
                        );
                    });
                    this.Content.innerHTML = newDom.innerHTML;
                }
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('AddBreakLine', err.message);
        }
    },
    hide: function() {
        this.state = 0;
        $('.modal-backdrop.show').remove();
        this.warnDiv.classList.add("ds-none");
        this.warnDiv.innerHTML = "";
        this.Module.classList.add('ds-none');
        // if (IS_EDITOR_PAGE && typeof GlobalEditor != "undefined" && !!GlobalEditor) GlobalEditor.focus();
    }
};
AlertModule.init();