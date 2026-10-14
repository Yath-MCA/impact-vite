# Reject on ice-del — unwrap text + `deleted-content`

## Requirement

On **Reject** of an ice-del:

1. Stamp Rejected action attrs on `<del>`.
2. Store plain text in `deleted-content` and backup `data-content` (entity-encoded via `setAttribute`). Helper is idempotent — will not overwrite a stored value with empty text.
3. Empty the `<del>`; remove `ice-del` / `ice-cts-*` / `data-cid` so ice does not unwrap it.
4. Place the same text as the **next sibling** of that `<del>`.

### After

```html
<div class="aff" id="AF0001"><del data-action="Rejected" deleted-content="Soyoun" data-content="Soyoun" …></del>Soyoun Han, …</div>
```

## Code

| Location | Role |
|----------|------|
| `src/js/commonfn.js` → `applyRejectDelUnwrapContent` / encode helpers | Runtime |
| `tests/unit/show_tracking/trackAttrEscape.js` | Unit-test mirror only |
| `src/js/dialogModules/ShowTracking_Module.js` | Calls helper on Reject-del; skips stash+unwrap |

## Verify

Unit (helper DOM only — not live Reject):

```bash
npx vitest run --config tests/unit/show_tracking/vitest.show_tracking.config.mjs
```

Manual (required acceptance):

1. Gulp + hard-refresh article.
2. Show Tracking → Reject ice-del (e.g. "Soyoun" in aff).
3. Inspect `#AF0001`: `<del … deleted-content="Soyoun">` immediately before `Soyoun Han…`.
4. Close and reopen Review Changes — entry still listed; pill shows `Soyoun`.
