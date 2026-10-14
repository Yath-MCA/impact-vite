/**
 * savewithfinalize v2 — single-request payload builders.
 * Contract: backend savewithfinalize.md (IMPACT combine API).
 */

/**
 * Role-scoped vs all attachments for finalize combine request.
 * Collator: shared_id_attachments = all document attachments; others = role-scoped only.
 *
 * @param {{ attachmentslist?: string[], overallattachmentslist?: string[] }} attachmentResult
 * @param {boolean} [isCollator]
 * @returns {{ attachmentslist: string[], shared_id_attachments: string[], overallattachmentslist?: string[] }}
 */
export function resolveFinalizeAttachments(attachmentResult = {}, isCollator = false) {
    const roleScoped = Array.isArray(attachmentResult.attachmentslist)
        ? attachmentResult.attachmentslist
        : [];
    const overall = Array.isArray(attachmentResult.overallattachmentslist)
        ? attachmentResult.overallattachmentslist
        : roleScoped;

    if (isCollator) {
        return {
            attachmentslist: roleScoped,
            shared_id_attachments: overall,
            overallattachmentslist: overall
        };
    }

    return {
        attachmentslist: roleScoped,
        shared_id_attachments: roleScoped
    };
}

/**
 * Build finalizeExtras merged into LOG_OUT.saveWithFinalize payload.
 * @param {Object} params
 * @param {string} [params.sharedId]
 * @param {string} [params.trackPDF]
 * @param {Object} [params.pubkitInfo] correction counts for pubkit (Query, Insert, Delete, forMat, Comment)
 * @param {Object} [params.fullTrack] full userTrackData for count_info
 * @param {Object} [params.attachments] output of resolveFinalizeAttachments
 * @param {Object} [params.pubkitConfig] getPubKitConfigJSON() when pubkit task exists
 * @returns {Object}
 */
export function buildSaveWithFinalizeExtras({
    sharedId,
    trackPDF,
    pubkitInfo = {},
    fullTrack = {},
    attachments = {},
    pubkitConfig = null
}) {
    const extras = {
        signoff: true,
        finalize: true,
        shared_id: sharedId,
        trackPDF,
        info: pubkitInfo,
        count_info: {
            query: fullTrack.Query || 0,
            insert: fullTrack.Insert || 0,
            del: fullTrack.Delete || 0
        },
        attachmentslist: attachments.attachmentslist || [],
        shared_id_attachments: attachments.shared_id_attachments || []
    };

    if (attachments.overallattachmentslist) {
        extras.overallattachmentslist = attachments.overallattachmentslist;
    }

    if (pubkitConfig && typeof pubkitConfig === 'object') {
        Object.assign(extras, {
            abstract_task_id: pubkitConfig.abstract_task_id,
            task_id: pubkitConfig.task_id,
            identifier: pubkitConfig.identifier,
            trackPDF: pubkitConfig.trackPDF || trackPDF,
            field_values: pubkitConfig.info,
            fileid: pubkitConfig.fileid,
            projectid: pubkitConfig.projectid,
            docid: pubkitConfig.docid
        });
    }

    return extras;
}

/**
 * Merge save base + finalize extras into v2 jsondata shape (recordtype savewithfinalize).
 * @param {Object} saveData from IMPACT_SAVE.getSaveDataForLogout()
 * @param {Object} finalizeExtras from buildSaveWithFinalizeExtras
 * @param {Object} [sessionFields] process, remarks, session_end_time, source
 * @returns {Object}
 */
export function assembleSaveWithFinalizePayload(saveData, finalizeExtras, sessionFields = {}) {
    return {
        ...saveData,
        ...finalizeExtras,
        ...sessionFields,
        recordtype: 'savewithfinalize',
        lockfile: saveData.lockfile !== undefined ? saveData.lockfile : true
    };
}
