# SPA Page Meta and Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply per-page title, meta, favicon, and logos at runtime for home and login (with editor/dashboard config stubs) via co-located `page.config.js`, shared helpers, thin registry, and Redux `pageMeta`.

**Architecture:** Each page folder owns `page.config.js`. `loadPage(id)` loads body HTML + config, dispatches `setPageMeta`, then calls `applyDocumentHead` and `applyPageBranding`. Root `index.html` keeps only fallback head tags. No branding data in the registry.

**Tech Stack:** Vite 8, vanilla JS modules, Redux Toolkit, Vitest (happy-dom), Playwright.

**Spec:** [docs/superpowers/specs/2026-10-07-spa-page-meta-and-error-reporting-design.md](../specs/2026-10-07-spa-page-meta-and-error-reporting-design.md)

**Companion plan:** Error reporting is [2026-10-07-redux-error-reporting.md](./2026-10-07-redux-error-reporting.md) — implement after this plan’s core tasks pass.

## Global Constraints

- Page HTML fragments must be **body-only** (no document `<head>`).
- Config shape keys: `id`, `title`, `description`, `keywords`, `favicon`, `appleTouchIcon`, `productName`, `logos.header`, `logos.login`.
- Favicon v1 paths use existing `public/favicon.svg` until legacy `ng_favicon.ico` is copied into the repo.
- Logo `src` set via `[data-brand="header-logo"]` and `[data-brand="login-logo"]` only.
- Helpers in `src/shared/` must stay framework-agnostic (no React imports).
- TDD: write failing tests before implementation in each task.
- Do not implement editor plugins or backend mail/DB in this plan.

## File map

| File | Responsibility |
|------|----------------|
| `src/shared/documentHead.js` | Upsert title/meta/favicon on `document` |
| `src/shared/pageBranding.js` | Set logo `src`/`alt` under a root element |
| `src/shared/extractBody.js` | Strip full-document HTML to body innerHTML |
| `src/middleware/redux/pageMetaSlice.js` | Current page config in Redux |
| `src/middleware/redux/store.js` | Register `pageMeta` reducer |
| `src/routing/pageRegistry.js` | id → config + HTML loaders |
| `src/routing/loadPage.js` | Orchestrate load → dispatch → apply |
| `src/pages/*/page.config.js` | Per-page meta/branding |
| `src/pages/home/index.html` | Body fragment + `data-brand` |
| `src/pages/login/login.html` | Body fragment + `data-brand` |
| `src/main.js` | Wire `loadPage`, hash/click navigation |
| `index.html` | Shell + fallback head |
| `tests/unit/**` | Vitest |
| `tests/harness/**` | Isolated helper fixtures |
| `tests/e2e/**` | Playwright SPA flows |
| `playwright.config.js` | Playwright config |
| `package.json` | test scripts + deps |

---

### Task 1: `applyDocumentHead` (TDD)

**Files:**
- Create: `src/shared/documentHead.js`
- Test: `tests/unit/documentHead.test.js`
- Modify: `package.json` (ensure `vitest`, `happy-dom` scripts if missing)
- Modify: `vitest.config.js` (include `tests/unit/**`)

**Interfaces:**
- Consumes: page config object (`title`, `description`, `keywords`, `favicon`, `appleTouchIcon`)
- Produces: `applyDocumentHead(config: PageConfig): void`

- [ ] **Step 1: Ensure Vitest can run**

Add/confirm in `package.json`:

```json
{
  "scripts": {
    "test:unit": "vitest run tests/unit",
    "test:unit:watch": "vitest tests/unit"
  },
  "devDependencies": {
    "vitest": "^3.2.0",
    "happy-dom": "^20.0.0"
  }
}
```

Update `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/unit/**/*.{test,spec}.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

Run: `npm install`

- [ ] **Step 2: Write the failing test**

Create `tests/unit/documentHead.test.js`:

```js
import { beforeEach, describe, expect, it } from 'vitest';
import { applyDocumentHead } from '../../src/shared/documentHead.js';

