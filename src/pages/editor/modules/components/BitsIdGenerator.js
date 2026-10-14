/**
 * BITS book ID generator (workid vs normal client families).
 */
class BitsIdGenerator extends IdGenerator {
    constructor(options = {}) {
        super(Object.assign({}, options, {
            format: 'bits'
        }));
    }

    static WORKID_CLIENTS = ['OHO', 'OSO', 'OXMEDO'];

    static WORKID_PATTERNS = {
        fig: '{baseId}-fig-{n}',
        'table-wrap': '{baseId}-table-wrap-{n}',
        fn: '{baseId}-fn-{n}',
        'fn-group': '{baseId}-fn-group-{n}',
        ref: '{baseId}-ref-{n}',
        'ref-list': '{baseId}-ref-list-{n}',
        'disp-formula': '{baseId}-disp-formula-{n}'
    };

    static NORMAL_PATTERNS = {
        TNF: {
            fig: 'FIG{n}-fig-{n}',
            'table-wrap': 'table-wrap-{nnn}',
            ref: 'ref-{nnn}',
            'ref-list': 'ref-list-{nnn}',
            'disp-formula': 'disp-formula-{nnn}',
            fn: 'en{n}',
            'fn-group': 'fn-group-{nnn}'
        },
        LSE: {
            fig: 'FIG{n}-fig-{n}',
            'table-wrap': 'table-wrap-{nnn}',
            ref: 'ref-{nnn}',
            'ref-list': 'ref-list-{nnn}',
            'disp-formula': 'disp-formula-{nnn}',
            fn: 'en{n}',
            'fn-group': 'fn-group-{nnn}'
        }
    };

    static TYPE_SELECTORS = {
        fig: '[data-name="fig"], div.fig',
        'table-wrap': '[data-name="table-wrap"], div.table-wrap',
        fn: '[data-name="fn"], div.fn',
        'fn-group': '[data-name="fn-group"], div.fn-group',
        ref: '[data-name="ref"], div.ref',
        'ref-list': '[data-name="ref-list"], div.ref-list',
        'disp-formula': '[data-name="disp-formula"], div.disp-formula'
    };

    _clientCode(options = {}) {
        if (options.client) {
            return String(options.client).toUpperCase();
        }
        if (typeof commonMethods !== 'undefined' && commonMethods.getClientCode) {
            return String(commonMethods.getClientCode({
                    format: 'upper'
                }) ||
                commonMethods.getClientCode() || '').toUpperCase();
        }
        return '';
    }

    _isWorkidClient(client) {
        return BitsIdGenerator.WORKID_CLIENTS.indexOf(client) !== -1;
    }

    resolveContext(options = {}) {
        const client = this._clientCode(options);
        const family = this._isWorkidClient(client) ? 'workid' : 'normal';
        const chapterId = options.chapterId ||
            (typeof EDITOR_CURSOR !== 'undefined' && EDITOR_CURSOR.CUR_CHAPTER_ID) ||
            null;
        let baseId = null;
        let chapter = null;

        if (typeof paraManager !== 'undefined' && paraManager.findChapterByBaseId && chapterId) {
            chapter = paraManager.findChapterByBaseId(chapterId);
            if (chapter && chapter.baseId) {
                baseId = chapter.baseId;
            }
        }

        const scope = options.scope ||
            (typeof EDITOR_CURSOR !== 'undefined' && EDITOR_CURSOR.CUR_CHAPTER) ||
            null;

        return {
            format: 'bits',
            client: client,
            family: family,
            chapterId: chapterId,
            baseId: baseId,
            chapter: chapter,
            scope: scope
        };
    }

    getPattern(type, context) {
        const ctx = context || this.resolveContext();
        if (ctx.family === 'workid') {
            let pattern = BitsIdGenerator.WORKID_PATTERNS[type];
            if (!pattern) {
                return null;
            }
            // OSO footnotes use padded seq in matrix variants
            if (type === 'fn' && ctx.client === 'OSO') {
                pattern = '{baseId}-fn-{nnn}';
            }
            return pattern;
        }
        const row = BitsIdGenerator.NORMAL_PATTERNS[ctx.client];
        if (!row) {
            return null;
        }
        return row[type] || null;
    }

    scanMaxSeq(scope, type, _pattern) {
        if (!scope || !scope.querySelectorAll) {
            return 0;
        }
        const selector = BitsIdGenerator.TYPE_SELECTORS[type] || ('[data-name="' + type + '"]');
        const nodes = scope.querySelectorAll(selector);
        let max = 0;
        for (let i = 0; i < nodes.length; i++) {
            const id = nodes[i].id || '';
            const match = String(id).match(/(\d+)(?!.*\d)/);
            if (match) {
                const n = Number(match[1]);
                if (n > max) {
                    max = n;
                }
            }
        }
        return max;
    }

    nextId(type, options = {}) {
        const context = this.resolveContext(options);
        const pattern = this.getPattern(type, context);
        if (!pattern) {
            this.fail('unsupported_pattern', 'unsupported_pattern:' + type);
        }
        if (context.family === 'workid' && !context.baseId) {
            this.fail('missing_baseId', 'missing_baseId');
        }
        if (context.family === 'workid' && !context.scope && !options.scope) {
            // scope optional if seq forced; still allow with dom-only collision
        }

        const scope = options.scope || context.scope ||
            (typeof document !== 'undefined' ? document.body : null);
        if (!scope && options.seq == null) {
            this.fail('no_chapter_scope', 'no_chapter_scope');
        }

        let seq = options.seq != null ? Number(options.seq) : null;
        if (seq == null) {
            seq = this.scanMaxSeq(scope, type, pattern) + 1;
        }
        if (!seq || seq < 1) {
            seq = 1;
        }

        const tokens = {
            baseId: context.baseId || '',
            n: seq,
            nnn: seq
        };
        let candidate = this.fillPattern(pattern, tokens);
        const dom = options.dom ||
            (typeof document !== 'undefined' ? document : null);
        if (dom) {
            candidate = this.ensureUniqueId(dom, candidate);
            // Re-parse seq from final id when bumped
            const m = String(candidate).match(/(\d+)(?!.*\d)/);
            if (m) {
                seq = Number(m[1]);
            }
        }

        return {
            id: candidate,
            type: type,
            format: 'bits',
            family: context.family,
            baseId: context.baseId,
            seq: seq,
            pattern: pattern
        };
    }
}

IdGenerator.register('bits', BitsIdGenerator);

if (typeof window !== 'undefined') {
    window.BitsIdGenerator = BitsIdGenerator;
}