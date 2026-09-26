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
                    <Link to="/register" className="btn btn-primary">Start Free</Link>
                </div>
            </nav>

            <section
                className="landing-hero"
                style={{ backgroundImage: `linear-gradient(90deg, rgba(10,11,15,0.95) 0%, rgba(10,11,15,0.78) 48%, rgba(10,11,15,0.35) 100%), url(${dashboardHero})` }}
            >
                <div className="landing-hero-content">
                    <p className="page-kicker">Daily mobility, prescribed</p>
                    <h1>Ten minutes a day. Every day.</h1>
                    <p>
                        IronLogic prescribes a 10-minute mobility session matched to your training —
                        run, lift, or rest — then keeps your streak alive and lets you share it.
                        Free forever. No programming, no logging, no noise.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                        <Link to="/register" className="btn btn-primary">Start Free</Link>
                        <Link to="/login" className="btn">Log In</Link>
                    </div>
                </div>
            </section>

            <section className="landing-feature-band">
                <div className="glass-card">
                    <p className="page-kicker">Prescribed</p>
                    <h3>Matched to your training</h3>
                    <p>Tell the app what you trained — one tap — and get the right 10-minute session for it.</p>
                </div>
                <div className="glass-card">
                    <p className="page-kicker">Streaks</p>
                    <h3>Consistency you can see</h3>
                    <p>Daily streaks, weekly dots, and 28-day adherence keep the habit honest.</p>
                </div>
                <div className="glass-card">
                    <p className="page-kicker">Shareable</p>
                    <h3>Post your streak</h3>
                    <p>Turn a hard-earned streak into a card worth sharing — accountability built in.</p>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
