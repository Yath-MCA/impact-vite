/**
 * SweetAlert2 Alert Service
 * Wrapper for consistent alert dialogs
 */

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

// Create React-compatible Swal instance
const ReactSwal = withReactContent(Swal);

// Default configuration
const defaultConfig = {
  confirmButtonColor: '#3b82f6',
  cancelButtonColor: '#6b7280',
  confirmButtonText: 'OK',
  cancelButtonText: 'Cancel',
  reverseButtons: true,
  customClass: {
    popup: 'rounded-xl',
    confirmButton: 'px-4 py-2 rounded-lg',
    cancelButton: 'px-4 py-2 rounded-lg'
  }
};

/**
 * Show success alert
 * @param {string} title - Alert title
 * @param {string} text - Alert text
 * @param {object} options - Additional options
 * @returns {Promise} Swal promise
 */
export function success(title = 'Success!', text = '', options = {}) {
  return ReactSwal.fire({
    ...defaultConfig,
    icon: 'success',
    title,
    text,
    timer: 3000,
    timerProgressBar: true,
    ...options
  });
}

/**
 * Show error alert
 * @param {string} title - Alert title
 * @param {string} text - Alert text
 * @param {object} options - Additional options
 * @returns {Promise} Swal promise
 */
export function error(title = 'Error!', text = 'Something went wrong', options = {}) {
  return ReactSwal.fire({
    ...defaultConfig,
    icon: 'error',
    title,
    text,
    ...options
  });
}

/**
 * Show warning alert
 * @param {string} title - Alert title
 * @param {string} text - Alert text
 * @param {object} options - Additional options
 * @returns {Promise} Swal promise
 */
export function warning(title = 'Warning', text = '', options = {}) {
  return ReactSwal.fire({
    ...defaultConfig,
    icon: 'warning',
    title,
    text,
    ...options
  });
}

/**
 * Show info alert
 * @param {string} title - Alert title
 * @param {string} text - Alert text
 * @param {object} options - Additional options
 * @returns {Promise} Swal promise
 */
export function info(title = 'Information', text = '', options = {}) {
  return ReactSwal.fire({
    ...defaultConfig,
    icon: 'info',
    title,
    text,
    ...options
  });
}

/**
 * Show confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} text - Dialog text
 * @param {object} options - Additional options
 * @returns {Promise<boolean>} True if confirmed
 */
export function confirm(title = 'Are you sure?', text = '', options = {}) {
  return ReactSwal.fire({
    ...defaultConfig,
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || 'Yes',
    cancelButtonText: options.cancelButtonText || 'No',
    ...options
  }).then((result) => result.isConfirmed);
}

/**
 * Show delete confirmation
 * @param {string} itemName - Name of item to delete
 * @returns {Promise<boolean>} True if confirmed
 */
export function confirmDelete(itemName = 'this item') {
  return confirm(
    'Delete Confirmation',
    `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
    {
      icon: 'warning',
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444'
    }
  );
}

/**
 * Show loading state
 * @param {string} text - Loading text
 * @returns {object} Swal instance for closing
 */
export function loading(text = 'Loading...') {
  return ReactSwal.fire({
    title: text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      ReactSwal.showLoading();
    }
  });
}

/**
 * Close current alert
 */
export function close() {
  ReactSwal.close();
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} icon - Icon type
 * @param {object} options - Additional options
 */
export function toast(message, icon = 'success', options = {}) {
  const Toast = ReactSwal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    }
  });

  return Toast.fire({
    icon,
    title: message,
    ...options
  });
}

export { ReactSwal as Swal };

export default {
  success,
  error,
  warning,
  info,
  confirm,
  confirmDelete,
  loading,
  close,
  toast,
  Swal: ReactSwal
};
