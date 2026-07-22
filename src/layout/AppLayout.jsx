import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from './Sidebar.jsx';
import BottomNav from './BottomNav.jsx';
import Topbar from './Topbar.jsx';
import OrgFinderModal from '../components/OrgFinderModal.jsx';
import PendingInvitesGate from '../components/PendingInvitesGate.jsx';
import { HeaderActionsProvider } from './HeaderActions.jsx';
import { fetchMyOrgs, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { fetchGroups } from '../store/slices/groupSlice.js';
import { fetchNotifications } from '../store/slices/notificationSlice.js';
import { fetchMyInvitations } from '../store/slices/invitationSlice.js';
import { fetchIncomingJoinRequests } from '../store/slices/joinRequestSlice.js';

const TITLES = [
  { match: '/dashboard', title: 'Home' },
  { match: '/groups', title: 'Groups' },
  { match: '/tasks/', title: 'Task Details' },
  { match: '/tasks', title: 'Tasks' },
  { match: '/projects/', title: 'Project Details' },
  { match: '/reports', title: 'Reports' },
  { match: '/more/profile', title: 'My Profile' },
  { match: '/more/members/', title: 'Member Details' },
  { match: '/more/members', title: 'Manage Members' },
  { match: '/more/storage', title: 'Storage' },
  { match: '/more/organizations', title: 'Manage Organizations' },
  { match: '/more/projects', title: 'Manage Projects' },
  { match: '/more/activities', title: 'All Activities' },
  { match: '/more/invitations', title: 'Invitation Requests' },
  { match: '/more', title: 'More' },
];

// Exact paths that are bottom-nav destinations (not their drill-down children).
const ROOT_PATHS = ['/dashboard', '/groups', '/tasks', '/reports', '/more'];

export default function AppLayout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const currentOrgId = useSelector(selectCurrentOrgId);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchMyOrgs());
    dispatch(fetchNotifications());
    dispatch(fetchMyInvitations());
    dispatch(fetchIncomingJoinRequests());
  }, [dispatch]);

  // Keep the group list loaded so the nav can gate on "has any group".
  useEffect(() => {
    if (currentOrgId) dispatch(fetchGroups(currentOrgId));
  }, [currentOrgId, dispatch]);

  const title = TITLES.find((t) => location.pathname.startsWith(t.match))?.title || 'Home';

  // The five bottom-nav destinations are "root" pages. On mobile they show the
  // user/org header (no page title) and keep the bottom nav; every other page
  // is a drill-down that shows its title and hides the nav.
  const isRoot = ROOT_PATHS.includes(location.pathname);

  return (
    <HeaderActionsProvider>
      <div className={`layout ${isRoot ? '' : 'layout--subpage'}`}>
        <Sidebar onCreateOrg={() => setCreateOpen(true)} />
        <div className="layout__main">
          <Topbar title={title} isRoot={isRoot} onCreateOrg={() => setCreateOpen(true)} />
          <main className="layout__content">
            <Outlet context={{ openCreateOrg: () => setCreateOpen(true) }} />
          </main>
        </div>
        {isRoot && <BottomNav />}
        {createOpen && <OrgFinderModal onClose={() => setCreateOpen(false)} />}
      </div>
      <PendingInvitesGate />
    </HeaderActionsProvider>
  );
}
