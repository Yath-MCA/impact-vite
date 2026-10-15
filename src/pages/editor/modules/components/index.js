/**
 * Components ESM barrel — load before BaseModule / UMS.
 * Side-effect imports assign window bridges.
 */
import './Error_Report_Table_Builder.js';
import './UserActionRecord_Handler.js';
import './ModuleStore.js';
import './IdGenerator.js';
import './BitsIdGenerator.js';
import './JatsIdGenerator.js';
import './DocBookIdGenerator.js';
import './Renumber_Handler.js';
import './trackManager.js';
import './FileUploadModule.js';
import './SummernoteManager.js';
import './emailInputHelper.js';

export { TableBuilder, ErrorReportRenderer, EnhancedErrorTracker } from './Error_Report_Table_Builder.js';
export { RecordUserAction, getRecordUserAction } from './UserActionRecord_Handler.js';
export { DialogStateManager, ModuleInitializationQueue, ModuleStatus, ModuleRegistry } from './ModuleStore.js';
export { default as IdGenerator } from './IdGenerator.js';
export { default as BitsIdGenerator } from './BitsIdGenerator.js';
export { default as JatsIdGenerator } from './JatsIdGenerator.js';
export { default as DocBookIdGenerator } from './DocBookIdGenerator.js';
export { default as CheckOrder } from './Renumber_Handler.js';
export { default as trackManager } from './trackManager.js';
export { default as FileUploadModule } from './FileUploadModule.js';
export { default as SummernoteManager } from './SummernoteManager.js';
export { default as emailInputHelper } from './emailInputHelper.js';

export async function ensureComponentsEsm() {
  // imports above already ran; ensure critical globals exist
  if (typeof window === 'undefined') return;
  const missing = [];
  for (const k of ['FileUploadModule', 'trackManager', 'SummernoteManager', 'EnhancedErrorTracker', 'RecordUserAction', 'ModuleRegistry', 'DialogStateManager', 'IdGenerator']) {
    if (!window[k]) missing.push(k);
  }
  if (missing.length) throw new Error(`components ESM missing window: ${missing.join(', ')}`);
}
