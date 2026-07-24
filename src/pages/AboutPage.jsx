import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice.js';
import { ShieldIcon, GroupsIcon, ActivityIcon } from '../components/icons.jsx';
import LandingHeader from '../components/landing/LandingHeader.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';

const VALUES = [
  {
    Icon: ShieldIcon,
    title: 'Secure by default',
    desc: 'Passwordless sign-in, org-scoped data access, and role-based permissions everywhere it matters.',
  },
  {
    Icon: GroupsIcon,
    title: 'Built for teams',
    desc: 'Every workspace, groups and task is designed around collaborating with people, not just tracking work.',
  },
  {
    Icon: ActivityIcon,
    title: 'Transparent by design',
    desc: 'A full activity timeline means nothing changes silently — every edit, assignment and status change is logged.',
  },
];

export default function AboutPage() {
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  return (
    <div className="landing">
      <LandingHeader active="about" />

      <main>
        <section className="landing__page-hero">
          <h1>About Task Pro</h1>
          <p>
            Task Pro is a multi-tenant, Slack-style platform for teams who want workspaces,
            groups, chat and task management in one connected place — instead of stitched
            together across four different tools.
          </p>
        </section>

        <section className="landing__section">
          <h2 className="landing__section-title">Why we built it</h2>
          <p className="landing__section-sub">
            Most teams end up juggling a chat app, a task tracker, a file store and a reporting
            dashboard that never quite agree with each other. Task Pro keeps workspaces,
            groups, conversations, tasks and activity history under one roof, so context never
            gets lost moving between tools.
          </p>
        </section>

        <section className="landing__section">
          <h2 className="landing__section-title">What we value</h2>
          <p className="landing__section-sub">The principles behind how Task Pro is built.</p>
          <div className="landing__features">
            {VALUES.map(({ Icon, title, desc }) => (
              <div className="landing__feature-card" key={title}>
                <div className="landing__feature-icon"><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing__section landing__pricing">
          <h2 className="landing__section-title">Ready to get organized?</h2>
          <p className="landing__section-sub">Create your workspace and invite your team in minutes.</p>
          <button className="btn landing__cta" onClick={() => navigate(user ? '/dashboard' : '/login')}>
            {user ? 'Go to my workspace' : 'Get started'}
          </button>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
