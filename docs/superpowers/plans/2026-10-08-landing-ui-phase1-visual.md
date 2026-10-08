# LandingUI Phase 1 Visual Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the thin post-validate landing stub with a paste-derived visual LandingUI (logos, theme, cover, copy) while keeping shared maintenance and stubbing Accept/session/PLOS/download.

**Architecture:** Keep `#/validateurl` → auto `showLanding` flow. Overwrite `src/pages/landing/LandingUI.jsx` with adapted paste UI (`tw:` + `react-icons`). Copy branding helpers beside it; add minimal `landing-meta.json` (no source file found on disk). Finish DRY move of `maintenanceGuard` to `src/shared/`. Defer session/PLOS/download to later phases.

**Tech Stack:** React 19, Vite 8, Tailwind v4 (`tw:`), react-icons, SweetAlert2, Vitest, Playwright.

## Global Constraints

- Spec: [docs/superpowers/specs/2026-10-08-landing-ui-phase1-visual-design.md](../specs/2026-10-08-landing-ui-phase1-visual-design.md)
- Phase 1 only — no `useLandingSessionFlow`, no PLOS panel, no download service, no `lucide-react`
- Accept/Continue button visible but **disabled**
- Maintenance: only [`src/shared/maintenanceGuard.js`](../../src/shared/maintenanceGuard.js)
- Keep `data-testid="landing-shell"` on LandingUI root
- Do not commit `temp/react-paste-unused/**`
- Source reference: `temp/react-paste-unused/landing/`

---

## File map

| Path | Action |
|------|--------|
| `src/shared/maintenanceGuard.js` | Ensure live (finish move from landing) |
| `src/pages/landing/maintenanceGuard.js` | Deleted (already) |
| `src/shared/utils/sanitizeHtml.js` | Create |
| `src/pages/landing/config/landing-meta.json` | Create minimal |
| `src/pages/landing/landingLogos.js` | Port |
| `src/pages/landing/landingTheme.js` | Port + `tw:` nav classes |
| `src/pages/landing/landingCopy.js` | Port |
| `src/pages/landing/landingDocumentInfo.js` | Port (no `devLog` dep — use `console` only in DEV or omit) |
| `src/pages/landing/landingAccess.js` | Port `isPlosClient` (+ keep other exports for Phase 2/3) |
| `src/pages/landing/landingConfigService.js` | Port |
| `src/pages/landing/LandingUI.jsx` | Replace thin stub |
| `src/app.css` or Tailwind theme | Add client theme color CSS vars / `@theme` tokens as needed |
| `tests/unit/sanitizeHtml.test.js` | Create |
| `tests/unit/landingLogos.test.js` | Create |
| `tests/unit/landingDocumentInfo.test.js` | Create |
| `tests/unit/maintenanceGuard.test.js` | Point at shared |
| `tests/e2e/validate-url.spec.js` | Assert visual chrome |

---

### Task 1: Finish shared `maintenanceGuard` DRY move

**Files:**
- Ensure: `src/shared/maintenanceGuard.js` (correct imports)
- Delete: `src/pages/landing/maintenanceGuard.js` (if still present)
- Modify: `src/pages/landing/LandingUI.jsx` import (temporary stub import is fine until Task 5)
- Modify: `tests/unit/maintenanceGuard.test.js` → import from `../../src/shared/maintenanceGuard.js`

**Interfaces:**
- Produces: `initMaintenance`, `fireMaintenanceAlert`, `parseEpoch`, `resetMaintenanceState`, `END_TIMER_MINUTES` from `src/shared/maintenanceGuard.js`
- Consumes: `../middleware/providers/apiService`, `../pages/landing/messages/index.js`

- [ ] **Step 1: Verify shared module imports**

`src/shared/maintenanceGuard.js` must start with:

```js
import Swal from 'sweetalert2';
import { apiService, API_ENDPOINTS } from '../middleware/providers/apiService';
import {
  getLandingMessage,
  LandingMessageKey,
} from '../pages/landing/messages/index.js';
```

If file is missing, restore from last good `pages/landing/maintenanceGuard.js` content with paths above.

- [ ] **Step 2: Point unit test at shared**

In `tests/unit/maintenanceGuard.test.js` change import to:

```js
} from '../../src/shared/maintenanceGuard.js';
```

- [ ] **Step 3: Run unit tests**

Run: `npm run test:unit -- tests/unit/maintenanceGuard.test.js`

Expected: PASS

- [ ] **Step 4: Stage delete + shared + test; commit**

```bash
git add src/shared/maintenanceGuard.js src/pages/landing/maintenanceGuard.js tests/unit/maintenanceGuard.test.js
git commit -m "refactor: move maintenanceGuard to src/shared for landing and editor"
```

