import { useState, useEffect } from 'react';
import { generateIdent, listSettings } from '../api';

export default function IdentGenerator() {
  const [start, setStart] = useState('1');
  const [end, setEnd] = useState('9999');
  const [fmt, setFmt] = useState('dec');
  const [prefix, setPrefix] = useState('');
  const [width, setWidth] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load format/prefix/width from settings
  useEffect(() => {
    listSettings()
      .then((settings) => {
        const map = Object.fromEntries(settings.map((s) => [s.key, s.value || '']));
        if (map.ident_format) setFmt(map.ident_format);
        if (map.ident_prefix) setPrefix(map.ident_prefix);
        if (map.ident_width) setWidth(Number(map.ident_width) || 0);
      })
      .catch(console.error);
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await generateIdent({ start, end, format: fmt, prefix, width });
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow space-y-3">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Generate Next Ident</h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="space-y-1">
          <span className="text-gray-600 dark:text-gray-400">Start {fmt === 'hex' ? '(hex)' : ''}</span>
          <input type="text" value={start} onChange={(e) => setStart(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 font-mono" />
        </label>
        <label className="space-y-1">
          <span className="text-gray-600 dark:text-gray-400">End {fmt === 'hex' ? '(hex)' : ''}</span>
          <input type="text" value={end} onChange={(e) => setEnd(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 font-mono" />
        </label>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">Format, prefix, and width are configured in Settings.</p>
      <button onClick={handleGenerate} disabled={loading}
        className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50 transition">
        {loading ? 'Generating…' : 'Generate'}
      </button>
      {result && (
        <div className="mt-2 text-sm">
          {result.error ? (
            <p className="text-red-500">{result.error}</p>
          ) : result.exhausted ? (
            <p className="text-yellow-600 dark:text-yellow-400">Range exhausted — no available idents.</p>
          ) : (
            <p className="text-green-700 dark:text-green-400">
              Next available: <span className="font-mono font-bold">{result.ident}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
