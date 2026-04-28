import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const LandingPage = () => {
    return (
        <div className="landing-page" style={{ 
            background: '#0a0a0a', 
            color: '#fff', 
            minHeight: '100vh',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
            {/* Nav */}
            <nav style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1.5rem 2rem',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src={logo} alt="IronLogic" style={{ height: '32px' }} />
                    <span style={{ fontWeight: '900', fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--primary)' }}>IRONLOGIC</span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <Link to="/login" style={{ color: '#fff', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>Log In</Link>
                    <Link to="/register" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}>Sign Up</Link>
                </div>
            </nav>

            {/* Hero */}
            <section style={{ 
                padding: '6rem 1rem 8rem',
                textAlign: 'center',
                background: 'radial-gradient(circle at 50% 50%, rgba(var(--primary-rgb), 0.1) 0%, transparent 60%)'
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div className="badge animate-in" style={{ 
                        background: 'rgba(var(--primary-rgb), 0.1)', 
                        color: 'var(--primary)', 
                        padding: '0.5rem 1rem', 
                        borderRadius: '100px', 
                        fontSize: '0.75rem', 
                        fontWeight: '800',
                        marginBottom: '2rem',
                        display: 'inline-block',
                        letterSpacing: '0.1em'
                    }}>
                        NOW IN BETA V2.7.26
                    </div>
                    <h1 style={{ 
                        fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', 
                        fontWeight: '900', 
                        lineHeight: 1, 
                        marginBottom: '1.5rem',
                        letterSpacing: '-0.04em'
                    }}>
                        The Engine for <br />
                        <span style={{ color: 'var(--primary)' }}>Elite Performance</span>
                    </h1>
                    <p style={{ 
                        fontSize: '1.25rem', 
                        color: 'rgba(255,255,255,0.6)', 
                        marginBottom: '3rem',
                        lineHeight: 1.5,
                        maxWidth: '600px',
                        margin: '0 auto 3rem'
                    }}>
                        IronLogic uses the <strong>DMAIC Method</strong> to optimize your training in real-time. Stop guessing. Start executing with data-driven precision.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '12px', fontWeight: '700' }}>
                            Start Your 14-Day Trial
                        </Link>
                        <Link to="/login" className="btn" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', fontWeight: '700' }}>
                            Athlete Login
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section style={{ padding: '4rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'left' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>🧠</div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>DMAIC Engine</h3>
                        <p style={{ opacity: 0.7, lineHeight: 1.6 }}>Define, Measure, Analyze, Improve, and Control. Our AI-driven engine adjusts your volume and intensity based on your actual data.</p>
                    </div>
                    <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'left' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>🤝</div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Partner Hub</h3>
                        <p style={{ opacity: 0.7, lineHeight: 1.6 }}>Train with anyone on a single device. One-phone mode with alternating turn-tracking and shared logging.</p>
                    </div>
                    <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'left' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>📈</div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Elite Analytics</h3>
                        <p style={{ opacity: 0.7, lineHeight: 1.6 }}>Track e1RM, DOTS scores, and weekly volume milestones with precision. Visualized history for every movement.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '6rem 2rem 4rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4rem', textAlign: 'center' }}>
                <div style={{ opacity: 0.5, fontSize: '0.9rem' }}>
                    &copy; 2026 IronLogic Performance Platform. <br />
                    Built for lifters who speak the language of data.
                </div>
            </footer>

            <style>{`
                .landing-page .btn-primary {
                    background: var(--primary);
                    color: #000;
                    border: none;
                }
                .landing-page .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(var(--primary-rgb), 0.2);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-in {
                    animation: fadeIn 0.8s ease forwards;
                }
            `}</style>
        </div>
    );
};

export default LandingPage;
