import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiGhostOutline, mdiHomeExportOutline, mdiPackageVariant } from '@mdi/js';
import { searchItems } from '../api';

/**
 * Modal dialog that lets the user search for items/containers.
 *
 * Props:
 *  - open           — boolean controlling visibility
 *  - onClose        — called to close the modal
 *  - onSelect(item) — called when a search result is picked
 *  - title          — modal heading
 *  - filterFn(item) — optional filter applied to results (e.g. containers only)
 *  - createUrl      — URL for the "Create new item" link at the bottom (optional)
 *  - createLabel    — label for the create link (default: "+ Create new item")
 */
export default function ItemPickerModal({
  open,
  onClose,
  onSelect,
  title = 'Select an item',
  filterFn,
  createUrl,
  createLabel = '+ Create new item',
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      // Use rAF + timeout to ensure the modal is rendered and visible before focusing
      requestAnimationFrame(() => {
        setTimeout(() => inputRef.current?.focus(), 0);
      });
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchItems(query.trim())
        .then((data) => {
          setResults(filterFn ? data.filter(filterFn) : data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, filterFn]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg pointer-events-auto animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search input */}
          <div className="px-5 pb-3">
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items…"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto border-t dark:border-gray-700">
            {loading && (
              <p className="px-5 py-3 text-sm text-gray-400">Searching…</p>
            )}

            {!loading && query.trim() && results.length === 0 && (
              <p className="px-5 py-3 text-sm text-gray-400">No results found.</p>
            )}

            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => { onSelect(item); onClose(); }}
                className="w-full flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left border-b dark:border-gray-700 last:border-b-0"
              >
                <span className="font-mono text-gray-500 dark:text-gray-400 flex-shrink-0">{item.ident || <span title="Ghost — this item has no ident"><Icon path={mdiGhostOutline} size={0.6} className="inline" /></span>}</span>
                <span className="text-gray-800 dark:text-gray-100 truncate">{item.name || '(unnamed)'}</span>
                {item.is_container && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                    <Icon path={mdiPackageVariant} size={0.5} />
                    <span className="hidden sm:inline">container</span>
                  </span>
                )}
                {item.is_checked_out && (
                  <Icon path={mdiHomeExportOutline} size={0.6} className="text-amber-500 flex-shrink-0" title="Checked out" />
                )}
              </button>
            ))}

            {/* Static "Create new item" at the bottom */}
            {createUrl && (
              <Link
                to={createUrl}
                onClick={onClose}
                className="w-full flex items-center gap-2 px-5 py-3 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-gray-700 transition border-t dark:border-gray-700"
              >
                {createLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
