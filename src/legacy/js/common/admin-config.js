/**
 * Admin Configuration Manager
 * Handles CRUD operations for client and journal XML configurations
 * @author Newgen KnowledgeWorks
 * @version 1.0.0
 */

// Global variables
let xmlEditor = null;
let currentFile = null;
let originalXMLContent = null;
let configData = {
    clients: [],
    journals: {},
    history: []
};
var iVersion = `${{ VERSION }}$`;
var USER_MAIL = localStorage.getItem('xmleditor:login_username'),
    USER_DISPLAYNAME = localStorage.getItem('xmleditor:login_displayname'),
    USER_ID = localStorage.getItem('xmleditor:login_userid'),
    WF_ROLE = localStorage.getItem('xmleditor:login_workflow_role'),
    WF_CLIENT_LIST = localStorage.getItem('xmleditor:login_client_list');
const superAdmin = WF_ROLE == "superadmin";
if (WF_CLIENT_LIST) WF_CLIENT_LIST = WF_CLIENT_LIST.split(",");




// Configuration paths
const CONFIG_PATHS = {
    journals: {
        lww: 'assets/' + iVersion + '/config/journals/lww/config.xml',
        oup: 'assets/' + iVersion + '/config/journals/oup/config.xml',
        plos: 'assets/' + iVersion + '/config/journals/plos/config.xml',
        medknow: 'assets/' + iVersion + '/config/journals/medknow/config.xml',
        brill: 'assets/' + iVersion + '/config/journals/brill/config.xml',
        tnfjournals: 'assets/' + iVersion + '/config/journals/tnfjournals/config.xml',
        acs: 'assets/' + iVersion + '/config/journals/acs/config.xml',
        // apa: 'assets/' + iVersion + '/config/journals/apa/config.xml',
        intellect: 'assets/' + iVersion + '/config/journals/intellect/config.xml',
        // nihr: 'assets/' + iVersion + '/config/journals/nihr/config.xml',
    },
    books: {
        oso: 'assets/' + iVersion + '/config/books/oso/config.xml',
        tnf: 'assets/' + iVersion + '/config/books/tnf/config.xml',
        oho: 'assets/' + iVersion + '/config/books/oho/config.xml',
        oxmedo: 'assets/' + iVersion + '/config/books/oxmedo/config.xml',
        lse: 'assets/' + iVersion + '/config/books/lse/config.xml',
    }
};
const ADMIN_CONFIG_ACTIVITY_TABLE = 'admin_config_activity';

const configManagementState = {
    lastAction: 'Idle',
    lastStatus: 'Waiting',
    lastMeta: 'No request executed yet.',
    activeTab: 'dashboard',
    selectedClient: '',
    selectedJournal: '',
    selectedField: null,
    selectedTemplateId: null
};

function getConfigMgmtModel() {
    return typeof ConfigMgmtModel !== 'undefined' ? ConfigMgmtModel : null;
}

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', function () {
    initializeCodeMirror();
    initializeUserProfile();
    initializeConfigManagementUI();
    initializeSidebarModeToggle();
    loadDashboardData();
    setupEventListeners();
    loadClientList();
    populateXMLFileSelector();
    populateValidationFileSelector();
    populateExistingClientSelector();
    populateClientCloneSelector();
    applyCreateConfigDefaults();

    // Trigger configType change to set initial UI state based on default value
    const configTypeEl = document.getElementById('configType');
    console.log('[DEBUG] Initializing - configTypeEl found:', !!configTypeEl);
    if (configTypeEl) {
        console.log('[DEBUG] Dispatching initial change event on configType');
        configTypeEl.dispatchEvent(new Event('change'));
    }
});

/**
 * Initialize CodeMirror XML Editor
 */
function initializeCodeMirror() {
    const textarea = document.getElementById('xmlEditor');
    if (textarea) {
        xmlEditor = CodeMirror.fromTextArea(textarea, {
            mode: 'xml',
            theme: 'monokai',
            lineNumbers: true,
            lineWrapping: true,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            autoCloseTags: true,
            indentUnit: 4,
            tabSize: 4,
            indentWithTabs: true,
            extraKeys: {
                'Ctrl-Q': function (cm) {
                    cm.foldCode(cm.getCursor());
                },
                'Ctrl-S': function (cm) {
                    saveXMLFile();
                },
                'Ctrl-F': 'findPersistent'
            }
        });

        xmlEditor.setSize(null, '600px');

        // Track changes
        xmlEditor.on('change', function () {
            markAsModified();
        });
    }
}


function setupEventListeners() {
    // Search functionality
    const searchBox = document.getElementById('sidebarSearch');
    if (searchBox) {
        searchBox.addEventListener('input', function (e) {
            filterSidebarItems(e.target.value);
        });
    }

    // Config Type Change
    const configType = document.getElementById('configType');
    if (configType) {
        configType.addEventListener('change', function (e) {
            console.log('[DEBUG] configType change event fired, value:', e.target.value);
            const isJournal = e.target.value === 'journal';
            const inputContainer = document.getElementById('clientInputContainer');
            const selectContainer = document.getElementById('clientSelectContainer');

            if (inputContainer && selectContainer) {
                inputContainer.style.display = isJournal ? 'none' : 'block';
                selectContainer.style.display = isJournal ? 'block' : 'none';
                console.log('[DEBUG] Toggled containers - isJournal:', isJournal);
            }

            // Trigger change to load templates if one is already selected
            const clientSelect = document.getElementById('existingClientSelect');
            console.log('[DEBUG] clientSelect value:', clientSelect ? clientSelect.value : 'null');
            if (isJournal && clientSelect && clientSelect.value) {
                console.log('[DEBUG] Triggering clientSelect change event');
                clientSelect.dispatchEvent(new Event('change'));
            }
        });
    }

    // Existing Client Select Change (for Journal creation)
    const existingClientSelect = document.getElementById('existingClientSelect');
    if (existingClientSelect) {
        existingClientSelect.addEventListener('change', function (e) {
            console.log('[DEBUG] existingClientSelect change event fired, value:', e.target.value);
            loadClientJournalsForTemplate(e.target.value);
        });
    }

    const cloneSourceSelect = document.getElementById('cfg_clone_source');
    if (cloneSourceSelect) {
        cloneSourceSelect.addEventListener('change', function (e) {
            applyClientCloneSource(e.target.value);
        });
    }

    // Create config form
    const createForm = document.getElementById('createConfigForm');
    if (createForm) {
        createForm.addEventListener('submit', function (e) {
            e.preventDefault();
            createNewConfiguration();
        });
    }

    // Create-new section switcher
    const createSwitcherButtons = document.querySelectorAll('.create-config-switcher-btn');
    if (createSwitcherButtons.length) {
        createSwitcherButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', function () {
                syncCreateConfigView(this.dataset.view);
            });
        });
        showCreateConfigTab('client');
    }

    window.addEventListener('beforeunload', function (e) {
        if (isModified()) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });
}

function isConfigMgmtSuperAdmin() {
    if (typeof isAdminUser === 'function' && isAdminUser()) return true;
    const adminFlag = String(localStorage.getItem('xmleditor:admin') || '').toLowerCase();
    if (adminFlag === 'superadmin') return true;
    const role = String(typeof WF_ROLE !== 'undefined' ? WF_ROLE : '').toLowerCase();
    return role === 'superadmin' || !!superAdmin;
}

function applyConfigMgmtSuperAdminUi() {
    const allowed = isConfigMgmtSuperAdmin();
    document.querySelectorAll('#view-config-management .cm-superadmin-only').forEach((node) => {
        node.classList.toggle('d-none', !allowed);
    });
    if (!allowed) {
        hideConfigManagementResultsPanel();
    }
}

function showConfigManagementResultsPanel() {
    if (!isConfigMgmtSuperAdmin()) return;
    const wrap = document.getElementById('cmApiResultsWrap');
    if (wrap) wrap.classList.remove('d-none');
}

function hideConfigManagementResultsPanel() {
    const wrap = document.getElementById('cmApiResultsWrap');
    if (wrap) wrap.classList.add('d-none');
}

function filterConfigApiPayloadForDisplay(payload) {
    if (!payload || typeof payload !== 'object') return payload;

    const records = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload.data) ? payload.data
            : (Array.isArray(payload.records) ? payload.records
                : (Array.isArray(payload.items) ? payload.items : null)));

    if (!records) return payload;

    const isSuperAdminRecord = (record) => {
        if (!record || typeof record !== 'object') return false;
        const role = String(record.role || record.userRole || record.workflow_role || record.wf_role || '').toLowerCase();
        const user = String(record.user || record.username || record.login || record.updated_by || record.actor || '').toLowerCase();
        if (/super\s*_?\s*admin|superadmin/.test(role)) return true;
        const ids = (window.ADMIN_USER_IDs || []).map(id => String(id).toLowerCase());
        const prefix = user.split('@')[0];
        return ids.some(id => user.includes(id) || prefix === id);
    };

    const filtered = records.filter(isSuperAdminRecord);
    if (Array.isArray(payload)) return filtered;
    if (Array.isArray(payload.data)) return { ...payload, data: filtered };
    if (Array.isArray(payload.records)) return { ...payload, records: filtered };
    if (Array.isArray(payload.items)) return { ...payload, items: filtered };
    return payload;
}

function initializeConfigManagementUI() {
    syncConfigPathDisplay();
    updateConfigApiHint();
    applyConfigMgmtSuperAdminUi();
    switchConfigManagementTab(configManagementState.activeTab || 'dashboard', { skipLoad: true });
    if (typeof setSqliteHealthIndicator === 'function') {
        setSqliteHealthIndicator(null);
    }
    if (typeof refreshSQLiteHealth === 'function') {
        refreshSQLiteHealth({ silent: true });
    }
    refreshConfigMgmtUi();
    hideConfigManagementResultsPanel();
}

function switchConfigManagementTab(tabId, options = {}) {
    const tab = tabId || 'dashboard';
    configManagementState.activeTab = tab;

    document.querySelectorAll('#cmMainTabs [data-cm-tab]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.cmTab === tab);
    });

    document.querySelectorAll('#view-config-management .cm-tab-panel').forEach((panel) => {
        const panelTab = panel.id.replace('cm-panel-', '');
        panel.classList.toggle('d-none', panelTab !== tab);
    });

    if (tab === 'system') {
        syncConfigPathDisplay();
    }

    if (options.skipLoad) return;

    refreshConfigMgmtTab(tab);
}

function refreshConfigMgmtTab(tab) {
    switch (tab) {
        case 'dashboard':
            loadConfigManagementDashboard();
            break;
        case 'clients':
            renderClientsTab();
            break;
        case 'journals':
            renderJournalsTab();
            break;
        case 'fields':
            renderFieldsTab();
            break;
        case 'templates':
            renderTemplatesTab();
            break;
        default:
            break;
    }
    updateConfigMgmtContextBar();
}

function refreshConfigMgmtUi() {
    refreshConfigMgmtTab(configManagementState.activeTab || 'dashboard');
    updateConfigMgmtFlowPipeline();
}

function updateConfigMgmtContextBar() {
    const model = getConfigMgmtModel();
    const s = configManagementState;
    const setChip = (id, label, active) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = label;
        el.classList.toggle('active', !!active);
        el.classList.toggle('muted', !active);
    };

    setChip('cmCtxAll', 'All', !s.selectedClient && !s.selectedJournal);
    setChip('cmCtxClient', s.selectedClient || 'Client', !!s.selectedClient);
    setChip('cmCtxJournal', s.selectedJournal || 'Journal', !!s.selectedJournal);
    setChip('cmCtxField', s.selectedField ? `${s.selectedField.config_key}` : 'Field', !!s.selectedField);

    let tplLabel = 'Template';
    if (model && s.selectedJournal) {
        const j = model.listJournals().find(x => x.journal_code === s.selectedJournal);
        const tpl = j && j.template_id ? model.templateById(j.template_id) : null;
        if (tpl) tplLabel = tpl.template_code;
    } else if (s.selectedTemplateId && model) {
        const tpl = model.templateById(s.selectedTemplateId);
        if (tpl) tplLabel = tpl.template_code;
    }
    setChip('cmCtxTemplate', tplLabel, tplLabel !== 'Template');
}

function updateConfigMgmtFlowPipeline() {
    const el = document.getElementById('cmFlowPipeline');
    const model = getConfigMgmtModel();
    if (!el || !model) return;

    const stats = model.getStats();
    const totalFields = stats.template_config + stats.journal_override;
    const steps = [
        { key: 'clients', icon: 'fa-building', label: 'Clients', count: stats.clients, tab: 'clients' },
        { key: 'journals', icon: 'fa-book', label: 'Journals', count: stats.journals, tab: 'journals' },
        { key: 'fields', icon: 'fa-list-ul', label: 'Fields', count: totalFields, tab: 'fields' },
        { key: 'templates', icon: 'fa-layer-group', label: 'Templates', count: stats.templates, tab: 'templates' }
    ];

    el.innerHTML = steps.map((step, i) => `
        ${i ? '<div class="cm-flow-arrow"><i class="fas fa-long-arrow-alt-right"></i></div>' : ''}
        <button type="button" class="cm-flow-step" onclick="switchConfigManagementTab('${step.tab}')">
            <i class="fas ${step.icon}"></i>
            <span class="cm-flow-count">${step.count}</span>
            <span class="cm-flow-label">${step.label}</span>
        </button>
    `).join('');
}

function applyDashboardStats(stats) {
    const totalFields = (stats.template_config || 0) + (stats.journal_override || 0);
    const map = {
        cmStatClients: stats.clients,
        cmStatJournals: stats.journals,
        cmStatTemplates: stats.templates,
        cmStatTemplateConfig: totalFields,
        cmStatOverrides: stats.journal_override,
        cmStatAudit: stats.config_audit
    };
    Object.entries(map).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value == null ? '—' : String(value);
    });
    updateConfigMgmtFlowPipeline();
}

