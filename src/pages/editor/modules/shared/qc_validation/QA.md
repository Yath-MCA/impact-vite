# QC Validation — QA Checklist

Internal Validation (`qualityCheckerDialog`) pass/fail cases. Code details: [README.md](./README.md), [DEV.md](./DEV.md).

## Prerequisites

- Build/deploy includes `assets/<version>/modules/qc_validation/` (`index.js`, Core, Module, TrackModule, `template.html`).
- Client config enables Internal Validation where applicable (e.g. OUP, LWW, sandbox).
- Test as **CO (collator)** and at least one **non-CO** role.
- Editor: `editor6.html?docid=...` — Track: `editor6TrackView.html?docid=...`.

## Editor — CO

| # | Steps | Expected |
|---|--------|----------|
| E1 | Open article as CO → click Finalize | Internal Validation dialog opens (not Finalize immediately) |
| E2 | Wait for progress | Three tabs: **Missing Citation** \| **DTD Error** \| **Text Related**; sections populate in the matching tab |
| E3 | Clean article (no issues) | No confirm checkboxes; force-submit hidden; Submit → FinalizeDialog |
| E4 | Missing cite only | Confirm only on Missing Citation; force-submit shown; DTD / Text Related have no confirm |
| E5 | Duplicate ID and/or broken xref | DTD Error lists issues; confirm required on DTD tab |
| E6 | Double spaces only | Text Related confirm + force-submit; other tabs clean |
| E7 | Issues present → Submit without confirming errored tab(s) | Blocked; focus moves to that tab / checkbox |
| E8 | Confirmed but remarks &lt; 20 chars | Blocked; invalid feedback on comments |
| E9 | Confirm all errored tabs + ≥20 chars → Submit | Record saved; FinalizeDialog opens |
| E10 | Cancel | Dialog closes; finalize not forced |
| E11 | Click a missing/ignore item | Editor scrolls/selects corresponding element when possible |

## Editor — non-CO

| # | Steps | Expected |
|---|--------|----------|
| E12 | Open as non-CO → Finalize | FinalizeDialog (or normal finalize) — QC dialog does **not** open |

## Track View — CO / localhost

| # | Steps | Expected |
|---|--------|----------|
| T1 | Open Track View; open browser console | No `Failed to resolve module specifier` for QC |
| T2 | Network: `.../modules/qc_validation/QcValidationTrackModule.js`, Core, **`template.html`** | HTTP 200 |
| T3 | Profile menu | “Show Validation Log” present (CO or localhost) |
| T4 | Click Show Validation Log | Internal Validation opens with three tabs |
| T5 | Check dialog UI | Footer hidden / submit not used; remarks disabled if prior remarks |
| T6 | If prior CO remarks exist | Remarks textarea shows saved text |
| T7 | Click missing/ignore items (if any) | Editor scrolls/selects corresponding element when possible |

## Track View — general

| # | Steps | Expected |
|---|--------|----------|
| T8 | Track page load | Track list / reviewers / prev-next still work |
| T9 | Profile / user menu | Still usable (no duplicate broken validation entries) |
| T10 | No Finalize control on Track | QC does not rewire FinalizeDialog |

## Regressions / smoke

| # | Check | Expected |
|---|--------|----------|
| R1 | Console on Track | No ES module specifier / import errors for `qc_validation` |
| R2 | Editor finalize path after gulp rebuild | E1–E11 still pass |
| R3 | Smoke two clients with QC enabled (e.g. OUP + LWW or sandbox) | Same CO/Track behaviors |

## Fail criteria (block release)

- Bare `assets/...` import used on Track (module fails to load).
- Track imports `index.js` / `QcValidationModule` without `module_main` (BaseModule missing).
- CO finalize skips Internal Validation when QC is enabled for the client.
- Profile “Show Validation Log” missing for CO on Track after successful module load.
- Submit allowed past errored tabs without per-tab confirm when issues exist.
