import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Activity, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Step 1: Get user profile by username
            // Create a promise race to timeout the RPC call if it hangs
            const rpcPromise = supabase.rpc('get_user_by_username', { p_username: username });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timed out. Please check your internet connection.')), 8000)
            );

            const { data: userProfile, error: profileError } = await Promise.race([rpcPromise, timeoutPromise]);

            if (profileError) {
                console.error('RPC Error:', profileError);
                throw new Error('Database Error: ' + profileError.message);
            }

            if (!userProfile || userProfile.length === 0) {
                throw new Error('Invalid username or password');
            }

            const profile = userProfile[0];

            // Step 2: Sign in with email and password
            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: password,
            });

            if (signInError) {
                console.error('Auth Error:', signInError);
                throw new Error('Invalid username or password');
            }

            // Step 3: Redirect based on role
            const from = location.state?.from?.pathname || '/';

            if (profile.role === 'teacher') {
                navigate('/teacher-dashboard', { replace: true });
            } else if (profile.role === 'admin') {
                navigate('/admin-dashboard', { replace: true });
            } else {
                navigate(from, { replace: true });
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed. Please check your credentials and try again.');
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                    backgroundColor: 'white',
                    borderRadius: 'var(--radius-lg)',
                    padding: '3rem',
                    maxWidth: '450px',
                    width: '100%',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}
            >
                {/* Logo and Title */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                        <Activity size={56} color="#0F766E" style={{ margin: '0 auto 1rem' }} />
                    </motion.div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        FAP NextGen
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                        Family Adoption Programme
                    </p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Sign in to continue
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{
                            padding: '1rem',
                            backgroundColor: '#FEE2E2',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'flex-start',
                            border: '1px solid #FCA5A5'
                        }}
                    >
                        <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                        <span style={{ color: '#991B1B', fontSize: '0.875rem', lineHeight: '1.5' }}>{error}</span>
                    </motion.div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin}>
                    {/* Username Field */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: '500',
                            fontSize: '0.875rem',
                            color: 'var(--color-text)'
                        }}>
                            Username
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={20} style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-text-muted)',
                                pointerEvents: 'none'
                            }} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem 0.875rem 3rem',
                                    border: '2px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '1rem',
                                    transition: 'all 0.2s',
                                    backgroundColor: loading ? '#F9FAFB' : 'white'
                                }}
                                placeholder="Enter your username"
                                onFocus={(e) => e.target.style.borderColor = '#0F766E'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: '500',
                            fontSize: '0.875rem',
                            color: 'var(--color-text)'
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-text-muted)',
                                pointerEvents: 'none'
                            }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 3rem 0.875rem 3rem',
                                    border: '2px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '1rem',
                                    transition: 'all 0.2s',
                                    backgroundColor: loading ? '#F9FAFB' : 'white'
                                }}
                                placeholder="Enter your password"
                                onFocus={(e) => e.target.style.borderColor = '#0F766E'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: 'var(--color-text-muted)'
                                }}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '1rem',
                            fontSize: '1rem',
                            fontWeight: '600',
                            marginTop: '0.5rem',
                            background: loading
                                ? 'var(--color-border)'
                                : 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <span className="spinner" style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid white',
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 0.6s linear infinite'
                                }}></span>
                                Signing in...
                            </span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                        Don't have an account?{' '}
                        <a href="/register" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: '600' }}>
                            Create Account
                        </a>
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        Forgot your password?{' '}
                        <a href="#" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: '500' }}>
                            Contact Admin
                        </a>
                    </p>
                </div>

                {/* Version Info */}
                <div style={{
                    marginTop: '2rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid var(--color-border)',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        FAP NextGen v2.0 • NMC-CBME Aligned
                    </p>
                </div>
            </motion.div>

            {/* Add spinner animation */}
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default Login;