describe('applyDocumentHead', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  it('sets title and upserts meta and favicon links', () => {
    applyDocumentHead({
      id: 'home',
      title: 'IMPACT',
      description: 'Online proofing',
      keywords: 'impact,proofing',
      favicon: '/favicon.svg',
      appleTouchIcon: '/favicon.svg',
      productName: 'IMPACT',
      logos: {},
    });

    expect(document.title).toBe('IMPACT');
    expect(document.querySelector('meta[name="description"]')?.content).toBe('Online proofing');
    expect(document.querySelector('meta[name="keywords"]')?.content).toBe('impact,proofing');
    expect(document.querySelector('link[rel="icon"]')?.href).toContain('/favicon.svg');
    expect(document.querySelector('link[rel="apple-touch-icon"]')?.href).toContain('/favicon.svg');
  });

  it('updates existing tags on second call', () => {
    applyDocumentHead({
      id: 'home',
      title: 'IMPACT',
      description: 'A',
      keywords: 'a',
      favicon: '/favicon.svg',
      appleTouchIcon: '/favicon.svg',
      productName: 'IMPACT',
      logos: {},
    });
    applyDocumentHead({
      id: 'login',
      title: 'IMPACT | Log In',
      description: 'B',
      keywords: 'b',
      favicon: '/favicon.svg',
      appleTouchIcon: '/favicon.svg',
      productName: 'IMPACT',
      logos: {},
    });

    expect(document.title).toBe('IMPACT | Log In');
    expect(document.querySelectorAll('link[rel="icon"]').length).toBe(1);
    expect(document.querySelector('meta[name="description"]')?.content).toBe('B');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/documentHead.test.js`

Expected: FAIL (module not found or export missing)

- [ ] **Step 4: Implement `applyDocumentHead`**

Create `src/shared/documentHead.js`:

```js
function upsertMeta(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content ?? '');
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href ?? '');
}

export function applyDocumentHead(config) {
  if (!config) return;
  document.title = config.title ?? '';
  upsertMeta('description', config.description ?? '');
  upsertMeta('keywords', config.keywords ?? '');
  if (config.favicon) upsertLink('icon', config.favicon);
  if (config.appleTouchIcon) upsertLink('apple-touch-icon', config.appleTouchIcon);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/documentHead.test.js`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/shared/documentHead.js tests/unit/documentHead.test.js
git commit -m "feat: add applyDocumentHead helper with unit tests"
```

---

### Task 2: `applyPageBranding` (TDD)

**Files:**
- Create: `src/shared/pageBranding.js`
- Test: `tests/unit/pageBranding.test.js`

**Interfaces:**
- Consumes: `root: Element`, config with `productName`, `logos.header`, `logos.login`
- Produces: `applyPageBranding(root, config): void`

- [ ] **Step 1: Write the failing test**

```js
import { beforeEach, describe, expect, it } from 'vitest';
import { applyPageBranding } from '../../src/shared/pageBranding.js';

describe('applyPageBranding', () => {
  let root;

  beforeEach(() => {
    root = document.createElement('div');
    root.innerHTML = `
      <img data-brand="header-logo" src="" alt="" />
      <img data-brand="login-logo" src="" alt="" />
    `;
  });

  it('sets logo src and alt from config', () => {
    applyPageBranding(root, {
      productName: 'IMPACT',
      logos: {
        header: '/img/header.png',
        login: '/img/login.svg',
      },
    });

    expect(root.querySelector('[data-brand="header-logo"]').getAttribute('src')).toBe('/img/header.png');
    expect(root.querySelector('[data-brand="header-logo"]').getAttribute('alt')).toBe('IMPACT');
    expect(root.querySelector('[data-brand="login-logo"]').getAttribute('src')).toBe('/img/login.svg');
  });

  it('skips missing brand nodes and missing logo keys', () => {
    root.innerHTML = `<img data-brand="header-logo" src="old" alt="x" />`;
    applyPageBranding(root, { productName: 'IMPACT', logos: { login: '/img/login.svg' } });
    expect(root.querySelector('[data-brand="header-logo"]').getAttribute('src')).toBe('old');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/pageBranding.test.js`

Expected: FAIL

- [ ] **Step 3: Implement**

Create `src/shared/pageBranding.js`:

```js
export function applyPageBranding(root, config) {
  if (!root || !config) return;
  const logos = config.logos || {};
  const alt = config.productName || '';

  const header = root.querySelector('[data-brand="header-logo"]');
  if (header && logos.header) {
    header.setAttribute('src', logos.header);
    header.setAttribute('alt', alt);
  }

  const login = root.querySelector('[data-brand="login-logo"]');
  if (login && logos.login) {
    login.setAttribute('src', logos.login);
    login.setAttribute('alt', alt);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/pageBranding.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/pageBranding.js tests/unit/pageBranding.test.js
git commit -m "feat: add applyPageBranding helper with unit tests"
```

---

### Task 3: `pageMeta` Redux slice + store wiring

**Files:**
- Create: `src/middleware/redux/pageMetaSlice.js`
- Modify: `src/middleware/redux/store.js`
- Test: `tests/unit/pageMetaSlice.test.js`

**Interfaces:**
- Produces: `setPageMeta(config)`, `clearPageMeta()`, selector state at `state.pageMeta.current`

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, it } from 'vitest';
import { store } from '../../src/middleware/redux/store.js';
import { setPageMeta, clearPageMeta } from '../../src/middleware/redux/pageMetaSlice.js';

describe('pageMeta slice', () => {
  it('stores current page config', () => {
    const cfg = { id: 'home', title: 'IMPACT', logos: {} };
    store.dispatch(setPageMeta(cfg));
    expect(store.getState().pageMeta.current).toEqual(cfg);
    store.dispatch(clearPageMeta());
    expect(store.getState().pageMeta.current).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/pageMetaSlice.test.js`

Expected: FAIL

- [ ] **Step 3: Implement slice and register**

Create `src/middleware/redux/pageMetaSlice.js`:

```js
import { createSlice } from '@reduxjs/toolkit';

const pageMetaSlice = createSlice({
  name: 'pageMeta',
  initialState: { current: null },
  reducers: {
    setPageMeta(state, action) {
      state.current = action.payload;
    },
    clearPageMeta(state) {
      state.current = null;
    },
  },
});

export const { setPageMeta, clearPageMeta } = pageMetaSlice.actions;
export default pageMetaSlice.reducer;
```

Update `src/middleware/redux/store.js` to import and add `pageMeta: pageMetaReducer` alongside existing `panel`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/pageMetaSlice.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/middleware/redux/pageMetaSlice.js src/middleware/redux/store.js tests/unit/pageMetaSlice.test.js
git commit -m "feat: add pageMeta Redux slice"
```

---

### Task 4: Page configs + registry + body extract

**Files:**
- Create: `src/pages/home/page.config.js`
- Create: `src/pages/login/page.config.js`
- Create: `src/pages/editor/page.config.js`
- Create: `src/pages/dashboard/page.config.js`
- Create: `src/routing/pageRegistry.js`
- Create: `src/shared/extractBody.js`
- Test: `tests/unit/pageConfigs.test.js`
- Test: `tests/unit/extractBody.test.js`

**Interfaces:**
- Produces: `pages[id](): Promise<{ default: PageConfig }>`
- Produces: `getPageLoaders(id)` returning `{ loadConfig, loadHtml }`
- Produces: `extractBodyHtml(html: string): string`

- [ ] **Step 1: Write failing config schema test**

```js
import { describe, expect, it } from 'vitest';
import home from '../../src/pages/home/page.config.js';
import login from '../../src/pages/login/page.config.js';
import editor from '../../src/pages/editor/page.config.js';
import dashboard from '../../src/pages/dashboard/page.config.js';

const required = ['id', 'title', 'favicon', 'appleTouchIcon', 'productName', 'logos'];

describe('page configs', () => {
  it.each([
    ['home', home],
    ['login', login],
    ['editor', editor],
    ['dashboard', dashboard],
  ])('%s has required keys and matching id', (id, cfg) => {
    for (const key of required) {
      expect(cfg).toHaveProperty(key);
    }
    expect(cfg.id).toBe(id);
  });
});
```

- [ ] **Step 2: Write failing extractBody test**

```js
import { describe, expect, it } from 'vitest';
import { extractBodyHtml } from '../../src/shared/extractBody.js';

describe('extractBodyHtml', () => {
  it('returns inner body when full document provided', () => {
    const html = `<!DOCTYPE html><html><head><title>X</title></head><body><div id="x">Hi</div></body></html>`;
    expect(extractBodyHtml(html)).toContain('id="x"');
    expect(extractBodyHtml(html)).not.toContain('<head>');
  });

  it('returns fragment as-is when no body tag', () => {
    expect(extractBodyHtml('<section>Hi</section>')).toBe('<section>Hi</section>');
  });
});
```

- [ ] **Step 3: Run tests to verify fail**

Run: `npm run test:unit -- tests/unit/pageConfigs.test.js tests/unit/extractBody.test.js`

Expected: FAIL

- [ ] **Step 4: Implement configs, extractBody, registry**

`src/pages/home/page.config.js`:

```js
export default {
  id: 'home',
  title: 'IMPACT',
  description: 'IMPACT online proofing',
  keywords: 'IMPACT,proofing,Newgen',
  favicon: '/favicon.svg',
  appleTouchIcon: '/favicon.svg',
  productName: 'IMPACT',
  logos: {
    header: '/favicon.svg',
    login: '/favicon.svg',
  },
};
```

`src/pages/login/page.config.js`:

```js
export default {
  id: 'login',
  title: 'IMPACT | Log In',
  description: 'IMPACT sign in',
  keywords: 'IMPACT,login',
  favicon: '/favicon.svg',
  appleTouchIcon: '/favicon.svg',
  productName: 'IMPACT',
  logos: {
    header: '/favicon.svg',
    login: '/favicon.svg',
  },
};
```

`src/pages/editor/page.config.js` and `dashboard/page.config.js`: same shape with titles `IMPACT | Editor` and `IMPACT | Dashboard`, `logos: {}`.

`src/shared/extractBody.js`:

```js
export function extractBodyHtml(html) {
  if (!html) return '';
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (match) return match[1].trim();
  return html.trim();
}
```

`src/routing/pageRegistry.js`:

```js
export const pages = {
  home: {
    loadConfig: () => import('../pages/home/page.config.js'),
    loadHtml: () => fetch(new URL('../pages/home/index.html', import.meta.url)).then((r) => r.text()),
  },
  login: {
    loadConfig: () => import('../pages/login/page.config.js'),
    loadHtml: () => fetch(new URL('../pages/login/login.html', import.meta.url)).then((r) => r.text()),
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
```

Note: If Vite cannot fetch HTML via `import.meta.url` in dev, switch `loadHtml` to `fetch(\`/src/pages/home/index.html\`)` to match current `main.js` style — pick one approach and use it consistently; prefer `?raw` import if fetch fails:

```js
loadHtml: async () => (await import('../pages/home/index.html?raw')).default,
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm run test:unit -- tests/unit/pageConfigs.test.js tests/unit/extractBody.test.js`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/home/page.config.js src/pages/login/page.config.js src/pages/editor/page.config.js src/pages/dashboard/page.config.js src/routing/pageRegistry.js src/shared/extractBody.js tests/unit/pageConfigs.test.js tests/unit/extractBody.test.js
git commit -m "feat: add page configs, registry, and body extract helper"
```

---

### Task 5: `loadPage` orchestrator + slim page HTML + main wiring

**Files:**
- Create: `src/routing/loadPage.js`
- Modify: `src/pages/home/index.html` (body-only + `data-brand`)
- Modify: `src/pages/login/login.html` (body-only + `data-brand`)
- Modify: `src/main.js`
- Modify: `index.html` (fallback favicon `/favicon.svg`)
- Test: `tests/unit/loadPage.test.js`

**Interfaces:**
- Consumes: `getPage`, `extractBodyHtml`, `setPageMeta`, `applyDocumentHead`, `applyPageBranding`, `store`
- Produces: `loadPage(id: string): Promise<void>`

- [ ] **Step 1: Write failing loadPage test**

```js
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/routing/pageRegistry.js', () => ({
  getPage: () => ({
    loadConfig: async () => ({
      default: {
        id: 'home',
        title: 'IMPACT',
        description: 'd',
        keywords: 'k',
        favicon: '/favicon.svg',
        appleTouchIcon: '/favicon.svg',
        productName: 'IMPACT',
        logos: { header: '/h.png' },
      },
    }),
    loadHtml: async () => '<img data-brand="header-logo" src="" alt="" />',
  }),
}));

import { loadPage } from '../../src/routing/loadPage.js';
import { store } from '../../src/middleware/redux/store.js';

describe('loadPage', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    document.head.innerHTML = '';
    document.title = '';
  });

  it('injects html, sets redux meta, and applies head/branding', async () => {
    await loadPage('home');
    expect(document.getElementById('app').innerHTML).toContain('data-brand="header-logo"');
    expect(store.getState().pageMeta.current.title).toBe('IMPACT');
    expect(document.title).toBe('IMPACT');
    expect(document.querySelector('[data-brand="header-logo"]').getAttribute('src')).toBe('/h.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/loadPage.test.js`

Expected: FAIL

- [ ] **Step 3: Implement `loadPage`**

```js
import { getPage } from './pageRegistry.js';
import { extractBodyHtml } from '../shared/extractBody.js';
import { applyDocumentHead } from '../shared/documentHead.js';
import { applyPageBranding } from '../shared/pageBranding.js';
import { store } from '../middleware/redux/store.js';
import { setPageMeta } from '../middleware/redux/pageMetaSlice.js';

export async function loadPage(id) {
  const entry = getPage(id);
  const [{ default: config }, html] = await Promise.all([
    entry.loadConfig(),
    entry.loadHtml(),
  ]);

  const app = document.getElementById('app');
  if (!app) throw new Error('#app not found');

  app.innerHTML = extractBodyHtml(html);
  store.dispatch(setPageMeta(config));
  applyDocumentHead(config);
  applyPageBranding(app, config);

  app.dataset.pageId = id;
}
```

- [ ] **Step 4: Slim home/login HTML**

For `src/pages/home/index.html`: remove `<!DOCTYPE>`, `<html>`, `<head>`, and document-level script/link tags from the migrated template. Keep the visible header/main/footer markup needed for the landing shell. On the header logo `<img>`, set `data-brand="header-logo"`. Change the Login nav link to `<a href="#/login" data-nav="login">Login</a>` (or `href="#login"`).

For `src/pages/login/login.html`: body-only login box; on the logo img set `data-brand="login-logo"`; remove head/script tags that point at gulp `${{VERSION}}$` assets (Vite/main owns scripts).

Keep markup readable; do not leave a nested `<html>` inside `#app`.

- [ ] **Step 5: Wire `main.js` and shell `index.html`**

`index.html` fallback:

```html
<link href="/favicon.svg" rel="icon">
<link href="/favicon.svg" rel="apple-touch-icon">
<title>IMPACT</title>
```

`src/main.js` (replace ad-hoc loader; keep existing jquery/bootstrap imports as needed):

```js
import { loadPage } from './routing/loadPage.js';

async function routeFromHash() {
  const id = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
  const pageId = ['home', 'login', 'editor', 'dashboard'].includes(id) ? id : 'home';
  await loadPage(pageId);
}

window.addEventListener('hashchange', () => {
  routeFromHash().catch(console.error);
});

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-nav]');
  if (!a) return;
  e.preventDefault();
  location.hash = `#/${a.dataset.nav}`;
});

routeFromHash().catch(console.error);
```

Remove the temporary SweetAlert “Welcome” popup if it blocks e2e (or gate it behind `import.meta.env.DEV` only if product still wants it).

- [ ] **Step 6: Run unit tests**

Run: `npm run test:unit`

Expected: all unit tests PASS

- [ ] **Step 7: Manual smoke**

Run: `npm run dev`  
Open home → title `IMPACT`, favicon present, header logo src set.  
Navigate to `#/login` → title `IMPACT | Log In`, login logo set.

- [ ] **Step 8: Commit**

```bash
git add src/routing/loadPage.js src/main.js index.html src/pages/home/index.html src/pages/login/login.html tests/unit/loadPage.test.js
git commit -m "feat: wire loadPage for home and login with dynamic head branding"
```

---

### Task 6: Harness fixture + Playwright harness test

**Files:**
- Create: `tests/harness/document-head.html`
- Create: `tests/harness/document-head-main.js`
- Create: `tests/e2e/harness-document-head.spec.js`
- Create: `playwright.config.js`
- Modify: `package.json` (playwright deps + scripts)
- Modify: `vite.config.js` if needed to serve `tests/harness`

**Interfaces:**
- Harness page imports shared helpers and applies a sample config for isolated verification.

- [ ] **Step 1: Add Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`package.json` scripts:

```json
{
  "test:harness": "playwright test tests/e2e/harness-document-head.spec.js",
  "test:e2e": "playwright test tests/e2e"
}
```

`playwright.config.js`:

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://127.0.0.1:5173' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Create harness page**

`tests/harness/document-head.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Harness</title>
  </head>
  <body>
    <div id="root">
      <img data-brand="header-logo" src="" alt="" />
    </div>
    <script type="module" src="./document-head-main.js"></script>
  </body>
</html>
```

`tests/harness/document-head-main.js`:

```js
import { applyDocumentHead } from '../../src/shared/documentHead.js';
import { applyPageBranding } from '../../src/shared/pageBranding.js';

const config = {
  id: 'harness',
  title: 'Harness Title',
  description: 'Harness desc',
  keywords: 'harness',
  favicon: '/favicon.svg',
  appleTouchIcon: '/favicon.svg',
  productName: 'IMPACT',
  logos: { header: '/favicon.svg' },
};

applyDocumentHead(config);
applyPageBranding(document.getElementById('root'), config);
```

Ensure Vite can open `/tests/harness/document-head.html` (default Vite serves project root files).

- [ ] **Step 3: Write Playwright harness spec**

```js
import { test, expect } from '@playwright/test';

test('harness applies document head and branding', async ({ page }) => {
  await page.goto('/tests/harness/document-head.html');
  await expect(page).toHaveTitle('Harness Title');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  await expect(page.locator('[data-brand="header-logo"]')).toHaveAttribute('src', '/favicon.svg');
});
```

- [ ] **Step 4: Run harness test**

Run: `npm run test:harness`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add playwright.config.js package.json package-lock.json tests/harness tests/e2e/harness-document-head.spec.js vite.config.js
git commit -m "test: add Playwright harness for document head helpers"
```

---

### Task 7: Playwright e2e for home ↔ login

**Files:**
- Create: `tests/e2e/home-login-meta.spec.js`

- [ ] **Step 1: Write e2e spec**

```js
import { test, expect } from '@playwright/test';

test('home then login updates title favicon and logos', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('IMPACT');
  await expect(page.locator('#app [data-brand="header-logo"]')).toHaveAttribute('src', /favicon\.svg/);

  await page.evaluate(() => {
    location.hash = '#/login';
  });
  await expect(page).toHaveTitle('IMPACT | Log In');
  await expect(page.locator('#app [data-brand="login-logo"]')).toHaveAttribute('src', /favicon\.svg/);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /favicon\.svg/);
});
```

- [ ] **Step 2: Run e2e**

Run: `npm run test:e2e`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/home-login-meta.spec.js
git commit -m "test: e2e home and login dynamic meta branding"
```

---

## Plan self-review (page meta)

| Spec requirement | Task |
|------------------|------|
| Runtime per-page head | 1, 5 |
| Logos from same config | 2, 5 |
| Co-located config + thin registry | 4 |
| Redux current pageMeta | 3, 5 |
| home/login real; editor/dashboard stubs | 4, 5 |
| Body-only fragments | 5 |
| Vitest + harness + e2e | 1–2, 6–7 |
| React-agnostic helpers | 1–2 (plain modules) |

Error reporting intentionally deferred to companion plan.
