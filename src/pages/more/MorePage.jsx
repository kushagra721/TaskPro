import { Link, useOutletContext } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  UserIcon,
  BuildingIcon,
  MailIcon,
  ActivityIcon,
  CreditCardIcon,
  DatabaseIcon,
  ReportsIcon,
  LogoutIcon,
  ChevronRightIcon,
} from '../../components/icons.jsx';
import { selectInvitationCount } from '../../store/slices/invitationSlice.js';
import { selectCurrentOrg, resetOrgs } from '../../store/slices/orgSlice.js';
import { logout } from '../../store/slices/authSlice.js';
import { resetProjects } from '../../store/slices/projectSlice.js';
import { resetClients } from '../../store/slices/clientSlice.js';
import { isAdminRole, isClientRole } from '../../utils/role.js';
import OrgSwitcher from '../../layout/OrgSwitcher.jsx';

export default function MorePage() {
  const dispatch = useDispatch();
  const invitationCount = useSelector(selectInvitationCount);
  const org = useSelector(selectCurrentOrg);
  const isAdmin = isAdminRole(org?.role);
  const isClient = isClientRole(org?.role);
  // `AppLayout` owns the create/find-workspace modal and hands it down through
  // the Outlet, so this page can offer it without a second copy.
  const { openCreateOrg } = useOutletContext() || {};

  const doLogout = () => {
    dispatch(logout());
    dispatch(resetOrgs());
    dispatch(resetProjects());
    dispatch(resetClients());
  };

  const items = [
    { to: '/more/profile', label: 'My Profile', desc: 'Your name and account', Icon: UserIcon },
    {
      to: '/more/organizations',
      // The current workspace's own name, not a generic "Workspace" label —
      // falls back to the generic label only in the split second before
      // `org` has loaded.
      label: org?.name || 'Workspace',
      desc: 'Details & settings for your current workspace',
      Icon: BuildingIcon,
    },
    // Hidden from a CLIENT. The workspace activity feed quotes task titles and
    // names members joining, renaming and creating things across channels the
    // client is not in — the supplier's internal history, not the customer's.
    // The feed IS viewer-scoped server-side, so this is not the security
    // boundary; it is a menu entry that would lead an external party to a page
    // about somebody else's business.
    ...(isClient
      ? []
      : [{ to: '/more/activities', label: 'All Activities', desc: 'Recent activity in your workspace', Icon: ActivityIcon }]),
    { to: '/more/reports', label: 'Reports', desc: 'Progress across your workspace', Icon: ReportsIcon },
    // Plans & Billing and the Storage report are both admin-only — mirroring
    // `requireOrgAdmin` on their APIs, so a member never sees an entry that
    // would 403 on open.
    ...(isAdmin
      ? [
          {
            to: '/more/billing',
            label: 'Plans & Billing',
            desc: 'Your plan, task quota and invoice details',
            Icon: CreditCardIcon,
          },
          { to: '/more/storage', label: 'Storage', desc: 'Media uploaded by every member', Icon: DatabaseIcon },
        ]
      : []),
    // Also hidden from a CLIENT: approvals are the workspace's own joining
    // decisions.
    ...(isClient
      ? []
      : [
          {
            to: '/more/invitations',
            label: 'Pending Approvals',
            desc: 'Invitations waiting for you',
            Icon: MailIcon,
            badge: invitationCount,
          },
        ]),
  ];

  return (
    <div className="page">
      {/* Workspace, moved off the sidebar.
          Switching workspace is an occasional ACCOUNT action, not one of the
          five places the nav exists to reach — so it belongs with Profile and
          Sign out rather than above them. It leads the page because it decides
          what every entry below it refers to. */}
      <section className="more-workspace">
        <div className="more-workspace__head">
          <span className="more-workspace__label">Workspace</span>
          <span className="more-workspace__hint">Switch between your workspaces</span>
        </div>
        <OrgSwitcher onCreate={() => openCreateOrg?.()} />
      </section>

      <div className="menu-list">
        {items.map(({ to, label, desc, Icon, badge }) => (
          <Link key={to} to={to} className="menu-item">
            <span className="menu-item__icon">
              <Icon size={20} />
            </span>
            <span className="menu-item__text">
              <span className="menu-item__label">{label}</span>
              <span className="menu-item__desc">{desc}</span>
            </span>
            {badge > 0 && <span className="menu-item__badge">{badge}</span>}
            <ChevronRightIcon size={18} />
          </Link>
        ))}

        {/* The sidebar owns logout on desktop; mobile needs it here. */}
        <button className="menu-item menu-item--danger" onClick={doLogout}>
          <span className="menu-item__icon">
            <LogoutIcon size={20} />
          </span>
          <span className="menu-item__text">
            <span className="menu-item__label">Log out</span>
            <span className="menu-item__desc">Sign out of Task Pro on this device</span>
          </span>
        </button>
      </div>
    </div>
  );
}
