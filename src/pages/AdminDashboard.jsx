import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import {
    GraduationCap, BookOpen, CheckCircle, Users, Home,
    FileText, Star, TrendingUp, RefreshCw, AlertCircle,
    ChevronDown, ChevronUp, Search, Filter, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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

    useEffect(() => {
        if (profile?.id) {
            fetchDashboardData();
        }
    }, [profile]);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('[Admin] Starting data fetch...');

            // Fetch student count
            const { count: studentCount, error: e1 } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student')
                .eq('is_active', true);

            if (e1) console.error('[Admin] Student count error:', e1);

            // Fetch teacher count
            const { count: teacherCount, error: e2 } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'teacher')
                .eq('is_active', true);

            if (e2) console.error('[Admin] Teacher count error:', e2);

            // Fetch total families
            const { count: familyCount, error: e3 } = await supabase
                .from('families')
                .select('*', { count: 'exact', head: true });

            if (e3) console.error('[Admin] Families count error:', e3);

            // Fetch all reflections - simpler query first
            const { data: reflections, error: e4 } = await supabase
                .from('reflections')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (e4) {
                console.error('[Admin] Reflections error:', e4);
            }

            console.log('[Admin] Reflections fetched:', reflections?.length || 0);

            const pending = reflections?.filter(r => r.status === 'Pending' || !r.status).length || 0;
            const graded = reflections?.filter(r => r.status === 'Graded').length || 0;

            setStats({
                totalStudents: studentCount || 0,
                totalTeachers: teacherCount || 0,
                totalFamilies: familyCount || 0,
                totalReflections: reflections?.length || 0,
                pendingReflections: pending,
                gradedReflections: graded
            });

            // Now enrich reflections with student names
            if (reflections && reflections.length > 0) {
                const studentIds = [...new Set(reflections.map(r => r.student_id).filter(Boolean))];

                const { data: studentProfiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, registration_number')
                    .in('id', studentIds);

                const studentMap = {};
                (studentProfiles || []).forEach(s => { studentMap[s.id] = s; });

                const enrichedReflections = reflections.map(r => ({
                    ...r,
                    student: studentMap[r.student_id] || { full_name: 'Unknown', registration_number: '' }
                }));

                setAllReflections(enrichedReflections);
            } else {
                setAllReflections([]);
            }

            // Fetch all students
            const { data: students, error: e5 } = await supabase
                .from('profiles')
                .select('id, full_name, registration_number, email, year')
                .eq('role', 'student')
                .eq('is_active', true)
                .order('full_name');

            if (e5) console.error('[Admin] Students fetch error:', e5);

            console.log('[Admin] Students fetched:', students?.length || 0);

            if (students && students.length > 0) {
                // Batch fetch families count and reflections
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
            } else {
                setAllStudents([]);
            }

            console.log('[Admin] Data fetch complete');

        } catch (err) {
            console.error('[Admin] Critical error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
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
            padding: '1.25rem',
            background: bgGradient,
            border: `1px solid ${borderColor}`,
            minWidth: '140px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <Icon size={20} color="white" />
                </div>
                <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.125rem', whiteSpace: 'nowrap' }}>
                        {label}
                    </p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1F2937' }}>
                        {loading ? '...' : value}
                    </p>
                </div>
            </div>
        </div>
    );

    // Mobile Card Component for Reflections
    const ReflectionCard = ({ ref: reflection }) => (
        <div style={{
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            marginBottom: '0.75rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                    <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.95rem' }}>
                        {reflection.student?.full_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        {reflection.student?.registration_number || ''}
                    </div>
                </div>
                <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    backgroundColor: reflection.status === 'Graded' ? '#D1FAE5' : '#FEF3C7',
                    color: reflection.status === 'Graded' ? '#065F46' : '#92400E'
                }}>
                    {reflection.status || 'Pending'}
                </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div>
                    <div style={{ fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Date</div>
                    <div style={{ fontSize: '0.85rem', color: '#374151' }}>{new Date(reflection.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Grade</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0F766E' }}>{reflection.grade || '-'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Score</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>{reflection.total_score ? `${reflection.total_score}/100` : '-'}</div>
                </div>
            </div>
            {reflection.teacher_feedback && (
                <div style={{
                    fontSize: '0.8rem',
                    color: '#4B5563',
                    backgroundColor: '#F9FAFB',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    marginTop: '0.5rem'
                }}>
                    <strong>Feedback:</strong> {reflection.teacher_feedback.substring(0, 80)}{reflection.teacher_feedback.length > 80 ? '...' : ''}
                </div>
            )}
        </div>
    );

    // Mobile Card Component for Students
    const StudentCard = ({ student }) => (
        <div style={{
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            marginBottom: '0.75rem'
        }}>
            <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                {student.full_name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.75rem' }}>
                {student.registration_number || 'No Reg. No.'} {student.year ? `• Year ${student.year}` : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                <div>
                    <div style={{ fontSize: '0.6rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Families</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0F766E' }}>{student.familyCount}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.6rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Reflect.</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#3B82F6' }}>{student.reflectionCount}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.6rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Graded</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#059669' }}>{student.gradedCount}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.6rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Avg.</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1F2937' }}>{student.avgScore}</div>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                        Admin Dashboard
                    </h1>
                    <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
                        Welcome, {profile?.full_name || 'Administrator'}!
                    </p>
                </div>
                <button
                    onClick={fetchDashboardData}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#0F172A',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        width: '100%',
                        maxWidth: '200px'
                    }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <AlertTriangle size={20} color="#DC2626" />
                    <span style={{ color: '#991B1B', fontSize: '0.9rem' }}>Error: {error}</span>
                </div>
            )}

            {/* Tab Navigation - Scrollable on Mobile */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem',
                borderBottom: '2px solid #E5E7EB'
            }}>
                {[
                    { id: 'overview', label: 'Overview', icon: TrendingUp },
                    { id: 'oversight', label: 'Grades', icon: Star },
                    { id: 'students', label: 'Students', icon: Users }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.6rem 1rem',
                            borderBottom: activeTab === tab.id ? '3px solid #0F766E' : '3px solid transparent',
                            color: activeTab === tab.id ? '#0F766E' : '#6B7280',
                            fontWeight: activeTab === tab.id ? '700' : '500',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            marginBottom: '-2px',
                            whiteSpace: 'nowrap',
                            fontSize: '0.9rem'
                        }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <>
                    {/* Stats Cards - Responsive Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        <StatCard
                            icon={GraduationCap}
                            label="Students"
                            value={stats.totalStudents}
                            color="#3B82F6"
                            bgGradient="linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)"
                            borderColor="#93C5FD"
                        />
                        <StatCard
                            icon={BookOpen}
                            label="Teachers"
                            value={stats.totalTeachers}
                            color="#F59E0B"
                            bgGradient="linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)"
                            borderColor="#FCD34D"
                        />
                        <StatCard
                            icon={Home}
                            label="Families"
                            value={stats.totalFamilies}
                            color="#10B981"
                            bgGradient="linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)"
                            borderColor="#6EE7B7"
                        />
                        <StatCard
                            icon={FileText}
                            label="Reflections"
                            value={stats.totalReflections}
                            color="#8B5CF6"
                            bgGradient="linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)"
                            borderColor="#C4B5FD"
                        />
                        <StatCard
                            icon={AlertCircle}
                            label="Pending"
                            value={stats.pendingReflections}
                            color="#EF4444"
                            bgGradient="linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)"
                            borderColor="#FCA5A5"
                        />
                        <StatCard
                            icon={CheckCircle}
                            label="Graded"
                            value={stats.gradedReflections}
                            color="#059669"
                            bgGradient="linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)"
                            borderColor="#6EE7B7"
                        />
                    </div>

                    {/* System Status */}
                    <div className="card" style={{
                        padding: '1.5rem',
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                        border: '2px solid #86EFAC'
                    }}>
                        <CheckCircle size={48} color="#16A34A" style={{ margin: '0 auto 0.75rem' }} />
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#166534', marginBottom: '0.5rem' }}>
                            System Online
                        </h2>
                        <p style={{ color: '#15803D', fontSize: '0.85rem' }}>
                            Last refreshed: {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                </>
            )}

            {activeTab === 'oversight' && (
                <div>
                    {/* Search */}
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                            <input
                                type="text"
                                placeholder="Search by name or ID..."
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
                        <p style={{ color: '#6B7280', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                            {filteredReflections.length} reflection{filteredReflections.length !== 1 ? 's' : ''} found
                        </p>
                    </div>

                    {/* Mobile Card List */}
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>Loading reflections...</div>
                    ) : filteredReflections.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                            <FileText size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                            <p>No reflections found.</p>
                            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Students may not have submitted any reflections yet.</p>
                        </div>
                    ) : (
                        <div>
                            {filteredReflections.map(reflection => (
                                <ReflectionCard key={reflection.id} ref={reflection} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'students' && (
                <div>
                    {/* Search */}
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
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
                        <p style={{ color: '#6B7280', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
                        </p>
                    </div>

                    {/* Mobile Card List */}
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>Loading students...</div>
                    ) : filteredStudents.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                            <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                            <p>No students found.</p>
                            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>No active students in the system yet.</p>
                        </div>
                    ) : (
                        <div>
                            {filteredStudents.map(student => (
                                <StudentCard key={student.id} student={student} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
