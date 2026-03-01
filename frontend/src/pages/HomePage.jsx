import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSetting, recentItems } from '../api';
import SearchBar from '../components/SearchBar';
import QRScanner from '../components/QRScanner';
import useDocTitle from '../hooks/useDocTitle';
import logo from '../assets/crppr.svg';
import Icon from '@mdi/react';
import { mdiPlus, mdiQrcodeScan, mdiPackageVariantClosed, mdiGhostOutline } from '@mdi/js';

export default function HomePage() {
  const [tagline, setTagline] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMatched, setScanMatched] = useState(null);
  const [recent, setRecent] = useState([]);
  useDocTitle();

  useEffect(() => {
    getSetting('tagline')
      .then((s) => setTagline(s.value || ''))
      .catch(() => setTagline('a place for all your crap'));
    recentItems()
      .then(setRecent)
      .catch(() => setRecent([]));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-center">
        <img src={logo} alt="crppr" className="h-48 dark:invert" />
      </div>
      {tagline && (
        <p className="text-center text-2xl text-gray-500 dark:text-gray-400 italic">{tagline}</p>
      )}

      <SearchBar placeholder="Search by name, ident, description, or metadata…" />

      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Add Item */}
        <Link
          to="/new"
          className="flex flex-col items-center justify-center aspect-square bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg hover:scale-[1.02] transition p-6 text-center"
        >
          <Icon path={mdiPlus} size={1.8} className="mb-3 text-gray-700 dark:text-gray-300" />
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create a new item</span>
        </Link>

        {/* Scan Code — opens modal */}
        <button
          onClick={() => setScanOpen(true)}
          className="flex flex-col items-center justify-center aspect-square bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg hover:scale-[1.02] transition p-6 text-center"
        >
          <Icon path={mdiQrcodeScan} size={1.8} className="mb-3 text-gray-700 dark:text-gray-300" />
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">Scan</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lookup item by QR code</span>
        </button>

        {/* Browse Inventory */}
        <Link
          to="/inventory"
          className="flex flex-col items-center justify-center aspect-square bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg hover:scale-[1.02] transition p-6 text-center"
        >
          <Icon path={mdiPackageVariantClosed} size={1.8} className="mb-3 text-gray-700 dark:text-gray-300" />
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">Browse</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Explore the inventory tree</span>
        </Link>
      </div>

      {/* Recent Items */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Recent Items</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow divide-y divide-gray-100 dark:divide-gray-700">
            {recent.map((item) => (
              <Link
                key={item.id}
                to={item.ident ? `/ident/${item.ident}` : `/id/${item.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-sm"
              >
                <div className="min-w-0 flex-1 flex items-center">
                  <span className="font-mono text-gray-500 dark:text-gray-400 mr-3 w-14 text-right inline-block flex-shrink-0">{item.ident || <span title="Ghost — this item has no ident"><Icon path={mdiGhostOutline} size={0.6} className="inline" /></span>}</span>
                  <span className="text-gray-800 dark:text-gray-100 truncate">{item.name || '(unnamed)'}</span>
                </div>
                {item.is_container && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                    container
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setScanOpen(false)}>
          <div className={`rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 transition-colors duration-300 ${scanMatched === 'match' ? 'bg-green-500 dark:bg-green-600' : scanMatched === 'no-match' ? 'bg-amber-500 dark:bg-amber-600' : 'bg-white dark:bg-gray-800'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold transition-colors duration-300 ${scanMatched ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>Scan Code</h2>
              <button
                onClick={() => { setScanOpen(false); setScanMatched(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                ✕
              </button>
            </div>
            <QRScanner autoStart onClose={() => { setScanOpen(false); setScanMatched(null); }} onMatch={(type) => setScanMatched(type)} />
          </div>
        </div>
      )}
    </div>
  );
}
