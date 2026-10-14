# LoadingConfig-critical assets pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pack lang JS and client logos so LoadingConfig fetches no longer get Vite SPA HTML fallback.

**Architecture:** Extend `scripts/pack-editor-assets.js` to copy `src/legacy/js/lang/*.js` → `public/assets/{VERSION}/config/lang/` and `src/legacy/static/images/client_logo/*` → `public/assets/images/client_logo/`. Keep existing books/journals copy. No boot-order changes.

**Tech Stack:** Node fs/path, existing `resolveEditorVersion`, Vite `public/` static serve.

**Spec:** [`docs/superpowers/specs/2026-10-14-loadingconfig-critical-assets-pack-design.md`](../specs/2026-10-14-loadingconfig-critical-assets-pack-design.md)

## Global Constraints

- Do not change HashRouter, `applyLegacyGlobals`, or `_initial*` load order
- Do not pack meta/modules/css/specific/templates in this slice
- Overwrite destination lang and logo dirs on each pack run

---

### Task 1: Pack lang + client logos

**Files:**
- Modify: `scripts/pack-editor-assets.js`
- Test: smoke via `node scripts/pack-editor-assets.js` + path existence checks

**Interfaces:**
- Consumes: `readEditorVersionFromRepo(root)`, existing `copyClientconfigTree`
- Produces: `public/assets/{VERSION}/config/lang/en.js`, `public/assets/images/client_logo/*`

- [ ] **Step 1: Add helpers to copy a flat/recursive file tree (all files)**

In `scripts/pack-editor-assets.js`, after `copyClientconfigTree`, add:

```js
function copyDirAllFiles(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.error(`[pack-editor-assets] missing ${srcDir}`);
    process.exit(1);
  }
  if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
  let copied = 0;
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      const rel = path.relative(srcDir, abs).split(path.sep).join('/');
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      const out = path.join(destDir, ...rel.split('/'));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(abs, out);
      copied += 1;
    }
  }
  walk(srcDir);
  return copied;
}
```

- [ ] **Step 2: Call pack for lang and logos after books/journals**

```js
  const langSrc = path.join(legacyRoot, 'js', 'lang');
  const langOut = path.join(configDir, 'lang');
  const langCount = copyDirAllFiles(langSrc, langOut);
  console.log(
    `[pack-editor-assets] lang=${langCount} → ${path.relative(root, langOut)}`
  );

  const logoSrc = path.join(legacyRoot, 'static', 'images', 'client_logo');
  const logoOut = path.join(root, 'public', 'assets', 'images', 'client_logo');
  const logoCount = copyDirAllFiles(logoSrc, logoOut);
  console.log(
    `[pack-editor-assets] logos=${logoCount} → ${path.relative(root, logoOut)}`
  );
```

- [ ] **Step 3: Run pack and verify**

Run: `node scripts/pack-editor-assets.js`

Expected log lines include `lang=` ≥ 2 and `logos=` ≥ 1.

Then verify files exist:

```powershell
Test-Path public/assets/0.0.0/config/lang/en.js
Test-Path public/assets/images/client_logo/OUP_FAVICON.svg
```

Expected: both `True`. Spot-check `en.js` first bytes are not `<!DOCTYPE` / `<html`.

- [ ] **Step 4: Commit**

```bash
git add scripts/pack-editor-assets.js docs/superpowers/plans/2026-10-14-loadingconfig-critical-assets-pack.md
git commit -m "feat(editor): pack lang and client logos for LoadingConfig"
```
