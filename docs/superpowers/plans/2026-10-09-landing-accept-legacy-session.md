# Landing Accept → Editor (Legacy LinkSession) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable LandingUI **AGREE & CONTINUE** to run legacy LinkSession dual-guard (check → storage → getdocs verify) and navigate to `#/editor`.

**Architecture:** Colocate landing LinkSession scripts under `src/pages/landing/js/session/`, inject them as classic scripts (same `?url` pattern as editor boot), and call `LinkSessionModule.getInstance().accessFromLanding(ctx)` from a thin React bridge. Do not port paste `src/services/session` in this slice.

**Tech Stack:** Vite 8, React LandingUI, jQuery (already global from `main.js`), legacy `LinkSessionCore` / `LinkSessionModule`.

## Global Constraints

- Spec: [docs/superpowers/specs/2026-10-09-landing-accept-legacy-session-design.md](../specs/2026-10-09-landing-accept-legacy-session-design.md)
- Flow docs: [docs/linksharing-session/](../../linksharing-session/)
- Use **legacy** LinkSession only; leave `useLandingSessionFlow` unused
- Navigate with `location.hash = '#/editor'` (HashRouter)
- No SocketBridge, no PLOS OTP, no editor content/dialogs
- Fail closed: no navigate without dual-guard success (unless `skipVerify` from legacy grant inventory)

---

## File map

| Path | Responsibility |
|------|----------------|
| `src/pages/landing/js/session/ports.js` | Moved from legacy (UI ports stub) |
| `src/pages/landing/js/session/LinkSessionCore.js` | Moved dual-guard engine |
| `src/pages/landing/js/session/LinkSessionModule.js` | Moved landing entry (`window.LinkSessionModule`) |
| `src/pages/landing/landingSessionGlobals.js` | `API_LINK_SHARE`, `API_GET_DOCS`, keys, minimal `GET_JSON` / `ADD_DEFAULT_KEYS` stubs from `window.ENV` |
| `src/pages/landing/landingSessionStorage.js` | Pure helpers: session write + backup mirror + localStorage share keys + dual-guard redirect |
| `src/pages/landing/loadLandingSession.js` | Ordered classic script inject for session JS |
| `src/pages/landing/landingSessionBridge.js` | `ensureLandingSessionLoaded`, `buildLandingAcceptContext`, `startLandingAccept` |
| `src/pages/landing/LandingUI.jsx` | Enable Agree; call bridge; busy/error |
| `tests/unit/landingSessionStorage.test.js` | Storage key writes |
| `tests/unit/landingSessionBridge.test.js` | Ctx + mocked grant → navigate |
| `tests/e2e/landing-accept-editor.spec.js` | Mocked APIs → `#/editor` |

**Move (not copy) from:** `src/legacy/modules/shared/link_session/{ports,LinkSessionCore,LinkSessionModule}.js`  
**Leave in legacy for now:** `LinkSessionEditor.js`, `bootstrap.js`, `localHostSession.js`, `index.js`, docs — editor phase later. If anything still imports moved files from `@legacy/.../link_session/`, add a one-line re-export shim under the old path that throws or re-exports — prefer updating any broken import to the new path.

---

### Task 1: Session storage helpers (TDD)

**Files:**
- Create: `src/pages/landing/landingSessionStorage.js`
- Create: `tests/unit/landingSessionStorage.test.js`

**Interfaces:**
- Produces: `getSessionIdKey(docId)`, `writeSessionDualGuardKeys({ docId, sessionId, redirectUrl })`, `saveLegacyShareLocalStorage(resData)`, `commitLandingStorageAndVerify({ docId, sessionId, redirectUrl, resData, skipVerify, confirmFn })`
- Consumes: `sessionStorage`, `localStorage`, optional `confirmFn(expected) → Promise<{ok, reason}>`

- [ ] **Step 1: Write failing tests**

