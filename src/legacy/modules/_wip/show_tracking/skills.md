---
title: ShowTracking — ModuleSystem + data-track-code
description: Track panel (trackDialog), dual legacy attrs vs data-track-code, support_data.json
---

# ShowTracking

## Entry

- Module: `src/modules/show_tracking/`
- Register: `context.js` → `ContextHelpers.registerOnReady('trackDialogModule', …)`
- Alias: `window.trackDialog`
- Support JSON: `supportingFiles` → `window.TP_SUPPORT_CONFIG` / `TRACK_DATA`
- Legacy: `src/js/dialogModules/ShowTracking_Module.js` (gulp-excluded after cutover)

## Integration matrix (IsSplTrack → data-track-code)

| Key | Legacy attr | `new_tracking_code` | Status | Writers |
|-----|-------------|---------------------|--------|---------|
| IsLink | `data-link` | `link-01`…`04` | **Partial** (dual-write) | hyperlink_module |
| IsStyle | `data-style` | `style-01` | Dual-write | apply_style |
| IsHeadStyle | `data-head-level` | `head-style-01` | Dual-write | apply_style |
| IsListStyle | `data-list-style` | `list-style-01` | Dual-write | ParaMergeSplit_LIST |
| IsSplit | `data-split-child` | `para-split-01` | Dual-write | ParaMergeSplit / ckeditor |
| IsInsertPara | `data-insert-para` | `para-insert-01` | Dual-write | ParaMergeSplit / ckeditor |
| IsMerge | `data-para-merge` | `para-merge-01` | Dual-write | ParaMergeSplit / PlaceHolder |
| IsCellAlign | `data-cell-action` | `cell-align-01` | Dual-write | tables/context |
| IsReplaceText | `data-group-action` | `replace-text-01` / `replace-text-wsc` | Dual-write | commonEvtHandler / WebSpellCheck |

**Fully integrated** = code stamp + JSON + no legacy attr required for discovery/accept. **None of the nine are fully done yet**; dual-write is the current target.

Already on code-only path (other features): notes, figs/tabs, refs, cite-text, query/comment, annotate, PI, suppmat, author_dialog, ref-sort.

## Flow

`TrackFindQuery` matches legacy selectors **and** `[data-track-code]`. Row render: if `data-track-code` maps in `new_tracking_code`, use that hint; else IsSplTrack / `existing_config_msg`.

`OptionsListOpt4` remains in the Show Revision dropdown markup for compatibility, but it is hidden
by default with `ds-none`. Do not remove the option unless all legacy selectors and tests that expect
the id are updated.

Inserted comment/query markers are represented by the inner `[data-class="ckcommentsfull"]` row.
When an `insert` or `del` wrapper only contains that marker, skip the wrapper row even if the wrapper
and child have different `data-track-code` values. Keep normal inserted/deleted text rows when the
wrapper contains real text plus a comment marker.

## Codes helper

Use [`support/trackCodes.js`](./support/trackCodes.js) constants when stamping producers. Do not invent ad-hoc code strings.

## Accept/reject

Handlers still key off legacy attrs for merge/split/cell/group. Keep dual-write until a dedicated accept/reject pass removes legacy reads.
