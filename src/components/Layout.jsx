import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import logo from '../assets/logo.png';

const Layout = () => {
    return (
        <div style={{ position: 'relative', minHeight: '100vh' }}>
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80vw',
                height: '80vh',
                backgroundImage: `url(${logo})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                opacity: 0.1,
                zIndex: 0,
                pointerEvents: 'none'
            }} />
            <Navbar />
            <main className="main-content" style={{ position: 'relative', zIndex: 1 }}>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
