import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [success, setSuccess] = useState(false);
    const [canReset, setCanReset] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;

        const initializeRecoverySession = async () => {
            try {
                const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
                const queryParams = new URLSearchParams(window.location.search);

                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const type = hashParams.get('type');
                const code = queryParams.get('code');

                if (accessToken && refreshToken && type === 'recovery') {
                    const { error: setSessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (setSessionError) throw setSessionError;
                } else if (code) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) throw exchangeError;
                }

                const { data: { session } } = await supabase.auth.getSession();
                if (!mounted) return;

                if (session) {
                    setCanReset(true);
                } else {
                    setError('Reset link is invalid or expired. Please request a new one.');
                }
            } catch (err) {
                if (!mounted) return;
                setError(err.message || 'Could not validate reset link. Please request a new one.');
            } finally {
                if (mounted) setInitializing(false);
            }
        };

        initializeRecoverySession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;
            if (event === 'PASSWORD_RECOVERY' || !!session) {
                setCanReset(true);
                setError('');
            }
        });

        return () => {
            mounted = false;
            if (subscription?.unsubscribe) subscription.unsubscribe();
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (password.length < 8) {
                throw new Error('Password must be at least 8 characters long.');
            }
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match.');
            }

            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            setSuccess(true);
            await supabase.auth.signOut();
            setTimeout(() => navigate('/login', { replace: true }), 1500);
        } catch (err) {
            setError(err.message || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
            padding: '2rem',
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '3rem',
                maxWidth: '450px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#6B7280', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    <ArrowLeft size={16} /> Back to Login
                </Link>

                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1F2937', marginBottom: '0.5rem' }}>Reset Password</h1>
                <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>Set a new password for your account.</p>

                {initializing && (
                    <div style={{ color: '#6B7280' }}>Validating reset link...</div>
                )}

                {!initializing && error && (
                    <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #EF4444' }}>
                        {error}
                    </div>
                )}

                {!initializing && success && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: '#ECFDF5', borderRadius: '12px', border: '1px solid #10B981' }}>
                        <CheckCircle size={44} color="#059669" style={{ margin: '0 auto 0.75rem' }} />
                        <p style={{ color: '#065F46', margin: 0 }}>Password updated successfully. Redirecting to login...</p>
                    </div>
                )}

                {!initializing && canReset && !success && (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                                minLength={8}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                                minLength={8}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
                                color: 'white',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
