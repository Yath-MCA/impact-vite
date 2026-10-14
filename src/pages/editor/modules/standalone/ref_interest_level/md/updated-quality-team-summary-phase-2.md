# Interest Level Management Module - Quality Team Assignment

## Overview

The Interest Level Management Module has been developed to allow users to mark citations and references with different levels of importance. This document outlines the main features that are currently implemented and need to be tested, as well as features in active development and those planned for future releases.

## Current Development Status

### Currently Implemented
- **Insert New Reference** (complete functionality)
  - Fetch DOI capability
  - Plain Text Insert
  - Form Based Insert

### Still To Be Developed
#### A) EDIT MODE
- Full edit mode functionality 

#### Supporting Module
- **Track Module**
  1. Showing interest level change via context menu (needs discussion with Siva/Srini)
  2. Accept/Reject functionality (needs discussion with Siva/Srini)

## Features Currently Implemented & Ready for Testing

### 1. Interest Level Assignment
- Setting interest levels on references via context menu:
  - None (default state)
  - Special
  - Outstanding
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

### 6. Complete Insert New Reference
- DOI fetching capability
- Plain Text Insert mode
- Form Based Insert mode
- Reference validation
- Error handling for invalid inputs

## Test Priorities

1. **High Priority**:
   - Context menu functionality
   - Interest level propagation between references and citations
   - Citation range handling
   - Browser compatibility
   - Complete Insert New Reference functionality:
     - DOI fetching
     - Plain Text Insert
     - Form Based Insert

2. **Medium Priority**:
   - Edge cases in citation formatting
   - Performance with large reference lists
   - Reference input validation

3. **Low Priority**:
   - UI appearance across different themes
   - Non-English document support

## Out of Scope for Current Testing

The following features are explicitly **NOT** to be tested in this round:

1. **Tracking Module**:
   - No testing of interest level changes appearing in the tracking/change panel
   - Change tracking for interest level modifications is not implemented
   - Pending discussions with Siva/Srini

2. **Accept/Reject Functionality**:
   - No testing of accepting or rejecting interest level changes
   - Pending discussions with Siva/Srini

3. **Edit Mode**:
   - Full edit functionality for references

4. **Citation Module**:
   - Citation Insert functionality
   - Citation Edit functionality
   - Citation Delete functionality
   - To be handled in the next phase of development

## Known Limitations

1. The merging of adjacent citations is currently limited to sequences of 3 or more citations
2. When merging only 2 citations, a debug message is logged: "get confirmation with prod team"
3. Error handling relies on external `ErrorLogTrace()` function which may not be fully implemented yet
4. Edit mode is not yet implemented
5. Tracking module for interest level changes is not implemented
6. Citation Module functionality is planned for the next development phase

## Test Environment Setup

For testing this module, the quality team will need:

1. A document with at least 5 references
2. Multiple in-text citations to those references, including:
   - Simple citations
   - Citation ranges
   - Adjacent citations
3. CKEditor environment with the module loaded
4. Test cases for Insert New Reference functionality:
   - DOI fetching
   - Plain Text Insert
   - Form Based Insert

## Deliverables Expected from Quality Team

1. Test case execution report for the provided Nightwatch.js tests
2. Manual testing report focusing on user scenarios
3. Any identified bugs or inconsistencies
4. Recommendations for edge cases that should be handled
5. Comprehensive feedback on all Insert New Reference modes:
   - DOI fetching
   - Plain Text Insert
   - Form Based Insert

## Contact Information

For questions regarding the implementation or testing scope, please contact the development team.

For discussions related to the Tracking Module integration, please coordinate with Siva/Srini.
