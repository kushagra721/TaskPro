import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invitationsApi } from '../api/client.js';

const NOT_PENDING_LABEL = {
  ACCEPTED: 'This invitation has already been accepted.',
  DECLINED: 'This invitation has expired — it was already cancelled.',
  CANCELLED: 'This invitation has expired — it was revoked by the organization.',
};

/** Public page reached from the emailed invitation's "Accept" button. Checks
 *  the invitation is still pending before sending the visitor on to log in —
 *  a re-click after it's been declined/cancelled/accepted shows that plainly
 *  instead of letting them attempt to accept a dead invitation. */
export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState('loading'); // 'loading' | 'pending' | 'not-pending' | 'error'
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    invitationsApi
      .statusByToken(token)
      .then((res) => {
        setOrgName(res.organizationName);
        setEmail(res.email);
        if (res.status === 'PENDING') {
          setStage('pending');
        } else {
          setMessage(NOT_PENDING_LABEL[res.status] || 'This invitation is no longer valid.');
          setStage('not-pending');
        }
      })
      .catch((err) => {
        setMessage(err.message || 'This invitation could not be found.');
        setStage('error');
      });
  }, [token]);

  if (stage === 'loading') {
    return (
      <div className="screen-center">
        <span className="spinner" />
      </div>
    );
  }

  if (stage === 'pending') {
    return (
      <div className="screen-center" style={{ flexDirection: 'column', gap: 16, textAlign: 'center', padding: 24 }}>
        <div className="brand__logo-mark" style={{ margin: '0 auto' }}>✓</div>
        <p style={{ fontSize: 15, color: 'var(--text)', maxWidth: 380 }}>
          You&apos;re invited to join <strong>{orgName}</strong>. Log in with <strong>{email}</strong> to accept.
        </p>
        <button className="btn" style={{ width: 'auto', padding: '0 24px' }} onClick={() => navigate('/login')}>
          Continue to login
        </button>
      </div>
    );
  }

  return (
    <div className="screen-center" style={{ flexDirection: 'column', gap: 16, textAlign: 'center', padding: 24 }}>
      <div className="brand__logo-mark" style={{ margin: '0 auto' }}>✕</div>
      <p style={{ fontSize: 15, color: 'var(--text)', maxWidth: 380 }}>{message}</p>
      <button className="btn btn--ghost" style={{ width: 'auto', padding: '0 24px' }} onClick={() => navigate('/')}>
        Go to home
      </button>
    </div>
  );
}
