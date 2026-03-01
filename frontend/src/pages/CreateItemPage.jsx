import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createItem } from '../api';
import { useToast } from '../components/Toast';
import MetadataKeyInput from '../components/MetadataKeyInput';

export default function CreateItemPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [ident, setIdent] = useState(searchParams.get('ident') || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isContainer, setIsContainer] = useState(false);
  const [parentId] = useState(searchParams.get('parent') || '');
  const [metaRows, setMetaRows] = useState([]);   // { key, value }
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaValue, setNewMetaValue] = useState('');
  const newMetaValueRef = useRef(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // ── Metadata row helpers ────────────────────────────────────────
  const removeMetaRow = (idx) => setMetaRows((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const metadata = metaRows
        .filter((r) => r.key.trim())
        .map((r) => ({ key: r.key, value: r.value || null }));

      const data = {
        ident: ident || null,
        name: name || null,
        description: description || null,
        parent_id: parentId ? Number(parentId) : null,
        is_container: isContainer,
        metadata,
      };
      const item = await createItem(data);
      toast(`"${item.name || item.ident}" created`);
      navigate(`/ident/${item.ident}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">New Item</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ident</span>
          <input
            type="text"
            value={ident}
            onChange={(e) => setIdent(e.target.value)}
            placeholder="Leave blank to auto-generate"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>

        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium transition ${!isContainer ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>Item</span>
          <button
            type="button"
            role="switch"
            aria-checked={isContainer}
            onClick={() => setIsContainer(!isContainer)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              isContainer ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isContainer ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium transition ${isContainer ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>Container</span>
        </div>

        {parentId && (
          <p className="text-sm text-gray-500">
            Creating inside parent ID: <span className="font-mono">{parentId}</span>
          </p>
        )}

        {/* ── Metadata ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Metadata</span>
          {metaRows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400 text-right truncate" title={row.key}>
                {row.key}
              </span>
              <span
                className="flex-1 text-sm text-gray-800 dark:text-gray-100 px-1 py-0.5 min-h-[1.5em]"
              >
                {row.value || <span className="text-gray-400 italic">empty</span>}
              </span>
              <button
                type="button"
                onClick={() => removeMetaRow(idx)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <MetadataKeyInput
              value={newMetaKey}
              onChange={setNewMetaKey}
              className="w-36"
              placeholder="Key"
              onSelect={() => newMetaValueRef.current?.focus()}
            />
            <input
              ref={newMetaValueRef}
              type="text"
              placeholder="Value"
              value={newMetaValue}
              onChange={(e) => setNewMetaValue(e.target.value)}
              onBlur={() => {
                if (newMetaKey.trim() && newMetaValue.trim()) {
                  setMetaRows((prev) => [...prev, { key: newMetaKey.trim(), value: newMetaValue.trim() }]);
                  setNewMetaKey('');
                  setNewMetaValue('');
                }
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
              className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <span className="text-xs invisible">✕</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? 'Creating…' : 'Create Item'}
        </button>
      </form>
    </div>
  );
}
