import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { lookupByIdent } from '../api';

export default function LookupPage() {
  const { ident } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    lookupByIdent(ident)
      .then((item) => {
        navigate(`/id/${item.id}`, { replace: true });
      })
      .catch(() => {
        // Ident not found — redirect to create page with ident prefilled
        navigate(`/new?ident=${encodeURIComponent(ident)}`, { replace: true });
      });
  }, [ident, navigate]);

  if (error) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <p className="text-red-500">Could not find item "{ident}": {error}</p>
      </div>
    );
  }

  return <p className="p-6 text-gray-400">Looking up "{ident}"…</p>;
}
