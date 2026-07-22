/** Shared footer for every public marketing page. */
export default function LandingFooter() {
  return (
    <footer className="landing__footer">
      <div className="landing__footer-inner">
        <div className="landing__logo">
          <span className="brand__logo-mark" style={{ width: 30, height: 30 }}>✓</span>
          Task&nbsp;Pro
        </div>
        <p className="landing__footer-tag">Team tasks, chat &amp; collaboration.</p>
        <p className="landing__footer-powered">Task Pro is powered by Dial ERP.</p>
        <p className="landing__footer-copy">&copy; {new Date().getFullYear()} Task Pro. All rights reserved.</p>
      </div>
    </footer>
  );
}
