import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { confirmReset } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Firebase oobCode from URL
    const query = new URLSearchParams(location.search);
    const oobCode = query.get('oobCode');

    useEffect(() => {
        if (!oobCode) {
            setError('Invalid or expired reset link. Please request a new one.');
        }
    }, [oobCode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }
        
        if (password.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        setError('');
        setLoading(true);

        try {
            await confirmReset(oobCode, password);
            setMessage('Password successfully updated! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/expired-action-code') {
                setError('Reset link has expired. Please request a new one.');
            } else if (err.code === 'auth/invalid-action-code') {
                setError('Invalid reset link. It may have already been used.');
            } else {
                setError(err.message || 'Failed to update password.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
            <h1>Set New Password</h1>
            {error && (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--accent-error)', marginBottom: '1rem' }}>{error}</p>
                    <Link to="/forgot-password" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Resend Reset Link</Link>
                </div>
            )}
            
            {message && (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--accent-success)', marginBottom: '1.5rem' }}>{message}</p>
                    <Link to="/login" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>Back to Login</Link>
                </div>
            )}

            {!error && !message && (
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••"
                            minLength={6}
                        />
                    </div>
                    <div className="input-group">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="••••••"
                            minLength={6}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default ResetPassword;
