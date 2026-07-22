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
import ReportsPage from './pages/ReportsPage.jsx';
import MorePage from './pages/more/MorePage.jsx';
import ProfilePage from './pages/more/ProfilePage.jsx';
import UserProfilePage from './pages/more/UserProfilePage.jsx';
import StorageReportPage from './pages/more/StorageReportPage.jsx';
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeLanding />} />
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
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/more/profile" element={<ProfilePage />} />
        {/* Manage Members moved into the Groups page's Members tab (admin-only). */}
        <Route path="/more/members" element={<Navigate to="/groups" replace />} />
        <Route path="/more/members/:userId" element={<UserProfilePage />} />
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
