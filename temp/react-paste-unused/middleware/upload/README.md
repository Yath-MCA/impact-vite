# upload services

## Purpose / ownership
Multipart file upload: 100 MB/file and 500 MB/total gates, `file_sn`/`file_on`/`ext` sanitize, in-flight promise reuse. Not wired into figures/query/dialogs in this plan — service only.

## Key files
- `fileUploadService.js` — `FileUploadService` class (`Content-Type: multipart/form-data` header, repeated-field FormData for `file_sn`/`file_on`/`ext`), `makeRequest(files, customData)`, `sanitizeAttachmentData`
- `index.js` — singleton `fileUploadService`

## Dependencies
- `services/api/apiService.js` (`API_ENDPOINTS.UPLOAD_MULTI`, `makeRequest` with `rawBody`)
- `services/error/errorContext.js` (`getDefaultDocBag({ stripAcl: true })`, `isLocalHost`)
- `features/editor/messages/editorMessages.js` (`showEditorMessage('upload_file_too_big' | 'upload_size_big')`)

## Status
**active** — call sites (figures, query, supplementary uploads) are out of scope for this plan.
