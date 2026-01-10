import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import {
    GraduationCap, BookOpen, CheckCircle, Users, Home,
    FileText, Star, TrendingUp, RefreshCw, AlertCircle,
    ChevronDown, ChevronUp, Search, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');

    // Stats State
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalFamilies: 0,
        totalReflections: 0,
        pendingReflections: 0,
        gradedReflections: 0
    });

    // Oversight Data
    const [allReflections, setAllReflections] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [expandedRows, setExpandedRows] = useState({});

    useEffect(() => {
        if (profile?.id) {
            fetchDashboardData();
        }
    }, [profile]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch student count
            const { count: studentCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student')
                .eq('is_active', true);

            // Fetch teacher count
            const { count: teacherCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'teacher')
                .eq('is_active', true);

            // Fetch total families
            const { count: familyCount } = await supabase
                .from('families')
                .select('*', { count: 'exact', head: true });

            // Fetch all reflections with student info
            const { data: reflections, count: reflectionCount } = await supabase
                .from('reflections')
                .select(`
                    *,
                    student:profiles!student_id(id, full_name, registration_number)
                `, { count: 'exact' })
                .order('created_at', { ascending: false });

            const pending = reflections?.filter(r => r.status === 'Pending' || !r.status).length || 0;
            const graded = reflections?.filter(r => r.status === 'Graded').length || 0;

            setStats({
                totalStudents: studentCount || 0,
                totalTeachers: teacherCount || 0,
                totalFamilies: familyCount || 0,
                totalReflections: reflectionCount || 0,
                pendingReflections: pending,
                gradedReflections: graded
            });

            setAllReflections(reflections || []);

            // Fetch all students with their stats
            const { data: students } = await supabase
                .from('profiles')
                .select('id, full_name, registration_number, email, year')
                .eq('role', 'student')
                .eq('is_active', true)
                .order('full_name');

            if (students) {
                // Enrich with family and reflection counts
                const enrichedStudents = await Promise.all(students.map(async (s) => {
                    const { count: famCount } = await supabase
                        .from('families')
                        .select('*', { count: 'exact', head: true })
                        .eq('student_id', s.id);

                    const { data: refs } = await supabase
                        .from('reflections')
                        .select('status, total_score, grade')
                        .eq('student_id', s.id);

                    const totalRefs = refs?.length || 0;
                    const gradedRefs = refs?.filter(r => r.status === 'Graded') || [];
                    const avgScore = gradedRefs.length > 0
                        ? (gradedRefs.reduce((a, b) => a + (b.total_score || 0), 0) / gradedRefs.length).toFixed(1)
                        : '-';

                    return {
                        ...s,
                        familyCount: famCount || 0,
                        reflectionCount: totalRefs,
                        gradedCount: gradedRefs.length,
                        avgScore: avgScore
                    };
                }));
                setAllStudents(enrichedStudents);
            }

        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const filteredStudents = allStudents.filter(s =>
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredReflections = allReflections.filter(r =>
        r.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.student?.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const StatCard = ({ icon: Icon, label, value, color, bgGradient, borderColor }) => (
        <div className="card" style={{
            padding: '1.5rem',
            background: bgGradient,
            border: `1px solid ${borderColor}`
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon size={24} color="white" />
                </div>
                <div>
                    <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                        {label}
                    </p>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: '#1F2937' }}>
                        {loading ? '...' : value}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                        Admin Dashboard
                    </h1>
                    <p style={{ color: '#6B7280' }}>
                        Welcome, {profile?.full_name || 'Administrator'}!
                    </p>
                </div>
                <button
                    onClick={fetchDashboardData}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#0F172A',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh Data
                </button>
            </div>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '2rem',
                borderBottom: '2px solid #E5E7EB',
                paddingBottom: '0'
            }}>
                {[
                    { id: 'overview', label: 'Overview', icon: TrendingUp },
                    { id: 'oversight', label: 'Oversight & Grades', icon: Star },
                    { id: 'students', label: 'All Students', icon: Users }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            borderBottom: activeTab === tab.id ? '3px solid #0F766E' : '3px solid transparent',
                            color: activeTab === tab.id ? '#0F766E' : '#6B7280',
                            fontWeight: activeTab === tab.id ? '700' : '500',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            marginBottom: '-2px'
                        }}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <>
                    {/* Stats Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '2rem'
                    }}>
                        <StatCard
                            icon={GraduationCap}
                            label="Total Students"
                            value={stats.totalStudents}
                            color="#3B82F6"
                            bgGradient="linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)"
                            borderColor="#93C5FD"
                        />
                        <StatCard
                            icon={BookOpen}
                            label="Total Teachers"
                            value={stats.totalTeachers}
                            color="#F59E0B"
                            bgGradient="linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)"
                            borderColor="#FCD34D"
                        />
                        <StatCard
                            icon={Home}
                            label="Total Families"
                            value={stats.totalFamilies}
                            color="#10B981"
                            bgGradient="linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)"
                            borderColor="#6EE7B7"
                        />
                        <StatCard
                            icon={FileText}
                            label="Total Reflections"
                            value={stats.totalReflections}
                            color="#8B5CF6"
                            bgGradient="linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)"
                            borderColor="#C4B5FD"
                        />
                        <StatCard
                            icon={AlertCircle}
                            label="Pending Reviews"
                            value={stats.pendingReflections}
                            color="#EF4444"
                            bgGradient="linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)"
                            borderColor="#FCA5A5"
                        />
                        <StatCard
                            icon={CheckCircle}
                            label="Graded Reflections"
                            value={stats.gradedReflections}
                            color="#059669"
                            bgGradient="linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)"
                            borderColor="#6EE7B7"
                        />
                    </div>

                    {/* System Status */}
                    <div className="card" style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                        border: '2px solid #86EFAC'
                    }}>
                        <CheckCircle size={64} color="#16A34A" style={{ margin: '0 auto 1rem' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#166534', marginBottom: '0.5rem' }}>
                            System Status: Online
                        </h2>
                        <p style={{ color: '#15803D', fontSize: '1rem' }}>
                            All services are running normally. Data last refreshed at {new Date().toLocaleTimeString()}.
                        </p>
                    </div>
                </>
            )}

            {activeTab === 'oversight' && (
                <div>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                            <input
                                type="text"
                                placeholder="Search by student name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>
                        <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>
                            Showing {filteredReflections.length} reflections
                        </span>
                    </div>

                    <div className="card" style={{ overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Student</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Date</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Status</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Grade</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Score</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Teacher Feedback</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>Loading...</td>
                                    </tr>
                                ) : filteredReflections.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>No reflections found.</td>
                                    </tr>
                                ) : (
                                    filteredReflections.map(ref => (
                                        <tr key={ref.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: '600', color: '#111827' }}>{ref.student?.full_name || 'N/A'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{ref.student?.registration_number || ''}</div>
                                            </td>
                                            <td style={{ padding: '1rem', color: '#4B5563', fontSize: '0.9rem' }}>
                                                {new Date(ref.created_at).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    backgroundColor: ref.status === 'Graded' ? '#D1FAE5' : '#FEF3C7',
                                                    color: ref.status === 'Graded' ? '#065F46' : '#92400E'
                                                }}>
                                                    {ref.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '700', fontSize: '1.1rem', color: '#0F766E' }}>
                                                {ref.grade || '-'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>
                                                {ref.total_score ? `${ref.total_score}/100` : '-'}
                                            </td>
                                            <td style={{ padding: '1rem', color: '#4B5563', fontSize: '0.85rem', maxWidth: '300px' }}>
                                                {ref.teacher_feedback ? (
                                                    <div style={{
                                                        maxHeight: '60px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {ref.teacher_feedback.substring(0, 100)}{ref.teacher_feedback.length > 100 ? '...' : ''}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No feedback yet</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>
                        <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>
                            {filteredStudents.length} students
                        </span>
                    </div>

                    <div className="card" style={{ overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Student Name</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Reg. No.</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Year</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Families</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Reflections</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Graded</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Avg. Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>Loading...</td>
                                    </tr>
                                ) : filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>No students found.</td>
                                    </tr>
                                ) : (
                                    filteredStudents.map(student => (
                                        <tr key={student.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                            <td style={{ padding: '1rem', fontWeight: '600', color: '#111827' }}>{student.full_name}</td>
                                            <td style={{ padding: '1rem', color: '#4B5563', fontSize: '0.9rem' }}>{student.registration_number || '-'}</td>
                                            <td style={{ padding: '1rem', textAlign: 'center', color: '#4B5563' }}>{student.year || '-'}</td>
                                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#0F766E' }}>{student.familyCount}</td>
                                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#3B82F6' }}>{student.reflectionCount}</td>
                                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#059669' }}>{student.gradedCount}</td>
                                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '700', color: '#1F2937' }}>{student.avgScore}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
