#!/usr/bin/env node
/**
 * Area-first link-rules matrix → HTML report.
 * Inputs: random from urls_list.json by area. Output: editor <span> leaves (not XML).
 * Run: npm run generate:link-rules-report
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  resolveClientInstance,
  normalizeAreaToken,
  isSpecialCaseAllowed
} from './resolveLinkRules.js';

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, '../../../../..');

let rules;
let urlsList;
try {
  rules = JSON.parse(readFileSync(join(dir, 'link-rules.json'), 'utf8'));
  urlsList = JSON.parse(readFileSync(join(dir, 'urls_list.json'), 'utf8'));
} catch (err) {
  console.error('Failed to load link-rules.json or urls_list.json:', err && err.message);
  process.exit(1);
}

const AREAS = ['body-url', 'reference-url', 'doi-full', 'doi-partial', 'email'];
const BITS_CLIENTS = ['TNF', 'OSO', 'OXMEDO', 'LSE'];

const FALLBACK = {
  'body-url': 'https://example.com/page',
  'reference-url': 'https://example.com/ref',
  'doi-full': 'https://doi.org/10.1234/test',
  'doi-partial': '10.1234/test',
  email: 'author@example.com',
  'special-case': '10.1234/test'
};

const ATTRS = {
  extUri: { 'data-name': 'ext-link', class: 'ext-link', 'ext-link-type': 'uri' },
  extDoi: { 'data-name': 'ext-link', class: 'ext-link', 'ext-link-type': 'doi' },
  pubId: { 'data-name': 'pub-id', class: 'pub-id', 'pub-id-type': 'doi' },
  uri: { 'data-name': 'uri', class: 'uri' },
  email: { 'data-name': 'email', class: 'email' }
};

const EXPAND_TOKENS = new Set(['doiPartialExtDoi', 'doiPartialUri']);

function listJournalClients() {
  try {
    const journalsDir = join(root, 'src/clientconfig/journals');
    return readdirSync(journalsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'sandbox')
      .map((d) => d.name.toUpperCase())
      .sort();
  } catch {
    return ['ACS', 'BRILL', 'INTELLECT', 'LWW', 'MEDKNOW', 'NIHR', 'OUP', 'PLOS', 'TNFJOURNALS'];
  }
}

const JATS_CLIENTS = listJournalClients();

const urlPools = {
  general: []
    .concat(urlsList.news || [])
    .concat(urlsList.government || [])
    .concat(urlsList.other || []),
  doi: [].concat(urlsList.doi_ids || [])
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pickRandom(arr) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function toBareDoi(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/10\.\d{4,9}\/\S+/i);
  return m ? m[0].replace(/[.,;:)\]]+$/, '') : s.replace(/^(?:https?:\/\/)?(?:dx\.)?doi\.org\//i, '');
}

function toFullDoiUrl(raw) {
  const bare = toBareDoi(raw);
  if (/^https?:\/\//i.test(String(raw || '').trim()) && /doi\.org/i.test(raw)) {
    return String(raw).trim();
  }
  return bare.startsWith('http') ? bare : `https://doi.org/${bare}`;
}

/**
 * @returns {{ value: string, note: string }}
 */
function pickInput(area) {
  if (area === 'email') {
    return { value: FALLBACK.email, note: '' };
  }
  if (area === 'body-url' || area === 'reference-url') {
    const v = pickRandom(urlPools.general);
    if (!v) return { value: FALLBACK[area], note: 'fallback sample' };
    return { value: v, note: '' };
  }
  if (area === 'doi-full') {
    const v = pickRandom(urlPools.doi);
    if (!v) return { value: FALLBACK['doi-full'], note: 'fallback sample' };
    return { value: toFullDoiUrl(v), note: '' };
  }
  if (area === 'doi-partial' || area === 'special-case') {
    const v = pickRandom(urlPools.doi);
    if (!v) return { value: FALLBACK[area], note: 'fallback sample' };
    return { value: toBareDoi(v), note: '' };
  }
  return { value: FALLBACK[area] || '', note: 'fallback sample' };
}

