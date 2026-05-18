import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import {
    GraduationCap, BookOpen, CheckCircle, Users, Home,
    FileText, Star, TrendingUp, RefreshCw, AlertCircle,
    Search, AlertTriangle, Crown, Download, X, ExternalLink, FileSpreadsheet
} from 'lucide-react';
import { calculateBadges } from '../utils/gamification';
import BadgeDisplay from '../components/shared/BadgeDisplay';
import { get, set } from 'idb-keyval';
import { withRetry } from '../utils/retryUtils';
import { formatStudentIdentifiers } from '../utils/studentIdentity';

const REFLECT_CRITERIA = [
    { id: 'score_exploration', label: 'Exploration' },
    { id: 'score_voice', label: 'Voice' },
    { id: 'score_description', label: 'Description' },
    { id: 'score_emotions', label: 'Emotions' },
    { id: 'score_analysis', label: 'Analysis' }
];

const GIBBS_STAGES = [
    { id: 'gibbs_description', label: 'Description' },
    { id: 'gibbs_feelings', label: 'Feelings' },
    { id: 'gibbs_evaluation', label: 'Evaluation' },
    { id: 'gibbs_analysis', label: 'Analysis' },
    { id: 'gibbs_conclusion', label: 'Conclusion' },
    { id: 'gibbs_action_plan', label: 'Action Plan' }
];

