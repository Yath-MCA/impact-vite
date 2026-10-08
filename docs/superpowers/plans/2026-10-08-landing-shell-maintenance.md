# Thin Landing Shell + Maintenance Toast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After successful `urlvalidity` on `#/validateurl`, auto-open a thin LandingUI shell and show a scheduled-maintenance info toast; failures keep existing landing message keys (including `INVALID`).

**Architecture:** Extend the existing validate-first page: browser check → `URL_VALIDITY` → on valid, brief success flash then in-page swap to slim `LandingUI`; that shell mounts `maintenanceGuard` (`GET_DOCS` ServerMaintenance → Swal toast). Failures never open the shell or fire maintenance.

**Tech Stack:** React 19, react-router HashRouter, Vitest, Playwright, SweetAlert2, existing `apiService` / `API_ENDPOINTS.GET_DOCS`.

## Global Constraints

- Spec: [docs/superpowers/specs/2026-10-08-landing-shell-maintenance-design.md](../specs/2026-10-08-landing-shell-maintenance-design.md)
- Success order: Browser OK → `urlvalidity` → valid → thin LandingUI → then maintenance toast
- Failures: existing keys in `src/pages/landing/messages/landingMessages.js` only; no shell; no maintenance toast
- Maintenance is informational only; never blocks validate or landing
- In-page `showLanding` swap — no new hash route
- Out of scope: full paste LandingUI (session/PLOS/download/logos), app-wide maintenance, HTML home replacement
- Tailwind utilities use `tw:` prefix (match live ValidateUrlPage)
- Do not commit `temp/react-paste-unused/**` paste sources

---

## File map

| Path | Responsibility |
|------|----------------|
| `src/pages/landing/messages/landingMessageKeys.js` | Add `SCHEDULED_MAINTENANCE` |
| `src/pages/landing/messages/landingMessages.js` | Add maintenance HTML template (`T2A` for end meridiem) |
| `src/pages/landing/maintenanceGuard.js` | Port schedule fetch + toast (live apiService imports) |
| `src/pages/landing/LandingUI.jsx` | Thin shell UI; on mount init + fire maintenance |
| `src/pages/landing/ValidateUrlPage.jsx` | Auto `showLanding` after valid; lazy LandingUI; keep fail messages |
| `src/pages/landing/index.js` | Re-export LandingUI if useful |
| `tests/unit/maintenanceGuard.test.js` | Unit tests for parse/schedule/alert window |
| `tests/unit/landingMessages.test.js` | Interpolation for `SCHEDULED_MAINTENANCE` |
| `tests/e2e/validate-url.spec.js` | Update success → shell; add invalid + maintenance cases |

---

### Task 1: Scheduled maintenance message catalog

**Files:**
- Modify: `src/pages/landing/messages/landingMessageKeys.js`
- Modify: `src/pages/landing/messages/landingMessages.js`
- Create: `tests/unit/landingMessages.test.js`

**Interfaces:**
- Consumes: existing `getLandingMessage` / `LandingMessageKey` in `messages/index.js` (already interpolates `{{var}}`)
- Produces: `LandingMessageKey.SCHEDULED_MAINTENANCE` and `LANDING_MESSAGES[SCHEDULED_MAINTENANCE].text` with `{{T1}}`, `{{T1A}}`, `{{T2}}`, `{{T2A}}`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/landingMessages.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { getLandingMessage, LandingMessageKey } from '../../src/pages/landing/messages/index.js';

