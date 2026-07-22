import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice.js';
import { CheckIcon, GroupsIcon, ReportsIcon, MailIcon, MoreIcon, XIcon } from '../components/icons.jsx';

const FEATURES = [
  {
    Icon: GroupsIcon,
    title: 'Channels & chat',
    desc: 'Organize every team into channels with real-time chat, reactions and file sharing.',
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
  const [navOpen, setNavOpen] = useState(false);

  const primaryTo = user ? '/dashboard' : '/login';
  const primaryLabel = user ? 'My Workspace' : 'Login';

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="landing__header-inner">
          <div className="landing__logo">
            <span className="brand__logo-mark" style={{ width: 34, height: 34 }}>✓</span>
            Task&nbsp;Pro
          </div>

          <nav className={`landing__nav ${navOpen ? 'landing__nav--open' : ''}`}>
            <a href="#top" className="landing__nav-link landing__nav-link--active" onClick={() => setNavOpen(false)}>Home</a>
            <a href="#about" className="landing__nav-link" onClick={() => setNavOpen(false)}>About</a>
            <a href="#product" className="landing__nav-link" onClick={() => setNavOpen(false)}>Product</a>
            <a href="#pricing" className="landing__nav-link" onClick={() => setNavOpen(false)}>Pricing</a>
            <Link to={primaryTo} className="btn landing__nav-cta hide-desktop" onClick={() => setNavOpen(false)}>
              {primaryLabel}
            </Link>
          </nav>

          <div className="landing__header-actions">
            <Link to={primaryTo} className="btn landing__login-btn hide-mobile">{primaryLabel}</Link>
            <button
              className="icon-btn landing__burger hide-desktop"
              aria-label="Toggle menu"
              onClick={() => setNavOpen((v) => !v)}
            >
              {navOpen ? <XIcon size={22} /> : <MoreIcon size={22} />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section id="top" className="landing__hero">
          <div className="landing__hero-text">
            <h1>
              Task <span>Manager</span>
            </h1>
            <p>
              Task Pro brings organizations, channels, chat and tasks into one place — invite your
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

        <section id="product" className="landing__section">
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
        </section>

        <section id="about" className="landing__section landing__about">
          <h2 className="landing__section-title">Built for seamless team workflow</h2>
          <p className="landing__section-sub">
            No passwords to remember — sign in securely with a one-time code sent to your inbox.
            Create an organization, invite your team, and get to work in minutes.
          </p>
        </section>

        <section id="pricing" className="landing__section landing__pricing">
          <h2 className="landing__section-title">Simple, free to start</h2>
          <p className="landing__section-sub">
            Task Pro is free to use for your organization today — create one and invite your team.
          </p>
          <button className="btn landing__cta" onClick={() => navigate(primaryTo)}>
            {user ? 'Go to my workspace' : 'Create your account'}
          </button>
        </section>
      </main>

      <footer className="landing__footer">
        <div className="landing__footer-inner">
          <div className="landing__logo">
            <span className="brand__logo-mark" style={{ width: 30, height: 30 }}>✓</span>
            Task&nbsp;Pro
          </div>
          <p className="landing__footer-tag">Team tasks, chat &amp; collaboration.</p>
          <p className="landing__footer-copy">&copy; {new Date().getFullYear()} Task Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
