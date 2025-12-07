import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

const RescueLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setStatus('Attempting login...');
        console.log('Attempting direct login with:', email);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                setStatus('Error: ' + error.message);
                console.error('Login error:', error);
            } else {
                setStatus('Success! User ID: ' + data.user.id);
                console.log('Login success:', data);

                // Wait 1s then check profile
                setStatus('Checking profile...');
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) {
                    setStatus('Login successful, but profile fetch failed: ' + profileError.message);
                } else {
                    setStatus(`Success! Logged in as ${profile.role}. Redirecting...`);
                    setTimeout(() => {
                        if (profile.role === 'admin') navigate('/admin-dashboard');
                        else if (profile.role === 'teacher') navigate('/teacher-dashboard');
                        else navigate('/');
                    }, 1000);
                }
            }
        } catch (err) {
            setStatus('Crash: ' + err.message);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1>🚑 Rescue Login</h1>
            <p>Use this if username login is broken.</p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label>Email (NOT Username):</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="e.g. admin@example.com"
                        style={{ width: '100%', padding: '0.5rem' }}
                        required
                    />
                </div>

                <div>
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem' }}
                        required
                    />
                </div>

                <button type="submit" style={{ padding: '0.75rem', backgroundColor: '#DC2626', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Emergency Login
                </button>
            </form>

            <div style={{ marginTop: '1rem', padding: '1rem', background: '#F3F4F6', borderRadius: '4px' }}>
                <strong>Status:</strong> {status}
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h3>Emails to try:</h3>
                <ul>
                    <li>admin@fap.edu</li>
                    <li>student1@fap.edu</li>
                    <li>teacher1@fap.edu</li>
                </ul>
            </div>
        </div>
    );
};

export default RescueLogin;
