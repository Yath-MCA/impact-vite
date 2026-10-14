/** Ported from skipped src/legacy/js/index.js */

export const DEFAULT_ROLE = '5b53536b4c4a803e9a5abf70';

export const ROLE_IDS = {
    '5b53536b4c4a803e9a5abf70': {
        name: 'Author',
        pubkit_name: 'author',
        SelectorAttribute: 'showForAU',
        Restrict_Selector: 'ForAU',
        shortname: 'AU',
        backup: '5b53536b4c4a803e9a5abf70_AU',
        Stage: 'Proofing',
        next_mail: 'PE_email,editor_email,collator_email',
        next_role: 'PE_role,editor_role,collator_role',
        tour: {
            OUP: 'role-wise',
            LWW: 'default'
        },
    },
    '5b534e334c4a803e9a5abf4c': {
        name: 'Editor',
        pubkit_name: 'editor',
        SelectorAttribute: 'showForED',
        Restrict_Selector: 'ForED',
        shortname: 'ED',
        backup: '5b534e334c4a803e9a5abf4c_ED',
        Stage: 'ED Review',
        next_mail: 'collator_email',
        next_role: 'collator_role',
        tour: {
            OUP: 'role-wise',
            LWW: 'default'
        },
    },
    '5bcf15b1cf510152afba028a': {
        name: 'Collator',
        pubkit_name: 'collator',
        SelectorAttribute: 'showForCO',
        Restrict_Selector: 'ForCO',
        shortname: 'CO',
        backup: '5bcf15b1cf510152afba028a_CO',
        Stage: 'Collation',
        tour: {
            OUP: 'role-wise',
            LWW: 'default'
        },
    },
    '5bd1c4e2cf51015102014427': {
        name: 'Copyeditor',
        pubkit_name: 'copyEditor',
        SelectorAttribute: 'showForCE',
        Restrict_Selector: 'ForCE',
        shortname: 'CE',
        backup: '5bd1c4e2cf51015102014427_CE',
        Stage: 'CE Review',
        tour: {
            OUP: 'default',
            LWW: 'default'
        },
    },
    '5b534dc54c4a803e9a5abf41': {
        name: 'Project Manager',
        pubkit_name: 'pm',
        SelectorAttribute: 'showForPM',
        Restrict_Selector: 'ForPM',
        shortname: 'PM',
        backup: '5b534dc54c4a803e9a5abf41_PM',
        Stage: 'PM Review',
        tour: {
            OUP: 'default',
            LWW: 'default'
        },
    },
    '5b534e5b4c4a803e9a5abf4f': {
        name: 'Journal Manager',
        pubkit_name: 'jm',
        SelectorAttribute: 'showForJM',
        Restrict_Selector: 'ForJM',
        shortname: 'JM',
        backup: '5b534e5b4c4a803e9a5abf4f_JM',
        Stage: 'JM Review',
        tour: {
            OUP: 'default',
            LWW: 'default'
        },
    },
    '5bcf11635e7186178a22eee0': {
        name: 'Proofreader',
        pubkit_name: 'proofReader',
        SelectorAttribute: 'showForPR',
        Restrict_Selector: 'ForPR',
        shortname: 'PR',
        backup: '5bcf11635e7186178a22eee0_PR',
        Stage: 'Proof Reading',
        tour: {
            OUP: 'default',
            LWW: 'default'
        },
    },
    XML: {
        name: 'XML',
        Stage: 'XML',
        shortname: 'XML'
    },
    '5b534de04c4a803e9a5abf45': {
        name: 'Production Editor',
        pubkit_name: 'pe',
        SelectorAttribute: 'showForPE',
        Restrict_Selector: 'ForPE',
        shortname: 'PE',
        backup: '5b534de04c4a803e9a5abf45_PE',
        Stage: 'PE Review',
        next_mail: 'collator_email',
        next_role: 'collator_role',
        tour: {
            OUP: 'default',
            LWW: 'default'
        },
    },
    '5bcf11635e7186178a22iii1': {
        name: 'Import',
        SelectorAttribute: 'showForIM',
        Restrict_Selector: 'ForIM',
        shortname: 'IM',
        backup: '5bcf11635e7186178a22iii1_IM',
        Stage: 'Import',
    },
    '5bcf1252cf510152afba0203': {
        name: 'Freelancer Cleanup',
        SelectorAttribute: 'showForFC',
        Restrict_Selector: 'ForFC',
        shortname: 'FC',
        backup: '5bcf1252cf510152afba0203_FC',
        Stage: 'Cleanup',
    },
};

export const COLLAB_CLIENTS = ['oso', 'oxmedo'];

export function setKeyofRole(Obj = ROLE_IDS) {
    try {
        for (const key of Object.keys(Obj)) {
            const short_name = Obj[key] && Obj[key].shortname;
            if (short_name) Obj[short_name] = key;
        }
    } catch (err) {
        console.warn(err && err.message);
    }
    return Obj;
}

export function hasCollabClient(client, g = globalThis) {
    try {
        let key = client;
        if (!key && g.SHARED_KEY && g.SHARED_KEY.client) {
            key = g.SHARED_KEY.client;
        }
        if (!key || !g.COLLAB_CLIENTS || !g.COLLAB_CLIENTS.length) return false;
        key = String(key).toLowerCase();
        return g.COLLAB_CLIENTS.indexOf(key) !== -1;
    } catch (err) {
        console.warn(err && err.message);
        return false;
    }
}

export function isCollabEnabled(docId, g = globalThis) {
    try {
        const key =
            docId || g.DOC_ID || (g.SHARED_KEY && g.SHARED_KEY.docid);
        if (!key) return false;
        const localOverride =
            localStorage.getItem(`xmleditor:collabEnabled:${key}`) === 'true';
        const sharedKey = g.SHARED_KEY || {};
        const sharedDocId = sharedKey.docid || g.DOC_ID;
        const sharedEnabled =
            String(sharedKey.collaborative || '').toLowerCase() === 'yes';
        return (
            localOverride ||
            (String(sharedDocId || '') === String(key || '') && sharedEnabled)
        );
    } catch (err) {
        console.warn(err && err.message);
        return false;
    }
}

export function isCollabSessionEnabled(docId, client, collaborative, g = globalThis) {
    try {
        return !!(
            isCollabEnabled(docId, g) &&
            hasCollabClient(client, g) &&
            String(collaborative || '').toLowerCase() === 'yes'
        );
    } catch (err) {
        console.warn(err && err.message);
        return false;
    }
}

export function applyLegacyRoleIds(g) {
    if (typeof g.DEFAULT_ROLE === 'undefined') g.DEFAULT_ROLE = DEFAULT_ROLE;
    if (typeof g.ROLE_IDS === 'undefined') {
        g.ROLE_IDS = {
            ...ROLE_IDS
        };
        setKeyofRole(g.ROLE_IDS);
    } else {
        setKeyofRole(g.ROLE_IDS);
    }
    if (!Array.isArray(g.COLLAB_CLIENTS)) g.COLLAB_CLIENTS = [...COLLAB_CLIENTS];
    if (typeof g.hasCollabClient !== 'function') {
        g.hasCollabClient = (client) => hasCollabClient(client, g);
    }
    if (typeof g.isCollabEnabled !== 'function') {
        g.isCollabEnabled = (docId) => isCollabEnabled(docId, g);
    }
    if (typeof g.isCollabSessionEnabled !== 'function') {
        g.isCollabSessionEnabled = (docId, client, collaborative) =>
            isCollabSessionEnabled(docId, client, collaborative, g);
    }
}