# Editor Boot Shell (Gulp → Lazy ESM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `#/editor` lazily inject the editor HTML skeleton, load CKEditor + editor CSS once, then run a deduped `e6_common` + `e6_main` script chain without Gulp.

**Architecture:** `main.js` routes `#/editor` to `src/pages/editor/index.js`. That orchestrator injects the body skeleton, idempotently loads CKEditor/CSS, then executes an ordered unique file list. Legacy gulp JS is classic (globals + `${{…}}$` placeholders), so resolution uses Vite `?url` imports and classic `<script>` injection (same global scope as gulp concat)—not ESM `import` of each file (that would module-scope `var` and break the editor).

**Tech Stack:** Vite 8, existing jQuery/Bootstrap from `main.js`, `public/ckeditor4`, sources under `temp/legacy/src/`.

## Global Constraints

- Spec: [docs/superpowers/specs/2026-10-09-editor-boot-esm-design.md](../specs/2026-10-09-editor-boot-esm-design.md)
- Slice A only: shell + common + editor UI + CKEditor CSS/JS
- Dedupe: each JS/CSS path loaded at most once
- No session CHECK/CLOSE, SocketBridge, dialog_module / module_main / single_module graphs
- Do not commit unrelated `temp/` churn beyond what Vite must resolve
- Pipeline order source: `temp/legacy/gulp/pipeline.js` keys `e6_common`, `e6_main`, `QUERY_COMMENT_SYSTEM_JS`

---

## File map

| Path | Responsibility |
|------|----------------|
| `src/pages/editor/manifest.js` | Deduped ordered JS URL list + CSS URL list |
| `src/pages/editor/loadEditorAssets.js` | Idempotent script/link injectors |
| `src/pages/editor/legacyGlobals.js` | Replace gulp `${{…}}$` globals from `window.ENV` |
| `src/pages/editor/boot.js` | Run globals then ordered classic scripts |
| `src/pages/editor/index.js` | Orchestrator: skeleton → assets → boot |
| `src/pages/editor/index.html` | Strip gulp vendor/ckeditor head tags; keep body skeleton |
| `src/pages/editor/page.config.js` | Already exists |
| `src/main.js` | Route `#/editor` to orchestrator |
| `vite.config.js` | Alias `@legacy` → `temp/legacy/src` |
| `tests/unit/editorManifest.test.js` | Uniqueness of manifest paths |
| `tests/e2e/editor-boot.spec.js` | `#/editor` shell + CKEDITOR |

---

### Task 1: Vite alias + deduped manifest

**Files:**
- Modify: `vite.config.js`
- Create: `src/pages/editor/manifest.js`
- Create: `tests/unit/editorManifest.test.js`

**Interfaces:**
- Produces: `EDITOR_JS_PATHS` (string paths relative to `@legacy`), `EDITOR_CSS_PATHS`, `uniquePaths(paths)` helper
- Consumes: pipeline order from `e6_common` then `e6_main` unique files

- [ ] **Step 1: Write failing uniqueness test**

```js
import { describe, expect, it } from 'vitest';
import { EDITOR_JS_PATHS, EDITOR_CSS_PATHS } from '../../src/pages/editor/manifest.js';

describe('editor manifest', () => {
  it('has unique js paths and includes editorBootInit once', () => {
    expect(new Set(EDITOR_JS_PATHS).size).toBe(EDITOR_JS_PATHS.length);
    expect(EDITOR_JS_PATHS.filter((p) => p.includes('demo.js')).length).toBe(1);
    expect(EDITOR_JS_PATHS.some((p) => p.endsWith('editorBootInit.js'))).toBe(true);
    expect(EDITOR_JS_PATHS.some((p) => p.endsWith('editor_open.js'))).toBe(true);
  });

  it('lists e6_main css once each', () => {
    expect(EDITOR_CSS_PATHS).toEqual([
      'static/css/main.css',
      'static/css/media_query.css',
      'static/css/editorLayout.css',
    ]);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test:unit -- tests/unit/editorManifest.test.js`

- [ ] **Step 3: Add Vite alias**

