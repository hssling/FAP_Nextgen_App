import React, { useEffect, useState } from 'react';
import {
    BarChart, Activity, Users, Droplets, Heart, FileText, Download,
    PieChart, TrendingUp, AlertTriangle, Baby, BookOpen, UserCheck,
    Calendar, User, MapPin, Clock, ChevronDown, ChevronUp, Stethoscope,
    ClipboardList, Target, CheckCircle, AlertCircle, Home
} from 'lucide-react';
import { generateCommunityHealthReport } from '../services/analytics';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { get, set, del } from 'idb-keyval';
import { withRetry } from '../utils/retryUtils';

const SectionHeader = ({ icon: Icon, title, color }) => (
    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: color || 'var(--color-text)' }}>
        <Icon size={24} /> {title}
    </h3>
);

const ReportCard = ({ label, value, subtext, color }) => (
    <div className="card" style={{ padding: '1.5rem', borderLeft: `4px solid ${color}` }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{label}</div>
        <div style={{ fontSize: '2rem', fontWeight: '700', margin: '0.5rem 0' }}>{value}</div>
        {subtext && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{subtext}</div>}
    </div>
);

const ExpandableCard = ({ title, icon: Icon, children, defaultOpen = false, forceOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer' 
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon size={20} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontWeight: '600' }}>{title}</span>
                </div>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            {(isOpen || forceOpen) && <div style={{ marginTop: '1.5rem' }}>{children}</div>}
        </div>
    );
};