```js
import { describe, expect, it, beforeEach } from 'vitest';
import {
  getSessionIdKey,
  writeSessionDualGuardKeys,
  saveLegacyShareLocalStorage,
} from '../../src/pages/landing/landingSessionStorage.js';

describe('landingSessionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('writes docid, session id, redirect, and sessionbackup', () => {
    writeSessionDualGuardKeys({
      docId: 'D1',
      sessionId: 'S1',
      redirectUrl: 'http://localhost/#/editor',
    });
    expect(sessionStorage.getItem('docid')).toBe('D1');
    expect(sessionStorage.getItem(getSessionIdKey('D1'))).toBe('S1');
    expect(sessionStorage.getItem('redirect')).toContain('#/editor');
    const backup = JSON.parse(localStorage.getItem('xmleditor:sessionbackup:D1'));
    expect(backup[getSessionIdKey('D1')]).toBe('S1');
  });

  it('writes legacy share localStorage when apikey present', () => {
    saveLegacyShareLocalStorage({
      docid: 'D1',
      apikey: 'k',
      emailto: 'a@b.c',
      role: '1',
    });
    expect(localStorage.getItem('xmleditor:apikey')).toBe('k');
    expect(localStorage.getItem('xmleditor:shared:D1')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test:unit -- tests/unit/landingSessionStorage.test.js`

- [ ] **Step 3: Implement `landingSessionStorage.js`**

```js
export function getSessionIdKey(docId) {
  return `xmleditor:sessionid:${docId || ''}`;
}

export function writeSessionDualGuardKeys({ docId, sessionId, redirectUrl }) {
  const idKey = getSessionIdKey(docId);
  const sessionIdStr = String(sessionId ?? '');
  sessionStorage.setItem('docid', String(docId));
  sessionStorage.setItem(idKey, sessionIdStr);
  sessionStorage.setItem('redirect', String(redirectUrl || ''));
  const backupKey = `xmleditor:sessionbackup:${docId}`;
  let backup = {};
  try {
    backup = JSON.parse(localStorage.getItem(backupKey) || '{}') || {};
  } catch {
    backup = {};
  }
  backup.docid = String(docId);
  backup[idKey] = sessionIdStr;
  backup.redirect = String(redirectUrl || '');
  localStorage.setItem(backupKey, JSON.stringify(backup));
}

export function saveLegacyShareLocalStorage(resData) {
  if (!resData) return { ok: false, reason: 'missing' };
  const { docid, apikey, emailto, role } = resData;
  if (!(apikey || (docid && emailto))) return { ok: false, reason: 'missing_apikey_or_email' };
  localStorage.setItem('xmleditor:appkey', 'xmleditor');
  localStorage.setItem('xmleditor:apikey', apikey || '');
  localStorage.setItem(`xmleditor:shared:${docid}`, JSON.stringify(resData));
  const emailId = Array.isArray(emailto) ? emailto[0] : emailto;
  if (emailId) localStorage.setItem(`xmleditor:username:${docid}`, emailId);
  if (role != null) localStorage.setItem(`xmleditor:userRole:${docid}`, String(role));
  return { ok: true, docid };
}

export async function commitLandingStorageAndVerify({
  docId,
  sessionId,
  redirectUrl,
  resData,
  skipVerify = false,
  confirmFn,
}) {
  if (resData) saveLegacyShareLocalStorage(resData);
  writeSessionDualGuardKeys({ docId, sessionId, redirectUrl });
  if (skipVerify) return { ok: true, skipped: true };
  if (typeof confirmFn !== 'function') {
    return { ok: false, reason: 'missing_confirmFn' };
  }
  const result = await confirmFn({ docId, sessionId });
  return result && result.ok ? { ok: true } : { ok: false, reason: result?.reason || 'verify_failed' };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/pages/landing/landingSessionStorage.js tests/unit/landingSessionStorage.test.js
git commit -m "feat(landing): add dual-guard session/localStorage helpers"
```

---

### Task 2: Colocate LinkSession scripts + globals + loader

