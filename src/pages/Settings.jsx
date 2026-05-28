import React, { useEffect, useMemo, useState } from 'react';
import { User, Download, Database, KeyRound, ExternalLink, Save, Eye, EyeOff, Trash2, ShieldCheck, FileDown } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import NotificationManager from '../components/NotificationManager';
import ConsentNoticeModal from '../components/ConsentNoticeModal';
import { AI_PROVIDERS } from '../services/aiProviders';
import { getAllSavedAiKeys, saveAiProviderKey, clearAiProviderKey } from '../services/aiKeyStore';
import {
    CONSENT_DOCUMENT_VERSION,
    CONSENT_NOTICE,
    consentNoticeToPlainText,
    downloadTextFile,
    getCurrentConsentAcceptance,
    listConsentAcceptances,
    recordConsentAcceptance
} from '../services/consentService';
import { clearClientCaches } from '../utils/cacheUtils';
import {
    AI_FALLBACK_MODES,
    getAiFallbackMode,
    getMicroPipelineEnabled,
    setAiFallbackMode,
    setMicroPipelineEnabled
} from '../services/aiPreferences';

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
    const [cacheClearing, setCacheClearing] = useState(false);
    const [fallbackMode, setFallbackModeState] = useState(AI_FALLBACK_MODES.allConfigured);
    const [microPipelineEnabled, setMicroPipelineEnabledState] = useState(true);
    const [profileForm, setProfileForm] = useState({
        fullName: '',
        registrationNumber: '',
        yearOfJoining: ''
    });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
    const [consentModalOpen, setConsentModalOpen] = useState(false);
    const [consentRecord, setConsentRecord] = useState(null);
    const [consentLoading, setConsentLoading] = useState(false);
    const [consentAccepting, setConsentAccepting] = useState(false);
    const [consentRegister, setConsentRegister] = useState([]);
    const [consentRegisterLoading, setConsentRegisterLoading] = useState(false);

    const providerEntries = useMemo(() => Object.entries(AI_PROVIDERS), []);

    useEffect(() => {
        const loadKeys = async () => {
            const saved = await getAllSavedAiKeys();
            setAiKeys(saved);
            setDraftKeys(saved);
        };
        loadKeys();
    }, []);

    useEffect(() => {
        const loadAiPreferences = async () => {
            const [mode, microEnabled] = await Promise.all([
                getAiFallbackMode(),
                getMicroPipelineEnabled()
            ]);
            setFallbackModeState(mode);
            setMicroPipelineEnabledState(microEnabled);
        };
        loadAiPreferences();
    }, []);

    useEffect(() => {
        if (!profile) return;
        setProfileForm({
            fullName: profile.full_name || '',
            registrationNumber: profile.registration_number || '',
            yearOfJoining: profile.year_of_joining ? String(profile.year_of_joining) : ''
        });
    }, [profile]);

    useEffect(() => {
        const loadConsent = async () => {
            if (!profile?.id) return;
            setConsentLoading(true);
            try {
                const record = await getCurrentConsentAcceptance(supabase, profile.id);
                setConsentRecord(record);
            } catch (error) {
                console.warn('Could not load consent status:', error);
            } finally {
                setConsentLoading(false);
            }
        };
        loadConsent();
    }, [profile?.id]);

    useEffect(() => {
        const loadAdminConsentRegister = async () => {
            if (profile?.role !== 'admin') return;
            setConsentRegisterLoading(true);
            try {
                const records = await listConsentAcceptances(supabase);
                setConsentRegister(records);
            } catch (error) {
                console.warn('Could not load consent register:', error);
            } finally {
                setConsentRegisterLoading(false);
            }
        };
        loadAdminConsentRegister();
    }, [profile?.role]);

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

    const handleClearLocalCache = async () => {
        const confirmed = window.confirm('Clear local cached app data on this browser? You can still fetch fresh data from the server.');
        if (!confirmed) return;

        setCacheClearing(true);
        try {
            const result = await clearClientCaches();
            alert(`Local cache cleared.\nSession keys removed: ${result.sessionRemoved}\nOffline store keys removed: ${result.idbRemoved}`);
            window.location.reload();
        } catch (error) {
            console.error('Failed to clear client cache:', error);
            alert('Failed to clear local cache.');
        } finally {
            setCacheClearing(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!profile?.id) return;
        setProfileSaving(true);
        setProfileMessage({ type: '', text: '' });

        try {
            const fullName = profileForm.fullName.trim();
            if (!fullName) {
                throw new Error('Full name is required.');
            }

            const updatePayload = { full_name: fullName };

            if (profile.role === 'student') {
                const registrationNumber = profileForm.registrationNumber.trim();
                const yearOfJoining = parseInt(profileForm.yearOfJoining, 10);
                const currentYear = new Date().getFullYear();

                if (!registrationNumber) {
                    throw new Error('Roll number is required for students.');
                }
                if (Number.isNaN(yearOfJoining) || yearOfJoining < 2000 || yearOfJoining > currentYear + 1) {
                    throw new Error(`Year of joining must be between 2000 and ${currentYear + 1}.`);
                }

                updatePayload.registration_number = registrationNumber;
                updatePayload.year_of_joining = yearOfJoining;
                updatePayload.year = Math.min(3, Math.max(1, currentYear - yearOfJoining + 1));
            }

            const { error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', profile.id);

            if (error) {
                if (error.code === '23505') {
                    throw new Error('That roll number is already in use.');
                }
                throw error;
            }

            setProfileMessage({ type: 'success', text: 'Profile details updated successfully. Refreshing...' });
            setTimeout(() => window.location.reload(), 800);
        } catch (error) {
            console.error('Failed to save profile details:', error);
            setProfileMessage({ type: 'error', text: error.message || 'Could not update profile details.' });
        } finally {
            setProfileSaving(false);
        }
    };

    const handleUpdatePassword = async () => {
        setPasswordSaving(true);
        setPasswordMessage({ type: '', text: '' });

        try {
            const newPassword = passwordForm.newPassword.trim();
            const confirmPassword = passwordForm.confirmPassword.trim();

            if (newPassword.length < 8) {
                throw new Error('Password must be at least 8 characters long.');
            }
            if (newPassword !== confirmPassword) {
                throw new Error('Passwords do not match.');
            }

            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            setPasswordForm({ newPassword: '', confirmPassword: '' });
            setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
            toast.success('Password updated successfully.');
            // Explicit fallback confirmation for devices where toast rendering is delayed/hidden.
            alert('Password updated successfully.');
        } catch (error) {
            console.error('Failed to update password:', error);
            setPasswordMessage({ type: 'error', text: error.message || 'Could not update password.' });
            toast.error(error.message || 'Could not update password.');
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleAcceptConsentFromSettings = async () => {
        if (!profile?.id) return;
        setConsentAccepting(true);
        try {
            const record = await recordConsentAcceptance(supabase, {
                userId: profile.id,
                source: 'settings',
                metadata: {
                    role: profile.role,
                    username: profile.username,
                    consent_title: CONSENT_NOTICE.title,
                },
            });
            setConsentRecord(record);
            setConsentModalOpen(false);
            toast.success('Digital consent accepted and recorded.');
        } catch (error) {
            console.error('Failed to record consent:', error);
            toast.error('Could not record consent. Confirm the consent SQL patch is applied.');
        } finally {
            setConsentAccepting(false);
        }
    };

    const downloadConsentRegisterCsv = () => {
        const headers = ['id', 'user_id', 'consent_version', 'accepted_at', 'acceptance_source', 'user_agent'];
        if (consentRegister.length === 0) {
            toast.error('No consent records loaded yet.');
            return;
        }
        const rows = consentRegister.map((record) => headers.map((key) => {
            const value = record[key] ?? '';
            return `"${String(value).replaceAll('"', '""')}"`;
        }).join(','));
        downloadTextFile(
            `FAP_NextGen_Consent_Register_${new Date().toISOString().split('T')[0]}.csv`,
            [headers.join(','), ...rows].join('\n'),
            'text/csv'
        );
    };

    const downloadConsentEvidenceJson = () => {
        if (consentRegister.length === 0) {
            toast.error('No consent records loaded yet.');
            return;
        }
        downloadTextFile(
            `FAP_NextGen_Digital_Consent_Evidence_${new Date().toISOString().split('T')[0]}.json`,
            JSON.stringify({
                exported_at: new Date().toISOString(),
                consent_document: {
                    version: CONSENT_DOCUMENT_VERSION,
                    title: CONSENT_NOTICE.title,
                    effective_date: CONSENT_NOTICE.effectiveDate,
                    full_text: consentNoticeToPlainText(),
                },
                acceptance_records: consentRegister,
            }, null, 2),
            'application/json'
        );
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
                            <div className="input" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                                {profile?.registration_number || profile?.username || 'N/A'}
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

                    {profile?.role === 'student' && (
                        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>Update Basic Student Details</h3>
                            <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                Keep your roll number and joining year updated for mentor allocation and competency tracking.
                            </p>

                            {profileMessage.text && (
                                <div style={{
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    marginBottom: '1rem',
                                    backgroundColor: profileMessage.type === 'error' ? '#FEE2E2' : '#D1FAE5',
                                    color: profileMessage.type === 'error' ? '#991B1B' : '#065F46',
                                    border: `1px solid ${profileMessage.type === 'error' ? '#FCA5A5' : '#6EE7B7'}`
                                }}>
                                    {profileMessage.text}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Roll Number</label>
                                    <input
                                        className="input"
                                        type="text"
                                        value={profileForm.registrationNumber}
                                        onChange={(e) => setProfileForm((prev) => ({ ...prev, registrationNumber: e.target.value }))}
                                        placeholder="e.g., 2025MBBS001"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Year of Joining</label>
                                    <input
                                        className="input"
                                        type="number"
                                        min="2000"
                                        max={new Date().getFullYear() + 1}
                                        value={profileForm.yearOfJoining}
                                        onChange={(e) => setProfileForm((prev) => ({ ...prev, yearOfJoining: e.target.value }))}
                                        placeholder="e.g., 2025"
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '0.75rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Full Name</label>
                                <input
                                    className="input"
                                    type="text"
                                    value={profileForm.fullName}
                                    onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                                />
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleSaveProfile}
                                disabled={profileSaving}
                                style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Save size={16} /> {profileSaving ? 'Saving...' : 'Save Student Details'}
                            </button>
                        </div>
                    )}

                    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem', marginTop: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>Change Password</h3>
                        <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Use this to change your password after login. Keep it simple and secure.
                        </p>

                        {passwordMessage.text && (
                            <div style={{
                                padding: '0.75rem',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                backgroundColor: passwordMessage.type === 'error' ? '#FEE2E2' : '#D1FAE5',
                                color: passwordMessage.type === 'error' ? '#991B1B' : '#065F46',
                                border: `1px solid ${passwordMessage.type === 'error' ? '#FCA5A5' : '#6EE7B7'}`
                            }}>
                                {passwordMessage.text}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className="input"
                                        type={visible.accountPassword ? 'text' : 'password'}
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                                        placeholder="At least 8 characters"
                                    />
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => setVisible((prev) => ({ ...prev, accountPassword: !prev.accountPassword }))}
                                        style={{ position: 'absolute', right: '0.35rem', top: '0.35rem', padding: '0.3rem 0.5rem' }}
                                        type="button"
                                    >
                                        {visible.accountPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className="input"
                                        type={visible.accountPasswordConfirm ? 'text' : 'password'}
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                        placeholder="Re-enter new password"
                                    />
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => setVisible((prev) => ({ ...prev, accountPasswordConfirm: !prev.accountPasswordConfirm }))}
                                        style={{ position: 'absolute', right: '0.35rem', top: '0.35rem', padding: '0.3rem 0.5rem' }}
                                        type="button"
                                    >
                                        {visible.accountPasswordConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleUpdatePassword}
                            disabled={passwordSaving}
                            style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <KeyRound size={16} /> {passwordSaving ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1rem' }}>
                        <button className="btn btn-outline" onClick={handleLogout} style={{ color: '#DC2626', borderColor: '#FECACA' }}>
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ShieldCheck size={20} className="text-primary" /> Digital Consent & Compliance
                </h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: '1.6' }}>
                    Review the DPDP-aligned consent, privacy, data-security, storage, AI-use and responsible-use notice for FAP NextGen.
                </p>
                <div style={{
                    display: 'grid',
                    gap: '0.75rem',
                    padding: '1rem',
                    borderRadius: '10px',
                    border: '1px solid #D1FAE5',
                    background: '#F0FDFA',
                    marginBottom: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                            <strong style={{ color: '#065F46' }}>
                                {consentRecord ? 'Accepted / provided' : consentLoading ? 'Checking consent status...' : 'Acceptance not yet recorded on this device'}
                            </strong>
                            <p style={{ margin: '0.25rem 0 0', color: '#047857', fontSize: '0.85rem' }}>
                                Version {CONSENT_DOCUMENT_VERSION}
                                {consentRecord?.accepted_at ? ` | ${new Date(consentRecord.accepted_at).toLocaleString()} | ${consentRecord.acceptance_source}` : ''}
                            </p>
                        </div>
                        <button className="btn btn-outline" onClick={() => setConsentModalOpen(true)} style={{ color: '#0F766E', borderColor: '#99F6E4' }}>
                            Review consent notice
                        </button>
                    </div>
                </div>

                {profile?.role === 'admin' && (
                    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem', marginTop: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Admin Consent Register</h3>
                        <p style={{ margin: '0.35rem 0 0.9rem', color: '#6B7280', fontSize: '0.85rem' }}>
                            Download the digital consent form and acceptance evidence for audit, IEC/SRC, certification or institutional compliance review.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <button className="btn btn-outline" onClick={() => downloadTextFile(`FAP_NextGen_Digital_Consent_${CONSENT_NOTICE.version}.txt`, consentNoticeToPlainText())}>
                                <FileDown size={16} /> Download consent form
                            </button>
                            <button className="btn btn-outline" onClick={downloadConsentRegisterCsv} disabled={consentRegisterLoading}>
                                <Download size={16} /> Download acceptance CSV
                            </button>
                            <button className="btn btn-outline" onClick={downloadConsentEvidenceJson} disabled={consentRegisterLoading}>
                                <Download size={16} /> Download evidence JSON
                            </button>
                        </div>
                        <p style={{ margin: 0, color: '#6B7280', fontSize: '0.8rem' }}>
                            Loaded records: {consentRegisterLoading ? 'Loading...' : consentRegister.length}
                        </p>
                    </div>
                )}
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

                                <div className="ai-key-actions">
                                    <div className="ai-key-input-row">
                                        <input
                                            type={visible[providerKey] ? 'text' : 'password'}
                                            value={value}
                                            onChange={(e) => setDraftKeys((prev) => ({ ...prev, [providerKey]: e.target.value }))}
                                            placeholder={`Paste ${provider.name} API key`}
                                            style={{ width: '100%', minWidth: 0, padding: '0.6rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px' }}
                                        />
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => setVisible((prev) => ({ ...prev, [providerKey]: !prev[providerKey] }))}
                                            style={{ minWidth: '42px', padding: '0.6rem 0.75rem' }}
                                            title={visible[providerKey] ? 'Hide key' : 'Show key'}
                                        >
                                            {visible[providerKey] ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <div className="ai-key-button-row">
                                        <button
                                            className="btn btn-primary ai-key-save-btn"
                                            disabled={saving[providerKey]}
                                            onClick={() => handleSaveAiKey(providerKey)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                                        >
                                            <Save size={14} /> {saving[providerKey] ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            className="btn btn-outline ai-key-clear-btn"
                                            disabled={saving[providerKey] || (!hasSaved && !value)}
                                            onClick={() => handleClearAiKey(providerKey)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#B91C1C', borderColor: '#FECACA' }}
                                        >
                                            <Trash2 size={14} /> Clear
                                        </button>
                                    </div>
                                </div>

                                <p style={{ margin: '0.6rem 0 0', fontSize: '0.78rem', color: '#6B7280' }}>
                                    Status: {hasSaved ? `Saved (${maskKey(savedValue)})` : hasEnv ? `Using app env variable (${provider.apiKeyEnv})` : 'No key configured'}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Reflection AI Reliability Controls</h3>
                    <p style={{ margin: '0.35rem 0 0.75rem', fontSize: '0.85rem', color: '#6B7280' }}>
                        Control how provider fallback and micro-AI job pipeline behave for Gibbs extraction.
                    </p>

                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Provider fallback mode
                    </label>
                    <select
                        value={fallbackMode}
                        onChange={async (e) => {
                            const mode = e.target.value;
                            setFallbackModeState(mode);
                            await setAiFallbackMode(mode);
                        }}
                        style={{ width: '100%', maxWidth: '360px', padding: '0.6rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px' }}
                    >
                        <option value={AI_FALLBACK_MODES.allConfigured}>Try all configured providers</option>
                        <option value={AI_FALLBACK_MODES.preferredThenDefault}>Preferred then default only</option>
                        <option value={AI_FALLBACK_MODES.preferredOnly}>Preferred provider only</option>
                    </select>

                    <label style={{ marginTop: '0.75rem', display: 'inline-flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem', color: '#1F2937' }}>
                        <input
                            type="checkbox"
                            checked={microPipelineEnabled}
                            onChange={async (e) => {
                                const next = e.target.checked;
                                setMicroPipelineEnabledState(next);
                                await setMicroPipelineEnabled(next);
                            }}
                        />
                        Prefer micro-AI job pipeline for file uploads (falls back automatically if unavailable)
                    </label>
                </div>
            </div>

            <style>{`
                .ai-key-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .ai-key-input-row {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    gap: 0.5rem;
                    align-items: center;
                    min-width: 0;
                }
                .ai-key-button-row {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(120px, 1fr));
                    gap: 0.5rem;
                    width: 100%;
                }
                .ai-key-button-row .btn {
                    width: 100%;
                    justify-content: center;
                }
                @media (max-width: 640px) {
                    .ai-key-button-row { grid-template-columns: 1fr; }
                }
            `}</style>

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
                <button
                    className="btn btn-outline"
                    onClick={handleClearLocalCache}
                    disabled={cacheClearing}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center', marginTop: '0.75rem', color: '#991B1B', borderColor: '#FECACA' }}
                >
                    <Trash2 size={18} /> {cacheClearing ? 'Clearing Local Cache...' : 'Clear Local Cache'}
                </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                <p style={{ marginBottom: '0.5rem' }}>FAP NextGen v2.1 • NMC-CBME Aligned</p>
                <p style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                    Concept & Design: <strong>Dr. Siddalingaiah H.S.</strong><br />
                    Professor, Community Medicine, SIMS & RH, Tumkur
                </p>
            </div>
            <ConsentNoticeModal
                open={consentModalOpen}
                onClose={() => setConsentModalOpen(false)}
                onAccept={handleAcceptConsentFromSettings}
                acceptedRecord={consentRecord}
                accepting={consentAccepting}
            />
        </div>
    );
};

export default Settings;
