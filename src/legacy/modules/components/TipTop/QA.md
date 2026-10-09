# TiptapManager: QA plan

## Scope

Dialog rich-text editing (`TiptapManager.js`) and the ICE bridge to CKEditor 4 + lite.

## Setup

- Page with the CDN module script (`window.TiptapDeps`) and `TiptapManager.js`.
- A dialog with a `<textarea>` and an `<input type="text">`, both attached.
- A CKEditor 4 + lite test document to receive the output.
- Browsers: latest Chrome, Edge, Firefox; Safari if supported by your users.

Status per case: Pass / Fail / Blocked. Cases marked **(verify)** cover behaviour that could not be confirmed
from documentation and must be checked against the real build.

## 1. Attach and sync

| ID | Steps | Expected |
|----|-------|----------|
| TC-01 | Attach to a textarea with `<em class="italic" data-name="italic">x</em>` | Editor shows italic x; original textarea hidden; toolbar visible. |
| TC-02 | Type text | Hidden field value updates; an `input` event bubbles on the field. |
| TC-03 | Set `field.value = '<strong>a</strong>'` from code | Editor updates; no tracked change is created, even in suggest mode. |
| TC-04 | `$(field).val('<sup>2</sup>')` | Same as TC-03. |
| TC-05 | Call `field.focus()` | Focus lands in the editor. |
| TC-06 | Attach to an `<input type="text">` | Works like TC-01..05. |
| TC-07 | `attach` the same field twice | Returns the existing instance; no second toolbar. |
| TC-08 | `detach(field)` | Editor and toolbar removed; field visible again; `field.value` and `focus` behave natively. |
| TC-09 | `attachAll(dialog, '[data-tiptap]')` with 3 fields | Three independent editors, independent content and tracking state. |

## 2. Formatting and IMPACT tags

| ID | Steps | Expected |
|----|-------|----------|
| TC-10 | Bold via toolbar, read `getContent` | `<strong class="bold" data-name="bold">…</strong>`. |
| TC-11 | Italic, underline, sub, sup via toolbar | Default class and `data-name` attributes per `DEFAULT_RESTORE`. |
| TC-12 | Load `<em class="x" data-name="y">t</em>`, do not touch, read | Attributes preserved exactly. |
| TC-13 | Load content with Summernote `data-format-id` values | Ids ignored; output uses IMPACT defaults; no wrong attributes from collisions. |
| TC-14 | Load `<cite>x</cite>` | Rendered as italic; restored as `em`/`cite` per cache. |
| TC-15 | Press Enter with `singleLine: true` | Nothing happens; no `<p>` or `<br>` in output. |
| TC-16 | Press Esc, `blockEscape` false / true | Esc reaches the dialog / is swallowed. |
| TC-17 | Load `<span class="q">text</span>` | Span removed, text kept. |

## 3. Paste

| ID | Steps | Expected |
|----|-------|----------|
| TC-20 | Paste rich HTML from Word | `PasteFilter` output inserted; no `<br>`; formatting mapped to editor tags. |
| TC-21 | Paste plain text containing `<b>` characters | Shown literally, not interpreted. |
| TC-22 | Paste in edit mode | Content inserted, `onPaste` fired. |
| TC-24 | Paste in suggest mode **(verify)** | Inserted text is recorded as a tracked insertion. If not, log a defect: paste bypasses tracking. |

## 4. Track changes

| ID | Steps | Expected |
|----|-------|----------|
| TC-30 | Suggest mode: type a word; inspect `getContent(view:'marked')` **(verify)** | `<ins data-change-id …>`; check whether `data-author-color` / `data-timestamp` survive a load; note the result. |
| TC-31 | Suggest mode: select and delete text | Text stays, wrapped in `<del>`. |
| TC-32 | Suggest mode: select and type over it | One `del` + one `ins` with the same changeId. |
| TC-33 | Toggle formatting in suggest mode | Format applies; `formatChange` marker present in `marked`; absent in `ice`. |
| TC-34 | Toolbar Track button | Toggles mode; active state and border reflect it. |
| TC-35 | Accept all / Reject all buttons | Disabled with 0 pending; enabled otherwise; results match `result` / `base` views. |
| TC-36 | `accept(id)` / `reject(id)` on a single change | Only that change resolves; `onTrackStatus` fires. |
| TC-37 | `getPendingCount`, `getChanges`, `getGroupedChanges` | Counts match what is visible. |
| TC-38 | Undo / redo of tracked edits | State returns correctly; no orphaned marks. |
| TC-39 | `setContent` while in suggest mode | Loaded without tracked changes; mode restored to suggest afterwards. |

