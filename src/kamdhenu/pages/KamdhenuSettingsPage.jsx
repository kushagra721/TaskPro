import { useEffect, useState } from 'react';
import { kamdhenuApi } from '../../api/client.js';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';

// Same key/values the layout's topbar toggle uses (KamdhenuLayout.jsx) so the
// theme picked here and the toggle stay in sync.
const THEME_KEY = 'kamdhenu_theme';

const EMPTY = {
  companyName: '',
  gstNumber: '',
  address: '',
  logoUrl: '',
  emailFrom: '',
  invoicePrefix: '',
  invoiceNotes: '',
  theme: 'light',
};

export default function KamdhenuSettingsPage() {
  const toast = useKamdhenuToast();

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await kamdhenuApi.settings();
        if (cancelled) return;
        const s = res.settings || {};
        setForm({
          companyName: s.companyName || '',
          gstNumber: s.gstNumber || '',
          address: s.address || '',
          logoUrl: s.logoUrl || '',
          emailFrom: s.emailFrom || '',
          invoicePrefix: s.invoicePrefix || '',
          invoiceNotes: s.invoiceNotes || '',
          theme: s.theme || localStorage.getItem(THEME_KEY) || 'light',
        });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await kamdhenuApi.updateSettings(form);
      localStorage.setItem(THEME_KEY, form.theme === 'dark' ? 'dark' : 'light');
      toast.success('Settings saved — the theme applies on the next page load');
    } catch (err) {
      toast.error(err.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="panel">
          <div className="panel__empty">
            <span className="spinner" /> Loading settings…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="panel">
          <div className="alert alert--error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <h1 className="page__title">Settings</h1>
          <p className="page__subtitle">Company profile, email, invoice and appearance settings.</p>
        </div>
      </div>

      <form onSubmit={save} noValidate>
        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Company profile</h2>
          </div>
          <div className="field">
            <label className="field__label">Company name</label>
            <input className="input" value={form.companyName} onChange={setField('companyName')} />
          </div>
          <div className="field">
            <label className="field__label">GST number</label>
            <input className="input" value={form.gstNumber} onChange={setField('gstNumber')} />
          </div>
          <div className="field">
            <label className="field__label">Address</label>
            <textarea className="input kerp-textarea" rows={3} value={form.address} onChange={setField('address')} />
          </div>
          <div className="field">
            <label className="field__label">Logo URL</label>
            <input
              className="input"
              placeholder="https://…/logo.png"
              value={form.logoUrl}
              onChange={setField('logoUrl')}
            />
            {form.logoUrl && (
              <img
                src={form.logoUrl}
                alt="Company logo preview"
                style={{ maxHeight: 64, maxWidth: 200, marginTop: 8, borderRadius: 6 }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Email</h2>
          </div>
          <div className="field">
            <label className="field__label">From address (PO emails)</label>
            <input
              className="input"
              type="email"
              placeholder="purchases@company.com"
              value={form.emailFrom}
              onChange={setField('emailFrom')}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Invoice</h2>
          </div>
          <div className="field">
            <label className="field__label">Invoice prefix</label>
            <input className="input" placeholder="e.g. KPO" value={form.invoicePrefix} onChange={setField('invoicePrefix')} />
          </div>
          <div className="field">
            <label className="field__label">Invoice notes</label>
            <textarea
              className="input kerp-textarea"
              rows={3}
              placeholder="Terms printed at the bottom of POs"
              value={form.invoiceNotes}
              onChange={setField('invoiceNotes')}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Appearance</h2>
          </div>
          <div className="field">
            <label className="field__label">Theme</label>
            <select className="input" value={form.theme} onChange={setField('theme')}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <span className="kerp-stock-hint">
              Uses the same setting as the ☾ toggle in the top bar; applies on the next page load.
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Backup</h2>
          </div>
          <p className="kerp-soon__desc" style={{ margin: 0, maxWidth: 'none', textAlign: 'left' }}>
            Automated backups are managed at the database level by your hosting provider — there is nothing to
            configure here. Contact your administrator to restore from a backup.
          </p>
        </div>

        <div className="kerp-head-actions">
          <button type="submit" className="btn btn--sm" disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
