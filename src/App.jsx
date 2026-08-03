import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuth } from './store/slices/authSlice.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layout/AppLayout.jsx';
import HomeLanding from './pages/HomeLanding.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import PricingPage from './pages/PricingPage.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Verify from './pages/Verify.jsx';
import DeclineInvitePage from './pages/DeclineInvitePage.jsx';
import AcceptInvitePage from './pages/AcceptInvitePage.jsx';
import DashboardHome from './pages/DashboardHome.jsx';
import GroupsPage from './pages/GroupsPage.jsx';
import ChannelPage from './pages/channel/ChannelPage.jsx';
import ChatsLayout from './pages/ChatsLayout.jsx';
import ChatViewPage from './pages/chat/ChatViewPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import MorePage from './pages/more/MorePage.jsx';
import ProfilePage from './pages/more/ProfilePage.jsx';
import UserProfilePage from './pages/more/UserProfilePage.jsx';
import StorageReportPage from './pages/more/StorageReportPage.jsx';
import BillingPage from './pages/more/BillingPage.jsx';
import ManagePlanPage from './pages/more/ManagePlanPage.jsx';
import ManageOrganizationsPage from './pages/more/ManageOrganizationsPage.jsx';
import ManageProjectsPage from './pages/more/ManageProjectsPage.jsx';
import ManageTasksPage from './pages/more/ManageTasksPage.jsx';
import ActivitiesPage from './pages/more/ActivitiesPage.jsx';
import InvitationsPage from './pages/more/InvitationsPage.jsx';
import TaskDetailPage from './pages/TaskDetailPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import ClientDetailPage from './pages/ClientDetailPage.jsx';

// Manage Tasks moved from More to the main Tasks tab. Old links (and the
// dashboard's deep-links) must keep their query string through the redirect.
function RedirectToTasks() {
  const { search } = useLocation();
  return <Navigate to={`/tasks${search}`} replace />;
}

// Reports moved from its own sidebar tab into More (Chats took its nav slot).
function RedirectToReports() {
  const { search } = useLocation();
  return <Navigate to={`/more/reports${search}`} replace />;
}

// Keep authenticated users out of the auth pages.
function PublicOnly({ children }) {
  const { user, loading } = useSelector(selectAuth);
  if (loading) {
    return (
      <div className="screen-center">
        <span className="spinner" />
      </div>
    );
  }
  return user ? <Navigate to="/dashboard" replace /> : children;
}

/**
 * `nativeEntryPath` is supplied only by the mobile shell (`native/NativeApp`),
 * which has already resolved the company code and verified the session. It
 * replaces the marketing home page as the app's entry point: the native app
 * has no home screen, so `/` becomes a redirect to either the dashboard or
 * login, decided before render. On web the prop is absent and `/` renders
 * `HomeLanding` exactly as before.
 */
export default function App({ nativeEntryPath }) {
  return (
    <Routes>
      <Route path="/" element={nativeEntryPath ? <Navigate to={nativeEntryPath} replace /> : <HomeLanding />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/product" element={<ProductPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/invite/decline/:token" element={<DeclineInvitePage />} />
      <Route path="/invite/accept/:token" element={<AcceptInvitePage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/:groupId" element={<ChannelPage />} />
        <Route path="/tasks" element={<ManageTasksPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/clients/:clientId" element={<ClientDetailPage />} />
        <Route path="/chats" element={<ChatsLayout />}>
          <Route path=":groupId" element={<ChatViewPage />} />
        </Route>
        <Route path="/reports" element={<RedirectToReports />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/more/reports" element={<ReportsPage />} />
        <Route path="/more/profile" element={<ProfilePage />} />
        {/* Manage Members moved into the Groups page's Members tab (admin-only). */}
        <Route path="/more/members" element={<Navigate to="/groups" replace />} />
        <Route path="/more/members/:userId" element={<UserProfilePage />} />
        {/* Plans & billing — admin/owner only, matching requireOrgAdmin on the
            API. The More menu hides the entry for members; the page itself
            surfaces the 403 rather than silently rendering empty. */}
        <Route path="/more/billing" element={<BillingPage />} />
        <Route path="/more/billing/plans" element={<ManagePlanPage />} />
        <Route path="/more/storage" element={<StorageReportPage />} />
        <Route path="/more/organizations" element={<ManageOrganizationsPage />} />
        <Route path="/more/projects" element={<ManageProjectsPage />} />
        <Route path="/more/tasks" element={<RedirectToTasks />} />
        <Route path="/more/activities" element={<ActivitiesPage />} />
        <Route path="/more/invitations" element={<InvitationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