## 5. ICE bridge

Use this fixture (from the main editor):

```html
<del class="ice-del ice-cts-11" data-cid="2" data-userid="11" data-rolename="Author" data-username="abcd@xyz.co" data-changedata="" data-time="1790665362732" data-last-change-time="1790665362732">Old text</del><insert class="ice-ins ice-cts-11" data-cid="3" data-userid="11" data-rolename="Author" data-username="abcd@xyz.co" data-changedata="" data-time="1790665367864" data-last-change-time="1790665367864">New text</insert>
```

| ID | Steps | Expected |
|----|-------|----------|
| TC-40 | Load fixture, read `getContent()` untouched | Identical to fixture (same attributes, same order). |
| TC-41 | Load fixture | `getPendingCount` is 2; both spans styled as del / ins. |
| TC-42 | Load fixture; `isDirty` | `false`. |
| TC-43 | Load fixture; edit inside the inserted text; `isDirty` | `true`; output keeps `data-cid="3"` and the original user data. |
| TC-44 | Accept the insertion | Output contains plain text for it and no `<insert>` for that cid. |
| TC-45 | Reject the deletion | Text returns to normal; no `<del>` for that cid. |
| TC-46 | Suggest mode, new edit | New `data-cid` starts above `ice.nextCid` / max seen; `data-userid`, `data-username`, `data-rolename` from `ice.user`; `data-time` in ms. |
| TC-47 | New replacement (select + type) | Two different cids (del and insert), same user, same time. |
| TC-48 | Reload the exported output into a fresh field | Same result as TC-40 for the new changes (stable cids). |
| TC-49 | Export twice without editing | Identical strings; cids do not advance. |
| TC-50 | Two fields in one dialog with `nextCid` fixed | Cids do not collide within one export; collision across fields is the host's responsibility (documented). |
| TC-51 | Formatting inside ICE spans: `<del …><em class="italic" data-name="italic">x</em></del>` | Round-trips unchanged. |
| TC-52 | Empty marker `<del class="ice-del …"></del>` | Dropped on load; no error. |
| TC-53 | Same `data-cid` on two adjacent elements (ICE splits across nodes) | Both load; export writes both with that cid. |
| TC-54 | `ice.enabled: false` with ICE markup | Treated as plain HTML; no conversion. |
| TC-55 | `data-time` in seconds vs ms on a new change | Exported as ms. |
| TC-56 | Paste output into CKEditor 4 + lite doc | ICE shows the changes attributed to the right user; accept / reject in ICE works; ICE change count matches. |

## 6. Dialog flow (Update / Cancel)

| ID | Steps | Expected |
|----|-------|----------|
| TC-60 | Open dialog, no edits | Update disabled. |
| TC-61 | Edit, then `markSaved` | `isDirty` false again. |
| TC-62 | Cancel after edits | Target element unchanged; editor reloaded from the original on next open. |
| TC-63 | Segment switching (affiliation dialog) with a pending edit | Pending edit committed to the segment, not lost. |
| TC-64 | Reopen dialog on another element | Baseline, caches and tracking state reset. |

## 7. Robustness

| ID | Steps | Expected |
|----|-------|----------|
| TC-70 | Missing `window.TiptapDeps` | `attach` returns `null` and reports through `logError`; page keeps working. |
| TC-71 | Track-changes extension not loaded | Editor works untracked; Track / Accept / Reject buttons hidden. |
| TC-72 | Superscript / Subscript not loaded | Those buttons hidden; no errors. |
| TC-73 | Duplicate `@tiptap/core` copies (bad CDN mix) | Reproduce and record the error text, so the import-map guidance in `README.md` can be confirmed. |
| TC-74 | Large content (~5 KB with many marks) | Typing stays responsive; `getContent` under a few ms. |
| TC-75 | RTL / CJK text | Editing and tracking behave; export intact. |
| TC-76 | `getDebugSnapshot()` | Returns one entry per field with sensible counts. |

## Exit criteria

- All non-**(verify)** cases pass in the target browsers.
- Every **(verify)** case has a recorded outcome, and any failure has a defect ticket.
- TC-56 passes against the real CKEditor 4 + lite build, since it is the only test of true ICE acceptance.

## Defect report template

```
ID / title:
Build / browser:
Steps:
Input HTML (exact):
Expected:
Actual output (getContent view used):
getDebugSnapshot() output:
Console errors:
```
