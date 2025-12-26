import React, { useState, useEffect } from 'react';
import { BookOpen, Save, Star, User, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFamilies, addReflection, getReflections } from '../services/db';
import { useAuth } from '../contexts/AuthContext';

const Reflections = () => {
    const { user } = useAuth();
    const [families, setFamilies] = useState([]);
    const [reflections, setReflections] = useState([]);
    const [formData, setFormData] = useState({
        familyId: '',
        phase: 'Phase I',
        content: ''
    });
    const [aiFeedback, setAiFeedback] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [fams, refs] = await Promise.all([getFamilies(), getReflections()]);
        setFamilies(fams);
        setReflections(refs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    };

    const handleAICoach = () => {
        if (!formData.content.trim()) return;

        setIsAnalyzing(true);

        // Simulate AI processing delay
        setTimeout(() => {
            const text = formData.content.toLowerCase();
            let feedback = "Great documentation. ";
            let tips = [];

            // Simple keyword analysis simulation
            if (text.includes('diet') || text.includes('food') || text.includes('nutrition')) {
                tips.push("Consider adding a 24-hour dietary recall to the next visit.");
            }
            if (text.includes('trust') || text.includes('rapport') || text.includes('refused')) {
                tips.push("Building trust takes time. Focus on active listening without immediate medical advice.");
            }
            if (text.includes('water') || text.includes('sanitation') || text.includes('toilet')) {
                tips.push("This relates to environmental health. Check if this affects the whole community.");
            }
            if (text.includes('happy') || text.includes('sad') || text.includes('anxious')) {
                tips.push("Good job noting the psychosocial state of the family.");
            }

            if (tips.length === 0) {
                feedback += "Try to link your observation to specific social determinants of health in your next entry.";
            } else {
                feedback += "Here are some suggestions for your next steps: " + tips.join(" ");
            }

            setAiFeedback(feedback);
            setIsAnalyzing(false);
        }, 1500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.content.trim()) return;

        await addReflection({
            ...formData,
            studentId: user?.id || 'guest',
            status: 'Pending',
            aiFeedback: aiFeedback, // Save the feedback if generated
            familyId: formData.familyId ? parseInt(formData.familyId) : null
        });

        setFormData({ ...formData, content: '' });
        setAiFeedback(null);
        loadData();
    };

    const getFamilyName = (id) => {
        const fam = families.find(f => f.id === id);
        return fam ? `${fam.headName}'s Family` : 'General / No Link';
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '2rem' }}>
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="page-header"
            >
                <h1 className="page-title">Reflective Writing</h1>
                <p className="page-subtitle">Document your learning journey and field experiences.</p>
            </motion.header>

            <div className="grid-layout grid-split">
                {/* Form Section */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="card" style={{ padding: '2rem', position: 'sticky', top: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={20} className="text-primary" /> New Entry
                        </h2>

                        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Linked Family (Optional)</label>
                                <select
                                    className="form-control"
                                    value={formData.familyId}
                                    onChange={e => setFormData({ ...formData, familyId: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                >
                                    <option value="">-- General Reflection --</option>
                                    {families.map(f => (
                                        <option key={f.id} value={f.id}>{f.headName}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Phase</label>
                                <select
                                    className="form-control"
                                    value={formData.phase}
                                    onChange={e => setFormData({ ...formData, phase: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                >
                                    <option>Phase I</option>
                                    <option>Phase II</option>
                                    <option>Phase III</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Reflection Narrative</label>
                                <textarea
                                    rows={8}
                                    placeholder="What did you learn today? How did the visit go? (Mention keywords like 'diet', 'trust', 'sanitation' to trigger AI Coach)"
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'inherit', resize: 'vertical' }}
                                    required
                                />
                            </div>

                            <AnimatePresence>
                                {aiFeedback && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        style={{
                                            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                                            padding: '1rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid #BFDBFE',
                                            display: 'flex',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        <Sparkles size={20} style={{ color: '#2563EB', flexShrink: 0, marginTop: '2px' }} />
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1E40AF', marginBottom: '0.25rem' }}>AI Coach Feedback</h4>
                                            <p style={{ fontSize: '0.875rem', color: '#1E3A8A', lineHeight: '1.5' }}>{aiFeedback}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAiFeedback(null)}
                                            style={{ color: '#60A5FA', alignSelf: 'flex-start' }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={handleAICoach}
                                    disabled={!formData.content || isAnalyzing}
                                    style={{ fontSize: '0.9rem' }}
                                >
                                    {isAnalyzing ? (
                                        <><span>Analyzing...</span></>
                                    ) : (
                                        <><Sparkles size={16} style={{ color: '#D97706' }} /> Ask AI Coach</>
                                    )}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={18} /> Save Entry
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>

                {/* List Section */}
                <div style={{ height: 'calc(100vh - 140px)', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Your Journal</h2>
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{reflections.length} entries</span>
                    </div>

                    <AnimatePresence>
                        {reflections.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}
                            >
                                <BookOpen size={48} style={{ opacity: 0.2 }} />
                                <p style={{ marginTop: '1rem' }}>No reflections yet. Start writing!</p>
                            </motion.div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {reflections.map((ref, index) => (
                                    <motion.div
                                        key={ref.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="card"
                                        style={{ padding: '1.5rem' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                <span style={{
                                                    fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700',
                                                    padding: '0.25rem 0.6rem', borderRadius: '6px', background: '#EEF2FF', color: '#4F46E5'
                                                }}>
                                                    {ref.phase}
                                                </span>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <User size={14} /> {getFamilyName(ref.familyId)}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                {new Date(ref.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>

                                        <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>
                                            {ref.content}
                                        </p>

                                        {ref.aiFeedback && (
                                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)', borderLeft: '3px solid #60A5FA', fontSize: '0.875rem', color: '#475569' }}>
                                                <strong>AI Coach Note:</strong> {ref.aiFeedback.replace("AI Coach Feedback", "")}
                                            </div>
                                        )}

                                        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Status:</span>
                                            <span style={{
                                                fontSize: '0.8rem',
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '99px',
                                                background: ref.status === 'Graded' ? '#ECFDF5' : '#FFFBEB',
                                                color: ref.status === 'Graded' ? '#047857' : '#D97706',
                                                fontWeight: '500',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}>
                                                {ref.status === 'Graded' ? <Star size={12} fill="currentColor" /> : null}
                                                {ref.status || 'Pending'}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Reflections;
