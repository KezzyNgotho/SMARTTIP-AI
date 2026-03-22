import { Link } from "react-router-dom";
import { supportedPlatforms } from "../core/platforms";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <section className="landing-band">
        <div className="landing-inner">
          <nav className="landing-nav">
            <p className="brand-mark">SmartTip</p>
            <div className="landing-nav-actions">
              <a href="#how-it-works">Features</a>
              <Link className="ghost-cta" to="/dashboard">
                Dashboard
              </Link>
            </div>
          </nav>

          <section className="landing">
            <p className="eyebrow">Welcome To SmartTip</p>
            <header className="landing-header">
              <h1>Tip smarter while you watch creators you love</h1>
              <p>
                SmartTip is a creator-support assistant that reads stream
                energy, respects your budget, and routes micro-tips with one
                intelligent decision layer across your favorite platforms.
              </p>
              <div className="landing-actions">
                <Link className="cta" to="/dashboard">
                  Launch Control Dashboard
                </Link>
                <a className="ghost-cta" href="#how-it-works">
                  How It Works
                </a>
              </div>
            </header>

            <div className="hero-banner">
              <p>Real-time signals + budget guardrails + LLM reasoning</p>
            </div>

            <div className="platform-row">
              {supportedPlatforms.map((platform) => (
                <span key={platform.id} className="platform-pill">
                  {platform.label}
                </span>
              ))}
            </div>

            <div className="hero-stats">
              <article className="stat-card">
                <p>Runtime</p>
                <strong>Chrome/Edge + PWA</strong>
              </article>
              <article className="stat-card">
                <p>Assets</p>
                <strong>USDt, BTC, XAUt</strong>
              </article>
              <article className="stat-card">
                <p>Core Engine</p>
                <strong>LLM Decision Agent</strong>
              </article>
            </div>
          </section>
        </div>
      </section>

      <section className="landing-band landing-band-soft" id="how-it-works">
        <div className="landing-inner landing-grid">
          <article className="feature-card">
            <h3>Signal-Aware Tipping</h3>
            <p>
              Watch time, pauses, comments, and chat spikes become live context
              for every tip decision.
            </p>
            <span className="feature-chip">Real-time parsing</span>
          </article>
          <article className="feature-card">
            <h3>Budget-First Guardrails</h3>
            <p>
              Your budget settings always stay in control while the agent
              handles timing and amount recommendations.
            </p>
            <span className="feature-chip">Safety-first</span>
          </article>
          <article className="feature-card">
            <h3>Creator Support At Scale</h3>
            <p>
              Move from manual tipping to consistent support with automated,
              transparent, and adjustable behavior.
            </p>
            <span className="feature-chip">Autonomous mode</span>
          </article>
        </div>
      </section>

      <section className="landing-band landing-footer-band">
        <div className="landing-inner landing-footer-row">
          <p>Built for hackathons. Ready for production iteration.</p>
          <Link className="cta" to="/dashboard">
            Go To Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
