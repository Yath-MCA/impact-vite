/**
 * FinalizeSignOff backend capability map.
 * When a flag is true, the FE must not re-fire that subprocess.
 *
 * Defaults = legacy multi-AJAX (all false).
 * Overrides: window.IMPACT_FINALIZE_CAPABILITIES
 * Shortcuts:
 *   window.IMPACT_FINALIZE_USE_SAVE_WITH_LOGOUT = true  → saveCloseShare
 *   window.IMPACT_SAVE_WITH_FINALIZE_READY = true       → fuller backend ownership
 */

export function getDefaultFinalizeCapabilities() {
    return {
        useSaveWithFinalize: false,
        /** saveWithLogout / saveWithFinalize covers save + session close + ShareInvite sign-off */
        saveCloseShare: false,
        correctionCount: false,
        querySnapshot: false,
        updateSignOffTime: false,
        postPubkit: false,
        postWorkflowShare: false,
        coRoleMail: false,
        postSignoffStatus: false,
        postCoroleLinkSignoff: false,
        postCollatorAttachments: false,
        postNonPubkitMail: false
    };
}

/**
 * Merge defaults + window shortcuts + window map + call-site overrides.
 * @param {Object} [overrides]
 * @param {Object} [env] optional env for tests (window-like)
 * @returns {Object}
 */
export function getFinalizeCapabilities(overrides = {}, env) {
    const root = env || (typeof window !== 'undefined' ? window : {});
    const defaults = getDefaultFinalizeCapabilities();
    const fromWindow = (root.IMPACT_FINALIZE_CAPABILITIES && typeof root.IMPACT_FINALIZE_CAPABILITIES === 'object')
        ? root.IMPACT_FINALIZE_CAPABILITIES
        : {};

    let merged = { ...defaults };

    if (root.IMPACT_SAVE_WITH_FINALIZE_READY === true) {
        merged = {
            ...merged,
            useSaveWithFinalize: true,
            saveCloseShare: true,
            correctionCount: true,
            querySnapshot: true,
            updateSignOffTime: true,
            postPubkit: true,
            postWorkflowShare: true,
            coRoleMail: true,
            postSignoffStatus: true,
            postCoroleLinkSignoff: true,
            postCollatorAttachments: true,
            postNonPubkitMail: true
        };
    } else if (root.IMPACT_FINALIZE_USE_SAVE_WITH_LOGOUT === true) {
        merged = {
            ...merged,
            saveCloseShare: true
        };
    }

    return {
        ...merged,
        ...fromWindow,
        ...overrides
    };
}

/**
 * @param {Object} caps
 * @param {string} step capability key
 * @param {Object} [done] steps already completed by a prior API response
 * @returns {boolean}
 */
export function shouldSkipCommitStep(caps, step, done = {}) {
    if (!step) return false;
    if (done && done[step]) return true;

    const useFinalize = caps && caps.useSaveWithFinalize;

    if (!useFinalize && caps && caps[step]) return true;

    if (step === 'shareSignoff' && done.saveCloseShare) return true;
    if ((step === 'forceSaveClose' || step === 'closeSession') && done.saveCloseShare) return true;

    if (!useFinalize) {
        if (step === 'shareSignoff' && caps && caps.saveCloseShare) return true;
        if ((step === 'forceSaveClose' || step === 'closeSession') && caps && caps.saveCloseShare) return true;
    }

    return false;
}

/**
 * @param {Object} [section]
 * @returns {boolean}
 */
export function isSectionSuccess(section) {
    return !!(section && section.r === 1);
}

/**
 * Build shareResponse for closesharedpost / redirect (prefers shareandinvite.key).
 * @param {Object} response
 * @param {boolean} success
 * @returns {Object}
 */
export function buildShareResponseFromCombine(response = {}, success = false) {
    const share = response.shareandinvite || response.share || response.finalize || response.signoff;
    if (share && typeof share === 'object') {
        return {
            r: share.r != null ? share.r : (success ? 1 : 0),
            m: share.message || share.m,
            key: share.key,
            id: share.id
        };
    }
    if (success) {
        return { r: 1, m: response.message || 'Updated successfully' };
    }
    return {
        r: 0,
        m: (response.error && response.error.m) || response.message || 'finalize failed'
    };
}

/**
 * Map saveWithLogout / saveWithFinalize response into completed-step flags.
 * @param {Object} response
 * @param {Object} caps
 * @returns {Object}
 */
