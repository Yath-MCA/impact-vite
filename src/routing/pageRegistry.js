export const pages = {
  home: {
    loadConfig: () => import('../pages/home/page.config.js'),
    loadHtml: async () => (await import('../pages/home/index.html?raw')).default,
  },
  login: {
    loadConfig: () => import('../pages/login/page.config.js'),
    loadHtml: async () => (await import('../pages/login/login.html?raw')).default,
  },
  editor: {
    loadConfig: () => import('../pages/editor/page.config.js'),
    loadHtml: async () => '<div class="page-stub">Editor (stub)</div>',
  },
  dashboard: {
    loadConfig: () => import('../pages/dashboard/page.config.js'),
    loadHtml: async () => '<div class="page-stub">Dashboard (stub)</div>',
  },
};

export function getPage(id) {
  const entry = pages[id];
  if (!entry) throw new Error(`Unknown page: ${id}`);
  return entry;
}
