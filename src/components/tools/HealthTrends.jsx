import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

const data = [
    { name: 'Jan', systolic: 120, diastolic: 80, weight: 65 },
    { name: 'Feb', systolic: 122, diastolic: 82, weight: 65.5 },
    { name: 'Mar', systolic: 118, diastolic: 78, weight: 64.8 },
    { name: 'Apr', systolic: 125, diastolic: 85, weight: 66 },
    { name: 'May', systolic: 121, diastolic: 81, weight: 65 },
    { name: 'Jun', systolic: 119, diastolic: 79, weight: 64.5 },
];

const HealthTrends = () => {
    return (
        <div className="tool-card" style={{ minHeight: '400px' }}>
            <h3>Health Trends (Example)</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                Visualizing longitudinal data (Blood Pressure & Weight)
            </p>

            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <LineChart
                        data={data}
                        margin={{
                            top: 5,
                            right: 30,
                            left: -20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="name" style={{ fontSize: '0.8rem' }} />
                        <YAxis style={{ fontSize: '0.8rem' }} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <Line type="monotone" dataKey="systolic" stroke="#ef4444" activeDot={{ r: 8 }} name="Systolic BP" strokeWidth={2} />
                        <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" name="Diastolic BP" strokeWidth={2} />
                        <Line type="monotone" dataKey="weight" stroke="#10b981" name="Weight (kg)" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default HealthTrends;
