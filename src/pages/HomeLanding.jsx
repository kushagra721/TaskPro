import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice.js';
import { CheckIcon, GroupsIcon, ReportsIcon, MailIcon } from '../components/icons.jsx';
import LandingHeader from '../components/landing/LandingHeader.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';

const FEATURES = [
  {
    Icon: GroupsIcon,
    title: 'Groups & chat',
    desc: 'Organize every team into groups with real-time chat, reactions and file sharing.',
  },
  {
    Icon: CheckIcon,
    title: 'Tasks that move',
    desc: 'Assign work, track priority and due dates, and see status change live as work gets done.',
  },
  {
    Icon: ReportsIcon,
    title: 'Reports & activity',
    desc: 'A full timeline of every change plus dashboards that show where time is going.',
  },
];

export default function HomeLanding() {
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const primaryTo = user ? '/dashboard' : '/login';

  return (
    <div className="landing">
      <LandingHeader active="home" />

      <main>
        <section className="landing__hero">
          <div className="landing__hero-text">
            <h1>
              Task <span>Pro</span>
            </h1>
            <p>
              Task Pro brings organizations, groups, chat and tasks into one place — invite your
              team, assign work, and watch it move in real time.
            </p>
            <div className="landing__hero-actions">
              <button className="btn landing__cta" onClick={() => navigate(primaryTo)}>
                <span className="landing__cta-dot"><CheckIcon size={14} /></span>
                Get started
              </button>
            </div>
          </div>

          <div className="landing__hero-art" aria-hidden="true">
            <div className="landing__art-card">
              <div className="landing__art-row">
                <span className="landing__art-chip landing__art-chip--pink" />
                <span className="landing__art-chip landing__art-chip--indigo" />
              </div>
              <div className="landing__art-row">
                <span className="landing__art-chip landing__art-chip--indigo" />
                <span className="landing__art-chip landing__art-chip--pink" />
              </div>
              <div className="landing__art-row">
                <span className="landing__art-chip landing__art-chip--check"><CheckIcon size={16} /></span>
                <span className="landing__art-chip landing__art-chip--check"><CheckIcon size={16} /></span>
              </div>
            </div>
            <div className="landing__art-badge landing__art-badge--1"><MailIcon size={18} /></div>
            <div className="landing__art-badge landing__art-badge--2"><GroupsIcon size={18} /></div>
          </div>
        </section>

        <section className="landing__section">
          <h2 className="landing__section-title">Why teams pick Task Pro</h2>
          <p className="landing__section-sub">Everything a fast-moving team needs, without the clutter.</p>
          <div className="landing__features">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div className="landing__feature-card" key={title}>
                <div className="landing__feature-icon"><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <Link to="/product" className="landing__more-link">See the full product tour →</Link>
        </section>

        <section className="landing__section landing__about">
          <h2 className="landing__section-title">Built for seamless team workflow</h2>
          <p className="landing__section-sub">
            No passwords to remember — sign in securely with a one-time code sent to your inbox.
            Create an organization, invite your team, and get to work in minutes.
          </p>
          <Link to="/about" className="landing__more-link">More about Task Pro →</Link>
        </section>

        <section className="landing__section landing__pricing">
          <h2 className="landing__section-title">Simple, free to start</h2>
          <p className="landing__section-sub">
            Task Pro is free to use for your organization today — create one and invite your team.
          </p>
          <div className="landing__hero-actions" style={{ justifyContent: 'center' }}>
            <button className="btn landing__cta" onClick={() => navigate(primaryTo)}>
              {user ? 'Go to my workspace' : 'Create your account'}
            </button>
            <Link to="/pricing" className="btn btn--ghost landing__cta">See pricing details</Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
