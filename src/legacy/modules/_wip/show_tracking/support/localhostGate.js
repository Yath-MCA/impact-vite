/**
 * Localhost gate for WIP simplified Show Tracking stack.
 * Remove or widen when the class-based path is stable on QA/prod.
 */

/**
 * @param {string} [hostname]
 * @returns {boolean}
 */
export function isShowTrackingSimplePath(hostname) {
    try {
        const host = String(
            hostname != null
                ? hostname
                : (typeof location !== 'undefined' && location.hostname) || ''
        ).toLowerCase();
        return host === 'localhost' || host === '127.0.0.1';
    } catch (err) {
        return false;
    }
}
