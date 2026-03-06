import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getTemplate, updateTemplate, deleteTemplate, setTemplateMetadata, deleteTemplateMetadata } from '../api';
import Icon from '@mdi/react';
import { mdiFileDocumentOutline, mdiTrashCanOutline } from '@mdi/js';
import EAVEditor from '../components/EAVEditor';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import useDocTitle from '../hooks/useDocTitle';

export default function TemplateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const nameInputRef = useRef(null);
  const descInputRef = useRef(null);

  const [confirmDelete, setConfirmDelete] = useState(false);

  useDocTitle(item ? `Template: ${item.name || '(unnamed)'}` : 'Template');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');
    getTemplate(id)
      .then((data) => {
        setItem(data);
        setEditName(data.name || '');
        setEditDescription(data.description || '');
        setEditingName(false);
        setEditingDesc(false);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  const saveName = async () => {
    setEditingName(false);
    if (!editName.trim()) {
      setEditName(item.name || '');
      toast('Name is required', 'error');
      return;
    }
    if (editName === (item.name || '')) return;
    try {
      const updated = await updateTemplate(item.id, { name: editName.trim() });
      setItem(updated);
      toast('Name saved');
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
      setEditName(item.name || '');
    }
  };

  const saveDescription = async () => {
    setEditingDesc(false);
    if (editDescription === (item.description || '')) return;
    try {
      const updated = await updateTemplate(item.id, { description: editDescription || null });
      setItem(updated);
      toast('Description saved');
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
      setEditDescription(item.description || '');
    }
  };

  const saveContainer = async () => {
    try {
      const updated = await updateTemplate(item.id, { is_container: !item.is_container });
      setItem(updated);
      toast(`Now a ${updated.is_container ? 'container' : 'item'} template`);
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTemplate(item.id);
      toast('Template deleted');
      navigate('/settings');
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
    }
  };

  if (loading) return <p className="text-gray-400 p-4">Loading…</p>;
  if (error) return <p className="text-red-500 p-4">{error}</p>;
  if (!item) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon path={mdiFileDocumentOutline} size={1} className="text-teal-500" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex-1">
          {editingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setEditName(item.name || ''); setEditingName(false); } }}
              className="w-full bg-transparent text-2xl font-bold border-b-2 border-blue-400 focus:outline-none text-gray-800 dark:text-gray-100"
            />
          ) : (
            <span
              onClick={() => { setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 0); }}
              className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              {item.name || <span className="text-gray-400 italic">(unnamed template)</span>}
            </span>
          )}
        </h1>
        <span className="text-xs bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 px-2 py-0.5 rounded-full">
          template
        </span>
        <button
          onClick={() => setConfirmDelete(true)}
          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition"
          title="Delete template"
        >
          <Icon path={mdiTrashCanOutline} size={0.8} />
        </button>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete Template"
        message={`Delete template "${item.name || '(unnamed)'}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column — details */}
        <div className="bg-white dark:bg-gray-800 rounded shadow p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Details</h2>

          {/* Description */}
          <div className="space-y-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Description</span>
            {editingDesc ? (
              <textarea
                ref={descInputRef}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onBlur={saveDescription}
                onKeyDown={(e) => { if (e.key === 'Escape') { setEditDescription(item.description || ''); setEditingDesc(false); } }}
                rows={3}
                className="w-full bg-transparent text-sm border-b-2 border-blue-400 focus:outline-none text-gray-800 dark:text-gray-100 resize-none"
              />
            ) : (
              <p
                onClick={() => { setEditingDesc(true); setTimeout(() => descInputRef.current?.focus(), 0); }}
                className="text-sm text-gray-800 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition min-h-[1.5em] whitespace-pre-wrap"
              >
                {item.description || <span className="text-gray-400 italic">No description</span>}
              </p>
            )}
          </div>

          {/* Container toggle */}
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium transition ${!item.is_container ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>Item</span>
            <button
              type="button"
              role="switch"
              aria-checked={item.is_container}
              onClick={saveContainer}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                item.is_container ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  item.is_container ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition ${item.is_container ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>Container</span>
          </div>
        </div>

        {/* Right column — metadata */}
        <div className="bg-white dark:bg-gray-800 rounded shadow p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Metadata</h2>
          <EAVEditor
            itemId={item.id}
            existingValues={item.metadata}
            onSaved={reload}
            setMetadataFn={setTemplateMetadata}
            deleteMetadataFn={deleteTemplateMetadata}
          />
        </div>
      </div>
    </div>
  );
}
