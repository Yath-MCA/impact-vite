# NotesGroup Class Documentation

## Overview
The `NotesGroup` class extends `BaseModule` and manages footnotes and endnotes in a document editor. It handles the creation, deletion, and renumbering of notes, as well as their corresponding references in the text.

## Constructor
```javascript
constructor(name, subFolder, options = {})
```
Initializes the NotesGroup instance, sets up properties, binds methods, and performs lazy initialization.

## Key Properties
- `templateList`: Object to store note templates
- `canUnmountComponentWhileClose`: Boolean flag for component unmounting
- `PrefixArr`: Object containing prefixes for footnotes and endnotes

## Main Methods

### AssignVar_EventLoop()
Sets up DOM element references and event listeners for the notes interface.

### initLoop()
Initializes configuration settings and loads templates.

### showLoop()
Prepares the notes interface for display, including setting up the Summernote editor.

### FIRE_CHANGE(evt)
Handles toggling between footnotes and endnotes.

### FIRE_CHECK_ROOT_DIV(type, findRoot)
Creates the root structure for notes if it doesn't exist.

### FIRE_DELETE(Panel, findRoot, editor)
Deletes a note and its references, updating the document structure as needed.

### FIRE_INSERT()
Inserts a new note and its corresponding citation in the document.

### FIRE_RE_NUMBER(type, RootDiv, GroupDiv, prefix)
Renumbers the notes after insertions or deletions.

## Helper Methods

### deleteNoteReferences(findRoot, NODE_ID)
Removes or marks for deletion all references to a specific note.

### getFnGroupInfo(findRoot, type, Id_Prefix)
Retrieves or creates the appropriate note group and calculates the new note index.

### insertCitation(_Id, lab, nType)
Inserts a citation reference in the document.

### insertNoteEntry(fnGroup, _Id, lab, caption_Text, nType)
Adds a new note entry to the appropriate note group.

## Event Handlers

### SUMMER_NOTE_EVENTS_HANDLE(e)
Manages events for the Summernote editor, including paste filtering.

## Error Handling
The class uses a `logError` method (not shown in the provided code) to handle and log errors for each method.

## Notes
- The class is designed to work with both footnotes and endnotes.
- It integrates with a global editor object and uses templates for creating note structures.
- The class handles both numbered and unnumbered notes.
