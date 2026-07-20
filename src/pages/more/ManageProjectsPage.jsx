import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentOrg, selectCurrentOrgId } from '../../store/slices/orgSlice.js';
import { selectUser } from '../../store/slices/authSlice.js';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  selectProjects,
  selectProjectsPagination,
} from '../../store/slices/projectSlice.js';
import EmptyState from '../../components/EmptyState.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import TaskSearchBar from '../../components/TaskSearchBar.jsx';
import ProjectFilterDrawer from '../../components/ProjectFilterDrawer.jsx';
import Fab from '../../components/Fab.jsx';
import { useRegisterHeaderActions } from '../../layout/HeaderActions.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { relativeDay } from '../../utils/time.js';
import { FolderIcon, PlusIcon, EditIcon, TrashIcon } from '../../components/icons.jsx';

const EMPTY_FILTERS = { createdFrom: '', createdTo: '' };

export default function ManageProjectsPage() {
  const dispatch = useDispatch();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const user = useSelector(selectUser);
  const projects = useSelector(selectProjects);
  const pagination = useSelector(selectProjectsPagination);
  const isAdmin = org?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | project
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

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

  const remove = async (p) => {
    setError('');
    try {
      await dispatch(deleteProject({ orgId, projectId: p.id })).unwrap();
      dispatch(fetchProjects({ orgId, params }));
    } catch (err) {
      setError(err.message || 'Could not delete the project');
    }
  };

  if (!org) {
    return (
      <div className="page">
        <EmptyState
          icon={<FolderIcon size={30} />}
          title="No organization selected"
          description="Pick an organization to manage its projects."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Manage Projects</h1>
          <p className="page__subtitle">Projects in {org.name}. Anyone can add one.</p>
        </div>
        {/* Desktop keeps the inline button; mobile uses the FAB below. */}
        {!isMobile && (
          <div className="head-actions">
            <button className="btn btn--sm" onClick={() => setEditing('new')}>
              <PlusIcon size={16} /> New project
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="list-controls">
        <TaskSearchBar
          search={search}
          onSearch={setSearch}
          onOpenFilters={openFilters}
          activeCount={activeFilterCount}
          placeholder="Search projects by name…"
        />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderIcon size={30} />}
          title="No projects found"
          description="Create a project so tasks can be grouped under it."
          action={
            <button className="btn btn--sm" onClick={() => setEditing('new')}>
              <PlusIcon size={16} /> New project
            </button>
          }
        />
      ) : (
        <>
          <div className="project-list">
            {projects.map((p) => {
              // Only the creator or an admin may edit — mirrors the API rule.
              const canEdit = isAdmin || p.createdBy?.id === user?.id;
              return (
                <div key={p.id} className="project-card">
                  <span className="project-card__icon">
                    <FolderIcon size={18} />
                  </span>
                  <div className="project-card__body">
                    <div className="project-card__name">{p.name}</div>
                    {p.description && <div className="project-card__desc">{p.description}</div>}
                    <div className="project-card__meta">
                      {p.taskCount} task{p.taskCount === 1 ? '' : 's'} · by{' '}
                      {p.createdBy?.name || p.createdBy?.email || 'someone'} · {relativeDay(p.createdAt)}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="project-card__actions">
                      <button className="mini-btn" onClick={() => setEditing(p)}>
                        <EditIcon size={13} /> Edit
                      </button>
                      <button className="mini-btn mini-btn--danger" onClick={() => remove(p)}>
                        <TrashIcon size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
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

      {/* Sub-page (no bottom nav) — the FAB sits at the bottom, not raised. */}
      <Fab label="New project" onClick={() => setEditing('new')} />

      <ProjectFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        value={filters}
        onApply={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      {editing && (
        <ProjectFormModal
          orgId={orgId}
          project={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => dispatch(fetchProjects({ orgId, params }))}
        />
      )}
    </div>
  );
}

/** Create/edit form — the same fields either way. */
function ProjectFormModal({ orgId, project, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = { name: name.trim(), description: description.trim() };
      if (project) await dispatch(updateProject({ orgId, projectId: project.id, ...payload })).unwrap();
      else await dispatch(createProject({ orgId, ...payload })).unwrap();
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save the project');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="field">
          <label className="field__label">Name</label>
          <input
            className="input"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Website revamp"
          />
        </div>
        <div className="field">
          <label className="field__label">Description (optional)</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
          />
        </div>
        <button className="btn" type="submit" disabled={busy || name.trim().length < 2}>
          {busy ? <span className="spinner" /> : project ? 'Save changes' : 'Create project'}
        </button>
      </form>
    </Modal>
  );
}
