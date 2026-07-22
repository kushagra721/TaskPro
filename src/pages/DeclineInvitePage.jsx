import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invitationsApi } from '../api/client.js';

const ALREADY_HANDLED_LABEL = {
  ACCEPTED: 'This invitation has already been accepted.',
  DECLINED: 'This invitation has already been cancelled.',
  CANCELLED: 'This invitation was revoked by the organization.',
};

/** Public page reached from the emailed invitation's "Cancel" button — works
 *  whether or not the visitor is logged in. Checks the invitation's status
 *  first (so re-clicking after it's been handled shows that plainly, instead
 *  of silently re-processing it), then asks for a confirmation before
 *  actually declining. */
export default function DeclineInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  // 'loading' | 'confirm' | 'cancelling' | 'done' | 'already-handled' | 'error'
  const [stage, setStage] = useState('loading');
  const [orgName, setOrgName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    invitationsApi
      .statusByToken(token)
      .then((res) => {
        setOrgName(res.organizationName);
        if (res.status === 'PENDING') {
          setStage('confirm');
        } else {
          setMessage(ALREADY_HANDLED_LABEL[res.status] || 'This invitation is no longer valid.');
          setStage('already-handled');
        }
      })
      .catch((err) => {
        setMessage(err.message || 'This invitation could not be found.');
        setStage('error');
      });
  }, [token]);

  const confirmCancel = async () => {
    setStage('cancelling');
    try {
      const res = await invitationsApi.declineByToken(token);
      setMessage(res.message || 'Invitation cancelled');
      setStage('done');
    } catch (err) {
      setMessage(err.message || 'Could not cancel this invitation');
      setStage('error');
    }
  };

  // Auto-redirect once there's nothing left to do on this page.
  useEffect(() => {
    if (!['done', 'already-handled', 'error'].includes(stage)) return undefined;
    const t = setTimeout(() => navigate('/'), 3000);
    return () => clearTimeout(t);
  }, [stage, navigate]);

  if (stage === 'loading') {
    return (
      <div className="screen-center">
        <span className="spinner" />
      </div>
    );
  }

  if (stage === 'confirm' || stage === 'cancelling') {
    return (
      <div className="screen-center" style={{ flexDirection: 'column', gap: 16, textAlign: 'center', padding: 24 }}>
        <div className="brand__logo-mark" style={{ margin: '0 auto' }}>✕</div>
        <p style={{ fontSize: 15, color: 'var(--text)', maxWidth: 380 }}>
          Cancel your invitation to <strong>{orgName}</strong>? This can&apos;t be undone.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn--ghost" style={{ width: 'auto', padding: '0 20px' }} onClick={() => navigate('/')} disabled={stage === 'cancelling'}>
            Keep invitation
          </button>
          <button className="btn btn--danger" style={{ width: 'auto', padding: '0 20px' }} onClick={confirmCancel} disabled={stage === 'cancelling'}>
            {stage === 'cancelling' ? <span className="spinner" /> : 'Cancel invitation'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-center" style={{ flexDirection: 'column', gap: 16, textAlign: 'center', padding: 24 }}>
      <div className="brand__logo-mark" style={{ margin: '0 auto' }}>
        {stage === 'done' ? '✓' : '✕'}
      </div>
      <p style={{ fontSize: 15, color: 'var(--text)', maxWidth: 380 }}>{message}</p>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Redirecting you to the home page…</p>
    </div>
  );
}
