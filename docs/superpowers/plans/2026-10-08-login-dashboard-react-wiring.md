# Login + Dashboard React Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure providers/store, add Vite React (ES2019 target), wire Login JSX to real `apiService.userLogin`, then mount a dashboard shell with DashboardLayout chrome (no AG Grid config yet).

**Architecture:** Hash router in `main.js` keeps home on HTML `loadPage`; `#/login` and `#/dashboard` mount a React tree (`Provider` + `AuthProvider` + `HashRouter`). Canonical API/auth live under `src/middleware/providers/`. Dashboard Phase 3 uses `DashboardProvider` + layout header/sidebar/body with a placeholder outlet — DocsGrid/AG Grid deferred.

**Tech Stack:** Vite 8, React 18, react-router-dom (HashRouter), react-redux, existing RTK slices, axios `apiService`, Vitest, Playwright.

**Spec:** [docs/superpowers/specs/2026-10-08-login-dashboard-react-wiring-design.md](../specs/2026-10-08-login-dashboard-react-wiring-design.md)

## Global Constraints

- Real login API only (no mock `userLogin` in app code).
- Vite `build.target` remains `['chrome72', 'firefox66', 'edge80', 'safari14.1']`.
- Canonical API: `src/middleware/providers/apiService.js`.
- Canonical auth: `src/middleware/providers/AuthProvider.jsx`.
- AG Grid type column configs are **out of scope** for this plan.
- Home stays HTML + `page.config` / `loadPage`.
- Commits only when the user asks (skip plan commit steps unless requested).
- After Phases 1–3 work and tests pass: move **unused or duplicated** pasted files into a temp folder (do not delete). Do not move anything still imported by the live login/dashboard/home path.

## File map

| File | Role |
|------|------|
| `vite.config.js` | `@vitejs/plugin-react`, `/api` proxy |
| `package.json` | react, react-dom, react-redux, react-router-dom, plugin |
| `src/middleware/providers/apiService.js` | Real API (fix import path consumers) |
| `src/middleware/providers/AuthProvider.jsx` | Fix `./apiService` import |
| `src/middleware/session/runtimeFlags.js` | `isLocalHost` helper (missing today) |
| `src/config/theme.js` | Minimal `BRANDING` for Login |
| `src/middleware/redux/store.js` | Merged store |
| `src/middleware/redux/index.js` | Re-export store only |
| `src/core/router/ProtectedRoute.jsx` | Auth gate |
| `src/app/ReactApp.jsx` | Providers + routes |
| `src/app/mountReactApp.js` | createRoot lifecycle |
| `src/pages/auth/pages/Login.jsx` | Fix auth import |
| `src/pages/dashboard/pages/DashboardHome.jsx` | Placeholder body |
| `src/pages/dashboard/shell/DashboardShell.jsx` | Provider + layout without DocsGrid |
| `src/main.js` | Hash → home HTML vs React mount |
| `tests/unit/*` | store, ProtectedRoute |
| `tests/e2e/login-dashboard.spec.js` | Mock API login → dashboard |

---

### Task 1: Vite React toolchain + `/api` proxy

**Files:**
- Modify: `package.json`, `vite.config.js`
- Create: `public/env.js` (only if missing; minimal `window.ENV` defaults for local)

**Interfaces:**
- Produces: JSX compile; `'/api'` proxied to `http://localhost:8080`

- [ ] **Step 1: Install deps**

```bash
npm install react react-dom react-redux react-router-dom
npm install -D @vitejs/plugin-react
```

- [ ] **Step 2: Update `vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/xmleditor': {
        target: 'http://localhost',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: ['chrome72', 'firefox66', 'edge80', 'safari14.1'],
    outDir: 'dist',
    sourcemap: true,
  },
});
```

- [ ] **Step 3: Add `public/env.js` if absent**

```js
window.ENV = window.ENV || {
  API_PATH: '/api/',
  BACKEND_DOMAIN: 'localhost:8080',
  IS_LOCAL_DOMAIN: true,
};
```

Load from `index.html`: `<script src="/env.js"></script>` before the module entry.

- [ ] **Step 4: Verify Vite starts**

Run: `npm run dev`  
Expected: server up; no plugin errors.

---

### Task 2: Fix provider imports + missing helpers

**Files:**
- Modify: `src/middleware/providers/AuthProvider.jsx`
- Create: `src/middleware/session/runtimeFlags.js`
- Create: `src/config/theme.js`
- Modify: `src/pages/auth/pages/Login.jsx` (auth import only)

