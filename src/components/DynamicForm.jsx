import React, { useState, useEffect } from 'react';
import { calculateBMI, calculateWHR, calculateIBW } from '../utils/calculations';
import { autoCalculate } from '../utils/riskScoring';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

const DynamicForm = ({ schema, onSubmit, onCancel, initialData = {}, memberData = {} }) => {
    const [formData, setFormData] = useState(initialData);
    const [calculatedResults, setCalculatedResults] = useState(null);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // Auto-calculate when relevant fields change
    useEffect(() => {
        if (!schema || !schema.auto_calculate) return;

        let results = {};

        // Anthropometric calculations
        if (schema.form_id === 'anthropometric_assessment_v1') {
            const { height_cm, weight_kg, waist_cm, hip_cm } = formData;

            if (height_cm && weight_kg) {
                const bmiResult = calculateBMI(parseFloat(weight_kg), parseFloat(height_cm));
                results.bmi = bmiResult;

                if (memberData.gender) {
                    const ibw = calculateIBW(parseFloat(height_cm), memberData.gender);
                    results.ibw = ibw;
                }
            }

            if (waist_cm && hip_cm && memberData.gender) {
                const whrResult = calculateWHR(parseFloat(waist_cm), parseFloat(hip_cm), memberData.gender);
                results.whr = whrResult;
            }
        }

        // Risk assessment calculations
        if (schema.auto_calculate.includes('total_score') || schema.auto_calculate.includes('severity')) {
            const riskResults = autoCalculate(schema.form_id, formData, memberData);
            if (Object.keys(riskResults).length > 0) {
                results = { ...results, ...riskResults };
            }
        }

        if (Object.keys(results).length > 0) {
            setCalculatedResults(results);
        }
    }, [formData, schema, memberData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Include calculated results in submission
        const submissionData = {
            ...formData,
            calculated_fields: calculatedResults
        };
        onSubmit(submissionData);
    };

    if (!schema || !schema.fields) {
        return <div>Loading form...</div>;
    }

    return (
        <form onSubmit={handleSubmit}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                {schema.title}
            </h3>
            {schema.description && (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                    {schema.description}
                </p>
            )}

            <div style={{ display: 'grid', gap: '1.25rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '1rem' }}>
                {schema.fields.map(field => (
                    <div key={field.key}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                            {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                        </label>

                        {field.help && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Info size={12} /> {field.help}
                            </div>
                        )}

                        {field.type === 'text' && (
                            <input
                                type="text"
                                required={field.required}
                                placeholder={field.placeholder || ''}
                                value={formData[field.key] || ''}
                                onChange={e => handleChange(field.key, e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                            />
                        )}

                        {field.type === 'number' && (
                            <input
                                type="number"
                                required={field.required}
                                placeholder={field.placeholder || ''}
                                min={field.min}
                                max={field.max}
                                step={field.step || 'any'}
                                value={formData[field.key] || ''}
                                onChange={e => handleChange(field.key, e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                            />
                        )}

                        {field.type === 'textarea' && (
                            <textarea
                                required={field.required}
                                placeholder={field.placeholder || ''}
                                value={formData[field.key] || ''}
                                onChange={e => handleChange(field.key, e.target.value)}
                                rows={3}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'inherit' }}
                            />
                        )}

                        {field.type === 'date' && (
                            <input
                                type="date"
                                required={field.required}
                                value={formData[field.key] || ''}
                                onChange={e => handleChange(field.key, e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                            />
                        )}

                        {field.type === 'select' && (
                            <select
                                value={formData[field.key] || ''}
                                onChange={e => handleChange(field.key, e.target.value)}
                                required={field.required}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'white' }}
                            >
                                <option value="">Select...</option>
                                {field.options.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                ))}
                            </select>
                        )}

                        {field.type === 'checkbox' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    checked={!!formData[field.key]}
                                    onChange={e => handleChange(field.key, e.target.checked)}
                                    style={{ width: '1.25rem', height: '1.25rem' }}
                                />
                                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Yes</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Display Calculated Results */}
            {calculatedResults && Object.keys(calculatedResults).length > 0 && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#F0F9FF', borderRadius: 'var(--radius-md)', border: '1px solid #BAE6FD' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={18} color="#0284C7" /> Calculated Results
                    </h4>

                    {/* BMI Results */}
                    {calculatedResults.bmi && (
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: '500' }}>BMI:</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: calculatedResults.bmi.color }}>
                                    {calculatedResults.bmi.bmi}
                                </span>
                            </div>
                            <div style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px', borderLeft: `4px solid ${calculatedResults.bmi.color}` }}>
                                <div style={{ fontWeight: '600', color: calculatedResults.bmi.color }}>{calculatedResults.bmi.category}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{calculatedResults.bmi.interpretation}</div>
                            </div>
                        </div>
                    )}

                    {/* WHR Results */}
                    {calculatedResults.whr && (
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: '500' }}>Waist-Hip Ratio:</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: calculatedResults.whr.color }}>
                                    {calculatedResults.whr.whr}
                                </span>
                            </div>
                            <div style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px', borderLeft: `4px solid ${calculatedResults.whr.color}` }}>
                                <div style={{ fontWeight: '600', color: calculatedResults.whr.color }}>{calculatedResults.whr.risk} Risk</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{calculatedResults.whr.interpretation}</div>
                            </div>
                        </div>
                    )}

                    {/* Risk Assessment Scores */}
                    {calculatedResults.totalScore !== undefined && (
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: '500' }}>Total Score:</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: calculatedResults.color }}>
                                    {calculatedResults.totalScore}
                                </span>
                            </div>
                            <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '4px', borderLeft: `4px solid ${calculatedResults.color}` }}>
                                <div style={{ fontWeight: '600', color: calculatedResults.color, marginBottom: '0.25rem' }}>
                                    {calculatedResults.severity || calculatedResults.riskLevel || calculatedResults.category}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
                                    {calculatedResults.interpretation}
                                </div>
                                {calculatedResults.recommendations && (
                                    <div style={{ fontSize: '0.875rem', padding: '0.5rem', backgroundColor: '#FEF3C7', borderRadius: '4px', marginTop: '0.5rem' }}>
                                        <strong>Recommendations:</strong> {calculatedResults.recommendations}
                                    </div>
                                )}
                                {calculatedResults.suicideRisk && (
                                    <div style={{ fontSize: '0.875rem', padding: '0.5rem', backgroundColor: '#FEE2E2', borderRadius: '4px', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <AlertCircle size={16} color="#DC2626" />
                                        <strong style={{ color: '#DC2626' }}>SUICIDE RISK DETECTED - Immediate assessment required!</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Assessment</button>
            </div>
        </form>
    );
};

export default DynamicForm;
