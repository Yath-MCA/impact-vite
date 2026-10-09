/**
 * Shared element ID generator — base class + factory.
 * Format subclasses: BitsIdGenerator, JatsIdGenerator, DocBookIdGenerator.
 */
class IdGenerator {
    constructor(options = {}) {
        this.format = options.format || 'unknown';
        this.options = options;
    }

    static registry = Object.create(null);

    static register(format, Ctor) {
        IdGenerator.registry[format] = Ctor;
    }

    static get(format, options = {}) {
        const Ctor = IdGenerator.registry[format];
        if (!Ctor) {
            const err = new Error(`unknown_format:${format}`);
            err.code = 'unknown_format';
            throw err;
        }
        return new Ctor(Object.assign({}, options, { format: format }));
    }

    static forDocument(options = {}) {
        const format = options.format ||
            (typeof IS_JOURNAL !== 'undefined' && IS_JOURNAL ? 'jats' : 'bits');
        return IdGenerator.get(format, options);
    }

    padSeq(seq, token) {
        const n = Number(seq) || 0;
        if (token === '{nnn}') {
            return String(n).padStart(3, '0');
        }
        return String(n);
    }

    fillPattern(pattern, tokens = {}) {
        let out = String(pattern || '');
        if (tokens.baseId != null) {
            out = out.split('{baseId}').join(String(tokens.baseId));
        }
        if (tokens.nnn != null || tokens.n != null) {
            const seq = tokens.nnn != null ? tokens.nnn : tokens.n;
            out = out.replace(/\{nnn\}/g, this.padSeq(seq, '{nnn}'));
            out = out.replace(/\{n\}/g, this.padSeq(seq, '{n}'));
        }
        return out;
    }

    _cssEscape(id) {
        if (typeof CSS !== 'undefined' && CSS.escape) {
            return CSS.escape(id);
        }
        return String(id).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    }

    ensureUniqueId(dom, candidateId) {
        if (!dom || !dom.querySelector || !candidateId) {
            return candidateId;
        }
        let next = candidateId;
        const match = String(candidateId).match(/^(.*?)(\d+)$/);
        let prefix = candidateId;
        let seq = 1;
        let width = 1;
        if (match) {
            prefix = match[1];
            seq = Number(match[2]);
            width = match[2].length;
        }
        let guard = 0;
        while (dom.querySelector('#' + this._cssEscape(next)) && guard < 10000) {
            seq += 1;
            next = prefix + String(seq).padStart(width, '0');
            guard += 1;
        }
        return next;
    }

    resolveContext(_options = {}) {
        return { format: this.format };
    }

    getPattern(_type, _context) {
        return null;
    }

    scanMaxSeq(_scope, _type, _pattern) {
        return 0;
    }

    nextId(_type, _options = {}) {
        this.fail('unsupported_format', 'unsupported_format');
    }

    fail(code, message) {
        const err = new Error(message || code);
        err.code = code;
        throw err;
    }
}

if (typeof window !== 'undefined') {
    window.IdGenerator = IdGenerator;
}
