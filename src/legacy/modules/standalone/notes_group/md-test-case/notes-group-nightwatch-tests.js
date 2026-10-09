module.exports = {
    'NotesGroup Initialization Test': function(browser) {
        browser
            .url('http://your-editor-url.com')
            .waitForElementVisible('body', 1000)
            .assert.titleContains('Document Editor')
            .assert.visible('#notes-panel')
            .end();
    },

    'Footnote Insertion Test': function(browser) {
        browser
            .url('http://your-editor-url.com')
            .waitForElementVisible('#footnotes', 1000)
            .click('#footnotes')
            .setValue('#notes-body', 'This is a test footnote.')
            .click('.submit_btn')
            .assert.elementPresent('sup.xref[ref-type="fn"]')
            .assert.elementPresent('.fn-group .fn')
            .end();
    },

    'Endnote Insertion Test': function(browser) {
        browser
            .url('http://your-editor-url.com')
            .waitForElementVisible('#endnotes', 1000)
            .click('#endnotes')
            .setValue('#notes-body', 'This is a test endnote.')
            .click('.submit_btn')
            .assert.elementPresent('sup.xref[ref-type="en"]')
            .assert.elementPresent('.fn-group[content-type="endnotes"] .fn')
            .end();
    },

    'Note Deletion Test': function(browser) {
        browser
            .url('http://your-editor-url.com')
            .waitForElementVisible('sup.xref', 1000)
            .click('sup.xref')
            .waitForElementVisible('#delete-note-btn', 1000)
            .click('#delete-note-btn')
            .assert.not.elementPresent('sup.xref')
            .assert.not.elementPresent('.fn-group .fn')
            .end();
    },

    'Note Renumbering Test': function(browser) {
        browser
            .url('http://your-editor-url.com')
            // Insert two footnotes
            .waitForElementVisible('#footnotes', 1000)
            .click('#footnotes')
            .setValue('#notes-body', 'First footnote')
            .click('.submit_btn')
            .setValue('#notes-body', 'Second footnote')
            .click('.submit_btn')
            // Delete the first footnote
            .click('sup.xref:first-child')
            .waitForElementVisible('#delete-note-btn', 1000)
            .click('#delete-note-btn')
            // Check if the remaining footnote is renumbered to 1
            .assert.textEquals('sup.xref', '1')
            .assert.textEquals('.fn-group .fn .label', '1')
            .end();
    },

    'Toggle Between Footnotes and Endnotes Test': function(browser) {
        browser
            .url('http://your-editor-url.com')
            .waitForElementVisible('#footnotes', 1000)
            .assert.hasClass('#footnotes', 'active')
            .click('#endnotes')
            .assert.hasClass('#endnotes', 'active')
            .assert.not.hasClass('#footnotes', 'active')
            .end();
    }
};