import React, { useState, useEffect } from 'react';
import { Users, BookOpen, CheckCircle, Download, Star } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const REFLECT_CRITERIA = [
    { id: 'score_exploration', label: '1. Spectrum of Exploration', desc: 'Breadth and depth of reflection' },
    { id: 'score_voice', label: '2. Writer\'s Voice', desc: 'Authenticity and personal engagement' },
    { id: 'score_description', label: '3. Description Quality', desc: 'Clarity of the issue or dilemma' },
    { id: 'score_emotions', label: '4. Attention to Emotions', desc: 'Emotional intelligence and awareness' },
    { id: 'score_analysis', label: '5. Critical Analysis', desc: 'Depth of analysis and connection to theory' }
];

const TeacherDashboard = () => {
    const { profile } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [message, setMessage] = useState('');
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

    useEffect(() => {
        if (profile?.id) {
            fetchMyStudents();
        }
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

                return {
                    mappingId: m.id,
                    ...m.student,
                    notes: m.notes,
                    familyCount: count || 0
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
                .update({ notes: feedback })
                .eq('id', selectedStudent.mappingId);

            if (error) throw error;
            setMessage('General notes updated successfully!');
            setStudents(students.map(s => s.id === selectedStudent.id ? { ...s, notes: feedback } : s));
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Update error:", error);
            setMessage('Failed to update notes.');
        }
    };

    const fetchReflections = async (studentId) => {
        const { data } = await supabase
            .from('reflections')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });
        setReflections(data || []);
    };

    const fetchStudentFamilies = async (studentId) => {
        const { data } = await supabase
            .from('families')
            .select('*')
            .eq('student_id', studentId);
        setStudentFamilies(data || []);
    };

    const calculateTotalScore = (scores) => {
        return Object.values(scores).reduce((a, b) => a + parseInt(b || 0), 0);
    };

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
            grade: mapScoreToGrade(total) // Auto-suggest grade
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

            fetchReflections(selectedStudent.id);
            setGradingReflectionId(null);
            setGradingData({ feedback: '', grade: '', scores: { score_exploration: 0, score_voice: 0, score_description: 0, score_emotions: 0, score_analysis: 0 } });
        } catch (error) {
            console.error("Grading error:", error);
            alert("Failed to save grade.");
        }
    };

    const openReview = (student) => {
        setSelectedStudent(student);
        setFeedback(student.notes || '');
        fetchReflections(student.id);
        fetchStudentFamilies(student.id);
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

    if (loading) return <div style={{ padding: '2rem' }}>Loading your mentees...</div>;

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">Mentor Dashboard</h1>
                <p className="page-subtitle">Track progress and assess student reflections</p>
            </header>

            {!selectedStudent ? (
                // LIST VIEW
                <div className="card overflow-x-auto">
                    <table className="w-full text-left min-w-[600px] border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                                <th className="p-4">Student Name</th>
                                <th className="p-4">Reg No</th>
                                <th className="p-4">Families</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-400">No students assigned.</td></tr>
                            ) : students.map(s => (
                                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-gray-800">
                                        {s.full_name}
                                        <div className="text-xs text-gray-500 font-normal">{s.email}</div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">{s.registration_number}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.familyCount >= 3 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {s.familyCount} / 3
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500 truncate max-w-[200px]">{s.notes || '-'}</td>
                                    <td className="p-4">
                                        <button onClick={() => openReview(s)} className="btn btn-primary sm btn-outline">Review</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                // DETAIL/REVIEW VIEW
                <div>
                    <button onClick={() => setSelectedStudent(null)} className="text-blue-600 mb-4 flex items-center gap-1 font-medium hover:underline">
                        ← Back to List
                    </button>

                    {message && (
                        <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg flex items-center gap-2 text-sm">
                            <CheckCircle size={16} /> {message}
                        </div>
                    )}

                    <div className="grid lg:grid-cols-3 gap-6 mb-8">
                        {/* Student Info Card */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedStudent.full_name}</h2>
                                    <p className="text-gray-500 mb-4">Registration: {selectedStudent.registration_number} • Year {selectedStudent.year}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 mb-6">
                                <div className="bg-gray-50 px-4 py-2 rounded-lg border">
                                    <div className="text-xs text-gray-500 uppercase">Allocated Families</div>
                                    <div className="text-xl font-bold text-gray-800">{selectedStudent.familyCount}</div>
                                </div>
                                <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                                    <div className="text-xs text-blue-500 uppercase">Reflections</div>
                                    <div className="text-xl font-bold text-blue-600">{reflections.length}</div>
                                </div>
                            </div>

                            {/* Adopted Families List */}
                            <h3 className="text-sm font-bold text-gray-700 mb-2">Adopted Families</h3>
                            <div className="flex flex-wrap gap-2">
                                {studentFamilies.length > 0 ? studentFamilies.map(f => (
                                    <span key={f.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded border">
                                        {f.head_name} ({f.village || 'No Village'})
                                    </span>
                                )) : <span className="text-xs text-gray-400 italic">No families details added yet</span>}
                            </div>
                        </div>

                        {/* General Notes Card */}
                        <div className="bg-white p-6 rounded-xl border shadow-sm h-full flex flex-col">
                            <h3 className="text-sm font-bold text-gray-700 mb-3">General Mentor Notes</h3>
                            <textarea
                                className="w-full flex-1 p-3 text-sm border rounded-lg mb-2 resize-none bg-gray-50"
                                placeholder="Add general notes about this student's progress..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                            />
                            <button onClick={handleUpdateFeedback} className="btn btn-outline sm w-full">Update Notes</button>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><BookOpen size={20} /> Reflection Journal Assessment</h3>

                    <div className="space-y-6">
                        {reflections.length === 0 ? (
                            <p className="text-gray-400 italic">No reflections submitted yet.</p>
                        ) : reflections.map(ref => (
                            <div key={ref.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Reflection Header */}
                                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold uppercase">{ref.phase}</span>
                                        <span className="text-sm text-gray-500">{new Date(ref.created_at).toLocaleDateString()}</span>
                                        {ref.file_url && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded flex items-center gap-1"><Download size={12} /> File Attached</span>}
                                    </div>
                                    <div>
                                        {ref.status === 'Graded' ? (
                                            <span className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-bold border border-green-200">
                                                <CheckCircle size={14} /> Grade: {ref.grade} ({ref.total_score || 0}/10)
                                            </span>
                                        ) : (
                                            <span className="text-amber-500 bg-amber-50 px-3 py-1 rounded-full text-sm font-bold border border-amber-200">Pending Review</span>
                                        )}
                                    </div>
                                </div>

                                {/* Content Grid (Content Left, Rubric Right if grading) */}
                                <div className={`grid ${gradingReflectionId === ref.id ? 'lg:grid-cols-2' : 'grid-cols-1'} divide-y lg:divide-y-0 lg:divide-x divide-gray-100`}>

                                    {/* Left: Student Content */}
                                    <div className="p-6">
                                        {/* Structured Content (Gibbs) */}
                                        {ref.gibbs_description ? (
                                            <div className="space-y-4">
                                                {ref.gibbs_description && <div><h4 className="text-xs font-bold uppercase text-blue-600 mb-1">Description</h4><p className="text-sm text-gray-800 whitespace-pre-wrap">{ref.gibbs_description}</p></div>}
                                                {ref.gibbs_feelings && <div><h4 className="text-xs font-bold uppercase text-purple-600 mb-1">Feelings</h4><p className="text-sm text-gray-800 whitespace-pre-wrap">{ref.gibbs_feelings}</p></div>}
                                                {ref.gibbs_evaluation && <div><h4 className="text-xs font-bold uppercase text-orange-600 mb-1">Evaluation</h4><p className="text-sm text-gray-800 whitespace-pre-wrap">{ref.gibbs_evaluation}</p></div>}
                                                {ref.gibbs_analysis && <div><h4 className="text-xs font-bold uppercase text-green-600 mb-1">Analysis</h4><p className="text-sm text-gray-800 whitespace-pre-wrap">{ref.gibbs_analysis}</p></div>}
                                                {ref.gibbs_conclusion && <div><h4 className="text-xs font-bold uppercase text-yellow-600 mb-1">Conclusion</h4><p className="text-sm text-gray-800 whitespace-pre-wrap">{ref.gibbs_conclusion}</p></div>}
                                                {ref.gibbs_action_plan && <div><h4 className="text-xs font-bold uppercase text-red-600 mb-1">Action Plan</h4><p className="text-sm text-gray-800 whitespace-pre-wrap">{ref.gibbs_action_plan}</p></div>}
                                            </div>
                                        ) : (
                                            // Legacy Content
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{ref.content}</p>
                                        )}

                                        {/* File Attachment */}
                                        {ref.file_url && (
                                            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-lg border flex items-center justify-center text-blue-500"><Download /></div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-gray-700">{ref.file_name}</div>
                                                        <div className="text-xs text-gray-500">{(ref.file_size / 1024 / 1024).toFixed(2)} MB</div>
                                                    </div>
                                                </div>
                                                <a href={ref.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline text-xs">Download / View</a>
                                            </div>
                                        )}

                                        {!gradingReflectionId && ref.teacher_feedback && (
                                            <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-lg">
                                                <h5 className="text-sm font-bold text-green-800 mb-1">Your Feedback:</h5>
                                                <p className="text-sm text-green-700">{ref.teacher_feedback}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Assessment Panel */}
                                    <div className="p-6 bg-gray-50/50">
                                        {gradingReflectionId === ref.id ? (
                                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-gray-700">REFLECT Rubric Assessment</h4>
                                                    <span className="text-2xl font-bold text-blue-600 bg-white px-3 py-1 rounded shadow-sm">
                                                        {calculateTotalScore(gradingData.scores)}<span className="text-sm text-gray-400 font-normal">/10</span>
                                                    </span>
                                                </div>

                                                <div className="space-y-4 mb-6">
                                                    {REFLECT_CRITERIA.map(crit => (
                                                        <div key={crit.id} className="bg-white p-3 rounded border border-gray-200">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <label className="text-sm font-semibold text-gray-700">{crit.label}</label>
                                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                                    {gradingData.scores[crit.id]} pts
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mb-2">{crit.desc}</p>
                                                            <div className="flex gap-1">
                                                                {[0, 1, 2].map(score => (
                                                                    <button
                                                                        key={score}
                                                                        onClick={() => handleScoreChange(crit.id, score)}
                                                                        className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${gradingData.scores[crit.id] === score
                                                                                ? 'bg-blue-600 text-white shadow-sm'
                                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                            }`}
                                                                    >
                                                                        {score}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mb-4">
                                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Calculated Grade</label>
                                                    <select
                                                        className="w-full p-2 border rounded bg-white text-sm"
                                                        value={gradingData.grade}
                                                        onChange={e => setGradingData({ ...gradingData, grade: e.target.value })}
                                                    >
                                                        <option value="A">A (Excellent - 9-10 pts)</option>
                                                        <option value="B+">B+ (Very Good - 7-8 pts)</option>
                                                        <option value="B">B (Good - 5-6 pts)</option>
                                                        <option value="C">C (Satisfactory - 3-4 pts)</option>
                                                        <option value="D">D (Needs Improvement - 0-2 pts)</option>
                                                    </select>
                                                </div>

                                                <div className="mb-4">
                                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Qualitative Feedback</label>
                                                    <textarea
                                                        className="w-full p-3 border rounded text-sm min-h-[100px]"
                                                        placeholder="Provide specific, constructive feedback..."
                                                        value={gradingData.feedback}
                                                        onChange={e => setGradingData({ ...gradingData, feedback: e.target.value })}
                                                    />
                                                </div>

                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => setGradingReflectionId(null)} className="btn btn-outline text-sm">Cancel</button>
                                                    <button onClick={() => handleGradeReflection(ref.id)} className="btn btn-primary text-sm shadow-md shadow-blue-200">Save Assessment</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col justify-center items-center text-center p-4">
                                                {ref.status === 'Graded' ? (
                                                    <div>
                                                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                                            <CheckCircle size={24} />
                                                        </div>
                                                        <h4 className="font-bold text-gray-800">Assessed</h4>
                                                        <p className="text-sm text-gray-500 mb-4">Grade: {ref.grade}</p>
                                                        <button onClick={() => startGrading(ref)} className="text-blue-600 text-sm font-medium hover:underline">Edit Assessment</button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                                            <Star size={24} />
                                                        </div>
                                                        <h4 className="font-bold text-gray-800">Ready to Grade</h4>
                                                        <p className="text-sm text-gray-500 mb-4">Review content and verify with rubric.</p>
                                                        <button onClick={() => startGrading(ref)} className="btn btn-primary sm w-full">Start Assessment</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
