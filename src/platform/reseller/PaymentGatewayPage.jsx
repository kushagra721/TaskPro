import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import Switch from '../../components/Switch.jsx';
import { CheckIcon, CopyIcon, RotateIcon } from '../../components/icons.jsx';

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Permission denied — the value is still visible and selectable.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="gateway-copy">
      <div>
        <div className="gateway-copy__label">{label}</div>
        <code className="gateway-copy__value">{value}</code>
      </div>
      <button type="button" className="btn btn--ghost btn--sm" onClick={copy}>
        {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />} {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/**
 * Reseller portal → Manage Mandates → **Payment Gateway**: the reseller's own
 * Razorpay account, so their clients' payments settle to them rather than to
 * the platform.
 *
 * The Key Secret is **write-only** — it's stored encrypted and no endpoint ever
 * returns it, so the field shows a masked placeholder and an empty submit means
 * "keep the saved one". That's why the form can't be a plain controlled mirror
 * of the server state.
 */
export default function PaymentGatewayPage() {
  const [gateway, setGateway] = useState(null);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [routeSaving, setRouteSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const apply = (g) => {
    setGateway(g);
    setKeyId(g.keyId || '');
    setKeySecret('');
  };

  const load = (spinner) => {
    spinner(true);
    setError('');
    platformApi.gateway
      .get()
      .then((res) => apply(res.gateway))
      .catch((err) => setError(err.message || 'Could not load payment settings'))
      .finally(() => spinner(false));
  };

  useEffect(() => load(setLoading), []);

  const saveKeys = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await platformApi.gateway.update({ keyId, keySecret });
      apply(res.gateway);
      setMessage('Razorpay keys saved.');
    } catch (err) {
      setError(err.message || 'Could not save the keys');
    } finally {
      setSaving(false);
    }
  };

  const toggleRouting = async (next) => {
    // Optimistic — the toggle should feel instant; a failure re-reads the truth.
    setGateway((g) => ({ ...g, routePayments: next }));
    setRouteSaving(true);
    setError('');
    try {
      const res = await platformApi.gateway.update({ routePayments: next });
      apply(res.gateway);
    } catch (err) {
      setError(err.message || 'Could not update routing');
      load(setReloading);
    } finally {
      setRouteSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="screen-center" style={{ minHeight: '40vh' }}>
          <span className="spinner" />
        </div>
      </div>
    );
  }

  const configured = gateway?.keyId && gateway?.hasKeySecret;

  return (
    <div className="page">
      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <h2 className="platform-list-card__title">Payment Setup</h2>
            <p className="platform-list-card__subtitle">
              Collect your clients&apos; payments into your own Razorpay account.
            </p>
          </div>
          <div className="platform-list-card__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => load(setReloading)} disabled={reloading}>
              <RotateIcon size={15} className={reloading ? 'spin' : ''} /> Reload
            </button>
          </div>
        </div>

        {error && <div className="alert alert--error">{error}</div>}
        {message && <div className="alert alert--info">{message}</div>}

        {/* Loud on purpose. Keys saved with routing off is the one state that
            silently costs money: the app treats the workspace as having no
            gateway, so clients upgrade and top up for free and no invoice or
            receipt is raised. */}
        {configured && !gateway.routePayments && (
          <div className="alert alert--warn">
            <strong>Your clients are not being charged.</strong> Your keys are saved, but routing is switched off, so
            plan upgrades and top-ups apply for free and no invoice or receipt is raised. Turn on{' '}
            <em>Route my clients&apos; payments</em> below to start collecting.
          </div>
        )}

        <div className="gateway-card">
          <div className="gateway-card__head">
            <h3 className="gateway-card__title">Razorpay account</h3>
            <span className={`gateway-state ${gateway.live ? 'gateway-state--live' : ''}`}>
              <span className="mandate-dot" />
              {gateway.live
                ? 'Live — paying you'
                : configured
                  ? 'Configured — routing off'
                  : 'Not connected'}
            </span>
          </div>
          <p className="gateway-card__note">
            From your Razorpay Dashboard → Settings → API Keys. The Key Secret is stored encrypted and never shown
            again — leave it blank to keep the saved one.
          </p>

          <form onSubmit={saveKeys}>
            <div className="row2">
              <div className="field">
                <label className="field__label">Key ID</label>
                <input
                  className="input"
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  placeholder="rzp_live_XXXXXXXXXXXX"
                />
              </div>
              <div className="field">
                <label className="field__label">Key Secret</label>
                <input
                  className="input"
                  type="password"
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                  placeholder={gateway.hasKeySecret ? '•••••••• (saved — leave blank to keep)' : 'Your key secret'}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Save Razorpay keys'}
            </button>
          </form>
        </div>

        <div className="gateway-card gateway-card--row">
          <div>
            <h3 className="gateway-card__title">Route my clients&apos; payments to my Razorpay</h3>
            <p className="gateway-card__note">
              When on, every plan purchase, top-up and auto-debit from your clients settles into your account.
            </p>
          </div>
          <div className="gateway-toggle">
            <Switch
              checked={!!gateway.routePayments}
              onChange={toggleRouting}
              disabled={routeSaving || !configured}
              label={gateway.routePayments ? 'On' : 'Off'}
            />
            {!configured && <span className="field__hint">Save your keys first.</span>}
          </div>
        </div>

        <div className="gateway-card">
          <h3 className="gateway-card__title">One-time webhook step</h3>
          <p className="gateway-card__note">
            In your Razorpay Dashboard add a webhook pointing to our platform, using the webhook secret below. Without
            it, subscription renewals from your clients won&apos;t be confirmed.
          </p>
          {gateway.webhookSecret ? (
            <>
              <CopyField label="Webhook URL" value={gateway.webhookUrl} />
              <CopyField label="Webhook secret" value={gateway.webhookSecret} />
            </>
          ) : (
            <p className="field__hint">Your webhook secret is generated once you save a complete key pair.</p>
          )}
        </div>

        {/* Spells out the consequence of the toggle, since it's the difference
            between clients paying and clients upgrading for free. */}
        <p className="gateway-footnote">
          {gateway.live
            ? 'Collection is live: your clients pay through Razorpay when they upgrade a plan or buy extra tasks, and the money settles into your account.'
            : 'Until your keys are saved and routing is on, your clients’ plan changes and top-ups apply immediately without a charge.'}
        </p>
      </div>
    </div>
  );
}
