import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuth } from './store/slices/authSlice.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layout/AppLayout.jsx';

/* Route-level code splitting: each page is fetched the first time it is
   opened rather than shipping in the initial bundle. The layout and route
   guards stay eager — they are on the critical path for every load, so
   deferring them would only add a round trip. */
const HomeLanding = lazy(() => import('./pages/HomeLanding.jsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));
const ProductPage = lazy(() => import('./pages/ProductPage.jsx'));
const PricingPage = lazy(() => import('./pages/PricingPage.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Signup = lazy(() => import('./pages/Signup.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const Verify = lazy(() => import('./pages/Verify.jsx'));
const DeclineInvitePage = lazy(() => import('./pages/DeclineInvitePage.jsx'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage.jsx'));
const DashboardHome = lazy(() => import('./pages/DashboardHome.jsx'));
const GroupsPage = lazy(() => import('./pages/GroupsPage.jsx'));
const ChannelPage = lazy(() => import('./pages/channel/ChannelPage.jsx'));
const ChatsLayout = lazy(() => import('./pages/ChatsLayout.jsx'));
const ChatViewPage = lazy(() => import('./pages/chat/ChatViewPage.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const MorePage = lazy(() => import('./pages/more/MorePage.jsx'));
const ProfilePage = lazy(() => import('./pages/more/ProfilePage.jsx'));
const UserProfilePage = lazy(() => import('./pages/more/UserProfilePage.jsx'));
const StorageReportPage = lazy(() => import('./pages/more/StorageReportPage.jsx'));
const BillingPage = lazy(() => import('./pages/more/BillingPage.jsx'));
const ManagePlanPage = lazy(() => import('./pages/more/ManagePlanPage.jsx'));
const ManageOrganizationsPage = lazy(() => import('./pages/more/ManageOrganizationsPage.jsx'));
const ManageProjectsPage = lazy(() => import('./pages/more/ManageProjectsPage.jsx'));
const ManageTasksPage = lazy(() => import('./pages/more/ManageTasksPage.jsx'));
const ActivitiesPage = lazy(() => import('./pages/more/ActivitiesPage.jsx'));
const InvitationsPage = lazy(() => import('./pages/more/InvitationsPage.jsx'));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage.jsx'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage.jsx'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage.jsx'));

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
    <Suspense fallback={<div className="page"><div className="panel__empty"><span className="spinner" /></div></div>}>
    <Routes>
      <Route path="/" element={nativeEntryPath ? <Navigate to={nativeEntryPath} replace /> : <HomeLanding />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/product" element={<ProductPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
      {/* PublicOnly like login/signup: somebody already signed in has no use
          for a reset page, and the flow ends by signing them in. */}
      <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
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
    </Suspense>
  );
}
