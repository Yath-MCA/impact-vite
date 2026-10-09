export function applyLandingSessionGlobals() {
  const env = (typeof window !== 'undefined' && window.ENV) || {};
  const g = window;
  const apiPath = env.API_PATH || g.API_PATH || '/xmleditor/';
  g.API_PATH = apiPath;
  g.API_LINK_SHARE = g.API_LINK_SHARE || `${apiPath}linksharing`;
  g.API_GET_DOCS = g.API_GET_DOCS || `${apiPath}getdocs`;
  g.APP_KEY = env.APP_KEY || g.APP_KEY || '';
  g.API_KEY = env.API_KEY || g.API_KEY || '';
  g.BUCKET_URL = env.BUCKET_URL || g.BUCKET_URL || '';

  if (typeof g.GET_JSON !== 'function') {
    g.GET_JSON = function getJsonStub() {
      return { tbl: 'linksharing' };
    };
  }
  if (typeof g.ADD_DEFAULT_KEYS !== 'function') {
    g.ADD_DEFAULT_KEYS = function addDefaultKeysStub() {
      return {};
    };
  }
}
