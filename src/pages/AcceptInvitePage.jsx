import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invitationsApi } from '../api/client.js';
import { CheckIcon, XIcon } from '../components/icons.jsx';

const NOT_PENDING_LABEL = {
  ACCEPTED: 'This invitation has already been accepted.',
  DECLINED: 'This invitation has expired — it was already cancelled.',
  CANCELLED: 'This invitation has expired — it was revoked by the workspace.',
};

const Banner = () => (
  <div className="invite-response__banner">
    <div className="invite-response__logo">✓</div>
    <div className="invite-response__brand">Task Pro</div>
    <div className="invite-response__tagline">Team tasks, chat &amp; collaboration</div>
  </div>
);

/** Public page reached from the emailed invitation's "Accept" button. Checks
 *  the invitation is still pending before sending the visitor on to log in —
 *  a re-click after it's been declined/cancelled/accepted shows that plainly
 *  instead of letting them attempt to accept a dead invitation. Styled to
 *  match the branded invitation email. */
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
      <div className="invite-response">
        <div className="invite-response-card">
          <Banner />
          <div className="invite-response__body">
            <div className="invite-response__icon invite-response__icon--success">
              <CheckIcon size={26} />
            </div>
            <div className="invite-response__title">You're invited!</div>
            <p className="invite-response__text">
              You&apos;re invited to join <strong>{orgName}</strong>. Log in with <strong>{email}</strong> to accept.
            </p>
            <div className="invite-response__actions">
              <button className="btn" onClick={() => navigate('/login')}>Continue to login</button>
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
          <div className="invite-response__icon invite-response__icon--danger">
            <XIcon size={26} />
          </div>
          <div className="invite-response__title">Invitation no longer valid</div>
          <p className="invite-response__text">{message}</p>
          <div className="invite-response__actions">
            <button className="btn btn--ghost" onClick={() => navigate('/')}>Go to home</button>
          </div>
        </div>
      </div>
    </div>
  );
}
