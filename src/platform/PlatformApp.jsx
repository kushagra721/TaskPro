import { Routes, Route, Navigate } from 'react-router-dom';
import PlatformLogin from './PlatformLogin.jsx';
import PlatformProtectedRoute from './PlatformProtectedRoute.jsx';
import PlatformLayout from './PlatformLayout.jsx';
import PlatformPlaceholderPage from './PlatformPlaceholderPage.jsx';
import PlatformProfilePage from './PlatformProfilePage.jsx';
import ResellersPage from './admin/ResellersPage.jsx';
import CreateResellerPage from './admin/CreateResellerPage.jsx';
import CustomDomainsPage from './admin/CustomDomainsPage.jsx';
import AddDomainPage from './admin/AddDomainPage.jsx';
import AdminWorkspacesPage from './admin/WorkspacesPage.jsx';
import AdminMembersPage from './admin/MembersPage.jsx';
import ResellerWorkspacesPage from './reseller/ResellerWorkspacesPage.jsx';
import ResellerMembersPage from './reseller/MembersPage.jsx';
import PlansPage from './reseller/PlansPage.jsx';
import CreatePlanPage from './reseller/CreatePlanPage.jsx';
import {
  BuildingIcon,
  ShieldIcon,
  MailIcon,
  FolderIcon,
  CreditCardIcon,
  ReceiptIcon,
} from '../components/icons.jsx';

// Two parent sections (rendered down the Super Admin sidebar); each parent's
// children render as a horizontal tab row (Hub-style) above the page content.
const ADMIN_NAV_GROUPS = [
  {
    key: 'superadmin',
    label: 'Superadmin Panel',
    navLabel: 'Superadmin',
    Icon: ShieldIcon,
    children: [
      { to: '/platform/admin/resellers', label: 'Resellers', key: 'resellers' },
      { to: '/platform/admin/domains', label: 'Domains', key: 'domains' },
      { to: '/platform/admin/workspaces', label: 'Workspaces', key: 'workspaces' },
      { to: '/platform/admin/members', label: 'Members', key: 'members' },
      { to: '/platform/admin/plans', label: 'Plans' },
    ],
  },
  {
    key: 'communication',
    label: 'Communication',
    Icon: MailIcon,
    children: [
      { to: '/platform/admin/email', label: 'Email' },
      { to: '/platform/admin/sms', label: 'SMS' },
      { to: '/platform/admin/whatsapp', label: 'WhatsApp' },
    ],
  },
];

