import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getItem, getItemPath, updateItem, getSetting } from '../api';
import moment from 'moment';
import BreadcrumbNav from '../components/BreadcrumbNav';
import EAVEditor from '../components/EAVEditor';
import ItemPickerModal from '../components/ItemPickerModal';
import ConfirmModal from '../components/ConfirmModal';
import QRCodeStyled from '../components/QRCodeStyled';
import { useToast } from '../components/Toast';
import useDocTitle from '../hooks/useDocTitle';

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  // Click-to-edit state
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const nameInputRef = useRef(null);
  const descInputRef = useRef(null);
  const detailsBoxRef = useRef(null);
  const [detailsBoxHeight, setDetailsBoxHeight] = useState(148);

  // Modal state
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([getItem(id), getItemPath(id)])
      .then(([itemData, pathData]) => {
        setItem(itemData);
        setBreadcrumbs(pathData);
        setEditName(itemData.name || '');
        setEditDescription(itemData.description || '');
        setEditingName(false);
        setEditingDesc(false);
      })
      .catch((err) => {
        if (err.message === 'Not Found' || err.message?.includes('not found')) {
          navigate('/404', { replace: true });
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  // Load base_url setting for external link
  useEffect(() => {
    getSetting('base_url')
      .then((s) => setBaseUrl(s.value || ''))
      .catch(() => {});
  }, []);

  // Track details box height so QR code matches
  useEffect(() => {
    const el = detailsBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDetailsBoxHeight(entry.target.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [item]);

  // Document title
  useDocTitle(item ? (item.name || item.ident) : undefined);

  // ── Inline field save helpers ────────────────────────────────────
  const saveField = async (field, value) => {
    try {
      await updateItem(item.id, { [field]: value || null });
      toast('Saved');
      reload();
    } catch (err) {
      toast(`Failed to save: ${err.message}`, 'error');
    }
  };

  const handleNameClick = () => {
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };
  const handleNameBlur = () => {
    setEditingName(false);
    if (editName !== (item.name || '')) saveField('name', editName);
  };
  const handleNameKey = (e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setEditName(item.name || ''); setEditingName(false); } };

  const handleDescClick = () => {
    setEditingDesc(true);
    setTimeout(() => descInputRef.current?.focus(), 0);
  };
  const handleDescBlur = () => {
    setEditingDesc(false);
    if (editDescription !== (item.description || '')) saveField('description', editDescription);
  };
  const handleDescKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) e.target.blur(); if (e.key === 'Escape') { setEditDescription(item.description || ''); setEditingDesc(false); } };

  // ── Convert container ↔ item ─────────────────────────────────────
  const handleConvert = async () => {
    setConfirmConvert(false);
    const newVal = !item.is_container;
    try {
      await updateItem(item.id, { is_container: newVal });
      toast(newVal ? 'Converted to container' : 'Converted to item');
      reload();
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
    }
  };

  const canConvertToItem = item?.is_container && item.children.length === 0;
  const hasChildren = item?.is_container && item.children.length > 0;

  // ── Move: move THIS item into the selected container ─────────────
  const handleMoveToContainer = async (targetContainer) => {
    try {
      await updateItem(item.id, { parent_id: targetContainer.id });
      toast(`Moved to "${targetContainer.name || targetContainer.ident}"`);
      reload();
    } catch (err) {
      toast(`Failed to move: ${err.message}`, 'error');
    }
  };

  // ── Add: move the selected item INTO this container ──────────────
  const handleAddItemHere = async (targetItem) => {
    try {
      await updateItem(targetItem.id, { parent_id: item.id });
      toast(`"${targetItem.name || targetItem.ident}" added to this container`);
      reload();
    } catch (err) {
      toast(`Failed to add: ${err.message}`, 'error');
    }
  };

  if (loading) return <p className="p-6 text-gray-400">Loading…</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;
  if (!item) return <p className="p-6 text-gray-400">Item not found.</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <BreadcrumbNav segments={breadcrumbs} />

      {/* ────────── Header + QR code row ────────── */}
      <div className="flex gap-4 items-stretch">
        {/* ────────── Header (details box) ────────── */}
        <div ref={detailsBoxRef} className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded shadow p-5 flex flex-col">
        {/* Top row: name/description left, ident/address/timestamp right (stacks on mobile) */}
        <div className="flex flex-col md:flex-row md:gap-6">
          {/* Left: name + description */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Click-to-edit name */}
            {editingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKey}
                className="text-2xl font-bold text-gray-800 dark:text-gray-100 bg-transparent border-b-2 border-blue-400 focus:outline-none w-full"
              />
            ) : (
              <h1
                onClick={handleNameClick}
                className="text-2xl font-bold text-gray-800 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
                title="Click to edit"
              >
                {item.name || <span className="text-gray-400 italic">Add a name…</span>}
              </h1>
            )}

            {/* Click-to-edit description */}
            <div className="h-[4rem] overflow-hidden">
              {editingDesc ? (
                <textarea
                  ref={descInputRef}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onBlur={handleDescBlur}
                  onKeyDown={handleDescKey}
                  className="w-full h-full text-sm text-gray-600 dark:text-gray-300 bg-transparent border-b-2 border-blue-400 focus:outline-none resize-none overflow-y-auto scrollbar-hidden"
                />
              ) : (
                <p
                  onClick={handleDescClick}
                  className="text-gray-600 dark:text-gray-300 text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition h-full overflow-y-auto whitespace-pre-wrap scrollbar-hidden"
                  title="Click to edit"
                >
                  {item.description || <span className="text-gray-400 italic">Add a description…</span>}
                </p>
              )}
            </div>
          </div>

          {/* Right: ident + URL + address + last updated */}
          <div className="flex flex-col items-start md:items-end gap-1 shrink-0 mt-2 md:mt-0">
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{item.ident}</span>
            {baseUrl && (
              <a
                href={`${baseUrl.replace(/\/$/, '')}/-/${item.ident}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-gray-400 dark:text-gray-500 no-underline hover:underline truncate max-w-[18rem]"
                title={`${baseUrl.replace(/\/$/, '')}/-/${item.ident}`}
              >
                {`${baseUrl.replace(/\/$/, '')}/-/${item.ident}`}
              </a>
            )}
            <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
              {(() => {
                const parts = item.address.split('.');
                if (parts.length <= 1) return <span className="underline decoration-gray-400">{item.address}</span>;
                return (
                  <>
                    {parts.slice(0, -1).join('.')}.<span className="underline decoration-gray-400">{parts[parts.length - 1]}</span>
                  </>
                );
              })()}
            </span>
            {item.last_updated && (
              <span className="text-xs text-gray-400 dark:text-gray-500" title={new Date(item.last_updated).toLocaleString()}>
                {moment(item.last_updated).fromNow()}
              </span>
            )}
          </div>
        </div>

        {/* push action row to bottom */}
        <div className="flex-1" />

        {/* Container tag + action buttons */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            {item.is_container && (
              <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                container
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMoveModalOpen(true)}
              className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 transition">
              Move
            </button>
            {item.is_container ? (
              <button
                onClick={canConvertToItem ? () => setConfirmConvert(true) : undefined}
                disabled={hasChildren}
                title={hasChildren ? 'Remove all items from this container first' : 'Convert to item'}
                className={`text-xs px-2 py-0.5 rounded transition ${
                  hasChildren
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300'
                }`}
              >
                Convert to item
              </button>
            ) : (
              <button
                onClick={() => setConfirmConvert(true)}
                className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 transition"
              >
                Convert to container
              </button>
            )}
          </div>
        </div>
      </div>

        {/* QR code (outside details box, hidden on mobile) */}
        {baseUrl && (
          <div className="shrink-0 self-stretch hidden md:block">
            <QRCodeStyled
              data={`${baseUrl.replace(/\/$/, '')}/-/${item.ident}`}
              displaySize={detailsBoxHeight}
            />
          </div>
        )}
      </div>

      {/* ────────── Two-column body ────────── */}
      <div className={`grid gap-4 ${item.is_container ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Left column: Metadata */}
        <div className="bg-white dark:bg-gray-800 rounded shadow p-5">
          <EAVEditor itemId={item.id} existingValues={item.metadata} onSaved={reload} />
        </div>

        {/* Right column: Contents (only for containers) */}
        {item.is_container && (
          <div className="bg-white dark:bg-gray-800 rounded shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Contents</h2>
              <button
                onClick={() => setAddModalOpen(true)}
                className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700 transition"
              >
                + Add
              </button>
            </div>

            {item.children.length === 0 ? (
              <p className="text-gray-400 italic text-sm">No items inside this container.</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...item.children].sort((a, b) => (b.is_container ? 1 : 0) - (a.is_container ? 1 : 0)).map((child) => (
                  <li key={child.id}>
                    <Link
                      to={`/ident/${child.ident}`}
                      className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition text-sm"
                    >
                      <div>
                        <span className="font-mono text-gray-500 dark:text-gray-400 mr-2">{child.ident}</span>
                        <span className="text-gray-800 dark:text-gray-100">{child.name || '(unnamed)'}</span>
                      </div>
                      {child.is_container && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                          container
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ────────── Move modal (move THIS item into a container) ────────── */}
      <ItemPickerModal
        open={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        onSelect={handleMoveToContainer}
        title="Move this item into…"
        filterFn={(r) => r.is_container && r.id !== item.id}
        createUrl={`/new?parent=${item.id}`}
        createLabel="+ Create new container"
      />

      {/* ────────── Add modal (add an item to THIS container) ────────── */}
      <ItemPickerModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSelect={handleAddItemHere}
        title="Add item to this container"
        filterFn={(r) => r.id !== item.id}
        createUrl={`/new?parent=${item.id}`}
        createLabel="+ Create new item"
      />

      {/* ────────── Confirm convert modal ────────── */}
      <ConfirmModal
        open={confirmConvert}
        title={item.is_container ? 'Convert to item?' : 'Convert to container?'}
        message={item.is_container
          ? 'This will remove the container designation. The item will no longer be able to hold other items.'
          : 'This will allow the item to hold other items inside it.'}
        confirmLabel={item.is_container ? 'Convert to item' : 'Convert to container'}
        onConfirm={handleConvert}
        onCancel={() => setConfirmConvert(false)}
        variant="warning"
      />
    </div>
  );
}
