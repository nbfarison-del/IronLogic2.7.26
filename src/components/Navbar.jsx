import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTimer } from '../context/TimerContext';
import logo from '../assets/logo.png';

const primaryLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/calendar', label: 'Calendar' },
    { to: '/programs', label: 'Programs' },
    { to: '/hyrox', label: 'Hyrox' },
    { to: '/progress', label: 'Analytics' },
    { to: '/profile', label: 'Profile' }
];

const Navbar = () => {
    const { user, logout } = useAuth();
    const { syncStatus } = useData();
    const { toggleTimer, isActive, timePassed, formatTime } = useTimer();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        setIsMenuOpen(false);
        await logout();
        navigate('/');
    };

    const handleClose = () => setIsMenuOpen(false);
    const isActivePath = (path) => location.pathname === path ? 'active' : '';
    const initials = (user?.name || user?.email || 'IL')
        .split(/[\s@.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('');

    return (
        <>
            <div className={`nav-overlay ${isMenuOpen ? 'open' : ''}`} onClick={handleClose}></div>
            <nav>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0 }}>
                    <Link to="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }} onClick={handleClose}>
                        <img src={logo} alt="IronLogic" style={{ height: 30, width: 30, objectFit: 'contain' }} />
                        <span>IRONLOGIC</span>
                    </Link>
                    <div className={`status-pill ${syncStatus === 'online' ? '' : 'offline'}`} title={`Sync status: ${syncStatus}`}>
                        <span className="status-dot"></span>
                        {syncStatus}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
                        {primaryLinks.map(link => (
                            <Link key={link.to} to={link.to} className={isActivePath(link.to)} onClick={handleClose}>
                                {link.label}
                            </Link>
                        ))}

                        {(user.role === 'coach' || user.role === 'admin') && (
                            <Link to="/coach" className={isActivePath('/coach')} onClick={handleClose}>Coaching</Link>
                        )}

                        <button
                            onClick={() => { toggleTimer(); handleClose(); }}
                            className="btn nav-timer"
                            style={{
                                background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.04)',
                                borderColor: isActive ? 'rgba(16, 185, 129, 0.35)' : undefined,
                                color: isActive ? 'var(--accent-success)' : 'var(--text-main)'
                            }}
                            aria-label={isActive ? `Timer running: ${formatTime(timePassed)}` : 'Open timer'}
                        >
                            {isActive ? formatTime(timePassed) : 'Timer'}
                        </button>

                        <button onClick={handleLogout} className="btn nav-timer" style={{ color: 'var(--accent-error)' }}>
                            Sign Out
                        </button>
                    </div>

                    <Link to="/profile" className="nav-profile-chip" title={user?.email || 'Profile'} onClick={handleClose}>
                        {initials}
                    </Link>

                    <button
                        className="hamburger btn"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{ padding: '0.48rem 0.62rem' }}
                        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMenuOpen}
                    >
                        {isMenuOpen ? 'Close' : 'Menu'}
                    </button>
                </div>
            </nav>
        </>
    );
};

export default Navbar;
