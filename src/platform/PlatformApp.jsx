import { Routes, Route, Navigate } from 'react-router-dom';
import PlatformLogin from './PlatformLogin.jsx';
import PlatformProtectedRoute from './PlatformProtectedRoute.jsx';
import PlatformLayout from './PlatformLayout.jsx';
import ResellersPage from './admin/ResellersPage.jsx';
import CreateResellerPage from './admin/CreateResellerPage.jsx';
import CustomDomainsPage from './admin/CustomDomainsPage.jsx';
import AddDomainPage from './admin/AddDomainPage.jsx';
import ClientsPage from './admin/ClientsPage.jsx';
import ResellerClientsPage from './reseller/ResellerClientsPage.jsx';
import ResellerWorkspacesPage from './reseller/ResellerWorkspacesPage.jsx';
import { UserIcon, LinkIcon, BuildingIcon } from '../components/icons.jsx';

const ADMIN_NAV = [
  { to: '/platform/admin/resellers', label: 'Resellers', desc: 'Create & manage reseller accounts', Icon: UserIcon },
  { to: '/platform/admin/domains', label: 'Custom Domains', desc: 'Map reseller / brand domains', Icon: LinkIcon },
  { to: '/platform/admin/clients', label: 'Clients', desc: 'All clients & which reseller they belong to', Icon: UserIcon },
];

// Two tabs mirroring the reference design: "Clients" is person-oriented (one
// row per client signup, labeled by the owner), "Workspace Management" is the
// same underlying data labeled/organized by workspace instead — and is where
// creating a new client actually lives, since that's really "create an
// Organization".
const RESELLER_NAV = [
  { to: '/platform/reseller/clients', label: 'Clients', desc: 'Your clients, by owner', Icon: UserIcon },
  { to: '/platform/reseller/workspaces', label: 'Workspace Management', desc: 'Client workspaces & their members', Icon: BuildingIcon },
];

/** Entirely separate route tree from the normal <App/> — mounted instead of
 *  it (never alongside) by main.jsx's portal-mode check, so it can't
 *  interfere with the existing app's routing at all. */
export default function PlatformApp() {
  return (
    <Routes>
      <Route path="/platform/login" element={<PlatformLogin />} />

      <Route
        path="/platform/admin"
        element={
          <PlatformProtectedRoute role="SUPER_ADMIN">
            <PlatformLayout title="Super Admin" navItems={ADMIN_NAV} />
          </PlatformProtectedRoute>
        }
      >
        <Route index element={<Navigate to="resellers" replace />} />
        <Route path="resellers" element={<ResellersPage />} />
        <Route path="resellers/new" element={<CreateResellerPage />} />
        <Route path="domains" element={<CustomDomainsPage />} />
        <Route path="domains/new" element={<AddDomainPage />} />
        <Route path="domains/:id/setup" element={<AddDomainPage />} />
        <Route path="clients" element={<ClientsPage />} />
      </Route>

      <Route
        path="/platform/reseller"
        element={
          <PlatformProtectedRoute role="RESELLER">
            <PlatformLayout title="Reseller" navItems={RESELLER_NAV} />
          </PlatformProtectedRoute>
        }
      >
        <Route index element={<Navigate to="clients" replace />} />
        <Route path="clients" element={<ResellerClientsPage />} />
        <Route path="workspaces" element={<ResellerWorkspacesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/platform/login" replace />} />
    </Routes>
  );
}
