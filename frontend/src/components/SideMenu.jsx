import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { searchItems } from '../api';
import { useTheme } from '../hooks/useTheme';
import { useDrawer } from '../hooks/useDrawer';
import QRScanner from './QRScanner';
import logo from '../assets/crppr.svg';
import Icon from '@mdi/react';
import {
  mdiDockLeft,
  mdiDockRight,
  mdiQrcodeScan,
  mdiPlus,
  mdiHistory,
  mdiPackageVariantClosed,
  mdiFileTreeOutline,
  mdiTag,
  mdiSimOutline,
  mdiExport,
  mdiTrayArrowDown,
  mdiSwapHorizontal,
  mdiWeatherSunny,
  mdiWeatherNight,
  mdiFileArrowUpDownOutline,
  mdiCog,
  mdiClose,
  mdiHomeExportOutline,
  mdiChartDonut,
  mdiGhostOutline,
  mdiPackageVariant,
} from '@mdi/js';

export default function SideMenu() {
  const { open, toggle, setDrawerOpen } = useDrawer();
  const location = useLocation();
  const navigate = useNavigate();
  const { dark, toggle: toggleTheme } = useTheme();

  // Collapsed logo hover state
  const [logoHover, setLogoHover] = useState(false);

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(null);
  const searchRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowResults(false); return; }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchItems(query.trim())
        .then((data) => { setResults(data); setShowResults(true); })
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close results on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleResultClick = (item) => {
    navigate(item.ident ? `/ident/${item.ident}` : `/id/${item.id}`);
    setQuery('');
    setShowResults(false);
  };

  const [scanOpen, setScanOpen] = useState(false);
  const [scanMatched, setScanMatched] = useState(null);

  const navLinks = [
    { to: '/new', label: 'Add', icon: mdiPlus },
    { to: '/checkout', label: 'Check In / Out', icon: mdiSwapHorizontal },
    { to: '/move', label: 'Move', icon: mdiTrayArrowDown },
    { to: '/', label: 'Recents', icon: mdiHistory },
    { to: '/inventory', label: 'Browse', icon: mdiFileTreeOutline },
    { to: '/metadata', label: 'Metadata', icon: mdiTag },
    { to: '/ident', label: 'Labels', icon: mdiSimOutline },
    { to: '/import-export', label: 'Backups', icon: mdiFileArrowUpDownOutline },
    { to: '/stats', label: 'Stats', icon: mdiChartDonut },
  ];

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (open && window.innerWidth < 768) {
      setDrawerOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      {/* Backdrop overlay — mobile only, visible when sidebar is open */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile when closed; icon rail on desktop when closed */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-200 ease-in-out flex flex-col pt-[env(safe-area-inset-top)] ${
          open ? 'w-80' : 'w-12 max-md:-translate-x-full'
        }`}
      >
        {/* ── Expanded header: search + add ── */}
        {open ? (
          <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700" ref={searchRef}>
            <Link to="/" className="flex-shrink-0 flex items-center justify-center w-6">
              <img src={logo} alt="crppr" className="h-6 dark:invert" />
            </Link>
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setShowResults(true)}
                placeholder="Search items…"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
              {searching && <span className="absolute right-2 top-1.5 text-xs text-gray-400">…</span>}

              {showResults && results.length > 0 && (
                <ul className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => handleResultClick(r)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition flex items-center justify-between"
                      >
                        <div className="flex items-center min-w-0 flex-1">
                          <span className="font-mono text-gray-500 dark:text-gray-400 mr-1 flex-shrink-0">{r.ident || <span title="Ghost"><Icon path={mdiGhostOutline} size={0.6} className="inline" /></span>}</span>
                          <span className="text-gray-800 dark:text-gray-100 truncate">{r.name || '(unnamed)'}</span>
                        </div>
                        <div className="flex items-center flex-shrink-0">
                          {r.is_container && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-1.5 py-0.5 rounded-full flex items-center gap-1 ml-2">
                              <Icon path={mdiPackageVariant} size={0.5} />
                              <span className="hidden sm:inline">container</span>
                            </span>
                          )}
                          {r.is_checked_out && (
                            <Icon path={mdiHomeExportOutline} size={0.6} className="ml-2 text-amber-500 flex-shrink-0" title="Checked out" />
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showResults && query.trim() && results.length === 0 && !searching && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
                  No results
                </div>
              )}
            </div>

            <button
              onClick={() => setScanOpen(true)}
              className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Scan Code"
            >
              <Icon path={mdiQrcodeScan} size={0.85} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        ) : (
          /* ── Collapsed header: logo / open toggle ── */
          <div
            className="flex items-center justify-center p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
            onClick={() => { setLogoHover(false); toggle(); }}
            onMouseEnter={() => setLogoHover(true)}
            onMouseLeave={() => setLogoHover(false)}
            title="Expand menu"
          >
            <div className="flex items-center justify-center h-6 w-6">
              {logoHover ? (
                <Icon path={mdiDockRight} size={0.75} className="text-gray-500 dark:text-gray-400" />
              ) : (
                <img src={logo} alt="crppr" className="h-6 dark:invert" />
              )}
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className={`flex-1 space-y-1 ${open ? 'px-3' : 'px-1'}`}>
          {navLinks.map((link) => {
            const active = link.to === '/'
              ? location.pathname === '/'
              : location.pathname === link.to || location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                title={link.label}
                className={`flex items-center gap-3 py-2 rounded-lg text-sm transition ${
                  open ? 'px-3' : 'justify-center px-0'
                } ${
                  active
                    ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon path={link.icon} size={0.85} className="flex-shrink-0" />
                {open && link.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: dark-mode toggle + settings */}
        <div className={`border-t border-gray-200 dark:border-gray-700 p-3 space-y-1 ${open ? '' : 'px-1'}`}>
          {/* Dark / Light toggle */}
          <button
            onClick={toggleTheme}
            title={dark ? 'Light mode' : 'Dark mode'}
            className={`flex items-center gap-3 w-full py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
              open ? 'px-3' : 'justify-center px-0'
            }`}
          >
            <Icon path={dark ? mdiWeatherSunny : mdiWeatherNight} size={0.85} className="flex-shrink-0" />
            {open && (dark ? 'Light mode' : 'Dark mode')}
          </button>

          {/* Settings */}
          <Link
            to="/settings"
            title="Settings"
            className={`flex items-center gap-3 py-2 rounded-lg text-sm transition ${
              open ? 'px-3' : 'justify-center px-0'
            } ${
              location.pathname === '/settings'
                ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Icon path={mdiCog} size={0.85} className="flex-shrink-0" />
            {open && 'Settings'}
          </Link>
        </div>
      </aside>

      {/* Toggle button — only shown when sidebar is open */}
      {open && (
        <button
          onClick={toggle}
          className="fixed top-3 z-50 hidden md:flex items-center justify-center w-7 h-7 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 ease-in-out left-[20.25rem]"
          style={{ top: 'calc(0.75rem + env(safe-area-inset-top))' }}
          aria-label="Collapse menu"
        >
          <Icon path={mdiDockLeft} size={0.75} className="text-gray-500 dark:text-gray-400" />
        </button>
      )}

      {/* QR Scanner Modal */}
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
