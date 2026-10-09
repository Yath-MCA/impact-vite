#!/usr/bin/env node
/**
 * Generate link-rules.md and link-rules.txt from link-rules.json.
 * Run: npm run generate:link-rules-docs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { resolveClientInstance } from './resolveLinkRules.js';

const dir = dirname(fileURLToPath(import.meta.url));
const rulesPath = join(dir, 'link-rules.json');
const rules = JSON.parse(readFileSync(rulesPath, 'utf8'));

const AREA_KEYS = ['body-url', 'reference-url', 'doi-full', 'doi-partial', 'email'];

const EXAMPLES = {
  INTELLECT: {
    'body-url': '<uri xlink:href="https://www.rai.tv">www.rai.tv</uri>',
    'reference-url': '<uri xlink:href="https://nachdemfilm.de/issues/text/green-media">https://nachdemfilm.de/issues/text/green-media</uri>',
    'doi-full': '<ext-link ext-link-type="doi" xlink:href="https://doi.org/10.6092/issn.2421-454X/10499">https://doi.org/10.6092/issn.2421-454X/10499</ext-link>'
  },
  MEDKNOW: {
    'body-url': '<ext-link ext-link-type="uri" xlink:href="https://www.ncbi.nlm.nih.gov/books/NBK544242/">https://www.ncbi.nlm.nih.gov/books/NBK544242/</ext-link>',
    'reference-url': '<ext-link ext-link-type="uri" xlink:href="https://www.ncbi.nlm.nih.gov/books/NBK544242/">https://www.ncbi.nlm.nih.gov/books/NBK544242/</ext-link>',
    'doi-full': '<ext-link ext-link-type="uri" xlink:href="https://doi.org/10.1007/978-3-030-53868-2_10">https://doi.org/10.1007/978-3-030-53868-2_10</ext-link>',
    'doi-partial': '<pub-id pub-id-type="doi">10.47070/ijapr.v11i2.2680</pub-id>'
  },
  LWW: {
    'body-url': '<ext-link ext-link-type="uri" xlink:href="www.swissnoso.ch">www.swissnoso.ch</ext-link>',
    'reference-url': '<ext-link ext-link-type="uri" xlink:href="https://wwwwhoint/news-room/fact-sheets/detail/burns">https://wwwwhoint/news-room/fact-sheets/detail/burns</ext-link>',
    'doi-full': '<ext-link ext-link-type="uri" xlink:href="https://doi.org/10.1016/j.celrep.2023.112269">https://doi.org/10.1016/j.celrep.2023.112269</ext-link>',
    'doi-partial': '<pub-id pub-id-type="doi">10.1152/physrev.00043.2008</pub-id>',
    'special-case': '<?pub-id-doi xlink:href="10.1016/j.celrep.2023.112269"?> (journals GOX, PRS, XCS)'
  }
};

function formatAreas(instance) {
  return AREA_KEYS.map((k) => `  - ${k}: ${instance[k]}`).join('\n');
}

function buildMarkdown() {
  const lines = [];
  lines.push('# Link rules (generated)');
  lines.push('');
  lines.push('Generated from link-rules.json — do not edit.');
  lines.push('');
  lines.push('## DEFAULT');
  lines.push('');
  lines.push(formatAreas(rules.DEFAULT));
  if (rules.DEFAULT['special-case']) {
    lines.push(`  - special-case: ${JSON.stringify(rules.DEFAULT['special-case'])}`);
  }
  lines.push('');
  if (rules.DEFAULT_JOURNAL) {
    lines.push('## DEFAULT_JOURNAL (overlay when isJournal)');
    lines.push('');
    Object.keys(rules.DEFAULT_JOURNAL).forEach((k) => {
      lines.push(`  - ${k}: ${typeof rules.DEFAULT_JOURNAL[k] === 'object'
        ? JSON.stringify(rules.DEFAULT_JOURNAL[k])
        : rules.DEFAULT_JOURNAL[k]}`);
    });
    lines.push('');
  }
  lines.push('## Clients');
  lines.push('');
  Object.keys(rules.clients || {}).sort().forEach((code) => {
    const entry = rules.clients[code];
    lines.push(`### ${code}`);
    lines.push('');
    lines.push(`- dtd: ${entry.dtd || '(all)'}`);
    lines.push('');
    ['JATS', 'BITS'].forEach((dtd) => {
      const eff = resolveClientInstance(rules, { clientCode: code, dtd, isJournal: false });
      lines.push(`#### Effective on ${dtd}`);
      lines.push('');
      lines.push(formatAreas(eff));
      if (eff['special-case']) {
        lines.push(`  - special-case: ${JSON.stringify(eff['special-case'])}`);
      }
      lines.push('');
    });
    const samples = EXAMPLES[code];
    if (samples) {
      lines.push('#### House-style examples');
      lines.push('');
      Object.keys(samples).forEach((k) => {
        lines.push(`- **${k}:** \`${samples[k]}\``);
      });
      lines.push('');
    }
  });
  return lines.join('\n') + '\n';
}

function buildTxt(md) {
  return md
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '');
}

const md = buildMarkdown();
writeFileSync(join(dir, 'link-rules.md'), md, 'utf8');
writeFileSync(join(dir, 'link-rules.txt'), buildTxt(md), 'utf8');
console.log('Wrote link-rules.md and link-rules.txt');
