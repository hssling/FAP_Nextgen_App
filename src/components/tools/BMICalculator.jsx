import React, { useState } from 'react';

const BMICalculator = () => {
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [bmi, setBmi] = useState(null);
    const [status, setStatus] = useState('');

    const calculateBMI = (e) => {
        e.preventDefault();
        if (weight && height) {
            const heightInMeters = height / 100;
            const bmiValue = (weight / (heightInMeters * heightInMeters)).toFixed(2);
            setBmi(bmiValue);

            let bmiStatus = '';
            if (bmiValue < 18.5) bmiStatus = 'Underweight';
            else if (bmiValue >= 18.5 && bmiValue < 24.9) bmiStatus = 'Normal Weight';
            else if (bmiValue >= 25 && bmiValue < 29.9) bmiStatus = 'Overweight';
            else bmiStatus = 'Obese';

            setStatus(bmiStatus);
        }
    };

    const getStatusColor = (status) => {
        if (status === 'Underweight') return '#eab308'; // Yellow
        if (status === 'Normal Weight') return '#22c55e'; // Green
        if (status === 'Overweight') return '#f97316'; // Orange
        if (status === 'Obese') return '#ef4444'; // Red
        return '#333';
    };

    return (
        <div className="tool-card">
            <h3>BMI Calculator</h3>
            <form onSubmit={calculateBMI} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>Weight (kg)</label>
                    <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="e.g. 70"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>Height (cm)</label>
                    <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="e.g. 175"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                        required
                    />
                </div>
                <button
                    type="submit"
                    style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        padding: '0.75rem',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                        marginTop: '0.5rem'
                    }}
                >
                    Calculate BMI
                </button>
            </form>

            {bmi && (
                <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getStatusColor(status) }}>{bmi}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '500', color: '#475569' }}>{status}</div>
                </div>
            )}
        </div>
    );
};

export default BMICalculator;
