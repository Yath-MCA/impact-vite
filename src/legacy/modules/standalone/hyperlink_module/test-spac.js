class testUrl {
    /**
     * Functional test for getRefElemConfig and createReferenceElement across all known clients.
     * Run from the browser console: HyperlinkDialogModule.testClientConfigs()
     */
    static testClientConfigs() {
        const CLIENTS = ['OUP', 'LWW', 'BRILL', 'PLOS', 'MEDKNOW', 'INTELLECT'];
        const TYPES = ['body-url', 'reference-url', 'doi-full', 'doi-partial', 'email'];
        const SAMPLE_URL = 'https://example.com/page';
        const SAMPLE_DOI = 'https://doi.org/10.1234/test';
        const SAMPLE_DOI_PARTIAL = '10.1234/test';

        // Expected class per client per type (for assertion)
        const EXPECTED_CLASS = {
            OUP: {
                'body-url': 'ext-link',
                'reference-url': 'ext-link',
                'doi-full': 'ext-link',
                'doi-partial': 'pub-id',
                'email': 'email'
            },
            LWW: {
                'body-url': 'ext-link',
                'reference-url': 'ext-link',
                'doi-full': 'ext-link',
                'doi-partial': 'pub-id',
                'email': 'email'
            },
            BRILL: {
                'body-url': 'ext-link',
                'reference-url': 'ext-link',
                'doi-full': 'ext-link',
                'doi-partial': 'pub-id',
                'email': 'email'
            },
            PLOS: {
                'body-url': 'ext-link',
                'reference-url': 'ext-link',
                'doi-full': 'ext-link',
                'doi-partial': 'pub-id',
                'email': 'email'
            },
            MEDKNOW: {
                'body-url': 'ext-link',
                'reference-url': 'ext-link',
                'doi-full': 'ext-link',
                'doi-partial': 'pub-id',
                'email': 'email'
            },
            INTELLECT: {
                'body-url': 'uri',
                'reference-url': 'uri',
                'doi-full': 'ext-link',
                'doi-partial': 'ext-link',
                'email': 'email'
            }
        };

        const sampleValue = type => {
            if (type === 'email') return 'user@example.com';
            if (type === 'doi-partial') return SAMPLE_DOI_PARTIAL;
            if (type === 'doi-full') return SAMPLE_DOI;
            return SAMPLE_URL;
        };

        let pass = 0,
            fail = 0;
        const results = [];

        CLIENTS.forEach(client => {
            const raw = HyperlinkDialogModule.getLinkRulesRaw();
            const isSpecific = !!(raw.clients && raw.clients[client]);
            TYPES.forEach(type => {
                const val = sampleValue(type);
                const config = HyperlinkDialogModule.getRefElemConfig(type, client, {
                    isJournal: true
                });
                const xml = HyperlinkDialogModule._testCreateRefElem(type, val, client);

                const expectedCls = EXPECTED_CLASS[client][type];
                const ok = config.class === expectedCls;
                ok ? pass++ : fail++;

                results.push({
                    client,
                    type,
                    source: isSpecific ? 'CLIENT' : 'DEFAULT',
                    class: config.class,
                    attrs: JSON.stringify(config),
                    xml,
                    expected: expectedCls,
                    status: ok ? 'PASS' : 'FAIL'
                });
            });
        });

        console.group('HyperlinkDialogModule.testClientConfigs()');
        console.table(results.map(r => ({
            client: r.client,
            type: r.type,
            source: r.source,
            class: r.class,
            attrs: r.attrs,
            xml: r.xml,
            status: r.status
        })));
        console.log('PASS:', pass, '  FAIL:', fail);
        if (fail > 0) console.warn('Failed cases:', results.filter(r => r.status === 'FAIL'));
        console.groupEnd();

        return {
            pass,
            fail,
            results
        };
    }

    // Isolated helper so testClientConfigs has no side-effects on the live instance
    static _testCreateRefElem(type, value, client) {
        try {
            const dialog = HyperlinkDialogModule.create
                ? HyperlinkDialogModule.create(null, {})
                : null;
            if (dialog && typeof dialog.createReferenceElement === 'function') {
                return dialog.createReferenceElement(type, value, client, { isJournal: true });
            }
            const instance = HyperlinkDialogModule.resolveCurrentLinkRules(client, { isJournal: true });
            const token = instance[type];
            const builders = HyperlinkDialogModule.REFERENCE_ELEMENT_BUILDERS;
            const builder = builders[token] || builders[token && String(token)];
            return builder ? builder(value) : value;
        } catch (e) {
            return 'ERROR: ' + e.message;
        }
    }
}
