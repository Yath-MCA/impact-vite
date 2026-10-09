# Issued Notes HTML Recovery - How to Run

This tool repairs damaged endnote citation `rid` values and visible labels in an issued HTML file. It validates every citation before writing recovered HTML.

The source HTML is never overwritten.

## Prerequisites

Open PowerShell and run from the project root:

```powershell
cd C:\_IMPACT\tomcat\webapps\impact_qa
npm install
```

Node.js must be available. The runner uses the project's existing `happy-dom` dependency.

## Run a Document

```powershell
node src/modules/standalone/notes_group/dry-run/recover-issued-notes-cli.mjs "FULL_PATH_TO_ISSUED_HTML"
```

Example for the current issued document:

```powershell
node src/modules/standalone/notes_group/dry-run/recover-issued-notes-cli.mjs "src/modules/standalone/notes_group/dry-run/N0288953d-ae07-4561-bd83-3f1c15fa99b7/N0288953d-ae07-4561-bd83-3f1c15fa99b7_1788972197993_v0.html"
```

After the command, inspect the exit code:

```powershell
$LASTEXITCODE
```

Exit codes:

- `0`: validation passed and recovered HTML was written.
- `1`: document validation failed; only the JSON report was written.
- `2`: command usage or unexpected runtime error.

## Generated Files

For an input named `issued.html`, the runner uses these sibling paths:

```text
issued_recovered.html
issued_recovery-report.json
```

On success, both files are written. On validation failure, only the report is written and any stale `issued_recovered.html` is removed.

The report contains:

- Total citation and note counts.
- Number of recoverable citations.
- Resolution method used for each citation.
- Blocking errors and affected citation indexes/targets.
- Output validation results.

## Inspect the Report

Show the summary:

```powershell
$reportPath = "src/modules/standalone/notes_group/dry-run/N0288953d-ae07-4561-bd83-3f1c15fa99b7/N0288953d-ae07-4561-bd83-3f1c15fa99b7_1788972197993_v0_recovery-report.json"
$report = Get-Content -Raw $reportPath | ConvertFrom-Json
$report.counts | Format-List
```

Show blocking errors:

```powershell
$report.errors | Format-List
```

Group errors by type:

```powershell
$report.errors | Group-Object type | Select-Object Count, Name
```

## Current Document Result

The current `N0288953d-ae07-4561-bd83-3f1c15fa99b7` snapshot intentionally produces exit code `1` and no recovered HTML because it contains:

- Missing note target `en77`.
- Duplicate active note ID `en2`.
- Two citations that are ambiguous because of duplicate ID `en2`.

Correct these source-data issues through the normal editor/document correction workflow, then rerun the same command. Do not remove errors from the JSON report or manually force the runner to emit output.

## Verify the Source Was Not Changed

```powershell
$inputPath = "src/modules/standalone/notes_group/dry-run/N0288953d-ae07-4561-bd83-3f1c15fa99b7/N0288953d-ae07-4561-bd83-3f1c15fa99b7_1788972197993_v0.html"
$before = (Get-FileHash -Algorithm SHA256 $inputPath).Hash
node src/modules/standalone/notes_group/dry-run/recover-issued-notes-cli.mjs $inputPath
$after = (Get-FileHash -Algorithm SHA256 $inputPath).Hash
$before -eq $after
```

The final command must print `True`.

## Run Automated Tests

Run the recovery tests:

```powershell
npm run test:unit -- tests/unit/notesIssuedHtmlRecovery.test.js
```

Run all notes recovery and renumber tests:

```powershell
npm run test:unit -- tests/unit/notesIssuedHtmlRecovery.test.js tests/unit/notesRenumberDryRun.test.js tests/unit/notesGroupExplicitDelete.test.js
```

Expected focused result: all tests pass.

## Troubleshooting

`Cannot find package 'happy-dom'`:

```powershell
npm install
```

`Usage: node recover-issued-notes-cli.mjs <issued-html-path>`:

Pass the input HTML path as the first argument. Quote paths containing spaces.

Exit code `1`:

Open the generated `*_recovery-report.json` file and correct every entry in `errors`. The runner will not create recovered HTML while any blocking error remains.
