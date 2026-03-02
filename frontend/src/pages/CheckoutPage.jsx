import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { searchItems, updateItem, lookupByIdent, listSettings } from '../api';
import { useToast } from '../components/Toast';
import useDocTitle from '../hooks/useDocTitle';
import Icon from '@mdi/react';
import {
  mdiSwapHorizontal,
  mdiHomeExportOutline,
  mdiHomeImportOutline,
  mdiGhostOutline,
  mdiQrcodeScan,
  mdiClose,
  mdiPackageVariant,
} from '@mdi/js';

const READER_ID = 'checkout-qr-reader';

export default function CheckoutPage() {
  useDocTitle('Check In / Out');
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [scannedResult, setScannedResult] = useState(false);

  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // QR scanner state
  const [scanOpen, setScanOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const scannerRef = useRef(null);
  const matchedRef = useRef(false);
  const handleDecodeRef = useRef(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [allowedUris, setAllowedUris] = useState([]);

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

  // Auto-lookup from query parameter (e.g., /checkout?ident=ABC)
  useEffect(() => {
    const ident = searchParams.get('ident');
    if (ident) {
      lookupByIdent(ident)
        .then((item) => {
          setSelectedItem(item);
          setQuery(`${item.ident || ''} ${item.name || ''}`.trim());
        })
        .catch(() => {});
    }
  }, [searchParams]);

  // Search as user types
  useEffect(() => {
    if (selectedItem) return;
    if (!query.trim()) { setResults([]); return; }
    const id = setTimeout(() => {
      setLoading(true);
      searchItems(query.trim())
        .then((r) => { setResults(r); setShowResults(true); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(id);
  }, [query, selectedItem]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectItem = (item) => {
    setSelectedItem(item);
    setQuery(`${item.ident || ''} ${item.name || ''}`.trim());
    setShowResults(false);
    setScannedResult(false);
  };

  const clearSelection = () => {
    setSelectedItem(null);
    setQuery('');
    setResults([]);
    setScannedResult(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const toggleCheckout = async () => {
    if (!selectedItem) return;
    setToggling(true);
    try {
      const newVal = !selectedItem.is_checked_out;
      await updateItem(selectedItem.id, { is_checked_out: newVal });
      toast(newVal ? 'Checked out' : 'Checked in', 'success');
      setSelectedItem({ ...selectedItem, is_checked_out: newVal });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setToggling(false);
    }
  };

  // ── QR Scanner logic ────────────────────────────────────────────
  const extractIdent = useCallback((text) => {
    if (baseUrl && text.startsWith(baseUrl)) {
      const path = text.slice(baseUrl.replace(/\/$/, '').length);
      const m = path.match(/^\/(?:ident|-)\/([\w.-]+)/);
      if (m) return m[1];
      const segs = path.split('/').filter(Boolean);
      if (segs.length) return segs[segs.length - 1];
    }
    for (const pattern of allowedUris) {
      if (!pattern.includes(':ident')) continue;
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(':ident', '([^/]+)');
      const re = new RegExp('^' + escaped);
      const match = text.match(re);
      if (match && match[1]) return match[1];
    }
    try {
      const url = new URL(text);
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length) return segments[segments.length - 1];
    } catch { /* raw text = ident */ }
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
    setScanStatus('Scan an item to toggle check in / out…');
    matchedRef.current = false;
  };

  const closeScan = useCallback(async () => {
    await stopScanner();
    setScanOpen(false);
    setScanStatus('');
  }, [stopScanner]);

  // Start scanner when modal opens
  useEffect(() => {
    if (!scanOpen) return;
    matchedRef.current = false;

    const timer = setTimeout(async () => {
      try {
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
  }, [scanOpen]);

  const handleScanDecode = useCallback(async (text) => {
    matchedRef.current = true;
    const ident = extractIdent(text);
    setScanStatus(`Found: ${ident} — looking up…`);
    try {
      const item = await lookupByIdent(ident);
      const newVal = !item.is_checked_out;
      await updateItem(item.id, { is_checked_out: newVal });
      // Close scanner and show the updated item card
      await closeScan();
      const updated = { ...item, is_checked_out: newVal };
      setSelectedItem(updated);
      setQuery(`${updated.ident || ''} ${updated.name || ''}`.trim());
      setScannedResult(true);
      toast(newVal ? 'Checked out' : 'Checked in', 'success');
    } catch {
      toast(`Item "${ident}" doesn't exist`, 'error');
      setScanStatus(`Item "${ident}" doesn't exist — try again`);
      setTimeout(() => { matchedRef.current = false; }, 1500);
    }
  }, [extractIdent, toast, closeScan]);

  useEffect(() => {
    handleDecodeRef.current = handleScanDecode;
  }, [handleScanDecode]);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Check In / Out</h1>

      {/* Scan tile — mobile only */}
      <button
        type="button"
        onClick={startScanning}
        className="md:hidden w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition"
      >
        <Icon path={mdiQrcodeScan} size={1.2} />
        <span className="text-base font-medium">Scan QR Code</span>
      </button>

      {/* Search field */}
      <div ref={searchRef} className="relative">
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Item</label>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setSelectedItem(null); setQuery(e.target.value); }}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search by name, ident, or description…"
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
        />
        {loading && <span className="absolute right-3 top-8 text-xs text-gray-400">…</span>}

        {showResults && (
          <ul className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
            {loading && <li className="px-3 py-2 text-sm text-gray-400">Searching…</li>}
            {!loading && query.trim() && results.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">No results</li>
            )}
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => selectItem(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition flex items-center gap-1"
                >
                  <span className="font-mono text-gray-500 dark:text-gray-400 mr-1">
                    {r.ident || <Icon path={mdiGhostOutline} size={0.6} className="inline" />}
                  </span>
                  <span className="text-gray-800 dark:text-gray-100">{r.name || '(unnamed)'}</span>
                  {r.is_checked_out && (
                    <Icon path={mdiHomeExportOutline} size={0.6} className="ml-1 text-amber-500 flex-shrink-0" title="Checked out" />
                  )}
                  {r.is_container && <span className="ml-1 text-xs text-indigo-500 dark:text-indigo-400 inline-flex items-center gap-0.5"><Icon path={mdiPackageVariant} size={0.5} /><span className="hidden sm:inline">container</span></span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected item card */}
      {selectedItem && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {selectedItem.ident && (
                <span className="font-mono text-gray-500 dark:text-gray-400 flex-shrink-0">{selectedItem.ident}</span>
              )}
              {!selectedItem.ident && (
                <Icon path={mdiGhostOutline} size={0.7} className="text-gray-400 flex-shrink-0" title="Ghost" />
              )}
              <span className="text-gray-800 dark:text-gray-100 font-semibold truncate">{selectedItem.name || '(unnamed)'}</span>
            </div>
            <button
              onClick={clearSelection}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              ✕
            </button>
          </div>

          {/* Status + toggle */}
          <div className="flex items-center gap-3">
            {selectedItem.is_checked_out ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                <Icon path={mdiHomeExportOutline} size={0.8} />
                Checked Out
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                <Icon path={mdiHomeImportOutline} size={0.8} />
                Checked In
              </span>
            )}
          </div>

          {!scannedResult && (
            <button
              onClick={toggleCheckout}
              disabled={toggling}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-lg transition disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Icon path={mdiSwapHorizontal} size={1} />
              {toggling ? 'Updating…' : selectedItem.is_checked_out ? 'Check In' : 'Check Out'}
            </button>
          )}
        </div>
      )}

      {/* QR Scanner Modal */}
      {scanOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={closeScan} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm pointer-events-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  Scan to Toggle
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
