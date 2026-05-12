import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import dashboardHero from '../assets/dashboard_hero.png';

const LandingPage = () => {
    return (
        <div className="landing-page">
            <nav className="landing-nav">
                <Link to="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <img src={logo} alt="IronLogic" style={{ height: 32, width: 32, objectFit: 'contain' }} />
                    <span>IRONLOGIC</span>
                </Link>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Link to="/login" className="btn">Log In</Link>
                    <Link to="/register" className="btn btn-primary">Start Trial</Link>
                </div>
            </nav>

            <section
                className="landing-hero"
                style={{ backgroundImage: `linear-gradient(90deg, rgba(10,11,15,0.95) 0%, rgba(10,11,15,0.78) 48%, rgba(10,11,15,0.35) 100%), url(${dashboardHero})` }}
            >
                <div className="landing-hero-content">
                    <p className="page-kicker">Beta v2.7.26</p>
                    <h1>IronLogic</h1>
                    <p>
                        A performance workspace for lifters and coaches who want training logs, program templates,
                        recovery signals, and progress analysis in one calm system.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                        <Link to="/register" className="btn btn-primary">Start Your Trial</Link>
                        <Link to="/login" className="btn">Athlete Login</Link>
                    </div>
                </div>
            </section>

            <section className="landing-feature-band">
                <div className="glass-card">
                    <p className="page-kicker">Plan</p>
                    <h3>Template-driven programming</h3>
                    <p>Apply full training blocks to the calendar and keep every session structured.</p>
                </div>
                <div className="glass-card">
                    <p className="page-kicker">Track</p>
                    <h3>Clear daily logging</h3>
                    <p>Capture work sets, body metrics, readiness notes, and milestones without clutter.</p>
                </div>
                <div className="glass-card">
                    <p className="page-kicker">Analyze</p>
                    <h3>Performance visibility</h3>
                    <p>Use weekly volume, e1RM changes, and recovery signals to make better adjustments.</p>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
