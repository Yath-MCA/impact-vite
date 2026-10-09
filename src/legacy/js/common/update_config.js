var iVersion = `${{VERSION}}$`;
document.addEventListener("DOMContentLoaded", function(e) {
    //console.log(e.name);
    var [CUS_OPT, CUS_TYPE_OPT] = [document.getElementById("customer_opt"), document.getElementById("customar_type")];
    console.log([CUS_OPT.value, CUS_TYPE_OPT.value]);
    var [BTN_FETCH, BTN_UPDATE, BTN_NEW] = [document.getElementById("BTN_FETCH"), document.getElementById("BTN_UPDATE"), document.getElementById("BTN_NEW")];
    //console.log([BTN_FETCH, BTN_UPDATE, BTN_NEW]);
    var [CONFIG_BODY] = [document.getElementById("config_body")];
    [BTN_FETCH, BTN_UPDATE, BTN_NEW].forEach(btn => {
        btn.onclick = function(e) {
            try {
                if (e.target.id == "BTN_FETCH") {
                    if (CUS_OPT.value != "Choose" && CUS_TYPE_OPT.value != "Choose") {
                        var xhttp = new XMLHttpRequest();
                        xhttp.onreadystatechange = function() {
                            if (this.readyState == 4) {
                                if (this.status == 200) {
                                    console.log(xhttp.responseXML);
                                    NEW_JSON.GENERATE_ITEM(xhttp.responseXML);
                                } else if (this.status == 404) {
                                    alert("no data in data base");
                                }
                            }
                        };
                        xhttp.onerror = (e) => {
                            console.error(xhttp.statusText);
                            alert("no data in data base");
                        };
                        xhttp.open('GET', `../assets/${iVersion}/config/${CUS_TYPE_OPT.value.toLocaleLowerCase()}/${CUS_OPT.value.toLocaleLowerCase()}/config_v2.xml`, true);
                        xhttp.send();
                    } else {
                        alert("Choose proper client information");
                    }
                }
            } catch (e) {
                console.log(e.message);
            }
        };
    });
    var NEW_JSON = {
        TEMPLATE: {
            root: `<div id=""><legend><a class="collapsed" data-toggle="collapse" href="#{{id}}" aria-expanded="false" aria-controls="{{id}}">{{name}}</a></legend><div class="collapse" id="{{id}}"></div></div>`,
            entry_1: `<div class="form-group"><label for="{{}}">{{}}</label></div>`,
            radio: `<div class="custom-control custom-radio custom-control-inline"><input type="radio" id="{{}}" name="{{}}" class="custom-control-input"><label class="custom-control-label" for="{{}}">Show</label></div><div class="custom-control custom-radio custom-control-inline"><input type="radio" id="{{}}" name="{{}}" class="custom-control-input"><label class="custom-control-label" for="{{}}">Hide</label></div>`,
            subItems: `<div class="d-flex flex-column border p-1 bg-white">
            <label for="">{{subhead}}</label>
            <div class="d-flex">
                <div class="custom-control custom-radio custom-control-inline">
                    <input type="radio" id="{{id}}1" name="{{id}}" {{{select1}}} class="custom-control-input">
                    <label class="custom-control-label" for="{{id}}1">Show</label>
                </div>
                <div class="custom-control custom-radio custom-control-inline">
                    <input type="radio" id="{{id}}2" name="{{id}}" {{{select2}}} class="custom-control-input">
                    <label class="custom-control-label" for="{{id}}2">Hide</label>
                </div>
            </div>
        </div>`
        },
        att2Title: {
            "show": "Full Access View",
            "showforCommentView": "Comment Only View",
            "showForAU": "Author",
            "showForCO": "Collator",
            "showForCE": "Copy Editor",
            "showForPM": "PM",
            "showForED": "Editor",
            "showForJM": "JM",
            "showForPR": "ProofReader"
        },
        GetFragment: function(_String) {
            try {
                return document.createRange().createContextualFragment(_String);
            } catch (err) {
                console.warn(err.message);
                ErrorLogTrace('iFragment', err.message + '_' + this._Id);
            }
        },
        ATTR_TEMPLATE: function(Options = {}, _ = NEW_JSON) {
            try {

            } catch (error) {

            }
        },
        SUB_HEAD_TEMPLATE: function(Options = {}, _ = NEW_JSON) {
            try {
                return _.GetFragment(`<div class="form-group text-center bg-gradient-info" tag="${Options.tag}" type="${Options.type}">
                <h4>${Options.subhead}</h4>
                <div class="d-flex">
                    <div class="form-group text-center">
                        <label class="text-center" for="" attr="show">${_.att2Title.show}</label>
                        <div class="d-flex order"></div>
                    </div>
                    <div class="form-group text-center">
                        <label for="" attr="showforCommentView">${_.att2Title.showforCommentView}</label>
                    </div>
                </div>
            </div>`);
            } catch (error) {

            }
        },
        GET_CHECK_VALUE: function(node, selector) {
            try {
                return node.getAttribute(selector) == "true" ? true : false;
            } catch (error) {

            }
        },
        GENERATE_ITEM: function(xml_doc, _ = NEW_JSON) {
            try {
                var ROOT_ARRAY = [];
                var CHECKED = `checked="checked"`;
                var CMD_VIEW_SELECTOR = `[attr="showforCommentView"]`;
                var FULL_SELECTOR = `[attr="show"]`;
                Array.from(xml_doc.firstElementChild.children).forEach((element, idx, arr) => {
                    var _NAME = element.getAttribute("name");

                    if (idx == 1) {
                        var div_root = Mustache.render(_.TEMPLATE.root, {
                            id: _NAME,
                            name: _NAME
                        });
                        var div_frag = _.GetFragment(div_root);
                        // ? 
                        Array.from(element.children).forEach((item, idex, arr) => {
                            var [_name, _title] = [item.getAttribute("name"), item.getAttribute("name")];
                            var div_subItem = _.SUB_HEAD_TEMPLATE({
                                subhead: _title,
                                tag: item.tagName
                            });
                            var CHILD_ITEMS_1 = [];
                            Array.from(item.attributes).forEach(function(attr, ind, arr) {
                                //el.setAttribute(attr.name, attr.value);
                                let IsTrue = attr.value == "true" ? true : false;
                                let IsEmpty = CHILD_ITEMS_1.length == 0;
                                let IsLast = arr.length == ind + 1;
                                if (!["showforCommentView", "show", "name"].includes(attr.name) && _.att2Title[attr.name] || (IsEmpty && IsLast)) {
                                    let string = Mustache.render(_.TEMPLATE.subItems, {
                                        subhead: IsEmpty && IsLast ? "All Roles" : _.att2Title[attr.name],
                                        id: (_name + attr.name),
                                        select1: IsTrue ? CHECKED : "",
                                        select2: IsTrue ? "" : CHECKED,
                                    });
                                    CHILD_ITEMS_1.push(string);
                                }
                            });
                            div_subItem.querySelector('.d-flex.order').append(_.GetFragment(CHILD_ITEMS_1.join("")));
                            // ? comment view
                            let IsTrue = _.GET_CHECK_VALUE(item, CMD_VIEW_SELECTOR);
                            var CHILD_ITEMS_2 = _.GetFragment(Mustache.render(_.TEMPLATE.subItems, {
                                subhead: "All Roles",
                                id: _name,
                                select1: IsTrue ? CHECKED : "",
                                select2: IsTrue ? "" : CHECKED,
                            }));
                            div_subItem.querySelector(CMD_VIEW_SELECTOR).after(CHILD_ITEMS_2);
                            div_frag.querySelector(".collapse").append(div_subItem.firstElementChild);
                        });
                        CONFIG_BODY.append(div_frag);
                    }
                });

            } catch (error) {
                console.log(error.message);
            }
        }
    };



});