**Interfaces:**
- Produces: `isLocalHost(url): boolean`
- Produces: `BRANDING` object with `companyLogo`, `productIcon`, `productName`, `companyName`
- AuthProvider imports `./apiService`

- [ ] **Step 1: Write failing unit test for `isLocalHost`**

Create `tests/unit/runtimeFlags.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { isLocalHost } from '../../src/middleware/session/runtimeFlags.js';

describe('isLocalHost', () => {
  it('detects localhost urls', () => {
    expect(isLocalHost('http://localhost:5173/#/login')).toBe(true);
    expect(isLocalHost('https://impact.example.com/')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test:unit -- tests/unit/runtimeFlags.test.js`

- [ ] **Step 3: Implement helpers + fix imports**

`src/middleware/session/runtimeFlags.js`:

```js
export function isLocalHost(url = '') {
  return /localhost|127\.0\.0\.1/i.test(String(url));
}
```

`src/config/theme.js`:

```js
export const BRANDING = {
  productName: 'IMPACT',
  companyName: 'Newgen',
  companyLogo: '/favicon.svg',
  productIcon: '/favicon.svg',
};

export const THEME = {
  primary: '#c45c26',
};
```

In `AuthProvider.jsx`, change api import to:

```js
import { apiService, ADMIN_CONFIG, ROLE_IDS } from './apiService';
```

Ensure any `User_API_KEY` reference uses a value from `apiService` exports or `window.ENV` (import named export if present; otherwise `window.ENV?.User_API_KEY || ''`).

In `Login.jsx`:

```js
import { useAuth } from '../../../middleware/providers/AuthProvider';
```

- [ ] **Step 4: Run unit test — expect PASS**

Run: `npm run test:unit -- tests/unit/runtimeFlags.test.js`

---

### Task 3: Merge Redux store

**Files:**
- Modify: `src/middleware/redux/store.js`
- Modify: `src/middleware/redux/index.js`
- Test: `tests/unit/store.merge.test.js`

**Interfaces:**
- Produces: `store.getState()` with `pageMeta`, `modules`, `capabilityCatalog`, `panel`

- [ ] **Step 1: Write failing test**

```js
import { describe, expect, it } from 'vitest';
import { store } from '../../src/middleware/redux/store.js';

describe('merged store', () => {
  it('exposes pageMeta modules and capabilityCatalog', () => {
    const state = store.getState();
    expect(state).toHaveProperty('pageMeta');
    expect(state).toHaveProperty('modules');
    expect(state).toHaveProperty('capabilityCatalog');
    expect(state).toHaveProperty('panel');
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (modules missing)

- [ ] **Step 3: Merge store**

```js
import { configureStore, createSlice } from '@reduxjs/toolkit';
import pageMetaReducer from './pageMetaSlice.js';
import modulesReducer from './modulesSlice.js';
import capabilityCatalogReducer from './capabilityCatalogSlice.js';

const panelSlice = createSlice({
  name: 'panel',
  initialState: { content: '' },
  reducers: {
    setContent(state, action) {
      state.content = action.payload;
    },
  },
});

export const { setContent } = panelSlice.actions;

export const store = configureStore({
  reducer: {
    panel: panelSlice.reducer,
    pageMeta: pageMetaReducer,
    modules: modulesReducer,
    capabilityCatalog: capabilityCatalogReducer,
  },
});
```

`index.js`:

```js
export { store, setContent } from './store.js';
```

- [ ] **Step 4: Run — expect PASS**

---

### Task 4: `ProtectedRoute` + React app shell

**Files:**
- Create: `src/core/router/ProtectedRoute.jsx`
- Create: `src/app/ReactApp.jsx`
- Create: `src/app/mountReactApp.js`
- Create: `src/pages/dashboard/pages/DashboardHome.jsx`
- Create: `src/pages/dashboard/shell/DashboardShell.jsx`
- Test: `tests/unit/ProtectedRoute.test.jsx`

**Interfaces:**
- `mountReactApp(el)` / `unmountReactApp()`
- `ProtectedRoute` redirects to `/login` when `!isAuthenticated && !loading`

- [ ] **Step 1: Implement ProtectedRoute**

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../middleware/providers/AuthProvider';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <div className="auth-loading">Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}
```

- [ ] **Step 2: Dashboard shell without DocsGrid/AG Grid**

`DashboardHome.jsx`:

```jsx
import { useAuth } from '../../../middleware/providers/AuthProvider';

export default function DashboardHome() {
  const { user } = useAuth();
  return (
    <div className="dashboard-home p-4">
      <h2>Welcome{user?.username ? `, ${user.username}` : ''}</h2>
      <p>Dashboard shell — grid configuration comes later.</p>
    </div>
  );
}
```

