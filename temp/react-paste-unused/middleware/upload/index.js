import { createFileUploadService } from './fileUploadService.js';

export const fileUploadService = createFileUploadService();

export { createFileUploadService, FileUploadService, sanitizeFileArrays } from './fileUploadService.js';

export default fileUploadService;
