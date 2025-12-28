import React, { useEffect, useState } from 'react';
import { Plus, MapPin, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { invalidateAnalyticsCache } from '../utils/cacheUtils';

const Families = () => {
    const { profile } = useAuth();
    const [families, setFamilies] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newFamily, setNewFamily] = useState({ head_name: '', village: '', members_count: 1 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile) loadFamilies();
    }, [profile]);

    const loadFamilies = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('families')
                .select('*')
                .eq('student_id', profile.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFamilies(data || []);
        } catch (error) {
            console.error('Error fetching families:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('families').insert([{
                student_id: profile.id,
                head_name: newFamily.head_name,
                village: newFamily.village,
                members_count: newFamily.members_count
            }]);

            if (error) throw error;

            // Invalidate analytics cache so Reports page shows updated data
            invalidateAnalyticsCache(profile.id);

            setShowAddModal(false);
            setNewFamily({ head_name: '', village: '', members_count: 1 });
            loadFamilies(); // Reload list
        } catch (error) {
            console.error('Error adding family:', error);
            alert('Failed to add family.');
        }
    };

    return (
        <div>
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="page-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <div>
                    <h1 className="page-title">My Adopted Families</h1>
                    <p className="page-subtitle">Manage your adopted families and track their health status.</p>
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
            </motion.header>

            {loading ? <p>Loading...</p> : families.length === 0 ? (
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
                    {families.map((family, index) => (
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
                                        <span style={{
                                            padding: '0.25rem 0.75rem', borderRadius: '99px',
                                            backgroundColor: '#F0FDFA', color: '#0D9488',
                                            fontSize: '0.75rem', fontWeight: '600', height: 'fit-content'
                                        }}>
                                            Active
                                        </span>
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
