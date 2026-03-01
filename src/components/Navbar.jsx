import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import logo from '../assets/logo.png';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { syncStatus } = useData();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

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
                        <Link to="/" className={isActive('/')}>Home</Link>
                        <Link to="/calendar" className={isActive('/calendar')}>Calendar</Link>
                        <Link to="/progress" className={isActive('/progress')}>Progress</Link>
                        <Link to="/profile" className={isActive('/profile')}>Profile</Link>
                        <button onClick={handleLogout} className="btn" style={{ marginLeft: '1rem' }}>Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className={isActive('/login')}>Login</Link>
                        <Link to="/register" className={isActive('/register')}>Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
