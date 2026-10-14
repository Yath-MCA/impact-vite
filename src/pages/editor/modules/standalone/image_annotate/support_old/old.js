

class AnntationModule extends BaseModule {

    constructor(name, errorTracker, options = {}) {
        super(name, errorTracker, options);
        this.initializeProperties();
        this.bindMethods();
        this.initiated = true;
    }

    initializeProperties() {
        this.templateList = {};
        this.canUnmountComponentWhileClose = true;
        this.TOASTER_MESSAGE = {};
        this._state = {
            templateList: {
                spin: `<span id="spinner_dv" class="spinner-border iSpin_border" role="status"><span class="sr-only"></span></span>`
            }
        };
    }

    bindMethods() {
        const methodsToBind = [
            'AssignVar_EventLoop', 'initLoop', 'showLoop', 'fireRestore'
        ];
        methodsToBind.forEach(method => {
            if (this[method]) this[method] = this[method].bind(this);
        });
    }

    initLoop() {
        this.AutoInitiated = true;
        this.FullyLoaded = true;
    }

    getUrl() {
        return CKEDITOR.plugins.getPath('ImageAnotation_old') + ("ImgAnnot.html?_=" + (new Date().getTime()));
    }

    showLoop(Options = {}) {

        this._IMS = IMPACT_SELECTION || {};
        this._EC = EDITOR_CURSOR || {};
        this.AssignVar_EventLoop();


        var arr_item = this.getSource();

        var [realWidth, realHeight] = [(arr_item[1][0]), (arr_item[2][0])];

        var set_real_Height = parseInt(realHeight > 700 ? (realHeight - 200) : (realHeight + 150));
        var set_real_Width = parseInt(realWidth < 300 ? (realWidth + 250) : (realWidth > 400 ? realWidth + 75 : realWidth + 150));

        this.elements['iFRAME'].setAttribute('style', 'border:none;overflow:hidden; background-color: White; width: ' + (set_real_Width) + 'px; height: ' + (set_real_Height) + 'px;');
        this.elements['iFRAME'].setAttribute('src', this.getUrl());

        $(GlobalEditor.document.find('.fig .graphic img').$).each(function () {
            if ($(this).attr('src') == arr_item[0][0]) {
                $(this).attr('src', $(this).attr('src'));
            }
        });

    }

    AssignVar_EventLoop() {
        const KEY_WITH_ID = {
            PANEL_BODY: ".dialog-body",
            PANEL_FOOTER: ".dialog-footer",
            PANEL_HEADER: ".dialog-header",
            PANEL_HEADER_TXT: ".dia_header_text",
            PANEL_CONTENT: ".dialog-content"
        };


        Object.entries(KEY_WITH_ID).forEach(([key, value]) => {
            var el = this.Panel.querySelector(value);
            if (el) this.elements[key] = el;
        });

        this.elements['iFRAME'] = document.getElementById('if1');

    }

    getSource() {

        var arr = [];
        var editor = window.parent.GlobalEditor;
        var selection = editor.getSelection();

        if (IS_LOCAL_HOST) {
            selection.selectElement(editor.document.getById('F1'));
        }

        var startEl = selection.getStartElement();

        startEl = startEl.getName() == 'span' ? startEl.find('.graphic img').getItem(0) : startEl;

        var imgEl = $(startEl.$);

        this.CUR_FIG = $(startEl).parents('.fig');

        if (!!el) {
            imgEl = $(this.CUR_FIG).find('.graphic img');
        }
        arr.push([$(imgEl).attr('src')], [$(imgEl).width()], [$(imgEl).height()]);
        this.CUR_ELM = imgEl;
        this.CUR_ARR = arr;
        return arr;
    }

    setUpWidthHeight() {
        var a = $('#imgID');

        var realWidth = this.CUR_ARR[1][0];
        var realHeight = this.CUR_ARR[2][0];
        var wid = parseInt(realWidth);
        var hig = parseInt(realHeight);

        $(a).attr("src", this.CUR_ARR[0][0]);


        var bodywidth = wid,
            bodyhight = hig;
        if (bodywidth < 300) {
            bodywidth = 295;
            $('body').width(bodywidth + "px");
        }
        if (bodyhight < 200) {
            bodyhight = 195;
            $('body').height(bodyhight + "px");
        }
        if (hig > 700) {
            $(a).attr('style', 'width:' + parseInt(bodywidth + 95) + 'px; height:' + parseInt(bodyhight - 220) +
                'px;top:10px;position:relative;left:0px;z-index:0;');
            if (wid > 300 && hig > 200) { }
        } else {
            wid = bodywidth;
            hig = bodyhight;
            if ($(window.top).width() < wid) {
                wid = $(window.top).width();
                var resizewidth = parseInt((wid * 30) / 100);
                wid -= resizewidth;
            }
            if ($(window.top).height() < hig) {
                hig = $(window.top).height();
                var resizeheight = parseInt((hig * 30) / 100);
                hig -= resizeheight;
            }
            if (wid > 700) {
                var resizeWidth = parseInt((wid * 20) / 100);
                wid -= resizeWidth;
            } else {
                var resizeWidth = parseInt((wid * 20) / 100);
                wid += resizeWidth;
            }
            if (hig > 400) {
                var resizeHeight = parseInt((hig * 20) / 100);
                hig -= resizeHeight;
            } else {
                var resizeHeight = parseInt((hig * 20) / 100);
                hig += resizeHeight;
            }
            $(a).attr('style', 'width:' + parseInt(bodywidth + 95) + 'px; height:' + parseInt(bodyhight + 40) +
                'px;top:10px;position:relative;left:0px;z-index:0;');
            if (bodywidth > 700) {
                $('body').width(parseInt(wid) + "px");
            }
            if (bodyhight > 400) {
                $('body').height(parseInt(hig) + "px");
            }
        }
    }

