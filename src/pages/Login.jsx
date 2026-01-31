import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Activity, Lock, User, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

// CSS-based animations for faster initial load (no framer-motion dependency)
const fadeInStyle = {
    animation: 'fadeInUp 0.5s ease-out forwards'
};

const scaleInStyle = {
    animation: 'scaleIn 0.3s ease-out 0.2s forwards',
    opacity: 0
};

// Inline keyframes for the animations (will be added to document)
const animationStyles = `
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
`;

// Simple CSS-based spinner (no external dependencies)
const SimpleSpinner = ({ size = 16 }) => (
    <div
        style={{
            width: size,
            height: size,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
        }}
    />
);

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Add animation styles on mount (only once)
    useEffect(() => {
        if (!document.getElementById('login-animations')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'login-animations';
            styleSheet.textContent = animationStyles;
            document.head.appendChild(styleSheet);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let loginEmail = username.trim();

            // If input is NOT an email, look up the email from username
            if (!loginEmail.includes('@')) {
                // Use the secure RPC function instead of direct table access
                // This bypasses RLS issues for unauthenticated users
                const { data: userData, error: fnError } = await supabase
                    .rpc('get_user_by_username', { p_username: loginEmail.toLowerCase() });

                if (fnError) {
                    console.error('Username lookup error:', fnError);
                    // Provide more specific error messages
                    if (fnError.code === 'PGRST301') {
                        throw new Error('Authentication service unavailable. Try again.');
                    }
                    throw new Error('Unable to verify username. Please try again.');
                }

                if (!userData || userData.length === 0) {
                    throw new Error('Invalid username or password');
                }

                loginEmail = userData[0].email;
                
                // Validate we got a proper email
                if (!loginEmail || !loginEmail.includes('@')) {
                    console.error('Invalid email from RPC:', loginEmail);
                    throw new Error('Account configuration error. Contact admin.');
                }
            }

            // Step 2: Sign in with email and password
            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: password,
            });

            if (signInError) {
                console.error('Auth Error:', signInError);
                // Provide more user-friendly error messages
                if (signInError.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid username or password');
                }
                if (signInError.message.includes('Email not confirmed')) {
                    throw new Error('Please verify your email before logging in');
                }
                throw new Error('Login failed. Please check your credentials.');
            }

            // Check if authData and user exist
            if (!authData || !authData.user) {
                throw new Error('Login failed. Please try again.');
            }

            // Step 3: Fetch Role to Redirect
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role, is_active')
                .eq('id', authData.user.id)
                .single();

            if (profileError) {
                console.error('Profile fetch error:', profileError);
                // Don't block login if profile fetch fails, just use default role
            }

            if (profileData && profileData.is_active === false) {
                await supabase.auth.signOut();
                throw new Error('Your account is deactivated. Please contact admin.');
            }

            const userRole = profileData?.role || 'student';
            toast.success('Welcome back!');

            // Step 4: Redirect based on role
            const from = location.state?.from?.pathname || '/';

            if (userRole === 'teacher') {
                navigate('/teacher-dashboard', { replace: true });
            } else if (userRole === 'admin') {
                navigate('/admin-dashboard', { replace: true });
            } else {
                navigate(from, { replace: true });
            }

        } catch (err) {
            console.error('Login error:', err);
            toast.error(err.message || 'Login failed. Please check your credentials.');
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
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '3rem',
                    maxWidth: '450px',
                    width: '100%',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    ...fadeInStyle
                }}
            >
                {/* Logo and Title */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={scaleInStyle}>
                        <Activity size={56} color="#0F766E" style={{ margin: '0 auto 1rem' }} />
                    </div>
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
                    <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>
                        Family Adoption Programme
                    </p>
                    <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Sign in to continue
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin}>
                    {/* Username Field */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: '500',
                            fontSize: '0.875rem',
                            color: '#374151'
                        }}>
                            Username or Email
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={20} style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9CA3AF',
                                pointerEvents: 'none'
                            }} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="username"
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem 0.875rem 3rem',
                                    border: '2px solid #E5E7EB',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    transition: 'all 0.2s',
                                    backgroundColor: loading ? '#F9FAFB' : 'white',
                                    boxSizing: 'border-box'
                                }}
                                placeholder="Username or Email Address"
                                onFocus={(e) => e.target.style.borderColor = '#0F766E'}
                                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
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
                            color: '#374151'
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9CA3AF',
                                pointerEvents: 'none'
                            }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="current-password"
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 3rem 0.875rem 3rem',
                                    border: '2px solid #E5E7EB',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    transition: 'all 0.2s',
                                    backgroundColor: loading ? '#F9FAFB' : 'white',
                                    boxSizing: 'border-box'
                                }}
                                placeholder="Enter your password"
                                onFocus={(e) => e.target.style.borderColor = '#0F766E'}
                                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
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
                                    color: '#9CA3AF'
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
                        style={{
                            width: '100%',
                            padding: '1rem',
                            fontSize: '1rem',
                            fontWeight: '600',
                            marginTop: '0.5rem',
                            background: loading
                                ? '#9CA3AF'
                                : 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <SimpleSpinner size={16} />
                                <span>Signing in...</span>
                            </span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.75rem' }}>
                        Don't have an account?{' '}
                        <a href="/register" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: '600' }}>
                            Create Account
                        </a>
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                        Forgot your password?{' '}
                        <a href="/forgot-password" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: '500' }}>
                            Reset Here
                        </a>
                    </p>
                </div>

                {/* Version Info */}
                <div style={{
                    marginTop: '2rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid #E5E7EB',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                        FAP NextGen v2.0 • NMC-CBME Aligned
                    </p>
                    <p style={{ fontSize: '0.7rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                        Concept & Design: <br />
                        <span style={{ fontWeight: '600', color: '#0F766E' }}>Dr. Siddalingaiah H.S.</span><br />
                        Professor, Community Medicine<br />
                        Shridevi Institute of Medical Sciences & Research Hospital, Tumkur
                    </p>
                    <div style={{ marginTop: '1rem' }}>
                        <p style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Protected by FAP Security</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
