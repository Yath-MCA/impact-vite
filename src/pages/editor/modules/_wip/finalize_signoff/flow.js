/**
 * FinalizeSignOff flow helpers — stage resolution and phase order.
 * Business role rules match docs/FinalizeSignOff_Workflow.md; this only structures them.
 */

export const FLOW_PHASES = Object.freeze([
    'precheck',
    'confirm',
    'commit',
    'post',
    'exit'
]);

/**
 * Resolve query-open stage from role / workflow flags (pure).
 * @param {Object} ctx
 * @returns {'query_open'|'query_open_co_user'}
 */
export function resolveQueryOpenStage(ctx = {}) {
    const {
        isPrimaryAuthor = true,
        editorComesFirst = false,
        editorOnly = false,
        wflow = '',
        nextRoleIsCo = false,
        isAuthor = false
    } = ctx;

    let is_editor_only_flow = false;
    let is_editor_author_flow = false;

    if (wflow) {
        is_editor_only_flow = wflow === 'editoronly';
        is_editor_author_flow = wflow === 'editorfirst';
    } else if (ctx.hasNextRole) {
        is_editor_only_flow = nextRoleIsCo;
        is_editor_author_flow = !nextRoleIsCo;
    }

    if (is_editor_only_flow && editorOnly) {
        return isPrimaryAuthor ? 'query_open' : 'query_open_co_user';
    }
    if (is_editor_author_flow && editorComesFirst) {
        if (isAuthor && isPrimaryAuthor) {
            return 'query_open';
        }
        return 'query_open_co_user';
    }
    return isPrimaryAuthor ? 'query_open' : 'query_open_co_user';
}

/**
 * Resolve the dialog stage after prechecks (pure).
 * @param {Object} input
 * @returns {{ stage: string, blocked?: boolean, reason?: string }}
 */
export function resolvePrecheckStage(input = {}) {
    if (input.isCountMismatch) {
        return { stage: 'query_mismatch', reason: 'QUERY_COUNT_MISMATCH' };
    }
    if (input.abstractInvalid) {
        return { stage: '', blocked: true, reason: 'ABSTRACT_INVALID' };
    }

    let stage = 'finalize';

    if (input.openQueryCount > 0) {
        stage = resolveQueryOpenStage({
            isPrimaryAuthor: input.isPrimaryAuthor,
            editorComesFirst: input.editorComesFirst,
            editorOnly: input.editorOnly,
            wflow: input.wflow,
            nextRoleIsCo: input.nextRoleIsCo,
            hasNextRole: input.hasNextRole,
            isAuthor: input.isAuthor
        });
    }

    if (
        input.isCollabEnabled &&
        input.isPrimaryAuthor &&
        !(/query/gi.test(stage))
    ) {
        stage = 'collaborative_status';
    }

    if (input.missingCiteCount > 0) {
        stage = 'delete_cite_warn';
    }

    return { stage };
}

/**
 * Pick commit mode from capabilities.
 * @param {Object} caps
 * @returns {'saveWithFinalize'|'saveWithLogout'|'legacy'}
 */
export function resolveCommitMode(caps = {}) {
    if (caps.useSaveWithFinalize) return 'saveWithFinalize';
    if (caps.saveCloseShare) return 'saveWithLogout';
    return 'legacy';
}

/**
 * Next phase helper.
 * @param {string} current
 * @returns {string|null}
 */
export function nextFlowPhase(current) {
    const idx = FLOW_PHASES.indexOf(current);
    if (idx < 0 || idx >= FLOW_PHASES.length - 1) return null;
    return FLOW_PHASES[idx + 1];
}
