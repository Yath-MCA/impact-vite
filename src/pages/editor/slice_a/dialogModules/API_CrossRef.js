/* 
https://doi.crossref.org/openurl/?pid=rndu3@newgenimaging.com&id=doi:10.1007/978-3-030-44465-5&noredirect=true
https://doi.crossref.org/openurl?pid=rndu3@newgenimaging.com&aulast=Maas%20LRM&title= JOURNAL%20OF%20PHYSICAL%20OCEANOGRAPHY&volume=32&issue=3&spage=870&date=2002
https://doi.crossref.org/servlet/query?pid=rndu3@newgenimaging.com&format=unixref&id=10.1093/cid/ciaa100&enable-multiple-hits=false
https://doi.crossref.org/search/doi?pid=rndu3@newgenimaging.com&format=unixref&doi=10.1093/cid/ciaa100&key=expanded&list-components=false&expanded-results=false

https://www.crossref.org/documentation/retrieve-metadata/rest-api/tips-for-using-the-crossref-rest-api/
https://www.crossref.org/flagging-free-to-read/
https://www.crossref.org/blog/come-and-get-your-grant-metadata/
https://www.crossref.org/labs/resolving-citations-we-dont-need-no-stinkin-parser/
https://api.crossref.org/swagger-ui/index.html#/Works/get_works
https://www.crossref.org/labs/resolving-citations-we-dont-need-no-stinkin-parser/

This is DOI Insertion Documention:
1. Read the bookmarks(bookmark id pattern to be taken from config) and get the reference text. Do the search in crossRef API(This to be configured) and get the API response.
Example:
“http://api.crossref.org/works?query.bibliographic="Vaani Pardal et al, Implicit and explicit gender stereotypes at the bargaining table: Male counterparts stereotypes predict women’s lower performance in dyadic face-to-face negotiations, 83(5-6) Sex Roles: A Journal of Research, 289 (2020)"&rows=1
2. Get the crossref response and match with input manuscript reference.
3. Especially for volume, year, page values create multiple named regex patterns (This needs to be configurable) with inputs and this is to be matched correctly with crossRef Values.
Volume => 24(3)
Year      => (2008) or 4digit values.
Pages   =>99, 100
(<vol>[0-9]+)(<issue>\([0-9]+\))?, (<fpage>[0-9]+)-(<lpage>[0-9]+)

The regex will have the named groups that needs to be read and matched.

4. IF pattern found check each element with its respective crossref response element. Rest words need to be checked word by word completely. If the pattern is not found, Validation should be like each manuscript word to be checked with the response

Note: To insert DOI, We are doing this Match only for Journal References.
Matching will be different for other type references
 */


