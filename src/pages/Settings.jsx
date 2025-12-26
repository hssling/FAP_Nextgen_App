import React, { useState } from 'react';
import { User, Download, Trash2, Database, Save, Check } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
    const { profile, signOut } = useAuth();

    // Use real data or fallbacks
    const [studentName, setStudentName] = useState(profile?.full_name || '');

    const handleLogout = async () => {
        try {
            await signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="page-title" style={{ marginBottom: '2rem' }}>Settings</h1>

            {/* User Profile Section */}
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <User size={20} className="text-primary" /> User Profile
                </h2>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Full Name</label>
                            <div className="input" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                                {profile?.full_name || 'N/A'}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Username / Roll No</label>
                            <div className="input" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                                {profile?.username || 'N/A'}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Role</label>
                        <div style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '999px',
                            background: profile?.role === 'admin' ? '#FEF3C7' : '#DBEAFE',
                            color: profile?.role === 'admin' ? '#D97706' : '#2563EB',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            textTransform: 'capitalize'
                        }}>
                            {profile?.role || 'User'}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1rem' }}>
                        <button className="btn btn-outline" onClick={handleLogout} style={{ color: '#DC2626', borderColor: '#FECACA' }}>
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>

            {/* Data Management Section */ }
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Database size={20} className="text-secondary" /> Data Management
                </h2>
                
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    Your data is securely stored in the cloud. You can download a complete backup of your records (families, visits, reflections) for your personal archives.
                </p>

                <button 
                    className="btn btn-outline" 
                    onClick={async () => {
                        const btn = document.activeElement;
                        btn.disabled = true;
                        btn.innerText = "Generating Backup...";
                        
                        try {
                             const { data: families } = await supabase.from('families').select('*').eq('student_id', profile.id);
                             const { data: members } = await supabase.from('family_members').select('*').in('family_id', (families || []).map(f => f.id));
                             const { data: visits } = await supabase.from('family_visits').select('*').in('family_id', (families || []).map(f => f.id));
                             const { data: villages } = await supabase.from('villages').select('*').eq('student_id', profile.id);
                             const { data: reflections } = await supabase.from('reflections').select('*').eq('student_id', profile.id);

                             const backupData = {
                                 meta: { date: new Date().toISOString(), user: profile.full_name },
                                 families: families || [],
                                 members: members || [],
                                 visits: visits || [],
                                 villages: villages || [],
                                 reflections: reflections || []
                             };

                             const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                             const url = URL.createObjectURL(blob);
                             const a = document.createElement('a');
                             a.href = url;
                             a.download = `fap_backup_${new Date().toISOString().split('T')[0]}.json`;
                             a.click();
                        } catch (e) {
                            console.error(e);
                            alert("Backup Failed");
                        } finally {
                            btn.disabled = false;
                            btn.innerText = "Download Full Backup";
                        }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}
                >
                    <Download size={18} /> Download Full Backup
                </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                <p style={{ marginBottom: '0.5rem' }}>FAP NextGen v2.0 • NMC-CBME Aligned</p>
                <p style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                    Concept & Design: <strong>Dr. Siddalingaiah H.S.</strong><br />
                    Professor, Community Medicine, SIMS & RH, Tumkur
                </p>
            </div>
        </div >
    );
};

export default Settings;
