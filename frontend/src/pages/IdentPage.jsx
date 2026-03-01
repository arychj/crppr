import IdentGenerator from '../components/IdentGenerator';
import useDocTitle from '../hooks/useDocTitle';

export default function IdentPage() {
  useDocTitle('Ident Generator');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Ident Generator</h1>
      <IdentGenerator />
    </div>
  );
}
