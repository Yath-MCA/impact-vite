/****************START************** */
// HttpService.js
class FetchService {
    constructor(baseConfig = {}) {
        this.config = {
            baseURL: API_PATH,
            appKey: APP_KEY,
            apiKey: API_KEY,
            defaultHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            ...baseConfig
        };
    }

    /**
     * Creates headers with default values and any additional headers
     * @param {Object} additionalHeaders - Optional additional headers to include
     * @returns {Headers} - Headers object with all required headers
     */
    createHeaders(additionalHeaders = {}) {
        return new Headers({
            ...this.config.defaultHeaders,
            'appkey': this.config.appKey,
            'apikey': this.config.apiKey,
            ...additionalHeaders
        });
    }

    /**
     * Builds the full URL for the API request
     * @param {string} endpoint - The API endpoint
     * @returns {string} - The complete URL
     */
    buildUrl(endpoint, apiPath) {
        if (apiPath) return apiPath;

        // If endpoint already looks like a full URL, return it as is
        if (/^https?:\/\//i.test(endpoint)) {
            return endpoint;
        }

        return `${this.config.baseURL}${endpoint}`;
    }

    createDefaultPayload(type = "default", baseData = {}) {
        // Common payload creation logic
        const payload = {
            ...baseData,
            version: '1.0',
            ...(!baseData.find && ADD_DEFAULT_KEYS(type))
        };

        // Add any environment-specific data
        if (typeof RES_DATA !== 'undefined' && RES_DATA.role) {
            payload.rolename = ROLE_IDS[RES_DATA.role]['name'];
        }
        // Explicitly retain roleid from baseData
        if ("roleid" in baseData) {
            payload.roleid = baseData.roleid;
        }

        if ("remove" in baseData && baseData.remove === "_w") {
            delete payload._w;
            delete payload._r;
        }

        // Add any additional default keys based on type
        /*
        switch (type) {
            case "otp":
                payload.otpType = "email";
                payload.channel = "web";
                break;
            case "verify":
                payload.verifyType = "token";
                break;
        }
        */

        return payload;
    }


    /**
     * Prepares the request body
     * @param {Object} data - The data to be sent in the request
     * @returns {string} - The prepared request body
     */
    prepareRequestBody(data, options) {
        const finalData = options.isPayloadLogic ? this.createDefaultPayload("default", data) : data;

        delete finalData['_r'];
        delete finalData['_w'];

        const stringData = JSON.stringify(finalData);
        return `jsondata=${encodeURIComponent(stringData)}`;
    }

    /**
     * Makes an HTTP request with the specified parameters
     * @param {string} endpoint - The API endpoint to call
     * @param {Object} data - The data to send in the request
     * @param {Object} options - Additional fetch options (optional)
     * @returns {Promise} - Promise that resolves with the fetch response
     */
    async makeRequest(endpoint, data, options = {}) {
        const defaultOptions = {
            method: 'POST',
            headers: this.createHeaders(options.headers),
            body: this.prepareRequestBody(data, options)
        };
        const fetchOptions = {
            ...defaultOptions,
            ...options,
            headers: options.headers ? this.createHeaders(options.headers) : defaultOptions.headers
        };
        try {
            return fetch(this.buildUrl(endpoint, options.apiPath), fetchOptions)
                .then(response => {
                    // Check if response is ok
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    // Parse response based on content type
                    const contentType = response.headers.get('content-type');

                    if (contentType && contentType.includes('application/json')) {
                        return response.json();
                    } else if (contentType && contentType.includes('text/')) {
                        return response.json();
                    } else {
                        return response.json();
                    }
                })
                .then(data => {
                    // Success - return the parsed data
                    // console.log('Request successful:', data);
                    return data;
                })
                .catch(error => {
                    // Handle both network errors and HTTP errors
                    // console.error('makeRequest error:', error);
                    // Re-throw for caller to handle
                    throw error;
                });
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }
}

export { FetchService };