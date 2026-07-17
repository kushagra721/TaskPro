import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Sidebar from './Sidebar.jsx';
import BottomNav from './BottomNav.jsx';
import Topbar from './Topbar.jsx';
import OrgFinderModal from '../components/OrgFinderModal.jsx';
import { fetchMyOrgs } from '../store/slices/orgSlice.js';
import { fetchNotifications } from '../store/slices/notificationSlice.js';
import { fetchMyInvitations } from '../store/slices/invitationSlice.js';
import { fetchIncomingJoinRequests } from '../store/slices/joinRequestSlice.js';

const TITLES = [
  { match: '/dashboard', title: 'Home' },
  { match: '/groups', title: 'Groups' },
  { match: '/tasks/', title: 'Task Details' },
  { match: '/tasks', title: 'Tasks' },
  { match: '/reports', title: 'Reports' },
  { match: '/more/profile', title: 'My Profile' },
  { match: '/more/members', title: 'Manage Members' },
  { match: '/more/tasks', title: 'Manage Tasks' },
  { match: '/more/activities', title: 'All Activities' },
  { match: '/more/invitations', title: 'Invitation Requests' },
  { match: '/more', title: 'More' },
];

export default function AppLayout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchMyOrgs());
    dispatch(fetchNotifications());
    dispatch(fetchMyInvitations());
    dispatch(fetchIncomingJoinRequests());
  }, [dispatch]);

  const title = TITLES.find((t) => location.pathname.startsWith(t.match))?.title || 'Home';

  return (
    <div className="layout">
      <Sidebar onCreateOrg={() => setCreateOpen(true)} />
      <div className="layout__main">
        <Topbar title={title} onCreateOrg={() => setCreateOpen(true)} />
        <main className="layout__content">
          <Outlet context={{ openCreateOrg: () => setCreateOpen(true) }} />
        </main>
      </div>
      <BottomNav />
      {createOpen && <OrgFinderModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
