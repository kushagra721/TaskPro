import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectKamdhenuRole } from '../store/slices/kamdhenuAuthSlice.js';
import KamdhenuLogin from './KamdhenuLogin.jsx';
import KamdhenuProtectedRoute from './KamdhenuProtectedRoute.jsx';
import KamdhenuLayout from './KamdhenuLayout.jsx';
import KamdhenuDashboardPage from './pages/KamdhenuDashboardPage.jsx';
import KamdhenuJobWorkListPage from './pages/KamdhenuJobWorkListPage.jsx';
import KamdhenuJobWorkFormPage from './pages/KamdhenuJobWorkFormPage.jsx';
import KamdhenuSitesPage from './pages/KamdhenuSitesPage.jsx';
import KamdhenuMaterialsPage from './pages/KamdhenuMaterialsPage.jsx';
import KamdhenuMembersPage from './pages/KamdhenuMembersPage.jsx';
import KamdhenuEquipmentPage from './pages/KamdhenuEquipmentPage.jsx';
import KamdhenuPoListPage from './pages/KamdhenuPoListPage.jsx';
import KamdhenuPoFormPage from './pages/KamdhenuPoFormPage.jsx';
import KamdhenuPoDetailPage from './pages/KamdhenuPoDetailPage.jsx';
import KamdhenuMaterialInListPage from './pages/KamdhenuMaterialInListPage.jsx';
import KamdhenuMaterialInFormPage from './pages/KamdhenuMaterialInFormPage.jsx';
import KamdhenuMaterialOutListPage from './pages/KamdhenuMaterialOutListPage.jsx';
import KamdhenuMaterialOutFormPage from './pages/KamdhenuMaterialOutFormPage.jsx';
import KamdhenuJobWorkViewPage from './pages/KamdhenuJobWorkViewPage.jsx';
import KamdhenuStockPage from './pages/KamdhenuStockPage.jsx';
import KamdhenuReportsPage from './pages/KamdhenuReportsPage.jsx';
import KamdhenuSettingsPage from './pages/KamdhenuSettingsPage.jsx';

/** Redirects to the dashboard when the signed-in role isn't in `roles` —
 *  route-level twin of the sidebar's role filtering. */
function RequireRole({ roles, children }) {
  const role = useSelector(selectKamdhenuRole) || 'ADMIN';
  if (!roles.includes(role)) return <Navigate to="/kamdhenu/dashboard" replace />;
  return children;
}

const adminOnly = (page) => <RequireRole roles={['ADMIN']}>{page}</RequireRole>;
const adminOrSupervisor = (page) => <RequireRole roles={['ADMIN', 'SUPERVISOR']}>{page}</RequireRole>;

/** Entirely separate route tree from <App/> and <PlatformApp/> — mounted
 *  instead of them (never alongside) by main.jsx's `?portal=adminkamdhenu`
 *  check, so it can't interfere with either existing app's routing. */
export default function KamdhenuApp() {
  return (
    <Routes>
      <Route path="/kamdhenu/login" element={<KamdhenuLogin />} />
      <Route
        path="/kamdhenu"
        element={
          <KamdhenuProtectedRoute>
            <KamdhenuLayout />
          </KamdhenuProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/kamdhenu/dashboard" replace />} />
        <Route path="dashboard" element={<KamdhenuDashboardPage />} />

        {/* Job Work — the core module (ADMIN + SUPERVISOR write). v2: create →
            IN_PROGRESS, after-picture upload on the view page → DONE (no edit). */}
        <Route path="job-works" element={adminOrSupervisor(<KamdhenuJobWorkListPage />)} />
        <Route path="job-works/new" element={adminOrSupervisor(<KamdhenuJobWorkFormPage />)} />
        <Route path="job-works/:id" element={adminOrSupervisor(<KamdhenuJobWorkViewPage />)} />

        {/* Masters — ADMIN only */}
        <Route path="sites" element={adminOnly(<KamdhenuSitesPage />)} />
        <Route path="equipment" element={adminOnly(<KamdhenuEquipmentPage />)} />
        <Route path="members" element={adminOnly(<KamdhenuMembersPage />)} />
        <Route path="materials" element={adminOnly(<KamdhenuMaterialsPage />)} />

        {/* Work orders (routes/API keep the historical "purchase-orders"
            naming; only UI labels say Work Order) — ADMIN only */}
        <Route path="purchase-orders" element={adminOnly(<KamdhenuPoListPage />)} />
        <Route path="purchase-orders/new" element={adminOnly(<KamdhenuPoFormPage />)} />
        <Route path="purchase-orders/:id" element={adminOnly(<KamdhenuPoDetailPage />)} />
        <Route path="purchase-orders/:id/edit" element={adminOnly(<KamdhenuPoFormPage />)} />

        {/* Material IN — ADMIN + SUPERVISOR */}
        <Route path="material-in" element={adminOrSupervisor(<KamdhenuMaterialInListPage />)} />
        <Route path="material-in/new" element={adminOrSupervisor(<KamdhenuMaterialInFormPage />)} />
        <Route path="material-in/:id/edit" element={adminOrSupervisor(<KamdhenuMaterialInFormPage />)} />

        {/* Material OUT — ADMIN + SUPERVISOR */}
        <Route path="material-out" element={adminOrSupervisor(<KamdhenuMaterialOutListPage />)} />
        <Route path="material-out/new" element={adminOrSupervisor(<KamdhenuMaterialOutFormPage />)} />
        <Route path="material-out/:id/edit" element={adminOrSupervisor(<KamdhenuMaterialOutFormPage />)} />

        <Route path="stock" element={<KamdhenuStockPage />} />
        <Route path="reports" element={adminOrSupervisor(<KamdhenuReportsPage />)} />
        <Route path="settings" element={adminOnly(<KamdhenuSettingsPage />)} />
      </Route>
      <Route path="*" element={<Navigate to="/kamdhenu/login" replace />} />
    </Routes>
  );
}
