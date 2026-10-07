export function isLocalHost(url = '') {
  return /localhost|127\.0\.0\.1/i.test(String(url));
}
