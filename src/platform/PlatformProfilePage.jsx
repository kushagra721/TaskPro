import { useDispatch, useSelector } from 'react-redux';
import { selectPlatformUser, platformLogout } from '../store/slices/platformAuthSlice.js';
import { LogoutIcon } from '../components/icons.jsx';

const ROLE_LABEL = { SUPER_ADMIN: 'Super Admin', RESELLER: 'Reseller' };

export default function PlatformProfilePage() {
  const dispatch = useDispatch();
  const platformUser = useSelector(selectPlatformUser);
  const roleLabel = ROLE_LABEL[platformUser?.role] || platformUser?.role;

  return (
    <div className="page">
      <div className="panel platform-list-card" style={{ maxWidth: 560 }}>
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <h2 className="platform-list-card__title">Profile</h2>
            <p className="platform-list-card__subtitle">Your platform account details.</p>
          </div>
        </div>

        <div className="user-profile__card">
          <span className="org-badge lg">{(platformUser?.name || '?')[0].toUpperCase()}</span>
          <div className="user-profile__name">{platformUser?.name}</div>
          <div className="user-profile__email">{platformUser?.email}</div>
          <div className="user-profile__tags">
            <span className="status-pill status-pill--completed">{roleLabel}</span>
          </div>
        </div>

        <button type="button" className="btn btn--danger" onClick={() => dispatch(platformLogout())}>
          <LogoutIcon size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}
