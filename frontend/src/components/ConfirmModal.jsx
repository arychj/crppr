import { useEffect, useRef } from 'react';

/**
 * Reusable confirmation dialog.
 *
 * Props:
 *  - open            — boolean, whether the modal is visible
 *  - title           — heading text
 *  - message         — body text (string or JSX)
 *  - confirmLabel    — text for the confirm button (default "Confirm")
 *  - cancelLabel     — text for the cancel button (default "Cancel")
 *  - onConfirm()     — called when user confirms
 *  - onCancel()      — called when user cancels or clicks backdrop
 *  - variant         — "danger" | "warning" | "default" (button colour)
 */
export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const btnColor = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
  }[variant] || 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        {message && <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-4 py-1.5 text-sm rounded transition ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
