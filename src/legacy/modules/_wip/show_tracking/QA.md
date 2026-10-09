# ShowTracking — manual smoke (dual-write)

After ModuleSystem cutover (`src/modules/show_tracking/`).

1. **Register / open**
   - Editor or Track View: `window.trackDialog` exists after `ensureTrackDialogReady()` / boot.
   - One `#trackDialogModule` DOM; Review Changes panel opens without duplicate.

2. **Support JSON**
   - `window.TP_SUPPORT_CONFIG.new_tracking_code` includes `style-01`, `para-split-01`, `link-01`, etc.

3. **Dual-write actions** (perform each, open Track panel, confirm one row + hint from `new_tracking_code` when code present; accept/reject still works via legacy attrs):
   - Body/para style → `data-style` + `data-track-code=style-01`
   - Heading level → `data-head-level` + `head-style-01`
   - List style → `data-list-style` + `list-style-01`
   - Split para → `data-split-child` + `para-split-01`
   - Insert para → `data-insert-para` + `para-insert-01`
   - Merge para → `data-para-merge` + `para-merge-01`
   - Cell align → `data-cell-action` + `cell-align-01`
   - Replace text / WSC → `data-group-action` + `replace-text-01` / `replace-text-wsc`
   - Hyperlink → `data-link` + `link-01`…`04` (code path preferred for hint)

4. **Unit**
   - `npx vitest run tests/unit/show_tracking/trackCodes.test.js`
