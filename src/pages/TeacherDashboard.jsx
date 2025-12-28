import React, { useState, useEffect } from 'react';
import {
    Users, BookOpen, CheckCircle, Download, Star,
    Search, Filter, LayoutGrid, List, ChevronRight,
    MoreVertical, Mail, Phone, Calendar, ArrowRight,
    TrendingUp, FileText, X, GraduationCap, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './TeacherDashboard.css';

const REFLECT_CRITERIA = [
    { id: 'score_exploration', label: 'Exploration', desc: 'Breadth/depth', max: 2 },
    { id: 'score_voice', label: 'Voice', desc: 'Authenticity', max: 2 },
    { id: 'score_description', label: 'Description', desc: 'Clarity', max: 2 },
    { id: 'score_emotions', label: 'Emotions', desc: 'Awareness', max: 2 },
    { id: 'score_analysis', label: 'Analysis', desc: 'Critical thought', max: 2 }
];

const TeacherDashboard = () => {
    const { profile } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Slide-Over State
    const [activeStudent, setActiveStudent] = useState(null);
    const [studentReflections, setStudentReflections] = useState([]);

    // Grading State
    const [gradingTarget, setGradingTarget] = useState(null);
    const [scores, setScores] = useState({ score_exploration: 0, score_voice: 0, score_description: 0, score_emotions: 0, score_analysis: 0 });
    const [gradeFeedback, setGradeFeedback] = useState('');

    useEffect(() => { if (profile?.id) fetchStudents(); }, [profile]);

    const fetchStudents = async () => {
        const { data: mappings } = await supabase.from('teacher_student_mappings').select('student:profiles!student_id(id, full_name, registration_number, email)').eq('teacher_id', profile.id).eq('is_active', true);
        const enhanced = await Promise.all((mappings || []).map(async (m) => {
            const { count: refCount } = await supabase.from('reflections').select('*', { count: 'exact', head: true }).eq('student_id', m.student.id);
            return { ...m.student, reflectionCount: refCount || 0 };
        }));
        setStudents(enhanced);
        setLoading(false);
    };

    const openStudent = async (student) => {
        setActiveStudent(student);
        const { data } = await supabase.from('reflections').select('*').eq('student_id', student.id).order('created_at', { ascending: false });
        setStudentReflections(data || []);
    };

    const startGrading = (ref) => {
        setGradingTarget(ref);
        setScores({
            score_exploration: ref.score_exploration || 0,
            score_voice: ref.score_voice || 0,
            score_description: ref.score_description || 0,
            score_emotions: ref.score_emotions || 0,
            score_analysis: ref.score_analysis || 0
        });
        setGradeFeedback(ref.teacher_feedback || '');
    };

    const saveGrade = async () => {
        const total = Object.values(scores).reduce((a, b) => a + b, 0);
        let grade = 'D';
        if (total >= 9) grade = 'A';
        else if (total >= 7) grade = 'B+';
        else if (total >= 5) grade = 'B';
        else if (total >= 3) grade = 'C';

        await supabase.from('reflections').update({
            ...scores, teacher_feedback: gradeFeedback, grade, total_score: total, status: 'Graded', graded_at: new Date()
        }).eq('id', gradingTarget.id);

        setStudentReflections(prev => prev.map(r => r.id === gradingTarget.id ? { ...r, ...scores, teacher_feedback: gradeFeedback, grade, total_score: total, status: 'Graded' } : r));
        setGradingTarget(null);
    };

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="brand">
                        <div style={{ background: '#0F172A', color: 'white', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}><GraduationCap size={20} /></div>
                        <span>Mentor Workspace</span>
                    </div>
                    <div className="search-bar">
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={16} />
                        <input
                            type="text" placeholder="Search students..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                {loading ? <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8' }}>Loading classroom...</div> : (
                    <div className="student-grid">
                        {students.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => (
                            <motion.div
                                key={student.id}
                                layoutId={`card-${student.id}`}
                                onClick={() => openStudent(student)}
                                className="student-card"
                            >
                                <div className="card-top">
                                    <div className="avatar">
                                        {student.full_name.charAt(0)}
                                    </div>
                                    <span className="count-badge">{student.reflectionCount} Entries</span>
                                </div>
                                <h3 className="student-name">{student.full_name}</h3>
                                <p className="student-id">{student.registration_number}</p>
                                <div className="view-link">
                                    View Portfolio <ArrowRight size={16} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Student Drawer */}
            <AnimatePresence>
                {activeStudent && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setActiveStudent(null)}
                            className="drawer-overlay"
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="drawer-panel"
                        >
                            <div className="drawer-header">
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>{activeStudent.full_name}</h2>
                                    <p style={{ color: '#64748B', fontSize: '0.875rem' }}>{activeStudent.registration_number}</p>
                                </div>
                                <button onClick={() => setActiveStudent(null)} style={{ padding: '0.5rem', borderRadius: '50%', border: '1px solid #E2E8F0' }}><X size={20} /></button>
                            </div>

                            <div className="drawer-content">
                                {studentReflections.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>No reflections submitted yet.</div>
                                ) : (
                                    studentReflections.map(ref => (
                                        <div key={ref.id} className="ref-card">
                                            <div className="ref-header">
                                                <div>
                                                    <span className="ref-date">{new Date(ref.created_at).toLocaleDateString()}</span>
                                                    <h4 className="ref-title">
                                                        {ref.gibbs_description ? "Reflection on " + ref.gibbs_description.substring(0, 30) + "..." : ref.file_name || "Journal Entry"}
                                                    </h4>
                                                </div>
                                                {ref.status === 'Graded' ? (
                                                    <div className="status-graded">
                                                        <span className="grade-display">{ref.grade}</span>
                                                        <span className="status-label">Graded</span>
                                                    </div>
                                                ) : (
                                                    <span className="status-pending">
                                                        <Clock size={12} /> Pending
                                                    </span>
                                                )}
                                            </div>

                                            {/* Content Preview / File Link */}
                                            {ref.reflection_type === 'file' ? (
                                                <div style={{ background: '#F1F5F9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <FileText size={20} color="#64748B" />
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, flex: 1 }}>{ref.file_name}</span>
                                                    <a href={ref.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0EA5E9' }}><Download size={18} /></a>
                                                </div>
                                            ) : (
                                                <div className="ref-preview">
                                                    {['description', 'feelings', 'evaluation', 'analysis', 'conclusion', 'action_plan'].map(stage => {
                                                        const val = ref[`gibbs_${stage}`];
                                                        if (!val) return null;
                                                        return <p key={stage} style={{ marginBottom: '0.5rem' }}><strong style={{ textTransform: 'capitalize', fontSize: '0.75rem', color: '#64748B' }}>{stage.replace('_', ' ')}:</strong> {val}</p>
                                                    })}
                                                    {!ref.gibbs_description && <p>{ref.content}</p>}
                                                </div>
                                            )}

                                            <button
                                                onClick={() => startGrading(ref)}
                                                className="assess-btn"
                                            >
                                                {ref.status === 'Graded' ? 'Edit Assessment' : 'Start Assessment'} <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Grading Modal - Reusing CSS classes */}
            <AnimatePresence>
                {gradingTarget && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="grading-overlay"
                    >
                        <div className="grading-box">
                            <div className="grading-header">
                                <h3>Assess Reflection</h3>
                                <button onClick={() => setGradingTarget(null)}><X size={20} /></button>
                            </div>

                            <div className="grading-body">

                                {/* Reference text for grading context */}
                                <div style={{ maxHeight: '100px', overflowY: 'auto', background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: '#64748B', marginBottom: '1rem' }}>
                                    <strong>Content Preview:</strong><br />
                                    {gradingTarget.gibbs_analysis || gradingTarget.content || gradingTarget.file_name || "No text content."}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {REFLECT_CRITERIA.map(crit => (
                                        <div key={crit.id} className="criteria-row">
                                            <div className="criteria-label">
                                                {crit.label}
                                                <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 400 }}>{crit.desc}</span>
                                            </div>
                                            <div className="score-group">
                                                {[0, 1, 2].map(val => (
                                                    <button
                                                        key={val}
                                                        onClick={() => setScores({ ...scores, [crit.id]: val })}
                                                        className={`score-btn ${scores[crit.id] >= val ? 'selected' : ''}`}
                                                    >
                                                        {val}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                                    <textarea
                                        className="feedback-area"
                                        rows={3}
                                        placeholder="Constructive feedback for the student..."
                                        value={gradeFeedback}
                                        onChange={e => setGradeFeedback(e.target.value)}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                        <button onClick={saveGrade} className="save-grade-btn">
                                            Save Grade
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherDashboard;
