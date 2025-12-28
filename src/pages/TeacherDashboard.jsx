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

const REFLECT_CRITERIA = [
    { id: 'score_exploration', label: 'Exploration', desc: 'Breadth/depth', max: 2, color: 'bg-blue-500' },
    { id: 'score_voice', label: 'Voice', desc: 'Authenticity', max: 2, color: 'bg-purple-500' },
    { id: 'score_description', label: 'Description', desc: 'Clarity', max: 2, color: 'bg-pink-500' },
    { id: 'score_emotions', label: 'Emotions', desc: 'Awareness', max: 2, color: 'bg-orange-500' },
    { id: 'score_analysis', label: 'Analysis', desc: 'Critical thought', max: 2, color: 'bg-emerald-500' }
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
    const [gradingTarget, setGradingTarget] = useState(null); // The reflection being graded
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

        // Update local
        setStudentReflections(prev => prev.map(r => r.id === gradingTarget.id ? { ...r, ...scores, teacher_feedback: gradeFeedback, grade, total_score: total, status: 'Graded' } : r));
        setGradingTarget(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 text-white p-2 rounded-lg"><GraduationCap size={20} /></div>
                        <h1 className="font-bold text-lg tracking-tight">Mentor Workspace</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text" placeholder="Search students..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm font-medium focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {loading ? <div className="text-center py-20 text-slate-400">Loading your classroom...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {students.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => (
                            <motion.div
                                key={student.id}
                                layoutId={`card-${student.id}`}
                                onClick={() => openStudent(student)}
                                className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        {student.full_name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-bold bg-slate-50 px-2 py-1 rounded text-slate-500">{student.reflectionCount} Entries</span>
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 mb-1">{student.full_name}</h3>
                                <p className="text-sm text-slate-500 font-medium mb-6">{student.registration_number}</p>
                                <div className="flex items-center text-blue-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                    View Portfolio <ArrowRight size={16} className="ml-1" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Student Drawer (Slide Over) */}
            <AnimatePresence>
                {activeStudent && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setActiveStudent(null)}
                            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
                        >
                            {/* Drawer Header */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{activeStudent.full_name}</h2>
                                    <p className="text-slate-500 text-sm font-medium">{activeStudent.registration_number}</p>
                                </div>
                                <button onClick={() => setActiveStudent(null)} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 outline-none"><X size={20} /></button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                                {studentReflections.length === 0 ? (
                                    <div className="text-center py-20 text-slate-400">No reflections submitted yet.</div>
                                ) : (
                                    studentReflections.map(ref => (
                                        <div key={ref.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                            <div className="p-5">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">{new Date(ref.created_at).toLocaleDateString()}</span>
                                                        <h4 className="font-bold text-slate-900 text-lg leading-tight">
                                                            {ref.gibbs_description ? "Reflection: " + ref.gibbs_description.substring(0, 30) + "..." : ref.file_name || "Journal Entry"}
                                                        </h4>
                                                    </div>
                                                    {ref.status === 'Graded' ? (
                                                        <div className="flex flex-col items-center bg-emerald-50 px-3 py-1 rounded-lg">
                                                            <span className="text-xl font-bold text-emerald-600">{ref.grade}</span>
                                                            <span className="text-[10px] font-bold text-emerald-400 uppercase">Graded</span>
                                                        </div>
                                                    ) : (
                                                        <span className="bg-amber-50 text-amber-600 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                            <Clock size={12} /> Pending
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-3">
                                                    {ref.gibbs_analysis || ref.content || "No preview available."}
                                                </div>

                                                <button
                                                    onClick={() => startGrading(ref)}
                                                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm rounded-lg transition-colors border border-slate-100 flex items-center justify-center gap-2"
                                                >
                                                    {ref.status === 'Graded' ? 'Edit Assessment' : 'Start Assessment'} <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
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
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-lg text-slate-800">Assess Reflection</h3>
                                <button onClick={() => setGradingTarget(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Score Sliders */}
                                <div className="space-y-4">
                                    {REFLECT_CRITERIA.map(crit => (
                                        <div key={crit.id} className="flex items-center gap-4">
                                            <div className="w-24 text-xs font-bold text-slate-600">{crit.label}</div>
                                            <div className="flex-1 flex gap-1 h-8">
                                                {[0, 1, 2].map(val => (
                                                    <button
                                                        key={val}
                                                        onClick={() => setScores({ ...scores, [crit.id]: val })}
                                                        className={`flex-1 rounded-md text-xs font-bold transition-all ${scores[crit.id] >= val ? 'bg-blue-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}
                                                    >
                                                        {val}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                                        rows={3}
                                        placeholder="Constructive feedback..."
                                        value={gradeFeedback}
                                        onChange={e => setGradeFeedback(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-3 mt-4">
                                        <button onClick={saveGrade} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:shadow-lg hover:scale-105 transition-all">
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
