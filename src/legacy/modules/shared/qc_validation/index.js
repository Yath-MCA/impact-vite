/**
 * qc_validation entry for editor moduleSystem (path: ./qc_validation/index.js).
 * Track View must import QcValidationTrackModule.js directly (no BaseModule on that page).
 */
import QcValidationModule from './QcValidationModule.js';

export function getQcValidationClass() {
    if (typeof IS_TRACK_VIEW !== 'undefined' && IS_TRACK_VIEW) {
        // Dynamic import would be async; Track bootstraps QcValidationTrackModule.js instead.
        return null;
    }
    return QcValidationModule;
}

export default QcValidationModule;
export { QcValidationModule };