In `vite.config.js`:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // ...existing plugins/server/build
  resolve: {
    alias: {
      '@legacy': path.resolve(root, 'temp/legacy/src'),
    },
  },
});
```

- [ ] **Step 4: Create `manifest.js`**

Do **not** import raw `temp/legacy/src/js/index.js` (it contains gulp `${{…}}$` placeholders). Start JS list after that file; globals come from Task 2’s `legacyGlobals.js`.

```js
/** Deduped e6_common + e6_main paths relative to @legacy (= temp/legacy/src). */
const E6_COMMON = [
  // skip js/index.js — placeholders; use legacyGlobals.js instead
  'js/_initialGlobalVaribale.js',
  'js/_editorLayout.js',
  'js/_initialAlertmessageLoader.js',
  'js/_initalLoadingDialog.js',
  'js/_initialPageLoader.js',
  'js/_initialScriptLoader.js',
  'js/initializer.js',
  'js/editor_open.js',
  'js/commonfn.js',
  'js/demo.js',
  'js/dialogModules/dialogsHandle.js',
  'js/dialogModules/ErrorMail_Module.js',
  'js/dialogModules/Download_Module.js',
  'js/dialogModules/AlertNew.js',
];

const QUERY_COMMENT_SYSTEM = [
  'modules/shared/query-comment-system/bootstrap.js',
  'modules/shared/query-comment-system/QueryBaseModule.js',
  'modules/shared/query-comment-system/AttachmentModule.js',
  'modules/shared/query-comment-system/QueryPanelModule.js',
  'modules/shared/query-comment-system/QueryRestoreModule.js',
  'modules/shared/query-comment-system/QueryTemplates.js',
  'modules/shared/query-comment-system/QueryUtils.js',
  'modules/shared/query-comment-system/QueryDialogModule.js',
  'modules/shared/query-comment-system/register.js',
];

const E6_MAIN = [
  'js/editor_sync_scrollspy.js',
  'js/editor_page_events_fn.js',
  'js/commonEvtHandler.js',
  ...QUERY_COMMENT_SYSTEM,
  // demo.js already in E6_COMMON — omit
  'js/editorBootInit.js',
];

function uniqueInOrder(paths) {
  const seen = new Set();
  const out = [];
  for (const p of paths) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

export const EDITOR_JS_PATHS = uniqueInOrder([...E6_COMMON, ...E6_MAIN]);

export const EDITOR_CSS_PATHS = [
  'static/css/main.css',
  'static/css/media_query.css',
  'static/css/editorLayout.css',
];
```

- [ ] **Step 5: Run test — expect PASS**

- [ ] **Step 6: Commit**

```bash
git add vite.config.js src/pages/editor/manifest.js tests/unit/editorManifest.test.js
git commit -m "feat(editor): add deduped e6_common/e6_main boot manifest and @legacy alias"
```

---

### Task 2: Asset loaders + legacy globals stub

**Files:**
- Create: `src/pages/editor/loadEditorAssets.js`
- Create: `src/pages/editor/legacyGlobals.js`

**Interfaces:**
- `loadScriptOnce(src: string): Promise<void>`
- `loadStylesheetOnce(href: string): Promise<void>`
- `loadCkeditorOnce(): Promise<void>` — `/ckeditor4/ckeditor.js` + skin CSS if needed
- `applyLegacyGlobals(): void` — set `window` values formerly injected by gulp from `window.ENV`

- [ ] **Step 1: Implement `loadEditorAssets.js`**

```js
const loadedScripts = new Set();
const loadedStyles = new Set();

export function loadScriptOnce(src) {
  if (loadedScripts.has(src) || document.querySelector(`script[data-editor-src="${src}"]`)) {
    loadedScripts.add(src);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.dataset.editorSrc = src;
    el.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    el.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(el);
  });
}

export function loadStylesheetOnce(href) {
  if (loadedStyles.has(href) || document.querySelector(`link[data-editor-href="${href}"]`)) {
    loadedStyles.add(href);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = href;
    el.dataset.editorHref = href;
    el.onload = () => {
      loadedStyles.add(href);
      resolve();
    };
    el.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
    document.head.appendChild(el);
  });
}

