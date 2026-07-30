import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Modal from './Modal.jsx';
import { selectCurrentOrg } from '../store/slices/orgSlice.js';
import { isAdminRole } from '../utils/role.js';
import { CreditCardIcon, TaskIcon } from './icons.jsx';

const num = (n) => Number(n || 0).toLocaleString('en-IN');

/**
 * Shown when a task creation is refused because the workspace has used up its
 * plan quota (the API answers `402` with `errors.quotaExceeded`).
 *
 * The call to action differs by role, deliberately: only an admin/owner can
 * reach Plans & Billing at all, so showing a member an "Upgrade" button would
 * send them to a 403. They're told who to ask instead.
 */
export default function QuotaGate({ info, onClose }) {
  const navigate = useNavigate();
  const org = useSelector(selectCurrentOrg);
  const canManage = isAdminRole(org?.role);

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
