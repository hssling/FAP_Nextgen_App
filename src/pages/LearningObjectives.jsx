import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Target, CheckCircle, Calendar, Award, FileText, TrendingUp, Users, X, GraduationCap } from 'lucide-react';
import competenciesData from '../data/competencies/nmc_competencies.json';
import LearningContentViewer from '../components/LearningContentViewer';

const LearningObjectives = () => {
    const [selectedYear, setSelectedYear] = useState('year_1');
    const [activeTab, setActiveTab] = useState('competencies');
    const [selectedCompetency, setSelectedCompetency] = useState(null);
    const [showContentModal, setShowContentModal] = useState(false);

    const yearData = competenciesData[selectedYear];
    const yearNumber = selectedYear.split('_')[1];

    const tabs = [
        { id: 'competencies', label: 'Competencies', icon: Target },
        { id: 'slos', label: 'Learning Objectives', icon: BookOpen },
        { id: 'activities', label: 'Expected Activities', icon: Calendar },
        { id: 'assessment', label: 'Assessment Criteria', icon: Award }
    ];

    const yearTabs = [
        { id: 'year_1', label: 'Year 1', subtitle: 'Foundation' },
        { id: 'year_2', label: 'Year 2', subtitle: 'Intermediate' },
        { id: 'year_3', label: 'Year 3', subtitle: 'Advanced' }
    ];

    return (
        <div style={{ padding: '2rem' }}>
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '2rem' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <BookOpen size={32} color="#0F766E" />
                    <h1 className="page-title" style={{ margin: 0 }}>Learning Objectives & Guidelines</h1>
                </div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
                    NMC-CBME Competencies and FAP Logbook Requirements
                </p>
            </motion.div>

            {/* Program Overview Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{ padding: '1.5rem', marginBottom: '2rem', background: 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)', color: 'white' }}
            >
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: 'white' }}>
                    {competenciesData.program_overview.title}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Duration</div>
                        <div style={{ fontWeight: '600' }}>{competenciesData.program_overview.duration}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>NMC Mandate</div>
                        <div style={{ fontWeight: '600' }}>{competenciesData.program_overview.nmc_mandate}</div>
                    </div>
                </div>
                <p style={{ marginTop: '1rem', fontSize: '0.95rem', opacity: 0.95 }}>
                    {competenciesData.program_overview.objective}
                </p>
            </motion.div>

            {/* Year Selection Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                {yearTabs.map((year) => (
                    <button
                        key={year.id}
                        onClick={() => setSelectedYear(year.id)}
                        style={{
                            flex: '1',
                            minWidth: '200px',
                            padding: '1rem',
                            border: selectedYear === year.id ? '2px solid #0F766E' : '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: selectedYear === year.id ? '#F0FDFA' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{ fontWeight: '600', fontSize: '1.125rem', color: selectedYear === year.id ? '#0F766E' : 'var(--color-text)' }}>
                            {year.label}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                            {year.subtitle} Phase
                        </div>
                    </button>
                ))}
            </div>

            {/* Phase Info Banner */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #0F766E' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            {yearData.phase}
                        </h3>
                        <p style={{ color: 'var(--color-text-muted)' }}>{yearData.focus}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0F766E' }}>
                                {yearData.minimum_visits}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                Minimum Visits
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0EA5E9' }}>
                                {yearData.competencies.length}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                Competencies
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--color-border)', flexWrap: 'wrap' }}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                border: 'none',
                                borderBottom: activeTab === tab.id ? '3px solid #0F766E' : '3px solid transparent',
                                backgroundColor: 'transparent',
                                color: activeTab === tab.id ? '#0F766E' : 'var(--color-text-muted)',
                                fontWeight: activeTab === tab.id ? '600' : '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
            >
                {activeTab === 'competencies' && (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {yearData.competencies.map((comp, idx) => (
                            <motion.div
                                key={comp.code}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="card"
                                style={{ padding: '1.5rem' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                backgroundColor: '#0F766E',
                                                color: 'white',
                                                borderRadius: '4px',
                                                fontSize: '0.875rem',
                                                fontWeight: '600'
                                            }}>
                                                {comp.code}
                                            </span>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                backgroundColor: '#F0F9FF',
                                                color: '#0369A1',
                                                borderRadius: '4px',
                                                fontSize: '0.875rem',
                                                fontWeight: '500'
                                            }}>
                                                {comp.domain}
                                            </span>
                                        </div>
                                        <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                                            {comp.competency}
                                        </h4>
                                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                            {comp.description}
                                        </p>
                                    </div>
                                    <div style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: '#FEF3C7',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#92400E'
                                    }}>
                                        {comp.level}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
                                        Assessment Methods:
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                        {comp.assessment_methods.map((method, i) => (
                                            <span key={i} style={{
                                                padding: '0.25rem 0.75rem',
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '4px',
                                                fontSize: '0.875rem'
                                            }}>
                                                {method}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedCompetency(comp.code);
                                            setShowContentModal(true);
                                        }}
                                        className="btn btn-primary"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                                    >
                                        <GraduationCap size={16} />
                                        Learn More
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {activeTab === 'slos' && (
                    <div className="card" style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Target size={24} color="#0F766E" />
                            Specific Learning Objectives - Year {yearNumber}
                        </h3>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {yearData.specific_learning_objectives.map((slo, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    style={{
                                        display: 'flex',
                                        gap: '1rem',
                                        padding: '1rem',
                                        backgroundColor: '#F8FAFC',
                                        borderRadius: 'var(--radius-md)',
                                        borderLeft: '4px solid #0F766E'
                                    }}
                                >
                                    <CheckCircle size={20} color="#0F766E" style={{ flexShrink: 0, marginTop: '0.25rem' }} />
                                    <span style={{ fontSize: '0.95rem' }}>{slo}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'activities' && (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {yearData.expected_activities.map((activity, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="card"
                                style={{ padding: '1.5rem' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                                            {activity.activity}
                                        </h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                            <Calendar size={16} />
                                            <span>{activity.timeline}</span>
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: '#ECFDF5',
                                        color: '#047857',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem',
                                        fontWeight: '600'
                                    }}>
                                        Required
                                    </div>
                                </div>
                                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                    {activity.description}
                                </p>
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                        📋 Deliverable:
                                    </div>
                                    <div style={{
                                        padding: '0.75rem',
                                        backgroundColor: '#FEF3C7',
                                        borderRadius: '4px',
                                        fontSize: '0.9rem'
                                    }}>
                                        {activity.deliverable}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                        Competencies Addressed:
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {activity.competencies_addressed.map((code, i) => (
                                            <span key={i} style={{
                                                padding: '0.25rem 0.75rem',
                                                backgroundColor: '#0F766E',
                                                color: 'white',
                                                borderRadius: '4px',
                                                fontSize: '0.875rem',
                                                fontWeight: '600'
                                            }}>
                                                {code}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {activeTab === 'assessment' && (
                    <div style={{ display: 'grid', gap: '2rem' }}>
                        {/* Assessment Criteria */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Award size={24} color="#0F766E" />
                                Assessment Criteria - Year {yearNumber}
                            </h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {Object.entries(yearData.assessment_criteria).map(([key, value], idx) => (
                                    <div key={idx} style={{
                                        padding: '1rem',
                                        backgroundColor: '#F8FAFC',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                                                {key.replace(/_/g, ' ')}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                                {value}
                                            </div>
                                        </div>
                                        <CheckCircle size={20} color="#10B981" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Grading Rubric */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={24} color="#0EA5E9" />
                                Grading Rubric - Year {yearNumber}
                            </h3>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {Object.entries(competenciesData.grading_criteria[selectedYear]).map(([key, value], idx) => {
                                    if (key === 'total') {
                                        return (
                                            <div key={idx} style={{
                                                padding: '1rem',
                                                backgroundColor: '#0F766E',
                                                color: 'white',
                                                borderRadius: 'var(--radius-md)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontWeight: '600',
                                                fontSize: '1.125rem'
                                            }}>
                                                <span>TOTAL</span>
                                                <span>{value} marks</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={idx} style={{
                                            padding: '1rem',
                                            backgroundColor: '#F0F9FF',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{ textTransform: 'capitalize' }}>
                                                {key.replace(/_/g, ' ')}
                                            </span>
                                            <span style={{
                                                fontWeight: '700',
                                                fontSize: '1.25rem',
                                                color: '#0EA5E9'
                                            }}>
                                                {value}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Assessment Tools */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={24} color="#F59E0B" />
                                Assessment Tools & Methods
                            </h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {competenciesData.assessment_tools.map((tool, idx) => (
                                    <div key={idx} style={{
                                        padding: '1rem',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)'
                                    }}>
                                        <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{tool.tool}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                            {tool.purpose}
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                                            <span><strong>Frequency:</strong> {tool.frequency}</span>
                                            <span><strong>Evaluated by:</strong> {tool.evaluated_by}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Learning Content Modal */}
            {showContentModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '2rem'
                }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 'var(--radius-lg)',
                            maxWidth: '900px',
                            width: '100%',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <GraduationCap size={24} color="#0F766E" />
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                    Learning Content: {selectedCompetency}
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowContentModal(false);
                                    setSelectedCompetency(null);
                                }}
                                style={{
                                    padding: '0.5rem',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={24} color="var(--color-text-muted)" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <LearningContentViewer competencyCode={selectedCompetency} />
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default LearningObjectives;