export function mapCombinedResponseToDone(response = {}, caps = {}) {
    const done = {};

    if (response.error) {
        return {
            success: false,
            done,
            shareResponse: buildShareResponseFromCombine(response, false)
        };
    }

    const saveOk = isSectionSuccess(response.save);
    const sessionOk = isSectionSuccess(response.session) || isSectionSuccess(response.logout);
    const shareOk = isSectionSuccess(response.shareandinvite) ||
        isSectionSuccess(response.share) ||
        isSectionSuccess(response.finalize) ||
        isSectionSuccess(response.signoff);

    const finalizePathOk = sessionOk || shareOk ||
        (saveOk && response.message && !response.error);

    const success = !!(
        response.success === true ||
        (saveOk && finalizePathOk) ||
        (saveOk && response.r === 1 && !response.logout && !response.session && !response.shareandinvite)
    );

    if (saveOk && isSectionSuccess(response.logout) && !response.shareandinvite && !response.session) {
        done.saveCloseShare = true;
        done.forceSaveClose = true;
        done.closeSession = true;
        done.shareSignoff = true;
    }

    if (saveOk && sessionOk) {
        done.saveCloseShare = true;
        done.forceSaveClose = true;
        done.closeSession = true;
    }

    if (shareOk) {
        done.shareSignoff = true;
        if (saveOk) {
            done.saveCloseShare = true;
        }
    }

    if (isSectionSuccess(response.corolesignoff)) {
        done.postCoroleLinkSignoff = true;
    }

    if (isSectionSuccess(response.collatorrolesignoffstatus)) {
        done.postSignoffStatus = true;
    }

    if (isSectionSuccess(response.closetaskres) || isSectionSuccess(response.taskclosureuser)) {
        done.postPubkit = true;
    }

    if (isSectionSuccess(response.closetaskres) && response.closetaskres.closetaskstatus === 'SUCCESS') {
        done.postWorkflowShare = true;
    }

    if (isSectionSuccess(response.taskclosureuser)) {
        done.postCollatorAttachments = true;
    }

    if (success && caps.correctionCount && saveOk) {
        done.correctionCount = true;
    }
    if (success && caps.querySnapshot && saveOk) {
        done.querySnapshot = true;
    }
    if (success && caps.updateSignOffTime && shareOk) {
        done.updateSignOffTime = true;
    }

    if (response.completedSteps && typeof response.completedSteps === 'object') {
        Object.assign(done, response.completedSteps);
    }

    return {
        success,
        done,
        shareResponse: buildShareResponseFromCombine(response, success)
    };
}

/** Post-phase steps closesharedpost may still run (FE-owned). */
export const POST_PHASE_STEPS = [
    'coRoleMail',
    'postSignoffStatus',
    'postCoroleLinkSignoff',
    'postPubkit',
    'postCollatorAttachments',
    'postWorkflowShare',
    'postNonPubkitMail'
];

/**
 * Context for which post-phase branches apply.
 * @typedef {Object} PostPhaseContext
 * @property {boolean} [isPrimaryAuthor]
 * @property {boolean} [isCollator]
 * @property {boolean} [hasPubkitTask]
 * @property {boolean} [hasWorkflow]
 * @property {boolean} [noWorkflow]
 * @property {boolean} [externalMail]
 */

/**
 * Steps still requiring FE execution after combine commit.
 * @param {Object} [done]
 * @param {Object} [caps]
 * @param {PostPhaseContext} [ctx]
 * @returns {string[]}
 */
export function resolveRemainingPostSteps(done = {}, caps = {}, ctx = {}) {
    const remaining = [];
    const needs = (step) => !shouldSkipCommitStep(caps, step, done);
    const {
        isPrimaryAuthor = true,
        isCollator = false,
        hasPubkitTask = false,
        hasWorkflow = false,
        noWorkflow = false,
        externalMail = false
    } = ctx;

    if (!isPrimaryAuthor) {
        if (needs('coRoleMail')) {
            remaining.push('coRoleMail');
        }
        return remaining;
    }

    if (needs('postSignoffStatus')) {
        remaining.push('postSignoffStatus');
    }
    if (needs('postCoroleLinkSignoff')) {
        remaining.push('postCoroleLinkSignoff');
    }

    if (hasPubkitTask && !isCollator) {
        if (needs('postPubkit')) {
            remaining.push('postPubkit');
        }
    } else if (isCollator || noWorkflow) {
        if (isCollator && needs('postCollatorAttachments')) {
            remaining.push('postCollatorAttachments');
        }
        if (externalMail && needs('postNonPubkitMail')) {
            remaining.push('postNonPubkitMail');
        }
    } else if (hasWorkflow) {
        if (needs('postWorkflowShare')) {
            remaining.push('postWorkflowShare');
        }
        if (externalMail && needs('postNonPubkitMail')) {
            remaining.push('postNonPubkitMail');
        }
    }

    return remaining;
}

/**
 * True when no post-phase AJAX remains for this role/branch.
 * @param {Object} [done]
 * @param {Object} [caps]
 * @param {PostPhaseContext} [ctx]
 * @returns {boolean}
 */
export function isPostPhaseComplete(done = {}, caps = {}, ctx = {}) {
    return resolveRemainingPostSteps(done, caps, ctx).length === 0;
}
