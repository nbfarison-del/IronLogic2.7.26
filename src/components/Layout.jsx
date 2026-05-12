import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { user } = useAuth();

    return (
        <div className="app-shell">
            {user && <Navbar />}
            <main className="main-content" style={{ paddingTop: user ? '5.25rem' : 0 }}>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
