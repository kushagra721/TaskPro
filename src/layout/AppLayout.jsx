import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from './Sidebar.jsx';
import BottomNav from './BottomNav.jsx';
import Topbar from './Topbar.jsx';
import OrgFinderModal from '../components/OrgFinderModal.jsx';
import PostLoginPopups from '../components/PostLoginPopups.jsx';
import { HeaderActionsProvider } from './HeaderActions.jsx';
import { fetchMyOrgs, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { fetchGroups } from '../store/slices/groupSlice.js';
import { fetchChats } from '../store/slices/chatSlice.js';
import { fetchNotifications } from '../store/slices/notificationSlice.js';
import { fetchMyInvitations } from '../store/slices/invitationSlice.js';
import { fetchIncomingJoinRequests } from '../store/slices/joinRequestSlice.js';

const TITLES = [
  { match: '/dashboard', title: 'Home' },
  { match: '/groups', title: 'Groups' },
  { match: '/tasks/', title: 'Task Details' },
  { match: '/tasks', title: 'Tasks' },
  { match: '/projects/', title: 'Project Details' },
  { match: '/clients/', title: 'Client Details' },
  { match: '/chats/', title: 'Chat' },
  { match: '/chats', title: 'Chats' },
  { match: '/more/profile', title: 'My Profile' },
  { match: '/more/members/', title: 'Member Details' },
  { match: '/more/storage', title: 'Storage' },
  { match: '/more/organizations', title: 'Manage Workspaces' },
  { match: '/more/projects', title: 'Manage Projects' },
  { match: '/more/activities', title: 'All Activities' },
  { match: '/more/invitations', title: 'Pending Approvals' },
  { match: '/more/reports', title: 'Reports' },
  { match: '/more', title: 'More' },
];

// Exact paths that are bottom-nav destinations (not their drill-down children).
const ROOT_PATHS = ['/dashboard', '/groups', '/tasks', '/chats', '/more'];

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

  // Loaded globally (not just on the Chats page) so the sidebar/bottom-nav
  // unread badge is populated as soon as the user is in the app.
  useEffect(() => {
    if (currentOrgId) dispatch(fetchChats(currentOrgId));
  }, [currentOrgId, dispatch]);

  const title = TITLES.find((t) => location.pathname.startsWith(t.match))?.title || 'Home';

  // The five bottom-nav destinations are "root" pages. On mobile they show the
  // user/org header (no page title) and keep the bottom nav; every other page
  // is a drill-down that shows its title and hides the nav.
  const isRoot = ROOT_PATHS.includes(location.pathname);

  // Chats supplies its own compact header (a bare "Chats" title on the list,
  // the conversation's own group-name/back-button header on a chat) — the
  // shared mobile Topbar would just duplicate that above it, per user
  // feedback ("remove this header ... make the group name part header").
  const isChatsRoute = location.pathname === '/chats' || location.pathname.startsWith('/chats/');

  return (
    <HeaderActionsProvider>
      <div className={`layout ${isRoot ? '' : 'layout--subpage'} ${isChatsRoute ? 'layout--chats' : ''}`}>
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
      <PostLoginPopups />
    </HeaderActionsProvider>
  );
}
