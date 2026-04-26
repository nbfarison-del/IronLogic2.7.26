import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTimer } from '../context/TimerContext';
import logo from '../assets/logo.png';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { syncStatus } = useData();
    const { toggleTimer, isActive, timePassed, formatTime } = useTimer();
    const navigate = useNavigate();
    const location = useLocation();

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        setIsMenuOpen(false);
        logout();
        navigate('/login');
    };

    const handleClose = () => setIsMenuOpen(false);

    const isActivePath = (path) => location.pathname === path ? 'active' : '';

    return (
        <>
            <div className={`nav-overlay ${isMenuOpen ? 'open' : ''}`} onClick={handleClose}></div>
            <nav className="glass">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link to="/" className="nav-brand" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                        <img src={logo} alt="IronLogic" style={{ height: '28px', marginRight: '8px' }} />
                        <span className="nav-brand" style={{ fontSize: '1.25rem' }}>IRONLOGIC</span>
                    </Link>
                    {user && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.6rem',
                            color: syncStatus === 'online' ? 'var(--accent-success)' : 'var(--accent-error)',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            textTransform: 'uppercase',
                            fontWeight: '800',
                            letterSpacing: '0.05em',
                            border: `1px solid ${syncStatus === 'online' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                        }}>
                            <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: syncStatus === 'online' ? 'var(--accent-success)' : 'var(--accent-error)',
                                boxShadow: syncStatus === 'online' ? '0 0 8px var(--accent-success)' : 'none'
                            }}></div>
                            {syncStatus}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
                        {user ? (
                            <>
                                <Link to="/" className={isActivePath('/')} onClick={handleClose}>Dashboard</Link>
                                <Link to="/calendar" className={isActivePath('/calendar')} onClick={handleClose}>Training Plan</Link>
                                <Link to="/programs" className={isActivePath('/programs')} onClick={handleClose}>Programs</Link>
                                
                                <button 
                                    onClick={() => { toggleTimer(); handleClose(); }} 
                                    className="btn"
                                    style={{ 
                                        background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent', 
                                        border: isActive ? '1px solid var(--accent-success)' : '1px solid var(--border-glass)', 
                                        color: isActive ? 'var(--accent-success)' : 'white', 
                                        borderRadius: '10px',
                                        padding: '0.5rem 1rem',
                                        fontSize: '0.85rem',
                                        fontWeight: '700'
                                    }}
                                >
                                    {isActive ? `🕒 ${formatTime(timePassed)}` : '⏱️ Timer'}
                                </button>

                                {(user.role === 'coach' || user.role === 'admin') && (
                                    <Link to="/coach" className={isActivePath('/coach')} onClick={handleClose}>Coaching</Link>
                                )}
                                <Link to="/progress" className={isActivePath('/progress')} onClick={handleClose}>Analytics</Link>
                                <Link to="/profile" className={isActivePath('/profile')} onClick={handleClose}>Athlete Profile</Link>
                                
                                <button onClick={handleLogout} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-error)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Exit</button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className={isActivePath('/login')} onClick={handleClose}>Login</Link>
                                <Link to="/register" className={isActivePath('/register', 'btn-primary')} onClick={handleClose}>Join Team</Link>
                            </>
                        )}
                    </div>
                    {user && (
                        <button className="hamburger btn" onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ padding: '0.50rem' }}>
                            {isMenuOpen ? '✕' : '☰'}
                        </button>
                    )}
                </div>
            </nav>
        </>
    );
};

export default Navbar;
