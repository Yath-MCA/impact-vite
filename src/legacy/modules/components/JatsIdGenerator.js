/**
 * JATS journal ID generator — Phase 1 ports current journal shapes.
 */
class JatsIdGenerator extends IdGenerator {
    constructor(options = {}) {
        super(Object.assign({}, options, { format: 'jats' }));
    }

    static TYPE_SELECTORS = {
        fig: '[data-name="fig"], div.fig',
        'table-wrap': '[data-name="table-wrap"], div.table-wrap, div.table',
        fn: '[data-name="fn"], div.fn',
        'fn-group': '[data-name="fn-group"], div.fn-group',
        ref: '[data-name="ref"], div.ref',
        'ref-list': '[data-name="ref-list"], div.ref-list',
        'disp-formula': '[data-name="disp-formula"], div.disp-formula'
    };

    resolveContext(options = {}) {
        const scope = options.scope ||
            (typeof GlobalEditor !== 'undefined' && GlobalEditor.document && GlobalEditor.document.$) ||
            (typeof document !== 'undefined' ? document.body : null);
        return {
            format: 'jats',
            family: 'journal',
            scope: scope
        };
    }

    getPattern(type) {
        switch (type) {
            case 'fn':
                return 'fn{nnnn}';
            case 'fig':
                return 'F{n}';
            case 'table-wrap':
            case 'table':
                return 'T{n}';
            case 'ref':
                return 'CIT{nnnn}';
            case 'ref-list':
                return 'ref-list-{n}';
            case 'fn-group':
                return 'fn-group-{n}';
            case 'disp-formula':
                return 'disp-formula-{n}';
            default:
                return null;
        }
    }

    padSeq(seq, token) {
        const n = Number(seq) || 0;
        if (token === '{nnnn}') {
            return String(n).padStart(4, '0');
        }
        return super.padSeq(seq, token);
    }

    fillPattern(pattern, tokens = {}) {
        let out = String(pattern || '');
        const seq = tokens.nnnn != null ? tokens.nnnn : (tokens.nnn != null ? tokens.nnn : tokens.n);
        if (seq != null) {
            out = out.replace(/\{nnnn\}/g, this.padSeq(seq, '{nnnn}'));
        }
        return super.fillPattern(out, tokens);
    }

    scanMaxSeq(scope, type) {
        if (!scope || !scope.querySelectorAll) {
            return 0;
        }
        const selector = JatsIdGenerator.TYPE_SELECTORS[type] || ('[data-name="' + type + '"]');
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
        const normalizedType = type === 'table' ? 'table-wrap' : type;
        const pattern = this.getPattern(normalizedType);
        if (!pattern) {
            this.fail('unknown_type', 'unknown_type:' + type);
        }
        const context = this.resolveContext(options);
        const scope = options.scope || context.scope;
        let seq = options.seq != null ? Number(options.seq) : null;
        if (seq == null) {
            seq = this.scanMaxSeq(scope, normalizedType) + 1;
        }
        if (!seq || seq < 1) {
            seq = 1;
        }

        let candidate = this.fillPattern(pattern, { n: seq, nnn: seq, nnnn: seq });
        const dom = options.dom ||
            (typeof document !== 'undefined' ? document : null);
        if (dom) {
            candidate = this.ensureUniqueId(dom, candidate);
            const m = String(candidate).match(/(\d+)(?!.*\d)/);
            if (m) {
                seq = Number(m[1]);
            }
        }

        return {
            id: candidate,
            type: normalizedType,
            format: 'jats',
            family: 'journal',
            baseId: null,
            seq: seq,
            pattern: pattern
        };
    }
}

IdGenerator.register('jats', JatsIdGenerator);

if (typeof window !== 'undefined') {
    window.JatsIdGenerator = JatsIdGenerator;
}