**Files:**
- Move: `src/legacy/modules/shared/link_session/ports.js` → `src/pages/landing/js/session/ports.js`
- Move: `src/legacy/modules/shared/link_session/LinkSessionCore.js` → `src/pages/landing/js/session/LinkSessionCore.js`
- Move: `src/legacy/modules/shared/link_session/LinkSessionModule.js` → `src/pages/landing/js/session/LinkSessionModule.js`
- Create: `src/pages/landing/landingSessionGlobals.js`
- Create: `src/pages/landing/loadLandingSession.js`
- Optional shim: `src/legacy/modules/shared/link_session/LinkSessionCore.js` re-export comment or thin redirect file if gulp/editor still expects path (prefer leave a short README in old folder pointing to new path)

**Interfaces:**
- Produces: `applyLandingSessionGlobals()`, `loadLandingSessionOnce(): Promise<void>`
- After load: `typeof window.LinkSessionModule.getInstance === 'function'`

- [ ] **Step 1: Move the three JS files** into `src/pages/landing/js/session/` (git mv).

- [ ] **Step 2: Implement globals**

```js
// landingSessionGlobals.js
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
```

- [ ] **Step 3: Implement loader** (classic scripts; jQuery must already be global from `main.js`)

```js
// loadLandingSession.js
import { applyLandingSessionGlobals } from './landingSessionGlobals.js';
import { loadScriptOnce } from '../editor/loadEditorAssets.js';
// Prefer a tiny local copy of loadScriptOnce if cross-page import is undesirable:
// duplicate the 15-line helper into landingLoadScript.js instead.

import portsUrl from './js/session/ports.js?url';
import coreUrl from './js/session/LinkSessionCore.js?url';
import moduleUrl from './js/session/LinkSessionModule.js?url';

let loading = null;

export async function loadLandingSessionOnce() {
  if (window.LinkSessionModule && typeof window.LinkSessionModule.getInstance === 'function') {
    return;
  }
  if (loading) return loading;
  loading = (async () => {
    applyLandingSessionGlobals();
    if (typeof window.$ === 'undefined') {
      throw new Error('jQuery required for LinkSessionCore.postRequest');
    }
    await loadScriptOnce(portsUrl);
    await loadScriptOnce(coreUrl);
    await loadScriptOnce(moduleUrl);
    if (!window.LinkSessionModule) {
      throw new Error('LinkSessionModule missing after script load');
    }
  })();
  try {
    await loading;
  } finally {
    loading = null;
  }
}
```

If importing `loadScriptOnce` from editor feels wrong, create `src/pages/landing/loadScriptOnce.js` with the same implementation as [`src/pages/editor/loadEditorAssets.js`](../../src/pages/editor/loadEditorAssets.js).

- [ ] **Step 4: Smoke** — temporary node-free check: `npm run build` must resolve the three `?url` imports.

- [ ] **Step 5: Commit**

```bash
git add src/pages/landing/js/session src/pages/landing/landingSessionGlobals.js src/pages/landing/loadLandingSession.js
git add -u src/legacy/modules/shared/link_session
git commit -m "feat(landing): colocate LinkSession scripts and classic loader"
```

---

### Task 3: Accept bridge

**Files:**
- Create: `src/pages/landing/landingSessionBridge.js`
- Create: `tests/unit/landingSessionBridge.test.js`

**Interfaces:**
- Produces: `buildLandingAcceptContext(docData, handlers)`, `startLandingAccept(docData, handlers): Promise<{ status: 'granted'|'blocked'|'error', reason?: string }>`
- Consumes: `loadLandingSessionOnce`, `commitLandingStorageAndVerify`, `LinkSessionModule.getInstance().accessFromLanding`

- [ ] **Step 1: Failing test** (mock `window.LinkSessionModule`)

