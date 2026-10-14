/** Pure VERSION resolve — safe for browser and Node. */

export function resolveEditorVersion({ envVersion, packageVersion }) {
  const fromEnv = envVersion != null ? String(envVersion).trim() : '';
  if (fromEnv) return fromEnv;
  const fromPkg = packageVersion != null ? String(packageVersion).trim() : '';
  return fromPkg || 'dev';
}