const CROSS_REF_API = {
    M_SCOPE: {
        VALID_KEYS: [
            "DOI", "author", "issue", "page", "title", "type", "volume", "issn",
            "container-title", "group-title", "short-container-title"
        ],
        ASSIGN_KEY: {
            "container-title": {
                "journal-article": "journal",
                "book": "journal"
            },
            "short-container-title": {
                "journal-article": "journal_short"
            },
            "group-title": {
                "posted-content": "journal"
            }
        },
        initiated: false
    },

    M_CONFIG: {
        PID: null,
        POST_PARAMS_DOI: {
            format: "json",
            endpoint: "search/doi",
            method: "fetchdoi"
        }
    },

    init() {
        try {
            if (typeof GET_CONFIG_ITEM !== "function") {
                setTimeout(() => this.init(), 5000);
                return;
            }

            const configObj = GET_CONFIG_ITEM("cross_ref_api", {
                CONVERT_JSON: true,
                children: false,
                attr: true,
                hex2string: true,
                keyUpperCase: true
            });

            Object.assign(this.M_CONFIG, configObj);
            this.M_SCOPE.initiated = true;
        } catch (err) {
            this.logError('Init', err);
        }
    },

    fetchQueryUrl(options) {
        try {
            if (!this.M_SCOPE.initiated) this.init();
            // Implementation for fetchQueryUrl
            if (options.plain_text) {
                //debug.log(Options.text);
                //return `http://api.crossref.org/works?query.bibliographic="${Options.text}"&rows=1`;
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('fetchQueryUrl', err.message);
        }
    },

    sendRecordDb(response, options = {}) {
        try {
            const jsonData = Object.assign({
                tbl: "UserPreference",
                response: response.restext,
                parse_res: options.parse_res || "",
                query: response.query,
                status: response.r,
                recordtype: options.type || "fetch_plainText"
            },
                typeof GET_JSON("default") === 'object' && GET_JSON("default") !== null ? GET_JSON("default") : {}
            );
            debug.log(jsonData);
            commonfn.callajax(jsonData, 'senddoidb', API_UPDATE_INSERT);
        } catch (err) {
            this.logError('sendRecordDb', err);
        }
    },

    filterFetchData(response, options = {}) {
        if (!this.M_SCOPE.initiated) this.init();

        try {
            var first = null;

            // --------------------------
            // ✅ OLD FORMAT (CrossRef)
            // response.message.items[0]
            // --------------------------
            if (response && response.message && response.message.items && response.message.items.length > 0) {
                first = response.message.items[0];
            }

            // --------------------------
            // ✅ NEW FORMAT (Array response)
            // [ { author:[], date:[], ... } ]
            // --------------------------
            else if (Array.isArray(response) && response.length > 0) {
                first = response[0];
            }

            // nothing valid
            if (!first) return {};

            var type = first.type;
            var filtered = {};

            for (var i = 0; i < this.M_SCOPE.VALID_KEYS.length; i++) {
                var key = this.M_SCOPE.VALID_KEYS[i];
                var tempKey;

                if (
                    this.M_SCOPE.ASSIGN_KEY[key] &&
                    this.M_SCOPE.ASSIGN_KEY[key][type]
                ) {
                    tempKey = this.M_SCOPE.ASSIGN_KEY[key][type];
                } else {
                    tempKey = key;
                }

                var value = first[key];

                // if value is array (except author), take first
                if (Array.isArray(value) && key !== "author") {
                    value = value.length > 0 ? value[0] : "";
                }

                filtered[tempKey] = value;
            }

            // --------------------------
            // ✅ YEAR handling (old vs new)
            // old: first.published
            // new: first.date
            // --------------------------
            var yearInput = first.published ? first.published : first.date;
            filtered.year = this.extractYear(yearInput);

            // replace hyphen in type
            if (filtered.type && typeof filtered.type === "string") {
                filtered.type = filtered.type.replace("-", "_");
            }

            return filtered;
        } catch (err) {
            this.logError("filterFetchData", err);
            return {};
        }
    },

    extractYear(publishedData) {

        const clean = val => {
            const str = String(val).trim();
            return str.includes("-") ? str.split("-")[0] : str;
        };


        // ---------------------------
        // ✅ NEW FORMAT:
        // date: ["2018"]
        // ---------------------------
        if (Array.isArray(publishedData)) {
            if (publishedData.length > 0) {
                // e.g. ["2018"]
                if (typeof publishedData[0] === "string" || typeof publishedData[0] === "number") {
                    return clean(String(publishedData[0]));
                }
            }
            return "XXXX";
        }

        // ---------------------------
        // ✅ OLD FORMAT (CrossRef)
        // published: { "date-parts": [[2018,6,20]] }
        // ---------------------------
        if (
            publishedData &&
            publishedData["date-parts"] &&
            Array.isArray(publishedData["date-parts"]) &&
            publishedData["date-parts"].length > 0
        ) {
            var year = publishedData["date-parts"][0];

            while (Array.isArray(year) && year.length > 0) {
                year = year[0];
            }

            if (year) return String(year);
        }

        // fallback
        return "XXXX";
    },

    apiFetchReturn(response) {
        let fetchData = {};
        const keyHandle = "author,container-title,page,volume,issue,title,ISSN,publisher,type,DOI,statusCode";
        const assignNewKey = {
            "container-title": "journal",
            "DOI": "doi",
            "statusCode": "status",
            "ISSN": "issn"
        };
        try {
            debug.log(JSON.stringify(response));
            if (response.statusCode === 200 && response.restext !== "Resource not found.") {
                const jsonObj = JSON.parse(response.restext);
                keyHandle.split(",").forEach(key => {
                    const assignKey = assignNewKey[key] || key;
                    if (jsonObj[key] !== undefined) {
                        fetchData[assignKey] = jsonObj[key];
                        /* beautify preserve:start */
                    } else if (jsonObj.created?.[key] !== undefined) {
                        /* beautify preserve:end */
                        fetchData[assignKey] = jsonObj.created[key];
                    }
                });

                fetchData.year = this.findYear(jsonObj);
                // this.processApiResponse(fetchData);
                MultiRefModule.M_FUN.JSON_2_DIALOG(fetchData);
            } else {
                this.handleApiError(response);
            }
        } catch (err) {
            this.logError('apiFetchReturn', err);
            this.handleApiError(response);
        } finally {
            this.sendRecordDb(response, {
                type: "fetch_doi",
                parse_res: fetchData
            });
        }
    },

    findYear(jsonObj) {
        const yearKeys = ['created', 'published-print', 'published-online'];
        for (const key of yearKeys) {
            /* beautify preserve:start */
            const year = jsonObj[key]?.['date-parts']?.[0];
            /* beautify preserve:end */
            if (year) {
                console.log(`${key} ==> ${year}`);
                return year;
            }
        }
        return null;
    },

    handleApiError(response) {
        if (commonMethods.IsVisibleElm(document.getElementById("MultiRefDialog"))) {
            TOASTER_ALERT('doi_fetch_error', {
                type: 'info'
            });
            if (MultiRefModule && MultiRefModule.Panel) {
                $(MultiRefModule.Panel).find(".iSpin_border").addClass("hide");
                $(MultiRefModule.Panel).find("[name='INS_REF_RADIO']").parent().removeClass("disabled");
            }
        }
    },

    doiFetch(doi, options = {}) {
        if (!this.M_SCOPE.initiated) this.init();
        try {
            const json = Object.assign({},
                GET_JSON('cross_ref_url', {
                    content: doi
                }),
                this.M_CONFIG.POST_PARAMS_DOI
            );
            debug.log(JSON.stringify(json));
            commonfn.callajax(json, 'apiFetchReturn', API_CROSS_REF_API, this);
        } catch (err) {
            this.logError('doiFetch', err);
        }
    },

    logError(functionName, error) {
        console.warn(`Error in ${functionName}: ${error.message}`);
        ErrorLogTrace(`CROSS_REF_API.${functionName}`, error.message);
    }
};