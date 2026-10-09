// ─── Hex / String conversion utilities ───────────────────────────────────────
// Used for <templtaes-elements>, <cross_ref_api pid>, and sign_off mail fields
// which store HTML/plain-text as lowercase hex strings.
// Reference tool: codebeautify.org/string-hex-converter

window.ADMIN_USER_IDs = window.ADMIN_USER_IDs ? window.ADMIN_USER_IDs : ['sivakumars', 'yasar.mohideen', 'durairajan.gnanam'];

function isAdminUser() {
    const adminUser = String(localStorage.getItem('xmleditor:admin') || '').toLowerCase();
    // if (adminUser === 'superadmin') return true;

    const loginUsername = String(localStorage.getItem('xmleditor:login_username') || '').trim();
    const loginPrefix = loginUsername.split('@')[0].trim().toLowerCase();
    const isSuperAdmin = window.ADMIN_USER_IDs.some(id => id.toLowerCase() === loginPrefix);

    
    if (adminUser && !isSuperAdmin) {
        localStorage.setItem('xmleditor:admin', 'admin');
        return false;
    } else if (isSuperAdmin) {
        return true;
    } else {
        localStorage.removeItem('xmleditor:admin');
        return false;
    }

}

/**
 * Encode a plain-text or HTML string to its hex representation.
 * Each character is converted to its UTF-16 code unit as a 2-digit hex pair.
 * @param {string} str  Raw string (HTML allowed)
 * @returns {string}    Lowercase hex string (e.g. "<p>" → "3c703e")
 */
function stringToHex(str) {
    return Array.from(str)
        .map(ch => ch.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Encode a plain-text or HTML string to base64.
 * Uses UTF-8 safe conversion so cloned HTML survives non-ASCII content.
 * @param {string} str
 * @returns {string}
 */
function stringToBase64(str) {
    const input = String(str || '');
    return btoa(unescape(encodeURIComponent(input)));
}

/**
 * Decode a hex string back to a plain-text or HTML string.
 * @param {string} hex  Lowercase or uppercase hex string
 * @returns {string}    Decoded string
 */
function hexToString(hex) {
    const clean = hex.replace(/\s+/g, '');
    let result = '';
    for (let i = 0; i < clean.length; i += 2) {
        result += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
    }
    return result;
}

/**
 * Decode a base64 string back to plain-text or HTML.
 * @param {string} base64
 * @returns {string}
 */
function base64ToString(base64) {
    const clean = String(base64 || '').replace(/\s+/g, '');
    if (!clean) return '';
    try {
        return decodeURIComponent(escape(atob(clean)));
    } catch (error) {
        console.warn('base64ToString: invalid base64 input');
        return '';
    }
}

/**
 * Update a hex-field input in the admin panel.
 * Reads the raw string from a paired <textarea> / <input> (data-hex-source),
 * encodes it to hex, and writes the result into the target element.
 *
 * Usage in HTML:
 *   <textarea id="shareInvite_defaultShare_raw"></textarea>
 *   <input    id="shareInvite_defaultShare"
 *             data-hex-source="shareInvite_defaultShare_raw"
 *             readonly />
 *   <button onclick="encodeHexField('shareInvite_defaultShare')">Encode →</button>
 *
 * @param {string} targetId  id of the hex output <input>
 */
function encodeHexField(targetId) {
    encodeField(targetId);
}

function decodeHexField(targetId) {
    decodeField(targetId);
}

function encodeField(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const sourceId = target.dataset.hexSource;
    const source = sourceId ? document.getElementById(sourceId) : null;
    if (!source) { console.warn('encodeField: no data-hex-source for', targetId); return; }
    const encoding = (target.dataset.encoding || 'hex').toLowerCase();
    const value = source.value || '';
    target.value = encoding === 'base64' ? stringToBase64(value) : stringToHex(value);
}

/**
 * Decode an encoded field and write the HTML back to its paired raw textarea.
 *
 * @param {string} targetId  id of the encoded output <input>
 */
function decodeField(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const sourceId = target.dataset.hexSource;
    const source = sourceId ? document.getElementById(sourceId) : null;
    if (!source) { console.warn('decodeField: no data-hex-source for', targetId); return; }
    const encoding = (target.dataset.encoding || 'hex').toLowerCase();
    source.value = encoding === 'base64' ? base64ToString(target.value) : hexToString(target.value);
}

/**
 * Wire up encode/decode buttons for every hex field on the page.
 * Expects elements with [data-role="hex-encode"] and [data-role="hex-decode"]
 * and a data-target attribute pointing to the hex <input> id.
 *
 * Call once on DOMContentLoaded.
 */
function initHexFieldControls() {
    document.querySelectorAll('[data-role="hex-encode"]').forEach(btn => {
        btn.addEventListener('click', () => encodeField(btn.dataset.target));
    });
    document.querySelectorAll('[data-role="hex-decode"]').forEach(btn => {
        btn.addEventListener('click', () => decodeField(btn.dataset.target));
    });
}

/**
 * Read global API_PATH (from index.js bundle) with window fallback.
 * @returns {string}
 */
function getGlobalApiPath() {
    if (typeof API_PATH !== 'undefined' && API_PATH != null && String(API_PATH).trim()) {
        return String(API_PATH).trim();
    }
    if (typeof window !== 'undefined' && window.API_PATH) {
        return String(window.API_PATH).trim();
    }
    return '';
}

/**
 * Build a request URL from global API_PATH + relative path.
 * Example: API_PATH + 'api/sqlite/health'
 * @param {string} relativePath
 * @returns {string}
 */
function buildApiUrl(relativePath) {
    const segment = String(relativePath || '').replace(/^\/+/, '');
    const base = getGlobalApiPath();
    if (!base) {
        return `/${segment}`;
    }
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}${segment}`;
}

const SQLITE_API = {
    path: () => buildApiUrl('api/sqlite/path'),
    status: () => buildApiUrl('api/sqlite/status'),
    health: () => buildApiUrl('api/sqlite/health')
};

const DASHBOARD_API = {
    stats: () => buildApiUrl('api/dashboard/stats'),
    full: () => buildApiUrl('api/dashboard')
};

/**
 * Parse SQLite /api/sqlite/health response into a connected flag and detail text.
 * @param {*} payload
 * @returns {{ healthy: boolean, detail: string }}
 */
function parseSqliteHealthPayload(payload) {
    if (payload === null || payload === undefined || payload === '') {
        return { healthy: false, detail: 'No health response returned.' };
    }

    if (typeof payload === 'object') {
        const healthy = payload.connected === true
            || payload.healthy === true
            || payload.status === 'ok'
            || payload.ok === true;
        const detail = payload.message
            || payload.status
            || payload.detail
            || (payload.path ? `Database path: ${payload.path}` : '')
            || (healthy ? 'Database connection looks healthy.' : 'Database connection is unavailable.');
        return { healthy, detail: String(detail) };
    }

    const text = String(payload);
    return {
        healthy: /ok|healthy|connected|true/i.test(text),
        detail: text
    };
}

/**
 * Update header and inline SQLite health badges.
 * @param {boolean|null} healthy  true/false for result, null for checking state
 * @param {string} [detail]
 */
function setSqliteHealthIndicator(healthy, detail) {
    const badgeClass = healthy === null
        ? 'text-bg-secondary'
        : (healthy ? 'text-bg-success' : 'text-bg-danger');
    const badgeText = healthy === null
        ? 'Checking'
        : (healthy ? 'Connected' : 'Disconnected');
    const statusText = detail || (healthy === null
        ? 'Checking database…'
        : (healthy ? 'Database connection looks healthy.' : 'Database connection is unavailable.'));

    ['sqliteHealthBadge', 'sqliteHealthBadgeInline'].forEach(id => {
        const badge = document.getElementById(id);
        if (!badge) return;
        badge.className = `badge ${badgeClass}${id === 'sqliteHealthBadgeInline' ? ' sqlite-health-badge-inline' : ''}`;
        badge.textContent = badgeText;
    });

    const status = document.getElementById('sqliteHealthText');
    if (status) {
        status.textContent = statusText;
    }

    const icon = document.getElementById('sqliteHealthIcon');
    if (icon) {
        icon.classList.toggle('sqlite-health-icon--ok', healthy === true);
        icon.classList.toggle('sqlite-health-icon--bad', healthy === false);
        icon.classList.toggle('sqlite-health-icon--pending', healthy === null);
    }
}

/**
 * Apply health indicator state from an API payload.
 * @param {*} payload
 * @param {boolean} [httpOk=true]
 */
function applySqliteHealthFromPayload(payload, httpOk) {
    if (httpOk === false) {
        setSqliteHealthIndicator(false, 'Database health check failed.');
        return;
    }
    const parsed = parseSqliteHealthPayload(payload);
    setSqliteHealthIndicator(parsed.healthy, parsed.detail);
}

function markAlertInfoBase64Fields() {
    const section = document.getElementById('cc-alertInfo');
    if (!section) return;

    const base64Ids = [
        'cfg_alertInfo_sign_off_mail-bcc',
        'cfg_alertInfo_sign_off_external-mail'
    ];

    base64Ids.forEach(id => {
        const field = section.querySelector(`#${CSS.escape(id)}`)?.closest('.cc-hex-field');
        const encodedInput = document.getElementById(id);
        if (encodedInput) {
            encodedInput.dataset.encoding = 'base64';
        }

        if (field) {
            const badge = field.querySelector('.badge');
            if (badge) {
                badge.textContent = 'BASE64';
            }
        }
    });
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Populate XML file selector dropdown with all available configs
 */
