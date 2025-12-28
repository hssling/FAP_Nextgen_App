import React, { useEffect, useState } from 'react';
import {
    BarChart, Activity, Users, Droplets, Heart, FileText, Download,
    PieChart, TrendingUp, AlertTriangle, Baby, BookOpen, UserCheck
} from 'lucide-react';
import { generateCommunityHealthReport } from '../services/analytics';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

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

const Reports = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('community');
    const [feedback, setFeedback] = useState(null);

    useEffect(() => {
        if (!profile) return;

        const loadReport = async () => {
            try {
                // Check cache first (5 minute cache)
                const cacheKey = `analytics_${profile.id}`;
                const cached = sessionStorage.getItem(cacheKey);

                if (cached) {
                    const { timestamp, reportData } = JSON.parse(cached);
                    // Use cache if less than 5 minutes old
                    if (Date.now() - timestamp < 300000) {
                        console.log('[Reports] Using cached data');
                        setData(reportData);
                        setLoading(false);
                        return;
                    }
                }

                // Generate fresh report
                console.log('[Reports] Generating fresh analytics...');
                const result = await generateCommunityHealthReport(profile.id);

                if (result) {
                    setData(result);
                    // Cache the result
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        reportData: result
                    }));
                }
                setLoading(false);
            } catch (error) {
                console.error('[Reports] Error loading report:', error);
                setLoading(false);
            }
        };

        loadReport();

        // Load feedback for students
        if (profile?.role === 'student') {
            const loadFeedback = async () => {
                const { data } = await supabase
                    .from('teacher_student_mappings')
                    .select(`
                        notes, 
                        teacher:profiles!teacher_id(full_name, department)
                    `)
                    .eq('student_id', profile.id)
                    .eq('is_active', true)
                    .maybeSingle(); // Use maybeSingle to avoid error if no mentor
                setFeedback(data);
            };
            loadFeedback();
        }
    }, [profile]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Generating Analytics...</div>;

    const { demographics, MaternalHealth, childHealth, morbidity, socioEconomic, environmental } = data;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">Reports & Logbook</h1>
                    <p className="page-subtitle">Track community health status and your personal progress</p>
                </div>
                <button className="btn btn-primary" onClick={handlePrint}>
                    <Download size={18} /> Export / Print
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #E5E7EB' }}>
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
                {profile?.role === 'student' && (
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
                        My Logbook & Feedback
                    </button>
                )}
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-show { display: block !important; }
                    .print-break { page-break-before: always; }
                    body { background: white; font-size: 12pt; }
                    .card { box-shadow: none !important; border: 1px solid #ddd !important; break-inside: avoid; }
                    h1, h2, h3 { color: black !important; }
                    /* Force grid to be readable on print */
                    .grid-layout { display: block !important; }
                    .grid-layout > div { marginBottom: 2rem; }
                }
                .section-hidden { display: none; }
                .section-visible { display: block; }
                @media print {
                    .section-hidden { display: block !important; }
                }
            `}</style>

            {/* Content Container - Renders BOTH but hides one on screen */}

            {/* Community Section */}
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
                                        <span style={{ fontWeight: '600' }}>{Math.round((count / demographics.totalPopulation) * 100)}% ({count})</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px' }}>
                                        <div style={{ width: `${(count / demographics.totalPopulation) * 100}%`, height: '100%', backgroundColor: '#60A5FA', borderRadius: '4px' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Socio-Economic Status (Kuppuswamy) */}
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
                                    <span>Registered</span> <span style={{ fontWeight: '700' }}>{data.maternalHealth.registeredPregnancies}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#FCE7F3', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
                                    <span>High Risk</span> <span style={{ fontWeight: '700', color: '#BE123C' }}>{data.maternalHealth.highRiskPregnancies}</span>
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
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No data available.</div>
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

                {/* Environmental Health - Fixed Grid for Mobile */}
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

            {/* Logbook Section - Printed always, shown on tab */}
            <div className={`print-break ${activeTab === 'logbook' ? 'section-visible' : 'section-hidden'}`}>
                {/* Print Title for second section */}
                <h2 className="print-show" style={{ display: 'none', marginTop: '2rem', marginBottom: '1rem', borderBottom: '2px solid black' }}>Logbook & Feedback</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Mentor Feedback */}
                    <div className="card" style={{ padding: '2rem', borderLeft: '4px solid #8B5CF6' }}>
                        <SectionHeader icon={UserCheck} title="Faculty Mentor Feedback" color="#7C3AED" />
                        {feedback ? (
                            <div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <span style={{ fontWeight: 'bold', color: '#5B21B6' }}>Mentor: </span>
                                    <span>{feedback.teacher?.full_name} ({feedback.teacher?.department})</span>
                                </div>
                                <div style={{ backgroundColor: '#F5F3FF', padding: '1.5rem', borderRadius: '8px', color: '#4C1D95' }}>
                                    "{feedback.notes || 'No specific feedback notes added yet.'}"
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: '#6B7280' }}>No mentor assigned or feedback available.</p>
                        )}
                    </div>

                    {/* Progress Stats */}
                    <div className="grid-layout grid-2">
                        <div className="card" style={{ padding: '2rem' }}>
                            <SectionHeader icon={FileText} title="Logbook Entries" color="#F97316" />
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <p style={{ fontSize: '3rem', fontWeight: '800', color: '#EA580C' }}>
                                    {data?.logbook?.visits || '--'} {/* Assuming analytics returns this or we fetch it */}
                                </p>
                                <p>Family Visits Recorded</p>
                                <button className='btn btn-outline no-print' onClick={() => navigate('/families')}>View Families</button>
                            </div>
                        </div>
                        <div className="card" style={{ padding: '2rem' }}>
                            <SectionHeader icon={BookOpen} title="Reflections" color="#10B981" />
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <p style={{ fontSize: '3rem', fontWeight: '800', color: '#059669' }}>
                                    {data?.logbook?.reflections || '--'}
                                </p>
                                <p>Reflection Journals</p>
                                <button className='btn btn-outline no-print' onClick={() => navigate('/reflections')}>Write Reflection</button>
                            </div>
                        </div>
                    </div>

                    {/* Health Trajectories */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <SectionHeader icon={Activity} title="Health Trajectories" color="#EF4444" />
                        <p style={{ marginBottom: '1rem', color: '#4B5563' }}>
                            View longitudinal health data (Blood Pressure, BMI trends) for your adopted families in the Tools section.
                        </p>
                        <button className="btn btn-primary no-print" onClick={() => navigate('/tools')}>
                            Open Health Analytics Tools
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
