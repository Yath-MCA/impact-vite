/**
 * @file supplementary.material.test.js
 * @description Nightwatch tests for the SupplementaryMaterial module functionality
 */

const selectors = {
    dialog: '#supp_material_dialog',
    fileList: '.file-list',
    fileItems: '.file-item',
    fileInput: '#fileUploadInput',
    addNewButton: '.addnewsupp',
    replaceButton: '.replace_file',
    deleteButton: '.delete_file',
    submitButton: '#supply_submit',
    cancelButton: '#cancel_suppl',
    queryDiv: '#supp_query_div',
    queryContent: '.Query_Contents',
    queryInfo: '.query_info',
    confirmationInput: '#confirmationInput',
    supplementaryMaterial: '.supplementary-material'
  };
  
  const testFiles = {
    validPdf: { path: 'test/fixtures/test-document.pdf', type: 'application/pdf' },
    validImage: { path: 'test/fixtures/test-image.jpg', type: 'image/jpeg' },
    largeFile: { path: 'test/fixtures/large-file.pdf', type: 'application/pdf' }
  };
  
  module.exports = {
    beforeEach: function(browser) {
      // Login and navigate to editor page
      browser
        .url(browser.launch_url)
        .waitForElementVisible('body', 3000)
        .setValue('#username', browser.globals.username)
        .setValue('#password', browser.globals.password)
        .click('#login-button')
        .waitForElementVisible('#editor-container', 10000);
        
      // Open a document with supplementary material
      browser
        // Replace with actual document selector
        .click('#document-123')
        .waitForElementVisible(selectors.supplementaryMaterial, 5000);
    },
  
    afterEach: function(browser) {
      browser.end();
    },
  
    'Test SupplementaryMaterial Dialog Opens Correctly': function(browser) {
      browser
        // Open the supplementary dialog by clicking on a query with supplementary material
        .click('.query[data-has-supplementary="true"]')
        .waitForElementVisible(selectors.dialog, 3000)
        
        // Verify dialog elements are properly rendered
        .assert.visible(selectors.fileList)
        .assert.visible(selectors.queryDiv)
        .assert.visible(selectors.queryContent)
        .assert.visible(selectors.submitButton)
        .assert.visible(selectors.cancelButton)
        
        // Verify that fileItems are loaded correctly
        .waitForElementPresent(`${selectors.fileList} ${selectors.fileItems}`, 3000)
        .expect.elements(selectors.fileItems).count.to.be.greaterThan(0);
    },
  
    'Test Adding New Supplementary File': function(browser) {
      browser
        // Open the supplementary dialog
        .click('.query[data-has-supplementary="true"]')
        .waitForElementVisible(selectors.dialog, 3000)
        
        // Get initial file count
        .elements('css selector', selectors.fileItems, result => {
          const initialCount = result.value.length;
          
          // Click add new file button
          browser
            .click(selectors.addNewButton)
            .setValue(selectors.fileInput, testFiles.validPdf.path)
            
            // Verify new file item has been added to the list
            .waitForElementPresent(`${selectors.fileList} ${selectors.fileItems}.new`, 3000)
            .expect.elements(selectors.fileItems).count.to.equal(initialCount + 1);
            
          // Verify submit button is still disabled (need query response)
          browser.expect.element(selectors.submitButton).to.have.attribute('disabled');
        });
        
      // Add query response and verify submit button is enabled
      browser
        .setValue(selectors.confirmationInput, 'Adding a new supplementary file')
        .expect.element(selectors.submitButton).to.not.have.attribute('disabled');
        
      // Submit and verify dialog closes
      browser
        .click(selectors.submitButton)
        .waitForElementNotPresent(selectors.dialog, 5000);
    },
  
    'Test Replacing Existing Supplementary File': function(browser) {
      browser
        // Open the supplementary dialog
        .click('.query[data-has-supplementary="true"]')
        .waitForElementVisible(selectors.dialog, 3000)
        
        // Click replace button on first file
        .click(`${selectors.fileItems}:first-child ${selectors.replaceButton}`)
        .setValue(selectors.fileInput, testFiles.validImage.path)
        
        // Verify file item is updated to show replacement
        .waitForElementPresent(`${selectors.fileList} ${selectors.fileItems}.replaced`, 3000)
        
        // Add query response
        .setValue(selectors.confirmationInput, 'Replacing supplementary file with updated version')
        
        // Submit and verify dialog closes
        .click(selectors.submitButton)
        .waitForElementNotPresent(selectors.dialog, 5000);
        
      // Verify the replaced file appears in the document
      browser
        .expect.element('.supplementary-material[data-filetype="replaced"]').to.be.present;
    },
  
    'Test File Validation Rejects Oversized Files': function(browser) {
      browser
        // Open the supplementary dialog
        .click('.query[data-has-supplementary="true"]')
        .waitForElementVisible(selectors.dialog, 3000)
        
        // Get initial file count
        .elements('css selector', selectors.fileItems, result => {
          const initialCount = result.value.length;
          
          // Try to upload oversized file
          browser
            .click(selectors.addNewButton)
            .setValue(selectors.fileInput, testFiles.largeFile.path)
            
            // Verify alert appears and file count remains the same
            .waitForElementVisible('.swal2-modal', 3000)
            .click('.swal2-confirm')
            .expect.elements(selectors.fileItems).count.to.equal(initialCount);
        });
    },
  
    'Test Query Response Input Validation': function(browser) {
      browser
        // Open the supplementary dialog
        .click('.query[data-has-supplementary="true"]')
        .waitForElementVisible(selectors.dialog, 3000)
        
        // Verify submit button is initially disabled
        .expect.element(selectors.submitButton).to.have.attribute('disabled');
        
      // Test enabling/disabling submit button based on input
      browser
        .setValue(selectors.confirmationInput, 'Test response')
        .expect.element(selectors.submitButton).to.not.have.attribute('disabled');
        
      browser
        .clearValue(selectors.confirmationInput)
        .expect.element(selectors.submitButton).to.have.attribute('disabled');
    },
  
    'Test Cancel Dialog With Confirmation': function(browser) {
      browser
        // Open the supplementary dialog
        .click('.query[data-has-supplementary="true"]')
        .waitForElementVisible(selectors.dialog, 3000)
        
        // Add new file
        .click(selectors.addNewButton)
        .setValue(selectors.fileInput, testFiles.validPdf.path)
        .waitForElementPresent(`${selectors.fileList} ${selectors.fileItems}.new`, 3000)
        
        // Attempt to cancel
        .click(selectors.cancelButton)
        .waitForElementVisible('.swal2-modal', 3000)
        
        // Confirm cancellation
        .click('.swal2-confirm')
        .waitForElementNotPresent(selectors.dialog, 5000);
    },
  
    'Test Delete Supplementary File': function(browser) {
      browser
        // Open the supplementary dialog
        .click('.query[data-has-supplementary="true"]')
        .waitForElementVisible(selectors.dialog, 3000)
        
        // Get initial file count
        .elements('css selector', selectors.fileItems, result => {
          const initialCount = result.value.length;
          
          if (initialCount > 0) {
            // Click delete button on first file
            browser
              .click(`${selectors.fileItems}:first-child ${selectors.deleteButton}`)
              .waitForElementVisible('.swal2-modal', 3000)
              .click('.swal2-confirm')
              
              // Verify file is marked as deleted
              .waitForElementPresent(`${selectors.fileItems}.item_deleted`, 3000);
              
            // Add query response
            browser
              .setValue(selectors.confirmationInput, 'Deleting unnecessary supplementary file')
              .click(selectors.submitButton)
              .waitForElementNotPresent(selectors.dialog, 5000);
              
            // Verify deleted file appears with deletion markup in document
            browser
              .expect.element('del .supplementary-material').to.be.present;
          }
        });
    },
  
    'Test Handling Existing Query Responses': function(browser) {
      browser
        // Open the supplementary dialog with an existing query that has responses
        .click('.query[data-status="Closed"][data-has-supplementary="true"]')
        .waitForElementVisible(selectors.dialog, 3000)
        
        // Verify query responses are displayed
        .expect.elements(selectors.queryInfo).count.to.be.greaterThan(0);
        
      // Test that current user's comment is loaded in input field
      browser
        .execute(function() {
          // Find a query comment from current user and click on it
          const userComment = document.querySelector('[data-user-comment-box][data-role="' + USER_ROLE + '"]');
          if (userComment) {
            return {
              found: true,
              text: userComment.getAttribute('data-user-comment-box')
            };
          }
          return { found: false };
        }, [], function(result) {
          if (result.value.found) {
            browser.assert.value(selectors.confirmationInput, result.value.text);
          }
        });
    },
  
    'Test Multiple File Operations in One Session': function(browser) {
      browser
        // Open the supplementary dialog
        .click('.query[data-has-supplementary="true"]')
        .waitForElementVisible(selectors.dialog, 3000)
        
        // Add new file
        .click(selectors.addNewButton)
        .setValue(selectors.fileInput, testFiles.validPdf.path)
        .waitForElementPresent(`${selectors.fileList} ${selectors.fileItems}.new`, 3000)
        
        // Also replace an existing file
        .click(`${selectors.fileItems}:first-child ${selectors.replaceButton}`)
        .setValue(selectors.fileInput, testFiles.validImage.path)
        .waitForElementPresent(`${selectors.fileList} ${selectors.fileItems}.replaced`, 3000)
        
        // Add query response
        .setValue(selectors.confirmationInput, 'Performing multiple file operations')
        
        // Submit and verify dialog closes
        .click(selectors.submitButton)
        .waitForElementNotPresent(selectors.dialog, 5000);
        
      // Verify both operations were completed
      browser
        .expect.element('.supplementary-material[data-filetype="new"]').to.be.present;
        
      browser
        .expect.element('.supplementary-material[data-filetype="replaced"]').to.be.present;
    },
  
    'Test Query Status Changes After Response': function(browser) {
      // Find a query that's not closed yet
      browser
        .click('.query[data-status="Open"][data-has-supplementary="true"]')
        .waitForElementVisible(selectors.dialog, 3000)
        
        // Add query response
        .setValue(selectors.confirmationInput, 'Closing this supplementary material query')
        
        // Submit and verify dialog closes
        .click(selectors.submitButton)
        .waitForElementNotPresent(selectors.dialog, 5000)
        
        // Verify query status has changed to closed
        .expect.element('.query[data-status="Closed"]').to.be.present;
    },
  
    'Test Form Data Reset After Submission': function(browser) {
      browser
        // Open the supplementary dialog
        .click('.query[data-has-supplementary="true"]')
        .waitForElementVisible(selectors.dialog, 3000)
        
        // Add new file
        .click(selectors.addNewButton)
        .setValue(selectors.fileInput, testFiles.validPdf.path)
        .waitForElementPresent(`${selectors.fileList} ${selectors.fileItems}.new`, 3000)
        
        // Add query response
        .setValue(selectors.confirmationInput, 'Testing form reset')
        
        // Submit
        .click(selectors.submitButton)
        .waitForElementNotPresent(selectors.dialog, 5000)
        
        // Reopen dialog
        .click('.query[data-has-supplementary="true"]')
        .waitForElementVisible(selectors.dialog, 3000)
        
        // Verify form has been reset
        .expect.element(selectors.confirmationInput).value.to.equal('');
        
      // Verify file list doesn't contain "new" items from previous submission
      browser.expect.elements(`${selectors.fileItems}.new`).count.to.equal(0);
    }
  };
