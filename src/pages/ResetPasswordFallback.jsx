import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const extractToken = (input) => {
    const value = (input || '').trim();
    if (!value) return '';
    try {
        const url = new URL(value);
        return url.searchParams.get('token') || value;
    } catch {
        return value;
    }
};

const ResetPasswordFallback = () => {
    const navigate = useNavigate();
    const [tokenOrLink, setTokenOrLink] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = extractToken(tokenOrLink);
            if (!token) throw new Error('Paste the reset link or token from your email.');
            if (password.length < 8) throw new Error('Password must be at least 8 characters long.');
            if (password !== confirmPassword) throw new Error('Passwords do not match.');

            const { data, error: invokeError } = await supabase.functions.invoke('recover-password-token', {
                body: { token, password },
            });

            if (invokeError) throw invokeError;
            if (data?.error) throw new Error(data.error);

            setSuccess(true);
            setTimeout(() => navigate('/login', { replace: true }), 1500);
        } catch (err) {
            setError(err.message || 'Could not reset password. Request a fresh reset link.');
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
            padding: '2rem'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#6B7280', textDecoration: 'none', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                    <ArrowLeft size={16} /> Back to Login
                </Link>

                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1F2937', marginBottom: '0.35rem' }}>Fallback Password Reset</h1>
                <p style={{ color: '#6B7280', marginBottom: '1rem' }}>
                    If regular reset link fails, paste the full reset link from email and set a new password.
                </p>

                {error && (
                    <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #EF4444' }}>
                        {error}
                    </div>
                )}

                {success ? (
                    <div style={{ textAlign: 'center', padding: '1.25rem', backgroundColor: '#ECFDF5', borderRadius: '12px', border: '1px solid #10B981' }}>
                        <CheckCircle size={42} color="#059669" style={{ margin: '0 auto 0.75rem' }} />
                        <p style={{ margin: 0, color: '#065F46' }}>Password updated. Redirecting to login...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 500 }}>Reset Link or Token</label>
                            <textarea
                                value={tokenOrLink}
                                onChange={(e) => setTokenOrLink(e.target.value)}
                                placeholder="Paste full reset link from email (or token value)"
                                rows={3}
                                required
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 500 }}>New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={8}
                                required
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 500 }}>Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={8}
                                required
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px' }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.95rem',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontWeight: 600,
                                background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordFallback;