```js
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildLandingAcceptContext } from '../../src/pages/landing/landingSessionBridge.js';

describe('buildLandingAcceptContext', () => {
  it('maps docData fields into ctx', () => {
    const ctx = buildLandingAcceptContext(
      { docid: 'D1', apikey: 'k', emailto: 'a@b.c', rolename: 'Author' },
      { onError: () => {} }
    );
    expect(ctx.docId).toBe('D1');
    expect(ctx.resData.docid).toBe('D1');
    expect(typeof ctx.onRedirect).toBe('function');
    expect(typeof ctx.onCommitStorage).toBe('function');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement bridge**

```js
import { loadLandingSessionOnce } from './loadLandingSession.js';
import {
  commitLandingStorageAndVerify,
  saveLegacyShareLocalStorage,
} from './landingSessionStorage.js';

function newSessionId() {
  return String(Date.now()) + String(Math.floor(Math.random() * 1000));
}

export function buildLandingAcceptContext(docData, handlers = {}) {
  const resData = docData || {};
  const docId = String(resData.docid || resData.docId || '');
  const sessionId = handlers.sessionId || newSessionId();
  const editorHash = '#/editor';

  return {
    docId,
    sessionId,
    resData,
    rolename: resData.rolename,
    username: resData.emailto || resData.username,
    redirectUrl: editorHash,
    landingUrl: typeof window !== 'undefined' ? window.location.href : '',
    onCommitStorage: (data) => {
      saveLegacyShareLocalStorage(data || resData);
    },
    onRedirect: async (ctx) => {
      const skipVerify = !!(
        ctx.skipVerify ||
        ctx.grantOptions?.skipVerify ||
        ctx.grantOptions?.canforceClose
      );
      const mod = window.LinkSessionModule.getInstance();
      const result = await commitLandingStorageAndVerify({
        docId: ctx.docId || docId,
        sessionId: ctx.sessionId || sessionId,
        redirectUrl: editorHash,
        resData: ctx.resData || resData,
        skipVerify,
        confirmFn: (expected) => mod.confirmSessionOnServer(expected),
      });
      if (!result.ok) {
        handlers.onVerifyFailed?.(result);
        return;
      }
      window.location.hash = editorHash;
    },
    onTryAgain: (key) => handlers.onTryAgain?.(key),
    onRequestError: (err) => handlers.onError?.(err),
    onAccessDeniedWithRemarks: (msg) => handlers.onDenied?.(msg),
    ui: {
      sendPrompt: (response, ctx) =>
        handlers.onBlocked ? handlers.onBlocked(response, ctx) : Promise.resolve(),
      showPollWaiting: (ctx) =>
        handlers.onWaiting ? handlers.onWaiting(ctx) : Promise.resolve(),
    },
  };
}

export async function startLandingAccept(docData, handlers = {}) {
  await loadLandingSessionOnce();
  const mod = window.LinkSessionModule.getInstance();
  const ctx = buildLandingAcceptContext(docData, handlers);
  await mod.accessFromLanding(ctx);
  return { status: 'started', docId: ctx.docId, sessionId: ctx.sessionId };
}
```

For blocked path without Send UI yet: `handlers.onBlocked` sets a LandingUI message and resolves — do not navigate.

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git add src/pages/landing/landingSessionBridge.js tests/unit/landingSessionBridge.test.js
git commit -m "feat(landing): add legacy LinkSession accept bridge"
```

---

### Task 4: Wire LandingUI Agree button

**Files:**
- Modify: `src/pages/landing/LandingUI.jsx`

**Interfaces:**
- Consumes: `startLandingAccept(docData, handlers)`

- [ ] **Step 1: Add state + handler**

Inside `LandingUI` component (where `docData` exists):

```jsx
const [acceptBusy, setAcceptBusy] = useState(false);
const [acceptError, setAcceptError] = useState('');

async function onAgreeContinue() {
  setAcceptError('');
  setAcceptBusy(true);
  try {
    const { startLandingAccept } = await import('./landingSessionBridge.js');
    await startLandingAccept(docData, {
      onError: (err) => setAcceptError(String(err?.message || err || 'Session failed')),
      onTryAgain: () => setAcceptError('Could not open session. Try again.'),
      onDenied: (msg) => setAcceptError(msg || 'Access denied'),
      onVerifyFailed: () => setAcceptError('Session verify failed. Try again.'),
      onBlocked: async () => {
        setAcceptError('Another user holds this session. Send Request UI comes in a follow-up.');
      },
    });
  } catch (err) {
    setAcceptError(String(err?.message || err));
  } finally {
    setAcceptBusy(false);
  }
}
```

