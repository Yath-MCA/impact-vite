// Add this to your gulpfile.js
// Requires: npm install --save-dev gulp through2

const gulp = require('gulp');
const through2 = require('through2');
const path = require('path');

// Build initials from an abbreviation, e.g. "Eur J Gastroenterol Hepatol" -> "EJGH"
function makeShorthand(abbr) {
    const words = abbr.match(/[A-Za-z]+/g) || [];
    return words.map(w => w[0].toUpperCase()).join('');
}

function convertTsvToJson(contents) {
    const lines = contents.split(/\r\n|\r|\n/);
    const result = {};

    let startIdx = 0;
    if (lines.length && lines[0].toLowerCase().includes('full name')) {
        startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const cols = line.split('\t').map(c => c.trim());
        if (cols.length < 4) {
            console.warn(`journals:tsv2json - skipping malformed line ${i + 1}: ${line}`);
            continue;
        }

        const [fullName, withDot, withoutDot, withDotEnd] = cols;
        if (!fullName) continue;

        result[fullName] = {
            "A.B.B": withDot,
            "ABB": withoutDot,
            "ABB.": withDotEnd
        };
    }

    return result;
}


module.exports = {
    convertTsvToJson,
    makeShorthand
};