function renderHierarchyTreeHtml(clients) {
    if (!clients || !clients.length) {
        return '<p class="text-muted mb-0">No clients configured yet.</p>';
    }

    return clients.map((client) => {
        const journalBlocks = (client.journals || []).map((journal) => {
            const fieldItems = (journal.fields || []).map((f) => `
                <li class="cm-tree-field">
                    <button type="button" class="cm-tree-link" onclick="cmSelectField('${escapeHtml(journal.journal_code)}','${escapeHtml(f.source)}',${f.id})">
                        <code>${escapeHtml(f.config_group)}.${escapeHtml(f.config_key)}</code>
                        <span class="text-muted">→ ${escapeHtml(f.config_value || '')}</span>
                    </button>
                    <span class="badge bg-light text-dark border ms-1">${escapeHtml(f.template_code || '—')}</span>
                </li>
            `).join('') || '<li class="text-muted small">No fields</li>';

            return `
                <li class="cm-tree-journal">
                    <button type="button" class="cm-tree-link fw-semibold" onclick="cmSelectJournal('${escapeHtml(client.client_code)}','${escapeHtml(journal.journal_code)}')">
                        <i class="fas fa-book-open me-1"></i>${escapeHtml(journal.journal_code)} — ${escapeHtml(journal.journal_name)}
                    </button>
                    <span class="badge bg-info ms-1">${escapeHtml(journal.template_code || 'no template')}</span>
                    <ul class="cm-tree-fields">${fieldItems}</ul>
                </li>
            `;
        }).join('') || '<li class="text-muted small">No journals mapped</li>';

        return `
            <div class="cm-tree-client mb-3">
                <button type="button" class="cm-tree-link cm-tree-client-btn" onclick="cmSelectClient('${escapeHtml(client.client_code)}')">
                    <i class="fas fa-building me-1"></i>${escapeHtml(client.client_name)}
                    <code class="ms-1">${escapeHtml(client.client_code)}</code>
                </button>
                <ul class="cm-tree-journals">${journalBlocks}</ul>
            </div>
        `;
    }).join('');
}

function loadConfigManagementDashboard() {
    const container = document.getElementById('cmDashboardContent');
    const model = getConfigMgmtModel();
    if (!container || !model) return;

    const stats = model.getStats();
    applyDashboardStats(stats);
    container.innerHTML = renderHierarchyTreeHtml(model.getDashboardHierarchy());
}

function populateClientSelects(selected) {
    const model = getConfigMgmtModel();
    if (!model) return;
    const options = model.listClients().map(c =>
        `<option value="${escapeHtml(c.client_code)}"${c.client_code === selected ? ' selected' : ''}>${escapeHtml(c.client_code)} — ${escapeHtml(c.client_name)}</option>`
    ).join('');
    ['cmJournalClientFilter', 'cmJournalFormClient'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const isFilter = id === 'cmJournalClientFilter';
        el.innerHTML = (isFilter ? '<option value="">All clients</option>' : '<option value="">Select client</option>') + options;
        if (selected) el.value = selected;
    });
}

function populateTemplateSelects(selectedId) {
    const model = getConfigMgmtModel();
    if (!model) return;
    const options = model.listTemplates().map(t =>
        `<option value="${t.template_id}"${t.template_id === selectedId ? ' selected' : ''}>${escapeHtml(t.template_code)} — ${escapeHtml(t.template_name)}</option>`
    ).join('');
    const el = document.getElementById('cmJournalFormTemplate');
    if (el) {
        el.innerHTML = '<option value="">No template</option>' + options;
        if (selectedId) el.value = String(selectedId);
    }
}

function populateJournalSelects(selected) {
    const model = getConfigMgmtModel();
    if (!model) return;
    const clientFilter = configManagementState.selectedClient || '';
    const journals = model.listJournals(clientFilter || undefined);
    const options = journals.map(j =>
        `<option value="${escapeHtml(j.journal_code)}"${j.journal_code === selected ? ' selected' : ''}>${escapeHtml(j.journal_code)} — ${escapeHtml(j.journal_name)}</option>`
    ).join('');
    ['cmFieldJournalFilter', 'cmFieldJournal'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const isFilter = id === 'cmFieldJournalFilter';
        el.innerHTML = (isFilter ? '<option value="">Select journal</option>' : '') + options;
        if (selected) el.value = selected;
    });
}

