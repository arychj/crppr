import Icon from '@mdi/react';
import { mdiContentCopy } from '@mdi/js';

/**
 * A small modal that displays a title, a text value, and a copy button.
 * Tapping the text or the copy icon copies to clipboard.
 *
 * Props:
 *  - open    — boolean
 *  - onClose — callback
 *  - title   — modal heading
 *  - value   — text to display / copy
 *  - onCopy  — optional callback after copy succeeds
 */
export default function InfoModal({ open, onClose, title, value, onCopy }) {
  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      onCopy?.();
    } catch {
      /* fallback: ignore */
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm pointer-events-auto animate-slide-in p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div
            onClick={copy}
            className="flex items-center gap-2 cursor-pointer group bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2"
          >
            <span className="flex-1 font-mono text-sm text-gray-800 dark:text-gray-100 break-all select-all">
              {value}
            </span>
            <Icon
              path={mdiContentCopy}
              size={0.7}
              className="shrink-0 text-gray-400 group-hover:text-blue-500 transition"
            />
          </div>
        </div>
      </div>
    </>
  );
}
