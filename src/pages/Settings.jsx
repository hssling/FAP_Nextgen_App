import React, { useEffect, useMemo, useState } from 'react';
import { User, Download, Database, KeyRound, ExternalLink, Save, Eye, EyeOff, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import NotificationManager from '../components/NotificationManager';
import { AI_PROVIDERS } from '../services/aiProviders';
import { getAllSavedAiKeys, saveAiProviderKey, clearAiProviderKey } from '../services/aiKeyStore';

const maskKey = (value) => {
    if (!value) return '';
    if (value.length <= 8) return '*'.repeat(value.length);
    return `${value.slice(0, 4)}${'*'.repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
};

const Settings = () => {
    const { profile, signOut } = useAuth();
    const [backupLoading, setBackupLoading] = useState(false);
    const [aiKeys, setAiKeys] = useState({});
    const [draftKeys, setDraftKeys] = useState({});
    const [visible, setVisible] = useState({});
    const [saving, setSaving] = useState({});

    const providerEntries = useMemo(() => Object.entries(AI_PROVIDERS), []);

    useEffect(() => {
        const loadKeys = async () => {
            const saved = await getAllSavedAiKeys();
            setAiKeys(saved);
            setDraftKeys(saved);
        };
        loadKeys();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const handleDownloadBackup = async () => {
        setBackupLoading(true);
        try {
            const { data: families } = await supabase.from('families').select('*').eq('student_id', profile.id);
            const familyIds = (families || []).map((f) => f.id);

            let members = [];
            let visits = [];
            if (familyIds.length > 0) {
                const { data: m } = await supabase.from('family_members').select('*').in('family_id', familyIds);
                const { data: v } = await supabase.from('family_visits').select('*').in('family_id', familyIds);
                members = m || [];
                visits = v || [];
            }

            const { data: villages } = await supabase.from('villages').select('*').eq('student_id', profile.id);
            const { data: reflections } = await supabase.from('reflections').select('*').eq('student_id', profile.id);

            const backupData = {
                meta: { date: new Date().toISOString(), user: profile.full_name },
                families: families || [],
                members,
                visits,
                villages: villages || [],
                reflections: reflections || []
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fap_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert('Backup Failed');
        } finally {
            setBackupLoading(false);
        }
    };

    const handleSaveAiKey = async (providerKey) => {
        setSaving((prev) => ({ ...prev, [providerKey]: true }));
        try {
            const next = await saveAiProviderKey(providerKey, draftKeys[providerKey] || '');
            setAiKeys(next);
        } finally {
            setSaving((prev) => ({ ...prev, [providerKey]: false }));
        }
    };

    const handleClearAiKey = async (providerKey) => {
        setSaving((prev) => ({ ...prev, [providerKey]: true }));
        try {
            const next = await clearAiProviderKey(providerKey);
            setAiKeys(next);
            setDraftKeys((prev) => ({ ...prev, [providerKey]: '' }));
        } finally {
            setSaving((prev) => ({ ...prev, [providerKey]: false }));
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
            <h1 className="page-title" style={{ marginBottom: '2rem' }}>Settings</h1>

            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <User size={20} className="text-primary" /> User Profile
                </h2>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Full Name</label>
                            <div className="input" style={{ background: '#F3F4F6', color: '#6B7280' }}>{profile?.full_name || 'N/A'}</div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Username / Roll No</label>
                            <div className="input" style={{ background: '#F3F4F6', color: '#6B7280' }}>{profile?.username || 'N/A'}</div>
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

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Notifications</h2>
                <NotificationManager />
            </section>

            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <KeyRound size={20} className="text-primary" /> AI Integrations
                </h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    Add your own API keys to enable AI Medical Coach and Reflection AI Tip across free and paid providers. Keys are stored locally in this browser.
                </p>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    {providerEntries.map(([providerKey, provider]) => {
                        const value = draftKeys[providerKey] ?? '';
                        const savedValue = aiKeys[providerKey] || '';
                        const hasSaved = Boolean(savedValue);
                        const envValue = import.meta.env[provider.apiKeyEnv];
                        const hasEnv = Boolean(envValue && envValue.length > 10);
                        return (
                            <div key={providerKey} style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{provider.name}</h3>
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6B7280' }}>{provider.description}</p>
                                    </div>
                                    <a href={provider.signupUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        Get API key <ExternalLink size={14} />
                                    </a>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        type={visible[providerKey] ? 'text' : 'password'}
                                        value={value}
                                        onChange={(e) => setDraftKeys((prev) => ({ ...prev, [providerKey]: e.target.value }))}
                                        placeholder={`Paste ${provider.name} API key`}
                                        style={{ flex: 1, minWidth: '260px', padding: '0.6rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px' }}
                                    />
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => setVisible((prev) => ({ ...prev, [providerKey]: !prev[providerKey] }))}
                                        style={{ minWidth: '42px', padding: '0.6rem 0.75rem' }}
                                        title={visible[providerKey] ? 'Hide key' : 'Show key'}
                                    >
                                        {visible[providerKey] ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        disabled={saving[providerKey]}
                                        onClick={() => handleSaveAiKey(providerKey)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                                    >
                                        <Save size={14} /> {saving[providerKey] ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        disabled={saving[providerKey] || (!hasSaved && !value)}
                                        onClick={() => handleClearAiKey(providerKey)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#B91C1C', borderColor: '#FECACA' }}
                                    >
                                        <Trash2 size={14} /> Clear
                                    </button>
                                </div>

                                <p style={{ margin: '0.6rem 0 0', fontSize: '0.78rem', color: '#6B7280' }}>
                                    Status: {hasSaved ? `Saved (${maskKey(savedValue)})` : hasEnv ? `Using app env variable (${provider.apiKeyEnv})` : 'No key configured'}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Database size={20} className="text-secondary" /> Data Management
                </h2>

                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    Your data is securely stored in the cloud. You can download a complete backup of your records (families, visits, reflections) for your personal archives.
                </p>

                <button
                    className="btn btn-outline"
                    onClick={handleDownloadBackup}
                    disabled={backupLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}
                >
                    <Download size={18} /> {backupLoading ? 'Generating Backup...' : 'Download Full Backup'}
                </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                <p style={{ marginBottom: '0.5rem' }}>FAP NextGen v2.1 • NMC-CBME Aligned</p>
                <p style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                    Concept & Design: <strong>Dr. Siddalingaiah H.S.</strong><br />
                    Professor, Community Medicine, SIMS & RH, Tumkur
                </p>
            </div>
        </div>
    );
};

export default Settings;
