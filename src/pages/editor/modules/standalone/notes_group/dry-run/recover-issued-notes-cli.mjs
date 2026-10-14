#!/usr/bin/env node
import { runIssuedNotesRecovery } from './recover-issued-notes.mjs';

const inputPath = process.argv[2];
if (!inputPath) {
    console.error('Usage: node recover-issued-notes-cli.mjs <issued-html-path>');
    process.exitCode = 2;
} else {
    try {
        const result = await runIssuedNotesRecovery(inputPath);
        console.log(JSON.stringify(result, null, 2));
        process.exitCode = result.exitCode;
    } catch (error) {
        console.error(error && error.stack ? error.stack : error);
        process.exitCode = 2;
    }
}
