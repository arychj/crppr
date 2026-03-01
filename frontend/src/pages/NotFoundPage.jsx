import { Link } from 'react-router-dom';
import useDocTitle from '../hooks/useDocTitle';

export default function NotFoundPage() {
  useDocTitle('Not Found');

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-4">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600">404</h1>
      <p className="text-lg text-gray-500 dark:text-gray-400">Page not found</p>
      <Link
        to="/"
        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
      >
        Go home
      </Link>
    </div>
  );
}
