/** Ported from skipped src/legacy/js/index.js */

export function getramdon() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

export function s4() {
  let new_rand = getramdon();
  try {
    let loop = 10;
    let i = 0;
    while (i < loop && !isNaN(Number(new_rand.charAt(0)))) {
      new_rand = getramdon();
      i++;
    }
    return new_rand;
  } catch {
    return 'i' + new_rand;
  }
}

export function d2() {
  return Math.floor(Math.random() * 90 + 10);
}

export function d4() {
  return Math.floor(1000 + Math.random() * 9000);
}

export function getuniqueid() {
  return (
    new Date().getTime() +
    '-' +
    getramdon() +
    '-' +
    getramdon() +
    '-' +
    getramdon()
  );
}

export function guid() {
  return (
    getramdon() +
    getramdon() +
    '-' +
    getramdon() +
    '-' +
    getramdon() +
    '-' +
    getramdon() +
    '-' +
    getramdon()
  );
}

export function applyLegacyIdHelpers(g) {
  if (typeof g.getramdon !== 'function') g.getramdon = getramdon;
  if (typeof g.s4 !== 'function') g.s4 = s4;
  if (typeof g.d2 !== 'function') g.d2 = d2;
  if (typeof g.d4 !== 'function') g.d4 = d4;
  if (typeof g.getuniqueid !== 'function') g.getuniqueid = getuniqueid;
  if (typeof g.guid !== 'function') g.guid = guid;
}
