import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, UserCheck, GraduationCap } from 'lucide-react';

const Login = () => {
    const { login } = useAuth();

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
        }}>
            <div className="card" style={{ padding: '3rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
                    <Activity size={48} />
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>FAP NextGen</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2.5rem' }}>Family Adoption Program Logbook</p>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    <button
                        onClick={() => login('student')}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem' }}
                    >
                        <UserCheck size={20} /> Student Login
                    </button>

                    <button
                        onClick={() => login('teacher')}
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: 'white' }}
                    >
                        <GraduationCap size={20} /> Teacher / Mentor Login
                    </button>

                    <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        <p>Powered by Google Drive Backend</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
