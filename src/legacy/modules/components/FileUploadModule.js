/*
 * DEV REMARKS
 * - Upload re-entry protection is centralized in FileUploadModule.
 * - Duplicate rapid calls reuse the same in-flight promise.
 * - This prevents repeated network requests from double-clicks or near-simultaneous triggers.
 * - Keep module-specific upload flows thin and avoid adding subclass-level upload locks.
 */


class FileUploadModule {
    constructor(endPoint, headers = {}, options = {}) {
        this.USER_INFO = USER_INFO;
        this.DOC_ID = DOC_ID;
        this.IS_LOCAL_HOST = IS_LOCAL_HOST;
        this._isUploading = false;
        this._inFlightUploadPromise = null;

        // size limits in MB
        this.MAX_SINGLE_FILE_SIZE_MB = 100;
        this.MAX_MULTI_FILE_SIZE_MB = 500;

        this.uploadUrl = endPoint;
        this.headers = {
            'Content-Type': 'multipart/form-data',
            'appKey': APP_KEY,
            'apiKey': API_KEY,
            ...headers
        };
    }

    async makeRequest(files, customData = {}) {
        if (this._inFlightUploadPromise) {
            console.warn('FileUploadModule.makeRequest: upload already in progress, returning in-flight promise.');
            return this._inFlightUploadPromise;
        }

        this._isUploading = true;
        this._inFlightUploadPromise = (async () => {
            try {
                const formData = this.createFormData(files, customData);
                if (!formData) return null;

                const response = await axios.post(this.uploadUrl, formData, {
                    headers: this.headers
                });
                debug.log('File uploaded successfully:', response);

                return response.data;
            } catch (error) {
                console.error('Error uploading file:', error);
                return null;
            } finally {
                this._isUploading = false;
                this._inFlightUploadPromise = null;
            }
        })();

        return this._inFlightUploadPromise;
    }

    createFormData(fileArr, customData = {}) {
        const formData = new FormData();
        const {
            subfolder
        } = customData;

        this.appendCommonData(formData, customData);
        const totalSize = this.appendFiles(formData, fileArr);

        // Validate total size
        if (this.isMultiSizeExceeded(totalSize)) {
            return this.handleSizeExceeded(subfolder, "multi");
        }

        this.debugFormData(formData);
        return formData;
    }

    appendFiles(formData, fileArr) {
        let totalSize = 0;

        for (let i = 0; i < fileArr.length; i++) {
            const file = fileArr[i];

            // Validate each file
            if (this.isSingleSizeExceeded(file.size)) {
                // stop if invalid
                return null;
            }

            totalSize += file.size;
            formData.append(`file_${i}`, file);
        }

        return totalSize;
    }

    // Single file validation
    isSingleSizeExceeded(fileSize) {
        const sizeMb = fileSize / (1024 * 1024);
        if (sizeMb > this.MAX_SINGLE_FILE_SIZE_MB) {
            this.showSizeExceededMessage("single");
            return true;
        }
        return false;
    }

    // Multi file total validation
    isMultiSizeExceeded(totalSize) {
        const sizeMb = totalSize / (1024 * 1024);
        return sizeMb > this.MAX_MULTI_FILE_SIZE_MB;
    }

    handleSizeExceeded(subfolder, type) {
        if (subfolder === "images") {
            debug.log(`alert will handle in same dialog itself (${type} limit exceeded)`);
        } else {
            this.showSizeExceededMessage(type);
        }
        return null;
    }

    showSizeExceededMessage(type = "multi") {
        const msgKey = type === "single" ? "upload_file_too_big" : "upload_size_big";
        TOASTER_ALERT(msgKey, {
            type: 'info'
        });
    }

    appendCommonData(formData, customData = {}) {
        const defaults = GET_JSON("default");
        delete defaults._w;
        delete defaults._r;

        const normalizedAttachments = this.sanitizeAttachmentData(customData);
        const commonData = Object.assign({
            tbl: 'Usernotes',
        }, defaults, customData, normalizedAttachments, {
            optional: 1,
            status: "0"
        });

        Object.entries(commonData).forEach(([key, value]) => {
            if (Array.isArray(value) && (key === "file_on" || key === "file_sn" || key === "ext")) {
                value.forEach(item => formData.append(key, item));
            } else {
                formData.append(key, value);
            }
        });

    }

    sanitizeAttachmentData(data = {}) {
        const snList = Array.isArray(data.file_sn) ? data.file_sn : null;
        const onList = Array.isArray(data.file_on) ? data.file_on : null;
        const extList = Array.isArray(data.ext) ? data.ext : null;

        if (!snList && !onList && !extList) return {};

        const safeSn = snList || [];
        const safeOn = onList || [];
        const safeExt = extList || [];

        const cleanedSn = [];
        const cleanedOn = [];
        const cleanedExt = [];
        let nameIdx = 0;

        for (let i = 0; i < safeSn.length; i++) {
            const normalizedSn = ((safeSn[i] || "") + "").trim();
            if (!normalizedSn) continue;

            const normalizedOn = ((safeOn[nameIdx] || safeOn[i] || "") + "").trim();
            let normalizedExt = ((safeExt[i] || "") + "").trim();

            if (!normalizedExt && normalizedSn.indexOf(".") !== -1) {
                normalizedExt = normalizedSn.split(".").pop();
            }

            cleanedSn.push(normalizedSn);
            cleanedOn.push(normalizedOn);
            cleanedExt.push(normalizedExt);
            nameIdx++;
        }

        return {
            file_sn: cleanedSn,
            file_on: cleanedOn,
            ext: cleanedExt
        };
    }

    debugFormData(formData) {
        if (this.IS_LOCAL_HOST) {
            console.log(JSON.stringify(Object.fromEntries(formData.entries())));
        }
    }

}
