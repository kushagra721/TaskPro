import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Modal from './Modal.jsx';
import { selectCurrentOrg } from '../store/slices/orgSlice.js';
import { isAdminRole } from '../utils/role.js';
import { billingEnabled } from '../utils/native.js';
import { CreditCardIcon, TaskIcon } from './icons.jsx';

const num = (n) => Number(n || 0).toLocaleString('en-IN');

/**
 * Shown when a task creation is refused because the workspace has used up its
 * plan quota (the API answers `402` with `errors.quotaExceeded`).
 *
 * The call to action differs by role, deliberately: only an admin/owner can
 * reach Plans & Billing at all, so showing a member an "Upgrade" button would
 * send them to a 403. They're told who to ask instead.
 *
 * It differs by PLATFORM too. The iOS app has no billing surface at all (App
 * Store Review 3.1.1 — see `billingEnabled`), so an admin there is pointed at
 * the web app rather than given a button whose route now redirects away. This
 * is the third and last place that leads to checkout; all three ask the same
 * `billingEnabled()` question so none can be reopened on its own.
 */
export default function QuotaGate({ info, onClose }) {
  const navigate = useNavigate();
  const org = useSelector(selectCurrentOrg);
  const canManage = isAdminRole(org?.role) && billingEnabled();
  // An admin on iOS: allowed to act, just not from here.
  const elsewhere = isAdminRole(org?.role) && !billingEnabled();

  return (
    <Modal title="You've run out of tasks" onClose={onClose}>
      <div className="quota-gate">
        <span className="quota-gate__icon">
          <TaskIcon size={22} />
        </span>
        <p className="quota-gate__lead">
          {org?.name} has used all <strong>{num(info?.limit)}</strong> tasks included in this billing cycle
          {info?.planName ? (
            <>
              {' '}
              on the <strong>{info.planName}</strong>
            </>
          ) : null}
          .
        </p>
        <p className="quota-gate__sub">
          {canManage
            ? 'Upgrade to a bigger plan, or buy extra tasks that never expire — your quota is restored immediately after payment.'
            : elsewhere
              ? 'Open Task Pro in your browser to upgrade the plan or buy extra tasks. Everything else keeps working in the meantime.'
              : 'Ask a workspace admin to upgrade the plan or buy extra tasks. Everything else keeps working in the meantime.'}
        </p>
      </div>

      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Close
        </button>
        {canManage && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              onClose();
              navigate('/more/billing/plans');
            }}
          >
            <CreditCardIcon size={16} /> Upgrade plan
          </button>
        )}
      </div>
    </Modal>
  );
}
