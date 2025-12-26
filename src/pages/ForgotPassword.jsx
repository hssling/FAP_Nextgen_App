import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Activity, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;
            setSuccess(true);
        } catch (err) {
            console.error('Reset password error:', err);
            setError(err.message || 'Failed to send reset email. Please try again.');
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
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '3rem',
                    maxWidth: '450px',
                    width: '100%',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                }}
            >
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#6B7280', textDecoration: 'none', marginBottom: '2rem', fontSize: '0.875rem' }}>
                    <ArrowLeft size={16} /> Back to Login
                </Link>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '50%', background: '#F0FDFA',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
                        color: '#0F766E'
                    }}>
                        <KeyIcon />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1F2937' }}>Forgot Password?</h1>
                    <p style={{ color: '#6B7280', marginTop: '0.5rem' }}>No worries, we'll send you reset instructions.</p>
                </div>

                {success ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#ECFDF5', borderRadius: '12px', border: '1px solid #10B981' }}
                    >
                        <CheckCircle size={48} color="#059669" style={{ margin: '0 auto 1rem' }} />
                        <h3 style={{ color: '#065F46', marginBottom: '0.5rem' }}>Email Sent!</h3>
                        <p style={{ color: '#047857', fontSize: '0.9rem' }}>Check your inbox for instructions to reset your password.</p>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid #EF4444' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
                                color: 'white',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

const KeyIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
    </svg>
);

export default ForgotPassword;