function expandIfNeeded(token, area, input) {
  if (area === 'doi-partial' && (EXPAND_TOKENS.has(token) || normalizeAreaToken(token) !== 'pubId')) {
    const attrsKey = normalizeAreaToken(token);
    if (attrsKey === 'pubId') return input;
    if (!/^https?:\/\//i.test(input)) return `https://doi.org/${toBareDoi(input)}`;
  }
  if (EXPAND_TOKENS.has(token) && !/^https?:\/\//i.test(input)) {
    return `https://doi.org/${toBareDoi(input)}`;
  }
  return input;
}

function renderHtmlLeaf(attrs, displayText, withHref) {
  const parts = ['span'];
  Object.keys(attrs || {}).forEach((key) => {
    parts.push(`${key}="${String(attrs[key]).replace(/"/g, '&quot;')}"`);
  });
  if (withHref != null && withHref !== '') {
    parts.push(`xlink:href="${String(withHref).replace(/"/g, '&quot;')}"`);
  }
  return `<${parts.join(' ')}>${displayText}</span>`;
}

function buildAreaHtml(area, token, input) {
  if (!token || typeof token !== 'string') {
    return { ok: false, html: '—', note: 'missing token' };
  }
  const attrsKey = normalizeAreaToken(token);
  const attrs = ATTRS[attrsKey];
  if (!attrs) {
    return { ok: false, html: '—', note: `unknown token ${token}` };
  }
  const isPubId = attrsKey === 'pubId';
  const isEmail = attrsKey === 'email';
  const display = isPubId || isEmail ? input : expandIfNeeded(token, area, input);
  const href = isPubId || isEmail ? null : display;
  return {
    ok: true,
    html: renderHtmlLeaf(attrs, display, href),
    note: ''
  };
}

function buildSpecialHtml(sc, journalCode, sample) {
  if (!isSpecialCaseAllowed(sc, journalCode)) {
    return { ok: false, html: '—', note: 'blocked by allowlist' };
  }
  const bare = toBareDoi(sample);
  return { ok: true, html: `<?pub-id-doi xlink:href="${bare}"?>`, note: '' };
}

function areaRows(dtd, clients, area, isJournal) {
  return clients.map((client) => {
    const picked = pickInput(area);
    const instance = resolveClientInstance(rules, { clientCode: client, dtd, isJournal });
    const token = instance[area];
    const built = buildAreaHtml(area, token, picked.value);
    const notes = [picked.note, built.note].filter(Boolean).join('; ');
    return {
      client,
      input: picked.value,
      token: String(token),
      output: built.html,
      ok: built.ok,
      note: notes
    };
  });
}

function specialCaseRows(dtd, clients, isJournal) {
  const rows = [];
  for (const client of clients) {
    const instance = resolveClientInstance(rules, { clientCode: client, dtd, isJournal });
    const sc = instance['special-case'];
    const journals = sc && Array.isArray(sc.journals) ? sc.journals : null;
    if (!journals || journals.length === 0) continue;
    for (const journalCode of journals) {
      const picked = pickInput('special-case');
      const built = buildSpecialHtml(sc, journalCode, picked.value);
      const notes = [picked.note, built.note].filter(Boolean).join('; ');
      rows.push({
        client,
        journalCode: String(journalCode).toUpperCase(),
        input: picked.value,
        token: JSON.stringify(sc),
        output: built.html,
        ok: built.ok,
        note: notes
      });
    }
  }
  return rows;
}

function renderAreaTable(area, rows) {
  const body = rows.map((r) => `
    <tr class="${r.ok ? 'pass' : 'fail'}">
      <td><strong>${esc(r.client)}</strong></td>
      <td><code>${esc(r.input)}</code></td>
      <td><pre>${esc(r.output)}</pre><div class="token">token: <code>${esc(r.token)}</code></div></td>
      <td>${r.ok ? 'PASS' : 'FAIL'}${r.note ? `<br><small>${esc(r.note)}</small>` : ''}</td>
    </tr>`).join('');

  const pass = rows.filter((r) => r.ok).length;
  const fail = rows.length - pass;

  return `
  <section class="area" id="area-${esc(area)}">
    <h3>${esc(area)} <span class="counts">${pass} pass / ${fail} fail</span></h3>
    <table>
      <thead>
        <tr><th>Client</th><th>Input</th><th>Output (HTML leaf)</th><th>Result</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </section>`;
}

function renderSpecialTable(dtd, rows) {
  if (!rows.length) return '';
  const body = rows.map((r) => `
    <tr class="${r.ok ? 'pass' : 'fail'}">
      <td><strong>${esc(r.client)}</strong></td>
      <td>${esc(r.journalCode)}</td>
      <td><code>${esc(r.input)}</code></td>
      <td><pre>${esc(r.output)}</pre></td>
      <td>${r.ok ? 'PASS' : 'FAIL'}${r.note ? `<br><small>${esc(r.note)}</small>` : ''}</td>
    </tr>`).join('');

  return `
  <section class="area" id="${esc(dtd)}-special-case">
    <h3>special-case <span class="hint">(allowlisted client × journal only)</span></h3>
    <table>
      <thead>
        <tr><th>Client</th><th>Journal</th><th>Input</th><th>Output</th><th>Result</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </section>`;
}

function dtdBlock(dtd, clients, accent) {
  const isJournal = dtd === 'JATS';
  let pass = 0;
  let fail = 0;
  const areaHtml = [];

  for (const area of AREAS) {
    const rows = areaRows(dtd, clients, area, isJournal);
    pass += rows.filter((r) => r.ok).length;
    fail += rows.filter((r) => !r.ok).length;
    areaHtml.push(renderAreaTable(area, rows));
  }

  const scRows = specialCaseRows(dtd, clients, isJournal);
  pass += scRows.filter((r) => r.ok).length;
  fail += scRows.filter((r) => !r.ok).length;
  areaHtml.push(renderSpecialTable(dtd, scRows));

  const cases = AREAS.length * clients.length + scRows.length;

  return {
    dtd,
    clients,
    cases,
    pass,
    fail,
    specialRows: scRows.length,
    html: `
  <section class="dtd-block" id="dtd-${esc(dtd)}" style="--accent:${accent}">
    <header class="dtd-header">
      <h2>${esc(dtd)}</h2>
      <p class="dtd-sub">${dtd === 'JATS'
        ? 'Journal clients · <code>isJournal: true</code> · random Inputs from <code>urls_list.json</code> · HTML leaf Output.'
        : 'BITS clients TNF · OSO · OXMEDO · LSE · <code>isJournal: false</code> · random Inputs · HTML leaf Output.'}</p>
      <div class="stats">
        <div class="stat"><span>Clients</span><strong>${clients.length}</strong></div>
        <div class="stat"><span>Cases</span><strong>${cases}</strong></div>
        <div class="stat ok"><span>Pass</span><strong>${pass}</strong></div>
        <div class="stat bad"><span>Fail</span><strong>${fail}</strong></div>
      </div>
      <nav class="area-nav">
        ${AREAS.map((a) => `<a href="#dtd-${esc(dtd)}-${esc(a)}">${esc(a)}</a>`).join('')}
        ${scRows.length ? `<a href="#${esc(dtd)}-special-case">special-case</a>` : ''}
      </nav>
    </header>
    ${areaHtml.map((block, i) => {
      if (i < AREAS.length) {
        return block.replace(
          `id="area-${AREAS[i]}"`,
          `id="dtd-${dtd}-${AREAS[i]}"`
        );
      }
      return block;
    }).join('\n')}
  </section>`
  };
}

const jats = dtdBlock('JATS', JATS_CLIENTS, '#1a56a8');
const bits = dtdBlock('BITS', BITS_CLIENTS, '#0d7a4f');

const generatedAt = new Date().toISOString();
const outDir = join(dir, 'reports');
mkdirSync(outDir, { recursive: true });
const stamp = generatedAt.replace(/[:.]/g, '-');
const outPath = join(outDir, `link-rules-matrix-${stamp}.html`);
const latestPath = join(outDir, 'link-rules-matrix-latest.html');

const total = jats.cases + bits.cases;
const pass = jats.pass + bits.pass;
const fail = jats.fail + bits.fail;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Link-rules matrix — area-first (random urls_list + HTML leaf)</title>
<style>
  :root { font-family: Segoe UI, system-ui, sans-serif; color: #1a1a1a; }
  body { margin: 0; background: #eef0f3; }
  .page { max-width: 1100px; margin: 0 auto; padding: 1.25rem 1.5rem 3rem; }
  h1 { margin: 0 0 .25rem; font-size: 1.4rem; }
  .meta { color: #555; margin-bottom: 1rem; font-size: .88rem; }
  .toc { display: flex; gap: .75rem; margin: 1rem 0 1.25rem; flex-wrap: wrap; }
  .toc a { display: inline-block; padding: .55rem 1rem; border-radius: 6px; color: #fff; text-decoration: none; font-weight: 600; }
  .toc .jats { background: #1a56a8; }
  .toc .bits { background: #0d7a4f; }
  .split-note { background: #fff8e6; border: 1px solid #e6d9a8; border-radius: 6px; padding: .65rem .85rem; font-size: .85rem; }
  .stats { display: flex; gap: .75rem; margin: .75rem 0; flex-wrap: wrap; }
  .stat { background: #f7f8fa; border: 1px solid #ddd; border-radius: 6px; padding: .5rem .8rem; }
  .stat strong { display: block; font-size: 1.2rem; }
  .stat.ok strong { color: #0a7a32; }
  .stat.bad strong { color: #b00020; }
  .dtd-block { background: #fff; border: 2px solid var(--accent); border-radius: 10px; padding: 1rem 1.1rem 1.4rem; margin: 1.75rem 0; }
  .dtd-header h2 { margin: 0; font-size: 1.35rem; color: var(--accent); letter-spacing: .04em; }
  .dtd-sub { color: #555; font-size: .88rem; margin: .35rem 0 .75rem; }
  .area-nav { display: flex; flex-wrap: wrap; gap: .35rem; margin: .5rem 0 1rem; }
  .area-nav a { background: #f0f2f5; border: 1px solid #ccc; padding: .2rem .55rem; border-radius: 4px; text-decoration: none; color: #0645ad; font-size: .8rem; }
  .area { margin: 1.1rem 0 1.4rem; }
  .area h3 { margin: 0 0 .5rem; font-size: 1.05rem; display: flex; align-items: baseline; gap: .75rem; }
  .area h3 .counts { font-size: .75rem; font-weight: 500; color: #666; }
  .area h3 .hint { font-size: .75rem; font-weight: 500; color: #666; }
  table { border-collapse: collapse; width: 100%; font-size: .8rem; }
  th, td { border: 1px solid #e0e0e0; padding: .4rem .5rem; vertical-align: top; text-align: left; }
  th { background: #f0f2f5; }
  tr.pass td:last-child { color: #0a7a32; font-weight: 600; }
  tr.fail td:last-child { color: #b00020; font-weight: 600; }
  pre { margin: 0; white-space: pre-wrap; word-break: break-all; font-size: .72rem; }
  .token { margin-top: .25rem; color: #666; font-size: .7rem; }
  code { font-size: .72rem; }
</style>
</head>
<body>
<div class="page">
  <h1>Link-rules matrix (area-first)</h1>
  <p class="meta">Generated ${esc(generatedAt)} from <code>link-rules.json</code> + random <code>urls_list.json</code>.
  Output = editor <strong>HTML leaf</strong> (<code>&lt;span&gt;</code> attrs), not XML. Fresh random Inputs each run.</p>

  <p class="split-note">
    <strong>JATS</strong> (journal): ${esc(JATS_CLIENTS.join(', '))}<br/>
    <strong>BITS</strong> (book): ${esc(BITS_CLIENTS.join(', '))}<br/>
    <strong>Pools:</strong> body/ref ← news∪government∪other · doi* ← doi_ids · email fixed<br/>
    <strong>special-case:</strong> allowlisted client × journal only (e.g. LWW × GOX/PRS/XCS).
  </p>

  <div class="stats">
    <div class="stat"><span>Total cases</span><strong>${total}</strong></div>
    <div class="stat ok"><span>Pass</span><strong>${pass}</strong></div>
    <div class="stat bad"><span>Fail</span><strong>${fail}</strong></div>
  </div>

  <div class="toc">
    <a class="jats" href="#dtd-JATS">JATS — ${JATS_CLIENTS.length} clients</a>
    <a class="bits" href="#dtd-BITS">BITS — ${BITS_CLIENTS.length} clients</a>
  </div>

  ${jats.html}
  ${bits.html}
</div>
</body>
</html>
`;

writeFileSync(outPath, html, 'utf8');
writeFileSync(latestPath, html, 'utf8');
console.log(JSON.stringify({
  outPath,
  latestPath,
  pools: { general: urlPools.general.length, doi: urlPools.doi.length },
  jatsClients: JATS_CLIENTS,
  bitsClients: BITS_CLIENTS,
  jats: { cases: jats.cases, pass: jats.pass, fail: jats.fail, specialRows: jats.specialRows },
  bits: { cases: bits.cases, pass: bits.pass, fail: bits.fail, specialRows: bits.specialRows },
  total,
  pass,
  fail
}, null, 2));