function renderClientsTab() {
    const model = getConfigMgmtModel();
    const body = document.getElementById('cmClientListBody');
    if (!model || !body) return;

    const clients = model.listClients();
    const countEl = document.getElementById('cmClientListCount');
    if (countEl) countEl.textContent = String(clients.length);

    body.innerHTML = clients.map(c => {
        const jCount = model.listJournals(c.client_code).length;
        const active = c.client_code === configManagementState.selectedClient ? 'table-active' : '';
        return `
            <tr class="${active}">
                <td><code>${escapeHtml(c.client_code)}</code></td>
                <td>${escapeHtml(c.client_name)}</td>
                <td class="text-center">${jCount}</td>
                <td><button type="button" class="btn btn-sm btn-outline-primary" onclick="cmEditClient('${escapeHtml(c.client_code)}')">Edit</button></td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="4" class="text-muted p-3">No clients</td></tr>';

    populateClientSelects(configManagementState.selectedClient);
}

function renderJournalsTab() {
    const model = getConfigMgmtModel();
    const body = document.getElementById('cmJournalListBody');
    if (!model || !body) return;

    populateClientSelects(configManagementState.selectedClient);
    populateTemplateSelects(configManagementState.selectedTemplateId);

    const filter = (document.getElementById('cmJournalClientFilter') || {}).value || configManagementState.selectedClient || '';
    const journals = model.listJournals(filter || undefined);

    body.innerHTML = journals.map(j => {
        const tpl = j.template_id ? model.templateById(j.template_id) : null;
        const fCount = model.getJournalFields(j.journal_code).length;
        const active = j.journal_code === configManagementState.selectedJournal ? 'table-active' : '';
        return `
            <tr class="${active}">
                <td><code>${escapeHtml(j.journal_code)}</code></td>
                <td>${escapeHtml(j.journal_name)}</td>
                <td>${escapeHtml(j.client_code)}</td>
                <td>${escapeHtml(tpl ? tpl.template_code : '—')}</td>
                <td class="text-center">${fCount}</td>
                <td><button type="button" class="btn btn-sm btn-outline-primary" onclick="cmEditJournal('${escapeHtml(j.journal_code)}')">Edit</button></td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="6" class="text-muted p-3">No journals</td></tr>';

    populateJournalSelects(configManagementState.selectedJournal);
}

function renderFieldsTab() {
    const model = getConfigMgmtModel();
    const body = document.getElementById('cmFieldListBody');
    if (!model || !body) return;

    populateJournalSelects(configManagementState.selectedJournal);
    const journalCode = (document.getElementById('cmFieldJournalFilter') || {}).value || configManagementState.selectedJournal;
    if (!journalCode) {
        body.innerHTML = '<tr><td colspan="6" class="text-muted p-3">Select a journal to view fields.</td></tr>';
        return;
    }

    const fields = model.getJournalFields(journalCode);
    body.innerHTML = fields.map(f => `
        <tr>
            <td>${escapeHtml(f.config_group)}</td>
            <td><code>${escapeHtml(f.config_key)}</code></td>
            <td>${escapeHtml(f.config_value || '')}</td>
            <td><span class="badge ${f.source === 'override' ? 'bg-warning text-dark' : 'bg-info'}">${escapeHtml(f.source)}</span></td>
            <td>${escapeHtml(f.template_code || '—')}</td>
            <td><button type="button" class="btn btn-sm btn-outline-primary" onclick="cmEditField('${escapeHtml(journalCode)}','${escapeHtml(f.source)}',${f.id})">Edit</button></td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="text-muted p-3">No fields for this journal.</td></tr>';
}

function renderTemplatesTab() {
    const model = getConfigMgmtModel();
    const body = document.getElementById('cmTemplateListBody');
    if (!model || !body) return;

    body.innerHTML = model.listTemplates().map(t => {
        const fieldCount = model.countTemplateFields(t.template_id);
        return `
            <tr>
                <td>${t.template_id}</td>
                <td><code>${escapeHtml(t.template_code)}</code></td>
                <td>${escapeHtml(t.template_name)}</td>
                <td class="text-center">${fieldCount}</td>
                <td><button type="button" class="btn btn-sm btn-outline-primary" onclick="cmEditTemplate(${t.template_id})">Edit</button></td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" class="text-muted p-3">No templates</td></tr>';
}

function cmSelectClient(code) {
    configManagementState.selectedClient = code;
    configManagementState.selectedJournal = '';
    configManagementState.selectedField = null;
    cmEditClient(code);
    switchConfigManagementTab('clients');
}

function cmSelectJournal(clientCode, journalCode) {
    configManagementState.selectedClient = clientCode;
    configManagementState.selectedJournal = journalCode;
    configManagementState.selectedField = null;
    cmEditJournal(journalCode);
    switchConfigManagementTab('journals');
}

function cmSelectField(journalCode, source, id) {
    configManagementState.selectedJournal = journalCode;
    const model = getConfigMgmtModel();
    if (model) {
        const j = model.listJournals().find(x => x.journal_code === journalCode);
        if (j) configManagementState.selectedClient = j.client_code;
    }
    cmEditField(journalCode, source, id);
    switchConfigManagementTab('fields');
}

function cmEditClient(code) {
    const model = getConfigMgmtModel();
    if (!model) return;
    const c = model.listClients().find(x => x.client_code === code);
    if (!c) return;
    configManagementState.selectedClient = code;
    document.getElementById('cmClientCode').value = c.client_code;
    document.getElementById('cmClientName').value = c.client_name;
    updateConfigMgmtContextBar();
}

function cmClearClientForm() {
    configManagementState.selectedClient = '';
    document.getElementById('cmClientCode').value = '';
    document.getElementById('cmClientName').value = '';
    updateConfigMgmtContextBar();
    renderClientsTab();
}

function cmSaveClientUi() {
    const model = getConfigMgmtModel();
    if (!model) return;
    const result = model.saveClient({
        client_code: document.getElementById('cmClientCode').value,
        client_name: document.getElementById('cmClientName').value
    });
    if (!result.ok) { showNotification(result.message, 'warning'); return; }
    configManagementState.selectedClient = result.data.client_code;
    showNotification('Client saved (UI model).', 'success');
    refreshConfigMgmtUi();
}

function cmDeleteClientUi() {
    const model = getConfigMgmtModel();
    const code = document.getElementById('cmClientCode').value;
    if (!model || !code) return;
    if (!confirm(`Delete client ${code}?`)) return;
    const result = model.deleteClient(code);
    if (!result.ok) { showNotification(result.message, 'warning'); return; }
    cmClearClientForm();
    showNotification('Client deleted (UI model).', 'success');
    refreshConfigMgmtUi();
}

function cmDrillToJournals() {
    switchConfigManagementTab('journals');
}

function cmEditJournal(code) {
    const model = getConfigMgmtModel();
    if (!model) return;
    const j = model.listJournals().find(x => x.journal_code === code);
    if (!j) return;
    configManagementState.selectedJournal = code;
    configManagementState.selectedClient = j.client_code;
    configManagementState.selectedTemplateId = j.template_id;
    document.getElementById('cmJournalFormCode').value = j.journal_code;
    document.getElementById('cmJournalFormName').value = j.journal_name;
    populateClientSelects(j.client_code);
    populateTemplateSelects(j.template_id);
    document.getElementById('cmJournalFormClient').value = j.client_code;
    if (j.template_id) document.getElementById('cmJournalFormTemplate').value = String(j.template_id);
    updateConfigMgmtContextBar();
}

function cmClearJournalForm() {
    configManagementState.selectedJournal = '';
    configManagementState.selectedTemplateId = null;
    ['cmJournalFormCode', 'cmJournalFormName'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    updateConfigMgmtContextBar();
    renderJournalsTab();
}

function cmSaveJournalUi() {
    const model = getConfigMgmtModel();
    if (!model) return;
    const tplVal = document.getElementById('cmJournalFormTemplate').value;
    const result = model.saveJournal({
        journal_code: document.getElementById('cmJournalFormCode').value,
        journal_name: document.getElementById('cmJournalFormName').value,
        client_code: document.getElementById('cmJournalFormClient').value,
        template_id: tplVal ? Number(tplVal) : null
    });
    if (!result.ok) { showNotification(result.message, 'warning'); return; }
    configManagementState.selectedJournal = result.data.journal_code;
    configManagementState.selectedClient = result.data.client_code;
    showNotification('Journal saved (UI model).', 'success');
    refreshConfigMgmtUi();
}

function cmDeleteJournalUi() {
    const model = getConfigMgmtModel();
    const code = document.getElementById('cmJournalFormCode').value;
    if (!model || !code) return;
    if (!confirm(`Delete journal ${code}?`)) return;
    model.deleteJournal(code);
    cmClearJournalForm();
    showNotification('Journal deleted (UI model).', 'success');
    refreshConfigMgmtUi();
}

function cmDrillToFields() {
    const code = document.getElementById('cmJournalFormCode').value;
    if (code) configManagementState.selectedJournal = code;
    switchConfigManagementTab('fields');
}

function cmEditField(journalCode, source, id) {
    const model = getConfigMgmtModel();
    if (!model) return;
    const field = model.getJournalFields(journalCode).find(f => f.source === source && f.id === id);
    if (!field) return;
    configManagementState.selectedField = field;
    configManagementState.selectedJournal = journalCode;
    populateJournalSelects(journalCode);
    document.getElementById('cmFieldJournal').value = journalCode;
    document.getElementById('cmFieldSource').value = field.source;
    document.getElementById('cmFieldGroup').value = field.config_group;
    document.getElementById('cmFieldKey').value = field.config_key;
    document.getElementById('cmFieldValue').value = field.config_value || '';
    document.getElementById('cmFieldEditId').value = String(field.id);
    document.getElementById('cmFieldEditSource').value = field.source;
    updateConfigMgmtContextBar();
}

function cmClearFieldForm() {
    configManagementState.selectedField = null;
    ['cmFieldGroup', 'cmFieldKey', 'cmFieldValue', 'cmFieldEditId', 'cmFieldEditSource'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    updateConfigMgmtContextBar();
    renderFieldsTab();
}

function cmSaveFieldUi() {
    const model = getConfigMgmtModel();
    if (!model) return;
    const result = model.saveField({
        journal_code: document.getElementById('cmFieldJournal').value,
        source: document.getElementById('cmFieldSource').value,
        config_group: document.getElementById('cmFieldGroup').value,
        config_key: document.getElementById('cmFieldKey').value,
        config_value: document.getElementById('cmFieldValue').value
    });
    if (!result.ok) { showNotification(result.message, 'warning'); return; }
    showNotification('Field saved (UI model).', 'success');
    refreshConfigMgmtUi();
}

function cmDeleteFieldUi() {
    const model = getConfigMgmtModel();
    const id = document.getElementById('cmFieldEditId').value;
    const source = document.getElementById('cmFieldEditSource').value;
    if (!model || !id) { showNotification('Select a field to delete.', 'warning'); return; }
    model.deleteField({ id: Number(id), source });
    cmClearFieldForm();
    showNotification('Field deleted (UI model).', 'success');
    refreshConfigMgmtUi();
}

function cmDrillToTemplate() {
    const model = getConfigMgmtModel();
    const journalCode = document.getElementById('cmFieldJournal').value || configManagementState.selectedJournal;
    if (!model || !journalCode) return;
    const j = model.listJournals().find(x => x.journal_code === journalCode);
    if (j && j.template_id) {
        configManagementState.selectedTemplateId = j.template_id;
        cmEditTemplate(j.template_id);
    }
    switchConfigManagementTab('templates');
}

function cmEditTemplate(templateId) {
    const model = getConfigMgmtModel();
    if (!model) return;
    const t = model.templateById(Number(templateId));
    if (!t) return;
    configManagementState.selectedTemplateId = t.template_id;
    document.getElementById('cmTplFormCode').value = t.template_code;
    document.getElementById('cmTplFormName').value = t.template_name;
    updateConfigMgmtContextBar();
}

function cmClearTemplateForm() {
    configManagementState.selectedTemplateId = null;
    ['cmTplFormCode', 'cmTplFormName'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    renderTemplatesTab();
}

function cmSaveTemplateUi() {
    const model = getConfigMgmtModel();
    if (!model) return;
    const result = model.saveTemplate({
        template_code: document.getElementById('cmTplFormCode').value,
        template_name: document.getElementById('cmTplFormName').value
    });
    if (!result.ok) { showNotification(result.message, 'warning'); return; }
    configManagementState.selectedTemplateId = result.data.template_id;
    showNotification('Template saved (UI model).', 'success');
    refreshConfigMgmtUi();
}

function cmDeleteTemplateUi() {
    const model = getConfigMgmtModel();
    const code = document.getElementById('cmTplFormCode').value;
    const t = model.listTemplates().find(x => x.template_code === code);
    if (!model || !t) return;
    if (!confirm(`Delete template ${code}?`)) return;
    const result = model.deleteTemplate(t.template_id);
    if (!result.ok) { showNotification(result.message, 'warning'); return; }
    cmClearTemplateForm();
    showNotification('Template deleted (UI model).', 'success');
    refreshConfigMgmtUi();
}

function normalizeApiRecordList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.records)) return payload.records;
    if (payload && Array.isArray(payload.items)) return payload.items;
    return [];
}

function syncConfigPathDisplay() {
    const display = document.getElementById('configApiBaseDisplay');
    if (!display) return;

    const base = typeof getGlobalApiPath === 'function' ? getGlobalApiPath() : getConfigApiBase();
    display.textContent = base || 'API_PATH is not defined in global scope.';
}

function getConfigApiBase() {
    const rawBase = typeof getGlobalApiPath === 'function'
        ? getGlobalApiPath()
        : ((typeof API_PATH !== 'undefined' && API_PATH)
            ? String(API_PATH)
            : ((typeof window !== 'undefined' && window.API_PATH) ? String(window.API_PATH) : ''));
    return rawBase.trim().replace(/\/+$/, '');
}

function updateConfigApiHint(message) {
    const hint = document.getElementById('configApiHint');
    if (!hint) return;

    const base = getConfigApiBase();
    hint.textContent = message || (base ? `Using API_PATH: ${base}` : 'Using relative requests from the current app.');
}

function clearConfigManagementOutput() {
    const resultBox = document.getElementById('configMgmtResult');
    const actionBadge = document.getElementById('cmResultAction');
    const statusBadge = document.getElementById('cmResultStatus');
    const metaLine = document.getElementById('cmResultMeta');

    if (actionBadge) actionBadge.textContent = 'Idle';
    if (statusBadge) statusBadge.textContent = 'Waiting';
    if (metaLine) metaLine.textContent = '';
    if (resultBox) resultBox.textContent = '';
    hideConfigManagementResultsPanel();

    configManagementState.lastAction = 'Idle';
    configManagementState.lastStatus = 'Waiting';
    configManagementState.lastMeta = '';
}

function shouldShowConfigApiResults(actionLabel) {
    if (!isConfigMgmtSuperAdmin()) return false;
    const label = String(actionLabel || '').toLowerCase();
    return /sqlite|template|journal|audit|resolve|config|dashboard|list|create|update|delete|save|search|get|post|put|delete/i.test(label);
}

function normalizeKeyValueEntries(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload.flatMap(normalizeKeyValueEntries);
    if (typeof payload !== 'object') return [];

    return Object.entries(payload).map(([key, value]) => ({
        key,
        value: value === null || value === undefined ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value))
    }));
}

function renderKeyValueTable(targetId, payload, emptyText) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const entries = normalizeKeyValueEntries(payload);
    if (!entries.length) {
        target.innerHTML = `<div class="text-muted">${escapeHtml(emptyText || 'No records returned.')}</div>`;
        return;
    }

    const rows = entries.map(({ key, value }) => `
        <tr>
            <td>${escapeHtml(key)}</td>
            <td><code class="text-break">${escapeHtml(value)}</code></td>
        </tr>
    `).join('');

    target.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm table-striped align-middle mb-0">
                <thead>
                    <tr><th style="width: 35%;">Key</th><th>Value</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function renderAuditResults(payload) {
    const tableTarget = document.getElementById('auditResultsTable');
    const jsonTarget = document.getElementById('auditRawJson');
    const filteredPayload = filterConfigApiPayloadForDisplay(payload);
    if (jsonTarget) {
        jsonTarget.textContent = formatConfigPayload(filteredPayload);
    }

    const records = Array.isArray(filteredPayload)
        ? filteredPayload
        : (Array.isArray(filteredPayload && filteredPayload.data) ? filteredPayload.data : (Array.isArray(filteredPayload && filteredPayload.records) ? filteredPayload.records : []));

    if (!tableTarget) return;
    if (!records.length) {
        tableTarget.innerHTML = '<div class="text-muted">No audit records returned.</div>';
        return;
    }

    const rows = records.map((record, index) => {
        const q = record.q || record.query || record.searchText || record.text || '';
        const action = record.action || record.event || record.type || '';
        const at = record.timestamp || record.createdAt || record.created_at || record.time || record.date || '';
        const user = record.user || record.createdBy || record.updatedBy || record.actor || '';
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(String(at))}</td>
                <td>${escapeHtml(String(user))}</td>
                <td>${escapeHtml(String(action))}</td>
                <td>${escapeHtml(String(q))}</td>
            </tr>
        `;
    }).join('');

    tableTarget.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm table-striped align-middle mb-0">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Time</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function getConfigFieldValue(id) {
    const field = document.getElementById(id);
    return field ? field.value.trim() : '';
}

function getConfigBooleanValue(id) {
    const field = document.getElementById(id);
    return !!field && field.value === 'true';
}

function getConfigNumberValue(id) {
    const field = document.getElementById(id);
    if (!field) return null;

    const value = field.value.trim();
    if (!value) return null;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function compactConfigObject(source) {
    const result = {};

    Object.entries(source || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        result[key] = value;
    });

    return result;
}

function buildConfigUrl(path, query = {}) {
    const queryString = new URLSearchParams(Object.entries(query).reduce((params, [key, value]) => {
        if (value === undefined || value === null || value === '') return params;
        params.set(key, String(value));
        return params;
    }, new URLSearchParams())).toString();

    const pathValue = String(path || '');
    const url = /^https?:\/\//i.test(pathValue)
        ? pathValue
        : (typeof buildApiUrl === 'function'
            ? buildApiUrl(pathValue.replace(/^\/+/, ''))
            : `${getConfigApiBase()}/${pathValue.replace(/^\/+/, '')}`);

    return `${url}${queryString ? `?${queryString}` : ''}`;
}

async function readConfigResponseBody(response) {
    const text = await response.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch (error) {
        return text;
    }
}

async function configManagementRequest(path, options = {}) {
    const requestOptions = {
        method: options.method || 'GET',
        headers: {
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(options.headers || {})
        }
    };

    if (options.body !== undefined) {
        requestOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    const url = buildConfigUrl(path, options.query || {});
    if (!options.skipLoading) {
        showLoading(true);
    }

    try {
        const response = await fetch(url, requestOptions);
        const payload = await readConfigResponseBody(response);

        if (!response.ok) {
            const error = new Error(`Request failed with status ${response.status}`);
            error.status = response.status;
            error.statusText = response.statusText;
            error.url = url;
            error.payload = payload;
            throw error;
        }

        return {
            ok: true,
            url,
            status: response.status,
            statusText: response.statusText,
            payload
        };
    } catch (error) {
        if (!error.url) {
            error.url = url;
        }
        throw error;
    } finally {
        if (!options.skipLoading) {
            showLoading(false);
        }
    }
}

function formatConfigPayload(payload) {
    if (payload === null || payload === undefined) {
        return '{ "message": "No response body returned." }';
    }

    if (typeof payload === 'string') {
        return payload;
    }

    try {
        return JSON.stringify(payload, null, 2);
    } catch (error) {
        return String(payload);
    }
}

function getConfigErrorMessage(error) {
    if (!error) return 'Unknown error';

    if (typeof error === 'string') return error;
    if (error.payload) {
        if (typeof error.payload === 'string') return error.payload;
        if (error.payload.message) return error.payload.message;
        if (error.payload.error) return error.payload.error;
    }
    if (error.message) return error.message;
    if (error.statusText) return `${error.status} ${error.statusText}`;

    try {
        return JSON.stringify(error);
    } catch (jsonError) {
        return 'Unexpected error';
    }
}

function renderConfigManagementResult(actionLabel, response, options = {}) {
    if (!shouldShowConfigApiResults(actionLabel)) return;

    const actionBadge = document.getElementById('cmResultAction');
    const statusBadge = document.getElementById('cmResultStatus');
    const metaLine = document.getElementById('cmResultMeta');
    const resultBox = document.getElementById('configMgmtResult');

    const isError = !!options.error;
    const statusText = isError
        ? 'Error'
        : options.statusText || `HTTP ${response && response.status ? response.status : '200'}`;
    const metaText = options.meta || (response && response.url ? response.url : '');
    const rawPayload = isError
        ? {
            error: getConfigErrorMessage(options.error),
            details: options.error && options.error.payload ? options.error.payload : null,
            url: options.error && options.error.url ? options.error.url : undefined
        }
        : (response ? response.payload : options.payload);
    const bodyText = formatConfigPayload(filterConfigApiPayloadForDisplay(rawPayload));

    showConfigManagementResultsPanel();
    if (actionBadge) actionBadge.textContent = actionLabel || 'Action';
    if (statusBadge) statusBadge.textContent = statusText;
    if (metaLine) metaLine.textContent = metaText;
    if (resultBox) resultBox.textContent = bodyText;

    configManagementState.lastAction = actionLabel || 'Action';
    configManagementState.lastStatus = statusText;
    configManagementState.lastMeta = metaText;

    const wrap = document.getElementById('cmApiResultsWrap');
    if (wrap && wrap.scrollIntoView) {
        wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

async function runConfigManagementAction(actionLabel, requestRunner, successMessage) {
    try {
        const response = await requestRunner();
        renderConfigManagementResult(actionLabel, response, {
            statusText: `HTTP ${response.status}`,
            meta: response.url
        });
        showNotification(successMessage || `${actionLabel} completed successfully.`, 'success');
        return response;
    } catch (error) {
        renderConfigManagementResult(actionLabel, null, {
            error,
            meta: error && error.url ? error.url : 'Request failed.'
        });
        showNotification(`${actionLabel} failed: ${getConfigErrorMessage(error)}`, 'error');
        return null;
    }
}

async function loadSQLitePath() {
    return runConfigManagementAction('SQLite Path', async () => {
        const response = await configManagementRequest(SQLITE_API.path());
        renderKeyValueTable('sqliteStatusTable', response.payload, 'No SQLite path returned.');
        return response;
    }, 'Loaded SQLite path.');
}

async function loadSQLiteStatus() {
    return runConfigManagementAction('SQLite Status', async () => {
        const response = await configManagementRequest(SQLITE_API.status());
        renderKeyValueTable('sqliteStatusTable', response.payload, 'No SQLite status returned.');
        return response;
    }, 'Loaded SQLite status.');
}

async function loadSQLiteHealth() {
    return runConfigManagementAction('SQLite Health', async () => {
        const response = await configManagementRequest(SQLITE_API.health());
        const payload = response.payload;
        if (typeof applySqliteHealthFromPayload === 'function') {
            applySqliteHealthFromPayload(payload);
        }
        renderKeyValueTable('sqliteHealthTable', payload, 'No SQLite health payload returned.');
        return response;
    }, 'Loaded SQLite health.');
}

async function refreshSQLiteHealth(options = {}) {
    const silent = options.silent !== false;
    if (typeof setSqliteHealthIndicator === 'function') {
        setSqliteHealthIndicator(null);
    }

    try {
        const response = await configManagementRequest(SQLITE_API.health(), { skipLoading: silent });
        const payload = response.payload;
        if (typeof applySqliteHealthFromPayload === 'function') {
            applySqliteHealthFromPayload(payload);
        }
        renderKeyValueTable('sqliteHealthTable', payload, 'No SQLite health payload returned.');
        if (!silent) {
            renderConfigManagementResult('SQLite Health', response, {
                statusText: `HTTP ${response.status}`,
                meta: response.url
            });
            showNotification('Database health check completed.', 'success');
        }
        return response;
    } catch (error) {
        if (typeof applySqliteHealthFromPayload === 'function') {
            applySqliteHealthFromPayload(null, false);
        }
        const detail = getConfigErrorMessage(error);
        if (typeof setSqliteHealthIndicator === 'function') {
            setSqliteHealthIndicator(false, detail);
        }
        if (!silent) {
            renderConfigManagementResult('SQLite Health', null, {
                error,
                meta: error && error.url ? error.url : 'Request failed.'
            });
            showNotification(`Database health check failed: ${detail}`, 'error');
        }
        return null;
    }
}

function resolveConfigByJournalCode() {
    const journalCode = getConfigFieldValue('cmResolveJournalCode');
    if (!journalCode) {
        showNotification('Enter a journal code first.', 'warning');
        return Promise.resolve(null);
    }

    return runConfigManagementAction('Resolve Config', async () => {
        const response = await configManagementRequest('/api/config', {
            query: {
                journalCode
            }
        });
        renderKeyValueTable('configResolveTable', response.payload, 'No resolved configuration returned.');
        return response;
    }, `Resolved configuration for ${journalCode}.`);
}

function listTemplates() {
    return runConfigManagementAction('List Templates', () => configManagementRequest('/api/template'), 'Loaded template list.');
}

function createTemplate() {
    const payload = compactConfigObject({
        templateId: getConfigNumberValue('cmTemplateId'),
        templateCode: getConfigFieldValue('cmTemplateCode'),
        templateName: getConfigFieldValue('cmTemplateName'),
        configGroup: getConfigFieldValue('cmTemplateGroup'),
        version: getConfigNumberValue('cmTemplateVersion') || 1,
        active: getConfigBooleanValue('cmTemplateActive')
    });

    if (!payload.templateCode && !payload.templateName && !payload.configGroup) {
        showNotification('Add template details before creating a record.', 'warning');
        return Promise.resolve(null);
    }

    return runConfigManagementAction('Create Template', () => configManagementRequest('/api/template', {
        method: 'POST',
        body: payload
    }), 'Template created.');
}

function updateTemplate() {
    const payload = compactConfigObject({
        templateId: getConfigNumberValue('cmTemplateId'),
        templateCode: getConfigFieldValue('cmTemplateCode'),
        templateName: getConfigFieldValue('cmTemplateName'),
        configGroup: getConfigFieldValue('cmTemplateGroup'),
        version: getConfigNumberValue('cmTemplateVersion') || 1,
        active: getConfigBooleanValue('cmTemplateActive')
    });

    if (!payload.templateId) {
        showNotification('Template ID is required to update a template.', 'warning');
        return Promise.resolve(null);
    }

    return runConfigManagementAction('Update Template', () => configManagementRequest('/api/template', {
        method: 'PUT',
        body: payload
    }), `Template ${payload.templateId} updated.`);
}

function deleteTemplate() {
    const templateId = getConfigFieldValue('cmTemplateId');
    if (!templateId) {
        showNotification('Template ID is required to delete a template.', 'warning');
        return Promise.resolve(null);
    }

    return runConfigManagementAction('Delete Template', () => configManagementRequest('/api/template', {
        method: 'DELETE',
        query: {
            templateId
        }
    }), `Template ${templateId} deleted.`);
}

function listJournalMappings() {
    return runConfigManagementAction('List Journals', () => configManagementRequest('/api/journal'), 'Loaded journal mappings.');
}

function saveJournalMapping() {
    const payload = compactConfigObject({
        journalCode: getConfigFieldValue('cmJournalCode'),
        configGroup: getConfigFieldValue('cmJournalConfigGroup'),
        templateId: getConfigNumberValue('cmJournalTemplateId')
    });

    if (!payload.journalCode) {
        showNotification('Journal code is required to save a mapping.', 'warning');
        return Promise.resolve(null);
    }

    return runConfigManagementAction('Save Mapping', () => configManagementRequest('/api/journal', {
        method: 'PUT',
        body: payload
    }), `Mapping saved for ${payload.journalCode}.`);
}

function saveJournalOverride() {
    const payload = compactConfigObject({
        journalCode: getConfigFieldValue('cmOverrideJournalCode'),
        templateId: getConfigNumberValue('cmOverrideTemplateId'),
        configGroup: getConfigFieldValue('cmOverrideConfigGroup'),
        configKey: getConfigFieldValue('cmOverrideKey'),
        configValue: getConfigFieldValue('cmOverrideValue')
    });

    if (!payload.journalCode || !payload.configKey) {
        showNotification('Journal code and override key are required.', 'warning');
        return Promise.resolve(null);
    }

    return runConfigManagementAction('Save Override', () => configManagementRequest('/api/journal', {
        method: 'PUT',
        query: {
            kind: 'override'
        },
        body: payload
    }), `Override saved for ${payload.journalCode}.`);
}

function searchAuditRecords() {
    const query = getConfigFieldValue('cmAuditQuery');
    return runConfigManagementAction('Search Audit', async () => {
        const response = await configManagementRequest('/api/audit', {
            query: {
                q: query
            }
        });
        renderAuditResults(response.payload);
        return response;
    }, query ? `Audit search completed for "${query}".` : 'Audit records loaded.');
}

/**
 * Switch between different views
 * @param {string} viewName - Name of the view to display
 */
function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.content-view').forEach(view => {
        view.style.display = 'none';
    });

    // Show selected view
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
        targetView.style.display = 'block';
    }

    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-view="${viewName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }

    // Update breadcrumb
    updateBreadcrumb(viewName);

    // Load view-specific data
    loadViewData(viewName);

    if (viewName === 'create-new') {
        applyCreateConfigDefaults();
        showCreateConfigTab('client');
    }
}

function showCreateConfigTab(viewName) {
    const normalizedView = viewName === 'journal' ? 'journal' : 'client';
    const button = document.getElementById(normalizedView === 'journal' ? 'new-journal-create' : 'new-client-create');
    if (button && window.bootstrap && bootstrap.Tab) {
        new bootstrap.Tab(button).show();
        return;
    }
    syncCreateConfigView(normalizedView);
}

function syncCreateConfigView(viewName) {
    const normalizedView = viewName === 'journal' ? 'journal' : 'client';
    const buttons = document.querySelectorAll('.create-config-switcher-btn');

    buttons.forEach(button => {
        const isActive = button.dataset.view === normalizedView;
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
}

function populateClientCloneSelector() {
    const selector = document.getElementById('cfg_clone_source');
    if (!selector) return;

    selector.innerHTML = '<option value="">Start from scratch (Default)</option>';

    const addGroup = (label, items, suffix) => {
        if (!items.length) return;

        const group = document.createElement('optgroup');
        group.label = label;

        items.forEach(([clientId, path]) => {
            const option = document.createElement('option');
            const displayName = getClientDisplayName(clientId, clientId);
            option.value = path;
            option.text = `Clone from ${displayName}${suffix ? ` ${suffix}` : ''}`;
            group.appendChild(option);
        });

        selector.appendChild(group);
    };

    addGroup(
        'Journal Clone Sources',
        Object.entries(CONFIG_PATHS.journals),
        ''
    );

    addGroup(
        'Book Clone Sources',
        Object.entries(CONFIG_PATHS.books),
        '(Book)'
    );
}

async function applyClientCloneSource(sourcePath) {
    if (!window.CC || typeof CC.init !== 'function') return;

    try {
        await CC.init();
        if (!sourcePath) return;

        const xmlContent = await fetchXMLFile(sourcePath);
        if (typeof CC.fillFromXML === 'function') {
            CC.fillFromXML(xmlContent);
        }
    } catch (error) {
        console.warn('Unable to apply clone source:', error);
    }
}

function initializeSidebarModeToggle() {
    const savedMode = localStorage.getItem('xmleditor:admin_sidebar_mode') || 'full';
    setSidebarMode(savedMode, false);
}

function toggleSidebarMode() {
    const layoutRow = document.getElementById('adminLayoutRow');
    if (!layoutRow) return;

    const currentMode = layoutRow.classList.contains('sidebar-icons') ? 'icons' : 'full';
    const nextMode = currentMode === 'icons' ? 'full' : 'icons';
    setSidebarMode(nextMode, true);
}

function setSidebarMode(mode, persist = true) {
    const layoutRow = document.getElementById('adminLayoutRow');
    if (!layoutRow) return;

    const normalizedMode = mode === 'icons' ? 'icons' : 'full';
    layoutRow.classList.toggle('sidebar-icons', normalizedMode === 'icons');
    updateSidebarModeToggleUI(normalizedMode);

    if (persist) {
        localStorage.setItem('xmleditor:admin_sidebar_mode', normalizedMode);
    }
}

function updateSidebarModeToggleUI(mode) {
    const btn = document.getElementById('sidebarModeToggle');
    if (!btn) return;

    if (mode === 'icons') {
        btn.innerHTML = '<i class="fas fa-columns"></i> Full Mode';
    } else {
        btn.innerHTML = '<i class="fas fa-grip-lines-vertical"></i> Icons Mode';
    }
}

function initializeUserProfile() {
    const profileContainer = document.getElementById('headerProfile');
    if (!profileContainer) return;

    const displayName = USER_DISPLAYNAME || USER_MAIL || USER_ID || 'User';
    const userId = USER_ID || '';
    const role = WF_ROLE || '';
    const initials = getInitials(displayName);

    profileContainer.innerHTML = `
        <div class="profile-pill" title="${escapeHtml(displayName)}">
            <span class="profile-avatar">${escapeHtml(initials)}</span>
            <span class="profile-meta">
                <span class="profile-name">${escapeHtml(displayName)}</span>
                <span class="profile-sub">${escapeHtml([role].filter(Boolean).join(' | '))}</span>
            </span>
        </div>
    `;
}

async function applyCreateConfigDefaults() {
    // Trigger schema-driven create-new form initialization
    if (window.CC) await CC.init();

    const cloneSource = document.getElementById('cfg_clone_source');
    if (cloneSource && cloneSource.value) {
        await applyClientCloneSource(cloneSource.value);
    }

    const orderByField = document.getElementById('orderBy');
    if (orderByField) {
        orderByField.value = buildOrderByValue();
    }
}

function getInitials(name) {
    const safeName = (name || '').trim();
    if (!safeName) return 'NA';

    const tokens = safeName.split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) {
        return (tokens[0][0] + tokens[1][0]).toUpperCase();
    }

    const compact = safeName.replace(/[^A-Za-z0-9]/g, '');
    return compact.substring(0, 2).toUpperCase().padEnd(2, 'X');
}

function buildOrderByValue() {
    const baseName = USER_DISPLAYNAME || USER_MAIL || USER_ID || '';
    const initials = getInitials(baseName);
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mmm = now.toLocaleString('en-US', {
        month: 'short'
    });
    const yy = String(now.getFullYear()).slice(-2);
    return `${initials}_${dd}_${mmm}_${yy}`;
}

/**
 * Update breadcrumb navigation
 * @param {string} viewName - Current view name
 */
function updateBreadcrumb(viewName) {
    const breadcrumb = document.getElementById('breadcrumbCurrent');
    const viewNames = {
        'dashboard': 'Dashboard',
        'dashboard': 'Dashboard',
        'client-list': 'Client Configurations',
        'journal-list': 'Journal Configurations',
        'create-new': 'Create New Configuration',
        'xml-editor': 'XML Editor',
        'compare': 'Compare Configurations',
        'history': 'Change History',
        'config-management': 'Config Management',
        'validation': 'XML Validation'
    };

    if (breadcrumb) {
        breadcrumb.textContent = viewNames[viewName] || 'Configuration Manager';
    }
}

/**
 * Load data specific to the current view
 * @param {string} viewName - Name of the view
 */
function loadViewData(viewName) {
    switch (viewName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'client-list':
            loadClientList();
            break;
        case 'journal-list':
            // Data loaded when client is selected
            break;
        case 'history':
            loadChangeHistory();
            break;
        case 'config-management':
            syncConfigPathDisplay();
            updateConfigApiHint();
            applyConfigMgmtSuperAdminUi();
            switchConfigManagementTab(configManagementState.activeTab || 'dashboard');
            if (typeof refreshSQLiteHealth === 'function') {
                refreshSQLiteHealth({ silent: true });
            }
            break;
        case 'compare':
            populateCompareSelectors();
            break;
    }
}

/**
 * Load dashboard statistics and recent activity
 */
async function loadDashboardData() {
    try {
        showLoading(true);

        // Simulate API call - Replace with actual API endpoint
        const stats = await fetchDashboardStats();

        document.getElementById('totalClients').textContent = stats.totalClients || 2;
        document.getElementById('totalJournals').textContent = stats.totalJournals || 15;
        document.getElementById('recentChanges').textContent = stats.recentChanges || 5;

        // Load recent activity
        const activityHTML = generateRecentActivityHTML(stats.recentActivity || []);
        document.getElementById('recentActivity').innerHTML = activityHTML;

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Fetch dashboard statistics
 * @returns {Promise<Object>} Dashboard statistics
 */
async function fetchDashboardStats() {
    try {
        let totalClients = 0;
        let totalJournals = 0;

        // Count clients from CONFIG_PATHS
        totalClients = Object.keys(CONFIG_PATHS.journals).length + Object.keys(CONFIG_PATHS.books).length;

        // Fetch journal counts from each client's XML
        const journalPromises = Object.entries(CONFIG_PATHS.journals).map(async ([clientId, path]) => {
            try {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`Failed to fetch ${clientId}`);

                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

                // Count journals in listofjournals
                const journals = xmlDoc.querySelectorAll('listofjournals > journal');
                return journals.length;
            } catch (error) {
                console.warn(`Error fetching ${clientId}:`, error);
                return 0;
            }
        });

        const journalCounts = await Promise.all(journalPromises);
        totalJournals = journalCounts.reduce((sum, count) => sum + count, 0);

        const recentActivity = await fetchRecentActivityData();

        return {
            totalClients,
            totalJournals,
            recentChanges: recentActivity.length,
            recentActivity
        };
    } catch (error) {
        console.error('Error in fetchDashboardStats:', error);
        // Return default values on error
        return {
            totalClients: Object.keys(CONFIG_PATHS.journals).length,
            totalJournals: 0,
            recentChanges: 0,
            recentActivity: [{
                action: 'Error',
                file: 'Failed to load statistics',
                user: 'system',
                time: 'now'
            }]
        };
    }
}

/**
 * Generate HTML for recent activity
 * @param {Array} activities - Array of activity objects
 * @returns {string} HTML string
 */
function generateRecentActivityHTML(activities) {
    if (!activities || activities.length === 0) {
        return '<p class="text-muted">No recent activity</p>';
    }

    return activities.map(activity => `
        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <div>
                <strong>${activity.action}</strong> ${activity.file}
                <br>
                <small class="text-muted">by ${activity.user}</small>
            </div>
            <small class="text-muted">${activity.time}</small>
        </div>
    `).join('');
}

/**
 * Load client configuration list
 */
async function loadClientList() {
    try {
        showLoading(true);

        const container = document.getElementById('clientListContainer');
        if (!container) return;

        // TODO: Replace with actual API call
        const clients = await fetchClientList();

        const html = clients.map(client => `
            <div class="tree-item" onclick="loadClientConfig('${client.id}')">
                <i class="fas fa-folder text-warning"></i> 
                <strong>${client.name}</strong>
                <span class="badge badge-custom bg-primary ms-2">${client.journalCount} journals</span>
                <div class="float-end">
                    <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); editClient('${client.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteClient('${client.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html || '<p class="text-muted">No clients found</p>';

    } catch (error) {
        console.error('Error loading client list:', error);
        showNotification('Error loading client list', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Fetch client list from server
 * @returns {Promise<Array>} Array of client objects
 */
async function fetchClientList() {
    try {
        const clients = [];

        // Get all journal clients
        for (const [clientId, path] of Object.entries(CONFIG_PATHS.journals)) {
            try {
                const response = await fetch(path);
                if (!response.ok) {
                    console.warn(`Failed to fetch ${clientId}`);
                    continue;
                }

                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

                // Get client name from XML
                const impactNode = xmlDoc.querySelector('impact');
                const customerName = impactNode ? impactNode.getAttribute('customer') : clientId;

                // Count journals
                const journals = xmlDoc.querySelectorAll('listofjournals > journal');

                clients.push({
                    id: clientId,
                    name: getClientDisplayName(clientId, customerName),
                    journalCount: journals.length,
                    type: 'journals'
                });
            } catch (error) {
                console.error(`Error processing ${clientId}:`, error);
            }
        }

        // Get all book clients
        for (const [clientId, path] of Object.entries(CONFIG_PATHS.books)) {
            try {
                const response = await fetch(path);
                if (!response.ok) {
                    console.warn(`Failed to fetch ${clientId} books`);
                    continue;
                }

                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

                // Get client name from XML
                const impactNode = xmlDoc.querySelector('impact');
                const customerName = impactNode ? impactNode.getAttribute('customer') : clientId;

                // Count books (similar structure to journals)
                const books = xmlDoc.querySelectorAll('listofbooks > book, listofjournals > journal');

                clients.push({
                    id: clientId,
                    name: getClientDisplayName(clientId, customerName) + ' (Books)',
                    journalCount: books.length,
                    type: 'books'
                });
            } catch (error) {
                console.error(`Error processing ${clientId} books:`, error);
            }
        }

        return clients;
    } catch (error) {
        console.error('Error in fetchClientList:', error);
        return [];
    }
}

/**
 * Load client configuration
 * @param {string} clientId - Client identifier
 * @param {string} [journalShort] - Optional journal short code to view only
 */
async function loadClientConfig(clientId, journalShort) {
    const configType = CONFIG_PATHS.journals[clientId] ? 'journals' : 'books';
    const configPath = CONFIG_PATHS[configType][clientId];

    if (!configPath) {
        showNotification('Configuration not found for client: ' + clientId, 'error');
        return;
    }

    try {
        showLoading(true);

        // If journalShort is provided, try to load SPLIT file first
        if (journalShort) {
            const splitDir = configPath.replace('config.xml', 'split/');
            const splitPath = `${splitDir}${journalShort}.xml`;

            try {


                let splitContent = await fetchXMLFile(splitPath);
                if (splitContent && !splitContent.includes('error') && !splitContent.includes('Sample Journal Configuration')) {
                    // Success loading split file
                    currentFile = splitPath;
                    originalXMLContent = splitContent;

                    if (xmlEditor) xmlEditor.setValue(splitContent);

                    const displayName = getClientDisplayName(clientId, clientId);
                    const currentConfigTitleEl = document.getElementById('currentConfigTitle');
                    if (currentConfigTitleEl) {
                        currentConfigTitleEl.textContent = `${displayName} - ${journalShort} (Split Config)`;
                    }

                    switchView('xml-editor');
                    showLoading(false);
                    return;
                }
                console.log("Split file not found or invalid, falling back to registry");
            } catch (e) {
                console.log("Error checking split file", e);
            }
        }

        // Fallback: Load from Main Registry (config.xml)
        let content = await fetchXMLFile(configPath);

        if (journalShort) {
            // Extract specific journal from registry
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');

            // Try both journal and book tags
            const journalNode = xmlDoc.querySelector(`journal[short="${journalShort}"], book[short="${journalShort}"], book[code="${journalShort}"]`);

            if (journalNode) {
                const serializer = new XMLSerializer();
                content = formatXMLString(serializer.serializeToString(journalNode));
                // Still points to main config for saving (unless we want to enforce split save?)
                currentFile = configPath;
                // If we loaded from registry, saving should probably warn or split?
                // For now, let's keep it simple: viewing from registry.
            } else {
                throw new Error(`Journal '${journalShort}' not found in configuration`);
            }
        } else {
            currentFile = configPath;
            const fileSelector = document.getElementById('xmlFileSelector');
            if (fileSelector) {
                // Check if this option exists, if not add it
                let optionExists = false;
                for (let i = 0; i < fileSelector.options.length; i++) {
                    if (fileSelector.options[i].value === configPath) {
                        fileSelector.selectedIndex = i;
                        optionExists = true;
                        break;
                    }
                }

                // If option doesn't exist, add it and select it
                if (!optionExists) {
                    const option = document.createElement('option');
                    option.value = configPath;
                    option.text = `${clientId.toUpperCase()} - Config`;
                    option.selected = true;
                    fileSelector.add(option);
                }
            }
        }

        if (!journalShort) {
            showNotification(`Loaded ${clientId.toUpperCase()} configuration`, 'success');
        }

    } catch (error) {
        console.error('Error loading client config:', error);
        showNotification('Error loading configuration', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Basic XML formatting for serialized strings
 * @param {string} xml - XML string
 * @returns {string} Formatted XML
 */
function formatXMLString(xml) {
    let formatted = '';
    let reg = /(>)(<)(\/*)/g;
    xml = xml.replace(reg, '$1\r\n$2$3');
    let pad = 0;
    xml.split('\r\n').forEach(function (node) {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (node.match(/^<\/\w/)) {
            if (pad !== 0) {
                pad -= 1;
            }
        } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
            indent = 1;
        } else {
            indent = 0;
        }

        let padding = '';
        for (let i = 0; i < pad; i++) {
            padding += '    ';
        }

        formatted += padding + node + '\r\n';
        pad += indent;
    });

    return formatted.trim();
}

/**
 * Load journals by client
 * @param {string} clientId - Client identifier
 */
async function loadJournalsByClient(clientId) {
    if (!clientId) {
        document.getElementById('journalListContainer').innerHTML = '<p class="text-muted">Select a client to view journals</p>';
        return;
    }

    try {
        showLoading(true);

        const journals = await fetchJournalsByClient(clientId);
        const container = document.getElementById('journalListContainer');

        const html = journals.map(journal => `
            <div class="journal-list-item">
                <div>
                    <strong>${journal.short}</strong> - ${journal.title}
                    <br>
                    <small class="text-muted">Batch: ${journal.batch || 'N/A'} | By: ${journal.by || 'N/A'}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-success" onclick="viewJournalConfig('${clientId}', '${journal.short}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="downloadJournalConfig('${clientId}', '${journal.short}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html || '<p class="text-muted">No journals found for this client</p>';

    } catch (error) {
        console.error('Error loading journals:', error);
        showNotification('Error loading journals', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Fetch journals by client
 * @param {string} clientId - Client identifier
 * @returns {Promise<Array>} Array of journal objects
 */
async function fetchJournalsByClient(clientId) {
    console.log('[DEBUG] fetchJournalsByClient called with:', clientId);
    try {
        // Determine the path based on client type
        let configPath = CONFIG_PATHS.journals[clientId] || CONFIG_PATHS.books[clientId];
        console.log('[DEBUG] configPath resolved to:', configPath);
        console.log('[DEBUG] CONFIG_PATHS.journals:', CONFIG_PATHS.journals);
        console.log('[DEBUG] CONFIG_PATHS.books:', CONFIG_PATHS.books);

        if (!configPath) {
            console.error(`[DEBUG] No configuration path found for client: ${clientId}`);
            return [];
        }

        // Try to fetch from master_split.xml first
        const masterSplitPath = configPath.replace(/config\.xml$/, 'split/master_split.xml');
        console.log('[DEBUG] Trying master_split.xml path:', masterSplitPath);

        let response = await fetch(masterSplitPath);
        console.log('[DEBUG] Master split fetch response status:', response.status, response.ok);

        let xmlText;
        let usedMasterSplit = false;

        if (response.ok) {
            xmlText = await response.text();
            usedMasterSplit = true;
            console.log('[DEBUG] Using master_split.xml, XML text length:', xmlText.length);
        } else {
            // Fallback to original config.xml
            console.log('[DEBUG] master_split.xml not found, falling back to config.xml');
            console.log('[DEBUG] Fetching from:', configPath);
            response = await fetch(configPath);
            console.log('[DEBUG] Fetch response status:', response.status, response.ok);
            if (!response.ok) {
                throw new Error(`Failed to fetch configuration for ${clientId}`);
            }
            xmlText = await response.text();
            console.log('[DEBUG] Using config.xml, XML text length:', xmlText.length);
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        // Check for parsing errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            console.error('[DEBUG] XML parsing error:', parseError.textContent);
            return [];
        }

        const journals = [];
        let journalNodes;

        if (usedMasterSplit) {
            // Query for journals in master_split.xml structure: <journals><journal .../></journals>
            journalNodes = xmlDoc.querySelectorAll('journals > journal');
        } else {
            // Query for journals in original config.xml structure
            journalNodes = xmlDoc.querySelectorAll('listofjournals > journal, listofbooks > book');
        }
        console.log('[DEBUG] Found journalNodes:', journalNodes.length);

        journalNodes.forEach(journalNode => {
            const short = journalNode.getAttribute('short') || journalNode.getAttribute('code') || 'N/A';
            const title = journalNode.getAttribute('journal-title') ||
                journalNode.getAttribute('book-title') ||
                journalNode.getAttribute('title') || 'Untitled';
            const batch = journalNode.getAttribute('batch') || 'N/A';
            const by = journalNode.getAttribute('by') || 'N/A';
            const abbr = journalNode.getAttribute('abbr') || '';

            journals.push({
                short,
                title,
                batch,
                by,
                abbr,
                clientId
            });
        });

        return journals;
    } catch (error) {
        console.error(`Error fetching journals for ${clientId}:`, error);
        return [];
    }
}

/**
 * Extract the full XML for a specific journal/book node.
 * @param {string} xmlString - Source XML
 * @param {string} journalShort - Journal short/code
 * @returns {string} Serialized XML node
 */
function extractJournalNodeXML(xmlString, journalShort) {
    if (!xmlString || !journalShort) return '';

    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) return '';

    const nodeSelector = `journal[short="${journalShort}"], book[short="${journalShort}"], book[code="${journalShort}"]`;
    let journalNode = xmlDoc.querySelector(nodeSelector);

    if (!journalNode) {
        const rootNode = xmlDoc.documentElement;
        if (
            rootNode &&
            (rootNode.tagName === 'journal' || rootNode.tagName === 'book') &&
            (rootNode.getAttribute('short') === journalShort || rootNode.getAttribute('code') === journalShort)
        ) {
            journalNode = rootNode;
        }
    }

    return journalNode ? serializer.serializeToString(journalNode) : '';
}

/**
 * Download a journal configuration XML file.
 * @param {string} clientId - Client identifier
 * @param {string} journalShort - Journal short code
 */
async function downloadJournalConfig(clientId, journalShort) {
    const configType = CONFIG_PATHS.journals[clientId] ? 'journals' : 'books';
    const configPath = CONFIG_PATHS[configType][clientId];

    if (!configPath) {
        showNotification('Configuration not found for client: ' + clientId, 'error');
        return;
    }

    try {
        showLoading(true);

        const splitPath = configPath.replace('config.xml', `split/${journalShort}.xml`);
        const splitContent = await fetchXMLFile(splitPath);
        let xmlContent = extractJournalNodeXML(splitContent, journalShort);

        if (!xmlContent) {
            const mainContent = await fetchXMLFile(configPath);
            xmlContent = extractJournalNodeXML(mainContent, journalShort);
        }

        if (!xmlContent) {
            throw new Error(`Journal '${journalShort}' not found in configuration`);
        }

        downloadXMLContent(xmlContent, `${journalShort}.xml`);
        showNotification(`Downloaded ${journalShort}.xml`, 'success');
    } catch (error) {
        console.error('Error downloading journal config:', error);
        showNotification('Error downloading journal configuration', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Load XML file content
 * @param {string} filePath - Path to XML file
 */
async function loadXMLFile(filePath) {
    if (!filePath) return;

    try {
        showLoading(true);

        const xmlContent = await fetchXMLFile(filePath);
        if (xmlEditor) {
            xmlEditor.setValue(xmlContent);
            originalXMLContent = xmlContent;
            currentFile = filePath;
        }

        showNotification('File loaded successfully', 'success');

    } catch (error) {
        console.error('Error loading XML file:', error);
        showNotification('Error loading file', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Fetch XML file content from server
 * @param {string} filePath - Path to XML file
 * @returns {Promise<string>} XML content
 */
async function fetchXMLFile(filePath) {
    // TODO: Replace with actual API call
    return new Promise((resolve, reject) => {
        fetch(filePath)
            .then(response => {
                if (!response.ok) throw new Error('File not found');
                return response.text();
            })
            .then(text => resolve(text))
            .catch(error => {
                // Return sample XML for demo
                resolve(getSampleXML());
            });
    });
}

/**
 * Save XML file
 */
async function saveXMLFile() {
    if (!xmlEditor) {
        showNotification('No file loaded', 'warning');
        return;
    }

    try {
        showLoading(true);

        const content = xmlEditor.getValue();

        // Validate before saving
        const validation = validateXMLContent(content);
        if (!validation.valid) {
            showNotification(`Validation failed: ${validation.error}`, 'error');
            return;
        }

        // Fallback: if file path is unavailable, download current editor XML.
        if (!currentFile) {
            const fileName = getXMLDownloadFileName(content);
            downloadXMLContent(content, fileName);
            /* await persistAdminConfigActivity('download', {
                file: fileName,
                mode: 'xml_editor_unbound',
                xmlShort: extractXmlShortCode(content)
            }); */
            originalXMLContent = content;
            const createAnother = confirm(`Downloaded ${fileName}. Do you want to create another configuration?`);
            if (createAnother) {
                switchView('create-new');
            } else {
                switchView('dashboard');
            }
            return;
        }

        // TODO: Replace with actual API call
        await saveXMLToServer(currentFile, content);
        /* await persistAdminConfigActivity('save', {
            file: currentFile,
            xmlShort: extractXmlShortCode(content)
        }); */

        originalXMLContent = content;
        showNotification('File saved successfully', 'success');

        // Log to history
        logChange('save', currentFile);

    } catch (error) {
        console.error('Error saving file:', error);
        showNotification('Error saving file', 'error');
    } finally {
        showLoading(false);
    }
}
/**
 * Save XML content to server
 * @param {string} filePath - Path to save file
 * @param {string} content - XML content
 * @returns {Promise<void>}
 */
async function saveXMLToServer(filePath, content) {
    // TODO: Implement actual API call
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Saving to:', filePath);
            console.log('Content length:', content.length);
            resolve();
        }, 500);
    });
}

function getXMLDownloadFileName(xmlContent) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        const root = xmlDoc.documentElement;

        if (!root) return 'config.xml';

        if (root.tagName === 'journal' || root.tagName === 'book') {
            const shortCode = root.getAttribute('short') || root.getAttribute('code');
            if (shortCode) return `${shortCode}.xml`;
        }

        if (root.tagName === 'impact') {
            const customer = root.getAttribute('customer');
            if (customer) return `${customer}.xml`;
        }

        return 'config.xml';
    } catch (error) {
        return 'config.xml';
    }
}

function downloadXMLContent(xmlContent, fileName) {
    const blob = new Blob([xmlContent], {
        type: 'application/xml;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'config.xml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Validate XML content
 * @param {string} xmlContent - XML string to validate
 * @returns {Object} Validation result
 */
function validateXMLContent(xmlContent) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        const parseError = xmlDoc.getElementsByTagName('parsererror');
        if (parseError.length > 0) {
            return {
                valid: false,
                error: parseError[0].textContent
            };
        }

        return {
            valid: true
        };

    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

/**
 * Validate XML file
 */
function validateXML() {
    if (!xmlEditor) return;

    const content = xmlEditor.getValue();
    const result = validateXMLContent(content);

    if (result.valid) {
        showNotification('XML is valid ✓', 'success');
    } else {
        showNotification(`Validation error: ${result.error}`, 'error');
    }
}

/**
 * Format XML content
 */
function formatXML() {
    if (!xmlEditor) return;

    try {
        const content = xmlEditor.getValue();
        const formatted = formatXMLString(content);
        xmlEditor.setValue(formatted);
        showNotification('XML formatted successfully', 'success');
    } catch (error) {
        showNotification('Error formatting XML', 'error');
    }
}

/**
 * Format XML string with proper indentation
 * @param {string} xml - XML string
 * @returns {string} Formatted XML
 */
function formatXMLString(xml) {
    const PADDING = '    ';
    const reg = /(>)(<)(\/*)/g;
    let formatted = '';
    let pad = 0;

    xml = xml.replace(reg, '$1\r\n$2$3');

    xml.split('\r\n').forEach(node => {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (node.match(/^<\/\w/)) {
            if (pad !== 0) {
                pad -= 1;
            }
        } else if (node.match(/^<\w([^>]*[^\/])?>.*$/)) {
            indent = 1;
        } else {
            indent = 0;
        }

        formatted += PADDING.repeat(pad) + node + '\r\n';
        pad += indent;
    });

    return formatted.trim();
}

/**
 * Revert changes to original content
 */
function revertChanges() {
    if (!xmlEditor || !originalXMLContent) return;

    if (confirm('Are you sure you want to revert all changes?')) {
        xmlEditor.setValue(originalXMLContent);
        showNotification('Changes reverted', 'info');
    }
}

/**
 * Create new configuration
 */
async function createNewConfiguration() {
    const configType = document.getElementById('configType').value;
    // Determine client name based on type
    let clientName;
    if (configType === 'journal') {
        clientName = document.getElementById('existingClientSelect').value;
    } else {
        // Fallback or explicit input
        clientName = document.getElementById('clientName').value;
    }

    const journalShort = document.getElementById('journalShort').value;
    const abbTitle = (document.getElementById('abbTitle') && document.getElementById('abbTitle').value) || '';
    const journalTitle = document.getElementById('journalTitle').value;
    const templateBase = document.getElementById('templateBase').value;

    // Additional fields
    const mantisId = document.getElementById('mantisId').value;
    const batchNumber = document.getElementById('batchNumber').value;
    const orderBy = document.getElementById('orderBy').value;
    const qcBy = document.getElementById('qcBy').value;
    const copyBy = document.getElementById('copyBy').value;

    if (!configType || !clientName) {
        showNotification('Please provide Configuration Type and Client Name', 'warning');
        return;
    }

    if (configType === 'journal' && !journalShort) {
        showNotification('Journal Short Code is required for Journal Configuration', 'warning');
        return;
    }

    try {
        showLoading(true);

        // Generate XML
        var xmlContent = "";

        // For 'journal' type additions to existing clients:
        if (configType === 'journal') {
            // 1. Get Base Config Path
            const configPath = CONFIG_PATHS.journals[clientName] || CONFIG_PATHS.books[clientName];
            if (!configPath) throw new Error('Client config path not found');

            // --- SPLIT FILE LOGIC ---
            // Construct path: .../config/journals/lww/config.xml -> .../config/journals/lww/split/ACD.xml
            const splitDir = configPath.replace('config.xml', 'split/');
            const splitPath = `${splitDir}${journalShort}.xml`;


            const templateData = templateBase ?
                await fetchTemplateInnerXML(clientName, templateBase) :
                '';

            xmlContent = await generateConfigXML(configType, {
                client: clientName,
                journalShort,
                abbTitle,
                journalTitle,
                mantisId,
                batchNumber,
                orderBy,
                qcBy,
                copyBy,
                template: templateBase,
                templateData
            });

            // Save the individual journal file
            await saveXMLToServer(splitPath, xmlContent);

            originalXMLContent = xmlContent;
            await persistAdminConfigActivity('create_journal', {
                file: splitPath,
                client: clientName,
                journalShort
            });

            if (xmlEditor) {
                xmlEditor.setValue(xmlContent);
                // await loadXMLFile(splitPath);                
            }
            switchView('xml-editor');
            /*
            // --- REGISTRY UPDATE LOGIC (config.xml) ---
            let existingXML = await fetchXMLFile(configPath);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(existingXML, 'text/xml');
            const listNode = xmlDoc.querySelector('listofjournals') || xmlDoc.querySelector('listofbooks');

            if (listNode) {
                // Create temp node wrapper to parse the string
                const tempWrapper = document.createElement('div');
                tempWrapper.innerHTML = xmlContent;
                const newJournalNode = tempWrapper.firstElementChild;

                // Append to main config registry
                listNode.appendChild(xmlDoc.createTextNode("\n        "));
                listNode.appendChild(newJournalNode);
                listNode.appendChild(xmlDoc.createTextNode("\n    "));

                const serializer = new XMLSerializer();
                const updatedConfigXML = formatXMLString(serializer.serializeToString(xmlDoc));

                // Save the main config file (Registry)
                await saveXMLToServer(configPath, updatedConfigXML);

                // Load the saved split file so editor shows persisted content.
                await loadXMLFile(splitPath);

                showNotification(`Journal ${journalShort} created at ${splitPath}`, 'success');
                switchView('xml-editor');

            } else {
                showNotification('Could not find listofjournals/books in client file', 'error');
                // Split file was still saved; load it directly into editor.
                if (xmlEditor) {
                    xmlEditor.setValue(xmlContent);
                    await loadXMLFile(splitPath);
                }
                switchView('xml-editor');
            }
            */

        } else {
            xmlContent = await generateConfigXML(configType, {
                client: clientName,
                journalShort,
                abbTitle,
                journalTitle,
                mantisId,
                batchNumber,
                orderBy,
                qcBy,
                copyBy,
                template: templateBase
            });

            // New Client Creation
            const newPath = `assets/${iVersion}/config/journals/${clientName}/config.xml`;
            await saveXMLToServer(newPath, xmlContent);
            await persistAdminConfigActivity('create_client', {
                file: newPath,
                client: clientName
            });

            if (xmlEditor) xmlEditor.setValue(xmlContent);
            currentFile = newPath;

            showNotification('Client configuration created successfully', 'success');
            switchView('xml-editor');
        }

        // Reset form
        document.getElementById('createConfigForm').reset();
        applyCreateConfigDefaults();

        // Reset inputs visibility
        const inputContainer = document.getElementById('clientInputContainer');
        const selectContainer = document.getElementById('clientSelectContainer');
        if (inputContainer && selectContainer) {
            inputContainer.style.display = 'block';
            selectContainer.style.display = 'none';
        }

        // Refresh UI
        loadClientList();

    } catch (error) {
        console.error('Error creating configuration:', error);
        showNotification('Error creating configuration: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Generate configuration XML or Node String
 * @param {string} type - Configuration type
 * @param {Object} data - Configuration data
 * @returns {Promise<string>} Generated XML string
 */
async function generateConfigXML(type, data, options = {}) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const formatted = `${pad(now.getDate())}_${months[now.getMonth()]}_${now.getFullYear()}_${pad(displayHours)}_${pad(now.getMinutes())}_${ampm}`;
    const createdBy = `ADMIN-UI_${formatted}`;

    if (type === 'journal') {
        let journalInnerXML = `
            <author data-name="contrib" surname="yes" given-names="yes" />
            <affiliation data-name="aff" designators="Alphabets" />
            <abstract data-name="abstract" GA="true" />
            <keywords data-name="keywords" seperator=", " minimum="3" maximum="10" />
        `;

        // If templateBase is selected, copy all inner nodes from template.
        if (data.template && data.templateData) {
            journalInnerXML = data.templateData;
        }

        // Return just the journal node
        return `<journal short="${data.journalShort}" abbr="${data.abbTitle || ''}" journal-title="${data.journalTitle}" mantis="${data.mantisId}" batch="${data.batchNumber}" by="${data.orderBy}" copy-by="${data.copyBy}" qc-by="${data.qcBy}" data-created="${createdBy}">
            ${journalInnerXML}
        </journal>`;
    } else {
        // Return full client XML
        return `<?xml version="1.0" encoding="UTF-8"?>
<impact customer="${data.client}">
    <project type="journals">
        <pages name="pages" />
        <dialogs name="ModuleDialogs">
            <functionality name="GuideTour" show="true" showForAU="true" showForCO="true" />
            <functionality name="AlertDialogModule" show="true" showForAU="true" showForCO="true" />
        </dialogs>
        <listofjournals>
            <journal short="${data.journalShort}" abbr="${data.abbTitle || ''}" journal-title="${data.journalTitle}" mantis="${data.mantisId}" batch="${data.batchNumber}" by="${data.orderBy}" copy-by="${data.copyBy}" qc-by="${data.qcBy}" data-created="${createdBy}">
                <author data-name="contrib" surname="yes" given-names="yes" />
                <affiliation data-name="aff" designators="Alphabets" />
                <abstract data-name="abstract" GA="true" />
                <keywords data-name="keywords" seperator=", " minimum="3" maximum="10" />
            </journal>
        </listofjournals>
    </project>
</impact>`;
    }
}

/**
 * Fetch template journal inner XML (children only), trying split XML first then config.xml
 * @param {string} clientId - Client identifier
 * @param {string} templateShort - Template journal short/code
 * @returns {Promise<string>} Inner XML string
 */
async function fetchTemplateInnerXML(clientId, templateShort) {
    const configPath = CONFIG_PATHS.journals[clientId] || CONFIG_PATHS.books[clientId];
    if (!configPath || !templateShort) return '';

    const splitPath = configPath.replace('config.xml', `split/${templateShort}.xml`);
    const splitXML = await fetchXMLFile(splitPath);
    let extractedInner = extractTemplateInnerXML(splitXML, templateShort);

    // Fallback to main config.xml if split file is unavailable.
    if (!extractedInner) {
        const mainXML = await fetchXMLFile(configPath);
        extractedInner = extractTemplateInnerXML(mainXML, templateShort);
    }

    return extractedInner || '';
}

/**
 * Extract children XML from a matching journal/book node
 * @param {string} xmlString - Source XML
 * @param {string} templateShort - Template journal short/code
 * @returns {string} Inner XML string
 */
function extractTemplateInnerXML(xmlString, templateShort) {
    if (!xmlString || !templateShort) return '';

    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) return '';

    const nodeSelector = `journal[short="${templateShort}"], book[short="${templateShort}"], book[code="${templateShort}"]`;
    let templateNode = xmlDoc.querySelector(nodeSelector);

    if (!templateNode) {
        const rootNode = xmlDoc.documentElement;
        if (
            rootNode &&
            (rootNode.tagName === 'journal' || rootNode.tagName === 'book') &&
            (rootNode.getAttribute('short') === templateShort || rootNode.getAttribute('code') === templateShort)
        ) {
            templateNode = rootNode;
        }
    }

    if (!templateNode) return '';

    return Array.from(templateNode.childNodes)
        .map(node => serializer.serializeToString(node))
        .join('\n')
        .trim();
}

/**
 * Populate existing client selector
 */
function populateExistingClientSelector() {
    const selector = document.getElementById('existingClientSelect');
    if (!selector) return;

    selector.innerHTML = '<option value="">Select Existing Client</option>';

    // Merge Journals and Books clients
    const clients = new Set([
        ...Object.keys(CONFIG_PATHS.journals),
        ...Object.keys(CONFIG_PATHS.books)
    ]);

    clients.forEach(clientId => {
        const option = document.createElement('option');
        option.value = clientId;
        option.text = getClientDisplayName(clientId, clientId);
        selector.appendChild(option);
    });
}

/**
 * Load journals into template dropdown for a specific client
 * @param {string} clientId 
 */
async function loadClientJournalsForTemplate(clientId) {
    console.log('[DEBUG] loadClientJournalsForTemplate called with clientId:', clientId);
    const templateSelect = document.getElementById('templateBase');
    console.log('[DEBUG] templateSelect found:', !!templateSelect);
    if (!templateSelect) return;

    if (!clientId) {
        console.log('[DEBUG] No clientId, resetting template dropdown');
        templateSelect.innerHTML = '<option value="">Start from scratch (Default)</option>';
        return;
    }

    try {
        console.log('[DEBUG] Fetching journals for client:', clientId);
        // Reuse fetchJournalsByClient from admin-config-helpers.js (wait, it's in this file?)
        // fetchJournalsByClient is in this file locally.
        const journals = await fetchJournalsByClient(clientId);
        console.log('[DEBUG] Journals fetched:', journals.length, journals);

        let html = '<option value="">Start from scratch (Default)</option>';
        if (journals.length > 0) {
            html += `<optgroup label="Copy from existing ${clientId.toUpperCase()} journals">`;
            journals.forEach(j => {
                html += `<option value="${j.short}">${j.short} - ${j.title}</option>`;
            });
            html += '</optgroup>';
        }

        console.log('[DEBUG] Setting templateSelect HTML with', journals.length, 'journals');
        templateSelect.innerHTML = html;

    } catch (e) {
        console.error('Error loading template journals', e);
        templateSelect.innerHTML = '<option value="">Start from scratch (Default)</option>';
    }
}

/**
 * Compare two configuration files
 */
async function compareConfigs() {
    const file1 = document.getElementById('compareFile1').value;
    const file2 = document.getElementById('compareFile2').value;

    if (!file1 || !file2) {
        showNotification('Please select both files to compare', 'warning');
        return;
    }

    try {
        showLoading(true);

        const content1 = await fetchXMLFile(file1);
        const content2 = await fetchXMLFile(file2);

        const diff = generateDiff(content1, content2);
        document.getElementById('compareResult').innerHTML = diff;

    } catch (error) {
        console.error('Error comparing files:', error);
        showNotification('Error comparing files', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Generate diff HTML
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {string} Diff HTML
 */
function generateDiff(text1, text2) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');

    let html = '<table class="table table-sm"><tbody>';

    const maxLines = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLines; i++) {
        const line1 = lines1[i] || '';
        const line2 = lines2[i] || '';

        if (line1 !== line2) {
            if (line1) {
                html += `<tr class="diff-removed"><td>${escapeHtml(line1)}</td></tr>`;
            }
            if (line2) {
                html += `<tr class="diff-added"><td>${escapeHtml(line2)}</td></tr>`;
            }
        } else {
            html += `<tr><td>${escapeHtml(line1)}</td></tr>`;
        }
    }

    html += '</tbody></table>';
    return html;
}

/**
 * Load change history
 */
async function loadChangeHistory() {
    try {
        showLoading(true);

        const history = await fetchChangeHistory();
        const container = document.getElementById('historyContainer');

        if (!history || history.length === 0) {
            container.innerHTML = '<p class="text-muted">No change history available</p>';
            return;
        }

        const groupedByClientBatch = history.reduce((acc, item) => {
            const clientKey = item.clientId || 'unknown';
            const batchKey = item.batch || 'N/A';
            const groupKey = `${clientKey}__${batchKey}`;
            if (!acc[groupKey]) {
                acc[groupKey] = {
                    clientId: clientKey,
                    batch: batchKey,
                    items: []
                };
            }
            acc[groupKey].items.push(item);
            return acc;
        }, {});

        const sortedGroups = Object.values(groupedByClientBatch).sort((a, b) => {
            const clientCompare = String(a.clientId).localeCompare(String(b.clientId), undefined, {
                numeric: true,
                sensitivity: 'base'
            });
            if (clientCompare !== 0) return clientCompare;
            return String(a.batch).localeCompare(String(b.batch), undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        });

        const html = sortedGroups.map((group, batchIndex) => {
            const groupItems = group.items;
            const clientLabel = String(group.clientId || 'unknown').toUpperCase();
            const batchLabel = group.batch || 'N/A';
            const collapseId = `historyBatch_${clientLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}_${String(batchLabel).replace(/[^a-zA-Z0-9_-]/g, '_')}_${batchIndex}`;
            const eventRow = (meta, badgeClass, iconClass, label) => {
                if (!meta) return '';
                return `
                    <div class="mb-2">
                        <span class="badge ${badgeClass}" style="width: 85px; display: inline-block;"><i class="${iconClass}"></i> ${label}</span>
                        <span class="ms-2"><strong>${meta.user}</strong></span>
                        <small class="text-muted ms-2">${formatHistoryDate(meta.date)}</small>
                        <small class="text-muted ms-1">(${meta.raw})</small>
                    </div>
                `;
            };

            const getCommonMeta = (key) => {
                const metas = groupItems.map(item => item[key]).filter(Boolean);
                if (metas.length !== groupItems.length) return null;
                const firstRaw = metas[0].raw || '';
                const allSame = metas.every(meta => (meta.raw || '') === firstRaw);
                return allSame ? metas[0] : null;
            };

            const commonDataCreated = getCommonMeta('dataCreated');
            const commonCreated = getCommonMeta('created');
            const commonDeployed = getCommonMeta('deployed');
            const commonEventsHtml = `
                ${eventRow(commonDataCreated, 'bg-secondary', 'fas fa-database', 'UI Created')}
                ${eventRow(commonCreated, 'bg-success', 'fas fa-plus-circle', 'Created')}
                ${eventRow(commonDeployed, 'bg-primary', 'fas fa-rocket', 'Deployed')}
            `.trim();

            const journalsHtml = groupItems.map(item => {
                return `
                <div class="card-custom mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h5 class="mb-3">
                                    <i class="fas fa-book text-secondary me-2"></i>
                                    <strong>${item.file}</strong>
                                </h5>
                                <p class="mb-3 text-dark"><strong>${item.journal}</strong></p>
                                ${commonDataCreated ? '' : eventRow(item.dataCreated, 'bg-secondary', 'fas fa-database', 'UI Created')}
                                ${commonCreated ? '' : eventRow(item.created, 'bg-success', 'fas fa-plus-circle', 'Created')}
                                ${commonDeployed ? '' : eventRow(item.deployed, 'bg-primary', 'fas fa-rocket', 'Deployed')}
                            </div>
                            <div class="ms-3">
                                <button class="btn btn-sm btn-outline-primary mb-2" onclick="viewSingleJournal('${item.clientId}', '${item.journalShort}')">
                                    <i class="fas fa-eye"></i> View Journal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('');

            return `
            <div class="card-custom mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="fas fa-layer-group text-info me-2"></i>
                            Client <strong>${clientLabel}</strong>
                            <span class="ms-2">Batch <strong>${batchLabel}</strong></span>
                            <span class="badge bg-secondary ms-2">${groupItems.length} journal(s)</span>
                        </h5>
                        <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    ${commonEventsHtml ? `<div class="mt-3">${commonEventsHtml}</div>` : ''}
                    <div id="${collapseId}" class="collapse mt-3">
                        ${journalsHtml}
                    </div>
                </div>
            </div>
            `;
        }).join('');

        container.innerHTML = html;

    } catch (error) {
        console.error('Error loading history:', error);
        showNotification('Error loading history', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Format history date for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted date string
 */
function formatHistoryDate(timestamp) {
    try {
        const date = new Date(timestamp);
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    } catch (error) {
        return timestamp;
    }
}

/**
 * Fetch change history
 * @returns {Promise<Array>} History items
 */
async function fetchChangeHistory() {
    try {
        const history = [];
        let historyId = 1;

        // Helper function to extract history from any XML document
        const extractHistoryFromXml = (xmlDoc, clientId, selectors) => {
            const elements = xmlDoc.querySelectorAll(selectors);

            elements.forEach(element => {
                const short = element.getAttribute('short') || element.getAttribute('code') || 'Unknown';
                const title = element.getAttribute('journal-title') || element.getAttribute('book-title') || 'Untitled';
                const batch = element.getAttribute('batch') || 'N/A';
                const by = element.getAttribute('by') || '';
                const copyBy = element.getAttribute('copy-by') || '';
                const dataCreatedRaw = element.getAttribute('data-created') || '';

                if (!by && !copyBy && !dataCreatedRaw) return;

                // Helper to parse and create history entry
                const parseAttr = (val) => {
                    if (!val) return null;

                    const parts = val.split('_');

                    // ❌ only user, no date part → invalid
                    if (parts.length < 2) {
                        console.log(`Invalid format for by/copy-by in ${clientId}/${short}: ${val}`);
                        return null;
                    }

                    const user = parts[0] || 'Unknown';
                    const dateStr = parts.slice(1).join('_');
                    const date = parseAttributeDate(dateStr);

                    return {
                        user,
                        date,
                        raw: val
                    };
                };


                const created = by ? parseAttr(by) : null;
                const deployed = copyBy ? parseAttr(copyBy) : null;
                const dataCreated = parseDataCreatedMeta(dataCreatedRaw);
                const time = (deployed ? deployed.date : (created ? created.date : (dataCreated ? dataCreated.date : null)));
                if (!time) {
                    console.log(`No time found for ${clientId}/${short}`);
                    return;
                }

                history.push({
                    id: String(historyId++),
                    file: `${clientId}/${short}`,
                    journal: title,
                    batch,
                    clientId,
                    journalShort: short,
                    dataCreated,
                    created,
                    deployed,
                    timestamp: (deployed ? deployed.date : (created ? created.date : (dataCreated ? dataCreated.date : null)))
                });
            });
        };

        const processConfigPaths = async (configPaths, selectors) => {
            for (const [clientId, path] of Object.entries(configPaths)) {
                try {
                    const response = await fetch(path);
                    if (!response.ok) continue;

                    const xmlText = await response.text();
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

                    extractHistoryFromXml(xmlDoc, clientId, selectors);
                } catch (error) {
                    console.error(`Error parsing history for ${clientId}:`, error);
                }
            }
        };

        // Process both journals and books
        await processConfigPaths(CONFIG_PATHS.journals, 'listofjournals > journal');
        await processConfigPaths(CONFIG_PATHS.books, 'listofbooks > book, listofjournals > journal');

        // Sort by date in descending order (most recent first)
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return history;
    } catch (error) {
        console.error('Error in fetchChangeHistory:', error);
        return [];
    }
}

/**
 * Parse date from attribute format (e.g., "02_Feb_26" -> "2026-02-02")
 * @param {string} dateStr - Date string from attribute
 * @returns {string} ISO date string
 */
function parseAttributeDate(dateStr) {
    try {
        const parts = dateStr.split('_');

        // ❌ not enough parts for a date
        if (parts.length < 3) {
            return null;
        }

        const [dayRaw, monthStr, yearRaw] = parts;

        const months = {
            Jan: '01',
            Feb: '02',
            Mar: '03',
            Apr: '04',
            May: '05',
            Jun: '06',
            Jul: '07',
            Aug: '08',
            Sep: '09',
            Oct: '10',
            Nov: '11',
            Dec: '12'
        };

        if (
            !/^\d{1,2}$/.test(dayRaw) ||
            !months[monthStr] ||
            !/^\d{2}$/.test(yearRaw)
        ) {
            return null;
        }

        const day = dayRaw.padStart(2, '0');
        const year = `20${yearRaw}`;
        const month = months[monthStr];

        return `${year}-${month}-${day}T12:00:00`;

    } catch {
        return null;
    }
}

function parseDataCreatedMeta(rawValue) {
    if (!rawValue || typeof rawValue !== 'string') return null;
    if (!rawValue.startsWith('ADMIN-UI_') && !rawValue.startsWith('ADMIN_UI_')) return null;

    const dateStr = rawValue.replace(/^ADMIN[-_]UI_/, '');
    let date;

    // Try parsing new format: "26_JUN_2026_07_33_PM"
    const match = dateStr.match(/^(\d{2})_(\w{3})_(\d{4})_(\d{2})_(\d{2})_(AM|PM)$/);
    if (match) {
        const months = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
        const day = parseInt(match[1], 10);
        const month = months[match[2].toUpperCase()];
        const year = parseInt(match[3], 10);
        let hours = parseInt(match[4], 10);
        const minutes = parseInt(match[5], 10);
        const ampm = match[6];

        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;

        if (month !== undefined) {
            date = new Date(year, month, day, hours, minutes);
        }
    }

    // Fallback: Try parsing as ISO format (backward compatibility)
    if (!date || isNaN(date.getTime())) {
        date = new Date(dateStr);
    }

    if (!date || isNaN(date.getTime())) return null;

    return {
        user: 'ADMIN_UI',
        date: date.toISOString(),
        raw: rawValue
    };
}


/**
 * Run validation on selected file
 */
async function runValidation() {
    const filePath = document.getElementById('validateFileSelector').value;
    if (!filePath) {
        showNotification('Please select a file to validate', 'warning');
        return;
    }

    try {
        showLoading(true);

        const content = await fetchXMLFile(filePath);
        const result = validateXMLContent(content);

        const resultContainer = document.getElementById('validationResult');

        if (result.valid) {
            resultContainer.innerHTML = `
                <div class="alert alert-success">
                    <h5><i class="fas fa-check-circle"></i> Validation Successful</h5>
                    <p>The XML file is well-formed and valid.</p>
                </div>
            `;
        } else {
            resultContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h5><i class="fas fa-times-circle"></i> Validation Failed</h5>
                    <p><strong>Error:</strong> ${result.error}</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Error validating file:', error);
        showNotification('Error validating file', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Populate compare file selectors
 */
function populateCompareSelectors() {
    const files = [];

    // Add all journal configs
    for (const [clientId, path] of Object.entries(CONFIG_PATHS.journals)) {
        files.push({
            value: path,
            label: `${getClientDisplayName(clientId, clientId)} - Journals`
        });
    }

    // Add all book configs
    for (const [clientId, path] of Object.entries(CONFIG_PATHS.books)) {
        files.push({
            value: path,
            label: `${getClientDisplayName(clientId, clientId)} - Books`
        });
    }

    const options = files.map(f => `<option value="${f.value}">${f.label}</option>`).join('');

    const selector1 = document.getElementById('compareFile1');
    const selector2 = document.getElementById('compareFile2');

    if (selector1) {
        selector1.innerHTML = '<option value="">Select file...</option>' + options;
    }

    if (selector2) {
        selector2.innerHTML = '<option value="">Select file...</option>' + options;
    }
}

/**
 * Export all configurations
 */
async function exportAllConfigs() {
    try {
        showLoading(true);

        // TODO: Implement actual export functionality
        showNotification('Export functionality coming soon', 'info');

    } catch (error) {
        console.error('Error exporting configs:', error);
        showNotification('Error exporting configurations', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Filter sidebar items based on search query
 * @param {string} query - Search query
 */
function filterSidebarItems(query) {
    const items = document.querySelectorAll('.sidebar-item');
    const lowerQuery = query.toLowerCase();

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(lowerQuery) ? 'flex' : 'none';
    });
}

/**
 * Refresh all data
 */
function refreshData() {
    const sideBar = document.querySelector('.sidebar-item.active');
    const currentView = sideBar && sideBar.dataset.view || 'dashboard';
    loadViewData(currentView);
    showNotification('Data refreshed', 'info');
}

/**
 * Show/hide loading overlay
 * @param {boolean} show - Whether to show loading
 */
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

/**
 * Show notification message
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '10000';
    notification.style.minWidth = '300px';
    notification.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <span>${message}</span>
            <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

/**
 * Check if content has been modified
 * @returns {boolean} True if modified
 */
function isModified() {
    if (!xmlEditor || !originalXMLContent) return false;
    return xmlEditor.getValue() !== originalXMLContent;
}

/**
 * Mark content as modified
 */
function markAsModified() {
    // Could add visual indicator here
}

/**
 * Log change to history
 * @param {string} action - Action performed
 * @param {string} file - File affected
 */
function logChange(action, file) {
    configData.history.push({
        action,
        file,
        // TODO: Get from session
        user: 'current_user',
        timestamp: new Date().toISOString()
    });
}

async function fetchRecentActivityData() {
    const dbActivities = await fetchAdminConfigActivitiesFromDB(5);
    const historyItems = await fetchChangeHistory();

    const historyActivities = historyItems.slice(0, 5).map(item => ({
        action: 'History',
        file: item.journalShort || item.xmlShort || item.client || 'config.xml',
        user: (item.deployed && item.deployed.user) || (item.created && item.created.user) || (item.dataCreated && item.dataCreated.user) || USER_MAIL || 'admin',
        time: getTimeAgo(new Date(item.timestamp)),
        timestamp: item.timestamp
    }));

    const merged = [...dbActivities, ...historyActivities]
        .filter(item => item && item.timestamp && !isNaN(new Date(item.timestamp).getTime()))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

    if (merged.length > 0) return merged;

    if (configData.history && configData.history.length > 0) {
        return configData.history.slice(-5).reverse().map(item => ({
            action: item.action,
            file: item.journalShort || item.xmlShort || item.client || 'config.xml',
            user: item.user,
            time: getTimeAgo(new Date(item.timestamp)),
            timestamp: item.timestamp
        }));
    }

    return [{
        action: 'System',
        file: 'Configuration Manager Initialized',
        user: USER_MAIL || 'admin',
        time: 'Just now',
        timestamp: new Date().toISOString()
    }];
}

async function fetchAdminConfigActivitiesFromDB(limit = 5) {
    try {
        const response = await callAjaxAsPromise({
            tbl: ADMIN_CONFIG_ACTIVITY_TABLE,
            find: {
                "client": {
                    "$exists": true
                },
                "action": "create_journal"
            },
            length: limit,
            sort: {
                timestamp: -1
            }
        }, API_GET_DOCS);

        const records = getRecordsFromResponse(response);
        return records.map(record => {
            const timestamp = getRecordTimestamp(record);
            return {
                action: record.action || record.type || 'DB Update',
                file: record.journalShort || record.xmlShort || record.client || 'config.xml',
                user: record.user || record.username || record.displayName || USER_MAIL || 'admin',
                time: timestamp ? getTimeAgo(new Date(timestamp)) : 'Just now',
                timestamp: timestamp || new Date().toISOString()
            };
        });
    } catch (error) {
        console.warn('Unable to fetch recent activities from DB:', error);
        return [];
    }
}

async function persistAdminConfigActivity(action, payload = {}) {
    try {
        const timestamp = new Date().toISOString();
        const record = {
            dataId: `cfg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            action,
            // file: payload.file || '',
            client: payload.client || '',
            journalShort: payload.journalShort || payload.xmlShort || '',
            mode: payload.mode || '',
            user: USER_MAIL || USER_ID || 'admin',
            displayName: USER_DISPLAYNAME || '',
            role: WF_ROLE || '',
            timestamp,
            created_at: timestamp,
            status: 'active'
        };

        const response = await callAjaxAsPromise({
            tbl: ADMIN_CONFIG_ACTIVITY_TABLE,
            find: {
                dataId: record.dataId
            },
            length: 1,
            update: record
        }, API_FIND_UPDATE_INSERT);

        return response;
    } catch (error) {
        console.warn('Unable to persist admin config activity:', error);
        return null;
    }
}

function callAjaxAsPromise(jsondata, endpoint) {
    return new Promise((resolve, reject) => {
        if (!commonfn || typeof commonfn.callajax !== 'function') {
            resolve(null);
            return;
        }

        const cbName = `admin_config_cb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const timeoutId = setTimeout(() => {
            delete commonfn[cbName];
            resolve(null);
        }, 5000);

        commonfn[cbName] = function (response) {
            clearTimeout(timeoutId);
            delete commonfn[cbName];
            resolve(response);
        };

        try {
            commonfn.callajax(jsondata, cbName, endpoint || API_FIND_UPDATE_INSERT);
        } catch (error) {
            clearTimeout(timeoutId);
            delete commonfn[cbName];
            reject(error);
        }
    });
}

function getRecordsFromResponse(response) {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.records)) return response.records;
    if (Array.isArray(response.res)) return response.res;
    if (Array.isArray(response.result)) return response.result;
    if (Array.isArray(response.r)) return response.r;
    return [];
}

function getRecordTimestamp(record) {
    return record.timestamp || record.created_at || record.updated_at || record.time || record.date || record.time_c || null;
}

function extractXmlShortCode(xmlContent) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        const root = xmlDoc.documentElement;
        if (!root) return '';
        return root.getAttribute('short') || root.getAttribute('code') || '';
    } catch (error) {
        return '';
    }
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get sample XML for demo purposes
 * @returns {string} Sample XML
 */
function getSampleXML() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<impact customer="lww">
    <project type="journals">
        <pages name="pages" />
        <dialogs name="ModuleDialogs">
            <functionality name="GuideTour" show="true" showForAU="true" showForCO="true" />
            <functionality name="AlertDialogModule" show="true" showForAU="true" showForCO="true" />
        </dialogs>
        <listofjournals>
            <journal short="SAMPLE" abbr="" journal-title="Sample Journal">
                <author data-name="contrib" surname="yes" given-names="yes" />
                <affiliation data-name="aff" designators="Alphabets" />
                <abstract data-name="abstract" GA="true" />
                <keywords data-name="keywords" seperator=", " minimum="3" maximum="10" />
            </journal>
        </listofjournals>
    </project>
</impact>`;
}

/**
 * Get client display name
 * @param {string} clientId - Client ID
 * @param {string} customerName - Customer name from XML
 * @returns {string} Display name
 */
function getClientDisplayName(clientId, customerName) {
    const clientNames = {
        'lww': 'LWW (Lippincott Williams & Wilkins)',
        'oup': 'OUP (Oxford University Press)',
        'plos': 'PLOS (Public Library of Science)',
        'medknow': 'Medknow Publications',
        'brill': 'Brill Publishers',
        'tnfjournals': 'Taylor & Francis Journals',
        'acs': 'ACS (American Chemical Society)',
        'apa': 'APA (American Psychological Association)',
        'intellect': 'Intellect Journals',
        // 'nihr': 'NIHR Journals Library',
        'oso': 'OSO (Oxford Scholarship Online)',
        'tnf': 'Taylor & Francis',
        'oxmedo': 'Oxford Medical Online',
        'lse': 'LSE Press',
    };

    return clientNames[clientId] || customerName || clientId.toUpperCase();
}

/**
 * Get time ago string from date
 * @param {Date} date - Date object
 * @returns {string} Time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' year' + (Math.floor(interval) > 1 ? 's' : '') + ' ago';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' month' + (Math.floor(interval) > 1 ? 's' : '') + ' ago';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' day' + (Math.floor(interval) > 1 ? 's' : '') + ' ago';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hour' + (Math.floor(interval) > 1 ? 's' : '') + ' ago';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minute' + (Math.floor(interval) > 1 ? 's' : '') + ' ago';

    return Math.floor(seconds) + ' second' + (Math.floor(seconds) > 1 ? 's' : '') + ' ago';
}

// Helper functions moved to admin-config-helpers.js

// Stub functions for actions
function editClient(clientId) {
    showNotification(`Edit client: ${clientId}`, 'info');
}

function deleteClient(clientId) {
    if (confirm(`Are you sure you want to delete client ${clientId}?`)) {
        showNotification(`Client ${clientId} deleted`, 'success');
        loadClientList();
    }
}

function viewSingleJournal(clientId, journalShort) {
    // ✅ Load only the single journal XML data into the editor
    loadClientConfig(clientId, journalShort);
}

function viewJournalConfig(clientId, journalShort) {
    // ✅ Use single view extraction
    viewSingleJournal(clientId, journalShort);
}

function viewHistoryItem(id, file, journalName, clientId, journalShort) {
    if (clientId && journalShort) {
        viewSingleJournal(clientId, journalShort);
    } else {
        // Fallback to client config if params missing
        const cid = file.split('/')[0];
        loadClientConfig(cid);
    }
}

function restoreVersion(id) {
    if (confirm('Are you sure you want to restore this version?')) {
        showNotification(`Version ${id} restored`, 'success');
    }
}

if (typeof window !== 'undefined') {
    window.switchView = switchView;
    window.refreshData = refreshData;
    window.exportAllConfigs = exportAllConfigs;
    window.loadClientConfig = loadClientConfig;
    window.loadJournalsByClient = loadJournalsByClient;
    window.loadXMLFile = loadXMLFile;
    window.saveXMLFile = saveXMLFile;
    window.validateXML = validateXML;
    window.formatXML = formatXML;
    window.revertChanges = revertChanges;
    window.compareConfigs = compareConfigs;
    window.runValidation = runValidation;
    window.editClient = editClient;
    window.deleteClient = deleteClient;
    window.viewSingleJournal = viewSingleJournal;
    window.viewJournalConfig = viewJournalConfig;
    window.downloadJournalConfig = downloadJournalConfig;
    window.viewHistoryItem = viewHistoryItem;
    window.restoreVersion = restoreVersion;
    window.toggleSidebarMode = toggleSidebarMode;
    window.switchCreateConfigView = showCreateConfigTab;
    window.initializeConfigManagementUI = initializeConfigManagementUI;
    window.clearConfigManagementOutput = clearConfigManagementOutput;
    window.switchConfigManagementTab = switchConfigManagementTab;
    window.loadConfigManagementDashboard = loadConfigManagementDashboard;
    window.refreshConfigMgmtUi = refreshConfigMgmtUi;
    window.cmSelectClient = cmSelectClient;
    window.cmSelectJournal = cmSelectJournal;
    window.cmSelectField = cmSelectField;
    window.cmSaveClientUi = cmSaveClientUi;
    window.cmDeleteClientUi = cmDeleteClientUi;
    window.cmClearClientForm = cmClearClientForm;
    window.cmEditClient = cmEditClient;
    window.cmDrillToJournals = cmDrillToJournals;
    window.cmSaveJournalUi = cmSaveJournalUi;
    window.cmDeleteJournalUi = cmDeleteJournalUi;
    window.cmClearJournalForm = cmClearJournalForm;
    window.cmEditJournal = cmEditJournal;
    window.cmDrillToFields = cmDrillToFields;
    window.cmSaveFieldUi = cmSaveFieldUi;
    window.cmDeleteFieldUi = cmDeleteFieldUi;
    window.cmClearFieldForm = cmClearFieldForm;
    window.cmEditField = cmEditField;
    window.cmDrillToTemplate = cmDrillToTemplate;
    window.cmSaveTemplateUi = cmSaveTemplateUi;
    window.cmDeleteTemplateUi = cmDeleteTemplateUi;
    window.cmClearTemplateForm = cmClearTemplateForm;
    window.cmEditTemplate = cmEditTemplate;
    window.renderClientsTab = renderClientsTab;
    window.renderJournalsTab = renderJournalsTab;
    window.renderFieldsTab = renderFieldsTab;
    window.renderTemplatesTab = renderTemplatesTab;
    window.resolveConfigByJournalCode = resolveConfigByJournalCode;
    window.listTemplates = listTemplates;
    window.createTemplate = createTemplate;
    window.updateTemplate = updateTemplate;
    window.deleteTemplate = deleteTemplate;
    window.listJournalMappings = listJournalMappings;
    window.saveJournalMapping = saveJournalMapping;
    window.saveJournalOverride = saveJournalOverride;
    window.searchAuditRecords = searchAuditRecords;
    window.loadSQLitePath = loadSQLitePath;
    window.loadSQLiteStatus = loadSQLiteStatus;
    window.loadSQLiteHealth = loadSQLiteHealth;
    window.refreshSQLiteHealth = refreshSQLiteHealth;
}
