import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import SideMenu from '../components/SideMenu';
import { useDrawer } from '../hooks/useDrawer';
import QRScanner from '../components/QRScanner';
import Icon from '@mdi/react';
import { mdiMenu, mdiPlus, mdiQrcodeScan, mdiFileTreeOutline, mdiClose } from '@mdi/js';

/**
 * Top-level layout: collapsible side menu that pushes content.
 * On mobile: bottom nav bar with hamburger, scan, add, browse.
 */
export default function Layout() {
  const { open, setDrawerOpen } = useDrawer();
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMatched, setScanMatched] = useState(null);

  return (
    <>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <SideMenu />

        <main
          className={`transition-[margin] duration-200 ease-in-out pr-4 pt-4 max-md:pt-[max(1rem,env(safe-area-inset-top))] pb-8 max-md:pb-20 ${
            open ? 'md:ml-80 pl-4' : 'md:ml-12 pl-4'
          } max-md:ml-0`}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-around py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <button onClick={() => setDrawerOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-600 dark:text-gray-300">
          <Icon path={mdiMenu} size={1} />
          <span className="text-[10px]">Menu</span>
        </button>
        <Link to="/new" className="flex flex-col items-center gap-0.5 text-gray-600 dark:text-gray-300">
          <Icon path={mdiPlus} size={1} />
          <span className="text-[10px]">Add</span>
        </Link>
        <button onClick={() => setScanOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-600 dark:text-gray-300">
          <Icon path={mdiQrcodeScan} size={1} />
          <span className="text-[10px]">Scan</span>
        </button>
        <Link to="/inventory" className="flex flex-col items-center gap-0.5 text-gray-600 dark:text-gray-300">
          <Icon path={mdiFileTreeOutline} size={1} />
          <span className="text-[10px]">Browse</span>
        </Link>
      </nav>

      {/* Mobile scan modal (from bottom nav) */}
      {scanOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setScanOpen(false)}>
          <div className={`rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 transition-colors duration-300 ${scanMatched === 'match' ? 'bg-green-500 dark:bg-green-600' : scanMatched === 'no-match' ? 'bg-amber-500 dark:bg-amber-600' : 'bg-white dark:bg-gray-800'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold transition-colors duration-300 ${scanMatched ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>Scan Code</h2>
              <button
                onClick={() => { setScanOpen(false); setScanMatched(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <Icon path={mdiClose} size={0.85} />
              </button>
            </div>
            <QRScanner autoStart onClose={() => { setScanOpen(false); setScanMatched(null); }} onMatch={(type) => setScanMatched(type)} />
          </div>
        </div>
      )}
    </>
  );
}
