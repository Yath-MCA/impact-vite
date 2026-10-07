# Redux Error Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect runtime errors in a Redux buffer, send immediate reports for critical/opt-in cases, and flush digests by page area (login/dashboard session end; editor logout) to `POST /api/errors/report`.

**Architecture:** `reportError` normalizes payloads, always appends to `errors.buffer`, classifies immediate vs buffered (fixed list + `severity: 'immediate'`), and posts to a mockable API client. Flush helpers clear or retain buffer based on success. Depends on `pageMeta.current` from the page-meta plan for default `pageId`.

**Tech Stack:** Redux Toolkit, Vite, Vitest, Playwright (API route mocking).

**Spec:** [docs/superpowers/specs/2026-10-07-spa-page-meta-and-error-reporting-design.md](../specs/2026-10-07-spa-page-meta-and-error-reporting-design.md)

**Prerequisite:** Complete [2026-10-07-spa-page-meta-branding.md](./2026-10-07-spa-page-meta-branding.md) Tasks 1–5 (at least `pageMeta` + `loadPage`) before wiring flush-on-navigate.

## Global Constraints

- Default API path: `POST /api/errors/report`.
- Payload modes: `immediate` | `digest`.
- Every reported error is buffered; immediate also sends now and sets `alreadyNotified: true` on success.
- Reporter must never throw into UI call sites.
- Immediate = fixed list OR `severity: 'immediate'` / `notify: 'now'`.
- Flush: login/dashboard (and future admin) on leave/session end; editor on logout + best-effort `pagehide`.
- Backend mail/DB is out of scope; mock `fetch` in tests.
- No editor plugin work in this plan.

## File map

| File | Responsibility |
|------|----------------|
| `src/middleware/redux/errorsSlice.js` | buffer, pendingImmediate, lastFlushStatus |
| `src/shared/errors/classifyError.js` | immediate vs buffered |
| `src/shared/errors/errorApi.js` | `sendErrorReport(body)` |
| `src/shared/errors/reportError.js` | public API used by app code |
| `src/shared/errors/flushErrors.js` | digest flush |
| `src/shared/errors/installGlobalErrorHandlers.js` | window listeners |
| `src/middleware/redux/store.js` | register `errors` reducer |
| `src/routing/loadPage.js` | flush previous area on leave when applicable |
| `tests/unit/**` | classify, slice, reportError |
| `tests/e2e/error-report-mock.spec.js` | mock API + immediate path |

---

### Task 1: `errors` slice (TDD)

**Files:**
- Create: `src/middleware/redux/errorsSlice.js`
- Modify: `src/middleware/redux/store.js`
- Test: `tests/unit/errorsSlice.test.js`

**Interfaces:**
- Produces: `pushError(item)`, `markNotified(id)`, `clearBuffer()`, `setFlushStatus(status)`, `setPendingImmediate(n)`
- State: `{ buffer: [], pendingImmediate: 0, lastFlushStatus: null }`

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, it } from 'vitest';
import { store } from '../../src/middleware/redux/store.js';
import {
  pushError,
  markNotified,
  clearBuffer,
} from '../../src/middleware/redux/errorsSlice.js';

