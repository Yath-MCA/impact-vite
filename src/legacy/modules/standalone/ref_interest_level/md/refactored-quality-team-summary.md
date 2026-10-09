# Interest Level Management Module - Quality Team Assignment

## Overview

The Interest Level Management Module allows users to mark citations and references with different levels of importance. This document outlines the complete development status across all phases, testing priorities, and known limitations.

## Development Status

### Phase 1: Reference Management
- **Insert Reference (INSERT MODE)** ✅ COMPLETED
  - Fetch DOI capability
  - Plain Text Insert
  - Form Based Insert
- **Edit Reference (EDIT MODE)** ⚠️ PARTIALLY COMPLETED
  - Same User: Can remove/replace existing annotation text with track handling
  - Different User: Work in progress - Can remove/replace existing annotation text with track handling

### Phase 2: Interest Level Assignment
- **Context Menu Provision** ✅ COMPLETED
  - Setting interest levels on references:
    - None (default state)
    - Special
    - Outstanding
  - **Note**: Functionality limited to:
    - Existing reference journal pattern
    - Newly inserted references with journal pattern (not plain text)

### Phase 3: Renumbering Integration
- **After Insert Reference & Renumber** ✅ COMPLETED
  - Handle citation interest-level visibility
- **Edit Citation & Renumber** ⚠️ WORK IN PROGRESS
  - Handle citation interest-level visibility
- **Delete Citation & Renumber** ⚠️ WORK IN PROGRESS
  - Handle citation interest-level visibility

### Supporting Modules
- **Tracking Module** ❌ NOT IMPLEMENTED
  - No interest level changes appear in tracking/change panel
  - Pending discussions with Siva/Srini
- **Citation Panel** ❌ NOT IMPLEMENTED
  - Needs to show interest-level visibility
- **Tooltip Popup** ❌ NOT IMPLEMENTED
  - Needs to show interest-level visibility
- **Accept/Reject Functionality** ❌ NOT IMPLEMENTED
  - Pending discussions with Siva/Srini

## Features Ready for Testing

### 1. Interest Level Assignment
- Setting interest levels on references via context menu
- Data attributes correctly applied to DOM elements
- Visual indicators for different interest levels

### 2. Context Menu Integration
- Right-click on references shows "Change Interest Level" option
- Sub-menu displays appropriate options
- Current interest level is reflected in the menu state

### 3. Citation Synchronization
- Interest level changes propagate from references to in-text citations
- All instances of the same reference are updated consistently

### 4. Citation Formatting Rules
- Single citations show appropriate interest level indicators
- Citation ranges with the same interest level display as unified ranges (e.g., "1–3")
- Citation ranges with different interest levels split into separate citations

### 5. Format Conversion
- Conversion between text-based interest indicators (■, ■■) and attribute-based format
- Proper handling of mixed-format documents

### 6. Insert New Reference
- DOI fetching capability
- Plain Text Insert mode
- Form Based Insert mode
- Reference validation
- Error handling for invalid inputs

## Test Priorities

1. **High Priority**:
   - Context menu functionality for interest level assignment
   - Interest level propagation between references and citations
   - Citation range handling with different interest levels
   - Browser compatibility
   - Insert New Reference functionality (all modes)
   - Post-renumbering interest level visibility when inserting references

2. **Medium Priority**:
   - Edge cases in citation formatting
   - Performance with large reference lists
   - Reference input validation
   - Same-user edit reference functionality

3. **Low Priority**:
   - UI appearance across different themes
   - Non-English document support

## Out of Scope for Current Testing

The following features are explicitly **NOT** to be tested in this round:

1. **Tracking Module**:
   - Interest level changes in tracking/change panel
   - Change tracking for interest level modifications

2. **Accept/Reject Functionality**:
   - Accepting or rejecting interest level changes

3. **Edit Mode** (partial):
   - Different-user edit functionality

4. **Citation Module**:
   - Citation Edit & Renumber functionality
   - Citation Delete & Renumber functionality

## Known Limitations

1. Interest level assignment works only for journal pattern references, not plain text
2. The merging of adjacent citations is currently limited to sequences of 3 or more citations
3. When merging only 2 citations, a debug message is logged: "get confirmation with prod team"
4. Error handling relies on external `ErrorLogTrace()` function which may not be fully implemented
5. Different-user edit mode is not yet fully implemented
6. Tracking module for interest level changes is not implemented
7. Citation Panel and Tooltip do not yet show interest level information
8. Citation Edit & Delete with renumbering are still in development

## Test Environment Setup

For testing this module, the quality team will need:

1. A document with at least 5 references in journal pattern format
2. Multiple in-text citations to those references, including:
   - Simple citations
   - Citation ranges
   - Adjacent citations
3. CKEditor environment with the module loaded
4. Test cases covering:
   - Interest level assignment via context menu
   - Reference insert with all three modes
   - Post-renumbering scenarios after reference insertion

## Deliverables Expected from Quality Team

1. Test case execution report for the provided Nightwatch.js tests
2. Manual testing report focusing on user scenarios
3. Any identified bugs or inconsistencies
4. Recommendations for edge cases that should be handled
5. Comprehensive feedback on all three phases:
   - Phase 1: Insert Reference functionality
   - Phase 2: Context Menu and interest level assignment
   - Phase 3: Post-renumbering interest level visibility (insert reference scenarios)

## Contact Information

For questions regarding the implementation or testing scope, please contact the development team.

For discussions related to the Tracking Module integration, please coordinate with Siva/Srini.
