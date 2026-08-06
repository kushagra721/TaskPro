import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentOrg, selectCurrentOrgId, selectMembers, fetchMembers } from '../../store/slices/orgSlice.js';
import { fetchClients, selectClients, selectClientsPagination } from '../../store/slices/clientSlice.js';
import { organizationsApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import { isClientRole } from '../../utils/role.js';
import Pagination from '../../components/Pagination.jsx';
import TaskSearchBar from '../../components/TaskSearchBar.jsx';
import ClientFilterDrawer from '../../components/ClientFilterDrawer.jsx';
import ClientFormModal from '../../components/ClientFormModal.jsx';
import CardProgress from '../../components/CardProgress.jsx';
import Fab from '../../components/Fab.jsx';
import { useRegisterHeaderActions } from '../../layout/HeaderActions.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { relativeDay } from '../../utils/time.js';
import { BuildingIcon, PlusIcon } from '../../components/icons.jsx';

const EMPTY_FILTERS = { createdById: '', createdFrom: '', createdTo: '' };

/**
 * `embedded`: hides this page's own title/subtitle when it's nested inside
 * another page's tab (the Groups page's Clients tab) so there isn't a
 * duplicate heading; the "New client space" button moves into the search row instead.
 * `raiseFab`: lifts the FAB above the bottom nav in that same embedded context.
 */
export default function ManageClientsPage({ raiseFab = false, embedded = false } = {}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const members = useSelector(selectMembers);
  const clients = useSelector(selectClients);
  const pagination = useSelector(selectClientsPagination);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState([]);
  const isMobile = useIsMobile();

  // Per-client completion rate, shown as a bar under each card. `reports`
  // already role-scopes client stats to what the caller can see (their
  // tasks' visibility), same as everywhere else.
  useEffect(() => {
    if (!orgId) return;
    organizationsApi
      .reports(orgId)
      .then((r) => setProgress(r.clients))
      .catch(() => setProgress([]));
  }, [orgId]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Any change to the query resets to the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const params = useMemo(
    () => ({ ...filters, q: debouncedSearch || undefined, page, limit: 10 }),
    [filters, debouncedSearch, page]
  );

  useEffect(() => {
    if (orgId) dispatch(fetchClients({ orgId, params }));
  }, [orgId, params, dispatch]);

  useEffect(() => {
    if (orgId && members.length === 0) dispatch(fetchMembers(orgId));
  }, [orgId, members.length, dispatch]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const openFilters = useCallback(() => setDrawerOpen(true), []);
  useRegisterHeaderActions({
    search,
    onSearch: setSearch,
    onOpenFilters: openFilters,
    filterCount: activeFilterCount,
  });

  if (!org) {
    return (
      <div className="page">
        <EmptyState
          icon={<BuildingIcon size={30} />}
          title="No workspace selected"
          description="Pick a workspace to manage its clients."
        />
      </div>
    );
  }

  // A client belongs to exactly one space and cannot create others — the list
  // they see is their own space alone, so a create button here would only ever
  // produce a space they immediately lose sight of.
  const canCreate = !isClientRole(org?.role);

  const newClientBtn = canCreate ? (
    <button className="btn btn--sm" onClick={() => setCreating(true)}>
      <PlusIcon size={16} /> New client space
    </button>
  ) : null;

  return (
    <div className="page">
      {!embedded && (
        <div className="page__head page__head--row">
          <div className="page__head-text">
            <h1 className="page__title">Client Spaces</h1>
            <p className="page__subtitle">A space per client in {org.name}. Anyone can add one.</p>
          </div>
          {/* Desktop keeps the inline button; mobile uses the FAB below. */}
          {!isMobile && <div className="head-actions">{newClientBtn}</div>}
        </div>
      )}

      <div className="list-controls">
        <TaskSearchBar
          search={search}
          onSearch={setSearch}
          onOpenFilters={openFilters}
          activeCount={activeFilterCount}
          placeholder="Search clients by name…"
        />
        {/* Embedded (Groups > Clients tab): no head row above, so the create
            button lives here instead. */}
        {embedded && !isMobile && newClientBtn}
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<BuildingIcon size={30} />}
          title="No clients found"
          description="Add a client so tasks can be grouped under it."
          action={newClientBtn}
        />
      ) : (
        <>
          <div className="channel-grid">
            {clients.map((c) => {
              const cp = progress.find((x) => x.id === c.id);
              return (
                <button key={c.id} className="channel-card" onClick={() => navigate(`/clients/${c.id}`)}>
                  <div className="channel-card__hash">
                    <BuildingIcon size={20} />
                  </div>
                  <div className="channel-card__body">
                    <div className="channel-card__name">{c.name}</div>
                    <div className="channel-card__meta">
                      {c.taskCount} task{c.taskCount === 1 ? '' : 's'} · {relativeDay(c.createdAt)}
                    </div>
                    {cp && <CardProgress rate={cp.completionRate} />}
                  </div>
                </button>
              );
            })}
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onChange={setPage}
          />
        </>
      )}

      {/* Sub-page (no bottom nav) — the FAB sits at the bottom, not raised.
          `raiseFab` lifts it above the bottom nav when embedded in a root
          page (e.g. the Groups page's Clients tab). */}
      {/* The FAB is the mobile route to the same action, so it needs the same
          gate — otherwise a client could still create a space from a phone. */}
      {canCreate && (
        <Fab raised={raiseFab} label="New client space" onClick={() => setCreating(true)} />
      )}

      <ClientFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        value={filters}
        onApply={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
        members={members}
      />

      {creating && (
        <ClientFormModal
          orgId={orgId}
          onClose={() => setCreating(false)}
          onSaved={() => dispatch(fetchClients({ orgId, params }))}
        />
      )}
    </div>
  );
}
