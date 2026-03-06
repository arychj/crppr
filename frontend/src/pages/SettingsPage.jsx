import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listSettings, setSetting, listTemplates, createTemplate, deleteTemplate } from '../api';
import { useToast } from '../components/Toast';
import useDocTitle from '../hooks/useDocTitle';
import Icon from '@mdi/react';
import { mdiFileDocumentOutline, mdiTrashCanOutline, mdiPlus } from '@mdi/js';

export default function SettingsPage() {
  useDocTitle('Settings');
  const toast = useToast();

  const [tagline, setTagline] = useState('');
  const [origTagline, setOrigTagline] = useState('');
  const [homeName, setHomeName] = useState('');
  const [origHomeName, setOrigHomeName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [origBaseUrl, setOrigBaseUrl] = useState('');
  const [allowedUris, setAllowedUris] = useState([]);
  const [origAllowedUris, setOrigAllowedUris] = useState([]);
  const [newUri, setNewUri] = useState('');
  const [scanNoMatchRedirect, setScanNoMatchRedirect] = useState(true);
  const [identFormat, setIdentFormat] = useState('dec');
  const [origIdentFormat, setOrigIdentFormat] = useState('dec');
  const [identPrefix, setIdentPrefix] = useState('');
  const [origIdentPrefix, setOrigIdentPrefix] = useState('');
  const [identWidth, setIdentWidth] = useState('0');
  const [origIdentWidth, setOrigIdentWidth] = useState('0');
  const [qrSize, setQrSize] = useState('500');
  const [origQrSize, setOrigQrSize] = useState('500');
  const [qrDots, setQrDots] = useState('classy-rounded');
  const [origQrDots, setOrigQrDots] = useState('classy-rounded');
  const [qrForeground, setQrForeground] = useState('#000000');
  const [origQrForeground, setOrigQrForeground] = useState('#000000');
  const [qrBackground, setQrBackground] = useState('#ffffff');
  const [origQrBackground, setOrigQrBackground] = useState('#ffffff');
  const [qrType, setQrType] = useState('svg');
  const [origQrType, setOrigQrType] = useState('svg');
  const [qrMargin, setQrMargin] = useState('10');
  const [origQrMargin, setOrigQrMargin] = useState('10');
  const [templates, setTemplates] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const loadSettings = useCallback(() => {
    listSettings().then((settings) => {
      const map = Object.fromEntries(settings.map((s) => [s.key, s.value || '']));
      setTagline(map.tagline ?? '');
      setOrigTagline(map.tagline ?? '');
      setHomeName(map.home_name ?? 'Home');
      setOrigHomeName(map.home_name ?? 'Home');
      setBaseUrl(map.base_url ?? '');
      setOrigBaseUrl(map.base_url ?? '');
      try { const uris = JSON.parse(map.allowed_uris || '[]'); setAllowedUris(uris); setOrigAllowedUris(uris); } catch { setAllowedUris([]); setOrigAllowedUris([]); }
      setScanNoMatchRedirect((map.scan_no_match_redirect || 'true') === 'true');
      setIdentFormat(map.ident_format ?? 'dec');
      setOrigIdentFormat(map.ident_format ?? 'dec');
      setIdentPrefix(map.ident_prefix ?? '');
      setOrigIdentPrefix(map.ident_prefix ?? '');
      setIdentWidth(map.ident_width ?? '0');
      setOrigIdentWidth(map.ident_width ?? '0');
      setQrSize(map.qr_size ?? '500');
      setOrigQrSize(map.qr_size ?? '500');
      setQrDots(map.qr_dots ?? 'classy-rounded');
      setOrigQrDots(map.qr_dots ?? 'classy-rounded');
      setQrForeground(map.qr_foreground ?? '#000000');
      setOrigQrForeground(map.qr_foreground ?? '#000000');
      setQrBackground(map.qr_background ?? '#ffffff');
      setOrigQrBackground(map.qr_background ?? '#ffffff');
      setQrType(map.qr_type ?? 'svg');
      setOrigQrType(map.qr_type ?? 'svg');
      setQrMargin(map.qr_margin ?? '10');
      setOrigQrMargin(map.qr_margin ?? '10');
    }).catch(console.error);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const loadTemplates = useCallback(() => {
    listTemplates().then(setTemplates).catch(console.error);
  }, []);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim() || creatingTemplate) return;
    setCreatingTemplate(true);
    try {
      await createTemplate({ name: newTemplateName.trim() });
      setNewTemplateName('');
      loadTemplates();
      toast('Template created');
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (tpl) => {
    try {
      await deleteTemplate(tpl.id);
      loadTemplates();
      toast('Template deleted');
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
    }
  };

  const handleTaglineBlur = async () => {
    if (tagline === origTagline) return;
    try {
      await setSetting('tagline', tagline);
      setOrigTagline(tagline);
      toast('Tagline saved');
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
    }
  };

  const handleHomeNameBlur = async () => {
    if (homeName === origHomeName) return;
    try {
      await setSetting('home_name', homeName);
      setOrigHomeName(homeName);
      toast('Home name saved');
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Settings</h1>

      <div className="bg-white dark:bg-gray-800 rounded shadow p-6 space-y-6">
        {/* Tagline */}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tagline</span>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            onBlur={handleTaglineBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            placeholder="a place for all your crap"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">Displayed on the home page. Saves on blur.</p>
        </label>

        {/* Home Name */}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Home Name</span>
          <input
            type="text"
            value={homeName}
            onChange={(e) => setHomeName(e.target.value)}
            onBlur={handleHomeNameBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            placeholder="Home"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">The label used for "Home" in breadcrumb navigation. Saves on blur.</p>
        </label>

        {/* Base URL */}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Base URL</span>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            onBlur={async () => {
              if (baseUrl === origBaseUrl) return;
              try {
                await setSetting('base_url', baseUrl);
                setOrigBaseUrl(baseUrl);
                toast('Base URL saved');
              } catch (err) {
                toast(`Failed: ${err.message}`, 'error');
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            placeholder="https://crppr.example.com"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">If a scanned QR code starts with this URL, the app navigates directly to that page. Saves on blur.</p>
        </label>

        {/* Allowed URIs */}
        <div className="space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Other Allowed Item URIs</span>
          <div className="space-y-2">
            {allowedUris.map((uri, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-100 font-mono truncate">{uri}</span>
                <button
                  onClick={async () => {
                    const updated = allowedUris.filter((_, i) => i !== idx);
                    try {
                      await setSetting('allowed_uris', JSON.stringify(updated));
                      setAllowedUris(updated);
                      setOrigAllowedUris(updated);
                      toast('URI removed');
                    } catch (err) {
                      toast(`Failed: ${err.message}`, 'error');
                    }
                  }}
                  className="text-red-500 hover:text-red-700 text-xs"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newUri}
                onChange={(e) => setNewUri(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newUri.trim()) {
                    const updated = [...allowedUris, newUri.trim()];
                    try {
                      await setSetting('allowed_uris', JSON.stringify(updated));
                      setAllowedUris(updated);
                      setOrigAllowedUris(updated);
                      setNewUri('');
                      toast('URI added');
                    } catch (err) {
                      toast(`Failed: ${err.message}`, 'error');
                    }
                  }
                }}
                placeholder="https://example.com/-/:ident"
                className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
              <button
                onClick={async () => {
                  if (!newUri.trim()) return;
                  const updated = [...allowedUris, newUri.trim()];
                  try {
                    await setSetting('allowed_uris', JSON.stringify(updated));
                    setAllowedUris(updated);
                    setOrigAllowedUris(updated);
                    setNewUri('');
                    toast('URI added');
                  } catch (err) {
                    toast(`Failed: ${err.message}`, 'error');
                  }
                }}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition"
              >
                Add
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Other URLs accepted when scanning a QR code. Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">:ident</code> as a placeholder for the item ident. Press Enter or click Add.</p>
        </div>

        {/* Scan No-Match Redirect */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={async () => {
              const newVal = !scanNoMatchRedirect;
              setScanNoMatchRedirect(newVal);
              try {
                await setSetting('scan_no_match_redirect', String(newVal));
                toast(`No-match redirect ${newVal ? 'enabled' : 'disabled'}`);
              } catch (err) {
                setScanNoMatchRedirect(!newVal);
                toast(`Failed: ${err.message}`, 'error');
              }
            }}
            className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${
              scanNoMatchRedirect ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                scanNoMatchRedirect ? 'translate-x-4' : ''
              }`}
            />
          </div>
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Redirect on No Pattern Match</span>
            <p className="text-xs text-gray-400 dark:text-gray-500">When enabled, scanned codes that don't match any pattern will still attempt to navigate using the extracted ident (with a longer delay).</p>
          </div>
        </label>
      </div>

      {/* Templates */}
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 pt-2">Item Templates</h2>
      <div className="bg-white dark:bg-gray-800 rounded shadow p-6 space-y-4">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Templates are reusable item blueprints (with metadata). Use them from the Add Item page to pre-fill fields.
        </p>

        {templates.length === 0 && (
          <p className="text-sm text-gray-400 italic">No templates yet.</p>
        )}

        {templates.map((tpl) => (
          <div key={tpl.id} className="flex items-center gap-2 group">
            <Icon path={mdiFileDocumentOutline} size={0.7} className="text-teal-500 flex-shrink-0" />
            <Link
              to={`/template/${tpl.id}`}
              className="flex-1 text-sm text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition truncate"
            >
              {tpl.name || <span className="text-gray-400 italic">(unnamed)</span>}
              {tpl.is_container && (
                <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">
                  container
                </span>
              )}
            </Link>
            <span className="text-xs text-gray-400">{tpl.metadata?.length || 0} fields</span>
            <button
              onClick={() => handleDeleteTemplate(tpl)}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition p-1"
              title="Delete template"
            >
              <Icon path={mdiTrashCanOutline} size={0.6} />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2 border-t dark:border-gray-700">
          <input
            type="text"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTemplate(); }}
            placeholder="New template name…"
            className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            onClick={handleCreateTemplate}
            disabled={creatingTemplate || !newTemplateName.trim()}
            className="flex items-center gap-1 bg-teal-600 text-white px-3 py-2 rounded text-sm hover:bg-teal-700 disabled:opacity-50 transition"
          >
            <Icon path={mdiPlus} size={0.6} />
            Add
          </button>
        </div>
      </div>

      {/* Ident Generation */}
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 pt-2">Ident Generation</h2>
      <div className="bg-white dark:bg-gray-800 rounded shadow p-6 space-y-6">
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium text-gray-600 dark:text-gray-400">Format</legend>
          <div className="flex gap-6 pt-1">
            {[{ value: 'dec', label: 'Decimal' }, { value: 'hex', label: 'Hex' }].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ident_format"
                  value={opt.value}
                  checked={identFormat === opt.value}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setIdentFormat(val);
                    if (val === origIdentFormat) return;
                    try {
                      await setSetting('ident_format', val);
                      setOrigIdentFormat(val);
                      toast('Ident format saved');
                    } catch (err) {
                      toast(`Failed: ${err.message}`, 'error');
                    }
                  }}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-800 dark:text-gray-100">{opt.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Number format used when generating new idents.</p>
        </fieldset>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Prefix</span>
          <input
            type="text"
            value={identPrefix}
            onChange={(e) => setIdentPrefix(e.target.value)}
            onBlur={async () => {
              if (identPrefix === origIdentPrefix) return;
              try {
                await setSetting('ident_prefix', identPrefix);
                setOrigIdentPrefix(identPrefix);
                toast('Ident prefix saved');
              } catch (err) {
                toast(`Failed: ${err.message}`, 'error');
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            placeholder="(none)"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">Prepended to each generated ident (e.g. "INV-").</p>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Width</span>
          <input
            type="number"
            min="0"
            value={identWidth}
            onChange={(e) => setIdentWidth(e.target.value)}
            onBlur={async () => {
              if (identWidth === origIdentWidth) return;
              try {
                await setSetting('ident_width', identWidth);
                setOrigIdentWidth(identWidth);
                toast('Ident width saved');
              } catch (err) {
                toast(`Failed: ${err.message}`, 'error');
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            placeholder="0 = no padding"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">Minimum digit width, zero-padded (0 = no padding).</p>
        </label>
      </div>

      {/* QR Code Styling */}
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 pt-2">
        QR Code Styling
        <a
          href="https://www.npmjs.com/package/qr-code-styling"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-xs font-normal text-blue-500 hover:underline"
        >
          (qr-code-styling)
        </a>
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded shadow p-6 space-y-6">
        {/* Size */}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Size (px)</span>
          <input
            type="number"
            min="100"
            max="2000"
            value={qrSize}
            onChange={(e) => setQrSize(e.target.value)}
            onBlur={async () => {
              if (qrSize === origQrSize) return;
              try {
                await setSetting('qr_size', qrSize);
                setOrigQrSize(qrSize);
                toast('QR size saved');
              } catch (err) {
                toast(`Failed: ${err.message}`, 'error');
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            placeholder="500"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">Width and height of the generated QR code in pixels.</p>
        </label>

        {/* Dot Style */}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Dot Style</span>
          <select
            value={qrDots}
            onChange={async (e) => {
              const val = e.target.value;
              setQrDots(val);
              if (val === origQrDots) return;
              try {
                await setSetting('qr_dots', val);
                setOrigQrDots(val);
                toast('QR dot style saved');
              } catch (err) {
                toast(`Failed: ${err.message}`, 'error');
              }
            }}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 dark:text-gray-500">The shape of each dot in the QR code.</p>
        </label>

        {/* Foreground Color */}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Foreground Color</span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={qrForeground}
              onChange={(e) => setQrForeground(e.target.value)}
              onBlur={async () => {
                if (qrForeground === origQrForeground) return;
                try {
                  await setSetting('qr_foreground', qrForeground);
                  setOrigQrForeground(qrForeground);
                  toast('QR foreground saved');
                } catch (err) {
                  toast(`Failed: ${err.message}`, 'error');
                }
              }}
              className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">{qrForeground}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Color of the QR code dots.</p>
        </label>

        {/* Background Color */}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Background Color</span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={qrBackground}
              onChange={(e) => setQrBackground(e.target.value)}
              onBlur={async () => {
                if (qrBackground === origQrBackground) return;
                try {
                  await setSetting('qr_background', qrBackground);
                  setOrigQrBackground(qrBackground);
                  toast('QR background saved');
                } catch (err) {
                  toast(`Failed: ${err.message}`, 'error');
                }
              }}
              className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">{qrBackground}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Background color of the QR code.</p>
        </label>

        {/* Output Type */}
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium text-gray-600 dark:text-gray-400">Output Type</legend>
          <div className="flex gap-6 pt-1">
            {[{ value: 'svg', label: 'SVG' }, { value: 'canvas', label: 'Canvas (PNG)' }].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="qr_type"
                  value={opt.value}
                  checked={qrType === opt.value}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setQrType(val);
                    if (val === origQrType) return;
                    try {
                      await setSetting('qr_type', val);
                      setOrigQrType(val);
                      toast('QR output type saved');
                    } catch (err) {
                      toast(`Failed: ${err.message}`, 'error');
                    }
                  }}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-800 dark:text-gray-100">{opt.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Render format for the QR code.</p>
        </fieldset>

        {/* Margin */}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Margin (px)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={qrMargin}
            onChange={(e) => setQrMargin(e.target.value)}
            onBlur={async () => {
              if (qrMargin === origQrMargin) return;
              try {
                await setSetting('qr_margin', qrMargin);
                setOrigQrMargin(qrMargin);
                toast('QR margin saved');
              } catch (err) {
                toast(`Failed: ${err.message}`, 'error');
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            placeholder="10"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">Quiet-zone margin around the QR code in pixels.</p>
        </label>
      </div>
    </div>
  );
}