const Reports = () => {
    const { profile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('community');
    const [feedback, setFeedback] = useState(null);
    const [isPrintMode, setIsPrintMode] = useState(false);

    const sanitizeReportData = (raw) => {
        if (!raw || typeof raw !== 'object') return null;
        return {
            demographics: raw.demographics || { totalPopulation: 0, totalFamilies: 0, genderRatio: { ratio: 0 }, dependencyRatio: 0, ageDistribution: {} },
            maternalHealth: raw.maternalHealth || { registeredPregnancies: 0, highRiskPregnancies: 0 },
            childHealth: raw.childHealth || { totalUnder5: 0, fullyImmunized: 0 },
            morbidity: raw.morbidity || {},
            socioEconomic: raw.socioEconomic || {},
            environmental: raw.environmental || { safeWater: 0, sanitaryLatrine: 0, wasteSegregation: 0 },
            logbook: {
                visits: raw.logbook?.visits || 0,
                reflections: raw.logbook?.reflections || 0,
                visitLog: Array.isArray(raw.logbook?.visitLog) ? raw.logbook.visitLog : [],
                reflectionLog: Array.isArray(raw.logbook?.reflectionLog) ? raw.logbook.reflectionLog : []
            },
            familyDetails: Array.isArray(raw.familyDetails) ? raw.familyDetails : [],
            assessmentSummary: raw.assessmentSummary || {},
            interventionSummary: raw.interventionSummary || { completed: 0, pending: 0, total: 0, byType: {} }
        };
    };

    useEffect(() => {
        if (!profile?.id) return;

        const loadReport = async () => {
            try {
                // Check cache first (5 minute cache)
                const cacheKey = `analytics_${profile.id}`;
                const persistentCacheKey = `analytics_persistent_${profile.id}`;
                let cached = null;
                try {
                    cached = sessionStorage.getItem(cacheKey);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        const timestamp = Number(parsed?.timestamp);
                        const cachedReport = sanitizeReportData(parsed?.reportData);
                        // Use cache if less than 5 minutes old
                        if (Number.isFinite(timestamp) && Date.now() - timestamp < 300000 && cachedReport) {
                            console.log('[Reports] Using cached data');
                            setData(cachedReport);
                            setLoading(false);
                            return;
                        }
                    }

                    // Persistent offline fallback
                    const persistent = await get(persistentCacheKey);
                    const persistentTimestamp = Number(persistent?.timestamp);
                    const persistentReport = sanitizeReportData(persistent?.reportData);
                    if (Number.isFinite(persistentTimestamp) && persistentReport) {
                        setData(persistentReport);
                        setLoading(false);
                    }
                } catch (cacheErr) {
                    console.warn('[Reports] Invalid analytics cache. Clearing.', cacheErr);
                    sessionStorage.removeItem(cacheKey);
                }

                // Generate fresh report
                console.log('[Reports] Generating fresh analytics...');
                const result = await withRetry(() => generateCommunityHealthReport(profile.id), { retries: 2 });

                const sanitized = sanitizeReportData(result);
                if (sanitized) {
                    console.log('[Reports] Data loaded:', {
                        families: sanitized.demographics?.totalFamilies,
                        members: sanitized.demographics?.totalPopulation,
                        visits: sanitized.logbook?.visits,
                        reflections: sanitized.logbook?.reflections,
                        visitLog: sanitized.logbook?.visitLog?.length,
                        reflectionLog: sanitized.logbook?.reflectionLog?.length,
                        familyDetails: sanitized.familyDetails?.length
                    });
                    setData(sanitized);
                    // Cache the result
                    const payload = { timestamp: Date.now(), reportData: sanitized };
                    sessionStorage.setItem(cacheKey, JSON.stringify(payload));
                    await set(persistentCacheKey, payload);
                }
                setLoading(false);
            } catch (error) {
                console.error('[Reports] Error loading report:', error);
                // Last chance persistent fallback when online fetch fails
                try {
                    const persistent = await get(`analytics_persistent_${profile.id}`);
                    const fallback = sanitizeReportData(persistent?.reportData);
                    if (fallback) setData(fallback);
                } catch (fallbackErr) {
                    console.warn('[Reports] Persistent fallback failed:', fallbackErr);
                }
                setLoading(false);
            }
        };

        loadReport();

        // Load feedback for students
        if (profile?.id && profile?.role === 'student') {
            const loadFeedback = async () => {
                const { data, error } = await supabase
                    .from('teacher_student_mappings')
                    .select(`
                        teacher_id,
                        assigned_at,
                        notes, 
                        teacher:profiles!teacher_id(full_name, department)
                    `)
                    .eq('student_id', profile.id)
                    .eq('is_active', true)
                    .order('assigned_at', { ascending: false })
                    .limit(5);

                if (error) {
                    console.warn('[Reports] Could not load mentor feedback mapping:', error);
                    setFeedback(null);
                    return;
                }

                const rows = data || [];
                const resolved = rows.find((row) => row?.teacher?.full_name) || rows[0] || null;
                setFeedback(resolved);
            };
            loadFeedback();
        }
    }, [profile?.id, profile?.role]);

    useEffect(() => {
        const beforePrint = () => setIsPrintMode(true);
        const afterPrint = () => setIsPrintMode(false);
        window.addEventListener('beforeprint', beforePrint);
        window.addEventListener('afterprint', afterPrint);
        return () => {
            window.removeEventListener('beforeprint', beforePrint);
            window.removeEventListener('afterprint', afterPrint);
        };
    }, []);

    if (authLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <LoadingSpinner size={40} />
            </div>
        );
    }

    if (!profile?.id) {
        return (
            <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#6B7280' }}>Loading your profile…</p>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    const refreshData = () => {
        sessionStorage.removeItem(`analytics_${profile.id}`);
        del(`analytics_persistent_${profile.id}`).catch(() => {});
        setLoading(true);
        withRetry(() => generateCommunityHealthReport(profile.id), { retries: 2 }).then(result => {
            const sanitized = sanitizeReportData(result);
            setData(sanitized);
            const payload = { timestamp: Date.now(), reportData: sanitized };
            sessionStorage.setItem(`analytics_${profile.id}`, JSON.stringify(payload));
            set(`analytics_persistent_${profile.id}`, payload).catch(() => {});
            setLoading(false);
        }).catch(err => {
            console.error('[Reports] Refresh failed:', err);
            setLoading(false);
        });
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Generating Comprehensive Analytics...</div>;

    if (!data) return (
        <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#6B7280' }}>No data available. Please add family members to generate reports.</p>
        </div>
    );

    const { demographics, maternalHealth, childHealth, morbidity, socioEconomic, environmental, logbook, familyDetails, assessmentSummary, interventionSummary } = sanitizeReportData(data) || {};

    return (
        <div>
            <div className="reports-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="page-title">Reports & Logbook</h1>
                    <p className="page-subtitle">Comprehensive analytics of your FAP journey</p>
                </div>
                <div className="reports-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline no-print" onClick={refreshData}>
                        Refresh
                    </button>
                    <button className="btn btn-primary" onClick={handlePrint}>
                        <Download size={18} /> Export / Print
                    </button>
                </div>
            </div>

            {/* Tabs - All tabs visible to all users */}
            <div className="reports-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #E5E7EB', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setActiveTab('community')}
                    style={{
                        padding: '1rem',
                        borderBottom: activeTab === 'community' ? '3px solid var(--color-primary)' : 'none',
                        color: activeTab === 'community' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: '600',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Community Health Report
                </button>
                <button
                    onClick={() => setActiveTab('logbook')}
                    style={{
                        padding: '1rem',
                        borderBottom: activeTab === 'logbook' ? '3px solid var(--color-primary)' : 'none',
                        color: activeTab === 'logbook' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: '600',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Logbook & Visits
                </button>
                <button
                    onClick={() => setActiveTab('families')}
                    style={{
                        padding: '1rem',
                        borderBottom: activeTab === 'families' ? '3px solid var(--color-primary)' : 'none',
                        color: activeTab === 'families' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: '600',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Family Details
                </button>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-show { display: block !important; }
                    .print-break { page-break-before: always; }
                    .section-visible.print-break { page-break-before: auto; }
                    body { background: white; font-size: 12pt; }
                    .card { box-shadow: none !important; border: 1px solid #ddd !important; break-inside: avoid; }
                    h1, h2, h3 { color: black !important; }
                    .grid-layout { display: block !important; }
                    .grid-layout > div { marginBottom: 2rem; }
                    .print-full-content { max-height: none !important; overflow: visible !important; }
                    .print-no-truncate { max-width: none !important; overflow: visible !important; text-overflow: clip !important; white-space: normal !important; }
                }
                .section-hidden { display: none; }
                .section-visible { display: block; }
                @media print {
                    .section-hidden { display: none !important; }
                    .section-visible { display: block !important; }
                }
                @media (max-width: 640px) {
                    .reports-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .reports-actions {
                        width: 100%;
                        flex-direction: column;
                    }
                    .reports-actions .btn {
                        width: 100%;
                        justify-content: center;
                    }
                    .reports-tabs button {
                        padding: 0.75rem;
                        font-size: 0.85rem;
                    }
                }
            `}</style>

            {/* ========== COMMUNITY SECTION ========== */}
            <div className={activeTab === 'community' ? 'section-visible' : 'section-hidden'}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <ReportCard label="Total Population" value={demographics.totalPopulation} subtext={`${demographics.totalFamilies} Families`} color="#3B82F6" />
                    <ReportCard label="Gender Ratio" value={demographics.genderRatio.ratio} subtext="Females per 1000 Males" color="#EC4899" />
                    <ReportCard label="Dependency Ratio" value={`${demographics.dependencyRatio}%`} subtext="Dependent / Working" color="#F59E0B" />
                    <ReportCard label="Morbidity Load" value={Object.values(morbidity).reduce((a, b) => a + b, 0)} subtext="Active Conditions" color="#EF4444" />
                </div>

                <div className="grid-layout grid-2" style={{ marginBottom: '3rem' }}>
                    {/* Demographic Profile */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <SectionHeader icon={Users} title="Demographic Profile" color="#1E3A8A" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {Object.entries(demographics.ageDistribution).map(([group, count]) => (
                                <div key={group}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                        <span>{group} years</span>
                                        <span style={{ fontWeight: '600' }}>{demographics.totalPopulation > 0 ? Math.round((count / demographics.totalPopulation) * 100) : 0}% ({count})</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px' }}>
                                        <div style={{ width: `${demographics.totalPopulation > 0 ? (count / demographics.totalPopulation) * 100 : 0}%`, height: '100%', backgroundColor: '#60A5FA', borderRadius: '4px' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Socio-Economic Status */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <SectionHeader icon={TrendingUp} title="Socio-Economic Status" color="#059669" />
                        <div className="grid-layout grid-2">
                            {Object.entries(socioEconomic).map(([cls, val]) => (
                                <div key={cls} style={{ padding: '1rem', border: '1px solid #E5E7EB', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ textTransform: 'capitalize', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{cls.replace(/([A-Z])/g, ' $1').trim()} Class</div>
                                    <div style={{ fontWeight: '700', fontSize: '1.25rem' }}>{val}%</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MCH & Morbidity */}
                <div className="grid-layout grid-2" style={{ marginBottom: '3rem' }}>
                    <div className="card" style={{ padding: '2rem' }}>
                        <SectionHeader icon={Baby} title="Maternal & Child Health" color="#DB2777" />
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: '#9D174D' }}>Antenatal Care</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#FCE7F3', borderRadius: 'var(--radius-md)' }}>
                                    <span>Registered</span> <span style={{ fontWeight: '700' }}>{maternalHealth.registeredPregnancies}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#FCE7F3', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
                                    <span>High Risk</span> <span style={{ fontWeight: '700', color: '#BE123C' }}>{maternalHealth.highRiskPregnancies}</span>
                                </div>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: '#047857' }}>Under-5 Children</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#D1FAE5', borderRadius: 'var(--radius-md)' }}>
                                    <span>Total Children</span> <span style={{ fontWeight: '700' }}>{childHealth.totalUnder5}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#D1FAE5', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
                                    <span>Partially/Unimmunized</span> <span style={{ fontWeight: '700', color: '#B45309' }}>{childHealth.totalUnder5 - childHealth.fullyImmunized}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '2rem' }}>
                        <SectionHeader icon={Activity} title="Disease Burden" color="#DC2626" />
                        {Object.keys(morbidity).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No conditions recorded.</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {Object.entries(morbidity)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([disease, count]) => (
                                            <tr key={disease} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                <td style={{ padding: '0.75rem 0' }}>{disease}</td>
                                                <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 'bold' }}>{count}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Environmental Health */}
                <div className="card" style={{ padding: '2rem' }}>
                    <SectionHeader icon={Droplets} title="Environmental Health Indicators" color="#0891B2" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '2rem', textAlign: 'center' }}>
                        <div>
                            <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: '800', color: '#0891B2' }}>{environmental.safeWater}%</div>
                            <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>Safe Drinking Water</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: '800', color: '#059669' }}>{environmental.sanitaryLatrine}%</div>
                            <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>Sanitary Latrine</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: '800', color: '#D97706' }}>{environmental.wasteSegregation}%</div>
                            <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>Waste Segregation</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== LOGBOOK SECTION ========== */}
            <div className={`print-break ${activeTab === 'logbook' ? 'section-visible' : 'section-hidden'}`}>
                <h2 className="print-show" style={{ display: 'none', marginTop: '2rem', marginBottom: '1rem', borderBottom: '2px solid black' }}>Logbook & Visits</h2>

                {/* Summary Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <ReportCard label="Total Visits" value={logbook.visits} subtext="Home visits conducted" color="#3B82F6" />
                    <ReportCard label="Reflections" value={logbook.reflections} subtext="Journal entries" color="#10B981" />
                    <ReportCard label="Graded" value={logbook.gradingSummary?.totalGraded || 0} subtext={logbook.gradingSummary?.avgScore ? `Avg: ${logbook.gradingSummary.avgScore}` : 'None graded'} color="#8B5CF6" />
                    <ReportCard 
                        label="Assessments" 
                        value={Object.values(assessmentSummary || {}).reduce((a, b) => a + b.count, 0)} 
                        subtext="Forms completed" 
                        color="#F59E0B" 
                    />
                </div>

                {/* Mentor Feedback */}
                <div className="card" style={{ padding: '2rem', borderLeft: '4px solid #8B5CF6', marginBottom: '2rem' }}>
                    <SectionHeader icon={UserCheck} title="Faculty Mentor Feedback" color="#7C3AED" />
                    {feedback ? (
                        <div>
                            <div style={{ marginBottom: '1rem' }}>
                                <span style={{ fontWeight: 'bold', color: '#5B21B6' }}>Mentor: </span>
                                <span>
                                    {feedback.teacher?.full_name
                                        ? `${feedback.teacher.full_name} (${feedback.teacher?.department || 'Faculty Mentor'})`
                                        : 'Assigned mentor (name unavailable due to profile access settings)'}
                                </span>
                            </div>
                            <div style={{ backgroundColor: '#F5F3FF', padding: '1.5rem', borderRadius: '8px', color: '#4C1D95' }}>
                                "{feedback.notes || 'No specific feedback notes added yet.'}"
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: '#6B7280' }}>No mentor assigned or feedback available.</p>
                    )}
                </div>

                {/* Visit Log */}
                <ExpandableCard title={`Visit History (${logbook.visitLog?.length || 0} Visits)`} icon={Calendar} defaultOpen={true} forceOpen={isPrintMode}>
                    {logbook.visitLog?.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                            <Clock size={32} style={{ color: '#CBD5E1', marginBottom: '0.5rem' }} />
                            <p>No visits recorded yet.</p>
                            <button className='btn btn-outline no-print' onClick={() => navigate('/families')} style={{ marginTop: '1rem' }}>
                                Record First Visit
                            </button>
                        </div>
                    ) : (
                        <div className="print-full-content" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead style={{ background: '#F8FAFC', position: 'sticky', top: 0 }}>
                                    <tr>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Date</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Family</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Member</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Protocol</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logbook.visitLog.map((visit, idx) => (
                                        <tr key={visit.id || idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                            <td style={{ padding: '0.75rem' }}>{new Date(visit.date).toLocaleDateString()}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: '500' }}>{visit.familyName}</td>
                                            <td style={{ padding: '0.75rem' }}>{visit.memberName || '-'}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{ 
                                                    background: '#E0F2FE', 
                                                    color: '#0369A1', 
                                                    padding: '0.25rem 0.5rem', 
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem'
                                                }}>
                                                    {visit.protocol.replace(/_v\d+$/, '').replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="print-no-truncate" style={{ padding: '0.75rem', color: '#6B7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {visit.notes || visit.reflection || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ExpandableCard>

                {/* Reflection Log */}
                <ExpandableCard title={`Reflections & Journals (${logbook.reflectionLog?.length || 0} Entries)`} icon={BookOpen} forceOpen={isPrintMode}>
                    {logbook.reflectionLog?.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                            <FileText size={32} style={{ color: '#CBD5E1', marginBottom: '0.5rem' }} />
                            <p>No reflections written yet.</p>
                            <button className='btn btn-outline no-print' onClick={() => navigate('/reflections')} style={{ marginTop: '1rem' }}>
                                Write First Reflection
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {logbook.reflectionLog.slice(0, 10).map((ref, idx) => (
                                <div key={ref.id || idx} style={{ 
                                    padding: '1rem', 
                                    border: '1px solid #E5E7EB', 
                                    borderRadius: '8px',
                                    borderLeft: `4px solid ${ref.status === 'Graded' ? '#10B981' : '#3B82F6'}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                                {new Date(ref.date).toLocaleDateString()} • {ref.phase}
                                            </span>
                                            <div style={{ fontWeight: '600', marginTop: '0.25rem' }}>
                                                {ref.description ? ref.description.substring(0, 80) + '...' : ref.fileName || 'Reflection Entry'}
                                            </div>
                                        </div>
                                        {ref.status === 'Graded' && (
                                            <div style={{ 
                                                background: '#10B981', 
                                                color: 'white', 
                                                padding: '0.25rem 0.75rem', 
                                                borderRadius: '20px',
                                                fontSize: '0.875rem',
                                                fontWeight: '600'
                                            }}>
                                                {ref.grade} ({ref.totalScore} pts)
                                            </div>
                                        )}
                                    </div>
                                    
                                    {ref.mentorFeedback && (
                                        <div style={{ 
                                            marginTop: '0.75rem', 
                                            padding: '0.75rem', 
                                            background: '#F0FDF4', 
                                            borderRadius: '6px',
                                            fontSize: '0.875rem'
                                        }}>
                                            <strong style={{ color: '#166534' }}>Mentor Feedback:</strong> {ref.mentorFeedback}
                                        </div>
                                    )}

                                    {ref.analysis && (
                                        <div style={{ 
                                            marginTop: '0.5rem', 
                                            fontSize: '0.875rem',
                                            color: '#4B5563',
                                            fontStyle: 'italic'
                                        }}>
                                            "{ref.analysis.substring(0, 150)}..."
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {logbook.reflectionLog.length > 10 && (
                                <button className='btn btn-outline no-print' onClick={() => navigate('/reflections')}>
                                    View All {logbook.reflectionLog.length} Reflections
                                </button>
                            )}
                        </div>
                    )}
                </ExpandableCard>

                {/* Assessment Summary */}
                <ExpandableCard title="Assessment Types Completed" icon={ClipboardList} forceOpen={isPrintMode}>
                    {Object.keys(assessmentSummary || {}).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>No assessments completed yet.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {Object.entries(assessmentSummary).map(([formId, data]) => (
                                <div key={formId} style={{ 
                                    padding: '1rem', 
                                    background: '#F8FAFC', 
                                    borderRadius: '8px',
                                    border: '1px solid #E2E8F0'
                                }}>
                                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                        {formId.replace(/_v\d+$/, '').replace(/_/g, ' ')}
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                        {data.count}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                        {data.uniqueMembers} unique members
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ExpandableCard>

                {/* Intervention Summary */}
                <ExpandableCard title="Interventions Tracking" icon={Target} forceOpen={isPrintMode}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ textAlign: 'center', padding: '1rem', background: '#F0FDF4', borderRadius: '8px' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10B981' }}>{interventionSummary?.completed || 0}</div>
                            <div style={{ fontSize: '0.875rem', color: '#047857' }}>Completed</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem', background: '#FEF3C7', borderRadius: '8px' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#D97706' }}>{interventionSummary?.pending || 0}</div>
                            <div style={{ fontSize: '0.875rem', color: '#B45309' }}>Pending</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem', background: '#EFF6FF', borderRadius: '8px' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3B82F6' }}>{interventionSummary?.total || 0}</div>
                            <div style={{ fontSize: '0.875rem', color: '#1D4ED8' }}>Total</div>
                        </div>
                    </div>
                    
                    {interventionSummary?.byType && Object.keys(interventionSummary.byType).length > 0 && (
                        <div>
                            <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>By Type:</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {Object.entries(interventionSummary.byType).map(([type, count]) => (
                                    <span key={type} style={{ 
                                        background: '#E5E7EB', 
                                        padding: '0.25rem 0.75rem', 
                                        borderRadius: '20px',
                                        fontSize: '0.875rem'
                                    }}>
                                        {type}: {count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </ExpandableCard>
            </div>

            {/* ========== FAMILY DETAILS SECTION ========== */}
            <div className={`print-break ${activeTab === 'families' ? 'section-visible' : 'section-hidden'}`}>
                <h2 className="print-show" style={{ display: 'none', marginTop: '2rem', marginBottom: '1rem', borderBottom: '2px solid black' }}>Family Details</h2>

                {familyDetails?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                        <Home size={48} style={{ color: '#CBD5E1', marginBottom: '1rem' }} />
                        <p>No families adopted yet.</p>
                        <button className='btn btn-primary no-print' onClick={() => navigate('/families')} style={{ marginTop: '1rem' }}>
                            Add First Family
                        </button>
                    </div>
                ) : (
                    familyDetails.map(family => (
                        <div key={family.id} className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
                            {/* Family Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                                        <Home size={20} style={{ marginRight: '0.5rem', color: 'var(--color-primary)' }} />
                                        {family.headName}
                                    </h3>
                                    {family.address && (
                                        <p style={{ color: '#6B7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                            <MapPin size={14} style={{ marginRight: '0.25rem' }} />
                                            {family.address}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: '#EFF6FF', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#3B82F6' }}>{family.memberCount}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#1D4ED8' }}>Members</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: '#F0FDF4', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10B981' }}>{family.totalVisits}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#047857' }}>Visits</div>
                                    </div>
                                </div>
                            </div>

                            {/* Members Table */}
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead style={{ background: '#F8FAFC' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Member</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Age/Gender</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>BMI</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>BP</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Assessments</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Problems</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {family.members.map(member => (
                                            <tr key={member.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <div style={{ fontWeight: '500' }}>{member.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{member.relationship}</div>
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    {member.age}y / {member.gender?.charAt(0)}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    {member.latestVitals?.bmi ? (
                                                        <span style={{ 
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '4px',
                                                            background: member.latestVitals.bmiCategory === 'Normal' ? '#D1FAE5' : '#FEF3C7',
                                                            color: member.latestVitals.bmiCategory === 'Normal' ? '#047857' : '#B45309',
                                                            fontWeight: '500'
                                                        }}>
                                                            {member.latestVitals.bmi}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    {member.latestVitals?.bp || '-'}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    {member.assessmentCount}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    {member.problemCount > 0 ? (
                                                        <span style={{ color: '#EF4444', fontWeight: '500' }}>{member.problemCount}</span>
                                                    ) : (
                                                        <CheckCircle size={16} style={{ color: '#10B981' }} />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {family.lastVisit && (
                                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#6B7280' }}>
                                    Last visited: {new Date(family.lastVisit).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Reports;
