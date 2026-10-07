export const pages = {
  home: {
    loadConfig: () => import('../pages/home/page.config.js'),
    loadHtml: async () => (await import('../pages/home/index.html?raw')).default,
  },
  login: {
    loadConfig: () => import('../pages/login/page.config.js'),
  },
  editor: {
    loadConfig: () => import('../pages/editor/page.config.js'),
    loadHtml: async () => '<div class="page-stub p-8 text-slate-600">Editor (stub)</div>',
  },
  dashboard: {
    loadConfig: () => import('../pages/dashboard/page.config.js'),
  },
};

export function getPage(id) {
  const entry = pages[id];
  if (!entry) throw new Error(`Unknown page: ${id}`);
  return entry;
}
