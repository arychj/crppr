import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './hooks/useTheme';
import { DrawerProvider } from './hooks/useDrawer';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ItemDetailPage from './pages/ItemDetailPage';
import CreateItemPage from './pages/CreateItemPage';
import InventoryPage from './pages/InventoryPage';

import IdentPage from './pages/IdentPage';
import SettingsPage from './pages/SettingsPage';
import LookupPage from './pages/LookupPage';
import MetadataPage from './pages/MetadataPage';
import ImportExportPage from './pages/ImportExportPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <DrawerProvider>
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/new" element={<CreateItemPage />} />
                <Route path="/id/:id" element={<ItemDetailPage />} />
                <Route path="/ident/:ident" element={<LookupPage />} />
                <Route path="/-/:ident" element={<LookupPage />} />

                <Route path="/ident" element={<IdentPage />} />
                <Route path="/metadata" element={<MetadataPage />} />
                <Route path="/import-export" element={<ImportExportPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </ToastProvider>
        </DrawerProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
