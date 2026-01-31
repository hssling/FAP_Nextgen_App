import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, AlertCircle } from 'lucide-react';

const HealthTrends = () => {
    const { profile } = useAuth();
    const [families, setFamilies] = useState([]);
    const [members, setMembers] = useState([]);
    const [selectedFamilyId, setSelectedFamilyId] = useState('');
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (profile) loadFamilies();
    }, [profile]);

    useEffect(() => {
        if (selectedFamilyId) {
            loadMembers();
            setChartData([]);
            setSelectedMemberId('');
        }
    }, [selectedFamilyId]);

    useEffect(() => {
        if (selectedMemberId) {
            loadHealthData();
        }
    }, [selectedMemberId]);

    const loadFamilies = async () => {
        try {
            const { data, error } = await supabase
                .from('families')
                .select('id, head_name')
                .eq('student_id', profile.id);
            
            if (error) throw error;
            setFamilies(data || []);
        } catch (err) {
            console.error('Error loading families:', err);
            setError('Failed to load families');
        }
    };

    const loadMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('family_members')
                .select('id, name, health_data')
                .eq('family_id', selectedFamilyId);
            
            if (error) throw error;
            setMembers(data || []);
        } catch (err) {
            console.error('Error loading members:', err);
            setError('Failed to load family members');
        }
    };

    const loadHealthData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Find the selected member and extract their assessments
            const selectedMember = members.find(m => m.id === selectedMemberId);
            
            if (!selectedMember) {
                setChartData([]);
                return;
            }

            const healthData = selectedMember.health_data || {};
            const assessments = healthData.assessments || [];

            // Also try to fetch from family_visits for backward compatibility
            const { data: visits } = await supabase
                .from('family_visits')
                .select('*')
                .eq('family_id', selectedFamilyId)
                .order('visit_date', { ascending: true });

            const trends = [];

            // Process assessments from member's health_data
            assessments.forEach(assessment => {
                const point = {
                    date: assessment.date,
                    systolic: null,
                    diastolic: null,
                    weight: null,
                    height: null,
                    bmi: null,
                    hb: null,
                    rbs: null
                };

                let hasData = false;

                // Extract from Anthropometric Assessment
                if (assessment.formId === 'anthropometric_assessment_v1') {
                    const data = assessment.data || {};
                    
                    if (data.weight_kg) {
                        point.weight = parseFloat(data.weight_kg);
                        hasData = true;
                    }
                    if (data.height_cm) {
                        point.height = parseFloat(data.height_cm);
                    }
                    
                    // Calculate BMI if both height and weight exist
                    if (data.height_cm && data.weight_kg) {
                        const heightM = parseFloat(data.height_cm) / 100;
                        const weightKg = parseFloat(data.weight_kg);
                        if (heightM > 0 && weightKg > 0) {
                            point.bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
                            hasData = true;
                        }
                    }

                    // Use calculated BMI if stored
                    if (assessment.calculated_fields?.bmi?.bmi) {
                        point.bmi = parseFloat(assessment.calculated_fields.bmi.bmi);
                        hasData = true;
                    }
                }

                // Extract from NCD Screening
                if (assessment.formId === 'ncd_screening_v1') {
                    const data = assessment.data || {};
                    
                    if (data.bp_systolic && data.bp_diastolic) {
                        point.systolic = parseInt(data.bp_systolic);
                        point.diastolic = parseInt(data.bp_diastolic);
                        hasData = true;
                    }
                    
                    if (data.rbs) {
                        point.rbs = parseFloat(data.rbs);
                        hasData = true;
                    }
                }

                // Extract from ANC Assessment
                if (assessment.formId === 'antenatal_care_v1') {
                    const data = assessment.data || {};
                    
                    if (data.haemoglobin) {
                        point.hb = parseFloat(data.haemoglobin);
                        hasData = true;
                    }
                    
                    // BP might be in format "120/80"
                    if (data.bp && typeof data.bp === 'string' && data.bp.includes('/')) {
                        const parts = data.bp.split('/');
                        point.systolic = parseInt(parts[0]);
                        point.diastolic = parseInt(parts[1]);
                        hasData = true;
                    }
                }

                if (hasData) {
                    trends.push(point);
                }
            });

            // Also process family_visits for backward compatibility
            if (visits && visits.length > 0) {
                visits.forEach(visit => {
                    const d = visit.data || {};

                    // Allow data if explicitly linked to member
                    if (d.member_id === selectedMemberId) {
                        const point = {
                            date: visit.visit_date,
                            systolic: null,
                            diastolic: null,
                            weight: null,
                            hb: null
                        };

                        let hasData = false;

                        // Extract BP (Format "120/80")
                        if (d.bp && typeof d.bp === 'string' && d.bp.includes('/')) {
                            const parts = d.bp.split('/');
                            point.systolic = parseInt(parts[0]);
                            point.diastolic = parseInt(parts[1]);
                            hasData = true;
                        }

                        if (d.weight && !isNaN(parseFloat(d.weight))) {
                            point.weight = parseFloat(d.weight);
                            hasData = true;
                        }

                        if (d.haemoglobin) {
                            point.hb = parseFloat(d.haemoglobin);
                            hasData = true;
                        }

                        if (hasData) {
                            trends.push(point);
                        }
                    }
                });
            }

            // Sort by date and remove duplicates
            const sortedTrends = trends
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .filter((item, index, arr) => 
                    index === 0 || item.date !== arr[index - 1].date
                );

            setChartData(sortedTrends);
        } catch (err) {
            console.error('Error loading health data:', err);
            setError('Failed to load health data');
        } finally {
            setLoading(false);
        }
    };

    const selectedMemberName = members.find(m => m.id === selectedMemberId)?.name || '';

    return (
        <div className="tool-card" style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <TrendingUp size={24} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ margin: 0 }}>Health Trends Analytics</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                Track physiological trends from assessments over time.
            </p>

            {error && (
                <div style={{ 
                    padding: '0.75rem', 
                    background: '#FEE2E2', 
                    color: '#DC2626', 
                    borderRadius: '8px', 
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <select
                    className="form-control"
                    value={selectedFamilyId}
                    onChange={e => { setSelectedFamilyId(e.target.value); }}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                >
                    <option value="">Select Family</option>
                    {families.map(f => <option key={f.id} value={f.id}>{f.head_name}</option>)}
                </select>

                <select
                    className="form-control"
                    value={selectedMemberId}
                    onChange={e => setSelectedMemberId(e.target.value)}
                    disabled={!selectedFamilyId}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                >
                    <option value="">Select Member</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>

            {loading && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                    Loading health data...
                </div>
            )}

            {!loading && selectedMemberId && chartData.length === 0 && (
                <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#999', 
                    border: '1px dashed #ccc',
                    borderRadius: '8px',
                    background: '#FAFAFA'
                }}>
                    <AlertCircle size={32} style={{ color: '#CBD5E1', marginBottom: '0.5rem' }} />
                    <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                        No health metrics found for {selectedMemberName}
                    </div>
                    <small style={{ color: '#94A3B8' }}>
                        Add assessments (Anthropometric, NCD Screening, ANC) to see trends.
                    </small>
                </div>
            )}

            {!loading && chartData.length > 0 && (
                <>
                    <div style={{ 
                        marginBottom: '1rem', 
                        padding: '0.75rem', 
                        background: '#F0F9FF', 
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        color: '#0369A1'
                    }}>
                        Showing <strong>{chartData.length}</strong> data points for <strong>{selectedMemberName}</strong>
                    </div>
                    <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer>
                            <LineChart
                                data={chartData}
                                margin={{ top: 5, right: 30, left: -10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                <XAxis 
                                    dataKey="date" 
                                    style={{ fontSize: '0.75rem' }}
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        return `${date.getDate()}/${date.getMonth() + 1}`;
                                    }}
                                />
                                <YAxis style={{ fontSize: '0.75rem' }} />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '8px', 
                                        border: 'none', 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        fontSize: '0.875rem'
                                    }}
                                    labelFormatter={(value) => `Date: ${value}`}
                                />
                                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                                <Line 
                                    connectNulls 
                                    type="monotone" 
                                    dataKey="systolic" 
                                    stroke="#ef4444" 
                                    activeDot={{ r: 6 }} 
                                    name="Systolic BP" 
                                    strokeWidth={2} 
                                />
                                <Line 
                                    connectNulls 
                                    type="monotone" 
                                    dataKey="diastolic" 
                                    stroke="#3b82f6" 
                                    name="Diastolic BP" 
                                    strokeWidth={2} 
                                />
                                <Line 
                                    connectNulls 
                                    type="monotone" 
                                    dataKey="bmi" 
                                    stroke="#10b981" 
                                    name="BMI" 
                                    strokeWidth={2} 
                                />
                                <Line 
                                    connectNulls 
                                    type="monotone" 
                                    dataKey="weight" 
                                    stroke="#f59e0b" 
                                    name="Weight (kg)" 
                                    strokeWidth={2} 
                                    strokeDasharray="5 5" 
                                />
                                <Line 
                                    connectNulls 
                                    type="monotone" 
                                    dataKey="hb" 
                                    stroke="#8b5cf6" 
                                    name="Hb (g/dL)" 
                                    strokeWidth={2} 
                                />
                                <Line 
                                    connectNulls 
                                    type="monotone" 
                                    dataKey="rbs" 
                                    stroke="#ec4899" 
                                    name="RBS (mg/dL)" 
                                    strokeWidth={2} 
                                    strokeDasharray="3 3"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ 
                        marginTop: '1rem', 
                        padding: '0.75rem', 
                        background: '#F5F3FF', 
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        color: '#6B21A8'
                    }}>
                        💡 <strong>Tip:</strong> Add more assessments to see comprehensive health trends. 
                        Anthropometric assessments track BMI & weight. NCD screenings track BP & blood sugar.
                    </div>
                </>
            )}
        </div>
    );
};

export default HealthTrends;
