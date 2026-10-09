# SUPP upload vs Java `filesuploadmultiple`

One POST from `FIRE_SUBMIT`. Java prepends form `file_sn` / `file_on` / `ext`, then appends uploaded files, then:

- no `_id` → `insertOne` (`Uploaded.`)
- `_id` → `updateOne` `$set` (`Uploaded with record updated.`)

**Sibling arrays:** send `file_sn` / `file_on` / `ext` **only** when updating (`_id` set), and **only** other editor nodes with that **same** `data-db-id`. Java prepends them, then appends the new upload so a second replace does not wipe the other file on that Mongo row.

## `paramsJson`

| Field | Always |
|-------|--------|
| `subfolder` | `suppl_data` |
| `recordtype` | `SupplementFile` |
| `file_type` | `New` and/or `Replaced` |
| `action_type` | JSON map of original filename → New/Replaced |
| `upload_data` | JSON list with `action` + `supp_sn` (SFTP) |
| `_id` | Only the **replace** row’s `data-db-id`. Omit if that row has none. Add never sets `_id`. |
| `file_sn` / `file_on` / `ext` | Only same-`data-db-id` siblings when `_id` is set |

## Chrome Network smoke (`filesuploadmultiple`)

Also check console `supp upload json`. One POST per Submit.

| Case | Request | Response message |
|------|---------|------------------|
| New only | No `_id`. No sibling arrays | `Uploaded.` |
| Replace, node has no `data-db-id` | No `_id` | `Uploaded.` |
| Replace, node has `data-db-id` | `_id` = that node; siblings with same id only | `Uploaded with record updated.` |
| Replace again on same node | Same `_id`; keep other files on that id | `Uploaded with record updated.` |
| Add + replace, replace has no db id | One POST, no `_id` | `Uploaded.` |
| Add + replace, replace has db id | One POST, `_id` = replace row | `Uploaded with record updated.` |
| Second replace of one file on a two-file `_id` | `_id` + the other file’s sn/on/ext; Mongo still two files | `Uploaded with record updated.` |

Rebuild: `npx gulp local --env local` so `dist` is not a stale bundle.
