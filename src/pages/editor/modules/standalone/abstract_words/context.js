import ContextHelpers from '@editor/modules/context/helpers/context-helpers.js';

const ABSTRACT_WORDS_MODULE_ID = 'AbstractWordCounter';
const ABSTRACT_WORDS_MODULE_CONFIG = {
    name: 'AbstractWordCounter',
    path: './abstract_words/index.js',
    type: 'onthefly',
    templatePath: 'abstract_words/template.html',
    dependencies: [],
    trackView: false
};

ContextHelpers.whenDomReady( () => {
    ContextHelpers.registerOnReady(ABSTRACT_WORDS_MODULE_ID, ABSTRACT_WORDS_MODULE_CONFIG, {
        isJournalOnly: true
    });
});