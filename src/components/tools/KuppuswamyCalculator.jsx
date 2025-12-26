import React, { useState, useEffect } from 'react';

const KuppuswamyCalculator = () => {
    const [education, setEducation] = useState('0');
    const [occupation, setOccupation] = useState('0');
    const [income, setIncome] = useState('');
    const [incomeScore, setIncomeScore] = useState(0);
    const [totalScore, setTotalScore] = useState(0);
    const [socialClass, setSocialClass] = useState('');

    // Income Ranges (Approx. April 2024 - CPI base)
    // These values often need updating. We use a recent standard update.
    const getIncomeScore = (amount) => {
        if (!amount) return 0;
        const val = parseInt(amount);
        if (val >= 55273) return 12;
        if (val >= 27637) return 10;
        if (val >= 20724) return 6;
        if (val >= 13815) return 4;
        if (val >= 8289) return 3;
        if (val >= 2764) return 2;
        return 1;
    };

    const calculateClass = (score) => {
        if (score >= 26) return "Upper (I)";
        if (score >= 16) return "Upper Middle (II)";
        if (score >= 11) return "Lower Middle (III)";
        if (score >= 5) return "Upper Lower (IV)";
        return "Lower (V)";
    };

    useEffect(() => {
        const incScore = getIncomeScore(income);
        setIncomeScore(incScore);
        const total = parseInt(education) + parseInt(occupation) + incScore;
        setTotalScore(total);
        if (education !== '0' && occupation !== '0' && income) {
            setSocialClass(calculateClass(total));
        } else {
            setSocialClass('');
        }
    }, [education, occupation, income]);

    const educationOptions = [
        { score: 7, label: "Professional / Honours" },
        { score: 6, label: "Graduate / Post Graduate" },
        { score: 5, label: "Intermediate / Post High School Diploma" },
        { score: 4, label: "High School Certificate" },
        { score: 3, label: "Middle School Certificate" },
        { score: 2, label: "Primary School Certificate" },
        { score: 1, label: "Illiterate" }
    ];

    const occupationOptions = [
        { score: 10, label: "Professional" },
        { score: 6, label: "Semi-Professional" },
        { score: 5, label: "Clerk, Shop-owner, Farmer" },
        { score: 4, label: "Skilled Worker" },
        { score: 3, label: "Semi-Skilled Worker" },
        { score: 2, label: "Unskilled Worker" },
        { score: 1, label: "Unemployed" }
    ];

    return (
        <div className="tool-card">
            <h3>Modified Kuppuswamy Scale (2024)</h3>
            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}>
                Auto-calculates socioeconomic class based on Head of Family parameters.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                        Education (Head of Family)
                    </label>
                    <select
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                    >
                        <option value="0">Select Education</option>
                        {educationOptions.map(opt => (
                            <option key={opt.score} value={opt.score}>{opt.label} ({opt.score})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                        Occupation (Head of Family)
                    </label>
                    <select
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                    >
                        <option value="0">Select Occupation</option>
                        {occupationOptions.map(opt => (
                            <option key={opt.score} value={opt.score}>{opt.label} ({opt.score})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                        Monthly Family Income (₹)
                    </label>
                    <input
                        type="number"
                        value={income}
                        onChange={(e) => setIncome(e.target.value)}
                        placeholder="e.g. 25000"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                    />
                    {income && (
                        <div style={{ fontSize: '0.8rem', color: '#2563eb', marginTop: '0.25rem' }}>
                            Score: {incomeScore}
                        </div>
                    )}
                </div>

                {socialClass && (
                    <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>Socioeconomic Class</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#15803d', margin: '0.5rem 0' }}>{socialClass}</div>
                        <div style={{ fontSize: '0.9rem', color: '#166534' }}>Total Score: {totalScore}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KuppuswamyCalculator;
