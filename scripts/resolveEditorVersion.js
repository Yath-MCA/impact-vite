import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

export function resolveEditorVersion({ envVersion, packageVersion }) {
  const fromEnv = envVersion != null ? String(envVersion).trim() : '';
  if (fromEnv) return fromEnv;
  const fromPkg = packageVersion != null ? String(packageVersion).trim() : '';
  return fromPkg || 'dev';
}

export function readEditorVersionFromRepo(rootDir) {
  const require = createRequire(path.join(rootDir, 'package.json'));
  const pkg = require(path.join(rootDir, 'package.json'));
  let envVersion = process.env.VERSION || '';
  const envJs = path.join(rootDir, 'public', 'env.js');
  if (!envVersion && fs.existsSync(envJs)) {
    const text = fs.readFileSync(envJs, 'utf8');
    const m = text.match(/"VERSION"\s*:\s*"([^"]*)"/);
    if (m) envVersion = m[1];
  }
  return resolveEditorVersion({ envVersion, packageVersion: pkg.version });
}
