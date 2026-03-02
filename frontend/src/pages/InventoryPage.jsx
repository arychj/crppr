import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listRootItems, getItem } from '../api';
import Icon from '@mdi/react';
import { mdiGhostOutline, mdiHomeExportOutline, mdiPackageVariant } from '@mdi/js';
import useDocTitle from '../hooks/useDocTitle';

function TreeNode({ item, level = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!item.is_container) return;
    if (expanded) { setExpanded(false); return; }
    if (children === null) {
      setLoading(true);
      try {
        const full = await getItem(item.id);
        setChildren(full.children || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(true);
  };

  return (
    <>
      <div
        onClick={item.is_container ? toggleExpand : undefined}
        className={`flex items-center py-2.5 px-3 border-b border-gray-100 dark:border-gray-700 text-sm ${
          item.is_container ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''
        }`}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
      >
        <span className="w-8 text-center text-xl text-gray-400 dark:text-gray-500 flex-shrink-0">
          {item.is_container ? (loading ? '…' : expanded ? '▾' : '▸') : ''}
        </span>
        <Link
          to={item.ident ? `/ident/${item.ident}` : `/id/${item.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition min-w-0"
        >
          <span className="font-mono text-gray-500 dark:text-gray-400 flex-shrink-0">{item.ident || <span title="Ghost — this item has no ident"><Icon path={mdiGhostOutline} size={0.6} className="inline" /></span>}</span>
          <span className="text-gray-800 dark:text-gray-100 truncate">{item.name || '(unnamed)'}</span>
        </Link>
        {item.is_container && (
          <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
            <Icon path={mdiPackageVariant} size={0.5} />
            <span className="hidden sm:inline">container</span>
          </span>
        )}
        {item.is_checked_out && (
          <Icon path={mdiHomeExportOutline} size={0.7} className={`${item.is_container ? 'ml-2' : 'ml-auto'} text-amber-500 flex-shrink-0`} title="Checked out" />
        )}
      </div>
      {expanded && children?.map((child) => (
        <TreeNode key={child.id} item={child} level={level + 1} />
      ))}
    </>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useDocTitle('Inventory');

  useEffect(() => {
    listRootItems()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Inventory</h1>
        <Link
          to="/new"
          className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700 transition"
        >
          + Add
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded shadow">
        {loading ? (
          <p className="p-4 text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-gray-400 italic">No items yet. Create your first one!</p>
        ) : (
          items.map((item) => <TreeNode key={item.id} item={item} level={0} />)
        )}
      </div>
    </div>
  );
}
