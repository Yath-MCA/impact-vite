/**
 * Query Management System
 * A comprehensive system for managing queries, comments, and responses in a document editor
 *
 * === DEV REMARKS === *
 * 23-March-2024 - YA
 * P1 Dev:    3470154 (PLOS) - Default landing view: Query Panel instead of TOC
 * (See code for SHARED_KEY/plos logic and inline equation handling)
 *
 */

// Shared constants (used by QueryRestoreModule and related paths)
const CONTEXTS = ["original", "aqBackup", "aqOriginal"];
// Global flag to control highlighting, set to false for now
const applyGlobalHighlightStyle = false;
