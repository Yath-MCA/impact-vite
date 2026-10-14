/**
 * Distinguishes link-share check r==0 conflict grants from bare DB/server errors.
 * Port of legacy LinkSessionCore.isCheckErrorResponse / isConflictShapedCheckResponse.
 */

export function isCheckErrorResponse(response) {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const message = String(response.message || response.error || '').trim();
  if (message) {
    const lower = message.toLowerCase();
    if (
      lower.includes('error while accessing db') ||
      lower.includes('classcastexception') ||
      lower.includes('exception') ||
      lower.includes('error while accessing')
    ) {
      return true;
    }
  }

  if (response.r == 0) {
    const hasConflictShape =
      response.requeststatus != null ||
      response.session_id ||
      response.session_start_time ||
      response.role != null;
    if (!hasConflictShape) {
      return true;
    }
  }

  return false;
}

export function isConflictShapedCheckResponse(response) {
  if (!response || response.r != 0 || isCheckErrorResponse(response)) {
    return false;
  }
  return (
    response.requeststatus != null ||
    Boolean(response.session_id) ||
    response.role != null ||
    Boolean(response.session_start_time)
  );
}

export function shouldRetryLandingVerify(reason) {
  return reason === 'no_active_row' || reason === 'record_mismatch';
}
