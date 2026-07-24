import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice.js';
import {
  CheckIcon,
  GroupsIcon,
  ReportsIcon,
  BuildingIcon,
  TaskIcon,
  ActivityIcon,
  BellIcon,
  ShieldIcon,
  ChevronDownIcon,
} from '../components/icons.jsx';
import LandingHeader from '../components/landing/LandingHeader.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';
import heroImg from '../assets/landing-hero.svg';

const STEPS = [
  {
    n: '1',
    title: 'Create',
    desc: 'Spin up your workspace in seconds — no setup, no sales call.',
  },
  {
    n: '2',
    title: 'Invite',
    desc: 'Bring your team in by email, drop them into groups, and set roles.',
  },
  {
    n: '3',
    title: 'Deliver',
    desc: 'Chat, assign tasks, and watch status change live as work gets done.',
  },
];

const FEATURES = [
  {
    Icon: BuildingIcon,
    title: 'Workspaces & roles',
    desc: 'One workspace per team, with admin/member roles and email invites.',
  },
  {
    Icon: GroupsIcon,
    title: 'Groups & real-time chat',
    desc: 'Channel-style chat with reactions, rich text and file sharing.',
  },
  {
    Icon: TaskIcon,
    title: 'Tasks that move',
    desc: 'Priorities, due dates, assignees — status changes live for everyone.',
  },
  {
    Icon: ReportsIcon,
    title: 'Reports & dashboards',
    desc: 'See open work, completion trends and team load at a glance.',
  },
  {
    Icon: ActivityIcon,
    title: 'Full activity timeline',
    desc: 'Every edit and status change logged, searchable per task.',
  },
  {
    Icon: ShieldIcon,
    title: 'Passwordless & secure',
    desc: 'Sign in with a one-time code — nothing to remember, nothing to leak.',
  },
];

const FAQS = [
  {
    q: 'Do I need a credit card to start?',
    a: 'No. Create a workspace and invite your team — Task Pro is free to use today, no card required.',
  },
  {
    q: 'How does sign-in work?',
    a: 'Passwordless by default — we email you a one-time code. You can also set a password from My Profile if you\'d rather sign in that way.',
  },
  {
    q: 'Can I invite teammates who don\'t have an account yet?',
    a: 'Yes — invite by email from Manage Workspace. If they don\'t have an account, they\'ll be guided to create one and are added automatically once they accept.',
  },
  {
    q: 'What happens to my data if I leave a workspace?',
    a: 'Leaving reassigns admin duties automatically if needed and never deletes your account — you keep access to every other workspace you belong to.',
  },
  {
    q: 'Is chat really real-time?',
    a: 'Yes — messages, reactions, task updates and notifications all arrive live over a socket connection, no refreshing required.',
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`landing__faq-item ${open ? 'landing__faq-item--open' : ''}`}>
      <button type="button" className="landing__faq-q" onClick={() => setOpen((o) => !o)}>
        {q}
        <ChevronDownIcon size={18} className="landing__faq-chevron" />
      </button>
      {open && <p className="landing__faq-a">{a}</p>}
    </div>
  );
}

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
            <span className="landing__eyebrow">Now with real-time chat &amp; task tracking</span>
            <h1>
              Turn your team into a <span>task-crushing</span> workspace.
            </h1>
            <p>
              Task Pro brings workspaces, groups, chat and tasks into one place — invite your
              team, assign work, and watch it move in real time.
            </p>
            <div className="landing__hero-actions">
              <button className="btn landing__cta" onClick={() => navigate(primaryTo)}>
                <span className="landing__cta-dot"><CheckIcon size={14} /></span>
                Get started free
              </button>
              <Link to="/product" className="btn btn--ghost landing__cta">
                See how it works
              </Link>
            </div>
            <div className="landing__hero-trust">
              <span><CheckIcon size={13} /> No credit card</span>
              <span><CheckIcon size={13} /> Live in minutes</span>
              <span><CheckIcon size={13} /> Free to start</span>
            </div>
          </div>

          <div className="landing__hero-art" aria-hidden="true">
            <img className="landing__hero-img" src={heroImg} alt="" />
          </div>
        </section>

        <div className="landing__strip">
          <span className="landing__strip-label">Built for</span>
          <span>Startups</span>
          <span>Agencies</span>
          <span>Support teams</span>
          <span>Engineering</span>
          <span>Operations</span>
        </div>

        <section className="landing__section" id="how-it-works">
          <span className="landing__eyebrow landing__eyebrow--center">How it works</span>
          <h2 className="landing__section-title">From signup to shipped work in three steps</h2>
          <p className="landing__section-sub">No onboarding calls, no admin setup — most teams are chatting and assigning tasks the same day.</p>
          <div className="landing__steps">
            {STEPS.map((s) => (
              <div className="landing__step" key={s.n}>
                <span className="landing__step-num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing__section landing__about">
          <span className="landing__eyebrow landing__eyebrow--center">Why teams pick Task Pro</span>
          <h2 className="landing__section-title">Everything a fast-moving team needs</h2>
          <p className="landing__section-sub">One connected workspace instead of five disconnected tools.</p>
          <div className="landing__features landing__features--grid">
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

        <section className="landing__section landing__payoff">
          <div className="landing__payoff-text">
            <span className="landing__eyebrow">The payoff</span>
            <h2 className="landing__section-title" style={{ marginTop: 6 }}>Nothing falls through the cracks.</h2>
            <p className="landing__section-sub" style={{ margin: '0 0 22px' }}>
              Every message, task and status change is logged the moment it happens — one shared
              source of truth for the whole workspace.
            </p>
            <ul className="landing__payoff-list">
              <li><span className="landing__payoff-check"><CheckIcon size={13} /></span> Live activity feed, no refreshing</li>
              <li><span className="landing__payoff-check"><CheckIcon size={13} /></span> Notifications the moment you're assigned</li>
              <li><span className="landing__payoff-check"><CheckIcon size={13} /></span> Reports that show exactly where time goes</li>
            </ul>
          </div>
          <div className="landing__payoff-panel">
            <div className="landing__payoff-panel-head">
              <span>Recent activity</span>
              <span className="landing__payoff-live"><span className="landing__art-online" /> Live</span>
            </div>
            {[
              { icon: <TaskIcon size={14} />, text: 'Priya added new task "Fix invoice sync"', time: '2m' },
              { icon: <BellIcon size={14} />, text: 'Rahul was assigned "Update client contract"', time: '14m' },
              { icon: <CheckIcon size={14} />, text: 'Aisha marked "Weekly report" complete', time: '41m' },
              { icon: <GroupsIcon size={14} />, text: 'Vikram joined #Design Team', time: '1h' },
            ].map((row) => (
              <div className="landing__payoff-row" key={row.text}>
                <span className="landing__payoff-row-icon">{row.icon}</span>
                <span className="landing__payoff-row-text">{row.text}</span>
                <span className="landing__payoff-row-time">{row.time}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="landing__section landing__pricing" id="faq">
          <span className="landing__eyebrow landing__eyebrow--center">Questions</span>
          <h2 className="landing__section-title">Everything you're wondering</h2>
          <div className="landing__faq">
            {FAQS.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </section>

        <section className="landing__cta-banner">
          <h2>Ready to organize your team's work?</h2>
          <p>Create your workspace and invite your team — it takes less than a minute.</p>
          <button className="btn landing__cta landing__cta-banner-btn" onClick={() => navigate(primaryTo)}>
            {user ? 'Go to my workspace' : 'Get started free'}
          </button>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
