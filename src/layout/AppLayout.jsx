import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from './Sidebar.jsx';
import BottomNav from './BottomNav.jsx';
import Topbar from './Topbar.jsx';
import OrgFinderModal from '../components/OrgFinderModal.jsx';
import PostLoginPopups from '../components/PostLoginPopups.jsx';
import { HeaderActionsProvider } from './HeaderActions.jsx';
import { fetchMyOrgs, selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { isClientRole } from '../utils/role.js';
import { fetchGroups } from '../store/slices/groupSlice.js';
import { fetchChats } from '../store/slices/chatSlice.js';
import { fetchNotifications } from '../store/slices/notificationSlice.js';
import { fetchMyInvitations } from '../store/slices/invitationSlice.js';
import { fetchIncomingJoinRequests } from '../store/slices/joinRequestSlice.js';
import { usePushNotifications } from '../hooks/usePushNotifications.js';

/** The Hub's four tab panels, keyed by the `?tab=` value `GroupsPage` reads. */
const HUB_TITLES = { groups: 'Groups', projects: 'Projects', clients: 'Clients Space', members: 'Members' };

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
  // More specific prefix first — `/more/billing/plans` must not match `/more/billing`.
  { match: '/more/billing/plans', title: 'Manage Plan' },
  { match: '/more/billing', title: 'Plans & Billing' },
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
  // Android push. Mounted here rather than at the app root because
  // registration binds the device to the SIGNED-IN account, and this layout is
  // the first thing that only renders once there is one. A no-op on web.
  usePushNotifications();
  const currentOrgId = useSelector(selectCurrentOrgId);
  const currentOrg = useSelector(selectCurrentOrg);
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

  /**
   * The Hub is FOUR pages behind one path.
   *
   * `/groups` carries its tab in `?tab=`, so the pathname alone cannot name
   * what is on screen — the header read "Groups" while Clients Space was
   * selected. Resolved here rather than by letting the page register a title,
   * because each of the Hub's tab panels already registers its own
   * search/filter actions and a parent registering alongside them would race
   * (parent effects run after child effects on mount, so the parent would win
   * and silently clobber the child's search box).
   */
  let title = TITLES.find((t) => location.pathname.startsWith(t.match))?.title || 'Home';
  if (location.pathname.startsWith('/groups') && !location.pathname.startsWith('/groups/')) {
    // A CLIENT is pinned to the Clients tab whatever the query string says —
    // mirroring `GroupsPage`, which ignores `?tab=` for them.
    const tab = isClientRole(currentOrg?.role)
      ? 'clients'
      : new URLSearchParams(location.search).get('tab');
    title = HUB_TITLES[tab] || 'Groups';
  }

  // The five bottom-nav destinations are "root" pages. On mobile they show the
  // user/org header (no page title) and keep the bottom nav; every other page
  // is a drill-down that shows its title and hides the nav.
  const isRoot = ROOT_PATHS.includes(location.pathname);

  // An open conversation (`/chats/:groupId`) is the one route that hides the
  // shared Topbar on mobile: `.chat-pane__header` already carries a back
  // button + group name + member count, so the Topbar would stack a second,
  // redundant header above it. The Chats *list* (`/chats`) keeps the normal
  // Topbar like every other tab.
  const isChatView = location.pathname.startsWith('/chats/');

  return (
    <HeaderActionsProvider>
      <div className={`layout ${isRoot ? '' : 'layout--subpage'} ${isChatView ? 'layout--chat-view' : ''}`}>
        <Sidebar />
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