function populateXMLFileSelector() {
    const selector = document.getElementById('xmlFileSelector');
    if (!selector) return;

    // Clear existing options except the first one
    selector.innerHTML = '<option value="">Choose a file...</option>';

    // Add journal configs
    const journalOptGroup = document.createElement('optgroup');
    journalOptGroup.label = 'Journal Configurations';

    for (const [clientId, path] of Object.entries(CONFIG_PATHS.journals)) {
        const option = document.createElement('option');
        option.value = path;
        option.text = `${getClientDisplayName(clientId, clientId)} - Journals`;
        journalOptGroup.appendChild(option);
    }
    selector.appendChild(journalOptGroup);

    // Add book configs
    const bookOptGroup = document.createElement('optgroup');
    bookOptGroup.label = 'Book Configurations';

    for (const [clientId, path] of Object.entries(CONFIG_PATHS.books)) {
        const option = document.createElement('option');
        option.value = path;
        option.text = `${getClientDisplayName(clientId, clientId)} - Books`;
        bookOptGroup.appendChild(option);
    }
    selector.appendChild(bookOptGroup);
}

/**
 * Populate validation file selector
 */
function populateValidationFileSelector() {
    const selector = document.getElementById('validateFileSelector');
    if (!selector) return;

    // Clear existing options except the first one
    selector.innerHTML = '<option value="">Choose a file...</option>';

    // Add all configs
    for (const [clientId, path] of Object.entries(CONFIG_PATHS.journals)) {
        const option = document.createElement('option');
        option.value = path;
        option.text = `${getClientDisplayName(clientId, clientId)} - Journals`;
        selector.appendChild(option);
    }

    for (const [clientId, path] of Object.entries(CONFIG_PATHS.books)) {
        const option = document.createElement('option');
        option.value = path;
        option.text = `${getClientDisplayName(clientId, clientId)} - Books`;
        selector.appendChild(option);
    }
}
/* 
── Create-Config (CC) Module ─────────────────────────────────────────
         Fully schema-driven: every form group is generated dynamically from
         src/clientconfig/template/config-schema.json — nothing is hardcoded.
         Entry point : CC.init()    (called by applyCreateConfigDefaults)
         Download    : CC.generate() (button onclick)
──────────────────────────────────────────────────────────────────────── 
    */