const AdminDashboard = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    const [lastSyncedAt, setLastSyncedAt] = useState(null);
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
    const [selectedReflection, setSelectedReflection] = useState(null);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const getStudentsForReport = () => [...allStudents]
        .sort((a, b) => (b.gradedCount || 0) - (a.gradedCount || 0));

    const handleExport = async () => {
        try {
            console.log("Exporting Admin Report...");
            const studentsForReport = getStudentsForReport();
            const { generateAdminReport } = await import('../utils/reportGenerator');
            generateAdminReport(stats, studentsForReport);
            console.log("Export Complete");
        } catch (err) {
            console.error(err);
            alert("Export Failed: " + err.message);
        }
    };

    const handleExcelExport = async () => {
        try {
            console.log("Exporting Admin Excel Report...");
            const studentsForReport = getStudentsForReport();
            const { generateAdminExcelReport } = await import('../utils/reportGenerator');
            generateAdminExcelReport(stats, studentsForReport);
            console.log("Excel Export Complete");
        } catch (err) {
            console.error(err);
            alert("Excel Export Failed: " + err.message);
        }
    };

    const handleLocalExport = async (language = 'kn') => {
        try {
            const studentsForReport = getStudentsForReport();
            const { generateAdminLocalStaffReport } = await import('../utils/reportGenerator');
            generateAdminLocalStaffReport(stats, studentsForReport, language);
        } catch (err) {
            console.error(err);
            alert(`Local language export failed: ${err.message}`);
        }
    };

    const fetchDashboardData = useCallback(async () => {
        if (!profile?.id) return;
        setLoading(true);
        setError(null);

        const sessionKey = `admin_dashboard_session_${profile.id}`;
        const persistentKey = `admin_dashboard_${profile.id}`;
        let hasAppliedCache = false;

        const applyDashboardPayload = (payload) => {
            if (!payload) return false;
            setStats(payload.stats || {
                totalStudents: 0,
                totalTeachers: 0,
                totalFamilies: 0,
                totalReflections: 0,
                pendingReflections: 0,
                gradedReflections: 0
            });
            setAllReflections(Array.isArray(payload.allReflections) ? payload.allReflections : []);
            setAllStudents(Array.isArray(payload.allStudents) ? payload.allStudents : []);
            setLastSyncedAt(payload.timestamp || null);
            return true;
        };

        try {
            const cachedSession = sessionStorage.getItem(sessionKey);
            if (cachedSession) {
                const parsed = JSON.parse(cachedSession);
                hasAppliedCache = applyDashboardPayload(parsed);
                if (hasAppliedCache) setLoading(false);
            }
        } catch (cacheErr) {
            console.warn('[Admin] Session cache invalid, clearing.', cacheErr);
            sessionStorage.removeItem(sessionKey);
        }

        if (!hasAppliedCache) {
            try {
                const persistent = await get(persistentKey);
                hasAppliedCache = applyDashboardPayload(persistent);
                if (hasAppliedCache) setLoading(false);
            } catch (cacheErr) {
                console.warn('[Admin] Persistent cache unavailable.', cacheErr);
            }
        }

        if (!navigator.onLine && hasAppliedCache) {
            setError('Offline mode: showing last synced admin dashboard snapshot.');
            setLoading(false);
            return;
        }

        try {
            console.log('[Admin] Starting data fetch...');

            const [
                { count: studentCount, error: e1 },
                { count: teacherCount, error: e2 },
                { count: familyCount, error: e3 },
                { data: reflections, error: e4 },
                { data: students, error: e5 }
            ] = await withRetry(() => Promise.all([
                    supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .eq('role', 'student')
                        .eq('is_active', true),
                    supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .eq('role', 'teacher')
                        .eq('is_active', true),
                    supabase
                        .from('families')
                        .select('*', { count: 'exact', head: true }),
                    supabase
                        .from('reflections')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(200),
                    supabase
                        .from('profiles')
                        .select('id, username, full_name, registration_number, email, year, year_of_joining')
                        .eq('role', 'student')
                        .eq('is_active', true)
                        .order('full_name')
                ]),
                { retries: 2 }
            );

            if (e1) console.error('[Admin] Student count error:', e1);
            if (e2) console.error('[Admin] Teacher count error:', e2);
            if (e3) console.error('[Admin] Families count error:', e3);
            if (e4) console.error('[Admin] Reflections error:', e4);
            if (e5) console.error('[Admin] Students fetch error:', e5);

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

            let enrichedReflections = [];
            let mentorMap = {};
            let mappingsData = [];
            const studentIds = (students || []).map(s => s.id);

            if (studentIds.length > 0) {
                const { data: mappings, error: mappingsError } = await supabase
                    .from('teacher_student_mappings')
                    .select('student_id, teacher:profiles!teacher_id(id, username, full_name, email)')
                    .eq('is_active', true)
                    .in('student_id', studentIds);

                if (mappingsError) {
                    console.error('[Admin] Mentor mappings error:', mappingsError);
                } else {
                    mappingsData = mappings || [];
                    mentorMap = mappingsData.reduce((acc, row) => {
                        if (row.student_id && row.teacher && !acc[row.student_id]) {
                            acc[row.student_id] = row.teacher;
                        }
                        return acc;
                    }, {});
                }
            }

            if (reflections && reflections.length > 0) {
                const studentMap = {};
                (students || []).forEach(s => { studentMap[s.id] = s; });

                enrichedReflections = reflections.map(r => ({
                    ...r,
                    student: studentMap[r.student_id] || { full_name: 'Unknown', registration_number: '', username: '' },
                    mentor: mentorMap[r.student_id] || null
                }));
            }
            setAllReflections(enrichedReflections);

            console.log('[Admin] Reflections fetched:', reflections?.length || 0);
            console.log('[Admin] Students fetched:', students?.length || 0);

            let enrichedStudents = [];
            if (students && students.length > 0) {
                const [{ data: familiesData }, { data: refsData }] = await Promise.all([
                    supabase
                        .from('families')
                        .select('id, student_id')
                        .in('student_id', studentIds),
                    supabase
                        .from('reflections')
                        .select('student_id, status, total_score, grade')
                        .in('student_id', studentIds)
                ]);
                const familyIds = (familiesData || []).map((family) => family.id).filter(Boolean);
                let membersData = [];
                let assessmentRows = [];

                if (familyIds.length > 0) {
                    const { data: membersResult } = await supabase
                        .from('family_members')
                        .select('id, family_id, health_data')
                        .in('family_id', familyIds);
                    membersData = membersResult || [];
                }

                const memberIds = membersData.map((member) => member.id).filter(Boolean);
                if (memberIds.length > 0) {
                    const { data: normalizedAssessments, error: normalizedError } = await supabase
                        .from('individual_assessments')
                        .select('id, member_id, form_id, assessment_date, legacy_assessment_id, is_deleted')
                        .in('member_id', memberIds)
                        .eq('is_deleted', false);
                    if (!normalizedError) assessmentRows = normalizedAssessments || [];
                }

                const familyCounts = (familiesData || []).reduce((acc, f) => {
                    acc[f.student_id] = (acc[f.student_id] || 0) + 1;
                    return acc;
                }, {});
                const familyStudentMap = (familiesData || []).reduce((acc, family) => {
                    acc[family.id] = family.student_id;
                    return acc;
                }, {});
                const memberStudentMap = membersData.reduce((acc, member) => {
                    acc[member.id] = familyStudentMap[member.family_id];
                    return acc;
                }, {});

                const reflectionBuckets = (refsData || []).reduce((acc, r) => {
                    const bucket = acc[r.student_id] || { total: 0, graded: [], gradedCount: 0 };
                    bucket.total += 1;
                    if (r.status === 'Graded') {
                        bucket.graded.push(r);
                        bucket.gradedCount += 1;
                    }
                    acc[r.student_id] = bucket;
                    return acc;
                }, {});
                const normalizedKeysByStudent = {};
                const assessmentBuckets = assessmentRows.reduce((acc, row) => {
                    const studentId = memberStudentMap[row.member_id];
                    if (!studentId) return acc;
                    const bucket = acc[studentId] || { total: 0, byForm: {}, recent: [] };
                    bucket.total += 1;
                    bucket.byForm[row.form_id] = (bucket.byForm[row.form_id] || 0) + 1;
                    bucket.recent.push(row);
                    acc[studentId] = bucket;
                    normalizedKeysByStudent[studentId] = normalizedKeysByStudent[studentId] || new Set();
                    normalizedKeysByStudent[studentId].add(`${row.member_id}|${row.form_id}|${row.assessment_date}|${row.legacy_assessment_id || ''}`);
                    return acc;
                }, {});

                membersData.forEach((member) => {
                    const studentId = memberStudentMap[member.id];
                    if (!studentId) return;
                    const bucket = assessmentBuckets[studentId] || { total: 0, byForm: {}, recent: [] };
                    const normalizedKeys = normalizedKeysByStudent[studentId] || new Set();
                    (member.health_data?.assessments || []).forEach((assessment) => {
                        const key = `${member.id}|${assessment.formId || 'unknown'}|${assessment.date || ''}|${assessment.id ? String(assessment.id) : ''}`;
                        if (normalizedKeys.has(key)) return;
                        bucket.total += 1;
                        const formId = assessment.formId || 'unknown';
                        bucket.byForm[formId] = (bucket.byForm[formId] || 0) + 1;
                    });
                    assessmentBuckets[studentId] = bucket;
                });

                enrichedStudents = students.map(s => {
                    const bucket = reflectionBuckets[s.id] || { total: 0, graded: [], gradedCount: 0 };
                    const assessmentBucket = assessmentBuckets[s.id] || { total: 0, byForm: {}, recent: [] };
                    const avgScore = bucket.graded.length > 0
                        ? (bucket.graded.reduce((a, b) => a + (b.total_score || 0), 0) / bucket.graded.length).toFixed(1)
                        : '-';

                    return {
                        ...s,
                        familyCount: familyCounts[s.id] || 0,
                        reflectionCount: bucket.total,
                        gradedCount: bucket.gradedCount,
                        avgScore: avgScore,
                        assessmentCount: assessmentBucket.total,
                        assessmentByForm: assessmentBucket.byForm,
                        mentor: mentorMap[s.id] || null
                    };
                });

            }
            setAllStudents(enrichedStudents);

            console.log('[Admin] Data fetch complete');
            const payload = {
                stats: {
                    totalStudents: studentCount || 0,
                    totalTeachers: teacherCount || 0,
                    totalFamilies: familyCount || 0,
                    totalReflections: reflections?.length || 0,
                    pendingReflections: pending,
                    gradedReflections: graded
                },
                allReflections: enrichedReflections,
                allStudents: enrichedStudents,
                timestamp: Date.now()
            };
            sessionStorage.setItem(sessionKey, JSON.stringify(payload));
            await set(persistentKey, payload);
            setLastSyncedAt(payload.timestamp);
            setError(null);

        } catch (err) {
            console.error('[Admin] Critical error:', err);
            setError(
                hasAppliedCache
                    ? 'Could not refresh latest data. Showing last saved dashboard snapshot.'
                    : (err.message || 'Could not load admin dashboard data.')
            );
        } finally {
            setLoading(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const filteredStudents = allStudents.filter(s =>
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.mentor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(s.year_of_joining || '').includes(searchTerm.trim())
    );

    const filteredReflections = allReflections.filter(r =>
        r.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.student?.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.mentor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.grade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.status || 'Pending').toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        GIBBS_STAGES.some(stage => r[stage.id]?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        String(r.student?.year_of_joining || '').includes(searchTerm.trim())
    );

    const scoreDisplay = (score) => (score !== null && score !== undefined ? `${score}/100` : '-');

    const hasAssessment = (reflection) => reflection.status === 'Graded' || reflection.grade || reflection.teacher_feedback;

    const ReflectionBody = ({ reflection, compact = false }) => {
        const hasStructuredText = GIBBS_STAGES.some(stage => reflection[stage.id]);

        if (reflection.reflection_type === 'file') {
            return (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{reflection.file_name || 'Uploaded reflection file'}</span>
                        {reflection.file_url && (
                            <a
                                href={reflection.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#0F766E', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                                Open file <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                    {reflection.ai_extracted_text && (
                        <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                Extracted Text
                            </div>
                            <p style={{
                                color: '#334155',
                                fontSize: compact ? '0.85rem' : '0.95rem',
                                lineHeight: 1.55,
                                whiteSpace: 'pre-wrap',
                                maxHeight: compact ? '4.6rem' : 'none',
                                overflow: compact ? 'hidden' : 'visible'
                            }}>
                                {reflection.ai_extracted_text}
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        if (hasStructuredText) {
            return (
                <div style={{ display: 'grid', gap: compact ? '0.5rem' : '0.9rem' }}>
                    {GIBBS_STAGES.map(stage => {
                        const value = reflection[stage.id];
                        if (!value) return null;
                        return (
                            <div key={stage.id}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                                    {stage.label}
                                </div>
                                <p style={{
                                    color: '#334155',
                                    fontSize: compact ? '0.85rem' : '0.95rem',
                                    lineHeight: 1.55,
                                    whiteSpace: 'pre-wrap',
                                    maxHeight: compact ? '3.1rem' : 'none',
                                    overflow: compact ? 'hidden' : 'visible'
                                }}>
                                    {value}
                                </p>
                            </div>
                        );
                    })}
                </div>
            );
        }

        return (
            <p style={{
                color: '#334155',
                fontSize: compact ? '0.85rem' : '0.95rem',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                maxHeight: compact ? '4.6rem' : 'none',
                overflow: compact ? 'hidden' : 'visible'
            }}>
                {reflection.content || 'No written content available.'}
            </p>
        );
    };

    const AssessmentPanel = ({ reflection }) => (
        <div style={{
            background: hasAssessment(reflection) ? '#FFF7ED' : '#F8FAFC',
            border: hasAssessment(reflection) ? '1px solid #FED7AA' : '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: hasAssessment(reflection) ? '#9A3412' : '#475569', textTransform: 'uppercase' }}>
                        Mentor Assessment
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.2rem' }}>
                        {reflection.mentor?.full_name ? `Mentor: ${reflection.mentor.full_name}` : 'Mentor not recorded'}
                        {reflection.graded_at ? ` | Graded ${new Date(reflection.graded_at).toLocaleDateString()}` : ''}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: hasAssessment(reflection) ? '#EA580C' : '#64748B', lineHeight: 1 }}>
                        {reflection.grade || '-'}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                        {scoreDisplay(reflection.total_score)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '0.5rem', marginBottom: '0.85rem' }}>
                {REFLECT_CRITERIA.map(criterion => (
                    <div key={criterion.id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.55rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.67rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>{criterion.label}</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{reflection[criterion.id] ?? 0}/20</div>
                    </div>
                ))}
            </div>

            <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    Feedback
                </div>
                <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {reflection.teacher_feedback || 'No written feedback provided.'}
                </p>
            </div>
        </div>
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
                        {formatStudentIdentifiers(reflection.student)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
                        Mentor: {reflection.mentor?.full_name || 'Not assigned'}
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
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>{scoreDisplay(reflection.total_score)}</div>
                </div>
            </div>
            <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '0.75rem'
            }}>
                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Student Reflection
                </div>
                <ReflectionBody reflection={reflection} compact />
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
            <button
                onClick={() => setSelectedReflection(reflection)}
                style={{
                    marginTop: '0.75rem',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 0.9rem',
                    border: '1px solid #0F766E',
                    background: '#F0FDFA',
                    color: '#0F766E',
                    borderRadius: '8px',
                    fontWeight: 800,
                    cursor: 'pointer'
                }}
            >
                <FileText size={16} />
                View reflection and grading
            </button>
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
                {formatStudentIdentifiers(student)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.75rem' }}>
                Mentor: {student.mentor?.full_name || 'Not assigned'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                <div>
                    <div style={{ fontSize: '0.6rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Families</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0F766E' }}>{student.familyCount}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.6rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Assess.</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#7C3AED' }}>{student.assessmentCount || 0}</div>
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
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={fetchDashboardData}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'white',
                            color: '#0F172A',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            flex: 1
                        }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {loading ? '...' : 'Refresh'}
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#0F766E',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            flex: 1
                        }}
                    >
                        <Download size={16} />
                        PDF
                    </button>
                    <button
                        onClick={handleExcelExport}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#1D4ED8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            flex: 1
                        }}
                    >
                        <FileSpreadsheet size={16} />
                        Excel
                    </button>
                    <button
                        onClick={() => handleLocalExport('kn')}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: '#ECFDF5',
                            color: '#065F46',
                            border: '1px solid #A7F3D0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '700'
                        }}
                    >
                        ಕನ್ನಡ
                    </button>
                    <button
                        onClick={() => handleLocalExport('hi')}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: '#FEFCE8',
                            color: '#854D0E',
                            border: '1px solid #FDE68A',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '700'
                        }}
                    >
                        हिंदी
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: error.toLowerCase().includes('offline') ? '#FFF7ED' : '#FEE2E2',
                    border: error.toLowerCase().includes('offline') ? '1px solid #FED7AA' : '1px solid #FECACA',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <AlertTriangle size={20} color={error.toLowerCase().includes('offline') ? '#C2410C' : '#DC2626'} />
                        <span style={{ color: error.toLowerCase().includes('offline') ? '#9A3412' : '#991B1B', fontSize: '0.9rem' }}>{error}</span>
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        style={{
                            border: '1px solid #FCA5A5',
                            background: 'white',
                            color: '#991B1B',
                            borderRadius: '8px',
                            padding: '0.35rem 0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Retry
                    </button>
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

                    {/* Charts Section */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '1.5rem'
                    }}>
                        {/* 7-Day Activity Trend (CSS Implementation) */}
                        <div className="card" style={{ padding: '1.5rem', background: 'white', border: '1px solid #E5E7EB' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={18} /> Activity Activity Trend (Last 7 Days)
                            </h3>
                            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '4px' }}>
                                {(() => {
                                    // Calculate last 7 days stats
                                    const days = [...Array(7)].map((_, i) => {
                                        const d = new Date();
                                        d.setDate(d.getDate() - i);
                                        return d.toISOString().split('T')[0];
                                    }).reverse();

                                    const dailyCounts = days.map(day => {
                                        const count = allReflections.filter(r => r.created_at.startsWith(day)).length;
                                        return { day, count };
                                    });

                                    const max = Math.max(...dailyCounts.map(d => d.count), 5); // Minimum scale of 5

                                    return dailyCounts.map((stat, idx) => (
                                        <div key={stat.day || idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{
                                                width: '100%',
                                                height: `${(stat.count / max) * 150}px`,
                                                background: '#8B5CF6',
                                                borderRadius: '4px 4px 0 0',
                                                opacity: 0.7,
                                                minHeight: stat.count > 0 ? '4px' : '0'
                                            }} title={`${stat.count} Reflections`}></div>
                                            <span style={{ fontSize: '0.65rem', color: '#6B7280' }}>
                                                {new Date(stat.day).getDate()}/{new Date(stat.day).getMonth() + 1}
                                            </span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Top Performers Leaderboard */}
                        <div className="card" style={{ padding: '1.5rem', background: 'white', border: '1px solid #E5E7EB' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Crown size={18} color="#F59E0B" /> Top Scholars
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {allStudents
                                    .sort((a, b) => (b.gradedCount || 0) - (a.gradedCount || 0))
                                    .slice(0, 5)
                                    .map((student, idx) => (
                                        <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '24px', height: '24px', borderRadius: '50%',
                                                background: idx === 0 ? '#FEF3C7' : idx === 1 ? '#F3F4F6' : '#FFF7ED',
                                                color: idx === 0 ? '#D97706' : idx === 1 ? '#6B7280' : '#C2410C',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem'
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{student.full_name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                                    {student.gradedCount} Graded Reflections • {formatStudentIdentifiers(student)}
                                                </div>
                                            </div>
                                            <BadgeDisplay badges={calculateBadges({
                                                visits: 0, // Admin view doesn't fetch visits yet per student efficiently
                                                reflections: student.reflectionCount,
                                                avgGrade: 'B' // Placeholder
                                            })} size="sm" />
                                        </div>
                                    ))}
                                {allStudents.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>No student data available.</p>}
                            </div>
                        </div>
                    </div>

                    {/* System Status */}
                    <div className="card" style={{
                        padding: '1.5rem',
                        textAlign: 'center',
                        background: isOffline
                            ? 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)'
                            : 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                        border: isOffline ? '2px solid #FDBA74' : '2px solid #86EFAC'
                    }}>
                        <CheckCircle size={48} color={isOffline ? '#C2410C' : '#16A34A'} style={{ margin: '0 auto 0.75rem' }} />
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#166534', marginBottom: '0.5rem' }}>
                            {isOffline ? 'Offline Snapshot Mode' : 'System Online'}
                        </h2>
                        <p style={{ color: isOffline ? '#9A3412' : '#15803D', fontSize: '0.85rem' }}>
                            Last refreshed: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Not available'}
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
                                placeholder="Search by student, mentor, status, grade, or reflection text..."
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

            {selectedReflection && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Reflection details"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.55)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}
                    onClick={() => setSelectedReflection(null)}
                >
                    <div
                        style={{
                            width: 'min(960px, 100%)',
                            maxHeight: '90vh',
                            overflow: 'hidden',
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div style={{
                            padding: '1rem 1.25rem',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            alignItems: 'flex-start'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, marginBottom: '0.2rem' }}>
                                    {new Date(selectedReflection.created_at).toLocaleString()} | {selectedReflection.phase || 'No phase'}
                                </div>
                                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.25rem' }}>
                                    {selectedReflection.student?.full_name || 'Unknown student'}
                                </h2>
                                <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                                    {formatStudentIdentifiers(selectedReflection.student)}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedReflection(null)}
                                aria-label="Close reflection details"
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '8px',
                                    background: 'white',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'grid', gap: '1rem' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '0.75rem'
                            }}>
                                {[
                                    ['Status', selectedReflection.status || 'Pending'],
                                    ['Grade', selectedReflection.grade || '-'],
                                    ['Score', scoreDisplay(selectedReflection.total_score)],
                                    ['Mentor', selectedReflection.mentor?.full_name || 'Not assigned']
                                ].map(([label, value]) => (
                                    <div key={label} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem', background: '#F8FAFC' }}>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                            {label}
                                        </div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                                            {value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                                    <FileText size={18} color="#0F766E" />
                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Student Reflection</h3>
                                </div>
                                <ReflectionBody reflection={selectedReflection} />
                            </div>

                            <AssessmentPanel reflection={selectedReflection} />

                            {selectedReflection.ai_extraction_status && selectedReflection.ai_extraction_status !== 'not_requested' && (
                                <div style={{
                                    border: selectedReflection.ai_extraction_status === 'failed' ? '1px solid #FECACA' : '1px solid #BBF7D0',
                                    background: selectedReflection.ai_extraction_status === 'failed' ? '#FEF2F2' : '#F0FDF4',
                                    borderRadius: '10px',
                                    padding: '0.85rem',
                                    color: selectedReflection.ai_extraction_status === 'failed' ? '#991B1B' : '#166534',
                                    fontSize: '0.85rem',
                                    lineHeight: 1.5
                                }}>
                                    <strong>AI segmentation:</strong> {selectedReflection.ai_extraction_status}
                                    {selectedReflection.ai_extraction_provider ? ` | ${selectedReflection.ai_extraction_provider}` : ''}
                                    {selectedReflection.ai_extraction_model ? ` | ${selectedReflection.ai_extraction_model}` : ''}
                                    {selectedReflection.ai_extraction_error ? ` | ${selectedReflection.ai_extraction_error}` : ''}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
