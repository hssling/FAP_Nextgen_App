import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, AlertCircle, Lightbulb, FileText, Video, Download, ChevronDown, ChevronUp } from 'lucide-react';
import learningContent from '../data/competencies/learning_content_v2.json';

const LearningContentViewer = ({ competencyCode }) => {
    const [expandedSections, setExpandedSections] = useState({});
    const content = learningContent[competencyCode.replace(/\s+/g, '_')];

    if (!content) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <BookOpen size={48} style={{ margin: '0 auto 1rem' }} />
                <p>Learning content for this competency ({competencyCode} &rarr; {competencyCode.replace(' ', '_')}) is being developed.</p>
            </div>
        );
    }

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const ExpandableSection = ({ title, children, icon: Icon, defaultExpanded = false }) => {
        const sectionKey = title.replace(/\s/g, '_');
        const isExpanded = expandedSections[sectionKey] ?? defaultExpanded;

        return (
            <div style={{ marginBottom: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <button
                    onClick={() => toggleSection(sectionKey)}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: isExpanded ? '#F0F9FF' : 'white',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {Icon && <Icon size={20} color="#0F766E" />}
                        <span style={{ fontWeight: '600', fontSize: '1rem' }}>{title}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{ padding: '1.5rem', backgroundColor: '#FAFAFA' }}>
                                {children}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '1rem' }}>
            {/* Introduction */}
            <div style={{
                padding: '1.5rem',
                backgroundColor: '#F0F9FF',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                borderLeft: '4px solid #0EA5E9'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Lightbulb size={20} color="#0EA5E9" />
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Introduction</h4>
                </div>
                <p style={{ margin: 0, lineHeight: '1.6' }}>{content.learning_content.introduction}</p>
            </div>

            {/* Key Concepts */}
            {content.learning_content.key_concepts && (
                <ExpandableSection title="Key Concepts" icon={BookOpen} defaultExpanded={true}>
                    {content.learning_content.key_concepts.map((concept, idx) => (
                        <div key={idx} style={{ marginBottom: idx < content.learning_content.key_concepts.length - 1 ? '2rem' : 0 }}>
                            <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#0F766E' }}>
                                {concept.concept}
                            </h5>
                            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>{concept.explanation}</p>

                            {concept.examples && (
                                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                                    <div style={{ fontWeight: '500', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Examples:</div>
                                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                                        {concept.examples.map((example, i) => (
                                            <li key={i} style={{ marginBottom: '0.5rem' }}>{example}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {concept.categories && (
                                <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
                                    {concept.categories.map((cat, i) => (
                                        <div key={i} style={{
                                            backgroundColor: 'white',
                                            padding: '1rem',
                                            borderRadius: '4px',
                                            border: '1px solid #E5E7EB'
                                        }}>
                                            <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#0F766E' }}>
                                                {cat.name}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                                {cat.factors.join(' • ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {concept.life_stages && (
                                <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                                    {concept.life_stages.map((stage, i) => (
                                        <div key={i} style={{
                                            backgroundColor: 'white',
                                            padding: '1.25rem',
                                            borderRadius: '4px',
                                            border: '2px solid #E5E7EB'
                                        }}>
                                            <h6 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#0EA5E9' }}>
                                                {stage.stage}
                                            </h6>
                                            <div style={{ marginBottom: '0.75rem' }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                                    Priority Assessments:
                                                </div>
                                                <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                                                    {stage.priority_assessments.map((assess, j) => (
                                                        <li key={j} style={{ marginBottom: '0.25rem' }}>{assess}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            {stage.red_flags && (
                                                <div style={{
                                                    padding: '0.75rem',
                                                    backgroundColor: '#FEE2E2',
                                                    borderRadius: '4px',
                                                    marginTop: '0.75rem'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                        <AlertCircle size={16} color="#DC2626" />
                                                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#DC2626' }}>
                                                            Red Flags:
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.875rem', color: '#991B1B' }}>
                                                        {stage.red_flags.join(' • ')}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </ExpandableSection>
            )}

            {/* Step-by-Step Guide */}
            {content.learning_content.step_by_step_guide && (
                <ExpandableSection title="Step-by-Step Guide" icon={FileText}>
                    <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
                        {content.learning_content.step_by_step_guide.title}
                    </h5>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {content.learning_content.step_by_step_guide.steps.map((step, idx) => (
                            <div key={idx} style={{
                                backgroundColor: 'white',
                                padding: '1.25rem',
                                borderRadius: '4px',
                                borderLeft: '4px solid #0F766E'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: '#0F766E',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: '700'
                                    }}>
                                        {step.step}
                                    </div>
                                    <h6 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{step.title}</h6>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '3rem', fontSize: '0.9rem' }}>
                                    {step.actions.map((action, i) => (
                                        <li key={i} style={{ marginBottom: '0.5rem' }}>{action}</li>
                                    ))}
                                </ul>
                                {step.tips && (
                                    <div style={{
                                        marginTop: '0.75rem',
                                        marginLeft: '3rem',
                                        padding: '0.75rem',
                                        backgroundColor: '#FEF3C7',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem'
                                    }}>
                                        <strong>💡 Tip:</strong> {step.tips}
                                    </div>
                                )}
                                {step.duration && (
                                    <div style={{
                                        marginTop: '0.5rem',
                                        marginLeft: '3rem',
                                        fontSize: '0.875rem',
                                        color: 'var(--color-text-muted)'
                                    }}>
                                        ⏱️ Duration: {step.duration}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </ExpandableSection>
            )}

            {/* Clinical Application */}
            {content.learning_content.clinical_application && (
                <ExpandableSection title="Clinical Application in FAP" icon={CheckCircle}>
                    <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '4px' }}>
                        <p style={{ fontWeight: '500', marginBottom: '1rem' }}>
                            {content.learning_content.clinical_application.in_fap}
                        </p>
                        {content.learning_content.clinical_application.assessment_points && (
                            <>
                                <div style={{ fontWeight: '500', marginBottom: '0.75rem' }}>Assessment Points:</div>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {content.learning_content.clinical_application.assessment_points.map((point, idx) => (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            gap: '0.75rem',
                                            padding: '0.75rem',
                                            backgroundColor: '#F0F9FF',
                                            borderRadius: '4px'
                                        }}>
                                            <CheckCircle size={18} color="#0EA5E9" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                                            <span style={{ fontSize: '0.9rem' }}>{point}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        {content.learning_content.clinical_application.documentation && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                backgroundColor: '#FEF3C7',
                                borderRadius: '4px'
                            }}>
                                <strong>📝 Documentation:</strong> {content.learning_content.clinical_application.documentation}
                            </div>
                        )}
                    </div>
                </ExpandableSection>
            )}

            {/* Case Study */}
            {content.learning_content.case_study && (
                <ExpandableSection title="Case Study" icon={FileText}>
                    <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '4px' }}>
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#F0F9FF',
                            borderRadius: '4px',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Scenario:</div>
                            <p style={{ margin: 0, lineHeight: '1.6' }}>{content.learning_content.case_study.scenario}</p>
                        </div>
                        <div style={{ fontWeight: '600', marginBottom: '0.75rem' }}>
                            {content.learning_content.case_study.analysis}
                        </div>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {content.learning_content.case_study.determinants_identified.map((det, idx) => (
                                <div key={idx} style={{
                                    padding: '0.75rem',
                                    backgroundColor: '#ECFDF5',
                                    borderRadius: '4px',
                                    borderLeft: '3px solid #10B981'
                                }}>
                                    {det}
                                </div>
                            ))}
                        </div>
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            backgroundColor: '#FEF3C7',
                            borderRadius: '4px'
                        }}>
                            <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Intervention Approach:</div>
                            <p style={{ margin: 0 }}>{content.learning_content.case_study.intervention_approach}</p>
                        </div>
                    </div>
                </ExpandableSection>
            )}

            {/* Learning Resources */}
            {content.learning_content.learning_resources && (
                <ExpandableSection title="Learning Resources" icon={Video}>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {content.learning_content.learning_resources.map((resource, idx) => (
                            <div key={idx} style={{
                                backgroundColor: 'white',
                                padding: '1rem',
                                borderRadius: '4px',
                                border: '1px solid #E5E7EB',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                        {resource.type === 'Video' && '🎥 '}
                                        {resource.type === 'Reading' && '📖 '}
                                        {resource.type === 'Framework' && '🗺️ '}
                                        {resource.type === 'Protocol' && '📋 '}
                                        {resource.type === 'Tool' && '🔧 '}
                                        {resource.title}
                                    </div>
                                    {resource.description && (
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                            {resource.description}
                                        </div>
                                    )}
                                    {resource.pages && (
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                            {resource.pages}
                                        </div>
                                    )}
                                    {resource.duration && (
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                            Duration: {resource.duration}
                                        </div>
                                    )}
                                </div>
                                {resource.url && (
                                    <a
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#0F766E',
                                            color: 'white',
                                            borderRadius: '4px',
                                            textDecoration: 'none',
                                            fontSize: '0.875rem',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Access
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </ExpandableSection>
            )}

            {/* Assessment Questions */}
            {content.learning_content.assessment_questions && (
                <ExpandableSection title="Self-Assessment Questions" icon={FileText}>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {content.learning_content.assessment_questions.map((q, idx) => (
                            <div key={idx} style={{
                                backgroundColor: 'white',
                                padding: '1.25rem',
                                borderRadius: '4px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                                            Question {idx + 1}:
                                        </div>
                                        <p style={{ margin: 0, lineHeight: '1.6' }}>{q.question}</p>
                                    </div>
                                    <div style={{
                                        marginLeft: '1rem',
                                        padding: '0.25rem 0.75rem',
                                        backgroundColor: '#F0F9FF',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#0369A1',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {q.points} marks
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                    Type: {q.type}
                                </div>
                            </div>
                        ))}
                    </div>
                </ExpandableSection>
            )}
        </div>
    );
};

export default LearningContentViewer;