    pluginLoadScript(anno) {
        if (IS_LOCAL_HOST) debugger;
        /*****************Add && show Annotation data ******************/

        var arr = new Array();
        // Checking existing annotation
        $(this.CUR_ELM).parents('.fig').find('span[data-class="ckcommentsfull"]').each(function () {
            var txt = $(this).find('span').attr('data-annotate');
            var querytext = $(this).find('span').attr('data-user-comment-box');
            if (txt != null && typeof txt != 'undefined' && querytext != "") {
                var dataAnnotion = txt.split(',');
                var myAnnotation = {
                    src: dataAnnotion[4] /*+ ':' + dataAnnotion[5] + ':' + dataAnnotion[6]*/,
                    text: querytext,
                    shapes: [{
                        type: 'rect',
                        /** The shape geometry (relative coordinates) **/
                        geometry: {
                            x: parseFloat(dataAnnotion[0]),
                            y: parseFloat(dataAnnotion[1]),
                            width: parseFloat(dataAnnotion[2]),
                            height: parseFloat(dataAnnotion[3])
                        }
                    }]
                };
                arr.push(myAnnotation);
                window.addEventListener('load', function () {
                    for (var k = 0; k < arr.length; k++) {
                        this.anno.addAnnotation(arr[k]);
                    }
                });
            }
        });

        this.setUpWidthHeight();
    }

    annotationEvtBind(anno) {
        anno.addHandler('onAnnotationCreated', function (annotation) {
            debug.log('onAnnotationCreated');
            var dataAnnot = "";
            var teks = annotation.text;
            if (teks != "") {
                var contextURL = annotation.src;
                var x = annotation.shapes[0].geometry.x;
                var y = annotation.shapes[0].geometry.y;
                var width = annotation.shapes[0].geometry.width;
                var height = annotation.shapes[0].geometry.height;
                dataAnnot = x + "," + y + "," + width + "," + height + "," + contextURL;

                var cmdString = NewQueryModule['M_FUN'].InsertDOM(teks, 0, s4(), 'imgnote', 'new');

                $(cmdString).find('[data-user-comment-box]').attr('data-annotate', dataAnnot);

                let caption = this.CUR_FIG.querySelector('.caption');
                if (caption) $(caption).last().append(cmdString);
                else $(this.CUR_FIG).find('.graphic').before(cmdString);

                NewQueryModule['M_FUN'].ReNumberNote(GlobalEditor);
                this.closeDialog();

            }
        });
        anno.addHandler('onAnnotationUpdated', function (annotation) {
            debug.log('onAnnotationUpdated');
            var teks = annotation.text;
            if (!!this.CUR_FIG && teks.length != 0 && teks.length != 0) {
                $(this.CUR_FIG).find('[data-user-comment-box][data-annotate]').attr('data-user-comment-box', teks);
            }
        });
        anno.addHandler('onAnnotationRemoved', function (annotation) {
            debug.log('onAnnotationRemoved');
        });
        anno.addHandler('onMouseOverAnnotation', function (annotation) {
            debug.log('onMouseOverAnnotation');
            var editor = window.top.parent.GlobalEditor;
            var UserNameEdit;
            var selection = editor.getSelection().getStartElement();
            if (!!$(selection.$).parents('.fig').length) {
                UserNameEdit = $(selection.$).parents('.fig').find('[data-user-name]').attr('data-user-name');
            }

            $('.annotorious-popup-button-edit').hide();
            $('.annotorious-popup-button-delete').hide();

        });
        anno.addHandler('beforeAnnotationRemoved', function (annotation) {
            debug.log('beforeAnnotationRemoved');
            console.log(annotation);
            var editor = window.top.parent.GlobalEditor;
            var contextURL = annotation.src;
            var x = annotation.shapes[0].geometry.x;
            var y = annotation.shapes[0].geometry.y;
            var width = annotation.shapes[0].geometry.width;
            var height = annotation.shapes[0].geometry.height;
            var dataAnnotate = x + "," + y + "," + width + "," + height + "," + contextURL;

            let getCmd = editor.find(`[data-annotate="${dataAnnotate}"]`);
            var parent = getCmd.getParent();

            if (getCmd.getName().toLowerCase() == "insert") {
                $(parent.$).remove();
            } else $(getCmd.$).remove();

            NewQueryModule['M_FUN'].ReNumberNote(GlobalEditor);
            this.closeDialog();
        });
    }

    reset() {
        this.elements.iFRAME.src = "";
        this.elements.iFRAME.style = "";
        this.CUR_ELM = null;
    }

    closeModule() {
        if (typeof this.closeDialog == "function") this.closeDialog();
        else this.Panel.classList.add("ds-none");
    }
}

export default AnntationModule;