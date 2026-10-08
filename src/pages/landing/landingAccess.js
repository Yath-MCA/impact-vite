/** Whether validateurl client is PLOS (legacy LANDING_CLIENT === 'plos'). */
export function isPlosClient(clientName) {
  return String(clientName || '').toLowerCase() === 'plos';
}

/**
 * Port of legacy canUserAccessFreely — temporary access window bypasses extra auth.
 */
export function canUserAccessFreely(resData) {
  if (resData?.temporaryAccess) {
    const { $numberLong } = resData.temporaryAccess;
    const currentTime = new Date();

    try {
      let accessData;

      if (typeof $numberLong === 'string') {
        if ($numberLong.startsWith('{')) {
          accessData = JSON.parse($numberLong);
        } else {
          const accessTime = new Date(parseInt($numberLong, 10));
          const hoursDifference = (currentTime - accessTime) / (1000 * 60 * 60);
          return hoursDifference < 4;
        }
      } else {
        accessData = resData.temporaryAccess;
      }

      if (accessData?.expiry) {
        const expiryTime = new Date(parseInt(accessData.expiry.$numberLong, 10));
        return currentTime < expiryTime;
      }
      if (accessData?.create_at) {
        const createTime = new Date(parseInt(accessData.create_at.$numberLong, 10));
        const hoursDifference = (currentTime - createTime) / (1000 * 60 * 60);
        return hoursDifference < 4;
      }
      return false;
    } catch {
      try {
        const accessTime = new Date(parseInt($numberLong, 10));
        if (!Number.isNaN(accessTime.getTime())) {
          const hoursDifference = (currentTime - accessTime) / (1000 * 60 * 60);
          return hoursDifference < 4;
        }
      } catch {
        return false;
      }
    }
  }

  return false;
}

export function isTokenOtpEnabled(resData) {
  return String(resData?.enable || '').toLowerCase() === 'tokenotp';
}

export function shouldRunPlosAuth(resData, response, clientName) {
  if (canUserAccessFreely(resData, response)) return false;
  if (String(resData?.enable || '').toLowerCase() === 'none') return false;
  return isPlosClient(clientName);
}

export function shouldRunLandingAuth(resData, response, clientName) {
  return shouldRunPlosAuth(resData, response, clientName);
}
