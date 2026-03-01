import { useEffect } from 'react';

/**
 * Sets document.title. Prepends subtitle if given.
 * Usage: useDocTitle('My Item')  →  "My Item // crppr"
 *        useDocTitle()            →  "crppr"
 */
export default function useDocTitle(subtitle) {
  useEffect(() => {
    document.title = subtitle ? `${subtitle} // crppr` : 'crppr';
    return () => { document.title = 'crppr'; };
  }, [subtitle]);
}
