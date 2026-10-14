# Interest Level Management Module
## Developer Documentation

## Overview

The Interest Level Management Module provides functionality to mark citations and references with different levels of interest or importance within a document. This module integrates with the CKEditor and allows users to set interest levels via context menu options.

## Interest Levels

The module supports three interest levels:

```javascript
const INTEREST_LEVELS = {
    NONE: 'none',         // Default state (no special indicator)
    SPECIAL: 'special',    // Special importance
    OUTSTANDING: 'outstanding'  // Outstanding importance
};
```

## Core Components

### 1. Command Definitions

The module defines three commands corresponding to the three interest levels:

```javascript
const commands_InterestLevel = [
    {
        name: 'INTEREST_LEVEL_NONE',
        action: 'interest_level_none',
        label: 'None',
        icon: '../assets/images/svg/ContextMenu/MoveBefore.svg',
        order: 210
    },
    // SPECIAL and OUTSTANDING definitions follow the same pattern
];
```

### 2. Key Functions

#### Interest Level Management

- **`handleInterestLevelCommon(options, fromContext)`**  
  Core function for handling interest level changes on DOM elements.
  - Parameters:
    - `options`: Object containing event, target, module context, and target finder
    - `fromContext`: Boolean indicating if change is from context menu
  - Returns: Array of modified target elements

- **`handleInterestLevelChange_RefList(evt, target, fromContext, self)`**  
  Handles interest level changes on reference list items.
  - Parameters:
    - `evt`: Event type string
    - `target`: Target reference list item element
    - `fromContext`: Boolean indicating if change is from context menu
    - `self`: Module context (defaults to MultiRefModule)

- **`handleInterestLevelChange_Citations(evt, rid, self)`**  
  Propagates interest level changes to all in-text citations for a reference.
  - Parameters:
    - `evt`: Event type string
    - `rid`: Reference ID
    - `self`: Module context

#### Citation Processing

- **`convertTextModeToAttributeMode()`**  
  Converts text-based interest indicators (■, ■■) to attribute-based format.

- **`processCitationGroups()`**  
  Processes citation groups to format ranges according to interest level rules.

- **`restructureCitationGroup(group, ridList, interestLevels)`**  
  Restructures a citation group based on interest levels.
  - Parameters:
    - `group`: Citation group element
    - `ridList`: Array of reference IDs
    - `interestLevels`: Array of interest levels for each reference

- **`mergeAdjacentCitations(group)`**  
  Merges adjacent citations with the same interest level.

- **`createCitationElement(subRidList, level)`**  
  Creates a new namedCitation element.
  - Parameters:
    - `subRidList`: Array of reference IDs
    - `level`: Interest level for the citation
  - Returns: new namedCitation DOM element

### 3. Editor Integration

- **`setupEditorCommands_InterestLevel(editor, commands)`**  
  Sets up editor commands and menu items for Interest Level.
  - Parameters:
    - `editor`: CKEditor instance
    - `commands`: Array of command configurations

- **`initializeContextMenu(editor)`**  
  Initializes context menu for interest level changes.
  - Parameters:
    - `editor`: CKEditor instance

- **`editorListener_InterestLevel(editor)`**  
  Editor listener to setup context menu and commands.
  - Parameters:
    - `editor`: Editor instance (optional, defaults to global editor)

## Usage Examples

### 1. Initializing the Module

The module automatically initializes when the editor is ready:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    CKEDITOR.on('instanceReady', function(ev) {
        editorListener_InterestLevel(ev.editor);
    });
});
```

### 2. Changing Interest Level Programmatically

```javascript
// Get reference element
const referenceElement = document.querySelector('#CIT1');

// Change interest level to "special"
handleInterestLevelChange_RefList('interest_level_special', referenceElement);
```

### 3. Handling Annotation Preview

```javascript
// Preview "outstanding" interest level with annotation
handleAnnotationPreview(
    INTEREST_LEVELS.OUTSTANDING,
    "This is an important reference that supports our main hypothesis.",
    MultiRefModule
);
```

## Data Model

### DOM Attributes

The module uses data attributes to store interest level information:

- `data-interest-level`: Stores the current interest level
- `data-interest-level-old`: Preserves the original interest level

### Context Menu Structure

The context menu for interest levels is structured as:

```
+ Change Interest Level
  ├─ None
  ├─ Special
  └─ Outstanding
```

## Citation Formatting Rules

1. Single citations are displayed with their reference number and appropriate styling based on interest level.

2. Citation ranges with the same interest level are displayed as a range (e.g., "1–3") with appropriate styling.

3. Citation ranges with different interest levels are split into separate citation elements grouped by interest level.

## Integration Points

- Integrates with CKEditor for context menu functionality
- Works with `MultiRefModule` for reference management
- Uses `GlobalEditor` for DOM manipulation

## Error Handling

All functions include try-catch blocks with error logging via `interest_logError()` function, which logs to console and calls an external `ErrorLogTrace()` function.
