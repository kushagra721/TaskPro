import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectOrgs,
  selectCurrentOrgId,
  setCurrentOrg,
  fetchMyOrgs,
  deleteOrg,
  leaveOrg,
} from '../../store/slices/orgSlice.js';
import { organizationsApi } from '../../api/client.js';
import { joinOrgRoom } from '../../realtime/socket.js';
import EmptyState from '../../components/EmptyState.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmNameModal from '../../components/ConfirmNameModal.jsx';
import OrgBadge from '../../components/OrgBadge.jsx';
import PhotoPicker from '../../components/PhotoPicker.jsx';
import { BuildingIcon, EditIcon, ChevronRightIcon, TrashIcon, LogoutIcon } from '../../components/icons.jsx';

// A small palette beats a free-text emoji field on mobile keyboards.
const ICON_CHOICES = ['🏢', '🚀', '💼', '⭐', '🔥', '🌱', '🎯', '💡', '📦', '🛠️', '🎨', '🧩'];

export default function ManageOrganizationsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const orgs = useSelector(selectOrgs);
  const currentId = useSelector(selectCurrentOrgId);
  const [editing, setEditing] = useState(null);
  const [deletingOrg, setDeletingOrg] = useState(null);
  const [leavingOrg, setLeavingOrg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  // Managing members always acts on the *current* org, so switch first.
  const goToMembers = (org) => {
    if (org.id !== currentId) {
      dispatch(setCurrentOrg(org.id));
      joinOrgRoom(org.id);
    }
    navigate('/more/members');
  };

  const doDeleteOrg = async () => {
    setBusy(true);
    setActionError('');
    try {
      await dispatch(deleteOrg({ orgId: deletingOrg.id, confirmName: deletingOrg.name })).unwrap();
      setDeletingOrg(null);
    } catch (err) {
      setActionError(err.message || 'Could not delete the organization');
    } finally {
      setBusy(false);
    }
  };

  const doLeaveOrg = async () => {
    setBusy(true);
    setActionError('');
    try {
      await dispatch(leaveOrg({ orgId: leavingOrg.id, confirmName: leavingOrg.name })).unwrap();
      setLeavingOrg(null);
    } catch (err) {
      setActionError(err.message || 'Could not leave the organization');
    } finally {
      setBusy(false);
    }
  };

  if (orgs.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon={<BuildingIcon size={30} />}
          title="No organizations yet"
          description="Create or join an organization from the switcher to see it here."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <h1 className="page__title">Manage Organizations</h1>
          <p className="page__subtitle">Every organization you belong to.</p>
        </div>
      </div>

      <div className="org-list">
        {orgs.map((o) => {
          const isAdmin = o.role === 'ADMIN';
          return (
            <div key={o.id} className={`org-row ${o.id === currentId ? 'org-row--current' : ''}`}>
              <OrgBadge name={o.name} icon={o.icon} photoUrl={o.photoUrl} size="lg" />
              <div className="org-row__info">
                <div className="org-row__name">
                  <span className="org-row__name-text">{o.name}</span>
                  {o.id === currentId && <span className="tag">Current</span>}
                </div>
                <div className="org-row__meta">
                  <span className={`role-pill role-pill--${o.role.toLowerCase()}`}>{o.role}</span>
                </div>
              </div>
              <div className="org-row__actions">
                {/* Only admins can rename or re-icon an organization. */}
                {isAdmin && (
                  <button className="mini-btn" onClick={() => setEditing(o)}>
                    <EditIcon size={13} /> Edit
                  </button>
                )}
                {isAdmin && (
                  <button className="mini-btn mini-btn--primary" onClick={() => goToMembers(o)}>
                    Members <ChevronRightIcon size={13} />
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="mini-btn mini-btn--danger"
                    onClick={() => {
                      setActionError('');
                      setDeletingOrg(o);
                    }}
                  >
                    <TrashIcon size={13} /> Delete
                  </button>
                )}
                <button
                  className="mini-btn mini-btn--danger"
                  onClick={() => {
                    setActionError('');
                    setLeavingOrg(o);
                  }}
                >
                  <LogoutIcon size={13} /> Leave
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <EditOrgModal
          org={editing}
          onClose={() => setEditing(null)}
          onSaved={() => dispatch(fetchMyOrgs())}
        />
      )}

      {deletingOrg && (
        <ConfirmNameModal
          title="Delete organization"
          entityName={deletingOrg.name}
          busy={busy}
          error={actionError}
          onConfirm={doDeleteOrg}
          onClose={() => !busy && setDeletingOrg(null)}
          confirmLabel={<><TrashIcon size={16} /> Delete organization</>}
        >
          <p className="modal__intro">
            Delete <strong>&ldquo;{deletingOrg.name}&rdquo;</strong>? This permanently deletes everything in
            this organization:
          </p>
          <ul className="modal__list">
            <li>Every group, its chat messages and timeline activity</li>
            <li>Every task, project and client</li>
            <li>Every member's access to this organization</li>
            <li>Every invitation and join request</li>
          </ul>
          <p className="modal__intro">This can&apos;t be undone.</p>
        </ConfirmNameModal>
      )}

      {leavingOrg && (
        <ConfirmNameModal
          title="Leave organization"
          entityName={leavingOrg.name}
          busy={busy}
          error={actionError}
          onConfirm={doLeaveOrg}
          onClose={() => !busy && setLeavingOrg(null)}
          danger={false}
          confirmLabel="Leave organization"
        >
          <p className="modal__intro">
            Leave <strong>&ldquo;{leavingOrg.name}&rdquo;</strong>?
            {leavingOrg.role === 'ADMIN'
              ? ' You are an admin — if you are the only one, the oldest remaining member will automatically become admin.'
              : ''}{' '}
            If you are the only member left, the organization will be deleted entirely.
          </p>
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
      setError(err.message || 'Could not save the organization');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit organization" onClose={onClose}>
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
