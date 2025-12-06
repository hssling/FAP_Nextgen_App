import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Activity, Calendar, Droplets, Home, Trash2, PlusCircle, FileText, ArrowRight, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFamily, getMembers, addMember } from '../services/db';
import DynamicForm from '../components/DynamicForm';
import formRegistry from '../data/forms/registry.json';

const FamilyDetails = () => {
    const { id } = useParams();
    const [family, setFamily] = useState(null);
    const [members, setMembers] = useState([]);
    const [visits, setVisits] = useState([]);
    const [activeTab, setActiveTab] = useState('members');

    // Modals
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showVisitModal, setShowVisitModal] = useState(false);
    const [selectedVisitData, setSelectedVisitData] = useState(null);

    // States for Forms
    const [newMember, setNewMember] = useState({ name: '', age: '', gender: 'Male', relationship: '' });
    const [visitStep, setVisitStep] = useState(1);
    const [selectedProtocol, setSelectedProtocol] = useState('');
    const [newVisit, setNewVisit] = useState({
        date: new Date().toISOString().split('T')[0],
        purpose: 'General Assessment',
        duration: '1',
        reflections: '',
        protocol: null
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        const fam = await getFamily(id);
        const mems = await getMembers(id);
        const mockVisits = [
            {
                id: 1,
                date: new Date().toISOString().split('T')[0],
                purpose: 'Environment & Sanitation',
                duration: 1.5,
                status: 'Completed',
                protocol: 'environment_sanitation_v1',
                data: {
                    water_quality_rc: 0.3,
                    rc_pass: true,
                    solid_waste: 'segregated',
                    ventilation: 'Adequate',
                    vector_breeding: false
                }
            }
        ];
        setFamily(fam);
        setMembers(mems);
        setVisits(mockVisits);
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        await addMember({ ...newMember, familyId: parseInt(id) });
        setShowMemberModal(false);
        setNewMember({ name: '', age: '', gender: 'Male', relationship: '' });
        loadData();
    };

    const handleVisitBasicSubmit = (e) => {
        e.preventDefault();
        if (newVisit.protocol) {
            setVisitStep(2);
            setSelectedProtocol(newVisit.protocol);
        } else {
            finalizeVisit({});
        }
    };

    const finalizeVisit = (protocolData) => {
        const visit = {
            ...newVisit,
            id: Date.now(),
            data: protocolData
        };
        setVisits([visit, ...visits]);
        resetVisitModal();
    };

    const resetVisitModal = () => {
        setShowVisitModal(false);
        setVisitStep(1);
        setNewVisit({
            date: new Date().toISOString().split('T')[0],
            purpose: 'General Assessment',
            duration: '1',
            reflections: '',
            protocol: null
        });
    };

    const getFormSchema = (formId) => {
        return formRegistry.find(f => f.form_id === formId);
    };

    const viewVisitData = (visit) => {
        if (visit.protocol && visit.data) {
            const schema = getFormSchema(visit.protocol);
            setSelectedVisitData({ schema, data: visit.data });
        }
    };

    if (!family) return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>;

    return (
        <div>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '2rem' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <Link to="/families" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ← Back to Families
                    </Link>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                    <div>
                        <h1 className="page-title">{family.headName} Family</h1>
                        <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--color-text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Home size={18} /> {family.village}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={18} /> {members.length} Members</span>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn btn-primary"
                        onClick={() => setShowMemberModal(true)}
                    >
                        <PlusCircle size={20} /> Add Member
                    </motion.button>
                </div>
            </motion.div>

            {/* Tabs */}
            <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '2rem' }}>
                    {['members', 'socio', 'visits'].map(tab => (
                        <motion.button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            whileHover={{ y: -2 }}
                            style={{
                                padding: '1rem 0',
                                borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : 'none',
                                color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                background: 'none',
                                border: 'none',
                                textTransform: 'capitalize'
                            }}
                        >
                            {tab === 'socio' ? 'Socio-Economic' : tab === 'visits' ? 'Visit Log' : 'Family Members'}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{ minHeight: '400px' }}
                >
                    {activeTab === 'members' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {members.map((member, index) => (
                                <motion.div
                                    key={member.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ y: -5, boxShadow: 'var(--shadow-md)' }}
                                    className="card"
                                    style={{ padding: '1.5rem' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={20} color="#64748B" />
                                        </div>
                                        <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#F1F5F9' }}>
                                            {member.gender}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>{member.name}</h3>
                                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>{member.age} years • {member.relationship}</p>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Link to={`/families/${id}/members/${member.id}`} className="btn btn-outline" style={{ fontSize: '0.875rem', width: '100%', textDecoration: 'none' }}>
                                            View History
                                        </Link>
                                    </div>
                                </motion.div>
                            ))}
                            {members.length === 0 && (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)', border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                                    <p>No members added yet.</p>
                                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowMemberModal(true)}>Add First Member</button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'socio' && (
                        <div className="card" style={{ padding: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Home size={20} className="text-primary" /> Housing Condition
                                    </h3>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Type of House</span>
                                            <span style={{ fontWeight: '500' }}>Pucca</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Droplets size={20} className="text-secondary" /> Water & Sanitation
                                    </h3>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Water Source</span>
                                            <span style={{ fontWeight: '500' }}>Piped Water</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn btn-outline">Edit Details</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'visits' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="btn btn-primary"
                                    onClick={() => setShowVisitModal(true)}
                                >
                                    <FileText size={18} /> New Visit Log
                                </motion.button>
                            </div>
                            <div className="card">
                                <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', fontWeight: '600', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                    <div>Date</div>
                                    <div>Purpose</div>
                                    <div>Duration</div>
                                    <div>Data</div>
                                </div>
                                {visits.length === 0 ? (
                                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        No visits recorded yet.
                                    </div>
                                ) : (
                                    visits.map((visit, index) => (
                                        <motion.div
                                            key={visit.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.1 }}
                                            style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', alignItems: 'center' }}
                                        >
                                            <div>{visit.date}</div>
                                            <div>{visit.purpose}</div>
                                            <div>{visit.duration}h</div>
                                            <div>
                                                {visit.protocol ? (
                                                    <button
                                                        onClick={() => viewVisitData(visit)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                    >
                                                        <ClipboardList size={16} /> View Data
                                                    </button>
                                                ) : (
                                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>-</span>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Modals remain the same but wrapped in AnimatePresence */}
            <AnimatePresence>
                {showMemberModal && (
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
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Add Family Member</h2>
                            <form onSubmit={handleAddMember}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                        value={newMember.name}
                                        onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Age</label>
                                        <input
                                            type="number"
                                            required
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                            value={newMember.age}
                                            onChange={e => setNewMember({ ...newMember, age: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Gender</label>
                                        <select
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                            value={newMember.gender}
                                            onChange={e => setNewMember({ ...newMember, gender: e.target.value })}
                                        >
                                            <option>Male</option>
                                            <option>Female</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Relationship to Head</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Wife, Son"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                        value={newMember.relationship}
                                        onChange={e => setNewMember({ ...newMember, relationship: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button type="button" className="btn btn-outline" onClick={() => setShowMemberModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Add Member</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Visit Modal and View Data Modal - keeping original structure but with AnimatePresence wrapper */}
            {showVisitModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)', zIndex: 100, overflowY: 'auto'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', margin: '2rem 0' }}>
                        {visitStep === 1 ? (
                            <>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Log New Visit</h2>
                                <form onSubmit={handleVisitBasicSubmit}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Date</label>
                                            <input
                                                type="date"
                                                required
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                                value={newVisit.date}
                                                onChange={e => setNewVisit({ ...newVisit, date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Duration (Hrs)</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                required
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                                value={newVisit.duration}
                                                onChange={e => setNewVisit({ ...newVisit, duration: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Primary Assessment / Protocol</label>
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                                                <input type="radio" name="protocol" checked={!newVisit.protocol} onChange={() => setNewVisit({ ...newVisit, protocol: null })} />
                                                <span>General Follow-up</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: '#F0FDFA' }}>
                                                <input type="radio" name="protocol" value="environment_sanitation_v1" checked={newVisit.protocol === 'environment_sanitation_v1'} onChange={(e) => setNewVisit({ ...newVisit, protocol: e.target.value })} />
                                                <div>
                                                    <strong>Environment & Sanitation</strong>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Water source, waste disposal, ventilation checks</div>
                                                </div>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: '#FEF2F2' }}>
                                                <input type="radio" name="protocol" value="health_education_session_v1" checked={newVisit.protocol === 'health_education_session_v1'} onChange={(e) => setNewVisit({ ...newVisit, protocol: e.target.value })} />
                                                <div>
                                                    <strong>Health Education Session</strong>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Structured teaching on nutrition, hygiene, etc.</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '2rem' }}>
                                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: '500' }}>
                                            Reflections / Qualitative Notes <span style={{ fontWeight: '400', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>(Optional but recommended)</span>
                                        </label>
                                        <textarea
                                            placeholder="Observation of family dynamics, diet, cultural beliefs..."
                                            rows={3}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'inherit' }}
                                            value={newVisit.reflections}
                                            onChange={e => setNewVisit({ ...newVisit, reflections: e.target.value })}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                        <button type="button" className="btn btn-outline" onClick={resetVisitModal}>Cancel</button>
                                        <button type="submit" className="btn btn-primary">{newVisit.protocol ? 'Continue to Assessment >' : 'Log Visit'}</button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <DynamicForm
                                schema={getFormSchema(selectedProtocol)}
                                onSubmit={finalizeVisit}
                                onCancel={() => setVisitStep(1)}
                            />
                        )}
                    </div>
                </div>
            )}

            {selectedVisitData && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)', zIndex: 100, overflowY: 'auto'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', margin: '2rem 0' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
                            {selectedVisitData.schema?.title || 'Visit Data'}
                        </h2>
                        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                            {selectedVisitData.schema?.fields.map(field => (
                                <div key={field.key} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{field.label}</div>
                                    <div style={{ fontWeight: '500' }}>
                                        {field.type === 'checkbox'
                                            ? (selectedVisitData.data[field.key] ? 'Yes' : 'No')
                                            : (selectedVisitData.data[field.key] || '-')
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline" onClick={() => setSelectedVisitData(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FamilyDetails;
