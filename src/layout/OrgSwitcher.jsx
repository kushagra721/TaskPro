import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectOrgs, selectCurrentOrg, setCurrentOrg } from '../store/slices/orgSlice.js';
import { joinOrgRoom } from '../realtime/socket.js';
import { ChevronDownIcon, PlusIcon, CheckIcon } from '../components/icons.jsx';
import OrgBadge from '../components/OrgBadge.jsx';

export default function OrgSwitcher({ onCreate }) {
  const dispatch = useDispatch();
  const orgs = useSelector(selectOrgs);
  const current = useSelector(selectCurrentOrg);
  const [open, setOpen] = useState(false);

  const pick = (id) => {
    dispatch(setCurrentOrg(id));
    joinOrgRoom(id);
    setOpen(false);
  };

  return (
    <div className="org-switcher">
      <button className="org-switcher__btn" onClick={() => setOpen((o) => !o)}>
        <OrgBadge name={current?.name || 'T'} icon={current?.icon} photoUrl={current?.photoUrl} />
        <span className="org-switcher__name">{current?.name || 'No workspace'}</span>
        <ChevronDownIcon size={16} />
      </button>

      {open && (
        <>
          <div className="dropdown-backdrop" onClick={() => setOpen(false)} />
          <div className="dropdown org-switcher__menu">
            <div className="dropdown__label">Your workspaces</div>
            {orgs.length === 0 && <div className="dropdown__empty">None yet</div>}
            {orgs.map((o) => (
              <button key={o.id} className="dropdown__item" onClick={() => pick(o.id)}>
                <OrgBadge name={o.name} icon={o.icon} photoUrl={o.photoUrl} size="sm" />
                <span className="dropdown__item-text">{o.name}</span>
                {o.id === current?.id && <CheckIcon size={16} />}
              </button>
            ))}
            <div className="dropdown__sep" />
            <button
              className="dropdown__item"
              onClick={() => {
                setOpen(false);
                onCreate();
              }}
            >
              <span className="org-badge sm ghost">
                <PlusIcon size={14} />
              </span>
              <span className="dropdown__item-text">Create / search workspaces</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
