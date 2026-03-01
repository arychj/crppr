import { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { listSettings } from '../api';
import { useTheme } from '../hooks/useTheme';

// Theme-aware colors (override settings fg/bg on the detail page)
const THEME_COLORS = {
  light: { foreground: '#000000', background: '#f3f4f6' },   // black dots, gray-100 bg
  dark:  { foreground: '#1f2937', background: '#ffffff' },    // gray-800 dots, white bg
};

export default function QRCodeStyled({ data, displaySize = 128 }) {
  const ref = useRef(null);
  const { dark } = useTheme();

  useEffect(() => {
    if (!data || !ref.current) return;
    let cancelled = false;

    listSettings().then((settings) => {
      if (cancelled || !ref.current) return;
      const map = Object.fromEntries(settings.map((s) => [s.key, s.value || '']));

      const size = parseInt(map.qr_size, 10) || 500;
      const dotsType = map.qr_dots || 'classy-rounded';
      const type = map.qr_type || 'svg';
      const margin = parseInt(map.qr_margin, 10) ?? 10;

      // Use theme-aware colors instead of settings fg/bg
      const palette = dark ? THEME_COLORS.dark : THEME_COLORS.light;

      const qr = new QRCodeStyling({
        width: size,
        height: size,
        type,
        data,
        margin,
        dotsOptions: { type: dotsType, color: palette.foreground },
        backgroundOptions: { color: palette.background },
        cornersSquareOptions: { color: palette.foreground },
        cornersDotOptions: { color: palette.foreground },
      });

      ref.current.innerHTML = '';
      qr.append(ref.current);

      // Scale the rendered SVG/canvas to fit displaySize
      const child = ref.current.firstChild;
      if (child) {
        child.style.width = '100%';
        child.style.height = '100%';
      }
    }).catch(console.error);

    return () => { cancelled = true; };
  }, [data, displaySize, dark]);

  if (!data) return null;

  return (
    <div
      ref={ref}
      className="rounded-lg overflow-hidden"
      style={{ width: displaySize, height: displaySize }}
    />
  );
}