const RESELLER_NAV_GROUPS = [
  {
    key: 'admin-panel',
    label: 'Admin Panel',
    navLabel: 'Admin',
    Icon: BuildingIcon,
    children: [
      { to: '/platform/reseller/workspaces', label: 'Workspaces', key: 'workspaces' },
      { to: '/platform/reseller/members', label: 'Members', key: 'members' },
      { to: '/platform/reseller/plans', label: 'Plans' },
    ],
  },
  {
    key: 'mandates',
    label: 'Manage Mandates',
    navLabel: 'Mandates',
    Icon: CreditCardIcon,
    children: [
      { to: '/platform/reseller/mandates', label: 'Mandates' },
      { to: '/platform/reseller/transactions', label: 'Transactions' },
      { to: '/platform/reseller/projections', label: 'Projections' },
      { to: '/platform/reseller/payment-gateway', label: 'Payment Gateway' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    Icon: ReceiptIcon,
    children: [
      { to: '/platform/reseller/invoices', label: 'Invoices' },
      { to: '/platform/reseller/receipts', label: 'Receipts' },
    ],
  },
  {
    key: 'communication',
    label: 'Communication',
    Icon: MailIcon,
    children: [
      { to: '/platform/reseller/email', label: 'Email' },
      { to: '/platform/reseller/sms', label: 'SMS' },
      { to: '/platform/reseller/whatsapp', label: 'WhatsApp' },
    ],
  },
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
            <PlatformLayout title="Super Admin" navGroups={ADMIN_NAV_GROUPS} profilePath="/platform/admin/profile" />
          </PlatformProtectedRoute>
        }
      >
        <Route index element={<Navigate to="resellers" replace />} />
        <Route path="resellers" element={<ResellersPage />} />
        <Route path="resellers/new" element={<CreateResellerPage />} />
        <Route path="domains" element={<CustomDomainsPage />} />
        <Route path="domains/new" element={<AddDomainPage />} />
        <Route path="domains/:id/setup" element={<AddDomainPage />} />
        <Route path="workspaces" element={<AdminWorkspacesPage />} />
        <Route path="members" element={<AdminMembersPage />} />
        <Route
          path="plans"
          element={<PlatformPlaceholderPage icon={<FolderIcon size={30} />} title="Plans" description="Subscription plans for resellers and their clients." />}
        />
        <Route
          path="email"
          element={<PlatformPlaceholderPage icon={<MailIcon size={30} />} title="Email" description="Platform-wide email templates and delivery settings." />}
        />
        <Route
          path="sms"
          element={<PlatformPlaceholderPage icon={<MailIcon size={30} />} title="SMS" description="Platform-wide SMS templates and delivery settings." />}
        />
        <Route
          path="whatsapp"
          element={<PlatformPlaceholderPage icon={<MailIcon size={30} />} title="WhatsApp" description="Platform-wide WhatsApp templates and delivery settings." />}
        />
        <Route path="profile" element={<PlatformProfilePage />} />
      </Route>

      <Route
        path="/platform/reseller"
        element={
          <PlatformProtectedRoute role="RESELLER">
            <PlatformLayout title="Reseller" navGroups={RESELLER_NAV_GROUPS} profilePath="/platform/reseller/profile" />
          </PlatformProtectedRoute>
        }
      >
        <Route index element={<Navigate to="workspaces" replace />} />
        <Route path="workspaces" element={<ResellerWorkspacesPage />} />
        <Route path="members" element={<ResellerMembersPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="plans/new" element={<CreatePlanPage />} />
        <Route path="plans/:planId/edit" element={<CreatePlanPage />} />
        <Route
          path="mandates"
          element={<PlatformPlaceholderPage icon={<CreditCardIcon size={30} />} title="Mandates" description="Recurring-payment mandates for your clients." />}
        />
        <Route
          path="transactions"
          element={<PlatformPlaceholderPage icon={<CreditCardIcon size={30} />} title="Transactions" description="Mandate-driven transaction history." />}
        />
        <Route
          path="projections"
          element={<PlatformPlaceholderPage icon={<CreditCardIcon size={30} />} title="Projections" description="Upcoming/expected billing projections." />}
        />
        <Route
          path="payment-gateway"
          element={<PlatformPlaceholderPage icon={<CreditCardIcon size={30} />} title="Payment Gateway" description="Payment gateway configuration." />}
        />
        <Route
          path="invoices"
          element={<PlatformPlaceholderPage icon={<ReceiptIcon size={30} />} title="Invoices" description="Invoices issued to your clients." />}
        />
        <Route
          path="receipts"
          element={<PlatformPlaceholderPage icon={<ReceiptIcon size={30} />} title="Receipts" description="Payment receipts for your clients." />}
        />
        <Route
          path="email"
          element={<PlatformPlaceholderPage icon={<MailIcon size={30} />} title="Email" description="Your branded email templates and delivery settings." showSettings />}
        />
        <Route
          path="sms"
          element={<PlatformPlaceholderPage icon={<MailIcon size={30} />} title="SMS" description="Your branded SMS templates and delivery settings." showSettings />}
        />
        <Route
          path="whatsapp"
          element={<PlatformPlaceholderPage icon={<MailIcon size={30} />} title="WhatsApp" description="Your branded WhatsApp templates and delivery settings." showSettings />}
        />
        <Route path="profile" element={<PlatformProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/platform/login" replace />} />
    </Routes>
  );
}
