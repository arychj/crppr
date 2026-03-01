import { useState } from 'react';
import { exportInventoryUrl, importInventory } from '../api';
import { useToast } from '../components/Toast';
import useDocTitle from '../hooks/useDocTitle';
import Icon from '@mdi/react';
import { mdiExport, mdiImport } from '@mdi/js';

export default function ImportExportPage() {
  useDocTitle('Backups');
  const toast = useToast();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await importInventory(file);
      setResult(res);
      toast(`Import complete: ${res.created} created, ${res.skipped} skipped`);
    } catch (err) {
      toast(`Import failed: ${err.message}`, 'error');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Backups</h1>

      {/* Export */}
      <div className="bg-white dark:bg-gray-800 rounded shadow p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Export</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Download the entire inventory including all items, metadata, and parent relationships.
        </p>
        <div className="flex gap-3">
          <a
            href={exportInventoryUrl('json')}
            download="crppr-inventory.json"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
          >
            <Icon path={mdiExport} size={0.7} />
            JSON
          </a>
          <a
            href={exportInventoryUrl('csv')}
            download="crppr-inventory.csv"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
          >
            <Icon path={mdiExport} size={0.7} />
            CSV
          </a>
        </div>
      </div>

      {/* Import */}
      <div className="bg-white dark:bg-gray-800 rounded shadow p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Import</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Upload a <span className="font-mono">.json</span> or <span className="font-mono">.csv</span> file.
          Items with an ident already in the database will be skipped. New items will be created.
        </p>
        <div className="flex items-center gap-3">
          <label className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition cursor-pointer ${importing ? 'bg-gray-400 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            <Icon path={mdiImport} size={0.7} />
            {importing ? 'Importing…' : 'Choose File'}
            <input
              type="file"
              accept=".json,.csv"
              className="hidden"
              disabled={importing}
              onChange={handleImport}
            />
          </label>
        </div>

        {/* Result summary */}
        {result && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Created</td>
                    <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{result.created}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Skipped</td>
                    <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{result.skipped}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {result.skipped_idents?.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  {result.skipped_idents.length} skipped ident{result.skipped_idents.length !== 1 ? 's' : ''}
                </summary>
                <ul className="mt-2 max-h-48 overflow-y-auto space-y-1 pl-4">
                  {result.skipped_idents.map((ident, i) => (
                    <li key={i} className="font-mono text-gray-600 dark:text-gray-400">{ident}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
