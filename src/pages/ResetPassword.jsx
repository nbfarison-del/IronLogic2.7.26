import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [linkError, setLinkError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingLink, setCheckingLink] = useState(true);
    const { confirmReset, verifyResetCode } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const query = new URLSearchParams(location.search);
    const oobCode = query.get('oobCode');

    useEffect(() => {
        let isMounted = true;

        const validateLink = async () => {
            setError('');
            setLinkError('');

            if (!oobCode) {
                setLinkError('Invalid or expired reset link. Please request a new one.');
                setCheckingLink(false);
                return;
            }

            try {
                const email = await verifyResetCode(oobCode);
                console.log('Reset Password UI: valid reset code for:', email);
            } catch (err) {
                console.error('Reset Password UI: invalid reset code:', err);
                if (!isMounted) return;

                if (err.code === 'auth/expired-action-code') {
                    setLinkError('Reset link has expired. Please request a new one.');
                } else if (err.code === 'auth/invalid-action-code') {
                    setLinkError('Invalid reset link. It may have already been used.');
                } else {
                    setLinkError(err.message || 'Unable to verify this reset link.');
                }
            } finally {
                if (isMounted) setCheckingLink(false);
            }
        };

        validateLink();

        return () => {
            isMounted = false;
        };
    }, [oobCode, verifyResetCode]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await confirmReset(oobCode, password);
            console.log('Reset Password UI: confirm reset response:', response ?? { status: 'updated' });
            setMessage('Password successfully updated! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/expired-action-code') {
                setLinkError('Reset link has expired. Please request a new one.');
            } else if (err.code === 'auth/invalid-action-code') {
                setLinkError('Invalid reset link. It may have already been used.');
            } else if (err.code === 'auth/weak-password') {
                setError('Choose a stronger password with at least 6 characters.');
            } else {
                setError(err.message || 'Failed to update password.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="card auth-card">
            <p className="page-kicker">Account Recovery</p>
            <h1>Set new password</h1>

            {linkError && (
                <div style={{ textAlign: 'center' }}>
                    <div className="empty-state" style={{ color: 'var(--accent-error)', marginBottom: '1rem' }}>{linkError}</div>
                    <Link to="/forgot-password" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Resend Reset Link</Link>
                </div>
            )}

            {message && (
                <div style={{ textAlign: 'center' }}>
                    <div className="empty-state" style={{ color: 'var(--accent-success)', marginBottom: '1rem' }}>{message}</div>
                    <Link to="/login" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>Back to Login</Link>
                </div>
            )}

            {checkingLink && !linkError && !message && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Checking reset link...</p>
            )}

            {!checkingLink && !linkError && !message && (
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="******"
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
                            placeholder="******"
                            minLength={6}
                        />
                    </div>
                    {error && <div className="empty-state" style={{ color: 'var(--accent-error)', marginBottom: '1rem' }}>{error}</div>}
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            )}
            </div>
        </div>
    );
};

export default ResetPassword;
