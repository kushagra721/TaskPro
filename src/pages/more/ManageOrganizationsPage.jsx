import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCurrentOrgId,
  setCurrentOrg,
  fetchMyOrgs,
  deleteOrg,
  leaveOrg,
} from '../../store/slices/orgSlice.js';
import { organizationsApi, tasksApi, projectsApi, clientsApi, groupsApi } from '../../api/client.js';
import { joinOrgRoom } from '../../realtime/socket.js';
import { isAdminRole } from '../../utils/role.js';
import EmptyState from '../../components/EmptyState.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmNameModal from '../../components/ConfirmNameModal.jsx';
import Select from '../../components/Select.jsx';
import OrgBadge from '../../components/OrgBadge.jsx';
import PhotoPicker from '../../components/PhotoPicker.jsx';
import {
  EditIcon,
  ChevronRightIcon,
  TrashIcon,
  LogoutIcon,
  UserIcon,
  GroupsIcon,
  TaskIcon,
  FolderIcon,
  BuildingIcon,
} from '../../components/icons.jsx';
import { relativeDay } from '../../utils/time.js';

const ICON_CHOICES = ['🏢', '🚀', '💼', '⭐', '🔥', '🌱', '🎯', '💡', '📦', '🛠️', '🎨', '🧩'];

const emptyStats = { memberCount: 0, groupCount: 0, openTasks: 0, projectCount: 0, clientCount: 0 };

