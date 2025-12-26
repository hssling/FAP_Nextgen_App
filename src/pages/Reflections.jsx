import React, { useState, useEffect } from 'react';
import { BookOpen, Save, Star, User, Sparkles, X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const Reflections = () => {
    const { profile } = useAuth();
    const [families, setFamilies] = useState([]);
    const [reflections, setReflections] = useState([]);
    const [formData, setFormData] = useState({
        familyId: '',
        phase: 'Phase I',
        content: ''
    });
    const [aiFeedback, setAiFeedback] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile) loadData();
    }, [profile]);

    const loadData = async () => {
        try {
            setLoading(true);
            // 1. Fetch Families (from Supabase)
            const { data: fams, error: famError } = await supabase
                .from('families')
                .select('id, head_name')
                .eq('student_id', profile.id);

            if (famError) console.error("Family fetch error:", famError);
            setFamilies(fams || []);

            // 2. Fetch Reflections
            const { data: refs, error: refError } = await supabase
                .from('reflections')
                .select('*, families(head_name)')
                .eq('student_id', profile.id)
                .order('created_at', { ascending: false });

            if (refError) console.error("Reflection fetch error:", refError);
            setReflections(refs || []);

        } catch (error) {
            console.error("Load error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAICoach = () => {
        if (!formData.content.trim()) return;

        setIsAnalyzing(true);

        // Simulate AI
        setTimeout(() => {
            const text = formData.content.toLowerCase();
            let feedback = "Great documentation. ";
            let tips = [];

            if (text.includes('diet') || text.includes('food')) tips.push("Consider adding a 24-hour dietary recall.");
            if (text.includes('trust') || text.includes('rapport')) tips.push("Building trust takes time. Focus on active listening.");
            if (text.includes('water') || text.includes('sanitation')) tips.push("Check if this affects the whole community.");

            if (tips.length === 0) feedback += "Try to link your observation to specific social determinants.";
            else feedback += "Suggestions: " + tips.join(" ");

            setAiFeedback(feedback);
            setIsAnalyzing(false);
        }, 1500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.content.trim()) return;

        try {
            const { error } = await supabase.from('reflections').insert([{
                student_id: profile.id,
                family_id: formData.familyId || null,
                phase: formData.phase,
                content: formData.content,
                ai_feedback: aiFeedback,
                status: 'Pending'
            }]);

            if (error) throw error;

            setFormData({ ...formData, content: '' });
            setAiFeedback(null);
            loadData(); // Reload list
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save reflection.");
        }
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
                                        <option key={f.id} value={f.id}>{f.head_name}</option>
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
                                    placeholder="What did you learn today?..."
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
                                    {isAnalyzing ? "Analyzing..." : <><Sparkles size={16} style={{ color: '#D97706' }} /> Ask AI Coach</>}
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
                        {loading ? <p>Loading...</p> : reflections.length === 0 ? (
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
                                                {/* If linked to family, show it */}
                                                {ref.family_id && (
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <User size={14} /> Family: {ref.families?.head_name || 'Linked Family'}
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                {new Date(ref.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>
                                            {ref.content}
                                        </p>

                                        {/* Teacher Feedback Display */}
                                        {ref.teacher_feedback && (
                                            <div style={{ marginTop: '1rem', padding: '1rem', background: '#ECFDF5', borderRadius: '8px', borderLeft: '4px solid #059669' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#047857', fontWeight: '600' }}>
                                                    <MessageCircle size={16} /> Mentor Feedback
                                                </div>
                                                <p style={{ fontSize: '0.9rem', color: '#065F46' }}>{ref.teacher_feedback}</p>
                                                {ref.grade && <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#047857', fontWeight: '700' }}>Grade: {ref.grade}</div>}
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
