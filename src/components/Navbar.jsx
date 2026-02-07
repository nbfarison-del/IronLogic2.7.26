import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <nav>
            <Link to="/" className="nav-brand">IronLogic</Link>
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
