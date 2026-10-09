import pkg from '../../../package.json';
import { applyEditorLegacyHelpers } from './editorLegacyHelpers.js';

export function applyLegacyGlobals() {
  const env = (typeof window !== 'undefined' && window.ENV) || {};
  const g = typeof window !== 'undefined' ? window : globalThis;

  g.IS_LIVE_DOMAIN = Boolean(env.IS_LIVE_DOMAIN);
  g.IS_DEV_DOMAIN = Boolean(env.IS_DEV_DOMAIN);
  g.IS_UAT_DOMAIN = Boolean(env.IS_UAT_DOMAIN);
  g.BACKEND_DOMAIN = env.BACKEND_DOMAIN || '';
  g.API_KEY = env.API_KEY || '';
  g.User_API_KEY = env.User_API_KEY || '';
  g.APP_KEY = env.APP_KEY || '';
  g.API_PATH = env.API_PATH || '/xmleditor/';
  g.DOMAIN_ROOT = env.DOMAIN_ROOT || '';
  g.BUCKET_URL = env.BUCKET_URL || 'http://localhost/xmleditor/';
  // Same rule as scripts/resolveEditorVersion.js: ENV.VERSION then package.json
  g.VERSION =
    (env.VERSION && String(env.VERSION).trim()) ||
    (pkg && pkg.version) ||
    g.VERSION ||
    'dev';
  applyEditorLegacyHelpers(g);
}
