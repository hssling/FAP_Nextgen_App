import React from 'react';
import BMICalculator from '../components/tools/BMICalculator';
import KuppuswamyCalculator from '../components/tools/KuppuswamyCalculator';
import HealthTrends from '../components/tools/HealthTrends';
import FamilyReportGenerator from '../components/tools/FamilyReportGenerator';
import './Tools.css';

const Tools = () => {
    return (
        <div className="tools-container">
            <div className="tools-header">
                <h1>Tools & Resources</h1>
                <p>Calculators, Analytics, and Report Generation for Family Health Assessment.</p>
            </div>

            <div className="tools-grid">
                {/* Column 1: Calculators */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <KuppuswamyCalculator />
                    <BMICalculator />
                </div>

                {/* Column 2: Visuals & Reports */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <HealthTrends />
                    <FamilyReportGenerator />
                </div>
            </div>
        </div>
    );
};

export default Tools;
