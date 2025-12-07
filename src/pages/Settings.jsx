import React, { useState } from 'react';
import { User, Download, Trash2, Database, Save, Check } from 'lucide-react';
import { getFamilies, getAllMembers, getVillages } from '../services/db';

import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
    const { profile, signOut } = useAuth();
    const [exporting, setExporting] = useState(false);

    // Use real data or fallbacks
    const [studentName, setStudentName] = useState(profile?.full_name || '');
    const [email, setEmail] = useState(profile?.email || '');

    /* ... existing export logic ... */

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

            {/* Data Management Section */}
            <div className="card" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Database size={20} className="text-secondary" /> Data Management
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Export Logbook Data</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Download all your family records, visits, and assessments as a JSON file.</div>
                    </div>
                    <button className="btn btn-outline" onClick={handleExport} disabled={exporting}>
                        <Download size={18} /> {exporting ? 'Exporting...' : 'Export JSON'}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', marginTop: '1rem', backgroundColor: '#FEF2F2', borderRadius: 'var(--radius-md)', border: '1px solid #FECACA' }}>
                    <div>
                        <div style={{ fontWeight: '600', color: '#991B1B', marginBottom: '0.25rem' }}>Reset Application</div>
                        <div style={{ fontSize: '0.875rem', color: '#B91C1C' }}>Permanently delete all data and start over.</div>
                    </div>
                    <button className="btn" style={{ backgroundColor: '#DC2626', color: 'white', border: 'none' }} onClick={handleReset}>
                        <Trash2 size={18} /> Reset Database
                    </button>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                <p style={{ marginBottom: '0.5rem' }}>FAP NextGen v2.0 • NMC-CBME Aligned</p>
                <p style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                    Concept & Design: <strong>Dr. Siddalingaiah H.S.</strong><br />
                    Professor, Community Medicine, SIMS & RH, Tumkur
                </p>
            </div>
        </div>
    );
};

export default Settings;