export async function loadCkeditorOnce() {
  await loadStylesheetOnce('/ckeditor4/skins/moono-lisa/editor.css');
  await loadScriptOnce('/ckeditor4/ckeditor.js');
  if (typeof window.CKEDITOR === 'undefined') {
    throw new Error('CKEDITOR global missing after script load');
  }
}
```

- [ ] **Step 2: Implement `legacyGlobals.js`**

Map from `window.ENV` (generated `public/env.js`) with safe defaults for local:

```js
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
  g.VERSION = env.VERSION || 'dev';
  // Add further keys as boot errors reveal missing placeholders
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/editor/loadEditorAssets.js src/pages/editor/legacyGlobals.js
git commit -m "feat(editor): add idempotent asset loaders and legacy ENV globals"
```

---

### Task 3: `boot.js` + orchestrator `index.js` + HTML cleanup

**Files:**
- Create: `src/pages/editor/boot.js`
- Create: `src/pages/editor/index.js`
- Modify: `src/pages/editor/index.html` (remove gulp head vendor/ckeditor/`{{page_script}}`; keep body)

**Interfaces:**
- `bootEditor(): Promise<void>`
- `mountEditor(appEl: HTMLElement): Promise<void>`
- Skeleton: `import skeletonUrl from './index.html?raw'` then `extractBodyHtml` (reuse [`src/shared/extractBody.js`](../../src/shared/extractBody.js))

- [ ] **Step 1: Implement `boot.js`**

Resolve each manifest path with Vite `?url` via a static map (Vite needs static analyzable URLs). Pattern:

```js
import { applyLegacyGlobals } from './legacyGlobals.js';
import { loadScriptOnce, loadStylesheetOnce, loadCkeditorOnce } from './loadEditorAssets.js';
import { EDITOR_CSS_PATHS, EDITOR_JS_PATHS } from './manifest.js';

// Explicit ?url imports for each EDITOR_JS_PATHS entry (Vite-resolvable).
// Example:
import initialGlobalUrl from '@legacy/js/_initialGlobalVaribale.js?url';
// ... one import per path in EDITOR_JS_PATHS ...

import mainCss from '@legacy/static/css/main.css?url';
import mediaCss from '@legacy/static/css/media_query.css?url';
import layoutCss from '@legacy/static/css/editorLayout.css?url';

const JS_URL_BY_PATH = {
  'js/_initialGlobalVaribale.js': initialGlobalUrl,
  // ...
};

const CSS_URL_BY_PATH = {
  'static/css/main.css': mainCss,
  'static/css/media_query.css': mediaCss,
  'static/css/editorLayout.css': layoutCss,
};

export async function bootEditor() {
  applyLegacyGlobals();
  await loadCkeditorOnce();
  for (const p of EDITOR_CSS_PATHS) {
    const href = CSS_URL_BY_PATH[p];
    if (!href) throw new Error(`Missing CSS url for ${p}`);
    await loadStylesheetOnce(href);
  }
  for (const p of EDITOR_JS_PATHS) {
    const src = JS_URL_BY_PATH[p];
    if (!src) throw new Error(`Missing JS url for ${p}`);
    await loadScriptOnce(src);
  }
}
```

Keep `JS_URL_BY_PATH` keys exactly equal to `EDITOR_JS_PATHS` (unit-test optional assert).

- [ ] **Step 2: Implement `index.js`**

```js
import { extractBodyHtml } from '../../shared/extractBody.js';
import skeletonHtml from './index.html?raw';
import { bootEditor } from './boot.js';

let booting = null;

export async function mountEditor(appEl) {
  if (!appEl) throw new Error('#app not found');
  if (booting) return booting;

  booting = (async () => {
    try {
      appEl.innerHTML = extractBodyHtml(skeletonHtml);
      appEl.dataset.pageId = 'editor';
      await bootEditor();
    } catch (err) {
      console.error('[editor] boot failed', err);
      appEl.innerHTML = `<div class="tw:p-6 tw:text-red-700" role="alert">
        <h1 class="tw:text-xl tw:font-bold">Editor failed to load</h1>
        <p>${String(err?.message || err)}</p>
      </div>`;
      throw err;
    } finally {
      booting = null;
    }
  })();

  return booting;
}

export default mountEditor;
```

Fix re-entry: if already on editor with content, skip re-inject or always remount cleanly—prefer clear `#app` then mount (main.js clears).

