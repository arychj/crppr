import { createContext, useContext, useState } from 'react';

const DRAWER_KEY = 'crppr_drawer_open';

const DrawerContext = createContext(null);

export function DrawerProvider({ children }) {
  const [open, setOpen] = useState(() => localStorage.getItem(DRAWER_KEY) === 'true');

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem(DRAWER_KEY, String(next));
      return next;
    });
  };

  const setDrawerOpen = (val) => {
    setOpen(val);
    localStorage.setItem(DRAWER_KEY, String(val));
  };

  return (
    <DrawerContext.Provider value={{ open, toggle, setDrawerOpen }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('useDrawer must be used within <DrawerProvider>');
  return ctx;
}
