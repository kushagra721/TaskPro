import { useMemo, useState, useEffect } from 'react';

export const EMPTY_FILTERS = {
  status: '', priority: '', groupId: '', assigneeId: '', projectId: '', createdById: '',
  createdFrom: '', createdTo: '', dueFrom: '', dueTo: '',
};

/**
 * Manages task-list query state: search text (debounced), filters, and page.
 * Returns the `params` object to send to the API plus setters. Changing the
 * search or any filter resets to page 1.
 */
export function useTaskQuery(initialFilters = {}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, ...initialFilters });
  const [page, setPage] = useState(1);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const applyFilters = (next) => setFilters((prev) => ({ ...EMPTY_FILTERS, status: prev.status, ...next }));
  // Clearing drawer filters keeps the current status tab and search intact.
  const clearFilters = () => setFilters((prev) => ({ ...EMPTY_FILTERS, status: prev.status }));

  // Status is controlled by the tabs, so it doesn't count toward the drawer badge.
  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([k, v]) => k !== 'status' && v).length,
    [filters]
  );

  const params = useMemo(
    () => ({ ...filters, q: debouncedSearch || undefined, page, limit: 10 }),
    [filters, debouncedSearch, page]
  );

  return {
    search, setSearch,
    filters, applyFilters, clearFilters, activeFilterCount,
    page, setPage,
    params,
  };
}