- [ ] **Step 2: Replace disabled Agree button**

```jsx
{acceptError ? (
  <p className="tw:mb-3 tw:text-sm tw:text-red-700" role="alert">{acceptError}</p>
) : null}
<button
  type="button"
  disabled={acceptBusy || !docData}
  onClick={onAgreeContinue}
  className="tw:w-full tw:bg-primary tw:text-white tw:font-bold tw:py-3.5 tw:rounded-lg tw:shadow-md tw:border-0 tw:disabled:opacity-60 tw:disabled:cursor-not-allowed"
>
  {acceptBusy ? 'Opening…' : 'AGREE & CONTINUE'}
</button>
```

- [ ] **Step 3: Manual smoke** — `npm run dev`, open a validate landing with `docData`, click Agree (API may fail locally; UI must leave disabled state and show error, not hang).

- [ ] **Step 4: Commit**

```bash
git add src/pages/landing/LandingUI.jsx
git commit -m "feat(landing): enable Agree via legacy LinkSession bridge"
```

---

### Task 5: E2E mocked grant → editor

**Files:**
- Create: `tests/e2e/landing-accept-editor.spec.js`

- [ ] **Step 1: Write E2E**

```js
import { test, expect } from '@playwright/test';

test('Agree grants session and opens editor shell', async ({ page }) => {
  await page.route('**/linksharing**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        r: 1,
        session_id: 'S-E2E',
        session_start_time: String(Date.now()),
      }),
    });
  });
  await page.route('**/getdocs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        r: 1,
        data: [
          {
            docid: 'D-E2E',
            docstatus: '1',
            session_end_time: '0',
            session_id: 'S-E2E',
          },
        ],
      }),
    });
  });

  // Seed landing the same way existing validate e2e does if available;
  // otherwise goto a harness hash that mounts LandingUI with docData.
  await page.goto('/#/validateurl');
  // If validate needs a key, use project’s existing landing e2e helper / fixture.
  // Minimum: evaluate mount with fake docData if app exposes test hook — prefer real validate mock.

  await page.getByRole('button', { name: /agree/i }).click();
  await expect(page).toHaveURL(/#\/editor/, { timeout: 30000 });
  await expect(page.locator('#Body, .content-header-i, #navbar_row_1').first()).toBeVisible({
    timeout: 30000,
  });
});
```

**Implementer:** Align goto/fixture with existing `tests/e2e` validate/landing specs so LandingUI actually mounts with `docData` including `docid`/`apikey`/`emailto`. Adjust getdocs mock shape to whatever `confirmSessionOnServer` parses (inspect `isActiveSessionRecord` if first run fails).

- [ ] **Step 2: Run**

```bash
npm run test:unit -- tests/unit/landingSessionStorage.test.js tests/unit/landingSessionBridge.test.js
npx playwright test tests/e2e/landing-accept-editor.spec.js
npm run build
```

Expected: PASS / PASS / build OK

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/landing-accept-editor.spec.js
git commit -m "test(e2e): landing Agree dual-guard opens editor shell"
```

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| Legacy LinkSession, not React paste | 2, 3 |
| Dual-guard write then verify | 1, 3 |
| localStorage + sessionStorage + backup | 1 |
| Navigate `#/editor` | 3, 4 |
| Enable Agree on LandingUI | 4 |
| Fail closed / errors | 3, 4 |
| E2E shell | 5 |
| No socket / PLOS / editor content | Out of scope |

**Send Request UI:** deferred message via `onBlocked` in Task 4; full `link_session_send` can be a follow-up plan.
