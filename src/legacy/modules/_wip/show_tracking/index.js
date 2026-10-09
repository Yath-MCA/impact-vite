/**
 * ShowTrackingModule — class-based Review Changes (localhost simplified stack).
 * No M_FUN / get_entry_info. Lists plain insert/del + data-track-code only.
 */

import {
    TRACK_CODES,
    PENDING_NEW_CODES,
    hasTrackCodeConfig,
    resolveTrackCodeForLegacyAttr,
    linkTypeToTrackCode
} from './support/trackCodes.js';
import { isShowTrackingSimplePath } from './support/localhostGate.js';
import { PanelEvents } from './support/panelEvents.js';
import { PanelSync } from './support/panelSync.js';
import { PanelActions } from './support/panelActions.js';
import { buildPanelList } from './support/panelList.js';

class ShowTrackingModule extends BaseModule {
    constructor(name = 'ShowTrackingModule', errorTracker = null, options = {}) {
        super(name, errorTracker, options);
        this._id = 'trackDialogModule';
        this.canUnmountComponentWhileClose = true;
        this.IsDisable_OffLine = true;
        this.configLoaded = false;
        this.TRACK_CODES = TRACK_CODES;
        this.PENDING_NEW_CODES = PENDING_NEW_CODES;
        this.TRACK_DATA = null;
        this.filterConfig = {};
        this.trackInfoMessages = {};
        this._simplePathActive = false;
        this._activeEntry = null;
        this._panelVisible = false;

        this.sync = new PanelSync(this);
        this.actions = new PanelActions(this);
        this.events = new PanelEvents(this);

        window.trackDialog = this;
    }

    /**
     * True when simplified class stack should run (localhost gate).
     * @returns {boolean}
     */
    isSimplePathEnabled() {
        return isShowTrackingSimplePath();
    }

    applySupportConfig(config) {
        try {
            const data = config || window.TP_SUPPORT_CONFIG || window.SHOW_TRACKING_SUPPORT_DATA;
            if (!data) return false;
            window.TP_SUPPORT_CONFIG = this.TRACK_DATA = data;
            this.filterConfig = data.new_tracking_code || {};
            this.trackInfoMessages = data.existing_config_msg || {};
            this.configLoaded = true;
            return true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShowTrackingModule.applySupportConfig', err.message);
            return false;
        }
    }

    getFilterConfig() {
        return this.filterConfig ||
            (this.TRACK_DATA && this.TRACK_DATA.new_tracking_code) ||
            {};
    }

    hasTrackCode(code) {
        return hasTrackCodeConfig(this.getFilterConfig(), code);
    }

    resolveLegacyTrackCode(attr, value) {
        return resolveTrackCodeForLegacyAttr(attr, value);
    }

    linkTypeToTrackCode(linkType) {
        return linkTypeToTrackCode(linkType);
    }

    /**
     * @param {string} code
     * @param {{accept?: Function, reject?: Function}} handlers
     */
    registerTrackAction(code, handlers) {
        this.actions.registerAction(code, handlers);
    }

    async Initialize() {
        try {
            this.applySupportConfig();
            window.trackDialog = this;
            if (!this.isSimplePathEnabled()) {
                this._simplePathActive = false;
                console.info('[ShowTracking] Simplified class stack inactive (not localhost).');
                return;
            }
            this._simplePathActive = true;
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShowTrackingModule.Initialize', err.message);
        }
    }

    async initLoop(data) {
        try {
            await this.Initialize();
            if (!this._simplePathActive) return;
            if (this.Panel) {
                this.events.wire();
            }
            if (data && data.openPanel) {
                this.openPanel();
            }
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShowTrackingModule.initLoop', err.message);
        }
    }

    async showLoop() {
        try {
            if (!this._simplePathActive) {
                if (!this.isSimplePathEnabled()) return;
                this._simplePathActive = true;
            }
            this.openPanel();
        } catch (err) {
            console.warn(err.message);
            ErrorLogTrace('ShowTrackingModule.showLoop', err.message);
        }
    }

    isPanelActive() {
        return this._panelVisible && this._simplePathActive;
    }

    openPanel() {
        if (!this._simplePathActive && !this.isSimplePathEnabled()) return;
        this._simplePathActive = true;
        this.applySupportConfig();
        if (typeof this.setAllLabels === 'function') {
            this.setAllLabels();
        }
        this.renderFullList();
        this.events.wire();
        this._panelVisible = true;
        if (this.Panel) {
            this.Panel.classList.remove('ds-none');
            this.Panel.style.display = '';
        }
        this.events.updateButtonState();
    }

    closePanel() {
        this._panelVisible = false;
        this.sync.cancelScheduledSync();
        if (this.Panel) {
            this.Panel.classList.add('ds-none');
        }
        this.clearActiveEntry();
    }

    renderFullList() {
        const editorRoot = this.sync.getEditorRoot();
        const panelRoot = this.sync.getPanelRoot();
        if (!panelRoot) return;
        const built = buildPanelList(editorRoot, this.getFilterConfig());
        panelRoot.innerHTML = built.html;
        this._populateUserFilter(built.dtos);
        this.refreshCountsFromPanel();
    }

    _populateUserFilter(dtos) {
        const select = this.Panel && this.Panel.querySelector('#TrackSelectOpt');
        if (!select) return;
        const users = {};
        for (let i = 0; i < (dtos || []).length; i++) {
            const key = dtos[i].username + (dtos[i].role || '');
            users[key] = dtos[i].username + (dtos[i].role ? ' (' + dtos[i].role + ')' : '');
        }
        let html = '<option value="all">All</option>';
        Object.keys(users).forEach(function (key) {
            html += '<option value="' + key.replace(/"/g, '&quot;') + '">' +
                String(users[key]).replace(/</g, '&lt;') + '</option>';
        });
        select.innerHTML = html;
    }

    refreshCountsFromPanel() {
        const panelRoot = this.sync.getPanelRoot();
        const panel = this.Panel;
        if (!panelRoot || !panel) return;
        const entries = panelRoot.querySelectorAll('.entry');
        let ins = 0;
        let del = 0;
        let format = 0;
        for (let i = 0; i < entries.length; i++) {
            const tag = (entries[i].getAttribute('data-tag') || '').toLowerCase();
            if (tag === 'del') del += 1;
            else if (tag === 'for' || tag === 'format') format += 1;
            else ins += 1;
        }
        const setText = function (id, n) {
            const el = panel.querySelector(id);
            if (el) el.textContent = String(n);
        };
        setText('#TrackinsCount', ins);
        setText('#TrackdelCount', del);
        setText('#TrackformatCount', format);
        setText('#overallCount', entries.length);
        const cur = panel.querySelector('#tp_curIndex');
        if (cur) {
            const active = this.getActiveEntry();
            const list = Array.prototype.slice.call(entries);
            cur.textContent = active ? String(list.indexOf(active) + 1) : '0';
        }
    }

    setActiveEntry(entry) {
        this._activeEntry = entry || null;
        this.events.updateButtonState();
    }

    getActiveEntry() {
        return this._activeEntry;
    }

    clearActiveEntry() {
        this._activeEntry = null;
        this.events.updateButtonState();
    }
}

export default ShowTrackingModule;
export { isShowTrackingSimplePath };
