import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCurrentOrg,
  selectCurrentOrgId,
  selectOrgs,
  setCurrentOrg,
} from '../store/slices/orgSlice.js';
import { joinOrgRoom } from '../realtime/socket.js';
import NotificationsBell from './NotificationsBell.jsx';
import { ChevronDownIcon, PlusIcon, CheckIcon } from '../components/icons.jsx';

export default function Topbar({ title, onCreateOrg }) {
  const dispatch = useDispatch();
  const org = useSelector(selectCurrentOrg);
  const orgs = useSelector(selectOrgs);
  const currentId = useSelector(selectCurrentOrgId);
  const [open, setOpen] = useState(false);

  const pick = (id) => {
    dispatch(setCurrentOrg(id));
    joinOrgRoom(id);
    setOpen(false);
  };

  return (
    <header className="topbar">
      <div className="topbar__left">
        <span className="topbar__mobile-brand brand__logo-mark">✓</span>
        <div className="topbar__titles">
          <div className="topbar__title">{title}</div>
          {/* Org name is a plain label on desktop, a switcher button on mobile */}
          <button className="topbar__org topbar__org--btn" onClick={() => setOpen((o) => !o)}>
            {org?.name || 'No organization'}
            <ChevronDownIcon size={14} />
          </button>
        </div>

        {open && (
          <>
            <div className="dropdown-backdrop" onClick={() => setOpen(false)} />
            <div className="dropdown topbar__org-menu">
              <div className="dropdown__label">Your organizations</div>
              {orgs.length === 0 && <div className="dropdown__empty">None yet</div>}
              {orgs.map((o) => (
                <button key={o.id} className="dropdown__item" onClick={() => pick(o.id)}>
                  <span className="org-badge sm">{o.name[0].toUpperCase()}</span>
                  <span className="dropdown__item-text">{o.name}</span>
                  {o.id === currentId && <CheckIcon size={16} />}
                </button>
              ))}
              <div className="dropdown__sep" />
              <button
                className="dropdown__item"
                onClick={() => {
                  setOpen(false);
                  onCreateOrg?.();
                }}
              >
                <span className="org-badge sm ghost">
                  <PlusIcon size={14} />
                </span>
                <span className="dropdown__item-text">Create / search organizations</span>
              </button>
            </div>
          </>
        )}
      </div>
      <div className="topbar__right">
        <NotificationsBell />
      </div>
    </header>
  );
}
