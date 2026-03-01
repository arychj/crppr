import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSetting } from '../api';

export default function BreadcrumbNav({ segments = [] }) {
  const [homeName, setHomeName] = useState('Home');

  useEffect(() => {
    getSetting('home_name')
      .then((s) => { if (s.value) setHomeName(s.value); })
      .catch(() => {});
  }, []);

  if (!segments.length) return null;

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mb-4 flex-wrap">
      <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 font-medium">
        {homeName}
      </Link>
      {segments.map((seg, i) => (
        <span key={seg.id} className="flex items-center space-x-1">
          <span>/</span>
          {i === segments.length - 1 ? (
            <span className="text-gray-900 dark:text-gray-100 font-semibold">
              {seg.name || seg.ident}
            </span>
          ) : (
            <Link to={`/ident/${seg.ident}`} className="hover:text-blue-600 dark:hover:text-blue-400">
              {seg.name || seg.ident}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
