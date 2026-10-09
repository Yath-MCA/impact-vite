# Interest Level Management Module - Quality Team Assignment

## Overview

The Interest Level Management Module has been developed to allow users to mark citations and references with different levels of importance. This document outlines the main features that are currently implemented and need to be tested, as well as features that are explicitly out of scope for the current testing round.

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

## Test Priorities

1. **High Priority**:
   - Context menu functionality
   - Interest level propagation between references and citations
   - Citation range handling
   - Browser compatibility

2. **Medium Priority**:
   - Edge cases in citation formatting
   - Performance with large reference lists

3. **Low Priority**:
   - UI appearance across different themes
   - Non-English document support

## Out of Scope for Current Testing

The following features are explicitly **NOT** to be tested in this round:

1. **Tracking Panel Integration**:
   - No testing of interest level changes appearing in the tracking/change panel
   - Change tracking for interest level modifications is not implemented

2. **Accept/Reject Functionality**:
   - No testing of accepting or rejecting interest level changes
   - This functionality will be implemented in a future release

## Known Limitations

1. The merging of adjacent citations is currently limited to sequences of 3 or more citations
2. When merging only 2 citations, a debug message is logged: "get confirmation with prod team"
3. Error handling relies on external `ErrorLogTrace()` function which may not be fully implemented yet

## Test Environment Setup

For testing this module, the quality team will need:

1. A document with at least 5 references
2. Multiple in-text citations to those references, including:
   - Simple citations
   - Citation ranges
   - Adjacent citations
3. CKEditor environment with the module loaded

## Deliverables Expected from Quality Team

1. Test case execution report for the provided Nightwatch.js tests
2. Manual testing report focusing on user scenarios
3. Any identified bugs or inconsistencies
4. Recommendations for edge cases that should be handled

## Contact Information

For questions regarding the implementation or testing scope, please contact the development team.
