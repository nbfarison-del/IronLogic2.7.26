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

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActivePath = (path) => location.pathname === path ? 'active' : '';

    return (
        <nav>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link to="/" className="nav-brand" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                    <img src={logo} alt="IronLogic" style={{ height: '32px', marginRight: '8px' }} />
                    <span style={{ display: 'none' }}>IronLogic</span>
                </Link>
                {user && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.65rem',
                        color: syncStatus === 'online' ? '#4caf50' : '#f44336',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        marginLeft: '0.5rem',
                        textTransform: 'uppercase',
                        fontWeight: 'bold',
                        letterSpacing: '0.5px'
                    }}>
                        <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: syncStatus === 'online' ? '#4caf50' : '#f44336',
                            boxShadow: syncStatus === 'online' ? '0 0 5px #4caf50' : 'none'
                        }}></div>
                        {syncStatus}
                    </div>
                )}
                {user && (
                    <div style={{
                        fontSize: '0.6rem',
                        color: '#888',
                        marginLeft: '0.25rem',
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }} title={user.email}>
                        {user.email}
                    </div>
                )}
            </div>
            <div className="nav-links">
                {user ? (
                    <>
                        <Link to="/" className={isActivePath('/')}>Home</Link>
                        <Link to="/calendar" className={isActivePath('/calendar')}>Calendar</Link>
                        
                        {/* Global Timer Button */}
                        <button 
                            onClick={toggleTimer} 
                            style={{ 
                                background: isActive ? 'rgba(76, 175, 80, 0.1)' : 'transparent', 
                                border: isActive ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid transparent', 
                                color: isActive ? '#4caf50' : '#fff', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                fontWeight: 'bold',
                                borderRadius: '8px',
                                padding: '0.4rem 0.8rem',
                                transition: 'all 0.2s',
                                fontSize: '0.9rem'
                            }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            ⏱️ {isActive ? formatTime(timePassed) : 'Timer'}
                        </button>

                        {(user.role === 'coach' || user.role === 'admin') && (
                            <Link to="/coach" className={isActivePath('/coach')}>Coach</Link>
                        )}
                        <Link to="/progress" className={isActivePath('/progress')}>Progress</Link>
                        <Link to="/profile" className={isActivePath('/profile')}>Profile</Link>
                        {user.email === 'nbfarison@gmail.com' && (
                            <Link to="/admin" className={isActivePath('/admin')}>Admin</Link>
                        )}
                        <button onClick={handleLogout} className="btn" style={{ marginLeft: '1rem' }}>Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className={isActivePath('/login')}>Login</Link>
                        <Link to="/register" className={isActivePath('/register')}>Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
