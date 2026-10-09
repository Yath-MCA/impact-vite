# Editor Hybrid Assets Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After Vite SPA build, emit gulp-shaped editor packs under `assets/{VERSION}/` and fix editor boot globals so `#/editor` no longer throws `isValidVariable is not a function`.

**Architecture:** Keep SPA hashed chunks + maps. Add `resolveEditorVersion` (ENV then package.json), `pack-editor-assets.js` writing `public/assets/{VERSION}/` (copied into `dist` by Vite), extend legacy helpers, and teach `boot.js` to prefer versioned `e6_*.min.js` with `?url` fallback.

**Tech Stack:** Node ESM, Vite 8, existing editor `manifest.js` / `boot.js` / `legacyGlobals.js`.

## Global Constraints

- Spec: [docs/superpowers/specs/2026-10-09-editor-hybrid-assets-pack-design.md](../specs/2026-10-09-editor-hybrid-assets-pack-design.md)
- VERSION = `ENV.VERSION` if set, else `package.json` `"version"`
- Pack outputs: `assets/{VERSION}/js/e6_common.min.js`, `e6_main.min.js`, CSS from manifest, minimal `config/` stub
- No dual Vite lib builds; no gulp proxy
- Do not reintroduce `${{…}}$` placeholder `js/index.js`

---

## File map

| Path | Responsibility |
|------|----------------|
| `src/pages/editor/resolveEditorVersion.js` | Shared version resolver (browser + Node via inject/read) |
| `scripts/resolveEditorVersion.js` | Node-side: read `public/env.js` or env files + package.json |
| `scripts/pack-editor-assets.js` | Concat Slice A → `public/assets/{VERSION}/…` |
| `src/pages/editor/manifest.js` | Export `E6_COMMON_PATHS`, `E6_MAIN_PATHS` for packer |
| `src/pages/editor/editorLegacyHelpers.js` | `isValidVariable`, `IS_TRACK_VIEW` default, assign on `window`/`global` |
| `src/pages/editor/legacyGlobals.js` | Call helpers; set `VERSION` from resolve |
| `src/pages/editor/boot.js` | Prefer versioned bundles; fallback `?url` |
| `package.json` | `predev`/`prebuild` run pack; keep `sourcemap: true` |
| `.gitignore` | Ignore generated `public/assets/*/` packs (keep path documented) |
| `tests/unit/resolveEditorVersion.test.js` | Version resolution |
| `tests/unit/editorLegacyHelpers.test.js` | `isValidVariable` |
| `tests/e2e/editor-boot.spec.js` | Extend: no `isValidVariable` console error |

---

### Task 1: `resolveEditorVersion` (TDD)

**Files:**
- Create: `scripts/resolveEditorVersion.js`
- Create: `tests/unit/resolveEditorVersion.test.js`

**Interfaces:**
- Produces: `resolveEditorVersion({ envVersion, packageVersion }) → string`
- Node helper: `readEditorVersionFromRepo(rootDir) → string` reading `process.env` / generated env if present / `package.json`

- [ ] **Step 1: Failing test**

```js
import { describe, expect, it } from 'vitest';
import { resolveEditorVersion } from '../../scripts/resolveEditorVersion.js';

describe('resolveEditorVersion', () => {
  it('prefers env VERSION over package.json', () => {
    expect(resolveEditorVersion({ envVersion: '1.2.3', packageVersion: '0.0.0' })).toBe('1.2.3');
  });

  it('falls back to package.json version', () => {
    expect(resolveEditorVersion({ envVersion: '', packageVersion: '0.0.0' })).toBe('0.0.0');
  });

  it('trims and rejects blank env', () => {
    expect(resolveEditorVersion({ envVersion: '   ', packageVersion: '9.9.9' })).toBe('9.9.9');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test:unit -- tests/unit/resolveEditorVersion.test.js`

- [ ] **Step 3: Implement**

```js
// scripts/resolveEditorVersion.js
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
  // Also try env/env.${APP_ENV||local}.js VERSION export if present
  return resolveEditorVersion({ envVersion, packageVersion: pkg.version });
}
```

- [ ] **Step 4: PASS + commit**

```bash
git add scripts/resolveEditorVersion.js tests/unit/resolveEditorVersion.test.js
git commit -m "feat(editor): resolve VERSION from env or package.json"
```

---

### Task 2: Export manifest groups + pack script

**Files:**
- Modify: `src/pages/editor/manifest.js` — export `E6_COMMON_PATHS`, `E6_MAIN_PATHS` (same arrays used today)
- Create: `scripts/pack-editor-assets.js`
- Modify: `.gitignore` — add `/public/assets/`
- Modify: `package.json` scripts

