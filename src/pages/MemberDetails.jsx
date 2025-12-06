import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Activity, AlertCircle, CheckCircle, Pill, Utensils, FileText, ClipboardList, Plus, ShieldCheck, CreditCard, ChevronRight } from 'lucide-react';
import { getMembers, updateMember } from '../services/db';
import DynamicForm from '../components/DynamicForm';
import formRegistry from '../data/forms/registry.json';

const MemberDetails = () => {
    const { id, memberId } = useParams();
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [showProblemModal, setShowProblemModal] = useState(false);
    const [showInterventionModal, setShowInterventionModal] = useState(false);
    const [showAssessmentModal, setShowAssessmentModal] = useState(false);
    const [selectedAssessmentForm, setSelectedAssessmentForm] = useState(null);

    // Form States
    const [newProblem, setNewProblem] = useState({ title: '', date: '', notes: '' });
    const [newIntervention, setNewIntervention] = useState({ title: '', type: 'diet', description: '' });
    const [abhaId, setAbhaId] = useState('');
    const [abhaVerified, setAbhaVerified] = useState(false);

    useEffect(() => {
        const loadMember = async () => {
            const allMembers = await getMembers(id);
            const found = allMembers.find(m => m.id === parseInt(memberId));
            // Ensure arrays exist
            if (found) {
                if (!found.problems) found.problems = [];
                if (!found.interventions) found.interventions = [];
                if (!found.assessments) found.assessments = [];
                if (found.abhaId) {
                    setAbhaId(found.abhaId);
                    setAbhaVerified(true);
                }
            }
            setMember(found);
            setLoading(false);
        };
        loadMember();
    }, [id, memberId]);

    const handleUpdateMember = async (updatedMember) => {
        await updateMember(updatedMember);
        setMember({ ...updatedMember });
    };

    const addProblem = async (e) => {
        e.preventDefault();
        const updated = {
            ...member,
            problems: [...member.problems, { ...newProblem, id: Date.now() }]
        };
        await handleUpdateMember(updated);
        setShowProblemModal(false);
        setNewProblem({ title: '', date: '', notes: '' });
    };

    const addIntervention = async (e) => {
        e.preventDefault();
        const updated = {
            ...member,
            interventions: [...member.interventions, { ...newIntervention, id: Date.now() }]
        };
        await handleUpdateMember(updated);
        setShowInterventionModal(false);
        setNewIntervention({ title: '', type: 'diet', description: '' });
    };

    const handleAssessmentSubmit = async (data) => {
        const assessmentRecord = {
            id: Date.now(),
            formId: selectedAssessmentForm,
            date: new Date().toISOString().split('T')[0],
            data: data
        };
        const updated = {
            ...member,
            assessments: [...member.assessments, assessmentRecord]
        };
        await handleUpdateMember(updated);
        setSelectedAssessmentForm(null);
        setShowAssessmentModal(false);
    };

    const verifyAbha = async () => {
        // Mock ABHA Verification
        if (abhaId.length === 14) {
            setAbhaVerified(true);
            const updated = { ...member, abhaId: abhaId };
            await handleUpdateMember(updated);
            alert("ABHA Verified: Linked to PM-JAY Cluster.");
        } else {
            alert("Invalid ABHA Format. Must be 14 digits.");
        }
    };

    const getFormSchema = (formId) => formRegistry.find(f => f.form_id === formId);

    if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Loading Member...</div>;
    if (!member) return <div className="container" style={{ paddingTop: '2rem' }}>Member not found.</div>;

    // Derived Health Status (Mock Logic based on assessments)
    const lastBP = member.assessments.find(a => a.formId === 'ncd_screening_v1')?.data.bp_systolic || '-';

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <Link to={`/families/${id}`} style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    ← Back to Family
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={32} />
                        </div>
                        <div>
                            <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>{member.name}</h1>
                            <p style={{ color: 'var(--color-text-muted)' }}>{member.age} years • {member.gender} • {member.relationship}</p>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowAssessmentModal(true)}>
                        <ClipboardList size={20} /> New Assessment
                    </button>
                </div>
            </div>

            {/* ABHA & Identity Section */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #8B5CF6' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={20} className="text-primary" /> Identity & Entitlements
                </h3>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>ABHA Number (Health ID)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                placeholder="XX-XXXX-XXXX-XXXX"
                                className="input"
                                style={{ flex: 1, borderColor: abhaVerified ? '#10B981' : '' }}
                                value={abhaId}
                                onChange={(e) => setAbhaId(e.target.value)}
                                disabled={abhaVerified}
                            />
                            <button className="btn btn-outline" onClick={verifyAbha} disabled={abhaVerified}>
                                {abhaVerified ? 'Verified' : 'Verify'}
                            </button>
                        </div>
                    </div>
                    {abhaVerified && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ padding: '0.5rem 1rem', background: '#ECFDF5', color: '#047857', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={16} /> PM-JAY Eligible
                            </div>
                            <div style={{ padding: '0.5rem 1rem', background: '#F0F9FF', color: '#0369A1', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={16} /> NIKSHAY Linked
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Assessment History with Trend Hint */}
            {member.assessments.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Assessment History</h3>
                    <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {member.assessments.map((a, idx) => {
                            const schema = getFormSchema(a.formId);
                            return (
                                <div key={idx} className="card" style={{ padding: '1rem', minWidth: '220px', position: 'relative' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{a.date}</div>
                                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{schema ? schema.title : a.formId}</div>

                                    {/* Quick Summary Lines */}
                                    {a.formId === 'ncd_screening_v1' && (
                                        <div style={{ fontSize: '0.75rem', color: '#4B5563', marginBottom: '0.5rem' }}>
                                            BP: {a.data.bp_systolic}/{a.data.bp_diastolic} • RBS: {a.data.rbs}
                                        </div>
                                    )}

                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        View Data <ChevronRight size={14} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                {/* Clinical Vitals */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={20} className="text-secondary" /> Clinical Status
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>BMI</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>-</span>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>BP (Last)</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{lastBP > 0 ? `${lastBP} Sys` : '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Problem List */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={20} style={{ color: '#EF4444' }} /> Identified Problems
                    </h3>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {member.problems.length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No problems identified yet.</p>
                        ) : (
                            member.problems.map(prob => (
                                <div key={prob.id} style={{ padding: '0.75rem', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', backgroundColor: '#FEF2F2' }}>
                                    <div style={{ fontWeight: '600', color: '#991B1B', marginBottom: '0.25rem' }}>{prob.title}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#7F1D1D' }}>{prob.date} • {prob.notes}</div>
                                </div>
                            ))
                        )}
                    </div>
                    <button className="btn btn-outline" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setShowProblemModal(true)}>+ Add Diagnosis</button>
                </div>

                {/* Interventions */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Pill size={20} className="text-primary" /> Active Interventions
                    </h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {member.interventions.length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No active interventions.</p>
                        ) : (
                            member.interventions.map(int => (
                                <div key={int.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ padding: '0.5rem', backgroundColor: '#F0FDFA', borderRadius: '6px', color: '#0F766E' }}>
                                        {int.type === 'diet' ? <Utensils size={18} /> : <Pill size={18} />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{int.title}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{int.description}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <button className="btn btn-outline" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setShowInterventionModal(true)}>+ Add Plan</button>
                </div>
            </div>

            {/* Assessment Selection Modal */}
            {showAssessmentModal && (
                <div className="modal-overlay">
                    <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        {!selectedAssessmentForm ? (
                            <>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Select Assessment Protocol</h2>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {formRegistry.filter(f => !f.form_id.includes('household') && !f.form_id.includes('village')).map(form => (
                                        <button
                                            key={form.form_id}
                                            onClick={() => setSelectedAssessmentForm(form.form_id)}
                                            style={{
                                                padding: '1rem',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-md)',
                                                textAlign: 'left',
                                                backgroundColor: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <span style={{ fontWeight: '500' }}>{form.title}</span>
                                            <Plus size={16} />
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                    <button className="btn btn-outline" onClick={() => setShowAssessmentModal(false)}>Cancel</button>
                                </div>
                            </>
                        ) : (
                            <DynamicForm
                                schema={getFormSchema(selectedAssessmentForm)}
                                onSubmit={handleAssessmentSubmit}
                                onCancel={() => setSelectedAssessmentForm(null)}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Problem & Intervention Modals */}
            {showProblemModal && (
                <div className="modal-overlay">
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Add Diagnosis / Problem</h2>
                        <form onSubmit={addProblem}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Diagnosis / Problem</label>
                                <input type="text" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} value={newProblem.title} onChange={e => setNewProblem({ ...newProblem, title: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Date Identified</label>
                                <input type="date" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} value={newProblem.date} onChange={e => setNewProblem({ ...newProblem, date: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Clinical Notes</label>
                                <textarea style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} rows={3} value={newProblem.notes} onChange={e => setNewProblem({ ...newProblem, notes: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowProblemModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Diagnosis</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showInterventionModal && (
                <div className="modal-overlay">
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Add Intervention Plan</h2>
                        <form onSubmit={addIntervention}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Intervention Title</label>
                                <input type="text" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} value={newIntervention.title} onChange={e => setNewIntervention({ ...newIntervention, title: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Type</label>
                                <select style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} value={newIntervention.type} onChange={e => setNewIntervention({ ...newIntervention, type: e.target.value })}>
                                    <option value="diet">Dietary Advice</option>
                                    <option value="medication">Medication / Supplement</option>
                                    <option value="lifestyle">Lifestyle Modification</option>
                                    <option value="education">Health Education</option>
                                    <option value="referral">Referral</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Description & Plan</label>
                                <textarea style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} rows={3} value={newIntervention.description} onChange={e => setNewIntervention({ ...newIntervention, description: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowInterventionModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Plan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background-color: rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(4px); z-index: 100;
                }
            `}</style>
        </div>
    );
};

export default MemberDetails;
