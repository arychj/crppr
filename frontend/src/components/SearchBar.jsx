import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { searchItems } from '../api';

/**
 * Reusable search bar with live results dropdown.
 *
 * Props:
 *  - onSelect(item)       — called when a result row is clicked (optional)
 *  - renderActions(item)  — render custom action buttons per result row (optional)
 *  - placeholder          — input placeholder text
 *  - navigateOnClick      — if true (default), clicking a result navigates to the item page
 */
export default function SearchBar({
  onSelect,
  renderActions,
  placeholder = 'Search items…',
  navigateOnClick = true,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchItems(query.trim())
        .then((data) => {
          setResults(data);
          setOpen(true);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleResultClick = (item) => {
    if (onSelect) onSelect(item);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-gray-400">searching…</span>
      )}

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {results.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm border-b dark:border-gray-700 last:border-b-0"
            >
              {navigateOnClick ? (
                <Link
                  to={`/ident/${item.ident}`}
                  className="flex-1 flex items-center space-x-2 min-w-0"
                  onClick={() => { setOpen(false); setQuery(''); }}
                >
                  <ResultLabel item={item} />
                </Link>
              ) : (
                <div
                  className="flex-1 flex items-center space-x-2 min-w-0"
                  onClick={() => handleResultClick(item)}
                >
                  <ResultLabel item={item} />
                </div>
              )}
              {renderActions && (
                <div className="flex-shrink-0 ml-2 flex items-center space-x-1">
                  {renderActions(item)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && query.trim() && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-400">
          No results found.
        </div>
      )}
    </div>
  );
}

function ResultLabel({ item }) {
  return (
    <>
      <span className="font-mono text-gray-500 dark:text-gray-400 flex-shrink-0">{item.ident}</span>
      <span className="text-gray-800 dark:text-gray-100 truncate">{item.name || '(unnamed)'}</span>
      {item.is_container && (
        <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
          container
        </span>
      )}
    </>
  );
}
