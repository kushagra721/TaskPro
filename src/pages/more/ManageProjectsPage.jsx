import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentOrg, selectCurrentOrgId } from '../../store/slices/orgSlice.js';
import { fetchProjects, selectProjects, selectProjectsPagination } from '../../store/slices/projectSlice.js';
import { organizationsApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import Pagination from '../../components/Pagination.jsx';
import TaskSearchBar from '../../components/TaskSearchBar.jsx';
import ProjectFilterDrawer from '../../components/ProjectFilterDrawer.jsx';
import ProjectFormModal from '../../components/ProjectFormModal.jsx';
import CardProgress from '../../components/CardProgress.jsx';
import Fab from '../../components/Fab.jsx';
import { useRegisterHeaderActions } from '../../layout/HeaderActions.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { relativeDay } from '../../utils/time.js';
import { FolderIcon, PlusIcon } from '../../components/icons.jsx';

const EMPTY_FILTERS = { createdFrom: '', createdTo: '' };

/**
 * `embedded`: hides this page's own title/subtitle when it's nested inside
 * another page's tab (the Groups page's Projects tab) so there isn't a
 * duplicate heading; the "New project" button moves into the search row instead.
 * `raiseFab`: lifts the FAB above the bottom nav in that same embedded context.
 */
export default function ManageProjectsPage({ raiseFab = false, embedded = false } = {}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const projects = useSelector(selectProjects);
  const pagination = useSelector(selectProjectsPagination);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState([]);
  const isMobile = useIsMobile();

  // Per-project completion rate, shown as a bar under each card. `reports`
  // already role-scopes project stats to what the caller can see (their
  // tasks' visibility), same as everywhere else.
  useEffect(() => {
    if (!orgId) return;
    organizationsApi
      .reports(orgId)
      .then((r) => setProgress(r.projects))
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
    if (orgId) dispatch(fetchProjects({ orgId, params }));
  }, [orgId, params, dispatch]);

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
          icon={<FolderIcon size={30} />}
          title="No workspace selected"
          description="Pick a workspace to manage its projects."
        />
      </div>
    );
  }

  const newProjectBtn = (
    <button className="btn btn--sm" onClick={() => setCreating(true)}>
      <PlusIcon size={16} /> New project
    </button>
  );

  return (
    <div className="page">
      {!embedded && (
        <div className="page__head page__head--row">
          <div className="page__head-text">
            <h1 className="page__title">Manage Projects</h1>
            <p className="page__subtitle">Projects in {org.name}. Anyone can add one.</p>
          </div>
          {/* Desktop keeps the inline button; mobile uses the FAB below. */}
          {!isMobile && <div className="head-actions">{newProjectBtn}</div>}
        </div>
      )}

      <div className="list-controls">
        <TaskSearchBar
          search={search}
          onSearch={setSearch}
          onOpenFilters={openFilters}
          activeCount={activeFilterCount}
          placeholder="Search projects by name…"
        />
        {/* Embedded (Groups > Projects tab): no head row above, so the create
            button lives here instead. */}
        {embedded && !isMobile && newProjectBtn}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderIcon size={30} />}
          title="No projects found"
          description="Create a project so tasks can be grouped under it."
          action={newProjectBtn}
        />
      ) : (
        <>
          <div className="channel-grid">
            {projects.map((p) => {
              const pp = progress.find((x) => x.id === p.id);
              return (
                <button key={p.id} className="channel-card" onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="channel-card__hash">
                    <FolderIcon size={20} />
                  </div>
                  <div className="channel-card__body">
                    <div className="channel-card__name">{p.name}</div>
                    <div className="channel-card__meta">
                      {p.taskCount} task{p.taskCount === 1 ? '' : 's'} · {relativeDay(p.createdAt)}
                    </div>
                    {pp && <CardProgress rate={pp.completionRate} />}
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
          page (e.g. the Groups page's Projects tab). */}
      <Fab raised={raiseFab} label="New project" onClick={() => setCreating(true)} />

      <ProjectFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        value={filters}
        onApply={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      {creating && (
        <ProjectFormModal
          orgId={orgId}
          onClose={() => setCreating(false)}
          onSaved={() => dispatch(fetchProjects({ orgId, params }))}
        />
      )}
    </div>
  );
}
