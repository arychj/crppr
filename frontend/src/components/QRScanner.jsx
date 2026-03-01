import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { listSettings } from '../api';

const READER_ID = 'qr-reader';

export default function QRScanner({ autoStart = false, onClose, onMatch }) {
  const [scanning, setScanning] = useState(autoStart);
  const [matched, setMatched] = useState(false);
  const [error, setError] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [allowedUris, setAllowedUris] = useState([]);
  const [noMatchRedirect, setNoMatchRedirect] = useState(true);
  const [matchType, setMatchType] = useState(null);
  const [log, setLog] = useState([]);
  const logEndRef = useRef(null);
  const scannerRef = useRef(null);
  const matchedRef = useRef(false);
  const handleDecodeRef = useRef(null);
  const navigate = useNavigate();

  const addLog = useCallback((msg, type = 'info') => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    setLog((prev) => [...prev, { ts, msg, type }]);
  }, []);

  // Auto-scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  // Load settings
  useEffect(() => {
    listSettings()
      .then((settings) => {
        const map = Object.fromEntries(settings.map((s) => [s.key, s.value || '']));
        setBaseUrl(map.base_url || '');
        setNoMatchRedirect((map.scan_no_match_redirect || 'true') === 'true');
        try { setAllowedUris(JSON.parse(map.allowed_uris || '[]')); } catch { setAllowedUris([]); }
      })
      .catch(() => {});
  }, []);

  // Stop scanner helper
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const state = scanner.getState();
      // state 2 = SCANNING, 3 = PAUSED
      if (state === 2 || state === 3) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // ignore cleanup errors
    }
    scannerRef.current = null;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  // Start / stop scanning
  useEffect(() => {
    if (!scanning) {
      stopScanner();
      return;
    }

    matchedRef.current = false;
    setLog([]);

    // Small delay to ensure the DOM element is rendered
    const timer = setTimeout(async () => {
      addLog('Initializing camera...');
      try {
        const scanner = new Html5Qrcode(READER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
              return { width: Math.floor(size), height: Math.floor(size) };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!matchedRef.current) {
              handleDecodeRef.current?.(decodedText);
            }
          },
          () => {
            // ignore scan errors (no QR found in frame)
          },
        );

        addLog('Camera ready');
        addLog('Searching for code...');
      } catch (err) {
        addLog(`Camera error: ${err.message || err}`, 'error');
        setError(String(err.message || err));
      }
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const stopAndNavigate = useCallback((path, type = 'match') => {
    matchedRef.current = true;
    setMatched(true);
    setMatchType(type);
    onMatch?.(type);
    const delay = type === 'match' ? 1000 : 5000;

    if (type === 'match') {
      addLog('Loading...');
    } else {
      // Add a countdown log entry and update it each second
      const totalSec = Math.ceil(delay / 1000);
      setLog((prev) => [...prev, {
        ts: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }),
        msg: `Redirecting in ${totalSec}s...`,
        type: 'warn',
      }]);

      let remaining = totalSec - 1;
      const interval = setInterval(() => {
        if (remaining <= 0) {
          clearInterval(interval);
          return;
        }
        setLog((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            msg: `Redirecting in ${remaining}s...`,
          };
          return updated;
        });
        remaining--;
      }, 1000);
    }

    setTimeout(async () => {
      await stopScanner();
      setMatched(false);
      setMatchType(null);
      setScanning(false);
      onClose?.();
      navigate(path);
    }, delay);
  }, [addLog, navigate, onClose, onMatch, stopScanner]);

  const handleDecode = useCallback((text) => {
    addLog(`Code detected: ${text}`);

    // If a base_url is configured and the scanned text starts with it,
    // extract the path portion and navigate directly
    if (baseUrl && text.startsWith(baseUrl)) {
      const path = text.slice(baseUrl.replace(/\/$/, '').length);
      if (path) {
        addLog('Recognized — matches base URL', 'success');
        stopAndNavigate(path);
        return;
      }
    }

    // Check against allowed URIs — extract ident using :ident placeholder
    for (const pattern of allowedUris) {
      if (!pattern.includes(':ident')) continue;
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(':ident', '([^/]+)');
      const re = new RegExp('^' + escaped);
      const match = text.match(re);
      if (match && match[1]) {
        addLog(`Recognized — matched pattern: ${pattern}`, 'success');
        addLog(`Extracted ident: ${match[1]}`);
        stopAndNavigate(`/ident/${match[1]}`);
        return;
      }
    }

    // Try to parse a URL and extract ident from the last path segment
    try {
      const url = new URL(text);
      const segments = url.pathname.split('/').filter(Boolean);
      const ident = segments[segments.length - 1];
      if (ident) {
        addLog(`No pattern match — extracted ident from URL path: ${ident}`, 'warn');
        if (noMatchRedirect) {
          stopAndNavigate(`/ident/${ident}`, 'no-match');
        } else {
          addLog('No-match redirect disabled — ignoring', 'warn');
          matchedRef.current = false;
        }
        return;
      }
    } catch {
      // Not a URL — treat the raw text as an ident
    }

    addLog(`No pattern match — using raw value as ident: ${text}`, 'warn');
    if (noMatchRedirect) {
      stopAndNavigate(`/ident/${text}`, 'no-match');
    } else {
      addLog('No-match redirect disabled — ignoring', 'warn');
      matchedRef.current = false;
    }
  }, [baseUrl, allowedUris, noMatchRedirect, addLog, stopAndNavigate]);

  // Keep ref in sync with latest handleDecode
  useEffect(() => {
    handleDecodeRef.current = handleDecode;
  }, [handleDecode]);

  const handleStop = useCallback(async () => {
    await stopScanner();
    setScanning(false);
  }, [stopScanner]);

  const logColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warn': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`space-y-4 transition-colors duration-300 rounded-xl -m-6 p-6 ${matched ? (matchType === 'match' ? 'bg-green-500 dark:bg-green-600' : 'bg-amber-500 dark:bg-amber-600') : ''}`}>
      {!scanning ? (
        <button
          onClick={() => {
            setError('');
            setScanning(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
        >
          Open Camera
        </button>
      ) : (
        <div className="max-w-sm mx-auto space-y-3">
          <div className="relative rounded overflow-hidden bg-black">
            <div id={READER_ID} className="w-full" />
            <button
              onClick={handleStop}
              className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs z-10"
            >
              Close
            </button>
          </div>

          {/* Scan log */}
          <div className="bg-gray-900 rounded-lg p-3 h-[7.7rem] overflow-y-auto font-mono text-xs leading-relaxed scrollbar-hidden">
            {log.map((entry, i) => (
              <div key={i} className={logColor(entry.type)}>
                <span className="text-gray-600 mr-2">{entry.ts}</span>
                {entry.msg}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
