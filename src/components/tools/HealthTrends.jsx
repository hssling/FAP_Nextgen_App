import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

const HealthTrends = () => {
    const { profile } = useAuth();
    const [families, setFamilies] = useState([]);
    const [members, setMembers] = useState([]);
    const [selectedFamilyId, setSelectedFamilyId] = useState('');
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        if (profile) loadFamilies();
    }, [profile]);

    useEffect(() => {
        if (selectedFamilyId) {
            loadMembers();
            setChartData([]); // Reset chart
        }
    }, [selectedFamilyId]);

    useEffect(() => {
        if (selectedMemberId) {
            loadHealthData();
        }
    }, [selectedMemberId]);

    const loadFamilies = async () => {
        const { data } = await supabase.from('families').select('id, head_name').eq('student_id', profile.id);
        setFamilies(data || []);
    };

    const loadMembers = async () => {
        const { data } = await supabase.from('family_members').select('*').eq('family_id', selectedFamilyId);
        setMembers(data || []);
    };

    const loadHealthData = async () => {
        // Fetch ALL visits for this family (simple filtering in JS for now as member_id is in JSONB)
        const { data, error } = await supabase
            .from('family_visits')
            .select('*')
            .eq('family_id', selectedFamilyId)
            .order('visit_date', { ascending: true });

        if (error) {
            console.error('Error loading visits', error);
            return;
        }

        const trends = [];
        data.forEach(visit => {
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

                // Extract Weight
                // Could be 'weight' or 'weight_tracking' (from under 5 form?)
                // Registry says 'weight_tracking' is green/yellow/orange options, NOT number.
                // Registry says 'weight' is not in under_5 form!! It uses Growth Chart color.
                // Does ANC have weight? No.
                // Does NCD have weight? Probably. 
                // I will add weight to newVisit.data manually if needed or assume NCD form has it.
                // If the user inputs numerical weight, we graph it.
                if (d.weight && !isNaN(parseFloat(d.weight))) {
                    point.weight = parseFloat(d.weight);
                    hasData = true;
                }

                // Extract HB
                if (d.haemoglobin) {
                    point.hb = parseFloat(d.haemoglobin);
                    hasData = true;
                }

                if (hasData) trends.push(point);
            }
        });

        setChartData(trends);
    };

    return (
        <div className="tool-card" style={{ minHeight: '400px' }}>
            <h3>Health Trends Analytics</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                Select a member to view their physiological trends over time.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <select
                    className="form-control"
                    value={selectedFamilyId}
                    onChange={e => { setSelectedFamilyId(e.target.value); setSelectedMemberId(''); }}
                >
                    <option value="">Select Family</option>
                    {families.map(f => <option key={f.id} value={f.id}>{f.head_name}</option>)}
                </select>

                <select
                    className="form-control"
                    value={selectedMemberId}
                    onChange={e => setSelectedMemberId(e.target.value)}
                    disabled={!selectedFamilyId}
                >
                    <option value="">Select Member</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>

            {selectedMemberId && chartData.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#999', border: '1px dashed #ccc' }}>
                    No numerical health metrics (BP, Weight, Hb) found for this member.
                    <br /><small>Log visits with "ANC" or "NCD" protocols to capture vitals.</small>
                </div>
            )}

            {chartData.length > 0 && (
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <LineChart
                            data={chartData}
                            margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                            <XAxis dataKey="date" style={{ fontSize: '0.8rem' }} />
                            <YAxis style={{ fontSize: '0.8rem' }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend />
                            <Line connectNulls type="monotone" dataKey="systolic" stroke="#ef4444" activeDot={{ r: 8 }} name="Systolic BP" strokeWidth={2} />
                            <Line connectNulls type="monotone" dataKey="diastolic" stroke="#3b82f6" name="Diastolic BP" strokeWidth={2} />
                            <Line connectNulls type="monotone" dataKey="weight" stroke="#10b981" name="Weight (kg)" strokeWidth={2} strokeDasharray="5 5" />
                            <Line connectNulls type="monotone" dataKey="hb" stroke="#8b5cf6" name="Hemoglobin (g/dL)" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default HealthTrends;
