(function(global) {
    'use strict';

    global.ALERT_MESSAGE = {
        // ? Ref delete from the list
        'refdel001': {
            'prompt': {
                'title': 'Reference',
                'text': 'Do you want to delete the reference from the list?',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'The citation and reference text has been deleted from the list successfully.',
                're_num': 'The citation and reference text has been deleted from the list and renumbered successfully.',
                'cite_miss': 'The citation and reference text has been deleted from the list successfully. <br><br>Renumbering is not excuted due to a missing citations [{{miss_cite}}] in the article. Kindly include the missing citations to initiate an automatic renumbering of the references. To insert the missing citations, follow these steps:<br>(1) Position the cursor where you want to insert the citation.<br>(2) Right-click and choose "Insert Citation" from the context menu.<br>(3) Select the appropriate citation from the  list.<br>(4) Click "Insert" to link the citation.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'Reference is safe :)',
                'icon': 'error'
            }
        },
        // ? Ref delete/citation from the list -last item node
        'xrefsdel002': {
            'prompt': {
                'title': 'Reference',
                'text': 'Do you want to delete the citation and the reference %1% from the list?',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'The citation and reference text has been deleted from the list successfully.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'Reference is safe :)',
                'icon': 'error'
            }
        },
        // ? Ref citation and delete from the list with renumber
        'xrefsdel003': {
            'prompt': {
                'title': 'Reference',
                'text': 'Do you want to delete the citation and the reference [%1%] from the list?',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'The citation and reference text has been deleted from the list successfully.',
                're_num': 'The citation and reference text has been deleted from the list and renumbered successfully.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'Reference is safe :)',
                'icon': 'error'
            }
            //The citation has been deleted from the text and the reference list and has been renumbered successfully.
        },
        // ? Float citation and delete from the list with renumber
        'xrefsdel004': {
            'prompt': {
                'title': 'Figure',
                'text': 'Would you like to delete the citation and the %1% from the list?',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'The citation has been deleted from the text and the caption list successfully.',
                're_num': 'The citation has been deleted from the text and the caption list and has been renumbered successfully.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'Caption is safe :)',
                'icon': 'error'
            }
            //The citation has been deleted from the text and the reference list and has been renumbered successfully.
        },
        'xrefsdel005': {
            'prompt': {
                'title': 'Table Footnote citation',
                'text': 'Do you want to delete the table footnote citation and table footnote [%1%] from the list?',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'The table footnote citation and corresponding footnote reference have been successfully deleted from the list.',
                're_num': 'The citation and reference text has been deleted from the list and renumbered successfully.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'Reference is safe :)',
                'icon': 'error'
            }
            //The citation has been deleted from the text and the reference list and has been renumbered successfully.
        },    
        // ? Author name from the list
        'authorDelete001': {
            'prompt': {
                'title': 'Author Group',
                'text': 'Would you like to delete the author from the Author group?',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'The author has been deleted successfully.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'Author name is safe :)',
                'icon': 'error'
            }
        },
        // ? Author name from the list with links
        'authorDelete002': {
            'prompt': {
                'title': 'Author Group',
                'text': 'Would you like to delete the author from the Author group?',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'The author has been deleted with the cross-link successfully.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'Author name is safe :)',
                'icon': 'error'
            }
        },
        // ? Author name from the list
        'Linkrenumber001': {
            'prompt': {
                'title': 'Author Group',
                'text': '',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'Successfully renumbered.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'Original order available :)',
                'icon': 'error'
            }
        },
        // ? Author Renumbering.
        'AffDelete001': {
            'prompt': {
                'title': 'Author Group',
                'text': 'Do you want to remove the affiliation &ldquo;{{label}}&rdquo;?',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'Affiliation has been deleted successfully.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': ':)',
                'icon': 'error'
            }
        },
        'AffDelete002': {
            'prompt': {
                'title': 'Author Group',
                'text': 'Would you like to delete the affiliation link associated with the author{{pural}} &ldquo;{{name}}&rdquo;?',

                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'The affiliation link associated with the author{{pural}} {{name}} has been deleted successfully',

                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'Renumbering not done. :)',
                'icon': 'error'
            }
        },
        'AffDelete004': {
            'prompt': {
                'title': 'Author Group',
                'text': 'The affiliation &ldquo;{{label}}&rdquo; had linked to the author {{name}}. Would you like to delete it along with the cross-link?',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'Affiliation and the cross-link have been deleted successfully.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'Renumbering not done. :)',
                'icon': 'error'
            }
        },
        'AffDelete003': {
            'prompt': {
                'title': 'Author Group',
                'text': 'Do you want to remove the cross-links?',
                'text_1': 'The citation not mapped for some authors. Do you want to continue?',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'Affiliation cross-links have been deleted successfully.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'Renumbering not done. :)',
                'icon': 'error'
            }
        },
        "AG_AFF_GROUP": {
            "ADD_AFF_AUT": "Please add affiliation to the {{{plural}}} {{{item}}}",
            // ? Please add affiliation to the author GivenName Detyuf
            // ? Please add affiliation to the author’s GivenName Detyuf and GivenName SurName
            "ADD_AFF_LINK": `Please link the affiliation  &ldquo;{{item}}&rdquo; to the author group.`,
            //? Please link the affiliation “g, h and i” to the author group. || “g and i” || “g”
            "DEL_AUTH": "Would you like to delete {{name}} from the Author group?",
            "DEL_AUTH_W_LAB": "Affiliation &ldquo;{{label}}&rdquo; is linked only to deleted author {{name}}. Hence affiliation &ldquo;{{label}}&rdquo; will also be deleted.",
            "DEL_AUTH_W_AFF": "Would you like to delete the {{name}} along with the affiliation {{label}}?",
            "UN_LINK_AFF": `Affiliation &ldquo;{{label}}&rdquo; is not linked with anyone the author. Would you like to delete the Affiliation? If yes, the details will be removed from the list.`,
            "UNKNOWN_LAB": "Kindly provide the label from the affiliation list to the author group."
        },
        "tc_new_msg": {
            // ? render with mustae plugins
            "add": {
                "auth": "The placeholder was added for the new author {{{timestamp}}}.",
                "aff": "Affiliation &ldquo;{{label}}&rdquo; has been added {{{timestamp}}}.",
                "kwd": "The placeholder was added for the new keyword {{{timestamp}}}.",
                "abbr": "The placeholder was added for the new abbreviation {{{timestamp}}}.",
                "auth_text": "The author {{name}} was added {{{timestamp}}}.",
                "kwd_text": "The &ldquo;{{name}}&rdquo; keyword was added {{{timestamp}}}.",
                "abbr_text": "The &ldquo;{{name}}&rdquo; abbreviation was added {{{timestamp}}}.",
                "auth_note": "Author note &ldquo;{{label}}&rdquo; has been added {{{timestamp}}}.",
                "auth_note_text": "Author note &ldquo;{{label}}&rdquo; has been added {{{timestamp}}}.",
                "auth_note_old": "The placeholder was added for the author note {{{timestamp}}}."
            },
            "OpenDialog": {
                "auth_dialog_update": "The author {{name}} details has been updated {{{timestamp}}}. {{{sub_action}}}",
            },
            "delete": {
                "auth": {
                    // ? The author John Haris has been deleted along with the link a few seconds ago.
                    "pl_hold": "The placeholder created for the author name was deleted {{{timestamp}}}.",
                    "w_link": "The author {{name}} has been deleted along with the link {{{timestamp}}}.",
                    "wo_link": 'The author {{name}} was deleted {{{timestamp}}}.'
                },
                "aff": {
                    // ? with and without links
                    // ? for instead delete
                    "pl_hold": 'Affiliation &ldquo;{{label}}&rdquo; has been deleted {{{timestamp}}}.',
                    "w_link": "Affiliation &ldquo;{{label}}&rdquo; has been deleted along with the cross-link {{{timestamp}}}.",
                    "wo_link": 'Affiliation &ldquo;{{label}}&rdquo; has been deleted {{{timestamp}}}.'
                },
                "kwd": {
                    "text": "The &ldquo;{{name}}&rdquo; keyword was deleted {{{timestamp}}}.",
                    "pl_hold": "The placeholder created for the keyword was deleted {{{timestamp}}}.",

                },
                "abbr": {
                    "text": "The &ldquo;{{name}}&rdquo; abbreviation was deleted {{{timestamp}}}.",
                    "pl_hold": "The placeholder created for the abbreviation was deleted {{{timestamp}}}.",

                },
                "auth_note": {
                    "pl_hold": "The placeholder created for the new author note was deleted {{{timestamp}}}.",
                    "wo_link": "Author note &ldquo;{{label}}&rdquo; has been deleted {{{timestamp}}}.",
                    "w_link": "Author note &ldquo;{{label}}&rdquo; has been deleted along with the cross-link {{{timestamp}}}.",
                }
            },
            // ? after || before
            "move": {
                "auth": {
                    // ? The author {{Yu Liu}} has been moved to the {{left}} {{{a few minutes ago}}}.
                    "pl_hold": "The placeholder created for the author name has been moved to the {{action}} {{{timestamp}}}.",
                    "text": "The author {{name}} has been moved to the {{action}} {{{timestamp}}}."
                },
                "aff": {
                    "text": "Affiliation &ldquo;{{label}}&rdquo; has been moved {{action}} {{{timestamp}}}."
                },
                "kwd": {
                    "text": "The &ldquo;{{name}}&rdquo; keyword moved {{action}} {{{timestamp}}}.",
                    "pl_hold": "The placeholder created for the keyword moved {{action}} {{{timestamp}}}."
                },
                "abbr": {
                    "text": "The &ldquo;{{name}}&rdquo; abbreviation moved {{action}} {{{timestamp}}}.",
                    "pl_hold": "The placeholder created for the abbreviation moved {{action}} {{{timestamp}}}."
                }
            },
            "swap": {
                "auth": {
                    // ? The Given name and Surname for the author "John Haris" swapped a few minutes ago.
                    "pl_hold": "The Given name and Surname for the author placeholder swapped {{{timestamp}}}.",
                    "text": "The Given name and Surname for the author &ldquo;{{name}}&rdquo; swapped {{{timestamp}}}."
                }
            },
            "link": {
                // ? Affiliation 1 have linked to the author John Haris a few seconds ago.
                "aff": {
                    "add": "Affiliation &ldquo;{{label}}&rdquo; have linked to the author &ldquo;{{name}}&rdquo; {{{timestamp}}}."
                }
            },
            "delete_link": {
                "aff": {
                    "remove": "Affiliation &ldquo;{{label}}&rdquo; have un-linked to the author &ldquo;{{name}}&rdquo; {{{timestamp}}}.",
                    "w_link": "Affiliation &ldquo;{{label}}&rdquo; has been deleted along with the cross-link {{{timestamp}}}."
                }
            },
            "orcid": {
                "orcid_added": "The author {{name}} ORCID was added {{{timestamp}}}.",
                "orcid_edited": "The author {{name}} ORCID was edited {{{timestamp}}}.",
            }
        },
        // ? Section Added.
        'headleveladd001': {
            'prompt': {
                'title': 'Heads Section',
                'text': 'Do you want to add a new section here?',
                'icon': 'warning',
                'okText': 'Yes, Add it!',
                'canText': 'No'
            },
            'success': {
                'title': 'ADDED!',
                'text': 'The Section added successfully.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'The Section not added. :)',
                'icon': 'error'
            }
        },
        // ? Section Delete.
        'headleveldel002': {
            'prompt': {
                'title': 'Heads Section',
                'text': 'Do you want to delete the section?',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Deleted!',
                'text': 'The section deleted successfully.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'The section not deleted. :)',
                'icon': 'error'
            }
        },
        'AutoSave': {
            'text': 'Content save is automatic and enabled every 30 seconds.',

        },
        'offline': {
            'text': 'Please continue editing offline and updated content gets synchronized to the server once you are back online.',
            'collaborative': `Your network connection has been interrupted. Editing has been temporarily paused to prevent any data loss. Please check your connection and reconnect to continue working on the document.`,
        },
        'onLine': {
            'text': 'You\'re online.',
            'withSave': "You are back online now. The updated contents have been saved successfully to the server."
        },
        'Offline_Save': {
            'text': 'Note! Please login to the same browser/machine to restore the changes made to the document if you closed the proof directly while offline.'
        },
        'Save_OfflineData_Ask': {
            "type": "warning",
            "title": "Offline Data",
            'text': 'Your proof opened with unsaved content. Please click &ldquo;yes&rdquo; to save the changes made to the document.',
            "button1": "Yes",
            "button2": "Cancel",
            "param": true,
            "Options": {
                hide: true
            }
        },

        'Save_OfflineData_Yes': {
            'text': 'The document has been saved successfully with updated content.'
        },
        'FILE_NOT_SAVE': {
            'text': `A technical issue is currently preventing proofing, possibly due to a translator plugin.<br><br>We&rsquo;ve notified our technical team and copied you on the email. Our support team will update you once the issue is resolved, which is typically within 1 working day.`
        },
        'SignOutOffLine': {
            'text': 'Sorry, this function is disabled while offline. Kindly try back when you are online.'
        },
        'MathOffLineError': {
            'text': 'Sorry, this function is disabled while offline. Kindly try back when you are online.'
        },
        'iWSC_OffLineError': {
            'text': 'Sorry, this function is disabled while offline. Kindly try back when you are online.'
        },
        // Mantis Id 1996925: Finalize message offline
        'OffLine_Error_show': {
            'text': 'Apologies, but we are currently unable to establish an internet connection. This function is disabled in offline mode. Please try again when you regain an internet connection taking care to use the same browser.'
        },
        'PACKAGE': {
            'text': 'Files downloaded successfully.'
        },
        'GenaratePDF': {
            'text': 'Please do not refresh the page. This process may take around 30 secs to 3 mins approximately.',
        },
        'demo_GenaratePDF': {
            'text': '',
            'hilti': 'We have received your proof generation request. Your proof will be ready in approximately 60 minutes.'
        },
        'GenerateXML_Error': {
            'text': 'Oops! Error while generating XML. Kindly contact the support team for assistance.'
        },
        // ? 3386868: OSO - IMPACT Creation - Urgent - alert message from Srini - Teams
        'GeneratePDF_Error': {
            'text': `Oops! An error occurred while generating the Track PDF. Please use the 'Contact Support' option under the Help menu at the top right for assistance.`
        },
        // ? 3386868: OSO - IMPACT Creation - Urgent - alert message from Srini - Teams
        'track_pdf_pre_warn': {
            'text': `Please do not refresh or close the page.<br><br>The download process may take approximately 30 seconds to a few minutes, depending on your internet speed and the amount of data being processed.`,
        },
        'GeneratePDF_Last_Error': {
            'text': 'Caution! Failure due to some technical error. Kindly contact the support team for assistance.'
        },
        'UpdateFileMiss': {
            'text': 'The updated file does not exist in the corresponding path.'
        },
        'fileMissing': {
            'text': 'Sorry! The file is missing in the corresponding path.'
        },
        'DownloadSuccess_proof_pdf': {
            'text': 'Please note that this PDF is only for review purposes, you should not add annotations, comments, or corrections to the PDF; instead any changes or edits should be made directly within the text editor.',
        },

        'fileDownloadSuccess': {
            'text': 'The file is downloaded successfully.'
        },
        'fileDownloadFail': {
            'text': 'The required file is missing in the corresponding path. Kindly contact the support team for assistance.'
        },
        'ShareInviteUser': {
            'text': 'The link was shared successfully with the user\'s email address'
        },
        'LastSave': {
            'text': 'The last content saved online was '
        },
        'CiteWarningAlert': {
            'text': 'Please place the cursor in the text where the reference citation should appear.'
        },
        'Paragraph_Locked': {
            'text': 'This section is locked for editing. Please use the comments function instead and the changes will be made for you.'
        },
        'curOptRevertError': {
            'text': 'This section is locked for editing. Please use the comments function instead and the changes will be made for you.'
        },
        'deleteMutliPara': {
            'text': 'Note! Multiple para/element not allowed to delete.'
        },
        'ErrorHyperlink': {
            'text': 'This section is locked for editing. Please use the comments function instead and the changes will be made for you.',

        },
        'ErrorInsertMath': {
            'text': 'This section is locked for editing. Please use the comments function instead and the changes will be made for you.',
        },
        'SelectAll': {
            'text': 'Please do not use the &ldquo;Ctrl+A&rdquo; shortcut to select all the document content.',

        },
        'FIND_REPLACE_IGNORE': {
            'text': 'This section is locked for editing. Please use the comments function instead and the changes will be made for you.'
        },
        'FIND_REPLACE_PASS': {
            'text': ''
        },
        'Specified_text': {
            'text': 'No results found.'
        },
        // ? Document version
        'hyperlink_alert': {
            'prompt': {
                'title': 'Hyperlink ',
                'text': 'y',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Restored!',
                'text': 'Great! Your document is restored successfully with the selected version.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'The current version retained. :)',
                'icon': 'error'
            }
        },
        // ? Document version
        'reStoreHTML': {
            /*
            Please note that Undo (Ctrl+z) function will not be allowed after restoration. Do you want to continue?
            After restoring the versions, you are not allowed to Undo the activity again. Do you want to continue?
            You will lose the latest changes to the document on restoring the previous version. Do you want to continue?
            */
            'prompt': {
                'title': 'Restore Version',
                'text': 'Please note that you will not be able to undo after the content gets restored. ##br## ##br## Do you wish to continue?',
                'icon': 'warning',
                'okText': 'Yes',
                'canText': 'No'
            },
            'success': {
                'title': 'Restored!',
                'text': 'Great! Your document is restored successfully with the selected version.',
                'icon': 'success'
            },
            'cancel': {
                'title': 'Cancelled!',
                'text': 'The current version retained. :)',
                'icon': 'error'
            }
        },
        'revertHTML': {
            'text': 'Great! Your document is restored successfully with the selected version.'
        },
        'PopupBlocker': {
            'text': 'Kindly disable your pop-up blocker and click the &ldquo;Open&rdquo; link again.'
        },
        'PopupBlocker_New': {
            'title': 'Warning',
            'text': `Please note that your system has a pop-up blocker enabled due to browser settings. If you encounter difficulty downloading the file, kindly copy the provided link and paste it into a new browser tab to access the document. <br><br><a href="{{url}}" target="_blank"><button class="btn btn-danger btn-sm font-weight-bold">Click Here</button></a><br><br> <span class="break-line">{{url}}</span>`,
            "type": "warning",
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },

        'restoreNoHTMLFile': {
            'text': 'Sorry! No versions were found to restore the document.'
        },
        'Ignore_KeyEvent_XREFS': {
            'text': 'You are trying to delete a content that contains citations. To remove the cited text, simply follow these steps: <br><br>(1) Identify the blue-colored text which represents the cited content. <br>(2) Right-click on the blue-colored text and choose the "Delete Citation" option. <br>(3) Once the citation is removed, you can delete the cited text from the content. If you need more guidance, please refer to the &ldquo;Delete Citation&rdquo; section in the help guide.'
        },
        'allowed_delete_cite': {
            'text': `The content you deleted includes citations to {{text}}. These items appear only once in the entire document.<br>Please ensure these citations are added elsewhere to avoid errors during finalization. To reinsert a citation, you can right-click and choose the appropriate citation option for that element.<br>If this deletion was unintentional, you can Undo it (Ctrl + Z or Command + Z).`
        },
        'allowed_delete_cite_fn_en': {
            'text': `The content you deleted includes citations {{text}} Deleting this content will also remove the corresponding footnotes/endnotes from the list. If this deletion was unintentional, you can Undo it (Ctrl + Z or Command + Z).`
        },
        'Last_char': {
            'text': 'Please use the context menu (right-click) option to delete the entire word or phrase from the '
        },
        'alt-text': {
            'text': 'Please begin entering the Alt-Text for this figure at the current cursor location.<br><br>Note: Providing an Alt-Text description for the figure is optional.'
        },
        'common-placeholder': {
            'text': 'Please begin entering the {{text}} at the current cursor location.'
        },
        'Table_RowCol': {
            'text': 'Total number of Rows/Columns should not exceed more than 25.'
        },
        'pasteShortcut': {
            'text': 'Please use shortcut key Ctrl-V/Ctrl+Shift+V for paste.'
        },
        'Ignore_KeyEvent_NoteQry': {
            'text': 'Note! You are not allowed to delete Queries and Comments along with the content.'
        },
        'Ignore_KeyEvent_Math_Retain': {
            'text': 'The content you&rsquo;re attempting to delete contains equations. For your information, only the text portion will be removed upon deletion, while the equations will remain in place.',
        },
        'Ignore_KeyEvent_Math': {
            'text': 'Please avoid using shortcuts such as Delete, Backspace, or Ctrl+X to remove equations.'
        },
        'Ignore_KeyEvent_FM': {
            'title': 'Warning',
            'text': 'This section is locked for editing. Please use the comments function instead and the changes will be made for you.',
            "type": "warning",
            // Don\'t Show Again
            "button1": "",
            "button2": "OK",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Ignore_KeyEvent_PMerge': {
            'text': 'Note! You are not allowed to delete merged paragraph markers along with the content.'
        },
        // ? Sean Request Alert message change - 3207261
        'Ignore_KeyEvent_Link': {
            'title': 'Warning',
            'text': 'To modify the hyperlink text, right-click and choose "Edit Link" from the context menu. Enter the desired text in the "Display Text" field, should you additionally wish to change the link destination please edit the "Link" field and apply your changes. Direct editing of hyperlink text is not allowed.',
            "type": "warning",
            "button1": "",
            "button2": "OK",
            "param": true,
            "Options": {
                hide: true
            }
        },
        "Ignore_hyperlink_text": {
            'text': 'You cannot delete hyperlinked text directly. Please follow the steps below to remove it: <br><br>(1) Right-click on the hyperlinked text and Select the "Remove Link" option to remove the hyperlink. <br>(2) Once the link is removed, select the desired text. <br>(3) Use the Backspace or Delete key to remove the text from the editor.'
        },
        'close_without_reply': {
            'text': 'You were typing something. Do you wish to close?'
        },
        'suppl_close_dialog': {
            'title': 'Add / Replace file',
            'text': 'You have an unsaved file upload. Exiting will discard it. Do you want to leave without submitting?',
            "type": "warning",
            "button1": "Yes",
            "button2": "No",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'delete_command_one': {
            'title': 'Delete Comment',
            'text': 'Are you sure you want to delete your posted comment?',
            "type": "warning",
            "button1": "Yes",
            "button2": "Cancel",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'delete_command_other': {
            'title': 'Delete Comment',
            'text': 'Are you sure you want to delete this comment?',
            "type": "warning",
            "button1": "Yes",
            "button2": "Cancel",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'delete_command_other_all': {
            "title": "Delete Comment",
            "text": "Are you sure you want to delete this comment? This action will remove the entire conversation related to it. Confirm your action below.",
            "type": "warning",
            "button1": "Delete Conversation",
            "button2": "Cancel",
            "param": true,
            "Options": {
                "hide": true
            }
        },
        'delete_command_all': {
            'title': 'Delete Comment',
            'text': 'Are you sure you want to proceed with deleting comments? You can choose to delete all conversation of this comments or just your own comment. Confirm your choice below.',
            "type": "warning",
            "button1": "Delete Conversation",
            "button2": "Cancel",
            "button3": "Delete My Comment",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'find_cyclic': {
            'text': 'We have reached the end of the document. Do you want to try searching from the beginning?'
        },
        'find_ended': {
            'text': 'We are finished searching the document.'
        },
        'Lww_Figure_Size_Err': {
            'text': 'File size exceeds 100MB limit. Please contact "<strong>{{journalEmail}}</strong>" to upload your replacement file(s) using another method.'
        },
        'Single_Upload_Size_Err': {
            // ? Mantis_ID 1798594: size 30 to 100MB
            'text': 'Make sure the file size doesn&rsquo;t exceed 100 MB.'
        },
        // ? Mantis_ID 1798594: size 100 to 500MB
        'Multi_Upload_Size_Err': {
            'text': 'Please ensure the file size remains below 500 MB. To continue, you may need to remove some files.'
        },
        'upload_size_big': {
            'text': 'The file size is too large. So, it will take time to save. Please be patient until upload.'
        },
        'Upload_Invalid_Err': {
            'text': 'Incorrect file format. Please check and upload.'
        },
        /*  (Allowed formats are jpg, jpeg, png, gif, tif, tiff, bmp, docx, xlsx, pptx, pdf).  */
        'Replace_Image_Err': {
            'text': 'Incorrect file format. (Allowed formats are jpg, jpeg and png). Please check and upload.'
        },
        'CITE_INSERT_COMMON': {
            'text': 'The citation has been added successfully to the text.',
        },
        /* REFERENCES */
        'REF_DELETE': {
            'text': 'The citation has been deleted from the text and the reference list successfully.'
        },
        'REF_DEL_ReNUM': {
            'text': 'The citation has been deleted from the text and the reference list and renumbered successfully.',
        },
        'CITE_DEL_NOTE': {
            'text': " Please review the content around the deleted text and rephrase as necessary.",
            'from': 'Reference citation removed in text. Please review the content around the deleted text and rephrase as necessary.'
        },
        'REF_CITE_DEL': {
            'text': 'The citation has been deleted successfully from the text.',
        },
        'REF_CITE_DEL_ReNUM': {
            'text': 'The citation has been deleted from the text and the reference list and renumbered successfully.'
        },
        'REF_CITE_INS_ReNUM': {
            'text': 'The citation has been added from the text and the reference list and has been renumbered successfully.',
        },
        'REF_INSERT': {
            'text': 'The citation has been added to the text and reference list successfully.'
        },
        'REF_INSERT_ONLY': {
            'text': 'The reference has been added to the reference list successfully.'
        },
        'REF_INSERT_WITH_RE_ORDER_NOTE': {
            // ? 1996643: Inserting references pop-up
            'text': 'The reference you have inserted will be added to the end of the reference list, and the reordering of references will be managed by the collation team before online publication.',
        },
        'COMMON_CITE_MISS': {
            'text': '<br><br>Renumbering is not excuted due to a missing citations [{{miss_cite}}] in the article. Kindly include the missing citations to initiate an automatic renumbering of the references. To insert the missing citations, follow these steps: (1) Position the cursor where you want to insert the citation. (2) Right-click and choose "Insert Citation" from the context menu. (3) Select the appropriate citation from the Reference list. (4) Click "Insert" to link the citation.',
        },
        'REF_INS_ReNUM': {
            'text': 'The citation has been added to the text and reference list, and have been renumbered successfully.'
        },
        'RefCite_Ins_with_ReNumber': {
            'text': 'The Citation is added and References list has been renumbered successfully.'
        },
        'RefListandCitationReNumber': {
            'text': 'The Reference is added/deleted to the list and were renumbered successfully.'
        },
        /*  Ignore */
        'RefListReNumber': {
            'text': 'The references list has been renumbered successfully.'
        },
        'RefListReOrder': {
            'text': 'The references list has been re-ordered successfully.'
        },
        /* REQUEST ALERT */
        'REQ_MSG_NULL': {
            'text': 'The message can\'t be null. So, the requested user won\'t get any notification.'
        },
        'SIGN_OFF_ReDIRECT': {
            "type": "warning",
            "title": "Finalised",
            'text': 'Document link has been finalised and will be available in read only mode.',
            "button1": "Yes",
            "button2": "Cancel",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'SIGN_OFF_SURVEY': {
            "type": "warning",
            "title": "Finalised",
            'text': `To help us improve the author experience, we would be grateful if you could take 1 or 2 minutes to answer a short survey about your experience with the IMPACT proofing tool today.`,
            "button1": "Yes",
            "button2": "Cancel",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'SIGN_OFF': {
            'text': `The proof link has been signed off. You can access the {{DOC_TYPE}} in read-only mode.`
        },
        'EXPIRED': {
            'text': `The user document link is already expired and will be open with read-only mode.`
        },
        'FILE_DELETED': {
            'text': `The proofing link is expired. If you have not downloaded your proof, please contact &ldquo;<a class="font-weight-bold email-text" href="mailto:{{MAIL}}">{{TEXT}}</a>&rdquo;.`
        },
        'REQ_DENIED': {
            "type": "error",
            "title": "Request Denied!",
            'text': 'You don\'t have access to open the link.',
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Link_Opened': {
            /* Link is already opened in another tab. Please check. */
            'text': 'Link has been already opened in another tab. Please check.'
        },
        /* ? 03-_OCT_22 SIVA_SRINI_CLIENT_UPDATE */
        'Link_Opened_ReDirect': {
            'text': 'Link has been already opened in another tab. This page will be open with read-only mode.'
        },
        'Link_Opened_Close_Tab': {
            'text': 'Link has been already opened in another tab. Please check.'
        },
        'expired_session_alert': {
            "type": "warning",
            "title": "Session Expired",
            'text': 'Your session is already expired or has been opened in another browser/tab. Kindly continue from the landing page again.',
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'request_dialog': {
            'text': '<p>You have received a new request to access this proof link.<br>Press &ldquo;Accept&rsquo; to approve the request or &ldquo;Reject&rsquo; to cancel. <br><span style="color:#EB0001;padding-top: 16px;font-weight: 500;">This dialogue box will close in <span id="seconds-timer"></span> seconds.</span></p>'
        },
        'LogOutShow': {
            "type": "warning",
            "title": "Log out?",
            // ? client emma
            'text': 'You have not finalized the proof yet. Do you still want to log out?',
            "button1": "Log out",
            "button2": "Cancel",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'LogOutShow_corole': {
            "type": "warning",
            "title": "Log out?",
            'text': 'Do you want to log out?',
            "button1": "Log out",
            "button2": "Cancel",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'idle_session_alert': {
            "title": "Session Timeout",
            "type": "warning",
            'text': 'Your session is nearing expiration. You will be automatically logged out in <span id="alert-timer">30</span> seconds. <br><br>Click &ldquo;Continue Session&rdquo; to keep the session active',
            "button1": "Continue Session",
            "button2": "",
            "param": true
        },
        'LogOut_idle_info': {
            "type": "warning",
            "title": "Session ended",
            'text': 'There was no activity for a while. Your session will be closed.',
            "button1": "Start new session",
            "button2": "",
            "param": true,
            "Options": {
                hide: false
            }
        },
        'Link_Text_URL_Match': {
            "type": "warning",
            "title": "Warning",
            'text': `The display text does not match the provided {{linktype}}. Are you sure you want to continue with your changes?`,
            "button1": "Yes",
            "button2": "No",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Impact_Edit_Info': {
            "type": "info",
            "title": "Reminder",
            'text': `We would like to remind you that our tool enables direct editing of the article. If possible, please consider making corrections directly via the Editor View for insertions, deletions, and formatting adjustments to the content. This contributes to a seamless and efficient editing process.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Impact_Edit_Info_Book': {
            "type": "info",
            "title": "Reminder",
            'text': `We would like to remind you that our tool enables direct editing of the document. If possible, please consider making corrections directly via the Editor View for insertions, deletions, and formatting adjustments to the content. This contributes to a seamless and efficient editing process.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Abs_Min_Reached': {
            "type": "error",
            "title": "Abstract Words",
            'text': `Kindly note that the abstract word count of the article is below the minimum required limit.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Abs_Max_Reached': {
            "type": "error",
            "title": "Abstract Words",
            'text': `Abstract word count has reached the maximum limit. Adding content beyond this limit is not allowed.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Abs_Max_Neared': {
            "type": "warning",
            "title": "Abstract Words",
            'text': `The abstract word count has reached 90% of the maximum limit.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'Abs_Finalize_Alert': {
            "type": "warning",
            "title": "Abstract Words",
            'text': `The abstract word count exceeds the maximum limit. Please remove excess words to meet the required limit and finalize the article.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'MathError': {
            "type": "info",
            "title": "Math Editing - Technical Error",
            'text': `An issue has arisen while attempting to open the equation for editing. Please provide your corrections using the comments feature within the pop-up text box, which is open behind this message window.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'BOOK_END_NOTE': {
            "type": "info",
            "title": "Book Endnotes",
            'text': `The document follows book-style endnotes. Please provide your corrections using the comments feature in the pop-up text box, which is open behind this message window.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'ErrorAutoShareMail': {
            'text': 'Oops! Error while sharing the link to the author. Kindly contact the support team for assistance.'
        },
        'WriteMailToTeam': {
            'text': `The mail has been sent successfully to {{TEXT}}. The support team will contact you shortly.`
        },
        'InvalidMail': {
            'text': 'Invalid e-Mail.'
        },
        'MultiMail': {
            'text': 'Note! More than one e-Mail not allowed.'
        },
        'EmailLimitReached': {
            'text': 'Recipient limit exceeded. Maximum {{limit}} recipients allowed.'
        },
        'OwnEmailSkipped': {
            'text': 'Your own e-Mail address was skipped and not added.'
        },
        'InstructUserMail': {
            'text': 'Please note: responses will take one working day. Please refer to the <a class="blue-text font-weight-bold" tabindex="0" href="javascript:iDownloadMethod.click(\'Help_FAQ_pdf\')">FAQs</a> or <a class="blue-text font-weight-bold" tabindex="0" href="javascript:iDownloadMethod.click(\'Help_Guide_pdf\')">User Guide</a> for quicker support.'
        },
        'contextMenuClik': {
            'text': 'Note! Mouse right-click disabled here. Please use shortcut keys to copy (Ctrl+C) the content from the page.'
        },
        'Insert_comment_restrict': {
            'text': 'Please place the cursor in the text where the comment should appear.'
        },
        'Insert_comment': {
            'text': 'Since cursor is not placed in editor. Comment is inserted before the title.'
        },
        "Insert_Empty_Common": {
            "text": "The instruction or response was not inserted because the input field is empty."
        },
        "Insert_Empty_Comment": {
            "text": "Comment cannot be empty — please enter text to add your comment."
        },
        "Insert_Empty_Query": {
            "text": "Query response cannot be empty — please add your reply."
        },
        'cmd_required_content': {
            'text': `Please enter at least {{MIN_CONTENT_LENGTH}} characters.`
        },
        'cmd_required_attachment': {
            'text': `Please attach at least one file before submitting.`
        },
        'cmd_single_attachment_only': {
            'text': `Only one attachment is allowed. Please remove extras.`
        },
        'InvalidCursor': {
            'text': 'Kindly set the cursor on Editor view and try again.'
        },
        'Ignore_Full_Format': {
            //As By Srini Request 04_Jun-2025
            //'oldtext': 'Kindly Note! Formatting and content deletion are not allowed for the full text.'
            'text': 'Kindly Note! Formatting and content deletion are not allowed for the entire paragraph.'
        },
        'Ignore_paste_full_text': {
            'text': 'Pasting is disabled when the entire paragraph/table is selected.'
        },
        'Ignore_ref_action': {
            'text': 'To edit the reference, right-click and select &ldquo;Edit Reference&rdquo;. To delete the reference, right-click and select &ldquo;Delete Reference&rdquo;. To raise a comment right-click and select &ldquo;Add Comment&rdquo;',
        },
        'ErrorImpact': {
            'text': 'Oops! Something went wrong. Please be patient till the page refresh.'
        },
        'Dialog_Opened': {
            'text': 'Please close the existing dialog window to open the new dialog window.'
        },
        'ORCID_Added': {
            'text': 'ORCID added successfully.'
        },
        'ORCID_Updated': {
            'text': 'ORCID updated successfully.'
        },
        'wrongpage': {
            'text': 'No page found.'
        },
        'Part_Label_reach_overlimit': {
            'text': 'The label should not exceed more than 30 characters.'
        },
        'Part_Label_pattern_not_match': {
            'text': 'The label doesn\'t match the patterns. Kindly follow the patterns to represent. (E.g., A, B, or A-C).'
        },
        "query_count_mismatch": {
            'text': "Your document query count is mismatched and you are unable to proceed. Kindly contact the support team for assistance."
        },
        "empty_content": {
            'text': "Empty content not allowed to insert."
        },
        "tbl_fn_place_caret": {
            'text': "Place the cursor in the table where you want the table footnote citation to appear."
        },
        "tbl_fn_unnum_added": {
            'text': "The unnumbered table footnote has been successfully added to the list."
        },
        "tbl_fn_ins_renum": {
            'text': "The table footnote has been added successfully, and the existing footnote citations have been renumbered successfully."
        },
        "tbl_fn_unnum_deleted": {
            'text': "The unnumbered table footnote has been deleted successfully from the list."
        },
        "tbl_fn_del_renum": {
            'text': "The table footnote has been deleted from the list, and the remaining footnote citations have been renumbered successfully."
        },
        "tbl_fn_num_added": {
            'text': "The table footnote has been added successfully to the list."
        },
        "tbl_fn_num_deleted": {
            'text': "The table footnote has been deleted successfully from the list."
        },
        'underDevelopment': {
            'text': 'Sorry, this function is under development. Kindly try back once confirmed by developement team.'
        },
        /* 22_MAY_2023 */
        'ePage_Image_Anno_replace': {
            "type": "warning",
            "title": "Warning",
            'text': `Annotations has been made in this image. Do you want to replace it?`,
            "button1": "Yes",
            "button2": "No",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'SCH_MAINTENANCE': {
            'text': "Kindly note that we will be experiencing server downtime due to scheduled maintenance from <span class='font-weight-bold'>{{T1}}&#x000a0;{{T1A}}</span> to <span class='font-weight-bold'>{{T2}}&#x000a0;{{T1A}}</span> (in your local time)."
        },
        'CHINESE_CHAR': {
            'text': 'We have encountered a discrepancy in the Chinese character count between the input and output documents. Please identify and remove these extra Chinese characters from the document before collation process.'
        },
        'CHINSES_CONTACT_SUPPORT': {
            'text': `A technical issue with the East Asian character count is preventing proofing. This may be due to a translator plugin.<br><br>We&rsquo;ve notified our technical team and copied you on the email. Our support team will update you once it&rsquo;s fixed &mdash; usually within 24 hours.`
        },
        'CHINSES_CONTACT_SUPPORT_RESTORE': {
            'text': `A technical issue with the East Asian character count is preventing proofing. This may be caused by a translator plugin.<br><br>If no corrections are found, you can restore the original version using the &ldquo;Restore dialog&rdquo;.<br><br>If you wish to notify our technical team, click &ldquo;Contact Support Team.&rdquo; You will be copied on the email, and our support team will update you once it&rsquo;s fixed &mdash; usually within 24 hours.`
        },
        'INTERNAL_SURVEY': {
            'text': 'Are you sure you want to quit? Your feedback helps us improve our products and services.'
        },
        'CITE_CLK_WARN': {
            "type": "warning",
            "title": "Warning",
            'text': 'Please avoid directly modifying the cited text. Instead, right-click and select "Edit Citation" to link the desired reference from the list for updates.',
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'FORMAT_REF_WARN': {
            "type": "warning",
            "title": "Warning",
            'text': "Please note that formatting (such as Bold, Italic, Roman, etc.) for this element is not allowed, as it will be automatically applied in the proof according to the journal\'s style guidelines. If changes are needed, please provide instructions using the comment option.",
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        "SINGLE_FLOAT_CITE": {
            "text": 'The citation you are attempting to delete is currently referred in only one location within the document and is directly linked to a specific figure/table. Before proceeding with the deletion, please make sure you have cited it appropriately elsewhere.<br><br>Follow these steps to include a citation:<br>(1) Place the cursor where you want to add the citation.<br>(2) Right-click and select &ldquo;Insert Citation&rdquo; from the context menu.<br>(3) Choose the relevant citation from the list of figures/tables.<br>(4) Click &ldquo;Insert&rdquo; to link the citation.'
        },
        "DEL_EDIT_DIALOG": {
            "text": `This citation includes multiple references. Do you want to delete '{{text}}' or remove specific one?<br>
            Note: To delete specific references, click Modify and uncheck the ones you wish to remove from the Cross Citation panel.`
        },
        "REF_IS_EXITS": {
            "text": 'The DOI you are attempting to insert is already present in this article. Do you still wish to add it as a new reference'
        },
        'supply_Delete': {
            "title": "supply Delete Alert",
            "type": "warning",
            'text': 'delete',
            "button1": "yes",
            "button2": "cancel",
            "param": true
        },
        "MISS_GOTO_CITE": {
            "text": `No matching citation found in the document.<br><br>Please use the following steps to insert the citation:<br><br>1. Select the citation content in the document.<br>2. Right-click and choose Insert Citation.<br>3. In the popup window, select the appropriate reference.`
        },
        'ErrorReStoreForCollab': {
            'text': 'This feature is not available for collaborative editing. Contact the support team for assistance.'
        },
        'ErrorLockedParaEdit': {
            'text': 'This paragraph is locked by another user. You cannot edit it until it is released.',
            "type": "warning",
            "title": "Warning",
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'delete_attach_one': {
            'title': 'Delete Attachment',
            'text': 'Are you sure you want to delete this attachment?',
            "type": "warning",
            "button1": "Yes",
            "button2": "Cancel",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'delete_attach_all': {
            'title': 'Delete All Attachment',
            'text': 'Are you sure you want to proceed with deleting all attachments?',
            "type": "warning",
            "button1": "Yes",
            "button2": "Cancel",
            "param": true,
            "Options": {
                hide: true
            }
        },
        'replaceImage2Command': {
            "type": "info",
            "title": "Insert/Replace Image",
            'text': `Please provide your image replacement instructions/comments in the Comments pop-up window, which is open behind this message window, for further processing.`,
            "button1": "OK",
            "button2": "",
            "param": true,
            "Options": {
                hide: true
            }
        },
        "ref_context_warning":{
            "text":'{{text}}'
        }

    };



})(window);
