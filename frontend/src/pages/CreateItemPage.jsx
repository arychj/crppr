import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createItem, getItem, getTemplate, searchTemplates } from '../api';
import { useToast } from '../components/Toast';
import MetadataKeyInput from '../components/MetadataKeyInput';
import ItemPickerModal from '../components/ItemPickerModal';
import Icon from '@mdi/react';
import { mdiContentCopy, mdiContentDuplicate } from '@mdi/js';

export default function CreateItemPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [ident, setIdent] = useState(searchParams.get('ident') || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isContainer, setIsContainer] = useState(false);
  const [parentId, setParentId] = useState(searchParams.get('parent') || '');
  const [parentLabel, setParentLabel] = useState('');
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [clonePickerOpen, setClonePickerOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [metaRows, setMetaRows] = useState([]);   // { key, value }
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaValue, setNewMetaValue] = useState('');
  const [editingMetaIdx, setEditingMetaIdx] = useState(null);
  const [editingMetaValue, setEditingMetaValue] = useState('');
  const editMetaRef = useRef(null);
  const newMetaValueRef = useRef(null);
  const newMetaKeyRef = useRef(null);
  const [showNewMeta, setShowNewMeta] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Resolve parent name when pre-populated from query param
  useEffect(() => {
    if (parentId) {
      getItem(parentId)
        .then((p) => setParentLabel(`${p.ident} — ${p.name || '(unnamed)'}`))
        .catch(() => setParentLabel(`ID ${parentId}`));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clone handler ───────────────────────────────────────────────
  const handleClone = async (selected) => {
    setClonePickerOpen(false);
    try {
      const full = await getItem(selected.id);
      setName(full.name || '');
      setDescription(full.description || '');
      setIsContainer(full.is_container);
      setMetaRows(
        (full.metadata || []).map((m) => ({ key: m.attribute_name, value: m.value || '' }))
      );
      setNewMetaKey('');
      setNewMetaValue('');
      toast('Fields copied from "' + (full.name || full.ident || 'Ghost') + '"');
    } catch (err) {
      toast(`Clone failed: ${err.message}`, 'error');
    }
  };
  // ── Template handler ───────────────────────────────────────────────────
  const handleTemplateSelect = async (selected) => {
    setTemplatePickerOpen(false);
    try {
      const full = await getTemplate(selected.id);
      setDescription(full.description || '');
      setIsContainer(full.is_container);
      setMetaRows(
        (full.metadata || []).map((m) => ({ key: m.attribute_name, value: m.value || '' }))
      );
      setNewMetaKey('');
      setNewMetaValue('');
      toast('Fields copied from template "' + (full.name || '(unnamed)') + '"');
    } catch (err) {
      toast(`Template load failed: ${err.message}`, 'error');
    }
  };
  // ── Metadata row helpers ────────────────────────────────────────
  const removeMetaRow = (idx) => {
    setMetaRows((prev) => prev.filter((_, i) => i !== idx));
    if (editingMetaIdx === idx) setEditingMetaIdx(null);
  };

  const startEditingMeta = (idx) => {
    setEditingMetaIdx(idx);
    setEditingMetaValue(metaRows[idx].value);
    setTimeout(() => editMetaRef.current?.focus(), 0);
  };

  const handleMetaEditBlur = () => {
    const idx = editingMetaIdx;
    setEditingMetaIdx(null);
    if (idx === null) return;
    setMetaRows((prev) => prev.map((r, i) => (i === idx ? { ...r, value: editingMetaValue } : r)));
  };

  const handleMetaEditKey = (e) => {
    if (e.key === 'Enter') e.target.blur();
    if (e.key === 'Escape') setEditingMetaIdx(null);
  };

  const handleNewMetaSave = () => {
    if (newMetaKey.trim() && newMetaValue.trim()) {
      setMetaRows((prev) => [...prev, { key: newMetaKey.trim(), value: newMetaValue.trim() }]);
      setNewMetaKey('');
      setNewMetaValue('');
      // Auto-open a fresh new-metadata row and focus the key input
      setShowNewMeta(true);
      setTimeout(() => newMetaKeyRef.current?.focus(), 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      setSaving(false);
      return;
    }
    try {
      const metadata = metaRows
        .filter((r) => r.key.trim())
        .map((r) => ({ key: r.key, value: r.value || null }));

      const data = {
        ident: ident || null,
        name: name.trim(),
        description: description || null,
        parent_id: parentId ? Number(parentId) : null,
        is_container: isContainer,
        metadata,
      };
      const item = await createItem(data);
      toast(`"${item.name || item.ident || 'Ghost'}" created`);
      navigate(item.ident ? `/ident/${item.ident}` : `/id/${item.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Add Item</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setClonePickerOpen(true)}
            className="flex items-center gap-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            <Icon path={mdiContentCopy} size={0.5} />
            Clone
          </button>
          <button
            type="button"
            onClick={() => setTemplatePickerOpen(true)}
            className="flex items-center gap-1 text-xs bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded hover:bg-teal-200 dark:hover:bg-teal-800 transition"
          >
            <Icon path={mdiContentDuplicate} size={0.5} />
            Template
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {saving ? 'Creating…' : '+ Add'}
          </button>
        </div>
      </div>

      <ItemPickerModal
        open={clonePickerOpen}
        onClose={() => setClonePickerOpen(false)}
        title="Clone from item"
        onSelect={handleClone}
      />

      <ItemPickerModal
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        title="Use template"
        onSelect={handleTemplateSelect}
        searchFn={searchTemplates}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Left column: core fields ──────────────────────── */}
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ident</span>
              <input
                type="text"
                value={ident}
                onChange={(e) => setIdent(e.target.value)}
                placeholder="Leave blank for a ghost"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Name <span className="text-red-400">*</span></span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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
          </div>

          {/* ── Right column: container & metadata ────────────── */}
          <div className="space-y-4">
            {/* Container selector */}
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Container</span>
              <div className="flex items-center gap-2">
                <div
                  onClick={() => setParentPickerOpen(true)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm text-gray-800 dark:text-gray-100 min-h-[2.25rem] flex items-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-400 transition"
                >
                  {parentLabel ? (
                    <span className="truncate">{parentLabel}</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">None (root level)</span>
                  )}
                </div>
                {parentId && (
                  <button
                    type="button"
                    onClick={() => { setParentId(''); setParentLabel(''); }}
                    className="text-xs text-red-500 hover:text-red-700 px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <ItemPickerModal
              open={parentPickerOpen}
              onClose={() => setParentPickerOpen(false)}
              title="Select parent container"
              filterFn={(item) => item.is_container}
              onSelect={(selected) => {
                setParentId(String(selected.id));
                setParentLabel(`${selected.ident} — ${selected.name || '(unnamed)'}`);
                setParentPickerOpen(false);
              }}
            />

            {/* Metadata */}
            <div className="space-y-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Metadata</span>
              {metaRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-36 text-sm font-medium text-gray-600 dark:text-gray-400 text-right truncate" title={row.key}>
                    {row.key}
                  </span>
                  {editingMetaIdx === idx ? (
                    <input
                      ref={editMetaRef}
                      type="text"
                      className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 border-b-2 border-blue-400 focus:outline-none px-1 py-0.5"
                      value={editingMetaValue}
                      onChange={(e) => setEditingMetaValue(e.target.value)}
                      onBlur={handleMetaEditBlur}
                      onKeyDown={handleMetaEditKey}
                    />
                  ) : (
                    <span
                      onClick={() => startEditingMeta(idx)}
                      className="flex-1 text-sm text-gray-800 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition px-1 py-0.5 min-h-[1.5em]"
                      title="Click to edit"
                    >
                      {row.value || <span className="text-gray-400 italic">empty</span>}
                    </span>
                  )}
                  {editingMetaIdx === idx ? (
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); removeMetaRow(idx); }}
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
              {showNewMeta ? (
                <div className="flex items-center gap-2">
                  <MetadataKeyInput
                    ref={newMetaKeyRef}
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
                    onBlur={handleNewMetaSave}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                    className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => { setShowNewMeta(false); setNewMetaKey(''); setNewMetaValue(''); }}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-500 dark:hover:text-gray-300"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setShowNewMeta(true); setTimeout(() => newMetaKeyRef.current?.focus(), 0); }}
                  className="text-xs text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition ml-1"
                >
                  + new
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </div>
  );
}
