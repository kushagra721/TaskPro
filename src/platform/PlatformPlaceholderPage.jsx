import EmptyState from '../components/EmptyState.jsx';
import { SettingsIcon } from '../components/icons.jsx';

/** Empty/"coming later" tab content — Plans, Email/SMS/WhatsApp,
 *  Mandates/Transactions/Projections/Payment Gateway, Invoices/Receipts all
 *  render this per explicit instruction (real functionality "to discuss
 *  later"). `showSettings` renders a small gear icon button next to the
 *  title — only the Reseller portal's Communication tabs (Email/SMS/
 *  WhatsApp) asked for it, the Admin portal's equivalents didn't. */
export default function PlatformPlaceholderPage({ icon, title, description, showSettings = false }) {
  return (
    <div className="page">
      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <h2 className="platform-list-card__title">{title}</h2>
            {description && <p className="platform-list-card__subtitle">{description}</p>}
          </div>
          {showSettings && (
            <div className="platform-list-card__actions">
              <button type="button" className="btn btn--ghost btn--sm" title={`${title} settings`}>
                <SettingsIcon size={15} />
              </button>
            </div>
          )}
        </div>

        <EmptyState
          icon={icon}
          title={`${title} coming soon`}
          description="This section will be built out in a future round — nothing to configure here yet."
        />
      </div>
    </div>
  );
}
