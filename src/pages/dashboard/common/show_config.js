window.Render_Config = {
    URL: ``,
    FOLDER: "journals",
    CONFIGS: {},
    DEFAULT_C: "oup",
    TEMPLATES: {
        accordion: `<div class="accordion" id="accordionExample">
            {{#list_item}}
              <div class="card">
                    <div class="card-header d-flex" id="{{short_code}}">
                        <h2 class="mb-0">
                            <a class="btn btn-primary" data-toggle="collapse" {{{journals}}} data-find="{{find}}" href="#{{short_code}}_collapse" role="button" aria-expanded="false" aria-controls="collapseExample"></a>
                        </h2>
                        {{{sub_row}}}
                    </div>
                    <div id="{{short_code}}_collapse" class="collapse" aria-labelledby="{{short_code}}" data-parent="#accordionExample">
                        <div class="card-body">{{childrens}}</div>
                    </div>
                </div>
            {{/list_item}}
        </div>`,
        module_header: `<div class="config-dialogs">
                {{#module_list}}
                    <div class="config-item border m-2 p-2 {{bgcolor}}" id={{id}}>
                        <div class="d-flex flex-row">
                            <div class="h5">{{name}}</div>
                            <div class="ml-5">{{{default}}}</div>
                        </div>
                        <div class="config-role d-flex {{_class}}">
                            {{#role_list}}
                                {{{role}}}
                            {{/role_list}}
                        </div>
                    </div>		
                {{/module_list}}
                
            </div>`,
        select_true_false: `<form class="form-inline"><label class="my-1 mr-2" for="{{id}}">{{text}}</label><select {{disabled}} class="form-control form-control-sm" id="{{id}}"><option value="true" {{t_select}}>Enabled</option><option value="false" {{f_select}}>Disabled</option></select></form>`,
        hex_code: `<div class="config-hex border m-1 p-1 {{_class}}"><span class="font-weight-bold">{{key}}:</span><span class="{{code}}">{{{value}}}</span></div>`,
        role: `<div class="config-role d-flex p-1 m-1 {{_class}}">{{role}}</div>`,
    },
    findBySelectorAttribute: function (jsonData, attributeValue) {
        try {
            jsonData = jsonData ? jsonData : ROLE_IDS;
            for (const key in jsonData) {
                if (jsonData[key].SelectorAttribute === attributeValue) {
                    return jsonData[key];
                }
            }
            return null;
        } catch (err) {
            console.warn(err.message);
            //ErrorLogTrace('handle_active_list', err.message);
        }
    },
    render_Mustache(template, replacements) {
        try {
            //console.log(template, replacements, id);
            // parse it (optional, only necessary if template is to be used again)
            Mustache.parse(template);
            // render the data into the template
            var rendered = Mustache.render(template, replacements);
            return rendered;
        } catch (err) {
            console.warn(err.message);
            //ErrorLogTrace('handle_active_list', err.message);
        }
    },
    isHexCode: function (str) {
        try {
            const hexRegex = /^[a-fA-F0-9]+$/;
            return hexRegex.test(str);
        } catch (error) {

        }
    },
    name_render: function (input) {
        try {
            function removeWords(input) {
                const wordsToRemove = ['dialog', 'New', 'module'];

                // Create a regular expression pattern to match any of the words
                const pattern = new RegExp(wordsToRemove.join('|'), 'ig');

                // Replace the matched words with an empty string
                const result = input.replace(pattern, '');

                return result;
            }

            function replaceHyphensAndUnderscores(input) {
                return input.replace(/[-_]/g, ' ');
            }

            function insertSpaceBetweenCharacters(input) {
                return input.replace(/([a-z])([A-Z])/g, '$1 $2');
            }

            function removeStartingX(input) {
                return input.replace(/^x/g, '');
            }

            function capitalizeFirstLetter(input) {
                return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
            }

            function capitalizeFirstLetterOfWords(input) {
                const words = input.split(' ');
                for (let i = 0; i < words.length; i++) {
                    words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
                }
                return words.join(' ');
            }

            const withoutHyphensUnderscores = replaceHyphensAndUnderscores(input);
            const withoutStartingX = removeStartingX(withoutHyphensUnderscores);
            const removewords = removeWords(withoutStartingX);
            //const insertspace = insertSpaceBetweenCharacters(removewords)							
            //var finalResult = capitalizeFirstLetterOfWords(insertspace);
            const capitalized = capitalizeFirstLetterOfWords(removewords);
            const withSpaces = insertSpaceBetweenCharacters(capitalized);
            var finalResult = withSpaces;
            return finalResult;
        } catch (error) {

        }
    },
    select_value: function (_name, canSHow, txt, Options = {}) {
        try {
            if (/default/gi.test(txt) && /false|yes/gi.test(canSHow) && !Options.bg) {
                Options.bg = "bg-danger";
            }
            return {
                id: _name.toLowerCase(),
                "t_select": `${/true|no/gi.test(canSHow) ? "selected" : ""}`,
                "f_select": `${/false|yes/gi.test(canSHow) ? "selected" : ""}`,
                "disabled": "disabled",
                "text": txt,
                "bgcolor": Options.bg ? Options.bg : ""
            };
        } catch (err) {
            console.warn(err.message);
            //ErrorLogTrace('handle_active_list', err.message);
        }
    },
    hexToString: function (hex) {
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        // return this.isHtml(str);
        return str;
    },
    isHtml: function (str) {
        try {
            const htmlTagPattern = /<[^>]*>/g;
            if (htmlTagPattern.test(str)) {
                return str.replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            } else return str;

        } catch (error) {

        } finally {

        }
    },
    roles_render: function (entry, isHexSyntax, isJournalList, Options = {}, self) {
        self = Render_Config;
        var role_array = [];
        try {
            // Convert NamedNodeMap to an array and use forEach
            Array.from(entry.attributes).forEach(attribute => {
                let {
                    name,
                    value
                } = attribute, hexa = isJournalList ? false : self.isHexCode(value),
                    template_id = "",
                    param = {};

                if (/data-name|notallowed/gi.test(name) && isJournalList) return;
                if (/showfor/gi.test(name)) {
                    const result = self.findBySelectorAttribute(ROLE_IDS, name);
                    if (result) {
                        param = self.IS_ADMIN ? self.select_value(result.name, value, result.name) : ({
                            role: `${result.name} ${value}`,
                            _class: (value == "false" ? "badge-danger" : "")
                        });
                        template_id = self.IS_ADMIN ? "select_true_false" : "role";
                    }
                } else if (isHexSyntax || hexa) {
                    template_id = "hex_code";
                    param = {
                        value: hexa ? (self.hexToString(value)) : self.isHtml(value),
                        key: name
                    };
                } else {
                    template_id = "hex_code";
                    param = {
                        value: value,
                        role: value,
                        key: name,
                        code: /^[^a-zA-Z0-9]+$/gi.test(value) ? "bg_code" : "",
                    };
                }
                // <input type="text" autocomplete="off" class="" id="" placeholder="value">
                if (template_id) {
                    let render = (self.render_Mustache(self.TEMPLATES[template_id], param));
                    role_array.push(isJournalList && Options.without_role ? render : {
                        role: render
                    });
                }
            });
        } catch (err) {
            console.warn(err.message);

        } finally {
            return role_array;
        }
    },
    get_client: function (self) {
        self = Render_Config;
        debug.log("Render_Config-get_client");
        try {
            return self.CUR_XML.querySelector("[customer]").getAttribute("customer");
        } catch (error) {

        }
    },
    journal_append: function (client, xmlDoc, self) {
        self = Render_Config;
        debug.log("Render_Config-journal_append");
        try {
            // Assign 'client' or get default
            client = client || self.get_client();
            // Assign 'xmlDoc' or get default
            xmlDoc = xmlDoc || AG_GRID.CONFIGS[client]['xml_doc'] || self.CUR_XML;
            var root = xmlDoc.querySelector("listofjournals"),
                journal_btn = document.getElementById("config_journal");
            if (!AG_GRID.CONFIGS[client]['j_list']) {
                AG_GRID.CONFIGS[client]['j_list'] = [];
                Array.from(root.children).forEach(child => {
                    let tag = child.tagName.toString();
                    let opt = $("<option class='config-j' />").val(tag.toLocaleLowerCase()).html(tag.toUpperCase());
                    AG_GRID.CONFIGS[client]['j_list'].push(opt[0]);
                });
            } else {
                debug.log("Render_Config-second_time_append_journals_list", AG_GRID.CONFIGS[client]['j_list']);
            }
            if (AG_GRID.CONFIGS[client]['j_list'].length > 0) {
                $(journal_btn).append(AG_GRID.CONFIGS[client]['j_list']).removeAttr("disabled");
                let current = document.querySelector("a.list-group-item.active");
                if (current && current.hasAttribute("data-fetch") && current.getAttribute("data-fetch") == "journal") {
                    self.accordion_render(xmlDoc, true);
                }
            }
        } catch (err) {
            console.warn(err.message);
        }
    },
    journal_change: function (e, self) {
        self = Render_Config;
        debug.log("Render_Config-journal_append");
        try {
            if (self.CUR_XML) {
                self.accordion_render(self.CUR_XML, true);
            }
        } catch (err) {
            console.warn(err.message);
        }
    },
    client_change: function (e, self) {
        self = Render_Config;
        debug.log("Render_Config-client_change");
        try {
            let default_client = "oup",
                client = (typeof e == "string" ? (e == "null" ? default_client : e) : e && e.target && e.target.value.toLowerCase()) || default_client,
                config = AG_GRID.CONFIGS[client]['xml_doc'] || null;
            if (config && client) {
                self.CUR_XML = config;
                self.accordion_render(config);
                self.journal_append(client, config);
            }
        } catch (err) {
            console.warn(err.message);
        }
    },
    elements_render: function (e, xml_doc, selector, target, self) {
        self = Render_Config;
        xml_doc = xml_doc ? xml_doc : self.CUR_XML;
        selector = selector ? selector : e.target.getAttribute("data-find") || null;
        target = target ? target : e.target.getAttribute("href") || null;
        debug.log("Render_Config-elements_render");
        try {
            var overall = [];
            if (selector) {
                Array.from(xml_doc.querySelectorAll(selector)).forEach((root, idx, arr) => {
                    var render_items = {
                        "header": root.getAttribute("journal-title"),
                        "role_list": {},
                        "module_list": []
                    },
                        hexa_tags = false;
                    Array.from(root.children).forEach((entry) => {
                        var _name = entry.tagName,
                            canHide = entry.getAttribute("notallowed") || null,
                            _value = "";
                        var Options = {},
                            template = self.TEMPLATES["select_true_false"],
                            params = self.select_value(_name, canHide, "Default", Options),
                            _value = self.render_Mustache(template, params);

                        render_items["module_list"].push({
                            name: _name,
                            id: _name,
                            default: _value,
                            _class: "flex-wrap",
                            role_list: self.roles_render(entry, hexa_tags, true),
                            bgcolor: (canHide == "yes" ? "bg-danger" : "")
                        });
                    });
                    overall.push(self.render_Mustache(self.TEMPLATES["module_header"], render_items, true));
                });
            } else {

            }
            // ? Overwrite the contents of #target with the rendered HTML}            
            $(document.querySelector(target)).html("").append(overall.join(""));
        } catch (err) {
            console.warn(err.message);
            //ErrorLogTrace('handle_active_list', err.message);
        }
    },
    section_render: function (e, xml_doc, selector, target, self) {
        self = Render_Config;
        xml_doc = xml_doc ? xml_doc : self.CUR_XML;
        selector = selector ? selector : e.target.getAttribute("data-find") || null;
        target = target ? target : e.target.getAttribute("href") || null;
        debug.log("Render_Config-section_render");
        try {
            var overall = [];
            if (selector) {
                Array.from(xml_doc.querySelectorAll(selector)).forEach((root) => {
                    var render_items = {};
                    render_items["header"] = root.getAttribute("name");
                    render_items["role_list"] = {};
                    render_items["module_list"] = [];
                    let inner_find = "functionality",
                        hexa_tags = false;
                    if (/templtaes|alertInfo/gi.test(selector)) {
                        inner_find = "*";
                        hexa_tags = true;
                    }
                    root.querySelectorAll(inner_find).forEach((entry) => {
                        var _name = entry.getAttribute("name"),
                            canSHow = entry.getAttribute("show") || null,
                            _value = "";
                        if (hexa_tags) {
                            _name = entry.tagName;
                        } else {
                            var Options = {},
                                template = self.TEMPLATES["select_true_false"],
                                params = self.select_value(_name, canSHow, "Default", Options),
                                _value = self.render_Mustache(template, params);
                        }
                        render_items["module_list"].push({
                            name: self.name_render(_name),
                            id: _name,
                            default: _value,
                            _class: hexa_tags ? "flex-column" : "",
                            role_list: self.roles_render(entry, hexa_tags),
                            bgcolor: (canSHow == "false" ? "bg-danger" : "")
                        });
                    });
                    overall.push(self.render_Mustache(self.TEMPLATES["module_header"], render_items, true));
                });
            } else {

            }
            // ? Overwrite the contents of #target with the rendered HTML}            
            $(document.querySelector(target)).html("").append(overall.join(""));
        } catch (err) {
            console.warn(err.message);
            //ErrorLogTrace('handle_active_list', err.message);
        }
    },
    evt_fire: function (self) {
        self = this;
        debug.log("Render_Config-evt_fire");
        try {
            // let current = document.querySelector("a.list-group-item.active");
            // document.querySelectorAll("a.btn").forEach(root => {
            //     root.onclick = self[root.hasAttribute("data-journal-list") ? 'elements_render' : 'section_render']
            // });
        } catch (err) {
            console.warn(err.message);
        }
    },
    accordion_render: function (xmlDoc, isJournalList, Options = {}, self) {
        self = Render_Config;
        var root_div = "";
        var {
            add
        } = Options;
        debug.log("Render_Config-accordion_render");
        try {
            // ? Get the parent element
            const parent = xmlDoc.querySelector(isJournalList ? 'listofjournals' : 'project');
            //  ? Iterate through each child of the parent
            var params = {
                "list_item": []
            };
            var loopItems = add ? parent.querySelector("NJ") ? [parent.querySelector("NJ")] : [parent.children[0]] : parent.children;
            Array.from(loopItems).forEach((child, idx) => {
                let id = child.getAttribute(child.hasAttribute("name") ? "name" : "type") || child.tagName;
                var buttonName = id;
                var shortId = "";
                var findQuery = id;
                if (child.hasAttribute("short")) {
                    buttonName = "Show";
                    shortId = child.getAttribute("short");
                    findQuery = `${id}[short='${shortId}']`;
                }

                if (child.children.length == 0) return;
                if (id.indexOf("-")) { }
                params.list_item.push({
                    "id": id,
                    "idx": idx,
                    "find": findQuery,
                    "header": buttonName,
                    "childrens": "childrens",
                    "short_code": shortId,
                    "journals": `data-journal-list='${id}'`,
                    "sub_row": isJournalList ? self.roles_render(child, false, isJournalList, {
                        without_role: true
                    }).join("") : ""
                });
            });
            root_div = self.render_Mustache(self.TEMPLATES["accordion"], params);
        } catch (err) {
            console.warn(err.message);
        } finally {
            $(document.querySelector(".config_data_shown")).html("").append(root_div);
            self.evt_fire();
        }
    },
    LOAD_EVT: function (self) {
        self = Render_Config;
        debug.log("Render_Config-LOAD_EVT");
        try {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    let client = this.responseXML.querySelector("[customer]").getAttribute("customer"),
                        newSelect = document.getElementById("config_client");
                    if (client && AG_GRID.CONFIGS) {
                        AG_GRID.CONFIGS[client.toLowerCase()]['xml_doc'] = this.responseXML;
                        // if (client == newSelect.value) {
                        //     self.CUR_XML = this.responseXML;
                        //     self.accordion_render(this.responseXML);
                        // }
                    }
                }
            }
        } catch (err) {
            console.warn(err.message);
            //ErrorLogTrace('LOAD_EVT', err.message);
        }
    },
    fetch_config: function (client, self) {
        self = Render_Config;
        debug.log("Render_Config-fetch_config");
        try {
            client = client ? client : (docuemnt.querySelector('option[selected]') || self.DEFAULT_C);
            if (/tnf/gi.test(client)) self.FOLDER = "books";
            if (!AG_GRID.CONFIGS[client])
                AG_GRID.CONFIGS[client] = {
                    URL: 'assets/' + `${{ VERSION }}$` + `/config/${self.FOLDER}/${client.toLowerCase()}/config.xml`,
                    count: 0,
                    retry: false
                };
            const req = new XMLHttpRequest();
            req.onreadystatechange = self.LOAD_EVT;
            req.open("GET", AG_GRID.CONFIGS[client].URL, true);
            if (AG_GRID.CONFIGS[client].count == 0 || AG_GRID.CONFIGS[client].retry) {
                req.send();
                AG_GRID.CONFIGS[client].count++;
            }
        } catch (err) {
            console.warn(err.message);
            //ErrorLogTrace('handle_active_list', err.message);
        }
    },
    add_journal: function (client, xmlDoc, self) {
        self = Render_Config;
        debug.log("Render_Config-add_journal");
        try {
            // Assign 'client' or get default
            client = client || self.get_client();
            if (client == "null") {
                Swal.fire({
                    title: 'Warning',
                    text: `Kindly choose client, Then click again`,
                    "icon": 'warning'
                });
                return;
            }
            // Assign 'xmlDoc' or get default
            xmlDoc = xmlDoc || AG_GRID.CONFIGS[client]['xml_doc'] || self.CUR_XML;
            self.accordion_render(xmlDoc, true, {
                add: true
            });

        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('add_journal', err.message);
        }
    },
    Init: function (self) {
        self = this;
        debug.log("Render_Config-Init");
        try {
            // document.querySelectorAll("option.config").forEach(opt => {
            //     self.fetch_config(opt.value);
            // });
            // var newClient = document.getElementById("config_client");
            // var jou_select = document.getElementById("config_journal");
            // var current = document.querySelector("a.list-group-item.active");
            // var isConfig = /client|journal/gi.test(current.getAttribute("data-fetch"));
            // if (newClient) newClient.onchange = (e) => isConfig && self.client_change;
            // if (jou_select) jou_select.onchange = (e) => isConfig && self.journal_change;
        } catch (err) {
            console.warn(err.message);
            //ErrorLogTrace('handle_active_list', err.message);
        }
    }
};

var scroll_to = (_this) => {
    var offset = $(_this).offset().top;
    // Scroll to the offset position minus some margin
    // $('.config_data_shown').animate({
    //     scrollTop: offset - 100 // Adjust the offset as needed
    // }, 500); 
    // Adjust the duration as needed
    var element = document.querySelector(_this.getAttribute("href"));
    if (element && offset > 250)
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
};
$(document)
    .on('click', 'a.btn', function (e) {
        let current = document.querySelector("a.list-group-item.active"),
            self = this;
        Render_Config[current.getAttribute("data-fetch") == "journal" ? 'elements_render' : 'section_render'](e);
        setTimeout(() => scroll_to(self), 500);
        debug.log("Render_Config-click");
    })
    .ready(function () {
        // $('.config_data_shown').on('click', "a.btn", function(e) {
        //     // Get the offset of the header
        //     scroll_to(this);
        // })
        // $('.config_data_shown .card-header a').click(function() {
        //     scroll_to(this);
        // });
    });