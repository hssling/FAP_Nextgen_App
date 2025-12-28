import React, { useState, useEffect, useRef } from 'react';
import {
    BookOpen, Save, Sparkles, X, MessageCircle,
    Upload, FileText, CheckCircle, ChevronRight, ChevronLeft,
    Paperclip, Download, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// Gibbs Cycle Stages Configuration
const GIBBS_STAGES = [
    { id: 'description', title: 'Description', prompt: 'What happened? Describe the event objectively.', badge: 'bg-blue-100 text-blue-800' },
    { id: 'feelings', title: 'Feelings', prompt: 'What were you thinking and feeling during the experience?', badge: 'bg-purple-100 text-purple-800' },
    { id: 'evaluation', title: 'Evaluation', prompt: 'What was good and bad about the experience?', badge: 'bg-orange-100 text-orange-800' },
    { id: 'analysis', title: 'Analysis', prompt: 'Why did it happen? What sense can you make of the situation?', badge: 'bg-green-100 text-green-800' },
    { id: 'conclusion', title: 'Conclusion', prompt: 'What else could you have done? What did you learn?', badge: 'bg-yellow-100 text-yellow-800' },
    { id: 'actionPlan', title: 'Action Plan', prompt: 'If it arose again, what would you do differently?', badge: 'bg-red-100 text-red-800' }
];

const Reflections = () => {
    const { profile } = useAuth();
    const [families, setFamilies] = useState([]);
    const [reflections, setReflections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [activeTab, setActiveTab] = useState('write'); // 'write' or 'upload'
    const [currentStage, setCurrentStage] = useState(0); // For Gibbs stepper
    const [formData, setFormData] = useState({
        familyId: '',
        phase: 'Phase I',
        gibbs: {
            description: '',
            feelings: '',
            evaluation: '',
            analysis: '',
            conclusion: '',
            actionPlan: ''
        }
    });

    // File Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    // AI & Feedback State
    const [aiFeedback, setAiFeedback] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (profile) loadData();
    }, [profile]);

    const loadData = async () => {
        try {
            setLoading(true);
            const { data: fams } = await supabase
                .from('families')
                .select('id, head_name')
                .eq('student_id', profile.id);
            setFamilies(fams || []);

            const { data: refs, error } = await supabase
                .from('reflections')
                .select('*, families(head_name)')
                .eq('student_id', profile.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReflections(refs || []);
        } catch (error) {
            console.error("Load error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGibbsChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            gibbs: { ...prev.gibbs, [field]: value }
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) {
                alert("File size must be less than 10MB");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleAICoach = () => {
        const textToAnalyze = Object.values(formData.gibbs).join(' ');
        if (textToAnalyze.length < 50) {
            setAiFeedback("Please write a bit more before asking for feedback.");
            return;
        }

        setIsAnalyzing(true);
        setTimeout(() => {
            const tips = [];
            if (formData.gibbs.feelings.length < 50) tips.push("Try to explore your emotions deeper in the Feelings section.");
            if (formData.gibbs.analysis.length < 100) tips.push("The Analysis section is key. Connect to a theory or concept you've learned.");
            if (!formData.gibbs.actionPlan.includes('will')) tips.push("Make your Action Plan specific using 'I will...' statements.");

            setAiFeedback(tips.length > 0 ? "Coach Tips: " + tips.join(" ") : "Great reflection! You've covered the cycle well.");
            setIsAnalyzing(false);
        }, 1500);
    };

    const uploadFile = async () => {
        if (!selectedFile) return null;

        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
            .from('reflection-files')
            .upload(fileName, selectedFile);

        if (error) throw error;

        const { data } = supabase.storage.from('reflection-files').getPublicUrl(fileName);
        return {
            url: data.publicUrl,
            name: selectedFile.name,
            size: selectedFile.size,
            type: fileExt
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            let fileData = null;
            if (activeTab === 'upload' && selectedFile) {
                fileData = await uploadFile();
            }

            // Create concatenated content for legacy support
            const legacyContent = Object.entries(formData.gibbs)
                .map(([key, val]) => `[${key.toUpperCase()}]: ${val}`)
                .join('\n\n');

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
                ai_feedback: aiFeedback,
                status: 'Pending'
            };

            const { error } = await supabase.from('reflections').insert([payload]);

            if (error) throw error;

            // Reset Form
            setFormData({
                familyId: '',
                phase: 'Phase I',
                gibbs: { description: '', feelings: '', evaluation: '', analysis: '', conclusion: '', actionPlan: '' }
            });
            setSelectedFile(null);
            setAiFeedback(null);
            setCurrentStage(0);
            loadData();

        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save reflection. Please check your connection.");
        } finally {
            setSubmitting(false);
        }
    };

    // Helper Component for Score Ring
    const CircularScore = ({ score, grade }) => {
        const radius = 18;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - ((score || 0) / 10) * circumference;

        const getColor = (s) => {
            if (s >= 9) return 'text-emerald-500 stroke-emerald-500';
            if (s >= 7) return 'text-blue-500 stroke-blue-500';
            if (s >= 5) return 'text-amber-500 stroke-amber-500';
            return 'text-red-500 stroke-red-500';
        };

        const colorClass = getColor(score);

        return (
            <div className="flex flex-col items-center">
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-100" />
                        <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={colorClass} />
                    </svg>
                    <span className={`absolute text-xs font-bold ${colorClass.split(' ')[0]}`}>{grade}</span>
                </div>
                <span className="text-[10px] font-medium text-slate-400">{score}/10 points</span>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            {/* Page Background Accent */}
            <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-transparent -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4"
                >
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Reflective Journal</h1>
                        <p className="text-lg text-slate-500 mt-2 font-light">Capture your insights, track your growth with the Gibbs Cycle.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-bold text-blue-600">You</div>
                            <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs font-bold text-indigo-600"><Sparkles size={14} /></div>
                        </div>
                        <span className="text-sm font-medium text-slate-600">
                            {reflections.length} {reflections.length === 1 ? 'Entry' : 'Entries'}
                        </span>
                    </div>
                </motion.header>

                <div className="grid lg:grid-cols-12 gap-8 items-start">

                    {/* LEFT COLUMN: Input Area (Sticky) */}
                    <motion.div
                        className="lg:col-span-12 xl:col-span-7"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 sticky top-6 overflow-hidden z-20">
                            {/* Mode Tabs */}
                            <div className="flex border-b border-slate-100">
                                <button
                                    onClick={() => setActiveTab('write')}
                                    className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'write' ? 'text-blue-600 bg-blue-50/30 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <BookOpen size={18} /> Structured Reflection
                                </button>
                                <button
                                    onClick={() => setActiveTab('upload')}
                                    className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'upload' ? 'text-indigo-600 bg-indigo-50/30 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Upload size={18} /> Upload Document
                                </button>
                            </div>

                            {/* Phase & Family Context */}
                            <div className="p-6 bg-slate-50/50 border-b border-slate-100 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 pl-1">Current Phase</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-white pl-3 pr-8 py-2.5 rounded-xl border-slate-200 border text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm appearance-none"
                                            value={formData.phase}
                                            onChange={e => setFormData({ ...formData, phase: e.target.value })}
                                        >
                                            <option>Phase I</option>
                                            <option>Phase II</option>
                                            <option>Phase III</option>
                                        </select>
                                        <ChevronRight className="absolute right-3 top-3 text-slate-400 rotate-90" size={14} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 pl-1">Linked Family</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-white pl-3 pr-8 py-2.5 rounded-xl border-slate-200 border text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm appearance-none"
                                            value={formData.familyId}
                                            onChange={e => setFormData({ ...formData, familyId: e.target.value })}
                                        >
                                            <option value="">-- General Reflection --</option>
                                            {families.map(f => <option key={f.id} value={f.id}>{f.head_name}</option>)}
                                        </select>
                                        <ChevronRight className="absolute right-3 top-3 text-slate-400 rotate-90" size={14} />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 md:p-8">
                                {activeTab === 'write' ? (
                                    <>
                                        {/* Premium Stepper */}
                                        <div className="mb-8">
                                            <div className="flex justify-between items-center relative px-2">
                                                {/* Connecting Line behind */}
                                                <div className="absolute left-0 w-full h-0.5 bg-slate-100 top-4 -z-10 rounded-full"></div>

                                                {GIBBS_STAGES.map((stage, idx) => (
                                                    <div key={stage.id} className="flex flex-col items-center group cursor-pointer" onClick={() => setCurrentStage(idx)}>
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ring-4 ${idx === currentStage ? 'bg-blue-600 text-white shadow-lg ring-blue-50 scale-110' :
                                                                idx < currentStage ? 'bg-emerald-500 text-white ring-white' : 'bg-white text-slate-300 ring-white border-2 border-slate-100'
                                                            }`}>
                                                            {idx < currentStage ? <CheckCircle size={14} /> : idx + 1}
                                                        </div>
                                                        <span className={`text-[10px] font-bold mt-2 uppercase tracking-wide transition-colors ${idx === currentStage ? 'text-blue-600' : 'text-slate-300'}`}>
                                                            {stage.id.substring(0, 4)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={currentStage}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="min-h-[300px] flex flex-col"
                                            >
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm ${GIBBS_STAGES[currentStage].badge}`}>
                                                        {GIBBS_STAGES[currentStage].title}
                                                    </div>
                                                    <span className="text-xs text-slate-400 font-medium">Step {currentStage + 1} of 6</span>
                                                </div>

                                                <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight">
                                                    {GIBBS_STAGES[currentStage].prompt}
                                                </h3>

                                                <div className="relative flex-1 group">
                                                    <textarea
                                                        className="w-full h-full min-h-[200px] p-5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all resize-none text-slate-700 leading-relaxed text-base shadow-inner"
                                                        placeholder="Start typing your thoughts here..."
                                                        value={formData.gibbs[GIBBS_STAGES[currentStage].id]}
                                                        onChange={(e) => handleGibbsChange(GIBBS_STAGES[currentStage].id, e.target.value)}
                                                    />
                                                    <div className="absolute bottom-4 right-4 text-xs font-medium text-slate-300 pointer-events-none group-focus-within:text-blue-300">
                                                        {formData.gibbs[GIBBS_STAGES[currentStage].id].length} chars
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>

                                        {/* Action Bar */}
                                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={handleAICoach}
                                                disabled={isAnalyzing}
                                                className="hidden md:flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors"
                                            >
                                                <Sparkles size={16} className={isAnalyzing ? "animate-spin" : ""} />
                                                {isAnalyzing ? "Analyzing..." : "AI Coach Tips"}
                                            </button>

                                            <div className="flex gap-3 ml-auto">
                                                <button
                                                    onClick={() => setCurrentStage(p => Math.max(0, p - 1))}
                                                    disabled={currentStage === 0}
                                                    className="px-5 py-2.5 text-slate-500 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-30 flex items-center gap-2"
                                                >
                                                    <ChevronLeft size={18} /> Back
                                                </button>

                                                {currentStage < GIBBS_STAGES.length - 1 ? (
                                                    <button
                                                        onClick={() => setCurrentStage(p => Math.min(GIBBS_STAGES.length - 1, p + 1))}
                                                        className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                                    >
                                                        Next <ChevronRight size={18} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleSubmit}
                                                        disabled={submitting}
                                                        className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                                                    >
                                                        {submitting ? 'Saving...' : <><Save size={18} /> Finish Entry</>}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* AI Feedback Overlay */}
                                        <AnimatePresence>
                                            {aiFeedback && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl shadow-sm relative overflow-hidden"
                                                >
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/40 blur-2xl rounded-full -mr-10 -mt-10"></div>
                                                    <div className="flex gap-4 relative z-10">
                                                        <div className="w-10 h-10 rounded-full bg-white text-indigo-600 shadow-sm flex items-center justify-center shrink-0">
                                                            <Sparkles size={20} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-indigo-900 text-sm mb-1">Coach Insight</h4>
                                                            <p className="text-sm text-indigo-800 leading-relaxed">{aiFeedback.replace("Coach Tips: ", "")}</p>
                                                        </div>
                                                        <button onClick={() => setAiFeedback(null)} className="text-indigo-400 hover:text-indigo-700 h-6"><X size={18} /></button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                ) : (
                                    <div className="text-center py-16 px-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-200 transition-all group">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept=".pdf,.doc,.docx"
                                        />

                                        {selectedFile ? (
                                            <div className="max-w-xs mx-auto animate-in fade-in zoom-in duration-300">
                                                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                                    <FileText size={40} />
                                                </div>
                                                <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{selectedFile.name}</h3>
                                                <p className="text-sm text-slate-500 mb-6 font-medium bg-white inline-block px-3 py-1 rounded-full border border-slate-100">
                                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>

                                                <div className="flex gap-3 justify-center">
                                                    <button
                                                        onClick={() => setSelectedFile(null)}
                                                        className="px-5 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-semibold transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                    <button
                                                        onClick={handleSubmit}
                                                        disabled={submitting}
                                                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200 text-sm font-semibold transition-all hover:scale-105"
                                                    >
                                                        {submitting ? 'Uploading...' : 'Upload & Save'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                                                <div className="w-20 h-20 bg-white text-slate-300 border border-slate-200 shadow-sm rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:text-blue-500 group-hover:border-blue-200 transition-all duration-300">
                                                    <Upload size={32} />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-700 mb-2">Drop your reflection document</h3>
                                                <p className="text-sm text-slate-400 max-w-xs mx-auto">Supports PDF, DOCX (Max 10MB). Perfect for offline journals or handwritten scans.</p>
                                            </div>
                                        )}

                                        {!selectedFile && (
                                            <div className="mt-8 pt-8 border-t border-slate-200 text-left max-w-md mx-auto">
                                                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Optional Context</label>
                                                <textarea
                                                    className="w-full p-4 border border-slate-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-shadow placeholder:text-slate-300"
                                                    rows={2}
                                                    placeholder="Add a brief summary or title for this upload..."
                                                    value={formData.gibbs.description}
                                                    onChange={e => handleGibbsChange('description', e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* RIGHT COLUMN: Timeline View */}
                    <div className="lg:col-span-12 xl:col-span-5 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <BookOpen className="text-pink-500" size={24} />
                                Your Journey
                                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{reflections.length}</span>
                            </h2>
                        </div>

                        <div className="relative pl-4">
                            {/* Absolute Timeline Line */}
                            <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-slate-200 -z-10 hidden sm:block"></div>

                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="bg-white rounded-2xl p-6 h-40 animate-pulse border border-slate-100"></div>
                                    ))}
                                </div>
                            ) : reflections.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                                    <div className="relative w-32 h-32 mx-auto mb-6">
                                        <div className="absolute inset-0 bg-blue-50 rounded-full animate-ping opacity-20"></div>
                                        <div className="relative bg-white p-6 rounded-full border border-slate-100 shadow-sm">
                                            <BookOpen className="text-blue-200" size={48} />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">Your Journal is Empty</h3>
                                    <p className="text-slate-500 max-w-xs mx-auto">Start your first reflection to begin tracking your professional growth.</p>
                                </div>
                            ) : (
                                reflections.map((ref, idx) => (
                                    <motion.div
                                        key={ref.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="mb-8 relative group"
                                    >
                                        <div className="flex gap-4 sm:gap-6">
                                            {/* Date Block (Visual Anchor) */}
                                            <div className="hidden sm:flex flex-col items-center shrink-0 w-14">
                                                <div className="w-4 h-4 rounded-full bg-white border-4 border-blue-500 mb-2 z-10 shadow-sm group-hover:scale-125 transition-transform"></div>
                                                <div className="text-center">
                                                    <span className="block text-sm font-bold text-slate-900 leading-none">
                                                        {new Date(ref.created_at).getDate()}
                                                    </span>
                                                    <span className="block text-[10px] font-bold uppercase text-slate-400 mt-1">
                                                        {new Date(ref.created_at).toLocaleString('default', { month: 'short' })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Card */}
                                            <div className="flex-1 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                                                {/* Left Accent Bar */}
                                                <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${ref.status === 'Graded' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>

                                                <div className="flex justify-between items-start mb-3 pl-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase px-2 py-1 rounded-md tracking-wider">{ref.phase}</span>
                                                        {ref.reflection_type === 'file' && <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase px-2 py-1 rounded-md tracking-wider flex items-center gap-1"><Paperclip size={10} /> File Upload</span>}
                                                    </div>

                                                    {/* Mobile Date */}
                                                    <span className="sm:hidden text-xs font-bold text-slate-400">
                                                        {new Date(ref.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <h4 className="font-bold text-slate-800 text-lg mb-2 pl-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                    {ref.gibbs_description ?
                                                        ref.gibbs_description
                                                        : (ref.file_name || "Reflection Entry")
                                                    }
                                                </h4>

                                                {ref.gibbs_analysis && (
                                                    <div className="pl-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Analysis Snippet</p>
                                                        <p className="text-sm text-slate-600 line-clamp-2 italic">"{ref.gibbs_analysis}"</p>
                                                    </div>
                                                )}

                                                <div className="flex items-end justify-between pl-2 mt-4 pt-4 border-t border-slate-50">
                                                    {/* Status / Feedback */}
                                                    <div>
                                                        {ref.status === 'Pending' ? (
                                                            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-full">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Pending Review
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center gap-3">
                                                                <CircularScore score={ref.total_score} grade={ref.grade} />
                                                                {ref.teacher_feedback && (
                                                                    <div className="text-xs text-slate-500 max-w-[150px] line-clamp-2">
                                                                        <span className="font-bold text-slate-700 block">Mentor Feedback:</span>
                                                                        "{ref.teacher_feedback}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    {ref.file_url ? (
                                                        <a href={ref.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors">
                                                            <Download size={18} />
                                                        </a>
                                                    ) : (
                                                        <button className="text-slate-300 hover:text-blue-500 transition-colors">
                                                            <ChevronRight size={20} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                /* Hide scrollbar for textarea but keep functionality */
                textarea::-webkit-scrollbar {
                    width: 6px;
                }
                textarea::-webkit-scrollbar-track {
                    background: transparent;
                }
                textarea::-webkit-scrollbar-thumb {
                    background-color: #e2e8f0;
                    border-radius: 20px;
                }
            `}</style>
        </div>
    );
};

export default Reflections;
