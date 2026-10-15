/**
 * Shared modules inventory lives in the editor manifest + packer, not this barrel.
 *
 * - query-comment-system → ESM island (boot import after BaseModule; not e6_main concat)
 * - shared/**/context.js → global_context_common
 * - other shared → single_module copies under /assets/{VERSION}/modules/
 * - ESM class modules import BaseModule from @editor/modules/_runtime/BaseModule.js
 *
 * Do not import-all here (mixed classic + ESM; breaks globals / load order).
 */
