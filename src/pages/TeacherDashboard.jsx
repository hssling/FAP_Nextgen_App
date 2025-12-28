import React, { useState, useEffect } from 'react';
import {
    Users, BookOpen, CheckCircle, Download, Star,
    Search, Filter, LayoutGrid, List, ChevronRight,
    MoreVertical, Mail, Phone, Calendar, ArrowRight,
    TrendingUp, FileText, X, GraduationCap, Clock,
    Home, Edit3, Save, Trash2, PieChart, Activity
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

const TARGET_REFLECTIONS = 10; // Nominal target for progress bar calculation

const TeacherDashboard = () => {
    const { profile } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Aggregate Stats
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalReflections: 0,
        pendingReviews: 0,
        classAverage: 0
    });

    // Slide-Over State
    const [activeStudent, setActiveStudent] = useState(null);
    const [studentReflections, setStudentReflections] = useState([]);
    const [studentFamilies, setStudentFamilies] = useState([]);
    const [studentNotes, setStudentNotes] = useState('');
    const [notesSaving, setNotesSaving] = useState(false);

    // Drawer Tab State
    const [drawerTab, setDrawerTab] = useState('reflections');

    // Grading State
    const [gradingTarget, setGradingTarget] = useState(null);
    const [scores, setScores] = useState({ score_exploration: 0, score_voice: 0, score_description: 0, score_emotions: 0, score_analysis: 0 });
    const [gradeFeedback, setGradeFeedback] = useState('');

    useEffect(() => { if (profile?.id) fetchClassroomData(); }, [profile]);

    const fetchClassroomData = async () => {
        setLoading(true);
        // 1. Get My Students
        const { data: mappings } = await supabase.from('teacher_student_mappings')
            .select('student:profiles!student_id(id, full_name, registration_number, email)')
            .eq('teacher_id', profile.id)
            .eq('is_active', true);

        if (!mappings) {
            setStudents([]);
            setLoading(false);
            return;
        }

        // 2. Enhance with Stats (Promise.all for speed)
        let totalRefs = 0;
        let pending = 0;
        let totalScoreSum = 0;
        let gradedCount = 0;

        const enhanced = await Promise.all(mappings.map(async (m) => {
            const student = m.student;

            // Fetch reflections brief (for stats)
            const { data: refs } = await supabase.from('reflections').select('status, total_score').eq('student_id', student.id);
            const { count: famCount } = await supabase.from('families').select('*', { count: 'exact', head: true }).eq('student_id', student.id);

            const studentRefs = refs || [];
            const sTotalRefs = studentRefs.length;
            const sPending = studentRefs.filter(r => r.status === 'Pending').length;
            const sGraded = studentRefs.filter(r => r.status === 'Graded');
            const sAvg = sGraded.length > 0
                ? (sGraded.reduce((a, b) => a + (b.total_score || 0), 0) / sGraded.length).toFixed(1)
                : 0;

            // Update Class Totals
            totalRefs += sTotalRefs;
            pending += sPending;
            sGraded.forEach(r => { totalScoreSum += (r.total_score || 0); gradedCount++; });

            return {
                ...student,
                reflectionCount: sTotalRefs,
                pendingCount: sPending,
                familyCount: famCount || 0,
                avgGrade: sAvg,
                progress: Math.min(100, Math.round((sTotalRefs / TARGET_REFLECTIONS) * 100))
            };
        }));

        setStudents(enhanced);
        setStats({
            totalStudents: enhanced.length,
            totalReflections: totalRefs,
            pendingReviews: pending,
            classAverage: gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : 0
        });
        setLoading(false);
    };

    const openStudent = async (student) => {
        setActiveStudent(student);
        setDrawerTab('reflections');

        const refsPromise = supabase.from('reflections').select('*').eq('student_id', student.id).order('created_at', { ascending: false });
        const famsPromise = supabase.from('families').select('*').eq('student_id', student.id);
        const notesPromise = supabase.from('teacher_student_mappings').select('notes').eq('teacher_id', profile.id).eq('student_id', student.id).single();

        const [refs, fams, notesRes] = await Promise.all([refsPromise, famsPromise, notesPromise]);

        setStudentReflections(refs.data || []);
        setStudentFamilies(fams.data || []);
        setStudentNotes(notesRes.data?.notes || '');
    };

    const saveNotes = async () => {
        setNotesSaving(true);
        try {
            const { error } = await supabase.from('teacher_student_mappings')
                .update({ notes: studentNotes })
                .eq('teacher_id', profile.id)
                .eq('student_id', activeStudent.id);
            if (error) throw error;
        } catch (e) {
            console.error("Error saving notes:", e);
            alert("Failed to save notes.");
        } finally {
            setNotesSaving(false);
        }
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

        // NOTE: total_score is a computed column in DB, do not send it in update.
        await supabase.from('reflections').update({
            ...scores,
            teacher_feedback: gradeFeedback,
            grade,
            status: 'Graded',
            graded_at: new Date().toISOString()
        }).eq('id', gradingTarget.id);

        // Update local state (optimistic update)
        setStudentReflections(prev => prev.map(r => r.id === gradingTarget.id ? {
            ...r, ...scores, teacher_feedback: gradeFeedback, grade, total_score: total, status: 'Graded'
        } : r));

        // Lightweight stats update
        setStats(prev => ({ ...prev, pendingReviews: Math.max(0, prev.pendingReviews - 1) }));

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

            {/* CLASSROOM ANALYTICS BAR */}
            <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '1rem 0' }}>
                <div className="header-content" style={{ display: 'flex', gap: '2rem', height: 'auto' }}>
                    <div className="stat-pill">
                        <span className="stat-label">Total Students</span>
                        <span className="stat-value">{stats.totalStudents}</span>
                    </div>
                    <div className="stat-pill">
                        <span className="stat-label">Pending Reviews</span>
                        <span className="stat-value" style={{ color: stats.pendingReviews > 0 ? '#D97706' : '#10B981' }}>{stats.pendingReviews}</span>
                    </div>
                    <div className="stat-pill">
                        <span className="stat-label">Total Reflections</span>
                        <span className="stat-value">{stats.totalReflections}</span>
                    </div>
                    <div className="stat-pill">
                        <span className="stat-label">Class Avg. Score</span>
                        <span className="stat-value">{stats.classAverage}</span>
                    </div>
                </div>
            </div>

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
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: student.pendingCount > 0 ? '#D97706' : '#0F172A' }}>
                                            {student.pendingCount > 0 ? `${student.pendingCount} Pending` : 'All Caught Up'}
                                        </div>
                                    </div>
                                </div>
                                <h3 className="student-name">{student.full_name}</h3>
                                <p className="student-id">{student.registration_number}</p>

                                <div style={{ marginTop: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.25rem' }}>
                                        <span>Progress</span>
                                        <span>{student.progress}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${student.progress}%`, height: '100%', background: student.progress >= 100 ? '#10B981' : '#3B82F6' }}></div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 700 }}>Families</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>{student.familyCount}</span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 700 }}>Avg Grade</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>{student.avgGrade || '-'}</span>
                                    </div>
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
                            <div className="drawer-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>{activeStudent.full_name}</h2>
                                        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>{activeStudent.registration_number}</p>
                                    </div>
                                    <button onClick={() => setActiveStudent(null)} style={{ padding: '0.5rem', borderRadius: '50%', border: '1px solid #E2E8F0' }}><X size={20} /></button>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', width: '100%', borderBottom: '1px solid #E2E8F0' }}>
                                    <button
                                        onClick={() => setDrawerTab('reflections')}
                                        style={{ paddingBottom: '0.5rem', fontWeight: 600, color: drawerTab === 'reflections' ? '#0F766E' : '#64748B', borderBottom: drawerTab === 'reflections' ? '2px solid #0F766E' : 'none' }}
                                    >
                                        Reflections
                                    </button>
                                    <button
                                        onClick={() => setDrawerTab('profile')}
                                        style={{ paddingBottom: '0.5rem', fontWeight: 600, color: drawerTab === 'profile' ? '#0F766E' : '#64748B', borderBottom: drawerTab === 'profile' ? '2px solid #0F766E' : 'none' }}
                                    >
                                        Profile & Notes
                                    </button>
                                </div>
                            </div>

                            <div className="drawer-content">
                                {drawerTab === 'reflections' ? (
                                    <>
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
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Home size={18} /> Assigned Families
                                            </h3>
                                            {studentFamilies.length === 0 ? (
                                                <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>No families assigned.</p>
                                            ) : (
                                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                    {studentFamilies.map(fam => (
                                                        <div key={fam.id} style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '0.5rem', border: '1px solid #E2E8F0' }}>
                                                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{fam.head_name}</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{fam.village_name} • {fam.members_count || 0} Members</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Edit3 size={18} /> Private Notes
                                                </h3>
                                                <button
                                                    onClick={saveNotes}
                                                    disabled={notesSaving}
                                                    style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F766E', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                >
                                                    {notesSaving ? 'Saving...' : <><Save size={14} /> Save</>}
                                                </button>
                                            </div>
                                            <textarea
                                                value={studentNotes}
                                                onChange={e => setStudentNotes(e.target.value)}
                                                placeholder="Keep private notes about this student's progress here..."
                                                style={{ width: '100%', height: '150px', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', resize: 'none', fontFamily: 'inherit' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Grading Modal */}
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
                                <div style={{ maxHeight: '100px', overflowY: 'auto', background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: '#64748B', marginBottom: '1rem' }}>
                                    <strong>Content Context:</strong><br />
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
