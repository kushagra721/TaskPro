import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Lets a page hand its search box + filter drawer to the mobile Topbar, which
 * renders them as icons. On desktop the page keeps its own inline toolbar, so
 * this only affects what the header shows.
 */
const HeaderActionsContext = createContext(null);

export function HeaderActionsProvider({ children }) {
  const [actions, setActions] = useState(null);
  const value = useMemo(() => ({ actions, setActions }), [actions]);
  return <HeaderActionsContext.Provider value={value}>{children}</HeaderActionsContext.Provider>;
}

/** Topbar side: the currently registered page actions (or null). */
export function useHeaderActions() {
  return useContext(HeaderActionsContext)?.actions || null;
}

/**
 * Page side: register search/filter handlers for as long as the page is mounted.
 * Pass `null`/omit to register nothing.
 */
export function useRegisterHeaderActions({ search, onSearch, onOpenFilters, filterCount } = {}) {
  const ctx = useContext(HeaderActionsContext);
  const setActions = ctx?.setActions;

  useEffect(() => {
    if (!setActions) return undefined;
    setActions({ search, onSearch, onOpenFilters, filterCount });
    return () => setActions(null);
  }, [setActions, search, onSearch, onOpenFilters, filterCount]);
}
