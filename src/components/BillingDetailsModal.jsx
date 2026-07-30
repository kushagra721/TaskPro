import { useState } from 'react';
import Modal from './Modal.jsx';
import Select from './Select.jsx';
import { CheckIcon } from './icons.jsx';

// India's states + union territories, for the State dropdown. A free-text field
// would let "UP"/"U.P."/"Uttar Pradesh" all end up in the same column, which
// matters once these values print on a GST invoice.
const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];

const FIELDS = ['businessName', 'addressLine1', 'addressLine2', 'city', 'state', 'pincode', 'gstin'];

/**
 * Edit a **workspace's** billing details. Shared by the Plans & Billing page
 * and My Profile so the same form can't drift between the two entry points —
 * the caller owns the API call and its busy/error state, same contract as
 * `ConfirmNameModal`/`ConfirmModal`.
 *
 * The starred fields are marked required in the UI (they're what a GST invoice
 * needs) but the API accepts them all empty on purpose: a workspace is created
 * and used long before anyone fills in an invoice address, so the server must
 * never reject a partial save.
 */
export default function BillingDetailsModal({ details, busy = false, error = '', onSave, onClose }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(FIELDS.map((k) => [k, details?.[k] ?? '']))
  );

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!busy) onSave(form);
  };

  const complete = form.businessName.trim() && form.addressLine1.trim() && form.city.trim()
    && form.state.trim() && form.pincode.trim();

  return (
    <Modal title="Billing details" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="modal__intro">These appear on your GST invoice. You only need to do this once.</p>

        {error && <div className="alert alert--error">{error}</div>}

        <div className="field">
          <label className="field__label">
            Name or business name <span className="req">*</span>
          </label>
          <input
            className="input"
            autoFocus
            value={form.businessName}
            onChange={up('businessName')}
            placeholder="Geton Infotech Pvt Ltd"
          />
        </div>
        <div className="field">
          <label className="field__label">
            Address <span className="req">*</span>
          </label>
          <input className="input" value={form.addressLine1} onChange={up('addressLine1')} placeholder="Noida" />
        </div>
        <div className="field">
          <label className="field__label">Address line 2</label>
          <input className="input" value={form.addressLine2} onChange={up('addressLine2')} placeholder="Andheri East" />
        </div>
        <div className="row2">
          <div className="field">
            <label className="field__label">
              City <span className="req">*</span>
            </label>
            <input className="input" value={form.city} onChange={up('city')} placeholder="Delhi" />
          </div>
          <div className="field">
            <label className="field__label">
              PIN code <span className="req">*</span>
            </label>
            <input className="input" value={form.pincode} onChange={up('pincode')} placeholder="201301" inputMode="numeric" />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label className="field__label">
              State <span className="req">*</span>
            </label>
            <Select
              value={form.state}
              onChange={(v) => setForm((f) => ({ ...f, state: v }))}
              placeholder="Choose a state"
              options={STATES.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div className="field">
            <label className="field__label">
              GSTIN <span className="field__opt">(optional)</span>
            </label>
            <input
              className="input"
              value={form.gstin}
              onChange={up('gstin')}
              placeholder="27AAAAA0000A1Z5"
              style={{ textTransform: 'uppercase' }}
            />
            <p className="field__hint">Add this to claim input tax credit. Leave blank if you don&apos;t have one.</p>
          </div>
        </div>

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : (<><CheckIcon size={15} /> {complete ? 'Save and continue' : 'Save'}</>)}
          </button>
        </div>
      </form>
    </Modal>
  );
}