**Interfaces:**
- Produces on disk: `public/assets/{VERSION}/js/e6_common.min.js`, `e6_main.min.js`, `css/main.css` (concat or copy of three CSS files into `e6_main.css` or individual files matching loader), `config/.gitkeep` or empty `config/meta.json` stub
- Exit code 1 if any input missing

- [ ] **Step 1: Export path groups from manifest**

```js
export const E6_COMMON_PATHS = [ /* existing E6_COMMON list */ ];
export const E6_MAIN_PATHS = [ /* existing E6_MAIN list without duplicating demo */ ];
export const EDITOR_JS_PATHS = uniqueInOrder([...E6_COMMON_PATHS, ...E6_MAIN_PATHS]);
```

Keep unit `editorManifest.test.js` green.

- [ ] **Step 2: Implement packer**

```js
// scripts/pack-editor-assets.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readEditorVersionFromRepo } from './resolveEditorVersion.js';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const legacyRoot = path.join(root, 'src/legacy');

async function main() {
  const { E6_COMMON_PATHS, E6_MAIN_PATHS, EDITOR_CSS_PATHS } = await import(
    pathToFileURL(path.join(root, 'src/pages/editor/manifest.js')).href
  );
  const version = readEditorVersionFromRepo(root);
  const outBase = path.join(root, 'public', 'assets', version);
  const jsDir = path.join(outBase, 'js');
  const cssDir = path.join(outBase, 'css');
  const configDir = path.join(outBase, 'config');
  fs.mkdirSync(jsDir, { recursive: true });
  fs.mkdirSync(cssDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });

  function concat(relPaths, outFile) {
    const parts = [];
    for (const rel of relPaths) {
      const abs = path.join(legacyRoot, rel);
      if (!fs.existsSync(abs)) {
        console.error(`[pack-editor-assets] missing ${abs}`);
        process.exit(1);
      }
      parts.push(`\n;/* === ${rel} === */\n` + fs.readFileSync(abs, 'utf8'));
    }
    fs.writeFileSync(outFile, parts.join('\n'), 'utf8');
    console.log(`[pack-editor-assets] wrote ${path.relative(root, outFile)}`);
  }

  concat(E6_COMMON_PATHS, path.join(jsDir, 'e6_common.min.js'));
  concat(E6_MAIN_PATHS, path.join(jsDir, 'e6_main.min.js'));

  for (const rel of EDITOR_CSS_PATHS) {
    const abs = path.join(legacyRoot, rel);
    if (!fs.existsSync(abs)) {
      console.error(`[pack-editor-assets] missing ${abs}`);
      process.exit(1);
    }
    const name = path.basename(rel);
    fs.copyFileSync(abs, path.join(cssDir, name));
  }

  fs.writeFileSync(
    path.join(configDir, 'README.txt'),
    'Stub config dir for LoadingConfig FOLDER_PATH. Populate in a later phase.\n',
    'utf8'
  );
  console.log(`[pack-editor-assets] VERSION=${version}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Wire npm scripts**

```json
"pack:editor": "node scripts/pack-editor-assets.js",
"predev": "npm run env:generate && npm run pack:editor",
"prebuild": "npm run env:generate && npm run pack:editor",
"build": "vite build"
```

Vite copies `public/` → `dist/`, so packs land in `dist/assets/{VERSION}/`.

- [ ] **Step 4: Run pack + verify files exist**

```bash
npm run pack:editor
# expect public/assets/0.0.0/js/e6_common.min.js (or env VERSION)
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/editor/manifest.js scripts/pack-editor-assets.js package.json .gitignore
git commit -m "feat(editor): pack Slice A legacy bundles under assets/VERSION"
```

---

### Task 3: Legacy helpers + VERSION on window

**Files:**
- Create: `src/pages/editor/editorLegacyHelpers.js`
- Modify: `src/pages/editor/legacyGlobals.js`
- Create: `tests/unit/editorLegacyHelpers.test.js`

**Interfaces:**
- Produces: `applyEditorLegacyHelpers(g = window)` sets `g.isValidVariable`, `g.IS_TRACK_VIEW` (default false), optionally `g.IS_EDITOR_PAGE = true` when hash is editor

- [ ] **Step 1: Failing test**

```js
import { describe, expect, it } from 'vitest';
import { applyEditorLegacyHelpers, isValidVariable } from '../../src/pages/editor/editorLegacyHelpers.js';

describe('editorLegacyHelpers', () => {
  it('isValidVariable rejects nullish and empty', () => {
    expect(isValidVariable(null)).toBe(false);
    expect(isValidVariable('')).toBe(false);
    expect(isValidVariable('x')).toBe(true);
  });

  it('assigns helpers on target global', () => {
    const g = {};
    applyEditorLegacyHelpers(g);
    expect(typeof g.isValidVariable).toBe('function');
    expect(g.IS_TRACK_VIEW).toBe(false);
  });
});
```

