/**
 * DocBook ID generator — Phase 1 stub.
 */
import IdGenerator from './IdGenerator.js';

class DocBookIdGenerator extends IdGenerator {
    constructor(options = {}) {
        super(Object.assign({}, options, { format: 'docbook' }));
    }

    nextId(_type, _options = {}) {
        this.fail('unsupported_format', 'unsupported_format');
    }

    getPattern(_type, _context) {
        this.fail('unsupported_format', 'unsupported_format');
    }
}

IdGenerator.register('docbook', DocBookIdGenerator);

export default DocBookIdGenerator;

if (typeof window !== 'undefined') {
    window.DocBookIdGenerator = DocBookIdGenerator;
}
