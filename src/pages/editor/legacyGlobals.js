import pkg from '../../../package.json';
import { FetchService } from '../../shared/httpService.js';
import {
  ADMIN_USER_IDs,
  GET_SENDER_RECEIVER_ID,
  MAIL_DETAIL,
} from '../../shared/legacyMailGlobals.js';
import { applyEditorLegacyHelpers } from './editorLegacyHelpers.js';
import { parseLangResponseText } from './parseLangFile.js';
import {
  parsePageQueryParams,
  resolvePageQueryString,
} from './resolvePageQueryString.js';

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
  g.FetchService = FetchService;
  g.resolvePageQueryString = resolvePageQueryString;
  g.parsePageQueryParams = parsePageQueryParams;
  g.parseLangResponseText = parseLangResponseText;
  if (!Array.isArray(g.ADMIN_USER_IDs)) {
    g.ADMIN_USER_IDs = ADMIN_USER_IDs;
  }
  g.MAIL_DETAIL = g.MAIL_DETAIL || MAIL_DETAIL;
  g.GET_SENDER_RECEIVER_ID = GET_SENDER_RECEIVER_ID;
  if (typeof g.IS_LOCAL_HOST === 'undefined') {
    const href =
      (typeof location !== 'undefined' &&
        (location.hostname || location.href || '')) ||
      '';
    g.IS_LOCAL_HOST = /localhost/i.test(String(href));
  }
  applyEditorLegacyHelpers(g);
}