(If LandingUI still imports `./maintenanceGuard.js`, update that import in this commit too so the tree builds.)

---

### Task 2: `sanitizeHtml` util

**Files:**
- Create: `src/shared/utils/sanitizeHtml.js`
- Create: `tests/unit/sanitizeHtml.test.js`

**Interfaces:**
- Produces: `sanitizeHtml(dirty: string) => string`

- [ ] **Step 1: Write failing test**

```js
import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../../src/shared/utils/sanitizeHtml.js';

describe('sanitizeHtml', () => {
  it('strips script tags and event handlers', () => {
    const out = sanitizeHtml('<p onclick="alert(1)">Hi</p><script>x()</script>');
    expect(out).toContain('Hi');
    expect(out).not.toMatch(/script/i);
    expect(out).not.toMatch(/onclick/i);
  });

  it('returns empty string for non-strings', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test:unit -- tests/unit/sanitizeHtml.test.js`

- [ ] **Step 3: Implement**

```js
/**
 * Lightweight HTML sanitizer for landing welcome text.
 * Strips script/style tags and on* attributes. Not a full XSS suite.
 */
export function sanitizeHtml(dirty) {
  if (dirty == null || typeof dirty !== 'string') return '';
  let html = dirty;
  html = html.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/javascript:/gi, '');
  return html;
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/sanitizeHtml.js tests/unit/sanitizeHtml.test.js
git commit -m "feat: add lightweight sanitizeHtml for landing welcome copy"
```

---

### Task 3: Branding helpers + minimal `landing-meta.json`

**Files:**
- Create: `src/pages/landing/config/landing-meta.json`
- Create: `src/pages/landing/landingLogos.js`
- Create: `src/pages/landing/landingTheme.js`
- Create: `src/pages/landing/landingCopy.js`
- Create: `src/pages/landing/landingDocumentInfo.js`
- Create: `src/pages/landing/landingAccess.js`
- Create: `src/pages/landing/landingConfigService.js`
- Create: `tests/unit/landingLogos.test.js`
- Create: `tests/unit/landingDocumentInfo.test.js`

**Interfaces:**
- `pickLogoSlot(logoConfig, slot, dtd)`, `resolveLogoSrc(name)`, `DEFAULT_IMPACT_LOGO_SRC`
- `getLandingNavTheme(theme) => { theme, isDarkNav, navClass, linkClass, themeColor }`
- `getClientCopy(clientName)`
- `buildCoverImageUrl(coverName, clientName, bucketUrl)`, `getPublicationTitleLabel(docData)`
- `isPlosClient(clientName)`
- `resolveLandingConfigOverride(clientKey, branding) => Promise<{ config }>`

- [ ] **Step 1: Write failing helper tests**

`tests/unit/landingLogos.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IMPACT_LOGO_SRC,
  pickLogoSlot,
  resolveLogoSrc,
} from '../../src/pages/landing/landingLogos.js';

describe('landingLogos', () => {
  it('resolves bare filename under clients folder', () => {
    expect(resolveLogoSrc('PLOS_WHITE.svg')).toBe('/assets/logo/clients/PLOS_WHITE.svg');
    expect(resolveLogoSrc(null)).toBe(DEFAULT_IMPACT_LOGO_SRC);
  });

  it('prefers journal slot for jats dtd', () => {
    const cfg = {
      'header-logo': { name: 'TNF.svg' },
      'journal-header-logo': { name: 'TNF_JORUNAL.svg' },
    };
    expect(pickLogoSlot(cfg, 'header-logo', 'jats').name).toBe('TNF_JORUNAL.svg');
    expect(pickLogoSlot(cfg, 'header-logo', 'book').name).toBe('TNF.svg');
  });
});
```

`tests/unit/landingDocumentInfo.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  buildCoverImageUrl,
  getPublicationTitleLabel,
} from '../../src/pages/landing/landingDocumentInfo.js';

describe('landingDocumentInfo', () => {
  it('builds cover url', () => {
    expect(buildCoverImageUrl('c1', 'plos', 'http://bucket/')).toBe(
      'http://bucket/_SUPPORT_FILES/PLOS/cover/c1.png'
    );
  });

  it('labels journal vs book', () => {
    expect(getPublicationTitleLabel({ dtd: 'jats' })).toMatch(/journal/i);
    expect(getPublicationTitleLabel({ dtd: 'book' })).toMatch(/book/i);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test:unit -- tests/unit/landingLogos.test.js tests/unit/landingDocumentInfo.test.js`

- [ ] **Step 3: Create minimal `landing-meta.json`**

