const runtimeWindow = typeof window !== 'undefined' ? window : { ENV: {} };

const _runtimeEnv = (windowKey, viteKey, defaultVal) =>
  (runtimeWindow.ENV && runtimeWindow.ENV[windowKey] !== undefined
    ? runtimeWindow.ENV[windowKey]
    : import.meta.env[viteKey] ?? defaultVal);

export const IS_LIVE_DOMAIN = _runtimeEnv('IS_LIVE_DOMAIN', 'VITE_IS_LIVE_DOMAIN', false);
export const IS_DEV_DOMAIN = _runtimeEnv('IS_DEV_DOMAIN', 'VITE_IS_DEV_DOMAIN', false);

export function getRecaptchaSiteKey() {
  if (IS_LIVE_DOMAIN) return '6LdOV5YqAAAAAJui4nPTaSFn7R289JDwUtrYRx7Y';
  if (IS_DEV_DOMAIN) return '6LeiiLoqAAAAADwIiqp3d5-yMkw5Oqdme8hYmW9j';
  return '6LdgzFAqAAAAAOnaiV36VW-SdYuvvICaJqzkOeeR';
}

export const PLOS_AUTH_ENDPOINTS = {
  VERIFY_CAPTCHA: 'verifycaptcha',
  GENERATE_OTP: 'generatetokenotpandsendemail',
  VERIFY_OTP: 'verifyaccesscode'
};
