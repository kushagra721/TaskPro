import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invitationsApi } from '../api/client.js';
import { CheckIcon, XIcon } from '../components/icons.jsx';

const ALREADY_HANDLED_LABEL = {
  ACCEPTED: 'This invitation has already been accepted.',
  DECLINED: 'This invitation has already been cancelled.',
  CANCELLED: 'This invitation was revoked by the organization.',
};

const Banner = () => (
  <div className="invite-response__banner">
    <div className="invite-response__logo">✓</div>
    <div className="invite-response__brand">Task Pro</div>
    <div className="invite-response__tagline">Team tasks, chat &amp; collaboration</div>
  </div>
);

/** Public page reached from the emailed invitation's "Cancel" button — works
 *  whether or not the visitor is logged in. Checks the invitation's status
 *  first (so re-clicking after it's been handled shows that plainly, instead
 *  of silently re-processing it), then asks for a confirmation before
 *  actually declining. Styled to match the branded invitation email. */
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
      <div className="invite-response">
        <div className="invite-response-card">
          <Banner />
          <div className="invite-response__body">
            <div className="invite-response__icon invite-response__icon--warn">
              <XIcon size={26} />
            </div>
            <div className="invite-response__title">Cancel this invitation?</div>
            <p className="invite-response__text">
              You're about to cancel your invitation to join <strong>{orgName}</strong>. This can&apos;t be undone
              — you'd need a new invitation to join later.
            </p>
            <div className="invite-response__actions">
              <button className="btn btn--ghost" onClick={() => navigate('/')} disabled={stage === 'cancelling'}>
                Keep invitation
              </button>
              <button className="btn btn--danger" onClick={confirmCancel} disabled={stage === 'cancelling'}>
                {stage === 'cancelling' ? <span className="spinner" /> : 'Cancel invitation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-response">
      <div className="invite-response-card">
        <Banner />
        <div className="invite-response__body">
          <div className={`invite-response__icon ${stage === 'done' ? 'invite-response__icon--success' : 'invite-response__icon--danger'}`}>
            {stage === 'done' ? <CheckIcon size={26} /> : <XIcon size={26} />}
          </div>
          <div className="invite-response__title">{stage === 'done' ? 'Invitation cancelled' : 'Nothing to do here'}</div>
          <p className="invite-response__text">{message}</p>
          <div className="invite-response__actions">
            <button className="btn" onClick={() => navigate('/')}>Go to home</button>
          </div>
          <p className="invite-response__redirect">Redirecting you to the home page…</p>
        </div>
      </div>
    </div>
  );
}
