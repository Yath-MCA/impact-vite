import { apiService, API_ENDPOINTS } from '../api/apiService.js';
import { getDefaultDocBag, isLocalHost } from '../error/errorContext.js';
import { showEditorMessage } from '../../features/editor/messages/editorMessages.js';

const MAX_SINGLE_FILE_SIZE_MB = 100;
const MAX_MULTI_FILE_SIZE_MB = 500;

function toMb(bytes) {
  return bytes / (1024 * 1024);
}

/**
 * Mirrors impactweb FileUploadModule.sanitizeAttachmentData: drop empty file_sn,
 * pair file_on by the cleaned index, derive ext from sn when missing.
 * Returns {} when none of file_sn/file_on/ext were passed at all.
 */
export function sanitizeAttachmentData(data = {}) {
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

  for (let i = 0; i < safeSn.length; i++) {
    const normalizedSn = String(safeSn[i] || '').trim();
    if (!normalizedSn) continue;

    const normalizedOn = String(safeOn[i] || '').trim();
    let normalizedExt = String(safeExt[i] || '').trim();
    if (!normalizedExt && normalizedSn.indexOf('.') !== -1) {
      normalizedExt = normalizedSn.split('.').pop();
    }

    cleanedSn.push(normalizedSn);
    cleanedOn.push(normalizedOn);
    cleanedExt.push(normalizedExt);
  }

  return { file_sn: cleanedSn, file_on: cleanedOn, ext: cleanedExt };
}

export class FileUploadService {
  constructor(endpoint = API_ENDPOINTS.UPLOAD_MULTI, headers = {}, options = {}) {
    this.uploadUrl = endpoint;
    this.headers = { 'Content-Type': 'multipart/form-data', ...headers };
    this.options = options;
    this._isUploading = false;
    this._inFlightUploadPromise = null;
  }

  isSingleSizeExceeded(fileSize) {
    if (toMb(fileSize) > MAX_SINGLE_FILE_SIZE_MB) {
      showEditorMessage('upload_file_too_big');
      return true;
    }
    return false;
  }

  isMultiSizeExceeded(totalSize) {
    return toMb(totalSize) > MAX_MULTI_FILE_SIZE_MB;
  }

  handleSizeExceeded(subfolder) {
    if (subfolder !== 'images') {
      showEditorMessage('upload_size_big');
    }
    return null;
  }

  appendFiles(formData, fileArr) {
    let totalSize = 0;
    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      if (this.isSingleSizeExceeded(file.size)) return null;
      totalSize += file.size;
      formData.append(`file_${i}`, file);
    }
    return totalSize;
  }

  appendCommonData(formData, customData = {}) {
    const bag = getDefaultDocBag({ stripAcl: true });
    const normalizedAttachments = sanitizeAttachmentData(customData);
    const commonData = {
      tbl: 'Usernotes',
      ...bag,
      ...customData,
      ...normalizedAttachments,
      optional: 1,
      status: '0'
    };

    Object.entries(commonData).forEach(([key, value]) => {
      if (Array.isArray(value) && (key === 'file_on' || key === 'file_sn' || key === 'ext')) {
        value.forEach((item) => formData.append(key, item));
      } else {
        formData.append(key, value);
      }
    });
  }

  debugFormData(formData) {
    if (isLocalHost()) {
      console.log(JSON.stringify(Object.fromEntries(formData.entries())));
    }
  }

  /**
   * Fix vs legacy: legacy's isMultiSizeExceeded(null) evaluates NaN > 500 = false when
   * appendFiles aborts on an oversized single file, so it silently returns a partial
   * FormData instead of aborting. This port aborts outright on that null.
   */
  createFormData(fileArr, customData = {}) {
    const formData = new FormData();
    const { subfolder } = customData;

    this.appendCommonData(formData, customData);
    const totalSize = this.appendFiles(formData, fileArr);
    if (totalSize == null) return null;

    if (this.isMultiSizeExceeded(totalSize)) {
      return this.handleSizeExceeded(subfolder);
    }

    this.debugFormData(formData);
    return formData;
  }

  async makeRequest(files, customData = {}) {
    if (this._inFlightUploadPromise) {
      console.warn('FileUploadService.makeRequest: upload already in progress, returning in-flight promise.');
      return this._inFlightUploadPromise;
    }

    this._isUploading = true;

    const uploadPromise = (async () => {
      try {
        const formData = this.createFormData(Array.from(files || []), customData);
        if (!formData) return null;

        return await apiService.makeRequest(this.uploadUrl, null, {
          rawBody: formData,
          headers: this.headers
        });
      } catch (err) {
        console.error('Error uploading file:', err);
        return null;
      }
    })();

    this._inFlightUploadPromise = uploadPromise;

    return uploadPromise.finally(() => {
      this._isUploading = false;
      this._inFlightUploadPromise = null;
    });
  }
}

export function createFileUploadService(endpoint, headers, options) {
  return new FileUploadService(endpoint, headers, options);
}
