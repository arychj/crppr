import { Link } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiGhostOutline, mdiHomeExportOutline, mdiPackageVariant } from '@mdi/js';

export default function ItemTree({ children = [], parentId }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-700">Contents</h2>
        {parentId && (
          <Link
            to={`/new?parent=${parentId}`}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
          >
            + Add Item
          </Link>
        )}
      </div>

      {children.length === 0 ? (
        <p className="text-gray-400 italic">No items inside this container.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {children.map((child) => (
            <li key={child.id}>
              <Link
                to={child.ident ? `/ident/${child.ident}` : `/id/${child.id}`}
                className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded transition"
              >
                <div>
                  <span className="font-mono text-sm text-gray-500 mr-2">
                    {child.ident || <span title="Ghost — this item has no ident"><Icon path={mdiGhostOutline} size={0.6} className="inline" /></span>}
                  </span>
                  <span className="text-gray-800">
                    {child.name || '(unnamed)'}
                  </span>
                </div>
                {child.is_container && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Icon path={mdiPackageVariant} size={0.5} />
                    <span className="hidden sm:inline">container</span>
                  </span>
                )}
                {child.is_checked_out && (
                  <Icon path={mdiHomeExportOutline} size={0.7} className="text-amber-500" title="Checked out" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
