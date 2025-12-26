import React, { useState, useEffect } from 'react';
import { Users, BookOpen, CheckCircle, TrendingUp, Search } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const TeacherDashboard = () => {
    const { profile } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (profile?.id) {
            fetchMyStudents();
        }
    }, [profile]);

    const fetchMyStudents = async () => {
        setLoading(true);
        try {
            // 1. Get mappings
            const { data: mappings, error } = await supabase
                .from('teacher_student_mappings')
                .select(`
                    id,
                    notes,
                    student:profiles!student_id (
                        id, full_name, registration_number, year, email, phone
                    )
                `)
                .eq('teacher_id', profile.id)
                .eq('is_active', true);

            if (error) throw error;

            // 2. Enhance with Stats (Family Count) by querying families table
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

            setMessage('Feedback updated successfully!');
            // Update local state
            setStudents(students.map(s => s.id === selectedStudent.id ? { ...s, notes: feedback } : s));
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Update error:", error);
            setMessage('Failed to update feedback.');
        }
    };

    const openReview = (student) => {
        setSelectedStudent(student);
        setFeedback(student.notes || '');
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading your mentees...</div>;

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">Mentor Dashboard</h1>
                <p className="page-subtitle">Track progress and guide your assigned students ({students.length})</p>
            </header>

            {!selectedStudent ? (
                // List View
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {students.length === 0 ? (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p>You have not been assigned any students yet.</p>
                            <p style={{ fontSize: '0.875rem' }}>Please contact the administrator.</p>
                        </div>
                    ) : (
                        <div className="card" style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Student Name</th>
                                        <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Year / Reg No</th>
                                        <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Families Adopted</th>
                                        <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Status / Remarks</th>
                                        <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(s => (
                                        <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '1rem', fontWeight: '600' }}>
                                                {s.full_name}
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>{s.email}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                Year {s.year} <br />
                                                <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{s.registration_number}</span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    background: s.familyCount >= 3 ? '#DCFCE7' : '#FEF3C7',
                                                    color: s.familyCount >= 3 ? '#166534' : '#D97706',
                                                    borderRadius: '99px',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {s.familyCount} / 3
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {s.notes || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No remarks</span>}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ fontSize: '0.875rem' }}
                                                    onClick={() => openReview(s)}
                                                >
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                // Detailed Review View
                <div>
                    <button
                        onClick={() => setSelectedStudent(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', marginBottom: '1rem', fontWeight: '500' }}
                    >
                        ← Back to Student List
                    </button>

                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Reviewing: {selectedStudent.full_name}</h2>
                            <p style={{ color: 'var(--color-text-muted)' }}>Reg No: {selectedStudent.registration_number}</p>
                        </div>
                    </div>

                    <div className="grid-layout grid-2">
                        {/* Student Progress */}
                        <div className="card" style={{ padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Progress Snapshot</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ padding: '1rem', background: '#F0FDFA', borderRadius: '8px', border: '1px solid #CCFBF1' }}>
                                    <div style={{ color: '#0F766E', fontSize: '0.875rem' }}>Families Adopted</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#115E59' }}>{selectedStudent.familyCount}</div>
                                </div>
                                <div style={{ padding: '1rem', background: '#F0F9FF', borderRadius: '8px', border: '1px solid #E0F2FE' }}>
                                    <div style={{ color: '#0369A1', fontSize: '0.875rem' }}>Year</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#075985' }}>{selectedStudent.year}</div>
                                </div>
                            </div>

                            <div style={{ padding: '1rem', background: '#FFFBEB', borderRadius: '8px', border: '1px solid #FEF3C7' }}>
                                <p style={{ fontWeight: '600', color: '#92400E', marginBottom: '0.5rem' }}>Goal Status</p>
                                <p style={{ fontSize: '0.9rem', color: '#B45309' }}>
                                    {selectedStudent.familyCount >= 3
                                        ? "✅ Student has met the target of adopting 3 families."
                                        : `⚠️ Student needs to adopt ${3 - selectedStudent.familyCount} more families.`}
                                </p>
                            </div>
                        </div>

                        {/* Feedback Form */}
                        <div className="card" style={{ padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Assessment & Feedback</h3>

                            {message && (
                                <div style={{ padding: '0.75rem', background: '#DCFCE7', color: '#166534', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                    {message}
                                </div>
                            )}

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Mentor Remarks / Grade</label>
                                <textarea
                                    rows={6}
                                    className="input"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                                    placeholder="Enter your assessment, grade, and feedback for the student here..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                ></textarea>
                                <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.5rem' }}>
                                    This feedback will be visible to the student in their Logbook Report.
                                </p>
                            </div>

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                                onClick={handleUpdateFeedback}
                            >
                                Save Feedback
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
