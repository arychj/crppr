import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { searchItems, lookupByIdent, moveItem, listSettings } from '../api';
import { useToast } from '../components/Toast';
import useDocTitle from '../hooks/useDocTitle';
import Icon from '@mdi/react';
import { mdiQrcodeScan, mdiClose, mdiArrowDownBold, mdiHomeExportOutline, mdiPackageVariant } from '@mdi/js';

const READER_ID = 'move-qr-reader';

export default function MovePage() {
  useDocTitle('Move Item');
  const toast = useToast();
  const navigate = useNavigate();

  // Field state
  const [itemQuery, setItemQuery] = useState('');
  const [itemResults, setItemResults] = useState([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [showItemResults, setShowItemResults] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);   // { id, ident, name, is_container }

  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState([]);
  const [destLoading, setDestLoading] = useState(false);
  const [showDestResults, setShowDestResults] = useState(false);
  const [selectedDest, setSelectedDest] = useState(null);

  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');

  // Confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  // QR scanner state
  const [scanOpen, setScanOpen] = useState(false);
  const [scanStep, setScanStep] = useState(0); // 0 = not scanning, 1 = scan item, 2 = scan dest
  const [scanStatus, setScanStatus] = useState('');
  const scannerRef = useRef(null);
  const matchedRef = useRef(false);
  const handleDecodeRef = useRef(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [allowedUris, setAllowedUris] = useState([]);

  // Debounce refs
  const itemDebounce = useRef(null);
  const destDebounce = useRef(null);
  const itemSearchRef = useRef(null);
  const destSearchRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (itemSearchRef.current && !itemSearchRef.current.contains(e.target)) setShowItemResults(false);
      if (destSearchRef.current && !destSearchRef.current.contains(e.target)) setShowDestResults(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load scanner settings
  useEffect(() => {
    listSettings()
      .then((settings) => {
        const map = Object.fromEntries(settings.map((s) => [s.key, s.value || '']));
        setBaseUrl(map.base_url || '');
        try { setAllowedUris(JSON.parse(map.allowed_uris || '[]')); } catch { setAllowedUris([]); }
      })
      .catch(() => {});
  }, []);

  // ── Search helpers ──────────────────────────────────────────────
  const doSearch = (query, setResults, setLoading, setShow) => {
    if (!query.trim()) { setResults([]); setShow(false); return; }
    setLoading(true);
    searchItems(query.trim())
      .then((data) => { setResults(data); setShow(true); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    clearTimeout(itemDebounce.current);
    if (selectedItem) return; // skip search when item already selected
    if (!itemQuery.trim()) { setItemResults([]); setShowItemResults(false); return; }
    itemDebounce.current = setTimeout(() => doSearch(itemQuery, setItemResults, setItemLoading, setShowItemResults), 250);
    return () => clearTimeout(itemDebounce.current);
  }, [itemQuery]);

  useEffect(() => {
    clearTimeout(destDebounce.current);
    if (selectedDest) return; // skip search when dest already selected
    if (!destQuery.trim()) { setDestResults([]); setShowDestResults(false); return; }
    destDebounce.current = setTimeout(() => doSearch(destQuery, setDestResults, setDestLoading, setShowDestResults), 250);
    return () => clearTimeout(destDebounce.current);
  }, [destQuery]);

  // ── Selection handlers ──────────────────────────────────────────
  const selectItem = (item) => {
    setSelectedItem(item);
    setItemQuery(item.ident ? `${item.ident} — ${item.name || '(unnamed)'}` : item.name || '(unnamed)');
    setShowItemResults(false);
    setItemResults([]);
  };

  const selectDest = (item) => {
    if (!item.is_container) {
      toast('Destination must be a container', 'error');
      return;
    }
    setSelectedDest(item);
    setDestQuery(item.ident ? `${item.ident} — ${item.name || '(unnamed)'}` : item.name || '(unnamed)');
    setShowDestResults(false);
    setDestResults([]);
  };

  const clearItem = () => { setSelectedItem(null); setItemQuery(''); };
  const clearDest = () => { setSelectedDest(null); setDestQuery(''); };

  // ── Move handler ────────────────────────────────────────────────
  const handleMove = async () => {
    setConfirmOpen(false);
    setMoving(true);
    setError('');
    try {
      const result = await moveItem(selectedItem.ident, selectedDest.ident);
      toast(`Moved "${result.ident || result.name}" to "${result.destination_ident || result.destination_name}"`);
      // Navigate to the moved item
      navigate(result.ident ? `/ident/${result.ident}` : `/id/${result.id}`);
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setMoving(false);
    }
  };

  const canMove = selectedItem?.ident && selectedDest?.ident && selectedDest.is_container;

  // ── QR Scanner logic ────────────────────────────────────────────
  const extractIdent = useCallback((text) => {
    // Match base URL
    if (baseUrl && text.startsWith(baseUrl)) {
      const path = text.slice(baseUrl.replace(/\/$/, '').length);
      // Extract ident from path like /ident/XXXX or /-/XXXX
      const m = path.match(/^\/(?:ident|-)\/([\w.-]+)/);
      if (m) return m[1];
      // Fallback: last path segment
      const segs = path.split('/').filter(Boolean);
      if (segs.length) return segs[segs.length - 1];
    }

    // Check allowed URIs
    for (const pattern of allowedUris) {
      if (!pattern.includes(':ident')) continue;
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(':ident', '([^/]+)');
      const re = new RegExp('^' + escaped);
      const match = text.match(re);
      if (match && match[1]) return match[1];
    }

    // Try URL parsing
    try {
      const url = new URL(text);
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length) return segments[segments.length - 1];
    } catch {
      // raw text = ident
    }

    return text;
  }, [baseUrl, allowedUris]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const state = scanner.getState();
      if (state === 2 || state === 3) await scanner.stop();
      scanner.clear();
    } catch { /* ignore */ }
    scannerRef.current = null;
  }, []);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const startScanning = () => {
    setScanOpen(true);
    setScanStep(1);
    setScanStatus('Scan the item to move…');
    matchedRef.current = false;
  };

  const closeScan = useCallback(async () => {
    await stopScanner();
    setScanOpen(false);
    setScanStep(0);
    setScanStatus('');
  }, [stopScanner]);

  // Start/restart scanner when scanStep changes
  useEffect(() => {
    if (!scanOpen || scanStep === 0) return;

    matchedRef.current = false;

    const timer = setTimeout(async () => {
      try {
        // Stop any existing scanner first
        await stopScanner();

        const scanner = new Html5Qrcode(READER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (vw, vh) => {
              const size = Math.min(vw, vh) * 0.7;
              return { width: Math.floor(size), height: Math.floor(size) };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!matchedRef.current) {
              handleDecodeRef.current?.(decodedText);
            }
          },
          () => {},
        );
      } catch (err) {
        setScanStatus(`Camera error: ${err.message || err}`);
      }
    }, 200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanOpen, scanStep]);

  const handleScanDecode = useCallback(async (text) => {
    matchedRef.current = true;
    const ident = extractIdent(text);

    if (scanStep === 1) {
      // First scan: populate item
      setScanStatus(`Found: ${ident} — looking up…`);
      try {
        const item = await lookupByIdent(ident);
        selectItem(item);
        // Stop current scanner before advancing step
        await stopScanner();
        setScanStep(2);
        setScanStatus('Now scan the destination container…');
        matchedRef.current = false;
      } catch {
        setScanStatus(`Item "${ident}" not found — try again`);
        matchedRef.current = false;
      }
    } else if (scanStep === 2) {
      // Second scan: populate destination
      setScanStatus(`Found: ${ident} — looking up…`);
      try {
        const dest = await lookupByIdent(ident);
        if (!dest.is_container) {
          setScanStatus(`"${ident}" is not a container — try again`);
          matchedRef.current = false;
          return;
        }
        selectDest(dest);
        await closeScan();
        // Auto-show confirm modal
        setConfirmOpen(true);
      } catch {
        setScanStatus(`Item "${ident}" not found — try again`);
        matchedRef.current = false;
      }
    }
  }, [scanStep, extractIdent, stopScanner, closeScan]);

  useEffect(() => {
    handleDecodeRef.current = handleScanDecode;
  }, [handleScanDecode]);

  // ── Render ──────────────────────────────────────────────────────
  const inputClasses = 'w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500';

  const renderDropdown = (results, loading, query, onSelect) => (
    <ul className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
      {loading && <li className="px-3 py-2 text-sm text-gray-400">Searching…</li>}
      {!loading && query.trim() && results.length === 0 && (
        <li className="px-3 py-2 text-sm text-gray-400">No results</li>
      )}
      {results.map((r) => (
        <li key={r.id}>
          <button
            onClick={() => onSelect(r)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition"
          >
            <span className="font-mono text-gray-500 dark:text-gray-400 mr-1">{r.ident || '👻'}</span>
            <span className="text-gray-800 dark:text-gray-100">{r.name || '(unnamed)'}</span>
            {r.is_checked_out && <Icon path={mdiHomeExportOutline} size={0.6} className="ml-1 text-amber-500" title="Checked out" />}
            {r.is_container && <span className="ml-1 text-xs text-indigo-500 dark:text-indigo-400 inline-flex items-center gap-0.5"><Icon path={mdiPackageVariant} size={0.5} /><span className="hidden sm:inline">container</span></span>}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Move Item</h1>

      {/* Scan tile — mobile only */}
      <button
        type="button"
        onClick={startScanning}
        className="md:hidden w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition"
      >
        <Icon path={mdiQrcodeScan} size={1.2} />
        <span className="text-base font-medium">Scan QR Codes</span>
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-2">
        {/* Item to move */}
        <div className="space-y-1" ref={itemSearchRef}>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Item to move</span>
          <div className="relative">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={itemQuery}
                onChange={(e) => { setItemQuery(e.target.value); setSelectedItem(null); }}
                onFocus={() => itemResults.length > 0 && setShowItemResults(true)}
                placeholder="Search by ident or name…"
                className={inputClasses}
              />
              {selectedItem && (
                <button type="button" onClick={clearItem} className="text-xs text-red-500 hover:text-red-700 px-1">✕</button>
              )}
            </div>
            {showItemResults && renderDropdown(itemResults, itemLoading, itemQuery, selectItem)}
          </div>
          {selectedItem && (
            <p className="text-xs text-green-600 dark:text-green-400">
              ✓ {selectedItem.ident || '(ghost)'} — {selectedItem.name || '(unnamed)'}
            </p>
          )}
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center py-1">
          <Icon path={mdiArrowDownBold} size={1} className="text-gray-400 dark:text-gray-500" />
        </div>

        {/* Destination container */}
        <div className="space-y-1" ref={destSearchRef}>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Destination container</span>
          <div className="relative">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={destQuery}
                onChange={(e) => { setDestQuery(e.target.value); setSelectedDest(null); }}
                onFocus={() => destResults.length > 0 && setShowDestResults(true)}
                placeholder="Search containers…"
                className={inputClasses}
              />
              {selectedDest && (
                <button type="button" onClick={clearDest} className="text-xs text-red-500 hover:text-red-700 px-1">✕</button>
              )}
            </div>
            {showDestResults && (
              <ul className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                {destLoading && <li className="px-3 py-2 text-sm text-gray-400">Searching…</li>}
                {!destLoading && destQuery.trim() && destResults.length === 0 && (
                  <li className="px-3 py-2 text-sm text-gray-400">No results</li>
                )}
                {destResults.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => selectDest(r)}
                      className={`w-full text-left px-3 py-2 text-sm transition ${
                        r.is_container
                          ? 'hover:bg-gray-100 dark:hover:bg-gray-600'
                          : 'opacity-40 cursor-not-allowed'
                      }`}
                      disabled={!r.is_container}
                    >
                      <span className="font-mono text-gray-500 dark:text-gray-400 mr-1">{r.ident || '👻'}</span>
                      <span className="text-gray-800 dark:text-gray-100">{r.name || '(unnamed)'}</span>
                      {r.is_container && <span className="ml-1 text-xs text-indigo-500 dark:text-indigo-400 inline-flex items-center gap-0.5"><Icon path={mdiPackageVariant} size={0.5} /><span className="hidden sm:inline">container</span></span>}
                      {!r.is_container && <span className="ml-1 text-xs text-gray-400"><span className="hidden sm:inline">not a container</span></span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedDest && (
            <p className="text-xs text-green-600 dark:text-green-400">
              ✓ {selectedDest.ident || '(ghost)'} — {selectedDest.name || '(unnamed)'}
            </p>
          )}
        </div>

        {/* Move button */}
        <button
          type="button"
          onClick={() => canMove && setConfirmOpen(true)}
          disabled={!canMove || moving}
          className="w-full mt-4 py-3 rounded-full bg-indigo-600 text-white text-base font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {moving ? 'Moving…' : 'Move'}
        </button>
      </div>

      {/* ── Confirmation Modal ─────────────────────────────────── */}
      {confirmOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setConfirmOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md pointer-events-auto p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Confirm Move</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Move <span className="font-mono text-gray-500 dark:text-gray-400">{selectedItem?.ident || '(ghost)'}</span> <strong className="text-gray-800 dark:text-gray-100">{selectedItem?.name || '(unnamed)'}</strong> to <span className="font-mono text-gray-500 dark:text-gray-400">{selectedDest?.ident || '(ghost)'}</span> <strong className="text-gray-800 dark:text-gray-100">{selectedDest?.name || '(unnamed)'}</strong>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMove}
                  className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  Move
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── QR Scanner Modal ───────────────────────────────────── */}
      {scanOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={closeScan} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm pointer-events-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {scanStep === 1 ? 'Scan Item' : 'Scan Destination'}
                </h2>
                <button
                  onClick={closeScan}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  <Icon path={mdiClose} size={0.85} />
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">{scanStatus}</p>

              <div className="relative rounded overflow-hidden bg-black">
                <div id={READER_ID} className="w-full" />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className={`w-2 h-2 rounded-full ${scanStep >= 1 ? (selectedItem ? 'bg-green-500' : 'bg-indigo-500 animate-pulse') : 'bg-gray-300'}`} />
                <span>Item</span>
                <span className="mx-1">→</span>
                <span className={`w-2 h-2 rounded-full ${scanStep >= 2 ? 'bg-indigo-500 animate-pulse' : 'bg-gray-300'}`} />
                <span>Destination</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