- [ ] **Step 2: Implement + call from `applyLegacyGlobals`**

```js
// editorLegacyHelpers.js
export function isValidVariable(variable) {
  return (
    variable !== null &&
    variable !== undefined &&
    variable !== '' &&
    variable !== 'null' &&
    variable !== 'undefined'
  );
}

export function applyEditorLegacyHelpers(g = typeof window !== 'undefined' ? window : globalThis) {
  g.isValidVariable = isValidVariable;
  if (typeof g.IS_TRACK_VIEW === 'undefined') g.IS_TRACK_VIEW = false;
  if (typeof g.IS_EDITOR_PAGE === 'undefined') {
    const hash = typeof location !== 'undefined' ? location.hash || '' : '';
    g.IS_EDITOR_PAGE = /#\/?editor/i.test(hash);
  }
}
```

In `legacyGlobals.js`: import and call `applyEditorLegacyHelpers(g)` after setting `g.VERSION` via browser-side resolve:

```js
import { applyEditorLegacyHelpers } from './editorLegacyHelpers.js';

// VERSION: env.VERSION || already set || 'dev'
// (package.json fallback is build-time; browser uses ENV or 'dev')
g.VERSION = (env.VERSION && String(env.VERSION).trim()) || g.VERSION || 'dev';
applyEditorLegacyHelpers(g);
```

Optional: add `VERSION` to `env/env.local.js` and OPTIONAL_FIELDS in schema so generate-env can supply it — if added, document in commit.

- [ ] **Step 3: PASS + commit**

```bash
git add src/pages/editor/editorLegacyHelpers.js src/pages/editor/legacyGlobals.js tests/unit/editorLegacyHelpers.test.js
git commit -m "feat(editor): add isValidVariable and track-view defaults for boot"
```

---

### Task 4: Boot prefers versioned packs

**Files:**
- Modify: `src/pages/editor/boot.js`
- Optionally: `src/pages/editor/loadEditorAssets.js` — add `urlExists(url)` HEAD/GET probe

**Interfaces:**
- `bootEditor()`: after globals + CKEditor, if `/assets/{VERSION}/js/e6_common.min.js` is reachable, load common → main + CSS from versioned paths; else existing per-file `?url` loop

- [ ] **Step 1: Implement probe + branch**

```js
async function canLoad(url) {
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function bootEditor() {
  applyLegacyGlobals();
  await loadCkeditorOnce();
  const version = String(window.VERSION || 'dev');
  const commonUrl = `/assets/${version}/js/e6_common.min.js`;
  const mainUrl = `/assets/${version}/js/e6_main.min.js`;
  const usePack = await canLoad(commonUrl);

  if (usePack) {
    for (const name of ['main.css', 'media_query.css', 'editorLayout.css']) {
      await loadStylesheetOnce(`/assets/${version}/css/${name}`);
    }
    await loadScriptOnce(commonUrl);
    await loadScriptOnce(mainUrl);
    return;
  }

  // existing CSS + EDITOR_JS_PATHS ?url loop …
}
```

- [ ] **Step 2: Manual** — `npm run dev`, open `#/editor`, Network shows `/assets/0.0.0/js/e6_common.min.js` (or env VERSION). Console must not show `isValidVariable is not a function`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/editor/boot.js
git commit -m "feat(editor): prefer versioned e6 packs with ?url fallback"
```

---

### Task 5: Build smoke + E2E console guard

**Files:**
- Modify: `tests/e2e/editor-boot.spec.js` (and/or landing-accept-editor)

- [ ] **Step 1: Unit + pack + build**

```bash
npm run test:unit -- tests/unit/resolveEditorVersion.test.js tests/unit/editorLegacyHelpers.test.js tests/unit/editorManifest.test.js
npm run pack:editor
npm run build
# assert: Test-Path dist/assets/<version>/js/e6_common.min.js
```

- [ ] **Step 2: E2E — no isValidVariable error**

```js
test('editor boot has no isValidVariable console error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/#/editor');
  await expect(page.locator('#Body, .content-header-i, #navbar_row_1').first()).toBeVisible({
    timeout: 30000,
  });
  expect(errors.some((e) => /isValidVariable is not a function/i.test(e))).toBe(false);
});
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/editor-boot.spec.js
git commit -m "test(e2e): editor boot without isValidVariable failure"
```

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| Hybrid SPA chunks + versioned editor | 2, 4 |
| VERSION env then package.json | 1 |
| Post-build / predev pack | 2 |
| e6_common.min.js / e6_main.min.js | 2 |
| config stub under VERSION | 2 |
| isValidVariable helpers | 3 |
| Boot prefer pack, fallback ?url | 4 |
| Tests | 1, 3, 5 |

**Note:** `FetchService` / other later script errors remain out of scope unless they block shell paint; extend helpers only as needed for boot banner success.
