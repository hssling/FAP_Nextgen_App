import React, { useState, useEffect } from 'react';
import {
    Users, BookOpen, CheckCircle, Download, Star,
    Search, Filter, LayoutGrid, List, ChevronRight,
    MoreVertical, Mail, Phone, Calendar, ArrowRight,
    TrendingUp, FileText, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const REFLECT_CRITERIA = [
    { id: 'score_exploration', label: '1. Spectrum of Exploration', desc: 'Breadth and depth of reflection', max: 2 },
    { id: 'score_voice', label: '2. Writer\'s Voice', desc: 'Authenticity and personal engagement', max: 2 },
    { id: 'score_description', label: '3. Description Quality', desc: 'Clarity of the issue or dilemma', max: 2 },
    { id: 'score_emotions', label: '4. Attention to Emotions', desc: 'Emotional intelligence and awareness', max: 2 },
    { id: 'score_analysis', label: '5. Critical Analysis', desc: 'Depth of analysis and connection to theory', max: 2 }
];

const TeacherDashboard = () => {
    const { profile } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

    // Selection State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [reflections, setReflections] = useState([]);
    const [studentFamilies, setStudentFamilies] = useState([]);

    // Grading State
    const [gradingReflectionId, setGradingReflectionId] = useState(null);
    const [gradingData, setGradingData] = useState({
        feedback: '',
        grade: '',
        scores: {
            score_exploration: 0,
            score_voice: 0,
            score_description: 0,
            score_emotions: 0,
            score_analysis: 0
        }
    });

    // Notes State
    const [generalNotes, setGeneralNotes] = useState('');
    const [notesMessage, setNotesMessage] = useState('');

    useEffect(() => {
        if (profile?.id) fetchMyStudents();
    }, [profile]);

    const fetchMyStudents = async () => {
        setLoading(true);
        try {
            const { data: mappings, error } = await supabase
                .from('teacher_student_mappings')
                .select(`
                    id, notes,
                    student:profiles!student_id (
                        id, full_name, registration_number, year, email, phone
                    )
                `)
                .eq('teacher_id', profile.id)
                .eq('is_active', true);

            if (error) throw error;

            const enhancedStudents = await Promise.all(mappings.map(async (m) => {
                const { count } = await supabase
                    .from('families')
                    .select('*', { count: 'exact', head: true })
                    .eq('student_id', m.student.id);

                const { count: refCount } = await supabase
                    .from('reflections')
                    .select('*', { count: 'exact', head: true })
                    .eq('student_id', m.student.id);

                return {
                    mappingId: m.id,
                    ...m.student,
                    notes: m.notes,
                    familyCount: count || 0,
                    reflectionCount: refCount || 0
                };
            }));

            setStudents(enhancedStudents);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateFeedback = async () => {
        if (!selectedStudent) return;
        try {
            const { error } = await supabase
                .from('teacher_student_mappings')
                .update({ notes: generalNotes })
                .eq('id', selectedStudent.mappingId);

            if (error) throw error;
            setNotesMessage('Notes updated!');
            setStudents(students.map(s => s.id === selectedStudent.id ? { ...s, notes: generalNotes } : s));
            setTimeout(() => setNotesMessage(''), 3000);
        } catch (error) {
            console.error("Update error:", error);
            setNotesMessage('Failed to update.');
        }
    };

    const loadStudentDetails = async (student) => {
        setSelectedStudent(student);
        setGeneralNotes(student.notes || '');

        // Fetch Reflections
        const { data: refs } = await supabase
            .from('reflections')
            .select('*')
            .eq('student_id', student.id)
            .order('created_at', { ascending: false });
        setReflections(refs || []);

        // Fetch Families
        const { data: fams } = await supabase
            .from('families')
            .select('*')
            .eq('student_id', student.id);
        setStudentFamilies(fams || []);
    };

    const calculateTotalScore = (scores) => Object.values(scores).reduce((a, b) => a + parseInt(b || 0), 0);

    const mapScoreToGrade = (totalScore) => {
        if (totalScore >= 9) return 'A';
        if (totalScore >= 7) return 'B+';
        if (totalScore >= 5) return 'B';
        if (totalScore >= 3) return 'C';
        return 'D';
    };

    const handleScoreChange = (criterionId, value) => {
        const newScores = { ...gradingData.scores, [criterionId]: parseInt(value) };
        const total = calculateTotalScore(newScores);
        setGradingData({
            ...gradingData,
            scores: newScores,
            grade: mapScoreToGrade(total)
        });
    };

    const handleGradeReflection = async (reflectionId) => {
        try {
            const { error } = await supabase
                .from('reflections')
                .update({
                    teacher_feedback: gradingData.feedback,
                    grade: gradingData.grade,
                    status: 'Graded',
                    ...gradingData.scores,
                    graded_at: new Date().toISOString()
                })
                .eq('id', reflectionId);

            if (error) throw error;

            // Update local state
            setReflections(reflections.map(r =>
                r.id === reflectionId ? {
                    ...r,
                    ...gradingData.scores,
                    grade: gradingData.grade,
                    teacher_feedback: gradingData.feedback,
                    status: 'Graded'
                } : r
            ));

            setGradingReflectionId(null);
        } catch (error) {
            console.error("Grading error:", error);
            alert("Failed to save assessment.");
        }
    };

    const startGrading = (ref) => {
        setGradingReflectionId(ref.id);
        setGradingData({
            feedback: ref.teacher_feedback || '',
            grade: ref.grade || '',
            scores: {
                score_exploration: ref.score_exploration || 0,
                score_voice: ref.score_voice || 0,
                score_description: ref.score_description || 0,
                score_emotions: ref.score_emotions || 0,
                score_analysis: ref.score_analysis || 0
            }
        });
    };

    // Filter Students
    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.registration_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            {/* Header Background */}
            <div className="bg-slate-900 text-white pb-24 pt-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Mentor Dashboard</h1>
                        <p className="text-slate-400 mt-1">Manage assessments and track student progress.</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
                {!selectedStudent ? (
                    // DASHBOARD OVERVIEW MODE
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        {/* Stats & Filters */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <div className="relative w-full sm:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search students..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-sm"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={18} /></button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><List size={18} /></button>
                            </div>
                        </div>

                        {/* Student List/Grid */}
                        {viewMode === 'grid' ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredStudents.map((student, idx) => (
                                    <motion.div
                                        key={student.id}
                                        layoutId={`student-${student.id}`}
                                        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all p-6 cursor-pointer group"
                                        onClick={() => loadStudentDetails(student)}
                                        whileHover={{ y: -4 }}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                                {student.full_name.charAt(0)}
                                            </div>
                                            <span className="bg-slate-50 text-slate-500 text-xs px-2 py-1 rounded-md border border-slate-100 font-mono">
                                                {student.registration_number}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-blue-600 transition-colors">{student.full_name}</h3>
                                        <p className="text-sm text-slate-500 mb-6 flex items-center gap-1"><Mail size={12} /> {student.email}</p>

                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                                                <div className="text-2xl font-bold text-slate-800">{student.familyCount}</div>
                                                <div className="text-xs uppercase text-slate-500 font-bold">Families</div>
                                            </div>
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                                                <div className="text-2xl font-bold text-blue-600">{student.reflectionCount}</div>
                                                <div className="text-xs uppercase text-blue-500 font-bold">Reflections</div>
                                            </div>
                                        </div>

                                        <button className="w-full py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                                            Review Progress <ArrowRight size={16} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                {filteredStudents.map(student => (
                                    <div
                                        key={student.id}
                                        className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
                                        onClick={() => loadStudentDetails(student)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">{student.full_name.charAt(0)}</div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{student.full_name}</h4>
                                                <div className="text-xs text-slate-500">{student.registration_number} • {student.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right hidden sm:block">
                                                <div className="text-sm font-bold text-slate-800">{student.reflectionCount} Reflections</div>
                                                <div className="text-xs text-slate-400">Values</div>
                                            </div>
                                            <ChevronRight className="text-slate-300" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {filteredStudents.length === 0 && (
                            <div className="text-center py-12 text-slate-400">No students found matching your search.</div>
                        )}
                    </motion.div>
                ) : (
                    // STUDENT DETAIL MODE
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="pb-20">
                        <button
                            onClick={() => setSelectedStudent(null)}
                            className="bg-white/80 backdrop-blur text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold mb-6 flex items-center gap-2 hover:bg-white shadow-sm transition-all"
                        >
                            <ChevronLeft size={16} /> Back to Student List
                        </button>

                        <div className="grid lg:grid-cols-3 gap-6">
                            {/* Left Column: Student Profile & Notes */}
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex flex-col items-center text-center mb-6">
                                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400 mb-3">
                                            {selectedStudent.full_name.charAt(0)}
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900">{selectedStudent.full_name}</h2>
                                        <p className="text-slate-500 text-sm">{selectedStudent.registration_number}</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Families Linked</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedStudent.familyCount}</span>
                                        </div>
                                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Reflections</span>
                                            <span className="text-sm font-bold text-slate-800">{reflections.length}</span>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100">
                                            <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Attached Families</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {studentFamilies.map(f => (
                                                    <span key={f.id} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">
                                                        {f.head_name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-slate-800 text-sm">Targeted Mentoring Notes</h3>
                                        {notesMessage && <span className="text-xs text-green-600 font-bold animate-pulse">{notesMessage}</span>}
                                    </div>
                                    <textarea
                                        className="w-full h-32 p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                                        placeholder="Private notes about this student's progress and needs..."
                                        value={generalNotes}
                                        onChange={e => setGeneralNotes(e.target.value)}
                                    />
                                    <button
                                        onClick={handleUpdateFeedback}
                                        className="mt-2 w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                                    >
                                        Save Notes
                                    </button>
                                </div>
                            </div>

                            {/* Middle & Right: Grading Workflow */}
                            <div className="lg:col-span-2 space-y-6">
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                    <FileText size={20} className="text-blue-500" /> Reflection Journal
                                </h3>

                                {reflections.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-slate-400">No reflections submitted yet.</p>
                                    </div>
                                ) : (
                                    reflections.map(ref => (
                                        <div key={ref.id} className={`bg-white rounded-2xl shadow-sm border transition-all overflow-hidden ${gradingReflectionId === ref.id ? 'ring-2 ring-blue-500 border-blue-500 shadow-xl' : 'border-slate-200'}`}>
                                            {/* Header */}
                                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                                <div className="flex items-center gap-3">
                                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${ref.status === 'Graded' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        {ref.status === 'Graded' ? <CheckCircle size={16} /> : <TrendingUp size={16} />}
                                                    </span>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">{new Date(ref.created_at).toLocaleDateString()}</div>
                                                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{ref.phase} • {ref.reflection_type}</div>
                                                    </div>
                                                </div>

                                                {ref.status === 'Graded' && gradingReflectionId !== ref.id && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl font-bold text-slate-800">{ref.grade}</span>
                                                        <span className="text-xs text-slate-400">({ref.total_score}/10)</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                                                {/* Left: Content Viewer */}
                                                <div className="p-6">
                                                    {ref.file_url ? (
                                                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-white p-2 rounded-lg text-blue-500"><Download /></div>
                                                                <div>
                                                                    <div className="font-bold text-blue-900 text-sm">{ref.file_name}</div>
                                                                    <div className="text-xs text-blue-700">{(ref.file_size / 1024 / 1024).toFixed(2)} MB</div>
                                                                </div>
                                                            </div>
                                                            <a href={ref.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary text-xs">Download</a>
                                                        </div>
                                                    ) : ref.gibbs_description ? (
                                                        <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                                                            {ref.gibbs_description && <div className="pl-3 border-l-2 border-blue-200"><strong className="block text-blue-600 text-xs uppercase mb-1">Description</strong>{ref.gibbs_description}</div>}
                                                            {ref.gibbs_feelings && <div className="pl-3 border-l-2 border-purple-200"><strong className="block text-purple-600 text-xs uppercase mb-1">Feelings</strong>{ref.gibbs_feelings}</div>}
                                                            {ref.gibbs_analysis && <div className="pl-3 border-l-2 border-green-200"><strong className="block text-green-600 text-xs uppercase mb-1">Analysis</strong>{ref.gibbs_analysis}</div>}
                                                            {ref.gibbs_action_plan && <div className="pl-3 border-l-2 border-red-200"><strong className="block text-red-600 text-xs uppercase mb-1">Action</strong>{ref.gibbs_action_plan}</div>}
                                                            {/* Show truncated others if needed */}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{ref.content}</p>
                                                    )}
                                                </div>

                                                {/* Right: Grading Pane */}
                                                <div className="bg-slate-50/30 p-6">
                                                    {gradingReflectionId === ref.id ? (
                                                        <div className="animate-in slide-in-from-right-2 duration-300">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Assessment Rubric</h4>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-2xl font-bold text-blue-600">{calculateTotalScore(gradingData.scores)}</span>
                                                                    <span className="text-slate-400 text-sm">/10</span>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3 mb-6">
                                                                {REFLECT_CRITERIA.map(crit => (
                                                                    <div key={crit.id} className="group">
                                                                        <div className="flex justify-between text-xs mb-1">
                                                                            <span className="font-semibold text-slate-600">{crit.label}</span>
                                                                            <span className="font-mono text-slate-400">{gradingData.scores[crit.id]}/2</span>
                                                                        </div>
                                                                        <div className="flex gap-1">
                                                                            {[0, 1, 2].map(score => (
                                                                                <button
                                                                                    key={score}
                                                                                    onClick={() => handleScoreChange(crit.id, score)}
                                                                                    className={`h-2 flex-1 rounded-full transition-all ${gradingData.scores[crit.id] >= score
                                                                                            ? (score === 2 ? 'bg-emerald-400' : score === 1 ? 'bg-blue-400' : 'bg-slate-300')
                                                                                            : 'bg-slate-200 hover:bg-slate-300'
                                                                                        }`}
                                                                                    title={`${score} points`}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Feedback</label>
                                                                    <textarea
                                                                        className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                                                        rows={3}
                                                                        placeholder="Specific, constructive feedback..."
                                                                        value={gradingData.feedback}
                                                                        onChange={e => setGradingData({ ...gradingData, feedback: e.target.value })}
                                                                    />
                                                                </div>
                                                                <div className="flex gap-2 justify-end">
                                                                    <button onClick={() => setGradingReflectionId(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                                                                    <button onClick={() => handleGradeReflection(ref.id)} className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                                                                        Save Assessment
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                                            {ref.status === 'Graded' ? (
                                                                <div className="opacity-60 hover:opacity-100 transition-opacity">
                                                                    <div className="text-sm font-bold text-slate-800 mb-1">Grade: {ref.grade}</div>
                                                                    <button onClick={() => startGrading(ref)} className="text-blue-600 text-xs font-bold hover:underline">Edit Score</button>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <button onClick={() => startGrading(ref)} className="bg-white border border-slate-200 text-slate-700 shadow-sm px-6 py-3 rounded-xl font-bold text-sm hover:border-blue-400 hover:text-blue-600 hover:shadow-md transition-all flex items-center gap-2">
                                                                        <Star size={16} /> Grade This Entry
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default TeacherDashboard;
