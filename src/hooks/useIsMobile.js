import { useEffect, useState } from 'react';

/**
 * True when the viewport is at or below the layout breakpoint (900px) — i.e.
 * the bottom-nav / mobile-header layout is active. Used where CSS alone can't
 * decide (e.g. rendering a FAB vs an inline button).
 */
export function useIsMobile(breakpoint = 900) {
  const query = `(max-width: ${breakpoint}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}
