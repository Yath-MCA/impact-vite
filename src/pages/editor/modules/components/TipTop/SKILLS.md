---
name: tiptap-manager
description: Work on TiptapManager.js, the vanilla-JS Tiptap rich-text manager for dialog inputs/textareas, including its tiptap-track-changes integration and the bridge to CKEditor 4 + ICE (lite) markup. Use when adding features, fixing bugs, writing tests, or wiring the manager into a dialog.
---

# tiptap-manager

Instructions for an AI coding agent working on `TiptapManager.js`. Read `README.md` for usage, `DEV.md` for
internals and `QA.md` for acceptance checks before changing behaviour.

## Context

- The main editor is CKEditor 4 with the ICE lite plugin. Tracked changes there look like
  `<del class="ice-del ice-cts-11" data-cid="2" …>` and `<insert class="ice-ins ice-cts-11" data-cid="3" …>`.
- Dialog fields use Tiptap with `tiptap-track-changes`. The manager converts ICE markup to Tiptap marks on load
  and back to ICE markup on read.
- The class is a plain script (no bundler, no ES module). Tiptap pieces arrive through `window.TiptapDeps`.
- It mirrors `SummernoteManager.js`: owner hooks, `buildConfig`, IMPACT tag map, paste filter, debug helpers.

## Invariants (do not break)

1. **Round-trip stability.** Loading ICE markup and reading it back without edits returns the same string
   (same attributes, same order). Test with the fixture in `QA.md` section 5.
2. **Loads are never tracked.** Anything that loads content (`setContent`, `field.value =`, initial value) runs
   through `_loadIntoEditor`: bypass on, edit mode, restore the previous mode.
3. **ICE metadata lives in `inst.ice.meta`**, keyed by `` `${changeId}|ins` `` or `` `${changeId}|del` ``. Never key by
   `changeId` alone: ICE gives each half of a replacement its own cid.
4. **New cids come from `_nextCid`.** Never invent them elsewhere, and never advance them on export of an
   already-known change.
5. **Foreign `data-format-id` is stripped on ingest.** Ids belong to the manager's own cache.
6. **Drop-in field.** `field.value` (get/set), `field.focus()` and the bubbling `input` event must keep
   working. `detach` must delete the overrides.
7. **No global state across fields.** Per-field data goes on `inst`, not on the manager.
8. **Errors never escape.** Public methods catch, call `logError`, and return a safe value.

## Verified vs unverified facts

Verified from the `tiptap-track-changes` README and docs:

- Commands: `setSuggestMode`, `setEditMode`, `setViewMode`, `setTrackChangesMode(mode)`,
  `setTrackChangesAuthor`, `acceptChange(id)`, `rejectChange(id)`, `acceptAll`, `rejectAll`.
- Helpers: `getTrackedChanges`, `getGroupedChanges`, `getPendingChangeCount`, `getBaseText`, `getResultText`.
- Marks render as `<ins>` and `<del>` with `data-change-id`, `data-author-id`, `data-author-name`; replacements
  share one changeId.

Not confirmed. Do not present these as facts, and check them when a task touches them:

- Whether the marks parse `data-author-color` and `data-timestamp` from HTML.
- How the `formatChange` mark serialises beyond being a `span`.
- Whether paste (`insertContent`) is recorded as a tracked insertion in suggest mode.
- Whether `timestamp` is a string or a number, and seconds or ms.

## Workflow

1. Reproduce with the smallest HTML input. The conversion layer (`_ingest`, `restoreFromEditor`,
   `editorToIce`) can be tested in jsdom without Tiptap; see `DEV.md`.
2. Change one layer at a time: ingest, restore, ICE export, tracking, toolbar.
3. After any change to conversion code, re-run the round-trip check and the "new change" check (fresh cid,
   user from `ice.user`).
4. Run `node --check TiptapManager.js`.
5. Update `README.md` (usage), `DEV.md` (internals) and `QA.md` (new or changed cases) in the same change.

## Recipes

### New IMPACT inline tag

`TAG_MAP` entry, `DEFAULT_RESTORE` entry, add the mark name to `_formatIdExtension`'s `types`, load the Tiptap
mark through `TiptapDeps` or `cfg.extensions`, add a `BUTTONS` entry if it needs a toolbar button.

### Different ICE element names or classes

Config only: `buildConfig({ ice: { insTag, delTag, insClass, delClass, ctsPrefix } })`. No code change.

### New content view

Handle it in `getContent`. Keep `marked` untouched, because `isDirty` and the baseline depend on it.

### New owner hook or event

Add the name to `_emit`, call the per-field callback first and the owner hook second, wrap in try/catch, and
document it in `README.md`.

## Style

- Match the existing code: 4-space indent, semicolons, `this.logError(context, err)` in every catch.
- Keep comments to non-obvious reasons (why a cache is keyed a certain way, why a mode switch is needed).
- Do not add dependencies. Everything Tiptap-related comes in through `window.TiptapDeps`.

## Do not

- Do not write `innerHTML` into a CKEditor 4 + ICE document behind its back; go through the CKEditor API.
- Do not claim the ICE output was accepted by CKEditor lite without running `QA.md` TC-56.
- Do not change the ICE attribute order on export (`class`, `data-cid`, `data-userid`, `data-rolename`,
  `data-username`, `data-changedata`, `data-time`, `data-last-change-time`).
- Do not silently drop content on failure; return the input HTML and log.

## Definition of done

- Syntax check passes.
- Round-trip fixture is byte-identical after load and read.
- New behaviour has a QA case with an ID.
- Docs updated. Unverified assumptions are stated as unverified.
