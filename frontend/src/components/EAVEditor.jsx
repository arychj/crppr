import { useState, useEffect, useRef } from 'react';
import {
  listMetadataAttributes,
  createMetadataAttribute,
  setItemMetadata,
  deleteItemMetadata,
} from '../api';
import MetadataKeyInput from './MetadataKeyInput';
import { useToast } from './Toast';

/**
 * Full metadata editor for an existing item.
 * Existing values show as click-to-edit text (matching the details box pattern).
 * An empty row at the bottom lets you start typing a new key/value pair.
 */
export default function EAVEditor({ itemId, existingValues = [], onSaved, setMetadataFn, deleteMetadataFn }) {
  const _setMetadata = setMetadataFn || setItemMetadata;
  const _deleteMetadata = deleteMetadataFn || deleteItemMetadata;
  const [rows, setRows] = useState([]);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [keyColWidth, setKeyColWidth] = useState('auto');
  const measRef = useRef(null);
  const newValueRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    setRows(
      existingValues.map((mv) => ({
        attribute_id: mv.attribute_id,
        attribute_name: mv.attribute_name,
        value: mv.value || '',
      }))
    );
    setEditingIdx(null);
  }, [existingValues]);

  // Measure the longest key name to size the key column
  useEffect(() => {
    if (!measRef.current || rows.length === 0) { setKeyColWidth('auto'); return; }
    const span = measRef.current;
    let max = 0;
    for (const row of rows) {
      span.textContent = row.attribute_name;
      max = Math.max(max, span.offsetWidth);
    }
    span.textContent = '';
    setKeyColWidth(max > 0 ? `${max + 4}px` : 'auto'); // +4 for a little breathing room
  }, [rows]);

  // ── click-to-edit existing rows ──────────────────────────────────
  const startEditing = (idx) => {
    setEditingIdx(idx);
    setEditValue(rows[idx].value);
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const handleEditBlur = async () => {
    const idx = editingIdx;
    setEditingIdx(null);
    if (idx === null) return;
    const row = rows[idx];
    if (editValue === row.value) return;
    try {
      await _setMetadata(itemId, [{ attribute_id: row.attribute_id, value: editValue || null }]);
      setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, value: editValue } : r)));
      toast(`Saved "${row.attribute_name}"`);
      onSaved?.();
    } catch (err) {
      toast(`Failed to save: ${err.message}`, 'error');
    }
  };

  const handleEditKey = (e) => {
    if (e.key === 'Enter') e.target.blur();
    if (e.key === 'Escape') { setEditingIdx(null); }
  };

  const handleRemove = async (row, idx) => {
    try {
      await _deleteMetadata(itemId, row.attribute_id);
      setRows((prev) => prev.filter((_, i) => i !== idx));
      if (editingIdx === idx) setEditingIdx(null);
      toast(`Removed "${row.attribute_name}"`);
      onSaved?.();
    } catch (err) {
      toast(`Failed to remove: ${err.message}`, 'error');
    }
  };

  // ── new row (always-visible empty row at bottom) ─────────────────
  const handleNewRowSave = async () => {
    if (!newKey.trim() || !newValue.trim() || saving) return;
    setSaving(true);
    try {
      const allAttrs = await listMetadataAttributes();
      const attrMap = Object.fromEntries(allAttrs.map((a) => [a.name, a.id]));
      let attrId = attrMap[newKey];
      if (!attrId) {
        const created = await createMetadataAttribute({ name: newKey, datatype: 'text' });
        attrId = created.id;
      }
      await _setMetadata(itemId, [{ attribute_id: attrId, value: newValue || null }]);
      toast(`Saved "${newKey}"`);
      setNewKey('');
      setNewValue('');
      setShowNew(false);
      onSaved?.();
    } catch (err) {
      toast(`Failed to save: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Metadata</h2>

      {/* Hidden span used to measure key text widths */}
      <span
        ref={measRef}
        className="invisible absolute whitespace-nowrap text-sm font-medium"
        aria-hidden="true"
      />

      {/* Existing metadata — click to edit */}
      {rows.map((row, idx) => (
        <div key={row.attribute_id} className="flex items-center gap-3 px-1">
          <span
            style={{ width: keyColWidth, minWidth: keyColWidth }}
            className="shrink-0 text-sm font-medium text-gray-600 dark:text-gray-400 text-right pr-1"
            title={row.attribute_name}
          >
            {row.attribute_name}
          </span>
          {editingIdx === idx ? (
            <input
              ref={editRef}
              type="text"
              className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 border-b-2 border-blue-400 focus:outline-none px-1 py-0.5"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditBlur}
              onKeyDown={handleEditKey}
            />
          ) : (
            <span
              onClick={() => startEditing(idx)}
              className="flex-1 text-sm text-gray-800 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition px-1 py-0.5 min-h-[1.5em]"
              title="Click to edit"
            >
              {row.value || <span className="text-gray-400 italic">empty</span>}
            </span>
          )}
          {editingIdx === idx ? (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleRemove(row, idx); }}
              className="text-xs text-red-500 hover:text-red-700"
              title="Remove"
            >
              ✕
            </button>
          ) : (
            <span className="text-xs invisible">✕</span>
          )}
        </div>
      ))}

      {/* Togglable new-metadata row */}
      {showNew ? (
        <div className="flex items-center gap-3 px-1">
          <MetadataKeyInput
            value={newKey}
            onChange={setNewKey}
            className="w-1/3 shrink-0"
            placeholder="Key"
            onSelect={() => newValueRef.current?.focus()}
          />
          <input
            ref={newValueRef}
            type="text"
            placeholder="Value"
            className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onBlur={handleNewRowSave}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
          />
          <button
            type="button"
            onClick={() => { setShowNew(false); setNewKey(''); setNewValue(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-500 dark:hover:text-gray-300"
            title="Cancel"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="text-xs text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition ml-1"
        >
          + new
        </button>
      )}
    </div>
  );
}