describe('SCHEDULED_MAINTENANCE message', () => {
  it('interpolates start/end local parts', () => {
    const entry = getLandingMessage(LandingMessageKey.SCHEDULED_MAINTENANCE, {
      T1: '08-Oct-2026 10:00',
      T1A: 'AM',
      T2: '08-Oct-2026 12:00',
      T2A: 'PM',
    });
    expect(entry).toBeTruthy();
    expect(entry.text).toContain('08-Oct-2026 10:00');
    expect(entry.text).toContain('AM');
    expect(entry.text).toContain('08-Oct-2026 12:00');
    expect(entry.text).toContain('PM');
    expect(entry.text).not.toMatch(/\{\{T\d/);
  });

  it('keeps INVALID catalog entry for fail path', () => {
    const entry = getLandingMessage(LandingMessageKey.INVALID);
    expect(entry.title).toMatch(/invalid/i);
    expect(entry.type).toBe('error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/landingMessages.test.js`

Expected: FAIL (unknown key `SCHEDULED_MAINTENANCE` / entry null)

- [ ] **Step 3: Add key + message**

In `landingMessageKeys.js` add:

```js
SCHEDULED_MAINTENANCE: 'SCHEDULED_MAINTENANCE',
```

In `landingMessages.js` add (end meridiem is `T2A`, not paste’s buggy `T1A`):

```js
[LandingMessageKey.SCHEDULED_MAINTENANCE]: Object.freeze({
  text:
    "Kindly note that we will be experiencing server downtime due to scheduled maintenance from <span class='font-weight-bold'>{{T1}}&#x000a0;{{T1A}}</span> to <span class='font-weight-bold'>{{T2}}&#x000a0;{{T2A}}</span> (in your local time).",
}),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/landingMessages.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/landing/messages/landingMessageKeys.js src/pages/landing/messages/landingMessages.js tests/unit/landingMessages.test.js
git commit -m "feat(landing): add SCHEDULED_MAINTENANCE message catalog entry"
```

---

### Task 2: Port `maintenanceGuard` (schedule + toast)

**Files:**
- Create: `src/pages/landing/maintenanceGuard.js`
- Create: `tests/unit/maintenanceGuard.test.js`
- Source reference: `temp/react-paste-unused/landing/maintenanceGuard.js` (do not commit paste)

**Interfaces:**
- Consumes: `apiService`, `API_ENDPOINTS` from `../../middleware/providers/apiService`; `getLandingMessage`, `LandingMessageKey` from `./messages/index.js`; `Swal` from `sweetalert2`
- Produces:
  - `END_TIMER_MINUTES` = `120`, `BEFORE_TIMER_MINUTES` = `2880`
  - `parseEpoch(value) => number`
  - `resetMaintenanceState() => void`
  - `getMaintenanceState() => { ON, START, END, ALERT_START, T1, T1A, T2, T2A, canShowAlert, messageHtml }`
  - `initMaintenance({ init?: boolean, start?, end?, showBefore? }) => Promise<state>`
  - `fireMaintenanceAlert({ returnText?: boolean, debug?: boolean }) => boolean | string`
  - `checkMaintenanceDb() => Promise<state>` (used by `initMaintenance({ init: true })`)

- [ ] **Step 1: Write the failing unit tests**

Create `tests/unit/maintenanceGuard.test.js`:

```js
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/middleware/providers/apiService', () => ({
  apiService: { makeRequest: vi.fn() },
  API_ENDPOINTS: { GET_DOCS: '/mock/getdocs' },
}));

import { apiService } from '../../src/middleware/providers/apiService';
import {
  END_TIMER_MINUTES,
  fireMaintenanceAlert,
  getMaintenanceState,
  initMaintenance,
  parseEpoch,
  resetMaintenanceState,
} from '../../src/pages/landing/maintenanceGuard.js';

describe('parseEpoch', () => {
  it('parses numeric strings and objects', () => {
    expect(parseEpoch('1700000000000')).toBe(1700000000000);
    expect(parseEpoch({ $numberLong: '1700000000000' })).toBe(1700000000000);
    expect(parseEpoch(null)).toBe(0);
  });
});

describe('initMaintenance schedule window', () => {
  beforeEach(() => {
    resetMaintenanceState();
    vi.mocked(apiService.makeRequest).mockReset();
  });

  it('sets ON and ALERT_START for a future window', async () => {
    const start = Date.now() + 60 * 60 * 1000; // +1h
    const state = await initMaintenance({ init: false, start, end: start + END_TIMER_MINUTES * 60 * 1000 });
    expect(state.ON).toBe(true);
    expect(state.ALERT_START).toBeLessThan(state.START);
    expect(state.canShowAlert).toBe(true); // within default 48h before
    expect(state.messageHtml).toContain('scheduled maintenance');
  });

  it('clears ON when start is in the past', async () => {
    const start = Date.now() - 60 * 1000;
    const state = await initMaintenance({ init: false, start });
    expect(state.ON).toBe(false);
  });

  it('loads from GET_DOCS when init:true', async () => {
    const start = Date.now() + 2 * 60 * 60 * 1000;
    vi.mocked(apiService.makeRequest).mockResolvedValue({
      data: [{ starttime: start, endtime: start + 2 * 60 * 60 * 1000, status: 'active' }],
    });
    const state = await initMaintenance({ init: true });
    expect(apiService.makeRequest).toHaveBeenCalled();
    expect(state.ON).toBe(true);
  });
});

describe('fireMaintenanceAlert', () => {
  beforeEach(() => {
    resetMaintenanceState();
  });

  it('returns false when not ON', () => {
    expect(fireMaintenanceAlert()).toBe(false);
  });

  it('returns html when returnText and schedule active', async () => {
    const start = Date.now() + 30 * 60 * 1000;
    await initMaintenance({ init: false, start });
    const html = fireMaintenanceAlert({ returnText: true });
    expect(typeof html).toBe('string');
    expect(html).toContain('scheduled maintenance');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/maintenanceGuard.test.js`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement `maintenanceGuard.js`**

Port logic from `temp/react-paste-unused/landing/maintenanceGuard.js` with these live imports:

```js
import Swal from 'sweetalert2';
import { apiService, API_ENDPOINTS } from '../../middleware/providers/apiService';
import { getLandingMessage, LandingMessageKey } from './messages/index.js';
```

Fix paste quirks while porting:
- Single `tbl: 'ServerMaintenance'` in the `GET_DOCS` payload (paste duplicated the key)
- Use `row.starttime` / `row.endtime` once (paste duplicated ternary)
- `checkMaintenanceDb` catch → `applySchedule({})`
- `fireMaintenanceAlert` uses Swal toast mixin (`toast: true`, `position: 'top'`, `showConfirmButton: false`, `icon: 'info'`); wrap in try/catch; never throw
- Keep `window.MAINTENANCE` sync for legacy interop

Export the functions listed in Interfaces above.

- [ ] **Step 4: Run unit tests**

Run: `npm run test:unit -- tests/unit/maintenanceGuard.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/landing/maintenanceGuard.js tests/unit/maintenanceGuard.test.js
git commit -m "feat(landing): port maintenanceGuard schedule and toast"
```

---

### Task 3: Thin `LandingUI` shell

**Files:**
- Create: `src/pages/landing/LandingUI.jsx`
- Modify: `src/pages/landing/index.js`

**Interfaces:**
- Consumes: `docData` prop (`{ title?, client?, docid?, ... }` from `normalizeValidateResponse`); `initMaintenance`, `fireMaintenanceAlert` from `./maintenanceGuard.js`
- Produces: React component `LandingUI({ docData })` that renders shell and fires maintenance once on mount

- [ ] **Step 1: Implement thin shell**

Create `src/pages/landing/LandingUI.jsx`:

```jsx
import { useEffect } from 'react';
import { FiFileText } from 'react-icons/fi';
import { fireMaintenanceAlert, initMaintenance } from './maintenanceGuard.js';

export default function LandingUI({ docData }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initMaintenance({ init: true });
        if (!cancelled) fireMaintenanceAlert();
      } catch {
        // never block landing
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const title = docData?.title || 'Your document';
  const client = docData?.client || docData?.clientname || '';

  return (
    <div
      className="tw:min-h-screen tw:bg-gradient-to-br tw:from-slate-50 tw:via-white tw:to-orange-50 tw:px-4 tw:py-10"
      data-testid="landing-shell"
    >
      <div className="tw:mx-auto tw:w-full tw:max-w-2xl">
        <header className="tw:mb-8 tw:text-center">
          <div className="tw:mx-auto tw:mb-4 tw:flex tw:h-14 tw:w-14 tw:items-center tw:justify-center tw:rounded-2xl tw:bg-primary">
            <FiFileText className="tw:h-7 tw:w-7 tw:text-white" aria-hidden />
          </div>
          <h1 className="tw:text-2xl tw:font-bold tw:tracking-tight tw:text-slate-900">
            {title}
          </h1>
          {client ? (
            <p className="tw:mt-2 tw:text-slate-600">{client}</p>
          ) : (
            <p className="tw:mt-2 tw:text-slate-600">
              Access verified. Full client branding arrives in a later phase.
            </p>
          )}
        </header>
        <div className="tw:rounded-2xl tw:border tw:border-slate-200 tw:bg-white tw:p-6 tw:shadow-sm">
          <p className="tw:mb-4 tw:text-sm tw:text-slate-600">
            You can continue once session and branding hooks are enabled.
          </p>
          <button
            type="button"
            disabled
            className="tw:inline-flex tw:w-full tw:items-center tw:justify-center tw:rounded-md tw:bg-primary tw:px-5 tw:py-2.5 tw:font-semibold tw:text-white tw:opacity-70 tw:cursor-not-allowed"
          >
            Continue (soon)
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Re-export from index**

Update `src/pages/landing/index.js`:

```js
export { default } from './ValidateUrlPage.jsx';
export { default as ValidateUrlPage } from './ValidateUrlPage.jsx';
export { default as LandingUI } from './LandingUI.jsx';
```

- [ ] **Step 3: Smoke-check unit suite still green**

Run: `npm run test:unit`

Expected: PASS (no regressions)

- [ ] **Step 4: Commit**

```bash
git add src/pages/landing/LandingUI.jsx src/pages/landing/index.js
git commit -m "feat(landing): add thin LandingUI shell with maintenance mount"
```

---

### Task 4: Wire ValidateUrlPage auto-redirect + fail messages

**Files:**
- Modify: `src/pages/landing/ValidateUrlPage.jsx`
- Modify: `tests/e2e/validate-url.spec.js`

**Interfaces:**
- Consumes: lazy `LandingUI`; existing `assertValidateAccess` / `showLandingMessage` / `LandingMessageKey`
- Produces: on valid → success UI briefly → `setShowLanding(true)` (~800ms); on fail → existing keys; invalid key → `INVALID`

- [ ] **Step 1: Update ValidateUrlPage**

Required behavior changes in `ValidateUrlPage.jsx`:

1. Add imports:

```js
import { lazy, Suspense, useEffect, useState } from 'react';
import { FiCheckCircle, FiLoader, FiXCircle } from 'react-icons/fi';
// ...existing api/normalize/message imports...

const LandingUI = lazy(() => import('./LandingUI.jsx'));
```

2. Add state: `const [showLanding, setShowLanding] = useState(false);`

3. On successful validate (after `setStatus('success')`), schedule:

```js
const landingTimer = setTimeout(() => {
  if (!cancelled) setShowLanding(true);
}, 800);
```

Clear `landingTimer` in the effect cleanup.

4. Remove / stop relying on the disabled “Continue to Landing (soon)” as the only path — auto-transition replaces it. Success card may still flash for 800ms.

5. Before the progress card return, if `showLanding && docData`:

```jsx
if (showLanding && docData) {
  return (
    <Suspense
      fallback={
        <div className="tw:min-h-screen tw:flex tw:items-center tw:justify-center">
          <FiLoader className="tw:h-8 tw:w-8 tw:animate-spin tw:text-primary" aria-label="Loading landing" />
        </div>
      }
    >
      <LandingUI docData={docData} />
    </Suspense>
  );
}
```

6. Keep fail mapping exactly:

```js
if (err?.code === 'file_deleted') {
  await showLandingMessage(LandingMessageKey.FILE_DELETED);
} else if (err?.code === 'expired' || err?.code === 'deactive') {
  await showLandingMessage(LandingMessageKey.EXPIRED);
} else if (err?.code === 'invalid') {
  await showLandingMessage(LandingMessageKey.INVALID);
} else {
  await showLandingMessage(LandingMessageKey.TRY_AGAIN_LATER);
}
```

Missing `accessKey` continues to call `LandingMessageKey.INVALID`.

7. Remove debug `console.log` of response fields if still present.

- [ ] **Step 2: Update / extend e2e**

Replace success stub expectations in `tests/e2e/validate-url.spec.js` and add cases:

```js
import { test, expect } from '@playwright/test';

test('validateurl valid key opens landing shell', async ({ page }) => {
  await page.route('**/*urlvalidity*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { docid: 'doc-1', title: 'Sample Proof', client: 'DemoClient', rolename: 'Author' },
      }),
    });
  });
  await page.route('**/*getdocs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.goto('/#/validateurl?key=test-key-abc');
  await expect(page.getByTestId('landing-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: /sample proof/i })).toBeVisible();
});

test('validateurl invalid key shows INVALID alert, no landing', async ({ page }) => {
  await page.route('**/*urlvalidity*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'invalid', message: 'bad key' }),
    });
  });

  await page.goto('/#/validateurl?key=bad-key');
  const swal = page.locator('.swal2-popup');
  await expect(swal).toBeVisible({ timeout: 15000 });
  await expect(swal.getByText(/invalid/i)).toBeVisible();
  await page.locator('.swal2-confirm').click();
  await expect(page.getByTestId('landing-shell')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /validation failed/i })).toBeVisible();
});

