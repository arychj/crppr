import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { listMetadataAttributes, createMetadataAttribute } from '../api';

/**
 * An input that autocompletes from existing metadata attribute names.
 * If the typed name doesn't exist, it will be created on the backend
 * when the item is saved.
 */
export default forwardRef(function MetadataKeyInput({ value, onChange, className = '', style, placeholder = 'Key name', onSelect }, ref) {
  const [suggestions, setSuggestions] = useState([]);
  const [allKeys, setAllKeys] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    listMetadataAttributes()
      .then((attrs) => setAllKeys(attrs.map((a) => a.name).sort((a, b) => a.localeCompare(b))))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    if (v.length > 0) {
      const lower = v.toLowerCase();
      setSuggestions(allKeys.filter((k) => k.toLowerCase().includes(lower)));
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleFocus = () => {
    if (value.length > 0) {
      const lower = value.toLowerCase();
      setSuggestions(allKeys.filter((k) => k.toLowerCase().includes(lower)));
    } else {
      setSuggestions(allKeys);
    }
    setOpen(true);
  };

  const pick = (name) => {
    onChange(name);
    setOpen(false);
    onSelect?.(name);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`} style={style}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 top-full left-0 mt-1 w-full bg-white dark:bg-gray-700 border dark:border-gray-600 rounded shadow-md max-h-40 overflow-y-auto text-sm">
          {suggestions.map((name) => (
            <li
              key={name}
              onClick={() => pick(name)}
              className="px-2 py-1 hover:bg-blue-50 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-100"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
