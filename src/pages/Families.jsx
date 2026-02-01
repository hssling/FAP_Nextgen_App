import React, { useEffect, useState } from 'react';
import { Plus, MapPin, Users, ArrowRight, Search, RefreshCw, CloudOff, CloudCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useFamilies } from '../hooks/useFamilies';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getQueueCount, processQueue } from '../services/offlineQueue';

const Families = () => {
    const { profile } = useAuth();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newFamily, setNewFamily] = useState({ head_name: '', village: '', members_count: 1 });
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [syncProgress, setSyncProgress] = useState({ processed: 0, total: 0, successCount: 0, failCount: 0, active: false });

    // Use React Query Hook
    const {
        data: families = [],
        isLoading: loading,
        addFamily
    } = useFamilies(profile?.id);

    // Smart Local Search (Offline-Ready)
    const normalize = (value) => (value ?? '').toString().toLowerCase();
    const normalizedQuery = normalize(searchQuery);
    const filteredFamilies = families.filter(f => 
        normalize(f.head_name).includes(normalizedQuery) || 
        normalize(f.village).includes(normalizedQuery)
    );
    const syncPercent = syncProgress.total > 0
        ? Math.round((syncProgress.processed / syncProgress.total) * 100)
        : 0;

    useEffect(() => {
        const updateCount = async () => {
            const count = await getQueueCount();
            setPendingCount(count);
        };

        updateCount();
        
        // Update count on sync completion
        window.addEventListener('fap-sync-complete', updateCount);
        const handleProgress = (event) => {
            const detail = event.detail || {};
            setSyncProgress({
                processed: detail.processed || 0,
                total: detail.total || 0,
                successCount: detail.successCount || 0,
                failCount: detail.failCount || 0,
                active: detail.total > 0 && detail.processed < detail.total
            });
        };
        window.addEventListener('fap-sync-progress', handleProgress);
        
        // Also check occasionally or when online
        const handleOnline = () => updateCount();
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('fap-sync-complete', updateCount);
            window.removeEventListener('fap-sync-progress', handleProgress);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncProgress({ processed: 0, total: pendingCount, successCount: 0, failCount: 0, active: pendingCount > 0 });
        try {
            await processQueue();
        } finally {
            setIsSyncing(false);
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            await addFamily({
                student_id: profile.id,
                head_name: newFamily.head_name,
                village: newFamily.village,
                members_count: newFamily.members_count
            });

            // Iterate invalidate is handled by hook
            // invalidateAnalyticsCache(profile.id); // This is likely handled by logic in hook or global invalidation

            setShowAddModal(false);
            setNewFamily({ head_name: '', village: '', members_count: 1 });
            toast.success('Family added successfully!');
        } catch (error) {
            console.error('Error adding family:', error);
            toast.error('Failed to add family.');
        }
    };

    return (
        <div>
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="page-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
            >
                <div>
                    <h1 className="page-title">My Adopted Families</h1>
                    <p className="page-subtitle">Manage your adopted families and track their health status.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Instant Local Search */}
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input 
                            type="text"
                            placeholder="Search families..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: '0.6rem 1rem 0.6rem 2.5rem',
                                borderRadius: '20px',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.9rem',
                                width: '220px',
                                background: 'white'
                            }}
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={20} />
                        Adopt New Family
                    </motion.button>
                </div>
            </motion.header>

            {/* Offline Sync Banner */}
            <AnimatePresence>
                {pendingCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ marginBottom: '1.5rem' }}
                    >
                        <div style={{
                            padding: '1rem 1.5rem',
                            background: navigator.onLine ? '#F0FDFA' : '#FFF7ED',
                            border: `1px solid ${navigator.onLine ? '#CCFBF1' : '#FFEDD5'}`,
                            borderRadius: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {navigator.onLine ? (
                                    <CloudCheck size={24} color="#0D9488" />
                                ) : (
                                    <CloudOff size={24} color="#EA580C" />
                                )}
                                <div>
                                    <div style={{ fontWeight: '600', color: navigator.onLine ? '#134E48' : '#7C2D12' }}>
                                        {pendingCount} offline {pendingCount === 1 ? 'change' : 'changes'} pending
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: navigator.onLine ? '#0D9488' : '#9A3412' }}>
                                        {navigator.onLine 
                                            ? 'Internet connection restored. You can sync your changes now.' 
                                            : 'No internet connection. Changes will be saved locally.'}
                                    </p>
                                    {(isSyncing || syncProgress.total > 0) && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <div style={{ fontSize: '0.75rem', color: navigator.onLine ? '#0D9488' : '#9A3412' }}>
                                                Syncing: {syncProgress.processed}/{syncProgress.total} ({syncPercent}%)
                                                {syncProgress.failCount > 0 ? ` â€¢ ${syncProgress.failCount} failed` : ''}
                                            </div>
                                            <div style={{ marginTop: '0.25rem', height: '6px', background: 'rgba(15,118,110,0.15)', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${syncPercent}%`,
                                                    height: '100%',
                                                    background: navigator.onLine ? '#0D9488' : '#EA580C',
                                                    transition: 'width 0.2s ease'
                                                }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {navigator.onLine && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="btn btn-primary"
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                    style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <LoadingSpinner size={40} />
                </div>
            ) : families.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card"
                    style={{ padding: '4rem', textAlign: 'center' }}
                >
                    <div style={{
                        width: '80px', height: '80px',
                        backgroundColor: 'var(--color-bg-root)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem auto'
                    }}>
                        <Users size={40} color="var(--color-text-muted)" />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>No Families Adopted Yet</h3>
                    <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                        You haven't adopted any families yet. Start your FAP journey by adding your first family record.
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        Get Started
                    </motion.button>
                </motion.div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                    {filteredFamilies.map((family, index) => (
                        <motion.div
                            key={family.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -8, boxShadow: 'var(--shadow-lg)' }}
                        >
                            <Link to={`/families/${family.id}`} className="card" style={{ textDecoration: 'none', display: 'block' }}>
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <motion.div
                                            whileHover={{ rotate: 5 }}
                                            style={{
                                                width: '48px', height: '48px',
                                                borderRadius: '50%', backgroundColor: '#E0F2FE',
                                                color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: '700', fontSize: '1.25rem'
                                            }}
                                        >
                                            {family.head_name.charAt(0)}
                                        </motion.div>
                                        {family.is_offline_sync ? (
                                            <span style={{
                                                padding: '0.25rem 0.75rem', borderRadius: '99px',
                                                backgroundColor: '#FFF7ED', color: '#EA580C',
                                                fontSize: '0.75rem', fontWeight: '600', height: 'fit-content',
                                                border: '1px solid #FFEDD5'
                                            }}>
                                                Pending Sync
                                            </span>
                                        ) : (
                                            <span style={{
                                                padding: '0.25rem 0.75rem', borderRadius: '99px',
                                                backgroundColor: '#F0FDFA', color: '#0D9488',
                                                fontSize: '0.75rem', fontWeight: '600', height: 'fit-content'
                                            }}>
                                                Active
                                            </span>
                                        )}
                                    </div>

                                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>{family.head_name} Family</h3>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                        <MapPin size={16} />
                                        <span>{family.village}</span>
                                    </div>

                                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                            {family.members_count || 0} Members
                                        </span>
                                        <motion.div
                                            whileHover={{ x: 5 }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)', fontWeight: '500', fontSize: '0.875rem' }}
                                        >
                                            View Details <ArrowRight size={16} />
                                        </motion.div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(4px)', zIndex: 100
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="card"
                            style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}
                        >
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Adopt New Family</h2>
                            <form onSubmit={handleAddSubmit}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Head of Household Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Ram Charan"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                        value={newFamily.head_name}
                                        onChange={e => setNewFamily({ ...newFamily, head_name: e.target.value })}
                                    />
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Village / Area</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Rampur"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                        value={newFamily.village}
                                        onChange={e => setNewFamily({ ...newFamily, village: e.target.value })}
                                    />
                                </div>
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Initial Members Count</label>
                                    <input
                                        type="number"
                                        min="1"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                        value={newFamily.members_count}
                                        onChange={e => setNewFamily({ ...newFamily, members_count: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Add Family</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Families;