export default function ManageOrganizationsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const orgId = useSelector(selectCurrentOrgId);

  const [org, setOrg] = useState(null);
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const [ownerAdmins, setOwnerAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');

  const load = () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    organizationsApi
      .get(orgId)
      .then((orgRes) => {
        setOrg(orgRes.organization);
        const admin = isAdminRole(orgRes.organization.role);
        // Members only ever see their own groups + the tasks in them — both
        // `groupsApi.listForOrg` and `tasksApi.listForOrg` already scope down
        // to the caller's groups for non-admins, so the same calls work for
        // both roles. Members/projects/clients counts are admin/owner-only.
        return Promise.all([
          groupsApi.listForOrg(orgId),
          tasksApi.listForOrg(orgId, { limit: 1 }),
          admin ? projectsApi.list(orgId, { limit: 1 }) : Promise.resolve(null),
          admin ? clientsApi.list(orgId, { limit: 1 }) : Promise.resolve(null),
        ]).then(([groupRes, taskRes, projectRes, clientRes]) => {
          setStats({
            memberCount: orgRes.organization.memberCount ?? 0,
            groupCount: groupRes.groups?.length ?? 0,
            openTasks: taskRes.counts?.OPEN ?? 0,
            projectCount: projectRes?.pagination?.total ?? 0,
            clientCount: clientRes?.pagination?.total ?? 0,
          });
        });
      })
      .catch((err) => setLoadError(err.message || 'Could not load this workspace'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  useEffect(() => {
    if (!leaving || org?.role !== 'OWNER') {
      setOwnerAdmins([]);
      setNewOwnerId('');
      return;
    }
    setLoadingAdmins(true);
    organizationsApi
      .members(orgId)
      .then((r) => setOwnerAdmins(r.members.filter((m) => m.role === 'ADMIN')))
      .catch(() => setOwnerAdmins([]))
      .finally(() => setLoadingAdmins(false));
  }, [leaving, org, orgId]);

  const isAdmin = isAdminRole(org?.role);
  const isOwner = org?.role === 'OWNER';

  const goToMembers = () => navigate('/groups?tab=members');

  const doDelete = async () => {
    setBusy(true);
    setActionError('');
    try {
      await dispatch(deleteOrg({ orgId, confirmName: org.name })).unwrap();
      setDeleting(false);
    } catch (err) {
      setActionError(err.message || 'Could not delete the workspace');
    } finally {
      setBusy(false);
    }
  };

  const doLeave = async () => {
    setBusy(true);
    setActionError('');
    try {
      await dispatch(leaveOrg({ orgId, confirmName: org.name, newOwnerUserId: newOwnerId || undefined })).unwrap();
      setLeaving(false);
    } catch (err) {
      setActionError(err.message || 'Could not leave the workspace');
    } finally {
      setBusy(false);
    }
  };

  const leaveExtraValid = org?.role !== 'OWNER' || (!loadingAdmins && (ownerAdmins.length === 0 || Boolean(newOwnerId)));

  if (!orgId) {
    return (
      <div className="page">
        <EmptyState
          icon={<BuildingIcon size={30} />}
          title="No workspace selected"
          description="Create or join a workspace from the switcher to see its details here."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="screen-center" style={{ minHeight: '40vh' }}>
          <span className="spinner" />
        </div>
      </div>
    );
  }

  if (loadError || !org) {
    return (
      <div className="page">
        <EmptyState icon={<BuildingIcon size={30} />} title="Workspace not found" description={loadError} />
      </div>
    );
  }

  return (
    <div className="page">
      {actionError && <div className="alert alert--error">{actionError}</div>}

      <div className="org-detail-head">
        <OrgBadge name={org.name} icon={org.icon} photoUrl={org.photoUrl} size="lg" />
        <div className="org-detail-head__info">
          <div className="org-detail-head__name-row">
            <h1 className="org-detail-head__name">{org.name}</h1>
            <span className={`role-pill role-pill--${org.role.toLowerCase()}`}>{org.role}</span>
          </div>
          <p className="project-detail__meta">Created {relativeDay(org.createdAt)}</p>
        </div>
        {isOwner && (
          <button className="icon-btn" onClick={() => setEditing(true)} title="Edit workspace" aria-label="Edit workspace">
            <EditIcon size={15} />
          </button>
        )}
      </div>

      <div className="org-stat-grid">
        {isAdmin && (
          <div className="org-stat org-stat--indigo">
            <span className="org-stat__icon"><UserIcon size={19} /></span>
            <div>
              <div className="org-stat__value">{stats.memberCount}</div>
              <div className="org-stat__label">Members</div>
            </div>
          </div>
        )}
        <div className="org-stat org-stat--violet">
          <span className="org-stat__icon"><GroupsIcon size={19} /></span>
          <div>
            <div className="org-stat__value">{stats.groupCount}</div>
            <div className="org-stat__label">{isAdmin ? 'Groups' : 'Your groups'}</div>
          </div>
        </div>
        <div className="org-stat org-stat--amber">
          <span className="org-stat__icon"><TaskIcon size={19} /></span>
          <div>
            <div className="org-stat__value">{stats.openTasks}</div>
            <div className="org-stat__label">Open tasks</div>
          </div>
        </div>
        {isAdmin && (
          <div className="org-stat org-stat--emerald">
            <span className="org-stat__icon"><FolderIcon size={19} /></span>
            <div>
              <div className="org-stat__value">{stats.projectCount}</div>
              <div className="org-stat__label">Projects</div>
            </div>
          </div>
        )}
        {isAdmin && (
          <div className="org-stat org-stat--sky">
            <span className="org-stat__icon"><BuildingIcon size={19} /></span>
            <div>
              <div className="org-stat__value">{stats.clientCount}</div>
              <div className="org-stat__label">Clients</div>
            </div>
          </div>
        )}
      </div>

      <div className="menu-list">
        {isAdmin && (
          <button className="menu-item" onClick={goToMembers}>
            <span className="menu-item__icon">
              <UserIcon size={20} />
            </span>
            <span className="menu-item__text">
              <span className="menu-item__label">Members</span>
              <span className="menu-item__desc">View and manage who's in this workspace</span>
            </span>
            <ChevronRightIcon size={18} />
          </button>
        )}

        {isOwner && (
          <button
            className="menu-item menu-item--danger"
            onClick={() => {
              setActionError('');
              setDeleting(true);
            }}
          >
            <span className="menu-item__icon">
              <TrashIcon size={20} />
            </span>
            <span className="menu-item__text">
              <span className="menu-item__label">Delete workspace</span>
              <span className="menu-item__desc">Permanently delete this workspace and everything in it</span>
            </span>
          </button>
        )}

        <button
          className="menu-item menu-item--danger"
          onClick={() => {
            setActionError('');
            setLeaving(true);
          }}
        >
          <span className="menu-item__icon">
            <LogoutIcon size={20} />
          </span>
          <span className="menu-item__text">
            <span className="menu-item__label">Leave workspace</span>
            <span className="menu-item__desc">Remove yourself from this workspace</span>
          </span>
        </button>
      </div>

      {editing && (
        <EditOrgModal
          org={org}
          onClose={() => setEditing(false)}
          onSaved={() => {
            load();
            dispatch(fetchMyOrgs());
          }}
        />
      )}

      {deleting && (
        <ConfirmNameModal
          title="Delete workspace"
          entityName={org.name}
          busy={busy}
          error={actionError}
          onConfirm={doDelete}
          onClose={() => !busy && setDeleting(false)}
          confirmLabel={<><TrashIcon size={16} /> Delete workspace</>}
        >
          <p className="modal__intro">
            Delete <strong>&ldquo;{org.name}&rdquo;</strong>? This permanently deletes everything in this workspace:
          </p>
          <ul className="modal__list">
            <li>Every group, its chat messages and timeline activity</li>
            <li>Every task, project and client</li>
            <li>Every member's access to this workspace</li>
            <li>Every invitation and join request</li>
          </ul>
          <p className="modal__intro">This can&apos;t be undone.</p>
        </ConfirmNameModal>
      )}

      {leaving && (
        <ConfirmNameModal
          title="Leave workspace"
          entityName={org.name}
          busy={busy}
          error={actionError}
          extraValid={leaveExtraValid}
          onConfirm={doLeave}
          onClose={() => !busy && setLeaving(false)}
          danger={false}
          confirmLabel="Leave workspace"
        >
          <p className="modal__intro">
            Leave <strong>&ldquo;{org.name}&rdquo;</strong>?
            {org.role === 'ADMIN'
              ? ' You are an admin — if you are the only one, the oldest remaining member will automatically become admin.'
              : ''}{' '}
            If you are the only member left, the workspace will be deleted entirely.
          </p>

          {org.role === 'OWNER' && (
            <div className="field">
              <label className="field__label">New owner</label>
              {loadingAdmins ? (
                <div className="field__hint">Loading admins…</div>
              ) : ownerAdmins.length === 0 ? (
                <p className="field__hint">
                  There are no other admins — the oldest remaining member will automatically become the new owner.
                </p>
              ) : (
                <>
                  <Select
                    value={newOwnerId}
                    onChange={setNewOwnerId}
                    placeholder="Choose an admin to take over"
                    options={ownerAdmins.map((a) => ({ value: a.id, label: a.name || a.email }))}
                  />
                  <span className="field__hint">You're the owner — pick who becomes the new owner before leaving.</span>
                </>
              )}
            </div>
          )}
        </ConfirmNameModal>
      )}
    </div>
  );
}

function EditOrgModal({ org, onClose, onSaved }) {
  const [name, setName] = useState(org.name);
  const [icon, setIcon] = useState(org.icon || '');
  const [photoUrl, setPhotoUrl] = useState(org.photoUrl || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await organizationsApi.update(org.id, { name: name.trim(), icon, photoUrl });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save the workspace');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit workspace" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}

        <div className="field" style={{ alignItems: 'center', display: 'grid', justifyItems: 'center' }}>
          <PhotoPicker onUploaded={setPhotoUrl}>
            <OrgBadge name={name} icon={icon} photoUrl={photoUrl} size="lg" />
          </PhotoPicker>
          {photoUrl && (
            <button
              type="button"
              className="link-btn"
              style={{ marginTop: 8, fontSize: 12.5 }}
              onClick={() => setPhotoUrl('')}
            >
              Remove photo
            </button>
          )}
        </div>

        <div className="field">
          <label className="field__label">Name</label>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label className="field__label">Icon</label>
          <div className="icon-picker">
            <button
              type="button"
              className={`icon-picker__item ${!icon ? 'icon-picker__item--active' : ''}`}
              onClick={() => setIcon('')}
              title="Use the name's first letter"
            >
              {name ? name[0].toUpperCase() : '?'}
            </button>
            {ICON_CHOICES.map((c) => (
              <button
                type="button"
                key={c}
                className={`icon-picker__item ${icon === c ? 'icon-picker__item--active' : ''}`}
                onClick={() => setIcon(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <button className="btn" type="submit" disabled={busy || name.trim().length < 2}>
          {busy ? <span className="spinner" /> : 'Save changes'}
        </button>
      </form>
    </Modal>
  );
}
