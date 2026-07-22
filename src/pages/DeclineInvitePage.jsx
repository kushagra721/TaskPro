import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invitationsApi } from '../api/client.js';

/** Public page reached from the emailed invitation's "Cancel" button — works
 *  whether or not the visitor is logged in, declines the invite by its token,
 *  then bounces to the home page. */
export default function DeclineInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    invitationsApi
      .declineByToken(token)
      .then((res) => {
        setStatus('done');
        setMessage(res.message || 'Invitation cancelled');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Could not cancel this invitation');
      });
  }, [token]);

  useEffect(() => {
    if (status === 'working') return;
    const t = setTimeout(() => navigate('/'), 2500);
    return () => clearTimeout(t);
  }, [status, navigate]);

  return (
    <div className="screen-center" style={{ flexDirection: 'column', gap: 16, textAlign: 'center', padding: 24 }}>
      {status === 'working' && <span className="spinner" />}
      {status !== 'working' && (
        <>
          <div className="brand__logo-mark" style={{ margin: '0 auto' }}>
            {status === 'done' ? '✓' : '✕'}
          </div>
          <p style={{ fontSize: 15, color: 'var(--text)', maxWidth: 360 }}>{message}</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Redirecting you to the home page…</p>
        </>
      )}
    </div>
  );
}
