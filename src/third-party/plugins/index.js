/**
 * Plugin Integrations Index
 * Export all plugin wrappers and utilities
 */

// Mustache
export { 
  renderTemplate, 
  renderToElement, 
  compileTemplate, 
  validateTemplate 
} from './mustache';

// Moment
export { 
  formatDate, 
  fromNow, 
  parseDate, 
  isValidDate, 
  addTime, 
  diff, 
  startOf, 
  endOf, 
  toDateTimeLocal, 
  moment 
} from './moment';

// Axios
export { 
  get, 
  post, 
  put, 
  patch, 
  del as delete, 
  setAuthToken, 
  clearAuthToken, 
  apiClient 
} from './axios';

// SweetAlert2
export { 
  success, 
  error, 
  warning, 
  info, 
  confirm, 
  confirmDelete, 
  loading, 
  close, 
  toast, 
  Swal 
} from './sweetalert';

// AG Grid
export { default as GridWrapper } from './aggrid/GridWrapper';

// Summernote
export { default as SummernoteEditor } from './summernote/SummernoteEditor';

// Tempus Dominus
export { default as DateTimePicker } from './tempusdominus/DateTimePicker';
