import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserPlus, Search, Trash2, CheckCircle, XCircle, GraduationCap, BookOpen, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const TeacherStudentAssignment = () => {
    const { profile } = useAuth();
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [mappings, setMappings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Load all data
    const loadData = async () => {
        try {
            setLoading(true);

            // Load students
            const { data: studentsData, error: studentsError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'student')
                .eq('is_active', true)
                .order('full_name');

            if (studentsError) throw studentsError;
            setStudents(studentsData || []);

            // Load teachers
            const { data: teachersData, error: teachersError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'teacher')
                .eq('is_active', true)
                .order('full_name');

            if (teachersError) throw teachersError;
            setTeachers(teachersData || []);

            // Load mappings
            const { data: mappingsData, error: mappingsError } = await supabase
                .from('teacher_student_mappings')
                .select(`
          *,
          teacher:profiles!teacher_id(id, username, full_name, department),
          student:profiles!student_id(id, username, full_name, year, registration_number)
        `)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (mappingsError) throw mappingsError;
            setMappings(mappingsData || []);

        } catch (error) {
            console.error('Error loading data:', error);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Assign student to teacher
    const handleAssign = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!selectedStudent || !selectedTeacher) {
            setError('Please select both student and teacher');
            return;
        }

        try {
            // Check if mapping already exists
            const existing = mappings.find(
                m => m.student_id === selectedStudent && m.teacher_id === selectedTeacher
            );

            if (existing) {
                setError('This student is already assigned to this teacher');
                return;
            }

            const { error: insertError } = await supabase
                .from('teacher_student_mappings')
                .insert([{
                    teacher_id: selectedTeacher,
                    student_id: selectedStudent,
                    assigned_by: profile.id,
                    is_active: true,
                    notes: notes || null
                }]);

            if (insertError) throw insertError;

            setSuccess('Student assigned successfully!');
            setSelectedStudent('');
            setSelectedTeacher('');
            setNotes('');
            loadData();

            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Error assigning student:', error);
            setError('Failed to assign student');
        }
    };

    // Remove assignment
    const handleRemove = async (mappingId) => {
        if (!confirm('Are you sure you want to remove this assignment?')) return;

        try {
            const { error } = await supabase
                .from('teacher_student_mappings')
                .update({ is_active: false })
                .eq('id', mappingId);

            if (error) throw error;

            setSuccess('Assignment removed successfully!');
            loadData();

            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Error removing assignment:', error);
            setError('Failed to remove assignment');
        }
    };

    // Get students for a teacher
    const getStudentsForTeacher = (teacherId) => {
        return mappings.filter(m => m.teacher_id === teacherId);
    };

    // Get teacher for a student
    const getTeacherForStudent = (studentId) => {
        return mappings.find(m => m.student_id === studentId);
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                Teacher-Student Assignments
            </h2>

            {/* Success/Error Messages */}
            {success && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: '#D1FAE5',
                    border: '1px solid #10B981',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    color: '#065F46'
                }}>
                    {success}
                </div>
            )}

            {error && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #EF4444',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    color: '#DC2626'
                }}>
                    {error}
                </div>
            )}

            {/* Assignment Form */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Assign Student to Teacher
                </h3>

                <form onSubmit={handleAssign}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        {/* Select Student */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                                Select Student *
                            </label>
                            <select
                                value={selectedStudent}
                                onChange={(e) => setSelectedStudent(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <option value="">Choose a student...</option>
                                {students.map(student => {
                                    const assigned = getTeacherForStudent(student.id);
                                    return (
                                        <option key={student.id} value={student.id}>
                                            {student.full_name} (Year {student.year}) {assigned ? '✓ Assigned' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Select Teacher */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                                Select Teacher *
                            </label>
                            <select
                                value={selectedTeacher}
                                onChange={(e) => setSelectedTeacher(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <option value="">Choose a teacher...</option>
                                {teachers.map(teacher => {
                                    const studentCount = getStudentsForTeacher(teacher.id).length;
                                    return (
                                        <option key={teacher.id} value={teacher.id}>
                                            {teacher.full_name} ({teacher.department}) - {studentCount} students
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                            Notes (Optional)
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g., Year 1 mentorship"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #D1D5DB',
                                borderRadius: '8px',
                                fontSize: '0.95rem'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <UserPlus size={18} />
                        Assign Student
                    </button>
                </form>
            </div>

            {/* Current Assignments */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Current Assignments ({mappings.length})
                </h3>

                {mappings.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6B7280', padding: '2rem' }}>
                        No assignments yet. Assign students to teachers above.
                    </p>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {mappings.map((mapping, index) => (
                            <motion.div
                                key={mapping.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                style={{
                                    padding: '1rem',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                    {/* Student Info */}
                                    <div style={{
                                        padding: '0.75rem 1rem',
                                        backgroundColor: '#DBEAFE',
                                        borderRadius: '8px',
                                        flex: 1
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <GraduationCap size={16} color="#1E40AF" />
                                            <span style={{ fontWeight: '600', color: '#1E40AF' }}>
                                                {mapping.student?.full_name}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: '#1E40AF' }}>
                                            Year {mapping.student?.year} • {mapping.student?.registration_number}
                                        </p>
                                    </div>

                                    <ArrowRight size={20} color="#9CA3AF" />

                                    {/* Teacher Info */}
                                    <div style={{
                                        padding: '0.75rem 1rem',
                                        backgroundColor: '#FEF3C7',
                                        borderRadius: '8px',
                                        flex: 1
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <BookOpen size={16} color="#92400E" />
                                            <span style={{ fontWeight: '600', color: '#92400E' }}>
                                                {mapping.teacher?.full_name}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: '#92400E' }}>
                                            {mapping.teacher?.department}
                                        </p>
                                    </div>
                                </div>

                                {/* Notes and Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {mapping.notes && (
                                        <span style={{ fontSize: '0.875rem', color: '#6B7280', fontStyle: 'italic' }}>
                                            {mapping.notes}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleRemove(mapping.id)}
                                        style={{
                                            padding: '0.5rem',
                                            border: '1px solid #FCA5A5',
                                            borderRadius: '6px',
                                            backgroundColor: '#FEE2E2',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title="Remove assignment"
                                    >
                                        <Trash2 size={16} color="#DC2626" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary by Teacher */}
            <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Summary by Teacher
                </h3>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    {teachers.map(teacher => {
                        const teacherStudents = getStudentsForTeacher(teacher.id);
                        return (
                            <div
                                key={teacher.id}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: '#F9FAFB',
                                    borderRadius: '8px',
                                    border: '1px solid #E5E7EB'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <div>
                                        <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                            {teacher.full_name}
                                        </p>
                                        <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                                            {teacher.department}
                                        </p>
                                    </div>
                                    <span style={{
                                        padding: '0.375rem 0.75rem',
                                        backgroundColor: '#DBEAFE',
                                        color: '#1E40AF',
                                        borderRadius: '999px',
                                        fontSize: '0.875rem',
                                        fontWeight: '600'
                                    }}>
                                        {teacherStudents.length} Students
                                    </span>
                                </div>

                                {teacherStudents.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {teacherStudents.map(mapping => (
                                            <span
                                                key={mapping.id}
                                                style={{
                                                    padding: '0.25rem 0.75rem',
                                                    backgroundColor: 'white',
                                                    border: '1px solid #D1D5DB',
                                                    borderRadius: '999px',
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                {mapping.student?.full_name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TeacherStudentAssignment;
