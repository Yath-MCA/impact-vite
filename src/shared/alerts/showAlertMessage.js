import Swal from 'sweetalert2';

/**
 * Thin SweetAlert2 wrapper for catalog entries
 * ({ type, title, text, button1, button2 }).
 * @returns {Promise<{ isConfirmed: boolean, isDismissed?: boolean }>}
 */
export async function showAlertMessage(entry = {}, _context = {}, swalOverrides = {}) {
  if (!entry || typeof entry !== 'object') {
    return { isConfirmed: false, isDismissed: true };
  }

  const icon = entry.type === 'error' || entry.type === 'warning' || entry.type === 'info' || entry.type === 'success'
    ? entry.type
    : 'info';

  const hasCancel = Boolean(entry.button2 && String(entry.button2).trim());
  const confirmText = entry.button1 && String(entry.button1).trim() ? entry.button1 : 'OK';

  const result = await Swal.fire({
    icon,
    title: entry.title || undefined,
    html: entry.text || undefined,
    confirmButtonText: confirmText,
    showCancelButton: hasCancel,
    cancelButtonText: hasCancel ? entry.button2 : undefined,
    allowOutsideClick: entry.Options?.hide !== false,
    ...swalOverrides,
  });

  return {
    isConfirmed: Boolean(result.isConfirmed),
    isDismissed: Boolean(result.isDismissed),
  };
}