No `landing-meta.json` was found under `C:\_IMPACT`. Author `src/pages/landing/config/landing-meta.json` with at least:

```json
{
  "logo": {
    "default": {
      "theme": "primary",
      "header-logo": { "name": "/assets/logo/IMPACT_5_4.svg", "alt": "IMPACT", "width": 120, "height": 40 },
      "footer-logo": { "name": "/assets/logo/IMPACT_5_4.svg", "alt": "IMPACT", "width": 100, "height": 32 },
      "favicon": { "name": "/assets/logo/favicon.ico" }
    },
    "plos": {
      "theme": "plos",
      "header-logo": { "name": "PLOS_WHITE.svg", "alt": "PLOS", "width": 120, "height": 40 },
      "footer-logo": { "name": "PLOS_COLOR_BOTTOM.svg", "alt": "PLOS", "width": 100, "height": 32 },
      "favicon": { "name": "PLOS_FAVICON.png" }
    },
    "lww": {
      "theme": "lww",
      "header-logo": { "name": "LWW.svg", "alt": "LWW", "width": 120, "height": 40 },
      "footer-logo": { "name": "LWW_WHITE_BOTTOM.svg", "alt": "LWW", "width": 100, "height": 32 },
      "favicon": { "name": "LWW_FAVICON.svg" }
    },
    "oup": {
      "theme": "oxford",
      "header-logo": { "name": "OUP_WHITE.svg", "alt": "OUP", "width": 120, "height": 40 },
      "footer-logo": { "name": "OUP_BLUE.svg", "alt": "OUP", "width": 100, "height": 32 },
      "favicon": { "name": "OUP_FAVICON.svg" }
    }
  },
  "copy": {
    "common": {
      "disclaimer": "By continuing you agree to use IMPACT for proofing collaboration as instructed by your publisher."
    },
    "clients": {
      "default": {
        "welcome": "",
        "subtitle": "The online proofing tool for collaborating on journal content",
        "title": "Instructions",
        "instructions": [
          "Review the proof carefully for accuracy.",
          "Use the tools provided to mark corrections.",
          "Submit your changes when complete."
        ],
        "supportEmail": "impact.helpdesk@newgen.co"
      }
    }
  }
}
```

Add more clients from `public/assets/logo/clients` as time allows (nihr, brill, medknow, tnf, acs, oho) using the same shape.

- [ ] **Step 4: Port helper modules**

Copy from paste with these import path fixes:

- `landingLogos.js` — same as paste (`LOGO_PUBLIC_BASE = '/assets/logo/clients'`).
- `landingTheme.js` — rewrite `navClass` / `linkClass` strings to use `tw:` prefixes, e.g. `tw:bg-white tw:text-slate-700`. For dark themes use inline `style={{ backgroundColor: themeColor }}` on nav if custom `oxford-900` utilities are not yet in `@theme`.
- `landingCopy.js` — `import landingMeta from './config/landing-meta.json'`.
- `landingDocumentInfo.js` — remove `devLog` import; no-op or omit logs.
- `landingAccess.js` — port full file from paste.
- `landingConfigService.js` — port from `temp/react-paste-unused/landing/landingConfigService.js`; keep axios override fetch optional.