`DashboardShell.jsx` — wrap with `DashboardProvider` and a **Phase-3 layout** that copies header/sidebar structure from `DashboardLayout` but **omits** the lazy `DocsGrid` import. Prefer extracting a prop/`showDocsGrid={false}` on `DashboardLayout` if a one-line change is cleaner; otherwise duplicate minimal chrome in `DashboardShellLayout.jsx` under `shell/`.

Minimal approach (allowed):

```jsx
// DashboardShell.jsx
import { Routes, Route } from 'react-router-dom';
import { DashboardProvider } from '../context/DashboardContext';
import DashboardSidebar from '../layout/DashboardSidebar';
import DashboardHeader from '../layout/DashboardHeader';
import '../layout/DashboardLayout.css';
import DashboardHome from '../pages/DashboardHome';
import ProtectedRoute from '../../../core/router/ProtectedRoute';

export default function DashboardShell() {
  return (
    <ProtectedRoute>
      <DashboardProvider>
        <div className="dashboard-layout">
          <DashboardSidebar />
          <div className="dashboard-main sidebar-open">
            <div className="dashboard-header"><h1>Dashboard</h1></div>
            <div className="dashboard-content">
              <DashboardHeader />
              <Routes>
                <Route index element={<DashboardHome />} />
              </Routes>
            </div>
          </div>
        </div>
      </DashboardProvider>
    </ProtectedRoute>
  );
}
```

If `DashboardSidebar` / context pull heavy broken imports, stub the smallest broken imports until the shell renders (do not stub Auth API).

- [ ] **Step 3: ReactApp + mount**

```jsx
// ReactApp.jsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../middleware/redux/store.js';
import { AuthProvider } from '../middleware/providers/AuthProvider';
import Login from '../pages/auth/pages/Login';
import DashboardShell from '../pages/dashboard/shell/DashboardShell';

export default function ReactApp() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard/*" element={<DashboardShell />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </Provider>
  );
}
```

```js
// mountReactApp.js
import { createRoot } from 'react-dom/client';
import ReactApp from './ReactApp.jsx';

let root = null;

export function mountReactApp(el) {
  if (!el) throw new Error('mount element required');
  if (root) root.unmount();
  root = createRoot(el);
  root.render(<ReactApp />);
}

export function unmountReactApp() {
  if (root) {
    root.unmount();
    root = null;
  }
}
```

Note: `mountReactApp.js` must be `.jsx` if it contains JSX, **or** use `createElement`:

```js
import { createElement } from 'react';
root.render(createElement(ReactApp));
```

Prefer `mountReactApp.jsx` for clarity.

- [ ] **Step 4: Unit-test ProtectedRoute with mocked auth** (happy-dom + `@testing-library/react` if already available; otherwise a shallow test of redirect branch via exporting a pure helper). If RTL is not installed, add:

```bash
npm install -D @testing-library/react @testing-library/jest-dom
```

Or skip RTL and test a tiny `resolveAuthRedirect({ loading, isAuthenticated })` helper extracted from ProtectedRoute.

---

### Task 5: Wire `main.js` hash routing (home HTML vs React)

**Files:**
- Modify: `src/main.js`
- Modify: `src/routing/loadPage.js` (optional: apply page meta when entering React routes)

**Interfaces:**
- `#/` / `#/home` → `unmountReactApp` + `loadPage('home')`
- `#/login` / `#/dashboard` → `mountReactApp(#app)` + apply matching `page.config`

- [ ] **Step 1: Implement router in `main.js`**

```js
import { loadPage } from './routing/loadPage.js';
import { mountReactApp, unmountReactApp } from './app/mountReactApp.jsx';
import { applyDocumentHead } from './shared/documentHead.js';
import loginConfig from './pages/login/page.config.js';
import dashboardConfig from './pages/dashboard/page.config.js';

const appEl = () => document.getElementById('app');

async function routeFromHash() {
  const raw = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
  const id = raw.split('/')[0] || 'home';

  if (id === 'login' || id === 'dashboard') {
    unmountReactApp();
    appEl().innerHTML = '';
    applyDocumentHead(id === 'login' ? loginConfig : dashboardConfig);
    mountReactApp(appEl());
    return;
  }

  unmountReactApp();
  const pageId = ['home', 'editor'].includes(id) ? id : 'home';
  await loadPage(pageId === 'editor' ? 'home' : pageId);
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

Keep existing jquery/bootstrap imports if still required by home HTML.

- [ ] **Step 2: Manual smoke**

Run: `npm run dev`  
- Open `#/` → home HTML  
- Open `#/login` → Login JSX  
- Submit with Tomcat up → expect real API call to `/api/userlogin`  
- Success → `#/dashboard` shell with header/sidebar/body placeholder  

