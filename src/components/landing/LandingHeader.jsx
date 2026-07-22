import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice.js';
import { MoreIcon, XIcon } from '../icons.jsx';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/product', label: 'Product' },
  { to: '/pricing', label: 'Pricing' },
];

/** Shared header for every public marketing page (Home/About/Product/Pricing). */
export default function LandingHeader({ active = 'home' }) {
  const user = useSelector(selectUser);
  const [navOpen, setNavOpen] = useState(false);

  const primaryTo = user ? '/dashboard' : '/login';
  const primaryLabel = user ? 'My Workspace' : 'Login';

  return (
    <header className="landing__header">
      <div className="landing__header-inner">
        <Link to="/" className="landing__logo">
          <span className="brand__logo-mark" style={{ width: 34, height: 34 }}>✓</span>
          Task&nbsp;Pro
        </Link>

        <nav className={`landing__nav ${navOpen ? 'landing__nav--open' : ''}`}>
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`landing__nav-link ${active === n.label.toLowerCase() ? 'landing__nav-link--active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              {n.label}
            </Link>
          ))}
          {/* <Link to={primaryTo} className="btn landing__nav-cta hide-desktop" onClick={() => setNavOpen(false)}>
            {primaryLabel}
          </Link> */}
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
  );
}
