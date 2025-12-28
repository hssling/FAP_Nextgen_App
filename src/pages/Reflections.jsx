import React, { useState, useEffect, useRef } from 'react';
import {
    BookOpen, Save, Sparkles, X,
    Upload, FileText, CheckCircle, ChevronRight, ChevronLeft,
    Paperclip, Download, Plus, Calendar, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './Reflections.css'; // Import the new CSS

// --- Configuration ---
const GIBBS_STAGES = [
    { id: 'description', title: 'Description', prompt: 'What happened?', icon: '📝' },
    { id: 'feelings', title: 'Feelings', prompt: 'What were you thinking & feeling?', icon: '💭' },
    { id: 'evaluation', title: 'Evaluation', prompt: 'What was good & bad about it?', icon: '⚖️' },
    { id: 'analysis', title: 'Analysis', prompt: 'What sense can you make of the situation?', icon: '🔬' },
    { id: 'conclusion', title: 'Conclusion', prompt: 'What else could you have done?', icon: '💡' },
    { id: 'actionPlan', title: 'Action Plan', prompt: 'If it arose again, what would you do?', icon: '🚀' }
];

const Reflections = () => {
    const { profile } = useAuth();
    const [families, setFamilies] = useState([]);
    const [reflections, setReflections] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isWriting, setIsWriting] = useState(false);

    // Form State
    const [activeTab, setActiveTab] = useState('write');
    const [currentStage, setCurrentStage] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        familyId: '',
        phase: 'Phase I',
        gibbs: { description: '', feelings: '', evaluation: '', analysis: '', conclusion: '', actionPlan: '' }
    });

    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);
    const [aiFeedback, setAiFeedback] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => { if (profile) loadData(); }, [profile]);

    const loadData = async () => {
        setLoading(true);
        const { data: fams } = await supabase.from('families').select('id, head_name').eq('student_id', profile.id);
        const { data: refs } = await supabase.from('reflections').select('*').eq('student_id', profile.id).order('created_at', { ascending: false });
        setFamilies(fams || []);
        setReflections(refs || []);
        setLoading(false);
    };

    const handleAICoach = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            setAiFeedback("Coach Tip: Your analysis is strong, but try to connect your 'Feelings' more directly to the 'Action Plan'. How did your emotions drive your decision making?");
            setIsAnalyzing(false);
        }, 1500);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            let fileData = null;
            if (activeTab === 'upload' && selectedFile) {
                const fileName = `${profile.id}/${Date.now()}_${selectedFile.name}`;
                const { error: uploadError } = await supabase.storage.from('reflection-files').upload(fileName, selectedFile);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('reflection-files').getPublicUrl(fileName);
                fileData = { url: data.publicUrl, name: selectedFile.name, size: selectedFile.size, type: selectedFile.name.split('.').pop() };
            }

            const legacyContent = Object.entries(formData.gibbs).map(([k, v]) => `[${k.toUpperCase()}]: ${v}`).join('\n\n');
            const payload = {
                student_id: profile.id,
                family_id: formData.familyId || null,
                phase: formData.phase,
                content: activeTab === 'write' ? legacyContent : (legacyContent + "\n[FILE ATTACHED]"),
                gibbs_description: formData.gibbs.description,
                gibbs_feelings: formData.gibbs.feelings,
                gibbs_evaluation: formData.gibbs.evaluation,
                gibbs_analysis: formData.gibbs.analysis,
                gibbs_conclusion: formData.gibbs.conclusion,
                gibbs_action_plan: formData.gibbs.actionPlan,
                reflection_type: activeTab === 'upload' ? 'file' : 'structured',
                file_url: fileData?.url,
                file_name: fileData?.name,
                file_size: fileData?.size,
                file_type: fileData?.type,
                status: 'Pending'
            };

            const { error } = await supabase.from('reflections').insert([payload]);
            if (error) throw error;

            setIsWriting(false);
            setFormData({ familyId: '', phase: 'Phase I', gibbs: { description: '', feelings: '', evaluation: '', analysis: '', conclusion: '', actionPlan: '' } });
            setSelectedFile(null);
            loadData();
        } catch (e) {
            console.error(e);
            alert("Error saving. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="reflections-page">
            {/* Ambient Background globs */}
            <div className="ambient-orb orb-1"></div>
            <div className="ambient-orb orb-2"></div>

            <div className="container" style={{ paddingTop: '3rem' }}>

                {/* Header Section */}
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 className="page-title">My Journal</h1>
                        <p className="page-subtitle">Your professional growth journey.</p>
                    </div>
                    <button onClick={() => setIsWriting(true)} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '30px' }}>
                        <Plus size={20} /> New Entry
                    </button>
                </div>

                {/* Stats Row */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#3B82F6' }}><BookOpen size={24} /></div>
                        <div className="stat-content">
                            <h4>Total Entries</h4>
                            <p>{reflections.length}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#10B981' }}><TrendingUp size={24} /></div>
                        <div className="stat-content">
                            <h4>Avg. Score</h4>
                            <p>{(reflections.filter(r => r.total_score).reduce((acc, curr) => acc + curr.total_score, 0) / (reflections.filter(r => r.total_score).length || 1)).toFixed(1)}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#F59E0B' }}><Calendar size={24} /></div>
                        <div className="stat-content">
                            <h4>This Month</h4>
                            <p>{reflections.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length}</p>
                        </div>
                    </div>
                </div>

                {/* Entries Stream */}
                <div className="timeline-container">
                    {loading ? <p style={{ textAlign: 'center', color: '#64748B' }}>Loading your journey...</p> :
                        reflections.length === 0 ? (
                            <div className="empty-state">
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#CBD5E1' }}>
                                    <FileText size={48} />
                                </div>
                                <h3>Canvas is Empty</h3>
                                <button onClick={() => setIsWriting(true)} className="btn btn-outline" style={{ marginTop: '1rem' }}>Create your first reflection</button>
                            </div>
                        ) :
                            reflections.map((ref, idx) => (
                                <motion.div
                                    key={ref.id}
                                    className="timeline-entry"
                                    style={{ animationDelay: `${idx * 0.1}s` }}
                                >
                                    <div className="date-block">
                                        <span className="date-day">{new Date(ref.created_at).getDate()}</span>
                                        <span className="date-month">{new Date(ref.created_at).toLocaleString('default', { month: 'short' })}</span>
                                    </div>

                                    <div className="entry-card">
                                        <div className="card-accent-strip" style={{ background: ref.grade === 'A' ? '#10B981' : '#3B82F6' }}></div>

                                        <div className="entry-header">
                                            <div>
                                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                    <span className="phase-badge">{ref.phase}</span>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{ref.families?.head_name || 'General Reflection'}</span>
                                            </div>
                                            {ref.status === 'Graded' && (
                                                <div className="grade-badge">
                                                    <span className="grade-score">{ref.grade}</span>
                                                    <span className="grade-label">Graded</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="entry-body">
                                            <h3 className="entry-title">
                                                {ref.gibbs_description ? "Reflection on " + ref.gibbs_description.substring(0, 50) + "..." : ref.file_name || "Journal Entry"}
                                            </h3>

                                            {ref.gibbs_analysis && (
                                                <div className="entry-excerpt">
                                                    "{ref.gibbs_analysis}"
                                                </div>
                                            )}
                                        </div>

                                        <div className="entry-footer">
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {ref.reflection_type === 'file' && <span className="phase-badge" style={{ background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', gap: '4px' }}><Paperclip size={12} /> Attachment</span>}
                                            </div>
                                            {ref.file_url ? (
                                                <a href={ref.file_url} target="_blank" rel="noopener noreferrer" className="download-link">
                                                    Download <Download size={16} />
                                                </a>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>Read Full Entry &rarr;</span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                    }
                </div>
            </div>

            {/* --- WRITING MODAL --- */}
            <AnimatePresence>
                {isWriting && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="modal-overlay"
                    >
                        <motion.div
                            initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }}
                            className="modal-content"
                        >
                            {/* Left: Sidebar */}
                            <div className="modal-sidebar">
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem', color: '#0F172A' }}>New Entry</h2>
                                {GIBBS_STAGES.map((stage, idx) => (
                                    <div
                                        key={stage.id}
                                        onClick={() => setCurrentStage(idx)}
                                        className={`sidebar-step ${currentStage === idx ? 'active' : ''}`}
                                    >
                                        <div className="step-dot"></div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: currentStage === idx ? '#0F766E' : '#64748B' }}>{stage.title}</h4>
                                    </div>
                                ))}
                            </div>

                            {/* Right: Input Area */}
                            <div className="modal-main">
                                <button onClick={() => setIsWriting(false)} className="modal-close"><X size={20} /></button>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentStage}
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                        >
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <h3 className="stage-title">
                                                    <span>{GIBBS_STAGES[currentStage].icon}</span>
                                                    {GIBBS_STAGES[currentStage].title}
                                                </h3>
                                                <p className="stage-prompt">{GIBBS_STAGES[currentStage].prompt}</p>
                                            </div>

                                            <textarea
                                                className="journal-input"
                                                placeholder="Type your reflection here..."
                                                value={formData.gibbs[GIBBS_STAGES[currentStage].id]}
                                                onChange={e => setFormData(prev => ({ ...prev, gibbs: { ...prev.gibbs, [GIBBS_STAGES[currentStage].id]: e.target.value } }))}
                                                autoFocus
                                            />

                                            <div className="modal-actions">
                                                <button
                                                    onClick={handleAICoach}
                                                    disabled={isAnalyzing}
                                                    className="ai-btn"
                                                >
                                                    <Sparkles size={16} className={isAnalyzing ? "animate-spin" : ""} /> {isAnalyzing ? "Thinking..." : "AI Insight"}
                                                </button>

                                                <div style={{ display: 'flex', gap: '1rem' }}>
                                                    <button
                                                        onClick={() => setCurrentStage(p => Math.max(0, p - 1))} disabled={currentStage === 0}
                                                        className="nav-btn"
                                                    >
                                                        <ChevronLeft size={24} />
                                                    </button>
                                                    {currentStage < GIBBS_STAGES.length - 1 ? (
                                                        <button
                                                            onClick={() => setCurrentStage(p => Math.min(GIBBS_STAGES.length - 1, p + 1))}
                                                            className="nav-btn primary"
                                                        >
                                                            Next <ChevronRight size={20} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={handleSubmit} disabled={submitting}
                                                            className="nav-btn primary"
                                                            style={{ background: 'linear-gradient(to right, #2563EB, #4F46E5)' }}
                                                        >
                                                            {submitting ? 'Saving...' : <><Save size={20} style={{ marginRight: '8px' }} /> Finish</>}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>

                                    {/* AI Toast */}
                                    <AnimatePresence>
                                        {aiFeedback && (
                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="ai-toast">
                                                <p>{aiFeedback}</p>
                                                <button onClick={() => setAiFeedback(null)} style={{ position: 'absolute', top: '5px', right: '5px' }}><X size={14} /></button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Reflections;
