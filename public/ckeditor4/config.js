/**
 * @license Copyright (c) 2003-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see https://ckeditor.com/legal/ckeditor-oss-license
 */

CKEDITOR.editorConfig = function(config) {
    // Define changes to default configuration here.
    // For complete reference see:
    // https://ckeditor.com/docs/ckeditor4/latest/api/CKEDITOR_config.html

    // The toolbar groups arrangement, optimized for two toolbar rows.
    config.toolbarGroups = [{
            name: 'document',
            groups: []
        },        
        {
            name: 'clipboard',
            groups: ['Undo', 'Redo', '-', 'Cut', 'Copy ']
        },
        {
            name: 'basicstyles',
            groups: ['basicstyles', 'cleanup']
        },
        {
            name: 'paragraph',
            groups: ['NumberedList', 'BulletedList', 'find']
        }

    ];

    // Remove some buttons provided by the standard plugins, which are
    // not needed in the Standard(s) toolbar.
    config.removeButtons = 'Underline,Subscript,Superscript';

    // Set the most common block elements.
    config.format_tags = 'p;h1;h2;h3;pre';

    // Simplify the dialog windows.
    config.removeDialogTabs = 'image:advanced;link:advanced';
    config.height = '100%';
    config.width = '100%';
    config.language = 'en';
    config.removePlugins = ['showblocks', 'resize', 'iframe', 'smiley', 'flash', 'a11ychecker', 'balloonpanel', 'divarea', 'texzilla', 'format', 'contents', 'balloontoolbar', 'letterspacing', 'newpage', 'magicline', 'codesnippet', 'toc', 'stylesheetparser', 'footnotes', 'crossreference', 'div', 'elementspath', 'scayt', 'link'];
    config.copyFormatting_allowRules = 'b; s; u; strong; span; p; table; thead; tbody; ' + 'tr; td; th; ol; ul; li; (*)[*]{*}';
    config.removeFormatTags = 'b,big,cite,code,del,dfn,em,font,i,kbd,q,s,samp,small,strike,strong';
    config.removeFormatAttributes = 'valign';
    config.allowedContent = true;
    config.extraAllowedContent = '*(*)[*]{*}';
    config.shiftEnterMode = CKEDITOR.ENTER_BR;
    config.autoParagraph = false;
    config.ignoreEmptyParagraph = false;
    config.entities = false;
    config.entities_greek = false;
    config.entities_latin = false;
    config.htmlEncodeOutput = false;
    config.entities_processNumerical = true;
    // Converts from '&nbsp;' into '&#160;';
    config.entities_processNumerical = 'force';
    config.tabSpaces = 4;
    config.fillEmptyBlocks = false;

    config.linkJavaScriptLinksAllowed = true;
    config.forcePasteAsPlainText = 'allow-word';
    // ? https://ckeditor.com/docs/ckeditor4/latest/api/CKEDITOR_config.html#cfg-pasteFilter
    config.pasteFilter = 'semantic-content';
};