test('validateurl valid key shows maintenance toast when schedule active', async ({ page }) => {
  const start = Date.now() + 60 * 60 * 1000;
  const end = start + 2 * 60 * 60 * 1000;
  await page.route('**/*urlvalidity*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { docid: 'doc-2', title: 'Maint Proof', rolename: 'Author' },
      }),
    });
  });
  await page.route('**/*getdocs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ starttime: start, endtime: end, status: 'active' }],
      }),
    });
  });

  await page.goto('/#/validateurl?key=maint-key');
  await expect(page.getByTestId('landing-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.swal2-toast, .swal2-container')).toContainText(
    /scheduled maintenance/i,
    { timeout: 10000 }
  );
});

test('validateurl with mocked expired api shows failure', async ({ page }) => {
  await page.route('**/*urlvalidity*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'expired',
        message: 'The link has expired',
      }),
    });
  });

  await page.goto('/#/validateurl?key=expired-key');
  const swalConfirm = page.locator('.swal2-confirm');
  await expect(swalConfirm).toBeVisible({ timeout: 15000 });
  await swalConfirm.click();
  await expect(page.getByRole('heading', { name: /validation failed/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId('landing-shell')).toHaveCount(0);
});
```

- [ ] **Step 3: Run e2e validate suite**

Run: `npx playwright test tests/e2e/validate-url.spec.js`

Expected: PASS

- [ ] **Step 4: Run unit + build**

Run:

```bash
npm run test:unit
npm run build
```

Expected: unit PASS; build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/pages/landing/ValidateUrlPage.jsx tests/e2e/validate-url.spec.js
git commit -m "feat(landing): auto-open thin shell after valid url and wire e2e"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Browser → urlvalidity → landing → maintenance | Task 4 + 3 |
| Failures use existing messages including INVALID | Task 1 (keep) + Task 4 |
| Thin LandingUI shell | Task 3 |
| Port maintenanceGuard + toast | Task 2 |
| SCHEDULED_MAINTENANCE catalog | Task 1 |
| Never block on maintenance | Task 2–3 |
| Unit + e2e + build | Tasks 1–4 |
| No full LandingUI / session / PLOS | Out of scope (not tasked) |

**Placeholder scan:** none intentional.  
**Type consistency:** `initMaintenance` / `fireMaintenanceAlert` / `LandingUI({ docData })` / `LandingMessageKey.SCHEDULED_MAINTENANCE` / `data-testid="landing-shell"` aligned across tasks.
