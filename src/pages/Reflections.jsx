import React, { useState, useEffect, useRef } from 'react';
import {
    BookOpen, Save, Sparkles, X,
    Upload, FileText, CheckCircle, ChevronRight, ChevronLeft,
    Paperclip, Download, Plus, Calendar, TrendingUp, Trash2,
    AlertCircle, Info, Loader2, Check, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './Reflections.css';

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

    // UI State
    const [isWriting, setIsWriting] = useState(false);
    const [viewingEntry, setViewingEntry] = useState(null);

    // Form State
    const [activeTab, setActiveTab] = useState('write');
    const [currentStage, setCurrentStage] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState(null); // 'uploading', 'saving', 'success', 'error'
    const [uploadError, setUploadError] = useState(null);
    const [sysStatus, setSysStatus] = useState(null);

    const [formData, setFormData] = useState({
        familyId: '',
        phase: 'Phase I',
        gibbs: { description: '', feelings: '', evaluation: '', analysis: '', conclusion: '', actionPlan: '' }
    });

    const [selectedFile, setSelectedFile] = useState(null);
    const [aiFeedback, setAiFeedback] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => { if (profile) loadData(); }, [profile]);

    // Cache Helper
    const getCachedData = (id) => {
        const cache = sessionStorage.getItem(`reflections_cache_${id}`);
        if (cache) {
            const { timestamp, data } = JSON.parse(cache);
            if (Date.now() - timestamp < 60000) return data; // 1 min cache for journal (stricter)
        }
        return null;
    };

    const loadData = async (forceRefresh = false) => {
        if (!forceRefresh) {
            const cached = getCachedData(profile.id);
            if (cached) {
                setFamilies(cached.families);
                setReflections(cached.reflections);
                setLoading(false);
                return; // Return early if cache hit
            }
        }

        if (forceRefresh) setLoading(true); // Only show spinner on force refresh or initial load if no cache

        const { data: fams } = await supabase.from('families').select('id, head_name').eq('student_id', profile.id);
        const { data: refs } = await supabase.from('reflections').select('*').eq('student_id', profile.id).order('created_at', { ascending: false });

        const result = { families: fams || [], reflections: refs || [] };

        setFamilies(result.families);
        setReflections(result.reflections);

        // Save to cache
        sessionStorage.setItem(`reflections_cache_${profile.id}`, JSON.stringify({ timestamp: Date.now(), data: result }));

        setLoading(false);
    };

    const runDiagnostics = async () => {
        setSysStatus('Testing upload permissions...');
        try {
            if (!profile) {
                setSysStatus("Error: User not logged in");
                return;
            }
            // Perform a Real Upload Test (Tiny file)
            const dummyBlob = new Blob(['test connection'], { type: 'text/plain' });
            const testPath = `${profile.id}/diagnostic_test_${Date.now()}.txt`;

            const { data, error } = await supabase.storage
                .from('reflection-files')
                .upload(testPath, dummyBlob, { upsert: false });

            if (error) {
                console.error("Diagnostic Upload Failed:", error);
                setSysStatus(`Connection Failed: ${error.message}`);
            } else {
                setSysStatus("System Healthy & Ready! ✅");
                // Cleanup (fire and forget)
                supabase.storage.from('reflection-files').remove([testPath]);
            }
        } catch (e) {
            setSysStatus(`System Error: ${e.message}`);
        }
    };

    const handleAICoach = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            setAiFeedback("Coach Tip: Your analysis is strong, but try to connect your 'Feelings' more directly to the 'Action Plan'. How did your emotions drive your decision making?");
            setIsAnalyzing(false);
        }, 1500);
    };

    const handleFileSelect = (e) => {
        setUploadError(null);
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) {
                setUploadError("File size exceeds 10MB limit.");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this reflection?")) return;

        try {
            const { error } = await supabase.from('reflections').delete().eq('id', id);
            if (error) throw error;
            setReflections(prev => prev.filter(r => r.id !== id));
            sessionStorage.removeItem(`reflections_cache_${profile.id}`);
        } catch (err) {
            console.error(err);
            alert("Failed to delete entry.");
        }
    };

    const handleSubmit = async () => {
        setUploadError(null);
        setSubmissionStatus('processing');

        if (!profile) {
            alert("Session expired. Please log in again.");
            setSubmissionStatus(null);
            return;
        }

        setSubmitting(true);
        try {
            let fileData = null;

            // 1. Handle File Upload if active
            if (activeTab === 'upload') {
                if (!selectedFile) {
                    alert("Please select a file to upload.");
                    setSubmitting(false);
                    setSubmissionStatus(null);
                    return;
                }

                setSubmissionStatus('uploading');

                const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const path = `${profile.id}/${Date.now()}_${safeName}`;

                console.log("%c[Upload Debug]", "color:orange;font-weight:bold");
                console.log("File:", selectedFile.name, selectedFile.size, selectedFile.type);
                console.log("Target Path:", path);
                console.log("Profile ID:", profile.id);

                // 3. Fallback to FormData (Multipart) is sometimes more stable on mobile
                // However, Supabase client prefers Blob/File. 
                // Let's try explicit 'file' body with standard fetch if Supabase SDK is stubborn,
                // But first, let's try the most robust Supabase option: TUS resumeable upload is default in v2.
                // WE WILL USE A SIMPLER FETCH TO DEBUG if SDK is the issue.

                // NEW STRATEGY: Use standard POST for reliability if SDK fails, or stick to SDK with minimal args.
                // Let's stick to SDK but remove 'upsert' which sometimes causes lock issues, and ensure simple path.

                // 4. Final Attempt: Use the most basic SDK upload which defaults to TUS (resumable)
                // We remove almost all custom options to let the SDK decide the best path.

                // 0. PRE-FLIGHT AUTH CHECK
                console.log("Pre-flight: Refreshing session...");
                await supabase.auth.refreshSession();

                console.log("Starting Robust Upload: ", path);

                const uploadPromise = supabase.storage
                    .from('reflection-files')
                    .upload(path, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                // const formData = new FormData();
                // formData.append('path', path);
                // formData.append('file', selectedFile);
                // ... implementing raw fetch is complex due to auth headers. Stuck with SDK for now.

                // Let's try: ArrayBuffer again BUT small chunk. 
                // Actually, 'File' object should work.

                // DIAGNOSTIC LOG
                console.log("Starting Upload: ", path);

                const response = await Promise.race([
                    uploadPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Upload timed out (>3 mins). Please check your internet connection.")), 180000))
                ]);
                const { data, error: uploadError } = response || {};

                if (uploadError) {
                    console.error("Upload Error Details:", uploadError);
                    if (uploadError.statusCode === "404" || uploadError.message.includes("not found")) {
                        throw new Error("System Error: Storage bucket missing. Ask admin to run setup SQL.");
                    }
                    throw uploadError;
                }

                const urlData = supabase.storage.from('reflection-files').getPublicUrl(path);
                fileData = {
                    url: urlData.data.publicUrl,
                    name: selectedFile.name,
                    size: selectedFile.size,
                    type: selectedFile.name.split('.').pop() || 'file'
                };
            }

            setSubmissionStatus('saving');

            // 2. Prepare Payload
            const legacyContent = activeTab === 'write'
                ? Object.entries(formData.gibbs).map(([k, v]) => `[${k.toUpperCase()}]: ${v}`).join('\n\n')
                : `[FILE UPLOAD]: ${selectedFile?.name}`;

            const payload = {
                student_id: profile.id,
                family_id: formData.familyId || null,
                phase: formData.phase,
                content: legacyContent || "File Upload",

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

            const { error: insertError } = await supabase.from('reflections').insert([payload]);
            if (insertError) throw insertError;

            setSubmissionStatus('success');

            setTimeout(() => {
                setIsWriting(false);
                setSubmissionStatus(null);
                setFormData({ familyId: '', phase: 'Phase I', gibbs: { description: '', feelings: '', evaluation: '', analysis: '', conclusion: '', actionPlan: '' } });
                setSelectedFile(null);
                setActiveTab('write');
                setCurrentStage(0);
                loadData(true);
            }, 1500);

        } catch (e) {
            console.error("Full Submission Error:", e);
            // Construct a very detailed error message for the user to report
            let msg = e.message || "Unknown Error";
            if (e.statusCode) msg += ` (Status: ${e.statusCode})`;
            if (e.error) msg += ` (Details: ${e.error})`;
            if (typeof e === 'object' && e !== null && !e.message) {
                try { msg = JSON.stringify(e); } catch (err) { msg = "Unknown Object Error"; }
            }
            setUploadError(msg);
            setSubmissionStatus('error');
        } finally {
            if (submissionStatus !== 'success') {
                setSubmitting(false);
            }
        }
    };

    const cancelUpload = () => {
        setSubmitting(false);
        setSubmissionStatus(null);
        setUploadError("Cancelled by user.");
    }

    return (
        <div className="reflections-page">
            <div className="ambient-orb orb-1"></div>
            <div className="ambient-orb orb-2"></div>

            <div className="container" style={{ paddingTop: '3rem' }}>

                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 className="page-title">My Journal</h1>
                        <p className="page-subtitle">Your professional growth journey.</p>
                    </div>
                    <button onClick={() => setIsWriting(true)} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '30px' }}>
                        <Plus size={20} /> New Entry
                    </button>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#3B82F6' }}><BookOpen size={24} /></div>
                        <div className="stat-content">
                            <h4>Total Entries</h4>
                            <p>{reflections.length}</p>
                        </div>
                    </div>

                    {(() => {
                        const gradedRefs = reflections.filter(r => r.total_score !== null && r.total_score !== undefined);
                        const avgScore = gradedRefs.length > 0
                            ? (gradedRefs.reduce((acc, curr) => acc + curr.total_score, 0) / gradedRefs.length).toFixed(1)
                            : 'N/A';

                        let avgGrade = '-';
                        if (avgScore !== 'N/A') {
                            const s = parseFloat(avgScore);
                            if (s >= 90) avgGrade = 'A+';
                            else if (s >= 80) avgGrade = 'A';
                            else if (s >= 70) avgGrade = 'B';
                            else if (s >= 60) avgGrade = 'C';
                            else avgGrade = 'D';
                        }

                        return (
                            <>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: '#10B981' }}><TrendingUp size={24} /></div>
                                    <div className="stat-content">
                                        <h4>Avg. Score</h4>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                            <p>{avgScore}</p>
                                            {avgGrade !== '-' && <span style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>({avgGrade})</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: '#F59E0B' }}><Calendar size={24} /></div>
                                    <div className="stat-content">
                                        <h4>This Month</h4>
                                        <p>{reflections.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length}</p>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>

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
                                    onClick={() => setViewingEntry(ref)}
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
                                                <div className="grade-badge" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <span className="grade-score">{ref.grade}</span>
                                                    {ref.total_score && <span style={{ fontSize: '0.7rem', color: 'white', fontWeight: 500 }}>{ref.total_score} pts</span>}
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

                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                {ref.status !== 'Graded' && (
                                                    <button
                                                        onClick={(e) => handleDelete(e, ref.id)}
                                                        className="icon-btn-danger"
                                                        style={{ color: '#EF4444', padding: '0.25rem' }}
                                                        title="Delete Entry"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                                {ref.file_url ? (
                                                    <a href={ref.file_url}
                                                        onClick={(e) => e.stopPropagation()}
                                                        target="_blank" rel="noopener noreferrer" className="download-link">
                                                        Download <Download size={16} />
                                                    </a>
                                                ) : (
                                                    <button className="read-more-btn">Read Full Entry &rarr;</button>
                                                )}
                                            </div>
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
                            style={{ position: 'relative', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
                        >
                            {/* OVERLAY for Submission Status */}
                            {submissionStatus && (
                                <div style={{
                                    position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.95)', zIndex: 50,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {submissionStatus === 'uploading' && (
                                        <>
                                            <Loader2 className="animate-spin" size={48} color="#3B82F6" />
                                            <p style={{ marginTop: '1rem', fontWeight: 600 }}>Uploading File...</p>
                                            <p style={{ fontSize: '0.8rem', color: '#64748B' }}>Please wait, this may take a minute...</p>
                                            <button onClick={cancelUpload} style={{ marginTop: '1rem', color: '#64748B', fontSize: '0.8rem', textDecoration: 'underline' }}>Cancel</button>
                                        </>
                                    )}
                                    {submissionStatus === 'saving' && <><Loader2 className="animate-spin" size={48} color="#10B981" /><p style={{ marginTop: '1rem', fontWeight: 600 }}>Saving Entry...</p></>}
                                    {submissionStatus === 'success' && <><div style={{ background: '#10B981', borderRadius: '50%', padding: '1rem' }}><Check size={48} color="white" /></div><p style={{ marginTop: '1rem', fontWeight: 700, fontSize: '1.2rem', color: '#10B981' }}>Success!</p></>}
                                    {submissionStatus === 'error' && (
                                        <>
                                            <div style={{ background: '#EF4444', borderRadius: '50%', padding: '1rem' }}><X size={48} color="white" /></div>
                                            <p style={{ marginTop: '1rem', fontWeight: 700, color: '#EF4444' }}>Failed!</p>
                                            <div style={{ marginTop: '0.5rem', color: '#B91C1C', maxWidth: '80%', textAlign: 'center', fontSize: '0.8rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid #FECACA', padding: '0.5rem', background: '#FEF2F2', borderRadius: '4px' }}>
                                                {uploadError}
                                            </div>
                                            <button onClick={() => setSubmissionStatus(null)} style={{ marginTop: '1rem', border: '1px solid #E2E8F0', padding: '0.5rem 1rem', borderRadius: '8px' }}>Close</button>
                                        </>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}> {/* wrapper for sidebar+main */}
                                <div className="modal-sidebar" style={{ overflowY: 'auto' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem', color: '#0F172A' }}>New Entry</h2>
                                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '2rem' }}>
                                        {activeTab === 'write' ? (
                                            GIBBS_STAGES.map((stage, idx) => (
                                                <div
                                                    key={stage.id}
                                                    onClick={() => setCurrentStage(idx)}
                                                    className={`sidebar-step ${currentStage === idx ? 'active' : ''}`}
                                                >
                                                    <div className="step-dot"></div>
                                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: currentStage === idx ? '#0F766E' : '#64748B' }}>{stage.title}</h4>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ color: '#64748B' }}>
                                                <p style={{ marginBottom: '1rem' }}>Upload your reflection document.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="modal-main" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <button onClick={() => setIsWriting(false)} style={{ padding: '0.5rem', borderRadius: '50%', background: '#F1F5F9' }}><X size={20} /></button>
                                            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>New Entry</span>
                                        </div>
                                    </div>

                                    <div className="form-context-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: '140px' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', display: 'block', marginBottom: '0.5rem' }}>Phase</label>
                                            <select
                                                value={formData.phase} onChange={e => setFormData({ ...formData, phase: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: 'white' }}
                                            >
                                                <option>Phase I</option><option>Phase II</option><option>Phase III</option>
                                            </select>
                                        </div>
                                        <div style={{ flex: 1, minWidth: '140px' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', display: 'block', marginBottom: '0.5rem' }}>Family (Optional)</label>
                                            <select
                                                value={formData.familyId} onChange={e => setFormData({ ...formData, familyId: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: 'white' }}
                                            >
                                                <option value="">-- General --</option>
                                                {families.map(f => <option key={f.id} value={f.id}>{f.head_name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="tabs-header">
                                        <button
                                            className={`tab-btn ${activeTab === 'write' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('write')}
                                        >
                                            <BookOpen size={16} style={{ display: 'inline', marginRight: '5px' }} />
                                            Structured
                                        </button>
                                        <button
                                            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('upload')}
                                        >
                                            <Upload size={16} style={{ display: 'inline', marginRight: '5px' }} />
                                            Upload
                                        </button>
                                    </div>

                                    {uploadError && (
                                        <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', wordBreak: 'break-word' }}>
                                            <AlertCircle size={16} style={{ minWidth: '16px' }} /> <span style={{ marginLeft: '0.5rem' }}>{uploadError}</span>
                                        </div>
                                    )}

                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        {activeTab === 'write' && (
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={currentStage}
                                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                                >
                                                    <div className="mobile-stepper" style={{ marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 700, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        Step {currentStage + 1} of {GIBBS_STAGES.length}: {GIBBS_STAGES[currentStage].title}
                                                    </div>

                                                    <div style={{ marginBottom: '1rem' }}>
                                                        <h3 className="stage-prompt">{GIBBS_STAGES[currentStage].prompt}</h3>
                                                    </div>

                                                    <textarea
                                                        className="journal-input"
                                                        placeholder="Type your reflection here..."
                                                        value={formData.gibbs[GIBBS_STAGES[currentStage].id]}
                                                        onChange={e => setFormData(prev => ({ ...prev, gibbs: { ...prev.gibbs, [GIBBS_STAGES[currentStage].id]: e.target.value } }))}
                                                        autoFocus
                                                    />

                                                    <div className="modal-actions">
                                                        <button onClick={handleAICoach} disabled={isAnalyzing} className="ai-btn">
                                                            <Sparkles size={16} className={isAnalyzing ? "animate-spin" : ""} /> {isAnalyzing ? "..." : "AI Tip"}
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
                                                                    {submitting ? '...' : <><Save size={20} style={{ marginRight: '8px' }} /> Finish</>}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </AnimatePresence>
                                        )}

                                        {activeTab === 'upload' && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                                                <div className="upload-container" style={{ padding: '2rem', border: '2px dashed #E2E8F0', borderRadius: '1rem', textAlign: 'center', background: '#F8FAFC' }}>
                                                    <input
                                                        type="file"
                                                        onChange={handleFileSelect}
                                                        accept="image/*,application/pdf,.doc,.docx,.txt"
                                                        style={{ width: '100%' }}
                                                    />
                                                    <p style={{ marginTop: '1rem', color: '#94A3B8', fontSize: '0.875rem' }}>Supported: PDF, Doc, Image (Max 10MB)</p>
                                                </div>

                                                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <button onClick={runDiagnostics} className="btn-text" style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <RefreshCw size={12} /> Check Connection Status
                                                    </button>
                                                    {sysStatus && <span style={{ fontSize: '0.75rem', color: sysStatus.includes('Error') ? '#EF4444' : '#10B981', fontWeight: 600 }}>{sysStatus}</span>}
                                                </div>

                                                {selectedFile && (
                                                    <div className="file-preview" style={{ marginTop: '1.5rem' }}>
                                                        <FileText size={20} style={{ color: '#475569' }} />
                                                        <div className="file-info">{selectedFile.name}</div>
                                                        <button onClick={() => setSelectedFile(null)} className="remove-file">Remove</button>
                                                    </div>
                                                )}

                                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', paddingTop: '2rem' }}>
                                                    <button
                                                        onClick={handleSubmit} disabled={submitting}
                                                        className="nav-btn primary"
                                                        style={{ background: 'linear-gradient(to right, #2563EB, #4F46E5)' }}
                                                    >
                                                        {submitting ? '...' : <><Save size={20} style={{ marginRight: '8px' }} /> Submit File</>}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- READ ENTRY MODAL --- */}
            <AnimatePresence>
                {viewingEntry && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="modal-overlay"
                        onClick={() => setViewingEntry(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="modal-content view-mode"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontSize: '0.875rem', color: '#64748B' }}>{new Date(viewingEntry.created_at).toLocaleDateString()}</span>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Reflection Details</h2>
                                </div>
                                <button onClick={() => setViewingEntry(null)}><X size={20} /></button>
                            </div>

                            <div className="view-modal-body">
                                {viewingEntry.reflection_type === 'file' ? (
                                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                                        <p style={{ marginBottom: '1rem' }}>This reflection was submitted as a file.</p>
                                        <a href={viewingEntry.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                                            Download {viewingEntry.file_name} <Download size={16} />
                                        </a>
                                    </div>
                                ) : (
                                    <div>
                                        {GIBBS_STAGES.map(stage => {
                                            const content = viewingEntry[`gibbs_${stage.id.replace('actionPlan', 'action_plan')}`];
                                            if (!content) return null;
                                            return (
                                                <div key={stage.id} className="view-section">
                                                    <div className="view-label">{stage.title}</div>
                                                    <p className="view-text">{content}</p>
                                                </div>
                                            );
                                        })}
                                        {!viewingEntry.gibbs_description && viewingEntry.content && (
                                            <div className="view-section">
                                                <div className="view-label">Content</div>
                                                <p className="view-text">{viewingEntry.content}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {viewingEntry.status === 'Graded' && (
                                    <div className="view-feedback" style={{ marginTop: '2rem', padding: '1.5rem', background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div>
                                                <h4 style={{ fontWeight: 800, color: '#9A3412', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Sparkles size={18} /> Mentor Assessment
                                                </h4>
                                                <p style={{ fontSize: '0.85rem', color: '#C2410C' }}>Graded on {new Date(viewingEntry.graded_at || Date.now()).toLocaleDateString()}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ display: 'block', fontSize: '2rem', fontWeight: 800, color: '#EA580C', lineHeight: 1 }}>{viewingEntry.grade}</span>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#C2410C' }}>{viewingEntry.total_score || 0} / 100</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                            {[
                                                { label: 'Exploration', val: viewingEntry.score_exploration },
                                                { label: 'Voice', val: viewingEntry.score_voice },
                                                { label: 'Description', val: viewingEntry.score_description },
                                                { label: 'Emotions', val: viewingEntry.score_emotions },
                                                { label: 'Analysis', val: viewingEntry.score_analysis }
                                            ].map((s, i) => (
                                                <div key={i} style={{ background: 'white', padding: '0.5rem', borderRadius: '6px', border: '1px solid #FED7AA', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#9A3412', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                                                    <div style={{ fontWeight: 700, color: '#EA580C' }}>{s.val || 0}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div>
                                            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#9A3412', marginBottom: '0.5rem' }}>Mentor Notes</h5>
                                            <p style={{ color: '#7C2D12', fontSize: '0.95rem', lineHeight: 1.6, background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: '8px' }}>
                                                {viewingEntry.teacher_feedback || "No written feedback provided."}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Reflections;
