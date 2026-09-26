import { Link, useLocation } from 'react-router-dom';

const items = [
    {
        to: '/', label: 'Mobility',
        icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="2.2" /><path d="M12 8v6M12 11l-4 2M12 11l4 2M12 14l-3 7M12 14l3 7" /></svg>,
    },
    {
        to: '/paths', label: 'Paths',
        icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19c4-1 4-6 8-7s4-6 8-7" /><circle cx="4" cy="19" r="1.6" /><circle cx="20" cy="5" r="1.6" /></svg>,
    },
    {
        to: '/progress', label: 'Progress',
        icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>,
    },
    {
        to: '/profile', label: 'Profile',
        icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></svg>,
    },
];

const BottomNav = () => {
    const { pathname } = useLocation();
    return (
        <nav
            aria-label="Primary"
            style={{
                position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
                display: 'flex', background: 'var(--nav-bg, #0c0d11)',
                borderTop: '1px solid var(--border)',
                padding: '0.45rem 0 calc(0.7rem + env(safe-area-inset-bottom))',
            }}
        >
            {items.map(item => {
                const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
                return (
                    <Link
                        key={item.to}
                        to={item.to}
                        style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem',
                            color: active ? 'var(--primary)' : 'var(--text-muted)',
                            textDecoration: 'none', fontSize: '0.66rem', fontWeight: active ? 700 : 600,
                        }}
                    >
                        {item.icon}
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
};

export default BottomNav;