- [ ] **Step 3: Clean `index.html` head**

Remove lines that load gulp `assets/${{VERSION}}$/...` and `ckeditor-${{VERSION}}$` and `{{page_script}}`. Keep `<body>...</body>` skeleton. Favicon can stay as `/favicon.svg` or existing public path.

- [ ] **Step 4: Smoke `npm run build`** (may fail until Task 4 wiring—if so continue)

- [ ] **Step 5: Commit**

```bash
git add src/pages/editor/boot.js src/pages/editor/index.js src/pages/editor/index.html
git commit -m "feat(editor): lazy boot orchestrator with classic script chain"
```

---

### Task 4: Wire `#/editor` in `main.js`

**Files:**
- Modify: `src/main.js`
- Modify: `src/routing/pageRegistry.js` if needed (editor already listed)

**Interfaces:**
- Consumes: `mountEditor` from `./pages/editor/index.js`

- [ ] **Step 1: Update routing**

```js
import editorConfig from './pages/editor/page.config.js';

// In routeFromHash, before HTML loadPage fallback:
if (id === 'editor') {
  unmountReactApp();
  const el = appEl();
  if (el) el.innerHTML = '';
  applyDocumentHead(editorConfig);
  const { mountEditor } = await import('./pages/editor/index.js');
  await mountEditor(el);
  return;
}

// Remove: await loadPage(pageId === 'editor' ? 'home' : pageId);
await loadPage(PAGE_IDS.includes(id) && id !== 'editor' ? id : 'home');
```

Ensure `public/env.js` is loaded before editor boot (existing `index.html` should already include it—verify root `index.html`).

- [ ] **Step 2: Commit**

```bash
git add src/main.js
git commit -m "feat(editor): route hash #/editor to lazy boot shell"
```

---

### Task 5: Fix boot breakages until shell paints

**Files:**
- Touch: `legacyGlobals.js`, individual legacy files only if required (prefer globals stub)
- Possibly skip failing optional scripts with `console.warn` + continue **only** if shell HTML already visible and CKEDITOR loaded; do not skip `editorBootInit` without documenting

- [ ] **Step 1: Run dev and open `#/editor`**

Run: `npm run dev` → browse `http://127.0.0.1:5173/#/editor`

- [ ] **Step 2: Fix blockers**

Expected issues and responses:
- Missing `${{…}}$` → extend `applyLegacyGlobals`
- 404 on a JS path → verify file exists under `temp/legacy/src`
- Syntax error in classic script → fix minimal syntax or stub that file temporarily with a comment in commit message
- Query-comment files missing → confirm paths from pipeline; do not pull entire `single_module` graph

- [ ] **Step 3: Commit fixes** as needed with clear messages

---

### Task 6: E2E + unit + build

**Files:**
- Create: `tests/e2e/editor-boot.spec.js`

- [ ] **Step 1: E2E**

```js
import { test, expect } from '@playwright/test';

test('editor hash boots skeleton and CKEDITOR', async ({ page }) => {
  await page.goto('/#/editor');
  await expect(page.locator('#Body, .content-header-i, #navbar_row_1').first()).toBeVisible({
    timeout: 30000,
  });
  await expect
    .poll(async () => page.evaluate(() => typeof window.CKEDITOR !== 'undefined'))
    .toBe(true);
});
```

- [ ] **Step 2: Run**

```bash
npm run test:unit -- tests/unit/editorManifest.test.js
npx playwright test tests/e2e/editor-boot.spec.js
npm run build
```

Expected: PASS / PASS / build OK (warn-only for chunk size OK)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/editor-boot.spec.js
git commit -m "test(e2e): verify editor boot shell and CKEDITOR global"
```

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| Lazy `#/editor` orchestrator | 3, 4 |
| Deduped e6_common/e6_main | 1, 3 |
| CKEditor + CSS once | 2, 3 |
| Stop editor→home | 4 |
| Error banner | 3 |
| No session/socket | Out of scope |
| Verify shell + CKEDITOR | 5, 6 |

**Note:** Classic `?url` + script tags is intentional so gulp-era globals keep working; Vite still resolves files via `import …?url`.
