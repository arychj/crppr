import { Outlet } from 'react-router-dom';
import SideMenu from '../components/SideMenu';
import { useDrawer } from '../hooks/useDrawer';

/**
 * Top-level layout: collapsible side menu that pushes content.
 */
export default function Layout() {
  const { open } = useDrawer();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <SideMenu />
      <main
        className={`transition-[margin] duration-200 ease-in-out pr-4 pt-4 pb-8 ${
          open ? 'ml-80 pl-4' : 'ml-12 pl-4'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
