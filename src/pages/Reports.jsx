import React, { useEffect, useState } from 'react';
import {
    BarChart, Activity, Users, Droplets, Heart, FileText, Download,
    PieChart, TrendingUp, AlertTriangle, Baby
} from 'lucide-react';
import { generateCommunityHealthReport } from '../services/analytics';

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
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadReport = async () => {
            const result = await generateCommunityHealthReport();
            setData(result);
            setLoading(false);
        };
        loadReport();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Generatiing Analytics...</div>;

    const { demographics, MaternalHealth, childHealth, morbidity, socioEconomic, environmental } = data;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">Comprehensive Health Report</h1>
                    <p className="page-subtitle">Analytical overview of adopted community</p>
                </div>
                <button className="btn btn-primary" onClick={handlePrint}>
                    <Download size={18} /> Export / Print
                </button>
            </div>

            {/* Executive Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <ReportCard label="Total Population" value={demographics.totalPopulation} subtext={`${demographics.totalFamilies} Families`} color="#3B82F6" />
                <ReportCard label="Gender Ratio" value={demographics.genderRatio.ratio} subtext="Females per 1000 Males" color="#EC4899" />
                <ReportCard label="Dependency Ratio" value={`${demographics.dependencyRatio}%`} subtext="Dependent / Working" color="#F59E0B" />
                <ReportCard label="Morbidity Load" value={Object.values(morbidity).reduce((a, b) => a + b, 0)} subtext="Active Conditions" color="#EF4444" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
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

            {/* Environmental Health */}
            <div className="card" style={{ padding: '2rem' }}>
                <SectionHeader icon={Droplets} title="Environmental Health Indicators" color="#0891B2" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', textAlign: 'center' }}>
                    <div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0891B2' }}>{environmental.safeWater}%</div>
                        <div style={{ fontWeight: '500' }}>Safe Drinking Water</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#059669' }}>{environmental.sanitaryLatrine}%</div>
                        <div style={{ fontWeight: '500' }}>Sanitary Latrine</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#D97706' }}>{environmental.wasteSegregation}%</div>
                        <div style={{ fontWeight: '500' }}>Waste Segregation</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
