let depsCache = null;
let depsPromise = null;

/**
 * Lazy-load finalize helper modules with module-level cache (single flight).
 * @returns {Promise<Object>}
 */
export async function _importDependencies() {
    if (depsCache) {
        return depsCache;
    }
    if (!depsPromise) {
        depsPromise = Promise.all([
            import('./capabilities.js'),
            import('./payload.js'),
            import('./flow.js')
        ]).then(([capabilities, payload, flow]) => {
            depsCache = {
                getFinalizeCapabilities: capabilities.getFinalizeCapabilities,
                shouldSkipCommitStep: capabilities.shouldSkipCommitStep,
                mapCombinedResponseToDone: capabilities.mapCombinedResponseToDone,
                isPostPhaseComplete: capabilities.isPostPhaseComplete,
                resolveRemainingPostSteps: capabilities.resolveRemainingPostSteps,
                resolveFinalizeAttachments: payload.resolveFinalizeAttachments,
                buildSaveWithFinalizeExtras: payload.buildSaveWithFinalizeExtras,
                resolvePrecheckStage: flow.resolvePrecheckStage,
                resolveCommitMode: flow.resolveCommitMode
            };
            return depsCache;
        });
    }
    return depsPromise;
}

export default {
    _importDependencies
};
