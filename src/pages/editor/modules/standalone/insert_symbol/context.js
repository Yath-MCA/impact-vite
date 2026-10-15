import ContextHelpers from '@editor/modules/context/helpers/context-helpers.js';

const INSERT_SYMBOL_MODULE_ID = 'SymbolsDialog';
const INSERT_SYMBOL_MODULE_CONFIG = {
    name: 'InsertSymbolModule',
    type: 'ondemand',
    path: './insert_symbol/index.js',
    templatePath: './insert_symbol/template.html',
    dependencies: [],
    supportingFiles: [{
        name: 'support_data',
        type: 'onthefly',
        when: 'initLoop',
        path: './insert_symbol/support_data.json',
        variable: 'SUPPORT_CONFIG'
    }],
    wrapping: true,
    group_name: 'SymbolsDialog',
    groupOrder: 1120,
    commands: []
};

const openInsertSymbolDialog = ContextHelpers.createDebouncedOpen(async () => {
    await ContextHelpers.openDialog(INSERT_SYMBOL_MODULE_ID, INSERT_SYMBOL_MODULE_CONFIG, 'SymbolDiaModule');
});

ContextHelpers.whenDomReady( () => {
    ContextHelpers.registerOnReady(INSERT_SYMBOL_MODULE_ID, INSERT_SYMBOL_MODULE_CONFIG);
});
