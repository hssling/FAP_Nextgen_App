import React, { Suspense } from 'react';
import BMICalculator from '../components/tools/BMICalculator';
import KuppuswamyCalculator from '../components/tools/KuppuswamyCalculator';
import BGPrasadCalculator from '../components/tools/BGPrasadCalculator';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './Tools.css';

const HealthTrends = React.lazy(() => import('../components/tools/HealthTrends'));
const FamilyReportGenerator = React.lazy(() => import('../components/tools/FamilyReportGenerator'));

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
                    <BGPrasadCalculator />
                    <BMICalculator />
                </div>

                {/* Column 2: Visuals & Reports */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <Suspense fallback={<LoadingSpinner />}>
                        <HealthTrends />
                    </Suspense>
                    <Suspense fallback={<LoadingSpinner />}>
                        <FamilyReportGenerator />
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default Tools;
