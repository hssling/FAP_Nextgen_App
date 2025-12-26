import React, { useState, useEffect } from 'react';

const BGPrasadCalculator = () => {
    const [income, setIncome] = useState('');
    const [members, setMembers] = useState('');
    const [perCapita, setPerCapita] = useState(0);
    const [socialClass, setSocialClass] = useState('');

    // BG Prasad Scale (Approximate for 2024)
    // Based on CPI(IW) 2016 Base ≈ 139 (April 2024)
    // Class I:  >= 8667
    // Class II: 4333 - 8666
    // Class III: 2600 - 4332
    // Class IV: 1300 - 2599
    // Class V:  < 1300

    useEffect(() => {
        if (income && members && members > 0) {
            const pc = Math.round(parseFloat(income) / parseInt(members));
            setPerCapita(pc);

            if (pc >= 8667) setSocialClass("Class I (Upper High)");
            else if (pc >= 4333) setSocialClass("Class II (High Middle)");
            else if (pc >= 2600) setSocialClass("Class III (Middle)");
            else if (pc >= 1300) setSocialClass("Class IV (Low Middle)");
            else setSocialClass("Class V (Lower)");
        } else {
            setSocialClass('');
            setPerCapita(0);
        }
    }, [income, members]);

    return (
        <div className="tool-card">
            <h3>BG Prasad Scale (2024)</h3>
            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}>
                Socio-economic status based on Per Capita Monthly Income.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                        Total Monthly Family Income (₹)
                    </label>
                    <input
                        type="number"
                        value={income}
                        onChange={(e) => setIncome(e.target.value)}
                        placeholder="e.g. 50000"
                        className="form-control"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                        Total Family Members
                    </label>
                    <input
                        type="number"
                        value={members}
                        onChange={(e) => setMembers(e.target.value)}
                        placeholder="e.g. 4"
                        className="form-control"
                    />
                </div>

                {socialClass && (
                    <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                        <div style={{ fontSize: '0.8rem', color: '#1e40af', marginBottom: '0.25rem' }}>Per Capita Income: ₹{perCapita}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase' }}>Socioeconomic Class</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1d4ed8', margin: '0.5rem 0' }}>{socialClass}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BGPrasadCalculator;