describe('errors slice', () => {
  it('pushes marks and clears buffer', () => {
    store.dispatch(
      pushError({
        id: 'e1',
        pageId: 'home',
        type: 'test',
        message: 'boom',
        ts: 1,
        severity: 'buffered',
        alreadyNotified: false,
      }),
    );
    expect(store.getState().errors.buffer).toHaveLength(1);
    store.dispatch(markNotified('e1'));
    expect(store.getState().errors.buffer[0].alreadyNotified).toBe(true);
    store.dispatch(clearBuffer());
    expect(store.getState().errors.buffer).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/errorsSlice.test.js`

Expected: FAIL

- [ ] **Step 3: Implement slice and register on store**

```js
import { createSlice } from '@reduxjs/toolkit';

const errorsSlice = createSlice({
  name: 'errors',
  initialState: {
    buffer: [],
    pendingImmediate: 0,
    lastFlushStatus: null,
  },
  reducers: {
    pushError(state, action) {
      state.buffer.push(action.payload);
    },
    markNotified(state, action) {
      const item = state.buffer.find((e) => e.id === action.payload);
      if (item) item.alreadyNotified = true;
    },
    clearBuffer(state) {
      state.buffer = [];
    },
    setFlushStatus(state, action) {
      state.lastFlushStatus = action.payload;
    },
    setPendingImmediate(state, action) {
      state.pendingImmediate = action.payload;
    },
  },
});

export const {
  pushError,
  markNotified,
  clearBuffer,
  setFlushStatus,
  setPendingImmediate,
} = errorsSlice.actions;
export default errorsSlice.reducer;
```

Register as `errors: errorsReducer` in `store.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/errorsSlice.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/middleware/redux/errorsSlice.js src/middleware/redux/store.js tests/unit/errorsSlice.test.js
git commit -m "feat: add Redux errors buffer slice"
```

---

### Task 2: Classify + API client (TDD)

**Files:**
- Create: `src/shared/errors/classifyError.js`
- Create: `src/shared/errors/errorApi.js`
- Test: `tests/unit/classifyError.test.js`

**Interfaces:**
- Produces: `isImmediateError(payload): boolean`
- Produces: `sendErrorReport(body): Promise<{ ok: boolean }>`
- Fixed immediate types: `window.error`, `unhandledrejection`, `login.auth.5xx`, `editor.save.fail`, `collab.socket.fail`

- [ ] **Step 1: Write failing classify tests**

```js
import { describe, expect, it } from 'vitest';
import { isImmediateError } from '../../src/shared/errors/classifyError.js';

describe('isImmediateError', () => {
  it('returns true for opt-in severity', () => {
    expect(isImmediateError({ severity: 'immediate' })).toBe(true);
    expect(isImmediateError({ notify: 'now' })).toBe(true);
  });

  it('returns true for fixed types', () => {
    expect(isImmediateError({ type: 'window.error' })).toBe(true);
    expect(isImmediateError({ type: 'login.auth.5xx' })).toBe(true);
    expect(isImmediateError({ type: 'editor.save.fail' })).toBe(true);
    expect(isImmediateError({ type: 'collab.socket.fail' })).toBe(true);
    expect(isImmediateError({ type: 'unhandledrejection' })).toBe(true);
  });

  it('returns false for ordinary buffered errors', () => {
    expect(isImmediateError({ type: 'ui.validation', severity: 'buffered' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/classifyError.test.js`

Expected: FAIL

- [ ] **Step 3: Implement classify + API**

```js
// classifyError.js
const IMMEDIATE_TYPES = new Set([
  'window.error',
  'unhandledrejection',
  'login.auth.5xx',
  'editor.save.fail',
  'collab.socket.fail',
]);

export function isImmediateError(payload = {}) {
  if (payload.severity === 'immediate' || payload.notify === 'now') return true;
  return IMMEDIATE_TYPES.has(payload.type);
}
```

```js
// errorApi.js
export async function sendErrorReport(body) {
  try {
    const res = await fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: res.ok };
  } catch (err) {
    console.error('sendErrorReport failed', err);
    return { ok: false };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/classifyError.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/errors/classifyError.js src/shared/errors/errorApi.js tests/unit/classifyError.test.js
git commit -m "feat: add error classify rules and report API client"
```

---

### Task 3: `reportError` + `flushErrors` (TDD)

**Files:**
- Create: `src/shared/errors/reportError.js`
- Create: `src/shared/errors/flushErrors.js`
- Test: `tests/unit/reportError.test.js`

**Interfaces:**
- Consumes: store, `pageMeta.current`, classify, API, errors actions
- Produces: `reportError(payload): Promise<void>`
- Produces: `flushErrors({ modeReason }): Promise<void>`

- [ ] **Step 1: Write failing tests with mocked fetch**

```js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../src/middleware/redux/store.js';
import { setPageMeta } from '../../src/middleware/redux/pageMetaSlice.js';
import { clearBuffer } from '../../src/middleware/redux/errorsSlice.js';
import { reportError } from '../../src/shared/errors/reportError.js';
import { flushErrors } from '../../src/shared/errors/flushErrors.js';

describe('reportError and flushErrors', () => {
  beforeEach(() => {
    store.dispatch(clearBuffer());
    store.dispatch(setPageMeta({ id: 'login', title: 'IMPACT | Log In' }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true })),
    );
  });

  it('always buffers and sends immediate for critical types', async () => {
    await reportError({ type: 'login.auth.5xx', message: 'auth down' });
    const buf = store.getState().errors.buffer;
    expect(buf).toHaveLength(1);
    expect(buf[0].pageId).toBe('login');
    expect(buf[0].alreadyNotified).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/errors/report',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('buffers ordinary errors without immediate send', async () => {
    await reportError({ type: 'ui.validation', message: 'bad email' });
    expect(store.getState().errors.buffer[0].alreadyNotified).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('flush sends digest and clears buffer on success', async () => {
    await reportError({ type: 'ui.validation', message: 'x' });
    await flushErrors({ reason: 'session-end' });
    expect(fetch).toHaveBeenCalled();
    expect(store.getState().errors.buffer).toHaveLength(0);
    expect(store.getState().errors.lastFlushStatus?.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/reportError.test.js`

Expected: FAIL

- [ ] **Step 3: Implement reportError and flushErrors**

```js
// reportError.js
import { store } from '../../middleware/redux/store.js';
import { pushError, markNotified, setPendingImmediate } from '../../middleware/redux/errorsSlice.js';
import { isImmediateError } from './classifyError.js';
import { sendErrorReport } from './errorApi.js';

function makeId() {
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function reportError(payload = {}) {
  try {
    const pageId =
      payload.pageId || store.getState().pageMeta?.current?.id || 'unknown';
    const item = {
      id: payload.id || makeId(),
      pageId,
      type: payload.type || 'unknown',
      message: String(payload.message || ''),
      stack: payload.stack,
      meta: payload.meta,
      ts: payload.ts || Date.now(),
      severity: isImmediateError(payload) ? 'immediate' : 'buffered',
      alreadyNotified: false,
    };

    store.dispatch(pushError(item));

    if (!isImmediateError(payload)) return;

    store.dispatch(setPendingImmediate(store.getState().errors.pendingImmediate + 1));
    const result = await sendErrorReport({
      mode: 'immediate',
      errors: [item],
    });
    store.dispatch(setPendingImmediate(store.getState().errors.pendingImmediate - 1));
    if (result.ok) store.dispatch(markNotified(item.id));
  } catch (err) {
    console.error('reportError failed', err);
  }
}
```

```js
// flushErrors.js
import { store } from '../../middleware/redux/store.js';
import { clearBuffer, setFlushStatus } from '../../middleware/redux/errorsSlice.js';
import { sendErrorReport } from './errorApi.js';

export async function flushErrors({ reason } = {}) {
  try {
    const { buffer } = store.getState().errors;
    if (!buffer.length) {
      store.dispatch(setFlushStatus({ ok: true, reason, empty: true }));
      return;
    }
    const pageId = store.getState().pageMeta?.current?.id || 'unknown';
    const result = await sendErrorReport({
      mode: 'digest',
      pageId,
      reason,
      errors: buffer,
    });
    store.dispatch(setFlushStatus({ ok: result.ok, reason }));
    if (result.ok) store.dispatch(clearBuffer());
  } catch (err) {
    console.error('flushErrors failed', err);
    store.dispatch(setFlushStatus({ ok: false, reason, error: String(err) }));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/reportError.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/errors/reportError.js src/shared/errors/flushErrors.js tests/unit/reportError.test.js
git commit -m "feat: add reportError and flushErrors with unit tests"
```

---

### Task 4: Global handlers + flush on page leave / logout hooks

**Files:**
- Create: `src/shared/errors/installGlobalErrorHandlers.js`
- Modify: `src/main.js` (install handlers once)
- Modify: `src/routing/loadPage.js` (flush when leaving login/dashboard before next page)
- Create: `src/shared/errors/flushPolicy.js` (which page ids flush on leave)
- Test: `tests/unit/flushPolicy.test.js`

**Interfaces:**
- Produces: `installGlobalErrorHandlers(): void`
- Produces: `shouldFlushOnLeave(pageId): boolean` — true for `login`, `dashboard`, `admin`
- Produces: `shouldFlushOnLogout(pageId): boolean` — true for `editor`
- On editor: export `flushOnLogout()` for future login/logout module to call; also listen `pagehide` while `pageMeta.id === 'editor'`

- [ ] **Step 1: Write failing flushPolicy test**

```js
import { describe, expect, it } from 'vitest';
import { shouldFlushOnLeave, shouldFlushOnLogout } from '../../src/shared/errors/flushPolicy.js';

describe('flushPolicy', () => {
  it('flushes login/dashboard/admin on leave', () => {
    expect(shouldFlushOnLeave('login')).toBe(true);
    expect(shouldFlushOnLeave('dashboard')).toBe(true);
    expect(shouldFlushOnLeave('admin')).toBe(true);
    expect(shouldFlushOnLeave('home')).toBe(false);
    expect(shouldFlushOnLeave('editor')).toBe(false);
  });

  it('flushes editor on logout', () => {
    expect(shouldFlushOnLogout('editor')).toBe(true);
    expect(shouldFlushOnLogout('login')).toBe(false);
  });
});
```

- [ ] **Step 2: Implement policy, handlers, wire loadPage**

```js
// flushPolicy.js
export function shouldFlushOnLeave(pageId) {
  return ['login', 'dashboard', 'admin'].includes(pageId);
}

export function shouldFlushOnLogout(pageId) {
  return pageId === 'editor';
}
```

```js
// installGlobalErrorHandlers.js
import { reportError } from './reportError.js';
import { flushErrors } from './flushErrors.js';
import { store } from '../../middleware/redux/store.js';
import { shouldFlushOnLogout } from './flushPolicy.js';

let installed = false;

export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;

  window.addEventListener('error', (event) => {
    reportError({
      type: 'window.error',
      message: event.message,
      stack: event.error?.stack,
      meta: { filename: event.filename, lineno: event.lineno },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportError({
      type: 'unhandledrejection',
      message: reason?.message || String(reason),
      stack: reason?.stack,
    });
  });

  window.addEventListener('pagehide', () => {
    const pageId = store.getState().pageMeta?.current?.id;
    if (shouldFlushOnLogout(pageId)) {
      flushErrors({ reason: 'pagehide-editor' });
    }
  });
}
```

In `loadPage.js`, before replacing the page, if previous `store.getState().pageMeta.current?.id` passes `shouldFlushOnLeave`, `await flushErrors({ reason: 'page-leave' })`.

In `main.js`, call `installGlobalErrorHandlers()` once at startup.

Export for future auth module:

```js
// can live in flushErrors.js or a tiny logoutErrors.js
export async function flushOnLogout() {
  const pageId = store.getState().pageMeta?.current?.id;
  if (shouldFlushOnLogout(pageId) || shouldFlushOnLeave(pageId)) {
    await flushErrors({ reason: 'logout' });
  }
}
```

- [ ] **Step 3: Run unit tests**

Run: `npm run test:unit -- tests/unit/flushPolicy.test.js`

Expected: PASS  
Also re-run full `npm run test:unit`.

- [ ] **Step 4: Commit**

```bash
git add src/shared/errors/flushPolicy.js src/shared/errors/installGlobalErrorHandlers.js src/routing/loadPage.js src/main.js tests/unit/flushPolicy.test.js
git commit -m "feat: wire global error handlers and flush-on-leave policy"
```

---

### Task 5: Playwright e2e with mocked report API

**Files:**
- Create: `tests/e2e/error-report-mock.spec.js`
- Optional harness: `tests/harness/report-error.html` + main that calls `reportError`

- [ ] **Step 1: Write e2e with route mock**

```js
import { test, expect } from '@playwright/test';

test('immediate error posts to report API', async ({ page }) => {
  const posts = [];
  await page.route('**/api/errors/report', async (route) => {
    const body = route.request().postDataJSON();
    posts.push(body);
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });

  await page.goto('/');
  await page.evaluate(async () => {
    const { reportError } = await import('/src/shared/errors/reportError.js');
    await reportError({ type: 'login.auth.5xx', message: 'auth 500' });
  });

  await expect.poll(() => posts.length).toBeGreaterThan(0);
  expect(posts[0].mode).toBe('immediate');
  expect(posts[0].errors[0].type).toBe('login.auth.5xx');
});
```

If dynamic import path fails under Vite, use a harness page that exposes `window.__reportError = reportError` instead.

- [ ] **Step 2: Run e2e**

Run: `npx playwright test tests/e2e/error-report-mock.spec.js`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/error-report-mock.spec.js tests/harness
git commit -m "test: e2e mock for immediate error reporting"
```

---

## Plan self-review (errors)

| Spec requirement | Task |
|------------------|------|
| Redux buffer fields | 1 |
| Always buffer + immediate C | 2, 3 |
| Fixed list + opt-in | 2 |
| Flush login/dashboard leave; editor logout | 4 |
| `POST /api/errors/report` | 2, 3, 5 |
| Never throw into UI | 3 |
| Unit + e2e mock | 1–3, 5 |
| No backend mailer implementation | honored (client + mock only) |
