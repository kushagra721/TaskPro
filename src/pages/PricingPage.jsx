import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice.js';
import { CheckIcon } from '../components/icons.jsx';
import LandingHeader from '../components/landing/LandingHeader.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';

const INCLUDED = [
  'Unlimited workspaces, groups and members',
  'Real-time chat with reactions and attachments',
  'Unlimited tasks, projects and activity history',
  'Admin reports and storage usage tracking',
  'Passwordless, secure sign-in — no passwords to manage',
];

export default function PricingPage() {
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  return (
    <div className="landing">
      <LandingHeader active="pricing" />

      <main>
        <section className="landing__page-hero">
          <h1>Simple pricing</h1>
          <p>Task Pro is free to use for your workspace today.</p>
        </section>

        <section className="landing__section">
          <div className="landing__pricing-card">
            <div className="landing__pricing-card-name">Free</div>
            <div className="landing__pricing-card-price">
              $0 <span>/ workspace</span>
            </div>
            <ul className="landing__pricing-list">
              {INCLUDED.map((item) => (
                <li key={item}>
                  <span className="landing__pricing-check"><CheckIcon size={14} /></span>
                  {item}
                </li>
              ))}
            </ul>
            <button className="btn landing__cta" onClick={() => navigate(user ? '/dashboard' : '/login')}>
              {user ? 'Go to my workspace' : 'Create your account'}
            </button>
          </div>
        </section>

        <section className="landing__section landing__about">
          <h2 className="landing__section-title">Questions?</h2>
          <p className="landing__section-sub">
            Reach out to your Task Pro administrator, or sign up and invite your team to try it
            for yourself.
          </p>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