- [ ] **Step 5: Run helper unit tests — expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/pages/landing/config/landing-meta.json src/pages/landing/landingLogos.js src/pages/landing/landingTheme.js src/pages/landing/landingCopy.js src/pages/landing/landingDocumentInfo.js src/pages/landing/landingAccess.js src/pages/landing/landingConfigService.js tests/unit/landingLogos.test.js tests/unit/landingDocumentInfo.test.js
git commit -m "feat(landing): add branding helpers and minimal landing-meta"
```

---

### Task 4: Theme color tokens for banners

**Files:**
- Modify: the app’s Tailwind/CSS entry that defines `@theme` (likely `src/app.css` or similar — locate with grep for `--color-primary`)

**Interfaces:**
- CSS variables or `@theme` colors: `oxford`, `plos`, `lww`, `medknow`, `nihr`, `brill`, `tnf`, `acs`, `oho` matching `THEME_COLOR_HEX` in `landingTheme.js`

- [ ] **Step 1: Locate theme file**

Run: `rg -n "@theme|--color-primary" src --glob "*.css"`

- [ ] **Step 2: Add theme colors**

Add entries mirroring `THEME_COLOR_HEX` so banner utilities like `tw:from-plos-600` work, **or** (simpler Phase 1 fallback) skip named utilities and have LandingUI use:

```js
style={{ background: `linear-gradient(90deg, ${themeColor}, ${themeColor})` }}
```

for the welcome banner. Prefer the inline gradient approach if `@theme` expansion is large — document which path you took in the commit message.

- [ ] **Step 3: Commit if CSS changed**

```bash
git add src/app.css   # or actual file touched
git commit -m "style: support landing client theme banner colors"
```

If using inline-only and no CSS change, skip this commit.

---

### Task 5: Replace `LandingUI.jsx` with visual Phase 1 UI

**Files:**
- Modify: `src/pages/landing/LandingUI.jsx`
- Reference: `temp/react-paste-unused/landing/pages/LandingUI.jsx`

**Interfaces:**
- Props: `LandingUI({ docData })` — accept optional paste props for forward-compat but ignore session ones
- On mount: `initMaintenance({ init: true })` then `fireMaintenanceAlert()`
- Root: `data-testid="landing-shell"`

- [ ] **Step 1: Implement visual LandingUI**

Structure (adapt paste; do not import session/download/plos):

```jsx
import { useEffect, useMemo, useState } from 'react';
import { FiFileText, FiHelpCircle, FiBookOpen, FiMonitor, FiUsers } from 'react-icons/fi';
import metaConfig from './config/landing-meta.json';
import { isPlosClient } from './landingAccess.js';
import { sanitizeHtml } from '../../shared/utils/sanitizeHtml.js';
import { resolveLandingConfigOverride } from './landingConfigService.js';
import { buildCoverImageUrl, getPublicationTitleLabel } from './landingDocumentInfo.js';
import { getLandingNavTheme } from './landingTheme.js';
import { getClientCopy } from './landingCopy.js';
import {
  DEFAULT_IMPACT_LOGO_SRC,
  pickLogoSlot,
  resolveFaviconHref,
  resolveLogoSrc,
} from './landingLogos.js';
import { fireMaintenanceAlert, initMaintenance } from '../../shared/maintenanceGuard.js';

// Port getClientLandingConfig + applyLandingConfigOverride from paste LandingUI.jsx
// Port LogoComponent with DEFAULT_IMPACT_LOGO_SRC fallback

export default function LandingUI({ docData }) {
  // maintenance effect (from current thin shell)
  // configOverride effect via resolveLandingConfigOverride
  // favicon + document.title effects from paste
  // Build metaInfo, banner, navTheme, coverImageUrl, safeWelcomeHtml
  // Render: nav + welcome banner + instructions + disclaimer + DISABLED agree button
  // + right column cover/browser compatibility from paste
  // Do NOT lazy-load PlosAuthPanel
  // FAQ/Guide: href={metaInfo.faqUrl} only — no onClick download intercept
  // Agree button: disabled, label "AGREE & CONTINUE"
}
```

Rewrite all classNames to `tw:` forms used elsewhere in the repo (`tw:min-h-screen`, `tw:flex`, `tw:bg-primary`, …). Drop `dark:` variants unless already used on landing pages.

Keep browser-compatibility info block from paste (static `BROWSER_COMPATIBILITY` object).

- [ ] **Step 2: Smoke unit suite**

Run: `npm run test:unit`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/landing/LandingUI.jsx
git commit -m "feat(landing): replace thin shell with Phase 1 visual LandingUI"
```

---

### Task 6: E2E + build verification

**Files:**
- Modify: `tests/e2e/validate-url.spec.js`

- [ ] **Step 1: Update success e2e**

Ensure valid-key test still finds `landing-shell` and document title heading. Add assertion for instructions or “AGREE & CONTINUE” disabled button:

```js
await expect(page.getByTestId('landing-shell')).toBeVisible({ timeout: 15000 });
await expect(page.getByRole('heading', { name: /sample proof|instructions|welcome/i }).first()).toBeVisible();
await expect(page.getByRole('button', { name: /agree & continue/i })).toBeDisabled();
```

Keep invalid / expired / maintenance toast tests.

- [ ] **Step 2: Run e2e**

Run: `npx playwright test tests/e2e/validate-url.spec.js`

Expected: all PASS

- [ ] **Step 3: Build**

Run: `npm run build`

Expected: success

- [ ] **Step 4: Commit e2e updates**

```bash
git add tests/e2e/validate-url.spec.js
git commit -m "test(e2e): assert Phase 1 visual landing chrome and disabled accept"
```

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| Shared maintenanceGuard DRY | Task 1 |
| sanitizeHtml | Task 2 |
| Branding helpers + landing-meta | Task 3 |
| Theme colors | Task 4 |
| Visual LandingUI replace | Task 5 |
| CTA disabled / no PLOS/download | Task 5 |
| E2E + build | Task 6 |
| Phase 2/3 deferred | Not tasked |

**Placeholder scan:** none.  
**Consistency:** `data-testid="landing-shell"`, shared guard import path, disabled Agree button aligned across tasks.
