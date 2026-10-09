window.RECORD_USER_ACTION = {
    instance: {},
    record_info: {
        open_close_dialog: {
            primary_key: "open_close_dialog",
            local_keys: ["open_close_dialog"],
            get_endpoint: API_GET_ADMINDOCS,
            set_endpoint: API_FIND_UPDATE_INSERT,
            ignore_local_storage: false,
            fetch_first_time: 0,
            add_in_find: ['session_id'],
            empty_set: {
                'open_close_dialog': []
            },
            fire_evt: {
                'click': "",
                'onkeydown': ""
            }
        },
        query_quick_answer: {
            primary_key: "query_quick_answer",
            local_keys: ["query_quick_answer"],
            get_endpoint: API_GET_ADMINDOCS,
            set_endpoint: API_FIND_UPDATE_INSERT,
            empty_set: {
                'query_quick_answer': []
            },
            fire_evt: {
                'click': "",
                'onkeydown': ""
            }
        },
        insert_symbol: {
            primary_key: "insert_symbol",
            local_keys: ["insert_symbol"],
            get_endpoint: API_GET_ADMINDOCS,
            set_endpoint: API_FIND_UPDATE_INSERT,
            empty_set: {
                'insert_symbol': []
            },
            fire_evt: {
                'click': "",
                'onkeydown': ""
            }
        },
        video_tour: {
            primary_key: "video_tour",
            local_keys: ["video_tour"],
            get_endpoint: API_GET_ADMINDOCS,
            set_endpoint: API_FIND_UPDATE_INSERT,
            ignore_local_storage: true,
            empty_set: {
                'video_tour': []
            },
            fire_evt: {
                'click': "",
                'onkeydown': ""
            }
        },
        guided_tour: {
            primary_key: "guided_tour",
            local_keys: ["guided_tour"],
            get_endpoint: API_GET_ADMINDOCS,
            set_endpoint: API_UPDATE_INSERT,
            ignore_local_storage: true,
            empty_set: {
                'guided_tour': []
            },
            fire_evt: {
                'click': "",
                'onkeydown': ""
            }
        }
    },
    GET_JSON: function(Options = {}, tbl, self) {
        self = this;
        try {
            let find_Obj = {
                "recordtype": self['instance']['primary_key'],
                "username": self.USER_INFO ? self.USER_INFO.MAIL_ID : USER_INFO.MAIL_ID,
                "docid": self.DOC_ID ? self.DOC_ID : DOC_ID
            };
            var sessionKey = typeof getSessionIdKey === "function" ? getSessionIdKey(self.DOC_ID || DOC_ID) : "";
            var sessionVal = sessionKey ? sessionStorage.getItem(sessionKey) : "";
            if (self.instance.add_in_find) {
                self.instance.add_in_find.forEach(key => {
                    if (/session/gi.test(key) && sessionKey && sessionVal) {
                        find_Obj[key] = sessionVal;
                    }
                });
            }
            return {
                "tbl": "UserPreference",
                "find": find_Obj
            };
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('GET_JSON', err.message);
        }
    },
    DB_SET_CB: function(response, self) {
        self = this;
        try {
            debug.log(JSON.stringify(response));
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('DB_SET_CB', err.message);
        }
    },
    UPDATE_LOCAL_STORAGE: function(group, IsFirstTime, Options = {}, self, instance) {
        self = this, instance = self['instance'];
        try {
            if (instance.ignore_local_storage) return;
            var KEYS = instance['local_keys'];
            if (Options.forceKey) {
                KEYS = Options.forceKey.split(",");
            }
            Array.from(KEYS).forEach(getKey => {
                let set_Key = "xmleditor".concat(":", getKey, ":", DOC_ID),
                    set_Value = group[getKey],
                    update = IsFirstTime ? true : false;
                if (IsFirstTime) {
                    debug.log("first_time");
                } else {
                    let localVal = localStorage.getItem(set_Key) || '[]',
                        dbVal = group[getKey] || [];
                    if (localVal != JSON.stringify(dbVal)) {
                        set_Value = dbVal;
                        update = true;
                    }
                }
                if (update) localStorage.setItem(set_Key, JSON.stringify(set_Value));
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('UPDATE_LOCAL_STORAGE', err.message);
        }
    },
    FETCH_DB: function(response, Options = {}, self, instance) {
        self = this, instance = self['instance'];
        try {
            var json = self.GET_JSON(Options);
            if (typeof Options.Init == 'boolean' && Options.Init == true) {
                commonfn.callajax(json, 'FETCH_DB', instance['get_endpoint'], self);
                if (!self.FullyLoaded && typeof self.Init == "function") {
                    self.Init();
                }
            } else if (response.data.length == 0) {
                debug.log('no record found for search items');
                let first_assign = instance['empty_set'];
                json = Object.assign(json, first_assign, {
                    "recordtype": json.find.recordtype
                }, GET_JSON("default"));
                if (json.find.docid == undefined || json.find.username == undefined) {
                    setTimeout(() => {
                        self.FETCH_DB(response, Options = {}, self, instance);
                    }, 2500);
                    return;
                }
                delete json.find;
                self.UPDATE_LOCAL_STORAGE(first_assign, !0);
                commonfn.callajax(json, 'DB_SET_CB', API_UPDATE_INSERT, self);
            } else if (response.data && response.data.length > 0) {
                self.UPDATE_LOCAL_STORAGE(response.data[0], false);
            }
        } catch (err) {
            debug.log(err.message);
            ErrorShareMail('FETCH_DB', err.message);
        }
    },
    Append_Only: function(localKey, update = {}, self, instance) {
        self = this, instance = self['instance'];
        localKey = (localKey == 0 ? self.instance.local_keys[0] : localKey);
        try {
            var json = Object.assign({}, self.GET_JSON()),
                get_set_Key = "xmleditor".concat(`:${DOC_ID}`, localKey),
                localVal = localStorage.getItem(get_set_Key) || '[]',
                parseVal = [];
            if (instance.ignore_local_storage) {
                Object.assign(json, {
                    "recordtype": json.find.recordtype,
                    [localKey]: [update]
                }, GET_JSON("default"));
                delete json.find;
            } else {
                update = Object.assign(update, {
                    time_c: (new Date().getTime()),
                    time_iso: (new Date().toISOString())
                });
                parseVal = JSON.parse(localVal);
                parseVal.push(update);
                json.update = Object.assign({}, {
                    [localKey]: parseVal
                });
                self.UPDATE_LOCAL_STORAGE(json.update, false, {
                    forceKey: localKey
                });
            }
            if (json.find && json.find.recordtype != localKey) json.find.recordtype = localKey;
            commonfn.callajax(json, 'DB_SET_CB', self['instance']['set_endpoint'], self);
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('Append_Only', err.message);
        }
    },
    // Append_and_reOrder: function(process, tbl, self, SET_KEY) {
    //     self = this;
    //     SET_KEY = 'RECORD_USER_ACTION';
    //     try {
    //         instance['local_keys'].forEach(getKey => {
    //             let recent = localStorage.getItem(getKey),
    //                 split_key = getKey.split(/:|_/)[1],
    //                 join_key = split_key.concat('_', 'LIST'),
    //                 arr_key = (join_key.toLocaleUpperCase()),
    //                 string = "";
    //             self[arr_key] = response.data[0][(join_key.toLocaleLowerCase())] || [];
    //             string = JSON.stringify(self[arr_key]);
    //             if (string != recent) {
    //                 localStorage.setItem(getKey, string);
    //             }
    //         });

    //     } catch (err) {
    //         console.warn(err.message);
    //         ErrorLogTrace('Append_and_reOrder', err.message);
    //     }
    // },
    invoke: function(module, module_key, Options = {}, primaryJson = {}, self, SET_KEY, $db_Instance) {
        self = this,
            SET_KEY = 'RECORD_USER_ACTION';
        if (typeof USER_INFO == "undefined") {
            self.USER_INFO = {
                // ? video page 
                MAIL_ID: null,
                DOC_ID: Options.DOC_ID
            };
            self.DOC_ID = Options.DOC_ID;
        }
        try {
            // ? assign value
            module[SET_KEY] = Object.assign(module[SET_KEY] = {}, RECORD_USER_ACTION);
            module[SET_KEY]['record_info'];
            if (!module[SET_KEY]['record_info'][module_key]) {
                if (!primaryJson) return;
                module[SET_KEY]['record_info'][module_key] = primaryJson;
            }
            // ? return non configured;
            $db_Instance = module[SET_KEY]['instance'] = module[SET_KEY]['record_info'][module_key];
            if ($db_Instance) {
                if (/0|1/gi.test($db_Instance['fetch_first_time'])) {
                    if ($db_Instance['fetch_first_time'] == 0)
                        $db_Instance['fetch_first_time'] = 1;
                    else if ($db_Instance['fetch_first_time'] = 1) return debug.log("already invoked");
                }
                module[SET_KEY].FETCH_DB(null, Options);
                // ? event fire
            }
            // ? delete items
            ['invoke', 'record_info'].forEach(remove => {
                delete module[SET_KEY][remove];
            });
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('invoke', err.message);
        }
    }
};