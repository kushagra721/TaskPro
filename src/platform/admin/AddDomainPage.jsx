import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { platformApi } from '../../api/client.js';
import Select from '../../components/Select.jsx';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  RotateIcon,
  ShieldIcon,
} from '../../components/icons.jsx';

const STEPS = [
  { key: 'domain', label: 'Domain' },
  { key: 'dns', label: 'Point DNS' },
  { key: 'ssl', label: 'SSL certificate' },
];

// A domain's persisted `status` maps onto which wizard step it should resume
// at — this is what makes "Continue setup" from the list page land in the
// right place instead of always restarting at step 1.
const STEP_FOR_STATUS = { AWAITING_DNS: 1, VERIFIED_SSL_PENDING: 2, LIVE: 2 };

const DNS_POLL_MS = 8000;

function StepTracker({ index }) {
  return (
    <div className="domain-wizard__steps">
      {STEPS.map((s, i) => (
        <Fragment key={s.key}>
          <div
            className={`domain-wizard__step ${
              i < index ? 'domain-wizard__step--done' : i === index ? 'domain-wizard__step--active' : ''
            }`}
          >
            <span className="domain-wizard__step-dot">{i < index ? <CheckIcon size={14} /> : i + 1}</span>
            <span className="domain-wizard__step-label">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <span className={`domain-wizard__step-line ${i < index ? 'domain-wizard__step-line--done' : ''}`} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard permission denied or unavailable — the value is still
      // visible and selectable, so this is a soft failure, not an error state.
      return;
    }
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <button
      type="button"
      className={`domain-wizard__copy-btn ${copied ? 'domain-wizard__copy-btn--copied' : ''}`}
      onClick={copy}
      aria-label="Copy"
    >
      {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
    </button>
  );
}

/**
 * Full-page "Add domain" wizard — Domain → Point DNS → SSL certificate.
 * Two entry points, one component: `/domains/new` (`id` absent) starts fresh
 * at step 1; `/domains/:id/setup` (from the list's "Continue setup") loads
 * the existing domain and resumes at the step matching its saved status.
 */
export default function AddDomainPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [resellers, setResellers] = useState([]);
  const [domain, setDomain] = useState(null); // the CustomDomain once created/loaded
  const [loadingExisting, setLoadingExisting] = useState(!!id);
  const [step, setStep] = useState(0);

  const [domainInput, setDomainInput] = useState('');
  const [resellerId, setResellerId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dnsChecking, setDnsChecking] = useState(false);
  const [dnsPointed, setDnsPointed] = useState(false);

  useEffect(() => {
    platformApi.resellers.list().then((r) => setResellers(r.resellers));
  }, []);

  // Continue-setup mode: load the existing domain and jump to its step.
  useEffect(() => {
    if (!id) return;
    platformApi.domains.list().then((res) => {
      const found = res.domains.find((d) => d.id === id);
      if (found) {
        setDomain(found);
        setStep(STEP_FOR_STATUS[found.status] ?? 0);
        setDnsPointed(found.status !== 'AWAITING_DNS');
      }
      setLoadingExisting(false);
    });
  }, [id]);

  // Auto-poll DNS every 8s while waiting on step 2, same interval the
  // reference design's "Auto-checking every 8s" copy promises.
  useEffect(() => {
    if (step !== 1 || !domain || domain.status !== 'AWAITING_DNS') return undefined;
    const t = setInterval(() => checkDns(true), DNS_POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, domain?.id, domain?.status]);

  const submitDomain = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await platformApi.domains.create({ domain: domainInput, resellerId });
      setDomain(res.domain);
      setStep(1);
      // So a refresh mid-wizard resumes here instead of re-creating a domain.
      navigate(`/platform/admin/domains/${res.domain.id}/setup`, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not add the domain');
    } finally {
      setBusy(false);
    }
  };

  const checkDns = async (silent = false) => {
    if (!domain) return;
    if (!silent) setDnsChecking(true);
    setError('');
    try {
      const res = await platformApi.domains.checkDns(domain.id);
      setDomain(res.domain);
      setDnsPointed(res.pointed);
      if (!res.pointed && !silent) {
        setError(
          res.resolvedIps?.length
            ? `Found this domain pointing to ${res.resolvedIps.join(', ')}, not ${domain.targetIp}. Double-check the A record above.`
            : 'No A record found yet for this domain. Add the record above and try again — DNS changes can take a few minutes to propagate.'
        );
      }
    } catch (err) {
      if (!silent) setError(err.message || 'Could not check DNS');
    } finally {
      if (!silent) setDnsChecking(false);
    }
  };

  const activateSsl = async () => {
    if (!domain) return;
    setBusy(true);
    setError('');
    try {
      const res = await platformApi.domains.activateSsl(domain.id);
      setDomain(res.domain);
      navigate('/platform/admin/domains');
    } catch (err) {
      setError(err.message || 'Could not activate SSL');
    } finally {
      setBusy(false);
    }
  };

  const back = () => navigate('/platform/admin/domains');

  if (loadingExisting) {
    return (
      <div className="page">
        <div className="screen-center" style={{ minHeight: '40vh' }}>
          <span className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm back-btn" onClick={back}>
        <ArrowLeftIcon size={15} /> Back to domains
      </button>

      <StepTracker index={step} />

      {step === 0 && (
        <div className="domain-wizard__card">
          <h2 className="domain-wizard__card-title">Which domain?</h2>
          <p className="domain-wizard__card-sub">
            Enter the exact domain the reseller will use, and pick the reseller it belongs to.
          </p>

          {error && <div className="domain-wizard__banner domain-wizard__banner--error">{error}</div>}

          <form onSubmit={submitDomain}>
            <div className="domain-wizard__field">
              <label htmlFor="domain">
                Domain <span className="req">*</span>
              </label>
              <input
                id="domain"
                className="domain-wizard__input"
                autoFocus
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="app.brandx.com"
              />
            </div>
            <div className="domain-wizard__field">
              <label>
                Reseller <span className="req">*</span>
              </label>
              <Select
                value={resellerId}
                onChange={setResellerId}
                placeholder="Choose a reseller"
                options={resellers.map((r) => ({ value: r.id, label: `${r.brandName || r.name} (${r.email})` }))}
              />
            </div>
            <div className="domain-wizard__actions">
              <button className="btn" type="submit" disabled={busy || !domainInput.trim() || !resellerId}>
                {busy ? <span className="spinner" /> : (<>Continue <ArrowRightIcon size={16} /></>)}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 1 && domain && (
        <div className="domain-wizard__card">
          <h2 className="domain-wizard__card-title">Point the domain to us</h2>
          <p className="domain-wizard__card-sub">
            In the reseller's DNS provider, add this <strong>A record</strong>. We check for it automatically and
            continue once it's live.
          </p>

          <div className="domain-wizard__record">
            <div className="domain-wizard__record-row">
              <span className="domain-wizard__record-key">Type</span>
              <span className="domain-wizard__record-value">A</span>
            </div>
            <div className="domain-wizard__record-row">
              <span className="domain-wizard__record-key">Name / Host</span>
              <span className="domain-wizard__record-value">
                {domain.domain} <CopyButton value={domain.domain} />
              </span>
            </div>
            <div className="domain-wizard__record-row">
              <span className="domain-wizard__record-key">Points to (IP)</span>
              <span className="domain-wizard__record-value">
                {domain.targetIp} <CopyButton value={domain.targetIp} />
              </span>
            </div>
          </div>

          {error && <div className="domain-wizard__banner domain-wizard__banner--error">{error}</div>}

          {dnsPointed ? (
            <div className="domain-wizard__banner domain-wizard__banner--success">
              <CheckIcon size={16} className="domain-wizard__banner-icon" />
              <span>
                <strong>DNS verified.</strong> You're ready to issue the SSL certificate.
              </span>
            </div>
          ) : (
            <div className="domain-wizard__banner">
              <RotateIcon size={16} className="domain-wizard__banner-icon domain-wizard__banner-icon--spin" />
              <span>
                <strong>Waiting for DNS to point here…</strong>
                <br />
                Auto-checking every 8s. DNS changes can take a few minutes to propagate.
              </span>
            </div>
          )}

          <div className="domain-wizard__actions">
            <button className="btn btn--ghost" onClick={() => checkDns(false)} disabled={dnsChecking}>
              {dnsChecking ? <span className="spinner" /> : (<><RotateIcon size={15} /> Check now</>)}
            </button>
            <button className="btn" onClick={() => setStep(2)} disabled={!dnsPointed}>
              Continue to SSL <ArrowRightIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && domain && (
        <div className="domain-wizard__card">
          <h2 className="domain-wizard__card-title">Issue the SSL certificate</h2>
          <p className="domain-wizard__card-sub">
            We fetch a free Let&apos;s Encrypt certificate and bind it so <code>https://{domain.domain}</code> works.
            This usually takes 30-60 seconds.
          </p>

          {error && <div className="domain-wizard__banner domain-wizard__banner--error">{error}</div>}

          <div className="domain-wizard__banner">
            <ShieldIcon size={16} className="domain-wizard__banner-icon" />
            <span>
              Ready to issue. Click <strong>Activate SSL</strong> — you&apos;ll see live progress here.
            </span>
          </div>

          <div className="domain-wizard__actions">
            <button className="btn" onClick={activateSsl} disabled={busy}>
              {busy ? <span className="spinner" /> : (<><ShieldIcon size={16} /> Activate SSL</>)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
