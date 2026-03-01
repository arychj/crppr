import { useEffect, useState, useRef } from 'react';
import { listMetadataAttributes, createMetadataAttribute, reorderMetadataAttributes, deleteMetadataAttribute } from '../api';
import { useToast } from '../components/Toast';
import useDocTitle from '../hooks/useDocTitle';

export default function MetadataPage() {
  const [attrs, setAttrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('text');
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  useDocTitle('Metadata Keys');

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  useEffect(() => {
    loadAttrs();
  }, []);

  const loadAttrs = () => {
    listMetadataAttributes()
      .then(setAttrs)
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const attr = await createMetadataAttribute({ name, datatype: newType });
      setAttrs((prev) => [...prev, attr]);
      setNewName('');
      setNewType('text');
      toast(`Added "${name}"`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (attr) => {
    if (!confirm(`Delete "${attr.name}" and all its values from every item?`)) return;
    try {
      await deleteMetadataAttribute(attr.id);
      setAttrs((prev) => prev.filter((a) => a.id !== attr.id));
      toast(`Deleted "${attr.name}"`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // ── Drag handlers ────────────────────────────────────────────────

  const handleDragStart = (idx) => {
    dragItem.current = idx;
  };

  const handleDragEnter = (idx) => {
    dragOverItem.current = idx;
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    const reordered = [...attrs];
    const [moved] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, moved);
    dragItem.current = null;
    dragOverItem.current = null;
    setAttrs(reordered);
    try {
      await reorderMetadataAttributes(reordered.map((a) => a.id));
    } catch (err) {
      toast(err.message, 'error');
      loadAttrs(); // rollback
    }
  };

  // ── Render ───────────────────────────────────────────────────────

  const datatypeLabels = { text: 'Text', number: 'Number', date: 'Date', boolean: 'Boolean' };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Metadata Keys</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Drag rows to reorder. This order is used when displaying metadata on items.
      </p>

      <div className="bg-white dark:bg-gray-800 rounded shadow">
        {loading ? (
          <p className="p-4 text-gray-400">Loading…</p>
        ) : attrs.length === 0 ? (
          <p className="p-4 text-gray-400 italic">No metadata keys defined yet.</p>
        ) : (
          <ul>
            {attrs.map((attr, idx) => (
              <li
                key={attr.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:bg-gray-50 dark:hover:bg-gray-700/50 select-none"
              >
                <span className="text-gray-300 dark:text-gray-600 text-lg flex-shrink-0">⠿</span>
                <span className="font-medium text-gray-800 dark:text-gray-100 flex-1 min-w-0 truncate">{attr.name}</span>
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded flex-shrink-0">
                  {datatypeLabels[attr.datatype] || attr.datatype}
                </span>
                <button
                  onClick={() => handleDelete(attr)}
                  className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition text-sm flex-shrink-0"
                  title="Delete attribute"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Inline add — empty row at the bottom */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <span className="text-gray-300 dark:text-gray-600 text-lg flex-shrink-0 invisible">⠿</span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="New key name…"
            className="flex-1 min-w-0 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex-shrink-0"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="boolean">Boolean</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-30 transition text-sm flex-shrink-0 font-medium"
            title="Add attribute"
          >
            ↵
          </button>
        </div>
      </div>
    </div>
  );
}
