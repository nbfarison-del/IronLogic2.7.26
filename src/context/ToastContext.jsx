import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const toastIdRef = useRef(0);
    const showToast = useCallback((message, type = 'info') => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {toasts.map(t => (
                    <div key={t.id} style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        color: '#fff',
                        background: t.type === 'info' ? '#3b82f6' : t.type === 'success' ? '#10b981' : '#ef4444',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        animation: 'toast-in 0.3s ease-out',
                        fontWeight: '600',
                        fontSize: '0.9rem'
                    }}>
                        {t.message}
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes toast-in {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </ToastContext.Provider>
    );
};
