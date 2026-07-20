import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectOrgs, selectCurrentOrgId, setCurrentOrg, fetchMyOrgs } from '../../store/slices/orgSlice.js';
import { organizationsApi } from '../../api/client.js';
import { joinOrgRoom } from '../../realtime/socket.js';
import EmptyState from '../../components/EmptyState.jsx';
import Modal from '../../components/Modal.jsx';
import { BuildingIcon, EditIcon, ChevronRightIcon } from '../../components/icons.jsx';

// A small palette beats a free-text emoji field on mobile keyboards.
const ICON_CHOICES = ['🏢', '🚀', '💼', '⭐', '🔥', '🌱', '🎯', '💡', '📦', '🛠️', '🎨', '🧩'];

export default function ManageOrganizationsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const orgs = useSelector(selectOrgs);
  const currentId = useSelector(selectCurrentOrgId);
  const [editing, setEditing] = useState(null);

  // Managing members always acts on the *current* org, so switch first.
  const goToMembers = (org) => {
    if (org.id !== currentId) {
      dispatch(setCurrentOrg(org.id));
      joinOrgRoom(org.id);
    }
    navigate('/more/members');
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
              <span className="org-badge lg">{o.icon || o.name[0].toUpperCase()}</span>
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
    </div>
  );
}

function EditOrgModal({ org, onClose, onSaved }) {
  const [name, setName] = useState(org.name);
  const [icon, setIcon] = useState(org.icon || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await organizationsApi.update(org.id, { name: name.trim(), icon });
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