- [ ] **Step 3: Fix Login navigate path**

Ensure Login uses `navigate('/dashboard')` under HashRouter (becomes `#/dashboard`).

---

### Task 6: Playwright e2e (mocked API)

**Files:**
- Create: `tests/e2e/login-dashboard.spec.js`

- [ ] **Step 1: Write e2e with route mock**

```js
import { test, expect } from '@playwright/test';

test('login with mocked API reaches dashboard shell', async ({ page }) => {
  await page.route('**/api/userlogin**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        username: 'tester',
        userId: 'u1',
        cred: 1,
        apikey: 'test-key',
      }),
    });
  });

  await page.goto('/#/login');
  await page.locator('#email').fill('tester@example.com');
  await page.locator('#password').fill('secret');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/dashboard/);
  await expect(page.getByText(/Welcome/i)).toBeVisible();
  await expect(page.locator('.dashboard-layout')).toBeVisible();
});
```

Adjust selectors to match Login.jsx button text (`Sign In` / submit).

- [ ] **Step 2: Run**

Run: `npx playwright test tests/e2e/login-dashboard.spec.js`  
Expected: PASS

- [ ] **Step 3: Run full unit suite**

Run: `npm run test:unit`  
Expected: PASS (existing + new)

---

### Task 7: Move unused / duplicated files to temp (after green)

**Files:**
- Create: `temp/react-paste-unused/README.md` (inventory of what moved and why)
- Move (not delete): unused or duplicated paste artifacts that are not on the live import graph for home / login / dashboard shell

**Rules:**
- Run only after Task 6 passes and manual smoke of `#/login` → `#/dashboard` succeeds.
- Candidates (verify with search that nothing in `src/app`, `src/main.js`, login, dashboard shell, providers, or merged store imports them before moving):
  - Duplicate API/auth paths if any leftover after canonicalization
  - Landing pages not wired in this slice (`src/pages/landing/**`) if unused
  - Heavy dashboard subtrees not mounted by `DashboardShell` (e.g. `reports/`, `config-manager/`, `doc-finder/` if only pulled by deferred DocsGrid) — move only after confirming shell does not import them
  - Orphan `middleware/redux/index.js` duplicate store logic (after it becomes a re-export only, leave the file; move only true dead duplicates)
- Do **not** move: `middleware/providers/*` (canonical), merged `store.js`, `pageMetaSlice`, login/dashboard shell files, `shared/documentHead*`, home HTML/`page.config`, tests in use.
- Keep quarantined files on the feature branch: commit `temp/react-paste-unused/` (including README) so anything can be restored with `git mv` later. Do not add `temp/` to `.gitignore` for this work.

- [ ] **Step 1: Build import inventory**

From repo root, list imports used by entrypoints:

```bash
# manually or via ripgrep: confirm no references from src/app, src/main.js, DashboardShell, Login, AuthProvider, store
```

Document candidates in `temp/react-paste-unused/README.md` before moving.

- [ ] **Step 2: Move candidates**

```bash
mkdir -p temp/react-paste-unused
# example (only after verified unused):
# git mv src/pages/landing temp/react-paste-unused/landing
```

Prefer `git mv` to preserve history.

- [ ] **Step 3: Re-run verification**

Run: `npm run test:unit`  
Run: `npx playwright test tests/e2e/login-dashboard.spec.js`  
Run: `npm run build`  
Expected: all PASS; `#/login` and `#/dashboard` still work.

- [ ] **Step 4: Stop**

Do not delete `temp/`. Phase 4 (AG Grid) may pull some files back from temp later.

---

## Plan self-review

| Spec item | Task |
|-----------|------|
| Restructure API/auth imports | 2 |
| Merge Redux store | 3 |
| Vite React + ES2019 target + `/api` proxy | 1 |
| Login real API | 2, 5 (AuthProvider.userLogin unchanged) |
| Dashboard shell header/footer/body | 4 (no DocsGrid/AG Grid) |
| ProtectedRoute | 4 |
| Home HTML preserved | 5 |
| Tests | 2, 3, 6 |
| Unused/duplicate → temp | 7 |
| AG Grid Phase 4 | Explicitly omitted |

---

## Execution handoff

After this plan is accepted, implement on `feat/spa-page-meta-branding` (or a new branch) using **inline** or **subagent-driven** execution.
