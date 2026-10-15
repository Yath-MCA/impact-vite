/**
 * Legacy path — prefer importing `./index.js` directly.
 * Dynamic import avoids a static cycle with the island entry.
 */
export async function initQueryCommentSystem(...args) {
  const m = await import('./index.js');
  return m.initQueryCommentSystem(...args);
}

export async function ensureQueryModule(...args) {
  const m = await import('./index.js');
  return m.ensureQueryModule(...args);
}
