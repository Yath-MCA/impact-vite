export function isValidVariable(variable) {
  return (
    variable !== null &&
    variable !== undefined &&
    variable !== '' &&
    variable !== 'null' &&
    variable !== 'undefined'
  );
}

export function applyEditorLegacyHelpers(
  g = typeof window !== 'undefined' ? window : globalThis
) {
  g.isValidVariable = isValidVariable;
  if (typeof g.IS_TRACK_VIEW === 'undefined') g.IS_TRACK_VIEW = false;
  if (typeof g.IS_EDITOR_PAGE === 'undefined') {
    const hash = typeof location !== 'undefined' ? location.hash || '' : '';
    g.IS_EDITOR_PAGE = /#\/?editor/i.test(hash);
  }
}
