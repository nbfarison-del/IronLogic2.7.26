import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTimer } from '../context/TimerContext';
import logo from '../assets/logo.png';

const primaryLinks = [];

const tabLinks = [
    { to: '/', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { to: '/log', label: 'Log', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
    { to: '/olympic-lifting', label: 'Olympic', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { to: '/calendar', label: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { to: '/progress', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
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

            <div className="bottom-tabs">
                {tabLinks.map(link => (
                    <Link key={link.to} to={link.to} className={`bottom-tab ${isActivePath(link.to) ? 'active' : ''}`} onClick={handleClose}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d={link.icon} />
                        </svg>
                        <span className="bottom-tab-label">{link.label}</span>
                    </Link>
                ))}
            </div>
        </>
    );
};

export default Navbar;
