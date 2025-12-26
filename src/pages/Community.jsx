import React, { useEffect, useState } from 'react';
import { Map, Users, Droplets, Activity, PlusCircle, Edit, Flag, ClipboardList, Heart, Syringe, Baby, TrendingUp, AlertTriangle, Package, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import DynamicForm from '../components/DynamicForm';
import formRegistry from '../data/forms/registry.json';

const Community = () => {
    const { profile } = useAuth();
    const [villages, setVillages] = useState([]);
    const [selectedVillage, setSelectedVillage] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [activeSection, setActiveSection] = useState('overview');

    useEffect(() => {
        if (profile) loadData();
    }, [profile]);

    const loadData = async () => {
        try {
            const { data, error } = await supabase
                .from('villages')
                .select('*')
                .eq('student_id', profile.id);

            if (error) throw error;

            // Map Supabase layout to component layout (merge 'data' col with top level)
            const mapped = (data || []).map(v => ({
                id: v.id,
                ...v.data, // Spread the JSONB data
                village_name: v.village_name // Ensure name is preserved
            }));

            setVillages(mapped);
            if (mapped.length > 0 && !selectedVillage) {
                setSelectedVillage(mapped[0]);
            }
        } catch (error) {
            console.error('Error loading villages:', error);
        }
    };

    const handleSave = async (formData) => {
        try {
            const villageName = formData.village_name || 'Unnamed Village';
            const payload = {
                student_id: profile.id,
                village_name: villageName,
                data: formData
            };

            if (selectedVillage) {
                // Update
                const { error } = await supabase
                    .from('villages')
                    .update(payload)
                    .eq('id', selectedVillage.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('villages')
                    .insert([payload]);
                if (error) throw error;
            }

            setIsEditing(false);
            loadData();
        } catch (error) {
            console.error('Error saving village:', error);
            alert('Failed to save village data.');
        }
    };

    const getSchema = () => {
        const schema = formRegistry.find(f => f.form_id === 'village_profile_v1');
        return schema;
    };

    const sections = [
        { id: 'overview', label: 'Overview', icon: Map },
        { id: 'demography', label: 'Demography', icon: Users },
        { id: 'hr', label: 'Human Resources', icon: Heart },
        { id: 'resources', label: 'Resources & Infrastructure', icon: Package },
        { id: 'planning', label: 'Annual Planning', icon: Calendar },
        { id: 'health', label: 'Health Status', icon: Activity }
    ];

    return (
        <div>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}
            >
                <div>
                    <h1 className="page-title">Community Health Profile</h1>
                    <p className="page-subtitle">Comprehensive village health mapping and planning</p>
                </div>
                {villages.length > 0 && !isEditing && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn btn-outline"
                        onClick={() => setIsEditing(true)}
                    >
                        <Edit size={16} style={{ marginRight: '0.5rem' }} /> Edit Profile
                    </motion.button>
                )}
            </motion.div>

            {isEditing && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)',
                    zIndex: 100,
                    overflowY: 'auto',
                    padding: '2rem'
                }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card"
                        style={{ padding: '2rem', maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
                    >
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
                            {selectedVillage ? 'Edit Village Profile' : 'Create Village Profile'}
                        </h2>
                        <DynamicForm
                            schema={getSchema()}
                            initialData={selectedVillage || {}}
                            onSubmit={handleSave}
                            onCancel={() => setIsEditing(false)}
                        />
                    </motion.div>
                </div>
            )}

            {!isEditing && (
                <>
                    {villages.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card"
                            style={{ padding: '4rem', textAlign: 'center' }}
                        >
                            <Map size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>No Community Profile Found</h3>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Start by mapping your village or ward resources and demographics.</p>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="btn btn-primary"
                                onClick={() => setIsEditing(true)}
                            >
                                <PlusCircle size={20} /> Create Village Profile
                            </motion.button>
                        </motion.div>
                    ) : selectedVillage ? (
                        <div>
                            {/* Section Tabs */}
                            <div style={{ borderBottom: '2px solid var(--color-border)', marginBottom: '2rem', overflowX: 'auto' }}>
                                <div style={{ display: 'flex', gap: '1rem', minWidth: 'fit-content' }}>
                                    {sections.map(section => {
                                        const Icon = section.icon;
                                        return (
                                            <motion.button
                                                key={section.id}
                                                whileHover={{ y: -2 }}
                                                onClick={() => setActiveSection(section.id)}
                                                style={{
                                                    padding: '0.75rem 1.25rem',
                                                    border: 'none',
                                                    background: 'none',
                                                    borderBottom: activeSection === section.id ? '3px solid var(--color-primary)' : 'none',
                                                    color: activeSection === section.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                <Icon size={18} />
                                                {section.label}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section Content */}
                            <motion.div
                                key={activeSection}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {activeSection === 'overview' && (
                                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                                            <motion.div whileHover={{ y: -5 }} className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ padding: '1rem', borderRadius: '50%', background: '#E0F2FE', color: '#0284C7' }}><Map size={24} /></div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Village Name</div>
                                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{selectedVillage.village_name}</div>
                                                </div>
                                            </motion.div>
                                            <motion.div whileHover={{ y: -5 }} className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ padding: '1rem', borderRadius: '50%', background: '#F0FDF4', color: '#16A34A' }}><Users size={24} /></div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Total Population</div>
                                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{selectedVillage.population_total || '-'}</div>
                                                </div>
                                            </motion.div>
                                            <motion.div whileHover={{ y: -5 }} className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ padding: '1rem', borderRadius: '50%', background: '#FFF7ED', color: '#EA580C' }}><Activity size={24} /></div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Households</div>
                                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{selectedVillage.total_households || '-'}</div>
                                                </div>
                                            </motion.div>
                                        </div>

                                        <div className="card" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Key Health Indicators</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Distance to PHC</div>
                                                    <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{selectedVillage.distance_phc ? `${selectedVillage.distance_phc} km` : '-'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Distance to CHC</div>
                                                    <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{selectedVillage.distance_chc ? `${selectedVillage.distance_chc} km` : '-'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Sanitation Status</div>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.875rem',
                                                        background: selectedVillage.sanitation_status === 'Good' ? '#F0FDF4' : '#FEF2F2',
                                                        color: selectedVillage.sanitation_status === 'Good' ? '#16A34A' : '#DC2626'
                                                    }}>
                                                        {selectedVillage.sanitation_status || 'Not assessed'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>ODF Status</div>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.875rem',
                                                        background: selectedVillage.odf_status?.includes('Certified') ? '#ECFDF5' : '#FEF3C7',
                                                        color: selectedVillage.odf_status?.includes('Certified') ? '#047857' : '#D97706'
                                                    }}>
                                                        {selectedVillage.odf_status || 'Not assessed'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'demography' && (
                                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                                        <div className="card" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Users size={20} className="text-primary" /> Population Distribution
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                                <div style={{ padding: '1rem', background: '#F0FDFA', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #0F766E' }}>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Male</div>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0F766E' }}>{selectedVillage.population_male || '-'}</div>
                                                </div>
                                                <div style={{ padding: '1rem', background: '#FDF2F8', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #EC4899' }}>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Female</div>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#EC4899' }}>{selectedVillage.population_female || '-'}</div>
                                                </div>
                                                <div style={{ padding: '1rem', background: '#FEF3C7', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #F59E0B' }}>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Under 5 Years</div>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F59E0B' }}>{selectedVillage.population_under5 || '-'}</div>
                                                </div>
                                                <div style={{ padding: '1rem', background: '#EEF2FF', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #6366F1' }}>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Adolescents (10-19)</div>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#6366F1' }}>{selectedVillage.population_adolescent || '-'}</div>
                                                </div>
                                                <div style={{ padding: '1rem', background: '#F5F3FF', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #8B5CF6' }}>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Elderly (60+)</div>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#8B5CF6' }}>{selectedVillage.population_elderly || '-'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Baby size={20} style={{ color: '#EC4899' }} /> Maternal & Child Health
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Pregnant Women</div>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#EC4899' }}>{selectedVillage.pregnant_women || '0'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Lactating Mothers</div>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F59E0B' }}>{selectedVillage.lactating_mothers || '0'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'hr' && (
                                    <div className="card" style={{ padding: '2rem' }}>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Heart size={20} className="text-primary" /> Health Human Resources
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                                            <div style={{ padding: '1.5rem', background: '#F0FDFA', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>ASHA Workers</div>
                                                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0F766E' }}>{selectedVillage.asha_workers || '0'}</div>
                                            </div>
                                            <div style={{ padding: '1.5rem', background: '#EFF6FF', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>ANM Staff</div>
                                                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0EA5E9' }}>{selectedVillage.anm_staff || '0'}</div>
                                            </div>
                                            <div style={{ padding: '1.5rem', background: '#FFF7ED', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Anganwadi Centers</div>
                                                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#EA580C' }}>{selectedVillage.anganwadi_centers || '0'}</div>
                                            </div>
                                            <div style={{ padding: '1.5rem', background: '#FEF3C7', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Anganwadi Workers</div>
                                                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#F59E0B' }}>{selectedVillage.anganwadi_workers || '0'}</div>
                                            </div>
                                            <div style={{ padding: '1.5rem', background: '#F5F3FF', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Health Volunteers</div>
                                                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#8B5CF6' }}>{selectedVillage.health_volunteers || '0'}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'resources' && (
                                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                                        <div className="card" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Syringe size={20} style={{ color: '#0EA5E9' }} /> Immunization Infrastructure
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Cold Chain Facility</div>
                                                    <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{selectedVillage.cold_chain_facility ? '✅ Available' : '❌ Not Available'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Vaccine Storage Capacity</div>
                                                    <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{selectedVillage.vaccine_storage ? `${selectedVillage.vaccine_storage} liters` : '-'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Monthly Immunization Sessions</div>
                                                    <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{selectedVillage.immunization_sessions_monthly || '-'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>VHND Frequency</div>
                                                    <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{selectedVillage.vhnd_frequency || '-'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Droplets size={20} className="text-secondary" /> Water & Sanitation
                                            </h3>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Water Sources</div>
                                                <p style={{ color: 'var(--color-text-main)' }}>{selectedVillage.water_sources || 'No data recorded.'}</p>
                                            </div>
                                        </div>

                                        <div className="card" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Family Planning Services</h3>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Methods Available</div>
                                                <p style={{ color: 'var(--color-text-main)' }}>{selectedVillage.fp_methods_available || 'Not specified'}</p>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Current FP Acceptors</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#EC4899' }}>{selectedVillage.fp_acceptors_current || '0'}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'planning' && (
                                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                                        <div className="card" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Package size={20} style={{ color: '#F59E0B' }} /> Annual Logistics Requirements
                                            </h3>
                                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                                <div style={{ padding: '1rem', background: '#EFF6FF', borderRadius: 'var(--radius-md)' }}>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0EA5E9', marginBottom: '0.5rem' }}>Vaccine Requirements</div>
                                                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>{selectedVillage.annual_vaccine_requirement || 'Not planned yet'}</p>
                                                </div>
                                                <div style={{ padding: '1rem', background: '#FDF2F8', borderRadius: 'var(--radius-md)' }}>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#EC4899', marginBottom: '0.5rem' }}>FP Commodities Requirements</div>
                                                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>{selectedVillage.annual_fp_requirement || 'Not planned yet'}</p>
                                                </div>
                                                <div style={{ padding: '1rem', background: '#FEF3C7', borderRadius: 'var(--radius-md)' }}>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#F59E0B', marginBottom: '0.5rem' }}>IEC Materials Needed</div>
                                                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>{selectedVillage.iec_materials_needed || 'Not planned yet'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Calendar size={20} className="text-primary" /> Proposed Action Plan
                                            </h3>
                                            <div style={{ padding: '1rem', background: '#F0FDFA', borderRadius: 'var(--radius-md)' }}>
                                                <p style={{ fontSize: '0.95rem', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                                    {selectedVillage.action_plan || 'No action plan documented yet. Add interventions, campaigns, and training sessions planned for the next year.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'health' && (
                                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                                        <div className="card" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <TrendingUp size={20} style={{ color: '#10B981' }} /> Coverage Indicators
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                                <div style={{ padding: '1.5rem', background: '#ECFDF5', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>ANC Coverage</div>
                                                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#10B981' }}>{selectedVillage.anc_coverage_percent || '0'}%</div>
                                                </div>
                                                <div style={{ padding: '1.5rem', background: '#EFF6FF', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Institutional Delivery</div>
                                                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#0EA5E9' }}>{selectedVillage.institutional_delivery_percent || '0'}%</div>
                                                </div>
                                                <div style={{ padding: '1.5rem', background: '#F5F3FF', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Full Immunization</div>
                                                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#8B5CF6' }}>{selectedVillage.immunization_coverage_percent || '0'}%</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <AlertTriangle size={20} style={{ color: '#EF4444' }} /> High Risk Areas & Disease Burden
                                            </h3>
                                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#EF4444', marginBottom: '0.5rem' }}>High Risk Areas</div>
                                                    <div style={{ padding: '1rem', background: '#FEF2F2', borderRadius: 'var(--radius-md)' }}>
                                                        <p style={{ fontSize: '0.9rem', color: '#7F1D1D', whiteSpace: 'pre-wrap' }}>{selectedVillage.high_risk_areas || 'No high risk areas identified'}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#F59E0B', marginBottom: '0.5rem' }}>Endemic Diseases</div>
                                                    <div style={{ padding: '1rem', background: '#FFFBEB', borderRadius: 'var(--radius-md)' }}>
                                                        <p style={{ fontSize: '0.9rem', color: '#92400E', whiteSpace: 'pre-wrap' }}>{selectedVillage.endemic_diseases || 'No endemic diseases reported'}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#8B5CF6', marginBottom: '0.5rem' }}>NCD Burden</div>
                                                    <div style={{ padding: '1rem', background: '#F5F3FF', borderRadius: 'var(--radius-md)' }}>
                                                        <p style={{ fontSize: '0.9rem', color: '#5B21B6', whiteSpace: 'pre-wrap' }}>{selectedVillage.ncd_burden || 'Not assessed'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Flag size={20} className="text-primary" /> Health Needs Assessment
                                            </h3>
                                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Major Problems Identified</div>
                                                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{selectedVillage.major_health_problems || 'No specific problems listed.'}</p>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#D97706', marginBottom: '0.5rem' }}>Community's Perceived Needs</div>
                                                    <div style={{ backgroundColor: '#FFFBEB', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', color: '#92400E' }}>
                                                        {selectedVillage.health_needs_perceived || 'Community feedback not recorded.'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4F46E5', marginBottom: '0.5rem' }}>Observed Gaps (Student's Note)</div>
                                                    <div style={{ backgroundColor: '#EEF2FF', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', color: '#3730A3' }}>
                                                        {selectedVillage.health_gaps_observed || 'No observation notes found.'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
};

export default Community;
