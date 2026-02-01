import React, { Suspense, useState } from 'react';
import BMICalculator from '../components/tools/BMICalculator';
import KuppuswamyCalculator from '../components/tools/KuppuswamyCalculator';
import BGPrasadCalculator from '../components/tools/BGPrasadCalculator';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './Tools.css';

const HealthTrends = React.lazy(() => import('../components/tools/HealthTrends'));
const FamilyReportGenerator = React.lazy(() => import('../components/tools/FamilyReportGenerator'));

const Tools = () => {
    const [showTrends, setShowTrends] = useState(false);
    const [showReports, setShowReports] = useState(false);
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
                    <BGPrasadCalculator />
                    <BMICalculator />
                </div>

                {/* Column 2: Visuals & Reports */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {showTrends ? (
                        <Suspense fallback={<LoadingSpinner />}>
                            <HealthTrends />
                        </Suspense>
                    ) : (
                        <button className="btn btn-outline" onClick={() => setShowTrends(true)}>
                            Load Health Trends
                        </button>
                    )}
                    {showReports ? (
                        <Suspense fallback={<LoadingSpinner />}>
                            <FamilyReportGenerator />
                        </Suspense>
                    ) : (
                        <button className="btn btn-outline" onClick={() => setShowReports(true)}>
                            Load Report Generator
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tools;