(function () {
    'use strict';

    /* ─────────────────────────────────────────────────────────────────────
       CONSTANTS
    ───────────────────────────────────────────────────────────────────── */
    const SCHEMA_URL = 'assets/${{VERSION}}$/meta/config-schema.json';

    /* Role attribute keys used in <functionality> elements */
    const ROLES = [
        'showForAU', 'showForCO', 'showForCE', 'showForPM',
        'showForED', 'showForPE', 'showForJM', 'showForPR', 'showForCoRole'
    ];
    const ROLE_SHORT = {
        showForAU: 'AU', showForCO: 'CO', showForCE: 'CE', showForPM: 'PM',
        showForED: 'ED', showForPE: 'PE', showForJM: 'JM', showForPR: 'PR', showForCoRole: 'CoR'
    };

    /* Schema keys that are structural/meta — never rendered as form fields */
    const META_KEYS = new Set([
        '_comment', 'hexFields', 'ref-site', 'xmlAttr', 'roles', 'elements', 'type'
    ]);

    /* ── state ── */
    let _schema = null;

    /* ── public API ── */
    window.CC = { init, generate, fillFromXML };

    /* ─────────────────────────────────────────────────────────────────────
       INIT  — fetch schema once, then drive every tab from it
    ───────────────────────────────────────────────────────────────────── */
    async function init() {
        if (!_schema) {
            try {
                 _schema = await $.getJSON(SCHEMA_URL);
            } catch (e) {
                console.error('CC: schema load failed', e);
                document.querySelectorAll('[id^="cc-table-"], [id^="cc-"]').forEach(el => {
                    el.innerHTML = '<p class="text-danger p-3"><i class="fas fa-exclamation-triangle me-1"></i>Schema load failed — check console.</p>';
                });
                return;
            }
        }

        const s = _schema.sections;

        /* ── Tab 2/3/4: compact role-toggle tables ── */
        renderFunctionalityTable('dialogs');
        renderFunctionalityTable('menuoption');
        renderFunctionalityTable('contextmenu');

        /* ── Tab 5: Config Sections — driven by schema.fields ── */
        renderFieldGroup('cc-showItems', 'showItems', s.showItems.fields, 'row g-3');
        renderFieldGroup('cc-root', 'root', s.root.fields, 'row g-3');

        /* ── Tab 6: Templates & Alerts — universal schema walker ── */
        renderSchemaGroup('cc-shareInvite', 'tmpl', s['templtaes-elements']);
        renderSchemaGroup('cc-alertInfo', 'alertInfo', s['alertInfo-message-redirectlink']);
        renderSchemaGroup('cc-crossRef', 'crossRef', s['cross_ref_api'].fields);

        if (typeof initHexFieldControls === 'function') initHexFieldControls();
    }

    /* ─────────────────────────────────────────────────────────────────────
       UNIVERSAL SCHEMA WALKER
       Renders any schema node as form fields — one by one, driven entirely
       by the JSON structure and type annotations.

       ID convention (consistent across render + XML-build):
         leaf field  → cfg_{prefix}_{key}
         hex input   → cfg_{prefix}_{key}        (readonly, holds hex)
         hex textarea→ cfg_{prefix}_{key}_raw    (editable, holds HTML)
    ───────────────────────────────────────────────────────────────────── */

    /**
     * Entry point for non-functionality sections.
     * Clears containerId and walks the schema node.
     */
    function renderSchemaGroup(containerId, prefix, node) {
        const el = document.getElementById(containerId);
        if (!el || !node) return;
        el.innerHTML = '';
        walkNode('cfg_' + prefix, node, el);
    }

    /**
     * Render a flat `fields` object as a Bootstrap row of form controls.
     * Used for showItems, root (sections whose schema has a `fields` property).
     */
    function renderFieldGroup(containerId, prefix, fieldsNode, rowClass) {
        const el = document.getElementById(containerId);
        if (!el || !fieldsNode) return;
        el.innerHTML = '';
        const row = document.createElement('div');
        row.className = rowClass || 'row g-3';
        Object.entries(fieldsNode).forEach(([key, meta]) => {
            if (META_KEYS.has(key)) return;
            const id = `cfg_${prefix}_${key}`;
            const def = meta.default || '';
            const col = document.createElement('div');
            col.className = meta.type === 'boolean' ? 'col-md-2' : 'col-md-5';
            col.innerHTML = `
            <label class="form-label fw-semibold">${key}
              ${meta.description ? `<small class="text-muted d-block fw-normal">${meta.description}</small>` : ''}
            </label>
            ${meta.type === 'boolean'
                    ? `<select id="${id}" class="form-select form-select-sm">
                   <option value="true"${def === 'true' ? ' selected' : ''}>✓ true</option>
                   <option value="false"${def === 'false' ? ' selected' : ''}>✗ false</option>
                 </select>`
                    : `<input id="${id}" class="form-control form-control-sm" value="${escXml(def)}">`}`;
            row.appendChild(col);
        });
        el.appendChild(row);
    }

    /**
     * Recursively walk a schema node.
     * Leaf nodes (have a `type` property) → render a form control.
     * `items` object (alertInfo pattern) → render as Bootstrap cards.
     * Any other nested object → render as a labeled sub-group.
     */
    function walkNode(prefix, node, container) {
        if (typeof node !== 'object' || node === null) return;

        Object.entries(node).forEach(([key, val]) => {
            /* skip structural/meta keys */
            if (META_KEYS.has(key)) return;

            const fieldId = `${prefix}_${key}`;

            /* ── LEAF: has a type annotation ── */
            if (val && typeof val.type === 'string') {
                container.insertAdjacentHTML('beforeend', leafFieldHtml(fieldId, key, val));
                return;
            }

            /* ── SPECIAL: "items" wrapper (alertInfo pattern) ──
               Each entry becomes a collapsible card with its own fields. */
            if (key === 'items' && typeof val === 'object') {
                Object.entries(val).forEach(([itemKey, itemFields]) => {
                    const card = document.createElement('div');
                    card.className = 'card border mb-3';
                    const hdr = document.createElement('div');
                    hdr.className = 'card-header py-2 d-flex align-items-center gap-2';
                    hdr.innerHTML = `<i class="fas fa-cog text-muted"></i><span class="fw-semibold text-secondary">${itemKey}</span>`;
                    const body = document.createElement('div');
                    body.className = 'card-body pt-3 pb-2';
                    card.appendChild(hdr);
                    card.appendChild(body);
                    container.appendChild(card);
                    /* walk item fields — prefix: cfg_alertInfo_survey, cfg_alertInfo_sign_off, … */
                    walkNode(`${prefix}_${itemKey}`, itemFields, body);
                });
                return;
            }

            /* ── NESTED GROUP: render as labeled section ── */
            if (val && typeof val === 'object') {
                const wrapper = document.createElement('div');
                wrapper.className = 'mb-4';
                wrapper.innerHTML =
                    `<h6 class="fw-semibold text-secondary border-bottom pb-1 mb-3 small">
                 <i class="fas fa-layer-group me-1 opacity-50"></i>${key}
               </h6>`;
                const inner = document.createElement('div');
                inner.className = 'ps-3';
                wrapper.appendChild(inner);
                container.appendChild(wrapper);
                walkNode(fieldId, val, inner);
            }
        });
    }

    /**
     * Render a single leaf field based on its meta.type.
     * Returns an HTML string.
     */
    function leafFieldHtml(id, label, meta) {
        const desc = meta.description || '';
        const def = meta.default || '';
        const descHtml = desc
            ? `<small class="text-muted fw-normal ms-1">${desc}</small>`
            : '';

        /* boolean → compact inline toggle row */
        if (meta.type === 'boolean') {
            return `
            <div class="d-flex align-items-start gap-3 mb-2 py-2 border-bottom">
              <div style="min-width:240px">
                <span class="fw-semibold">${label}</span>
                ${desc ? `<br><small class="text-muted">${desc}</small>` : ''}
              </div>
              <select id="${id}" class="form-select form-select-sm" style="max-width:110px">
                <option value="true"${def === 'true' ? ' selected' : ''}>✓ true</option>
                <option value="false"${def === 'false' ? ' selected' : ''}>✗ false</option>
              </select>
            </div>`;
        }

        /* string → single-line text input */
        if (meta.type === 'string') {
            return `
            <div class="mb-3">
              <label class="form-label fw-semibold mb-1">${label} ${descHtml}</label>
              <input id="${id}" class="form-control form-control-sm" value="${escXml(def)}">
            </div>`;
        }

        /* hex → textarea (raw HTML) + readonly input (hex) + encode/decode buttons */
        if (meta.type === 'hex') {
            return `
            <div class="cc-hex-field mb-4 p-3 border rounded bg-light">
              <label class="form-label fw-semibold mb-1">${label} ${descHtml}
                <span class="badge bg-warning text-dark ms-2 small">HEX</span>
              </label>
              <div class="d-flex gap-2 mb-2">
                <button type="button" class="btn btn-sm btn-outline-secondary"
                  data-role="hex-decode" data-target="${id}">&#8592; Decode</button>
                <button type="button" class="btn btn-sm btn-outline-primary"
                  data-role="hex-encode" data-target="${id}">Encode &#8594;</button>
              </div>
              <textarea id="${id}_raw" class="form-control form-control-sm mb-2 font-monospace" rows="3"
                placeholder="Paste HTML here, then click Encode →"></textarea>
              <input id="${id}" class="form-control form-control-sm font-monospace"
                data-hex-source="${id}_raw" readonly
                placeholder="Hex output (click Encode to generate)">
            </div>`;
        }

        return ''; /* unknown type — skip */
    }

    /* ─────────────────────────────────────────────────────────────────────
       FUNCTIONALITY TABLE  (Dialogs / Menu / Context)
       Compact role-toggle table — one row per group, driven by schema.
    ───────────────────────────────────────────────────────────────────── */
    function renderFunctionalityTable(section) {
        const el = document.getElementById('cc-table-' + section);
        if (!el || !_schema.sections[section]) return;

        const { functionalityGroups } = _schema.sections[section];
        const visibleGroups = !isAdminUser()
            ? functionalityGroups.filter(g => getFunctionalityShownType(g) !== 'superadmin')
            : functionalityGroups;

        /* collect every custom attr that appears in any group */
        const customAttrs = [];
        visibleGroups.forEach(g => {
            flattenAttrs(g.attributes || []).forEach(a => {
                if (!ROLES.includes(a) && a !== 'show' && a !== 'common_role' && !customAttrs.includes(a))
                    customAttrs.push(a);
            });
        });

        let html = `<div class="table-responsive">
          <table class="table table-sm table-bordered align-middle cc-func-table mb-0">
            <thead>
              <tr>
                <th style="min-width:160px">Group</th>
                <th>show</th>
                ${ROLES.map(r => `<th title="${r}">${ROLE_SHORT[r]}</th>`).join('')}
                ${customAttrs.map(a => `<th>${a}</th>`).join('')}
              </tr>
            </thead>
            <tbody>`;

        visibleGroups.forEach(g => {
            const attrSet = flattenAttrs(g.attributes || []);
            const hasRole = attrSet.has('common_role');
            const tag = g.type === 'functiongroup' ? 'fg' : 'fn';
            const badge = tag === 'fg'
                ? '<span class="badge bg-secondary" title="functiongroup">fg</span>'
                : '';
            const readableName = getReadableFunctionalityLabel(g.name);
            const readableDesc = g.desc || g.description || '';

            html += `<tr>
            <td>${badge} <strong>${readableName}</strong>${readableDesc ? `<div class="small text-muted">${readableDesc}</div>` : ''}</td>
            <td>${attrSet.has('show') ? roleSelect(section, g.name, 'show', 'true') : dash()}</td>
            ${ROLES.map(r => {
                const has = hasRole || attrSet.has(r);
                return `<td>${has ? roleSelect(section, g.name, r, 'true') : dash()}</td>`;
            }).join('')}
            ${customAttrs.map(a => {
                const has = attrSet.has(a);
                return `<td>${has ? roleSelect(section, g.name, a, 'false') : dash()}</td>`;
            }).join('')}
          </tr>`;
        });

        html += '</tbody></table></div>';
        el.innerHTML = html;
    }

    /* returns Set of attr keys present in an attributes array */
    function flattenAttrs(attrs) {
        const s = new Set();
        attrs.forEach(a => {
            if (typeof a === 'string') s.add(a);
            else if (typeof a === 'object') Object.keys(a).forEach(k => s.add(k));
        });
        return s;
    }

    function roleSelect(section, groupName, attr, defaultVal) {
        const id = `cfg_${section}_${groupName}_${attr}`;
        const t = defaultVal === 'true' ? ' selected' : '';
        const f = defaultVal === 'false' ? ' selected' : '';
        return `<select id="${id}" class="form-select form-select-sm cc-role-sel">
          <option value="true"${t}>✓ true</option>
          <option value="false"${f}>✗ false</option>
        </select>`;
    }

    function dash() { return '<span class="text-muted">—</span>'; }

    function getReadableFunctionalityLabel(name) {
        return String(name || '')
            .replace(/_/g, ' ')
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getFunctionalityShownType(group) {
        return String((group && (group['data-shown-type'] || group.dataShownType)) || '').toLowerCase();
    }

    /* ═══════════════════════════════════════════════
       XML GENERATION
    ═══════════════════════════════════════════════ */
    async function generate() {
        const customer = (document.getElementById('cfg_customer') || {}).value || '';
        if (!customer.trim()) { alert('Customer name is required — please fill in Tab 1.'); return; }
        const type = (document.getElementById('cfg_type') || {}).value || 'journals';
        const xml = buildXML(customer.trim(), type);

        if (typeof downloadXMLContent === 'function') {
            downloadXMLContent(xml, customer.trim() + '_config.xml');
        } else {
            /* fallback if admin-config.js not loaded yet */
            const blob = new Blob([xml], { type: 'application/xml' });
            const a = Object.assign(document.createElement('a'),
                { href: URL.createObjectURL(blob), download: customer.trim() + '_config.xml' });
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
    }

    function buildXML(customer, type) {
        return [
            '<?xml version="1.0" encoding="UTF-8"?>',
            `<impact customer="${escXml(customer)}">`,
            `\t<project type="${escXml(type)}">`,
            '\t\t<pages name="pages" />',
            buildDialogs(),
            buildMenuOption(),
            buildContextMenu(),
            buildShowItemsXml(),
            buildRootXml(),
            buildRulesXml(),
            buildStylesXml(),
            buildTemplatesXml(),
            buildAlertInfoXml(customer),
            buildCrossRefXml(),
            '\t\t<listofjournals>',
            '\t\t\t<!-- Add <journal short="..." abbr="..." journal-title="..."> entries here -->',
            '\t\t</listofjournals>',
            '\t</project>',
            '</impact>'
        ].join('\n');
    }

    function fillFromXML(sourceXml) {
        if (!_schema || !sourceXml) return;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(sourceXml, 'text/xml');
        if (xmlDoc.querySelector('parsererror')) return;

        const impact = xmlDoc.documentElement;
        const project = impact ? impact.querySelector('project') : null;

        setValue('cfg_customer', impact ? impact.getAttribute('customer') || '' : '');
        setValue('cfg_type', project ? project.getAttribute('type') || 'journals' : 'journals');

        fillFunctionalitySection('dialogs', xmlDoc);
        fillFunctionalitySection('menuoption', xmlDoc);
        fillFunctionalitySection('contextmenu', xmlDoc);
        fillNamedFieldGroup('cfg_showItems_', xmlDoc.querySelector('showItems'));
        fillNamedFieldGroup('cfg_root_', xmlDoc.querySelector('root'));
        fillTemplateSection(xmlDoc);
        fillAlertInfoSection(xmlDoc);
        fillCrossRefSection(xmlDoc);
    }

    /* ─── section builders ─────────────────────────────────── */
    function buildDialogs() {
        const sec = _schema.sections.dialogs;
        return [
            '\t\t<!-- MODULES -->',
            `\t\t<dialogs name="${sec.xmlAttr.name}">`,
            ...sec.functionalityGroups.map(g => buildFunctEl(g, 'dialogs')),
            '\t\t</dialogs>'
        ].join('\n');
    }

    function buildMenuOption() {
        const sec = _schema.sections.menuoption;
        return [
            `\t\t<menuoption type="${sec.xmlAttr.type}">`,
            ...sec.functionalityGroups.map(g => buildFunctEl(g, 'menuoption')),
            '\t\t</menuoption>'
        ].join('\n');
    }

    function buildContextMenu() {
        const sec = _schema.sections.contextmenu;
        const lines = [`\t\t<contextmenu type="${sec.xmlAttr.type}">`];
        sec.functionalityGroups.forEach(g => {
            const tag = g.type === 'functiongroup' ? 'functiongroup' : 'functionality';
            const attrs = collectAttrs(g, 'contextmenu');
            if (g.children && g.children.length) {
                lines.push(`\t\t\t<${tag} name="${g.name}"${attrsStr(attrs)}>`);
                g.children.forEach(child => {
                    /* children use schema attribute defaults — not editable in UI */
                    const cAttrs = defaultAttrsForChild(child);
                    lines.push(`\t\t\t\t<functionality name="${child.name}"${attrsStr(cAttrs)} />`);
                });
                lines.push(`\t\t\t</${tag}>`);
            } else {
                lines.push(`\t\t\t<${tag} name="${g.name}"${attrsStr(attrs)} />`);
            }
        });
        lines.push('\t\t</contextmenu>');
        return lines.join('\n');
    }

    function buildFunctEl(g, section) {
        const attrs = collectAttrs(g, section);
        return `\t\t\t<functionality name="${g.name}"${attrsStr(attrs)} />`;
    }

    /* read form selects and build attrs object */
    function collectAttrs(g, section) {
        const out = {};
        const attrSet = flattenAttrs(g.attributes || []);
        const shownType = getFunctionalityShownType(g);
        const readSel = k => {
            const el = document.getElementById(`cfg_${section}_${g.name}_${k}`);
            return el ? el.value : null;
        };

        if (attrSet.has('show') || shownType === 'superadmin') {
            const v = readSel('show');
            out.show = v || 'true';
        }
        if (attrSet.has('common_role')) {
            ROLES.forEach(r => { const v = readSel(r); if (v) out[r] = v || 'true'; });
        }
        attrSet.forEach(a => {
            if (a !== 'show' && a !== 'common_role' && !ROLES.includes(a)) {
                const v = readSel(a);
                if (v) out[a] = v;
            }
        });
        return out;
    }

    /* for functiongroup children not shown in UI, derive defaults from schema attrs */
    function defaultAttrsForChild(child) {
        const out = {};
        (child.attributes || []).forEach(a => {
            if (typeof a === 'string' && a !== 'common_role') {
                out[a] = 'true';
            } else if (typeof a === 'object') {
                Object.entries(a).forEach(([k, vals]) => {
                    out[k] = Array.isArray(vals) ? vals[0] : 'true';
                });
            }
        });
        return out;
    }

    function attrsStr(obj) {
        return Object.entries(obj).map(([k, v]) => ` ${k}="${escXml(v)}"`).join('');
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = value || '';
    }

    function setAttrsFromNode(prefix, node, attrSet) {
        if (!node || !attrSet) return;

        if (attrSet.has('show')) setValue(`cfg_${prefix}_show`, node.getAttribute('show') || '');
        if (attrSet.has('common_role')) {
            ROLES.forEach(r => setValue(`cfg_${prefix}_${r}`, node.getAttribute(r) || ''));
        }
        attrSet.forEach(attr => {
            if (attr === 'show' || attr === 'common_role' || ROLES.includes(attr)) return;
            setValue(`cfg_${prefix}_${attr}`, node.getAttribute(attr) || '');
        });
    }

    function setHexValue(id, value) {
        setEncodedValue(id, value, 'hex');
    }

    function setEncodedValue(id, value, encoding) {
        const encodedInput = document.getElementById(id);
        if (encodedInput) {
            encodedInput.value = value || '';
        }

        const rawInput = document.getElementById(`${id}_raw`);
        if (rawInput) {
            const normalizedEncoding = (encoding || (encodedInput && encodedInput.dataset.encoding) || 'hex').toLowerCase();
            rawInput.value = normalizedEncoding === 'base64'
                ? base64ToString(value)
                : hexToString(value);
        }
    }

    function fillNamedFieldGroup(prefix, node) {
        if (!node) return;
        Array.from(node.attributes || []).forEach(attr => {
            const el = document.getElementById(prefix + attr.name);
            if (el) el.value = attr.value || '';
        });
    }

    function fillFunctionalitySection(section, xmlDoc) {
        const sec = (_schema.sections || {})[section];
        if (!sec || !sec.functionalityGroups) return;

        const root = xmlDoc.querySelector(section) || xmlDoc.getElementsByTagName(section)[0];
        if (!root) return;

        sec.functionalityGroups.forEach(group => {
            const expectedTag = group.type === 'functiongroup' ? 'functiongroup' : 'functionality';
            const node = Array.from(root.children || []).find(el =>
                el.tagName &&
                el.tagName.toLowerCase() === expectedTag &&
                el.getAttribute('name') === group.name
            );
            if (!node) return;

            const attrSet = flattenAttrs(group.attributes || []);
            setAttrsFromNode(`${section}_${group.name}`, node, attrSet);

            if (group.children && group.children.length) {
                group.children.forEach(child => {
                    const childNode = Array.from(node.children || []).find(el =>
                        el.tagName &&
                        el.tagName.toLowerCase() === 'functionality' &&
                        el.getAttribute('name') === child.name
                    );
                    if (!childNode) return;

                    const childAttrSet = flattenAttrs(child.attributes || []);
                    setAttrsFromNode(`${section}_${group.name}_${child.name}`, childNode, childAttrSet);
                });
            }
        });
    }

    function fillTemplateSection(xmlDoc) {
        const tmplRoot = xmlDoc.querySelector('templtaes-elements');
        if (!tmplRoot) return;

        const shareInvite = tmplRoot.querySelector('shareInvite');
        if (shareInvite) {
            ['comment', 'defaultShare', 'coroleShare', 'emailSubject', 'coroleSignature'].forEach(key => {
                const val = shareInvite.getAttribute(key) || '';
                if (key === 'emailSubject') {
                    setValue(`cfg_tmpl_shareInvite_${key}`, val);
                } else {
                    setHexValue(`cfg_tmpl_shareInvite_${key}`, val);
                }
            });
        }

        const authorGroup = tmplRoot.querySelector('author-group');
        if (authorGroup) {
            ['author', 'with_xref', 'with_o_xref'].forEach(key => {
                setHexValue(`cfg_tmpl_author-group_${key}`, authorGroup.getAttribute(key) || '');
            });
        }

        const floats = tmplRoot.querySelector('floats');
        if (floats) {
            ['a', 'note'].forEach(key => setHexValue(`cfg_tmpl_floats_${key}`, floats.getAttribute(key) || ''));

            const fig = floats.querySelector('fig');
            if (fig) {
                ['root', 'caption'].forEach(key => setHexValue(`cfg_tmpl_floats_fig_${key}`, fig.getAttribute(key) || ''));
            }

            const tableWrap = floats.querySelector('table-wrap');
            if (tableWrap) {
                ['header', 'body', 'root', 'caption', 'row', 'td', 'th', 'wrap_foot', 'FootGroup', 'colgroup', 'col'].forEach(key => {
                    setHexValue(`cfg_tmpl_floats_table-wrap_${key}`, tableWrap.getAttribute(key) || '');
                });
            }

            const notes = floats.querySelector('notes');
            if (notes) {
                ['sup_a', 'fn', 'entry'].forEach(key => setHexValue(`cfg_tmpl_floats_notes_${key}`, notes.getAttribute(key) || ''));
                const footnotes = notes.querySelector('footnotes');
                if (footnotes) setHexValue('cfg_tmpl_floats_notes_footnotes_root', footnotes.getAttribute('root') || '');
                const endnotes = notes.querySelector('endnotes');
                if (endnotes) setHexValue('cfg_tmpl_floats_notes_endnotes_root', endnotes.getAttribute('root') || '');
            }
        }
    }

    function fillAlertInfoSection(xmlDoc) {
        const root = xmlDoc.querySelector('alertInfo-message-redirectlink') ||
            xmlDoc.getElementsByTagName('alertInfo-message-redirectlink')[0];
        if (!root) return;

        const schemaItems = (((_schema.sections || {})['alertInfo-message-redirectlink'] || {}).items) || {};
        const base64Keys = new Set(['mail-bcc', 'external-mail']);
        const aliasMap = {
            'mail-bcc': ['mail-bcc', 'mailBcc'],
            'external-mail': ['external-mail', 'externalMail']
        };

        Array.from(root.querySelectorAll('item')).forEach(item => {
            const itemName = item.getAttribute('name') || '';
            const itemSchema = schemaItems[itemName] || {};
            const prefix = `cfg_alertInfo_${itemName}`;

            Object.entries(itemSchema).forEach(([key, meta]) => {
                if (META_KEYS.has(key)) return;

                const el = document.getElementById(`${prefix}_${key}`);
                if (!el) return;

                const candidates = aliasMap[key] || [key];
                let value = '';
                for (const candidate of candidates) {
                    const attrNode = item.getAttributeNode(candidate);
                    if (attrNode) {
                        value = attrNode.value || '';
                        break;
                    }
                }

                if (!value && itemName === 'sign_off' && key === 'default') {
                    value = `validateurl${document.getElementById('cfg_customer')?.value || ''}.html?key=`;
                }

                if (meta.type === 'hex') {
                    setEncodedValue(`${prefix}_${key}`, value, base64Keys.has(key) ? 'base64' : 'hex');
                } else if (meta.type === 'boolean') {
                    el.value = value || meta.default || 'false';
                } else {
                    el.value = value || '';
                }
            });
        });
    }

    function fillCrossRefSection(xmlDoc) {
        const node = xmlDoc.querySelector('cross_ref_api') || xmlDoc.getElementsByTagName('cross_ref_api')[0];
        if (!node) return;
        setHexValue('cfg_crossRef_pid', node.getAttribute('pid') || '');
    }

    /* showItems */
    function buildShowItemsXml() {
        const fields = (_schema.sections.showItems || {}).fields || {};
        const parts = Object.keys(fields).map(k => {
            const el = document.getElementById('cfg_showItems_' + k);
            return el ? `${k}="${escXml(el.value)}"` : null;
        }).filter(Boolean).join(' ');
        return `\t\t<showItems name="Generate_Items" ${parts} />`;
    }

    /* root */
    function buildRootXml() {
        const fields = (_schema.sections.root || {}).fields || {};
        const parts = Object.keys(fields).map(k => {
            const el = document.getElementById('cfg_root_' + k);
            return el ? `${k}="${escXml(el.value)}"` : null;
        }).filter(Boolean).join(' ');
        return `\t\t<root name="root-tags" ${parts} />`;
    }

    /* rules — static defaults, not user-editable */
    function buildRulesXml() {
        return `\t\t<rules type="keybinding-rules-set-by-client">
\t\t\t<restricted-by-elements>
\t\t\t\t<ForAU selector=".subject,.subj-group, .history .date, .date .day, .date .month, .date .year, .permissions .copyright-statement, .permissions .copyright-year,.permissions .license, .permissions .license-p, .kwd-group .title" FindReplace=".alt-title, .contrib-group, .title-group, .title, .subject, .xref, .corresp, .fn" />
\t\t\t\t<ForPE selector=".subject,.subj-group" history-date-editable="true" />
\t\t\t\t<ForED selector=".subject,.subj-group" history-date-editable="true" />
\t\t\t\t<ForCO selector=".subject,.subj-group" history-date-editable="true" />
\t\t\t\t<ForCE selector=".subject,.subj-group" />
\t\t\t\t<ForJM selector=".subject,.subj-group" />
\t\t\t\t<ForPR selector=".subject,.subj-group" />
\t\t\t</restricted-by-elements>
\t\t</rules>`;
    }

    /* styles — static defaults */
    function buildStylesXml() {
        return `\t\t<styles name="style-list">
\t\t\t<title class="title" data-name="title" />
\t\t\t<h1 class="sec" data-name="sec" data-levels="1" />
\t\t\t<h2 class="sec" data-name="sec" data-levels="2" />
\t\t\t<h3 class="sec" data-name="sec" data-levels="3" />
\t\t\t<h4 class="sec" data-name="sec" data-levels="4" />
\t\t\t<h5 class="sec" data-name="sec" data-levels="5" />
\t\t\t<h6 class="sec" data-name="sec" data-levels="6" />
\t\t\t<p class="p" data-name="p" content-type="flush-left" />
\t\t\t<extract class="disp-quote" data-name="disp-quote" />
\t\t\t<source class="p" data-name="p" content-type="source" />
\t\t\t<email class="email" data-name="email" />
\t\t\t<link class="uri" data-name="uri" target="_blank" />
\t\t</styles>`;
    }

    /* templtaes-elements — IDs driven by walkNode's cfg_tmpl_* convention */
    function buildTemplatesXml() {
        const r = id => { const el = document.getElementById(id); return el ? el.value : ''; };
        const tmpl = (_schema.sections || {})['templtaes-elements'] || {};

        /* shareInvite: one attr per key in schema */
        const si = tmpl.shareInvite || {};
        const siStr = Object.keys(si).map(k =>
            ` ${k}="${escXml(r('cfg_tmpl_shareInvite_' + k))}"`).join('');

        /* author-group */
        const ag = tmpl['author-group'] || {};
        const agStr = Object.keys(ag).map(k =>
            ` ${k}="${escXml(r('cfg_tmpl_author-group_' + k))}"`).join('');

        /* floats — top-level leaf attrs (a, note) */
        const fl = tmpl.floats || {};
        const floatLeafStr = Object.entries(fl)
            .filter(([, v]) => v && typeof v.type === 'string')
            .map(([k]) => ` ${k}="${r('cfg_tmpl_floats_' + k)}"`)
            .join('');

        /* floats.fig */
        const fig = fl.fig || {};
        const figStr = Object.entries(fig)
            .filter(([, v]) => v && typeof v.type === 'string')
            .map(([k]) => ` ${k}="${r('cfg_tmpl_floats_fig_' + k)}"`)
            .join('');

        /* floats.table-wrap */
        const tw = fl['table-wrap'] || {};
        const twStr = Object.entries(tw)
            .filter(([, v]) => v && typeof v.type === 'string')
            .map(([k]) => ` ${k}="${r('cfg_tmpl_floats_table-wrap_' + k)}"`)
            .join('');

        /* floats.notes — leaf attrs at notes level */
        const notes = fl.notes || {};
        const noteLeafStr = Object.entries(notes)
            .filter(([, v]) => v && typeof v.type === 'string')
            .map(([k]) => ` ${k}="${r('cfg_tmpl_floats_notes_' + k)}"`)
            .join('');

        const fnRoot = r('cfg_tmpl_floats_notes_footnotes_root');
        const enRoot = r('cfg_tmpl_floats_notes_endnotes_root');

        return `\t\t<templtaes-elements ref-site="codebeautify.org/string-hex-converter">
\t\t\t<shareInvite${siStr} />
\t\t\t<author-group${agStr} />
\t\t\t<floats${floatLeafStr}>
\t\t\t\t<fig${figStr} />
\t\t\t\t<table-wrap${twStr} />
\t\t\t\t<notes${noteLeafStr}>
\t\t\t\t\t<footnotes root="${fnRoot}" />
\t\t\t\t\t<endnotes root="${enRoot}" />
\t\t\t\t</notes>
\t\t\t</floats>
\t\t</templtaes-elements>`;
    }

    /* alertInfo — dynamically walks schema.items; IDs follow cfg_alertInfo_{item}_{key} */
    function buildAlertInfoXml(customer) {
        const r = id => { const el = document.getElementById(id); return el ? el.value : ''; };
        const items = ((_schema.sections || {})['alertInfo-message-redirectlink'] || {}).items || {};
        const lines = ['\t\t<alertInfo-message-redirectlink>'];

        Object.entries(items).forEach(([itemName, fields]) => {
            const prefix = `cfg_alertInfo_${itemName}`;
            const attrParts = Object.entries(fields).map(([k, meta]) => {
                if (META_KEYS.has(k)) return null;
                let val = r(`${prefix}_${k}`);
                /* fallback for sign_off default redirect URL */
                if (!val && itemName === 'sign_off' && k === 'default')
                    val = `validateurl${customer}.html?key=`;
                return ` ${k}="${escXml(val)}"`;
            }).filter(Boolean).join('');
            lines.push(`\t\t\t<item name="${escXml(itemName)}"${attrParts} />`);
        });

        lines.push('\t\t</alertInfo-message-redirectlink>');
        return lines.join('\n');
    }

    /* cross_ref_api — ID follows cfg_crossRef_pid */
    function buildCrossRefXml() {
        const el = document.getElementById('cfg_crossRef_pid');
        return `\t\t<cross_ref_api pid="${el ? el.value : ''}" />`;
    }

    /* ── utilities ── */
    function escXml(s) {
        return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

})();

/**
 * In-memory config hierarchy for UI (backend wiring comes later).
 * Client → Journal → Field → Template
 */
(function () {
    'use strict';

    const store = {
        clients: [
            { client_code: 'OUP', client_name: 'Oxford University Press' },
            { client_code: 'CUP', client_name: 'Cambridge University Press' }
        ],
        templates: [
            { template_id: 1, template_code: 'author_group', template_name: 'Author Group Template' }
        ],
        journals: [
            {
                journal_code: 'JCM',
                journal_name: 'Journal of Cardiovascular Medicine',
                client_code: 'OUP',
                template_id: 1
            }
        ],
        template_config: [
            { id: 1, template_id: 1, template_code: 'author_group', config_group: 'author', config_key: 'orcid', config_value: 'yes', value_type: 'string' },
            { id: 2, template_id: 1, template_code: 'author_group', config_group: 'author', config_key: 'role', config_value: 'yes', value_type: 'string' },
            { id: 3, template_id: 1, template_code: 'author_group', config_group: 'figure.dircite', config_key: 'single_prefix', config_value: 'Fig.', value_type: 'string' }
        ],
        journal_override: [],
        config_audit: []
    };

    let nextId = { template_config: 4, journal_override: 1, templates: 2, config_audit: 1 };

    function templateById(id) {
        return store.templates.find(t => t.template_id === id) || null;
    }

    function getStats() {
        return {
            clients: store.clients.length,
            journals: store.journals.length,
            templates: store.templates.length,
            template_config: store.template_config.length,
            journal_override: store.journal_override.length,
            config_audit: store.config_audit.length
        };
    }

    function getJournalFields(journalCode) {
        const journal = store.journals.find(j => j.journal_code === journalCode);
        if (!journal) return [];

        const templateFields = (journal.template_id
            ? store.template_config.filter(f => f.template_id === journal.template_id)
            : []
        ).map(f => ({
            ...f,
            source: 'template',
            journal_code: journalCode,
            template_code: f.template_code || (templateById(f.template_id) || {}).template_code
        }));

        const overrides = store.journal_override
            .filter(f => f.journal_code === journalCode)
            .map(f => ({
                ...f,
                source: 'override',
                template_id: journal.template_id,
                template_code: (templateById(journal.template_id) || {}).template_code
            }));

        return [...templateFields, ...overrides];
    }

    function getDashboardHierarchy() {
        return store.clients.map(client => {
            const journals = store.journals
                .filter(j => j.client_code === client.client_code)
                .map(journal => {
                    const tpl = templateById(journal.template_id);
                    const fields = getJournalFields(journal.journal_code);
                    const templateFields = fields.filter(f => f.source === 'template');
                    const overrideFields = fields.filter(f => f.source === 'override');
                    return {
                        journal_code: journal.journal_code,
                        journal_name: journal.journal_name,
                        client_code: journal.client_code,
                        template_id: journal.template_id,
                        template_code: tpl ? tpl.template_code : null,
                        template_name: tpl ? tpl.template_name : null,
                        template_field_count: templateFields.length,
                        override_count: overrideFields.length,
                        total_field_count: fields.length,
                        fields
                    };
                });

            return {
                client_code: client.client_code,
                client_name: client.client_name,
                journal_count: journals.length,
                journals
            };
        });
    }

    function listClients() { return store.clients.slice(); }
    function listJournals(clientCode) {
        return clientCode
            ? store.journals.filter(j => j.client_code === clientCode)
            : store.journals.slice();
    }
    function listTemplates() { return store.templates.slice(); }
    function listFields(journalCode) {
        if (journalCode) return getJournalFields(journalCode);
        return store.template_config.map(f => ({
            ...f,
            source: 'template',
            template_code: f.template_code || (templateById(f.template_id) || {}).template_code
        })).concat(store.journal_override.map(f => ({
            ...f,
            source: 'override'
        })));
    }

    function countTemplateFields(templateId) {
        return store.template_config.filter(f => f.template_id === Number(templateId)).length;
    }

    function saveClient(payload) {
        const code = String(payload.client_code || '').trim().toUpperCase();
        if (!code) return { ok: false, message: 'Client code is required.' };
        const existing = store.clients.find(c => c.client_code === code);
        const row = { client_code: code, client_name: String(payload.client_name || code).trim() };
        if (existing) Object.assign(existing, row);
        else store.clients.push(row);
        return { ok: true, data: row };
    }

    function deleteClient(clientCode) {
        const code = String(clientCode || '').trim();
        const used = store.journals.some(j => j.client_code === code);
        if (used) return { ok: false, message: 'Remove journals first.' };
        store.clients = store.clients.filter(c => c.client_code !== code);
        return { ok: true };
    }

    function saveJournal(payload) {
        const code = String(payload.journal_code || '').trim().toUpperCase();
        const clientCode = String(payload.client_code || '').trim().toUpperCase();
        if (!code || !clientCode) return { ok: false, message: 'Journal code and client are required.' };
        if (!store.clients.some(c => c.client_code === clientCode)) {
            return { ok: false, message: 'Client does not exist.' };
        }
        const templateId = payload.template_id ? Number(payload.template_id) : null;
        const existing = store.journals.find(j => j.journal_code === code);
        const row = {
            journal_code: code,
            journal_name: String(payload.journal_name || code).trim(),
            client_code: clientCode,
            template_id: templateId
        };
        if (existing) Object.assign(existing, row);
        else store.journals.push(row);
        return { ok: true, data: row };
    }

    function deleteJournal(journalCode) {
        const code = String(journalCode || '').trim();
        store.journal_override = store.journal_override.filter(f => f.journal_code !== code);
        store.journals = store.journals.filter(j => j.journal_code !== code);
        return { ok: true };
    }

    function saveField(payload) {
        const journalCode = String(payload.journal_code || '').trim().toUpperCase();
        const group = String(payload.config_group || '').trim();
        const key = String(payload.config_key || '').trim();
        if (!journalCode || !group || !key) {
            return { ok: false, message: 'Journal, group, and key are required.' };
        }
        const source = payload.source === 'override' ? 'override' : 'template';
        const value = String(payload.config_value != null ? payload.config_value : '').trim();
        const journal = store.journals.find(j => j.journal_code === journalCode);

        if (source === 'override') {
            let row = store.journal_override.find(f =>
                f.journal_code === journalCode && f.config_group === group && f.config_key === key
            );
            if (row) row.config_value = value;
            else {
                row = { id: nextId.journal_override++, journal_code: journalCode, config_group: group, config_key: key, config_value: value };
                store.journal_override.push(row);
            }
            return { ok: true, data: row };
        }

        const templateId = Number(payload.template_id || (journal && journal.template_id) || 0);
        const tpl = templateById(templateId);
        let row = store.template_config.find(f =>
            f.template_id === templateId && f.config_group === group && f.config_key === key
        );
        if (row) row.config_value = value;
        else {
            row = {
                id: nextId.template_config++,
                template_id: templateId,
                template_code: tpl ? tpl.template_code : '',
                config_group: group,
                config_key: key,
                config_value: value,
                value_type: payload.value_type || 'string'
            };
            store.template_config.push(row);
        }
        return { ok: true, data: row };
    }

    function deleteField(payload) {
        const source = payload.source;
        const id = Number(payload.id);
        if (source === 'override') {
            store.journal_override = store.journal_override.filter(f => f.id !== id);
        } else {
            store.template_config = store.template_config.filter(f => f.id !== id);
        }
        return { ok: true };
    }

    function saveTemplate(payload) {
        const code = String(payload.template_code || '').trim();
        if (!code) return { ok: false, message: 'Template code is required.' };
        let row = store.templates.find(t => t.template_code === code);
        if (row) {
            row.template_name = String(payload.template_name || row.template_name).trim();
        } else {
            row = { template_id: nextId.templates++, template_code: code, template_name: String(payload.template_name || code).trim() };
            store.templates.push(row);
        }
        return { ok: true, data: row };
    }

    function deleteTemplate(templateId) {
        const id = Number(templateId);
        const used = store.journals.some(j => j.template_id === id);
        if (used) return { ok: false, message: 'Template is linked to journals.' };
        store.template_config = store.template_config.filter(f => f.template_id !== id);
        store.templates = store.templates.filter(t => t.template_id !== id);
        return { ok: true };
    }

    window.ConfigMgmtModel = {
        getStats,
        getDashboardHierarchy,
        getJournalFields,
        listClients,
        listJournals,
        listFields,
        listTemplates,
        templateById,
        countTemplateFields,
        saveClient,
        deleteClient,
        saveJournal,
        deleteJournal,
        saveField,
        deleteField,
        saveTemplate,
        deleteTemplate
    };
})();

